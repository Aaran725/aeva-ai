import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Bell, Lock, TrendingUp, TrendingDown, RefreshCw, Star } from 'lucide-react'
import { useCallStreetStore, calcModeOverlay, calcPE } from './callStreetStore'
import { useCoinStore } from './coinStore'

/* ── Mini sparkline ──────────────────────────────────────────────── */
function Spark({ history, w = 72, h = 28 }) {
  if (!history || history.length < 2) return <div style={{ width: w, height: h }} />
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x},${y}`
  }).join(' ')
  const up = history[history.length - 1] >= history[0]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={up ? '#4ADE80' : '#F87171'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Area chart for detail view ──────────────────────────────────── */
function AreaChart({ history, w = 280, h = 80 }) {
  if (!history || history.length < 2) return null
  const min = Math.min(...history) * 0.96
  const max = Math.max(...history) * 1.04
  const range = max - min || 1
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return [x, y]
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const up = history[history.length - 1] >= history[0]
  const c = up ? '#4ADE80' : '#F87171'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%' }}>
      <defs>
        <linearGradient id="csg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#csg)" />
      <path d={line} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(n) { return Math.round(n).toLocaleString() }
function pctChange(history) {
  if (!history || history.length < 2) return 0
  const first = history[0]; const last = history[history.length - 1]
  return Math.round(((last - first) / first) * 100)
}

const MODES = [
  { id: 'buffett', label: '🏛️ Buffett', sub: 'Value' },
  { id: 'lynch',   label: '🔍 Lynch',   sub: 'Growth' },
  { id: 'soros',   label: '🌎 Soros',   sub: 'Macro' },
  { id: 'venture', label: '🚀 Venture', sub: 'VC' },
]

/* ── Season End overlay ──────────────────────────────────────────── */
function SeasonEnd({ grade, onClose, onCollect }) {
  const gradeColor = { 'A+': '#D4AF37', A: '#4ADE80', B: '#60A5FA', C: '#fb923c', D: '#F87171' }[grade.grade] || '#fff'
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(6,5,24,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Season Complete</div>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        style={{ fontSize: 96, fontWeight: 900, color: gradeColor, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.04em' }}>
        {grade.grade}
      </motion.div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', marginBottom: 4 }}>
        {grade.returnPct >= 0 ? '+' : ''}{grade.returnPct}% return
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
        Market index: {grade.indexReturn >= 0 ? '+' : ''}{grade.indexReturn}%
        {grade.beatMarket ? ' · You beat the market! 🎯' : ' · Market beat you'}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 280, marginBottom: 24 }}>
        {grade.note}
      </div>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCollect}
        style={{ width: '100%', maxWidth: 280, padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${gradeColor}33, ${gradeColor}22)`, border: `1px solid ${gradeColor}55`, color: gradeColor, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
        Collect ₳{fmt(grade.coins)} reward
      </motion.button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}>
        Skip
      </button>
    </motion.div>
  )
}

