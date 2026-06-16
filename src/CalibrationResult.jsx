/**
 * CalibrationResult.jsx
 * Phase 4 & 5: Full-screen result overlay with AI insights + history timeline.
 * Replaces the old inline chat card.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, ChevronRight, Layers } from 'lucide-react'
import { SUBJECT_LABELS, SUBJECT_ICONS, CALIBRATION_MAP, NODE_CLUSTERS, CLUSTER_LABELS } from './calibrationMap'

// ── Lower-bound threshold for each band (mirrors calibBand thresholds in App.jsx) ──
// Used to compute position-within-band for the sub-level indicator.
const BAND_LOWER = {
  'AP · Year 2':  8.5,
  'AP · Year 1':  7.5,
  'Grade 11+':    6.5,
  'Grade 11':     5.5,
  'Grade 10+':    4.5,
  'Grade 10':     3.5,
  'Grade 9+':     2.5,
  'Grade 9':      1.5,
  'Grade 8':      0.5,
  'Grade 7':     -0.5,
  'Grade 6':     -1.5,
  'Grade 5':     -2.5,
  'Grade 4':     -3.5,
  'Grade 3':     -4.5,
  'Grade 2':     -5.5,
  'Grade 1':     -6.5,
}

// ── Band ordering for progress comparisons ────────────────────────────────────
const BAND_ORDER = {
  'Grade 1': 0, 'Grade 2': 1, 'Grade 3': 2, 'Grade 4': 3,
  'Grade 5': 4, 'Grade 6': 5, 'Grade 7': 6, 'Grade 8': 7,
  'Grade 9': 8, 'Grade 9+': 9, 'Grade 10': 10, 'Grade 10+': 11,
  'Grade 11': 12, 'Grade 11+': 13, 'AP · Year 1': 14, 'AP · Year 2': 15,
}
const BAND_COLORS = {
  'Grade 1':      '#F87171', 'Grade 2':      '#F87171',
  'Grade 3':      '#FB923C', 'Grade 4':      '#FB923C',
  'Grade 5':      '#FBBF24', 'Grade 6':      '#60D0A0',
  'Grade 7':      '#4ADE80', 'Grade 8':      '#34D399',
  'Grade 9':      '#A78BFA', 'Grade 9+':     '#9B75F5',
  'Grade 10':     '#8B5CF6', 'Grade 10+':    '#7C52E8',
  'Grade 11':     '#6366F1', 'Grade 11+':    '#5558D9',
  'AP · Year 1':  '#E9A364', 'AP · Year 2':  '#F59E0B',
}

// ── Sub-band indicator ────────────────────────────────────────────────────────
function SubBandIndicator({ band, bandAvg, bandColor, isLight }) {
  if (bandAvg == null) return null
  const lower = BAND_LOWER[band] ?? -6.5
  const pos = Math.max(0, Math.min(1, bandAvg - lower))
  const pct = Math.round(pos * 100)
  const subLabel = pos < 0.35 ? 'Developing' : pos < 0.70 ? 'Solid' : 'Strong'
  const subDesc  = pos < 0.35
    ? 'You\'re building this level'
    : pos < 0.70
    ? 'You\'re comfortably here'
    : 'Ready to move up'
  const trackBg = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'
  const mutedCol = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ marginTop: 18 }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: bandColor,
            background: `${bandColor}18`,
            border: `1px solid ${bandColor}38`,
            padding: '3px 9px', borderRadius: 99,
          }}>
            {subLabel}
          </span>
          <span style={{ fontSize: 11.5, color: mutedCol }}>{subDesc}</span>
        </div>
        <span style={{ fontSize: 11, color: mutedCol, fontWeight: 600 }}>{pct}%</span>
      </div>
      {/* Bar */}
      <div style={{ height: 6, borderRadius: 99, background: trackBg, overflow: 'hidden', position: 'relative' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.25, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%', borderRadius: 99,
            background: `linear-gradient(90deg, ${bandColor}99, ${bandColor})`,
            boxShadow: `0 0 10px ${bandColor}66`,
          }}
        />
        {/* Next-level marker at 100% */}
        <div style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          width: 2, height: 10, borderRadius: 1,
          background: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: mutedCol }}>Start of {band}</span>
        <span style={{ fontSize: 10, color: mutedCol }}>Next level →</span>
      </div>
    </div>
  )
}

