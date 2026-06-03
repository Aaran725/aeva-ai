import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, TrendingUp, Sigma, GitBranch, Clock3, Table2, HelpCircle,
  Puzzle, Lightbulb, ChevronDown, LayoutGrid, Sparkles, Trophy, Target,
} from 'lucide-react'
import { Mafs, Coordinates, Plot } from 'mafs'
import 'mafs/core.css'
import katex from 'katex'
import { useCanvasStore } from './canvasStore'

/* ── Groq helper (small model, fast) ────────────────────────────────────── */
const _CKEYS = [
  import.meta.env.VITE_GROQ_API_KEY,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
].filter(Boolean)
let _ci = 0
const _ck = () => _CKEYS.length ? _CKEYS[_ci++ % _CKEYS.length] : ''

async function canvasExplain(changes, topic) {
  const key = _ck()
  if (!key) return null
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Topic: "${topic}". Parameter changed: ${changes.join(', ')}. Write exactly ONE sentence under 20 words explaining what this change means visually or mathematically. Be specific with the numbers. No fluff.`,
        }],
        temperature: 0.25,
        max_tokens: 55,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch { return null }
}

/* ── Safe math evaluator ─────────────────────────────────────────────────── */
function makeFn(expr) {
  const safe = String(expr)
    .replace(/\^/g, '**')
    .replace(/\bsin\b/g, 'Math.sin').replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan').replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs').replace(/\blog\b/g, 'Math.log10')
    .replace(/\bln\b/g,  'Math.log').replace(/\bpi\b/g,  'Math.PI')
    .replace(/\be(?!\w)/g, 'Math.E')
  return (x) => {
    try { return Function('x', `'use strict'; return (${safe})`)(x) }
    catch { return NaN }
  }
}

/* ── Block metadata ──────────────────────────────────────────────────────── */
const BLOCK_META = {
  graph:       { Icon: TrendingUp, color: '#818CF8', accent: '#6366F1' },
  formula:     { Icon: Sigma,      color: '#C4B5FD', accent: '#8B5CF6' },
  diagram:     { Icon: GitBranch,  color: '#67E8F9', accent: '#06B6D4' },
  timeline:    { Icon: Clock3,     color: '#FCD34D', accent: '#F59E0B' },
  table:       { Icon: Table2,     color: '#6EE7B7', accent: '#10B981' },
  quiz:        { Icon: HelpCircle, color: '#F9A8D4', accent: '#EC4899' },
  challenge:   { Icon: Puzzle,     color: '#FED7AA', accent: '#F97316' },
  explanation: { Icon: Sparkles,   color: '#A5F3FC', accent: '#0EA5E9' },
  mission:     { Icon: Target,     color: '#FDE68A', accent: '#D97706' },
}

/* ── Card wrapper ────────────────────────────────────────────────────────── */
function Card({ block, children, badge, noPad = false }) {
  const [open, setOpen] = useState(true)
  const { Icon, color, accent } = BLOCK_META[block.type] || BLOCK_META.graph

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        borderRadius: 22,
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        marginBottom: 14,
        boxShadow: '0 2px 24px rgba(0,0,0,0.28)',
      }}
    >
      {/* Colour accent top bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 60%, transparent 100%)` }} />

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: `${accent}15`, border: `1.5px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} color={color} strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.title || block.type}
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: `${color}99`, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
            {block.type}
          </div>
        </div>

        {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}

        <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.18 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={14} color="rgba(255,255,255,0.22)" />
        </motion.div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: noPad ? 0 : '18px 18px 22px',
            }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Aeva Hint Strip ─────────────────────────────────────────────────────── */
const HINT_STYLE = {
  praise: { bg: 'rgba(74,222,128,0.09)',  border: 'rgba(74,222,128,0.28)',  color: '#4ADE80', glow: 'rgba(74,222,128,0.15)' },
  guide:  { bg: 'rgba(129,140,248,0.09)', border: 'rgba(129,140,248,0.28)', color: '#818CF8', glow: 'rgba(129,140,248,0.15)' },
  nudge:  { bg: 'rgba(251,191,36,0.09)',  border: 'rgba(251,191,36,0.28)',  color: '#FBBF24', glow: 'rgba(251,191,36,0.15)' },
}

function AevaHintStrip() {
  const { aevaHint, dismissHint } = useCanvasStore()

  return (
    <AnimatePresence>
      {aevaHint && (
        <motion.div
          key={aevaHint.text}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.22 }}
          style={{ overflow: 'hidden', flexShrink: 0 }}
        >
          {(() => {
            const s = HINT_STYLE[aevaHint.type] || HINT_STYLE.guide
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px',
                background: s.bg,
                borderBottom: `1px solid ${s.border}`,
                boxShadow: `inset 0 -1px 0 ${s.glow}`,
              }}>
                {/* Aeva icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                  background: `${s.color}18`, border: `1px solid ${s.color}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={13} color={s.color} strokeWidth={2} />
                </div>

                {/* Text */}
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 600,
                  color: 'rgba(255,255,255,0.78)', lineHeight: 1.4,
                }}>
                  <span style={{ color: s.color, fontWeight: 800 }}>Aeva · </span>
                  {aevaHint.text}
                </span>

                {/* Dismiss */}
                <button onClick={dismissHint} style={{
                  flexShrink: 0, background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}>
                  <X size={12} />
                </button>
              </div>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Custom slider ───────────────────────────────────────────────────────── */
function ParamSlider({ label, value, accent, onChange }) {
  const min = -10, max = 10
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Label + value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.50)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
          {label}
        </span>
        <span style={{
          fontSize: 14, fontWeight: 900, color: accent,
          background: `${accent}14`, border: `1px solid ${accent}30`,
          padding: '3px 12px', borderRadius: 10, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minWidth: 52, textAlign: 'center',
        }}>
          {Number(value).toFixed(1)}
        </span>
      </div>

      {/* Slider track + input */}
      <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 99,
          background: 'rgba(255,255,255,0.07)',
        }}>
          {/* Filled portion */}
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 99,
            background: `linear-gradient(90deg, ${accent}80, ${accent})`,
            transition: 'width 0.05s linear',
          }} />
        </div>

        {/* Thumb dot */}
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 11px)`,
          width: 22, height: 22, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), ${accent})`,
          border: `2.5px solid #fff`,
          boxShadow: `0 0 12px ${accent}80, 0 2px 6px rgba(0,0,0,0.40)`,
          pointerEvents: 'none',
          top: '50%', transform: 'translateY(-50%)',
          transition: 'left 0.05s linear',
        }} />

        {/* Invisible range input on top */}
        <input
          type="range" min={min} max={max} step={0.1} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0, padding: 0,
          }}
        />
      </div>

      {/* Min/max labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>{min}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>{max}</span>
      </div>
    </div>
  )
}

/* ── GRAPH BLOCK ─────────────────────────────────────────────────────────── */
function GraphBlock({ block, ctx, onUpdate }) {
  const { expr = 'x', xMin = -6, xMax = 6, params = {} } = block
  const { color, accent } = BLOCK_META.graph

  const [paramVals, setParamVals] = useState(() => {
    const init = {}
    Object.entries(params).forEach(([k, v]) => { init[k] = ctx[k] !== undefined ? ctx[k] : v })
    return init
  })

  useEffect(() => {
    setParamVals(prev => {
      const next = { ...prev }
      let changed = false
      Object.keys(params).forEach(k => {
        if (ctx[k] !== undefined && ctx[k] !== prev[k]) { next[k] = ctx[k]; changed = true }
      })
      return changed ? next : prev
    })
  }, [ctx]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedExpr = Object.entries(paramVals).reduce(
    (e, [k, v]) => e.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v)), expr
  )
  const fn = makeFn(resolvedExpr)

  const exprLabel = resolvedExpr
    .replace(/\*\*/g, '^')
    .replace(/\*/g, '·')
    .replace(/Math\.sin/g, 'sin').replace(/Math\.cos/g, 'cos')
    .replace(/Math\.sqrt/g, '√').replace(/Math\.PI/g, 'π')
    .replace(/Math\.\w+/g, s => s.replace('Math.', ''))

  return (
    <Card block={block} noPad>
      {/* Graph */}
      <div style={{ background: '#0a0b14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Mafs viewBox={{ x: [xMin, xMax], y: [-5, 5] }} height={240}>
          <Coordinates.Cartesian
            xAxis={{ lines: 2 }}
            yAxis={{ lines: 2 }}
          />
          <Plot.OfX y={fn} color={color} />
        </Mafs>
      </div>

      {/* Live equation pill */}
      <div style={{
        display: 'flex', justifyContent: 'center', padding: '12px 18px',
        borderBottom: Object.keys(params).length ? '1px solid rgba(255,255,255,0.05)' : 'none',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 99,
          background: `${accent}12`, border: `1px solid ${accent}28`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
            y = {exprLabel}
          </span>
        </div>
      </div>

      {/* Sliders */}
      {Object.keys(params).length > 0 && (
        <div style={{ padding: '18px 20px 22px' }}>
          {Object.entries(params).map(([k, defaultV]) => (
            <ParamSlider
              key={k}
              label={k}
              value={paramVals[k] ?? defaultV}
              accent={accent}
              onChange={v => {
                setParamVals(p => ({ ...p, [k]: v }))
                onUpdate({ [k]: v })
              }}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── FORMULA BLOCK ───────────────────────────────────────────────────────── */
function FormulaBlock({ block, ctx }) {
  const { latex, variables = {}, steps = [] } = block
  const { color, accent } = BLOCK_META.formula
  const [showSteps, setShowSteps] = useState(false)

  const liveVars = useMemo(() => {
    const v = { ...variables }
    Object.keys(variables).forEach(k => { if (ctx[k] !== undefined) v[k] = ctx[k] })
    return v
  }, [variables, ctx])

  const formulaHtml = useMemo(() => {
    try { return katex.renderToString(latex || '', { throwOnError: false, displayMode: true }) }
    catch { return `<span style="font-family:monospace;color:#C4B5FD">${latex}</span>` }
  }, [latex])

  return (
    <Card block={block}>
      {/* Formula display */}
      <div style={{
        padding: '22px 18px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.05) 100%)',
        border: '1px solid rgba(139,92,246,0.18)',
        marginBottom: 14,
        textAlign: 'center',
        overflowX: 'auto',
      }}>
        <div dangerouslySetInnerHTML={{ __html: formulaHtml }}
          style={{ color: '#DDD6FE', fontSize: 18 }} />
      </div>

      {/* Live variable chips */}
      {Object.keys(liveVars).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: steps.length ? 14 : 0 }}>
          {Object.entries(liveVars).map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 99,
              background: `${accent}18`, border: `1px solid ${accent}35`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'monospace' }}>{k}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>=</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                {typeof v === 'number' ? Number(v).toFixed(2) : v}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <>
          <button onClick={() => setShowSteps(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 7, background: 'none',
            border: 'none', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit',
          }}>
            <Lightbulb size={13} color={color} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color }}>
              {showSteps ? 'Hide' : 'Show'} steps
            </span>
          </button>
          <AnimatePresence>
            {showSteps && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 10 }}
              >
                {steps.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: `${accent}20`, border: `1px solid ${accent}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 900, color,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, paddingTop: 2 }}>{step}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Card>
  )
}

/* ── TIMELINE BLOCK ──────────────────────────────────────────────────────── */
function TimelineBlock({ block }) {
  const { events = [] } = block
  const { color, accent } = BLOCK_META.timeline
  const [expanded, setExpanded] = useState(null)

  return (
    <Card block={block}>
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        {/* Vertical spine */}
        <div style={{
          position: 'absolute', left: 8, top: 6, bottom: 6, width: 2,
          background: `linear-gradient(180deg, ${accent} 0%, ${accent}20 100%)`,
          borderRadius: 99,
        }} />

        {events.map((evt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{ marginBottom: i < events.length - 1 ? 24 : 0 }}
          >
            {/* Dot */}
            <div style={{
              position: 'absolute', left: 3, width: 12, height: 12, borderRadius: '50%',
              background: accent, boxShadow: `0 0 10px ${accent}80`,
              border: `2px solid rgba(7,8,14,0.8)`,
              marginTop: 3,
            }} />

            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
                {evt.date}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{evt.label}</div>
              <AnimatePresence>
                {expanded === i && evt.desc && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7,
                      marginTop: 6, padding: '10px 12px', borderRadius: 10,
                      background: `${accent}08`, border: `1px solid ${accent}18`,
                    }}>
                      {evt.desc}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}

/* ── TABLE BLOCK ─────────────────────────────────────────────────────────── */
function TableBlock({ block }) {
  const { headers = [], rows = [] } = block
  const { color, accent } = BLOCK_META.table
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState(1)

  const sorted = sortCol === null ? rows : [...rows].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol]
    const an = parseFloat(av), bn = parseFloat(bv)
    if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir
    return String(av).localeCompare(String(bv)) * sortDir
  })

  return (
    <Card block={block} noPad>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}
                  onClick={() => { if (sortCol === i) setSortDir(d => -d); else { setSortCol(i); setSortDir(1) } }}
                  style={{
                    padding: '12px 18px', textAlign: 'left',
                    background: `${accent}10`, cursor: 'pointer',
                    fontWeight: 700, fontSize: 11, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color, userSelect: 'none',
                    whiteSpace: 'nowrap',
                    borderBottom: `1px solid ${accent}20`,
                  }}
                >
                  {h}{sortCol === i ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr key={ri} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '11px 18px',
                    color: ci === 0 ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.52)',
                    fontWeight: ci === 0 ? 600 : 400,
                    background: ri % 2 === 1 ? 'rgba(255,255,255,0.012)' : 'transparent',
                    fontSize: 13,
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ── QUIZ BLOCK ──────────────────────────────────────────────────────────── */
function QuizBlock({ block }) {
  const { questions = [] } = block
  const { color, accent } = BLOCK_META.quiz
  const [qIdx, setQIdx]     = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]   = useState(0)
  const [done, setDone]     = useState(false)

  if (!questions.length) return null
  const q = questions[qIdx]
  const progressPct = Math.round((qIdx / questions.length) * 100)
  const scorePct    = Math.round((score / questions.length) * 100)

  const handleAnswer = (i) => {
    if (selected !== null) return
    setSelected(i)
    const correct = i === q.answer
    if (correct) {
      setScore(s => s + 1)
      useCanvasStore.getState().updateMastery(10)
      useCanvasStore.getState().setAevaHint({ text: 'Correct. Keep that momentum.', type: 'praise' })
    } else {
      useCanvasStore.getState().updateMastery(-5)
      useCanvasStore.getState().setAevaHint({ text: `Not quite — the answer was "${q.options[q.answer]}". Notice why?`, type: 'guide' })
    }
  }
  const next  = () => {
    if (qIdx < questions.length - 1) { setQIdx(qi => qi + 1); setSelected(null) }
    else {
      setDone(true)
      const finalScore = (score + (selected === q.answer ? 1 : 0))
      const pct = Math.round((finalScore / questions.length) * 100)
      if (pct === 100) {
        useCanvasStore.getState().updateMastery(10)  // bonus for perfect
        useCanvasStore.getState().setAevaHint({ text: 'Perfect score. You\'ve got this concept locked in.', type: 'praise' })
      } else if (pct >= 60) {
        useCanvasStore.getState().setAevaHint({ text: 'Good work. Review the ones you missed — the gaps are small.', type: 'guide' })
      } else {
        useCanvasStore.getState().setAevaHint({ text: 'Those questions reveal gaps worth fixing. Try the quiz again after reviewing.', type: 'nudge' })
      }
    }
  }
  const reset = () => { setQIdx(0); setSelected(null); setScore(0); setDone(false) }

  const badge = !done && (
    <span style={{
      fontSize: 10.5, fontWeight: 700, color,
      background: `${accent}15`, border: `1px solid ${accent}30`,
      padding: '3px 10px', borderRadius: 99,
    }}>
      {qIdx + 1} / {questions.length}
    </span>
  )

  return (
    <Card block={block} badge={badge}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>
            {scorePct === 100 ? '🎉' : scorePct >= 60 ? '✅' : '📚'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
            {score} / {questions.length}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.40)', marginBottom: 22 }}>
            {scorePct === 100 ? 'Perfect — well done.' : scorePct >= 60 ? 'Good work. Keep going.' : 'Keep practising — you\'ll get it.'}
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={reset} style={{
            padding: '10px 28px', borderRadius: 12,
            background: `${accent}20`, border: `1px solid ${accent}40`,
            color, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Try again</motion.button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 18 }}>
            <motion.div animate={{ width: `${progressPct}%` }}
              style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${accent}, ${color})` }} />
          </div>

          {/* Question */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.55, marginBottom: 16 }}>
            {q.q}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {q.options.map((opt, i) => {
              const isAns = i === q.answer, isSel = i === selected
              let bg = 'rgba(255,255,255,0.035)', border = 'rgba(255,255,255,0.10)', col = 'rgba(255,255,255,0.75)'
              if (selected !== null) {
                if (isAns)      { bg = 'rgba(74,222,128,0.09)';  border = 'rgba(74,222,128,0.40)';  col = '#4ADE80' }
                else if (isSel) { bg = 'rgba(239,68,68,0.09)';   border = 'rgba(239,68,68,0.40)';   col = '#F87171' }
                else            { bg = 'rgba(255,255,255,0.015)'; border = 'rgba(255,255,255,0.06)'; col = 'rgba(255,255,255,0.30)' }
              }
              return (
                <motion.button key={i}
                  whileHover={selected === null ? { scale: 1.01, background: 'rgba(255,255,255,0.055)' } : {}}
                  whileTap={selected === null ? { scale: 0.99 } : {}}
                  onClick={() => handleAnswer(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 14,
                    background: bg, border: `1px solid ${border}`,
                    cursor: selected === null ? 'pointer' : 'default',
                    fontFamily: 'inherit', textAlign: 'left',
                    transition: 'background 0.15s, border 0.15s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: selected !== null && isAns ? 'rgba(74,222,128,0.20)'
                      : selected !== null && isSel ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: col,
                  }}>
                    {selected !== null && isAns ? '✓' : selected !== null && isSel ? '✗' : String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: col }}>{opt}</span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {selected !== null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 14 }}>
                {q.explanation && (
                  <div style={{
                    padding: '11px 14px', borderRadius: 12, marginBottom: 12,
                    background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)',
                    fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65,
                  }}>
                    💡 {q.explanation}
                  </div>
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={next} style={{
                  width: '100%', padding: '12px 0', borderRadius: 14,
                  background: `linear-gradient(135deg, ${accent}, ${color}88)`,
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {qIdx < questions.length - 1 ? 'Next →' : 'See results →'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Card>
  )
}

/* ── CHALLENGE BLOCK ─────────────────────────────────────────────────────── */
function ChallengeBlock({ block }) {
  const { problem, answer, hints = [] } = block
  const { color, accent } = BLOCK_META.challenge
  const [input, setInput]           = useState('')
  const [hintsShown, setHintsShown] = useState(0)
  const [result, setResult]         = useState(null)

  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9=+\-*/.^]/g, '')

  const check = () => {
    const u = norm(input), a = norm(answer)
    const correct = u === a || a.includes(u) || u.includes(a)
    setResult(correct ? 'correct' : 'wrong')
    if (correct) {
      useCanvasStore.getState().updateMastery(15)
      useCanvasStore.getState().setAevaHint({ text: 'Challenge solved. Try adjusting the sliders and see if the answer changes.', type: 'praise' })
    } else {
      useCanvasStore.getState().setAevaHint({ text: `Not quite. The answer is "${answer}" — trace through the steps to see why.`, type: 'guide' })
    }
  }

  const reset = () => { setInput(''); setResult(null); setHintsShown(0) }

  return (
    <Card block={block}>
      {/* Problem box */}
      <div style={{
        padding: '14px 16px', borderRadius: 14, marginBottom: 16,
        background: `${accent}08`, border: `1px solid ${accent}20`,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 14, fontWeight: 600, color: '#FED7AA', lineHeight: 1.65,
      }}>
        {problem}
      </div>

      {result === null ? (
        <>
          {/* Input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input.trim() && check()}
              placeholder="Your answer…"
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 13,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 14, fontFamily: 'monospace', outline: 'none',
                transition: 'border 0.15s',
              }}
              onFocus={e => e.target.style.border = `1px solid ${accent}55`}
              onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.12)'}
            />
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
              onClick={check} disabled={!input.trim()}
              style={{
                padding: '12px 20px', borderRadius: 13,
                background: input.trim() ? `linear-gradient(135deg, ${accent}, ${color}88)` : 'rgba(255,255,255,0.05)',
                border: 'none', color: input.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
                fontSize: 13.5, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              Check
            </motion.button>
          </div>

          {/* Hints */}
          {hints.length > 0 && (
            <div>
              {hints.slice(0, hintsShown).map((h, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', gap: 10, padding: '9px 12px', marginBottom: 6,
                    background: `${accent}08`, border: `1px solid ${accent}18`, borderRadius: 11,
                  }}
                >
                  <Lightbulb size={13} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6 }}>{h}</span>
                </motion.div>
              ))}
              {hintsShown < hints.length && (
                <button onClick={() => setHintsShown(h => h + 1)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 0', fontFamily: 'inherit',
                }}>
                  <Lightbulb size={13} color={`${accent}80`} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: `${accent}cc` }}>
                    Hint {hintsShown + 1} of {hints.length}
                  </span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            padding: '14px 16px', borderRadius: 14, marginBottom: 14,
            background: result === 'correct' ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)',
            border: `1px solid ${result === 'correct' ? 'rgba(74,222,128,0.30)' : 'rgba(239,68,68,0.30)'}`,
          }}>
            <div style={{
              fontSize: 15, fontWeight: 800,
              color: result === 'correct' ? '#4ADE80' : '#F87171', marginBottom: result === 'wrong' ? 6 : 0,
            }}>
              {result === 'correct' ? '✓ Correct!' : '✗ Not quite'}
            </div>
            {result === 'wrong' && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                Answer: <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{answer}</span>
              </div>
            )}
          </div>
          <button onClick={reset} style={{
            padding: '9px 20px', borderRadius: 12,
            background: `${accent}14`, border: `1px solid ${accent}30`,
            color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Try again
          </button>
        </motion.div>
      )}
    </Card>
  )
}

/* ── DIAGRAM BLOCK ───────────────────────────────────────────────────────── */
function DiagramBlock({ block }) {
  const { nodes = [], edges = [] } = block
  const { color, accent } = BLOCK_META.diagram
  const [hovered, setHovered] = useState(null)
  if (!nodes.length) return null

  return (
    <Card block={block}>
      <svg viewBox="0 0 100 100" style={{
        width: '100%', height: 'auto', maxHeight: 280, display: 'block',
        background: 'rgba(6,182,212,0.02)', borderRadius: 14,
        border: '1px solid rgba(6,182,212,0.08)',
      }}>
        <defs>
          <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill={`${accent}80`} />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from)
          const to   = nodes.find(n => n.id === edge.to)
          if (!from || !to) return null
          const dx = to.x - from.x, dy = to.y - from.y
          const len = Math.sqrt(dx * dx + dy * dy)
          const nx = dx / len, ny = dy / len
          const x1 = from.x + nx * 14, y1 = from.y + ny * 7
          const x2 = to.x - nx * 14,   y2 = to.y - ny * 7
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={`${accent}55`} strokeWidth={0.8}
                strokeDasharray="3 2" markerEnd="url(#arr)" />
              {edge.label && (
                <text x={mx} y={my - 2} textAnchor="middle" fontSize={3}
                  fill={`${color}99`} fontWeight="600" fontFamily="Inter,system-ui,sans-serif">
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}
        {nodes.map(node => (
          <g key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}>
            <rect x={node.x - 13} y={node.y - 6} width={26} height={12} rx={3.5}
              fill={hovered === node.id ? `${accent}28` : `${accent}10`}
              stroke={hovered === node.id ? accent : `${accent}50`}
              strokeWidth={0.7} />
            <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={3.5} fill={color} fontWeight="700" fontFamily="Inter,system-ui,sans-serif">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </Card>
  )
}

/* ── EXPLANATION BLOCK ───────────────────────────────────────────────────── */
// Shows a static intro text, then AI-regenerates whenever slider values
// change by ≥1 unit (debounced 1.2 s). This is the "living" Canvas feature.
function ExplanationBlock({ block, ctx }) {
  const { text: initial = '', topic = '' } = block
  const { color, accent } = BLOCK_META.explanation

  const [text, setText]       = useState(initial)
  const [loading, setLoading] = useState(false)
  const [wasUpdated, setWasUpdated] = useState(false)
  const ctxRef  = useRef(ctx)
  const timerRef = useRef(null)

  useEffect(() => {
    const prev = ctxRef.current
    const curr = ctx
    ctxRef.current = curr

    // Detect significant numeric changes (≥ 0.9 units)
    const changes = Object.entries(curr)
      .filter(([k, v]) => typeof v === 'number' && Math.abs(v - (prev[k] ?? v)) >= 0.9)
      .map(([k, v]) => `${k}: ${(prev[k] ?? v).toFixed(1)} → ${v.toFixed(1)}`)

    if (!changes.length) return

    setLoading(true)
    setWasUpdated(false)
    let cancelled = false
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      if (cancelled) return
      const result = await canvasExplain(changes, topic)
      if (cancelled) return
      if (result) { setText(result); setWasUpdated(true) }
      setLoading(false)
    }, 1200)

    return () => { cancelled = true; clearTimeout(timerRef.current) }
  }, [ctx]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card block={block}>
      {/* Live indicator */}
      {(loading || wasUpdated) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          {loading ? (
            <>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: accent }}
              />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: `${accent}cc`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Aeva is thinking…
              </span>
            </>
          ) : (
            <>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: `${accent}cc`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Live update
              </span>
            </>
          )}
        </div>
      )}

      {/* Text — shimmer when loading, else real content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[100, 85, 55].map((w, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12 }}
              style={{ height: 11, width: `${w}%`, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }}
            />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              fontSize: 14, lineHeight: 1.7, margin: 0,
              color: wasUpdated ? '#fff' : 'rgba(255,255,255,0.62)',
              fontWeight: wasUpdated ? 500 : 400,
            }}
          >
            {text}
          </motion.p>
        </AnimatePresence>
      )}
    </Card>
  )
}

/* ── MISSION BLOCK ───────────────────────────────────────────────────────── */
function MissionBlock({ block }) {
  const { goal = '', hint = '', reward = 20 } = block
  const { color, accent } = BLOCK_META.mission
  const [showHint, setShowHint] = useState(false)
  const [done, setDone]         = useState(false)

  const complete = () => {
    setDone(true)
    useCanvasStore.getState().updateMastery(reward)
    useCanvasStore.getState().setAevaHint({
      text: `Mission complete! +${reward}% mastery. Explore what else you can discover.`,
      type: 'praise',
    })
  }

  return (
    <Card block={block}>
      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', padding: '10px 0 6px' }}
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            style={{ fontSize: 44, marginBottom: 12 }}
          >
            🏆
          </motion.div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
            Mission Complete
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 16px', borderRadius: 99, background: `${accent}18`, border: `1px solid ${accent}35`, marginBottom: 16 }}>
            <Trophy size={13} color={color} />
            <span style={{ fontSize: 13, fontWeight: 800, color }}> +{reward}% mastery</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)' }}>
            Keep exploring — try changing parameters and see what happens.
          </div>
        </motion.div>
      ) : (
        <>
          {/* Goal */}
          <div style={{
            padding: '14px 16px', borderRadius: 14, marginBottom: 14,
            background: `${accent}09`, border: `1px solid ${accent}22`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Your goal
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
              {goal}
            </div>
          </div>

          {/* Hint */}
          {hint && (
            <>
              <button onClick={() => setShowHint(h => !h)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 0', marginBottom: 10, fontFamily: 'inherit',
              }}>
                <Lightbulb size={13} color={`${accent}aa`} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: `${accent}cc` }}>
                  {showHint ? 'Hide hint' : 'Show hint'}
                </span>
              </button>
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: 14 }}
                  >
                    <div style={{
                      padding: '10px 14px', borderRadius: 11,
                      background: `${accent}08`, border: `1px solid ${accent}20`,
                      fontSize: 13, color: 'rgba(255,255,255,0.52)', lineHeight: 1.6,
                    }}>
                      💡 {hint}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Reward + Complete */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={13} color={color} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color, fontFamily: 'monospace' }}>+{reward}% mastery</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={complete}
              style={{
                padding: '10px 22px', borderRadius: 12,
                background: `linear-gradient(135deg, ${accent}, ${color}99)`,
                border: 'none', color: '#07080e',
                fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Mark Complete ✓
            </motion.button>
          </div>
        </>
      )}
    </Card>
  )
}

