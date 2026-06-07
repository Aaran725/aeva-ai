import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, FlaskConical, Camera, BookOpen, Zap, Trophy,
  ArrowRight, Star, Check, ChevronDown, ChevronUp,
  BarChart2, Map, Clock, Target,
} from 'lucide-react'
import AevaOrb from './AevaOrb'

/* ─── helpers ─── */
const clamp = (min, vw, max) => `clamp(${min}, ${vw}, ${max})`

/* ══════════════════════════════════════════════════════
   CHAT DEMO
══════════════════════════════════════════════════════ */
const CHAT_MESSAGES = [
  { role: 'user', text: 'I keep forgetting how photosynthesis works' },
  {
    role: 'ai', parts: [
      { type: 'plain', text: 'What happens to sunlight when it hits a leaf — take a guess.' },
    ],
  },
  { role: 'user', text: 'The plant absorbs it?' },
  {
    role: 'ai', parts: [
      { type: 'plain', text: 'Exactly — now ' },
      { type: 'bold', text: 'where' },
      { type: 'plain', text: ' does that energy actually go? What does the plant make with it?' },
    ],
  },
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '9px 13px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px 14px 14px 14px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.08)' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18 }}
          style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(139,143,255,0.85)' }} />
      ))}
    </div>
  )
}

