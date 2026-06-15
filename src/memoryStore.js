/**
 * Aeva Cross-Session Memory
 * Stores lightweight summaries of past tutoring sessions so Aeva can
 * reference prior progress, pick up where they left off, and notice patterns.
 *
 * Summaries are AI-generated (background Groq call every 6 exchanges + session end).
 * Max 8 sessions kept — by recency, no per-day deduplication.
 * Injected into the system prompt as a recall block.
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
   * entry: { summary, topics[], exchanges, mastered[], struggled[], keyMistake, confusions[] }
   */
  addMemory: ({ summary, topics = [], exchanges = 0, mastered = [], struggled = [], keyMistake = null, confusions = [] }) => {
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
      confusions,   // specific wrong beliefs e.g. "thought -b/2a gives the y-coordinate"
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
      if (m.mastered?.length)    line += `\n    ✓ Mastered: ${m.mastered.join(', ')}`
      if (m.struggled?.length)   line += `\n    ✗ Struggled: ${m.struggled.join(', ')}`
      if (m.confusions?.length)  line += `\n    🔴 Specific confusions: ${m.confusions.join(' | ')}`
      if (m.keyMistake)          line += `\n    ⚠ Key mistake: ${m.keyMistake}`
      return line
    }).join('\n')

    // Build specific cross-session behavioural directives from most recent session
    const recent = memories[0]
    const directives = []

    if (recent?.mastered?.length) {
      directives.push(`▸ Last session ${userName} mastered: ${recent.mastered.join(', ')} — treat as established knowledge this session. Do not re-explain unless they're clearly confused.`)
    }
    if (recent?.struggled?.length) {
      directives.push(`▸ Last session ${userName} struggled with: ${recent.struggled.join(', ')} — if any resurface, try a completely different angle: new analogy, different entry point, or drop to a more fundamental concept first.`)
    }
    // Specific confusion directives — highest priority, most actionable
    if (recent?.confusions?.length) {
      recent.confusions.slice(0, 3).forEach(confusion => {
        directives.push(`▸ WATCH FOR: "${confusion}" — if the related topic comes up, proactively surface and correct this exact misunderstanding before it recurs.`)
      })
    }
    if (recent?.keyMistake && !recent?.confusions?.length) {
      directives.push(`▸ Pattern to watch: "${recent.keyMistake}" — address proactively if the topic arises again.`)
    }

    const directiveBlock = directives.length > 0
      ? `\nACTION DIRECTIVES FROM LAST SESSION:\n${directives.join('\n')}\n`
      : ''

    return `
┌── CROSS-SESSION MEMORY — what ${userName} has worked on before ─────────────┐
${lines}
└─────────────────────────────────────────────────────────────────────────────┘
${directiveBlock}
HOW TO USE THIS: You are a tutor who was at every one of these sessions. You know ${userName}'s history. Never say "I remember" — just behave like someone who was there. Reference past work naturally: "last time you were getting the hang of X" or "you struggled with Y before — let's try a different angle." Build on mastered topics without re-teaching them. Act on the WATCH FOR directives — they describe specific wrong mental models that keep recurring.

`
  },

  /**
   * Save a quick summary without an AI call — built from session tracking data.
   * Fallback for sessions that end before the AI summariser fires.
   * No per-day deduplication — keeps last MAX sessions by recency.
   */
  saveQuickMemory: ({ sessionConcepts, exchanges }) => {
    if (exchanges < 2) return
    const topics = Object.keys(sessionConcepts)
    if (topics.length === 0) return

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
