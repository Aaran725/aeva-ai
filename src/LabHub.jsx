import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FlaskConical, ChevronRight, RotateCcw, CheckCircle2, XCircle, ArrowRight, Settings, History, Zap, RefreshCw } from 'lucide-react'
import { DRILLS, DIFFICULTIES, useLabStore } from './labStore'
import { useNeuralStore } from './neuralStore'
import { useSRStore } from './srStore'
import { useRoadmapStore } from './roadmapStore'
import { useXPStore } from './xpStore'

const _GROQ_KEYS=[import.meta.env.VITE_GROQ_API_KEY,import.meta.env.VITE_GROQ_API_KEY_2,import.meta.env.VITE_GROQ_API_KEY_3].filter(Boolean);let _ki=0;const gKey=()=>_GROQ_KEYS[_ki++%_GROQ_KEYS.length]
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ─── AI content generator ─── */
async function generateDrillContent(drillType, topic, difficulty = 'intermediate', questionCount = 8, focusMode = 'mixed') {
  const diffInstr = DIFFICULTIES[difficulty]?.instruction || DIFFICULTIES.intermediate.instruction
  const focusInstr = focusMode === 'theory' ? 'Focus on theoretical understanding and definitions.'
    : focusMode === 'application' ? 'Focus on real-world application and problem-solving.'
    : 'Mix theory and real-world application equally.'
  const count = Math.min(Math.max(questionCount, 4), 20)

  const prompts = {
    flashcard: `Generate exactly ${count} flashcard pairs for "${topic}".
Difficulty: ${diffInstr}
Focus: ${focusInstr}
Return ONLY valid JSON: {"cards":[{"front":"question","back":"concise answer (1-2 sentences max)"}]}
Make questions probe understanding, not just recall.`,

    speedround: `Generate exactly ${Math.min(count, 10)} rapid-fire Q&A pairs for "${topic}".
Difficulty: ${diffInstr}
Return ONLY valid JSON: {"cards":[{"front":"short question","back":"answer in 1 sentence max"}]}
Questions must be answerable in under 15 seconds. Crisp, unambiguous.`,

    mocktest: `Generate exactly ${Math.min(count, 10)} multiple-choice questions about "${topic}".
Difficulty: ${diffInstr}
Focus: ${focusInstr}
Return ONLY valid JSON: {"questions":[{"q":"question","options":["A","B","C","D"],"correct":0,"explanation":"why correct in 1 sentence"}]}
"correct" is 0-based index. Make wrong options plausibly wrong.`,

    feynman: `Generate a Feynman challenge for "${topic}".
Difficulty: ${diffInstr}
Return ONLY valid JSON: {
  "prompt": "Explain [specific aspect of topic] as if teaching a curious 16-year-old with no background in this area.",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"]
}
keyPoints: the 5 things a good explanation MUST cover. commonMistakes: things people usually get wrong.`,

    match: `Generate exactly ${Math.min(count, 8)} term-definition pairs about "${topic}".
Difficulty: ${diffInstr}
Return ONLY valid JSON: {"pairs":[{"term":"short term","definition":"clear 1-sentence definition"}]}
Terms must be distinct. Definitions must not contain the term.`,

    cloze: `Generate a fill-in-the-blank passage about "${topic}" for a student.
Difficulty: ${diffInstr}
Rules: Write a coherent 5-8 sentence educational paragraph. Replace ${Math.min(count, 8)} key terms or concepts with the token BLANK. Each blank should test a meaningful concept, not just filler words.
Return ONLY valid JSON: {"passage":"sentence with BLANK tokens","blanks":["answer1","answer2"],"hints":["brief hint for blank 1","brief hint for blank 2"]}
blanks array must match the number of BLANK tokens in passage, in order. hints: one short phrase per blank.`,

    shortanswer: `Generate ${Math.min(count, 6)} short-answer questions about "${topic}".
Difficulty: ${diffInstr}
Focus: ${focusInstr}
Each question should require 2-4 sentences to answer properly. Include a model answer and the 3 key points a good answer must cover.
Return ONLY valid JSON: {"questions":[{"q":"question text","modelAnswer":"ideal 3-4 sentence answer","keyPoints":["point 1","point 2","point 3"]}]}`,
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Educational content generator. Return ONLY the requested JSON. No markdown, no explanation, no extra text.' },
        { role: 'user', content: prompts[drillType] },
      ],
      temperature: 0.45,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('Generation failed')
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

async function generateDrillAnalysis(drillType, topic, wrongItems) {
  if (!wrongItems || wrongItems.length === 0) return null
  const itemText = wrongItems.map((w, i) => `${i + 1}. Q: "${w.q}" — Your answer was wrong. Correct: "${w.correct}"`).join('\n')
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a precise tutor. Give a short, specific analysis of what the student got wrong and why. Be direct and concise.' },
        { role: 'user', content: `Student drilled "${topic}" (${drillType} format) and missed these:\n${itemText}\n\nIn 2-3 sentences: what is the pattern in their misunderstanding, and what should they review? Be specific, not generic.` },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  })
  const json = await res.json()
  return json.choices?.[0]?.message?.content || null
}

