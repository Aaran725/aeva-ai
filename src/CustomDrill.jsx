import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, CheckCircle, BookOpen, ChevronRight } from 'lucide-react'
import { useLibraryStore } from './libraryStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ── Prompt ──────────────────────────────────────────── */
function buildPrompt(text) {
  return `You are an expert tutor. Analyze this student text and extract structured learning content.

TEXT:
"""
${text.slice(0, 4000)}
"""

STRICT JSON RULES:
- Output ONLY a raw JSON object. No markdown, no fences, no text outside braces.
- NO backslashes anywhere. Write sqrt(x), x^2, a/b — never use backslashes.
- All strings must be ONE LINE. ASCII only.

Output EXACTLY this structure:
{
  "topic": "subject name e.g. Algebra, Physics, Economics, Chemistry",
  "subjectTags": ["broad subject", "specific subtopic"],
  "coreInsight": "the single most important thing to understand — one crisp sentence capturing the WHY",
  "expertTip": "Goal: [direct imperative instruction]. Name the technique and exactly why it applies here.",
  "syntaxCard": {
    "pattern": "key formula or rule in plain notation — no backslashes",
    "conditions": ["condition 1", "condition 2"]
  },
  "variables": [
    { "symbol": "x", "value": "extracted value or null", "meaning": "what this symbol represents in context" }
  ],
  "steps": [
    {
      "verb": "IDENTIFY",
      "title": "step title",
      "body": "2-3 sentences. Explain what to do AND why this step matters. Connect to the core concept.",
      "formula": "formula or rule for this step in plain notation, or empty string",
      "worked": "concrete example using actual values from the text, showing the calculation",
      "proTip": "the single most common mistake at this step and how to avoid it"
    }
  ]
}

steps: 4-5 steps. Each body must be 2-3 sentences — real explanation, not just labels.
worked: use actual numbers or examples from the text — not abstract variables.
variables: extract every symbol/value that appears. syntaxCard.pattern: the master rule.`
}

/* ── Math prettifier (same as AevaLens) ─────────────── */
function mathify(text) {
  if (!text) return text
  let t = text
  t = t.replace(/\$([^$]+)\$/g, (_, m) => m)
  let prev = ''
  while (prev !== t) {
    prev = t
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
  }
  t = t.replace(/sqrt\(/g, '√(')
  t = t.replace(/\^(\d)/g, (_, n) => ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'][+n] ?? `^${n}`)
  t = t.replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\pm/g, '±').replace(/\\neq/g, '≠').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\approx/g, '≈').replace(/\\infty/g, '∞')
  t = t.replace(/\\\w+/g, '')
  return t
}

function splitOnRadicals(text) {
  if (!text) return [{ type: 'text', value: '' }]
  const parts = []
  let i = 0
  while (i < text.length) {
    const start = text.indexOf('√(', i)
    if (start === -1) { parts.push({ type: 'text', value: text.slice(i) }); break }
    if (start > i) parts.push({ type: 'text', value: text.slice(i, start) })
    let depth = 0, j = start + 1
    while (j < text.length) {
      if (text[j] === '(') depth++
      else if (text[j] === ')') { if (--depth === 0) { j++; break } }
      j++
    }
    parts.push({ type: 'radical', value: text.slice(start + 2, j - 1) })
    i = j
  }
  return parts
}

function MathText({ children, style = {} }) {
  if (!children) return null
  const parts = splitOnRadicals(String(children))
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.type === 'text' ? <span key={i}>{p.value}</span> : (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1 }}>
            <span style={{ fontSize: '0.75em', lineHeight: 1.2, userSelect: 'none', color: 'inherit' }}>√</span>
            <span style={{ borderTop: '1.5px solid currentColor', paddingTop: 1, paddingLeft: 1, paddingRight: 1, lineHeight: 1.3 }}>
              <MathText>{p.value}</MathText>
            </span>
          </span>
        )
      )}
    </span>
  )
}

function getFactorPairs(val) {
  const n = parseInt(val, 10)
  if (!Number.isInteger(n) || n < 2 || n > 10000) return []
  const pairs = []
  for (let i = 2; i <= Math.floor(Math.sqrt(n)); i++) {
    if (n % i === 0) pairs.push([i, n / i])
  }
  return pairs
}

