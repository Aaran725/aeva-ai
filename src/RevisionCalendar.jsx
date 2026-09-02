import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Calendar, RefreshCw, BookOpen, Zap, CheckSquare, FileText, Clock, ArrowRight, Check, Sparkles, RotateCcw } from 'lucide-react'
import { useScheduleStore, dateKey, SUBJECT_COLORS } from './scheduleStore'
import { useRoadmapStore } from './roadmapStore'
import { useUITheme } from './uiThemeStore'
import { useAevaControlStore } from './aevaControlStore'
import { useExamStore } from './examStore'
import { nextGroqKey as gKey, GROQ_URL } from './groqClient'

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const TYPE_ICON  = { learn: <BookOpen size={10} />, drill: <Zap size={10} />, check: <CheckSquare size={10} />, mock: <FileText size={10} /> }
const TYPE_LABEL = { learn: 'Learn', drill: 'Drill', check: 'Check', mock: 'Mock' }
const TYPE_COLOR = { learn: '#818CF8', drill: '#34D399', check: '#60A5FA', mock: '#FBBF24' }

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dateKeyLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function isToday(dateStr) { return dateStr === dateKey(new Date()) }
function isPast(dateStr)  { return dateStr < dateKey(new Date()) }

function getMondayOfWeek(d) {
  const date = new Date(d)
  const dow = date.getDay() || 7
  date.setDate(date.getDate() - (dow - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

/* ── Node launcher ──────────────────────────────────────────────────────────── */
function useLaunchNode() {
  const { startNodeSession } = useRoadmapStore()
  const { setPendingChatPrompt, requestChatView } = useAevaControlStore()
  const roadmaps = useRoadmapStore(s => s.roadmaps)

  return (item, onDone) => {
    const roadmap = roadmaps.find(r => r.id === item.roadmapId)
    if (!roadmap) return
    const node = roadmap.nodes?.find(n => n.id === item.nodeId)
    if (!node) return

    const daysLeft = Math.max(1, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
    startNodeSession(roadmap.id, node)

    if (node.type === 'learn') {
      const subtopicLine = node.subtopics?.length ? ` Specifically cover: ${node.subtopics.join(', ')}.` : ''
      const phaseLine = node.phase ? ` (Phase: ${node.phase}, Difficulty: ${node.difficulty || 2}/5)` : ''
      setPendingChatPrompt(`Teach me "${node.topic}" for my ${roadmap.title}.${phaseLine}${node.description ? ' ' + node.description : ''}${subtopicLine} I have ${daysLeft} days until the exam.`)
      requestChatView()
    } else {
      setPendingChatPrompt(`I need to practice "${node.topic}" for ${roadmap.title}. Give me ${node.type === 'mock' ? 'a full mock test' : node.type === 'check' ? 'a quick knowledge check' : 'a drill'} on this topic.`)
      requestChatView()
    }
    onDone?.()
  }
}

/* ── AI Edit Bar ────────────────────────────────────────────────────────────── */
function AIEditBar({ schedule, weekStart, onApplyEdit }) {
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]  = useState(null) // null | 'done' | 'none' | 'error'
  const accent = useUITheme(s => s.accent)

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setResult(null)

    const days = weekDays(weekStart)
    const weekContext = days.map(d => {
      const key = dateKeyLocal(d)
      const items = schedule[key] || []
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      if (!items.length) return `${label} (${key}): rest day`
      return `${label} (${key}): ${items.map(i => `"${i.topic}" (${i.subject}, ${i.estimatedMinutes}m)`).join(', ')}`
    }).join('\n')

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'user', content: `Parse this revision schedule edit request into actions.

Current week schedule:
${weekContext}

Request: "${input}"

Return ONLY valid JSON:
{
  "actions": [
    { "type": "move", "topic": "exact topic name", "fromDate": "YYYY-MM-DD", "toDate": "YYYY-MM-DD" },
    { "type": "remove", "topic": "exact topic name", "date": "YYYY-MM-DD" }
  ]
}

Match topic names exactly. If the request is unclear return {"actions":[]}.` }],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 250,
        }),
      })
      const data = await res.json()
      const parsed = JSON.parse(data.choices[0].message.content)
      const actions = parsed.actions || []
      let applied = 0
      for (const action of actions) {
        if (action.type === 'move' && action.topic && action.fromDate && action.toDate) {
          onApplyEdit({ type: 'move', topic: action.topic, fromDate: action.fromDate, toDate: action.toDate })
          applied++
        } else if (action.type === 'remove' && action.topic && action.date) {
          onApplyEdit({ type: 'remove', topic: action.topic, date: action.date })
          applied++
        }
      }
      setResult(applied > 0 ? 'done' : 'none')
      if (applied > 0) setInput('')
    } catch {
      setResult('error')
    } finally {
      setLoading(false)
    }
  }, [input, loading, schedule, weekStart, onApplyEdit])

  return (
    <div style={{ padding: '0 14px 12px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', transition: 'border 0.15s' }}>
        <Sparkles size={13} color="rgba(165,180,252,0.55)" style={{ flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => { setInput(e.target.value); if (result) setResult(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Move Physics to Thursday, swap Biology to Friday…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.82)', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", minWidth: 0 }}
        />
        <motion.button
          whileTap={{ scale: 0.91 }}
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          style={{ padding: '5px 12px', borderRadius: 8, background: input.trim() && !loading ? `${accent}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${input.trim() && !loading ? accent + '44' : 'rgba(255,255,255,0.08)'}`, color: input.trim() && !loading ? accent : 'rgba(255,255,255,0.20)', fontSize: 12, fontWeight: 700, cursor: input.trim() && !loading ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}>
          {loading ? '…' : 'Edit'}
        </motion.button>
      </div>
      <AnimatePresence>
        {result === 'done' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 6, fontSize: 11, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2 }}>
            <Check size={10} strokeWidth={3} /> Schedule updated
          </motion.div>
        )}
        {result === 'none' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.35)', paddingLeft: 2 }}>
            Couldn't match that — try using the exact topic name
          </motion.div>
        )}
        {result === 'error' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 6, fontSize: 11, color: '#F87171', paddingLeft: 2 }}>
            Edit failed — try again
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Day Column ─────────────────────────────────────────────────────────────── */
function DayColumn({ date, items, exam, onStudy, onToggleDone }) {
  const accent = useUITheme(s => s.accent)
  const dateStr  = dateKeyLocal(date)
  const today    = isToday(dateStr)
  const past     = isPast(dateStr)
  const dayName  = SHORT_DAYS[(date.getDay() + 6) % 7]
  const dayNum   = date.getDate()
  const done     = items.filter(i => i.done).length
  const total    = items.length
  const allDone  = total > 0 && done === total

  return (
    <div style={{ flex: '0 0 148px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Day header */}
      <div style={{
        textAlign: 'center', padding: '9px 6px 8px',
        borderRadius: 12,
        background: today ? `${accent}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${today ? accent + '44' : 'rgba(255,255,255,0.08)'}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: today ? accent : 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
          {dayName}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: today ? accent : past ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.88)' }}>
          {dayNum}
        </div>
        {total > 0 && (
          <div style={{ fontSize: 10, marginTop: 3, color: allDone ? '#4ADE80' : past ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            {allDone ? '✓ done' : `${done}/${total}`}
          </div>
        )}
      </div>

      {/* Exam banner */}
      {exam && (
        <div style={{ padding: '7px 8px', borderRadius: 10, background: `${exam.color}15`, border: `1px solid ${exam.color}33`, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1, marginBottom: 3 }}>📝</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: exam.color, lineHeight: 1.3 }}>{exam.subject}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>EXAM</div>
        </div>
      )}

      {/* Study item cards */}
      {items.length === 0 && !exam ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center' }}>
          {past ? '—' : '🎉'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map((item, i) => (
            <motion.div
              key={item.nodeId}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{
                borderRadius: 11,
                background: item.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.055)',
                border: `1px solid ${item.done ? 'rgba(255,255,255,0.06)' : item.color + '2e'}`,
                padding: '9px 10px',
                opacity: item.done ? 0.42 : 1,
                transition: 'opacity 0.2s',
              }}>
              {/* Color top bar */}
              <div style={{ height: 2.5, borderRadius: 2, background: item.color, marginBottom: 7 }} />

              {/* Topic */}
              <div style={{ fontSize: 12, fontWeight: 700, color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.90)', textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.35, marginBottom: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.topic}
              </div>

              {/* Chips row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7, flexWrap: 'wrap', rowGap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}18`, padding: '1.5px 5px', borderRadius: 4, border: `1px solid ${TYPE_COLOR[item.type]}30`, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {TYPE_ICON[item.type]} {TYPE_LABEL[item.type]}
                </span>
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Clock size={8} /> {item.estimatedMinutes}m
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {!item.done && !past && item.type !== 'mock' && (
                  <motion.button whileTap={{ scale: 0.92 }}
                    onClick={() => onStudy(item)}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: `${item.color}20`, border: `1px solid ${item.color}40`, color: item.color, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    Study <ArrowRight size={9} />
                  </motion.button>
                )}
                {!item.done && !past && item.type === 'mock' && (
                  <motion.button whileTap={{ scale: 0.92 }}
                    onClick={() => useExamStore.getState().openSetup(item.roadmapId)}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.32)', color: '#FCD34D', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    📝 Mock
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={() => onToggleDone(dateStr, item.nodeId)}
                  title={item.done ? 'Mark not done' : 'Mark done'}
                  style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? '#4ADE8022' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${item.done ? '#4ADE80' : 'rgba(255,255,255,0.14)'}`, color: item.done ? '#4ADE80' : 'rgba(255,255,255,0.28)', transition: 'all 0.15s', flexShrink: 0 }}>
                  <Check size={11} strokeWidth={3} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Week View ──────────────────────────────────────────────────────────────── */
function WeekView({ weekStart, schedule, examDays, onStudy, onToggleDone }) {
  const days    = weekDays(weekStart)
  const examMap = useMemo(() => {
    const m = {}
    examDays.forEach(e => { m[e.dateStr] = e })
    return m
  }, [examDays])

  const totalMinutes = days.reduce((sum, d) => {
    const key = dateKeyLocal(d)
    return sum + (schedule[key] || []).reduce((s, i) => s + (i.done ? 0 : i.estimatedMinutes), 0)
  }, 0)
  const totalDone = days.reduce((sum, d) => {
    const key = dateKeyLocal(d)
    return sum + (schedule[key] || []).filter(i => i.done).length
  }, 0)
  const totalItems = days.reduce((sum, d) => {
    const key = dateKeyLocal(d)
    return sum + (schedule[key] || []).length
  }, 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Week stats bar */}
      {totalItems > 0 && (
        <div style={{ flexShrink: 0, padding: '0 14px 10px', display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            {totalDone}/{totalItems} sessions done this week
          </span>
          {totalMinutes > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} /> {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`} remaining
            </span>
          )}
        </div>
      )}

      {/* Horizontal scroll of day columns */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '0 14px 20px', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
        {days.map(day => {
          const key = dateKeyLocal(day)
          return (
            <DayColumn
              key={key}
              date={day}
              items={schedule[key] || []}
              exam={examMap[key] || null}
              onStudy={onStudy}
              onToggleDone={onToggleDone}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Main RevisionCalendar ──────────────────────────────────────────────────── */
export default function RevisionCalendar({ onClose, onNavigateToChat }) {
  const accent   = useUITheme(s => s.accent)
  const roadmaps = useRoadmapStore(s => s.roadmaps)
  const { schedule, generatedAt, generate, toggleDone, getExamDays, moveItem, removeItem } = useScheduleStore()

  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [generating, setGenerating] = useState(false)

  const examDays    = useMemo(() => getExamDays(roadmaps), [roadmaps])
  const hasRoadmaps = roadmaps.some(r => r.examDate && r.nodes?.some(n => n.status !== 'complete'))
  const hasSchedule = Object.keys(schedule).length > 0
  const launchNode  = useLaunchNode()

  const isCurrentWeek = dateKeyLocal(weekStart) === dateKeyLocal(getMondayOfWeek(new Date()))

  const prevWeek = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })
  const nextWeek = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })
  const goToday  = () => setWeekStart(getMondayOfWeek(new Date()))

  const days    = weekDays(weekStart)
  const weekEnd = days[days.length - 1]
  const weekLabel = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' – ' + weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => { generate(roadmaps); setGenerating(false) }, 600)
  }

  const handleStudy = (item) => {
    launchNode(item, () => onNavigateToChat?.())
  }

  const handleApplyEdit = useCallback(({ type, topic, fromDate, toDate, date }) => {
    if (type === 'move')   moveItem(fromDate, topic, toDate)
    if (type === 'remove') removeItem(date, topic)
  }, [moveItem, removeItem])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(4,5,18,0.65)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ width: '100%', maxWidth: 480, height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(8,10,26,0.99)', borderLeft: '1px solid rgba(255,255,255,0.09)', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}
      >
        {/* ── Header ── */}
        <div style={{ flexShrink: 0, padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={13} color={accent} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>Revision Schedule</div>
                {generatedAt && (
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>
                    Updated {new Date(generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {hasRoadmaps && (
                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={handleGenerate} title="Regenerate schedule"
                  style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}14`, border: `1px solid ${accent}33`, color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div animate={generating ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: generating ? Infinity : 0, ease: 'linear' }}>
                    <RefreshCw size={12} />
                  </motion.div>
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={onClose}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Empty states ── */}
        {!hasRoadmaps ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 40 }}>🗺️</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>No roadmaps yet</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Create a roadmap for each subject first — Aeva will build your revision calendar automatically.
            </div>
          </div>
        ) : !hasSchedule ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', gap: 16 }}>
            <span style={{ fontSize: 40 }}>📅</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>Ready to plan</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Aeva will schedule your remaining nodes across your available days — weighted by urgency and weak areas.
            </div>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleGenerate}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 99, background: `${accent}22`, border: `1px solid ${accent}55`, color: accent, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <motion.div animate={generating ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: generating ? Infinity : 0, ease: 'linear' }}>
                <RefreshCw size={14} />
              </motion.div>
              {generating ? 'Building…' : 'Build my schedule'}
            </motion.button>
          </div>
        ) : (
          <>
            {/* ── AI Edit Bar ── */}
            <div style={{ flexShrink: 0, paddingTop: 12 }}>
              <AIEditBar schedule={schedule} weekStart={weekStart} onApplyEdit={handleApplyEdit} />
            </div>

            {/* ── Week navigation ── */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 10px' }}>
              <motion.button whileTap={{ scale: 0.90 }} onClick={prevWeek}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={14} />
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em' }}>{weekLabel}</div>
                {!isCurrentWeek && (
                  <motion.button whileTap={{ scale: 0.92 }} onClick={goToday}
                    style={{ padding: '3px 9px', borderRadius: 7, background: `${accent}14`, border: `1px solid ${accent}33`, color: accent, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RotateCcw size={9} /> Today
                  </motion.button>
                )}
              </div>

              <motion.button whileTap={{ scale: 0.90 }} onClick={nextWeek}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={14} />
              </motion.button>
            </div>

            {/* ── Subject legend ── */}
            {examDays.length > 0 && (
              <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 14px 10px' }}>
                {roadmaps.filter(r => r.examDate).map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 99, background: `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}14`, border: `1px solid ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}33` }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{r.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Week view ── */}
            <WeekView
              weekStart={weekStart}
              schedule={schedule}
              examDays={examDays}
              onStudy={handleStudy}
              onToggleDone={(dateStr, nodeId) => toggleDone(dateStr, nodeId)}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ── TodayPlanCard — shown on dashboard ─────────────────────────────────────── */
export function TodayPlanCard({ onOpenCalendar, onNavigateToChat }) {
  const accent    = useUITheme(s => s.accent)
  const roadmaps  = useRoadmapStore(s => s.roadmaps)
  const { getTodayItems, getTodayProgress, toggleDone, generatedAt, generate } = useScheduleStore()

  const items    = getTodayItems()
  const { done, total } = getTodayProgress()
  const launchNode = useLaunchNode()

  const hasRoadmaps   = roadmaps.some(r => r.examDate && r.nodes?.some(n => n.status !== 'complete'))
  const hasSchedule   = !!generatedAt

  const today     = new Date()
  const dayName   = today.toLocaleDateString('en-GB', { weekday: 'long' })
  const dateLabel = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  if (!hasRoadmaps) return null

  return (
    <div style={{ borderRadius: 'var(--aeva-radius-lg, 20px)', background: 'var(--aeva-surface-1)', border: '1px solid rgba(255,255,255,0.08)', padding: '18px 20px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', marginBottom: 3 }}>Today's Plan</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>
            {dayName} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{dateLabel}</span>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={onOpenCalendar}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, background: `${accent}14`, border: `1px solid ${accent}33`, color: accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
          <Calendar size={11} /> Calendar
        </motion.button>
      </div>

      {!hasSchedule ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 12, lineHeight: 1.6 }}>
            Build your revision schedule and Aeva will tell you exactly what to study each day.
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => generate(roadmaps)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 99, background: `${accent}20`, border: `1px solid ${accent}44`, color: accent, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Calendar size={13} /> Build schedule
          </motion.button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
          🎉 Rest day — nothing scheduled today.<br />
          <span style={{ fontSize: 12 }}>You've earned it.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Progress bar */}
          {total > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{done}/{total} sessions</span>
                <span style={{ fontSize: 11, color: done === total ? '#4ADE80' : 'rgba(255,255,255,0.35)' }}>
                  {done === total ? 'All done! 🎉' : `${items.reduce((s, i) => s + (!i.done ? i.estimatedMinutes : 0), 0)} min left`}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 99, background: done === total ? '#4ADE80' : accent }} />
              </div>
            </div>
          )}

          {items.map((item, i) => (
            <motion.div key={item.nodeId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: item.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: `1px solid ${item.done ? 'rgba(255,255,255,0.05)' : item.color + '2a'}`, opacity: item.done ? 0.5 : 1, transition: 'all 0.2s' }}>
              <div style={{ width: 3, height: 32, borderRadius: 99, background: item.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.topic}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{item.subject} · {item.estimatedMinutes}m · {TYPE_LABEL[item.type]}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {!item.done && item.type === 'mock' && (
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                    onClick={() => useExamStore.getState().openSetup(item.roadmapId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 99, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.38)', color: '#FCD34D', cursor: 'pointer', fontSize: 10.5, fontWeight: 700 }}>
                    📝 Simulate
                  </motion.button>
                )}
                {!item.done && item.type !== 'mock' && (
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                    onClick={() => launchNode(item, () => onNavigateToChat?.())}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: item.color + '22', border: `1px solid ${item.color}44`, color: item.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={12} />
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={() => toggleDone(dateKey(new Date()), item.nodeId)}
                  title={item.done ? 'Mark as not done' : 'Mark as done'}
                  style={{ width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? '#4ADE8022' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${item.done ? '#4ADE80' : 'rgba(255,255,255,0.15)'}`, color: item.done ? '#4ADE80' : 'rgba(255,255,255,0.28)', transition: 'all 0.2s' }}>
                  <Check size={11} strokeWidth={3} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
