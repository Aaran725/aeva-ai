import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Plus, Map, Calendar, Upload, Sparkles, FileText, BookOpen, Zap, Target, ClipboardList, Check, Lock, Clock, Trophy, Trash2, Brain, Dumbbell, GraduationCap, FlaskConical } from 'lucide-react'
import { useRoadmapStore } from './roadmapStore'
import { useLabStore } from './labStore'
import { useXPStore } from './xpStore'
import { useAevaControlStore } from './aevaControlStore'

const _GROQ_KEYS=[import.meta.env.VITE_GROQ_API_KEY,import.meta.env.VITE_GROQ_API_KEY_2,import.meta.env.VITE_GROQ_API_KEY_3].filter(Boolean);let _ki=0;const gKey=()=>_GROQ_KEYS[_ki++%_GROQ_KEYS.length]
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function generateRoadmapNodes(title, examDate, assessmentInfo, options = {}) {
  const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - Date.now()) / 86400000))

  const learnCount   = options.learnCount   ?? 8
  const practiceCount = options.practiceCount ?? 6
  const mockCount    = options.mockCount    ?? 2
  const totalNodes   = learnCount + practiceCount + mockCount
  const pace         = options.pace         ?? 'balanced'  // 'relaxed' | 'balanced' | 'intensive'

  const minutesMap = { relaxed: { learn: 25, drill: 15, check: 15, mock: 60 }, balanced: { learn: 20, drill: 12, check: 12, mock: 45 }, intensive: { learn: 15, drill: 10, check: 10, mock: 30 } }
  const mins = minutesMap[pace]

  const prompt = `You are Aeva, an expert AI tutor. Generate a comprehensive exam preparation roadmap engineered to achieve 90%+ on the test.

Exam: "${title}"
Date: ${examDate} (${daysLeft} days away)${assessmentInfo ? `\n\nAssessment info:\n${assessmentInfo}` : ''}

Return ONLY valid JSON:
{
  "overview": "2-sentence description: what this exam tests and the critical factors for scoring 90%+",
  "nodes": [
    {
      "id": "n1",
      "topic": "Topic Name",
      "type": "learn",
      "phase": "Foundation",
      "difficulty": 1,
      "estimatedMinutes": 20,
      "xp": 50,
      "description": "One sentence: exactly what the student will learn or practise in this step"
    }
  ]
}

CRITICAL RULES — follow exactly:

NODE COUNT: Exactly ${totalNodes} nodes total. No more, no fewer.

TYPE DISTRIBUTION — you MUST hit these exact counts:
  learn nodes: exactly ${learnCount}  (type="learn" — Aeva teaches a concept)
  practice/drill/check nodes: exactly ${practiceCount}  (spread evenly across type="drill" and type="check")
  mock test nodes: exactly ${mockCount}  (type="mock")

BALANCE RULE: Spread the ${learnCount} learn nodes across all major topics. Interleave drill/check nodes after learn nodes for the same topic. Place mock nodes near the end.

PHASES — every node must have a phase, exactly one of:
  "Foundation"  — essential background (2-3 learn nodes, first in the roadmap)
  "Core Topics" — deep coverage of every major exam topic (bulk of learn + drill + check nodes)
  "Practice"    — cross-topic application (harder drill/check nodes)
  "Exam Prep"   — exam technique, mock tests (last ${Math.max(mockCount + 1, 2)} nodes)

FIXED STRUCTURE:
  - Node 1: type="learn", phase="Foundation", difficulty=1, most foundational concept
  - Second-to-last node: type="learn", topic="Exam Strategy & Technique", phase="Exam Prep", description="Timing plans, command word interpretation, common mark-scheme traps, and how to maximise marks under pressure."
  - Last node: type="mock", phase="Exam Prep", difficulty=5, xp=100

STUDY PACE: ${pace} — set estimatedMinutes accordingly:
  learn=${mins.learn}min, drill=${mins.drill}min, check=${mins.check}min, mock=${mins.mock}min

TYPE VALUES: exactly one of: learn, drill, check, mock
DIFFICULTY: Foundation=1-2, Core Topics=2-3, Practice=3-4, Exam Prep=4-5
XP: learn=50, drill=30, check=40, mock=100
TOPIC NAMES: 3-6 words, specific not vague (e.g. "Quadratic Formula & Discriminant" not "Algebra")
ORDER: strict prerequisites — foundational concepts always before applications`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3200,
    }),
  })
  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  const nodes = (parsed.nodes || []).map((n, i) => ({
    ...n,
    id: `n${i}_${Math.random().toString(36).slice(2,6)}`,
    status: i === 0 ? 'available' : 'locked',
  }))
  return { overview: parsed.overview || '', nodes }
}

