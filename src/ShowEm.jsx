import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Zap, Flame, Brain, BookOpen, TrendingUp, Award, Printer, MessageSquare, Layers, Send, Loader } from 'lucide-react'
import { useNeuralStore } from './neuralStore'
import { useXPStore, ORBS, levelFromXP, xpIntoLevel } from './xpStore'
import { useBrainStore, masteryColor, masteryLabel, SUBJECT_COLORS } from './brainStore'
import { useArcadeStore } from './arcadeStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cap(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function StatCard({ icon, value, label, accent = '#8B8FFF' }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #EDEDF5',
      borderRadius: 18,
      padding: '22px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      boxShadow: '0 2px 16px rgba(99,102,241,0.06)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <span style={{ fontSize: 30, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ height: 2, width: 24, background: 'linear-gradient(90deg, #6366F1, #8B8FFF)', borderRadius: 2 }} />
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366F1' }}>{children}</span>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

// ─── Parent Q&A Chat ──────────────────────────────────────────────────────────

function buildParentSystemPrompt({ name, level, xp, streak, masteredTopics, struggleZones,
  learningStyleLocked, dominantStyle, STYLE_NAMES, brainStats, totalExchanges, profileTitle }) {
  return `You are Aeva, an AI tutor. A parent is asking about their child ${name}'s learning progress.
You have the following data about ${name}:
- Profile title: ${profileTitle}
- Level ${level} | ${xp} total XP | ${streak}-day streak
- ${totalExchanges} tutoring exchanges completed
- ${brainStats.total} concepts explored, ${brainStats.mastered} mastered
- Learning style: ${learningStyleLocked ? STYLE_NAMES[dominantStyle] : 'still calibrating'}
- Mastered topics: ${masteredTopics.slice(0, 10).join(', ') || 'none yet'}
- Areas needing work: ${struggleZones.slice(0, 5).join(', ') || 'none identified yet'}

Answer the parent's question warmly and helpfully. Be honest, specific, and supportive. Keep answers to 2-4 sentences. Reference the actual data above when relevant. Use the child's first name (${name.split(' ')[0]}).`
}

async function callGroqParent(systemPrompt, history) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      max_tokens: 220,
      temperature: 0.65,
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || "I don't have enough data to answer that yet."
}

const PARENT_CHIPS = [
  "How is my child progressing overall?",
  "What can I do at home to help?",
  "What should we focus on next?",
  "Why are they struggling with certain topics?",
]

