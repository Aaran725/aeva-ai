import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Send, AlertTriangle, Zap, Shield, X, Download } from 'lucide-react'
import { useArcadeStore } from './arcadeStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const ROUND_LABELS = {
  opening:   { num: 1, label: 'Opening Statement', hint: 'State your position clearly. What is your core argument FOR UBI?' },
  rebuttal1: { num: 2, label: 'First Rebuttal',    hint: 'Directly challenge Aeva\'s opening. Cite evidence or logic.' },
  rebuttal2: { num: 3, label: 'Second Rebuttal',   hint: 'Press harder. Address the funding or targeting critiques.' },
  closing:   { num: 4, label: 'Closing Argument',  hint: 'Your final shot. Summarise your strongest case.' },
  scoring:   { num: 5, label: 'Results',            hint: '' },
}

const COLOR = '#A78BFA'
const COLOR_DIM = 'rgba(167,139,250,0.15)'
const COLOR_BORDER = 'rgba(167,139,250,0.30)'
const COLOR_GLOW = 'rgba(167,139,250,0.20)'

function logicColor(v) {
  if (v >= 75) return '#4ADE80'
  if (v >= 50) return '#FBBF24'
  return '#F87171'
}

function gradeColor(g) {
  if (!g) return 'rgba(255,255,255,0.4)'
  const first = g[0]
  if (first === 'A') return '#4ADE80'
  if (first === 'B') return '#60A5FA'
  if (first === 'C') return '#FBBF24'
  return '#F87171'
}

/* ── Scoring call ─────────────────────────────────────── */
async function scoreDebate(transcript, signal) {
  const prompt = `You are a debate judge. Score this debate transcript where the user argued FOR Universal Basic Income and the AI argued AGAINST.

TRANSCRIPT:
${transcript}

Return ONLY valid JSON — no markdown fences, no commentary:
{
  "evidence": "B+",
  "clarity": "A-",
  "rhetoric": "B",
  "final": "B+",
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"],
  "summary": "2-3 sentence overall critique"
}

Grades must be A+/A/A-/B+/B/B-/C+/C/C-/D/F only. Be honest and specific.`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    signal,
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  try { return JSON.parse(raw) } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch {} }
    return { evidence: 'B', clarity: 'B', rhetoric: 'B', final: 'B', strengths: [], improvements: [], summary: 'Debate complete.' }
  }
}

/* ── Strip arena tags from display text ──────────────── */
function cleanArenaText(t) {
  return t
    .replace(/\[LOGIC:\s*\d+\]/gi, '')
    .replace(/\[COUNTER:\s*[^\]]+\]/gi, '')
    .replace(/\[STEELMAN:\s*[^\]]+\]/gi, '')
    .replace(/\[FALLACY:\s*[^\]]+\]/gi, '')
    .replace(/\[ACTIONS:\s*[^\]]+\]/gi, '')
    .replace(/^\s*\n/gm, '\n')
    .trim()
}

