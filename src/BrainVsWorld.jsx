import { motion } from 'framer-motion'
import { useNeuralStore } from './neuralStore'

const GLOBAL_RATES = {
  // Math
  'calculus': 58, 'integration': 66, 'derivatives': 48, 'probability': 54, 'statistics': 51,
  'algebra': 34, 'geometry': 38, 'trigonometry': 52, 'limits': 61, 'vectors': 44,
  // Programming
  'recursion': 67, 'pointers': 72, 'async': 64, 'closures': 59, 'algorithms': 55,
  'data structures': 61, 'regex': 68, 'oop': 47, 'debugging': 39, 'functions': 28,
  // Science
  'quantum mechanics': 78, 'thermodynamics': 63, 'electromagnetism': 69, 'optics': 55,
  'organic chemistry': 71, 'stoichiometry': 65, 'genetics': 48, 'evolution': 32,
}
const DEFAULT_GLOBAL = 42

function getGlobalRate(topic) {
  const key = topic.toLowerCase().trim()
  return GLOBAL_RATES[key] ?? DEFAULT_GLOBAL
}

function ComparisonBar({ topic, userRate, globalRate, index }) {
  const delta = userRate - globalRate
  const tag = delta > 15
    ? `Unusual — only ${globalRate}% of learners find this hard`
    : delta < -15
      ? 'You\'re actually above average here'
      : `Common — ${globalRate}% of learners share this`
  const tagColor = delta > 15 ? '#EF4444' : delta < -15 ? '#10B981' : 'rgba(255,255,255,0.38)'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      style={{ marginBottom: 18 }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.80)',
          textTransform: 'capitalize',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {topic}
        </span>
        <span style={{ fontSize: 10.5, color: tagColor, fontWeight: 600 }}>
          {tag}
        </span>
      </div>

      {/* User bar */}
      <div style={{ marginBottom: 5 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}>
          <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700, letterSpacing: '0.06em' }}>YOU</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{userRate}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${userRate}%` }}
            transition={{ duration: 0.9, delay: 0.1 + index * 0.08, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: '#F59E0B' }}
          />
        </div>
      </div>

      {/* World bar */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em' }}>GLOBAL</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{globalRate}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${globalRate}%` }}
            transition={{ duration: 0.9, delay: 0.2 + index * 0.08, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.22)' }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export default function BrainVsWorld() {
  const { struggleZones, masteredTopics } = useNeuralStore()

  // Build comparison data
  const comparisons = struggleZones.slice(0, 4).map(topic => {
    const globalRate = getGlobalRate(topic)
    const userRate = 80  // struggle zone means ~80% difficulty for user
    return { topic, userRate, globalRate, delta: userRate - globalRate }
  })

  // Find the most unusual struggle (highest delta)
  const mostUnusual = comparisons.reduce(
    (best, c) => c.delta > (best?.delta ?? -Infinity) ? c : best,
    null
  )

  // Find a strength spotlight: mastered topic that many find hard
  const strengthSpotlight = masteredTopics.find(t => getGlobalRate(t) > 55)

  if (struggleZones.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '24px 22px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>
          Brain vs. The World
        </span>
        <div style={{ marginTop: 16, fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
          No struggle patterns detected yet. Keep chatting with Aeva.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      padding: '24px 22px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>
          Brain vs. The World
        </span>
        <h3 style={{ margin: '5px 0 0', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>
          Your Struggle Pattern
        </h3>
      </div>

      {/* Comparison bars */}
      <div style={{ marginBottom: mostUnusual || strengthSpotlight ? 20 : 0 }}>
        {comparisons.map((c, i) => (
          <ComparisonBar
            key={c.topic}
            topic={c.topic}
            userRate={c.userRate}
            globalRate={c.globalRate}
            index={i}
          />
        ))}
      </div>

      {/* Unusual pattern insight */}
      {mostUnusual && mostUnusual.delta > 15 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: strengthSpotlight ? 12 : 0,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Unusual Pattern
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
            Most people get <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'capitalize' }}>{mostUnusual.topic}</span> easily.
            The fact that you're stuck suggests you may benefit from a different framing — try building the conceptual foundation before the mechanics.
          </div>
        </motion.div>
      )}

      {/* Strength spotlight */}
      {strengthSpotlight && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#10B981', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Strength Spotlight
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
            You've mastered <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'capitalize' }}>{strengthSpotlight}</span> —
            something {getGlobalRate(strengthSpotlight)}% of learners find hard. That's a real edge.
          </div>
        </motion.div>
      )}
    </div>
  )
}
