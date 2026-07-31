import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Bell, Lock, Star, TrendingUp, TrendingDown } from 'lucide-react'
import { useCallStreetStore, calcModeOverlay } from './callStreetStore'
import { useCoinStore } from './coinStore'

function fmt(n) { return Math.round(n).toLocaleString() }
function pctChange(history) {
  if (!history || history.length < 2) return 0
  return Math.round(((history[history.length - 1] - history[0]) / history[0]) * 100)
}

const MODES = [
  { id: 'buffett', label: '🏛️ Buffett' },
  { id: 'lynch',   label: '🔍 Lynch' },
  { id: 'soros',   label: '🌎 Soros' },
  { id: 'venture', label: '🚀 Venture' },
]

/* ── Sparkline ───────────────────────────────────────────────────── */
function Spark({ history, w = 60, h = 24 }) {
  if (!history || history.length < 2) return <div style={{ width: w, height: h }} />
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  const pts = history.map((v, i) =>
    `${(i / (history.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`
  ).join(' ')
  const up = history[history.length - 1] >= history[0]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={up ? '#4ADE80' : '#F87171'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Area chart ──────────────────────────────────────────────────── */
function AreaChart({ history, w = 280, h = 80 }) {
  if (!history || history.length < 2) return null
  const min = Math.min(...history) * 0.96
  const max = Math.max(...history) * 1.04
  const range = max - min || 1
  const pts = history.map((v, i) => [
    (i / (history.length - 1)) * w,
    h - ((v - min) / range) * h,
  ])
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

/* ── Scrolling news ticker ───────────────────────────────────────── */
function TickerTape({ news }) {
  if (!news.length) return null
  const items = news.slice(0, 8)
  const doubled = [...items, ...items]
  return (
    <div style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.02)', borderTop: '0.5px solid rgba(255,255,255,0.05)', borderBottom: '0.5px solid rgba(255,255,255,0.05)', padding: '5px 0' }}>
      <div style={{ display: 'flex', animation: 'tickerScroll 42s linear infinite', width: 'max-content' }}>
        {doubled.map((n, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 18px', fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 12 }}>{n.emoji}</span>
            <span style={{ fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171' }}>{n.ticker}</span>
            <span>{n.text.length > 38 ? n.text.slice(0, 38) + '…' : n.text}</span>
            <span style={{ fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171' }}>
              {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
            </span>
            <span style={{ color: 'rgba(255,255,255,0.12)', margin: '0 4px' }}>◆</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  )
}

/* ── Portfolio hero ──────────────────────────────────────────────── */
function PortfolioHero({ portfolioValue, coins, seasonStartValue, indexChange, portfolio, companies }) {
  const seasonReturn = seasonStartValue > 0
    ? Math.round(((portfolioValue - seasonStartValue) / seasonStartValue) * 100)
    : 0

  const bestPick = portfolio.reduce((best, h) => {
    const co = companies.find(c => c.id === h.companyId)
    if (!co) return best
    const pct = Math.round(((co.price - h.avgCost) / h.avgCost) * 100)
    return (!best || pct > best.pct) ? { ticker: co.ticker, pct } : best
  }, null)

  const ahead = seasonStartValue > 0 ? seasonReturn - indexChange : null
  const upSeason = seasonReturn >= 0

  return (
    <div style={{ padding: '12px 16px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Portfolio</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', marginBottom: 4 }}>
        ₳{fmt(portfolioValue)}
      </div>
      {seasonStartValue > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ color: upSeason ? '#4ADE80' : '#F87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            {upSeason ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {upSeason ? '+' : ''}{seasonReturn}% this season
          </span>
          {ahead !== null && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ color: ahead >= 0 ? '#4ADE80' : '#F87171', fontSize: 10 }}>
                {ahead >= 0 ? 'beating' : 'trailing'} market by {Math.abs(ahead)}%
              </span>
            </>
          )}
        </div>
      )}
      {portfolio.length > 0 ? (
        <div style={{ display: 'flex', gap: 7 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Holdings</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>{portfolio.length} stock{portfolio.length !== 1 ? 's' : ''}</div>
          </div>
          {bestPick && (
            <div style={{ flex: 1, background: bestPick.pct >= 0 ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)', borderRadius: 8, padding: '7px 10px', border: `0.5px solid ${bestPick.pct >= 0 ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)'}` }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Best pick</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: bestPick.pct >= 0 ? '#4ADE80' : '#F87171', marginTop: 2 }}>
                {bestPick.ticker} {bestPick.pct >= 0 ? '+' : ''}{bestPick.pct}%
              </div>
            </div>
          )}
          <div style={{ flex: 1, background: 'rgba(212,175,55,0.07)', borderRadius: 8, padding: '7px 10px', border: '0.5px solid rgba(212,175,55,0.15)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Cash</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', marginTop: 2 }}>₳{fmt(coins)}</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingTop: 4 }}>
          No holdings yet — buy shares in any company below
        </div>
      )}
    </div>
  )
}

/* ── Market movers ───────────────────────────────────────────────── */
function Movers({ changes, onSelect }) {
  const sorted = [...changes].sort((a, b) => b.pctChange - a.pctChange)
  const gainers = sorted.filter(c => c.pctChange > 0).slice(0, 2)
  const losers  = sorted.filter(c => c.pctChange < 0).slice(-1)
  const movers  = [...gainers, ...losers]
  if (!movers.length) return null

  return (
    <div style={{ padding: '10px 16px 4px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 7 }}>Today's movers</div>
      <div style={{ display: 'flex', gap: 7 }}>
        {movers.map(c => {
          const up = c.pctChange >= 0
          return (
            <motion.div key={c.id}
              whileTap={{ scale: 0.96 }} onClick={() => onSelect(c.id)}
              style={{ flex: 1, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', background: up ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)', border: `0.5px solid ${up ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
              <div style={{ fontSize: 16 }}>{c.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 3 }}>{c.ticker}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: up ? '#4ADE80' : '#F87171', marginTop: 5 }}>
                {up ? '+' : ''}{c.pctChange}%
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Season end overlay ──────────────────────────────────────────── */
function SeasonEnd({ grade, onClose, onCollect }) {
  const gradeColor = { 'A+': '#D4AF37', A: '#4ADE80', B: '#60A5FA', C: '#fb923c', D: '#F87171' }[grade.grade] || '#fff'
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(6,5,24,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Season complete</div>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        style={{ fontSize: 96, fontWeight: 900, color: gradeColor, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.04em' }}>
        {grade.grade}
      </motion.div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', marginBottom: 4 }}>
        {grade.returnPct >= 0 ? '+' : ''}{grade.returnPct}% return
      </div>
      {grade.multiplier > 1 && (
        <div style={{ fontSize: 12, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '0.5px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '4px 14px', marginBottom: 8, display: 'inline-block' }}>
          🔥 {grade.multiplier}× streak bonus applied!
        </div>
      )}
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
        Market index: {grade.indexReturn >= 0 ? '+' : ''}{grade.indexReturn}%
        {grade.beatMarket ? ' · You beat the market! 🎯' : ' · Market beat you'}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 280, marginBottom: 24 }}>
        {grade.note}
      </div>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCollect}
        style={{ width: '100%', maxWidth: 280, padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${gradeColor}33,${gradeColor}22)`, outline: `1px solid ${gradeColor}55`, color: gradeColor, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
        Collect ₳{fmt(grade.coins)} reward
      </motion.button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}>
        Skip
      </button>
    </motion.div>
  )
}

/* ── Sector themes ───────────────────────────────────────────────── */
const SECTOR_THEME = {
  tech:        { accent: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  glow: 'rgba(59,130,246,0.3)' },
  biotech:     { accent: '#22C55E', bg: 'rgba(34,197,94,0.12)',   glow: 'rgba(34,197,94,0.3)' },
  energy:      { accent: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  glow: 'rgba(245,158,11,0.3)' },
  logistics:   { accent: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  glow: 'rgba(96,165,250,0.3)' },
  robotics:    { accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.3)' },
  environment: { accent: '#34D399', bg: 'rgba(52,211,153,0.12)',  glow: 'rgba(52,211,153,0.3)' },
  space:       { accent: '#C084FC', bg: 'rgba(192,132,252,0.12)', glow: 'rgba(192,132,252,0.3)' },
  materials:   { accent: '#94A3B8', bg: 'rgba(148,163,184,0.12)', glow: 'rgba(148,163,184,0.3)' },
}

/* ── Detail chart (bigger, with price dots per bell ring) ────────── */
function DetailChart({ history }) {
  if (!history || history.length < 2) return null
  const W = 340, H = 160
  const min = Math.min(...history) * 0.93
  const max = Math.max(...history) * 1.07
  const range = max - min || 1
  const pts = history.map((v, i) => [
    (i / (history.length - 1)) * W,
    H - ((v - min) / range) * (H - 16) - 8,
  ])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const c = history[history.length - 1] >= history[0] ? '#4ADE80' : '#F87171'
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', height: '100%' }}>
      <defs>
        <linearGradient id="dsg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.3" />
          <stop offset="100%" stopColor={c} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#dsg)" />
      <path d={line} fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)}
          r={i === pts.length - 1 ? 5 : 3}
          fill={i === pts.length - 1 ? c : 'rgba(6,5,24,0.85)'}
          stroke={c} strokeWidth={1.5} />
      ))}
    </svg>
  )
}

/* ── Company detail ──────────────────────────────────────────────── */
function CompanyDetail({ company, holding, mode, onBack }) {
  const { buy, sell, buyResearch, news } = useCallStreetStore()
  const { coins } = useCoinStore()
  const [qty, setQty] = useState(1)
  const [action, setAction] = useState('buy')
  const [msg, setMsg] = useState(null)

  const theme = SECTOR_THEME[company.sector] || { accent: '#D4AF37', bg: 'rgba(212,175,55,0.12)', glow: 'rgba(212,175,55,0.3)' }
  const change = pctChange(company.priceHistory)
  const up = change >= 0
  const overlay = calcModeOverlay(company, mode)
  const pnl = holding ? (company.price - holding.avgCost) * holding.shares : 0

  const maxBuy  = Math.max(1, Math.floor((coins - 100) / company.price))
  const maxSell = holding?.shares || 0
  const maxQty  = action === 'sell' ? maxSell : maxBuy
  const cost = qty * company.price

  const companyNews = news.filter(n => n.companyId === company.id).slice(0, 5)

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000) }

  function adjust(delta) { setQty(q => Math.min(maxQty, Math.max(1, q + delta))) }

  function handleTrade() {
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
    <div style={{ paddingBottom: 32 }}>

      {/* Sector-colour header */}
      <div style={{ background: `linear-gradient(180deg, ${theme.bg} 0%, rgba(6,5,24,0) 100%)`, borderBottom: `1px solid ${theme.glow}`, padding: '10px 16px 16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${theme.accent}, transparent)` }} />
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>{company.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{company.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.accent, background: theme.bg, border: `1px solid ${theme.glow}`, borderRadius: 5, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{company.sector}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{company.ticker}</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5 }}>{company.desc}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.04em', lineHeight: 1 }}>₳{fmt(company.price)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: up ? '#4ADE80' : '#F87171', marginTop: 3 }}>{up ? '▲' : '▼'}{Math.abs(change)}%</div>
          </div>
        </div>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ margin: '8px 16px 0', padding: '10px 14px', borderRadius: 10, fontSize: 13, background: msg.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.ok ? '#4ADE80' : '#F87171' }}>
          {msg.text}
        </motion.div>
      )}

      {/* Big chart — ~35% of screen height */}
      <div style={{ height: 'calc(35vh - 60px)', minHeight: 140, margin: '12px 0', borderTop: `1px solid ${theme.glow}`, borderBottom: `1px solid ${theme.glow}`, background: 'rgba(255,255,255,0.015)', padding: '12px 16px 8px', position: 'relative' }}>
        <DetailChart history={company.priceHistory} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{company.priceHistory.length} rings</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>₳{fmt(company.priceHistory[0] || company.price)} → ₳{fmt(company.price)}</span>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: overlay ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {overlay && (
            <div style={{ background: overlay.highlight ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${overlay.highlight ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{overlay.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: overlay.highlight ? '#4ADE80' : '#fff', marginTop: 1 }}>{overlay.value}</div>
              <div style={{ fontSize: 9, color: overlay.highlight ? '#4ADE80' : 'rgba(255,255,255,0.35)', marginTop: 2 }}>{overlay.note}</div>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Mkt cap</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1 }}>₳{fmt(company.price * 10)}M</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>10d high</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1 }}>₳{fmt(Math.max(...company.priceHistory))}</div>
          </div>
        </div>

        {/* Position card */}
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

        {/* Research report — blurred + overlay unlock when locked */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ background: 'rgba(74,222,128,0.04)', border: `1px solid ${company.reportUnlocked ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: company.reportUnlocked ? '#4ADE80' : 'rgba(255,255,255,0.2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Star size={11} /> Analyst report — {company.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, filter: company.reportUnlocked ? 'none' : 'blur(5px)', userSelect: company.reportUnlocked ? 'auto' : 'none' }}>
              {[
                { l: 'Revenue growth', v: `${Math.round(company._revGrowth * 100)}%`,        good: company._revGrowth > 0.2 },
                { l: 'Profit margin',  v: `${Math.round(company._profitMargin * 100)}%`,     good: company._profitMargin > 0 },
                { l: 'Debt level',     v: company._debtRatio < 0.2 ? 'Low' : company._debtRatio < 0.4 ? 'Medium' : 'High', good: company._debtRatio < 0.3 },
                { l: 'Founder score',  v: company._founderScore > 0.8 ? 'Excellent' : company._founderScore > 0.65 ? 'Good' : 'Weak', good: company._founderScore > 0.7 },
                { l: 'R&D investment', v: company._rdSpend > 0.7 ? 'Heavy' : company._rdSpend > 0.45 ? 'Moderate' : 'Light', good: company._rdSpend > 0.5 },
                { l: 'Overall',        v: company._founderScore > 0.75 && company._revGrowth > 0.2 ? 'BUY' : company._profitMargin < -0.1 ? 'CAUTION' : 'HOLD', good: company._founderScore > 0.75 },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.good ? '#4ADE80' : '#F87171', marginTop: 1 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          {!company.reportUnlocked && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backdropFilter: 'blur(2px)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <Lock size={13} /> Fundamentals locked
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Hold 5 days to unlock free</div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleResearch}
                style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(212,175,55,0.5)', background: 'rgba(212,175,55,0.18)', color: '#D4AF37', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                Unlock for ₳25
              </motion.button>
            </div>
          )}
        </div>

        {/* Company news — Aeva lesson inline below each item */}
        {companyNews.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 7 }}>News</div>
            {companyNews.map(n => (
              <div key={n.id} style={{ marginBottom: 7, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{n.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{n.text}</div>
                    {n.aevaNote && (
                      <div style={{ display: 'flex', gap: 5, marginTop: 6, paddingTop: 6, borderTop: '0.5px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(165,180,252,0.65)', lineHeight: 1.5 }}>
                        <span style={{ flexShrink: 0 }}>🎓</span>
                        <span>{n.aevaNote}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171', flexShrink: 0, marginTop: 1 }}>
                    {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trade panel */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['buy', 'sell'].map(a => (
              <button key={a} onClick={() => { setAction(a); setQty(1) }}
                style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${action === a ? (a === 'sell' ? 'rgba(74,222,128,0.4)' : 'rgba(124,58,237,0.4)') : 'rgba(255,255,255,0.08)'}`, background: action === a ? (a === 'sell' ? 'rgba(74,222,128,0.1)' : 'rgba(124,58,237,0.1)') : 'rgba(0,0,0,0.2)', color: action === a ? (a === 'sell' ? '#4ADE80' : '#a5b4fc') : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
                {a}
              </button>
            ))}
          </div>

          {/* +/− qty stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => adjust(-1)}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 22, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              −
            </motion.button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{qty}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>shares</div>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => adjust(1)}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 22, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              +
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQty(maxQty)}
              style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.glow}`, background: theme.bg, color: theme.accent, fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
              MAX
            </motion.button>
          </div>

          {/* Live cost preview */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '9px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{action === 'buy' ? 'Total cost' : 'You receive'}</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: action === 'buy' ? '#a5b4fc' : '#4ADE80' }}>₳{fmt(cost)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginBottom: 12, textAlign: 'right' }}>
            After trade: ₳{fmt(action === 'buy' ? coins - cost : coins + cost)}
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={handleTrade}
            style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: action === 'sell' ? 'linear-gradient(135deg,#1D9E75,#0d6e51)' : 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            {action === 'buy' ? `Buy ${qty} share${qty !== 1 ? 's' : ''}` : `Sell ${qty} share${qty !== 1 ? 's' : ''}`}
          </motion.button>
        </div>

      </div>
    </div>
  )
}

/* ── Main CallStreet ─────────────────────────────────────────────── */
export default function CallStreet() {
  const {
    companies, portfolio, news, mode, seasonDay, season,
    indexHistory, pendingGrade, ipoActive, lastBellChanges, streak, seasonStartValue,
    ringTheBell, setMode, clearGrade,
  } = useCallStreetStore()
  const { coins, earnCoins: earn } = useCoinStore()

  const [selected, setSelected] = useState(null)
  const [bellRinging, setBellRinging] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const [flashMap, setFlashMap] = useState({})
  const [lastRingId, setLastRingId] = useState(null)
  const [ipoShares, setIpoShares] = useState(5)
  const [ipoMsg, setIpoMsg] = useState(null)

  const visibleCompanies = useMemo(() =>
    mode === 'venture' ? companies : companies.filter(c => !c.isStartup),
    [companies, mode])

  const indexNow    = indexHistory[indexHistory.length - 1] || 100
  const indexStart2 = indexHistory[Math.max(0, indexHistory.length - (seasonDay + 1))] || 100
  const indexChange = Math.round((indexNow / indexStart2 - 1) * 100)

  const portfolioValue = useMemo(() =>
    portfolio.reduce((s, h) => {
      const co = companies.find(c => c.id === h.companyId)
      return s + (co ? co.price * h.shares : 0)
    }, 0), [portfolio, companies])

  function handleBell() {
    const prevPrices = {}
    companies.forEach(c => { prevPrices[c.id] = c.price })
    setBellRinging(true)
    setFlashKey(k => k + 1)
    setTimeout(() => {
      ringTheBell()
      setBellRinging(false)
      const ns = useCallStreetStore.getState()
      const map = {}
      ns.companies.forEach(c => {
        if (prevPrices[c.id] !== undefined && c.price !== prevPrices[c.id])
          map[c.id] = c.price > prevPrices[c.id] ? 'up' : 'down'
      })
      setFlashMap(map)
      setLastRingId(ns.totalBells)
      setTimeout(() => setFlashMap({}), 1600)
    }, 400)
  }

  function handleCollectGrade() {
    if (pendingGrade?.coins) earn(pendingGrade.coins, `Call Street Season ${season - 1} reward`)
    clearGrade()
  }

  function handleIPO() {
    const ipoCompany = ipoActive && companies.find(c => c.id === ipoActive.companyId)
    if (!ipoCompany) return
    if (coins - ipoShares * ipoActive.offerPrice < 100) { setIpoMsg('Would go below ₳100 safety floor'); return }
    const res = useCallStreetStore.getState().buy(ipoActive.companyId, ipoShares)
    if (res.error) setIpoMsg(res.error)
    else setIpoMsg(null)
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
    <div style={{ position: 'relative', paddingBottom: 48 }}>
      <AnimatePresence>
        {pendingGrade && <SeasonEnd grade={pendingGrade} onClose={clearGrade} onCollect={handleCollectGrade} />}
      </AnimatePresence>

      {/* Full-screen bell flash */}
      {flashKey > 0 && (
        <motion.div
          key={flashKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0] }}
          transition={{ duration: 0.65, times: [0, 0.18, 1] }}
          style={{ position: 'fixed', inset: 0, background: '#f0f6ff', zIndex: 200, pointerEvents: 'none' }}
        />
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.03em' }}>📈 Call Street</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Season {season} · Day {seasonDay}/10</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg,#7C3AED,#D4AF37)', borderRadius: 99 }}
            animate={{ width: `${(seasonDay / 10) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Scrolling ticker */}
      {news.length > 0 && <TickerTape news={news} />}

      {/* Portfolio hero */}
      <PortfolioHero
        portfolioValue={portfolioValue}
        coins={coins}
        seasonStartValue={seasonStartValue}
        indexChange={indexChange}
        portfolio={portfolio}
        companies={companies}
      />

      {/* Investor mode chips */}
      <div style={{ padding: '10px 16px 4px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 20, border: `0.5px solid ${mode === m.id ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.1)'}`, background: mode === m.id ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.03)', color: mode === m.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: mode === m.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market movers — animates in/re-enters after each bell ring */}
      <AnimatePresence mode="wait">
        {lastBellChanges?.length > 0 && (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Movers changes={lastBellChanges} onSelect={setSelected} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* IPO banner */}
      {ipoActive && (() => {
        const ipoCompany = companies.find(c => c.id === ipoActive.companyId)
        if (!ipoCompany) return null
        return (
          <div style={{ padding: '8px 16px 4px' }}>
            <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>🏦 IPO — Expires Day {ipoActive.expiresDay}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{ipoCompany.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{ipoCompany.name} going public</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Offer ₳{ipoActive.offerPrice} · Market ₳{ipoCompany.price}</div>
                </div>
              </div>
              {ipoMsg && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 8 }}>{ipoMsg}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min={1} max={20} value={ipoShares} onChange={e => setIpoShares(+e.target.value)} style={{ flex: 1, accentColor: '#60A5FA' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 28 }}>{ipoShares}</span>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleIPO}
                  style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.15)', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Buy · ₳{fmt(ipoShares * ipoActive.offerPrice)}
                </motion.button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* News feed */}
      {news.length > 0 && (
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 7 }}>News</div>
          {news.slice(0, 4).map((n, i) => {
            const isNew = n.ringId === lastRingId
            return (
              <motion.div key={n.id}
                initial={isNew ? { opacity: 0, x: -14 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={isNew ? { delay: i * 0.1, duration: 0.28 } : {}}
                style={{ display: 'flex', gap: 9, padding: '7px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{n.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{n.text}</div>
                  {n.aevaNote && (
                    <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', marginTop: 2, lineHeight: 1.5 }}>
                      🎓 {n.aevaNote}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                  {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Market board */}
      <div style={{ padding: '10px 16px 4px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
          {mode === 'venture' ? 'All companies + startups' : 'Market board'}
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
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: holding ? 'rgba(99,102,241,0.04)' : co.isStartup ? 'rgba(251,146,60,0.04)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${holding ? 'rgba(99,102,241,0.22)' : co.isStartup ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, cursor: 'pointer', position: 'relative' }}>
              {holding && (
                <div style={{ position: 'absolute', top: 9, right: 10, width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc' }} />
              )}
              {flashMap[co.id] && (
                <motion.div
                  key={`f-${flashKey}-${co.id}`}
                  initial={{ opacity: 0.65 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: 0, borderRadius: 12, background: flashMap[co.id] === 'up' ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.22)', pointerEvents: 'none' }}
                />
              )}
              <span style={{ fontSize: 20, flexShrink: 0 }}>{co.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{co.name}</span>
                  {co.isStartup && <span style={{ fontSize: 9, color: '#fb923c', fontWeight: 700, padding: '1px 5px', background: 'rgba(251,146,60,0.12)', borderRadius: 4 }}>STARTUP</span>}
                </div>
                {overlay ? (
                  <div style={{ fontSize: 10, color: overlay.highlight ? '#4ADE80' : 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    {overlay.label}: {overlay.value} · {overlay.note}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{co.ticker} · {co.sector}</div>
                )}
              </div>
              <div style={{ flexShrink: 0, marginRight: 4 }}>
                <Spark history={co.priceHistory} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37' }}>₳{fmt(co.price)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: up ? '#4ADE80' : '#F87171' }}>
                  {up ? '▲' : '▼'}{Math.abs(change)}%
                </div>
              </div>
            </motion.div>
          )
        })}

        {news.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Press Ring the Bell to open the market
          </div>
        )}
      </div>

      {/* Bell + streak */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          animate={bellRinging ? { rotate: [0, -10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          onClick={handleBell}
          style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid rgba(212,175,55,0.4)', background: 'linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.07))', color: '#D4AF37', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, letterSpacing: '-0.02em' }}>
          <Bell size={18} fill={bellRinging ? '#D4AF37' : 'none'} />
          {bellRinging ? 'Markets moving…' : 'Ring the Bell'}
        </motion.button>
        {(streak || 0) > 0 && (
          <div style={{ background: streak >= 3 ? 'rgba(212,175,55,0.08)' : 'rgba(74,222,128,0.07)', border: `0.5px solid ${streak >= 3 ? 'rgba(212,175,55,0.28)' : 'rgba(74,222,128,0.2)'}`, borderRadius: 12, padding: '8px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 58 }}>
            {streak >= 3 && (
              <div style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700, marginBottom: 2 }}>
                {streak >= 10 ? '3×' : streak >= 6 ? '2×' : '1.5×'} bonus
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 800, color: streak >= 3 ? '#D4AF37' : '#4ADE80', lineHeight: 1 }}>🔥{streak}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>rings</div>
          </div>
        )}
      </div>
    </div>
  )
}
