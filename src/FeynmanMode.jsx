import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Send, X } from 'lucide-react'
import { useNeuralStore } from './neuralStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const COLOR        = '#F59E0B'
const COLOR_DIM    = 'rgba(245,158,11,0.12)'
const COLOR_BORDER = 'rgba(245,158,11,0.30)'

function gradeColor(g) {
  if (!g) return 'rgba(255,255,255,0.4)'
  if (g[0] === 'A') return '#4ADE80'
  if (g[0] === 'B') return '#60A5FA'
  if (g[0] === 'C') return '#FBBF24'
  return '#F87171'
}

function buildStudentPrompt(topic) {
  return `You are Aeva, but right now you are playing a confused student who is trying to understand "${topic}". The user is your teacher for this session.

STRICT RULES — obey every single one:
- You are genuinely confused. You do NOT already understand this topic.
- Maximum 2 sentences per response.
- Ask EXACTLY one focused question per message. Never more than one.
- Never explain or teach. Only ask questions or react with confusion.
- Probe undefined terms immediately: "Wait, what does [term] actually mean?"
- Probe logical gaps: "Hold on, why does that actually work though?"
- Probe skipped steps: "You went from X to Y — what happened in between?"
- Probe vague analogies: "I sort of follow the analogy, but I'm still confused about [specific part]."
- When the user uses a technical word without defining it, flag it: "You said [term] — what does that mean exactly?"
- Sound like a curious but frustrated student, not a professor or tutor.
- Do not congratulate the user or say things like "great explanation."

COMPLETION RULE: After the user has made at least 7 exchanges AND their explanation covers: the core concept, the mechanism (HOW it works), AND at least one concrete example — emit [FEYNMAN_COMPLETE] on its own line at the very end of your message. Only emit it when you genuinely feel you understand the concept. Do not emit it early.`
}

async function scoreTeaching(messages, topic) {
  const transcript = messages
    .map(m => `${m.role === 'student' ? 'STUDENT (Aeva)' : 'TEACHER (User)'}: ${m.text}`)
    .join('\n\n')

  const prompt = `You are assessing a teaching session. The user was teaching: "${topic}".

Transcript:
${transcript}

Score the user's ability to explain this topic clearly. Return ONLY valid JSON with no extra text:
{
  "depth": "A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"D",
  "clarity": "A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"D",
  "completeness": "A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"D",
  "verdict": "Exam Ready"|"Needs Review"|"Surface Only",
  "verdictReason": "one sentence",
  "gaps": ["specific gap 1", "specific gap 2"],
  "strongMoments": ["one specific strength from the transcript"],
  "summary": "2-3 sentences of honest, direct feedback on the explanation quality"
}

Criteria:
- Depth: did they explain the underlying mechanism, not just surface facts?
- Clarity: could a newcomer follow without needing to Google extra terms?
- Completeness: did they address the core concept, how it works, and when it applies?
- "Exam Ready" = they could sit an exam on this right now
- "Needs Review" = good foundation but gaps remain
- "Surface Only" = they described it without actually understanding the mechanism

Be precise. Generic feedback is useless.`

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.15,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error('Score request failed')
    const json = await res.json()
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}')
    return {
      depth: 'B', clarity: 'B', completeness: 'B',
      verdict: 'Needs Review', verdictReason: 'Session complete.',
      gaps: [], strongMoments: [], summary: 'Teaching session complete.',
      ...parsed,
    }
  } catch {
    return {
      depth: 'B', clarity: 'B', completeness: 'B',
      verdict: 'Needs Review', verdictReason: 'Could not fully score this session.',
      gaps: [], strongMoments: [], summary: 'Your teaching session is done. Review your explanation and identify any terms you defined poorly.',
    }
  }
}

async function streamStudentResponse(history, topic, onChunk, signal) {
  const messages = [
    { role: 'system', content: buildStudentPrompt(topic) },
    ...history.map(m => ({
      role: m.role === 'student' ? 'assistant' : 'user',
      content: m.text,
    })),
  ]

  const res = await fetch(GROQ_URL, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages,
      stream: true,
      temperature: 0.88,
      max_tokens: 130,
    }),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const chunk = JSON.parse(data).choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch { /* skip partial */ }
    }
  }
}

