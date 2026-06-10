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
  bgFrom:         '#06071e',
  bgTo:           '#1e2480',
  bgAngle:        145,
  accent:         '#818CF8',
  font:           'inter',
  radius:         16,          // 0 = sharp, 99 = pill
  motion:         true,        // true = animations on, false = off
  density:        1,           // 0.85 = compact, 1 = normal, 1.15 = spacious
  surfaceOpacity: 0.96,        // 0.20 = frosted glass, 0.97 = near-solid
  hidden:         [],
}

function persist(s) {
  const { bgFrom, bgTo, bgAngle, accent, font, radius, motion, density, surfaceOpacity, hidden } = s
  return { bgFrom, bgTo, bgAngle, accent, font, radius, motion, density, surfaceOpacity, hidden }
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
  const { bgFrom, bgTo, bgAngle, accent, font, radius, motion, density, surfaceOpacity } = {
    ...DEFAULT_UI,
    ...theme,
  }
  const r = document.documentElement
  const bg = `linear-gradient(${bgAngle}deg, ${bgFrom} 0%, ${bgTo} 100%)`

  /* ── Layer 2: YOUR UI base tokens ── */
  r.style.setProperty('--ui-bg',      bg)
  r.style.setProperty('--ui-accent',  accent)
  r.style.setProperty('--ui-radius',  `${radius}px`)
  r.style.setProperty('--ui-motion',  motion ? '1' : '0')
  r.style.setProperty('--ui-density', String(density))
  const fam = FONT_OPTIONS.find(f => f.id === font)?.family || FONT_OPTIONS[0].family
  r.style.setProperty('--ui-font', fam)
  r.style.fontFamily = fam

  /* ── Layer 2 derived: surface opacity (overrides :root default) ── */
  const op = Math.max(0.10, Math.min(0.97, surfaceOpacity))
  r.style.setProperty('--aeva-surface-1', `rgba(8,9,26,${op})`)
  // Secondary and tertiary surfaces scale proportionally
  r.style.setProperty('--aeva-surface-2', `rgba(255,255,255,${(op * 0.031).toFixed(3)})`)
  r.style.setProperty('--aeva-surface-3', `rgba(255,255,255,${(op * 0.062).toFixed(3)})`)

  /* ── Layer 2 derived: radius scale ── */
  r.style.setProperty('--aeva-radius-sm',   `${Math.round(radius * 0.5)}px`)
  r.style.setProperty('--aeva-radius-md',   `${radius}px`)
  r.style.setProperty('--aeva-radius-lg',   `${Math.round(radius * 1.5)}px`)
  r.style.setProperty('--aeva-radius-xl',   `${Math.min(Math.round(radius * 2), 48)}px`)
  // --aeva-radius-pill stays at 99px (set in :root, never changes)

  /* ── Layer 2 derived: spacing scale (density-responsive) ── */
  r.style.setProperty('--aeva-space-xs', `${Math.round(4  * density)}px`)
  r.style.setProperty('--aeva-space-sm', `${Math.round(8  * density)}px`)
  r.style.setProperty('--aeva-space-md', `${Math.round(16 * density)}px`)
  r.style.setProperty('--aeva-space-lg', `${Math.round(24 * density)}px`)
  r.style.setProperty('--aeva-space-xl', `${Math.round(40 * density)}px`)

  /* ── Background layers ──────────────────────────────────────────────────────
     body carries the actual gradient (the visible theme base).
     html gets bgFrom as a solid match for the scrollbar gutter — since the
     gradient starts at bgFrom, the gutter blends in rather than creating a stripe.
     body::before (in index.css) has transparent base so the gradient shows through,
     with animated accent blobs floating on top for atmosphere.
  ── */
  document.documentElement.style.background = bgFrom
  document.body.style.background = `linear-gradient(${bgAngle}deg, ${bgFrom} 0%, ${bgTo} 100%)`

  // Motion off → data-reduce-motion="true" on <html>; CSS zeroes all durations.
  document.documentElement.dataset.reduceMotion = motion ? 'false' : 'true'

  /* ── Atmosphere CSS variables → body::before reads these in index.css ──────
     Accent blobs at higher opacity so colour is clearly visible.
     bgTo/bgFrom shadow blobs kept very low so the gradient base shows through.
  ── */
  const hexToRgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16))
  const [ar,ag,ab] = hexToRgb(accent)
  const [fr,fg,fb] = hexToRgb(bgFrom)
  const [tr,tg,tb] = hexToRgb(bgTo)
  r.style.setProperty('--atm-1', `rgba(${ar},${ag},${ab},0.70)`)
  r.style.setProperty('--atm-2', `rgba(${ar},${ag},${ab},0.55)`)
  r.style.setProperty('--atm-3', `rgba(${ar},${ag},${ab},0.42)`)
  r.style.setProperty('--atm-4', `rgba(${ar},${ag},${ab},0.26)`)
  r.style.setProperty('--atm-5', `rgba(${tr},${tg},${tb},0.22)`)
  r.style.setProperty('--atm-6', `rgba(${fr},${fg},${fb},0.18)`)
  r.style.setProperty('--atm-base', 'transparent')

  // Dynamic stylesheet: accent + component targets that can't read vars from inline JS.
  let s = document.getElementById('_ui_theme')
  if (!s) { s = document.createElement('style'); s.id = '_ui_theme'; document.head.appendChild(s) }
  s.textContent = `
    /* ── Scrollbar ── */
    ::-webkit-scrollbar-thumb          { background: ${accent}35 !important; }
    ::-webkit-scrollbar-thumb:hover    { background: ${accent}60 !important; }

    /* ── Text selection ── */
    ::selection                        { background: ${accent}44; color: #fff; }

    /* ── Dashboard elements ── */
    .xp-bar-fill  { background: linear-gradient(90deg, ${accent}, ${accent}cc) !important; }
    .lv-pill      { background: ${accent}22 !important; border-color: ${accent}55 !important; color: ${accent} !important; }

    /* ── Nav feature buttons (Maps, Arcade) — respond to accent ── */
    .nav-btn-feature {
      background: ${accent}18 !important;
      border: 1px solid ${accent}44 !important;
      color: rgba(255,255,255,0.88) !important;
    }
    .nav-btn-feature:hover {
      background: ${accent}28 !important;
      border-color: ${accent}66 !important;
    }

    /* ── Aeva OS glass card accent glow (opt-in class) ── */
    .aeva-card-glow { box-shadow: var(--aeva-shadow-card), 0 0 24px 2px ${accent}18; }
    .aeva-card-glow:hover { box-shadow: var(--aeva-shadow-raised), 0 0 32px 4px ${accent}28; }

    /* ── Accent utility classes ── */
    .aeva-accent          { color: ${accent}; }
    .aeva-accent-bg-faint { background: ${accent}12; }
    .aeva-accent-bg-soft  { background: ${accent}22; }
    .aeva-accent-border   { border-color: ${accent}44 !important; }
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
