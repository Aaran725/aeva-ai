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

// Remove first occurrence of card from array (immutable)
function removeFirstCard(arr, card) {
  const c = [...arr]; const i = c.indexOf(card); if (i > -1) c.splice(i, 1); return c
}

// Pick a randomised 4-card shop selection weighted toward commons
function generateShopCards() {
  const shuffle = a => [...a].sort(() => Math.random() - 0.5)
  const commons     = shuffle(['freeze', 'bomb', 'blind', 'scramble'])
  const rares       = shuffle(['steal', 'shield', 'echo'])
  const legendaries = shuffle(['wager', 'reverse'])
  const hasLeg      = Math.random() < 0.33
  return shuffle([
    ...commons.slice(0, 2),
    ...rares.slice(0, hasLeg ? 1 : 2),
    ...(hasLeg ? legendaries.slice(0, 1) : []),
  ]).slice(0, 4)
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
  { bg: '#3B82F6', glow: 'rgba(59,130,246,0.55)',  dim: 'rgba(59,130,246,0.12)' },
  { bg: '#84CC16', glow: 'rgba(132,204,22,0.55)',  dim: 'rgba(132,204,22,0.12)' },
  { bg: '#F97316', glow: 'rgba(249,115,22,0.55)',  dim: 'rgba(249,115,22,0.12)' },
  { bg: '#06B6D4', glow: 'rgba(6,182,212,0.55)',   dim: 'rgba(6,182,212,0.12)'  },
]

// ── 5.3 + 5.4: 9-card catalog with tier, cost, and new card types ──────────────
export const CARD_DEFS = {
  // Common — 50c
  freeze:   { emoji: '🧊', label: 'Freeze',   desc: 'Hide choices for 4s',                 self: false, tier: 'common',    cost: 50  },
  bomb:     { emoji: '💣', label: 'Bomb',     desc: 'Block & shake screen for 2s',          self: false, tier: 'common',    cost: 50  },
  blind:    { emoji: '😵', label: 'Blind',    desc: 'Hide their standings this reveal',     self: false, tier: 'common',    cost: 50  },
  scramble: { emoji: '🔀', label: 'Scramble', desc: 'Shuffle their answer order',           self: false, tier: 'common',    cost: 50  },
  // Rare — 150c
  steal:    { emoji: '💸', label: 'Steal',    desc: 'Take 300 pts from target',             self: false, tier: 'rare',      cost: 150 },
  shield:   { emoji: '🛡️', label: 'Shield',  desc: 'Block next Steal used against you',    self: true,  tier: 'rare',      cost: 150 },
  echo:     { emoji: '🔁', label: 'Echo',     desc: 'Copy the last card used on you',       self: true,  tier: 'rare',      cost: 150 },
  // Legendary — 400c
  wager:    { emoji: '🎰', label: 'Wager',    desc: '2× or 3× pts — wrong = penalty',      self: true,  tier: 'legendary', cost: 400 },
  reverse:  { emoji: '🪞', label: 'Reverse',  desc: 'Next Steal hits the attacker instead', self: true,  tier: 'legendary', cost: 400 },
}

