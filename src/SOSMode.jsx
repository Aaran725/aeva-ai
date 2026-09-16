import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Check, RefreshCw } from 'lucide-react'
import { nextGroqKey, GROQ_URL, GROQ_KEYS , MODEL_FAST, MODEL_SMART, MODEL_VISION } from './groqClient'

async function groqFetch(init, attempt = 0) {
  const MAX = GROQ_KEYS.length * 2
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
    ...init,
  })
  if (res.status === 429 && attempt < MAX) {
    const secs = attempt < GROQ_KEYS.length ? 0 : Math.min(4 * Math.pow(2, attempt - GROQ_KEYS.length), 30)
    if (secs > 0) await new Promise(r => setTimeout(r, secs * 1000))
    return groqFetch(init, attempt + 1)
  }
  return res
}

/* ── Phase: input ───────────────────────────────────────────────────────────── */
function PhaseInput({ onStart }) {
  const [topic, setTopic] = useState('')

  return (
    <motion.div
      key="input"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🆘</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', margin: '0 0 8px', lineHeight: 1.1 }}>
          What don't you get?
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', margin: 0 }}>
          Type any topic. Aeva explains it, then checks you understood.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          autoFocus
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && topic.trim()) { e.preventDefault(); onStart(topic.trim()) } }}
          placeholder="e.g. mitosis, integration by parts, supply and demand…"
          rows={3}
          style={{
            padding: '16px 18px', borderRadius: 16, resize: 'none',
            background: 'rgba(255,255,255,0.07)',
            border: '1.5px solid rgba(255,255,255,0.14)',
            color: '#fff', fontSize: 16, fontFamily: 'inherit',
            outline: 'none', width: '100%', boxSizing: 'border-box',
            lineHeight: 1.6, transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.55)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'}
        />

        <motion.button
          whileHover={topic.trim() ? { scale: 1.02, boxShadow: '0 12px 40px rgba(248,113,113,0.45)' } : {}}
          whileTap={topic.trim() ? { scale: 0.97 } : {}}
          onClick={() => topic.trim() && onStart(topic.trim())}
          style={{
            padding: '16px', borderRadius: 14,
            background: topic.trim()
              ? 'linear-gradient(135deg, #DC2626, #EF4444)'
              : 'rgba(255,255,255,0.06)',
            border: topic.trim() ? '1px solid rgba(248,113,113,0.40)' : '1px solid rgba(255,255,255,0.08)',
            color: topic.trim() ? 'white' : 'rgba(255,255,255,0.25)',
            fontSize: 16, fontWeight: 800, cursor: topic.trim() ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          Explain it to me <ArrowRight size={18} />
        </motion.button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Photosynthesis', 'Integration', 'Supply & demand', 'Newton\'s laws', 'DNA replication'].map(eg => (
          <motion.button key={eg} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onStart(eg)}
            style={{
              padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500,
            }}
          >
            {eg}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Phase: explaining ──────────────────────────────────────────────────────── */
function PhaseExplaining({ topic, explanation }) {
  const words = explanation.trim().split(/\s+/).filter(Boolean).length

  return (
    <motion.div
      key="explaining"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Explaining "{topic}"
          </span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 18, padding: '20px 22px', minHeight: 160,
        }}>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
            {explanation || ' '}
            {explanation.length > 0 && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{ display: 'inline-block', width: 2, height: '1em', background: '#EF4444', borderRadius: 1, marginLeft: 3, verticalAlign: 'text-bottom' }}
              />
            )}
          </p>
        </div>
      </div>

      {words > 20 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', textAlign: 'center', margin: 0 }}>
          Generating 3 questions to check you got it…
        </motion.p>
      )}
    </motion.div>
  )
}

