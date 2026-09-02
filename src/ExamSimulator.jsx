/**
 * ExamSimulator — full-screen exam simulation overlay
 *
 * Phases:
 *   setup   → modal: pick roadmap, timer, question count
 *   active  → exam hall: countdown, questions, answer boxes, Aeva hidden
 *   scoring → waiting animation while Groq scores
 *   results → grade prediction band, per-topic table, mark-loss callout, CTAs
 *
 * Mounted once at root (next to StudyWithMe). Opens via:
 *   useExamStore.getState().openSetup(roadmapId?)
 *   or window.dispatchEvent(new CustomEvent('aeva:open-exam', { detail: { roadmapId } }))
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronDown, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, RotateCcw, TrendingUp, Target, Zap, BookOpen,
} from 'lucide-react'
import { useExamStore, predictGrade, calcMarkLoss } from './examStore'
import { useRoadmapStore, calcGrade, GRADE_THRESHOLDS } from './roadmapStore'
import { useAevaControlStore } from './aevaControlStore'
import { GROQ_URL, nextGroqKey } from './groqClient'

/* ── Groq helpers ──────────────────────────────────────────────────────────── */

/** Generate exam questions from roadmap nodes using Groq */
async function generateQuestions(roadmap, count = 10) {
  const nodes = roadmap.nodes || []
  const available = nodes.filter(n => n.status !== 'skipped')
  const topics = available.map(n => `${n.topic} (type: ${n.type || 'learn'}, difficulty: ${n.difficulty || 2}/5)`)

  const prompt = `You are setting a ${roadmap.title} exam paper. Generate exactly ${count} exam questions covering these topics:

${topics.slice(0, 20).join('\n')}

Rules:
- Spread questions across different topics
- Mix difficulty: ~30% easy, 50% medium, 20% hard
- Use ONLY short-answer questions (1–4 sentences expected)
- Each question worth 2–8 marks (harder = more marks)
- Include a mark scheme hint for each question

Return ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "id": "q1",
      "topic": "<exact topic name from list above>",
      "question": "<the question text>",
      "marks": <number 2-8>,
      "markScheme": "<key points the answer must include, semicolon-separated>"
    }
  ]
}`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('Groq question generation failed')
  const json = await res.json()
  const data = JSON.parse(json.choices?.[0]?.message?.content || '{}')
  return (data.questions || []).map((q, i) => ({ ...q, id: q.id || `q${i + 1}`, nodeId: null }))
}