async function gradeFeynmanExplanation(topic, userExplanation, keyPoints, commonMistakes) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a precise educational evaluator. Grade a student explanation and return ONLY JSON.' },
        { role: 'user', content: `Topic: "${topic}"
Key points a good explanation must cover: ${JSON.stringify(keyPoints)}
Common mistakes to watch for: ${JSON.stringify(commonMistakes)}

Student's explanation:
"${userExplanation}"

Return ONLY this JSON:
{
  "score": <0-100>,
  "covered": [<list of key points they covered well>],
  "missing": [<list of key points they missed or got wrong>],
  "feedback": "<2 sentences: what was strong, what specific gap to address>",
  "grade": "Mastery" | "Solid" | "Developing" | "Needs Work"
}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  })
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

/* ═══ DRILL COMPLETE SCREEN ══════════════════════════ */
function DrillComplete({ score, wrongItems = [], onExit, onRetry, onGoHarder, topic, drillType }) {
  const { difficulty, setDifficulty, closeLab, exitDrill } = useLabStore()
  const { activeNodeSession, endNodeSession, completeNode, openRoadmapHub } = useRoadmapStore()
  const { addXP } = useXPStore()

  const handleNodeDone = () => {
    completeNode(activeNodeSession.roadmapId, activeNodeSession.nodeId)
    addXP('DRILL_COMPLETE')
    endNodeSession()
    exitDrill()
    closeLab()
    openRoadmapHub()
  }
  const pct = Math.round((score.correct / score.total) * 100)
  const grade = pct >= 90 ? { label: 'Mastery', color: '#4ADE80', emoji: '🏆' }
    : pct >= 70 ? { label: 'Solid', color: '#60A5FA', emoji: '✅' }
    : pct >= 50 ? { label: 'Developing', color: '#FBBF24', emoji: '📈' }
    : { label: 'Needs Work', color: '#F87171', emoji: '🔁' }
  const [analysis, setAnalysis] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  useEffect(() => {
    if (wrongItems.length > 0 && pct < 90) {
      setLoadingAnalysis(true)
      generateDrillAnalysis(drillType, topic, wrongItems)
        .then(a => { setAnalysis(a); setLoadingAnalysis(false) })
        .catch(() => setLoadingAnalysis(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canGoHarder = pct >= 80
  const difficultyKeys = ['beginner', 'intermediate', 'advanced', 'expert']
  const currentDiffIdx = difficultyKeys.indexOf(difficulty)
  const nextDifficulty = difficultyKeys[Math.min(currentDiffIdx + 1, 3)]

  const handleGoHarder = () => {
    setDifficulty(nextDifficulty)
    if (onGoHarder) onGoHarder()
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, overflowY: 'auto', paddingTop: 8 }}>
      <div style={{ fontSize: 44 }}>{grade.emoji}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 800, color: grade.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: grade.color, marginTop: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{grade.label}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{score.correct} / {score.total} correct</div>
      </div>

      {/* Post-drill analysis */}
      {(loadingAnalysis || analysis) && (
        <div style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.80)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Aeva's Analysis</div>
          {loadingAnalysis ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#818CF8', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Analysing your mistakes…</span>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.60, margin: 0 }}>{analysis}</p>
          )}
        </div>
      )}

      {/* Adaptive difficulty */}
      {canGoHarder && currentDiffIdx < 3 && onGoHarder && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FCD34D' }}>⚡ You're ready for more</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>Try {DIFFICULTIES[nextDifficulty]?.label} difficulty?</div>
          </div>
          <button onClick={handleGoHarder} style={{ padding: '7px 14px', borderRadius: 99, background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.38)', color: '#FCD34D', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Go harder →
          </button>
        </motion.div>
      )}

      {/* Roadmap node completion — shown when launched from a roadmap */}
      {activeNodeSession && (
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleNodeDone}
          style={{
            width: '100%', padding: '13px 16px', borderRadius: 13, border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #22C55E)',
            boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
            color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
          <CheckCircle2 size={16} strokeWidth={2.5} />
          Done · Next Node
        </motion.button>
      )}

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button onClick={onRetry} style={{ flex: 1, padding: '11px 16px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <RotateCcw size={13} /> Retry
        </button>
        <button onClick={onExit} style={{ flex: 1, padding: '11px 16px', borderRadius: 13, background: 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(6,182,212,0.20))', border: '1px solid rgba(59,130,246,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Back to Lab <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  )
}

/* ═══ FLASHCARD SPRINT ═══════════════════════════════ */
function FlashcardDrill({ data, topic, onExit }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const { recordCard } = useSRStore()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([]) // 'got' | 'missed'
  const [done, setDone] = useState(false)
  const [wrongItems, setWrongItems] = useState([])
  const cards = data.cards || []

  const handleResult = useCallback((result) => {
    const card = cards[idx]
    const next = [...results, result]
    const newWrong = result === 'missed' ? [...wrongItems, { q: card.front, correct: card.back }] : wrongItems
    setResults(next)
    setWrongItems(newWrong)

    // Save to spaced repetition queue — card will resurface based on SM-2 schedule
    recordCard(currentTopic, card.front, card.back, result)

    if (idx + 1 >= cards.length) {
      const correct = next.filter(r => r === 'got').length
      setDrillScore({ correct, total: cards.length })
      recordDrillResult({ topic: currentTopic, drillType: 'flashcard', correct, total: cards.length })
      setDone(true)
    } else {
      setFlipped(false)
      setTimeout(() => setIdx(i => i + 1), 160)
    }
  }, [results, wrongItems, idx, cards, currentTopic, recordCard]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        setFlipped(f => !f)
      } else if (e.key === 'ArrowRight' && flipped) {
        handleResult('got')
      } else if (e.key === 'ArrowLeft' && flipped) {
        handleResult('missed')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, handleResult])

  if (done) {
    const correct = results.filter(r => r === 'got').length
    return (
      <DrillComplete
        score={{ correct, total: cards.length }}
        wrongItems={wrongItems}
        topic={topic}
        drillType="flashcard"
        onExit={onExit}
        onRetry={() => { setIdx(0); setFlipped(false); setResults([]); setWrongItems([]); setDone(false) }}
        onGoHarder={onExit}
      />
    )
  }

  const card = cards[idx]
  const progress = (idx / cards.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, padding: '0 4px' }}>
      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em' }}>
            {idx + 1} / {cards.length}
          </span>
          <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>
            ✓ {results.filter(r => r === 'got').length}  ✗ {results.filter(r => r === 'missed').length}
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
        </div>
      </div>

      {/* Card — large centered */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1200, minHeight: 300 }}>
        <motion.div
          onClick={() => setFlipped(f => !f)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.50, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', maxWidth: 560, minHeight: 280, position: 'relative', transformStyle: 'preserve-3d', cursor: 'pointer' }}
        >
          {/* Front */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 24, padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(59,130,246,0.70)', textTransform: 'uppercase' }}>Question</span>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.94)', lineHeight: 1.5, margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {card?.front}
            </p>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)', marginTop: 4 }}>tap to reveal</span>
          </div>

          {/* Back */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.30)', borderRadius: 24, padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(6,182,212,0.70)', textTransform: 'uppercase' }}>Answer</span>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.90)', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>
              {card?.back}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Keyboard hint */}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.04em' }}>
        ⌨ Space · ← Missed · → Got it
      </div>

      {/* Actions */}
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto', width: '100%' }}>
            <button onClick={() => handleResult('missed')} style={{ flex: 1, padding: '15px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <XCircle size={16} /> Missed it
            </button>
            <button onClick={() => handleResult('got')} style={{ flex: 1, padding: '15px', borderRadius: 16, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#86EFAC', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle2 size={16} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ SPACED REVIEW DRILL ════════════════════════════ */
function ReviewDrill({ data, onExit, onNewDrill }) {
  const { recordCard } = useSRStore()
  const cards = data?.cards || []
  const [idx, setIdx]           = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [results, setResults]   = useState([])
  const [done, setDone]         = useState(false)
  const [schedule, setSchedule] = useState([]) // { front, result, days }

  const handleResult = useCallback((result) => {
    const card = cards[idx]

    // Reschedule in SR store
    recordCard(card.topic || 'review', card.front, card.back, result)

    // Estimate next interval for the completion display
    const DAY = 24 * 60 * 60 * 1000
    const updatedCard = useSRStore.getState().cards.find(c => c.front === card.front && c.topic === (card.topic || 'review'))
    const daysUntil = updatedCard
      ? Math.max(1, Math.round((updatedCard.dueDate - Date.now()) / DAY))
      : (result === 'got' ? 3 : 1)

    setSchedule(prev => [...prev, {
      front: card.front.length > 50 ? card.front.slice(0, 48) + '…' : card.front,
      result,
      days: daysUntil,
    }])

    const next = [...results, result]
    setResults(next)
    if (idx + 1 >= cards.length) {
      setDone(true)
    } else {
      setFlipped(false)
      setTimeout(() => setIdx(i => i + 1), 160)
    }
  }, [results, idx, cards, recordCard]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setFlipped(f => !f) }
      else if (e.key === 'ArrowRight' && flipped) handleResult('got')
      else if (e.key === 'ArrowLeft'  && flipped) handleResult('missed')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, handleResult])

  /* ── Completion screen ── */
  if (done) {
    const correct = results.filter(r => r === 'got').length
    const pct = Math.round((correct / cards.length) * 100)
    const gradeEmoji = pct >= 80 ? '🧠' : pct >= 60 ? '📈' : '🔁'
    const gradeColor = pct >= 80 ? '#4ADE80' : pct >= 60 ? '#60A5FA' : '#FBBF24'

    return (
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div style={{ fontSize: 40 }}>{gradeEmoji}</div>
          <div style={{ fontSize: 50, fontWeight: 800, color: gradeColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 5 }}>
            {correct}/{cards.length} recalled correctly
          </div>
        </div>

        {/* Rescheduled cards */}
        <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
            Cards rescheduled
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {schedule.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.front}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
                  color: s.result === 'got' ? '#4ADE80' : '#F87171',
                }}>
                  {s.result === 'got' ? `+${s.days}d` : 'Tomorrow'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onExit} style={{
            flex: 1, padding: '12px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Close
          </button>
          <button onClick={onNewDrill} style={{
            flex: 2, padding: '12px', borderRadius: 14,
            background: 'rgba(34,197,94,0.16)', border: '1px solid rgba(34,197,94,0.38)',
            color: '#86EFAC', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            Drill new topic <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    )
  }

  /* ── Card ── */
  const card = cards[idx]
  const progress = (idx / cards.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, padding: '0 4px' }}>
      {/* Progress row */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em' }}>
            {idx + 1} / {cards.length}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: '#4ADE80' }}>✓ {results.filter(r => r === 'got').length}</span>
            {'  '}
            <span style={{ color: '#F87171' }}>✗ {results.filter(r => r === 'missed').length}</span>
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #4ADE80, #22D3EE)' }} />
        </div>
      </div>

      {/* Topic tag */}
      {card?.topic && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(74,222,128,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {card.topic}
        </div>
      )}

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1000 }}>
        <motion.div
          onClick={() => setFlipped(f => !f)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ width: '100%', minHeight: 200, position: 'relative', transformStyle: 'preserve-3d', cursor: 'pointer' }}
        >
          {/* Front */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(34,197,94,0.65)', textTransform: 'uppercase' }}>Due for Review</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {card?.front}
            </p>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>tap to reveal</span>
          </div>
          {/* Back */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.32)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(34,197,94,0.65)', textTransform: 'uppercase' }}>Answer</span>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>
              {card?.back}
            </p>
          </div>
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
        ⌨ Space · ← Missed · → Got it
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleResult('missed')} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <XCircle size={15} /> Missed
            </button>
            <button onClick={() => handleResult('got')} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#86EFAC', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <CheckCircle2 size={15} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ SPEED ROUND ════════════════════════════════════ */
function SpeedRoundDrill({ data, topic, onExit }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const cards = data.cards || []
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)

  const handleResult = useCallback((result) => {
    clearInterval(timerRef.current)
    const next = [...results, result]
    setResults(next)
    if (idx + 1 >= cards.length) {
      const correct = next.filter(r => r === 'got').length
      setDrillScore({ correct, total: cards.length })
      recordDrillResult({ topic: currentTopic, drillType: 'speedround', correct, total: cards.length })
      setDone(true)
    } else {
      setFlipped(false)
      setTimedOut(false)
      setTimeLeft(15)
      setTimeout(() => setIdx(i => i + 1), 120)
    }
  }, [results, idx, cards.length, currentTopic]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (done || flipped) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setTimedOut(true)
          setFlipped(true) // auto-reveal on timeout
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [idx, done, flipped])

  if (done) {
    const correct = results.filter(r => r === 'got').length
    return (
      <DrillComplete
        score={{ correct, total: cards.length }}
        wrongItems={[]}
        onExit={onExit}
        onRetry={() => { setIdx(0); setFlipped(false); setResults([]); setDone(false); setTimeLeft(15) }}
        topic={topic}
        drillType="speedround"
        onGoHarder={onExit}
      />
    )
  }

  const card = cards[idx]
  const pct = (idx / cards.length) * 100
  const timerColor = timeLeft > 10 ? '#F97316' : timeLeft > 5 ? '#FBBF24' : '#EF4444'
  const RING_R = 22
  const RING_C = 2 * Math.PI * RING_R
  const ringOffset = RING_C * (1 - timeLeft / 15)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header: progress + SVG ring timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #F97316, #FB923C)' }} />
        </div>
        {/* SVG ring timer */}
        <motion.div animate={timeLeft <= 5 ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.3 }}
          style={{ flexShrink: 0, position: 'relative', width: 56, height: 56 }}>
          <svg width={56} height={56} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx={28} cy={28} r={RING_R} fill="none" stroke={`${timerColor}22`} strokeWidth={4} />
            <motion.circle
              cx={28} cy={28} r={RING_R} fill="none"
              stroke={timerColor} strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: timerColor, fontFamily: 'monospace' }}>{timeLeft}</div>
        </motion.div>
      </div>

      {/* Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1200, minHeight: 260 }}>
        <motion.div
          onClick={() => { if (!flipped) { clearInterval(timerRef.current); setFlipped(true) } }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ width: '100%', maxWidth: 560, minHeight: 240, position: 'relative', transformStyle: 'preserve-3d', cursor: flipped ? 'default' : 'pointer' }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: timedOut ? 'rgba(239,68,68,0.10)' : 'rgba(249,115,22,0.10)', border: `1px solid ${timedOut ? 'rgba(239,68,68,0.30)' : 'rgba(249,115,22,0.28)'}`, borderRadius: 24, padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(249,115,22,0.70)', textTransform: 'uppercase' }}>
              {idx + 1} / {cards.length}
            </span>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.94)', lineHeight: 1.50, margin: 0 }}>{card?.front}</p>
            {!flipped && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)' }}>tap to reveal</span>}
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.28)', borderRadius: 24, padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            {timedOut && <span style={{ fontSize: 11, fontWeight: 700, color: '#F87171', letterSpacing: '0.10em', textTransform: 'uppercase' }}>⏱ Time's up</span>}
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.90)', lineHeight: 1.65, margin: 0 }}>{card?.back}</p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto', width: '100%' }}>
            <button onClick={() => handleResult('missed')} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <XCircle size={15} /> Missed
            </button>
            <button onClick={() => handleResult('got')} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#86EFAC', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <CheckCircle2 size={15} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ MOCK TEST ══════════════════════════════════════ */
function MockTestDrill({ data, topic, onExit }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [wrongItems, setWrongItems] = useState([])
  const questions = data.questions || []

  const choose = (i) => {
    if (selected !== null) return
    setSelected(i)
  }

  const next = () => {
    const q = questions[idx]
    const correct = selected === q.correct
    const newScore = correct ? score + 1 : score
    const newWrong = !correct ? [...wrongItems, { q: q.q, correct: q.options[q.correct] }] : wrongItems
    setWrongItems(newWrong)
    if (idx + 1 >= questions.length) {
      setDrillScore({ correct: newScore, total: questions.length })
      recordDrillResult({ topic: currentTopic, drillType: 'mocktest', correct: newScore, total: questions.length })
      setScore(newScore)
      setDone(true)
    } else {
      setScore(newScore)
      setSelected(null)
      setIdx(i => i + 1)
    }
  }

  if (done) return (
    <DrillComplete
      score={{ correct: score, total: questions.length }}
      wrongItems={wrongItems}
      topic={topic}
      drillType="mocktest"
      onExit={onExit}
      onRetry={() => { setIdx(0); setSelected(null); setScore(0); setWrongItems([]); setDone(false) }}
      onGoHarder={onExit}
    />
  )

  const q = questions[idx]
  const progress = (idx / questions.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em' }}>
            Question {idx + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 11, color: '#06B6D4', fontWeight: 700 }}>{score} correct</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #06B6D4, #67E8F9)' }} />
        </div>
      </div>

      <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.22)', borderRadius: 16, padding: '20px 18px' }}>
        <p style={{ fontSize: 15.5, fontWeight: 600, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {q?.q}
        </p>
      </div>

      {/* 2×2 options grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {q?.options.map((opt, i) => {
          const isSelected = selected === i
          const isCorrect = selected !== null && i === q.correct
          const isWrong = isSelected && i !== q.correct
          return (
            <motion.button
              key={i}
              whileHover={selected === null ? { scale: 1.02, y: -2 } : {}}
              whileTap={selected === null ? { scale: 0.98 } : {}}
              onClick={() => choose(i)}
              style={{
                padding: '18px 16px', borderRadius: 16, textAlign: 'left',
                cursor: selected === null ? 'pointer' : 'default',
                fontSize: 14, fontWeight: 500, lineHeight: 1.45,
                fontFamily: "'Inter', system-ui, sans-serif",
                background: isCorrect ? 'rgba(74,222,128,0.14)' : isWrong ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.05)',
                border: isCorrect ? '1.5px solid rgba(74,222,128,0.50)' : isWrong ? '1.5px solid rgba(239,68,68,0.50)' : '1px solid rgba(255,255,255,0.10)',
                color: isCorrect ? '#86EFAC' : isWrong ? '#FCA5A5' : 'rgba(255,255,255,0.82)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 13, color: isCorrect ? '#4ADE80' : isWrong ? '#F87171' : 'rgba(255,255,255,0.30)', flexShrink: 0, marginTop: 1 }}>
                {['A', 'B', 'C', 'D'][i]}
              </span>
              <span>{opt}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Explanation slides up after answer */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 16px', borderRadius: 14, background: selected === q.correct ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${selected === q.correct ? 'rgba(74,222,128,0.22)' : 'rgba(239,68,68,0.22)'}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: selected === q.correct ? '#4ADE80' : '#F87171', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                {selected === q.correct ? '✓ Correct' : '✗ Incorrect'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>{q?.explanation}</div>
            </div>
            <button onClick={next} style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(6,182,212,0.22), rgba(59,130,246,0.18))', border: '1px solid rgba(6,182,212,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {idx + 1 === questions.length ? 'See Results' : 'Next Question'}
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ FEYNMAN TEST ═══════════════════════════════════ */
function FeynmanDrill({ data, topic, onExit }) {
  const { recordDrillResult, currentTopic } = useLabStore()
  const [explanation, setExplanation] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState(null)
  const textareaRef = useRef(null)
  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length

  const handleSubmit = async () => {
    if (wordCount < 20) return
    setGrading(true)
    try {
      const grade = await gradeFeynmanExplanation(topic, explanation, data.keyPoints, data.commonMistakes)
      setResult(grade)
      const correct = Math.round(grade.score / 100 * 5)
      recordDrillResult({ topic: currentTopic, drillType: 'feynman', correct, total: 5 })
    } catch {
      setResult({ score: 0, covered: [], missing: data.keyPoints || [], feedback: 'Could not grade. Please try again.', grade: 'Needs Work' })
    } finally {
      setGrading(false)
    }
  }

  if (result) {
    const gradeColors = { Mastery: '#4ADE80', Solid: '#60A5FA', Developing: '#FBBF24', 'Needs Work': '#F87171' }
    const gc = gradeColors[result.grade] || '#60A5FA'
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Score */}
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: gc, letterSpacing: '-0.04em', lineHeight: 1 }}>{result.score}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{result.grade}</div>
        </div>
        {/* Feedback */}
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', fontSize: 13.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.60 }}>
          {result.feedback}
        </div>
        {/* Key-point chips lit up: green = covered, red = missing */}
        {(result.covered?.length > 0 || result.missing?.length > 0) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(139,92,246,0.60)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>Key Points</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(result.covered || []).map((p, i) => (
                <motion.div key={`c${i}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.06 }}
                  style={{ padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.40)', color: '#86EFAC', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={12} /> {p}
                </motion.div>
              ))}
              {(result.missing || []).map((p, i) => (
                <motion.div key={`m${i}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: (result.covered?.length || 0) * 0.06 + i * 0.06 }}
                  style={{ padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <XCircle size={12} /> {p}
                </motion.div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button onClick={() => { setResult(null); setExplanation('') }} style={{ flex: 1, padding: '12px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RotateCcw size={13} /> Try again
          </button>
          <button onClick={onExit} style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'linear-gradient(135deg, rgba(139,92,246,0.28), rgba(59,130,246,0.20))', border: '1px solid rgba(139,92,246,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Done <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(139,92,246,0.80)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>Feynman Challenge</div>
        <p style={{ fontSize: 15.5, fontWeight: 600, color: 'rgba(255,255,255,0.94)', lineHeight: 1.55, margin: 0 }}>{data.prompt}</p>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
        Write as if teaching someone with zero background. Simple language, real examples, no jargon. Aeva will find the gaps.
      </div>

      {/* Key-point reference chips */}
      {data.keyPoints?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(139,92,246,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Cover these points →</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.keyPoints.map((pt, i) => (
              <div key={i} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(167,139,250,0.70)' }}>
                {pt}
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        placeholder="Start explaining..."
        autoFocus
        style={{
          flex: 1, minHeight: 200, padding: '16px 18px', borderRadius: 16,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)',
          color: 'rgba(255,255,255,0.88)', fontSize: 14.5, lineHeight: 1.70,
          fontFamily: "'Inter', system-ui, sans-serif", resize: 'none', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: wordCount < 20 ? 'rgba(255,255,255,0.28)' : 'rgba(139,92,246,0.70)', fontWeight: 500 }}>
          {wordCount} words {wordCount < 20 ? `(${20 - wordCount} more to unlock)` : '— ready to grade'}
        </span>
        <motion.button
          whileHover={wordCount >= 20 ? { scale: 1.04 } : {}}
          whileTap={wordCount >= 20 ? { scale: 0.96 } : {}}
          onClick={handleSubmit}
          disabled={wordCount < 20 || grading}
          style={{
            padding: '11px 22px', borderRadius: 13,
            background: wordCount >= 20 ? 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25))' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${wordCount >= 20 ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.08)'}`,
            color: wordCount >= 20 ? '#C4B5FD' : 'rgba(255,255,255,0.25)',
            fontSize: 13, fontWeight: 700, cursor: wordCount >= 20 ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          {grading ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#A78BFA' }} /> Grading…</>
          ) : (<>Grade it <Zap size={13} /></>)}
        </motion.button>
      </div>
    </div>
  )
}

/* ═══ CLOZE (FILL THE GAPS) ══════════════════════════ */
function ClozeDrill({ data, topic, onExit }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const passage = data.passage || ''
  const answers = data.blanks || []
  const hints = data.hints || []
  const parts = passage.split('BLANK')
  const [inputs, setInputs] = useState(Array(answers.length).fill(''))
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState([])
  const [shownHints, setShownHints] = useState({})

  const handleSubmit = () => {
    const res = answers.map((ans, i) => ({
      correct: inputs[i].trim().toLowerCase() === ans.toLowerCase(),
      userAnswer: inputs[i].trim(),
      correctAnswer: ans,
    }))
    setResults(res)
    setSubmitted(true)
    const correct = res.filter(r => r.correct).length
    setDrillScore({ correct, total: answers.length })
    recordDrillResult({ topic: currentTopic, drillType: 'cloze', correct, total: answers.length })
  }

  if (submitted) {
    const correct = results.filter(r => r.correct).length
    return (
      <DrillComplete
        score={{ correct, total: answers.length }}
        wrongItems={results.filter(r => !r.correct).map(r => ({ q: `You wrote: "${r.userAnswer}"`, correct: r.correctAnswer }))}
        topic={topic} drillType="cloze"
        onExit={onExit}
        onRetry={() => { setInputs(Array(answers.length).fill('')); setSubmitted(false); setResults([]) }}
        onGoHarder={onExit}
      />
    )
  }

  let blankIdx = 0
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,185,129,0.70)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Fill the Gaps — {topic}</div>
      <div style={{ padding: '20px 22px', borderRadius: 18, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)', lineHeight: 2.2, fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>
        {parts.map((part, pi) => {
          const idx = blankIdx
          if (pi < parts.length - 1) blankIdx++
          const res = submitted ? results[idx] : null
          const inputColor = res?.correct ? 'rgba(74,222,128,0.22)' : res ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.12)'
          const borderColor = res?.correct ? 'rgba(74,222,128,0.55)' : res ? 'rgba(239,68,68,0.50)' : 'rgba(16,185,129,0.35)'
          const textColor = res?.correct ? '#86EFAC' : res ? '#FCA5A5' : 'rgba(255,255,255,0.90)'
          return (
            <span key={pi}>
              {part}
              {pi < parts.length - 1 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: '0 4px', verticalAlign: 'middle' }}>
                  <input
                    value={submitted ? (results[idx]?.correct ? inputs[idx] : `${inputs[idx]} (${answers[idx]})`) : (inputs[idx] || '')}
                    onChange={e => !submitted && setInputs(prev => { const n = [...prev]; n[idx] = e.target.value; return n })}
                    readOnly={submitted}
                    placeholder="…"
                    style={{
                      width: Math.max(100, (answers[idx]?.length || 8) * 10),
                      padding: '3px 10px', borderRadius: 8,
                      background: inputColor, border: `1.5px solid ${borderColor}`,
                      color: textColor, fontSize: 13.5, fontFamily: 'monospace',
                      outline: 'none', textAlign: 'center', transition: 'all 0.2s',
                    }}
                  />
                  {/* Hint button — only before submit */}
                  {!submitted && hints[idx] && (
                    <button
                      onClick={() => setShownHints(h => ({ ...h, [idx]: !h[idx] }))}
                      title="Show hint"
                      style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.10)', color: 'rgba(16,185,129,0.70)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
                      ?
                    </button>
                  )}
                  {!submitted && shownHints[idx] && (
                    <span style={{ fontSize: 11, color: 'rgba(16,185,129,0.60)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{hints[idx]}</span>
                  )}
                </span>
              )}
            </span>
          )
        })}
      </div>
      {!submitted && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>
          {inputs.filter(v => v.trim()).length} / {answers.length} filled
        </div>
      )}
      {submitted && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
          {results.filter(r => r.correct).length}/{answers.length} correct — blanks shown in <span style={{ color: '#86EFAC' }}>green</span> or <span style={{ color: '#FCA5A5' }}>red with correction</span>
        </div>
      )}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={inputs.some(v => !v.trim()) || submitted}
        style={{ padding: '14px', borderRadius: 16, background: inputs.every(v => v.trim()) && !submitted ? 'rgba(16,185,129,0.20)' : 'rgba(255,255,255,0.05)', border: `1px solid ${inputs.every(v => v.trim()) && !submitted ? 'rgba(16,185,129,0.40)' : 'rgba(255,255,255,0.09)'}`, color: inputs.every(v => v.trim()) && !submitted ? '#6EE7B7' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 700, cursor: inputs.every(v => v.trim()) && !submitted ? 'pointer' : 'not-allowed', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Check My Answers
      </motion.button>
    </div>
  )
}

