import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, TrendingUp, Sigma, GitBranch, Clock3, Table2, HelpCircle,
  Puzzle, Lightbulb, ChevronRight, LayoutGrid, Check, ArrowRight,
} from 'lucide-react'
import { Mafs, Coordinates, Plot } from 'mafs'
import 'mafs/core.css'
import katex from 'katex'
import { useCanvasStore } from './canvasStore'

/* ── Safe math expression evaluator ─────────────────────────────────────── */
function makeFn(expr) {
  const safe = String(expr)
    .replace(/\^/g, '**')
    .replace(/\bsin\b/g, 'Math.sin').replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan').replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs').replace(/\blog\b/g, 'Math.log10')
    .replace(/\bln\b/g, 'Math.log').replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be(?!\w)/g, 'Math.E')
  return (x) => {
    try { return Function('x', `'use strict'; return (${safe})`)(x) }
    catch { return NaN }
  }
}

/* ── Block type config ───────────────────────────────────────────────────── */
const BLOCK_META = {
  graph:     { Icon: TrendingUp, color: '#6366F1', bg: 'rgba(99,102,241,0.09)',  border: 'rgba(99,102,241,0.28)'  },
  formula:   { Icon: Sigma,      color: '#8B5CF6', bg: 'rgba(139,92,246,0.09)', border: 'rgba(139,92,246,0.28)' },
  diagram:   { Icon: GitBranch,  color: '#06B6D4', bg: 'rgba(6,182,212,0.09)',  border: 'rgba(6,182,212,0.28)'  },
  timeline:  { Icon: Clock3,     color: '#F59E0B', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.28)' },
  table:     { Icon: Table2,     color: '#10B981', bg: 'rgba(16,185,129,0.09)', border: 'rgba(16,185,129,0.28)' },
  quiz:      { Icon: HelpCircle, color: '#EC4899', bg: 'rgba(236,72,153,0.09)', border: 'rgba(236,72,153,0.28)' },
  challenge: { Icon: Puzzle,     color: '#F97316', bg: 'rgba(249,115,22,0.09)', border: 'rgba(249,115,22,0.28)' },
}

/* ── Shared block card wrapper ───────────────────────────────────────────── */
function BlockCard({ block, children, badge }) {
  const [collapsed, setCollapsed] = useState(false)
  const meta = BLOCK_META[block.type] || BLOCK_META.graph
  const { Icon, color, bg, border } = meta

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.025)', border: `1px solid ${border}`, marginBottom: 14 }}
    >
      {/* Header — tap to collapse */}
      <button onClick={() => setCollapsed(c => !c)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 16px', background: bg, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} color={color} strokeWidth={2.3} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.title || block.type}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', marginTop: 1 }}>{block.type}</div>
        </div>
        {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
        <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
          <ChevronRight size={13} color="rgba(255,255,255,0.25)" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 18px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── GRAPH BLOCK ─────────────────────────────────────────────────────────── */
function GraphBlock({ block, ctx, onUpdate }) {
  const { expr = 'x', xMin = -6, xMax = 6, params = {} } = block

  const [paramVals, setParamVals] = useState(() => {
    const init = {}
    Object.entries(params).forEach(([k, v]) => { init[k] = ctx[k] !== undefined ? ctx[k] : v })
    return init
  })

  // Sync from ctx when other blocks update shared values
  useEffect(() => {
    setParamVals(prev => {
      const next = { ...prev }
      let changed = false
      Object.keys(params).forEach(k => {
        if (ctx[k] !== undefined && ctx[k] !== prev[k]) { next[k] = ctx[k]; changed = true }
      })
      return changed ? next : prev
    })
  }, [ctx])

  const resolvedExpr = Object.entries(paramVals).reduce(
    (e, [k, v]) => e.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v)), expr
  )
  const fn = makeFn(resolvedExpr)
  const hasParams = Object.keys(params).length > 0
  const exprDisplay = resolvedExpr.replace(/\*\*/g, '^').replace(/Math\.\w+/g, s => s.replace('Math.', ''))

  return (
    <BlockCard block={block}>
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: hasParams ? 16 : 0 }}>
        <Mafs viewBox={{ x: [xMin, xMax], y: [-7, 7] }} height={200}>
          <Coordinates.Cartesian />
          <Plot.OfX y={fn} color="#818CF8" />
        </Mafs>
      </div>
      {hasParams && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Object.entries(params).map(([k, defaultV]) => {
            const val = paramVals[k] ?? defaultV
            return (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.60)', fontFamily: 'monospace' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#818CF8', fontFamily: 'monospace' }}>{Number(val).toFixed(1)}</span>
                </div>
                <input type="range" min={-10} max={10} step={0.1} value={val}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setParamVals(p => ({ ...p, [k]: v }))
                    onUpdate({ [k]: v })
                  }}
                  style={{ width: '100%', accentColor: '#6366F1', height: 4 }}
                />
              </div>
            )
          })}
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', textAlign: 'center' }}>
            y = {exprDisplay}
          </div>
        </div>
      )}
    </BlockCard>
  )
}

