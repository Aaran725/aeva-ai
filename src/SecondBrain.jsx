import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Brain, Zap, BookOpen, TrendingUp, Clock, Network } from 'lucide-react'
import { useBrainStore, SUBJECT_COLORS, CLUSTER_POSITIONS, masteryColor, masteryLabel } from './brainStore'

/* ── Stat pill ────────────────────────────────────── */
function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '12px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.94)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  )
}

/* ── Mastery bar ──────────────────────────────────── */
function MasteryBar({ mastery }) {
  const color = masteryColor(mastery)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${mastery}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, color, minWidth: 44 }}>{masteryLabel(mastery)}</span>
    </div>
  )
}

/* ── Concept detail panel ─────────────────────────── */
function DetailPanel({ node, allNodes, onClose, onSearch }) {
  if (!node) return null
  const sc = SUBJECT_COLORS[node.subject] || SUBJECT_COLORS.General
  const connectedNodes = allNodes.filter(n => node.connections.includes(n.concept))
  const daysAgo = Math.floor((Date.now() - node.lastSeen) / (1000 * 60 * 60 * 24))

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 320,
        background: 'rgba(8,9,26,0.97)',
        borderLeft: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(20px)',
        padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20,
        overflowY: 'auto', zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '4px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{node.subject}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      <div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: '0 0 6px', textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
          {node.concept}
        </h3>
        <MasteryBar mastery={node.mastery} />
      </div>

      {node.definition && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Definition</div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, margin: 0 }}>{node.definition}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>{node.visits}</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.40)' }}>encounters</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.40)' }}>last seen</div>
        </div>
      </div>

      {connectedNodes.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>Connected Concepts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {connectedNodes.map(cn => {
              const csc = SUBJECT_COLORS[cn.subject] || SUBJECT_COLORS.General
              return (
                <button key={cn.id} onClick={() => onSearch(cn.concept)}
                  style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: csc.bg, border: `1px solid ${csc.border}`, color: csc.color, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {cn.concept}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
          First encountered {new Date(node.firstSeen).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Constellation view ───────────────────────────── */
function ConstellationView({ nodes, onSelect, selectedId }) {
  const containerRef = useRef(null)

  // Group nodes by subject
  const bySubject = useMemo(() => {
    const groups = {}
    nodes.forEach(n => {
      if (!groups[n.subject]) groups[n.subject] = []
      groups[n.subject].push(n)
    })
    return groups
  }, [nodes])

  // Compute node positions
  const positions = useMemo(() => {
    const pos = {}
    Object.entries(bySubject).forEach(([subject, subjectNodes]) => {
      const cluster = CLUSTER_POSITIONS[subject] || CLUSTER_POSITIONS.General
      subjectNodes.forEach((node, idx) => {
        const total = subjectNodes.length
        const maxRadius = Math.min(total * 2.8, 14)
        const angle = (idx / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2
        const r = total === 1 ? 0 : maxRadius * (0.5 + 0.5 * (idx / total))
        pos[node.id] = {
          x: cluster.x + Math.cos(angle) * r,
          y: cluster.y + Math.sin(angle) * r,
        }
      })
    })
    return pos
  }, [bySubject])

  // Build edges (connections between nodes)
  const edges = useMemo(() => {
    const lines = []
    nodes.forEach(node => {
      node.connections.forEach(connConcept => {
        const connNode = nodes.find(n => n.concept === connConcept)
        if (!connNode) return
        if (lines.some(l => (l.a === node.id && l.b === connNode.id) || (l.a === connNode.id && l.b === node.id))) return
        lines.push({ a: node.id, b: connNode.id })
      })
    })
    return lines
  }, [nodes])

  if (nodes.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Brain size={48} color="rgba(255,255,255,0.12)" />
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, margin: 0 }}>No concepts yet.</p>
      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 13, margin: 0 }}>Start chatting with Aeva and your knowledge map will grow here.</p>
    </div>
  )

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      {/* Subject labels */}
      {Object.keys(bySubject).map(subject => {
        const cluster = CLUSTER_POSITIONS[subject] || CLUSTER_POSITIONS.General
        const sc = SUBJECT_COLORS[subject] || SUBJECT_COLORS.General
        return (
          <div key={subject} style={{ position: 'absolute', left: `${cluster.x}%`, top: `${cluster.y - 5}%`, transform: 'translateX(-50%)', fontSize: 9.5, fontWeight: 800, color: sc.color, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.65, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {subject}
          </div>
        )
      })}

      {/* SVG edges */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {edges.map((edge, i) => {
          const pa = positions[edge.a]
          const pb = positions[edge.b]
          if (!pa || !pb) return null
          return (
            <line key={i}
              x1={`${pa.x}%`} y1={`${pa.y}%`}
              x2={`${pb.x}%`} y2={`${pb.y}%`}
              stroke="rgba(255,255,255,0.07)" strokeWidth={1}
            />
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const pos = positions[node.id]
        if (!pos) return null
        const sc = SUBJECT_COLORS[node.subject] || SUBJECT_COLORS.General
        const mc = masteryColor(node.mastery)
        const isSelected = selectedId === node.id
        const isStale = Date.now() - node.lastSeen > 14 * 24 * 60 * 60 * 1000
        const nodeSize = Math.min(8 + node.visits * 1.5, 16)

        return (
          <motion.button key={node.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: isStale ? 0.45 : 1, scale: 1 }}
            transition={{ duration: 0.4, delay: Math.random() * 0.3 }}
            onClick={() => onSelect(node)}
            style={{
              position: 'absolute',
              left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isSelected ? 5 : 1,
              cursor: 'pointer', border: 'none', background: 'none', padding: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}
          >
            <motion.div
              animate={isSelected ? { boxShadow: [`0 0 0px ${mc}`, `0 0 16px ${mc}`, `0 0 0px ${mc}`] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              whileHover={{ scale: 1.5 }}
              style={{
                width: nodeSize, height: nodeSize,
                borderRadius: '50%',
                background: mc,
                border: isSelected ? `2px solid ${mc}` : `1px solid ${sc.border}`,
                boxShadow: isSelected ? `0 0 12px ${mc}` : `0 0 6px ${mc}44`,
              }}
            />
            <span style={{ fontSize: 8.5, color: isSelected ? sc.color : 'rgba(255,255,255,0.40)', fontWeight: isSelected ? 700 : 400, whiteSpace: 'nowrap', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize', pointerEvents: 'none' }}>
              {node.concept}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ── Index (list) view ────────────────────────────── */
function IndexView({ nodes, onSelect }) {
  if (nodes.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <BookOpen size={48} color="rgba(255,255,255,0.12)" />
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, margin: 0 }}>No concepts yet.</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, alignContent: 'start', paddingRight: 4 }}>
      {nodes.map((node, i) => {
        const sc = SUBJECT_COLORS[node.subject] || SUBJECT_COLORS.General
        const isStale = Date.now() - node.lastSeen > 14 * 24 * 60 * 60 * 1000
        return (
          <motion.button key={node.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: isStale ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            onClick={() => onSelect(node)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
              fontFamily: 'inherit', transition: 'border-color 0.18s, background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = sc.border; e.currentTarget.style.background = sc.bg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.90)', textTransform: 'capitalize', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.concept}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>{node.subject}</span>
            </div>
            {node.definition && (
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', margin: 0, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {node.definition}
              </p>
            )}
            <MasteryBar mastery={node.mastery} />
          </motion.button>
        )
      })}
    </div>
  )
}

/* ── Main Second Brain ────────────────────────────── */
export default function SecondBrain({ onClose, onMirrorOpen }) {
  const { nodes, getStats } = useBrainStore()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('constellation') // 'constellation' | 'index'
  const [selected, setSelected] = useState(null)
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'mastery' | 'subject'
  const stats = getStats()

  const filtered = useMemo(() => {
    let result = [...nodes]
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(n =>
        n.concept.includes(q) ||
        n.definition.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'recent') result.sort((a, b) => b.lastSeen - a.lastSeen)
    else if (sortBy === 'mastery') result.sort((a, b) => b.mastery - a.mastery)
    else result.sort((a, b) => a.subject.localeCompare(b.subject) || a.concept.localeCompare(b.concept))
    return result
  }, [nodes, query, sortBy])

  const handleSelect = (node) => setSelected(prev => prev?.id === node.id ? null : node)

  useEffect(() => {
    if (query) setSelected(null)
  }, [query])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-panel"
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#05061a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Background glows */}
      <div aria-hidden style={{ position: 'absolute', top: '10%', left: '15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.15) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '15%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,143,255,0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(139,143,255,0.15)', border: '1px solid rgba(139,143,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} color="#8B8FFF" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em' }}>Second Brain</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Everything you've learned with Aeva</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ flex: 1, position: 'relative', maxWidth: 400 }}>
          <Search size={14} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search concepts, subjects, definitions…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.88)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
          {[['constellation', <Network size={14} />, 'Graph'], ['index', <BookOpen size={14} />, 'Index']].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, background: view === v ? 'rgba(139,143,255,0.20)' : 'transparent', color: view === v ? 'rgba(200,200,255,0.92)' : 'rgba(255,255,255,0.40)', transition: 'all 0.18s' }}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Sort (index only) */}
        {view === 'index' && (
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <option value="recent">Recent</option>
            <option value="mastery">Mastery</option>
            <option value="subject">Subject</option>
          </select>
        )}

        {onMirrorOpen && (
          <motion.button onClick={onMirrorOpen}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(109,40,217,0.22), rgba(139,92,246,0.14))', border: '1px solid rgba(139,92,246,0.35)', color: 'rgba(216,180,254,0.90)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            🪞 Talk to Mirror
          </motion.button>
        )}

        <button onClick={onClose}
          style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Stats row */}
      <div className="brain-stats" style={{ padding: '14px 24px', display: 'flex', gap: 10, flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <StatPill icon={Brain}       label="concepts"     value={stats.total}    color="#8B8FFF" />
        <StatPill icon={TrendingUp}  label="mastered"     value={stats.mastered} color="#4ADE80" />
        <StatPill icon={BookOpen}    label="subjects"     value={stats.subjects} color="#60A5FA" />
        <StatPill icon={Clock}       label="this week"    value={stats.thisWeek} color="#F59E0B" />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '0 24px 20px', display: 'flex', minHeight: 0, position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {view === 'constellation'
            ? <ConstellationView key="constellation" nodes={filtered} onSelect={handleSelect} selectedId={selected?.id} />
            : <IndexView key="index" nodes={filtered} onSelect={handleSelect} />
          }
        </AnimatePresence>

        <AnimatePresence>
          {selected && (
            <DetailPanel
              key={selected.id}
              node={selected}
              allNodes={nodes}
              onClose={() => setSelected(null)}
              onSearch={concept => { setQuery(concept); setView('index') }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
