/**
 * arenaStore — Arena: Sabotage multiplayer quiz game
 * Supabase Realtime broadcast + presence, Groq question generation,
 * Supabase DB persistence for ELO, stats, leaderboards.
 */
import { create } from 'zustand'
import { supabase } from './supabase'
import { nextGroqKey, GROQ_URL } from './groqClient'
import { useXPStore } from './xpStore'

const TAB_ID = Math.random().toString(36).slice(2, 7)

function genCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pick = () => L[Math.floor(Math.random() * L.length)]
  return `${pick()}${pick()}${pick()}${pick()}${pick()}${pick()}`
}

export const ARENA_COLORS = [
  { bg: '#6366F1', glow: 'rgba(99,102,241,0.55)',  dim: 'rgba(99,102,241,0.12)' },
  { bg: '#F43F5E', glow: 'rgba(244,63,94,0.55)',   dim: 'rgba(244,63,94,0.12)'  },
  { bg: '#10B981', glow: 'rgba(16,185,129,0.55)',  dim: 'rgba(16,185,129,0.12)' },
  { bg: '#F59E0B', glow: 'rgba(245,158,11,0.55)',  dim: 'rgba(245,158,11,0.12)' },
  { bg: '#8B5CF6', glow: 'rgba(139,92,246,0.55)',  dim: 'rgba(139,92,246,0.12)' },
  { bg: '#EC4899', glow: 'rgba(236,72,153,0.55)',  dim: 'rgba(236,72,153,0.12)' },
  { bg: '#14B8A6', glow: 'rgba(20,184,166,0.55)',  dim: 'rgba(20,184,166,0.12)' },
  { bg: '#EF4444', glow: 'rgba(239,68,68,0.55)',   dim: 'rgba(239,68,68,0.12)'  },
]

export const CARD_DEFS = {
  freeze:      { emoji: '🧊', label: 'Freeze',      desc: 'Hide their choices for 4s',         self: false },
  steal:       { emoji: '💸', label: 'Steal',       desc: 'Take 300 pts from target',          self: false },
  double_down: { emoji: '⚡', label: 'Double Down', desc: '2× points on your next answer',     self: true  },
  bomb:        { emoji: '💣', label: 'Bomb',        desc: 'Block their screen for 2s',         self: false },
}

const BASE_PTS    = 1000
const SPEED_MAX   = 500
const STREAK_BONUS = 200
const STEAL_AMT   = 300
const Q_TIME      = 15
const ELO_K       = 32

// ── ELO: each player vs every other player, normalised by (N-1) ──────────────
function calcEloDeltas(playerResults) {
  const N = playerResults.length
  if (N < 2) return {}
  const deltas = {}
  playerResults.forEach(a => {
    deltas[a.userId] = 0
    playerResults.forEach(b => {
      if (a.userId === b.userId) return
      const eloA = a.currentElo || 1000
      const eloB = b.currentElo || 1000
      const expected = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
      const actual   = a.rank < b.rank ? 1 : a.rank > b.rank ? 0 : 0.5
      deltas[a.userId] += ELO_K * (actual - expected)
    })
    deltas[a.userId] = Math.round(deltas[a.userId] / (N - 1))
  })
  return deltas
}

