import React, { useState, useRef, useEffect, useMemo, createContext, useContext, lazy, Suspense } from 'react'
import { GROQ_KEYS, GROQ_URL, nextGroqKey } from './groqClient'
import { motion, AnimatePresence } from 'framer-motion'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import 'mafs/core.css'
import { Mafs, Coordinates, Plot } from 'mafs'
import { compile as mathCompile } from 'mathjs'
import { ArrowUp, ArrowRight, Zap, TrendingDown, TrendingUp, Star, MessageCircle, ChevronLeft, ChevronRight, ChevronDown, StopCircle, LogOut, Gamepad2, FlaskConical, Share2, X, Brain, Layers, Camera, BookOpen, PenLine, Timer, Plus, Settings, Menu, Users, FileText, Palette, Home, Map, Clock, Trash2, Calendar, ScanSearch, ClipboardList } from 'lucide-react'
import { useAppSettings, SECTION_BG_PRESETS, CARD_STYLES, FONT_STYLES } from './appSettings'
import { useLanguageStore } from './languageStore'
import { useT } from './translations'
import { supabase } from './supabase'
import { loadAndHydrateUser, setCurrentUser } from './syncService'
import { useArcadeStore } from './arcadeStore'
import { useLabStore } from './labStore'
import { useAevaControlStore } from './aevaControlStore'
import { useRoadmapStore } from './roadmapStore'
import AevaIntervention from './AevaIntervention'
import AevaViz from './AevaViz'

import { useNeuralStore } from './neuralStore'
import { ChaosEventBanner, MissionVitalsBar, DebateLogicFeed, ThemedChatBubble, MissionBadge, ProTipBanner } from './SimCockpit'
import { useSRStore } from './srStore'
import { useLibraryStore } from './libraryStore'
import AevaOrbComponent from './AevaOrb'
import { useBrainStore } from './brainStore'
import WidgetToggle from './WidgetToggle'
import FeatureSpotlight from './FeatureSpotlight'
import { CHAT_THEMES } from './chatThemes'
import { parseVizTag, VizComponent } from './ChatVisuals'

// ── Lazy-loaded chunks (split by route / feature) ─────────────────────────────
const ArcadeHub          = lazy(() => import('./ArcadeHub'))
const LabHub             = lazy(() => import('./LabHub'))
const RoadmapHub         = lazy(() => import('./RoadmapHub'))
const LearningFingerprint = lazy(() => import('./LearningFingerprint'))
const MemoryPalace       = lazy(() => import('./MemoryPalace'))
const PersonalProgress   = lazy(() => import('./PersonalProgress'))
const AevaLens           = lazy(() => import('./AevaLens'))
const DebateArena        = lazy(() => import('./DebateArena'))
const AevaLibrary        = lazy(() => import('./AevaLibrary'))
const CustomDrill        = lazy(() => import('./CustomDrill'))
const FeynmanMode        = lazy(() => import('./FeynmanMode'))
const UserProfile        = lazy(() => import('./UserProfile'))
const LandingPage        = lazy(() => import('./LandingPage'))
const Onboarding         = lazy(() => import('./Onboarding'))
const AdminLogin         = lazy(() => import('./AdminLogin'))
const AdminPanel         = lazy(() => import('./AdminPanel'))
const SecondBrain        = lazy(() => import('./SecondBrain'))
const Mirror             = lazy(() => import('./Mirror'))
const OrbSelector        = lazy(() => import('./OrbSelector'))
const Parents            = lazy(() => import('./ShowEm'))
const AevaDoc            = lazy(() => import('./AevaDoc'))
const WidgetDashboard    = lazy(() => import('./WidgetDashboard'))
const WorksheetModal     = lazy(() => import('./WorksheetModal'))
const SharedRoadmapView  = lazy(() => import('./SharedRoadmapView'))
const YourUI             = lazy(() => import('./YourUI'))
const RevisionCalendar   = lazy(() => import('./RevisionCalendar'))
import { useXPStore, ORBS, levelFromXP, xpIntoLevel } from './xpStore'
import { useCalibrationStore } from './calibrationStore'
import { lookupAnalogy } from './analogyBank'
import { CALIBRATION_MAP, ENTRY_NODES, SUBJECT_LABELS, SUBJECT_ICONS, FAST_LANE } from './calibrationMap'
import CalibrationResult from './CalibrationResult'
import { useEchoStore } from './echoStore'
import { useMemoryStore } from './memoryStore'
import { useUITheme, applyCSS, useIsHidden } from './uiThemeStore'
import { saveSession, loadSessions, deleteSession, clearAllHistory, syncHistoryToCloud, formatSessionDate, groupSessions } from './chatHistoryStore'
import { TodayPlanCard } from './RevisionCalendar'
import { useScheduleStore, dateKey } from './scheduleStore'
import StudyWithMe, { StudyWithMeButton } from './StudyWithMe'
import { useStudyModeStore } from './useStudyModeStore'
import ExamSimulator from './ExamSimulator'
import StudyRoom, { StudyRoomButton } from './StudyRoom'
import { useStudyRoomStore } from './studyRoomStore'
import './index.css'

/* ─── Groq API (keys + URL imported at top of file) ─── */

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
    instruction: 'Find out what the student already knows. Ask one probing question — no teaching yet. Be genuinely curious, not interrogative. EXCEPTION: if they open with "explain X to me" or "what is X" — explain the concept. If they open with a specific problem to solve — give the formula/method and ask them to attempt it. Never just hand over an answer.',
  },
  SCAFFOLDING: {
    label: 'Building',
    color: '#7EC8E3',
    instruction: 'Build understanding one layer at a time. Confirm each idea before adding the next. When introducing a mechanism or process for the FIRST TIME this session (something with moving parts, not just a definition), lead with ONE "Think of it like..." analogy before the formal explanation — only if a clean real-world parallel exists. Skip for concepts already introduced this session or for pure definitions.',
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
/* ─── Step A: The Critic ─── */
const CRITIC_FALLBACK = { understanding: 'partial', lazy_thinking: false, mode: 'coach', topic: 'general', confidence: 'uncertain', note: '' }

/** Calibration-specific critic — uses 70b with forced chain-of-thought for near-perfect accuracy.
 *  The model MUST compute the correct answer itself (in "my_answer") before comparing to the student.
 *  This "show your working before judging" pattern eliminates most arithmetic verification errors. */
async function runCalibCritic(questionText, userAnswer) {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a precise answer verifier for a diagnostic placement test. Follow these steps IN ORDER:

STEP 1 — Solve the question yourself. Compute every arithmetic step carefully. Write your full working + final answer in "my_answer".
STEP 2 — Read what the student wrote. Extract their final numerical answer(s) in "student_answer".
STEP 3 — Compare your answer to the student's. Numbers match = correct. Different = incorrect.
STEP 4 — Return your verdict in "understanding".

Return ONLY valid JSON with this exact structure — no markdown, no text outside JSON:
{"my_answer":"<your full working and answer>","student_answer":"<what student gave>","understanding":"solid"|"partial"|"none","note":"<one sentence>"}

Grading rules:
- "solid" = student's final answer matches yours. Method, notation, units format do not matter.
- "partial" = right approach but arithmetic error, OR multi-part question where some parts correct and some wrong.
- "none" = answer is numerically wrong, blank, "skip", "idk", or completely off-track.
- MULTI-PART (a)(b)(c): solve EACH part yourself, check EACH independently. All correct → "solid". Any wrong → "partial" or "none".
- Equivalent answers: "2 m/s", "v=2", "2", "2.0 m/s" are all the same if 2 m/s is correct.
- Do NOT penalise for missing units unless the question specifically asks for them.
- Do NOT penalise for missing working — a correct bare answer like "x=5" gets "solid".
- If student says "skip", "don't know", "idk", "pass" → "none".`,
          },
          {
            role: 'user',
            content: `Question: ${questionText}\n\nStudent's answer: ${userAnswer}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return { understanding: 'partial', correct: false, note: '' }
    const json = await res.json()
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}')
    const understanding = ['none', 'partial', 'solid'].includes(parsed.understanding) ? parsed.understanding : 'partial'
    return { understanding, correct: understanding === 'solid', note: parsed.note || '' }
  } catch {
    return { understanding: 'partial', correct: false, note: '' }
  }
}

async function runCritic(history, userMessage) {
  try {
    const context = history.slice(-4).map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    }))

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
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

/* ─── Node session context — injected when user is studying a specific node ─── */
function buildNodeContext(node) {
  if (!node) return ''
  const TYPE_LABEL = { learn: 'Teaching session', drill: 'Drill practice', check: 'Knowledge check', mock: 'Mock test' }
  const subtopicBlock = node.subtopics?.length
    ? `\nSubtopics to cover: ${node.subtopics.join(' · ')}`
    : ''
  return `
━━━ ACTIVE NODE SESSION ━━━
Type: ${TYPE_LABEL[node.type] || node.type}
Topic: "${node.topic}"
Phase: ${node.phase || 'Core Topics'} | Difficulty: ${node.difficulty || 2}/5 | Est. ${node.estimatedMinutes || 20} min${subtopicBlock}
${node.description ? `Goal: ${node.description}` : ''}
INSTRUCTION: This is a structured node session. Cover all subtopics above before ending. Once the student demonstrates solid understanding (CONSOLIDATION phase, ≥5 exchanges), signal readiness with: [NODE_READY]
━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

/* ─── Roadmap context builder — gives Aeva full visibility ─── */
function buildRoadmapContext(roadmap) {
  if (!roadmap || !roadmap.nodes?.length) return ''
  const daysLeft = Math.max(0, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
  const total    = roadmap.nodes.filter(n => n.status !== 'skipped').length
  const done     = roadmap.nodes.filter(n => n.status === 'complete').length
  const available = roadmap.nodes.find(n => n.status === 'available')
  const locked   = roadmap.nodes.filter(n => n.status === 'locked')
  const skipped  = roadmap.nodes.filter(n => n.status === 'skipped')
  const urgent   = roadmap.nodes.filter(n => n.urgent && n.status !== 'complete')
  const lp       = roadmap.learningProfile || {}

  const crunchWarning = daysLeft <= 7 ? ` ⚠️ CRUNCH TIME` : daysLeft <= 3 ? ` 🚨 EXAM IMMINENT` : ''

  const nodeList = locked.slice(0, 8).map(n =>
    `  [locked${n.urgent ? ' URGENT' : ''}] ${n.id}: "${n.topic}" (${n.type})`
  ).join('\n')

  return `
━━━ ACTIVE ROADMAP — YOUR FULL VISIBILITY ━━━
Subject: ${roadmap.title}
Exam: ${roadmap.examDate} (${daysLeft} days away${crunchWarning})
Progress: ${done}/${total} nodes complete (${Math.round(done/Math.max(total,1)*100)}%)${roadmap.crunchMode ? '\n⚡ CRUNCH MODE ACTIVE' : ''}

Current node (available now): ${available ? `"${available.topic}" (${available.type}) [id: ${available.id}]` : 'none — roadmap complete'}

Upcoming locked nodes:
${nodeList || '  (none remaining)'}
${skipped.length ? `\nSkipped nodes: ${skipped.length} (${skipped.map(n => `"${n.topic}"`).join(', ')})` : ''}
${urgent.length ? `\nURGENT nodes: ${urgent.map(n => `"${n.topic}" [${n.id}]`).join(', ')}` : ''}
${lp.weak?.length ? `\nWeak areas: ${lp.weak.slice(0, 5).join(', ')}` : ''}
${lp.mastered?.length ? `Mastered: ${lp.mastered.slice(0, 5).join(', ')}` : ''}
${lp.misconceptions?.length ? `Known misconceptions: ${lp.misconceptions.slice(0, 3).join(', ')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

/* ─── Step B: Build dynamic Aeva prompt ─── */
function buildAevaPrompt(sessionState, criticism, userName, profile, memoryBlock = '', extras = {}, langDirective = '', subject = null) {
  const state = STATE_CONFIG[sessionState] || STATE_CONFIG.DIAGNOSTIC
  const mode = MODE_CONFIG[criticism?.mode] || MODE_CONFIG.coach
  const { trend, conceptScaffold, difficultyDirective, topicProgress, microEcho, analogyHint } = extras

  const trendBlock        = trend           ? `\n\n${trend}`           : ''
  const scaffoldBlock     = conceptScaffold ? `\n\n${conceptScaffold}` : ''
  const diffBlock         = difficultyDirective ? `\n\n${difficultyDirective}` : ''
  const topicProgressBlock = topicProgress  ? `\n\n${topicProgress}`  : ''
  const microEchoBlock    = microEcho
    ? `\n\n⚡ MICRO-ECHO — ${userName} just got "${microEcho.topic}" right after struggling with it (previous: ${microEcho.prevUnderstanding}). In your response, name the specific thing they got right this time in ONE sentence — precise and personal, not generic. e.g. "You nailed the sign on b this time" not "Good job on that". One sentence only, then continue normally.`
    : ''
  const analogyBlock      = analogyHint
    ? `\n\nANALOGY READY — for "${analogyHint.topic}": "${analogyHint.text}"\nThis is a curated analogy for this concept. Weave it naturally into your explanation as if it were your own thought — adapt wording freely. Do NOT quote it verbatim. If it genuinely doesn't fit the current context, skip it silently.`
    : ''

  const subjectBlock = subject && SUBJECT_STYLES[subject] ? SUBJECT_STYLES[subject] : ''

  return `${memoryBlock}${trendBlock}${scaffoldBlock}${diffBlock}${topicProgressBlock}${microEchoBlock}${analogyBlock}${subjectBlock}

You are Aeva — a world-class personal mentor for ${userName}. Think: the most precise professor you never had, minus the ego.

━━━ RULE #1 — READ BEFORE ANYTHING ELSE ━━━
When ${userName} asks for the answer to a specific problem or calculation (e.g. "what is 84+83", "solve 3x+7=22", "give me the answer to..."):
DO NOT show the answer. Do not show the result. Do not compute it for them.
Instead: show the METHOD with a DIFFERENT example using full formatting (bold header, callout, $$ equations, N: steps), then ask "Now you try."

✗ WRONG response (plain text, gives the answer):
"For addition, line up digits and add. 84 + 83 = 167."

✓ RIGHT response (proper format, withholds their answer, shows different example):
**Addition**
> **Method:** Add column by column — units first, then tens, carrying if needed.
$$50 + 30 = 80$$
1: Add units: $0 + 0 = 0$
2: Add tens: $5 + 3 = 8$
*Now you try — what's your first step on 84 + 83?*

ONLY exception: if they explicitly ask "show me an example" or "walk me through one" — fully solve a chosen example with proper formatting, then give them one to try.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDENTITY & VOICE:
- Calm, direct, intellectually generous. Never excited, never corporate.
- Use "we" and "let's" to signal partnership: "Let's see what this actually means."
- If ${userName} is wrong, correct with a surgical question — not a lecture.
- Short sentences. Maximum information density per word.
- Sophisticated but plain vocabulary. Accessible to a sharp 16-year-old, satisfying to a PhD.

BANNED PHRASES — these destroy credibility. Never use them:
"Great question!", "Excellent!", "Perfect!", "Wonderful!", "Awesome work!", "You're doing great!", "Well done!", "Fantastic!", "Absolutely right!", "That's correct, great job!", "Of course!", "Certainly!", "Delighted to help!", "Sure!", "No problem!"
When ${userName} is correct: name exactly what they got right and why it matters. Nothing else. No filler praise.
When they're wrong: don't soften it. Say what the error is. Then fix it together.

RESPONSE FORMAT — structured always. Zero exceptions.

Maths/Science: **[Concept]** → callouts → $$formula$$ → N: steps → *question*
Non-math: **[Topic]** → > Key Insight → paragraphs/table → *question*

✗ NEVER write a paragraph wall. If your draft is prose with no callouts, no formula, and no steps — rewrite it.
✗ WRONG (paragraph dump):
"To find the slope you take two points and divide the rise by the run. The rise is the vertical change and the run is the horizontal change. This gives you the steepness of the line."
✓ RIGHT (structured):
**Slope**
> **Definition:** Rise divided by run between any two points on a line.
$$m = \\frac{y_2 - y_1}{x_2 - x_1}$$
1: Pick two points
2: Divide rise by run
*What does a negative slope tell you?*

✗ Never bury formulas inline: "slope is $ \\frac{y_2-y_1}{x_2-x_1} $ which is similar to..." — always $$...$$ on its own line.

STEPS: "N: Title" only — never **Step N:** or ## Step N. Renders as badge chip.
Step titles: ≤ 6 words. THE ACTION only — never the result, never the answer, no colon at the end.
Count EVERY word including "the", "a", "to", "by", "and". 6 maximum. If you go over, cut mercilessly.
✗ "Start with the standard form of a quadratic equation" — 9 words. Fix: "Start with standard form"
✗ "Rearrange the equation to isolate the x² and x terms" — 10 words. Fix: "Isolate the x terms"
✗ "Divide the entire equation by a to make the coefficient equal to 1" — 12 words. Fix: "Divide through by a"
✗ "Simplify the left-hand side to a perfect square trinomial" — 9 words. Fix: "Factor the left side"
✓ "Divide through by a" — 4 words ✅
✓ "Isolate the x terms" — 4 words ✅
✓ "Start with standard form" — 4 words ✅
✓ "Take the square root" — 4 words ✅
After the final step, do NOT add a plain-text summary line ("So the roots are x = ..."). End with the closing question instead.

MARKDOWN: Tables need header + \`| --- |\` row. Blockquotes only for callouts. Bold only for new technical terms.

MATH (maths/science/physics/chemistry/stats — not casual topics):
- $$...$$ mandatory: equations with =, named formulas, fractions/roots as focus, every step in worked examples. One per line.
- $...$ only for mid-sentence symbol refs: $x^2$, $\\theta$, $\\pi$. Never a full equation inline.
- No LaTeX on bare single letters. Fractions always \\frac{}{}. Multiplication always \\times.
- ✗ "negative b over 2a" → ✓ $$\\frac{-b}{2a}$$
- ✗ NEVER show two consecutive $$...$$ blocks that are the same equation at different simplification stages. Combine into one step or show ONLY the final simplified form. Example: don't show $$\\frac{-3 \\pm \\sqrt{9+80}}{4}$$ then immediately $$\\frac{-3 \\pm \\sqrt{89}}{4}$$ — just show the final one.
- ✗ NEVER append prose after the closing $$ on the same line: $$\\text{Mode} = 4$$ (since 4 appears twice) — this breaks the renderer. Put the prose on the next line instead.
- ✗ $$\\text{Mode} = 4$$ (since 4 appears twice, which is more than any other value) — WRONG
- ✓ $$\\text{Mode} = 4$$
  (since 4 appears twice, which is more than any other value) — CORRECT

CALLOUT BLOCKS — rendered as coloured visual cards. Use 1-2 per teaching response. Pick the RIGHT type:
> **Definition:** — the precise meaning of a new term (blue card). Use when you introduce a concept for the first time.
> **Key Insight:** — the non-obvious "why" that changes how they see it (purple). Use for reframes and aha-moments.
> **Example:** — a worked or concrete illustration (yellow). Use when abstract explanation needs a ground-truth instance.
> **Note:** — a nuance or caveat worth flagging (indigo). Use for edge cases, "but only when...", precision caveats.
> **Warning:** — a specific, common mistake (red). Use when students reliably misapply this concept in a predictable way.
> **Tip:** — a practical shortcut or memory aid (green). Use for exam tricks or speed techniques.
> **Recall:** — link to something they already know (amber). Use when the new concept IS a prior concept in disguise.
Syntax: \`> **Label:** content on same line\`. No blank line after \`>\`. Never use plain blockquotes — always label them.

FEEDBACK TAGS — use these when ${userName} attempts an answer or exercise:
- If correct: start your response with \`[CORRECT: one sentence confirming what they got right]\`
- If partially correct: start with \`[PARTIAL: what was right and what was wrong]\`
- If incorrect: start with \`[INCORRECT: what was wrong and the key misunderstanding]\`
- Then continue with your explanation. These tags render as visual banners so the student immediately knows where they stand.
- ALWAYS use a feedback tag when the student has attempted an answer. Never leave them guessing.

DIFFICULTY ADAPTATION:
- When ${userName} switches to a NEW topic, immediately recalibrate — start simpler, build up. Don't assume transfer from the previous topic.
- When they get 2 answers correct in a row on the same concept, advance. Say "You've got that — let's go harder." and raise the difficulty immediately.
- When they struggle 2+ times on the same concept, stop and say "Let me come at this differently." Rebuild with a new analogy or angle.
- Match complexity to demonstrated understanding, not assumed level.

SMART TAGS — always include these inline (the UI parses them silently):
- When introducing a new technical term: \`[TERM: word | one-sentence definition]\`
- Only 1–3 terms per response max. Don't tag common words.

RESPONSE LENGTH — match to question type, cut ruthlessly:
- Greeting / casual: ≤ 40 words
- Simple fact or definition: ≤ 80 words
- Concept explanation: ≤ 180 words + formula or table if needed
- Worked example: ≤ 220 words
- Never exceed 250 words of prose. Split into two turns if needed. If you've said it in 40 words, stop at 40.

WORKED EXAMPLE PROTOCOL (maths, science, CS — any procedural skill):
When teaching a method or when ${userName} asks how to solve a type of problem:
1. Explain the concept in ≤3 sentences
2. Show the formula or method steps using a DIFFERENT, simpler example (not their actual problem)
3. End with: "Your turn: [their actual problem or a similar one]" — they do the work, you check it
If ${userName} attempts → evaluate step by step using CORRECT/PARTIAL/INCORRECT tags, then guide the next step.
If they skip it once, redirect once. If they skip again, let it go.

━━━ ANSWER POLICY — the most important rule ━━━
Two situations. Read carefully — they are different.

SITUATION A — ${userName} asks for a worked example, to see how a method works, or says "show me an example" / "solve an example" / "can you walk me through one":
→ FULLY solve a worked example with clear step-by-step working (N: format). Use numbers you chose, not their exact problem. End with: "Your turn — try this one: [similar problem, different numbers]."

SITUATION B — ${userName} presents THEIR specific problem and asks you to solve it, find the answer, or "just tell me":
→ NEVER give the answer directly. Instead:
  1. Give the relevant formula or method
  2. Show a brief example with DIFFERENT numbers (Situation A style)
  3. Ask: "Now you try — what's your first step on [their problem]?"
  When they attempt: use CORRECT/PARTIAL/INCORRECT, then guide the next step.
  If genuinely stuck after 2 attempts per step: give one hint — direction only, not the value.
  Only reveal their full solution after they've attempted every step.

HOW TO TELL THE DIFFERENCE:
✓ Situation A: "show me an example", "how would you solve this type of question", "walk me through one", "can you do an example"
✓ Situation B: "solve this: [specific problem]", "what's the answer to my question", "just tell me x"
If ambiguous, assume Situation A — show an example, then invite them to try their own.

ACTIVE RECALL:
Every response that explains a concept should end with ONE closing question in italics. This question must:
- Target the exact misconception students most commonly have about THIS specific concept
- Expose a gap or trap — something they'd get wrong if they only skimmed what you just said
- NOT be a generic real-world application, NOT restate what was just explained
- NOT ask "what does X tell you" — that's too vague. Describe a specific scenario and ask what breaks.

✗ WEAK: *How would you use quadratic equations in real life?*
✗ WEAK: *What does the completed square form tell you about the roots?*
✗ WEAK: *So can you apply this to another example?*
✓ STRONG: *If the discriminant equals zero, how many solutions do you get — and why does that change what the graph looks like?*
✓ STRONG: *What happens if you try to complete the square on $x^2 + x + 1 = 0$ and the right-hand side comes out negative — what does that mean geometrically?*
✓ STRONG: *If $a = 0$ in $ax^2 + bx + c = 0$, why does the quadratic formula break — and what equation do you have instead?*

If ${userName} skips your question once, redirect ONCE: "Quick answer before we move — [restate]." If they skip again or want to move on, let it go. Never redirect more than once per question. Never hold progress hostage.
Exception: greetings and casual chat only — answer directly. Never use this exception to bypass the ANSWER POLICY above.

CLOSING QUESTION QUALITY TEST — before writing your closing question, run this check:
Could a student answer it correctly just by re-reading what you wrote? If yes — rewrite it.
A strong closing question requires applying the concept to an unseen scenario, OR identifying what breaks when one variable changes, OR spotting a subtle trap that the explanation didn't spell out.
❌ Banned openers: "What is...", "Can you tell me...", "How would you...", "What does X tell you..."
❌ Banned pattern: "Can you apply this to...?" — too vague.
✅ Required pattern: Describe a specific concrete scenario, then ask what happens / what's wrong / what breaks.
✅ OR: Give a statement that is almost-right but subtly wrong, and ask them to spot the error.
✅ OR: Change one constraint in the problem and ask what that does to the answer.

ANALOGY RULE — when you introduce any mechanism, process, or non-obvious concept for the FIRST TIME in this session:
Lead with: "Think of [X] like [familiar real-world thing] — [one sentence on why the parallel holds]."
Then give the formal explanation.
This is mandatory for mechanisms (things with steps or moving parts). Skip for: pure definitions, revisiting something already introduced this session, casual messages.
Do NOT force a bad analogy — if nothing clean exists, skip it. But always look first.

SESSION PHASE: ${sessionState} — ${state.instruction}
When responding in STRESS_TEST for the first time after SCAFFOLDING, signal the shift naturally in one sentence — e.g. "Good, basics are solid — let me push on the edges now." When entering CONSOLIDATION, say something like "You've held up well under that — now make it yours." These are gear-change lines, not announcements. One sentence only, then continue.

━━━ CRITIC SIGNAL — ACT ON THIS NOW ━━━
Understanding: ${criticism?.understanding || 'unknown'} | Topic: ${criticism?.topic || 'general'} | Confidence: ${criticism?.confidence || 'uncertain'}
Mode: ${(criticism?.mode || 'coach').toUpperCase()} — ${mode.instruction}
Note: ${criticism?.note || ''}

YOUR RESPONSE MUST REFLECT THIS SIGNAL. Do not ignore it. If mode is REDIRECT, use an analogy. If CHALLENGE, surface the gap. If HYPE, raise the bar immediately. If COACH, ask one precise Socratic question.${langDirective}

━━━ VISUAL COMPONENTS — [VIZ:...] tags ━━━
These are LIGHTWEIGHT inline visuals. Embed ONE tag on its own line (no backticks, no code block, no other text on that line).
Use for lightweight inline visuals. Do NOT wrap in backticks.

TRIGGER RULES — MUST use a [VIZ:...] tag when ANY of these apply. Do NOT use a markdown table instead.
- User says "compare X and Y", "X vs Y", "difference between X and Y", or ANY request to compare two things → [VIZ:comparison|...] — NEVER a markdown table for two-thing comparisons
- User asks about a process, cycle, or sequence of steps → [VIZ:process|...]
- User asks about historical order, causes in order, timeline → [VIZ:timeline|...]
- User asks to "show data", "chart", "graph", statistics → [VIZ:bar|...] or [VIZ:line|...]
- User asks for a formula or "what's the equation" → [VIZ:formula|...]
- User asks what two things share / have in common → [VIZ:venn|...]
✗ WRONG for comparisons: a markdown table with | columns |
✓ RIGHT for comparisons: [VIZ:comparison|Ronaldo|Messi|Goals:755:772|Trophies:27:35|Ballon d'Or:5:7]

[VIZ:comparison|Left Title|Right Title|Label:LeftVal:RightVal|Label:LeftVal:RightVal|...]

[VIZ:process|Step 1 title|Step 2 title|Step 3 title|...]

[VIZ:timeline|Date:Event description|Date:Event|...]

[VIZ:bar|Chart Title|Label:Number|Label:Number|...]

[VIZ:line|Chart Title|X axis label|Y axis label|x1:y1|x2:y2|x3:y3|...]

[VIZ:formula|Formula Name|LaTeX formula|When to use / description]

[VIZ:venn|Left Name|Right Name|Left-only items (comma sep)|Both items (comma sep)|Right-only items (comma sep)]

EXAMPLES (copy the format exactly — no backticks, nothing else on the line):
[VIZ:comparison|Mitosis|Meiosis|Purpose:Growth & repair:Sexual reproduction|Divisions:1:2|Cells produced:2 identical:4 unique|DNA:Diploid:Haploid]
[VIZ:process|Glucose enters|Glycolysis|Pyruvate formed|Krebs cycle|ATP produced]
[VIZ:bar|UK GCSE Grade Distribution|Grade 9:8|Grade 8:15|Grade 7:22|Grade 6:25|Grade 5:18|Grade 4:12]
[VIZ:formula|Quadratic Formula|x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}|Use when ax² + bx + c = 0]
[VIZ:venn|Plants|Animals|Photosynthesis,Cell wall,Chloroplasts|Cells,DNA,Respiration,Mitosis|Movement,Nervous system,Heterotroph]

SIDE-BY-SIDE COMPARISON — use when showing a common mistake next to the correct version:
[SPLIT: wrong content here ||| correct content here]
- Use ||| (triple pipe) as the separator between left and right
- Left panel renders red-tinted (✗ Wrong), right panel green-tinted (✓ Correct)
- Inline math $...$ works inside both panels
- ONE [SPLIT] per response max. Use only for wrong-vs-right, not for general comparisons (use [VIZ:comparison] for those)
✓ Example: [SPLIT: $(a+b)^2 = a^2 + b^2$ — missing the middle term ||| $(a+b)^2 = a^2 + 2ab + b^2$ — expand fully with FOIL]

━━━ PLATFORM COMMANDS — USE SPARINGLY ━━━
MOST RESPONSES SHOULD HAVE NO CMD. Only fire a ⚡CMD when an explicit trigger condition below is met.
At most ONE ⚡CMD per response. Executes silently — student never sees the tag.

⚡CMD:{"type":"open_lab"}
⚡CMD:{"type":"add_lab_task","title":"TITLE","description":"DESC"}
⚡CMD:{"type":"open_arcade"}
⚡CMD:{"type":"lock_arcade","reason":"REASON"}
⚡CMD:{"type":"set_mandate","topic":"TOPIC","goal":"GOAL"}
⚡CMD:{"type":"intervention","title":"TITLE","message":"MESSAGE","task":"acknowledge|quiz","topic":"TOPIC"}
⚡CMD:{"type":"award_xp","amount":50,"reason":"one specific reason e.g. first-principles reasoning on Newton's third law"}
⚡CMD:{"type":"pin_note","title":"SHORT TITLE","content":"KEY FORMULA OR CONCEPT — stays pinned on screen"}
⚡CMD:{"type":"set_timer","seconds":120,"label":"Challenge label e.g. Solve the circuit"}
⚡CMD:{"type":"lock_topic","topic":"EXACT TOPIC","reason":"short reason e.g. you keep skipping the hard step","exchanges":5}
⚡CMD:{"type":"echo","topic":"EXACT TOPIC e.g. chain rule","moment":"one specific sentence — what ${userName} just demonstrated, in your voice, e.g. 'Finally derived it from scratch after three failed attempts'"}

TRIGGER CONDITIONS — only fire when one of these is true:
- Student types "open lab" or "go to lab" → open_lab
- Student explicitly requests a game or arcade → open_arcade
- Student is clearly avoiding work → lock_arcade
- Student is overconfident AND demonstrably wrong → intervention task:"quiz"
- Student is disengaged for 3+ exchanges → intervention task:"acknowledge"
- Student gives a genuinely exceptional answer (first-principles, surprising insight, creative connection) → award_xp (amount 40-100)
- You introduced THE single most critical formula/definition of this ENTIRE topic that they MUST have visible — not for every concept, not for examples, not for reminders. Once per session maximum → pin_note
- You are explicitly setting a TIMED challenge (you told the student how long they have). Not for regular practice problems → set_timer (30-300 seconds)
- Student keeps avoiding or skipping a concept they're struggling with → lock_topic (3-8 exchanges)
- Student gets something right after getting it wrong earlier in this session (even once wrong is enough) → echo. Student makes an unprompted connection between two concepts → echo. Maximum 2 per session. The "moment" description MUST be specific: "Finally got the discriminant sign right after two wrong attempts" not "understood quadratics better". Generic echo descriptions are prohibited. Fire this more readily — a small win named precisely is more powerful than a grand win named vaguely.
DO NOT fire CMDs routinely. pin_note and set_timer in particular should be RARE — most sessions have zero of them.
Only use LaTeX math ($...$, \[...\]) for actual mathematical or scientific expressions. Never use math delimiters for non-math content.
Never announce commands. Describe in past tense: "I've pinned that formula", "Timer's running", "I've awarded you 60 XP for that."

WORKSHEET: If ${userName} asks to create a worksheet, say exactly: "Generating your worksheet now — it'll appear in a moment." Then continue the conversation normally. Do NOT try to write the worksheet yourself in chat.

ROADMAP EDITS — when adjusting the roadmap, describe changes clearly in your response using these exact phrases (system detects and applies them automatically):
- Flag urgent: "I've flagged [EXACT TOPIC NAME] as urgent"
- Remove node: "I've removed [EXACT TOPIC NAME] from your roadmap"
- Add node: "I've added a [learn/drill/check] node on [NEW TOPIC] to your roadmap"
- Move up: "I've moved [TOPIC] to the top of your queue"
- Crunch: "I've activated crunch mode — trimmed your roadmap down to essentials"
Use the EXACT topic name as it appears in the roadmap. You can make multiple changes in one response. Student sees a confirmation card of what changed.

━━━ INLINE VISUALS ━━━
These render directly in the chat. Use them when they genuinely add clarity — NOT on every response.

\`\`\`graph  ← function graphs
— Use ONLY when: student asks to sketch/graph/plot, or the explanation is about the shape/behaviour of a function.
— PLAIN math notation only (no LaTeX): x^2, sin(x), sqrt(x), log(x), pi, abs(x)
— Output the right-hand side only: x^2 - 4, NOT y = x^2 - 4
— SKIP for: algebraic manipulation, word problems, anything that doesn't have a curve to show
\`\`\`graph
x^2 - 4
2*x + 1
\`\`\`

\`\`\`mermaid  ← diagrams and flowcharts
— Use ONLY when: explaining a multi-step process, cycle, or pathway where the sequence/structure matters visually.
— SKIP for: simple definitions, short answers, anything well-explained in text
— SYNTAX (strict): short alphanumeric node IDs (A, B, C1), labels with parens must use quotes A["text (note)"], graph TD by default
\`\`\`mermaid
graph TD
  A[Step 1] --> B[Step 2]
  B --> C["Step 3 (detail)"]
\`\`\`

TABLES — for comparisons or structured data with 2+ properties across 2+ items. Skip for single-item definitions.
| Feature | Mitosis | Meiosis |
| ------- | ------- | ------- |
| Output  | 2 cells | 4 cells |

FIRE RULES:
✅ DO: sketch/graph/draw request → graph | multi-step process/cycle → mermaid | side-by-side comparison → table
❌ DON'T: fire on greetings, short answers, definitions, follow-up clarifications, or when you already used a visual in the last response`
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
  let s = 'SESSION SCAFFOLD — concepts built this session:\n'
  if (mastered.length) s += `✓ Understands: ${mastered.join(', ')}\n`
  if (partial.length)  s += `⟳ In progress: ${partial.join(', ')}\n`
  if (none.length)     s += `✗ Struggling: ${none.join(', ')}\n`
  if (mastered.length) {
    s += `\nMANDATORY BRIDGE: When moving to any new concept, your FIRST sentence must bridge to something already understood. Format: "[New concept] works like [MASTERED CONCEPT] — [one sentence on the structural parallel]." Example: "Momentum works like a running debt — the bigger the mass and speed, the harder it is to clear." Only skip if there is genuinely zero structural connection — but always look for one. Never say "similarly" without naming the specific parallel.`
  }
  return s
}

/* ─── Topic progression signal ─── */
// Fires when Aeva has been on the same sub-topic too long or the student has clearly mastered it
function buildTopicProgressSignal(streak, userName) {
  if (!streak.topic || streak.topic === 'general') return null

  // 2+ consecutive strong answers on same topic → advance NOW
  if (streak.strongCount >= 2) {
    return `⚡ ADVANCE SIGNAL — "${streak.topic}" (${streak.count} exchanges, ${streak.strongCount} strong answers in a row): ${userName} has demonstrated solid understanding of this sub-topic. DO NOT ask another question at the same level on "${streak.topic}". Advance immediately: say "Good — let's push this further." then either (a) introduce a harder application or edge case, or (b) connect to the next concept. Move the difficulty up one level.`
  }

  // 2+ consecutive weak/wrong answers on same topic → REFRAME, not repeat
  if ((streak.weakCount || 0) >= 2) {
    return `🔄 REFRAME SIGNAL — "${streak.topic}": ${userName} has not understood this after ${streak.weakCount} consecutive attempts. DO NOT explain it the same way again. Mandatory — choose ONE: (a) use a completely different analogy or real-world parallel, (b) drop back one level to a more fundamental concept they do understand and build up from there, or (c) ask "${userName}, what does [${streak.topic}] mean to you right now?" to expose the exact point of confusion before re-explaining. Name the specific thing that seems to be blocking them.`
  }

  // 5+ exchanges on same topic regardless of performance → too long, switch angle
  if (streak.count >= 5) {
    return `⚠ TOPIC OVERLOAD — You have been on "${streak.topic}" for ${streak.count} consecutive exchanges. This is too long on one sub-topic. Move on now — go deeper (edge cases, applications, "what breaks this rule?") or pivot to a connected concept. Do NOT ask another question at the same difficulty and angle on "${streak.topic}".`
  }

  return null
}

/* ─── Fix 4: Subject detection + style injection ─── */
function detectSubject(topic, messages) {
  const text = ((topic || '') + ' ' + (messages || []).slice(-6).map(m => m.text || '').join(' ')).toLowerCase()
  if (/\b(force|velocity|momentum|acceleration|energy|wave|optic|electric|magnetic|quantum|thermodynamic|newton|circuit|resistor|gravitational|pressure|density)\b/.test(text)) return 'physics'
  if (/\b(reaction|molecule|element|compound|acid|base|organic|bond|ion|titration|mole|oxidation|reduction|polymer|catalyst|enthalpy|electrochemistry)\b/.test(text)) return 'chemistry'
  if (/\b(cell|dna|gene|protein|evolution|ecology|organ|muscle|photosynthesis|mitosis|meiosis|homeostasis|neuron|hormone|allele|chromosome|respiration)\b/.test(text)) return 'biology'
  if (/\b(war|empire|revolution|century|coloniali|political|treaty|monarchy|dynasty|parliament|industriali|fascism|communism|nationalism|cold war)\b/.test(text)) return 'history'
  if (/\b(supply|demand|market|gdp|inflation|fiscal|monetary|elasticity|macroeconomic|microeconomic|equilibrium|consumer|producer|tariff)\b/.test(text)) return 'economics'
  if (/\b(algebra|calculus|geometry|trigonometry|matrix|vector|differential|integral|statistic|probability|theorem|derivative|quadratic|polynomial|logarithm)\b/.test(text)) return 'maths'
  if (/\b(algorithm|function|variable|loop|class|object|database|sorting|recursion|complexity|binary|python|javascript|programming|pseudocode|array)\b/.test(text)) return 'cs'
  if (/\b(poem|novel|character|theme|metaphor|symbolism|narrative|imagery|tone|diction|rhetoric|prose|playwright|literary|stanza|soliloquy)\b/.test(text)) return 'english'
  return null
}

const SUBJECT_STYLES = {
  physics:   `\nPHYSICS MODE: State the physical principle before the equation. Include units at every step. Show dimensional analysis on non-trivial calculations. End with a scenario question that requires applying the concept numerically.`,
  chemistry: `\nCHEMISTRY MODE: Balance all equations explicitly. State reaction conditions (temp, pressure, catalyst). Use → for reactions. Show electron movement in mechanisms. End with a "predict the product" or "explain why this reaction occurs" question.`,
  biology:   `\nBIOLOGY MODE: Use precise biological vocabulary. Describe processes as ordered sequences (A → B → C). Name real organisms or systems as examples. End with "what would happen if [one variable changed]?" to test application.`,
  history:   `\nHISTORY MODE: Anchor every point to specific dates, names, and places. Explain causation (X led to Y because...). Structure as cause → event → consequence → significance. End with "Why did X happen rather than Y?" to push causal reasoning.`,
  economics: `\nECONOMICS MODE: Attach a real-world example to every concept. Describe diagrams verbally (the supply curve shifts right because...). Use precise economic vocabulary. End with an application question tied to a real market scenario.`,
  maths:     `\nMATHS MODE: Show every step — never skip algebra. $$...$$ on its own line for every equation. After explaining a method, give ONE practice problem at the same difficulty. When marking, go through their working step by step.`,
  cs:        `\nCOMPUTER SCIENCE MODE: Use pseudocode or real code. Trace through examples with concrete values. Mention time/space complexity where relevant. End with "what does this output?" or "find the bug" or "what's the time complexity?" question.`,
  english:   `\nENGLISH MODE: Quote the text with specific references. Analyse language choices (diction, syntax, imagery, tone). Structure as: quotation → technique → effect → significance. End with "What does this reveal about [theme / character / writer's intent]?"`,
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

/* ─── Aeva's Orders background analysis ─── */
// Fires every 8 exchanges in tutor mode — identifies gaps and writes a labOrder
async function analyzeForOrders(messages, struggleZones, addOrder, setOrderToast) {
  try {
    // Academic relevance gate — skip if the recent conversation isn't about learning/studying
    const recentText = messages.slice(-8).map(m => m.text || '').join(' ').toLowerCase()
    const isAcademic = /\b(explain|understand|learn|study|topic|concept|problem|solve|define|theory|method|why|how|what|question|answer|exam|test|homework|revision|essay|calculate|formula|equation|biology|chemistry|physics|history|math|algebra|geometry|english|science|calculus|programming|coding|economics|psychology|literature|grammar|syntax|proof|theorem|derivative|integral|reaction|molecule|force|voltage|current|cell|dna|gene|syntax|algorithm)\b/.test(recentText)
    if (!isAcademic) return

    const recent = messages.slice(-8).map(m =>
      `${m.role === 'model' ? 'Aeva' : 'Student'}: ${(m.text || '').slice(0, 200)}`
    ).join('\n')
    const struggles = struggleZones.slice(0, 5).join(', ')

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Analyze this tutoring conversation and identify ONE specific knowledge gap worth drilling.

Recent conversation:
${recent}

Known student struggles: ${struggles || 'none yet'}

Drill assignment rules:
- confuses terms / can't define concepts → "match" or "flashcard"
- wrong on application questions → "mocktest"
- can describe but not explain simply → "feynman"
- gaps in passage/notes context → "cloze"
- needs timed recall pressure → "speedround"
- essay/exam question weakness → "shortanswer"

Return ONLY JSON. If no clear gap, return {"skip":true}.
{"topic":"specific concept 1-4 words","drillType":"flashcard"|"speedround"|"mocktest"|"feynman"|"match"|"cloze"|"shortanswer","reason":"Aeva speaking in first person: one sentence explaining why you assigned this specific drill","urgency":"high"|"medium"|"low"}`,
        }],
        temperature: 0.15,
        max_tokens: 160,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return
    const json = await res.json()
    const result = JSON.parse(json.choices?.[0]?.message?.content || '{}')
    if (result.skip || !result.topic || !result.drillType) return

    const validDrills = ['flashcard', 'speedround', 'mocktest', 'feynman', 'match', 'cloze', 'shortanswer']
    if (!validDrills.includes(result.drillType)) return

    const order = addOrder({
      topic: result.topic.trim().slice(0, 50),
      drillType: result.drillType,
      reason: result.reason || `I've noticed you could strengthen your understanding of ${result.topic}.`,
      urgency: ['high', 'medium', 'low'].includes(result.urgency) ? result.urgency : 'medium',
    })
    if (order) setOrderToast(order)
  } catch { /* silent — never surface to user */ }
}