export default function RoadmapHub() {
  const { roadmapOpen, closeRoadmapHub, roadmaps, getActive } = useRoadmapStore()
  const [view, setView] = useState(() => {
    const active = useRoadmapStore.getState().getActive()
    return active?.nodes?.length ? 'path' : 'home'
  })
  const [pendingForm, setPending] = useState(null)  // holds form data during generation

  const active = getActive()

  if (!roadmapOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: '#05060f',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        flexShrink: 0, height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(5,6,15,0.95)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {view !== 'home' && (
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => setView('home')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4, display: 'flex' }}>
              <ChevronLeft size={20} />
            </motion.button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Map size={13} color="white" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>
              {view === 'home' ? 'Roadmaps' : view === 'create' ? 'New Roadmap' : view === 'generating' ? 'Building…' : active?.title || 'Roadmap'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {view === 'home' && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setView('create')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.40)', color: '#A5B4FC', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={13} /> New
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={closeRoadmapHub}
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {view === 'home'       && <HomeView       key="home"       onCreate={() => setView('create')} onOpen={() => setView('path')} />}
          {view === 'create'     && <CreateView     key="create"     onGenerate={(fd) => { setPending(fd); setView('generating') }} />}
          {view === 'generating' && <GeneratingView key="generating" formData={pendingForm} onDone={() => { setPending(null); setView('path') }} />}
          {view === 'path'       && <PathView       key="path" />}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function HomeView({ onCreate, onOpen }) {
  const { roadmaps, setActive, deleteRoadmap } = useRoadmapStore()
  const [confirmDelete, setConfirmDelete] = useState(null)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: roadmaps.length ? 'flex-start' : 'center', padding: 24, gap: 12, overflowY: 'auto' }}>
      {roadmaps.length === 0 ? (
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,rgba(79,70,229,0.18),rgba(124,58,237,0.18))', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Map size={28} color="#818CF8" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8 }}>No roadmaps yet</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 28 }}>Create a roadmap and Aeva builds your entire exam prep path — designed to get you 90%+ on the day.</div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onCreate}
            style={{ padding: '13px 28px', borderRadius: 14, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Create first roadmap
          </motion.button>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', maxWidth: 480, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>Your Roadmaps</div>
          {roadmaps.map(r => {
            const daysLeft = Math.max(0, Math.ceil((new Date(r.examDate) - Date.now()) / 86400000))
            const completed = r.nodes?.filter(n => n.status === 'complete').length || 0
            const total = r.nodes?.length || 0
            const isAllDone = total > 0 && completed === total
            const availNode = r.nodes?.find(n => n.status === 'available')
            const currentPhase = isAllDone ? 'Complete' : (availNode?.phase || null)
            const pc = currentPhase && !isAllDone ? (PHASE_CFG[currentPhase] || null) : null
            const accentColor = isAllDone ? '#4ADE80' : (pc?.color || '#6366F1')
            const remMins = r.nodes?.filter(n => n.status !== 'complete').reduce((s, n) => s + (n.estimatedMinutes || 20), 0) || 0
            const remH = Math.floor(remMins / 60), remM = remMins % 60

            return (
              <div key={r.id} style={{ width: '100%', maxWidth: 480 }}>
                {/* Card — overflow:hidden for border-radius clipping only */}
                <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>

                  {/* Phase colour accent top bar */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }} />

                  <div style={{ padding: '16px 18px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        onClick={() => { setActive(r.id); onOpen() }}
                        style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 5, letterSpacing: '-0.02em' }}>{r.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          {currentPhase && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: accentColor, background: `${accentColor}15`, padding: '2px 8px', borderRadius: 99, border: `1px solid ${accentColor}30` }}>
                              {isAllDone ? '🎉 Complete' : currentPhase}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{completed}/{total} steps · {daysLeft}d left</span>
                        </div>
                      </motion.div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: r.readiness >= 60 ? '#4ADE80' : '#fff', letterSpacing: '-0.04em' }}>{r.readiness}%</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 600 }}>ready</div>
                        </div>
                        {/* Trash button — clearly visible, outside progress tap area */}
                        <motion.button
                          whileHover={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}
                          whileTap={{ scale: 0.90 }}
                          onClick={() => setConfirmDelete(confirmDelete === r.id ? null : r.id)}
                          style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: confirmDelete === r.id ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                            border: confirmDelete === r.id ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.10)',
                            color: confirmDelete === r.id ? '#F87171' : 'rgba(255,255,255,0.40)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}>
                          <Trash2 size={13} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      onClick={() => { setActive(r.id); onOpen() }}
                      style={{ cursor: 'pointer' }}>
                      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${r.readiness}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }} />
                      </div>
                      {remMins > 0 && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                          <Clock size={10} /> ~{remH > 0 ? `${remH}h ${remM}m` : `${remM}m`} remaining
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Confirm panel — OUTSIDE the overflow:hidden card so it's never clipped */}
                <AnimatePresence>
                  {confirmDelete === r.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: 8, padding: '8px 0 0' }}>
                        <motion.button whileTap={{ scale: 0.96 }}
                          onClick={() => { deleteRoadmap(r.id); setConfirmDelete(null) }}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.38)', color: '#F87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Trash2 size={13} /> Delete roadmap
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.96 }}
                          onClick={() => setConfirmDelete(null)}
                          style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Cancel
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </>
      )}
    </motion.div>
  )
}

