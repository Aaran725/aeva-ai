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
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 440, damping: 22 }}
          style={{
            position: 'fixed', top: 66, left: '50%', transform: 'translateX(-50%)',
            zIndex: 999, padding: '10px 26px', borderRadius: 99,
            background: `${chaosEvent.color}1A`,
            border: `1.5px solid ${chaosEvent.color}80`,
            color: chaosEvent.color,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12.5, fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            boxShadow: `0 0 40px ${chaosEvent.color}50, 0 0 80px ${chaosEvent.color}20`,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            whiteSpace: 'nowrap',
          }}
        >
          <motion.span
            animate={{ x: [0, -2, 2, -1, 1, 0], opacity: [1, 0.75, 1] }}
            transition={{ duration: 0.16, repeat: 5, repeatType: 'mirror' }}
            style={{ display: 'inline-block' }}
          >
            {chaosEvent.label}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Pro-Tip Banner ─── */
export function ProTipBanner() {
  const { proTip } = useArcadeStore()
  return (
    <AnimatePresence>
      {proTip && (
        <motion.div
          key={proTip}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          style={{
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            zIndex: 998, padding: '10px 20px', borderRadius: 12,
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.40)',
            color: '#FCD34D',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12.5, fontWeight: 600,
            maxWidth: 400, textAlign: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 0 30px rgba(245,158,11,0.20)',
          }}
        >
          💡 {proTip}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Startup Vitals HUD ─── */
function StartupVitals() {
  const { vitals, activeMission, missionExchanges } = useArcadeStore()
  const color = activeMission?.color || '#10B981'
  const cash = vitals.cashFlow || 0
  const days = vitals.runwayDays ?? Math.floor(cash / 12000)
  const conf = vitals.investorConfidence ?? 67
  const confCritical = conf < 35

  const fmt = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
    if (n >= 1000)    return `$${(n / 1000).toFixed(0)}K`
    return `$${n}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', gap: 6, padding: '8px 14px', flexShrink: 0,
        borderBottom: `1px solid ${color}22`, background: `${color}07`, flexWrap: 'wrap', alignItems: 'center' }}
    >
      {/* Cash */}
      <Ticker label="CASH" value={fmt(cash)} warn={cash < 20000} color={color} />
      {/* Runway */}
      <Ticker label="RUNWAY" value={`${days}d`} warn={days <= 2} color={color} blink={days <= 1} />
      {/* Burn */}
      <Ticker label="BURN/DAY" value={fmt(vitals.burnRate || 12000)} warn={false} color={color} />
      {/* Valuation */}
      <Ticker label="VALUATION" value={fmt(vitals.valuation || 0)} warn={false} color={color} />
      {/* Exchange counter */}
      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', marginLeft: 'auto', letterSpacing: '0.08em' }}>
        EXCHANGE {missionExchanges}/12
      </span>
      {/* Investor Confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 8,
        background: confCritical ? 'rgba(239,68,68,0.12)' : `${color}10`,
        border: `1px solid ${confCritical ? 'rgba(239,68,68,0.35)' : `${color}22`}` }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>INVESTOR CONFIDENCE</span>
        <div style={{ width: 64, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            animate={{ width: `${conf}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99,
              background: conf > 60 ? `linear-gradient(90deg, ${color}, ${color}90)` : conf > 30 ? 'linear-gradient(90deg, #F59E0B, #FCD34D)' : 'linear-gradient(90deg, #EF4444, #F87171)' }}
          />
        </div>
        <motion.span
          animate={confCritical ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 0.75, repeat: Infinity }}
          style={{ fontSize: 11, fontWeight: 800, color: confCritical ? '#EF4444' : color, fontFamily: 'monospace' }}
        >{conf}</motion.span>
      </div>
    </motion.div>
  )
}

