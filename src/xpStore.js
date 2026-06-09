import { create } from 'zustand'
import { scheduleSave } from './syncService'

const KEY = 'aeva_xp_v1'
function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
  scheduleSave('xp_state', s)
}

/* ── Orb definitions ──────────────────────────────── */
export const ORBS = [
  {
    id: 'balanced',
    name: 'Balanced',
    emoji: '🔵',
    tagline: 'Warm, adaptive, encouraging.',
    requiredLevel: 0,
    glow: 'rgba(99,102,241,0.65)',
    accent: [233, 163, 100],
    gradient: 'linear-gradient(122deg,#040622 0%,#090b38 7%,#141870 16%,#2D308E 27%,#4545aa 38%,#6a6ac0 48%,#9898d2 56%,#c0c6e8 63%,#dde2f6 68%,#eeeaf4 72%,#f4ede0 76%,#f0d4a0 80%,#E9A364 84%,#d08038 88%,#964e20 93%,#501808 97%,#1a0806 100%)',
    personality: null,
  },
  {
    id: 'challenger',
    name: 'Challenger',
    emoji: '🔴',
    tagline: 'Direct, demanding, zero hand-holding.',
    requiredLevel: 3,
    glow: 'rgba(239,68,68,0.65)',
    accent: [239, 68, 68],
    gradient: 'linear-gradient(122deg,#1a0202 0%,#380606 7%,#700a0a 16%,#8E2D2D 27%,#aa4545 38%,#c06a6a 48%,#d29898 56%,#e8c0c0 63%,#f6dede 68%,#f4eeee 72%,#f8eded 76%,#f0b0b0 80%,#E96464 84%,#d03030 88%,#961010 93%,#500808 97%,#1a0606 100%)',
    personality: 'CHALLENGER MODE: Be direct and demanding. Push back on vague answers without mercy. No encouragement unless truly earned. Call out shallow thinking immediately. Keep responses short and surgical. Make the student work for every insight.',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    emoji: '🟡',
    tagline: 'Precise, thorough, formally structured.',
    requiredLevel: 6,
    glow: 'rgba(56,189,248,0.65)',
    accent: [56, 189, 248],
    gradient: 'linear-gradient(122deg,#020416 0%,#050e38 7%,#0a2070 16%,#1D3E8E 27%,#2D60AA 38%,#4585c0 48%,#72aad2 56%,#a0cce8 63%,#c4e4f6 68%,#e0eef4 72%,#e8f4fc 76%,#b8daf0 80%,#64B4E9 84%,#3890d0 88%,#1464A0 93%,#083450 97%,#021a2a 100%)',
    personality: 'SCHOLAR MODE: Be thorough and precise. Cite your reasoning at each step. Use proper academic terminology. Structure explanations with clear numbered steps. Prioritize depth and accuracy. Correct imprecise language gently but firmly.',
  },
  {
    id: 'mystic',
    name: 'Mystic',
    emoji: '🟣',
    tagline: 'Everything through metaphor and analogy.',
    requiredLevel: 10,
    glow: 'rgba(217,70,239,0.65)',
    accent: [217, 70, 239],
    gradient: 'linear-gradient(122deg,#120422 0%,#280838 7%,#4a0870 16%,#6B2D8E 27%,#8A45aa 38%,#a868c0 48%,#c298d2 56%,#d8c0e8 63%,#eaddf6 68%,#f2eaf8 72%,#f4e8fc 76%,#e8c0f4 80%,#D464F0 84%,#b030d8 88%,#801496 93%,#400850 97%,#1a061a 100%)',
    personality: 'MYSTIC MODE: Explain everything through metaphor and vivid analogy — never define directly first. Speak in images and comparisons. Make abstract ideas feel tangible. Find unexpected parallels. Be poetic but clear. The student should feel they discovered something, not that they were taught.',
  },
  {
    id: 'void',
    name: 'Void',
    emoji: '⚫',
    tagline: 'Pure Socratic. Cold. Minimal. Relentless.',
    requiredLevel: 15,
    glow: 'rgba(100,116,139,0.55)',
    accent: [100, 116, 139],
    gradient: 'linear-gradient(122deg,#000002 0%,#02020a 7%,#050510 16%,#080818 27%,#0e0e28 38%,#181838 48%,#222248 56%,#2c2c60 63%,#383878 68%,#2c2c60 72%,#202048 76%,#141430 80%,#0a0a1a 84%,#060610 88%,#040408 93%,#020204 97%,#000002 100%)',
    personality: 'VOID MODE: Maximum minimalism. Never state any fact or answer. Only ask precise questions. 1-2 sentences maximum per response. Cold and efficient — no warmth, no filler. Every word must earn its place. Make silence feel intentional.',
  },
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔶',
    tagline: 'Passionate, energetic, infectious enthusiasm.',
    requiredLevel: 20,
    glow: 'rgba(245,158,11,0.65)',
    accent: [245, 158, 11],
    gradient: 'linear-gradient(122deg,#1a0800 0%,#381400 7%,#703000 16%,#8E4A00 27%,#aa6800 38%,#c08000 48%,#d2a000 56%,#e8c040 63%,#f6d870 68%,#faf0a0 72%,#fef8c0 76%,#f8e060 80%,#F0A800 84%,#d07800 88%,#965000 93%,#502000 97%,#1a0a00 100%)',
    personality: 'EMBER MODE: Bring genuine passion and energy to every concept. Show excitement about ideas. Use vivid, energetic language. Make the student feel the joy of understanding. Celebrate breakthroughs. Learning should feel like an adventure, not a chore.',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '🟢',
    tagline: 'Creative connections across domains.',
    requiredLevel: 28,
    glow: 'rgba(16,185,129,0.65)',
    accent: [16, 185, 129],
    gradient: 'linear-gradient(122deg,#021a0a 0%,#053820 7%,#087040 16%,#0E8E5A 27%,#18a870 38%,#28c088 48%,#50d2a8 56%,#84e8cc 63%,#aaf6e4 68%,#ccf4f0 72%,#e0faf8 76%,#a8f0e0 80%,#48E9C0 84%,#18d090 88%,#089660 93%,#025030 97%,#011a10 100%)',
    personality: 'AURORA MODE: Find unexpected connections between this topic and other fields. Encourage lateral thinking. Help the student see patterns across domains. Make concepts feel part of a vast, beautiful web. Reward curiosity about the edges of a topic.',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    emoji: '⚪',
    tagline: 'Mysterious. Hints only. Let them piece it together.',
    requiredLevel: 38,
    glow: 'rgba(148,163,184,0.55)',
    accent: [148, 163, 184],
    gradient: 'linear-gradient(122deg,#0a0a14 0%,#14141e 7%,#1e2028 16%,#2a2c3c 27%,#383c52 38%,#4a5068 48%,#6a7090 56%,#8a90b0 63%,#b0b8d0 68%,#d0d4e4 72%,#e8ecf8 76%,#f4f6ff 80%,#e0e4f4 84%,#b8c0d8 88%,#7888a0 93%,#404858 97%,#1a1e28 100%)',
    personality: 'PHANTOM MODE: Speak in fragments and half-thoughts. Drop hints, never complete explanations. Ask questions that point toward something without revealing what. Let the student piece together meaning from incomplete signals. Be deliberately indirect — not confusing, but tantalising.',
  },
]

