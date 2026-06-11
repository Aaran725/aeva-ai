import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Calendar, RefreshCw, BookOpen, Zap, CheckSquare, FileText, Clock, ArrowRight, Check } from 'lucide-react'
import { useScheduleStore, dateKey, SUBJECT_COLORS } from './scheduleStore'
import { useRoadmapStore } from './roadmapStore'
import { useUITheme } from './uiThemeStore'
import { useAevaControlStore } from './aevaControlStore'
import { useExamStore } from './examStore'

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const TYPE_ICON  = { learn: <BookOpen size={11} />, drill: <Zap size={11} />, check: <CheckSquare size={11} />, mock: <FileText size={11} /> }
const TYPE_LABEL = { learn: 'Learn', drill: 'Drill', check: 'Check', mock: 'Mock' }
const TYPE_COLOR = { learn: '#818CF8', drill: '#34D399', check: '#60A5FA', mock: '#FBBF24' }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isToday(dateStr) { return dateStr === dateKey(new Date()) }
function isPast(dateStr)  { return dateStr < dateKey(new Date()) }

/* ── Node launcher — replicates RoadmapHub's launchNode for learn nodes ─────── */
function useLaunchNode() {
  const { startNodeSession } = useRoadmapStore()
  const { setPendingChatPrompt, requestChatView } = useAevaControlStore()
  const roadmaps = useRoadmapStore(s => s.roadmaps)

  return (item, onDone) => {
    // Find the full node from the roadmap
    const roadmap = roadmaps.find(r => r.id === item.roadmapId)
    if (!roadmap) return
    const node = roadmap.nodes?.find(n => n.id === item.nodeId)
    if (!node) return

    const daysLeft = Math.max(1, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
    startNodeSession(roadmap.id, node)

    if (node.type === 'learn') {
      const subtopicLine = node.subtopics?.length
        ? ` Specifically cover: ${node.subtopics.join(', ')}.`
        : ''
      const phaseLine = node.phase ? ` (Phase: ${node.phase}, Difficulty: ${node.difficulty || 2}/5)` : ''
      setPendingChatPrompt(
        `Teach me "${node.topic}" for my ${roadmap.title}.${phaseLine}${node.description ? ' ' + node.description : ''}${subtopicLine} I have ${daysLeft} days until the exam.`
      )
      requestChatView()
    } else {
      // drill/check/mock — open lab
      setPendingChatPrompt(
        `I need to practice "${node.topic}" for ${roadmap.title}. Give me ${node.type === 'mock' ? 'a full mock test' : node.type === 'check' ? 'a quick knowledge check' : 'a drill'} on this topic.`
      )
      requestChatView()
    }

    onDone?.()
  }
}

/* ── Day Panel ──────────────────────────────────────────────────────────────── */
function DayPanel({ dateStr, items, examInfo, onClose, onStudy, onToggleDone }) {
  const isExam = !!examInfo
  const today  = isToday(dateStr)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(8,10,26,0.99)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 max(24px, env(safe-area-inset-bottom))',
        maxHeight: '70%',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        boxShadow: '0 -8px 48px rgba(0,0,0,0.60)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 14px' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: today ? 'var(--ui-accent)' : 'rgba(255,255,255,0.90)' }}>
            {today ? 'Today' : formatDateFull(dateStr)}
          </div>
          {today && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{formatDateFull(dateStr)}</div>}
        </div>
        <motion.button whileTap={{ scale: 0.90 }} onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={13} />
        </motion.button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 8px' }}>

        {/* Exam banner */}
        {isExam && (
          <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }}
            style={{ padding: '12px 14px', borderRadius: 14, background: `${examInfo.color}18`, border: `1px solid ${examInfo.color}44`, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: examInfo.color }}>{examInfo.subject} Exam</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Go show them what you know.</div>
            </div>
          </motion.div>
        )}

        {/* Study items */}
        {items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <motion.div key={item.nodeId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px',
                  borderRadius: 14,
                  background: item.done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${item.done ? 'rgba(255,255,255,0.06)' : item.color + '33'}`,
                  opacity: item.done ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}>
                {/* Color bar */}
                <div style={{ width: 3, height: 36, borderRadius: 99, background: item.color, flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: item.done ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.88)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.topic}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: TYPE_COLOR[item.type] + '18', border: `1px solid ${TYPE_COLOR[item.type]}33`, color: TYPE_COLOR[item.type], display: 'flex', alignItems: 'center', gap: 3 }}>
                      {TYPE_ICON[item.type]} {TYPE_LABEL[item.type]}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={9} /> {item.estimatedMinutes}m
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)' }}>{item.subject}</span>
                  </div>
                </div>

                {/* Right actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {/* Study button — only when not done and not past */}
                  {!item.done && !isPast(dateStr) && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => onStudy(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 99, background: item.color + '22', border: `1px solid ${item.color}44`, color: item.color, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Study <ArrowRight size={10} />
                    </motion.button>
                  )}
                  {/* ✓ toggle — always visible so user can manually mark done/undone */}
                  <motion.button whileTap={{ scale: 0.85 }}
                    onClick={() => onToggleDone(item.nodeId)}
                    title={item.done ? 'Mark as not done' : 'Mark as done'}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.done ? '#4ADE8022' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${item.done ? '#4ADE80' : 'rgba(255,255,255,0.15)'}`,
                      color: item.done ? '#4ADE80' : 'rgba(255,255,255,0.30)',
                      transition: 'all 0.2s',
                    }}>
                    <Check size={12} strokeWidth={3} />
                  </motion.button>
                </div>
              </motion.div>
            ))}

            {/* Total time */}
            {!isExam && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'right', paddingTop: 4 }}>
                ~{items.reduce((s, i) => s + i.estimatedMinutes, 0)} min total
              </div>
            )}
          </div>
        ) : !isExam ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
            {isPast(dateStr) ? 'No sessions were scheduled.' : '🎉 Rest day — nothing scheduled.'}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