/** Score a batch of answers against mark schemes using Groq */
async function scoreAnswers(questions, answers) {
  const pairs = questions.map(q => ({
    id:         q.id,
    topic:      q.topic,
    question:   q.question,
    marks:      q.marks,
    markScheme: q.markScheme,
    answer:     answers[q.id] || '(no answer)',
  }))

  const prompt = `You are an exam marker. Score each student answer against the mark scheme.

${JSON.stringify(pairs, null, 2)}

For each question, award a score from 0–100 (percentage of marks earned).
- 100 = perfect, all mark scheme points covered
- 70–99 = good, most points covered
- 40–69 = partial, some correct content
- 0–39 = poor or blank

Return ONLY valid JSON:
{ "scores": { "q1": <0-100>, "q2": <0-100>, ... } }`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('Groq scoring failed')
  const json = await res.json()
  const data = JSON.parse(json.choices?.[0]?.message?.content || '{}')
  return data.scores || {}
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fmtTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function gradeColor(grade) {
  return GRADE_THRESHOLDS.find(t => t.grade === grade)?.color || '#818CF8'
}

const TIMER_OPTIONS = [
  { label: '15 min', value: 15 * 60 },
  { label: '30 min', value: 30 * 60 },
  { label: '45 min', value: 45 * 60 },
  { label: '60 min', value: 60 * 60 },
  { label: '90 min', value: 90 * 60 },
]
const Q_OPTIONS = [5, 8, 10, 15, 20]

/* ════════════════════════════════════════════════════════════
   SETUP MODAL
════════════════════════════════════════════════════════════ */

function SetupModal() {
  const { selectedRoadmapId, timeLimit, questionCount, setSetupOptions, closeSetup, setGenerating, setQuestions, startExam } = useExamStore()
  const roadmaps = useRoadmapStore(s => s.roadmaps)
  const eligible = roadmaps.filter(r => r.nodes?.length)
  const [error, setError] = useState(null)

  const selectedRm = eligible.find(r => r.id === selectedRoadmapId) || eligible[0]

  const handleStart = async () => {
    if (!selectedRm) return
    setError(null)
    setGenerating(true)
    try {
      const qs = await generateQuestions(selectedRm, questionCount)
      if (!qs.length) throw new Error('No questions generated')
      setQuestions(qs)
      startExam()
    } catch (e) {
      setGenerating(false)
      setError('Failed to generate questions. Check your connection and try again.')
    }
  }

  const { isGenerating } = useExamStore()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(4,5,18,0.82)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 480, borderRadius: 24, background: 'radial-gradient(ellipse at 60% 0%, rgba(99,60,200,0.22) 0%, rgba(8,9,26,0) 55%), #0c0b18', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', padding: 28 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(167,139,250,0.65)', textTransform: 'uppercase', marginBottom: 4 }}>Exam Simulation</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.93)', margin: 0, letterSpacing: '-0.03em' }}>Enter the Exam Hall</h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', lineHeight: 1.5 }}>Aeva goes silent. Full timed conditions.</p>
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={closeSetup}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
            <X size={14} />
          </motion.button>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Subject</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {eligible.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>No roadmaps yet. Create one first.</div>
            )}
            {eligible.map(rm => (
              <motion.button key={rm.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSetupOptions({ roadmapId: rm.id })}
                style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: selectedRm?.id === rm.id ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${selectedRm?.id === rm.id ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.10)'}`,
                  color: selectedRm?.id === rm.id ? '#C4B5FD' : 'rgba(255,255,255,0.50)',
                }}>
                {rm.title}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Time Limit</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {TIMER_OPTIONS.map(opt => (
              <motion.button key={opt.value} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSetupOptions({ timeLimit: opt.value })}
                style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: timeLimit === opt.value ? 'rgba(96,165,250,0.20)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${timeLimit === opt.value ? 'rgba(96,165,250,0.50)' : 'rgba(255,255,255,0.10)'}`,
                  color: timeLimit === opt.value ? '#93C5FD' : 'rgba(255,255,255,0.50)',
                }}>
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Questions</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {Q_OPTIONS.map(n => (
              <motion.button key={n} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSetupOptions({ questionCount: n })}
                style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: questionCount === n ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${questionCount === n ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  color: questionCount === n ? '#6EE7B7' : 'rgba(255,255,255,0.50)',
                }}>
                {n}
              </motion.button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#FCA5A5', fontSize: 12.5 }}>
            {error}
          </div>
        )}

        {/* Info strip */}
        <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 16 }}>
          {[
            { icon: '🔇', label: 'Aeva silenced' },
            { icon: '📝', label: `${questionCount} questions` },
            { icon: '⏱️', label: fmtTime(timeLimit) },
          ].map(i => (
            <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgba(255,255,255,0.40)' }}>
              <span>{i.icon}</span> {i.label}
            </div>
          ))}
        </div>

        {/* Start button */}
        <motion.button
          whileHover={!isGenerating && eligible.length ? { scale: 1.02 } : {}}
          whileTap={!isGenerating && eligible.length ? { scale: 0.97 } : {}}
          onClick={handleStart}
          disabled={isGenerating || !eligible.length}
          style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: isGenerating ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.22)', border: `1.5px solid ${isGenerating ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.50)'}`, color: isGenerating ? 'rgba(196,181,253,0.50)' : '#C4B5FD', fontSize: 14, fontWeight: 800, cursor: isGenerating || !eligible.length ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, letterSpacing: '-0.01em' }}
        >
          {isGenerating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 14, height: 14, border: '2px solid rgba(196,181,253,0.30)', borderTopColor: '#C4B5FD', borderRadius: '50%' }} />
              Generating paper…
            </>
          ) : (
            <> <Target size={15} /> Enter Exam Hall </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════
   EXAM HALL
════════════════════════════════════════════════════════════ */

function ExamHall() {
  const { questions, answers, timeLeft, timeLimit, setAnswer, submitExam, tick } = useExamStore()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [activeQ, setActiveQ] = useState(0)
  const intervalRef = useRef(null)

  // Drive the countdown
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const expired = tick()
      if (expired) {
        clearInterval(intervalRef.current)
        submitExam()
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [tick, submitExam])

  // Block escape / back gesture
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setConfirmLeave(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const pctAnswered = questions.length
    ? Math.round((Object.values(answers).filter(a => a.trim()).length / questions.length) * 100)
    : 0

  const timerColor = timeLeft < 60 ? '#F87171' : timeLeft < 5 * 60 ? '#FBBF24' : 'rgba(255,255,255,0.75)'
  const urgent = timeLeft < 5 * 60

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#070814', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}
    >
      {/* ── TOP BAR ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(7,8,20,0.95)', backdropFilter: 'blur(12px)' }}>
        {/* Left: subject + progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.7)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
              Exam in progress
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>
              {pctAnswered}% answered · {questions.length} questions
            </div>
          </div>
          {/* micro progress bar */}
          <div style={{ width: 80, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
            <motion.div animate={{ width: `${pctAnswered}%` }} transition={{ duration: 0.4 }}
              style={{ height: '100%', borderRadius: 99, background: '#4ADE80' }} />
          </div>
        </div>

        {/* Centre: timer */}
        <motion.div
          animate={urgent ? { scale: [1, 1.04, 1] } : {}}
          transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 99, background: urgent ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.05)', border: `1px solid ${urgent ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.10)'}` }}
        >
          <Clock size={13} color={timerColor} />
          <span style={{ fontSize: 18, fontWeight: 900, color: timerColor, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
            {fmtTime(timeLeft)}
          </span>
        </motion.div>

        {/* Right: leave button */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setConfirmLeave(true)}
          style={{ padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
          Leave
        </motion.button>
      </div>

      {/* ── BODY — question list + answer panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: question navigator */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>Questions</div>
          {questions.map((q, i) => {
            const answered = !!answers[q.id]?.trim()
            const active = i === activeQ
            return (
              <motion.button key={q.id} whileHover={{ x: 2 }} onClick={() => setActiveQ(i)}
                style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 11, cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(167,139,250,0.40)' : answered ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800,
                    background: answered ? 'rgba(74,222,128,0.18)' : active ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.07)',
                    color: answered ? '#4ADE80' : active ? '#C4B5FD' : 'rgba(255,255,255,0.40)',
                    border: `1px solid ${answered ? 'rgba(74,222,128,0.40)' : active ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  }}>
                    {answered ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: active ? '#C4B5FD' : 'rgba(255,255,255,0.60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.topic}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{q.marks} marks</div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Right: active question + answer */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 720 }}>
          <AnimatePresence mode="wait">
            {questions[activeQ] && (
              <motion.div key={activeQ}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}>

                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(167,139,250,0.18)', border: '1.5px solid rgba(167,139,250,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#C4B5FD', flexShrink: 0 }}>
                    {activeQ + 1}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{questions[activeQ].topic}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginLeft: 8 }}>[{questions[activeQ].marks} marks]</span>
                  </div>
                </div>

                {/* Question text */}
                <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.90)', lineHeight: 1.65, marginBottom: 24, padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {questions[activeQ].question}
                </div>

                {/* Answer box */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Your Answer</div>
                  <textarea
                    value={answers[questions[activeQ].id] || ''}
                    onChange={e => setAnswer(questions[activeQ].id, e.target.value)}
                    placeholder="Write your answer here…"
                    rows={6}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${answers[questions[activeQ].id]?.trim() ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.12)'}`, color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: "'Inter', system-ui, sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  />
                </div>

                {/* Next / Prev nav */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {activeQ > 0 && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveQ(activeQ - 1)}
                      style={{ padding: '9px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      ← Previous
                    </motion.button>
                  )}
                  {activeQ < questions.length - 1 ? (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveQ(activeQ + 1)}
                      style={{ padding: '9px 18px', borderRadius: 12, background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.35)', color: '#C4B5FD', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      Next <ArrowRight size={12} />
                    </motion.button>
                  ) : (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => submitExam()}
                      style={{ padding: '9px 20px', borderRadius: 12, background: 'rgba(74,222,128,0.18)', border: '1.5px solid rgba(74,222,128,0.45)', color: '#4ADE80', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={13} /> Submit Exam
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── SUBMIT BAR (bottom) ── */}
      <div style={{ flexShrink: 0, padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(7,8,20,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
          {Object.values(answers).filter(a => a.trim()).length} / {questions.length} answered
        </div>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => submitExam()}
          style={{ padding: '9px 22px', borderRadius: 12, background: 'rgba(74,222,128,0.16)', border: '1.5px solid rgba(74,222,128,0.40)', color: '#4ADE80', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <CheckCircle2 size={13} /> Submit &amp; Mark
        </motion.button>
      </div>

      {/* ── LEAVE CONFIRM DIALOG ── */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(4,5,18,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              style={{ width: 340, borderRadius: 20, background: '#0e0d1e', border: '1px solid rgba(255,255,255,0.10)', padding: 28, textAlign: 'center' }}>
              <AlertTriangle size={28} color="#FBBF24" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.90)', marginBottom: 8 }}>Leave exam?</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', lineHeight: 1.6, marginBottom: 22 }}>Your answers will be lost. This counts as an incomplete attempt.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmLeave(false)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Stay
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => { useExamStore.getState().reset() }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.35)', color: '#FCA5A5', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Leave
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════
   SCORING SCREEN
════════════════════════════════════════════════════════════ */

function ScoringScreen() {
  const { questions, answers, setScores } = useExamStore()
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 420)
    return () => clearInterval(id)
  }, [])

  // Kick off scoring immediately
  useEffect(() => {
    let cancelled = false
    scoreAnswers(questions, answers)
      .then(scores => { if (!cancelled) setScores(scores) })
      .catch(() => {
        // Fallback: give 50% for any answered question
        if (!cancelled) {
          const fallback = Object.fromEntries(
            questions.map(q => [q.id, answers[q.id]?.trim() ? 55 : 0])
          )
          setScores(fallback)
        }
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const msgs = ['Marking your answers…', 'Checking against mark schemes…', 'Calculating grade prediction…', 'Almost there…']
  const msgIdx = Math.min(dots, msgs.length - 1)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#070814', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", gap: 20 }}
    >
      {/* Animated spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ width: 52, height: 52, border: '3px solid rgba(167,139,250,0.15)', borderTopColor: '#A78BFA', borderRadius: '50%' }}
      />
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>
        {msgs[msgIdx]}{'.'.repeat(dots % 4)}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Aeva is marking your paper</div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════
   RESULTS SCREEN
════════════════════════════════════════════════════════════ */

function ResultsScreen() {
  const { questions, answers, scores, topicScores, earnedMarks, totalMarks, pct, prediction, markLoss, selectedRoadmapId, saveResult, reset, timeLimit } = useExamStore()
  const roadmaps = useRoadmapStore(s => s.roadmaps)
  const { setPendingChatPrompt, requestChatView } = useAevaControlStore()
  const [saved, setSaved] = useState(false)

  const roadmap = roadmaps.find(r => r.id === selectedRoadmapId)
  const grade   = prediction?.grade || calcGrade(pct).grade
  const gc      = gradeColor(grade)

  // Auto-save once on mount
  useEffect(() => {
    if (!saved) {
      saveResult()
      setSaved(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStudyTopic = (topic) => {
    const node = roadmap?.nodes?.find(n => n.topic === topic)
    if (node) {
      setPendingChatPrompt(`Teach me "${topic}" for ${roadmap.title}. I just got this wrong in a mock exam — help me understand it properly.`)
      requestChatView()
      reset()
    }
  }

  const timeTaken = timeLimit  // for now show limit; could track actual duration

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#070814', overflowY: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', marginBottom: 4 }}>Exam complete</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'rgba(255,255,255,0.92)', margin: 0, letterSpacing: '-0.03em' }}>
              {roadmap?.title || 'Results'}
            </h1>
          </div>
          <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }} onClick={reset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <RotateCcw size={12} /> New exam
          </motion.button>
        </div>

        {/* ── SCORE HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ borderRadius: 20, padding: '28px 28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden',
            background: `radial-gradient(ellipse at 70% 0%, ${gc}28 0%, rgba(8,9,26,0) 55%), #0d0c1e`,
            border: `1px solid ${gc}35`,
            boxShadow: `0 0 60px ${gc}18`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            {/* Big grade letter */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 180 }}
              style={{ width: 80, height: 80, borderRadius: 20, background: `${gc}22`, border: `2.5px solid ${gc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900, color: gc, flexShrink: 0, boxShadow: `0 0 30px ${gc}28` }}>
              {grade}
            </motion.div>

            {/* Stats */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {earnedMarks}/{totalMarks} <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>marks</span>
              </div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{pct}% · {questions.length} questions</div>

              {/* Score bar */}
              <div style={{ marginTop: 14, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${gc}88, ${gc})` }} />
              </div>
            </div>
          </div>

          {/* Grade prediction band */}
          {prediction && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={14} color="#A78BFA" />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5 }}>
                <span style={{ color: '#C4B5FD', fontWeight: 700 }}>Grade prediction: {prediction.gradeLow}–{prediction.gradeHigh}</span>
                {' '}— tracking <span style={{ color: '#C4B5FD', fontWeight: 700 }}>{prediction.low}–{prediction.high}%</span> based on readiness + this exam.
                {prediction.daysLeft > 0 && <span style={{ color: 'rgba(255,255,255,0.35)' }}> {prediction.daysLeft} days left.</span>}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── MARK LOSS CALLOUT ── */}
        {markLoss.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ borderRadius: 16, padding: '16px 20px', marginBottom: 20, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={14} color="#FBBF24" />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#FCD34D', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Costing you marks</span>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 12 }}>
              {markLoss.length === 1
                ? <><span style={{ color: '#FCD34D', fontWeight: 700 }}>{markLoss[0].topic}</span> is costing you ~{markLoss[0].markLoss} mark{markLoss[0].markLoss !== 1 ? 's' : ''}.</>
                : <><span style={{ color: '#FCD34D', fontWeight: 700 }}>{markLoss[0].topic}</span> and <span style={{ color: '#FCD34D', fontWeight: 700 }}>{markLoss[1].topic}</span> are costing you ~{markLoss[0].markLoss + markLoss[1].markLoss} marks combined.</>
              }
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {markLoss.map(ml => (
                <motion.button key={ml.topic} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => handleStudyTopic(ml.topic)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.35)', color: '#FCD34D', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <BookOpen size={11} /> Study {ml.topic}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PER-TOPIC BREAKDOWN ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Topic Breakdown</div>
          </div>
          {Object.entries(topicScores).map(([topic, score], i) => {
            const color = score >= 75 ? '#4ADE80' : score >= 50 ? '#FBBF24' : '#F87171'
            return (
              <motion.div key={topic}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < Object.keys(topicScores).length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* score pill */}
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: `${color}18`, border: `1.5px solid ${color}45`, color }}>
                  {score}%
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</div>
                  <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', marginTop: 6, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ delay: 0.5 + i * 0.04, duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 99, background: color }} />
                  </div>
                </div>
                {score < 65 && (
                  <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
                    onClick={() => handleStudyTopic(topic)}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.30)', color: '#C4B5FD', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                    <Zap size={9} /> Revise
                  </motion.button>
                )}
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── PER-QUESTION REVIEW ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>Question Review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, i) => {
              const s = scores[q.id] ?? 0
              const color = s >= 75 ? '#4ADE80' : s >= 45 ? '#FBBF24' : '#F87171'
              const earned = Math.round((s / 100) * q.marks)
              return (
                <motion.div key={q.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.03 }}
                  style={{ borderRadius: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: `${color}18`, border: `1.5px solid ${color}40`, color, marginTop: 2 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', lineHeight: 1.5, flex: 1 }}>{q.question}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color, flexShrink: 0 }}>{earned}/{q.marks}</div>
                      </div>
                      {answers[q.id]?.trim() ? (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${color}55` }}>
                          {answers[q.id]}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'rgba(248,113,113,0.55)', fontStyle: 'italic' }}>No answer given</div>
                      )}
                      {/* Mark scheme hint (collapsed) */}
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <ChevronDown size={10} /> Mark scheme
                        </summary>
                        <div style={{ marginTop: 6, fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                          {q.markScheme}
                        </div>
                      </details>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════
   ROOT — always mounted, listens for open events
════════════════════════════════════════════════════════════ */

export default function ExamSimulator() {
  const phase = useExamStore(s => s.phase)
  const { openSetup } = useExamStore()

  // Allow other components to open via custom event
  useEffect(() => {
    const handler = (e) => openSetup(e.detail?.roadmapId || null)
    window.addEventListener('aeva:open-exam', handler)
    return () => window.removeEventListener('aeva:open-exam', handler)
  }, [openSetup])

  return (
    <AnimatePresence mode="wait">
      {phase === 'setup'   && <SetupModal   key="setup"   />}
      {phase === 'active'  && <ExamHall     key="active"  />}
      {phase === 'scoring' && <ScoringScreen key="scoring" />}
      {phase === 'results' && <ResultsScreen key="results" />}
    </AnimatePresence>
  )
}

/** Button that opens exam setup — drop anywhere */
export function ExamSimulatorButton({ roadmapId, style, children }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
      onClick={() => window.dispatchEvent(new CustomEvent('aeva:open-exam', { detail: { roadmapId } }))}
      style={style}
    >
      {children || '📝 Exam Mode'}
    </motion.button>
  )
}
