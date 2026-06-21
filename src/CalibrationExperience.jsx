/**
 * CalibrationExperience.jsx
 * Full-screen diagnostic overlay — replaces the in-chat calibration UX.
 * Phases 0-2: dedicated UI, live level arc, animated question cards.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import katex from 'katex'
import { SUBJECT_LABELS, SUBJECT_ICONS } from './calibrationMap'

// ── Band definitions (high → low so getBand() finds the right one first) ──────
const BANDS = [
  { label: 'AP · Year 2',  min:  8.5, color: '#F59E0B' },
  { label: 'AP · Year 1',  min:  7.5, color: '#E9A364' },
  { label: 'Grade 11+',    min:  6.5, color: '#5558D9' },
  { label: 'Grade 11',     min:  5.5, color: '#6366F1' },
  { label: 'Grade 10+',    min:  4.5, color: '#7C52E8' },
  { label: 'Grade 10',     min:  3.5, color: '#8B5CF6' },
  { label: 'Grade 9+',     min:  2.5, color: '#9B75F5' },
  { label: 'Grade 9',      min:  1.5, color: '#A78BFA' },
  { label: 'Grade 8',      min:  0.5, color: '#34D399' },
  { label: 'Grade 7',      min: -0.5, color: '#4ADE80' },
  { label: 'Grade 6',      min: -1.5, color: '#60D0A0' },
  { label: 'Grade 5',      min: -2.5, color: '#FBBF24' },
  { label: 'Grade 4',      min: -3.5, color: '#FB923C' },
  { label: 'Grade 3',      min: -4.5, color: '#FD7B44' },
  { label: 'Grade 2',      min: -5.5, color: '#F87171' },
  { label: 'Grade 1',      min: -6,   color: '#F87171' },
]

const SCORE_MIN = -6
const SCORE_MAX = 9
const toPos = score => Math.max(0, Math.min(1, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)))

function getBand(score) {
  for (const b of BANDS) if (score >= b.min) return b
  return BANDS[BANDS.length - 1]
}

// ── Inline math renderer (KaTeX, handles \n line-breaks) ─────────────────────
// noMath=true skips KaTeX entirely — used for Reading where $ may appear in prose
function QuestionText({ text, noMath = false }) {
  const lines = (text || '').split('\n')
  return (
    <span>
      {lines.map((line, li) => {
        if (noMath) {
          return <span key={li}>{li > 0 && <br />}{line}</span>
        }
        const parts = line.split(/\$([^$\n]+)\$/)
        return (
          <span key={li}>
            {li > 0 && <br />}
            {parts.map((part, pi) => {
              if (pi % 2 === 1) {
                try {
                  const html = katex.renderToString(part, { throwOnError: false, displayMode: false })
                  return <span key={pi} dangerouslySetInnerHTML={{ __html: html }} />
                } catch {
                  return <code key={pi}>{part}</code>
                }
              }
              return <span key={pi}>{part}</span>
            })}
          </span>
        )
      })}
    </span>
  )
}

// ── Vertical level arc ────────────────────────────────────────────────────────
function LevelArc({ liveScore, nodeCount, isLight }) {
  const HEIGHT = 320
  const hasScore = liveScore !== null && liveScore !== undefined

  const position   = hasScore ? toPos(liveScore) : 0
  const markerY    = HEIGHT * (1 - position)

  // Confidence band: wide at start, narrows as more nodes are assessed
  const halfRange  = Math.max(0.025, 0.20 - nodeCount * 0.013)
  const topY       = Math.max(0,      HEIGHT * (1 - Math.min(1, position + halfRange)))
  const bottomY    = Math.min(HEIGHT, HEIGHT * (1 - Math.max(0, position - halfRange)))

  const currentBand = hasScore ? getBand(liveScore) : null

  const trackCol = isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.08)'
  const mutedCol = isLight ? 'rgba(0,0,0,0.28)'  : 'rgba(255,255,255,0.28)'
  const tickCol  = isLight ? 'rgba(0,0,0,0.12)'  : 'rgba(255,255,255,0.10)'

  return (
    <div style={{ width: 168, flexShrink: 0, userSelect: 'none' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: mutedCol, textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>
        Your Level
      </div>

      <div style={{ position: 'relative', height: HEIGHT }}>
        {/* Track */}
        <div style={{ position: 'absolute', left: 62, top: 0, bottom: 0, width: 3, background: trackCol, borderRadius: 2 }} />

        {/* Band ticks + labels */}
        {BANDS.map(band => {
          const y      = HEIGHT * (1 - toPos(band.min))
          const active = currentBand?.label === band.label
          return (
            <div key={band.label} style={{ position: 'absolute', top: y, left: 0, right: 0, display: 'flex', alignItems: 'center', transform: 'translateY(-50%)' }}>
              {/* tick left of dot */}
              <div style={{ width: 10, height: 1.5, background: active ? band.color : tickCol, borderRadius: 1, marginRight: 4, marginLeft: 46, flexShrink: 0, transition: 'background 0.4s' }} />
              {/* dot */}
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: active ? band.color : tickCol,
                boxShadow: active ? `0 0 8px ${band.color}88` : 'none',
                transition: 'all 0.4s',
              }} />
              {/* label */}
              <div style={{ paddingLeft: 9, fontSize: 9.5, fontWeight: active ? 800 : 500, color: active ? band.color : mutedCol, whiteSpace: 'nowrap', transition: 'all 0.35s' }}>
                {band.label}
              </div>
            </div>
          )
        })}

        {/* Confidence glow band */}
        {hasScore && (
          <div style={{
            position: 'absolute', left: 56, top: topY, height: bottomY - topY, width: 14,
            background: `${currentBand?.color || '#818CF8'}26`, borderRadius: 7,
            transition: 'background 0.4s',
          }} />
        )}

        {/* Animated glowing marker */}
        {hasScore && (
          <motion.div
            animate={{ top: markerY }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
            style={{ position: 'absolute', left: 63, transform: 'translate(-50%, -50%)', zIndex: 2 }}
          >
            <motion.div
              animate={{ boxShadow: [`0 0 12px ${currentBand?.color}99`, `0 0 20px ${currentBand?.color}44`, `0 0 12px ${currentBand?.color}99`] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: currentBand?.color || '#818CF8',
                border: '2.5px solid rgba(255,255,255,0.95)',
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Band label below arc */}
      <div style={{ marginTop: 16, textAlign: 'center', minHeight: 38 }}>
        <AnimatePresence mode="wait">
          {currentBand ? (
            <motion.div key={currentBand.label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: currentBand.color }}>{currentBand.label}</div>
              <div style={{ fontSize: 9.5, color: mutedCol, marginTop: 3, fontWeight: 500 }}>estimated level</div>
            </motion.div>
          ) : (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 10, color: mutedCol, marginTop: 4 }}>
              Calibrating…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Feedback flash configs ────────────────────────────────────────────────────
const FEEDBACK_CFG = {
  mastery: { color: '#C084FC', bg: 'rgba(192,132,252,0.11)', border: 'rgba(192,132,252,0.28)' },
  solid:   { color: '#4ADE80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.28)'  },
  partial: { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)'  },
  none:    { color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)' },
}

// ── UI text — English and Japanese ───────────────────────────────────────────
const UI_TEXT = {
  en: {
    fastLaneLabel:   '⚡ Quick Placement',
    diagnosticLabel: (q) => `Diagnostic · Q${q}`,
    topicsLabel:     (hit, total) => `· ${hit}/${total} topics`,
    saveExit:        'Save & Exit',
    placeholder:     'Your answer — show working if needed  (⌘ Enter to submit)',
    placeholderEval: 'Checking your answer…',
    checking:        'Checking…',
    skip:            'Skip this one',
    submit:          'Submit',
    hint:            'Show your working — partial credit awarded for correct approach',
    feedback: {
      mastery: { label: '✦ Excellent',    sub: 'Mastery demonstrated'   },
      solid:   { label: '✓ Correct',      sub: 'Well done'              },
      partial: { label: '≈ Almost there', sub: 'Right idea, small gap'  },
      none:    { label: '✗ Not quite',    sub: 'Keep going'             },
    },
  },
  ja: {
    fastLaneLabel:   '⚡ 速度配置',
    diagnosticLabel: (q) => `診断 · Q${q}`,
    topicsLabel:     (hit, total) => `· ${hit}/${total} トピック`,
    saveExit:        '保存して終了',
    placeholder:     '回答を入力 — 途中式も書いてください（⌘ Enter で送信）',
    placeholderEval: '回答を確認中…',
    checking:        '確認中…',
    skip:            'スキップ',
    submit:          '提出',
    hint:            '途中式を書いてください — 正しいアプローチには部分点が与えられます',
    feedback: {
      mastery: { label: '✦ 素晴らしい', sub: '完全習得'               },
      solid:   { label: '✓ 正解',       sub: 'よくできました'          },
      partial: { label: '≈ もう少し',   sub: '考え方は合っています'    },
      none:    { label: '✗ 惜しい',     sub: '続けましょう'            },
    },
  },
}

// ── Subject-aware UI text resolver ───────────────────────────────────────────
// Reading needs different strings; all other subjects use the language base.
function getUIText(language, subject) {
  const base = UI_TEXT[language] || UI_TEXT.en
  if (subject !== 'reading') return base

  const readingOverrides = language === 'ja'
    ? {
        placeholder:     'あなたの回答 — パッセージから引用して説明してください（⌘ Enter で送信）',
        placeholderEval: '回答を確認中…',
        hint:            'パッセージから引用し、考えを説明してください — 部分的でも部分点が与えられます',
        feedback: {
          mastery: { label: '✦ 素晴らしい', sub: '鋭い読み取りです'          },
          solid:   { label: '✓ よく読めた', sub: '良い解釈です'              },
          partial: { label: '≈ もう少し',  sub: '方向性は合っています'       },
          none:    { label: '✗ 惜しい',    sub: '続けましょう'              },
        },
      }
    : {
        placeholder:     'Your response — quote from the passage to support your answer  (⌘ Enter to submit)',
        placeholderEval: 'Reading your response…',
        hint:            'Quote from the passage and explain your reasoning — a supported interpretation earns partial credit',
        feedback: {
          mastery: { label: '✦ Excellent',    sub: 'Perceptive analysis'      },
          solid:   { label: '✓ Well read',    sub: 'Good interpretation'      },
          partial: { label: '≈ Almost there', sub: 'Right track, develop it'  },
          none:    { label: '✗ Not quite',    sub: 'Keep going'               },
        },
      }

  return { ...base, ...readingOverrides }
}

// ── MC option parser ─────────────────────────────────────────────────────────
// Detects "(a) ... (b) ... (c) ..." patterns in reading questions.
// Returns { stem, options: [{ key, label }] } or null if no options found.
function parseMCOptions(questionText) {
  const text = questionText || ''
  const aIdx = text.search(/\(a\)/i)
  if (aIdx === -1) return null

  const stem    = text.slice(0, aIdx).trim()
  const optPart = text.slice(aIdx)

  // Real MC stems always end with '?' — sub-task instructions end with ':' and must not trigger MC
  if (!/\?\s*$/.test(stem)) return null

  // Extract each (x) … up to the next (x) or end of string
  const regex = /\(([a-d])\)\s*([^(]*?)(?=\s*\([a-d]\)|$)/gi
  const matches = [...optPart.matchAll(regex)]
  if (matches.length < 2) return null

  const options = matches.map(m => ({
    key:   m[1].toLowerCase(),
    // Strip trailing instructional phrases that aren't part of the option label
    label: m[2].trim()
      .replace(/[.·]\s*(Explain|Give one|Use the|Why|Note:|How|What).*/i, '')
      .replace(/\.$/, '')
      .trim(),
  })).filter(o => {
    if (!o.label) return false
    // Reject labels that are themselves questions or essay prompts
    if (o.label.endsWith('?')) return false
    // Reject labels that are too long to be answer choices (> 150 chars = paragraph, not a choice)
    if (o.label.length > 150) return false
    return true
  })

  // Require at least 3 valid options — real MC is A/B/C/D (4), never just 2
  // This prevents false detection on open-ended questions with incidental (a)/(b) markers
  return options.length >= 3 ? { stem, options } : null
}

// ── Sub-question parser ──────────────────────────────────────────────────────
// Detects "(a) ... (b) ..." patterns that are open-ended sub-tasks (not MC options).
// MC stems end with '?'; sub-question stems end with ':' or contain "answer both".
function parseSubQuestions(questionText) {
  const text = questionText || ''
  const aIdx = text.search(/\(a\)/i)
  if (aIdx === -1) return null
  const stem = text.slice(0, aIdx).trim()
  // Must be a sub-task stem (ends with ':' or contains directive phrasing), not an MC stem
  if (!/[:\-]$/.test(stem) && !/answer both|quick check/i.test(stem)) return null
  const regex = /\(([a-d])\)\s*([^(]+?)(?=\s*\([a-d]\)|$)/gi
  const matches = [...text.matchAll(regex)]
  if (matches.length < 2) return null
  const parts = matches.map(m => ({ key: m[1].toLowerCase(), label: m[2].trim() })).filter(p => p.label.length > 0)
  return parts.length >= 2 ? { stem, parts } : null
}

// ── Multi-select option parser ───────────────────────────────────────────────
// Triggered only when question text contains explicit "select TWO" / "which TWO" phrasing.
// Returns { stem, options: [{ key, label }], selectCount } or null.
function parseMSOptions(questionText) {
  const text = questionText || ''
  if (!/\b(select\s+two|which\s+two|select\s+2|choose\s+two)\b/i.test(text)) return null

  const aIdx = text.search(/\(a\)/i)
  if (aIdx === -1) return null

  const stem    = text.slice(0, aIdx).trim()
  const optPart = text.slice(aIdx)

  const regex   = /\(([a-d])\)\s*([^(]*?)(?=\s*\([a-d]\)|$)/gi
  const matches = [...optPart.matchAll(regex)]
  if (matches.length < 2) return null

  const options = matches.map(m => ({
    key:   m[1].toLowerCase(),
    label: m[2].trim().replace(/\.$/, '').trim(),
  })).filter(o => o.label.length > 0 && o.label.length <= 150)

  return options.length >= 2 ? { stem, options, selectCount: 2 } : null
}

// ── Main export ───────────────────────────────────────────────────────────────
export function CalibrationExperience({
  question,           // { text, nodeId, tier, qNum, isFastLane }
  liveScore,          // weighted band average score (null until first node assessed)
  nodeCount,          // distinct nodes assessed so far
  questionsAsked,     // total questions (including retries)
  subject,
  language = 'en',    // 'en' | 'ja'
  isEvaluating,       // critic is running — disable input
  lastFeedback,       // { understanding, ts } — triggers flash
  isLight,
  clusterInfo,        // { hit, total } — cluster coverage for maths (null for other subjects)
  onAnswer,           // (text: string) => void
  onSkip,             // () => void
  onExit,             // () => void
}) {
  const t = getUIText(language, subject)
  const [input, setInput]               = useState('')
  const [subInputs, setSubInputs]       = useState({})    // per-part answers for sub-questions
  const [showFeedback, setShowFeedback] = useState(false)
  const [activeFeedback, setActiveFeedback] = useState(null)
  const [selectedMC, setSelectedMC]     = useState(null)  // key of tapped MC option
  const [selectedMS, setSelectedMS]     = useState([])    // keys of toggled multi-select options
  const mcSubmitRef                     = useRef(null)     // pending MC auto-submit timer
  const inputRef = useRef(null)

  // Parse question type: multi-select takes priority over single-choice MC
  const msData = subject === 'reading' ? parseMSOptions(question?.text) : null
  const mcData = !msData && subject === 'reading' ? parseMCOptions(question?.text) : null
  const sqData = !msData && !mcData ? parseSubQuestions(question?.text) : null

  const subjectLabel = SUBJECT_LABELS[subject] || subject
  const subjectIcon  = SUBJECT_ICONS[subject]  || '📚'

  // Feedback flash: triggers whenever lastFeedback.ts changes
  useEffect(() => {
    if (!lastFeedback) return
    setActiveFeedback(lastFeedback)
    setShowFeedback(true)
    const t = setTimeout(() => setShowFeedback(false), 1700)
    return () => clearTimeout(t)
  }, [lastFeedback?.ts])

  // Clear input / MC / MS / sub-question state and re-focus when question changes
  useEffect(() => {
    setInput('')
    setSubInputs({})
    setSelectedMC(null)
    setSelectedMS([])
    if (mcSubmitRef.current) { clearTimeout(mcSubmitRef.current); mcSubmitRef.current = null }
    if (!mcData && !msData && !sqData) {
      const t = setTimeout(() => inputRef.current?.focus(), 180)
      return () => clearTimeout(t)
    }
  }, [question?.text]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: A/B/C/D toggles MS options or selects MC option; ⌘Enter submits textarea/MS
  useEffect(() => {
    const handler = (e) => {
      if (isEvaluating) return
      const key = e.key.toLowerCase()
      if (msData && ['a','b','c','d'].includes(key)) {
        const opt = msData.options.find(o => o.key === key)
        if (opt) handleMSToggle(opt)
        return
      }
      if (mcData && !selectedMC && ['a','b','c','d'].includes(key)) {
        const opt = mcData.options.find(o => o.key === key)
        if (opt) handleMCSelect(opt)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEvaluating, selectedMC, selectedMS, mcData, msData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMCSelect = (opt) => {
    if (selectedMC || isEvaluating) return
    setSelectedMC(opt.key)
    // Brief delay so the selection highlights before the screen transitions
    mcSubmitRef.current = setTimeout(() => {
      onAnswer(`(${opt.key}) ${opt.label}`)
    }, 380)
  }

  const handleMSToggle = (opt) => {
    if (isEvaluating) return
    setSelectedMS(prev =>
      prev.includes(opt.key) ? prev.filter(k => k !== opt.key) : [...prev, opt.key]
    )
  }

  const handleMSSubmit = () => {
    if (isEvaluating || selectedMS.length < 2) return
    const answer = selectedMS
      .sort()
      .map(k => {
        const opt = msData.options.find(o => o.key === k)
        return `(${k}) ${opt?.label || k}`
      })
      .join(', ')
    onAnswer(answer)
    setSelectedMS([])
  }

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isEvaluating) return
    onAnswer(text)
    setInput('')
  }

  const handleSQSubmit = () => {
    if (isEvaluating || !sqData) return
    const allFilled = sqData.parts.every(p => (subInputs[p.key] || '').trim())
    if (!allFilled) return
    const combined = sqData.parts
      .map(p => `(${p.key}) ${subInputs[p.key].trim()}`)
      .join('\n')
    onAnswer(combined)
    setSubInputs({})
  }

  const handleKeyDown = e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const bg          = isLight ? '#f4f5fa' : '#0d0e16'
  const cardBg      = isLight ? '#ffffff' : '#161826'
  const borderCol   = isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.07)'
  const inputBorder = isLight ? 'rgba(0,0,0,0.10)'  : 'rgba(255,255,255,0.10)'
  const textCol     = isLight ? '#0f1117'            : 'rgba(255,255,255,0.88)'
  const mutedCol    = isLight ? 'rgba(0,0,0,0.36)'  : 'rgba(255,255,255,0.32)'

  if (!question) return null

  const fbCfg  = activeFeedback ? (FEEDBACK_CFG[activeFeedback.understanding] || FEEDBACK_CFG.partial) : null
  const segCount = Math.max(nodeCount + 2, 12)

  return (
    <motion.div
      key="calib-exp"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: `1px solid ${borderCol}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{subjectIcon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: textCol }}>{subjectLabel}</span>
          <div style={{ width: 1, height: 14, background: borderCol }} />
          {question.isFastLane
            ? <span style={{ fontSize: 10.5, fontWeight: 700, color: '#FBBF24', letterSpacing: '0.05em' }}>{t.fastLaneLabel}</span>
            : (
              <span style={{ fontSize: 11, color: mutedCol, fontWeight: 600 }}>
                {t.diagnosticLabel(questionsAsked + 1)}
                {clusterInfo && clusterInfo.hit > 0 && (
                  <span style={{ marginLeft: 6, color: clusterInfo.hit >= 3 ? '#4ADE80' : mutedCol }}>
                    {t.topicsLabel(clusterInfo.hit, clusterInfo.total)}
                  </span>
                )}
              </span>
            )
          }
        </div>
        <button
          onClick={onExit}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: mutedCol, display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8,
          }}
        >
          <X size={13} /> {t.saveExit}
        </button>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 3, padding: '10px 28px 0', flexShrink: 0 }}>
        {Array.from({ length: segCount }).map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 2, maxWidth: 40,
            background: i < nodeCount
              ? '#818CF8'
              : i === nodeCount
              ? 'rgba(129,140,248,0.32)'
              : borderCol,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 32px', gap: 44, overflow: 'hidden',
        maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>

        {/* ── Left: question + answer ───────────────────────────────────────── */}
        <div style={{ flex: 1, maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Question card — slides in from right on each new question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={question.text}
              initial={{ opacity: 0, x: 40, filter: 'blur(3px)' }}
              animate={{ opacity: 1, x: 0,  filter: 'blur(0px)' }}
              exit={  { opacity: 0, x: -40, filter: 'blur(3px)' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 18,
                padding: '28px 32px',
                fontSize: 16.5, lineHeight: 1.78, color: textCol, fontWeight: 440,
              }}
            >
              {/* For MC/MS questions show only the stem; options rendered below */}
              <QuestionText
                text={msData ? msData.stem : mcData ? mcData.stem : question.text}
                noMath={subject === 'reading'}
              />
            </motion.div>
          </AnimatePresence>

          {/* Feedback flash */}
          <AnimatePresence>
            {showFeedback && fbCfg && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1,  y: 0,   scale: 1    }}
                exit={  { opacity: 0,           scale: 0.97 }}
                transition={{ duration: 0.16 }}
                style={{
                  background: fbCfg.bg, border: `1px solid ${fbCfg.border}`,
                  borderRadius: 12, padding: '10px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: fbCfg.color }}>{t.feedback[activeFeedback?.understanding]?.label}</span>
                <span style={{ fontSize: 11, color: fbCfg.color, opacity: 0.65 }}>{t.feedback[activeFeedback?.understanding]?.sub}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {msData ? (
            /* ── Multi-select option buttons ───────────────────────────────── */
            <>
              <div style={{ fontSize: 11, color: 'rgba(129,140,248,0.8)', fontWeight: 600, marginTop: -4 }}>
                Select {msData.selectCount} answers
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={question.text + '-ms'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1,  y: 0  }}
                  exit={  { opacity: 0         }}
                  transition={{ duration: 0.18, delay: 0.06 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {msData.options.map((opt, idx) => {
                    const isSelected = selectedMS.includes(opt.key)
                    const selColor   = '#818CF8'
                    return (
                      <motion.button
                        key={opt.key}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1,  x: 0  }}
                        transition={{ delay: idx * 0.04, duration: 0.18 }}
                        onClick={() => handleMSToggle(opt)}
                        disabled={isEvaluating}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 18px', borderRadius: 14, width: '100%',
                          background: isSelected ? `rgba(129,140,248,0.14)` : cardBg,
                          border: `1.5px solid ${isSelected ? `${selColor}80` : borderCol}`,
                          cursor: isEvaluating ? 'default' : 'pointer',
                          textAlign: 'left', fontFamily: 'inherit',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? `0 0 0 1px ${selColor}40` : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!isEvaluating) {
                            e.currentTarget.style.borderColor = `${selColor}60`
                            e.currentTarget.style.background  = `rgba(129,140,248,0.07)`
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = borderCol
                            e.currentTarget.style.background  = cardBg
                          }
                        }}
                      >
                        {/* Checkbox badge */}
                        <div style={{
                          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                          background: isSelected ? selColor : 'rgba(129,140,248,0.12)',
                          border: `1px solid ${isSelected ? selColor : 'rgba(129,140,248,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800,
                          color: isSelected ? '#fff' : 'rgba(129,140,248,0.6)',
                          transition: 'all 0.15s',
                        }}>
                          {isSelected ? '✓' : opt.key.toUpperCase()}
                        </div>
                        {/* Label */}
                        <span style={{
                          fontSize: 14, lineHeight: 1.5,
                          color: textCol,
                          fontWeight: isSelected ? 600 : 440,
                          transition: 'color 0.15s',
                        }}>
                          {opt.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>

              {/* Submit row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={onSkip}
                  disabled={isEvaluating}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: isEvaluating ? 'default' : 'pointer',
                    fontSize: 12, color: mutedCol, fontWeight: 600,
                    opacity: isEvaluating ? 0.3 : 1,
                  }}
                >
                  {t.skip}
                </button>
                <button
                  onClick={handleMSSubmit}
                  disabled={selectedMS.length < msData.selectCount || isEvaluating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: selectedMS.length >= msData.selectCount && !isEvaluating
                      ? '#818CF8'
                      : isLight ? 'rgba(129,140,248,0.14)' : 'rgba(129,140,248,0.16)',
                    border: 'none', borderRadius: 12, padding: '12px 24px',
                    fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
                    color: selectedMS.length >= msData.selectCount && !isEvaluating
                      ? '#fff' : 'rgba(129,140,248,0.4)',
                    cursor: selectedMS.length >= msData.selectCount && !isEvaluating
                      ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {isEvaluating
                    ? <motion.span animate={{ opacity: [0.5,1,0.5] }} transition={{ duration: 1.1, repeat: Infinity }}>{t.checking}</motion.span>
                    : <>{t.submit} <ChevronRight size={14} /></>
                  }
                </button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10.5, color: mutedCol, marginTop: -4 }}>
                Press A / B / C / D to toggle — select {msData.selectCount} then submit
              </div>
            </>
          ) : mcData ? (
            /* ── MC option buttons ─────────────────────────────────────────── */
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={question.text + '-opts'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1,  y: 0  }}
                  exit={  { opacity: 0         }}
                  transition={{ duration: 0.18, delay: 0.06 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {mcData.options.map((opt, idx) => {
                    const isSelected = selectedMC === opt.key
                    const isDimmed   = selectedMC && !isSelected
                    const selColor   = '#818CF8'
                    return (
                      <motion.button
                        key={opt.key}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1,  x: 0  }}
                        transition={{ delay: idx * 0.04, duration: 0.18 }}
                        onClick={() => handleMCSelect(opt)}
                        disabled={isEvaluating || !!selectedMC}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 18px', borderRadius: 14, width: '100%',
                          background: isSelected
                            ? `rgba(129,140,248,0.14)`
                            : cardBg,
                          border: `1.5px solid ${
                            isSelected ? `${selColor}80`
                            : isDimmed  ? `${borderCol}`
                            : borderCol
                          }`,
                          cursor: selectedMC || isEvaluating ? 'default' : 'pointer',
                          textAlign: 'left', fontFamily: 'inherit',
                          opacity: isDimmed ? 0.38 : 1,
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? `0 0 0 1px ${selColor}40` : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!selectedMC && !isEvaluating) {
                            e.currentTarget.style.borderColor = `${selColor}60`
                            e.currentTarget.style.background  = `rgba(129,140,248,0.07)`
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = borderCol
                            e.currentTarget.style.background  = cardBg
                          }
                        }}
                      >
                        {/* Key badge */}
                        <div style={{
                          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                          background: isSelected ? selColor : 'rgba(129,140,248,0.12)',
                          border: `1px solid ${isSelected ? selColor : 'rgba(129,140,248,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800,
                          color: isSelected ? '#fff' : 'rgba(129,140,248,0.8)',
                          transition: 'all 0.15s',
                        }}>
                          {opt.key.toUpperCase()}
                        </div>
                        {/* Label */}
                        <span style={{
                          fontSize: 14, lineHeight: 1.5,
                          color: isSelected ? textCol : isDimmed ? mutedCol : textCol,
                          fontWeight: isSelected ? 600 : 440,
                          transition: 'color 0.15s',
                        }}>
                          {opt.label}
                        </span>
                        {/* Checking spinner on selected */}
                        {isSelected && isEvaluating && (
                          <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                            style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: selColor, flexShrink: 0 }}
                          >
                            {t.checking}
                          </motion.span>
                        )}
                      </motion.button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>

              {/* MC skip + keyboard hint */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={onSkip}
                  disabled={isEvaluating || !!selectedMC}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: isEvaluating || selectedMC ? 'default' : 'pointer',
                    fontSize: 12, color: mutedCol, fontWeight: 600,
                    opacity: isEvaluating || selectedMC ? 0.3 : 1,
                  }}
                >
                  {t.skip}
                </button>
                <span style={{ fontSize: 10, color: mutedCol, opacity: 0.7 }}>
                  Press A / B / C / D to select
                </span>
              </div>
            </>
          ) : sqData ? (
            /* ── Sub-question boxes (one per part) ─────────────────────────── */
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sqData.parts.map((part, idx) => (
                  <div key={part.key}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'rgba(129,140,248,0.8)',
                      marginBottom: 6, letterSpacing: '0.03em',
                    }}>
                      ({part.key.toUpperCase()}) {part.label}
                    </div>
                    <textarea
                      autoFocus={idx === 0}
                      value={subInputs[part.key] || ''}
                      onChange={e => setSubInputs(prev => ({ ...prev, [part.key]: e.target.value }))}
                      onKeyDown={e => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSQSubmit()
                      }}
                      placeholder={isEvaluating ? t.placeholderEval : 'Your answer…'}
                      disabled={isEvaluating}
                      rows={2}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: cardBg, border: `1.5px solid ${inputBorder}`,
                        borderRadius: 12, padding: '12px 16px',
                        fontSize: 14, lineHeight: 1.6, color: textCol,
                        resize: 'vertical', outline: 'none', minHeight: 72,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        opacity: isEvaluating ? 0.5 : 1,
                        transition: 'border-color 0.15s, opacity 0.2s',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#818CF8' }}
                      onBlur={e  => { e.target.style.borderColor = inputBorder }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={onSkip}
                  disabled={isEvaluating}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: isEvaluating ? 'default' : 'pointer',
                    fontSize: 12, color: mutedCol, fontWeight: 600,
                    opacity: isEvaluating ? 0.35 : 1,
                  }}
                >
                  {t.skip}
                </button>
                <button
                  onClick={handleSQSubmit}
                  disabled={isEvaluating || !sqData.parts.every(p => (subInputs[p.key] || '').trim())}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: sqData.parts.every(p => (subInputs[p.key] || '').trim()) && !isEvaluating
                      ? '#818CF8' : 'rgba(129,140,248,0.16)',
                    border: 'none', borderRadius: 12, padding: '12px 24px',
                    fontSize: 13.5, fontWeight: 700,
                    color: sqData.parts.every(p => (subInputs[p.key] || '').trim()) && !isEvaluating
                      ? '#fff' : 'rgba(129,140,248,0.4)',
                    cursor: sqData.parts.every(p => (subInputs[p.key] || '').trim()) && !isEvaluating
                      ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.submit} <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 10.5, color: mutedCol, marginTop: -4 }}>
                {t.hint}
              </div>
            </>
          ) : (
            /* ── Open-ended textarea ───────────────────────────────────────── */
            <>
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isEvaluating ? t.placeholderEval : t.placeholder}
                  disabled={isEvaluating}
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: cardBg, border: `1.5px solid ${inputBorder}`,
                    borderRadius: 14, padding: '16px 20px',
                    fontSize: 15, lineHeight: 1.65, color: textCol,
                    resize: 'vertical', outline: 'none', minHeight: 110,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    opacity: isEvaluating ? 0.5 : 1,
                    transition: 'border-color 0.15s, opacity 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#818CF8' }}
                  onBlur={e  => { e.target.style.borderColor = inputBorder }}
                />
                {isEvaluating && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                      style={{ fontSize: 12, fontWeight: 700, color: '#818CF8' }}
                    >
                      {t.checking}
                    </motion.span>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={onSkip}
                  disabled={isEvaluating}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: isEvaluating ? 'default' : 'pointer',
                    fontSize: 12, color: mutedCol, fontWeight: 600,
                    opacity: isEvaluating ? 0.35 : 1,
                  }}
                >
                  {t.skip}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isEvaluating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: input.trim() && !isEvaluating ? '#818CF8' : isLight ? 'rgba(129,140,248,0.14)' : 'rgba(129,140,248,0.16)',
                    border: 'none', borderRadius: 12, padding: '12px 24px',
                    fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
                    color: input.trim() && !isEvaluating ? '#fff' : 'rgba(129,140,248,0.4)',
                    cursor: input.trim() && !isEvaluating ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.submit} <ChevronRight size={14} />
                </button>
              </div>

              {/* Hint */}
              <div style={{ textAlign: 'center', fontSize: 10.5, color: mutedCol, marginTop: -4 }}>
                {t.hint}
              </div>
            </>
          )}
        </div>

        {/* ── Right: live level arc ─────────────────────────────────────────── */}
        <LevelArc liveScore={question?.isFastLane ? null : liveScore} nodeCount={nodeCount} isLight={isLight} />
      </div>
    </motion.div>
  )
}

// ── Resume offer banner (shown when a checkpoint exists) ──────────────────────
export function CalibResumeOffer({ checkpoint, onResume, onDismiss, isLight }) {
  if (!checkpoint) return null
  const subjectLabel = SUBJECT_LABELS[checkpoint.subject] || checkpoint.subject
  const subjectIcon  = SUBJECT_ICONS[checkpoint.subject]  || '📚'
  const qNum         = (checkpoint.questionsAsked || 0) + 1

  // Time since last active
  const minsAgo = checkpoint.lastActiveAt
    ? Math.round((Date.now() - checkpoint.lastActiveAt) / 60000)
    : null
  const timeStr = minsAgo === null ? '' : minsAgo < 2 ? 'just now' : minsAgo < 60 ? `${minsAgo}m ago` : `${Math.round(minsAgo / 60)}h ago`

  const bg     = isLight ? '#ffffff'                    : 'rgba(22,24,38,0.98)'
  const border = isLight ? 'rgba(129,140,248,0.25)'    : 'rgba(129,140,248,0.22)'
  const text   = isLight ? '#0f1117'                   : 'rgba(255,255,255,0.88)'
  const muted  = isLight ? 'rgba(0,0,0,0.4)'          : 'rgba(255,255,255,0.35)'

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      style={{
        position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1800,
        background: bg, border: `1px solid ${border}`, borderRadius: 14,
        padding: '13px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 420, width: 'calc(100vw - 48px)',
      }}
    >
      <span style={{ fontSize: 22 }}>{subjectIcon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: text }}>
          Resume {subjectLabel} diagnostic
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>
          Left at Q{qNum}{timeStr ? ` · ${timeStr}` : ''}
        </div>
      </div>
      <button
        onClick={onResume}
        style={{
          background: '#818CF8', border: 'none', borderRadius: 9, padding: '8px 14px',
          fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Resume →
      </button>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex' }}
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}
