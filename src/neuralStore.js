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
    return `
NEURAL MEMORY — What you know about ${userName}:
- Personality type: ${s.orbPersonality} | Humor preference: ${s.humorPreference}/10
- Competitiveness: ${s.competitiveness}/100 | Analytical depth: ${s.depth}/100
- Frustration level: ${s.frustrationScore}/100 — ${s.frustrationScore > 60 ? 'gets impatient fast, be efficient' : 'patient, can handle nuance'}
- Communication style: ${s.avgResponseLength < 45 ? 'very concise — mirror this, no lectures' : s.avgResponseLength > 100 ? 'elaborate — can handle depth' : 'balanced'}
- Mastered: ${s.masteredTopics.slice(-4).join(', ') || 'nothing confirmed yet'}
- Struggle zones: ${s.struggleZones.slice(-3).join(', ') || 'none identified'}
- Key traits: ${s.traits.map(t => t.label).join(', ')}
- Current vibe reading: ${s.currentVibe}
Subtly adapt tone and examples to fit this profile. Do not mention the memory block.`
  },
}))
