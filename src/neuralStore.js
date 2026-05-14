import { create } from 'zustand'

/* ─── Persistence helpers ─── */
const NS_KEY = 'aeva_neural_v1'
function load() {
  try { return JSON.parse(localStorage.getItem(NS_KEY) || 'null') } catch { return null }
}
function save(state) {
  try { localStorage.setItem(NS_KEY, JSON.stringify(state)) } catch {}
}

/* ─── Trait derivation ─── */
export function deriveTraits(s) {
  const candidates = []
  if (s.avgResponseLength > 110)  candidates.push({ label: 'Deep Thinker',           icon: '🧠' })
  if (s.avgResponseLength < 38)   candidates.push({ label: 'Sharp & Direct',          icon: '⚡' })
  if (s.masteredTopics.length >= 3) candidates.push({ label: 'Rapid Learner',          icon: '🚀' })
  if (s.humorPreference >= 7)     candidates.push({ label: 'Wit-Driven Mind',         icon: '😄' })
  if (s.humorPreference <= 3)     candidates.push({ label: 'Pure Logic Mode',         icon: '🔬' })
  if (s.frustrationScore > 65)    candidates.push({ label: 'Impatient Strategist',    icon: '⚔️' })
  if (s.frustrationScore < 25)    candidates.push({ label: 'Unshakeable Focus',       icon: '🧘' })
  if (s.competitiveness > 70)     candidates.push({ label: 'Highly Competitive',      icon: '🏆' })
  if (s.depth > 70)               candidates.push({ label: 'Analytically Precise',    icon: '📐' })
  if (s.fastResponses > s.longPauses && s.fastResponses > 4)
                                  candidates.push({ label: 'Instinct-Driven',         icon: '🎯' })
  if (s.struggleZones.length > 2) candidates.push({ label: 'Resilient Learner',       icon: '💪' })
  if (s.totalExchanges > 25)      candidates.push({ label: 'Dedicated Scholar',       icon: '📚' })
  if (s.masteredTopics.length === 0 && s.totalExchanges < 5)
                                  candidates.push({ label: 'Exploring Territory',     icon: '🗺️' })

  // Always have at least 3 — pad with defaults
  const defaults = [
    { label: 'Curious Mind',  icon: '🔍' },
    { label: 'Strategic',     icon: '♟️' },
    { label: 'Determined',    icon: '🔥' },
  ]
  const pool = [...candidates, ...defaults]
  return pool.slice(0, 3)
}

/* ─── Profile title derivation ─── */
export function deriveTitle(s) {
  if (s.competitiveness > 75 && s.depth > 60)  return 'The Precision Architect'
  if (s.humorPreference >= 7 && s.depth > 55)  return 'The Brilliant Wit'
  if (s.frustrationScore > 65 && s.competitiveness > 60) return 'The Relentless Critic'
  if (s.avgResponseLength > 110 && s.depth > 65) return 'The Deep Analyst'
  if (s.masteredTopics.length >= 4)             return 'The Polymathic Mind'
  if (s.fastResponses > 8)                      return 'The Instinct Player'
  if (s.struggleZones.length > s.masteredTopics.length && s.totalExchanges > 10)
                                                return 'The Resilient Warrior'
  return 'The Emerging Scholar'
}

/* ─── Rank derivation ─── */
export function deriveRank(s) {
  const score = (s.masteredTopics.length * 12) + (s.totalExchanges * 0.8) + (s.depth * 0.5)
  if (score > 80)  return 'Top 1%'
  if (score > 50)  return 'Top 5%'
  if (score > 25)  return 'Top 15%'
  if (score > 10)  return 'Top 30%'
  return 'Top 50%'
}

/* ─── Vibe derivation ─── */
export function deriveVibe(recentModes) {
  if (!recentModes || recentModes.length === 0) return 'Focused'
  const last3 = recentModes.slice(-3)
  const allHype    = last3.every(m => m === 'hype')
  const allChallenge = last3.every(m => m === 'challenge')
  const allRedirect  = last3.filter(m => m === 'redirect').length >= 2
  if (allHype)      return 'Proud'
  if (allChallenge) return 'Skeptical'
  if (allRedirect)  return 'Concerned'
  if (last3.includes('hype')) return 'Impressed'
  return 'Engaged'
}

