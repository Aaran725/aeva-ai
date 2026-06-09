/**
 * YourUI — full-screen UI customisation editor.
 *
 * Left panel:  all controls (background, accent, shape, font, motion, density, hidden elements)
 * Right panel: live mini preview — updates instantly as you change anything
 *
 * Changes apply to CSS custom properties on :root in real time.
 * Saved to localStorage via uiThemeStore.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Zap } from 'lucide-react'
import {
  useUITheme, applyCSS,
  FONT_OPTIONS, ACCENT_PRESETS, HIDEABLE, DEFAULT_UI,
} from './uiThemeStore'

/* ── Angle options ─────────────────────────────────────────────────────────── */
const ANGLES = [
  { label: '↗', value: 45  },
  { label: '→', value: 90  },
  { label: '↘', value: 135 },
  { label: '↓', value: 180 },
  { label: '↙', value: 225 },
  { label: '←', value: 270 },
  { label: '↖', value: 315 },
  { label: '↑', value: 0   },
]

/* ── Section wrapper ───────────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

/* ── Pill button ───────────────────────────────────────────────────────────── */
function Pill({ active, onClick, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
        background: active ? 'rgba(129,140,248,0.22)' : 'rgba(255,255,255,0.05)',
        border: active ? '1px solid rgba(129,140,248,0.45)' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#A5B4FC' : 'rgba(255,255,255,0.40)',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >{children}</motion.button>
  )
}

/* ── Toggle row ────────────────────────────────────────────────────────────── */
function ToggleRow({ label, desc, active, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{desc}</div>
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onToggle}
        style={{
          width: 44, height: 24, borderRadius: 99, flexShrink: 0, cursor: 'pointer',
          background: active ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.08)',
          border: active ? '1px solid rgba(129,140,248,0.50)' : '1px solid rgba(255,255,255,0.12)',
          position: 'relative', transition: 'all 0.2s',
        }}
      >
        <motion.div
          animate={{ x: active ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: active ? '#A5B4FC' : 'rgba(255,255,255,0.30)' }}
        />
      </motion.button>
    </div>
  )
}

