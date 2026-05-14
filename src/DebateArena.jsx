import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Send, AlertTriangle, Zap, Shield, X, FileText } from 'lucide-react'
import { useArcadeStore } from './arcadeStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ── Constants ──────────────────────────────────────── */
const COLOR = '#A78BFA'
const COLOR_DIM = 'rgba(167,139,250,0.15)'
const COLOR_BORDER = 'rgba(167,139,250,0.30)'
const COLOR_GLOW = 'rgba(167,139,250,0.20)'

const PRESET_TOPICS = [
  { id: 'ubi',        label: 'Universal Basic Income',   icon: '💸', blurb: 'Should every citizen receive an unconditional monthly payment from the government?' },
  { id: 'climate',    label: 'Carbon Tax',               icon: '🌍', blurb: 'Is a carbon tax the most effective tool for reducing greenhouse gas emissions?' },
  { id: 'ai',         label: 'AI Regulation',            icon: '🤖', blurb: 'Should governments impose strict laws on the development and deployment of AI?' },
  { id: 'trade',      label: 'Free Trade',               icon: '🌐', blurb: 'Do open markets benefit all nations more than protectionist trade policies?' },
  { id: 'healthcare', label: 'Universal Healthcare',     icon: '🏥', blurb: 'Should healthcare be provided universally by the government, free at the point of use?' },
  { id: 'nuclear',    label: 'Nuclear Energy',           icon: '⚛️', blurb: 'Should nuclear power be a central part of the clean energy transition?' },
]

const LEVELS = [
  { id: 'beginner',      label: 'Beginner',      icon: '🌱', desc: 'Aeva is patient, explains her reasoning, and steers you toward stronger arguments.' },
  { id: 'intermediate',  label: 'Intermediate',  icon: '⚔️', desc: 'Rigorous and direct. Aeva presses every logical gap and demands evidence.' },
  { id: 'advanced',      label: 'Advanced',      icon: '🔥', desc: 'No mercy. Aeva exploits every weakness, demands citations, and never lets a fallacy slide.' },
]

const ROUND_META = {
  opening:   { num: 1, label: 'Opening Statement',  hint: 'State your position clearly. What is your core argument?' },
  rebuttal1: { num: 2, label: 'First Rebuttal',     hint: "Directly challenge Aeva's opening. Cite evidence or logic." },
  rebuttal2: { num: 3, label: 'Second Rebuttal',    hint: "Press harder. Address the specifics of Aeva's counter." },
  closing:   { num: 4, label: 'Closing Argument',   hint: 'Your final shot. Summarise your strongest case.' },
}

/* ── Helpers ────────────────────────────────────────── */
function logicColor(v) {
  if (v >= 75) return '#4ADE80'
  if (v >= 50) return '#FBBF24'
  return '#F87171'
}

function gradeColor(g) {
  if (!g) return 'rgba(255,255,255,0.4)'
  if (g[0] === 'A') return '#4ADE80'
  if (g[0] === 'B') return '#60A5FA'
  if (g[0] === 'C') return '#FBBF24'
  return '#F87171'
}

function cleanArenaText(t) {
  return t
    .replace(/\[LOGIC:\s*\d+\]/gi, '')
    .replace(/\[COUNTER:\s*[^\]]+\]/gi, '')
    .replace(/\[STEELMAN:\s*[^\]]+\]/gi, '')
    .replace(/\[FALLACY:\s*[^\]]+\]/gi, '')
    .replace(/\[ACTIONS:\s*[^\]]+\]/gi, '')
    .replace(/^\s*\n/gm, '\n')
    .trim()
}

