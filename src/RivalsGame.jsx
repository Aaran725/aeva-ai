import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { useXPStore } from './xpStore'

/* ─── Sector data ────────────────────────────────────────────────────────── */
const SECTORS = {
  ai: {
    name: 'AI Tech', emoji: '🤖', color: '#6366F1', glow: 'rgba(99,102,241,0.22)',
    marketBase: 800_000, growthPct: 0.13,
    flavor: 'Fast-growing. Tech-savvy consumers. R&D is king.',
    competitors: [
      { id: 'deeplogic', name: 'DeepLogic',     emoji: '🧠', color: '#60A5FA', strategy: 'rd' },
      { id: 'hypeai',    name: 'HypeAI',        emoji: '📣', color: '#F87171', strategy: 'mkt' },
      { id: 'nexus',     name: 'Nexus Systems', emoji: '⚡', color: '#34D399', strategy: 'balanced' },
    ],
  },
  clothing: {
    name: 'Fashion', emoji: '👗', color: '#F472B6', glow: 'rgba(244,114,182,0.18)',
    marketBase: 650_000, growthPct: 0.09,
    flavor: 'Brand-driven market. Loyalty cycles fast. Marketing dominates.',
    competitors: [
      { id: 'luxthread', name: 'LuxThread',  emoji: '✨', color: '#F59E0B', strategy: 'rd' },
      { id: 'viralwear', name: 'ViralWear',  emoji: '🔥', color: '#EC4899', strategy: 'mkt' },
      { id: 'trendmass', name: 'TrendMass',  emoji: '🛍️', color: '#A78BFA', strategy: 'balanced' },
    ],
  },
}

/* ─── AI strategies (fraction of budget) ────────────────────────────────── */
const STRATS = {
  rd:       { rd: 0.60, mkt: 0.18, sales: 0.22 },
  mkt:      { rd: 0.14, mkt: 0.63, sales: 0.23 },
  balanced: { rd: 0.34, mkt: 0.33, sales: 0.33 },
}

/* ─── Pricing options ────────────────────────────────────────────────────── */
const PRICES = [
  { id: 'budget',   label: 'Budget',   emoji: '💲', revMult: 0.75, shareAdj: +0.12 },
  { id: 'standard', label: 'Standard', emoji: '💵', revMult: 1.00, shareAdj: 0 },
  { id: 'premium',  label: 'Premium',  emoji: '💎', revMult: 1.35, shareAdj: -0.10 },
]

/* ─── Random events ──────────────────────────────────────────────────────── */
const EVENTS = [
  { id: 'surge',   emoji: '📈', title: 'Industry Surge',    desc: 'Market demand spikes this turn. +40% market size.', effect: 'market',   val: 0.40 },
  { id: 'viral',   emoji: '🚀', title: 'You Went Viral',    desc: 'Your brand catches fire. +20 brand score.',          effect: 'pBrand',   val: 20 },
  { id: 'dip',     emoji: '📉', title: 'Market Correction', desc: 'Consumer spending slows. −25% market size.',         effect: 'market',   val: -0.25 },
  { id: 'vc',      emoji: '💰', title: 'VC Surprise',       desc: 'Unplanned investment hits your account.',            effect: 'budget',   val: 50_000 },
  { id: 'scandal', emoji: '💥', title: 'Rival Scandal',     desc: "A competitor's brand takes a serious hit.",          effect: 'rBrand',   val: -28 },
  { id: 'bug',     emoji: '🐛', title: 'Competitor Recall', desc: "A rival's product fails in public.",                 effect: 'rQuality', val: -22 },
]

/* ─── Constants ──────────────────────────────────────────────────────────── */
const STEP        = 5_000
const BASE_BUDGET = 100_000
const INIT_STATS  = { quality: 38, brand: 30, sp: 28, revenue: 0, lastRev: 0 }

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'k'
  return '$' + Math.round(n)
}
function clamp(v, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)) }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo) }
function rankEmoji(i) { return ['🥇', '🥈', '🥉', '4️⃣'][i] ?? `${i + 1}.` }

