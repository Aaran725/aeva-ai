/**
 * TextbookHub — Adaptive AI Textbook
 *
 * Phase 1: Character creation, AI stories, comprehension grading, adaptive difficulty, XP
 * Phase 2: Living story arc (continuity), Story World Map, Chapter log, Radar skill chart,
 *           Character level titles, Coins, expanded badges
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GROQ_URL, nextGroqKey } from './groqClient'
import { useXPStore } from './xpStore'

/* ── Constants ────────────────────────────────────────────────────────────── */

const STORE_KEY = 'aeva_textbook_v2'

const ANIMALS = [
  { id: 'fox',    emoji: '🦊', label: 'Fox' },
  { id: 'wolf',   emoji: '🐺', label: 'Wolf' },
  { id: 'owl',    emoji: '🦉', label: 'Owl' },
  { id: 'tiger',  emoji: '🐯', label: 'Tiger' },
  { id: 'rabbit', emoji: '🐇', label: 'Rabbit' },
  { id: 'bear',   emoji: '🐻', label: 'Bear' },
  { id: 'dragon', emoji: '🐲', label: 'Dragon' },
  { id: 'cat',    emoji: '🐱', label: 'Cat' },
]

// Character title by difficulty level — the "living" progression arc
const LEVEL_TITLES = [
  { min: 1,  max: 10,  title: 'Explorer',    icon: '🗺️' },
  { min: 11, max: 25,  title: 'Adventurer',  icon: '⚔️' },
  { min: 26, max: 45,  title: 'Champion',    icon: '🛡️' },
  { min: 46, max: 70,  title: 'Legend',      icon: '🌟' },
  { min: 71, max: 100, title: 'Mythic',      icon: '🔮' },
]

// Story world: each era has a setting that unlocks as difficulty grows
const STORY_ERAS = [
  { min: 1,  max: 15,  setting: 'a quiet village',          icon: '🏘️',  colour: '#6EE7B7' },
  { min: 16, max: 30,  setting: 'an enchanted forest',      icon: '🌲',  colour: '#34D399' },
  { min: 31, max: 50,  setting: 'ancient ruins',            icon: '🏛️',  colour: '#60A5FA' },
  { min: 51, max: 70,  setting: 'a hidden kingdom',         icon: '🏰',  colour: '#C084FC' },
  { min: 71, max: 85,  setting: 'the edge of the world',    icon: '🌊',  colour: '#F472B6' },
  { min: 86, max: 100, setting: 'a lost civilisation',      icon: '🌌',  colour: '#FCD34D' },
]

const BADGES = [
  { id: 'first_chapter',   icon: '📖', label: 'Chapter 1',        condition: s => s.chaptersRead >= 1 },
  { id: 'five_chapters',   icon: '📚', label: 'Bookworm',          condition: s => s.chaptersRead >= 5 },
  { id: 'ten_chapters',    icon: '🎒', label: 'Chapter Crusher',   condition: s => s.chaptersRead >= 10 },
  { id: 'perfect_score',   icon: '🌟', label: 'Perfect Score',     condition: s => s.perfectScores >= 1 },
  { id: 'three_perfects',  icon: '💫', label: 'Unstoppable',       condition: s => s.perfectScores >= 3 },
  { id: 'streak_3',        icon: '🔥', label: '3-Day Streak',      condition: s => s.streak >= 3 },
  { id: 'streak_7',        icon: '🔥🔥', label: '7-Day Streak',    condition: s => s.streak >= 7 },
  { id: 'level_10',        icon: '🏆', label: 'Adventurer',        condition: s => s.difficulty >= 11 },
  { id: 'level_26',        icon: '🛡️', label: 'Champion',          condition: s => s.difficulty >= 26 },
  { id: 'level_50',        icon: '💎', label: 'Halfway Hero',      condition: s => s.difficulty >= 50 },
  { id: 'level_71',        icon: '🔮', label: 'Mythic',            condition: s => s.difficulty >= 71 },
  { id: 'skill_max',       icon: '🧠', label: 'Mind of Steel',     condition: s => Object.values(s.skills).some(v => v >= 10) },
  { id: 'coins_100',       icon: '🪙', label: '100 Coins',         condition: s => (s.coins || 0) >= 100 },
]