/* ── Dynamic system prompt ───────────────────────────── */
function buildSystemPrompt({ topic, userPosition, aevaPosition, level }) {
  const topicMeta = PRESET_TOPICS.find(t => t.id === topic) || null
  const topicLabel = topicMeta?.label || topic
  const question = topicMeta?.blurb || `Should we support ${topicLabel}?`

  const levelMap = {
    beginner:     'Be patient and educational. Explain your reasoning clearly. Steer the user toward stronger arguments with gentle nudges. Pushback should be fair but encouraging.',
    intermediate: 'Be rigorous and direct. Press every logical gap. Demand evidence when claims are unsupported. Respectful but unsparing.',
    advanced:     'Be relentlessly analytical. Exploit every logical weakness immediately. Demand specific citations and data. Call out every fallacy the moment it appears. No softening, no encouragement — pure intellectual pressure.',
  }

  return `You are Aeva, an AI debate coach. In this structured debate you take the ${aevaPosition} position on the following question:

"${question}"

Your position: ${aevaPosition.toUpperCase()}
User's position: ${userPosition.toUpperCase()}
Difficulty: ${level.toUpperCase()} — ${levelMap[level]}

DEBATE STRUCTURE (4 rounds total):
Round 1: Opening statements
Round 2: First rebuttal
Round 3: Second rebuttal
Round 4: Closing arguments

STEEL-MAN RULE (mandatory for rounds 2–4): Before every rebuttal, accurately summarise the user's single strongest point, then challenge it.
Emit: [STEELMAN: one-sentence summary of their best point]

REQUIRED TAGS — emit on their own lines after every response:
[LOGIC: 0-100]     ← honest score of the user's most recent argument quality (50 on opening since no user argument yet)
[COUNTER: hint]    ← one-sentence strategic tip for how they could strengthen their NEXT argument
[ACTIONS: option1 | option2 | option3]   ← 3 argument angles the user could take next

IF you detect a logical fallacy, emit first on its own line:
[FALLACY: FallacyType — one-sentence explanation of the error]

VOICE: Intellectually rigorous, direct, confident. Cite real evidence, researchers, and studies when possible.
Response length: 50–80 words. Dense reasoning only — no filler, no pleasantries.

IMPORTANT: Begin with your opening statement now. Do not wait for the user to go first.`
}

/* ── Scoring call ────────────────────────────────────── */
async function scoreDebate(messages, config) {
  const topicMeta = PRESET_TOPICS.find(t => t.id === config.topic)
  const topicLabel = topicMeta?.label || config.topic

  const transcript = messages
    .map(m => `[${m.role === 'user' ? `USER (${config.userPosition})` : `AEVA (${config.aevaPosition})`}]\n${m.clean || m.content}`)
    .join('\n\n')

  const prompt = `You are an expert debate judge scoring a ${config.level}-level debate on "${topicLabel}".
The user argued ${config.userPosition} and Aeva argued ${config.aevaPosition}.

TRANSCRIPT:
${transcript}

Score the USER's performance only. Return ONLY valid JSON, no markdown:
{
  "evidence": "B+",
  "clarity": "A-",
  "rhetoric": "B",
  "final": "B+",
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2"],
  "summary": "2-3 sentence critique of the user's overall performance, referencing specific moments from the debate"
}

Grades: A+/A/A-/B+/B/B-/C+/C/C-/D/F. Be specific and honest.`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0.25,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  try { return JSON.parse(raw) } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch {} }
    return { evidence: 'B', clarity: 'B', rhetoric: 'B', final: 'B', strengths: [], improvements: [], summary: 'Debate complete.' }
  }
}

