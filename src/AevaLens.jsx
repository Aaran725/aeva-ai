/**
 * Aeva Lens — Vision to Understanding
 * Two modes:
 *   SOLVE — step-by-step worked solution with real arithmetic, final answer hero,
 *            auto-reveal steps, follow-up mini-chat
 *   ANALYSE — deep structural breakdown (subject tags, syntax pattern, variables,
 *              hotspots, expert tip, alternative approach)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crop, Scan, CheckCircle, Plus, ChevronRight, Send, RotateCcw, Zap, BookOpen } from 'lucide-react'
import { useLibraryStore } from './libraryStore'

const GROQ_KEY  = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

/* ─── SOLVE prompt ─────────────────────────────────────────────────────────── */
const SOLVE_PROMPT = `You are Aeva Lens — the best maths and science tutor in the world. Solve this problem completely with full step-by-step working.

STRICT JSON RULES:
- Output ONLY a raw JSON object. No markdown, no fences, no text outside braces.
- NO backslashes anywhere. Write sqrt(x), x^2, a/b — never LaTeX.
- All strings ONE LINE. ASCII only. No newlines inside strings.

Output EXACTLY this structure:
{
  "topic": "2-4 word topic name",
  "subjectArea": "Mathematics | Physics | Chemistry | Biology | Economics | Computer Science | English | History | Other",
  "difficulty": "Primary | GCSE | A-Level | University",
  "method": "name of the technique used (e.g. Quadratic Formula, Newton's Second Law, Integration by Parts)",
  "finalAnswer": "The complete final answer — be specific, include units. Write it out clearly so a student can read it immediately.",
  "confidence": 88,
  "steps": [
    {
      "num": 1,
      "label": "Short step title",
      "calc": "The actual expression or equation at this step — use real numbers from the image",
      "result": "What this step produces",
      "why": "One sentence: the rule or principle applied here"
    }
  ],
  "check": "One sentence: how to verify the answer is correct",
  "commonMistake": "The single most common error students make on this type of problem",
  "alternativeMethod": "Name and describe a different valid approach in one sentence",
  "followUp": ["Practice: specific similar problem", "Challenge: harder variant extending this skill"]
}

Rules:
- steps: 3-6 steps. Use the actual numbers visible in the image — never abstract variables when real values are given.
- finalAnswer: be explicit and complete. Include units. If multi-part, answer all parts.
- If the image is unclear or not solvable, set confidence below 40 and explain in finalAnswer.
- subjectArea: pick the single most accurate one.`

/* ─── ANALYSE prompt ───────────────────────────────────────────────────────── */
const ANALYSE_PROMPT = `You are an expert tutor analysing a student's work image. Be thorough and genuinely helpful across any subject — math, science, economics, history, language, code, diagrams.

Do NOT just solve it — teach the method so the student can reproduce it.

STRICT JSON RULES:
- Output ONLY a raw JSON object. No markdown, no fences, no text outside braces.
- NO backslashes anywhere. Write sqrt(x), x^2, a/b — never LaTeX.
- All strings ONE LINE. ASCII only. No newlines inside strings.

HOTSPOT ANCHORING: x and y are percentage coordinates from the top-left of the image. Pin to actual visible elements.

Output EXACTLY this structure:
{
  "topic": "2-4 word topic name",
  "subjectTags": ["subject area", "subtopic", "technique name"],
  "confidence": 85,
  "coreInsight": "One sentence capturing the key idea — the WHY, not just what to do.",
  "expertTip": "Goal: specific actionable instruction for this exact problem. Name the technique and why it works here.",
  "alternativeApproach": "One sentence describing a completely different valid method. Name the technique.",
  "syntaxCard": {
    "pattern": "the general pattern or rule in plain notation — no backslashes",
    "conditions": ["condition 1", "condition 2"]
  },
  "variables": [
    { "symbol": "a", "value": "7", "meaning": "what this symbol represents in context" }
  ],
  "steps": [
    {
      "verb": "IDENTIFY",
      "title": "Identify the Structure",
      "body": "2-3 sentences. Explain what to recognise and why. Connect to the general pattern.",
      "formula": "key formula or expression for this step, plain notation",
      "worked": "the actual calculation using values from this image",
      "proTip": "The single most common mistake at this step and how to avoid it."
    }
  ],
  "followUp": ["Try: first practice problem closely related to this one", "Challenge: harder variant extending the same skill"],
  "hotspots": [
    { "id": "h1", "x": 55, "y": 35, "label": "Short label", "detail": "2-3 sentences: what this term is, its role, what the student should do with it.", "linkedVar": "a" }
  ]
}`

/* ─── Unicode math prettifier ──────────────────────────────────────────────── */
function mathify(text) {
  if (!text) return text
  let t = text
  t = t.replace(/\$+/g, '')
  let prev
  do { prev = t; t = t.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)') } while (t !== prev)
  t = t
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\cdot|\\times/g, '×')
    .replace(/\\pm/g, '±')
    .replace(/\\left|\\right/g, '')
    .replace(/[\\{}]/g, '')
  t = t.replace(/sqrt\(/g, '√(')
  t = t.replace(/\^10\b/g, '¹⁰')
  t = t.replace(/\^([0-9])/g, (_, n) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[n] ?? `^${n}`)
  t = t.replace(/\*/g, '×')
  t = t.replace(/\bpi\b/gi, 'π').replace(/\btheta\b/gi, 'θ')
  t = t.replace(/\balpha\b/gi, 'α').replace(/\bbeta\b/gi, 'β')
  t = t.replace(/\bdelta\b/gi, 'Δ').replace(/\binfinity\b/gi, '∞')
  t = t.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠')
  t = t.replace(/ - /g, ' − ')
  return t
}

