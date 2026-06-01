import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Brain, FlaskConical, Camera, BookOpen, Check } from 'lucide-react'
import AevaOrb from './AevaOrb'

const SUBJECTS = ['Mathematics', 'Sciences', 'History', 'Languages', 'Computer Science', 'Business', 'Law', 'Other']

const FEATURES = [
  {
    icon: Brain, color: '#8B8FFF', bg: 'rgba(139,143,255,0.12)',
    title: 'AI Tutor',
    desc: 'Aeva asks smart questions, builds your understanding step by step, then stress-tests you. Not just answers — actual teaching.',
  },
  {
    icon: FlaskConical, color: '#10B981', bg: 'rgba(16,185,129,0.12)',
    title: 'Practice Labs',
    desc: '7 drill types — flashcards, speed rounds, mock tests, Feynman, fill the gaps, short answer, and match grid. All AI-generated from your topic.',
  },
  {
    icon: Camera, color: '#F97316', bg: 'rgba(249,115,22,0.12)',
    title: 'Aeva Lens',
    desc: 'Take a photo of any problem, equation, or diagram. Aeva analyses it and gives you a full breakdown with confidence scores.',
  },
  {
    icon: BookOpen, color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',
    title: 'Study Guide',
    desc: 'After every session Aeva auto-generates a structured study guide. Come back to it anytime from the Library.',
  },
]

const STARTER_PROMPTS = [
  'Explain [your topic] from the basics',
  'Quiz me on [what you\'re revising]',
  'I have an exam on [topic] tomorrow, help me',
]

/* ── Step indicator ── */
function StepDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{ width: i === current ? 22 : 7, background: i === current ? '#8B8FFF' : 'rgba(255,255,255,0.18)' }}
          transition={{ duration: 0.3 }}
          style={{ height: 7, borderRadius: 4 }}
        />
      ))}
    </div>
  )
}

/* ── Step 0: Welcome ── */
function StepWelcome({ name, displayName, setDisplayName, subject, setSubject, onNext }) {
  return (
    <motion.div key="welcome" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Orb */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <AevaOrb size={110} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Hey {name ? name.split(' ')[0] : 'there'}, I'm Aeva 👋
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.65 }}>
          Let's get you set up in 30 seconds.
        </p>
      </div>

      {/* Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.02em' }}>What should I call you?</label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name..."
          style={{
            padding: '12px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.90)',
            fontSize: 15, fontFamily: 'inherit', outline: 'none',
            width: '100%', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Subject */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.02em' }}>What are you mainly studying?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUBJECTS.map(s => (
            <motion.button key={s} onClick={() => setSubject(s)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 13.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                background: subject === s ? 'rgba(139,143,255,0.22)' : 'rgba(255,255,255,0.06)',
                border: subject === s ? '1px solid rgba(139,143,255,0.45)' : '1px solid rgba(255,255,255,0.10)',
                color: subject === s ? 'rgba(200,200,255,0.92)' : 'rgba(255,255,255,0.58)',
                transition: 'all 0.18s',
              }}>
              {s}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button onClick={onNext}
        whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' }} whileTap={{ scale: 0.97 }}
        style={{ padding: '13px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.38)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Next <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

/* ── Step 1: Feature tour ── */
function StepFeatures({ onNext }) {
  return (
    <motion.div key="features" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Here's what I can do
        </h2>
        <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.45)', margin: 0 }}>A few tools you'll want to know about.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FEATURES.map((f, i) => (
          <motion.div key={f.title}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <f.icon size={18} color={f.color} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.60 }}>{f.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button onClick={onNext}
        whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' }} whileTap={{ scale: 0.97 }}
        style={{ padding: '13px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.38)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Got it <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

/* ── Step 2: First chat ── */
function StepReady({ displayName, onStart }) {
  return (
    <motion.div key="ready" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={28} color="#4ADE80" />
        </motion.div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          You're all set{displayName ? `, ${displayName.split(' ')[0]}` : ''}!
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.46)', margin: 0, lineHeight: 1.65 }}>
          Here are a few ways to start your first session:
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STARTER_PROMPTS.map((p, i) => (
          <motion.div key={p}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
            style={{ padding: '12px 16px', background: 'rgba(139,143,255,0.08)', border: '1px solid rgba(139,143,255,0.20)', borderRadius: 12, fontSize: 14, color: 'rgba(200,200,255,0.80)', lineHeight: 1.5, fontStyle: 'italic' }}>
            "{p}"
          </motion.div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', textAlign: 'center', margin: 0 }}>
        Or just type anything — Aeva will figure it out.
      </p>

      <motion.button onClick={onStart}
        whileHover={{ scale: 1.02, boxShadow: '0 10px 35px rgba(99,102,241,0.45)' }} whileTap={{ scale: 0.97 }}
        style={{ padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8, #5558D4)', border: '1px solid rgba(139,143,255,0.38)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Start learning <ArrowRight size={17} />
      </motion.button>
    </motion.div>
  )
}

/* ── Main Onboarding ── */
export default function Onboarding({ name, onComplete }) {
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(name || '')
  const [subject, setSubject] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(135deg, #08091a 0%, #0f1228 50%, #0c0e2c 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Background glows */}
      <div aria-hidden style={{ position: 'absolute', top: '15%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.20) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '15%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.10) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 480, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: 'rgba(255,255,255,0.055)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 26,
          padding: '32px 28px',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          <StepDots total={3} current={step} />

          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepWelcome
                key="s0" name={name}
                displayName={displayName} setDisplayName={setDisplayName}
                subject={subject} setSubject={setSubject}
                onNext={() => setStep(1)}
              />
            )}
            {step === 1 && <StepFeatures key="s1" onNext={() => setStep(2)} />}
            {step === 2 && <StepReady key="s2" displayName={displayName} onStart={onComplete} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
