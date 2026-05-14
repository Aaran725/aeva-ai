import { motion } from 'framer-motion'
import { useNeuralStore } from './neuralStore'

const DIMENSIONS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']

const DIMENSION_META = {
  analogical:   { label: 'Analogical',    short: 'Analogy',   color: '#A78BFA' },
  visual:       { label: 'Visual',         short: 'Visual',    color: '#60A5FA' },
  structural:   { label: 'Structural',     short: 'Structure', color: '#34D399' },
  exampleFirst: { label: 'Example-First',  short: 'Examples',  color: '#FBBF24' },
  conceptual:   { label: 'Conceptual',     short: 'Concepts',  color: '#F87171' },
}

const STYLE_DESCRIPTIONS = {
  analogical:   {
    title: 'Analogy Thinker',
    desc:  'You map new ideas onto familiar ones. Comparisons and metaphors are your fastest path to understanding.',
    how:   'Aeva leads with comparisons before definitions.',
    icon:  '🔗',
  },
  visual:       {
    title: 'Spatial Reasoner',
    desc:  'You think in pictures, diagrams, and mental maps. Visual structure makes concepts click.',
    how:   'Aeva uses spatial language and word-pictures.',
    icon:  '🗺️',
  },
  structural:   {
    title: 'Systems Builder',
    desc:  'You need the scaffold first — steps, sequences, ordered thinking. You build from the skeleton out.',
    how:   'Aeva front-loads numbered frameworks before detail.',
    icon:  '🏗️',
  },
  exampleFirst: {
    title: 'Concrete Learner',
    desc:  'Show before tell. A real example grounds you before any abstraction makes sense.',
    how:   'Aeva shows an example before defining anything.',
    icon:  '⚙️',
  },
  conceptual:   {
    title: 'Principle Seeker',
    desc:  "You want the 'why' before the 'what'. Mechanisms and first principles are your home base.",
    how:   "Aeva explains the causal chain before terminology.",
    icon:  '🔬',
  },
}

