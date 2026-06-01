import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, FlaskConical, Camera, BookOpen, Trophy, Zap, ArrowRight, Star, Check } from 'lucide-react'

/* ── Hero Orb ─────────────────────────────────────── */
function HeroOrb() {
  return (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {[220, 260, 300].map((s, i) => (
        <motion.div key={s}
          animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.30, 0.18] }}
          transition={{ duration: 3.5 + i * 0.6, repeat: Infinity, delay: i * 0.4 }}
          style={{ position: 'absolute', width: s, height: s, borderRadius: '50%', border: '1px solid rgba(139,143,255,0.25)', pointerEvents: 'none' }}
        />
      ))}
      <motion.div
        animate={{ boxShadow: ['0 0 50px rgba(99,102,241,0.45)', '0 0 80px rgba(99,102,241,0.65)', '0 0 50px rgba(99,102,241,0.45)'] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(190,180,255,0.95) 0%, rgba(99,102,241,0.85) 40%, rgba(45,48,142,0.92) 70%, rgba(18,18,52,0.97) 100%)', position: 'relative', zIndex: 1 }}
      />
    </div>
  )
}

/* ── Floating feature tags around orb ─────────────── */
const FLOAT_TAGS = [
  { label: '⚡ AI Tutor',       x: -150, y: -55,  delay: 0 },
  { label: '🧪 Labs & Drills',  x:  130, y: -40,  delay: 0.3 },
  { label: '🔬 Aeva Lens',      x: -140, y:  65,  delay: 0.6 },
  { label: '📚 Study Guide',    x:  120, y:  70,  delay: 0.9 },
]

function FloatTag({ label, x, y, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
      transition={{ opacity: { delay, duration: 0.5 }, scale: { delay, duration: 0.5 }, y: { duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.5 } }}
      style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.13)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20, padding: '6px 12px',
        fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)',
        whiteSpace: 'nowrap', pointerEvents: 'none',
      }}
    >
      {label}
    </motion.div>
  )
}

/* ── Animated chat demo ───────────────────────────── */
const DEMO_USER = 'Explain quadratic equations'
const DEMO_AI = [
  { type: 'bold', text: 'Quadratic equations' },
  { type: 'plain', text: ' take the form ax² + bx + c = 0.' },
  { type: 'br' },
  { type: 'quote', text: 'Think of it like a parabola — the solutions are where it crosses the x-axis.' },
  { type: 'br' },
  { type: 'plain', text: 'The ' },
  { type: 'bold', text: 'quadratic formula' },
  { type: 'plain', text: ' solves any of them:' },
  { type: 'br' },
  { type: 'code', text: 'x = (−b ± √(b²−4ac)) / 2a' },
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px 14px 14px 14px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.08)' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(139,143,255,0.85)' }}
        />
      ))}
    </div>
  )
}

function ChatDemo() {
  const [phase, setPhase] = useState(0)
  const [aiIdx, setAiIdx] = useState(0)
  const timers = useRef([])

  const clear = () => timers.current.forEach(clearTimeout)

  const run = () => {
    clear(); setPhase(0); setAiIdx(0)
    const push = (fn, ms) => timers.current.push(setTimeout(fn, ms))
    push(() => setPhase(1), 500)
    push(() => setPhase(2), 1400)
    push(() => setPhase(3), 2600)
    // stagger AI content items
    DEMO_AI.forEach((_, i) => push(() => setAiIdx(i + 1), 2600 + i * 220))
    push(() => setPhase(4), 2600 + DEMO_AI.length * 220 + 400)
    push(() => run(), 2600 + DEMO_AI.length * 220 + 5000)
  }

  useEffect(() => { run(); return clear }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.7 }}
      style={{
        background: 'rgba(5,6,26,0.94)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 22,
        padding: '20px 20px 16px',
        width: '100%', maxWidth: 520,
        minHeight: 300,
        display: 'flex', flexDirection: 'column', gap: 12,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,143,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Window bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['#FF5F57','#FEBC2E','#28C840'].map(c => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>Aeva · AI Tutor</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220 }}>
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div key="user" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, rgba(99,102,241,0.38), rgba(139,143,255,0.26))', border: '1px solid rgba(139,143,255,0.28)', borderRadius: '16px 16px 4px 16px', padding: '10px 14px', fontSize: 14, color: 'rgba(255,255,255,0.92)', maxWidth: '78%' }}>
              {DEMO_USER}
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TypingDots />
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 16px 16px 16px', padding: '12px 14px', fontSize: 13.5, color: 'rgba(255,255,255,0.86)', maxWidth: '94%', lineHeight: 1.68 }}>
              {DEMO_AI.slice(0, aiIdx).map((item, i) => {
                if (item.type === 'br') return <div key={i} style={{ height: 5 }} />
                if (item.type === 'bold') return <strong key={i} style={{ fontWeight: 700 }}>{item.text}</strong>
                if (item.type === 'quote') return <div key={i} style={{ borderLeft: '3px solid #6366F1', paddingLeft: 11, color: 'rgba(210,210,255,0.88)', fontStyle: 'italic', margin: '4px 0' }}>{item.text}</div>
                if (item.type === 'code') return <code key={i} style={{ display: 'block', fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', padding: '6px 10px', borderRadius: 8, color: '#93C5FD', fontSize: 13, margin: '5px 0' }}>{item.text}</code>
                return <span key={i}>{item.text}</span>
              })}
              {phase === 3 && aiIdx < DEMO_AI.length && (
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                  style={{ display: 'inline-block', width: 2, height: 13, background: 'rgba(139,143,255,0.8)', borderRadius: 1, marginLeft: 2, verticalAlign: 'middle' }} />
              )}
            </motion.div>
          )}

          {phase >= 4 && (
            <motion.div key="pill" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              style={{ alignSelf: 'flex-start', background: 'rgba(139,143,255,0.13)', border: '1px solid rgba(139,143,255,0.28)', borderRadius: 20, padding: '8px 14px', fontSize: 12.5, color: 'rgba(200,200,255,0.88)', cursor: 'default' }}>
              🎯 Want to try a drill on this?
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '10px 14px' }}>
        <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.22)' }}>Ask Aeva anything…</span>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight size={13} color="white" />
        </div>
      </div>
    </motion.div>
  )
}

