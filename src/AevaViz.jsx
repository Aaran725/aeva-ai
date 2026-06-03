import { Mafs, Coordinates, Plot, Point as MafsPoint, Vector as MafsVector, Circle as MafsCircle, Text as MafsText } from 'mafs'
import 'mafs/core.css'

/* ── Safe expression evaluator ─────────────────────────────────────────── */
function makeFn(expr) {
  try {
    const e = expr
      .replace(/\^/g, '**')
      .replace(/\bsin\b/g,   'Math.sin')
      .replace(/\bcos\b/g,   'Math.cos')
      .replace(/\btan\b/g,   'Math.tan')
      .replace(/\bsqrt\b/g,  'Math.sqrt')
      .replace(/\babs\b/g,   'Math.abs')
      .replace(/\bln\b/g,    'Math.log')
      .replace(/\blog10\b/g, 'Math.log10')
      .replace(/\blog\b/g,   'Math.log10')
      .replace(/\bpi\b/gi,   'Math.PI')
      .replace(/\be(?![a-zA-Z0-9_])/g, 'Math.E')
    // eslint-disable-next-line no-new-func
    return new Function('x', `"use strict";try{var r=(${e});return isFinite(r)?r:NaN}catch{return NaN}`)
  } catch {
    return () => NaN
  }
}

const PALETTE = ['#818CF8', '#F97316', '#4ADE80', '#F472B6', '#FBBF24', '#06B6D4', '#A78BFA']

/* ── Shared card wrapper ────────────────────────────────────────────────── */
function VizCard({ title, legend, children }) {
  return (
    <div style={{
      margin: '12px 0', borderRadius: 14, overflow: 'hidden',
      background: 'rgba(5,7,22,0.95)',
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.40)',
    }}>
      {(title || legend) && (
        <div style={{
          padding: '10px 16px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {title && (
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>
              {title}
            </div>
          )}
          {legend && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {legend.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 18, height: 2.5, borderRadius: 99, background: l.color }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

/* ── Function plot ──────────────────────────────────────────────────────── */
function FunctionPlot({ config }) {
  const fns = config.type === 'functions'
    ? (config.fns || [])
    : [{ expr: config.expr, label: config.label || config.title, color: config.color || PALETTE[0] }]

  const xMin = config.xMin ?? -5
  const xMax = config.xMax ?? 5
  const yMin = config.yMin ?? -5
  const yMax = config.yMax ?? 5

  const legend = fns.length > 1 ? fns.map((f, i) => ({ label: f.label || f.expr, color: f.color || PALETTE[i] })) : null

  return (
    <VizCard title={config.title} legend={legend}>
      <div style={{ '--mafs-bg': 'transparent', '--mafs-fg': 'rgba(255,255,255,0.5)' }}>
        <Mafs
          viewBox={{ x: [xMin, xMax], y: [yMin, yMax] }}
          height={240}
          preserveAspectRatio={false}
          background="transparent"
        >
          <Coordinates.Cartesian
            xAxis={{ lines: Math.ceil((xMax - xMin) / 5), labels: (n) => n !== 0 ? n : '' }}
            yAxis={{ lines: Math.ceil((yMax - yMin) / 5), labels: (n) => n !== 0 ? n : '' }}
          />
          {fns.map((f, i) => (
            <Plot.OfX
              key={i}
              y={makeFn(f.expr)}
              color={f.color || PALETTE[i % PALETTE.length]}
              weight={2.5}
            />
          ))}
          {/* Highlighted points */}
          {(config.points || []).map((pt, i) => (
            <MafsPoint key={i} x={pt.x} y={pt.y} color={pt.color || '#FBBF24'} />
          ))}
        </Mafs>
      </div>
    </VizCard>
  )
}

/* ── Coordinate plane (points / vectors / circles) ─────────────────────── */
function CoordPlane({ config }) {
  const xMin = config.xMin ?? -6
  const xMax = config.xMax ?? 6
  const yMin = config.yMin ?? -6
  const yMax = config.yMax ?? 6

  return (
    <VizCard title={config.title}>
      <div style={{ '--mafs-bg': 'transparent' }}>
        <Mafs
          viewBox={{ x: [xMin, xMax], y: [yMin, yMax] }}
          height={240}
          preserveAspectRatio={false}
          background="transparent"
        >
          <Coordinates.Cartesian />
          {/* Points */}
          {(config.pts || config.points || []).map((pt, i) => (
            <MafsPoint key={i} x={pt.x} y={pt.y} color={pt.color || PALETTE[i % PALETTE.length]} />
          ))}
          {/* Vectors */}
          {(config.vecs || config.vectors || []).map((v, i) => (
            <MafsVector
              key={i}
              tail={v.tail || [0, 0]}
              tip={v.tip}
              color={v.color || PALETTE[i % PALETTE.length]}
            />
          ))}
          {/* Circles */}
          {(config.circles || []).map((c, i) => (
            <MafsCircle
              key={i}
              center={c.center || [c.x || 0, c.y || 0]}
              radius={c.radius || c.r || 1}
              color={c.color || PALETTE[i % PALETTE.length]}
              fillOpacity={0.1}
            />
          ))}
        </Mafs>
      </div>
    </VizCard>
  )
}

/* ── Bar chart (pure SVG — Mafs is for coordinate math) ────────────────── */
function BarChart({ config }) {
  const data = config.data || []
  if (!data.length) return null

  const W = 460, H = 200
  const PAD = { t: 16, r: 20, b: 44, l: 44 }
  const pw = W - PAD.l - PAD.r
  const ph = H - PAD.t - PAD.b

  const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1)
  const bw = (pw / data.length) * 0.55
  const gap = pw / data.length

  const toH = (v) => (Math.abs(v) / maxVal) * ph
  const fmt = (n) => Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f))

  return (
    <VizCard title={config.title}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Grid lines */}
        {yTicks.map(v => {
          const y = PAD.t + ph - toH(v)
          return (
            <g key={v}>
              <line x1={PAD.l} y1={y} x2={PAD.l + pw} y2={y}
                stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end"
                fill="rgba(255,255,255,0.35)" fontSize={9}>{fmt(v)}</text>
            </g>
          )
        })}
        {/* Baseline */}
        <line x1={PAD.l} y1={PAD.t + ph} x2={PAD.l + pw} y2={PAD.t + ph}
          stroke="rgba(255,255,255,0.20)" strokeWidth={1.5} />

        {data.map((d, i) => {
          const bh = toH(d.value)
          const x = PAD.l + i * gap + (gap - bw) / 2
          const y = PAD.t + ph - bh
          const color = d.color || PALETTE[i % PALETTE.length]
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={bh} rx={4}
                fill={color} opacity={0.82} />
              <text x={x + bw / 2} y={y - 5} textAnchor="middle"
                fill="rgba(255,255,255,0.70)" fontSize={9.5} fontWeight={600}>{fmt(d.value)}</text>
              <text x={x + bw / 2} y={PAD.t + ph + 16} textAnchor="middle"
                fill="rgba(255,255,255,0.40)" fontSize={10}>{d.label}</text>
            </g>
          )
        })}
      </svg>
    </VizCard>
  )
}

