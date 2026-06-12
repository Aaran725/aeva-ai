/**
 * StudyRoom.jsx — Real-time collaborative study rooms
 * 5 modes: Silent Grind | Battle Mode | Weak Spot Hunt | Speed Round | Tag Team
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudyRoomStore, SLOT_COLORS } from './studyRoomStore'
import { useXPStore } from './xpStore'
import { supabase } from './supabase'
import { GROQ_URL, nextGroqKey } from './groqClient'
import {
  X, Users, Zap, Clock, Copy, Check, Star, Send,
  Minimize2, ArrowLeft, Trophy, Brain, Flame, Eye,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

async function getMyIdentity() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const name = localStorage.getItem('aeva_display_name') || user.email?.split('@')[0] || 'Studier'
      return { userId: user.id, displayName: name }
    }
  } catch (_) {}
  const anon = localStorage.getItem('aeva_anon_id') || `anon-${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem('aeva_anon_id', anon)
  const name = localStorage.getItem('aeva_display_name') || 'Studier'
  return { userId: anon, displayName: name }
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'silent',
    icon: '🎧',
    label: 'Silent Grind',
    tagline: 'Focus-only. No questions.',
    desc: 'Pure deep work. Timer, orbs, and collective energy — nothing more.',
    accent: '#6366F1',
    stat: 'Focus %',
    best: 'Mixed subjects, deep focus',
  },
  {
    id: 'battle',
    icon: '⚔️',
    label: 'Battle Mode',
    tagline: 'AI drops a question every break.',
    desc: 'Race to answer. Stars awarded by AI. First to answer earns speed bonus XP.',
    accent: '#F43F5E',
    stat: 'Stars',
    best: 'Same subject, recall',
  },
  {
    id: 'weakspot',
    icon: '🎯',
    label: 'Weak Spot Hunt',
    tagline: 'Questions target misunderstood concepts.',
    desc: 'AI probes the gaps. Harder questions, medium pressure. Expose what you don\'t know.',
    accent: '#F59E0B',
    stat: 'Gaps closed',
    best: 'Pre-exam revision',
  },
  {
    id: 'speed',
    icon: '⚡',
    label: 'Speed Round',
    tagline: '10 rapid-fire questions, 15s each.',
    desc: 'Multiple choice. First to tap the right answer wins the point. Pure reflex + knowledge.',
    accent: '#10B981',
    stat: 'Correct / 10',
    best: 'Facts, definitions, formulas',
  },
  {
    id: 'tagteam',
    icon: '🤝',
    label: 'Tag Team',
    tagline: 'Build one answer together.',
    desc: 'Aeva splits a question into parts — one per person. Scored as a unit. Forces you to read each other.',
    accent: '#8B5CF6',
    stat: 'Group stars',
    best: 'History, Law, Business, essays',
  },
]

// ─── Shared sub-components ────────────────────────────────────────────────────

function MemberOrb({ member, size = 52, showName = true, myUserId, badge, goal, reaction }) {
  const col = member.color || SLOT_COLORS[0]
  const isWorking = member.status === 'working'
  const isMe = member.userId === myUserId
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
      {isMe && (
        <div style={{ position: 'absolute', top: -6, right: -4, background: col.bg, borderRadius: 6, fontSize: 9, padding: '1px 5px', color: '#fff', fontWeight: 700, zIndex: 1 }}>YOU</div>
      )}
      {badge && (
        <div style={{ position: 'absolute', top: -6, left: -4, background: '#F59E0B', borderRadius: 6, fontSize: 9, padding: '1px 5px', color: '#000', fontWeight: 800, zIndex: 1 }}>{badge}</div>
      )}
      {/* Reaction float */}
      <AnimatePresence>
        {reaction && (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -36, scale: 1.3 }}
            exit={{ opacity: 0, y: -52, scale: 0.8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: 20, pointerEvents: 'none', zIndex: 10 }}
          >
            {reaction.emoji}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        animate={isWorking ? { boxShadow: [`0 0 0px ${col.glow}`, `0 0 20px ${col.glow}`, `0 0 0px ${col.glow}`] } : { boxShadow: `0 0 0px ${col.dim}` }}
        transition={isWorking ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: isWorking ? col.bg : 'rgba(255,255,255,0.07)',
          border: `2px solid ${isWorking ? col.bg : 'rgba(255,255,255,0.13)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.36, fontWeight: 700, color: isWorking ? '#fff' : 'rgba(255,255,255,0.4)',
          transition: 'background 0.5s, border 0.5s', userSelect: 'none', flexShrink: 0,
        }}
      >
        {member.displayName?.[0]?.toUpperCase() || '?'}
      </motion.div>
      {showName && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', maxWidth: size + 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
          {member.displayName}
        </span>
      )}
      {goal && (
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', maxWidth: size + 32, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.2 }}>
          {goal}
        </span>
      )}
    </div>
  )
}

function EnergyBar({ energy }) {
  const color = energy >= 80 ? '#10B981' : energy >= 50 ? '#F59E0B' : '#F43F5E'
  const label = energy >= 80 ? 'Locked in 🔥' : energy >= 50 ? 'Getting there' : 'Wake up'
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Collective Energy</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div animate={{ width: `${energy}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
  )
}

function FeedItem({ item }) {
  const ago = Math.round((Date.now() - item.time) / 1000)
  const agoStr = ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{item.emoji || '💬'}</span>
      <span style={{ fontSize: 11, color: item.isAeva ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.5)', flex: 1, lineHeight: 1.45, fontStyle: item.isAeva ? 'italic' : 'normal' }}>{item.text}</span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: 2 }}>{agoStr}</span>
    </motion.div>
  )
}

function StarRow({ count, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3].map(i => (
        <Star key={i} size={size} fill={i <= count ? '#F59E0B' : 'none'} color={i <= count ? '#F59E0B' : 'rgba(255,255,255,0.2)'} />
      ))}
    </span>
  )
}

