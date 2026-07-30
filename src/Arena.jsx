/**
 * Arena — Sabotage Mode
 * Aeva-hosted real-time multiplayer quiz with sabotage cards
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Trophy, Zap, Users, ChevronRight, ArrowLeft, Crown } from 'lucide-react'
import { useArenaStore, ARENA_COLORS, CARD_DEFS } from './arenaStore'
import { useXPStore } from './xpStore'
import { supabase } from './supabase'
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
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => useArenaStore.setState({ phase: 'leaderboard' })}
        style={{ width: '100%', padding: '11px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Trophy size={13} /> Leaderboard
      </motion.button>
    </motion.div>
  )
}

function CreateScreen() {
  const { createRoom } = useArenaStore()
  const { name } = (() => { try { return { name: localStorage.getItem('aeva_display_name') || 'Player' } } catch { return { name: 'Player' } } })()
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('competitive')
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
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Mode</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'casual',      label: 'Casual',      sub: '20s',  color: '#10B981' },
            { key: 'competitive', label: 'Competitive', sub: '15s',  color: '#F59E0B' },
            { key: 'brutal',      label: 'Brutal',      sub: '10s',  color: '#EF4444' },
          ].map(({ key, label, sub, color }) => (
            <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setDifficulty(key)}
              style={{ flex: 1, padding: '8px 0 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: difficulty === key ? `${color}22` : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${difficulty === key ? `${color}88` : 'rgba(255,255,255,0.08)'}`,
                color: difficulty === key ? '#fff' : 'rgba(255,255,255,0.40)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span>{label}</span>
              <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 600 }}>{sub}</span>
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
  const [spectator, setSpectator] = useState(false)
  const name = (() => { try { return localStorage.getItem('aeva_display_name') || 'Player' } catch { return 'Player' } })()
  const userId = (() => { try { return localStorage.getItem('aeva_anon_id') || `anon-${Math.random().toString(36).slice(2,8)}` } catch { return `anon-${Math.random().toString(36).slice(2,8)}` } })()

  const handle = async () => {
    if (!code.trim()) return
    setLoading(true); setError('')
    try { await joinRoom(code, { userId, displayName: name, spectator }) }
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
      {/* 3.7: spectator toggle */}
      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setSpectator(s => !s)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, background: spectator ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${spectator ? 'rgba(14,165,233,0.35)' : 'rgba(255,255,255,0.09)'}`, cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'all 0.15s' }}>
        <span style={{ fontSize: 16 }}>👁</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: spectator ? '#7DD3FC' : 'rgba(255,255,255,0.55)' }}>Watch Only (Spectate)</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>See the game live — no scoring, no sabotage</div>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: spectator ? '#0EA5E9' : 'rgba(255,255,255,0.10)', border: `1.5px solid ${spectator ? '#0EA5E9' : 'rgba(255,255,255,0.20)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {spectator && <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fff' }} />}
        </div>
      </motion.button>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handle} disabled={!code.trim() || loading}
        style={{ padding: '13px', borderRadius: 14, background: code.trim() && !loading ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.07)', border: 'none', color: code.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: 800, cursor: code.trim() && !loading ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s' }}>
        {loading ? 'Joining…' : spectator ? '👁 Watch →' : 'Join →'}
      </motion.button>
    </motion.div>
  )
}

