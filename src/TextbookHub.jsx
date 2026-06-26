/**
 * TextbookHub — Adaptive AI Textbook
 *
 * Phase 1:
 *   - Character creation (name, animal, gender)
 *   - AI-generated story starring your character
 *   - 5 comprehension questions, AI-graded
 *   - Difficulty 1-100, auto levels up/down
 *   - XP rewards on chapter completion
 *   - Progress dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GROQ_URL, nextGroqKey } from './groqClient'
import { useXPStore } from './xpStore'

/* ── Constants ────────────────────────────────────────────────────────────── */

const STORE_KEY = 'aeva_textbook_v1'

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

const BADGES = [
  { id: 'first_chapter',  icon: '📖', label: 'Chapter 1',     condition: s => s.chaptersRead >= 1 },
  { id: 'five_chapters',  icon: '📚', label: 'Bookworm',       condition: s => s.chaptersRead >= 5 },
  { id: 'perfect_score',  icon: '🌟', label: 'Perfect Score',  condition: s => s.perfectScores >= 1 },
  { id: 'streak_3',       icon: '🔥', label: '3-Day Streak',   condition: s => s.streak >= 3 },
  { id: 'level_10',       icon: '🏆', label: 'Level 10',       condition: s => s.difficulty >= 10 },
  { id: 'level_50',       icon: '💎', label: 'Halfway Hero',   condition: s => s.difficulty >= 50 },
]

const SKILL_LABELS = {
  vocabulary:    { icon: '🔤', label: 'Vocabulary' },
  comprehension: { icon: '🧠', label: 'Comprehension' },
  inference:     { icon: '🔍', label: 'Inference' },
  critical:      { icon: '⚡', label: 'Critical Thinking' },
}

/* ── Persistence ──────────────────────────────────────────────────────────── */

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null') } catch { return null }
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
    lastReadDate: null,
    earnedBadges: [],
    skills: { vocabulary: 1, comprehension: 1, inference: 1, critical: 1 },
    chapters: [],
  }
}

/* ── Groq helpers ─────────────────────────────────────────────────────────── */

async function groqJSON(prompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nextGroqKey()}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

async function generateChapter(character, difficulty, skills) {
  const { name, animal, gender } = character
  const pronoun = gender === 'girl' ? 'she' : gender === 'boy' ? 'he' : 'they'
  const possessive = gender === 'girl' ? 'her' : gender === 'boy' ? 'his' : 'their'

  // Determine weak skill to focus inference/critical questions on
  const weakestSkill = Object.entries(skills).sort((a, b) => a[1] - b[1])[0][0]

  const levelDesc = difficulty < 15 ? 'very simple sentences, short paragraphs, basic vocabulary (age 7-8)'
    : difficulty < 35 ? 'clear sentences, 2-3 paragraphs, moderate vocabulary (age 9-11)'
    : difficulty < 60 ? 'complex sentences, 3-4 paragraphs, rich vocabulary, figurative language (age 12-14)'
    : 'sophisticated prose, multiple paragraphs, advanced vocabulary, subtext and themes (age 15+)'

  const storyThemes = difficulty < 20
    ? ['a mystery object', 'a new friend', 'a lost pet', 'a secret door', 'a strange map']
    : difficulty < 50
    ? ['an ancient ruin', 'a dangerous journey', 'a hidden talent discovered', 'a rival to overcome', 'a world-changing invention']
    : ['a moral dilemma with no clear answer', 'a society where something fundamental is different', 'betrayal and redemption', 'the cost of ambition', 'identity and belonging']
  const theme = storyThemes[Math.floor(Math.random() * storyThemes.length)]

  const prompt = `Generate a personalized reading chapter for a student. Return valid JSON only.

Character: ${name}, a ${animal} (${pronoun}/${possessive})
Difficulty level: ${difficulty}/100 — ${levelDesc}
Story theme: ${theme}
Focus the harder questions on: ${weakestSkill}

Return this exact JSON structure:
{
  "title": "Chapter title",
  "story": "The full story passage (${difficulty < 20 ? '80-120' : difficulty < 50 ? '150-220' : '250-350'} words). ${name} must be the main character. Make it genuinely gripping — real stakes, real emotion, real action.",
  "vocabulary": [
    { "word": "word1", "definition": "simple definition" },
    { "word": "word2", "definition": "simple definition" },
    { "word": "word3", "definition": "simple definition" }
  ],
  "questions": [
    { "id": 1, "type": "comprehension", "question": "Direct question answered in the text", "hint": "short hint if needed" },
    { "id": 2, "type": "comprehension", "question": "Another direct question from the text", "hint": "short hint" },
    { "id": 3, "type": "${weakestSkill === 'inference' ? 'inference' : 'comprehension'}", "question": "Question requiring reading between the lines", "hint": "Think about why..." },
    { "id": 4, "type": "inference", "question": "What do you think ${name} was feeling when [key moment]? Use evidence from the text.", "hint": "Look for clues in..." },
    { "id": 5, "type": "critical", "question": "Do you agree with what ${name} decided to do? Why or why not?", "hint": "There's no wrong answer — just explain your thinking" }
  ]
}`

  return groqJSON(prompt)
}

