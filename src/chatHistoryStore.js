/**
 * chatHistoryStore — persists chat sessions to localStorage.
 *
 * Each session:
 *   id           string   — unique id
 *   title        string   — auto-detected topic or "Session · date"
 *   subject      string   — first academic topic the critic detected
 *   startedAt    number   — ms timestamp
 *   endedAt      number   — ms timestamp (updated on save)
 *   exchangeCount number  — number of user↔Aeva turns
 *   finalState   string   — DIAGNOSTIC | SCAFFOLDING | STRESS_TEST | CONSOLIDATION
 *   messages     array    — [{ role, text }] — streaming flag stripped on save
 *
 * Limits:
 *   MAX_SESSIONS 50  — oldest trimmed first
 *   MAX_BYTES    2MB — safety cap before trimming
 */

const KEY          = 'aeva_chat_history_v1'
const MAX_SESSIONS = 50
const MAX_BYTES    = 2 * 1024 * 1024   // 2 MB

/* ── Persistence helpers ─────────────────────────────────────────────────── */
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

function persist(sessions) {
  try {
    let data = sessions.slice(0, MAX_SESSIONS)
    let raw  = JSON.stringify(data)

    // If still over budget, drop oldest one-by-one until it fits
    while (raw.length > MAX_BYTES && data.length > 1) {
      data = data.slice(0, data.length - 1)
      raw  = JSON.stringify(data)
    }

    localStorage.setItem(KEY, raw)
  } catch { /* quota exceeded — silently swallow */ }
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Save (or update) a session. If a session with this id already exists
 * it is replaced in-place; otherwise it is prepended (newest first).
 */
export function saveSession(session) {
  if (!session?.id || !session?.messages?.length) return

  // Strip the streaming flag — no point storing a half-rendered message
  const messages = session.messages
    .filter(m => m.text && m.text.trim())
    .map(({ role, text }) => ({ role, text }))

  if (messages.length < 2) return   // need at least one exchange

  const entry = {
    id:            session.id,
    title:         session.title  || titleFromMessages(messages, session.subject),
    subject:       session.subject || null,
    startedAt:     session.startedAt || Date.now(),
    endedAt:       Date.now(),
    exchangeCount: session.exchangeCount || Math.floor(messages.filter(m => m.role === 'user').length),
    finalState:    session.finalState || 'DIAGNOSTIC',
    messages,
  }

  const existing = load()
  const idx      = existing.findIndex(s => s.id === entry.id)

  const updated = idx >= 0
    ? [entry, ...existing.filter((_, i) => i !== idx)]  // replace + bubble to top
    : [entry, ...existing]                               // new session prepended

  persist(updated)
}

/** Load all saved sessions (newest first). */
export function loadSessions() {
  return load()
}

/** Delete a single session by id. */
export function deleteSession(id) {
  persist(load().filter(s => s.id !== id))
}

/** Clear all history. */
export function clearAllHistory() {
  try { localStorage.removeItem(KEY) } catch {}
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Generate a human-readable title from the first few messages. */
function titleFromMessages(messages, subject) {
  if (subject && subject !== 'general') {
    // Capitalise first letter
    return subject.charAt(0).toUpperCase() + subject.slice(1)
  }
  // Fall back to first user message, truncated
  const first = messages.find(m => m.role === 'user')?.text || ''
  return first.slice(0, 48) || 'Session'
}

/** Format a timestamp as a human-friendly string. */
export function formatSessionDate(ts) {
  if (!ts) return ''
  const d   = new Date(ts)
  const now = new Date()
  const diffMs   = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 2)  return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

/** Group sessions into Today / This week / Older buckets. */
export function groupSessions(sessions) {
  const now      = Date.now()
  const todayMs  = 24 * 60 * 60 * 1000
  const weekMs   = 7  * todayMs

  const today    = sessions.filter(s => now - s.endedAt < todayMs)
  const thisWeek = sessions.filter(s => now - s.endedAt >= todayMs  && now - s.endedAt < weekMs)
  const older    = sessions.filter(s => now - s.endedAt >= weekMs)

  return { today, thisWeek, older }
}