function NodeCounter({ label, icon, color, bg, border, value, onChange, min = 1, max = 20 }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 12, background: bg, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>−</motion.button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</span>
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>+</motion.button>
      </div>
    </div>
  )
}

function CreateView({ onGenerate }) {
  const [title, setTitle]       = useState('')
  const [examDate, setExamDate] = useState('')
  const [info, setInfo]         = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')
  const fileRef                 = useRef(null)

  // Customisation
  const [learnCount,    setLearnCount]    = useState(8)
  const [practiceCount, setPracticeCount] = useState(6)
  const [mockCount,     setMockCount]     = useState(2)
  const [pace,          setPace]          = useState('balanced')

  const totalNodes = learnCount + practiceCount + mockCount

  const PRESETS = [
    { label: 'Balanced',        learn: 8,  practice: 6,  mock: 2 },
    { label: 'Practice Heavy',  learn: 6,  practice: 10, mock: 2 },
    { label: 'Exam Focused',    learn: 6,  practice: 5,  mock: 5 },
    { label: 'Deep Dive',       learn: 14, practice: 8,  mock: 3 },
  ]
  const activePreset = PRESETS.findIndex(p => p.learn === learnCount && p.practice === practiceCount && p.mock === mockCount)

  const applyPreset = (p) => { setLearnCount(p.learn); setPracticeCount(p.practice); setMockCount(p.mock) }

  const handleFile = (f) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = e => setInfo(prev => prev ? prev + '\n\n' + e.target.result : e.target.result)
    reader.readAsText(f)
  }

  const handleGenerate = () => {
    if (!title.trim() || !examDate) { setError('Add a title and exam date to continue.'); return }
    setError('')
    onGenerate({ title: title.trim(), examDate, info, options: { learnCount, practiceCount, mockCount, pace } })
  }

  const field = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.88)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none', boxSizing: 'border-box',
  }

  // Build the visual proportion bar
  const total = totalNodes || 1
  const learnPct    = Math.round(learnCount / total * 100)
  const practicePct = Math.round(practiceCount / total * 100)
  const mockPct     = 100 - learnPct - practicePct

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ flex: 1, padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Title */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Test / Assignment Name
          </label>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Biology Unit 3 Exam"
            style={field}
          />
        </div>

        {/* Exam date */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Exam Date
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
              style={{ ...field, paddingLeft: 40, colorScheme: 'dark' }}
            />
            <Calendar size={15} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* ── Node Mix ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              Roadmap Mix
            </label>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>{totalNodes} nodes total</span>
          </div>

          {/* Preset chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {PRESETS.map((p, i) => (
              <motion.button key={p.label} whileTap={{ scale: 0.95 }} onClick={() => applyPreset(p)}
                style={{
                  padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  background: activePreset === i ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.05)',
                  border: activePreset === i ? '1px solid rgba(99,102,241,0.50)' : '1px solid rgba(255,255,255,0.10)',
                  color: activePreset === i ? '#A5B4FC' : 'rgba(255,255,255,0.45)',
                }}>
                {p.label}
              </motion.button>
            ))}
          </div>

          {/* Counters */}
          <div style={{ display: 'flex', gap: 8 }}>
            <NodeCounter label="Learn" icon={<GraduationCap size={13} />} color="#818CF8" bg="rgba(99,102,241,0.08)" border="rgba(99,102,241,0.22)" value={learnCount} onChange={setLearnCount} />
            <NodeCounter label="Practice" icon={<Dumbbell size={13} />} color="#34D399" bg="rgba(52,211,153,0.08)" border="rgba(52,211,153,0.22)" value={practiceCount} onChange={setPracticeCount} />
            <NodeCounter label="Mock Tests" icon={<FlaskConical size={13} />} color="#F59E0B" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.22)" value={mockCount} onChange={setMockCount} min={1} />
          </div>

          {/* Proportion bar */}
          <div style={{ marginTop: 10, height: 6, borderRadius: 6, overflow: 'hidden', display: 'flex', gap: 2 }}>
            <motion.div animate={{ flex: learnCount }} style={{ background: 'rgba(99,102,241,0.60)', borderRadius: 6, transition: 'flex 0.3s' }} />
            <motion.div animate={{ flex: practiceCount }} style={{ background: 'rgba(52,211,153,0.60)', borderRadius: 6, transition: 'flex 0.3s' }} />
            <motion.div animate={{ flex: mockCount }} style={{ background: 'rgba(245,158,11,0.60)', borderRadius: 6, transition: 'flex 0.3s' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            {[['#818CF8','Learn',learnPct],['#34D399','Practice',practicePct],['#F59E0B','Mock',mockPct]].map(([c,l,p]) => (
              <span key={l} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: c, display: 'inline-block' }} />{l} {p}%
              </span>
            ))}
          </div>
        </div>

        {/* ── Study Pace ── */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Study Pace
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'relaxed',    label: 'Relaxed',    sub: '20–25 min/node' },
              { id: 'balanced',   label: 'Balanced',   sub: '12–20 min/node' },
              { id: 'intensive',  label: 'Intensive',  sub: '10–15 min/node' },
            ].map(p => (
              <motion.button key={p.id} whileTap={{ scale: 0.96 }} onClick={() => setPace(p.id)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  background: pace === p.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                  border: pace === p.id ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: pace === p.id ? '#A5B4FC' : 'rgba(255,255,255,0.55)' }}>{p.label}</span>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{p.sub}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Assessment info */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Assessment Info <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.25)' }}>— optional</span>
          </label>
          <textarea
            value={info} onChange={e => setInfo(e.target.value)}
            placeholder="Paste rubrics, learning outcomes, study guides, teacher instructions…"
            rows={4}
            style={{ ...field, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* File drop zone */}
        <motion.div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
          onClick={() => fileRef.current?.click()}
          animate={{ borderColor: dragOver ? 'rgba(99,102,241,0.70)' : 'rgba(255,255,255,0.10)', background: dragOver ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)' }}
          style={{ border: '2px dashed rgba(255,255,255,0.10)', borderRadius: 12, padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }}>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.md,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
          <Upload size={18} color="rgba(255,255,255,0.30)" />
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Drop a file or click to upload</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)' }}>TXT · PDF · MD</span>
        </motion.div>

        {info && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
            <FileText size={13} color="#818CF8" />
            <span style={{ fontSize: 12, color: '#A5B4FC', fontWeight: 500 }}>{info.length} characters of context added</span>
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: '#F87171', fontWeight: 500 }}>{error}</div>}

        {/* Generate */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <Sparkles size={15} /> Generate Roadmap · {totalNodes} nodes
        </motion.button>

      </div>
    </motion.div>
  )
}

