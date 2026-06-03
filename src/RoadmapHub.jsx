import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Plus, Map, Calendar, Upload, Sparkles, FileText, BookOpen, Zap, Target, ClipboardList, Check, Lock } from 'lucide-react'
import { useRoadmapStore } from './roadmapStore'
import { useLabStore } from './labStore'
import { useXPStore } from './xpStore'
import { useAevaControlStore } from './aevaControlStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function generateRoadmapNodes(title, examDate, assessmentInfo) {
  const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - Date.now()) / 86400000))
  const prompt = `You are Aeva, an AI tutor. Generate a structured exam preparation roadmap.

Exam: "${title}"
Date: ${examDate} (${daysLeft} days away)${assessmentInfo ? `\n\nAssessment info:\n${assessmentInfo}` : ''}

Return ONLY valid JSON:
{
  "overview": "2-sentence description of what this exam covers and what matters most",
  "nodes": [
    {
      "id": "n1",
      "topic": "Topic Name",
      "type": "learn",
      "difficulty": 2,
      "estimatedMinutes": 20,
      "xp": 50,
      "description": "One sentence: what the student gains from this step"
    }
  ]
}

Rules:
- 10-14 nodes total
- Cover all major topics from the assessment info (or infer from title)
- Each main topic: 1 learn node + 1 drill node minimum
- type must be one of: learn, drill, check, mock
- First node: type "learn", easiest foundational topic
- Last node: type "mock"
- difficulty 1-5
- xp: learn=50, drill=30, check=40, mock=100
- Topic names: 2-4 words max
- Order by prerequisites (foundations first)`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 1800,
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
  const [view, setView]         = useState('home') // home | create | generating | path
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
          <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8 }}>No roadmaps yet</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 28 }}>Create a roadmap and Aeva builds your entire exam prep path — missions, drills, everything.</div>
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
            return (
              <div key={r.id} style={{ width: '100%', maxWidth: 480 }}>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div onClick={() => { setActive(r.id); onOpen() }} style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{daysLeft}d left · {completed}/{total} steps</div>
                    </div>
                    <motion.button whileHover={{ color: '#F87171' }} whileTap={{ scale: 0.9 }}
                      onClick={() => setConfirmDelete(confirmDelete === r.id ? null : r.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '2px 6px', fontSize: 16, lineHeight: 1 }}>
                      ···
                    </motion.button>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)', width: `${r.readiness}%`, transition: 'width 0.5s ease' }} />
                  </div>
                  {/* Delete confirm */}
                  <AnimatePresence>
                    {confirmDelete === r.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <motion.button whileTap={{ scale: 0.96 }} onClick={() => { deleteRoadmap(r.id); setConfirmDelete(null) }}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Delete roadmap
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirmDelete(null)}
                          style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Cancel
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            )
          })}
        </>
      )}
    </motion.div>
  )
}

function CreateView({ onGenerate }) {
  const [title, setTitle]       = useState('')
  const [examDate, setExamDate] = useState('')
  const [info, setInfo]         = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')
  const fileRef                 = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = e => setInfo(prev => prev ? prev + '\n\n' + e.target.result : e.target.result)
    reader.readAsText(f)
  }

  const handleGenerate = () => {
    if (!title.trim() || !examDate) { setError('Add a title and exam date to continue.'); return }
    setError('')
    onGenerate({ title: title.trim(), examDate, info })
  }

  const field = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.88)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ flex: 1, padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 18 }}>

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

        {/* Assessment info */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Assessment Info <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.25)' }}>— optional</span>
          </label>
          <textarea
            value={info} onChange={e => setInfo(e.target.value)}
            placeholder="Paste rubrics, learning outcomes, study guides, teacher instructions…"
            rows={5}
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
          style={{ border: '2px dashed rgba(255,255,255,0.10)', borderRadius: 12, padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }}>
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
          <Sparkles size={15} /> Generate Roadmap
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
        const { overview, nodes } = await generateRoadmapNodes(formData.title, formData.examDate, formData.info)
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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
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

/* X position pattern — creates the winding snake */
const X_PATTERN = [50, 65, 72, 62, 50, 38, 28, 38]
const NODE_SPACING = 148  // px between nodes vertically
const NODE_R       = 38   // node circle radius (76px diameter)
const TOP_PAD      = 32

function PathView() {
  const { getActive, completeNode, closeRoadmapHub, startNodeSession, endNodeSession } = useRoadmapStore()
  const { openLab, addOrder, setLabTab, setPendingAutoStart } = useLabStore()
  const { addXP } = useXPStore()
  const { setPendingChatPrompt, requestChatView } = useAevaControlStore()
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
    const y = idx * NODE_SPACING + TOP_PAD
    setTimeout(() => scrollRef.current?.scrollTo({ top: Math.max(0, y - 220), behavior: 'smooth' }), 300)
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

  const mission     = roadmap.dailyMission
  const missionTasks = mission?.tasks || []
  const missionDate  = mission?.date
  const isToday      = missionDate === new Date().toDateString()

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
            return (
              <g key={i}>
                {/* Rail — faint background track */}
                <path d={d} fill="none"
                  stroke="rgba(255,255,255,0.07)" strokeWidth={5} strokeLinecap="round" />
                {/* Progress line */}
                <path d={d} fill="none"
                  stroke={done ? 'rgba(74,222,128,0.60)' : 'rgba(99,102,241,0.30)'}
                  strokeWidth={4} strokeDasharray="8 6" strokeLinecap="round" />
              </g>
            )
          })}
        </svg>

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
                      {/* Topic + type */}
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2, letterSpacing: '-0.02em' }}>{node.topic}</div>
                      <div style={{ fontSize: 11, color: cfg.light, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{cfg.label}</div>
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
