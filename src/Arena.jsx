/**
 * Arena — Sabotage Mode
 * Aeva-hosted real-time multiplayer quiz with sabotage cards
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Trophy, Zap, Users, ChevronRight, ArrowLeft, Crown } from 'lucide-react'
import { useArenaStore, ARENA_COLORS, CARD_DEFS } from './arenaStore'
import { useXPStore } from './xpStore'
import QRCode from 'qrcode'

// ── helpers ────────────────────────────────────────────────────────────────────

const fmtScore = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

function PlayerChip({ player, myUserId, showScore = true, size = 32 }) {
  const col = player.color || ARENA_COLORS[0]
  const isMe = player.userId === myUserId
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <motion.div
        animate={{ boxShadow: [`0 0 0px ${col.glow}`, `0 0 14px ${col.glow}`, `0 0 0px ${col.glow}`] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: size, height: size, borderRadius: '50%', background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff', flexShrink: 0 }}
      >
        {player.displayName?.[0]?.toUpperCase() || '?'}
      </motion.div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isMe ? col.bg : 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.displayName}{isMe && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.6 }}>YOU</span>}
        </div>
        {showScore && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', fontVariantNumeric: 'tabular-nums' }}>{fmtScore(player.score || 0)} pts</div>}
      </div>
    </div>
  )
}

function CardPill({ card, onClick, disabled }) {
  const def = CARD_DEFS[card]
  if (!def) return null
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.06 } : {}}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      onClick={!disabled ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 99,
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.18)'}`,
        color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)',
        fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s',
      }}
    >
      <span>{def.emoji}</span>
      <span>{def.label}</span>
    </motion.button>
  )
}

// ── Screens ────────────────────────────────────────────────────────────────────

function EntryScreen() {
  const { open: _open, createRoom, joinRoom, phase } = useArenaStore()
  const setPhase = useArenaStore(s => s.phase)
  const store = useArenaStore()

  return (
    <motion.div key="entry" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚔️</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 6 }}>Arena</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Live multiplayer. Aeva hosts.<br />Sabotage your friends.</div>
      </div>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => useArenaStore.setState({ phase: 'create' })}
        style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.02em', boxShadow: '0 4px 24px rgba(99,102,241,0.45)' }}>
        Create Room
      </motion.button>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => useArenaStore.setState({ phase: 'join' })}
        style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.88)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Join Room
      </motion.button>
    </motion.div>
  )
}

function CreateScreen() {
  const { createRoom } = useArenaStore()
  const { name } = (() => { try { return { name: localStorage.getItem('aeva_display_name') || 'Player' } } catch { return { name: 'Player' } } })()
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [loading, setLoading] = useState(false)

  const userId = (() => { try { return localStorage.getItem('aeva_anon_id') || `anon-${Math.random().toString(36).slice(2,8)}` } catch { return `anon-${Math.random().toString(36).slice(2,8)}` } })()

  const handleCreate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    await createRoom({ topic: topic.trim(), difficulty, questionCount, userId, displayName: name })
    setLoading(false)
  }

  return (
    <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => useArenaStore.setState({ phase: 'entry' })}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '5px 8px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={14} />
        </motion.button>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Create Room</div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Topic</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="e.g. Cell Biology, WW2, Algebra…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Difficulty</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['easy', 'medium', 'hard'].map(d => (
            <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setDifficulty(d)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.15s', background: difficulty === d ? (d === 'easy' ? 'rgba(16,185,129,0.22)' : d === 'medium' ? 'rgba(245,158,11,0.22)' : 'rgba(244,63,94,0.22)') : 'rgba(255,255,255,0.05)', border: `1.5px solid ${difficulty === d ? (d === 'easy' ? 'rgba(16,185,129,0.55)' : d === 'medium' ? 'rgba(245,158,11,0.55)' : 'rgba(244,63,94,0.55)') : 'rgba(255,255,255,0.08)'}`, color: difficulty === d ? '#fff' : 'rgba(255,255,255,0.40)' }}>
              {d}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Questions</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[5, 10, 15].map(n => (
            <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => setQuestionCount(n)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: questionCount === n ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${questionCount === n ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`, color: questionCount === n ? '#A5B4FC' : 'rgba(255,255,255,0.40)' }}>
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={!topic.trim() || loading}
        style={{ padding: '13px', borderRadius: 14, background: topic.trim() && !loading ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.07)', border: 'none', color: topic.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: 800, cursor: topic.trim() && !loading ? 'pointer' : 'default', fontFamily: 'inherit', marginTop: 4, transition: 'all 0.2s', boxShadow: topic.trim() && !loading ? '0 4px 20px rgba(99,102,241,0.40)' : 'none' }}>
        {loading ? 'Creating…' : 'Create Room →'}
      </motion.button>
    </motion.div>
  )
}

function JoinScreen({ prefillCode }) {
  const { joinRoom } = useArenaStore()
  const [code, setCode] = useState(prefillCode || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const name = (() => { try { return localStorage.getItem('aeva_display_name') || 'Player' } catch { return 'Player' } })()
  const userId = (() => { try { return localStorage.getItem('aeva_anon_id') || `anon-${Math.random().toString(36).slice(2,8)}` } catch { return `anon-${Math.random().toString(36).slice(2,8)}` } })()

  const handle = async () => {
    if (!code.trim()) return
    setLoading(true); setError('')
    try { await joinRoom(code, { userId, displayName: name }) }
    catch (e) { setError('Room not found. Check the code and try again.') }
    setLoading(false)
  }

  return (
    <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => useArenaStore.setState({ phase: 'entry' })}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '5px 8px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={14} />
        </motion.button>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Join Room</div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Room Code</label>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handle()}
          placeholder="e.g. AB3X9Z"
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${error ? 'rgba(248,113,113,0.55)' : 'rgba(255,255,255,0.12)'}`, color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: "'Inter', monospace", letterSpacing: '0.12em', textAlign: 'center', outline: 'none' }} />
        {error && <div style={{ fontSize: 11, color: '#F87171', marginTop: 5 }}>{error}</div>}
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handle} disabled={!code.trim() || loading}
        style={{ padding: '13px', borderRadius: 14, background: code.trim() && !loading ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.07)', border: 'none', color: code.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: 800, cursor: code.trim() && !loading ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s' }}>
        {loading ? 'Joining…' : 'Join →'}
      </motion.button>
    </motion.div>
  )
}

function LobbyScreen() {
  const { code, players, myUserId, isHost, startGame, settings } = useArenaStore()
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const canStart = isHost && players.length >= 1

  useEffect(() => {
    const url = `${window.location.origin}/?arena=${code}`
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#ffffff', light: '#05061a' } })
      .then(setQrUrl).catch(() => {})
  }, [code])

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>⚔️ Arena · Sabotage</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{settings.topic}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{settings.questionCount} questions · {settings.difficulty}</div>
      </div>

      {/* Code + QR */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 600 }}>Room Code</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '0.16em', fontFamily: 'monospace' }}>{code}</div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={copyCode}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: copied ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)', border: `1px solid ${copied ? 'rgba(16,185,129,0.40)' : 'rgba(255,255,255,0.14)'}`, color: copied ? '#6EE7B7' : 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>
        </div>
        {qrUrl && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 600 }}>Scan to Join</div>
            <img src={qrUrl} alt="QR" style={{ width: 80, height: 80, borderRadius: 8 }} />
          </div>
        )}
      </div>

      {/* Players */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{players.length} player{players.length !== 1 ? 's' : ''}</div>
        {players.map(p => (
          <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <PlayerChip player={p} myUserId={myUserId} showScore={false} size={34} />
            {p.userId === myUserId && isHost && <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.06em' }}>HOST</span>}
          </div>
        ))}
        {players.length < 2 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>Waiting for more players…</div>}
      </div>

      {/* Cards preview */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.70)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Your Starting Cards</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['freeze', 'steal', 'double_down', 'bomb'].map(c => <CardPill key={c} card={c} disabled />)}
        </div>
      </div>

      {isHost ? (
        <motion.button whileHover={canStart ? { scale: 1.02 } : {}} whileTap={canStart ? { scale: 0.97 } : {}} onClick={canStart ? startGame : undefined}
          style={{ padding: '14px', borderRadius: 14, background: canStart ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.07)', border: 'none', color: canStart ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 15, fontWeight: 800, cursor: canStart ? 'pointer' : 'default', fontFamily: 'inherit', boxShadow: canStart ? '0 4px 24px rgba(99,102,241,0.45)' : 'none', transition: 'all 0.2s' }}>
          {canStart ? '🚀 Start Game' : 'Waiting for players…'}
        </motion.button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13, color: 'rgba(255,255,255,0.40)', fontStyle: 'italic' }}>
          Waiting for host to start…
        </div>
      )}
    </motion.div>
  )
}

