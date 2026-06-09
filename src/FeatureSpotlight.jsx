/**
 * FeatureSpotlight — one-time tip banner per screen.
 *
 * First visit: shows a slim animated banner below the header.
 * After dismiss: collapses to a small "?" pill the user can re-open.
 * Persists seen state to localStorage so it never auto-shows again.
 *
 * Usage:
 *   <FeatureSpotlight id="lab" icon="🧪" title="8 drill types" body="..." />
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle } from 'lucide-react'
import { useIsHidden } from './uiThemeStore'

export default function FeatureSpotlight({ id, icon, title, body, accentColor = '#818CF8' }) {
  const tipsHidden = useIsHidden('tips')
  const storageKey = `aeva_seen_tip_${id}`

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })
  const [open, setOpen] = useState(false)

  // Auto-show once on first visit (small delay so layout settles)
  useEffect(() => {
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [dismissed]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setOpen(false)
    setDismissed(true)
    try { localStorage.setItem(storageKey, '1') } catch {}
  }

  const lightAccent = accentColor + '22'
  const borderAccent = accentColor + '44'

  // All hooks called — now safe to conditionally return
  if (tipsHidden) return null

  return (
    <div style={{ flexShrink: 0, position: 'relative' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 16px 10px 14px',
              background: lightAccent,
              borderBottom: `1px solid ${borderAccent}`,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: accentColor, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.55 }}>{body}</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.90 }}
                onClick={dismiss}
                style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}
              >
                <X size={11} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent "?" pill — shown after first dismissal */}
      {dismissed && (
        <div style={{ position: 'absolute', right: 12, top: 6, zIndex: 20 }}>
          <AnimatePresence>
            {!open && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.10 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setOpen(o => !o)}
                title="What can I do here?"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.02em',
                }}
              >
                <HelpCircle size={10} />
                <span>?</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