const GEN_STEPS = [
  'Extracting topics…',
  'Mapping prerequisites…',
  'Estimating workload…',
  'Building your path…',
  'Generating daily mission…',
]

function GeneratingView({ formData, onDone }) {
  const { createRoadmap, updateRoadmap, setDailyMission } = useRoadmapStore()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!formData) return
    let cancelled = false
    const stepInterval = setInterval(() => setStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 1800)

    const run = async () => {
      try {
        const id = createRoadmap({ title: formData.title, examDate: formData.examDate, assessmentInfo: formData.info })
        const { overview, nodes } = await generateRoadmapNodes(formData.title, formData.examDate, formData.info, formData.options || {})
        if (cancelled) return
        updateRoadmap(id, { overview, nodes })
        // Generate daily mission
        const roadmapSnap = { title: formData.title, examDate: formData.examDate, nodes, learningProfile: {} }
        const mission = await generateDailyMission(roadmapSnap)
        if (cancelled) return
        setDailyMission(id, mission)
        clearInterval(stepInterval)
        onDone()
      } catch (e) {
        if (!cancelled) setError('Generation failed — check your connection and try again.')
        clearInterval(stepInterval)
      }
    }
    run()
    return () => { cancelled = true; clearInterval(stepInterval) }
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>Aeva is building your roadmap</div>
        <motion.div key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
          {GEN_STEPS[step]}
        </motion.div>
      </div>
      {/* Step dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {GEN_STEPS.map((_, i) => (
          <motion.div key={i} animate={{ background: i <= step ? '#6366F1' : 'rgba(255,255,255,0.15)' }}
            style={{ width: 6, height: 6, borderRadius: '50%' }} />
        ))}
      </div>
      {error && <div style={{ fontSize: 13, color: '#F87171', fontWeight: 500, textAlign: 'center' }}>{error}</div>}
    </motion.div>
  )
}

async function generateDailyMission(roadmap) {
  const daysLeft   = Math.max(1, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
  const available  = roadmap.nodes?.find(n => n.status === 'available')
  const weak       = roadmap.learningProfile?.weak || []
  const completed  = roadmap.nodes?.filter(n => n.status === 'complete').map(n => n.topic) || []

  const prompt = `You are Aeva. Generate today's study mission for a student.

Exam: "${roadmap.title}" — ${daysLeft} days away
Current focus topic: "${available?.topic || 'review'}"
Weak areas: ${weak.length ? weak.join(', ') : 'none detected yet'}
Completed: ${completed.length} topics

Return ONLY valid JSON:
{
  "objective": "single clear mission objective (one sentence)",
  "estimatedMinutes": 20,
  "tasks": [
    { "id": "t1", "type": "learn",     "topic": "exact topic", "label": "Learn with Aeva",   "status": "pending" },
    { "id": "t2", "type": "drill",     "topic": "exact topic", "label": "Recall Drill",       "status": "pending" },
    { "id": "t3", "type": "check",     "topic": "exact topic", "label": "Knowledge Check",    "status": "pending" }
  ]
}

Rules: 2-4 tasks. Focus on current topic. If weak areas exist, add a review task for the weakest.`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4, max_tokens: 400,
    }),
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

/* ── Node config ─────────────────────────────────────────────────────────── */
const NODE_CFG = {
  learn: { label: 'Learn with Aeva', color: '#6366F1', light: '#818CF8', shadow: '#3730A3', Icon: BookOpen },
  drill: { label: 'Drill',           color: '#F97316', light: '#FB923C', shadow: '#9A3412', Icon: Zap },
  check: { label: 'Knowledge Check', color: '#8B5CF6', light: '#A78BFA', shadow: '#5B21B6', Icon: Target },
  mock:  { label: 'Mock Test',       color: '#EF4444', light: '#F87171', shadow: '#991B1B', Icon: ClipboardList },
}

/* ── Phase config ────────────────────────────────────────────────────────── */
const PHASE_CFG = {
  'Foundation':  { color: '#3B82F6', light: '#60A5FA' },
  'Core Topics': { color: '#8B5CF6', light: '#A78BFA' },
  'Practice':    { color: '#F59E0B', light: '#FCD34D' },
  'Exam Prep':   { color: '#EF4444', light: '#F87171' },
}

/* X position pattern — creates the winding snake */
const X_PATTERN = [50, 65, 72, 62, 50, 38, 28, 38]
const NODE_SPACING = 172  // px between nodes vertically (extra room for labels + phase banners)
const NODE_R       = 38   // node circle radius (76px diameter)
const TOP_PAD      = 32

function PathView() {
  const { getActive, completeNode, closeRoadmapHub, startNodeSession, endNodeSession } = useRoadmapStore()
  const { openLab, addOrder, setLabTab, setPendingAutoStart } = useLabStore()
  const { addXP } = useXPStore()
  const { setPendingChatPrompt } = useAevaControlStore()
  const roadmap = getActive()
  const [selected, setSelected]     = useState(null)
  const [startedIds, setStartedIds] = useState(new Set())
  const containerRef = useRef(null)
  const scrollRef    = useRef(null)
  const [cw, setCw]  = useState(360)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Scroll to current available node on mount
  useEffect(() => {
    if (!scrollRef.current || !roadmap?.nodes) return
    const idx = roadmap.nodes.findIndex(n => n.status === 'available')
    if (idx < 0) return
    const y = idx * NODE_SPACING + TOP_PAD + NODE_R
    setTimeout(() => scrollRef.current?.scrollTo({ top: Math.max(0, y - 240), behavior: 'smooth' }), 300)
  }, [roadmap?.id])

  if (!roadmap?.nodes?.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
      No roadmap loaded
    </div>
  )

  const nodes      = roadmap.nodes
  const daysLeft   = Math.max(0, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
  const available  = nodes.find(n => n.status === 'available')
  const containerH = nodes.length * NODE_SPACING + TOP_PAD + 120

  // All nodes done → trophy screen
  if (nodes.every(n => n.status === 'complete')) {
    return <CompletionView roadmap={roadmap} daysLeft={daysLeft} />
  }

  const getX = (i) => (X_PATTERN[i % X_PATTERN.length] / 100) * cw
  const getY = (i) => i * NODE_SPACING + TOP_PAD + NODE_R

  const launchNode = (node) => {
    setSelected(null)
    setStartedIds(prev => new Set([...prev, node.id]))
    startNodeSession(roadmap.id, node)

    if (node.type === 'learn') {
      // Close hub → Aeva chat fires a curated teaching session
      setPendingChatPrompt(
        `Teach me "${node.topic}" for my ${roadmap.title}. ${node.description ? node.description + ' ' : ''}I have ${daysLeft} days until the exam. Start from the core concepts, use examples, and check my understanding as we go.`
      )
      closeRoadmapHub()
    } else if (node.type === 'drill') {
      setPendingAutoStart('flashcard', node.topic)
      closeRoadmapHub()
      openLab()
    } else if (node.type === 'check') {
      setPendingAutoStart('shortanswer', node.topic)
      closeRoadmapHub()
      openLab()
    } else if (node.type === 'mock') {
      addOrder({
        title: `Mock Test — ${roadmap.title}`,
        description: `Full mock test covering all topics in ${roadmap.title}. ${daysLeft} days until exam. Be strict with marking.`,
        subject: roadmap.title,
      })
      closeRoadmapHub()
      setLabTab('orders')
      openLab()
    }
  }

  const markDone = (node) => {
    completeNode(roadmap.id, node.id)
    addXP('DRILL_COMPLETE')
    endNodeSession()
    setStartedIds(prev => { const n = new Set(prev); n.delete(node.id); return n })
    setSelected(null)
  }

  const mission      = roadmap.dailyMission
  const missionTasks = mission?.tasks || []

  return (
    <motion.div ref={scrollRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* ── Mission card ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '16px 20px 0' }}>
        <div style={{
          borderRadius: 20, padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(79,70,229,0.55) 0%, rgba(124,58,237,0.45) 100%)',
          border: '1px solid rgba(99,102,241,0.35)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.20)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 4 }}>Today's Mission</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                {available ? `Master ${available.topic}` : '🎉 Roadmap complete!'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{daysLeft}d</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>until exam</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Readiness</span>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>{roadmap.readiness}%</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${roadmap.readiness}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #818CF8, #C4B5FD)' }}
              />
            </div>
          </div>

          {/* Mission tasks — use generated daily mission if available */}
          {(missionTasks.length > 0 || available) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
              {(missionTasks.length > 0 ? missionTasks : ['learn','drill','check'].map((type,i) => ({ id: `t${i}`, type, topic: available?.topic, label: NODE_CFG[type].label, status: 'pending' }))).map(task => {
                const cfg = NODE_CFG[task.type] || NODE_CFG.learn
                const done = task.status === 'complete'
                const TaskIcon = cfg.Icon
                return (
                  <motion.button key={task.id}
                    whileHover={!done ? { scale: 1.02, background: 'rgba(255,255,255,0.14)' } : {}}
                    whileTap={!done ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (done) return
                      const t = { id: task.id, topic: task.topic, type: task.type }
                      if (t.type === 'learn') {
                        setPendingChatPrompt(`Teach me "${t.topic}" for my ${roadmap.title}. I have ${daysLeft} days until the exam.`)
                        closeRoadmapHub()
                      } else if (t.type === 'drill') {
                        setPendingAutoStart('flashcard', t.topic); closeRoadmapHub(); openLab()
                      } else if (t.type === 'check') {
                        setPendingAutoStart('shortanswer', t.topic); closeRoadmapHub(); openLab()
                      } else if (t.type === 'mock') {
                        addOrder({ title: `Mock Test — ${roadmap.title}`, description: `Full mock test on ${roadmap.title}.`, subject: roadmap.title }); closeRoadmapHub(); setLabTab('orders'); openLab()
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 11,
                      background: done ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.10)',
                      border: done ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.12)',
                      cursor: done ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      opacity: done ? 0.7 : 1,
                    }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? 'rgba(74,222,128,0.18)' : `${cfg.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done ? <Check size={14} color="#4ADE80" strokeWidth={3} /> : <TaskIcon size={14} color={cfg.color} strokeWidth={2.2} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#4ADE80' : '#fff' }}>{task.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{task.topic}</div>
                    </div>
                    {!done && <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>+{task.type === 'check' ? 40 : task.type === 'drill' ? 30 : 50} XP</div>}
                  </motion.button>
                )
              })}
              {mission?.estimatedMinutes && (
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 4, paddingLeft: 2 }}>
                  ⏱ Est. {mission.estimatedMinutes} min
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {(() => {
        const doneNodes = nodes.filter(n => n.status === 'complete')
        const remMins   = nodes.filter(n => n.status !== 'complete').reduce((s, n) => s + (n.estimatedMinutes || 20), 0)
        const earnedXP  = doneNodes.reduce((s, n) => s + (n.xp || 50), 0)
        const remH = Math.floor(remMins / 60), remM = remMins % 60
        const stats = [
          { label: 'STEPS',     value: `${doneNodes.length}/${nodes.length}` },
          { label: 'XP',        value: earnedXP.toString() },
          { label: 'TIME LEFT', value: remH > 0 ? `${remH}h ${remM}m` : `${remM}m` },
          { label: 'READY',     value: `${roadmap.readiness}%`, green: roadmap.readiness >= 60 },
        ]
        return (
          <div style={{ display: 'flex', flexShrink: 0, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 14 }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', padding: '2px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: s.green ? '#4ADE80' : '#fff', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.10em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Path ─────────────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: containerH, margin: '24px 0 40px' }}>
        {/* SVG connecting curves */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: containerH, pointerEvents: 'none' }}>
          {nodes.slice(0, -1).map((node, i) => {
            const x1 = getX(i),     y1 = getY(i)
            const x2 = getX(i + 1), y2 = getY(i + 1)
            const cy = (y1 + y2) / 2
            const d  = `M ${x1} ${y1} C ${x1} ${cy} ${x2} ${cy} ${x2} ${y2}`
            const done = node.status === 'complete'
            const pc   = PHASE_CFG[node.phase] || null
            const lineColor = done ? 'rgba(74,222,128,0.65)' : pc ? `${pc.color}55` : 'rgba(99,102,241,0.35)'
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} strokeLinecap="round" />
                <path d={d} fill="none" stroke={lineColor}
                  strokeWidth={4} strokeDasharray={done ? undefined : '8 6'} strokeLinecap="round" />
              </g>
            )
          })}
        </svg>

        {/* Phase banners — float in the gap at each phase transition */}
        {nodes.map((node, i) => {
          if (!node.phase || i === 0) return null
          if (node.phase === nodes[i - 1]?.phase) return null
          const bannerY = Math.round((getY(i - 1) + getY(i)) / 2) - 11  // centred in gap between the two nodes
          const pc = PHASE_CFG[node.phase] || PHASE_CFG['Core Topics']
          return (
            <div key={`pb_${i}`} style={{
              position: 'absolute', top: bannerY, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
              borderRadius: 99, background: `${pc.color}14`, border: `1px solid ${pc.color}38`,
              zIndex: 2, whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: pc.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, color: pc.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{node.phase}</span>
            </div>
          )
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const x = getX(i), y = getY(i)
          const cfg = NODE_CFG[node.type] || NODE_CFG.learn
          const { Icon } = cfg
          const isComplete  = node.status === 'complete'
          const isAvailable = node.status === 'available'
          const isSelected  = selected?.id === node.id

          // 3D gradient + bottom shadow colours
          const nodeBg     = isComplete ? 'linear-gradient(180deg,#86EFAC 0%,#22C55E 55%,#15803D 100%)'
            : isAvailable  ? `linear-gradient(180deg,${cfg.light} 0%,${cfg.color} 55%,${cfg.shadow} 100%)`
            :                'linear-gradient(180deg,#4B5563 0%,#374151 55%,#1F2937 100%)'
          const nodeShadow = isComplete ? '0 7px 0 #166534, 0 14px 28px rgba(34,197,94,0.30)'
            : isAvailable  ? `0 7px 0 ${cfg.shadow}, 0 14px 28px ${cfg.color}44`
            :                '0 5px 0 #111827'

          return (
            <div key={node.id} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 10 : 1 }}>
              {/* Soft glow behind available node */}
              {isAvailable && (
                <motion.div animate={{ opacity: [0.45, 0.75, 0.45] }} transition={{ duration: 2.2, repeat: Infinity }}
                  style={{ position: 'absolute', inset: -14, borderRadius: '50%', background: `radial-gradient(circle, ${cfg.color}50 0%, transparent 70%)`, pointerEvents: 'none' }} />
              )}

              {/* 3D circle */}
              <motion.button
                whileHover={isAvailable || isComplete ? { translateY: -2, boxShadow: isComplete ? '0 9px 0 #166534, 0 18px 32px rgba(34,197,94,0.35)' : `0 9px 0 ${cfg.shadow}, 0 18px 32px ${cfg.color}55` } : {}}
                whileTap={isAvailable ? { translateY: 3, boxShadow: isComplete ? '0 4px 0 #166534' : `0 4px 0 ${cfg.shadow}` } : {}}
                onClick={() => isAvailable ? setSelected(isSelected ? null : node) : null}
                style={{
                  width: NODE_R * 2, height: NODE_R * 2, borderRadius: '50%',
                  background: nodeBg, border: 'none',
                  boxShadow: nodeShadow,
                  cursor: isAvailable ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!isComplete && !isAvailable) ? 0.55 : 1,
                  transition: 'opacity 0.2s',
                }}>
                {isComplete
                  ? <Check size={22} color="#fff" strokeWidth={3} />
                  : isAvailable
                    ? <Icon size={20} color="#fff" strokeWidth={2.2} />
                    : <Lock size={16} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                }
              </motion.button>

              {/* Topic label */}
              <div style={{
                position: 'absolute', top: NODE_R * 2 + 14,
                left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', textAlign: 'center',
                fontSize: 11.5, fontWeight: isAvailable ? 700 : 500,
                color: isComplete ? '#4ADE80' : isAvailable ? '#fff' : 'rgba(255,255,255,0.28)',
                letterSpacing: isAvailable ? '-0.01em' : 0,
              }}>
                {node.topic}
              </div>

              {/* Popup card — floats above the node */}
              <AnimatePresence>
                {isSelected && (() => {
                  const isStarted = startedIds.has(node.id)
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.88, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.88, y: 6 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                      style={{
                        position: 'absolute',
                        bottom: NODE_R * 2 + 18,
                        left: '50%', transform: 'translateX(-50%)',
                        width: 216, borderRadius: 16, zIndex: 20,
                        background: 'rgba(8,9,24,0.97)',
                        border: `1px solid ${cfg.color}50`,
                        boxShadow: `0 16px 48px rgba(0,0,0,0.70), 0 0 0 1px ${cfg.color}18`,
                        padding: '14px 16px 16px',
                      }}>
                      {/* Phase badge */}
                      {node.phase && (() => {
                        const pc = PHASE_CFG[node.phase] || PHASE_CFG['Core Topics']
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: `${pc.color}18`, border: `1px solid ${pc.color}38`, marginBottom: 8 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: pc.color }} />
                            <span style={{ fontSize: 9.5, fontWeight: 800, color: pc.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{node.phase}</span>
                          </div>
                        )
                      })()}
                      {/* Topic + type */}
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', marginBottom: 2, letterSpacing: '-0.02em' }}>{node.topic}</div>
                      <div style={{ fontSize: 10.5, color: cfg.light, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{cfg.label}</div>
                      {/* Difficulty dots + time + XP */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1,2,3,4,5].map(d => (
                            <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: d <= (node.difficulty || 1) ? cfg.color : 'rgba(255,255,255,0.10)' }} />
                          ))}
                        </div>
                        {node.estimatedMinutes && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>
                            <Clock size={10} />{node.estimatedMinutes}m
                          </div>
                        )}
                        <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: cfg.color }}>+{node.xp || 50} XP</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', marginBottom: 14, lineHeight: 1.55 }}>{node.description || 'Click below to begin this step.'}</div>

                      {isStarted ? (
                        /* Already launched — show Mark Done */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => markDone(node)}
                            style={{
                              width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                              background: 'linear-gradient(135deg,#16a34a,#22C55E)',
                              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                            <Check size={14} strokeWidth={3} /> Mark as Done · +{node.xp || 50} XP
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => launchNode(node)}
                            style={{
                              width: '100%', padding: '8px 0', borderRadius: 10, border: `1px solid ${cfg.color}40`,
                              background: 'transparent', color: cfg.light, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            Go again
                          </motion.button>
                        </div>
                      ) : node.type === 'mock' && roadmap.readiness < 60 ? (
                        /* Readiness gate — mock locked until 60% */
                        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F87171', marginBottom: 4 }}>🔒 Not ready yet</div>
                          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55 }}>
                            Complete more steps to reach <span style={{ color: '#F87171', fontWeight: 700 }}>60% readiness</span> before the mock. You're at {roadmap.readiness}% now.
                          </div>
                          <div style={{ marginTop: 10, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#F97316,#EF4444)', width: `${(roadmap.readiness / 60) * 100}%`, transition: 'width 0.5s ease' }} />
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'right' }}>{roadmap.readiness}/60% needed</div>
                        </div>
                      ) : (
                        /* Not started yet — launch button */
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => launchNode(node)}
                          style={{
                            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.shadow})`,
                            boxShadow: `0 4px 14px ${cfg.color}55`,
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                          <Icon size={14} strokeWidth={2.5} />
                          {node.type === 'learn' ? 'Ask Aeva' : node.type === 'drill' ? 'Start Drill' : node.type === 'check' ? 'Take Quiz' : 'Start Mock Test'}
                          <span style={{ opacity: 0.75, fontSize: 11 }}>+{node.xp || 50} XP</span>
                        </motion.button>
                      )}

                      {/* Down-pointing caret */}
                      <div style={{
                        position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '9px solid transparent',
                        borderRight: '9px solid transparent',
                        borderTop: `9px solid rgba(8,9,24,0.97)`,
                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
                      }} />
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function CompletionView({ roadmap, daysLeft }) {
  const totalXP   = roadmap.nodes?.reduce((s, n) => s + (n.xp || 50), 0) || 0
  const nodeCount = roadmap.nodes?.length || 0

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', overflowY: 'auto' }}>

      {/* Trophy */}
      <motion.div
        animate={{ scale: [1, 1.10, 1], rotate: [0, -3, 3, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
        style={{
          width: 90, height: 90, borderRadius: 28, marginBottom: 28,
          background: 'linear-gradient(145deg, #FBBF24 0%, #F59E0B 55%, #D97706 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 0 #92400E, 0 18px 40px rgba(251,191,36,0.35)',
        }}>
        <Trophy size={42} color="#fff" strokeWidth={2} />
      </motion.div>

      <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 10 }}>Roadmap Complete!</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, maxWidth: 290, marginBottom: 32 }}>
        You've mastered all {nodeCount} steps of your prep path. Based on your work, you're on track to score{' '}
        <span style={{ color: '#4ADE80', fontWeight: 800 }}>90%+</span>
        {daysLeft > 0 ? ` in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : ' on exam day'}.
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 36 }}>
        {[
          { value: '100%',    label: 'READINESS', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)' },
          { value: totalXP,   label: 'XP EARNED',  color: '#818CF8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.22)' },
          { value: nodeCount, label: 'STEPS DONE', color: '#4ADE80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.22)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px 16px', borderRadius: 18, background: s.bg, border: `1px solid ${s.border}`, textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', fontWeight: 700, letterSpacing: '0.10em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
        Keep chatting with Aeva to stay sharp before exam day 🎯
      </div>
    </motion.div>
  )
}
