/**
 * Spaced Repetition Store — SM-2 simplified
 * Cards from Flashcard drills are saved here and resurface on schedule.
 */
import { create } from 'zustand'
import { scheduleSave } from './syncService'

const SR_KEY = 'aeva_sr_v1'
const DAY = 24 * 60 * 60 * 1000

function loadCards() {
  try { return JSON.parse(localStorage.getItem(SR_KEY) || '[]') } catch { return [] }
}
function saveCards(cards) {
  try { localStorage.setItem(SR_KEY, JSON.stringify(cards)) } catch {}
  scheduleSave('sr_cards', cards)
}

// Stable deterministic ID so the same card is always the same row
export function makeCardId(topic, front) {
  const s = `${topic}::${front}`.toLowerCase().replace(/\s+/g, ' ').trim()
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return `sr_${(h >>> 0).toString(36)}`
}

export const useSRStore = create((set, get) => ({
  cards: loadCards(),

  /**
   * Record a card result after a Flashcard or Review drill.
   * result: 'got' | 'missed'
   * Applies SM-2: correct answers increase interval, wrong reset to 1 day.
   */
  recordCard: (topic, front, back, result) => {
    const id = makeCardId(topic, front)
    set(state => {
      const now = Date.now()
      const ex = state.cards.find(c => c.id === id)

      let interval, easeFactor, streak

      if (result === 'missed') {
        interval    = 1
        easeFactor  = Math.max(1.3, (ex?.easeFactor ?? 2.5) - 0.2)
        streak      = 0
      } else {
        // SM-2: new_interval = old_interval × ease_factor
        const ef       = Math.min(3.0, (ex?.easeFactor ?? 2.5) + 0.1)
        const prev     = ex?.interval ?? 1
        interval       = ex ? Math.min(90, Math.round(prev * ef)) : 3
        easeFactor     = ef
        streak         = (ex?.streak ?? 0) + 1
      }

      const card = {
        id,
        topic,
        front,
        back,
        interval,
        easeFactor,
        streak,
        dueDate:   now + interval * DAY,
        firstSeen: ex?.firstSeen ?? now,
        lastSeen:  now,
      }

      const cards = ex
        ? state.cards.map(c => c.id === id ? card : c)
        : [...state.cards, card]

      saveCards(cards)
      return { cards }
    })
  },

  /** Cards past their due date, oldest first */
  getDueCards: () => {
    const now = Date.now()
    return get().cards
      .filter(c => c.dueDate <= now)
      .sort((a, b) => a.dueDate - b.dueDate)
  },

  getDueCount: () => {
    const now = Date.now()
    return get().cards.filter(c => c.dueDate <= now).length
  },

  getTotalCards: () => get().cards.length,

  /** Cards due within `days` days (excludes already due) */
  getUpcomingCount: (days = 7) => {
    const now    = Date.now()
    const cutoff = now + days * DAY
    return get().cards.filter(c => c.dueDate > now && c.dueDate <= cutoff).length
  },

  /** Per-topic stats for display */
  getTopicStats: () => {
    const map = {}
    get().cards.forEach(c => {
      if (!map[c.topic]) map[c.topic] = { topic: c.topic, total: 0, avgStreak: 0 }
      map[c.topic].total++
      map[c.topic].avgStreak += c.streak ?? 0
    })
    return Object.values(map).map(s => ({ ...s, avgStreak: Math.round(s.avgStreak / s.total) }))
  },

  removeCard: (id) => {
    set(state => {
      const cards = state.cards.filter(c => c.id !== id)
      saveCards(cards)
      return { cards }
    })
  },

  clearAll: () => {
    saveCards([])
    set({ cards: [] })
  },
}))