/* ═══ SHORT ANSWER ════════════════════════════════════ */
async function gradeShortAnswer(topic, question, modelAnswer, keyPoints, userAnswer) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Grade a student short-answer response. Return ONLY JSON.' },
        { role: 'user', content: `Topic: "${topic}"\nQuestion: "${question}"\nModel Answer: "${modelAnswer}"\nKey Points Required: ${JSON.stringify(keyPoints)}\n\nStudent's Answer: "${userAnswer}"\n\nReturn ONLY: {"score":0-100,"covered":["points covered"],"missing":["points missed"],"feedback":"1 sentence: what was good and what to improve","grade":"Excellent"|"Good"|"Partial"|"Weak"}` },
      ],
      temperature: 0.2, max_tokens: 300, response_format: { type: 'json_object' },
    }),
  })
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

function ShortAnswerDrill({ data, topic, onExit }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const questions = data.questions || []
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState(Array(questions.length).fill(''))
  const [grades, setGrades] = useState([])
  const [grading, setGrading] = useState(false)
  const [currentGrade, setCurrentGrade] = useState(null) // inline feedback for current Q
  const [done, setDone] = useState(false)

  const GRADE_COL = { Excellent: '#4ADE80', Good: '#60A5FA', Partial: '#FBBF24', Weak: '#F87171' }

  const handleGrade = async () => {
    const q = questions[idx]
    setGrading(true)
    try {
      const result = await gradeShortAnswer(currentTopic, q.q, q.modelAnswer, q.keyPoints, answers[idx])
      setCurrentGrade(result)
      const newGrades = [...grades, result]
      setGrades(newGrades)
      if (idx + 1 >= questions.length) {
        const correct = newGrades.filter(g => g.score >= 70).length
        setDrillScore({ correct, total: questions.length })
        recordDrillResult({ topic: currentTopic, drillType: 'shortanswer', correct, total: questions.length })
      }
    } catch {
      const fallback = { score: 0, covered: [], missing: q.keyPoints, feedback: 'Could not grade.', grade: 'Weak' }
      setCurrentGrade(fallback)
      setGrades(g => [...g, fallback])
    }
    setGrading(false)
  }

  const handleNext = () => {
    setCurrentGrade(null)
    if (idx + 1 >= questions.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
    }
  }

  if (done) {
    const correct = grades.filter(g => g.score >= 70).length
    return (
      <DrillComplete
        score={{ correct, total: questions.length }}
        wrongItems={grades.filter(g => g.score < 70).map((g, i) => ({ q: questions[i]?.q || '', correct: g.feedback }))}
        topic={topic} drillType="shortanswer"
        onExit={onExit}
        onRetry={() => { setIdx(0); setAnswers(Array(questions.length).fill('')); setGrades([]); setCurrentGrade(null); setDone(false) }}
        onGoHarder={onExit}
      />
    )
  }

  const q = questions[idx]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.70)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Short Answer — {idx + 1}/{questions.length}</span>
        {grades.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA' }}>Avg: {Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)}%</span>}
      </div>

      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Question</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.90)', lineHeight: 1.6, fontWeight: 500 }}>{q?.q}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {q?.keyPoints?.map((pt, i) => (
          <div key={i} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', color: 'rgba(252,211,77,0.60)' }}>{pt}</div>
        ))}
      </div>

      <textarea
        value={answers[idx] || ''}
        onChange={e => !currentGrade && setAnswers(prev => { const n = [...prev]; n[idx] = e.target.value; return n })}
        readOnly={!!currentGrade}
        placeholder="Write your answer here — aim for 2-4 clear sentences…"
        rows={5}
        style={{ resize: currentGrade ? 'none' : 'vertical', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.65, outline: 'none' }}
        onFocus={e => !currentGrade && (e.target.style.borderColor = 'rgba(245,158,11,0.40)')}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
      />

      {/* Inline grade feedback */}
      <AnimatePresence>
        {currentGrade && (
          <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderRadius: 16, background: `${GRADE_COL[currentGrade.grade] || '#60A5FA'}12`, border: `1px solid ${GRADE_COL[currentGrade.grade] || '#60A5FA'}35`, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: GRADE_COL[currentGrade.grade] || '#60A5FA' }}>{currentGrade.grade}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: GRADE_COL[currentGrade.grade] || '#60A5FA' }}>{currentGrade.score}%</span>
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: 10 }}>{currentGrade.feedback}</div>
              {/* Covered/missing chips */}
              {(currentGrade.covered?.length > 0 || currentGrade.missing?.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {(currentGrade.covered || []).map((pt, i) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.30)', color: '#86EFAC', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> {pt}
                    </span>
                  ))}
                  {(currentGrade.missing || []).map((pt, i) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: '#FCA5A5', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={11} /> {pt}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.38)', color: '#FCD34D', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {idx + 1 < questions.length ? 'Next Question →' : 'See Results'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentGrade && (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleGrade}
          disabled={!answers[idx]?.trim() || grading}
          style={{ padding: '14px', borderRadius: 14, background: answers[idx]?.trim() ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${answers[idx]?.trim() ? 'rgba(245,158,11,0.38)' : 'rgba(255,255,255,0.09)'}`, color: answers[idx]?.trim() ? '#FCD34D' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 700, cursor: answers[idx]?.trim() && !grading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {grading ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(252,211,77,0.2)', borderTopColor: '#FCD34D' }} /> Grading…</>
          ) : 'Submit Answer'}
        </motion.button>
      )}
    </div>
  )
}

/* ═══ MATCH GRID ═════════════════════════════════════ */
function MatchGridDrill({ data, topic, onExit }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const pairs = data.pairs || []
  const [terms] = useState(pairs.map(p => p.term))
  const [defs] = useState(() => [...pairs.map(p => p.definition)].sort(() => Math.random() - 0.5))
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [selectedDef, setSelectedDef] = useState(null)
  const [matched, setMatched] = useState([])
  const [wrong, setWrong] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (selectedTerm !== null && selectedDef !== null) {
      const termObj = pairs.find(p => p.term === terms[selectedTerm])
      if (termObj && termObj.definition === defs[selectedDef]) {
        const newMatched = [...matched, terms[selectedTerm]]
        setMatched(newMatched)
        setSelectedTerm(null)
        setSelectedDef(null)
        if (newMatched.length === pairs.length) {
          setDrillScore({ correct: pairs.length, total: pairs.length })
          recordDrillResult({ topic: currentTopic, drillType: 'match', correct: pairs.length, total: pairs.length })
          setTimeout(() => setDone(true), 600)
        }
      } else {
        setWrong({ term: selectedTerm, def: selectedDef })
        setTimeout(() => { setWrong(null); setSelectedTerm(null); setSelectedDef(null) }, 700)
      }
    }
  }, [selectedTerm, selectedDef]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return (
    <DrillComplete
      score={{ correct: pairs.length, total: pairs.length }}
      wrongItems={[]}
      topic={topic}
      drillType="match"
      onExit={onExit}
      onRetry={() => { setMatched([]); setSelectedTerm(null); setSelectedDef(null); setDone(false) }}
      onGoHarder={onExit}
    />
  )

  const progress = (matched.length / pairs.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em' }}>
            {matched.length} / {pairs.length} matched
          </span>
          <span style={{ fontSize: 11, color: '#EC4899', fontWeight: 700 }}>click a term, then its definition</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #EC4899, #F472B6)' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Terms column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {terms.map((term, i) => {
            const isMatched = matched.includes(term)
            const isSel = selectedTerm === i
            const isWrong_ = wrong?.term === i
            return (
              <motion.button
                key={term}
                whileHover={!isMatched ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                animate={isWrong_ ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={isWrong_ ? { duration: 0.45, ease: 'easeInOut' } : {}}
                onClick={() => !isMatched && setSelectedTerm(i === selectedTerm ? null : i)}
                style={{
                  padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                  fontSize: 13.5, fontWeight: 700, lineHeight: 1.35,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.45 : 1,
                  background: isMatched ? 'rgba(74,222,128,0.12)' : isWrong_ ? 'rgba(239,68,68,0.18)' : isSel ? 'rgba(236,72,153,0.22)' : 'rgba(255,255,255,0.06)',
                  border: isMatched ? '1.5px solid rgba(74,222,128,0.35)' : isWrong_ ? '1.5px solid rgba(239,68,68,0.50)' : isSel ? '1.5px solid rgba(236,72,153,0.60)' : '1px solid rgba(255,255,255,0.10)',
                  color: isMatched ? '#86EFAC' : isSel ? '#F9A8D4' : 'rgba(255,255,255,0.85)',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  minHeight: 56,
                }}
              >
                {term}
              </motion.button>
            )
          })}
        </div>

        {/* Definitions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {defs.map((def, i) => {
            const matchedTerm = pairs.find(p => p.definition === def)?.term
            const isMatched = matched.includes(matchedTerm)
            const isSel = selectedDef === i
            const isWrong_ = wrong?.def === i
            return (
              <motion.button
                key={def}
                whileHover={!isMatched ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                animate={isWrong_ ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={isWrong_ ? { duration: 0.45, ease: 'easeInOut' } : {}}
                onClick={() => !isMatched && setSelectedDef(i === selectedDef ? null : i)}
                style={{
                  padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                  fontSize: 12.5, fontWeight: 500, lineHeight: 1.50,
                  fontFamily: "'Georgia', serif",
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.45 : 1,
                  background: isMatched ? 'rgba(74,222,128,0.08)' : isWrong_ ? 'rgba(239,68,68,0.14)' : isSel ? 'rgba(236,72,153,0.16)' : 'rgba(255,255,255,0.04)',
                  border: isMatched ? '1.5px solid rgba(74,222,128,0.28)' : isWrong_ ? '1.5px solid rgba(239,68,68,0.45)' : isSel ? '1.5px solid rgba(236,72,153,0.50)' : '1px solid rgba(255,255,255,0.08)',
                  color: isMatched ? '#86EFAC' : isSel ? '#F9A8D4' : 'rgba(255,255,255,0.68)',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  minHeight: 56,
                }}
              >
                {def}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══ LOADING SPINNER ════════════════════════════════ */
function LabLoading({ topic }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.15)', borderTopColor: '#3B82F6' }}
      />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
        Generating drill for<br />
        <span style={{ color: '#60A5FA', fontWeight: 600 }}>{topic}</span>…
      </div>
    </div>
  )
}

/* ═══ DRILL CARD (grid) ══════════════════════════════ */
function DrillCard({ drill, onStart, index, personalBest }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      whileHover={{ scale: 1.025, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onStart(drill.id)}
      style={{
        padding: '20px 22px', borderRadius: 20,
        background: drill.colorDim, border: `1px solid ${drill.border}`,
        cursor: 'pointer', textAlign: 'left',
        boxShadow: `0 4px 24px ${drill.glow}`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        position: 'relative', overflow: 'hidden', minHeight: 112,
      }}
    >
      <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${drill.color}30 0%, transparent 70%)`, filter: 'blur(16px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, fontSize: 20, background: 'rgba(0,0,0,0.22)', border: `1px solid ${drill.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {drill.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.94)', marginBottom: 4, letterSpacing: '-0.02em' }}>
            {drill.title}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>
            {drill.tagline}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: drill.color, opacity: 0.85 }}>{drill.duration}</span>
        {personalBest !== null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)' }}>PB: {personalBest}%</span>
        )}
      </div>
    </motion.button>
  )
}

