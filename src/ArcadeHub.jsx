import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Trophy, Star, Users, Clock } from 'lucide-react'
import { MISSIONS, useArcadeStore } from './arcadeStore'
import BoardroomGame from './BoardroomGame'
import MeltdownGame from './MeltdownGame'
import RivalsGame from './RivalsGame'
import Arena from './Arena'
import { useArenaStore } from './arenaStore'

const GAMES = [
  {
    id: 'arena',
    emoji: '⚔️',
    title: 'Arena',
    subtitle: 'Sabotage Quiz',
    tag: 'LIVE MULTIPLAYER',
    tagColor: '#F43F5E',
    desc: 'AI-hosted quiz. Deploy sabotage cards to wreck opponents mid-round.',
    xp: '50–200',
    coins: '100–500',
    gradient: 'linear-gradient(135deg, rgba(244,63,94,0.20) 0%, rgba(168,85,247,0.12) 100%)',
    border: 'rgba(244,63,94,0.38)',
    glow: 'rgba(244,63,94,0.22)',
    accent: '#F43F5E',
    badge: { label: 'LIVE', color: '#4ADE80' },
  },
  {
    id: 'rivals',
    emoji: '📊',
    title: 'The Rivals',
    subtitle: 'Market Strategy',
    tag: 'STRATEGY',
    tagColor: '#6366F1',
    desc: 'Pick a sector. Allocate budget. Outperform 3 AI rivals to dominate.',
    xp: '30–120',
    coins: '80–300',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(59,130,246,0.10) 100%)',
    border: 'rgba(99,102,241,0.35)',
    glow: 'rgba(99,102,241,0.18)',
    accent: '#818CF8',
  },
  {
    id: 'boardroom',
    emoji: '🏢',
    title: 'The Boardroom',
    subtitle: 'CEO Simulator',
    tag: 'SIMULATION',
    tagColor: '#10B981',
    desc: '4 live meters. 10 days. Every decision trades one resource for another.',
    xp: '40–160',
    coins: '60–250',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(52,211,153,0.08) 100%)',
    border: 'rgba(16,185,129,0.30)',
    glow: 'rgba(16,185,129,0.14)',
    accent: '#10B981',
  },
  {
    id: 'meltdown',
    emoji: '🔥',
    title: 'The Meltdown',
    subtitle: 'Crisis Response',
    tag: 'TIME ATTACK',
    tagColor: '#EF4444',
    desc: '2:47am. Server down. Everyone\'s calling. 90 seconds per round.',
    xp: '20–90',
    coins: '40–180',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(251,146,60,0.08) 100%)',
    border: 'rgba(239,68,68,0.28)',
    glow: 'rgba(239,68,68,0.14)',
    accent: '#EF4444',
  },
]

function GameTile({ game, index, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 + index * 0.07, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        width: '100%', padding: '18px 20px 16px',
        borderRadius: 20, background: game.gradient,
        border: `1px solid ${game.border}`, cursor: 'pointer',
        textAlign: 'left', position: 'relative', overflow: 'hidden',
        boxShadow: `0 8px 40px ${game.glow}, inset 0 1px 0 rgba(255,255,255,0.09)`,
      }}
    >
      {/* Radial glow orb */}
      <div aria-hidden style={{
        position: 'absolute', top: -30, right: -30, width: 130, height: 130,
        borderRadius: '50%', background: `radial-gradient(circle, ${game.accent}35 0%, transparent 65%)`,
        filter: 'blur(25px)', pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, position: 'relative', zIndex: 1, marginBottom: 10 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 15, flexShrink: 0,
          background: `linear-gradient(135deg, ${game.accent}25, rgba(0,0,0,0.35))`,
          border: `1.5px solid ${game.accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          boxShadow: `0 4px 20px ${game.accent}20`,
        }}>{game.emoji}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em' }}>{game.title}</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, letterSpacing: '.07em', color: game.tagColor, background: game.tagColor + '18', border: `1px solid ${game.tagColor}30` }}>{game.tag}</span>
            {game.badge && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, color: game.badge.color, background: game.badge.color + '12', border: `1px solid ${game.badge.color}30`, borderRadius: 99, padding: '2px 7px', letterSpacing: '.07em' }}>
                <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
                  style={{ width: 4, height: 4, borderRadius: '50%', background: game.badge.color, display: 'inline-block' }} />
                {game.badge.label}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', letterSpacing: '.02em' }}>{game.subtitle}</div>
        </div>

        <Zap size={15} color={game.accent} style={{ flexShrink: 0, marginTop: 4, opacity: 0.8 }} />
      </div>

      {/* Description */}
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5, position: 'relative', zIndex: 1, marginBottom: 12, paddingLeft: 65 }}>
        {game.desc}
      </div>

      {/* Reward bar */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1, paddingLeft: 65 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 99, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Star size={9} color="#FBBF24" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24' }}>+{game.xp} XP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 99, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Trophy size={9} color="#D4AF37" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37' }}>+{game.coins} ₳</span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div style={{ position: 'absolute', bottom: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${game.accent}55, transparent)` }} />
    </motion.button>
  )
}