// ── Topic breakdown ───────────────────────────────────────────────────────────
const TOPIC_STATUS = {
  strong:     { icon: '✓', color: '#4ADE80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.22)',  label: 'Strong'     },
  developing: { icon: '△', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.22)',  label: 'Developing' },
  weak:       { icon: '✗', color: '#F87171', bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.22)', label: 'Weak'       },
  untested:   { icon: '—', color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', label: 'Not tested' },
}

function TopicBreakdown({ subject, skillMap, isLight }) {
  const clusterMap  = NODE_CLUSTERS[subject]
  const labelMap    = CLUSTER_LABELS[subject]
  if (!clusterMap || !labelMap) return null

  // Unique cluster keys in definition order
  const clusterKeys = [...new Set(Object.values(clusterMap))]

  const clusters = clusterKeys.map(key => {
    const nodeIds  = Object.entries(clusterMap).filter(([, c]) => c === key).map(([id]) => id)
    const assessed = nodeIds.filter(id => skillMap[id])
    if (!assessed.length) return { key, status: 'untested', pct: 0, assessed: 0, total: nodeIds.length }

    const scoreOf = s => s === 'mastery' ? 3 : s === 'solid' ? 2 : s === 'shaky' ? 1 : 0
    const total   = assessed.length
    const avg     = assessed.reduce((acc, id) => acc + scoreOf(skillMap[id]), 0) / total
    const pct     = Math.round((avg / 3) * 100)
    const status  = avg >= 2.0 ? 'strong' : avg >= 1.0 ? 'developing' : 'weak'
    return { key, status, pct, assessed: total, total: nodeIds.length }
  })

  const mutedCol = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.35)'
  const testedCount = clusters.filter(c => c.status !== 'untested').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: mutedCol, textTransform: 'uppercase' }}>
          Topic Breakdown
        </div>
        <span style={{ fontSize: 10.5, color: mutedCol }}>
          {testedCount}/{clusters.length} topics covered
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clusters.map(({ key, status, pct, assessed, total }) => {
          const cfg  = TOPIC_STATUS[status]
          const name = labelMap[key] || key
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color, width: 14, textAlign: 'center', flexShrink: 0 }}>
                {cfg.icon}
              </span>

              {/* Name + status label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{name}</span>
                  <span style={{ fontSize: 10.5, color: cfg.color, opacity: 0.7 }}>{cfg.label}</span>
                </div>
                {status !== 'untested' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    {/* Mini bar */}
                    <div style={{ flex: 1, height: 3, borderRadius: 99, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', borderRadius: 99, background: cfg.color }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: mutedCol, flexShrink: 0 }}>{assessed}/{total} nodes</span>
                  </div>
                )}
                {status === 'untested' && (
                  <div style={{ fontSize: 10.5, color: mutedCol, marginTop: 2 }}>
                    Not reached in this diagnostic
                  </div>
                )}
              </div>

              {/* Score pct */}
              {status !== 'untested' && (
                <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                  {pct}%
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Status config for skill breakdown ─────────────────────────────────────────
const STATUS = {
  mastery: { dot: '#C084FC', label: 'Mastery',  chip: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.28)' },
  solid:   { dot: '#4ADE80', label: 'Solid',    chip: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.26)'  },
  shaky:   { dot: '#FBBF24', label: 'Shaky',    chip: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.26)'  },
  gap:     { dot: '#F87171', label: 'Gap',       chip: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.26)' },
}

// ── Skill breakdown section ───────────────────────────────────────────────────
function SkillBreakdown({ skillMap, subjectMap, isLight }) {
  const groups = ['mastery', 'solid', 'shaky', 'gap']
    .map(s => ({ status: s, skills: Object.entries(skillMap || {}).filter(([, v]) => v === s) }))
    .filter(g => g.skills.length > 0)

  const text   = isLight ? '#0f1117'            : 'rgba(255,255,255,0.88)'
  const label  = isLight ? 'rgba(0,0,0,0.42)'  : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: label, textTransform: 'uppercase' }}>
        Skill Breakdown
      </div>
      {groups.map(({ status, skills }) => {
        const cfg = STATUS[status]
        return (
          <div key={status}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0, boxShadow: `0 0 6px ${cfg.dot}88` }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.dot, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {cfg.label}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(([id]) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  style={{
                    padding: '5px 13px', borderRadius: 99,
                    background: cfg.chip, border: `1px solid ${cfg.border}`,
                    fontSize: 12, fontWeight: 600, color: cfg.dot,
                  }}
                >
                  {subjectMap[id]?.label || id}
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── AI Insights section ───────────────────────────────────────────────────────
function InsightsPanel({ insights, isLight }) {
  const cardBg  = isLight ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.10)'
  const border  = isLight ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.22)'
  const label   = isLight ? 'rgba(0,0,0,0.4)'      : 'rgba(255,255,255,0.35)'
  const textCol = isLight ? '#0f1117'               : 'rgba(255,255,255,0.82)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: label, textTransform: 'uppercase' }}>
        Aeva's Insights
      </div>

      {!insights && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 12, background: cardBg, border: `1px solid ${border}` }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.3, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12.5, color: label }}>Generating insights…</span>
        </div>
      )}

      {insights && insights.length === 0 && (
        <div style={{ fontSize: 12.5, color: label, fontStyle: 'italic' }}>
          Complete the diagnostic to see personalised insights.
        </div>
      )}

      {insights && insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.22 }}
          style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '13px 16px', borderRadius: 12,
            background: cardBg, border: `1px solid ${border}`,
          }}
        >
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 0.5 }}>
            {i === 0 ? '🔗' : i === 1 ? '🎯' : '→'}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: textCol }}>{insight}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Recommendation cards (Phase B) ───────────────────────────────────────────
