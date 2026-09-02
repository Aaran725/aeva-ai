/**
 * AevaIntervention — full-screen takeover. No X button. You comply or you leave.
 *
 * Task types:
 *   acknowledge — read Aeva's message, wait 5s, click to confirm
 *   quiz        — 3 MCQ questions on a topic, need 2/3 to pass
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAevaControlStore } from './aevaControlStore'
import { useLabStore } from './labStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function generateQuizQuestions(topic) {
  const prompt = `Generate exactly 3 multiple-choice questions to test a student's understanding of: "${topic}".

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {"q": "question text", "opts": ["option A", "option B", "option C", "option D"], "correct": 0},
    {"q": "question text", "opts": ["option A", "option B", "option C", "option D"], "correct": 2},
    {"q": "question text", "opts": ["option A", "option B", "option C", "option D"], "correct": 1}
  ]
}

Rules: questions should be challenging but fair. correct is the 0-based index of the right answer. No explanation outside the JSON.`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 600,
    }),
  })
  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  return parsed.questions || []
}

/* ── Scan-line overlay ───────────────────────────────────────────────────── */
function ScanLines() {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
    }} />
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function AevaIntervention() {
  const { activeIntervention, dismissIntervention } = useAevaControlStore()
  const { addOrder, openLab } = useLabStore()

  const [phase, setPhase]         = useState('opening')  // opening | task | verdict
  const [ackCountdown, setAck]    = useState(5)
  const [questions, setQuestions] = useState([])
  const [generating, setGenerating] = useState(false)
  const [qIdx, setQIdx]           = useState(0)
  const [score, setScore]         = useState(0)
  const [selected, setSelected]   = useState(null)
  const [answered, setAnswered]   = useState(false)
  const [passed, setPassed]       = useState(false)
  const timerRef = useRef(null)

  // Acknowledge countdown
  useEffect(() => {
    if (phase === 'task' && activeIntervention?.task === 'acknowledge') {
      setAck(5)
      timerRef.current = setInterval(() => {
        setAck(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0 }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [phase, activeIntervention?.task])

  if (!activeIntervention) return null

  const { title, message, task, topic } = activeIntervention

  // ── Begin task ───────────────────────────────────────────────────────────
  const beginTask = async () => {
    setPhase('task')
    if (task === 'quiz') {
      setGenerating(true)
      try {
        const qs = await generateQuizQuestions(topic || 'general knowledge')
        setQuestions(qs)
      } catch {
        // fallback: acknowledge if quiz fails
        activeIntervention.task = 'acknowledge'
      }
      setGenerating(false)
    }
  }

  // ── Quiz answer ──────────────────────────────────────────────────────────
  const handleAnswer = (optIdx) => {
    if (answered) return
    setSelected(optIdx)
    setAnswered(true)
    const correct = questions[qIdx]?.correct
    const isRight = optIdx === correct
    if (isRight) setScore(s => s + 1)
    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        // finished
        const finalScore = score + (isRight ? 1 : 0)
        setPassed(finalScore >= 2)
        if (finalScore < 2) {
          // Fail: add 3 drill tasks
          addOrder({ title: `Drill: ${topic || 'this topic'}`, description: 'Aeva assigned this after a failed intervention quiz.', subject: topic || 'General' })
          addOrder({ title: `Flashcard sprint: ${topic || 'review'}`, description: 'Complete this before your next session.', subject: topic || 'General' })
          addOrder({ title: `Practice problems: ${topic || 'topic'}`, description: 'You need more reps. Do these.', subject: topic || 'General' })
          openLab()
        }
        setPhase('verdict')
      } else {
        setQIdx(i => i + 1)
        setSelected(null)
        setAnswered(false)
      }
    }, 1100)
  }

  // ── Dismiss ──────────────────────────────────────────────────────────────
  const handleDone = () => {
    dismissIntervention()
  }

  const q = questions[qIdx]
  const optColors = (idx) => {
    if (!answered) return {
      bg: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      color: 'rgba(255,255,255,0.82)',
    }
    if (idx === q?.correct) return {
      bg: 'rgba(74,222,128,0.12)',
      border: '1px solid rgba(74,222,128,0.55)',
      color: '#4ADE80',
    }
    if (idx === selected && idx !== q?.correct) return {
      bg: 'rgba(248,113,113,0.12)',
      border: '1px solid rgba(248,113,113,0.55)',
      color: '#F87171',
    }
    return { bg: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(80,10,10,0.85) 0%, rgba(8,2,2,0.99) 65%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: 24,
      }}
    >
      <ScanLines />

      {/* Pulsing red border vignette */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          boxShadow: 'inset 0 0 120px rgba(239,68,68,0.25)',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.90, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
        style={{
          position: 'relative', zIndex: 3,
          width: '100%', maxWidth: 520,
          borderRadius: 28,
          background: 'rgba(14,4,4,0.96)',
          border: '1px solid rgba(239,68,68,0.35)',
          boxShadow: '0 0 80px rgba(239,68,68,0.20), 0 40px 100px rgba(0,0,0,0.80)',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #EF4444 0%, #F97316 50%, #EF4444 100%)' }} />

        <div style={{ padding: '32px 32px 28px' }}>

          {/* Badge + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <motion.div
              animate={{ boxShadow: ['0 0 12px rgba(239,68,68,0.50)', '0 0 28px rgba(239,68,68,0.85)', '0 0 12px rgba(239,68,68,0.50)'] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #7f1d1d 0%, #EF4444 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Star size={15} color="white" fill="white" />
            </motion.div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.18em', color: '#EF4444', textTransform: 'uppercase' }}>Aeva Intervention</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 1 }}>This cannot be skipped</div>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Opening phase ─────────────────────────────── */}
            {phase === 'opening' && (
              <motion.div key="opening" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 16 }}>
                  {title || 'We need to talk.'}
                </h2>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.68)', marginBottom: 28 }}>
                  {message || 'Aeva has something to say.'}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03, background: 'rgba(239,68,68,0.28)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={beginTask}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14,
                    background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.45)',
                    color: '#FCA5A5', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '-0.01em',
                  }}
                >
                  {task === 'quiz' ? `Start assessment — ${topic || 'topic'}` : 'Continue'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Task: Acknowledge ─────────────────────────── */}
            {phase === 'task' && task === 'acknowledge' && (
              <motion.div key="ack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: 24 }}>
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.78)', margin: 0 }}>{message}</p>
                </div>
                <motion.button
                  whileHover={ackCountdown === 0 ? { scale: 1.03 } : {}}
                  whileTap={ackCountdown === 0 ? { scale: 0.97 } : {}}
                  onClick={ackCountdown === 0 ? handleDone : undefined}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14,
                    background: ackCountdown === 0 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                    border: ackCountdown === 0 ? '1px solid rgba(74,222,128,0.40)' : '1px solid rgba(255,255,255,0.08)',
                    color: ackCountdown === 0 ? '#4ADE80' : 'rgba(255,255,255,0.28)',
                    fontSize: 14, fontWeight: 700, cursor: ackCountdown === 0 ? 'pointer' : 'default',
                    fontFamily: 'inherit', transition: 'all 0.3s',
                  }}
                >
                  {ackCountdown > 0 ? `Read this. ${ackCountdown}s…` : 'Acknowledged — I hear you'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Task: Quiz ────────────────────────────────── */}
            {phase === 'task' && task === 'quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {generating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
                    <motion.div
                      animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(239,68,68,0.20)', borderTopColor: '#EF4444' }}
                    />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Loading assessment…</span>
                  </div>
                ) : q ? (
                  <>
                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Question {qIdx + 1} of {questions.length}</span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {questions.map((_, i) => (
                          <div key={i} style={{ width: 22, height: 4, borderRadius: 99, background: i < qIdx ? '#4ADE80' : i === qIdx ? '#EF4444' : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: 15.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, marginBottom: 16 }}>{q.q}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.opts.map((opt, i) => {
                        const s = optColors(i)
                        return (
                          <motion.button
                            key={i}
                            whileHover={!answered ? { scale: 1.02, background: 'rgba(255,255,255,0.08)' } : {}}
                            whileTap={!answered ? { scale: 0.98 } : {}}
                            onClick={() => handleAnswer(i)}
                            style={{
                              padding: '12px 16px', borderRadius: 12, textAlign: 'left',
                              background: s.bg, border: s.border, color: s.color,
                              fontSize: 14, fontWeight: 500, cursor: answered ? 'default' : 'pointer',
                              fontFamily: 'inherit', transition: 'all 0.2s',
                            }}
                          >
                            <span style={{ fontWeight: 700, marginRight: 8, opacity: 0.6 }}>{String.fromCharCode(65 + i)}.</span>{opt}
                          </motion.button>
                        )
                      })}
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}

            {/* ── Verdict ───────────────────────────────────── */}
            {phase === 'verdict' && (
              <motion.div key="verdict" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                    style={{ display: 'inline-flex', marginBottom: 20 }}
                  >
                    {passed
                      ? <CheckCircle size={52} color="#4ADE80" strokeWidth={1.5} />
                      : <XCircle    size={52} color="#F87171" strokeWidth={1.5} />
                    }
                  </motion.div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 10 }}>
                    {passed ? `${score}/${questions.length} — you passed.` : `${score}/${questions.length} — not good enough.`}
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 28 }}>
                    {passed
                      ? "Good. Don't make me do this again."
                      : "I've queued 3 drills in your Lab. Do them before your next session. The Arcade's not going anywhere — but neither is this gap."}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDone}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14,
                      background: passed ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                      border: passed ? '1px solid rgba(74,222,128,0.40)' : '1px solid rgba(239,68,68,0.35)',
                      color: passed ? '#4ADE80' : '#FCA5A5',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {passed ? 'Continue' : 'Fine. I\'ll do the drills.'}
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        style={{ position: 'relative', zIndex: 3, marginTop: 20, fontSize: 11.5, color: 'rgba(255,255,255,0.20)', textAlign: 'center', fontWeight: 500 }}
      >
        Aeva initiated this session · complete it to continue
      </motion.p>
    </motion.div>
  )
}
