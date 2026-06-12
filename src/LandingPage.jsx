import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, FlaskConical, BookOpen, Zap, Trophy,
  ArrowRight, Star, Check, ChevronDown, ChevronUp,
  Map, GraduationCap, Dumbbell, Lock, Camera,
} from 'lucide-react'

/* ─── helpers ─── */
const clamp = (min, vw, max) => `clamp(${min}, ${vw}, ${max})`

/* ══════════════════════════════════════════════════════
   ROADMAP PREVIEW
══════════════════════════════════════════════════════ */
const RM_LANES = [
  {
    phase: 'Foundation', color: '#818CF8',
    nodes: [
      { topic: 'Algebra Basics',  status: 'complete',  type: 'learn' },
      { topic: 'Functions',       status: 'complete',  type: 'learn' },
    ],
  },
  {
    phase: 'Core Topics', color: '#60A5FA',
    nodes: [
      { topic: 'Differentiation', status: 'complete',  type: 'learn' },
      { topic: 'Chain Rule',      status: 'available', type: 'learn' },
      { topic: 'Integration',     status: 'locked',    type: 'drill' },
    ],
  },
  {
    phase: 'Practice', color: '#34D399',
    nodes: [
      { topic: 'Mixed Drills',    status: 'locked',    type: 'drill' },
      { topic: 'Past Papers',     status: 'locked',    type: 'check' },
    ],
  },
  {
    phase: 'Exam Prep', color: '#F59E0B',
    nodes: [
      { topic: 'Exam Technique',  status: 'locked',    type: 'learn' },
      { topic: 'Mock Test 1',     status: 'locked',    type: 'mock'  },
    ],
  },
]

