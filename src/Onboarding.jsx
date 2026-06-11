import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Calendar, Trophy } from 'lucide-react'
import AevaOrb from './AevaOrb'
import { useXPStore, ORBS } from './xpStore'
import { useRoadmapStore } from './roadmapStore'

// ─── Teaching style → orb mapping ────────────────────────────────────────────
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

// ─── Subjects with icons ─────────────────────────────────────────────────────
const SUBJECTS = [
  { id: 'Mathematics',      label: 'Maths',   icon: '∑'  },
  { id: 'Sciences',         label: 'Science', icon: '⚗️' },
  { id: 'History',          label: 'History', icon: '📜' },
  { id: 'Languages',        label: 'Languages', icon: '🗣️' },
  { id: 'Computer Science', label: 'CS',      icon: '💻' },
  { id: 'Business',         label: 'Business',icon: '📊' },
  { id: 'Law',              label: 'Law',     icon: '⚖️' },
  { id: 'Other',            label: 'Other',   icon: '✦'  },
]

const EXAM_DEFAULTS = {
  Mathematics:       'A-Level Mathematics',
  Sciences:          'A-Level Biology',
  History:           'A-Level History',
  Languages:         'A-Level French',
  'Computer Science':'A-Level Computer Science',
  Business:          'A-Level Business Studies',
  Law:               'A-Level Law',
  Other:             '',
}

const EXAM_PLACEHOLDERS = {
  Mathematics:       'e.g. A-Level Maths, GCSE Maths…',
  Sciences:          'e.g. A-Level Biology, GCSE Chemistry…',
  History:           'e.g. A-Level History, GCSE History…',
  Languages:         'e.g. A-Level French, GCSE Spanish…',
  'Computer Science':'e.g. A-Level Computer Science…',
  Business:          'e.g. A-Level Business Studies…',
  Law:               'e.g. A-Level Law, SQE…',
  Other:             'e.g. SAT, IELTS, UCAT, Driving Theory…',
}

const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'U']
const GRADE_COLORS = {
  'A*': ['168,139,250', '#A78BFA'],
  'A':  ['129,140,248', '#818CF8'],
  'B':  ['56,189,248',  '#38BDF8'],
  'C':  ['74,222,128',  '#4ADE80'],
  'D':  ['250,204,21',  '#FACC15'],
  'E':  ['251,146,60',  '#FB923C'],
  'U':  ['248,113,113', '#F87171'],
}

// ─── Aeva's opening line ──────────────────────────────────────────────────────
function getOpener(styleId, subject, examName, targetGrade, daysLeft) {
  const name   = examName || subject || 'your exam'
  const dStr   = daysLeft <= 7
    ? `just ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
    : daysLeft <= 30
      ? `${daysLeft} days`
      : `${Math.ceil(daysLeft / 7)} weeks`

  const openers = {
    supportive: `Your roadmap for ${name} is ready — ${dStr} to hit that ${targetGrade}. Before we dive in, tell me one thing: what's the topic in ${subject || 'this subject'} you've always found confusing? That's exactly where we'll start.`,
    challenging: `${name}. ${dStr} left. ${targetGrade} target. Let's skip the pleasantries — what's your actual weakest topic right now? Not what looks bad on paper. The one you've been quietly avoiding.`,
    precise: `Roadmap initialised for ${name}. ${dStr} remain until the exam. To calibrate properly: what's the most recent concept in ${subject || 'this subject'} you understood procedurally, but couldn't explain from first principles if asked?`,
  }

  return openers[styleId] || openers.supportive
}