function safeParseJSON(str) {
  try { return JSON.parse(str) } catch {
    try { return JSON.parse(str.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')) } catch { return null }
  }
}

/* ── Sub-components ──────────────────────────────────── */
function SyntaxCard({ card }) {
  if (!card) return null
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(139,143,255,0.10)', border: '1px solid rgba(139,143,255,0.20)', marginBottom: 10 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(139,143,255,0.60)', marginBottom: 6 }}>Pattern</div>
      <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'rgba(200,190,255,0.95)', fontWeight: 600, marginBottom: card.conditions?.length ? 8 : 0 }}>
        <MathText style={{ fontFamily: 'monospace' }}>{mathify(card.pattern)}</MathText>
      </div>
      {card.conditions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {card.conditions.map((c, i) => (
            <span key={i} style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.22)', fontSize: 10.5, color: 'rgba(185,180,255,0.75)' }}>
              <MathText>{mathify(c)}</MathText>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function VariableRow({ v, index, total, highlighted, onClick }) {
  const pairs = getFactorPairs(v.value)
  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '7px 0',
        borderBottom: index < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        cursor: 'pointer',
        background: highlighted ? 'rgba(99,102,241,0.08)' : 'transparent',
        borderRadius: 6, paddingLeft: highlighted ? 6 : 0,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 800, color: highlighted ? '#A78BFA' : 'rgba(200,190,255,0.90)' }}>
          <MathText>{mathify(v.symbol)}</MathText>
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>=</span>
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,220,100,0.90)' }}>
          <MathText>{mathify(String(v.value ?? '?'))}</MathText>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {pairs.map(([a, b]) => (
          <span key={`${a}×${b}`} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.22)', color: 'rgba(251,191,36,0.70)', fontFamily: 'monospace' }}>
            {a}×{b}
          </span>
        ))}
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', maxWidth: 120, textAlign: 'right', lineHeight: 1.3 }}>{v.meaning}</span>
      </div>
    </motion.div>
  )
}

