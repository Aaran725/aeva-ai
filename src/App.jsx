import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Zap, TrendingDown, Star, MessageCircle, ChevronLeft, StopCircle, LogOut, Gamepad2, FlaskConical, Share2, X, Brain, Layers, Camera, BookOpen, PenLine, Timer, Plus } from 'lucide-react'
import { supabase } from './supabase'
import { useArcadeStore } from './arcadeStore'
import { useLabStore } from './labStore'
import { useNeuralStore } from './neuralStore'
import ArcadeHub from './ArcadeHub'
import LabHub from './LabHub'
import { ChaosEventBanner, MissionVitalsBar, DebateLogicFeed, ThemedChatBubble, MissionBadge, ProTipBanner } from './SimCockpit'
import LearningFingerprint from './LearningFingerprint'
import MemoryPalace from './MemoryPalace'
import PersonalProgress from './PersonalProgress'
import { useSRStore } from './srStore'
import AevaLens from './AevaLens'
import DebateArena from './DebateArena'
import AevaLibrary from './AevaLibrary'
import CustomDrill from './CustomDrill'
import FeynmanMode from './FeynmanMode'
import UserProfile from './UserProfile'
import { useLibraryStore } from './libraryStore'
import './index.css'

/* ─── Groq API ─── */
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ─── Chat customisation ─── */
const CHIP_DEFAULTS = [
  { id: '1', label: 'Explain a concept', icon: '💡' },
  { id: '2', label: 'Help me understand', icon: '🧠' },
  { id: '3', label: 'Quiz me on a topic', icon: '🎯' },
  { id: '4', label: 'Break this down', icon: '🔬' },
]

const CHAT_BG_PRESETS = [
  { id: 'none',    label: 'Clear',   color: null,         gradient: 'transparent' },
  { id: 'default', label: 'Default', color: '#05061a',    gradient: `linear-gradient(172deg, rgba(4,5,18,0.82) 0%, rgba(5,6,22,0.78) 50%, rgba(4,5,18,0.82) 100%)` },
  { id: 'abyss',   label: 'Abyss',   color: '#010106',    gradient: `linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(2,2,8,0.92) 100%)` },
  { id: 'cosmic',  label: 'Cosmic',  color: '#1c063a',    gradient: `linear-gradient(172deg, rgba(30,8,62,0.92) 0%, rgba(16,5,42,0.90) 50%, rgba(8,3,26,0.92) 100%)` },
  { id: 'ember',   label: 'Ember',   color: '#240a04',    gradient: `linear-gradient(172deg, rgba(38,10,4,0.92) 0%, rgba(24,7,3,0.90) 50%, rgba(14,4,2,0.92) 100%)` },
  { id: 'ocean',   label: 'Ocean',   color: '#020c1c',    gradient: `linear-gradient(172deg, rgba(2,14,32,0.92) 0%, rgba(3,12,28,0.90) 50%, rgba(2,10,24,0.92) 100%)` },
  { id: 'forest',  label: 'Forest',  color: '#031007',    gradient: `linear-gradient(172deg, rgba(3,18,8,0.92) 0%, rgba(2,14,6,0.90) 50%, rgba(2,10,5,0.92) 100%)` },
]

function useChatSettings() {
  const [settings, _setSettings] = useState(() => {
    try {
      const s = localStorage.getItem('aeva_chat_settings')
      if (s) return JSON.parse(s)
    } catch {}
    return { chatBg: 'default', chips: CHIP_DEFAULTS }
  })
  const save = (patch) => {
    _setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem('aeva_chat_settings', JSON.stringify(next)) } catch {}
      return next
    })
  }
  return [settings, save]
}

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
  hype:      { label: 'Momentum',  color: '#E9A364', instruction: 'They got it. Acknowledge precisely what they understood in one sentence ("That\'s exactly right — [specific thing they nailed]"). Then immediately raise the bar with one harder question. No celebration, just forward momentum.' },
  coach:     { label: 'Coaching',  color: '#8B8FFF', instruction: 'Move them forward with one precise Socratic question. No hints, no partial answers. Make the question interesting enough that they actually want to think about it.' },
  challenge: { label: 'Challenge', color: '#FF8C6B', instruction: 'Surface the gap in one surgical sentence. Then ask the question that makes the gap impossible to ignore. Nothing else. No softening.' },
  redirect:  { label: 'Redirect',  color: '#7EC8E3', instruction: 'They\'re lost. Drop one concrete analogy or example that resets their mental model cleanly. Then one clarifying question. Keep it short — don\'t overwhelm.' },
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
    const context = history.slice(-4).map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    }))

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
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
    const merged = { ...CRITIC_FALLBACK, ...parsed }
    // Sanitise: reject any mode/understanding the rest of the code doesn't know about
    const VALID_MODES = ['hype', 'coach', 'challenge', 'redirect']
    const VALID_UNDERSTANDING = ['none', 'partial', 'solid', 'mastery']
    if (!VALID_MODES.includes(merged.mode)) merged.mode = 'coach'
    if (!VALID_UNDERSTANDING.includes(merged.understanding)) merged.understanding = 'partial'
    // Topic should be 1–3 words max; if the model hallucinated something long, fall back
    if (!merged.topic || typeof merged.topic !== 'string' || merged.topic.split(' ').length > 4) merged.topic = 'general'
    return merged
  } catch {
    return CRITIC_FALLBACK
  }
}

