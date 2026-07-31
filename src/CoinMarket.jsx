import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, TrendingUp, TrendingDown, Check, ChevronRight, Zap, AlertCircle, RefreshCw, BarChart2, Package, Layers } from 'lucide-react'
import { useCoinStore, calcTopicPrice, calcTopicDividend, calcBondReturn, ETF_DEFS } from './coinStore'

/* ── helpers ──────────────────────────────────────────────────── */
function fmt(n) { return Math.round(n).toLocaleString() }
function daysSince(iso) { return (Date.now() - new Date(iso).getTime()) / 86400000 }
function daysLeft(bond) {
  const checkedIn = bond.daysCheckedIn.length
  return Math.max(0, bond.duration - checkedIn)
}
function bondCanCheckIn(bond) {
  const today = new Date().toDateString()
  return bond.active && !bond.daysCheckedIn.includes(today)
}
function bondMissedDays(bond) {
  const elapsed = Math.floor(daysSince(bond.startDate)) + 1
  return Math.max(0, elapsed - bond.daysCheckedIn.length)
}

/* ── sub-components ───────────────────────────────────────────── */

function CoinBadge({ coins }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 20, padding: '4px 12px' }}>
      <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 700 }}>₳</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e8d87a', letterSpacing: '-0.02em' }}>{fmt(coins)}</span>
    </div>
  )
}

function Tag({ label, colour }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: colour + '22', color: colour }}>
      {label}
    </span>
  )
}

/* ── Portfolio Tab ────────────────────────────────────────────── */
function PortfolioTab() {
  const { portfolio, removeFromPortfolio, refreshPractice, addToPortfolio, claimDividends, lastDividendClaim } = useCoinStore()
  const [showAdd, setShowAdd] = useState(false)
  const [divClaimed, setDivClaimed] = useState(false)

  const totalPortfolioValue = useMemo(() => portfolio.reduce((s, t) => s + calcTopicPrice(t), 0), [portfolio])
  const totalDividend = useMemo(() => portfolio.reduce((s, t) => s + calcTopicDividend(t), 0), [portfolio])

  const daysSinceClaim = lastDividendClaim ? daysSince(lastDividendClaim) : 99
  const canClaimDiv = daysSinceClaim >= 7 && totalDividend > 0

  function handleClaim() {
    const amt = claimDividends()
    if (amt > 0) setDivClaimed(true)
    setTimeout(() => setDivClaimed(false), 3000)
  }

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <StatCard label="Holdings Value" value={`₳ ${fmt(totalPortfolioValue)}`} sub={`${portfolio.length} topics`} colour="#7F77DD" />
        <StatCard label="Weekly Dividends" value={`₳ ${fmt(totalDividend)}`} sub="if all practiced" colour="#1D9E75" />
        <StatCard label="Next Payout" value={canClaimDiv ? 'Ready!' : `${Math.max(0, Math.ceil(7 - daysSinceClaim))}d`} sub={canClaimDiv ? `₳ ${fmt(totalDividend)} ready` : 'Check back soon'} colour={canClaimDiv ? '#1D9E75' : '#BA7517'} />
      </div>

      {/* Claim dividends */}
      {canClaimDiv && (
        <motion.button
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleClaim}
          style={{ width: '100%', padding: '12px 16px', marginBottom: 16, background: 'linear-gradient(135deg, rgba(29,158,117,0.2), rgba(29,158,117,0.1))', border: '1px solid rgba(29,158,117,0.4)', borderRadius: 12, color: '#4ADE80', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Zap size={15} />
          {divClaimed ? `Claimed ₳ ${fmt(totalDividend)}!` : `Claim Weekly Dividends — ₳ ${fmt(totalDividend)}`}
        </motion.button>
      )}

      {/* Topic list */}
      {portfolio.length === 0 ? (
        <EmptyState icon="📊" title="No topics in portfolio" body="Log a mastered topic to start earning dividends and tracking your knowledge value." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {portfolio.map(topic => <TopicCard key={topic.id} topic={topic} onRemove={removeFromPortfolio} onRefresh={refreshPractice} />)}
        </div>
      )}

      {/* Add topic */}
      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => setShowAdd(true)}
        style={{ width: '100%', padding: '11px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Plus size={14} /> Log Mastered Topic
      </motion.button>

      <AnimatePresence>
        {showAdd && <AddTopicModal onClose={() => setShowAdd(false)} onAdd={(t, a, q) => { addToPortfolio(t, a, q); setShowAdd(false) }} />}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, sub, colour }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colour, letterSpacing: '-0.03em', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
    </div>
  )
}

