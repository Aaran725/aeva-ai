import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Plus, Map } from 'lucide-react'
import { useRoadmapStore } from './roadmapStore'

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
          {view === 'create'     && <CreateView     key="create"     onGenerate={() => setView('generating')} />}
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
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginTop: 60 }}>
        Create form coming next
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