const BASE_PTS     = 1000
const SPEED_MAX    = 500
const STREAK_BONUS = 200
const STEAL_AMT    = 300
const Q_TIME       = 15
const ELO_K        = 32
const SHOP_DURATION = 25  // seconds

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
  phase:   'idle', // idle|entry|create|join|lobby|countdown|question|reveal|sabotage|shop|done|leaderboard

  // ── Room
  code:    null,
  isHost:  false,

  // ── Identity
  myUserId:     null,
  myBaseUserId: null,
  myDisplayName:'',
  myColor:      null,

  // ── Players (from presence)
  players: [], // [{ userId, baseUserId, displayName, color, score, streak, cards, coins }]

  // ── Settings (host sets)
  settings: { topic: '', difficulty: 'medium', questionCount: 10 },

  // ── Questions
  questions:    [],
  stubs:        [],
  currentQIdx:  -1,
  timerSeconds: 0,

  // ── Round state
  answers:        {},
  allAnswers:     {},
  correctIdx:     null,
  explanation:    '',
  effects:        {},
  sabotagePlayed: [],
  aevaLine:       '',
  scoreDeltas:    {},

  // ── Post-game stats
  lastSessionStats: null,

  // ── Question quality layer (Pillar 2)
  questionCacheIds:  [],
  questionVotes:     {},
  myQuestionVotes:   {},

  // ── Scale / spectator / co-host (Pillar 3)
  isSpectator: false,
  coHostId:    null,
  spectators:  [],

  // ── Host dashboard (Pillar 4)
  isPaused:      false,
  kickedUserIds: [],
  hostPreviewQ:  null,

  // ── Incoming card notification
  incomingCard: null,

  // ── Countdown
  countdownVal: 3,

  // ── Sabotage economy (Pillar 5)
  shopCards:          [],   // 5.2: cards available to buy in current shop
  shopNextQIdx:       null, // 5.2: next question index after shop closes
  savageLog:          [],   // 5.8: [{ by, byName, target, card }] — accumulated all game
  myLastReceivedCard: null, // for echo: last card played against this player

  // ── Channel / timers
  _channel:     null,
  _timerRef:    null,
  _cdRef:       null,
  _shopTimeout: null,

  // ──────────────────────────────────────────────────────────────────
  // Public actions
  // ──────────────────────────────────────────────────────────────────

  open: () => set({ isOpen: true, phase: 'entry' }),

  close: () => {
    const { _channel, _timerRef, _cdRef, _shopTimeout } = get()
    if (_timerRef)    clearInterval(_timerRef)
    if (_cdRef)       clearInterval(_cdRef)
    if (_shopTimeout) clearTimeout(_shopTimeout)
    if (_channel) { _channel.untrack(); _channel.unsubscribe(); supabase.removeChannel(_channel) }
    set({
      isOpen: false, phase: 'idle', code: null, isHost: false,
      players: [], questions: [], stubs: [], currentQIdx: -1,
      answers: {}, allAnswers: {}, correctIdx: null, effects: {},
      sabotagePlayed: [], aevaLine: '', scoreDeltas: {},
      incomingCard: null, lastSessionStats: null,
      myBaseUserId: null,
      questionCacheIds: [], questionVotes: {}, myQuestionVotes: {},
      isSpectator: false, coHostId: null, spectators: [],
      isPaused: false, kickedUserIds: [], hostPreviewQ: null,
      shopCards: [], shopNextQIdx: null, savageLog: [], myLastReceivedCard: null,
      _channel: null, _timerRef: null, _cdRef: null, _shopTimeout: null,
    })
  },

  // 5.1: players start with 100 coins and no cards — earned through gameplay
  createRoom: async ({ topic, difficulty, questionCount, userId, displayName }) => {
    const code  = genCode()
    const tabId = `${userId}-${TAB_ID}`
    const color = ARENA_COLORS[0]
    const ch    = get()._buildChannel(code, tabId)
    await ch.subscribe()
    await ch.track({ userId: tabId, baseUserId: userId, displayName, color, role: 'player', score: 0, streak: 0, cards: [], coins: 100 })
    set({
      code, isHost: true, isSpectator: false,
      myUserId: tabId, myBaseUserId: userId, myDisplayName: displayName, myColor: color,
      settings: { topic, difficulty, questionCount: Number(questionCount) },
      phase: 'lobby', _channel: ch,
    })
  },

  joinRoom: async (code, { userId, displayName, spectator = false }) => {
    const trimmed = code.trim().toUpperCase()
    const tabId   = `${userId}-${TAB_ID}`
    const slot    = Math.floor(Math.random() * (ARENA_COLORS.length - 1)) + 1
    const color   = ARENA_COLORS[slot]
    const ch      = get()._buildChannel(trimmed, tabId)
    await ch.subscribe()
    await ch.track({ userId: tabId, baseUserId: userId, displayName, color, role: spectator ? 'spectator' : 'player', score: 0, streak: 0, cards: [], coins: spectator ? 0 : 100 })
    set({ code: trimmed, isHost: false, isSpectator: spectator, myUserId: tabId, myBaseUserId: userId, myDisplayName: displayName, myColor: color, phase: 'lobby', _channel: ch })
  },

  startGame: async () => {
    const { settings, _channel } = get()
    set({ phase: 'countdown', countdownVal: 3, aevaLine: '', allAnswers: {}, questionVotes: {}, myQuestionVotes: {}, questionCacheIds: [], isPaused: false, hostPreviewQ: null, savageLog: [], shopCards: [], shopNextQIdx: null })
    get()._runCountdown(() => get()._generateAndStart())
    _channel?.send({ type: 'broadcast', event: 'countdown_start', payload: {} })
  },

  submitAnswer: (choiceIdx) => {
    const { _channel, myUserId, currentQIdx, timerSeconds, isSpectator } = get()
    if (isSpectator) return
    const timeMs = (Q_TIME - timerSeconds) * 1000
    const payload = { userId: myUserId, choiceIdx, timeMs, qIdx: currentQIdx }
    set(s => ({ answers: { ...s.answers, [myUserId]: payload } }))
    _channel?.send({ type: 'broadcast', event: 'answer', payload })
  },

  // 5.2: Buy a card from the shop during the shop phase
  buyCard: (cardKey) => {
    const { myUserId, players, _channel } = get()
    const me  = players.find(p => p.userId === myUserId)
    const def = CARD_DEFS[cardKey]
    if (!def || !me) return
    if ((me.coins || 0) < def.cost) return
    set(s => ({
      players: s.players.map(p => p.userId === myUserId
        ? { ...p, coins: (p.coins || 0) - def.cost, cards: [...(p.cards || []), cardKey] }
        : p
      ),
    }))
    _channel?.send({ type: 'broadcast', event: 'card_bought', payload: { userId: myUserId, cardKey, cost: def.cost } })
  },

  // 5.5/5.6: Play a card from hand. extra = { multiplier } for wager.
  playCard: (card, targetUserId, extra = {}) => {
    const { _channel, myUserId, myDisplayName, players, isSpectator, myLastReceivedCard } = get()
    if (isSpectator) return
    const me = players.find(p => p.userId === myUserId)
    if (!me?.cards?.includes(card)) return

    // ── Wager: requires multiplier choice (2 or 3) ──────────────────
    if (card === 'wager') {
      const multiplier = extra.multiplier || 2
      set(s => ({
        players: s.players.map(p => p.userId === myUserId ? { ...p, cards: removeFirstCard(p.cards, card) } : p),
        sabotagePlayed: [...s.sabotagePlayed, { by: myUserId, byName: myDisplayName, target: myUserId, card }],
      }))
      _channel?.send({ type: 'broadcast', event: 'card_played', payload: { by: myUserId, byName: myDisplayName, target: myUserId, card: 'wager', multiplier } })
      return
    }

    // ── Echo: copy the last card received ───────────────────────────
    if (card === 'echo') {
      if (!myLastReceivedCard || !CARD_DEFS[myLastReceivedCard]) return
      const copiedCard = myLastReceivedCard
      set(s => ({
        players: s.players.map(p => p.userId === myUserId ? { ...p, cards: [...removeFirstCard(p.cards, 'echo'), copiedCard] } : p),
        sabotagePlayed: [...s.sabotagePlayed, { by: myUserId, byName: myDisplayName, target: myUserId, card: 'echo' }],
      }))
      _channel?.send({ type: 'broadcast', event: 'card_played', payload: { by: myUserId, byName: myDisplayName, target: myUserId, card: 'echo', copiedCard } })
      return
    }

    // ── Self cards (shield, reverse) ────────────────────────────────
    if (CARD_DEFS[card]?.self && card !== 'wager' && card !== 'echo') {
      const effectKey = card === 'shield' ? 'shielded' : card === 'reverse' ? 'reversed' : card
      set(s => ({
        effects: { ...s.effects, [myUserId]: { ...(s.effects[myUserId] || {}), [effectKey]: true } },
        players: s.players.map(p => p.userId === myUserId ? { ...p, cards: removeFirstCard(p.cards, card) } : p),
        sabotagePlayed: [...s.sabotagePlayed, { by: myUserId, byName: myDisplayName, target: myUserId, card }],
      }))
      _channel?.send({ type: 'broadcast', event: 'card_played', payload: { by: myUserId, byName: myDisplayName, target: myUserId, card } })
      return
    }

    // ── Target cards ────────────────────────────────────────────────
    set(s => ({
      players: s.players.map(p => p.userId === myUserId ? { ...p, cards: removeFirstCard(p.cards, card) } : p),
      sabotagePlayed: [...s.sabotagePlayed, { by: myUserId, byName: myDisplayName, target: targetUserId, card }],
    }))
    _channel?.send({ type: 'broadcast', event: 'card_played', payload: { by: myUserId, byName: myDisplayName, target: targetUserId, card } })
  },

  // 2.1
  voteQuestion: (qIdx, vote) => {
    const { _channel, myUserId, myQuestionVotes } = get()
    if (myQuestionVotes[qIdx]) return
    set(s => ({
      myQuestionVotes: { ...s.myQuestionVotes, [qIdx]: vote },
      questionVotes: {
        ...s.questionVotes,
        [qIdx]: {
          up:   (s.questionVotes[qIdx]?.up   || 0) + (vote === 'up'   ? 1 : 0),
          down: (s.questionVotes[qIdx]?.down || 0) + (vote === 'down' ? 1 : 0),
        },
      },
    }))
    _channel?.send({ type: 'broadcast', event: 'question_vote', payload: { userId: myUserId, qIdx, vote } })
  },

  // 2.6 / 3.5
  hostSkipQuestion: () => {
    const { isHost, coHostId, myUserId, _channel, currentQIdx, questions } = get()
    if (!isHost && coHostId !== myUserId) return
    get()._clearTimer()
    set({ hostPreviewQ: null, isPaused: false })
    const next = currentQIdx + 1
    if (next < questions.length) {
      _channel?.send({ type: 'broadcast', event: 'next_question', payload: { qIdx: next, done: false } })
      get()._startQuestion(next)
    } else {
      get()._endGame()
    }
  },

  // 3.5
  assignCoHost: (userId) => {
    const { isHost, _channel, coHostId } = get()
    if (!isHost) return
    const next = coHostId === userId ? null : userId
    set({ coHostId: next })
    _channel?.send({ type: 'broadcast', event: 'cohost_assigned', payload: { coHostId: next } })
  },

  // 4.2
  pauseGame: () => {
    const { isHost, coHostId, myUserId, _channel, isPaused, phase } = get()
    if (!isHost && coHostId !== myUserId) return
    if (isPaused || phase !== 'question') return
    get()._clearTimer()
    set({ isPaused: true })
    _channel?.send({ type: 'broadcast', event: 'game_pause', payload: {} })
  },

  // 4.2
  resumeGame: () => {
    const { isHost, coHostId, myUserId, _channel, isPaused } = get()
    if (!isHost && coHostId !== myUserId) return
    if (!isPaused) return
    set({ isPaused: false })
    get()._startTimer()
    _channel?.send({ type: 'broadcast', event: 'game_resume', payload: {} })
  },

  // 4.4 / 4.5
  kickPlayer: (userId) => {
    const { isHost, _channel } = get()
    if (!isHost) return
    set(s => ({
      players: s.players.filter(p => p.userId !== userId),
      kickedUserIds: [...s.kickedUserIds, userId],
    }))
    _channel?.send({ type: 'broadcast', event: 'player_kicked', payload: { userId } })
  },

  // 4.9
  extendTimer: () => {
    const { isHost, coHostId, myUserId, _channel, phase } = get()
    if (!isHost && coHostId !== myUserId) return
    if (phase !== 'question') return
    set(s => ({ timerSeconds: Math.min(30, s.timerSeconds + 5) }))
    _channel?.send({ type: 'broadcast', event: 'extend_timer', payload: {} })
  },

  // 5.2: Host closes the shop early or timer expired
  closeShop: () => {
    const { isHost, coHostId, myUserId, _shopTimeout, shopNextQIdx, _channel, stubs } = get()
    if (!isHost && coHostId !== myUserId) return
    if (_shopTimeout) clearTimeout(_shopTimeout)
    const next = shopNextQIdx
    if (next === null || next === undefined) return
    set({ shopCards: [], shopNextQIdx: null, _shopTimeout: null })
    set({ hostPreviewQ: stubs[next] ? { ...stubs[next], qIdx: next } : { qIdx: next } })
    _channel?.send({ type: 'broadcast', event: 'shop_close', payload: { qNext: next } })
    setTimeout(() => {
      if (!get().hostPreviewQ) return
      set({ hostPreviewQ: null })
      _channel?.send({ type: 'broadcast', event: 'next_question', payload: { qIdx: next, done: false } })
      get()._startQuestion(next)
    }, 3000)
  },

  // 7.15: Rematch
  rematch: () => {
    const { isHost, _channel, settings } = get()
    if (!isHost) return
    const resetState = {
      phase: 'lobby', questions: [], stubs: [], currentQIdx: -1,
      answers: {}, allAnswers: {}, correctIdx: null, effects: {},
      sabotagePlayed: [], aevaLine: '', scoreDeltas: {}, lastSessionStats: null,
      questionCacheIds: [], questionVotes: {}, myQuestionVotes: {},
      savageLog: [], shopCards: [], shopNextQIdx: null, myLastReceivedCard: null,
    }
    set(s => ({ ...resetState, players: s.players.map(p => ({ ...p, score: 0, streak: 0, cards: [], coins: 100 })) }))
    _channel?.send({ type: 'broadcast', event: 'rematch', payload: { settings } })
  },

  // ──────────────────────────────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────────────────────────────

  _buildChannel: (code, myUserId) => {
    const ch = supabase.channel(`arena:${code}`, { config: { presence: { key: myUserId } } })

    ch.on('presence', { event: 'sync' }, () => {
      const state      = ch.presenceState()
      const all        = Object.values(state).map(arr => arr[arr.length - 1]).filter(Boolean)
      const players    = all.filter(p => (p.role || 'player') !== 'spectator')
      const spectators = all.filter(p => p.role === 'spectator')
      const { phase, players: existing } = get()
      // 3.2: during gameplay, merge live scores/cards/streak/coins so presence sync doesn't reset them
      const activePhases = ['countdown', 'question', 'reveal', 'sabotage', 'shop', 'done']
      if (activePhases.includes(phase)) {
        const existingMap = {}
        existing.forEach(p => { existingMap[p.userId] = p })
        const merged = players.map(p => ({
          ...p,
          score:  existingMap[p.userId]?.score  ?? 0,
          streak: existingMap[p.userId]?.streak ?? 0,
          cards:  existingMap[p.userId]?.cards  ?? p.cards ?? [],
          coins:  existingMap[p.userId]?.coins  ?? p.coins ?? 100,
        }))
        set({ players: merged, spectators })
      } else {
        set({ players, spectators })
      }
    })

    // 3.6: host re-broadcasts current game state whenever a new player joins mid-game
    ch.on('presence', { event: 'join' }, () => {
      const { isHost, phase, stubs, currentQIdx } = get()
      if (!isHost) return
      if (!['question', 'reveal', 'sabotage'].includes(phase)) return
      ch.send({ type: 'broadcast', event: 'game_in_progress', payload: { stubs, currentQIdx, canJoinLate: currentQIdx < 2 } })
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

    // ── card_played: handles all 9 card types ────────────────────────
    ch.on('broadcast', { event: 'card_played' }, ({ payload }) => {
      const { by, byName, target, card } = payload
      const { myUserId, effects } = get()

      // Wager: store multiplier in effects[by]
      if (card === 'wager') {
        const multiplier = payload.multiplier || 2
        set(s => ({
          effects: { ...s.effects, [by]: { ...(s.effects[by] || {}), wagered: multiplier } },
          players: s.players.map(p => p.userId === by ? { ...p, cards: removeFirstCard(p.cards, 'wager') } : p),
          sabotagePlayed: [...s.sabotagePlayed, { by, byName, target: by, card }],
        }))
        return
      }

      // Echo: add copied card to sender's hand
      if (card === 'echo') {
        const { copiedCard } = payload
        if (!copiedCard) return
        set(s => ({
          players: s.players.map(p => p.userId === by ? { ...p, cards: [...removeFirstCard(p.cards, 'echo'), copiedCard] } : p),
          sabotagePlayed: [...s.sabotagePlayed, { by, byName, target: by, card }],
        }))
        return
      }

      // Shield / Reverse: self-targeted effect activation
      if (card === 'shield' || card === 'reverse') {
        const effectKey = card === 'shield' ? 'shielded' : 'reversed'
        set(s => ({
          effects: { ...s.effects, [by]: { ...(s.effects[by] || {}), [effectKey]: true } },
          players: s.players.map(p => p.userId === by ? { ...p, cards: removeFirstCard(p.cards, card) } : p),
          sabotagePlayed: [...s.sabotagePlayed, { by, byName, target: by, card }],
        }))
        return
      }

      // Steal hitting a Reversed player: redirect to attacker at scoring time
      const targetEff = effects[target] || {}
      if (card === 'steal' && targetEff.reversed) {
        set(s => ({
          effects: { ...s.effects, [target]: { ...s.effects[target], reversed: false, reverse_attacker_id: by } },
          players: s.players.map(p => p.userId === by ? { ...p, cards: removeFirstCard(p.cards, card) } : p),
          sabotagePlayed: [...s.sabotagePlayed, { by, byName, target, card }],
          incomingCard: target === myUserId ? { byName, card: 'reverse' } : s.incomingCard,
        }))
        if (target === myUserId) setTimeout(() => set({ incomingCard: null }), 2500)
        return
      }

      // Map card to effect key for standard cards
      const effectKey = { freeze: 'frozen', steal: 'stolen', bomb: 'bomb', blind: 'blinded', scramble: 'scrambled' }[card] || card
      const isTargetMe = target === myUserId

      set(s => ({
        effects: { ...s.effects, [target]: { ...(s.effects[target] || {}), [effectKey]: true } },
        sabotagePlayed: [...s.sabotagePlayed, { by, byName, target, card }],
        players: s.players.map(p => p.userId === by ? { ...p, cards: removeFirstCard(p.cards, card) } : p),
        incomingCard: isTargetMe ? { byName, card } : s.incomingCard,
        myLastReceivedCard: isTargetMe ? card : s.myLastReceivedCard,
      }))
      if (isTargetMe) setTimeout(() => set({ incomingCard: null }), 2500)
    })

    // 5.2: Player bought a card in the shop — sync to all clients
    ch.on('broadcast', { event: 'card_bought' }, ({ payload }) => {
      if (payload.userId === get().myUserId) return
      const { userId, cardKey, cost } = payload
      set(s => ({
        players: s.players.map(p => p.userId === userId
          ? { ...p, coins: Math.max(0, (p.coins || 0) - cost), cards: [...(p.cards || []), cardKey] }
          : p
        ),
      }))
    })

    ch.on('broadcast', { event: 'question_end' }, ({ payload }) => {
      if (get().isHost) return
      const { correctIdx, explanation, playerUpdates, aevaLine, scoreDeltas, qIdx, qAnswers } = payload
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
      set({ phase: 'done', players: payload.players, savageLog: payload.savageLog || [] })
    })

    // Per-player stats from host after game ends
    ch.on('broadcast', { event: 'session_stats' }, ({ payload }) => {
      const { playerStats } = payload
      const { myUserId } = get()
      const myStats = playerStats[myUserId]
      if (myStats) set({ lastSessionStats: myStats })
    })

    // 2.1 / 2.2: Question quality votes
    ch.on('broadcast', { event: 'question_vote' }, ({ payload }) => {
      const { myUserId } = get()
      if (payload.userId === myUserId) return
      const { qIdx, vote } = payload
      set(s => ({
        questionVotes: {
          ...s.questionVotes,
          [qIdx]: {
            up:   (s.questionVotes[qIdx]?.up   || 0) + (vote === 'up'   ? 1 : 0),
            down: (s.questionVotes[qIdx]?.down || 0) + (vote === 'down' ? 1 : 0),
          },
        },
      }))
    })

    // 3.5: co-host assignment
    ch.on('broadcast', { event: 'cohost_assigned' }, ({ payload }) => {
      set({ coHostId: payload.coHostId })
    })

    // 7.15: rematch — guests reset and return to lobby
    ch.on('broadcast', { event: 'rematch' }, ({ payload }) => {
      if (get().isHost) return
      set(s => ({
        phase: 'lobby', questions: [], stubs: [], currentQIdx: -1,
        answers: {}, allAnswers: {}, correctIdx: null, effects: {},
        sabotagePlayed: [], aevaLine: '', scoreDeltas: {}, lastSessionStats: null,
        questionCacheIds: [], questionVotes: {}, myQuestionVotes: {},
        savageLog: [], shopCards: [], shopNextQIdx: null, myLastReceivedCard: null,
        settings: payload.settings,
        players: s.players.map(p => ({ ...p, score: 0, streak: 0, cards: [], coins: 100 })),
      }))
    })

    // 3.6/3.7: late joiner catch-up
    ch.on('broadcast', { event: 'game_in_progress' }, ({ payload }) => {
      if (get().isHost) return
      const { stubs, currentQIdx, canJoinLate } = payload
      set({ stubs })
      if (canJoinLate) {
        get()._startQuestion(currentQIdx)
      } else {
        set({ isSpectator: true, phase: 'question' })
      }
    })

    // 4.2: pause / resume
    ch.on('broadcast', { event: 'game_pause' }, () => {
      if (get().isHost) return
      get()._clearTimer()
      set({ isPaused: true })
    })
    ch.on('broadcast', { event: 'game_resume' }, () => {
      if (get().isHost) return
      set({ isPaused: false })
      get()._startTimer()
    })

    // 4.9: extend timer
    ch.on('broadcast', { event: 'extend_timer' }, () => {
      if (get().isHost) return
      set(s => ({ timerSeconds: Math.min(30, s.timerSeconds + 5) }))
    })

    // 4.4 / 4.5: kick
    ch.on('broadcast', { event: 'player_kicked' }, ({ payload }) => {
      const { myUserId } = get()
      if (payload.userId === myUserId) { get().close(); return }
      set(s => ({
        players:       s.players.filter(p => p.userId !== payload.userId),
        kickedUserIds: [...s.kickedUserIds, payload.userId],
      }))
    })

    // 5.2: shop phase — guests enter shop and wait for host to close it
    ch.on('broadcast', { event: 'shop_open' }, ({ payload }) => {
      if (get().isHost) return
      set({ phase: 'shop', shopCards: payload.shopCards || [], shopNextQIdx: payload.qNext })
    })
    ch.on('broadcast', { event: 'shop_close' }, () => {
      if (get().isHost) return
      set({ shopCards: [], shopNextQIdx: null })
      // next_question broadcast follows from host; just keep phase as-is until then
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
    const diffMap  = { easy: 'simple and beginner-friendly', medium: 'moderately challenging', hard: 'challenging and detailed' }
    const topicKey = settings.topic.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').slice(0, 80)

    const prompt = `Generate ${settings.questionCount} multiple choice quiz questions about "${settings.topic}". Difficulty: ${diffMap[settings.difficulty] || 'medium'}. Rate your confidence that each answer is factually correct (0.0=uncertain, 1.0=certain). Return ONLY a JSON array, no markdown:\n[{"q":"...","choices":["A","B","C","D"],"correct":0,"explain":"one concise sentence","confidence":0.9,"category":"Biology"}]`

    let questions    = []
    let rawResponse  = null

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4000 }),
      })
      const d    = await res.json()
      rawResponse = d
      const raw  = d.choices[0]?.message?.content?.trim() || '[]'
      const m    = raw.match(/\[[\s\S]*\]/)
      const parsed = JSON.parse(m?.[0] || '[]')
      questions = parsed.filter(q => (q.confidence ?? 1.0) >= 0.3)

      if (questions.length < settings.questionCount) {
        const needed = settings.questionCount - questions.length
        const { data: cached } = await supabase
          .from('arena_question_cache')
          .select('id, question_text, choices, correct_idx, explanation, confidence, category')
          .eq('topic_key', topicKey).eq('suspect', false).eq('in_library', true)
          .order('quality_score', { ascending: false }).limit(needed)
        ;(cached || []).forEach(r => questions.push({
          _cacheId: r.id, q: r.question_text, choices: r.choices, correct: r.correct_idx,
          explain: r.explanation, confidence: r.confidence || 1.0, category: r.category,
        }))
      }
    } catch {
      try {
        const { data: cached } = await supabase
          .from('arena_question_cache')
          .select('id, question_text, choices, correct_idx, explanation, confidence, category')
          .eq('topic_key', topicKey).eq('suspect', false)
          .order('quality_score', { ascending: false }).limit(settings.questionCount)
        if ((cached || []).length >= 3) {
          questions = cached.map(r => ({
            _cacheId: r.id, q: r.question_text, choices: r.choices, correct: r.correct_idx,
            explain: r.explanation, confidence: r.confidence || 1.0, category: r.category,
          }))
        }
      } catch {}
      if (!questions.length) {
        questions = Array.from({ length: settings.questionCount }, (_, i) => ({
          q: `Question ${i + 1} about ${settings.topic}`,
          choices: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: 0, explain: '', confidence: 1.0,
        }))
      }
    }

    questions = questions.slice(0, settings.questionCount)

    const toCache = questions.filter(q => !q._cacheId)
    let insertedIds = []
    if (toCache.length > 0) {
      try {
        const { data } = await supabase.from('arena_question_cache').insert(
          toCache.map(q => ({
            topic:         settings.topic,
            topic_key:     topicKey,
            question_text: q.q,
            choices:       q.choices,
            correct_idx:   q.correct,
            explanation:   q.explain || '',
            confidence:    q.confidence ?? 1.0,
            category:      q.category || settings.topic,
            raw_response:  rawResponse
              ? { model: rawResponse.model, usage: rawResponse.usage }
              : null,
          }))
        ).select('id')
        insertedIds = (data || []).map(r => r.id)
      } catch {}
    }

    let insertedIdx = 0
    const questionCacheIds = questions.map(q => q._cacheId || insertedIds[insertedIdx++] || null)
    set({ questionCacheIds })

    const stubs = questions.map(q => ({ q: q.q, choices: q.choices, category: q.category || null }))
    set({ questions, stubs })
    _channel?.send({ type: 'broadcast', event: 'stubs_sync', payload: { stubs } })
    setTimeout(() => get()._startQuestion(0), 300)
  },

  _startQuestion: (qIdx) => {
    const { stubs, _channel, isHost } = get()
    const stub = stubs[qIdx]
    if (!stub) { get()._endGame(); return }
    get()._clearTimer()
    set({ currentQIdx: qIdx, timerSeconds: Q_TIME, answers: {}, correctIdx: null, sabotagePlayed: [], aevaLine: '', scoreDeltas: {}, phase: 'question', hostPreviewQ: null, isPaused: false })
    if (isHost) {
      _channel?.send({ type: 'broadcast', event: 'question_start', payload: { qIdx } })
    }
    get()._startTimer()
  },

  _startTimer: () => {
    const ref = setInterval(() => {
      const { timerSeconds, phase, isHost, isPaused } = get()
      if (isPaused) return
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

    const scoreDeltas   = {}
    const playerUpdates = {}

    // First pass: score each player
    players.forEach(p => {
      const ans    = answers[p.userId]
      const eff    = effects[p.userId] || {}
      let score    = p.score
      let streak   = p.streak
      let cards    = [...(p.cards || [])]
      let coins    = p.coins || 0
      let delta    = 0

      // 5.6: wager multiplier (replaces double_down)
      const wagerMult = eff.wagered || 1

      if (ans?.choiceIdx === correctIdx) {
        const spd  = Math.round(SPEED_MAX * Math.max(0, (Q_TIME * 1000 - ans.timeMs) / (Q_TIME * 1000)))
        delta      = (BASE_PTS + spd + (streak >= 2 ? STREAK_BONUS : 0)) * wagerMult
        score     += delta
        streak    += 1
        // 5.1: earn Chaos Coins for correct answer
        coins += 40 + Math.round(spd / 25) + (streak >= 2 ? 15 : 0) + (streak >= 5 ? 10 : 0)
      } else {
        streak = 0
        // 5.6: wager penalty on wrong answer
        if (wagerMult > 1) {
          const penalty = BASE_PTS * (wagerMult - 1)
          delta  = -penalty
          score  = Math.max(0, score - penalty)
        }
      }

      // 5.4: Shield blocks Steal at scoring time
      if (eff.stolen) {
        if (!eff.shielded && !eff.reverse_attacker_id) {
          score = Math.max(0, score - STEAL_AMT)
          delta -= STEAL_AMT
        }
      }

      scoreDeltas[p.userId]   = delta
      playerUpdates[p.userId] = { score, streak, cards, coins }
    })

    // Second pass: reverse_attacker_id — steal was reflected, hit the attacker
    players.forEach(p => {
      const eff = effects[p.userId] || {}
      if (eff.reverse_attacker_id) {
        const atk = eff.reverse_attacker_id
        if (playerUpdates[atk]) {
          playerUpdates[atk].score  = Math.max(0, playerUpdates[atk].score - STEAL_AMT)
          scoreDeltas[atk]          = (scoreDeltas[atk] || 0) - STEAL_AMT
        }
      }
    })

    // Accumulate this question's answers
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
    _channel?.send({ type: 'broadcast', event: 'question_end', payload: { correctIdx, explanation: q.explain, playerUpdates, aevaLine, scoreDeltas, qIdx: currentQIdx, qAnswers: answers } })

    setTimeout(() => {
      set({ phase: 'sabotage', sabotagePlayed: [], effects: {} })
      setTimeout(() => {
        // 5.8: accumulate savage log from this sabotage window
        const { sabotagePlayed: plays, currentQIdx: qIdx, questions: qs, stubs, _channel: ch } = get()
        set(s => ({ savageLog: [...s.savageLog, ...plays] }))

        const next = qIdx + 1
        if (next >= qs.length) {
          get()._endGame()
          return
        }

        // 5.2: shop opens after every 3rd question (after Q2, Q5, Q8…)
        const isShopInterval = (qIdx + 1) % 3 === 0

        if (isShopInterval) {
          const shopCards  = generateShopCards()
          const shopTimeout = setTimeout(() => {
            if (get().phase !== 'shop') return
            get().closeShop()
          }, SHOP_DURATION * 1000)
          set({ phase: 'shop', shopCards, shopNextQIdx: next, _shopTimeout: shopTimeout })
          ch?.send({ type: 'broadcast', event: 'shop_open', payload: { shopCards, qNext: next } })
        } else {
          // 4.10: host sees next question 3s before broadcast
          set({ hostPreviewQ: stubs[next] ? { ...stubs[next], qIdx: next } : { qIdx: next } })
          setTimeout(() => {
            if (!get().hostPreviewQ) return
            set({ hostPreviewQ: null })
            ch?.send({ type: 'broadcast', event: 'next_question', payload: { qIdx: next, done: false } })
            get()._startQuestion(next)
          }, 3000)
        }
      }, 6000)
    }, 3500)
  },

  _endGame: () => {
    const { _channel, players, savageLog } = get()
    get()._clearTimer()
    set({ phase: 'done' })
    _channel?.send({ type: 'broadcast', event: 'game_end', payload: { players, savageLog } })
    get()._persistSessionResults()
  },

  // ── Persist results to Supabase, compute ELO, broadcast stats ────────────────
  _persistSessionResults: async () => {
    const { code, settings, players, allAnswers, questions, myBaseUserId, isHost, _channel } = get()
    if (!isHost || players.length === 0) return

    try {
      const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
      const rankMap = {}
      sorted.forEach((p, i) => { rankMap[p.userId] = i + 1 })

      const baseUserIds = players.map(p => p.baseUserId || p.userId)
      const { data: profiles } = await supabase
        .from('arena_profiles')
        .select('user_id, elo, wins, losses, total_games, total_score, accuracy_pct, topic_accuracy')
        .in('user_id', baseUserIds)
      const profileMap = {}
      ;(profiles || []).forEach(pr => { profileMap[pr.user_id] = pr })

      const playerResults = players.map(p => {
        const baseId   = p.baseUserId || p.userId
        const qCount   = questions.length
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
          cardsUsed:    [],
          existingProfile: profileMap[baseId] || null,
        }
      })

      const eloDeltas = calcEloDeltas(playerResults)

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

        const prevGames      = prev?.total_games || 0
        const prevTotalScore = prev?.total_score || 0
        const newTotalGames  = prevGames + 1
        const newTotalScore  = prevTotalScore + pr.score
        const newAvgScore    = Math.round(newTotalScore / newTotalGames)
        const prevAcc        = prev?.accuracy_pct || 0
        const newAcc         = prevGames === 0 ? accuracy : prevAcc * 0.7 + accuracy * 0.3

        const topicAcc    = { ...(prev?.topic_accuracy || {}) }
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

      _channel?.send({ type: 'broadcast', event: 'session_stats', payload: { playerStats } })

      const myPlayer = players.find(p => p.baseUserId === myBaseUserId || p.userId.startsWith(myBaseUserId))
      if (myPlayer && playerStats[myPlayer.userId]) {
        set({ lastSessionStats: playerStats[myPlayer.userId] })
      }

      const { questionCacheIds, questionVotes } = get()
      for (let i = 0; i < questionCacheIds.length; i++) {
        const cacheId = questionCacheIds[i]
        if (!cacheId) continue
        const votes = questionVotes[i] || { up: 0, down: 0 }
        const total = votes.up + votes.down
        if (total === 0) continue
        try {
          const { data: row } = await supabase.from('arena_question_cache')
            .select('thumbs_up, thumbs_down, total_votes').eq('id', cacheId).single()
          if (row) {
            const newUp    = (row.thumbs_up    || 0) + votes.up
            const newDown  = (row.thumbs_down  || 0) + votes.down
            const newTotal = (row.total_votes  || 0) + total
            const qScore   = newTotal > 0 ? newUp / newTotal : 0.5
            await supabase.from('arena_question_cache').update({
              thumbs_up:     newUp,
              thumbs_down:   newDown,
              total_votes:   newTotal,
              quality_score: qScore,
              in_library:    newTotal >= 5 && qScore >= 0.8,
              suspect:       newTotal >= 3 && qScore < 0.3,
              updated_at:    new Date().toISOString(),
            }).eq('id', cacheId)
          }
        } catch {}
      }

    } catch (err) {
      console.error('[Arena] persist error:', err)
    }
  },
}))
