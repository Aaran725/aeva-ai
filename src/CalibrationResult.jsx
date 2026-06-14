/**
 * CalibrationResult.jsx
 * Inline result card rendered in chat after calibration convergence.
 * Phase 6: visual grade ladder replaces flat pill list at the top.
 */
import { motion } from 'framer-motion'
import { SUBJECT_LABELS, SUBJECT_ICONS, CALIBRATION_MAP } from './calibrationMap'

const STATUS_CONFIG = {
  solid:   { icon: '✅', label: 'Solid',    color: '#4ADE80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.22)' },
  shaky:   { icon: '⚠️',  label: 'Shaky',   color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)' },
  gap:     { icon: '❌', label: 'Gap',      color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  untested:{ icon: '⬜', label: 'Untested', color: 'rgba(255,255,255,0.30)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
}

// Grade ladder segments — ordered from lowest to highest
const LADDER_SEGMENTS = [
  { label: 'Grade 1–2',      short: 'Gr 1–2', minOrder: -99, maxOrder: -4, color: '#60A5FA', bg: 'rgba(96,165,250,0.18)' },
  { label: 'Grade 3–4',      short: 'Gr 3–4', minOrder: -4,  maxOrder: -2, color: '#34D399', bg: 'rgba(52,211,153,0.18)' },
  { label: 'Grade 5–8',      short: 'Gr 5–8', minOrder: -2,  maxOrder: 1,  color: '#A78BFA', bg: 'rgba(167,139,250,0.18)' },
  { label: 'Foundation',     short: 'Fdn',    minOrder: 1,   maxOrder: 4,  color: '#F59E0B', bg: 'rgba(245,158,11,0.18)' },
  { label: 'GCSE Foundation',short: 'GCSE F', minOrder: 4,   maxOrder: 6,  color: '#FB923C', bg: 'rgba(251,146,60,0.18)' },
  { label: 'GCSE Higher',    short: 'GCSE H', minOrder: 6,   maxOrder: 8,  color: '#EF4444', bg: 'rgba(239,68,68,0.18)' },
  { label: 'A-Level',        short: 'A-Lvl',  minOrder: 8,   maxOrder: 99, color: '#8B5CF6', bg: 'rgba(139,92,246,0.18)' },
]

function getSegmentForOrder(order) {
  return LADDER_SEGMENTS.find(s => order >= s.minOrder && order < s.maxOrder) || LADDER_SEGMENTS[0]
}

function GradeLadder({ skillMap, subjectMap }) {
  if (!skillMap || Object.keys(skillMap).length === 0) return null

  // Find highest solid/shaky bandOrder (student's level)
  const solidShaky = Object.entries(skillMap)
    .filter(([, v]) => v === 'solid' || v === 'shaky')
    .map(([id]) => subjectMap[id]?.bandOrder ?? -99)
  const maxSolidOrder = solidShaky.length > 0 ? Math.max(...solidShaky) : -99

  // Find lowest gap bandOrder
  const gaps = Object.entries(skillMap)
    .filter(([, v]) => v === 'gap')
    .map(([id]) => subjectMap[id]?.bandOrder ?? -99)
  const minGapOrder = gaps.length > 0 ? Math.min(...gaps) : null

  // Current segment
  const currentSegment = getSegmentForOrder(maxSolidOrder)
  const currentSegIdx = LADDER_SEGMENTS.indexOf(currentSegment)

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Section label */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
        YOUR LEVEL
      </div>

      {/* Ladder bar */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'stretch', height: 36, borderRadius: 12, overflow: 'hidden' }}>
        {LADDER_SEGMENTS.map((seg, idx) => {
          const isCurrent = idx === currentSegIdx
          const isPast    = idx < currentSegIdx
          const isFuture  = idx > currentSegIdx

          return (
            <motion.div
              key={seg.label}
              initial={{ opacity: 0, scaleY: 0.6 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: idx * 0.06, type: 'spring', stiffness: 280, damping: 24 }}
              style={{
                flex: isCurrent ? 1.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: idx === 0 ? '10px 0 0 10px' : idx === LADDER_SEGMENTS.length - 1 ? '0 10px 10px 0' : 4,
                background: isCurrent ? seg.bg
                  : isPast ? 'rgba(74,222,128,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: isCurrent ? `1.5px solid ${seg.color}` : isPast ? '1.5px solid rgba(74,222,128,0.25)' : '1.5px solid rgba(255,255,255,0.06)',
                position: 'relative',
                transition: 'flex 0.4s ease',
                cursor: 'default',
              }}
              title={seg.label}
            >
              {isCurrent && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    width: 6, height: 6, borderRadius: '50%', background: seg.color,
                    boxShadow: `0 0 8px ${seg.color}`,
                  }}
                />
              )}
              <span style={{
                fontSize: isCurrent ? 10 : 9,
                fontWeight: isCurrent ? 800 : 500,
                color: isCurrent ? seg.color : isPast ? 'rgba(74,222,128,0.60)' : 'rgba(255,255,255,0.18)',
                letterSpacing: '0.02em',
                userSelect: 'none',
              }}>
                {isCurrent ? seg.label : seg.short}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Pointer label below current segment */}
      <div style={{ display: 'flex', marginTop: 8, paddingLeft: `${(currentSegIdx / LADDER_SEGMENTS.length) * 100}%` }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: currentSegment.color,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 12 }}>▲</span>
          You are here
          {minGapOrder !== null && (
            <span style={{ color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>
              {' '}· gap at {getSegmentForOrder(minGapOrder).label}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {[
          { key: 'solid',    label: 'Solid',    color: '#4ADE80' },
          { key: 'shaky',   label: 'Shaky',    color: '#FBBF24' },
          { key: 'gap',     label: 'Gaps',     color: '#F87171' },
          { key: 'untested',label: 'Untested', color: 'rgba(255,255,255,0.30)' },
        ].map(({ key, label, color }) => {
          const count = Object.values(skillMap).filter(v => v === key).length
          if (count === 0) return null
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                <span style={{ color, fontWeight: 800 }}>{count}</span> {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalibrationResult({ result, subject, onStartTopic, onRecalibrate, onAnotherSubject }) {
  const subjectLabel = SUBJECT_LABELS[subject] || subject
  const subjectIcon  = SUBJECT_ICONS[subject]  || '📚'
  const subjectMap   = CALIBRATION_MAP[subject] || {}

  const solid    = result.skillMap ? Object.entries(result.skillMap).filter(([, v]) => v === 'solid')    : []
  const shaky    = result.skillMap ? Object.entries(result.skillMap).filter(([, v]) => v === 'shaky')    : []
  const gap      = result.skillMap ? Object.entries(result.skillMap).filter(([, v]) => v === 'gap')      : []
  const untested = result.skillMap ? Object.entries(result.skillMap).filter(([, v]) => v === 'untested') : []

  const getLabel = (skillId) => subjectMap[skillId]?.label || skillId

  const mins = result.durationMs ? Math.round(result.durationMs / 60000) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.1 }}
      style={{
        margin: '20px 0',
        borderRadius: 20,
        background: 'rgba(8,10,28,0.96)',
        border: '1px solid rgba(139,143,255,0.22)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.10)',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 22px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 100%)',
        borderBottom: '1px solid rgba(139,143,255,0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{subjectIcon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>
              {subjectLabel} Calibration
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
              {result.questionsAsked} questions
              {mins ? ` · ${mins} min` : ''}
              {result.band ? ` · ${result.band}` : ''}
            </div>
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 99,
          background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(139,143,255,0.35)',
          fontSize: 11, fontWeight: 800, color: '#A5B4FC', letterSpacing: '0.05em',
        }}>
          {result.band || 'Calibrated'}
        </div>
      </div>

      {/* Grade ladder + skill map */}
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Visual grade ladder */}
        <GradeLadder skillMap={result.skillMap} subjectMap={subjectMap} />

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

        {/* Skill map pills grouped by status */}
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          SKILL BREAKDOWN
        </div>

        {[
          { status: 'solid',    entries: solid    },
          { status: 'shaky',   entries: shaky    },
          { status: 'gap',     entries: gap      },
          { status: 'untested',entries: untested },
        ].filter(g => g.entries.length > 0).map(({ status, entries }) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <div key={status}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {cfg.icon}  {cfg.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {entries.map(([skillId]) => (
                  <div key={skillId} style={{
                    padding: '5px 12px', borderRadius: 99,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    fontSize: 12, fontWeight: 600, color: cfg.color,
                  }}>
                    {getLabel(skillId)}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Next step */}
      {result.nextTopic && (
        <div style={{
          margin: '0 22px 18px',
          padding: '14px 16px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.08))',
          border: '1px solid rgba(139,143,255,0.22)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(139,143,255,0.70)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>
            START HERE
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>
            {getLabel(result.nextTopic)}
          </div>
          {subjectMap[result.nextTopic]?.nextSkills?.length > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              Unlocks: {subjectMap[result.nextTopic].nextSkills.map(s => subjectMap[s]?.label || s).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {result.nextTopic && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => onStartTopic?.(result.nextTopic, subject)}
            style={{
              flex: 1, minWidth: 160,
              padding: '11px 18px', borderRadius: 12, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontSize: 13, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(99,102,241,0.40)',
            }}
          >
            → Start: {getLabel(result.nextTopic)}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onAnotherSubject?.()}
          style={{
            padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600,
          }}
        >
          Calibrate another subject
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onRecalibrate?.()}
          style={{
            padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
          }}
        >
          Re-calibrate
        </motion.button>
      </div>
    </motion.div>
  )
}
