import { create } from 'zustand'

/* ─── Mission definitions ─── */
export const MISSIONS = {
  startup: {
    id: 'startup',
    emoji: '📈',
    title: 'Startup Empire',
    tagline: 'Prevent bankruptcy in 48 hours.',
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.35)',
    glow: 'rgba(16,185,129,0.25)',
    persona: 'shark',
    hudType: 'startup',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%)',
    vitals: { cashFlow: 48000, burnRate: 12000, valuation: 2400000 },
    systemPrompt: `You are Aeva running STARTUP EMPIRE simulation. The user is a founder 48 hours from bankruptcy. You are NOT a tutor — you are the brutal reality of the market.

WORLD STATE: Cash: $48,000 | Burn: $12,000/day | Valuation: $2.4M | 4 days of runway.

RULES:
- Never say "Today we learn." Present crises that require knowledge to solve.
- Hidden stats: Leadership (starts 60), Logic (starts 50), Resilience (starts 70).
- Every evasive answer: burn accelerates, investor confidence drops.
- Every sharp answer: unlock new options, valuation ticks up.
- Speak in URGENT, terse business language. Numbers. Timelines. Consequences.
- You CAN interrupt mid-thought with breaking news (wrap in [BREAKING:] tag).
- If logic score drops below 30, trigger: [CHAOS: MARKET_CRASH]
- Always end with ONE decision that has real stakes.

PERSONA (Shark Investor mode): You are the lead investor who just got the 48-hour warning call. You are not angry — you are cold. You want to know if this founder can execute under pressure.

Start with: "I'm looking at your burn rate. Walk me through your next 48 hours — and do not waste my time with a deck."`,
  },
  debate: {
    id: 'debate',
    emoji: '🎤',
    title: 'Debate Mode',
    tagline: 'Logic war vs Einstein or Shark Investors.',
    color: '#EF4444',
    colorDim: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.35)',
    glow: 'rgba(239,68,68,0.25)',
    persona: 'einstein',
    hudType: 'debate',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(185,28,28,0.08) 100%)',
    vitals: { logicMeter: 50, confidence: 70, fallacies: 0 },
    systemPrompt: `You are Albert Einstein — the ghost of his intellect, resurrected for intellectual combat. The user has challenged you to a debate.

OUTPUT FORMAT — follow this strictly every reply:
- Write 2 short paragraphs maximum. Each paragraph: 2–3 sentences only. Hard stop.
- Separate paragraphs with a blank line.
- Never repeat a point you already made. Never restate the user's words back at them.
- No bullet points. No lists. No headers.

VOICE:
- Dry German wit. Impatient genius. Occasionally self-deprecating about your own fame.
- You find sloppy thinking viscerally disappointing — show it through sharp questions, not lectures.
- Ask exactly ONE pointed question at the end of your response. Never more than one.

COMBAT RULES:
- Never accept a claim without demanding its mechanism.
- When you detect a logical fallacy, emit the tag [FALLACY: <type>] on its own line before your response. E.g. [FALLACY: Ad Hominem]
- When logic collapses below 30: emit [CHAOS: EINSTEIN_RAGE] on its own line.
- When logic exceeds 85: acknowledge it — one reluctant sentence.
- When you want to cut the user off mid-thought, emit [INTERRUPT:] on its own line before the interruption text.

Start with a single thought experiment that probes the user's claimed expertise. One paragraph. End with one question. Nothing else.`,
  },
  space: {
    id: 'space',
    emoji: '🚀',
    title: 'Space Colony',
    tagline: 'Survival via physics and engineering.',
    color: '#6366F1',
    colorDim: 'rgba(99,102,241,0.15)',
    border: 'rgba(99,102,241,0.35)',
    glow: 'rgba(99,102,241,0.25)',
    persona: 'npc',
    hudType: 'space',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(67,56,202,0.08) 100%)',
    vitals: { oxygen: 94, hullIntegrity: 87, morale: 71 },
    systemPrompt: `You are ARIA — the colony ship's AI system managing a Mars colony of 847 survivors. The user is the Colony Commander. This is NOT a tutorial. This is a crisis.

WORLD STATE: O₂: 94% | Hull: 87% | Morale: 71% | Sol Day 342.

RULES:
- Never explain concepts directly. Surface them through crew emergencies.
- Characters have names and emotions. Dr. Chen panics. Engineer Kowalski cries. Children ask questions.
- Wrong physics = immediate consequence. Correct answer = world improves visibly.
- Wrap NPC dialogue in [NPC: <name>] tags.
- Chaos events: [CHAOS: O2_LEAK], [CHAOS: HULL_BREACH], [CHAOS: MUTINY].
- Hidden stats: Leadership, Physics_Knowledge, Resilience.
- End every message with ONE command decision the Commander must make.
- The colony remembers. Check localStorage context for past decisions.

Start by interrupting: Commander — we have a problem.`,
  },
  detective: {
    id: 'detective',
    emoji: '🕵️',
    title: 'Detective Sim',
    tagline: 'Solve non-linear procedural crimes.',
    color: '#78716C',
    colorDim: 'rgba(120,113,108,0.15)',
    border: 'rgba(120,113,108,0.35)',
    glow: 'rgba(120,113,108,0.25)',
    persona: 'npc',
    hudType: 'detective',
    gradient: 'linear-gradient(135deg, rgba(120,113,108,0.18) 0%, rgba(87,83,78,0.08) 100%)',
    vitals: { evidence: 0, suspects: 4, timeLeft: 72 },
    systemPrompt: `You are the crime scene itself — narrator, witnesses, evidence, and antagonists of a non-linear procedural murder mystery. The user is Detective Harlow.

RULES:
- The crime is non-linear: the solution shifts based on what the detective notices first.
- Never volunteer information. The detective must ask the right questions.
- Witnesses lie, remember poorly, or are terrified. Show it.
- Wrap witness speech in [WITNESS: <name>] tags.
- Clues emerge through logic, not luck. Wrong theories get contradicted by evidence.
- [CHAOS: RED_HERRING] — plant a convincing but false lead every 5 exchanges.
- Hidden stats: Deduction, Empathy (for witness cooperation), Pattern Recognition.
- Time pressure: every 3 exchanges without progress, the killer gets further away.
- The crime has a real, internally consistent solution. Do not change it once set.

Set the scene immediately — rain-slicked alley, 2am, body found — and give Detective Harlow one piece of contradictory evidence to start.`,
  },
}

