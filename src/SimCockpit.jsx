import { motion, AnimatePresence } from 'framer-motion'
import { useArcadeStore } from './arcadeStore'

/* ─── Chaos Event Banner ─── */
export function ChaosEventBanner() {
  const { chaosEvent } = useArcadeStore()
  return (
    <AnimatePresence>
      {chaosEvent && (
        <motion.div
          key={chaosEvent.label}
          initial={{ opacity: 0, scaleX: 0.6, y: -10 }}
          animate={{ opacity: 1, scaleX: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
            zIndex: 999,
            padding: '10px 24px',
            borderRadius: 99,
            background: `${chaosEvent.color}22`,
            border: `1.5px solid ${chaosEvent.color}80`,
            color: chaosEvent.color,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: `0 0 30px ${chaosEvent.color}40`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Glitch animation layers */}
          <motion.span
            animate={{ x: [0, -2, 2, 0, -1, 1, 0], opacity: [1, 0.8, 1] }}
            transition={{ duration: 0.18, repeat: 6, repeatType: 'mirror' }}
            style={{ display: 'inline-block' }}
          >
            {chaosEvent.label}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Startup Vitals HUD ─── */
function StartupVitals() {
  const { vitals, activeMission } = useArcadeStore()
  const color = activeMission?.color || '#10B981'

  const fmt = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
    return `$${n}`
  }

  const items = [
    { label: 'CASH FLOW', value: fmt(vitals.cashFlow || 0), warn: (vitals.cashFlow || 0) < 20000 },
    { label: 'BURN RATE', value: fmt(vitals.burnRate || 0) + '/day', warn: false },
    { label: 'VALUATION', value: fmt(vitals.valuation || 0), warn: false },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 8, padding: '8px 16px',
        borderBottom: `1px solid ${color}25`,
        background: `${color}08`,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      {items.map(item => (
        <div key={item.label} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 12px', borderRadius: 8,
          background: item.warn ? 'rgba(239,68,68,0.12)' : `${color}12`,
          border: `1px solid ${item.warn ? 'rgba(239,68,68,0.35)' : `${color}25`}`,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: item.warn ? '#EF4444' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
            {item.label}
          </span>
          <motion.span
            animate={item.warn ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ fontSize: 13, fontWeight: 700, color: item.warn ? '#EF4444' : color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}
          >
            {item.value}
          </motion.span>
        </div>
      ))}
    </motion.div>
  )
}

/* ─── Space Colony Vitals HUD ─── */
function SpaceVitals() {
  const { vitals, activeMission } = useArcadeStore()
  const color = activeMission?.color || '#6366F1'

  const bars = [
    { label: 'O₂', value: vitals.oxygen || 0, warn: (vitals.oxygen || 0) < 30, color: '#6366F1' },
    { label: 'HULL', value: vitals.hullIntegrity || 0, warn: (vitals.hullIntegrity || 0) < 40, color: '#10B981' },
    { label: 'MORALE', value: vitals.morale || 0, warn: (vitals.morale || 0) < 30, color: '#F59E0B' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 10, padding: '10px 16px',
        borderBottom: `1px solid ${color}25`,
        background: `${color}06`,
        alignItems: 'center', flexShrink: 0,
      }}
    >
      {bars.map(bar => (
        <div key={bar.label} style={{ flex: 1, minWidth: 60 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              {bar.label}
            </span>
            <motion.span
              animate={bar.warn ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{ fontSize: 9, fontWeight: 700, color: bar.warn ? '#EF4444' : bar.color, fontFamily: 'monospace' }}
            >
              {bar.value}%
            </motion.span>
          </div>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              animate={{ width: `${bar.value}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 99,
                background: bar.warn
                  ? 'linear-gradient(90deg, #EF4444, #F87171)'
                  : `linear-gradient(90deg, ${bar.color}, ${bar.color}90)`,
              }}
            />
          </div>
        </div>
      ))}
    </motion.div>
  )
}

/* ─── Debate Logic Feed (right panel) ─── */
export function DebateLogicFeed() {
  const { debateState, dismissFallacy, activeMission } = useArcadeStore()
  const color = activeMission?.color || '#EF4444'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        width: 200,
        flexShrink: 0,
        padding: '16px 14px',
        background: `${color}08`,
        borderLeft: `1px solid ${color}20`,
        display: 'flex', flexDirection: 'column', gap: 16,
        overflowY: 'auto',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase' }}>
        Live Logic Feed
      </div>

      {/* Logic Meter */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Logic Meter</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: color, fontFamily: 'monospace' }}>
            {debateState.logicMeter}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            animate={{ width: `${debateState.logicMeter}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 99,
              background: debateState.logicMeter > 60
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : debateState.logicMeter > 30
                  ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                  : 'linear-gradient(90deg, #EF4444, #F87171)',
            }}
          />
        </div>
      </div>

      {/* Confidence Score */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Confidence</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', fontFamily: 'monospace' }}>
            {debateState.confidence}%
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            animate={{ width: `${debateState.confidence}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, #F59E0B, #FCD34D)',
            }}
          />
        </div>
      </div>

      {/* Fallacy Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
          Fallacy Alerts
        </div>
        <AnimatePresence>
          {debateState.fallacyAlerts.length === 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>None detected</div>
          )}
          {debateState.fallacyAlerts.map((alert, i) => (
            <motion.div
              key={`${alert}-${i}`}
              initial={{ opacity: 0, scale: 0.85, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                padding: '6px 10px', borderRadius: 8,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 10.5, color: '#FCA5A5', fontWeight: 600, lineHeight: 1.3 }}>
                ⚠️ {alert}
              </span>
              <button
                onClick={() => dismissFallacy(i)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ─── Mission HUD Vitals bar (auto-selects by type) ─── */
export function MissionVitalsBar() {
  const { activeMode } = useArcadeStore()
  if (activeMode === 'startup') return <StartupVitals />
  if (activeMode === 'space') return <SpaceVitals />
  return null
}

/* ─── Mission theme configs ─── */
const BUBBLE_THEMES = {
  debate: {
    ai: {
      background: 'rgba(22, 18, 6, 0.82)',
      border: '1px solid rgba(233,163,100,0.30)',
      color: 'rgba(255,238,175,0.95)',
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: 16,
      lineHeight: 1.80,
      letterSpacing: '0.012em',
    },
    user: {
      background: 'rgba(239,68,68,0.16)',
      border: '1px solid rgba(239,68,68,0.32)',
      color: 'rgba(255,205,205,0.95)',
      fontSize: 15,
      lineHeight: 1.65,
    },
  },
  startup: {
    ai: {
      background: 'rgba(4, 16, 8, 0.88)',
      border: '1px solid rgba(16,185,129,0.32)',
      color: '#4ADE80',
      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: 13.5,
      lineHeight: 1.72,
    },
    user: {
      background: 'rgba(16,185,129,0.10)',
      border: '1px solid rgba(16,185,129,0.28)',
      color: 'rgba(167,243,208,0.95)',
      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: 13.5,
      lineHeight: 1.65,
    },
  },
  space: {
    ai: {
      background: 'rgba(8, 10, 30, 0.82)',
      border: '1px solid rgba(99,102,241,0.32)',
      color: 'rgba(196,202,255,0.95)',
      fontSize: 15,
      lineHeight: 1.72,
    },
    user: {
      background: 'rgba(99,102,241,0.12)',
      border: '1px solid rgba(99,102,241,0.28)',
      color: 'rgba(224,226,255,0.92)',
      fontSize: 15,
      lineHeight: 1.65,
    },
  },
  detective: {
    ai: {
      background: 'rgba(14, 12, 9, 0.85)',
      border: '1px solid rgba(120,113,108,0.32)',
      color: 'rgba(225,215,200,0.95)',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14,
      lineHeight: 1.75,
    },
    user: {
      background: 'rgba(120,113,108,0.12)',
      border: '1px solid rgba(120,113,108,0.28)',
      color: 'rgba(200,195,185,0.92)',
      fontSize: 14,
      lineHeight: 1.65,
    },
  },
}

/* ─── Render text as spaced paragraphs ─── */
function BubbleText({ text, streaming, cursorColor }) {
  // Split on double newlines → paragraphs; single newlines stay inline
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim())

  if (paragraphs.length <= 1) {
    // Single block — inline cursor at end
    return (
      <span style={{ whiteSpace: 'pre-wrap' }}>
        {text}
        {streaming && <Cursor color={cursorColor} />}
      </span>
    )
  }

  return (
    <>
      {paragraphs.map((para, i) => {
        const isLast = i === paragraphs.length - 1
        return (
          <p key={i} style={{ margin: 0, marginBottom: isLast ? 0 : '0.85em', whiteSpace: 'pre-wrap' }}>
            {para}
            {isLast && streaming && <Cursor color={cursorColor} />}
          </p>
        )
      })}
    </>
  )
}

function Cursor({ color }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      style={{ display: 'inline-block', width: 2, height: '0.9em', background: color || 'rgba(255,255,255,0.6)', borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }}
    />
  )
}

/* ─── Themed chat bubble for missions ─── */
export function ThemedChatBubble({ msg, mission }) {
  const { interruptActive } = useArcadeStore()
  const isUser = msg.role === 'user'
  if (!mission) return null

  const theme = BUBBLE_THEMES[mission.id] || { ai: {}, user: {} }
  const bubbleStyle = isUser ? theme.user : theme.ai

  // The last AI bubble gets the glitch class when an interrupt fires
  const isLatestAI = !isUser
  const glitchClass = isLatestAI && interruptActive ? 'interrupt-glitch' : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}
    >
      <div
        className={glitchClass}
        style={{
          maxWidth: '82%',
          padding: isUser ? '11px 17px' : '16px 20px',
          borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 15,
          lineHeight: 1.70,
          fontFamily: "'Inter', system-ui, sans-serif",
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          ...bubbleStyle,
        }}
      >
        <BubbleText text={msg.text} streaming={!!msg.streaming} cursorColor={mission.color} />
      </div>
    </motion.div>
  )
}

/* ─── Mission mode badge ─── */
export function MissionBadge({ mission }) {
  if (!mission) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 99,
        background: mission.colorDim,
        border: `1px solid ${mission.border}`,
      }}
    >
      <span style={{ fontSize: 13 }}>{mission.emoji}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: mission.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {mission.title}
      </span>
    </motion.div>
  )
}
