/**
 * ChatVisuals — inline visual components for Aeva's chat responses.
 * Triggered by [VIZ:type|data] tags embedded by Aeva in her responses.
 *
 * Tag formats (Aeva outputs these; MarkdownRenderer intercepts them):
 *   [VIZ:comparison|Left Title|Right Title|Label:LeftVal:RightVal|...]
 *   [VIZ:process|Step 1|Step 2|Step 3|...]
 *   [VIZ:timeline|Date:Event|Date:Event|...]
 *   [VIZ:bar|Chart Title|Label:Value|Label:Value|...]
 *   [VIZ:line|Chart Title|X axis label|Y axis label|x1:y1|x2:y2|...]
 *   [VIZ:formula|Formula Name|LaTeX|Description]
 *   [VIZ:venn|Left Name|Right Name|Left-only,items|Both,items|Right-only,items]
 */

import { Component, useState } from 'react'
import { motion } from 'framer-motion'
import katex from 'katex'

/* ── Error boundary — silently swallows render errors inside viz ── */
class VizErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() { return this.state.crashed ? null : this.props.children }
}

/* ── parse helpers ────────────────────────────────────── */

// Split on first colon only
function splitFirst(str, sep = ':') {
  const idx = str.indexOf(sep)
  if (idx < 0) return [str, '']
  return [str.slice(0, idx), str.slice(idx + 1)]
}

export function parseVizTag(line) {
  // Strip backtick wrapping in case model wraps the tag
  const stripped = line.trim().replace(/^`+|`+$/g, '').trim()
  const match = stripped.match(/^\[VIZ:([a-z_]+)\|(.+?)\]\.?$/is)
  if (!match) return null
  return { type: match[1].toLowerCase(), raw: match[2] }
}

/* ── shared palette ───────────────────────────────────── */
const COLORS = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#FB923C', '#A78BFA', '#4ADE80']

/* ── wrapper ──────────────────────────────────────────── */
function VizInner({ type, raw, isLight }) {
  switch (type) {
    case 'comparison':   return <ComparisonViz   raw={raw} isLight={isLight} />
    case 'process':      return <ProcessViz      raw={raw} isLight={isLight} />
    case 'timeline':     return <TimelineViz     raw={raw} isLight={isLight} />
    case 'bar':
    case 'bar_chart':    return <BarViz          raw={raw} isLight={isLight} />
    case 'line':
    case 'line_graph':   return <LineViz         raw={raw} isLight={isLight} />
    case 'formula':
    case 'formula_card': return <FormulaViz      raw={raw} isLight={isLight} />
    case 'venn':         return <VennViz         raw={raw} isLight={isLight} />
    default:             return null
  }
}

export function VizComponent({ type, raw, isLight }) {
  if (!type || !raw) return null
  return (
    <VizErrorBoundary>
      <VizInner type={type} raw={raw} isLight={isLight} />
    </VizErrorBoundary>
  )
}