/* ═══ MAIN COMPONENT ════════════════════════════════════════════════════════ */
export default function RivalsGame({ onClose }) {
  const addXP = useXPStore(s => s.addXP)

  const [screen,      setScreen]     = useState('setup')   // setup | game | final
  const [sector,      setSector]     = useState(null)
  const [totalTurns,  setTotalTurns] = useState(10)
  const [turn,        setTurn]       = useState(1)
  const [market,      setMarket]     = useState(0)
  const [companies,   setCompanies]  = useState([])
  const [alloc,       setAlloc]      = useState({ rd: 40_000, mkt: 35_000, sales: 25_000 })
  const [price,       setPrice]      = useState('standard')
  const [budget,      setBudget]     = useState(BASE_BUDGET)
  const [bonusBudget, setBonus]      = useState(0)
  const [phase,       setPhase]      = useState('allocate') // allocate | results
  const [results,     setResults]    = useState(null)

  const sec         = sector ? SECTORS[sector] : null
  const priceOpt    = PRICES.find(p => p.id === price)
  const totalBudget = budget + bonusBudget
  const allocTotal  = alloc.rd + alloc.mkt + alloc.sales
  const remaining   = totalBudget - allocTotal
  const player      = companies.find(c => c.isPlayer)

  /* ── Start game ──────────────────────────────────────────────────────── */
  function startGame() {
    const s = SECTORS[sector]
    const cos = [
      {
        id: 'player', name: 'Your Company', emoji: '🏢',
        color: '#6366F1', isPlayer: true, strategy: null,
        ...INIT_STATS,
      },
      ...s.competitors.map(c => ({
        ...c, isPlayer: false,
        quality: clamp(INIT_STATS.quality + Math.round(rnd(-6, 6))),
        brand:   clamp(INIT_STATS.brand   + Math.round(rnd(-5, 5))),
        sp:      clamp(INIT_STATS.sp      + Math.round(rnd(-5, 5))),
        revenue: 0, lastRev: 0,
      })),
    ]
    setCompanies(cos)
    setMarket(s.marketBase)
    setBudget(BASE_BUDGET)
    setBonus(0)
    setAlloc({ rd: 40_000, mkt: 35_000, sales: 25_000 })
    setPrice('standard')
    setTurn(1)
    setResults(null)
    setPhase('allocate')
    setScreen('game')
  }

  /* ── Adjust allocation ───────────────────────────────────────────────── */
  function adj(key, delta) {
    setAlloc(prev => {
      const next = prev[key] + delta
      if (next < 0) return prev
      if (prev.rd + prev.mkt + prev.sales - prev[key] + next > totalBudget) return prev
      return { ...prev, [key]: next }
    })
  }

  function autoFill() {
    if (remaining <= 0) return
    setAlloc(prev => ({ ...prev, sales: prev.sales + remaining }))
  }

  /* ── Simulate turn ───────────────────────────────────────────────────── */
  function simulate() {
    const s = SECTORS[sector]
    let effMarket      = market
    let nextBonus      = 0
    let ev             = null

    // Random event (28% chance)
    if (Math.random() < 0.28) {
      ev = EVENTS[Math.floor(Math.random() * EVENTS.length)]
      if (ev.effect === 'market') effMarket = Math.round(effMarket * (1 + ev.val))
      if (ev.effect === 'budget') nextBonus = ev.val
    }

    // Update stats for each company
    let updated = companies.map(co => {
      let { quality, brand, sp, revenue, lastRev } = co
      let rdS, mktS, salesS, revMult

      if (co.isPlayer) {
        rdS = alloc.rd; mktS = alloc.mkt; salesS = alloc.sales
        revMult = priceOpt.revMult
        if (ev?.effect === 'pBrand') brand = clamp(brand + ev.val)
      } else {
        const strat    = STRATS[co.strategy]
        const v        = () => rnd(-0.06, 0.06)
        const r        = clamp(strat.rd  + v(), 0.08, 0.78)
        const m        = clamp(strat.mkt + v(), 0.08, 0.78)
        const sl       = Math.max(0.08, 1 - r - m)
        const aiBudget = BASE_BUDGET + lastRev * 0.06
        rdS    = aiBudget * r
        mktS   = aiBudget * m
        salesS = aiBudget * sl
        revMult = co.strategy === 'rd' ? 1.15 : co.strategy === 'mkt' ? 0.85 : 1.00
      }

      const tb = co.isPlayer ? totalBudget : (BASE_BUDGET + lastRev * 0.06)

      quality = clamp(quality + (rdS   / tb) * 20 + rnd(0, 1))
      brand   = clamp(brand   + (mktS  / tb) * 16 + rnd(0, 1))
      sp      = clamp((salesS / tb) * 100 + rnd(0, 4))   // resets each turn

      return { ...co, quality, brand, sp, revenue, lastRev, _revMult: revMult }
    })

    // Apply rival events to one random non-player company
    if (ev?.effect === 'rBrand' || ev?.effect === 'rQuality') {
      const rivals = updated.filter(c => !c.isPlayer)
      const tgt    = rivals[Math.floor(Math.random() * rivals.length)]
      const idx    = updated.findIndex(c => c.id === tgt.id)
      if (ev.effect === 'rBrand')   updated[idx].brand   = clamp(updated[idx].brand   + ev.val)
      if (ev.effect === 'rQuality') updated[idx].quality = clamp(updated[idx].quality + ev.val)
    }

    // Market share: attractiveness score per company
    const scores = updated.map((co, i) => {
      let score = 0.40 * co.quality + 0.30 * co.brand + 0.30 * co.sp
      if (co.isPlayer) score *= (1 + priceOpt.shareAdj)
      return Math.max(0.5, score)
    })
    const totalScore = scores.reduce((a, b) => a + b, 0)

    updated = updated.map((co, i) => {
      const share    = scores[i] / totalScore
      const thisRev  = Math.round(effMarket * share * co._revMult)
      return { ...co, thisRev, share: Math.round(share * 100), revenue: co.revenue + thisRev, lastRev: thisRev }
    })

    const leaderboard = [...updated].sort((a, b) => b.revenue - a.revenue)
    const playerRank  = leaderboard.findIndex(c => c.isPlayer) + 1
    const playerThis  = updated.find(c => c.isPlayer)

    const nextBudget  = BASE_BUDGET + Math.round((playerThis.thisRev || 0) * 0.15)
    const nextMarket  = Math.round(market * (1 + s.growthPct))

    setCompanies(updated)
    setMarket(nextMarket)
    setBudget(nextBudget)
    setBonus(nextBonus)
    setResults({ leaderboard, playerRank, event: ev, nextBonus })

    // Reset allocation proportionally for next turn
    const nb = nextBudget + nextBonus
    setAlloc({ rd: Math.round(nb * 0.40), mkt: Math.round(nb * 0.35), sales: Math.round(nb * 0.25) })
    setPhase('results')
  }

  /* ── Next turn ───────────────────────────────────────────────────────── */
  function nextTurn() {
    if (turn >= totalTurns) {
      addXP('DRILL_COMPLETE')
      setScreen('final')
      return
    }
    setTurn(t => t + 1)
    setPhase('allocate')
    setResults(null)
  }

  /* ── Restart ─────────────────────────────────────────────────────────── */
  function restart() { setSector(null); setScreen('setup') }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: '#05070F',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Background glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: sec
          ? `radial-gradient(ellipse 80% 50% at 50% 0%, ${sec.glow} 0%, transparent 60%)`
          : 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)',
      }} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
              The Rivals
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>
              {screen === 'game'
                ? `Turn ${turn} of ${totalTurns} · ${sec?.name}`
                : 'Turn-based market strategy'}
            </div>
          </div>
        </div>

        {screen === 'game' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: totalTurns }).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i < turn - 1 ? '#6366F1' : i === turn - 1 ? '#A78BFA' : 'rgba(255,255,255,0.12)',
                boxShadow: i === turn - 1 ? '0 0 5px rgba(167,139,250,0.70)' : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => {
            if (screen === 'game') {
              if (window.confirm('Exit game? Progress will be lost.')) restart()
            } else {
              onClose()
            }
          }}
          style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 2, maxWidth: 680, width: '100%', margin: '0 auto', padding: '0 0 40px' }}>
        <AnimatePresence mode="wait">

          {/* ══════════════ SETUP SCREEN ══════════════ */}
          {screen === 'setup' && (
            <motion.div key="setup"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 26 }}
            >
              {/* Sector */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Choose your sector
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {Object.entries(SECTORS).map(([id, s]) => (
                    <motion.button key={id}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setSector(id)}
                      style={{
                        padding: '20px 18px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                        background: sector === id ? `${s.color}18` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${sector === id ? s.color + '55' : 'rgba(255,255,255,0.09)'}`,
                        boxShadow: sector === id ? `0 0 22px ${s.glow}` : 'none',
                        transition: 'all 0.2s', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 10 }}>{s.emoji}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 5 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', lineHeight: 1.45 }}>{s.flavor}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 8 }}>
                        Base market: {fmt(s.marketBase)} · +{Math.round(s.growthPct * 100)}%/turn
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Game length */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Game length
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { t: 5,  label: 'Quick',    sub: '~5 min' },
                    { t: 10, label: 'Standard', sub: '~10 min' },
                    { t: 15, label: 'Marathon', sub: '~15 min' },
                  ].map(opt => (
                    <motion.button key={opt.t}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setTotalTurns(opt.t)}
                      style={{
                        flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        background: totalTurns === opt.t ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${totalTurns === opt.t ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.09)'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{opt.t}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.60)', marginTop: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{opt.sub}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Competitor preview */}
              {sec && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Your competitors
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sec.competitors.map(c => (
                      <div key={c.id} style={{
                        padding: '12px 14px', borderRadius: 11,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <span style={{ fontSize: 20 }}>{c.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {c.strategy === 'rd'
                              ? 'Pours money into R&D. Premium pricing. Weak marketing.'
                              : c.strategy === 'mkt'
                              ? 'All-in on ads. Budget pricing. Low product quality.'
                              : 'Balanced across all three areas.'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.07em',
                          color:       c.strategy === 'rd' ? '#60A5FA' : c.strategy === 'mkt' ? '#F87171' : '#34D399',
                          background:  c.strategy === 'rd' ? 'rgba(96,165,250,0.12)' : c.strategy === 'mkt' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
                          border:      c.strategy === 'rd' ? '1px solid rgba(96,165,250,0.25)' : c.strategy === 'mkt' ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(52,211,153,0.25)',
                          borderRadius: 99, padding: '3px 8px', whiteSpace: 'nowrap',
                        }}>
                          {c.strategy === 'rd' ? 'R&D HEAVY' : c.strategy === 'mkt' ? 'AD HEAVY' : 'BALANCED'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start button */}
              <motion.button
                whileHover={sector ? { scale: 1.02 } : {}}
                whileTap={sector ? { scale: 0.97 } : {}}
                onClick={sector ? startGame : undefined}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14,
                  background: sector ? 'linear-gradient(135deg, #6366F1, #8B8FFF)' : 'rgba(255,255,255,0.07)',
                  border: 'none', color: sector ? '#fff' : 'rgba(255,255,255,0.25)',
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 800,
                  cursor: sector ? 'pointer' : 'not-allowed',
                  boxShadow: sector ? '0 4px 24px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {sector ? `Launch ${sec.name} Company →` : 'Select a sector to begin'}
              </motion.button>
            </motion.div>
          )}

          {/* ══════════════ GAME — ALLOCATE ══════════════ */}
          {screen === 'game' && phase === 'allocate' && (
            <motion.div key="allocate"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              {/* Budget header */}
              <div style={{
                padding: '16px 18px', borderRadius: 14,
                background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Budget this turn
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginTop: 2 }}>
                    {fmt(totalBudget)}
                    {bonusBudget > 0 && (
                      <span style={{ fontSize: 12, color: '#4ADE80', marginLeft: 8 }}>+{fmt(bonusBudget)} bonus</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'rgba(255,255,255,0.40)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Market</div>
                    <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>{fmt(market)}</div>
                  </div>
                  {player && player.revenue > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your total rev</div>
                      <div style={{ fontWeight: 700, color: '#4ADE80' }}>{fmt(player.revenue)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Allocation rows */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Allocate budget
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {[
                    { key: 'rd',    label: 'R&D',       emoji: '🔬', color: '#60A5FA', desc: 'Builds product quality (cumulative)' },
                    { key: 'mkt',   label: 'Marketing',  emoji: '📢', color: '#F472B6', desc: 'Builds brand score (cumulative)' },
                    { key: 'sales', label: 'Sales',      emoji: '💼', color: '#34D399', desc: 'Converts to revenue (this turn only)' },
                  ].map(row => {
                    const pct = totalBudget > 0 ? alloc[row.key] / totalBudget : 0
                    return (
                      <div key={row.key} style={{
                        padding: '14px 16px', borderRadius: 13,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 17 }}>{row.emoji}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.label}</div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{row.desc}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <motion.button whileTap={{ scale: 0.88 }} onClick={() => adj(row.key, -STEP)}
                              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                              −
                            </motion.button>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 50, textAlign: 'center' }}>
                              {fmt(alloc[row.key])}
                            </span>
                            <motion.button whileTap={{ scale: 0.88 }} onClick={() => adj(row.key, +STEP)}
                              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                              +
                            </motion.button>
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                          <motion.div
                            animate={{ width: `${Math.min(100, pct * 100)}%` }}
                            transition={{ duration: 0.2 }}
                            style={{ height: '100%', background: row.color, borderRadius: 2 }}
                          />
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>
                          {Math.round(pct * 100)}% of budget
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Remaining / auto-fill */}
              {remaining > 0 && (
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={autoFill}
                  style={{
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
                    color: '#F59E0B', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  ⚡ Auto-fill {fmt(remaining)} unallocated → Sales
                </motion.button>
              )}
              {remaining < 0 && (
                <div style={{ fontSize: 11.5, color: '#EF4444', fontWeight: 700, textAlign: 'center' }}>
                  ⚠ Over budget by {fmt(Math.abs(remaining))}
                </div>
              )}

              {/* Pricing */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Pricing strategy
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRICES.map(p => (
                    <motion.button key={p.id}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setPrice(p.id)}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                        background: price === p.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${price === p.id ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 17, marginBottom: 4 }}>{p.emoji}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{p.label}</div>
                      <div style={{ fontSize: 9.5, marginTop: 3, color: p.revMult > 1 ? '#4ADE80' : p.revMult < 1 ? '#F87171' : 'rgba(255,255,255,0.30)' }}>
                        {p.revMult > 1 ? `+${Math.round((p.revMult - 1) * 100)}% margin` : p.revMult < 1 ? `${Math.round((p.revMult - 1) * 100)}% margin` : 'Normal margin'}
                      </div>
                      <div style={{ fontSize: 9.5, color: p.shareAdj > 0 ? '#4ADE80' : p.shareAdj < 0 ? '#F87171' : 'rgba(255,255,255,0.25)' }}>
                        {p.shareAdj > 0 ? `+${Math.round(p.shareAdj * 100)}% share` : p.shareAdj < 0 ? `${Math.round(p.shareAdj * 100)}% share` : 'Normal share'}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Your stats */}
              {player && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Quality', v: Math.round(player.quality), color: '#60A5FA' },
                    { label: 'Brand',   v: Math.round(player.brand),   color: '#F472B6' },
                    { label: 'Last Rev',v: fmt(player.lastRev || 0),   color: '#4ADE80', str: true },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: s.str ? 13 : 18, fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={remaining === 0 ? simulate : undefined}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14, fontFamily: 'inherit',
                  background: remaining === 0
                    ? 'linear-gradient(135deg, #6366F1, #8B8FFF)'
                    : 'rgba(99,102,241,0.30)',
                  border: 'none', color: '#fff',
                  fontSize: 14, fontWeight: 800,
                  cursor: remaining === 0 ? 'pointer' : 'not-allowed',
                  boxShadow: remaining === 0 ? '0 4px 20px rgba(99,102,241,0.40)' : 'none',
                  opacity: remaining !== 0 ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {remaining > 0
                  ? `Allocate ${fmt(remaining)} to submit`
                  : remaining < 0
                  ? 'Over budget — reduce allocations'
                  : `→ End Turn ${turn}`}
              </motion.button>
            </motion.div>
          )}

          {/* ══════════════ GAME — RESULTS ══════════════ */}
          {screen === 'game' && phase === 'results' && results && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                Turn {turn} results
              </div>

              {/* Event banner */}
              {results.event && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.28)',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                    {results.event.emoji} {results.event.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5 }}>
                    {results.event.desc}
                  </div>
                  {results.nextBonus > 0 && (
                    <div style={{ fontSize: 12, color: '#4ADE80', fontWeight: 700, marginTop: 6 }}>
                      +{fmt(results.nextBonus)} added to next turn's budget
                    </div>
                  )}
                </motion.div>
              )}

              {/* Your summary */}
              {(() => {
                const p = results.leaderboard.find(c => c.isPlayer)
                return (
                  <div style={{
                    padding: '16px', borderRadius: 13,
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Your company
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Revenue this turn', v: fmt(p.thisRev || 0), color: '#4ADE80' },
                        { label: 'Market share',      v: `${p.share}%`,       color: '#A78BFA' },
                        { label: 'Current rank',      v: `${rankEmoji(results.playerRank - 1)} ${results.playerRank === 1 ? '1st' : results.playerRank === 2 ? '2nd' : results.playerRank === 3 ? '3rd' : `${results.playerRank}th`}`, color: results.playerRank === 1 ? '#F59E0B' : '#fff' },
                        { label: 'Total revenue',     v: fmt(p.revenue),     color: '#4ADE80' },
                      ].map(s => (
                        <div key={s.label} style={{ flex: '1 1 120px', textAlign: 'center' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.v}</div>
                          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.30)', marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Leaderboard */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Standings
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.leaderboard.map((co, i) => (
                    <motion.div
                      key={co.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        padding: '12px 14px', borderRadius: 11,
                        background: co.isPlayer ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                        border: co.isPlayer ? '1px solid rgba(99,102,241,0.30)' : '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 14, minWidth: 22, textAlign: 'center' }}>{rankEmoji(i)}</div>
                      <span style={{ fontSize: 18 }}>{co.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: co.isPlayer ? '#A78BFA' : 'rgba(255,255,255,0.75)' }}>
                          {co.name}{co.isPlayer ? ' (You)' : ''}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                          Q:{Math.round(co.quality)} · B:{Math.round(co.brand)} · {co.share}% share
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: i === 0 ? '#4ADE80' : 'rgba(255,255,255,0.65)' }}>
                          {fmt(co.revenue)}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                          +{fmt(co.thisRev || 0)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={nextTurn}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, fontFamily: 'inherit',
                  background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {turn >= totalTurns ? '→ See final results' : `→ Turn ${turn + 1} of ${totalTurns}`}
              </motion.button>
            </motion.div>
          )}

          {/* ══════════════ FINAL SCREEN ══════════════ */}
          {screen === 'final' && (
            <motion.div key="final"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center', textAlign: 'center' }}
            >
              {(() => {
                const sorted     = [...companies].sort((a, b) => b.revenue - a.revenue)
                const playerRank = sorted.findIndex(c => c.isPlayer) + 1
                const isWinner   = playerRank === 1
                const winner     = sorted[0]
                const playerCo   = sorted.find(c => c.isPlayer)

                return (
                  <>
                    <motion.div
                      animate={isWinner
                        ? { rotate: [0, -8, 8, -4, 4, 0] }
                        : { scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.7, delay: 0.3, repeat: isWinner ? 0 : Infinity }}
                      style={{ fontSize: 68 }}
                    >
                      {isWinner ? '🏆' : playerRank === 2 ? '🥈' : playerRank === 3 ? '🥉' : '📊'}
                    </motion.div>

                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8, color: isWinner ? '#4ADE80' : 'rgba(255,255,255,0.88)' }}>
                        {isWinner
                          ? 'You dominated the market.'
                          : playerRank === 2 ? 'So close. Second place.'
                          : playerRank === 3 ? 'Middle of the pack.'
                          : 'Tough game. Dead last.'}
                      </div>
                      <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 380 }}>
                        {isWinner
                          ? `${totalTurns} turns. ${sec?.name} sector. You out-earned every competitor.`
                          : `${winner.name} took first with ${fmt(winner.revenue)}. Review your allocation next time.`}
                      </div>
                    </div>

                    {/* Final standings */}
                    <div style={{ width: '100%', maxWidth: 480 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>
                        Final standings
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {sorted.map((co, i) => (
                          <div key={co.id} style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: co.isPlayer ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                            border: co.isPlayer ? '1px solid rgba(99,102,241,0.30)' : '1px solid rgba(255,255,255,0.07)',
                            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                          }}>
                            <div style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>{rankEmoji(i)}</div>
                            <span style={{ fontSize: 20 }}>{co.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: co.isPlayer ? '#A78BFA' : 'rgba(255,255,255,0.80)' }}>
                                {co.name}{co.isPlayer ? ' (You)' : ''}
                              </div>
                              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                                Q:{Math.round(co.quality)} · Brand:{Math.round(co.brand)}
                              </div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? '#4ADE80' : 'rgba(255,255,255,0.55)', letterSpacing: '-0.02em' }}>
                              {fmt(co.revenue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 380 }}>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={restart}
                        style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Play again
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={onClose}
                        style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Exit
                      </motion.button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
