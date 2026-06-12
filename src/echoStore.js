import { create } from 'zustand'

const KEY = 'aeva_echoes_v1'
function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }

/* ── Trust Tier definitions ───────────────────────────────────────── */
export const TRUST_TIERS = [
  {
    id: 'stranger',
    label: 'Stranger',
    emoji: '👤',
    color: '#94A3B8',
    glow: 'rgba(148,163,184,0.20)',
    border: 'rgba(148,163,184,0.28)',
    desc: 'Aeva is still figuring you out.',
    subDesc: 'Show up. Ask questions. Build the habit.',
    minScore: 0,
    promptInstruction: (name) =>
      `TRUST TIER — STRANGER: You are still getting to know ${name}. Be warm and patient. Scaffold everything — assume they need full explanations and step-by-step reasoning. Ask frequent comprehension checks. Do not push hard yet. Your goal is to make them feel comfortable and capable.`,
  },
  {
    id: 'student',
    label: 'Student',
    emoji: '📚',
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.18)',
    border: 'rgba(96,165,250,0.30)',
    desc: 'Aeva has started to trust your effort.',
    subDesc: 'You show up consistently. Aeva is paying attention.',
    minScore: 12,
    promptInstruction: (name) =>
      `TRUST TIER — STUDENT: You know ${name} reasonably well. You've seen their patterns. Push back when answers are vague. Reduce hand-holding on topics they've shown understanding of. Reference what they've done before when relevant ("you got this concept last week"). Hold them to a higher standard than a stranger.`,
  },
  {
    id: 'trusted',
    label: 'Trusted',
    emoji: '🔮',
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.18)',
    border: 'rgba(167,139,250,0.32)',
    desc: 'Aeva speaks to you differently now.',
    subDesc: 'You\'ve earned directness. Aeva won\'t sugarcoat.',
    minScore: 40,
    promptInstruction: (name) =>
      `TRUST TIER — TRUSTED: ${name} has earned your trust through consistent effort. Drop the scaffolding significantly — they can handle density and directness. Challenge them proactively without being asked. Reference shared history naturally ("you struggled with this before — notice the same pattern?"). Be candid, less diplomatic. If their answer is shallow, name it plainly.`,
  },
  {
    id: 'partner',
    label: 'Partner',
    emoji: '🤝',
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.16)',
    border: 'rgba(74,222,128,0.28)',
    desc: 'You and Aeva think together.',
    subDesc: 'No scaffolding. No softening. Pure collaboration.',
    minScore: 90,
    promptInstruction: (name) =>
      `TRUST TIER — PARTNER: ${name} is your intellectual partner. Speak as a peer — no scaffolding, no hand-holding, zero diplomatic softening. Reference the full arc of your work together. Challenge their assumptions hard — they can take it. You've earned the right to be completely blunt. Treat them like a fellow expert who happens to be still learning.`,
  },
]

export function getTrustTier(totalExchanges = 0, masteredCount = 0, streak = 0) {
  const score = totalExchanges + masteredCount * 6 + Math.min(streak, 14) * 2
  let tier = TRUST_TIERS[0]
  for (const t of TRUST_TIERS) {
    if (score >= t.minScore) tier = t
  }
  return tier
}

export function getTrustProgress(totalExchanges = 0, masteredCount = 0, streak = 0) {
  const score = totalExchanges + masteredCount * 6 + Math.min(streak, 14) * 2
  const idx = TRUST_TIERS.findIndex(t => score < t.minScore)
  if (idx === -1) return { pct: 100, next: null } // max tier
  const current = TRUST_TIERS[idx - 1] || TRUST_TIERS[0]
  const next = TRUST_TIERS[idx]
  const pct = Math.round(((score - current.minScore) / (next.minScore - current.minScore)) * 100)
  return { pct: Math.max(0, Math.min(99, pct)), next }
}

/* ── Store ───────────────────────────────────────────────────────── */
const DEFAULT = {
  echoes: [],          // [{ id, date, topic, moment, tier }]
  pendingEchoToast: null,
}

export const useEchoStore = create((set) => {
  const stored = load()
  return {
    ...DEFAULT,
    ...(stored || {}),

    addEcho: (echo) => {
      const newEcho = {
        id: Date.now(),
        date: new Date().toISOString(),
        ...echo,
      }
      set(state => {
        const updated = {
          ...state,
          echoes: [newEcho, ...state.echoes].slice(0, 60),
          pendingEchoToast: newEcho,
        }
        save({ echoes: updated.echoes })
        return updated
      })
    },

    clearEchoToast: () => set({ pendingEchoToast: null }),

    clearEchoes: () => {
      const updated = { echoes: [] }
      save(updated)
      set({ ...updated, pendingEchoToast: null })
    },
  }
})