/* ── Calendar grid ──────────────────────────────────────────────────────────── */
function CalendarGrid({ year, month, schedule, examDays, onDayClick, selectedDate }) {
  const accent = useUITheme(s => s.accent)

  const firstDay = new Date(year, month, 1)
  // Mon=0, Tue=1 ... Sun=6
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  // Padding cells before month starts
  for (let i = 0; i < startOffset; i++) cells.push(null)
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const examMap = {}
  examDays.forEach(e => { examMap[e.dateStr] = e })

  return (
    <div style={{ padding: '0 14px 14px' }}>
      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textAlign: 'center', padding: '4px 0', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />

          const dStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const items    = schedule[dStr] || []
          const exam     = examMap[dStr]
          const today    = isToday(dStr)
          const past     = isPast(dStr)
          const selected = selectedDate === dStr
          const hasTasks = items.length > 0
          const doneTasks = items.filter(i => i.done).length
          const allDone   = hasTasks && doneTasks === items.length

          // Collect unique colors for dots
          const dotColors = [...new Set(items.map(i => i.color))].slice(0, 3)

          return (
            <motion.button
              key={dStr}
              whileTap={{ scale: 0.92 }}
              onClick={() => onDayClick(dStr)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 10,
                background: selected
                  ? accent + '22'
                  : today
                  ? accent + '14'
                  : exam
                  ? exam.color + '14'
                  : 'rgba(255,255,255,0.03)',
                border: selected
                  ? `1.5px solid ${accent}88`
                  : today
                  ? `1.5px solid ${accent}55`
                  : exam
                  ? `1px solid ${exam.color}44`
                  : hasTasks
                  ? '1px solid rgba(255,255,255,0.10)'
                  : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                opacity: past && !today ? 0.45 : 1,
                transition: 'all 0.15s',
              }}
            >
              {/* Exam flag */}
              {exam && (
                <div style={{ position: 'absolute', top: 2, right: 3, fontSize: 8 }}>📝</div>
              )}

              {/* Day number */}
              <span style={{
                fontSize: 12, fontWeight: today ? 800 : 500,
                color: today ? accent : selected ? accent : 'rgba(255,255,255,0.80)',
                lineHeight: 1,
              }}>{day}</span>

              {/* Subject dots */}
              {dotColors.length > 0 && (
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {dotColors.map((c, ci) => (
                    <div key={ci} style={{ width: allDone ? 4 : 4, height: 4, borderRadius: '50%', background: allDone ? '#4ADE80' : c, opacity: allDone ? 0.7 : 0.9 }} />
                  ))}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main RevisionCalendar component ────────────────────────────────────────── */
export default function RevisionCalendar({ onClose, onNavigateToChat }) {
  const accent    = useUITheme(s => s.accent)
  const roadmaps  = useRoadmapStore(s => s.roadmaps)
  const { schedule, generatedAt, generate, markDone, toggleDone, getDayItems, getExamDays } = useScheduleStore()

  const today     = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(dateKey(today))
  const [generating, setGenerating] = useState(false)

  const examDays = useMemo(() => getExamDays(roadmaps), [roadmaps])
  const examMap  = useMemo(() => {
    const m = {}
    examDays.forEach(e => { m[e.dateStr] = e })
    return m
  }, [examDays])

  const hasRoadmaps  = roadmaps.some(r => r.examDate && r.nodes?.some(n => n.status !== 'complete'))
  const hasSchedule  = Object.keys(schedule).length > 0
  const launchNode   = useLaunchNode()

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      generate(roadmaps)
      setGenerating(false)
    }, 600) // slight delay so the spinner feels intentional
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const selectedItems = getDayItems(selected)
  const selectedExam  = examMap[selected]

  const handleStudy = (item) => {
    // Don't mark done here — done is set when the session is completed
    // (completeNodeWithConfidence auto-marks, or user taps ✓ manually)
    launchNode(item, () => onNavigateToChat?.())
  }

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
        style={{
          width: '100%', maxWidth: 400,
          height: '100%', display: 'flex', flexDirection: 'column',
          background: 'rgba(8,10,26,0.99)',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
                  onClick={handleGenerate}
                  title="Regenerate schedule"
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

        {/* No roadmaps empty state */}
        {!hasRoadmaps ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 40 }}>🗺️</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>No roadmaps yet</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Create a roadmap for each subject first — Aeva will build your revision calendar automatically.
            </div>
          </div>
        ) : !hasSchedule ? (
          /* Has roadmaps but no schedule generated yet */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', gap: 16 }}>
            <span style={{ fontSize: 40 }}>📅</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>Ready to plan</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Aeva will schedule your remaining nodes across your available days — weighted by urgency and weak areas.
            </div>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleGenerate}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 99, background: `${accent}22`, border: `1px solid ${accent}55`, color: accent, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <motion.div animate={generating ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: generating ? Infinity : 0, ease: 'linear' }}>
                <RefreshCw size={14} />
              </motion.div>
              {generating ? 'Building…' : 'Build my schedule'}
            </motion.button>
          </div>
        ) : (
          /* Schedule exists — show calendar */
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 8px' }}>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.90 }} onClick={prevMonth}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={14} />
              </motion.button>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>
                {MONTHS[month]} {year}
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.90 }} onClick={nextMonth}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={14} />
              </motion.button>
            </div>

            {/* Subject legend */}
            {examDays.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 10px' }}>
                {roadmaps.filter(r => r.examDate).map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 99, background: `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}14`, border: `1px solid ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}33` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>{r.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar grid */}
            <CalendarGrid
              year={year}
              month={month}
              schedule={schedule}
              examDays={examDays}
              selectedDate={selected}
              onDayClick={(dStr) => setSelected(prev => prev === dStr ? null : dStr)}
            />
          </div>
        )}

        {/* Day panel slides up from bottom */}
        <AnimatePresence>
          {selected && hasSchedule && (
            <DayPanel
              dateStr={selected}
              items={selectedItems}
              examInfo={examMap[selected] || null}
              onClose={() => setSelected(null)}
              onStudy={handleStudy}
              onToggleDone={(nodeId) => toggleDone(selected, nodeId)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/* ── TodayPlanCard — shown on dashboard ─────────────────────────────────────── */
export function TodayPlanCard({ onOpenCalendar, onNavigateToChat }) {
  const accent    = useUITheme(s => s.accent)
  const roadmaps  = useRoadmapStore(s => s.roadmaps)
  const { getTodayItems, getTodayProgress, markDone, toggleDone, generatedAt, generate } = useScheduleStore()

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
    <div style={{
      borderRadius: 'var(--aeva-radius-lg, 20px)',
      background: 'var(--aeva-surface-1)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '18px 20px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', marginBottom: 3 }}>Today's Plan</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>
            {dayName} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{dateLabel}</span>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={onOpenCalendar}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, background: `${accent}14`, border: `1px solid ${accent}33`, color: accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
          <Calendar size={11} /> Calendar
        </motion.button>
      </div>

      {!hasSchedule ? (
        /* Schedule not generated yet */
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
        /* Rest day */
        <div style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
          🎉 Rest day — nothing scheduled today.<br />
          <span style={{ fontSize: 12 }}>You've earned it.</span>
        </div>
      ) : (
        /* Study items */
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
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 99, background: done === total ? '#4ADE80' : accent }}
                />
              </div>
            </div>
          )}

          {items.map((item, i) => (
            <motion.div key={item.nodeId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: item.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${item.done ? 'rgba(255,255,255,0.05)' : item.color + '2a'}`,
                opacity: item.done ? 0.5 : 1,
                transition: 'all 0.2s',
              }}>
              {/* Color bar */}
              <div style={{ width: 3, height: 32, borderRadius: 99, background: item.color, flexShrink: 0 }} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.topic}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                  {item.subject} · {item.estimatedMinutes}m · {TYPE_LABEL[item.type]}
                </div>
              </div>

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {!item.done && item.type === 'mock' && (
                  /* Mock node → Simulate Exam shortcut */
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                    onClick={() => useExamStore.getState().openSetup(item.roadmapId)}
                    title="Simulate exam for this topic"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 99, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.38)', color: '#FCD34D', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    📝 Simulate
                  </motion.button>
                )}
                {/* Launch button — non-mock nodes only */}
                {!item.done && item.type !== 'mock' && (
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                    onClick={() => launchNode(item, () => onNavigateToChat?.())}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: item.color + '22', border: `1px solid ${item.color}44`, color: item.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={12} />
                  </motion.button>
                )}
                {/* ✓ toggle */}
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={() => toggleDone(dateKey(new Date()), item.nodeId)}
                  title={item.done ? 'Mark as not done' : 'Mark as done'}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.done ? '#4ADE8022' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${item.done ? '#4ADE80' : 'rgba(255,255,255,0.15)'}`,
                    color: item.done ? '#4ADE80' : 'rgba(255,255,255,0.28)',
                    transition: 'all 0.2s',
                  }}>
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