function XPBar({ label, xp, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((xp / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{Math.round(xp)} XP</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
  )
}

// ─── Squad Panel (right sidebar during active session) ────────────────────────

function SquadPanel({ members, myUserId, mode, answers, speedRound, sessionNumber, totalSessions, timerPhase, compact = false }) {
  const scores = speedRound?.scores || {}

  // Sort: leader first (highest focus %)
  const sorted = [...members].sort((a, b) => {
    const aF = a.stats?.totalSeconds > 0 ? a.stats.focusSeconds / a.stats.totalSeconds : 0
    const bF = b.stats?.totalSeconds > 0 ? b.stats.focusSeconds / b.stats.totalSeconds : 0
    return bF - aF
  })

  const getModeScore = (m) => {
    if (mode === 'speed')   return { val: scores[m.userId] || 0, label: 'pts', color: '#10B981' }
    if (mode === 'battle' || mode === 'weakspot') return { val: m.stats?.battlesStarsTotal || 0, label: '★', color: '#F59E0B' }
    if (mode === 'tagteam') return { val: m.stats?.tagGroupScores?.length || 0, label: 'rounds', color: '#8B5CF6' }
    return null
  }

  const totalXP = (m) => Math.round((m.stats?.xp?.focus || 0) + (m.stats?.xp?.battles || 0))

  const collectiveEnergy = members.length
    ? Math.round(members.filter(m => m.status === 'working').length / members.length * 100)
    : 0

  const energyColor = collectiveEnergy >= 80 ? '#10B981' : collectiveEnergy >= 50 ? '#F59E0B' : '#F43F5E'

  if (compact) {
    // Mobile: horizontal scrollable strip
    return (
      <div style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
          Squad · {members.length} members
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {sorted.map((m, i) => {
            const col = m.color || SLOT_COLORS[0]
            const focusPct = m.stats?.totalSeconds > 0 ? Math.round(m.stats.focusSeconds / m.stats.totalSeconds * 100) : 0
            const isMe = m.userId === myUserId
            const isLeader = i === 0 && members.length > 1
            const modeScore = getModeScore(m)
            return (
              <div key={m.userId} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60 }}>
                <div style={{ position: 'relative' }}>
                  {isLeader && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }}>👑</div>}
                  <motion.div
                    animate={m.status === 'working' ? { boxShadow: [`0 0 0px ${col.glow}`, `0 0 10px ${col.glow}`, `0 0 0px ${col.glow}`] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: m.status === 'working' ? col.bg : 'rgba(255,255,255,0.08)', border: `2px solid ${m.status === 'working' ? col.bg : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {m.displayName?.[0]?.toUpperCase() || '?'}
                  </motion.div>
                </div>
                <div style={{ fontSize: 9, color: isMe ? col.bg : 'rgba(255,255,255,0.50)', fontWeight: isMe ? 700 : 500, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {isMe ? 'You' : m.displayName}
                </div>
                <div style={{ width: 44, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${focusPct}%` }} transition={{ duration: 0.8 }}
                    style={{ height: '100%', borderRadius: 99, background: focusPct >= 75 ? '#10B981' : focusPct >= 45 ? '#F59E0B' : '#F43F5E' }} />
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{focusPct}%</div>
                {modeScore && <div style={{ fontSize: 9, fontWeight: 700, color: modeScore.color }}>{modeScore.val}{modeScore.label}</div>}
              </div>
            )
          })}
        </div>
        {/* Collective energy */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${collectiveEnergy}%` }} transition={{ duration: 1 }}
              style={{ height: '100%', borderRadius: 99, background: energyColor }} />
          </div>
          <span style={{ fontSize: 9, color: energyColor, fontWeight: 700, flexShrink: 0 }}>{collectiveEnergy}% energy</span>
        </div>
      </div>
    )
  }

  // Desktop: full right panel
  return (
    <div style={{
      width: 200, flexShrink: 0,
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      padding: '14px 14px 14px 14px',
      display: 'flex', flexDirection: 'column', gap: 0,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>
        Squad · {members.length}
      </div>

      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
        {sorted.map((m, i) => {
          const col = m.color || SLOT_COLORS[0]
          const focusPct = m.stats?.totalSeconds > 0 ? Math.round(m.stats.focusSeconds / m.stats.totalSeconds * 100) : 0
          const focusColor = focusPct >= 75 ? '#10B981' : focusPct >= 45 ? '#F59E0B' : '#F43F5E'
          const xp = totalXP(m)
          const modeScore = getModeScore(m)
          const isMe = m.userId === myUserId
          const isLeader = i === 0 && members.length > 1

          return (
            <motion.div
              key={m.userId}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {isLeader && (
                    <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', fontSize: 9, lineHeight: 1 }}>👑</div>
                  )}
                  <motion.div
                    animate={m.status === 'working' ? { boxShadow: [`0 0 0px ${col.glow}`, `0 0 8px ${col.glow}`, `0 0 0px ${col.glow}`] } : {}}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: m.status === 'working' ? col.bg : 'rgba(255,255,255,0.08)', border: `2px solid ${m.status === 'working' ? col.bg : 'rgba(255,255,255,0.10)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {m.displayName?.[0]?.toUpperCase() || '?'}
                  </motion.div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: isMe ? 700 : 500, color: isMe ? col.bg : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isMe ? 'You' : m.displayName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: m.status === 'working' ? '#10B981' : '#F43F5E', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)' }}>{m.status === 'working' ? 'working' : 'away'}</span>
                  </div>
                </div>
              </div>

              {/* Focus bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>FOCUS</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: focusColor, fontVariantNumeric: 'tabular-nums' }}>{focusPct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${focusPct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${focusColor}99, ${focusColor})` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1, padding: '4px 6px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC', lineHeight: 1 }}>{xp}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>XP</div>
                </div>
                {modeScore && (
                  <div style={{ flex: 1, padding: '4px 6px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: modeScore.color, lineHeight: 1 }}>{modeScore.val}<span style={{ fontSize: 8 }}>{modeScore.label}</span></div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                      {mode === 'speed' ? 'pts' : mode === 'tagteam' ? 'done' : 'stars'}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

      {/* Collective Energy */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Energy</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: energyColor }}>{collectiveEnergy}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${collectiveEnergy}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: energyColor }} />
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>
          {collectiveEnergy >= 80 ? 'Everyone locked in 🔥' : collectiveEnergy >= 50 ? 'Getting there' : 'Needs focus'}
        </div>
      </div>

      {/* Round Progress */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
          Rounds
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Array.from({ length: totalSessions }).map((_, i) => {
            const done = i < sessionNumber - (timerPhase === 'work' ? 0 : 0)
            const current = i === sessionNumber - 1
            return (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: 6, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done && !current ? 'rgba(99,102,241,0.20)' : current ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${current ? 'rgba(99,102,241,0.70)' : done && !current ? 'rgba(99,102,241,0.30)' : 'rgba(255,255,255,0.08)'}`,
                color: current ? '#A5B4FC' : done && !current ? 'rgba(99,102,241,0.70)' : 'rgba(255,255,255,0.20)',
              }}>
                {done && !current ? '✓' : i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* Goal of current leader */}
      {sorted[0]?.goal && (
        <div style={{ marginTop: 14, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            👑 {sorted[0].displayName === myUserId ? 'Your' : `${sorted[0].displayName}'s`} goal
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic', lineHeight: 1.4 }}>
            {sorted[0].goal}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mode-specific session stats bars ─────────────────────────────────────────

function SilentStatsBar({ members, myUserId }) {
  const { getCollectiveEnergy } = useStudyRoomStore()
  const energy = getCollectiveEnergy()
  return (
    <div style={{ marginBottom: 14 }}>
      <EnergyBar energy={energy} />
    </div>
  )
}

function BattleStatsBar({ members, answers }) {
  const sorted = [...members].sort((a, b) => {
    const aStars = (a.stats?.battlesStarsTotal || 0)
    const bStars = (b.stats?.battlesStarsTotal || 0)
    return bStars - aStars
  })
  return (
    <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'rgba(244,63,94,0.7)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>⚔️ Battle Leaderboard</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {sorted.map((m, i) => {
          const stars = m.stats?.battlesStarsTotal || 0
          const col = m.color || SLOT_COLORS[0]
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>#{i + 1}</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.bg }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.displayName}</span>
              <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>{stars}★</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeakSpotStatsBar({ members, currentQuestion }) {
  return (
    <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'rgba(245,158,11,0.7)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6 }}>🎯 Weak Spot Hunt Active</div>
      {currentQuestion ? (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Targeting misunderstood concepts — questions get harder each round</p>
      ) : (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>AI will probe your weak topics at each break</p>
      )}
    </div>
  )
}

function SpeedStatsBar({ speedRound, members, myUserId }) {
  if (!speedRound) return (
    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(16,185,129,0.7)' }}>⚡ Speed Round fires at each break — 10 questions, 15s each</div>
    </div>
  )
  const scores = speedRound.scores || {}
  const sorted = [...members].sort((a, b) => (scores[b.userId] || 0) - (scores[a.userId] || 0))
  return (
    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'rgba(16,185,129,0.7)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>⚡ Speed Scores</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {sorted.map((m, i) => {
          const pts = scores[m.userId] || 0
          const total = speedRound.questions?.length || 10
          const col = m.color || SLOT_COLORS[0]
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>#{i + 1}</span>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.bg }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{m.displayName}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>{pts}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TagTeamStatsBar({ tagRound, members }) {
  if (!tagRound) return (
    <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(139,92,246,0.7)' }}>🤝 Tag Team fires at each break — build the answer together</div>
    </div>
  )
  const submitted = Object.keys(tagRound.contributions || {}).length
  const total = tagRound.parts?.length || members.length
  return (
    <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.7)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>🤝 Tag Team Progress</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <div style={{ height: '100%', width: `${(submitted / total) * 100}%`, borderRadius: 99, background: '#8B5CF6', transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{submitted}/{total} parts</span>
        {tagRound.groupScore && <span style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6' }}>{'★'.repeat(tagRound.groupScore)}</span>}
      </div>
    </div>
  )
}

// ─── Screen: Entry ────────────────────────────────────────────────────────────

function EntryScreen({ onCreate, onJoin }) {
  return (
    <motion.div key="entry" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🧑‍💻</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: -0.5 }}>Study Together</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0' }}>Real-time rooms. Synced timers. Aeva watching.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {MODES.map(m => (
          <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{m.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{m.tagline}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.accent }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.3 }}>{m.stat}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onCreate}
          style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', cursor: 'pointer' }}>
          Create Room
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onJoin}
          style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 600, fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
          Join Room
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Screen: Create ───────────────────────────────────────────────────────────

function CreateScreen({ onBack }) {
  const createRoom = useStudyRoomStore(s => s.createRoom)
  const [selectedMode, setMode] = useState('battle')
  const [subject, setSubject] = useState('')
  const [workMins, setWork] = useState(25)
  const [breakMins, setBreak] = useState(5)
  const [sessions, setSessions] = useState(4)
  const [loading, setLoading] = useState(false)
  const modeInfo = MODES.find(m => m.id === selectedMode)

  const handleCreate = async () => {
    setLoading(true)
    const { userId, displayName } = await getMyIdentity()
    await createRoom({ mode: selectedMode, workMins, breakMins, totalSessions: sessions, subject, userId, displayName, orbPersonality: 'balanced' })
    setLoading(false)
  }

  return (
    <motion.div key="create" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 16px', letterSpacing: -0.4 }}>Set Up Your Room</h3>

      {/* Mode picker */}
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Game Mode</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {MODES.map(m => (
          <motion.button key={m.id} whileTap={{ scale: 0.98 }} onClick={() => setMode(m.id)}
            style={{ background: selectedMode === m.id ? `${m.accent}1a` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${selectedMode === m.id ? m.accent : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selectedMode === m.id ? '#fff' : 'rgba(255,255,255,0.65)', marginBottom: 1 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{m.best}</div>
            </div>
            {selectedMode === m.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.accent, flexShrink: 0 }} />}
          </motion.button>
        ))}
      </div>

      {/* Mode description */}
      {modeInfo && (
        <div style={{ background: `${modeInfo.accent}10`, border: `1px solid ${modeInfo.accent}30`, borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {modeInfo.desc}
        </div>
      )}

      {/* Subject */}
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Subject (optional)</label>
      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. A-Level Chemistry, GCSE Maths…"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

      {/* Timer controls */}
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>Session Structure</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Work', value: workMins, set: setWork, options: [15, 20, 25, 30, 45, 50], unit: 'min' },
          { label: 'Break', value: breakMins, set: setBreak, options: [5, 10, 15], unit: 'min' },
          { label: 'Rounds', value: sessions, set: setSessions, options: [2, 3, 4, 6], unit: '' },
        ].map(({ label, value, set, options, unit }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 11px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
            <select value={value} onChange={e => set(Number(e.target.value))}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
              {options.map(o => <option key={o} value={o} style={{ background: '#1a1b2e' }}>{o}{unit}</option>)}
            </select>
          </div>
        ))}
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={loading}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', cursor: loading ? 'default' : 'pointer' }}>
        {loading ? 'Creating…' : 'Create Room →'}
      </motion.button>
    </motion.div>
  )
}

// ─── Screen: Join ─────────────────────────────────────────────────────────────

function JoinScreen({ onBack }) {
  const joinRoom       = useStudyRoomStore(s => s.joinRoom)
  const prefilledCode  = useStudyRoomStore(s => s.prefilledCode)
  const [code, setCode] = useState(prefilledCode || '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Auto-fill from QR scan
  useEffect(() => {
    if (prefilledCode) {
      setCode(prefilledCode)
      useStudyRoomStore.setState({ prefilledCode: null })
    }
  }, [prefilledCode])

  const handleJoin = async () => {
    if (code.length < 6) { setError('Enter a valid room code'); return }
    setLoading(true); setError('')
    try {
      const { userId, displayName } = await getMyIdentity()
      await joinRoom(code, { userId, displayName, orbPersonality: 'balanced' })
    } catch (e) { setError('Room not found. Check the code.'); setLoading(false) }
  }

  return (
    <motion.div key="join" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Join a Room</h3>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 22px' }}>Get the code from whoever created the room.</p>
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Room Code</label>
      <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} onKeyDown={e => e.key === 'Enter' && handleJoin()}
        placeholder="e.g. AEV-421" maxLength={7}
        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: error ? 8 : 20, background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.10)'}`, color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none', letterSpacing: 3, textTransform: 'uppercase', boxSizing: 'border-box', textAlign: 'center' }} />
      {error && <p style={{ fontSize: 12, color: '#F43F5E', margin: '0 0 14px' }}>{error}</p>}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleJoin} disabled={loading}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', cursor: loading ? 'default' : 'pointer' }}>
        {loading ? 'Joining…' : 'Join Room →'}
      </motion.button>
    </motion.div>
  )
}

// ─── Screen: Lobby ────────────────────────────────────────────────────────────

function LobbyScreen() {
  const { code, members, isHost, mode, workMins, breakMins, totalSessions, subject, myUserId } = useStudyRoomStore()
  const startSession = useStudyRoomStore(s => s.startSession)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const modeInfo = MODES.find(m => m.id === mode)

  const joinUrl = `https://aeva-ai-d8i7.vercel.app/?room=${code}`
  const qrSrc   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}&bgcolor=0a0a1a&color=a5b4fc&margin=10&qzone=1`

  const copy = () => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Room Code — share with friends</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: 6, background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.35)', borderRadius: 14, padding: '10px 20px' }}>{code}</div>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={copy}
            title="Copy code" style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: copied ? '#10B981' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={() => setShowQR(v => !v)}
            title="Show QR code" style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${showQR ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.12)'}`, background: showQR ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showQR ? '#a5b4fc' : 'rgba(255,255,255,0.5)', flexShrink: 0, fontSize: 16 }}>
            □
          </motion.button>
        </div>

        {/* QR code panel */}
        <AnimatePresence>
          {showQR && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginTop: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(165,180,252,0.2)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <img src={qrSrc} alt={`QR code for ${code}`} width={160} height={160}
                  style={{ borderRadius: 12, display: 'block', imageRendering: 'pixelated' }} />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                  Scan to join instantly — opens Aeva with this room pre-loaded
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode + structure pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: `${modeInfo?.accent}15`, border: `1px solid ${modeInfo?.accent}40`, borderRadius: 99, marginBottom: 20, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
        <span>{modeInfo?.icon}</span>
        <span style={{ fontWeight: 600 }}>{modeInfo?.label}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
        <span>{workMins}m/{breakMins}m × {totalSessions}</span>
        {subject && <><span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span><span>{subject}</span></>}
      </div>

      {/* Mode description */}
      <div style={{ background: `${modeInfo?.accent}0d`, border: `1px solid ${modeInfo?.accent}25`, borderRadius: 10, padding: '8px 12px', marginBottom: 18, width: '100%', boxSizing: 'border-box', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
        {modeInfo?.desc}
      </div>

      {/* Members */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, alignSelf: 'flex-start' }}>
        {members.length} {members.length === 1 ? 'member' : 'members'} in lobby
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', width: '100%', minHeight: 70, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px', marginBottom: 24, boxSizing: 'border-box' }}>
        {members.length === 0 && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>Waiting for members…</span>}
        {members.map(m => <MemberOrb key={m.userId} member={m} size={46} showName myUserId={myUserId} />)}
      </div>

      {isHost ? (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={startSession}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', cursor: 'pointer' }}>
          Start Session →
        </motion.button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366F1' }} />
          Waiting for host to start…
        </div>
      )}
    </motion.div>
  )
}

