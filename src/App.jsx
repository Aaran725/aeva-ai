import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Zap, TrendingDown, Star, MessageCircle, ChevronLeft, StopCircle, LogOut, Gamepad2 } from 'lucide-react'
import { supabase } from './supabase'
import { useArcadeStore } from './arcadeStore'
import ArcadeHub from './ArcadeHub'
import { ChaosEventBanner, MissionVitalsBar, DebateLogicFeed, ThemedChatBubble, MissionBadge } from './SimCockpit'
import './index.css'

/* ─── Groq API ─── */
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ─── Session state machine ─── */
export const SESSION_STATES = ['DIAGNOSTIC', 'SCAFFOLDING', 'STRESS_TEST', 'CONSOLIDATION']

const STATE_CONFIG = {
  DIAGNOSTIC: {
    label: 'Diagnosing',
    color: '#8B8FFF',
    instruction: 'Find out what the student already knows. Ask one probing question — no teaching yet. Be genuinely curious, not interrogative.',
  },
  SCAFFOLDING: {
    label: 'Building',
    color: '#7EC8E3',
    instruction: 'Build understanding one layer at a time. Confirm each idea before adding the next. Only use an analogy if it genuinely clarifies — never force one.',
  },
  STRESS_TEST: {
    label: 'Stress Testing',
    color: '#E9A364',
    instruction: 'Test the edges of what they know. Edge cases, "what if" scenarios, applying the concept somewhere new. Raise the bar.',
  },
  CONSOLIDATION: {
    label: 'Consolidating',
    color: '#A8E6CF',
    instruction: 'Ask the student to explain the concept in their own words and connect it to something they care about. Make the learning stick.',
  },
}

const MODE_CONFIG = {
  hype:      { label: 'Hype',      color: '#E9A364', instruction: 'They genuinely got it. One specific sentence acknowledging exactly what they got right (not "great job" — say WHY it\'s right). Then immediately one harder question.' },
  coach:     { label: 'Coach',     color: '#8B8FFF', instruction: 'One Socratic question that moves them forward. No answer, no hints. Short.' },
  challenge: { label: 'Challenge', color: '#FF8C6B', instruction: 'They gave a surface answer. Call out the specific gap in one sentence — be direct but not harsh. Then one question that forces them to go deeper. Nothing else.' },
  redirect:  { label: 'Redirect',  color: '#7EC8E3', instruction: 'They\'re lost. Reset with a simpler version of the question or a brief concrete example. One question at the end.' },
}

/* ─── Student profile (persists across sessions) ─── */
function loadProfile(userId) {
  try {
    return JSON.parse(localStorage.getItem(`aeva_profile_${userId}`) || 'null') || {
      totalExchanges: 0,
      topicsExplored: [],
      strengths: [],
      weaknesses: [],
      patterns: [],
      style: null,
    }
  } catch { return { totalExchanges: 0, topicsExplored: [], strengths: [], weaknesses: [], patterns: [], style: null } }
}

function saveProfile(userId, profile) {
  try { localStorage.setItem(`aeva_profile_${userId}`, JSON.stringify(profile)) } catch {}
}

function evolveProfile(profile, criticism, userMessage) {
  const updated = { ...profile, totalExchanges: profile.totalExchanges + 1 }

  // Track topics
  if (criticism.topic && criticism.topic !== 'general') {
    const t = criticism.topic.toLowerCase()
    if (!updated.topicsExplored.includes(t)) updated.topicsExplored = [...updated.topicsExplored.slice(-9), t]
  }

  // Track strengths/weaknesses from mastery signals
  if (criticism.understanding === 'mastery' || criticism.understanding === 'solid') {
    if (criticism.topic && !updated.strengths.includes(criticism.topic)) {
      updated.strengths = [...updated.strengths.slice(-4), criticism.topic]
    }
  }
  if (criticism.understanding === 'none' || (criticism.lazy_thinking && criticism.understanding === 'partial')) {
    if (criticism.topic && !updated.weaknesses.includes(criticism.topic)) {
      updated.weaknesses = [...updated.weaknesses.slice(-4), criticism.topic]
    }
  }

  // Detect response style (brief vs elaborate)
  if (updated.totalExchanges === 5) {
    const avgLen = userMessage.length
    updated.style = avgLen < 40 ? 'concise' : avgLen > 150 ? 'elaborate' : 'balanced'
  }

  // Track patterns
  if (criticism.lazy_thinking && !updated.patterns.includes('surface answers')) {
    updated.patterns = [...updated.patterns.slice(-3), 'tends to give surface answers first']
  }

  return updated
}

/* ─── Step A: The Critic ─── */
const CRITIC_FALLBACK = { understanding: 'partial', lazy_thinking: false, mode: 'coach', topic: 'general', confidence: 'uncertain', note: '' }