/* ══════════════════════════════════════════════════════
   COMPARISON TABLE
   Format: LeftTitle|RightTitle|Label:LeftVal:RightVal|...
══════════════════════════════════════════════════════ */
function ComparisonViz({ raw, isLight }) {
  const parts  = raw.split('|')
  const leftTitle  = parts[0]?.trim() || 'A'
  const rightTitle = parts[1]?.trim() || 'B'
  const rows = parts.slice(2).map(r => {
    const segs = r.split(':')
    return { label: segs[0]?.trim(), left: segs[1]?.trim() || '', right: segs[2]?.trim() || '' }
  }).filter(r => r.label)

  const bg   = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(10,11,30,0.85)'
  const bdr  = isLight ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(255,255,255,0.09)'
  const rowEven = isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)'
  const divider = isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ margin: '18px 0', borderRadius: 16, overflow: 'hidden', border: bdr, background: bg, boxShadow: isLight ? 'none' : '0 4px 24px rgba(0,0,0,0.30)' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.14)' }}>
        <div style={{ padding: '11px 14px', fontSize: 10.5, fontWeight: 700, color: 'rgba(139,143,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Feature</div>
        <div style={{ padding: '11px 14px', fontSize: 13.5, fontWeight: 800, color: '#818CF8', borderLeft: divider }}>{leftTitle}</div>
        <div style={{ padding: '11px 14px', fontSize: 13.5, fontWeight: 800, color: '#34D399', borderLeft: divider }}>{rightTitle}</div>
      </div>
      {/* Rows */}
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: i % 2 === 0 ? rowEven : 'transparent', borderTop: divider }}>
          <div style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.42)' }}>{row.label}</div>
          <div style={{ padding: '10px 14px', fontSize: 13.5, color: isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.82)', borderLeft: divider }}>{row.left}</div>
          <div style={{ padding: '10px 14px', fontSize: 13.5, color: isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.82)', borderLeft: divider }}>{row.right}</div>
        </div>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   PROCESS FLOW
   Format: Step 1|Step 2|Step 3|...
══════════════════════════════════════════════════════ */
function ProcessViz({ raw, isLight }) {
  const steps = raw.split('|').map(s => s.trim()).filter(Boolean)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ margin: '18px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08, duration: 0.28 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 80, maxWidth: 120 }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              background: `${COLORS[i % COLORS.length]}20`,
              border: `2px solid ${COLORS[i % COLORS.length]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: COLORS[i % COLORS.length],
            }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: isLight ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 1.4 }}>
              {step}
            </div>
          </motion.div>
          {i < steps.length - 1 && (
            <div style={{ fontSize: 18, color: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)', flexShrink: 0, marginBottom: 22 }}>→</div>
          )}
        </div>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   TIMELINE
   Format: Date:Event|Date:Event|...
══════════════════════════════════════════════════════ */
function TimelineViz({ raw, isLight }) {
  const events = raw.split('|').map(e => {
    const [date, ...rest] = splitFirst(e)
    return { date: date?.trim(), event: rest[0]?.trim() || rest.join(':').trim() }
  }).filter(e => e.date && e.event)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ margin: '18px 0', position: 'relative', paddingLeft: 28 }}>
      {/* Vertical line */}
      <div style={{ position: 'absolute', left: 8, top: 10, bottom: 10, width: 2, background: isLight ? 'rgba(99,102,241,0.20)' : 'rgba(139,143,255,0.22)', borderRadius: 1 }} />

      {events.map((e, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.28 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: i < events.length - 1 ? 20 : 0, position: 'relative' }}>
          {/* Dot */}
          <div style={{ position: 'absolute', left: -24, top: 5, width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], border: `2px solid ${isLight ? '#fff' : '#05060f'}`, zIndex: 1 }} />
          <div style={{ fontSize: 11.5, fontWeight: 800, color: COLORS[i % COLORS.length], letterSpacing: '0.02em' }}>{e.date}</div>
          <div style={{ fontSize: 13.5, color: isLight ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>{e.event}</div>
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   BAR CHART  (pure SVG — no Recharts)
   Format: Chart Title|Label:Value|Label:Value|...
══════════════════════════════════════════════════════ */
function BarViz({ raw, isLight }) {
  const [hovered, setHovered] = useState(null)
  const parts = raw.split('|')
  const title = parts[0]?.trim()
  const data  = parts.slice(1).map(p => {
    const [name, val] = splitFirst(p)
    return { name: name?.trim() || '', value: parseFloat(val) || 0 }
  }).filter(d => d.name)

  if (!data.length) return null

  const W = 420, H = 170, PAD_L = 36, PAD_B = 36, PAD_T = 10, PAD_R = 10
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barW   = Math.min(42, (chartW / data.length) * 0.55)
  const gap    = chartW / data.length

  const labelColor = isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.38)'
  const gridColor  = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + chartH * (1 - f),
    label: f === 0 ? '0' : (maxVal * f % 1 === 0 ? String(Math.round(maxVal * f)) : (maxVal * f).toFixed(1)),
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ margin: '18px 0' }}>
      {title && <div style={{ fontSize: 12.5, fontWeight: 700, color: isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.45)', marginBottom: 10, textAlign: 'center', letterSpacing: '0.02em' }}>{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke={gridColor} strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD_L - 5} y={t.y + 4} textAnchor="end" fontSize="10" fill={labelColor} fontFamily="Inter,system-ui">{t.label}</text>
          </g>
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const bh  = (d.value / maxVal) * chartH
          const bx  = PAD_L + gap * i + gap / 2 - barW / 2
          const by  = PAD_T + chartH - bh
          const col = COLORS[i % COLORS.length]
          const isHov = hovered === i
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
              <rect x={bx} y={by} width={barW} height={bh}
                rx="5" ry="5"
                fill={col}
                opacity={isHov ? 1 : 0.82}
              />
              {/* Tooltip on hover */}
              {isHov && (
                <g>
                  <rect x={bx + barW / 2 - 28} y={by - 28} width={56} height={22} rx="6"
                    fill={isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.14)'}
                    stroke={col} strokeWidth="1" />
                  <text x={bx + barW / 2} y={by - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill={col} fontFamily="Inter,system-ui">
                    {d.value}
                  </text>
                </g>
              )}
              {/* X label */}
              <text x={bx + barW / 2} y={H - PAD_B + 14} textAnchor="middle" fontSize="10" fill={labelColor} fontFamily="Inter,system-ui">
                {d.name.length > 9 ? d.name.slice(0, 8) + '…' : d.name}
              </text>
            </g>
          )
        })}
        {/* Baseline */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke={gridColor} strokeWidth="1" />
      </svg>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   LINE GRAPH  (pure SVG — no Recharts)
   Format: Title|X label|Y label|x1:y1|x2:y2|...
══════════════════════════════════════════════════════ */
function LineViz({ raw, isLight }) {
  const [hovered, setHovered] = useState(null)
  const parts  = raw.split('|')
  const title  = parts[0]?.trim()
  const xLabel = parts[1]?.trim()
  const yLabel = parts[2]?.trim()
  const data   = parts.slice(3).map(p => {
    const [xRaw, yRaw] = splitFirst(p)
    return { x: xRaw?.trim() || '', y: parseFloat(yRaw) || 0 }
  }).filter(d => d.x !== '')

  if (data.length < 2) return null

  const W = 420, H = 180, PAD_L = 42, PAD_B = 40, PAD_T = 14, PAD_R = 16
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const minY = Math.min(...data.map(d => d.y))
  const maxY = Math.max(...data.map(d => d.y), minY + 1)
  const rangeY = maxY - minY

  const toSvg = (i) => ({
    sx: PAD_L + (i / (data.length - 1)) * chartW,
    sy: PAD_T + chartH - ((data[i].y - minY) / rangeY) * chartH,
  })

  const points = data.map((_, i) => { const { sx, sy } = toSvg(i); return `${sx},${sy}` }).join(' ')

  const labelColor = isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.38)'
  const gridColor  = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + chartH * (1 - f),
    label: (minY + rangeY * f).toFixed(rangeY < 5 ? 1 : 0),
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ margin: '18px 0' }}>
      {title && <div style={{ fontSize: 12.5, fontWeight: 700, color: isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.45)', marginBottom: 10, textAlign: 'center' }}>{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke={gridColor} strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD_L - 5} y={t.y + 4} textAnchor="end" fontSize="10" fill={labelColor} fontFamily="Inter,system-ui">{t.label}</text>
          </g>
        ))}
        {/* Y label */}
        {yLabel && <text x={10} y={H / 2} textAnchor="middle" fontSize="10" fill={labelColor} fontFamily="Inter,system-ui" transform={`rotate(-90,10,${H/2})`}>{yLabel}</text>}
        {/* Line */}
        <polyline points={points} fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Gradient area under line */}
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${PAD_L},${PAD_T + chartH} ${points} ${W - PAD_R},${PAD_T + chartH}`} fill="url(#lineGrad)" />
        {/* Dots + hover */}
        {data.map((d, i) => {
          const { sx, sy } = toSvg(i)
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
              <circle cx={sx} cy={sy} r={hovered === i ? 6 : 4} fill="#818CF8" />
              {hovered === i && (
                <g>
                  <rect x={sx - 28} y={sy - 30} width={56} height={22} rx="6"
                    fill={isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.14)'}
                    stroke="#818CF8" strokeWidth="1" />
                  <text x={sx} y={sy - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#C4B5FD" fontFamily="Inter,system-ui">{d.y}</text>
                </g>
              )}
              {/* X tick */}
              <text x={sx} y={H - PAD_B + 14} textAnchor="middle" fontSize="10" fill={labelColor} fontFamily="Inter,system-ui">
                {String(d.x).length > 6 ? String(d.x).slice(0, 5) + '…' : d.x}
              </text>
            </g>
          )
        })}
        {/* Baseline */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke={gridColor} strokeWidth="1" />
        {/* X label */}
        {xLabel && <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="10" fill={labelColor} fontFamily="Inter,system-ui">{xLabel}</text>}
      </svg>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   FORMULA CARD
   Format: Name|LaTeX formula|Description
══════════════════════════════════════════════════════ */
function FormulaViz({ raw, isLight }) {
  const parts = raw.split('|')
  const name  = parts[0]?.trim()
  const latex = parts[1]?.trim() || ''
  const desc  = parts[2]?.trim() || ''

  let html = null
  try { html = katex.renderToString(latex, { throwOnError: false, displayMode: true }) } catch {}

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.32 }}
      style={{
        margin: '18px 0', borderRadius: 18, padding: '22px 26px', textAlign: 'center',
        background: isLight ? 'rgba(99,102,241,0.05)' : 'rgba(14,16,50,0.88)',
        border: isLight ? '1px solid rgba(99,102,241,0.20)' : '1px solid rgba(99,102,241,0.32)',
        boxShadow: isLight ? 'none' : '0 8px 36px rgba(0,0,0,0.38), inset 0 1px 0 rgba(165,170,255,0.07)',
      }}>
      {name && (
        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#818CF8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
          {name}
        </div>
      )}
      {html
        ? <div dangerouslySetInnerHTML={{ __html: html }} style={{ fontSize: 24, color: isLight ? '#1e1b4b' : 'rgba(255,255,255,0.95)', overflowX: 'auto', lineHeight: 1.5 }} />
        : <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, color: isLight ? '#1e1b4b' : 'rgba(255,255,255,0.90)' }}>{latex}</div>
      }
      {desc && (
        <div style={{ marginTop: 14, fontSize: 13, color: isLight ? 'rgba(0,0,0,0.48)' : 'rgba(255,255,255,0.44)', lineHeight: 1.65 }}>{desc}</div>
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   VENN DIAGRAM
   Format: Left Name|Right Name|Left-only items (comma sep)|Both items (comma sep)|Right-only items (comma sep)
══════════════════════════════════════════════════════ */
function VennViz({ raw, isLight }) {
  const parts     = raw.split('|')
  const leftName  = parts[0]?.trim() || 'A'
  const rightName = parts[1]?.trim() || 'B'
  const leftOnly  = (parts[2] || '').split(',').map(s => s.trim()).filter(Boolean)
  const both      = (parts[3] || '').split(',').map(s => s.trim()).filter(Boolean)
  const rightOnly = (parts[4] || '').split(',').map(s => s.trim()).filter(Boolean)

  const txt = { fontSize: 11.5, color: isLight ? 'rgba(0,0,0,0.68)' : 'rgba(255,255,255,0.68)', lineHeight: 1.65, textAlign: 'center' }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ margin: '18px 0', position: 'relative', minHeight: 180 }}>
      {/* SVG circles */}
      <svg viewBox="0 0 360 160" style={{ width: '100%', height: 160, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <circle cx="135" cy="80" r="75" fill="rgba(99,102,241,0.14)" stroke="#6366F1" strokeWidth="1.8" />
        <circle cx="225" cy="80" r="75" fill="rgba(16,185,129,0.14)" stroke="#10B981" strokeWidth="1.8" />
      </svg>

      {/* Labels + content (absolutely positioned over SVG) */}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: 160, alignItems: 'center' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingRight: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#818CF8', marginBottom: 4 }}>{leftName}</div>
          {leftOnly.map((item, i) => <div key={i} style={txt}>{item}</div>)}
        </div>
        {/* Both */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {both.map((item, i) => <div key={i} style={{ ...txt, fontSize: 11, color: isLight ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.60)' }}>{item}</div>)}
        </div>
        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingLeft: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginBottom: 4 }}>{rightName}</div>
          {rightOnly.map((item, i) => <div key={i} style={txt}>{item}</div>)}
        </div>
      </div>
    </motion.div>
  )
}
