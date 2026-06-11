/**
 * WidgetToggle — shared pill button used across all screens
 * that have an Ai OS widget mode (Home, Chat, Lab, Roadmap).
 *
 * Active state  → indigo tint, grid icon
 * Inactive state → ghost, rows icon
 *
 * Usage:
 *   <WidgetToggle active={isWidget} onToggle={toggleFn} />
 */
import { motion } from 'framer-motion'
import { LayoutGrid, Rows3 } from 'lucide-react'
import { useIsHidden } from './uiThemeStore'

export default function WidgetToggle({ active, onToggle, style = {} }) {
  const hidden = useIsHidden('widgetToggle')
  if (hidden) return null
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      title={active ? 'Switch to Classic view' : 'Switch to Widget view'}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.09)',
        border: `1px solid ${active ? 'rgba(129,140,248,0.50)' : 'rgba(255,255,255,0.18)'}`,
        color: active ? '#A5B4FC' : 'rgba(255,255,255,0.70)',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'background 0.18s, border 0.18s, color 0.18s',
        flexShrink: 0,
        ...style,
      }}
    >
      {active ? <Rows3 size={12} /> : <LayoutGrid size={12} />}
      <span>{active ? 'Classic' : 'Widget'}</span>
    </motion.button>
  )
}