const SKILL_LABELS = {
  vocabulary:    { icon: '🔤', label: 'Vocabulary',        colour: '#60A5FA' },
  comprehension: { icon: '🧠', label: 'Comprehension',     colour: '#A78BFA' },
  inference:     { icon: '🔍', label: 'Inference',         colour: '#F472B6' },
  critical:      { icon: '⚡', label: 'Critical Thinking', colour: '#34D399' },
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getLevelTitle(difficulty) {
  return LEVEL_TITLES.find(t => difficulty >= t.min && difficulty <= t.max) || LEVEL_TITLES[0]
}

function getEra(difficulty) {
  return STORY_ERAS.find(e => difficulty >= e.min && difficulty <= e.max) || STORY_ERAS[0]
}

function coinsForScore(score) {
  return score >= 90 ? 15 : score >= 70 ? 10 : score >= 50 ? 6 : 3
}

/* ── Persistence ──────────────────────────────────────────────────────────── */

function loadStore() {
  // migrate from v1
  try {
    const v2 = localStorage.getItem(STORE_KEY)
    if (v2) return JSON.parse(v2)
    const v1 = localStorage.getItem('aeva_textbook_v1')
    if (v1) {
      const old = JSON.parse(v1)
      return { ...freshStore(old.character), ...old, coins: 0, storyArc: [], chapters: old.chapters || [] }
    }
    return null
  } catch { return null }
}

function saveStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch {}
}

function freshStore(character) {
  return {
    character,
    difficulty: 1,
    chaptersRead: 0,
    perfectScores: 0,
    streak: 0,
    coins: 0,
    lastReadDate: null,
    earnedBadges: [],
    skills: { vocabulary: 1, comprehension: 1, inference: 1, critical: 1 },
    // storyArc: array of { title, summary, difficulty, score, date } — the living narrative
    storyArc: [],
    // chapters: full saved chapter data for history log
    chapters: [],
  }
}

/* ── Groq helpers ─────────────────────────────────────────────────────────── */

async function groqJSON(prompt, maxTokens = 1400) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nextGroqKey()}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.78,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

async function generateChapter(character, difficulty, skills, storyArc) {
  const { name, animal, gender } = character
  const pronoun    = gender === 'girl' ? 'she' : gender === 'boy' ? 'he' : 'they'
  const possessive = gender === 'girl' ? 'her' : gender === 'boy' ? 'his' : 'their'

  const weakestSkill = Object.entries(skills).sort((a, b) => a[1] - b[1])[0][0]
  const era = getEra(difficulty)

  const levelDesc = difficulty < 15 ? 'very simple sentences, short paragraphs, basic vocabulary (age 7-8)'
    : difficulty < 35 ? 'clear sentences, 2-3 paragraphs, moderate vocabulary (age 9-11)'
    : difficulty < 60 ? 'complex sentences, 3-4 paragraphs, rich vocabulary, figurative language (age 12-14)'
    : 'sophisticated prose, multiple paragraphs, advanced vocabulary, subtext and themes (age 15+)'

  const wordCount = difficulty < 20 ? '80-120' : difficulty < 50 ? '150-220' : '250-350'

  // Build story continuity context from the arc (last 3 chapters max)
  const recentArc = storyArc.slice(-3)
  const continuityContext = recentArc.length > 0
    ? `STORY CONTINUITY — this is chapter ${storyArc.length + 1} of an ongoing story. Previous events:\n${recentArc.map((c, i) => `Chapter ${storyArc.length - recentArc.length + i + 1} ("${c.title}"): ${c.summary}`).join('\n')}\n\nThe new chapter MUST continue directly from these events. Reference specific past events, locations, or characters by name. The story should feel like one continuous novel, not disconnected short stories.`
    : `This is Chapter 1. Set up the world and character. The setting is ${era.setting}.`

  const prompt = `Generate a personalized reading chapter for a student. Return valid JSON only.

Character: ${name}, a ${animal} (${pronoun}/${possessive})
Current setting/era: ${era.setting}
Difficulty level: ${difficulty}/100 — ${levelDesc}
Focus questions on: ${weakestSkill}

${continuityContext}

Return EXACTLY this JSON (no extra keys):
{
  "title": "Vivid chapter title (5-8 words)",
  "story": "Story passage (${wordCount} words). ${name} must be the central character. Continue the arc if one exists. Make it genuinely gripping — real stakes, emotion, consequence. The setting is ${era.setting}.",
  "summary": "1-2 sentence summary of what happened in this chapter (for future continuity). Include any new characters, locations, or key decisions made.",
  "vocabulary": [
    { "word": "word1", "definition": "plain English definition, 1 sentence" },
    { "word": "word2", "definition": "plain English definition, 1 sentence" },
    { "word": "word3", "definition": "plain English definition, 1 sentence" }
  ],
  "questions": [
    { "id": 1, "type": "comprehension", "question": "Direct question answered in the text", "hint": "short hint" },
    { "id": 2, "type": "comprehension", "question": "Another direct question", "hint": "short hint" },
    { "id": 3, "type": "inference", "question": "Question requiring reading between the lines", "hint": "Think about why..." },
    { "id": 4, "type": "inference", "question": "What do you think ${name} was feeling when [key moment]? Use evidence.", "hint": "Look for clues in..." },
    { "id": 5, "type": "critical", "question": "Do you agree with what ${name} decided? Why or why not?", "hint": "No wrong answer — explain your thinking" }
  ]
}`

  return groqJSON(prompt, 1600)
}