function MissionTile({ mission, index, onSelect }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 + index * 0.07, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(mission.id)}
      style={{
        width: '100%', padding: '18px 20px 16px',
        borderRadius: 20, background: mission.colorDim,
        border: `1px solid ${mission.border}`, cursor: 'pointer',
        textAlign: 'left', position: 'relative', overflow: 'hidden',
        boxShadow: `0 8px 40px ${mission.glow}, inset 0 1px 0 rgba(255,255,255,0.09)`,
      }}
    >
      <div aria-hidden style={{
        position: 'absolute', top: -30, right: -30, width: 110, height: 110,
        borderRadius: '50%', background: `radial-gradient(circle, ${mission.color}30 0%, transparent 65%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 15, flexShrink: 0,
          background: `rgba(0,0,0,0.28)`, border: `1.5px solid ${mission.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>{mission.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: 3, letterSpacing: '-0.025em' }}>{mission.title}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.45 }}>{mission.tagline}</div>
        </div>
        <Zap size={15} color={mission.color} style={{ flexShrink: 0, marginTop: 4, opacity: 0.8 }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${mission.color}55, transparent)` }} />
    </motion.button>
  )
}

/* ═══ ARCADE HUB ═══════════════════════════════════ */
export default function ArcadeHub() {
  const { arcadeOpen, closeArcade, selectMission } = useArcadeStore()
  const openArena = useArenaStore(s => s.open)
  const [boardroomOpen, setBoardroomOpen] = useState(false)
  const [meltdownOpen, setMeltdownOpen] = useState(false)
  const [rivalsOpen, setRivalsOpen] = useState(false)

  const handlers = {
    arena:    () => { closeArcade(); openArena() },
    rivals:   () => { closeArcade(); setRivalsOpen(true) },
    boardroom:() => { closeArcade(); setBoardroomOpen(true) },
    meltdown: () => { closeArcade(); setMeltdownOpen(true) },
  }

  return (
    <>
    <AnimatePresence>
      {arcadeOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="arcade-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeArcade}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(2,4,16,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          />

          {/* Panel */}
          <motion.div
            key="arcade-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(440px, 94vw)', zIndex: 201,
              background: 'rgba(6,8,26,0.85)',
              backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
              borderLeft: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '-24px 0 100px rgba(0,0,0,0.70)',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Ambient glows */}
            <div aria-hidden style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,63,94,0.14) 0%, transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', top: '40%', left: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            {/* ── Header ── */}
            <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 13,
                    background: 'linear-gradient(135deg, #F43F5E, #6366F1 60%, #10B981)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    boxShadow: '0 6px 24px rgba(244,63,94,0.35)',
                  }}>🕹️</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.1 }}>Arcade Hub</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 2, letterSpacing: '.02em' }}>Where knowledge becomes competition</div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.92 }}
                  onClick={closeArcade}
                  style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Stats strip */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 12, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)' }}>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', letterSpacing: '.05em' }}>6 LIVE</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}>
                  <Star size={10} color="#FBBF24" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#FBBF24' }}>UP TO 200 XP</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 12, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)' }}>
                  <Trophy size={10} color="#D4AF37" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37' }}>500 ₳ MAX</span>
                </div>
              </div>
            </div>

            {/* ── Game tiles ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>

              {/* Section label */}
              <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.22)', letterSpacing: '.12em', textTransform: 'uppercase', padding: '2px 4px', marginBottom: 2 }}>CORE GAMES</div>

              {GAMES.map((g, i) => (
                <GameTile key={g.id} game={g} index={i} onClick={handlers[g.id]} />
              ))}

              {/* Section label */}
              {Object.values(MISSIONS).length > 0 && (
                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.22)', letterSpacing: '.12em', textTransform: 'uppercase', padding: '2px 4px', marginBottom: 2, marginTop: 6 }}>AI MISSIONS</div>
              )}

              {Object.values(MISSIONS).map((mission, i) => (
                <MissionTile key={mission.id} mission={mission} index={i + GAMES.length}
                  onSelect={(id) => { selectMission(id) }} />
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', lineHeight: 1.55, margin: 0, textAlign: 'center' }}>
                Every game is powered by Aeva AI — the challenges adapt to your knowledge level.<br />
                XP and coins unlock upgrades in your Knowledge Portfolio.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>{rivalsOpen && <RivalsGame onClose={() => setRivalsOpen(false)} />}</AnimatePresence>
    <AnimatePresence>{boardroomOpen && <BoardroomGame onClose={() => setBoardroomOpen(false)} />}</AnimatePresence>
    <AnimatePresence>{meltdownOpen && <MeltdownGame onClose={() => setMeltdownOpen(false)} />}</AnimatePresence>
    <Arena />
    </>
  )
}
