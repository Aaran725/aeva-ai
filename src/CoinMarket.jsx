import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, TrendingUp, TrendingDown, Check, ChevronRight, ChevronLeft, Zap, AlertCircle, RefreshCw, BarChart2, Package, Layers, Users, Copy, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useCoinStore, calcTopicPrice, calcTopicDividend, calcBondReturn, ETF_DEFS, KNOWLEDGE_COMPANIES } from './coinStore'
import { useSyndicateStore } from './syndicateStore'
import { usePlayerStockStore } from './playerStockStore'
import CallStreet from './CallStreet'
import { supabase } from './supabase'

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
      {/* Earnings Report */}
      <EarningsReport />

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

/* ── Syndicates Tab ───────────────────────────────────────────── */
function SyndicatesTab() {
  const { syndicate, memberCheckIns, loading, error, dbAvailable, load, create, join, leave, checkIn, weeklyPayout } = useSyndicateStore()
  const { coins, spendCoins } = useCoinStore()
  const [view, setView] = useState('home') // home | create | join
  const [synName, setSynName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [userId, setUserId] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [accuracy, setAccuracy] = useState(75)
  const [contribution, setContribution] = useState(50)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id)
        setDisplayName(data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Student')
        load(data.user.id)
      }
    })
  }, [])

  const payout = weeklyPayout()

  const todayKey = new Date().toISOString().split('T')[0]
  const myTodayCheckIn = memberCheckIns.find(c => c.user_id === userId && c.check_in_date === todayKey)

  // Group check-ins by member for this week
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const weekCheckIns = memberCheckIns.filter(c => c.check_in_date >= weekAgo)
  const memberStats = syndicate?.memberIds?.map(id => {
    const ins = weekCheckIns.filter(c => c.user_id === id)
    const avgAcc = ins.length ? Math.round(ins.reduce((s, c) => s + c.arena_accuracy, 0) / ins.length) : null
    const name = ins[0]?.display_name || (id === userId ? displayName : id.slice(0, 8))
    return { id, name, checkIns: ins.length, avgAcc, isMe: id === userId }
  }) || []

  if (dbAvailable === false) return (
    <div style={{ padding: '0 16px 32px' }}>
      <div style={{ background: 'rgba(186,117,23,0.1)', border: '1px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: '16px', lineHeight: 1.7 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#D4AF37', marginBottom: 8 }}>⚙️ One-time setup required</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Syndicates need two database tables. Run this SQL in your Supabase dashboard → SQL Editor:</div>
        <pre style={{ fontSize: 10, color: '#a5b4fc', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 12, overflow: 'auto', lineHeight: 1.6 }}>{`CREATE TABLE coin_syndicates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  leader_id TEXT NOT NULL,
  member_ids TEXT[] DEFAULT '{}',
  pool_balance INTEGER DEFAULT 0,
  season_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE syndicate_check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  syndicate_id UUID REFERENCES coin_syndicates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  check_in_date DATE DEFAULT CURRENT_DATE,
  arena_accuracy INTEGER DEFAULT 0,
  coins_contributed INTEGER DEFAULT 0,
  UNIQUE(syndicate_id, user_id, check_in_date)
);
ALTER TABLE coin_syndicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE syndicate_check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r" ON coin_syndicates FOR SELECT USING (true);
CREATE POLICY "i" ON coin_syndicates FOR INSERT WITH CHECK (true);
CREATE POLICY "u" ON coin_syndicates FOR UPDATE USING (true);
CREATE POLICY "rc" ON syndicate_check_ins FOR SELECT USING (true);
CREATE POLICY "ic" ON syndicate_check_ins FOR INSERT WITH CHECK (true);`}</pre>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>After running the SQL, refresh the page and Syndicates will work.</div>
      </div>
    </div>
  )

  if (!userId) return (
    <EmptyState icon="🔐" title="Sign in required" body="Syndicates need an account so your group can find you. Sign in to continue." />
  )

  if (!syndicate) return (
    <div style={{ padding: '0 16px 32px' }}>
      <div style={{ background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
        <strong style={{ color: '#a5b4fc' }}>Study Syndicates</strong> — form a 5-person group. Pool coins weekly. Your collective Arena performance determines the return. One slacker hurts everyone. One star lifts everyone.
      </div>

      {view === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setView('create')}
            style={{ padding: '14px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(124,58,237,0.15))', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 14, color: '#a5b4fc', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
            <Plus size={18} />
            <div><div>Create a Syndicate</div><div style={{ fontSize: 11, color: 'rgba(165,180,252,0.6)', fontWeight: 400, marginTop: 2 }}>Start a group and share the invite code</div></div>
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setView('join')}
            style={{ padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
            <Users size={18} />
            <div><div>Join a Syndicate</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginTop: 2 }}>Enter a 6-character invite code</div></div>
          </motion.button>
        </div>
      )}

      {view === 'create' && (
        <div>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
          <label style={labelStyle}>Syndicate name</label>
          <input value={synName} onChange={e => setSynName(e.target.value)} placeholder="e.g. The Study Squad" style={inputStyle} autoFocus />
          {error && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{error}</div>}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={async () => { if (synName.trim()) await create(userId, displayName, synName.trim()) }}
            disabled={!synName.trim() || loading}
            style={{ width: '100%', padding: '11px', background: synName.trim() ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, color: synName.trim() ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700, cursor: synName.trim() ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Creating…' : 'Create & Get Invite Code'}
          </motion.button>
        </div>
      )}

      {view === 'join' && (
        <div>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
          <label style={labelStyle}>Invite code</label>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} style={{ ...inputStyle, fontSize: 20, letterSpacing: '.2em', fontWeight: 700 }} autoFocus />
          {error && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{error}</div>}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={async () => { if (joinCode.length === 6) await join(userId, displayName, joinCode) }}
            disabled={joinCode.length !== 6 || loading}
            style={{ width: '100%', padding: '11px', background: joinCode.length === 6 ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, color: joinCode.length === 6 ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700, cursor: joinCode.length === 6 ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Joining…' : 'Join Syndicate'}
          </motion.button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {/* Syndicate header */}
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.1))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{syndicate.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{syndicate.memberIds.length}/5 members · {syndicate.role === 'leader' ? '👑 Leader' : 'Member'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { navigator.clipboard?.writeText(syndicate.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '.1em' }}>
              {copied ? <Check size={12} /> : <Copy size={12} />} {syndicate.code}
            </motion.button>
          </div>
        </div>

        {/* Payout projection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Pool this week</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', marginTop: 2 }}>₳ {fmt(payout.totalCoins || 0)}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Avg accuracy</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: payout.avgAccuracy >= 60 ? '#4ADE80' : '#F87171', marginTop: 2 }}>{payout.avgAccuracy || 0}%</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Projected payout</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4ADE80', marginTop: 2 }}>₳ {fmt(payout.payout || 0)}</div>
          </div>
        </div>
      </div>

      {/* Member leaderboard */}
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>This Week's Performance</div>
      {memberStats.map((m, i) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 700, width: 16 }}>#{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: m.isMe ? '#a5b4fc' : '#fff' }}>{m.name}{m.isMe && <span style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', marginLeft: 6 }}>you</span>}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{m.checkIns} check-in{m.checkIns !== 1 ? 's' : ''} this week</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {m.avgAcc !== null
              ? <div style={{ fontSize: 14, fontWeight: 700, color: m.avgAcc >= 60 ? '#4ADE80' : '#F87171' }}>{m.avgAcc}%</div>
              : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>no data</div>
            }
          </div>
        </div>
      ))}

      {/* Check In */}
      {!myTodayCheckIn && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Log Today's Performance</div>
          {!checkingIn ? (
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setCheckingIn(true)}
              style={{ width: '100%', padding: '11px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Check size={14} /> Check In Today
            </motion.button>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
              <label style={labelStyle}>Arena accuracy today (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <input type="range" min={0} max={100} value={accuracy} onChange={e => setAccuracy(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: accuracy >= 60 ? '#4ADE80' : '#F87171', minWidth: 36 }}>{accuracy}%</span>
              </div>
              <label style={labelStyle}>Coins to contribute to pool</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <input type="range" min={10} max={Math.min(coins, 500)} step={10} value={contribution} onChange={e => setContribution(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', minWidth: 46 }}>₳ {contribution}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCheckingIn(false)} style={{ flex: 1, padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (coins < contribution) return
                    spendCoins(contribution, `Syndicate pool: ${syndicate.name}`)
                    await checkIn(userId, displayName, accuracy, contribution)
                    setCheckingIn(false)
                  }}
                  style={{ flex: 2, padding: '9px', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Submit Check-In
                </motion.button>
              </div>
            </div>
          )}
        </div>
      )}
      {myTodayCheckIn && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 10, fontSize: 12, color: '#4ADE80' }}>
          ✓ Checked in today — {myTodayCheckIn.arena_accuracy}% accuracy · ₳{myTodayCheckIn.coins_contributed} contributed
        </div>
      )}

      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
        onClick={() => leave(userId)}
        style={{ width: '100%', marginTop: 24, padding: '9px', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer' }}>
        Leave Syndicate
      </motion.button>
    </div>
  )
}

/* ── Players Tab ──────────────────────────────────────────────── */
function PlayersTab() {
  const { players, myHoldings, myShorts, myLimitOrders, loading, dbAvailable, loadMarket, buyShares, sellShares, shortSell, coverShort, buyback, setLimitOrder, cancelLimitOrder, detectSqueeze } = usePlayerStockStore()
  const { coins } = useCoinStore()
  const [userId, setUserId]     = useState(null)
  const [display, setDisplay]   = useState(null)
  const [view, setView]         = useState('market') // market | player | myPositions | orders
  const [selected, setSelected] = useState(null)
  const [tradeType, setTradeType] = useState('buy') // buy | sell | short | limit
  const [qty, setQty]           = useState(1)
  const [limitType, setLimitType] = useState('buy')
  const [limitPrice, setLimitPrice] = useState(100)
  const [msg, setMsg]           = useState(null)
  const [tab2, setTab2]         = useState('market') // market | mine

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id)
        setDisplay(data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'You')
      }
    })
  }, [])

  useEffect(() => {
    if (userId !== null) loadMarket(userId)
  }, [userId])

  function flash(m, ok = true) {
    setMsg({ text: m, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleTrade() {
    if (!userId || !selected) return
    let res
    if (tradeType === 'buy')   res = await buyShares(userId, selected.user_id, qty)
    if (tradeType === 'sell')  res = await sellShares(userId, selected.user_id, qty)
    if (tradeType === 'short') res = await shortSell(userId, selected.user_id, qty)
    if (tradeType === 'limit') res = await setLimitOrder(userId, selected.user_id, limitType, qty, limitPrice)
    if (res?.error) flash(res.error, false)
    else flash(tradeType === 'buy' ? `Bought ${qty} shares!` : tradeType === 'sell' ? `Sold ${qty} shares` : tradeType === 'short' ? 'Short opened' : 'Limit order placed')
  }

  async function handleCover(positionId) {
    const res = await coverShort(userId, positionId)
    if (res?.error) flash(res.error, false)
    else flash(`Short covered — P&L: ₳${res.pnl >= 0 ? '+' : ''}${res.pnl}`)
  }

  async function handleBuyback(shares) {
    const res = await buyback(userId, shares)
    if (res?.error) flash(res.error, false)
    else flash(`Bought back ${shares} of your own shares`)
  }

  const myPlayer = players.find(p => p.user_id === userId)
  const myHoldingsDetail = myHoldings.map(h => ({ ...h, player: players.find(p => p.user_id === h.subject_id) })).filter(h => h.player)
  const portfolioValue = myHoldingsDetail.reduce((s, h) => s + h.shares * h.player.price, 0)

  if (dbAvailable === false) return (
    <EmptyState
      icon="📈"
      title="Player Stock Market"
      body={<>Run the SQL shown in <code>src/playerStockStore.js</code> (lines 5–58) in your Supabase SQL editor to enable live player stocks.</>}
    />
  )

  // ── Player detail view ─────────────────────────────────────────
  if (view === 'player' && selected) {
    const holding = myHoldings.find(h => h.subject_id === selected.user_id)
    const squeeze = detectSqueeze(selected.user_id)
    const cost = tradeType === 'limit' ? qty * limitPrice : qty * selected.price
    const isMe = selected.user_id === userId

    return (
      <div style={{ padding: '0 16px 32px' }}>
        <button onClick={() => setView('market')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Back
        </button>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: msg.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.ok ? '#4ADE80' : '#F87171', fontSize: 13 }}>
            {msg.text}
          </div>
        )}

        {/* Player card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>
              {(selected.display_name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{selected.display_name || 'Unknown'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>ELO {selected.elo || 1000} · {selected.total_games || 0} games</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.04em' }}>₳{selected.price}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>per share</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {[
              { l: 'W/L', v: `${selected.wins || 0}/${selected.losses || 0}`, c: '#4ADE80' },
              { l: 'Win %', v: `${selected.wins || selected.losses ? Math.round((selected.wins || 0) / ((selected.wins || 0) + (selected.losses || 0)) * 100) : 0}%`, c: '#a5b4fc' },
              { l: 'Accuracy', v: `${Math.round((selected.accuracy_pct || 0) * 100)}%`, c: '#fb923c' },
              { l: 'Avg Score', v: fmt(selected.avg_score || 0), c: '#D4AF37' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '6px 8px' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          {squeeze && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, fontSize: 12, color: '#fb923c', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Zap size={13} /> Short Squeeze Alert! Price up {squeeze.priceIncrease}% — {squeeze.openShorts} shorts at risk
            </div>
          )}
        </div>

        {/* My position */}
        {holding && (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Your position</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>{holding.shares} shares @ avg ₳{holding.avg_cost}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>P&L</div>
              {(() => { const pnl = holding.shares * (selected.price - holding.avg_cost); return <div style={{ fontSize: 14, fontWeight: 700, color: pnl >= 0 ? '#4ADE80' : '#F87171' }}>{pnl >= 0 ? '+' : ''}₳{pnl}</div> })()}
            </div>
          </div>
        )}

        {/* Trade panel */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {['buy', 'sell', ...(isMe ? ['buyback'] : ['short', 'limit'])].map(t => (
              <button key={t} onClick={() => setTradeType(t)}
                style={{ flex: 1, minWidth: 60, padding: '8px 6px', borderRadius: 8, border: `1px solid ${tradeType === t ? (t === 'short' ? 'rgba(248,113,113,0.5)' : 'rgba(124,58,237,0.5)') : 'rgba(255,255,255,0.08)'}`, background: tradeType === t ? (t === 'short' ? 'rgba(248,113,113,0.15)' : 'rgba(124,58,237,0.15)') : 'rgba(0,0,0,0.2)', color: tradeType === t ? (t === 'short' ? '#F87171' : '#a5b4fc') : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                {t === 'buyback' ? 'Buyback' : t}
              </button>
            ))}
          </div>

          {tradeType === 'limit' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {['buy', 'sell'].map(t => (
                  <button key={t} onClick={() => setLimitType(t)}
                    style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${limitType === t ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`, background: limitType === t ? 'rgba(124,58,237,0.12)' : 'rgba(0,0,0,0.2)', color: limitType === t ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                    Limit {t}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
                <input type="range" min={20} max={500} value={limitPrice} onChange={e => setLimitPrice(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', minWidth: 46 }}>₳{limitPrice}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                {limitType === 'buy' ? `Fires when price drops to ₳${limitPrice}` : `Fires when price rises to ₳${limitPrice}`} · Current ₳{selected.price}
              </div>
            </div>
          )}

          {tradeType === 'short' && (
            <div style={{ padding: '8px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#F87171', lineHeight: 1.6 }}>
              Short sells shares you don't own. If price drops, you profit when you cover. Requires 150% collateral.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="range" min={1} max={Math.min(50, tradeType === 'sell' && holding ? holding.shares : 50)} value={qty} onChange={e => setQty(+e.target.value)} style={{ flex: 1, accentColor: '#7C3AED' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', minWidth: 32 }}>{qty}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {tradeType === 'buy'     && `₳${fmt(cost)} + ₳${Math.ceil(cost * 0.01)} fee`}
              {tradeType === 'sell'    && `Receive ₳${fmt(cost - Math.ceil(cost * 0.01))}`}
              {tradeType === 'short'   && `₳${fmt(Math.ceil(cost * 1.5))} collateral`}
              {tradeType === 'buyback' && `₳${fmt(cost)} + ₳${Math.ceil(cost * 0.01)} fee`}
              {tradeType === 'limit'   && (limitType === 'buy' ? `Reserve ₳${fmt(qty * limitPrice)}` : 'No coins reserved')}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Balance: ₳{fmt(coins)}</span>
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={handleTrade}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: tradeType === 'short' ? 'linear-gradient(135deg,#991b1b,#7f1d1d)' : tradeType === 'sell' ? 'linear-gradient(135deg,#1D9E75,#0d6e51)' : 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
            {tradeType === 'buyback' ? 'Buyback Own Shares' : tradeType === 'limit' ? `Place Limit ${limitType} Order` : `${tradeType} ${qty} Share${qty !== 1 ? 's' : ''}`}
          </motion.button>
        </div>
      </div>
    )
  }

  // ── Main market view ───────────────────────────────────────────
  return (
    <div style={{ padding: '0 16px 32px' }}>
      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: msg.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.ok ? '#4ADE80' : '#F87171', fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['market', 'mine'].map(t => (
          <button key={t} onClick={() => setTab2(t)}
            style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${tab2 === t ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`, background: tab2 === t ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)', color: tab2 === t ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t === 'market' ? 'Player Market' : 'My Positions'}
          </button>
        ))}
        <button onClick={() => loadMarket(userId)} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {tab2 === 'market' && (
        <>
          {/* Market stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <StatCard label="Listed Players" value={players.length} sub="on market" colour="#7F77DD" />
            <StatCard label="Market Cap" value={`₳ ${fmt(players.reduce((s, p) => s + p.price * 1000, 0))}`} sub="1000 shares each" colour="#D4AF37" />
            <StatCard label="My Portfolio" value={`₳ ${fmt(portfolioValue)}`} sub={`${myHoldings.length} positions`} colour="#1D9E75" />
          </div>

          {loading && players.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '32px 0' }}>Loading market…</div>
          )}

          {players.length === 0 && !loading && (
            <EmptyState icon="🏟️" title="No players yet" body="Arena players appear here once they've played at least one match. Be the first to start!" />
          )}

          {players.map((p, i) => {
            const holding = myHoldings.find(h => h.subject_id === p.user_id)
            const squeeze = detectSqueeze(p.user_id)
            const isMe = p.user_id === userId
            const winRate = p.wins || p.losses ? Math.round((p.wins || 0) / ((p.wins || 0) + (p.losses || 0)) * 100) : 0
            return (
              <motion.div key={p.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => { setSelected(p); setView('player'); setQty(1); setTradeType('buy') }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: isMe ? 'linear-gradient(135deg,#6366F1,#7C3AED)' : 'linear-gradient(135deg,#1e1b2e,#2a2550)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(p.display_name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{p.display_name || 'Unknown'}</span>
                    {isMe && <span style={{ fontSize: 9, color: '#a5b4fc', fontWeight: 600, padding: '1px 6px', background: 'rgba(99,102,241,0.15)', borderRadius: 6 }}>YOU</span>}
                    {squeeze && <Zap size={11} color="#fb923c" />}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>ELO {p.elo || 1000} · {winRate}% wins · {Math.round((p.accuracy_pct || 0) * 100)}% acc</div>
                  {holding && <div style={{ fontSize: 10, color: '#a5b4fc', marginTop: 3 }}>{holding.shares} shares owned</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>₳{p.price}</div>
                  <div style={{ fontSize: 10, color: p.elo >= 1000 ? '#4ADE80' : '#F87171', marginTop: 2 }}>{p.elo >= 1000 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(p.elo - 1000)} ELO</div>
                </div>
              </motion.div>
            )
          })}
        </>
      )}

      {tab2 === 'mine' && (
        <>
          {/* My stocks (self) */}
          {myPlayer && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.5)', marginBottom: 10 }}>Your Stock</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#D4AF37' }}>₳{myPlayer.price}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>per share · 1000 total outstanding</div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelected(myPlayer); setView('player'); setTradeType('buyback') }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Buyback Shares
                </motion.button>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
                Win more Arena matches to raise your stock price. Short squeeze risk increases when others bet against you.
              </div>
            </div>
          )}

          {/* Holdings */}
          {myHoldingsDetail.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Stock Holdings</div>
              {myHoldingsDetail.map(h => {
                const pnl = h.shares * (h.player.price - h.avg_cost)
                return (
                  <div key={h.id} onClick={() => { setSelected(h.player); setView('player'); setTradeType('sell') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{h.player.display_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{h.shares} shares @ avg ₳{h.avg_cost}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>₳{fmt(h.shares * h.player.price)}</div>
                      <div style={{ fontSize: 11, color: pnl >= 0 ? '#4ADE80' : '#F87171' }}>{pnl >= 0 ? '+' : ''}₳{pnl}</div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Open Shorts */}
          {myShorts.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.5)', marginBottom: 10, marginTop: 16 }}>Open Short Positions</div>
              {myShorts.map(s => {
                const p = players.find(pl => pl.user_id === s.subject_id)
                const pnl = p ? (s.borrow_price - p.price) * s.shares : 0
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{p?.display_name || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{s.shares} shares · borrowed @ ₳{s.borrow_price}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Collateral locked: ₳{s.collateral_locked}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pnl >= 0 ? '#4ADE80' : '#F87171', marginBottom: 6 }}>{pnl >= 0 ? '+' : ''}₳{pnl}</div>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleCover(s.id)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.12)', color: '#F87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Cover
                      </motion.button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Limit Orders */}
          {myLimitOrders.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10, marginTop: 16 }}>Pending Limit Orders</div>
              {myLimitOrders.map(o => {
                const p = players.find(pl => pl.user_id === o.subject_id)
                return (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{o.order_type === 'buy' ? '🟢' : '🔴'} Limit {o.order_type} · {p?.display_name || '?'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{o.shares} shares @ ₳{o.target_price} · Current ₳{p?.price || '?'}</div>
                    </div>
                    <button onClick={() => cancelLimitOrder(userId, o.id)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                )
              })}
            </>
          )}

          {myHoldingsDetail.length === 0 && myShorts.length === 0 && myLimitOrders.length === 0 && (
            <EmptyState icon="💼" title="No positions yet" body="Head to Player Market to buy your first shares. Prices update after every Arena match." />
          )}
        </>
      )}
    </div>
  )
}

/* ── Earnings Report (inside Market tab) ──────────────────────── */
function EarningsReport() {
  const { monthlySnapshots, portfolio, coins, etfHoldings } = useCoinStore()
  const portfolioValue = portfolio.reduce((s, t) => s + calcTopicPrice(t), 0)
  const etfValue = etfHoldings.reduce((s, h) => s + h.units * 100, 0)
  const currentNetWorth = coins + portfolioValue + etfValue

  const thisMonth = new Date().toISOString().slice(0, 7)
  const lastSnap = monthlySnapshots.filter(s => s.month < thisMonth).slice(-1)[0]
  const change = lastSnap ? currentNetWorth - lastSnap.netWorth : null
  const changePct = lastSnap && lastSnap.netWorth > 0 ? Math.round((change / lastSnap.netWorth) * 100) : null

  const maxVal = Math.max(...monthlySnapshots.map(s => s.netWorth), currentNetWorth, 1)

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Monthly Earnings Report</div>

      {monthlySnapshots.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>Your first monthly snapshot will be taken at the end of {thisMonth}. Check back next month to see your growth chart.</div>
      ) : (
        <>
          {change !== null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: change >= 0 ? '#4ADE80' : '#F87171' }}>
                {change >= 0 ? '+' : ''}₳ {fmt(Math.abs(change))}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>vs last month ({changePct >= 0 ? '+' : ''}{changePct}%)</span>
            </div>
          )}

          {/* Mini bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, marginBottom: 8 }}>
            {[...monthlySnapshots, { month: thisMonth + '~', netWorth: currentNetWorth }].slice(-6).map((s, i, arr) => {
              const h = Math.max(4, Math.round((s.netWorth / maxVal) * 48))
              const isNow = i === arr.length - 1
              const prev = arr[i - 1]
              const up = !prev || s.netWorth >= prev.netWorth
              return (
                <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0', background: isNow ? (up ? '#4ADE80' : '#F87171') : 'rgba(255,255,255,0.15)' }} />
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{isNow ? 'now' : s.month.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Knowledge Stock Market ───────────────────────────────────── */

function Sparkline({ data, color = '#4ADE80', width = 64, height = 28 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function CompanyResearch({ company, onClose, priceState, position }) {
  const { coins, buyStock, sellStock } = useCoinStore()
  const [tradeMode, setTradeMode] = useState('buy')
  const [qty, setQty] = useState(1)
  const [msg, setMsg] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const state = priceState[company.ticker] || { price: company.basePrice, change24h: 0, history: [company.basePrice] }
  const price = state.price
  const change = state.change24h
  const isUp = change >= 0
  const upside = Math.round(((company.fundamentals.targetPrice - price) / price) * 100)
  const pnl = position ? Math.round((price - position.avgCost) * position.shares) : 0
  const cost = Math.round(price * qty * 1.01)
  const proceeds = Math.round(price * qty * 0.99)

  const ratingColor = { 'STRONG BUY': '#4ADE80', BUY: '#86EFAC', HOLD: '#FCD34D', SELL: '#F87171' }[company.fundamentals.analystRating] || '#fff'
  const ceoColor = { 'A+': '#4ADE80', A: '#86EFAC', 'A-': '#BEF264', 'B+': '#FCD34D', B: '#FBBF24' }[company.ceo.rating] || '#fff'

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000) }
  function handleTrade() {
    if (tradeMode === 'buy') { buyStock(company.ticker, qty) ? flash(`Bought ${qty}× ${company.ticker}!`) : flash('Insufficient coins', false) }
    else { sellStock(company.ticker, qty) ? flash(`Sold ${qty}× ${company.ticker}`) : flash('Not enough shares', false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 340, damping: 35 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#07061a 0%,#090820 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          <ChevronLeft size={18} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>{company.emoji} {company.ticker}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{company.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.04em' }}>₳{price}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: isUp ? '#4ADE80' : '#F87171', display: 'flex', alignItems: 'center', gap: 2 }}>
              {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {isUp ? '+' : ''}{change}%
            </span>
          </div>
        </div>
        {position && (
          <div style={{ textAlign: 'right', padding: '6px 10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>My Position</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: pnl >= 0 ? '#4ADE80' : '#F87171' }}>{pnl >= 0 ? '+' : ''}₳{fmt(pnl)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{position.shares} shares</div>
          </div>
        )}
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {['overview', 'trade'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${activeTab === t ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.08)'}`, background: activeTab === t ? 'rgba(212,175,55,0.1)' : 'transparent', color: activeTab === t ? '#D4AF37' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t === 'overview' ? '📊 Research' : '💰 Trade'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: msg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.ok ? '#4ADE80' : '#F87171', fontSize: 13 }}>
            {msg.text}
          </motion.div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Price chart */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>7-Day Price Chart</div>
              <Sparkline data={state.history} color={isUp ? '#4ADE80' : '#F87171'} width={320} height={56} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {(state.history || []).map((_, i) => (
                  <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{['7d', '6d', '5d', '4d', '3d', '2d', 'Now'][i]}</div>
                ))}
              </div>
            </div>

            {/* CEO card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Executive Leadership</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: company.color + '22', border: `1px solid ${company.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{company.emoji}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{company.ceo.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ceoColor, background: ceoColor + '18', border: `1px solid ${ceoColor}33`, borderRadius: 6, padding: '2px 8px', letterSpacing: '.05em' }}>CEO {company.ceo.rating}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Chief Executive Officer</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 10 }}>{company.ceo.background}</div>
              <div style={{ padding: '10px 14px', background: company.color + '10', border: `1px solid ${company.color}22`, borderRadius: 10, borderLeft: `3px solid ${company.color}` }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.6 }}>"{company.ceo.quote}"</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>— {company.ceo.name.split(' ').slice(-1)[0]}</div>
              </div>
            </div>

            {/* Fundamentals */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Key Fundamentals</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { l: 'P/E Ratio', v: company.fundamentals.pe, c: '#a5b4fc' },
                  { l: 'Rev. Growth', v: `+${company.fundamentals.revenueGrowth}%`, c: '#4ADE80' },
                  { l: 'Analyst Target', v: `₳${company.fundamentals.targetPrice}`, c: '#D4AF37' },
                  { l: 'Market Cap', v: company.fundamentals.marketCap, c: '#fff' },
                  { l: 'Beta', v: company.fundamentals.beta, c: company.fundamentals.beta > 1.2 ? '#F87171' : '#94a3b8' },
                  { l: 'Analyst Rating', v: company.fundamentals.analystRating.replace('STRONG ', 'STR. '), c: ratingColor },
                ].map(m => (
                  <div key={m.l} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{m.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.c, letterSpacing: '-0.02em' }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insider intelligence */}
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 14, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', marginBottom: 5 }}>💡 Insider Intelligence</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                Study <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{company.insiderTopic}</strong> and add it to your Knowledge Portfolio to gain an insider edge — your practice sessions boost {company.ticker} stock by up to 2.5% per market refresh.
              </div>
            </div>
          </>
        )}

        {activeTab === 'trade' && (
          <>
            {/* Trade toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['buy', 'sell'].map(t => (
                <button key={t} onClick={() => { setTradeMode(t); setQty(1) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${tradeMode === t ? (t === 'buy' ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)') : 'rgba(255,255,255,0.08)'}`, background: tradeMode === t ? (t === 'buy' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)') : 'rgba(0,0,0,0.2)', color: tradeMode === t ? (t === 'buy' ? '#4ADE80' : '#F87171') : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {t === 'buy' ? '▲ Buy' : '▼ Sell'}
                </button>
              ))}
            </div>

            {/* Price overview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Market Price</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.04em' }}>₳{price}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Analyst Target</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: company.color }}>₳{company.fundamentals.targetPrice}</div>
                <div style={{ fontSize: 10, color: upside >= 0 ? '#4ADE80' : '#F87171' }}>{upside >= 0 ? '+' : ''}{upside}% upside</div>
              </div>
            </div>

            {/* Quantity slider */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Quantity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min={1}
                  max={tradeMode === 'sell' && position ? position.shares : Math.max(1, Math.min(100, Math.floor(coins / Math.max(1, price))))}
                  value={qty} onChange={e => setQty(+e.target.value)}
                  style={{ flex: 1, accentColor: company.color }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', minWidth: 36, textAlign: 'right' }}>{qty}</div>
              </div>
            </div>

            {/* Order summary */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
              {tradeMode === 'buy' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{qty} × ₳{price}</span>
                    <span style={{ fontSize: 12, color: '#fff' }}>₳{fmt(qty * price)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Total (incl. 1% fee)</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F87171' }}>−₳{fmt(cost)}</span>
                  </div>
                  {coins < cost && <div style={{ marginTop: 10, fontSize: 12, color: '#F87171', display: 'flex', alignItems: 'center', gap: 5 }}><AlertCircle size={12} /> Need ₳{fmt(cost - coins)} more</div>}
                </>
              ) : (
                !position ? (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '8px 0' }}>No position in {company.ticker}</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Net Proceeds (−1% fee)</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#4ADE80' }}>+₳{fmt(proceeds)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Avg cost ₳{position.avgCost} · {position.shares} shares held</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: (price - position.avgCost) * qty >= 0 ? '#4ADE80' : '#F87171' }}>
                        P&L {(price - position.avgCost) * qty >= 0 ? '+' : ''}₳{fmt((price - position.avgCost) * qty)}
                      </span>
                    </div>
                  </>
                )
              )}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleTrade}
              disabled={tradeMode === 'buy' ? coins < cost : !position || position.shares < qty}
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: (tradeMode === 'buy' && coins >= cost) || (tradeMode === 'sell' && position && position.shares >= qty) ? (tradeMode === 'buy' ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#EF4444,#DC2626)') : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.02em' }}>
              {tradeMode === 'buy' ? `Buy ${qty} Share${qty !== 1 ? 's' : ''} — ₳${fmt(cost)}` : `Sell ${qty} Share${qty !== 1 ? 's' : ''} — Receive ₳${fmt(proceeds)}`}
            </motion.button>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 10 }}>
              Balance after: ₳{fmt(tradeMode === 'buy' ? coins - cost : coins + proceeds)}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

function StocksTab() {
  const { portfolio, stockPositions, marketNews, stockPriceState, refreshMarket, coins } = useCoinStore()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [sortBy, setSortBy] = useState('cap')
  const [selected, setSelected] = useState(null)

  useEffect(() => { refreshMarket(portfolio) }, [])

  const SECTOR_COLORS = { sciences: '#34D399', maths: '#818CF8', history: '#FBBF24', languages: '#F9A8D4', arts: '#F472B6' }

  const totalChange = KNOWLEDGE_COMPANIES.reduce((s, co) => s + (stockPriceState[co.ticker]?.change24h || 0), 0) / KNOWLEDGE_COMPANIES.length
  const stocksUp = KNOWLEDGE_COMPANIES.filter(co => (stockPriceState[co.ticker]?.change24h || 0) > 0).length
  const myPosValue = Object.entries(stockPositions).reduce((s, [ticker, pos]) => {
    const price = stockPriceState[ticker]?.price || KNOWLEDGE_COMPANIES.find(c => c.ticker === ticker)?.basePrice || 0
    return s + pos.shares * price
  }, 0)
  const myPosCount = Object.keys(stockPositions).length

  const filtered = KNOWLEDGE_COMPANIES
    .filter(co => {
      if (sectorFilter !== 'all' && co.sector !== sectorFilter) return false
      if (search && !co.name.toLowerCase().includes(search.toLowerCase()) && !co.ticker.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'price') return (stockPriceState[b.ticker]?.price || b.basePrice) - (stockPriceState[a.ticker]?.price || a.basePrice)
      if (sortBy === 'change') return (stockPriceState[b.ticker]?.change24h || 0) - (stockPriceState[a.ticker]?.change24h || 0)
      if (sortBy === 'rating') {
        const r = { 'STRONG BUY': 4, BUY: 3, HOLD: 2, SELL: 1 }
        return (r[b.fundamentals.analystRating] || 0) - (r[a.fundamentals.analystRating] || 0)
      }
      return b.fundamentals.pe - a.fundamentals.pe
    })

  return (
    <div>
      {/* Market overview bar */}
      <div style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em' }}>AKEX Index</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37', letterSpacing: '-0.03em' }}>₳2,847 <span style={{ fontSize: 11, color: totalChange >= 0 ? '#4ADE80' : '#F87171', fontWeight: 600 }}>{totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)}%</span></div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Advancing</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4ADE80' }}>{stocksUp} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>of {KNOWLEDGE_COMPANIES.length}</span></div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em' }}>My Holdings</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: myPosCount > 0 ? '#a5b4fc' : 'rgba(255,255,255,0.25)' }}>
            {myPosCount > 0 ? `₳${fmt(myPosValue)}` : '—'} {myPosCount > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{myPosCount} stocks</span>}
          </div>
        </div>
      </div>

      {/* News strip */}
      {marketNews.length > 0 && (
        <div style={{ background: 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '7px 16px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#D4AF37', letterSpacing: '.1em', flexShrink: 0 }}>NEWS</span>
          {marketNews.slice(0, 6).map(n => (
            <div key={n.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: n.impact > 0 ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)', borderRadius: 20, border: `1px solid ${n.impact > 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: n.impact > 0 ? '#4ADE80' : '#F87171' }}>{n.ticker || (n.sector || 'MKT').toUpperCase()}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.headline}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: n.impact > 0 ? '#4ADE80' : '#F87171' }}>{n.impact > 0 ? '+' : ''}{n.impact}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies or tickers…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none' }} />
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['all', 'sciences', 'maths', 'history', 'languages', 'arts'].map(s => (
            <button key={s} onClick={() => setSectorFilter(s)}
              style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 20, border: `1px solid ${sectorFilter === s ? (SECTOR_COLORS[s] || '#a5b4fc') + '55' : 'rgba(255,255,255,0.08)'}`, background: sectorFilter === s ? (SECTOR_COLORS[s] || '#a5b4fc') + '15' : 'transparent', color: sectorFilter === s ? (SECTOR_COLORS[s] || '#a5b4fc') : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['cap', 'P/E'], ['price', 'Price'], ['change', '24h'], ['rating', 'Rating']].map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)}
              style={{ flex: 1, padding: '5px', borderRadius: 8, border: `1px solid ${sortBy === k ? 'rgba(165,180,252,0.3)' : 'rgba(255,255,255,0.06)'}`, background: sortBy === k ? 'rgba(165,180,252,0.1)' : 'transparent', color: sortBy === k ? '#a5b4fc' : 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Stock rows */}
      <div style={{ padding: '0 16px 32px' }}>
        {filtered.map((co, i) => {
          const st = stockPriceState[co.ticker] || { price: co.basePrice, change24h: 0, history: [co.basePrice] }
          const isUp = st.change24h >= 0
          const upside = Math.round(((co.fundamentals.targetPrice - st.price) / st.price) * 100)
          const owned = stockPositions[co.ticker]
          const rColor = { 'STRONG BUY': '#4ADE80', BUY: '#86EFAC', HOLD: '#FCD34D', SELL: '#F87171' }[co.fundamentals.analystRating] || '#fff'
          return (
            <motion.div key={co.ticker} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(co)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', marginBottom: 7, background: owned ? co.color + '08' : 'rgba(255,255,255,0.03)', border: `1px solid ${owned ? co.color + '28' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              {owned && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: co.color, borderRadius: '4px 0 0 4px' }} />}
              <div style={{ width: 38, height: 38, borderRadius: 11, background: co.color + '18', border: `1px solid ${co.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{co.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{co.ticker}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 5, background: rColor + '18', color: rColor, border: `1px solid ${rColor}28` }}>{co.fundamentals.analystRating.replace('STRONG BUY', 'STR BUY')}</span>
                  {owned && <span style={{ fontSize: 9, color: co.color, fontWeight: 700 }}>{owned.shares}sh</span>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{co.name}</div>
                <div style={{ fontSize: 9, color: SECTOR_COLORS[co.sector], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {co.sector}{upside > 0 && <span style={{ color: '#4ADE80', marginLeft: 6 }}>+{upside}% upside</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37', letterSpacing: '-0.03em' }}>₳{st.price}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isUp ? '#4ADE80' : '#F87171', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{isUp ? '+' : ''}{st.change24h}%
                </div>
                <Sparkline data={st.history} color={isUp ? '#4ADE80' : '#F87171'} width={44} height={18} />
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <CompanyResearch company={selected} priceState={stockPriceState}
            position={stockPositions[selected.ticker] || null} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────────── */
const TABS = [
  { id: 'portfolio',  label: 'Portfolio',  icon: BarChart2 },
  { id: 'bonds',      label: 'Bonds',      icon: Layers },
  { id: 'etfs',       label: 'ETFs',       icon: Package },
  { id: 'syndicates', label: 'Syndicates', icon: Users },
  { id: 'players',     label: 'Players',     icon: Activity },
  { id: 'callstreet', label: 'Call St.',    icon: TrendingUp },
  { id: 'stocks',     label: 'Stocks',      icon: Activity },
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
          {tab === 'portfolio'  && <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PortfolioTab /></motion.div>}
          {tab === 'bonds'      && <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><BondsTab /></motion.div>}
          {tab === 'etfs'       && <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ETFsTab /></motion.div>}
          {tab === 'syndicates' && <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SyndicatesTab /></motion.div>}
          {tab === 'players'    && <motion.div key="pl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PlayersTab /></motion.div>}
          {tab === 'callstreet' && <motion.div key="cs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CallStreet /></motion.div>}
          {tab === 'stocks'     && <motion.div key="stocks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><StocksTab /></motion.div>}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