async function runCritic(history, userMessage) {
  try {
    const context = history.slice(-6).map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    }))

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Pedagogical critic. Return ONLY JSON:
{"understanding":"none"|"partial"|"solid"|"mastery","lazy_thinking":true|false,"mode":"hype"|"coach"|"challenge"|"redirect","topic":"<1-3 words>","confidence":"confused"|"uncertain"|"confident"|"overconfident","note":"<one specific sentence about the gap or strength to target>"}
hype=solid/mastery with genuine reasoning. challenge=vague/shallow/no reasoning. redirect=confused or off-topic. coach=everything else.`,
          },
          ...context,
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) return CRITIC_FALLBACK
    const json = await res.json()
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}')
    return { ...CRITIC_FALLBACK, ...parsed }
  } catch {
    return CRITIC_FALLBACK
  }
}

/* ─── Step B: Build dynamic Aeva prompt ─── */
function buildAevaPrompt(sessionState, criticism, userName, profile) {
  const state = STATE_CONFIG[sessionState]
  const mode = MODE_CONFIG[criticism?.mode || 'coach']

  const profileContext = profile ? `
WHAT YOU KNOW ABOUT ${userName.toUpperCase()}:
- Sessions together: ${profile.totalExchanges} exchanges
${profile.strengths.length ? `- Demonstrated strengths: ${profile.strengths.join(', ')}` : ''}
${profile.weaknesses.length ? `- Known weak spots: ${profile.weaknesses.join(', ')}` : ''}
${profile.patterns.length ? `- Observed patterns: ${profile.patterns.join(', ')}` : ''}
${profile.topicsExplored.length ? `- Topics explored: ${profile.topicsExplored.slice(-5).join(', ')}` : ''}
${profile.style ? `- Communication style: ${profile.style} answers` : ''}
Use this to make your response feel personal and specific — reference what you know when relevant.` : ''

  return `You are Aeva — a sharp, direct tutor who genuinely cares whether ${userName} actually learns, not just whether they feel good about the session.

YOUR VOICE:
- Direct and specific. No filler, no hollow praise like "great question!" or "absolutely!"
- Warm but not soft. You challenge because you believe they can handle it.
- Concise: 2-3 sentences max. ONE question per response, never more.
- You never force analogies. Only use one if it genuinely clarifies something — and make it fit the topic naturally.
- You sound like a brilliant friend who happens to be an expert, not a corporate AI.

WHAT YOU NEVER DO:
- Give the answer before making them think
- Ask multiple questions at once
- Use business/startup metaphors unless the topic is literally about business
- Say "Great!", "Excellent!", "Absolutely!", or any hollow filler
- Give a lecture when a question would do
${profileContext}
SESSION PHASE: ${sessionState} — ${state.instruction}

CRITIC READ ON THEIR LAST MESSAGE:
- Understanding: ${criticism?.understanding || 'unknown'} | Lazy thinking: ${criticism?.lazy_thinking ? 'YES' : 'no'} | Confidence: ${criticism?.confidence || 'unknown'}
- Topic: ${criticism?.topic || 'general'}
- Target: ${criticism?.note || 'move them forward'}

