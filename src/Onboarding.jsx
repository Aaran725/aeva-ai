import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import AevaOrb from './AevaOrb'
import { useXPStore, ORBS } from './xpStore'

// ─── Teaching style → orb mapping ────────────────────────────────────────────
// We show 3 personality archetypes at onboarding (simpler than all 8 orbs)
// Each maps to an actual orb ID

const STYLES = [
  {
    id: 'supportive',
    orbId: 'balanced',
    emoji: '🌱',
    title: 'Encouraging',
    sub: 'Meet me where I am. Build my confidence.',
    desc: 'Aeva adapts to your pace. She explains clearly, celebrates progress, and never makes you feel behind.',
  },
  {
    id: 'challenging',
    orbId: 'challenger',
    emoji: '⚡',
    title: 'Push me hard',
    sub: 'No hand-holding. Raise the bar.',
    desc: 'Aeva holds you to a higher standard. Direct, demanding, and completely focused on making you genuinely good.',
  },
  {
    id: 'precise',
    orbId: 'scholar',
    emoji: '🔬',
    title: 'Deep and precise',
    sub: 'I want to understand the why, not just the what.',
    desc: 'Aeva goes deeper. Formal, thorough, and focused on real understanding — not just passing tests.',
  },
]

// ─── Aeva's opening line — specific to teaching style + subject ───────────────
function getOpener(styleId, subject) {
  const sub = subject || 'your subject'

  const openers = {
    supportive: {
      default:           `${sub}. Before we start — tell me one thing you've tried to learn before but it never quite stuck. That's where we'll begin.`,
      Mathematics:       "Maths is one of those subjects where there's a huge gap between 'sort of getting it' and actually getting it. What's a topic you've passed a test on but still don't feel confident about?",
      Sciences:          "Science makes so much more sense when you understand the 'why' behind facts. What's a concept that still feels fuzzy, even after studying it?",
      History:           "History isn't about memorising dates — it's about understanding why things happened. What's a period or event you find genuinely hard to get your head around?",
      Languages:         "Language learning works best when it's personal. What's the part of learning a language you find most frustrating — grammar, vocabulary, speaking, or something else?",
      'Computer Science':"Code is easier when you know why it works, not just how. What's a concept in computer science you've used before but couldn't explain to someone else?",
      Business:          "Business is about decisions. Tell me — what's a business concept that sounds simple but you're not sure you fully understand?",
      Law:               "Law is about applying principles to situations. What's an area of law you find genuinely confusing — where the rules don't quite make sense to you yet?",
    },
    challenging: {
      default:           `${sub}. Which concept have you been avoiding? Not the hardest one — the one you keep skipping past. We're starting there.`,
      Mathematics:       "Maths. Good. Pick the concept you keep avoiding. Not the hardest — the one you always skip. We're starting there, right now.",
      Sciences:          "Science. Which topic are you weakest on? Don't say 'I'm okay at everything' — nobody is. What's yours?",
      History:           "History. Pick an event you think you understand. I'm going to ask you to explain it from three different perspectives. Go.",
      Languages:         "Language. What's the one part you keep making the same mistake in? Stop practising the stuff you're already good at.",
      'Computer Science':"Computer Science. What's the last thing you built? If you haven't built anything yet — that's the first problem we're solving.",
      Business:          "Business. Most people learn business theory and can't apply any of it. What's a real decision — career, financial, anything — you're currently unsure about?",
      Law:               "Law. Recite the last legal principle you studied. In plain English. No jargon. If you can't, you don't understand it yet.",
    },
    precise: {
      default:           `Let's establish your foundation. In ${sub}, what's the most recent concept you understood procedurally — you could do the steps — but didn't understand the reason behind it?`,
      Mathematics:       "Let's be precise. What's the most recent maths concept where you understood the procedure but not the reason behind it? That gap is what we'll close.",
      Sciences:          "Precision first. In science, a lot of students memorise models without understanding what the model is actually modelling. Which model do you use without fully understanding it?",
      History:           "Historiography matters. When you study a historical event, do you typically consider primary sources, or do you rely on textbook interpretations? What's the difference, and why does it matter?",
      Languages:         "Language acquisition has specific mechanisms. Are you aware of the input hypothesis? Do you know what comprehensible input means and how it applies to your learning?",
      'Computer Science':"Let's establish foundations. What's the difference between a compiled and interpreted language, and how does that affect runtime behaviour? Answer as precisely as you can.",
      Business:          "Business frameworks only work if you understand their assumptions. Take Porter's Five Forces — what are its limitations, and when does it break down as an analytical tool?",
      Law:               "Legal reasoning requires precision. What's the difference between the ratio decidendi and obiter dicta of a judgment, and why does that distinction matter in common law systems?",
    },
  }

  const styleOpeners = openers[styleId] || openers.supportive
  return styleOpeners[subject] || styleOpeners.default
}

