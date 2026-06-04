import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, RotateCcw, Check, ChevronRight, Zap, Calendar, TrendingUp } from 'lucide-react'
import { useNeuralStore } from './neuralStore'
import { useSRStore } from './srStore'

function masteryColor(mastery) {
  if (mastery >= 80) return '#10B981'
  if (mastery >= 55) return '#F59E0B'
  if (mastery >= 35) return '#EF4444'
  return 'rgba(255,255,255,0.08)'
}
function masteryLabel(mastery) {
  if (mastery >= 80) return 'Mastered'
  if (mastery >= 55) return 'Learning'
  if (mastery >= 35) return 'Struggling'
  return 'Unexplored'
}

const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
const HEX_W = 68
const HEX_H = 76
const COLS = 6

const LEGEND = [
  { color: '#10B981', label: 'Mastered' },
  { color: '#F59E0B', label: 'Learning' },
  { color: '#EF4444', label: 'Struggling' },
  { color: 'rgba(255,255,255,0.35)', label: 'Unexplored' },
]

/* ── Hex cell ─────────────────────────────────────────── */
function HexCell({ concept, index, onHover, isHovered }) {
  const color = masteryColor(concept.mastery)
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 320, damping: 22 }}
      style={{ position: 'relative', width: HEX_W, height: HEX_H, flexShrink: 0 }}
      onMouseEnter={() => onHover(concept)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        whileHover={{ scale: 1.18 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{ width: '100%', height: '100%', clipPath: HEX_CLIP, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', position: 'relative', overflow: 'hidden' }}
      >
        {concept.visits > 1 && (
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            style={{ position: 'absolute', inset: 0, clipPath: HEX_CLIP, background: `radial-gradient(ellipse at 50% 50%, ${color}80 0%, transparent 70%)` }}
          />
        )}
        <span style={{ fontSize: 8.5, fontWeight: 700, color: concept.mastery >= 35 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '0 5px', lineHeight: 1.2, maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none' }}>
          {concept.label}
        </span>
      </motion.div>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.14 }}
            style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(8,10,30,0.96)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 12px', zIndex: 10, whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif", pointerEvents: 'none' }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 2, textTransform: 'capitalize' }}>{concept.label}</div>
            <div style={{ fontSize: 11, color: masteryColor(concept.mastery), fontWeight: 600 }}>{masteryLabel(concept.mastery)} · {concept.mastery}%</div>
            {concept.visits > 1 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{concept.visits} visits</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Review session card ──────────────────────────────── */
function ReviewSession({ cards, onDone }) {
  const { recordCard } = useSRStore()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([]) // { card, result }
  const [done, setDone] = useState(false)

  const card = cards[idx]
  const got = results.filter(r => r.result === 'got').length
  const missed = results.filter(r => r.result === 'missed').length

  const answer = (result) => {
    recordCard(card.topic, card.front, card.back, result)
    const next = [...results, { card, result }]
    setResults(next)
    if (idx + 1 >= cards.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  if (done) {
    const pct = Math.round((got / cards.length) * 100)
    return (
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px' }}>
        {/* Score ring */}
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none"
              stroke={pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.03em' }}>{pct}%</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>recalled</span>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {pct >= 80 ? 'Excellent session! 🔥' : pct >= 50 ? 'Good work, keep going' : 'Keep reviewing — it will stick'}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>{got} remembered · {missed} to revisit</div>
        </div>

        {/* Per-card breakdown */}
        {missed > 0 && (
          <div style={{ width: '100%', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Needs more review</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {results.filter(r => r.result === 'missed').map((r, i) => (
                <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.4 }}>
                  <span style={{ color: '#FCA5A5', fontWeight: 600 }}>{r.card.front}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}> → </span>
                  <span>{r.card.back}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onDone}
          style={{ padding: '13px 32px', borderRadius: 14, background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(99,102,241,0.40)', color: '#A5B4FC', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Palace
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, padding: '0 4px' }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${(idx / cards.length) * 100}%` }} transition={{ duration: 0.35 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6366F1, #A78BFA)' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.40)', flexShrink: 0 }}>{idx + 1}/{cards.length}</span>
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {card.topic}
      </div>

      {/* Flip card */}
      <motion.div
        onClick={() => !flipped && setFlipped(true)}
        style={{ flex: 1, minHeight: 220, position: 'relative', cursor: flipped ? 'default' : 'pointer', perspective: 1200 }}
      >
        {/* Front */}
        <AnimatePresence initial={false} mode="wait">
          {!flipped ? (
            <motion.div key="front"
              initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.28 }}
              style={{ position: 'absolute', inset: 0, borderRadius: 22, background: 'rgba(99,102,241,0.10)', border: '1.5px solid rgba(99,102,241,0.30)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '24px 28px' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(165,180,252,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Question</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.94)', textAlign: 'center', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{card.front}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(165,180,252,0.40)' }} />
                <span style={{ fontSize: 11.5, color: 'rgba(165,180,252,0.50)', fontWeight: 600 }}>Tap to reveal</span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="back"
              initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.28 }}
              style={{ position: 'absolute', inset: 0, borderRadius: 22, background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 28px' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(52,211,153,0.60)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Answer</div>
              <div style={{ fontSize: 16.5, fontWeight: 600, color: 'rgba(255,255,255,0.90)', textAlign: 'center', lineHeight: 1.6 }}>{card.back}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Got it / Missed it buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => answer('missed')}
              style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.35)', color: '#FCA5A5', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <RotateCcw size={14} /> Not yet
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => answer('got')}
              style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: 'rgba(16,185,129,0.14)', border: '1.5px solid rgba(16,185,129,0.40)', color: '#6EE7B7', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Check size={14} /> Got it!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main component ───────────────────────────────────── */
export default function MemoryPalace({ onClose }) {
  const { conceptMap } = useNeuralStore()
  const { getDueCards, getDueCount, getTopicStats, cards: allCards } = useSRStore()
  const [tab, setTab] = useState('palace') // 'palace' | 'review'
  const [hoveredConcept, setHoveredConcept] = useState(null)
  const [reviewCards, setReviewCards] = useState(null) // null = not started
  const [reviewDone, setReviewDone] = useState(false)

  const dueCount = getDueCount()
  const dueCards = getDueCards()
  const topicStats = getTopicStats()

  const displayConcepts = [...conceptMap].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 42)
  const rows = []
  for (let i = 0; i < displayConcepts.length; i += COLS) rows.push(displayConcepts.slice(i, i + COLS))

  const startReview = () => {
    setReviewCards(dueCards.slice(0, 20)) // cap at 20 per session
    setReviewDone(false)
    setTab('review')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(4,6,20,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.88, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 28 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', borderRadius: 32, background: 'rgba(8,10,28,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 80px rgba(0,0,0,0.60)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={16} color="#818CF8" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.03em' }}>Memory Palace</h2>
                <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                  {conceptMap.length} concept{conceptMap.length !== 1 ? 's' : ''} · {allCards.length} card{allCards.length !== 1 ? 's' : ''} stored
                </p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </motion.button>
          </div>

          {/* Due cards banner */}
          {dueCount > 0 && tab === 'palace' && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 14, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Zap size={15} color="#FCD34D" />
                </motion.div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D' }}>
                  {dueCount} card{dueCount !== 1 ? 's' : ''} due for review
                </span>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={startReview}
                style={{ padding: '7px 14px', borderRadius: 9, background: 'rgba(245,158,11,0.22)', border: '1px solid rgba(245,158,11,0.40)', color: '#FCD34D', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                Review now <ChevronRight size={12} />
              </motion.button>
            </motion.div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {[
              { icon: Brain, label: 'Concepts', value: conceptMap.length, color: '#818CF8' },
              { icon: Calendar, label: 'Cards due', value: dueCount, color: dueCount > 0 ? '#F59E0B' : '#10B981' },
              { icon: TrendingUp, label: 'Total cards', value: allCards.length, color: '#60A5FA' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 2 }}>
            {['palace', 'review'].map(t => (
              <motion.button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, background: tab === t ? 'rgba(99,102,241,0.28)' : 'transparent', border: tab === t ? '1px solid rgba(99,102,241,0.40)' : '1px solid transparent', color: tab === t ? '#A5B4FC' : 'rgba(255,255,255,0.40)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s', position: 'relative' }}>
                {t === 'palace' ? 'Knowledge Map' : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Review
                    {dueCount > 0 && <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F59E0B', color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dueCount > 9 ? '9+' : dueCount}</span>}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            {tab === 'palace' ? (
              <motion.div key="palace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {displayConcepts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.4 }}>🧠</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 320 }}>
                      Chat with Aeva to build your palace. Every concept you explore appears here.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {rows.map((row, rowIdx) => (
                        <div key={rowIdx} style={{ display: 'flex', gap: 5, marginLeft: rowIdx % 2 === 1 ? 34 : 0 }}>
                          {row.map((concept, colIdx) => (
                            <HexCell key={concept.id} concept={concept} index={rowIdx * COLS + colIdx}
                              onHover={setHoveredConcept} isHovered={hoveredConcept?.id === concept.id} />
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      {LEGEND.map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 10, height: 10, clipPath: HEX_CLIP, background: item.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Per-topic card breakdown */}
                    {topicStats.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>Cards by topic</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {topicStats.slice(0, 6).map(s => (
                            <div key={s.topic} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.68)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic}</span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{s.total} card{s.total !== 1 ? 's' : ''}</span>
                              <div style={{ display: 'flex', gap: 2 }}>
                                {[...Array(Math.min(s.avgStreak, 5))].map((_, i) => (
                                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!reviewCards ? (
                  // Review start screen
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
                    {dueCount === 0 ? (
                      <>
                        <div style={{ fontSize: 40 }}>✅</div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', marginBottom: 6 }}>All caught up!</div>
                          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>No cards due right now.<br />Complete flashcard drills in the Lab to add cards.</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Zap size={32} color="#FCD34D" />
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', marginBottom: 6 }}>
                            {dueCount} card{dueCount !== 1 ? 's' : ''} ready to review
                          </div>
                          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                            Based on when you last studied them, these are due now.
                            <br />Each card uses spaced repetition — cards you know well come back less often.
                          </div>
                        </div>
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                          onClick={startReview}
                          style={{ padding: '14px 36px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.28))', border: '1.5px solid rgba(99,102,241,0.50)', color: '#C4B5FD', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
                          Start Review Session →
                        </motion.button>
                      </>
                    )}
                  </div>
                ) : (
                  <ReviewSession cards={reviewCards} onDone={() => { setReviewCards(null) }} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
