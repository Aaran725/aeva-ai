import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff } from 'lucide-react'
import AevaOrb from './AevaOrb'
import { useVoiceStore } from './voiceStore'
import { useXPStore, ORBS } from './xpStore'
import { useLanguageStore } from './languageStore'

const BARS = 9

export default function VoiceMode({ onClose, onSend, isThinking, name = 'there' }) {
  const { isSpeaking } = useVoiceStore()
  const { activeOrb: activeOrbId } = useXPStore()
  const { language } = useLanguageStore()
  const activeOrbDef = ORBS.find(o => o.id === activeOrbId) || ORBS[0]
  const [r, g, b] = activeOrbDef.accent || [139, 143, 255]

  const [status, setStatus] = useState('idle')  // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('')
  const [lastSaid, setLastSaid] = useState('')
  const [noSpeechSupport, setNoSpeechSupport] = useState(false)

  const transcriptRef = useRef('')
  const recRef = useRef(null)
  const autoRestartRef = useRef(false)
  const prevIsSpeakingRef = useRef(false)
  const prevIsThinkingRef = useRef(false)

  // ─── Start listening ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setNoSpeechSupport(true); return }

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = language === 'ja' ? 'ja-JP' : 'en-US'

    rec.onstart = () => {
      transcriptRef.current = ''
      setTranscript('')
      setStatus('listening')
    }

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      transcriptRef.current = t
      setTranscript(t)
    }

    rec.onend = () => {
      const final = transcriptRef.current.trim()
      if (final) {
        setLastSaid(final)
        setTranscript('')
        transcriptRef.current = ''
        onSend(final)
        setStatus('thinking')
      } else if (autoRestartRef.current) {
        // No speech detected — keep listening
        setTimeout(() => startListening(), 200)
      } else {
        setStatus('idle')
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'no-speech' && autoRestartRef.current) {
        setTimeout(() => startListening(), 200)
      } else {
        setStatus('idle')
      }
    }

    recRef.current = rec
    try { rec.start() } catch {}
  }, [language, onSend])

  // ─── Watch thinking/speaking to auto-restart after Aeva responds ──────────
  useEffect(() => {
    if (isThinking && !prevIsThinkingRef.current) {
      setStatus('thinking')
    } else if (!isThinking && prevIsThinkingRef.current) {
      // Aeva just finished thinking
      // Give TTS a moment to start; if isSpeaking never fires within 1.5s, restart anyway
      if (!isSpeaking) {
        const fallback = setTimeout(() => {
          // If still not speaking after 1.5s, TTS either failed or wasn't triggered
          if (!useVoiceStore.getState().isSpeaking) {
            if (autoRestartRef.current) {
              startListening()
            } else {
              setStatus('idle')
            }
          }
        }, 1500)
        return () => clearTimeout(fallback)
      }
    }
    prevIsThinkingRef.current = isThinking
  }, [isThinking, isSpeaking, startListening])

  useEffect(() => {
    if (isSpeaking && !prevIsSpeakingRef.current) {
      setStatus('speaking')
    } else if (!isSpeaking && prevIsSpeakingRef.current && !isThinking) {
      // Aeva just finished speaking — auto restart if in voice session
      if (autoRestartRef.current) {
        setTimeout(() => startListening(), 700)
      } else {
        setStatus('idle')
      }
    }
    prevIsSpeakingRef.current = isSpeaking
  }, [isSpeaking, isThinking, startListening])

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      autoRestartRef.current = false
      recRef.current?.stop()
    }
  }, [])

  // ─── Mic tap ───────────────────────────────────────────────────────────────
  const handleMicTap = () => {
    if (status === 'listening') {
      autoRestartRef.current = false
      recRef.current?.stop()
      setStatus('idle')
    } else if (status === 'idle') {
      autoRestartRef.current = true
      startListening()
    }
  }

  // ─── Labels ───────────────────────────────────────────────────────────────
  const statusLabel = {
    idle:      language === 'ja' ? `タップして話しかけてね` : `Hey ${name}, tap to speak`,
    listening: language === 'ja' ? '聞いています…'         : 'Listening…',
    thinking:  language === 'ja' ? '考えています…'         : 'Thinking…',
    speaking:  language === 'ja' ? '話しています…'         : 'Speaking…',
  }[status]

  const orbActive = status !== 'idle'
  const micColor = `rgb(${r},${g},${b})`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(3,4,15,0.97)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Background glow — matches active orb */}
      <motion.div
        animate={{ opacity: orbActive ? 1 : 0.4 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(${r},${g},${b},0.13) 0%, transparent 70%)`,
        }}
      />

      {/* Outer ring — pulses while listening */}
      <AnimatePresence>
        {status === 'listening' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.12, 0.35] }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: 280, height: 280,
              borderRadius: '50%',
              border: `1.5px solid rgba(${r},${g},${b},0.55)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Close — top right */}
      <motion.button
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        onClick={onClose}
        style={{
          position: 'absolute', top: 24, right: 24,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.50)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={16} />
      </motion.button>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={statusLabel}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22 }}
          style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
            color: 'rgba(255,255,255,0.90)',
            marginBottom: 36, textAlign: 'center',
            position: 'relative', zIndex: 1,
          }}
        >
          {statusLabel}
        </motion.p>
      </AnimatePresence>

      {/* Orb */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AevaOrb
          size={200}
          active={orbActive}
          personality={activeOrbDef.id}
          orbGradient={activeOrbDef.gradient}
          orbAccent={activeOrbDef.accent}
        />
      </div>

      {/* Live transcript / last said */}
      <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {transcript ? (
            <motion.p
              key="transcript"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 15, color: `rgba(${r},${g},${b},0.85)`,
                maxWidth: 320, textAlign: 'center', lineHeight: 1.55,
                padding: '0 28px', fontWeight: 500,
              }}
            >
              {transcript}
            </motion.p>
          ) : lastSaid && status !== 'idle' ? (
            <motion.p
              key="lastSaid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 13.5, color: 'rgba(255,255,255,0.30)',
                maxWidth: 300, textAlign: 'center', lineHeight: 1.5,
                padding: '0 28px', fontStyle: 'italic',
              }}
            >
              "{lastSaid}"
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* No support warning */}
      {noSpeechSupport && (
        <p style={{ color: 'rgba(255,100,100,0.75)', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.5, padding: '0 24px', marginBottom: 16 }}>
          Voice input isn't supported in this browser. Try Chrome or Safari.
        </p>
      )}

      {/* Bottom controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24,
        marginTop: 8, position: 'relative', zIndex: 1,
      }}>

        {/* Waveform bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40, width: 52, justifyContent: 'center' }}>
          {Array.from({ length: BARS }).map((_, i) => (
            <motion.div
              key={i}
              animate={status === 'listening' ? {
                height: [`${4 + Math.abs(Math.sin(i * 0.7)) * 6}px`, `${14 + Math.sin(i * 1.1) * 14}px`, `${4 + Math.abs(Math.sin(i * 0.7)) * 6}px`],
                opacity: [0.35, 0.90, 0.35],
              } : status === 'speaking' ? {
                height: [`${6 + i % 3 * 4}px`, `${10 + (BARS - i) % 4 * 4}px`, `${6 + i % 3 * 4}px`],
                opacity: [0.25, 0.65, 0.25],
              } : {
                height: '3px', opacity: 0.18,
              }}
              transition={{
                duration: status === 'speaking' ? 0.45 + i * 0.06 : 0.55 + i * 0.07,
                repeat: Infinity,
                delay: i * 0.06,
                ease: 'easeInOut',
              }}
              style={{
                width: 3, borderRadius: 2,
                background: `rgba(${r},${g},${b},0.85)`,
              }}
            />
          ))}
        </div>

        {/* Mic button — main CTA */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.90 }}
          onClick={handleMicTap}
          disabled={status === 'thinking' || status === 'speaking'}
          animate={status === 'listening' ? {
            boxShadow: [
              `0 0 0px rgba(${r},${g},${b},0)`,
              `0 0 32px 10px rgba(${r},${g},${b},0.38)`,
              `0 0 0px rgba(${r},${g},${b},0)`,
            ],
          } : {
            boxShadow: '0 0 0px transparent',
          }}
          transition={{ duration: 1.5, repeat: status === 'listening' ? Infinity : 0 }}
          style={{
            width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: status === 'listening'
              ? `rgba(${r},${g},${b},0.22)`
              : status === 'thinking' || status === 'speaking'
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.09)',
            border: `2px solid rgba(${r},${g},${b},${status === 'listening' ? '0.75' : status === 'idle' ? '0.30' : '0.12'})`,
            color: status === 'listening' ? micColor
              : status === 'thinking' || status === 'speaking'
              ? 'rgba(255,255,255,0.25)'
              : 'rgba(255,255,255,0.70)',
            transition: 'all 0.3s ease',
            opacity: status === 'thinking' || status === 'speaking' ? 0.5 : 1,
          }}
        >
          {status === 'listening'
            ? <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                <Mic size={28} />
              </motion.div>
            : <Mic size={28} />
          }
        </motion.button>

        {/* X — stop this session */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.90 }}
          onClick={onClose}
          style={{
            width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          <X size={16} />
        </motion.button>
      </div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 0.28 }}
        transition={{ delay: 1.5 }}
        style={{
          position: 'absolute', bottom: 28,
          fontSize: 11.5, color: 'rgba(255,255,255,0.28)',
          letterSpacing: '0.04em', textAlign: 'center',
        }}
      >
        {status === 'listening'
          ? language === 'ja' ? 'タップして停止' : 'Tap mic to stop'
          : language === 'ja' ? 'Aevaがあなたの声に耳を傾けます' : 'Aeva will listen and speak back'
        }
      </motion.p>
    </motion.div>
  )
}