export const useArenaStore = create((set, get) => ({
  // ── UI
  isOpen:  false,
  phase:   'idle', // idle|entry|create|join|lobby|countdown|question|reveal|sabotage|done|leaderboard

  // ── Room
  code:    null,
  isHost:  false,

  // ── Identity
  myUserId:     null,   // tabId (userId-XXXXX)
  myBaseUserId: null,   // raw localStorage aeva_anon_id
  myDisplayName:'',
  myColor:      null,

  // ── Players (from presence)
  players: [], // [{ userId, baseUserId, displayName, color, score, streak, cards }]

  // ── Settings (host sets)
  settings: { topic: '', difficulty: 'medium', questionCount: 10 },

  // ── Questions
  questions:    [],
  stubs:        [],
  currentQIdx:  -1,
  timerSeconds: 0,

  // ── Round state
  answers:        {},   // { userId: { choiceIdx, timeMs } } — current question only
  allAnswers:     {},   // { qIdx: { userId: { choiceIdx, timeMs } } } — full game history
  correctIdx:     null,
  explanation:    '',
  effects:        {},
  sabotagePlayed: [],
  aevaLine:       '',
  scoreDeltas:    {},

  // ── Post-game stats (set after _persistSessionResults resolves)
  lastSessionStats: null, // { eloChange, newElo, rank, playerCount, correctCount, totalQuestions, topic, xpEarned }

  // ── Incoming card notification
  incomingCard: null,

  // ── Countdown
  countdownVal: 3,

  // ── Channel
  _channel:  null,
  _timerRef: null,
  _cdRef:    null,

  // ──────────────────────────────────────────────────────────────────
  // Public actions
  // ──────────────────────────────────────────────────────────────────

  open: () => set({ isOpen: true, phase: 'entry' }),

  close: () => {
    const { _channel, _timerRef, _cdRef } = get()
    if (_timerRef) clearInterval(_timerRef)
    if (_cdRef)    clearInterval(_cdRef)
    if (_channel) { _channel.untrack(); _channel.unsubscribe(); supabase.removeChannel(_channel) }
    set({
      isOpen: false, phase: 'idle', code: null, isHost: false,
      players: [], questions: [], stubs: [], currentQIdx: -1,
      answers: {}, allAnswers: {}, correctIdx: null, effects: {},
      sabotagePlayed: [], aevaLine: '', scoreDeltas: {},
      incomingCard: null, lastSessionStats: null,
      myBaseUserId: null,
      _channel: null, _timerRef: null, _cdRef: null,
    })
  },

  createRoom: async ({ topic, difficulty, questionCount, userId, displayName }) => {
    const code  = genCode()
    const tabId = `${userId}-${TAB_ID}`
    const color = ARENA_COLORS[0]
    const ch    = get()._buildChannel(code, tabId)
    await ch.subscribe()
    await ch.track({ userId: tabId, baseUserId: userId, displayName, color, score: 0, streak: 0, cards: ['freeze', 'steal', 'double_down', 'bomb'] })
    set({
      code, isHost: true,
      myUserId: tabId, myBaseUserId: userId, myDisplayName: displayName, myColor: color,
      settings: { topic, difficulty, questionCount: Number(questionCount) },
      phase: 'lobby', _channel: ch,
    })
  },

  joinRoom: async (code, { userId, displayName }) => {
    const trimmed = code.trim().toUpperCase()
    const tabId   = `${userId}-${TAB_ID}`
    const slot    = Math.floor(Math.random() * (ARENA_COLORS.length - 1)) + 1
    const color   = ARENA_COLORS[slot]
    const ch      = get()._buildChannel(trimmed, tabId)
    await ch.subscribe()
    await ch.track({ userId: tabId, baseUserId: userId, displayName, color, score: 0, streak: 0, cards: ['freeze', 'steal', 'double_down', 'bomb'] })
    set({ code: trimmed, isHost: false, myUserId: tabId, myBaseUserId: userId, myDisplayName: displayName, myColor: color, phase: 'lobby', _channel: ch })
  },

  startGame: async () => {
    const { settings, _channel } = get()
    set({ phase: 'countdown', countdownVal: 3, aevaLine: '', allAnswers: {} })
    get()._runCountdown(() => get()._generateAndStart())
    _channel?.send({ type: 'broadcast', event: 'countdown_start', payload: {} })
  },

  submitAnswer: (choiceIdx) => {
    const { _channel, myUserId, currentQIdx, timerSeconds } = get()
    const timeMs = (Q_TIME - timerSeconds) * 1000
    const payload = { userId: myUserId, choiceIdx, timeMs, qIdx: currentQIdx }
    set(s => ({ answers: { ...s.answers, [myUserId]: payload } }))
    _channel?.send({ type: 'broadcast', event: 'answer', payload })
  },

  playCard: (card, targetUserId) => {
    const { _channel, myUserId, myDisplayName, players } = get()
    const me = players.find(p => p.userId === myUserId)
    if (!me?.cards?.includes(card)) return
    set(s => ({
      players: s.players.map(p =>
        p.userId === myUserId ? { ...p, cards: (() => { const c = [...p.cards]; const i = c.indexOf(card); if (i > -1) c.splice(i, 1); return c })() } : p
      ),
      sabotagePlayed: [...s.sabotagePlayed, { by: myUserId, byName: myDisplayName, target: targetUserId, card }],
    }))
    _channel?.send({ type: 'broadcast', event: 'card_played', payload: { by: myUserId, byName: myDisplayName, target: targetUserId, card } })
  },

  // ──────────────────────────────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────────────────────────────

  _buildChannel: (code, myUserId) => {
    const ch = supabase.channel(`arena:${code}`, { config: { presence: { key: myUserId } } })

    ch.on('presence', { event: 'sync' }, () => {
      const state   = ch.presenceState()
      const players = Object.values(state).map(arr => arr[arr.length - 1]).filter(Boolean)
      set({ players })
    })

    ch.on('broadcast', { event: 'countdown_start' }, () => {
      if (get().isHost) return
      set({ phase: 'countdown', countdownVal: 3 })
      get()._runCountdown(() => set({ phase: 'preparing' }))
    })

    ch.on('broadcast', { event: 'stubs_sync' }, ({ payload }) => {
      if (get().isHost) return
      set({ stubs: payload.stubs })
    })

    ch.on('broadcast', { event: 'question_start' }, ({ payload }) => {
      if (get().isHost) return
      const { qIdx } = payload
      get()._clearTimer()
      set({ currentQIdx: qIdx, timerSeconds: Q_TIME, answers: {}, correctIdx: null, sabotagePlayed: [], aevaLine: '', phase: 'question' })
      get()._startTimer()
    })

    ch.on('broadcast', { event: 'answer' }, ({ payload }) => {
      set(s => ({ answers: { ...s.answers, [payload.userId]: payload } }))
      if (get().isHost) {
        const { players, answers } = get()
        if (players.every(p => answers[p.userId])) get()._endQuestion()
      }
    })

    ch.on('broadcast', { event: 'card_played' }, ({ payload }) => {
      const { by, byName, target, card } = payload
      const effectKey = card === 'freeze' ? 'frozen' : card === 'steal' ? 'stolen' : card === 'bomb' ? 'bomb' : card === 'double_down' ? 'doubled' : card
      const { myUserId } = get()
      set(s => ({
        effects: { ...s.effects, [target]: { ...(s.effects[target] || {}), [effectKey]: true } },
        sabotagePlayed: [...s.sabotagePlayed, { by, byName, target, card }],
        players: s.players.map(p => p.userId === by ? { ...p, cards: (() => { const c = [...p.cards]; const i = c.indexOf(card); if (i > -1) c.splice(i, 1); return c })() } : p),
        incomingCard: target === myUserId ? { byName, card } : s.incomingCard,
      }))
      if (target === myUserId) setTimeout(() => set({ incomingCard: null }), 2500)
    })

    ch.on('broadcast', { event: 'question_end' }, ({ payload }) => {
      if (get().isHost) return
      const { correctIdx, explanation, playerUpdates, aevaLine, scoreDeltas, qIdx, qAnswers } = payload
      // Guests accumulate answers received from host
      if (qIdx !== undefined && qAnswers) {
        set(s => ({ allAnswers: { ...s.allAnswers, [qIdx]: qAnswers } }))
      }
      set(s => ({
        correctIdx, explanation, aevaLine, phase: 'reveal', scoreDeltas,
        players: s.players.map(p => playerUpdates[p.userId] ? { ...p, ...playerUpdates[p.userId] } : p),
      }))
      setTimeout(() => set({ phase: 'sabotage', sabotagePlayed: [], effects: {} }), 3500)
    })

    ch.on('broadcast', { event: 'next_question' }, ({ payload }) => {
      if (get().isHost) return
      if (payload.done) { set({ phase: 'done' }); return }
      get()._startQuestion(payload.qIdx)
    })

    ch.on('broadcast', { event: 'game_end' }, ({ payload }) => {
      if (get().isHost) return
      set({ phase: 'done', players: payload.players })
    })

    // Receives per-player stats computed by host after game ends
    ch.on('broadcast', { event: 'session_stats' }, ({ payload }) => {
      const { playerStats } = payload
      const { myUserId } = get()
      const myStats = playerStats[myUserId]
      if (myStats) set({ lastSessionStats: myStats })
    })

    return ch
  },

  _runCountdown: (cb) => {
    const { _cdRef } = get()
    if (_cdRef) clearInterval(_cdRef)
    set({ countdownVal: 3 })
    const ref = setInterval(() => {
      const { countdownVal } = get()
      if (countdownVal <= 1) {
        clearInterval(ref)
        set({ _cdRef: null })
        cb()
      } else {
        set(s => ({ countdownVal: s.countdownVal - 1 }))
      }
    }, 1000)
    set({ _cdRef: ref })
  },

  _generateAndStart: async () => {
    const { settings, _channel } = get()
    const diffMap = { easy: 'simple and beginner-friendly', medium: 'moderately challenging', hard: 'challenging and detailed' }
    const prompt  = `Generate ${settings.questionCount} multiple choice quiz questions about "${settings.topic}". Difficulty: ${diffMap[settings.difficulty] || 'medium'}. Return ONLY a JSON array, no markdown:\n[{"q":"...","choices":["A","B","C","D"],"correct":0,"explain":"one concise sentence"}]`

    let questions = []
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4000 }),
      })
      const d   = await res.json()
      const raw = d.choices[0]?.message?.content?.trim() || '[]'
      const m   = raw.match(/\[[\s\S]*\]/)
      questions = JSON.parse(m?.[0] || '[]')
    } catch {
      questions = Array.from({ length: settings.questionCount }, (_, i) => ({
        q: `Question ${i + 1} about ${settings.topic}`, choices: ['Option A', 'Option B', 'Option C', 'Option D'], correct: 0, explain: '',
      }))
    }

    questions = questions.slice(0, settings.questionCount)
    const stubs = questions.map(q => ({ q: q.q, choices: q.choices }))
    set({ questions, stubs })
    _channel?.send({ type: 'broadcast', event: 'stubs_sync', payload: { stubs } })
    setTimeout(() => get()._startQuestion(0), 300)
  },

  _startQuestion: (qIdx) => {
    const { stubs, _channel, isHost } = get()
    const stub = stubs[qIdx]
    if (!stub) { get()._endGame(); return }
    get()._clearTimer()
    set({ currentQIdx: qIdx, timerSeconds: Q_TIME, answers: {}, correctIdx: null, sabotagePlayed: [], aevaLine: '', scoreDeltas: {}, phase: 'question' })
    if (isHost) {
      _channel?.send({ type: 'broadcast', event: 'question_start', payload: { qIdx } })
    }
    get()._startTimer()
  },

  _startTimer: () => {
    const ref = setInterval(() => {
      const { timerSeconds, phase, isHost } = get()
      if (timerSeconds <= 0) {
        clearInterval(ref)
        if (isHost && phase === 'question') get()._endQuestion()
      } else {
        set(s => ({ timerSeconds: s.timerSeconds - 1 }))
      }
    }, 1000)
    set({ _timerRef: ref })
  },

  _clearTimer: () => {
    const { _timerRef } = get()
    if (_timerRef) clearInterval(_timerRef)
    set({ _timerRef: null })
  },

  _endQuestion: async () => {
    const { questions, currentQIdx, answers, players, effects, _channel } = get()
    get()._clearTimer()
    const q = questions[currentQIdx]
    if (!q) return
    const correctIdx = q.correct

    const scoreDeltas  = {}
    const playerUpdates = {}
    players.forEach(p => {
      const ans    = answers[p.userId]
      const eff    = effects[p.userId] || {}
      let score    = p.score
      let streak   = p.streak
      let cards    = [...(p.cards || [])]
      let delta    = 0

      if (ans?.choiceIdx === correctIdx) {
        const spd  = Math.round(SPEED_MAX * Math.max(0, (Q_TIME * 1000 - ans.timeMs) / (Q_TIME * 1000)))
        const mult = eff.doubled ? 2 : 1
        delta      = (BASE_PTS + spd + (streak >= 2 ? STREAK_BONUS : 0)) * mult
        score     += delta
        streak    += 1
        if (streak >= 3 && !cards.includes('double_down')) cards.push('double_down')
      } else {
        streak = 0
      }
      if (eff.stolen) { score = Math.max(0, score - STEAL_AMT); delta -= STEAL_AMT }
      scoreDeltas[p.userId]   = delta
      playerUpdates[p.userId] = { score, streak, cards }
    })

    // Accumulate this question's answers into the full-game history
    set(s => ({ allAnswers: { ...s.allAnswers, [currentQIdx]: { ...answers } } }))

    let aevaLine = ''
    try {
      const correct = players.filter(p => answers[p.userId]?.choiceIdx === correctIdx).length
      const ctx = correct === players.length ? 'everyone got it right. Be underwhelmed' : correct === 0 ? 'nobody got it right. Be savage' : `only ${correct} of ${players.length} got it right`
      const r   = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: `You are Aeva, a sharp and slightly ruthless quiz host. ${ctx}. One sentence, max 12 words, no emojis, no quotes.` }], max_tokens: 40, temperature: 1.0 }),
      })
      const d   = await r.json()
      aevaLine  = d.choices[0]?.message?.content?.trim() || ''
    } catch {}

    set(s => ({
      correctIdx, explanation: q.explain, aevaLine, phase: 'reveal', scoreDeltas,
      players: s.players.map(p => playerUpdates[p.userId] ? { ...p, ...playerUpdates[p.userId] } : p),
    }))
    // Send qAnswers snapshot to guests so they can build allAnswers on their side
    _channel?.send({ type: 'broadcast', event: 'question_end', payload: { correctIdx, explanation: q.explain, playerUpdates, aevaLine, scoreDeltas, qIdx: currentQIdx, qAnswers: answers } })

    setTimeout(() => {
      set({ phase: 'sabotage', sabotagePlayed: [], effects: {} })
      setTimeout(() => {
        const { currentQIdx, questions, _channel } = get()
        const next = currentQIdx + 1
        if (next < questions.length) {
          _channel?.send({ type: 'broadcast', event: 'next_question', payload: { qIdx: next, done: false } })
          get()._startQuestion(next)
        } else {
          get()._endGame()
        }
      }, 6000)
    }, 3500)
  },

  _endGame: () => {
    const { _channel, players } = get()
    get()._clearTimer()
    set({ phase: 'done' })
    _channel?.send({ type: 'broadcast', event: 'game_end', payload: { players } })
    // Fire-and-forget — DoneScreen renders immediately, stats appear when ready
    get()._persistSessionResults()
  },

  // ── Persist results to Supabase, compute ELO, broadcast stats to all players ──
  _persistSessionResults: async () => {
    const { code, settings, players, allAnswers, questions, myBaseUserId, isHost, _channel } = get()
    if (!isHost || players.length === 0) return

    try {
      // Rank players by final score
      const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
      const rankMap = {}
      sorted.forEach((p, i) => { rankMap[p.userId] = i + 1 })

      // Fetch current ELOs for all players
      const baseUserIds = players.map(p => p.baseUserId || p.userId)
      const { data: profiles } = await supabase
        .from('arena_profiles')
        .select('user_id, elo, wins, losses, total_games, total_score, accuracy_pct, topic_accuracy')
        .in('user_id', baseUserIds)
      const profileMap = {}
      ;(profiles || []).forEach(pr => { profileMap[pr.user_id] = pr })

      // Build per-player result objects
      const playerResults = players.map(p => {
        const baseId  = p.baseUserId || p.userId
        const qCount  = questions.length
        const qHistory = Array.from({ length: qCount }, (_, i) => {
          const ans = allAnswers[i]?.[p.userId]
          return {
            qIdx: i,
            choiceIdx: ans?.choiceIdx ?? null,
            timeMs: ans?.timeMs ?? null,
            correct: ans?.choiceIdx === questions[i]?.correct,
          }
        })
        const correctCount = qHistory.filter(a => a.correct).length
        return {
          userId:       p.userId,
          baseUserId:   baseId,
          displayName:  p.displayName,
          score:        p.score || 0,
          rank:         rankMap[p.userId],
          currentElo:   profileMap[baseId]?.elo || 1000,
          correctCount,
          totalQuestions: qCount,
          answers:      qHistory,
          cardsUsed:    [],  // cards played log not currently per-player tracked here
          existingProfile: profileMap[baseId] || null,
        }
      })

      // ELO deltas
      const eloDeltas = calcEloDeltas(playerResults)

      // Write arena_sessions row
      const sessionPayload = {
        room_code:      code,
        topic:          settings.topic,
        difficulty:     settings.difficulty,
        question_count: settings.questionCount,
        player_count:   players.length,
        host_user_id:   myBaseUserId,
        ended_at:       new Date().toISOString(),
      }
      const { data: session } = await supabase
        .from('arena_sessions')
        .insert(sessionPayload)
        .select('id')
        .single()
      const sessionId = session?.id

      const playerStats = {}

      for (const pr of playerResults) {
        const delta   = eloDeltas[pr.userId] || 0
        const newElo  = Math.max(100, pr.currentElo + delta)
        const isWin   = pr.rank === 1
        const prev    = pr.existingProfile
        const accuracy = pr.correctCount / Math.max(1, pr.totalQuestions)

        // arena_results row
        if (sessionId) {
          await supabase.from('arena_results').insert({
            session_id:      sessionId,
            user_id:         pr.baseUserId,
            display_name:    pr.displayName,
            final_score:     pr.score,
            rank:            pr.rank,
            correct_count:   pr.correctCount,
            total_questions: pr.totalQuestions,
            elo_before:      pr.currentElo,
            elo_after:       newElo,
            elo_delta:       delta,
            cards_played:    pr.cardsUsed,
            answers:         pr.answers,
          })
        }

        // Upsert arena_profiles
        const prevGames      = prev?.total_games || 0
        const prevTotalScore = prev?.total_score || 0
        const newTotalGames  = prevGames + 1
        const newTotalScore  = prevTotalScore + pr.score
        const newAvgScore    = Math.round(newTotalScore / newTotalGames)

        // Running accuracy: weighted average (prior 70%, this game 30%)
        const prevAcc  = prev?.accuracy_pct || 0
        const newAcc   = prevGames === 0 ? accuracy : prevAcc * 0.7 + accuracy * 0.3

        // Topic accuracy: same weighted merge
        const topicAcc = { ...(prev?.topic_accuracy || {}) }
        const prevTopicAcc = topicAcc[settings.topic]
        topicAcc[settings.topic] = prevTopicAcc !== undefined
          ? Math.round((prevTopicAcc * 0.7 + accuracy * 0.3) * 1000) / 1000
          : Math.round(accuracy * 1000) / 1000

        await supabase.from('arena_profiles').upsert({
          user_id:        pr.baseUserId,
          display_name:   pr.displayName,
          elo:            newElo,
          wins:           (prev?.wins || 0) + (isWin ? 1 : 0),
          losses:         (prev?.losses || 0) + (isWin ? 0 : 1),
          total_games:    newTotalGames,
          total_score:    newTotalScore,
          avg_score:      newAvgScore,
          accuracy_pct:   Math.round(newAcc * 1000) / 1000,
          topic_accuracy: topicAcc,
          updated_at:     new Date().toISOString(),
        }, { onConflict: 'user_id' })

        playerStats[pr.userId] = {
          eloChange:      delta,
          newElo,
          rank:           pr.rank,
          playerCount:    players.length,
          correctCount:   pr.correctCount,
          totalQuestions: pr.totalQuestions,
          topic:          settings.topic,
        }
      }

      // Broadcast stats to all players (guests read this in _buildChannel)
      _channel?.send({ type: 'broadcast', event: 'session_stats', payload: { playerStats } })

      // Also set for host directly
      const myPlayer = players.find(p => p.baseUserId === myBaseUserId || p.userId.startsWith(myBaseUserId))
      if (myPlayer && playerStats[myPlayer.userId]) {
        set({ lastSessionStats: playerStats[myPlayer.userId] })
      }

    } catch (err) {
      console.error('[Arena] persist error:', err)
    }
  },
}))