MODE: ${(criticism?.mode || 'coach').toUpperCase()} — ${mode.instruction}`
}

/* ─── Stream Aeva response ─── */
async function streamGroq(history, systemPrompt, onChunk, signal, opts = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
  ]

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages,
    stream: true,
    temperature:       opts.temperature       ?? 0.75,
    max_tokens:        opts.maxTokens         ?? 200,
    frequency_penalty: opts.frequencyPenalty  ?? 0,
    presence_penalty:  opts.presencePenalty   ?? 0,
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Groq error ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch { /* partial JSON, skip */ }
    }
  }
}

/* ─── Responsive grid CSS ─── */
const gridCSS = `
  .bento-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }
  @media (min-width: 768px) {
    .bento-grid { grid-template-columns: repeat(4, 1fr); }
    .mission-card { grid-column: span 2; grid-row: span 2; }
    .skill-card   { grid-column: span 2; }
  }
  .chat-messages::-webkit-scrollbar { width: 0; }

  /* Debate HUD panel — hidden on mobile, visible on desktop */
  .debate-feed-panel { display: none; }
  @media (min-width: 768px) { .debate-feed-panel { display: flex; } }

  /* ── Interrupt glitch animation ── */
  @keyframes interrupt-glitch {
    0%   { transform: translateX(0);    filter: none; opacity: 1; }
    10%  { transform: translateX(-4px); filter: hue-rotate(20deg) brightness(1.35) saturate(1.4); opacity: 0.85; }
    22%  { transform: translateX(4px);  filter: hue-rotate(-15deg); opacity: 1; }
    34%  { transform: translateX(-3px); filter: brightness(0.80); }
    46%  { transform: translateX(3px);  filter: none; }
    58%  { transform: translateX(-1px); }
    72%  { transform: translateX(1px); }
    100% { transform: translateX(0);    filter: none; opacity: 1; }
  }
  .interrupt-glitch {
    animation: interrupt-glitch 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  /* ── Orb interrupt pulse ── */
  @keyframes orb-interrupt {
    0%   { box-shadow: 0 0 0px rgba(239,68,68,0); }
    30%  { box-shadow: 0 0 28px 8px rgba(239,68,68,0.70); }
    60%  { box-shadow: 0 0 14px 4px rgba(239,68,68,0.35); }
    100% { box-shadow: 0 0 0px rgba(239,68,68,0); }
  }
  .orb-interrupt { animation: orb-interrupt 1.2s ease-out forwards; }
`

/* ═══ USER CONTEXT ═══════════════════════════════ */
const UserContext = createContext({ name: 'Martin', mood: 'LOCKED IN' })
const useUser = () => useContext(UserContext)

/* ═══ NOISE OVERLAY ══════════════════════════════ */
function NoiseOverlay() {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, borderRadius: 'inherit',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat', backgroundSize: '180px',
      opacity: 0.032, pointerEvents: 'none', zIndex: 10,
    }} />
  )
}

/* ═══ GLASS CARD ══════════════════════════════════ */
function GlassCard({ children, className = '', style = {}, onClick }) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={{ y: -8, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: 36, overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 4px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
        ...style,
      }}
    >
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>{children}</div>
    </motion.div>
  )
}

/* ═══ AEVA ORB ════════════════════════════════════ */
function AevaOrb({ size = 218, active = false }) {
  const s = size / 218
  const shellW = Math.round(218 * s * 0.88)
  const shellH = Math.round(205 * s * 0.88)

  return (
    <div style={{
      position: 'relative',
      width: Math.round(260 * s), height: Math.round(250 * s),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: 'saturate(1.55) contrast(1.10)', flexShrink: 0,
    }}>
      <motion.div
        animate={{ scale: active ? [1, 1.18, 1] : [1, 1.06, 1] }}
        transition={{ duration: active ? 1.2 : 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: Math.round(-20 * s), borderRadius: '50%',
          background: 'radial-gradient(ellipse at 44% 52%, rgba(45,48,142,0.28) 0%, rgba(233,163,100,0.14) 52%, transparent 76%)',
          filter: `blur(${Math.round(42 * s)}px)`,
        }}
      />
      <motion.div
        animate={{
          borderRadius: active
            ? ['56% 44% 40% 60% / 54% 44% 56% 46%', '50% 50% 46% 54% / 52% 50% 50% 48%', '56% 44% 40% 60% / 54% 44% 56% 46%']
            : ['56% 44% 40% 60% / 54% 44% 56% 46%', '52% 48% 44% 56% / 53% 46% 54% 47%', '56% 44% 40% 60% / 54% 44% 56% 46%'],
          scale: active ? [1, 1.065, 1] : [1, 1.018, 1],
        }}
        transition={{
          borderRadius: { duration: active ? 4 : 16, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: active ? 1.5 : 8, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          position: 'relative', width: shellW, height: shellH,
          borderRadius: '56% 44% 40% 60% / 54% 44% 56% 46%',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 30px rgba(255,255,255,0.40), inset 0 2px 10px rgba(255,255,255,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(122deg,#040622 0%,#090b38 7%,#141870 16%,#2D308E 27%,#4545aa 38%,#6a6ac0 48%,#9898d2 56%,#c0c6e8 63%,#dde2f6 68%,#eeeaf4 72%,#f4ede0 76%,#f0d4a0 80%,#E9A364 84%,#d08038 88%,#964e20 93%,#501808 97%,#1a0806 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 50% 50%, transparent 46%, rgba(8,10,48,0.38) 62%, rgba(4,6,28,0.65) 76%, rgba(2,3,18,0.86) 90%, rgba(1,2,12,0.94) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 72% 28%, rgba(4,5,30,0.72) 0%, rgba(8,10,50,0.50) 30%, transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 80% 80%, rgba(3,4,22,0.55) 0%, rgba(6,8,40,0.30) 35%, transparent 60%)', pointerEvents: 'none' }} />
        <motion.div
          animate={{ x: [0, -15, 9, -5, 0], y: [0, 11, -14, 6, 0], scale: [1, 1.15, 0.92, 1.07, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: '75%', height: '70%', top: '16%', left: '-6%', borderRadius: '60% 40% 46% 54% / 58% 62% 38% 42%', background: 'radial-gradient(ellipse at 46% 52%, rgba(255,240,180,1) 0%, rgba(255,195,100,0.92) 20%, rgba(240,150,60,0.68) 44%, rgba(180,85,18,0.28) 70%, transparent 100%)', filter: `blur(${Math.round(14 * s)}px)`, mixBlendMode: 'screen' }}
        />
        <motion.div
          animate={{ x: [0, -8, 5, 0], y: [0, 8, -10, 0], opacity: [0.95, 1, 0.88, 0.95] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          style={{ position: 'absolute', width: '36%', height: '34%', top: '30%', left: '8%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,252,220,1) 0%, rgba(255,218,120,0.88) 32%, rgba(235,158,50,0.42) 66%, transparent 100%)', filter: `blur(${Math.round(7 * s)}px)`, mixBlendMode: 'screen' }}
        />
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', width: '200%', height: '200%', top: '-50%', left: '-50%', background: 'repeating-conic-gradient(from 0deg at 55% 55%, rgba(255,255,255,0.20) 0deg, rgba(255,255,255,0.20) 1deg, transparent 1deg, transparent 5deg)', mixBlendMode: 'overlay' }} />
        <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', width: '200%', height: '200%', top: '-50%', left: '-50%', background: 'repeating-conic-gradient(from 30deg at 48% 48%, rgba(255,255,255,0.07) 0deg, rgba(255,255,255,0.07) 0.6deg, transparent 0.6deg, transparent 4deg)', mixBlendMode: 'overlay', opacity: 0.7 }} />
        <div style={{ position: 'absolute', width: '38%', height: '28%', top: '4%', right: '2%', borderRadius: '50%', background: 'radial-gradient(ellipse at 44% 34%, rgba(255,255,255,0.56) 0%, rgba(218,226,255,0.22) 48%, transparent 76%)', filter: `blur(${Math.round(10 * s)}px)` }} />
        <div style={{ position: 'absolute', width: '8%', height: '6%', top: '8%', right: '18%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.48) 55%, transparent 80%)', filter: `blur(${Math.round(2 * s)}px)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: 'inset 0 0 65px rgba(2,4,22,0.70)', pointerEvents: 'none' }} />
      </motion.div>
    </div>
  )
}