// ─── Screen: Session ──────────────────────────────────────────────────────────

const QUICK_REACTIONS = ['🔥', '💡', '😤', '✅', '🤯']

function ChatBubble({ msg, myUserId }) {
  const isMe = msg.userId === myUserId
  const col = msg.color || SLOT_COLORS[0]
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6, marginBottom: 2 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: col.bg || 'rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {msg.displayName?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ maxWidth: '72%' }}>
        {!isMe && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginBottom: 2, paddingLeft: 4 }}>{msg.displayName}</div>}
        <div style={{
          padding: '6px 10px', borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          background: isMe ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.07)',
          border: isMe ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.09)',
          fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 1.4, wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
      </div>
    </div>
  )
}

function SessionScreen({ onMinimize }) {
  const { members, timerSeconds, timerPhase, sessionNumber, totalSessions, mode, myUserId, feed, subject, answers, currentQuestion, speedRound, tagRound, chatMessages, reactions, sessionGoals } = useStudyRoomStore()
  const setStatus = useStudyRoomStore(s => s.setStatus)
  const sendChatMessage = useStudyRoomStore(s => s.sendChatMessage)
  const sendReaction = useStudyRoomStore(s => s.sendReaction)
  const setGoal = useStudyRoomStore(s => s.setGoal)

  const [chatInput, setChatInput] = useState('')
  const [goalInput, setGoalInput] = useState('')
  const [goalSet, setGoalSet] = useState(false)
  const feedBottomRef = useRef(null)
  const chatInputRef = useRef(null)
  const [isWide, setIsWide] = useState(() => window.innerWidth > 580)

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth > 580)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const myMember = members.find(m => m.userId === myUserId)
  const isWorking = myMember?.status === 'working'

  // Auto-scroll feed + chat to bottom
  useEffect(() => { feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [feed, chatMessages])

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    sendChatMessage(chatInput)
    setChatInput('')
  }

  const handleGoalSubmit = () => {
    if (!goalInput.trim()) return
    setGoal(goalInput.trim())
    setGoalSet(true)
  }

  // Reset goal prompt each new work block
  useEffect(() => { setGoalSet(false); setGoalInput('') }, [sessionNumber])

  // Merge feed + chat into one sorted stream
  const feedAndChat = [
    ...feed.map(f => ({ ...f, _type: 'feed' })),
    ...chatMessages.map(m => ({ ...m, _type: 'chat', id: m.id, time: m.ts })),
  ].sort((a, b) => (a.time || 0) - (b.time || 0))

  const mainContent = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Round {sessionNumber} of {totalSessions}</div>
          {subject && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{subject}</div>}
        </div>
        <button onClick={onMinimize} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 9px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Minimize2 size={11} /> Minimise
        </button>
      </div>

      {/* Timer */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -3, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {fmtTime(timerSeconds)}
        </div>
        <div style={{ fontSize: 10, color: timerPhase === 'work' ? 'rgba(99,102,241,0.8)' : 'rgba(16,185,129,0.8)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>
          {timerPhase === 'work' ? '● Work' : '● Break'}
        </div>
      </div>

      {/* Mobile: compact squad strip */}
      {!isWide && (
        <SquadPanel compact members={members} myUserId={myUserId} mode={mode} answers={answers} speedRound={speedRound} sessionNumber={sessionNumber} totalSessions={totalSessions} timerPhase={timerPhase} />
      )}

      {/* Goal input (desktop only — on mobile it's a bit much) */}
      {!goalSet && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGoalSubmit()}
            placeholder="What are you working on this round?"
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
          />
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleGoalSubmit}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.35)', color: '#A5B4FC', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Set
          </motion.button>
        </div>
      )}

      {/* Status toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {['working', 'away'].map(s => {
          const active = (s === 'working' && isWorking) || (s === 'away' && !isWorking)
          return (
            <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => setStatus(s)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 10, fontWeight: 600, fontSize: 11, background: active ? (s === 'working' ? 'rgba(99,102,241,0.22)' : 'rgba(244,63,94,0.15)') : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? (s === 'working' ? 'rgba(99,102,241,0.5)' : 'rgba(244,63,94,0.4)') : 'rgba(255,255,255,0.07)'}`, color: active ? '#fff' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {s === 'working' ? '🔥 Working' : '😴 Away'}
            </motion.button>
          )
        })}
      </div>

      {/* Quick reactions */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, justifyContent: 'center' }}>
        {QUICK_REACTIONS.map(emoji => (
          <motion.button key={emoji} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
            onClick={() => sendReaction(emoji)}
            style={{ width: 34, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {emoji}
          </motion.button>
        ))}
      </div>

      {/* Combined feed + chat */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 5 }}>Room</div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {feedAndChat.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', padding: '4px 0' }}>Activity will appear here…</div>}
          {feedAndChat.map(item =>
            item._type === 'chat'
              ? <ChatBubble key={item.id} msg={item} myUserId={myUserId} />
              : <FeedItem key={item.id} item={item} />
          )}
          <div ref={feedBottomRef} />
        </div>
      </div>

      {/* Chat input */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexShrink: 0 }}>
        <input
          ref={chatInputRef}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendChat()}
          placeholder="Message the room…"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
        />
        <motion.button whileTap={{ scale: 0.90 }} onClick={handleSendChat}
          style={{ width: 36, height: 36, borderRadius: 10, background: chatInput.trim() ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.04)', border: `1px solid ${chatInput.trim() ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, color: chatInput.trim() ? '#A5B4FC' : 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
          <Send size={13} />
        </motion.button>
      </div>
    </div>
  )

  return (
    <motion.div key="session" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', gap: 0 }}>
      {mainContent}
      {isWide && members.length > 1 && (
        <SquadPanel
          members={members} myUserId={myUserId} mode={mode}
          answers={answers} speedRound={speedRound}
          sessionNumber={sessionNumber} totalSessions={totalSessions}
          timerPhase={timerPhase}
        />
      )}
    </motion.div>
  )
}