/* ─── Orb personality derivation ─── */
export function deriveOrbPersonality(s) {
  if (s.frustrationScore > 60 && s.competitiveness > 65) return 'aggressive'
  if (s.depth > 65 && s.avgResponseLength > 90)          return 'academic'
  if (s.humorPreference >= 7)                            return 'curious'
  return 'balanced'
}

/* ─── Concept dependency chains ─── */
export const CONCEPT_CHAINS = {
  'derivatives': ['integration', 'chain rule', 'differential equations'],
  'integration': ['multivariable calculus', 'series and sequences'],
  'limits': ['derivatives', 'continuity', 'epsilon-delta proofs'],
  'algebra': ['calculus', 'linear algebra', 'functions'],
  'functions': ['recursion', 'closures', 'higher-order functions'],
  'variables': ['scope', 'closures', 'data types'],
  'loops': ['recursion', 'iterators', 'time complexity'],
  'arrays': ['linked lists', 'hash maps', 'sorting algorithms'],
  'recursion': ['dynamic programming', 'tree traversal', 'memoization'],
  'oop': ['design patterns', 'inheritance', 'composition'],
  'forces': ['momentum', 'energy conservation', 'torque'],
  'kinematics': ['dynamics', 'rotational motion', 'wave mechanics'],
  'probability': ['bayesian inference', 'statistics', 'distributions'],
  'genetics': ['molecular biology', 'protein synthesis', 'evolution'],
}

const HARD_TOPICS = new Set([
  'integration', 'differential equations', 'multivariable calculus', 'chain rule',
  'epsilon-delta proofs', 'closures', 'higher-order functions', 'dynamic programming',
  'tree traversal', 'bayesian inference', 'distributions', 'rotational motion',
  'protein synthesis',
])

/* ─── Default state ─── */
const DEFAULT = {
  // Personality metrics (all 0-100 except humorPreference)
  humorPreference:    5,
  frustrationScore:   30,
  competitiveness:    50,
  depth:              50,

  // Knowledge state
  masteredTopics:     [],
  struggleZones:      [],

  // Derived (re-computed on each update)
  traits:             [{ label: 'Exploring Territory', icon: '🗺️' }, { label: 'Curious Mind', icon: '🔍' }, { label: 'Determined', icon: '🔥' }],
  profileTitle:       'The Emerging Scholar',
  rank:               'Top 50%',
  currentVibe:        'Focused',
  orbPersonality:     'balanced',

  // Raw tracking
  totalExchanges:     0,
  avgResponseLength:  0,
  fastResponses:      0,
  longPauses:         0,
  recentModes:        [],       // last 10 critic modes

  // Learning style fingerprint
  learningStyle:      { analogical: 0, visual: 0, structural: 0, exampleFirst: 0, conceptual: 0 },
  learningStyleTotal: 0,
  learningStyleLocked: false,

  // Concept map for Memory Palace
  conceptMap:         [],  // [{ id, label, mastery, category, firstSeen, lastSeen, visits }]

  // Predictive struggle
  strugglePredictions: [],  // [{ concept, reason, confidence, id }]
}