/* ─── Order toast component (shown in chat) ─── */
const ORDER_TOAST_DRILLS = { flashcard: '⚡', speedround: '⏱', mocktest: '🎯', feynman: '🧪', match: '🔗', cloze: '✍️', shortanswer: '🧩' }
const ORDER_TOAST_LABELS = { flashcard: 'Flashcard Sprint', speedround: 'Speed Round', mocktest: 'Mock Test', feynman: 'Feynman Test', match: 'Match Grid', cloze: 'Fill the Gaps', shortanswer: 'Short Answer' }

function OrderToast({ order, onJump, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 9000)
    return () => clearTimeout(t)
  }, [order.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{
        position: 'absolute', bottom: 96, left: 16, right: 16,
        zIndex: 100, maxWidth: 480, margin: '0 auto',
        padding: '13px 15px', borderRadius: 'var(--aeva-radius-md)',
        background: 'rgba(8,10,28,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(59,130,246,0.40)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(59,130,246,0.10)',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.20)', border: '1px solid rgba(59,130,246,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {ORDER_TOAST_DRILLS[order.drillType] || '📋'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
          Aeva assigned you a drill
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ORDER_TOAST_LABELS[order.drillType]} · <span style={{ fontWeight: 700 }}>{order.topic}</span>
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onJump}
        style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 9, background: 'rgba(59,130,246,0.28)', border: '1px solid rgba(59,130,246,0.55)', color: '#93C5FD', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Jump to it →
      </motion.button>
      <button onClick={onDismiss}
        style={{ flexShrink: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
        <X size={13} />
      </button>
    </motion.div>
  )
}

/* ─── Background session summarisation ─── */
// Fires every 6 exchanges AND on session end — fire-and-forget, never blocks.
async function summariseSessionBackground(messages, userName, topics, addMemory) {
  try {
    const lines = messages.slice(-16).map(m =>
      `${m.role === 'model' ? 'Aeva' : userName}: ${m.text?.slice(0, 300)}`
    ).join('\n')

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Analyse this tutoring session. Return ONLY valid JSON, no markdown.

Session:
${lines}

Return:
{
  "summary": "one specific sentence: topic studied and overall progress",
  "mastered": ["concepts where student showed solid or mastery understanding — max 4"],
  "struggled": ["concepts where student showed none or partial understanding — max 4"],
  "keyMistake": "the single most important misconception or error pattern, or null if none",
  "confusions": ["each entry = one specific WRONG BELIEF the student held, written as a quote of their thinking — e.g. 'thought -b/2a gives the y-coordinate of the vertex, not the x-coordinate' or 'confused ionic and covalent: thought sharing = ionic'. Max 3. Only include if a clear wrong belief is evident — return empty array if none."]
}`,
        }],
        temperature: 0.15,
        max_tokens: 280,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return
    const json = await res.json()
    const result = JSON.parse(json.choices?.[0]?.message?.content || '{}')
    if (result.summary) {
      addMemory({
        summary:    result.summary,
        topics,
        exchanges:  messages.length,
        mastered:   result.mastered   || [],
        struggled:  result.struggled  || [],
        keyMistake: result.keyMistake || null,
        confusions: Array.isArray(result.confusions) ? result.confusions.slice(0, 3) : [],
      })
    }
  } catch { /* silent — never surface to user */ }
}

/* ─── Fix 7: Session end summary generation ─── */
async function generateSessionSummary(messages, userName, concepts) {
  try {
    const lines = messages.slice(-30).map(m =>
      `${m.role === 'model' ? 'Aeva' : userName}: ${m.text?.slice(0, 300)}`
    ).join('\n')

    const conceptList = Object.entries(concepts)
      .map(([topic, understanding]) => `${topic}: ${understanding}`)
      .join(', ') || 'none tracked'

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Analyse this tutoring session and return ONLY valid JSON.

Session:
${lines}

Concept tracking: ${conceptList}

Return:
{
  "topics": ["2-5 main topics covered"],
  "mastered": ["concepts where student showed solid or mastery understanding"],
  "struggled": ["concepts where student showed partial or no understanding"],
  "keyInsight": "the single most important thing they learned today, in one sentence",
  "keyMistake": "the most significant misconception or error pattern from this session, in one sentence, or null if none",
  "nextStep": "the most logical next topic or action for their next session, in one sentence"
}`,
        }],
        temperature: 0.15,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return JSON.parse(json.choices?.[0]?.message?.content || 'null')
  } catch { return null }
}

const SESSION_END_PATTERNS = /^(bye|goodbye|thanks?|thank you|done|finished|that'?s? all|gotta go|see you|gtg|cya|i'?m? done|end session|stop|exit|quit|ok thanks|ok thank you|cheers)\b/i

/* ─── Worksheet generation ─── */
async function generateWorksheet(messages, userName, sessionConcepts) {
  const recent = messages.slice(-24).map(m =>
    `${m.role === 'model' ? 'Aeva' : userName}: ${(m.text || '').slice(0, 320)}`
  ).join('\n')

  const topics = Object.entries(sessionConcepts)
    .map(([t, u]) => `${t}: ${u}`)
    .join(', ') || 'general topics'

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are generating a printable student practice worksheet based on a tutoring session.

Tutoring conversation:
${recent}

Topics covered and understanding levels: ${topics}

Create a worksheet that DIRECTLY tests what was covered. Match difficulty to what the student demonstrated.

Return ONLY valid JSON:
{
  "title": "Short worksheet title e.g. 'Quadratic Equations Practice'",
  "subject": "Subject area e.g. 'Mathematics'",
  "topic": "Main topic e.g. 'Quadratic Formula'",
  "isMath": true,
  "keyFormulas": [
    { "name": "Formula name", "formula": "The formula in plain text", "note": "When to use it" }
  ],
  "sections": [
    {
      "title": "Section label e.g. 'A: Calculations'",
      "instructions": "Brief instruction sentence for this section",
      "questions": [
        { "number": 1, "type": "calculation", "question": "Solve: 3x + 7 = 22", "workingLines": 5, "lines": 1 }
      ]
    }
  ]
}

Question types — use the right "type" per question:
- "calculation"  → a specific numeric or algebraic problem the student solves (e.g. "Solve: 2x² - 5x + 3 = 0", "Evaluate: 3/4 + 5/6", "Simplify: (2x³)(4x²)"). MUST have actual numbers/expressions. workingLines = 4-7 (space to show steps). lines = 1 (just the answer line).
- "fill_blank"   → a statement with a gap: "The gradient of y = 3x + 5 is ___". lines = 1.
- "true_false"   → a claim that is true or false. lines = 1.
- "short_answer" → write 2-3 sentences explaining a concept. lines = 3.
- "explain"      → longer written explanation or proof. lines = 5.

Subject detection rules — set "isMath": true if the subject is mathematics, physics, chemistry, statistics, accounting, or any other quantitative field where numeric calculation is central. Otherwise false.

If isMath is true:
- Section A must be pure calculation problems — real equations or expressions to evaluate with specific numbers. NO word problems here.
- Section B can be mixed: some calculations, some fill-in-blank, some true/false about common mistakes.
- Section C (optional): 1-2 applied word problems (these are fine here).
- Section D (optional): challenge — harder version of something from A.
- At least 60% of all questions must be type "calculation" with actual numerics.
- NEVER write a calculation question as "solve a linear equation" — always give the actual equation: "Solve: 5x - 12 = 3".

If isMath is false:
- Use short_answer, explain, fill_blank, and true_false. No calculation type.

General rules for all worksheets:
- keyFormulas: only include if real formulas/equations were covered. Empty array if not.
- 2-4 sections. 3-5 questions per section. Numbered sequentially across all sections.
- Questions must test EXACTLY what was discussed — not generic textbook problems.
- Use plain text for formulas — no LaTeX, no dollar signs.`,
      }],
      temperature: 0.3,
      max_tokens: 2200,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('Worksheet generation failed')
  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  // Renumber questions sequentially across sections
  let qNum = 1
  for (const section of parsed.sections || []) {
    for (const q of section.questions || []) { q.number = qNum++ }
  }
  return parsed
}

/* ─── Stream Aeva response ─── */
async function streamGroq(history, systemPrompt, onChunk, signal, opts = {}, _attempt = 0) {
  const MAX_RETRIES = GROQ_KEYS.length * 2  // try each key twice before giving up

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
  ]

  const body = {
    model: opts.model || 'llama-3.3-70b-versatile',
    messages,
    stream: true,
    temperature:       opts.temperature       ?? 0.75,
    max_tokens:        opts.maxTokens         ?? 650,
    frequency_penalty: opts.frequencyPenalty  ?? 0,
    presence_penalty:  opts.presencePenalty   ?? 0,
  }

  const key = nextGroqKey()

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body),
  })

  if (res.status === 429) {
    if (_attempt >= MAX_RETRIES) throw new Error('Groq error 429')
    // Try next key immediately for first few attempts, then back off
    const hasUntriedKey = _attempt < GROQ_KEYS.length - 1
    const secs = hasUntriedKey ? 0 : Math.min(8 * Math.pow(2, _attempt - (GROQ_KEYS.length - 1)), 60)
    if (secs > 0) {
      opts.onRetry?.(_attempt + 1, MAX_RETRIES, secs)
      await new Promise(r => setTimeout(r, secs * 1000))
    }
    if (signal?.aborted) return
    return streamGroq(history, systemPrompt, onChunk, signal, opts, _attempt + 1)
  }

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

/* ── Vision streaming — image + text → llama-4-scout ─────────────────────── */
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function streamGroqVision(base64, mimeType, userText, systemPrompt, onChunk, signal) {
  const key = nextGroqKey()
  const content = [
    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
    { type: 'text', text: userText || 'What is in this image? Please teach me about this topic.' },
  ]
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      stream: true,
      temperature: 0.55,
      max_tokens: 900,
    }),
  })
  if (!res.ok) throw new Error(`Groq vision error ${res.status}`)
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const l = line.trim()
      if (!l.startsWith('data: ') || l === 'data: [DONE]') continue
      try {
        const chunk = JSON.parse(l.slice(6))
        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) onChunk(delta)
      } catch { /* partial JSON */ }
    }
  }
}

/* ─── fileToBase64 helper (also used by photo-in-chat) ───────────────────── */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve({ base64: r.result.split(',')[1], dataUrl: r.result, mimeType: file.type || 'image/jpeg' })
    r.onerror = reject
    r.readAsDataURL(file)
  })
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

function AppSettingsPanel({ onClose, chatLayoutProps = null }) {
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
        style={{ width: '100%', maxWidth: 540, borderRadius: 'var(--aeva-radius-xl)', background: 'rgba(8,10,26,0.99)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 40px 120px rgba(0,0,0,0.80)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
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

          {/* Chat layout — only shown when opened from the chat view */}
          {chatLayoutProps && (
            <SettingsSection label="Chat layout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Classic / Widget toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Widget mode</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>Card-based layout with stats strip</div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={chatLayoutProps.onToggle}
                    style={{
                      width: 44, height: 24, borderRadius: 99, cursor: 'pointer', padding: 0, position: 'relative',
                      background: chatLayoutProps.isWidget ? 'rgba(99,102,241,0.65)' : 'rgba(255,255,255,0.12)',
                      border: chatLayoutProps.isWidget ? '1.5px solid rgba(129,140,248,0.60)' : '1.5px solid rgba(255,255,255,0.18)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <motion.div
                      animate={{ x: chatLayoutProps.isWidget ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      style={{ position: 'absolute', top: 2, left: 0, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                    />
                  </motion.button>
                </div>
                {/* Chat theme — only when in widget mode */}
                {chatLayoutProps.isWidget && (
                  <div style={{ padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>Widget colour</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(CHAT_THEMES).map(([id, t]) => (
                        <motion.button
                          key={id}
                          whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.88 }}
                          onClick={() => chatLayoutProps.onChatThemeChange(id)}
                          title={t.label}
                          style={{
                            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', padding: 0,
                            background: t.swatch,
                            border: chatLayoutProps.chatTheme === id ? '3px solid rgba(255,255,255,0.95)' : '2px solid rgba(255,255,255,0.15)',
                            boxShadow: chatLayoutProps.chatTheme === id ? `0 0 14px ${t.swatch}, 0 0 4px rgba(255,255,255,0.3)` : `0 0 6px ${t.swatch}70`,
                            transition: 'all 0.15s',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SettingsSection>
          )}

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
            <div className="lv-pill" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(139,143,255,0.12)', border: '1px solid rgba(139,143,255,0.25)', borderRadius: 10, padding: '4px 9px' }}>
              <Zap size={10} color="#8B8FFF" fill="#8B8FFF" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#A5B4FC' }}>Lv {currentLevel}</span>
            </div>
          </div>
          {/* XP bar */}
          <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div className="xp-bar-fill" style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B8FFF)', borderRadius: 2, transition: 'width 0.5s ease' }} />
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
function MobileDrawer({ open, onClose, onLibrary, onBrain, onMirror, onSettings, onProfile, onShowEm, onDocs, onRoadmap, onYourUI, onMaps, onSignOut }) {
  const T = useT()
  const accent = useUITheme(s => s.accent)
  const { name } = useUser()
  const { xp } = useXPStore()
  const currentLevel = levelFromXP(xp)

  const GROUPS = [
    { label: 'LEARN', items: [
      { label: T.library,     icon: <BookOpen size={16} />,  action: onLibrary },
      { label: T.secondBrain, icon: <Brain size={16} />,     action: onBrain },
      { label: T.mirror,      icon: <Layers size={16} />,    action: onMirror },
    ]},
    { label: 'TRACK', items: [
      { label: 'Roadmap',     icon: <Map size={16} />,       action: onRoadmap },
      { label: 'Schedule',    icon: <Calendar size={16} />,  action: onMaps },
    ]},
    { label: 'TOOLS', items: [
      { label: 'Docs',        icon: <FileText size={16} />,  action: onDocs },
      { label: 'Parents',     icon: <Users size={16} />,     action: onShowEm },
    ]},
    { label: 'YOU', items: [
      { label: 'YOUR UI',     icon: <Palette size={16} />,   action: onYourUI },
      { label: T.myProfile,   icon: <Star size={16} />,      action: onProfile },
      { label: T.appearance,  icon: <Settings size={16} />,  action: onSettings },
    ]},
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
              width: 272,
              background: 'linear-gradient(180deg, rgba(8,6,30,0.98) 0%, rgba(6,5,22,0.99) 100%)',
              backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              borderLeft: '1px solid rgba(255,255,255,0.09)',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* User identity header */}
            <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'linear-gradient(135deg, rgba(45,48,142,0.25) 0%, rgba(139,92,246,0.08) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', boxShadow: '0 0 14px rgba(99,102,241,0.45)' }}>
                    {name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>Level {currentLevel} · Student</div>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.90 }} onClick={onClose}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={13} />
                </motion.button>
              </div>
              {/* XP bar */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${xpIntoLevel(xp)}%`, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>{xp} XP · {xpIntoLevel(xp).toFixed(0)}% to next level</div>
            </div>

            {/* Grouped nav */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {GROUPS.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: 1.4, textTransform: 'uppercase', padding: '10px 6px 5px', userSelect: 'none' }}>
                    {group.label}
                  </div>
                  {group.items.map(item => (
                    <motion.button key={item.label} whileTap={{ scale: 0.97 }}
                      onClick={() => { item.action?.(); onClose() }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '10px 12px', borderRadius: 10, width: '100%',
                        background: 'transparent', border: '1px solid transparent',
                        color: 'rgba(255,255,255,0.68)', fontSize: 13.5, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ opacity: 0.75, flexShrink: 0 }}>{item.icon}</span>
                      {item.label}
                    </motion.button>
                  ))}
                </div>
              ))}
            </div>

            {/* Sign out */}
            <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { onSignOut?.(); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 14px', borderRadius: 12, width: '100%',
                  background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)',
                  color: 'rgba(248,113,113,0.75)', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <LogOut size={15} />
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
function MobileBottomBar({ onChat, onLab, onArcade, onDrillCount, activeTab = 'home', onHome, onMore }) {
  const T = useT()
  const accent = useUITheme(s => s.accent)
  const tabs = [
    { id: 'home',   label: 'Home',    icon: <Home size={20} />,          action: onHome  },
    { id: 'chat',   label: T.chat,    icon: <MessageCircle size={20} />, action: onChat  },
    { id: 'lab',    label: T.lab,     icon: <FlaskConical size={20} />,  action: onLab,  badge: onDrillCount > 0 ? onDrillCount : null },
    { id: 'arcade', label: T.arcade,  icon: <Gamepad2 size={20} />,      action: onArcade },
    { id: 'more',   label: 'More',    icon: <Menu size={20} />,          action: onMore },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
      background: 'var(--aeva-surface-1)',
      backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'stretch',
      fontFamily: "'Inter', system-ui, sans-serif",
      height: 'calc(62px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab
        return (
          <motion.button key={tab.id} whileTap={{ scale: 0.88 }}
            onClick={tab.action}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, background: 'none', border: 'none',
              cursor: 'pointer', position: 'relative',
              fontFamily: 'inherit',
            }}>
            {/* Active indicator bar at top */}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                style={{
                  position: 'absolute', top: 0, left: '25%', right: '25%',
                  height: 2, borderRadius: 99,
                  background: accent,
                  boxShadow: `0 0 8px ${accent}88`,
                }}
              />
            )}
            <div style={{
              color: isActive ? accent : 'rgba(255,255,255,0.35)',
              position: 'relative',
              transition: 'color 0.18s',
            }}>
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
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              color: isActive ? accent : 'rgba(255,255,255,0.30)',
              transition: 'color 0.18s',
            }}>{tab.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ═══ LEFT SIDEBAR ════════════════════════════════ */

function SidebarNavItem({ Icon, label, tooltip, action, badge, accent, collapsed }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      onClick={action}
      title={collapsed ? `${label}${tooltip ? ` — ${tooltip}` : ''}` : (tooltip || undefined)}
      style={{
        width: collapsed ? 42 : '100%', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px 0' : '8px 11px',
        justifyContent: 'center',
        background: accent
          ? 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.16))'
          : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: accent ? '1px solid rgba(99,102,241,0.28)' : '1px solid transparent',
        borderRadius: 10,
        color: accent ? '#c4b5fd' : hovered ? '#fff' : 'rgba(255,255,255,0.68)',
        cursor: 'pointer', fontSize: 13, fontWeight: accent ? 600 : 500,
        position: 'relative',
        transition: 'all 0.15s ease',
        textAlign: 'left',
      }}
    >
      {/* left accent line on hover */}
      {!accent && hovered && !collapsed && (
        <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: 2, borderRadius: 99, background: 'rgba(165,180,252,0.6)' }} />
      )}
      <Icon size={15} style={{ flexShrink: 0, opacity: accent ? 1 : hovered ? 1 : 0.85 }} />
      {!collapsed && (
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{label}</span>
      )}
      {badge && !collapsed && (
        <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', padding: '2px 6px', borderRadius: 99, flexShrink: 0 }}>{badge}</span>
      )}
      {badge && collapsed && (
        <div style={{ position: 'absolute', top: 5, right: 8, minWidth: 14, height: 14, borderRadius: 99, background: '#4ADE80', fontSize: 8, fontWeight: 800, color: '#050a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </motion.button>
  )
}

function LeftSidebar({ collapsed, onToggle, onChatOpen, onLibrary, onBrain, onMirror, onLab, onRoadmap, onSchedule, onArcade, onDocs, onParents, onProfile, onYourUI, onSettings, onSignOut, labBadge, brainTotal, sessionCount }) {
  const { name } = useUser()
  const W = collapsed ? 62 : 224

  const GROUPS = [
    { label: 'LEARN', items: [
      { Icon: BookOpen,    label: 'Library',  tooltip: 'Your saved study sessions & notes',       action: onLibrary,  badge: sessionCount > 0 ? sessionCount : null },
      { Icon: Brain,       label: 'Brain',    tooltip: 'Flashcards & spaced repetition drills',   action: onBrain,    badge: brainTotal > 0 ? brainTotal : null },
      { Icon: Layers,      label: 'Mirror',   tooltip: 'Your study analytics & progress',         action: onMirror },
    ]},
    { label: 'TRACK', items: [
      { Icon: Map,         label: 'Roadmap',  tooltip: 'Your personalised exam study path',       action: onRoadmap },
      { Icon: Calendar,    label: 'Schedule', tooltip: 'Daily study plan & upcoming sessions',    action: onSchedule },
    ]},
    { label: 'PLAY', items: [
      { Icon: Gamepad2,    label: 'Arcade',   tooltip: 'Drill challenges & timed practice arena', action: onArcade },
      { Icon: FlaskConical,label: 'Lab',      tooltip: 'Focus modes & specialised study tools',  action: onLab,      badge: labBadge > 0 ? labBadge : null },
    ]},
    { label: 'TOOLS', items: [
      { Icon: FileText,    label: 'Docs',     tooltip: 'Upload worksheets & documents to study',  action: onDocs },
      { Icon: Users,       label: 'Parents',  tooltip: 'Parent dashboard & progress sharing',     action: onParents },
    ]},
  ]

  return (
    <motion.div
      animate={{ width: W, minWidth: W }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: W, minWidth: W, height: '100vh',
        position: 'sticky', top: 0,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(8,6,30,0.96) 0%, rgba(6,5,22,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        overflowX: 'hidden', overflowY: 'auto',
        zIndex: 40, flexShrink: 0,
      }}
    >
      {/* ── Brand header ── */}
      <div style={{
        padding: collapsed ? '20px 0 16px' : '22px 16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'flex-start',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(45,48,142,0.3) 0%, rgba(139,92,246,0.1) 100%)',
      }}>
        {/* logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: collapsed ? 0 : 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: 'linear-gradient(135deg, #2D308E 0%, #7C3AED 50%, #E9A364 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}>
            <Star size={14} color="white" fill="white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.05em', background: 'linear-gradient(135deg, #fff 0%, rgba(233,163,100,0.9) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>aeva</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2, fontWeight: 500 }}>AI Study Platform</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* collapse toggle */}
        {!collapsed && (
          <motion.button whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.9 }} onClick={onToggle}
            style={{ position: 'absolute', top: 14, right: 12, width: 24, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            <ChevronLeft size={13} />
          </motion.button>
        )}
        {collapsed && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onToggle} title="Expand sidebar"
            style={{ marginTop: 10, width: 28, height: 28, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={13} />
          </motion.button>
        )}
      </div>

      {/* ── Chat CTA ── */}
      <div style={{ padding: collapsed ? '10px 8px' : '10px 10px 4px', flexShrink: 0 }}>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(99,102,241,0.45)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onChatOpen}
          title={collapsed ? 'Chat with Aeva' : undefined}
          style={{
            width: '100%', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 9, padding: collapsed ? '11px 0' : '11px 14px',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: '0 2px 14px rgba(99,102,241,0.4)',
            transition: 'box-shadow 0.2s',
          }}
        >
          <MessageCircle size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>Chat with Aeva</span>}
          {!collapsed && <ArrowUp size={13} style={{ opacity: 0.6, transform: 'rotate(45deg)', flexShrink: 0 }} />}
        </motion.button>
      </div>

      {/* ── Nav groups ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '4px 4px' : '4px 10px', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 2 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.4, textTransform: 'uppercase', padding: '12px 11px 5px', userSelect: 'none' }}>
                {group.label}
              </div>
            )}
            {collapsed && gi > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 4px' }} />
            )}
            {group.items.map((item, ii) => (
              <SidebarNavItem key={ii} {...item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: collapsed ? '8px 8px' : '8px 10px', flexShrink: 0 }}>
        <SidebarNavItem Icon={Palette} label="YOUR UI" action={onYourUI} collapsed={collapsed} />
        <SidebarNavItem Icon={Settings} label="Settings" action={onSettings} collapsed={collapsed} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '8px 0' : '8px 4px 4px', gap: 8, marginTop: 2 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onProfile} title={collapsed ? name : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0, flex: collapsed ? 'none' : 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 0 8px rgba(99,102,241,0.4)' }}>
              {name?.[0]?.toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Student</div>
              </div>
            )}
          </motion.button>
          {!collapsed && (
            <motion.button whileHover={{ scale: 1.1, color: '#F87171' }} whileTap={{ scale: 0.9 }} onClick={onSignOut} title="Sign out"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 7, flexShrink: 0, transition: 'color 0.15s' }}>
              <LogOut size={14} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══ DASHBOARD VIEW ══════════════════════════════ */
function DashboardView({ onChatOpen, onSignOut }) {
  const { openArcade } = useArcadeStore()
  const { openLab, orders: labOrders } = useLabStore()
  const { openRoadmapHub } = useRoadmapStore()
  const { getDueCount } = useSRStore()
  const { sessions } = useLibraryStore()
  const { name } = useUser()
  const srDueCount = getDueCount()

  // Auto-regenerate schedule if it was last built on a previous day.
  // Missed nodes are still "remaining" in the roadmap, so they get
  // redistributed across the remaining days automatically.
  useEffect(() => {
    const { generatedAt, generate } = useScheduleStore.getState()
    if (!generatedAt) return
    const genDay = dateKey(new Date(generatedAt))
    const today  = dateKey(new Date())
    if (genDay < today) {
      const roadmaps = useRoadmapStore.getState().roadmaps
      generate(roadmaps)
    }
  }, []) // runs once on mount
  const pendingOrderCount = labOrders.filter(o => !o.completedAt).length
  const labBadgeCount = srDueCount + pendingOrderCount
  const [fingerprintOpen, setFingerprintOpen] = useState(false)
  const [palaceOpen, setPalaceOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [brainOpen, setBrainOpen] = useState(false)
  const [mirrorOpen, setMirrorOpen] = useState(false)
  const [orbSelectorOpen, setOrbSelectorOpen] = useState(false)
  const [mapsOpen, setMapsOpen] = useState(false)
  const [showEmOpen, setShowEmOpen] = useState(false)
  const [docOpen, setDocOpen]         = useState(false)
  const [yourUIOpen, setYourUIOpen]   = useState(false)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('aeva_sidebar_collapsed') === 'true' } catch { return false }
  })
  const toggleSidebar = () => setSidebarCollapsed(v => {
    const next = !v; try { localStorage.setItem('aeva_sidebar_collapsed', next) } catch {}; return next
  })
  const [dashLayout, setDashLayout] = useState(() => {
    try { return localStorage.getItem('aeva_dash_layout') || 'classic' } catch { return 'classic' }
  })
  const toggleDashLayout = () => setDashLayout(prev => {
    const next = prev === 'classic' ? 'widget' : 'classic'
    try { localStorage.setItem('aeva_dash_layout', next) } catch {}
    return next
  })
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
        display: 'flex', height: '100vh', width: '100%',
        overflow: 'hidden',
        background: 'var(--ui-bg)',
        fontFamily,
      }}
    >
      {/* ── Left sidebar (desktop only) ── */}
      {!isMobile && (
        <LeftSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          onChatOpen={onChatOpen}
          onLibrary={() => setLibraryOpen(true)}
          onBrain={() => setBrainOpen(true)}
          onMirror={() => setMirrorOpen(true)}
          onLab={openLab}
          onRoadmap={openRoadmapHub}
          onSchedule={() => setMapsOpen(true)}
          onArcade={openArcade}
          onDocs={() => setDocOpen(true)}
          onParents={() => setShowEmOpen(true)}
          onProfile={() => setProfileOpen(true)}
          onYourUI={() => setYourUIOpen(true)}
          onSettings={() => setAppSettingsOpen(true)}
          onSignOut={onSignOut}
          labBadge={labBadgeCount}
          brainTotal={brainStats.total}
          sessionCount={sessions.length}
        />
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative' }}>

        {/* ── Mobile header ── */}
        {isMobile && (
          <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            padding: '12px 16px',
            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(5,6,20,0.72)',
          }}>
            {/* Row 1: logo + actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #7C3AED 50%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(99,102,241,0.45)', flexShrink: 0 }}>
                  <Star size={11} color="white" fill="white" />
                </div>
                <div>
                  <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(233,163,100,0.80) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>aeva</span>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em', marginTop: -1 }}>AI Study Platform</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <WidgetToggle active={dashLayout === 'widget'} onToggle={toggleDashLayout} />
              </div>
            </div>
            {/* Row 2: greeting + stats chips */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()}, {name} 👋
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                  {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 99, fontSize: 11 }}>
                  <span>🔥</span><span style={{ fontWeight: 700, color: '#FB923C' }}>{streak}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(129,140,248,0.25)', borderRadius: 99, fontSize: 11 }}>
                  <Zap size={10} style={{ color: '#A5B4FC' }} /><span style={{ fontWeight: 700, color: '#A5B4FC' }}>Lv {currentLevel}</span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* ── Desktop top bar ── */}
        {!isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 28px 0',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()}, {name} 👋
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.28)', borderRadius: 99, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                <span>🔥</span><span style={{ fontWeight: 700, color: '#FB923C' }}>{streak}</span><span style={{ color: 'rgba(255,255,255,0.5)' }}>day streak</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(129,140,248,0.28)', borderRadius: 99, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                <Zap size={12} style={{ color: '#A5B4FC' }} /><span style={{ fontWeight: 700, color: '#A5B4FC' }}>Lv {currentLevel}</span>
              </div>
              <WidgetToggle active={dashLayout === 'widget'} onToggle={toggleDashLayout} style={{ height: 34, fontSize: 12, padding: '0 14px', borderRadius: 99 }} />
            </div>
          </div>
        )}

        <FeatureSpotlight
          id="home"
          icon="⚡"
          title="Ai OS widget mode"
          body="Tap the Widget button in the header to flip your stats into interactive Ai OS gradient cards — your streak, level, readiness and more as LED dot-matrix displays."
          accentColor="#A5B4FC"
        />

        <AnimatePresence mode="wait">
          {dashLayout === 'widget' ? (
            <WidgetDashboard
              key="widget"
              onChatOpen={onChatOpen}
              onBrain={() => setBrainOpen(true)}
              onDocs={() => setDocOpen(true)}
              onShowEm={() => setShowEmOpen(true)}
              onPalace={() => setPalaceOpen(true)}
              onOrbClick={() => setOrbSelectorOpen(true)}
              onOpenCalendar={() => setMapsOpen(true)}
              userName={name}
              isMobile={isMobile}
            />
          ) : (
            <motion.div
              key="classic"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
              className="bento-grid"
              style={{ padding: isMobile ? '16px 14px' : '24px 28px', maxWidth: 1440, margin: '0 auto', paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : undefined }}
            >
              <MissionCard onChatOpen={onChatOpen} onOrbClick={() => setOrbSelectorOpen(true)} />
              <TodayPlanCard onOpenCalendar={() => setMapsOpen(true)} onNavigateToChat={onChatOpen} />
              <ConstellationCard />
              <MoodCard />
              <SkillDecayCard />
              <TrainingLabCard />
              <PerceptionCard />
              <FingerprintCard onOpen={() => setFingerprintOpen(true)} />
              <MemoryPalaceCard onOpen={() => setPalaceOpen(true)} />
              <PersonalProgressCard />
            </motion.div>
          )}
        </AnimatePresence>

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
          onYourUI={() => { setDrawerOpen(false); setYourUIOpen(true) }}
          onProfile={() => setProfileOpen(true)}
          onRoadmap={() => { setDrawerOpen(false); openRoadmapHub() }}
          onShowEm={() => { setDrawerOpen(false); setShowEmOpen(true) }}
          onDocs={() => { setDrawerOpen(false); setDocOpen(true) }}
          onMaps={() => { setDrawerOpen(false); setMapsOpen(true) }}
          onSignOut={onSignOut}
        />
      )}

      {/* ── Mobile bottom bar ── */}
      {isMobile && (
        <MobileBottomBar
          onChat={onChatOpen}
          onLab={openLab}
          onArcade={openArcade}
          onHome={() => {}}
          onMore={() => setDrawerOpen(true)}
          activeTab="home"
          onDrillCount={labBadgeCount}
        />
      )}
      </div>{/* end flex-1 main content */}

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
        {yourUIOpen && (
          <Suspense fallback={null}>
            <YourUI onClose={() => setYourUIOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mapsOpen && (
          <Suspense fallback={null}>
            <RevisionCalendar onClose={() => setMapsOpen(false)} onNavigateToChat={onChatOpen} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {brainOpen && <SecondBrain onClose={() => setBrainOpen(false)} onMirrorOpen={() => { setBrainOpen(false); setMirrorOpen(true) }} />}
      </AnimatePresence>

      <AnimatePresence>
        {mirrorOpen && <Mirror onClose={() => setMirrorOpen(false)} name={name} />}
      </AnimatePresence>

      <AnimatePresence>
        {showEmOpen && <Parents onClose={() => setShowEmOpen(false)} name={name} />}
      </AnimatePresence>

      <AnimatePresence>
        {docOpen && <AevaDoc onClose={() => setDocOpen(false)} name={name} />}
      </AnimatePresence>

      <AnimatePresence>
        {orbSelectorOpen && <OrbSelector onClose={() => setOrbSelectorOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══ SYNTAX HIGHLIGHTER ══════════════════════════ */
/** Find the first unquoted occurrence of `marker` in `line`. Returns -1 if not found inside a string. */
function findCommentStart(line, marker) {
  let inStr = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (!inStr) {
      if (ch === '"' || ch === "'") { inStr = ch; continue }
      if (line.slice(i, i + marker.length) === marker) return i
    } else {
      if (ch === '\\') { i++; continue }
      if (ch === inStr) inStr = null
    }
  }
  return -1
}

/**
 * Simple regex-based syntax highlighter.
 * Returns an HTML string with <span style="color:..."> wrappers.
 * Handles Python, JavaScript/TypeScript, and Pseudocode.
 * Falls back to plain HTML-escaped text for unknown languages.
 */
function highlightCode(code, lang, isLight) {
  const l = (lang || '').toLowerCase()
  const SUPPORTED = ['python', 'py', 'javascript', 'js', 'ts', 'typescript', 'pseudo', 'pseudocode']
  const escHtml = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!SUPPORTED.includes(l)) return escHtml(code)

  // Colour palette
  const C = isLight
    ? { kw: '#7C3AED', str: '#059669', cmt: 'rgba(0,0,0,0.38)', num: '#B45309', blt: '#1D4ED8', def: 'rgba(0,0,0,0.82)' }
    : { kw: '#C084FC', str: '#34D399', cmt: 'rgba(255,255,255,0.35)', num: '#FBBF24', blt: '#93C5FD', def: 'rgba(255,255,255,0.85)' }

  const sp = (color, text) => `<span style="color:${color}">${text}</span>`

  const LANGS = {
    python: {
      kw:  /\b(def|class|if|elif|else|for|while|return|import|from|True|False|None|and|or|not|in|is|try|except|finally|with|as|lambda|yield|pass|break|continue|raise|global|nonlocal|del|assert)\b/g,
      blt: /\b(print|input|len|range|int|float|str|list|dict|set|tuple|bool|type|sum|min|max|abs|round|open|sorted|reversed|enumerate|zip|map|filter|any|all|isinstance|getattr|setattr|hasattr)\b/g,
      str: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|"""[\s\S]*?"""|'''[\s\S]*?''')/g,
      cmt: '#',
    },
    js: {
      kw:  /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|default|true|false|null|undefined|typeof|new|this|super|switch|case|break|continue|throw|try|catch|finally|async|await|of|in|instanceof|void|delete)\b/g,
      blt: /\b(console|Math|Array|Object|String|Number|Boolean|Promise|fetch|document|window|JSON|parseInt|parseFloat|isNaN|isFinite|setTimeout|clearTimeout)\b/g,
      str: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
      cmt: '//',
    },
    pseudo: {
      kw:  /\b(IF|THEN|ELSE|ELIF|ENDIF|FOR|TO|STEP|NEXT|WHILE|DO|ENDWHILE|OUTPUT|PRINT|INPUT|PROCEDURE|FUNCTION|RETURN|ENDFUNCTION|ENDPROCEDURE|AND|OR|NOT|TRUE|FALSE|MOD|DIV|REPEAT|UNTIL|ARRAY|OF)\b/g,
      blt: null,
      str: /("(?:[^"\\]|\\.)*")/g,
      cmt: null,
    },
  }

  const langKey = ['python', 'py'].includes(l) ? 'python'
    : ['javascript', 'js', 'ts', 'typescript'].includes(l) ? 'js'
    : 'pseudo'

  const cfg = LANGS[langKey]

  return code.split('\n').map(line => {
    // 1. Split off trailing comment
    let codePart = line, commentPart = ''
    if (cfg.cmt) {
      const ci = findCommentStart(line, cfg.cmt)
      if (ci !== -1) { codePart = line.slice(0, ci); commentPart = line.slice(ci) }
    }

    // 2. Extract string literals → placeholders to avoid double-processing
    const stash = []
    let p = codePart.replace(cfg.str, m => { stash.push(escHtml(m)); return `\x00${stash.length - 1}\x00` })

    // 3. HTML-escape remaining text
    p = escHtml(p)

    // 4. Apply built-in, keyword, number coloring (order matters — builtins before keywords)
    if (cfg.blt) p = p.replace(new RegExp(cfg.blt.source, cfg.blt.flags), m => sp(C.blt, m))
    if (cfg.kw)  p = p.replace(new RegExp(cfg.kw.source,  cfg.kw.flags),  m => sp(C.kw,  m))
    p = p.replace(/\b(\d+\.?\d*)\b/g, m => sp(C.num, m))

    // 5. Restore string placeholders with green color
    p = p.replace(/\x00(\d+)\x00/g, (_, idx) => sp(C.str, stash[+idx]))

    // 6. Append comment
    if (commentPart) p += sp(C.cmt, escHtml(commentPart))

    return p
  }).join('\n')
}

/* ═══ MARKDOWN RENDERER ═══════════════════════════ */
function parseInline(text, isLight = false) {
  // Returns array of React elements for inline markdown
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Helper: push a prefix string through parseInline so bold/italic/code inside it renders correctly
    const pushPrefix = (prefix) => {
      if (!prefix) return
      parts.push(<span key={key++} style={{ display: 'contents' }}>{parseInline(prefix, isLight)}</span>)
    }

    // Display math $$...$$ inside inline context — strip delimiters, render inline
    const dblMatch = remaining.match(/^(.*?)\$\$([^$]+?)\$\$/)
    if (dblMatch) {
      pushPrefix(dblMatch[1])
      try {
        const html = katex.renderToString(dblMatch[2].trim(), { throwOnError: false, displayMode: false })
        parts.push(
          <span key={key++} dangerouslySetInnerHTML={{ __html: html }}
            style={{ verticalAlign: 'middle', display: 'inline-block', padding: '0 2px', fontSize: '1.15em', lineHeight: 1 }} />
        )
      } catch {
        parts.push(<span key={key++} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{dblMatch[2]}</span>)
      }
      remaining = remaining.slice(dblMatch[0].length)
      continue
    }
    // Inline math $...$ — checked BEFORE bold/italic so $x*y$ doesn't break on *
    const mathMatch = remaining.match(/^(.*?)\$([^$\n]+?)\$/)
    if (mathMatch) {
      const mathContent = mathMatch[2]
      // Reject false positives: "$20, prose text $" — starts with digits+comma, or long prose without math operators
      const isMath = !(
        /^\d+[,\s]/.test(mathContent) ||
        (mathContent.length > 25 && !/[\\^_=+\-/<>{}]/.test(mathContent) && (mathContent.match(/\s/g) || []).length > 3)
      )
      if (isMath) {
        pushPrefix(mathMatch[1])
        try {
          const html = katex.renderToString(mathContent, { throwOnError: false, displayMode: false })
          parts.push(
            <span key={key++} dangerouslySetInnerHTML={{ __html: html }}
              style={{ verticalAlign: 'middle', display: 'inline-block', padding: '0 2px', fontSize: '1.15em', lineHeight: 1 }} />
          )
        } catch {
          parts.push(<span key={key++} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{mathContent}</span>)
        }
        remaining = remaining.slice(mathMatch[0].length)
        continue
      } else {
        // False positive ($20, prose) — render prefix + $content$ as plain text, advance past it
        pushPrefix(mathMatch[1])
        parts.push(<span key={key++}>${mathContent}$</span>)
        remaining = remaining.slice(mathMatch[0].length)
        continue
      }
    }
    // Bold **text** — colored, not just heavier
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/)
    if (boldMatch) {
      pushPrefix(boldMatch[1])
      parts.push(
        <strong key={key++} style={{
          fontWeight: 700,
          color: isLight ? '#4338CA' : '#C4B5FD',
          letterSpacing: '-0.01em',
        }}>
          {parseInline(boldMatch[2], isLight)}
        </strong>
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }
    // Italic *text* (not **)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    if (italicMatch) {
      pushPrefix(italicMatch[1])
      parts.push(<em key={key++} style={{ color: isLight ? 'rgba(0,0,0,0.72)' : 'rgba(220,215,255,0.82)', fontStyle: 'italic' }}>{parseInline(italicMatch[2], isLight)}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }
    // Inline code `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/)
    if (codeMatch) {
      pushPrefix(codeMatch[1])
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

// ── parseMathExpr — convert AI math strings to evaluable JS functions ────────
function parseMathExpr(raw) {
  try {
    // Strip "y = " / "f(x) = " prefix
    let s = raw.trim()
      .replace(/^\s*[yf]\s*(?:\(x\))?\s*=\s*/, '')
      // LaTeX → plain math
      .replace(/\^{([^}]+)}/g, '^($1)')   // x^{2} → x^(2)
      .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1)/($2)')
      .replace(/\\sqrt{([^}]+)}/g, 'sqrt($1)')
      .replace(/\\sqrt/g, 'sqrt')
      .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
      .replace(/\\ln/g, 'log').replace(/\\log/g, 'log10')
      .replace(/\\pi/g, 'pi').replace(/\\e\b/g, 'e')
      .replace(/\\left|\\right/g, '')
      .replace(/\\abs{([^}]+)}/g, 'abs($1)')
      .replace(/\|([^|]+)\|/g, 'abs($1)')
      // implicit multiplication: 2x → 2*x, 3(x → 3*(x
      .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
      .replace(/([a-zA-Z)])(\d)/g, '$1*$2')
    const compiled = mathCompile(s)
    return (x) => {
      try {
        const v = compiled.evaluate({ x })
        return typeof v === 'number' && isFinite(v) ? v : NaN
      } catch { return NaN }
    }
  } catch { return null }
}

