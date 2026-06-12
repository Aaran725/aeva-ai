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
   * entry: { summary, topics[], exchanges, mastered[], struggled[], keyMistake }
   */
  addMemory: ({ summary, topics = [], exchanges = 0, mastered = [], struggled = [], keyMistake = null }) => {
    if (!summary?.trim()) return
    const entry = {
      id: `mem_${Date.now()}`,
      date: new Date().toISOString(),
      summary: summary.trim(),
      topics,
      exchanges,
      mastered,
      struggled,
      keyMistake,
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
    const memories = get().memories.slice(0, 4)  // last 4 sessions
    if (!memories.length) return ''

    const lines = memories.map(m => {
      const date = new Date(m.date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
      let line = `  • ${date} (${m.exchanges} exchanges): ${m.summary}`
      if (m.mastered?.length)  line += `\n    ✓ Mastered: ${m.mastered.join(', ')}`
      if (m.struggled?.length) line += `\n    ✗ Struggled: ${m.struggled.join(', ')}`
      if (m.keyMistake)        line += `\n    ⚠ Key mistake: ${m.keyMistake}`
      return line
    }).join('\n')

    // Build specific cross-session behavioral directives from most recent session
    const recent = memories[0]
    const directives = []
    if (recent?.mastered?.length) {
      directives.push(`▸ Last session ${userName} mastered: ${recent.mastered.join(', ')} — treat these as established knowledge this session, no re-explaining.`)
    }
    if (recent?.struggled?.length) {
      directives.push(`▸ Last session ${userName} struggled with: ${recent.struggled.join(', ')} — if these topics resurface, try a completely different explanation angle than before.`)
    }
    if (recent?.keyMistake) {
      directives.push(`▸ Key mistake from last session: "${recent.keyMistake}" — watch for this pattern repeating. Address it proactively if the topic comes up.`)
    }
    const directiveBlock = directives.length > 0
      ? `\nACTION DIRECTIVES FROM LAST SESSION:\n${directives.join('\n')}\n`
      : ''

    return `
┌── CROSS-SESSION MEMORY — what ${userName} has worked on before ─────────────┐
${lines}
└─────────────────────────────────────────────────────────────────────────────┘
${directiveBlock}
HOW TO USE THIS: You are a tutor who was at every one of these sessions. You know ${userName}'s history. Never say "I remember" — just behave like someone who was there. Reference past work naturally: "last time you were getting the hang of X" or "you struggled with Y before — let's try this angle instead." Build on mastered topics without re-teaching them. Go deeper on struggle zones with a fresh approach.

`
  },

  /**
   * Save a quick summary without an AI call — built from session tracking data.
   * Used as a fallback for sessions that end before the AI summariser fires.
   * Deduplicates: won't add a second entry for the same calendar day.
   */
  saveQuickMemory: ({ sessionConcepts, exchanges }) => {
    if (exchanges < 2) return
    const topics = Object.keys(sessionConcepts)
    if (topics.length === 0) return

    // Don't overwrite an AI-generated summary from the same day
    const today = new Date().toDateString()
    const alreadyToday = get().memories.some(m => new Date(m.date).toDateString() === today)
    if (alreadyToday) return

    const mastered  = topics.filter(t => ['mastery', 'solid'].includes(sessionConcepts[t]))
    const struggled = topics.filter(t => sessionConcepts[t] === 'none')
    const partial   = topics.filter(t => sessionConcepts[t] === 'partial')

    const parts = []
    if (mastered.length)  parts.push(`understood ${mastered.join(', ')}`)
    if (partial.length)   parts.push(`partially covered ${partial.join(', ')}`)
    if (struggled.length) parts.push(`struggled with ${struggled.join(', ')}`)

    const summary = parts.length > 0
      ? `${exchanges}-exchange session: ${parts.join('; ')}.`
      : `${exchanges}-exchange session on ${topics.join(', ')}.`

    get().addMemory({ summary, topics, exchanges })
  },

  clearMemories: () => {
    persist([])
    set({ memories: [] })
  },
}))