/* ─── MathText — renders √(…) with proper vinculum ───────────────────────── */
function splitOnRadicals(text) {
  const parts = []
  let i = 0, start = 0
  while (i < text.length) {
    if (text[i] === '√' && text[i + 1] === '(') {
      if (i > start) parts.push({ type: 'text', content: text.slice(start, i) })
      let depth = 0, j = i + 1
      while (j < text.length) {
        if (text[j] === '(') depth++
        else if (text[j] === ')') { depth--; if (depth === 0) break }
        j++
      }
      parts.push({ type: 'radical', content: text.slice(i + 2, j) })
      start = j + 1; i = j + 1
    } else { i++ }
  }
  if (start < text.length) parts.push({ type: 'text', content: text.slice(start) })
  return parts
}
function MathText({ children, style = {} }) {
  if (!children) return null
  const parts = splitOnRadicals(String(children))
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.type === 'text'
          ? <span key={i}>{p.content}</span>
          : (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1.05em', lineHeight: 1, marginRight: 1 }}>√</span>
              <span style={{ borderTop: '1.5px solid currentColor', paddingTop: 1, paddingLeft: 2, paddingRight: 3, lineHeight: 1.25 }}>
                <MathText>{p.content}</MathText>
              </span>
            </span>
          )
      )}
    </span>
  )
}