/* ═══ DRILL TAB ═══════════════════════════════════════ */
function DrillTab() {
  const {
    difficulty, setDifficulty, questionCount, setQuestionCount, focusMode, setFocusMode,
    labSuggestion, clearSuggestion, startDrill, exitDrill, setDrillData, getPersonalBest,
    pendingAutoStart, clearPendingAutoStart,
  } = useLabStore()
  const { struggleZones, dominantTopics } = useNeuralStore()
  const { getDueCards, getDueCount, getUpcomingCount, getTotalCards } = useSRStore()

  const [topicInput, setTopicInput] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const dueCount      = getDueCount()
  const upcomingCount = getUpcomingCount(7)
  const totalSRCards  = getTotalCards()

  useEffect(() => {
    if (labSuggestion?.topic) setTopicInput(labSuggestion.topic)
  }, [labSuggestion])

  const handleStart = async (drillId, topicOverride) => {
    const topic = (topicOverride ?? topicInput).trim()
    if (!topic) { setError('Enter a topic first.'); inputRef.current?.focus(); return }
    setError('')
    if (topicOverride) setTopicInput(topicOverride)
    startDrill(drillId, topic)
    try {
      const { difficulty: d, questionCount: qc, focusMode: fm } = useLabStore.getState()
      const data = await generateDrillContent(drillId, topic, d, qc, fm)
      setDrillData(data)
    } catch {
      setError('Failed to generate content. Try again.')
      exitDrill()
    }
  }

  // Auto-start drill when triggered from roadmap node
  useEffect(() => {
    if (!pendingAutoStart?.topic) return
    const { drillType, topic } = pendingAutoStart
    clearPendingAutoStart()
    handleStart(drillType, topic)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoStart])

  const handleReview = () => {
    const due = getDueCards()
    if (due.length === 0) return
    startDrill('review', 'Spaced Review')
    setDrillData({ cards: due })
  }

  // Suggestion chips: struggle zones first (highest urgency), then interests
  const chips = [
    ...[...struggleZones].reverse().slice(0, 4).map(z => ({ label: z, type: 'struggle' })),
    ...(dominantTopics || []).filter(t => !struggleZones.includes(t)).slice(0, 3).map(t => ({ label: t, type: 'interest' })),
  ].slice(0, 7)

  const btnBase = { padding: '6px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }
  const active = (color) => ({ ...btnBase, background: `${color}22`, borderColor: color, color })
  const inactive = { ...btnBase, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.42)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Lab suggestion banner */}
      <AnimatePresence>
        {labSuggestion && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>🎯 Aeva recommends</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{labSuggestion.reason}</div>
            <button onClick={clearSuggestion} style={{ marginTop: 7, fontSize: 11, color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SR review banner */}
      {dueCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#4ADE80', marginBottom: 2 }}>
              <RefreshCw size={11} style={{ display: 'inline', marginRight: 5 }} />
              {dueCount} card{dueCount !== 1 ? 's' : ''} due
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
              {upcomingCount > 0 ? `${upcomingCount} more due this week` : 'Spaced repetition ready'}
            </div>
          </div>
          <button onClick={handleReview} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.22)', border: '1px solid rgba(34,197,94,0.45)', color: '#86EFAC', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Review now
          </button>
        </motion.div>
      )}
      {dueCount === 0 && totalSRCards > 0 && (
        <div style={{ padding: '9px 13px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)' }}>🧠 {totalSRCards} cards in memory bank</span>
          {upcomingCount > 0 && <span style={{ fontSize: 11, color: 'rgba(74,222,128,0.55)', fontWeight: 600 }}>{upcomingCount} due this week</span>}
        </div>
      )}

      {/* Topic input — full width */}
      <div>
        <input
          ref={inputRef}
          value={topicInput}
          onChange={e => { setTopicInput(e.target.value); setError('') }}
          placeholder="Topic to drill — e.g. Newton's laws, burn rate, logical fallacies…"
          style={{
            width: '100%', padding: '13px 16px', borderRadius: 14, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: error ? '1.5px solid rgba(239,68,68,0.55)' : '1.5px solid rgba(59,130,246,0.30)',
            color: 'rgba(255,255,255,0.90)', fontSize: 14.5, fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.65)'}
          onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.55)' : 'rgba(59,130,246,0.30)'}
          onKeyDown={e => e.key === 'Enter' && handleStart('flashcard')}
        />
        {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 5 }}>{error}</div>}
      </div>

      {/* Inline settings: difficulty + count */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Difficulty:</span>
        {Object.entries(DIFFICULTIES).map(([key, val]) => (
          <button key={key} onClick={() => setDifficulty(key)} style={difficulty === key ? active(val.color) : inactive}>{val.label}</button>
        ))}
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.10)', margin: '0 2px' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Q:</span>
        {[5, 8, 12, 20].map(n => (
          <button key={n} onClick={() => setQuestionCount(n)} style={questionCount === n ? active('#60A5FA') : inactive}>{n}</button>
        ))}
      </div>

      {/* Focus mode */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ key: 'theory', label: 'Theory' }, { key: 'mixed', label: 'Mixed' }, { key: 'application', label: 'Application' }].map(({ key, label }) => (
          <button key={key} onClick={() => setFocusMode(key)} style={focusMode === key ? active('#A78BFA') : inactive}>{label}</button>
        ))}
      </div>

      {/* Suggestion chips */}
      {chips.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>Suggestions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((chip, i) => {
              const isStruggle = chip.type === 'struggle'
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setTopicInput(chip.label)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    background: isStruggle ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)',
                    border: isStruggle ? '1px solid rgba(248,113,113,0.30)' : '1px solid rgba(255,255,255,0.12)',
                    color: isStruggle ? '#FCA5A5' : 'rgba(255,255,255,0.60)',
                  }}
                >
                  {isStruggle ? '⚠ ' : ''}{chip.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* 7-drill grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {Object.values(DRILLS).map((drill, i) => {
          const best = topicInput.trim() ? getPersonalBest(topicInput.trim(), drill.id) : null
          return <DrillCard key={drill.id} drill={drill} index={i} onStart={handleStart} personalBest={best} />
        })}
      </div>
    </div>
  )
}