/* ═══ USER AVATAR ═════════════════════════════════ */
function UserAvatar({ onSignOut }) {
  const { name, photo } = useUser()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
      >
        {photo
          ? <img src={photo} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #2D308E, #E9A364)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{name[0]}</div>
        }
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{name}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'rgba(15,18,40,0.96)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 6, minWidth: 140, zIndex: 100 }}
          >
            <button onClick={() => { setOpen(false); onSignOut?.() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 9, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ BENTO CARDS ════════════════════════════════ */
const NODES = [
  { x: 50, y: 50, r: 4.5, color: '#8B8FFF' },
  { x: 22, y: 20, r: 3, color: '#E9A364' },
  { x: 78, y: 18, r: 2.8, color: '#7EC8E3' },
  { x: 84, y: 62, r: 3, color: '#A8E6CF' },
  { x: 58, y: 85, r: 2.8, color: '#E9A364' },
  { x: 18, y: 72, r: 3, color: '#D4A6FF' },
  { x: 36, y: 34, r: 2.2, color: '#7EC8E3' },
  { x: 70, y: 44, r: 2.2, color: '#A8E6CF' },
]
const EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 6], [2, 7], [3, 4], [5, 4], [6, 7]]
const SKILLS = [
  { name: 'Economics', value: 76, color: '#8B8FFF' },
  { name: 'Logic', value: 52, color: '#E9A364' },
  { name: 'Physics', value: 31, color: '#7EC8E3' },
]

function MissionCard({ onChatOpen }) {
  const { name } = useUser()
  return (
    <GlassCard className="mission-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Mission Briefing</span>
        <AevaOrb size={96} />
      </div>
      <div style={{ marginTop: 8 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 400, color: 'rgba(255,255,255,0.92)', lineHeight: 1.22, marginBottom: 12 }}>
          Ready to start<br />today's mission?
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: '88%', color: 'rgba(255,255,255,0.48)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Aeva: <em>"{name}'s Startup Empire is at a critical crossroads. Let's look at your margins."</em>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onChatOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 99, background: 'rgba(139,143,255,0.20)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,143,255,0.35)', color: 'rgba(255,255,255,0.92)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, fontWeight: 600, letterSpacing: '0.02em', cursor: 'pointer' }}>
          <Zap size={13} />
          Start Mission
        </motion.button>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onChatOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
          <MessageCircle size={13} />
          Chat with Aeva
        </motion.button>
      </div>
    </GlassCard>
  )
}