/* ─── Difficulty colour ────────────────────────────────────────────────────── */
const DIFF_STYLE = {
  Primary:    { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.30)',  color: '#86EFAC' },
  GCSE:       { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)',  color: '#93C5FD' },
  'A-Level':  { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.30)',  color: '#FCD34D' },
  University: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.28)',   color: '#FCA5A5' },
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */
function InfoCard({ color, border, label, labelColor, children }) {
  return (
    <div style={{ padding: '11px 13px', borderRadius: 12, background: color, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: labelColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
function SectionLabel({ children }) {
  return <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>
}
function ScanBeam() {
  return (
    <motion.div
      style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #00C8FF 40%, #0080FF 60%, transparent 100%)', boxShadow: '0 0 16px 4px rgba(0,180,255,0.45)', pointerEvents: 'none', zIndex: 10 }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
function HotspotDot({ hotspot, active, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.90 }}
      style={{
        position: 'absolute', left: `${hotspot.x}%`, top: `${hotspot.y}%`, transform: 'translate(-50%,-50%)',
        width: 22, height: 22, borderRadius: '50%',
        background: active ? 'rgba(99,102,241,0.30)' : 'rgba(0,200,255,0.15)',
        border: `2px solid ${active ? '#818CF8' : 'rgba(0,200,255,0.60)'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, backdropFilter: 'blur(4px)',
      }}
      animate={!active
        ? { boxShadow: ['0 0 0 0 rgba(0,200,255,0.5)', '0 0 0 8px rgba(0,200,255,0)', '0 0 0 0 rgba(0,200,255,0)'] }
        : { boxShadow: ['0 0 0 0 rgba(99,102,241,0.6)', '0 0 0 10px rgba(99,102,241,0)', '0 0 0 0 rgba(99,102,241,0)'] }}
      transition={{ duration: 1.8, repeat: Infinity }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#818CF8' : 'rgba(0,200,255,0.80)' }} />
    </motion.button>
  )
}

/* ─── SOLVE MODE: Final answer hero ───────────────────────────────────────── */
function FinalAnswerCard({ answer, topic }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 0.05 }}
      style={{
        padding: '16px 18px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(34,197,94,0.08) 100%)',
        border: '1px solid rgba(74,222,128,0.32)',
        boxShadow: '0 0 24px rgba(74,222,128,0.08)',
      }}
    >
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(134,239,172,0.65)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
        ✓ Answer
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#86EFAC', lineHeight: 1.45, letterSpacing: '-0.01em' }}>
        <MathText>{mathify(answer)}</MathText>
      </div>
    </motion.div>
  )
}

/* ─── SOLVE MODE: Step card with auto-reveal ──────────────────────────────── */
const STEP_COLORS = [
  { bg: 'rgba(99,102,241,0.16)',  border: 'rgba(99,102,241,0.38)',  text: '#A5B4FC', num: '#818CF8' },
  { bg: 'rgba(0,200,255,0.10)',   border: 'rgba(0,200,255,0.30)',   text: '#67E8F9', num: '#22D3EE' },
  { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)',  text: '#FCD34D', num: '#FBBF24' },
  { bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.26)',  text: '#86EFAC', num: '#4ADE80' },
  { bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.26)',   text: '#FCA5A5', num: '#F87171' },
  { bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.26)', text: '#C4B5FD', num: '#A78BFA' },
]

function SolveStepCard({ step, index, revealed }) {
  const c = STEP_COLORS[index % STEP_COLORS.length]
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={revealed ? { opacity: 1, x: 0 } : { opacity: 0.15, x: -4 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex', gap: 12, padding: '13px 14px', borderRadius: 14,
        background: revealed ? c.bg : 'rgba(255,255,255,0.02)',
        border: `1px solid ${revealed ? c.border : 'rgba(255,255,255,0.06)'}`,
        transition: 'background 0.3s, border 0.3s',
      }}
    >
      {/* Step number */}
      <div style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: 8,
        background: revealed ? `${c.bg}` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${revealed ? c.border : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 900, color: revealed ? c.num : 'rgba(255,255,255,0.20)',
        fontFamily: 'monospace',
      }}>
        {step.num}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label */}
        <div style={{ fontSize: 12, fontWeight: 700, color: revealed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)', marginBottom: revealed ? 8 : 0, transition: 'color 0.3s' }}>
          {step.label}
        </div>

        {/* Full content — only when revealed */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {/* Calculation */}
              {step.calc && (
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: `${c.text}80`, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Working</div>
                  <div style={{ fontSize: 13.5, fontFamily: 'monospace', color: c.text, letterSpacing: '0.02em' }}>
                    <MathText>{mathify(step.calc)}</MathText>
                  </div>
                </div>
              )}
              {/* Result */}
              {step.result && step.result !== step.calc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>→</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                    <MathText>{mathify(step.result)}</MathText>
                  </div>
                </div>
              )}
              {/* Why */}
              {step.why && (
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  {step.why}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ─── ANALYSE MODE: syntax card ────────────────────────────────────────────── */
function SyntaxCard({ card }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.20)' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(103,232,249,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Pattern</div>
      <div style={{ fontSize: 15, color: '#67E8F9', textAlign: 'center', padding: '6px 0 10px', letterSpacing: '0.02em' }}>
        <MathText style={{ fontFamily: 'monospace' }}>{mathify(card.pattern)}</MathText>
      </div>
      {card.conditions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {card.conditions.map((c, i) => (
            <div key={i} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.22)', fontSize: 11.5, fontFamily: 'monospace', color: 'rgba(103,232,249,0.85)' }}>
              <MathText>{mathify(c)}</MathText>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── ANALYSE MODE: variable row ────────────────────────────────────────────── */
function VariableRow({ v, index, total, highlighted, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      animate={highlighted ? { backgroundColor: 'rgba(99,102,241,0.18)' } : { backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
        borderBottom: index < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        outline: highlighted ? '1px solid rgba(99,102,241,0.40)' : '1px solid transparent',
        borderRadius: index === 0 ? '10px 10px 0 0' : index === total - 1 ? '0 0 10px 10px' : 0,
        transition: 'outline 0.2s',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 60 }}>
        <code style={{ fontSize: 13, fontFamily: 'monospace', color: '#FBBF24', fontWeight: 800 }}>{v.symbol}</code>
        {v.value && v.value !== '?' && <>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>=</span>
          <code style={{ fontSize: 13, fontFamily: 'monospace', color: highlighted ? '#A5B4FC' : '#93C5FD', fontWeight: 700 }}>{v.value}</code>
        </>}
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, flex: 1 }}>{v.meaning}</span>
    </motion.div>
  )
}

/* ─── ANALYSE MODE: step card ────────────────────────────────────────────── */
const VERB_COLORS = [
  { bg: 'rgba(99,102,241,0.18)',  border: 'rgba(99,102,241,0.40)', text: '#A5B4FC' },
  { bg: 'rgba(0,200,255,0.12)',   border: 'rgba(0,200,255,0.32)',  text: '#67E8F9' },
  { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.32)', text: '#FCD34D' },
  { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.28)', text: '#86EFAC' },
  { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.28)',  text: '#FCA5A5' },
]
function AnalyseStepCard({ step, index, revealed, onReveal }) {
  const isStr = typeof step === 'string'
  const verb    = isStr ? `STEP ${index + 1}` : (step.verb?.toUpperCase() || `STEP ${index + 1}`)
  const title   = isStr ? step : step.title
  const body    = isStr ? '' : step.body
  const formula = isStr ? '' : step.formula
  const worked  = isStr ? '' : step.worked
  const proTip  = isStr ? '' : step.proTip
  const vc = VERB_COLORS[index % VERB_COLORS.length]
  return (
    <motion.div layout
      animate={{ background: revealed ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', borderColor: revealed ? 'rgba(99,102,241,0.30)' : 'rgba(255,255,255,0.08)' }}
      transition={{ layout: { type: 'spring', stiffness: 400, damping: 32 }, duration: 0.25 }}
      style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
    >
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 99, background: vc.bg, border: `1px solid ${vc.border}`, fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: vc.text, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {verb}
        </div>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35 }}>
          {mathify(title)}
        </div>
        {!revealed && (
          <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={onReveal}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 99, background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", whiteSpace: 'nowrap' }}>
            Show Me <ChevronRight size={10} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div key="exp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {body && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>{mathify(body)}</div>}
              {formula && (
                <div style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)', textAlign: 'center', fontSize: 15, color: '#C4B5FD', letterSpacing: '0.03em' }}>
                  <MathText style={{ fontFamily: 'monospace' }}>{mathify(formula)}</MathText>
                </div>
              )}
              {worked && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  style={{ padding: '8px 12px', borderRadius: 10, background: vc.bg, border: `1px solid ${vc.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: vc.text, opacity: 0.7, marginBottom: 4 }}>Worked</div>
                  <div style={{ fontSize: 13, color: vc.text, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    <MathText>{mathify(worked)}</MathText>
                  </div>
                </motion.div>
              )}
              {proTip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                  style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, display: 'flex', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span><span>{proTip}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Follow-up mini-chat ───────────────────────────────────────────────────── */
const FOLLOW_UP_SUGGESTIONS = [
  'Explain step 1 differently',
  'Why does this method work?',
  'Give me a similar problem',
]

function FollowUpChat({ context, topic }) {
  const [chatMessages, setChatMessages] = useState([])  // [{role:'user'|'aeva', text}]
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  async function ask(question) {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: `You are Aeva, a concise expert tutor. The student just solved or analysed a problem on: "${topic}". Context: ${context}. Answer their follow-up question in 2-4 sentences maximum. Use plain text, no markdown. Be direct and specific.`,
            },
            ...chatMessages.map(m => ({ role: m.role === 'aeva' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: q },
          ],
          temperature: 0.4,
          max_tokens: 180,
        }),
      })
      const json = await res.json()
      const answer = json.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't answer that."
      setChatMessages(prev => [...prev, { role: 'aeva', text: answer }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'aeva', text: 'Something went wrong. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ask Aeva</div>

      {/* Previous follow-ups */}
      {chatMessages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {chatMessages.map((m, i) => (
            <div key={i} style={{
              padding: '9px 12px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.55,
              background: m.role === 'user' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${m.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)'}`,
              color: m.role === 'user' ? 'rgba(196,181,253,0.90)' : 'rgba(255,255,255,0.72)',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
            }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', paddingLeft: 4 }}>
              Aeva is thinking…
            </motion.div>
          )}
        </div>
      )}

      {/* Suggestion chips — only before first message */}
      {chatMessages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FOLLOW_UP_SUGGESTIONS.map((s, i) => (
            <motion.button key={i} whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => ask(s)}
              style={{ padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && ask(input)}
          placeholder="Ask a specific question…"
          style={{
            flex: 1, padding: '9px 13px', borderRadius: 10, fontSize: 12.5,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none',
          }}
        />
        <motion.button
          whileHover={input.trim() ? { scale: 1.06 } : {}}
          whileTap={input.trim() ? { scale: 0.94 } : {}}
          onClick={() => ask(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: input.trim() ? 'rgba(99,102,241,0.30)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${input.trim() ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.10)'}`,
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s, border 0.2s',
          }}
        >
          <Send size={13} color={input.trim() ? '#A5B4FC' : 'rgba(255,255,255,0.28)'} />
        </motion.button>
      </div>
    </div>
  )
}

/* ═══ MAIN COMPONENT ════════════════════════════════════════════════════════ */
export default function AevaLens({ file, onClose, onInsightReady, preloadedSession = null }) {
  const { saveSession } = useLibraryStore()

  const [mode, setMode] = useState('solve')          // 'solve' | 'analyse'
  const [phase, setPhase] = useState(preloadedSession ? 'result' : 'select')
  const [analysis, setAnalysis] = useState(preloadedSession?.analysis || null)
  const [errorMsg, setErrorMsg] = useState('')

  // Hotspot & variable state (analyse mode)
  const [activeHotspot, setActiveHotspot] = useState(null)
  const [highlightedVar, setHighlightedVar] = useState(null)

  // Revealed steps
  const [revealedSteps, setRevealedSteps] = useState(new Set())

  // Add-to-guide
  const [addState, setAddState] = useState('idle')   // idle | adding | done

  // Image & selection
  const [imgSrc, setImgSrc] = useState(null)
  const [croppedSrc, setCroppedSrc] = useState(null)
  const [selection, setSelection] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const imgContainerRef = useRef(null)
  const imgRef = useRef(null)
  const croppedUrlRef = useRef(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => {
      URL.revokeObjectURL(url)
      if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current)
    }
  }, [file])

  // Auto-reveal steps one by one when solve result arrives
  useEffect(() => {
    if (phase !== 'result' || mode !== 'solve' || !analysis?.steps?.length) return
    let cancelled = false
    const timers = analysis.steps.map((_, i) =>
      setTimeout(() => { if (!cancelled) setRevealedSteps(prev => new Set([...prev, i])) }, i * 700 + 300)
    )
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [phase, mode, analysis])

  /* ── Drag selection ── */
  const getRelPos = e => {
    const rect = imgContainerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(100, ((cx - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((cy - rect.top) / rect.height) * 100)),
    }
  }
  const onDragStart = e => { e.preventDefault(); const p = getRelPos(e); setDragStart(p); setSelection({ x1: p.x, y1: p.y, x2: p.x, y2: p.y }) }
  const onDragMove  = e => { if (!dragStart) return; e.preventDefault(); const p = getRelPos(e); setSelection(s => ({ ...s, x2: p.x, y2: p.y })) }
  const onDragEnd   = () => setDragStart(null)

  const selRect = selection ? {
    left: `${Math.min(selection.x1, selection.x2)}%`,
    top: `${Math.min(selection.y1, selection.y2)}%`,
    width: `${Math.abs(selection.x2 - selection.x1)}%`,
    height: `${Math.abs(selection.y2 - selection.y1)}%`,
  } : null
  const hasSelection = selection && Math.abs(selection.x2 - selection.x1) > 3 && Math.abs(selection.y2 - selection.y1) > 3

  /* ── Analyse / Solve ── */
  const handleAnalyse = useCallback(async (overrideMode) => {
    const currentMode = overrideMode || mode
    setPhase('scanning')
    setRevealedSteps(new Set())
    setAnalysis(null)
    try {
      if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY is not set')
      let blob = file
      if (hasSelection && imgRef.current) {
        const cropped = await cropImageBlob(file, selection, imgRef.current)
        if (cropped) {
          blob = cropped
          if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current)
          const url = URL.createObjectURL(cropped)
          croppedUrlRef.current = url
          setCroppedSrc(url)
        }
      }
      const base64 = await fileToBase64(blob)
      const mimeType = blob.type || 'image/jpeg'
      const prompt = currentMode === 'solve' ? SOLVE_PROMPT : ANALYSE_PROMPT

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ]}],
          temperature: 0.2, max_tokens: 2400,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)
      const raw = json.choices?.[0]?.message?.content || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = safeParseJSON(jsonMatch[0])
      setAnalysis(parsed)
      setPhase('result')
      if (parsed) {
        saveSession({
          type: 'lens', topic: parsed.topic || 'Aeva Lens',
          coreInsight: parsed.coreInsight || parsed.finalAnswer || '',
          pattern: parsed.syntaxCard?.pattern || parsed.method || null,
          variables: parsed.variables || [],
          steps: parsed.steps || [],
          imageData: croppedSrc || null, rawText: null, analysis: parsed,
        })
      }
    } catch (err) {
      console.error('Aeva Lens error:', err)
      setErrorMsg(err.message || 'Unknown error')
      setPhase('error')
    }
  }, [file, hasSelection, selection, mode])

  /* ── Switch mode and re-analyse ── */
  const switchMode = (newMode) => {
    if (newMode === mode) return
    setMode(newMode)
    if (phase === 'result' && analysis) {
      handleAnalyse(newMode)
    }
  }

  /* ── Hotspot click ── */
  const handleHotspotClick = hs => {
    const isActive = activeHotspot?.id === hs.id
    setActiveHotspot(isActive ? null : hs)
    setHighlightedVar(isActive ? null : (hs.linkedVar || null))
  }

  /* ── Add to Study Guide ── */
  const handleAdd = () => {
    if (addState !== 'idle') return
    setAddState('adding')
    setTimeout(() => {
      onInsightReady?.({
        topic: analysis.topic,
        coreInsight: analysis.coreInsight || analysis.finalAnswer || '',
        explanation: analysis.syntaxCard
          ? `Pattern: ${analysis.syntaxCard.pattern}. Conditions: ${analysis.syntaxCard.conditions?.join(', ')}`
          : analysis.method || '',
        steps: (analysis.steps || []).map(s =>
          typeof s === 'string' ? s :
          mode === 'solve' ? `Step ${s.num}: ${s.label} — ${s.calc}` : `${s.verb}: ${s.title} — ${s.body}`
        ),
        variables: analysis.variables || [],
        timestamp: Date.now(),
      })
      setAddState('done')
      setTimeout(onClose, 900)
    }, 600)
  }

  /* ── Reset ── */
  const resetToSelect = () => {
    setPhase('select'); setSelection(null); setCroppedSrc(null)
    setAnalysis(null); setActiveHotspot(null); setHighlightedVar(null)
    setRevealedSteps(new Set()); setAddState('idle'); setErrorMsg('')
  }

  /* ── Follow-up context string ── */
  const followUpContext = analysis
    ? mode === 'solve'
      ? `The answer is: ${analysis.finalAnswer}. Method used: ${analysis.method}.`
      : `Core insight: ${analysis.coreInsight}. Pattern: ${analysis.syntaxCard?.pattern || 'N/A'}.`
    : ''

  /* ── Confidence colour ── */
  const confColor = (c) => c >= 80 ? '#4ADE80' : c >= 60 ? '#FBBF24' : '#F87171'

  /* ── Difficulty badge ── */
  const diffStyle = analysis ? (DIFF_STYLE[analysis.difficulty] || DIFF_STYLE['GCSE']) : DIFF_STYLE['GCSE']

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(2,4,18,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.90, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.90, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{
          width: '100%', maxWidth: phase === 'result' ? 980 : 600, maxHeight: '94vh',
          borderRadius: 26, overflow: 'hidden',
          background: 'linear-gradient(160deg, #07091e 0%, #0c0f28 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.70), 0 0 0 1px rgba(99,102,241,0.08)',
          display: 'flex', flexDirection: phase === 'result' ? 'row' : 'column',
          transition: 'max-width 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* ══ LEFT: Image panel ══════════════════════════════════════════════ */}
        <div
          ref={imgContainerRef}
          onMouseDown={phase === 'select' ? onDragStart : undefined}
          onMouseMove={phase === 'select' ? onDragMove : undefined}
          onMouseUp={phase === 'select' ? onDragEnd : undefined}
          onTouchStart={phase === 'select' ? onDragStart : undefined}
          onTouchMove={phase === 'select' ? onDragMove : undefined}
          onTouchEnd={phase === 'select' ? onDragEnd : undefined}
          style={{
            position: 'relative', flex: phase === 'result' ? '0 0 40%' : '1',
            minHeight: 300, overflow: 'hidden', background: '#000',
            cursor: phase === 'select' ? 'crosshair' : 'default',
            userSelect: 'none', flexShrink: 0,
          }}
        >
          {/* Image */}
          {(phase === 'result' && croppedSrc)
            ? <img src={croppedSrc} alt="Selected region" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '94vh', pointerEvents: 'none' }} />
            : imgSrc && <img ref={imgRef} src={imgSrc} alt="Uploaded" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '94vh', pointerEvents: 'none' }} />
          }

          {/* SELECT UI */}
          {phase === 'select' && (<>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(180deg, rgba(7,9,28,0.90) 0%, transparent 100%)', display: 'flex', alignItems: 'center', gap: 7, pointerEvents: 'none' }}>
              <Crop size={12} color="rgba(0,200,255,0.80)" strokeWidth={2.5} />
              <span style={{ fontSize: 11.5, color: 'rgba(0,200,255,0.80)', fontWeight: 600, letterSpacing: '0.04em' }}>Drag to select — or analyse whole image</span>
            </div>
            {selRect && (
              <div style={{ position: 'absolute', ...selRect, border: '2px solid #00C8FF', background: 'rgba(0,200,255,0.10)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
            )}
            <AnimatePresence>
              {hasSelection && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  onClick={e => { e.stopPropagation(); handleAnalyse() }}
                  style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 99, background: '#00C8FF', border: 'none', color: '#07091c', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", boxShadow: '0 4px 20px rgba(0,200,255,0.50)', whiteSpace: 'nowrap' }}
                >
                  <Scan size={13} strokeWidth={2.5} />Analyse selection
                </motion.button>
              )}
            </AnimatePresence>
            {!hasSelection && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                onClick={e => { e.stopPropagation(); handleAnalyse() }}
                style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '8px 18px', borderRadius: 99, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.50)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", whiteSpace: 'nowrap' }}>
                Analyse whole image
              </motion.button>
            )}
          </>)}

          {/* SCANNING beam */}
          {phase === 'scanning' && (<>
            <ScanBeam />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,100,255,0.03)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 16px', background: 'linear-gradient(0deg, rgba(7,9,28,0.95) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.0, repeat: Infinity, ease: 'linear' }}
                style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(0,200,255,0.20)', borderTopColor: '#00C8FF' }} />
              <span style={{ fontSize: 12, color: 'rgba(0,200,255,0.75)', fontWeight: 700, letterSpacing: '0.08em' }}>
                {mode === 'solve' ? 'SOLVING…' : 'ANALYSING…'}
              </span>
            </div>
          </>)}

          {/* RESULT: hotspot dots (analyse mode) */}
          {phase === 'result' && mode === 'analyse' && analysis?.hotspots?.map(hs => (
            <HotspotDot key={hs.id} hotspot={hs} active={activeHotspot?.id === hs.id} onClick={() => handleHotspotClick(hs)} />
          ))}

          {/* RESULT: re-select button */}
          {phase === 'result' && (
            <button onClick={resetToSelect} style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
              <Crop size={11} strokeWidth={2.5} />New selection
            </button>
          )}

          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} />
          </button>
        </div>

        {/* ══ RIGHT: Result panel ════════════════════════════════════════════ */}
        <AnimatePresence>
          {phase === 'result' && analysis && (
            <motion.div
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08, duration: 0.32 }}
              style={{
                flex: 1, overflowY: 'auto', padding: '18px 18px 24px',
                display: 'flex', flexDirection: 'column', gap: 12,
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(7,9,28,0.55)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              {/* ── Mode toggle ── */}
              <div style={{ display: 'flex', gap: 6, padding: '3px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', width: 'fit-content' }}>
                {[{ id: 'solve', icon: <Zap size={11} />, label: 'Solve' }, { id: 'analyse', icon: <BookOpen size={11} />, label: 'Analyse' }].map(m => (
                  <motion.button key={m.id}
                    whileHover={mode !== m.id ? { scale: 1.03 } : {}}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => switchMode(m.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 9,
                      background: mode === m.id ? 'rgba(99,102,241,0.22)' : 'transparent',
                      border: `1px solid ${mode === m.id ? 'rgba(99,102,241,0.45)' : 'transparent'}`,
                      color: mode === m.id ? '#A5B4FC' : 'rgba(255,255,255,0.38)',
                      fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      transition: 'all 0.18s',
                    }}
                  >
                    {m.icon} {m.label}
                  </motion.button>
                ))}
              </div>

              {/* ── Subject / difficulty / confidence badges ── */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {/* Topic */}
                <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', fontSize: 11, fontWeight: 700, color: '#67E8F9', letterSpacing: '0.04em' }}>
                  {analysis.topic}
                </div>
                {/* Subject area */}
                {analysis.subjectArea && (
                  <div style={{ padding: '2px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)' }}>
                    {analysis.subjectArea}
                  </div>
                )}
                {/* Difficulty */}
                {analysis.difficulty && (
                  <div style={{ padding: '2px 9px', borderRadius: 99, background: diffStyle.bg, border: `1px solid ${diffStyle.border}`, fontSize: 10, fontWeight: 700, color: diffStyle.color }}>
                    {analysis.difficulty}
                  </div>
                )}
                {/* Method (solve mode) */}
                {mode === 'solve' && analysis.method && (
                  <div style={{ padding: '2px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', fontSize: 10, fontWeight: 600, color: 'rgba(165,180,252,0.70)', fontStyle: 'italic' }}>
                    {analysis.method}
                  </div>
                )}
                {/* Confidence */}
                {analysis.confidence != null && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 48, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${analysis.confidence}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ height: '100%', background: confColor(analysis.confidence), borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: confColor(analysis.confidence) }}>{analysis.confidence}%</span>
                  </div>
                )}
              </div>

              {/* ── SOLVE MODE CONTENT ── */}
              {mode === 'solve' && (<>

                {/* Final answer hero */}
                {analysis.finalAnswer && <FinalAnswerCard answer={analysis.finalAnswer} topic={analysis.topic} />}

                {/* Steps */}
                {analysis.steps?.length > 0 && (
                  <div>
                    <SectionLabel>Step-by-Step</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {analysis.steps.map((step, i) => (
                        <SolveStepCard key={i} step={step} index={i} revealed={revealedSteps.has(i)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Check / common mistake */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analysis.check && (
                    <InfoCard color="rgba(74,222,128,0.07)" border="rgba(74,222,128,0.20)" label="How to check" labelColor="rgba(134,239,172,0.55)">
                      <span style={{ fontSize: 12.5, color: 'rgba(187,247,208,0.80)', lineHeight: 1.55 }}>{analysis.check}</span>
                    </InfoCard>
                  )}
                  {analysis.commonMistake && (
                    <InfoCard color="rgba(239,68,68,0.07)" border="rgba(239,68,68,0.20)" label="Common mistake" labelColor="rgba(252,165,165,0.55)">
                      <span style={{ fontSize: 12.5, color: 'rgba(254,202,202,0.80)', lineHeight: 1.55 }}>{analysis.commonMistake}</span>
                    </InfoCard>
                  )}
                  {analysis.alternativeMethod && (
                    <InfoCard color="rgba(245,158,11,0.07)" border="rgba(245,158,11,0.20)" label="Alternative method" labelColor="rgba(253,230,138,0.55)">
                      <span style={{ fontSize: 12.5, color: 'rgba(254,243,199,0.80)', lineHeight: 1.55 }}>{analysis.alternativeMethod}</span>
                    </InfoCard>
                  )}
                </div>

                {/* Practice problems */}
                {analysis.followUp?.length > 0 && (
                  <div>
                    <SectionLabel>Practice Next</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {analysis.followUp.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 12px', borderRadius: 10, background: i === 0 ? 'rgba(74,222,128,0.06)' : 'rgba(99,102,241,0.08)', border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.18)' : 'rgba(99,102,241,0.20)'}` }}>
                          <span style={{ fontSize: 13, flexShrink: 0 }}>{i === 0 ? '📝' : '🔥'}</span>
                          <span style={{ fontSize: 12.5, color: i === 0 ? 'rgba(187,247,208,0.85)' : 'rgba(196,181,253,0.85)', lineHeight: 1.55, fontFamily: 'monospace' }}>
                            {mathify(item)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up mini-chat */}
                <FollowUpChat context={followUpContext} topic={analysis.topic} />

              </>)}

              {/* ── ANALYSE MODE CONTENT ── */}
              {mode === 'analyse' && (<>

                {/* Core insight */}
                <InfoCard color="rgba(99,102,241,0.22)" border="rgba(99,102,241,0.28)" label="Core Insight" labelColor="rgba(165,180,252,0.65)">
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{mathify(analysis.coreInsight)}</span>
                </InfoCard>

                {/* Expert tip */}
                {(analysis.expertTip || analysis.strugglePoint) && (
                  <InfoCard color="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.22)" label="Expert Tip" labelColor="rgba(252,165,165,0.65)">
                    <span style={{ fontSize: 13, color: 'rgba(255,200,200,0.90)', lineHeight: 1.55 }}>{mathify(analysis.expertTip || analysis.strugglePoint)}</span>
                  </InfoCard>
                )}

                {/* Alternative approach */}
                {analysis.alternativeApproach && (
                  <InfoCard color="rgba(245,158,11,0.07)" border="rgba(245,158,11,0.20)" label="Alternative Approach" labelColor="rgba(253,230,138,0.60)">
                    <span style={{ fontSize: 12.5, color: 'rgba(254,243,199,0.82)', lineHeight: 1.60 }}>{mathify(analysis.alternativeApproach)}</span>
                  </InfoCard>
                )}

                {/* Syntax pattern */}
                {analysis.syntaxCard && <SyntaxCard card={analysis.syntaxCard} />}

                {/* Variables */}
                {analysis.variables?.length > 0 && (
                  <div>
                    <SectionLabel>Variables</SectionLabel>
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {analysis.variables.map((v, i) => (
                        <VariableRow key={v.symbol} v={v} index={i} total={analysis.variables.length}
                          highlighted={highlightedVar === v.symbol}
                          onClick={() => {
                            const next = highlightedVar === v.symbol ? null : v.symbol
                            setHighlightedVar(next)
                            const hs = analysis.hotspots?.find(h => h.linkedVar === v.symbol)
                            setActiveHotspot(hs && next ? hs : null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active hotspot detail */}
                <AnimatePresence>
                  {activeHotspot && (
                    <motion.div key={activeHotspot.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 2 }}
                      style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.22)' }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(103,232,249,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>📍 {activeHotspot.label}</div>
                      <div style={{ fontSize: 12.5, color: 'rgba(207,250,254,0.80)', lineHeight: 1.55 }}>{mathify(activeHotspot.detail)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Steps */}
                {analysis.steps?.length > 0 && (
                  <div>
                    <SectionLabel>How to Approach It</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {analysis.steps.map((step, i) => (
                        <AnalyseStepCard key={i} step={step} index={i}
                          revealed={revealedSteps.has(i)}
                          onReveal={() => setRevealedSteps(prev => new Set([...prev, i]))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up practice */}
                {analysis.followUp?.length > 0 && (
                  <div>
                    <SectionLabel>Practice Next</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {analysis.followUp.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 12px', borderRadius: 10, background: i === 0 ? 'rgba(74,222,128,0.06)' : 'rgba(99,102,241,0.08)', border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.18)' : 'rgba(99,102,241,0.20)'}` }}>
                          <span style={{ fontSize: 13, flexShrink: 0 }}>{i === 0 ? '📝' : '🔥'}</span>
                          <span style={{ fontSize: 12.5, color: i === 0 ? 'rgba(187,247,208,0.85)' : 'rgba(196,181,253,0.85)', lineHeight: 1.55, fontFamily: 'monospace' }}>
                            {mathify(item)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up mini-chat */}
                <FollowUpChat context={followUpContext} topic={analysis.topic} />

              </>)}

              {/* ── Add to Study Guide (both modes) ── */}
              {onInsightReady && (
                <motion.button
                  whileHover={addState === 'idle' ? { scale: 1.02, y: -1 } : {}}
                  whileTap={addState === 'idle' ? { scale: 0.97 } : {}}
                  onClick={handleAdd}
                  style={{
                    marginTop: 4, padding: '12px 16px', borderRadius: 14,
                    cursor: addState === 'idle' ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: addState === 'done'
                      ? 'linear-gradient(135deg, rgba(74,222,128,0.22), rgba(34,197,94,0.18))'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))',
                    border: addState === 'done' ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(139,143,255,0.32)',
                    color: addState === 'done' ? '#86EFAC' : '#C4B5FD',
                    fontSize: 13, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'background 0.4s, border 0.4s, color 0.4s',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {addState === 'idle' && (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={13} strokeWidth={2.5} />Add to Study Guide
                      </motion.span>
                    )}
                    {addState === 'adding' && (
                      <motion.span key="adding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(196,181,253,0.20)', borderTopColor: '#C4B5FD' }} />
                        Saving…
                      </motion.span>
                    )}
                    {addState === 'done' && (
                      <motion.span key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={13} strokeWidth={2.5} />Added to Study Guide
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error state ── */}
        {phase === 'error' && (
          <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Couldn't process this image</div>
            {errorMsg && <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.75)', fontFamily: 'monospace', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '6px 12px', maxWidth: 340, wordBreak: 'break-word' }}>{errorMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPhase('select'); setErrorMsg('') }} style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', color: '#67E8F9', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Try again</button>
              <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>Close</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ─── Canvas crop ─────────────────────────────────────────────────────────── */
async function cropImageBlob(file, selection, imgEl) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const natW = imgEl.naturalWidth, natH = imgEl.naturalHeight
    const dispW = imgEl.clientWidth, dispH = imgEl.clientHeight
    const scale = Math.min(dispW / natW, dispH / natH)
    const rendW = natW * scale, rendH = natH * scale
    const offX = (dispW - rendW) / 2, offY = (dispH - rendH) / 2
    const x1p = Math.min(selection.x1, selection.x2) / 100
    const y1p = Math.min(selection.y1, selection.y2) / 100
    const x2p = Math.max(selection.x1, selection.x2) / 100
    const y2p = Math.max(selection.y1, selection.y2) / 100
    const sx = Math.max(0, ((x1p * dispW) - offX) / scale)
    const sy = Math.max(0, ((y1p * dispH) - offY) / scale)
    const sw = Math.min(natW - sx, ((x2p - x1p) * dispW) / scale)
    const sh = Math.min(natH - sy, ((y2p - y1p) * dispH) / scale)
    if (sw <= 0 || sh <= 0) { resolve(null); return }
    canvas.width = sw; canvas.height = sh
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); canvas.toBlob(b => resolve(b), 'image/jpeg', 0.95) }
    img.src = URL.createObjectURL(file)
  })
}
function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
function safeParseJSON(str) {
  try { return JSON.parse(str) } catch {
    const fixed = str.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    try { return JSON.parse(fixed) } catch { throw new Error('Could not parse model response as JSON') }
  }
}
