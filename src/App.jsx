import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ArrowUp, Zap, TrendingDown, Star, MessageCircle, ChevronLeft, StopCircle, LogOut, Gamepad2, FlaskConical, Share2, X, Brain, Layers, Camera, BookOpen, PenLine, Timer, Plus, Settings, Menu, Volume2, VolumeX, Mic } from 'lucide-react'
import { useAppSettings, SECTION_BG_PRESETS, CARD_STYLES, FONT_STYLES } from './appSettings'
import { useLanguageStore } from './languageStore'
import { useT } from './translations'
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
import LandingPage from './LandingPage'
import Onboarding from './Onboarding'
import AevaOrbComponent from './AevaOrb'
import AdminLogin from './AdminLogin'
import AdminPanel from './AdminPanel'
import SecondBrain from './SecondBrain'
import { useBrainStore } from './brainStore'
import Mirror from './Mirror'
import OrbSelector from './OrbSelector'
import VoiceMode from './VoiceMode'
import { useXPStore, ORBS, levelFromXP, xpIntoLevel } from './xpStore'
import { useVoiceStore } from './voiceStore'
import './index.css'

/* ─── Groq API ─── */
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ─── Voice TTS helpers ─── */
function stripForTTS(text) {
  return text
    .replace(/\[TERM:[^\]]+\]/g, '')
    .replace(/\[CORRECT:[^\]]+\]/g, '')
    .replace(/\[PARTIAL:[^\]]+\]/g, '')
    .replace(/\[INCORRECT:[^\]]+\]/g, '')
    .replace(/━+[-─━]*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`\n]*`{1,3}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Voice characteristics per orb — rate/pitch/gender shape the personality
const ORB_VOICE_PROPS = {
  balanced:   { rate: 1.00, pitch: 1.05, female: true  },
  challenger: { rate: 1.15, pitch: 0.88, female: false },
  scholar:    { rate: 0.92, pitch: 0.98, female: false },
  mystic:     { rate: 0.82, pitch: 1.12, female: true  },
  void:       { rate: 0.88, pitch: 0.80, female: false },
  ember:      { rate: 1.22, pitch: 1.18, female: false },
  aurora:     { rate: 1.05, pitch: 1.10, female: true  },
  phantom:    { rate: 0.78, pitch: 0.92, female: false },
}

function triggerAevaVoice(rawText, orbId) {
  const { voiceEnabled, voiceModeActive, setIsSpeaking, setCurrentAudio } = useVoiceStore.getState()
  if (!voiceEnabled && !voiceModeActive) return
  if (!rawText || !window.speechSynthesis) return

  // Cancel any currently playing speech
  window.speechSynthesis.cancel()
  setIsSpeaking(false)
  setCurrentAudio(null)

  let text = stripForTTS(rawText)
  if (!text || text.length < 4) return

  // Cap at a natural sentence boundary around 1200 chars
  if (text.length > 1200) {
    const cutoff = text.lastIndexOf('. ', 1200)
    text = text.slice(0, cutoff > 300 ? cutoff + 1 : 1200)
  }

  const props = ORB_VOICE_PROPS[orbId] || ORB_VOICE_PROPS.balanced
  const lang = useLanguageStore.getState().language

  const utter = new SpeechSynthesisUtterance(text)
  utter.rate   = props.rate
  utter.pitch  = props.pitch
  utter.volume = 1.0
  utter.lang   = lang === 'ja' ? 'ja-JP' : 'en-US'

  // Pick the best available voice for this orb's gender
  const allVoices = window.speechSynthesis.getVoices()
  if (allVoices.length > 0) {
    const targetLang = lang === 'ja' ? 'ja' : 'en'
    const langPool = allVoices.filter(v => v.lang.startsWith(targetLang))
    const local    = langPool.filter(v => v.localService)
    const pool     = local.length > 0 ? local : langPool

    if (pool.length > 0) {
      if (props.female) {
        const f = pool.find(v => /female|samantha|siri|victoria|karen|tessa|fiona|moira|zoe/i.test(v.name))
        utter.voice = f || pool[0]
      } else {
        const m = pool.find(v => /male|alex|daniel|james|aaron|fred|rishi|bruce|lee/i.test(v.name))
        utter.voice = m || pool[pool.length - 1]
      }
    }
  }

  utter.onstart = () => {
    setIsSpeaking(true)
    // Wrap speechSynthesis cancel so stopSpeaking() works
    setCurrentAudio({ pause: () => window.speechSynthesis.cancel(), src: '' })
  }
  utter.onend = () => {
    setIsSpeaking(false)
    setCurrentAudio(null)
  }
  utter.onerror = () => {
    setIsSpeaking(false)
    setCurrentAudio(null)
  }

  // Chrome bug: synthesis silently stops after ~15s unless kept alive
  // Fix: cancel + re-queue if it stalls
  window.speechSynthesis.speak(utter)
}

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
  { id: 'white',   label: 'White',   color: '#f5f5f7',    gradient: `linear-gradient(172deg, rgba(245,245,247,0.97) 0%, rgba(255,255,255,0.96) 50%, rgba(245,245,247,0.97) 100%)` },
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

/* ─── Mobile detection hook ─── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
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
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a strict pedagogical critic. Analyse the student's last message and return ONLY valid JSON — no markdown, no explanation.

Required format:
{"understanding":"none"|"partial"|"solid"|"mastery","lazy_thinking":true|false,"mode":"hype"|"coach"|"challenge"|"redirect","topic":"<1-3 word academic noun>","confidence":"confused"|"uncertain"|"confident"|"overconfident","note":"<one precise sentence: what exactly is right or wrong, and what to target next>"}

Rules:
- "topic" must be a real academic concept (e.g. "photosynthesis", "quadratic equations", "supply and demand"). NEVER use social words like "greeting", "thanks", "yes", "ok".
- "understanding": none=wrong/no attempt, partial=right idea but gaps, solid=correct with reasoning, mastery=correct+can extend/apply
- "lazy_thinking": true if the answer is a guess, vague, or copied without reasoning
- "mode": hype=solid or mastery WITH genuine reasoning shown. challenge=vague/lazy/no reasoning. redirect=confused or completely off-topic. coach=everything else.
- "note": be surgical — name the exact gap or strength, not a generic comment`,
          },
          ...context,
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 220,
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
function buildAevaPrompt(sessionState, criticism, userName, profile, memoryBlock = '', extras = {}, langDirective = '') {
  const state = STATE_CONFIG[sessionState] || STATE_CONFIG.DIAGNOSTIC
  const mode = MODE_CONFIG[criticism?.mode] || MODE_CONFIG.coach
  const { trend, conceptScaffold, difficultyDirective } = extras

  const trendBlock = trend ? `\n\n${trend}` : ''
  const scaffoldBlock = conceptScaffold ? `\n\n${conceptScaffold}` : ''
  const diffBlock = difficultyDirective ? `\n\n${difficultyDirective}` : ''

  return `${memoryBlock}${trendBlock}${scaffoldBlock}${diffBlock}

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

MATH NOTATION:
- Use LaTeX ONLY for real mathematical expressions — not for single plain letters in prose
- Inline math $...$: for expressions with operators, powers, roots, subscripts, fractions (e.g. $x^2 + 2x$, $\\sqrt{b^2-4ac}$)
- Display math $$...$$: for standalone full equations (e.g. $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$)
- DO NOT wrap bare single letters in LaTeX just because they're variables — write "let x be..." not "let $x$ be..."
- DO use LaTeX when the expression has actual notation: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\theta$, $\\pm$
- NEVER write fractions as a/b in math — use $\\frac{a}{b}$
- Greek letters in equations: $\\alpha$, $\\beta$, $\\theta$, $\\pi$

FEEDBACK TAGS — use these when ${userName} attempts an answer or exercise:
- If correct: start your response with \`[CORRECT: one sentence confirming what they got right]\`
- If partially correct: start with \`[PARTIAL: what was right and what was wrong]\`
- If incorrect: start with \`[INCORRECT: what was wrong and the key misunderstanding]\`
- Then continue with your explanation. These tags render as visual banners so the student immediately knows where they stand.
- ALWAYS use a feedback tag when the student has attempted an answer. Never leave them guessing.

DIFFICULTY ADAPTATION:
- When ${userName} switches to a NEW topic, immediately recalibrate — start at a simpler level and build up. Do not assume they know anything about the new topic just because they mastered the previous one.
- When they answer 3 questions correctly in a row, explicitly say "You've got this. Let me push you harder." and raise the difficulty immediately.
- When they struggle 2+ times on the same concept, stop advancing and say "Let me explain this differently." Rebuild from scratch with a different analogy.
- Match your complexity to their demonstrated understanding — not their assumed level.

SMART TAGS — always include these inline (the UI parses them silently):
- When introducing a new technical term: \`[TERM: word | one-sentence definition]\`
- Only 1–3 terms per response max. Don't tag common words.

THE 80/20 RULE:
- 20% theory. 80% real-world application.
- Never write a 500-word essay. Give a 30-word insight + one beautiful visual + one sharp question.
- Simple question → simple answer. Depth only when warranted.

CONTRADICTION WATCH: Scan the full conversation history above. If ${userName}'s current message contradicts something they said in an earlier message, call it out directly before answering — "Hold on — earlier you said [X], but now you're saying [Y]. Which is it?" Make them resolve the contradiction before you continue.

SESSION PHASE: ${sessionState} — ${state.instruction}

━━━ CRITIC SIGNAL — ACT ON THIS NOW ━━━
Understanding: ${criticism?.understanding || 'unknown'} | Topic: ${criticism?.topic || 'general'} | Confidence: ${criticism?.confidence || 'uncertain'}
Mode: ${(criticism?.mode || 'coach').toUpperCase()} — ${mode.instruction}
Note: ${criticism?.note || ''}

YOUR RESPONSE MUST REFLECT THIS SIGNAL. Do not ignore it. If mode is REDIRECT, use an analogy. If CHALLENGE, surface the gap. If HYPE, raise the bar immediately. If COACH, ask one precise Socratic question.${langDirective}`
}

/* ─── Trend / scaffold / difficulty helpers ─── */
function computeTrend(recentCritic) {
  if (!recentCritic || recentCritic.length < 3) return null
  const last3 = recentCritic.slice(-3).map(c => c.understanding)
  if (last3.every(u => u === 'mastery' || u === 'solid'))
    return '⚡ LIVE SIGNAL — MOMENTUM: Student has shown strong understanding 3 exchanges in a row. Increase difficulty NOW. Push to harder applications, edge cases, and deeper nuance. Do not stay at the current level — explicitly acknowledge their progress and raise the bar.'
  if (last3.every(u => u === 'none' || u === 'partial'))
    return '🔴 LIVE SIGNAL — STRUGGLING: Student has shown low understanding 3 exchanges in a row. STOP advancing. Drop back to absolute first principles. Use simpler language. Confirm understanding of each micro-step before moving on. Ask "does this make sense?" explicitly.'
  return null
}

function buildConceptScaffold(sessionConcepts) {
  const entries = Object.entries(sessionConcepts)
  if (entries.length < 2) return null
  const mastered = entries.filter(([,u]) => u === 'mastery' || u === 'solid').map(([c]) => c)
  const partial  = entries.filter(([,u]) => u === 'partial').map(([c]) => c)
  const none     = entries.filter(([,u]) => u === 'none').map(([c]) => c)
  let s = 'SESSION SCAFFOLD — concepts built this session (connect new ideas to these explicitly):\n'
  if (mastered.length) s += `✓ Understands: ${mastered.join(', ')}\n`
  if (partial.length)  s += `⟳ In progress: ${partial.join(', ')}\n`
  if (none.length)     s += `✗ Struggling: ${none.join(', ')}\n`
  s += 'When introducing a new concept, explicitly connect it to what is already understood.'
  return s
}

function buildDifficultyDirective(neural) {
  if (!neural || neural.totalExchanges < 4) return null
  const { frustrationScore, avgResponseLength, totalExchanges, depth } = neural
  if (avgResponseLength < 22 && totalExchanges > 5)
    return '📉 DIFFICULTY SIGNAL — OVERLOADED: Very short replies detected across multiple exchanges. The student is overwhelmed. Simplify immediately — one micro-concept at a time, shorter sentences, explicit check-ins before advancing.'
  if (frustrationScore > 70)
    return '⚠ DIFFICULTY SIGNAL — FRUSTRATED: High frustration detected. Be concise and direct. Give a quick win. No lengthy theory — go straight to an example that clicks.'
  if (avgResponseLength > 120 && (depth || 50) > 65)
    return '🚀 DIFFICULTY SIGNAL — DEEPLY ENGAGED: Long, thoughtful replies and high depth score. Skip the basics. Go deeper — add nuance, challenge their assumptions, discuss edge cases and implications.'
  return null
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
    max_tokens:        opts.maxTokens         ?? 450,
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

/* ═══ APP SETTINGS PANEL ══════════════════════════ */
function BgSwatchRow({ presets, selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {presets.map(preset => {
        const isSel = (selected || 'default') === preset.id
        return (
          <motion.button key={preset.id} whileHover={{ scale: 1.10 }} whileTap={{ scale: 0.93 }}
            onClick={() => onChange(preset.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
  )
}

function SettingsSection({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>{label}</p>
      {children}
    </div>
  )
}

function AppSettingsPanel({ onClose }) {
  const T = useT()
  const { language, setLanguage } = useLanguageStore()
  const { dashboardBg, cardStyle, fontStyle, update } = useAppSettings()
  const [chatSettings, saveChatSettings] = useChatSettings()

  return (
    <motion.div
      key="app-settings"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{ width: '100%', maxWidth: 540, borderRadius: 28, background: 'rgba(8,10,26,0.99)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 40px 120px rgba(0,0,0,0.80)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={14} color="rgba(139,143,255,0.80)" />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>{T.appearance}</span>
          </div>
          <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px', display: 'flex', flexDirection: 'column', gap: 26 }}>

          {/* Language toggle */}
          <SettingsSection label={T.language}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ code: 'en', label: '🇬🇧 English' }, { code: 'ja', label: '🇯🇵 日本語' }].map(({ code, label }) => {
                const isSel = language === code
                return (
                  <motion.button key={code} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setLanguage(code)}
                    style={{
                      flex: 1, padding: '11px 10px', borderRadius: 14,
                      background: isSel ? 'rgba(139,143,255,0.16)' : 'rgba(255,255,255,0.04)',
                      border: isSel ? '1.5px solid rgba(139,143,255,0.50)' : '1px solid rgba(255,255,255,0.10)',
                      color: isSel ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      transition: 'all 0.18s',
                    }}>
                    {label}
                  </motion.button>
                )
              })}
            </div>
          </SettingsSection>

          <SettingsSection label={T.dashboardBackground}>
            <BgSwatchRow presets={SECTION_BG_PRESETS} selected={dashboardBg} onChange={v => update({ dashboardBg: v })} />
          </SettingsSection>

          <SettingsSection label={T.chatBackground}>
            <BgSwatchRow presets={CHAT_BG_PRESETS} selected={chatSettings.chatBg || 'default'} onChange={v => saveChatSettings({ chatBg: v })} />
          </SettingsSection>

          <SettingsSection label={T.cardStyle}>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(CARD_STYLES).map(([id, cs]) => {
                const isSel = (cardStyle || 'normal') === id
                return (
                  <motion.button key={id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => update({ cardStyle: id })}
                    style={{ flex: 1, padding: '12px 10px', borderRadius: 14, background: isSel ? 'rgba(139,143,255,0.12)' : 'rgba(255,255,255,0.04)', border: isSel ? '1.5px solid rgba(139,143,255,0.40)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s' }}>
                    <div style={{ width: '100%', height: 26, borderRadius: 8, marginBottom: 8, background: cs.bg, backdropFilter: cs.blur, WebkitBackdropFilter: cs.blur, border: '1px solid rgba(255,255,255,0.12)' }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: isSel ? 'rgba(139,143,255,0.90)' : 'rgba(255,255,255,0.55)' }}>{cs.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{cs.description}</div>
                  </motion.button>
                )
              })}
            </div>
          </SettingsSection>

          <SettingsSection label={T.fontStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(FONT_STYLES).map(([id, font]) => {
                const isSel = (fontStyle || 'inter') === id
                return (
                  <motion.button key={id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => update({ fontStyle: id })}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 12, background: isSel ? 'rgba(139,143,255,0.10)' : 'rgba(255,255,255,0.03)', border: isSel ? '1.5px solid rgba(139,143,255,0.35)' : '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'all 0.18s' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isSel ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.60)', fontFamily: font.family }}>{font.label}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{font.description}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isSel ? 'rgba(139,143,255,0.80)' : 'rgba(255,255,255,0.38)', fontFamily: font.family }}>Aa</div>
                  </motion.button>
                )
              })}
            </div>
          </SettingsSection>

        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══ GLASS CARD ══════════════════════════════════ */
function GlassCard({ children, className = '', style = {}, onClick }) {
  const [hovered, setHovered] = useState(false)
  const { cardStyle } = useAppSettings()
  const cs = CARD_STYLES[cardStyle || 'normal']
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
        background: cs.bg,
        backdropFilter: cs.blur,
        WebkitBackdropFilter: cs.blur,
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

const DEFAULT_ORB_GRADIENT = 'linear-gradient(122deg,#040622 0%,#090b38 7%,#141870 16%,#2D308E 27%,#4545aa 38%,#6a6ac0 48%,#9898d2 56%,#c0c6e8 63%,#dde2f6 68%,#eeeaf4 72%,#f4ede0 76%,#f0d4a0 80%,#E9A364 84%,#d08038 88%,#964e20 93%,#501808 97%,#1a0806 100%)'

function AevaOrb({ size = 218, active = false, scanMode = false, personality = 'balanced', orbGradient, orbAccent }) {
  const s = size / 218
  const shellW = Math.round(218 * s * 0.88)
  const shellH = Math.round(205 * s * 0.88)
  const pulse = ORB_PULSES[personality] || ORB_PULSES.balanced
  const gradient = orbGradient || DEFAULT_ORB_GRADIENT
  // Use provided accent or fall back to warm gold for the default balanced orb
  const [ar, ag, ab] = orbAccent || [233, 163, 100]

  return (
    <div style={{
      position: 'relative',
      width: Math.round(260 * s), height: Math.round(250 * s),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: 'saturate(1.55) contrast(1.10)', flexShrink: 0,
    }}>
      {/* Outer aura — now uses orb accent colour */}
      <motion.div
        animate={{ scale: scanMode ? [1, 1.03, 1] : active ? [1, 1.18, 1] : pulse.scale }}
        transition={{ duration: scanMode ? 3.5 : active ? 1.2 : pulse.dur, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: Math.round(-20 * s), borderRadius: '50%',
          background: `radial-gradient(ellipse at 44% 52%, rgba(${ar},${ag},${ab},0.32) 0%, rgba(${ar},${ag},${ab},0.10) 52%, transparent 76%)`,
          filter: `blur(${Math.round(42 * s)}px)`,
          transition: 'background 1.2s ease',
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
            : `inset 0 0 30px rgba(${ar},${ag},${ab},0.28), inset 0 2px 10px rgba(255,255,255,0.40), 0 0 ${Math.round(28*s)}px rgba(${ar},${ag},${ab},0.35)`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          transition: 'box-shadow 1.2s ease',
        }}
      >
        {/* Base gradient */}
        <div style={{ position: 'absolute', inset: 0, background: scanMode
          ? 'linear-gradient(122deg,#020a1a 0%,#051430 8%,#0a2456 16%,#1240a0 26%,#1D4ED8 36%,#2563EB 46%,#3B82F6 54%,#60A5FA 62%,#93C5FD 68%,#BAE6FD 72%,#E0F2FE 76%,#BAE6FD 80%,#60A5FA 84%,#2563EB 88%,#1a3a8a 93%,#0d1f50 97%,#020a1a 100%)'
          : gradient,
          transition: 'background 1.4s ease',
        }} />
        {/* Depth vignettes */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 50% 50%, transparent 46%, rgba(0,0,0,0.30) 62%, rgba(0,0,0,0.58) 76%, rgba(0,0,0,0.80) 90%, rgba(0,0,0,0.92) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 72% 28%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 30%, transparent 62%)', pointerEvents: 'none' }} />
        {/* Primary inner light — accent coloured */}
        <motion.div
          animate={{ x: [0, -15, 9, -5, 0], y: [0, 11, -14, 6, 0], scale: [1, 1.15, 0.92, 1.07, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: '75%', height: '70%', top: '16%', left: '-6%',
            borderRadius: '60% 40% 46% 54% / 58% 62% 38% 42%',
            background: `radial-gradient(ellipse at 46% 52%, rgba(255,255,255,0.95) 0%, rgba(${ar},${ag},${ab},0.90) 20%, rgba(${ar},${ag},${ab},0.60) 44%, rgba(${ar},${ag},${ab},0.18) 70%, transparent 100%)`,
            filter: `blur(${Math.round(14 * s)}px)`, mixBlendMode: 'screen',
            transition: 'background 1.2s ease',
          }}
        />
        {/* Secondary inner light — brighter core */}
        <motion.div
          animate={{ x: [0, -8, 5, 0], y: [0, 8, -10, 0], opacity: [0.95, 1, 0.88, 0.95] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          style={{
            position: 'absolute', width: '36%', height: '34%', top: '30%', left: '8%',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(${ar},${ag},${ab},0.88) 32%, rgba(${ar},${ag},${ab},0.40) 66%, transparent 100%)`,
            filter: `blur(${Math.round(7 * s)}px)`, mixBlendMode: 'screen',
            transition: 'background 1.2s ease',
          }}
        />
        {/* Rotating shimmer */}
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.14) 0%, transparent 55%)', mixBlendMode: 'overlay', borderRadius: 'inherit' }} />
        <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 70% 65%, rgba(${ar},${ag},${ab},0.10) 0%, transparent 50%)`,
            mixBlendMode: 'overlay', borderRadius: 'inherit',
            transition: 'background 1.2s ease',
          }} />
        {/* Specular highlight */}
        <div style={{ position: 'absolute', width: '38%', height: '28%', top: '4%', right: '2%', borderRadius: '50%', background: 'radial-gradient(ellipse at 44% 34%, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.18) 48%, transparent 76%)', filter: `blur(${Math.round(10 * s)}px)` }} />
        <div style={{ position: 'absolute', width: '8%', height: '6%', top: '8%', right: '18%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(255,255,255,0.50) 55%, transparent 80%)', filter: `blur(${Math.round(2 * s)}px)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: 'inset 0 0 65px rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
      </motion.div>
    </div>
  )
}

/* ═══ USER AVATAR ═════════════════════════════════ */
function UserAvatar({ onSignOut }) {
  const T = useT()
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
              {T.signOut}
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

function getMissionQuote(T, { dominantTopics, masteredTopics, currentVibe, totalExchanges }) {
  const topic = dominantTopics?.[0] || masteredTopics?.[0]
  if (!totalExchanges || totalExchanges < 3) return T.missionQuoteNew
  return T.missionQuote(currentVibe, topic)
}

function getMissionHeading(T, { masteredTopics, totalExchanges }) {
  const lines = (!totalExchanges || totalExchanges < 3) ? T.firstMissionAwaits
    : (masteredTopics?.length || 0) >= 3 ? T.keepBuilding
    : T.readyToStart
  return <>{lines[0]}<br />{lines[1]}</>
}

function MissionCard({ onChatOpen, onOrbClick }) {
  const T = useT()
  const { name } = useUser()
  const { orbPersonality, dominantTopics, masteredTopics, currentVibe, totalExchanges } = useNeuralStore()
  const { activeOrb: activeOrbId, streak, xp } = useXPStore()
  const activeOrbDef = ORBS.find(o => o.id === activeOrbId) || ORBS[0]
  const currentLevel = levelFromXP(xp)
  const xpProgress = xpIntoLevel(xp)
  const missionQuote = getMissionQuote(T, { dominantTopics, masteredTopics, currentVibe, totalExchanges })
  const missionHeading = getMissionHeading(T, { masteredTopics, totalExchanges })

  return (
    <GlassCard className="mission-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>{T.missionBriefing}</span>
          {/* Streak + Level */}
          <div style={{ display: 'flex', gap: 8 }}>
            {streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 10, padding: '4px 9px' }}>
                <span style={{ fontSize: 12 }}>🔥</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FCD34D' }}>{streak}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)', borderRadius: 10, padding: '4px 9px' }}>
              <Zap size={10} color="#8B8FFF" fill="#8B8FFF" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#A5B4FC' }}>Lv {currentLevel}</span>
            </div>
          </div>
          {/* XP bar */}
          <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B8FFF)', borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>
        {/* Clickable orb */}
        <motion.button onClick={onOrbClick} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          title="Change Aeva's orb">
          <AevaOrb size={96} personality={orbPersonality} orbGradient={activeOrbDef.gradient} orbAccent={activeOrbDef.accent} />
        </motion.button>
      </div>
      <div style={{ marginTop: 8 }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 400, lineHeight: 1.20, marginBottom: 12,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(233,163,100,0.85) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {missionHeading}
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, maxWidth: '88%', color: 'rgba(255,255,255,0.42)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Aeva: <em>"{missionQuote}"</em>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onChatOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 99, background: 'rgba(139,143,255,0.20)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,143,255,0.35)', color: 'rgba(255,255,255,0.92)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, fontWeight: 600, letterSpacing: '0.02em', cursor: 'pointer' }}>
          <Zap size={13} />
          {T.startMission}
        </motion.button>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onChatOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.38)', color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
          <MessageCircle size={13} />
          {T.chatWithAeva}
        </motion.button>
      </div>
    </GlassCard>
  )
}

function conceptNodeColor(mastery) {
  if (mastery >= 75) return '#4ADE80'
  if (mastery >= 45) return '#FBBF24'
  if (mastery >= 20) return '#F97316'
  return '#F87171'
}

function ConstellationCard() {
  const T = useT()
  const { conceptMap } = useNeuralStore()

  const concepts = [...conceptMap]
    .filter(c => c.mastery > 0)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 8)

  const hasData = concepts.length > 0
  const cx = 50, cy = 50

  // Build real nodes + edges from concept data
  let nodes = []
  let edges = []
  if (hasData) {
    // Center = highest mastery concept
    nodes.push({ x: cx, y: cy, r: 4.5, color: conceptNodeColor(concepts[0].mastery), label: concepts[0].label })
    if (concepts.length > 1) {
      const ring = concepts.slice(1)
      const ringR = 30
      ring.forEach((c, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i / ring.length)
        nodes.push({
          x: cx + ringR * Math.cos(angle),
          y: cy + ringR * Math.sin(angle),
          r: 2 + (c.mastery / 100) * 2.5,
          color: conceptNodeColor(c.mastery),
          label: c.label,
        })
        edges.push([0, i + 1])
      })
      // Connect adjacent ring nodes
      for (let i = 1; i < nodes.length - 1; i++) edges.push([i, i + 1])
      if (nodes.length > 2) edges.push([nodes.length - 1, 1])
    }
  } else {
    // Decorative fallback
    nodes = NODES.map(n => ({ ...n, label: null }))
    edges = EDGES.map(e => [...e])
  }

  return (
    <GlassCard style={{ padding: '22px 20px', minHeight: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>{T.knowledgeMap}</span>
        {hasData && (
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)' }}>
            {concepts.length} concept{concepts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <svg viewBox="0 0 100 100" style={{ width: '100%', marginTop: hasData ? 4 : 12 }}>
        {edges.map(([a, b], i) => (
          <motion.line key={i}
            x1={nodes[a]?.x} y1={nodes[a]?.y} x2={nodes[b]?.x} y2={nodes[b]?.y}
            stroke={hasData ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.38)'} strokeWidth={0.6}
            animate={{ opacity: [0.15, 0.40, 0.15] }}
            transition={{ duration: 3 + i * 0.35, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <motion.circle cx={n.x} cy={n.y} r={n.r + 3} fill={n.color} opacity={0}
              animate={{ r: [n.r + 3, n.r + 6, n.r + 3], opacity: [0.10, 0.24, 0.10] }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
            />
            <motion.circle cx={n.x} cy={n.y} r={n.r} fill={n.color}
              animate={{ scale: [1, 1.18, 1] }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
            />
            {hasData && n.label && (
              <text
                x={n.x} y={n.y + n.r + 5}
                textAnchor="middle"
                fill="rgba(255,255,255,0.40)"
                fontSize="4"
                fontFamily="Inter, system-ui, sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {n.label.length > 11 ? n.label.slice(0, 10) + '…' : n.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {!hasData && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: -10, paddingBottom: 4, margin: 0 }}>
          {T.chatToGrowMap}
        </p>
      )}
    </GlassCard>
  )
}

function MoodCard() {
  const T = useT()
  const { currentVibe, frustrationScore, totalExchanges } = useNeuralStore()

  const VIBE_TO_MODE_T = {
    Proud:     { labelKey: 'inTheZone',    color: '#4ADE80', subKey: 'onAWinningStreak' },
    Skeptical: { labelKey: 'criticalMode', color: '#F87171', subKey: 'questioningEverything' },
    Concerned: { labelKey: 'findingFocus', color: '#FBBF24', subKey: 'rebuildingFromHere' },
    Impressed: { labelKey: 'momentum',     color: '#60A5FA', subKey: 'buildingFast' },
    Engaged:   { labelKey: 'lockedIn',     color: '#4ADE80', subKey: 'fullFocusEngaged' },
    Focused:   { labelKey: 'lockedIn',     color: '#4ADE80', subKey: 'fullFocusEngaged' },
  }

  const isNew = !totalExchanges || totalExchanges < 3
  const raw = isNew
    ? { labelKey: 'calibrating', color: '#A78BFA', subKey: 'gettingToKnowYou' }
    : frustrationScore > 72
      ? { labelKey: 'frustrated', color: '#F97316', subKey: 'aevaIsSimplifying' }
      : VIBE_TO_MODE_T[currentVibe] || VIBE_TO_MODE_T.Focused
  const modeConfig = { label: T[raw.labelKey] || raw.labelKey, color: raw.color, sub: T[raw.subKey] || raw.subKey }

  const dotColor = modeConfig.color

  return (
    <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>{T.aevaMode}</span>
      <div>
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', marginBottom: 10, background: dotColor, boxShadow: `0 0 10px ${dotColor}` }} />
        <h2 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
          {modeConfig.label}
        </h2>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: 0 }}>
        {modeConfig.sub}
      </p>
    </GlassCard>
  )
}

function TrainingLabCard() {
  const T = useT()
  const { openLab } = useLabStore()
  const drills = [
    { emoji: '⚡', label: T.flashcardSprint, color: '#3B82F6' },
    { emoji: '🎯', label: T.mockTest,        color: '#06B6D4' },
    { emoji: '🔗', label: T.matchGrid,       color: '#8B5CF6' },
  ]
  return (
    <GlassCard className="lab-card" onClick={openLab} style={{ padding: '24px 26px', cursor: 'pointer', minHeight: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlaskConical size={13} color="rgba(59,130,246,0.70)" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(59,130,246,0.70)', textTransform: 'uppercase' }}>{T.trainingLab}</span>
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 8px #3B82F6' }}
        />
      </div>
      <h3 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        {T.drillMasteryHub}
      </h3>
      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', margin: '0 0 16px', lineHeight: 1.5 }}>
        {T.theArcadeCreates}
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
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', position: 'relative', zIndex: 1 }}>
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
  const T = useT()
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
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>{T.aevasPerception}</span>
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
                {T.adaptingNow}
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
              {T.coreInterests}
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
          <Share2 size={11} /> {T.shareMyProfile}
        </motion.button>
      </GlassCard>

      <AnimatePresence>
        {showShare && <ShareProfileModal onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </>
  )
}

function SkillDecayCard() {
  const T = useT()
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
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>{T.skillRetention}</span>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>{T.liveDecay}</div>
        </div>
        <TrendingDown size={13} color="rgba(255,255,255,0.28)" />
      </div>

      {skills.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.65, paddingTop: 6 }}>
          {T.chatWithAeva} — concepts you explore appear here with live retention tracking. Skills decay over time without practice.
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
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
            {T.drillToStopDecay}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

/* ═══ FINGERPRINT BENTO CARD ═══════════════════════ */
function FingerprintCard({ onOpen }) {
  const T = useT()
  const { learningStyle, learningStyleTotal, learningStyleLocked } = useNeuralStore()

  const DIMENSIONS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const STYLE_TITLES = {
    analogical: T.analogyThinker, visual: T.spatialReasoner, structural: T.systemsBuilder,
    exampleFirst: T.concreteLearner, conceptual: T.principleSeeker,
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
          {T.learningFingerprint}
        </span>
        {learningStyleLocked ? (
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8B8FFF', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 99, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)' }}>
            {T.calibrated}
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
                {learningStyleLocked ? T.confirmedStyle : T.calibratedPct(confidence)}
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
                {T.readingYourStyle}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.45 }}>
                {T.chatToCalibrate}
              </div>
            </>
          )}
          <div style={{ marginTop: hasAnyData ? 9 : 8, fontSize: 10.5, color: 'rgba(139,143,255,0.60)', fontWeight: 600 }}>
            {T.tapToExplore}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

/* ═══ MEMORY PALACE BENTO CARD ══════════════════════ */
function MemoryPalaceCard({ onOpen }) {
  const T = useT()
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
          {T.memoryPalace}
        </span>
        <Brain size={12} color="rgba(255,255,255,0.25)" />
      </div>

      {conceptMap.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', lineHeight: 1.6, marginTop: 8 }}>
          {T.startChattingPalace}
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
            {T.conceptsMapped(conceptMap.length)}
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
        <Layers size={10} /> {T.explorePalace}
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
/* ═══ MOBILE DRAWER ══════════════════════════════ */
function MobileDrawer({ open, onClose, onLibrary, onBrain, onMirror, onSettings, onProfile, onSignOut }) {
  const T = useT()
  const items = [
    { label: T.library,      icon: <BookOpen size={17} />,  color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.22)', action: onLibrary },
    { label: T.secondBrain,  icon: <Brain size={17} />,     color: '#8B8FFF', bg: 'rgba(139,143,255,0.10)', border: 'rgba(139,143,255,0.22)', action: onBrain },
    { label: T.mirror,       icon: <span style={{ fontSize: 17 }}>🪞</span>, color: '#D8B4FE', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)', action: onMirror },
    { label: T.myProfile,    icon: <Star size={17} />,      color: '#E9A364', bg: 'rgba(233,163,100,0.10)', border: 'rgba(233,163,100,0.22)', action: onProfile },
    { label: T.appearance,   icon: <Settings size={17} />,  color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)', action: onSettings },
  ]
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 298, background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          />
          <motion.div
            key="drawer-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 299,
              width: 270, background: 'rgba(6,7,22,0.99)',
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Drawer header */}
            <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={10} color="white" fill="white" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>aeva</span>

              </div>
              <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }} onClick={onClose}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </motion.button>
            </div>

            {/* Nav items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(item => (
                <motion.button key={item.label} whileTap={{ scale: 0.97 }}
                  onClick={() => { item.action?.(); onClose() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 13,
                    padding: '13px 16px', borderRadius: 14,
                    background: item.bg, border: `1px solid ${item.border}`,
                    color: item.color, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}>
                  {item.icon}
                  {item.label}
                </motion.button>
              ))}
            </div>

            {/* Sign out */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { onSignOut?.(); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 14, width: '100%',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)',
                  color: 'rgba(248,113,113,0.80)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <LogOut size={16} />
                {T.signOut}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ═══ MOBILE BOTTOM BAR ══════════════════════════ */
function MobileBottomBar({ onChat, onLab, onArcade, onDrillCount }) {
  const T = useT()
  const tabs = [
    { label: T.chat,   icon: <MessageCircle size={21} />, action: onChat,   color: '#8B8FFF' },
    { label: T.lab,    icon: <FlaskConical size={21} />,  action: onLab,    color: '#3B82F6', badge: onDrillCount > 0 ? onDrillCount : null },
    { label: T.arcade, icon: <Gamepad2 size={21} />,      action: onArcade, color: '#6366F1' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
      background: 'rgba(5,6,18,0.97)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'stretch',
      fontFamily: "'Inter', system-ui, sans-serif",
      height: 'calc(60px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => (
        <motion.button key={tab.label} whileTap={{ scale: 0.92 }}
          onClick={tab.action}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4, background: 'none', border: 'none',
            cursor: 'pointer', color: 'rgba(255,255,255,0.40)',
            fontFamily: 'inherit', position: 'relative',
          }}>
          <div style={{ color: 'rgba(255,255,255,0.42)', position: 'relative' }}>
            {tab.icon}
            {tab.badge && (
              <div style={{
                position: 'absolute', top: -5, right: -7,
                minWidth: 16, height: 16, borderRadius: 99,
                background: '#4ADE80', color: '#0a160a',
                fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '0 3px',
                boxShadow: '0 0 8px rgba(74,222,128,0.60)',
              }}>{tab.badge}</div>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>{tab.label}</span>
        </motion.button>
      ))}
    </div>
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
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [brainOpen, setBrainOpen] = useState(false)
  const [mirrorOpen, setMirrorOpen] = useState(false)
  const [orbSelectorOpen, setOrbSelectorOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile()
  const { getStats } = useBrainStore()
  const brainStats = getStats()
  const { xp, streak, activeOrb: activeOrbId, unlockedOrbs } = useXPStore()
  const currentLevel = levelFromXP(xp)
  const xpProgress = xpIntoLevel(xp)
  const activeOrbDef = ORBS.find(o => o.id === activeOrbId) || ORBS[0]
  const { dashboardBg, fontStyle } = useAppSettings()
  const dashBgPreset = SECTION_BG_PRESETS.find(p => p.id === (dashboardBg || 'default')) || SECTION_BG_PRESETS[1]
  const fontFamily = FONT_STYLES[fontStyle || 'inter']?.family || "'Inter', system-ui, sans-serif"

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        position: 'relative', minHeight: '100vh', width: '100%',
        overflowX: 'hidden', overflowY: 'auto',
        background: dashBgPreset.gradient,
        fontFamily,
      }}
    >
      <div aria-hidden style={{ position: 'absolute', top: '-5%', left: '15%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,48,142,0.22) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '5%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.13) 0%, transparent 70%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      {/* Portals */}
      <ArcadeHub />
      <LabHub />

      <div style={{ position: 'relative' }}>
        {/* ── Desktop header (hidden on mobile) ── */}
        {!isMobile && (
          <header className="dash-header" style={{
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
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setLibraryOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.30)', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em', position: 'relative' }}>
                <BookOpen size={13} />Library
                {sessions.length > 0 && <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(167,139,250,0.25)', fontSize: 9.5, fontWeight: 800, color: '#A78BFA' }}>{sessions.length}</span>}
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setBrainOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(139,143,255,0.13)', border: '1px solid rgba(139,143,255,0.32)', color: 'rgba(200,200,255,0.85)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                <Brain size={13} />Second Brain
                {brainStats.total > 0 && <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(139,143,255,0.22)', fontSize: 9.5, fontWeight: 800, color: '#8B8FFF' }}>{brainStats.total}</span>}
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setMirrorOpen(true)} animate={{ boxShadow: ['0 0 0px rgba(139,92,246,0)', '0 0 12px rgba(139,92,246,0.35)', '0 0 0px rgba(139,92,246,0)'] }} transition={{ boxShadow: { duration: 3, repeat: Infinity } }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'linear-gradient(135deg, rgba(109,40,217,0.20), rgba(139,92,246,0.12))', border: '1px solid rgba(139,92,246,0.38)', color: 'rgba(216,180,254,0.90)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>🪞 Mirror</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openLab} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.35)', color: 'rgba(255,255,255,0.80)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em', position: 'relative' }}>
                <FlaskConical size={13} />The Lab
                {srDueCount > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }} style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 99, background: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#0a160a', padding: '0 4px', boxShadow: '0 0 8px rgba(74,222,128,0.60)' }}>{srDueCount}</motion.div>}
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openArcade} animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 18px rgba(99,102,241,0.55)', '0 0 0px rgba(99,102,241,0)'] }} transition={{ boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(233,163,100,0.15))', border: '1px solid rgba(99,102,241,0.45)', color: 'rgba(255,255,255,0.92)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}><Gamepad2 size={13} />Unleash Arcade</motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onChatOpen} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(139,143,255,0.15)', border: '1px solid rgba(139,143,255,0.30)', color: 'rgba(255,255,255,0.80)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}><MessageCircle size={13} />Chat</motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setProfileOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(233,163,100,0.12)', border: '1px solid rgba(233,163,100,0.30)', color: 'rgba(233,163,100,0.88)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>👤 My Profile</motion.button>
              <motion.button whileHover={{ scale: 1.08, rotate: 45 }} whileTap={{ scale: 0.94 }} onClick={() => setAppSettingsOpen(true)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={14} /></motion.button>
              <UserAvatar onSignOut={onSignOut} />
            </div>
          </header>
        )}

        {/* ── Mobile header (logo + hamburger only) ── */}
        {isMobile && (
          <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(45,48,142,0.50)' }}>
                <Star size={11} color="white" fill="white" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(233,163,100,0.80) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>aeva</span>
            </div>
            <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              onClick={() => setDrawerOpen(true)}
              style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Menu size={18} />
            </motion.button>
          </header>
        )}

        <div className="bento-grid" style={{ padding: isMobile ? '16px 14px' : '0 24px', maxWidth: 1280, margin: '0 auto', paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : undefined }}>
          <MissionCard onChatOpen={onChatOpen} onOrbClick={() => setOrbSelectorOpen(true)} />
          <ConstellationCard />
          <MoodCard />
          <SkillDecayCard />
          <TrainingLabCard />
          <PerceptionCard />
          <FingerprintCard onOpen={() => setFingerprintOpen(true)} />
          <MemoryPalaceCard onOpen={() => setPalaceOpen(true)} />
          <PersonalProgressCard />
        </div>

        <div style={{ height: isMobile ? 0 : 48 }} />
      </div>

      {/* ── Mobile drawer ── */}
      {isMobile && (
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onLibrary={() => setLibraryOpen(true)}
          onBrain={() => setBrainOpen(true)}
          onMirror={() => setMirrorOpen(true)}
          onSettings={() => setAppSettingsOpen(true)}
          onProfile={() => setProfileOpen(true)}
          onSignOut={onSignOut}
        />
      )}

      {/* ── Mobile bottom bar ── */}
      {isMobile && (
        <MobileBottomBar
          onChat={onChatOpen}
          onLab={openLab}
          onArcade={openArcade}
          onDrillCount={srDueCount}
        />
      )}

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

      <AnimatePresence>
        {appSettingsOpen && <AppSettingsPanel onClose={() => setAppSettingsOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {brainOpen && <SecondBrain onClose={() => setBrainOpen(false)} onMirrorOpen={() => { setBrainOpen(false); setMirrorOpen(true) }} />}
      </AnimatePresence>

      <AnimatePresence>
        {mirrorOpen && <Mirror onClose={() => setMirrorOpen(false)} name={name} />}
      </AnimatePresence>

      <AnimatePresence>
        {orbSelectorOpen && <OrbSelector onClose={() => setOrbSelectorOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══ MARKDOWN RENDERER ═══════════════════════════ */
function parseInline(text, isLight = false) {
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
    // Inline math $...$
    const mathMatch = remaining.match(/^(.*?)\$([^$\n]+?)\$/)
    if (mathMatch) {
      if (mathMatch[1]) parts.push(<span key={key++}>{mathMatch[1]}</span>)
      try {
        const html = katex.renderToString(mathMatch[2], { throwOnError: false, displayMode: false })
        parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} style={{ verticalAlign: 'middle' }} />)
      } catch {
        parts.push(<span key={key++} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{mathMatch[2]}</span>)
      }
      remaining = remaining.slice(mathMatch[0].length)
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
          background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.10)',
          border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.14)',
          borderRadius: 5,
          padding: '1px 6px',
          color: isLight ? '#2563EB' : '#7DD3FC',
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

function MarkdownTable({ lines, isLight = false }) {
  const parseRow = (line) => line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1)
  const headers = parseRow(lines[0])
  const rows = lines.slice(2).map(parseRow)

  return (
    <div style={{ overflowX: 'auto', margin: '10px 0', borderRadius: 10, border: isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <thead>
          <tr style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '9px 14px', textAlign: 'left',
                color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 12,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                borderBottom: isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)',
              }}>{parseInline(h, isLight)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '8px 14px', color: isLight ? 'rgba(0,0,0,0.68)' : 'rgba(255,255,255,0.75)', fontSize: 13.5,
                  borderBottom: ri < rows.length - 1 ? isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' : 'none',
                  lineHeight: 1.55,
                }}>{parseInline(cell, isLight)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarkdownRenderer({ text, streaming, cursorColor, isLight = false }) {
  const txt    = isLight ? 'rgba(0,0,0,0.82)'  : 'rgba(255,255,255,0.82)'
  const txtH1  = isLight ? 'rgba(0,0,0,0.90)'  : 'rgba(255,255,255,0.95)'
  const txtH2  = isLight ? 'rgba(0,0,0,0.80)'  : 'rgba(255,255,255,0.90)'
  const txtP   = isLight ? 'rgba(0,0,0,0.78)'  : 'rgba(255,255,255,0.85)'
  const bullet = isLight ? 'rgba(99,102,241,0.75)' : 'rgba(139,143,255,0.8)'

  const clean = text
    .replace(/\[TERM:[^\]]*\]/g, '')
    .replace(/\[SUMMARY:[^\]]*\]/g, '')
    .replace(/\[CORRECT\]/g, '[CORRECT:]')  // normalise bare tags

  const lines = clean.split('\n')
  const elements = []
  let i = 0
  let listItems = []
  let listType = null

  const flushList = () => {
    if (listItems.length === 0) return
    if (listType === 'ol') {
      elements.push(
        <ol key={`list-${elements.length}`} style={{ margin: '8px 0 8px 4px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: txt, fontSize: 14.5, lineHeight: 1.6 }}>{parseInline(item, isLight)}</li>
          ))}
        </ol>
      )
    } else {
      elements.push(
        <ul key={`list-${elements.length}`} style={{ margin: '8px 0 8px 4px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none' }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: txt, fontSize: 14.5, lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: bullet, marginTop: 2, flexShrink: 0, fontSize: 11 }}>◆</span>
              <span>{parseInline(item, isLight)}</span>
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

    if (trimmed === '') {
      flushList()
      elements.push(<div key={`gap-${i}`} style={{ height: 6 }} />)
      i++; continue
    }

    // Display math $$...$$
    if (/^\$\$/.test(trimmed)) {
      flushList()
      const mathLines = []
      const startI = i
      if (trimmed.replace(/^\$\$/, '').replace(/\$\$$/, '').trim()) {
        // Single-line $$expr$$
        mathLines.push(trimmed.replace(/^\$\$/, '').replace(/\$\$$/, ''))
        i++
      } else {
        i++
        while (i < lines.length && !/^\$\$/.test(lines[i].trim())) {
          mathLines.push(lines[i])
          i++
        }
        i++ // skip closing $$
      }
      const mathContent = mathLines.join('\n').trim()
      try {
        const html = katex.renderToString(mathContent, { throwOnError: false, displayMode: true })
        elements.push(
          <div key={`dmath-${startI}`} style={{ overflowX: 'auto', margin: '10px 0', padding: '10px 4px', textAlign: 'center' }}
            dangerouslySetInnerHTML={{ __html: html }} />
        )
      } catch {
        elements.push(<p key={`dmath-${startI}`} style={{ fontFamily: 'monospace', color: txt }}>{mathContent}</p>)
      }
      continue
    }

    // Feedback tags [CORRECT: ...], [PARTIAL: ...], [INCORRECT: ...]
    const feedbackMatch = trimmed.match(/^\[(CORRECT|PARTIAL|INCORRECT)(?::\s*(.*))?\]/)
    if (feedbackMatch) {
      flushList()
      const type = feedbackMatch[1]
      const msg  = feedbackMatch[2] || ''
      const cfg  = {
        CORRECT:   { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.32)', color: '#4ADE80', icon: '✓', label: 'Correct' },
        PARTIAL:   { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.28)', color: '#FCD34D', icon: '◑', label: 'Partially correct' },
        INCORRECT: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.28)', color: '#F87171', icon: '✗', label: 'Not quite' },
      }[type]
      elements.push(
        <div key={`fb-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '8px 0', padding: '10px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: cfg.color, flexShrink: 0, lineHeight: 1.4 }}>{cfg.icon}</span>
          <div>
            <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{cfg.label}</span>
            {msg && <p style={{ margin: '3px 0 0', fontSize: 14, color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{parseInline(msg, isLight)}</p>}
          </div>
        </div>
      )
      i++; continue
    }

    if (/^\|/.test(trimmed) && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      flushList()
      const tableLines = []
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        tableLines.push(lines[i])
        i++
      }
      if (tableLines.length >= 2) {
        elements.push(<MarkdownTable key={`table-${elements.length}`} lines={tableLines} isLight={isLight} />)
      }
      continue
    }

    if (/^#\s/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^#+\s/, '')
      elements.push(
        <div key={`h1-${i}`} style={{ fontSize: 16, fontWeight: 800, color: txtH1, margin: '12px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
          {parseInline(content, isLight)}
        </div>
      )
      i++; continue
    }

    if (/^##/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^#+\s/, '')
      elements.push(
        <div key={`h2-${i}`} style={{ fontSize: 14.5, fontWeight: 700, color: txtH2, margin: '10px 0 4px', letterSpacing: '-0.01em' }}>
          {parseInline(content, isLight)}
        </div>
      )
      i++; continue
    }

    if (/^>/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^>\s*/, '')
      elements.push(
        <div key={`bq-${i}`} style={{
          margin: '10px 0', padding: '12px 16px',
          borderLeft: '3px solid #6366F1',
          background: isLight ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.13)',
          borderRadius: '0 10px 10px 0',
          fontSize: 14.5, color: 'rgba(220,220,255,0.90)',
          fontStyle: 'italic', fontWeight: 500, lineHeight: 1.70,
        }}>
          {parseInline(content, isLight)}
        </div>
      )
      i++; continue
    }

    if (/^```/.test(trimmed)) {
      flushList()
      const lang = trimmed.replace(/^```/, '').trim()
      const codeLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(
        <div key={`code-${elements.length}`} style={{
          margin: '10px 0', borderRadius: 10,
          background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.35)',
          border: isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)',
          overflow: 'hidden',
        }}>
          {lang && (
            <div style={{ padding: '5px 12px', background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', fontSize: 10.5, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lang}</div>
          )}
          <pre style={{ margin: 0, padding: '12px 14px', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 13, color: isLight ? '#1D4ED8' : '#93C5FD', lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre' }}>
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      continue
    }

    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/)
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(olMatch[2])
      i++; continue
    }

    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/)
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(ulMatch[1])
      i++; continue
    }

    flushList()
    elements.push(
      <p key={`p-${i}`} style={{ margin: '4px 0', fontSize: 14.5, color: txtP, lineHeight: 1.68 }}>
        {parseInline(trimmed, isLight)}
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
          style={{ display: 'inline-block', width: 2, height: 14, background: cursorColor || (isLight ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.6)'), borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }}
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
  blockquote { border-left: 3px solid #6366F1; padding: 10px 16px; background: rgba(99,102,241,0.08); border-radius: 0 8px 8px 0; font-style: italic; color: #4338ca; margin: 12px 0; font-size: 14px; }
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
function ChatBubble({ msg, deepDiveCards, onDismissCard, isLight = false }) {
  const isUser = msg.role === 'user'

  const bubbleBg = isUser
    ? isLight
      ? 'linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(109,113,225,0.12) 100%)'
      : 'linear-gradient(135deg, rgba(139,143,255,0.28) 0%, rgba(109,113,225,0.20) 100%)'
    : isLight
      ? 'rgba(0,0,0,0.04)'
      : 'rgba(255,255,255,0.055)'

  const bubbleBorder = isUser
    ? isLight ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(139,143,255,0.40)'
    : isLight ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.09)'

  const bubbleShadow = isUser
    ? isLight ? '0 2px 12px rgba(99,102,241,0.12)' : '0 4px 20px rgba(139,143,255,0.15), inset 0 1px 0 rgba(255,255,255,0.12)'
    : isLight ? '0 1px 8px rgba(0,0,0,0.06)' : '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.06)'

  const textColor = isLight ? (isUser ? 'rgba(30,27,100,0.88)' : 'rgba(15,15,30,0.85)') : 'rgba(255,255,255,0.90)'

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
        background: bubbleBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: bubbleBorder,
        boxShadow: bubbleShadow,
        color: textColor,
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
            <MarkdownRenderer text={msg.text} streaming={!!msg.streaming} cursorColor={isLight ? 'rgba(99,102,241,0.8)' : 'rgba(139,143,255,0.9)'} isLight={isLight} />
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
  const T = useT()
  const state = STATE_CONFIG[sessionState] || STATE_CONFIG.DIAGNOSTIC
  const mode = criticism ? (MODE_CONFIG[criticism.mode] || null) : null

  const stateLabel = {
    DIAGNOSTIC:    T.diagnosing,
    SCAFFOLDING:   T.building,
    STRESS_TEST:   T.stressTesting,
    CONSOLIDATION: T.consolidating,
  }[sessionState] || state.label

  const modeLabel = {
    hype:      T.momentum || 'Momentum',
    coach:     T.coachingMode,
    challenge: T.challengeMode,
    redirect:  T.redirectMode,
  }[criticism?.mode] || mode?.label

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
        {stateLabel}
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
          {modeLabel}
        </motion.div>
      )}
    </div>
  )
}

/* ═══ CHAT VIEW / COCKPIT ═════════════════════════ */
function ChatView({ onBack }) {
  const T = useT()
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
    masteredTopics,
    struggleZones,
    frustrationScore,
    avgResponseLength,
    totalExchanges,
    depth,
  } = useNeuralStore()
  const { saveWorldMemory } = useArcadeStore()
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
  const [socraticActive, setSocraticActive] = useState(false)
  const socraticExchangeRef = useRef(0)
  const [feynmanOpen, setFeynmanOpen] = useState(false)
  const [chatAppSettingsOpen, setChatAppSettingsOpen] = useState(false)
  const [chatSettings, saveChatSettings] = useChatSettings()
  const [chipEditMode, setChipEditMode] = useState(false)
  const [addingChip, setAddingChip] = useState(false)
  const [newChipLabel, setNewChipLabel] = useState('')
  const newChipInputRef = useRef(null)
  const [countdown, setCountdown] = useState(null)
  const [voiceModeOpen, setVoiceModeOpen] = useState(false)
  const { voiceEnabled, isSpeaking, toggleVoice, stopSpeaking } = useVoiceStore()

  // Keep voiceStore in sync so triggerAevaVoice knows to speak even if toggle is off
  useEffect(() => {
    useVoiceStore.getState().setVoiceModeActive(voiceModeOpen)
    return () => { if (voiceModeOpen) useVoiceStore.getState().setVoiceModeActive(false) }
  }, [voiceModeOpen])
  const countdownRef = useRef(null)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const exchangeCountRef = useRef(0)
  const recentCriticRef = useRef([])       // last 3 critic results for trend detection
  const sessionConceptsRef = useRef({})    // concept → understanding map this session
  const masteryMapRef = useRef({})         // kept in sync for session-end save
  const lastTopicRef = useRef(null)        // previous critic topic for change detection
  const phaseStreakRef = useRef(0)         // consecutive solid/mastery answers in current phase

  const hasInput = input.trim().length > 0
  const isActive = isThinking || hasInput

  // Keep masteryMapRef in sync for session-end save
  useEffect(() => { masteryMapRef.current = masteryMap }, [masteryMap])

  // Save session summary when ChatView unmounts
  useEffect(() => {
    return () => {
      if (exchangeCountRef.current < 2) return
      const topics = Object.keys(masteryMapRef.current)
      const primaryTopic = topics.sort((a, b) => (masteryMapRef.current[b] || 0) - (masteryMapRef.current[a] || 0))[0] || null
      saveWorldMemory('lastTutorSession', {
        date: Date.now(),
        topics: topics.slice(0, 6),
        primaryTopic,
        exchanges: exchangeCountRef.current,
        mastered: masteredTopics.slice(-4),
        struggled: struggleZones.slice(-3),
      })
    }
  }, [])

  // Proactive opener removed — chat always starts with the empty state UI
  // (big orb + chips) until the user sends their first message.

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

  const toggleSocratic = () => {
    setSocraticActive(prev => {
      const next = !prev
      if (!next) socraticExchangeRef.current = 0
      setMessages(m => [...m, {
        role: 'model',
        text: next
          ? `Socratic mode on. I won't give you answers directly — I'll ask questions until you find them yourself. This is harder, but it's how real understanding forms. What are we working on?`
          : `Back to normal mode. I'll explain things directly again.`,
        streaming: false,
      }])
      return next
    })
  }

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

  /* Advance session state based on demonstrated mastery, not message count */
  const advanceSessionState = (count, criticResult) => {
    const states = SESSION_STATES
    const currentIdx = states.indexOf(sessionState)
    const understanding = criticResult?.understanding

    // Update phase streak
    const isStrong = understanding === 'solid' || understanding === 'mastery'
    const isWeak   = understanding === 'none'  || understanding === 'partial'
    if (isStrong) phaseStreakRef.current += 1
    if (isWeak)   phaseStreakRef.current = 0

    let nextIdx = currentIdx

    if (currentIdx === 0) {
      // DIAGNOSTIC → SCAFFOLDING: after 2 exchanges (we've seen enough to start building)
      if (count >= 2) nextIdx = 1
    } else if (currentIdx === 1) {
      // SCAFFOLDING → STRESS_TEST: 2 consecutive solid/mastery answers, min 4 exchanges
      if (phaseStreakRef.current >= 2 && count >= 4) nextIdx = 2
      // Hard cap: advance after 10 exchanges regardless
      else if (count >= 10) nextIdx = 2
    } else if (currentIdx === 2) {
      // STRESS_TEST → CONSOLIDATION: 2 consecutive solid/mastery at stress level, min 7 exchanges
      if (phaseStreakRef.current >= 2 && count >= 7) nextIdx = 3
      else if (count >= 14) nextIdx = 3
    }
    // CONSOLIDATION: stay here — no further advance

    if (nextIdx !== currentIdx) {
      phaseStreakRef.current = 0  // reset streak on phase change
      setSessionState(states[nextIdx])
    }
  }

  const GREETING_WORDS = new Set(['hello','hi','hey','hiya','sup','yo','greetings','howdy','thanks','thank','bye','goodbye','ok','okay','sure','yes','no','yep','nope','lol','haha','cool','nice','great','awesome','wow'])

  const JUNK_TOPICS = new Set([
    'general','greeting','response','answer','question','message','topic','concept',
    'explanation','example','understanding','learning','studying','help','information',
    'yes','no','ok','okay','sure','thanks','hello','hi','hey','good','great','nice',
  ])

  const updateMastery = (criticResult) => {
    if (!criticResult?.topic) return
    const topic = criticResult.topic.toLowerCase().trim()
    if (topic.length < 4) return
    if (topic.split(' ').every(w => GREETING_WORDS.has(w) || JUNK_TOPICS.has(w))) return
    if (JUNK_TOPICS.has(topic)) return
    // Must contain at least one non-stopword of length > 3
    const hasRealWord = topic.split(' ').some(w => w.length > 3 && !JUNK_TOPICS.has(w) && !GREETING_WORDS.has(w))
    if (!hasRealWord) return
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
      triggerAevaVoice(openRaw, useXPStore.getState().activeOrb)
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
    setMessages([...history, { role: 'model', text: '', streaming: true, lockIn: false }])
    setIsThinking(true)

    const controller = new AbortController()
    abortRef.current = controller

    let rawResponse = ''
    let criticResult = null   // declared outside try so finally can access it

    try {
      let systemPrompt

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
        // XP every 5 Socratic exchanges (resets when mode is toggled)
        if (socraticActive) {
          socraticExchangeRef.current += 1
          if (socraticExchangeRef.current % 5 === 0) {
            useXPStore.getState().addXP('SOCRATIC_5')
          }
        }
        // Update session tracking refs
        recentCriticRef.current = [...recentCriticRef.current, criticResult].slice(-3)
        if (criticResult?.topic) sessionConceptsRef.current[criticResult.topic] = criticResult.understanding

        // Topic-change recalibration — reset session state when topic shifts significantly
        const newTopic = criticResult?.topic?.toLowerCase().trim()
        const prevTopic = lastTopicRef.current
        if (newTopic && prevTopic && newTopic !== prevTopic && !newTopic.includes(prevTopic) && !prevTopic.includes(newTopic)) {
          // Topic changed — reset to SCAFFOLDING so Aeva rebuilds for the new subject
          if (sessionState === 'STRESS_TEST' || sessionState === 'CONSOLIDATION') {
            setSessionState('SCAFFOLDING')
            recentCriticRef.current = [] // clear trend so difficulty resets
          }
        }
        lastTopicRef.current = newTopic

        // Build live adaptation extras
        const extras = {
          trend: computeTrend(recentCriticRef.current),
          conceptScaffold: buildConceptScaffold(sessionConceptsRef.current),
          difficultyDirective: buildDifficultyDirective({ frustrationScore, avgResponseLength, totalExchanges, depth }),
        }

        // Orb personality prefix — injected FIRST so it anchors the whole response
        const activeOrbDef = ORBS.find(o => o.id === useXPStore.getState().activeOrb)
        const orbPrefix = activeOrbDef?.personality
          ? `⚠ OVERRIDE — THIS RULE SUPERSEDES ALL OTHER INSTRUCTIONS BELOW:\n${activeOrbDef.personality}\nApply this to every single response. It is non-negotiable.\n\n`
          : ''

        // Feedback tag injection — detect if user answered a question and force the correct tag
        const lastModelMsg = [...messages].reverse().find(m => m.role === 'model')
        const userAnsweredQuestion = lastModelMsg && /\?/.test(lastModelMsg.text)
        let feedbackPrefix = ''
        if (userAnsweredQuestion && criticResult && !socraticActive) {
          const understanding = criticResult.understanding
          const tagMap = {
            mastery: `[CORRECT: {one specific sentence praising exactly what ${name} got right}]`,
            solid:   `[CORRECT: {one specific sentence praising exactly what ${name} got right}]`,
            partial: `[PARTIAL: {one sentence — what was right, then what was missing or wrong}]`,
            none:    `[INCORRECT: {one sentence — the specific misconception or gap, not just "that's wrong"}]`,
          }
          const tag = tagMap[understanding] || tagMap.partial
          feedbackPrefix = `🚨 FEEDBACK REQUIRED: ${name} just answered your question. The critic assessment is: ${understanding.toUpperCase()}.\nYou MUST begin your response with exactly this tag (fill in the curly braces): ${tag}\nDo NOT skip this. Do NOT start with anything else. The tag renders as a visual banner — it is the most important part of your response.\n\n`
        }

        systemPrompt = feedbackPrefix + orbPrefix + buildAevaPrompt(sessionState, criticResult, name, null, buildMemoryBlock(name), extras, T.aevaLanguageDirective)

        if (socraticActive) {
          systemPrompt += '\n\nSOCRATIC MODE: You must NEVER state facts, answers, or explanations directly. Respond ONLY with 1-3 targeted questions that guide the student to discover the answer themselves. If they arrive at the correct answer, confirm warmly and deepen with another question. If wrong, ask a question that exposes the specific gap without revealing the answer. Never say "the answer is", never explain anything outright. Make them think every time.'
        }
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
          useXPStore.getState().addXP('TOPIC_MASTERED')
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

      // Speak Aeva's response if voice is enabled
      triggerAevaVoice(rawResponse, useXPStore.getState().activeOrb)

      // Parse TERM tags from completed response (tutor mode only)
      if (!isMission) {
        const brain = useBrainStore.getState()
        const masteryScore = criticResult
          ? ({ none: 10, partial: 35, solid: 70, mastery: 90 }[criticResult.understanding] ?? 35)
          : 20

        // 1. TERM tags → richest nodes (have definitions)
        const termMatches = [...rawResponse.matchAll(/\[TERM:\s*([^|]+)\|\s*([^\]]+)\]/g)]
        if (termMatches.length > 0) {
          const cards = termMatches.map(m => ({ id: `${Date.now()}-${m[1].trim()}`, term: m[1].trim(), definition: m[2].trim() }))
          setDeepDiveMap(prev => ({ ...prev, [history.length]: cards }))
          cards.forEach(c => brain.addConcept({ concept: c.term, definition: c.definition, mastery: masteryScore, source: 'term' }))
          if (cards.length >= 2) {
            for (let j = 0; j < cards.length - 1; j++) brain.linkConcepts(cards[j].term, cards[j + 1].term)
          }
        }

        // 2. Bold terms **term** from AI response → extract as concepts
        const boldMatches = [...rawResponse.matchAll(/\*\*([^*]{3,40})\*\*/g)]
        boldMatches.forEach(m => {
          const term = m[1].trim()
          if (term.split(' ').length <= 5) { // not a full sentence
            brain.addConcept({ concept: term, mastery: masteryScore, source: 'bold' })
          }
        })

        // 3. Headings from AI response → H1/H2 = concept clusters
        const headingMatches = [...rawResponse.matchAll(/^#{1,2}\s+(.+)$/gm)]
        headingMatches.forEach(m => {
          const heading = m[1].replace(/\*\*/g, '').trim()
          if (heading.length > 2 && heading.length < 60) {
            brain.addConcept({ concept: heading, mastery: masteryScore, source: 'heading' })
          }
        })

        // 4. Critic topic → always add (covers when no TERM/bold/heading found)
        if (criticResult?.topic && criticResult.topic !== 'general') {
          brain.addConcept({ concept: criticResult.topic, mastery: masteryScore, source: 'topic' })
          brain.updateMastery(criticResult.topic, masteryScore)
          // Link topic to any bold terms found
          boldMatches.slice(0, 3).forEach(m => brain.linkConcepts(criticResult.topic, m[1].trim()))
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
  const isLight = !isMission && (chatSettings.chatBg || 'default') === 'white'

  const backBtnStyle = isLight
    ? { background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.60)' }
    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.62)' }

  const logoColor = isLight ? 'rgba(15,15,30,0.85)' : 'rgba(255,255,255,0.88)'
  const headingColor = isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.50)'
  const titleColor = isLight ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.94)'

  const inputBarStyle = isMission
    ? {
        background: 'rgba(255,255,255,0.05)',
        border: activeMission ? `1px solid ${activeMission.border}` : '1px solid rgba(255,255,255,0.12)',
        boxShadow: activeMission ? `0 0 24px ${activeMission.glow}` : 'none',
      }
    : isLight
    ? {
        background: 'rgba(255,255,255,0.90)',
        border: '1px solid rgba(0,0,0,0.12)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.08)',
      }
    : {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(139,143,255,0.22)',
        boxShadow: '0 0 0 1px rgba(139,143,255,0.08), 0 8px 32px rgba(0,0,0,0.40)',
      }

  const inputTextColor = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.88)'
  const placeholderNote = isMission
    ? `Respond to ${activeMission?.title || 'the mission'}…`
    : 'Ask Aeva anything…'

  const sendBtnStyle = isMission && activeMission
    ? { background: `linear-gradient(145deg, ${activeMission.color}80, ${activeMission.color}40)`, border: `1.5px solid ${activeMission.color}60`, boxShadow: `0 4px 14px ${activeMission.glow}` }
    : { background: 'linear-gradient(145deg, rgba(99,102,241,0.90) 0%, rgba(139,92,246,0.80) 100%)', border: '1.5px solid rgba(99,102,241,0.55)', boxShadow: isLight ? '0 4px 14px rgba(99,102,241,0.25)' : '0 4px 18px rgba(139,143,255,0.35)' }

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
        <div className="chat-header" style={{ flexShrink: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <motion.button className="chat-back-btn" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, backdropFilter: 'blur(20px)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', ...backBtnStyle }}>
            <ChevronLeft size={14} strokeWidth={2.5} />
            {isMission ? T.exitMission : T.backToDashboard}
          </motion.button>

          {/* Center: mission badge or session badges */}
          <div className="chat-session-badges" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
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
                <div className="chat-adapt-pill" style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 99,
                  background: isLight ? `${col}18` : `${col}12`, border: `1px solid ${isLight ? col + '50' : col + '30'}`,
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
                {/* Socratic mode toggle */}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={toggleSocratic}
                  animate={socraticActive ? { boxShadow: ['0 0 0px rgba(167,139,250,0)', '0 0 12px rgba(167,139,250,0.55)', '0 0 0px rgba(167,139,250,0)'] } : {}}
                  transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                    background: socraticActive ? 'rgba(167,139,250,0.18)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
                    border: `1.5px solid ${socraticActive ? 'rgba(167,139,250,0.50)' : isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.14)'}`,
                    color: socraticActive ? '#C4B5FD' : isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.50)',
                    fontSize: 11, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <Brain size={11} />
                  Socratic
                </motion.button>

                {/* Library */}
                <motion.button className="chat-btn-library"
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setLibraryOpen(true)}
                  style={{
                    padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                    background: isLight ? 'rgba(139,92,246,0.08)' : 'rgba(167,139,250,0.10)', border: isLight ? '1px solid rgba(139,92,246,0.22)' : '1px solid rgba(167,139,250,0.24)',
                    color: isLight ? 'rgba(109,40,217,0.80)' : 'rgba(167,139,250,0.80)', fontSize: 11, fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <BookOpen size={11} /> {T.library}
                </motion.button>

                <motion.button className="chat-btn-studyguide"
                  onClick={() => setStudyGuideOpen(true)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.15)',
                    color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em',
                  }}
                >
                  {T.studyGuide}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setFeynmanOpen(true)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                    background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)',
                    color: 'rgba(245,158,11,0.85)', fontSize: 11, fontWeight: 700,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {T.feynmanMode}
                </motion.button>
              </>
            )}
            {/* Voice toggle */}
            <motion.button
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              onClick={() => { toggleVoice(); if (isSpeaking) stopSpeaking() }}
              title={voiceEnabled ? (isSpeaking ? 'Speaking… (click to stop)' : 'Voice on') : 'Voice off'}
              style={{
                width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: voiceEnabled
                  ? isLight ? 'rgba(99,102,241,0.12)' : 'rgba(139,143,255,0.18)'
                  : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
                border: voiceEnabled
                  ? isLight ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(139,143,255,0.40)'
                  : isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.13)',
                color: voiceEnabled
                  ? isLight ? 'rgba(99,102,241,0.90)' : 'rgba(139,143,255,0.95)'
                  : isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.40)',
                boxShadow: isSpeaking ? '0 0 12px rgba(139,143,255,0.45)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <motion.div
                animate={isSpeaking ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.7, repeat: isSpeaking ? Infinity : 0 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </motion.div>
            </motion.button>

            {/* Appearance gear */}
            <motion.button
              whileHover={{ scale: 1.08, rotate: 45 }} whileTap={{ scale: 0.94 }}
              onClick={() => setChatAppSettingsOpen(true)}
              style={{ width: 30, height: 30, borderRadius: '50%', background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)', border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.13)', color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Settings size={12} />
            </motion.button>
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
                  <AevaOrb size={218} active={isActive || isSpeaking} scanMode={labOpen} personality={orbPersonality} orbGradient={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.gradient} orbAccent={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.accent} />
                  <div style={{ textAlign: 'center', padding: '0 28px', marginTop: 4 }}>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 400, color: isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.45)', lineHeight: 1.3, letterSpacing: '0.01em', marginBottom: 4 }}>
                      Hey {name},
                    </p>
                    <h1 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, color: isLight ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.95)', lineHeight: 1.05, letterSpacing: '-0.05em', margin: '0 0 20px' }}>
                      {T.whatCanIHelpWith}
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
                              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                              border: chipEditMode ? '1px solid rgba(239,68,68,0.22)' : isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)',
                              color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.60)',
                              fontSize: 13, fontWeight: 500,
                              fontFamily: "'Inter', system-ui, sans-serif",
                              cursor: chipEditMode ? 'default' : 'pointer',
                              backdropFilter: 'blur(20px)',
                              transition: 'border 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => { if (!chipEditMode) { e.currentTarget.style.borderColor = isLight ? 'rgba(99,102,241,0.40)' : 'rgba(139,143,255,0.35)'; e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' } }}
                            onMouseLeave={e => { if (!chipEditMode) { e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.60)' } }}
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
                        background: chipEditMode ? 'rgba(99,102,241,0.12)' : isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                        border: chipEditMode ? '1px solid rgba(99,102,241,0.28)' : isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
                        color: chipEditMode ? 'rgba(99,102,241,0.82)' : isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.22)',
                        fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {chipEditMode ? T.done : <><PenLine size={10} style={{ marginRight: 1 }} /> {T.customise}</>}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mini orb + mastery (tutor mode active) */}
            {!isEmpty && !isMission && (
              <div className="chat-orb-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0, gap: 8 }}>
                <AevaOrb size={72} active={isThinking || isSpeaking} scanMode={labOpen} personality={orbPersonality} orbGradient={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.gradient} orbAccent={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.accent} />
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
                <AevaOrb size={48} active={!labOpen} scanMode={labOpen} orbGradient={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.gradient} orbAccent={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.accent} />
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
                    : <ChatBubble key={i} msg={msg} deepDiveCards={deepDiveMap[i] || []} onDismissCard={(cardId) => setDeepDiveMap(prev => ({ ...prev, [i]: (prev[i] || []).filter(c => c.id !== cardId) }))} isLight={isLight} />
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
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{T.headsUp}</span> — based on {strugglePredictions[0].reason},{' '}
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
                      {T.prepNow}
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
              <div className="chat-input-bar" style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 16px', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 999, transition: 'border 0.3s, box-shadow 0.3s', ...inputBarStyle }}>
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

                    {/* Voice mode trigger */}
                    <motion.button
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.90 }}
                      onClick={() => setVoiceModeOpen(true)}
                      title="Voice mode — speak to Aeva"
                      style={{
                        flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isLight ? 'rgba(99,102,241,0.08)' : 'rgba(139,143,255,0.10)',
                        border: isLight ? '1.5px solid rgba(99,102,241,0.28)' : '1.5px solid rgba(139,143,255,0.28)',
                        cursor: 'pointer',
                        color: isLight ? 'rgba(99,102,241,0.80)' : 'rgba(139,143,255,0.80)',
                      }}
                    >
                      <Mic size={14} strokeWidth={2} />
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

      {/* Voice Mode */}
      <AnimatePresence>
        {voiceModeOpen && (
          <VoiceMode
            onClose={() => setVoiceModeOpen(false)}
            onSend={(text) => { sendWithText(text) }}
            isThinking={isThinking}
            name={name}
          />
        )}
      </AnimatePresence>

      {/* Appearance settings */}
      <AnimatePresence>
        {chatAppSettingsOpen && <AppSettingsPanel onClose={() => setChatAppSettingsOpen(false)} />}
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


      {/* Socratic ambient overlay */}
      <AnimatePresence>
        {socraticActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, border: '2px solid rgba(167,139,250,0.22)', borderRadius: 0 }}
          />
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
function LoginScreen({ onBack }) {
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
        {/* Back to landing */}
        {onBack && (
          <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 13px', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back
          </button>
        )}
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
/* ── XP Toast ─────────────────────────────────────── */
function XPToast() {
  const { pendingToast, clearToast } = useXPStore()
  useEffect(() => {
    if (!pendingToast) return
    const t = setTimeout(clearToast, 3200)
    return () => clearTimeout(t)
  }, [pendingToast])

  return (
    <AnimatePresence>
      {pendingToast && (
        <motion.div
          key={pendingToast.id}
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          style={{
            position: 'fixed', bottom: 28, right: 24, zIndex: 999,
            display: 'flex', flexDirection: 'column', gap: 4,
            background: 'rgba(8,9,26,0.96)', border: '1px solid rgba(139,143,255,0.30)',
            borderRadius: 16, padding: '12px 18px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.50)',
            fontFamily: "'Inter', system-ui, sans-serif",
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={13} color="#8B8FFF" fill="#8B8FFF" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#8B8FFF' }}>+{pendingToast.amount} XP</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>{pendingToast.label}</span>
          </div>
          {pendingToast.newOrb && (
            <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
              🔓 New orb unlocked: {pendingToast.newOrb.name}!
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [authUser, setAuthUser] = useState(undefined)
  const [showLogin, setShowLogin] = useState(false)
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('aeva_onboarded'))
  const [adminMode, setAdminMode] = useState(() => sessionStorage.getItem('aeva_admin_session') === '1')
  const [showAdminLogin, setShowAdminLogin] = useState(() => new URLSearchParams(window.location.search).has('admin'))
  const { activeMode, exitMission } = useArcadeStore()
  const { checkStreak } = useXPStore()

  useEffect(() => {
    if (activeMode) setView('chat')
  }, [activeMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user ?? null)
      if (data.session?.user) checkStreak()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null)
      if (!session) { setView('dashboard'); setShowLogin(false) }
      if (session?.user) checkStreak()
    })
    return () => subscription.unsubscribe()
  }, [])

  // Admin panel — completely separate from user auth
  if (adminMode) {
    return (
      <AdminPanel onLogout={() => {
        sessionStorage.removeItem('aeva_admin_session')
        setAdminMode(false)
      }} />
    )
  }

  if (showAdminLogin) {
    return (
      <AdminLogin
        onSuccess={() => { setAdminMode(true); setShowAdminLogin(false) }}
        onCancel={() => setShowAdminLogin(false)}
      />
    )
  }

  // Loading spinner
  if (authUser === undefined) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#08091a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <AevaOrb size={80} />
        </motion.div>
      </div>
    )
  }

  // Not logged in — landing page or login screen
  if (!authUser) {
    return showLogin
      ? <LoginScreen onBack={() => setShowLogin(false)} />
      : <LandingPage onGetStarted={() => setShowLogin(true)} />
  }

  const firstName = (authUser.user_metadata?.full_name || authUser.email)?.split(' ')[0] || 'there'

  // First-time onboarding
  if (!onboarded) {
    return (
      <Onboarding
        name={authUser.user_metadata?.full_name || firstName}
        onComplete={() => {
          localStorage.setItem('aeva_onboarded', '1')
          setOnboarded(true)
        }}
      />
    )
  }

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
      <XPToast />
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