/* ═══ ORDERS TAB ══════════════════════════════════════ */
const DRILL_EMOJI = { flashcard: '⚡', speedround: '⏱', mocktest: '🎯', feynman: '🧪', match: '🔗', cloze: '✍️', shortanswer: '🧩' }
const URGENCY_COLOR = { high: '#F87171', medium: '#FBBF24', low: '#60A5FA' }

function OrdersTab({ onLaunchOrder }) {
  const { orders, dismissOrder } = useLabStore()
  const pending   = orders.filter(o => !o.completedAt)
  const completed = [...orders.filter(o => o.completedAt)].reverse().slice(0, 12)

  if (pending.length === 0 && completed.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 48, textAlign: 'center' }}>
        <motion.div animate={{ scale: [1, 1.06, 1], opacity: [0.45, 0.65, 0.45] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: 40 }}>🔮</motion.div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 240 }}>
          Aeva is watching. Keep chatting and she'll find your gaps.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Pending · {pending.length}
          </div>
          {pending.map((order) => {
            const urgColor = URGENCY_COLOR[order.urgency] || '#FBBF24'
            const emoji    = DRILL_EMOJI[order.drillType] || '📋'
            const drillDef = DRILLS[order.drillType]
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.22)', position: 'relative' }}
              >
                {/* Urgency badge */}
                <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: urgColor, boxShadow: `0 0 6px ${urgColor}` }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: urgColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{order.urgency}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, paddingRight: 64 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 2 }}>{order.topic}</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(59,130,246,0.70)', fontWeight: 600 }}>{drillDef?.title || order.drillType}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 14, fontStyle: 'italic' }}>
                  "{order.reason}"
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => onLaunchOrder(order)}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 11, background: 'rgba(59,130,246,0.22)', border: '1px solid rgba(59,130,246,0.48)', color: '#93C5FD', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Do it now <ArrowRight size={12} />
                  </motion.button>
                  <button onClick={() => dismissOrder(order.id)}
                    style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.28)', fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )
          })}
        </>
      )}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: pending.length > 0 ? 8 : 0 }}>
            Completed · {completed.length}
          </div>
          {completed.map(order => (
            <div key={order.id} style={{ padding: '11px 14px', borderRadius: 13, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.16)', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.65 }}>
              <span style={{ fontSize: 14, color: '#4ADE80' }}>✓</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.topic}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{DRILLS[order.drillType]?.title || order.drillType}</div>
              </div>
              {order.score !== null && (
                <span style={{ fontSize: 14, fontWeight: 800, color: order.score >= 70 ? '#4ADE80' : '#FBBF24', flexShrink: 0 }}>{order.score}%</span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ═══ STATS TAB ═══════════════════════════════════════ */
function ActivityHeatmap({ history }) {
  const today    = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const countMap = {}
  history.forEach(e => {
    const d = new Date(e.date)
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    countMap[k] = (countMap[k] || 0) + 1
  })

  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 16 * 7 + 1)

  const weeks = []
  for (let w = 0; w < 16; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + w * 7 + d)
      const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      days.push({ count: countMap[k] || 0, isToday: k === todayKey, date })
    }
    weeks.push(days)
  }

  const cellColor = (n) => {
    if (n === 0) return 'rgba(59,130,246,0.07)'
    if (n === 1) return 'rgba(59,130,246,0.32)'
    if (n <= 3)  return 'rgba(59,130,246,0.58)'
    return 'rgba(59,130,246,0.88)'
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Activity — 16 Weeks</div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => (
              <div key={di}
                title={`${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${day.count} drill${day.count !== 1 ? 's' : ''}`}
                style={{ width: 11, height: 11, borderRadius: 2, background: cellColor(day.count), border: day.isToday ? '1px solid rgba(96,165,250,0.85)' : 'none', flexShrink: 0 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>Less</span>
        {[0, 1, 2, 4].map(n => <div key={n} style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(n) }} />)}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>More</span>
      </div>
    </div>
  )
}

function StatsTab() {
  const { drillHistory } = useLabStore()

  // Aggregate stats
  const totalDrills   = drillHistory.length
  const uniqueTopics  = new Set(drillHistory.map(e => e.topic.toLowerCase())).size
  const avgScore      = totalDrills > 0 ? Math.round(drillHistory.reduce((s, e) => s + e.pct, 0) / totalDrills) : 0

  // Personal bests per topic (best pct across all drill types)
  const topicBestMap = {}
  drillHistory.forEach(e => {
    const t = e.topic.toLowerCase()
    if (!topicBestMap[t] || e.pct > topicBestMap[t]) topicBestMap[t] = e.pct
  })
  const topicBests = Object.entries(topicBestMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Recent sessions
  const recent = [...drillHistory].reverse().slice(0, 8)

  const DRILL_COLOR = { flashcard: '#3B82F6', speedround: '#F97316', mocktest: '#06B6D4', feynman: '#8B5CF6', match: '#EC4899', cloze: '#10B981', shortanswer: '#F59E0B' }

  if (totalDrills === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 36, opacity: 0.45 }}>📊</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 }}>Complete a drill to see your stats.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Drills', value: totalDrills, color: '#60A5FA' },
          { label: 'Topics',       value: uniqueTopics, color: '#A78BFA' },
          { label: 'Avg Score',    value: `${avgScore}%`, color: avgScore >= 70 ? '#4ADE80' : avgScore >= 50 ? '#FBBF24' : '#F87171' },
        ].map(card => (
          <div key={card.label} style={{ padding: '14px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <ActivityHeatmap history={drillHistory} />

      {/* Personal bests */}
      {topicBests.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Personal Bests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topicBests.map(([topic, pct], i) => {
              const barColor = pct >= 90 ? '#4ADE80' : pct >= 70 ? '#60A5FA' : pct >= 50 ? '#FBBF24' : '#F87171'
              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', width: 16, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: barColor, flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: barColor, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {recent.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Recent Sessions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {recent.map((entry, i) => {
              const color      = DRILL_COLOR[entry.drillType] || '#60A5FA'
              const gradeColor = entry.pct >= 90 ? '#4ADE80' : entry.pct >= 70 ? '#60A5FA' : entry.pct >= 50 ? '#FBBF24' : '#F87171'
              const dateStr    = new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ padding: '10px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.topic}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{entry.drillType} · {dateStr}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: gradeColor, letterSpacing: '-0.02em', flexShrink: 0 }}>{entry.pct}%</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ LAB HUB MAIN COMPONENT ══════════════════════════ */
export default function LabHub() {
  const {
    labOpen, closeLab, labTab, setLabTab,
    activeDrill, exitDrill,
    currentTopic, drillData, drillLoading,
    orders, setActiveOrderId, startDrill, setDrillData,
  } = useLabStore()
  const { activeNodeSession, endNodeSession, completeNode, openRoadmapHub } = useRoadmapStore()
  const { addXP: addXPLab } = useXPStore()

  const handleLabNodeDone = () => {
    if (activeNodeSession) {
      completeNode(activeNodeSession.roadmapId, activeNodeSession.nodeId)
      addXPLab('DRILL_COMPLETE')
      endNodeSession()
    }
    exitDrill()
    closeLab()
    openRoadmapHub()
  }

  const inputRef = useRef(null)

  const pendingCount = orders.filter(o => !o.completedAt).length

  // Launch an order: pre-fill topic + drill type, mark it as the active order
  const handleLaunchOrder = async (order) => {
    setActiveOrderId(order.id)
    startDrill(order.drillType, order.topic)
    try {
      const { difficulty, questionCount, focusMode } = useLabStore.getState()
      const data = await generateDrillContent(order.drillType, order.topic, difficulty, questionCount, focusMode)
      setDrillData(data)
    } catch {
      exitDrill()
    }
  }

  const tabs = [
    { id: 'drill',  label: 'Drill',           icon: <FlaskConical size={12} /> },
    { id: 'orders', label: "Aeva's Orders",    icon: <span style={{ fontSize: 12 }}>🔮</span>, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'stats',  label: 'Stats',            icon: <span style={{ fontSize: 12 }}>📊</span> },
  ]

  return (
    <AnimatePresence>
      {labOpen && (
        <>
          {/* Full-screen Lab */}
          <motion.div
            key="lab-panel"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.20, ease: 'easeOut' }}
            style={{
              position: 'fixed', inset: 0, zIndex: 201,
              background: 'rgb(5,7,22)',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
              overflow: 'hidden',
            }}
          >
            {/* Glow accents */}
            <div aria-hidden style={{ position: 'absolute', top: -80, left: '10%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', bottom: -80, right: '8%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ borderBottom: '1px solid rgba(59,130,246,0.10)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 32px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #1D4ED8, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FlaskConical size={17} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.03em' }}>Training Lab</div>
                    <div style={{ fontSize: 11, color: 'rgba(59,130,246,0.70)', marginTop: 1, fontWeight: 600 }}>
                      {activeDrill ? `${DRILLS[activeDrill]?.title} — ${currentTopic}` : 'Drill & Mastery Hub'}
                    </div>
                  </div>
                </div>
                {/* Right side: roadmap pill + scan pill + close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {activeNodeSession && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={handleLabNodeDone}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 99, border: 'none',
                        background: 'linear-gradient(135deg, #16a34a, #22C55E)',
                        boxShadow: '0 3px 10px rgba(34,197,94,0.35)',
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}>
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      Done · Next Node
                    </motion.button>
                  )}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 6px #3B82F6' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Scan Mode</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.92 }}
                    onClick={() => { exitDrill(); closeLab() }}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.50)' }}>
                    <X size={15} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            {!activeDrill && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', display: 'flex', gap: 2 }}>
                  {tabs.map(tab => {
                    const isActive = labTab === tab.id
                    return (
                      <button key={tab.id} onClick={() => setLabTab(tab.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: '10px 10px 0 0',
                          background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                          border: 'none', borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                          color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.38)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s', position: 'relative',
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                        {tab.icon}
                        {tab.label}
                        {tab.badge && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}
                            style={{ minWidth: 18, height: 18, borderRadius: 99, background: '#4ADE80', color: '#0a160a', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: 2 }}>
                            {tab.badge}
                          </motion.div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: activeDrill ? 760 : 1100, margin: '0 auto', padding: '24px 32px 48px' }}>

              {/* Active drill */}
              {activeDrill && (
                <>
                  <button onClick={exitDrill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', padding: 0, alignSelf: 'flex-start', marginBottom: 16 }}>
                    ← back to drills
                  </button>
                  {activeDrill === 'review'
                    ? (drillData
                        ? <ReviewDrill data={drillData} onExit={exitDrill}
                            onNewDrill={() => { exitDrill(); setLabTab('drill') }} />
                        : <LabLoading topic="Spaced Review" />
                      )
                    : drillLoading
                      ? <LabLoading topic={currentTopic} />
                      : drillData
                        ? activeDrill === 'flashcard'    ? <FlashcardDrill    data={drillData} topic={currentTopic} onExit={exitDrill} />
                          : activeDrill === 'speedround'  ? <SpeedRoundDrill   data={drillData} topic={currentTopic} onExit={exitDrill} />
                          : activeDrill === 'mocktest'    ? <MockTestDrill     data={drillData} topic={currentTopic} onExit={exitDrill} />
                          : activeDrill === 'feynman'     ? <FeynmanDrill      data={drillData} topic={currentTopic} onExit={exitDrill} />
                          : activeDrill === 'cloze'       ? <ClozeDrill        data={drillData} topic={currentTopic} onExit={exitDrill} />
                          : activeDrill === 'shortanswer' ? <ShortAnswerDrill  data={drillData} topic={currentTopic} onExit={exitDrill} />
                                                         : <MatchGridDrill     data={drillData} topic={currentTopic} onExit={exitDrill} />
                        : <LabLoading topic={currentTopic} />
                  }
                </>
              )}

              {!activeDrill && labTab === 'drill'  && <DrillTab />}
              {!activeDrill && labTab === 'orders' && <OrdersTab onLaunchOrder={handleLaunchOrder} />}
              {!activeDrill && labTab === 'stats'  && <StatsTab />}

              </div>{/* /maxWidth wrapper */}
            </div>{/* /body scroll */}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