async function gradeAnswer(question, answer, story) {
  if (!answer || answer.trim().length < 3) {
    return { score: 0, feedback: 'No answer given.', skillScores: { vocabulary: 0, comprehension: 0, inference: 0, critical: 0 } }
  }
  const prompt = `Grade this reading comprehension answer. Return JSON only.

Story context: "${story.slice(0, 400)}..."
Question type: ${question.type}
Question: "${question.question}"
Student answer: "${answer}"

Grade generously — reward genuine understanding. Return:
{
  "score": 0-100,
  "feedback": "1-2 sentences. Name what they got right first, then note any gap.",
  "skillScores": { "vocabulary": 0-100, "comprehension": 0-100, "inference": 0-100, "critical": 0-100 }
}`
  return groqJSON(prompt, 300)
}

/* ── Radar / Spider chart ─────────────────────────────────────────────────── */

function RadarChart({ skills, size = 200 }) {
  const keys   = Object.keys(SKILL_LABELS)
  const values = keys.map(k => Math.min(10, skills[k] || 1))
  const max    = 10
  const cx     = size / 2
  const cy     = size / 2
  const r      = size * 0.38

  function point(index, value) {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2
    const dist  = (value / max) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  function labelPoint(index) {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2
    const dist  = r + 22
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  // Grid rings
  const rings = [2, 4, 6, 8, 10]
  const axes  = keys.map((_, i) => point(i, max))

  // Filled polygon
  const poly = values.map((v, i) => point(i, v))
  const polyStr = poly.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {rings.map(ring => {
        const pts = keys.map((_, i) => point(i, ring))
        return (
          <polygon key={ring}
            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1}
          />
        )
      })}
      {/* Axis lines */}
      {axes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      ))}
      {/* Filled area */}
      <polygon
        points={polyStr}
        fill="rgba(99,102,241,0.22)"
        stroke="rgba(139,143,255,0.70)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Data points */}
      {poly.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={SKILL_LABELS[keys[i]].colour} stroke="#08091a" strokeWidth={2} />
      ))}
      {/* Labels */}
      {keys.map((k, i) => {
        const lp    = labelPoint(i)
        const meta  = SKILL_LABELS[k]
        const level = values[i]
        return (
          <g key={k}>
            <text x={lp.x} y={lp.y - 6} textAnchor="middle" fill={meta.colour} fontSize={11} fontWeight={700} fontFamily="Inter, system-ui">
              {meta.icon} {meta.label}
            </text>
            <text x={lp.x} y={lp.y + 8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="Inter, system-ui">
              Lv {level}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Story World Map ──────────────────────────────────────────────────────── */

function StoryWorldMap({ storyArc, currentDifficulty, character, onSelectChapter }) {
  if (storyArc.length === 0) {
    return (
      <div style={{
        padding: '32px 20px', textAlign: 'center',
        color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: "'Inter', system-ui",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
        Your story world appears after your first chapter.
      </div>
    )
  }

  const animal = ANIMALS.find(a => a.id === character.animal)

  return (
    <div style={{ padding: '0 4px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '20px 8px', minWidth: storyArc.length * 100 + 60 }}>
        {storyArc.map((ch, i) => {
          const era      = getEra(ch.difficulty)
          const isLast   = i === storyArc.length - 1
          const scoreCol = ch.score >= 90 ? '#4ADE80' : ch.score >= 70 ? '#A5B4FC' : ch.score >= 50 ? '#FCD34D' : '#F87171'
          return (
            <React.Fragment key={i}>
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectChapter(i)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, width: 80 }}>
                {/* Node */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${era.colour}22, ${era.colour}11)`,
                  border: `2px solid ${era.colour}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, position: 'relative',
                }}>
                  {era.icon}
                  {/* Score dot */}
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: scoreCol, border: '2px solid #08091a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 900, color: '#000',
                  }}>{ch.score >= 90 ? '★' : ''}</div>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 1.3, fontFamily: "'Inter', system-ui", maxWidth: 72 }}>
                  {ch.title.slice(0, 20)}{ch.title.length > 20 ? '…' : ''}
                </div>
              </motion.div>
              {/* Connector line */}
              {!isLast && (
                <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.10)', minWidth: 20, flexShrink: 0 }} />
              )}
              {/* Character at end */}
              {isLast && (
                <>
                  <div style={{ width: 20, height: 2, background: 'rgba(255,255,255,0.10)' }} />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.25))',
                      border: '2px solid rgba(139,143,255,0.55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>
                    {animal?.emoji}
                  </motion.div>
                </>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/* ── Chapter Log ──────────────────────────────────────────────────────────── */

function ChapterLog({ chapters, storyArc, onRead }) {
  if (chapters.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: "'Inter', system-ui" }}>
        No chapters read yet.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...chapters].reverse().map((ch, i) => {
        const era = getEra(ch.difficulty)
        const arc = storyArc.find(a => a.title === ch.title)
        return (
          <motion.div key={i}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `${era.colour}15`, border: `1px solid ${era.colour}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{era.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Inter', system-ui", marginBottom: 2 }}>
                {ch.title}
              </div>
              {arc?.summary && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', fontFamily: "'Inter', system-ui", lineHeight: 1.5 }}>
                  {arc.summary}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                background: ch.score >= 70 ? 'rgba(74,222,128,0.12)' : ch.score >= 50 ? 'rgba(252,211,77,0.12)' : 'rgba(248,113,113,0.12)',
                color: ch.score >= 70 ? '#4ADE80' : ch.score >= 50 ? '#FCD34D' : '#F87171',
              }}>{ch.score}%</div>
              <button onClick={() => onRead(ch)} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8, padding: '3px 10px', color: 'rgba(255,255,255,0.45)',
                fontSize: 11, cursor: 'pointer', fontFamily: "'Inter', system-ui",
              }}>Re-read</button>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ── Character Avatar ─────────────────────────────────────────────────────── */

function CharacterAvatar({ character, size = 64 }) {
  const animal = ANIMALS.find(a => a.id === character.animal)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))',
      border: '2px solid rgba(139,143,255,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, flexShrink: 0,
    }}>
      {animal?.emoji || '📖'}
    </div>
  )
}

/* ── Character Creation ───────────────────────────────────────────────────── */

function CharacterCreation({ onDone }) {
  const [name, setName]     = useState('')
  const [animal, setAnimal] = useState(null)
  const [gender, setGender] = useState(null)
  const [step, setStep]     = useState(0)

  const canNext = (step === 0 && name.trim().length >= 2)
    || (step === 1 && animal)
    || (step === 2 && gender)

  function next() {
    if (step < 2) setStep(s => s + 1)
    else onDone({ name: name.trim(), animal, gender })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px', fontFamily: "'Inter', system-ui" }}>
          Create your character
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Every story will star your character
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: i === step ? 20 : 8, height: 8, borderRadius: 99,
            background: i <= step ? '#6366F1' : 'rgba(255,255,255,0.12)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>
              What's your character's name?
            </label>
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canNext && next()}
              placeholder="e.g. Zara, Kai, Max…"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 16, fontFamily: "'Inter', system-ui", outline: 'none', boxSizing: 'border-box',
              }}
            />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="animal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
              What kind of creature is {name}?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {ANIMALS.map(a => (
                <motion.button key={a.id} whileTap={{ scale: 0.94 }} onClick={() => setAnimal(a.id)}
                  style={{
                    padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
                    background: animal === a.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${animal === a.id ? 'rgba(99,102,241,0.60)' : 'rgba(255,255,255,0.10)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 26 }}>{a.emoji}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)', fontFamily: "'Inter', system-ui" }}>{a.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="gender" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
              What pronouns does {name} use?
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ id: 'boy', label: 'He / Him' }, { id: 'girl', label: 'She / Her' }, { id: 'other', label: 'They / Them' }].map(g => (
                <motion.button key={g.id} whileTap={{ scale: 0.95 }} onClick={() => setGender(g.id)}
                  style={{
                    flex: 1, padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
                    background: gender === g.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${gender === g.id ? 'rgba(99,102,241,0.60)' : 'rgba(255,255,255,0.10)'}`,
                    color: 'rgba(255,255,255,0.80)', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Inter', system-ui", transition: 'all 0.15s',
                  }}>
                  {g.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={next} disabled={!canNext}
        style={{
          marginTop: 28, width: '100%', padding: '15px', borderRadius: 14, cursor: canNext ? 'pointer' : 'not-allowed',
          background: canNext ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'rgba(255,255,255,0.08)',
          border: 'none', color: canNext ? '#fff' : 'rgba(255,255,255,0.30)',
          fontSize: 15, fontWeight: 700, fontFamily: "'Inter', system-ui",
          boxShadow: canNext ? '0 4px 20px rgba(99,102,241,0.40)' : 'none', transition: 'all 0.2s',
        }}>
        {step < 2 ? 'Continue →' : `Let's go, ${name}! 🚀`}
      </motion.button>
    </motion.div>
  )
}

/* ── Question Card ────────────────────────────────────────────────────────── */

function QuestionCard({ q, idx, onAnswer, answered, isGrading }) {
  const [text, setText] = useState('')
  const scoreCol = answered
    ? answered.score >= 70 ? '#4ADE80' : answered.score >= 40 ? '#FCD34D' : '#F87171'
    : null

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
      style={{
        padding: '18px 20px', borderRadius: 16, marginBottom: 12,
        background: answered ? `${scoreCol}10` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${answered ? `${scoreCol}40` : 'rgba(255,255,255,0.09)'}`,
      }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 99, flexShrink: 0,
          background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#A5B4FC',
        }}>{idx + 1}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontFamily: "'Inter', system-ui" }}>
          {q.question}
        </div>
      </div>

      {!answered ? (
        <>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Write your answer here…" rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, fontFamily: "'Inter', system-ui",
              outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
            }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>{q.hint}</span>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => text.trim() && onAnswer(q.id, text)}
              disabled={!text.trim() || isGrading}
              style={{
                padding: '7px 16px', borderRadius: 99, cursor: text.trim() ? 'pointer' : 'not-allowed',
                background: text.trim() ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${text.trim() ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.10)'}`,
                color: text.trim() ? '#A5B4FC' : 'rgba(255,255,255,0.25)',
                fontSize: 12, fontWeight: 700, fontFamily: "'Inter', system-ui",
              }}>
              {isGrading ? 'Grading…' : 'Submit →'}
            </motion.button>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: `${scoreCol}20`, color: scoreCol,
            }}>{answered.score}%</div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', system-ui" }}>
            {answered.feedback}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ── Chapter Reader ───────────────────────────────────────────────────────── */

function ChapterReader({ chapter, character, storyArc, onComplete, readOnly = false }) {
  const [tab, setTab]           = useState('story')
  const [answers, setAnswers]   = useState({})
  const [gradingId, setGradingId] = useState(null)

  const allAnswered = !readOnly && chapter.questions?.every(q => answers[q.id])
  const avgScore    = allAnswered
    ? Math.round(chapter.questions.reduce((s, q) => s + (answers[q.id]?.score || 0), 0) / chapter.questions.length)
    : null

  const era = getEra(chapter.difficulty || 1)
  const chNum = storyArc ? storyArc.findIndex(a => a.title === chapter.title) + 1 : null

  async function submitAnswer(qId, text) {
    setGradingId(qId)
    const q = chapter.questions.find(q => q.id === qId)
    try {
      const result = await gradeAnswer(q, text, chapter.story)
      setAnswers(prev => ({ ...prev, [qId]: result }))
    } catch {
      setAnswers(prev => ({ ...prev, [qId]: { score: 50, feedback: "Couldn't grade right now — marked as attempted.", skillScores: { vocabulary: 50, comprehension: 50, inference: 50, critical: 50 } } }))
    }
    setGradingId(null)
  }

  const TAB = (active) => ({
    padding: '8px 18px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    fontFamily: "'Inter', system-ui",
    background: active ? 'rgba(99,102,241,0.22)' : 'transparent',
    border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'transparent'}`,
    color: active ? '#A5B4FC' : 'rgba(255,255,255,0.40)', transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 20px 40px' }}>
      {/* Header */}
      <div style={{
        padding: '18px 22px', borderRadius: 18, marginBottom: 20,
        background: `linear-gradient(135deg, ${era.colour}12, ${era.colour}06)`,
        border: `1px solid ${era.colour}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CharacterAvatar character={character} size={48} />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui" }}>
              {era.icon} {era.setting}{chNum ? ` · Chapter ${chNum}` : ''}{readOnly ? ' · Re-reading' : ''}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Inter', system-ui" }}>
              {chapter.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 99, width: 'fit-content' }}>
        {[['story', '📖 Story'], ['vocab', '🔤 Words'], ...(!readOnly ? [['questions', '❓ Questions']] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={TAB(tab === id)}>{label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'story' && (
          <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              padding: '28px', borderRadius: 18,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              fontSize: 16, lineHeight: 1.85, color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Georgia, serif', letterSpacing: '0.01em', whiteSpace: 'pre-wrap',
            }}>
              {chapter.story}
            </div>
            {!readOnly && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setTab('questions')}
                style={{
                  marginTop: 16, width: '100%', padding: '14px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Inter', system-ui", boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                }}>
                Answer questions →
              </motion.button>
            )}
          </motion.div>
        )}

        {tab === 'vocab' && (
          <motion.div key="vocab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {(chapter.vocabulary || []).map((v, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{
                  padding: '14px 18px', borderRadius: 14, marginBottom: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                  display: 'flex', alignItems: 'baseline', gap: 12,
                }}>
                <span style={{ fontWeight: 800, color: '#A5B4FC', fontSize: 15, fontFamily: "'Inter', system-ui", minWidth: 80 }}>
                  {v.word}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', fontFamily: "'Inter', system-ui", lineHeight: 1.5 }}>
                  {v.definition}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {tab === 'questions' && !readOnly && (
          <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {(chapter.questions || []).map((q, i) => (
              <QuestionCard key={q.id} q={q} idx={i}
                answered={answers[q.id]} isGrading={gradingId === q.id}
                onAnswer={submitAnswer}
              />
            ))}

            {allAnswered && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '24px', borderRadius: 18, marginTop: 8, textAlign: 'center',
                  background: avgScore >= 70 ? 'rgba(74,222,128,0.08)' : 'rgba(99,102,241,0.08)',
                  border: `1px solid ${avgScore >= 70 ? 'rgba(74,222,128,0.25)' : 'rgba(99,102,241,0.25)'}`,
                }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>
                  {avgScore >= 90 ? '🌟' : avgScore >= 70 ? '✅' : avgScore >= 50 ? '📈' : '💪'}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: "'Inter', system-ui" }}>{avgScore}%</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4, fontFamily: "'Inter', system-ui" }}>
                  +{coinsForScore(avgScore)} 🪙 coins
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18, fontFamily: "'Inter', system-ui" }}>
                  {avgScore >= 90 ? 'Perfect — levelling up!' : avgScore >= 70 ? 'Great work!' : avgScore >= 50 ? 'Good effort — keep going' : 'Keep practising'}
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => onComplete(avgScore, answers)}
                  style={{
                    padding: '13px 28px', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui",
                    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  }}>
                  {avgScore >= 70 ? 'Next chapter →' : 'Try another →'}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */

function Dashboard({ store, onRead, onBack }) {
  const [tab, setTab] = useState('home') // home | map | skills | log | badges
  const { character, difficulty, chaptersRead, earnedBadges, skills, storyArc, chapters, coins, streak } = store
  const levelTitle = getLevelTitle(difficulty)
  const era = getEra(difficulty)

  const TAB = (active) => ({
    padding: '7px 16px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    fontFamily: "'Inter', system-ui", whiteSpace: 'nowrap',
    background: active ? 'rgba(99,102,241,0.22)' : 'transparent',
    border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'transparent'}`,
    color: active ? '#A5B4FC' : 'rgba(255,255,255,0.40)', transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 48px' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
        fontSize: 13, fontFamily: "'Inter', system-ui", padding: 0, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>← Back</button>

      {/* Character hero card */}
      <div style={{
        padding: '22px', borderRadius: 20, marginBottom: 16,
        background: `linear-gradient(135deg, ${era.colour}15, ${era.colour}06)`,
        border: `1px solid ${era.colour}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CharacterAvatar character={character} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Inter', system-ui" }}>
                {character.name}
              </div>
              <div style={{
                padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: `${era.colour}20`, color: era.colour,
                fontFamily: "'Inter', system-ui",
              }}>
                {levelTitle.icon} {levelTitle.title}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui", display: 'flex', gap: 14 }}>
              <span>Lv {difficulty}</span>
              <span>{chaptersRead} chapters</span>
              <span>🔥 {streak} day streak</span>
              <span>🪙 {coins || 0}</span>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onRead}
            style={{
              padding: '11px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui",
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            }}>
            Read →
          </motion.button>
        </div>

        {/* Level progress bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', system-ui" }}>
              {era.setting}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', system-ui" }}>
              Level {difficulty} / 100
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              animate={{ width: `${difficulty}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, #6366F1, ${era.colour})` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', padding: '4px 0' }}>
        {[['home', '🏠 Home'], ['map', '🗺️ World'], ['skills', '📊 Skills'], ['log', '📚 Log'], ['badges', '🏅 Badges']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={TAB(tab === id)}>{label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Next chapter teaser based on arc */}
            {storyArc.length > 0 && (
              <div style={{
                padding: '16px 18px', borderRadius: 14, marginBottom: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', system-ui", marginBottom: 6 }}>
                  Story so far
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontFamily: "'Inter', system-ui" }}>
                  {storyArc[storyArc.length - 1]?.summary}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#A5B4FC', fontFamily: "'Inter', system-ui" }}>
                  Chapter {storyArc.length + 1} continues the journey…
                </div>
              </div>
            )}

            {/* Quick skill overview */}
            <div style={{
              padding: '16px 18px', borderRadius: 14,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', system-ui", marginBottom: 12 }}>
                Weakest skill to work on
              </div>
              {(() => {
                const [weakKey, weakVal] = Object.entries(skills).sort((a, b) => a[1] - b[1])[0]
                const meta = SKILL_LABELS[weakKey]
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: meta.colour, fontFamily: "'Inter', system-ui" }}>{meta.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', fontFamily: "'Inter', system-ui" }}>Level {weakVal} — Aeva will focus your next chapter here</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </motion.div>
        )}

        {tab === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              padding: '16px', borderRadius: 18,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', system-ui", marginBottom: 12 }}>
                {character.name}'s World
              </div>
              <StoryWorldMap
                storyArc={storyArc}
                currentDifficulty={difficulty}
                character={character}
                onSelectChapter={() => {}}
              />

              {/* Era legend */}
              <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STORY_ERAS.map(e => (
                  <div key={e.min} style={{
                    padding: '4px 10px', borderRadius: 99, fontSize: 11,
                    background: difficulty >= e.min ? `${e.colour}15` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${difficulty >= e.min ? `${e.colour}35` : 'rgba(255,255,255,0.08)'}`,
                    color: difficulty >= e.min ? e.colour : 'rgba(255,255,255,0.25)',
                    fontFamily: "'Inter', system-ui",
                  }}>
                    {e.icon} {e.setting} {difficulty < e.min ? `(Lv ${e.min})` : ''}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'skills' && (
          <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              padding: '24px', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <RadarChart skills={skills} size={220} />
              <div style={{ width: '100%', marginTop: 20 }}>
                {Object.entries(SKILL_LABELS).map(([k, { icon, label, colour }]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color, fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 5 }}>
                        {icon} {label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{skills[k]}/10</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                      <motion.div
                        animate={{ width: `${(skills[k] / 10) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: colour }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'log' && (
          <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ChapterLog
              chapters={chapters}
              storyArc={storyArc}
              onRead={() => {}}
            />
          </motion.div>
        )}

        {tab === 'badges' && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {BADGES.map(b => {
                const earned = earnedBadges.includes(b.id)
                return (
                  <motion.div key={b.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    style={{
                      padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12,
                      background: earned ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${earned ? 'rgba(234,179,8,0.28)' : 'rgba(255,255,255,0.07)'}`,
                      opacity: earned ? 1 : 0.5,
                    }}>
                    <div style={{ fontSize: 28 }}>{b.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: earned ? '#FCD34D' : 'rgba(255,255,255,0.40)', fontFamily: "'Inter', system-ui" }}>
                        {b.label}
                      </div>
                      {!earned && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', system-ui" }}>
                          Locked
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Badge toast ──────────────────────────────────────────────────────────── */

function BadgeToast({ badges, onDone }) {
  const [idx, setIdx] = useState(0)
  const b = BADGES.find(b => b.id === badges[idx])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.9 }}
      style={{
        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 2000, padding: '18px 28px', borderRadius: 20,
        background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(234,179,8,0.35)',
        boxShadow: '0 8px 40px rgba(234,179,8,0.20)',
        display: 'flex', alignItems: 'center', gap: 16,
        fontFamily: "'Inter', system-ui",
      }}>
      <div style={{ fontSize: 40 }}>{b?.icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Badge unlocked</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#FCD34D' }}>{b?.label}</div>
      </div>
      <motion.button whileTap={{ scale: 0.95 }}
        onClick={() => { if (idx + 1 < badges.length) setIdx(i => i + 1); else onDone() }}
        style={{
          marginLeft: 12, padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(234,179,8,0.35)',
          background: 'rgba(234,179,8,0.12)', color: '#FCD34D', fontSize: 12,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
        {idx + 1 < badges.length ? 'Next →' : 'Nice!'}
      </motion.button>
    </motion.div>
  )
}

/* ── Main Hub ─────────────────────────────────────────────────────────────── */

export default function TextbookHub({ onBack }) {
  const [store, setStore]               = useState(() => loadStore())
  const [screen, setScreen]             = useState(store ? 'dashboard' : 'create')
  const [currentChapter, setCurrentChapter] = useState(null)
  const [loadError, setLoadError]       = useState(null)
  const [newBadges, setNewBadges]       = useState([])
  const { addDirectXP }                 = useXPStore()

  function persistStore(next) { setStore(next); saveStore(next) }

  function handleCharacterDone(character) {
    persistStore(freshStore(character))
    setScreen('dashboard')
  }

  async function startChapter() {
    if (!store) return
    setScreen('loading')
    setLoadError(null)
    try {
      const chapter = await generateChapter(store.character, store.difficulty, store.skills, store.storyArc)
      chapter.difficulty = store.difficulty
      setCurrentChapter(chapter)
      setScreen('reading')
    } catch {
      setLoadError('Could not generate chapter — check your connection and try again.')
      setScreen('dashboard')
    }
  }

  function handleChapterComplete(avgScore, answers) {
    if (!store || !currentChapter) return

    // Difficulty adjustment
    let newDiff = store.difficulty
    if (avgScore >= 90)      newDiff = Math.min(100, store.difficulty + 5)
    else if (avgScore >= 70) newDiff = Math.min(100, store.difficulty + 2)
    else if (avgScore < 50)  newDiff = Math.max(1, store.difficulty - 3)
    else if (avgScore < 70)  newDiff = Math.max(1, store.difficulty - 1)

    // Skill updates
    const skillDeltas  = { vocabulary: 0, comprehension: 0, inference: 0, critical: 0 }
    const skillCounts  = { vocabulary: 0, comprehension: 0, inference: 0, critical: 0 }
    Object.values(answers).forEach(a => {
      if (a.skillScores) Object.entries(a.skillScores).forEach(([k, v]) => {
        skillDeltas[k] += v; skillCounts[k]++
      })
    })
    const newSkills = { ...store.skills }
    Object.keys(newSkills).forEach(k => {
      if (skillCounts[k] > 0) {
        const avg   = skillDeltas[k] / skillCounts[k]
        const delta = avg >= 70 ? 1 : avg >= 40 ? 0 : -0.5
        newSkills[k] = Math.max(1, Math.min(10, newSkills[k] + delta))
      }
    })

    // Streak
    const today    = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const streak   = store.lastReadDate === today ? store.streak
      : store.lastReadDate === yesterday ? store.streak + 1 : 1

    const chaptersRead  = store.chaptersRead + 1
    const perfectScores = store.perfectScores + (avgScore >= 95 ? 1 : 0)
    const coins         = (store.coins || 0) + coinsForScore(avgScore)

    // Append to story arc and chapter log
    const arcEntry = {
      title:      currentChapter.title,
      summary:    currentChapter.summary || '',
      difficulty: currentChapter.difficulty,
      score:      avgScore,
      date:       today,
    }
    const storyArc = [...store.storyArc, arcEntry]
    const chapters = [...store.chapters, { ...currentChapter, score: avgScore }]

    const nextStore = { ...store, difficulty: newDiff, skills: newSkills, chaptersRead, perfectScores, streak, coins, lastReadDate: today, storyArc, chapters }

    // Badge check
    const earned = BADGES.filter(b => !store.earnedBadges.includes(b.id) && b.condition(nextStore)).map(b => b.id)
    nextStore.earnedBadges = [...store.earnedBadges, ...earned]

    // XP
    addDirectXP(Math.round(20 + (avgScore / 100) * 60), avgScore >= 90 ? 'Perfect chapter!' : 'Chapter complete')

    persistStore(nextStore)
    if (earned.length > 0) setNewBadges(earned)
    setCurrentChapter(null)
    setScreen('dashboard')
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#08091a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      {screen !== 'create' && (
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0,
          background: '#08091a', zIndex: 10,
        }}>
          <button onClick={screen === 'reading' ? () => setScreen('dashboard') : onBack} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 99, padding: '7px 14px', color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>← {screen === 'reading' ? 'Dashboard' : 'Back'}</button>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>📖 The Textbook</span>
          {store && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)',
                fontSize: 12, color: '#FCD34D', fontWeight: 600,
              }}>🪙 {store.coins || 0}</div>
              <div style={{
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                fontSize: 12, color: '#A5B4FC', fontWeight: 600,
              }}>Lv {store.difficulty}</div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === 'create' && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CharacterCreation onDone={handleCharacterDone} />
          </motion.div>
        )}

        {screen === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 20 }}>
            <motion.div
              animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.20)', borderTopColor: '#6366F1' }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {store?.storyArc?.length > 0 ? `Continuing ${store.character.name}'s story…` : 'Writing your first chapter…'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                {store?.storyArc?.length > 0 ? 'Aeva remembers everything that happened before' : 'Every detail is built just for you'}
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'dashboard' && store && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loadError && (
              <div style={{ maxWidth: 640, margin: '16px auto 0', padding: '0 20px' }}>
                <div style={{
                  padding: '12px 16px', borderRadius: 12, marginBottom: 8,
                  background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#FCA5A5', fontSize: 13,
                }}>{loadError}</div>
              </div>
            )}
            <Dashboard store={store} onRead={startChapter} onBack={onBack} />
          </motion.div>
        )}

        {screen === 'reading' && currentChapter && store && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingTop: 24 }}>
            <ChapterReader
              chapter={currentChapter}
              character={store.character}
              storyArc={store.storyArc}
              onComplete={handleChapterComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge toasts */}
      <AnimatePresence>
        {newBadges.length > 0 && (
          <BadgeToast badges={newBadges} onDone={() => setNewBadges([])} />
        )}
      </AnimatePresence>
    </div>
  )
}
