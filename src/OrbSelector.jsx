import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Zap, Check } from 'lucide-react'
import { ORBS, useXPStore, levelFromXP, xpIntoLevel } from './xpStore'
import AevaOrb from './AevaOrb'
import { useT } from './translations'

export default function OrbSelector({ onClose }) {
  const T = useT()
  const { xp, unlockedOrbs, activeOrb, setActiveOrb } = useXPStore()
  const currentLevel = levelFromXP(xp)
  const [hovered, setHovered] = useState(activeOrb)

  const previewOrb = ORBS.find(o => o.id === hovered) || ORBS.find(o => o.id === activeOrb) || ORBS[0]

  const handleSelect = (orb) => {
    if (!unlockedOrbs.includes(orb.id)) return
    setActiveOrb(orb.id)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,6,20,0.88)', backdropFilter: 'blur(22px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{
          width: '100%', maxWidth: 620, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(8,9,26,0.98)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 26, overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.70)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em' }}>{T.chooseYourAeva}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{T.eachOrbChanges}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Live preview */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0,
          background: `radial-gradient(ellipse at 30% 50%, rgba(${previewOrb.accent?.join(',') || '139,143,255'},0.10) 0%, transparent 70%)`,
          transition: 'background 0.8s ease',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={previewOrb.id}
              initial={{ opacity: 0, scale: 0.80 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.80 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <AevaOrb
                size={130}
                active={false}
                personality="balanced"
                orbGradient={previewOrb.gradient}
                orbAccent={previewOrb.accent}
              />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={previewOrb.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              style={{ flex: 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{previewOrb.emoji}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em' }}>{previewOrb.name}</span>
                {activeOrb === previewOrb.id && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: `rgba(${previewOrb.accent?.join(',') || '139,143,255'},0.20)`, border: `1px solid rgba(${previewOrb.accent?.join(',') || '139,143,255'},0.45)`, color: `rgb(${previewOrb.accent?.join(',') || '139,143,255'})`, borderRadius: 6, padding: '2px 7px', letterSpacing: '0.06em' }}>{T.activeLabel}</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 10px', lineHeight: 1.55 }}>{T.orbTaglines?.[previewOrb.id] || previewOrb.tagline}</p>
              {previewOrb.personality && (
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.55, fontStyle: 'italic', maxWidth: 320 }}>
                  "{previewOrb.personality.split('.')[0]}."
                </p>
              )}
              {!unlockedOrbs.includes(previewOrb.id) && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <Lock size={11} color="rgba(255,255,255,0.45)" />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{T.unlocksAtLevel(previewOrb.requiredLevel)}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* XP bar */}
        <div style={{ padding: '10px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)', borderRadius: 10, padding: '5px 11px' }}>
            <Zap size={11} color="#8B8FFF" fill="#8B8FFF" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(200,200,255,0.90)' }}>Level {currentLevel}</span>
          </div>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpIntoLevel(xp)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B8FFF)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{xpIntoLevel(xp)}/100 XP</span>
        </div>

        {/* Orb grid */}
        <div style={{ overflowY: 'auto', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ORBS.map(orb => {
            const unlocked = unlockedOrbs.includes(orb.id)
            const isActive = activeOrb === orb.id
            const isHovered = hovered === orb.id
            const levelsAway = orb.requiredLevel - currentLevel
            const [r, g, b] = orb.accent || [139, 143, 255]

            return (
              <motion.button
                key={orb.id}
                whileHover={unlocked ? { scale: 1.02 } : {}}
                whileTap={unlocked ? { scale: 0.97 } : {}}
                onClick={() => handleSelect(orb)}
                onMouseEnter={() => setHovered(orb.id)}
                onMouseLeave={() => setHovered(activeOrb)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 16,
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  background: isActive
                    ? `rgba(${r},${g},${b},0.14)`
                    : isHovered && unlocked
                      ? `rgba(${r},${g},${b},0.08)`
                      : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? `1.5px solid rgba(${r},${g},${b},0.55)`
                    : isHovered && unlocked
                      ? `1px solid rgba(${r},${g},${b},0.28)`
                      : unlocked ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)',
                  textAlign: 'left', fontFamily: 'inherit',
                  opacity: unlocked ? 1 : 0.45,
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                  boxShadow: isActive ? `0 0 20px rgba(${r},${g},${b},0.20)` : 'none',
                }}
              >
                {/* Mini orb swatch */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: orb.gradient,
                    boxShadow: isActive || isHovered
                      ? `0 0 16px rgba(${r},${g},${b},0.70), 0 0 6px rgba(${r},${g},${b},0.45)`
                      : `0 0 8px rgba(${r},${g},${b},0.30)`,
                    filter: 'saturate(1.5) contrast(1.1)',
                    transition: 'box-shadow 0.3s ease',
                  }} />
                  {isActive && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: `rgb(${r},${g},${b})`, border: '2px solid rgba(8,9,26,1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={8} color="white" strokeWidth={3} />
                    </div>
                  )}
                  {!unlocked && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={14} color="rgba(255,255,255,0.55)" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: unlocked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.40)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {orb.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
                    {unlocked ? (T.orbTaglines?.[orb.id] || orb.tagline) : T.levelsAwayLabel(orb.requiredLevel, levelsAway)}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
