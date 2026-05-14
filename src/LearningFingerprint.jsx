import { motion } from 'framer-motion'
import { useNeuralStore } from './neuralStore'

const DIMENSIONS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']

const DIMENSION_LABELS = {
  analogical:   'Analogical',
  visual:       'Visual',
  structural:   'Structural',
  exampleFirst: 'Example-First',
  conceptual:   'Conceptual',
}

const STYLE_DESCRIPTIONS = {
  analogical:   { title: 'Analogy Thinker', desc: 'You map new ideas onto familiar ones. Comparisons and metaphors are your fastest path to understanding.' },
  visual:       { title: 'Spatial Reasoner', desc: 'You think in pictures, diagrams, and mental maps. Visual structure makes concepts click.' },
  structural:   { title: 'Systems Builder', desc: 'You need the scaffold first — steps, sequences, ordered thinking. You build from the skeleton out.' },
  exampleFirst: { title: 'Concrete Learner', desc: "Show before tell. A real example grounds you before any abstraction makes sense." },
  conceptual:   { title: 'Principle Seeker', desc: "You want the 'why' before the 'what'. Mechanisms and first principles are your home base." },
}

const STYLE_INSTRUCTIONS = {
  analogical:   'Aeva leads explanations with comparisons and familiar parallels.',
  visual:       'Aeva uses spatial language and mental imagery.',
  structural:   'Aeva front-loads structure: numbered steps and clear sequences.',
  exampleFirst: 'Aeva leads with a concrete example before the abstraction.',
  conceptual:   "Aeva explains the 'why' mechanism before the 'what'.",
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

  const cx = 100
  const cy = 100
  const radius = 72

  const rawValues = DIMENSIONS.map(d => learningStyle[d] || 0)
  const maxVal = Math.max(...rawValues, 1)
  const normalizedValues = rawValues.map(v => Math.round((v / maxVal) * 100))

  const dominant = DIMENSIONS.reduce(
    (best, d) => (learningStyle[d] > (learningStyle[best] || 0) ? d : best),
    DIMENSIONS[0]
  )

  const filledPath = buildPolygonPath(rawValues, maxVal, radius, cx, cy)

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
            {learningStyleLocked ? 'How You Think' : 'Building Your Profile'}
          </h3>
        </div>
        {learningStyleLocked && (
          <div style={{
            padding: '4px 11px', borderRadius: 99,
            background: 'rgba(139,143,255,0.15)',
            border: '1px solid rgba(139,143,255,0.35)',
            fontSize: 10, fontWeight: 700, color: '#8B8FFF', letterSpacing: '0.08em',
          }}>
            LOCKED IN
          </div>
        )}
      </div>

      {/* Radar chart */}
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

          {/* Filled area */}
          {learningStyleLocked ? (
            <motion.path
              d={filledPath}
              fill="rgba(139,143,255,0.25)"
              stroke="#8B8FFF"
              strokeWidth={1.5}
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ) : (
            /* Pulsing placeholder nodes when building */
            DIMENSIONS.map((_, i) => {
              const pt = pentagonPoint(i, 5, radius * 0.35, cx, cy)
              return (
                <motion.circle
                  key={i}
                  cx={pt.x} cy={pt.y} r={3}
                  fill="#8B8FFF"
                  animate={{ r: [2, 4, 2], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                />
              )
            })
          )}

          {/* Axis dot markers (locked) */}
          {learningStyleLocked && DIMENSIONS.map((d, i) => {
            const raw = rawValues[i]
            const r = maxVal > 0 ? (raw / maxVal) * radius : 0
            const pt = pentagonPoint(i, 5, r, cx, cy)
            return (
              <motion.circle
                key={d}
                cx={pt.x} cy={pt.y} r={3.5}
                fill="#8B8FFF"
                stroke="rgba(139,143,255,0.50)"
                strokeWidth={4}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 300 }}
                style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}
              />
            )
          })}

          {/* Axis labels */}
          {DIMENSIONS.map((d, i) => {
            const pt = pentagonPoint(i, 5, radius + 16, cx, cy)
            return (
              <text
                key={d}
                x={pt.x} y={pt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7.5"
                fontFamily="'Inter', system-ui, sans-serif"
                fontWeight="600"
                fill={learningStyleLocked && d === dominant ? '#8B8FFF' : 'rgba(255,255,255,0.45)'}
              >
                {DIMENSION_LABELS[d]}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Dominant style card */}
      {learningStyleLocked ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          style={{
            background: 'rgba(139,143,255,0.10)',
            border: '1px solid rgba(139,143,255,0.25)',
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8FFF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Dominant Style
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 5, letterSpacing: '-0.02em' }}>
            {STYLE_DESCRIPTIONS[dominant].title}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5, marginBottom: 10 }}>
            {STYLE_DESCRIPTIONS[dominant].desc}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(139,143,255,0.85)', fontStyle: 'italic' }}>
            {STYLE_INSTRUCTIONS[dominant]}
          </div>
        </motion.div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '14px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
            {learningStyleTotal} of 8 signals detected
          </div>
          <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(learningStyleTotal / 8) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #8B8FFF, rgba(139,143,255,0.5))' }}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
            Keep chatting — Aeva is reading how you think.
          </div>
        </div>
      )}

      {/* Per-dimension breakdown (locked only) */}
      {learningStyleLocked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DIMENSIONS.map((d, i) => (
            <div key={d}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  fontSize: 11.5, fontWeight: d === dominant ? 700 : 500,
                  color: d === dominant ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.45)',
                }}>
                  {DIMENSION_LABELS[d]}
                </span>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', fontVariantNumeric: 'tabular-nums' }}>
                  {normalizedValues[i]}%
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${normalizedValues[i]}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: d === dominant
                      ? 'linear-gradient(90deg, #8B8FFF, rgba(139,143,255,0.55))'
                      : 'rgba(255,255,255,0.18)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
