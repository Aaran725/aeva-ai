/**
 * CalibrationHub.jsx — Phase 7 + progress view
 *
 * Subject card grid with per-card expandable history timeline.
 * "View progress" appears on any calibrated subject.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronDown, ArrowRight, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useCalibrationStore } from './calibrationStore'
import { CALIBRATION_MAP, SUBJECT_LABELS, SUBJECT_ICONS } from './calibrationMap'
import { useUITheme } from './uiThemeStore'

// ── Constants ─────────────────────────────────────────────────────────────────

// Lower threshold for each band — mirrors calibBand() thresholds in App.jsx
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

const BAND_COLORS = {
  'Grade 1':       '#94A3B8',
  'Grade 2':       '#94A3B8',
  'Grade 3':       '#78C1C8',
  'Grade 4':       '#78C1C8',
  'Grade 5':       '#60D0A0',
  'Grade 6':       '#60D0A0',
  'Grade 7':       '#4ADE80',
  'Grade 8':       '#34D399',
  'Grade 9':       '#A78BFA',
  'Grade 9+':      '#9B75F5',
  'Grade 10':      '#8B5CF6',
  'Grade 10+':     '#7C52E8',
  'Grade 11':      '#6366F1',
  'Grade 11+':     '#5558D9',
  'AP · Year 1':   '#E9A364',
  'AP · Year 2':   '#F59E0B',
}

// Numeric order for comparing bands (higher = more advanced)
const BAND_ORDER = {
  'Grade 1':       0,
  'Grade 2':       1,
  'Grade 3':       2,
  'Grade 4':       3,
  'Grade 5':       4,
  'Grade 6':       5,
  'Grade 7':       6,
  'Grade 8':       7,
  'Grade 9':       8,
  'Grade 9+':      9,
  'Grade 10':      10,
  'Grade 10+':     11,
  'Grade 11':      12,
  'Grade 11+':     13,
  'AP · Year 1':   14,
  'AP · Year 2':   15,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return null
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined })
}

function formatDateFull(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function bandDiff(earlier, later) {
  const a = BAND_ORDER[earlier] ?? -1
  const b = BAND_ORDER[later]  ?? -1
  return b - a
}

// ── Progress panel (inline, inside card) ──────────────────────────────────────

function ProgressPanel({ history, currentBand }) {
  // Show up to 5 most recent, newest first
  const entries = [...history].sort((a, b) => b.calibratedAt - a.calibratedAt).slice(0, 5)
  const oldest  = entries[entries.length - 1]
  const newest  = entries[0]
  const diff    = oldest && newest && oldest !== newest
    ? bandDiff(oldest.band, newest.band)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: 'hidden' }}
    >
      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0 16px' }} />

      {/* Overall improvement callout */}
      {entries.length >= 2 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 10, marginBottom: 14,
          background: diff > 0
            ? 'rgba(74,222,128,0.08)'
            : diff < 0
              ? 'rgba(248,113,113,0.08)'
              : 'rgba(255,255,255,0.05)',
          border: `1px solid ${diff > 0 ? 'rgba(74,222,128,0.2)' : diff < 0 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.08)'}`,
        }}>
          {diff > 0
            ? <TrendingUp  size={13} color="#4ADE80" style={{ flexShrink: 0 }} />
            : diff < 0
              ? <TrendingDown size={13} color="#F87171" style={{ flexShrink: 0 }} />
              : <Minus size={13} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
          }
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: diff > 0 ? '#4ADE80' : diff < 0 ? '#F87171' : 'rgba(255,255,255,0.40)',
          }}>
            {diff > 0
              ? `↑ ${oldest.band} → ${newest.band}`
              : diff < 0
                ? `↓ ${oldest.band} → ${newest.band}`
                : `No change — still ${newest.band}`
            }
          </span>
        </div>
      )}

      {/* Timeline rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {entries.map((entry, i) => {
          const color    = BAND_COLORS[entry.band] || '#A78BFA'
          const isLatest = i === 0
          const prevBand = entries[i + 1]?.band
          const rowDiff  = prevBand ? bandDiff(prevBand, entry.band) : 0

          return (
            <div key={entry.calibratedAt} style={{ display: 'flex', alignItems: 'stretch', gap: 12, minHeight: 42 }}>
              {/* Timeline track */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0, paddingTop: 4 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: isLatest ? color : 'rgba(255,255,255,0.20)',
                  boxShadow: isLatest ? `0 0 8px ${color}99` : 'none',
                  border: isLatest ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.15)',
                  transition: 'all 0.2s',
                }} />
                {i < entries.length - 1 && (
                  <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.10)', marginTop: 4 }} />
                )}
              </div>

              {/* Row content */}
              <div style={{ flex: 1, paddingBottom: i < entries.length - 1 ? 12 : 0, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  {/* Band chip */}
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: isLatest ? color : 'rgba(255,255,255,0.55)',
                  }}>
                    {entry.band}
                  </span>

                  {/* Change vs previous */}
                  {prevBand && rowDiff !== 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                      background: rowDiff > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                      color: rowDiff > 0 ? '#4ADE80' : '#F87171',
                    }}>
                      {rowDiff > 0 ? '↑' : '↓'}
                    </span>
                  )}

                  {isLatest && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                      background: 'rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.85)',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>
                      Latest
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
                  fontSize: 11, color: 'rgba(255,255,255,0.28)',
                }}>
                  <Clock size={9} />
                  {formatDateFull(entry.calibratedAt)}
                  {entry.questionsAsked > 0 && (
                    <span style={{ opacity: 0.6 }}>· {entry.questionsAsked}Q</span>
                  )}
                  {entry.bandAvg != null && (() => {
                    const lower = BAND_LOWER[entry.band] ?? -6.5
                    const pos   = Math.max(0, Math.min(1, entry.bandAvg - lower))
                    const lbl   = pos < 0.35 ? 'Dev' : pos < 0.70 ? 'Solid' : 'Strong'
                    return (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                        background: `${color}18`,
                        color: isLatest ? color : 'rgba(255,255,255,0.38)',
                        letterSpacing: '0.03em',
                      }}>
                        {lbl} {Math.round(pos * 100)}%
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── Subject card ──────────────────────────────────────────────────────────────

function SubjectCard({ subject, result, history, accent, onStart, index, expanded, onToggleProgress }) {
  const band      = result?.band
  const lastAt    = result?.calibratedAt
  const label     = SUBJECT_LABELS[subject]
  const icon      = SUBJECT_ICONS[subject]
  const bandColor = band ? (BAND_COLORS[band] || '#A78BFA') : null
  const hasHistory = history.length >= 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${band
          ? expanded ? `${bandColor}45` : `${bandColor}28`
          : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20,
        padding: '22px 22px 18px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Top colour bar */}
      {band && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${bandColor}${expanded ? 'aa' : '70'}, transparent)`,
          borderRadius: '20px 20px 0 0',
          transition: 'opacity 0.2s',
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
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 11px', borderRadius: 99,
            background: `${bandColor}16`,
            border: `1px solid ${bandColor}38`,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: bandColor, boxShadow: `0 0 6px ${bandColor}`,
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: bandColor }}>{band}</span>
          </div>

          {/* Sub-band mini bar */}
          {result?.bandAvg != null && (() => {
            const lower = BAND_LOWER[band] ?? -6.5
            const pos   = Math.max(0, Math.min(1, result.bandAvg - lower))
            const lbl   = pos < 0.35 ? 'Developing' : pos < 0.70 ? 'Solid' : 'Strong'
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: `${bandColor}cc`, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{lbl}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{Math.round(pos * 100)}%</span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pos * 100}%` }}
                    transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: '100%', borderRadius: 99, background: `${bandColor}cc` }}
                  />
                </div>
              </div>
            )
          })()}

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
          marginBottom: 12, fontStyle: 'italic', lineHeight: 1.5,
        }}>
          Not yet calibrated
        </div>
      )}

      {/* "View progress" toggle */}
      {hasHistory && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onToggleProgress(subject)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 0', marginBottom: 12,
            color: expanded ? bandColor || accent : 'rgba(255,255,255,0.38)',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            transition: 'color 0.18s',
          }}
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <ChevronDown size={13} />
          </motion.span>
          {expanded ? 'Hide progress' : `View progress${history.length > 1 ? ` (${history.length} runs)` : ''}`}
        </motion.button>
      )}

      {/* Inline progress panel */}
      <AnimatePresence>
        {expanded && hasHistory && (
          <ProgressPanel history={history} currentBand={band} />
        )}
      </AnimatePresence>

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
  const calibStore       = useCalibrationStore()
  const accent           = useUITheme(s => s.accent)
  const subjects         = Object.keys(CALIBRATION_MAP)
  const [expandedSubject, setExpandedSubject] = useState(null)

  const toggleProgress = (subject) =>
    setExpandedSubject(prev => prev === subject ? null : subject)

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

        {/* Calibrated subjects */}
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
                  history={calibStore.getHistory(subject)}
                  accent={accent}
                  onStart={onStartCalib}
                  index={i}
                  expanded={expandedSubject === subject}
                  onToggleProgress={toggleProgress}
                />
              ))}
            </div>
          </>
        )}

        {/* Uncalibrated subjects */}
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
                  history={[]}
                  accent={accent}
                  onStart={onStartCalib}
                  index={calibrated.length + i}
                  expanded={false}
                  onToggleProgress={toggleProgress}
                />
              ))}
            </div>
          </>
        )}

        {/* How it works */}
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
