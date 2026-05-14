import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, RotateCcw, Trash2, BookOpen } from 'lucide-react'
import { useLibraryStore } from './libraryStore'

/* ── Helpers ─────────────────────────────────────────── */
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function typeLabel(type) {
  if (type === 'lens')   return { icon: '📷', label: 'Lens', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)' }
  if (type === 'drill')  return { icon: '📝', label: 'Drill', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' }
  if (type === 'lockin') return { icon: '🎯', label: 'Lock-In', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)' }
  return { icon: '💬', label: 'Chat', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' }
}

/* ── PDF export for a single library session ─────────── */
function exportSessionPDF(session) {
  const t = typeLabel(session.type)
  const date = new Date(session.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const stepsHTML = (session.steps || []).map((s, i) => {
    const verb  = typeof s === 'string' ? '' : s.verb || ''
    const title = typeof s === 'string' ? s : s.title || ''
    const body  = typeof s === 'string' ? '' : s.body || ''
    const formula = typeof s === 'string' ? '' : s.formula || ''
    return `<div style="margin-bottom:14px;padding:12px 14px;border-radius:10px;background:#f8f7ff;border:1px solid #e9e3ff">
      <div style="font-size:9px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#7c3aed;margin-bottom:4px">${verb} ${i + 1}</div>
      <div style="font-size:13px;font-weight:700;color:#1e1b4b;margin-bottom:4px">${title}</div>
      ${body ? `<div style="font-size:12px;color:#374151;line-height:1.55">${body}</div>` : ''}
      ${formula ? `<div style="font-size:12px;font-family:monospace;color:#4c1d95;margin-top:6px;padding:6px 10px;background:#ede9fe;border-radius:6px">${formula}</div>` : ''}
    </div>`
  }).join('')

  const varsHTML = (session.variables || []).map(v =>
    `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;background:#f5f3ff;border:1px solid #ddd6fe;font-size:12px;color:#4c1d95;font-weight:600;margin:3px">
      <b>${v.symbol}</b> = ${v.value ?? '?'} <span style="color:#9ca3af;font-weight:400">${v.meaning || ''}</span>
    </span>`
  ).join('')

  const focusBlock = session.type === 'lockin' ? `
    <div style="margin-top:24px;padding:16px 20px;border-radius:12px;background:#f0fdf4;border:1.5px solid #bbf7d0">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#16a34a;margin-bottom:8px">Lock-In Performance</div>
      <div style="display:flex;gap:24px">
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Focus Score</div><div style="font-size:24px;font-weight:900;color:#16a34a">${session.focusScore ?? '—'}%</div></div>
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Duration</div><div style="font-size:24px;font-weight:900;color:#16a34a">${session.focusDuration ? Math.round(session.focusDuration / 60) + 'm' : '—'}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Concepts</div><div style="font-size:24px;font-weight:900;color:#16a34a">${session.conceptCount ?? '—'}</div></div>
      </div>
    </div>` : ''

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Aeva — ${session.topic}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#111827;background:#fff;font-size:13px;line-height:1.6}
  .page{max-width:700px;margin:0 auto;padding:48px 40px}
  .cover{border-bottom:3px solid #7c3aed;padding-bottom:24px;margin-bottom:28px}
  .badge{display:inline-flex;align-items:center;gap:6px;background:#f3f0ff;border:1.5px solid #c4b5fd;border-radius:99px;padding:4px 12px;font-size:10px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#7c3aed;margin-bottom:14px}
  .title{font-size:26px;font-weight:900;color:#1e1b4b;letter-spacing:-.03em;margin-bottom:8px}
  .insight{font-size:15px;color:#374151;line-height:1.65;margin-bottom:14px}
  .section{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;border-bottom:1px solid #e9e3ff;padding-bottom:6px;margin:24px 0 14px}
  .pattern{font-family:monospace;font-size:14px;font-weight:700;color:#4c1d95;padding:12px 16px;background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:10px;margin-bottom:14px}
  .footer{margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between}
  .brand{font-size:12px;font-weight:800;color:#7c3aed}
  .date{font-size:11px;color:#9ca3af}
  @media print{body{font-size:12px}.page{padding:24px}}
</style></head><body><div class="page">
  <div class="cover">
    <div class="badge">${t.icon} Aeva ${t.label}</div>
    <div class="title">${session.topic}</div>
    <div class="insight">${session.coreInsight || ''}</div>
    <div style="display:flex;gap:20px;font-size:11px;color:#9ca3af">
      <span>Date: ${date}</span>
      <span>Type: ${t.label}</span>
    </div>
  </div>
  ${session.pattern ? `<div class="section">Key Pattern</div><div class="pattern">${session.pattern}</div>` : ''}
  ${varsHTML ? `<div class="section">Variables</div><div style="margin-bottom:14px">${varsHTML}</div>` : ''}
  ${stepsHTML ? `<div class="section">Step-by-Step</div>${stepsHTML}` : ''}
  ${focusBlock}
  <div class="footer"><div class="brand">★ aeva</div><div class="date">Generated ${date}</div></div>
</div></body></html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) { alert('Allow pop-ups to export.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => setTimeout(() => { win.focus(); win.print() }, 500)
}

/* ── Single Library Card ─────────────────────────────── */
function LibraryCard({ session, onReopen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const t = typeLabel(session.type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.015 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        borderRadius: 18,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.2s',
        borderColor: hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)',
      }}
    >
      {/* Image preview (lens only) */}
      {session.imageData && (
        <div style={{ height: 90, overflow: 'hidden', background: 'rgba(0,0,0,0.40)' }}>
          <img src={session.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(to bottom, transparent 40%, rgba(8,9,26,0.85))' }} />
        </div>
      )}

      {/* No-image placeholder for drills / lockin */}
      {!session.imageData && (
        <div style={{ height: 72, background: `linear-gradient(135deg, ${t.bg}, rgba(255,255,255,0.02))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.7 }}>
          {t.icon}
        </div>
      )}

      <div style={{ padding: '12px 14px 14px' }}>
        {/* Type badge + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: t.bg, border: `1px solid ${t.border}`, fontSize: 9.5, fontWeight: 700, color: t.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {t.icon} {t.label}
          </div>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{timeAgo(session.savedAt)}</span>
        </div>

        {/* Topic */}
        <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.01em', marginBottom: 4, lineHeight: 1.3 }}>
          {session.topic}
        </div>

        {/* Core insight */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {session.coreInsight}
        </div>

        {/* Pattern pill */}
        {session.pattern && (
          <div style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(139,143,255,0.10)', border: '1px solid rgba(139,143,255,0.20)', fontSize: 10.5, fontFamily: 'monospace', color: 'rgba(167,139,250,0.85)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.pattern}
          </div>
        )}

        {/* Lock-In score */}
        {session.type === 'lockin' && session.focusScore != null && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.20)', fontSize: 10.5, color: '#4ADE80', fontWeight: 700 }}>
              {session.focusScore}% focus
            </div>
            {session.conceptCount != null && (
              <div style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.14)', fontSize: 10.5, color: 'rgba(74,222,128,0.70)', fontWeight: 600 }}>
                {session.conceptCount} concept{session.conceptCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onReopen(session)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 10, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.22)', color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <RotateCcw size={11} /> Re-open
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => exportSessionPDF(session)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Download size={11} /> PDF
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onDelete(session.id)}
            style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 0', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.55)', fontSize: 11, cursor: 'pointer' }}>
            <Trash2 size={11} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Section group ───────────────────────────────────── */
function Section({ title, sessions, onReopen, onDelete }) {
  if (!sessions.length) return null
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {sessions.map(s => (
          <LibraryCard key={s.id} session={s} onReopen={onReopen} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function AevaLibrary({ onClose, onReopenLens, onReopenDrill }) {
  const { sessions, getGrouped, deleteSession, clearAll } = useLibraryStore()
  const [confirmClear, setConfirmClear] = useState(false)

  const grouped = getGrouped()
  const isEmpty = sessions.length === 0

  const handleReopen = (session) => {
    if (!session.analysis) return
    if (session.type === 'lens') onReopenLens?.(session)
    else if (session.type === 'drill') onReopenDrill?.(session)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(4,6,20,0.85)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', maxWidth: 1000, width: '100%', margin: '0 auto', padding: '0 20px' }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '22px 4px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={18} color="#A78BFA" />
            <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>Aeva Library</span>
            <div style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.28)', fontSize: 10, fontWeight: 700, color: '#A78BFA' }}>
              {sessions.length} sessions
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {sessions.length > 0 && (
              confirmClear ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.80)' }}>Clear all?</span>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { clearAll(); setConfirmClear(false) }}
                    style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)', color: '#F87171', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Yes</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirmClear(false)}
                    style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancel</motion.button>
                </div>
              ) : (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmClear(true)}
                  style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(239,68,68,0.60)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Clear All
                </motion.button>
              )
            )}
            <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 32 }}>
          {isEmpty ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, gap: 12 }}>
              <div style={{ fontSize: 40 }}>📚</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>Your library is empty</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: 280, lineHeight: 1.55 }}>
                Sessions from Aeva Lens and Custom Drill auto-save here. Lock-In sessions are saved at the end.
              </div>
            </motion.div>
          ) : (
            <>
              <Section title="Today"      sessions={grouped.today}     onReopen={handleReopen} onDelete={deleteSession} />
              <Section title="Yesterday"  sessions={grouped.yesterday}  onReopen={handleReopen} onDelete={deleteSession} />
              <Section title="This Week"  sessions={grouped.thisWeek}   onReopen={handleReopen} onDelete={deleteSession} />
              <Section title="Older"      sessions={grouped.older}      onReopen={handleReopen} onDelete={deleteSession} />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