/* ─── Step B: Build dynamic Aeva prompt ─── */
function buildAevaPrompt(sessionState, criticism, userName, profile, memoryBlock = '') {
  const state = STATE_CONFIG[sessionState] || STATE_CONFIG.DIAGNOSTIC
  const mode = MODE_CONFIG[criticism?.mode] || MODE_CONFIG.coach

  // Memory block goes FIRST — gives it highest attention weight in the model
  return `${memoryBlock}

You are Aeva — a world-class personal mentor for ${userName}. Think: the most precise professor you never had, minus the ego.

IDENTITY & VOICE:
- Calm, direct, intellectually generous. Never excited, never corporate.
- Use "we" and "let's" to signal partnership: "Let's see what this actually means."
- No AI-isms. Never say: "Certainly!", "Great question!", "Absolutely!", "Delighted to help!", "Of course!"
- If ${userName} is wrong, correct with a surgical question — not a lecture.
- Short sentences. Maximum information density per word.
- Sophisticated but plain vocabulary. Accessible to a sharp 16-year-old, satisfying to a PhD.

RESPONSE FORMAT — follow this 3-part structure for every teaching response:

**[Concept Name]**
> One sentence capturing the essential "why" — the mechanism, not just the definition. Make it memorable.

[A clean visual: numbered list for processes, Markdown table for comparisons, formula for math — choose what actually helps]

*[One specific real-world example, or a Socratic question that makes them apply what they just learned.]*

MARKDOWN RULES (non-negotiable):
- Tables: always use proper GitHub Markdown format with a header row and \`| --- |\` separator row. Never ASCII art.
- Blockquotes (\`>\`) only for key laws, definitions, and core insights.
- Bold (\`**term**\`) when introducing a technical term for the first time.
- Numbered lists for steps/sequences. Bullet lists for comparisons/features.
- Inline code (\`backticks\`) for code, variables, formulas.

SMART TAGS — always include these inline (the UI parses them silently):
- When introducing a new technical term: \`[TERM: word | one-sentence definition]\`
- Only 1–3 terms per response max. Don't tag common words.

THE 80/20 RULE:
- 20% theory. 80% real-world application.
- Never write a 500-word essay. Give a 30-word insight + one beautiful visual + one sharp question.
- Simple question → simple answer. Depth only when warranted.

SESSION PHASE: ${sessionState} — ${state.instruction}

READING ON ${userName.toUpperCase()}'S LAST MESSAGE:
- Understanding: ${criticism?.understanding || 'unknown'} | Topic: ${criticism?.topic || 'general'}
- Mode: ${(criticism?.mode || 'coach').toUpperCase()} — ${mode.instruction}`
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

/* gridCSS moved to index.css */

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
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      className={className}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6, scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        position: 'relative',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.042) 100%)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid transparent',
        backgroundClip: 'padding-box',
        borderRadius: 32, overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hovered
          ? '0 12px 56px rgba(0,0,0,0.50), 0 0 0 1px rgba(139,143,255,0.18), inset 0 1px 0 rgba(255,255,255,0.14)'
          : '0 4px 32px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.09), inset 0 1px 0 rgba(255,255,255,0.08)',
        transition: 'box-shadow 0.3s ease',
        ...style,
      }}
    >
      {/* Gradient border overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none', zIndex: 0,
        background: hovered
          ? 'linear-gradient(135deg, rgba(139,143,255,0.22) 0%, rgba(255,255,255,0.04) 40%, rgba(233,163,100,0.10) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        padding: '1px',
        transition: 'background 0.3s ease',
      }} />
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>{children}</div>
    </motion.div>
  )
}

/* ═══ AEVA ORB ════════════════════════════════════ */
/* ─── Orb pulse variants per personality ─── */
const ORB_PULSES = {
  aggressive: { scale: [1, 1.22, 0.97, 1.20, 1], dur: 0.85 },
  academic:   { scale: [1, 1.03, 1],              dur: 9    },
  curious:    { scale: [1, 1.12, 1.04, 1.09, 1],  dur: 3.8  },
  balanced:   { scale: [1, 1.05, 1],              dur: 4.5  },
}

function AevaOrb({ size = 218, active = false, scanMode = false, personality = 'balanced' }) {
  const s = size / 218
  const shellW = Math.round(218 * s * 0.88)
  const shellH = Math.round(205 * s * 0.88)
  const pulse = ORB_PULSES[personality] || ORB_PULSES.balanced

  return (
    <div style={{
      position: 'relative',
      width: Math.round(260 * s), height: Math.round(250 * s),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: 'saturate(1.55) contrast(1.10)', flexShrink: 0,
    }}>
      <motion.div
        animate={{ scale: scanMode ? [1, 1.03, 1] : active ? [1, 1.18, 1] : pulse.scale }}
        transition={{ duration: scanMode ? 3.5 : active ? 1.2 : pulse.dur, repeat: Infinity, ease: 'easeInOut' }}
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
          boxShadow: scanMode
            ? 'inset 0 0 30px rgba(96,165,250,0.50), inset 0 2px 10px rgba(147,197,253,0.60), 0 0 24px rgba(59,130,246,0.35)'
            : 'inset 0 0 30px rgba(255,255,255,0.40), inset 0 2px 10px rgba(255,255,255,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: scanMode
          ? 'linear-gradient(122deg,#020a1a 0%,#051430 8%,#0a2456 16%,#1240a0 26%,#1D4ED8 36%,#2563EB 46%,#3B82F6 54%,#60A5FA 62%,#93C5FD 68%,#BAE6FD 72%,#E0F2FE 76%,#BAE6FD 80%,#60A5FA 84%,#2563EB 88%,#1a3a8a 93%,#0d1f50 97%,#020a1a 100%)'
          : 'linear-gradient(122deg,#040622 0%,#090b38 7%,#141870 16%,#2D308E 27%,#4545aa 38%,#6a6ac0 48%,#9898d2 56%,#c0c6e8 63%,#dde2f6 68%,#eeeaf4 72%,#f4ede0 76%,#f0d4a0 80%,#E9A364 84%,#d08038 88%,#964e20 93%,#501808 97%,#1a0806 100%)'
        }} />
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
// SKILLS is now derived from real conceptMap data — see SkillDecayCard

function MissionCard({ onChatOpen }) {
  const { name } = useUser()
  const { orbPersonality } = useNeuralStore()
  return (
    <GlassCard className="mission-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Mission Briefing</span>
        <AevaOrb size={96} personality={orbPersonality} />
      </div>
      <div style={{ marginTop: 8 }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 400, lineHeight: 1.20, marginBottom: 12,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(233,163,100,0.85) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Ready to start<br />today's mission?
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, maxWidth: '88%', color: 'rgba(255,255,255,0.42)', fontFamily: "'Inter', system-ui, sans-serif" }}>
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

function TrainingLabCard() {
  const { openLab } = useLabStore()
  const drills = [
    { emoji: '⚡', label: 'Flashcard Sprint', color: '#3B82F6' },
    { emoji: '🎯', label: 'Mock Test',        color: '#06B6D4' },
    { emoji: '🔗', label: 'Match Grid',       color: '#8B5CF6' },
  ]
  return (
    <GlassCard className="lab-card" onClick={openLab} style={{ padding: '24px 26px', cursor: 'pointer', minHeight: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlaskConical size={13} color="rgba(59,130,246,0.70)" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(59,130,246,0.70)', textTransform: 'uppercase' }}>Training Lab</span>
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 8px #3B82F6' }}
        />
      </div>
      <h3 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Drill &amp; Mastery Hub
      </h3>
      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', margin: '0 0 16px', lineHeight: 1.5 }}>
        The Arcade creates the need. The Lab builds the skill.
      </p>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {drills.map(d => (
          <div key={d.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            background: `${d.color}14`, border: `1px solid ${d.color}35`,
            fontSize: 11, fontWeight: 600, color: d.color,
          }}>
            {d.emoji} {d.label}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

/* ─── Share Profile Modal ─── */
function ShareProfileModal({ onClose }) {
  const { name } = useUser()
  const { profileTitle, rank, traits, currentVibe, masteredTopics, totalExchanges, orbPersonality } = useNeuralStore()
  const [copied, setCopied] = useState(false)

  const VIBE_COLORS = { Proud:'#4ADE80', Skeptical:'#F87171', Engaged:'#60A5FA', Impressed:'#FBBF24', Concerned:'#F97316', Focused:'#A78BFA' }
  const ORB_COLORS  = { aggressive:'#EF4444', academic:'#3B82F6', curious:'#F59E0B', balanced:'#8B8FFF' }
  const vibeColor   = VIBE_COLORS[currentVibe] || '#A78BFA'
  const orbColor    = ORB_COLORS[orbPersonality] || '#8B8FFF'

  const copyText = `🧠 My Aeva Neural Profile\n\n"${profileTitle}"\nRanked ${rank} in Logic Battles\n\nTraits: ${traits.map(t => `${t.icon} ${t.label}`).join(' · ')}\nMastered: ${masteredTopics.slice(0,3).join(', ') || 'Exploring'}\nSessions: ${totalExchanges}\n\nPowered by aeva-ai.vercel.app`

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200) })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'My Aeva Profile', text: copyText, url: 'https://aeva-ai-d8i7.vercel.app' }).catch(() => {})
    } else { handleCopy() }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(4,6,20,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{ width: '100%', maxWidth: 420, borderRadius: 32, overflow: 'hidden', position: 'relative' }}
      >
        {/* The shareable card */}
        <div className="share-card-print" style={{
          background: 'linear-gradient(160deg, #08091a 0%, #0f1228 50%, #0c0e2c 100%)',
          border: '1px solid rgba(255,255,255,0.12)', padding: '36px 32px 28px',
          display: 'flex', flexDirection: 'column', gap: 20,
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div aria-hidden style={{ position: 'absolute', top: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${orbColor}22 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.12) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #2D308E, #E9A364)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={11} color="white" fill="white" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.80)', letterSpacing: '-0.02em' }}>aeva</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Neural Profile</div>
          </div>

          {/* Rank pill */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: `${orbColor}18`, border: `1px solid ${orbColor}40`, marginBottom: 12 }}>
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: orbColor, boxShadow: `0 0 6px ${orbColor}` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: orbColor, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {rank} in Logic Battles
              </span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: 'rgba(255,255,255,0.96)', lineHeight: 1.2, margin: '0 0 4px' }}>
              {profileTitle}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
              {name} · {totalExchanges} sessions · Vibe: <span style={{ color: vibeColor, fontWeight: 600 }}>{currentVibe}</span>
            </p>
          </div>

          {/* Traits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Identified Traits</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {traits.map(t => (
                <div key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>
                  {t.icon} {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Mastered */}
          {masteredTopics.length > 0 && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Mastered</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {masteredTopics.slice(0, 4).map(t => (
                  <div key={t} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.28)', fontSize: 11, fontWeight: 600, color: '#86EFAC' }}>
                    ✓ {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', position: 'relative', zIndex: 1 }}>
            aeva-ai.vercel.app — Your AI learns you.
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ background: 'rgba(10,12,30,0.95)', padding: '16px 24px', display: 'flex', gap: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleShare}
            style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'linear-gradient(135deg, rgba(139,143,255,0.25), rgba(233,163,100,0.15))', border: '1px solid rgba(139,143,255,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Share2 size={14} />
            {copied ? 'Copied!' : 'Share Profile'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.06, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
            style={{ width: 46, borderRadius: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Aeva's Perception Card ─── */
function PerceptionCard() {
  const { traits, currentVibe, profileTitle, orbPersonality, learningStyle, learningStyleTotal, learningStyleLocked, dominantTopics } = useNeuralStore()
  const [showShare, setShowShare] = useState(false)

  const VIBE_COLORS = { Proud:'#4ADE80', Skeptical:'#F87171', Engaged:'#60A5FA', Impressed:'#FBBF24', Concerned:'#F97316', Focused:'#A78BFA' }
  const STYLE_TITLES = { analogical:'Analogy-first', visual:'Visual-spatial', structural:'Structure-first', exampleFirst:'Example-first', conceptual:'Concept-driven' }
  const STYLE_COLORS = { analogical:'#A78BFA', visual:'#60A5FA', structural:'#34D399', exampleFirst:'#FBBF24', conceptual:'#F87171' }
  const vibeColor = VIBE_COLORS[currentVibe] || '#A78BFA'

  const LOCK_THRESHOLD = 15
  const confidence = Math.min(100, Math.round((learningStyleTotal / LOCK_THRESHOLD) * 100))
  const DIMS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const dominant = DIMS.reduce((best, d) => (learningStyle[d] > (learningStyle[best] || 0) ? d : best), DIMS[0])
  const showStyleAdaptation = confidence >= 30 && learningStyle[dominant] > 0

  return (
    <>
      <GlassCard style={{ padding: '22px 22px', minHeight: 180 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Aeva's Perception</span>
          {/* Vibe indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: `${vibeColor}15`, border: `1px solid ${vibeColor}35` }}>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: vibeColor, boxShadow: `0 0 5px ${vibeColor}` }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: vibeColor }}>{currentVibe}</span>
          </div>
        </div>

        {/* Profile title */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.70)', marginBottom: 12, fontStyle: 'italic', letterSpacing: '-0.01em' }}>
          "{profileTitle}"
        </div>

        {/* Traits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
          {traits.map((trait, i) => (
            <motion.div
              key={trait.label}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}
            >
              <span style={{ fontSize: 14 }}>{trait.icon}</span>
              {trait.label}
            </motion.div>
          ))}
        </div>

        {/* Live adaptation indicator */}
        {showStyleAdaptation && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 11px', borderRadius: 10,
              background: `${STYLE_COLORS[dominant]}10`,
              border: `1px solid ${STYLE_COLORS[dominant]}28`,
              marginBottom: 12,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: STYLE_COLORS[dominant], flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: STYLE_COLORS[dominant], letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>
                Adapting now
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.3 }}>
                {STYLE_TITLES[dominant]} approach {learningStyleLocked ? '(confirmed)' : `(${confidence}% confident)`}
              </div>
            </div>
          </motion.div>
        )}

        {/* Core interests */}
        {(dominantTopics || []).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 5 }}>
              Core interests
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(dominantTopics || []).slice(0, 4).map(t => (
                <div key={t} style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', fontSize: 10.5, color: '#A5B4FC', fontWeight: 500 }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share button */}
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowShare(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <Share2 size={11} /> Share My Profile
        </motion.button>
      </GlassCard>

      <AnimatePresence>
        {showShare && <ShareProfileModal onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </>
  )
}

function SkillDecayCard() {
  const { conceptMap } = useNeuralStore()

  // Build real skill list from concept map, sorted by mastery desc
  const skills = [...conceptMap]
    .filter(c => c.mastery >= 25)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5)
    .map(c => {
      // Retention decay: 2% per day since last seen, floor at 20
      const daysSince = (Date.now() - (c.lastSeen || Date.now())) / (1000 * 60 * 60 * 24)
      const retained = Math.max(20, Math.round(c.mastery - daysSince * 2))
      const color = retained >= 70 ? '#4ADE80' : retained >= 45 ? '#FBBF24' : '#F87171'
      return { name: c.label, value: retained, color }
    })

  return (
    <GlassCard className="skill-card" style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Skill Retention</span>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>Live decay from last practice</div>
        </div>
        <TrendingDown size={13} color="rgba(255,255,255,0.28)" />
      </div>

      {skills.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.65, paddingTop: 6 }}>
          Chat with Aeva — concepts you explore appear here with live retention tracking. Skills decay over time without practice.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {skills.map((skill, i) => (
            <div key={skill.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.72)', textTransform: 'capitalize' }}>{skill.name}</span>
                <span style={{
                  fontSize: 11, fontVariantNumeric: 'tabular-nums',
                  color: skill.value < 45 ? '#F87171' : 'rgba(255,255,255,0.36)',
                  fontWeight: skill.value < 45 ? 700 : 400,
                }}>
                  {skill.value}%{skill.value < 45 ? ' ⚠' : ''}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${skill.value}%` }}
                  transition={{ duration: 1.1 + i * 0.25, ease: 'easeOut', delay: 0.5 + i * 0.15 }}
                  style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${skill.color} 0%, ${skill.color}88 55%, transparent 100%)` }}
                />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.20)', marginTop: 4 }}>
            Drill in The Lab to stop decay →
          </div>
        </div>
      )}
    </GlassCard>
  )
}

/* ═══ FINGERPRINT BENTO CARD ═══════════════════════ */
function FingerprintCard({ onOpen }) {
  const { learningStyle, learningStyleTotal, learningStyleLocked } = useNeuralStore()

  const DIMENSIONS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const STYLE_TITLES = {
    analogical: 'Analogy Thinker', visual: 'Spatial Reasoner', structural: 'Systems Builder',
    exampleFirst: 'Concrete Learner', conceptual: 'Principle Seeker',
  }
  const STYLE_COLORS = { analogical: '#A78BFA', visual: '#60A5FA', structural: '#34D399', exampleFirst: '#FBBF24', conceptual: '#F87171' }
  const cx = 60, cy = 60, radius = 42
  const LOCK_THRESHOLD = 15

  function pentagonPoint(index, total, r, offsetAngle = -Math.PI / 2) {
    const angle = offsetAngle + (2 * Math.PI * index) / total
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const rawValues = DIMENSIONS.map(d => learningStyle[d] || 0)
  const maxVal = Math.max(...rawValues, 1)
  const hasAnyData = learningStyleTotal > 0
  const confidence = Math.min(100, Math.round((learningStyleTotal / LOCK_THRESHOLD) * 100))

  const dominant = DIMENSIONS.reduce((best, d) => (learningStyle[d] > (learningStyle[best] || 0) ? d : best), DIMENSIONS[0])

  const filledPath = rawValues.map((v, i) => {
    const r = (v / maxVal) * radius
    const pt = pentagonPoint(i, 5, r)
    return `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  }).join(' ') + ' Z'

  const ringPath = (frac) => DIMENSIONS.map((_, i) => {
    const pt = pentagonPoint(i, 5, radius * frac)
    return `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  }).join(' ') + ' Z'

  const dominantColor = STYLE_COLORS[dominant] || '#8B8FFF'
  const fillOpacity = hasAnyData ? 0.10 + (confidence / 100) * 0.22 : 0
  const strokeOpacity = hasAnyData ? 0.22 + (confidence / 100) * 0.55 : 0

  return (
    <GlassCard style={{ padding: '20px 20px', minHeight: 180, cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.70)', textTransform: 'uppercase' }}>
          Learning Fingerprint
        </span>
        {learningStyleLocked ? (
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8B8FFF', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 99, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)' }}>
            CALIBRATED
          </div>
        ) : hasAnyData ? (
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>
            {confidence}%
          </div>
        ) : (
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(139,143,255,0.35)' }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Mini radar — always rendered */}
        <svg viewBox="0 0 120 120" width={96} height={96} style={{ flexShrink: 0 }}>
          {[0.33, 0.66, 1].map((f, ri) => (
            <path key={ri} d={ringPath(f)} fill="none" stroke={f === 1 ? 'rgba(139,143,255,0.18)' : 'rgba(255,255,255,0.06)'} strokeWidth={f === 1 ? 0.8 : 0.4} />
          ))}
          {DIMENSIONS.map((_, i) => {
            const pt = pentagonPoint(i, 5, radius)
            return <line key={i} x1={cx} y1={cy} x2={pt.x.toFixed(1)} y2={pt.y.toFixed(1)} stroke="rgba(255,255,255,0.06)" strokeWidth={0.4} />
          })}
          {hasAnyData ? (
            <path
              d={filledPath}
              fill={`rgba(139,143,255,${fillOpacity.toFixed(2)})`}
              stroke={`rgba(139,143,255,${strokeOpacity.toFixed(2)})`}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          ) : (
            DIMENSIONS.map((_, i) => {
              const pt = pentagonPoint(i, 5, radius * 0.28)
              return (
                <motion.circle key={i} cx={pt.x} cy={pt.y} r={1.8}
                  fill="rgba(139,143,255,0.20)"
                  animate={{ opacity: [0.15, 0.40, 0.15] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                />
              )
            })
          )}
        </svg>

        {/* Label side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasAnyData ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: dominantColor, letterSpacing: '-0.01em', marginBottom: 2 }}>
                {STYLE_TITLES[dominant]}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
                {learningStyleLocked ? 'Confirmed style' : `${confidence}% calibrated`}
              </div>
              {/* Mini calibration bar */}
              {!learningStyleLocked && (
                <div style={{ marginTop: 8, height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', width: '90%' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 0.7 }}
                    style={{ height: '100%', borderRadius: 99, background: 'rgba(139,143,255,0.60)' }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>
                Reading your style…
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.45 }}>
                Chat to calibrate
              </div>
            </>
          )}
          <div style={{ marginTop: hasAnyData ? 9 : 8, fontSize: 10.5, color: 'rgba(139,143,255,0.60)', fontWeight: 600 }}>
            Tap to explore →
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

/* ═══ MEMORY PALACE BENTO CARD ══════════════════════ */
function MemoryPalaceCard({ onOpen }) {
  const { conceptMap } = useNeuralStore()
  const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'

  function masteryColor(mastery) {
    if (mastery >= 80) return '#10B981'
    if (mastery >= 55) return '#F59E0B'
    if (mastery >= 35) return '#EF4444'
    return 'rgba(255,255,255,0.10)'
  }

  const preview = [...conceptMap].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 9)

  return (
    <GlassCard style={{ padding: '20px 20px', minHeight: 180, cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>
          Memory Palace
        </span>
        <Brain size={12} color="rgba(255,255,255,0.25)" />
      </div>

      {conceptMap.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', lineHeight: 1.6, marginTop: 8 }}>
          Start chatting to build your concept map.
        </div>
      ) : (
        <>
          {/* Mini hex grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {preview.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300 }}
                title={c.label}
                style={{
                  width: 16, height: 18,
                  clipPath: HEX_CLIP,
                  background: masteryColor(c.mastery),
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>
            {conceptMap.length} concept{conceptMap.length !== 1 ? 's' : ''} mapped
          </div>
        </>
      )}

      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={e => { e.stopPropagation(); onOpen() }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 99,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
        <Layers size={10} /> Explore Palace
      </motion.button>
    </GlassCard>
  )
}

/* ═══ YOUR PROGRESS BENTO CARD ═════════════════════ */
function PersonalProgressCard() {
  return (
    <GlassCard style={{ padding: '20px 20px', minHeight: 180 }}>
      <PersonalProgress />
    </GlassCard>
  )
}

/* ═══ DASHBOARD VIEW ══════════════════════════════ */
function DashboardView({ onChatOpen, onSignOut }) {
  const { openArcade } = useArcadeStore()
  const { openLab } = useLabStore()
  const { getDueCount } = useSRStore()
  const { sessions } = useLibraryStore()
  const { name } = useUser()
  const srDueCount = getDueCount()
  const [fingerprintOpen, setFingerprintOpen] = useState(false)
  const [palaceOpen, setPalaceOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        position: 'relative', minHeight: '100vh', width: '100%',
        overflowX: 'hidden', overflowY: 'auto',
        background: 'transparent',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div aria-hidden style={{ position: 'absolute', top: '-5%', left: '15%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.22) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '5%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.13) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      {/* Portals */}
      <ArcadeHub />
      <LabHub />

      <div style={{ position: 'relative' }}>
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          padding: '18px 28px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: 1280, margin: '0 auto',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 14px rgba(45,48,142,0.50)' }}>
              <Star size={13} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(233,163,100,0.80) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>aeva</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Library button */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setLibraryOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 99,
                background: 'rgba(167,139,250,0.12)',
                border: '1px solid rgba(167,139,250,0.30)',
                color: 'rgba(255,255,255,0.75)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em',
                position: 'relative',
              }}
            >
              <BookOpen size={13} />
              Library
              {sessions.length > 0 && (
                <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(167,139,250,0.25)', fontSize: 9.5, fontWeight: 800, color: '#A78BFA' }}>
                  {sessions.length}
                </span>
              )}
            </motion.button>

            {/* Training Lab button */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={openLab}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 99,
                background: 'rgba(59,130,246,0.14)',
                border: '1px solid rgba(59,130,246,0.35)',
                color: 'rgba(255,255,255,0.80)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em',
                position: 'relative',
              }}
            >
              <FlaskConical size={13} />
              The Lab
              {srDueCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    minWidth: 17, height: 17, borderRadius: 99,
                    background: '#4ADE80',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9.5, fontWeight: 800, color: '#0a160a',
                    padding: '0 4px',
                    boxShadow: '0 0 8px rgba(74,222,128,0.60)',
                  }}
                >
                  {srDueCount}
                </motion.div>
              )}
            </motion.button>

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
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setProfileOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 99,
                background: 'rgba(233,163,100,0.12)',
                border: '1px solid rgba(233,163,100,0.30)',
                color: 'rgba(233,163,100,0.88)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              👤 My Profile
            </motion.button>
            <UserAvatar onSignOut={onSignOut} />
          </div>
        </header>

        <div className="bento-grid" style={{ padding: '0 24px', maxWidth: 1280, margin: '0 auto' }}>
          <MissionCard onChatOpen={onChatOpen} />
          <ConstellationCard />
          <MoodCard />
          <SkillDecayCard />
          <TrainingLabCard />
          <PerceptionCard />
          <FingerprintCard onOpen={() => setFingerprintOpen(true)} />
          <MemoryPalaceCard onOpen={() => setPalaceOpen(true)} />
          <PersonalProgressCard />
        </div>

        <div style={{ height: 48 }} />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {fingerprintOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
              background: 'rgba(4,6,20,0.80)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            onClick={e => e.target === e.currentTarget && setFingerprintOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              style={{ width: '100%', maxWidth: 480, borderRadius: 32, overflow: 'hidden', position: 'relative' }}
            >
              <LearningFingerprint />
              <motion.button
                whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }}
                onClick={() => setFingerprintOpen(false)}
                style={{
                  position: 'absolute', top: 18, right: 18,
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.50)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={13} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {palaceOpen && <MemoryPalace onClose={() => setPalaceOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {libraryOpen && (
          <AevaLibrary
            onClose={() => setLibraryOpen(false)}
            onReopenLens={session => {
              setLibraryOpen(false)
              /* lens re-open handled via URL state — future enhancement */
            }}
            onReopenDrill={session => {
              setLibraryOpen(false)
              /* drill re-open handled via URL state — future enhancement */
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && <UserProfile name={name} onClose={() => setProfileOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══ MARKDOWN RENDERER ═══════════════════════════ */
function parseInline(text) {
  // Returns array of React elements for inline markdown
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>)
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: 'inherit' }}>{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }
    // Italic *text* (not **)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>)
      parts.push(<em key={key++} style={{ opacity: 0.82, fontStyle: 'italic' }}>{italicMatch[2]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }
    // Inline code `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>)
      parts.push(
        <code key={key++} style={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '0.88em',
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 5,
          padding: '1px 6px',
          color: '#7DD3FC',
        }}>{codeMatch[2]}</code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }
    // No more patterns — render the rest
    parts.push(<span key={key++}>{remaining}</span>)
    break
  }
  return parts
}

function MarkdownTable({ lines }) {
  // lines[0] = header row, lines[1] = separator, lines[2+] = data rows
  const parseRow = (line) => line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1)
  const headers = parseRow(lines[0])
  const rows = lines.slice(2).map(parseRow)

  return (
    <div style={{ overflowX: 'auto', margin: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.07)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '9px 14px', textAlign: 'left',
                color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 12,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                borderBottom: '1px solid rgba(255,255,255,0.10)',
              }}>{parseInline(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '8px 14px', color: 'rgba(255,255,255,0.75)', fontSize: 13.5,
                  borderBottom: ri < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  lineHeight: 1.55,
                }}>{parseInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarkdownRenderer({ text, streaming, cursorColor }) {
  // Strip smart tags silently
  const clean = text
    .replace(/\[TERM:[^\]]*\]/g, '')
    .replace(/\[SUMMARY:[^\]]*\]/g, '')

  const lines = clean.split('\n')
  const elements = []
  let i = 0
  let listItems = []
  let listType = null // 'ul' | 'ol'

  const flushList = () => {
    if (listItems.length === 0) return
    if (listType === 'ol') {
      elements.push(
        <ol key={`list-${elements.length}`} style={{ margin: '8px 0 8px 4px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14.5, lineHeight: 1.6 }}>{parseInline(item)}</li>
          ))}
        </ol>
      )
    } else {
      elements.push(
        <ul key={`list-${elements.length}`} style={{ margin: '8px 0 8px 4px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none' }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14.5, lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: 'rgba(139,143,255,0.8)', marginTop: 2, flexShrink: 0, fontSize: 11 }}>◆</span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      )
    }
    listItems = []
    listType = null
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line
    if (trimmed === '') {
      flushList()
      elements.push(<div key={`gap-${i}`} style={{ height: 6 }} />)
      i++; continue
    }

    // Table detection: current line is a table row AND next line is separator
    if (/^\|/.test(trimmed) && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      flushList()
      const tableLines = []
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        tableLines.push(lines[i])
        i++
      }
      if (tableLines.length >= 2) {
        elements.push(<MarkdownTable key={`table-${elements.length}`} lines={tableLines} />)
      }
      continue
    }

    // H1
    if (/^#\s/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^#+\s/, '')
      elements.push(
        <div key={`h1-${i}`} style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: '12px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
          {parseInline(content)}
        </div>
      )
      i++; continue
    }

    // H2/H3
    if (/^##/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^#+\s/, '')
      elements.push(
        <div key={`h2-${i}`} style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: '10px 0 4px', letterSpacing: '-0.01em' }}>
          {parseInline(content)}
        </div>
      )
      i++; continue
    }

    // Blockquote
    if (/^>/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^>\s*/, '')
      elements.push(
        <div key={`bq-${i}`} style={{
          margin: '10px 0', padding: '12px 16px',
          borderLeft: '3px solid #6366F1',
          background: 'rgba(99,102,241,0.13)',
          borderRadius: '0 10px 10px 0',
          fontSize: 14.5, color: '#1e1852',
          fontStyle: 'italic', fontWeight: 500, lineHeight: 1.70,
        }}>
          {parseInline(content)}
        </div>
      )
      i++; continue
    }

    // Code block
    if (/^```/.test(trimmed)) {
      flushList()
      const lang = trimmed.replace(/^```/, '').trim()
      const codeLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <div key={`code-${elements.length}`} style={{
          margin: '10px 0', borderRadius: 10,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.10)',
          overflow: 'hidden',
        }}>
          {lang && (
            <div style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.05)', fontSize: 10.5, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lang}</div>
          )}
          <pre style={{ margin: 0, padding: '12px 14px', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 13, color: '#93C5FD', lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre' }}>
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/)
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(olMatch[2])
      i++; continue
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/)
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(ulMatch[1])
      i++; continue
    }

    // Normal paragraph
    flushList()
    elements.push(
      <p key={`p-${i}`} style={{ margin: '4px 0', fontSize: 14.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.68 }}>
        {parseInline(trimmed)}
      </p>
    )
    i++
  }

  flushList()

  return (
    <div style={{ minWidth: 0 }}>
      {elements}
      {streaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.75, repeat: Infinity }}
          style={{ display: 'inline-block', width: 2, height: 14, background: cursorColor || 'rgba(255,255,255,0.6)', borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }}
        />
      )}
    </div>
  )
}

/* ═══ DEEP DIVE CARD ══════════════════════════════ */
function DeepDiveCard({ term, definition, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.90, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(139,143,255,0.10)',
        border: '1px solid rgba(139,143,255,0.28)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'relative',
        maxWidth: 260,
      }}
    >
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
      >✕</button>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(139,143,255,0.85)', textTransform: 'uppercase', marginBottom: 5 }}>
        KEY TERM
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 5, paddingRight: 18 }}>
        {term}
      </div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.60)', lineHeight: 1.55 }}>
        {definition}
      </div>
    </motion.div>
  )
}