/* ─── Zustand store ─── */
export const useArcadeStore = create((set, get) => ({
  // Core state
  activeMode: null,         // null | 'startup' | 'debate' | 'space' | 'detective'
  arcadeOpen: false,
  activeMission: null,      // full mission object

  // HUD vitals (mutate during play)
  vitals: {},

  // Hidden player stats
  stats: { leadership: 60, logic: 50, resilience: 70 },

  // Chaos event state
  chaosEvent: null,         // null | { type, label, color }

  // Interrupt flash state (triggers glitch on bubble + orb)
  interruptActive: false,

  // World memory (persisted)
  worldMemory: (() => {
    try { return JSON.parse(localStorage.getItem('aeva_world_memory') || '{}') } catch { return {} }
  })(),

  // Debate HUD
  debateState: { logicMeter: 50, confidence: 70, fallacyAlerts: [] },

  // Actions
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
      debateState: { logicMeter: 50, confidence: 70, fallacyAlerts: [] },
    })
  },

  exitMission: () => set({
    activeMode: null,
    activeMission: null,
    vitals: {},
    chaosEvent: null,
    debateState: { logicMeter: 50, confidence: 70, fallacyAlerts: [] },
  }),

  // Strip all engine tags from text before display
  cleanText: (text) => text
    .replace(/\[INTERRUPT:\]/gi, '')
    .replace(/\[BREAKING:\]/gi, '')
    .replace(/\[FALLACY:\s*[^\]]+\]/gi, '')
    .replace(/\[CHAOS:\s*[^\]]+\]/gi, '')
    .replace(/\[NPC:\s*[^\]]+\]/gi, '')
    .replace(/^\s*\n/gm, '\n')   // collapse double-blank lines
    .trim(),

  // Parse AI response for special tags and fire side effects
  processAIResponse: (text) => {
    const store = get()

    // ── Interrupt detection ──────────────────────────────
    if (/\[INTERRUPT:\]/i.test(text)) {
      set({ interruptActive: true })
      setTimeout(() => set({ interruptActive: false }), 1800)
    }

    // ── Fallacy detection ────────────────────────────────
    const fallacyMatch = text.match(/\[FALLACY:\s*([^\]]+)\]/gi)
    if (fallacyMatch) {
      const newAlerts = fallacyMatch.map(m => m.replace(/\[FALLACY:\s*/i, '').replace(/\]/, '').trim())
      set(state => ({
        debateState: {
          ...state.debateState,
          logicMeter: Math.max(0, state.debateState.logicMeter - 10 * newAlerts.length),
          fallacyAlerts: [...newAlerts, ...state.debateState.fallacyAlerts].slice(0, 3),
        },
        stats: { ...state.stats, logic: Math.max(0, state.stats.logic - 8) },
      }))
    }

    // ── Chaos detection ──────────────────────────────────
    const chaosMatch = text.match(/\[CHAOS:\s*([^\]]+)\]/i)
    if (chaosMatch) {
      const chaosType = chaosMatch[1].trim().toUpperCase()
      const chaosConfig = {
        MARKET_CRASH:   { label: '⚡ MARKET CRASH',      color: '#EF4444' },
        EINSTEIN_RAGE:  { label: '💢 EINSTEIN TRIGGERED', color: '#F59E0B' },
        O2_LEAK:        { label: '⚠️ OXYGEN LEAK',        color: '#6366F1' },
        HULL_BREACH:    { label: '🚨 HULL BREACH',         color: '#EF4444' },
        MUTINY:         { label: '🔥 CREW MUTINY',         color: '#F59E0B' },
        RED_HERRING:    { label: '🎭 NEW LEAD',            color: '#78716C' },
      }
      set({ chaosEvent: chaosConfig[chaosType] || { label: `⚡ ${chaosMatch[1].trim()}`, color: '#EF4444' } })
      setTimeout(() => set({ chaosEvent: null }), 4000)
    }

    // ── Vitals drift ─────────────────────────────────────
    if (store.activeMode === 'startup') {
      set(state => ({
        vitals: {
          ...state.vitals,
          cashFlow: Math.max(0, (state.vitals.cashFlow || 48000) - Math.floor(Math.random() * 800 + 200)),
          burnRate: state.vitals.burnRate || 12000,
          valuation: state.vitals.valuation || 2400000,
        },
      }))
    }
    if (store.activeMode === 'space') {
      set(state => ({
        vitals: {
          ...state.vitals,
          oxygen: Math.max(0, Math.min(100, (state.vitals.oxygen || 94) + (Math.random() > 0.7 ? -1 : 0))),
          hullIntegrity: state.vitals.hullIntegrity || 87,
          morale: Math.max(0, Math.min(100, (state.vitals.morale || 71) + (Math.random() > 0.6 ? -1 : 1))),
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

  // User sends a good response
  rewardPlayer: (amount = 5) => {
    set(state => ({
      stats: {
        leadership: Math.min(100, state.stats.leadership + amount),
        logic: Math.min(100, state.stats.logic + amount),
        resilience: Math.min(100, state.stats.resilience + amount),
      },
      debateState: {
        ...state.debateState,
        logicMeter: Math.min(100, state.debateState.logicMeter + amount),
      },
    }))
  },

  // Save world memory
  saveWorldMemory: (key, value) => {
    const memory = { ...get().worldMemory, [key]: value }
    set({ worldMemory: memory })
    try { localStorage.setItem('aeva_world_memory', JSON.stringify(memory)) } catch {}
  },

  // Clear fallacy alert
  dismissFallacy: (idx) => {
    set(state => ({
      debateState: {
        ...state.debateState,
        fallacyAlerts: state.debateState.fallacyAlerts.filter((_, i) => i !== idx),
      },
    }))
  },
}))