async function gradeAnswer(question, answer, story) {
  if (!answer || answer.trim().length < 3) return { score: 0, feedback: "No answer given.", skillScores: { vocabulary: 0, comprehension: 0, inference: 0, critical: 0 } }

  const prompt = `Grade this student's reading comprehension answer. Return JSON only.

Story excerpt context: "${story.slice(0, 400)}..."
Question type: ${question.type}
Question: "${question.question}"
Student's answer: "${answer}"

Grade generously — reward any genuine attempt at understanding. Return:
{
  "score": 0-100,
  "feedback": "1-2 sentences of specific, encouraging feedback. Name what they got right first, then gently note any gaps.",
  "skillScores": {
    "vocabulary": 0-100,
    "comprehension": 0-100,
    "inference": 0-100,
    "critical": 0-100
  }
}`

  return groqJSON(prompt)
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function SkillBar({ label, icon, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{icon}</span>{label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#A5B4FC' }}>Lv {value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${Math.min(100, value * 10)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }}
        />
      </div>
    </div>
  )
}

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
  const [name, setName] = useState('')
  const [animal, setAnimal] = useState(null)
  const [gender, setGender] = useState(null)
  const [step, setStep] = useState(0) // 0=name, 1=animal, 2=gender

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

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px', fontFamily: "'Inter', system-ui" }}>
          Create your character
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Every story will star your character
        </p>
      </div>

      {/* Step dots */}
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
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canNext && next()}
              placeholder="e.g. Zara, Kai, Max…"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 16, fontFamily: "'Inter', system-ui", outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="animal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
              What kind of creature is {name || 'your character'}?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {ANIMALS.map(a => (
                <motion.button key={a.id} whileTap={{ scale: 0.94 }}
                  onClick={() => setAnimal(a.id)}
                  style={{
                    padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
                    background: animal === a.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${animal === a.id ? 'rgba(99,102,241,0.60)' : 'rgba(255,255,255,0.10)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
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
              {[
                { id: 'boy',   label: 'He / Him' },
                { id: 'girl',  label: 'She / Her' },
                { id: 'other', label: 'They / Them' },
              ].map(g => (
                <motion.button key={g.id} whileTap={{ scale: 0.95 }}
                  onClick={() => setGender(g.id)}
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

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={next}
        disabled={!canNext}
        style={{
          marginTop: 28, width: '100%', padding: '15px', borderRadius: 14, cursor: canNext ? 'pointer' : 'not-allowed',
          background: canNext ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'rgba(255,255,255,0.08)',
          border: 'none', color: canNext ? '#fff' : 'rgba(255,255,255,0.30)',
          fontSize: 15, fontWeight: 700, fontFamily: "'Inter', system-ui",
          boxShadow: canNext ? '0 4px 20px rgba(99,102,241,0.40)' : 'none',
          transition: 'all 0.2s',
        }}>
        {step < 2 ? 'Continue →' : `Let's go, ${name}! 🚀`}
      </motion.button>
    </motion.div>
  )
}

/* ── Chapter Reader ───────────────────────────────────────────────────────── */

function QuestionCard({ q, idx, onAnswer, answered, isGrading }) {
  const [text, setText] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      style={{
        padding: '18px 20px', borderRadius: 16, marginBottom: 12,
        background: answered
          ? answered.score >= 70
            ? 'rgba(34,197,94,0.08)'
            : answered.score >= 40
            ? 'rgba(234,179,8,0.08)'
            : 'rgba(239,68,68,0.08)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${answered
          ? answered.score >= 70 ? 'rgba(34,197,94,0.25)' : answered.score >= 40 ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)'
          : 'rgba(255,255,255,0.09)'}`,
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
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your answer here…"
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, fontFamily: "'Inter', system-ui", outline: 'none',
              resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
              {q.hint}
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
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
              background: answered.score >= 70 ? 'rgba(34,197,94,0.15)' : answered.score >= 40 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
              color: answered.score >= 70 ? '#4ADE80' : answered.score >= 40 ? '#FCD34D' : '#F87171',
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

function ChapterReader({ chapter, character, onComplete }) {
  const [tab, setTab] = useState('story') // story | vocab | questions
  const [answers, setAnswers] = useState({}) // { questionId: { score, feedback } }
  const [gradingId, setGradingId] = useState(null)

  const allAnswered = chapter.questions.every(q => answers[q.id])
  const avgScore = allAnswered
    ? Math.round(chapter.questions.reduce((s, q) => s + (answers[q.id]?.score || 0), 0) / chapter.questions.length)
    : null

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

  const TAB_STYLE = (active) => ({
    padding: '8px 18px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    fontFamily: "'Inter', system-ui",
    background: active ? 'rgba(99,102,241,0.22)' : 'transparent',
    border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'transparent'}`,
    color: active ? '#A5B4FC' : 'rgba(255,255,255,0.40)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 20px 40px' }}>
      {/* Chapter header */}
      <div style={{
        padding: '20px 24px', borderRadius: 18, marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.07))',
        border: '1px solid rgba(99,102,241,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CharacterAvatar character={character} size={48} />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui" }}>
              Chapter · Level {chapter.difficulty}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Inter', system-ui" }}>
              {chapter.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 99, width: 'fit-content' }}>
        {[['story', '📖 Story'], ['vocab', '🔤 Words'], ['questions', '❓ Questions']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={TAB_STYLE(tab === id)}>{label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'story' && (
          <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              padding: '28px 28px', borderRadius: 18,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              fontSize: 16, lineHeight: 1.85, color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Georgia, serif', letterSpacing: '0.01em',
            }}>
              {chapter.story}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setTab('questions')}
              style={{
                marginTop: 16, width: '100%', padding: '14px', borderRadius: 14,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Inter', system-ui", boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              }}>
              Answer questions →
            </motion.button>
          </motion.div>
        )}

        {tab === 'vocab' && (
          <motion.div key="vocab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {chapter.vocabulary.map((v, i) => (
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

        {tab === 'questions' && (
          <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {chapter.questions.map((q, i) => (
              <QuestionCard
                key={q.id} q={q} idx={i}
                answered={answers[q.id]}
                isGrading={gradingId === q.id}
                onAnswer={submitAnswer}
              />
            ))}

            {allAnswered && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '24px', borderRadius: 18, marginTop: 8, textAlign: 'center',
                  background: avgScore >= 70 ? 'rgba(34,197,94,0.08)' : avgScore >= 40 ? 'rgba(234,179,8,0.08)' : 'rgba(99,102,241,0.08)',
                  border: `1px solid ${avgScore >= 70 ? 'rgba(34,197,94,0.25)' : avgScore >= 40 ? 'rgba(234,179,8,0.25)' : 'rgba(99,102,241,0.25)'}`,
                }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>
                  {avgScore >= 90 ? '🌟' : avgScore >= 70 ? '✅' : avgScore >= 40 ? '📈' : '💪'}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontFamily: "'Inter', system-ui" }}>
                  {avgScore}%
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 18, fontFamily: "'Inter', system-ui" }}>
                  {avgScore >= 90 ? 'Perfect — levelling up!' : avgScore >= 70 ? 'Great work!' : avgScore >= 40 ? 'Good effort — keep going' : 'Keep practising — you\'ll get there'}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => onComplete(avgScore, answers)}
                  style={{
                    padding: '13px 28px', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui",
                    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  }}>
                  {avgScore >= 70 ? 'Next chapter →' : 'Try another chapter →'}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Progress Dashboard ───────────────────────────────────────────────────── */

function Dashboard({ store, onRead, onBack }) {
  const { character, difficulty, chaptersRead, earnedBadges, skills } = store

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 40px' }}>
      {/* Back */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
        fontSize: 13, fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 24,
      }}>← Back</button>

      {/* Character card */}
      <div style={{
        padding: '22px', borderRadius: 20, marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
        border: '1px solid rgba(99,102,241,0.28)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CharacterAvatar character={character} size={64} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Inter', system-ui" }}>
              {character.name}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui", marginTop: 2 }}>
              {ANIMALS.find(a => a.id === character.animal)?.label} · Level {difficulty}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(165,180,252,0.70)', fontFamily: "'Inter', system-ui", marginTop: 4 }}>
              {chaptersRead} chapter{chaptersRead !== 1 ? 's' : ''} read
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={onRead}
            style={{
              marginLeft: 'auto', padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Inter', system-ui",
            }}>
            Read →
          </motion.button>
        </div>
      </div>

      {/* Skills */}
      <div style={{
        padding: '20px', borderRadius: 18, marginBottom: 16,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui" }}>
          Skills
        </h4>
        {Object.entries(SKILL_LABELS).map(([k, { icon, label }]) => (
          <SkillBar key={k} icon={icon} label={label} value={skills[k]} />
        ))}
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div style={{
          padding: '20px', borderRadius: 18,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui" }}>
            Badges
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {earnedBadges.map(id => {
              const b = BADGES.find(b => b.id === id)
              return b ? (
                <div key={id} style={{
                  padding: '7px 14px', borderRadius: 99,
                  background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.28)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: '#FCD34D', fontFamily: "'Inter', system-ui", fontWeight: 600,
                }}>
                  {b.icon} {b.label}
                </div>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Hub ─────────────────────────────────────────────────────────────── */

export default function TextbookHub({ onBack }) {
  const [store, setStore] = useState(() => loadStore())
  const [screen, setScreen] = useState(store ? 'dashboard' : 'create') // create | dashboard | loading | reading
  const [currentChapter, setCurrentChapter] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const { addDirectXP } = useXPStore()

  function persistStore(next) {
    setStore(next)
    saveStore(next)
  }

  function handleCharacterDone(character) {
    const s = freshStore(character)
    persistStore(s)
    setScreen('dashboard')
  }

  async function startChapter() {
    if (!store) return
    setScreen('loading')
    setLoadError(null)
    try {
      const chapter = await generateChapter(store.character, store.difficulty, store.skills)
      chapter.difficulty = store.difficulty
      setCurrentChapter(chapter)
      setScreen('reading')
    } catch (e) {
      setLoadError('Could not generate chapter — check your connection.')
      setScreen('dashboard')
    }
  }

  function handleChapterComplete(avgScore, answers) {
    if (!store || !currentChapter) return

    // Update difficulty
    let newDifficulty = store.difficulty
    if (avgScore >= 90)      newDifficulty = Math.min(100, store.difficulty + 5)
    else if (avgScore >= 70) newDifficulty = Math.min(100, store.difficulty + 2)
    else if (avgScore < 50)  newDifficulty = Math.max(1, store.difficulty - 3)
    else if (avgScore < 70)  newDifficulty = Math.max(1, store.difficulty - 1)

    // Update skills from graded answers
    const skillDeltas = { vocabulary: 0, comprehension: 0, inference: 0, critical: 0 }
    let skillCounts = { vocabulary: 0, comprehension: 0, inference: 0, critical: 0 }
    Object.values(answers).forEach(a => {
      if (a.skillScores) {
        Object.entries(a.skillScores).forEach(([k, v]) => {
          skillDeltas[k] = (skillDeltas[k] || 0) + v
          skillCounts[k] = (skillCounts[k] || 0) + 1
        })
      }
    })
    const newSkills = { ...store.skills }
    Object.keys(newSkills).forEach(k => {
      if (skillCounts[k] > 0) {
        const avg = skillDeltas[k] / skillCounts[k]
        const delta = avg >= 70 ? 1 : avg >= 40 ? 0 : -0.5
        newSkills[k] = Math.max(1, Math.min(10, newSkills[k] + delta))
      }
    })

    // Update streak
    const today = new Date().toDateString()
    const streak = store.lastReadDate === today ? store.streak : store.lastReadDate === new Date(Date.now() - 86400000).toDateString() ? store.streak + 1 : 1

    const chaptersRead = store.chaptersRead + 1
    const perfectScores = store.perfectScores + (avgScore >= 95 ? 1 : 0)

    // XP reward
    const xpAmount = Math.round(20 + (avgScore / 100) * 60)
    addDirectXP(xpAmount, avgScore >= 90 ? 'Perfect chapter!' : 'Chapter complete')

    // Check badges
    const nextStore = { ...store, difficulty: newDifficulty, skills: newSkills, chaptersRead, perfectScores, streak, lastReadDate: today }
    const newBadges = BADGES
      .filter(b => !store.earnedBadges.includes(b.id) && b.condition(nextStore))
      .map(b => b.id)
    nextStore.earnedBadges = [...store.earnedBadges, ...newBadges]

    persistStore(nextStore)
    setCurrentChapter(null)
    setScreen('dashboard')
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#08091a',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      {screen !== 'create' && (
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 99, padding: '7px 14px', color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>← Back</button>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>📖 The Textbook</span>
          {store && (
            <div style={{
              marginLeft: 'auto', padding: '4px 12px', borderRadius: 99,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              fontSize: 12, color: '#A5B4FC', fontWeight: 600,
            }}>
              Level {store.difficulty}
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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Writing your chapter…</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Aeva is crafting a story just for {store?.character?.name}</div>
            </div>
          </motion.div>
        )}

        {screen === 'dashboard' && store && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loadError && (
              <div style={{ maxWidth: 600, margin: '16px auto 0', padding: '0 20px' }}>
                <div style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#FCA5A5', fontSize: 13,
                }}>
                  {loadError}
                </div>
              </div>
            )}
            <Dashboard store={store} onRead={startChapter} onBack={onBack} />
          </motion.div>
        )}

        {screen === 'reading' && currentChapter && store && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ paddingTop: 24 }}>
            <ChapterReader
              chapter={currentChapter}
              character={store.character}
              onComplete={handleChapterComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
