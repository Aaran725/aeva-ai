/**
 * Aeva Cross-Session Memory
 * Stores lightweight summaries of past tutoring sessions so Aeva can
 * reference prior progress, pick up where they left off, and notice patterns.
 *
 * Summaries are AI-generated (background Groq call every 6 exchanges).
 * Max 8 sessions kept. Injected into the system prompt as a recall block.
 */
import { create } from 'zustand'

const KEY = 'aeva_session_memory_v1'
const MAX = 8

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function persist(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export const useMemoryStore = create((set, get) => ({
  memories: load(),

  /**
   * Add a session memory entry.
   * entry: { summary: string, topics: string[], exchanges: number }
   */
  addMemory: ({ summary, topics = [], exchanges = 0 }) => {
    if (!summary?.trim()) return
    const entry = {
      id: `mem_${Date.now()}`,
      date: new Date().toISOString(),
      summary: summary.trim(),
      topics,
      exchanges,
    }
    set(state => {
      const memories = [entry, ...state.memories].slice(0, MAX)
      persist(memories)
      return { memories }
    })
  },

  /**
   * Generate a "what we covered before" block to inject into Aeva's system prompt.
   * Returns empty string if no memories exist yet.
   */
  buildRecallBlock: (userName) => {
    const memories = get().memories.slice(0, 3)  // only last 3 sessions
    if (!memories.length) return ''

    const lines = memories.map(m => {
      const date = new Date(m.date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
      return `  • ${date}: ${m.summary}`
    }).join('\n')

    return `
┌── CROSS-SESSION MEMORY — ${userName}'s previous sessions ──────────────────┐
${lines}
└── Apply this context naturally. Never say "I remember" or announce the memory.
    Just use it — notice patterns, continue threads, reference past progress. ──┘

`
  },

  clearMemories: () => {
    persist([])
    set({ memories: [] })
  },
}))