/* ═══ STORE ══════════════════════════════════════════ */
export const useNeuralStore = create((set, get) => ({
  ...(load() || DEFAULT),

  /* ── Core updater ─────────────────────────────── */
  updateFromExchange: ({ userText, criticMode, understanding, responseTime }) => {
    set(state => {
      const textLen  = userText?.length || 0
      const total    = state.totalExchanges + 1
      const newAvg   = Math.round((state.avgResponseLength * (total - 1) + textLen) / total)

      // Fast / slow response tracking
      const fast     = responseTime < 6000  ? state.fastResponses + 1 : state.fastResponses
      const slow     = responseTime > 28000 ? state.longPauses + 1    : state.longPauses

      // Frustration — rises with repeated redirect/challenge, falls with hype
      const frustDelta = criticMode === 'redirect' ? 6 : criticMode === 'challenge' ? 3 : criticMode === 'hype' ? -4 : 0
      const newFrust   = Math.max(0, Math.min(100, state.frustrationScore + frustDelta))

      // Competitiveness — rises when they push back / challenge mode persists
      const compDelta  = criticMode === 'challenge' ? 2 : criticMode === 'hype' ? 1 : 0
      const newComp    = Math.min(100, state.competitiveness + compDelta)

      // Depth — rises with long thoughtful answers
      const depthDelta = textLen > 100 ? 2 : textLen < 30 ? -1 : 0
      const newDepth   = Math.max(0, Math.min(100, state.depth + depthDelta))

      // Recent modes (last 10)
      const recentModes = [...state.recentModes, criticMode].slice(-10)

      const updated = {
        ...state,
        totalExchanges:    total,
        avgResponseLength: newAvg,
        fastResponses:     fast,
        longPauses:        slow,
        frustrationScore:  newFrust,
        competitiveness:   newComp,
        depth:             newDepth,
        recentModes,
      }

      // Recompute derived fields
      updated.traits         = deriveTraits(updated)
      updated.profileTitle   = deriveTitle(updated)
      updated.rank           = deriveRank(updated)
      updated.currentVibe    = deriveVibe(recentModes)
      updated.orbPersonality = deriveOrbPersonality(updated)

      save(updated)
      return updated
    })
  },

  /* ── Knowledge state updates ──────────────────── */
  addMastered: (topic) => {
    if (!topic) return
    set(state => {
      const t = topic.toLowerCase().trim()
      if (state.masteredTopics.includes(t)) return state
      const updated = {
        ...state,
        masteredTopics: [...state.masteredTopics.slice(-9), t],
        struggleZones:  state.struggleZones.filter(z => z !== t),
      }
      updated.traits       = deriveTraits(updated)
      updated.profileTitle = deriveTitle(updated)
      updated.rank         = deriveRank(updated)
      save(updated)
      return updated
    })
  },

  addStruggle: (topic) => {
    if (!topic) return
    set(state => {
      const t = topic.toLowerCase().trim()
      if (state.struggleZones.includes(t) || state.masteredTopics.includes(t)) return state
      const updated = { ...state, struggleZones: [...state.struggleZones.slice(-7), t] }
      updated.traits = deriveTraits(updated)
      save(updated)
      return updated
    })
  },

  /* ── Humor signal (laugh / 'lol' in message) ─── */
  bumpHumor: () => set(state => {
    const updated = { ...state, humorPreference: Math.min(10, state.humorPreference + 0.5) }
    updated.traits = deriveTraits(updated)
    save(updated)
    return updated
  }),

  /* ── Vibe override (for immediate feedback) ─── */
  setVibe: (vibe) => set({ currentVibe: vibe }),

  /* ── Reset (keep knowledge, reset metrics) ─── */
  reset: () => {
    const fresh = { ...DEFAULT }
    save(fresh)
    set(fresh)
  },

  /* ── Build memory block for AI injection ──── */
  buildMemoryBlock: (userName) => {
    const s = get()
    if (s.totalExchanges < 2) return ''

    const STYLE_INSTRUCTIONS = {
      analogical:   'use analogies and comparisons for new concepts',
      visual:       'use spatial language, mental maps, visual metaphors',
      structural:   'front-load structure: numbered steps, clear sequence',
      exampleFirst: 'lead with a concrete example before the abstraction',
      conceptual:   "explain the 'why' mechanism before the 'what'",
    }

    let learningStyleLine = ''
    if (s.learningStyleLocked) {
      const dominant = Object.entries(s.learningStyle).sort((a, b) => b[1] - a[1])[0]?.[0] || 'conceptual'
      learningStyleLine = `\n- Learning style: ${dominant} — ${STYLE_INSTRUCTIONS[dominant]}`
    }

    return `
NEURAL MEMORY — What you know about ${userName}:
- Personality type: ${s.orbPersonality} | Humor preference: ${s.humorPreference}/10
- Competitiveness: ${s.competitiveness}/100 | Analytical depth: ${s.depth}/100
- Frustration level: ${s.frustrationScore}/100 — ${s.frustrationScore > 60 ? 'gets impatient fast, be efficient' : 'patient, can handle nuance'}
- Communication style: ${s.avgResponseLength < 45 ? 'very concise — mirror this, no lectures' : s.avgResponseLength > 100 ? 'elaborate — can handle depth' : 'balanced'}
- Mastered: ${s.masteredTopics.slice(-4).join(', ') || 'nothing confirmed yet'}
- Struggle zones: ${s.struggleZones.slice(-3).join(', ') || 'none identified'}
- Key traits: ${s.traits.map(t => t.label).join(', ')}
- Current vibe reading: ${s.currentVibe}${learningStyleLine}
Subtly adapt tone and examples to fit this profile. Do not mention the memory block.`
  },

  /* ── Learning style fingerprint ─────────── */
  bumpLearningStyle: (dimension) => {
    set(state => {
      if (state.learningStyleLocked) return state
      const newStyle = { ...state.learningStyle, [dimension]: (state.learningStyle[dimension] || 0) + 1 }
      const newTotal = state.learningStyleTotal + 1
      const shouldLock = newTotal >= 8

      // Normalize each dimension to 0-100 based on max value
      const maxVal = Math.max(...Object.values(newStyle), 1)
      const normalized = Object.fromEntries(
        Object.entries(newStyle).map(([k, v]) => [k, Math.round((v / maxVal) * 100)])
      )

      const updated = {
        ...state,
        learningStyle: newStyle,
        learningStyleTotal: newTotal,
        learningStyleLocked: shouldLock,
        // store raw values; normalization is computed on read
      }
      save(updated)
      return updated
    })
  },

  /* ── Concept map (Memory Palace) ────────── */
  touchConceptNode: (label, mastery) => {
    if (!label) return
    set(state => {
      const norm = label.toLowerCase().trim()
      const existing = state.conceptMap.find(c => c.label.toLowerCase() === norm)
      let newMap
      if (existing) {
        newMap = state.conceptMap.map(c =>
          c.label.toLowerCase() === norm
            ? { ...c, mastery, lastSeen: Date.now(), visits: c.visits + 1 }
            : c
        )
      } else {
        const node = { id: Date.now(), label: norm, mastery, category: 'general', firstSeen: Date.now(), lastSeen: Date.now(), visits: 1 }
        newMap = [...state.conceptMap, node]
      }
      // Keep max 40 concepts, trim oldest by firstSeen
      if (newMap.length > 40) {
        newMap = [...newMap].sort((a, b) => b.firstSeen - a.firstSeen).slice(0, 40)
      }
      const updated = { ...state, conceptMap: newMap }
      save(updated)
      return updated
    })
  },

  /* ── Struggle predictions ────────────────── */
  setPredictions: (preds) => {
    set(state => {
      const updated = { ...state, strugglePredictions: preds.slice(0, 2) }
      save(updated)
      return updated
    })
  },

  dismissPrediction: (id) => {
    set(state => {
      const updated = { ...state, strugglePredictions: state.strugglePredictions.filter(p => p.id !== id) }
      save(updated)
      return updated
    })
  },

  computePredictions: () => {
    const s = get()
    const recentMastered = s.masteredTopics.slice(-3)
    const predictions = []

    for (const topic of recentMastered) {
      const chain = CONCEPT_CHAINS[topic.toLowerCase()]
      if (!chain) continue
      for (const candidate of chain) {
        const alreadyMastered = s.masteredTopics.some(t => t.toLowerCase() === candidate.toLowerCase())
        if (alreadyMastered) continue
        if (predictions.some(p => p.concept === candidate)) continue

        const isStruggle = s.struggleZones.some(z => z.toLowerCase() === candidate.toLowerCase())
        const isHard = HARD_TOPICS.has(candidate.toLowerCase())
        const confidence = isStruggle ? 85 : isHard ? 60 : 45

        predictions.push({
          id: Date.now() + predictions.length,
          concept: candidate,
          reason: topic,
          confidence,
        })
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence)
    const top2 = predictions.slice(0, 2)

    set(state => {
      const updated = { ...state, strugglePredictions: top2 }
      save(updated)
      return updated
    })
  },
}))