/* ── PDF export via print ────────────────────────────── */
function exportPDF(messages, score, config) {
  const topicMeta = PRESET_TOPICS.find(t => t.id === config.topic)
  const topicLabel = topicMeta?.label || config.topic
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const ROUND_NAMES = ['Opening Statement', 'First Rebuttal', 'Second Rebuttal', 'Closing Argument']
  const ROUNDS = ['opening', 'rebuttal1', 'rebuttal2', 'closing']

  // Group messages by round
  let roundIdx = 0
  const roundGroups = []
  messages.forEach(m => {
    if (!roundGroups[roundIdx]) roundGroups[roundIdx] = []
    roundGroups[roundIdx].push(m)
    if (m.role === 'assistant' && roundGroups[roundIdx].filter(x => x.role === 'user').length > 0) {
      roundIdx++
    }
  })

  const msgRows = messages.map(m => {
    const isUser = m.role === 'user'
    return `
      <div class="message ${isUser ? 'user-msg' : 'aeva-msg'}">
        <div class="msg-label">${isUser ? `You &mdash; ${config.userPosition}` : `Aeva &mdash; ${config.aevaPosition}`}</div>
        <div class="msg-body">${(m.clean || m.content).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
      </div>`
  }).join('')

  const strengthsHTML = (score?.strengths || []).map(s => `<li>${s}</li>`).join('')
  const improvementsHTML = (score?.improvements || []).map(s => `<li>${s}</li>`).join('')

  const gradeGlyph = (g) => {
    if (!g) return '#888'
    if (g[0] === 'A') return '#16a34a'
    if (g[0] === 'B') return '#2563eb'
    if (g[0] === 'C') return '#d97706'
    return '#dc2626'
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Aeva Debate Transcript — ${topicLabel}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, Arial, sans-serif;
    color: #111827;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.6;
  }

  .page { max-width: 720px; margin: 0 auto; padding: 48px 40px; }

  /* ── Cover ── */
  .cover {
    border-bottom: 3px solid #7c3aed;
    padding-bottom: 28px;
    margin-bottom: 36px;
  }
  .cover-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f3f0ff;
    border: 1.5px solid #c4b5fd;
    border-radius: 99px;
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: #7c3aed;
    margin-bottom: 16px;
  }
  .cover-title {
    font-size: 28px;
    font-weight: 900;
    color: #1e1b4b;
    letter-spacing: -0.03em;
    line-height: 1.2;
    margin-bottom: 8px;
  }
  .cover-topic {
    font-size: 17px;
    font-weight: 600;
    color: #4c1d95;
    margin-bottom: 14px;
  }
  .cover-meta {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .cover-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cover-meta-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
  }
  .cover-meta-value {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  /* ── Section headings ── */
  .section-heading {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7c3aed;
    border-bottom: 1px solid #e9e3ff;
    padding-bottom: 8px;
    margin: 32px 0 18px;
  }

  /* ── Messages ── */
  .message {
    margin-bottom: 18px;
    break-inside: avoid;
  }
  .msg-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .user-msg .msg-label { color: #7c3aed; }
  .aeva-msg .msg-label { color: #6b7280; }
  .msg-body {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.65;
  }
  .user-msg .msg-body {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    color: #1e1b4b;
  }
  .aeva-msg .msg-body {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    color: #111827;
  }

  /* ── Scorecard ── */
  .scorecard {
    background: #faf9ff;
    border: 2px solid #c4b5fd;
    border-radius: 16px;
    padding: 28px;
    margin-top: 8px;
    break-inside: avoid;
  }
  .grades-row {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }
  .grade-box {
    flex: 1;
    text-align: center;
    padding: 16px 12px;
    border-radius: 12px;
    background: white;
    border: 1.5px solid #e5e7eb;
  }
  .grade-value {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 4px;
  }
  .grade-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
  }
  .final-grade-row {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 24px;
    background: white;
    border-radius: 12px;
    border: 2px solid #7c3aed;
    margin-bottom: 24px;
  }
  .final-grade-value {
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
  }
  .final-grade-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 4px;
  }
  .final-summary {
    font-size: 14px;
    color: #374151;
    line-height: 1.65;
    font-style: italic;
  }
  .feedback-cols { display: flex; gap: 16px; margin-top: 20px; }
  .feedback-col { flex: 1; }
  .feedback-col-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .feedback-col.strengths .feedback-col-title { color: #16a34a; }
  .feedback-col.improve .feedback-col-title   { color: #d97706; }
  .feedback-col ul { padding-left: 16px; }
  .feedback-col li { font-size: 12.5px; color: #374151; margin-bottom: 5px; line-height: 1.5; }

  /* ── Footer ── */
  .footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-brand { font-size: 12px; font-weight: 800; color: #7c3aed; letter-spacing: -0.01em; }
  .footer-date  { font-size: 11px; color: #9ca3af; }

  @media print {
    body { font-size: 12px; }
    .page { padding: 24px 28px; }
    .cover { padding-bottom: 20px; margin-bottom: 28px; }
    .cover-title { font-size: 22px; }
    .message { break-inside: avoid; page-break-inside: avoid; }
    .scorecard { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div class="cover-badge">⚔️ Aeva Debate Arena</div>
    <div class="cover-title">Debate Transcript &amp; Critique</div>
    <div class="cover-topic">${topicLabel}</div>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Your Position</div>
        <div class="cover-meta-value">${config.userPosition}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Aeva's Position</div>
        <div class="cover-meta-value">${config.aevaPosition}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Difficulty</div>
        <div class="cover-meta-value" style="text-transform:capitalize">${config.level}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Date</div>
        <div class="cover-meta-value">${dateStr}</div>
      </div>
    </div>
  </div>

  <!-- Transcript -->
  <div class="section-heading">Full Transcript</div>
  ${msgRows}

  <!-- Scorecard -->
  ${score ? `
  <div class="section-heading" style="margin-top:40px">Scorecard</div>
  <div class="scorecard">
    <div class="grades-row">
      ${[['Evidence', score.evidence], ['Clarity', score.clarity], ['Rhetoric', score.rhetoric]].map(([lbl, val]) => `
        <div class="grade-box">
          <div class="grade-value" style="color:${gradeGlyph(val)}">${val}</div>
          <div class="grade-label">${lbl}</div>
        </div>`).join('')}
    </div>
    <div class="final-grade-row">
      <div class="final-grade-value" style="color:${gradeGlyph(score.final)}">${score.final}</div>
      <div>
        <div class="final-grade-label">Final Grade</div>
        <div class="final-summary">${score.summary || ''}</div>
      </div>
    </div>
    <div class="feedback-cols">
      ${score.strengths?.length ? `
      <div class="feedback-col strengths">
        <div class="feedback-col-title">✓ Strengths</div>
        <ul>${strengthsHTML}</ul>
      </div>` : ''}
      ${score.improvements?.length ? `
      <div class="feedback-col improve">
        <div class="feedback-col-title">↑ Areas to Improve</div>
        <ul>${improvementsHTML}</ul>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">★ aeva</div>
    <div class="footer-date">Generated ${dateStr}</div>
  </div>

</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) { alert('Allow pop-ups to export the PDF.'); return }
  win.document.write(html)
  win.document.close()
  // Give fonts a moment to load before printing
  win.onload = () => setTimeout(() => { win.focus(); win.print() }, 600)
}

/* ════════════════════════════════════════════════════════
   SETUP SCREEN
   ════════════════════════════════════════════════════════ */
function SetupScreen({ onStart, onBack }) {
  const [topic, setTopic] = useState(null)
  const [customTopic, setCustomTopic] = useState('')
  const [position, setPosition] = useState(null) // 'FOR' | 'AGAINST'
  const [level, setLevel] = useState('intermediate')
  const [showCustom, setShowCustom] = useState(false)

  const resolvedTopic = showCustom ? customTopic.trim() : topic
  const canStart = resolvedTopic && position && level

  const handleStart = () => {
    if (!canStart) return
    const aevaPosition = position === 'FOR' ? 'AGAINST' : 'FOR'
    onStart({ topic: resolvedTopic, userPosition: position, aevaPosition, level })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', padding: '28px 24px', gap: 28, maxWidth: 760, margin: '0 auto', width: '100%' }}>

      {/* Topic */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
          Choose a Topic
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {PRESET_TOPICS.map(t => (
            <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setTopic(t.id); setShowCustom(false) }}
              style={{
                padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                background: (!showCustom && topic === t.id) ? COLOR_DIM : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${(!showCustom && topic === t.id) ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 18, marginBottom: 5 }}>{t.icon}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: (!showCustom && topic === t.id) ? COLOR : 'rgba(255,255,255,0.82)', marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', lineHeight: 1.4 }}>{t.blurb}</div>
            </motion.button>
          ))}
          {/* Custom topic */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { setShowCustom(true); setTopic(null) }}
            style={{
              padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              background: showCustom ? COLOR_DIM : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${showCustom ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
              transition: 'all 0.15s',
            }}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>✏️</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: showCustom ? COLOR : 'rgba(255,255,255,0.82)', marginBottom: 3 }}>Custom Topic</div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', lineHeight: 1.4 }}>Debate any motion you choose</div>
          </motion.button>
        </div>
        {showCustom && (
          <motion.input initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            autoFocus
            placeholder="e.g. Social media does more harm than good"
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            style={{
              marginTop: 10, width: '100%', padding: '11px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${COLOR_BORDER}`,
              color: 'rgba(255,255,255,0.90)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
            }}
          />
        )}
      </div>

      {/* Your Position */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
          Your Position
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['FOR', 'AGAINST'].map(p => (
            <motion.button key={p} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setPosition(p)}
              style={{
                flex: 1, padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
                background: position === p ? COLOR_DIM : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${position === p ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
                display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
                transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 20 }}>{p === 'FOR' ? '👍' : '👎'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: position === p ? COLOR : 'rgba(255,255,255,0.75)' }}>{p}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
                {p === 'FOR' ? 'You argue in favour' : 'You argue against'}
              </span>
            </motion.button>
          ))}
        </div>
        {position && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ marginTop: 8, fontSize: 11, color: 'rgba(167,139,250,0.70)', fontStyle: 'italic' }}>
            Aeva will argue {position === 'FOR' ? 'AGAINST' : 'FOR'} — you debate each other.
          </motion.div>
        )}
      </div>

      {/* Difficulty */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
          Difficulty Level
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {LEVELS.map(l => (
            <motion.button key={l.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setLevel(l.id)}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                background: level === l.id ? COLOR_DIM : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${level === l.id ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{l.icon}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: level === l.id ? COLOR : 'rgba(255,255,255,0.80)', marginBottom: 3 }}>{l.label}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', lineHeight: 1.4 }}>{l.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={canStart ? { scale: 1.02 } : {}}
        whileTap={canStart ? { scale: 0.97 } : {}}
        onClick={handleStart}
        style={{
          padding: '16px 28px', borderRadius: 16, cursor: canStart ? 'pointer' : 'not-allowed',
          background: canStart
            ? `linear-gradient(135deg, ${COLOR}90, #6d28d9aa)`
            : 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${canStart ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
          color: canStart ? '#fff' : 'rgba(255,255,255,0.30)',
          fontSize: 15, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '-0.01em',
          opacity: canStart ? 1 : 0.6,
          boxShadow: canStart ? `0 8px 32px ${COLOR_GLOW}` : 'none',
          transition: 'all 0.2s',
        }}>
        {canStart ? '⚔️ Enter the Arena' : 'Select a topic and position to continue'}
      </motion.button>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════
   SCORING SCREEN
   ════════════════════════════════════════════════════════ */
function ScoringScreen({ score, messages, config, onBack, onNew }) {
  const topicMeta = PRESET_TOPICS.find(t => t.id === config.topic)
  const topicLabel = topicMeta?.label || config.topic

  if (!score) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
          style={{ fontSize: 13, color: COLOR, fontWeight: 600 }}>
          Evaluating your performance…
        </motion.div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>This takes a few seconds</div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ flex: 1, overflow: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

      <div style={{ width: '100%', maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Topic + result header */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLOR, marginBottom: 6 }}>Debate Complete</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>{topicLabel}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            You argued {config.userPosition} · {config.level} difficulty
          </div>
        </div>

        {/* Grades */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[['Evidence', score.evidence], ['Clarity', score.clarity], ['Rhetoric', score.rhetoric]].map(([lbl, val]) => (
            <div key={lbl} style={{ flex: 1, padding: '18px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLOR_BORDER}`, textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: gradeColor(val), letterSpacing: '-0.04em', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginTop: 6 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Final grade + summary */}
        <div style={{ padding: '20px 22px', borderRadius: 16, background: `${COLOR}12`, border: `1.5px solid ${COLOR_BORDER}`, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Final</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: gradeColor(score.final), letterSpacing: '-0.05em', lineHeight: 1 }}>{score.final}</div>
          </div>
          {score.summary && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, fontStyle: 'italic' }}>
              "{score.summary}"
            </div>
          )}
        </div>

        {/* Strengths + improvements */}
        {(score.strengths?.length > 0 || score.improvements?.length > 0) && (
          <div style={{ display: 'flex', gap: 10 }}>
            {score.strengths?.length > 0 && (
              <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(74,222,128,0.65)', marginBottom: 8 }}>Strengths</div>
                {score.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.55, marginBottom: 5 }}>• {s}</div>
                ))}
              </div>
            )}
            {score.improvements?.length > 0 && (
              <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.60)', marginBottom: 8 }}>Improve</div>
                {score.improvements.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.55, marginBottom: 5 }}>• {s}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => exportPDF(messages, score, config)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 14, cursor: 'pointer', background: COLOR_DIM, border: `1.5px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 13, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <FileText size={14} /> Export PDF Transcript
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onNew}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)', fontSize: 13, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>
            ⚔️ New Debate
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function DebateArena({ onBack }) {
  const { arenaState, processAIResponse, advanceArenaRound, setArenaScore, dismissArenaFallacy } = useArcadeStore()

  // phase: 'setup' | 'debate' | 'scoring'
  const [phase, setPhase] = useState('setup')
  const [config, setConfig] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [quickActions, setQuickActions] = useState([])

  const flowRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const roundRef = useRef('opening')

  const ROUNDS = ['opening', 'rebuttal1', 'rebuttal2', 'closing']

  // Keep roundRef in sync with store
  useEffect(() => { roundRef.current = arenaState.round }, [arenaState.round])

  // Auto-scroll
  useEffect(() => {
    if (flowRef.current) flowRef.current.scrollTop = flowRef.current.scrollHeight
  }, [messages])

  /* ── Start a new configured debate ─────────────────── */
  const handleStart = useCallback((cfg) => {
    setConfig(cfg)
    setPhase('debate')
    setMessages([])
    setQuickActions([])
    setInput('')
    // Kick off Aeva's opening after state settles
    setTimeout(() => triggerAevaResponse([], cfg), 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Groq streaming call ────────────────────────────── */
  const triggerAevaResponse = useCallback(async (history, cfg) => {
    const activeCfg = cfg || config
    if (!activeCfg) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setIsThinking(true)

    try {
      const systemPrompt = buildSystemPrompt(activeCfg)
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: activeCfg.level === 'advanced' ? 0.70 : 0.75,
          max_tokens: 280,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })

      let full = ''
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      const placeholderId = Date.now()

      setMessages(prev => [...prev, { id: placeholderId, role: 'assistant', content: '', clean: '', round: roundRef.current }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
          try {
            const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''
            full += delta
            setMessages(prev => prev.map(m =>
              m.id === placeholderId ? { ...m, content: full, clean: cleanArenaText(full) } : m
            ))
          } catch {}
        }
      }

      processAIResponse(full)

      const actMatch = full.match(/\[ACTIONS:\s*([^\]]+)\]/i)
      setQuickActions(actMatch ? actMatch[1].split('|').map(a => a.trim()).filter(Boolean).slice(0, 3) : [])

    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: 'Something went wrong. Please try again.', clean: 'Something went wrong.', round: roundRef.current }])
      }
    } finally {
      setIsThinking(false)
    }
  }, [config, processAIResponse])

  /* ── User submits a turn ─────────────────────────────── */
  const handleSend = useCallback(async (text) => {
    const t = (text || input).trim()
    if (!t || isThinking || phase !== 'debate') return
    setInput('')
    setQuickActions([])

    const currentRound = roundRef.current
    const userMsg = { id: Date.now(), role: 'user', content: t, clean: t, round: currentRound }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)

    advanceArenaRound()

    const curIdx = ROUNDS.indexOf(currentRound)
    const isLastRound = curIdx >= ROUNDS.length - 1

    if (isLastRound) {
      // Last user turn — move to scoring
      setPhase('scoring')
      try {
        const result = await scoreDebate(nextMessages, config)
        setArenaScore(result)
      } catch {
        setArenaScore({ evidence: 'B', clarity: 'B', rhetoric: 'B', final: 'B', strengths: [], improvements: [], summary: 'Debate complete.' })
      }
    } else {
      await triggerAevaResponse(nextMessages)
    }
  }, [input, isThinking, phase, messages, advanceArenaRound, config, setArenaScore, triggerAevaResponse])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const curRoundIdx = ROUNDS.indexOf(arenaState.round)
  const roundMeta = ROUND_META[arenaState.round] || ROUND_META.closing

  /* ── Header (shared across all phases) ─────────────── */
  const Header = ({ centerContent }) => (
    <div style={{ flexShrink: 0, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLOR_BORDER}`, position: 'relative', zIndex: 2 }}>
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <ChevronLeft size={14} strokeWidth={2.5} /> Exit Arena
      </motion.button>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        {centerContent}
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: COLOR, letterSpacing: '-0.01em' }}>⚔️ Debate Arena</span>
    </div>
  )

  /* ── SETUP phase ─────────────────────────────────────── */
  if (phase === 'setup') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: 'fixed', inset: 0, background: '#08091a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", zIndex: 100 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260, background: `radial-gradient(ellipse at 50% 0%, ${COLOR_GLOW} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <Header centerContent={
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Configure Your Debate</span>
        } />
        <SetupScreen onStart={handleStart} onBack={onBack} />
      </motion.div>
    )
  }

  /* ── SCORING phase ───────────────────────────────────── */
  if (phase === 'scoring') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: 'fixed', inset: 0, background: '#08091a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", zIndex: 100 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260, background: `radial-gradient(ellipse at 50% 0%, ${COLOR_GLOW} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <Header centerContent={
          <span style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>Results</span>
        } />
        <ScoringScreen
          score={arenaState.score}
          messages={messages}
          config={config}
          onBack={onBack}
          onNew={() => { setPhase('setup'); setMessages([]) }}
        />
      </motion.div>
    )
  }

  /* ── DEBATE phase ────────────────────────────────────── */
  const topicMeta = PRESET_TOPICS.find(t => t.id === config?.topic)
  const topicLabel = topicMeta?.label || config?.topic || 'Debate'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: '#08091a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", zIndex: 100 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, background: `radial-gradient(ellipse at 50% 0%, ${COLOR_GLOW} 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Header with round tracker */}
      <Header centerContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ROUNDS.map((r, i) => {
            const done = i < curRoundIdx
            const active = i === curRoundIdx
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? COLOR : done ? `${COLOR}28` : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${active ? COLOR : done ? `${COLOR}50` : 'rgba(255,255,255,0.10)'}`,
                  fontSize: 10.5, fontWeight: 800,
                  color: active ? '#fff' : done ? COLOR : 'rgba(255,255,255,0.28)',
                  flexShrink: 0,
                }}>
                  {done ? '✓' : i + 1}
                </div>
                {i < ROUNDS.length - 1 && (
                  <div style={{ width: 16, height: 1.5, background: done ? `${COLOR}50` : 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
                )}
              </div>
            )
          })}
        </div>
      } />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* LEFT — Argument Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, borderRight: `1px solid ${COLOR_BORDER}` }}>

          {/* Round sub-header */}
          <div style={{ flexShrink: 0, padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: COLOR }}>
              Round {roundMeta.num}/4
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.30)' }}>— {roundMeta.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>
              {topicLabel}
            </span>
          </div>

          {/* Messages */}
          <div ref={flowRef} style={{ flex: 1, overflow: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={msg.id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 3 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: msg.role === 'user' ? COLOR : 'rgba(255,255,255,0.30)' }}>
                    {msg.role === 'user' ? `You (${config?.userPosition})` : `Aeva (${config?.aevaPosition})`}
                  </div>
                  <div style={{
                    maxWidth: '86%', padding: '11px 15px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? `${COLOR}18` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${msg.role === 'user' ? COLOR_BORDER : 'rgba(255,255,255,0.09)'}`,
                    fontSize: 13.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.62,
                  }}>
                    {msg.clean || msg.content || (
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}
                        style={{ fontSize: 12, color: COLOR }}>Thinking…</motion.span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator when Aeva hasn't streamed yet */}
            {isThinking && messages[messages.length - 1]?.role !== 'assistant' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)' }}>
                  Aeva ({config?.aevaPosition})
                </div>
                <div style={{ padding: '11px 15px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'inline-flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${COLOR_BORDER}`, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <AnimatePresence>
              {quickActions.length > 0 && !isThinking && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickActions.map((a, i) => (
                    <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleSend(a)}
                      style={{ padding: '6px 12px', borderRadius: 99, background: COLOR_DIM, border: `1px solid ${COLOR_BORDER}`, color: COLOR, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {a}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {roundMeta.hint && (
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>{roundMeta.hint}</div>
            )}

            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isThinking}
                placeholder={`Round ${roundMeta.num} — ${roundMeta.label}…`}
                rows={2}
                style={{
                  flex: 1, resize: 'none', background: 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${COLOR_BORDER}`, borderRadius: 14,
                  color: 'rgba(255,255,255,0.90)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
                  padding: '10px 14px', outline: 'none', lineHeight: 1.5,
                  opacity: isThinking ? 0.5 : 1,
                }}
              />
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                onClick={() => handleSend()}
                disabled={isThinking || !input.trim()}
                style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: (isThinking || !input.trim()) ? 'rgba(255,255,255,0.06)' : `linear-gradient(145deg, ${COLOR}80, ${COLOR}40)`,
                  border: `1.5px solid ${(isThinking || !input.trim()) ? 'rgba(255,255,255,0.10)' : `${COLOR}60`}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                <Send size={16} color={(isThinking || !input.trim()) ? 'rgba(255,255,255,0.25)' : COLOR} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* RIGHT — Analysis HUD */}
        <div style={{ width: 252, flexShrink: 0, overflow: 'auto', padding: '14px 13px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Logic Strength */}
          <div style={{ padding: '13px 13px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={9} />Logic Strength
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 7 }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: logicColor(arenaState.logicStrength), letterSpacing: '-0.04em', lineHeight: 1 }}>
                {arenaState.logicStrength}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: 600 }}>/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${arenaState.logicStrength}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: logicColor(arenaState.logicStrength) }} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', marginTop: 5 }}>
              {arenaState.logicStrength >= 75 ? 'Strong argument' : arenaState.logicStrength >= 50 ? 'Needs more evidence' : 'Logical gaps detected'}
            </div>
          </div>

          {/* Fallacy Detector */}
          <div style={{ padding: '13px 13px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={9} />Fallacy Detector
            </div>
            <AnimatePresence>
              {arenaState.fallacyAlerts.length === 0
                ? <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.55)', fontWeight: 500 }}>No fallacies detected</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {arenaState.fallacyAlerts.map((f, i) => (
                      <motion.div key={f + i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                        <span style={{ fontSize: 10.5, color: '#FCA5A5', fontWeight: 500, lineHeight: 1.45, flex: 1 }}>{f}</span>
                        <button onClick={() => dismissArenaFallacy(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.28)', flexShrink: 0, lineHeight: 1 }}>
                          <X size={10} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
              }
            </AnimatePresence>
          </div>

          {/* Steel-Man */}
          <AnimatePresence>
            {arenaState.steelMan && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '13px 13px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.55)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Shield size={9} />Steel-Man
                </div>
                <div style={{ fontSize: 11, color: 'rgba(165,180,252,0.80)', lineHeight: 1.55 }}>"{arenaState.steelMan}"</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Counter-Strategy */}
          <AnimatePresence>
            {arenaState.counterHint && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '13px 13px', borderRadius: 14, background: `${COLOR}0A`, border: `1px solid ${COLOR}25` }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${COLOR}80`, marginBottom: 8 }}>Counter-Strategy</div>
                <div style={{ fontSize: 11, color: `${COLOR}CC`, lineHeight: 1.55 }}>{arenaState.counterHint}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Positions card */}
          <div style={{ padding: '11px 13px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', marginBottom: 7 }}>Positions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: COLOR, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.50)' }}>You — {config?.userPosition}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.50)' }}>Aeva — {config?.aevaPosition}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