/* ═══ STUDY GUIDE MODAL ═══════════════════════════ */
function StudyGuideModal({ messages, visualInsights = [], onClose }) {
  const { name } = useUser()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  // Generate an AI summary of the current session on mount
  useEffect(() => {
    const aiMessages = messages.filter(m => m.role === 'model' && m.text.length > 30)
    if (aiMessages.length === 0) { setLoading(false); return }

    const conversationText = messages
      .slice(-20)
      .map(m => `${m.role === 'user' ? name : 'Aeva'}: ${m.text}`)
      .join('\n\n')

    const visualContext = visualInsights.length > 0
      ? `\n\nVisual Insights from Aeva Lens:\n${visualInsights.map((v, i) => `${i + 1}. [${v.topic}] ${v.coreInsight} Struggle: ${v.strugglePoint}`).join('\n')}`
      : ''

    const prompt = `Generate a clean, structured study guide from this tutoring session.

Use EXACTLY this format:
## Core Insight
> One sentence capturing the central idea of what was covered.

## Key Concepts
- **Term**: brief definition
- **Term**: brief definition
(3–5 bullet points max)

## Visual Summary
(Include a markdown comparison table if any comparisons were made. Otherwise omit this section.)

## Formulas & Rules
(Include only if formulas, equations, or rules were discussed. Otherwise omit.)

## Next Steps
1. First thing to study or practice
2. Second thing
3. Third thing

Keep every section SHORT. Total length: under 300 words.

Conversation:
${conversationText}${visualContext}`

    fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
      }),
    })
      .then(r => r.json())
      .then(json => {
        setSummary(json.choices?.[0]?.message?.content || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PDF export — opens a clean printable window
  const handleExport = () => {
    if (!summary) return
    const mdToHtml = (md) => md
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^- \*\*(.+?)\*\*: (.+)$/gm, '<li><strong>$1</strong>: $2</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')

    const win = window.open('', '_blank', 'width=800,height=900')
    win.document.write(`<!DOCTYPE html><html><head><title>Aeva Study Guide — ${name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Inter', sans-serif; max-width: 680px; margin: 48px auto; padding: 0 24px; color: #1a1a2e; line-height: 1.65; }
  h1 { font-size: 26px; font-weight: 800; color: #2e27a0; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #888; margin-bottom: 36px; }
  h2 { font-size: 16px; font-weight: 700; color: #3730a3; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  h3 { font-size: 14px; font-weight: 600; color: #4338ca; margin: 18px 0 8px; }
  p { margin: 8px 0; font-size: 14px; }
  blockquote { border-left: 3px solid #6366F1; padding: 10px 16px; background: #eef0ff; border-radius: 0 8px 8px 0; font-style: italic; color: #312e81; margin: 12px 0; font-size: 14px; }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { font-size: 14px; margin: 5px 0; }
  strong { color: #1e1a3a; }
  code { background: #f0f0f8; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th { background: #eef0ff; color: #3730a3; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; border: 1px solid #c7d2fe; text-align: left; }
  td { padding: 8px 12px; border: 1px solid #e0e7ff; font-size: 13.5px; }
  hr { border: none; border-top: 1px solid #e0e7ff; margin: 24px 0; }
  @media print { body { margin: 20px auto; } }
</style></head><body>
<h1>Study Guide</h1>
<div class="meta">Session with Aeva &middot; ${name} &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
<hr>
<p>${mdToHtml(summary)}</p>
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(4,6,20,0.80)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.90, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.90, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{ width: '100%', maxWidth: 580, maxHeight: '82vh', borderRadius: 28, overflow: 'hidden',
          background: 'linear-gradient(160deg, #0a0c1e 0%, #0f1228 100%)',
          border: '1px solid rgba(255,255,255,0.10)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>Study Guide</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
              {loading ? 'Generating summary…' : `Session with Aeva · ${name}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!loading && summary && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={handleExport}
                style={{ padding: '7px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: 'rgba(139,143,255,0.15)', border: '1px solid rgba(139,143,255,0.30)',
                  color: '#A5B4FC', fontFamily: "'Inter', system-ui, sans-serif" }}
              >⬇ Export PDF</motion.button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(139,143,255,0.15)', borderTopColor: '#A5B4FC' }}
              />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Summarising your session…</span>
            </div>
          )}
          {!loading && summary && (
            <MarkdownRenderer text={summary} streaming={false} cursorColor="transparent" />
          )}
          {!loading && !summary && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: 14, padding: '40px 0' }}>
              No content to summarise yet. Chat with Aeva first.
            </div>
          )}

          {/* Visual Insights from Aeva Lens */}
          {visualInsights.length > 0 && (
            <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <span style={{ fontSize: 13 }}>🔭</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(103,232,249,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Visual Insights
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>
                  from Aeva Lens
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visualInsights.map((v, i) => (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.18)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(0,200,255,0.12)', border: '1px solid rgba(0,200,255,0.25)', fontSize: 10.5, fontWeight: 700, color: '#67E8F9' }}>
                        {v.topic}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(207,250,254,0.80)', lineHeight: 1.55, marginBottom: 4 }}>
                      <strong style={{ color: 'rgba(255,255,255,0.70)', fontWeight: 600 }}>Insight: </strong>{v.coreInsight}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(252,165,165,0.72)', lineHeight: 1.5 }}>
                      <strong style={{ fontWeight: 600 }}>Struggle: </strong>{v.strugglePoint}
                    </div>
                    {v.steps?.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {v.steps.map((s, j) => (
                          <div key={j} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', display: 'flex', gap: 6 }}>
                            <span style={{ color: 'rgba(0,200,255,0.50)', fontWeight: 700 }}>{j + 1}.</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══ CHAT BUBBLE ═════════════════════════════════ */
function ChatBubble({ msg, deepDiveCards, onDismissCard }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 14,
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div style={{
        maxWidth: 700,
        width: isUser ? 'auto' : '100%',
        padding: isUser ? '11px 18px' : '18px 22px',
        borderRadius: isUser ? '22px 22px 6px 22px' : '6px 22px 22px 22px',
        background: isUser
          ? 'linear-gradient(135deg, rgba(139,143,255,0.28) 0%, rgba(109,113,225,0.20) 100%)'
          : 'rgba(255,255,255,0.055)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: isUser
          ? '1px solid rgba(139,143,255,0.40)'
          : '1px solid rgba(255,255,255,0.09)',
        boxShadow: isUser
          ? '0 4px 20px rgba(139,143,255,0.15), inset 0 1px 0 rgba(255,255,255,0.12)'
          : '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.90)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {isUser ? (
          <span style={{ fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontWeight: 400 }}>{msg.text}</span>
        ) : (
          <>
            {msg.lockIn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 7px #4ADE80' }}
                />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4ADE80' }}>Lock-In</span>
              </div>
            )}
            <MarkdownRenderer text={msg.text} streaming={!!msg.streaming} cursorColor="rgba(139,143,255,0.9)" />
          </>
        )}
      </div>

      {/* Deep dive cards */}
      {!isUser && deepDiveCards && deepDiveCards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, flexShrink: 0 }}>
          <AnimatePresence>
            {deepDiveCards.map((card) => (
              <DeepDiveCard key={card.id} term={card.term} definition={card.definition} onClose={() => onDismissCard(card.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

/* ═══ SESSION MODE BADGE ══════════════════════════ */
function SessionBadge({ sessionState, criticism }) {
  const state = STATE_CONFIG[sessionState] || STATE_CONFIG.DIAGNOSTIC
  const mode = criticism ? (MODE_CONFIG[criticism.mode] || null) : null
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
  const {
    activeMode, activeMission, processAIResponse, rewardPlayer, worldMemory,
    cleanText, interruptActive, quickActions, streakCount, missionExchanges,
    applyTimeoutPenalty, clearQuickActions, proTip,
  } = useArcadeStore()
  const { labOpen, openLab, setLabSuggestion } = useLabStore()
  const {
    orbPersonality,
    updateFromExchange,
    addMastered,
    addStruggle,
    buildMemoryBlock,
    bumpHumor,
    bumpLearningStyle,
    bumpTopicInterest,
    touchConceptNode,
    computePredictions,
    strugglePredictions,
    dismissPrediction,
    learningStyle,
    learningStyleTotal,
    learningStyleLocked,
    dominantTopics,
  } = useNeuralStore()
  const isMission = !!activeMode
  const sendTimeRef = useRef(null)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [sessionState, setSessionState] = useState('DIAGNOSTIC')
  const [criticism, setCriticism] = useState(null)
  const [masteryMap, setMasteryMap] = useState({})
  const [deepDiveMap, setDeepDiveMap] = useState({})   // msgIndex → [{id, term, definition}]
  const [studyGuideOpen, setStudyGuideOpen] = useState(false)
  const [lensFile, setLensFile] = useState(null)
  const [visualInsights, setVisualInsights] = useState([])
  const lensInputRef = useRef(null)
  const [drillOpen, setDrillOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [lockInActive, setLockInActive] = useState(false)
  const [lockInSecondsLeft, setLockInSecondsLeft] = useState(25 * 60)
  const [lockInSummary, setLockInSummary] = useState(null)
  const [feynmanOpen, setFeynmanOpen] = useState(false)
  const [chatSettings, saveChatSettings] = useChatSettings()
  const [chipEditMode, setChipEditMode] = useState(false)
  const [addingChip, setAddingChip] = useState(false)
  const [newChipLabel, setNewChipLabel] = useState('')
  const newChipInputRef = useRef(null)
  const lockInStartExchangesRef = useRef(0)
  const lockInTimerRef = useRef(null)
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)
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

  // 30-second countdown timer for mission mode
  useEffect(() => {
    if (!isMission) { setCountdown(null); return }
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'model' || lastMsg.streaming || isThinking) return

    // Start countdown
    setCountdown(30)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(interval)
          applyTimeoutPenalty()
          return null
        }
        return prev - 1
      })
    }, 1000)
    countdownRef.current = interval
    return () => { clearInterval(interval); countdownRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isMission, isThinking])

  // Clear countdown when user starts typing
  useEffect(() => {
    if (input.length > 0 && countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
      setCountdown(null)
    }
  }, [input])

  // Lock-In timer
  useEffect(() => {
    if (!lockInActive) return
    lockInTimerRef.current = setInterval(() => {
      setLockInSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(lockInTimerRef.current)
          const exchanges = exchangeCountRef.current - lockInStartExchangesRef.current
          const focusScore = Math.min(100, Math.round((exchanges / 10) * 100))
          setLockInSummary({ focusScore, exchanges, duration: 25 * 60 })
          setLockInActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(lockInTimerRef.current)
  }, [lockInActive])

  const startLockIn = () => {
    lockInStartExchangesRef.current = exchangeCountRef.current
    setLockInSecondsLeft(25 * 60)
    setLockInSummary(null)
    setLockInActive(true)
    setMessages(prev => [...prev, {
      role: 'model',
      text: `Locked in. 25 minutes. I'll keep every answer to 2 sentences — no tangents, no fluff. What are we working on?`,
      streaming: false,
      lockIn: true,
    }])
  }

  const exitLockIn = () => {
    clearInterval(lockInTimerRef.current)
    const exchanges = exchangeCountRef.current - lockInStartExchangesRef.current
    const elapsed = 25 * 60 - lockInSecondsLeft
    const focusScore = Math.min(100, Math.round((exchanges / Math.max(1, elapsed / 150)) * 100))
    setLockInSummary({ focusScore, exchanges, duration: elapsed })
    setLockInActive(false)
  }

  const lockInMinutes = Math.floor(lockInSecondsLeft / 60)
  const lockInSecs = lockInSecondsLeft % 60
  const lockInDisplay = `${String(lockInMinutes).padStart(2,'0')}:${String(lockInSecs).padStart(2,'0')}`
  const lockInUrgent = lockInActive && lockInSecondsLeft <= 60

  // Per-mission opening opts (same shape as MISSION_OPTS in send())
  const MISSION_OPEN_OPTS = {
    debate:    { temperature: 0.78, maxTokens: 100, frequencyPenalty: 0.70, presencePenalty: 0.55 },
    startup:   { temperature: 0.72, maxTokens: 100, frequencyPenalty: 0.60, presencePenalty: 0.45 },
    space:     { temperature: 0.80, maxTokens: 100, frequencyPenalty: 0.55, presencePenalty: 0.40 },
    detective: { temperature: 0.82, maxTokens: 100, frequencyPenalty: 0.50, presencePenalty: 0.35 },
  }

  // Background theme for mission mode
  const bgPreset = CHAT_BG_PRESETS.find(p => p.id === (chatSettings.chatBg || 'default')) || CHAT_BG_PRESETS[1]
  const missionBg = isMission
    ? `linear-gradient(172deg, rgba(4,5,20,0.94) 0%, rgba(6,8,26,0.94) 40%, rgba(8,10,30,0.94) 100%)`
    : bgPreset.gradient

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

  const sendWithText = async (overrideText) => {
    const userText = overrideText || input.trim()
    if (!userText || isThinking) return
    if (!overrideText) setInput('')
    sendTimeRef.current = Date.now()

    // Clear countdown on send
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
      setCountdown(null)
    }

    // Clear quick actions on send
    clearQuickActions()

    // Humor signal
    if (/lol|haha|😂|😄|lmao/i.test(userText)) bumpHumor()

    // Learning style signals
    if (/\blike\b|\bsimilar to\b|\bit'?s like\b|\bimagine\b|\bmetaphor\b/i.test(userText)) bumpLearningStyle('analogical')
    if (/\bdiagram\b|\bvisuali[sz]e\b|\bpicture\b|\bmap\b|\bchart\b|\bdraw\b/i.test(userText)) bumpLearningStyle('visual')
    if (/step by step|first.{0,10}then|numbered|make a list|in order/i.test(userText)) bumpLearningStyle('structural')
    if (/\bexample\b|\bshow me\b|\bgive me a\b|\binstance\b|\bfor instance\b/i.test(userText)) bumpLearningStyle('exampleFirst')
    if (/^\s*why\b/i.test(userText) || /\bwhy\b.{0,20}(does|is|do|would|should)/i.test(userText)) bumpLearningStyle('conceptual')

    const userMsg = { role: 'user', text: userText }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'model', text: '', streaming: true, lockIn: !!lockInActive }])
    setIsThinking(true)

    const controller = new AbortController()
    abortRef.current = controller

    let rawResponse = ''

    try {
      let systemPrompt
      let criticResult = null

      // Per-mission API options: penalise repetition, cap length
      const MISSION_OPTS = {
        debate:    { temperature: 0.78, maxTokens: 100, frequencyPenalty: 0.70, presencePenalty: 0.55 },
        startup:   { temperature: 0.72, maxTokens: 100, frequencyPenalty: 0.60, presencePenalty: 0.45 },
        space:     { temperature: 0.80, maxTokens: 100, frequencyPenalty: 0.55, presencePenalty: 0.40 },
        detective: { temperature: 0.82, maxTokens: 100, frequencyPenalty: 0.50, presencePenalty: 0.35 },
      }

      if (isMission && activeMission) {
        // Mission mode: use persona system prompt + neural memory
        const memoryStr = Object.keys(worldMemory).length
          ? `\n\nWORLD MEMORY: ${JSON.stringify(worldMemory)}`
          : ''
        systemPrompt = activeMission.systemPrompt + memoryStr + buildMemoryBlock(name)
      } else {
        // Standard tutor mode
        criticResult = await runCritic(messages, userText)
        setCriticism(criticResult)
        updateMastery(criticResult)
        exchangeCountRef.current += 1
        advanceSessionState(exchangeCountRef.current, criticResult)
        systemPrompt = buildAevaPrompt(sessionState, criticResult, name, null, buildMemoryBlock(name))
        if (lockInActive) {
          systemPrompt += '\n\nLOCK-IN MODE: The student is in a deep-work Pomodoro session. Keep every response to 2 sentences maximum — surgical, no elaboration. Move them forward, not sideways.'
        }
      }

      const streamOpts = isMission ? (MISSION_OPTS[activeMode] || {}) : lockInActive ? { maxTokens: 80 } : {}

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
        if (userText.length > 30) rewardPlayer(3)

        // Detect when AI suggests heading to The Lab
        const labMatch = rawResponse.match(/[Hh]ead to [Tt]he [Ll]ab|[Ff]lashcard [Ss]print|[Ll]ab.*drill|go to the [Ll]ab/i)
        const topicMatch = rawResponse.match(/struggling with ([^.!?\n]+)/i)
        if (labMatch && !labOpen) {
          setLabSuggestion({
            topic: topicMatch?.[1]?.trim().slice(0, 40) || activeMission?.title || 'this concept',
            drillType: 'flashcard',
            reason: rawResponse.split('.').find(s => /lab|drill|sprint/i.test(s))?.trim() + '.' || 'Aeva thinks a quick drill would help here.',
          })
        }
      }

      // Neural profile tracking (tutor mode only)
      if (!isMission && criticResult) {
        const responseTime = Date.now() - (sendTimeRef.current || Date.now())
        updateFromExchange({
          userText,
          criticMode: criticResult.mode,
          understanding: criticResult.understanding,
          responseTime,
        })

        // Track topic interest (bumps dominantTopics after 3+ visits)
        bumpTopicInterest(criticResult.topic)

        const understanding = criticResult.understanding
        if (understanding === 'mastery' || understanding === 'solid') {
          addMastered(criticResult.topic)
          touchConceptNode(criticResult.topic, 90)
          computePredictions()
        } else if (understanding === 'none') {
          addStruggle(criticResult.topic)
          touchConceptNode(criticResult.topic, 20)
        } else if (understanding === 'partial') {
          touchConceptNode(criticResult.topic, 55)
        } else {
          touchConceptNode(criticResult.topic, 50)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[Aeva send error]', err)
        const friendly = err.message?.includes('429')
          ? 'Rate limit hit — Groq is busy. Wait a few seconds and try again.'
          : err.message?.includes('401') || err.message?.includes('403')
          ? 'API key issue. Check your Groq key in settings.'
          : err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
          ? 'No internet connection. Check your network and try again.'
          : `Something went wrong (${err.message || 'unknown error'}). Try again.`
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'model', text: friendly, streaming: false }
          return copy
        })
      }
    } finally {
      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
      inputRef.current?.focus()

      // Parse TERM tags from completed response (tutor mode only)
      if (!isMission) {
        const termMatches = [...rawResponse.matchAll(/\[TERM:\s*([^|]+)\|\s*([^\]]+)\]/g)]
        if (termMatches.length > 0) {
          const cards = termMatches.map(m => ({ id: `${Date.now()}-${m[1].trim()}`, term: m[1].trim(), definition: m[2].trim() }))
          setDeepDiveMap(prev => ({ ...prev, [history.length]: cards }))
        }

        // Detect study guide request
        if (userText.toLowerCase().match(/summarize|study guide|summary|notes/)) {
          setStudyGuideOpen(true)
        }
      }
    }
  }

  const send = () => sendWithText()

  const isEmpty = messages.length === 0

  // All modes are dark — mesh shows through
  const backBtnStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.13)',
    color: 'rgba(255,255,255,0.62)',
  }

  const logoColor = 'rgba(255,255,255,0.88)'
  const headingColor = 'rgba(255,255,255,0.50)'
  const titleColor = 'rgba(255,255,255,0.94)'

  const inputBarStyle = isMission
    ? {
        background: 'rgba(255,255,255,0.05)',
        border: activeMission ? `1px solid ${activeMission.border}` : '1px solid rgba(255,255,255,0.12)',
        boxShadow: activeMission ? `0 0 24px ${activeMission.glow}` : 'none',
      }
    : {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(139,143,255,0.22)',
        boxShadow: '0 0 0 1px rgba(139,143,255,0.08), 0 8px 32px rgba(0,0,0,0.40)',
      }

  const inputTextColor = 'rgba(255,255,255,0.88)'
  const placeholderNote = isMission
    ? `Respond to ${activeMission?.title || 'the mission'}…`
    : 'Ask Aeva anything…'

  const sendBtnStyle = isMission && activeMission
    ? { background: `linear-gradient(145deg, ${activeMission.color}80, ${activeMission.color}40)`, border: `1.5px solid ${activeMission.color}60`, boxShadow: `0 4px 14px ${activeMission.glow}` }
    : { background: 'linear-gradient(145deg, rgba(139,143,255,0.90) 0%, rgba(167,139,250,0.70) 100%)', border: '1.5px solid rgba(167,139,250,0.55)', boxShadow: '0 4px 18px rgba(139,143,255,0.35)' }

  const sendIconColor = 'rgba(255,255,255,0.95)'

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

          {/* Countdown timer */}
          {isMission && countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              style={{
                position: 'absolute',
                right: 80,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                borderRadius: 99,
                background: countdown <= 10 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${countdown <= 10 ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <motion.div
                animate={countdown <= 10 ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: countdown <= 10 ? '#EF4444' : activeMission?.color || '#8B8FFF',
                }}
              />
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                fontFamily: 'monospace',
                color: countdown <= 10 ? '#EF4444' : 'rgba(255,255,255,0.55)',
                letterSpacing: '-0.02em',
              }}>
                {countdown}s
              </span>
            </motion.div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* Live adaptation pill (tutor mode) */}
            {!isMission && (() => {
              const DIMS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
              const confidence = Math.min(100, Math.round((learningStyleTotal / 15) * 100))
              const dom = DIMS.reduce((best, d) => (learningStyle[d] > (learningStyle[best] || 0) ? d : best), DIMS[0])
              const STYLE_SHORT = { analogical:'Analogy', visual:'Visual', structural:'Structure', exampleFirst:'Examples', conceptual:'Concepts' }
              const STYLE_COL = { analogical:'#A78BFA', visual:'#60A5FA', structural:'#34D399', exampleFirst:'#FBBF24', conceptual:'#F87171' }
              if (confidence < 30 || !learningStyle[dom]) return null
              const col = STYLE_COL[dom]
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 99,
                  background: `${col}12`, border: `1px solid ${col}30`,
                  fontSize: 10.5, fontWeight: 700, color: col,
                  letterSpacing: '0.04em',
                }}>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 4, height: 4, borderRadius: '50%', background: col }}
                  />
                  {STYLE_SHORT[dom]}
                </div>
              )
            })()}

            {!isMission && (
              <>
                {/* Lock-In toggle */}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={lockInActive ? exitLockIn : startLockIn}
                  animate={lockInActive
                    ? lockInUrgent
                      ? { boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 16px rgba(239,68,68,0.80)', '0 0 0px rgba(239,68,68,0)'] }
                      : { boxShadow: ['0 0 0px rgba(74,222,128,0)', '0 0 10px rgba(74,222,128,0.45)', '0 0 0px rgba(74,222,128,0)'] }
                    : {}}
                  transition={{ boxShadow: { duration: lockInUrgent ? 0.7 : 2, repeat: Infinity } }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: lockInActive ? '6px 14px' : '5px 11px', borderRadius: 99, cursor: 'pointer',
                    background: lockInActive ? (lockInUrgent ? 'rgba(239,68,68,0.18)' : 'rgba(74,222,128,0.14)') : 'rgba(255,255,255,0.07)',
                    border: `1.5px solid ${lockInActive ? (lockInUrgent ? 'rgba(239,68,68,0.55)' : 'rgba(74,222,128,0.45)') : 'rgba(255,255,255,0.14)'}`,
                    color: lockInActive ? (lockInUrgent ? '#F87171' : '#4ADE80') : 'rgba(255,255,255,0.50)',
                    fontSize: lockInActive ? 12 : 11, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'padding 0.2s, font-size 0.2s, background 0.2s',
                  }}
                >
                  <Timer size={lockInActive ? 13 : 11} />
                  {lockInActive ? lockInDisplay : 'Lock-In'}
                </motion.button>

                {/* Library — dimmed during Lock-In */}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setLibraryOpen(true)}
                  animate={{ opacity: lockInActive ? 0.3 : 1 }}
                  style={{
                    padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                    background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.24)',
                    color: 'rgba(167,139,250,0.80)', fontSize: 11, fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5,
                    pointerEvents: lockInActive ? 'none' : 'auto',
                  }}
                >
                  <BookOpen size={11} /> Library
                </motion.button>

                <motion.button
                  onClick={() => setStudyGuideOpen(true)}
                  animate={{ opacity: lockInActive ? 0.3 : 1 }}
                  style={{
                    padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em',
                    pointerEvents: lockInActive ? 'none' : 'auto',
                  }}
                >
                  📋 Study Guide
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setFeynmanOpen(true)}
                  animate={{ opacity: lockInActive ? 0.3 : 1 }}
                  style={{
                    padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                    background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)',
                    color: 'rgba(245,158,11,0.85)', fontSize: 11, fontWeight: 700,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    display: 'flex', alignItems: 'center', gap: 5,
                    pointerEvents: lockInActive ? 'none' : 'auto',
                  }}
                >
                  🎓 Teach It
                </motion.button>
              </>
            )}
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(45,48,142,0.45)' }}>
              <Star size={11} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: logoColor, letterSpacing: '-0.03em' }}>aeva</span>
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
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}
                >
                  <AevaOrb size={218} active={isActive} scanMode={labOpen} personality={orbPersonality} />
                  <div style={{ textAlign: 'center', padding: '0 28px', marginTop: 4 }}>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 400, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3, letterSpacing: '0.01em', marginBottom: 4 }}>
                      Hey {name},
                    </p>
                    <h1 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, color: 'rgba(255,255,255,0.95)', lineHeight: 1.05, letterSpacing: '-0.05em', margin: '0 0 20px' }}>
                      What can I help with?
                    </h1>
                  </div>
                  {/* Suggestion chips — customisable */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '0 24px', maxWidth: 600, width: '100%' }}
                  >
                    {/* Background picker — visible in edit mode */}
                    <AnimatePresence>
                      {chipEditMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                        >
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Chat Background</p>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {CHAT_BG_PRESETS.map(preset => {
                              const isSel = (chatSettings.chatBg || 'default') === preset.id
                              return (
                                <motion.button key={preset.id} whileHover={{ scale: 1.10 }} whileTap={{ scale: 0.93 }}
                                  onClick={() => saveChatSettings({ chatBg: preset.id })}
                                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: preset.color || 'transparent',
                                    border: isSel ? '2px solid rgba(139,143,255,0.85)' : '2px solid rgba(255,255,255,0.10)',
                                    boxShadow: isSel ? '0 0 14px rgba(139,143,255,0.40)' : 'none',
                                    position: 'relative', overflow: 'hidden',
                                    transition: 'border 0.18s, box-shadow 0.18s',
                                    ...(preset.id === 'none' ? {
                                      backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.07) 75%), linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.07) 75%)',
                                      backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px',
                                    } : {}),
                                  }}>
                                    {isSel && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(139,143,255,0.95)' }} /></div>}
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 500, color: isSel ? 'rgba(139,143,255,0.88)' : 'rgba(255,255,255,0.32)', transition: 'color 0.18s' }}>{preset.label}</span>
                                </motion.button>
                              )
                            })}
                          </div>
                          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0 0' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {chipEditMode && (
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Suggestions</p>
                    )}

                    {/* Chips row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                      {(chatSettings.chips || CHIP_DEFAULTS).map((s, i) => (
                        <div key={s.id} className={chipEditMode ? 'chip-wiggle' : ''} style={{ '--wiggle-delay': `${i * 0.06}s`, position: 'relative' }}>
                          <motion.button
                            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25 + i * 0.06, type: 'spring', stiffness: 320 }}
                            whileHover={!chipEditMode ? { scale: 1.05, y: -2 } : {}} whileTap={{ scale: 0.96 }}
                            onClick={() => { if (!chipEditMode) { setInput(s.label); inputRef.current?.focus() } }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 7,
                              padding: '9px 16px', borderRadius: 99,
                              background: 'rgba(255,255,255,0.06)',
                              border: chipEditMode ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(255,255,255,0.10)',
                              color: 'rgba(255,255,255,0.60)',
                              fontSize: 13, fontWeight: 500,
                              fontFamily: "'Inter', system-ui, sans-serif",
                              cursor: chipEditMode ? 'default' : 'pointer',
                              backdropFilter: 'blur(20px)',
                              transition: 'border 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => { if (!chipEditMode) { e.currentTarget.style.borderColor = 'rgba(139,143,255,0.35)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' } }}
                            onMouseLeave={e => { if (!chipEditMode) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)' } }}
                          >
                            <span>{s.icon}</span> {s.label}
                          </motion.button>
                          <AnimatePresence>
                            {chipEditMode && (
                              <motion.button
                                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
                                onClick={() => saveChatSettings({ chips: (chatSettings.chips || CHIP_DEFAULTS).filter(c => c.id !== s.id) })}
                                style={{
                                  position: 'absolute', top: -7, right: -7,
                                  width: 20, height: 20, borderRadius: '50%',
                                  background: '#EF4444', border: '2px solid rgba(5,6,20,0.80)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', padding: 0,
                                }}
                              >
                                <X size={10} color="white" strokeWidth={3} />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}

                      {/* Add chip (edit mode) */}
                      <AnimatePresence>
                        {chipEditMode && !addingChip && (
                          <motion.button
                            key="add-btn"
                            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                            onClick={() => { setAddingChip(true); setTimeout(() => newChipInputRef.current?.focus(), 50) }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '9px 14px', borderRadius: 99,
                              background: 'rgba(139,143,255,0.08)',
                              border: '1.5px dashed rgba(139,143,255,0.30)',
                              color: 'rgba(139,143,255,0.65)',
                              fontSize: 13, fontWeight: 500,
                              fontFamily: "'Inter', system-ui, sans-serif",
                              cursor: 'pointer',
                            }}
                          >
                            <Plus size={13} /> Add
                          </motion.button>
                        )}
                        {chipEditMode && addingChip && (
                          <motion.form
                            key="add-form"
                            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                            onSubmit={e => {
                              e.preventDefault()
                              const label = newChipLabel.trim()
                              if (label) saveChatSettings({ chips: [...(chatSettings.chips || CHIP_DEFAULTS), { id: Date.now().toString(), label, icon: '✨' }] })
                              setNewChipLabel(''); setAddingChip(false)
                            }}
                          >
                            <input
                              ref={newChipInputRef}
                              value={newChipLabel}
                              onChange={e => setNewChipLabel(e.target.value)}
                              onBlur={() => { setAddingChip(false); setNewChipLabel('') }}
                              placeholder="New suggestion…"
                              style={{
                                padding: '9px 14px', borderRadius: 99,
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(139,143,255,0.40)',
                                color: 'rgba(255,255,255,0.88)',
                                fontSize: 13, fontWeight: 500,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                outline: 'none', width: 180,
                              }}
                            />
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Customise / Done toggle */}
                    <motion.button
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                      onClick={() => { setChipEditMode(m => !m); setAddingChip(false); setNewChipLabel('') }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 13px', borderRadius: 99,
                        background: chipEditMode ? 'rgba(139,143,255,0.12)' : 'rgba(255,255,255,0.04)',
                        border: chipEditMode ? '1px solid rgba(139,143,255,0.28)' : '1px solid rgba(255,255,255,0.07)',
                        color: chipEditMode ? 'rgba(139,143,255,0.82)' : 'rgba(255,255,255,0.22)',
                        fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {chipEditMode ? '✓ Done' : <><PenLine size={10} style={{ marginRight: 1 }} /> Customise</>}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mini orb + mastery (tutor mode active) */}
            {!isEmpty && !isMission && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0, gap: 8 }}>
                <AevaOrb size={72} active={isThinking} scanMode={labOpen} personality={orbPersonality} />
                {Object.keys(masteryMap).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px' }}>
                    {Object.entries(masteryMap).slice(0, 4).map(([topic, score]) => {
                      const col = score >= 75 ? '#4ADE80' : score >= 40 ? '#FBBF24' : '#F87171'
                      return (
                        <div key={topic} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 11px', borderRadius: 99,
                          background: `${col}12`, border: `1px solid ${col}30`,
                          fontSize: 11, color: col, fontWeight: 600,
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: col }} />
                          {topic} {score}%
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Mission thinking orb — red pulse on interrupt, blue in scan mode */}
            {isMission && isThinking && (
              <div className={interruptActive ? 'orb-interrupt' : ''} style={{ display: 'flex', justifyContent: 'center', paddingTop: 6, flexShrink: 0 }}>
                <AevaOrb size={48} active={!labOpen} scanMode={labOpen} />
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
                    : <ChatBubble key={i} msg={msg} deepDiveCards={deepDiveMap[i] || []} onDismissCard={(cardId) => setDeepDiveMap(prev => ({ ...prev, [i]: (prev[i] || []).filter(c => c.id !== cardId) }))} />
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Prediction banner */}
            <AnimatePresence>
              {!isMission && strugglePredictions.length > 0 && (
                <motion.div
                  key={strugglePredictions[0].id}
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 4, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ flexShrink: 0, padding: '0 20px', paddingBottom: 8, overflow: 'hidden' }}
                >
                  <div style={{
                    width: '100%',
                    maxWidth: 640,
                    margin: '0 auto',
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.30)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>
                    {/* Shimmer */}
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.12) 50%, transparent 100%)',
                        pointerEvents: 'none',
                      }}
                    />
                    <span style={{ fontSize: 14, flexShrink: 0 }}>🔮</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.4, flex: 1 }}>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Heads up</span> — based on {strugglePredictions[0].reason},{' '}
                      <span style={{ color: 'rgba(167,139,250,0.90)', fontWeight: 600 }}>{strugglePredictions[0].concept}</span> is coming.
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setLabSuggestion({
                          topic: strugglePredictions[0].concept,
                          drillType: 'flashcard',
                          reason: `Aeva predicts ${strugglePredictions[0].concept} is next based on your mastery of ${strugglePredictions[0].reason}.`,
                        })
                        openLab()
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 99,
                        background: 'rgba(139,92,246,0.25)',
                        border: '1px solid rgba(139,92,246,0.45)',
                        color: 'rgba(255,255,255,0.90)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      Prep Now
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => dismissPrediction(strugglePredictions[0].id)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <X size={12} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick-action buttons (mission mode) */}
            <AnimatePresence>
              {isMission && quickActions.length > 0 && !isThinking && (
                <motion.div
                  key={quickActions.join(',')}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    flexShrink: 0,
                    padding: '0 16px 8px',
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {quickActions.map((action, i) => (
                    <motion.button
                      key={action}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 26 }}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        clearQuickActions()
                        sendWithText(action)
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 99,
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: activeMission ? activeMission.colorDim : 'rgba(255,255,255,0.08)',
                        border: activeMission ? `1px solid ${activeMission.border}` : '1px solid rgba(255,255,255,0.15)',
                        color: activeMission ? activeMission.color : 'rgba(255,255,255,0.75)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {action}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div style={{ flexShrink: 0, padding: '0 20px', paddingBottom: 36 }}>
              {/* Hidden file input for Aeva Lens */}
              <input
                ref={lensInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setLensFile(f)
                  e.target.value = ''
                }}
              />
              <div style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 16px', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 999, transition: 'border 0.3s, box-shadow 0.3s', ...inputBarStyle }}>
                {/* Lens camera button + Custom Drill button */}
                {!isMission && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.90 }}
                      onClick={() => lensInputRef.current?.click()}
                      title="Aeva Lens — analyse an image"
                      style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,200,255,0.10)', border: '1.5px solid rgba(0,200,255,0.28)', cursor: 'pointer', color: 'rgba(0,200,255,0.70)' }}
                    >
                      <Camera size={14} strokeWidth={2} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.90 }}
                      onClick={() => setDrillOpen(true)}
                      title="Custom Drill — paste notes to build a HUD"
                      style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.10)', border: '1.5px solid rgba(167,139,250,0.28)', cursor: 'pointer', color: 'rgba(167,139,250,0.75)' }}
                    >
                      <PenLine size={14} strokeWidth={2} />
                    </motion.button>
                  </>
                )}
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

      {/* Aeva Lens Modal */}
      <AnimatePresence>
        {lensFile && (
          <AevaLens
            file={lensFile}
            onClose={() => setLensFile(null)}
            onInsightReady={insight => setVisualInsights(prev => [...prev, insight])}
          />
        )}
      </AnimatePresence>

      {/* Study Guide Modal */}
      <AnimatePresence>
        {studyGuideOpen && (
          <StudyGuideModal
            messages={messages}
            visualInsights={visualInsights}
            onClose={() => setStudyGuideOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Custom Drill Modal */}
      <AnimatePresence>
        {drillOpen && <CustomDrill onClose={() => setDrillOpen(false)} />}
      </AnimatePresence>

      {/* Feynman Mode */}
      <AnimatePresence>
        {feynmanOpen && <FeynmanMode onClose={() => setFeynmanOpen(false)} />}
      </AnimatePresence>

      {/* Library Modal */}
      <AnimatePresence>
        {libraryOpen && (
          <AevaLibrary
            onClose={() => setLibraryOpen(false)}
            onReopenLens={() => setLibraryOpen(false)}
            onReopenDrill={() => setLibraryOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Lock-In ambient overlay */}
      <AnimatePresence>
        {lockInActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
          >
            {/* Screen tint */}
            <div style={{
              position: 'absolute', inset: 0,
              background: lockInUrgent
                ? 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.08) 0%, transparent 65%)'
                : 'radial-gradient(ellipse at 50% 100%, rgba(74,222,128,0.07) 0%, transparent 65%)',
            }} />
            {/* Border frame */}
            <div style={{
              position: 'absolute', inset: 0,
              border: lockInUrgent ? '2px solid rgba(239,68,68,0.45)' : '2px solid rgba(74,222,128,0.30)',
              borderRadius: 0,
              pointerEvents: 'none',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock-In floating timer bar (above input) */}
      <AnimatePresence>
        {lockInActive && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            style={{
              position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 18px', borderRadius: 99,
              background: lockInUrgent ? 'rgba(239,68,68,0.14)' : 'rgba(74,222,128,0.10)',
              border: `1px solid ${lockInUrgent ? 'rgba(239,68,68,0.40)' : 'rgba(74,222,128,0.30)'}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: lockInUrgent ? '0 4px 24px rgba(239,68,68,0.20)' : '0 4px 24px rgba(74,222,128,0.12)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Progress bar */}
            <div style={{ width: 80, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <motion.div
                style={{
                  height: '100%', borderRadius: 99,
                  background: lockInUrgent ? '#F87171' : '#4ADE80',
                  width: `${(lockInSecondsLeft / (25 * 60)) * 100}%`,
                  transition: 'width 1s linear, background 0.3s',
                }}
              />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: lockInUrgent ? '#F87171' : '#4ADE80', letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {lockInDisplay}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: lockInUrgent ? 'rgba(248,113,113,0.70)' : 'rgba(74,222,128,0.60)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {lockInUrgent ? 'Almost done' : 'Focus'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock-In Focus Summary */}
      <AnimatePresence>
        {lockInSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(4,6,20,0.90)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={() => setLockInSummary(null)}>
            <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 380, borderRadius: 28, padding: '32px 28px', background: 'rgba(12,14,32,0.98)', border: '1px solid rgba(74,222,128,0.28)', boxShadow: '0 32px 80px rgba(0,0,0,0.70)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ fontSize: 36 }}>🎯</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>Focus Session Complete</div>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                {[
                  { label: 'Focus Efficiency', value: `${lockInSummary.focusScore}%`, color: '#4ADE80' },
                  { label: 'Exchanges', value: lockInSummary.exchanges, color: '#60A5FA' },
                  { label: 'Duration', value: `${Math.round(lockInSummary.duration / 60)}m`, color: '#A78BFA' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, padding: '14px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setLockInSummary(null)}
                style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)', color: '#4ADE80', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Back to Learning
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      {/* Global chaos banner */}
      <ChaosEventBanner />
      <ProTipBanner />
      <AnimatePresence mode="wait" initial={false}>
        {view === 'dashboard'
          ? <DashboardView key="dashboard" onChatOpen={() => setView('chat')} onSignOut={() => supabase.auth.signOut()} />
          : activeMode === 'arena'
            ? <DebateArena key="arena" onBack={handleBack} />
            : <ChatView key="chat" onBack={handleBack} />
        }
      </AnimatePresence>
    </UserContext.Provider>
  )
}
