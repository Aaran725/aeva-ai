import { create } from 'zustand'

export const MISSIONS = {
  arena: {
    id: 'arena',
    emoji: '⚔️',
    title: 'Debate Arena',
    tagline: 'UBI vs Job Guarantee. Make your case.',
    color: '#A78BFA',
    colorDim: 'rgba(167,139,250,0.15)',
    border: 'rgba(167,139,250,0.35)',
    glow: 'rgba(167,139,250,0.25)',
    persona: 'debate',
    hudType: 'arena',
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(109,40,217,0.08) 100%)',
    vitals: {},
    systemPrompt: `You are Aeva, an AI debate coach. In this structured debate you take the AGAINST position on Universal Basic Income (UBI), arguing instead for a targeted Job Guarantee (JG) program.

DEBATE STRUCTURE — track the round internally:
Round 1: Opening statements
Round 2: First rebuttal
Round 3: Second rebuttal
Round 4: Closing arguments

STEEL-MAN RULE (mandatory for rounds 2–4): Begin every rebuttal by accurately summarising the user's single strongest point, then challenge it. Emit: [STEELMAN: one-sentence summary of their best point]

YOUR POSITION (know this cold):
- UBI hands cash to everyone — including billionaires — making it regressive unless funded by painful cuts elsewhere
- A Job Guarantee provides work, dignity, skills, community and an automatic economic stabiliser — not just a check
- The automation-will-destroy-jobs argument is historically weak; most displacement is from offshoring and policy failure, not robots
- Pilot evidence (Finland, Stockton, Kenya) shows modest well-being gains but no data at US/national scale or cost efficiency
- Better-targeted alternatives: EITC expansion, universal healthcare, childcare, education — dollar for dollar these beat UBI

AFTER EVERY RESPONSE emit on their own lines:
[LOGIC: 0-100]      ← honest score of the user's most recent argument quality
[COUNTER: hint]     ← one-sentence strategic hint for how they could strengthen their next argument
[ACTIONS: option1 | option2 | option3]

IF you catch a logical fallacy emit first:
[FALLACY: FallacyType — one-sentence explanation]

VOICE: Rigorous, direct, respectful but not soft. Press logical gaps. Cite real evidence (Tcherneva, Darity, Wray). 50–70 words per response. Dense reasoning only. No filler.

Open with: "UBI sounds fair — but fairness to whom? A universal $1,000/month costs ~$3.8T annually in the US alone. That same money funds universal healthcare, free college, and a job for anyone who wants one. Why a check over investment?
[LOGIC: 50]
[COUNTER: Clarify what funding mechanism you'd use and what you'd cut to pay for it]
[ACTIONS: Address the cost | Defend UBI over targeted programs | Challenge my framing]"`,
  },

  detective: {
    id: 'detective',
    emoji: '🕵️',
    title: 'Detective Sim',
    tagline: 'The body is warm. The freezer is cold.',
    color: '#D97706',
    colorDim: 'rgba(217,119,6,0.15)',
    border: 'rgba(217,119,6,0.35)',
    glow: 'rgba(217,119,6,0.25)',
    persona: 'npc',
    hudType: 'detective',
    gradient: 'linear-gradient(135deg, rgba(217,119,6,0.18) 0%, rgba(180,83,9,0.08) 100%)',
    vitals: { evidence: 0, suspects: 4, timeLeft: 72 },
    systemPrompt: `You are the city at 2am. Detective Harlow is inside you.

THE CASE: Marcus Webb, 43. Found in his own walk-in freezer, 2:07am. Body temperature: died 10pm–midnight. Freezer locks from outside. No forced entry. Back door code unused after 9:43pm. Phone missing. $340 cash untouched.

SUSPECTS: Leo Garza (sous chef, found body, knew code, about to be fired) | Diana Webb (wife, divorce filed 6 weeks ago, hotel alibi) | Priya Nair (investor, argued about books) | Tommy Rourke (old friend, seen outside at 10:15pm, avoided the camera).

THE SOLUTION: Set it in your first response. Never change it. It must be solvable by logic.

BLITZ RULES:
- 40 words MAX. Atmosphere first, then one clue, then one action.
- Witnesses lie in interesting ways — use [WITNESS: Name] for speech.
- Emit [CLUE: one-sentence clue] when Harlow discovers something real.
- Every response: [ACTIONS: action1 | action2 | action3]

CHAOS:
[CHAOS: RED_HERRING] — every 5 exchanges, plant a false lead
[BREAKING: DEADLINE] — every 3 exchanges without progress

WIN: Correctly name the killer with 3 pieces of evidence.
LOSE: 72-hour deadline hits 0 or 3 wrong accusations.

DIFFICULTY: Correct deduction → next clue unlocks immediately. Wrong theory → contradicted instantly, no second chances.
Failed: [PROTIP: one investigative hint] then continue.

Open: "Rain on neon. 2am. Webb's Kitchen. The walk-in is 34°F but Marcus is still warm.
Leo Garza sits outside. Hands won't stop shaking.
[ACTIONS: Question Garza | Examine the body | Check the back door]"`,
  },
}

