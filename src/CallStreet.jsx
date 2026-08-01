import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Bell, Lock, Star, TrendingUp, TrendingDown, Bookmark } from 'lucide-react'
import { useCallStreetStore, calcModeOverlay } from './callStreetStore'
import { useCoinStore } from './coinStore'

function fmt(n) { return Math.round(n).toLocaleString() }
function pctChange(history) {
  if (!history || history.length < 2) return 0
  return Math.round(((history[history.length - 1] - history[0]) / history[0]) * 100)
}

const MODES = [
  { id: 'buffett', label: '🏛️ Buffett', unlockAt: null,   unlockDesc: null },
  { id: 'lynch',   label: '🔍 Lynch',   unlockAt: 'beat1', unlockDesc: 'Beat the market once' },
  { id: 'soros',   label: '🌎 Soros',   unlockAt: 'beat2', unlockDesc: 'Beat the market twice' },
  { id: 'venture', label: '🚀 Venture', unlockAt: 's5',    unlockDesc: '5 seasons played' },
]

function getUnlockedModes(marketBeats, seasonsPlayed) {
  const unlocked = new Set(['buffett'])
  if (marketBeats >= 1) unlocked.add('lynch')
  if (marketBeats >= 2) unlocked.add('soros')
  if (seasonsPlayed >= 5) unlocked.add('venture')
  return unlocked
}