/* ── Feature cards ────────────────────────────────── */
const FEATURES = [
  { icon: Brain,      title: 'AI Tutor',       desc: 'Adapts to your level with Socratic teaching. Diagnoses gaps, builds understanding, then stress-tests you.', color: '#8B8FFF', bg: 'rgba(139,143,255,0.10)' },
  { icon: FlaskConical, title: 'Practice Labs', desc: '7 drill modes — flashcards, speed rounds, mock tests, Feynman, fill the gaps, short answer, and match grid.', color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { icon: Camera,     title: 'Aeva Lens',       desc: 'Point your camera at any problem. Aeva analyses it, identifies the topic, and gives you a full breakdown.', color: '#F97316', bg: 'rgba(249,115,22,0.10)' },
  { icon: BookOpen,   title: 'Study Guide',     desc: 'Every tutoring session auto-generates a clean, structured study guide you can review anytime.', color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
  { icon: Zap,        title: 'Memory Palace',   desc: 'Spaced repetition built in. Aeva tracks what you know, what you're shaky on, and reviews it at the right time.', color: '#EC4899', bg: 'rgba(236,72,153,0.10)' },
  { icon: Trophy,     title: 'Mission Mode',    desc: 'Gamified learning challenges with chaos events, debate arenas, and timed missions that make studying addictive.', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
]

function FeatureCard({ icon: Icon, title, desc, color, bg, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 18, padding: '22px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'default',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 13, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.65 }}>{desc}</div>
      </div>
    </motion.div>
  )
}

/* ── How it works ─────────────────────────────────── */
const STEPS = [
  { n: '01', icon: '💬', title: 'Tell Aeva what you\'re studying', desc: 'Type any topic or paste a question. Aeva instantly understands the subject and calibrates to your level.' },
  { n: '02', icon: '🧠', title: 'Aeva diagnoses your gaps', desc: 'Through targeted questions, Aeva figures out exactly what you know and don\'t know — then starts building.' },
  { n: '03', icon: '✅', title: 'Drill until it sticks', desc: 'Reinforce with 7 types of AI-powered practice drills. Aeva tracks your progress and pushes you when you\'re ready.' },
]

/* ── Main landing page ────────────────────────────── */
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
      <div aria-hidden style={{ position: 'fixed', top: '5%', left: '10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.18) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', bottom: '10%', right: '8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.10) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', top: '50%', right: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,143,255,0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Navbar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px, 5vw, 80px)', height: 64, background: 'rgba(8,9,26,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={14} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>aeva</span>
        </div>

        {/* Nav actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.button
            onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.68)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Sign in
          </motion.button>
          <motion.button
            onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.35)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Get started
          </motion.button>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        <section style={{ padding: 'clamp(60px, 10vh, 100px) clamp(20px, 5vw, 80px) clamp(40px, 6vh, 70px)', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', maxWidth: 1200, margin: '0 auto' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.28)', borderRadius: 20, padding: '5px 12px', width: 'fit-content', fontSize: 12.5, color: 'rgba(200,200,255,0.88)', fontWeight: 600, letterSpacing: '0.02em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B8FFF', display: 'inline-block' }} />
              AI-POWERED LEARNING
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
              style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, color: 'rgba(255,255,255,0.96)', lineHeight: 1.13, letterSpacing: '-0.03em', margin: 0 }}>
              The AI tutor built to actually{' '}
              <span style={{ background: 'linear-gradient(135deg, #8B8FFF, #E9A364)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                teach you.
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              style={{ fontSize: 17, color: 'rgba(255,255,255,0.52)', lineHeight: 1.7, margin: 0, maxWidth: 480 }}>
              Aeva adapts to how you think — diagnosing gaps, building understanding layer by layer, then drilling until it sticks.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <motion.button
                onClick={onGetStarted} whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(99,102,241,0.40)' }} whileTap={{ scale: 0.97 }}
                style={{ padding: '13px 26px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                Start for free <ArrowRight size={16} />
              </motion.button>
              <motion.button
                onClick={onGetStarted} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: '13px 22px', borderRadius: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign in
              </motion.button>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#F59E0B" color="#F59E0B" />)}
              <span style={{ marginLeft: 4 }}>Loved by students worldwide</span>
            </motion.div>
          </div>

          {/* Right — orb + tags */}
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.15 }}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 340, height: 340, flexShrink: 0, margin: '0 auto' }}>
            <HeroOrb />
            {FLOAT_TAGS.map(t => <FloatTag key={t.label} {...t} />)}
          </motion.div>
        </section>

        {/* ── Demo / Mockup ── */}
        <section style={{ padding: 'clamp(40px, 6vh, 70px) clamp(20px, 5vw, 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 12 }}>LIVE PREVIEW</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              See Aeva in action
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Watch Aeva explain a concept, stream a response, and instantly offer a drill — all in one flow.
            </p>
          </motion.div>

          <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
            {/* Glow behind demo */}
            <div aria-hidden style={{ position: 'absolute', inset: -40, background: 'radial-gradient(circle at 50% 60%, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <ChatDemo />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ padding: 'clamp(50px, 7vh, 80px) clamp(20px, 5vw, 80px)', maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 12 }}>EVERYTHING YOU NEED</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              One app. Every tool.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 460, margin: '0 auto', lineHeight: 1.65 }}>
              Aeva combines tutoring, drills, visual analysis, and spaced repetition into one seamless experience.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{ padding: 'clamp(50px, 7vh, 80px) clamp(20px, 5vw, 80px)', maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase', marginBottom: 12 }}>THE PROCESS</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em', margin: 0 }}>
              How Aeva teaches
            </h2>
          </motion.div>

          <div style={{ display: 'flex', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {STEPS.map((step, i) => (
              <motion.div key={step.n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: i * 0.12 }}
                style={{ flex: 1, minWidth: 240, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingTop: 8 }}>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div aria-hidden style={{ position: 'absolute', top: 28, left: 'calc(100% + 16px)', width: 'calc(clamp(16px,3vw,32px) - 0px)', height: 1, background: 'rgba(255,255,255,0.10)' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,143,255,0.15))', border: '1px solid rgba(139,143,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(139,143,255,0.65)', letterSpacing: '0.08em' }}>{step.n}</span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.68 }}>{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section style={{ padding: 'clamp(60px, 8vh, 90px) clamp(20px, 5vw, 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 28, padding: 'clamp(36px, 5vw, 56px) clamp(28px, 5vw, 64px)', maxWidth: 640, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.80)', textTransform: 'uppercase' }}>FREE TO START</div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
              Ready to actually understand what you're studying?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.46)', lineHeight: 1.65, margin: 0 }}>
              Join students who stopped rereading and started really learning.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['No credit card', 'Free to start', 'Works on any subject'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.52)' }}>
                  <Check size={13} color="#4ADE80" />
                  {t}
                </div>
              ))}
            </div>
            <motion.button
              onClick={onGetStarted} whileHover={{ scale: 1.03, boxShadow: '0 10px 35px rgba(99,102,241,0.45)' }} whileTap={{ scale: 0.97 }}
              style={{ padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 9, position: 'relative', zIndex: 1 }}>
              Start learning free <ArrowRight size={17} />
            </motion.button>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ padding: '24px clamp(20px, 5vw, 80px)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={11} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.60)', letterSpacing: '-0.02em' }}>aeva</span>
          </div>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.25)' }}>Built for students who actually want to understand.</span>
        </footer>

      </div>
    </div>
  )
}
