/**
 * Aeva Library — persists Lens, Drill, and Lock-In sessions to localStorage.
 */
import { create } from 'zustand'

const KEY = 'aeva_library_v1'
const MAX = 200

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function persist(sessions) {
  try { localStorage.setItem(KEY, JSON.stringify(sessions)) } catch {}
}

function groupByDate(sessions) {
  const now = Date.now()
  const DAY = 86_400_000
  const groups = { today: [], yesterday: [], thisWeek: [], older: [] }
  sessions.forEach(s => {
    const age = now - s.savedAt
    if (age < DAY)           groups.today.push(s)
    else if (age < 2 * DAY)  groups.yesterday.push(s)
    else if (age < 7 * DAY)  groups.thisWeek.push(s)
    else                     groups.older.push(s)
  })
  return groups
}

export const useLibraryStore = create((set, get) => ({
  sessions: load(),

  /**
   * Save a session. Returns the generated id.
   * session shape:
   *   type:        'lens' | 'drill' | 'lockin'
   *   topic:       string
   *   coreInsight: string
   *   pattern:     string | null      — from syntaxCard.pattern
   *   variables:   []
   *   steps:       []
   *   imageData:   string | null      — base64 cropped preview (lens)
   *   rawText:     string | null      — pasted text (drill)
   *   analysis:    object | null      — full JSON blob for re-open
   *   focusScore:  number | null      — 0-100 (lockin)
   *   focusDuration: number | null    — seconds (lockin)
   *   conceptCount: number | null     — (lockin)
   */
  saveSession: (session) => {
    const id = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const entry = { ...session, id, savedAt: Date.now() }
    set(state => {
      const sessions = [entry, ...state.sessions].slice(0, MAX)
      persist(sessions)
      return { sessions }
    })
    return id
  },

  deleteSession: (id) => {
    set(state => {
      const sessions = state.sessions.filter(s => s.id !== id)
      persist(sessions)
      return { sessions }
    })
  },

  getSession: (id) => get().sessions.find(s => s.id === id),

  getGrouped: () => groupByDate(get().sessions),

  clearAll: () => {
    persist([])
    set({ sessions: [] })
  },
}))