function CountdownScreen() {
  const { countdownVal, settings } = useArenaStore()
  return (
    <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {settings.topic} · {settings.questionCount} questions
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={countdownVal}
          initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: 120, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.06em' }}>
          {countdownVal}
        </motion.div>
      </AnimatePresence>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>Get ready…</div>
    </motion.div>
  )
}

function PreparingScreen() {
  return (
    <motion.div key="preparing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTopColor: '#6366F1' }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>Aeva is generating questions…</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Sit tight, this takes a few seconds</div>
      </div>
    </motion.div>
  )
}

function QuestionScreen() {
  const { stubs, questions, currentQIdx, timerSeconds, answers, myUserId, submitAnswer, isHost, effects } = useArenaStore()
  const stub  = stubs[currentQIdx]
  const myAns = answers[myUserId]
  const myEff = effects[myUserId] || {}
  const [frozen, setFrozen] = useState(true)

  // Freeze effect: hide choices for 4s
  useEffect(() => {
    if (myEff.frozen) {
      setFrozen(true)
      const t = setTimeout(() => setFrozen(false), 4000)
      return () => clearTimeout(t)
    } else {
      setFrozen(false)
    }
  }, [myEff.frozen])

  // Bomb effect: full screen shake
  const [bombed, setBombed] = useState(false)
  useEffect(() => {
    if (myEff.bomb) { setBombed(true); setTimeout(() => setBombed(false), 2000) }
  }, [myEff.bomb])

  if (!stub) return null

  const progress = timerSeconds / 15
  const urgentColor = timerSeconds <= 5 ? '#F43F5E' : timerSeconds <= 10 ? '#F59E0B' : '#6366F1'
  const choiceLetters = ['A', 'B', 'C', 'D']
  const choiceBgs = ['rgba(99,102,241,0.12)', 'rgba(244,63,94,0.12)', 'rgba(16,185,129,0.12)', 'rgba(245,158,11,0.12)']
  const choiceBorders = ['rgba(99,102,241,0.35)', 'rgba(244,63,94,0.35)', 'rgba(16,185,129,0.35)', 'rgba(245,158,11,0.35)']
  const choiceColors = ['#A5B4FC', '#FDA4AF', '#6EE7B7', '#FCD34D']

  return (
    <motion.div key="question" initial={{ opacity: 0, y: 16 }} animate={{ opacity: bombed ? [0, -10, 10, -8, 8, 0] : 1, x: bombed ? [0, -12, 12, -8, 8, 0] : 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: bombed ? 0.4 : 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>

      {/* Bomb overlay */}
      <AnimatePresence>
        {bombed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(244,63,94,0.25)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 40 }}>💣</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer bar + counter */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Q{currentQIdx + 1}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: urgentColor, fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>{timerSeconds}</div>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.9, ease: 'linear' }}
            style={{ height: '100%', borderRadius: 99, background: urgentColor, transition: 'background 0.3s' }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '16px', flex: 0 }}>
        <p style={{ fontSize: 15, color: '#fff', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{stub.q}</p>
      </div>

      {/* Freeze notice */}
      <AnimatePresence>
        {frozen && myEff.frozen && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '10px', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.35)', borderRadius: 10, fontSize: 13, color: '#7DD3FC', fontWeight: 700 }}>
            🧊 Frozen — choices reveal in a moment…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {stub.choices.map((choice, i) => {
          const selected = myAns?.choiceIdx === i
          const answered = !!myAns
          return (
            <motion.button key={i}
              whileHover={!answered && !frozen ? { scale: 1.02 } : {}}
              whileTap={!answered && !frozen ? { scale: 0.97 } : {}}
              onClick={!answered && !frozen ? () => submitAnswer(i) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: selected ? choiceBgs[i] : answered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${selected ? choiceBorders[i] : 'rgba(255,255,255,0.09)'}`,
                color: selected ? '#fff' : answered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.80)',
                cursor: answered || frozen ? 'default' : 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                textAlign: 'left', width: '100%', transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 24, height: 24, borderRadius: 7, background: selected ? choiceBorders[i] : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: selected ? '#fff' : 'rgba(255,255,255,0.40)', flexShrink: 0 }}>
                {frozen && myEff.frozen ? '?' : choiceLetters[i]}
              </span>
              {frozen && myEff.frozen ? <span style={{ color: 'rgba(255,255,255,0.20)' }}>···</span> : choice}
            </motion.button>
          )
        })}
      </div>

      {myAns && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.40)', fontStyle: 'italic', paddingBottom: 4 }}>
          Locked in — waiting for others…
        </motion.div>
      )}
    </motion.div>
  )
}

function RevealScreen() {
  const { stubs, currentQIdx, correctIdx, explanation, aevaLine, answers, players, myUserId, scoreDeltas } = useArenaStore()
  const stub = stubs[currentQIdx]
  const myAns = answers[myUserId]
  const isCorrect = myAns?.choiceIdx === correctIdx
  const myDelta = scoreDeltas?.[myUserId] || 0
  const choiceBg  = ['rgba(99,102,241,0.14)', 'rgba(244,63,94,0.14)', 'rgba(16,185,129,0.14)', 'rgba(245,158,11,0.14)']
  const choiceLtr = ['A', 'B', 'C', 'D']

  if (!stub) return null

  return (
    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Result banner */}
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        style={{ textAlign: 'center', padding: '14px', borderRadius: 16, background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.12)', border: `1.5px solid ${isCorrect ? 'rgba(16,185,129,0.45)' : 'rgba(244,63,94,0.35)'}` }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>{isCorrect ? '✅' : '❌'}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{isCorrect ? 'Correct!' : 'Wrong'}</div>
        {myDelta !== 0 && (
          <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ fontSize: 13, fontWeight: 700, color: myDelta > 0 ? '#6EE7B7' : '#FDA4AF', marginTop: 3 }}>
            {myDelta > 0 ? `+${fmtScore(myDelta)}` : fmtScore(myDelta)} pts
          </motion.div>
        )}
      </motion.div>

      {/* Correct answer highlight */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stub.choices.map((choice, i) => {
          const isRight = i === correctIdx
          const myPick  = myAns?.choiceIdx === i
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: isRight ? 'rgba(16,185,129,0.14)' : myPick && !isRight ? 'rgba(244,63,94,0.10)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isRight ? 'rgba(16,185,129,0.45)' : myPick ? 'rgba(244,63,94,0.30)' : 'rgba(255,255,255,0.06)'}` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: isRight ? '#6EE7B7' : myPick ? '#FDA4AF' : 'rgba(255,255,255,0.25)', width: 18 }}>{choiceLtr[i]}</span>
              <span style={{ fontSize: 13, color: isRight ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: isRight ? 600 : 400, flex: 1 }}>{choice}</span>
              {isRight && <span style={{ fontSize: 14 }}>✓</span>}
            </div>
          )
        })}
      </div>

      {explanation && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: '2px solid rgba(255,255,255,0.12)' }}>
          {explanation}
        </div>
      )}

      {/* Aeva line */}
      {aevaLine && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.24)', borderRadius: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🤖</span>
          <span style={{ fontSize: 12.5, color: 'rgba(200,210,255,0.85)', fontStyle: 'italic', lineHeight: 1.5 }}>"{aevaLine}"</span>
        </motion.div>
      )}

      {/* Quick leaderboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Standings</div>
        {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, rank) => (
          <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: p.userId === myUserId ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${p.userId === myUserId ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: rank === 0 ? '#F59E0B' : 'rgba(255,255,255,0.30)', width: 16 }}>{rank + 1}</span>
            <PlayerChip player={p} myUserId={myUserId} showScore={false} size={24} />
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.70)', fontVariantNumeric: 'tabular-nums' }}>{fmtScore(p.score || 0)}</span>
            {scoreDeltas?.[p.userId] > 0 && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} style={{ fontSize: 10, color: '#6EE7B7', fontWeight: 700 }}>
                +{fmtScore(scoreDeltas[p.userId])}
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SabotageScreen() {
  const { players, myUserId, sabotagePlayed, effects } = useArenaStore()
  const playCard = useArenaStore(s => s.playCard)
  const me = players.find(p => p.userId === myUserId)
  const myCards = me?.cards || []
  const [selectedCard, setSelectedCard] = useState(null)
  const [timer, setTimer] = useState(6)

  useEffect(() => {
    const ref = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(ref)
  }, [])

  const targets = players.filter(p => p.userId !== myUserId)
  const def = selectedCard ? CARD_DEFS[selectedCard] : null

  return (
    <motion.div key="sabotage" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>💣 Sabotage Window</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Play a card before the next question</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: timer <= 2 ? '#F43F5E' : '#F59E0B', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>{timer}s</div>
      </div>

      {/* Cards in hand */}
      {myCards.length > 0 ? (
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Your Cards</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {myCards.map((card, i) => {
              const d = CARD_DEFS[card]
              if (!d) return null
              const sel = selectedCard === card
              return (
                <motion.button key={`${card}-${i}`} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedCard(sel ? null : card)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px', borderRadius: 12, background: sel ? 'rgba(244,63,94,0.20)' : 'rgba(255,255,255,0.07)', border: `1.5px solid ${sel ? 'rgba(244,63,94,0.55)' : 'rgba(255,255,255,0.13)'}`, cursor: 'pointer', fontFamily: 'inherit', minWidth: 64, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 22 }}>{d.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sel ? '#FDA4AF' : 'rgba(255,255,255,0.75)' }}>{d.label}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.3 }}>{d.desc}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
          No cards in hand
        </div>
      )}

      {/* Target picker (if card selected + it's not self-use) */}
      {selectedCard && def && !def.self && targets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Choose Target</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {targets.map(p => (
              <motion.button key={p.userId} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                onClick={() => { playCard(selectedCard, p.userId); setSelectedCard(null) }}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 12, background: 'rgba(244,63,94,0.14)', border: '1.5px solid rgba(244,63,94,0.40)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <PlayerChip player={p} myUserId={myUserId} showScore size={28} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Self-use card */}
      {selectedCard && def?.self && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => { playCard(selectedCard, myUserId); setSelectedCard(null) }}
          style={{ padding: '12px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.20))', border: '1.5px solid rgba(99,102,241,0.45)', color: '#A5B4FC', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {def.emoji} Use {def.label} on yourself
        </motion.button>
      )}

      {/* Cards played this round */}
      {sabotagePlayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Played This Round</div>
          {sabotagePlayed.map((s, i) => {
            const cd = CARD_DEFS[s.card]
            const target = players.find(p => p.userId === s.target)
            return (
              <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', padding: '6px 10px', background: 'rgba(244,63,94,0.08)', borderRadius: 8, border: '1px solid rgba(244,63,94,0.20)' }}>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{s.byName}</span>
                {' used '}<span style={{ fontWeight: 700 }}>{cd?.emoji} {cd?.label}</span>
                {s.target !== s.by && target && <>{' on '}<span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{target.displayName}</span></>}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', fontStyle: 'italic' }}>
        Next question starts in {timer}s
      </div>
    </motion.div>
  )
}

function DoneScreen() {
  const { players, myUserId, settings, close } = useArenaStore()
  const addXP = useXPStore(s => s.addXP)
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
  const myRank = sorted.findIndex(p => p.userId === myUserId) + 1
  const isWinner = myRank === 1

  useEffect(() => {
    const me = players.find(p => p.userId === myUserId)
    if (me?.score > 0) addXP(Math.min(500, Math.round(me.score / 10)))
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          style={{ fontSize: 48, marginBottom: 8 }}>
          {isWinner ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '💪'}
        </motion.div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 4 }}>
          {isWinner ? 'Victory!' : `${myRank}${myRank === 2 ? 'nd' : myRank === 3 ? 'rd' : 'th'} Place`}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>{settings.topic} · {settings.questionCount} questions</div>
      </div>

      {/* Final leaderboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {sorted.map((p, i) => (
          <motion.div key={p.userId}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 13, background: p.userId === myUserId ? 'rgba(99,102,241,0.14)' : i === 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${p.userId === myUserId ? 'rgba(99,102,241,0.35)' : i === 0 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{medals[i] || `${i + 1}`}</span>
            <PlayerChip player={p} myUserId={myUserId} showScore={false} size={32} />
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: i === 0 ? '#FCD34D' : 'rgba(255,255,255,0.80)', fontVariantNumeric: 'tabular-nums' }}>{fmtScore(p.score || 0)}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>pts</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => useArenaStore.setState({ phase: 'entry' })}
          style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Play Again
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={close}
          style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Arcade
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function Arena() {
  const { isOpen, phase, close } = useArenaStore()

  // Handle ?arena=CODE URL param (from QR scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('arena')
    if (code) {
      useArenaStore.setState({ isOpen: true, phase: 'join', _prefillCode: code })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const prefillCode = useArenaStore(s => s._prefillCode)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        key="arena-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'linear-gradient(180deg, #06061a 0%, #04040f 100%)', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}
      >
        {/* Accent glow top */}
        <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 200, background: 'radial-gradient(ellipse, rgba(99,102,241,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 16 }}>⚔️</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>Arena</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(244,63,94,0.80)', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.06em' }}>SABOTAGE</span>
          </div>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={close}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </motion.button>
        </div>

        {/* Screen content — centred column, max width on large screens */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: 480, padding: '20px 20px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
              {phase === 'entry'      && <EntryScreen key="entry" />}
              {phase === 'create'     && <CreateScreen key="create" />}
              {phase === 'join'       && <JoinScreen key="join" prefillCode={prefillCode} />}
              {phase === 'lobby'      && <LobbyScreen key="lobby" />}
              {phase === 'countdown'  && <CountdownScreen key="countdown" />}
              {phase === 'preparing'  && <PreparingScreen key="preparing" />}
              {phase === 'question'   && <QuestionScreen key="question" />}
              {phase === 'reveal'     && <RevealScreen key="reveal" />}
              {phase === 'sabotage'   && <SabotageScreen key="sabotage" />}
              {phase === 'done'       && <DoneScreen key="done" />}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
