/**
 * StudyWithMe — Pomodoro timer + lofi music + break questions.
 *
 * Rendered at root level in App.jsx so the timer survives navigation.
 * Music: YouTube IFrame API (lofi girl stream).
 * Break questions: fast Groq call using current node session or subject label.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Square, Music, Music2, ChevronUp, ChevronDown, Settings } from 'lucide-react'
import { useStudyModeStore } from './useStudyModeStore'
import { useRoadmapStore } from './roadmapStore'
import { useUITheme } from './uiThemeStore'
import { GROQ_URL, nextGroqKey } from './groqClient'

/* ── YouTube module-level player ────────────────────────────────────────── */
let ytPlayer   = null
let ytReady    = false
const ytQueue  = []   // pending commands before player ready

function flushYTQueue() {
  while (ytQueue.length) ytQueue.shift()()
}

function ytCmd(fn) {
  if (ytReady && ytPlayer) fn()
  else ytQueue.push(fn)
}

function loadYTAPI() {
  if (document.getElementById('yt-api-script')) return
  const s = document.createElement('script')
  s.id  = 'yt-api-script'
  s.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(s)
}

/* ── Groq helpers ───────────────────────────────────────────────────────── */
async function generateBreakQuestion(topic) {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Generate ONE short quiz question to test recall. Output ONLY the question, nothing else. No preamble, no quotation marks.' },
          { role: 'user',   content: `Topic: ${topic}. Give a sharp one-sentence recall question.` },
        ],
        max_tokens: 80, temperature: 0.8,
      }),
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content?.trim() || null
  } catch { return null }
}