/* ── SetupScreen ────────────────────────────────────── */
function SetupScreen({ onStart }) {
  const { masteredTopics, struggleZones } = useNeuralStore()
  const [topic, setTopic] = useState('')
  const canStart = topic.trim().length >= 3

  const suggestions = [
    ...masteredTopics.slice(-4).map(t => ({ label: t, type: 'mastered' })),
    ...struggleZones.slice(-3).map(t => ({ label: t, type: 'struggle' })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 26 }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 46, marginBottom: 14, display: 'inline-block' }}
          >
            🎓
          </motion.div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 30, fontWeight: 400, color: 'rgba(255,255,255,0.94)',
            lineHeight: 1.2, margin: '0 0 10px',
          }}>
            Teach It Back
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, maxWidth: 380, margin: '0 auto' }}>
            Aeva becomes a confused student. You become the teacher.<br />
            Her questions will expose exactly where your understanding cracks.
          </p>
        </div>

        {/* Topic input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: COLOR, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            What do you want to teach?
          </label>
          <input
            autoFocus
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canStart) onStart(topic.trim()) }}
            placeholder="e.g. recursion, mitosis, Newton's third law, supply and demand…"
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 16,
              background: 'rgba(245,158,11,0.07)',
              border: `1.5px solid ${canStart ? COLOR_BORDER : 'rgba(255,255,255,0.10)'}`,
              color: 'rgba(255,255,255,0.92)',
              fontSize: 15, fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none', transition: 'border 0.2s',
            }}
          />
        </div>

        {/* Profile suggestions */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              From your profile
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.map(s => (
                <motion.button
                  key={s.label}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setTopic(s.label)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
                    background: s.type === 'mastered' ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.09)',
                    border: `1px solid ${s.type === 'mastered' ? 'rgba(74,222,128,0.26)' : 'rgba(248,113,113,0.25)'}`,
                    color: s.type === 'mastered' ? '#86EFAC' : '#FCA5A5',
                    fontSize: 12, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {s.type === 'mastered' ? '✓' : '⚠'} {s.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Start button */}
        <motion.button
          whileHover={canStart ? { scale: 1.02 } : {}}
          whileTap={canStart ? { scale: 0.97 } : {}}
          onClick={() => canStart && onStart(topic.trim())}
          style={{
            padding: '16px', borderRadius: 18,
            cursor: canStart ? 'pointer' : 'default',
            background: canStart
              ? 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(251,191,36,0.18))'
              : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${canStart ? 'rgba(245,158,11,0.50)' : 'rgba(255,255,255,0.10)'}`,
            color: canStart ? '#FDE68A' : 'rgba(255,255,255,0.38)',
            fontSize: 15, fontWeight: 800,
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.01em', transition: 'all 0.2s',
          }}
        >
          Start Teaching →
        </motion.button>
      </motion.div>
    </div>
  )
}

/* ── TeachingSession ────────────────────────────────── */
function TeachingSession({ topic, onComplete }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(true)
  const [exchangeCount, setExchangeCount] = useState(0)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const completeRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const triggerStudentResponse = useCallback(async (history) => {
    const controller = new AbortController()
    abortRef.current = controller
    setIsThinking(true)
    setMessages(prev => [...prev, { role: 'student', text: '', streaming: true }])

    let raw = ''
    try {
      await streamStudentResponse(
        history,
        topic,
        chunk => {
          raw += chunk
          setMessages(prev => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, text: raw.replace(/\[FEYNMAN_COMPLETE\]/g, '').trim() }
            return copy
          })
        },
        controller.signal,
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], text: "I'm still confused — can you explain more?", streaming: false }
          return copy
        })
      }
    } finally {
      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
      inputRef.current?.focus()

      if (raw.includes('[FEYNMAN_COMPLETE]') && !completeRef.current) {
        completeRef.current = true
        const finalMsgs = [...history, { role: 'student', text: raw.replace(/\[FEYNMAN_COMPLETE\]/g, '').trim() }]
        setTimeout(() => onComplete(finalMsgs), 1400)
      }
    }
  }, [topic, onComplete])

  // Aeva opens with a confused intro
  useEffect(() => {
    triggerStudentResponse([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || isThinking) return
    setInput('')

    const userMsg = { role: 'teacher', text }
    const history = [...messages.filter(m => !m.streaming), userMsg]
    setMessages(history)
    setExchangeCount(n => n + 1)
    await triggerStudentResponse(history)
  }

  const canFinish = exchangeCount >= 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* HUD strip */}
      <div style={{
        flexShrink: 0, padding: '10px 20px',
        borderBottom: `1px solid ${COLOR_BORDER}`,
        background: 'rgba(245,158,11,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR, boxShadow: `0 0 8px ${COLOR}` }}
          />
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: COLOR, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              Feynman Mode — Live
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: 500 }}>
              Teaching: <span style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 700 }}>{topic}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
            {exchangeCount} exchange{exchangeCount !== 1 ? 's' : ''}
          </span>
          <AnimatePresence>
            {canFinish && (
              <motion.button
                initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => onComplete(messages.filter(m => !m.streaming))}
                style={{
                  padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
                  background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`,
                  color: COLOR, fontSize: 11.5, fontWeight: 700,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Finish & Score
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', justifyContent: msg.role === 'teacher' ? 'flex-end' : 'flex-start' }}
            >
              <div style={{
                maxWidth: '78%',
                padding: '12px 16px',
                borderRadius: msg.role === 'teacher' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                background: msg.role === 'teacher' ? 'rgba(139,143,255,0.18)' : COLOR_DIM,
                border: msg.role === 'teacher' ? '1px solid rgba(139,143,255,0.32)' : `1px solid ${COLOR_BORDER}`,
                color: 'rgba(255,255,255,0.88)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 14.5, lineHeight: 1.6,
              }}>
                {msg.role === 'student' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                    <span style={{ fontSize: 10 }}>🎓</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: COLOR, opacity: 0.85 }}>
                      Aeva (confused student)
                    </span>
                  </div>
                )}
                <span style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                  {msg.streaming && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.85, repeat: Infinity }}
                      style={{ display: 'inline-block', width: 2, height: 14, background: COLOR, marginLeft: 3, verticalAlign: 'middle', borderRadius: 1 }}
                    />
                  )}
                </span>
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 20px 30px' }}>
        <div style={{
          maxWidth: 640, width: '100%', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 10px 10px 18px', borderRadius: 999,
          background: 'rgba(255,255,255,0.05)',
          border: `1.5px solid ${isThinking ? COLOR_BORDER : 'rgba(255,255,255,0.12)'}`,
          backdropFilter: 'blur(40px)', transition: 'border 0.2s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={isThinking ? 'Aeva is thinking…' : 'Explain it clearly…'}
            disabled={isThinking}
            style={{
              flex: 1, background: 'transparent', outline: 'none', border: 'none',
              color: 'rgba(255,255,255,0.90)',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 15, opacity: isThinking ? 0.35 : 1,
            }}
          />
          <motion.button
            whileTap={!isThinking && input.trim() ? { scale: 0.84 } : {}}
            onClick={send}
            disabled={isThinking || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !isThinking
                ? 'linear-gradient(145deg, rgba(245,158,11,0.80), rgba(251,191,36,0.55))'
                : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${input.trim() && !isThinking ? 'rgba(245,158,11,0.65)' : 'rgba(255,255,255,0.10)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !isThinking ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            <Send size={15} color={input.trim() && !isThinking ? '#1a0a00' : 'rgba(255,255,255,0.22)'} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

/* ── ScoringScreen ──────────────────────────────────── */
function ScoringScreen({ topic, messages, onRestart, onClose }) {
  const [score, setScore] = useState(null)

  useEffect(() => {
    scoreTeaching(messages, topic).then(setScore)
  }, [messages, topic])

  const VERDICT_CONFIG = {
    'Exam Ready':   { color: '#4ADE80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.28)',  icon: '🏆' },
    'Needs Review': { color: '#FBBF24', bg: 'rgba(251,191,36,0.09)',  border: 'rgba(251,191,36,0.28)',  icon: '📚' },
    'Surface Only': { color: '#F87171', bg: 'rgba(248,113,113,0.09)', border: 'rgba(248,113,113,0.26)', icon: '⚠️' },
  }

  if (!score) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <motion.div
          animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${COLOR_BORDER}`, borderTopColor: COLOR }}
        />
        <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Assessing your teaching…
        </span>
      </div>
    )
  }

  const vc = VERDICT_CONFIG[score.verdict] || VERDICT_CONFIG['Needs Review']

  return (
    <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 48px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Verdict */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '20px 22px', borderRadius: 20, background: vc.bg, border: `1px solid ${vc.border}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{vc.icon}</span>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: vc.color, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 2 }}>
                Verdict
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: vc.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {score.verdict}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
            {score.verdictReason}
          </div>
        </motion.div>

        {/* Grade cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: '18px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14 }}>
            Breakdown
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Depth',        grade: score.depth,        desc: 'Underlying mechanism' },
              { label: 'Clarity',      grade: score.clarity,      desc: 'No jargon, no gaps' },
              { label: 'Completeness', grade: score.completeness, desc: 'Full concept covered' },
            ].map(({ label, grade, desc }) => (
              <div key={label} style={{
                flex: 1, padding: '14px 12px', borderRadius: 14, textAlign: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.15 }}
                  style={{ fontSize: 28, fontWeight: 800, color: gradeColor(grade), letterSpacing: '-0.04em', marginBottom: 3 }}
                >
                  {grade}
                </motion.div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.72)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.35 }}>{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Gaps */}
        {score.gaps?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.20)' }}
          >
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#FCA5A5', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
              Gaps Exposed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {score.gaps.map((gap, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#F87171', marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.55 }}>{gap}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Strong moments */}
        {score.strongMoments?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.20)' }}
          >
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#86EFAC', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
              What Landed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {score.strongMoments.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ADE80', marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.55 }}>{m}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Aeva's take */}
        {score.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.30 }}
            style={{ padding: '16px 18px', borderRadius: 16, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}` }}
          >
            <div style={{ fontSize: 9.5, fontWeight: 700, color: COLOR, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
              Aeva's Take
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
              {score.summary}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          style={{ display: 'flex', gap: 10, paddingTop: 4 }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onRestart}
            style={{
              flex: 1, padding: '14px', borderRadius: 16, cursor: 'pointer',
              background: COLOR_DIM, border: `1.5px solid ${COLOR_BORDER}`,
              color: '#FDE68A', fontSize: 14, fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Teach Again
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: 16, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Done
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

/* ── Main FeynmanMode component ─────────────────────── */
export default function FeynmanMode({ onClose }) {
  const [phase, setPhase] = useState('setup')
  const [topic, setTopic] = useState('')
  const [finalMessages, setFinalMessages] = useState([])

  const handleStart = useCallback((t) => {
    setTopic(t)
    setPhase('teaching')
    setFinalMessages([])
  }, [])

  const handleComplete = useCallback((msgs) => {
    setFinalMessages(msgs)
    setPhase('scoring')
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('setup')
    setTopic('')
    setFinalMessages([])
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,5,16,0.97)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Ambient amber glow */}
      <div aria-hidden style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.10) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '15px 22px',
        borderBottom: `1px solid ${phase === 'setup' ? 'rgba(255,255,255,0.07)' : COLOR_BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.02)',
      }}>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={phase === 'scoring' ? handleRestart : onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 99,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <ChevronLeft size={13} strokeWidth={2.5} />
          {phase === 'scoring' ? 'Teach Again' : 'Exit'}
        </motion.button>

        {/* Center label */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <span style={{ fontSize: 13 }}>🎓</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: COLOR, letterSpacing: '-0.01em' }}>
            Teach It Back
          </span>
          {phase !== 'setup' && (
            <div style={{
              padding: '3px 9px', borderRadius: 99,
              background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`,
              fontSize: 9.5, fontWeight: 700, color: COLOR,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {phase === 'teaching' ? 'Live' : 'Results'}
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }}
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={13} />
        </motion.button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
              <SetupScreen onStart={handleStart} />
            </motion.div>
          )}
          {phase === 'teaching' && (
            <motion.div key="teaching" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.28 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <TeachingSession topic={topic} onComplete={handleComplete} />
            </motion.div>
          )}
          {phase === 'scoring' && (
            <motion.div key="scoring" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <ScoringScreen topic={topic} messages={finalMessages} onRestart={handleRestart} onClose={onClose} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