function ConstellationCard() {
  return (
    <GlassCard style={{ padding: '22px 20px', minHeight: 200 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Knowledge Map</span>
      <svg viewBox="0 0 100 100" style={{ width: '100%', marginTop: 12 }}>
        {EDGES.map(([a, b], i) => (
          <motion.line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
            stroke="rgba(255,255,255,0.18)" strokeWidth={0.6}
            animate={{ opacity: [0.18, 0.45, 0.18] }}
            transition={{ duration: 3 + i * 0.35, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
          />
        ))}
        {NODES.map((n, i) => (
          <g key={i}>
            <motion.circle cx={n.x} cy={n.y} r={n.r + 3} fill={n.color} opacity={0}
              animate={{ r: [n.r + 3, n.r + 7, n.r + 3], opacity: [0.12, 0.25, 0.12] }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
            />
            <motion.circle cx={n.x} cy={n.y} r={n.r} fill={n.color}
              animate={{ scale: [1, 1.2, 1] }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
            />
          </g>
        ))}
      </svg>
    </GlassCard>
  )
}

function MoodCard() {
  const { mood } = useUser()
  const isLocked = mood === 'LOCKED IN'
  return (
    <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Aeva Mode</span>
      <div>
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', marginBottom: 10, background: isLocked ? '#4ADE80' : '#FBBF24', boxShadow: `0 0 10px ${isLocked ? '#4ADE80' : '#FBBF24'}` }} />
        <h2 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
          {mood}
        </h2>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: 0 }}>
        {isLocked ? 'Full focus engaged' : 'Recalibrating…'}
      </p>
    </GlassCard>
  )
}

function SkillDecayCard() {
  return (
    <GlassCard className="skill-card" style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Skill Decay</span>
        <TrendingDown size={13} color="rgba(255,255,255,0.28)" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SKILLS.map((skill, i) => (
          <div key={skill.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>{skill.name}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', fontVariantNumeric: 'tabular-nums' }}>{skill.value}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${skill.value}%` }}
                transition={{ duration: 1.1 + i * 0.25, ease: 'easeOut', delay: 0.5 + i * 0.15 }}
                style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${skill.color} 0%, ${skill.color}90 55%, transparent 100%)` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

/* ═══ DASHBOARD VIEW ══════════════════════════════ */
function DashboardView({ onChatOpen, onSignOut }) {
  const { openArcade } = useArcadeStore()

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        position: 'relative', minHeight: '100vh', width: '100%',
        overflowX: 'hidden', overflowY: 'auto',
        background: 'linear-gradient(135deg, #08091a 0%, #0f1228 38%, #0c0e2c 68%, #07091a 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div aria-hidden style={{ position: 'absolute', top: '-5%', left: '15%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.22) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '5%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.13) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      {/* Arcade Hub portal */}
      <ArcadeHub />

      <div style={{ position: 'relative' }}>
        <header style={{ padding: '26px 28px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={13} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>aeva</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* UNLEASH ARCADE button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openArcade}
              animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 18px rgba(99,102,241,0.55)', '0 0 0px rgba(99,102,241,0)'] }}
              transition={{ boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 99,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(233,163,100,0.15))',
                border: '1px solid rgba(99,102,241,0.45)',
                color: 'rgba(255,255,255,0.92)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              <Gamepad2 size={13} />
              Unleash Arcade
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onChatOpen}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(139,143,255,0.15)', border: '1px solid rgba(139,143,255,0.30)', color: 'rgba(255,255,255,0.80)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}>
              <MessageCircle size={13} />
              Chat
            </motion.button>
            <UserAvatar onSignOut={onSignOut} />
          </div>
        </header>

        <div className="bento-grid" style={{ padding: '0 24px', maxWidth: 1280, margin: '0 auto' }}>
          <MissionCard onChatOpen={onChatOpen} />
          <ConstellationCard />
          <MoodCard />
          <SkillDecayCard />
        </div>

        <div style={{ height: 48 }} />
      </div>
    </motion.div>
  )
}

/* ═══ CHAT BUBBLE ═════════════════════════════════ */
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 10,
      }}
    >
      <div style={{
        maxWidth: '78%',
        padding: isUser ? '10px 16px' : '12px 18px',
        borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
        background: isUser
          ? 'rgba(139,143,255,0.25)'
          : 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isUser
          ? '1px solid rgba(139,143,255,0.40)'
          : '1px solid rgba(255,255,255,0.16)',
        color: isUser ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)',
        fontSize: 14.5,
        lineHeight: 1.55,
        fontFamily: "'Inter', system-ui, sans-serif",
        whiteSpace: 'pre-wrap',
      }}>
        {msg.text}
        {msg.streaming && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ display: 'inline-block', width: 2, height: 14, background: 'rgba(255,255,255,0.6)', borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }}
          />
        )}
      </div>
    </motion.div>
  )
}

/* ═══ SESSION MODE BADGE ══════════════════════════ */
function SessionBadge({ sessionState, criticism }) {
  const state = STATE_CONFIG[sessionState]
  const mode = criticism ? MODE_CONFIG[criticism.mode] : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <motion.div
        key={sessionState}
        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          padding: '4px 10px', borderRadius: 99,
          background: `${state.color}22`,
          border: `1px solid ${state.color}55`,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
          color: state.color, textTransform: 'uppercase',
        }}
      >
        {state.label}
      </motion.div>
      {mode && (
        <motion.div
          key={criticism?.mode}
          initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
          style={{
            padding: '4px 10px', borderRadius: 99,
            background: `${mode.color}18`,
            border: `1px solid ${mode.color}44`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
            color: mode.color, textTransform: 'uppercase',
          }}
        >
          {mode.label}
        </motion.div>
      )}
    </div>
  )
}

/* ═══ CHAT VIEW / COCKPIT ═════════════════════════ */
function ChatView({ onBack }) {
  const { name } = useUser()
  const { activeMode, activeMission, processAIResponse, rewardPlayer, worldMemory, cleanText, interruptActive } = useArcadeStore()
  const isMission = !!activeMode

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [sessionState, setSessionState] = useState('DIAGNOSTIC')
  const [criticism, setCriticism] = useState(null)
  const [masteryMap, setMasteryMap] = useState({})
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const exchangeCountRef = useRef(0)

  const hasInput = input.trim().length > 0
  const isActive = isThinking || hasInput

  // Auto-send the mission opening when a mission starts
  useEffect(() => {
    if (isMission && messages.length === 0) {
      triggerMissionOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMission])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Per-mission opening opts (same shape as MISSION_OPTS in send())
  const MISSION_OPEN_OPTS = {
    debate:    { temperature: 0.72, maxTokens: 160, frequencyPenalty: 0.70, presencePenalty: 0.50 },
    startup:   { temperature: 0.68, maxTokens: 140, frequencyPenalty: 0.55, presencePenalty: 0.40 },
    space:     { temperature: 0.78, maxTokens: 180, frequencyPenalty: 0.50, presencePenalty: 0.35 },
    detective: { temperature: 0.80, maxTokens: 200, frequencyPenalty: 0.45, presencePenalty: 0.30 },
  }

  // Background theme for mission mode
  const missionBg = isMission
    ? `linear-gradient(172deg, #05071a 0%, #080a20 40%, #0a0c25 100%)`
    : 'linear-gradient(172deg, #BFC9D4 0%, #C7CFD9 22%, #D1D9E4 48%, #DADDE8 72%, #E4E7F0 100%)'

  const missionGlow = isMission && activeMission
    ? { position: 'absolute', top: 0, left: 0, right: 0, height: 320, background: `radial-gradient(ellipse at 50% 0%, ${activeMission.glow} 0%, transparent 70%)`, pointerEvents: 'none' }
    : null

  /* Advance session state every 4 exchanges */
  const advanceSessionState = (count, criticResult) => {
    const thresholds = [4, 8, 12]
    const states = SESSION_STATES
    let nextIdx = states.indexOf(sessionState)
    if (count >= thresholds[2] && nextIdx < 3) nextIdx = 3
    else if (count >= thresholds[1] && nextIdx < 2) nextIdx = 2
    else if (count >= thresholds[0] && nextIdx < 1) nextIdx = 1
    if (criticResult?.understanding === 'mastery' && nextIdx < 2) nextIdx = 2
    if (states[nextIdx] !== sessionState) setSessionState(states[nextIdx])
  }

  const updateMastery = (criticResult) => {
    if (!criticResult?.topic) return
    const topic = criticResult.topic.toLowerCase().trim()
    const score = { none: 10, partial: 40, solid: 75, mastery: 95 }[criticResult.understanding] ?? 40
    setMasteryMap(prev => ({ ...prev, [topic]: Math.round((prev[topic] ?? score) * 0.6 + score * 0.4) }))
  }

  const stop = () => {
    abortRef.current?.abort()
    setIsThinking(false)
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m))
  }

  /* Mission opening — AI fires first */
  const triggerMissionOpen = async () => {
    if (!activeMission) return
    setIsThinking(true)

    // World memory context
    const memoryStr = Object.keys(worldMemory).length
      ? `\n\nWORLD MEMORY (past sessions): ${JSON.stringify(worldMemory)}`
      : ''

    const systemPrompt = activeMission.systemPrompt + memoryStr
    const controller = new AbortController()
    abortRef.current = controller

    setMessages([{ role: 'model', text: '', streaming: true }])

    let openRaw = ''
    try {
      await streamGroq(
        [],
        systemPrompt,
        chunk => {
          openRaw += chunk
          const visible = cleanText(openRaw)
          setMessages(prev => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, text: visible }
            return copy
          })
        },
        controller.signal,
        MISSION_OPEN_OPTS[activeMission?.id] || {},
      )
    } catch (err) { /* silent */ }
    finally {
      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
    }
  }

  const send = async () => {
    if (!hasInput || isThinking) return
    const userText = input.trim()
    setInput('')

    const userMsg = { role: 'user', text: userText }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'model', text: '', streaming: true }])
    setIsThinking(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let systemPrompt
      let rawResponse = ''

      // Per-mission API options: penalise repetition, cap length
      const MISSION_OPTS = {
        debate:    { temperature: 0.72, maxTokens: 180, frequencyPenalty: 0.70, presencePenalty: 0.50 },
        startup:   { temperature: 0.68, maxTokens: 160, frequencyPenalty: 0.55, presencePenalty: 0.40 },
        space:     { temperature: 0.78, maxTokens: 200, frequencyPenalty: 0.50, presencePenalty: 0.35 },
        detective: { temperature: 0.80, maxTokens: 220, frequencyPenalty: 0.45, presencePenalty: 0.30 },
      }

      if (isMission && activeMission) {
        // Mission mode: use persona system prompt
        const memoryStr = Object.keys(worldMemory).length
          ? `\n\nWORLD MEMORY: ${JSON.stringify(worldMemory)}`
          : ''
        systemPrompt = activeMission.systemPrompt + memoryStr
      } else {
        // Standard tutor mode
        const criticResult = await runCritic(messages, userText)
        setCriticism(criticResult)
        updateMastery(criticResult)
        exchangeCountRef.current += 1
        advanceSessionState(exchangeCountRef.current, criticResult)
        systemPrompt = buildAevaPrompt(sessionState, criticResult, name)
      }

      const streamOpts = isMission ? (MISSION_OPTS[activeMode] || {}) : {}

      await streamGroq(
        history,
        systemPrompt,
        chunk => {
          rawResponse += chunk
          // Strip engine tags live so they never render in the bubble
          const visible = cleanText(rawResponse)
          setMessages(prev => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, text: visible }
            return copy
          })
        },
        controller.signal,
        streamOpts,
      )

      // Post-process for chaos/vitals/fallacy/interrupt
      if (isMission) {
        processAIResponse(rawResponse)
        // Reward player if response has a substantive answer (heuristic: > 30 chars)
        if (userText.length > 30) rewardPlayer(3)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'model', text: 'Something went wrong. Please try again.', streaming: false }
          return copy
        })
      }
    } finally {
      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
      inputRef.current?.focus()
    }
  }

  const isEmpty = messages.length === 0

  // Text colors adapt to mode
  const backBtnStyle = isMission
    ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.65)' }
    : { background: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.45)', color: '#3a3550' }

  const logoColor = isMission ? 'rgba(255,255,255,0.85)' : '#3a3550'
  const headingColor = isMission ? 'rgba(255,255,255,0.55)' : '#4a4560'
  const titleColor = isMission ? 'rgba(255,255,255,0.92)' : '#1e1a2a'

  const inputBarStyle = isMission
    ? {
        background: 'rgba(255,255,255,0.06)',
        border: activeMission ? `1px solid ${activeMission.border}` : '1px solid rgba(255,255,255,0.14)',
        boxShadow: activeMission ? `0 0 24px ${activeMission.glow}` : 'none',
      }
    : {
        background: 'rgba(255,255,255,0.28)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow: '0 8px 32px rgba(30,36,100,0.07), inset 0 1px 0 rgba(255,255,255,0.90)',
      }

  const inputTextColor = isMission ? 'rgba(255,255,255,0.88)' : '#1e1a2a'
  const placeholderNote = isMission
    ? `Respond to ${activeMission?.title || 'the mission'}…`
    : 'Ask Aeva anything…'

  const sendBtnStyle = isMission && activeMission
    ? { background: `linear-gradient(145deg, ${activeMission.color}80, ${activeMission.color}40)`, border: `1.5px solid ${activeMission.color}60`, boxShadow: `0 4px 14px ${activeMission.glow}` }
    : { background: 'linear-gradient(145deg, #a090f0 0%, #c8bcfc 55%, #eeebff 100%)', border: '1.5px solid rgba(255,255,255,0.80)', boxShadow: '0 4px 14px rgba(95,85,200,0.34)' }

  const sendIconColor = isMission ? 'rgba(255,255,255,0.90)' : '#3a30a0'

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        width: '100%', height: '100vh', overflow: 'hidden',
        background: missionBg,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Mission glow overlay */}
      {missionGlow && <div aria-hidden style={missionGlow} />}

      {/* Main layout — split for debate mode */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, backdropFilter: 'blur(20px)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', ...backBtnStyle }}>
            <ChevronLeft size={14} strokeWidth={2.5} />
            {isMission ? 'Exit Mission' : 'Dashboard'}
          </motion.button>

          {/* Center: mission badge or session badges */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {isMission && activeMission
              ? <MissionBadge mission={activeMission} />
              : (!isEmpty && <SessionBadge sessionState={sessionState} criticism={criticism} />)
            }
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={11} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: logoColor, letterSpacing: '-0.02em' }}>aeva</span>
          </div>
        </div>

        {/* Mission vitals HUD (startup / space) */}
        {isMission && <MissionVitalsBar />}

        {/* Inner area: split for debate, single column otherwise */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Chat column */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

            {/* Orb + heading (empty state) */}
            <AnimatePresence>
              {isEmpty && !isMission && (
                <motion.div
                  initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}
                >
                  <AevaOrb size={218} active={isActive} />
                  <div style={{ textAlign: 'center', padding: '0 28px', marginTop: 8 }}>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: headingColor, lineHeight: 1.3, letterSpacing: '0.01em', marginBottom: 2 }}>
                      Hey {name},
                    </p>
                    <h1 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 800, color: titleColor, lineHeight: 1.07, letterSpacing: '-0.05em', whiteSpace: 'nowrap', margin: 0 }}>
                      What can I help with?
                    </h1>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mini orb + mastery (tutor mode active) */}
            {!isEmpty && !isMission && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0, gap: 6 }}>
                <AevaOrb size={72} active={isThinking} />
                {Object.keys(masteryMap).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px' }}>
                    {Object.entries(masteryMap).slice(0, 4).map(([topic, score]) => (
                      <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.35)', fontSize: 11, color: '#3a3550', fontWeight: 500 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: score >= 75 ? '#4ADE80' : score >= 40 ? '#E9A364' : '#FF8C6B' }} />
                        {topic} {score}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mission thinking orb — red pulse on interrupt */}
            {isMission && isThinking && (
              <div className={interruptActive ? 'orb-interrupt' : ''} style={{ display: 'flex', justifyContent: 'center', paddingTop: 6, flexShrink: 0 }}>
                <AevaOrb size={48} active />
              </div>
            )}

            {/* Messages */}
            <div
              className="chat-messages"
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: isEmpty ? 'flex-end' : 'flex-start' }}
            >
              <div style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto' }}>
                {messages.map((msg, i) =>
                  isMission
                    ? <ThemedChatBubble key={i} msg={msg} mission={activeMission} />
                    : <ChatBubble key={i} msg={msg} />
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input bar */}
            <div style={{ flexShrink: 0, padding: '0 20px', paddingBottom: 36 }}>
              <div style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 20px', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 999, transition: 'border 0.3s, box-shadow 0.3s', ...inputBarStyle }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={placeholderNote}
                  disabled={isThinking}
                  style={{ flex: 1, background: 'transparent', outline: 'none', border: 'none', color: inputTextColor, fontFamily: isMission && activeMission?.id === 'startup' ? '"JetBrains Mono", monospace' : "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 400, caretColor: activeMission?.color || '#6b5fe8', opacity: isThinking ? 0.5 : 1 }}
                />
                {isThinking ? (
                  <motion.button onClick={stop} whileTap={{ scale: 0.84 }}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(145deg, #f0a0a0 0%, #f8c0c0 100%)', border: '1.5px solid rgba(255,255,255,0.80)', boxShadow: '0 4px 14px rgba(200,80,80,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <StopCircle size={16} strokeWidth={2} color="#b03030" />
                  </motion.button>
                ) : (
                  <motion.button onClick={send} whileTap={{ scale: 0.84 }}
                    animate={{ scale: hasInput ? [1, 1.10, 1] : 1 }}
                    transition={{ scale: { duration: 1.1, repeat: hasInput ? Infinity : 0, ease: 'easeInOut' } }}
                    style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, ...sendBtnStyle }}>
                    <ArrowUp size={16} strokeWidth={2.8} color={sendIconColor} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Debate Logic Feed — right panel (desktop only, via CSS class) */}
          {isMission && activeMission?.hudType === 'debate' && (
            <div className="debate-feed-panel">
              <DebateLogicFeed />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══ AUTH FIELD ══════════════════════════════════ */
function AuthField({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase' }}>{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)', fontSize: 15, fontFamily: "'Inter', system-ui, sans-serif", outline: 'none', transition: 'border-color 0.2s' }}
        onFocus={e => e.target.style.borderColor = 'rgba(139,143,255,0.55)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
      />
    </div>
  )
}

/* ═══ LOGIN SCREEN ════════════════════════════════ */
function LoginScreen() {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'signup') {
        const { error: e } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        })
        if (e) throw e
        setSuccess('Check your email to confirm your account, then sign in.')
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) throw e
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(''); setLoading(true)
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (e) { setError(e.message); setLoading(false) }
  }

  const tabStyle = active => ({
    flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 600,
    background: active ? 'rgba(139,143,255,0.22)' : 'transparent',
    color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.35)',
    transition: 'all 0.2s',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #08091a 0%, #0f1228 38%, #0c0e2c 68%, #07091a 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div aria-hidden style={{ position: 'fixed', top: '10%', left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.20) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'fixed', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.12) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 1, padding: '0 24px', maxWidth: 420, width: '100%' }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <AevaOrb size={100} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={13} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>aeva</span>
          </div>
        </div>

        {/* Card */}
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 28, padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 13, padding: 4, gap: 4 }}>
            <button style={tabStyle(tab === 'signin')} onClick={() => { setTab('signin'); setError(''); setSuccess('') }}>Sign In</button>
            <button style={tabStyle(tab === 'signup')} onClick={() => { setTab('signup'); setError(''); setSuccess('') }}>Sign Up</button>
          </div>

          {/* Heading */}
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 400, color: 'rgba(255,255,255,0.90)', margin: '0 0 6px' }}>
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
              {tab === 'signin' ? 'Your tutor is ready for you.' : 'Start learning smarter today.'}
            </p>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'signup' && (
              <AuthField label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" />
            )}
            <AuthField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <AuthField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {error && <p style={{ fontSize: 13, color: '#FF8C6B', margin: 0 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: '#4ADE80', margin: 0 }}>{success}</p>}

          {/* Submit */}
          <motion.button
            onClick={handleSubmit} disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ width: '100%', padding: '13px', borderRadius: 13, background: 'linear-gradient(135deg, #3D40A8 0%, #5558D4 100%)', border: '1px solid rgba(139,143,255,0.40)', color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: "'Inter', system-ui, sans-serif", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '…' : tab === 'signin' ? 'Sign In →' : 'Create Account →'}
          </motion.button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <motion.button
            onClick={handleGoogle} disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px', borderRadius: 13, background: 'rgba(255,255,255,0.90)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            <svg width="17" height="17" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══ APP ROOT ════════════════════════════════════ */