/* ─── Space Colony Vitals HUD ─── */
function SpaceVitals() {
  const { vitals, missionExchanges } = useArcadeStore()
  const bars = [
    { label: 'O₂', value: vitals.oxygen ?? 94, warn: (vitals.oxygen ?? 94) < 35, color: '#6366F1' },
    { label: 'HULL', value: vitals.hullIntegrity ?? 87, warn: (vitals.hullIntegrity ?? 87) < 45, color: '#10B981' },
    { label: 'MORALE', value: vitals.morale ?? 71, warn: (vitals.morale ?? 71) < 35, color: '#F59E0B' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', gap: 10, padding: '10px 16px', flexShrink: 0,
        borderBottom: '1px solid rgba(99,102,241,0.20)', background: 'rgba(99,102,241,0.05)', alignItems: 'center' }}
    >
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', marginRight: 4 }}>SOL 342</span>
      {bars.map(bar => (
        <div key={bar.label} style={{ flex: 1, minWidth: 70 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{bar.label}</span>
            <motion.span
              animate={bar.warn ? { opacity: [1, 0.25, 1] } : {}}
              transition={{ duration: 0.65, repeat: Infinity }}
              style={{ fontSize: 9, fontWeight: 800, color: bar.warn ? '#EF4444' : bar.color, fontFamily: 'monospace' }}
            >{bar.value}%</motion.span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
              animate={{ width: `${bar.value}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 99,
                background: bar.warn ? 'linear-gradient(90deg, #EF4444, #F87171)' : `linear-gradient(90deg, ${bar.color}, ${bar.color}80)` }}
            />
          </div>
        </div>
      ))}
      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', marginLeft: 'auto', letterSpacing: '0.08em' }}>
        EXCHANGE {missionExchanges}/12
      </span>
    </motion.div>
  )
}

/* ─── Ticker chip (reusable) ─── */
function Ticker({ label, value, warn, color, blink }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 11px', borderRadius: 8,
      background: warn ? 'rgba(239,68,68,0.10)' : `${color}10`,
      border: `1px solid ${warn ? 'rgba(239,68,68,0.30)' : `${color}22`}` }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.11em', color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace' }}>{label}</span>
      <motion.span
        animate={(warn && blink) ? { opacity: [1, 0.2, 1] } : {}}
        transition={{ duration: 0.6, repeat: Infinity }}
        style={{ fontSize: 12.5, fontWeight: 800, color: warn ? '#EF4444' : color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}
      >{value}</motion.span>
    </div>
  )
}

/* ─── Debate Logic Feed ─── */
export function DebateLogicFeed() {
  const { debateState, dismissFallacy, activeMission } = useArcadeStore()
  const color = activeMission?.color || '#EF4444'
  const lm = debateState.logicMeter
  const logicColor = lm > 60 ? '#10B981' : lm > 30 ? '#F59E0B' : '#EF4444'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      style={{ width: 188, flexShrink: 0, padding: '16px 13px', background: `${color}07`,
        borderLeft: `1px solid ${color}18`, display: 'flex', flexDirection: 'column', gap: 18,
        overflowY: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>Live Logic Feed</div>

      {/* Logic meter */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>Logic</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: logicColor, fontFamily: 'monospace' }}>{lm}</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
          <motion.div animate={{ width: `${lm}%` }} transition={{ duration: 0.65 }}
            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${logicColor}, ${logicColor}90)` }} />
        </div>
        {lm < 30 && (
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ fontSize: 9, color: '#EF4444', marginTop: 5, fontWeight: 700, letterSpacing: '0.06em' }}>
            ⚠ EINSTEIN LOSING PATIENCE
          </motion.div>
        )}
      </div>

      {/* Confidence */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>Confidence</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', fontFamily: 'monospace' }}>{debateState.confidence}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
          <motion.div animate={{ width: `${debateState.confidence}%` }} transition={{ duration: 0.65 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #F59E0B, #FCD34D)' }} />
        </div>
      </div>

      {/* Fallacies */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>Fallacies Caught</div>
        <AnimatePresence>
          {debateState.fallacyAlerts.length === 0 && (
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic' }}>None yet</div>
          )}
          {debateState.fallacyAlerts.map((alert, i) => (
            <motion.div key={`${alert}-${i}`}
              initial={{ opacity: 0, x: 10, scale: 0.88 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ padding: '6px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.28)', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', gap: 5 }}
            >
              <span style={{ fontSize: 10, color: '#FCA5A5', fontWeight: 600, lineHeight: 1.35 }}>⚠ {alert}</span>
              <button onClick={() => dismissFallacy(i)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ─── Detective Case Panel ─── */
export function DetectivePanel() {
  const { vitals, clues, activeMission } = useArcadeStore()
  const color = activeMission?.color || '#D97706'
  const timeLeft = vitals.timeLeft ?? 72
  const timeCritical = timeLeft < 24
  const evidence = vitals.evidence ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      style={{ width: 188, flexShrink: 0, padding: '16px 13px', background: `${color}07`,
        borderLeft: `1px solid ${color}18`, display: 'flex', flexDirection: 'column', gap: 16,
        overflowY: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>Case File</div>

      {/* Time left */}
      <div style={{ padding: '10px 12px', borderRadius: 10,
        background: timeCritical ? 'rgba(239,68,68,0.10)' : `${color}10`,
        border: `1px solid ${timeCritical ? 'rgba(239,68,68,0.30)' : `${color}22`}` }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', marginBottom: 4 }}>DA DEADLINE</div>
        <motion.div
          animate={timeCritical ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ fontSize: 22, fontWeight: 800, color: timeCritical ? '#EF4444' : color, fontFamily: 'monospace', letterSpacing: '-0.03em' }}
        >{timeLeft}h</motion.div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>remaining</div>
      </div>

      {/* Evidence count */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>Evidence</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: color, fontFamily: 'monospace' }}>{evidence}/20</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <motion.div animate={{ width: `${(evidence / 20) * 100}%` }} transition={{ duration: 0.7 }}
            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
        </div>
      </div>

      {/* Suspects */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 8 }}>Suspects</div>
        {['Leo Garza', 'Diana Webb', 'Priya Nair', 'Tommy Rourke'].map((name) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{name}</span>
          </div>
        ))}
      </div>

      {/* Clue log */}
      {clues.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 8 }}>Clues Found</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <AnimatePresence>
              {clues.slice(-5).reverse().map((clue, i) => (
                <motion.div key={`${clue}-${i}`}
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', lineHeight: 1.4,
                    padding: '5px 8px', borderRadius: 7,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  🔍 {clue}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Mission HUD Vitals bar (auto-selects by type) ─── */
export function MissionVitalsBar() {
  const { activeMode } = useArcadeStore()
  if (activeMode === 'startup')  return <StartupVitals />
  if (activeMode === 'space')    return <SpaceVitals />
  return null
}

/* ─── Mission Side Panel (right column) ─── */
export function MissionSidePanel() {
  const { activeMode } = useArcadeStore()
  if (activeMode === 'debate')    return <DebateLogicFeed />
  if (activeMode === 'detective') return <DetectivePanel />
  return null
}

/* ─── Mission theme configs ─── */
const BUBBLE_THEMES = {
  debate: {
    ai: {
      background: 'rgba(20, 14, 5, 0.88)',
      border: '1px solid rgba(233,163,100,0.28)',
      color: 'rgba(255,238,175,0.95)',
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: 16, lineHeight: 1.82, letterSpacing: '0.013em',
    },
    user: {
      background: 'rgba(239,68,68,0.14)',
      border: '1px solid rgba(239,68,68,0.28)',
      color: 'rgba(255,205,205,0.95)',
      fontSize: 15, lineHeight: 1.65,
    },
  },
  startup: {
    ai: {
      background: 'rgba(2, 14, 6, 0.92)',
      border: '1px solid rgba(16,185,129,0.28)',
      color: '#4ADE80',
      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: 13.5, lineHeight: 1.75,
    },
    user: {
      background: 'rgba(16,185,129,0.09)',
      border: '1px solid rgba(16,185,129,0.24)',
      color: 'rgba(167,243,208,0.95)',
      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: 13.5, lineHeight: 1.65,
    },
  },
  space: {
    ai: {
      background: 'rgba(6, 8, 28, 0.88)',
      border: '1px solid rgba(99,102,241,0.28)',
      color: 'rgba(196,202,255,0.95)',
      fontSize: 15, lineHeight: 1.76,
    },
    user: {
      background: 'rgba(99,102,241,0.10)',
      border: '1px solid rgba(99,102,241,0.24)',
      color: 'rgba(224,226,255,0.92)',
      fontSize: 15, lineHeight: 1.65,
    },
  },
  detective: {
    ai: {
      background: 'rgba(12, 9, 4, 0.92)',
      border: '1px solid rgba(217,119,6,0.28)',
      color: 'rgba(235,218,190,0.95)',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14, lineHeight: 1.80,
    },
    user: {
      background: 'rgba(217,119,6,0.09)',
      border: '1px solid rgba(217,119,6,0.24)',
      color: 'rgba(210,195,170,0.92)',
      fontSize: 14, lineHeight: 1.65,
    },
  },
}

/* ─── Paragraph-split bubble text ─── */
function BubbleText({ text, streaming, cursorColor }) {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim())
  if (paragraphs.length <= 1) {
    return (
      <span style={{ whiteSpace: 'pre-wrap' }}>
        {text}{streaming && <Cursor color={cursorColor} />}
      </span>
    )
  }
  return (
    <>
      {paragraphs.map((para, i) => {
        const isLast = i === paragraphs.length - 1
        return (
          <p key={i} style={{ margin: 0, marginBottom: isLast ? 0 : '0.88em', whiteSpace: 'pre-wrap' }}>
            {para}{isLast && streaming && <Cursor color={cursorColor} />}
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
      transition={{ duration: 0.85, repeat: Infinity }}
      style={{ display: 'inline-block', width: 2, height: '0.9em',
        background: color || 'rgba(255,255,255,0.55)', borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }}
    />
  )
}

/* ─── Themed chat bubble ─── */
export function ThemedChatBubble({ msg, mission }) {
  const { interruptActive } = useArcadeStore()
  const isUser = msg.role === 'user'
  if (!mission) return null
  const theme = BUBBLE_THEMES[mission.id] || { ai: {}, user: {} }
  const bubbleStyle = isUser ? theme.user : theme.ai
  const glitchClass = !isUser && interruptActive ? 'interrupt-glitch' : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}
    >
      <div className={glitchClass} style={{
        maxWidth: '82%', padding: isUser ? '11px 17px' : '16px 20px',
        borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.70,
        fontFamily: "'Inter', system-ui, sans-serif",
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        ...bubbleStyle,
      }}>
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
      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 99,
        background: mission.colorDim, border: `1px solid ${mission.border}` }}
    >
      <span style={{ fontSize: 13 }}>{mission.emoji}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: mission.color,
        letterSpacing: '0.08em', textTransform: 'uppercase' }}>{mission.title}</span>
    </motion.div>
  )
}
