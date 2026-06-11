import { create } from 'zustand'
import { supabase } from './supabase'
import { nextGroqKey, GROQ_URL } from './groqClient'

// ── Helpers ───────────────────────────────────────────────────────────────────

function genCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const N = '0123456789'
  const l = () => L[Math.floor(Math.random() * L.length)]
  const n = () => N[Math.floor(Math.random() * N.length)]
  return `${l()}${l()}${l()}-${n()}${n()}${n()}`
}

// Per-tab suffix so the same account can join from two tabs without presence collision
const TAB_ID = Math.random().toString(36).slice(2, 7)

export const SLOT_COLORS = [
  { bg: '#6366F1', glow: 'rgba(99,102,241,0.45)',  dim: 'rgba(99,102,241,0.15)'  },
  { bg: '#F43F5E', glow: 'rgba(244,63,94,0.45)',   dim: 'rgba(244,63,94,0.15)'   },
  { bg: '#F59E0B', glow: 'rgba(245,158,11,0.45)',  dim: 'rgba(245,158,11,0.15)'  },
  { bg: '#10B981', glow: 'rgba(16,185,129,0.45)',  dim: 'rgba(16,185,129,0.15)'  },
  { bg: '#8B5CF6', glow: 'rgba(139,92,246,0.45)',  dim: 'rgba(139,92,246,0.15)'  },
  { bg: '#06B6D4', glow: 'rgba(6,182,212,0.45)',   dim: 'rgba(6,182,212,0.15)'   },
]