/* ── Number line ────────────────────────────────────────────────────────── */
function NumberLine({ config }) {
  const min = config.min ?? -5
  const max = config.max ?? 5
  const W = 460, H = 90
  const PAD = 40
  const pw = W - PAD * 2
  const ly = 45

  const toX = (v) => PAD + ((v - min) / (max - min)) * pw

  // Nice tick spacing
  const span = max - min
  const step = span <= 4 ? 0.5 : span <= 12 ? 1 : span <= 30 ? 5 : 10
  const ticks = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 0.01; v += step)
    ticks.push(Math.round(v * 1e6) / 1e6)

  return (
    <VizCard title={config.title}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Intervals */}
        {(config.intervals || []).map((int, i) => {
          const x1 = toX(int.from), x2 = toX(int.to)
          const color = int.color || PALETTE[i % PALETTE.length]
          return (
            <g key={i}>
              <rect x={x1} y={ly - 10} width={x2 - x1} height={20} fill={`${color}25`} />
              <line x1={x1} y1={ly - 12} x2={x1} y2={ly + 12} stroke={color} strokeWidth={2}
                strokeDasharray={int.openLeft ? '4 2' : undefined} />
              <line x1={x2} y1={ly - 12} x2={x2} y2={ly + 12} stroke={color} strokeWidth={2}
                strokeDasharray={int.openRight ? '4 2' : undefined} />
            </g>
          )
        })}

        {/* Main axis */}
        <line x1={PAD - 8} y1={ly} x2={PAD + pw + 8} y2={ly}
          stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" />

        {/* Tick marks */}
        {ticks.map(v => (
          <g key={v}>
            <line x1={toX(v)} y1={ly - 5} x2={toX(v)} y2={ly + 5}
              stroke="rgba(255,255,255,0.30)" strokeWidth={1.5} />
            <text x={toX(v)} y={ly + 20} textAnchor="middle"
              fill="rgba(255,255,255,0.38)" fontSize={10}>{v}</text>
          </g>
        ))}

        {/* Points */}
        {(config.points || []).map((pt, i) => {
          const color = pt.color || PALETTE[i % PALETTE.length]
          const cx = toX(pt.value)
          return (
            <g key={i}>
              <circle cx={cx} cy={ly} r={6}
                fill={pt.open ? 'rgba(5,7,22,0.95)' : color}
                stroke={color} strokeWidth={2} />
              {pt.label && (
                <text x={cx} y={ly - 14} textAnchor="middle"
                  fill={color} fontSize={11} fontWeight={700}>{pt.label}</text>
              )}
            </g>
          )
        })}
      </svg>
    </VizCard>
  )
}

/* ── Main export ────────────────────────────────────────────────────────── */
export default function AevaViz({ config }) {
  if (!config?.type) return null

  try {
    switch (config.type) {
      case 'function':
      case 'functions':
        return <FunctionPlot config={config} />
      case 'points':
      case 'vectors':
      case 'circles':
      case 'geometry':
        return <CoordPlane config={config} />
      case 'bar':
        return <BarChart config={config} />
      case 'numberline':
        return <NumberLine config={config} />
      default:
        return null
    }
  } catch {
    return null
  }
}
