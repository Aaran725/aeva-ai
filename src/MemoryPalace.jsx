import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useNeuralStore } from './neuralStore'

function masteryColor(mastery) {
  if (mastery >= 80) return '#10B981'
  if (mastery >= 55) return '#F59E0B'
  if (mastery >= 35) return '#EF4444'
  return 'rgba(255,255,255,0.08)'
}

function masteryLabel(mastery) {
  if (mastery >= 80) return 'Mastered'
  if (mastery >= 55) return 'Learning'
  if (mastery >= 35) return 'Struggling'
  return 'Unexplored'
}

const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
const HEX_W = 72
const HEX_H = 80
const COLS = 6

const LEGEND = [
  { color: '#10B981', label: 'Mastered' },
  { color: '#F59E0B', label: 'Learning' },
  { color: '#EF4444', label: 'Struggling' },
  { color: 'rgba(255,255,255,0.35)', label: 'Unexplored' },
]

function HexCell({ concept, index, onHover, isHovered }) {
  const color = masteryColor(concept.mastery)
  const isRevisited = concept.visits > 1

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay: index * 0.04,
        type: 'spring',
        stiffness: 320,
        damping: 22,
      }}
      style={{ position: 'relative', width: HEX_W, height: HEX_H, flexShrink: 0 }}
      onMouseEnter={() => onHover(concept)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        whileHover={{ scale: 1.15 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{
          width: '100%',
          height: '100%',
          clipPath: HEX_CLIP,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Revisited ring pulse */}
        {isRevisited && (
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: HEX_CLIP,
              background: `radial-gradient(ellipse at 50% 50%, ${color}80 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Inner label — visible on hover via tooltip */}
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: concept.mastery >= 35 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.45)',
          textAlign: 'center',
          padding: '0 6px',
          lineHeight: 1.2,
          maxWidth: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          {concept.label}
        </span>
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,10,30,0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '7px 12px',
              zIndex: 10,
              whiteSpace: 'nowrap',
              fontFamily: "'Inter', system-ui, sans-serif",
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 2, textTransform: 'capitalize' }}>
              {concept.label}
            </div>
            <div style={{ fontSize: 11, color: masteryColor(concept.mastery), fontWeight: 600 }}>
              {masteryLabel(concept.mastery)} · {concept.mastery}%
            </div>
            {concept.visits > 1 && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                {concept.visits} visits
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function MemoryPalace({ onClose }) {
  const { conceptMap } = useNeuralStore()
  const [hoveredConcept, setHoveredConcept] = useState(null)

  const displayConcepts = [...conceptMap]
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 30)

  // Build rows of COLS columns with hex offset
  const rows = []
  for (let i = 0; i < displayConcepts.length; i += COLS) {
    rows.push(displayConcepts.slice(i, i + COLS))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'rgba(4,6,20,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.88, y: 28 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 28 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          borderRadius: 32,
          background: 'rgba(8,10,28,0.96)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.60)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.03em',
            }}>
              Memory Palace
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.38)' }}>
              {conceptMap.length} concept{conceptMap.length !== 1 ? 's' : ''} mapped
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </motion.button>
        </div>

        {/* Grid area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {displayConcepts.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 220,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.4 }}>🧠</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 320 }}>
                Chat with Aeva to build your palace. Every concept you explore appears here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginLeft: rowIdx % 2 === 1 ? 36 : 0,
                  }}
                >
                  {row.map((concept, colIdx) => (
                    <HexCell
                      key={concept.id}
                      concept={concept}
                      index={rowIdx * COLS + colIdx}
                      onHover={setHoveredConcept}
                      isHovered={hoveredConcept?.id === concept.id}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          flexShrink: 0,
          padding: '14px 28px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          {LEGEND.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 10, height: 10,
                clipPath: HEX_CLIP,
                background: item.color,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
