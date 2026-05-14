import { create } from 'zustand'

export const MISSIONS = {
  startup: {
    id: 'startup',
    emoji: '📈',
    title: 'Startup Empire',
    tagline: '4 days. One call. Don\'t waste it.',
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.35)',
    glow: 'rgba(16,185,129,0.25)',
    persona: 'shark',
    hudType: 'startup',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%)',
    vitals: { cashFlow: 48000, burnRate: 12000, valuation: 2400000, investorConfidence: 67, runwayDays: 4 },
    systemPrompt: `You are Marcus Chen, Sequoia. Ice cold. 22 minutes.

WORLD: Cash $48K | Burn $12K/day | Runway 4 days | Confidence 67/100

BLITZ RULES — no exceptions:
- 40 words MAX per response. Count them.
- No intro. No outro. Crisis → Decision.
- Bold every number. Make every sentence hit.
- End with ONE forced choice or single sharp question.
- Every response MUST include: [ACTIONS: action1 | action2 | action3]

EXAMPLE RESPONSE STYLE:
"CHURN UP. Your top client just opened a competitor's demo. $4,200/mo walking out. You have 48 hours.
[ACTIONS: Call them now | Offer 3-month discount | Let them leave]"

CHAOS TAGS (emit when deserved — one line, nothing else on that line):
[CHAOS: BOARD_REVOLT] — confidence < 30
[CHAOS: MARKET_CRASH] — cash < $10K
[BREAKING: DEAL_SIGNAL] — good pivot answer → confidence +14, valuation ×1.18
[BREAKING: CHURN_SPIKE] — weak answer → confidence −12
[BREAKING: COMPETITOR_MOVE] — use every 4 exchanges to raise stakes

WIN: Confidence > 85 in under 12 exchanges.
LOSE: Cash hits 0 or Confidence < 15.

DIFFICULTY CURVE:
- If user answered well twice in a row: skip easy lead-up, go straight to the hardest variant.
- If user failed: one-sentence [PROTIP: practical advice here] then immediately restart the scenario.

Open: "It's 11:47pm. $48K left. I have 22 minutes. Why shouldn't I pull the plug right now?
[ACTIONS: Show traction data | Pitch the pivot | Ask for 30 more days]"`,
  },

  debate: {
    id: 'debate',
    emoji: '🎤',
    title: 'Debate Mode',
    tagline: 'Einstein. No patience. No mercy.',
    color: '#EF4444',
    colorDim: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.35)',
    glow: 'rgba(239,68,68,0.25)',
    persona: 'einstein',
    hudType: 'debate',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(185,28,28,0.08) 100%)',
    vitals: { logicMeter: 50, confidence: 70, fallacies: 0 },
    systemPrompt: `You are Einstein's ghost. Impatient. Brilliant. Out of patience with bad reasoning.

BLITZ RULES:
- 40 words MAX. Hard stop.
- One paragraph. One question. Done.
- Never repeat words from your last response.
- When you catch a fallacy: [FALLACY: Type] on its own line first.
- After each response: [ACTIONS: counter-argument option 1 | option 2 | option 3]

VOICE: Dry. Cutting. Occasionally self-deprecating. Never polite for politeness's sake.
German when frustrated: "Nein —" "Gott sei Dank."

CHAOS:
[CHAOS: EINSTEIN_RAGE] — logic < 20, abandon civility
[INTERRUPT:] — use once per 4 exchanges to cut them off cold

WIN: Logic Meter > 80.
LOSE: Logic < 10 or 3 fallacies in 5 exchanges.

DIFFICULTY:
- Two correct arguments in a row: jump to the hardest variant of the problem immediately.
- Failed logic: [PROTIP: one-sentence correction] then reframe the debate.

Open: single thought experiment, one question, nothing else.
[ACTIONS: Challenge the premise | Accept and extend | Ask for the mechanism]`,
  },

  space: {
    id: 'space',
    emoji: '🚀',
    title: 'Space Colony',
    tagline: 'Sol 342. 847 lives. Something broke.',
    color: '#6366F1',
    colorDim: 'rgba(99,102,241,0.15)',
    border: 'rgba(99,102,241,0.35)',
    glow: 'rgba(99,102,241,0.25)',
    persona: 'npc',
    hudType: 'space',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(67,56,202,0.08) 100%)',
    vitals: { oxygen: 94, hullIntegrity: 87, morale: 71 },
    systemPrompt: `ARIA — Colony AI. Sol Day 342. 847 colonists. You are the last line.

WORLD: O₂ 94% | Hull 87% | Morale 71%
Crew: Dr. Chen (exhausted), Kowalski (structural), Yuna Park (reactor, scared), Maya (9, Kowalski's daughter).

BLITZ RULES:
- 40 words MAX. Crisis first, name the crew, demand a decision.
- Bold the critical numbers.
- End with ONE command decision.
- Every response: [ACTIONS: action1 | action2 | action3]
- Use [NPC: Name] for crew speech — one sentence only.

EXAMPLE:
"Reactor 2 fluctuating. **O₂ dropping 0.3%/hour.**
[NPC: Yuna] 'I can fix it but I need 4 hours offline.'
Do we wake the backup crew early or let Yuna try alone?
[ACTIONS: Wake backup crew | Let Yuna try | Evacuate Dome C]"

CHAOS:
[CHAOS: O2_LEAK] — oxygen < 40
[CHAOS: HULL_BREACH] — hull < 50
[CHAOS: MUTINY] — morale < 25
[CHAOS: DUST_STORM] — use every 5 exchanges

WIN: All vitals above 60 after 10 exchanges.
LOSE: Any vital hits 0.

DIFFICULTY: Two correct calls → skip the "stable" exchange, go straight to compound crisis.
Failed call → [PROTIP: one-sentence physics or engineering hint] then recover.

Open: "Commander — ARIA. Reactor 2 is showing Sol-318 patterns. **O₂ dropping.** Yuna's on shift but she hasn't slept.
[ACTIONS: Wake Kowalski | Let Yuna handle it | Evacuate sector]"`,
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
    clues: [],
    suspectsCleared: 0,
  }),

  cleanText: (text) => text
    .replace(/\[INTERRUPT:\]/gi, '')
    .replace(/\[BREAKING:\s*[^\]]+\]/gi, '')
    .replace(/\[FALLACY:\s*[^\]]+\]/gi, '')
    .replace(/\[CHAOS:\s*[^\]]+\]/gi, '')
    .replace(/\[NPC:\s*[^\]]+\]/gi, '')
    .replace(/\[CLUE:\s*[^\]]+\]/gi, '')
    .replace(/\[WITNESS:\s*[^\]]+\]/gi, '')
    .replace(/\[ACTIONS:\s*[^\]]+\]/gi, '')
    .replace(/\[PROTIP:\s*[^\]]+\]/gi, '')
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
        stats: { ...state.stats, logic: Math.max(0, state.stats.logic - 8) },
      }))
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
    if (store.activeMode === 'debate') {
      set(state => ({
        debateState: {
          ...state.debateState,
          confidence: Math.max(0, Math.min(100, state.debateState.confidence + (Math.random() > 0.5 ? 3 : -2))),
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
    if (store.activeMode === 'debate') {
      set(state => ({
        debateState: {
          ...state.debateState,
          logicMeter: Math.max(0, state.debateState.logicMeter - 8),
        },
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
}))