function TopicCard({ topic, onRemove, onRefresh }) {
  const price = calcTopicPrice(topic)
  const dividend = calcTopicDividend(topic)
  const days = daysSince(topic.lastPracticed)
  const isDecaying = days > 7
  const change = Math.round((topic.accuracy / 50 - 1) * 100)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isDecaying ? 'rgba(216,90,48,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{topic.topic}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{topic.accuracy}% accuracy · {topic.questionCount} questions</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37', letterSpacing: '-0.02em' }}>₳ {fmt(price)}</div>
          <div style={{ fontSize: 11, color: change >= 0 ? '#4ADE80' : '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
            {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {change >= 0 ? '+' : ''}{change}%
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {dividend > 0
            ? <Tag label={`₳ ${dividend}/wk dividend`} colour="#1D9E75" />
            : <Tag label="No dividend — practice needed" colour="#D85A30" />
          }
          {isDecaying && <Tag label={`Decaying — ${Math.floor(days)}d idle`} colour="#D85A30" />}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onRefresh(topic.id)}
            title="Log a practice session" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '5px 8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Practiced
          </motion.button>
          <motion.button whileHover={{ scale: 1.1, color: '#F87171' }} whileTap={{ scale: 0.9 }} onClick={() => onRemove(topic.id)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 5, borderRadius: 8, display: 'flex' }}>
            <X size={13} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function AddTopicModal({ onClose, onAdd }) {
  const [topic, setTopic] = useState('')
  const [accuracy, setAccuracy] = useState(85)
  const [questions, setQuestions] = useState(20)

  const price = useMemo(() => {
    if (!topic) return 0
    return calcTopicPrice({ accuracy, questionCount: questions, lastPracticed: new Date().toISOString() })
  }, [topic, accuracy, questions])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: '#0d0b24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 24 }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Log Mastered Topic</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Topics with 85%+ accuracy earn weekly dividends</div>

        <label style={labelStyle}>Topic name</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Calculus, Photosynthesis..." style={inputStyle} autoFocus />

        <label style={labelStyle}>Your accuracy (%)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input type="range" min={50} max={100} value={accuracy} onChange={e => setAccuracy(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: accuracy >= 85 ? '#4ADE80' : '#F87171', minWidth: 36 }}>{accuracy}%</span>
        </div>

        <label style={labelStyle}>Questions answered</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <input type="range" min={5} max={100} value={questions} onChange={e => setQuestions(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', minWidth: 36 }}>{questions}</span>
        </div>

        {topic && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Starting value</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37' }}>₳ {fmt(price)} + ₳100 bonus</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { if (topic.trim()) onAdd(topic.trim(), accuracy, questions) }}
            disabled={!topic.trim()}
            style={{ flex: 2, padding: '10px', background: topic.trim() ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, color: topic.trim() ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700, cursor: topic.trim() ? 'pointer' : 'not-allowed' }}
          >
            Add to Portfolio
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Bonds Tab ────────────────────────────────────────────────── */
function BondsTab() {
  const { bonds, createBond, checkInBond, coins } = useCoinStore()
  const [showCreate, setShowCreate] = useState(false)
  const activeBonds = bonds.filter(b => b.active)
  const finishedBonds = bonds.filter(b => !b.active)

  return (
    <div style={{ padding: '0 16px 32px' }}>
      <div style={{ background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
        <strong style={{ color: '#D4AF37' }}>Knowledge Bonds</strong> — stake coins on a daily study streak. Hit every day and get your stake back with interest. Miss more than 2 days and the stake is lost.
      </div>

      {activeBonds.length === 0 && finishedBonds.length === 0 ? (
        <EmptyState icon="🔒" title="No active bonds" body="Create a bond to commit coins to a study streak and earn guaranteed returns." />
      ) : (
        <>
          {activeBonds.map(b => <BondCard key={b.id} bond={b} onCheckIn={checkInBond} />)}
          {finishedBonds.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '20px 0 10px' }}>History</div>
              {finishedBonds.slice(0, 5).map(b => <BondCard key={b.id} bond={b} onCheckIn={() => {}} />)}
            </>
          )}
        </>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => setShowCreate(true)}
        style={{ width: '100%', marginTop: 16, padding: '11px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Plus size={14} /> New Bond
      </motion.button>

      <AnimatePresence>
        {showCreate && <CreateBondModal coins={coins} onClose={() => setShowCreate(false)} onCreate={(t, s, d) => { createBond(t, s, d); setShowCreate(false) }} />}
      </AnimatePresence>
    </div>
  )
}

function BondCard({ bond, onCheckIn }) {
  const progress = bond.daysCheckedIn.length / bond.duration
  const missed = bondMissedDays(bond)
  const canCheck = bondCanCheckIn(bond)
  const payout = Math.round(bond.stake * bond.returnMultiplier)
  const isComplete = !!bond.completedAt
  const isFailed = !!bond.failedAt || (!bond.active && !bond.completedAt)

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isComplete ? 'rgba(29,158,117,0.35)' : isFailed ? 'rgba(216,90,48,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{bond.topic}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {bond.duration}-day bond · ₳ {fmt(bond.stake)} staked · {bond.returnMultiplier}× return
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: isComplete ? '#4ADE80' : isFailed ? '#F87171' : '#D4AF37' }}>₳ {fmt(payout)}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{isComplete ? 'paid out' : isFailed ? 'lost' : 'on completion'}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, marginBottom: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, progress * 100)}%`, background: isComplete ? '#4ADE80' : isFailed ? '#F87171' : 'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          {isComplete ? '✅ Complete' : isFailed ? '❌ Failed' : `${bond.daysCheckedIn.length}/${bond.duration} days · ${daysLeft(bond)} left`}
          {missed > 0 && missed <= 2 && bond.active && <span style={{ color: '#F87171' }}> · {missed} missed</span>}
        </div>
        {canCheck && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onCheckIn(bond.id)}
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', border: 'none', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Check size={12} /> Check In Today
          </motion.button>
        )}
        {bond.active && !canCheck && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>✓ Checked in today</span>
        )}
      </div>
    </motion.div>
  )
}

function CreateBondModal({ coins, onClose, onCreate }) {
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(14)
  const [stake, setStake] = useState(100)

  const multiplier = calcBondReturn(duration)
  const payout = Math.round(stake * multiplier)
  const canAfford = coins >= stake

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: '#0d0b24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Create Bond</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Commit to daily practice. Miss 2+ days and you lose the stake.</div>

        <label style={labelStyle}>Topic to study</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Organic Chemistry..." style={inputStyle} autoFocus />

        <label style={labelStyle}>Duration</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              style={{ flex: 1, padding: '8px', background: duration === d ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', border: `1px solid ${duration === d ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: duration === d ? '#a5b4fc' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontWeight: duration === d ? 600 : 400 }}>
              {d} days<br /><span style={{ fontSize: 10, opacity: 0.7 }}>{calcBondReturn(d)}× return</span>
            </button>
          ))}
        </div>

        <label style={labelStyle}>Stake (max ₳{fmt(coins)})</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <input type="range" min={50} max={Math.min(coins, 2000)} step={50} value={stake} onChange={e => setStake(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D4AF37', minWidth: 54 }}>₳ {fmt(stake)}</span>
        </div>

        <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Stake</span>
            <span style={{ fontSize: 12, color: '#F87171' }}>−₳ {fmt(stake)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>If completed ({multiplier}×)</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#4ADE80' }}>+₳ {fmt(payout)}</span>
          </div>
        </div>

        {!canAfford && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={13} /> Not enough coins. Reduce stake or earn more.</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { if (topic.trim() && canAfford) onCreate(topic.trim(), stake, duration) }}
            disabled={!topic.trim() || !canAfford}
            style={{ flex: 2, padding: '10px', background: (topic.trim() && canAfford) ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, color: (topic.trim() && canAfford) ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700, cursor: (topic.trim() && canAfford) ? 'pointer' : 'not-allowed' }}>
            Lock In Bond
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── ETFs Tab ─────────────────────────────────────────────────── */
function ETFsTab() {
  const { etfHoldings, portfolio, buyETF, sellETF, coins } = useCoinStore()
  const [buying, setBuying] = useState(null)
  const [units, setUnits] = useState(1)

  function matchingTopics(etf) {
    return portfolio.filter(t => etf.topics.some(et => t.topic.toLowerCase().includes(et.toLowerCase()) || et.toLowerCase().includes(t.topic.toLowerCase())))
  }

  function etfValue(etf) {
    const holding = etfHoldings.find(h => h.etfId === etf.id)
    if (!holding) return 0
    return holding.units * 100
  }

  function etfYield(etf) {
    const matched = matchingTopics(etf)
    const holding = etfHoldings.find(h => h.etfId === etf.id)
    if (!holding || matched.length === 0) return 0
    return Math.round(holding.units * 2)
  }

  return (
    <div style={{ padding: '0 16px 32px' }}>
      <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
        <strong style={{ color: '#a5b4fc' }}>Sector ETFs</strong> — buy a bundle of related topics. Returns average out across the bundle, reducing risk. ETFs with matching topics in your portfolio earn ₳2/unit/week.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ETF_DEFS.map(etf => {
          const holding = etfHoldings.find(h => h.etfId === etf.id)
          const matched = matchingTopics(etf)
          const value = etfValue(etf)
          const weeklyYield = etfYield(etf)
          return (
            <div key={etf.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${holding ? etf.colour + '33' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '14px', borderLeft: `3px solid ${etf.colour}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{etf.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{etf.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{etf.topics.slice(0, 4).join(' · ')}{etf.topics.length > 4 ? ' +more' : ''}</div>
                  </div>
                </div>
                {holding && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37' }}>₳ {fmt(value)}</div>
                    <div style={{ fontSize: 11, color: '#4ADE80' }}>{holding.units} units</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <Tag label="₳100/unit" colour="#BA7517" />
                {weeklyYield > 0 && <Tag label={`₳${weeklyYield}/wk yield`} colour="#1D9E75" />}
                {matched.length > 0 && <Tag label={`${matched.length} topics matched`} colour={etf.colour} />}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { setBuying(etf.id); setUnits(1) }}
                  disabled={coins < 100}
                  style={{ flex: 1, padding: '8px', background: coins >= 100 ? `linear-gradient(135deg,${etf.colour}44,${etf.colour}22)` : 'rgba(255,255,255,0.04)', border: `1px solid ${coins >= 100 ? etf.colour + '44' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: coins >= 100 ? etf.colour : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 600, cursor: coins >= 100 ? 'pointer' : 'not-allowed' }}>
                  Buy Units
                </motion.button>
                {holding && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => sellETF(etf.id, 1)}
                    style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>
                    Sell 1
                  </motion.button>
                )}
              </div>

              <AnimatePresence>
                {buying === etf.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <input type="number" min={1} max={Math.floor(coins / 100)} value={units} onChange={e => setUnits(Math.max(1, +e.target.value))}
                        style={{ width: 60, ...inputStyle, marginBottom: 0, padding: '6px 10px' }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>units × ₳100 = ₳{fmt(units * 100)}</span>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { buyETF(etf.id, units); setBuying(null) }}
                        disabled={coins < units * 100}
                        style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Confirm
                      </motion.button>
                      <button onClick={() => setBuying(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Market Tab ───────────────────────────────────────────────── */
function MarketTab() {
  const { coins, transactions, portfolio, stats } = useCoinStore()
  const recent = transactions.slice(0, 8)

  const topTopics = [...portfolio].sort((a, b) => calcTopicPrice(b) - calcTopicPrice(a)).slice(0, 5)
  const decaying = portfolio.filter(t => daysSince(t.lastPracticed) > 7)

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {/* Sentiment */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Market Sentiment</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>{decaying.length === 0 ? '🐂' : decaying.length > 3 ? '🐻' : '📊'}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: decaying.length === 0 ? '#4ADE80' : decaying.length > 3 ? '#F87171' : '#D4AF37' }}>
              {decaying.length === 0 ? 'Bull Market' : decaying.length > 3 ? 'Bear Market' : 'Mixed'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {decaying.length === 0 ? 'All holdings are actively maintained' : `${decaying.length} topic${decaying.length > 1 ? 's' : ''} decaying — practice needed`}
            </div>
          </div>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: portfolio.length > 0 ? `${Math.round(((portfolio.length - decaying.length) / portfolio.length) * 100)}%` : '0%', background: 'linear-gradient(90deg,#F87171,#FBBF24,#4ADE80)', borderRadius: 99 }} />
        </div>
      </div>

      {/* Top holdings */}
      {topTopics.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '16px 0 10px' }}>Top Holdings</div>
          {topTopics.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 700, width: 16 }}>#{i + 1}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{t.topic}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t.accuracy}% accuracy</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>₳ {fmt(calcTopicPrice(t))}</div>
                <div style={{ fontSize: 11, color: '#4ADE80' }}>₳ {calcTopicDividend(t)}/wk</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Stats */}
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '20px 0 10px' }}>Account Stats</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        <StatCard label="Total Earned" value={`₳ ${fmt(stats.totalEarned)}`} sub="all time" colour="#4ADE80" />
        <StatCard label="Total Spent" value={`₳ ${fmt(stats.totalSpent)}`} sub="all time" colour="#F87171" />
        <StatCard label="Bonds Completed" value={stats.bondsCompleted} sub="successful" colour="#7F77DD" />
        <StatCard label="Bonds Failed" value={stats.bondsFailed} sub="stakes lost" colour="#D85A30" />
      </div>

      {/* Transaction history */}
      {recent.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Recent Transactions</div>
          {recent.map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{tx.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{new Date(tx.date).toLocaleDateString()}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: tx.amount > 0 ? '#4ADE80' : '#F87171' }}>
                {tx.amount > 0 ? '+' : ''}₳ {fmt(Math.abs(tx.amount))}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ── Shared utils ─────────────────────────────────────────────── */
function EmptyState({ icon, title, body }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.35)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{body}</div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, marginBottom: 16, outline: 'none' }

/* ── Ticker ───────────────────────────────────────────────────── */
function Ticker({ portfolio }) {
  if (portfolio.length === 0) return null
  const items = [...portfolio].slice(0, 8)
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', scrollbarWidth: 'none' }}>
      {items.map(t => {
        const price = calcTopicPrice(t)
        const change = Math.round((t.accuracy / 50 - 1) * 100)
        return (
          <div key={t.id} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 12px', minWidth: 90 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{t.topic}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>₳{fmt(price)}</div>
            <div style={{ fontSize: 10, color: change >= 0 ? '#4ADE80' : '#F87171' }}>{change >= 0 ? '▲' : '▼'}{Math.abs(change)}%</div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────────── */
const TABS = [
  { id: 'portfolio', label: 'Portfolio', icon: BarChart2 },
  { id: 'bonds',     label: 'Bonds',     icon: Layers },
  { id: 'etfs',      label: 'ETFs',      icon: Package },
  { id: 'market',    label: 'Market',    icon: TrendingUp },
]

export default function CoinMarket({ onClose }) {
  const [tab, setTab] = useState('portfolio')
  const { coins, portfolio, bonds, etfHoldings, checkDailyBonus } = useCoinStore()

  useEffect(() => { checkDailyBonus() }, [])

  const portfolioValue = useMemo(() => portfolio.reduce((s, t) => s + calcTopicPrice(t), 0), [portfolio])
  const etfValue = useMemo(() => etfHoldings.reduce((s, h) => s + h.units * 100, 0), [etfHoldings])
  const netWorth = coins + portfolioValue + etfValue

  const activeBonds = bonds.filter(b => b.active).length

  return (
    <motion.div
      key="coin-market"
      initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'linear-gradient(180deg,#060518 0%,#080624 100%)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(6,5,24,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={16} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>₳ Coin Market</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Your knowledge portfolio</div>
        </div>
        <CoinBadge coins={coins} />
      </div>

      {/* Net worth hero */}
      <div style={{ padding: '20px 16px 16px', background: 'linear-gradient(180deg,rgba(99,102,241,0.08) 0%,transparent 100%)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>Total Net Worth</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 4 }}>₳ {fmt(netWorth)}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          <span>₳ {fmt(coins)} liquid</span>
          <span>·</span>
          <span>₳ {fmt(portfolioValue)} knowledge</span>
          {etfValue > 0 && <><span>·</span><span>₳ {fmt(etfValue)} ETFs</span></>}
          {activeBonds > 0 && <><span>·</span><span>{activeBonds} active bond{activeBonds > 1 ? 's' : ''}</span></>}
        </div>
      </div>

      {/* Ticker */}
      <Ticker portfolio={portfolio} />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'rgba(0,0,0,0.15)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', borderBottom: `2px solid ${active ? '#7C3AED' : 'transparent'}`, color: active ? '#a5b4fc' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 400, transition: 'all 0.15s', letterSpacing: '-0.01em' }}>
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 20 }}>
        <AnimatePresence mode="wait">
          {tab === 'portfolio' && <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PortfolioTab /></motion.div>}
          {tab === 'bonds'     && <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><BondsTab /></motion.div>}
          {tab === 'etfs'      && <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ETFsTab /></motion.div>}
          {tab === 'market'    && <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><MarketTab /></motion.div>}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