// ─── Screen: Break (Silent mode) ─────────────────────────────────────────────

function BreakScreen() {
  const { timerSeconds, sessionNumber, feed, chatMessages, myUserId } = useStudyRoomStore()
  const sendChatMessage = useStudyRoomStore(s => s.sendChatMessage)
  const [chatInput, setChatInput] = useState('')
  const feedBottomRef = useRef(null)

  useEffect(() => { feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const handleSend = () => {
    if (!chatInput.trim()) return
    sendChatMessage(chatInput)
    setChatInput('')
  }

  const combined = [
    ...feed.map(f => ({ ...f, _type: 'feed' })),
    ...chatMessages.map(m => ({ ...m, _type: 'chat', time: m.ts })),
  ].sort((a, b) => (a.time || 0) - (b.time || 0))

  return (
    <motion.div key="break" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>☕</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>Break Time</h3>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Round {sessionNumber} done. Breathe.</p>
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: '#10B981', letterSpacing: -2, fontVariantNumeric: 'tabular-nums', marginBottom: 10, textAlign: 'center' }}>{fmtTime(timerSeconds)}</div>
      {/* Chat */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
        {combined.map(item =>
          item._type === 'chat'
            ? <ChatBubble key={item.id} msg={item} myUserId={myUserId} />
            : <FeedItem key={item.id} item={item} />
        )}
        <div ref={feedBottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Chat during break…"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <motion.button whileTap={{ scale: 0.90 }} onClick={handleSend}
          style={{ width: 36, height: 36, borderRadius: 10, background: chatInput.trim() ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${chatInput.trim() ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.08)'}`, color: chatInput.trim() ? '#6EE7B7' : 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
          <Send size={13} />
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Screen: Battle (Battle + Weak Spot Hunt) ─────────────────────────────────

function BattleScreen() {
  const { currentQuestion, answers, members, myUserId, isScoring, timerSeconds, mode } = useStudyRoomStore()
  const submitAnswer = useStudyRoomStore(s => s.submitAnswer)
  const [text, setText] = useState('')
  const [showHint, setShowHint] = useState(false)
  const myAnswer = answers[myUserId]
  const modeInfo = MODES.find(m => m.id === mode)

  if (!currentQuestion) {
    return (
      <motion.div key="battle-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: modeInfo?.accent || '#6366F1' }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Aeva is generating your question…</span>
      </motion.div>
    )
  }

  return (
    <motion.div key="battle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0 }}>

      {/* Header: mode badge + break timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: `${modeInfo?.accent}18`, border: `1px solid ${modeInfo?.accent}40`, borderRadius: 99, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          <span>{modeInfo?.icon}</span> {modeInfo?.label}
          {mode === 'weakspot' && <span style={{ fontSize: 9, background: `${modeInfo.accent}30`, color: modeInfo.accent, padding: '1px 5px', borderRadius: 99, fontWeight: 700, marginLeft: 4 }}>GAP TARGET</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>☕ {fmtTime(timerSeconds)}</div>
      </div>

      {/* Question card */}
      <div style={{ background: `${modeInfo?.accent}0d`, border: `1.5px solid ${modeInfo?.accent}30`, borderRadius: 14, padding: '14px', marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: `${modeInfo?.accent}bb`, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 }}>
          {mode === 'weakspot' ? 'Weak Spot Question' : 'Battle Question'}
        </div>
        <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{currentQuestion.question}</p>
        {currentQuestion.hint && (
          <>
            <button onClick={() => setShowHint(!showHint)} style={{ background: 'none', border: 'none', color: `${modeInfo?.accent}99`, fontSize: 11, cursor: 'pointer', padding: '7px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Eye size={11} /> {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            <AnimatePresence>
              {showHint && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ fontSize: 11, color: `${modeInfo?.accent}99`, margin: '7px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
                  💡 {currentQuestion.hint}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Member submission status */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {members.map(m => {
          const submitted = !!answers[m.userId]
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: submitted ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${submitted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 99, fontSize: 11, color: submitted ? '#10B981' : 'rgba(255,255,255,0.35)', transition: 'all 0.3s' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: m.color?.bg || SLOT_COLORS[0].bg }} />
              {m.displayName}
              {submitted && <Check size={9} />}
            </div>
          )
        })}
      </div>

      {/* Answer / submitted state */}
      {myAnswer ? (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>✓ Submitted</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StarRow count={myAnswer.stars} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>+{myAnswer.xp} XP</span>
              {myAnswer.isFirst && <span style={{ fontSize: 9, background: '#F59E0B22', border: '1px solid #F59E0B44', color: '#F59E0B', borderRadius: 99, padding: '1px 6px' }}>⚡ First</span>}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 5px', fontStyle: 'italic' }}>"{myAnswer.text}"</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0 }}>{myAnswer.feedback}</p>
        </div>
      ) : (
        <div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type your answer…" rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { if (!isScoring) submitAnswer(text) }} disabled={isScoring || !text.trim()}
            style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, background: isScoring || !text.trim() ? 'rgba(99,102,241,0.25)' : `rgba(${modeInfo?.accent?.slice(1).match(/../g).map(h => parseInt(h, 16)).join(',')},0.85)`, border: 'none', color: isScoring || !text.trim() ? 'rgba(255,255,255,0.3)' : '#fff', cursor: isScoring || !text.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {isScoring ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />Scoring…</> : <><Send size={12} /> Submit</>}
          </motion.button>
        </div>
      )}

      {/* Others' answers once you've submitted */}
      {myAnswer && Object.values(answers).filter(a => a.userId !== myUserId).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>Others</div>
          {Object.values(answers).filter(a => a.userId !== myUserId).map(a => (
            <div key={a.userId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 11px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.color?.bg || SLOT_COLORS[1].bg }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{a.displayName}</span>
                  {a.isFirst && <span style={{ fontSize: 9, color: '#F59E0B' }}>⚡</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <StarRow count={a.stars} size={11} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>+{a.xp}xp</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 3px', fontStyle: 'italic' }}>"{a.text}"</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: 0 }}>{a.feedback}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Screen: Speed Round ──────────────────────────────────────────────────────

function SpeedRoundScreen() {
  const { speedRound, members, myUserId, timerSeconds } = useStudyRoomStore()
  const submitSpeedAnswer = useStudyRoomStore(s => s.submitSpeedAnswer)
  const [selected, setSelected] = useState(null)

  const qIdx = speedRound?.currentIdx ?? 0
  const q = speedRound?.questions?.[qIdx]
  const myAnswer = speedRound?.answers?.[qIdx]?.[myUserId]
  const scores = speedRound?.scores || {}

  // Reset selection on new question
  useEffect(() => { setSelected(null) }, [qIdx])

  if (!speedRound || speedRound.phase === 'loading') {
    return (
      <motion.div key="speed-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 12 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#10B981' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>Generating 10 questions…</span>
      </motion.div>
    )
  }

  if (speedRound.phase === 'done') {
    const sorted = [...members].sort((a, b) => (scores[b.userId] || 0) - (scores[a.userId] || 0))
    return (
      <motion.div key="speed-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚡</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Speed Round Done!</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Next work session starting soon…</p>
        </div>
        {sorted.map((m, i) => {
          const pts = scores[m.userId] || 0
          const col = m.color || SLOT_COLORS[i % SLOT_COLORS.length]
          const isFirst = i === 0
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isFirst ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isFirst ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: isFirst ? '#F59E0B' : 'rgba(255,255,255,0.3)', width: 20 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.bg }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: m.userId === myUserId ? '#fff' : 'rgba(255,255,255,0.7)' }}>{m.displayName}{m.userId === myUserId ? ' (you)' : ''}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>{pts} pts</span>
            </div>
          )
        })}
      </motion.div>
    )
  }

  if (!q) return null

  const OPTION_COLORS = ['rgba(99,102,241,', 'rgba(244,63,94,', 'rgba(245,158,11,', 'rgba(16,185,129,']
  const isReveal = speedRound.phase === 'reveal'

  return (
    <motion.div key={`speed-${qIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>⚡ Speed Round</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Q{qIdx + 1}/{speedRound.questions.length}</span>
        </div>
        {/* 15s countdown ring */}
        <div style={{ position: 'relative', width: 38, height: 38 }}>
          <svg width="38" height="38" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
            <circle cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <motion.circle cx="19" cy="19" r="16" fill="none" stroke="#10B981" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 16}`}
              animate={{ strokeDashoffset: (1 - (speedRound.qTimer / 15)) * 2 * Math.PI * 16 }}
              transition={{ duration: 0.3 }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: speedRound.qTimer <= 5 ? '#F43F5E' : '#fff' }}>
            {speedRound.qTimer}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {speedRound.questions.map((_, i) => {
          const myAns = speedRound.answers?.[i]?.[myUserId]
          const done = i < qIdx
          const current = i === qIdx
          const color = myAns ? (myAns.correct ? '#10B981' : '#F43F5E') : done ? 'rgba(255,255,255,0.25)' : current ? '#10B981' : 'rgba(255,255,255,0.1)'
          return <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: color, transition: 'background 0.3s' }} />
        })}
      </div>

      {/* Question */}
      <div style={{ background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
        <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{q.q}</p>
      </div>

      {/* MC options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {(q.opts || []).map((opt, i) => {
          const myPick = myAnswer?.optionIdx === i
          const correct = q.ans === i
          let bg = `${OPTION_COLORS[i]}0.08)`
          let border = `${OPTION_COLORS[i]}0.25)`
          let color = 'rgba(255,255,255,0.65)'
          if (isReveal || myAnswer) {
            if (correct) { bg = `${OPTION_COLORS[i]}0.18)`; border = `${OPTION_COLORS[i]}0.6)`; color = '#fff' }
            else if (myPick && !correct) { bg = 'rgba(244,63,94,0.12)'; border = 'rgba(244,63,94,0.4)'; color = 'rgba(255,255,255,0.5)' }
          } else if (selected === i) {
            bg = `${OPTION_COLORS[i]}0.18)`; border = `${OPTION_COLORS[i]}0.6)`; color = '#fff'
          }
          const disabled = !!myAnswer || isReveal
          return (
            <motion.button key={i} whileTap={disabled ? {} : { scale: 0.97 }}
              onClick={() => {
                if (disabled) return
                setSelected(i)
                submitSpeedAnswer(qIdx, i)
              }}
              style={{ padding: '11px 14px', borderRadius: 10, background: bg, border: `1.5px solid ${border}`, color, fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', width: 18, flexShrink: 0 }}>
                {['A', 'B', 'C', 'D'][i]}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
              {(isReveal || myAnswer) && correct && <Check size={14} style={{ color: '#10B981', flexShrink: 0 }} />}
              {myPick && !correct && (isReveal || myAnswer) && <X size={14} style={{ color: '#F43F5E', flexShrink: 0 }} />}
            </motion.button>
          )
        })}
      </div>

      {/* Explanation on reveal */}
      {(isReveal || myAnswer) && q.exp && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          💡 {q.exp}
        </div>
      )}

      {/* Live scoreboard */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 7 }}>Live Scores</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[...members].sort((a, b) => (scores[b.userId] || 0) - (scores[a.userId] || 0)).map((m, i) => {
            const pts = scores[m.userId] || 0
            const answered = !!speedRound.answers?.[qIdx]?.[m.userId]
            return (
              <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.color?.bg || SLOT_COLORS[i].bg, opacity: answered ? 1 : 0.4 }} />
                <span style={{ fontSize: 11, color: m.userId === myUserId ? '#fff' : 'rgba(255,255,255,0.55)' }}>{m.displayName}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>{pts}</span>
                {answered && <Check size={9} style={{ color: '#10B981' }} />}
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Screen: Tag Team ─────────────────────────────────────────────────────────

function TagTeamScreen() {
  const { tagRound, members, myUserId, myDisplayName } = useStudyRoomStore()
  const submitTagPart = useStudyRoomStore(s => s.submitTagPart)
  const [text, setText] = useState('')

  if (!tagRound || tagRound.phase === 'loading') {
    return (
      <motion.div key="tag-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 12 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#8B5CF6' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>Building your question…</span>
      </motion.div>
    )
  }

  const myPart = tagRound.parts?.find(p => p.assignedUserId === myUserId)
  const myContrib = tagRound.contributions?.[myUserId]
  const allSubmitted = Object.keys(tagRound.contributions || {}).length >= (tagRound.parts?.length || members.length)

  return (
    <motion.div key="tagteam" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#8B5CF6' }}>🤝 Tag Team</span>
        {tagRound.phase === 'scoring' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6' }} />
            Aeva is scoring…
          </div>
        )}
      </div>

      {/* The question */}
      <div style={{ background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: 'rgba(139,92,246,0.7)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 }}>The Question</div>
        <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{tagRound.question}</p>
      </div>

      {/* Parts assignment overview */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>Who Answers What</div>
        {tagRound.parts?.map(part => {
          const isMyPart = part.assignedUserId === myUserId
          const submitted = !!tagRound.contributions?.[part.assignedUserId]
          const member = members.find(m => m.userId === part.assignedUserId)
          const col = member?.color || SLOT_COLORS[0]
          return (
            <div key={part.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: isMyPart ? '6px 8px' : '4px 0', background: isMyPart ? 'rgba(139,92,246,0.08)' : 'transparent', borderRadius: isMyPart ? 8 : 0, border: isMyPart ? '1px solid rgba(139,92,246,0.2)' : 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.bg, flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isMyPart ? '#fff' : 'rgba(255,255,255,0.55)', marginBottom: 2 }}>
                  Part {part.num} — {isMyPart ? 'YOU' : part.assignedName}
                  {submitted && <Check size={10} style={{ color: '#10B981', marginLeft: 5 }} />}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{part.task}</div>
                {part.hint && isMyPart && !submitted && (
                  <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.6)', marginTop: 3, fontStyle: 'italic' }}>💡 {part.hint}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* My answer input */}
      {myPart && (
        myContrib ? (
          <div style={{ background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 12, padding: '10px 13px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600, marginBottom: 5 }}>✓ Your part submitted</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>"{myContrib.text}"</p>
            {tagRound.memberFeedback?.[myUserId] && (
              <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <StarRow count={tagRound.memberFeedback[myUserId].stars} size={11} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>your contribution</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{tagRound.memberFeedback[myUserId].note}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.7)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 7 }}>Your Part {myPart.num}: {myPart.task}</div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your part of the answer…" rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.25)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { if (text.trim()) submitTagPart(text) }} disabled={!text.trim()}
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, background: !text.trim() ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.85)', border: 'none', color: !text.trim() ? 'rgba(255,255,255,0.3)' : '#fff', cursor: !text.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Send size={12} /> Submit My Part
            </motion.button>
          </div>
        )
      )}

      {/* Group result */}
      {tagRound.groupScore && (
        <div style={{ background: 'rgba(139,92,246,0.1)', border: '1.5px solid rgba(139,92,246,0.35)', borderRadius: 12, padding: '14px', marginTop: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{'⭐'.repeat(tagRound.groupScore)}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Group Score: {tagRound.groupScore}/5</div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>"{tagRound.groupFeedback}"</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Screen: Stats ────────────────────────────────────────────────────────────

function StatsScreen() {
  const { myStats, members, myUserId, myColor, subject, totalSessions, mode } = useStudyRoomStore()
  const closeRoom = useStudyRoomStore(s => s.closeRoom)
  const addXP = useXPStore(s => s.addDirectXP)
  const [aevaVerdict, setAevaVerdict] = useState('')
  const [verdictLoading, setVerdictLoading] = useState(true)
  const xpApplied = useRef(false)
  const modeInfo = MODES.find(m => m.id === mode)

  const totalXP = Math.round((myStats.xp.focus || 0) + (myStats.xp.battles || 0) + (myStats.xp.nodes || 0) + (myStats.xp.bonus || 0))
  const focusPct = myStats.totalSeconds > 0 ? Math.round((myStats.focusSeconds / myStats.totalSeconds) * 100) : 0
  const focusColor = focusPct >= 80 ? '#10B981' : focusPct >= 55 ? '#F59E0B' : '#F43F5E'
  const focusLabel = focusPct >= 80 ? 'Elite Focus' : focusPct >= 55 ? 'Solid Session' : 'Distracted'

  // Mode-specific stats
  const battleAvg = myStats.battlesEntered > 0 ? (myStats.battlesStarsTotal / myStats.battlesEntered).toFixed(1) : '—'
  const speedAcc = myStats.speedTotal > 0 ? `${myStats.speedCorrect}/${myStats.speedTotal}` : '—'
  const tagAvg = myStats.tagGroupScores.length > 0 ? (myStats.tagGroupScores.reduce((a, b) => a + b, 0) / myStats.tagGroupScores.length).toFixed(1) : '—'

  useEffect(() => {
    if (!xpApplied.current) {
      xpApplied.current = true
      if (totalXP > 0) addXP(totalXP, `Study Room${subject ? ` — ${subject}` : ''}`)
    }
  }, [])

  useEffect(() => {
    const gen = async () => {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content:
              `You are Aeva. Write a 2-sentence session verdict. Be direct, no emojis.
Mode: ${modeInfo?.label}. Focus: ${focusPct}%. XP: ${totalXP}. Subject: ${subject || 'mixed'}.
${mode === 'speed' ? `Speed: ${speedAcc} correct, peak streak ${myStats.speedPeakStreak}.` : ''}
${mode === 'tagteam' ? `Tag Team avg: ${tagAvg}/5 stars.` : ''}
${mode !== 'silent' ? `Battle avg: ${battleAvg}★.` : ''}
Second sentence: one specific next step.` }],
            temperature: 0.75, max_tokens: 100,
          }),
        })
        const d = await res.json()
        setAevaVerdict(d.choices[0]?.message?.content?.trim() || '')
      } catch (_) {}
      setVerdictLoading(false)
    }
    gen()
  }, [])

  const xpMax = Math.max(totalXP, 80)

  // Build mode-specific stat grid
  const statGrid = [
    { icon: '🔥', label: 'Peak Streak', value: `${myStats.peakStreak}s` },
    mode === 'speed'    ? { icon: '⚡', label: 'Speed Correct', value: speedAcc } :
    mode === 'tagteam'  ? { icon: '🤝', label: 'Group Avg', value: `${tagAvg}★` } :
    mode === 'silent'   ? { icon: '😴', label: 'Focus Time', value: `${Math.floor(myStats.focusSeconds / 60)}m` } :
                          { icon: '⚔️', label: 'Battle Avg', value: `${battleAvg}★` },
    { icon: '📚', label: 'Nodes Done', value: myStats.nodesCompleted.length },
    { icon: '⚡', label: 'Total XP', value: `+${totalXP}` },
  ]

  return (
    <motion.div key="stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>🏁</div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: '0 0 2px', letterSpacing: -0.5 }}>Session Complete</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: `${modeInfo?.accent}18`, border: `1px solid ${modeInfo?.accent}35`, borderRadius: 99, fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
          {modeInfo?.icon} {modeInfo?.label}
          {subject && <><span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>{subject}</>}
        </div>
      </div>

      {/* Focus hero */}
      <div style={{ background: `${focusColor}10`, border: `1.5px solid ${focusColor}30`, borderRadius: 14, padding: '16px', textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: focusColor, letterSpacing: -3, lineHeight: 1 }}>{focusPct}%</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: focusColor, marginTop: 3, marginBottom: 2 }}>{focusLabel}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Focus — {Math.floor(myStats.focusSeconds / 60)}m of {Math.floor(myStats.totalSeconds / 60)}m total</div>
      </div>

      {/* Mode-specific extra stats for speed/tag */}
      {mode === 'speed' && myStats.speedTotal > 0 && (
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(16,185,129,0.7)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>⚡ Speed Round</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Correct', value: `${myStats.speedCorrect}/${myStats.speedTotal}` },
              { label: 'Accuracy', value: `${Math.round((myStats.speedCorrect / myStats.speedTotal) * 100)}%` },
              { label: 'Peak Streak', value: `${myStats.speedPeakStreak}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'tagteam' && myStats.tagGroupScores.length > 0 && (
        <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.7)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>🤝 Tag Team</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Parts Written', value: myStats.tagPartsSubmitted },
              { label: 'Group Avg', value: `${tagAvg}★` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2×2 stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {statGrid.map(({ icon, label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 16, marginBottom: 5 }}>{icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* XP breakdown */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>XP Breakdown</div>
        <XPBar label="Focus (2 XP/min)" xp={myStats.xp.focus} max={xpMax} color="#6366F1" />
        <XPBar label={mode === 'tagteam' ? 'Tag Team Parts' : mode === 'speed' ? 'Speed Points' : 'Battle Stars'} xp={myStats.xp.battles} max={xpMax} color={modeInfo?.accent || '#F43F5E'} />
        <XPBar label="Nodes Completed" xp={myStats.xp.nodes} max={xpMax} color="#10B981" />
        <XPBar label="Focus Bonus" xp={myStats.xp.bonus} max={xpMax} color="#F59E0B" />
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>+{totalXP} XP</span>
        </div>
      </div>

      {/* Head-to-head */}
      {members.filter(m => m.userId !== myUserId).length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>Head-to-Head Focus</div>
          {members.filter(m => m.userId !== myUserId).map(m => {
            const theirFocus = (m.stats?.totalSeconds || 0) > 0 ? Math.round((m.stats.focusSeconds / m.stats.totalSeconds) * 100) : 0
            const myWins = focusPct >= theirFocus
            return (
              <div key={m.userId} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.color?.bg || SLOT_COLORS[1].bg }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{m.displayName}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: myWins ? '#10B981' : '#F43F5E' }}>{myWins ? 'You led' : 'They led'}</span>
                </div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <div style={{ flex: focusPct, height: 5, background: myColor?.bg || SLOT_COLORS[0].bg, borderRadius: 99, minWidth: 4 }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>vs</span>
                  <div style={{ flex: theirFocus, height: 5, background: m.color?.bg || SLOT_COLORS[1].bg, borderRadius: 99, minWidth: 4 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>You {focusPct}%</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{theirFocus}% {m.displayName}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Aeva verdict */}
      <div style={{ background: 'rgba(167,139,250,0.06)', border: '1.5px solid rgba(167,139,250,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: 'rgba(167,139,250,0.6)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Brain size={10} /> Aeva's Verdict
        </div>
        {verdictLoading ? (
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(167,139,250,0.5)' }} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>"{aevaVerdict || 'Good session. Keep the momentum.'}"</p>
        )}
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={closeRoom}
        style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
        Leave Room
      </motion.button>
    </motion.div>
  )
}

// ─── Floating Pill ─────────────────────────────────────────────────────────────

function FloatingPill() {
  const { code, timerSeconds, members, timerPhase } = useStudyRoomStore()
  const closeRoom = useStudyRoomStore(s => s.closeRoom)
  const restore = () => useStudyRoomStore.setState({ isMinimized: false })

  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.9 }}
      style={{ position: 'fixed', bottom: 90, right: 16, zIndex: 9999, background: 'rgba(10,10,26,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'pointer' }}
      onClick={restore}>
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 8, height: 8, borderRadius: '50%', background: timerPhase === 'work' ? '#6366F1' : '#10B981', flexShrink: 0 }} />
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{fmtTime(timerSeconds)}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>{code}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
        <Users size={11} /> {members.length}
      </div>
      <button onClick={e => { e.stopPropagation(); closeRoom() }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 2, display: 'flex', marginLeft: 2 }}>
        <X size={13} />
      </button>
    </motion.div>
  )
}

// ─── Main StudyRoom modal ─────────────────────────────────────────────────────

export default function StudyRoom() {
  const { isOpen, isMinimized, phase, prefilledCode } = useStudyRoomStore()
  const closeRoom = useStudyRoomStore(s => s.closeRoom)
  const [localScreen, setLocalScreen] = useState('entry')

  useEffect(() => {
    if (isOpen && phase === 'idle') {
      setLocalScreen(prefilledCode ? 'join' : 'entry')
    }
  }, [isOpen, prefilledCode])

  if (!isOpen) return null

  if (isMinimized) {
    return <AnimatePresence><FloatingPill key="pill" /></AnimatePresence>
  }

  const minimize = () => useStudyRoomStore.setState({ isMinimized: true })
  const screenKey = phase !== 'idle' ? phase : localScreen

  return (
    <AnimatePresence>
      <motion.div key="studyroom-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget && phase === 'idle') closeRoom() }}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>

        <motion.div key="studyroom-panel" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{ width: '100%', maxWidth: ['session','break','battle','speed','tagteam'].includes(phase) ? 680 : 440, maxHeight: '92vh', background: 'rgba(8,8,22,0.98)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'max-width 0.3s ease' }}>

          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 10px', borderBottom: phase !== 'idle' ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>🧑‍💻</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: -0.3 }}>Study Room</span>
              {phase !== 'idle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, fontSize: 9, color: '#10B981', fontWeight: 700 }}>
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ width: 4, height: 4, borderRadius: '50%', background: '#10B981' }} />
                  LIVE
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {phase !== 'idle' && phase !== 'stats' && (
                <button onClick={minimize} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                  <Minimize2 size={13} />
                </button>
              )}
              <button onClick={closeRoom} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
              {screenKey === 'entry'   && <EntryScreen   key="entry"   onCreate={() => setLocalScreen('create')} onJoin={() => setLocalScreen('join')} />}
              {screenKey === 'create'  && <CreateScreen  key="create"  onBack={() => setLocalScreen('entry')} />}
              {screenKey === 'join'    && <JoinScreen    key="join"    onBack={() => setLocalScreen('entry')} />}
              {screenKey === 'lobby'   && <LobbyScreen   key="lobby" />}
              {screenKey === 'session' && <SessionScreen key="session" onMinimize={minimize} />}
              {screenKey === 'break'   && <BreakScreen   key="break" />}
              {screenKey === 'battle'  && <BattleScreen  key="battle" />}
              {screenKey === 'speed'   && <SpeedRoundScreen key="speed" />}
              {screenKey === 'tagteam' && <TagTeamScreen key="tagteam" />}
              {screenKey === 'stats'   && <StatsScreen   key="stats" />}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── StudyRoomButton ──────────────────────────────────────────────────────────

export function StudyRoomButton() {
  const open    = useStudyRoomStore(s => s.open)
  const phase   = useStudyRoomStore(s => s.phase)
  const isOpen  = useStudyRoomStore(s => s.isOpen)
  const live    = isOpen && phase !== 'idle'

  return (
    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.90 }} onClick={open}
      title="Study Together — create or join a live study room"
      style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: live ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.10)', border: live ? '1.5px solid rgba(99,102,241,0.55)' : '1.5px solid rgba(99,102,241,0.28)', cursor: 'pointer', color: live ? '#a5b4fc' : 'rgba(99,102,241,0.75)', position: 'relative' }}>
      <Users size={14} strokeWidth={2} />
      {live && (
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: '#10B981', border: '1px solid rgba(8,8,22,0.8)' }} />
      )}
    </motion.button>
  )
}