/* ── Block router ────────────────────────────────────────────────────────── */
function renderBlock(block, ctx, onUpdate, i) {
  const key   = `${block.type}-${i}`
  const props = { block, ctx, onUpdate }
  switch (block.type) {
    case 'graph':     return <GraphBlock     key={key} {...props} />
    case 'formula':   return <FormulaBlock   key={key} {...props} />
    case 'timeline':  return <TimelineBlock  key={key} {...props} />
    case 'table':     return <TableBlock     key={key} {...props} />
    case 'quiz':      return <QuizBlock      key={key} {...props} />
    case 'challenge':   return <ChallengeBlock   key={key} {...props} />
    case 'diagram':     return <DiagramBlock     key={key} {...props} />
    case 'explanation': return <ExplanationBlock key={key} {...props} />
    case 'mission':     return <MissionBlock     key={key} {...props} />
    default:            return null
  }
}

/* ── Main AevaCanvas ─────────────────────────────────────────────────────── */
export default function AevaCanvas() {
  const { canvasOpen, currentCanvas, closeCanvas, updateCtx, mastery } = useCanvasStore()

  if (!canvasOpen || !currentCanvas) return null

  const { topic, blocks = [], ctx = {} } = currentCanvas

  // Mastery colour: red → amber → green
  const masteryColor = mastery >= 70 ? '#4ADE80' : mastery >= 40 ? '#FBBF24' : '#F87171'

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(79,70,229,0.10) 0%, #07080e 55%)',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(7,8,14,0.85)',
        backdropFilter: 'blur(24px)',
        minHeight: 64,
      }}>
        {/* Left: logo + topic + mastery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(99,102,241,0.40)',
          }}>
            <LayoutGrid size={16} color="white" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {topic || 'Aeva Canvas'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {/* Mastery bar */}
              <div style={{ width: 72, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${mastery}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  style={{ height: '100%', borderRadius: 99, background: masteryColor, boxShadow: `0 0 6px ${masteryColor}` }}
                />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: masteryColor }}>{mastery}%</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', fontWeight: 500 }}>mastery</span>
            </div>
          </div>
        </div>

        {/* Right: block count + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </span>
          <motion.button
            whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.12)' }}
            whileTap={{ scale: 0.93 }}
            onClick={closeCanvas}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </motion.button>
        </div>
      </div>

      {/* ── Aeva hint strip (between header and blocks) ── */}
      <AevaHintStrip />

      {/* ── Scrollable blocks ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', justifyContent: 'center',
        padding: '24px 16px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          {blocks.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 200, color: 'rgba(255,255,255,0.20)', fontSize: 14,
            }}>
              No blocks generated
            </div>
          ) : (
            blocks.map((block, i) => renderBlock(block, ctx, updateCtx, i))
          )}
        </div>
      </div>
    </motion.div>
  )
}