/* ── PDF / transcript export ─────────────────────────── */
function exportTranscript(messages, score) {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '                  AEVA DEBATE ARENA',
    '              Debate Transcript & Critique',
    '═══════════════════════════════════════════════════════',
    `Topic: Universal Basic Income`,
    `User Position: FOR  |  Aeva Position: AGAINST (Job Guarantee)`,
    `Date: ${new Date().toLocaleDateString()}`,
    '───────────────────────────────────────────────────────',
    '',
  ]
  messages.forEach(m => {
    lines.push(`[${m.role === 'user' ? 'YOU' : 'AEVA'}] — Round ${m.round || '?'}`)
    lines.push(m.clean || m.content)
    lines.push('')
  })
  if (score) {
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('                     SCORECARD')
    lines.push('═══════════════════════════════════════════════════════')
    lines.push(`Evidence:  ${score.evidence}`)
    lines.push(`Clarity:   ${score.clarity}`)
    lines.push(`Rhetoric:  ${score.rhetoric}`)
    lines.push(`─────────────────────`)
    lines.push(`FINAL GRADE: ${score.final}`)
    lines.push('')
    if (score.strengths?.length) {
      lines.push('Strengths:')
      score.strengths.forEach(s => lines.push(`  • ${s}`))
      lines.push('')
    }
    if (score.improvements?.length) {
      lines.push('Areas to Improve:')
      score.improvements.forEach(s => lines.push(`  • ${s}`))
      lines.push('')
    }
    if (score.summary) {
      lines.push('Judge\'s Summary:')
      lines.push(score.summary)
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'aeva-debate-transcript.txt'; a.click()
  URL.revokeObjectURL(url)
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function DebateArena({ onBack }) {
  const { activeMission, arenaState, processAIResponse, advanceArenaRound, setArenaScore, dismissArenaFallacy } = useArcadeStore()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [quickActions, setQuickActions] = useState([])
  const [scoringInProgress, setScoringInProgress] = useState(false)

  const flowRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const roundRef = useRef(arenaState.round)

  // Keep roundRef in sync
  useEffect(() => { roundRef.current = arenaState.round }, [arenaState.round])

  const isScoring = arenaState.round === 'scoring'
  const score = arenaState.score

  // Auto-scroll argument flow
  useEffect(() => {
    if (flowRef.current) flowRef.current.scrollTop = flowRef.current.scrollHeight
  }, [messages])

  // Kick off Aeva's opening on mount
  useEffect(() => {
    if (!activeMission) return
    triggerAevaResponse([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Call Groq and stream into a new assistant message ── */
  const triggerAevaResponse = useCallback(async (history) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setIsThinking(true)
    const systemPrompt = activeMission.systemPrompt

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.75,
          max_tokens: 250,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })

      let full = ''
      const reader = res.body.getReader()
      const dec = new TextDecoder()

      // Add placeholder message
      const placeholderId = Date.now()
      setMessages(prev => [...prev, { id: placeholderId, role: 'assistant', content: '', clean: '', round: roundRef.current }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: ') && !l.includes('[DONE]'))
        for (const line of lines) {
          try {
            const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''
            full += delta
            setMessages(prev => prev.map(m =>
              m.id === placeholderId
                ? { ...m, content: full, clean: cleanArenaText(full) }
                : m
            ))
          } catch {}
        }
      }

      // Parse tags and update store
      processAIResponse(full)

      // Extract quick actions
      const actMatch = full.match(/\[ACTIONS:\s*([^\]]+)\]/i)
      if (actMatch) {
        setQuickActions(actMatch[1].split('|').map(a => a.trim()).filter(Boolean).slice(0, 3))
      } else {
        setQuickActions([])
      }

    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: 'Something went wrong. Please try again.', clean: 'Something went wrong. Please try again.', round: roundRef.current }])
      }
    } finally {
      setIsThinking(false)
    }
  }, [activeMission, processAIResponse])

  /* ── User sends a turn ─────────────────────────────── */
  const handleSend = useCallback(async (text) => {
    const t = (text || input).trim()
    if (!t || isThinking || isScoring) return
    setInput('')
    setQuickActions([])

    const currentRound = roundRef.current
    const userMsg = { id: Date.now(), role: 'user', content: t, clean: t, round: currentRound }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)

    // Advance round
    advanceArenaRound()

    const nextRound = (() => {
      const ROUNDS = ['opening', 'rebuttal1', 'rebuttal2', 'closing', 'scoring']
      const cur = ROUNDS.indexOf(currentRound)
      return ROUNDS[Math.min(cur + 1, ROUNDS.length - 1)]
    })()

    if (nextRound === 'scoring') {
      // Trigger scoring
      setScoringInProgress(true)
      try {
        const transcript = nextMessages
          .map(m => `[${m.role === 'user' ? 'USER (FOR UBI)' : 'AEVA (AGAINST UBI)'}]\n${m.clean || m.content}`)
          .join('\n\n')
        const result = await scoreDebate(transcript, new AbortController().signal)
        setArenaScore(result)
      } catch {
        setArenaScore({ evidence: 'B', clarity: 'B', rhetoric: 'B', final: 'B', strengths: [], improvements: [], summary: 'Debate complete.' })
      } finally {
        setScoringInProgress(false)
      }
    } else {
      await triggerAevaResponse(nextMessages)
    }
  }, [input, isThinking, isScoring, messages, advanceArenaRound, setArenaScore, triggerAevaResponse])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const ROUND_INFO = ROUND_LABELS[arenaState.round] || ROUND_LABELS.closing
  const totalRounds = 4

  /* ═══════════════════════════════════════════════════
     SCORING SCREEN
     ═══════════════════════════════════════════════════ */
  if (isScoring) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: 'fixed', inset: 0, background: '#08091a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", zIndex: 100 }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLOR_BORDER}` }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ChevronLeft size={14} strokeWidth={2.5} /> Exit Arena
          </motion.button>
          <span style={{ fontSize: 14, fontWeight: 800, color: COLOR, letterSpacing: '-0.02em' }}>⚔️ Debate Complete</span>
          <div style={{ width: 80 }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {scoringInProgress || !score ? (
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: 13, color: COLOR, fontWeight: 600 }}>
              Evaluating your debate...
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Grade cards */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Evidence', value: score.evidence },
                  { label: 'Clarity', value: score.clarity },
                  { label: 'Rhetoric', value: score.rhetoric },
                ].map(g => (
                  <div key={g.label} style={{ flex: 1, padding: '20px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLOR_BORDER}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor(g.value), letterSpacing: '-0.04em' }}>{g.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{g.label}</div>
                  </div>
                ))}
              </div>

              {/* Final grade */}
              <div style={{ padding: '20px 24px', borderRadius: 16, background: `${COLOR}15`, border: `1px solid ${COLOR_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Final Grade</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: gradeColor(score.final), letterSpacing: '-0.04em', lineHeight: 1 }}>{score.final}</div>
                </div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => exportTranscript(messages, score)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={14} /> Export Transcript
                </motion.button>
              </div>

              {/* Judge summary */}
              {score.summary && (
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 8 }}>Judge's Summary</div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.6 }}>{score.summary}</div>
                </div>
              )}

              {/* Strengths & improvements */}
              <div style={{ display: 'flex', gap: 12 }}>
                {score.strengths?.length > 0 && (
                  <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(74,222,128,0.60)', marginBottom: 8 }}>Strengths</div>
                    {score.strengths.map((s, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.70)', lineHeight: 1.55, marginBottom: 4 }}>• {s}</div>
                    ))}
                  </div>
                )}
                {score.improvements?.length > 0 && (
                  <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.60)', marginBottom: 8 }}>Improve</div>
                    {score.improvements.map((s, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.70)', lineHeight: 1.55, marginBottom: 4 }}>• {s}</div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  }

  /* ═══════════════════════════════════════════════════
     MAIN DEBATE VIEW
     ═══════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: '#08091a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", zIndex: 100 }}
    >
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, background: `radial-gradient(ellipse at 50% 0%, ${COLOR_GLOW} 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* ── Header ───────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLOR_BORDER}`, position: 'relative', zIndex: 2 }}>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2.5} /> Exit Arena
        </motion.button>

        {/* Round indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {['opening','rebuttal1','rebuttal2','closing'].map((r, i) => {
            const ROUNDS = ['opening','rebuttal1','rebuttal2','closing']
            const curIdx = ROUNDS.indexOf(arenaState.round)
            const done = i < curIdx
            const active = i === curIdx
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? COLOR : done ? `${COLOR}30` : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${active ? COLOR : done ? `${COLOR}50` : 'rgba(255,255,255,0.12)'}`,
                  fontSize: 11, fontWeight: 800,
                  color: active ? '#fff' : done ? COLOR : 'rgba(255,255,255,0.30)',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                {i < 3 && <div style={{ width: 20, height: 1.5, background: done ? `${COLOR}50` : 'rgba(255,255,255,0.10)', borderRadius: 1 }} />}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLOR }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: COLOR, letterSpacing: '-0.01em' }}>⚔️ Debate Arena</span>
        </div>
      </div>

      {/* ── Body: split columns ───────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* LEFT — Argument Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, borderRight: `1px solid ${COLOR_BORDER}` }}>

          {/* Round label */}
          <div style={{ flexShrink: 0, padding: '10px 18px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: COLOR }}>Round {ROUND_INFO.num}/{totalRounds}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' }}>— {ROUND_INFO.label}</span>
          </div>

          {/* Message feed */}
          <div ref={flowRef} style={{ flex: 1, overflow: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={msg.id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}
                >
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: msg.role === 'user' ? COLOR : 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
                    {msg.role === 'user' ? 'You (FOR UBI)' : 'Aeva (AGAINST)'}
                  </div>
                  <div style={{
                    maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' ? `${COLOR}18` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${msg.role === 'user' ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
                    fontSize: 13.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6,
                  }}>
                    {msg.clean || msg.content || (
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} style={{ fontSize: 12, color: COLOR }}>
                        Thinking...
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isThinking && messages[messages.length - 1]?.role !== 'assistant' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexDirection: 'column' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Aeva (AGAINST)</div>
                <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <motion.div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR }} />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input area */}
          <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${COLOR_BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Quick actions */}
            <AnimatePresence>
              {quickActions.length > 0 && !isThinking && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickActions.map((a, i) => (
                    <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleSend(a)}
                      style={{ padding: '6px 12px', borderRadius: 99, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {a}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Round hint */}
            {ROUND_INFO.hint && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', lineHeight: 1.4 }}>
                {ROUND_INFO.hint}
              </div>
            )}

            {/* Textarea + send */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isThinking}
                placeholder={`Round ${ROUND_INFO.num}: ${ROUND_INFO.label}...`}
                rows={2}
                style={{
                  flex: 1, resize: 'none', background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${COLOR_BORDER}`, borderRadius: 14,
                  color: 'rgba(255,255,255,0.90)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
                  padding: '10px 14px', outline: 'none', lineHeight: 1.5,
                  opacity: isThinking ? 0.5 : 1,
                }}
              />
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                onClick={() => handleSend()}
                disabled={isThinking || !input.trim()}
                style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: (isThinking || !input.trim()) ? 'rgba(255,255,255,0.06)' : `linear-gradient(145deg, ${COLOR}80, ${COLOR}40)`,
                  border: `1.5px solid ${(isThinking || !input.trim()) ? 'rgba(255,255,255,0.10)' : `${COLOR}60`}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                <Send size={16} color={(isThinking || !input.trim()) ? 'rgba(255,255,255,0.25)' : COLOR} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* RIGHT — Analysis HUD */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'auto', padding: '16px 14px', gap: 14 }}>

          {/* Logic Strength */}
          <div style={{ padding: '14px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 10 }}>
              <Zap size={9} style={{ display: 'inline', marginRight: 4 }} />Logic Strength
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: logicColor(arenaState.logicStrength), letterSpacing: '-0.04em' }}>
                {arenaState.logicStrength}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${arenaState.logicStrength}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: logicColor(arenaState.logicStrength) }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>
              {arenaState.logicStrength >= 75 ? 'Strong argument' : arenaState.logicStrength >= 50 ? 'Needs more evidence' : 'Logical gaps detected'}
            </div>
          </div>

          {/* Fallacy Detector */}
          <div style={{ padding: '14px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 10 }}>
              <AlertTriangle size={9} style={{ display: 'inline', marginRight: 4 }} />Fallacy Detector
            </div>
            <AnimatePresence>
              {arenaState.fallacyAlerts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ fontSize: 11.5, color: 'rgba(74,222,128,0.60)', fontWeight: 500 }}>
                  No fallacies detected
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {arenaState.fallacyAlerts.map((f, i) => (
                    <motion.div key={f + i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}>
                      <span style={{ fontSize: 11, color: '#FCA5A5', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{f}</span>
                      <button onClick={() => dismissArenaFallacy(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: 'rgba(255,255,255,0.30)', lineHeight: 1 }}>
                        <X size={11} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Steel-Man */}
          <AnimatePresence>
            {arenaState.steelMan && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '14px 14px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.60)', marginBottom: 8 }}>
                  <Shield size={9} style={{ display: 'inline', marginRight: 4 }} />Steel-Man
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(165,180,252,0.80)', lineHeight: 1.55 }}>
                  "{arenaState.steelMan}"
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Counter-Strategy */}
          <AnimatePresence>
            {arenaState.counterHint && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '14px 14px', borderRadius: 14, background: `${COLOR}0A`, border: `1px solid ${COLOR}25` }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${COLOR}80`, marginBottom: 8 }}>
                  Counter-Strategy
                </div>
                <div style={{ fontSize: 11.5, color: `${COLOR}CC`, lineHeight: 1.55 }}>
                  {arenaState.counterHint}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Position reminder */}
          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>Positions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>You — FOR UBI</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Aeva — Job Guarantee</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  )
}
