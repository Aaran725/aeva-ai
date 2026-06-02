import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'
import { MISSIONS, useArcadeStore } from './arcadeStore'
import BoardroomGame from './BoardroomGame'
import MeltdownGame from './MeltdownGame'

/* ─── Mission tile ─── */
function MissionTile({ mission, onSelect, index }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 + index * 0.07, ease: 'easeOut', duration: 0.35 }}
      whileHover={{ scale: 1.025, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(mission.id)}
      style={{
        width: '100%',
        padding: '20px 22px',
        borderRadius: 22,
        background: mission.colorDim,
        border: `1px solid ${mission.border}`,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 4px 30px ${mission.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Noise grain */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '180px',
        opacity: 0.025, pointerEvents: 'none',
      }} />

      {/* Glow orb */}
      <div aria-hidden style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: `radial-gradient(circle, ${mission.color}30 0%, transparent 70%)`,
        filter: 'blur(15px)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 26, width: 46, height: 46, borderRadius: 14,
          background: `rgba(0,0,0,0.25)`, border: `1px solid ${mission.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {mission.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4, letterSpacing: '-0.01em' }}>
            {mission.title}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.45 }}>
            {mission.tagline}
          </div>
        </div>
        <Zap size={14} color={mission.color} style={{ flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Color accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 22, right: 22, height: 1,
        background: `linear-gradient(90deg, transparent, ${mission.color}60, transparent)`,
      }} />
    </motion.button>
  )
}

/* ═══ ARCADE HUB ═══════════════════════════════════ */
export default function ArcadeHub() {
  const { arcadeOpen, closeArcade, selectMission } = useArcadeStore()
  const [boardroomOpen, setBoardroomOpen] = useState(false)
  const [meltdownOpen, setMeltdownOpen] = useState(false)

  return (
    <>
    <AnimatePresence>
      {arcadeOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="arcade-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeArcade}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(4,6,20,0.60)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Desktop: right sidebar / Mobile: bottom drawer */}
          <motion.div
            key="arcade-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 'min(420px, 92vw)',
              zIndex: 201,
              background: 'rgba(8,10,28,0.75)',
              backdropFilter: 'blur(48px)',
              WebkitBackdropFilter: 'blur(48px)',
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '-20px 0 80px rgba(0,0,0,0.60)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Glow accents */}
            <div aria-hidden style={{
              position: 'absolute', top: -60, right: -60, width: 300, height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
              filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div aria-hidden style={{
              position: 'absolute', bottom: -40, left: -40, width: 250, height: 250,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(233,163,100,0.12) 0%, transparent 70%)',
              filter: 'blur(40px)', pointerEvents: 'none',
            }} />

            {/* Header */}
            <div style={{
              padding: '28px 24px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0, position: 'relative', zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 11,
                    background: 'linear-gradient(135deg, #6366F1, #E9A364)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>🕹️</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>
                      Arcade Hub
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                      Select your mission
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={closeArcade}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <X size={15} />
                </motion.button>
              </div>

              {/* Sub-header pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.30)',
              }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366F1' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  4 Missions Available
                </span>
              </div>
            </div>

            {/* Mission tiles */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 16px',
              display: 'flex', flexDirection: 'column', gap: 12,
              position: 'relative', zIndex: 1,
            }}>

              {/* ── The Boardroom — standalone game tile ── */}
              <motion.button
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, ease: 'easeOut', duration: 0.35 }}
                whileHover={{ scale: 1.025, y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => { closeArcade(); setBoardroomOpen(true) }}
                style={{
                  width: '100%', padding: '20px 22px', borderRadius: 22,
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 30px rgba(16,185,129,0.10), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)', filter: 'blur(15px)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 26, width: 46, height: 46, borderRadius: 14, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(16,185,129,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    🏢
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>The Boardroom</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.06em' }}>GAME</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.45 }}>
                      CEO sim. 4 live meters. 10 days. Every decision costs something.
                    </div>
                  </div>
                  <Zap size={14} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 22, right: 22, height: 1, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.50), transparent)' }} />
              </motion.button>

              {/* ── The Meltdown tile ── */}
              <motion.button
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12, ease: 'easeOut', duration: 0.35 }}
                whileHover={{ scale: 1.025, y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => { closeArcade(); setMeltdownOpen(true) }}
                style={{
                  width: '100%', padding: '20px 22px', borderRadius: 22,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.22)',
                  cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 30px rgba(239,68,68,0.10), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.22) 0%, transparent 70%)', filter: 'blur(15px)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 26, width: 46, height: 46, borderRadius: 14, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    🔥
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>The Meltdown</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.06em' }}>GAME</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.45 }}>
                      2:47am. Server down. Everyone's calling. 90 seconds per round.
                    </div>
                  </div>
                  <Zap size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 22, right: 22, height: 1, background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.45), transparent)' }} />
              </motion.button>

              {Object.values(MISSIONS).map((mission, i) => (
                <MissionTile
                  key={mission.id}
                  mission={mission}
                  index={i + 2}
                  onSelect={(id) => { selectMission(id) }}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px 28px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0, position: 'relative', zIndex: 1,
            }}>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
                Each mission is a live world. Your decisions persist.<br />
                The AI will not go easy on you.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Boardroom game */}
    <AnimatePresence>
      {boardroomOpen && <BoardroomGame onClose={() => setBoardroomOpen(false)} />}
    </AnimatePresence>

    {/* Meltdown game */}
    <AnimatePresence>
      {meltdownOpen && <MeltdownGame onClose={() => setMeltdownOpen(false)} />}
    </AnimatePresence>
    </>
  )
}