/* ── Phase: quiz ────────────────────────────────────────────────────────────── */
function PhaseQuiz({ topic, questions, answers, onAnswer }) {
  const current = Object.keys(answers).length
  const q = questions[current]
  if (!q) return null

  return (
    <motion.div
      key={`quiz-${current}`}
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}
    >
      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Question {current + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>{topic}</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${((current) / questions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #EF4444, #F87171)', borderRadius: 99 }}
          />
        </div>
      </div>

      {/* Question */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 18, padding: '20px 22px',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.5, letterSpacing: '-0.02em' }}>
          {q.q}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, oi) => (
          <motion.button
            key={oi}
            whileHover={{ scale: 1.01, x: 3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAnswer(current, oi)}
            style={{
              width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 14,
              cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: 500, lineHeight: 1.4,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Phase: result ──────────────────────────────────────────────────────────── */
function PhaseResult({ topic, questions, answers, timeTaken, onRetry, onClose }) {
  const score = questions.filter((q, i) => answers[i] === q.correct).length
  const total = questions.length
  const pct   = Math.round((score / total) * 100)
  const mins  = Math.floor(timeTaken / 60)
  const secs  = timeTaken % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  const got = score === total

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', alignItems: 'center', textAlign: 'center' }}
    >
      {/* Big result */}
      <div>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}
        >
          {got ? '🎯' : score >= total / 2 ? '💪' : '📚'}
        </motion.div>

        <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', margin: '0 0 8px', lineHeight: 1.1 }}>
          {got
            ? 'You got it.'
            : score >= total / 2
              ? 'Nearly there.'
              : 'Keep going.'}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          {score}/{total} correct · {timeStr} · {topic}
        </p>
      </div>

      {/* Score ring */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r="50" fill="none"
            stroke={got ? '#4ADE80' : score >= total / 2 ? '#FBBF24' : '#EF4444'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - pct / 100) }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{pct}%</span>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {questions.map((q, i) => {
          const correct = answers[i] === q.correct
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
              borderRadius: 12,
              background: correct ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
              border: `1px solid ${correct ? 'rgba(74,222,128,0.20)' : 'rgba(248,113,113,0.20)'}`,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: correct ? 'rgba(74,222,128,0.20)' : 'rgba(248,113,113,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {correct
                  ? <Check size={12} color="#4ADE80" strokeWidth={3} />
                  : <span style={{ fontSize: 11, color: '#F87171', fontWeight: 800 }}>✕</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, marginBottom: correct ? 0 : 4 }}>{q.q}</div>
                {!correct && (
                  <div style={{ fontSize: 12, color: '#4ADE80' }}>
                    ✓ {q.options[q.correct]}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* The "you got it" moment */}
      {got && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          style={{
            padding: '14px 20px', borderRadius: 14, width: '100%',
            background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.22)',
          }}
        >
          <p style={{ fontSize: 14, color: '#4ADE80', margin: 0, fontWeight: 600 }}>
            You went from stuck → understood in {timeStr}. That's one topic you won't lose marks on.
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          style={{
            flex: 1, padding: '13px', borderRadius: 13,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <RefreshCw size={14} /> Try another
        </motion.button>
        <motion.button whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(239,68,68,0.38)' }} whileTap={{ scale: 0.97 }}
          onClick={onClose}
          style={{
            flex: 1, padding: '13px', borderRadius: 13,
            background: 'linear-gradient(135deg, #DC2626, #EF4444)',
            border: '1px solid rgba(248,113,113,0.40)',
            color: 'white', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          Done
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ═══ MAIN SOS MODE ══════════════════════════════════════════════════════════ */
export default function SOSMode({ onClose }) {
  const [phase, setPhase]           = useState('input')
  const [topic, setTopic]           = useState('')
  const [explanation, setExplanation] = useState('')
  const [questions, setQuestions]   = useState([])
  const [answers, setAnswers]       = useState({})
  const [startTime, setStartTime]   = useState(null)
  const [timeTaken, setTimeTaken]   = useState(0)
  const abortRef                    = useRef(null)

  const handleStart = useCallback(async (t) => {
    setTopic(t)
    setPhase('explaining')
    setExplanation('')
    setStartTime(Date.now())

    const ac = new AbortController()
    abortRef.current = ac

    try {
      // Stream explanation
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({
          model: MODEL_SMART,
          messages: [
            { role: 'system', content: 'You are Aeva, an expert tutor. Explain clearly and concisely. Use simple, plain language. Give one analogy if it helps. Be direct — no intro fluff, no "Great question!". Max 180 words.' },
            { role: 'user', content: `Explain "${t}" simply. I genuinely don't understand it.` },
          ],
          stream: true,
          max_tokens: 280,
          temperature: 0.3,
        }),
      })

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const delta = JSON.parse(raw).choices?.[0]?.delta?.content || ''
            text += delta
            setExplanation(text)
          } catch {}
        }
      }

      // Generate 3 questions
      const qRes = await groqFetch({
        body: JSON.stringify({
          model: MODEL_FAST,
          messages: [{
            role: 'user',
            content: `Based on this explanation of "${t}":\n\n${text}\n\nGenerate exactly 3 multiple choice questions. Return ONLY valid JSON:\n{"questions":[{"q":"question","options":["A) opt","B) opt","C) opt","D) opt"],"correct":0}]}\ncorrect is the 0-based index. Make questions progressively harder.`,
          }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 600,
        }),
      })

      const qData  = await qRes.json()
      const parsed = JSON.parse(qData.choices[0].message.content)
      setQuestions(parsed.questions || [])
      setAnswers({})
      setPhase('quiz')
    } catch (e) {
      if (e.name !== 'AbortError') setPhase('input')
    }
  }, [])

  const handleAnswer = useCallback((qi, optionIndex) => {
    setAnswers(prev => {
      const next = { ...prev, [qi]: optionIndex }
      if (Object.keys(next).length === questions.length) {
        setTimeTaken(Math.round((Date.now() - startTime) / 1000))
        setTimeout(() => setPhase('result'), 350)
      }
      return next
    })
  }, [questions.length, startTime])

  const handleRetry = () => {
    if (abortRef.current) abortRef.current.abort()
    setPhase('input')
    setTopic('')
    setExplanation('')
    setQuestions([])
    setAnswers({})
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(3,4,15,0.94)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Background glow */}
      <div aria-hidden style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Close */}
      <motion.button
        whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.12)' }}
        whileTap={{ scale: 0.93 }}
        onClick={() => { if (abortRef.current) abortRef.current.abort(); onClose() }}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <X size={16} />
      </motion.button>

      {/* Content card */}
      <div style={{
        width: '100%', maxWidth: 480, position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 28, padding: '32px 28px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <PhaseInput key="input" onStart={handleStart} />
          )}
          {phase === 'explaining' && (
            <PhaseExplaining key="explaining" topic={topic} explanation={explanation} />
          )}
          {phase === 'quiz' && (
            <PhaseQuiz key="quiz" topic={topic} questions={questions} answers={answers} onAnswer={handleAnswer} />
          )}
          {phase === 'result' && (
            <PhaseResult
              key="result"
              topic={topic}
              questions={questions}
              answers={answers}
              timeTaken={timeTaken}
              onRetry={handleRetry}
              onClose={() => { if (abortRef.current) abortRef.current.abort(); onClose() }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