function LobbyScreen() {
  const { code, players, myUserId, isHost, startGame, settings, coHostId, spectators, challengeMode, playerProfiles } = useArenaStore()
  const assignCoHost    = useArenaStore(s => s.assignCoHost)
  const kickPlayer      = useArenaStore(s => s.kickPlayer)
  const setChallengeMode = useArenaStore(s => s.setChallengeMode)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const canStart = isHost && players.length >= 1

  useEffect(() => {
    const url = `${window.location.origin}/?arena=${code}`
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#ffffff', light: '#05061a' } })
      .then(setQrUrl).catch(() => {})
  }, [code])

  // 6.1: Fetch profiles so topic accuracy badges are visible in lobby
  useEffect(() => {
    if (!players.length) return
    const ids = players.map(p => p.baseUserId || p.userId.split('-')[0]).filter(Boolean)
    supabase.from('arena_profiles')
      .select('user_id, accuracy_pct, topic_accuracy')
      .in('user_id', ids)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(r => { map[r.user_id] = r })
        useArenaStore.setState({ playerProfiles: map })
      })
  }, [players.length])

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>⚔️ Arena · Sabotage</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{settings.topic}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
          {settings.questionCount} questions · {settings.difficulty} · {settings.difficulty === 'casual' ? '20s' : settings.difficulty === 'brutal' ? '10s' : '15s'}/q
        </div>
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

      {/* Players — 3.3: scrollable for 30+ */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          {players.length} player{players.length !== 1 ? 's' : ''}
          {spectators.length > 0 && <span style={{ marginLeft: 8, color: 'rgba(14,165,233,0.55)' }}>· {spectators.length} watching</span>}
        </div>
        <div style={{ maxHeight: 224, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map(p => {
            const isMe      = p.userId === myUserId
            const isCoHost  = p.userId === coHostId
            const baseId    = p.baseUserId || p.userId.split('-')[0]
            const topicAcc  = playerProfiles[baseId]?.topic_accuracy?.[settings.topic]
            const pctLabel  = topicAcc != null ? `${Math.round(topicAcc * 100)}%` : null
            const tierColor = topicAcc != null ? (topicAcc >= 0.65 ? '#F59E0B' : topicAcc >= 0.45 ? '#6EE7B7' : '#FDA4AF') : null
            return (
              <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <PlayerChip player={p} myUserId={myUserId} showScore={false} size={30} />
                  {/* 6.1: topic accuracy badge */}
                  {pctLabel && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}40`, borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>
                      {pctLabel} {settings.topic}
                    </span>
                  )}
                  {p.challengeMode && <span title="Challenge mode" style={{ fontSize: 11 }}>🎯</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {isMe && isHost && <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 99, padding: '2px 7px' }}>HOST</span>}
                  {isCoHost && !isMe && <span style={{ fontSize: 9, fontWeight: 700, color: '#A5B4FC', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 99, padding: '2px 7px' }}>CO-HOST</span>}
                  {isHost && !isMe && (
                    <motion.button whileTap={{ scale: 0.90 }} onClick={() => assignCoHost(p.userId)}
                      style={{ fontSize: 9, fontWeight: 600, color: isCoHost ? 'rgba(244,63,94,0.70)' : 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {isCoHost ? '− co-host' : '+ co-host'}
                    </motion.button>
                  )}
                  {isHost && !isMe && (
                    <motion.button whileTap={{ scale: 0.90 }} onClick={() => kickPlayer(p.userId)}
                      style={{ fontSize: 9, fontWeight: 600, color: 'rgba(244,63,94,0.60)', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.16)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      🚫
                    </motion.button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {players.length < 2 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', marginTop: 8 }}>Waiting for more players…</div>}
      </div>

      {/* 5.1: Chaos Coins — earned during play, spent in the shop */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.70)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Chaos Economy</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>🪙</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#A5B4FC' }}>Start with 100 Chaos Coins</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>Earn more from correct answers · Shop opens every 3 questions</div>
          </div>
        </div>
      </div>

      {/* 6.5: Challenge Mode toggle — each player can opt in */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setChallengeMode(!challengeMode)}
        style={{ padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
          background: challengeMode ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${challengeMode ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.09)'}` }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: challengeMode ? '#FCA5A5' : 'rgba(255,255,255,0.60)' }}>
            Challenge Mode {challengeMode ? '· ON' : '· OFF'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>
            Aeva targets your weak spots — questions skew toward topics you struggle with
          </div>
        </div>
        <div style={{ width: 28, height: 16, borderRadius: 99, background: challengeMode ? '#EF4444' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 2, left: challengeMode ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </div>
      </motion.button>

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

function IncomingCardToast() {
  const { incomingCard } = useArenaStore()
  const def = incomingCard ? CARD_DEFS[incomingCard.card] : null
  return (
    <AnimatePresence>
      {incomingCard && def && (
        <motion.div
          initial={{ opacity: 0, y: -32, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 900, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: 'rgba(244,63,94,0.22)', border: '1.5px solid rgba(244,63,94,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(244,63,94,0.30)', maxWidth: 'calc(100vw - 32px)', overflow: 'hidden' }}
        >
          <span style={{ fontSize: 24 }}>{def.emoji}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{incomingCard.byName} used {def.label} on you!</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)' }}>{def.desc}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 2.1 — Per-question thumbs up/down, shown during reveal
function VoteRow({ qIdx }) {
  const voteQuestion    = useArenaStore(s => s.voteQuestion)
  const myVote          = useArenaStore(s => s.myQuestionVotes[qIdx])
  const votes           = useArenaStore(s => s.questionVotes[qIdx])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', paddingTop: 4 }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Accurate?
      </div>
      {[['up', '👍'], ['down', '👎']].map(([v, emoji]) => {
        const isChosen = myVote === v
        const count    = v === 'up' ? (votes?.up || 0) : (votes?.down || 0)
        return (
          <motion.button key={v}
            whileTap={!myVote ? { scale: 0.85 } : {}}
            onClick={() => !myVote && voteQuestion(qIdx, v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              cursor: myVote ? 'default' : 'pointer', fontFamily: 'inherit',
              background:   isChosen ? (v === 'up' ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.18)') : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isChosen ? (v === 'up' ? 'rgba(16,185,129,0.50)' : 'rgba(244,63,94,0.42)') : 'rgba(255,255,255,0.10)'}`,
              color:  isChosen ? (v === 'up' ? '#6EE7B7' : '#FDA4AF') : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
            }}>
            {emoji} {count > 0 && <span style={{ fontSize: 10, opacity: 0.8 }}>{count}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

function QuestionScreen() {
  const { stubs, questions, currentQIdx, timerSeconds, answers, myUserId, submitAnswer, isHost, effects, hostSkipQuestion, isSpectator, coHostId, isPaused, playerTiers, settings } = useArenaStore()
  const stub  = stubs[currentQIdx]
  const myAns = answers[myUserId]
  const myEff = effects[myUserId] || {}
  const [frozen, setFrozen] = useState(!!myEff.frozen)

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

  // 6.3: Use expert choices if this player is expert tier and they exist
  const myTier          = playerTiers[myUserId] || 'standard'
  const isExpertPlayer  = myTier === 'expert'
  const activeChoices   = (isExpertPlayer && stub.expertChoices?.length) ? stub.expertChoices : stub.choices

  const qTime    = settings?.difficulty === 'casual' ? 20 : settings?.difficulty === 'brutal' ? 10 : 15
  const progress = timerSeconds / qTime
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

      {/* 4.2: Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 25, background: 'rgba(4,4,20,0.82)', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 38 }}>⏸</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Game Paused</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic' }}>Waiting for host to resume…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer bar + counter */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Q{currentQIdx + 1}</div>
            {/* 2.7 + category: category badge */}
            {stub.category && (
              <span style={{ fontSize: 9, color: 'rgba(165,180,252,0.70)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.20)', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>
                {stub.category}
              </span>
            )}
            {/* 3.7: spectator badge */}
            {isSpectator && (
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(14,165,233,0.65)', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.22)', borderRadius: 99, padding: '1px 7px' }}>
                👁 Spectating
              </span>
            )}
            {/* 2.6 / 3.5: host or co-host skip */}
            {(isHost || coHostId === myUserId) && !isSpectator && (
              <motion.button whileTap={{ scale: 0.90 }} onClick={hostSkipQuestion}
                style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}>
                Skip Q →
              </motion.button>
            )}
          </div>
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

      {/* 5.6: Wager indicator */}
      <AnimatePresence>
        {myEff.wagered && !myAns && (
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '8px 12px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.40)', borderRadius: 10, fontSize: 12, color: '#FCD34D', fontWeight: 700 }}>
            🎰 {myEff.wagered}× Wager active — {myEff.wagered === 2 ? 'double or nothing' : 'triple or bust'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5.4: Scramble notice */}
      <AnimatePresence>
        {myEff.scrambled && !myAns && (
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '8px 12px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', borderRadius: 10, fontSize: 12, color: '#FDA4AF', fontWeight: 700 }}>
            🔀 Scrambled — answers shuffled!
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6.3: expert tier badge */}
      {isExpertPlayer && stub.expertChoices?.length && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', alignSelf: 'flex-start' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.06em' }}>⭐ EXPERT MODE — harder distractors</span>
        </div>
      )}

      {/* Choices — 5.4: scramble reverses display order; 6.3: expert uses activeChoices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {(() => {
          const isScrambled = !!myEff.scrambled
          const displayOrder = isScrambled ? [3, 2, 1, 0] : [0, 1, 2, 3]
          return displayOrder.map((origIdx, displayIdx) => {
            const choice   = activeChoices[origIdx]
            const selected = myAns?.choiceIdx === origIdx
            const answered = !!myAns
            return (
              <motion.button key={origIdx}
                whileHover={!answered && !frozen && !isSpectator && !isPaused ? { scale: 1.02 } : {}}
                whileTap={!answered && !frozen && !isSpectator && !isPaused ? { scale: 0.97 } : {}}
                onClick={!answered && !frozen && !isSpectator && !isPaused ? () => submitAnswer(origIdx) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px', borderRadius: 12, minHeight: 46,
                  background: selected ? choiceBgs[displayIdx] : (answered || isSpectator) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${selected ? choiceBorders[displayIdx] : 'rgba(255,255,255,0.09)'}`,
                  color: selected ? '#fff' : (answered || isSpectator) ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.80)',
                  cursor: answered || frozen || isSpectator || isPaused ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 24, height: 24, borderRadius: 7, background: selected ? choiceBorders[displayIdx] : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: selected ? '#fff' : 'rgba(255,255,255,0.40)', flexShrink: 0 }}>
                  {frozen && myEff.frozen ? '?' : choiceLetters[displayIdx]}
                </span>
                {frozen && myEff.frozen ? <span style={{ color: 'rgba(255,255,255,0.20)' }}>···</span> : choice}
              </motion.button>
            )
          })
        })()}
      </div>

      {myAns && !isSpectator && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.40)', fontStyle: 'italic', paddingBottom: 4 }}>
          Locked in — waiting for others…
        </motion.div>
      )}

      {/* 2.7: AI disclaimer */}
      <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.03em', paddingBottom: 2 }}>
        AI generated · verify important facts
      </div>
    </motion.div>
  )
}

function RevealScreen() {
  const { stubs, currentQIdx, correctIdx, explanation, aevaLine, answers, players, myUserId, scoreDeltas, effects, playerTiers } = useArenaStore()
  const stub = stubs[currentQIdx]
  const myAns = answers[myUserId]
  const myTier = playerTiers?.[myUserId] || 'standard'
  const isExpertPlayer = myTier === 'expert'
  const correctForMe = (isExpertPlayer && stub?.expertCorrect != null) ? stub.expertCorrect : correctIdx
  const displayChoices = (isExpertPlayer && stub?.expertChoices?.length) ? stub.expertChoices : stub?.choices
  const isCorrect = myAns?.choiceIdx === correctForMe
  const isBlinded = !!(effects[myUserId] || {}).blinded
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
        {(displayChoices || stub.choices).map((choice, i) => {
          const isRight = i === correctForMe
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

      {/* 5.4: Blind — hide standings for this reveal */}
      {isBlinded ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', padding: '16px', background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.30)', borderRadius: 12 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>😵</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FDA4AF' }}>Blinded — standings hidden</div>
        </motion.div>
      ) : null}

      {/* 3.4: Compact standings — top 5 + my position if outside */}
      {!isBlinded && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Standings</div>
        {(() => {
          const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
          const myPos  = sorted.findIndex(p => p.userId === myUserId)
          const top    = sorted.slice(0, 5)
          const showMe = myPos >= 5 ? sorted[myPos] : null
          const renderRow = (p, rank) => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 9, background: p.userId === myUserId ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${p.userId === myUserId ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: rank === 0 ? '#F59E0B' : 'rgba(255,255,255,0.28)', width: 14, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{rank + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: p.userId === myUserId ? '#A5B4FC' : 'rgba(255,255,255,0.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.displayName}{p.userId === myUserId && <span style={{ fontSize: 9, opacity: 0.55, marginLeft: 4 }}>YOU</span>}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtScore(p.score || 0)}</span>
              {scoreDeltas?.[p.userId] > 0 && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} style={{ fontSize: 10, color: '#6EE7B7', fontWeight: 700, flexShrink: 0 }}>
                  +{fmtScore(scoreDeltas[p.userId])}
                </motion.span>
              )}
            </div>
          )
          return (
            <>
              {top.map((p, i) => renderRow(p, i))}
              {showMe && <>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '1px 0' }}>···</div>
                {renderRow(showMe, myPos)}
              </>}
              {players.length > 5 && !showMe && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', paddingTop: 2 }}>+{players.length - 5} more</div>
              )}
            </>
          )
        })()}
      </div>}

      {/* 2.1: thumbs vote on question accuracy */}
      <VoteRow qIdx={currentQIdx} />
    </motion.div>
  )
}

function SabotageScreen() {
  const { players, myUserId, sabotagePlayed, isSpectator, myLastReceivedCard } = useArenaStore()
  const playCard = useArenaStore(s => s.playCard)
  const me = players.find(p => p.userId === myUserId)
  const myCards = me?.cards || []
  const [selectedCard, setSelectedCard] = useState(null)
  const [timer, setTimer] = useState(6)
  const [used, setUsed] = useState(false)

  useEffect(() => {
    const ref = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(ref); return 0 } return t - 1 }), 1000)
    return () => clearInterval(ref)
  }, [])

  const targets = players.filter(p => p.userId !== myUserId)
  const def = selectedCard ? CARD_DEFS[selectedCard] : null
  const progress = timer / 6

  // 5.7: rank map for target display
  const sortedByScore = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
  const rankMap = {}
  sortedByScore.forEach((p, i) => { rankMap[p.userId] = i + 1 })

  const handlePlay = (card, targetId, extra = {}) => {
    playCard(card, targetId, extra)
    setSelectedCard(null)
    setUsed(true)
  }

  // 3.7: spectator view — no cards, just countdown
  if (isSpectator) return (
    <motion.div key="sabotage-spectator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next question in</div>
      <div style={{ fontSize: 60, fontWeight: 900, color: timer <= 2 ? '#F43F5E' : '#F59E0B', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>{timer}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>👁 Spectating — no sabotage</div>
    </motion.div>
  )

  return (
    <motion.div key="sabotage" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header with countdown bar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>💣 Sabotage Window</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>Play a card to affect the next question</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: timer <= 2 ? '#F43F5E' : '#F59E0B', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s', minWidth: 36, textAlign: 'right' }}>{timer}</div>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.9, ease: 'linear' }}
            style={{ height: '100%', borderRadius: 99, background: timer <= 2 ? '#F43F5E' : '#F59E0B' }} />
        </div>
      </div>

      {used ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)', borderRadius: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#6EE7B7' }}>Card played!</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 3 }}>Next question starts in {timer}s</div>
        </motion.div>
      ) : myCards.length > 0 ? (
        <>
          {/* Step 1: pick a card */}
          {!selectedCard && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Step 1 — Pick a card
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myCards.map((card, i) => {
                  const d = CARD_DEFS[card]
                  if (!d) return null
                  return (
                    <motion.button key={`${card}-${i}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedCard(card)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(244,63,94,0.10)', border: '1.5px solid rgba(244,63,94,0.30)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 26, flexShrink: 0 }}>{d.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{d.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', marginTop: 2 }}>{d.desc}</div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: d.self ? '#A5B4FC' : '#FDA4AF', background: d.self ? 'rgba(99,102,241,0.15)' : 'rgba(244,63,94,0.15)', border: `1px solid ${d.self ? 'rgba(99,102,241,0.30)' : 'rgba(244,63,94,0.30)'}`, borderRadius: 99, padding: '2px 7px', flexShrink: 0 }}>
                        {d.self ? 'SELF' : 'TARGET'}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: pick a target */}
          {selectedCard && def && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* Show selected card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(244,63,94,0.14)', border: '1.5px solid rgba(244,63,94,0.40)', marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{def.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#FDA4AF' }}>{def.label} selected</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{def.desc}</div>
                </div>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setSelectedCard(null)}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Back
                </motion.button>
              </div>

              {def.self ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Step 2 — {selectedCard === 'wager' ? 'Choose your multiplier' : 'Use on yourself'}
                  </div>
                  {/* 5.6: Wager — pick 2× or 3× */}
                  {selectedCard === 'wager' ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[2, 3].map(mult => (
                        <motion.button key={mult} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handlePlay('wager', myUserId, { multiplier: mult })}
                          style={{ flex: 1, padding: '16px 0', borderRadius: 14, background: mult === 2 ? 'rgba(245,158,11,0.18)' : 'rgba(244,63,94,0.18)', border: `1.5px solid ${mult === 2 ? 'rgba(245,158,11,0.55)' : 'rgba(244,63,94,0.55)'}`, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 900 }}>{mult}×</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{mult === 2 ? 'Double or nothing' : 'Triple or bust'}</div>
                        </motion.button>
                      ))}
                    </div>
                  ) : selectedCard === 'echo' ? (
                    /* 5.4: Echo — show what card will be copied */
                    myLastReceivedCard && CARD_DEFS[myLastReceivedCard] ? (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => handlePlay('echo', myUserId)}
                        style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.22))', border: '1.5px solid rgba(99,102,241,0.55)', color: '#A5B4FC', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {CARD_DEFS[myLastReceivedCard].emoji} Echo → copy {CARD_DEFS[myLastReceivedCard].label}
                      </motion.button>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                        No card received yet — get hit first!
                      </div>
                    )
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handlePlay(selectedCard, myUserId)}
                      style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.22))', border: '1.5px solid rgba(99,102,241,0.55)', color: '#A5B4FC', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {def.emoji} Activate {def.label}
                    </motion.button>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Step 2 — Pick your target
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {targets.map(p => (
                      <motion.button key={p.userId} whileHover={{ scale: 1.02, background: 'rgba(244,63,94,0.22)' }} whileTap={{ scale: 0.96 }}
                        onClick={() => handlePlay(selectedCard, p.userId)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(244,63,94,0.12)', border: '1.5px solid rgba(244,63,94,0.38)', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                        {/* 5.7: rank badge */}
                        <span style={{ fontSize: 11, fontWeight: 900, color: rankMap[p.userId] === 1 ? '#F59E0B' : 'rgba(255,255,255,0.30)', width: 18, textAlign: 'center', flexShrink: 0 }}>#{rankMap[p.userId]}</span>
                        <PlayerChip player={p} myUserId={myUserId} showScore size={34} />
                        <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#FDA4AF', flexShrink: 0 }}>
                          {def.emoji} →
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🪙</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 600 }}>No cards in hand</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>Spend Chaos Coins in the shop — opens every 3 questions</div>
          <div style={{ fontSize: 12, color: '#A5B4FC', fontWeight: 700, marginTop: 8 }}>🪙 {me?.coins || 0} coins ready</div>
        </div>
      )}

      {/* Cards played log */}
      {sabotagePlayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Played this window</div>
          {sabotagePlayed.map((s, i) => {
            const cd = CARD_DEFS[s.card]
            const target = players.find(p => p.userId === s.target)
            const isMe = s.target === myUserId
            return (
              <div key={i} style={{ fontSize: 12, padding: '7px 10px', background: isMe ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)', borderRadius: 9, border: `1px solid ${isMe ? 'rgba(244,63,94,0.30)' : 'rgba(255,255,255,0.08)'}`, color: 'rgba(255,255,255,0.70)' }}>
                <span style={{ fontWeight: 700 }}>{s.byName}</span>{' '}
                used <span style={{ fontWeight: 700 }}>{cd?.emoji} {cd?.label}</span>
                {s.target !== s.by && target && <> on <span style={{ fontWeight: 700, color: isMe ? '#FDA4AF' : '#fff' }}>{isMe ? 'YOU' : target.displayName}</span></>}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function DoneScreen() {
  const { players, myUserId, settings, close, lastSessionStats, isHost } = useArenaStore()
  const allAnswers  = useArenaStore(s => s.allAnswers)
  const questions   = useArenaStore(s => s.questions)
  const code        = useArenaStore(s => s.code)
  const savageLog   = useArenaStore(s => s.savageLog)
  const rematch     = useArenaStore(s => s.rematch)
  const addDirectXP = useXPStore(s => s.addDirectXP)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const sorted  = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
  const myRank  = sorted.findIndex(p => p.userId === myUserId) + 1
  const isWinner = myRank === 1
  const medals  = ['🥇', '🥈', '🥉']

  // Award XP for all players (host XP also awarded here; _persistSessionResults doesn't double-award)
  useEffect(() => {
    const me = players.find(p => p.userId === myUserId)
    if (!me) return
    const xp    = myRank === 1 ? 150 : myRank <= 3 ? 75 : 30
    const label = myRank === 1 ? 'Arena Victory!' : myRank <= 3 ? 'Arena Podium' : 'Arena Match'
    addDirectXP(xp, label)
  }, [])

  // 4.8: CSV export — per-player, per-question result
  const handleExportCSV = useCallback(() => {
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
    const headers = ['Rank', 'Player', ...questions.map((_, i) => `Q${i + 1}`), 'Score']
    const rows = sortedPlayers.map((p, rank) => [
      rank + 1,
      p.displayName,
      ...questions.map((q, qi) => {
        const ans = allAnswers[qi]?.[p.userId]
        if (!ans) return '-'
        return ans.choiceIdx === q.correct
          ? `correct (${(ans.timeMs / 1000).toFixed(1)}s)`
          : 'wrong'
      }),
      p.score || 0,
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `arena-${code || 'results'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [players, questions, allAnswers, code])

  const handleShare = useCallback(async () => {
    const me = sorted.find(p => p.userId === myUserId)
    const W = 600, H = 315
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#06061a'); bg.addColorStop(1, '#04040f')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

    const glw = ctx.createRadialGradient(120, 80, 0, 120, 80, 200)
    glw.addColorStop(0, 'rgba(99,102,241,0.22)'); glw.addColorStop(1, 'transparent')
    ctx.fillStyle = glw; ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#6366F1'; ctx.fillRect(0, 0, W, 4)

    ctx.fillStyle = 'rgba(244,63,94,0.85)'
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
    ctx.fillText('ARENA: SABOTAGE', 40, 42)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 46px system-ui, -apple-system, sans-serif'
    ctx.fillText(me?.displayName || 'Player', 40, 115)

    const rankStr = myRank === 1 ? '1st Place' : myRank === 2 ? '2nd Place' : myRank === 3 ? '3rd Place' : `${myRank}th Place`
    ctx.fillStyle = myRank === 1 ? '#FCD34D' : 'rgba(255,255,255,0.65)'
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
    ctx.fillText(rankStr, 40, 158)

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '600 17px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${fmtScore(me?.score || 0)} pts  ·  ${settings.topic}`, 40, 196)

    if (lastSessionStats?.eloChange !== undefined) {
      const sign = lastSessionStats.eloChange >= 0 ? '+' : ''
      ctx.fillStyle = lastSessionStats.eloChange >= 0 ? '#6EE7B7' : '#FDA4AF'
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif'
      const eloText = `${sign}${lastSessionStats.eloChange} ELO`
      ctx.fillText(eloText, 40, 236)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '500 15px system-ui, -apple-system, sans-serif'
      ctx.fillText(`→ ${lastSessionStats.newElo} total`, 40 + ctx.measureText(eloText).width + 12, 236)
    }

    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.font = '500 13px system-ui, -apple-system, sans-serif'
    ctx.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 40, 278)

    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(99,102,241,0.65)'
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif'
    ctx.fillText('AEVA', W - 40, 278)

    ctx.strokeStyle = 'rgba(99,102,241,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

    canvas.toBlob(async blob => {
      if (!blob) return
      const file = new File([blob], 'arena-result.png', { type: 'image/png' })
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Arena: Sabotage', text: `I finished ${rankStr} in ${settings.topic}!` })
          return
        }
      } catch {}
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'arena-result.png'; a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [sorted, myUserId, myRank, settings, lastSessionStats])

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

      {/* ELO + accuracy stats — loads after _persistSessionResults resolves */}
      {lastSessionStats ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>ELO</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: lastSessionStats.eloChange >= 0 ? '#6EE7B7' : '#FDA4AF', fontVariantNumeric: 'tabular-nums' }}>
                {lastSessionStats.eloChange >= 0 ? '+' : ''}{lastSessionStats.eloChange}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>→ {lastSessionStats.newElo}</span>
            </div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Accuracy</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#A5B4FC', fontVariantNumeric: 'tabular-nums' }}>
              {lastSessionStats.correctCount}/{lastSessionStats.totalQuestions}
            </div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Rank</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: myRank === 1 ? '#FCD34D' : 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
              {myRank}/{lastSessionStats.playerCount}
            </div>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 58, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      )}

      {/* 6.6: Topic improvement report */}
      {lastSessionStats?.topicImprovement && (() => {
        const { topic, before, after } = lastSessionStats.topicImprovement
        const improved = after > before
        const delta    = after - before
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            style={{ padding: '12px 14px', borderRadius: 14, background: improved ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${improved ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{improved ? '📈' : '📊'}</span>
            <div>
              <div style={{ fontSize: 9, color: improved ? 'rgba(110,231,183,0.65)' : 'rgba(255,255,255,0.30)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                {topic} Accuracy
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', fontVariantNumeric: 'tabular-nums' }}>{before}%</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: improved ? '#6EE7B7' : 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>{after}%</span>
                {improved && <span style={{ fontSize: 11, fontWeight: 700, color: '#6EE7B7' }}>+{delta}pp this session</span>}
              </div>
            </div>
          </motion.div>
        )
      })()}

      {/* 7.7: Achievement badges */}
      {lastSessionStats?.achievements?.length > 0 && (() => {
        const BADGE_DEFS = {
          first_blood:  { emoji: '🩸', label: 'First Blood',   desc: 'First to throw a sabotage card'     },
          untouchable:  { emoji: '🛡️', label: 'Untouchable',  desc: 'Nobody touched you all game'        },
          perfect:      { emoji: '⭐', label: 'Perfect',       desc: 'Every question correct'             },
          ruthless:     { emoji: '⚔️', label: 'Ruthless',     desc: 'Most offensive cards played'        },
          speed_demon:  { emoji: '⚡', label: 'Speed Demon',   desc: 'Fastest average answer time'        },
        }
        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(245,158,11,0.06)', border: '1.5px solid rgba(245,158,11,0.20)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, color: 'rgba(253,211,77,0.65)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' }}>Achievements Unlocked</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lastSessionStats.achievements.map(key => {
                const def = BADGE_DEFS[key]
                if (!def) return null
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{def.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#FCD34D' }}>{def.label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{def.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )
      })()}

      {/* 3.4: Final leaderboard — top 10 + my position if outside */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.slice(0, 10).map((p, i) => (
          <motion.div key={p.userId}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: p.userId === myUserId ? 'rgba(99,102,241,0.14)' : i === 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${p.userId === myUserId ? 'rgba(99,102,241,0.35)' : i === 0 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
            <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i] || `${i + 1}`}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: p.userId === myUserId ? '#A5B4FC' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.displayName}{p.userId === myUserId && <span style={{ fontSize: 9, color: '#A5B4FC', marginLeft: 5 }}>YOU</span>}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: i === 0 ? '#FCD34D' : 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtScore(p.score || 0)}</div>
          </motion.div>
        ))}
        {myRank > 10 && (
          <>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '1px 0' }}>···</div>
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'rgba(99,102,241,0.14)', border: '1.5px solid rgba(99,102,241,0.35)' }}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{myRank}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#A5B4FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sorted[myRank - 1]?.displayName} <span style={{ fontSize: 9, opacity: 0.6 }}>YOU</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtScore(sorted[myRank - 1]?.score || 0)}</div>
            </motion.div>
          </>
        )}
      </div>

      {/* 5.8: Most Savage award */}
      {(() => {
        const offensive = savageLog.filter(e => e.target !== e.by)
        if (!offensive.length) return null
        const counts = {}
        const names  = {}
        const cards  = {}
        offensive.forEach(e => {
          counts[e.by] = (counts[e.by] || 0) + 1
          names[e.by]  = e.byName
          if (!cards[e.by]) cards[e.by] = {}
          cards[e.by][e.card] = (cards[e.by][e.card] || 0) + 1
        })
        const topId   = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
        const topName = names[topId]
        const topCard = Object.keys(cards[topId]).sort((a, b) => cards[topId][b] - cards[topId][a])[0]
        const topCount = counts[topId]
        const cardDef  = CARD_DEFS[topCard] || {}
        const isMe     = topId === myUserId
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
            style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.22)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🗡️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.65)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Most Savage</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? '#FCA5A5' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {topName}{isMe && <span style={{ fontSize: 9, color: '#FCA5A5', marginLeft: 5 }}>YOU</span>}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 1 }}>
                {topCount} attack{topCount > 1 ? 's' : ''} · {cardDef.emoji} {cardDef.label || topCard} was their weapon
              </div>
            </div>
          </motion.div>
        )
      })()}

      {/* 7.10: Anti-cheat notice (host only) — shown when suspicious activity detected */}
      {isHost && lastSessionStats?.suspiciousSpeed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FDA4AF' }}>Speed anomaly detected</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>One or more players answered 3+ questions in under 500ms</div>
          </div>
        </motion.div>
      )}

      {/* 4.7 + 4.8: Host-only accuracy breakdown table + CSV export */}
      {isHost && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAnalytics(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              <span>{showAnalytics ? '▲' : '▼'}</span>
              <span>Host Analytics · {players.length} player{players.length !== 1 ? 's' : ''}</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              📥 Export CSV
            </motion.button>
          </div>

          {showAnalytics && (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 220, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ minWidth: Math.max(280, (questions.length + 2) * 50), fontSize: 11 }}>
                {/* Header */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0 }}>
                  <div style={{ width: 90, padding: '6px 8px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>Player</div>
                  {questions.map((_, i) => (
                    <div key={i} style={{ width: 42, padding: '6px 2px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textAlign: 'center', flexShrink: 0 }}>Q{i + 1}</div>
                  ))}
                  <div style={{ width: 54, padding: '6px 8px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textAlign: 'right', flexShrink: 0 }}>Score</div>
                </div>
                {/* Rows */}
                {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, ri) => (
                  <div key={p.userId} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: p.userId === myUserId ? 'rgba(99,102,241,0.08)' : ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <div style={{ width: 90, padding: '5px 8px', color: p.userId === myUserId ? '#A5B4FC' : 'rgba(255,255,255,0.65)', fontWeight: 600, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.displayName}</div>
                    {questions.map((q, qi) => {
                      const ans     = allAnswers[qi]?.[p.userId]
                      const correct = ans && ans.choiceIdx === q.correct
                      const secs    = ans ? (ans.timeMs / 1000).toFixed(1) : null
                      return (
                        <div key={qi} style={{ width: 42, padding: '4px 2px', textAlign: 'center', flexShrink: 0 }}>
                          {!ans ? (
                            <span style={{ color: 'rgba(255,255,255,0.16)' }}>—</span>
                          ) : correct ? (
                            <div>
                              <div style={{ color: '#6EE7B7', fontWeight: 800 }}>✓</div>
                              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>{secs}s</div>
                            </div>
                          ) : (
                            <span style={{ color: '#FDA4AF', fontWeight: 800 }}>✗</span>
                          )}
                        </div>
                      )
                    })}
                    <div style={{ width: 54, padding: '5px 8px', color: 'rgba(255,255,255,0.55)', fontWeight: 700, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtScore(p.score || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {isHost ? (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={rematch}
            style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.30)', color: '#A5B4FC', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔁 Rematch
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => useArenaStore.setState({ phase: 'entry' })}
            style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            New Game
          </motion.button>
        )}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={close}
          style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Arcade
        </motion.button>
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', color: '#A5B4FC', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        📸 Share Result Card
      </motion.button>
    </motion.div>
  )
}

// ── HostBar — 4.1: Host-only control panel rendered below screen content ───────

// ── ShopScreen ────────────────────────────────────────────────────────────────

function ShopScreen() {
  const { shopCards, myUserId, players, isHost, closeShop, buyCard } = useArenaStore()
  const SHOP_DURATION = 25
  const [secsLeft, setSecsLeft] = useState(SHOP_DURATION)
  const me = players.find(p => p.userId === myUserId) || {}
  const myCoins = me.coins ?? 100
  const myCards = me.cards || []

  useEffect(() => {
    const t = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const tierColor = { common: '#9CA3AF', rare: '#818CF8', legendary: '#F59E0B' }
  const tierLabel = { common: 'Common', rare: 'Rare', legendary: 'Legendary' }

  return (
    <motion.div key="shop"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Card Shop</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>Closes in {secsLeft}s · {shopCards.length} cards available</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#FCD34D', fontVariantNumeric: 'tabular-nums' }}>🪙 {myCoins}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Chaos Coins</span>
        </div>
      </div>

      {/* Countdown bar */}
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div animate={{ width: `${(secsLeft / SHOP_DURATION) * 100}%` }} transition={{ duration: 1, ease: 'linear' }}
          style={{ height: '100%', background: secsLeft < 8 ? '#EF4444' : '#6366F1', borderRadius: 99 }} />
      </div>

      {/* Card grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shopCards.map((cardKey, i) => {
          const def     = CARD_DEFS[cardKey] || {}
          const canBuy  = myCoins >= def.cost
          const owned   = myCards.filter(c => c === cardKey).length
          return (
            <motion.div key={cardKey + i}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)', border: `1.5px solid rgba(255,255,255,0.08)` }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{def.emoji || '❓'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{def.label || cardKey}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: tierColor[def.tier] || '#fff', background: `${tierColor[def.tier]}18`, border: `1px solid ${tierColor[def.tier]}40`, borderRadius: 99, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {tierLabel[def.tier] || def.tier}
                  </span>
                  {owned > 0 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>×{owned} owned</span>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, lineHeight: 1.3 }}>{def.desc}</div>
              </div>
              <motion.button whileTap={{ scale: canBuy ? 0.90 : 1 }} onClick={() => canBuy && buyCard(cardKey)}
                style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: canBuy ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0,
                  background: canBuy ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${canBuy ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.09)'}`,
                  color: canBuy ? '#A5B4FC' : 'rgba(255,255,255,0.20)' }}>
                🪙 {def.cost}
              </motion.button>
            </motion.div>
          )
        })}
      </div>

      {/* Host close-early button */}
      {isHost && (
        <motion.button whileTap={{ scale: 0.93 }} onClick={closeShop}
          style={{ padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', color: '#F59E0B', marginTop: 4 }}>
          Close Shop Early →
        </motion.button>
      )}
    </motion.div>
  )
}

function HostBar() {
  const { isPaused, answers, players, phase, hostPreviewQ, myUserId } = useArenaStore()
  const pauseGame        = useArenaStore(s => s.pauseGame)
  const resumeGame       = useArenaStore(s => s.resumeGame)
  const extendTimer      = useArenaStore(s => s.extendTimer)
  const kickPlayer       = useArenaStore(s => s.kickPlayer)
  const hostSkipQuestion = useArenaStore(s => s.hostSkipQuestion)
  const closeShopAction  = useArenaStore(s => s.closeShop)
  const [showPlayers, setShowPlayers] = useState(false)
  const [kickConfirm, setKickConfirm] = useState(null)

  // Auto-clear kick confirmation after 3s
  useEffect(() => {
    if (!kickConfirm) return
    const t = setTimeout(() => setKickConfirm(null), 3000)
    return () => clearTimeout(t)
  }, [kickConfirm])

  const answeredCount = players.filter(p => answers[p.userId]).length

  const ctrlBtn = (label, onClick, active = false) => (
    <motion.button whileTap={{ scale: 0.91 }} onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        background: active ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.12)'}`,
        color: active ? '#A5B4FC' : 'rgba(255,255,255,0.60)',
      }}>
      {label}
    </motion.button>
  )

  return (
    <div style={{
      background: 'rgba(5,5,18,0.98)', borderTop: '1px solid rgba(255,255,255,0.10)',
      padding: '10px 20px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
    }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 99, padding: '2px 8px', letterSpacing: '0.08em', flexShrink: 0 }}>HOST</span>

        {/* 4.2: Pause/resume, 4.9: extend, 4.3: skip — only during question */}
        {phase === 'question' && (
          <>
            {ctrlBtn(isPaused ? '▶ Resume' : '⏸ Pause', isPaused ? resumeGame : pauseGame, isPaused)}
            {ctrlBtn('+5s', extendTimer)}
            {ctrlBtn('Skip Q →', hostSkipQuestion)}
          </>
        )}

        {/* 5.2: Close shop early — only during shop */}
        {phase === 'shop' && (
          ctrlBtn('Close Shop →', closeShopAction, false)
        )}

        {/* 4.6: Answer progress indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {phase === 'question' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: answeredCount === players.length ? '#10B981' : 'rgba(255,255,255,0.40)', fontVariantNumeric: 'tabular-nums' }}>
                {answeredCount}/{players.length}
              </span>
              {players.length <= 12 && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {players.map(p => (
                    <div key={p.userId} style={{ width: 6, height: 6, borderRadius: '50%', background: answers[p.userId] ? '#10B981' : 'rgba(255,255,255,0.14)', transition: 'background 0.25s' }} />
                  ))}
                </div>
              )}
            </div>
          )}
          {/* 4.5: Player list toggle for mid-game kick */}
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowPlayers(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 7, background: showPlayers ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showPlayers ? 'rgba(99,102,241,0.30)' : 'rgba(255,255,255,0.09)'}`, color: 'rgba(255,255,255,0.40)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Users size={11} />
            {showPlayers ? '▲' : '▼'}
          </motion.button>
        </div>
      </div>

      {/* 4.10: Host preview of next question (shown during sabotage phase) */}
      {hostPreviewQ?.q && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.24)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>⚡ Next Question (Host Preview)</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4, fontWeight: 500 }}>{hostPreviewQ.q}</div>
          {hostPreviewQ.category && (
            <div style={{ fontSize: 9, color: 'rgba(165,180,252,0.55)', marginTop: 4, fontWeight: 600 }}>{hostPreviewQ.category}</div>
          )}
        </motion.div>
      )}

      {/* Player list with kick controls (4.4 lobby / 4.5 mid-game) */}
      {showPlayers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
          {players.map(p => {
            const isMe      = p.userId === myUserId
            const isConfirm = kickConfirm === p.userId
            return (
              <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  {phase === 'question' && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: answers[p.userId] ? '#10B981' : 'rgba(255,255,255,0.15)', transition: 'background 0.25s' }} />
                  )}
                  <span style={{ fontSize: 11, color: isMe ? '#A5B4FC' : 'rgba(255,255,255,0.60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.displayName}{isMe ? ' (you)' : ''}
                  </span>
                </div>
                {!isMe && (
                  isConfirm ? (
                    <motion.button whileTap={{ scale: 0.90 }}
                      onClick={() => { kickPlayer(p.userId); setKickConfirm(null) }}
                      style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(244,63,94,0.80)', border: '1px solid rgba(244,63,94,0.90)', borderRadius: 6, padding: '2px 9px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Confirm
                    </motion.button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.90 }}
                      onClick={() => setKickConfirm(p.userId)}
                      style={{ fontSize: 10, fontWeight: 600, color: 'rgba(244,63,94,0.60)', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 6, padding: '2px 9px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Kick
                    </motion.button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── LeaderboardScreen ──────────────────────────────────────────────────────────

function LeaderboardScreen() {
  const { myBaseUserId } = useArenaStore()
  const [tab, setTab]           = useState('global')
  const [loading, setLoading]   = useState(true)
  const [globalRows, setGlobal] = useState([])
  const [friendRows, setFriends] = useState([])
  const [myProfile, setMyProfile] = useState(null)

  useEffect(() => { loadGlobal() }, [])
  useEffect(() => { if (tab === 'friends' && friendRows.length === 0) loadFriends() }, [tab])

  const loadGlobal = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('arena_leaderboard')
      .select('user_id, display_name, elo, wins, losses, total_games, accuracy_pct, title_badge, global_rank')
      .limit(100)
    const rows = data || []
    setGlobal(rows)
    if (myBaseUserId) setMyProfile(rows.find(r => r.user_id === myBaseUserId) || null)
    setLoading(false)
  }

  const loadFriends = async () => {
    setLoading(true)
    if (!myBaseUserId) { setLoading(false); return }
    const { data: mine }  = await supabase.from('arena_results').select('session_id').eq('user_id', myBaseUserId)
    const sids = [...new Set((mine || []).map(r => r.session_id))]
    if (!sids.length) { setLoading(false); return }
    const { data: all } = await supabase.from('arena_results').select('user_id').in('session_id', sids)
    const fids = [...new Set((all || []).map(r => r.user_id))]
    if (!fids.length) { setLoading(false); return }
    const { data: profiles } = await supabase.from('arena_profiles')
      .select('user_id, display_name, elo, wins, losses, total_games, accuracy_pct, title_badge')
      .in('user_id', fids).order('elo', { ascending: false }).limit(50)
    setFriends(profiles || [])
    setLoading(false)
  }

  const rows = tab === 'global' ? globalRows : friendRows

  const renderRow = (row, idx) => {
    const isMe  = row.user_id === myBaseUserId
    const rank  = tab === 'global' ? (row.global_rank || idx + 1) : idx + 1
    const rkCol = rank === 1 ? '#FCD34D' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.22)'
    return (
      <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: isMe ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.06)'}`, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: rkCol, width: 22, textAlign: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? '#A5B4FC' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.display_name}
            {isMe && <span style={{ fontSize: 9, color: '#A5B4FC', marginLeft: 5 }}>YOU</span>}
            {row.title_badge && (
              <span style={{ fontSize: 9, color: '#FCD34D', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 99, padding: '1px 5px', marginLeft: 6 }}>
                {row.title_badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
            W{row.wins} L{row.losses} · {Math.round((row.accuracy_pct || 0) * 100)}% acc
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: isMe ? '#A5B4FC' : 'rgba(255,255,255,0.80)', fontVariantNumeric: 'tabular-nums' }}>{row.elo}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>ELO</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div key="leaderboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => useArenaStore.setState({ phase: 'entry' })}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '5px 8px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={14} />
        </motion.button>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Leaderboard</div>
      </div>

      {/* My rank strip (global tab only) */}
      {myProfile && tab === 'global' && (
        <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.24)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(165,180,252,0.55)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 3 }}>Your Rank</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>#{myProfile.global_rank} · {myProfile.elo} ELO</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>W{myProfile.wins} L{myProfile.losses}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{Math.round((myProfile.accuracy_pct || 0) * 100)}% acc</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[['global', '🌍 Global'], ['friends', '👥 Friends']].map(([t, label]) => (
          <motion.button key={t} whileTap={{ scale: 0.95 }} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: tab === t ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${tab === t ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`, color: tab === t ? '#A5B4FC' : 'rgba(255,255,255,0.40)' }}>
            {label}
          </motion.button>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 52, borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }} />
          ))
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.22)', fontSize: 13 }}>
            {tab === 'friends' ? 'Play a game with friends to see them here' : 'No players yet — be the first!'}
          </div>
        ) : (
          rows.map((row, idx) => renderRow(row, idx))
        )}
      </div>
    </motion.div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function Arena() {
  const { isOpen, phase, close, isHost } = useArenaStore()

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
        <IncomingCardToast />
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
              {phase === 'entry'       && <EntryScreen key="entry" />}
              {phase === 'create'      && <CreateScreen key="create" />}
              {phase === 'join'        && <JoinScreen key="join" prefillCode={prefillCode} />}
              {phase === 'lobby'       && <LobbyScreen key="lobby" />}
              {phase === 'countdown'   && <CountdownScreen key="countdown" />}
              {phase === 'preparing'   && <PreparingScreen key="preparing" />}
              {phase === 'question'    && <QuestionScreen key="question" />}
              {phase === 'reveal'      && <RevealScreen key="reveal" />}
              {phase === 'sabotage'    && <SabotageScreen key="sabotage" />}
              {phase === 'shop'        && <ShopScreen key="shop" />}
              {phase === 'done'        && <DoneScreen key="done" />}
              {phase === 'leaderboard' && <LeaderboardScreen key="leaderboard" />}
            </AnimatePresence>
          </div>
        </div>
        {/* 4.1: Host dashboard bar — visible only to host during active game */}
        {isHost && ['question', 'reveal', 'sabotage', 'shop'].includes(phase) && <HostBar />}
      </motion.div>
    </AnimatePresence>
  )
}
