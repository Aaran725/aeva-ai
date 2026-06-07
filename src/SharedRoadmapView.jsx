import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, Lock, Check, BookOpen, Dumbbell, FlaskConical, Trophy, Copy, LogIn, X, ChevronRight } from 'lucide-react'
import { supabase } from './supabase'
import { useRoadmapStore } from './roadmapStore'
import AevaOrb from './AevaOrb'

const TYPE_META = {
  learn: { icon: <BookOpen size={13} />, label: 'Learn',   color: '#6366F1', bg: 'rgba(99,102,241,0.14)'  },
  drill: { icon: <Dumbbell size={13} />, label: 'Drill',   color: '#F97316', bg: 'rgba(249,115,22,0.14)'  },
  check: { icon: <FlaskConical size={13} />, label: 'Check', color: '#10B981', bg: 'rgba(16,185,129,0.14)' },
  mock:  { icon: <Trophy size={13} />, label: 'Mock Test', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)'  },
}

/* ── Clone modal ───────────────────────────────────────────────── */
function CloneModal({ roadmap, user, onClose }) {
  const { createRoadmap, updateRoadmap } = useRoadmapStore()
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClone = async () => {
    if (!user) {
      window.location.href = '/'
      return
    }
    setLoading(true)
    const id = createRoadmap({
      title:         `${roadmap.title} (copy)`,
      examDate:      roadmap.examDate,
      assessmentInfo: roadmap.assessmentInfo || '',
      overview:      roadmap.overview || '',
    })
    updateRoadmap(id, {
      nodes: (roadmap.nodes || []).map(n => ({ ...n, status: n.status === 'complete' ? 'available' : n.status })),
    })
    setLoading(false)
    setDone(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(4,5,18,0.88)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: 'rgba(12,13,32,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 28, maxWidth: 400, width: '100%' }}
      >
        {done ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Roadmap cloned!</div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)' }}>"{roadmap.title}" has been added to your roadmaps. Open the Roadmap hub to start.</div>
            <button onClick={() => { window.location.href = '/' }} style={{ padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Go to my roadmaps →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Add to your account</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>This roadmap will be cloned into your account. Your progress starts fresh.</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{roadmap.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{roadmap.nodes?.length || 0} nodes · {roadmap.examDate ? new Date(roadmap.examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No exam date'}</div>
            </div>
            {!user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Sign in to clone this roadmap to your account.</div>
                <button onClick={() => { window.location.href = '/' }} style={{ padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <LogIn size={15} /> Sign in to Aeva
                </button>
              </div>
            ) : (
              <button onClick={handleClone} disabled={loading} style={{ padding: '12px', borderRadius: 12, background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Cloning…' : 'Clone to my account'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ── Main shared view ──────────────────────────────────────────── */
export default function SharedRoadmapView({ shareCode }) {
  const [roadmap, setRoadmap]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [user, setUser]         = useState(undefined)
  const [showClone, setShowClone] = useState(false)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  useEffect(() => {
    if (!shareCode) return
    supabase.from('shared_roadmaps').select('*').eq('share_code', shareCode).maybeSingle()
      .then(({ data }) => {
        if (data) setRoadmap(data.roadmap)
        else setNotFound(true)
        setLoading(false)
      })
  }, [shareCode])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const daysLeft = roadmap?.examDate
    ? Math.max(0, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
    : null
  const done = roadmap?.nodes?.filter(n => n.status === 'complete').length ?? 0
  const total = roadmap?.nodes?.length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #07091a 0%, #0d1030 50%, #080b22 100%)', fontFamily: "'Inter', system-ui, sans-serif", color: '#fff' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,6,15,0.90)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Map size={13} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>aeva</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 4px' }}>/</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em' }}>shared roadmap</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleCopyLink}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 99, background: copied ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${copied ? 'rgba(16,185,129,0.40)' : 'rgba(255,255,255,0.12)'}`, color: copied ? '#4ADE80' : 'rgba(255,255,255,0.65)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy link'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setShowClone(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.40)', color: '#A5B4FC', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Add to my account <ChevronRight size={13} />
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 80px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 80 }}>
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <AevaOrb size={72} active />
            </motion.div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Loading roadmap…</div>
          </div>
        )}

        {notFound && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Roadmap not found</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>This link may have expired or been removed.</div>
          </div>
        )}

        {roadmap && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Roadmap header */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)', borderRadius: 20, padding: '20px 22px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 6 }}>{roadmap.title}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {daysLeft !== null && (
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    📅 {daysLeft > 0 ? `${daysLeft} days left` : 'Exam day'}
                  </span>
                )}
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>📋 {total} nodes</span>
                {done > 0 && <span style={{ fontSize: 12.5, color: 'rgba(16,185,129,0.85)' }}>✓ {done} completed</span>}
              </div>
              {roadmap.overview && (
                <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
                  {roadmap.overview}
                </div>
              )}
            </div>

            {/* CTA banner */}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setShowClone(true)}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(79,70,229,0.22), rgba(124,58,237,0.18))', border: '1px solid rgba(99,102,241,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>Clone this roadmap</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)' }}>Add it to your Aeva account and start learning</div>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.30)', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: '#A5B4FC', whiteSpace: 'nowrap' }}>
                Add to account →
              </div>
            </motion.button>

            {/* Node list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                Learning path · {total} steps
              </div>
              {(roadmap.nodes || []).map((node, i) => {
                const meta = TYPE_META[node.type] || TYPE_META.learn
                const isComplete = node.status === 'complete'
                return (
                  <motion.div key={node.id || i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 15px', borderRadius: 14, background: isComplete ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isComplete ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.08)'}` }}
                  >
                    {/* Node number / status */}
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isComplete ? 'rgba(16,185,129,0.20)' : 'rgba(255,255,255,0.07)', fontSize: isComplete ? 14 : 11.5, fontWeight: 700, color: isComplete ? '#4ADE80' : 'rgba(255,255,255,0.45)' }}>
                      {isComplete ? <Check size={14} /> : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: meta.color, background: meta.bg, padding: '2px 7px', borderRadius: 99 }}>
                          {meta.icon} {meta.label}
                        </span>
                        {node.phase && <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>{node.phase}</span>}
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: isComplete ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                        {node.topic}
                      </div>
                      {node.description && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 3, lineHeight: 1.5 }}>{node.description}</div>
                      )}
                    </div>
                    {node.estimatedMinutes && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', whiteSpace: 'nowrap', paddingTop: 2 }}>{node.estimatedMinutes}m</div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.20)', paddingTop: 8 }}>
              Made with Aeva · <a href="/" style={{ color: 'rgba(139,143,255,0.6)', textDecoration: 'none' }}>Try Aeva free</a>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showClone && roadmap && (
          <CloneModal roadmap={roadmap} user={user} onClose={() => setShowClone(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