function ParentQA({ name, systemPromptData }) {
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [history])

  const send = async (msg) => {
    const text = (msg || input).trim()
    if (!text || thinking) return
    setInput('')
    setStarted(true)
    const userMsg = { role: 'user', content: text }
    const newHistory = [...history, userMsg]
    setHistory(newHistory)
    setThinking(true)
    try {
      const sysPrompt = buildParentSystemPrompt(systemPromptData)
      const reply = await callGroqParent(sysPrompt, newHistory)
      setHistory(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setHistory(prev => [...prev, { role: 'assistant', content: "Something went wrong. Please try again." }])
    }
    setThinking(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #EDEDF5', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 20px rgba(99,102,241,0.07)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #EDEDF5', background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={13} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.02em' }}>Ask Aeva</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Questions about {name.split(' ')[0]}'s progress</div>
          </div>
        </div>
      </div>

      {/* Suggestion chips */}
      {!started && (
        <div style={{ padding: '14px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PARENT_CHIPS.map(chip => (
            <motion.button
              key={chip}
              whileHover={{ scale: 1.02, background: 'rgba(99,102,241,0.12)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => send(chip)}
              style={{
                fontSize: 12, fontWeight: 600, color: '#6366F1',
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.22)',
                borderRadius: 99, padding: '6px 13px', cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {chip}
            </motion.button>
          ))}
        </div>
      )}

      {/* Messages */}
      {history.length > 0 && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
          {history.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#F3F4F6',
                color: msg.role === 'user' ? '#fff' : '#374151',
                fontSize: 13, fontWeight: 500, lineHeight: 1.55,
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ display: 'flex', gap: 5, padding: '6px 14px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }}
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px 14px', borderTop: history.length > 0 ? '1px solid #F3F4F6' : 'none' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 99, padding: '8px 8px 8px 14px' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Ask a question about your child's progress…"
            disabled={thinking}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: '#374151', fontFamily: "'Inter', system-ui, sans-serif" }}
          />
          <motion.button
            whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, cursor: input.trim() && !thinking ? 'pointer' : 'default',
              background: input.trim() && !thinking ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#E5E7EB',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {thinking ? <Loader size={13} color="#9CA3AF" /> : <Send size={13} color={input.trim() ? '#fff' : '#9CA3AF'} />}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Parents({ onClose, name = 'Your student' }) {
  const printRef = useRef(null)

  // ─── Data ──────────────────────────────────────────────────────────────────
  const {
    masteredTopics, dominantTopics, struggleZones, totalExchanges,
    learningStyle, learningStyleTotal, learningStyleLocked,
    orbPersonality, traits, profileTitle, currentVibe,
  } = useNeuralStore()

  const { xp, streak, activeOrb, unlockedOrbs } = useXPStore()
  const { nodes, getStats } = useBrainStore()
  const { worldMemory } = useArcadeStore()

  const level       = levelFromXP(xp)
  const xpPct       = xpIntoLevel(xp)
  const brainStats  = getStats()
  const activeOrbDef = ORBS.find(o => o.id === activeOrb) || ORBS[0]

  // Top concepts by mastery
  const topConcepts = [...nodes]
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 12)

  // Subject breakdown
  const subjectMap = {}
  nodes.forEach(n => {
    if (!subjectMap[n.subject]) subjectMap[n.subject] = []
    subjectMap[n.subject].push(n)
  })
  const subjects = Object.entries(subjectMap)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)

  // Learning style dominant
  const DIMS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const STYLE_NAMES = {
    analogical:   'Analogy Thinker',
    visual:       'Visual Learner',
    structural:   'Systems Builder',
    exampleFirst: 'Concrete Learner',
    conceptual:   'Principle Seeker',
  }
  const STYLE_DESC = {
    analogical:   'Understands new ideas by connecting them to things they already know. Strong intuitive grasp.',
    visual:       'Builds mental pictures and diagrams. Excels with spatial and visual information.',
    structural:   'Learns by understanding how systems fit together. Great at seeing the big picture.',
    exampleFirst: 'Needs concrete examples before abstractions click. Strong practical understanding.',
    conceptual:   'Goes straight for the underlying principle. Loves asking "but why?"',
  }
  const dominantStyle = DIMS.reduce((best, d) => ((learningStyle[d] || 0) > (learningStyle[best] || 0) ? d : best), DIMS[0])
  const calibration   = Math.min(100, Math.round((learningStyleTotal / 15) * 100))

  // Session history from world memory
  const lastSession = worldMemory?.lastTutorSession

  // Orb personality description
  const ORB_PARENT_DESC = {
    balanced:   'Warm and encouraging — Aeva meets them where they are.',
    challenger: 'High-standards mode — Aeva pushes them to think harder.',
    scholar:    'Deep-dive mode — precise, thorough, no shortcuts.',
    mystic:     'Metaphor & analogy mode — makes abstract ideas tangible.',
    void:       'Socratic mode — Aeva only asks questions, never gives answers.',
    ember:      'High-energy mode — passionate, fast-paced learning.',
    aurora:     'Creative connections — joins ideas across different subjects.',
    phantom:    'Independent thinking mode — hints only, they figure it out.',
  }

  const handlePrint = () => window.print()

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,15,35,0.72)',
        backdropFilter: 'blur(16px)',
        overflowY: 'auto',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Scrollable content wrapper */}
      <div
        ref={printRef}
        style={{
          maxWidth: 780,
          margin: '0 auto',
          padding: '32px 20px 60px',
        }}
      >

        {/* ── Toolbar (hidden on print) ────────────────────────────── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={12} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.03em' }}>aeva</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.80)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              <Printer size={13} /> Print / Save PDF
            </motion.button>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} />
            </motion.button>
          </div>
        </div>

        {/* ── Report card ──────────────────────────────────────────── */}
        <div style={{
          background: '#F8F7FF',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        }}>

          {/* Header — full redesign */}
          <div style={{
            background: 'linear-gradient(160deg, #1e2070 0%, #2D308E 40%, #4a4ec7 75%, #7c7fff 100%)',
            padding: '48px 40px 40px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative orbs */}
            <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,143,255,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', bottom: -40, left: -20, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', top: '40%', right: '20%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

            {/* Top label row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                Aeva Parents Report
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
                {today}
              </span>
            </div>

            {/* Name — large */}
            <h1 style={{
              fontSize: 'clamp(32px, 6vw, 52px)',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              margin: '0 0 10px',
            }}>
              {name}
            </h1>

            {/* Profile title */}
            <p style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.60)',
              margin: '0 0 28px',
              letterSpacing: '-0.01em',
            }}>
              {profileTitle}
            </p>

            {/* Key numbers strip — CSS grid, always 4 equal columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              background: 'rgba(0,0,0,0.22)',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.10)',
              marginBottom: 24,
            }}>
              {[
                { val: `${level}`,                    sub: 'level'           },
                { val: `${streak}`,                   sub: 'day streak'      },
                { val: `${xp}`,                       sub: 'total XP'        },
                { val: `${masteredTopics.length}`,    sub: 'mastered'        },
              ].map((item, i, arr) => (
                <div key={i} style={{
                  padding: '16px 12px',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {item.val}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.40)', marginTop: 4, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* XP progress bar */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Level {level}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Level {level + 1}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0.70), rgba(255,255,255,0.95))', borderRadius: 3 }} />
              </div>
            </div>

            {/* Trait badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {traits.slice(0, 4).map((t, i) => (
                <span key={i} style={{
                  fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.80)',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 99, padding: '5px 13px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {t.icon} {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── Stat grid — exactly 4 equal columns, always balanced ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatCard icon={<MessageSquare size={18} color="#6366F1" />} value={totalExchanges}   label="Exchanges"    accent="#6366F1" />
              <StatCard icon={<Layers        size={18} color="#8B5CF6" />} value={brainStats.total} label="Concepts"     accent="#8B5CF6" />
              <StatCard icon={<Award         size={18} color="#10B981" />} value={brainStats.mastered} label="Mastered"  accent="#10B981" />
              <StatCard icon={<TrendingUp    size={18} color="#F59E0B" />} value={brainStats.thisWeek} label="This Week" accent="#F59E0B" />
            </div>

            {/* ── What they're mastering ───────────────────────────── */}
            {topConcepts.length > 0 && (
              <div>
                <SectionLabel>What They're Mastering</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topConcepts.slice(0, 8).map((node, i) => {
                    const col = masteryColor(node.mastery)
                    return (
                      <div key={node.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cap(node.concept)}
                        </span>
                        <div style={{ width: 120, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${node.mastery}%`, background: col, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: col, minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                          {masteryLabel(node.mastery)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Subject chips */}
                {subjects.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {subjects.map(([subject, nodes]) => {
                      const sc = SUBJECT_COLORS[subject] || SUBJECT_COLORS.General
                      return (
                        <span key={subject} style={{
                          fontSize: 11.5, fontWeight: 700,
                          background: sc.bg, border: `1px solid ${sc.border}`,
                          color: sc.color, borderRadius: 99, padding: '3px 10px',
                        }}>
                          {subject} · {nodes.length}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── How they learn best ──────────────────────────────── */}
            <div>
              <SectionLabel>How They Learn Best</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* Fingerprint card */}
                <div style={{ background: '#fff', border: '1.5px solid #EDEDF5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(99,102,241,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Brain size={16} color="#6366F1" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>
                      {learningStyleLocked ? STYLE_NAMES[dominantStyle] : 'Still Calibrating'}
                    </span>
                    {learningStyleLocked && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, padding: '1px 7px' }}>
                        Confirmed
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.55, margin: 0 }}>
                    {learningStyleLocked
                      ? STYLE_DESC[dominantStyle]
                      : `Aeva is still learning how ${name} thinks best. ${calibration}% calibrated so far — more sessions will sharpen this.`
                    }
                  </p>
                  {calibration > 0 && !learningStyleLocked && (
                    <div style={{ marginTop: 10, height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${calibration}%`, background: 'linear-gradient(90deg, #6366F1, #8B8FFF)', borderRadius: 2 }} />
                    </div>
                  )}
                </div>

                {/* Orb/teaching style card */}
                <div style={{ background: '#fff', border: '1.5px solid #EDEDF5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(99,102,241,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: activeOrbDef.gradient, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{activeOrbDef.name} Mode</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.55, margin: 0 }}>
                    {ORB_PARENT_DESC[activeOrb] || ORB_PARENT_DESC.balanced}
                  </p>
                  <div style={{ marginTop: 10, fontSize: 11.5, color: '#9CA3AF' }}>
                    {unlockedOrbs.length} of 8 teaching styles unlocked
                  </div>
                </div>
              </div>
            </div>

            {/* ── Topics mastered list ─────────────────────────────── */}
            {masteredTopics.length > 0 && (
              <div>
                <SectionLabel>Topics They've Mastered</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {masteredTopics.map((t, i) => (
                    <span key={i} style={{
                      fontSize: 12.5, fontWeight: 600,
                      background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)',
                      color: '#059669', borderRadius: 99, padding: '4px 12px',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      ✓ {cap(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Last session summary ─────────────────────────────── */}
            {lastSession && (
              <div>
                <SectionLabel>Last Session</SectionLabel>
                <div style={{ background: '#fff', border: '1.5px solid #EDEDF5', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(99,102,241,0.05)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                        {formatDate(lastSession.date)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
                        {cap(lastSession.primaryTopic) || 'General Session'}
                      </div>
                      {lastSession.topics?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {lastSession.topics.map((t, i) => (
                            <span key={i} style={{ fontSize: 11.5, color: '#6366F1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)', borderRadius: 99, padding: '2px 9px', fontWeight: 600 }}>
                              {cap(t)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#6366F1', letterSpacing: '-0.03em' }}>{lastSession.exchanges || 0}</div>
                        <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600 }}>exchanges</div>
                      </div>
                      {lastSession.mastered?.length > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981', letterSpacing: '-0.03em' }}>{lastSession.mastered.length}</div>
                          <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600 }}>mastered</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Struggle zones (only if exists, framed constructively) ── */}
            {struggleZones.length > 0 && (
              <div>
                <SectionLabel>Areas To Focus On</SectionLabel>
                <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 16, padding: '16px 20px' }}>
                  <p style={{ fontSize: 12.5, color: '#92400E', margin: '0 0 10px', lineHeight: 1.5 }}>
                    Aeva has flagged these topics as needing more practice. This is completely normal — it means {name} is being challenged at the right level.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {struggleZones.slice(0, 5).map((t, i) => (
                      <span key={i} style={{ fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', color: '#B45309', borderRadius: 99, padding: '3px 10px' }}>
                        {cap(t)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Parent Q&A ───────────────────────────────────────── */}
            <div className="no-print">
              <SectionLabel>Ask Aeva a Question</SectionLabel>
              <ParentQA
                name={name}
                systemPromptData={{
                  name, level, xp, streak, masteredTopics, struggleZones,
                  learningStyleLocked, dominantStyle, STYLE_NAMES,
                  brainStats, totalExchanges, profileTitle,
                }}
              />
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div style={{
              marginTop: 8,
              paddingTop: 20,
              borderTop: '1.5px solid #EDEDF5',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={10} color="white" fill="white" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', letterSpacing: '-0.02em' }}>
                  Generated by <span style={{ color: '#6366F1' }}>Aeva AI</span>
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: '#D1D5DB' }}>{today}</span>
            </div>

          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </motion.div>
  )
}