function StepCard({ step, index, revealed, onReveal }) {
  const verb    = step.verb?.toUpperCase() || `STEP ${index + 1}`
  const title   = step.title || ''
  const body    = step.body || ''
  const formula = step.formula || ''
  const worked  = step.worked || ''
  const proTip  = step.proTip || ''

  const VERB_COLORS = [
    { bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.40)', text: '#A5B4FC' },
    { bg: 'rgba(0,200,255,0.12)',  border: 'rgba(0,200,255,0.32)',  text: '#67E8F9' },
    { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.32)', text: '#FCD34D' },
    { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.28)', text: '#86EFAC' },
    { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.28)',  text: '#FCA5A5' },
  ]
  const vc = VERB_COLORS[index % VERB_COLORS.length]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      style={{ borderRadius: 14, background: revealed ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${revealed ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.08)'}`, overflow: 'hidden' }}
    >
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 99, background: vc.bg, border: `1px solid ${vc.border}`, fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: vc.text, textTransform: 'uppercase' }}>
          {verb}
        </div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35 }}>
          {mathify(title)}
        </div>
        {!revealed && (
          <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={onReveal}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 99, background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
            Show Me <ChevronRight size={10} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div key="expanded" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {body && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.65 }}>{mathify(body)}</div>}
              {formula && (
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.22)', fontFamily: 'monospace', fontSize: 13.5, color: 'rgba(200,190,255,0.95)', textAlign: 'center' }}>
                  <MathText style={{ fontFamily: 'monospace' }}>{mathify(formula)}</MathText>
                </div>
              )}
              {worked && (
                <div style={{ padding: '7px 11px', borderRadius: 10, background: vc.bg, border: `1px solid ${vc.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: vc.text, opacity: 0.7, marginBottom: 3 }}>Worked</div>
                  <div style={{ fontSize: 13, color: vc.text, fontFamily: 'monospace' }}><MathText>{mathify(worked)}</MathText></div>
                </div>
              )}
              {proTip && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, display: 'flex', gap: 6 }}><span>⚠️</span><span>{mathify(proTip)}</span></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function CustomDrill({ onClose, preloadedSession = null }) {
  const { saveSession } = useLibraryStore()

  // phases: 'paste' | 'analysing' | 'result' | 'error'
  const [phase, setPhase] = useState(preloadedSession ? 'result' : 'paste')
  const [text, setText] = useState(preloadedSession?.rawText || '')
  const [analysis, setAnalysis] = useState(preloadedSession?.analysis || null)
  const [errorMsg, setErrorMsg] = useState('')
  const [revealedSteps, setRevealedSteps] = useState(new Set())
  const [addState, setAddState] = useState('idle') // idle | adding | done
  const abortRef = useRef(null)

  /* ── Run analysis ─────────────────────────────────── */
  const handleAnalyse = async () => {
    if (!text.trim()) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setPhase('analysing')
    setErrorMsg('')

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 900,
          messages: [{ role: 'user', content: buildPrompt(text) }],
        }),
      })
      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = safeParseJSON(jsonMatch[0])
      if (!parsed) throw new Error('Could not parse JSON')
      setAnalysis(parsed)
      setPhase('result')

      // Auto-save to library
      saveSession({
        type: 'drill',
        topic: parsed.topic || 'Custom Drill',
        coreInsight: parsed.coreInsight || '',
        pattern: parsed.syntaxCard?.pattern || null,
        variables: parsed.variables || [],
        steps: parsed.steps || [],
        rawText: text,
        analysis: parsed,
        imageData: null,
      })
    } catch (e) {
      if (e.name !== 'AbortError') {
        setErrorMsg(e.message || 'Analysis failed')
        setPhase('error')
      }
    }
  }

  /* ── Save to study guide ──────────────────────────── */
  const handleAdd = () => {
    if (addState !== 'idle' || !analysis) return
    setAddState('adding')
    setTimeout(() => { setAddState('done') }, 600)
  }

  const revealStep = (i) => setRevealedSteps(prev => new Set([...prev, i]))

  /* ═══════════ PASTE PHASE ══════════════════════════ */
  if (phase === 'paste' || phase === 'error') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(4,6,20,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: 'rgba(12,14,32,0.95)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 32px 80px rgba(0,0,0,0.70)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📝</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em' }}>Custom Drill</span>
            </div>
            <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </motion.button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginBottom: 12, lineHeight: 1.55 }}>
              Paste notes, a textbook excerpt, or a problem. Aeva will build a full interactive HUD from the text — same as Lens but for any subject.
            </div>

            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"e.g.\nThe quadratic formula: x = (-b ± sqrt(b^2 - 4ac)) / 2a\nUsed when ax^2 + bx + c = 0 and factoring isn't obvious.\n\nOr paste an economics paragraph, physics equation, history passage..."}
              rows={9}
              style={{
                width: '100%', resize: 'vertical', background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 14,
                color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif",
                padding: '13px 15px', outline: 'none', lineHeight: 1.6,
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.50)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />

            {phase === 'error' && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', fontSize: 11.5, color: '#FCA5A5' }}>
                {errorMsg} — try again or rephrase your text.
              </div>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleAnalyse}
              disabled={!text.trim()}
              style={{
                marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 20px', borderRadius: 14, cursor: text.trim() ? 'pointer' : 'not-allowed',
                background: text.trim() ? 'linear-gradient(135deg, rgba(167,139,250,0.55), rgba(109,40,217,0.40))' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${text.trim() ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.09)'}`,
                color: text.trim() ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.30)',
                fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
                opacity: text.trim() ? 1 : 0.6,
              }}>
              Analyse & Build HUD <ArrowRight size={15} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  /* ═══════════ ANALYSING PHASE ═══════════════════════ */
  if (phase === 'analysing') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(4,6,20,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }} transition={{ duration: 1.6, repeat: Infinity }}
            style={{ fontSize: 32 }}>📝</motion.div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>Building your HUD…</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0,1,2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA' }} />
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  /* ═══════════ RESULT PHASE ══════════════════════════ */
  if (phase === 'result' && analysis) {
    const vars = analysis.variables || []
    const steps = analysis.steps || []

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(4,6,20,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13 }}>📝</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>{analysis.topic}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setPhase('paste'); setAnalysis(null); setRevealedSteps(new Set()); setAddState('idle') }}
              style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ← New Drill
            </motion.button>
            <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 960, margin: '0 auto' }}>

            {/* LEFT col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Core insight */}
              <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 7 }}>Core Insight</div>
                <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                  <MathText>{mathify(analysis.coreInsight)}</MathText>
                </div>
              </div>

              {/* Expert tip */}
              {analysis.expertTip && (
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.60)', marginBottom: 5 }}>Expert Tip</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,200,200,0.88)', lineHeight: 1.6 }}>
                    <MathText>{mathify(analysis.expertTip)}</MathText>
                  </div>
                </div>
              )}

              {/* Syntax card */}
              <SyntaxCard card={analysis.syntaxCard} />

              {/* Variables */}
              {vars.length > 0 && (
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Variables</div>
                  {vars.map((v, i) => (
                    <VariableRow key={i} v={v} index={i} total={vars.length} highlighted={false} onClick={() => {}} />
                  ))}
                </div>
              )}

              {/* Add to Study Guide */}
              <motion.button
                whileHover={addState === 'idle' ? { scale: 1.02 } : {}}
                whileTap={addState === 'idle' ? { scale: 0.97 } : {}}
                onClick={handleAdd}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '11px 16px', borderRadius: 12,
                  background: addState === 'done' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${addState === 'done' ? 'rgba(74,222,128,0.28)' : 'rgba(255,255,255,0.10)'}`,
                  color: addState === 'done' ? '#4ADE80' : 'rgba(255,255,255,0.55)',
                  fontSize: 12, fontWeight: 600, cursor: addState === 'idle' ? 'pointer' : 'default',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'all 0.25s',
                }}>
                {addState === 'done'
                  ? <><CheckCircle size={13} /> Saved to Library</>
                  : <><BookOpen size={13} /> {addState === 'adding' ? 'Saving…' : 'Add to Study Guide'}</>
                }
              </motion.button>
            </div>

            {/* RIGHT col — Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
                Step-by-Step ({steps.length})
              </div>
              {steps.map((step, i) => (
                <StepCard key={i} step={step} index={i} revealed={revealedSteps.has(i)} onReveal={() => revealStep(i)} />
              ))}
              {steps.length > 0 && revealedSteps.size < steps.length && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setRevealedSteps(new Set(steps.map((_, i) => i)))}
                  style={{ marginTop: 4, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Reveal All Steps
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return null
}
