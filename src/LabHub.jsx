import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FlaskConical, ChevronRight, RotateCcw, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { DRILLS, useLabStore } from './labStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ─── AI content generator ─── */
async function generateDrillContent(drillType, topic) {
  const prompts = {
    flashcard: `Generate exactly 8 flashcard pairs for a student studying "${topic}".
Return ONLY valid JSON: {"cards":[{"front":"question","back":"concise answer (1-2 sentences)"}]}
Make questions probe understanding, not just recall. Vary difficulty.`,

    mocktest: `Generate exactly 6 multiple-choice questions about "${topic}".
Return ONLY valid JSON: {"questions":[{"q":"question text","options":["A","B","C","D"],"correct":0,"explanation":"why correct"}]}
"correct" is the 0-based index of the right answer. Make distractors plausible.`,

    match: `Generate exactly 6 term-definition pairs about "${topic}".
Return ONLY valid JSON: {"pairs":[{"term":"short term or concept","definition":"clear 1-sentence definition"}]}
Terms should be distinct, definitions should not contain the term itself.`,
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a precise educational content generator. Return ONLY the requested JSON, no markdown, no explanation.' },
        { role: 'user', content: prompts[drillType] },
      ],
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('Generation failed')
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

/* ═══ FLASHCARD SPRINT ═══════════════════════════════ */
function FlashcardDrill({ data, topic, onExit }) {
  const { setDrillScore } = useLabStore()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([]) // 'got' | 'missed'
  const [done, setDone] = useState(false)
  const cards = data.cards || []

  const handleResult = (result) => {
    const next = [...results, result]
    setResults(next)
    if (idx + 1 >= cards.length) {
      const correct = next.filter(r => r === 'got').length
      setDrillScore({ correct, total: cards.length })
      setDone(true)
    } else {
      setFlipped(false)
      setTimeout(() => setIdx(i => i + 1), 160)
    }
  }

  if (done) return <DrillComplete score={{ correct: results.filter(r => r === 'got').length, total: cards.length }} onExit={onExit} onRetry={() => { setIdx(0); setFlipped(false); setResults([]); setDone(false) }} />

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

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1000 }}>
        <motion.div
          onClick={() => setFlipped(f => !f)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{
            width: '100%', minHeight: 200,
            position: 'relative', transformStyle: 'preserve-3d',
            cursor: 'pointer',
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.28)',
            borderRadius: 20, padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            textAlign: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(59,130,246,0.70)', textTransform: 'uppercase' }}>Question</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {card?.front}
            </p>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 8 }}>tap to reveal</span>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.30)',
            borderRadius: 20, padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            textAlign: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(6,182,212,0.70)', textTransform: 'uppercase' }}>Answer</span>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>
              {card?.back}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Actions — only visible once flipped */}
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleResult('missed')} style={{
              flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <XCircle size={15} /> Missed it
            </button>
            <button onClick={() => handleResult('got')} style={{
              flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(74,222,128,0.35)',
              background: 'rgba(74,222,128,0.12)', color: '#86EFAC',
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <CheckCircle2 size={15} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ MOCK TEST ══════════════════════════════════════ */
function MockTestDrill({ data, onExit }) {
  const { setDrillScore } = useLabStore()
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const questions = data.questions || []

  const choose = (i) => {
    if (selected !== null) return
    setSelected(i)
  }

  const next = () => {
    const correct = selected === questions[idx].correct
    const newScore = correct ? score + 1 : score
    if (idx + 1 >= questions.length) {
      setDrillScore({ correct: newScore, total: questions.length })
      setScore(newScore)
      setDone(true)
    } else {
      setScore(newScore)
      setSelected(null)
      setIdx(i => i + 1)
    }
  }

  if (done) return <DrillComplete score={{ correct: score, total: questions.length }} onExit={onExit} onRetry={() => { setIdx(0); setSelected(null); setScore(0); setDone(false) }} />

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {q?.options.map((opt, i) => {
          const isSelected = selected === i
          const isCorrect = selected !== null && i === q.correct
          const isWrong = isSelected && i !== q.correct
          return (
            <motion.button
              key={i}
              whileHover={selected === null ? { scale: 1.015 } : {}}
              whileTap={selected === null ? { scale: 0.985 } : {}}
              onClick={() => choose(i)}
              style={{
                padding: '13px 16px', borderRadius: 12, textAlign: 'left',
                cursor: selected === null ? 'pointer' : 'default',
                fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                fontFamily: "'Inter', system-ui, sans-serif",
                background: isCorrect ? 'rgba(74,222,128,0.14)' : isWrong ? 'rgba(239,68,68,0.14)' : isSelected ? 'rgba(6,182,212,0.14)' : 'rgba(255,255,255,0.05)',
                border: isCorrect ? '1px solid rgba(74,222,128,0.40)' : isWrong ? '1px solid rgba(239,68,68,0.40)' : isSelected ? '1px solid rgba(6,182,212,0.40)' : '1px solid rgba(255,255,255,0.10)',
                color: isCorrect ? '#86EFAC' : isWrong ? '#FCA5A5' : 'rgba(255,255,255,0.80)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 10, opacity: 0.55 }}>
                {['A', 'B', 'C', 'D'][i]}.
              </span>
              {opt}
            </motion.button>
          )
        })}
      </div>

      {selected !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' }}>
            {q?.explanation}
          </div>
          <button onClick={next} style={{
            width: '100%', padding: '13px', borderRadius: 13,
            background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(59,130,246,0.20))',
            border: '1px solid rgba(6,182,212,0.40)', color: 'rgba(255,255,255,0.92)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            {idx + 1 === questions.length ? 'See Results' : 'Next Question'}
            <ArrowRight size={14} />
          </button>
        </motion.div>
      )}
    </div>
  )
}

/* ═══ MATCH GRID ═════════════════════════════════════ */
function MatchGridDrill({ data, onExit }) {
  const { setDrillScore } = useLabStore()
  const pairs = data.pairs || []
  const [terms] = useState(pairs.map(p => p.term))
  const [defs] = useState(() => [...pairs.map(p => p.definition)].sort(() => Math.random() - 0.5))
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [selectedDef, setSelectedDef] = useState(null)
  const [matched, setMatched] = useState([]) // array of term strings that are matched
  const [wrong, setWrong] = useState(null)   // { term, def } briefly shown as wrong
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (selectedTerm !== null && selectedDef !== null) {
      const termObj = pairs.find(p => p.term === terms[selectedTerm])
      if (termObj && termObj.definition === defs[selectedDef]) {
        // Correct match
        const newMatched = [...matched, terms[selectedTerm]]
        setMatched(newMatched)
        setSelectedTerm(null)
        setSelectedDef(null)
        if (newMatched.length === pairs.length) {
          setDrillScore({ correct: pairs.length, total: pairs.length })
          setTimeout(() => setDone(true), 600)
        }
      } else {
        // Wrong match
        setWrong({ term: selectedTerm, def: selectedDef })
        setTimeout(() => {
          setWrong(null)
          setSelectedTerm(null)
          setSelectedDef(null)
        }, 700)
      }
    }
  }, [selectedTerm, selectedDef])

  if (done) return <DrillComplete score={{ correct: pairs.length, total: pairs.length }} perfect onExit={onExit} onRetry={() => { setMatched([]); setSelectedTerm(null); setSelectedDef(null); setDone(false) }} />

  const progress = (matched.length / pairs.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em' }}>
            {matched.length} / {pairs.length} matched
          </span>
          <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 700 }}>click a term, then its definition</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
        {/* Terms column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {terms.map((term, i) => {
            const isMatched = matched.includes(term)
            const isSel = selectedTerm === i
            const isWrong_ = wrong?.term === i
            return (
              <motion.button
                key={term}
                whileHover={!isMatched ? { scale: 1.02 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                onClick={() => !isMatched && setSelectedTerm(i === selectedTerm ? null : i)}
                style={{
                  padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  fontSize: 12.5, fontWeight: 700, lineHeight: 1.35,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.45 : 1,
                  background: isMatched ? 'rgba(74,222,128,0.12)' : isWrong_ ? 'rgba(239,68,68,0.18)' : isSel ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.06)',
                  border: isMatched ? '1px solid rgba(74,222,128,0.30)' : isWrong_ ? '1px solid rgba(239,68,68,0.45)' : isSel ? '1px solid rgba(139,92,246,0.55)' : '1px solid rgba(255,255,255,0.10)',
                  color: isMatched ? '#86EFAC' : isSel ? '#C4B5FD' : 'rgba(255,255,255,0.82)',
                  transition: 'all 0.15s',
                }}
              >
                {term}
              </motion.button>
            )
          })}
        </div>

        {/* Definitions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {defs.map((def, i) => {
            const matchedTerm = pairs.find(p => p.definition === def)?.term
            const isMatched = matched.includes(matchedTerm)
            const isSel = selectedDef === i
            const isWrong_ = wrong?.def === i
            return (
              <motion.button
                key={def}
                whileHover={!isMatched ? { scale: 1.02 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                onClick={() => !isMatched && setSelectedDef(i === selectedDef ? null : i)}
                style={{
                  padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  fontSize: 11.5, fontWeight: 500, lineHeight: 1.45,
                  fontFamily: "'Georgia', serif",
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.45 : 1,
                  background: isMatched ? 'rgba(74,222,128,0.08)' : isWrong_ ? 'rgba(239,68,68,0.14)' : isSel ? 'rgba(139,92,246,0.16)' : 'rgba(255,255,255,0.04)',
                  border: isMatched ? '1px solid rgba(74,222,128,0.25)' : isWrong_ ? '1px solid rgba(239,68,68,0.40)' : isSel ? '1px solid rgba(139,92,246,0.48)' : '1px solid rgba(255,255,255,0.08)',
                  color: isMatched ? '#86EFAC' : isSel ? '#C4B5FD' : 'rgba(255,255,255,0.65)',
                  transition: 'all 0.15s',
                  flex: 1,
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

/* ═══ DRILL COMPLETE SCREEN ══════════════════════════ */
function DrillComplete({ score, perfect, onExit, onRetry }) {
  const pct = Math.round((score.correct / score.total) * 100)
  const grade = pct >= 90 ? { label: 'Mastery', color: '#4ADE80', emoji: '🏆' }
    : pct >= 70 ? { label: 'Solid', color: '#60A5FA', emoji: '✅' }
    : pct >= 50 ? { label: 'Developing', color: '#FBBF24', emoji: '📈' }
    : { label: 'Needs Work', color: '#F87171', emoji: '🔁' }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}
    >
      <div style={{ fontSize: 48 }}>{grade.emoji}</div>
      <div>
        <div style={{ fontSize: 52, fontWeight: 800, color: grade.color, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {pct}%
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: grade.color, marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {grade.label}
        </div>
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
        {score.correct} / {score.total} correct
      </div>
      {perfect && <div style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>Perfect score — flawless match!</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onRetry} style={{
          padding: '11px 20px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <RotateCcw size={13} /> Try again
        </button>
        <button onClick={onExit} style={{
          padding: '11px 20px', borderRadius: 13,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(6,182,212,0.20))',
          border: '1px solid rgba(59,130,246,0.40)', color: 'rgba(255,255,255,0.92)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Back to Lab <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
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

/* ═══ DRILL CARD (in hub) ════════════════════════════ */
function DrillCard({ drill, onStart, index }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 + index * 0.07, duration: 0.32 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onStart(drill.id)}
      style={{
        width: '100%', padding: '18px 20px', borderRadius: 18,
        background: drill.colorDim, border: `1px solid ${drill.border}`,
        cursor: 'pointer', textAlign: 'left',
        boxShadow: `0 4px 24px ${drill.glow}`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div aria-hidden style={{
        position: 'absolute', top: -15, right: -15, width: 60, height: 60,
        borderRadius: '50%', background: `radial-gradient(circle, ${drill.color}28 0%, transparent 70%)`,
        filter: 'blur(12px)', pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, fontSize: 18,
          background: `rgba(0,0,0,0.22)`, border: `1px solid ${drill.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {drill.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 3, letterSpacing: '-0.01em' }}>
            {drill.title}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
            {drill.tagline}
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: drill.color, opacity: 0.80, flexShrink: 0 }}>
          {drill.duration}
        </div>
      </div>
    </motion.button>
  )
}

/* ═══ LAB HUB MAIN COMPONENT ══════════════════════════ */
export default function LabHub() {
  const {
    labOpen, closeLab, activeDrill, startDrill, exitDrill,
    currentTopic, drillData, drillLoading, setDrillData,
    labSuggestion, clearSuggestion,
  } = useLabStore()

  const [topicInput, setTopicInput] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // Pre-fill topic from lab suggestion
  useEffect(() => {
    if (labSuggestion?.topic) setTopicInput(labSuggestion.topic)
  }, [labSuggestion])

  const handleStart = async (drillId) => {
    const topic = topicInput.trim()
    if (!topic) { setError('Enter a topic first.'); inputRef.current?.focus(); return }
    setError('')
    startDrill(drillId, topic)
    try {
      const data = await generateDrillContent(drillId, topic)
      setDrillData(data)
    } catch {
      setError('Failed to generate content. Try again.')
      exitDrill()
    }
  }

  return (
    <AnimatePresence>
      {labOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lab-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!activeDrill) closeLab() }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,6,20,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          />

          {/* Panel */}
          <motion.div
            key="lab-panel"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 'min(420px, 92vw)', zIndex: 201,
              background: 'rgba(6,8,24,0.80)',
              backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)',
              borderRight: '1px solid rgba(59,130,246,0.14)',
              boxShadow: '20px 0 80px rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Blue glow accents */}
            <div aria-hidden style={{ position: 'absolute', top: -40, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', bottom: -30, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ padding: '28px 22px 18px', borderBottom: '1px solid rgba(59,130,246,0.10)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg, #1D4ED8, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FlaskConical size={16} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>Training Lab</div>
                    <div style={{ fontSize: 11, color: 'rgba(59,130,246,0.70)', marginTop: 1, fontWeight: 600 }}>
                      {activeDrill ? `${DRILLS[activeDrill]?.title} — ${currentTopic}` : 'Drill & Mastery Hub'}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.92 }}
                  onClick={() => { exitDrill(); closeLab(); clearSuggestion() }}
                  style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}
                >
                  <X size={14} />
                </motion.button>
              </div>

              {/* Scanning indicator */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)' }}>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 6px #3B82F6' }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  Scan Mode Active
                </span>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>

              {/* Lab Suggestion banner */}
              <AnimatePresence>
                {labSuggestion && !activeDrill && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
                    style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                      🎯 Aeva recommends
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                      {labSuggestion.reason}
                    </div>
                    <button onClick={clearSuggestion} style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active drill */}
              {activeDrill && (
                <>
                  <button onClick={exitDrill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}>
                    ← back to drills
                  </button>
                  {drillLoading
                    ? <LabLoading topic={currentTopic} />
                    : drillData
                      ? activeDrill === 'flashcard' ? <FlashcardDrill data={drillData} topic={currentTopic} onExit={exitDrill} />
                        : activeDrill === 'mocktest' ? <MockTestDrill data={drillData} onExit={exitDrill} />
                          : <MatchGridDrill data={drillData} onExit={exitDrill} />
                      : <LabLoading topic={currentTopic} />
                  }
                </>
              )}

              {/* Hub — drill selection */}
              {!activeDrill && (
                <>
                  {/* Topic input */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                      Topic to drill
                    </label>
                    <input
                      ref={inputRef}
                      value={topicInput}
                      onChange={e => { setTopicInput(e.target.value); setError('') }}
                      placeholder="e.g. burn rate, Newton's laws, logical fallacies…"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.06)', border: error ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(59,130,246,0.28)',
                        color: 'rgba(255,255,255,0.88)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
                        outline: 'none',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.60)'}
                      onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.55)' : 'rgba(59,130,246,0.28)'}
                      onKeyDown={e => e.key === 'Enter' && handleStart('flashcard')}
                    />
                    {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 5 }}>{error}</div>}
                  </div>

                  {/* Drill cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.values(DRILLS).map((drill, i) => (
                      <DrillCard key={drill.id} drill={drill} index={i} onStart={handleStart} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!activeDrill && (
              <div style={{ padding: '14px 22px 22px', borderTop: '1px solid rgba(59,130,246,0.08)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: 0, textAlign: 'center', lineHeight: 1.55 }}>
                  The Lab drills build the skills the Arcade demands.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