// ─── Step 0: Cinematic arrival ────────────────────────────────────────────────
function StepArrival({ onNext }) {
  const [phase, setPhase] = useState(0)

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
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        style={{ marginBottom: 28 }}
      >
        <AevaOrb size={140} active personality="balanced" />
      </motion.div>

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
        placeholder="Your name…"
        style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 18, fontFamily: 'inherit', outline: 'none',
          width: '100%', boxSizing: 'border-box',
          letterSpacing: '-0.01em', transition: 'border-color 0.2s',
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

// ─── Step 2: Teaching style ───────────────────────────────────────────────────
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

// ─── Step 3: Your exam setup ──────────────────────────────────────────────────
function StepYourExam({ name, onNext }) {
  const firstName  = name?.split(' ')[0] || 'there'
  const [subject,   setSubject]   = useState('')
  const [examName,  setExamName]  = useState('')
  const [examDate,  setExamDate]  = useState('')
  const [targetGrade, setTargetGrade] = useState('')

  // Auto-fill exam name on subject pick (if user hasn't typed one yet)
  useEffect(() => {
    if (subject && EXAM_DEFAULTS[subject]) {
      setExamName(prev => prev ? prev : EXAM_DEFAULTS[subject])
    }
  }, [subject])

  const canContinue = subject && examName.trim() && examDate && targetGrade
  const today = new Date().toISOString().split('T')[0]

  const inputStyle = {
    padding: '13px 16px', borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.90)',
    fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s', colorScheme: 'dark',
  }

  return (
    <motion.div
      key="yourexam"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', margin: '0 0 12px' }}>
          Set the target
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.04em', margin: '0 0 5px', lineHeight: 1.15 }}>
          What are you working towards?
        </h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', margin: 0 }}>
          Aeva builds your entire roadmap from this.
        </p>
      </div>

      {/* Subject chips */}
      <div>
        <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 10 }}>
          Subject
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUBJECTS.map(s => {
            const active = subject === s.id
            return (
              <motion.button
                key={s.id}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSubject(s.id)}
                style={{
                  padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600,
                  background: active ? 'rgba(139,143,255,0.20)' : 'rgba(255,255,255,0.06)',
                  border: active ? '1.5px solid rgba(139,143,255,0.50)' : '1.5px solid rgba(255,255,255,0.10)',
                  color: active ? 'rgba(200,202,255,0.95)' : 'rgba(255,255,255,0.50)',
                  transition: 'all 0.17s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span> {s.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Exam name */}
      <AnimatePresence>
        {subject && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 8 }}>
              Exam name
            </label>
            <input
              value={examName}
              onChange={e => setExamName(e.target.value)}
              placeholder={EXAM_PLACEHOLDERS[subject] || "What's the exam called?"}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(139,143,255,0.45)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date + Grade row */}
      <AnimatePresence>
        {subject && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.07 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            {/* Date */}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 8 }}>
                Exam date
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  min={today}
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  onFocus={e => e.target.style.borderColor = 'rgba(139,143,255,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
                <Calendar size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Target grade */}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 8 }}>
                Target grade
              </label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {GRADES.map(g => {
                  const [rgb, hex] = GRADE_COLORS[g]
                  const active = targetGrade === g
                  return (
                    <motion.button
                      key={g}
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                      onClick={() => setTargetGrade(g)}
                      style={{
                        padding: '7px 0', width: 36, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 12.5, fontWeight: 800,
                        background: active ? `rgba(${rgb},0.22)` : 'rgba(255,255,255,0.05)',
                        border: active ? `1.5px solid rgba(${rgb},0.55)` : '1.5px solid rgba(255,255,255,0.09)',
                        color: active ? hex : 'rgba(255,255,255,0.38)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {g}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={canContinue ? { scale: 1.02, boxShadow: '0 8px 28px rgba(99,102,241,0.38)' } : {}}
        whileTap={canContinue ? { scale: 0.97 } : {}}
        onClick={() => canContinue && onNext({ subject, examName: examName.trim(), examDate, targetGrade })}
        style={{
          padding: '14px', borderRadius: 13, marginTop: 2,
          background: canContinue ? 'linear-gradient(135deg, #3D40A8, #5558D4)' : 'rgba(255,255,255,0.06)',
          border: canContinue ? '1px solid rgba(139,143,255,0.40)' : '1px solid rgba(255,255,255,0.08)',
          color: canContinue ? 'white' : 'rgba(255,255,255,0.25)',
          fontSize: 15, fontWeight: 700, cursor: canContinue ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        Build my roadmap <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  )
}

// ─── Step 4: Generating (animated build) ─────────────────────────────────────
function StepGenerating({ examData, styleId, onDone }) {
  const [progress, setProgress]   = useState(0)
  const [msgIdx,   setMsgIdx]     = useState(0)
  const createdRef                = useRef(false)

  const daysLeft = examData.examDate
    ? Math.max(1, Math.ceil((new Date(examData.examDate) - Date.now()) / 86400000))
    : 30
  const weeksStr = daysLeft > 14
    ? `${Math.ceil(daysLeft / 7)} weeks`
    : `${daysLeft} days`

  const msgs = [
    `Mapping ${examData.subject || 'your subject'} syllabus…`,
    'Building your node learning path…',
    `Scheduling mock tests across ${weeksStr}…`,
    `Calibrating for grade ${examData.targetGrade}…`,
    'Finalising your roadmap…',
  ]

  useEffect(() => {
    // Create the roadmap immediately (sync)
    if (!createdRef.current) {
      createdRef.current = true
      useRoadmapStore.getState().createRoadmap({
        title:       examData.examName,
        subject:     examData.subject,
        examDate:    examData.examDate,
        targetGrade: examData.targetGrade,
      })
    }

    // Animate progress over ~2.6 s then call onDone
    const DURATION = 2600
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100))
      setProgress(pct)
      setMsgIdx(Math.min(msgs.length - 1, Math.floor((elapsed / DURATION) * msgs.length)))
      if (pct >= 100) {
        clearInterval(tick)
        setTimeout(onDone, 300)
      }
    }, 30)
    return () => clearInterval(tick)
  }, [])

  const examDateFmt = examData.examDate
    ? new Date(examData.examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '12px 0 8px', textAlign: 'center' }}
    >
      {/* Pulsing orb */}
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AevaOrb size={90} active personality={STYLES.find(s => s.id === styleId)?.orbId || 'balanced'} />
      </motion.div>

      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.04em', margin: '0 0 6px' }}>
          Building your roadmap…
        </h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', margin: 0 }}
          >
            {msgs[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #A78BFA)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
      </div>

      {/* Exam summary pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)', fontSize: 12, color: 'rgba(200,202,255,0.80)', fontWeight: 600 }}>
          📚 {examData.examName}
        </div>
        {examDateFmt && (
          <div style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.22)', fontSize: 12, color: 'rgba(147,218,252,0.80)', fontWeight: 600 }}>
            📅 {examDateFmt}
          </div>
        )}
        <div style={{ padding: '5px 12px', borderRadius: 99, background: `rgba(${GRADE_COLORS[examData.targetGrade]?.[0] || '139,143,255'},0.12)`, border: `1px solid rgba(${GRADE_COLORS[examData.targetGrade]?.[0] || '139,143,255'},0.28)`, fontSize: 12, color: GRADE_COLORS[examData.targetGrade]?.[1] || '#A78BFA', fontWeight: 600 }}>
          🎯 Target {examData.targetGrade}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Step 5: Aeva speaks ──────────────────────────────────────────────────────
function StepAevaOpener({ name, styleId, examData, onStart }) {
  const style  = STYLES.find(s => s.id === styleId) || STYLES[0]
  const orbDef = ORBS.find(o => o.id === style.orbId) || ORBS[0]
  const [r, g, b] = orbDef.accent || [139, 143, 255]

  const daysLeft = examData?.examDate
    ? Math.max(1, Math.ceil((new Date(examData.examDate) - Date.now()) / 86400000))
    : 30
  const opener = getOpener(styleId, examData?.subject, examData?.examName, examData?.targetGrade, daysLeft)

  const [displayed, setDisplayed] = useState('')
  const [done, setDone]           = useState(false)

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
    }, 20)
    return () => clearInterval(interval)
  }, [opener])

  return (
    <motion.div
      key="opener"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <AevaOrb
            size={100}
            active
            personality={style.orbId}
            orbGradient={orbDef.gradient}
            orbAccent={orbDef.accent}
          />
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: -6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(${r},${g},${b},0.70)` }}>
          Aeva · {style.title} mode
        </span>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 18, padding: '20px 22px',
      }}>
        <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, margin: 0, minHeight: 72, letterSpacing: '-0.01em' }}>
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
              background: `linear-gradient(135deg, rgba(${r},${g},${b},0.85), rgba(${r},${g},${b},0.55))`,
              border: `1px solid rgba(${r},${g},${b},0.45)`,
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 4px 20px rgba(${r},${g},${b},0.22)`,
            }}
          >
            Open my roadmap <ArrowRight size={16} />
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
          animate={{
            width: i === current ? 20 : 6,
            background: i === current ? '#8B8FFF' : i < current ? 'rgba(139,143,255,0.45)' : 'rgba(255,255,255,0.15)',
          }}
          transition={{ duration: 0.3 }}
          style={{ height: 6, borderRadius: 3 }}
        />
      ))}
    </div>
  )
}

// ═══ MAIN ONBOARDING ══════════════════════════════════════════════════════════
// Steps:  0=Arrival  1=Name  2=Style  3=YourExam  4=Generating  5=AevaOpener
//         dots shown: steps 1–3 only (3 dots)

export default function Onboarding({ name: authName, onComplete }) {
  const { setActiveOrb, unlockOrb } = useXPStore()

  const [step,         setStep]         = useState(0)
  const [displayName,  setDisplayName]  = useState(authName?.split(' ')[0] || '')
  const [styleId,      setStyleId]      = useState('')
  const [examData,     setExamData]     = useState(null) // { subject, examName, examDate, targetGrade }

  const showDots = step >= 1 && step <= 3
  const dotCurrent = step - 1 // maps step 1→dot 0, step 2→dot 1, step 3→dot 2

  const handleComplete = () => {
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
        style={{ width: '100%', maxWidth: step === 0 ? 400 : 460, padding: '0 20px', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          background: step === 0 || step === 4 ? 'transparent' : 'rgba(255,255,255,0.05)',
          backdropFilter: step === 0 || step === 4 ? 'none' : 'blur(32px)',
          border: step === 0 || step === 4 ? 'none' : '1px solid rgba(255,255,255,0.10)',
          borderRadius: 28,
          padding: step === 0 || step === 4 ? '0' : '28px 24px',
          display: 'flex', flexDirection: 'column', gap: 22,
        }}>
          {showDots && <StepDots total={3} current={dotCurrent} />}

          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepArrival key="s0" onNext={() => setStep(1)} />
            )}
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
              <StepYourExam
                key="s3"
                name={displayName}
                onNext={(data) => { setExamData(data); setStep(4) }}
              />
            )}
            {step === 4 && examData && (
              <StepGenerating
                key="s4"
                examData={examData}
                styleId={styleId}
                onDone={() => setStep(5)}
              />
            )}
            {step === 5 && (
              <StepAevaOpener
                key="s5"
                name={displayName}
                styleId={styleId}
                examData={examData}
                onStart={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
