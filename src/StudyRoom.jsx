/**
 * StudyRoom.jsx — Real-time collaborative study rooms
 * Screens: Entry → Create/Join → Lobby → Session → Battle → Stats
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudyRoomStore, SLOT_COLORS } from './studyRoomStore'
import { useXPStore } from './xpStore'
import { supabase } from './supabase'
import { GROQ_URL, nextGroqKey } from './groqClient'
import {
  X, Users, Zap, Clock, Copy, Check, Star, Send,
  Minimize2, ArrowLeft, ChevronRight, Trophy, Brain,
  Flame, Activity, Target, Radio, Swords, Eye,
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
    tagline: 'Focus-only. No questions, no noise.',
    desc: 'Pure deep work. Timer, orbs, and collective energy — nothing more.',
    accent: '#6366F1',
  },
  {
    id: 'battle',
    icon: '⚔️',
    label: 'Battle Mode',
    tagline: 'AI drops a question every break.',
    desc: 'Race to answer. Stars awarded by AI. Fast answers earn bonus XP.',
    accent: '#F43F5E',
  },
  {
    id: 'weakspot',
    icon: '🎯',
    label: 'Weak Spot Hunt',
    tagline: 'Questions target what you get wrong.',
    desc: 'AI probes misunderstood concepts. Expose gaps. Close them.',
    accent: '#F59E0B',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberOrb({ member, size = 52, showName = true, myUserId }) {
  const col = member.color || SLOT_COLORS[0]
  const isWorking = member.status === 'working'
  const isMe = member.userId === myUserId
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
      {isMe && (
        <div style={{
          position: 'absolute', top: -6, right: -4, background: col.bg,
          borderRadius: 6, fontSize: 9, padding: '1px 5px', color: '#fff',
          fontWeight: 700, letterSpacing: 0.3, zIndex: 1,
        }}>YOU</div>
      )}
      <motion.div
        animate={isWorking
          ? { boxShadow: [`0 0 0px ${col.glow}`, `0 0 20px ${col.glow}`, `0 0 0px ${col.glow}`] }
          : { boxShadow: `0 0 0px ${col.dim}` }
        }
        transition={isWorking ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: isWorking ? col.bg : 'rgba(255,255,255,0.07)',
          border: `2px solid ${isWorking ? col.bg : 'rgba(255,255,255,0.13)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.36, fontWeight: 700, color: isWorking ? '#fff' : 'rgba(255,255,255,0.4)',
          transition: 'background 0.5s, border 0.5s, color 0.5s',
          userSelect: 'none', flexShrink: 0,
        }}
      >
        {member.displayName?.[0]?.toUpperCase() || '?'}
      </motion.div>
      {showName && (
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,0.45)', maxWidth: size + 16,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textAlign: 'center', letterSpacing: 0.2,
        }}>
          {member.displayName}
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
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Collective Energy
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${energy}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }}
        />
      </div>
    </div>
  )
}

function FeedItem({ item }) {
  const ago = Math.round((Date.now() - item.time) / 1000)
  const agoStr = ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{item.emoji || '💬'}</span>
      <span style={{
        fontSize: 12, color: item.isAeva ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.55)',
        flex: 1, lineHeight: 1.45, fontStyle: item.isAeva ? 'italic' : 'normal',
      }}>
        {item.text}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: 2 }}>
        {agoStr}
      </span>
    </motion.div>
  )
}

function StarRow({ count }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3].map(i => (
        <Star key={i} size={13} fill={i <= count ? '#F59E0B' : 'none'} color={i <= count ? '#F59E0B' : 'rgba(255,255,255,0.2)'} />
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
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Screen: Entry ────────────────────────────────────────────────────────────

function EntryScreen({ onCreate, onJoin, onClose }) {
  return (
    <motion.div key="entry" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🧑‍💻</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: -0.5 }}>
          Study Together
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0', lineHeight: 1.5 }}>
          Real-time rooms. Synced timers. Aeva watching.
        </p>
      </div>

      {/* Mode previews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 28 }}>
        {MODES.map(m => (
          <div key={m.id} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{m.tagline}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.accent, flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onCreate}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border: 'none', color: '#fff', cursor: 'pointer', letterSpacing: -0.2,
          }}
        >
          Create Room
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onJoin}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 600, fontSize: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
          }}
        >
          Join Room
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Screen: Create ───────────────────────────────────────────────────────────

function CreateScreen({ onBack, onClose }) {
  const createRoom = useStudyRoomStore(s => s.createRoom)
  const [selectedMode, setMode] = useState('battle')
  const [subject, setSubject] = useState('')
  const [workMins, setWork] = useState(25)
  const [breakMins, setBreak] = useState(5)
  const [sessions, setSessions] = useState(4)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    const { userId, displayName } = await getMyIdentity()
    await createRoom({ mode: selectedMode, workMins, breakMins, totalSessions: sessions, subject, userId, displayName, orbPersonality: 'balanced' })
    setLoading(false)
  }

  return (
    <motion.div key="create" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0 }}>

      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0, marginBottom: 20, width: 'fit-content' }}>
        <ArrowLeft size={14} /> Back
      </button>

      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 20px', letterSpacing: -0.4 }}>
        Set Up Your Room
      </h3>

      {/* Mode picker */}
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
        Game Mode
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {MODES.map(m => (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode(m.id)}
            style={{
              background: selectedMode === m.id ? `${m.accent}1a` : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${selectedMode === m.id ? m.accent : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 18 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: selectedMode === m.id ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{m.desc}</div>
            </div>
            {selectedMode === m.id && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.accent, flexShrink: 0 }} />
            )}
          </motion.button>
        ))}
      </div>

      {/* Subject */}
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
        Subject (optional)
      </label>
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="e.g. A-Level Chemistry, GCSE Maths…"
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
          color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Timer controls */}
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>
        Session Structure
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Work', value: workMins, set: setWork, options: [15, 20, 25, 30, 45, 50], unit: 'min' },
          { label: 'Break', value: breakMins, set: setBreak, options: [5, 10, 15], unit: 'min' },
          { label: 'Rounds', value: sessions, set: setSessions, options: [2, 3, 4, 6], unit: '' },
        ].map(({ label, value, set, options, unit }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <select
              value={value}
              onChange={e => set(Number(e.target.value))}
              style={{
                width: '100%', background: 'transparent', border: 'none', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', outline: 'none',
              }}
            >
              {options.map(o => <option key={o} value={o} style={{ background: '#1a1b2e' }}>{o}{unit}</option>)}
            </select>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleCreate}
        disabled={loading}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15,
          background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border: 'none', color: '#fff', cursor: loading ? 'default' : 'pointer', letterSpacing: -0.2,
        }}
      >
        {loading ? 'Creating…' : 'Create Room →'}
      </motion.button>
    </motion.div>
  )
}

