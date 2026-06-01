import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Zap } from 'lucide-react'
import { ORBS, useXPStore, levelFromXP, xpIntoLevel } from './xpStore'

function MiniOrb({ orb, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: orb.gradient,
      boxShadow: `0 0 18px ${orb.glow}`,
      filter: 'saturate(1.4) contrast(1.1)',
      flexShrink: 0,
    }} />
  )
}

export default function OrbSelector({ onClose }) {
  const { xp, unlockedOrbs, activeOrb, setActiveOrb } = useXPStore()
  const currentLevel = levelFromXP(xp)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,6,20,0.85)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'rgba(8,9,26,0.98)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 26, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.70)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em' }}>Choose Your Aeva</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>Each orb changes how Aeva teaches you</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Level status */}
        <div style={{ padding: '12px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)', borderRadius: 10, padding: '6px 12px' }}>
            <Zap size={12} color="#8B8FFF" fill="#8B8FFF" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(200,200,255,0.90)' }}>Level {currentLevel}</span>
          </div>
          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpIntoLevel(xp)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B8FFF)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.40)', flexShrink: 0 }}>{xpIntoLevel(xp)}/100 XP</span>
        </div>

        {/* Orbs grid */}
        <div style={{ overflowY: 'auto', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {ORBS.map(orb => {
            const unlocked = unlockedOrbs.includes(orb.id)
            const isActive = activeOrb === orb.id
            const levelsAway = orb.requiredLevel - currentLevel

            return (
              <motion.button key={orb.id}
                whileHover={unlocked ? { scale: 1.02 } : {}}
                whileTap={unlocked ? { scale: 0.97 } : {}}
                onClick={() => { if (unlocked) { setActiveOrb(orb.id); onClose() } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 16, cursor: unlocked ? 'pointer' : 'not-allowed',
                  background: isActive ? 'rgba(139,143,255,0.12)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: isActive ? '1.5px solid rgba(139,143,255,0.45)' : unlocked ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'left', fontFamily: 'inherit',
                  opacity: unlocked ? 1 : 0.52,
                  transition: 'border-color 0.2s, background 0.2s',
                  position: 'relative',
                }}
              >
                {/* Orb visual */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <MiniOrb orb={orb} size={52} />
                  {!unlocked && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={16} color="rgba(255,255,255,0.60)" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: unlocked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)' }}>{orb.name}</span>
                    {isActive && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, background: 'rgba(139,143,255,0.22)', border: '1px solid rgba(139,143,255,0.38)', color: '#A5B4FC', borderRadius: 6, padding: '2px 6px', letterSpacing: '0.06em' }}>ACTIVE</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', margin: '0 0 5px', lineHeight: 1.4 }}>{orb.tagline}</p>
                  {!unlocked ? (
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={9} />
                      Level {orb.requiredLevel} · {levelsAway} level{levelsAway !== 1 ? 's' : ''} away
                    </div>
                  ) : (
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)' }}>
                      Unlocked at Level {orb.requiredLevel}
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