async function checkAnswer(question, answer, topic) {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Evaluate the student answer in ONE line. Start with ✅, ⚠️, or ❌ then a max 15-word verdict or quick correction. Nothing else.' },
          { role: 'user',   content: `Topic: ${topic}\nQuestion: ${question}\nAnswer: ${answer}` },
        ],
        max_tokens: 60, temperature: 0.3,
      }),
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content?.trim() || '✅ Good effort!'
  } catch { return '✅ Good effort!' }
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/* ── Setup Modal ────────────────────────────────────────────────────────── */
function SetupModal({ onStart, onClose, accent }) {
  const [work,    setWork]    = useState(25)
  const [brk,     setBrk]     = useState(5)
  const [subject, setSubject] = useState('')
  const roadmaps = useRoadmapStore(s => s.roadmaps)
  const activeRm = useRoadmapStore(s => s.roadmaps.find(r => r.id === s.activeRoadmapId) || s.roadmaps[0])

  const label = subject.trim() || activeRm?.title || 'General Study'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(4,5,18,0.75)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ width: '100%', maxWidth: 380, borderRadius: 24, background: 'rgba(12,14,32,0.98)', border: '1px solid rgba(255,255,255,0.10)', padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, marginBottom: 3 }}>🍅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>Study With Me</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Lofi + Pomodoro + Aeva break checks</div>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} />
          </motion.button>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', marginBottom: 8 }}>What are you studying?</div>
          {roadmaps.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {roadmaps.slice(0, 4).map(r => (
                <motion.button key={r.id} whileTap={{ scale: 0.94 }}
                  onClick={() => setSubject(r.title)}
                  style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: subject === r.title ? `${accent}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${subject === r.title ? accent + '66' : 'rgba(255,255,255,0.10)'}`, color: subject === r.title ? accent : 'rgba(255,255,255,0.55)', transition: 'all 0.15s' }}>
                  {r.title}
                </motion.button>
              ))}
            </div>
          )}
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={activeRm?.title || 'e.g. Calculus, History, Chemistry...'}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Durations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Focus block', value: work, set: setWork, min: 5, max: 60, unit: 'min' },
            { label: 'Break', value: brk, set: setBrk, min: 1, max: 30, unit: 'min' },
          ].map(({ label, value, set: setter, min, max }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setter(v => Math.max(min, v - 5))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  <ChevronDown size={13} />
                </motion.button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.90)' }}>{value}</div>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setter(v => Math.min(max, v + 5))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronUp size={13} />
                </motion.button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>minutes</div>
            </div>
          ))}
        </div>

        {/* Start */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onStart({ workDuration: work * 60, breakDuration: brk * 60, subjectLabel: label })}
          style={{ width: '100%', padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${accent}cc, ${accent}88)`, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: `0 8px 24px ${accent}44` }}
        >
          🍅 Start Session
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ── Break Question Card ────────────────────────────────────────────────── */
function BreakCard({ accent, onNextPomodoro }) {
  const {
    breakQuestion, breakAnswerFeedback, isGeneratingQ, isCheckingAnswer,
    subjectLabel, setBreakAnswerFeedback, setCheckingAnswer, clearBreakAnswer,
    timeLeft, breakDuration,
  } = useStudyModeStore()
  const [answer, setAnswer] = useState('')

  const handleSubmit = async () => {
    if (!answer.trim() || isCheckingAnswer) return
    setCheckingAnswer(true)
    const feedback = await checkAnswer(breakQuestion, answer.trim(), subjectLabel || 'general study')
    setBreakAnswerFeedback(feedback)
  }

  const breakPct = breakDuration > 0 ? (timeLeft / breakDuration) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      style={{
        position: 'fixed', bottom: 80, right: 20, zIndex: 580,
        width: 340, borderRadius: 20,
        background: 'rgba(12,14,32,0.98)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        padding: 20,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Break header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 22 }}>☕</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>Break time — quick check</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            {fmt(timeLeft)} left · {subjectLabel}
          </div>
        </div>
      </div>

      {/* Break progress bar */}
      <div style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 16 }}>
        <motion.div animate={{ width: `${breakPct}%` }} transition={{ duration: 0.5 }}
          style={{ height: '100%', borderRadius: 99, background: '#34D399' }} />
      </div>

      {/* Question */}
      {isGeneratingQ ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'rgba(255,255,255,0.40)', fontSize: 12 }}>
          Aeva is thinking of a question…
        </div>
      ) : breakQuestion ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {breakQuestion}
          </div>

          {breakAnswerFeedback ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: breakAnswerFeedback.startsWith('✅') ? '#4ADE80' : breakAnswerFeedback.startsWith('⚠️') ? '#FBBF24' : '#F87171', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 12, lineHeight: 1.5 }}>
                {breakAnswerFeedback}
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onNextPomodoro}
                style={{ width: '100%', padding: '11px', borderRadius: 12, background: `${accent}22`, border: `1px solid ${accent}44`, color: accent, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🍅 Next Pomodoro
              </motion.button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Your answer..."
                disabled={isCheckingAnswer}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
              />
              <motion.button whileTap={{ scale: 0.90 }} onClick={handleSubmit}
                disabled={isCheckingAnswer || !answer.trim()}
                style={{ padding: '10px 14px', borderRadius: 12, background: isCheckingAnswer ? 'rgba(255,255,255,0.06)' : `${accent}22`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {isCheckingAnswer ? '…' : 'Check'}
              </motion.button>
            </div>
          )}

          {/* Skip */}
          {!breakAnswerFeedback && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onNextPomodoro}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 11.5, cursor: 'pointer' }}>
                Skip → Start next Pomodoro
              </motion.button>
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  )
}

/* ── Floating Widget ────────────────────────────────────────────────────── */
function FloatingWidget({ accent, onOpenSetup }) {
  const {
    isRunning, phase, timeLeft, pomodoroCount, isMusicOn,
    togglePause, stopSession, setMusicOn, open, isOpen,
  } = useStudyModeStore()
  const [expanded, setExpanded] = useState(false)

  const isWork  = phase === 'work'
  const color   = isWork ? accent : '#34D399'
  const label   = isWork ? 'Focus' : 'Break'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 570,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Expanded controls */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
              background: 'rgba(12,14,32,0.98)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.10)',
              padding: '12px 14px', minWidth: 200,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              🍅 {pomodoroCount} pomodoro{pomodoroCount !== 1 ? 's' : ''} done
            </div>

            {/* Music toggle */}
            <motion.button whileTap={{ scale: 0.93 }}
              onClick={() => setMusicOn(!isMusicOn)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, background: isMusicOn ? `${accent}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${isMusicOn ? accent + '44' : 'rgba(255,255,255,0.08)'}`, color: isMusicOn ? accent : 'rgba(255,255,255,0.50)', cursor: 'pointer', marginBottom: 8, fontSize: 12.5, fontWeight: 600 }}>
              {isMusicOn ? <Music size={13} /> : <Music2 size={13} />}
              {isMusicOn ? 'Lofi music on' : 'Lofi music off'}
            </motion.button>

            {/* Stop */}
            <motion.button whileTap={{ scale: 0.93 }}
              onClick={() => { stopSession(); setExpanded(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)', color: '#F87171', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
              <Square size={11} />
              End session
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 99, background: 'rgba(12,14,32,0.96)', border: `1.5px solid ${color}55`, boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}22` }}>

        {/* Phase dot */}
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />

        {/* Timer */}
        <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.03em', minWidth: 42, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(timeLeft)}
        </div>

        {/* Label */}
        <div style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </div>

        {/* Play/Pause */}
        <motion.button whileTap={{ scale: 0.88 }} onClick={togglePause}
          style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}22`, border: `1px solid ${color}44`, color: color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRunning ? <Pause size={10} /> : <Play size={10} />}
        </motion.button>

        {/* Music indicator */}
        {isMusicOn && (
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ color: '#818CF8', display: 'flex', alignItems: 'center' }}>
            <Music size={11} />
          </motion.div>
        )}

        {/* Expand toggle */}
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setExpanded(e => !e)}
          style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {expanded ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ── YouTube Player (hidden, always mounted when session active) ─────────── */
function YouTubePlayer({ volume }) {
  const divRef  = useRef(null)
  const playerR = useRef(null)
  const isMusicOn = useStudyModeStore(s => s.isMusicOn)

  useEffect(() => {
    loadYTAPI()

    const init = () => {
      if (!divRef.current) return
      playerR.current = new window.YT.Player(divRef.current, {
        height: '1', width: '1',
        videoId: 'jfKfPfyJRdk',
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: 'jfKfPfyJRdk', iv_load_policy: 3 },
        events: {
          onReady: () => {
            ytReady  = true
            ytPlayer = playerR.current
            flushYTQueue()
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      init()
    } else {
      window.onYouTubeIframeAPIReady = init
    }

    return () => {
      try { playerR.current?.destroy() } catch {}
      ytPlayer = null; ytReady = false
    }
  }, [])

  useEffect(() => {
    ytCmd(() => {
      if (isMusicOn) {
        ytPlayer.setVolume(volume)
        ytPlayer.playVideo()
      } else {
        ytPlayer.pauseVideo()
      }
    })
  }, [isMusicOn, volume])

  return (
    <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div ref={divRef} />
    </div>
  )
}

/* ── Main export ────────────────────────────────────────────────────────── */
export default function StudyWithMe({ externalSetupOpen = false, onExternalSetupClose }) {
  const accent = useUITheme(s => s.accent)
  const {
    phase, isRunning, isMusicOn, volume, subjectLabel,
    breakQuestion, isGeneratingQ,
    tick, enterBreak, enterWork,
    startSession, stopSession,
    setBreakQuestion, setGeneratingQ,
  } = useStudyModeStore()

  const [_internalSetupOpen, setInternalSetupOpen] = useState(false)
  const showSetup = externalSetupOpen || _internalSetupOpen
  const setShowSetup = (v) => {
    setInternalSetupOpen(v)
    if (!v) onExternalSetupClose?.()
  }

  const activeNode = useRoadmapStore(s => s.activeNodeSession)
  const isActive   = phase !== 'idle'

  /* ── Global timer interval ─────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      const ended = tick()
      if (!ended) return

      if (ended === 'work') {
        // Work phase ended → go to break + generate question
        enterBreak()
        const topic = activeNode?.topic || subjectLabel || 'your study topic'
        setGeneratingQ(true)
        generateBreakQuestion(topic).then(q => setBreakQuestion(q || `What's the key concept you just studied in ${topic}?`))
      } else {
        // Break ended → go back to work
        enterWork()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [tick, enterBreak, enterWork, activeNode, subjectLabel, setBreakQuestion, setGeneratingQ])

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleStart = useCallback((opts) => {
    setShowSetup(false)
    startSession(opts)
  }, [startSession])

  const handleNextPomodoro = useCallback(() => {
    enterWork()
  }, [enterWork])

  return (
    <>
      {/* Hidden YouTube player — mounted while session is active */}
      {isActive && <YouTubePlayer volume={volume} />}

      {/* Setup modal */}
      <AnimatePresence>
        {showSetup && (
          <SetupModal
            accent={accent}
            onStart={handleStart}
            onClose={() => setShowSetup(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating timer widget */}
      <AnimatePresence>
        {isActive && !showSetup && (
          <FloatingWidget accent={accent} onOpenSetup={() => setShowSetup(true)} />
        )}
      </AnimatePresence>

      {/* Break question card */}
      <AnimatePresence>
        {phase === 'break' && (breakQuestion || isGeneratingQ) && (
          <BreakCard accent={accent} onNextPomodoro={handleNextPomodoro} />
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Trigger button — exported for use in chat input bar ────────────────── */
export function StudyWithMeButton({ style }) {
  const accent  = useUITheme(s => s.accent)
  const phase   = useStudyModeStore(s => s.phase)
  const isActive = phase !== 'idle'
  const [showSetup, _] = [false, () => {}] // handled via store open flag

  const { open } = useStudyModeStore()
  // When not active, clicking opens setup via global store flag
  // We set a window event so StudyWithMe parent can open setup
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('aeva:open-study-mode'))
  }

  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.90 }}
      onClick={handleClick}
      title="Study With Me — Pomodoro + lofi + break questions"
      style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? `${accent}28` : 'rgba(251,191,36,0.10)',
        border: isActive ? `1.5px solid ${accent}66` : '1.5px solid rgba(251,191,36,0.30)',
        cursor: 'pointer',
        color: isActive ? accent : 'rgba(251,191,36,0.80)',
        ...style,
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>🍅</span>
    </motion.button>
  )
}