// ─── Screen: Join ─────────────────────────────────────────────────────────────

function JoinScreen({ onBack }) {
  const joinRoom = useStudyRoomStore(s => s.joinRoom)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    if (code.length < 6) { setError('Enter a valid room code'); return }
    setLoading(true)
    setError('')
    try {
      const { userId, displayName } = await getMyIdentity()
      await joinRoom(code, { userId, displayName, orbPersonality: 'balanced' })
    } catch (e) {
      setError('Room not found. Check the code.')
      setLoading(false)
    }
  }

  return (
    <motion.div key="join" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0, marginBottom: 20, width: 'fit-content' }}>
        <ArrowLeft size={14} /> Back
      </button>

      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: -0.4 }}>
        Join a Room
      </h3>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 24px' }}>
        Get the code from whoever created the room.
      </p>

      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
        Room Code
      </label>
      <input
        value={code}
        onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
        placeholder="e.g. AEV-421"
        maxLength={7}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: error ? 8 : 20,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.10)'}`,
          color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none', letterSpacing: 3,
          textTransform: 'uppercase', boxSizing: 'border-box', textAlign: 'center',
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#F43F5E', margin: '0 0 16px' }}>{error}</p>}

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleJoin}
        disabled={loading}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15,
          background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border: 'none', color: '#fff', cursor: loading ? 'default' : 'pointer',
        }}
      >
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

  const modeInfo = MODES.find(m => m.id === mode)

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 0 }}>

      {/* Code */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          Room Code — share with friends
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: 6,
            background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.35)',
            borderRadius: 14, padding: '10px 24px',
          }}>
            {code}
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            onClick={copy}
            style={{
              width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: copied ? '#10B981' : 'rgba(255,255,255,0.5)', flexShrink: 0,
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </motion.button>
        </div>
      </div>

      {/* Mode info pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
        background: `${modeInfo?.accent}15`, border: `1px solid ${modeInfo?.accent}40`,
        borderRadius: 99, marginBottom: 24, fontSize: 12, color: 'rgba(255,255,255,0.65)',
      }}>
        <span>{modeInfo?.icon}</span>
        <span style={{ fontWeight: 600 }}>{modeInfo?.label}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
        <span>{workMins}m work / {breakMins}m break × {totalSessions} rounds</span>
        {subject && <><span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span><span>{subject}</span></>}
      </div>

      {/* Member orbs */}
      <div style={{ marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase', alignSelf: 'flex-start' }}>
        {members.length} {members.length === 1 ? 'member' : 'members'} in lobby
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center',
        width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 16px',
        marginBottom: 28, boxSizing: 'border-box',
      }}>
        {members.length === 0 && (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>
            Waiting for members…
          </span>
        )}
        {members.map(m => (
          <MemberOrb key={m.userId} member={m} size={50} showName myUserId={myUserId} />
        ))}
      </div>

      {/* Start / waiting */}
      {isHost ? (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={startSession}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border: 'none', color: '#fff', cursor: 'pointer', letterSpacing: -0.2,
          }}
        >
          Start Session →
        </motion.button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366F1' }}
          />
          Waiting for host to start…
        </div>
      )}
    </motion.div>
  )
}

