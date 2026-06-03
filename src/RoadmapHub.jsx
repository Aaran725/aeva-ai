import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Plus, Map, Calendar, Upload, Sparkles, FileText } from 'lucide-react'
import { useRoadmapStore } from './roadmapStore'

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
  const [view, setView] = useState('home') // home | create | generating | path

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
          {view === 'create'     && <CreateView     key="create"     onGenerate={() => setView('path')} />}
          {view === 'generating' && <GeneratingView key="generating" onDone={() => setView('path')} />}
          {view === 'path'       && <PathView       key="path" />}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function HomeView({ onCreate, onOpen }) {
  const { roadmaps, setActive } = useRoadmapStore()
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: roadmaps.length ? 'flex-start' : 'center', padding: 24, gap: 16 }}>
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
        roadmaps.map(r => (
          <motion.div key={r.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => { setActive(r.id); onOpen() }}
            style={{ width: '100%', maxWidth: 480, padding: '18px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Readiness {r.readiness}% · {r.nodes?.length || 0} steps</div>
          </motion.div>
        ))
      )}
    </motion.div>
  )
}

function CreateView({ onGenerate }) {
  const { createRoadmap, updateRoadmap, getActive } = useRoadmapStore()
  const [title, setTitle]           = useState('')
  const [examDate, setExamDate]     = useState('')
  const [info, setInfo]             = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const fileRef                     = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = e => setInfo(prev => prev ? prev + '\n\n' + e.target.result : e.target.result)
    reader.readAsText(f)
  }

  const handleGenerate = async () => {
    if (!title.trim() || !examDate) { setError('Add a title and exam date to continue.'); return }
    setError('')
    setLoading(true)
    try {
      const id = createRoadmap({ title: title.trim(), examDate, assessmentInfo: info })
      const { overview, nodes } = await generateRoadmapNodes(title.trim(), examDate, info)
      updateRoadmap(id, { overview, nodes })
      onGenerate()
    } catch (e) {
      setError('Generation failed — check your connection and try again.')
    }
    setLoading(false)
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
          disabled={loading}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
            background: loading ? 'rgba(99,102,241,0.30)' : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading
            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Building roadmap…</>
            : <><Sparkles size={15} /> Generate Roadmap</>
          }
        </motion.button>

      </div>
    </motion.div>
  )
}

function GeneratingView({ onDone }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Aeva is building your roadmap…</div>
    </motion.div>
  )
}

function PathView() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Path view coming next</div>
    </motion.div>
  )
}
