/**
 * CalibrationResult.jsx
 * Inline result card rendered in chat after calibration convergence.
 */
import { motion } from 'framer-motion'
import { SUBJECT_LABELS, SUBJECT_ICONS, CALIBRATION_MAP } from './calibrationMap'

const STATUS_CONFIG = {
  solid:   { icon: '✅', label: 'Solid',    color: '#4ADE80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.22)' },
  shaky:   { icon: '⚠️',  label: 'Shaky',   color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)' },
  gap:     { icon: '❌', label: 'Gap',      color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  untested:{ icon: '⬜', label: 'Untested', color: 'rgba(255,255,255,0.30)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
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

      {/* Skill map */}
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          YOUR SKILL MAP
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