/* ── FORMULA BLOCK ───────────────────────────────────────────────────────── */
function FormulaBlock({ block, ctx }) {
  const { latex, variables = {}, steps = [] } = block
  const [showSteps, setShowSteps] = useState(false)

  // Merge live ctx values into variables
  const liveVars = useMemo(() => {
    const v = { ...variables }
    Object.keys(variables).forEach(k => { if (ctx[k] !== undefined) v[k] = ctx[k] })
    return v
  }, [variables, ctx])

  const formulaHtml = useMemo(() => {
    try { return katex.renderToString(latex || '', { throwOnError: false, displayMode: true }) }
    catch { return `<span style="font-family:monospace">${latex}</span>` }
  }, [latex])

  return (
    <BlockCard block={block}>
      {/* Formula */}
      <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', marginBottom: 12, overflowX: 'auto', textAlign: 'center' }}>
        <div dangerouslySetInnerHTML={{ __html: formulaHtml }} style={{ color: '#C4B5FD' }} />
      </div>
      {/* Live variable chips */}
      {Object.keys(liveVars).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: steps.length ? 12 : 0 }}>
          {Object.entries(liveVars).map(([k, v]) => (
            <div key={k} style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#A78BFA', fontFamily: 'monospace' }}>
                {k} = <span style={{ color: '#fff' }}>{typeof v === 'number' ? Number(v).toFixed(2) : v}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Steps */}
      {steps.length > 0 && (
        <>
          <button onClick={() => setShowSteps(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
            <Lightbulb size={13} color="#A78BFA" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#A78BFA' }}>{showSteps ? 'Hide' : 'Show'} derivation steps</span>
          </button>
          <AnimatePresence>
            {showSteps && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 8 }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 800, color: '#A78BFA', marginTop: 1 }}>{i + 1}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>{step}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </BlockCard>
  )
}

/* ── TIMELINE BLOCK ──────────────────────────────────────────────────────── */
function TimelineBlock({ block }) {
  const { events = [] } = block
  const [expanded, setExpanded] = useState(null)

  return (
    <BlockCard block={block}>
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical spine */}
        <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'linear-gradient(180deg,rgba(245,158,11,0.70) 0%,rgba(245,158,11,0.08) 100%)', borderRadius: 99 }} />
        {events.map((evt, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
            style={{ marginBottom: i < events.length - 1 ? 20 : 0 }}>
            {/* Dot */}
            <div style={{ position: 'absolute', left: 2, width: 12, height: 12, borderRadius: '50%', background: '#F59E0B', border: '2px solid rgba(245,158,11,0.35)', marginTop: 4, zIndex: 1 }} />
            {/* Content */}
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 2 }}>{evt.date}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{evt.label}</div>
              <AnimatePresence>
                {expanded === i && evt.desc && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65, marginTop: 5 }}>
                    {evt.desc}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        ))}
      </div>
    </BlockCard>
  )
}

/* ── TABLE BLOCK ─────────────────────────────────────────────────────────── */
function TableBlock({ block }) {
  const { headers = [], rows = [] } = block
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState(1)

  const sorted = sortCol === null ? rows : [...rows].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol]
    const an = parseFloat(av), bn = parseFloat(bv)
    if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir
    return String(av).localeCompare(String(bv)) * sortDir
  })

  return (
    <BlockCard block={block}>
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} onClick={() => { if (sortCol === i) setSortDir(d => -d); else { setSortCol(i); setSortDir(1) } }}
                  style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.07)', fontWeight: 700, color: '#6EE7B7', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {h}{sortCol === i ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr key={ri} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '9px 14px', color: ri % 2 === 0 ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.60)', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', fontSize: 12.5 }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockCard>
  )
}

