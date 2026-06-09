/**
 * uiThemeStore — YOUR UI global theme state.
 *
 * Stores user's design choices and applies them as CSS custom properties
 * on document.documentElement so they propagate everywhere.
 */
import { create } from 'zustand'

const KEY = 'aeva_your_ui_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }

/* ── Font options ──────────────────────────────────────────────────────────── */
export const FONT_OPTIONS = [
  { id: 'inter',   label: 'System',  family: "'Inter', system-ui, sans-serif",                   sample: 'Clean and modern' },
  { id: 'mono',    label: 'Mono',    family: "'JetBrains Mono', 'Fira Code', monospace",          sample: 'Code aesthetic' },
  { id: 'serif',   label: 'Serif',   family: "'Playfair Display', Georgia, serif",                sample: 'Editorial feel' },
  { id: 'rounded', label: 'Rounded', family: "'Nunito', 'Varela Round', system-ui, sans-serif",   sample: 'Soft and friendly' },
  { id: 'display', label: 'Display', family: "'Space Grotesk', system-ui, sans-serif",            sample: 'Bold and striking' },
]

/* ── Accent presets ────────────────────────────────────────────────────────── */
export const ACCENT_PRESETS = [
  { color: '#818CF8', label: 'Indigo'  },
  { color: '#34D399', label: 'Emerald' },
  { color: '#F472B6', label: 'Pink'    },
  { color: '#60A5FA', label: 'Blue'    },
  { color: '#FB923C', label: 'Orange'  },
  { color: '#A78BFA', label: 'Violet'  },
  { color: '#FBBF24', label: 'Amber'   },
  { color: '#F87171', label: 'Rose'    },
]

/* ── Hideable elements ─────────────────────────────────────────────────────── */
export const HIDEABLE = [
  { key: 'xp',           label: 'XP & Level',       desc: 'Level pill, XP bar and toast notifications' },
  { key: 'streak',       label: 'Streak counter',    desc: 'Daily streak badge and banner' },
  { key: 'stats',        label: 'Stats strip',       desc: 'Exchange count in widget mode' },
  { key: 'widgetToggle', label: 'Widget toggles',    desc: 'Classic / Widget switch buttons' },
  { key: 'tips',         label: 'Feature tips',      desc: 'One-time spotlight banners on each screen' },
]

/* ── Defaults ──────────────────────────────────────────────────────────────── */
export const DEFAULT_UI = {
  bgFrom:  '#08091a',
  bgTo:    '#0f0f2e',
  bgAngle: 145,
  accent:  '#818CF8',
  font:    'inter',
  radius:  16,          // 0 = sharp, 99 = pill
  motion:  true,        // true = animations on, false = off
  density: 1,           // 0.85 = compact, 1 = normal, 1.15 = spacious
  hidden:  [],
}

function persist(s) {
  const { bgFrom, bgTo, bgAngle, accent, font, radius, motion, density, hidden } = s
  return { bgFrom, bgTo, bgAngle, accent, font, radius, motion, density, hidden }
}

/* ── Store ─────────────────────────────────────────────────────────────────── */
export const useUITheme = create((set) => ({
  ...DEFAULT_UI,
  ...(load() || {}),

  setUI: (patch) => set(s => {
    const next = { ...s, ...patch }
    save(persist(next))
    applyCSS(next)
    return next
  }),

  toggleHidden: (key) => set(s => {
    const hidden = s.hidden.includes(key)
      ? s.hidden.filter(h => h !== key)
      : [...s.hidden, key]
    const next = { ...s, hidden }
    save(persist(next))
    return next
  }),

  reset: () => set(() => {
    save(DEFAULT_UI)
    applyCSS(DEFAULT_UI)
    return { ...DEFAULT_UI }
  }),
}))

/* ── Apply CSS variables to :root ──────────────────────────────────────────── */
export function applyCSS(theme) {
  const { bgFrom, bgTo, bgAngle, accent, font, radius, motion, density } = {
    ...DEFAULT_UI,
    ...theme,
  }
  const r = document.documentElement
  const bg = `linear-gradient(${bgAngle}deg, ${bgFrom} 0%, ${bgTo} 100%)`
  r.style.setProperty('--ui-bg',      bg)
  r.style.setProperty('--ui-accent',  accent)
  r.style.setProperty('--ui-radius',  `${radius}px`)
  r.style.setProperty('--ui-motion',  motion ? '1' : '0')
  r.style.setProperty('--ui-density', String(density))
  const fam = FONT_OPTIONS.find(f => f.id === font)?.family || FONT_OPTIONS[0].family
  r.style.setProperty('--ui-font', fam)
  r.style.fontFamily = fam

  // Apply background to body (the mesh overlay sits on top via body::before z-index:0,
  // so this tints the whole app shell without leaking — nav overflow is now fixed)
  document.body.style.background = bg

  // Inject a tiny dynamic stylesheet so accent + radius actually propagate to
  // visible elements that can't easily read CSS vars from inline JS
  let s = document.getElementById('_ui_theme')
  if (!s) { s = document.createElement('style'); s.id = '_ui_theme'; document.head.appendChild(s) }
  s.textContent = `
    ::-webkit-scrollbar-thumb          { background: ${accent}35 !important; }
    ::-webkit-scrollbar-thumb:hover    { background: ${accent}60 !important; }
    ::selection                        { background: ${accent}44; color: #fff; }
    .xp-bar-fill                       { background: linear-gradient(90deg, ${accent}, ${accent}cc) !important; }
    .lv-pill                           { background: ${accent}22 !important; border-color: ${accent}55 !important; color: ${accent} !important; }
  `
}

/* ── Convenience selector ──────────────────────────────────────────────────── */
export function useIsHidden(key) {
  return useUITheme(s => s.hidden.includes(key))
}

/* ── Auto-apply on module load (runs once when the store is first imported) ── */
if (typeof window !== 'undefined') {
  applyCSS(useUITheme.getState())
}