const REC_STATUS = {
  gap:  { icon: '✗', label: 'Gap',         color: '#F87171' },
  shaky:{ icon: '△', label: 'Shaky',       color: '#FBBF24' },
  next: { icon: '→', label: 'Next step',   color: '#4ADE80' },
}

function RecommendationCards({ recommendations, subjectMap, bandColor, isLight, onStartTopic, subject }) {
  if (!recommendations?.length) return null
  const cardBg    = isLight ? '#ffffff'               : '#161826'
  const borderCol = isLight ? 'rgba(0,0,0,0.08)'     : 'rgba(255,255,255,0.07)'
  const textCol   = isLight ? '#0f1117'               : 'rgba(255,255,255,0.88)'
  const mutedCol  = isLight ? 'rgba(0,0,0,0.38)'     : 'rgba(255,255,255,0.35)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, duration: 0.24 }}
      style={{ background: cardBg, borderRadius: 20, border: `1px solid ${borderCol}`, padding: '20px 22px' }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: mutedCol, textTransform: 'uppercase', marginBottom: 14 }}>
        What To Work On
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map((rec, i) => {
          const isPrimary   = i === 0
          const cfg         = REC_STATUS[rec.status] || { icon: '→', label: 'Topic', color: bandColor }
          const statusColor = cfg.color
          return (
            <motion.div
              key={rec.nodeId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.26 + i * 0.07, duration: 0.20 }}
              style={{
                padding: isPrimary ? '14px 16px' : '10px 14px',
                borderRadius: 14,
                background: isPrimary
                  ? `${statusColor}12`
                  : isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isPrimary ? statusColor + '35' : borderCol}`,
                borderLeft: `3px solid ${isPrimary ? statusColor : (isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)')}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isPrimary && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: statusColor, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Start Here
                    </div>
                  )}
                  <div style={{ fontSize: isPrimary ? 14 : 12.5, fontWeight: isPrimary ? 800 : 600, color: textCol, marginBottom: 4, lineHeight: 1.3 }}>
                    {rec.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: statusColor }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span style={{ fontSize: 9.5, color: mutedCol }}>·</span>
                    <span style={{ fontSize: 9.5, color: mutedCol }}>{rec.reason}</span>
                  </div>
                </div>
                {isPrimary && (
                  <button
                    onClick={() => onStartTopic?.(rec.nodeId, subject)}
                    style={{
                      flexShrink: 0, padding: '8px 14px', borderRadius: 10,
                      background: statusColor, border: 'none',
                      fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    Study <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── History timeline (Phase 5) ────────────────────────────────────────────────
function HistoryTimeline({ history, currentBand, isLight }) {
  if (!history || history.length < 2) return null

  // Show last 5 entries (current last = newest)
  const recent = history.slice(-5)
  const label  = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)'

  // Detect net improvement vs first entry
  const firstBandOrder   = BAND_ORDER[recent[0].band] ?? -1
  const currentBandOrder = BAND_ORDER[currentBand]    ?? -1
  const improved = currentBandOrder > firstBandOrder

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: label, textTransform: 'uppercase' }}>
          Your Progress
        </div>
        {improved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: 10.5, fontWeight: 800, color: '#4ADE80',
              background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
              padding: '3px 10px', borderRadius: 99,
            }}
          >
            ↑ {recent[0].band} → {currentBand}
          </motion.div>
        )}
      </div>

      {/* Timeline dots */}
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        {/* Vertical connector line */}
        <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1.5, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', borderRadius: 1 }} />

        {recent.map((entry, i) => {
          const isLatest   = i === recent.length - 1
          const bandColor  = BAND_COLORS[entry.band] || '#818CF8'
          const textColor  = isLight ? '#0f1117' : 'rgba(255,255,255,0.85)'
          const dateStr    = entry.calibratedAt
            ? new Date(entry.calibratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
            : ''

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < recent.length - 1 ? 14 : 0 }}>
              {/* Dot */}
              <div style={{
                width: isLatest ? 13 : 9, height: isLatest ? 13 : 9,
                borderRadius: '50%',
                background: isLatest ? bandColor : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'),
                border: isLatest ? `2px solid ${bandColor}` : 'none',
                boxShadow: isLatest ? `0 0 8px ${bandColor}88` : 'none',
                flexShrink: 0,
                marginLeft: isLatest ? -2 : 0,
                transition: 'all 0.3s',
              }} />
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
                <span style={{ fontSize: isLatest ? 13 : 12, fontWeight: isLatest ? 800 : 500, color: isLatest ? bandColor : label }}>
                  {entry.band}
                </span>
                {isLatest && <span style={{ fontSize: 10.5, color: bandColor, opacity: 0.7, fontWeight: 600 }}>← now</span>}
                <span style={{ fontSize: 10.5, color: label, marginLeft: 'auto' }}>{dateStr}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main export — full-screen result overlay ──────────────────────────────────
export default function CalibrationResult({
  result,
  subject,
  history,
  insights,
  isLight,
  onStartTopic,
  onRecalibrate,
  onAnotherSubject,
  onClose,
}) {
  const subjectLabel = SUBJECT_LABELS[subject] || subject
  const subjectIcon  = SUBJECT_ICONS[subject]  || '📚'
  const subjectMap   = CALIBRATION_MAP[subject] || {}

  const bandColor = BAND_COLORS[result?.band] || '#818CF8'
  const mins      = result?.durationMs ? Math.round(result.durationMs / 60000) : null
  const confidence = result?.confidence ?? null
  const confColor  = confidence == null ? null
    : confidence >= 75 ? '#4ADE80' : confidence >= 50 ? '#FBBF24' : '#F87171'

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const bg         = isLight ? '#f4f5fa'                  : '#0d0e16'
  const cardBg     = isLight ? '#ffffff'                  : '#161826'
  const panelBg    = isLight ? 'rgba(0,0,0,0.03)'        : 'rgba(255,255,255,0.03)'
  const borderCol  = isLight ? 'rgba(0,0,0,0.08)'        : 'rgba(255,255,255,0.07)'
  const textCol    = isLight ? '#0f1117'                  : 'rgba(255,255,255,0.88)'
  const mutedCol   = isLight ? 'rgba(0,0,0,0.38)'        : 'rgba(255,255,255,0.35)'

  if (!result) return null

  return (
    <motion.div
      key="calib-result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1900,
        background: bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: `1px solid ${borderCol}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{subjectIcon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: textCol }}>{subjectLabel}</span>
          <div style={{ width: 1, height: 14, background: borderCol }} />
          <span style={{ fontSize: 11, color: mutedCol, fontWeight: 600 }}>Diagnostic Complete</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
        >
          <X size={13} /> Back to Chat
        </button>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* ── LEFT: band headline + skill breakdown + history ──────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Band headline card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              style={{
                background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20,
                padding: '28px 30px',
                borderTop: `3px solid ${bandColor}`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: bandColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Your Level
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 250, damping: 22 }}
                style={{ fontSize: 38, fontWeight: 900, color: bandColor, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 2 }}
              >
                {result.band || 'Calibrated'}
              </motion.div>

              {/* Band range (low confidence only) */}
              {result.bandLow && result.bandHigh && (
                <div style={{ fontSize: 12.5, color: mutedCol, marginBottom: 4, marginTop: 2 }}>
                  Estimated range: {result.bandLow} – {result.bandHigh}
                </div>
              )}

              <SubBandIndicator
                band={result.band}
                bandAvg={result.bandAvg}
                bandColor={bandColor}
                isLight={isLight}
              />

              <div style={{ fontSize: 12.5, color: mutedCol, display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, alignItems: 'center' }}>
                <span>{result.questionsAsked || '?'} questions</span>
                {mins !== null && <span>{mins} min{mins !== 1 ? 's' : ''}</span>}
                <span>{Object.keys(result.skillMap || {}).length} skills assessed</span>
                {/* Confidence pill (Phase A) */}
                {confidence != null && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
                    background: `${confColor}18`,
                    color: confColor,
                    border: `1px solid ${confColor}35`,
                    letterSpacing: '0.03em',
                  }}>
                    {confidence}% confidence
                  </span>
                )}
              </div>
            </motion.div>

            {/* Topic breakdown card */}
            {NODE_CLUSTERS[subject] && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.26 }}
                style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 28px' }}
              >
                <TopicBreakdown subject={subject} skillMap={result.skillMap} isLight={isLight} />
              </motion.div>
            )}

            {/* Skill breakdown card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.26 }}
              style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 28px' }}
            >
              <SkillBreakdown skillMap={result.skillMap} subjectMap={subjectMap} isLight={isLight} />
            </motion.div>

            {/* History timeline (Phase 5) */}
            {history && history.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.26 }}
                style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 28px' }}
              >
                <HistoryTimeline history={history} currentBand={result.band} isLight={isLight} />
              </motion.div>
            )}
          </div>

          {/* ── RIGHT: insights + next step + actions ───────────────────── */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* AI Insights card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.26 }}
              style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 24px' }}
            >
              <InsightsPanel insights={insights} isLight={isLight} />
            </motion.div>

            {/* Recommendation cards (Phase B — replaces single next-topic) */}
            <RecommendationCards
              recommendations={result?.recommendations}
              subjectMap={subjectMap}
              bandColor={bandColor}
              isLight={isLight}
              onStartTopic={onStartTopic}
              subject={subject}
            />

            {/* Secondary actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.30, duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <button
                onClick={() => onAnotherSubject?.()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: panelBg, border: `1px solid ${borderCol}`, borderRadius: 12, padding: '11px 16px',
                  fontSize: 12.5, fontWeight: 600, color: mutedCol, cursor: 'pointer',
                }}
              >
                <Layers size={13} /> Calibrate another subject
              </button>
              <button
                onClick={() => onRecalibrate?.()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'none', border: `1px solid ${borderCol}`, borderRadius: 12, padding: '11px 16px',
                  fontSize: 12.5, fontWeight: 600, color: mutedCol, cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> Re-run this diagnostic
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