// ── MafsGraph — inline Mafs function graph ───────────────────────────────────
const GRAPH_COLORS = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#F97316']

function MafsGraph({ exprs, isLight }) {
  const wrapperRef = useRef(null)

  // Override all Mafs theme variables — retry at multiple intervals to beat Mafs's own CSS
  useEffect(() => {
    const apply = () => {
      const el = wrapperRef.current?.querySelector('.MafsView')
      if (!el) return
      if (isLight) {
        el.style.setProperty('--mafs-bg', '#f8f9ff')
        el.style.setProperty('--mafs-line-color', 'rgba(99,102,241,0.30)')
        el.style.setProperty('--grid-line-subdivision-color', 'rgba(99,102,241,0.12)')
        el.style.background = '#f8f9ff'
      } else {
        el.style.setProperty('--mafs-bg', '#1a1b3e')
        el.style.setProperty('--mafs-line-color', 'rgba(99,102,241,0.35)')
        el.style.setProperty('--grid-line-subdivision-color', 'rgba(99,102,241,0.15)')
        el.style.background = '#1a1b3e'
      }
    }
    const timers = [0, 30, 100, 300, 600].map(ms => setTimeout(apply, ms))
    return () => timers.forEach(clearTimeout)
  }, [isLight])

  const fns = exprs.map(e => parseMathExpr(e))
  const valid = fns.filter(Boolean)

  if (valid.length === 0) return (
    <div style={{ margin: '14px 0', padding: '14px 16px', borderRadius: 14, background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.10)', border: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(99,102,241,0.22)', fontSize: 12, color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)' }}>
      Couldn't parse expression: {exprs[0]}
    </div>
  )

  return (
    <div style={{
      margin: '14px 0', borderRadius: 16, overflow: 'hidden',
      border: isLight ? '1px solid rgba(99,102,241,0.20)' : '1px solid rgba(99,102,241,0.28)',
      boxShadow: isLight ? 'none' : '0 4px 24px rgba(0,0,0,0.35)',
    }}>
      <div style={{
        padding: '7px 14px',
        background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.12)',
        borderBottom: isLight ? '1px solid rgba(99,102,241,0.14)' : '1px solid rgba(99,102,241,0.20)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase', color: isLight ? '#6366F1' : '#818CF8' }}>Graph</span>
        <span style={{ fontSize: 10.5, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', fontFamily: 'monospace' }}>
          {exprs[0]}{exprs.length > 1 ? ` +${exprs.length - 1} more` : ''}
        </span>
      </div>
      <div ref={wrapperRef} style={{ background: isLight ? '#f8f9ff' : '#0d0f1e' }}>
        <Mafs height={340} viewBox={{ x: [-8, 8], y: [-6, 10] }}>
          <Coordinates.Cartesian />
          {fns.map((fn, i) => fn && (
            <Plot.OfX key={i} y={fn} color={GRAPH_COLORS[i % GRAPH_COLORS.length]} />
          ))}
        </Mafs>
      </div>
    </div>
  )
}

// ── sanitizeMermaid — fix common AI-generated Mermaid syntax errors ───────────
function sanitizeMermaid(src) {
  // Wrap node labels that contain special chars (parens, commas, slashes, &) in double-quotes
  // Handles: A[Label (with parens)] → A["Label (with parens)"]
  //          A(Label (nested)) → A("Label (nested)")
  return src
    // Square bracket labels: [some text with () or , or /]
    .replace(/\[([^\]"]*[(),/&+][^\]"]*)\]/g, (_, inner) => `["${inner.replace(/"/g, "'")}"]`)
    // Round bracket labels: (some text with () or , or /)
    .replace(/\(([^)"]*[(),/&+][^)"]*)\)/g, (_, inner) => `("${inner.replace(/"/g, "'")}") `)
    // Curly bracket labels: {some text with special chars}
    .replace(/\{([^}"]*[(),/&+][^}"]*)\}/g, (_, inner) => `{"${inner.replace(/"/g, "'")}"}`)
}