// ─── Step 0: Cinematic arrival ────────────────────────────────────────────────
function StepArrival({ onNext }) {
  const [phase, setPhase] = useState(0) // 0=orb, 1=name, 2=tagline, 3=cta

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, textAlign: 'center', padding: '40px 0 32px' }}
    >
      {/* Orb */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        style={{ marginBottom: 28 }}
      >
        <AevaOrb size={140} active personality="balanced" />
      </motion.div>

      {/* Brand */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: 12 }}
          >
            <span style={{
              fontSize: 42, fontWeight: 900, letterSpacing: '-0.06em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(233,163,100,0.75) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              aeva
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tagline */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 300 }}
          >
            The AI tutor that actually teaches you to think.
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.03, boxShadow: '0 10px 36px rgba(99,102,241,0.45)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            style={{
              padding: '14px 36px', borderRadius: 14,
              background: 'linear-gradient(135deg, #3D40A8, #5558D4)',
              border: '1px solid rgba(139,143,255,0.40)',
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            Get started <ArrowRight size={17} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Step 1: Name ─────────────────────────────────────────────────────────────
function StepName({ value, onChange, onNext }) {
  return (
    <motion.div
      key="name"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', margin: '0 0 14px' }}>
          First things first
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.1 }}>
          What's your name?
        </h2>
        <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
          Aeva will use it to personalise everything.
        </p>
      </div>

      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onNext() }}
        placeholder="Your name..."
        style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 18, fontFamily: 'inherit', outline: 'none',
          width: '100%', boxSizing: 'border-box',
          letterSpacing: '-0.01em',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(139,143,255,0.50)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'}
      />

      <motion.button
        whileHover={value.trim() ? { scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' } : {}}
        whileTap={value.trim() ? { scale: 0.97 } : {}}
        onClick={() => value.trim() && onNext()}
        style={{
          padding: '14px', borderRadius: 13,
          background: value.trim() ? 'linear-gradient(135deg, #3D40A8, #5558D4)' : 'rgba(255,255,255,0.06)',
          border: value.trim() ? '1px solid rgba(139,143,255,0.40)' : '1px solid rgba(255,255,255,0.08)',
          color: value.trim() ? 'white' : 'rgba(255,255,255,0.25)',
          fontSize: 15, fontWeight: 700, cursor: value.trim() ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        Continue <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

// ─── Step 2: Teaching style (orb selection) ───────────────────────────────────
function StepStyle({ name, selected, onSelect, onNext }) {
  const firstName = name?.split(' ')[0] || 'there'

  return (
    <motion.div
      key="style"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', margin: '0 0 14px' }}>
          Choose your Aeva
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.15 }}>
          How should Aeva teach you,<br />{firstName}?
        </h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', margin: 0 }}>
          You can change this any time.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STYLES.map((style) => {
          const orbDef = ORBS.find(o => o.id === style.orbId) || ORBS[0]
          const [r, g, b] = orbDef.accent || [139, 143, 255]
          const isSelected = selected === style.id

          return (
            <motion.button
              key={style.id}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(style.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '16px 18px', borderRadius: 16,
                cursor: 'pointer', fontFamily: 'inherit',
                background: isSelected ? `rgba(${r},${g},${b},0.12)` : 'rgba(255,255,255,0.04)',
                border: isSelected ? `1.5px solid rgba(${r},${g},${b},0.45)` : '1.5px solid rgba(255,255,255,0.08)',
                boxShadow: isSelected ? `0 0 20px rgba(${r},${g},${b},0.15)` : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              {/* Orb swatch */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: orbDef.gradient,
                boxShadow: isSelected ? `0 0 16px rgba(${r},${g},${b},0.55)` : `0 0 8px rgba(${r},${g},${b},0.25)`,
                transition: 'box-shadow 0.3s',
              }} />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? `rgb(${r},${g},${b})` : 'rgba(255,255,255,0.85)', transition: 'color 0.2s' }}>
                    {style.emoji} {style.title}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.45 }}>
                  {style.desc}
                </div>
              </div>

              {/* Selected indicator */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isSelected ? `rgb(${r},${g},${b})` : 'rgba(255,255,255,0.08)',
                border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {isSelected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
              </div>
            </motion.button>
          )
        })}
      </div>

      <motion.button
        whileHover={selected ? { scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' } : {}}
        whileTap={selected ? { scale: 0.97 } : {}}
        onClick={() => selected && onNext()}
        style={{
          padding: '14px', borderRadius: 13,
          background: selected ? 'linear-gradient(135deg, #3D40A8, #5558D4)' : 'rgba(255,255,255,0.06)',
          border: selected ? '1px solid rgba(139,143,255,0.40)' : '1px solid rgba(255,255,255,0.08)',
          color: selected ? 'white' : 'rgba(255,255,255,0.25)',
          fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        This is me <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

// ─── Step 3: Demo walkthrough ─────────────────────────────────────────────────

function ChatDemo() {
  const messages = [
    { role: 'aeva', text: "What part of quadratic equations trips you up most — factoring, or the formula itself?" },
    { role: 'user', text: "The formula. I always forget it under pressure." },
    { role: 'aeva', text: "That's the most common gap. Let's fix it right now — not by memorising, but by deriving it once so it actually sticks." },
  ]
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= messages.length) return
    const t = setTimeout(() => setShown(s => s + 1), shown === 0 ? 400 : 1600)
    return () => clearTimeout(t)
  }, [shown])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
      {messages.slice(0, shown).map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '82%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: m.role === 'user' ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.08)',
            border: m.role === 'user' ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.10)',
            fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55,
          }}>
            {m.role === 'aeva' && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(167,139,250,0.80)', display: 'block', marginBottom: 3 }}>Aeva</span>}
            {m.text}
          </div>
        </motion.div>
      ))}
      {shown < messages.length && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 2px' }}>
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(167,139,250,0.60)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

function LabDemo() {
  const [flipped, setFlipped] = useState(false)
  const [answered, setAnswered] = useState(null)
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Mini drill type pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['⚡','Flashcard','#3B82F6'],['🧪','Feynman','#8B5CF6'],['⏱','Speed Round','#F97316'],['🎯','Mock Test','#06B6D4']].map(([icon, label, col]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: `rgba(${col === '#3B82F6' ? '59,130,246' : col === '#8B5CF6' ? '139,92,246' : col === '#F97316' ? '249,115,22' : '6,182,212'},0.15)`, border: `1px solid rgba(${col === '#3B82F6' ? '59,130,246' : col === '#8B5CF6' ? '139,92,246' : col === '#F97316' ? '249,115,22' : '6,182,212'},0.30)`, fontSize: 10.5, color: col }}>
            <span>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
      {/* Flashcard */}
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6 }} style={{ perspective: 800 }}>
        <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {!flipped ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>
              What does the discriminant b²−4ac tell you?
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ fontSize: 12.5, color: 'rgba(167,139,250,0.90)', lineHeight: 1.55 }}>
              It tells you how many real roots exist: &gt;0 means two roots, =0 means one, &lt;0 means none.
            </motion.div>
          )}
        </div>
      </motion.div>
      {flipped && !answered && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAnswered('got')} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ADE80', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>✓ Got it</button>
          <button onClick={() => setAnswered('missed')} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.35)', color: '#F87171', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>✗ Missed</button>
        </motion.div>
      )}
      {answered && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: 12, color: answered === 'got' ? '#4ADE80' : '#F87171', textAlign: 'center', fontWeight: 600 }}>
          {answered === 'got' ? '🔥 Aeva schedules it for review in 3 days' : '📌 Aeva flags it — you\'ll see it again tomorrow'}
        </motion.div>
      )}
    </div>
  )
}