/* ── QUIZ BLOCK ──────────────────────────────────────────────────────────── */
function QuizBlock({ block }) {
  const { questions = [] } = block
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (!questions.length) return null
  const q = questions[qIdx]

  const handleAnswer = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === q.answer) setScore(s => s + 1)
  }

  const next = () => {
    if (qIdx < questions.length - 1) { setQIdx(qi => qi + 1); setSelected(null) }
    else setDone(true)
  }

  const reset = () => { setQIdx(0); setSelected(null); setScore(0); setDone(false) }

  const scorePct = Math.round((score / questions.length) * 100)
  const progressPct = Math.round((qIdx / questions.length) * 100)

  const badge = !done && (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(236,72,153,0.80)', background: 'rgba(236,72,153,0.10)', border: '1px solid rgba(236,72,153,0.25)', padding: '2px 8px', borderRadius: 99 }}>
      {qIdx + 1}/{questions.length}
    </span>
  )

  return (
    <BlockCard block={block} badge={badge}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{scorePct === 100 ? '🎉' : scorePct >= 60 ? '✅' : '📚'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{score}/{questions.length}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
            {scorePct === 100 ? 'Perfect score!' : scorePct >= 60 ? 'Good work!' : 'Keep practising'}
          </div>
          <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(236,72,153,0.14)', border: '1px solid rgba(236,72,153,0.35)', color: '#F9A8D4', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
            <motion.div animate={{ width: `${progressPct}%` }} style={{ height: '100%', borderRadius: 99, background: '#EC4899' }} />
          </div>
          {/* Question */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.6, marginBottom: 14 }}>{q.q}</div>
          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((opt, i) => {
              const isAns = i === q.answer, isSel = i === selected
              let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.10)', col = 'rgba(255,255,255,0.78)'
              if (selected !== null) {
                if (isAns)      { bg = 'rgba(74,222,128,0.10)'; border = 'rgba(74,222,128,0.35)'; col = '#4ADE80' }
                else if (isSel) { bg = 'rgba(239,68,68,0.10)';  border = 'rgba(239,68,68,0.35)';  col = '#F87171' }
              }
              return (
                <motion.button key={i} whileHover={selected === null ? { scale: 1.01 } : {}} whileTap={selected === null ? { scale: 0.99 } : {}}
                  onClick={() => handleAnswer(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: bg, border: `1px solid ${border}`, cursor: selected === null ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: selected !== null && isAns ? 'rgba(74,222,128,0.18)' : selected !== null && isSel ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: col }}>
                    {selected !== null && isAns ? '✓' : selected !== null && isSel ? '✗' : String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: col }}>{opt}</span>
                </motion.button>
              )
            })}
          </div>
          <AnimatePresence>
            {selected !== null && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 12 }}>
                {q.explanation && (
                  <div style={{ padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, marginBottom: 10 }}>
                    💡 {q.explanation}
                  </div>
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={next}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: 'linear-gradient(135deg,#DB2777,#EC4899)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {qIdx < questions.length - 1 ? 'Next question →' : 'See results →'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </BlockCard>
  )
}

