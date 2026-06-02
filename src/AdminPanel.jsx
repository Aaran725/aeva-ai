import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNeuralStore } from './neuralStore'
import { useXPStore, ORBS, levelFromXP } from './xpStore'
import { useBrainStore } from './brainStore'
import { useLibraryStore } from './libraryStore'
import { Shield, LogOut, BarChart2, Database, Map, Wrench, Trash2, Download, Upload, RefreshCw, ChevronRight, Check, AlertTriangle } from 'lucide-react'

/* ── helpers ── */
function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : String(n ?? '—') }
function ago(ts) {
  if (!ts) return 'never'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/* ── design tokens ── */
const A = {
  bg:        '#0a0502',
  surface:   'rgba(255,80,20,0.06)',
  border:    'rgba(255,80,20,0.18)',
  accent:    '#FF5014',
  accentDim: 'rgba(255,80,20,0.22)',
  text:      'rgba(255,220,200,0.92)',
  muted:     'rgba(255,180,140,0.42)',
  green:     '#4ADE80',
  yellow:    '#FBBF24',
  red:       '#F87171',
}

function Tag({ color = A.accent, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 99,
      background: `${color}18`, border: `1px solid ${color}40`,
      fontSize: 11, fontWeight: 700, color,
      letterSpacing: '0.04em',
    }}>{children}</span>
  )
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{
      background: A.surface, border: `1px solid ${A.border}`,
      borderRadius: 16, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: A.muted, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || A.text, lineHeight: 1 }}>{fmt(value)}</div>
      {sub && <div style={{ fontSize: 11, color: A.muted }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: A.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function AdminInput({ label, value, onChange, type = 'text', min, max }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: A.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min} max={max}
        style={{
          padding: '10px 13px', borderRadius: 10,
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${A.border}`,
          color: A.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
          width: '100%', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = A.accent}
        onBlur={e => e.target.style.borderColor = A.border}
      />
    </div>
  )
}

function AdminSlider({ label, value, onChange, min = 0, max = 100, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: A.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
        <span style={{ fontSize: 12, fontWeight: 800, color: color || A.accent }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color || A.accent, cursor: 'pointer' }}
      />
    </div>
  )
}

function BtnAdmin({ onClick, children, danger, disabled }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      style={{
        padding: '10px 18px', borderRadius: 11,
        background: danger ? 'rgba(248,113,113,0.12)' : A.accentDim,
        border: `1px solid ${danger ? 'rgba(248,113,113,0.35)' : A.border}`,
        color: danger ? A.red : A.accent,
        fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </motion.button>
  )
}

/* ══════════════════════════════════════════════
   TABS
══════════════════════════════════════════════ */

/* ── Overview tab ── */
function TabOverview({ neural, xp }) {
  const level = levelFromXP(xp.xp)
  const orbDef = ORBS.find(o => o.id === xp.activeOrb)

  const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('aeva_'))
  const totalBytes = lsKeys.reduce((sum, k) => sum + (localStorage.getItem(k)?.length || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader>App Snapshot</SectionHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        <StatBox label="XP" value={xp.xp} sub={`Level ${level}`} color="#FBBF24" />
        <StatBox label="Streak" value={xp.streak} sub="days" color="#4ADE80" />
        <StatBox label="Sessions" value={neural.totalExchanges} sub="total exchanges" />
        <StatBox label="Concepts" value={neural.conceptMap.length} sub="tracked" color="#A78BFA" />
        <StatBox label="Mastered" value={neural.masteredTopics.length} sub="topics" color={A.green} />
        <StatBox label="Struggles" value={neural.struggleZones.length} sub="topics" color={A.red} />
        <StatBox label="Orbs" value={xp.unlockedOrbs.length} sub={`of ${ORBS.length}`} color="#E9A364" />
        <StatBox label="Storage" value={`${(totalBytes / 1024).toFixed(1)}kb`} sub={`${lsKeys.length} keys`} color={A.muted} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader>Neural Profile</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag>{neural.profileTitle}</Tag>
            <Tag color="#A78BFA">{neural.rank}</Tag>
            <Tag color="#60A5FA">{neural.orbPersonality}</Tag>
            <Tag color={A.green}>{neural.currentVibe}</Tag>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {neural.traits.map(t => (
              <div key={t.label} style={{ fontSize: 12.5, color: A.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>{t.icon}</span>{t.label}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 4 }}>
            {[
              ['Frustration', neural.frustrationScore],
              ['Competitiveness', neural.competitiveness],
              ['Depth', neural.depth],
              ['Humor Pref', `${neural.humorPreference}/10`],
              ['Avg Msg Length', `${neural.avgResponseLength}ch`],
              ['Fast Responses', neural.fastResponses],
            ].map(([l, v]) => (
              <div key={l} style={{ fontSize: 12, color: A.muted }}>
                <span style={{ color: A.text, fontWeight: 700 }}>{v}</span> {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader>Active Orb</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '14px 18px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: A.text }}>
            {orbDef?.emoji} {orbDef?.name} <Tag>{`Lv ${orbDef?.requiredLevel}`}</Tag>
          </div>
          <div style={{ fontSize: 12.5, color: A.muted, marginTop: 5 }}>{orbDef?.tagline}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader>LocalStorage Keys</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lsKeys.map(k => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: A.accent, fontFamily: 'monospace' }}>{k}</span>
              <span style={{ color: A.muted }}>{((localStorage.getItem(k)?.length || 0) / 1024).toFixed(2)}kb</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Data Editor tab ── */
function TabDataEditor({ neural, xp }) {
  const neuralStore = useNeuralStore()
  const xpStore = useXPStore()

  const [xpVal, setXpVal]       = useState(xp.xp)
  const [streak, setStreak]     = useState(xp.streak)
  const [frustration, setFrust] = useState(neural.frustrationScore)
  const [competitive, setComp]  = useState(neural.competitiveness)
  const [depth, setDepth]       = useState(neural.depth)
  const [humor, setHumor]       = useState(neural.humorPreference)
  const [orbId, setOrbId]       = useState(xp.activeOrb)
  const [saved, setSaved]       = useState(false)

  const handleSave = () => {
    // XP store patch
    const xpRaw = { ...xp, xp: xpVal, streak }
    try { localStorage.setItem('aeva_xp_v1', JSON.stringify(xpRaw)) } catch {}
    xpStore.xp = xpVal
    xpStore.streak = streak

    // Neural store patch
    const neuralRaw = { ...neural, frustrationScore: frustration, competitiveness: competitive, depth, humorPreference: humor }
    try { localStorage.setItem('aeva_neural_v1', JSON.stringify(neuralRaw)) } catch {}

    // Orb
    if (xp.unlockedOrbs.includes(orbId)) xpStore.setActiveOrb(orbId)
    else {
      const unlocked = [...xp.unlockedOrbs, orbId]
      const patch = { ...xp, xp: xpVal, streak, unlockedOrbs: unlocked, activeOrb: orbId }
      try { localStorage.setItem('aeva_xp_v1', JSON.stringify(patch)) } catch {}
    }

    setSaved(true)
    setTimeout(() => { setSaved(false); window.location.reload() }, 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <SectionHeader>XP & Progression</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AdminInput label="XP Total" type="number" value={xpVal} onChange={setXpVal} min={0} />
          <AdminInput label="Streak (days)" type="number" value={streak} onChange={setStreak} min={0} />
          <div>
            <SectionHeader>Active Orb</SectionHeader>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ORBS.map(o => (
                <motion.button key={o.id}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setOrbId(o.id)}
                  style={{
                    padding: '7px 13px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: orbId === o.id ? A.accentDim : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${orbId === o.id ? A.accent : 'rgba(255,255,255,0.10)'}`,
                    color: orbId === o.id ? A.accent : A.muted,
                  }}>
                  {o.emoji} {o.name}
                </motion.button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: A.muted, marginTop: 6 }}>Selecting a locked orb will unlock it.</div>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader>Neural Metrics</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AdminSlider label="Frustration" value={frustration} onChange={setFrust} color={A.red} />
          <AdminSlider label="Competitiveness" value={competitive} onChange={setComp} color="#FBBF24" />
          <AdminSlider label="Depth" value={depth} onChange={setDepth} color="#A78BFA" />
          <AdminSlider label="Humor Preference" value={humor} onChange={setHumor} min={0} max={10} color="#4ADE80" />
        </div>
      </div>

      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        style={{
          padding: '13px', borderRadius: 13,
          background: saved ? 'rgba(74,222,128,0.15)' : `linear-gradient(135deg, rgba(255,80,20,0.35), rgba(255,120,40,0.25))`,
          border: `1px solid ${saved ? 'rgba(74,222,128,0.40)' : A.accent}`,
          color: saved ? A.green : 'white',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {saved ? <><Check size={16} /> Saved — reloading…</> : 'Save Changes'}
      </motion.button>
    </div>
  )
}

