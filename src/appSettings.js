import { create } from 'zustand'

const KEY = 'aeva_app_settings_v1'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export const SECTION_BG_PRESETS = [
  { id: 'none',    label: 'Clear',   color: null,      gradient: 'transparent' },
  { id: 'default', label: 'Default', color: '#05061a', gradient: 'linear-gradient(172deg, rgba(4,5,18,0.82) 0%, rgba(5,6,22,0.78) 50%, rgba(4,5,18,0.82) 100%)' },
  { id: 'abyss',   label: 'Abyss',   color: '#010106', gradient: 'linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(2,2,8,0.92) 100%)' },
  { id: 'cosmic',  label: 'Cosmic',  color: '#1c063a', gradient: 'linear-gradient(172deg, rgba(30,8,62,0.92) 0%, rgba(16,5,42,0.90) 50%, rgba(8,3,26,0.92) 100%)' },
  { id: 'ember',   label: 'Ember',   color: '#240a04', gradient: 'linear-gradient(172deg, rgba(38,10,4,0.92) 0%, rgba(24,7,3,0.90) 50%, rgba(14,4,2,0.92) 100%)' },
  { id: 'ocean',   label: 'Ocean',   color: '#020c1c', gradient: 'linear-gradient(172deg, rgba(2,14,32,0.92) 0%, rgba(3,12,28,0.90) 50%, rgba(2,10,24,0.92) 100%)' },
  { id: 'forest',  label: 'Forest',  color: '#031007', gradient: 'linear-gradient(172deg, rgba(3,18,8,0.92) 0%, rgba(2,14,6,0.90) 50%, rgba(2,10,5,0.92) 100%)' },
]

export const CARD_STYLES = {
  normal:  { label: 'Normal',  description: 'Subtle',   bg: 'linear-gradient(145deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.042) 100%)', blur: 'blur(18px)' },
  frosted: { label: 'Frosted', description: 'Heavier',  bg: 'linear-gradient(145deg, rgba(255,255,255,0.12)  0%, rgba(255,255,255,0.08)  100%)', blur: 'blur(32px)' },
  ultra:   { label: 'Ultra',   description: 'Maximum',  bg: 'linear-gradient(145deg, rgba(255,255,255,0.18)  0%, rgba(255,255,255,0.12)  100%)', blur: 'blur(48px)' },
}

export const FONT_STYLES = {
  inter:  { label: 'Inter',    family: "'Inter', system-ui, sans-serif",                                description: 'Clean & modern' },
  mono:   { label: 'Mono',     family: "ui-monospace, SFMono-Regular, Menlo, 'Courier New', monospace", description: 'Terminal-style' },
  serif:  { label: 'Playfair', family: "'Playfair Display', Georgia, serif",                            description: 'Elegant serif' },
}

const stored = load()

export const useAppSettings = create((set, get) => ({
  dashboardBg: stored.dashboardBg || 'default',
  cardStyle:   stored.cardStyle   || 'normal',
  fontStyle:   stored.fontStyle   || 'inter',

  update: (patch) => {
    set(state => {
      const next = { ...state, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify({ dashboardBg: next.dashboardBg, cardStyle: next.cardStyle, fontStyle: next.fontStyle })) } catch {}
      return patch
    })
  },
}))