/* ── CHALLENGE BLOCK ─────────────────────────────────────────────────────── */
function ChallengeBlock({ block }) {
  const { problem, answer, hints = [] } = block
  const [input, setInput]   = useState('')
  const [hintsShown, setHintsShown] = useState(0)
  const [result, setResult] = useState(null)  // null | 'correct' | 'wrong'

  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9=+\-*/.^]/g, '')

  const check = () => {
    const u = norm(input), a = norm(answer)
    setResult(u === a || a.includes(u) || u.includes(a) ? 'correct' : 'wrong')
  }

  const reset = () => { setInput(''); setResult(null); setHintsShown(0) }

  return (
    <BlockCard block={block}>
      {/* Problem */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', marginBottom: 14, fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: '#FED7AA', lineHeight: 1.6 }}>
        {problem}
      </div>

      {result === null ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: hints.length > 0 ? 12 : 0 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input.trim() && check()}
              placeholder="Your answer…"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
            />
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={check} disabled={!input.trim()}
              style={{ padding: '11px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#EA580C,#F97316)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.45, fontFamily: 'inherit' }}>
              Check
            </motion.button>
          </div>
          {/* Hint ladder */}
          {hints.length > 0 && (
            <div>
              {hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
                  <Lightbulb size={12} color="#F97316" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>{h}</span>
                </div>
              ))}
              {hintsShown < hints.length && (
                <button onClick={() => setHintsShown(h => h + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  <Lightbulb size={12} color="rgba(249,115,22,0.55)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(249,115,22,0.80)' }}>Hint {hintsShown + 1} of {hints.length}</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ padding: '13px 15px', borderRadius: 12, background: result === 'correct' ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result === 'correct' ? 'rgba(74,222,128,0.28)' : 'rgba(239,68,68,0.28)'}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: result === 'correct' ? '#4ADE80' : '#F87171', marginBottom: result === 'wrong' ? 5 : 0 }}>
              {result === 'correct' ? '✓ Correct!' : '✗ Not quite'}
            </div>
            {result === 'wrong' && (
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)' }}>
                Answer: <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{answer}</span>
              </div>
            )}
          </div>
          <button onClick={reset} style={{ padding: '9px 18px', borderRadius: 11, background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.28)', color: '#FB923C', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Try again
          </button>
        </motion.div>
      )}
    </BlockCard>
  )
}

/* ── DIAGRAM BLOCK ───────────────────────────────────────────────────────── */
function DiagramBlock({ block }) {
  const { nodes = [], edges = [] } = block
  const [hovered, setHovered] = useState(null)
  if (!nodes.length) return null

  return (
    <BlockCard block={block}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: 'auto', maxHeight: 260, display: 'block', background: 'rgba(6,182,212,0.03)', borderRadius: 12 }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(6,182,212,0.55)" />
          </marker>
        </defs>
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from)
          const to   = nodes.find(n => n.id === edge.to)
          if (!from || !to) return null
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2
          // Shorten line to not overlap node boxes
          const dx = to.x - from.x, dy = to.y - from.y
          const len = Math.sqrt(dx*dx + dy*dy)
          const nx = dx/len, ny = dy/len
          const x1 = from.x + nx*12, y1 = from.y + ny*6
          const x2 = to.x - nx*12,   y2 = to.y - ny*6
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(6,182,212,0.40)" strokeWidth={0.7}
                strokeDasharray="2.5 2" markerEnd="url(#arrow)" />
              {edge.label && (
                <text x={mx} y={my - 1.5} textAnchor="middle" fontSize={3.2}
                  fill="rgba(103,232,249,0.65)" fontWeight="600" fontFamily="Inter,system-ui,sans-serif">
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}
        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}>
            <rect x={node.x - 11} y={node.y - 5.5} width={22} height={11} rx={3}
              fill={hovered === node.id ? 'rgba(6,182,212,0.22)' : 'rgba(6,182,212,0.09)'}
              stroke={hovered === node.id ? 'rgba(6,182,212,0.90)' : 'rgba(6,182,212,0.40)'}
              strokeWidth={0.6} />
            <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={3.6} fill="#67E8F9" fontWeight="700" fontFamily="Inter,system-ui,sans-serif">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </BlockCard>
  )
}

/* ── Block router ────────────────────────────────────────────────────────── */
function renderBlock(block, ctx, onUpdate, i) {
  const key = `${block.type}-${i}`
  const props = { block, ctx, onUpdate }
  switch (block.type) {
    case 'graph':     return <GraphBlock     key={key} {...props} />
    case 'formula':   return <FormulaBlock   key={key} {...props} />
    case 'timeline':  return <TimelineBlock  key={key} {...props} />
    case 'table':     return <TableBlock     key={key} {...props} />
    case 'quiz':      return <QuizBlock      key={key} {...props} />
    case 'challenge': return <ChallengeBlock key={key} {...props} />
    case 'diagram':   return <DiagramBlock   key={key} {...props} />
    default:          return null
  }
}

/* ── Main AevaCanvas component ───────────────────────────────────────────── */
export default function AevaCanvas() {
  const { canvasOpen, currentCanvas, closeCanvas, updateCtx } = useCanvasStore()

  if (!canvasOpen || !currentCanvas) return null

  const { topic, blocks = [], ctx = {} } = currentCanvas

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: '#060813',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        flexShrink: 0, height: 58, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(6,8,19,0.96)', backdropFilter: 'blur(24px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 32, height: 32, borderRadius: 11, background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.40)' }}>
            <LayoutGrid size={15} color="white" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{topic || 'Aeva Canvas'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {blocks.length} interactive block{blocks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={closeCanvas}
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={15} />
        </motion.button>
      </div>

      {/* Scrollable block list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 48px' }}>
        {blocks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            No blocks generated
          </div>
        ) : (
          blocks.map((block, i) => renderBlock(block, ctx, updateCtx, i))
        )}
      </div>
    </motion.div>
  )
}