export const XP_EVENTS = {
  DAILY_LOGIN:    { amount: 30,  label: 'Daily Login' },
  DRILL_COMPLETE: { amount: 40,  label: 'Drill Complete' },
  TOPIC_MASTERED: { amount: 75,  label: 'Topic Mastered' },
  SOCRATIC_5:     { amount: 55,  label: 'Socratic Session' },
  STREAK_7:       { amount: 120, label: '7-Day Streak!' },
  STREAK_30:      { amount: 300, label: '30-Day Streak!' },
  AEVA_BONUS:     { amount: 50,  label: 'Aeva Bonus' },
}

export function xpForLevel(level) {
  return level * 100
}

export function levelFromXP(xp) {
  return Math.floor(xp / 100)
}

export function xpIntoLevel(xp) {
  return xp % 100
}

/* ── Store ────────────────────────────────────────── */
const DEFAULT = {
  xp: 0,
  streak: 0,
  lastLoginDate: null,
  unlockedOrbs: ['balanced'],
  activeOrb: 'balanced',
  pendingToast: null,   // { amount, label, newOrb? }
}

export const useXPStore = create((set, get) => {
  const stored = load()
  return {
    ...DEFAULT,
    ...(stored || {}),

    addXP: (eventKey) => {
      const event = XP_EVENTS[eventKey]
      if (!event) return
      set(state => {
        const newXP = state.xp + event.amount
        const newLevel = levelFromXP(newXP)
        const prevLevel = levelFromXP(state.xp)

        // Check for new orb unlocks
        const newUnlocks = ORBS.filter(
          o => o.requiredLevel <= newLevel && o.requiredLevel > prevLevel && !state.unlockedOrbs.includes(o.id)
        )
        const newUnlockedIds = newUnlocks.map(o => o.id)

        const updated = {
          ...state,
          xp: newXP,
          unlockedOrbs: [...state.unlockedOrbs, ...newUnlockedIds],
          pendingToast: {
            amount: event.amount,
            label: event.label,
            newOrb: newUnlocks[0] || null,
            id: Date.now(),
            size: eventKey === 'TOPIC_MASTERED' ? 'big' : 'normal',
          },
        }
        save(updated)
        return updated
      })
    },

    // Aeva can award custom XP amounts with a custom label
    addDirectXP: (amount, label = 'Aeva Bonus') => {
      const safeAmount = Math.min(200, Math.max(10, Math.round(amount || 50)))
      set(state => {
        const newXP = state.xp + safeAmount
        const newLevel = levelFromXP(newXP)
        const prevLevel = levelFromXP(state.xp)
        const newUnlocks = ORBS.filter(
          o => o.requiredLevel <= newLevel && o.requiredLevel > prevLevel && !state.unlockedOrbs.includes(o.id)
        )
        const newUnlockedIds = newUnlocks.map(o => o.id)
        const updated = {
          ...state,
          xp: newXP,
          unlockedOrbs: [...state.unlockedOrbs, ...newUnlockedIds],
          pendingToast: {
            amount: safeAmount,
            label,
            newOrb: newUnlocks[0] || null,
            id: Date.now(),
          },
        }
        save(updated)
        return updated
      })
    },

    checkStreak: () => {
      const today = new Date().toDateString()
      const state = get()
      if (state.lastLoginDate === today) return  // already checked today

      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const newStreak = state.lastLoginDate === yesterday ? state.streak + 1 : 1

      set(s => {
        const updated = { ...s, streak: newStreak, lastLoginDate: today }
        save(updated)
        return updated
      })

      get().addXP('DAILY_LOGIN')
      if (newStreak === 7)  get().addXP('STREAK_7')
      if (newStreak === 30) get().addXP('STREAK_30')
    },

    setActiveOrb: (orbId) => {
      set(state => {
        if (!state.unlockedOrbs.includes(orbId)) return state
        const updated = { ...state, activeOrb: orbId }
        save(updated)
        return updated
      })
    },

    // Unlock an orb directly (used during onboarding to honour the user's choice)
    unlockOrb: (orbId) => {
      set(state => {
        if (state.unlockedOrbs.includes(orbId)) return state
        const updated = { ...state, unlockedOrbs: [...state.unlockedOrbs, orbId], activeOrb: orbId }
        save(updated)
        return updated
      })
    },

    clearToast: () => set({ pendingToast: null }),
  }
})