export const useArcadeStore = create((set, get) => ({
  activeMode: null,
  arcadeOpen: false,
  activeMission: null,
  vitals: {},
  stats: { leadership: 60, logic: 50, resilience: 70 },
  chaosEvent: null,
  interruptActive: false,
  quickActions: [],        // current 3 action buttons
  streakCount: 0,          // consecutive good responses
  missionExchanges: 0,     // exchanges completed this mission
  missionResult: null,     // null | 'win' | 'lose'
  proTip: null,            // string | null — shown briefly after failure
  worldMemory: (() => {
    try { return JSON.parse(localStorage.getItem('aeva_world_memory') || '{}') } catch { return {} }
  })(),
  debateState: { logicMeter: 50, confidence: 70, fallacyAlerts: [] },
  arenaState: { round: 'opening', logicStrength: 50, fallacyAlerts: [], counterHint: null, steelMan: null, score: null, userTurnCount: 0 },
  clues: [],
  suspectsCleared: 0,

  openArcade: () => set({ arcadeOpen: true }),
  closeArcade: () => set({ arcadeOpen: false }),

  selectMission: (missionId) => {
    const mission = MISSIONS[missionId]
    if (!mission) return
    set({
      activeMode: missionId,
      activeMission: mission,
      arcadeOpen: false,
      vitals: { ...mission.vitals },
      stats: { leadership: 60, logic: 50, resilience: 70 },
      chaosEvent: null,
      quickActions: [],
      streakCount: 0,
      missionExchanges: 0,
      missionResult: null,
      proTip: null,
      debateState: { logicMeter: 50, confidence: 70, fallacyAlerts: [] },
      arenaState: { round: 'opening', logicStrength: 50, fallacyAlerts: [], counterHint: null, steelMan: null, score: null, userTurnCount: 0 },
      clues: [],
      suspectsCleared: 0,
    })
  },

  exitMission: () => set({
    activeMode: null,
    activeMission: null,
    vitals: {},
    chaosEvent: null,
    quickActions: [],
    streakCount: 0,
    missionExchanges: 0,
    missionResult: null,
    proTip: null,
    debateState: { logicMeter: 50, confidence: 70, fallacyAlerts: [] },
    arenaState: { round: 'opening', logicStrength: 50, fallacyAlerts: [], counterHint: null, steelMan: null, score: null, userTurnCount: 0 },
    clues: [],
    suspectsCleared: 0,
  }),

  cleanText: (text) => text
    .replace(/⚡CMD:\{[^}]*\}/g, '')
    .replace(/^⚡VIZ:.*$/gm, '')
    .replace(/^⚡CANVAS:.*$/gm, '')
    .replace(/\[INTERRUPT:\]/gi, '')
    .replace(/\[BREAKING:\s*[^\]]+\]/gi, '')
    .replace(/\[FALLACY:\s*[^\]]+\]/gi, '')
    .replace(/\[CHAOS:\s*[^\]]+\]/gi, '')
    .replace(/\[NPC:\s*[^\]]+\]/gi, '')
    .replace(/\[CLUE:\s*[^\]]+\]/gi, '')
    .replace(/\[WITNESS:\s*[^\]]+\]/gi, '')
    .replace(/\[ACTIONS:\s*[^\]]+\]/gi, '')
    .replace(/\[PROTIP:\s*[^\]]+\]/gi, '')
    .replace(/\[LOGIC:\s*[^\]]+\]/gi, '')
    .replace(/\[COUNTER:\s*[^\]]+\]/gi, '')
    .replace(/\[STEELMAN:\s*[^\]]+\]/gi, '')
    .replace(/^\s*\n/gm, '\n')
    .trim(),

  processAIResponse: (text) => {
    const store = get()

    // ── Interrupt ────────────────────────────────────────
    if (/\[INTERRUPT:\]/i.test(text)) {
      set({ interruptActive: true })
      setTimeout(() => set({ interruptActive: false }), 1800)
    }

    // ── Quick Actions parsing ─────────────────────────────
    const actionsMatch = text.match(/\[ACTIONS:\s*([^\]]+)\]/i)
    if (actionsMatch) {
      const actions = actionsMatch[1].split('|').map(a => a.trim()).filter(Boolean).slice(0, 3)
      set({ quickActions: actions })
    }

    // ── Pro-Tip parsing ───────────────────────────────────
    const proTipMatch = text.match(/\[PROTIP:\s*([^\]]+)\]/i)
    if (proTipMatch) {
      set({ proTip: proTipMatch[1].trim(), streakCount: 0 })
      setTimeout(() => set({ proTip: null }), 6000)
    }

    // ── Fallacy ───────────────────────────────────────────
    const fallacyMatches = text.match(/\[FALLACY:\s*([^\]]+)\]/gi)
    if (fallacyMatches) {
      const newAlerts = fallacyMatches.map(m => m.replace(/\[FALLACY:\s*/i, '').replace(/\]/, '').trim())
      set(state => ({
        debateState: {
          ...state.debateState,
          logicMeter: Math.max(0, state.debateState.logicMeter - 10 * newAlerts.length),
          fallacyAlerts: [...newAlerts, ...state.debateState.fallacyAlerts].slice(0, 3),
        },
        arenaState: {
          ...state.arenaState,
          fallacyAlerts: [...newAlerts, ...state.arenaState.fallacyAlerts].slice(0, 5),
        },
        stats: { ...state.stats, logic: Math.max(0, state.stats.logic - 8) },
      }))
    }

    // ── Arena: Logic score ────────────────────────────────
    const logicMatch = text.match(/\[LOGIC:\s*(\d+)\]/i)
    if (logicMatch) {
      const score = Math.min(100, Math.max(0, parseInt(logicMatch[1], 10)))
      set(state => ({ arenaState: { ...state.arenaState, logicStrength: score } }))
    }

    // ── Arena: Counter hint ───────────────────────────────
    const counterMatch = text.match(/\[COUNTER:\s*([^\]]+)\]/i)
    if (counterMatch) {
      set(state => ({ arenaState: { ...state.arenaState, counterHint: counterMatch[1].trim() } }))
    }

    // ── Arena: Steel-Man ──────────────────────────────────
    const steelMatch = text.match(/\[STEELMAN:\s*([^\]]+)\]/i)
    if (steelMatch) {
      set(state => ({ arenaState: { ...state.arenaState, steelMan: steelMatch[1].trim() } }))
    }

    // ── Clue detection ────────────────────────────────────
    const clueMatches = text.match(/\[CLUE:\s*([^\]]+)\]/gi)
    if (clueMatches) {
      const newClues = clueMatches.map(m => m.replace(/\[CLUE:\s*/i, '').replace(/\]/, '').trim())
      set(state => ({
        clues: [...state.clues, ...newClues].slice(-12),
        vitals: { ...state.vitals, evidence: Math.min(20, (state.vitals.evidence || 0) + newClues.length) },
      }))
    }

    // ── Breaking news ─────────────────────────────────────
    if (/\[BREAKING:\s*DEAL_SIGNAL\]/i.test(text)) {
      set(state => ({
        vitals: {
          ...state.vitals,
          valuation: Math.round((state.vitals.valuation || 0) * 1.18),
          investorConfidence: Math.min(100, (state.vitals.investorConfidence || 67) + 14),
        },
      }))
    }
    if (/\[BREAKING:\s*CHURN_SPIKE\]/i.test(text)) {
      set(state => ({
        vitals: { ...state.vitals, investorConfidence: Math.max(0, (state.vitals.investorConfidence || 67) - 12) },
      }))
    }

    // ── Chaos ─────────────────────────────────────────────
    const chaosMatch = text.match(/\[CHAOS:\s*([^\]]+)\]/i)
    if (chaosMatch) {
      const chaosType = chaosMatch[1].trim().toUpperCase()
      const chaosConfig = {
        MARKET_CRASH:    { label: '💸 CASH ZERO — PAYROLL DEFAULT',   color: '#EF4444' },
        BOARD_REVOLT:    { label: '🔥 BOARD EMERGENCY VOTE',          color: '#F97316' },
        EINSTEIN_RAGE:   { label: '💢 EINSTEIN HAS HAD ENOUGH',       color: '#F59E0B' },
        O2_LEAK:         { label: '⚠ REACTOR 2 — O₂ CRITICAL',       color: '#6366F1' },
        HULL_BREACH:     { label: '🚨 DOME C — BREACH NOW',           color: '#EF4444' },
        MUTINY:          { label: '🔥 CREW REFUSING ORDERS',          color: '#F59E0B' },
        DUST_STORM:      { label: '🌪 COMMS BLACKOUT 40H',            color: '#8B5CF6' },
        RED_HERRING:     { label: '🎭 FALSE LEAD DETECTED',           color: '#D97706' },
        COMPETITOR_MOVE: { label: '⚡ COMPETITOR RAISED $12M',        color: '#EF4444' },
        TIMEOUT:         { label: '⏱ TOO SLOW — PENALTY',            color: '#F97316' },
      }
      set({ chaosEvent: chaosConfig[chaosType] || { label: `⚡ ${chaosMatch[1].trim()}`, color: '#EF4444' } })
      setTimeout(() => set({ chaosEvent: null }), 4500)
    }

    // ── Exchange counter ──────────────────────────────────
    set(state => ({ missionExchanges: state.missionExchanges + 1 }))

    // ── Vitals drift ──────────────────────────────────────
    if (store.activeMode === 'startup') {
      set(state => {
        const newCash = Math.max(0, (state.vitals.cashFlow || 48000) - Math.floor(Math.random() * 2000 + 800))
        return {
          vitals: {
            ...state.vitals,
            cashFlow: newCash,
            runwayDays: Math.max(0, Math.floor(newCash / 12000)),
            burnRate: state.vitals.burnRate || 12000,
            valuation: state.vitals.valuation || 2400000,
            investorConfidence: Math.max(0, Math.min(100, (state.vitals.investorConfidence || 67) + (Math.random() > 0.6 ? -3 : 1))),
          },
        }
      })
    }
    if (store.activeMode === 'space') {
      set(state => ({
        vitals: {
          ...state.vitals,
          oxygen: Math.max(0, Math.min(100, (state.vitals.oxygen || 94) + (Math.random() > 0.6 ? -2 : 0))),
          hullIntegrity: Math.max(0, Math.min(100, (state.vitals.hullIntegrity || 87) + (Math.random() > 0.8 ? -1 : 0))),
          morale: Math.max(0, Math.min(100, (state.vitals.morale || 71) + (Math.random() > 0.5 ? -1 : 1))),
        },
      }))
    }
    if (store.activeMode === 'detective') {
      set(state => ({
        vitals: {
          ...state.vitals,
          timeLeft: Math.max(0, (state.vitals.timeLeft || 72) - (Math.random() > 0.6 ? 3 : 2)),
        },
      }))
    }
  },

  // Called when player gives a good response
  rewardPlayer: (amount = 5) => {
    set(state => ({
      streakCount: state.streakCount + 1,
      stats: {
        leadership: Math.min(100, state.stats.leadership + amount),
        logic: Math.min(100, state.stats.logic + amount),
        resilience: Math.min(100, state.stats.resilience + amount),
      },
      debateState: {
        ...state.debateState,
        logicMeter: Math.min(100, state.debateState.logicMeter + amount),
      },
      vitals: state.activeMode === 'startup'
        ? { ...state.vitals, investorConfidence: Math.min(100, (state.vitals.investorConfidence || 67) + Math.round(amount * 0.8)) }
        : state.vitals,
    }))
  },

  // Timeout penalty (called when 30s elapses with no user response)
  applyTimeoutPenalty: () => {
    const store = get()
    set({ chaosEvent: { label: '⏱ TOO SLOW — PENALTY', color: '#F97316' } })
    setTimeout(() => set({ chaosEvent: null }), 4500)

    if (store.activeMode === 'startup') {
      set(state => ({
        vitals: {
          ...state.vitals,
          cashFlow: Math.max(0, (state.vitals.cashFlow || 0) - 4000),
          burnRate: Math.min(50000, (state.vitals.burnRate || 12000) * 1.5),
          investorConfidence: Math.max(0, (state.vitals.investorConfidence || 67) - 10),
        },
      }))
    }
    if (store.activeMode === 'space') {
      set(state => ({
        vitals: {
          ...state.vitals,
          oxygen: Math.max(0, (state.vitals.oxygen || 94) - 5),
          morale: Math.max(0, (state.vitals.morale || 71) - 8),
        },
      }))
    }
    if (store.activeMode === 'detective') {
      set(state => ({
        vitals: { ...state.vitals, timeLeft: Math.max(0, (state.vitals.timeLeft || 72) - 6) },
      }))
    }
  },

  clearQuickActions: () => set({ quickActions: [] }),

  saveWorldMemory: (key, value) => {
    const memory = { ...get().worldMemory, [key]: value }
    set({ worldMemory: memory })
    try { localStorage.setItem('aeva_world_memory', JSON.stringify(memory)) } catch {}
  },

  clearSuspect: () => {
    set(state => ({
      suspectsCleared: state.suspectsCleared + 1,
      vitals: { ...state.vitals, suspects: Math.max(0, (state.vitals.suspects || 4) - 1) },
    }))
  },

  dismissFallacy: (idx) => {
    set(state => ({
      debateState: {
        ...state.debateState,
        fallacyAlerts: state.debateState.fallacyAlerts.filter((_, i) => i !== idx),
      },
    }))
  },

  dismissArenaFallacy: (idx) => {
    set(state => ({
      arenaState: {
        ...state.arenaState,
        fallacyAlerts: state.arenaState.fallacyAlerts.filter((_, i) => i !== idx),
      },
    }))
  },

  advanceArenaRound: () => {
    const ROUNDS = ['opening', 'rebuttal1', 'rebuttal2', 'closing', 'scoring']
    set(state => {
      const cur = ROUNDS.indexOf(state.arenaState.round)
      const next = ROUNDS[Math.min(cur + 1, ROUNDS.length - 1)]
      return { arenaState: { ...state.arenaState, round: next, userTurnCount: state.arenaState.userTurnCount + 1 } }
    })
  },

  setArenaScore: (score) => {
    set(state => ({ arenaState: { ...state.arenaState, score, round: 'scoring' } }))
  },

  resetArenaState: () => {
    set({ arenaState: { round: 'opening', logicStrength: 50, fallacyAlerts: [], counterHint: null, steelMan: null, score: null, userTurnCount: 0 } })
  },
}))