function RoadmapDemo() {
  const nodes = [
    { label: 'Foundations of Algebra', done: true },
    { label: 'Quadratic Formula', done: true },
    { label: 'Discriminant & Roots', active: true },
    { label: 'Completing the Square', locked: true },
    { label: 'Mock Exam', locked: true },
  ]
  const [lit, setLit] = useState(2)
  useEffect(() => {
    const t = setTimeout(() => setLit(3), 1800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {nodes.map((n, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11,
            background: n.done ? 'rgba(74,222,128,0.07)' : n.active ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${n.done ? 'rgba(74,222,128,0.25)' : n.active ? 'rgba(139,92,246,0.40)' : 'rgba(255,255,255,0.07)'}`,
          }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            background: n.done ? 'rgba(74,222,128,0.22)' : n.active ? 'rgba(139,92,246,0.30)' : 'rgba(255,255,255,0.06)',
            color: n.done ? '#4ADE80' : n.active ? '#A78BFA' : 'rgba(255,255,255,0.25)',
          }}>
            {n.done ? '✓' : n.active ? '→' : '○'}
          </div>
          <span style={{ fontSize: 12, fontWeight: n.active ? 700 : 500,
            color: n.done ? 'rgba(255,255,255,0.45)' : n.active ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.28)',
          }}>
            {n.label}
          </span>
          {n.active && (
            <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#A78BFA', background: 'rgba(139,92,246,0.18)', padding: '2px 7px', borderRadius: 99 }}>
              NOW
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  )
}

const DEMOS = [
  { id: 'chat',    icon: '💬', label: 'Chat',    color: '#6366F1', rgb: '99,102,241',  tag: 'Understand',  desc: 'Aeva asks questions back and catches gaps in real time.', Component: ChatDemo },
  { id: 'lab',     icon: '⚡', label: 'Lab',     color: '#F97316', rgb: '249,115,22',  tag: '7 drill modes', desc: 'Flashcards, Feynman test, speed round — AI graded, adaptive.', Component: LabDemo },
  { id: 'roadmap', icon: '🗺️', label: 'Roadmap', color: '#8B5CF6', rgb: '139,92,246',  tag: 'Track progress', desc: 'A learning path from zero to exam-ready. Aeva updates it as you go.', Component: RoadmapDemo },
]

function StepHowItWorks({ onNext }) {
  const [active, setActive] = useState(0)

  // Auto-cycle every 5s
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % DEMOS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const demo = DEMOS[active]

  return (
    <motion.div
      key="how"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', margin: '0 0 10px' }}>
          See how it works
        </p>
        <h2 style={{ fontSize: 23, fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1.2 }}>
          Three tools, one system
        </h2>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 }}>
        {DEMOS.map((d, i) => (
          <button key={d.id} onClick={() => setActive(i)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, transition: 'all 0.2s',
              background: active === i ? `rgba(${d.rgb},0.22)` : 'transparent',
              color: active === i ? `rgb(${d.rgb})` : 'rgba(255,255,255,0.38)',
              boxShadow: active === i ? `0 0 0 1px rgba(${d.rgb},0.35)` : 'none',
            }}>
            {d.icon} {d.label}
          </button>
        ))}
      </div>

      {/* Demo area */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(${demo.rgb},0.25)`, borderRadius: 18, padding: '16px 16px 14px', minHeight: 180 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: `rgba(${demo.rgb},0.80)`, background: `rgba(${demo.rgb},0.14)`, padding: '2px 8px', borderRadius: 99 }}>
              {demo.tag}
            </span>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <demo.Component />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 1.6, minHeight: 40 }}>
        <AnimatePresence mode="wait">
          <motion.p key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ margin: 0 }}>
            {demo.desc}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {DEMOS.map((_, i) => (
          <motion.div key={i} onClick={() => setActive(i)}
            animate={{ width: active === i ? 20 : 6, background: active === i ? `rgb(${demo.rgb})` : 'rgba(255,255,255,0.18)' }}
            style={{ height: 6, borderRadius: 3, cursor: 'pointer' }} transition={{ duration: 0.3 }} />
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        style={{ padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        Let's go <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

// ─── Step 4: Subject ──────────────────────────────────────────────────────────
const SUBJECTS = ['Mathematics', 'Sciences', 'History', 'Languages', 'Computer Science', 'Business', 'Law', 'Other']

function StepSubject({ name, selected, onSelect, onNext }) {
  const firstName = name?.split(' ')[0] || 'there'

  return (
    <motion.div
      key="subject"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', margin: '0 0 14px' }}>
          Almost there
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.15 }}>
          What do you want to master?
        </h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', margin: 0 }}>
          Aeva works for anything — this just helps her calibrate.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SUBJECTS.map(s => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(s)}
            style={{
              padding: '10px 18px', borderRadius: 99,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: selected === s ? 'rgba(139,143,255,0.20)' : 'rgba(255,255,255,0.06)',
              border: selected === s ? '1.5px solid rgba(139,143,255,0.50)' : '1.5px solid rgba(255,255,255,0.10)',
              color: selected === s ? 'rgba(200,200,255,0.95)' : 'rgba(255,255,255,0.55)',
              transition: 'all 0.18s',
            }}
          >
            {s}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileHover={selected ? { scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' } : {}}
        whileTap={selected ? { scale: 0.97 } : {}}
        onClick={() => selected && onNext()}
        style={{
          padding: '14px', borderRadius: 13,
          background: selected ? 'linear-gradient(135deg, #3D40A8, #5558D4)' : 'rgba(255,255,255,0.06)',
          border: selected ? '1px solid rgba(139,143,255,0.40)' : '1px solid rgba(255,255,255,0.08)',
          color: selected ? 'white' : 'rgba(255,255,255,0.25)',
          fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        Continue <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

// ─── Step 4: Aeva speaks ──────────────────────────────────────────────────────
function StepAevaOpener({ name, styleId, subject, onStart }) {
  const firstName = name?.split(' ')[0] || 'there'
  const style = STYLES.find(s => s.id === styleId) || STYLES[0]
  const orbDef = ORBS.find(o => o.id === style.orbId) || ORBS[0]
  const [r, g, b] = orbDef.accent || [139, 143, 255]
  const opener = getOpener(styleId, subject)

  // Typewriter effect
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    setDisplayed('')
    setDone(false)
    const interval = setInterval(() => {
      if (i < opener.length) {
        setDisplayed(opener.slice(0, i + 1))
        i++
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, 22)
    return () => clearInterval(interval)
  }, [opener])

  return (
    <motion.div
      key="opener"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Orb — active */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <AevaOrb
            size={110}
            active
            personality={style.orbId}
            orbGradient={orbDef.gradient}
            orbAccent={orbDef.accent}
          />
        </motion.div>
      </div>

      {/* Aeva label */}
      <div style={{ textAlign: 'center', marginBottom: -8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(${r},${g},${b},0.70)` }}>
          Aeva · {style.title} mode
        </span>
      </div>

      {/* Message bubble */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 18, padding: '20px 22px',
        position: 'relative',
      }}>
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.7, margin: 0, minHeight: 80,
          letterSpacing: '-0.01em',
        }}>
          {displayed}
          {!done && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{ display: 'inline-block', width: 2, height: '1em', background: `rgba(${r},${g},${b},0.80)`, borderRadius: 1, marginLeft: 2, verticalAlign: 'text-bottom' }}
            />
          )}
        </p>
      </div>

      <AnimatePresence>
        {done && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02, boxShadow: `0 10px 35px rgba(${r},${g},${b},0.40)` }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            style={{
              padding: '14px', borderRadius: 13,
              background: `linear-gradient(135deg, rgba(${r},${g},${b},0.85), rgba(${r},${g},${b},0.65))`,
              border: `1px solid rgba(${r},${g},${b},0.45)`,
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 4px 20px rgba(${r},${g},${b},0.25)`,
            }}
          >
            Start learning with Aeva <ArrowRight size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Step dots ────────────────────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{ width: i === current ? 20 : 6, background: i === current ? '#8B8FFF' : i < current ? 'rgba(139,143,255,0.45)' : 'rgba(255,255,255,0.15)' }}
          transition={{ duration: 0.3 }}
          style={{ height: 6, borderRadius: 3 }}
        />
      ))}
    </div>
  )
}

// ═══ MAIN ONBOARDING ══════════════════════════════════════════════════════════
export default function Onboarding({ name: authName, onComplete }) {
  const { setActiveOrb, unlockOrb } = useXPStore()

  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(authName?.split(' ')[0] || '')
  const [styleId, setStyleId] = useState('')
  const [subject, setSubject] = useState('')

  // Step 0 is cinematic — no dots
  const showDots = step > 0
  const dotStep = step - 1  // dots for steps 1-5 only

  const handleComplete = () => {
    // Apply the chosen orb
    const style = STYLES.find(s => s.id === styleId)
    if (style) {
      unlockOrb(style.orbId)
      setActiveOrb(style.orbId)
    }
    onComplete(displayName || authName)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(160deg, #07091a 0%, #0d1030 50%, #080b22 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflowY: 'auto',
    }}>
      {/* Background glows */}
      <div aria-hidden style={{ position: 'absolute', top: '10%', left: '15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.22) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '10%', right: '10%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.10) 0%, transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: step === 0 ? 400 : 480, padding: '0 20px', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          background: step === 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
          backdropFilter: step === 0 ? 'none' : 'blur(32px)',
          border: step === 0 ? 'none' : '1px solid rgba(255,255,255,0.10)',
          borderRadius: 28,
          padding: step === 0 ? '0' : '28px 24px',
          display: 'flex', flexDirection: 'column', gap: 22,
        }}>
          {showDots && <StepDots total={5} current={dotStep} />}

          <AnimatePresence mode="wait">
            {step === 0 && <StepArrival key="s0" onNext={() => setStep(1)} />}
            {step === 1 && (
              <StepName
                key="s1"
                value={displayName}
                onChange={setDisplayName}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StepStyle
                key="s2"
                name={displayName}
                selected={styleId}
                onSelect={setStyleId}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <StepHowItWorks key="s3" onNext={() => setStep(4)} />
            )}
            {step === 4 && (
              <StepSubject
                key="s4"
                name={displayName}
                selected={subject}
                onSelect={setSubject}
                onNext={() => setStep(5)}
              />
            )}
            {step === 5 && (
              <StepAevaOpener
                key="s5"
                name={displayName}
                styleId={styleId}
                subject={subject}
                onStart={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