/* Pentagon math */
function pentagonPoint(index, total, radius, cx, cy, offset = -Math.PI / 2) {
  const angle = offset + (2 * Math.PI * index) / total
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

function buildPolygonPath(values, maxVal, radius, cx, cy) {
  const pts = values.map((v, i) => {
    const r = maxVal > 0 ? (v / maxVal) * radius : 0
    return pentagonPoint(i, values.length, r, cx, cy)
  })
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
}

function buildRingPath(fraction, radius, cx, cy, n) {
  const r = radius * fraction
  const pts = Array.from({ length: n }, (_, i) => pentagonPoint(i, n, r, cx, cy))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
}

export default function LearningFingerprint() {
  const { learningStyle, learningStyleTotal, learningStyleLocked } = useNeuralStore()

  const cx = 100, cy = 100, radius = 72

  const rawValues = DIMENSIONS.map(d => learningStyle[d] || 0)
  const maxVal = Math.max(...rawValues, 1)
  const normalizedValues = rawValues.map(v => Math.round((v / maxVal) * 100))

  const dominant = DIMENSIONS.reduce(
    (best, d) => (learningStyle[d] > (learningStyle[best] || 0) ? d : best),
    DIMENSIONS[0]
  )

  // Confidence: 0-100% based on signals collected (0-15)
  const LOCK_THRESHOLD = 15
  const confidence = Math.min(100, Math.round((learningStyleTotal / LOCK_THRESHOLD) * 100))
  const hasAnyData = learningStyleTotal > 0

  // Opacity of the radar fill scales with confidence (0.12 → 0.32)
  const fillOpacity = hasAnyData ? 0.12 + (confidence / 100) * 0.22 : 0
  const strokeOpacity = hasAnyData ? 0.25 + (confidence / 100) * 0.60 : 0

  const filledPath = buildPolygonPath(rawValues, maxVal, radius, cx, cy)

  const dominantMeta = DIMENSION_META[dominant]
  const dominantStyle = STYLE_DESCRIPTIONS[dominant]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      padding: '24px 22px',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>
            Learning Fingerprint
          </span>
          <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>
            How You Think
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {learningStyleLocked ? (
            <div style={{
              padding: '4px 11px', borderRadius: 99,
              background: 'rgba(139,143,255,0.15)',
              border: '1px solid rgba(139,143,255,0.35)',
              fontSize: 10, fontWeight: 700, color: '#8B8FFF', letterSpacing: '0.08em',
            }}>
              CALIBRATED
            </div>
          ) : (
            <div style={{
              padding: '4px 11px', borderRadius: 99,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em',
            }}>
              {confidence}% calibrated
            </div>
          )}
        </div>
      </div>

      {/* Radar chart — always rendered, opacity reflects confidence */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 200 200" width={220} height={220}>
          {/* Grid rings */}
          {[0.33, 0.66, 1].map((frac, ri) => (
            <path
              key={ri}
              d={buildRingPath(frac, radius, cx, cy, 5)}
              fill="none"
              stroke={frac === 1 ? 'rgba(139,143,255,0.20)' : 'rgba(255,255,255,0.07)'}
              strokeWidth={frac === 1 ? 1 : 0.5}
            />
          ))}

          {/* Axis lines */}
          {DIMENSIONS.map((_, i) => {
            const pt = pentagonPoint(i, 5, radius, cx, cy)
            return (
              <line key={i} x1={cx} y1={cy} x2={pt.x.toFixed(2)} y2={pt.y.toFixed(2)}
                stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
            )
          })}

          {/* Filled area — always visible, scales with confidence */}
          {hasAnyData ? (
            <motion.path
              d={filledPath}
              fill={`rgba(139,143,255,${fillOpacity.toFixed(2)})`}
              stroke={`rgba(139,143,255,${strokeOpacity.toFixed(2)})`}
              strokeWidth={1.5}
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ) : (
            /* No data — show faint placeholder */
            DIMENSIONS.map((_, i) => {
              const pt = pentagonPoint(i, 5, radius * 0.25, cx, cy)
              return (
                <motion.circle key={i} cx={pt.x} cy={pt.y} r={2.5}
                  fill="rgba(139,143,255,0.20)"
                  animate={{ opacity: [0.15, 0.40, 0.15] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                />
              )
            })
          )}

          {/* Dot markers on each axis point */}
          {hasAnyData && DIMENSIONS.map((d, i) => {
            const raw = rawValues[i]
            if (raw === 0) return null
            const r = (raw / maxVal) * radius
            const pt = pentagonPoint(i, 5, r, cx, cy)
            const color = DIMENSION_META[d].color
            return (
              <motion.circle
                key={d}
                cx={pt.x} cy={pt.y} r={3}
                fill={d === dominant ? color : 'rgba(139,143,255,0.50)'}
                stroke={d === dominant ? `${color}60` : 'transparent'}
                strokeWidth={4}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 300 }}
                style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}
              />
            )
          })}

          {/* Axis labels */}
          {DIMENSIONS.map((d, i) => {
            const pt = pentagonPoint(i, 5, radius + 17, cx, cy)
            const meta = DIMENSION_META[d]
            const isActive = d === dominant && hasAnyData
            return (
              <text
                key={d}
                x={pt.x} y={pt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fontFamily="'Inter', system-ui, sans-serif"
                fontWeight={isActive ? '700' : '500'}
                fill={isActive ? meta.color : 'rgba(255,255,255,0.35)'}
              >
                {meta.short}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Calibration progress bar (only while building) */}
      {!learningStyleLocked && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>
              Calibrating your style…
            </span>
            <span style={{ fontSize: 11, color: 'rgba(139,143,255,0.70)', fontWeight: 700 }}>
              {learningStyleTotal}/{LOCK_THRESHOLD} signals
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, #8B8FFF, rgba(139,143,255,0.45))',
              }}
            />
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>
            {confidence < 30
              ? 'Keep chatting — Aeva is reading how you think.'
              : confidence < 70
              ? `Emerging pattern: ${dominantStyle.title}. Keep going to confirm.`
              : `Nearly confirmed: ${dominantStyle.title}. Almost locked in.`}
          </div>
        </div>
      )}

      {/* Dominant style card — show even while building (when confidence >= 25%) */}
      {hasAnyData && confidence >= 25 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          style={{
            background: learningStyleLocked
              ? `rgba(${hexToRgb(dominantMeta.color)},0.08)`
              : 'rgba(139,143,255,0.06)',
            border: `1px solid ${learningStyleLocked ? dominantMeta.color + '30' : 'rgba(139,143,255,0.18)'}`,
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{dominantStyle.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: dominantMeta.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {learningStyleLocked ? 'Your Style' : 'Leading Pattern'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>
                {dominantStyle.title}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.55, marginBottom: 10 }}>
            {dominantStyle.desc}
          </div>
          {/* How Aeva adapts */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 12, marginTop: 1 }}>⚡</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                Aeva is adapting for you
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', fontStyle: 'italic', lineHeight: 1.45 }}>
                {dominantStyle.how}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* No data empty state */}
      {!hasAnyData && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '14px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>🧬</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.6 }}>
            Start chatting — Aeva will map how you think as you go.
          </div>
        </div>
      )}

      {/* Per-dimension breakdown — show when any data exists */}
      {hasAnyData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 2 }}>
            Signal breakdown
          </div>
          {DIMENSIONS.map((d, i) => {
            const meta = DIMENSION_META[d]
            const raw = rawValues[i]
            const isDom = d === dominant && raw > 0
            return (
              <div key={d}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: isDom ? 700 : 500,
                    color: isDom ? meta.color : 'rgba(255,255,255,0.40)',
                  }}>
                    {meta.label}
                    {isDom && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>← dominant</span>}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', fontVariantNumeric: 'tabular-nums' }}>
                    {raw} signal{raw !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${normalizedValues[i]}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
                    style={{
                      height: '100%', borderRadius: 99,
                      background: isDom
                        ? `linear-gradient(90deg, ${meta.color}, ${meta.color}55)`
                        : 'rgba(255,255,255,0.15)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* tiny helper */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
