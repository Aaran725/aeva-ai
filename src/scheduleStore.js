/**
 * scheduleStore — generates and persists a day-by-day revision schedule
 * from all active roadmaps.
 *
 * Algorithm:
 *   For each roadmap with a future exam date and remaining nodes, calculate
 *   urgency (nodes ÷ days left). Each day, allocate up to MAX_NODES_PER_DAY
 *   slots in urgency order. Exam days themselves are left empty.
 */
import { create } from 'zustand'

const KEY = 'aeva_schedule_v1'
const MAX_NODES_PER_DAY = 3

export const SUBJECT_COLORS = [
  '#818CF8', // indigo
  '#34D399', // emerald
  '#F472B6', // pink
  '#60A5FA', // blue
  '#FB923C', // orange
  '#A78BFA', // violet
  '#FBBF24', // amber
  '#F87171', // rose
]

/* ── Date helpers ──────────────────────────────────────────────────────────── */
export function dateKey(d) {
  // Returns 'YYYY-MM-DD' in local time
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayKey() { return dateKey(new Date()) }

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/* ── Core algorithm ────────────────────────────────────────────────────────── */
function buildSchedule(roadmaps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Only roadmaps with a future exam date and remaining nodes
  const active = roadmaps
    .filter(r => {
      if (!r.examDate || !r.nodes?.length) return false
      const exam = new Date(r.examDate)
      exam.setHours(0, 0, 0, 0)
      return exam >= today && r.nodes.some(n => n.status !== 'complete' && n.status !== 'skipped')
    })
    .map((r, i) => ({
      id:       r.id,
      title:    r.title,
      examDate: r.examDate,
      color:    SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      remaining: r.nodes
        .filter(n => n.status !== 'complete' && n.status !== 'skipped')
        .map(n => ({ ...n })),
      daysLeft: Math.max(1, Math.ceil((new Date(r.examDate) - today) / 86400000)),
    }))
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))

  if (!active.length) return {}

  const queues = active.map(r => ({
    ...r,
    queue:   [...r.remaining],
    urgency: r.remaining.length / r.daysLeft,
  }))

  const examDateSet = new Set(active.map(r => dateKey(r.examDate)))
  const lastExam    = new Date(Math.max(...active.map(r => new Date(r.examDate))))

  const schedule = {}
  let day = new Date(today)

  while (day <= lastExam) {
    const key = dateKey(day)

    if (!examDateSet.has(key)) {
      const slots = []
      let slotsLeft = MAX_NODES_PER_DAY

      // Sort by urgency each day so the most at-risk subject gets the first slot
      const available = queues
        .filter(q => q.queue.length > 0 && dateKey(new Date(q.examDate)) > key)
        .sort((a, b) => b.urgency - a.urgency)

      for (const q of available) {
        if (slotsLeft <= 0) break
        const node = q.queue.shift()
        const mins = node.estimatedMinutes ||
          (node.type === 'mock' ? 60 : node.type === 'learn' ? 20 : 12)

        slots.push({
          roadmapId:        q.id,
          nodeId:           node.id,
          topic:            node.topic,
          subject:          q.title,
          type:             node.type,
          estimatedMinutes: mins,
          color:            q.color,
          phase:            node.phase        || 'Core Topics',
          subtopics:        node.subtopics    || [],
          description:      node.description  || '',
          difficulty:       node.difficulty   || 2,
          done:             false,
        })
        slotsLeft--
      }

      if (slots.length) schedule[key] = slots
    }

    day = addDays(day, 1)
  }

  return schedule
}

/* ── Persistence ───────────────────────────────────────────────────────────── */
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') }
  catch { return null }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify({ schedule: s.schedule, generatedAt: s.generatedAt })) }
  catch {}
}

/* ── Store ─────────────────────────────────────────────────────────────────── */
export const useScheduleStore = create((set, get) => {
  const saved = load() || {}
  return {
    schedule:    saved.schedule    || {},
    generatedAt: saved.generatedAt || null,

    /** Build a fresh schedule from current roadmap data. */
    generate: (roadmaps) => {
      const schedule    = buildSchedule(roadmaps)
      const generatedAt = Date.now()
      const next        = { schedule, generatedAt }
      save(next)
      set(next)
    },

    /** Mark a scheduled item done (also call roadmapStore.completeNode separately). */
    markDone: (dateStr, nodeId) => {
      set(s => {
        const day = s.schedule[dateStr]
        if (!day) return s
        const schedule = {
          ...s.schedule,
          [dateStr]: day.map(item =>
            item.nodeId === nodeId ? { ...item, done: true } : item
          ),
        }
        const next = { ...s, schedule }
        save(next)
        return next
      })
    },

    /** Items scheduled for today. */
    getTodayItems: () => get().schedule[todayKey()] || [],

    /** Items for any given date string. */
    getDayItems: (dateStr) => get().schedule[dateStr] || [],

    /** All exam days across the given roadmaps: [{ dateStr, subject, color }] */
    getExamDays: (roadmaps) =>
      (roadmaps || [])
        .filter(r => r.examDate)
        .map((r, i) => ({
          dateStr: dateKey(r.examDate),
          subject: r.title,
          color:   SUBJECT_COLORS[i % SUBJECT_COLORS.length],
        })),

    /** Total minutes scheduled for today. */
    getTodayMinutes: () =>
      (get().schedule[todayKey()] || []).reduce((s, i) => s + (i.estimatedMinutes || 0), 0),

    /** How many of today's items are done. */
    getTodayProgress: () => {
      const items = get().schedule[todayKey()] || []
      return { done: items.filter(i => i.done).length, total: items.length }
    },
  }
})
