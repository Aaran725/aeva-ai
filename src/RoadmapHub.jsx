import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Plus, Map, Calendar, Upload, Sparkles, FileText, BookOpen, Zap, Target, ClipboardList, Check, Lock, Clock, Trophy, Trash2, Brain, Dumbbell, GraduationCap, FlaskConical, Share2, Copy, AlertTriangle, RotateCcw } from 'lucide-react'
import WidgetToggle from './WidgetToggle'
import FeatureSpotlight from './FeatureSpotlight'
import { useRoadmapStore, calcGrade, gradeGapMessage, GRADE_THRESHOLDS } from './roadmapStore'
import { ExamSimulatorButton } from './ExamSimulator'
import { DotMatrix } from './WidgetDashboard'
import { useLabStore } from './labStore'
import { useSRStore } from './srStore'
import { supabase } from './supabase'
import { useXPStore } from './xpStore'
import { useAevaControlStore } from './aevaControlStore'
import { nextGroqKey as gKey, GROQ_URL } from './groqClient'

export async function generateRoadmapNodes(title, examDate, assessmentInfo, options = {}) {
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
      "description": "One sentence: exactly what the student will learn or practise in this step",
      "subtopics": ["Specific subtopic 1", "Specific subtopic 2", "Specific subtopic 3"]
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
SUBTOPICS: For every "learn" node include 3-5 specific exam-relevant subtopics that will be covered (e.g. for "Photosynthesis": ["Light-dependent reactions & photolysis", "Photosystem I & II electron transport", "Calvin cycle & carbon fixation", "Factors limiting rate"]). For drill/check/mock nodes, subtopics may be omitted or left as [].
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

/* ── Share modal ────────────────────────────────────────────────── */
function ShareModal({ roadmap, onClose }) {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setState('loading')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState('error'); return }
      const code = Math.random().toString(36).slice(2, 10)
      const { error } = await supabase.from('shared_roadmaps').upsert({
        share_code: code,
        roadmap,
        owner_id: session.user.id,
        title: roadmap.title,
      }, { onConflict: 'share_code' })
      if (error) throw error
      const url = `${window.location.origin}/r/${code}`
      setShareUrl(url)
      setState('done')
    } catch {
      setState('error')
    }
  }

  useEffect(() => { generate() }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(4,5,18,0.80)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(12,13,32,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 26, maxWidth: 380, width: '100%', fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={15} color="#A5B4FC" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Share Roadmap</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={17} /></button>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 18, lineHeight: 1.6 }}>
          Anyone with this link can view <strong style={{ color: 'rgba(255,255,255,0.80)' }}>{roadmap.title}</strong> and clone it to their own account.
        </div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>Generating link…</motion.div>
          </div>
        )}

        {state === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 14px', fontSize: 12.5, color: 'rgba(255,255,255,0.60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shareUrl}
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 11, background: copied ? 'rgba(16,185,129,0.18)' : 'rgba(99,102,241,0.18)', border: `1px solid ${copied ? 'rgba(16,185,129,0.40)' : 'rgba(99,102,241,0.40)'}`, color: copied ? '#4ADE80' : '#A5B4FC', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
              </motion.button>
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>
              🔗 Public link — anyone can view and clone this roadmap
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', color: '#FF8C6B', fontSize: 13, padding: '12px 0' }}>
            Failed to generate link. Make sure you're signed in.
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function RoadmapHub() {
  const { roadmapOpen, closeRoadmapHub, roadmaps, getActive } = useRoadmapStore()
  const [view, setView] = useState(() => {
    const active = useRoadmapStore.getState().getActive()
    return active?.nodes?.length ? 'path' : 'home'
  })
  const [pendingForm, setPending] = useState(null)  // holds form data during generation
  const [showShare, setShowShare] = useState(false)
  const [widgetMode, setWidgetMode] = useState(() => localStorage.getItem('aeva_roadmap_widget') === '1')
  const toggleWidget = () => setWidgetMode(m => { const n = !m; localStorage.setItem('aeva_roadmap_widget', n ? '1' : '0'); return n })

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
            <>
              <WidgetToggle active={widgetMode} onToggle={toggleWidget} />
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setView('create')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.40)', color: '#A5B4FC', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={13} /> New
              </motion.button>
            </>
          )}
          {view === 'path' && active && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setShowShare(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Share2 size={13} /> Share
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={closeRoadmapHub}
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </motion.button>
        </div>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && active && <ShareModal roadmap={active} onClose={() => setShowShare(false)} />}
      </AnimatePresence>

      {/* Feature spotlight */}
      {view === 'path' && (
        <FeatureSpotlight
          id="roadmap"
          icon="🗺️"
          title="Aeva edits your roadmap live"
          body={"Chat with Aeva about your roadmap — she can flag urgent topics, remove nodes you don't need, and inject new ones mid-conversation. Tap \"Ask Aeva to review\" on the path view to start."}
          accentColor="#818CF8"
        />
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {view === 'home'       && <HomeView       key="home"       onCreate={() => setView('create')} onOpen={() => setView('path')} widgetMode={widgetMode} />}
          {view === 'create'     && <CreateView     key="create"     onGenerate={(fd) => { setPending(fd); setView('generating') }} />}
          {view === 'generating' && <GeneratingView key="generating" formData={pendingForm} onDone={() => { setPending(null); setView('path') }} />}
          {view === 'path'       && <PathView       key="path" />}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ═══ Ai OS LED gradient themes (by readiness band) ═══ */
const ROADMAP_WIDGET_THEMES = {
  high: {   // 80+ / complete → Sleep card (teal)
    bg: 'radial-gradient(circle at 50% 44%, #3DE8D0 0%, #1FC8B2 30%, #14A092 52%, rgba(20,160,146,0) 72%), linear-gradient(165deg, #18B0A0 0%, #0E8A80 38%, #0A6A66 68%, #084E50 100%)',
    dot: 'rgba(190,255,244,0.97)', accent: '#5EEAD4', sub: '#BFF5EC', chipBg: 'rgba(94,234,212,0.16)', chipBorder: 'rgba(94,234,212,0.34)',
  },
  mid: {    // 60-79 → Skin Damage card (navy)
    bg: 'radial-gradient(circle at 52% 56%, #2E64E0 0%, #1E48C4 30%, #122E96 54%, rgba(18,46,150,0) 76%), linear-gradient(200deg, #0C1A78 0%, #0A1466 38%, #080F50 70%, #060A3C 100%)',
    dot: 'rgba(205,225,255,0.97)', accent: '#93C5FD', sub: '#BFD4FF', chipBg: 'rgba(147,197,253,0.16)', chipBorder: 'rgba(147,197,253,0.34)',
  },
  low: {    // 40-59 → Balance card (lavender)
    bg: 'radial-gradient(ellipse 110% 85% at 42% 28%, #C9ABDC 0%, #B492CE 42%, rgba(180,146,206,0) 78%), linear-gradient(160deg, #B69ECC 0%, #A082BE 38%, #8A6CA8 68%, #6E5290 100%)',
    dot: 'rgba(255,255,255,0.97)', accent: '#F0E0FF', sub: '#EADBFF', chipBg: 'rgba(255,255,255,0.18)', chipBorder: 'rgba(255,255,255,0.32)',
  },
  start: {  // <40 → Enhance card (cerise)
    bg: 'radial-gradient(circle at 46% 42%, #FF3A8E 0%, #E81E72 26%, #B01055 48%, rgba(176,16,85,0) 72%), linear-gradient(155deg, #800840 0%, #5A0230 40%, #3C0120 70%, #260114 100%)',
    dot: 'rgba(255,205,228,0.97)', accent: '#F9A8D4', sub: '#FBC8E0', chipBg: 'rgba(249,168,212,0.16)', chipBorder: 'rgba(249,168,212,0.34)',
  },
}
function readinessBand(pct, isAllDone) {
  if (isAllDone || pct >= 80) return 'high'
  if (pct >= 60) return 'mid'
  if (pct >= 40) return 'low'
  return 'start'
}

/* Ai OS gradient widget version of a roadmap card */
function WidgetRoadmapCard({ r, onOpen, onDelete, confirmDelete, setConfirmDelete }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(r.examDate) - Date.now()) / 86400000))
  const completed = r.nodes?.filter(n => n.status === 'complete').length || 0
  const total = r.nodes?.length || 0
  const isAllDone = total > 0 && completed === total
  const availNode = r.nodes?.find(n => n.status === 'available')
  const currentPhase = isAllDone ? 'Complete' : (availNode?.phase || null)
  const t = ROADMAP_WIDGET_THEMES[readinessBand(r.readiness, isAllDone)]

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.995 }}
        onClick={() => onOpen(r.id)}
        style={{ position: 'relative', borderRadius: 24, background: t.bg, padding: '18px 20px 20px', overflow: 'hidden', minHeight: 200, cursor: 'pointer', boxShadow: '0 14px 44px rgba(0,0,0,0.40)' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.62)', marginTop: 2 }}>{isAllDone ? '🎉 Complete' : (currentPhase || 'In progress')}</div>
          </div>
          <motion.button whileTap={{ scale: 0.90 }}
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(confirmDelete === r.id ? null : r.id) }}
            style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.70)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={13} />
          </motion.button>
        </div>
        {/* LED readiness */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 5, padding: '20px 0 18px' }}>
          <DotMatrix value={String(r.readiness)} color={t.dot} dimColor="rgba(255,255,255,0.06)" dotSize={8} gap={2} />
          <span style={{ fontSize: 18, fontWeight: 700, color: t.dot, marginTop: 3 }}>%</span>
        </div>
        {/* Footer stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: t.sub }}>{completed}/{total} steps · {daysLeft}d left</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ready</span>
        </div>
      </motion.div>

      {/* Simulate Exam button — below the gradient card */}
      {r.nodes?.length > 0 && (
        <div style={{ padding: '8px 0 0' }}>
          <ExamSimulatorButton
            roadmapId={r.id}
            style={{ width: '100%', padding: '10px 0', borderRadius: 14, background: 'rgba(167,139,250,0.14)', border: '1.5px solid rgba(167,139,250,0.35)', color: '#C4B5FD', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(124,58,237,0.15)' }}
          >
            <span style={{ fontSize: 15 }}>📝</span> Simulate Exam
          </ExamSimulatorButton>
        </div>
      )}

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete === r.id && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8, padding: '8px 0 0' }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => { onDelete(r.id); setConfirmDelete(null) }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.38)', color: '#F87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete roadmap
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirmDelete(null)}
                style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HomeView({ onCreate, onOpen, widgetMode }) {
  const { roadmaps, setActive, deleteRoadmap } = useRoadmapStore()
  const [confirmDelete, setConfirmDelete] = useState(null)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: roadmaps.length ? 'flex-start' : 'center', padding: 24, gap: 12, overflowY: 'auto' }}>
      {roadmaps.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 28px rgba(99,102,241,0.35)' }}>
              <Map size={26} color="white" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>Build your exam path</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6 }}>
              Tell Aeva your subject and exam date — she builds a complete node-by-node study plan, then adapts it live as you learn.
            </div>
          </div>

          {/* Feature strip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '🗺️', title: 'Full path generated in seconds', sub: 'Learn → Drill → Check nodes, phased to your exam date' },
              { icon: '🧠', title: 'Adapts as you go', sub: 'Aeva flags weak spots, skips what you know, adds what you need' },
              { icon: '⚡', title: 'Drills built in', sub: 'Every node links straight to flashcards, mock tests & more' },
            ].map((f) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCreate}
            style={{ width: '100%', padding: '15px 28px', borderRadius: 16, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 28px rgba(99,102,241,0.40)', letterSpacing: '-0.01em' }}>
            Build my first roadmap →
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div style={{ width: '100%', maxWidth: 480, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>Your Roadmaps</div>
          {widgetMode && roadmaps.map(r => (
            <WidgetRoadmapCard key={r.id} r={r}
              onOpen={(id) => { setActive(id); onOpen() }}
              onDelete={deleteRoadmap}
              confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} />
          ))}
          {!widgetMode && roadmaps.map(r => {
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
                  {/* Exam Mode entry — inside card so it gets card background */}
                  {r.nodes?.length > 0 && (
                    <div style={{ padding: '0 16px 14px' }}>
                      <ExamSimulatorButton
                        roadmapId={r.id}
                        style={{ width: '100%', padding: '9px 0', borderRadius: 12, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.30)', color: '#C4B5FD', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}
                      >
                        <span style={{ fontSize: 14 }}>📝</span> Simulate Exam
                      </ExamSimulatorButton>
                    </div>
                  )}
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
  const [title, setTitle]           = useState('')
  const [examDate, setExamDate]     = useState('')
  const [targetGrade, setTargetGrade] = useState('B')
  const [info, setInfo]             = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const [error, setError]           = useState('')
  const fileRef                     = useRef(null)

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
    onGenerate({ title: title.trim(), examDate, targetGrade, info, options: { learnCount, practiceCount, mockCount, pace } })
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

        {/* Target Grade */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Target Grade
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['A*', 'A', 'B', 'C', 'D'].map(g => {
              const gradeColors = { 'A*': '#A78BFA', 'A': '#818CF8', 'B': '#34D399', 'C': '#60A5FA', 'D': '#FBBF24' }
              const col = gradeColors[g]
              const selected = targetGrade === g
              return (
                <motion.button key={g} whileTap={{ scale: 0.92 }} onClick={() => setTargetGrade(g)}
                  style={{
                    flex: 1, padding: '12px 6px', borderRadius: 12, fontFamily: 'inherit',
                    fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em',
                    background: selected ? `${col}22` : 'rgba(255,255,255,0.04)',
                    border: selected ? `1.5px solid ${col}80` : '1.5px solid rgba(255,255,255,0.08)',
                    color: selected ? col : 'rgba(255,255,255,0.35)',
                    boxShadow: selected ? `0 0 14px ${col}30` : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {g}
                </motion.button>
              )
            })}
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
        const id = createRoadmap({ title: formData.title, examDate: formData.examDate, targetGrade: formData.targetGrade || 'B', assessmentInfo: formData.info })
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

export async function generateDailyMission(roadmap) {
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

/* ── Swimlane map constants ──────────────────────────────────────────────── */
const SWIM_PHASES = ['Foundation', 'Core Topics', 'Practice', 'Exam Prep']
const LANE_H      = 175   // px height per phase lane
const LABEL_W     = 68    // px for the phase label column
const NODE_GAP    = 132   // px between node centres horizontally
const R_AVAIL     = 27    // radius: current/available node
const R_DONE      = 19    // radius: completed node
const R_LOCK      = 15    // radius: locked node

function swimNodeR(node) {
  if (node.status === 'complete') return R_DONE
  if (node.status === 'available') return R_AVAIL
  return R_LOCK
}
function swimNodePos(node, laneNodes) {
  const laneIdx = Math.max(0, SWIM_PHASES.indexOf(node.phase))
  const lane    = laneNodes[laneIdx] || []
  const ni      = lane.indexOf(node)
  return {
    x: LABEL_W + ni * NODE_GAP + NODE_GAP / 2,
    y: laneIdx * LANE_H + LANE_H / 2,
    laneIdx,
  }
}

/* ── MapNode ─────────────────────────────────────────────────────────────── */
function MapNode({ node, laneNodes, isSelected, onSelect, drillHistory, showTip, onTipSeen }) {
  const cfg = NODE_CFG[node.type] || NODE_CFG.learn
  const { Icon } = cfg
  const { x, y } = swimNodePos(node, laneNodes)
  const isComplete  = node.status === 'complete'
  const isShaky     = isComplete && node.confidence === 'shaky'
  const isAvailable = node.status === 'available'
  const isUrgent    = !!node.urgent && !isComplete
  const isMock      = node.type === 'mock'
  const r           = swimNodeR(node)
  const clickable   = isAvailable || isComplete

  const nodeBg = isShaky   ? 'linear-gradient(180deg,#FCD34D 0%,#F59E0B 60%,#B45309 100%)'
    : isComplete  ? 'linear-gradient(180deg,#86EFAC 0%,#22C55E 60%,#15803D 100%)'
    : isAvailable ? `linear-gradient(180deg,${cfg.light} 0%,${cfg.color} 60%,${cfg.shadow} 100%)`
    :               'linear-gradient(180deg,#4B5563 0%,#374151 60%,#1F2937 100%)'

  const nodeShadow = isShaky   ? '0 5px 0 #92400E, 0 10px 20px rgba(245,158,11,0.28)'
    : isComplete  ? '0 5px 0 #166534, 0 10px 20px rgba(34,197,94,0.26)'
    : isAvailable ? `0 5px 0 ${cfg.shadow}, 0 10px 20px ${cfg.color}40`
    :               '0 3px 0 #111827'

  // drill score badge
  const drillBadge = isComplete ? (() => {
    const scores = (drillHistory || []).filter(h => h.topic.toLowerCase() === node.topic.toLowerCase())
    if (!scores.length) return null
    const best = Math.max(...scores.map(h => h.pct))
    const col  = best >= 80 ? '#4ADE80' : best >= 60 ? '#FBBF24' : '#F87171'
    const bg   = best >= 80 ? 'rgba(22,101,52,0.95)' : best >= 60 ? 'rgba(92,64,5,0.95)' : 'rgba(127,29,29,0.95)'
    return { best, col, bg }
  })() : null

  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', zIndex: isSelected ? 10 : 3 }}>
      {/* Pulsing glow — available */}
      {isAvailable && (
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.18, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
          style={{ position: 'absolute', inset: -14, borderRadius: isMock ? 10 : '50%', background: `radial-gradient(circle, ${cfg.color}50 0%, transparent 70%)`, pointerEvents: 'none' }} />
      )}
      {/* Urgent pulsing ring */}
      {isUrgent && (
        <motion.div animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.3, repeat: Infinity }}
          style={{ position: 'absolute', inset: -5, borderRadius: isMock ? 8 : '50%', border: '2px solid #F59E0B', pointerEvents: 'none', zIndex: 2 }} />
      )}

      {/* Node body */}
      <motion.button
        whileHover={clickable ? { translateY: -2 } : {}}
        whileTap={clickable ? { translateY: 2 } : {}}
        onClick={() => { if (!clickable) return; if (showTip && onTipSeen) onTipSeen(); onSelect(isSelected ? null : node) }}
        style={{
          width: r * 2, height: r * 2,
          borderRadius: isMock ? Math.max(4, r * 0.22) : '50%',
          transform: isMock ? 'rotate(45deg)' : undefined,
          background: nodeBg,
          border: isSelected ? `2px solid ${cfg.light}` : 'none',
          boxShadow: nodeShadow,
          cursor: clickable ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: (!isComplete && !isAvailable) ? 0.42 : 1,
          transition: 'opacity 0.2s', flexShrink: 0,
        }}>
        <div style={{ transform: isMock ? 'rotate(-45deg)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isShaky    ? <span style={{ fontSize: r * 0.72, lineHeight: 1 }}>◐</span>
          : isComplete ? <Check size={Math.round(r * 0.85)} color="#fff" strokeWidth={3} />
          : isAvailable ? <Icon size={Math.round(r * 0.78)} color="#fff" strokeWidth={2.2} />
          : <Lock size={Math.round(r * 0.68)} color="rgba(255,255,255,0.42)" strokeWidth={2} />}
        </div>
      </motion.button>

      {/* Urgent badge */}
      {isUrgent && (
        <div style={{ position: 'absolute', top: -4, right: -4, width: 15, height: 15, borderRadius: '50%', background: '#F59E0B', border: '2px solid rgba(8,9,24,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, fontSize: 8, fontWeight: 900, color: '#000' }}>!</div>
      )}
      {/* Injected-by-Aeva badge */}
      {node.injectedByAeva && !isComplete && (
        <div style={{ position: 'absolute', top: -4, left: -4, width: 15, height: 15, borderRadius: '50%', background: '#818CF8', border: '2px solid rgba(8,9,24,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, fontSize: 7 }}>✦</div>
      )}
      {/* Drill score badge */}
      {drillBadge && (
        <div style={{ position: 'absolute', bottom: -3, right: r * -0.70, background: drillBadge.bg, color: drillBadge.col, fontSize: 8.5, fontWeight: 900, padding: '2px 4px', borderRadius: 5, border: `1.5px solid ${drillBadge.col}60`, zIndex: 5, whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {drillBadge.best}%
        </div>
      )}

      {/* Topic label */}
      <div style={{
        position: 'absolute', top: r * 2 + 7, left: '50%', transform: 'translateX(-50%)',
        whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none',
        fontSize: 10, fontWeight: isAvailable ? 700 : 500,
        color: isShaky ? '#FCD34D' : isComplete ? '#4ADE80' : isUrgent ? '#FCD34D' : isAvailable ? '#fff' : 'rgba(255,255,255,0.25)',
        maxWidth: NODE_GAP - 10, overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {node.topic}
      </div>

      {/* YOU ARE HERE badge */}
      {isAvailable && (
        <motion.div animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 1.8, repeat: Infinity }}
          style={{ position: 'absolute', top: r * 2 + 22, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 99, background: `${cfg.color}20`, border: `1px solid ${cfg.color}50`, pointerEvents: 'none' }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
          <span style={{ fontSize: 7.5, fontWeight: 800, color: cfg.color, letterSpacing: '0.10em' }}>YOU ARE HERE</span>
        </motion.div>
      )}

      {/* First-session tip — floats above the first available node, dismisses on tap */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute', bottom: r * 2 + 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none', whiteSpace: 'nowrap' }}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Bubble */}
              <div style={{
                background: 'rgba(255,255,255,0.96)',
                borderRadius: 10, padding: '7px 12px',
                fontSize: 11.5, fontWeight: 700, color: '#12103a',
                boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                Tap to start your first session
                <span style={{ fontSize: 13 }}>→</span>
              </div>
              {/* Downward arrow */}
              <div style={{
                position: 'absolute', bottom: -5, left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 10, height: 10,
                background: 'rgba(255,255,255,0.96)',
                boxShadow: '2px 2px 4px rgba(0,0,0,0.15)',
              }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── SwimlaneMap ─────────────────────────────────────────────────────────── */
function SwimlaneMap({ nodes, roadmap, selected, onSelect, drillHistory }) {
  const [zoom, setZoom] = useState(1.0)
  const [tipSeen, setTipSeen] = useState(() => !!localStorage.getItem('aeva_first_node_seen'))
  const firstAvailNode = !tipSeen ? nodes.find(n => n.status === 'available') : null
  const handleTipSeen = () => { localStorage.setItem('aeva_first_node_seen', '1'); setTipSeen(true) }

  const laneNodes    = SWIM_PHASES.map(phase => nodes.filter(n => n.phase === phase))
  const maxLaneCount = Math.max(...laneNodes.map(l => l.length), 1)
  const canvasW      = LABEL_W + maxLaneCount * NODE_GAP + 64
  const canvasH      = SWIM_PHASES.length * LANE_H

  // SVG progress trail: iterate roadmap order, draw path between each consecutive pair
  const pathSegs = nodes.slice(0, -1).map((node, i) => {
    const p1 = swimNodePos(node, laneNodes)
    const p2 = swimNodePos(nodes[i + 1], laneNodes)
    const isDone  = node.status === 'complete'
    const isShaky = isDone && node.confidence === 'shaky'
    let d
    if (p1.laneIdx === p2.laneIdx) {
      // Same lane — horizontal S-curve
      const mx = (p1.x + p2.x) / 2
      d = `M ${p1.x} ${p1.y} C ${mx} ${p1.y} ${mx} ${p2.y} ${p2.x} ${p2.y}`
    } else {
      // Cross-lane — vertical S-curve
      const my = (p1.y + p2.y) / 2
      d = `M ${p1.x} ${p1.y} C ${p1.x} ${my} ${p2.x} ${my} ${p2.x} ${p2.y}`
    }
    return { d, isDone, isShaky }
  })

  const lastNode = nodes[nodes.length - 1]
  const lastPos  = lastNode ? swimNodePos(lastNode, laneNodes) : null

  return (
    <div style={{ position: 'relative', margin: '12px 0 4px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 20, display: 'flex', gap: 4 }}>
        {[{label:'+', fn: z => Math.min(1.3, +(z+0.15).toFixed(2))}, {label:'−', fn: z => Math.max(0.55, +(z-0.15).toFixed(2))}].map(btn => (
          <motion.button key={btn.label} whileTap={{ scale: 0.88 }} onClick={() => setZoom(btn.fn)}
            style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.60)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', lineHeight: 1 }}>
            {btn.label}
          </motion.button>
        ))}
      </div>

      {/* Scroll frame */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        {/* Spacer div drives scroll area dimensions */}
        <div style={{ width: canvasW * zoom, height: canvasH * zoom, position: 'relative', flexShrink: 0, minWidth: '100%' }}>
          {/* Scaled canvas */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>

            {/* SVG layer */}
            <svg style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none', overflow: 'visible' }}>
              {/* Lane dividers */}
              {SWIM_PHASES.map((_, i) => i > 0 && (
                <line key={i} x1={LABEL_W} y1={i * LANE_H} x2={canvasW} y2={i * LANE_H} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              ))}
              {/* Label column divider */}
              <line x1={LABEL_W - 1} y1={0} x2={LABEL_W - 1} y2={canvasH} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

              {/* Progress trail */}
              {pathSegs.map((seg, i) => (
                <g key={i}>
                  <path d={seg.d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} strokeLinecap="round" />
                  <path d={seg.d} fill="none"
                    stroke={seg.isShaky ? 'rgba(245,158,11,0.58)' : seg.isDone ? 'rgba(74,222,128,0.65)' : 'rgba(99,102,241,0.24)'}
                    strokeWidth={4}
                    strokeDasharray={seg.isDone ? undefined : '7 5'}
                    strokeLinecap="round" />
                </g>
              ))}

              {/* 🏁 after last node */}
              {lastPos && (
                <text x={lastPos.x + R_AVAIL + 8} y={lastPos.y + 7} fontSize={18} style={{ userSelect: 'none' }}>🏁</text>
              )}
            </svg>

            {/* Phase labels */}
            {SWIM_PHASES.map((phase, laneIdx) => {
              const pc   = PHASE_CFG[phase] || PHASE_CFG['Core Topics']
              const laneY = laneIdx * LANE_H
              const hasNodes = laneNodes[laneIdx]?.length > 0
              return (
                <div key={phase} style={{
                  position: 'absolute', left: 0, top: laneY, width: LABEL_W - 2, height: LANE_H,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                  opacity: hasNodes ? 1 : 0.3,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: pc.color }} />
                  <div style={{ fontSize: 7.5, fontWeight: 800, color: pc.color, letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.4, maxWidth: 54, wordBreak: 'break-word' }}>
                    {phase}
                  </div>
                </div>
              )
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <MapNode key={node.id} node={node} laneNodes={laneNodes}
                isSelected={selected?.id === node.id}
                onSelect={onSelect}
                drillHistory={drillHistory}
                showTip={!tipSeen && node.id === firstAvailNode?.id}
                onTipSeen={handleTipSeen} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── NodeDetailSheet — slides in below the map when a node is selected ───── */
function NodeDetailSheet({ node, roadmap, isStarted, onLaunch, onGotIt, onShaky, onGoAgain, onFlagNode, onClose }) {
  if (!node) return null
  const cfg = NODE_CFG[node.type] || NODE_CFG.learn
  const { Icon } = cfg
  const isUrgent = !!node.urgent
  const pc = node.phase ? (PHASE_CFG[node.phase] || null) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{ margin: '6px 16px 4px', borderRadius: 18, padding: '16px 18px 18px', background: 'rgba(8,9,24,0.98)', border: `1px solid ${cfg.color}42`, boxShadow: `0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px ${cfg.color}15`, position: 'relative' }}>

      {/* Close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.38)' }}>
        <X size={13} />
      </button>

      {/* Phase badge */}
      {pc && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: `${pc.color}18`, border: `1px solid ${pc.color}35`, marginBottom: 8 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: pc.color }} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: pc.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{node.phase}</span>
        </div>
      )}

      {/* Title + un-flag */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2, paddingRight: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', flex: 1 }}>{node.topic}</div>
        {isUrgent && (
          <button onClick={() => onFlagNode(false)} style={{ padding: '2px 7px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#FCD34D', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            🚩 Un-flag
          </button>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: cfg.light, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>{cfg.label}</div>

      {/* Difficulty + time + XP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1,2,3,4,5].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: d <= (node.difficulty || 1) ? cfg.color : 'rgba(255,255,255,0.10)' }} />)}
        </div>
        {node.estimatedMinutes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>
            <Clock size={10} />{node.estimatedMinutes}m
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: cfg.color }}>+{node.xp || 50} XP</div>
      </div>

      {/* Description */}
      {node.description && (
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', marginBottom: node.subtopics?.length ? 10 : 14, lineHeight: 1.55 }}>{node.description}</div>
      )}

      {/* Subtopics */}
      {node.subtopics?.length > 0 && (
        <div style={{ marginBottom: 14, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Covers</div>
          {node.subtopics.map((s, si) => (
            <div key={si} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: si < node.subtopics.length - 1 ? 4 : 0 }}>
              <span style={{ color: cfg.color, fontSize: 10, marginTop: 3, flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.45 }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action area */}
      {isStarted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>How did it go?</div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onGotIt}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#16a34a,#22C55E)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Check size={13} strokeWidth={3} /> Got it — fully understood
            <span style={{ marginLeft: 'auto', opacity: 0.8, fontSize: 11 }}>+{node.xp || 50} XP</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onShaky}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#FCD34D', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 14 }}>◐</span> Shaky — needs more practice
            <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 11 }}>+{Math.round((node.xp || 50) * 0.6)} XP</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onGoAgain}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={11} /> Not done yet — go again
          </motion.button>
        </div>
      ) : node.type === 'mock' && roadmap.readiness < 60 ? (
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
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onLaunch}
          style={{ width: '100%', padding: '11px 0', borderRadius: 11, border: 'none', background: `linear-gradient(135deg,${cfg.color},${cfg.shadow})`, boxShadow: `0 4px 14px ${cfg.color}50`, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Icon size={15} strokeWidth={2.5} />
          {node.type === 'learn' ? 'Ask Aeva' : node.type === 'drill' ? 'Start Drill' : node.type === 'check' ? 'Take Quiz' : 'Start Mock Test'}
          <span style={{ opacity: 0.75, fontSize: 11 }}>+{node.xp || 50} XP</span>
        </motion.button>
      )}
    </motion.div>
  )
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

function ActualResultCard({ roadmap }) {
  const { setActualGrade } = useRoadmapStore()
  const [selected, setSelected] = useState(null)
  const [saved, setSaved]       = useState(false)

  if (roadmap.actualGrade) {
    const predicted = calcGrade(roadmap.readiness || 0).grade
    const actual    = roadmap.actualGrade
    const hit       = actual === predicted
    const better    = ['A*','A','B','C','D','E'].indexOf(actual) <= ['A*','A','B','C','D','E'].indexOf(predicted)
    const col       = hit ? '#4ADE80' : better ? '#818CF8' : '#FBBF24'
    return (
      <div style={{ margin: '0 20px 16px', padding: '16px 18px', borderRadius: 16, background: `${col}12`, border: `1px solid ${col}35` }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: col, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
          {hit ? '🎯 Prediction nailed it' : better ? '🚀 Better than predicted' : '📊 Result recorded'}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Predicted</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'rgba(255,255,255,0.55)' }}>{predicted}</div>
          </div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Actual</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: col }}>{actual}</div>
          </div>
        </div>
      </div>
    )
  }

  if (saved) return (
    <div style={{ margin: '0 20px 16px', padding: '14px 18px', borderRadius: 16, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.28)', fontSize: 13, color: '#4ADE80', fontWeight: 700 }}>
      ✓ Result saved — thanks for the data
    </div>
  )

  return (
    <div style={{ margin: '0 20px 16px', padding: '16px 18px', borderRadius: 16, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#FBBF24', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
        🎓 Exam passed — how did you do?
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['A*','A','B','C','D','E','U'].map(g => {
          const cols = { 'A*':'#A78BFA','A':'#818CF8','B':'#34D399','C':'#60A5FA','D':'#FBBF24','E':'#FB923C','U':'#F87171' }
          const col  = cols[g]
          return (
            <motion.button key={g} whileTap={{ scale: 0.90 }} onClick={() => setSelected(g)}
              style={{
                flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                background: selected === g ? `${col}22` : 'rgba(255,255,255,0.05)',
                border: selected === g ? `1.5px solid ${col}70` : '1.5px solid rgba(255,255,255,0.08)',
                color: selected === g ? col : 'rgba(255,255,255,0.38)',
              }}>{g}</motion.button>
          )
        })}
      </div>
      <button
        disabled={!selected}
        onClick={() => { setActualGrade(roadmap.id, selected); setSaved(true) }}
        style={{
          width: '100%', padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          cursor: selected ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          background: selected ? 'rgba(251,191,36,0.20)' : 'rgba(255,255,255,0.04)',
          border: selected ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.07)',
          color: selected ? '#FCD34D' : 'rgba(255,255,255,0.20)',
        }}>
        Save my result
      </button>
    </div>
  )
}

/* ── Grade trend line chart ──────────────────────────────────────────────── */
function GradeTrendChart({ gradeHistory, targetGrade }) {
  const GRADE_ORDER = ['U', 'E', 'D', 'C', 'B', 'A', 'A*']
  const GRADE_VAL   = { 'U': 0, 'E': 1, 'D': 2, 'C': 3, 'B': 4, 'A': 5, 'A*': 6 }
  const gradId = useRef(`tg_${Math.random().toString(36).slice(2,7)}`).current

  if (!gradeHistory?.length || gradeHistory.length < 2) return null

  const history = gradeHistory.slice(-20)
  const vals    = history.map(h => GRADE_VAL[h.grade] ?? 0)
  const minV    = Math.max(0, Math.min(...vals) - 0.8)
  const maxV    = Math.min(6, Math.max(...vals) + 0.8)

  const VB_W = 300, VB_H = 96
  const PL = 26, PR = 10, PT = 10, PB = 14
  const plotW = VB_W - PL - PR
  const plotH = VB_H - PT - PB

  const xAt = (i) => PL + (history.length > 1 ? i / (history.length - 1) : 0.5) * plotW
  const yAt = (v) => PT + plotH - ((v - minV) / Math.max(0.1, maxV - minV)) * plotH

  const pts = history.map((h, i) => ({
    x: xAt(i), y: yAt(GRADE_VAL[h.grade] ?? 0), grade: h.grade, date: h.date,
  }))

  // Smooth cubic bezier through all points
  let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i].x - pts[i-1].x) / 2
    linePath += ` C ${(pts[i-1].x + dx).toFixed(1)} ${pts[i-1].y.toFixed(1)} ${(pts[i].x - dx).toFixed(1)} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
  }
  const areaPath = `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${(PT + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PT + plotH).toFixed(1)} Z`

  const firstGrade = history[0].grade
  const lastGrade  = history[history.length - 1].grade
  const trending   = (GRADE_VAL[lastGrade] ?? 0) - (GRADE_VAL[firstGrade] ?? 0)

  const lastThreshold = GRADE_THRESHOLDS.find(t => t.grade === lastGrade) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
  const lineColor = lastThreshold.color

  const yLabels = GRADE_ORDER.filter(g => {
    const v = GRADE_VAL[g]
    return v >= Math.floor(minV) && v <= Math.ceil(maxV)
  })

  const fmtDate = (ds) => {
    const d = new Date(ds)
    if (isNaN(d)) return ds
    return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`
  }

  const first  = new Date(history[0].date)
  const last   = new Date(history[history.length - 1].date)
  const days   = Math.max(1, Math.round((last - first) / 86400000))

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      style={{ margin: '12px 20px 0', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ padding: '11px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Grade Progress
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {firstGrade !== lastGrade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.35)' }}>{firstGrade}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: lineColor }}>{lastGrade}</span>
            </div>
          )}
          {trending > 0 ? (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,0.12)', padding: '2px 7px', borderRadius: 99 }}>↑ {days}d</span>
          ) : trending < 0 ? (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#F87171', background: 'rgba(248,113,113,0.12)', padding: '2px 7px', borderRadius: 99 }}>↓</span>
          ) : (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: lineColor, background: `${lineColor}18`, padding: '2px 7px', borderRadius: 99 }}>{lastGrade}</span>
          )}
        </div>
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', display: 'block' }} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grade grid lines + y-axis labels */}
        {yLabels.map(g => {
          const yp   = yAt(GRADE_VAL[g])
          const tCol = GRADE_THRESHOLDS.find(t => t.grade === g)?.color || 'rgba(255,255,255,0.18)'
          return (
            <g key={g}>
              <line x1={PL} y1={yp} x2={VB_W - PR} y2={yp} stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              <text x={PL - 5} y={yp + 3.5} fontSize="7" textAnchor="end" fontWeight="700"
                fill={g === lastGrade ? tCol : 'rgba(255,255,255,0.22)'}
                fontFamily="Inter, system-ui, sans-serif">{g}</text>
            </g>
          )
        })}

        {/* Target grade dashed line */}
        {targetGrade && GRADE_VAL[targetGrade] !== undefined && (() => {
          const tv = GRADE_VAL[targetGrade]
          if (tv < minV - 0.1 || tv > maxV + 0.1) return null
          const ty  = yAt(tv)
          const tc  = GRADE_THRESHOLDS.find(t => t.grade === targetGrade)?.color || '#fff'
          return <line x1={PL} y1={ty} x2={VB_W - PR} y2={ty} stroke={tc} strokeWidth="0.8" strokeDasharray="3 2.5" opacity="0.40" />
        })()}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line — animated opacity */}
        <motion.path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />

        {/* Dots */}
        {pts.map((p, i) => {
          const isLast  = i === pts.length - 1
          const dotCol  = GRADE_THRESHOLDS.find(t => t.grade === p.grade)?.color || lineColor
          return (
            <circle key={i} cx={p.x} cy={p.y} r={isLast ? 3.5 : 1.8}
              fill={isLast ? dotCol : 'rgba(255,255,255,0.18)'}
              stroke={isLast ? 'rgba(8,9,24,0.9)' : 'none'}
              strokeWidth={isLast ? 1.5 : 0} />
          )
        })}
      </svg>

      {/* Footer: date range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 14px 9px', fontSize: 9.5, color: 'rgba(255,255,255,0.18)', fontWeight: 500 }}>
        <span>{fmtDate(history[0].date)}</span>
        <span>{fmtDate(history[history.length - 1].date)}</span>
      </div>
    </motion.div>
  )
}

/* ── Compute mission tasks from real drill data (no AI needed) ───────────── */
function computeSmartTasks(nodes, drillHistory, daysLeft, roadmapTitle) {
  const tasks = []

  // Priority 1: Shaky nodes — student flagged they don't know this
  const shakyNodes = nodes.filter(n => n.status === 'complete' && n.confidence === 'shaky')
  if (shakyNodes.length > 0) {
    const n = shakyNodes[0]
    tasks.push({ id: `t_shaky_${n.id}`, type: 'drill', topic: n.topic, label: 'Revisit weak spot', status: 'pending', urgent: true })
  }

  // Priority 2: Completed nodes with low drill scores (under 70%)
  if (tasks.length < 3) {
    const weakNodes = nodes
      .filter(n => n.status === 'complete' && !tasks.find(t => t.topic === n.topic))
      .map(n => {
        const scores = drillHistory.filter(h => h.topic.toLowerCase() === n.topic.toLowerCase())
        return { n, best: scores.length ? Math.max(...scores.map(h => h.pct)) : 101 }
      })
      .filter(({ best }) => best <= 70)
      .sort((a, b) => a.best - b.best)

    weakNodes.slice(0, tasks.length === 0 ? 2 : 1).forEach(({ n, best }) => {
      tasks.push({ id: `t_weak_${n.id}`, type: 'drill', topic: n.topic, label: `Boost score (${best}% → 80%+)`, status: 'pending' })
    })
  }

  // Priority 3: Current available node
  const available = nodes.find(n => n.status === 'available')
  if (available && tasks.length < 3) {
    const labelMap = { learn: 'Learn next topic', drill: 'Practice drill', check: 'Knowledge check', mock: 'Mock test' }
    tasks.push({ id: `t_avail_${available.id}`, type: available.type, topic: available.topic, label: labelMap[available.type] || 'Next step', status: 'pending' })
  }

  // Fallback: suggest mock if close to exam and nothing else
  if (tasks.length === 0 && daysLeft <= 5) {
    tasks.push({ id: 't_mock_final', type: 'mock', topic: roadmapTitle, label: 'Final mock — exam is close', status: 'pending' })
  }

  return tasks
}

/* ── Gap analysis panel — weak spots that are costing grades ─────────────── */
function GapAnalysisPanel({ nodes, drillHistory, onDrill, onRelearn }) {
  const gaps = []

  nodes.forEach(node => {
    if (node.status !== 'complete') return
    const topicLower = node.topic.toLowerCase()
    const topicDrills = drillHistory.filter(h => h.topic.toLowerCase() === topicLower)
    const bestScore   = topicDrills.length > 0 ? Math.max(...topicDrills.map(h => h.pct)) : null
    const isShaky     = node.confidence === 'shaky'

    if (isShaky) {
      gaps.push({ node, bestScore, isShaky: true, sortKey: 0 })
    } else if (bestScore !== null && bestScore < 68) {
      gaps.push({ node, bestScore, isShaky: false, sortKey: bestScore })
    }
  })

  gaps.sort((a, b) => a.sortKey - b.sortKey)
  const topGaps = gaps.slice(0, 3)
  if (topGaps.length === 0) return null

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      style={{ margin: '12px 20px 0', borderRadius: 16, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.22)', overflow: 'hidden' }}>

      <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Target size={13} color="#F87171" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#F87171' }}>
            {topGaps.length} gap{topGaps.length !== 1 ? 's' : ''} holding your grade back
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            Drill these to close the gap
          </div>
        </div>
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {topGaps.map(({ node, bestScore, isShaky }) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.topic}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1,
                color: isShaky ? '#FCD34D' : bestScore !== null && bestScore < 50 ? '#F87171' : '#FBBF24' }}>
                {isShaky ? '◐ Marked shaky — needs reinforcement' : `Best score ${bestScore}% — below target`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => onDrill(node.topic)}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#A5B4FC', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Drill
              </motion.button>
              {isShaky && (
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => onRelearn(node.topic)}
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Re-learn
                </motion.button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Completion gate — generates one MCQ before marking a node done ──────── */
async function generateGateQuestion(topic, difficulty = 2) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: `Write one multiple-choice question to check understanding of "${topic}" at difficulty ${difficulty}/5.
Return ONLY valid JSON: { "q": "One clear question sentence?", "options": ["Option A text", "Option B text", "Option C text", "Option D text"], "answer": 0, "explanation": "One sentence: why the correct answer is right." }
Rules: answer is the 0-based index of the correct option. Keep options under 12 words each. No markdown.` }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 280,
    }),
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

function CompletionGate({ node, onPass, onFail, onSkip }) {
  const [phase, setPhase]       = useState('loading') // loading | question | passed | failed
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState(null)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    generateGateQuestion(node.topic, node.difficulty || 2)
      .then(q => { setQuestion(q); setPhase('question') })
      .catch(() => { setApiError(true); setPhase('question') })
  }, [])

  const handleAnswer = (idx) => {
    if (phase !== 'question' || selected !== null || !question) return
    setSelected(idx)
    if (idx === question.answer) {
      setPhase('passed')
      setTimeout(() => onPass(), 1000)
    } else {
      setPhase('failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(4,5,18,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onSkip() }}
    >
      <motion.div
        initial={{ scale: 0.90, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(10,11,30,0.99)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '22px 22px 24px', maxWidth: 380, width: '100%', fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(165,180,252,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Quick check</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{node.topic}</div>
          </div>
          <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 2, display: 'flex', flexShrink: 0, marginTop: 2 }}>
            <X size={17} />
          </button>
        </div>

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0 12px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 28, height: 28, border: '3px solid rgba(99,102,241,0.18)', borderTopColor: '#6366F1', borderRadius: '50%', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>One question on {node.topic}…</div>
          </div>
        )}

        {/* Question */}
        {phase === 'question' && (
          apiError ? (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', marginBottom: 18, lineHeight: 1.6 }}>Couldn't load a question. How confident do you actually feel?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onPass} style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ADE80', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ I genuinely got it</motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onFail} style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', color: '#FCD34D', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>◐ Still a bit shaky</motion.button>
              </div>
            </div>
          ) : question && (
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, marginBottom: 16 }}>{question.q}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {question.options.map((opt, idx) => {
                  const isCorrect   = idx === question.answer
                  const isSelected  = idx === selected
                  const showResult  = selected !== null
                  return (
                    <motion.button key={idx}
                      whileHover={selected === null ? { scale: 1.015 } : {}}
                      whileTap={selected === null ? { scale: 0.985 } : {}}
                      onClick={() => handleAnswer(idx)}
                      style={{
                        padding: '11px 14px', borderRadius: 11, textAlign: 'left',
                        cursor: selected !== null ? 'default' : 'pointer',
                        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: !showResult ? 'rgba(255,255,255,0.05)' : isCorrect ? 'rgba(74,222,128,0.13)' : isSelected ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.02)',
                        border: !showResult ? '1px solid rgba(255,255,255,0.10)' : isCorrect ? '1px solid rgba(74,222,128,0.38)' : isSelected ? '1px solid rgba(248,113,113,0.32)' : '1px solid rgba(255,255,255,0.05)',
                        color: !showResult ? 'rgba(255,255,255,0.80)' : isCorrect ? '#4ADE80' : isSelected ? '#F87171' : 'rgba(255,255,255,0.25)',
                        transition: 'all 0.15s',
                      }}>
                      <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.45, flexShrink: 0, minWidth: 12 }}>{['A','B','C','D'][idx]}</span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {showResult && isCorrect  && <Check size={13} color="#4ADE80" strokeWidth={3} style={{ flexShrink: 0 }} />}
                      {showResult && isSelected && !isCorrect && <X size={13} color="#F87171" strokeWidth={3} style={{ flexShrink: 0 }} />}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )
        )}

        {/* Passed */}
        {phase === 'passed' && (
          <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '18px 0 10px' }}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.45 }}
              style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 28px rgba(34,197,94,0.38)' }}>
              <Check size={26} color="#fff" strokeWidth={3} />
            </motion.div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#4ADE80', marginBottom: 6 }}>Correct!</div>
            {question?.explanation && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>{question.explanation}</div>}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', marginTop: 14 }}>Marking complete…</div>
          </motion.div>
        )}

        {/* Failed */}
        {phase === 'failed' && (
          <div>
            <div style={{ padding: '12px 14px', borderRadius: 13, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.22)', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F87171', marginBottom: 4 }}>Not quite</div>
              {question?.explanation && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55 }}>{question.explanation}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onFail}
                style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#FCD34D', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <span style={{ fontSize: 15 }}>◐</span> Mark done — still shaky
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onSkip}
                style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.42)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <RotateCcw size={13} /> Go again
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function PathView() {
  const { getActive, completeNode, completeNodeWithConfidence, closeRoadmapHub, startNodeSession, endNodeSession, markLogSeen, flagNode } = useRoadmapStore()
  // Subscribe to roadmaps array so component re-renders when Aeva mutates nodes
  useRoadmapStore(state => state.roadmaps)
  const { openLab, addOrder, setLabTab, setPendingAutoStart, drillHistory } = useLabStore()
  const { addXP } = useXPStore()
  const { setPendingChatPrompt } = useAevaControlStore()
  const { getDueCount } = useSRStore()
  const roadmap = getActive()
  const [askAevaFlash, setAskAevaFlash] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [startedIds, setStartedIds] = useState(new Set())
  const [shakyPrompt, setShakyPrompt] = useState(null) // { topic } — shown after marking shaky
  const [gateNode, setGateNode]     = useState(null)   // node awaiting completion gate
  const scrollRef = useRef(null)

  if (!roadmap?.nodes?.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
      No roadmap loaded
    </div>
  )

  const nodes    = roadmap.nodes
  const daysLeft = Math.max(0, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
  const available = nodes.find(n => n.status === 'available')

  // All nodes done → trophy screen
  if (nodes.every(n => n.status === 'complete')) {
    return <CompletionView roadmap={roadmap} daysLeft={daysLeft} />
  }

  const launchNode = (node) => {
    setSelected(null)
    setStartedIds(prev => new Set([...prev, node.id]))
    startNodeSession(roadmap.id, node)

    if (node.type === 'learn') {
      const subtopicLine = node.subtopics?.length
        ? ` Specifically cover: ${node.subtopics.join(', ')}.`
        : ''
      const phaseLine = node.phase ? ` (Phase: ${node.phase}, Difficulty: ${node.difficulty || 2}/5)` : ''
      setPendingChatPrompt(
        `Teach me "${node.topic}" for my ${roadmap.title}.${phaseLine}${node.description ? ' ' + node.description : ''}${subtopicLine} I have ${daysLeft} days until the exam. Start from the core concepts, use examples, and check my understanding as we go.`
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

  const markDoneWithConfidence = (node, confidence) => {
    completeNodeWithConfidence(roadmap.id, node.id, confidence)
    addXP('DRILL_COMPLETE')
    endNodeSession()
    setStartedIds(prev => { const n = new Set(prev); n.delete(node.id); return n })
    setSelected(null)
    if (confidence === 'shaky') {
      setShakyPrompt({ topic: node.topic })
    }
  }

  // Helpers for gap panel actions
  const drillTopic = (topic) => {
    setPendingAutoStart('flashcard', topic)
    closeRoadmapHub()
    openLab()
  }
  const relearnTopic = (topic) => {
    setPendingChatPrompt(`Re-teach me "${topic}" for my ${roadmap?.title}. I've studied it before but I'm still shaky — please go through it again clearly with examples and then quiz me.`)
    closeRoadmapHub()
  }

  // Behind-pace detection
  const totalDays = Math.max(1, Math.ceil((new Date(roadmap.examDate) - new Date(roadmap.createdAt || Date.now())) / 86400000))
  const daysElapsed = Math.max(0, totalDays - daysLeft)
  const completedCount = nodes.filter(n => n.status === 'complete').length
  const expectedDone = Math.floor((daysElapsed / totalDays) * nodes.length)
  const behindBy = Math.max(0, expectedDone - completedCount)
  const isBehind = behindBy >= 2 && daysElapsed > 1

  const mission      = roadmap.dailyMission
  const missionTasks = mission?.tasks || []

  // Smart tasks computed from actual drill data — always accurate, no AI needed
  const smartTasks = computeSmartTasks(nodes, drillHistory || [], daysLeft, roadmap.title)
  const hasWeakSpots = smartTasks.some(t => t.urgent || t.id.startsWith('t_shaky') || t.id.startsWith('t_weak'))
  const displayTasks = smartTasks.length > 0 ? smartTasks : missionTasks

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
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>Today's Plan</div>
                {hasWeakSpots && (
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#F87171', background: 'rgba(248,113,113,0.18)', padding: '1px 7px', borderRadius: 99, border: '1px solid rgba(248,113,113,0.30)', letterSpacing: '0.06em' }}>
                    GAPS DETECTED
                  </span>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
                {hasWeakSpots
                  ? 'Close your weak spots first'
                  : available ? `Next: ${available.topic}` : '🎉 Roadmap complete!'}
              </div>
              {hasWeakSpots && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 3 }}>Fixing gaps moves your grade faster than new topics</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: daysLeft <= 3 ? '#F87171' : daysLeft <= 7 ? '#FBBF24' : '#fff' }}>{daysLeft}d</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>until exam</div>
            </div>
          </div>

          {/* Progress bar + Grade */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Readiness</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Current grade pill */}
                {(() => {
                  const g = calcGrade(roadmap.readiness || 0)
                  const tg = roadmap.targetGrade
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 900, padding: '2px 9px', borderRadius: 99,
                        background: `${g.color}22`, border: `1.5px solid ${g.color}60`,
                        color: g.color, letterSpacing: '0.02em',
                        boxShadow: `0 0 10px ${g.color}30`,
                      }}>{g.grade}</span>
                      {tg && tg !== g.grade && (
                        <>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>→</span>
                          <span style={{
                            fontSize: 12, fontWeight: 900, padding: '2px 9px', borderRadius: 99,
                            background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.18)',
                            color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em',
                          }}>{tg}</span>
                        </>
                      )}
                    </div>
                  )
                })()}
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>{roadmap.readiness || 0}%</span>
              </div>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${roadmap.readiness || 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #818CF8, #C4B5FD)' }}
              />
            </div>
            {/* Grade gap message */}
            {(() => {
              const g = calcGrade(roadmap.readiness || 0)
              const msg = roadmap.targetGrade ? gradeGapMessage(g.grade, roadmap.targetGrade, roadmap.readiness || 0, roadmap.learningProfile?.weak || []) : null
              return msg ? (
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.55 }}>
                  💡 {msg}
                </div>
              ) : null
            })()}
          </div>

          {/* Mission tasks — smart computed from real drill data */}
          {displayTasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
              {displayTasks.map((task, taskIdx) => {
                const cfg = NODE_CFG[task.type] || NODE_CFG.learn
                const done = task.status === 'complete'
                const isUrgentTask = task.urgent || task.id?.startsWith('t_shaky')
                const TaskIcon = cfg.Icon
                return (
                  <motion.button key={task.id || taskIdx}
                    whileHover={!done ? { scale: 1.02, background: isUrgentTask ? 'rgba(248,113,113,0.20)' : 'rgba(255,255,255,0.14)' } : {}}
                    whileTap={!done ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (done) return
                      if (task.type === 'learn') {
                        setPendingChatPrompt(`Teach me "${task.topic}" for my ${roadmap.title}. I have ${daysLeft} days until the exam.`)
                        closeRoadmapHub()
                      } else if (task.type === 'drill') {
                        setPendingAutoStart('flashcard', task.topic); closeRoadmapHub(); openLab()
                      } else if (task.type === 'check') {
                        setPendingAutoStart('shortanswer', task.topic); closeRoadmapHub(); openLab()
                      } else if (task.type === 'mock') {
                        addOrder({ title: `Mock Test — ${roadmap.title}`, description: `Full mock test on ${roadmap.title}.`, subject: roadmap.title }); closeRoadmapHub(); setLabTab('orders'); openLab()
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 11,
                      background: done ? 'rgba(74,222,128,0.08)' : isUrgentTask ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.10)',
                      border: done ? '1px solid rgba(74,222,128,0.25)' : isUrgentTask ? '1px solid rgba(248,113,113,0.30)' : '1px solid rgba(255,255,255,0.12)',
                      cursor: done ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      opacity: done ? 0.7 : 1,
                    }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: done ? 'rgba(74,222,128,0.18)' : isUrgentTask ? 'rgba(248,113,113,0.20)' : `${cfg.color}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done ? <Check size={14} color="#4ADE80" strokeWidth={3} />
                        : isUrgentTask ? <span style={{ fontSize: 11 }}>◐</span>
                        : <TaskIcon size={14} color={cfg.color} strokeWidth={2.2} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#4ADE80' : isUrgentTask ? '#FCA5A5' : '#fff' }}>{task.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.topic}</div>
                    </div>
                    {!done && <div style={{ fontSize: 11, fontWeight: 800, color: isUrgentTask ? '#F87171' : cfg.color, flexShrink: 0 }}>
                      +{task.type === 'check' ? 40 : task.type === 'drill' ? 30 : 50} XP
                    </div>}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Actual result card — shown when exam date has passed ── */}
      {daysLeft === 0 && (
        <div style={{ flexShrink: 0, padding: '0 20px 4px' }}>
          <ActualResultCard roadmap={roadmap} />
        </div>
      )}

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {(() => {
        const doneNodes = nodes.filter(n => n.status === 'complete')
        const remMins   = nodes.filter(n => n.status !== 'complete').reduce((s, n) => s + (n.estimatedMinutes || 20), 0)
        const earnedXP  = doneNodes.reduce((s, n) => s + (n.xp || 50), 0)
        const remH = Math.floor(remMins / 60), remM = remMins % 60
        const shakyCount = nodes.filter(n => n.status === 'complete' && n.confidence === 'shaky').length
        const stats = [
          { label: 'STEPS',     value: `${doneNodes.length}/${nodes.length}` },
          { label: 'SHAKY',     value: shakyCount.toString(), amber: shakyCount > 0 },
          { label: 'TIME LEFT', value: remH > 0 ? `${remH}h ${remM}m` : `${remM}m` },
          { label: 'READY',     value: `${roadmap.readiness}%`, green: roadmap.readiness >= 60 },
        ]
        return (
          <div style={{ display: 'flex', flexShrink: 0, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 14 }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', padding: '2px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: s.green ? '#4ADE80' : s.amber ? '#FCD34D' : '#fff', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.10em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Grade trend chart ────────────────────────────────────────────── */}
      {(roadmap.gradeHistory?.length || 0) >= 2 && (
        <GradeTrendChart gradeHistory={roadmap.gradeHistory} targetGrade={roadmap.targetGrade} />
      )}

      {/* ── Gap analysis — weak spots costing grades ─────────────────────── */}
      <GapAnalysisPanel
        nodes={nodes}
        drillHistory={drillHistory || []}
        onDrill={drillTopic}
        onRelearn={relearnTopic}
      />

      {/* ── Ask Aeva button ──────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '12px 20px 0' }}>
        <motion.button
          whileHover={{ scale: 1.02, background: 'rgba(99,102,241,0.22)' }}
          whileTap={{ scale: 0.97 }}
          animate={askAevaFlash ? { boxShadow: ['0 0 0 0 rgba(99,102,241,0)', '0 0 0 8px rgba(99,102,241,0.25)', '0 0 0 0 rgba(99,102,241,0)'] } : {}}
          onClick={() => {
            const done     = nodes.filter(n => n.status === 'complete').length
            const total    = nodes.length
            const lp       = roadmap.learningProfile || {}
            const weakStr  = lp.weak?.length ? ` My weak areas are: ${lp.weak.slice(0,3).join(', ')}.` : ''
            const urgStr   = nodes.filter(n => n.urgent).map(n => n.topic).join(', ')
            const nodeNames = nodes.filter(n => n.status !== 'complete').map(n => `"${n.topic}"`).join(', ')
            setPendingChatPrompt(
              `Aeva, review my roadmap for "${roadmap.title}" and make the actual changes now. I've done ${done}/${total} nodes. Exam is in ${daysLeft} days.${weakStr}${urgStr ? ` Already flagged urgent: ${urgStr}.` : ''} Remaining nodes: ${nodeNames}. Go through each node and: remove any I clearly don't need, flag the most critical ones as urgent, add anything missing, activate crunch mode if the timeline is tight. For each change say exactly "I've flagged [topic] as urgent", "I've removed [topic] from your roadmap", or "I've activated crunch mode" so the changes apply automatically.`
            )
            setAskAevaFlash(true)
            setTimeout(() => { setAskAevaFlash(false); closeRoadmapHub() }, 600)
          }}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.30)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#A5B4FC' }}>Ask Aeva to review my roadmap</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>She'll adjust nodes, flag urgent topics, skip what you don't need</div>
          </div>
          <div style={{ fontSize: 18, opacity: 0.6 }}>→</div>
        </motion.button>
      </div>

      {/* ── Behind-pace banner ──────────────────────────────────────────── */}
      {isBehind && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ flexShrink: 0, margin: '10px 20px 0', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(239,68,68,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <AlertTriangle size={14} color="#F87171" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F87171', marginBottom: 3 }}>
              Behind by {behindBy} node{behindBy !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, marginBottom: 10 }}>
              At your current pace, you won't finish before exam day. Ask Aeva to replan or activate Crunch Mode to cut non-essentials.
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const nodeNames = nodes.filter(n => n.status !== 'complete').map(n => `"${n.topic}"`).join(', ')
                  setPendingChatPrompt(`Aeva, I'm ${behindBy} node${behindBy !== 1 ? 's' : ''} behind on my roadmap for "${roadmap.title}". I have ${daysLeft} days left. Remaining nodes: ${nodeNames}. Replan immediately — remove what I don't need, flag the critical ones as urgent, and tell me exactly what to prioritise.`)
                  closeRoadmapHub()
                }}
                style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.30)', color: '#F87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={11} /> Ask Aeva to replan
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => useRoadmapStore.getState().crunchMode(roadmap.id)}
                style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RotateCcw size={11} /> Crunch mode
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Aeva change log banner ───────────────────────────────────────── */}
      {(() => {
        const unseen = (roadmap.aevaLog || []).filter(e => !e.seen)
        if (!unseen.length) return null
        const ICONS = { flag: '🚩', skip: '⏭', inject: '➕', reprioritise: '🔀', crunch: '⚡' }
        return (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ flexShrink: 0, margin: '10px 20px 0', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>✦</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#FCD34D' }}>Aeva updated your roadmap</span>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => markLogSeen(roadmap.id)}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px' }}>
                Dismiss
              </motion.button>
            </div>
            <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {unseen.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{ICONS[e.type] || '✦'}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{e.topic}</span>
                    {e.description ? ` — ${e.description}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )
      })()}

      {/* ── Exam countdown banner ───────────────────────────────────────── */}
      {(() => {
        const nodesLeft = nodes.filter(n => n.status !== 'complete').length
        if (nodesLeft === 0 || daysLeft === 0) return null
        const pace      = nodesLeft / Math.max(1, daysLeft)          // nodes/day needed
        const isGreen   = pace <= 1
        const isAmber   = pace > 1 && pace <= 2
        const col       = isGreen ? '#4ADE80' : isAmber ? '#FCD34D' : '#F87171'
        const bgCol     = isGreen ? 'rgba(74,222,128,0.07)'  : isAmber ? 'rgba(251,191,36,0.07)'  : 'rgba(239,68,68,0.07)'
        const borderCol = isGreen ? 'rgba(74,222,128,0.22)'  : isAmber ? 'rgba(251,191,36,0.22)'  : 'rgba(239,68,68,0.22)'
        const paceStr   = pace < 1 ? `${pace.toFixed(1)}/day` : pace <= 2 ? `${pace.toFixed(1)}/day` : `${Math.ceil(pace)}/day`
        return (
          <div style={{ flexShrink: 0, margin: '10px 20px 0', padding: '10px 16px', borderRadius: 13, background: bgCol, border: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', rowGap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: col }}>{daysLeft}d to exam</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>·</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{nodesLeft} node{nodesLeft !== 1 ? 's' : ''} left</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>·</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: col }}>need {paceStr}</span>
            </div>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
          </div>
        )
      })()}

      {/* ── Swimlane map ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '0 16px' }}>
        <SwimlaneMap
          nodes={nodes}
          roadmap={roadmap}
          selected={selected}
          onSelect={setSelected}
          drillHistory={drillHistory}
        />
      </div>

      {/* ── Node detail sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <NodeDetailSheet
            key={selected.id}
            node={selected}
            roadmap={roadmap}
            isStarted={startedIds.has(selected.id)}
            onLaunch={() => launchNode(selected)}
            onGotIt={() => setGateNode(selected)}
            onShaky={() => markDoneWithConfidence(selected, 'shaky')}
            onGoAgain={() => {
              setStartedIds(prev => { const n = new Set(prev); n.delete(selected.id); return n })
              setSelected(null)
            }}
            onFlagNode={(val) => flagNode(roadmap.id, selected.id, val)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Completion gate modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {gateNode && (
          <CompletionGate
            node={gateNode}
            onPass={() => {
              markDoneWithConfidence(gateNode, 'solid')
              setGateNode(null)
            }}
            onFail={() => {
              markDoneWithConfidence(gateNode, 'shaky')
              setGateNode(null)
            }}
            onSkip={() => setGateNode(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Shaky node drill prompt ──────────────────────────────────────── */}
      <AnimatePresence>
        {shakyPrompt && (
          <motion.div
            key="shaky-prompt"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              width: 'calc(100% - 40px)', maxWidth: 420, zIndex: 300,
              background: 'rgba(9,10,28,0.97)',
              border: '1px solid rgba(245,158,11,0.45)',
              borderRadius: 18, padding: '14px 16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(245,158,11,0.15)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>◐</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#FCD34D', marginBottom: 2 }}>Marked shaky</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.48)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Drill <strong style={{ color: 'rgba(255,255,255,0.72)' }}>{shakyPrompt.topic}</strong> now to actually lock it in
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const t = shakyPrompt.topic
                    setShakyPrompt(null)
                    setPendingAutoStart('flashcard', t)
                    closeRoadmapHub()
                    openLab()
                  }}
                  style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.22)', border: '1px solid rgba(245,158,11,0.50)', color: '#FCD34D', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Drill now
                </motion.button>
                <motion.button whileTap={{ scale: 0.94 }}
                  onClick={() => setShakyPrompt(null)}
                  style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