// ─── Screen: Session ──────────────────────────────────────────────────────────

function SessionScreen({ onMinimize }) {
  const {
    members, timerSeconds, timerPhase, sessionNumber, totalSessions,
    mode, myUserId, myDisplayName, myColor, feed, subject,
  } = useStudyRoomStore()
  const getCollectiveEnergy = useStudyRoomStore(s => s.getCollectiveEnergy)
  const setStatus = useStudyRoomStore(s => s.setStatus)

  const myMember = members.find(m => m.userId === myUserId)
  const isWorking = myMember?.status === 'working'
  const energy = getCollectiveEnergy()

  return (
    <motion.div key="session" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 0 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Round {sessionNumber} of {totalSessions}
          </div>
          {subject && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{subject}</div>}
        </div>
        <button
          onClick={onMinimize}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Minimize2 size={12} /> Minimise
        </button>
      </div>

      {/* Timer */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <motion.div
          key={timerSeconds}
          style={{
            fontSize: 56, fontWeight: 800, color: '#fff', letterSpacing: -3, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtTime(timerSeconds)}
        </motion.div>
        <div style={{
          fontSize: 11, color: timerPhase === 'work' ? 'rgba(99,102,241,0.8)' : 'rgba(16,185,129,0.8)',
          letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6, fontWeight: 600,
        }}>
          {timerPhase === 'work' ? '● Work' : '● Break'}
        </div>
      </div>

      {/* Member orbs */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
        marginBottom: 16, padding: '16px', background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
      }}>
        {members.map(m => (
          <MemberOrb key={m.userId} member={m} size={44} showName myUserId={myUserId} />
        ))}
      </div>

      {/* Collective energy */}
      <div style={{ marginBottom: 14 }}>
        <EnergyBar energy={energy} />
      </div>

      {/* Status toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['working', 'away'].map(s => {
          const active = (s === 'working' && isWorking) || (s === 'away' && !isWorking)
          return (
            <motion.button
              key={s}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatus(s)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, fontWeight: 600, fontSize: 12,
                background: active ? (s === 'working' ? 'rgba(99,102,241,0.22)' : 'rgba(244,63,94,0.15)') : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${active ? (s === 'working' ? 'rgba(99,102,241,0.5)' : 'rgba(244,63,94,0.4)') : 'rgba(255,255,255,0.07)'}`,
                color: active ? '#fff' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {s === 'working' ? '🔥 Working' : '😴 Away'}
            </motion.button>
          )
        })}
      </div>

      {/* Activity feed */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>
          Room Feed
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {feed.length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', padding: '8px 0' }}>
              Activity will appear here…
            </div>
          )}
          {feed.map(item => <FeedItem key={item.id} item={item} />)}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Screen: Break (Silent mode) ─────────────────────────────────────────────

function BreakScreen() {
  const { timerSeconds, sessionNumber, totalSessions, feed } = useStudyRoomStore()

  return (
    <motion.div key="break" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 0 }}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>☕</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Break Time</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
          Round {sessionNumber} done. Take a breath.
        </p>
      </div>

      <div style={{
        fontSize: 48, fontWeight: 800, color: '#10B981', letterSpacing: -2,
        fontVariantNumeric: 'tabular-nums', marginBottom: 28,
      }}>
        {fmtTime(timerSeconds)}
      </div>

      <div style={{ width: '100%', maxHeight: 200, overflowY: 'auto' }}>
        {feed.slice(0, 6).map(item => <FeedItem key={item.id} item={item} />)}
      </div>
    </motion.div>
  )
}

// ─── Screen: Battle ───────────────────────────────────────────────────────────

function BattleScreen() {
  const { currentQuestion, answers, members, myUserId, isScoring, timerSeconds, mode } = useStudyRoomStore()
  const submitAnswer = useStudyRoomStore(s => s.submitAnswer)
  const [text, setText] = useState('')
  const [showHint, setShowHint] = useState(false)

  const myAnswer = answers[myUserId]
  const submittedCount = Object.keys(answers).length
  const modeInfo = MODES.find(m => m.id === mode)

  if (!currentQuestion) {
    return (
      <motion.div key="battle-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#6366F1' }}
        />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Aeva is loading your question…</span>
      </motion.div>
    )
  }

  return (
    <motion.div key="battle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0 }}>

      {/* Timer + mode badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: `${modeInfo?.accent}18`, border: `1px solid ${modeInfo?.accent}40`,
          borderRadius: 99, fontSize: 11, color: 'rgba(255,255,255,0.6)',
        }}>
          <span>{modeInfo?.icon}</span> {modeInfo?.label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
          ☕ {fmtTime(timerSeconds)}
        </div>
      </div>

      {/* Question card */}
      <div style={{
        background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.25)',
        borderRadius: 14, padding: '16px 16px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          Question
        </div>
        <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
          {currentQuestion.question}
        </p>
        {currentQuestion.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.6)', fontSize: 11, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Eye size={11} /> {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        <AnimatePresence>
          {showHint && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', margin: '8px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
              💡 {currentQuestion.hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Member submission status */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {members.map(m => {
          const submitted = !!answers[m.userId]
          return (
            <div key={m.userId} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              background: submitted ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${submitted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 99, fontSize: 11, color: submitted ? '#10B981' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.3s',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color?.bg || SLOT_COLORS[0].bg }} />
              {m.displayName}
              {submitted && <Check size={10} />}
            </div>
          )
        })}
      </div>

      {/* Answer input or submitted state */}
      {myAnswer ? (
        <div style={{
          background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>✓ Submitted</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StarRow count={myAnswer.stars} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>+{myAnswer.xp} XP</span>
              {myAnswer.isFirst && <span style={{ fontSize: 10, background: '#F59E0B22', border: '1px solid #F59E0B44', color: '#F59E0B', borderRadius: 99, padding: '2px 7px' }}>⚡ First</span>}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 6px', lineHeight: 1.5, fontStyle: 'italic' }}>
            "{myAnswer.text}"
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
            {myAnswer.feedback}
          </p>
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type your answer…"
            rows={3}
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10, marginBottom: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
              color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical',
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { if (!isScoring) submitAnswer(text) }}
            disabled={isScoring || !text.trim()}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: isScoring || !text.trim() ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.85)',
              border: 'none', color: isScoring || !text.trim() ? 'rgba(255,255,255,0.3)' : '#fff',
              cursor: isScoring || !text.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isScoring ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                Scoring…
              </>
            ) : (
              <><Send size={13} /> Submit Answer</>
            )}
          </motion.button>
        </div>
      )}

      {/* All answers (show once submitted) */}
      {myAnswer && Object.keys(answers).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>
            Answers so far
          </div>
          {Object.values(answers).filter(a => a.userId !== myUserId).map(a => (
            <div key={a.userId} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color?.bg || SLOT_COLORS[1].bg }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{a.displayName}</span>
                  {a.isFirst && <span style={{ fontSize: 10, color: '#F59E0B' }}>⚡</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StarRow count={a.stars} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>+{a.xp}xp</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 4px', fontStyle: 'italic' }}>"{a.text}"</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{a.feedback}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Screen: Stats ────────────────────────────────────────────────────────────

function StatsScreen() {
  const { myStats, members, myUserId, myDisplayName, subject, totalSessions, mode } = useStudyRoomStore()
  const closeRoom = useStudyRoomStore(s => s.closeRoom)
  const addXP = useXPStore(s => s.addDirectXP)
  const [aevaVerdict, setAevaVerdict] = useState('')
  const [verdictLoading, setVerdictLoading] = useState(true)
  const xpApplied = useRef(false)

  const totalXP = Math.round(
    (myStats.xp.focus || 0) + (myStats.xp.battles || 0) + (myStats.xp.nodes || 0) + (myStats.xp.bonus || 0)
  )
  const focusPct = myStats.totalSeconds > 0
    ? Math.round((myStats.focusSeconds / myStats.totalSeconds) * 100)
    : 0
  const battleAvg = myStats.battlesEntered > 0
    ? (myStats.battlesStarsTotal / myStats.battlesEntered).toFixed(1)
    : '—'

  const focusColor = focusPct >= 80 ? '#10B981' : focusPct >= 55 ? '#F59E0B' : '#F43F5E'
  const focusLabel = focusPct >= 80 ? 'Elite Focus' : focusPct >= 55 ? 'Solid Session' : 'Distracted'

  // Apply XP once
  useEffect(() => {
    if (!xpApplied.current && totalXP > 0) {
      xpApplied.current = true
      if (totalXP > 0) addXP(totalXP, `Study Room${subject ? ` — ${subject}` : ''}`)
    }
  }, [])

  // Generate Aeva verdict
  useEffect(() => {
    const gen = async () => {
      try {
        const others = members.filter(m => m.userId !== myUserId)
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content:
              `You are Aeva, a sharp study AI. Write a 2-sentence verdict for a student's study session.
Focus: ${focusPct}%. XP: ${totalXP}. Battle stars avg: ${battleAvg}. Nodes completed: ${myStats.nodesCompleted.length}.
Subject: ${subject || 'mixed'}. Rounds: ${totalSessions}. Other members: ${others.length}.
Be direct, specific, motivating. No emojis. Second sentence should advise one specific next step.` }],
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

  const xpMax = Math.max(totalXP, 100)

  return (
    <motion.div key="stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🏁</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: -0.5 }}>
          Session Complete
        </h2>
        {subject && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subject}</div>}
      </div>

      {/* Focus score hero */}
      <div style={{
        background: `${focusColor}12`, border: `1.5px solid ${focusColor}35`,
        borderRadius: 16, padding: '20px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: focusColor, letterSpacing: -3, lineHeight: 1 }}>
          {focusPct}%
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: focusColor, marginTop: 4, marginBottom: 2 }}>
          {focusLabel}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          Focus Score — {Math.floor(myStats.focusSeconds / 60)}m focused of {Math.floor(myStats.totalSeconds / 60)}m total
        </div>
      </div>

      {/* 2×2 stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '🔥', label: 'Peak Streak', value: `${myStats.peakStreak}s` },
          { icon: '⚔️', label: 'Battle Avg', value: `${battleAvg}★` },
          { icon: '📚', label: 'Nodes Done', value: myStats.nodesCompleted.length },
          { icon: '⚡', label: 'Total XP', value: `+${totalXP}` },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* XP breakdown */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
          XP Breakdown
        </div>
        <XPBar label="Focus (2 XP/min)" xp={myStats.xp.focus} max={xpMax} color="#6366F1" />
        <XPBar label="Battle Stars" xp={myStats.xp.battles} max={xpMax} color="#F43F5E" />
        <XPBar label="Nodes Completed" xp={myStats.xp.nodes} max={xpMax} color="#10B981" />
        <XPBar label="Focus Bonus" xp={myStats.xp.bonus} max={xpMax} color="#F59E0B" />
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>+{totalXP} XP</span>
        </div>
      </div>

      {/* Head-to-head */}
      {members.filter(m => m.userId !== myUserId).length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
            Head-to-Head
          </div>
          {members.filter(m => m.userId !== myUserId).map(m => {
            const theirStats = m.stats || {}
            const theirFocus = theirStats.totalSeconds > 0
              ? Math.round((theirStats.focusSeconds / theirStats.totalSeconds) * 100)
              : 0
            const myWins = focusPct >= theirFocus
            return (
              <div key={m.userId} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color?.bg || SLOT_COLORS[1].bg }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m.displayName}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: myWins ? '#10B981' : '#F43F5E' }}>
                    {myWins ? 'You led' : 'They led'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {/* My bar */}
                  <div style={{ flex: focusPct, height: 6, background: myColor?.bg || SLOT_COLORS[0].bg, borderRadius: 99, minWidth: 4 }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>vs</span>
                  {/* Their bar */}
                  <div style={{ flex: theirFocus, height: 6, background: m.color?.bg || SLOT_COLORS[1].bg, borderRadius: 99, minWidth: 4 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>You {focusPct}%</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{theirFocus}% {m.displayName}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Aeva verdict */}
      <div style={{
        background: 'rgba(167,139,250,0.06)', border: '1.5px solid rgba(167,139,250,0.2)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.6)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={11} /> Aeva's Verdict
        </div>
        {verdictLoading ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(167,139,250,0.5)' }} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
            "{aevaVerdict || 'Good session. Keep the momentum.'}"
          </p>
        )}
      </div>

      {/* Leave button */}
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={closeRoom}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.75)', cursor: 'pointer', marginBottom: 4,
        }}
      >
        Leave Room
      </motion.button>
    </motion.div>
  )
}

// ─── Floating Pill (minimized) ────────────────────────────────────────────────

function FloatingPill() {
  const { code, timerSeconds, members, timerPhase } = useStudyRoomStore()
  const set = useStudyRoomStore(s => s.isMinimized)
  const closeRoom = useStudyRoomStore(s => s.closeRoom)

  const restore = () => useStudyRoomStore.setState({ isMinimized: false })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.9 }}
      style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 9999,
        background: 'rgba(10,10,26,0.95)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99,102,241,0.35)', borderRadius: 16,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15)',
        cursor: 'pointer',
      }}
      onClick={restore}
    >
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 8, height: 8, borderRadius: '50%', background: timerPhase === 'work' ? '#6366F1' : '#10B981', flexShrink: 0 }}
      />
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
        {fmtTime(timerSeconds)}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>{code}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
        <Users size={11} /> {members.length}
      </div>
      <button
        onClick={e => { e.stopPropagation(); closeRoom() }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 2, display: 'flex', marginLeft: 2 }}
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

// ─── Main StudyRoom modal ──────────────────────────────────────────────────────

export default function StudyRoom() {
  const { isOpen, isMinimized, phase } = useStudyRoomStore()
  const closeRoom = useStudyRoomStore(s => s.closeRoom)
  const [localScreen, setLocalScreen] = useState('entry') // entry | create | join

  // Reset local screen when modal reopens from idle
  useEffect(() => {
    if (isOpen && phase === 'idle') setLocalScreen('entry')
  }, [isOpen])

  if (!isOpen) return null

  if (isMinimized) {
    return (
      <AnimatePresence>
        <FloatingPill key="pill" />
      </AnimatePresence>
    )
  }

  const minimize = () => useStudyRoomStore.setState({ isMinimized: true })

  // Determine active screen
  const screenKey = phase !== 'idle' ? phase : localScreen

  return (
    <AnimatePresence>
      <motion.div
        key="studyroom-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget && phase === 'idle') closeRoom() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <motion.div
          key="studyroom-panel"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{
            width: '100%', maxWidth: 440,
            maxHeight: '90vh',
            background: 'rgba(8,8,22,0.98)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '20px 20px 0 0',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px 10px',
            borderBottom: phase !== 'idle' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16 }}>🧑‍💻</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: -0.3 }}>
                Study Room
              </span>
              {phase !== 'idle' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 99, fontSize: 10, color: '#10B981', fontWeight: 600,
                }}>
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                  LIVE
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {phase !== 'idle' && phase !== 'stats' && (
                <button
                  onClick={minimize}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 9px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}
                >
                  <Minimize2 size={13} />
                </button>
              )}
              <button
                onClick={closeRoom}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 9px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
              {screenKey === 'entry' && (
                <EntryScreen
                  key="entry"
                  onCreate={() => setLocalScreen('create')}
                  onJoin={() => setLocalScreen('join')}
                  onClose={closeRoom}
                />
              )}
              {screenKey === 'create' && (
                <CreateScreen key="create" onBack={() => setLocalScreen('entry')} onClose={closeRoom} />
              )}
              {screenKey === 'join' && (
                <JoinScreen key="join" onBack={() => setLocalScreen('entry')} />
              )}
              {screenKey === 'lobby' && <LobbyScreen key="lobby" />}
              {screenKey === 'session' && <SessionScreen key="session" onMinimize={minimize} />}
              {screenKey === 'break' && <BreakScreen key="break" />}
              {screenKey === 'battle' && <BattleScreen key="battle" />}
              {screenKey === 'stats' && <StatsScreen key="stats" />}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── StudyRoomButton — drop into App.jsx chat bar ─────────────────────────────

export function StudyRoomButton() {
  const open = useStudyRoomStore(s => s.open)
  const phase = useStudyRoomStore(s => s.phase)
  const isOpen = useStudyRoomStore(s => s.isOpen)
  const timerSeconds = useStudyRoomStore(s => s.timerSeconds)

  const live = isOpen && phase !== 'idle'

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.90 }}
      onClick={open}
      title="Study Together — create or join a live study room"
      style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: live ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.10)',
        border: live ? '1.5px solid rgba(99,102,241,0.55)' : '1.5px solid rgba(99,102,241,0.28)',
        cursor: 'pointer', color: live ? '#a5b4fc' : 'rgba(99,102,241,0.75)',
        position: 'relative',
      }}
    >
      <Users size={14} strokeWidth={2} />
      {live && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute', top: 2, right: 2,
            width: 6, height: 6, borderRadius: '50%', background: '#10B981',
            border: '1px solid rgba(8,8,22,0.8)',
          }}
        />
      )}
    </motion.button>
  )
}