/* ── Live mini preview ─────────────────────────────────────────────────────── */
function MiniPreview({ theme }) {
  const { bgFrom, bgTo, bgAngle, accent, font, radius, hidden } = theme
  const bg = `linear-gradient(${bgAngle}deg, ${bgFrom} 0%, ${bgTo} 100%)`
  const fam = FONT_OPTIONS.find(f => f.id === font)?.family || FONT_OPTIONS[0].family
  const r = Math.min(radius, 24) // cap at 24px for the small preview
  const accentDim = accent + '28'
  const accentBorder = accent + '55'

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.70)',
      background: bg,
      fontFamily: fam,
      width: '100%', maxWidth: 480,
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(16px)' }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#fff' }}>★</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.03em' }}>aeva</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {!hidden.includes('xp') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, background: accentDim, border: `1px solid ${accentBorder}`, fontSize: 9.5, fontWeight: 700, color: accent }}>
              <Zap size={7} fill={accent} color={accent} /> Lv 4
            </div>
          )}
          {!hidden.includes('streak') && (
            <div style={{ padding: '2px 7px', borderRadius: 99, background: 'rgba(180,50,15,0.22)', border: '1px solid rgba(200,80,30,0.32)', fontSize: 9.5, fontWeight: 700, color: '#FDBA74' }}>
              🔥 7
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Aeva bubble */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <div style={{ width: 22, height: 22, borderRadius: Math.min(r, 8), background: accentDim, border: `1px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 9 }}>✦</span>
          </div>
          <div style={{ padding: '8px 11px', borderRadius: `4px ${r}px ${r}px ${r}px`, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderLeft: `2px solid ${accentBorder}`, flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>Good — let's push this further. What happens when the gradient approaches zero?</div>
          </div>
        </div>

        {/* User bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ padding: '8px 11px', borderRadius: `${r}px ${r}px 4px ${r}px`, background: `linear-gradient(135deg, ${accent}55, ${accent}33)`, border: `1px solid ${accent}44`, maxWidth: '70%' }}>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.90)', lineHeight: 1.5 }}>It converges, so f′(x) → 0 as x → ∞</div>
          </div>
        </div>

        {/* Another Aeva bubble */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <div style={{ width: 22, height: 22, borderRadius: Math.min(r, 8), background: accentDim, border: `1px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 9 }}>✦</span>
          </div>
          <div style={{ padding: '8px 11px', borderRadius: `4px ${r}px ${r}px ${r}px`, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderLeft: `2px solid ${accentBorder}`, flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>Exactly. +75 XP — first-principles reasoning. 🏆</div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: `${Math.min(r, 16)}px`, background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentBorder}` }}>
          <div style={{ flex: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>Ask a follow-up…</div>
          <div style={{ width: 22, height: 22, borderRadius: `${Math.min(r, 12)}px`, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#fff' }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function YourUI({ onClose }) {
  const store = useUITheme()
  const { bgFrom, bgTo, bgAngle, accent, font, radius, motion: motionEnabled, density, hidden } = store

  // Local draft state — apply live but can be reset
  const set = (patch) => store.setUI(patch)

  const fontFamily = FONT_OPTIONS.find(f => f.id === font)?.family || FONT_OPTIONS[0].family

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(4,5,18,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflowY: 'auto',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, height: 58, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.30)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎨</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>YOUR UI</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500, marginLeft: 4 }}>every change is live</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={() => store.reset()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <RotateCcw size={11} /> Reset
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} />
          </motion.button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: Controls ───────────────────────────────────────────────── */}
        <div style={{ width: 420, flexShrink: 0, overflowY: 'auto', padding: '28px 32px' }}>

          {/* BACKGROUND */}
          <Section title="Background">
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {/* From colour */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>FROM</div>
                <label style={{ display: 'block', position: 'relative', cursor: 'pointer' }}>
                  <input
                    type="color"
                    value={bgFrom}
                    onChange={e => set({ bgFrom: e.target.value })}
                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ height: 44, borderRadius: 12, background: bgFrom, border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: "'JetBrains Mono', monospace" }}>{bgFrom}</span>
                  </div>
                </label>
              </div>
              {/* To colour */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>TO</div>
                <label style={{ display: 'block', position: 'relative', cursor: 'pointer' }}>
                  <input
                    type="color"
                    value={bgTo}
                    onChange={e => set({ bgTo: e.target.value })}
                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ height: 44, borderRadius: 12, background: bgTo, border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: "'JetBrains Mono', monospace" }}>{bgTo}</span>
                  </div>
                </label>
              </div>
            </div>
            {/* Angle */}
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>DIRECTION</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ANGLES.map(a => (
                <motion.button
                  key={a.value}
                  whileTap={{ scale: 0.90 }}
                  onClick={() => set({ bgAngle: a.value })}
                  style={{
                    flex: 1, height: 34, borderRadius: 9, border: 'none',
                    background: bgAngle === a.value ? 'rgba(129,140,248,0.22)' : 'rgba(255,255,255,0.05)',
                    border: bgAngle === a.value ? '1px solid rgba(129,140,248,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: bgAngle === a.value ? '#A5B4FC' : 'rgba(255,255,255,0.40)',
                    fontSize: 14, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >{a.label}</motion.button>
              ))}
            </div>
          </Section>

          {/* ACCENT */}
          <Section title="Accent Colour">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {ACCENT_PRESETS.map(p => (
                <motion.button
                  key={p.color}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => set({ accent: p.color })}
                  title={p.label}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: p.color,
                    boxShadow: accent === p.color ? `0 0 0 3px rgba(255,255,255,0.15), 0 0 16px ${p.color}88` : `0 0 0 2px rgba(255,255,255,0.06)`,
                    transform: accent === p.color ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
              {/* Custom colour picker */}
              <label title="Custom colour" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.20)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                <input
                  type="color"
                  value={accent}
                  onChange={e => set({ accent: e.target.value })}
                  style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 16, pointerEvents: 'none' }}>+</span>
              </label>
            </div>
            {/* Accent preview bar */}
            <div style={{ height: 6, borderRadius: 99, background: `linear-gradient(90deg, ${accent}22, ${accent}, ${accent}22)` }} />
          </Section>

          {/* SHAPE */}
          <Section title="Shape">
            <div style={{ marginBottom: 10 }}>
              <input
                type="range"
                min={0}
                max={99}
                value={radius}
                onChange={e => set({ radius: Number(e.target.value) })}
                style={{ width: '100%', accentColor: accent }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Sharp</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{radius}px</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Pill</span>
              </div>
            </div>
            {/* Shape preview pills */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[0, 16, 32, 99].map(r => (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => set({ radius: r })}
                  style={{
                    flex: 1, height: 34, borderRadius: `${r}px`, cursor: 'pointer',
                    background: radius === r ? `${accent}22` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${radius === r ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
                    color: radius === r ? accent : 'rgba(255,255,255,0.35)',
                    fontSize: 10, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                >{r === 0 ? 'Sharp' : r === 16 ? 'Card' : r === 32 ? 'Soft' : 'Pill'}</motion.button>
              ))}
            </div>
          </Section>

          {/* FONT */}
          <Section title="Font">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FONT_OPTIONS.map(f => (
                <motion.button
                  key={f.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => set({ font: f.id })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 14, cursor: 'pointer',
                    background: font === f.id ? `${accent}14` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${font === f.id ? accent + '44' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: f.family, color: font === f.id ? '#fff' : 'rgba(255,255,255,0.65)' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2, fontFamily: f.family }}>{f.sample}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: f.family, color: font === f.id ? accent : 'rgba(255,255,255,0.20)', letterSpacing: '-0.03em' }}>Aa</div>
                </motion.button>
              ))}
            </div>
          </Section>

          {/* MOTION */}
          <Section title="Animations">
            <div style={{ display: 'flex', gap: 8 }}>
              <Pill active={motionEnabled === true}  onClick={() => set({ motion: true  })}>On</Pill>
              <Pill active={motionEnabled === false} onClick={() => set({ motion: false })}>Off</Pill>
            </div>
          </Section>

          {/* DENSITY */}
          <Section title="Density">
            <div style={{ display: 'flex', gap: 8 }}>
              <Pill active={density === 0.85} onClick={() => set({ density: 0.85 })}>Compact</Pill>
              <Pill active={density === 1}    onClick={() => set({ density: 1    })}>Normal</Pill>
              <Pill active={density === 1.15} onClick={() => set({ density: 1.15 })}>Spacious</Pill>
            </div>
          </Section>

          {/* HIDE ELEMENTS */}
          <Section title="Show / Hide">
            <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '0 16px', overflow: 'hidden' }}>
              {HIDEABLE.map(item => (
                <ToggleRow
                  key={item.key}
                  label={item.label}
                  desc={item.desc}
                  active={!hidden.includes(item.key)}
                  onToggle={() => store.toggleHidden(item.key)}
                />
              ))}
            </div>
          </Section>

        </div>

        {/* ── Right: Live preview ───────────────────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, padding: '28px 40px',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'sticky', top: 0, height: '100%',
          background: 'rgba(0,0,0,0.20)',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>LIVE PREVIEW</div>
          <MiniPreview theme={{ bgFrom, bgTo, bgAngle, accent, font, radius, hidden }} />
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
              Changes apply to the whole app instantly.<br />Close this panel to see the full effect.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