function ChatDemo() {
  const [step, setStep] = useState(0)
  const timers = useRef([])

  const run = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setStep(0)
    const push = (fn, ms) => timers.current.push(setTimeout(fn, ms))
    // stagger messages: show, then typing dot, then next
    push(() => setStep(1), 400)
    push(() => setStep(2), 1600)
    push(() => setStep(3), 2700)
    push(() => setStep(4), 3800)
    push(() => setStep(5), 5200)
    push(() => setStep(6), 6600)
    push(() => run(), 11000)
  }

  useEffect(() => { run(); return () => timers.current.forEach(clearTimeout) }, [])

  const msg = (i) => CHAT_MESSAGES[i]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', height: '100%', justifyContent: 'flex-end' }}>
      <AnimatePresence>
        {/* msg 0 — user */}
        {step >= 1 && (
          <motion.div key="u0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, rgba(99,102,241,0.38), rgba(139,143,255,0.26))', border: '1px solid rgba(139,143,255,0.28)', borderRadius: '14px 14px 4px 14px', padding: '9px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.92)', maxWidth: '78%' }}>
            {msg(0).text}
          </motion.div>
        )}
        {step === 1 && <motion.div key="t0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TypingDots /></motion.div>}

        {/* msg 1 — ai */}
        {step >= 2 && (
          <motion.div key="a0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 14px 14px 14px', padding: '10px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.86)', maxWidth: '88%', lineHeight: 1.65 }}>
            {msg(1).parts.map((p, i) => p.type === 'bold' ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}
          </motion.div>
        )}
        {step === 2 && <motion.div key="t1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div style={{height:4}}/></motion.div>}

        {/* msg 2 — user */}
        {step >= 3 && (
          <motion.div key="u1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, rgba(99,102,241,0.38), rgba(139,143,255,0.26))', border: '1px solid rgba(139,143,255,0.28)', borderRadius: '14px 14px 4px 14px', padding: '9px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.92)', maxWidth: '78%' }}>
            {msg(2).text}
          </motion.div>
        )}
        {step === 3 && <motion.div key="t2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TypingDots /></motion.div>}

        {/* msg 3 — ai */}
        {step >= 4 && (
          <motion.div key="a1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 14px 14px 14px', padding: '10px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.86)', maxWidth: '88%', lineHeight: 1.65 }}>
            {msg(3).parts.map((p, i) => p.type === 'bold' ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}
          </motion.div>
        )}
        {/* drill pill */}
        {step >= 5 && (
          <motion.div key="pill" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ alignSelf: 'flex-start', background: 'rgba(139,143,255,0.14)', border: '1px solid rgba(139,143,255,0.30)', borderRadius: 20, padding: '7px 13px', fontSize: 12.5, color: 'rgba(200,200,255,0.9)' }}>
            🎯 Ready to drill this?
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   LAB DEMO (flashcard)
══════════════════════════════════════════════════════ */
const CARDS = [
  { q: 'What is the powerhouse of the cell?', a: 'Mitochondria — produces ATP via cellular respiration.' },
  { q: 'What is Newton\'s 2nd law?', a: 'F = ma — force equals mass times acceleration.' },
  { q: 'Define osmosis.', a: 'Movement of water from high to low concentration across a semi-permeable membrane.' },
]

function LabDemo() {
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'got' | 'missed'

  useEffect(() => {
    if (!flipped) return
    const t = setTimeout(() => {
      setFeedback(null)
      setFlipped(false)
      setCardIdx(i => (i + 1) % CARDS.length)
    }, 2200)
    return () => clearTimeout(t)
  }, [flipped, feedback])

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 1400)
    return () => clearTimeout(t)
  }, [cardIdx])

  const card = CARDS[cardIdx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      {/* Progress chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {CARDS.map((_, i) => (
          <div key={i} style={{ width: 28, height: 4, borderRadius: 2, background: i === cardIdx ? '#8B8FFF' : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Card */}
      <div style={{ width: '100%', position: 'relative', minHeight: 110 }}>
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div key={`q-${cardIdx}`}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '18px 16px', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.86)', lineHeight: 1.6, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.q}
            </motion.div>
          ) : (
            <motion.div key={`a-${cardIdx}`}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              style={{ background: 'rgba(139,143,255,0.10)', border: '1px solid rgba(139,143,255,0.25)', borderRadius: 16, padding: '18px 16px', textAlign: 'center', fontSize: 13.5, color: 'rgba(200,200,255,0.92)', lineHeight: 1.6, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.a}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => setFlipped(f => !f)}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.58)', cursor: 'pointer' }}>
          {flipped ? '← Question' : 'Reveal →'}
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => { setFeedback('got'); setFlipped(true) }}
          style={{ flex: 1, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)', borderRadius: 12, padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'rgba(134,239,172,0.9)', cursor: 'pointer', fontWeight: 600 }}>
          Got it ✓
        </motion.div>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
        Card {cardIdx + 1} of {CARDS.length} · Spaced repetition active
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   ROADMAP DEMO
══════════════════════════════════════════════════════ */
const RM_NODES = [
  { label: 'Cell Structure', status: 'complete', mins: 40 },
  { label: 'DNA & Replication', status: 'complete', mins: 55 },
  { label: 'Photosynthesis', status: 'active', mins: 60 },
  { label: 'Respiration', status: 'locked', mins: 50 },
  { label: 'Genetics', status: 'locked', mins: 65 },
]

function RoadmapDemo() {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (shown >= RM_NODES.length) return
    const t = setTimeout(() => setShown(n => n + 1), shown === 0 ? 300 : 500)
    return () => clearTimeout(t)
  }, [shown])

  useEffect(() => {
    // loop
    const t = setTimeout(() => setShown(0), 7000)
    return () => clearTimeout(t)
  }, [shown])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px', height: '100%', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        A-Level Biology · 14 days left
      </div>
      {RM_NODES.slice(0, shown).map((node, i) => (
        <motion.div key={node.label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: node.status === 'active' ? 'rgba(139,143,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${node.status === 'active' ? 'rgba(139,143,255,0.30)' : node.status === 'complete' ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: node.status === 'complete' ? 'rgba(74,222,128,0.15)' : node.status === 'active' ? 'rgba(139,143,255,0.20)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
            {node.status === 'complete' ? '✓' : node.status === 'active' ? '▶' : '○'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: node.status === 'locked' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)' }}>{node.label}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>{node.mins} min</div>
          </div>
          {node.status === 'active' && (
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ background: '#8B8FFF', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.04em' }}>
              NOW
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   DEMO TABS SECTION
══════════════════════════════════════════════════════ */
const DEMO_TABS = [
  { id: 'chat', label: '💬 Chat', desc: 'Socratic dialogue — she asks first', Component: ChatDemo },
  { id: 'lab',  label: '⚡ Lab',  desc: 'Spaced repetition drills',          Component: LabDemo },
  { id: 'path', label: '🗺 Roadmap', desc: 'Structured exam prep path',       Component: RoadmapDemo },
]

function DemoSection() {
  const [tab, setTab] = useState(0)

  return (
    <section style={{ padding: `${clamp('48px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 10 }}>LIVE PREVIEW</div>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          See how Aeva teaches
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.44)', maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
          Three tools that work together — not three separate apps.
        </p>
      </motion.div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
        {DEMO_TABS.map((t, i) => (
          <motion.button key={t.id} onClick={() => setTab(i)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 18px', borderRadius: 30, background: tab === i ? 'rgba(139,143,255,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${tab === i ? 'rgba(139,143,255,0.40)' : 'rgba(255,255,255,0.10)'}`, color: tab === i ? 'rgba(200,200,255,0.95)' : 'rgba(255,255,255,0.48)', fontSize: 14, fontWeight: tab === i ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {t.label}
          </motion.button>
        ))}
      </div>

      {/* Demo window */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ position: 'relative', maxWidth: 540, margin: '0 auto' }}>
        {/* Glow */}
        <div aria-hidden style={{ position: 'absolute', inset: -50, background: 'radial-gradient(circle at 50% 60%, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(5,6,26,0.94)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,143,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          {/* Window chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
              Aeva · {DEMO_TABS[tab].desc}
            </div>
          </div>

          <div style={{ minHeight: 280 }}>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ minHeight: 280 }}>
                {(() => { const C = DEMO_TABS[tab].Component; return <C /> })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   STATS BAR
══════════════════════════════════════════════════════ */
const STATS = [
  { value: '7', label: 'drill modes' },
  { value: '24/7', label: 'always available' },
  { value: 'Any', label: 'subject or level' },
  { value: 'Free', label: 'to start' },
]

function StatsBar() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      style={{ maxWidth: 900, margin: '0 auto 0', padding: `0 ${clamp('20px','5vw','80px')}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ padding: '22px 20px', textAlign: 'center', background: 'rgba(8,9,26,0.9)', position: 'relative' }}>
            {i > 0 && <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: 1, background: 'rgba(255,255,255,0.07)' }} />}
            <div style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════ */
const TESTIMONIALS = [
  {
    quote: "I went from a D to a B in A-Level Chemistry in 8 weeks. My actual tutor wasn't asking me questions like Aeva does — she just explains until it sticks.",
    name: 'Alex M.',
    tag: 'A-Level Chemistry',
    stars: 5,
  },
  {
    quote: "The spaced repetition drills are genuinely addictive. I do them on the bus and my GCSE Maths grade has jumped two levels since January.",
    name: 'Priya K.',
    tag: 'GCSE Mathematics',
    stars: 5,
  },
  {
    quote: "My parents pay £60/hr for a tutor. Aeva asks better questions and she's free. I use both now but Aeva is where I actually understand things.",
    name: 'Jordan T.',
    tag: 'SAT Prep',
    stars: 5,
  },
]

function TestimonialsSection() {
  return (
    <section style={{ padding: `${clamp('50px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 10 }}>STUDENT RESULTS</div>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: 0 }}>
          Real students, real grades
        </h2>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(t.stars)].map((_, j) => <Star key={j} size={13} fill="#F59E0B" color="#F59E0B" />)}
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 1.72, margin: 0, fontStyle: 'italic' }}>
              "{t.quote}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,143,255,0.20))', border: '1px solid rgba(139,143,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(200,200,255,0.85)' }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.80)' }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.36)', marginTop: 1 }}>{t.tag}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   FEATURES GRID
══════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: Brain,       title: 'Socratic Tutor',   desc: 'Aeva asks before she tells — diagnosing gaps, building understanding layer by layer, then stress-testing you.', color: '#8B8FFF', bg: 'rgba(139,143,255,0.10)' },
  { icon: FlaskConical,title: 'Practice Labs',     desc: '7 drill modes including flashcards, speed rounds, Feynman technique, mock tests, and fill-the-gap exercises.', color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { icon: Map,         title: 'Exam Roadmaps',     desc: 'AI-generated study plans with timed topics, exam countdowns, and progress tracking built for any qualification.', color: '#F97316', bg: 'rgba(249,115,22,0.10)' },
  { icon: Camera,      title: 'Aeva Lens',         desc: 'Point your camera at any problem — Aeva reads it, identifies the topic, and walks you through a full solution.', color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
  { icon: Zap,         title: 'Spaced Repetition', desc: 'Science-backed scheduling built in. Aeva tracks every card you miss and brings it back at exactly the right time.', color: '#EC4899', bg: 'rgba(236,72,153,0.10)' },
  { icon: Trophy,      title: 'Mission Mode',      desc: 'Gamified study sessions — debate arenas, timed chaos missions, and match games that make revision feel different.', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
]

function FeaturesSection() {
  return (
    <section style={{ padding: `${clamp('50px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 10 }}>EVERYTHING YOU NEED</div>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          One app. Every tool.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.44)', maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
          Built around how memory actually works — not around how content is usually delivered.
        </p>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: i * 0.07 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <f.icon size={20} color={f.color} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.68 }}>{f.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   COMPARISON TABLE
══════════════════════════════════════════════════════ */
const COMPARE_ROWS = [
  { label: 'Adapts to your level',          aeva: true,  tutor: true,  yt: false, book: false },
  { label: 'Diagnoses your gaps',           aeva: true,  tutor: true,  yt: false, book: false },
  { label: 'Available 24/7',               aeva: true,  tutor: false, yt: true,  book: true  },
  { label: 'Spaced repetition drills',     aeva: true,  tutor: false, yt: false, book: false },
  { label: 'Structured exam roadmap',      aeva: true,  tutor: '±',   yt: false, book: false },
  { label: 'Free to start',               aeva: true,  tutor: false, yt: true,  book: false },
]

const COMPARE_COLS = ['Aeva', 'Private Tutor', 'YouTube', 'Textbook']

function ComparisonSection() {
  const tick = (v) => {
    if (v === true) return <span style={{ color: '#4ADE80', fontWeight: 700 }}>✓</span>
    if (v === false) return <span style={{ color: 'rgba(255,255,255,0.22)' }}>–</span>
    return <span style={{ color: '#FBBF24', fontSize: 13 }}>±</span>
  }

  return (
    <section style={{ padding: `${clamp('50px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 10 }}>THE HONEST COMPARISON</div>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: 0 }}>
          How Aeva stacks up
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.40)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontFamily: 'inherit', fontWeight: 'normal' }}>Feature</th>
              {COMPARE_COLS.map((col, i) => (
                <th key={col} style={{ padding: '14px 18px', textAlign: 'center', fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? 'rgba(200,200,255,0.94)' : 'rgba(255,255,255,0.48)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: i === 0 ? 'rgba(139,143,255,0.08)' : 'transparent', fontFamily: 'inherit' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, ri) => (
              <tr key={row.label}>
                <td style={{ padding: '13px 18px', fontSize: 14, color: 'rgba(255,255,255,0.68)', borderBottom: ri < COMPARE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontFamily: 'inherit' }}>{row.label}</td>
                {[row.aeva, row.tutor, row.yt, row.book].map((v, ci) => (
                  <td key={ci} style={{ padding: '13px 18px', textAlign: 'center', fontSize: 16, borderBottom: ri < COMPARE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: ci === 0 ? 'rgba(139,143,255,0.05)' : 'transparent', fontFamily: 'inherit' }}>
                    {tick(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════════════════ */
const STEPS = [
  { n: '01', emoji: '💬', title: 'Tell Aeva your topic', desc: 'Type any subject, paste a question, or snap a photo. Aeva instantly calibrates to your level and exam.' },
  { n: '02', emoji: '🧠', title: 'She diagnoses your gaps', desc: 'Through Socratic questions, Aeva pinpoints exactly what you know and builds understanding layer by layer.' },
  { n: '03', emoji: '⚡', title: 'Drill until it sticks', desc: 'AI flashcards, speed rounds, Feynman mode — scheduled by spaced repetition so nothing slips through.' },
]

function HowItWorksSection() {
  return (
    <section style={{ padding: `${clamp('50px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 10 }}>THE PROCESS</div>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: 0 }}>
          How Aeva teaches
        </h2>
      </motion.div>
      <div style={{ display: 'flex', gap: 'clamp(16px,3vw,32px)', flexWrap: 'wrap', justifyContent: 'center' }}>
        {STEPS.map((s, i) => (
          <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: i * 0.12 }}
            style={{ flex: 1, minWidth: 240, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', paddingTop: 8 }}>
            {i < STEPS.length - 1 && (
              <div aria-hidden style={{ position: 'absolute', top: 28, left: 'calc(100% + 16px)', width: 'clamp(0px,3vw,32px)', height: 1, background: 'rgba(255,255,255,0.10)' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 15, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,143,255,0.15))', border: '1px solid rgba(139,143,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {s.emoji}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(139,143,255,0.65)', letterSpacing: '0.08em' }}>{s.n}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.46)', lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════════════ */
const FAQ_ITEMS = [
  { q: 'What subjects and exams does Aeva cover?', a: 'Every subject — Maths, Sciences, History, Literature, Economics, Languages, and more. Aeva works for GCSE, A-Level, IB, SAT, ACT, university modules, professional certs, and beyond. Just tell her what you\'re studying.' },
  { q: 'How is this different from ChatGPT?', a: 'ChatGPT answers. Aeva teaches. She asks before she tells, diagnoses why you\'re stuck, tracks your progress across sessions, and schedules review with spaced repetition. ChatGPT has none of that.' },
  { q: 'What is spaced repetition and why does it matter?', a: 'Spaced repetition is the most evidence-backed memory technique in existence. Instead of reviewing everything every day, Aeva shows you each concept exactly when you\'re about to forget it — so you spend less time studying and remember more.' },
  { q: 'Is Aeva free?', a: 'Yes, completely free to start. Create an account, start chatting, run drills, build a roadmap — no credit card, no trial period.' },
  { q: 'Can I use it on my phone?', a: 'Yes. Aeva works in any mobile browser and can be installed as an app from Chrome or Safari (Add to Home Screen). Full mobile experience, no App Store needed.' },
]

function FAQSection() {
  const [open, setOpen] = useState(null)

  return (
    <section style={{ padding: `${clamp('50px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 780, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 10 }}>FAQ</div>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: 0 }}>
          Common questions
        </h2>
      </motion.div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQ_ITEMS.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${open === i ? 'rgba(139,143,255,0.28)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,255,255,0.86)', lineHeight: 1.4 }}>{item.q}</span>
              {open === i ? <ChevronUp size={16} color="rgba(139,143,255,0.7)" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />}
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}>
                  <p style={{ padding: '0 20px 18px', fontSize: 14, color: 'rgba(255,255,255,0.54)', lineHeight: 1.72, margin: 0 }}>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════════════════════ */
export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: '#08091a',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: 'rgba(255,255,255,0.88)',
      overflowX: 'hidden',
    }}>
      {/* ── Background glows ── */}
      <div aria-hidden style={{ position: 'fixed', top: '5%', left: '8%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.18) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', bottom: '10%', right: '6%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.10) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', top: '45%', right: '18%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,143,255,0.07) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Navbar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${clamp('20px','5vw','80px')}`, height: 64, background: 'rgba(8,9,26,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={14} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.04em' }}>aeva</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign in
          </motion.button>
          <motion.button onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.35)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Get started
          </motion.button>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        <section style={{ padding: `${clamp('64px','11vh','110px')} ${clamp('20px','5vw','80px')} ${clamp('40px','6vh','70px')}`, display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', maxWidth: 1100, margin: '0 auto' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.28)', borderRadius: 20, padding: '5px 12px', width: 'fit-content', fontSize: 12, color: 'rgba(200,200,255,0.88)', fontWeight: 600, letterSpacing: '0.03em' }}>
              <motion.span animate={{ opacity: [1,0.4,1] }} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B8FFF', display: 'inline-block' }} />
              AI-POWERED LEARNING
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
              style={{ fontSize: clamp('36px','5.2vw','60px'), fontWeight: 900, color: 'rgba(255,255,255,0.96)', lineHeight: 1.10, letterSpacing: '-0.04em', margin: 0 }}>
              Stop rereading.{' '}
              <br />
              <span style={{ background: 'linear-gradient(135deg, #8B8FFF 20%, #E9A364 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Start understanding.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}
              style={{ fontSize: 17, color: 'rgba(255,255,255,0.50)', lineHeight: 1.72, margin: 0, maxWidth: 460 }}>
              Aeva diagnoses exactly where your understanding breaks down — then fixes it with Socratic teaching, spaced-repetition drills, and structured exam roadmaps.
            </motion.p>

            {/* Exam badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['GCSE', 'A-Level', 'IB', 'SAT', 'University', 'Any subject'].map(t => (
                <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{t}</span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <motion.button onClick={onGetStarted} whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(99,102,241,0.40)' }} whileTap={{ scale: 0.97 }}
                style={{ padding: '13px 26px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                Start for free <ArrowRight size={16} />
              </motion.button>
              <motion.button onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: '13px 22px', borderRadius: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign in
              </motion.button>
            </motion.div>

            {/* Trust */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 1 }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}
              </div>
              {['No credit card', 'Free to start', 'Works offline'].map((t, i) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'rgba(255,255,255,0.36)' }}>
                  {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 4 }}>·</span>}
                  <Check size={11} color="#4ADE80" strokeWidth={2.5} />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — Orb */}
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <div aria-hidden style={{ position: 'absolute', inset: -60, background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
              <AevaOrb size={260} />
            </div>
          </motion.div>
        </section>

        {/* ── Stats bar ── */}
        <StatsBar />

        {/* ── Demo ── */}
        <DemoSection />

        {/* ── Testimonials ── */}
        <TestimonialsSection />

        {/* ── Features ── */}
        <FeaturesSection />

        {/* ── Comparison ── */}
        <ComparisonSection />

        {/* ── How it works ── */}
        <HowItWorksSection />

        {/* ── FAQ ── */}
        <FAQSection />

        {/* ── Final CTA ── */}
        <section style={{ padding: `${clamp('60px','8vh','90px')} ${clamp('20px','5vw','80px')}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 28, padding: `${clamp('36px','5vw','56px')} ${clamp('28px','5vw','64px')}`, maxWidth: 640, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase' }}>FREE TO START</div>
            <h2 style={{ fontSize: clamp('24px','3.5vw','36px'), fontWeight: 900, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.18 }}>
              Ready to actually understand<br />what you're studying?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.44)', lineHeight: 1.68, margin: 0 }}>
              Join students who stopped rereading and started really learning.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['No credit card', 'Free to start', 'Any subject or exam'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>
                  <Check size={12} color="#4ADE80" strokeWidth={2.5} />
                  {t}
                </div>
              ))}
            </div>
            <motion.button onClick={onGetStarted} whileHover={{ scale: 1.03, boxShadow: '0 10px 35px rgba(99,102,241,0.45)' }} whileTap={{ scale: 0.97 }}
              style={{ padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 9, position: 'relative', zIndex: 1 }}>
              Start learning free <ArrowRight size={17} />
            </motion.button>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ padding: `24px ${clamp('20px','5vw','80px')}`, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={11} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.03em' }}>aeva</span>
          </div>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.22)' }}>Built for students who actually want to understand.</span>
        </footer>

      </div>
    </div>
  )
}