export default function App() {
  const [view, setView] = useState('dashboard')
  const [authUser, setAuthUser] = useState(undefined)
  const { activeMode, exitMission } = useArcadeStore()

  // When a mission is selected from Arcade Hub, auto-open chat
  useEffect(() => {
    if (activeMode) setView('chat')
  }, [activeMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null)
      if (!session) setView('dashboard')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (authUser === undefined) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#08091a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <AevaOrb size={80} />
        </motion.div>
      </div>
    )
  }

  if (!authUser) return <LoginScreen />

  const firstName = (authUser.user_metadata?.full_name || authUser.email)?.split(' ')[0] || 'there'
  const userValue = {
    name: firstName,
    mood: 'LOCKED IN',
    email: authUser.email,
    photo: authUser.user_metadata?.avatar_url || null,
  }

  const handleBack = () => {
    exitMission()
    setView('dashboard')
  }

  return (
    <UserContext.Provider value={userValue}>
      <style>{gridCSS}</style>
      {/* Global chaos banner */}
      <ChaosEventBanner />
      <AnimatePresence mode="wait" initial={false}>
        {view === 'dashboard'
          ? <DashboardView key="dashboard" onChatOpen={() => setView('chat')} onSignOut={() => supabase.auth.signOut()} />
          : <ChatView key="chat" onBack={handleBack} />
        }
      </AnimatePresence>
    </UserContext.Provider>
  )
}