function RmNode({ node, laneColor }) {
  const isComplete  = node.status === 'complete'
  const isAvailable = node.status === 'available'
  const isMock      = node.type === 'mock'
  const r = isAvailable ? 22 : isComplete ? 17 : 13

  const bg = isComplete  ? 'linear-gradient(180deg,#86EFAC 0%,#22C55E 55%,#15803D 100%)'
           : isAvailable ? `linear-gradient(180deg,${laneColor}dd 0%,${laneColor} 55%,${laneColor}99 100%)`
           :               'linear-gradient(180deg,#4B5563 0%,#374151 55%,#1F2937 100%)'

  const shadow = isComplete  ? '0 4px 0 #166534, 0 6px 16px rgba(34,197,94,0.30)'
               : isAvailable ? `0 4px 0 ${laneColor}88, 0 6px 18px ${laneColor}44`
               :               '0 2px 0 #111827'

  const NodeIcon = node.type === 'drill' ? Dumbbell : node.type === 'mock' ? FlaskConical : GraduationCap

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <div style={{ position: 'relative', width: r * 2, height: r * 2 }}>
        {isAvailable && (
          <motion.div animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.22, 1] }} transition={{ duration: 2.1, repeat: Infinity }}
            style={{ position: 'absolute', inset: -10, borderRadius: isMock ? 8 : '50%', background: `radial-gradient(circle, ${laneColor}55 0%, transparent 70%)`, pointerEvents: 'none' }} />
        )}
        <div style={{
          width: r * 2, height: r * 2,
          borderRadius: isMock ? Math.max(4, r * 0.25) : '50%',
          transform: isMock ? 'rotate(45deg)' : undefined,
          background: bg, boxShadow: shadow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: (!isComplete && !isAvailable) ? 0.40 : 1,
        }}>
          <div style={{ transform: isMock ? 'rotate(-45deg)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isComplete  ? <Check size={Math.round(r * 0.84)} color="#fff" strokeWidth={3} />
           : isAvailable ? <NodeIcon size={Math.round(r * 0.74)} color="#fff" strokeWidth={2.2} />
           :               <Lock size={Math.round(r * 0.68)} color="rgba(255,255,255,0.38)" strokeWidth={2} />}
          </div>
        </div>
        {isAvailable && (
          <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ position: 'absolute', top: r * 2 + 4, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', padding: '1px 5px', borderRadius: 99, background: `${laneColor}22`, border: `1px solid ${laneColor}55`, fontSize: 6.5, fontWeight: 800, color: laneColor, letterSpacing: '0.08em' }}>
            NOW
          </motion.div>
        )}
      </div>
      <span style={{ fontSize: 9, fontWeight: isAvailable ? 700 : 500, color: isComplete ? '#4ADE80' : isAvailable ? '#fff' : 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap', letterSpacing: '-0.01em', marginTop: isAvailable ? 10 : 2 }}>
        {node.topic}
      </span>
    </div>
  )
}

function RoadmapPreview({ compact }) {
  const totalNodes    = RM_LANES.reduce((s, l) => s + l.nodes.length, 0)
  const completeNodes = RM_LANES.reduce((s, l) => s + l.nodes.filter(n => n.status === 'complete').length, 0)
  const pct           = Math.round((completeNodes / totalNodes) * 100)

  return (
    <div style={{ width: '100%', maxWidth: compact ? 380 : 430 }}>
      <div style={{
        background: 'rgba(8,9,24,0.92)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 28px 72px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#F87171','#FBBF24','#4ADE80'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
            📚 A-Level Mathematics · 47 days left
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', fontWeight: 600 }}>{pct}%</div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg,#6366F1,#8B5CF6,#A78BFA)' }} />
        </div>
        <div style={{ padding: '10px 6px 14px' }}>
          {RM_LANES.map((lane, li) => (
            <div key={lane.phase} style={{ display: 'flex', alignItems: 'center', marginBottom: li < RM_LANES.length - 1 ? 2 : 0 }}>
              <div style={{ width: 72, flexShrink: 0, padding: '18px 8px 18px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: lane.color }} />
                <span style={{ fontSize: 7.5, fontWeight: 800, color: lane.color, letterSpacing: '0.10em', textTransform: 'uppercase', lineHeight: 1.3 }}>{lane.phase}</span>
              </div>
              <div style={{ width: 1, height: 56, background: 'rgba(255,255,255,0.07)', flexShrink: 0, marginRight: 14 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, padding: '8px 0' }}>
                {lane.nodes.map((node, ni) => (
                  <>
                    <RmNode key={node.topic} node={node} laneColor={lane.color} />
                    {ni < lane.nodes.length - 1 && (
                      <div key={`l-${ni}`} style={{ height: 1.5, flex: 1, maxWidth: 24, background: node.status === 'complete' ? 'rgba(74,222,128,0.45)' : 'rgba(255,255,255,0.10)', borderRadius: 1, flexShrink: 0 }} />
                    )}
                  </>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{completeNodes}/{totalNodes} nodes complete</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#60A5FA' }}>
            <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            Chain Rule — up next
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CHAT DEMO (hero right + features)
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
        {step >= 1 && (
          <motion.div key="u0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, rgba(99,102,241,0.38), rgba(139,143,255,0.26))', border: '1px solid rgba(139,143,255,0.28)', borderRadius: '14px 14px 4px 14px', padding: '9px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.92)', maxWidth: '78%' }}>
            {msg(0).text}
          </motion.div>
        )}
        {step === 1 && <motion.div key="t0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TypingDots /></motion.div>}
        {step >= 2 && (
          <motion.div key="a0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 14px 14px 14px', padding: '10px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.86)', maxWidth: '88%', lineHeight: 1.65 }}>
            {msg(1).parts.map((p, i) => p.type === 'bold' ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}
          </motion.div>
        )}
        {step >= 3 && (
          <motion.div key="u1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, rgba(99,102,241,0.38), rgba(139,143,255,0.26))', border: '1px solid rgba(139,143,255,0.28)', borderRadius: '14px 14px 4px 14px', padding: '9px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.92)', maxWidth: '78%' }}>
            {msg(2).text}
          </motion.div>
        )}
        {step === 3 && <motion.div key="t2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TypingDots /></motion.div>}
        {step >= 4 && (
          <motion.div key="a1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 14px 14px 14px', padding: '10px 13px', fontSize: 13.5, color: 'rgba(255,255,255,0.86)', maxWidth: '88%', lineHeight: 1.65 }}>
            {msg(3).parts.map((p, i) => p.type === 'bold' ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}
          </motion.div>
        )}
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
   LAB DEMO (flashcard — used in features)
══════════════════════════════════════════════════════ */
const CARDS = [
  { q: 'What is the powerhouse of the cell?', a: 'Mitochondria — produces ATP via cellular respiration.' },
  { q: "What is Newton's 2nd law?",           a: 'F = ma — force equals mass times acceleration.'        },
  { q: 'Define osmosis.',                      a: 'Movement of water from high to low concentration across a semi-permeable membrane.' },
]

function LabDemo() {
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (!flipped) return
    const t = setTimeout(() => { setFlipped(false); setCardIdx(i => (i + 1) % CARDS.length) }, 2200)
    return () => clearTimeout(t)
  }, [flipped])

  const card = CARDS[cardIdx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {CARDS.map((_, i) => (
          <div key={i} style={{ width: 28, height: 4, borderRadius: 2, background: i === cardIdx ? '#8B8FFF' : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ width: '100%', position: 'relative', minHeight: 110 }}>
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div key={`q-${cardIdx}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '18px 16px', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.86)', lineHeight: 1.6, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.q}
            </motion.div>
          ) : (
            <motion.div key={`a-${cardIdx}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              style={{ background: 'rgba(139,143,255,0.10)', border: '1px solid rgba(139,143,255,0.25)', borderRadius: 16, padding: '18px 16px', textAlign: 'center', fontSize: 13.5, color: 'rgba(200,200,255,0.92)', lineHeight: 1.6, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.a}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setFlipped(f => !f)}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.58)', cursor: 'pointer' }}>
          {flipped ? '← Question' : 'Reveal →'}
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setFlipped(true)}
          style={{ flex: 1, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)', borderRadius: 12, padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'rgba(134,239,172,0.9)', cursor: 'pointer', fontWeight: 600 }}>
          Got it ✓
        </motion.div>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>Card {cardIdx + 1} of {CARDS.length} · Spaced repetition active</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SOCRATIC MOMENT SECTION  (Phase 3 — replaces How It Works)
══════════════════════════════════════════════════════ */
function SocraticMomentSection() {
  return (
    <section style={{ padding: `${clamp('70px','10vh','110px')} ${clamp('20px','5vw','80px')}`, position: 'relative', overflow: 'hidden' }}>
      {/* ambient glow */}
      <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: clamp('28px','4vw','48px'), fontWeight: 900, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.08 }}>
            Most AI tutors answer.<br />
            <span style={{ background: 'linear-gradient(135deg, #8B8FFF 20%, #E9A364 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Aeva makes you think.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.44)', maxWidth: 480, margin: '0 auto', lineHeight: 1.68 }}>
            Same question. Two completely different approaches to learning.
          </p>
        </motion.div>

        {/* The question */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 30, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 14, color: 'rgba(255,255,255,0.68)', fontStyle: 'italic' }}>
            "Explain the chain rule in calculus"
          </div>
        </motion.div>

        {/* Side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* ChatGPT — greyed out, wall of text */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>⊕</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Generic AI</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
              {/* fade overlay */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to bottom, transparent, rgba(8,9,26,0.97))', zIndex: 2, borderRadius: '0 0 18px 18px' }} />
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.8 }}>
                <p style={{ margin: '0 0 10px' }}>The chain rule is a formula for differentiating composite functions. If you have a function h(x) = f(g(x)), then the derivative is:</p>
                <p style={{ margin: '0 0 10px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: 6 }}>h'(x) = f'(g(x)) · g'(x)</p>
                <p style={{ margin: '0 0 10px' }}>In other words, you differentiate the outer function while leaving the inner function alone, then multiply by the derivative of the inner function. For example, if h(x) = sin(x²), then...</p>
                <p style={{ margin: 0, opacity: 0.5 }}>...the outer function is sin(u) with derivative cos(u), and the inner function is x²...</p>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.25)', marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
              You read it. You think you get it.<br />Two hours later it's gone.
            </p>
          </motion.div>

          {/* Aeva — asks first */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #3D40A8, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>a</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(200,202,255,0.90)' }}>Aeva</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(139,143,255,0.15)', border: '1px solid rgba(139,143,255,0.30)', color: 'rgba(200,200,255,0.75)', fontWeight: 600 }}>asks first</span>
            </div>
            <div style={{ background: 'rgba(139,143,255,0.06)', border: '1px solid rgba(139,143,255,0.22)', borderRadius: 18, padding: '20px 22px', boxShadow: '0 8px 32px rgba(99,102,241,0.12)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Aeva response bubble */}
                <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '4px 14px 14px 14px', padding: '12px 14px', fontSize: 13.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.7 }}>
                  Before I explain — when you differentiate x³ by itself, what do you get? Just take a guess.
                </div>
                {/* Hint at what comes next */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>your answer shapes what comes next</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                {/* Three paths */}
                {[
                  { text: '"3x²"',         label: 'builds from what you know',    color: '#4ADE80' },
                  { text: '"I\'m not sure"', label: 'starts from first principles', color: '#FBBF24' },
                  { text: 'any answer',     label: 'she never just tells you',     color: '#818CF8' },
                ].map(p => (
                  <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)' }}>
                      <strong style={{ color: 'rgba(255,255,255,0.78)' }}>{p.text}</strong> → {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(139,143,255,0.70)', marginTop: 12, lineHeight: 1.5, textAlign: 'center', fontWeight: 500 }}>
              You built the understanding yourself.<br />That's why it stays.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   ROADMAP SECTION  (Phase 5 — dedicated section)
══════════════════════════════════════════════════════ */
function RoadmapSection({ onGetStarted }) {
  return (
    <section style={{ padding: `${clamp('60px','9vh','100px')} ${clamp('20px','5vw','80px')}`, background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>
        {/* Left */}
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
          style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 style={{ fontSize: clamp('26px','3.8vw','44px'), fontWeight: 900, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
            Built for your exact exam.<br />
            <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 600, fontSize: '0.72em' }}>Not a generic study plan.</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.48)', lineHeight: 1.72, margin: 0, maxWidth: 400 }}>
            Tell Aeva your exam date and target grade. She builds your entire node-by-node study path in 90 seconds — Foundation through Exam Prep, paced to your deadline.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Every topic your syllabus covers',
              'Learn → Drill → Check progression built in',
              'Adapts live as you complete nodes',
              'Works for 40+ exams across every subject',
            ].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.58)' }}>
                <Check size={14} color="#4ADE80" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                {t}
              </div>
            ))}
          </div>
          <motion.button onClick={onGetStarted} whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' }} whileTap={{ scale: 0.97 }}
            style={{ padding: '13px 24px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
            Build my roadmap <ArrowRight size={15} />
          </motion.button>
        </motion.div>

        {/* Right */}
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.1 }}
          style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <RoadmapPreview />
        </motion.div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   TESTIMONIALS  (Phase 4 — with grade pills)
══════════════════════════════════════════════════════ */
const TESTIMONIALS = [
  {
    quote: "I went from a D to a B in A-Level Chemistry in 8 weeks. My actual tutor wasn't asking me questions like Aeva does — she just explains until it sticks.",
    name: 'Alex M.',
    meta: 'A-Level Chemistry (AQA) · 2024',
    pill: 'D → B',
    pillColor: '#4ADE80',
    pillBg: 'rgba(74,222,128,0.12)',
  },
  {
    quote: "The spaced repetition drills are genuinely addictive. I do them on the bus and my GCSE Maths grade has jumped two levels since January.",
    name: 'Priya K.',
    meta: 'GCSE Mathematics · 2024',
    pill: '+2 grades',
    pillColor: '#60A5FA',
    pillBg: 'rgba(96,165,250,0.12)',
  },
  {
    quote: "My parents pay £60/hr for a tutor. Aeva asks better questions and she's free. I use both now but Aeva is where I actually understand things.",
    name: 'Jordan T.',
    meta: 'SAT Prep · 2024',
    pill: '£60/hr → free',
    pillColor: '#FBBF24',
    pillBg: 'rgba(251,191,36,0.12)',
  },
]

function TestimonialsSection() {
  return (
    <section style={{ padding: `${clamp('60px','8vh','90px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ marginBottom: 44 }}>
        <h2 style={{ fontSize: clamp('26px','3.5vw','40px'), fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: 0 }}>
          Students who stopped rereading
        </h2>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Grade pill — prominent at top */}
            <div style={{ display: 'inline-flex', width: 'fit-content', padding: '5px 14px', borderRadius: 99, background: t.pillBg, border: `1px solid ${t.pillColor}30`, fontSize: 13, fontWeight: 800, color: t.pillColor, letterSpacing: '-0.01em' }}>
              {t.pill}
            </div>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.74, margin: 0, flex: 1 }}>
              "{t.quote}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${t.pillColor}40, ${t.pillColor}18)`, border: `1px solid ${t.pillColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontWeight: 800, color: t.pillColor, flexShrink: 0 }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{t.meta}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   FEATURES — 3 deep with live previews  (Phase 6)
══════════════════════════════════════════════════════ */
const FEATURE_EXTRAS = ['Aeva Lens', 'Spaced Repetition', 'Mission Mode', 'Study With Me', 'Mirror Analytics', 'Debate Arena']

function FeaturesSection() {
  const features = [
    {
      label: 'She teaches by asking',
      desc: 'Aeva diagnoses what you don\'t know by asking — then builds your understanding layer by layer before you ever see an answer.',
      color: '#8B8FFF',
      preview: <ChatDemo />,
    },
    {
      label: 'Drills that actually stick',
      desc: 'Flashcards, speed rounds, Feynman mode. Scheduled by spaced repetition so Aeva brings each card back exactly when you\'re about to forget it.',
      color: '#34D399',
      preview: <LabDemo />,
    },
    {
      label: 'Your roadmap, 90 seconds',
      desc: 'Give Aeva your exam and deadline. She builds the entire Learn → Drill → Mock path, then adapts it live as you progress.',
      color: '#60A5FA',
      preview: (
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <RoadmapPreview compact />
        </div>
      ),
    },
  ]

  return (
    <section style={{ padding: `${clamp('60px','8vh','90px')} ${clamp('20px','5vw','80px')}`, maxWidth: 1200, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: clamp('26px','3.5vw','40px'), fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: '0 0 12px' }}>
          The tools that actually work
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.40)', margin: 0, maxWidth: 460, lineHeight: 1.65 }}>
          Built around how memory actually forms — not how content is usually delivered.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18, marginBottom: 24 }}>
        {features.map((f, i) => (
          <motion.div key={f.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }} transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Preview window */}
            <div style={{ height: 280, background: 'rgba(5,6,22,0.8)', borderBottom: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0 }}>{f.preview}</div>
            </div>
            {/* Label */}
            <div style={{ padding: '18px 20px 20px' }}>
              <div style={{ width: 28, height: 3, borderRadius: 99, background: f.color, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', marginBottom: 7, letterSpacing: '-0.02em' }}>{f.label}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.44)', lineHeight: 1.68 }}>{f.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Extra features — chip row */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 500, marginRight: 4 }}>Also:</span>
        {FEATURE_EXTRAS.map(f => (
          <span key={f} style={{ fontSize: 12.5, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>{f}</span>
        ))}
      </motion.div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════════════ */
const FAQ_ITEMS = [
  { q: 'How is this different from ChatGPT?', a: 'ChatGPT answers. Aeva teaches. She asks before she tells, diagnoses why you\'re stuck, tracks your progress across sessions, and schedules review with spaced repetition. ChatGPT has none of that.' },
  { q: 'What subjects and exams does Aeva cover?', a: 'Every subject — Maths, Sciences, History, Literature, Economics, Languages, and more. Aeva works for GCSE, A-Level, IB, SAT, ACT, university modules, professional certs, and beyond. Just tell her what you\'re studying.' },
  { q: 'What is spaced repetition and why does it matter?', a: 'Spaced repetition is the most evidence-backed memory technique in existence. Instead of reviewing everything every day, Aeva shows you each concept exactly when you\'re about to forget it — so you spend less time studying and remember more.' },
  { q: 'Is Aeva free?', a: 'Yes, completely free to start. Create an account, start chatting, run drills, build a roadmap — no credit card, no trial period.' },
  { q: 'Can I use it on my phone?', a: 'Yes. Aeva works in any mobile browser and can be installed as an app from Chrome or Safari (Add to Home Screen). Full mobile experience, no App Store needed.' },
]

function FAQSection() {
  const [open, setOpen] = useState(null)
  return (
    <section style={{ padding: `${clamp('50px','7vh','80px')} ${clamp('20px','5vw','80px')}`, maxWidth: 780, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ marginBottom: 44 }}>
        <h2 style={{ fontSize: clamp('26px','3.5vw','38px'), fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: 0 }}>
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
      {/* Background glows */}
      <div aria-hidden style={{ position: 'fixed', top: '5%', left: '8%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.18) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', bottom: '10%', right: '6%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.08) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
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

        {/* ── HERO ── */}
        <section style={{ padding: `${clamp('64px','11vh','110px')} ${clamp('20px','5vw','80px')} ${clamp('48px','7vh','80px')}`, display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', maxWidth: 1160, margin: '0 auto' }}>
          {/* Left */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
              style={{ fontSize: clamp('38px','5.5vw','64px'), fontWeight: 900, color: 'rgba(255,255,255,0.97)', lineHeight: 1.06, letterSpacing: '-0.05em', margin: 0 }}>
              ChatGPT answers.{' '}
              <br />
              <span style={{ background: 'linear-gradient(135deg, #8B8FFF 20%, #E9A364 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Aeva teaches.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
              style={{ fontSize: 17, color: 'rgba(255,255,255,0.48)', lineHeight: 1.72, margin: 0, maxWidth: 430 }}>
              Ask about differentiation. Aeva doesn't explain — she asks what you already know. That question is where the learning starts.
            </motion.p>

            {/* Exam chips */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['GCSE', 'A-Level', 'IB', 'SAT', 'University', 'Any subject'].map(t => (
                <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>{t}</span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.26 }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <motion.button onClick={onGetStarted} whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(99,102,241,0.40)' }} whileTap={{ scale: 0.97 }}
                style={{ padding: '14px 28px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                Start for free <ArrowRight size={16} />
              </motion.button>
              <motion.button onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: '14px 22px', borderRadius: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign in
              </motion.button>
            </motion.div>

            {/* Social proof pull-quote */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 14, maxWidth: 420 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#4ADE80', flexShrink: 0 }}>A</div>
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '0 0 4px', fontStyle: 'italic' }}>
                  "D to B in A-Level Chemistry in 8 weeks."
                </p>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)' }}>Alex M. · A-Level Chemistry 2024</span>
              </div>
            </motion.div>

            {/* Trust */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }}
              style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {['No credit card', 'Free to start', 'Works offline'].map((t, i) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'rgba(255,255,255,0.34)' }}>
                  <Check size={11} color="#4ADE80" strokeWidth={2.5} />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — live chat demo */}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.1 }}
            style={{ flex: '1 1 340px', maxWidth: 480 }}>
            <div style={{ position: 'relative' }}>
              <div aria-hidden style={{ position: 'absolute', inset: -40, background: 'radial-gradient(circle at 50% 55%, rgba(99,102,241,0.16) 0%, transparent 70%)', filter: 'blur(28px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', background: 'rgba(5,6,26,0.94)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(139,143,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                {/* Window chrome */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
                    Aeva · Socratic tutor
                  </div>
                </div>
                <div style={{ minHeight: 300 }}>
                  <ChatDemo />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── STATS ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ maxWidth: 820, margin: '0 auto', padding: `0 ${clamp('20px','5vw','80px')} ${clamp('40px','5vh','60px')}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
            {[
              { value: '3,000+',  label: 'students using Aeva'      },
              { value: '40+',     label: 'exams covered'            },
              { value: 'Free',    label: 'forever to start'         },
              { value: '24 / 7',  label: 'no appointment needed'    },
            ].map((s, i) => (
              <div key={i} style={{ padding: '22px 20px', textAlign: 'center', background: 'rgba(8,9,26,0.90)', position: 'relative' }}>
                {i > 0 && <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: 1, background: 'rgba(255,255,255,0.07)' }} />}
                <div style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── SOCRATIC MOMENT ── */}
        <SocraticMomentSection />

        {/* ── ROADMAP ── */}
        <RoadmapSection onGetStarted={onGetStarted} />

        {/* ── TESTIMONIALS ── */}
        <TestimonialsSection />

        {/* ── FEATURES ── */}
        <FeaturesSection />

        {/* ── FAQ ── */}
        <FAQSection />

        {/* ── FINAL CTA ── */}
        <section style={{ padding: `${clamp('60px','8vh','90px')} ${clamp('20px','5vw','80px')}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 28, padding: `${clamp('36px','5vw','56px')} ${clamp('28px','5vw','64px')}`, maxWidth: 640, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <h2 style={{ fontSize: clamp('24px','3.5vw','38px'), fontWeight: 900, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1.12, position: 'relative', zIndex: 1 }}>
              Your exam is coming.<br />Let's make every day count.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.42)', lineHeight: 1.68, margin: 0, position: 'relative', zIndex: 1 }}>
              Sign up in 30 seconds. Aeva builds your roadmap before you finish your first cup of tea.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              {['No credit card', 'Free to start', 'Any subject or exam'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.46)' }}>
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

      </div>
    </div>
  )
}
