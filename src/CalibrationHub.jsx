/**
 * CalibrationHub.jsx — Phase 7: Subject card grid (Option 3)
 *
 * Shows all 8 subjects as cards. Each card displays the current calibrated
 * level (if any) and a "Start diagnostic" / "Re-run" CTA.
 * Tapping a card calls onStartCalib(subject), which sets pendingCalibSubject
 * in aevaControlStore and navigates to ChatView where the diagnostic fires.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ArrowRight, Clock } from 'lucide-react'
import { useCalibrationStore } from './calibrationStore'
import { CALIBRATION_MAP, SUBJECT_LABELS, SUBJECT_ICONS } from './calibrationMap'
import { useUITheme } from './uiThemeStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return null
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Matches CalibrationResult.jsx colours for consistency
const BAND_COLORS = {
  'Grade 1':          '#94A3B8',
  'Grade 1–2':        '#94A3B8',
  'Grade 3':          '#78C1C8',
  'Grade 3–4':        '#78C1C8',
  'Grade 4':          '#60D0A0',
  'Grade 4–5':        '#60D0A0',
  'Grade 5–6':        '#4ADE80',
  'Grade 6':          '#4ADE80',
  'Grade 7–8':        '#34D399',
  'Foundation':       '#A78BFA',
  'GCSE Foundation':  '#A78BFA',
  'GCSE':             '#8B5CF6',
  'GCSE Higher':      '#6366F1',
  'A-Level':          '#E9A364',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubjectCard({ subject, result, accent, onStart, index }) {
  const band      = result?.band
  const lastAt    = result?.calibratedAt
  const label     = SUBJECT_LABELS[subject]
  const icon      = SUBJECT_ICONS[subject]
  const bandColor = band ? (BAND_COLORS[band] || '#A78BFA') : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${band ? `${bandColor}28` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20,
        padding: '22px 22px 18px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top colour bar for calibrated subjects */}
      {band && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${bandColor}70, transparent)`,
          borderRadius: '20px 20px 0 0',
        }} />
      )}

      {/* Icon */}
      <div style={{ fontSize: 30, marginBottom: 12, lineHeight: 1 }}>{icon}</div>

      {/* Subject name */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: '#fff',
        letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.3,
      }}>{label}</div>

      {/* Level chip or placeholder */}
      {band ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 11px', borderRadius: 99,
            background: `${bandColor}16`,
            border: `1px solid ${bandColor}38`,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: bandColor,
              boxShadow: `0 0 6px ${bandColor}`,
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: bandColor }}>{band}</span>
          </div>
          {lastAt && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 7,
            }}>
              <Clock size={10} />
              {formatDate(lastAt)}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.25)',
          marginBottom: 14, fontStyle: 'italic', lineHeight: 1.5,
        }}>
          Not yet calibrated
        </div>
      )}

      {/* CTA button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => onStart(subject)}
        style={{
          width: '100%', padding: '11px 16px',
          borderRadius: 12, cursor: 'pointer',
          border: band ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${accent}45`,
          background: band
            ? 'rgba(255,255,255,0.07)'
            : `linear-gradient(135deg, ${accent}25, ${accent}10)`,
          color: band ? 'rgba(255,255,255,0.72)' : accent,
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          marginTop: 'auto',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
      >
        {band ? '↺  Re-run diagnostic' : 'Start diagnostic'}
        <ArrowRight size={13} />
      </motion.button>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CalibrationHub({ onBack, onStartCalib }) {
  const calibStore = useCalibrationStore()
  const accent     = useUITheme(s => s.accent)
  const subjects   = Object.keys(CALIBRATION_MAP)

  const calibrated   = subjects.filter(s => calibStore.results[s])
  const uncalibrated = subjects.filter(s => !calibStore.results[s])

  return (
    <motion.div
      key="calib-hub"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        minHeight: '100vh', width: '100%',
        background: 'var(--ui-bg, #07081a)',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '16px 22px',
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(7,8,26,0.90)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.60)',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={16} />
        </motion.button>

        <div>
          <div style={{
            fontSize: 17, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.2,
          }}>
            Level Diagnostic
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            Pick a subject · Aeva adapts to your answers in real time
          </div>
        </div>

        {/* Summary pill */}
        {calibrated.length > 0 && (
          <div style={{
            marginLeft: 'auto', flexShrink: 0,
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            fontSize: 12, fontWeight: 600,
            color: 'rgba(165,180,252,0.9)',
          }}>
            {calibrated.length}/{subjects.length} calibrated
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 920, width: '100%', margin: '0 auto', padding: '28px 20px 100px' }}>

        {/* Already calibrated subjects */}
        {calibrated.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
              marginBottom: 14,
            }}>
              Your levels
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14, marginBottom: 32,
            }}>
              {calibrated.map((subject, i) => (
                <SubjectCard
                  key={subject}
                  subject={subject}
                  result={calibStore.results[subject]}
                  accent={accent}
                  onStart={onStartCalib}
                  index={i}
                />
              ))}
            </div>
          </>
        )}

        {/* Not yet calibrated */}
        {uncalibrated.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
              marginBottom: 14,
            }}>
              {calibrated.length > 0 ? 'Not yet calibrated' : 'Choose a subject'}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
            }}>
              {uncalibrated.map((subject, i) => (
                <SubjectCard
                  key={subject}
                  subject={subject}
                  result={null}
                  accent={accent}
                  onStart={onStartCalib}
                  index={calibrated.length + i}
                />
              ))}
            </div>
          </>
        )}

        {/* How it works note */}
        <div style={{
          marginTop: 44, padding: '18px 22px',
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 16,
          display: 'flex', gap: 16, alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>🎯</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 5 }}>
              How the diagnostic works
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
              Up to 12 questions · starts with a quick placement check · adapts up or down based on your answers ·
              written answers scored by AI (partial credit given) · your result tunes every future Aeva session in that subject.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