const emptyStats = () => ({
  focusSeconds:       0,
  totalSeconds:       0,
  currentStreak:      0,
  peakStreak:         0,
  battlesEntered:     0,
  battlesStarsTotal:  0,
  nodesCompleted:     [],
  xp: { focus: 0, battles: 0, nodes: 0, bonus: 0 },
})

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStudyRoomStore = create((set, get) => ({
  // ── UI state
  isOpen:      false,
  isMinimized: false,

  // ── Room config
  phase:         'idle',   // idle|lobby|session|break|battle|results|stats
  code:          null,
  isHost:        false,
  mode:          'battle', // silent|battle|weakspot
  workMins:      25,
  breakMins:     5,
  totalSessions: 4,
  subject:       '',

  // ── My identity (set on create/join)
  myUserId:      null,
  myDisplayName: '',
  myColor:       null,    // SLOT_COLORS entry

  // ── Members (from presence sync)
  members: [],            // [{ userId, displayName, color, status, orbPersonality, stats }]

  // ── Timer
  timerSeconds:  0,
  timerPhase:    'work',  // work|break
  sessionNumber: 0,
  _timerRef:     null,
  _statsRef:     null,

  // ── Battle
  currentQuestion: null,  // { question, hint, ideal_answer }
  answers:         {},    // { userId: { text, stars, feedback, xp, isFirst, submittedAt } }
  isScoring:       false,

  // ── My stats (live)
  myStats: emptyStats(),

  // ── Feed
  feed: [],               // [{ id, emoji, text, isAeva, time }]

  // ── Channel ref
  _channel: null,

  // ─────────────────────────────────────────────────────────────────────────
  // Public actions
  // ─────────────────────────────────────────────────────────────────────────

  open: () => set({ isOpen: true, isMinimized: false }),

  closeRoom: () => {
    const { _channel, _timerRef, _statsRef } = get()
    if (_timerRef)  clearInterval(_timerRef)
    if (_statsRef)  clearInterval(_statsRef)
    if (_channel) {
      _channel.untrack()
      _channel.unsubscribe()
      supabase.removeChannel(_channel)
    }
    set({
      isOpen: false, isMinimized: false, phase: 'idle',
      code: null, isHost: false, members: [],
      answers: {}, currentQuestion: null, feed: [],
      myStats: emptyStats(), _channel: null,
      _timerRef: null, _statsRef: null,
      sessionNumber: 0, timerSeconds: 0,
    })
  },

  createRoom: async ({ mode, workMins, breakMins, totalSessions, subject, userId, displayName, orbPersonality }) => {
    const code    = genCode()
    const tabUserId = `${userId}-${TAB_ID}`
    const color   = SLOT_COLORS[0]
    const ch      = get()._buildChannel(code, tabUserId, true)
    await ch.subscribe()
    await ch.track({ userId: tabUserId, displayName, color, orbPersonality: orbPersonality || 'balanced', status: 'waiting', stats: emptyStats() })
    set({
      code, isHost: true, mode, workMins, breakMins, totalSessions, subject,
      myUserId: tabUserId, myDisplayName: displayName, myColor: color,
      phase: 'lobby', _channel: ch,
      isOpen: true, isMinimized: false,
      timerSeconds: workMins * 60, myStats: emptyStats(),
    })
  },

  joinRoom: async (code, { userId, displayName, orbPersonality }) => {
    const trimmed   = code.trim().toUpperCase()
    const tabUserId = `${userId}-${TAB_ID}`
    const slot      = Math.min(SLOT_COLORS.length - 1, Math.floor(Math.random() * (SLOT_COLORS.length - 1)) + 1)
    const color     = SLOT_COLORS[slot]
    const ch        = get()._buildChannel(trimmed, tabUserId, false)
    await ch.subscribe()
    await ch.track({ userId: tabUserId, displayName, color, orbPersonality: orbPersonality || 'balanced', status: 'waiting', stats: emptyStats() })
    set({
      code: trimmed, isHost: false,
      myUserId: tabUserId, myDisplayName: displayName, myColor: color,
      phase: 'lobby', _channel: ch,
      isOpen: true, isMinimized: false,
      myStats: emptyStats(),
    })
  },

  startSession: () => {
    const { _channel, mode, workMins, breakMins, totalSessions, subject } = get()
    set({ phase: 'session', timerSeconds: workMins * 60, timerPhase: 'work', sessionNumber: 1, myStats: emptyStats() })
    get()._startTimer()
    get()._startStatsTracking()
    get()._pushFeed({ emoji: '🔥', text: 'Session started — get locked in' })
    _channel?.send({
      type: 'broadcast', event: 'start_session',
      payload: { mode, workMins, breakMins, totalSessions, subject },
    })
  },

  setStatus: (status) => {
    const { _channel, myUserId, myDisplayName, myColor, myStats } = get()
    _channel?.track({ userId: myUserId, displayName: myDisplayName, color: myColor, status, stats: myStats, orbPersonality: 'balanced' })
  },

  submitAnswer: async (text) => {
    const { currentQuestion, myUserId, myDisplayName, myColor, _channel, answers, myStats } = get()
    if (!text.trim() || !currentQuestion || answers[myUserId]) return
    set({ isScoring: true })

    const isFirst  = Object.keys(answers).length === 0
    let stars = 1, feedback = 'Submitted.'

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content:
            `Score this answer.\nQuestion: "${currentQuestion.question}"\nIdeal: "${currentQuestion.ideal_answer}"\nAnswer: "${text}"\nReturn ONLY: { "stars": 1|2|3, "feedback": "one sentence" }` }],
          response_format: { type: 'json_object' },
          temperature: 0.3, max_tokens: 80,
        }),
      })
      const d  = await res.json()
      const r  = JSON.parse(d.choices[0].message.content)
      stars    = Math.min(3, Math.max(1, r.stars || 1))
      feedback = r.feedback || feedback
    } catch (_) {}

    const xpEarned  = stars === 3 ? 40 : stars === 2 ? 20 : 10
    const speedBonus = isFirst ? 10 : 0
    const totalXp   = xpEarned + speedBonus

    const updated = {
      ...myStats,
      battlesEntered:    myStats.battlesEntered + 1,
      battlesStarsTotal: myStats.battlesStarsTotal + stars,
      xp: { ...myStats.xp, battles: myStats.xp.battles + totalXp },
    }
    const payload = { userId: myUserId, displayName: myDisplayName, color: myColor, text, stars, feedback, xp: totalXp, isFirst, submittedAt: Date.now() }

    set(s => ({ answers: { ...s.answers, [myUserId]: payload }, isScoring: false, myStats: updated }))
    _channel?.send({ type: 'broadcast', event: 'answer', payload })
    _channel?.track({ userId: myUserId, displayName: myDisplayName, color: myColor, status: 'working', stats: updated, orbPersonality: 'balanced' })
  },

  onNodeCompleted: (nodeTitle) => {
    const { _channel, myDisplayName, myStats } = get()
    const updated = {
      ...myStats,
      nodesCompleted: [...myStats.nodesCompleted, nodeTitle],
      xp: { ...myStats.xp, nodes: myStats.xp.nodes + 30 },
    }
    set({ myStats: updated })
    const item = { emoji: '📚', text: `${myDisplayName} completed "${nodeTitle}"`, id: Date.now() }
    get()._pushFeed(item)
    _channel?.send({ type: 'broadcast', event: 'feed_item', payload: item })
  },

  dismissResults: () => {
    set({ phase: 'session', answers: {}, currentQuestion: null })
  },

  getCollectiveEnergy: () => {
    const { members } = get()
    if (!members.length) return 0
    const working = members.filter(m => m.status === 'working').length
    return Math.round((working / members.length) * 100)
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────────────

  _buildChannel: (code, myUserId, isHost) => {
    const ch = supabase.channel(`study-room:${code}`, { config: { presence: { key: myUserId } } })

    // Presence — member list
    ch.on('presence', { event: 'sync' }, () => {
      const state   = ch.presenceState()
      const members = Object.values(state).flat()
      set({ members })
    })

    // Broadcast — session start (guests receive)
    ch.on('broadcast', { event: 'start_session' }, ({ payload }) => {
      if (get().isHost) return
      const { mode, workMins, breakMins, totalSessions, subject } = payload
      set({ mode, workMins, breakMins, totalSessions, subject, timerSeconds: workMins * 60, timerPhase: 'work', sessionNumber: 1, phase: 'session', myStats: emptyStats() })
      get()._startTimer()
      get()._startStatsTracking()
    })

    // Broadcast — timer sync (guests receive)
    ch.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      if (get().isHost) return
      get()._clearTimer()
      set({ timerSeconds: payload.seconds, timerPhase: payload.timerPhase })
      get()._startTimer()
    })

    // Broadcast — phase change
    ch.on('broadcast', { event: 'phase_change' }, ({ payload }) => {
      if (get().isHost) return
      get()._clearTimer()
      set({ timerPhase: payload.timerPhase, timerSeconds: payload.seconds, sessionNumber: payload.sessionNumber })
      if (payload.timerPhase === 'work') {
        set({ phase: 'session', answers: {}, currentQuestion: null })
      }
      get()._startTimer()
    })

    // Broadcast — question for battle
    ch.on('broadcast', { event: 'question' }, ({ payload }) => {
      set({ currentQuestion: payload.question, phase: 'battle', answers: {}, isScoring: false })
    })

    // Broadcast — member's answer
    ch.on('broadcast', { event: 'answer' }, ({ payload }) => {
      set(s => ({ answers: { ...s.answers, [payload.userId]: payload } }))
    })

    // Broadcast — feed
    ch.on('broadcast', { event: 'feed_item' }, ({ payload }) => {
      get()._pushFeed(payload)
    })

    // Broadcast — Aeva drop
    ch.on('broadcast', { event: 'aeva_drop' }, ({ payload }) => {
      get()._pushFeed({ emoji: '🤖', text: payload.text, isAeva: true, id: Date.now() })
    })

    // Broadcast — session end
    ch.on('broadcast', { event: 'session_end' }, () => {
      if (!get().isHost) get()._endSession()
    })

    set({ _channel: ch })
    return ch
  },

  _startTimer: () => {
    get()._clearTimer()
    const ref = setInterval(() => {
      const s = get()
      const next = s.timerSeconds - 1

      // Host syncs to guests every 15s
      if (s.isHost && next > 0 && next % 15 === 0) {
        s._channel?.send({ type: 'broadcast', event: 'timer_sync', payload: { seconds: next, timerPhase: s.timerPhase } })
      }

      if (next <= 0) {
        clearInterval(ref)
        set({ _timerRef: null, timerSeconds: 0 })
        get()._onTimerEnd()
      } else {
        set({ timerSeconds: next })
      }
    }, 1000)
    set({ _timerRef: ref })
  },

  _clearTimer: () => {
    const { _timerRef } = get()
    if (_timerRef) clearInterval(_timerRef)
    set({ _timerRef: null })
  },

  _onTimerEnd: () => {
    const { timerPhase, sessionNumber, totalSessions, isHost, mode, breakMins, workMins, _channel, subject } = get()

    if (timerPhase === 'work') {
      // Transition to break
      set({ timerPhase: 'break', timerSeconds: breakMins * 60, phase: mode === 'silent' ? 'break' : 'battle' })
      get()._startTimer()
      get()._pushFeed({ emoji: '☕', text: `Round ${sessionNumber} done — break time` })

      if (isHost) {
        _channel?.send({ type: 'broadcast', event: 'phase_change', payload: { timerPhase: 'break', seconds: breakMins * 60, sessionNumber } })
        if (mode !== 'silent') setTimeout(() => get()._generateQuestion(subject), 800)
        setTimeout(() => get()._aevaObservation(), 3000)
      }
    } else {
      // Transition back to work or end
      const next = sessionNumber + 1
      if (next > totalSessions) {
        if (isHost) _channel?.send({ type: 'broadcast', event: 'session_end' })
        get()._endSession()
      } else {
        set({ timerPhase: 'work', timerSeconds: workMins * 60, sessionNumber: next, phase: 'session', answers: {}, currentQuestion: null })
        get()._startTimer()
        get()._pushFeed({ emoji: '⚡', text: `Round ${next} — back to work` })
        if (isHost) _channel?.send({ type: 'broadcast', event: 'phase_change', payload: { timerPhase: 'work', seconds: workMins * 60, sessionNumber: next } })
      }
    }
  },

  _startStatsTracking: () => {
    const { _statsRef } = get()
    if (_statsRef) clearInterval(_statsRef)
    const ref = setInterval(() => {
      const { members, myUserId, _channel, myDisplayName, myColor, myStats } = get()
      const mine    = members.find(m => m.userId === myUserId)
      const working = mine?.status === 'working'
      const newStreak = working ? myStats.currentStreak + 1 : 0
      const updated = {
        ...myStats,
        focusSeconds:  working ? myStats.focusSeconds + 1 : myStats.focusSeconds,
        totalSeconds:  myStats.totalSeconds + 1,
        currentStreak: newStreak,
        peakStreak:    Math.max(myStats.peakStreak, newStreak),
        xp: { ...myStats.xp, focus: myStats.xp.focus + (working ? 2 / 60 : 0) },
      }
      set({ myStats: updated })
      // Sync stats to presence every 10s
      if (updated.totalSeconds % 10 === 0) {
        _channel?.track({ userId: myUserId, displayName: myDisplayName, color: myColor, status: mine?.status || 'working', stats: updated, orbPersonality: mine?.orbPersonality || 'balanced' })
      }
    }, 1000)
    set({ _statsRef: ref })
  },

  _generateQuestion: async (subject) => {
    const { _channel, mode } = get()
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content:
            `Generate ONE challenging exam question about "${subject || 'general knowledge'}".${mode === 'weakspot' ? ' Focus on commonly misunderstood concepts.' : ' Make it competitive and thought-provoking.'}
Return ONLY valid JSON: { "question": "...", "hint": "...", "ideal_answer": "..." }
Question must require explanation, not just recall. 2-3 sentences max.` }],
          response_format: { type: 'json_object' },
          temperature: 0.8, max_tokens: 200,
        }),
      })
      const d = await res.json()
      const q = JSON.parse(d.choices[0].message.content)
      set({ currentQuestion: q, phase: 'battle', answers: {} })
      _channel?.send({ type: 'broadcast', event: 'question', payload: { question: q } })
    } catch (e) { console.error('Question gen failed', e) }
  },

  _aevaObservation: async () => {
    const { members, myStats, sessionNumber, subject, _channel, mode } = get()
    try {
      const focusPcts = members.map(m => {
        const s = m.stats || emptyStats()
        return s.totalSeconds > 0 ? Math.round((s.focusSeconds / s.totalSeconds) * 100) : 0
      })
      const avgFocus = focusPcts.length ? Math.round(focusPcts.reduce((a, b) => a + b, 0) / focusPcts.length) : 0
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content:
            `You are Aeva. Write ONE observation for a group study room. Max 12 words. Direct, no emojis.
Round: ${sessionNumber}. Subject: ${subject || 'mixed'}. Avg focus: ${avgFocus}%. People: ${members.length}.` }],
          temperature: 0.8, max_tokens: 40,
        }),
      })
      const d    = await res.json()
      const text = d.choices[0]?.message?.content?.trim()
      if (text) {
        _channel?.send({ type: 'broadcast', event: 'aeva_drop', payload: { text } })
        get()._pushFeed({ emoji: '🤖', text, isAeva: true, id: Date.now() })
      }
    } catch (_) {}
  },

  _endSession: () => {
    const { _timerRef, _statsRef, myStats } = get()
    if (_timerRef) clearInterval(_timerRef)
    if (_statsRef) clearInterval(_statsRef)
    const focusXP = Math.round(myStats.xp.focus)
    const focusPct = myStats.totalSeconds > 0 ? myStats.focusSeconds / myStats.totalSeconds : 0
    const bonus = focusPct >= 0.9 ? 50 : focusPct >= 0.75 ? 25 : 0
    set({
      phase: 'stats', _timerRef: null, _statsRef: null,
      myStats: { ...myStats, xp: { ...myStats.xp, focus: focusXP, bonus, } },
    })
  },

  _pushFeed: (item) => {
    set(s => ({ feed: [{ ...item, id: item.id || Date.now() + Math.random(), time: Date.now() }, ...s.feed].slice(0, 20) }))
  },
}))