function getNextUnlock(marketBeats, seasonsPlayed) {
  if (marketBeats < 1) return { label: '🔍 Lynch Mode', hint: 'Beat the market this season' }
  if (marketBeats < 2) return { label: '🌎 Soros Mode + Short Selling', hint: 'Beat the market one more time' }
  if (seasonsPlayed < 5) return { label: '🚀 Venture (Startups)', hint: `${5 - seasonsPlayed} more season${5 - seasonsPlayed !== 1 ? 's' : ''} to unlock` }
  return null
}

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
function TickerTape({ news, onSelect }) {
  if (!news.length) return null
  const items = news.slice(0, 8)
  const doubled = [...items, ...items]
  return (
    <div style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.02)', borderTop: '0.5px solid rgba(255,255,255,0.05)', borderBottom: '0.5px solid rgba(255,255,255,0.05)', padding: '5px 0' }}>
      <div style={{ display: 'flex', animation: 'tickerScroll 42s linear infinite', width: 'max-content' }}>
        {doubled.map((n, i) => (
          <span key={i}
            onClick={() => n.companyId && onSelect && onSelect(n.companyId)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 18px', fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', cursor: n.companyId ? 'pointer' : 'default' }}>
            <span style={{ fontSize: 12 }}>{n.emoji}</span>
            <span style={{ fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171' }}>{n.ticker}</span>
            <span>{n.text.length > 38 ? n.text.slice(0, 38) + '…' : n.text}</span>
            {n.impact !== 0 && (
              <span style={{ fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171' }}>
                {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
              </span>
            )}
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

const REGIME_ROTATION = {
  bull:            { toward: ['High-growth', 'Tech', 'Biotech'],      away: ['Defensives', 'Cash-heavy'] },
  bear:            { toward: ['Low-debt', 'Cash-rich', 'Defensives'], away: ['High-debt', 'Speculative'] },
  rate_hike:       { toward: ['Low-debt', 'High-margin', 'Capital-light'], away: ['High-debt', 'Leveraged'] },
  innovation_boom: { toward: ['Tech', 'Biotech', 'Space', 'Robotics'], away: ['Materials', 'Energy'] },
}

/* ── Macro regime banner ─────────────────────────────────────────── */
const REGIME_COLOR = {
  bull:            { accent: '#4ADE80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)'  },
  bear:            { accent: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  rate_hike:       { accent: '#FBBF24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)'  },
  innovation_boom: { accent: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
}

function MacroBanner({ announcement, onDismiss }) {
  if (!announcement) return null
  const col = REGIME_COLOR[announcement.id] || { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.25)' }
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      style={{ margin: '0 12px 10px', borderRadius: 12, background: col.bg, border: `1px solid ${col.border}`, padding: '11px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{announcement.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: col.accent, letterSpacing: '.08em', textTransform: 'uppercase' }}>New Season Regime</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{announcement.label}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{announcement.aevaNote}</div>
        </div>
        <button onClick={onDismiss}
          style={{ flexShrink: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>
          ×
        </button>
      </div>
    </motion.div>
  )
}

/* ── Pre-bell prediction card ────────────────────────────────────── */
function PredictionWidget({ companies, prediction, predictionResult, onSetPrediction, onClear, onClearPrediction, bellRinging }) {
  const [selId, setSelId] = useState(companies.find(c => !c.isStartup)?.id || '')
  const selCo = companies.find(c => c.id === selId)

  if (predictionResult) {
    return (
      <motion.div key="result" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        style={{ margin: '0 12px 8px', padding: '12px 14px', borderRadius: 13, background: predictionResult.correct ? 'rgba(74,222,128,0.09)' : 'rgba(248,113,113,0.07)', border: `1px solid ${predictionResult.correct ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.22)'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 26 }}>{predictionResult.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: predictionResult.correct ? '#4ADE80' : '#F87171', marginBottom: 2 }}>
            {predictionResult.correct ? `🎯 Correct! +₳${predictionResult.bonus}` : '❌ Missed this one'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {predictionResult.ticker} {predictionResult.direction === 'up' ? '↑ Up' : '↓ Down'} called
          </div>
        </div>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </motion.div>
    )
  }

  if (prediction) {
    const co = companies.find(c => c.id === prediction.companyId)
    return (
      <motion.div key="set" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ margin: '0 12px 8px', padding: '10px 14px', borderRadius: 13, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{co?.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#D4AF37' }}>{co?.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{prediction.direction === 'up' ? '↑ Up' : '↓ Down'} — ring the bell to reveal</div>
        </div>
        <button onClick={onClearPrediction} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </motion.div>
    )
  }

  return (
    <div style={{ margin: '0 12px 8px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.16)', borderRadius: 13, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(212,175,55,0.7)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>Which stock moves most today?</span>
        <span style={{ color: '#4ADE80' }}>+₳100 if correct</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        {companies.filter(c => !c.isStartup).map(c => (
          <button key={c.id} onClick={() => setSelId(c.id)}
            style={{ flexShrink: 0, padding: '5px 8px', borderRadius: 8, border: `1px solid ${selId === c.id ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.07)'}`, background: selId === c.id ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: selId === c.id ? '#D4AF37' : 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer', fontWeight: selId === c.id ? 700 : 400 }}>
            {c.emoji}
          </button>
        ))}
      </div>
      {selCo && (
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>{selCo.emoji}</span> {selCo.name}
          </div>
          <button onClick={() => onSetPrediction(selId, 'up')} disabled={bellRinging}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.09)', color: '#4ADE80', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            ↑ Up
          </button>
          <button onClick={() => onSetPrediction(selId, 'down')} disabled={bellRinging}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.09)', color: '#F87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            ↓ Down
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Ring progress arc ───────────────────────────────────────────── */
function RingProgressArc({ streak }) {
  const thresholds = [3, 6, 10]
  const s = streak || 0
  const nextT = thresholds.find(t => s < t) || 10
  const prevT = thresholds[thresholds.indexOf(nextT) - 1] || 0
  const progress = Math.min(1, (s - prevT) / (nextT - prevT))
  const multiplier = s >= 10 ? '3×' : s >= 6 ? '2×' : s >= 3 ? '1.5×' : null
  const col = multiplier ? '#D4AF37' : '#4ADE80'
  const r = 22, cx = 30, cy = 30, circ = 2 * Math.PI * r
  const dash = progress * circ
  return (
    <div style={{ width: 60, height: 60, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={60} height={60} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
          strokeDashoffset={(circ / 4).toFixed(2)} />
      </svg>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: col, lineHeight: 1 }}>🔥{s}</div>
        {multiplier && <div style={{ fontSize: 7, color: col, fontWeight: 700, marginTop: 1 }}>{multiplier}</div>}
      </div>
    </div>
  )
}

/* ── Timed event decision card ───────────────────────────────────── */
function EventDecisionCard({ event, company, holding, onDismiss }) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [decided, setDecided] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => { if (s <= 1) { onDismiss(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [])

  const smartMoney = company._founderScore > 0.7 && company._profitMargin > 0 ? 'BUY MORE'
    : company._debtRatio > 0.45 ? 'SELL' : 'HOLD'
  const smartReason = smartMoney === 'BUY MORE'
    ? 'Strong fundamentals — a dip on a quality company is often an entry opportunity.'
    : smartMoney === 'SELL'
    ? 'High debt + bad news is a dangerous combination. Cutting exposure reduces risk.'
    : 'News is short-term. Fundamentals are intact — experienced investors ride it out.'

  if (decided) {
    const correct = decided === smartMoney
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ margin: '0 12px 10px', background: 'rgba(0,0,0,0.45)', border: `1px solid ${correct ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: correct ? '#4ADE80' : '#FBBF24', marginBottom: 5 }}>
          {correct ? '🎯 Smart call — smart money agreed.' : `💡 Smart money said: ${smartMoney}`}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, marginBottom: 8 }}>{smartReason}</div>
        <button onClick={onDismiss} style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Dismiss</button>
      </motion.div>
    )
  }

  const arc = timeLeft / 30, r2 = 10, c2 = 2 * Math.PI * r2
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ margin: '0 12px 10px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{company.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#F87171', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>🚨 Critical Event — You hold this stock</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>{event.text}</div>
        </div>
        <svg width={26} height={26} style={{ flexShrink: 0 }}>
          <circle cx={13} cy={13} r={r2} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
          <circle cx={13} cy={13} r={r2} fill="none" stroke={timeLeft > 10 ? '#FBBF24' : '#F87171'} strokeWidth={3}
            strokeDasharray={`${(arc * c2).toFixed(1)} ${c2.toFixed(1)}`}
            strokeDashoffset={(c2 / 4).toFixed(1)} />
          <text x={13} y={17} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.5)" fontFamily="system-ui">{timeLeft}</text>
        </svg>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
        {holding.shares} shares @ avg ₳{holding.avgCost} · now ₳{fmt(company.price)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['HOLD', '#a5b4fc', 'rgba(165,180,252,0.12)', 'rgba(165,180,252,0.3)'],
          ['SELL', '#F87171', 'rgba(248,113,113,0.12)', 'rgba(248,113,113,0.3)'],
          ['BUY MORE', '#4ADE80', 'rgba(74,222,128,0.12)', 'rgba(74,222,128,0.3)']].map(([lbl, col, bg, border]) => (
          <button key={lbl} onClick={() => setDecided(lbl)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `1px solid ${border}`, background: bg, color: col, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            {lbl}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Daily challenge card ────────────────────────────────────────── */
function DailyChallenge({ challenge, lastResult, onClearResult, portfolio, companies }) {
  if (!challenge && !lastResult) return null
  if (lastResult) {
    return (
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        style={{ margin: '4px 12px 8px', padding: '10px 12px', borderRadius: 12, background: lastResult.completed ? 'rgba(74,222,128,0.09)' : 'rgba(255,255,255,0.03)', border: `1px solid ${lastResult.completed ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{lastResult.completed ? '✅' : '❌'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: lastResult.completed ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}>
            {lastResult.completed ? `Challenge complete! +₳${lastResult.reward}${lastResult.streakBonus ? ' · 2× streak bonus' : ''}` : 'Challenge missed'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{lastResult.text}</div>
        </div>
        <button onClick={onClearResult} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </motion.div>
    )
  }
  const { DAILY_CHALLENGES: defs } = { DAILY_CHALLENGES: [] }
  return (
    <div style={{ margin: '4px 12px 8px', padding: '9px 12px', borderRadius: 12, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(212,175,55,0.7)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Daily Challenge</span>
        <span style={{ fontSize: 9, color: '#4ADE80', fontWeight: 700 }}>+₳{challenge.reward}</span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{challenge.text}</div>
    </div>
  )
}

/* ── Season end overlay ──────────────────────────────────────────── */
function tradingSignal(co) {
  if (co._debtRatio > 0.45)     return 'a debt warning signal'
  if (co._profitMargin < -0.1)  return 'widening losses'
  if (co._revGrowth < 0.1)      return 'slowing revenue growth'
  return 'market headwinds'
}

function investorStyle(portfolio, companies, beatMarket) {
  if (!portfolio.length) return { label: 'Observer', emoji: '👁️', desc: 'Watch the market closely before you trade' }
  const cos = portfolio.map(h => companies.find(c => c.id === h.companyId)).filter(Boolean)
  const n = cos.length
  const hasStartups  = cos.some(c => c.isStartup)
  const growthCount  = cos.filter(c => c._revGrowth > 0.35).length
  const profitCount  = cos.filter(c => c._profitMargin > 0.15).length
  const debtCount    = cos.filter(c => c._debtRatio > 0.45).length
  if (hasStartups || growthCount / n > 0.5)
    return { label: 'Venture Capitalist', emoji: '🚀', desc: 'High risk, high reward — you backed moonshots' }
  if (profitCount / n > 0.5 && beatMarket)
    return { label: 'Value Investor',     emoji: '🏛️', desc: 'Quality businesses, patient approach — Buffett would approve' }
  if (growthCount / n > 0.3 && beatMarket)
    return { label: 'Growth Investor',    emoji: '🔍', desc: 'You spotted growth stories before the crowd' }
  if (debtCount / n > 0.3)
    return { label: 'Macro Trader',       emoji: '🌎', desc: 'Bold macro bets — risky but sometimes brilliant' }
  return   { label: 'Balanced Investor',  emoji: '⚖️', desc: 'Steady and diversified — a solid foundation' }
}

function SeasonEnd({ grade, portfolio, companies, onClose, onCollect, onFreshStart }) {
  const gradeColor = { 'A+': '#D4AF37', A: '#4ADE80', B: '#60A5FA', C: '#fb923c', D: '#F87171' }[grade.grade] || '#fff'

  const holdings = portfolio.map(h => {
    const co = companies.find(c => c.id === h.companyId)
    if (!co) return null
    const gainPct = Math.round(((co.price - h.avgCost) / h.avgCost) * 100)
    return { ...h, co, gainPct }
  }).filter(Boolean).sort((a, b) => b.gainPct - a.gainPct)

  const bestTrade  = holdings.find(h => h.gainPct > 0)
  const worstHeld  = [...holdings].reverse().find(h => h.gainPct < 0)
  const top2Ids    = holdings.slice(0, 2).map(h => h.companyId)
  const style      = investorStyle(portfolio, companies, grade.beatMarket)

  const [kept, setKept] = useState(new Set(top2Ids))
  const toggleKept = id => setKept(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(6,5,24,0.97)', overflowY: 'auto', padding: '28px 20px 40px' }}
    >
      {/* Grade */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Season complete</div>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          style={{ fontSize: 88, fontWeight: 900, color: gradeColor, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.04em' }}>
          {grade.grade}
        </motion.div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#D4AF37', marginBottom: 4 }}>
          {grade.returnPct >= 0 ? '+' : ''}{grade.returnPct}% return
        </div>
        {grade.multiplier > 1 && (
          <div style={{ fontSize: 11, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '0.5px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '3px 12px', marginBottom: 6, display: 'inline-block' }}>
            🔥 {grade.multiplier}× streak bonus applied!
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>
          Market index: {grade.indexReturn >= 0 ? '+' : ''}{grade.indexReturn}%
          {grade.beatMarket ? ' · You beat the market! 🎯' : ' · Market beat you'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginTop: 6 }}>{grade.note}</div>
      </div>

      {/* Investor style badge */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 30 }}>{style.emoji}</div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Your style this season</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{style.label}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{style.desc}</div>
        </div>
      </motion.div>

      {/* Trade callouts */}
      {(bestTrade || worstHeld) && (
        <div style={{ display: 'grid', gridTemplateColumns: bestTrade && worstHeld ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 12 }}>
          {bestTrade && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#4ADE80', fontWeight: 700, marginBottom: 4 }}>🏆 Best trade</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{bestTrade.co.emoji} {bestTrade.co.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.5 }}>
                Bought at ₳{bestTrade.avgCost}, now <span style={{ color: '#4ADE80', fontWeight: 700 }}>+{bestTrade.gainPct}%</span>
              </div>
            </motion.div>
          )}
          {worstHeld && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#F87171', fontWeight: 700, marginBottom: 4 }}>⚠️ Lesson</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{worstHeld.co.emoji} {worstHeld.co.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.5 }}>
                You held through <span style={{ color: '#F87171' }}>{tradingSignal(worstHeld.co)}</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Carry-forward selector */}
      {holdings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Carry into next season?</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Select positions to keep. The rest will be sold at market price.</div>
          {holdings.map(h => (
            <div key={h.companyId} onClick={() => toggleKept(h.companyId)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 5, borderRadius: 9, background: kept.has(h.companyId) ? 'rgba(165,180,252,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${kept.has(h.companyId) ? 'rgba(165,180,252,0.35)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 16 }}>{h.co.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{h.co.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{h.shares} shares · avg ₳{h.avgCost}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: h.gainPct >= 0 ? '#4ADE80' : '#F87171' }}>
                {h.gainPct >= 0 ? '+' : ''}{h.gainPct}%
              </div>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${kept.has(h.companyId) ? '#a5b4fc' : 'rgba(255,255,255,0.2)'}`, background: kept.has(h.companyId) ? '#a5b4fc' : 'transparent', flexShrink: 0 }} />
            </div>
          ))}
          {kept.size > 0 && (
            <button onClick={() => { onFreshStart([...kept]); onCollect() }}
              style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: '1px solid rgba(165,180,252,0.35)', background: 'rgba(124,58,237,0.15)', color: '#a5b4fc', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Fresh start — keep {kept.size} position{kept.size !== 1 ? 's' : ''}
            </button>
          )}
          {kept.size === 0 && (
            <button onClick={() => { onFreshStart([]); onCollect() }}
              style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Full reset — sell everything
            </button>
          )}
        </motion.div>
      )}

      {/* Collect */}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onCollect}
        style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${gradeColor}33,${gradeColor}22)`, outline: `1px solid ${gradeColor}55`, color: gradeColor, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
        Collect ₳{fmt(grade.coins)} reward &amp; continue
      </motion.button>
      <button onClick={onClose} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer', padding: '8px 0' }}>
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

/* ── Detail chart — price line + volume bars + benchmark ─────────── */
function DetailChart({ history }) {
  if (!history || history.length < 2) return null
  const W = 340, H = 160, VZONE = 28
  const chartH = H - VZONE
  const min = Math.min(...history) * 0.93
  const max = Math.max(...history) * 1.07
  const range = max - min || 1

  const yOf = v => chartH - ((v - min) / range) * (chartH - 16) - 8

  const pts = history.map((v, i) => [(i / (history.length - 1)) * W, yOf(v)])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${chartH} L0,${chartH} Z`
  const c = history[history.length - 1] >= history[0] ? '#4ADE80' : '#F87171'

  const last10 = history.slice(Math.max(0, history.length - 10))
  const yHigh = yOf(Math.max(...last10))
  const yLow  = yOf(Math.min(...last10))
  const startY = yOf(history[0])

  const changes = history.map((v, i) => i === 0 ? 0.15 : Math.abs(v - history[i - 1]) / range)
  const maxChange = Math.max(...changes, 0.001)
  const barW = Math.max(2, W / history.length - 1)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', height: '100%' }}>
      <defs>
        <linearGradient id="dsg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.3" />
          <stop offset="100%" stopColor={c} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* 10-day high/low shaded band */}
      <rect x={0} y={yHigh.toFixed(1)} width={W}
        height={Math.max(1, yLow - yHigh).toFixed(1)}
        fill="rgba(255,255,255,0.035)" />

      {/* Dashed benchmark at starting price */}
      <line x1={0} y1={startY.toFixed(1)} x2={W} y2={startY.toFixed(1)}
        stroke="rgba(255,255,255,0.22)" strokeWidth={1} strokeDasharray="5 4" />

      {/* Area fill + price line */}
      <path d={area} fill="url(#dsg)" />
      <path d={line} fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Price dots */}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)}
          r={i === pts.length - 1 ? 5 : 3}
          fill={i === pts.length - 1 ? c : 'rgba(6,5,24,0.85)'}
          stroke={c} strokeWidth={1.5} />
      ))}

      {/* Volume bars */}
      {history.map((v, i) => {
        const vol = changes[i] / maxChange
        const bh = Math.max(2, vol * VZONE * 0.85)
        const x = (i / (history.length - 1)) * W
        return (
          <rect key={`v${i}`}
            x={(x - barW / 2).toFixed(1)} y={(H - bh).toFixed(1)}
            width={barW.toFixed(1)} height={bh.toFixed(1)}
            fill={i === 0 || v >= history[i - 1] ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}
          />
        )
      })}
    </svg>
  )
}

/* ── Analyst radar chart ─────────────────────────────────────────── */
function RadarChart({ company, unlocked }) {
  const cx = 100, cy = 95, R = 70
  const axes = [
    { label: 'Revenue',  value: Math.min(1, Math.max(0, (company._revGrowth + 0.05) / 0.55)) },
    { label: 'Margin',   value: Math.min(1, Math.max(0, (company._profitMargin + 0.35) / 0.7)) },
    { label: 'Low Debt', value: Math.min(1, Math.max(0, 1 - company._debtRatio)) },
    { label: 'Founder',  value: Math.min(1, Math.max(0, company._founderScore)) },
    { label: 'R&D',      value: Math.min(1, Math.max(0, company._rdSpend)) },
    { label: 'Moat',     value: Math.min(1, Math.max(0, company._founderScore * 0.55 + Math.min(0.45, company._revGrowth * 0.9))) },
  ]
  const ang = i => (i / 6) * Math.PI * 2 - Math.PI / 2
  const gridLevels = [0.25, 0.5, 0.75, 1]
  const dataPoints = axes.map((a, i) => {
    const a_ = ang(i)
    return [cx + a.value * R * Math.cos(a_), cy + a.value * R * Math.sin(a_)]
  })
  const accent = unlocked ? 'rgba(74,222,128,0.65)' : 'rgba(255,255,255,0.15)'
  const fill   = unlocked ? 'rgba(74,222,128,0.11)' : 'rgba(255,255,255,0.04)'
  return (
    <svg width={200} height={190} style={{ display: 'block', margin: '0 auto', filter: unlocked ? 'none' : 'blur(3px)' }}>
      {gridLevels.map(lvl => {
        const pts = axes.map((_, i) => {
          const a_ = ang(i)
          return `${(cx + lvl * R * Math.cos(a_)).toFixed(1)},${(cy + lvl * R * Math.sin(a_)).toFixed(1)}`
        }).join(' ')
        return <polygon key={lvl} points={pts} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />
      })}
      {axes.map((_, i) => {
        const a_ = ang(i)
        return <line key={i} x1={cx} y1={cy}
          x2={(cx + R * Math.cos(a_)).toFixed(1)} y2={(cy + R * Math.sin(a_)).toFixed(1)}
          stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />
      })}
      <polygon points={dataPoints.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill={fill} stroke={accent} strokeWidth={1.5} strokeLinejoin="round" />
      {dataPoints.map(([x,y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3}
          fill={unlocked ? '#4ADE80' : 'rgba(255,255,255,0.2)'} />
      ))}
      {axes.map((a, i) => {
        const a_ = ang(i)
        const lx = cx + (R + 17) * Math.cos(a_)
        const ly = cy + (R + 17) * Math.sin(a_)
        return (
          <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill={unlocked ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'}
            fontFamily="system-ui,-apple-system,sans-serif" fontWeight={600} letterSpacing="0.03em">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Sector donut ────────────────────────────────────────────────── */
function SectorDonut({ holdings, totalValue }) {
  if (!holdings.length || totalValue <= 0) return null
  const sectors = {}
  holdings.forEach(h => { const s = h.co?.sector || 'Other'; sectors[s] = (sectors[s] || 0) + h.value })
  const entries = Object.entries(sectors).sort((a, b) => b[1] - a[1])
  const r = 22, cx = 32, cy = 32, circ = 2 * Math.PI * r
  let cum = 0
  const slices = entries.map(([sector, val]) => {
    const dash = (val / totalValue) * circ
    const slice = { sector, pct: Math.round(val / totalValue * 100), dash, startArc: cum }
    cum += dash
    return slice
  })
  return (
    <div style={{ flexShrink: 0, textAlign: 'center' }}>
      <svg width={64} height={64}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={9} />
        {slices.map(s => (
          <circle key={s.sector} cx={cx} cy={cy} r={r} fill="none"
            stroke={SECTOR_THEME[s.sector]?.accent || '#D4AF37'}
            strokeWidth={9}
            strokeDasharray={`${s.dash.toFixed(2)} ${(circ - s.dash).toFixed(2)}`}
            strokeDashoffset={(circ / 4 - s.startArc).toFixed(2)}
          />
        ))}
      </svg>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', marginTop: -6, lineHeight: 1.3 }}>
        {slices[0]?.pct}% {slices[0]?.sector}
      </div>
    </div>
  )
}

/* ── Earnings widget ─────────────────────────────────────────────── */
function EarningsWidget({ earningsWindow, seasonDay, portfolio, companies, earningsPredictions, makeEarningsPrediction }) {
  if (!earningsWindow || seasonDay !== 8) return null
  const held = portfolio.map(h => companies.find(c => c.id === h.companyId)).filter(Boolean)
  const predCount = Object.keys(earningsPredictions || {}).length
  return (
    <motion.div key="earnings-widget" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ margin: '8px 16px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ background: 'rgba(212,175,55,0.1)', padding: '10px 14px', borderBottom: '0.5px solid rgba(212,175,55,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', letterSpacing: '.06em', textTransform: 'uppercase' }}>⚡ Earnings Season</div>
          <div style={{ fontSize: 10, color: 'rgba(212,175,55,0.7)', fontWeight: 600 }}>{predCount}/{held.length} predicted</div>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
          Call Beat or Miss before the Day 9 bell · +₳20 correct · −₳10 wrong
        </div>
      </div>
      <div style={{ padding: '0 14px 6px' }}>
        {held.length === 0 && (
          <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Buy stocks to participate in earnings calls
          </div>
        )}
        {held.map(co => {
          const pred = (earningsPredictions || {})[co.id]
          const beatScore = co._revGrowth * 0.40 + co._profitMargin * 0.30 + co._founderScore * 0.30
          const beatPct = Math.round(Math.min(80, Math.max(20, 50 + beatScore * 150)))
          return (
            <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{co.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{co.name}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  Rev {Math.round(co._revGrowth * 100)}% · Margin {Math.round(co._profitMargin * 100)}% · Beat prob ~{beatPct}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => makeEarningsPrediction(co.id, 'beat')}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${pred === 'beat' ? 'rgba(74,222,128,0.7)' : 'rgba(74,222,128,0.2)'}`, background: pred === 'beat' ? 'rgba(74,222,128,0.22)' : 'rgba(74,222,128,0.04)', color: '#4ADE80', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Beat
                </motion.button>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => makeEarningsPrediction(co.id, 'miss')}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${pred === 'miss' ? 'rgba(248,113,113,0.7)' : 'rgba(248,113,113,0.2)'}`, background: pred === 'miss' ? 'rgba(248,113,113,0.22)' : 'rgba(248,113,113,0.04)', color: '#F87171', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Miss
                </motion.button>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '6px 14px 10px', fontSize: 10, color: 'rgba(165,180,252,0.55)', display: 'flex', gap: 5 }}>
        <span style={{ flexShrink: 0 }}>🎓</span>
        <span>Aeva: Earnings seasons are when fundamentals meet expectations. Companies with high revenue growth and strong founders beat more often — but surprises happen both ways.</span>
      </div>
    </motion.div>
  )
}

/* ── Earnings reveal overlay ─────────────────────────────────────── */
function EarningsReveal({ earningsReveal, onDismiss }) {
  if (!earningsReveal) return null
  const { results, totalBonus } = earningsReveal
  return (
    <motion.div key="earnings-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }}
        style={{ background: 'rgba(12,10,40,0.98)', border: `1px solid ${totalBonus >= 0 ? 'rgba(212,175,55,0.4)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 20, padding: 24, maxWidth: 340, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>⚡</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#D4AF37', letterSpacing: '.08em', textTransform: 'uppercase' }}>Earnings Results</div>
          {results.length === 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>No held stocks — nothing to score</div>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          {results.map(r => (
            <div key={r.companyId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 6, background: r.beat ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)', border: `0.5px solid ${r.beat ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{r.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{r.name}</div>
                <div style={{ fontSize: 10, color: r.beat ? '#4ADE80' : '#F87171', fontWeight: 700, marginTop: 1 }}>
                  {r.beat ? '✅ BEAT' : '❌ MISS'} · {r.pct >= 0 ? '+' : ''}{r.pct}%
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {r.prediction ? (
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.correct ? '#4ADE80' : '#F87171' }}>
                    {r.correct ? `+₳${r.bonus}` : `−₳${Math.abs(r.bonus)}`}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>no call</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {results.length > 0 && (
          <div style={{ background: totalBonus >= 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `0.5px solid ${totalBonus >= 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>Earnings bonus</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: totalBonus >= 0 ? '#4ADE80' : '#F87171' }}>
              {totalBonus >= 0 ? '+' : ''}₳{fmt(totalBonus)}
            </div>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.96 }} onClick={onDismiss}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(212,175,55,0.35)', background: 'rgba(212,175,55,0.12)', color: '#D4AF37', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ── Company detail ──────────────────────────────────────────────── */
function CompanyDetail({ company, holding, mode, onBack }) {
  const { buy, sell, buyResearch, news, watchlist, toggleWatchlist, insiderTip, buyInsiderTip,
          macroRegime, marketBeats, shorts, shortSell, closeShort, earnKnowledge,
          setStopLoss, stopLosses, setPriceTarget, priceTargets,
          portfolio: fullPortfolio, companies: allCompanies } = useCallStreetStore()
  const { coins } = useCoinStore()
  const [qty, setQty] = useState(1)
  const [action, setAction] = useState('buy')
  const [msg, setMsg] = useState(null)
  const [shortQty, setShortQty] = useState(1)

  const theme = SECTOR_THEME[company.sector] || { accent: '#D4AF37', bg: 'rgba(212,175,55,0.12)', glow: 'rgba(212,175,55,0.3)' }
  const change = pctChange(company.priceHistory)
  const up = change >= 0
  const overlay = calcModeOverlay(company, mode, macroRegime)
  const pnl = holding ? (company.price - holding.avgCost) * holding.shares : 0

  const maxBuy  = Math.max(1, Math.floor((coins - 100) / company.price))
  const maxSell = holding?.shares || 0
  const maxQty  = action === 'sell' ? maxSell : maxBuy
  const cost = qty * company.price

  const companyNews = news.filter(n => n.companyId === company.id).slice(0, 5)

  // Sector impact for position preview
  const totalPortValue = (fullPortfolio || []).reduce((s, h) => {
    const co = (allCompanies || []).find(c => c.id === h.companyId)
    return co ? s + co.price * h.shares : s
  }, 0)
  const sectorPortValue = (fullPortfolio || []).reduce((s, h) => {
    const co = (allCompanies || []).find(c => c.id === h.companyId)
    return (co && co.sector === company.sector) ? s + co.price * h.shares : s
  }, 0)
  const currentSectorPct = totalPortValue > 0 ? Math.round(sectorPortValue / totalPortValue * 100) : 0
  const tradeValue = qty * company.price
  const newTotal = action === 'buy' ? totalPortValue + tradeValue : Math.max(0, totalPortValue - tradeValue)
  const newSector = action === 'buy' ? sectorPortValue + tradeValue : Math.max(0, sectorPortValue - tradeValue)
  const newSectorPct = newTotal > 0 ? Math.round(newSector / newTotal * 100) : 0
  const activeStopLoss = (stopLosses || {})[company.id] || null

  useEffect(() => {
    if (company.priceHistory?.length > 1) earnKnowledge(company.id, 'chart')
    if (companyNews.length > 0) earnKnowledge(company.id, 'news')
  }, [company.id])

  useEffect(() => {
    if (company.reportUnlocked) earnKnowledge(company.id, 'report')
  }, [company.reportUnlocked])
  const isWatched = (watchlist || []).includes(company.id)
  const myTip = insiderTip?.companyId === company.id ? insiderTip : null

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ChevronLeft size={14} /> Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <button onClick={() => toggleWatchlist(company.id)}
              style={{ background: isWatched ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isWatched ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Star size={12} fill={isWatched ? '#D4AF37' : 'none'} color={isWatched ? '#D4AF37' : 'rgba(255,255,255,0.4)'} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isWatched ? '#D4AF37' : 'rgba(255,255,255,0.4)' }}>{isWatched ? 'Watching' : 'Watch'}</span>
            </button>
            {isWatched && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: 'rgba(212,175,55,0.5)' }}>Target ₳</span>
                <input type="number" min="1" placeholder={Math.round(company.price * 1.2)}
                  value={(priceTargets || {})[company.id] || ''}
                  onChange={e => setPriceTarget(company.id, +e.target.value || 0)}
                  style={{ width: 56, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 6, padding: '3px 6px', color: '#D4AF37', fontSize: 10, textAlign: 'right' }} />
              </div>
            )}
          </div>
        </div>
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

        {/* Research report — radar chart */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ background: 'rgba(74,222,128,0.04)', border: `1px solid ${company.reportUnlocked ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 12px 8px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: company.reportUnlocked ? '#4ADE80' : 'rgba(255,255,255,0.2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Star size={11} /> Analyst Report — {company.name}
            </div>
            {company.reportUnlocked && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 4, textAlign: 'center' }}>
                {company._founderScore > 0.75 && company._revGrowth > 0.2 ? '🟢 Recommendation: BUY' : company._profitMargin < -0.1 ? '🔴 Recommendation: CAUTION' : '🟡 Recommendation: HOLD'}
              </div>
            )}
            <RadarChart company={company} unlocked={company.reportUnlocked} />
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
            {companyNews.map(n => {
              const sev = n.severity || (Math.abs(n.impact) >= 0.12 ? 'CRITICAL' : Math.abs(n.impact) >= 0.06 ? 'MAJOR' : 'MINOR')
              const sevStyle = sev === 'CRITICAL'
                ? { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' }
                : sev === 'MAJOR'
                ? { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.28)' }
                : { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' }
              return (
                <div key={n.id} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: sevStyle.color, background: sevStyle.bg, border: `1px solid ${sevStyle.border}`, borderRadius: 4, padding: '2px 6px' }}>{sev}</span>
                    {n.impact !== 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171', marginLeft: 'auto' }}>
                        {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{n.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{n.text}</div>
                      {n.aevaNote && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 7, paddingTop: 7, borderTop: '0.5px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(165,180,252,0.65)', lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0 }}>🎓</span>
                          <span>{n.aevaNote}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Insider tip */}
        {myTip ? (
          <div style={{ marginBottom: 12, background: myTip.bullish ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${myTip.bullish ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: myTip.bullish ? '#4ADE80' : '#F87171', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              {myTip.bullish ? '📈' : '📉'} INSIDER TIP
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontStyle: 'italic' }}>"{myTip.hint}"</div>
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { const r = buyInsiderTip(company.id); if (r?.error) flash(r.error, false) }}
            style={{ width: '100%', marginBottom: 12, padding: '10px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            🕵️ Buy insider tip · ₳50
          </motion.button>
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
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '9px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{action === 'buy' ? 'Total cost' : 'You receive'}</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: action === 'buy' ? '#a5b4fc' : '#4ADE80' }}>₳{fmt(cost)}</span>
          </div>

          {/* Portfolio impact preview */}
          <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 9, padding: '7px 12px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>After trade: ₳{fmt(action === 'buy' ? coins - cost : coins + cost)}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                <span style={{ color: SECTOR_THEME[company.sector]?.accent || '#D4AF37' }}>{company.sector}</span>
                {' '}
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{currentSectorPct}%</span>
                {' → '}
                <span style={{ color: newSectorPct > 50 ? '#F87171' : newSectorPct > 30 ? '#FBBF24' : '#4ADE80', fontWeight: 700 }}>{newSectorPct}%</span>
              </span>
            </div>
            {newSectorPct > 50 && (
              <div style={{ fontSize: 9, color: '#F87171', letterSpacing: '.04em' }}>⚠ High concentration in {company.sector}</div>
            )}
          </div>

          {/* Stop-loss toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>Stop-loss:</span>
            {[null, 10, 20, 30].map(pct => (
              <button key={String(pct)} onClick={() => setStopLoss(company.id, pct)}
                style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: `1px solid ${activeStopLoss === pct ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.08)'}`, background: activeStopLoss === pct ? 'rgba(248,113,113,0.12)' : 'rgba(0,0,0,0.2)', color: activeStopLoss === pct ? '#F87171' : 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: activeStopLoss === pct ? 700 : 400, cursor: 'pointer' }}>
                {pct == null ? 'Off' : `−${pct}%`}
              </button>
            ))}
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={handleTrade}
            style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: action === 'sell' ? 'linear-gradient(135deg,#1D9E75,#0d6e51)' : 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            {action === 'buy' ? `Buy ${qty} share${qty !== 1 ? 's' : ''}` : `Sell ${qty} share${qty !== 1 ? 's' : ''}`}
          </motion.button>
        </div>

        {/* Short selling */}
        {(marketBeats || 0) < 2 ? (
          <div style={{ marginTop: 12, background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(248,113,113,0.7)' }}>Short selling locked</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Beat the market index {2 - (marketBeats || 0)} more time{2 - (marketBeats || 0) !== 1 ? 's' : ''} to unlock. Short selling lets you profit when stocks fall.</div>
            </div>
          </div>
        ) : (() => {
          const myShort = (shorts || []).find(s => s.companyId === company.id)
          const maxShort = Math.min(10, Math.max(1, Math.floor(coins / company.price)))
          const remainCap = myShort ? Math.max(0, 10 - myShort.shares) : 10
          const shortPnl = myShort ? (myShort.openPrice - company.price) * myShort.shares : 0
          return (
            <div style={{ marginTop: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#F87171', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>📉 Short Selling</div>
              {myShort && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 9, padding: '8px 10px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Open short</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F87171' }}>{myShort.shares} shares @ ₳{myShort.openPrice}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>P&L</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: shortPnl >= 0 ? '#4ADE80' : '#F87171' }}>{shortPnl >= 0 ? '+' : ''}₳{fmt(shortPnl)}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShortQty(q => Math.max(1, q - 1))}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: '#F87171', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</motion.button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 900, color: '#fff' }}>{shortQty}</div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShortQty(q => Math.min(remainCap || 1, q + 1))}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: '#F87171', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</motion.button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {remainCap > 0 && (
                  <motion.button whileTap={{ scale: 0.97 }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.14)', color: '#F87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => { const r = shortSell(company.id, shortQty); if (r?.error) flash(r.error, false); else flash(`Short opened: ${shortQty}×${company.ticker} · ₳${fmt(r.proceeds)} credited`) }}>
                    Short {shortQty} · +₳{fmt(shortQty * company.price)}
                  </motion.button>
                )}
                {myShort && (
                  <motion.button whileTap={{ scale: 0.97 }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.1)', color: '#4ADE80', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => { const r = closeShort(company.id, Math.min(shortQty, myShort.shares)); if (r?.error) flash(r.error, false); else flash(`Short closed · ₳${fmt(r.closeCost)} spent`) }}>
                    Close {Math.min(shortQty, myShort.shares)} · −₳{fmt(Math.min(shortQty, myShort.shares) * company.price)}
                  </motion.button>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, lineHeight: 1.5 }}>
                🎓 Shorting earns coins now but costs coins to close. You profit if price falls before end of season.
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}

/* ── Portfolio tab ───────────────────────────────────────────────── */
function PortfolioTab({ portfolio, companies, indexHistory, seasonDay, shorts }) {
  const indexNow   = indexHistory[indexHistory.length - 1] || 100
  const indexStart = indexHistory[Math.max(0, indexHistory.length - (seasonDay + 1))] || 100
  const indexReturn = Math.round((indexNow / indexStart - 1) * 100)

  const holdings = portfolio.map(h => {
    const co = companies.find(c => c.id === h.companyId)
    if (!co) return null
    const value  = co.price * h.shares
    const pnl    = (co.price - h.avgCost) * h.shares
    const pnlPct = Math.round(((co.price - h.avgCost) / h.avgCost) * 100)
    return { ...h, co, value, pnl, pnlPct }
  }).filter(Boolean).sort((a, b) => b.pnl - a.pnl)

  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  const totalCost  = holdings.reduce((s, h) => s + h.avgCost * h.shares, 0)
  const totalPnl   = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? Math.round((totalPnl / totalCost) * 100) : 0
  const beatIdx    = totalPnlPct > indexReturn

  const shortPositions = (shorts || []).map(s => {
    const co = companies.find(c => c.id === s.companyId)
    if (!co) return null
    const pnl = (s.openPrice - co.price) * s.shares
    return { ...s, co, pnl }
  }).filter(Boolean)

  if (!portfolio.length && !shortPositions.length) return (
    <div style={{ textAlign: 'center', padding: '60px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      No holdings yet — buy stocks in the Market tab.
    </div>
  )

  return (
    <div style={{ padding: '12px 16px 8px' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Portfolio Summary</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.03em' }}>₳{fmt(totalValue)}</div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Total P&L</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: totalPnl >= 0 ? '#4ADE80' : '#F87171', marginTop: 2 }}>
                  {totalPnl >= 0 ? '+' : ''}₳{fmt(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct}%)
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>vs Market Index</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: beatIdx ? '#4ADE80' : '#F87171', marginTop: 2 }}>
                  {beatIdx ? '▲ Beating' : '▼ Lagging'} by {Math.abs(totalPnlPct - indexReturn)}%
                </div>
              </div>
            </div>
          </div>
          <SectorDonut holdings={holdings} totalValue={totalValue} />
        </div>
      </div>

      {holdings.length > 0 && <>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Holdings — sorted by P&L
      </div>
      {holdings.map(h => {
        const pct = totalValue > 0 ? Math.round((h.value / totalValue) * 100) : 0
        const concentrated = pct >= 50
        return (
          <div key={h.companyId} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: concentrated ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${concentrated ? 'rgba(248,113,113,0.25)' : h.pnl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.1)'}`, borderRadius: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{h.co.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{h.co.name}</span>
                  {concentrated && <span style={{ fontSize: 9, fontWeight: 700, color: '#F87171', background: 'rgba(248,113,113,0.12)', borderRadius: 4, padding: '1px 5px' }}>Concentrated {pct}%</span>}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{h.shares} shares · avg ₳{h.avgCost} · {pct}% of portfolio</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37' }}>₳{fmt(h.value)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: h.pnl >= 0 ? '#4ADE80' : '#F87171' }}>
                  {h.pnl >= 0 ? '+' : ''}₳{fmt(h.pnl)} ({h.pnlPct >= 0 ? '+' : ''}{h.pnlPct}%)
                </div>
              </div>
            </div>
            {concentrated && (
              <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.7)', marginTop: 3, paddingLeft: 4, lineHeight: 1.5 }}>
                🎓 Aeva: Over 50% in one stock is high concentration risk — a single bad headline can hurt your whole portfolio.
              </div>
            )}
          </div>
        )
      })}
      </>}

      {shortPositions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(248,113,113,0.6)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>📉 Short Positions</div>
          {shortPositions.map(s => (
            <div key={s.companyId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: 'rgba(248,113,113,0.04)', border: `1px solid ${s.pnl >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`, borderRadius: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.co.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.co.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  {s.shares} short @ ₳{s.openPrice} · now ₳{fmt(s.co.price)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.pnl >= 0 ? '#4ADE80' : '#F87171' }}>
                  {s.pnl >= 0 ? '+' : ''}₳{fmt(s.pnl)}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.pnl >= 0 ? 'profit' : 'loss'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main CallStreet ─────────────────────────────────────────────── */
export default function CallStreet() {
  const {
    companies, portfolio, news, mode, seasonDay, season, totalBells,
    indexHistory, pendingGrade, ipoActive, lastBellChanges, streak, seasonStartValue,
    watchlist, hotSector, crashEvent, insiderTip,
    macroRegime, macroAnnouncement, prediction, predictionResult,
    shorts, marketBeats, haltBanner, priceTargets,
    earningsWindow, earningsPredictions, earningsReveal, seasonsPlayed, beatMarketStreak,
    dailyChallenge, lastChallengeResult, challengeStreak,
    ringTheBell, setMode, clearGrade, toggleWatchlist, clearCrash, buyInsiderTip, freshStart, resetPrices, reset,
    setPrediction, clearPrediction, clearPredictionResult, clearMacroAnnouncement, clearHaltBanner,
    makeEarningsPrediction, clearEarningsReveal, clearLastChallengeResult,
  } = useCallStreetStore()
  const { coins, earnCoins: earn, resetToDefault: resetCoins, addCoins } = useCoinStore()

  const [selected, setSelected] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [bellRinging, setBellRinging] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const [dismissedDecisions, setDismissedDecisions] = useState(new Set())
  const [flashMap, setFlashMap] = useState({})
  const [lastRingId, setLastRingId] = useState(null)
  const [ipoShares, setIpoShares] = useState(5)
  const [ipoMsg, setIpoMsg] = useState(null)
  const [activeTab, setActiveTab] = useState('market')
  const [sortBy, setSortBy] = useState('default')
  const [filterSector, setFilterSector] = useState(null)
  const [filterOwned, setFilterOwned] = useState(false)

  const unlockedModes = useMemo(() => getUnlockedModes(marketBeats || 0, seasonsPlayed || 0), [marketBeats, seasonsPlayed])
  const nextUnlock = useMemo(() => getNextUnlock(marketBeats || 0, seasonsPlayed || 0), [marketBeats, seasonsPlayed])

  const visibleCompanies = useMemo(() => {
    const mainCos = companies.filter(c => !c.isStartup)
    // Unlock ladder: first 6 companies always visible; rest unlock after 10 seasons
    const unlockedMain = (seasonsPlayed || 0) >= 10 ? mainCos : mainCos.slice(0, 6)
    let cos = mode === 'venture' ? [...unlockedMain, ...companies.filter(c => c.isStartup)] : unlockedMain
    if (filterSector) cos = cos.filter(c => c.sector === filterSector)
    if (filterOwned)  cos = cos.filter(c => portfolio.some(p => p.companyId === c.id))
    switch (sortBy) {
      case 'change_desc': return [...cos].sort((a, b) => pctChange(b.priceHistory) - pctChange(a.priceHistory))
      case 'change_asc':  return [...cos].sort((a, b) => pctChange(a.priceHistory) - pctChange(b.priceHistory))
      case 'price_desc':  return [...cos].sort((a, b) => b.price - a.price)
      case 'price_asc':   return [...cos].sort((a, b) => a.price - b.price)
      case 'sector':      return [...cos].sort((a, b) => a.sector.localeCompare(b.sector))
      case 'owned':       return [...cos].sort((a, b) => {
        const ao = portfolio.some(p => p.companyId === a.id) ? 0 : 1
        const bo = portfolio.some(p => p.companyId === b.id) ? 0 : 1
        return ao - bo
      })
      default: return cos
    }
  }, [companies, mode, filterSector, filterOwned, sortBy, portfolio])

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

  function handleFreshStart(keepIds) {
    freshStart(keepIds)
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
          {pendingGrade && <SeasonEnd grade={pendingGrade} portfolio={portfolio} companies={companies} onClose={clearGrade} onCollect={handleCollectGrade} onFreshStart={handleFreshStart} />}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingBottom: 48 }}>
      <AnimatePresence>
        {pendingGrade && <SeasonEnd grade={pendingGrade} portfolio={portfolio} companies={companies} onClose={clearGrade} onCollect={handleCollectGrade} onFreshStart={handleFreshStart} />}
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

      {/* Market crash overlay */}
      <AnimatePresence>
        {crashEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={clearCrash}
            style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(30,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.1, 1] }} transition={{ duration: 0.5 }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>📉</div>
            </motion.div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#F87171', letterSpacing: '-0.03em', marginBottom: 6 }}>MARKET CRASH</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#F87171' }}>−{crashEvent.pct}%</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 12, maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
              A market-wide shock has wiped prices across all sectors. Diversification is your best defence.
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24 }}>Tap to continue</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.03em' }}>📈 Call Street</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowSettings(s => !s)}
              style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              ⚙️ Settings
            </button>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Season {season} · Day {seasonDay}/10</span>
          </div>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg,#7C3AED,#D4AF37)', borderRadius: 99 }}
            animate={{ width: `${(seasonDay / 10) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div key="settings-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(0,0,0,0.6)' }}>
            <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', top: 52, right: 16, width: 220, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Reset Options</div>
              {[
                {
                  label: '⟳ Reset Prices',
                  desc: 'Prices return to base values. Portfolio kept.',
                  action: () => { if (window.confirm('Reset all stock prices to base values? Portfolio positions are kept.')) { resetPrices(); setShowSettings(false) } },
                  color: 'rgba(212,175,55,0.8)',
                },
                {
                  label: '💼 Reset Portfolio',
                  desc: 'Sell all holdings at current price. Add coins back.',
                  action: () => {
                    if (window.confirm('Sell all holdings and return coins? This cannot be undone.')) {
                      freshStart([])
                      setShowSettings(false)
                    }
                  },
                  color: 'rgba(96,165,250,0.8)',
                },
                {
                  label: '➕ Add ₳500',
                  desc: 'Top up your wallet by ₳500.',
                  action: () => { addCoins(500); setShowSettings(false) },
                  color: 'rgba(52,211,153,0.8)',
                },
                {
                  label: '🔴 Full Reset',
                  desc: 'Wipe everything — game + wallet — back to start.',
                  action: () => {
                    if (window.confirm('Full reset? This wipes your entire game and wallet. Are you sure?')) {
                      reset()
                      resetCoins()
                      setShowSettings(false)
                    }
                  },
                  color: 'rgba(248,113,113,0.8)',
                },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{item.desc}</div>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrolling ticker */}
      {news.length > 0 && <TickerTape news={news} onSelect={setSelected} />}

      {/* Portfolio hero */}
      <PortfolioHero
        portfolioValue={portfolioValue}
        coins={coins}
        seasonStartValue={seasonStartValue}
        indexChange={indexChange}
        portfolio={portfolio}
        companies={companies}
      />

      {/* Macro regime banner */}
      <AnimatePresence>
        {macroAnnouncement && <MacroBanner announcement={macroAnnouncement} onDismiss={clearMacroAnnouncement} />}
      </AnimatePresence>

      {/* HALT banner — company bankruptcy */}
      <AnimatePresence>
        {haltBanner && (
          <motion.div key="halt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }}
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 20, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F87171', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>Trading Halted</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{haltBanner.companyName}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 16 }}>
                {haltBanner.companyEmoji} has been declared <span style={{ color: '#F87171', fontWeight: 700 }}>bankrupt</span> and delisted from the market. All shares are worthless.
              </div>
              <div style={{ background: 'rgba(165,180,252,0.06)', border: '0.5px solid rgba(165,180,252,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, textAlign: 'left' }}>
                <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>🎓 Aeva explains</div>
                <div style={{ fontSize: 11, color: 'rgba(165,180,252,0.75)', lineHeight: 1.6 }}>Bankruptcy happens when a company can't pay its debts. As a stockholder you're last in line — after creditors and bondholders. Diversifying across sectors reduces the impact of any single delisting.</div>
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={clearHaltBanner}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.15)', color: '#F87171', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                Acknowledged
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div style={{ display: 'flex', padding: '8px 16px 0', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
        {[['market','📈 Market'], ['portfolio','💼 Portfolio']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '8px', borderRadius: '10px 10px 0 0', border: 'none', background: activeTab === tab ? 'rgba(255,255,255,0.06)' : 'transparent', color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: activeTab === tab ? 700 : 400, cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid #D4AF37' : '2px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'portfolio' && (
        <PortfolioTab portfolio={portfolio} companies={companies} indexHistory={indexHistory} seasonDay={seasonDay} shorts={shorts} />
      )}

      {activeTab === 'market' && <>

      {/* Investor mode chips */}
      <div style={{ padding: '10px 16px 4px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {MODES.map(m => {
            const isUnlocked = unlockedModes.has(m.id)
            const isActive = mode === m.id
            return (
              <button key={m.id} onClick={() => isUnlocked && setMode(m.id)} title={!isUnlocked ? `🔒 ${m.unlockDesc}` : ''}
                style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 20, border: `0.5px solid ${isActive ? 'rgba(165,180,252,0.5)' : isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`, background: isActive ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.03)', color: isActive ? '#a5b4fc' : isUnlocked ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: isUnlocked ? 'pointer' : 'default', whiteSpace: 'nowrap', opacity: isUnlocked ? 1 : 0.5 }}>
                {!isUnlocked && '🔒 '}{m.label}
              </button>
            )
          })}
        </div>
        {nextUnlock && (
          <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.55)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'rgba(212,175,55,0.4)' }}>Next unlock:</span> {nextUnlock.label} — {nextUnlock.hint}
          </div>
        )}
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
            const sev = n.severity || (Math.abs(n.impact) >= 0.12 ? 'CRITICAL' : Math.abs(n.impact) >= 0.06 ? 'MAJOR' : 'MINOR')
            const sevStyle = sev === 'CRITICAL'
              ? { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' }
              : sev === 'MAJOR'
              ? { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.28)' }
              : { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' }
            return (
              <motion.div key={n.id}
                initial={isNew ? { opacity: 0, x: -14 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={isNew ? { delay: i * 0.1, duration: 0.28 } : {}}
                style={{ padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)', background: n.isFundamental ? (n.positive ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)') : n.isNarrative ? (n.positive ? 'rgba(165,180,252,0.04)' : 'rgba(248,113,113,0.04)') : n.isEarnings ? 'rgba(212,175,55,0.03)' : 'transparent', borderRadius: (n.isFundamental || n.isNarrative || n.isEarnings) ? 8 : 0, paddingLeft: (n.isFundamental || n.isNarrative || n.isEarnings) ? 8 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: sevStyle.color, background: sevStyle.bg, border: `1px solid ${sevStyle.border}`, borderRadius: 4, padding: '2px 6px' }}>{sev}</span>
                  {n.isFundamental && <span style={{ fontSize: 9, fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171', letterSpacing: '.06em', textTransform: 'uppercase' }}>⚙ Fundamental · {n.eventLabel}</span>}
                  {n.isNarrative && <span style={{ fontSize: 9, fontWeight: 700, color: n.positive ? '#a5b4fc' : '#F87171', letterSpacing: '.06em', textTransform: 'uppercase' }}>📖 Arc · {n.arcName}</span>}
                  {n.isEarnings && <span style={{ fontSize: 9, fontWeight: 700, color: '#D4AF37', letterSpacing: '.06em', textTransform: 'uppercase' }}>⚡ Earnings</span>}
                  {!n.isFundamental && !n.isNarrative && n.impact !== 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: n.positive ? '#4ADE80' : '#F87171', marginLeft: 'auto' }}>
                      {n.positive ? '+' : ''}{Math.round(n.impact * 100)}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{n.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>{n.text}</div>
                    {n.aevaNote && (
                      <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', marginTop: 4, lineHeight: 1.5 }}>
                        🎓 {n.aevaNote}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Watchlist */}
      {(watchlist || []).length > 0 && (
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(212,175,55,0.6)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>⭐ Watchlist</div>
          {(watchlist || []).map(id => {
            const co = companies.find(c => c.id === id)
            if (!co) return null
            const ch = pctChange(co.priceHistory)
            const target = (priceTargets || {})[id]
            const targetHit = target > 0 && co.price >= target
            return (
              <div key={id}>
                {targetHit && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', marginBottom: 3, background: 'rgba(212,175,55,0.12)', border: '0.5px solid rgba(212,175,55,0.4)', borderRadius: 8 }}>
                    <span style={{ fontSize: 10 }}>{co.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', flex: 1 }}>🎯 {co.ticker} hit your ₳{target} target!</span>
                    <button onClick={() => setSelected(id)} style={{ fontSize: 9, color: '#D4AF37', background: 'rgba(212,175,55,0.2)', border: '0.5px solid rgba(212,175,55,0.4)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontWeight: 700 }}>Sell?</button>
                  </motion.div>
                )}
                <div onClick={() => setSelected(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 5, background: targetHit ? 'rgba(212,175,55,0.07)' : 'rgba(212,175,55,0.04)', border: `0.5px solid ${targetHit ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.18)'}`, borderRadius: 11, cursor: 'pointer' }}>
                  <span style={{ fontSize: 17 }}>{co.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{co.name}</div>
                    {target > 0 && <div style={{ fontSize: 9, color: co.price >= target ? '#D4AF37' : 'rgba(255,255,255,0.3)', marginTop: 1 }}>Target ₳{target} {co.price >= target ? '✓ hit' : `· ₳${target - co.price} away`}</div>}
                  </div>
                  <Spark history={co.priceHistory} w={44} h={20} />
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37' }}>₳{fmt(co.price)}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: ch >= 0 ? '#4ADE80' : '#F87171' }}>{ch >= 0 ? '▲' : '▼'}{Math.abs(ch)}%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Market board */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
            {hotSector ? <span>🔥 <span style={{ color: SECTOR_THEME[hotSector]?.accent || '#D4AF37' }}>{hotSector}</span> is hot</span> : (mode === 'venture' ? 'All companies + startups' : 'Market board')}
          </div>
        </div>

        {/* Sector rotation callout */}
        {macroRegime && REGIME_ROTATION[macroRegime] && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: REGIME_COLOR[macroRegime]?.bg || 'rgba(212,175,55,0.06)', border: `0.5px solid ${REGIME_COLOR[macroRegime]?.border || 'rgba(212,175,55,0.2)'}`, borderRadius: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: REGIME_COLOR[macroRegime]?.accent || '#D4AF37', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              {{ bull: '🐂', bear: '🐻', rate_hike: '📈', innovation_boom: '⚡' }[macroRegime]} Sector Rotation
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: 'rgba(74,222,128,0.55)', marginBottom: 3, fontWeight: 600 }}>↑ Rotate toward</div>
                <div style={{ fontSize: 10, color: '#4ADE80', fontWeight: 600, lineHeight: 1.4 }}>{REGIME_ROTATION[macroRegime].toward.join(' · ')}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: 'rgba(248,113,113,0.55)', marginBottom: 3, fontWeight: 600 }}>↓ Rotate away from</div>
                <div style={{ fontSize: 10, color: '#F87171', fontWeight: 600, lineHeight: 1.4 }}>{REGIME_ROTATION[macroRegime].away.join(' · ')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Sort chips */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 10 }}>
          {[
            ['default','Default'], ['change_desc','▲ Best'], ['change_asc','▼ Worst'],
            ['price_desc','Price↑'], ['price_asc','Price↓'], ['owned','Owned'], ['sector','Sector'],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 16, border: `0.5px solid ${sortBy === val ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.1)'}`, background: sortBy === val ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)', color: sortBy === val ? '#a5b4fc' : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: sortBy === val ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
          {portfolio.length > 0 && (
            <button onClick={() => setFilterOwned(f => !f)}
              style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 16, border: `0.5px solid ${filterOwned ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, background: filterOwned ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', color: filterOwned ? '#a5b4fc' : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: filterOwned ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              💼 Held only
            </button>
          )}
          {hotSector && (
            <button onClick={() => setFilterSector(f => f === hotSector ? null : hotSector)}
              style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 16, border: `0.5px solid ${filterSector === hotSector ? (SECTOR_THEME[hotSector]?.glow || 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)'}`, background: filterSector === hotSector ? (SECTOR_THEME[hotSector]?.bg || 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.03)', color: filterSector === hotSector ? (SECTOR_THEME[hotSector]?.accent || '#fff') : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: filterSector === hotSector ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🔥 {hotSector}
            </button>
          )}
        </div>

        {visibleCompanies.map((co, i) => {
          const holding = portfolio.find(p => p.companyId === co.id)
          const change = pctChange(co.priceHistory)
          const up = change >= 0
          const overlay = calcModeOverlay(co, mode, macroRegime)
          const isHot = co.sector === hotSector
          const isWatched = (watchlist || []).includes(co.id)
          const isDelisted = !!co.delisted
          return (
            <motion.div key={co.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              onClick={() => !isDelisted && setSelected(co.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 12px', marginBottom: 6, background: isDelisted ? 'rgba(255,255,255,0.01)' : isHot ? `${SECTOR_THEME[co.sector]?.bg || 'rgba(255,255,255,0.03)'}` : holding ? 'rgba(99,102,241,0.04)' : co.isStartup ? 'rgba(251,146,60,0.04)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${isDelisted ? 'rgba(248,113,113,0.15)' : isHot ? (SECTOR_THEME[co.sector]?.glow || 'rgba(255,255,255,0.2)') : holding ? 'rgba(99,102,241,0.22)' : co.isStartup ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.07)'}`, borderLeft: `3px solid ${SECTOR_THEME[co.sector]?.accent || '#D4AF37'}`, borderRadius: 12, cursor: isDelisted ? 'default' : 'pointer', position: 'relative', opacity: isDelisted ? 0.45 : 1, boxShadow: isHot ? `0 0 0 1px ${SECTOR_THEME[co.sector]?.glow || 'transparent'}` : 'none' }}>
              {isDelisted && (
                <div style={{ position: 'absolute', top: 7, right: 10, fontSize: 8, fontWeight: 800, color: '#F87171', background: 'rgba(248,113,113,0.15)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '.06em' }}>HALTED</div>
              )}
              {!isDelisted && holding && (
                <div style={{ position: 'absolute', top: 9, right: 30, width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc' }} />
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
                  {isHot && <span style={{ fontSize: 9, color: SECTOR_THEME[co.sector]?.accent || '#D4AF37', fontWeight: 700 }}>🔥</span>}
                  {co._lastFundamentalEvent?.season === season && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: co._lastFundamentalEvent.positive ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', color: co._lastFundamentalEvent.positive ? '#4ADE80' : '#F87171' }}>
                      {co._lastFundamentalEvent.positive ? '↑' : '↓'} {co._lastFundamentalEvent.label}
                    </span>
                  )}
                </div>
                {overlay ? (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{overlay.label}: {overlay.value}</span>
                    <span style={{ color: overlay.note?.includes('Undervalued') ? '#4ADE80' : overlay.note?.includes('Pricey') || overlay.note?.includes('Slow') ? '#F87171' : 'rgba(255,255,255,0.35)' }}>· {overlay.note}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{co.ticker} · {co.sector}</div>
                )}
              </div>
              <div style={{ flexShrink: 0, marginRight: 2 }}>
                <Spark history={co.priceHistory} />
              </div>
              <button onClick={e => { e.stopPropagation(); toggleWatchlist(co.id) }}
                style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <Star size={12} fill={isWatched ? '#D4AF37' : 'none'} color={isWatched ? '#D4AF37' : 'rgba(255,255,255,0.18)'} />
              </button>
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

      </>}

      {/* Active regime badge */}
      {macroRegime && (
        <div style={{ padding: '0 12px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: REGIME_COLOR[macroRegime]?.accent || '#D4AF37', background: REGIME_COLOR[macroRegime]?.bg || 'rgba(212,175,55,0.08)', border: `1px solid ${REGIME_COLOR[macroRegime]?.border || 'rgba(212,175,55,0.2)'}`, borderRadius: 6, padding: '2px 8px', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {{ bull: '🐂 Bull Market', bear: '🐻 Bear Market', rate_hike: '📈 Rate Hike', innovation_boom: '⚡ Innovation Boom' }[macroRegime]}
          </div>
        </div>
      )}

      {/* Earnings Season widget — Day 8 */}
      <AnimatePresence>
        <EarningsWidget
          earningsWindow={earningsWindow}
          seasonDay={seasonDay}
          portfolio={portfolio}
          companies={companies}
          earningsPredictions={earningsPredictions}
          makeEarningsPrediction={makeEarningsPrediction}
        />
      </AnimatePresence>

      {/* Earnings reveal overlay */}
      <AnimatePresence>
        {earningsReveal && <EarningsReveal earningsReveal={earningsReveal} onDismiss={clearEarningsReveal} />}
      </AnimatePresence>

      {/* Timed event decision cards — CRITICAL news on held stocks */}
      <AnimatePresence>
        {(() => {
          const criticalHeld = news.filter(n =>
            n.ringId === totalBells &&
            n.severity === 'CRITICAL' &&
            n.companyId &&
            !dismissedDecisions.has(n.id) &&
            portfolio.some(p => p.companyId === n.companyId)
          )
          const evt = criticalHeld[0]
          if (!evt) return null
          const co = companies.find(c => c.id === evt.companyId)
          const holding = portfolio.find(p => p.companyId === evt.companyId)
          if (!co || !holding) return null
          return (
            <EventDecisionCard key={evt.id} event={evt} company={co} holding={holding}
              onDecide={() => {}}
              onDismiss={() => setDismissedDecisions(s => new Set([...s, evt.id]))} />
          )
        })()}
      </AnimatePresence>

      {/* Daily challenge result / current challenge */}
      <AnimatePresence mode="wait">
        <DailyChallenge
          key={lastChallengeResult ? 'result' : 'challenge'}
          challenge={dailyChallenge}
          lastResult={lastChallengeResult}
          onClearResult={clearLastChallengeResult}
          portfolio={portfolio}
          companies={companies}
        />
      </AnimatePresence>

      {/* Pre-bell prediction */}
      <AnimatePresence mode="wait">
        <PredictionWidget
          key={predictionResult ? 'result' : prediction ? 'set' : 'idle'}
          companies={companies}
          prediction={prediction}
          predictionResult={predictionResult}
          onSetPrediction={(id, dir) => setPrediction(id, dir)}
          onClear={clearPredictionResult}
          onClearPrediction={clearPrediction}
          bellRinging={bellRinging}
        />
      </AnimatePresence>

      {/* Bell + ring progress arc */}
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
        <RingProgressArc streak={streak} />
      </div>
    </div>
  )
}