/* ── Company Detail ──────────────────────────────────────────────── */
function CompanyDetail({ company, holding, mode, onBack }) {
  const { buy, sell, buyResearch } = useCallStreetStore()
  const { coins } = useCoinStore()
  const [qty, setQty] = useState(1)
  const [action, setAction] = useState('buy')
  const [msg, setMsg] = useState(null)

  const change = pctChange(company.priceHistory)
  const up = change >= 0
  const overlay = calcModeOverlay(company, mode)
  const pnl = holding ? (company.price - holding.avgCost) * holding.shares : 0
  const cost = qty * company.price

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000) }

  async function handleTrade() {
    if (action === 'buy') {
      const res = buy(company.id, qty)
      if (res.error) flash(res.error, false)
      else flash(`Bought ${qty} shares of ${company.ticker}!`)
    } else {
      const res = sell(company.id, qty)
      if (res.error) flash(res.error, false)
      else flash(`Sold ${qty} shares — ₳${fmt(res.proceeds)} received`)
    }
  }

  function handleResearch() {
    const ok = buyResearch(company.id)
    if (!ok) flash('Not enough coins', false)
    else flash('Research report unlocked!')
  }

  return (
    <div style={{ padding: '0 16px 32px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <ChevronLeft size={14} /> Back
      </button>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, background: msg.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.ok ? '#4ADE80' : '#F87171' }}>
          {msg.text}
        </motion.div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 36 }}>{company.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{company.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{company.ticker} · {company.sector}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{company.desc}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.04em' }}>₳{fmt(company.price)}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: up ? '#4ADE80' : '#F87171' }}>
            {up ? '▲' : '▼'}{Math.abs(change)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 12px 8px', marginBottom: 12 }}>
        <AreaChart history={company.priceHistory} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>10 days</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>₳{fmt(company.priceHistory[0])} → ₳{fmt(company.price)}</span>
        </div>
      </div>

      {/* Mode overlay + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {overlay && (
          <div style={{ background: overlay.highlight ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${overlay.highlight ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{overlay.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: overlay.highlight ? '#4ADE80' : '#fff', marginTop: 1 }}>{overlay.value}</div>
            <div style={{ fontSize: 9, color: overlay.highlight ? '#4ADE80' : 'rgba(255,255,255,0.35)', marginTop: 2 }}>{overlay.note}</div>
          </div>
        )}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Mkt Cap</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1 }}>₳{fmt(company.price * 10)}M</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>10d High</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1 }}>₳{fmt(Math.max(...company.priceHistory))}</div>
        </div>
      </div>

      {/* My position */}
      {holding && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Your position</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>{holding.shares} shares @ avg ₳{holding.avgCost}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Unrealised P&L</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: pnl >= 0 ? '#4ADE80' : '#F87171' }}>{pnl >= 0 ? '+' : ''}₳{fmt(pnl)}</div>
          </div>
        </div>
      )}

      {/* Research report */}
      {!company.reportUnlocked ? (
        <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 5 }}><Lock size={11} /> Fundamentals locked</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Hold 5 days to unlock free · or pay ₳25 now</div>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleResearch}
            style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.1)', color: '#D4AF37', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ₳25 Report
          </motion.button>
        </div>
      ) : (
        <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Star size={11} /> Analyst Report — {company.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { l: 'Revenue Growth', v: `${Math.round(company._revGrowth * 100)}%`, good: company._revGrowth > 0.2 },
              { l: 'Profit Margin',  v: `${Math.round(company._profitMargin * 100)}%`, good: company._profitMargin > 0 },
              { l: 'Debt Level',     v: company._debtRatio < 0.2 ? 'Low' : company._debtRatio < 0.4 ? 'Medium' : 'High', good: company._debtRatio < 0.3 },
              { l: 'Founder Score',  v: company._founderScore > 0.8 ? 'Excellent' : company._founderScore > 0.65 ? 'Good' : 'Weak', good: company._founderScore > 0.7 },
              { l: 'R&D Investment', v: company._rdSpend > 0.7 ? 'Heavy' : company._rdSpend > 0.45 ? 'Moderate' : 'Light', good: company._rdSpend > 0.5 },
              { l: 'Overall',        v: company._founderScore > 0.75 && company._revGrowth > 0.2 ? 'BUY' : company._profitMargin < -0.1 ? 'CAUTION' : 'HOLD', good: company._founderScore > 0.75 },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '6px 8px' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.good ? '#4ADE80' : '#F87171', marginTop: 1 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade panel */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['buy', 'sell'].map(a => (
            <button key={a} onClick={() => setAction(a)}
              style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${action === a ? (a === 'sell' ? 'rgba(74,222,128,0.4)' : 'rgba(124,58,237,0.4)') : 'rgba(255,255,255,0.08)'}`, background: action === a ? (a === 'sell' ? 'rgba(74,222,128,0.1)' : 'rgba(124,58,237,0.1)') : 'rgba(0,0,0,0.2)', color: action === a ? (a === 'sell' ? '#4ADE80' : '#a5b4fc') : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="range" min={1} max={action === 'sell' ? (holding?.shares || 1) : Math.max(1, Math.floor((coins - 100) / company.price))} value={qty}
            onChange={e => setQty(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', minWidth: 28, textAlign: 'right' }}>{qty}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
          <span>{action === 'buy' ? `Cost: ₳${fmt(cost)}` : `Receive: ₳${fmt(cost)}`}</span>
          <span>Balance: ₳{fmt(coins)}</span>
        </div>
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={handleTrade}
          style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: action === 'sell' ? 'linear-gradient(135deg,#1D9E75,#0d6e51)' : 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          {action === 'buy' ? `Buy ${qty} Share${qty !== 1 ? 's' : ''}` : `Sell ${qty} Share${qty !== 1 ? 's' : ''}`}
        </motion.button>
      </div>
    </div>
  )
}

/* ── Main CallStreet component ───────────────────────────────────── */
export default function CallStreet() {
  const {
    companies, portfolio, news, mode, seasonDay, season,
    indexHistory, pendingGrade, ipoActive,
    ringTheBell, setMode, clearGrade, buyIPO: storeIPO, earnCoins, reset,
  } = useCallStreetStore()
  const { coins, earnCoins: earn } = useCoinStore()

  const [selected, setSelected] = useState(null)
  const [belRinging, setBellRinging] = useState(false)
  const [ipoShares, setIpoShares] = useState(5)
  const [ipoMsg, setIpoMsg] = useState(null)

  const visibleCompanies = useMemo(() =>
    mode === 'venture'
      ? companies
      : companies.filter(c => !c.isStartup),
    [companies, mode])

  const indexNow  = indexHistory[indexHistory.length - 1] || 100
  const indexStart = indexHistory[Math.max(0, indexHistory.length - (seasonDay + 1))] || 100
  const indexChange = Math.round((indexNow / indexStart - 1) * 100)

  const portfolioValue = useMemo(() =>
    portfolio.reduce((s, h) => {
      const co = companies.find(c => c.id === h.companyId)
      return s + (co ? co.price * h.shares : 0)
    }, 0), [portfolio, companies])

  function handleBell() {
    setBellRinging(true)
    setTimeout(() => {
      ringTheBell()
      setBellRinging(false)
    }, 600)
  }

  function handleCollectGrade() {
    if (pendingGrade?.coins) earn(pendingGrade.coins, `Call Street Season ${season - 1} reward`)
    clearGrade()
  }

  function handleIPO() {
    const ipoCompany = ipoActive && companies.find(c => c.id === ipoActive.companyId)
    if (!ipoCompany) return
    const cost = ipoShares * ipoActive.offerPrice
    if (coins - cost < 100) { setIpoMsg('Would go below ₳100 safety floor'); return }
    // Use store's buy at IPO price by temporarily adjusting... simpler: just call buy
    const store = useCallStreetStore.getState()
    const res = store.buy(ipoActive.companyId, ipoShares)
    if (res.error) setIpoMsg(res.error)
    else { setIpoMsg(null); useCallStreetStore.getState().clearGrade() } // close IPO banner
  }

  if (selected) {
    const company = companies.find(c => c.id === selected)
    const holding = portfolio.find(p => p.companyId === selected)
    if (company) return (
      <div style={{ position: 'relative', minHeight: '100%' }}>
        <CompanyDetail company={company} holding={holding} mode={mode} onBack={() => setSelected(null)} />
        <AnimatePresence>
          {pendingGrade && <SeasonEnd grade={pendingGrade} onClose={clearGrade} onCollect={handleCollectGrade} />}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 48px', position: 'relative' }}>
      <AnimatePresence>
        {pendingGrade && <SeasonEnd grade={pendingGrade} onClose={clearGrade} onCollect={handleCollectGrade} />}
      </AnimatePresence>

      {/* Season + index bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Season {season} · Day {seasonDay}/10</span>
            <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(seasonDay / 10) * 100}%`, background: 'linear-gradient(90deg,#7C3AED,#a5b4fc)', borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Portfolio: <span style={{ color: '#D4AF37', fontWeight: 700 }}>₳{fmt(portfolioValue)}</span></span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Index: <span style={{ color: indexChange >= 0 ? '#4ADE80' : '#F87171', fontWeight: 700 }}>{indexChange >= 0 ? '+' : ''}{indexChange}%</span></span>
          </div>
        </div>
      </div>

      {/* Investor mode picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 20, border: `1px solid ${mode === m.id ? 'rgba(165,180,252,0.4)' : 'rgba(255,255,255,0.08)'}`, background: mode === m.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)', color: mode === m.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: mode === m.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Ring the Bell */}
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
        animate={belRinging ? { rotate: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.5 }}
        onClick={handleBell}
        style={{ width: '100%', padding: '16px', borderRadius: 16, border: '1px solid rgba(212,175,55,0.35)', background: 'linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.08))', color: '#D4AF37', fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, letterSpacing: '-0.02em' }}>
        <Bell size={20} fill={belRinging ? '#D4AF37' : 'none'} />
        {belRinging ? 'Markets are moving…' : 'Ring the Bell'}
      </motion.button>

      {/* IPO banner */}
      {ipoActive && (() => {
        const ipoCompany = companies.find(c => c.id === ipoActive.companyId)
        if (!ipoCompany) return null
        return (
          <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>🏦 IPO — Expires Day {ipoActive.expiresDay}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{ipoCompany.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{ipoCompany.name} going public</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Offer price ₳{ipoActive.offerPrice} · Market ₳{ipoCompany.price}</div>
              </div>
            </div>
            {ipoMsg && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 8 }}>{ipoMsg}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={1} max={20} value={ipoShares} onChange={e => setIpoShares(+e.target.value)} style={{ flex: 1, accentColor: '#60A5FA' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 28 }}>{ipoShares}</span>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleIPO}
                style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.15)', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Buy IPO · ₳{fmt(ipoShares * ipoActive.offerPrice)}
              </motion.button>
            </div>
          </div>
        )
      })()}

      {/* News feed */}
      {news.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Latest News</div>
          {news.slice(0, 5).map(n => (
            <div key={n.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>{n.text}</div>
                {n.aevaNote && (
                  <div style={{ fontSize: 11, color: 'rgba(165,180,252,0.7)', marginTop: 3, lineHeight: 1.5 }}>
                    🎓 {n.aevaNote}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market board */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
        {mode === 'venture' ? 'All Companies + Startups' : 'Market Board'}
      </div>
      {visibleCompanies.map((co, i) => {
        const holding = portfolio.find(p => p.companyId === co.id)
        const change = pctChange(co.priceHistory)
        const up = change >= 0
        const overlay = calcModeOverlay(co, mode)
        return (
          <motion.div key={co.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            onClick={() => setSelected(co.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', marginBottom: 7, background: co.isStartup ? 'rgba(251,146,60,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${co.isStartup ? 'rgba(251,146,60,0.15)' : holding ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, cursor: 'pointer' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{co.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{co.name}</span>
                {co.isStartup && <span style={{ fontSize: 9, color: '#fb923c', fontWeight: 700, padding: '1px 5px', background: 'rgba(251,146,60,0.12)', borderRadius: 4 }}>STARTUP</span>}
                {holding && <span style={{ fontSize: 9, color: '#a5b4fc', fontWeight: 700, padding: '1px 5px', background: 'rgba(99,102,241,0.12)', borderRadius: 4 }}>{holding.shares}×</span>}
              </div>
              {overlay ? (
                <div style={{ fontSize: 10, color: overlay.highlight ? '#4ADE80' : 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  {overlay.label}: {overlay.value} · {overlay.note}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{co.ticker} · {co.sector}</div>
              )}
            </div>
            <div style={{ flexShrink: 0, marginRight: 6 }}>
              <Spark history={co.priceHistory} />
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#D4AF37' }}>₳{fmt(co.price)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: up ? '#4ADE80' : '#F87171' }}>
                {up ? '▲' : '▼'}{Math.abs(change)}%
              </div>
            </div>
          </motion.div>
        )
      })}

      {news.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Press Ring the Bell to open the market
        </div>
      )}
    </div>
  )
}