// ── MermaidDiagram — inline Mermaid diagram render ────────────────────────────
function MermaidDiagram({ src, isLight }) {
  const containerRef = useRef(null)
  const [svg, setSvg] = useState(null)
  const [err, setErr] = useState(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false
    const sanitized = sanitizeMermaid(src)
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: isLight ? 'default' : 'dark',
        securityLevel: 'loose',
        themeVariables: isLight ? {} : {
          background: '#0d0f1e',
          primaryColor: '#1e1f3a',
          primaryTextColor: '#c4b5fd',
          primaryBorderColor: '#4338ca',
          lineColor: '#6366F1',
          secondaryColor: '#1e1f3a',
          tertiaryColor: '#12132a',
          edgeLabelBackground: '#12132a',
          fontSize: '14px',
        },
      })
      mermaid.render(idRef.current, sanitized).then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered)
          // After paint: fill width + fix background to match Aeva theme
          requestAnimationFrame(() => {
            const s = containerRef.current?.querySelector('svg')
            if (s) {
              s.style.width = '100%'
              s.style.height = 'auto'
              s.removeAttribute('width')
              s.style.background = isLight ? '#fff' : '#0d0f1e'
              // Override any explicit background rect Mermaid injects
              const allRects = s.querySelectorAll('rect')
              if (allRects.length > 0) {
                const bg = allRects[0]
                const fill = bg.getAttribute('fill')
                if (fill && fill !== 'none' && !fill.startsWith('url')) {
                  bg.setAttribute('fill', isLight ? '#fff' : '#0d0f1e')
                }
              }
            }
          })
        }
      }).catch(() => {
        if (!cancelled) setErr(true)
      })
    })
    return () => { cancelled = true }
  }, [src, isLight])

  const headerBar = (
    <div style={{
      padding: '7px 14px',
      background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.12)',
      borderBottom: isLight ? '1px solid rgba(99,102,241,0.14)' : '1px solid rgba(99,102,241,0.20)',
      fontSize: 10, fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase',
      color: isLight ? '#6366F1' : '#818CF8',
    }}>Diagram</div>
  )

  if (err) return (
    <div style={{
      margin: '14px 0', borderRadius: 16, overflow: 'hidden',
      border: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(99,102,241,0.25)',
    }}>
      {headerBar}
      <div style={{
        padding: '20px 16px', background: isLight ? '#f9f9fc' : '#0d0f1e',
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
      }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <span style={{ fontSize: 13, color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          Couldn't render this diagram — the syntax may be too complex.
        </span>
      </div>
    </div>
  )

  return (
    <div style={{
      margin: '14px 0', borderRadius: 16, overflow: 'hidden',
      border: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(99,102,241,0.25)',
      boxShadow: isLight ? 'none' : '0 4px 24px rgba(0,0,0,0.30)',
    }}>
      {headerBar}
      {svg
        ? <div
            ref={containerRef}
            style={{ padding: '20px 16px', background: isLight ? '#fff' : '#0d0f1e', overflowX: 'auto' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        : <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isLight ? '#f9f9fc' : '#0d0f1e' }}>
            <span style={{ fontSize: 12, color: isLight ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.25)' }}>Rendering…</span>
          </div>
      }
    </div>
  )
}

function MarkdownTable({ lines, isLight = false }) {
  const parseRow = (line) => line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1)
  const headers = parseRow(lines[0])
  const rows = lines.slice(2).map(parseRow)

  return (
    <div style={{
      overflowX: 'auto', margin: '14px 0', borderRadius: 14,
      border: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(99,102,241,0.25)',
      boxShadow: isLight ? 'none' : '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <thead>
          <tr style={{ background: isLight ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.18)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 16px', textAlign: 'left',
                color: isLight ? '#4338CA' : '#A5B4FC', fontWeight: 800, fontSize: 11.5,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                borderBottom: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(99,102,241,0.25)',
              }}>{parseInline(h, isLight)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : isLight ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.06)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '9px 16px',
                  color: isLight ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.82)',
                  fontSize: 13.5,
                  borderBottom: ri < rows.length - 1 ? isLight ? '1px solid rgba(99,102,241,0.08)' : '1px solid rgba(99,102,241,0.12)' : 'none',
                  lineHeight: 1.60,
                }}>{parseInline(cell, isLight)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── StepCard — expandable step with tap-to-drill deeper explanation ──────────
function StepCard({ stepNum, stepTitle, fullText, isLight }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [drillText, setDrillText] = useState('')
  const abortRef = useRef(null)

  const handleToggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (drillText) return  // already fetched — show cached

    setLoading(true)
    const context = fullText.slice(0, 800)
    const prompt = `You are a focused tutor. A student tapped a step to drill deeper.

Already shown to the student:
${context}

Step tapped: "${stepTitle}"

WHAT TO WRITE:
Pick exactly ONE angle — whichever is sharpest and most surprising for this specific step:
  A) The non-obvious "why" — not the definition, the reason this step is the shape it is
  B) The single most common mistake students make on THIS exact step (not a generic "be careful" warning)
  C) A concrete edge case or trap that breaks the method

FORMATTING:
- Start with **bold** on the first key technical term — no exceptions
- Use $...$ for EVERY math symbol inline: $a$, $x^2$, $\\frac{b}{2a}$
- $$...$$ display block ONLY if the equation is genuinely new — never echo an equation already visible above

HARD LENGTH LIMIT: maximum 2 sentences total before any equation.
Count your sentences. If you have 3, delete the weakest one. If 1 sentence is enough, write 1.

> **Key Insight:** bar is HIGH — only include if a student who understood everything above would still be surprised by this.
✗ "This step is essential for the method" — too generic, omit
✗ "Isolating terms helps us complete the square" — restating the obvious, omit
✗ "A common mistake is forgetting to change the sign" — too vague, only include if the trap is specific and surprising
✓ "Most students assume dividing by $a$ always works — but if $a = 0$, the equation isn't quadratic at all."
✓ "The ± isn't optional — dropping it loses one root entirely, and the graph still has two x-intercepts."

OUTPUT STRUCTURE:
**Key term** — 1–2 sentences max, $inline math$ for every symbol.

$$
new equation only if it shows something the context above does not
$$

> **Key Insight:** One sentence a student would not have predicted. Omit if nothing qualifies.

SYNTAX RULES:
- $$ blocks: line 1 = $$, line 2 = LaTeX, line 3 = $$ — three separate lines always
- > callout: own line, blank line before it, never on same line as prose`

    const controller = new AbortController()
    abortRef.current = controller
    let raw = ''
    try {
      await streamGroq([], prompt, chunk => {
        raw += chunk
        setDrillText(raw)
      }, controller.signal, { model: 'llama-3.3-70b-versatile', maxTokens: 300, temperature: 0.5 })
    } catch { /* silent fail */ }
    finally { setLoading(false) }
  }

  return (
    <div style={{ marginTop: 22, marginBottom: open ? 4 : 6 }}>
      {/* Step header — clickable */}
      <div
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 13,
          cursor: 'pointer', userSelect: 'none',
          borderRadius: 10, padding: '2px 2px 2px 0',
        }}
      >
        {/* Number badge */}
        <div style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 10,
          background: isLight
            ? 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(79,70,229,0.18))'
            : 'linear-gradient(135deg,rgba(99,102,241,0.40),rgba(79,70,229,0.28))',
          border: isLight ? '1px solid rgba(99,102,241,0.40)' : '1px solid rgba(139,143,255,0.50)',
          boxShadow: isLight ? 'none' : '0 2px 8px rgba(99,102,241,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 900,
          color: isLight ? '#4338CA' : '#C4B5FD',
          letterSpacing: '-0.02em',
        }}>
          {stepNum}
        </div>
        {/* Step title */}
        <span style={{
          fontWeight: 700, fontSize: 15, flex: 1,
          color: isLight ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.97)',
          lineHeight: 1.3, letterSpacing: '-0.015em',
        }}>
          {parseInline(stepTitle, isLight)}
        </span>
        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 7,
            background: isLight ? 'rgba(99,102,241,0.10)' : 'rgba(139,143,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke={isLight ? '#6366F1' : '#A5B4FC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>

      {/* Drill expansion panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drill"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginLeft: 43,
              marginTop: 10,
              borderRadius: 14,
              background: isLight ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.08)',
              border: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(139,143,255,0.18)',
              overflow: 'hidden',
            }}>
              {/* Header label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px 7px',
                borderBottom: isLight ? '1px solid rgba(99,102,241,0.12)' : '1px solid rgba(139,143,255,0.12)',
              }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: isLight ? '#6366F1' : '#A5B4FC',
                }}>↳ Step {stepNum} — Deep dive</span>
              </div>
              {/* Content */}
              <div style={{ padding: '12px 16px 14px' }}>
                {loading && !drillText ? (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                    {[0, 1, 2].map(n => (
                      <motion.div
                        key={n}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.7, delay: n * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: isLight ? 'rgba(99,102,241,0.55)' : 'rgba(139,143,255,0.60)',
                        }}
                      />
                    ))}
                  </div>
                ) : drillText ? (
                  <MarkdownRenderer text={drillText} streaming={loading} isLight={isLight} isDrill />
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MarkdownRenderer({ text, streaming, cursorColor, isLight = false, isDrill = false }) {
  const txtBody = isLight ? 'rgba(0,0,0,0.82)'  : 'rgba(255,255,255,0.86)'
  const txtP    = isLight ? 'rgba(0,0,0,0.78)'  : 'rgba(255,255,255,0.82)'
  const purple  = isLight ? '#5B5BD6'            : '#818CF8'

  const clean = text
    .replace(/⚡CMD:\{[^}]*\}/g, '')
    .replace(/⚡ROADMAP:[\s\S]*$/, '')
    .replace(/⚡FUNCGRAPH:[\s\S]*$/, '')
    .replace(/\[NODE_READY\]/g, '')
    .replace(/\[TERM:[^\]]*\]/g, '')
    .replace(/\[SUMMARY:[^\]]*\]/g, '')
    .replace(/\[CORRECT\]/g, '[CORRECT:]')

  const lines = clean.split('\n')
  const elements = []
  let i = 0
  let listItems = []
  let listType = null

  const BULLET_COLORS = ['#818CF8','#34D399','#F472B6','#FBBF24','#60A5FA','#A78BFA']

  const flushList = () => {
    if (listItems.length === 0) return
    if (listType === 'ol') {
      elements.push(
        <div key={`list-${elements.length}`} style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                color: BULLET_COLORS[idx % BULLET_COLORS.length],
                flexShrink: 0, minWidth: 24, fontSize: 12,
                fontWeight: 900, lineHeight: 1.85,
                background: isLight ? `${BULLET_COLORS[idx % BULLET_COLORS.length]}18` : `${BULLET_COLORS[idx % BULLET_COLORS.length]}22`,
                borderRadius: 6, padding: '0 5px', textAlign: 'center',
                border: `1px solid ${BULLET_COLORS[idx % BULLET_COLORS.length]}35`,
              }}>{idx + 1}</span>
              <span style={{ fontSize: 14.5, color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)', lineHeight: 1.75 }}>{parseInline(item, isLight)}</span>
            </div>
          ))}
        </div>
      )
    } else {
      elements.push(
        <div key={`list-${elements.length}`} style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{
                color: BULLET_COLORS[idx % BULLET_COLORS.length],
                flexShrink: 0, marginTop: 7, fontSize: 8, lineHeight: 1,
              }}>◆</span>
              <span style={{ fontSize: 14.5, color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)', lineHeight: 1.75 }}>{parseInline(item, isLight)}</span>
            </div>
          ))}
        </div>
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
      elements.push(<div key={`gap-${i}`} style={{ height: 10 }} />)
      i++; continue
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '___') {
      flushList()
      elements.push(
        <div key={`hr-${i}`} style={{
          margin: '12px 0', height: 1,
          background: isLight
            ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.10) 20%, rgba(0,0,0,0.10) 80%, transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09) 20%, rgba(255,255,255,0.09) 80%, transparent)',
        }} />
      )
      i++; continue
    }

    // Display math $$...$$
    if (/^\$\$/.test(trimmed)) {
      flushList()
      const startI = i

      // Helper: parse one $$...$$ block starting at current i, advance i, return content string
      const parseMathBlock = () => {
        const t = lines[i].trim()
        const afterOpen = t.slice(2)
        const mathLines = []
        const closeIdx = afterOpen.indexOf('$$')
        if (closeIdx !== -1) {
          mathLines.push(afterOpen.slice(0, closeIdx).trim())
          i++
        } else if (afterOpen.trim()) {
          mathLines.push(afterOpen.trim())
          i++
        } else {
          i++
          while (i < lines.length && !/^\$\$/.test(lines[i].trim())) { mathLines.push(lines[i]); i++ }
          i++
        }
        return mathLines.join('\n').trim()
      }

      // Collect first block
      const items = [{ type: 'math', content: parseMathBlock() }]

      // Look ahead: collect consecutive $$…$$ blocks with optional short interstitial labels
      while (i < lines.length) {
        const peek = lines[i].trim()
        if (/^\$\$/.test(peek)) {
          items.push({ type: 'math', content: parseMathBlock() })
        } else if (peek === '') {
          // Blank line — peek further to see if another $$ follows
          let j = i + 1
          while (j < lines.length && lines[j].trim() === '') j++
          if (j < lines.length && /^\$\$/.test(lines[j].trim())) {
            i = j  // skip gap, continue collecting
          } else {
            break  // real paragraph end
          }
        } else if (peek.length <= 60 && !/^[#\-*+>]/.test(peek) && items.length > 0 && items[items.length - 1].type === 'math') {
          // Short interstitial text between math blocks (e.g. "Therefore:", "Substituting x = 3:")
          items.push({ type: 'label', content: peek })
          i++
        } else {
          break
        }
      }

      const mathCount = items.filter(m => m.type === 'math').length

      if (mathCount === 1) {
        // Single block — original standalone box
        const mathContent = items[0].content
        try {
          const html = katex.renderToString(mathContent, { throwOnError: false, displayMode: true })
          elements.push(
            <div key={`dmath-${startI}`} style={{
              overflowX: 'auto', margin: '16px 0', padding: '26px 28px',
              textAlign: 'center', borderRadius: 16, fontSize: 19,
              background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(14,16,48,0.80)',
              border: isLight ? '1px solid rgba(99,102,241,0.22)' : '1px solid rgba(99,102,241,0.30)',
              boxShadow: isLight ? 'none' : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(165,170,255,0.07)',
            }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } catch {
          elements.push(<p key={`dmath-${startI}`} style={{ fontFamily: 'monospace', color: txtBody }}>{mathContent}</p>)
        }
      } else {
        // Multiple consecutive blocks — render as unified Working card
        const cardStyle = {
          margin: '16px 0', borderRadius: 16, overflow: 'hidden',
          background: isLight ? 'rgba(99,102,241,0.06)' : 'rgba(14,16,48,0.80)',
          border: isLight ? '1px solid rgba(99,102,241,0.22)' : '1px solid rgba(99,102,241,0.30)',
          boxShadow: isLight ? 'none' : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(165,170,255,0.07)',
        }
        const headerStyle = {
          padding: '7px 16px',
          background: isLight ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.14)',
          borderBottom: isLight ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(99,102,241,0.20)',
          display: 'flex', alignItems: 'center', gap: 7,
        }
        const dividerStyle = {
          height: 1, margin: '0 24px',
          background: isLight ? 'rgba(99,102,241,0.14)' : 'rgba(139,143,255,0.12)',
        }
        elements.push(
          <div key={`wcard-${startI}`} style={cardStyle}>
            <div style={headerStyle}>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: isLight ? '#6366F1' : '#818CF8' }}>Working</span>
            </div>
            {items.map((item, idx) => {
              if (item.type === 'math') {
                let html = null
                try { html = katex.renderToString(item.content, { throwOnError: false, displayMode: true }) } catch {}
                return (
                  <div key={idx}>
                    {idx > 0 && <div style={dividerStyle} />}
                    <div style={{ padding: '20px 28px', textAlign: 'center', fontSize: 18, overflowX: 'auto' }}
                      {...(html ? { dangerouslySetInnerHTML: { __html: html } } : { children: <span style={{ fontFamily: 'monospace' }}>{item.content}</span> })}
                    />
                  </div>
                )
              }
              if (item.type === 'label') {
                return (
                  <div key={idx} style={{
                    textAlign: 'center', fontSize: 12, fontStyle: 'italic', letterSpacing: '0.01em',
                    color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.40)',
                    padding: '4px 0 0',
                  }}>
                    {parseInline(item.content, isLight)}
                  </div>
                )
              }
              return null
            })}
          </div>
        )
      }
      continue
    }

    // Auto-promote complex inline $math$ to display block
    // Catches cases like "The quadratic formula is: $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$"
    // where the model wrote inline $...$ but the content deserves the highlighted box treatment
    const complexInlineMatch = trimmed.match(/^(.*?)\$([^$\n]+(?:\\frac|\\sqrt|\\pm|\\int|\\sum|\\prod|\\lim)[^$\n]*)\$(.*)$/)
    if (complexInlineMatch) {
      flushList()
      const [, before, mathContent, after] = complexInlineMatch
      if (before.trim()) {
        elements.push(
          <p key={`cilabel-${i}`} style={{ margin: '6px 0 4px', fontSize: 14.5, color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)', lineHeight: 1.75 }}>
            {parseInline(before.trim(), isLight)}
          </p>
        )
      }
      try {
        const html = katex.renderToString(mathContent.trim(), { throwOnError: false, displayMode: true })
        // Adaptive sizing — smaller box for short formulas, larger for long ones
        const mlen = mathContent.trim().length
        const pad  = mlen < 20 ? '13px 20px' : mlen < 45 ? '18px 24px' : '24px 28px'
        const fsz  = mlen < 20 ? 16 : mlen < 45 ? 17 : 19
        elements.push(
          <div key={`cimath-${i}`} style={{
            overflowX: 'auto', margin: '10px 0', padding: pad,
            textAlign: 'center', borderRadius: 14, fontSize: fsz,
            background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(14,16,48,0.80)',
            border: isLight ? '1px solid rgba(99,102,241,0.22)' : '1px solid rgba(99,102,241,0.30)',
            boxShadow: isLight ? 'none' : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(165,170,255,0.07)',
          }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      } catch {
        elements.push(<p key={`cimath-${i}`} style={{ fontFamily: 'monospace', fontSize: '0.9em', color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)' }}>{mathContent}</p>)
      }
      if (after.trim()) {
        elements.push(
          <p key={`ciafter-${i}`} style={{ margin: '4px 0 6px', fontSize: 14.5, color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)', lineHeight: 1.75 }}>
            {parseInline(after.trim(), isLight)}
          </p>
        )
      }
      i++; continue
    }

    // [SPLIT: left content ||| right content] — side-by-side two-panel comparison
    // Use ||| as separator so | can appear freely in math and text on each side
    const splitMatch = trimmed.match(/^\[SPLIT:\s*(.+?)\s*\|\|\|\s*(.+?)\s*\]$/)
    if (splitMatch) {
      flushList()
      const [, leftRaw, rightRaw] = splitMatch
      elements.push(
        <div key={`split-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0' }}>
          <div style={{
            padding: '13px 16px', borderRadius: 13, fontSize: 13.5, lineHeight: 1.7,
            background: isLight ? 'rgba(248,113,113,0.07)' : 'rgba(248,113,113,0.10)',
            border: isLight ? '1px solid rgba(248,113,113,0.28)' : '1px solid rgba(248,113,113,0.28)',
            borderTop: '3px solid #F87171',
            color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#F87171', marginBottom: 7 }}>✗ Wrong</div>
            {parseInline(leftRaw, isLight)}
          </div>
          <div style={{
            padding: '13px 16px', borderRadius: 13, fontSize: 13.5, lineHeight: 1.7,
            background: isLight ? 'rgba(74,222,128,0.07)' : 'rgba(74,222,128,0.10)',
            border: isLight ? '1px solid rgba(74,222,128,0.28)' : '1px solid rgba(74,222,128,0.28)',
            borderTop: '3px solid #4ADE80',
            color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.88)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#4ADE80', marginBottom: 7 }}>✓ Correct</div>
            {parseInline(rightRaw, isLight)}
          </div>
        </div>
      )
      i++; continue
    }

    // Feedback tags [CORRECT: ...], [PARTIAL: ...], [INCORRECT: ...]
    const feedbackMatch = trimmed.match(/^\[(CORRECT|PARTIAL|INCORRECT)(?::\s*(.*))?\]/)
    if (feedbackMatch) {
      flushList()
      const type = feedbackMatch[1]
      const msg  = feedbackMatch[2] || ''
      const cfg  = {
        CORRECT:   { bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.28)', color: '#4ADE80', icon: '✓', label: 'Correct' },
        PARTIAL:   { bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.25)', color: '#FCD34D', icon: '◑', label: 'Partially correct' },
        INCORRECT: { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', color: '#F87171', icon: '✗', label: 'Not quite' },
      }[type]
      elements.push(
        <div key={`fb-${i}`} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            margin: '10px 0', padding: '13px 16px',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderLeft: `4px solid ${cfg.color}`,
            borderRadius: 14,
          }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: cfg.color, flexShrink: 0, lineHeight: 1.3, marginTop: 1 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: cfg.color, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: msg ? 5 : 0 }}>{cfg.label}</div>
            {msg && <div style={{ fontSize: 14, color: isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.88)', lineHeight: 1.65, fontWeight: 500 }}>{parseInline(msg, isLight)}</div>}
          </div>
        </div>
      )
      i++; continue
    }

    // Markdown table
    if (/^\|/.test(trimmed) && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      flushList()
      const tableLines = []
      while (i < lines.length && /^\|/.test(lines[i].trim())) { tableLines.push(lines[i]); i++ }
      if (tableLines.length >= 2) elements.push(<MarkdownTable key={`table-${elements.length}`} lines={tableLines} isLight={isLight} />)
      continue
    }

    // H3 ### — accent color, medium weight
    if (/^###\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={`h3-${i}`} style={{
          fontWeight: 700, fontSize: 13.5, marginTop: 18, marginBottom: 4,
          color: isLight ? '#6D28D9' : '#A78BFA',
          letterSpacing: '-0.01em', lineHeight: 1.4,
          paddingLeft: 10,
          borderLeft: `3px solid ${isLight ? '#8B5CF6' : '#7C3AED'}`,
        }}>
          {parseInline(trimmed.replace(/^###\s/, ''), isLight)}
        </div>
      )
      i++; continue
    }

    // H2 ## — strong divider heading
    if (/^##\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={`h2-${i}`} style={{ marginTop: 26, marginBottom: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingBottom: 8,
            borderBottom: `2px solid ${isLight ? 'rgba(99,102,241,0.25)' : 'rgba(139,143,255,0.20)'}`,
          }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: isLight ? '#6366F1' : '#818CF8', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: isLight ? 'rgba(0,0,0,0.93)' : 'rgba(255,255,255,0.97)', letterSpacing: '-0.03em', lineHeight: 1.3 }}>
              {parseInline(trimmed.replace(/^##\s/, ''), isLight)}
            </span>
          </div>
        </div>
      )
      i++; continue
    }

    // H1 # — large gradient heading
    if (/^#\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={`h1-${i}`} style={{ marginTop: 22, marginBottom: 10 }}>
          <div style={{
            fontWeight: 900, fontSize: 19, letterSpacing: '-0.04em', lineHeight: 1.2,
            background: isLight ? 'none' : 'linear-gradient(135deg, #fff 30%, #C4B5FD 100%)',
            WebkitBackgroundClip: isLight ? undefined : 'text',
            WebkitTextFillColor: isLight ? '#000' : 'transparent',
            backgroundClip: isLight ? undefined : 'text',
            color: isLight ? '#000' : undefined,
          }}>
            {parseInline(trimmed.replace(/^#\s/, ''), isLight)}
          </div>
        </div>
      )
      i++; continue
    }

    // Blockquote > — typed callout cards OR plain insight strip
    if (/^>/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^>\s*/, '')

      // Detect typed label: **Example:**, **Definition:**, **Key:**, **Note:**, **Warning:**
      const labelMatch = content.match(/^\*\*(Example|Definition|Key Insight|Key|Note|Warning|Tip|Recall):\*\*\s*(.*)$/i)
      if (labelMatch) {
        const label = labelMatch[1]
        const body  = labelMatch[2]
        const cfg = {
          example:      { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)',  color: '#FBBF24', icon: '◎', pill: 'rgba(251,191,36,0.18)' },
          definition:   { bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.32)',  color: '#60A5FA', icon: '◉', pill: 'rgba(96,165,250,0.18)' },
          'key insight':{ bg: 'rgba(139,143,255,0.12)', border: 'rgba(139,143,255,0.40)', color: '#A5B4FC', icon: '◈', pill: 'rgba(139,143,255,0.20)' },
          key:          { bg: 'rgba(139,143,255,0.12)', border: 'rgba(139,143,255,0.40)', color: '#A5B4FC', icon: '◈', pill: 'rgba(139,143,255,0.20)' },
          note:         { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.32)',  color: '#818CF8', icon: '◇', pill: 'rgba(99,102,241,0.18)' },
          warning:      { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.32)', color: '#F87171', icon: '⚠', pill: 'rgba(248,113,113,0.18)' },
          tip:          { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.32)',  color: '#34D399', icon: '→', pill: 'rgba(52,211,153,0.18)' },
          recall:       { bg: 'rgba(251,191,36,0.09)',  border: 'rgba(251,191,36,0.28)',  color: '#FCD34D', icon: '↩', pill: 'rgba(251,191,36,0.16)' },
        }[label.toLowerCase()] || { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.32)', color: '#818CF8', icon: '◈', pill: 'rgba(99,102,241,0.18)' }

        elements.push(
          <div key={`bq-${i}`} style={{
            margin: '12px 0', padding: '13px 16px',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderLeft: `4px solid ${cfg.color}`,
            borderRadius: 14,
            boxShadow: `0 2px 12px ${cfg.color}10`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: body ? 8 : 0 }}>
              <span style={{ fontSize: 13, color: cfg.color, fontWeight: 700, lineHeight: 1 }}>{cfg.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 900, color: cfg.color,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                background: cfg.pill, borderRadius: 20, padding: '2px 8px',
              }}>{label}</span>
            </div>
            {body && <div style={{ fontSize: 14.5, lineHeight: 1.75, color: isLight ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.90)', fontWeight: 400 }}>{parseInline(body, isLight)}</div>}
          </div>
        )
      } else {
        // Plain blockquote — insight strip
        elements.push(
          <div key={`bq-${i}`} style={{
            margin: '10px 0', padding: '12px 16px',
            borderLeft: `4px solid ${isLight ? '#818CF8' : '#7C3AED'}`,
            background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.10)',
            borderRadius: 12,
            fontSize: 14.5, lineHeight: 1.75, fontStyle: 'italic',
            color: isLight ? '#3730A3' : 'rgba(220,218,255,0.90)',
          }}>
            {parseInline(content, isLight)}
          </div>
        )
      }
      i++; continue
    }

    // Graph block ```graph
    if (/^```graph/i.test(trimmed)) {
      flushList()
      const graphLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) { graphLines.push(lines[i].trim()); i++ }
      i++
      const exprs = graphLines.filter(Boolean)
      if (exprs.length > 0) {
        elements.push(<MafsGraph key={`graph-${elements.length}`} exprs={exprs} isLight={isLight} />)
      }
      continue
    }

    // Mermaid block ```mermaid
    if (/^```mermaid/i.test(trimmed)) {
      flushList()
      const mermaidLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) { mermaidLines.push(lines[i]); i++ }
      i++
      const src = mermaidLines.join('\n').trim()
      if (src) {
        elements.push(<MermaidDiagram key={`mermaid-${elements.length}`} src={src} isLight={isLight} />)
      }
      continue
    }

    // Code block ```
    if (/^```/.test(trimmed)) {
      flushList()
      const lang = trimmed.replace(/^```/, '').trim()
      const codeLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) { codeLines.push(lines[i]); i++ }
      i++
      {(() => {
        const codeStr = codeLines.join('\n')
        let copied = false
        const codeKey = `code-${elements.length}`
        elements.push(
          <div key={codeKey} style={{
            margin: '12px 0', borderRadius: 14, overflow: 'hidden',
            background: isLight ? 'rgba(0,0,0,0.055)' : 'rgba(0,0,0,0.42)',
            border: isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.09)',
          }}>
            <div style={{
              padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
              borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {lang || 'code'}
              </span>
              <button
                onClick={() => { navigator.clipboard?.writeText(codeStr) }}
                style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                  color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.35)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  padding: '2px 6px', borderRadius: 6,
                }}
              >Copy</button>
            </div>
            <pre style={{ margin: 0, padding: '14px 16px', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', fontSize: 13, color: isLight ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.85)', lineHeight: 1.70, overflowX: 'auto', whiteSpace: 'pre' }}
              dangerouslySetInnerHTML={{ __html: highlightCode(codeStr, lang, isLight) }}
            />
          </div>
        )
      })()}
      continue
    }

    // Step heading: "1: Title", "Step 1: Title", or "**Step 1: Title**" — tap to drill deeper
    const stepMatch = trimmed.match(/^(?:\*\*)?(?:Step\s+)?(\d+):\s+(.+?)(?:\*\*)?$/)
    if (stepMatch && trimmed.replace(/\*\*/g, '').length < 100) {
      flushList()
      if (isDrill) {
        // In drill context: render as a compact bold label, no nested expansion
        elements.push(
          <div key={`step-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: isLight ? '#6366F1' : '#818CF8', background: isLight ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.16)', borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>{stepMatch[1]}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.90)', letterSpacing: '-0.01em' }}>{parseInline(stepMatch[2], isLight)}</span>
          </div>
        )
      } else {
        elements.push(
          <StepCard key={`step-${i}`} stepNum={stepMatch[1]} stepTitle={stepMatch[2]} fullText={clean} isLight={isLight} />
        )
      }
      i++; continue
    }

    // Ordered list 1. / 1)
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/)
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(olMatch[2])
      i++; continue
    }

    // Unordered list - / * / •
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/)
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(ulMatch[1])
      i++; continue
    }

    // Standalone bold line **Concept Name** → section heading
    const standaloneBoldMatch = trimmed.match(/^\*\*([^*].+?)\*\*$/)
    if (standaloneBoldMatch) {
      flushList()
      elements.push(
        <div key={`sh-${i}`} style={{ marginTop: 24, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 9, borderBottom: `2px solid ${isLight ? 'rgba(99,102,241,0.20)' : 'rgba(139,143,255,0.18)'}`, width: '100%' }}>
            <div style={{ width: 5, height: 20, borderRadius: 3, background: isLight ? 'linear-gradient(180deg,#6366F1,#8B5CF6)' : 'linear-gradient(180deg,#818CF8,#C084FC)', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: isLight ? '#1e1b4b' : '#E2E0FF', letterSpacing: '-0.03em', lineHeight: 1.3 }}>
              {standaloneBoldMatch[1]}
            </span>
          </div>
        </div>
      )
      i++; continue
    }

    // Standalone italic *text* → question/challenge row (amber tint)
    const isStandaloneItalic = trimmed.startsWith('*') && trimmed.endsWith('*')
      && !trimmed.startsWith('**') && !trimmed.endsWith('**') && trimmed.length > 2
    if (isStandaloneItalic) {
      flushList()
      elements.push(
        <div key={`qi-${i}`} style={{
          marginTop: 16, padding: '13px 16px',
          background: isLight ? 'rgba(234,179,8,0.08)' : 'rgba(251,191,36,0.09)',
          border: isLight ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(251,191,36,0.28)',
          borderLeft: '4px solid #FBBF24',
          borderRadius: 13,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          boxShadow: '0 2px 12px rgba(251,191,36,0.08)',
        }}>
          <span style={{ fontSize: 16, color: '#FBBF24', flexShrink: 0, lineHeight: 1.3, marginTop: 1 }}>?</span>
          <span style={{ fontSize: 15, color: isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,245,200,0.90)', fontStyle: 'italic', lineHeight: 1.65, fontWeight: 500, letterSpacing: '-0.01em' }}>
            {parseInline(trimmed.slice(1, -1), isLight)}
          </span>
        </div>
      )
      i++; continue
    }

    // Auto-box bare arithmetic/algebra equations that Aeva forgot to wrap in $$
    // Matches: "5 * 14 = 70", "70 × 3 = 210", "x + 3 = 7", "2(3) = 6"
    const bareEqTest = /^[\d\w\s\(\)\.\+\-\*×÷\/\^=]+$/.test(trimmed)
      && /=/.test(trimmed)
      && trimmed.length < 72
      && !/\b(is|are|was|were|the|a|an|of|to|in|on|at|by|for|with|that|this|so|then|and|or|but|since|we|let|note)\b/i.test(trimmed)
    if (bareEqTest) {
      flushList()
      const latexStr = trimmed
        .replace(/\*/g, ' \\times ')
        .replace(/×/g, ' \\times ')
        .replace(/÷/g, ' \\div ')
      let boxHtml = null
      try { boxHtml = katex.renderToString(latexStr, { throwOnError: false, displayMode: true }) } catch {}
      elements.push(
        <div key={`bareq-${i}`} style={{
          overflowX: 'auto', margin: '16px 0', padding: '22px 28px',
          textAlign: 'center', borderRadius: 16, fontSize: 19,
          background: isLight ? 'rgba(99,102,241,0.07)' : 'rgba(14,16,48,0.80)',
          border: isLight ? '1px solid rgba(99,102,241,0.22)' : '1px solid rgba(99,102,241,0.30)',
          boxShadow: isLight ? 'none' : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(165,170,255,0.07)',
          color: isLight ? '#1e1b4b' : 'rgba(255,255,255,0.92)',
          fontFamily: boxHtml ? undefined : '"JetBrains Mono", monospace',
        }}
          {...(boxHtml ? { dangerouslySetInnerHTML: { __html: boxHtml } } : { children: trimmed })}
        />
      )
      i++; continue
    }

    // VIZ tag — [VIZ:type|data...] → inline visual component
    const vizTag = parseVizTag(trimmed)
    if (vizTag) {
      flushList()
      elements.push(
        <VizComponent key={`viz-${i}`} type={vizTag.type} raw={vizTag.raw} isLight={isLight} />
      )
      i++; continue
    }

    // Default paragraph
    flushList()
    elements.push(
      <div key={`p-${i}`} style={{ marginTop: 5, fontSize: 15, color: isLight ? 'rgba(0,0,0,0.82)' : 'rgba(235,233,255,0.84)', lineHeight: 1.80, letterSpacing: '-0.005em' }}>
        {parseInline(trimmed, isLight)}
      </div>
    )
    i++
  }

  flushList()

  return (
    <div style={{ minWidth: 0, fontSize: 15, lineHeight: 1.80, color: txtBody, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
      {elements}
      {streaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.75, repeat: Infinity }}
          style={{ display: 'inline-block', width: 2, height: 13, background: cursorColor || (isLight ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.55)'), borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }}
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
  const { recordCard } = useSRStore()
  const { saveSession } = useLibraryStore()
  const [guide, setGuide] = useState(null)   // parsed JSON guide
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [cardsAdded, setCardsAdded] = useState(false)
  const [expandedConcept, setExpandedConcept] = useState(null)

  const exchangeCount = messages.filter(m => m.role === 'user').length

  useEffect(() => {
    const aiMessages = messages.filter(m => m.role === 'model' && m.text.length > 30)
    if (aiMessages.length === 0) { setLoading(false); return }

    const conversationText = messages.slice(-24)
      .map(m => `${m.role === 'user' ? name : 'Aeva'}: ${m.text?.slice(0, 400)}`)
      .join('\n\n')

    const visualContext = visualInsights.length > 0
      ? `\nLens insights: ${visualInsights.map(v => `[${v.topic}] ${v.coreInsight}`).join('; ')}`
      : ''

    const prompt = `Extract a structured study guide from this tutoring session. Output ONLY valid JSON.

Format:
{
  "topic": "2-4 word topic name",
  "coreInsight": "One clear sentence capturing the key takeaway",
  "concepts": [
    { "term": "Term name", "definition": "One clear sentence definition" }
  ],
  "formulas": [
    { "name": "Formula name", "formula": "The formula itself", "note": "When/how to use it" }
  ],
  "nextSteps": ["Action 1", "Action 2", "Action 3"],
  "examTip": "One high-value exam tip for this topic, or null if not applicable"
}

Rules:
- concepts: 3-6 items, only terms actually discussed
- formulas: only if real formulas/equations were discussed, else empty array
- nextSteps: exactly 3 concrete actions
- Keep everything SHORT and specific

Conversation:${visualContext}
${conversationText}`

    fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      }),
    })
      .then(r => r.json())
      .then(json => {
        try {
          const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}')
          setGuide(parsed)
        } catch { setGuide(null) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddFlashcards = () => {
    if (!guide?.concepts?.length) return
    guide.concepts.forEach(c => {
      recordCard(guide.topic || 'General', c.term, c.definition, 'got')
    })
    setCardsAdded(true)
  }

  const handleSave = () => {
    if (!guide) return
    saveSession({
      type: 'study_guide',
      topic: guide.topic || 'Study Session',
      coreInsight: guide.coreInsight,
      analysis: guide,
      rawText: null,
    })
    setSaved(true)
  }

  const handleExport = () => {
    if (!guide) return
    const lines = [
      `Study Guide — ${guide.topic || 'Session'}`,
      `${name} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      '',
      'CORE INSIGHT',
      guide.coreInsight || '',
      '',
      guide.concepts?.length ? 'KEY CONCEPTS' : '',
      ...(guide.concepts || []).map(c => `• ${c.term}: ${c.definition}`),
      '',
      guide.formulas?.length ? 'FORMULAS' : '',
      ...(guide.formulas || []).map(f => `${f.name}: ${f.formula}${f.note ? ' — ' + f.note : ''}`),
      '',
      'NEXT STEPS',
      ...(guide.nextSteps || []).map((s, i) => `${i + 1}. ${s}`),
      guide.examTip ? `\nEXAM TIP\n${guide.examTip}` : '',
    ].filter(Boolean).join('\n')

    const win = window.open('', '_blank', 'width=750,height=900')
    win.document.write(`<!DOCTYPE html><html><head><title>Aeva Study Guide — ${guide.topic}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system,'Inter',sans-serif; max-width: 660px; margin: 48px auto; padding: 0 28px; color: #1a1a2e; line-height: 1.7; }
  h1 { font-size: 24px; font-weight: 800; color: #2e27a0; margin-bottom: 4px; letter-spacing: -0.03em; }
  .meta { font-size: 12px; color: #999; margin-bottom: 32px; }
  .section { margin: 24px 0; }
  .section-label { font-size: 10px; font-weight: 800; color: #6366F1; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
  .insight { background: #f0f0ff; border-left: 3px solid #6366F1; padding: 12px 16px; border-radius: 0 10px 10px 0; font-size: 15px; color: #3730a3; font-style: italic; }
  .concept { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid #eee; }
  .term { font-weight: 700; color: #1e1a3a; min-width: 140px; font-size: 13.5px; }
  .def { font-size: 13.5px; color: #444; }
  .formula { background: #f8f7ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px 16px; margin: 8px 0; }
  .fname { font-size: 11px; color: #6366F1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .fval { font-family: monospace; font-size: 15px; color: #1e1a3a; font-weight: 600; }
  .fnote { font-size: 12px; color: #888; margin-top: 4px; }
  .step { display: flex; gap: 10px; padding: 6px 0; font-size: 13.5px; color: #333; }
  .num { font-weight: 800; color: #6366F1; min-width: 18px; }
  .tip { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 13.5px; color: #92400e; margin-top: 8px; }
  hr { border: none; border-top: 1px solid #eee; margin: 28px 0; }
  @media print { body { margin: 20px auto; } }
</style></head><body>
<h1>${guide.topic || 'Study Guide'}</h1>
<div class="meta">Aeva Study Guide · ${name} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
<hr>
${guide.coreInsight ? `<div class="section"><div class="section-label">Core Insight</div><div class="insight">${guide.coreInsight}</div></div>` : ''}
${guide.concepts?.length ? `<div class="section"><div class="section-label">Key Concepts</div>${guide.concepts.map(c => `<div class="concept"><div class="term">${c.term}</div><div class="def">${c.definition}</div></div>`).join('')}</div>` : ''}
${guide.formulas?.length ? `<div class="section"><div class="section-label">Formulas</div>${guide.formulas.map(f => `<div class="formula"><div class="fname">${f.name}</div><div class="fval">${f.formula}</div>${f.note ? `<div class="fnote">${f.note}</div>` : ''}</div>`).join('')}</div>` : ''}
${guide.nextSteps?.length ? `<div class="section"><div class="section-label">Next Steps</div>${guide.nextSteps.map((s, i) => `<div class="step"><div class="num">${i + 1}.</div><div>${s}</div></div>`).join('')}</div>` : ''}
${guide.examTip ? `<div class="section"><div class="section-label">Exam Tip</div><div class="tip">💡 ${guide.examTip}</div></div>` : ''}
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 350)
  }

  const ff = "'Inter', system-ui, sans-serif"
  const purple = '#818CF8'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(4,6,20,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.91, y: 22 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.91, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', borderRadius: 'var(--aeva-radius-xl)', overflow: 'hidden', background: 'rgba(8,10,26,0.98)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', flexDirection: 'column', fontFamily: ff }}
      >
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em' }}>
                  {loading ? 'Study Guide' : (guide?.topic || 'Study Guide')}
                </div>
                {!loading && guide?.topic && (
                  <div style={{ padding: '2px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.30)', fontSize: 10.5, fontWeight: 700, color: purple, flexShrink: 0 }}>
                    {guide.topic}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                {loading ? 'Generating…' : `${exchangeCount} exchange${exchangeCount !== 1 ? 's' : ''} · ${guide?.concepts?.length || 0} concepts · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)', cursor: 'pointer', fontSize: 20, padding: '2px 6px', flexShrink: 0, lineHeight: 1 }}>✕</button>
          </div>

          {/* Action buttons */}
          {!loading && guide && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
              {guide.concepts?.length > 0 && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleAddFlashcards}
                  style={{ padding: '7px 13px', borderRadius: 10, background: cardsAdded ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.10)', border: `1px solid ${cardsAdded ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.28)'}`, color: cardsAdded ? '#34D399' : '#6EE7B7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: ff, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {cardsAdded ? '✓ Added to flashcards' : `⚡ Add ${guide.concepts.length} flashcards`}
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                style={{ padding: '7px 13px', borderRadius: 10, background: saved ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${saved ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.12)'}`, color: saved ? '#A5B4FC' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: ff, display: 'flex', alignItems: 'center', gap: 5 }}>
                {saved ? '✓ Saved' : '📚 Save to Library'}
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleExport}
                style={{ padding: '7px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.11)', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: ff }}>
                ⬇ Export PDF
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 28px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 14 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid rgba(139,143,255,0.12)', borderTopColor: '#A5B4FC' }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Building your study guide…</span>
            </div>
          )}

          {!loading && !guide && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 14, padding: '48px 0' }}>
              No session content yet. Chat with Aeva first.
            </div>
          )}

          {!loading && guide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Core Insight */}
              {guide.coreInsight && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: purple, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Core Insight</div>
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.25)', borderLeft: '3px solid rgba(99,102,241,0.70)' }}>
                    <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{guide.coreInsight}</p>
                  </div>
                </div>
              )}

              {/* Key Concepts */}
              {guide.concepts?.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: purple, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Key Concepts</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>Tap to expand</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {guide.concepts.map((c, i) => (
                      <motion.div key={i} layout
                        onClick={() => setExpandedConcept(expandedConcept === i ? null : i)}
                        style={{ borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: purple, flexShrink: 0 }}>{i + 1}</div>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>{c.term}</span>
                          </div>
                          <motion.span animate={{ rotate: expandedConcept === i ? 90 : 0 }} style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, flexShrink: 0 }}>›</motion.span>
                        </div>
                        <AnimatePresence>
                          {expandedConcept === i && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden' }}>
                              <div style={{ padding: '0 14px 13px 47px', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{c.definition}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas */}
              {guide.formulas?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#60A5FA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Formulas & Rules</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {guide.formulas.map((f, i) => (
                      <div key={i} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.22)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{f.name}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', fontFamily: '"JetBrains Mono","Fira Code",monospace', marginBottom: f.note ? 6 : 0 }}>{f.formula}</div>
                        {f.note && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{f.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {guide.nextSteps?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#34D399', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Next Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {guide.nextSteps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#34D399', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                        <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.6, paddingTop: 3 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exam Tip */}
              {guide.examTip && (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#FCD34D', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 5 }}>Exam Tip</div>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.60, margin: 0 }}>{guide.examTip}</p>
                  </div>
                </div>
              )}

              {/* Visual Insights from Lens */}
              {visualInsights.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#67E8F9', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🔭 Lens Insights</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visualInsights.map((v, i) => (
                      <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.18)' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#67E8F9', marginBottom: 5 }}>{v.topic}</div>
                        <div style={{ fontSize: 13, color: 'rgba(207,250,254,0.80)', lineHeight: 1.55, marginBottom: v.strugglePoint ? 4 : 0 }}>{v.coreInsight}</div>
                        {v.strugglePoint && <div style={{ fontSize: 12, color: 'rgba(252,165,165,0.70)', lineHeight: 1.5 }}>⚠ {v.strugglePoint}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* CHAT_THEMES moved to ./chatThemes.js (shared by Chat + Aeva Docs) */

/* ═══ CALIBRATION QUESTION CARD ══════════════════════ */
const CALIB_STATUS_CFG = {
  solid:   { icon: '✅', color: '#4ADE80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.22)' },
  shaky:   { icon: '⚠️',  color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)' },
  gap:     { icon: '❌', color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
}

function CalibQuestionCard({ msg, subject, nodeId, qNum, isLight }) {
  const subjectMap = CALIBRATION_MAP[subject] || {}
  const nodeLabel = nodeId ? (subjectMap[nodeId]?.label || nodeId) : null
  const isFastLane = !!msg.isFastLane
  const fastLaneLabel = msg.fastLaneLabel || 'Quick Check'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 14 }}
    >
      {/* Tag strip — fast lane badge OR Q number + skill label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 2 }}>
        {isFastLane ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 99,
            background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)',
            fontSize: 10, fontWeight: 800, color: '#FBBF24', letterSpacing: '0.07em',
          }}>
            ⚡ {fastLaneLabel}
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 99,
            background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(139,143,255,0.35)',
            fontSize: 10, fontWeight: 800, color: '#A5B4FC', letterSpacing: '0.07em',
          }}>
            Q{qNum}
          </div>
        )}
        {nodeLabel && !isFastLane && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 99,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
            fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em',
          }}>
            {nodeLabel}
          </div>
        )}
      </div>

      {/* Question body */}
      <div style={{
        maxWidth: 740, width: '100%',
        padding: '15px 20px',
        borderRadius: '6px 22px 22px 22px',
        background: 'rgba(14,16,40,0.88)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(139,143,255,0.18)',
        borderLeft: '3px solid rgba(99,102,241,0.75)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.90)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <MarkdownRenderer
          text={msg.text}
          streaming={!!msg.streaming}
          cursorColor="rgba(139,143,255,0.9)"
          isLight={isLight}
        />
      </div>
    </motion.div>
  )
}

/* ═══ CALIBRATION LIVE SKILL REVEAL ══════════════════ */
function CalibSkillReveal({ calibStateRef, calibTick, subject }) {
  void calibTick  // register dependency so component re-renders on tick
  const cs = calibStateRef.current
  const subjectMap = CALIBRATION_MAP[subject] || {}
  const visited = cs.nodesVisited || []

  if (visited.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ marginBottom: 16 }}
    >
      <div style={{
        padding: '12px 16px', borderRadius: 16,
        background: 'rgba(8,10,28,0.72)',
        border: '1px solid rgba(139,143,255,0.14)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 4, height: 4, borderRadius: '50%', background: '#818CF8' }}
          />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Discovered so far
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <AnimatePresence>
            {visited.map(skillId => {
              void calibTick  // each pill also depends on tick
              const status = cs.skillMap[skillId]
              const cfg = CALIB_STATUS_CFG[status]
              const label = subjectMap[skillId]?.label || skillId
              return cfg ? (
                <motion.div
                  key={skillId}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 99,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    fontSize: 11, fontWeight: 600, color: cfg.color,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{cfg.icon}</span>
                  {label}
                </motion.div>
              ) : null
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══ CHAT BUBBLE ═════════════════════════════════ */
function ChatBubble({ msg, deepDiveCards, onDismissCard, isLight = false, isWidget = false, widgetTheme = null }) {
  const isUser = msg.role === 'user'

  /* ── Widget card style (Ai OS) ── */
  const widgetBg = isUser
    ? (widgetTheme?.userBg || 'radial-gradient(ellipse at 72% 22%, rgba(130,50,20,0.55) 0%, rgba(18,6,4,0.82) 100%)')
    : (widgetTheme?.aiBg || 'radial-gradient(ellipse at 28% 22%, rgba(65,40,120,0.55) 0%, rgba(10,8,26,0.82) 100%)')
  const widgetBorder = isUser
    ? (widgetTheme?.userBorder || '1px solid rgba(180,80,40,0.28)')
    : (widgetTheme?.aiBorder || '1px solid rgba(100,70,180,0.28)')
  const widgetShadow = '0 8px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)'
  const widgetRadius = isUser ? '24px 24px 6px 24px' : '6px 24px 24px 24px'
  const widgetPad = isUser ? '12px 20px' : '18px 22px'

  /* ── Classic style ── */
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
        marginBottom: isWidget ? 16 : 14,
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div style={{
        maxWidth: 740,
        width: isUser ? 'auto' : '100%',
        padding: isWidget ? widgetPad : (isUser ? '11px 18px' : '16px 20px'),
        borderRadius: isWidget ? widgetRadius : (isUser ? '22px 22px 6px 22px' : '6px 22px 22px 22px'),
        background: isWidget ? widgetBg : bubbleBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: isWidget ? widgetBorder : bubbleBorder,
        borderLeft: (!isWidget && !isUser) ? (isLight ? '2px solid rgba(99,102,241,0.42)' : '2px solid rgba(99,102,241,0.55)') : (isWidget ? widgetBorder : bubbleBorder),
        boxShadow: isWidget ? widgetShadow : bubbleShadow,
        color: textColor,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {isUser ? (
          <div>
            {msg.image && (
              <img
                src={msg.image}
                alt="Photo"
                style={{ display: 'block', maxWidth: 220, maxHeight: 220, borderRadius: 12, objectFit: 'cover', marginBottom: msg.text ? 10 : 0, border: '1px solid rgba(255,255,255,0.15)' }}
              />
            )}
            {msg.text && <span style={{ fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontWeight: 400 }}>{msg.text}</span>}
          </div>
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
            {msg.aevaViz && <AevaViz config={msg.aevaViz} />}
            {msg.aevaAction && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.25 }}
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(99,102,241,0.13)', border: '1px solid rgba(99,102,241,0.28)' }}
              >
                <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.4, delay: 0.35 }} style={{ fontSize: 12 }}>⚡</motion.span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#A5B4FC', letterSpacing: '-0.01em' }}>{msg.aevaAction.label}</span>
              </motion.div>
            )}
            {msg.aevaRoadmapChanges?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}
                style={{ marginTop: 12, borderRadius: 14, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.28)', overflow: 'hidden' }}
              >
                <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                  <span style={{ fontSize: 13 }}>🗺️</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#A5B4FC', letterSpacing: '-0.01em' }}>Roadmap updated · {msg.aevaRoadmapChanges.length} change{msg.aevaRoadmapChanges.length > 1 ? 's' : ''}</span>
                </div>
                <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {msg.aevaRoadmapChanges.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{c.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
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

/* ─── Session Arc Bar — shows the 4-phase teaching arc above messages ─── */
const PHASE_META = {
  DIAGNOSTIC:    { label: 'Diagnosing',    short: 'Diagnose', icon: '🔍', color: '#8B8FFF', border: 'rgba(139,143,255,0.30)' },
  SCAFFOLDING:   { label: 'Building',      short: 'Build',    icon: '🧱', color: '#7EC8E3', border: 'rgba(126,200,227,0.30)' },
  STRESS_TEST:   { label: 'Stress Testing',short: 'Test',     icon: '⚡', color: '#E9A364', border: 'rgba(233,163,100,0.30)' },
  CONSOLIDATION: { label: 'Lock In',       short: 'Lock In',  icon: '🔒', color: '#A8E6CF', border: 'rgba(168,230,207,0.30)' },
}
const PHASE_ORDER = ['DIAGNOSTIC', 'SCAFFOLDING', 'STRESS_TEST', 'CONSOLIDATION']

function SessionArcBar({ sessionState, exchangeCount, isMission, calibMode }) {
  if (isMission || calibMode || exchangeCount < 1) return null
  const currentIdx = PHASE_ORDER.indexOf(sessionState)

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ marginBottom: 14 }}
    >
      <div style={{ display: 'flex', gap: 2, height: 28 }}>
        {PHASE_ORDER.map((id, idx) => {
          const meta      = PHASE_META[id]
          const isCurrent = idx === currentIdx
          const isPast    = idx < currentIdx
          return (
            <motion.div
              key={id}
              animate={{ flex: isCurrent ? 1.6 : 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                borderRadius: idx === 0 ? '8px 0 0 8px' : idx === 3 ? '0 8px 8px 0' : 3,
                background: isCurrent ? `${meta.color}18` : isPast ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isCurrent ? meta.border : isPast ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.06)'}`,
                overflow: 'hidden', position: 'relative', cursor: 'default',
              }}
            >
              {isCurrent && (
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${meta.color}28 0%, transparent 75%)`, pointerEvents: 'none' }}
                />
              )}
              {isPast && <span style={{ fontSize: 8, color: 'rgba(74,222,128,0.65)' }}>✓</span>}
              <span style={{
                fontSize: isCurrent ? 9.5 : 8.5,
                fontWeight: isCurrent ? 800 : 500,
                color: isCurrent ? meta.color : isPast ? 'rgba(74,222,128,0.50)' : 'rgba(255,255,255,0.16)',
                letterSpacing: '0.02em', userSelect: 'none', position: 'relative', whiteSpace: 'nowrap',
              }}>
                {isCurrent ? meta.label : meta.short}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ─── Phase Transition Card — rendered inline in chat when session advances ─── */
const TRANSITION_COPY = {
  'DIAGNOSTIC→SCAFFOLDING':   "Foundations found. Building now.",
  'SCAFFOLDING→STRESS_TEST':  "Basics solid. Finding the edges.",
  'STRESS_TEST→CONSOLIDATION':"Held up under pressure. Locking it in.",
}

function PhaseTransitionCard({ from, to }) {
  const toMeta  = PHASE_META[to]
  const copy    = TRANSITION_COPY[`${from}→${to}`] || `Moving to ${toMeta?.label || to}.`
  const toIdx   = PHASE_ORDER.indexOf(to)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{
        margin: '10px 0 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 12,
        background: `${toMeta?.color}0f`,
        border: `1px solid ${toMeta?.color}2a`,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${toMeta?.color}18`, border: `1px solid ${toMeta?.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
      }}>
        {toMeta?.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: toMeta?.color, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {toMeta?.label}
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', fontWeight: 500, marginTop: 1 }}>
          {copy}
        </div>
      </div>
      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.16)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        Phase {toIdx + 1} / 4
      </div>
    </motion.div>
  )
}

/* ─── Breakthrough Card — permanent in-chat card when echo CMD fires ─── */
function BreakthroughCard({ topic, moment }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.08 }}
      style={{
        margin: '12px 0 16px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(167,139,250,0.10) 0%, rgba(139,92,246,0.06) 100%)',
        border: '1px solid rgba(167,139,250,0.28)',
        boxShadow: '0 0 32px rgba(167,139,250,0.08)',
        padding: '14px 16px',
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.16) 0%, transparent 80%)', pointerEvents: 'none' }} />
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <motion.span
          animate={{ rotate: [0, 14, -14, 8, -8, 0], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.3, delay: 0.25 }}
          style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}
        >🌟</motion.span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#A78BFA', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Breakthrough</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em', marginTop: 1 }}>{topic}</div>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontWeight: 500, flexShrink: 0 }}>
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      </div>
      {/* Moment quote */}
      <div style={{
        fontSize: 12.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.55, fontStyle: 'italic',
        borderLeft: '2px solid rgba(167,139,250,0.38)', paddingLeft: 10,
      }}>
        "{moment}"
      </div>
    </motion.div>
  )
}

/* ═══ CHAT VIEW / COCKPIT ═════════════════════════ */
/* ── Context-aware chip suggestions ──────────────────────────────────────────
   Returns up to 4 chips that update as the conversation evolves.
   Priority: criticism signal → session phase → exchange milestones → topic.
────────────────────────────────────────────────────────────────────────────── */
function useContextChips({ sessionState, exchangeCount, subject, masteryMap, criticism, chipTick }) { // eslint-disable-line no-unused-vars
  return useMemo(() => {
    if (exchangeCount < 1) return []

    const topic = subject || null
    const chips = []

    // ── Highest priority: live adaptation signal ──────────────────────────
    if (criticism === 'redirect') {
      chips.push({ id: 'angle',   label: 'Try a different angle',  icon: '🔄' })
      chips.push({ id: 'analogy', label: 'Give me an analogy',     icon: '🧩' })
    } else if (criticism === 'hype') {
      chips.push({ id: 'harder',  label: 'Make it harder',         icon: '⚡' })
      chips.push({ id: 'extend',  label: 'Take it further',        icon: '🚀' })
    } else if (criticism === 'challenge') {
      chips.push({ id: 'gap',     label: 'Show me what I\'m missing', icon: '🎯' })
    } else if (criticism === 'coach') {
      chips.push({ id: 'hint',    label: 'Give me a hint',         icon: '💡' })
    }

    // ── Session phase chips ───────────────────────────────────────────────
    if (sessionState === 'STRESS_TEST') {
      if (!chips.find(c => c.id === 'harder'))
        chips.push({ id: 'harder',  label: 'Give me a harder one', icon: '🔥' })
      chips.push({ id: 'mistake',   label: 'Explain my mistake',   icon: '🔍' })
    } else if (sessionState === 'CONSOLIDATION') {
      chips.push({ id: 'recap',     label: 'What have I learned?', icon: '⭐' })
      chips.push({ id: 'next',      label: 'What should I study next?', icon: '🗺️' })
    } else if (sessionState === 'SCAFFOLDING' && exchangeCount >= 3) {
      chips.push({ id: 'practice',  label: topic ? `Practice ${topic} problem` : 'Practice problem', icon: '✏️' })
    }

    // ── Milestone chips (fill gaps) ───────────────────────────────────────
    if (chips.length < 3 && exchangeCount >= 2) {
      chips.push({ id: 'example', label: 'Give me an example',       icon: '💡' })
    }
    if (chips.length < 3 && exchangeCount >= 4) {
      chips.push({ id: 'test',    label: 'Test my understanding',     icon: '🎯' })
    }
    if (chips.length < 4 && exchangeCount >= 7) {
      chips.push({ id: 'summary', label: 'Summarise what we covered', icon: '📋' })
    }
    if (chips.length < 4 && exchangeCount >= 2) {
      chips.push({ id: 'simpler', label: 'Explain it more simply',    icon: '🔬' })
    }

    // Deduplicate by id, cap at 4
    const seen = new Set()
    return chips.filter(c => seen.has(c.id) ? false : seen.add(c.id)).slice(0, 4)
  }, [sessionState, exchangeCount, subject, criticism])
}

// ─── Chat Tools Dropdown ──────────────────────────────────────────────────────
function ChatToolsMenu({ onLens, onPhoto, onDoc, onDrill, onWorking, photoAttachment, workingAttachment }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  const studyRoomOpen = useStudyRoomStore(s => s.open)
  const studyRoomPhase = useStudyRoomStore(s => s.phase)
  const studyRoomLive  = useStudyRoomStore(s => s.isOpen) && studyRoomPhase !== 'idle'
  const studyMeActive  = useStudyModeStore(s => s.phase !== 'idle')

  React.useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const close = () => setOpen(false)

  const tools = [
    {
      icon: <Camera size={13} strokeWidth={2} />,
      label: 'Aeva Lens',
      sub: 'Deep solve & analyse',
      bg: 'rgba(0,200,255,0.10)', border: 'rgba(0,200,255,0.28)', color: 'rgba(0,200,255,0.80)',
      onClick: () => { onLens(); close() },
    },
    {
      icon: <BookOpen size={13} strokeWidth={2} />,
      label: 'Photo',
      sub: 'Send image to Aeva',
      bg: photoAttachment ? 'rgba(167,139,250,0.28)' : 'rgba(167,139,250,0.10)',
      border: photoAttachment ? 'rgba(167,139,250,0.70)' : 'rgba(167,139,250,0.30)',
      color: photoAttachment ? '#C4B5FD' : 'rgba(167,139,250,0.80)',
      dot: !!photoAttachment,
      onClick: () => { onPhoto(); close() },
    },
    {
      icon: <FileText size={13} strokeWidth={2} />,
      label: 'Docs',
      sub: 'Upload homework or notes',
      bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.28)', color: 'rgba(96,165,250,0.80)',
      onClick: () => { onDoc(); close() },
    },
    {
      icon: <PenLine size={13} strokeWidth={2} />,
      label: 'Custom Drill',
      sub: 'Paste notes to build a HUD',
      bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.28)', color: 'rgba(167,139,250,0.80)',
      onClick: () => { onDrill(); close() },
    },
    {
      icon: <span style={{ fontSize: 13, lineHeight: 1 }}>🍅</span>,
      label: 'Study With Me',
      sub: studyMeActive ? 'Session active' : 'Pomodoro + lofi',
      bg: studyMeActive ? 'rgba(251,191,36,0.18)' : 'rgba(251,191,36,0.10)',
      border: studyMeActive ? 'rgba(251,191,36,0.55)' : 'rgba(251,191,36,0.30)',
      color: 'rgba(251,191,36,0.90)',
      dot: studyMeActive,
      dotColor: '#10B981',
      onClick: () => { window.dispatchEvent(new CustomEvent('aeva:open-study-mode')); close() },
    },
    {
      icon: <Users size={13} strokeWidth={2} />,
      label: 'Study Room',
      sub: studyRoomLive ? 'Room active' : 'Real-time with friends',
      bg: studyRoomLive ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.10)',
      border: studyRoomLive ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.28)',
      color: studyRoomLive ? '#a5b4fc' : 'rgba(99,102,241,0.80)',
      dot: studyRoomLive,
      dotColor: '#10B981',
      onClick: () => { studyRoomOpen(); close() },
    },
    {
      icon: <ScanSearch size={13} strokeWidth={2} />,
      label: 'Check My Working',
      sub: 'Upload working, Aeva checks it',
      bg: workingAttachment ? 'rgba(251,191,36,0.28)' : 'rgba(251,191,36,0.10)',
      border: workingAttachment ? 'rgba(251,191,36,0.70)' : 'rgba(251,191,36,0.30)',
      color: workingAttachment ? '#FCD34D' : 'rgba(251,191,36,0.80)',
      dot: !!workingAttachment,
      onClick: () => { onWorking(); close() },
    },
  ]

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        onClick={() => setOpen(v => !v)}
        title="Tools"
        style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
          border: `1.5px solid ${open ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.15)'}`,
          cursor: 'pointer', color: open ? '#fff' : 'rgba(255,255,255,0.60)',
          transition: 'all 0.15s',
        }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.18 }}>
          <Plus size={15} strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      {/* Vertical popup — grows upward */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,8,22,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minWidth: 210,
              zIndex: 9990,
              boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {tools.map((tool, i) => (
              <motion.button
                key={i}
                whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                whileTap={{ scale: 0.97 }}
                onClick={tool.onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: tool.bg, border: `1.5px solid ${tool.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tool.color,
                }}>
                  {tool.icon}
                </div>
                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3 }}>{tool.label}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{tool.sub}</div>
                </div>
                {/* Active dot */}
                {tool.dot && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: tool.dotColor || '#a5b4fc', flexShrink: 0 }} />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChatView({ onBack }) {
  const T = useT()
  const { name } = useUser()
  const {
    activeMode, activeMission, processAIResponse, rewardPlayer, worldMemory,
    cleanText, interruptActive, quickActions, streakCount, missionExchanges,
    applyTimeoutPenalty, clearQuickActions, proTip, openArcade,
  } = useArcadeStore()
  const { labOpen, openLab, setLabSuggestion, addOrder, orders, setLabTab } = useLabStore()
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
  const { addMemory, buildRecallBlock, memories: sessionMemories, saveQuickMemory } = useMemoryStore()
  const isMission = !!activeMode
  const sendTimeRef = useRef(null)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [isExtractingRoadmap, setIsExtractingRoadmap] = useState(false)
  const [sessionState, setSessionState] = useState('DIAGNOSTIC')
  const [criticism, setCriticism] = useState(null)
  const [masteryMap, setMasteryMap] = useState({})
  const [deepDiveMap, setDeepDiveMap] = useState({})   // msgIndex → [{id, term, definition}]
  const [studyGuideOpen, setStudyGuideOpen] = useState(false)
  const [lensFile, setLensFile] = useState(null)
  const [visualInsights, setVisualInsights] = useState([])
  const [chatDocOpen, setChatDocOpen] = useState(false)
  const lensInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const workingInputRef = useRef(null) // dedicated "Aeva Watches You Solve" input
  const [photoAttachment, setPhotoAttachment] = useState(null) // { file, dataUrl, base64, mimeType }
  const [workingAttachment, setWorkingAttachment] = useState(null) // same shape, separate slot
  const [orderToast, setOrderToast] = useState(null)
  const [drillOpen, setDrillOpen] = useState(false)
  const [sessionSummary, setSessionSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [worksheet, setWorksheet] = useState(null)
  const [worksheetLoading, setWorksheetLoading] = useState(false)
  const [worksheetOpen, setWorksheetOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [socraticActive, setSocraticActive] = useState(false)
  const socraticExchangeRef = useRef(0)
  const [feynmanOpen, setFeynmanOpen] = useState(false)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)

  // ── Calibration state ─────────────────────────────────────────────────────
  const calibrationStore = useCalibrationStore()
  const [calibMode, setCalibMode] = useState(false)          // is calibration running? (UI)
  const calibModeRef = useRef(false)                         // sync ref — readable inside async fns without stale closure
  const [calibSubject, setCalibSubject] = useState(null)     // e.g. 'maths'
  const [calibSubjectPicker, setCalibSubjectPicker] = useState(false) // show subject picker?
  const [calibTick, setCalibTick] = useState(0)              // increments each question → forces progress dots to re-render
  const calibStateRef = useRef({
    subject: null,
    currentNode: null,           // skill ID being tested
    skillMap: {},                // { [skillId]: 'mastery'|'solid'|'shaky'|'gap' }
    nodeCount: 0,                // distinct skill nodes assessed (used for cap — retries don't count)
    questionsAsked: 0,           // total questions including tier retries (used for display)
    tierAtNode: 1,               // current tier being asked at this node
    partialAtNode: false,        // had a partial on this node already (guards against double-retry)
    masteryProbed: false,        // already fired tier-4 mastery probe for this node
    nodesVisited: [],
    startTime: null,
  })
  const [calibResult, setCalibResult] = useState(null)       // final result object
  const calibFastLaneRef = useRef({ active: false, bracketIdx: 0 }) // fast lane bracket state
  const [chatAppSettingsOpen, setChatAppSettingsOpen] = useState(false)
  const [chatSettings, saveChatSettings] = useChatSettings()
  const [chipEditMode, setChipEditMode] = useState(false)
  const [addingChip, setAddingChip] = useState(false)
  const [newChipLabel, setNewChipLabel] = useState('')
  const newChipInputRef = useRef(null)
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const messagesScrollRef = useRef(null)
  const inputRef = useRef(null)
  const exchangeCountRef = useRef(0)
  const recentCriticRef = useRef([])       // last 3 critic results for trend detection
  const sessionConceptsRef = useRef({})    // concept → understanding map this session
  const prevConceptsRef   = useRef({})     // previous understanding per concept — for micro-echo detection
  const masteryMapRef = useRef({})         // kept in sync for session-end save
  const lastTopicRef = useRef(null)        // previous critic topic for change detection
  const phaseStreakRef = useRef(0)         // consecutive solid/mastery answers in current phase
  const hypeStreakRef = useRef(0)          // consecutive hype (solid/mastery) critic results — MOMENTUM only shows at ≥2
  const sessionSubjectRef = useRef(null)  // Fix 3: persisted subject for this session
  const topicStreakRef = useRef({ topic: null, count: 0, strongCount: 0 }) // per-topic progression tracker

  // ── Chat history ──────────────────────────────────────────────────────────
  const sessionIdRef    = useRef(`s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const sessionStartRef = useRef(Date.now())
  const [historyOpen, setHistoryOpen] = useState(false)

  // ── Node session nudge — shown when Aeva signals [NODE_READY] ─────────────
  const [nodeReadyNudge, setNodeReadyNudge] = useState(false)

  // ── Aeva Power CMDs state ──────────────────────────────────────────────────
  const [pinnedNote, setPinnedNote] = useState(null)   // { title, content } | null
  const [challengeTimer, setChallengeTimer] = useState(null)  // { label, total, remaining } | null
  const [topicLock, setTopicLock] = useState(null)    // { topic, reason, until } | null — until = exchange count
  const challengeTimerRef = useRef(null)

  const hasInput = input.trim().length > 0
  const isActive = isThinking || hasInput

  // Keep masteryMapRef in sync for session-end save
  useEffect(() => { masteryMapRef.current = masteryMap }, [masteryMap])

  // Auto-save chat history whenever messages change (debounced to avoid thrash)
  useEffect(() => {
    if (messages.length < 2) return
    const tid = setTimeout(() => {
      saveSession({
        id:            sessionIdRef.current,
        startedAt:     sessionStartRef.current,
        subject:       sessionSubjectRef.current,
        title:         null,  // auto-generated from subject/first message in store
        exchangeCount: exchangeCountRef.current,
        finalState:    sessionState,
        messages,
      })
      // Background cloud sync — no-op if not logged in
      syncHistoryToCloud()
    }, 800)
    return () => clearTimeout(tid)
  }, [messages, sessionState])

  // Save session summary when ChatView unmounts or tab is hidden
  useEffect(() => {
    const doSessionSave = () => {
      saveWorldMemory('lastTutorSession', {
        date: Date.now(),
        topics: Object.keys(masteryMapRef.current).slice(0, 6),
        primaryTopic: Object.keys(masteryMapRef.current)[0] || null,
        exchanges: exchangeCountRef.current,
        mastered: masteredTopics.slice(-4),
        struggled: struggleZones.slice(-3),
      })
      // Also capture in cross-session memory (no API call — uses session tracking data)
      saveQuickMemory({
        sessionConcepts: sessionConceptsRef.current,
        exchanges: exchangeCountRef.current,
      })
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && exchangeCountRef.current >= 2) {
        doSessionSave()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (exchangeCountRef.current >= 2) doSessionSave()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send the mission opening when a mission starts
  useEffect(() => {
    if (isMission && messages.length === 0) {
      triggerMissionOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMission])

  // Reset orphaned calibration state when chat is cleared/new session starts
  // Prevents stale calibMode=true from blocking the CALIB_TRIGGER on the next send
  useEffect(() => {
    if (messages.length === 0 && calibModeRef.current) {
      calibModeRef.current = false
      calibFastLaneRef.current = { active: false, bracketIdx: 0 }
      calibStateRef.current = {
        subject: null, currentNode: null,
        skillMap: {}, nodeCount: 0, questionsAsked: 0,
        tierAtNode: 1, partialAtNode: false, masteryProbed: false,
        nodesVisited: [], startTime: null,
      }
      setCalibMode(false)
      setCalibSubject(null)
      setCalibTick(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); return }
    // Only auto-scroll if the user is already near the bottom — lets them scroll
    // up to re-read history mid-stream without the view yanking back down.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 120) {
      // Instant during streaming (last msg streaming) to avoid janky queued smooth-scrolls
      const streaming = messages[messages.length - 1]?.streaming
      bottomRef.current?.scrollIntoView({ behavior: streaming ? 'auto' : 'smooth' })
    }
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

  // Roadmap active session — pill shown while user works on a node
  const activeNodeSession = useRoadmapStore(s => s.activeNodeSession)
  const endNodeSession    = useRoadmapStore(s => s.endNodeSession)
  const completeRoadmapNode = useRoadmapStore(s => s.completeNode)
  const { addXP: addXPFromChat } = useXPStore()
  const markRoadmapNodeDone = () => {
    if (!activeNodeSession) return
    completeRoadmapNode(activeNodeSession.roadmapId, activeNodeSession.nodeId)
    addXPFromChat('DRILL_COMPLETE')
    endNodeSession()
  }

  // Fire any roadmap-triggered chat prompt (learn node → curated Aeva session)
  const pendingChatPrompt = useAevaControlStore(s => s.pendingChatPrompt)
  const clearPendingChatPrompt = useAevaControlStore(s => s.clearPendingChatPrompt)
  useEffect(() => {
    if (!pendingChatPrompt) return
    const text = pendingChatPrompt
    clearPendingChatPrompt()
    setTimeout(() => sendWithText(text), 120)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPrompt])

  // ── Challenge timer countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (!challengeTimer) {
      if (challengeTimerRef.current) { clearInterval(challengeTimerRef.current); challengeTimerRef.current = null }
      return
    }
    if (challengeTimerRef.current) clearInterval(challengeTimerRef.current)
    challengeTimerRef.current = setInterval(() => {
      let expired = false
      setChallengeTimer(prev => {
        if (!prev) return null
        if (prev.remaining <= 1) {
          clearInterval(challengeTimerRef.current)
          challengeTimerRef.current = null
          expired = true
          return null
        }
        return { ...prev, remaining: prev.remaining - 1 }
      })
      // Inject the timeout message OUTSIDE the updater (avoids nested setState warning)
      if (expired) {
        setMessages(m => [...m, { role: 'model', text: `⏱ Time's up. Let's see where you got to.`, streaming: false }])
      }
    }, 1000)
    return () => { if (challengeTimerRef.current) clearInterval(challengeTimerRef.current) }
  }, [challengeTimer?.label]) // re-run only when a new timer is set, not on every tick

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
      // DIAGNOSTIC → SCAFFOLDING: min 4 exchanges — need to actually learn something about them
      if (count >= 4) nextIdx = 1
    } else if (currentIdx === 1) {
      // SCAFFOLDING → STRESS_TEST: 3 consecutive solid/mastery answers, min 6 exchanges
      if (phaseStreakRef.current >= 3 && count >= 6) nextIdx = 2
      // Hard cap: advance after 14 exchanges regardless
      else if (count >= 14) nextIdx = 2
    } else if (currentIdx === 2) {
      // STRESS_TEST → CONSOLIDATION: 3 consecutive solid/mastery at stress level, min 10 exchanges
      if (phaseStreakRef.current >= 3 && count >= 10) nextIdx = 3
      else if (count >= 20) nextIdx = 3
    }
    // CONSOLIDATION: stay here — no further advance

    if (nextIdx !== currentIdx) {
      phaseStreakRef.current = 0  // reset streak on phase change
      const fromPhase = states[currentIdx]
      const toPhase   = states[nextIdx]
      setSessionState(toPhase)
      // Push an inline phase-transition card into the chat stream
      setMessages(prev => [...prev, {
        role: 'system',
        isPhaseTransition: true,
        from: fromPhase,
        to: toPhase,
        text: '',
        id: `phase_${Date.now()}`,
      }])
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
    }
  }

  // ── Photo-in-chat send (flexible — responds to whatever the user asks) ────
  const sendPhoto = async () => {
    if (!photoAttachment || isThinking) return
    const userText = input.trim() || 'What is this?'
    setInput('')
    const snap = photoAttachment
    setPhotoAttachment(null)

    const userMsg = { role: 'user', text: userText, image: snap.dataUrl }
    setMessages(prev => [...prev, userMsg, { role: 'model', text: '', streaming: true }])
    setIsThinking(true)

    const controller = new AbortController()
    abortRef.current = controller
    let rawResponse = ''

    const systemPrompt = `You are Aeva, a world-class AI tutor. A student sent you an image and asked: "${userText}". Answer their question directly using the image as context. Adapt your response style to what they asked:

- If they ask "what is this?" or "what concept is this?" — identify and name the concept clearly.
- If they ask "teach me" — give a full structured explanation.
- If they ask a specific question — answer it precisely, using the image as evidence.
- If they ask for help or a hint — guide them without just giving the answer.

MARKDOWN RENDERING — these patterns render as BEAUTIFUL visual elements:
- ## Heading → purple section divider (use for main sections)
- > **Key Insight:** → blue callout card ✦
- > **Example:** → yellow callout card ◎
- > **Tip:** → green callout card →
- > **Note:** → purple callout card ◇
- > **Warning:** → red callout card ⚠
- $$formula$$ → large centred formula block on dark background
- $formula$ → inline rendered math
- 1. 2. 3. numbered list → coloured circle numbers
- - bullet list → coloured diamond bullets

RULES:
- Use ## headers and > **Label:** callouts wherever they add clarity
- Use $$...$$ for any key formula
- NEVER use #### or #####
- Tone: warm, direct, like a brilliant friend who actually knows this stuff
- Keep responses focused — don't pad`

    try {
      await streamGroqVision(
        snap.base64, snap.mimeType, userText, systemPrompt,
        chunk => {
          rawResponse += chunk
          const visible = cleanText(rawResponse)
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], text: visible }
            return copy
          })
        },
        controller.signal,
      )
    } catch (err) {
      if (!controller.signal.aborted) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], text: "Sorry, I couldn't read the image. Make sure it's clear and try again.", streaming: false }
          return copy
        })
      }
    } finally {
      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
    }
  }

  // ── Aeva Watches You Solve — dedicated working-check send ────────────────
  const sendWorkingCheck = async () => {
    if (!workingAttachment || isThinking) return
    const nodeSession = useRoadmapStore.getState().activeNodeSession
    const topic = nodeSession?.topic || input.trim() || 'the problem in the photo'
    const userText = input.trim() || 'Check my working'
    setInput('')
    const snap = workingAttachment
    setWorkingAttachment(null)

    const userMsg = { role: 'user', text: userText, image: snap.dataUrl }
    setMessages(prev => [...prev, userMsg, { role: 'model', text: '', streaming: true }])
    setIsThinking(true)

    const controller = new AbortController()
    abortRef.current = controller
    let rawResponse = ''

    const systemPrompt = `You are Aeva, checking a student's handwritten working mid-problem.
${nodeSession ? `Context: they are studying "${nodeSession.topic}" (${nodeSession.phase}, Difficulty ${nodeSession.difficulty}/5).${nodeSession.subtopics?.length ? ` Subtopics: ${nodeSession.subtopics.join(', ')}.` : ''}` : `Topic: ${topic}.`}

TASK: Look at their working in the photo. Find where they went wrong — or confirm they're on track.

RESPONSE FORMAT:
Start with a one-line verdict:
- ✅ "You're on track — keep going." (if correct so far)
- ⚠️ "Found an issue." (if there's an error)

Then be SPECIFIC about which line/step has the problem and exactly what went wrong:
"Line 2 is correct. In line 3 you dropped the negative when expanding the bracket — it should be $-2x$, not $+2x$."

RULES:
- Keep it SHORT — they're mid-problem, not starting fresh
- Reference specific lines or steps by number if you can
- Use inline math $...$ for any expressions
- DO NOT re-explain the whole topic from scratch
- DO NOT say "I can see that you have..." — just give the verdict and the fix
- If the handwriting is unclear, say which part you couldn't read
- Tone: direct, like a teacher leaning over their shoulder`

    try {
      await streamGroqVision(
        snap.base64, snap.mimeType, userText, systemPrompt,
        chunk => {
          rawResponse += chunk
          const visible = cleanText(rawResponse)
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], text: visible }
            return copy
          })
        },
        controller.signal,
      )
    } catch (err) {
      if (!controller.signal.aborted) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], text: "Sorry, I couldn't read the image. Make sure it's clear and try again.", streaming: false }
          return copy
        })
      }
    } finally {
      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
    }
  }

  // ── CALIBRATION HELPERS ───────────────────────────────────────────────────

  const CALIB_TRIGGER = /\b(calibrat|diagnos|where am i|what level|test my level|placement test|skill check|what should i (learn|study))\b/i

  /** Pick the next skill node to test based on Critic result */
  const calibAdvance = (understanding) => {
    const cs = calibStateRef.current
    const subjectMap = CALIBRATION_MAP[cs.subject] || {}
    const node = subjectMap[cs.currentNode]
    if (!node) return null

    const isGood = understanding === 'solid' || understanding === 'mastery'
    const isPartial = understanding === 'partial'

    // ── Tier escalation 1: partial retry (tiers 1→2→3) ──────────────────────
    // Give one harder-tier retry before deciding direction (existing behaviour)
    if (isPartial && !cs.partialAtNode && cs.tierAtNode < 3) {
      cs.partialAtNode = true
      cs.tierAtNode += 1
      return cs.currentNode  // stay on same node, harder question
    }

    // ── Tier escalation 2: mastery probe (tier 3→4) ──────────────────────────
    // After acing tier 3, fire one tier-4 question to distinguish solid from mastery.
    // Only once per node; only if a tier-4 question exists for this node.
    if (isGood && cs.tierAtNode === 3 && !cs.masteryProbed) {
      const hasT4 = node.questions?.some(q => q.tier === 4)
      if (hasT4) {
        cs.masteryProbed = true
        cs.tierAtNode = 4
        return cs.currentNode  // same node, mastery probe question
      }
    }

    // ── Mark current node ────────────────────────────────────────────────────
    // At tier 4: solid = mastery; partial/none still = solid (they passed tier 3)
    const status = cs.tierAtNode >= 4
      ? (isGood ? 'mastery' : 'solid')
      : isGood    ? 'solid'
      : isPartial ? 'shaky'
      : 'gap'
    cs.skillMap[cs.currentNode] = status
    cs.partialAtNode = false
    cs.masteryProbed = false
    cs.tierAtNode = 1

    // ── Choose next node ─────────────────────────────────────────────────────
    let nextNode = null
    if (isGood || isPartial || cs.tierAtNode >= 4) {
      // Advance: pick first untested nextSkill that actually exists in the map
      const candidates = (node.nextSkills || []).filter(id => !cs.skillMap[id] && !cs.nodesVisited.includes(id) && subjectMap[id])
      nextNode = candidates[0] || null
    } else {
      // Retreat: go to first untested prerequisite that actually exists in the map
      const prereqs = (node.prerequisites || []).filter(id => !cs.skillMap[id] && !cs.nodesVisited.includes(id) && subjectMap[id])
      nextNode = prereqs[0] || null
      // If all prereqs tested, try a sibling at or below current band
      if (!nextNode) {
        const siblingCandidates = Object.keys(subjectMap).filter(id =>
          !cs.skillMap[id] && !cs.nodesVisited.includes(id) &&
          subjectMap[id].bandOrder <= (node.bandOrder || 5)
        )
        nextNode = siblingCandidates[0] || null
      }
    }

    cs.nodesVisited.push(cs.currentNode)
    cs.currentNode = nextNode
    return nextNode
  }

  /** Determine curriculum band from skill map using weighted bandOrder average.
   *  mastery=3pts, solid=2pts, shaky=1pt, gap=0pts (gaps don't inflate the band).
   *  This prevents a single shaky A-Level node from inflating a mostly-GCSE student. */
  const calibBand = (skillMap, subject) => {
    const subjectMap = CALIBRATION_MAP[subject] || {}
    const entries = Object.entries(skillMap)
    if (!entries.length) return 'Grade 1–2'

    let weightedSum = 0, totalWeight = 0
    for (const [id, status] of entries) {
      const bo = subjectMap[id]?.bandOrder ?? -6
      const w = status === 'mastery' ? 3 : status === 'solid' ? 2 : status === 'shaky' ? 1 : 0
      weightedSum += bo * w
      totalWeight += w
    }
    // All gaps → no weight → beginner
    if (totalWeight === 0) return 'Grade 1–2'

    const avg = weightedSum / totalWeight
    if (avg >= 8)  return 'A-Level'
    if (avg >= 6)  return 'GCSE Higher'
    if (avg >= 4)  return 'GCSE Foundation'
    if (avg >= 1)  return 'Foundation'
    if (avg >= 0)  return 'Grade 7–8'
    if (avg >= -1) return 'Grade 5–6'
    if (avg >= -3) return 'Grade 3–4'
    return 'Grade 1–2'
  }

  /** Find the first gap skill to suggest as "start here" */
  const calibNextTopic = (skillMap, subject) => {
    const subjectMap = CALIBRATION_MAP[subject] || {}
    // Priority: gap → shaky → first solid's next skill
    const gap = Object.entries(skillMap).find(([, v]) => v === 'gap')
    if (gap) return gap[0]
    const shaky = Object.entries(skillMap).find(([, v]) => v === 'shaky')
    if (shaky) return shaky[0]
    const solid = Object.entries(skillMap).filter(([, v]) => v === 'solid')
    for (const [id] of solid) {
      const nexts = (subjectMap[id]?.nextSkills || []).filter(nid => !skillMap[nid])
      if (nexts.length) return nexts[0]
    }
    return null
  }

  /** Build a brief acknowledgement prompt for calibration mode.
   *  Questions are now injected directly — the LLM only responds to the student's answer
   *  with a single warm sentence before the system injects the next question. */
  const buildCalibAckPrompt = (subject, understanding) => {
    const nodeName = CALIBRATION_MAP[subject]?.[calibStateRef.current.currentNode]?.label || 'that'
    return `You are an examiner running a calibration diagnostic for ${SUBJECT_LABELS[subject] || subject}.

The student just answered a question on "${nodeName}". The automated assessment rated their answer: ${understanding.toUpperCase()}.

Write EXACTLY ONE short sentence (max 10 words) acknowledging their answer:
- solid / mastery  → "Nice, that's correct!" / "Got it, well done." / "Correct!"
- partial          → "Close, but not quite there." / "Almost — good attempt."
- none             → "Not quite, but let's keep going." / "That one's tricky, no worries."

Rules:
1. ONE sentence only. No explanations. No hints. No teaching.
2. Do NOT ask another question — the system sends the next question automatically.
3. Do NOT say "next question" or "let's try another".
4. Match the student's energy — warm but brief.`
  }

  // Keep old name as alias so any stray references don't break
  const buildCalibPrompt = buildCalibAckPrompt

  /** Start calibration for a given subject */
  const startCalibration = (subject) => {
    const entryNode = ENTRY_NODES[subject]
    if (!entryNode) return
    calibStateRef.current = {
      subject, currentNode: entryNode,
      skillMap: {}, nodeCount: 0, questionsAsked: 0,
      tierAtNode: 1, partialAtNode: false, masteryProbed: false,
      nodesVisited: [], startTime: Date.now(),
    }
    // Initialise fast lane if this subject has one
    calibFastLaneRef.current = FAST_LANE[subject]
      ? { active: true, bracketIdx: 0 }
      : { active: false, bracketIdx: 0 }
    calibModeRef.current = true   // set ref synchronously — safe to read inside async fns immediately
    setCalibMode(true)
    setCalibSubject(subject)
    setCalibResult(null)
    setCalibTick(0)
  }

  /** Inject a fast-lane bracket question directly into the chat */
  const injectFastLaneBracket = (subject, bracketIdx) => {
    const bracket = FAST_LANE[subject]?.[bracketIdx]
    if (!bracket) return
    setMessages(prev => [...prev, {
      role: 'model', text: bracket.q, streaming: false,
      isCalibQuestion: true, calibNodeId: bracket.nodeId,
      calibQNum: 0,          // 0 = bracket (not counted in main Q counter)
      isFastLane: true,
      fastLaneLabel: bracket.label,
    }])
  }

  /** Fire the first calibration question — DIRECT INJECT, no API call.
   *  If a fast lane exists for this subject, starts with a bracket question
   *  that quickly locates the right entry point (2 Qs max).
   *  Otherwise injects the first node question from calibrationMap. */
  const sendCalibFirstQuestion = (subject) => {
    if (!calibModeRef.current) return
    // Fast lane: inject bracket Q1
    if (calibFastLaneRef.current.active && FAST_LANE[subject]) {
      injectFastLaneBracket(subject, 0)
      return
    }
    // Normal: inject from calibration map
    const cs = calibStateRef.current
    if (!cs.currentNode) return
    const node = CALIBRATION_MAP[subject]?.[cs.currentNode]
    const q = node?.questions?.find(q => q.tier === cs.tierAtNode) || node?.questions?.[0]
    if (!q) return
    setMessages(prev => [...prev, {
      role: 'model', text: q.q, streaming: false,
      isCalibQuestion: true, calibNodeId: cs.currentNode, calibQNum: 1,
    }])
  }

  /** Finish calibration and show result */
  const finishCalibration = () => {
    const cs = calibStateRef.current
    const skillMap = cs.skillMap
    const band = calibBand(skillMap, cs.subject)
    const nextTopic = calibNextTopic(skillMap, cs.subject)
    const result = {
      skillMap,
      band,
      nextTopic,
      questionsAsked: cs.questionCount,
      durationMs: Date.now() - (cs.startTime || Date.now()),
    }
    calibrationStore.saveResult(cs.subject, result)
    setCalibResult({ ...result, subject: cs.subject })
    calibModeRef.current = false  // clear ref synchronously
    setCalibMode(false)
    setCalibSubject(null)
  }

  /** Called after each Critic result during calibration */
  const handleCalibCriticResult = (understanding) => {
    const cs = calibStateRef.current
    const prevNode = cs.currentNode
    const next = calibAdvance(understanding)
    const isRetry = next === prevNode  // same node = tier retry, don't count toward cap

    cs.questionsAsked += 1            // always count for display / progress dots
    if (!isRetry) cs.nodeCount += 1   // only count node advances toward the 12-node cap

    setCalibTick(t => t + 1)          // force progress UI re-render (refs don't trigger it)

    const shouldStop = cs.nodeCount >= 12 || !next
    if (shouldStop) { finishCalibration(); return }
  }

  // ── END CALIBRATION HELPERS ───────────────────────────────────────────────

  const sendWithText = async (overrideText) => {
    // If a photo is attached, route to vision send instead
    if (photoAttachment && !overrideText) { sendPhoto(); return }
    if (workingAttachment && !overrideText) { sendWorkingCheck(); return }

    const userText = overrideText || input.trim()
    if (!userText || isThinking) return
    if (!overrideText) setInput('')

    // ── Calibration trigger detection ────────────────────────────────────────
    if (!isMission && !calibMode && CALIB_TRIGGER.test(userText)) {
      // Try to detect subject from the message
      const subjectMatch = Object.keys(CALIBRATION_MAP).find(s =>
        userText.toLowerCase().includes(SUBJECT_LABELS[s]?.toLowerCase() || s)
      )
      if (subjectMatch) {
        // Subject detected in message — start directly
        setMessages(prev => [...prev, { role: 'user', text: userText }])
        setMessages(prev => [...prev, { role: 'model', text: `Starting your ${SUBJECT_LABELS[subjectMatch]} diagnostic — ${Object.keys(CALIBRATION_MAP[subjectMatch]).length} skills mapped, up to 12 questions. Adapts as you go.`, streaming: false }])
        startCalibration(subjectMatch)
        setTimeout(() => sendCalibFirstQuestion(subjectMatch), 200)
        return
      }
      // No subject — show picker
      setMessages(prev => [...prev, { role: 'user', text: userText }])
      setCalibSubjectPicker(true)
      setMessages(prev => [...prev, { role: 'model', text: `Which subject do you want to calibrate? Pick one below and I'll run the diagnostic.`, streaming: false }])
      return
    }

    // Detect session end — generate visible summary card (min 12 messages = ~6 real exchanges)
    if (!isMission && SESSION_END_PATTERNS.test(userText.trim()) && messages.length >= 12) {
      setSummaryLoading(true)
      generateSessionSummary(messages, name, sessionConceptsRef.current).then(summary => {
        setSummaryLoading(false)
        if (summary) setSessionSummary(summary)
      })
    }
    // Also save a background memory at session end — catches short sessions (3-5 exchanges)
    // that never reached the every-6-exchanges trigger. Fires for any session with ≥ 6 messages.
    if (!isMission && SESSION_END_PATTERNS.test(userText.trim()) && messages.length >= 6) {
      summariseSessionBackground(
        messages, name,
        Object.keys(sessionConceptsRef.current).slice(0, 6),
        addMemory,
      )
    }
    sendTimeRef.current = Date.now()

    // ── Worksheet trigger ────────────────────────────────────────────────────
    if (!isMission && /\b(create|make|generate|give me|build|prepare|write)\s+(a\s+|me\s+a\s+)?worksheet\b|^worksheet\b|\bworksheet\s*please\b/i.test(userText.trim())) {
      setWorksheetLoading(true)
      generateWorksheet(messages, name, sessionConceptsRef.current)
        .then(ws => { setWorksheetLoading(false); if (ws) { setWorksheet(ws); setWorksheetOpen(true) } })
        .catch(() => setWorksheetLoading(false))
    }

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
    const allMessages = [...messages, userMsg]
    // Fix 3: cap history at 20 messages — older context is captured by session memory
    const history = allMessages.slice(-20)
    setMessages([...allMessages, { role: 'model', text: '', streaming: true, lockIn: false }])
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
      } else if (calibModeRef.current && calibStateRef.current.currentNode) {
        // ── Calibration mode: use dedicated math verifier (70b) ──────────────
        const cs = calibStateRef.current
        // Use the ACTUAL question that was shown to the student:
        // - During fast lane: use the bracket's full question text (not the node Q, which is only part a)
        // - During normal calibration: use the node question for the current tier
        let questionText
        if (calibFastLaneRef.current.active) {
          const activeBracket = FAST_LANE[cs.subject]?.[calibFastLaneRef.current.bracketIdx]
          questionText = activeBracket?.q || 'the previous question'
        } else {
          const node = CALIBRATION_MAP[cs.subject]?.[cs.currentNode]
          const q = node?.questions?.find(q => q.tier === cs.tierAtNode) || node?.questions?.[0]
          questionText = q?.q || node?.label || 'the previous question'
        }
        const node = CALIBRATION_MAP[cs.subject]?.[cs.currentNode]
        const calibCriticResult = await runCalibCritic(questionText, userText)
        criticResult = {
          understanding: calibCriticResult.understanding,
          mode: calibCriticResult.understanding === 'solid' ? 'hype' : calibCriticResult.understanding === 'partial' ? 'coach' : 'redirect',
          topic: node?.label || 'maths',
          lazy_thinking: false,
          confidence: 'confident',
          note: calibCriticResult.note,
        }
        // Set systemPrompt here so streamGroq never gets an undefined system message
        systemPrompt = buildCalibAckPrompt(calibStateRef.current.subject, calibCriticResult.understanding)
        // Advance calibration state (fast lane bracket routing or normal node advance)
        const _cs = calibStateRef.current
        const _understanding = calibCriticResult.understanding
        const _passed = _understanding === 'solid' || _understanding === 'mastery'
        if (calibFastLaneRef.current.active) {
          const _fl = FAST_LANE[_cs.subject]
          const _bracket = _fl?.[calibFastLaneRef.current.bracketIdx]
          if (_bracket) {
            if (_passed && _bracket.onPass) {
              calibStateRef.current.currentNode = _bracket.onPass
              calibFastLaneRef.current = { active: false, bracketIdx: 0 }
            } else if (!_passed && _bracket.onFail === null) {
              calibFastLaneRef.current.bracketIdx += 1
            } else if (!_passed && _bracket.onFail) {
              calibStateRef.current.currentNode = _bracket.onFail
              calibFastLaneRef.current = { active: false, bracketIdx: 0 }
            }
          } else {
            calibFastLaneRef.current = { active: false, bracketIdx: 0 }
          }
        } else {
          handleCalibCriticResult(_understanding)
        }
      } else {
        // Standard tutor mode
        // Gate: skip critic for casual/short messages — saves ~40% of API calls
        const isCasualMessage = userText.length < 18
          || /^(ok|okay|yes|no|sure|fine|got it|thanks?|thank you|bye|goodbye|hi|hey|hello|cool|nice|great|lol|haha|lmao|yep|nope|wow|what|really|hm+|ah+|oh+|alright|sounds good|makes sense|i see|got it|interesting|go on|continue|and\??|also\??|next\??)\b[.!?]?\s*$/i.test(userText.trim())
        criticResult = isCasualMessage ? CRITIC_FALLBACK : await runCritic(messages, userText)
        // Gate MOMENTUM (hype): only show after 2+ consecutive hype results — prevents premature label on a single good answer
        if (criticResult.mode === 'hype') { hypeStreakRef.current += 1 } else { hypeStreakRef.current = 0 }
        const displayedCritic = hypeStreakRef.current >= 2 ? criticResult : { ...criticResult, mode: criticResult.mode === 'hype' ? 'coach' : criticResult.mode }
        setCriticism(prev => { if (prev?.mode !== displayedCritic?.mode) setChipTick(t => t + 1); return displayedCritic })
        updateMastery(criticResult)
        exchangeCountRef.current += 1
        advanceSessionState(exchangeCountRef.current, criticResult)
        // Refresh context chips at key milestones so suggestions stay relevant
        if ([2, 4, 7, 10].includes(exchangeCountRef.current)) setChipTick(t => t + 1)

        // Background summarisation: first save at exchange 6 (enough context to be useful),
        // then every 6 thereafter. Non-blocking, silent.
        const ec = exchangeCountRef.current
        if ((ec === 6 || (ec > 6 && ec % 6 === 0)) && messages.length >= 10) {
          summariseSessionBackground(
            messages, name,
            Object.keys(sessionConceptsRef.current).slice(0, 6),
            addMemory,
          )
        }

        // Aeva's Orders analysis every 8 exchanges — fire-and-forget
        if (ec % 8 === 0 && messages.length >= 8) {
          analyzeForOrders(messages, struggleZones, addOrder, setOrderToast)
        }
        // XP every 5 Socratic exchanges (resets when mode is toggled)
        if (socraticActive) {
          socraticExchangeRef.current += 1
          if (socraticExchangeRef.current % 5 === 0) {
            useXPStore.getState().addXP('SOCRATIC_5')
          }
        }
        // Update session tracking refs
        recentCriticRef.current = [...recentCriticRef.current, criticResult].slice(-3)
        // Micro-echo detection + analogy lookup for new topics
        let microEchoSignal = null
        let analogyHintSignal = null
        if (criticResult?.topic) {
          const prevU = sessionConceptsRef.current[criticResult.topic]
          const nowU  = criticResult.understanding
          const wasStruggling = prevU === 'none' || prevU === 'partial'
          const nowStrong     = nowU  === 'solid' || nowU  === 'mastery'
          if (wasStruggling && nowStrong) {
            microEchoSignal = { topic: criticResult.topic, prevUnderstanding: prevU }
          }
          // Analogy: fire only on first introduction (prevU undefined = brand new topic)
          if (prevU === undefined) {
            const analogy = lookupAnalogy(criticResult.topic)
            if (analogy) analogyHintSignal = { topic: criticResult.topic, text: analogy }
          }
          prevConceptsRef.current[criticResult.topic] = prevU || null
          sessionConceptsRef.current[criticResult.topic] = nowU
        }

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

        // ── Per-topic streak tracking ──────────────────────────────────────
        const isStrong = criticResult?.understanding === 'solid' || criticResult?.understanding === 'mastery'
        const streak = topicStreakRef.current
        if (newTopic && newTopic === streak.topic) {
          topicStreakRef.current = {
            topic: newTopic,
            count: streak.count + 1,
            strongCount: isStrong ? streak.strongCount + 1 : 0, // reset on weak answer
            weakCount: isStrong ? 0 : (streak.weakCount || 0) + 1, // consecutive weak answers
          }
        } else if (newTopic) {
          topicStreakRef.current = { topic: newTopic, count: 1, strongCount: isStrong ? 1 : 0, weakCount: isStrong ? 0 : 1 }
        }

        // Build live adaptation extras
        const extras = {
          trend: computeTrend(recentCriticRef.current),
          conceptScaffold: buildConceptScaffold(sessionConceptsRef.current),
          difficultyDirective: buildDifficultyDirective({ frustrationScore, avgResponseLength, totalExchanges, depth }),
          topicProgress: buildTopicProgressSignal(topicStreakRef.current, name),
          microEcho: microEchoSignal,
          analogyHint: analogyHintSignal,
        }

        // Orb personality — style modifier only, does NOT override teaching rules
        const activeOrbDef = ORBS.find(o => o.id === useXPStore.getState().activeOrb)
        const orbPrefix = activeOrbDef?.personality
          ? `STYLE MODIFIER (voice and tone only — all teaching rules, brevity limits, and active recall rules still apply fully):\n${activeOrbDef.personality}\n\n`
          : ''

        // Feedback tag injection — only when student genuinely attempted to answer a check question
        const lastModelMsg = [...messages].reverse().find(m => m.role === 'model')
        const lastMsgHadQuestion = lastModelMsg && /\?/.test(lastModelMsg.text)
        // Must be substantive (>20 chars) and not a conversational redirect/question of their own
        const isSubstantiveAnswer = userText.length > 20
          && !/^(ok|yes|no|sure|fine|got it|okay|can we|let'?s|skip|move on|next|continue|thanks?|bye|what about|and |also |how |why |what |when |where |can you|could you|i don'?t|idk|dunno)\b/i.test(userText.trim())
          && !/\?$/.test(userText.trim()) // they're asking a question, not answering one
        const userAnsweredQuestion = lastMsgHadQuestion && isSubstantiveAnswer
        let feedbackPrefix = ''
        if (userAnsweredQuestion && criticResult && !socraticActive) {
          const understanding = criticResult.understanding
          const tagMap = {
            mastery: `[CORRECT: write one specific sentence naming exactly what ${name} got right and why it's correct]`,
            solid:   `[CORRECT: write one specific sentence naming exactly what ${name} got right and why it's correct]`,
            partial: `[PARTIAL: write one sentence — state what was right first, then what was missing or wrong]`,
            none:    `[INCORRECT: write one sentence — name the specific misconception or gap, not just "that's wrong"]`,
          }
          const tag = tagMap[understanding] || tagMap.partial
          feedbackPrefix = `🚨 FEEDBACK REQUIRED: ${name} just answered your question. The critic assessment is: ${understanding.toUpperCase()}.\nYou MUST begin your response with exactly this feedback tag: ${tag}\nReplace the instruction inside the brackets with the actual feedback text. Do NOT keep the instruction text. Do NOT skip this tag. Do NOT start with anything else.\n\n`
        }

        const recallBlock = buildRecallBlock(name)
        const roadmapCtx  = buildRoadmapContext(useRoadmapStore.getState().getActive())
        const nodeCtx     = buildNodeContext(useRoadmapStore.getState().activeNodeSession)
        // Detect subject first — calibration block is subject-scoped
        const newlyDetected = detectSubject(criticResult?.topic, messages)
        if (newlyDetected) sessionSubjectRef.current = newlyDetected
        const detectedSubject = sessionSubjectRef.current
        const calibBlock  = calibrationStore.buildCalibBlock(detectedSubject)
        const fullMemory  = recallBlock + calibBlock + buildMemoryBlock(name)
        // ── Calibration mode: brief ack only — next question injected in finally ──
        if (calibModeRef.current) {
          const cs = calibStateRef.current
          const understanding = criticResult?.understanding || 'partial'
          const passed = understanding === 'solid' || understanding === 'mastery'

          // Ack prompt: 1 sentence, 8b model, ~15 tokens
          systemPrompt = buildCalibAckPrompt(cs.subject, understanding)

          if (calibFastLaneRef.current.active) {
            // ── Fast lane bracket routing ──────────────────────────────────
            const fl = FAST_LANE[cs.subject]
            const bracket = fl?.[calibFastLaneRef.current.bracketIdx]
            if (bracket) {
              if (passed && bracket.onPass) {
                // Student passed bracket → set real entry node, end fast lane
                calibStateRef.current.currentNode = bracket.onPass
                calibFastLaneRef.current = { active: false, bracketIdx: 0 }
              } else if (!passed && bracket.onFail === null) {
                // Student failed → try next bracket
                calibFastLaneRef.current.bracketIdx += 1
                // Don't set currentNode yet — next bracket will decide
              } else if (!passed && bracket.onFail) {
                // Student failed final bracket → set lowest entry node
                calibStateRef.current.currentNode = bracket.onFail
                calibFastLaneRef.current = { active: false, bracketIdx: 0 }
              }
            } else {
              // No more brackets — fall through to normal entry
              calibFastLaneRef.current = { active: false, bracketIdx: 0 }
            }
          } else if (cs.currentNode) {
            // ── Normal calibration advance ─────────────────────────────────
            handleCalibCriticResult(understanding)
          }
        } else {
          systemPrompt = feedbackPrefix + orbPrefix + buildAevaPrompt(sessionState, criticResult, name, null, fullMemory + roadmapCtx + nodeCtx, extras, T.aevaLanguageDirective, detectedSubject)
        }

        if (socraticActive && !calibMode) {
          systemPrompt += '\n\nSOCRATIC MODE: You must NEVER state facts, answers, or explanations directly. Respond ONLY with 1-3 targeted questions that guide the student to discover the answer themselves. If they arrive at the correct answer, confirm warmly and deepen with another question. If wrong, ask a question that exposes the specific gap without revealing the answer. Never say "the answer is", never explain anything outright. Make them think every time.'
        }

        // ── Topic Lock — Aeva enforces focus on one topic ──────────────────
        if (topicLock && exchangeCountRef.current < topicLock.until) {
          systemPrompt += `\n\n🔒 TOPIC LOCK ACTIVE: ${name} is locked to "${topicLock.topic}" until they demonstrate solid understanding. If their message is off-topic, do NOT answer the new topic. Instead say: "We're staying on ${topicLock.topic} until you've got it — ${topicLock.reason} Answer my last question first." Only unlock when they show solid or mastery understanding of "${topicLock.topic}".`
        } else if (topicLock && exchangeCountRef.current >= topicLock.until) {
          setTopicLock(null)  // auto-expire lock after N exchanges
        }
      }

      const streamOpts = isMission
        ? (MISSION_OPTS[activeMode] || {})
        : calibModeRef.current
          ? { model: 'llama-3.1-8b-instant', maxTokens: 20, temperature: 0.4 }  // ack only — tiny + fast
          : {}

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
        {
          ...streamOpts,
          onRetry: (attempt, max, secs) => {
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: `⏳ Groq is busy — retrying in ${secs}s… (${attempt}/${max})` }
              return copy
            })
          },
        },
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

        // ── Roadmap adaptive update ──────────────────────────────────────────
        const activeRoadmap = useRoadmapStore.getState().getActive()
        if (activeRoadmap?.nodes && criticResult?.topic) {
          const topic = criticResult.topic.toLowerCase()
          const match = activeRoadmap.nodes.find(n => {
            const nt = n.topic.toLowerCase()
            return nt.includes(topic) || topic.includes(nt)
          })
          if (match) {
            if (understanding === 'mastery' || understanding === 'solid') {
              useRoadmapStore.getState().updateLearningProfile(activeRoadmap.id, { mastered: match.topic })
            } else if (understanding === 'none') {
              useRoadmapStore.getState().updateLearningProfile(activeRoadmap.id, { weak: match.topic })
              if (exchangeCountRef.current % 5 === 0) {
                addOrder({ title: `Recovery: ${match.topic}`, description: `Aeva detected confusion with "${match.topic}" during your roadmap session. Review before moving on.`, subject: activeRoadmap.title })
              }
            } else if (understanding === 'partial') {
              useRoadmapStore.getState().updateLearningProfile(activeRoadmap.id, { weak: match.topic })
            }
          }
        }
        // ────────────────────────────────────────────────────────────────────
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
      // ── NODE_READY signal — Aeva signals the student is ready to complete the node ──
      if (!isMission && rawResponse.includes('[NODE_READY]')) {
        const ns = useRoadmapStore.getState().activeNodeSession
        if (ns) setNodeReadyNudge(true)
      }

      // ── Aeva Platform Commands ───────────────────────────────────────────────
      if (!isMission) {
        const cmdIdx = rawResponse.indexOf('⚡CMD:')
        if (cmdIdx !== -1) {
          try {
            // Bracket-counting extractor — handles nested strings and objects safely
            const jsonStart = rawResponse.indexOf('{', cmdIdx)
            let cmdDepth = 0, cmdEnd = -1
            for (let ci = jsonStart; ci < rawResponse.length; ci++) {
              if (rawResponse[ci] === '{') cmdDepth++
              else if (rawResponse[ci] === '}') { cmdDepth--; if (cmdDepth === 0) { cmdEnd = ci + 1; break } }
            }
            const action = JSON.parse(rawResponse.slice(jsonStart, cmdEnd === -1 ? undefined : cmdEnd))
            let label = ''

            if (action.type === 'open_lab') {
              // Show a suggestion toast — never auto-navigate. Student decides.
              const order = addOrder({
                topic: 'Lab',
                drillType: 'flashcard',
                reason: 'Aeva suggests opening the Lab for this topic.',
                urgency: 'low',
                isLabSuggestion: true,
              })
              if (order) setOrderToast(order)
              label = 'Lab suggested'
            } else if (action.type === 'open_lab_drill') {
              const validDrills = ['flashcard', 'speedround', 'mocktest', 'feynman', 'match', 'cloze', 'shortanswer']
              const drillType = validDrills.includes(action.drillType) ? action.drillType : 'flashcard'
              // Queue as an order (toast) — student decides whether to open, not auto-forced
              const order = addOrder({
                topic: (action.topic || 'this topic').trim().slice(0, 50),
                drillType,
                reason: action.reason || `Aeva queued a ${drillType} drill.`,
                urgency: 'medium',
              })
              if (order) setOrderToast(order)
              label = `Drill queued · ${action.topic || 'topic'}`
            } else if (action.type === 'add_lab_task') {
              addOrder({ title: action.title || 'Task', description: action.description || '', subject: action.subject || 'General' })
              label = `Task added · ${action.title || 'task'}`
            } else if (action.type === 'open_arcade') {
              openArcade()
              label = 'Opened Arcade'
            } else if (action.type === 'lock_arcade') {
              useAevaControlStore.getState().lockFeature('arcade', action.reason || '')
              label = `Arcade locked`
            } else if (action.type === 'set_mandate') {
              useAevaControlStore.getState().setMandate(action.topic || '', action.goal || '')
              label = `Mandate set · ${action.topic || ''}`
            } else if (action.type === 'intervention') {
              useAevaControlStore.getState().triggerIntervention(
                action.title || 'We need to talk.',
                action.message || '',
                action.task || 'acknowledge',
                action.topic || '',
              )
              label = `Intervention triggered`

            // ── NEW POWER CMDs ────────────────────────────────────────────
            } else if (action.type === 'award_xp') {
              const amt = Math.min(200, Math.max(10, Math.round(action.amount || 50)))
              const reason = (action.reason || 'Aeva Bonus').slice(0, 48)
              useXPStore.getState().addDirectXP(amt, reason)
              label = `+${amt} XP — ${reason}`

            } else if (action.type === 'pin_note') {
              const title   = (action.title   || 'Key Concept').slice(0, 60)
              const content = (action.content || '').slice(0, 400)
              if (content) {
                setPinnedNote({ title, content, id: Date.now() })
                label = `Pinned: ${title}`
              }

            } else if (action.type === 'set_timer') {
              const secs  = Math.min(600, Math.max(15, Math.round(action.seconds || 120)))
              const lbl   = (action.label || 'Challenge').slice(0, 40)
              setChallengeTimer({ label: lbl, total: secs, remaining: secs })
              label = `Timer: ${lbl} · ${secs}s`

            } else if (action.type === 'lock_topic') {
              const topic  = (action.topic  || criticResult?.topic || 'current topic').slice(0, 60)
              const reason = (action.reason || "you're still building this").slice(0, 120)
              const lockFor = Math.min(10, Math.max(3, Math.round(action.exchanges || 5)))
              setTopicLock({ topic, reason, until: exchangeCountRef.current + lockFor })
              label = `Topic locked: ${topic}`

            } else if (action.type === 'echo') {
              const topic  = (action.topic  || 'a concept').slice(0, 60)
              const moment = (action.moment || 'A breakthrough moment.').slice(0, 200)
              useEchoStore.getState().addEcho({ topic, moment })
              // Push a permanent BreakthroughCard into the chat stream (toast is ephemeral, card persists)
              setMessages(prev => [...prev, {
                role: 'system',
                isBreakthrough: true,
                topic,
                moment,
                text: '',
                id: `breakthrough_${Date.now()}`,
              }])
              label = `Breakthrough · ${topic}`
            }

            if (label) {
              // Bubble chip
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], aevaAction: { ...action, label } }
                return copy
              })
              // Prominent toast
              useAevaControlStore.getState().showCommandToast(label, action.type)
            }
          } catch { /* malformed action tag — ignore */ }
        }

        // ── ROADMAP extraction ───────────────────────────────────────────
        // After main response: if Aeva mentioned roadmap changes, fire a
        // fast structured extraction call to apply them reliably.
        const activeRmForExtraction = useRoadmapStore.getState().getActive()
        // Only trigger when Aeva used the exact prescribed roadmap-edit phrases
        const roadmapChangeKeywords = /I've\s+(added?\s+a\s+(learn|drill|check)\s+node|removed?\s+.{1,60}\s+from\s+your\s+roadmap|flagged?\s+.{1,60}\s+as\s+urgent|moved?\s+.{1,60}\s+to\s+the\s+top|activated\s+crunch\s+mode)/i
        if (!isMission && activeRmForExtraction && roadmapChangeKeywords.test(rawResponse)) {
          setIsExtractingRoadmap(true)
          try {
            const nodeList = activeRmForExtraction.nodes
              .filter(n => n.status !== 'complete')
              .map(n => `"${n.topic}"`)
              .join(', ')

            // Extract only change-related sentences to avoid missing late-mentioned changes
            const changeSentences = rawResponse
              .split(/(?<=[.!?])\s+/)
              .filter(s => /flagged?|urgent|remov(ed)?|delet(ed)?|skipp?|added?|inject(ed)?|crunch|moved?|prioriti(s|z)(ed)?|restructur(ed)?/i.test(s))
              .join(' ')
            const extractText = (changeSentences || rawResponse).replace(/"/g, "'").slice(0, 3000)

            const extractionPrompt = `Extract roadmap changes from this AI tutor response. Output ONLY JSON.

Available nodes (non-complete): ${nodeList}

AI response: "${extractText}"

Map what the AI said to these action types:
- "flag" = marked urgent / flagged / prioritised a node that exists above
- "skip" = removed / skipped / deleted / won't need a node that exists above
- "inject" = added a NEW node not in the list above
- "reprioritise" = moved topics to the top / reordered priority
- "crunch" = crunch mode / trimmed / cut down the roadmap overall

Output format:
{"changes":[
  {"type":"flag","topic":"exact node name from list"},
  {"type":"skip","topic":"exact node name from list","reason":"why"},
  {"type":"inject","topic":"new topic name","nodeType":"learn|drill|check","reason":"why"},
  {"type":"reprioritise","topics":["topic1","topic2"]},
  {"type":"crunch"}
]}

If no clear changes: {"changes":[]}`

            const extractRes = await fetch(GROQ_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nextGroqKey()}` },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: extractionPrompt }],
                response_format: { type: 'json_object' },
                temperature: 0,
                max_tokens: 400,
              }),
            })

            if (extractRes.ok) {
              const extractData = await extractRes.json()
              const extracted = JSON.parse(extractData.choices[0].message.content)
              const actions = extracted.changes || []

              if (actions.length > 0) {
                const store = useRoadmapStore.getState()
                const activeRm = store.getActive()
                const changes = []

                const findByTopic = (topic) => {
                  if (!topic) return null
                  const t = topic.toLowerCase()
                  return activeRm.nodes?.find(n =>
                    n.status !== 'complete' &&
                    (n.topic.toLowerCase() === t ||
                     n.topic.toLowerCase().includes(t) ||
                     t.includes(n.topic.toLowerCase()))
                  )
                }

                for (const act of actions) {
                  if (act.type === 'flag') {
                    const node = findByTopic(act.topic)
                    if (node) {
                      store.flagNode(activeRm.id, node.id, true)
                      store.logAevaAction(activeRm.id, { type: 'flag', topic: node.topic, description: act.reason || 'Flagged as urgent' })
                      changes.push({ icon: '🚩', text: `Flagged urgent: ${node.topic}` })
                    }
                  } else if (act.type === 'skip') {
                    const node = findByTopic(act.topic)
                    if (node) {
                      store.skipNode(activeRm.id, node.id, act.reason || '')
                      store.logAevaAction(activeRm.id, { type: 'skip', topic: node.topic, description: act.reason || 'Removed — not needed' })
                      changes.push({ icon: '⏭', text: `Removed: ${node.topic}${act.reason ? ` — ${act.reason}` : ''}` })
                    }
                  } else if (act.type === 'inject') {
                    // Guard: topic must share keywords with the roadmap subject
                    const rmWords = (activeRm.title || '').toLowerCase().split(/\W+/).filter(w => w.length > 3)
                    const injectLower = (act.topic || '').toLowerCase()
                    const isRelevant = rmWords.length === 0 || rmWords.some(w => injectLower.includes(w) || w.includes(injectLower.slice(0, 5)))
                    if (!isRelevant) break
                    const nt = act.nodeType || 'learn'
                    const available = activeRm.nodes?.find(n => n.status === 'available')
                    store.injectNode(activeRm.id, {
                      topic: act.topic || 'Extra Practice',
                      type: nt, phase: 'Core Topics', difficulty: 3,
                      estimatedMinutes: 20,
                      xp: nt === 'drill' ? 30 : nt === 'check' ? 40 : 50,
                      description: act.reason || 'Added by Aeva.',
                    }, available?.id || null)
                    store.logAevaAction(activeRm.id, { type: 'inject', topic: act.topic, description: `Added: ${act.reason || ''}` })
                    changes.push({ icon: '➕', text: `Added: ${act.topic}` })
                  } else if (act.type === 'reprioritise') {
                    const topics = act.topics || (act.topic ? [act.topic] : [])
                    if (topics.length) {
                      store.reprioritiseNodes(activeRm.id, topics)
                      store.logAevaAction(activeRm.id, { type: 'reprioritise', topic: topics.join(', '), description: 'Moved to top priority' })
                      changes.push({ icon: '🔀', text: `Prioritised: ${topics.slice(0, 2).join(', ')}` })
                    }
                  } else if (act.type === 'crunch') {
                    store.crunchMode(activeRm.id)
                    store.logAevaAction(activeRm.id, { type: 'crunch', topic: '', description: 'Crunch mode — non-essentials removed' })
                    changes.push({ icon: '⚡', text: 'Crunch mode — roadmap trimmed to essentials' })
                  }
                }

                if (changes.length > 0) {
                  setMessages(prev => {
                    const copy = [...prev]
                    copy[copy.length - 1] = { ...copy[copy.length - 1], aevaRoadmapChanges: changes }
                    return copy
                  })
                  useAevaControlStore.getState().showCommandToast(`Roadmap updated · ${changes.length} change${changes.length > 1 ? 's' : ''}`, 'roadmap_edit')
                }
              }
            }
          } catch { /* extraction failed silently */ }
          finally { setIsExtractingRoadmap(false) }
        }
        // ─────────────────────────────────────────────────────────────────

        // ── VIZ tag parser ───────────────────────────────────────────────
        const vizIdx = rawResponse.indexOf('⚡FUNCGRAPH:')
        if (vizIdx !== -1) {
          try {
            const start = rawResponse.indexOf('{', vizIdx)
            if (start !== -1) {
              let depth = 0, end = -1
              for (let i = start; i < rawResponse.length; i++) {
                if (rawResponse[i] === '{' || rawResponse[i] === '[') depth++
                else if (rawResponse[i] === '}' || rawResponse[i] === ']') {
                  depth--
                  if (depth === 0) { end = i + 1; break }
                }
              }
              if (end !== -1) {
                const vizConfig = JSON.parse(rawResponse.slice(start, end))
                setMessages(prev => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { ...copy[copy.length - 1], aevaViz: vizConfig }
                  return copy
                })
              }
            }
          } catch { /* malformed VIZ tag — ignore */ }
        }

      }
      // ────────────────────────────────────────────────────────────────────────

      setIsThinking(false)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
      inputRef.current?.focus()

      // ── Calibration: inject next question/bracket directly after ack ────────
      if (calibModeRef.current) {
        const cs = calibStateRef.current
        setTimeout(() => {
          if (!calibModeRef.current) return
          if (calibFastLaneRef.current.active) {
            // Still in fast lane → inject next bracket
            injectFastLaneBracket(cs.subject, calibFastLaneRef.current.bracketIdx)
          } else if (cs.currentNode) {
            // Fast lane done / never existed → inject first real diagnostic question
            // Skip any node whose question text was already asked in the fast lane (avoids repeating 7×8 etc.)
            const askedInFastLane = new Set(
              (FAST_LANE[cs.subject] || []).map(b => b.q)
            )
            const node = CALIBRATION_MAP[cs.subject]?.[cs.currentNode]
            const q = node?.questions?.find(q => q.tier === cs.tierAtNode) || node?.questions?.[0]
            if (q && !askedInFastLane.has(q.q)) {
              setMessages(prev => [...prev, {
                role: 'model', text: q.q, streaming: false,
                isCalibQuestion: true,
                calibNodeId: cs.currentNode,
                calibQNum: cs.questionsAsked + 1,
              }])
              setCalibTick(t => t + 1)
            } else if (q && askedInFastLane.has(q.q)) {
              // Question already seen — auto-advance past this node using the fast lane result
              // (student already demonstrated knowledge here, mark as solid and move on)
              handleCalibCriticResult('solid')
            }
          }
        }, 400)
      }

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
  const isMobile = useIsMobile()

  // chipTick increments at exchange milestones (2,4,7) so contextChips re-memos
  const [chipTick, setChipTick] = useState(0)
  const contextChips = useContextChips({
    sessionState,
    exchangeCount: exchangeCountRef.current,
    subject: sessionSubjectRef.current,
    masteryMap,
    criticism,
    chipTick, // included so memo recalcs when tick changes
  })
  const xpHiddenChat     = useIsHidden('xp')
  const streakHiddenChat = useIsHidden('streak')
  const statsHiddenChat  = useIsHidden('stats')

  /* ── Widget layout toggle (Ai OS style) ── */
  const { xp: chatXP, streak: chatStreak } = useXPStore()
  const chatLevel = levelFromXP(chatXP)
  const [chatLayout, setChatLayout] = useState(() => {
    try { return localStorage.getItem('aeva_chat_layout') || 'classic' } catch { return 'classic' }
  })
  const toggleChatLayout = () => setChatLayout(prev => {
    const next = prev === 'classic' ? 'widget' : 'classic'
    try { localStorage.setItem('aeva_chat_layout', next) } catch {}
    return next
  })
  const [statsExpanded, setStatsExpanded] = useState(false)
  const isWidget = chatLayout === 'widget' && !isMission

  /* ── Chat colour theme (Ai OS palette) ── */
  const [chatTheme, setChatThemeKey] = useState(() => {
    try { return localStorage.getItem('aeva_chat_theme') || 'purple' } catch { return 'purple' }
  })
  const [showThemePicker, setShowThemePicker] = useState(false)
  const activeTheme = CHAT_THEMES[chatTheme] || CHAT_THEMES.purple
  const isLight = !isMission && ((chatSettings.chatBg || 'default') === 'white' || (isWidget && !!activeTheme.lightBg))
  const applyChatTheme = (id) => {
    setChatThemeKey(id)
    try { localStorage.setItem('aeva_chat_theme', id) } catch {}
    setShowThemePicker(false)
  }

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
    : isWidget
    ? {
        background: activeTheme.inputBg,
        border: `1px solid ${activeTheme.inputBorder}`,
        boxShadow: activeTheme.inputGlow,
        borderRadius: 999,
      }
    : calibMode
    ? {
        background: 'rgba(99,102,241,0.10)',
        border: '1px solid rgba(139,143,255,0.50)',
        boxShadow: '0 0 0 3px rgba(99,102,241,0.12), 0 8px 32px rgba(0,0,0,0.40)',
      }
    : {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(139,143,255,0.22)',
        boxShadow: '0 0 0 1px rgba(139,143,255,0.08), 0 8px 32px rgba(0,0,0,0.40)',
      }

  const inputTextColor = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.88)'
  const placeholderNote = isMission
    ? `Respond to ${activeMission?.title || 'the mission'}…`
    : calibMode
      ? 'Type your answer or working…'
      : photoAttachment
        ? 'Add a message (optional) — or just press send…'
        : 'Ask Aeva anything…'

  const sendBtnStyle = isMission && activeMission
    ? { background: `linear-gradient(145deg, ${activeMission.color}80, ${activeMission.color}40)`, border: `1.5px solid ${activeMission.color}60`, boxShadow: `0 4px 14px ${activeMission.glow}` }
    : { background: 'linear-gradient(145deg, rgba(99,102,241,0.90) 0%, rgba(139,92,246,0.80) 100%)', border: '1.5px solid rgba(99,102,241,0.55)', boxShadow: isLight ? '0 4px 14px rgba(99,102,241,0.25)' : '0 4px 18px rgba(139,143,255,0.35)' }

  const sendIconColor = 'rgba(255,255,255,0.95)'

  return (
    <motion.div
      key="chat"
      className="chat-dvh"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        width: '100%', overflow: 'hidden',
        background: isWidget
          ? activeTheme.bg
          : isMission ? missionBg : 'var(--ui-bg)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Mission glow overlay */}
      {missionGlow && <div aria-hidden style={missionGlow} />}

      {/* Roadmap session pill — floats bottom-right while working on a node */}
      <AnimatePresence>
        {activeNodeSession && (() => {
          const TYPE_ICON = { learn: '📖', drill: '⚡', check: '✅', mock: '🎯' }
          const completeWithConf = (conf) => {
            useRoadmapStore.getState().completeNodeWithConfidence(activeNodeSession.roadmapId, activeNodeSession.nodeId, conf)
            useXPStore.getState().addXP('DRILL_COMPLETE')
            endNodeSession()
            setNodeReadyNudge(false)
          }
          return (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                position: 'absolute', bottom: 100, right: 20, zIndex: 200,
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '12px 14px',
                borderRadius: 18,
                background: 'rgba(8,9,24,0.97)',
                border: nodeReadyNudge ? '1px solid rgba(74,222,128,0.55)' : '1px solid rgba(99,102,241,0.40)',
                boxShadow: nodeReadyNudge
                  ? '0 8px 32px rgba(0,0,0,0.55), 0 0 20px rgba(74,222,128,0.18)'
                  : '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.12)',
                backdropFilter: 'blur(20px)',
                fontFamily: "'Inter', system-ui, sans-serif",
                maxWidth: 240,
                transition: 'border 0.3s, box-shadow 0.3s',
              }}
            >
              {/* Top row — icon + topic + phase badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ fontSize: 14, flexShrink: 0 }}
                >
                  {TYPE_ICON[activeNodeSession.type] || '📖'}
                </motion.div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeNodeSession.topic}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.30)', color: '#A5B4FC', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {activeNodeSession.phase?.split(' ')[0]}
                </span>
              </div>

              {/* Subtopics (up to 3) */}
              {activeNodeSession.subtopics?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {activeNodeSession.subtopics.slice(0, 3).map((s, i) => (
                    <span key={i} style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)' }}>
                      {s.length > 22 ? s.slice(0, 20) + '…' : s}
                    </span>
                  ))}
                  {activeNodeSession.subtopics.length > 3 && (
                    <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)' }}>+{activeNodeSession.subtopics.length - 3} more</span>
                  )}
                </div>
              )}

              {/* NODE_READY nudge */}
              {nodeReadyNudge && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: 2 }}>🎯</motion.span>
                  Aeva thinks you've got this!
                </motion.div>
              )}

              {/* Confidence buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => completeWithConf('solid')}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'rgba(74,222,128,0.18)', color: '#4ADE80', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Solid ✓
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => completeWithConf('shaky')}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'rgba(251,191,36,0.14)', color: '#FBBF24', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Shaky ~
                </motion.button>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Main layout — split for debate mode */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="chat-header" style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Left: back button */}
          <motion.button className="chat-back-btn" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 16px', borderRadius: 99, backdropFilter: 'blur(20px)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, ...backBtnStyle }}>
            <ChevronLeft size={14} strokeWidth={2.5} />
            {isMobile
              ? (isMission ? <span style={{ fontSize: 12 }}>{T.exitMission}</span> : null)
              : (isMission ? T.exitMission : T.backToDashboard)
            }
          </motion.button>

          {/* Center: mission badge only — session state badges moved to orb area */}
          <div className="chat-session-badges" style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            {isMission && activeMission && <MissionBadge mission={activeMission} />}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, overflow: 'visible', maxWidth: isMobile ? '60%' : 'none' }}>
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

            {/* ── Tools pill — consolidates Socratic, Library, Study Guide, Feynman ── */}
            {!isMission && (
              <div style={{ position: 'relative' }}>
                {/* Backdrop: click outside to close */}
                {toolsMenuOpen && (
                  <div onClick={() => setToolsMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 9996 }} />
                )}

                {/* The pill */}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setToolsMenuOpen(v => !v)}
                  animate={socraticActive ? { boxShadow: ['0 0 0px rgba(167,139,250,0)', '0 0 12px rgba(167,139,250,0.45)', '0 0 0px rgba(167,139,250,0)'] } : {}}
                  transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                    background: socraticActive
                      ? 'rgba(167,139,250,0.18)'
                      : toolsMenuOpen
                        ? (isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)')
                        : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'),
                    border: `1.5px solid ${socraticActive ? 'rgba(167,139,250,0.50)' : isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.16)'}`,
                    color: socraticActive ? '#C4B5FD' : isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)',
                    fontSize: 11, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {socraticActive ? <Brain size={11} /> : <Layers size={11} />}
                  {socraticActive ? 'Socratic' : 'Tools'}
                  <ChevronDown size={10} style={{
                    opacity: 0.55,
                    transform: toolsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }} />
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                  {toolsMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.94 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        position: 'fixed', top: 52, right: 54,
                        zIndex: 9997,
                        background: 'rgba(8,9,24,0.97)',
                        border: '1px solid rgba(255,255,255,0.11)',
                        borderRadius: 16, padding: 6,
                        backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
                        minWidth: 220,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {/* Socratic */}
                      <button
                        onClick={() => { toggleSocratic(); setToolsMenuOpen(false) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none',
                          background: socraticActive ? 'rgba(167,139,250,0.14)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!socraticActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { if (!socraticActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <Brain size={13} color={socraticActive ? '#C4B5FD' : 'rgba(255,255,255,0.40)'} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: socraticActive ? '#C4B5FD' : 'rgba(255,255,255,0.80)' }}>Socratic</div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>Questions only — no direct answers</div>
                        </div>
                        {socraticActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4B5FD', flexShrink: 0 }} />}
                      </button>

                      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 8px' }} />

                      {/* Library */}
                      <button
                        onClick={() => { setLibraryOpen(true); setToolsMenuOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <BookOpen size={13} color="rgba(167,139,250,0.60)" />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>Library</div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>Your saved sessions & notes</div>
                        </div>
                      </button>

                      {/* Study Guide */}
                      <button
                        onClick={() => { setStudyGuideOpen(true); setToolsMenuOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <FileText size={13} color="rgba(255,255,255,0.38)" />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>Study Guide</div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>Summarise this session</div>
                        </div>
                      </button>

                      {/* Worksheet */}
                      <button
                        onClick={() => {
                          setToolsMenuOpen(false)
                          if (!worksheetLoading && messages.length > 2) {
                            setWorksheetLoading(true)
                            generateWorksheet(messages, name, sessionConceptsRef.current)
                              .then(ws => { setWorksheetLoading(false); if (ws) { setWorksheet(ws); setWorksheetOpen(true) } })
                              .catch(() => setWorksheetLoading(false))
                          }
                        }}
                        disabled={messages.length <= 2}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: messages.length > 2 ? 'pointer' : 'default', border: 'none', background: worksheetLoading ? 'rgba(52,211,153,0.08)' : 'transparent', transition: 'background 0.15s', opacity: messages.length <= 2 ? 0.4 : 1 }}
                        onMouseEnter={e => { if (messages.length > 2 && !worksheetLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { if (!worksheetLoading) e.currentTarget.style.background = 'transparent' }}
                      >
                        <ClipboardList size={13} color={worksheetLoading ? '#34D399' : 'rgba(52,211,153,0.65)'} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: worksheetLoading ? '#34D399' : 'rgba(255,255,255,0.80)' }}>
                            {worksheetLoading ? 'Generating…' : 'Worksheet'}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                            {messages.length <= 2 ? 'Chat first to generate a worksheet' : 'Practice questions from this session'}
                          </div>
                        </div>
                        {worksheetLoading && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', flexShrink: 0, animation: 'pulse 1s infinite' }} />
                        )}
                      </button>

                      {/* Feynman */}
                      <button
                        onClick={() => { setFeynmanOpen(true); setToolsMenuOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <Zap size={13} color="rgba(245,158,11,0.65)" />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>Feynman</div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>Teach it back to lock it in</div>
                        </div>
                      </button>

                      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 8px' }} />

                      {/* Calibrate */}
                      <button
                        onClick={() => { setCalibSubjectPicker(true); setToolsMenuOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.10)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 13 }}>🎯</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(165,180,252,0.85)' }}>
                            {calibrationStore.hasAnyCalibration() ? 'Re-calibrate' : 'Calibrate my level'}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                            {calibrationStore.hasAnyCalibration() ? 'Run the diagnostic again on a subject' : 'Find your level across any subject'}
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {/* History button */}
            {!isMission && (
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => setHistoryOpen(true)}
                title="Chat history"
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                  border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.14)',
                  color: isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.50)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Clock size={13} />
              </motion.button>
            )}

            {/* Widget layout toggle and theme moved to Settings (⚙) → Chat layout section */}
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

        {/* ── Calibration Mode Bar ── slides in below header when diagnostic is running */}
        <AnimatePresence>
          {calibMode && calibSubject && (
            <motion.div
              key="calib-bar"
              initial={{ opacity: 0, y: -14, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              style={{
                flexShrink: 0, overflow: 'hidden',
                background: 'linear-gradient(90deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.09) 60%, rgba(99,102,241,0.06) 100%)',
                borderBottom: '1px solid rgba(139,143,255,0.20)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px' }}>

                {/* Pulsing target icon + subject label + current node */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.65, 1, 0.65] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: 16, lineHeight: 1 }}
                  >
                    {SUBJECT_ICONS[calibSubject] || '🎯'}
                  </motion.div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#A5B4FC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Calibrating · {SUBJECT_LABELS[calibSubject] || calibSubject}
                      {calibTick < 0 ? '' : ''}{/* reads calibTick */}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 1 }}>
                      {(() => {
                        void calibTick
                        const nodeId = calibStateRef.current.currentNode
                        return nodeId
                          ? (CALIBRATION_MAP[calibSubject]?.[nodeId]?.label || nodeId)
                          : 'Warming up…'
                      })()}
                    </div>
                  </div>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Progress dots — 12 total, colour-coded by result */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    void calibTick
                    const skillId = calibStateRef.current.nodesVisited[i]
                    const status  = skillId ? calibStateRef.current.skillMap[skillId] : null
                    const isCur   = i === calibStateRef.current.nodesVisited.length
                    const col = status === 'solid' ? '#4ADE80'
                      : status === 'shaky'  ? '#FBBF24'
                      : status === 'gap'    ? '#F87171'
                      : isCur               ? '#A5B4FC'
                      : 'rgba(255,255,255,0.14)'
                    return (
                      <motion.div
                        key={i}
                        animate={isCur ? { scale: [1, 1.45, 1], opacity: [0.55, 1, 0.55] } : {}}
                        transition={{ duration: 0.9, repeat: isCur ? Infinity : 0, ease: 'easeInOut' }}
                        style={{
                          width: isCur ? 10 : 7, height: isCur ? 10 : 7,
                          borderRadius: '50%', background: col,
                          transition: 'background 0.35s, width 0.2s, height 0.2s',
                          flexShrink: 0,
                        }}
                      />
                    )
                  })}
                </div>

                {/* Q counter pill — shows "Placing you…" during fast lane */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  padding: '4px 11px', borderRadius: 99,
                  background: calibFastLaneRef.current.active
                    ? 'rgba(251,191,36,0.18)' : 'rgba(99,102,241,0.20)',
                  border: calibFastLaneRef.current.active
                    ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(139,143,255,0.35)',
                  fontSize: 11, fontWeight: 800,
                  color: calibFastLaneRef.current.active ? '#FBBF24' : '#A5B4FC',
                }}>
                  {void calibTick}
                  {calibFastLaneRef.current.active
                    ? '⚡ Placing you…'
                    : <>Q{calibStateRef.current.questionsAsked + 1}</>
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature spotlight — one-time tip */}
        {!isMission && (
          <FeatureSpotlight
            id="chat"
            icon="🧠"
            title="Aeva learns how you think"
            body="The longer you chat, the smarter she gets — she tracks your mastery, adapts difficulty, and remembers your weak spots across sessions. Try Socratic mode to be questioned instead of told."
            accentColor="#C4B5FD"
          />
        )}

        {/* Streak moment banner — shown once per day when streak > 1 */}
        {!isMission && <StreakMoment streak={chatStreak} />}

        {/* Widget mode — "Today's Metrix" stats strip */}
        {isWidget && !statsHiddenChat && (
          isMobile ? (
            /* ── Mobile: collapsed tap-to-expand pill ── */
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 24px 10px', flexShrink: 0 }}>
              <AnimatePresence mode="wait">
                {statsExpanded ? (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.20 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: activeTheme.inputBg, border: `1px solid ${activeTheme.accentBorder}`, fontFamily:"'Inter',system-ui,sans-serif" }}>
                      <span style={{ fontSize: 10, color: `${activeTheme.accent}99`, fontWeight: 600, letterSpacing: '0.06em' }}>+{Object.keys(masteryMap).length}</span>
                      <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.10)' }} />
                      <span style={{ fontSize: 13, fontWeight: 900, color: activeTheme.accent, letterSpacing: '-0.02em' }}>{exchangeCountRef.current || 0}</span>
                      <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.10)' }} />
                      <span style={{ fontSize: 10, color: `${activeTheme.accent}99`, fontWeight: 600, letterSpacing: '0.06em' }}>exchanges</span>
                    </div>
                    {!streakHiddenChat && chatStreak > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(180,50,15,0.22)', border: '1px solid rgba(200,80,30,0.32)', fontSize: 11, fontWeight: 700, color: '#FDBA74', fontFamily:"'Inter',system-ui,sans-serif" }}>
                        🔥 {chatStreak}
                      </div>
                    )}
                    {!xpHiddenChat && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: activeTheme.accentBg, border: `1px solid ${activeTheme.accentBorder}`, fontSize: 11, fontWeight: 700, color: activeTheme.accent, fontFamily:"'Inter',system-ui,sans-serif" }}>
                      <Zap size={10} fill={activeTheme.accent} color={activeTheme.accent} /> Lv {chatLevel}
                    </div>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={() => setStatsExpanded(false)}
                      style={{ padding: '5px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily:"'Inter',system-ui,sans-serif" }}
                    >✕</motion.button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="collapsed"
                    initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.20 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setStatsExpanded(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: activeTheme.inputBg, border: `1px solid ${activeTheme.accentBorder}`, cursor: 'pointer', fontFamily:"'Inter',system-ui,sans-serif" }}
                  >
                    <Zap size={10} fill={activeTheme.accent} color={activeTheme.accent} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: activeTheme.accent }}>Lv {chatLevel}</span>
                    <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.15)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: `${activeTheme.accent}99` }}>{exchangeCountRef.current || 0} exchanges</span>
                    {chatStreak > 0 && <span style={{ fontSize: 11 }}>🔥 {chatStreak}</span>}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ── Desktop: full strip ── */
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '4px 24px 12px', flexShrink: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: activeTheme.inputBg, border: `1px solid ${activeTheme.accentBorder}`, boxShadow: '0 4px 20px rgba(0,0,0,0.40)', fontFamily:"'Inter',system-ui,sans-serif" }}>
                <span style={{ fontSize: 10, color: `${activeTheme.accent}99`, fontWeight: 600, letterSpacing: '0.06em' }}>+{Object.keys(masteryMap).length}</span>
                <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.10)' }} />
                <span style={{ fontSize: 13, fontWeight: 900, color: activeTheme.accent, letterSpacing: '-0.02em' }}>{exchangeCountRef.current || 0}</span>
                <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.10)' }} />
                <span style={{ fontSize: 10, color: `${activeTheme.accent}99`, fontWeight: 600, letterSpacing: '0.06em' }}>exchanges</span>
              </div>
              {chatStreak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(180,50,15,0.22)', border: '1px solid rgba(200,80,30,0.32)', fontSize: 11, fontWeight: 700, color: '#FDBA74', fontFamily:"'Inter',system-ui,sans-serif" }}>
                  🔥 {chatStreak}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: activeTheme.accentBg, border: `1px solid ${activeTheme.accentBorder}`, fontSize: 11, fontWeight: 700, color: activeTheme.accent, fontFamily:"'Inter',system-ui,sans-serif" }}>
                <Zap size={10} fill={activeTheme.accent} color={activeTheme.accent} /> Lv {chatLevel}
              </div>
            </motion.div>
          )
        )}

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
                  <AevaOrb size={isMobile ? 140 : 218} active={isActive} scanMode={labOpen} personality={orbPersonality} orbGradient={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.gradient} orbAccent={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.accent} />
                  <div style={{ textAlign: 'center', padding: '0 28px', marginTop: 4 }}>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 400, color: isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.45)', lineHeight: 1.3, letterSpacing: '0.01em', marginBottom: 4 }}>
                      Hey {name},
                    </p>
                    <h1 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, color: isLight ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.95)', lineHeight: 1.05, letterSpacing: '-0.05em', margin: '0 0 12px' }}>
                      {T.whatCanIHelpWith}
                    </h1>
                    {/* Cross-session memory pill — visible once Aeva has memories */}
                    {sessionMemories.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, marginBottom: 16, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(99,102,241,0.10)', border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(99,102,241,0.22)', cursor: 'default' }}
                      >
                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }}
                          style={{ width: 5, height: 5, borderRadius: '50%', background: isLight ? 'rgba(0,0,0,0.45)' : '#818CF8', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(165,180,252,0.80)', letterSpacing: '0.01em' }}>
                          {(() => {
                            const recent = sessionMemories[0]
                            const topics = recent?.mastered?.slice(0, 2) || recent?.topics?.slice(0, 2) || []
                            if (topics.length > 0) return `Picking up from ${topics.join(' & ')}`
                            return `Aeva remembers ${sessionMemories.length} ${sessionMemories.length === 1 ? 'session' : 'sessions'}`
                          })()}
                        </span>
                      </motion.div>
                    )}
                  </div>
                  {/* ── Calibrated subject pills (empty state, already calibrated) ── */}
                  {calibrationStore.hasAnyCalibration() && !calibMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.35 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8, width: '100%', maxWidth: 480 }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Pick up where you left off</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {Object.entries(calibrationStore.results).map(([subject, result]) => {
                          const icon = SUBJECT_ICONS[subject] || '📚'
                          const label = SUBJECT_LABELS[subject] || subject
                          const nextNode = result.nextTopic ? CALIBRATION_MAP[subject]?.[result.nextTopic] : null
                          return (
                            <motion.button
                              key={subject}
                              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}
                              onClick={() => nextNode && sendWithText(`Let's start: ${nextNode.label}`)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '9px 16px', borderRadius: 99, cursor: 'pointer',
                                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(139,143,255,0.28)',
                                color: 'rgba(165,180,252,0.90)', fontSize: 13, fontWeight: 600,
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              <span>{icon}</span>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
                                {nextNode && <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.50)', marginTop: 1 }}>Next: {nextNode.label}</div>}
                              </div>
                              {nextNode && <span style={{ fontSize: 11, opacity: 0.5 }}>→</span>}
                            </motion.button>
                          )
                        })}
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                          onClick={() => setCalibSubjectPicker(true)}
                          style={{ padding: '9px 14px', borderRadius: 99, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600 }}
                        >
                          + Add subject
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Calibrate CTA (empty state, no calibration data yet) ── */}
                  {!calibrationStore.hasAnyCalibration() && !calibMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                      style={{ width: '100%', maxWidth: 420, margin: '0 0 8px', padding: '14px 18px', borderRadius: 16, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(139,143,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>🎯 Don't know where to start?</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 3 }}>8 questions · finds your exact gaps · adapts as you answer</div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setCalibSubjectPicker(true)}
                        style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        Calibrate →
                      </motion.button>
                    </motion.div>
                  )}

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
                <AevaOrb size={72} active={isThinking} scanMode={labOpen} personality={orbPersonality} orbGradient={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.gradient} orbAccent={ORBS.find(o => o.id === useXPStore.getState().activeOrb)?.accent} />
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
                {/* Under-orb state badge — simple pill during calibration, full badge otherwise */}
                {calibMode && calibSubject ? (
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 99, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(139,143,255,0.28)' }}
                  >
                    <span style={{ fontSize: 11 }}>🎯</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#A5B4FC', letterSpacing: '0.03em' }}>
                      {void calibTick}
                      Diagnostic in progress
                    </span>
                  </motion.div>
                ) : (
                  /* Session state badges — moved from header to live under the orb */
                  <SessionBadge sessionState={sessionState} criticism={criticism} />
                )}

                {/* Post-calibration subject pills */}
                {!calibMode && calibrationStore.hasAnyCalibration() && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: '0 16px' }}>
                    {Object.entries(calibrationStore.results).map(([subject, result]) => {
                      const icon = SUBJECT_ICONS[subject] || '📚'
                      const label = SUBJECT_LABELS[subject] || subject
                      const nextNode = result.nextTopic ? CALIBRATION_MAP[subject]?.[result.nextTopic] : null
                      return (
                        <motion.button
                          key={subject}
                          whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.96 }}
                          onClick={() => nextNode && sendWithText(`Let's start: ${nextNode.label}`)}
                          title={nextNode ? `Start: ${nextNode.label}` : label}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 11px', borderRadius: 99, cursor: nextNode ? 'pointer' : 'default',
                            background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(139,143,255,0.22)',
                            fontSize: 11, fontWeight: 600, color: 'rgba(165,180,252,0.85)',
                          }}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                          {nextNode && <span style={{ color: 'rgba(165,180,252,0.50)', fontSize: 10 }}>· {nextNode.label} →</span>}
                        </motion.button>
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
              ref={messagesScrollRef}
              className="chat-messages"
              style={{ flex: 1, overflowY: 'auto', padding: 'var(--aeva-space-md, 16px) var(--aeva-space-lg, 20px)', display: 'flex', flexDirection: 'column', justifyContent: isEmpty ? 'flex-end' : 'flex-start' }}
            >
              <div style={{ width: '100%', maxWidth: isMission ? 800 : 740, margin: '0 auto' }}>

                {/* ── Pinned Note Card ──────────────────────────────────── */}
                {pinnedNote && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginBottom: 14, borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.05))',
                      border: '1px solid rgba(251,191,36,0.28)',
                      padding: '12px 16px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span style={{ fontSize: 12 }}>📌</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{pinnedNote.title}</span>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPinnedNote(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: 14, lineHeight: 1, padding: 2 }}>×</motion.button>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {pinnedNote.content}
                    </div>
                  </motion.div>
                )}

                {/* ── Challenge Timer ───────────────────────────────────── */}
                {challengeTimer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                    style={{
                      marginBottom: 14, borderRadius: 14,
                      background: challengeTimer.remaining < 30
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))'
                        : 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(79,70,229,0.05))',
                      border: `1px solid ${challengeTimer.remaining < 30 ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.30)'}`,
                      padding: '10px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <motion.div
                      animate={challengeTimer.remaining < 30 ? { opacity: [0.6, 1, 0.6] } : {}}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ fontSize: 16 }}>⏱</motion.div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: challengeTimer.remaining < 30 ? '#F87171' : '#A5B4FC', marginBottom: 2 }}>{challengeTimer.label}</div>
                      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${(challengeTimer.remaining / challengeTimer.total) * 100}%` }}
                          transition={{ duration: 0.9, ease: 'linear' }}
                          style={{ height: '100%', borderRadius: 99, background: challengeTimer.remaining < 30 ? '#EF4444' : '#6366F1' }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: challengeTimer.remaining < 30 ? '#F87171' : '#fff', letterSpacing: '-0.04em', minWidth: 44, textAlign: 'right' }}>
                      {Math.floor(challengeTimer.remaining / 60)}:{String(challengeTimer.remaining % 60).padStart(2, '0')}
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setChallengeTimer(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 14, padding: 2 }}>×</motion.button>
                  </motion.div>
                )}

                {/* ── Topic Lock Banner ─────────────────────────────────── */}
                {topicLock && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginBottom: 14, borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(109,40,217,0.05))',
                      border: '1px solid rgba(139,92,246,0.28)',
                      padding: '9px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>🔒</span>
                    <div style={{ flex: 1, fontSize: 12, color: 'rgba(196,181,253,0.85)', fontWeight: 600 }}>
                      Locked to: <span style={{ color: '#C4B5FD', fontWeight: 800 }}>{topicLock.topic}</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> — {topicLock.reason}</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setTopicLock(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 14, padding: 2 }}>×</motion.button>
                  </motion.div>
                )}

                {/* ── Session Arc Bar — 4-phase progress indicator ────── */}
                <SessionArcBar
                  sessionState={sessionState}
                  exchangeCount={exchangeCountRef.current}
                  isMission={isMission}
                  calibMode={calibMode}
                />

                {messages.map((msg, i) =>
                  isMission
                    ? <ThemedChatBubble key={i} msg={msg} mission={activeMission} />
                    : msg.isPhaseTransition
                      ? <PhaseTransitionCard key={msg.id || i} from={msg.from} to={msg.to} />
                      : msg.isBreakthrough
                        ? <BreakthroughCard key={msg.id || i} topic={msg.topic} moment={msg.moment} />
                        : msg.isCalibQuestion && msg.role === 'model'
                        ? <CalibQuestionCard
                            key={i}
                            msg={msg}
                            subject={calibSubject}
                            nodeId={msg.calibNodeId}
                            qNum={msg.calibQNum}
                            isLight={isLight}
                          />
                        : <ChatBubble key={i} msg={msg} deepDiveCards={deepDiveMap[i] || []} onDismissCard={(cardId) => setDeepDiveMap(prev => ({ ...prev, [i]: (prev[i] || []).filter(c => c.id !== cardId) }))} isLight={isLight} isWidget={isWidget} widgetTheme={isWidget ? activeTheme : null}  />
                )}

                {/* Live skill reveal — grows during calibration as skills are assessed */}
                {calibMode && calibSubject && (
                  <CalibSkillReveal
                    calibStateRef={calibStateRef}
                    calibTick={calibTick}
                    subject={calibSubject}
                  />
                )}

                {/* Calibration result card */}
                {calibResult && !calibMode && (
                  <CalibrationResult
                    result={calibResult}
                    subject={calibResult.subject}
                    onStartTopic={(topicId, subject) => {
                      setCalibResult(null)
                      const node = CALIBRATION_MAP[subject]?.[topicId]
                      if (node) sendWithText(`Let's start: ${node.label}`)
                    }}
                    onRecalibrate={() => {
                      const subj = calibResult.subject
                      setCalibResult(null)
                      startCalibration(subj)
                      setTimeout(() => sendCalibFirstQuestion(subj), 200)
                    }}
                    onAnotherSubject={() => {
                      setCalibResult(null)
                      setCalibSubjectPicker(true)
                    }}
                  />
                )}

                {/* Worksheet generating indicator */}
                {worksheetLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px',
                      borderRadius: 14, background: 'rgba(79,70,229,0.10)',
                      border: '1px solid rgba(99,102,241,0.28)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.25)', borderTopColor: '#818CF8' }} />
                      <span style={{ fontSize: 13, color: 'rgba(165,180,252,0.90)', fontWeight: 600 }}>Building your worksheet…</span>
                    </div>
                  </motion.div>
                )}

                {/* Worksheet ready button */}
                {worksheet && !worksheetLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <motion.button
                      whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setWorksheetOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '11px 20px',
                        borderRadius: 14, cursor: 'pointer',
                        background: 'linear-gradient(135deg,rgba(79,70,229,0.22),rgba(124,58,237,0.16))',
                        border: '1px solid rgba(99,102,241,0.45)',
                        fontFamily: 'inherit',
                        boxShadow: '0 4px 20px rgba(99,102,241,0.20)',
                      }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#A5B4FC' }}>{worksheet.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>Tap to open · Print or save as PDF</div>
                      </div>
                    </motion.button>
                  </motion.div>
                )}

                {/* Session summary loading */}
                {summaryLoading && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8' }} />
                      <span style={{ fontSize: 12, color: 'rgba(165,180,252,0.80)', fontWeight: 600 }}>Generating session summary…</span>
                    </div>
                  </div>
                )}

                {/* Session summary card */}
                <AnimatePresence>
                  {sessionSummary && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 16 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      style={{ margin: '8px 0 20px', borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.25)' }}
                    >
                      {/* Hero header */}
                      <div style={{ padding: '20px 20px 16px', background: 'linear-gradient(135deg, rgba(79,70,229,0.28) 0%, rgba(124,58,237,0.18) 100%)', borderBottom: '1px solid rgba(99,102,241,0.22)', position: 'relative' }}>
                        <motion.button
                          whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.90 }}
                          onClick={() => setSessionSummary(null)}
                          style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                        >×</motion.button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <motion.div
                            initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                            style={{ fontSize: 26 }}
                          >🏆</motion.div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Session Complete</div>
                            <div style={{ fontSize: 11, color: 'rgba(165,180,252,0.70)', fontWeight: 500, marginTop: 1 }}>Here's what you covered today</div>
                          </div>
                        </div>
                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {sessionSummary.mastered?.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                              style={{ flex: 1, padding: '9px 12px', borderRadius: 12, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', textAlign: 'center' }}
                            >
                              <div style={{ fontSize: 20, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.04em' }}>{sessionSummary.mastered.length}</div>
                              <div style={{ fontSize: 9.5, color: 'rgba(74,222,128,0.75)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Mastered</div>
                            </motion.div>
                          )}
                          {(sessionSummary.struggled ?? sessionSummary.needsWork)?.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                              style={{ flex: 1, padding: '9px 12px', borderRadius: 12, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', textAlign: 'center' }}
                            >
                              <div style={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', letterSpacing: '-0.04em' }}>{(sessionSummary.struggled ?? sessionSummary.needsWork).length}</div>
                              <div style={{ fontSize: 9.5, color: 'rgba(245,158,11,0.75)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Review</div>
                            </motion.div>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
                            style={{ flex: 1, padding: '9px 12px', borderRadius: 12, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', textAlign: 'center' }}
                          >
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#818CF8', letterSpacing: '-0.04em' }}>+{(sessionSummary.mastered?.length || 0) * 75}</div>
                            <div style={{ fontSize: 9.5, color: 'rgba(129,140,248,0.75)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>XP Earned</div>
                          </motion.div>
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: '14px 20px 18px', background: 'rgba(8,9,26,0.96)' }}>
                        {sessionSummary.keyInsight && (
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', lineHeight: 1.58, marginBottom: 14, fontStyle: 'italic', borderLeft: '2px solid rgba(99,102,241,0.55)', paddingLeft: 12 }}>
                            "{sessionSummary.keyInsight}"
                          </div>
                        )}

                        {/* Mastered pills */}
                        {sessionSummary.mastered?.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(74,222,128,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>✓ Mastered</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {sessionSummary.mastered.map((t, i) => (
                                <motion.span
                                  key={i}
                                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.08 * i + 0.25, type: 'spring', stiffness: 420, damping: 22 }}
                                  style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.28)', fontSize: 11.5, fontWeight: 600, color: '#86EFAC' }}
                                >{t}</motion.span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Struggled pills */}
                        {(sessionSummary.struggled ?? sessionSummary.needsWork)?.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>↺ Needs review</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {(sessionSummary.struggled ?? sessionSummary.needsWork).map((t, i) => (
                                <motion.span
                                  key={i}
                                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.08 * i + 0.30, type: 'spring', stiffness: 420, damping: 22 }}
                                  style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', fontSize: 11.5, fontWeight: 600, color: '#FCD34D' }}
                                >{t}</motion.span>
                              ))}
                            </div>
                          </div>
                        )}

                        {sessionSummary.keyMistake && (
                          <div style={{ fontSize: 12, color: 'rgba(248,113,113,0.85)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 4, marginBottom: 8, display: 'flex', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#F87171', flexShrink: 0 }}>⚠ Key mistake: </span>{sessionSummary.keyMistake}
                          </div>
                        )}

                        {sessionSummary.nextStep && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', marginTop: sessionSummary.keyMistake ? 8 : 4 }}>
                            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>→</span>
                            <div style={{ fontSize: 12, color: 'rgba(165,180,252,0.88)', lineHeight: 1.5 }}>
                              <span style={{ fontWeight: 700, color: '#818CF8' }}>Next: </span>{sessionSummary.nextStep}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={bottomRef} />
              </div>
            </div>

            {/* Roadmap extraction indicator */}
            <AnimatePresence>
              {isExtractingRoadmap && (
                <motion.div
                  initial={{ opacity: 0, y: 6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 4, height: 0 }}
                  style={{ flexShrink: 0, padding: '0 20px 8px', overflow: 'hidden' }}>
                  <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.1, repeat: Infinity }}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'rgba(165,180,252,0.80)', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>Applying roadmap changes…</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prediction banner */}
            <AnimatePresence>
              {!isMission && !calibMode && strugglePredictions.length > 0 && (
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

            {/* ── Context-aware chips — visible during active non-mission chat ── */}
            <AnimatePresence>
              {!isEmpty && !isMission && !isThinking && contextChips.length > 0 && (
                <motion.div
                  key={contextChips.map(c => c.id).join(',')}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    flexShrink: 0,
                    display: 'flex', gap: 7, padding: '0 20px 10px',
                    overflowX: 'auto', scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {contextChips.map((chip, i) => (
                    <motion.button
                      key={chip.id}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 420, damping: 28 }}
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => { setInput(chip.label); setTimeout(() => inputRef.current?.focus(), 0) }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 13px', borderRadius: 99, flexShrink: 0,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.11)',
                        color: 'rgba(255,255,255,0.62)',
                        fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        transition: 'border-color 0.15s, color 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = `${activeTheme.accent}55`
                        e.currentTarget.style.color = 'rgba(255,255,255,0.88)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.62)'
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{chip.icon}</span>
                      {chip.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div className="chat-input-wrapper" style={{ flexShrink: 0, padding: '0 20px', paddingBottom: isMobile ? 0 : 36 }}>
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
              {/* Hidden file input for photo-in-chat — capture="environment" = rear camera on mobile */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  e.target.value = ''
                  try {
                    const result = await readFileAsBase64(f)
                    setPhotoAttachment({ file: f, ...result })
                  } catch {}
                }}
              />
              {/* Hidden file input for Aeva Watches You Solve */}
              <input
                ref={workingInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  e.target.value = ''
                  try {
                    const result = await readFileAsBase64(f)
                    setWorkingAttachment({ file: f, ...result })
                  } catch {}
                }}
              />

              {/* Working check preview strip */}
              <AnimatePresence>
                {workingAttachment && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 8, height: 0 }}
                    style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto 10px', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 14px', borderRadius: 20, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.20)' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={workingAttachment.dataUrl} alt="Working" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', display: 'block', border: '1px solid rgba(251,191,36,0.25)' }} />
                        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setWorkingAttachment(null)}
                          style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'rgba(30,30,50,0.95)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.70)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={10} strokeWidth={2.5} />
                        </motion.button>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(251,191,36,0.90)', marginBottom: 3 }}>🔍 Aeva Watches You Solve</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                          {activeNodeSession ? `Checking your ${activeNodeSession.topic} working line by line.` : 'Aeva will check your working and tell you exactly where you went wrong.'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Photo preview strip — shown when a photo is attached */}
              <AnimatePresence>
                {photoAttachment && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 8, height: 0 }}
                    style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto 10px', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      {/* Thumbnail */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={photoAttachment.dataUrl}
                          alt="Attached"
                          style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', display: 'block', border: '1px solid rgba(255,255,255,0.15)' }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setPhotoAttachment(null)}
                          style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'rgba(30,30,50,0.95)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.70)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={10} strokeWidth={2.5} />
                        </motion.button>
                      </div>
                      {/* Label */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.80)', marginBottom: 3 }}>Photo attached</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                          Add a message or just press send — Aeva will teach you the concept.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Calibration answer label — appears above input bar during diagnostic */}
              <AnimatePresence>
                {calibMode && calibSubject && (
                  <motion.div
                    key="calib-input-label"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto 6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: '#818CF8', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(165,180,252,0.75)', letterSpacing: '0.02em' }}>
                        {void calibTick}
                        Answering Q{calibStateRef.current.questionsAsked + 1}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                      Show your working for full credit
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="chat-input-bar" style={{ width: '100%', maxWidth: isMission ? 720 : 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 16px', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 999, transition: 'border 0.3s, box-shadow 0.3s', ...inputBarStyle }}>
                {/* All chat tools collapsed into one dropdown */}
                {!isMission && (
                  <ChatToolsMenu
                    onLens={()    => lensInputRef.current?.click()}
                    onPhoto={()   => photoInputRef.current?.click()}
                    onDoc={()     => setChatDocOpen(true)}
                    onDrill={()   => setDrillOpen(true)}
                    onWorking={()  => workingInputRef.current?.click()}
                    photoAttachment={photoAttachment}
                    workingAttachment={workingAttachment}
                  />
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

      {/* Aeva Docs Modal */}
      <AnimatePresence>
        {chatDocOpen && <AevaDoc onClose={() => setChatDocOpen(false)} name={name} />}
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

      {/* Worksheet Modal */}
      <AnimatePresence>
        {worksheetOpen && worksheet && (
          <WorksheetModal
            worksheet={worksheet}
            studentName={name}
            onClose={() => setWorksheetOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Appearance settings */}
      <AnimatePresence>
        {chatAppSettingsOpen && <AppSettingsPanel onClose={() => setChatAppSettingsOpen(false)} chatLayoutProps={{ isWidget, onToggle: toggleChatLayout, chatTheme, onChatThemeChange: applyChatTheme }} />}
      </AnimatePresence>

      {/* ── Calibration subject picker — fixed overlay, works empty OR mid-chat ── */}
      <AnimatePresence>
        {calibSubjectPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCalibSubjectPicker(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            />
            {/* Picker card */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9991,
                width: '90%', maxWidth: 440,
                padding: '22px 20px',
                borderRadius: 20,
                background: 'rgba(8,10,28,0.99)',
                border: '1px solid rgba(139,143,255,0.25)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.70)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
                    🎯 {calibrationStore.hasAnyCalibration() ? 'Calibrate another subject' : 'Calibrate your level'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>Up to 12 questions · adapts to your answers</div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCalibSubjectPicker(false)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={12} />
                </motion.button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(CALIBRATION_MAP).map(subject => {
                  const already = !!calibrationStore.results[subject]
                  return (
                    <motion.button
                      key={subject}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCalibSubjectPicker(false)
                        startCalibration(subject)
                        const intro = `Starting your ${SUBJECT_LABELS[subject]} diagnostic — up to 12 questions, adapts as you go.`
                        setMessages(prev => [...prev, { role: 'model', text: intro, streaming: false }])
                        setTimeout(() => sendCalibFirstQuestion(subject), 200)
                      }}
                      style={{
                        padding: '9px 15px', borderRadius: 99, cursor: 'pointer',
                        border: already ? '1px solid rgba(139,143,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
                        background: already ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.06)',
                        color: already ? 'rgba(165,180,252,0.90)' : 'rgba(255,255,255,0.75)',
                        fontSize: 13, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {SUBJECT_ICONS[subject]} {SUBJECT_LABELS[subject]}
                      {already && <span style={{ fontSize: 10, opacity: 0.6 }}>↺</span>}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Aeva's Orders toast */}
      <AnimatePresence>
        {orderToast && (
          <OrderToast
            key={orderToast.id}
            order={orderToast}
            onDismiss={() => setOrderToast(null)}
            onJump={() => {
              setOrderToast(null)
              setLabTab('orders')
              openLab()
            }}
          />
        )}
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

      {/* Chat History panel */}
      <AnimatePresence>
        {historyOpen && (
          <ChatHistoryPanel
            onClose={() => setHistoryOpen(false)}
            onResume={(s) => {
              // Load the saved session's messages back into chat
              setMessages(s.messages || [])
              setSessionState(s.finalState || 'DIAGNOSTIC')
              exchangeCountRef.current = s.exchangeCount || 0
              sessionSubjectRef.current = s.subject || null
              // Re-use same session id so continued saves update the same entry
              sessionIdRef.current = s.id
              sessionStartRef.current = s.startedAt || Date.now()
              setHistoryOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile floating Home button — bottom-left, above input bar */}
      {isMobile && !isMission && (
        <motion.button
          initial={{ opacity: 0, scale: 0.80 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.88 }}
          onClick={onBack}
          style={{
            position: 'fixed',
            bottom: 'calc(20px + env(safe-area-inset-bottom))',
            left: 16,
            zIndex: 30,
            width: 38, height: 38,
            borderRadius: '50%',
            background: 'var(--aeva-surface-1)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.60)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          }}
        >
          <Home size={16} />
        </motion.button>
      )}
    </motion.div>
  )
}

/* ═══ CHAT HISTORY PANEL ═════════════════════════ */
const STATE_BADGE_STYLE = {
  DIAGNOSTIC:    { bg: 'rgba(139,143,255,0.15)', border: 'rgba(139,143,255,0.35)', color: '#A5B4FC', label: 'Diagnosing'    },
  SCAFFOLDING:   { bg: 'rgba(126,200,227,0.15)', border: 'rgba(126,200,227,0.35)', color: '#7EC8E3', label: 'Building'      },
  STRESS_TEST:   { bg: 'rgba(233,163,100,0.15)', border: 'rgba(233,163,100,0.35)', color: '#E9A364', label: 'Stress Testing' },
  CONSOLIDATION: { bg: 'rgba(168,230,207,0.15)', border: 'rgba(168,230,207,0.35)', color: '#A8E6CF', label: 'Consolidating'  },
}

function ChatHistoryPanel({ onClose, onResume }) {
  const [sessions, setSessions] = useState(() => loadSessions())
  const [confirmClear, setConfirmClear] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)
  const accent = useUITheme(s => s.accent)

  const { today, thisWeek, older } = groupSessions(sessions)

  // Focus search on open
  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 120) }, [])

  // Search across title, subject, and every message
  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return null
    return sessions.filter(s => {
      if (s.title?.toLowerCase().includes(q)) return true
      if (s.subject?.toLowerCase().includes(q)) return true
      return s.messages?.some(m => m.text?.toLowerCase().includes(q))
    }).map(s => {
      // Find best snippet — prefer a message that contains the query
      const matchMsg = s.messages?.find(m => m.text?.toLowerCase().includes(q))
      let snippet = null
      if (matchMsg) {
        const idx = matchMsg.text.toLowerCase().indexOf(q)
        const start = Math.max(0, idx - 40)
        const end = Math.min(matchMsg.text.length, idx + q.length + 60)
        snippet = (start > 0 ? '…' : '') + matchMsg.text.slice(start, end) + (end < matchMsg.text.length ? '…' : '')
      }
      return { ...s, snippet, matchRole: matchMsg?.role }
    })
  }, [q, sessions])

  const handleDelete = (id, e) => {
    e.stopPropagation()
    deleteSession(id)
    setSessions(loadSessions())
  }

  const handleClearAll = () => {
    if (confirmClear) {
      clearAllHistory()
      setSessions([])
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  // Highlight query matches in a string
  const Highlight = ({ text }) => {
    if (!q || !text) return <>{text}</>
    const lower = text.toLowerCase()
    const idx = lower.indexOf(q)
    if (idx === -1) return <>{text}</>
    return <>
      {text.slice(0, idx)}
      <mark style={{ background: `${accent}40`, color: accent, borderRadius: 3, padding: '0 2px' }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  }

  const SessionCard = ({ s, showSnippet = false }) => {
    const badge = STATE_BADGE_STYLE[s.finalState] || STATE_BADGE_STYLE.DIAGNOSTIC
    const preview = showSnippet && s.snippet
      ? s.snippet
      : s.messages?.find(m => m.role === 'user')?.text?.slice(0, 80) || ''
    return (
      <motion.div
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onResume(s)}
        style={{
          padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', flexDirection: 'column', gap: 6,
          position: 'relative', overflow: 'hidden',
          transition: 'background 0.15s',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Highlight text={s.title || 'Session'} />
          </span>
          <motion.button
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.90 }}
            onClick={(e) => handleDelete(s.id, e)}
            style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: 'rgba(248,113,113,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Trash2 size={10} />
          </motion.button>
        </div>

        {/* Preview / snippet */}
        {preview && (
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {showSnippet && s.matchRole && (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: s.matchRole === 'user' ? accent : 'rgba(168,230,207,0.7)', background: s.matchRole === 'user' ? `${accent}18` : 'rgba(168,230,207,0.10)', borderRadius: 4, padding: '1px 5px', marginRight: 5, letterSpacing: '0.04em' }}>
                {s.matchRole === 'user' ? 'YOU' : 'AEVA'}
              </span>
            )}
            {showSnippet ? <Highlight text={preview} /> : `"${preview}"`}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, letterSpacing: '0.03em' }}>
            {badge.label}
          </span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MessageCircle size={9} /> {s.exchangeCount || 0} exchanges
          </span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', marginLeft: 'auto' }}>
            {formatSessionDate(s.endedAt)}
          </span>
        </div>
      </motion.div>
    )
  }

  const Group = ({ label, items }) => {
    if (!items.length) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', padding: '0 2px' }}>{label}</div>
        {items.map(s => <SessionCard key={s.id} s={s} />)}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(4,5,18,0.60)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        style={{
          width: '100%', maxWidth: 360,
          height: '100%', display: 'flex', flexDirection: 'column',
          background: 'rgba(8,10,26,0.99)',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={13} color={accent} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>Chat History</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)' }}>
                  {q ? `${searchResults?.length ?? 0} result${searchResults?.length !== 1 ? 's' : ''}` : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </motion.button>
          </div>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <ScanSearch size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: q ? accent : 'rgba(255,255,255,0.28)', pointerEvents: 'none', transition: 'color 0.15s' }} />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search topics, keywords, messages…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 32px 9px 32px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${q ? accent + '55' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 11, color: 'rgba(255,255,255,0.88)',
                fontSize: 12.5, fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none', transition: 'border 0.15s',
              }}
            />
            {q && (
              <motion.button initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}>
                <X size={10} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: q ? 8 : 18 }}>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.28)', fontSize: 13, lineHeight: 1.7 }}>
              <Clock size={32} color="rgba(255,255,255,0.12)" style={{ display: 'block', margin: '0 auto 14px' }} />
              No sessions yet.<br />
              <span style={{ fontSize: 12 }}>Your chats will appear here automatically.</span>
            </div>
          ) : q ? (
            // ── Search results ──
            searchResults?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.28)', fontSize: 13, lineHeight: 1.7 }}>
                <ScanSearch size={28} color="rgba(255,255,255,0.10)" style={{ display: 'block', margin: '0 auto 12px' }} />
                No matches for "<span style={{ color: 'rgba(255,255,255,0.50)' }}>{query}</span>"
              </div>
            ) : (
              searchResults.map(s => <SessionCard key={s.id} s={s} showSnippet />)
            )
          ) : (
            // ── Grouped default view ──
            <>
              <Group label="Today" items={today} />
              <Group label="This week" items={thisWeek} />
              <Group label="Older" items={older} />
            </>
          )}
        </div>

        {/* Footer — clear all */}
        {sessions.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleClearAll}
              style={{
                width: '100%', padding: '9px', borderRadius: 11,
                background: confirmClear ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
                border: confirmClear ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: confirmClear ? '#F87171' : 'rgba(255,255,255,0.35)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {confirmClear ? 'Tap again to clear all history' : 'Clear all history'}
            </motion.button>
          </div>
        )}
      </motion.div>
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
/* ── Streak Moment banner ────────────────────────────────────────────────── */
function StreakMoment({ streak }) {
  const streakHidden = useIsHidden('streak')
  const todayKey = `aeva_streak_shown_${new Date().toDateString()}`
  const [visible, setVisible] = useState(() => {
    if (streak < 2) return false
    try { return localStorage.getItem(todayKey) !== '1' } catch { return false }
  })

  useEffect(() => {
    if (!visible) return
    try { localStorage.setItem(todayKey, '1') } catch {}
    const t = setTimeout(() => setVisible(false), 3600)
    return () => clearTimeout(t)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // All hooks called — now safe to conditionally return
  if (streak < 2 || streakHidden) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="streak-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden', flexShrink: 0 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 16px',
            background: 'linear-gradient(90deg, rgba(180,50,15,0.18) 0%, rgba(200,80,30,0.10) 100%)',
            borderBottom: '1px solid rgba(200,80,30,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <motion.span
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 0.6, delay: 0.2, repeat: 2 }}
                style={{ fontSize: 18 }}
              >🔥</motion.span>
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FDBA74', letterSpacing: '-0.01em' }}>{streak}-day streak</span>
                <span style={{ fontSize: 12, color: 'rgba(253,186,116,0.65)', marginLeft: 6 }}>Keep it up!</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.90 }}
              onClick={() => setVisible(false)}
              style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
            >×</motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── XP Toast ─────────────────────────────────────── */
function XPToast() {
  const xpHidden = useIsHidden('xp')
  const { pendingToast, clearToast } = useXPStore()
  useEffect(() => {
    if (!pendingToast) return
    const duration = pendingToast.size === 'big' ? 4200 : 3200
    const t = setTimeout(clearToast, duration)
    return () => clearTimeout(t)
  }, [pendingToast]) // eslint-disable-line react-hooks/exhaustive-deps

  const isBig = pendingToast?.size === 'big'

  if (xpHidden) return null

  return (
    <AnimatePresence>
      {pendingToast && (
        <motion.div
          key={pendingToast.id}
          initial={{ opacity: 0, y: 28, scale: isBig ? 0.80 : 0.90 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: isBig ? 0.80 : 0.90 }}
          transition={{ type: 'spring', stiffness: isBig ? 460 : 380, damping: isBig ? 22 : 26 }}
          style={{
            position: 'fixed', bottom: 28, right: 24, zIndex: 999,
            display: 'flex', flexDirection: 'column', gap: isBig ? 6 : 4,
            background: isBig
              ? 'linear-gradient(135deg, rgba(79,70,229,0.96) 0%, rgba(109,40,217,0.96) 100%)'
              : 'rgba(8,9,26,0.96)',
            border: isBig ? '1px solid rgba(165,180,252,0.40)' : '1px solid rgba(139,143,255,0.30)',
            borderRadius: isBig ? 20 : 16,
            padding: isBig ? '16px 22px' : '12px 18px',
            backdropFilter: 'blur(20px)',
            boxShadow: isBig
              ? '0 12px 48px rgba(99,102,241,0.55), 0 0 0 1px rgba(165,180,252,0.15)'
              : '0 8px 32px rgba(0,0,0,0.50)',
            fontFamily: "'Inter', system-ui, sans-serif",
            pointerEvents: 'none',
          }}
        >
          {isBig && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.05 }}
              style={{ fontSize: 28, textAlign: 'center', marginBottom: 2 }}
            >⭐</motion.div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isBig && <Zap size={13} color="#8B8FFF" fill="#8B8FFF" />}
            <motion.span
              animate={isBig ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ fontSize: isBig ? 22 : 14, fontWeight: 900, color: isBig ? '#fff' : '#8B8FFF', letterSpacing: isBig ? '-0.04em' : 0 }}
            >+{pendingToast.amount} XP</motion.span>
            <span style={{ fontSize: isBig ? 13 : 12.5, color: isBig ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.55)', fontWeight: isBig ? 600 : 400 }}>{pendingToast.label}</span>
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

/* ── Aeva Command Toast ──────────────────────────────────────────────────── */
const CMD_ICONS = {
  open_lab:              '🧪',
  open_lab_drill:        '⚡',
  add_lab_task:          '📋',
  open_arcade:           '🎮',
  lock_arcade:           '🔒',
  set_mandate:           '🎯',
  intervention:          '🚨',
  roadmap_edit:          '🗺️',
  roadmap_inject:        '➕',
  roadmap_skip:          '⏭️',
  roadmap_flag:          '🚩',
  roadmap_reprioritise:  '🔀',
  roadmap_crunch:        '⚡',
  award_xp:              '⭐',
  pin_note:              '📌',
  set_timer:             '⏱',
  lock_topic:            '🔒',
  echo:                  '✨',
}
const CMD_VERBS = {
  open_lab:              'Lab suggested',
  open_lab_drill:        'Drill loaded',
  add_lab_task:          'Task queued',
  open_arcade:           'Opening Arcade',
  lock_arcade:           'Arcade locked',
  set_mandate:           'Mandate set',
  intervention:          'Intervention incoming',
  roadmap_edit:          'Roadmap updated',
  roadmap_inject:        'Roadmap updated',
  roadmap_skip:          'Node skipped',
  roadmap_flag:          'Flagged urgent',
  roadmap_reprioritise:  'Roadmap reprioritised',
  roadmap_crunch:        'Crunch mode on',
  award_xp:              'XP awarded',
  pin_note:              'Note pinned',
  set_timer:             'Timer started',
  lock_topic:            'Topic locked',
  echo:                  'Echo saved',
}

function AevaCommandToast() {
  const { commandToast, clearCommandToast } = useAevaControlStore()

  useEffect(() => {
    if (!commandToast) return
    const t = setTimeout(clearCommandToast, 3200)
    return () => clearTimeout(t)
  }, [commandToast?.id])

  return (
    <AnimatePresence>
      {commandToast && (
        <motion.div
          key={commandToast.id}
          initial={{ opacity: 0, y: -72, scale: 0.94 }}
          animate={{ opacity: 1, y: 0,   scale: 1 }}
          exit={{   opacity: 0, y: -72, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)',
            zIndex: 8000, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 20px 11px 14px',
            borderRadius: 99,
            background: 'rgba(8,10,26,0.97)',
            border: '1px solid rgba(99,102,241,0.45)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.15), 0 0 24px rgba(99,102,241,0.18)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          {/* Pulsing dot */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', flexShrink: 0, boxShadow: '0 0 8px rgba(129,140,248,0.80)' }}
          />
          {/* Aeva logo */}
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #2D308E 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.40)' }}>
            <Star size={9} color="white" fill="white" />
          </div>
          {/* Verb */}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
            {CMD_VERBS[commandToast.type] || 'Aeva acted'}
          </span>
          {/* Detail */}
          {commandToast.label && (
            <>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>·</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {commandToast.label}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Echo Toast ─────────────────────────────────────────────────────────── */
function EchoToast() {
  const { pendingEchoToast, clearEchoToast } = useEchoStore()

  useEffect(() => {
    if (!pendingEchoToast) return
    const t = setTimeout(clearEchoToast, 5000)
    return () => clearTimeout(t)
  }, [pendingEchoToast?.id])

  return (
    <AnimatePresence>
      {pendingEchoToast && (
        <motion.div
          key={pendingEchoToast.id}
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{   opacity: 0, y: 60,  scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          style={{
            position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
            zIndex: 8100, pointerEvents: 'none',
            maxWidth: 340, width: 'calc(100% - 48px)',
            borderRadius: 20,
            background: 'rgba(8,10,26,0.97)',
            border: '1px solid rgba(167,139,250,0.35)',
            boxShadow: '0 16px 60px rgba(0,0,0,0.65), 0 0 40px rgba(167,139,250,0.15)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            fontFamily: "'Inter', system-ui, sans-serif",
            padding: '16px 20px',
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ height: 2, borderRadius: 99, background: 'linear-gradient(90deg, transparent, #A78BFA, transparent)', marginBottom: 12, transformOrigin: 'left' }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <motion.div
              animate={{ scale: [1, 1.18, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 1.4, repeat: 1 }}
              style={{ fontSize: 26, flexShrink: 0, lineHeight: 1, marginTop: 2 }}
            >
              ✨
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#A78BFA', marginBottom: 4 }}>
                Echo Saved
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35, marginBottom: 4 }}>
                {pendingEchoToast.topic}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{pendingEchoToast.moment}"
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Inactivity auto-trigger ─────────────────────────────────────────────── */
function useInactivityIntervention() {
  useEffect(() => {
    const { lastLoginDate, streak } = useXPStore.getState()
    const { activeIntervention, triggerIntervention } = useAevaControlStore.getState()
    if (activeIntervention) return   // already one pending
    if (!lastLoginDate || streak < 1) return  // first time user
    const last = new Date(lastLoginDate).getTime()
    const daysSince = (Date.now() - last) / 86400000
    if (daysSince >= 3) {
      const days = Math.floor(daysSince)
      triggerIntervention(
        `${days} days. Really?`,
        `You haven't been here in ${days} days. I don't know what you've been doing but it wasn't studying. We're fixing that right now — before you open anything else.`,
        'acknowledge',
      )
    }
  }, [])
}

/* ── Lazy-load fallback ───────────────────────────────────────────────────── */

function AppLoader() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#08091a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <AevaOrb size={80} />
      </motion.div>
    </div>
  )
}

// ─── First-time orientation card ─────────────────────────────────────────────
function OrientationCard({ onDismiss }) {
  const ROWS = [
    { icon: '🗺️', label: 'Roadmap',  desc: 'Your personalised study path — tap a node to start a session' },
    { icon: '💬', label: 'Chat',     desc: 'Ask Aeva anything, get step-by-step explanations instantly'   },
    { icon: '🏆', label: 'Arcade',   desc: 'Drill what you\'ve studied and test yourself under pressure'   },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 16, scale: 0.97  }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{
        position: 'fixed', bottom: 28, right: 24, zIndex: 180,
        width: 310,
        background: 'linear-gradient(135deg, rgba(18,16,50,0.97) 0%, rgba(12,10,38,0.99) 100%)',
        border: '1px solid rgba(139,143,255,0.22)',
        borderRadius: 20,
        padding: '20px 20px 16px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,143,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(139,143,255,0.65)', marginBottom: 4 }}>
          Getting started
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
          Here's how Aeva works
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {ROWS.map(({ icon, label, desc }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <span style={{ fontSize: 17, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{icon}</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)', marginRight: 5 }}>{label}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Dismiss */}
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(99,102,241,0.38)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onDismiss}
        style={{
          width: '100%', padding: '11px', borderRadius: 12,
          background: 'linear-gradient(135deg, #3D40A8, #5558D4)',
          border: '1px solid rgba(139,143,255,0.35)',
          color: 'white', fontSize: 13.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        Got it <ArrowRight size={14} />
      </motion.button>
    </motion.div>
  )
}

export default function App() {
  // ── Shared roadmap route: /r/:code ──────────────────────────────────────────
  const _pathMatch = window.location.pathname.match(/^\/r\/([a-z0-9]+)$/i)
  if (_pathMatch) return (
    <Suspense fallback={<AppLoader />}>
      <SharedRoadmapView shareCode={_pathMatch[1]} />
    </Suspense>
  )

  useInactivityIntervention()
  const [view, setView] = useState('dashboard')
  const [authUser, setAuthUser] = useState(undefined)
  const [showLogin, setShowLogin] = useState(false)
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('aeva_onboarded'))
  const [oriented,  setOriented]  = useState(() => !!localStorage.getItem('aeva_oriented'))
  const [adminMode, setAdminMode] = useState(() => sessionStorage.getItem('aeva_admin_session') === '1')
  const [showAdminLogin, setShowAdminLogin] = useState(() => new URLSearchParams(window.location.search).has('admin'))
  const { activeMode, exitMission } = useArcadeStore()

  // Auto-open Study Room join if URL has ?room=CODE (from QR code scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    if (roomCode) {
      window.history.replaceState({}, '', window.location.pathname) // clean URL
      setTimeout(() => import('./studyRoomStore').then(m => m.useStudyRoomStore.getState().openWithCode(roomCode)), 800)
    }
  }, [])
  const { checkStreak } = useXPStore()

  useEffect(() => {
    if (activeMode) setView('chat')
  }, [activeMode])

  // Navigate to ChatView when roadmap launches a node (Lab or Learn)
  const _pendingChatOpen   = useAevaControlStore(s => s.pendingChatOpen)
  const _pendingChatPrompt = useAevaControlStore(s => s.pendingChatPrompt)
  useEffect(() => {
    if (_pendingChatOpen || _pendingChatPrompt) {
      setView('chat')
      if (_pendingChatOpen) useAevaControlStore.getState().clearChatView()
    }
  }, [_pendingChatOpen, _pendingChatPrompt])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user ?? null)
      if (data.session?.user) checkStreak()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null)
      if (!session) { setCurrentUser(null); setView('dashboard'); setShowLogin(false) }
      if (session?.user) checkStreak()
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load cloud data when user signs in and hydrate all stores
  useEffect(() => {
    if (!authUser?.id) return
    loadAndHydrateUser(authUser.id).then(() => {
      try {
        const cards = JSON.parse(localStorage.getItem('aeva_sr_v1') || '[]')
        useSRStore.setState({ cards })
      } catch {}
      try {
        const rm = JSON.parse(localStorage.getItem('aeva_roadmaps_v1') || 'null')
        if (rm) useRoadmapStore.setState(s => ({ ...s, roadmaps: rm.roadmaps || [], activeRoadmapId: rm.activeRoadmapId || null }))
      } catch {}
      try {
        const hist  = JSON.parse(localStorage.getItem('aeva_drill_history_v1') || '[]')
        const ords  = JSON.parse(localStorage.getItem('aeva_lab_orders_v1')    || '[]')
        useLabStore.setState(s => ({ ...s, drillHistory: hist, orders: ords }))
      } catch {}
      try {
        const xp = JSON.parse(localStorage.getItem('aeva_xp_v1') || 'null')
        if (xp) useXPStore.setState(s => ({ ...s, ...xp }))
      } catch {}
    })
  }, [authUser?.id])

  // Admin panel — completely separate from user auth
  if (adminMode) {
    return (
      <Suspense fallback={<AppLoader />}>
        <AdminPanel onLogout={() => {
          sessionStorage.removeItem('aeva_admin_session')
          setAdminMode(false)
        }} />
      </Suspense>
    )
  }

  if (showAdminLogin) {
    return (
      <Suspense fallback={<AppLoader />}>
        <AdminLogin
          onSuccess={() => { setAdminMode(true); setShowAdminLogin(false) }}
          onCancel={() => setShowAdminLogin(false)}
        />
      </Suspense>
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
    return (
      <Suspense fallback={<AppLoader />}>
        {showLogin
          ? <LoginScreen onBack={() => setShowLogin(false)} />
          : <LandingPage onGetStarted={() => setShowLogin(true)} />
        }
      </Suspense>
    )
  }

  const firstName = (authUser.user_metadata?.full_name || authUser.email)?.split(' ')[0] || 'there'

  // First-time onboarding
  if (!onboarded) {
    return (
      <Suspense fallback={<AppLoader />}>
        <Onboarding
          name={authUser.user_metadata?.full_name || firstName}
          onComplete={() => {
            localStorage.setItem('aeva_onboarded', '1')
            localStorage.removeItem('aeva_oriented')        // ensure orientation card shows
            localStorage.removeItem('aeva_first_node_seen') // ensure node tip shows
            setOnboarded(true)
            setOriented(false)
            // Open the roadmap the user just created so it's the first thing they see
            setTimeout(() => useRoadmapStore.getState().openRoadmapHub(), 80)
          }}
        />
      </Suspense>
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
      <Suspense fallback={null}>
      <XPToast />
      {/* Aeva Command Toast — slides from top when Aeva fires a command */}
      <AevaCommandToast />
      {/* Echo Toast — slides from bottom when a breakthrough is saved */}
      <EchoToast />
      {/* Aeva Intervention — renders above everything, no escape */}
      <AnimatePresence>
        <AevaIntervention key="intervention" />
      </AnimatePresence>
      {/* Global chaos banner */}
      <ChaosEventBanner />
      <ProTipBanner />
      {/* Global hubs — rendered at root so they work from both dashboard AND chat */}
      <ArcadeHub />
      <LabHub />
      <RoadmapHub />
      {/* Study With Me — always mounted so timer survives navigation */}
      <StudyWithMe />
      {/* Exam Simulator — always mounted so it can intercept aeva:open-exam events */}
      <ExamSimulator />
      {/* Study Room — always mounted so live session survives navigation */}
      <StudyRoom />
      <AnimatePresence mode="wait" initial={false}>
        {view === 'dashboard'
          ? <DashboardView key="dashboard" onChatOpen={() => setView('chat')} onSignOut={() => supabase.auth.signOut()} />
          : activeMode === 'arena'
            ? <DebateArena key="arena" onBack={handleBack} />
            : <ChatView key="chat" onBack={handleBack} />
        }
      </AnimatePresence>
      {/* First-time orientation card — shown once after onboarding on the dashboard */}
      <AnimatePresence>
        {view === 'dashboard' && !oriented && (
          <OrientationCard
            key="orientation"
            onDismiss={() => {
              localStorage.setItem('aeva_oriented', '1')
              setOriented(true)
            }}
          />
        )}
      </AnimatePresence>
      </Suspense>
    </UserContext.Provider>
  )
}