/* ── Concept Map tab ── */
function TabConceptMap({ neural }) {
  const neuralStore = useNeuralStore()
  const [filter, setFilter] = useState('')
  const [editId, setEditId] = useState(null)
  const [editMastery, setEditMastery] = useState(0)
  const [saved, setSaved] = useState(null)

  const concepts = [...neural.conceptMap]
    .sort((a, b) => b.mastery - a.mastery)
    .filter(c => !filter || c.label.toLowerCase().includes(filter.toLowerCase()))

  const updateMastery = (id, mastery) => {
    const newMap = neural.conceptMap.map(c => c.id === id ? { ...c, mastery } : c)
    const updated = { ...neural, conceptMap: newMap }
    try { localStorage.setItem('aeva_neural_v1', JSON.stringify(updated)) } catch {}
    setSaved(id)
    setTimeout(() => { setSaved(null); window.location.reload() }, 900)
  }

  const deleteConcept = (id) => {
    const newMap = neural.conceptMap.filter(c => c.id !== id)
    const updated = { ...neural, conceptMap: newMap }
    try { localStorage.setItem('aeva_neural_v1', JSON.stringify(updated)) } catch {}
    window.location.reload()
  }

  const masteryColor = m => m >= 70 ? A.green : m >= 40 ? A.yellow : A.red

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader>Concept Map — {neural.conceptMap.length} nodes</SectionHeader>

      <input
        placeholder="Filter concepts…"
        value={filter} onChange={e => setFilter(e.target.value)}
        style={{
          padding: '10px 14px', borderRadius: 11,
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${A.border}`,
          color: A.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
        }}
      />

      {concepts.length === 0 && (
        <div style={{ fontSize: 13.5, color: A.muted, textAlign: 'center', padding: '32px 0' }}>
          No concepts tracked yet. Chat with Aeva to populate the map.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {concepts.map(c => (
          <div key={c.id} style={{
            background: A.surface, border: `1px solid ${A.border}`,
            borderRadius: 14, padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editId === c.id ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${masteryColor(c.mastery)}18`, border: `1px solid ${masteryColor(c.mastery)}35`, fontSize: 12, fontWeight: 800, color: masteryColor(c.mastery) }}>
                  {c.mastery}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text, textTransform: 'capitalize' }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: A.muted }}>
                    {c.visits} visits · last {ago(c.lastSeen)} · {c.category}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {saved === c.id
                  ? <Check size={16} color={A.green} />
                  : (
                    <>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }}
                        onClick={() => { setEditId(editId === c.id ? null : c.id); setEditMastery(c.mastery) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.muted, padding: 4 }}>
                        <ChevronRight size={14} style={{ transform: editId === c.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }}
                        onClick={() => deleteConcept(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,113,113,0.5)', padding: 4 }}>
                        <Trash2 size={13} />
                      </motion.button>
                    </>
                  )}
              </div>
            </div>

            <AnimatePresence>
              {editId === c.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                    <AdminSlider label="Mastery" value={editMastery} onChange={setEditMastery} color={masteryColor(editMastery)} />
                    <BtnAdmin onClick={() => updateMastery(c.id, editMastery)}>Save</BtnAdmin>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Dev Tools tab ── */
function TabDevTools({ neural, xp }) {
  const [confirm, setConfirm] = useState(null)
  const [done, setDone]       = useState(null)
  const [importText, setImportText] = useState('')
  const [importErr, setImportErr]   = useState('')

  const doAction = (key, fn) => {
    if (confirm !== key) { setConfirm(key); return }
    fn()
    setConfirm(null)
    setDone(key)
    setTimeout(() => setDone(null), 2500)
  }

  const resetStore = (storageKey, label) => doAction(`reset_${label}`, () => {
    localStorage.removeItem(storageKey)
    setTimeout(() => window.location.reload(), 300)
  })

  const exportAll = () => {
    const data = {}
    Object.keys(localStorage).filter(k => k.startsWith('aeva_')).forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k)) } catch { data[k] = localStorage.getItem(k) }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `aeva-backup-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importAll = () => {
    try {
      const data = JSON.parse(importText)
      Object.entries(data).forEach(([k, v]) => {
        try { localStorage.setItem(k, JSON.stringify(v)) } catch {}
      })
      setImportErr('')
      setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      setImportErr(`Invalid JSON: ${e.message}`)
    }
  }

  const STORES = [
    { key: 'aeva_neural_v1', label: 'Neural Profile', color: A.yellow },
    { key: 'aeva_xp_v1',     label: 'XP & Streaks',  color: A.green  },
    { key: 'aeva_brain_v1',  label: 'Second Brain',   color: '#A78BFA' },
    { key: 'aeva_library_v1', label: 'Library',       color: '#60A5FA' },
    { key: 'aeva_chat_settings', label: 'Chat Settings', color: A.muted },
    { key: 'aeva_onboarded', label: 'Onboarding flag', color: A.red },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div>
        <SectionHeader>Reset Individual Stores</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: A.muted, marginBottom: 4 }}>
            Click once to arm, click again to confirm. Page will reload after reset.
          </div>
          {STORES.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</div>
                <div style={{ fontSize: 10.5, color: A.muted, fontFamily: 'monospace' }}>{s.key}</div>
              </div>
              {done === `reset_${s.label}`
                ? <Tag color={A.green}><Check size={11} /> Reset</Tag>
                : (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => resetStore(s.key, s.label)}
                    style={{
                      padding: '7px 14px', borderRadius: 10,
                      background: confirm === `reset_${s.label}` ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${confirm === `reset_${s.label}` ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.10)'}`,
                      color: confirm === `reset_${s.label}` ? A.red : A.muted,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    {confirm === `reset_${s.label}` ? <><AlertTriangle size={12} /> Confirm reset</> : <><Trash2 size={12} /> Reset</>}
                  </motion.button>
                )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader>Backup & Restore</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BtnAdmin onClick={exportAll}><Download size={14} /> Export all data as JSON</BtnAdmin>

          <div style={{ height: 1, background: A.border }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: A.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Import JSON</label>
            <textarea
              value={importText} onChange={e => { setImportText(e.target.value); setImportErr('') }}
              placeholder='Paste exported JSON here…'
              rows={5}
              style={{
                padding: '10px 13px', borderRadius: 10, resize: 'vertical',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${A.border}`,
                color: A.text, fontSize: 12, fontFamily: 'monospace', outline: 'none',
                width: '100%', boxSizing: 'border-box',
              }}
            />
            {importErr && <div style={{ fontSize: 12, color: A.red }}>{importErr}</div>}
            <BtnAdmin onClick={importAll} disabled={!importText.trim()}><Upload size={14} /> Import & reload</BtnAdmin>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader>Quick Actions</SectionHeader>
        <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BtnAdmin onClick={() => {
            const patch = { ...xp, streak: 7 }
            try { localStorage.setItem('aeva_xp_v1', JSON.stringify(patch)) } catch {}
            window.location.reload()
          }}><RefreshCw size={13} /> Force streak to 7</BtnAdmin>

          <BtnAdmin onClick={() => {
            localStorage.removeItem('aeva_onboarded')
            window.location.reload()
          }} danger><RefreshCw size={13} /> Re-trigger onboarding</BtnAdmin>

          <BtnAdmin onClick={() => {
            // Unlock all orbs
            const patch = { ...xp, unlockedOrbs: ORBS.map(o => o.id) }
            try { localStorage.setItem('aeva_xp_v1', JSON.stringify(patch)) } catch {}
            window.location.reload()
          }}><RefreshCw size={13} /> Unlock all orbs</BtnAdmin>
        </div>
      </div>

    </div>
  )
}


/* ══════════════════════════════════════════════
   ADMIN PANEL MAIN
══════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',  label: 'Overview',    icon: BarChart2 },
  { id: 'data',      label: 'Data Editor', icon: Database  },
  { id: 'concepts',  label: 'Concepts',    icon: Map       },
  { id: 'devtools',  label: 'Dev Tools',   icon: Wrench    },
]

export default function AdminPanel({ onLogout }) {
  const neural = useNeuralStore()
  const xp     = useXPStore()
  const [tab, setTab] = useState('overview')

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: A.bg,
      fontFamily: "'Inter', system-ui, sans-serif",
      color: A.text,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56,
        background: 'rgba(10,5,2,0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${A.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${A.accent}, #FF8C40)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={13} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: A.text, letterSpacing: '-0.02em' }}>aeva admin</span>
          <Tag>private</Tag>
        </div>

        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.10)`,
            color: A.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <LogOut size={12} /> Exit
        </motion.button>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'rgba(10,5,2,0.85)',
        borderBottom: `1px solid ${A.border}`,
        padding: '0 24px',
        overflowX: 'auto',
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <motion.button key={t.id}
              onClick={() => setTab(t.id)}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '13px 18px', background: 'none', border: 'none',
                borderBottom: `2px solid ${active ? A.accent : 'transparent'}`,
                color: active ? A.accent : A.muted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', transition: 'color 0.18s',
              }}>
              <Icon size={13} />
              {t.label}
            </motion.button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 24px', maxWidth: 820, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            {tab === 'overview' && <TabOverview neural={neural} xp={xp} />}
            {tab === 'data'     && <TabDataEditor neural={neural} xp={xp} />}
            {tab === 'concepts' && <TabConceptMap neural={neural} />}
            {tab === 'devtools' && <TabDevTools neural={neural} xp={xp} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
