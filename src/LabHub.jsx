import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { X, FlaskConical, ChevronRight, RotateCcw, CheckCircle2, XCircle, ArrowRight, Settings, History, Zap, RefreshCw } from 'lucide-react'
import { DRILLS, DIFFICULTIES, useLabStore } from './labStore'
import { DotMatrix } from './WidgetDashboard'
import WidgetToggle from './WidgetToggle'
import FeatureSpotlight from './FeatureSpotlight'
import { useNeuralStore } from './neuralStore'
import { useSRStore } from './srStore'
import { useRoadmapStore } from './roadmapStore'
import { useXPStore } from './xpStore'

import { nextGroqKey as gKey, GROQ_URL } from './groqClient'

/* ─── AI content generator ─── */
async function generateDrillContent(drillType, topic, difficulty = 'intermediate', questionCount = 8, focusMode = 'mixed') {
  const diffInstr = DIFFICULTIES[difficulty]?.instruction || DIFFICULTIES.intermediate.instruction
  const focusInstr = focusMode === 'theory' ? 'Focus on theoretical understanding and definitions.'
    : focusMode === 'application' ? 'Focus on real-world application and problem-solving.'
    : 'Mix theory and real-world application equally.'
  const count = Math.min(Math.max(questionCount, 4), 20)

  const prompts = {
    flashcard: `Generate exactly ${count} flashcard pairs for "${topic}".
Difficulty: ${diffInstr}
Focus: ${focusInstr}
Return ONLY valid JSON: {"cards":[{"front":"question","back":"concise answer (1-2 sentences max)"}]}
Make questions probe understanding, not just recall.`,

    speedround: `Generate exactly ${Math.min(count, 10)} rapid-fire Q&A pairs for "${topic}".
Difficulty: ${diffInstr}
Return ONLY valid JSON: {"cards":[{"front":"short question","back":"answer in 1 sentence max"}]}
Questions must be answerable in under 15 seconds. Crisp, unambiguous.`,

    mocktest: `Generate exactly ${Math.min(count, 10)} multiple-choice questions about "${topic}".
Difficulty: ${diffInstr}
Focus: ${focusInstr}
Return ONLY valid JSON with this exact structure:
{"questions":[{"q":"question text","options":["option A text","option B text","option C text","option D text"],"correctAnswer":"the exact text of the correct option, copied verbatim from the options array","explanation":"why correct in 1 sentence"}]}
CRITICAL RULES — follow in this order for EVERY question:
1. SOLVE the problem yourself first to get the right answer.
2. Put that answer as one of the 4 options (exact text, e.g. "4" not "four").
3. Set "correctAnswer" to that SAME exact text.
4. Write "explanation" that confirms the same answer — it must agree with correctAnswer.
5. VERIFY: re-read your question, solve it again, confirm correctAnswer matches your solution.
- Do NOT use an index number for correctAnswer. Copy the answer text exactly from options.
- Example: options ["Paris","London","Berlin","Madrid"], correct is Paris → "correctAnswer":"Paris"
- Every question must have exactly 4 options. Make distractors plausibly wrong but clearly incorrect.`,

    feynman: `Generate a Feynman challenge for "${topic}".
Difficulty: ${diffInstr}
Return ONLY valid JSON: {
  "prompt": "Explain [specific aspect of topic] as if teaching a curious 16-year-old with no background in this area.",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"]
}
keyPoints: the 5 things a good explanation MUST cover. commonMistakes: things people usually get wrong.`,

    match: `Generate exactly ${Math.min(count, 8)} term-definition pairs about "${topic}".
Difficulty: ${diffInstr}
Return ONLY valid JSON: {"pairs":[{"term":"short term","definition":"clear 1-sentence definition"}]}
Terms must be distinct. Definitions must not contain the term.`,

    cloze: `Generate a fill-in-the-blank passage about "${topic}" for a student.
Difficulty: ${diffInstr}
Rules: Write a coherent 5-8 sentence educational paragraph. Replace ${Math.min(count, 8)} key terms or concepts with the token BLANK. Each blank should test a meaningful concept, not just filler words.
Return ONLY valid JSON: {"passage":"sentence with BLANK tokens","blanks":["answer1","answer2"],"hints":["brief hint for blank 1","brief hint for blank 2"]}
blanks array must match the number of BLANK tokens in passage, in order. hints: one short phrase per blank.`,

    shortanswer: `Generate ${Math.min(count, 6)} short-answer questions about "${topic}".
Difficulty: ${diffInstr}
Focus: ${focusInstr}
Each question should require 2-4 sentences to answer properly. Include a model answer and the 3 key points a good answer must cover.
Return ONLY valid JSON: {"questions":[{"q":"question text","modelAnswer":"ideal 3-4 sentence answer","keyPoints":["point 1","point 2","point 3"]}]}`,

    examPractice: `Generate ${Math.min(count, 5)} past-paper-style exam questions about "${topic}".
Difficulty: ${diffInstr}
Style: GCSE/A-Level exam board format (AQA/Edexcel/OCR style). Mix 1-mark, 2-mark, and 4-6 mark questions.
Each question must have a mark allocation and a detailed mark scheme.
Return ONLY valid JSON:
{"questions":[{
  "q": "Full question text exactly as it would appear on an exam paper",
  "marks": 4,
  "command": "Explain/Describe/Calculate/Evaluate/Discuss",
  "markScheme": ["marking point 1 (1 mark)","marking point 2 (1 mark)","marking point 3 (1 mark)","marking point 4 (1 mark)"],
  "modelAnswer": "Full model answer covering all mark scheme points"
}]}
Rules: markScheme array length MUST equal marks. Each point is worth 1 mark. Include key terms examiners look for in brackets e.g. (accept: mitosis/cell division).`,
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'Educational content generator. Return ONLY the requested JSON. No markdown, no explanation, no extra text.' },
        { role: 'user', content: prompts[drillType] },
      ],
      temperature: 0.45,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('Generation failed')
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

// AI marks a student's exam answer against a mark scheme
async function markExamAnswer(question, marks, markScheme, studentAnswer) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are a strict but fair exam marker. Award marks only for points explicitly covered in the mark scheme. Return ONLY valid JSON.' },
        { role: 'user', content: `Question: ${question}
Available marks: ${marks}
Mark scheme (each point = 1 mark): ${markScheme.map((p, i) => `${i + 1}. ${p}`).join('\n')}
Student answer: ${studentAnswer}

Return ONLY valid JSON:
{"awarded":${marks},"awardedPoints":["scheme point text"],"missedPoints":["scheme point text"],"feedback":"2 sentence examiner comment","examinerTip":"one specific thing to improve"}` },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  })
  const json = await res.json()
  try {
    const result = JSON.parse(json.choices[0].message.content)
    result.awarded = Math.min(marks, Math.max(0, Math.round(result.awarded)))
    return result
  } catch { return { awarded: 0, awardedPoints: [], missedPoints: markScheme, feedback: 'Could not mark this answer.', examinerTip: '' } }
}

async function generateDrillAnalysis(drillType, topic, wrongItems) {
  if (!wrongItems || wrongItems.length === 0) return null
  const itemText = wrongItems.map((w, i) => `${i + 1}. Q: "${w.q}" — Your answer was wrong. Correct: "${w.correct}"`).join('\n')
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are a precise tutor. Give a short, specific analysis of what the student got wrong and why. Be direct and concise.' },
        { role: 'user', content: `Student drilled "${topic}" (${drillType} format) and missed these:\n${itemText}\n\nIn 2-3 sentences: what is the pattern in their misunderstanding, and what should they review? Be specific, not generic.` },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  })
  const json = await res.json()
  return json.choices?.[0]?.message?.content || null
}

async function gradeFeynmanExplanation(topic, userExplanation, keyPoints, commonMistakes) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are a precise educational evaluator. Grade a student explanation and return ONLY JSON.' },
        { role: 'user', content: `Topic: "${topic}"
Key points a good explanation must cover: ${JSON.stringify(keyPoints)}
Common mistakes to watch for: ${JSON.stringify(commonMistakes)}

Student's explanation:
"${userExplanation}"

Return ONLY this JSON:
{
  "score": <0-100>,
  "covered": [<list of key points they covered well>],
  "missing": [<list of key points they missed or got wrong>],
  "feedback": "<2 sentences: what was strong, what specific gap to address>",
  "grade": "Mastery" | "Solid" | "Developing" | "Needs Work"
}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  })
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

/* ── Per-card AI explanation ── */
async function generateCardExplanation(topic, question, correctAnswer) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'Concise tutor. Explain in 2-3 sentences. Direct, specific, no fluff.' },
        { role: 'user', content: `Topic: "${topic}"\nQuestion: "${question}"\nCorrect answer: "${correctAnswer}"\n\nWhy is this the correct answer? What concept underpins it? 2-3 sentences max.` },
      ],
      temperature: 0.3,
      max_tokens: 120,
    }),
  })
  const json = await res.json()
  return json.choices?.[0]?.message?.content || null
}

function WrongItemCard({ item, topic }) {
  const [expanded, setExpanded] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleExplain = async () => {
    setExpanded(true)
    if (explanation || loading) return
    setLoading(true)
    try {
      const text = await generateCardExplanation(topic, item.q, item.correct)
      setExplanation(text)
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{ borderRadius: 11, border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.05)', overflow: 'hidden', marginBottom: 7 }}>
      <div style={{ padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.q}</div>
          <div style={{ fontSize: 11.5, color: '#4ADE80', marginTop: 3, fontWeight: 600 }}>✓ {item.correct}</div>
        </div>
        <button
          onClick={expanded ? () => setExpanded(false) : handleExplain}
          style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.24)', color: 'rgba(167,139,250,0.80)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {expanded ? 'Hide' : 'Explain'}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 13px 12px', borderTop: '1px solid rgba(239,68,68,0.12)' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 10 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#818CF8', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>Explaining…</span>
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.60, margin: '10px 0 0' }}>{explanation}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ Ai OS LED RESULT THEMES (by grade band) ═══════ */
const LAB_RESULT_THEMES = {
  mastery: {  // 90+ → Sleep card (teal)
    bg: 'radial-gradient(circle at 50% 44%, #3DE8D0 0%, #1FC8B2 30%, #14A092 52%, rgba(20,160,146,0) 72%), linear-gradient(165deg, #18B0A0 0%, #0E8A80 38%, #0A6A66 68%, #084E50 100%)',
    dot: 'rgba(190,255,244,0.97)', dim: 'rgba(255,255,255,0.05)', accent: '#5EEAD4', label: '#BFF5EC',
  },
  solid: {    // 70-89 → Skin Damage card (navy)
    bg: 'radial-gradient(circle at 52% 56%, #2E64E0 0%, #1E48C4 30%, #122E96 54%, rgba(18,46,150,0) 76%), linear-gradient(200deg, #0C1A78 0%, #0A1466 38%, #080F50 70%, #060A3C 100%)',
    dot: 'rgba(205,225,255,0.97)', dim: 'rgba(255,255,255,0.05)', accent: '#93C5FD', label: '#BFD4FF',
  },
  developing: {  // 50-69 → Weather/Streak card (ember)
    bg: 'radial-gradient(circle at 48% 46%, #FF8A3D 0%, #E8631E 28%, #B83C10 50%, rgba(184,60,16,0) 74%), linear-gradient(160deg, #9A2808 0%, #741810 40%, #4E1010 70%, #340A0A 100%)',
    dot: 'rgba(255,228,195,0.97)', dim: 'rgba(255,255,255,0.05)', accent: '#FCD34D', label: '#FCE0B0',
  },
  needswork: {   // <50 → Enhance card (cerise)
    bg: 'radial-gradient(circle at 46% 42%, #FF3A8E 0%, #E81E72 26%, #B01055 48%, rgba(176,16,85,0) 72%), linear-gradient(155deg, #800840 0%, #5A0230 40%, #3C0120 70%, #260114 100%)',
    dot: 'rgba(255,205,228,0.97)', dim: 'rgba(255,255,255,0.05)', accent: '#F9A8D4', label: '#FBC8E0',
  },
}

/* Ai OS–style LED result card: gradient + dot-matrix score */
function LedResultView({ pct, grade, band, score, drillType }) {
  const t = LAB_RESULT_THEMES[band]
  const missed = Math.max(0, score.total - score.correct)
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Hero score card */}
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative', borderRadius: 24, background: t.bg, padding: '20px 22px 24px', overflow: 'hidden', minHeight: 230, boxShadow: '0 14px 44px rgba(0,0,0,0.40)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{grade.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginTop: 1, textTransform: 'capitalize' }}>{drillType || 'Drill'}</div>
          </div>
          <span style={{ fontSize: 24 }}>{grade.emoji}</span>
        </div>
        {/* LED dot-matrix percentage */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6, padding: '26px 0 22px' }}>
          <DotMatrix value={String(pct)} color={t.dot} dimColor={t.dim} dotSize={9} gap={2} />
          <span style={{ fontSize: 22, fontWeight: 700, color: t.dot, marginTop: 4 }}>%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.label }}>{score.correct} of {score.total} correct</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Score</span>
        </div>
      </motion.div>
      {/* Two stat tiles */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, borderRadius: 18, background: LAB_RESULT_THEMES.mastery.bg, padding: '14px 16px', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 26px rgba(0,0,0,0.35)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>Correct</span>
          <DotMatrix value={String(score.correct)} color={LAB_RESULT_THEMES.mastery.dot} dimColor="rgba(255,255,255,0.05)" dotSize={6} gap={2} />
        </div>
        <div style={{ flex: 1, borderRadius: 18, background: LAB_RESULT_THEMES.needswork.bg, padding: '14px 16px', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 26px rgba(0,0,0,0.35)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>Missed</span>
          <DotMatrix value={String(missed)} color={LAB_RESULT_THEMES.needswork.dot} dimColor="rgba(255,255,255,0.05)" dotSize={6} gap={2} />
        </div>
      </div>
    </div>
  )
}

/* ═══ DRILL COMPLETE SCREEN ══════════════════════════ */
function DrillComplete({ score, wrongItems = [], onExit, onRetry, onGoHarder, topic, drillType, widgetMode = false }) {
  const { difficulty, setDifficulty, closeLab, exitDrill } = useLabStore()
  const { activeNodeSession, endNodeSession, completeNode, openRoadmapHub } = useRoadmapStore()
  const { addXP } = useXPStore()

  const handleNodeDone = () => {
    completeNode(activeNodeSession.roadmapId, activeNodeSession.nodeId)
    addXP('DRILL_COMPLETE')
    endNodeSession()
    exitDrill()
    closeLab()
    openRoadmapHub()
  }
  const pct = Math.round((score.correct / score.total) * 100)
  const grade = pct >= 90 ? { label: 'Mastery', color: '#4ADE80', emoji: '🏆', band: 'mastery' }
    : pct >= 70 ? { label: 'Solid', color: '#60A5FA', emoji: '✅', band: 'solid' }
    : pct >= 50 ? { label: 'Developing', color: '#FBBF24', emoji: '📈', band: 'developing' }
    : { label: 'Needs Work', color: '#F87171', emoji: '🔁', band: 'needswork' }
  const [analysis, setAnalysis] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  useEffect(() => {
    if (wrongItems.length > 0 && pct < 90) {
      setLoadingAnalysis(true)
      generateDrillAnalysis(drillType, topic, wrongItems)
        .then(a => { setAnalysis(a); setLoadingAnalysis(false) })
        .catch(() => setLoadingAnalysis(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canGoHarder = pct >= 80
  const difficultyKeys = ['beginner', 'intermediate', 'advanced', 'expert']
  const currentDiffIdx = difficultyKeys.indexOf(difficulty)
  const nextDifficulty = difficultyKeys[Math.min(currentDiffIdx + 1, 3)]

  const handleGoHarder = () => {
    setDifficulty(nextDifficulty)
    if (onGoHarder) onGoHarder()
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, overflowY: 'auto', paddingTop: 8 }}>


      {widgetMode ? (
        <LedResultView pct={pct} grade={grade} band={grade.band} score={score} drillType={drillType} />
      ) : (
        <>
          <div style={{ fontSize: 44 }}>{grade.emoji}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: grade.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: grade.color, marginTop: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{grade.label}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{score.correct} / {score.total} correct</div>
          </div>
        </>
      )}

      {/* Post-drill analysis */}
      {(loadingAnalysis || analysis) && (
        <div style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.80)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Aeva's Analysis</div>
          {loadingAnalysis ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#818CF8', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Analysing your mistakes…</span>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.60, margin: 0 }}>{analysis}</p>
          )}
        </div>
      )}

      {/* Wrong items — expandable per-card explain */}
      {wrongItems.length > 0 && (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
            Missed · {wrongItems.length}
          </div>
          {wrongItems.map((item, i) => <WrongItemCard key={i} item={item} topic={topic} />)}
        </div>
      )}

      {/* Adaptive difficulty */}
      {canGoHarder && currentDiffIdx < 3 && onGoHarder && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FCD34D' }}>⚡ You're ready for more</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>Try {DIFFICULTIES[nextDifficulty]?.label} difficulty?</div>
          </div>
          <button onClick={handleGoHarder} style={{ padding: '7px 14px', borderRadius: 99, background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.38)', color: '#FCD34D', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Go harder →
          </button>
        </motion.div>
      )}

      {/* Roadmap node completion — shown when launched from a roadmap */}
      {activeNodeSession && (
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleNodeDone}
          style={{
            width: '100%', padding: '13px 16px', borderRadius: 13, border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #22C55E)',
            boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
            color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
          <CheckCircle2 size={16} strokeWidth={2.5} />
          Done · Next Node
        </motion.button>
      )}

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button onClick={onRetry} style={{ flex: 1, padding: '11px 16px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <RotateCcw size={13} /> Retry
        </button>
        <button onClick={onExit} style={{ flex: 1, padding: '11px 16px', borderRadius: 13, background: 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(6,182,212,0.20))', border: '1px solid rgba(59,130,246,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Back to Lab <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  )
}

/* ═══ FLASHCARD SPRINT ═══════════════════════════════ */
function FlashcardDrill({ data, topic, onExit, onGoHarder, widgetMode = false }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const { recordCard } = useSRStore()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([]) // 'got' | 'missed'
  const [done, setDone] = useState(false)
  const [wrongItems, setWrongItems] = useState([])
  const cards = data.cards || []

  const handleResult = useCallback((result) => {
    const card = cards[idx]
    const next = [...results, result]
    const newWrong = result === 'missed' ? [...wrongItems, { q: card.front, correct: card.back }] : wrongItems
    setResults(next)
    setWrongItems(newWrong)

    // Save to spaced repetition queue — card will resurface based on SM-2 schedule
    recordCard(currentTopic, card.front, card.back, result)

    if (idx + 1 >= cards.length) {
      const correct = next.filter(r => r === 'got').length
      setDrillScore({ correct, total: cards.length })
      recordDrillResult({ topic: currentTopic, drillType: 'flashcard', correct, total: cards.length })
      setDone(true)
    } else {
      setFlipped(false)
      setTimeout(() => setIdx(i => i + 1), 160)
    }
  }, [results, wrongItems, idx, cards, currentTopic, recordCard]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        setFlipped(f => !f)
      } else if (e.key === 'ArrowRight' && flipped) {
        handleResult('got')
      } else if (e.key === 'ArrowLeft' && flipped) {
        handleResult('missed')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, handleResult])

  if (done) {
    const correct = results.filter(r => r === 'got').length
    return (
      <DrillComplete
        score={{ correct, total: cards.length }}
        wrongItems={wrongItems}
        topic={topic}
        drillType="flashcard"
        onExit={onExit}
        onRetry={() => { setIdx(0); setFlipped(false); setResults([]); setWrongItems([]); setDone(false) }}
        onGoHarder={onGoHarder}
              widgetMode={widgetMode}
      />
    )
  }

  const card = cards[idx]
  const progress = (idx / cards.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, padding: '0 4px' }}>
      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em' }}>
            {idx + 1} / {cards.length}
          </span>
          <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>
            ✓ {results.filter(r => r === 'got').length}  ✗ {results.filter(r => r === 'missed').length}
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
        </div>
      </div>

      {/* Swipeable card */}
      <AnimatePresence mode="wait">
        <motion.div key={idx}
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.22 }}
        >
          <SwipeCard card={card} onResult={handleResult} cardIndex={idx} total={cards.length} flipped={flipped} onFlip={setFlipped} />
        </motion.div>
      </AnimatePresence>

      {/* Keyboard hint */}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.04em' }}>
        ⌨ Space · ← Missed · → Got it &nbsp;·&nbsp; 👆 tap to flip, drag to rate
      </div>
    </div>
  )
}

/* ═══ SWIPEABLE CARD (used by ReviewDrill) ══════════ */
// flipped + onFlip are lifted to ReviewDrill so keyboard handler can access the state
function SwipeCard({ card, onResult, cardIndex, total, flipped, onFlip }) {
  const x = useMotionValue(0)
  const rotate    = useTransform(x, [-160, 0, 160], [-18, 0, 18])
  const gotOpacity    = useTransform(x, [20, 80],  [0, 1])
  const missedOpacity = useTransform(x, [-80, -20], [1, 0])
  const cardBg = useTransform(x, [-120, 0, 120],
    ['rgba(239,68,68,0.18)', flipped ? 'rgba(6,182,212,0.10)' : 'rgba(59,130,246,0.10)', 'rgba(74,222,128,0.18)'])

  const handleDragEnd = useCallback((_, info) => {
    if (!flipped) return
    if (info.offset.x > 80)       onResult('got')
    else if (info.offset.x < -80) onResult('missed')
    else x.set(0)
  }, [flipped, onResult, x])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const cardMinH = isMobile ? 'clamp(240px, 48vh, 380px)' : 280
  const cardPad  = isMobile ? '32px 24px' : '40px 32px'

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto', minHeight: isMobile ? 'clamp(260px, 50vh, 400px)' : 300, userSelect: 'none' }}>
      {/* Swipe hint labels */}
      <motion.div style={{ position: 'absolute', top: 20, left: 16, opacity: missedOpacity, zIndex: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#F87171', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.50)', padding: '4px 12px', borderRadius: 99, letterSpacing: '0.06em' }}>✗ MISSED</span>
      </motion.div>
      <motion.div style={{ position: 'absolute', top: 20, right: 16, opacity: gotOpacity, zIndex: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#4ADE80', background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.50)', padding: '4px 12px', borderRadius: 99, letterSpacing: '0.06em' }}>✓ GOT IT</span>
      </motion.div>

      {/* perspective wrapper so preserve-3d works correctly */}
      <div style={{ perspective: 1200 }}>
        <motion.div
          drag={flipped ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDragEnd={handleDragEnd}
          style={{ x, rotate, cursor: flipped ? 'grab' : 'pointer', transformStyle: 'preserve-3d', position: 'relative', minHeight: cardMinH }}
          whileDrag={{ cursor: 'grabbing', scale: 1.03 }}
          onClick={() => !flipped && onFlip(true)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Front face */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 24, padding: cardPad, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, minHeight: cardMinH }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(59,130,246,0.70)', textTransform: 'uppercase' }}>Question</span>
            <p style={{ fontSize: isMobile ? 22 : 20, fontWeight: 600, color: 'rgba(255,255,255,0.94)', lineHeight: 1.5, margin: 0 }}>{card?.front}</p>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.26)' }}>{isMobile ? '👆 tap to reveal' : 'tap to reveal · or press Space'}</span>
          </div>
          {/* Back face */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.30)', borderRadius: 24, padding: cardPad, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, minHeight: cardMinH }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(6,182,212,0.70)', textTransform: 'uppercase' }}>Answer</span>
            <p style={{ fontSize: isMobile ? 19 : 18, color: 'rgba(255,255,255,0.90)', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>{card?.back}</p>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>{isMobile ? '← swipe left  ·  swipe right →' : '← missed · swipe or arrow keys · got it →'}</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ═══ SPACED REVIEW DRILL ════════════════════════════ */
function ReviewDrill({ data, onExit, onNewDrill, widgetMode = false }) {
  const { recordCard, completeSession } = useSRStore()
  const cards = data?.cards || []
  const [idx, setIdx]           = useState(0)
  const [flipped, setFlipped]   = useState(false)   // lifted from SwipeCard so keyboard handler can read it
  const [results, setResults]   = useState([])
  const [done, setDone]         = useState(false)
  const [schedule, setSchedule] = useState([]) // { front, result, days }

  // Reset flip when card changes
  useEffect(() => { setFlipped(false) }, [idx])

  const handleResult = useCallback((result) => {
    const card = cards[idx]

    // Reschedule in SR store
    recordCard(card.topic || 'review', card.front, card.back, result)

    // Estimate next interval for the completion display
    const DAY = 24 * 60 * 60 * 1000
    const updatedCard = useSRStore.getState().cards.find(c => c.front === card.front && c.topic === (card.topic || 'review'))
    const daysUntil = updatedCard
      ? Math.max(1, Math.round((updatedCard.dueDate - Date.now()) / DAY))
      : (result === 'got' ? 3 : 1)

    setSchedule(prev => [...prev, {
      front: card.front.length > 50 ? card.front.slice(0, 48) + '…' : card.front,
      result,
      days: daysUntil,
    }])

    const next = [...results, result]
    setResults(next)
    if (idx + 1 >= cards.length) {
      completeSession()
      setDone(true)
    } else {
      setTimeout(() => setIdx(i => i + 1), 200)
    }
  }, [results, idx, cards, recordCard, completeSession]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setFlipped(f => !f) }
      else if (e.key === 'ArrowRight' && flipped) handleResult('got')
      else if (e.key === 'ArrowLeft'  && flipped) handleResult('missed')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, handleResult])

  /* ── Completion screen ── */
  if (done) {
    const correct = results.filter(r => r === 'got').length
    const pct = Math.round((correct / cards.length) * 100)
    const gradeEmoji = pct >= 80 ? '🧠' : pct >= 60 ? '📈' : '🔁'
    const gradeColor = pct >= 80 ? '#4ADE80' : pct >= 60 ? '#60A5FA' : '#FBBF24'

    return (
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div style={{ fontSize: 40 }}>{gradeEmoji}</div>
          <div style={{ fontSize: 50, fontWeight: 800, color: gradeColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 5 }}>
            {correct}/{cards.length} recalled correctly
          </div>
        </div>

        {/* Rescheduled cards */}
        <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
            Cards rescheduled
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {schedule.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.front}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
                  color: s.result === 'got' ? '#4ADE80' : '#F87171',
                }}>
                  {s.result === 'got' ? `+${s.days}d` : 'Tomorrow'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onExit} style={{
            flex: 1, padding: '12px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Close
          </button>
          <button onClick={onNewDrill} style={{
            flex: 2, padding: '12px', borderRadius: 14,
            background: 'rgba(34,197,94,0.16)', border: '1px solid rgba(34,197,94,0.38)',
            color: '#86EFAC', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            Drill new topic <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    )
  }

  /* ── Card ── */
  const card = cards[idx]
  const progress = (idx / cards.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, padding: '0 4px' }}>
      {/* Progress row */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em' }}>
            {idx + 1} / {cards.length}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: '#4ADE80' }}>✓ {results.filter(r => r === 'got').length}</span>
            {'  '}
            <span style={{ color: '#F87171' }}>✗ {results.filter(r => r === 'missed').length}</span>
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #4ADE80, #22D3EE)' }} />
        </div>
      </div>

      {/* Topic tag */}
      {card?.topic && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(74,222,128,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {card.topic}
        </div>
      )}

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1000 }}>
        <motion.div
          onClick={() => setFlipped(f => !f)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ width: '100%', minHeight: 200, position: 'relative', transformStyle: 'preserve-3d', cursor: 'pointer' }}
        >
          {/* Front */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(34,197,94,0.65)', textTransform: 'uppercase' }}>Due for Review</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {card?.front}
            </p>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>tap to reveal · or press Space</span>
          </div>
          {/* Back */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.32)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(34,197,94,0.65)', textTransform: 'uppercase' }}>Answer</span>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: 0, fontFamily: "'Georgia', serif" }}>
              {card?.back}
            </p>
          </div>
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
        ⌨ Space · ← Missed · → Got it
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleResult('missed')} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <XCircle size={15} /> Missed
            </button>
            <button onClick={() => handleResult('got')} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#86EFAC', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <CheckCircle2 size={15} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ SPEED ROUND ════════════════════════════════════ */
function SpeedRoundDrill({ data, topic, onExit, onGoHarder, widgetMode = false }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const cards = data.cards || []
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)

  const handleResult = useCallback((result) => {
    clearInterval(timerRef.current)
    const next = [...results, result]
    setResults(next)
    if (idx + 1 >= cards.length) {
      const correct = next.filter(r => r === 'got').length
      setDrillScore({ correct, total: cards.length })
      recordDrillResult({ topic: currentTopic, drillType: 'speedround', correct, total: cards.length })
      setDone(true)
    } else {
      setFlipped(false)
      setTimedOut(false)
      setTimeLeft(15)
      setTimeout(() => setIdx(i => i + 1), 120)
    }
  }, [results, idx, cards.length, currentTopic]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (done || flipped) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setTimedOut(true)
          setFlipped(true) // auto-reveal on timeout
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [idx, done, flipped])

  if (done) {
    const correct = results.filter(r => r === 'got').length
    return (
      <DrillComplete
        score={{ correct, total: cards.length }}
        wrongItems={[]}
        onExit={onExit}
        onRetry={() => { setIdx(0); setFlipped(false); setResults([]); setDone(false); setTimeLeft(15) }}
        topic={topic}
        drillType="speedround"
        onGoHarder={onGoHarder}
              widgetMode={widgetMode}
      />
    )
  }

  const card = cards[idx]
  const pct = (idx / cards.length) * 100
  const timerColor = timeLeft > 10 ? '#F97316' : timeLeft > 5 ? '#FBBF24' : '#EF4444'
  const RING_R = 22
  const RING_C = 2 * Math.PI * RING_R
  const ringOffset = RING_C * (1 - timeLeft / 15)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header: progress + SVG ring timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #F97316, #FB923C)' }} />
        </div>
        {/* SVG ring timer */}
        <motion.div animate={timeLeft <= 5 ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.3 }}
          style={{ flexShrink: 0, position: 'relative', width: 56, height: 56 }}>
          <svg width={56} height={56} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx={28} cy={28} r={RING_R} fill="none" stroke={`${timerColor}22`} strokeWidth={4} />
            <motion.circle
              cx={28} cy={28} r={RING_R} fill="none"
              stroke={timerColor} strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: timerColor, fontFamily: 'monospace' }}>{timeLeft}</div>
        </motion.div>
      </div>

      {/* Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1200, minHeight: 260 }}>
        <motion.div
          onClick={() => { if (!flipped) { clearInterval(timerRef.current); setFlipped(true) } }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ width: '100%', maxWidth: 560, minHeight: 240, position: 'relative', transformStyle: 'preserve-3d', cursor: flipped ? 'default' : 'pointer' }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: timedOut ? 'rgba(239,68,68,0.10)' : 'rgba(249,115,22,0.10)', border: `1px solid ${timedOut ? 'rgba(239,68,68,0.30)' : 'rgba(249,115,22,0.28)'}`, borderRadius: 24, padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(249,115,22,0.70)', textTransform: 'uppercase' }}>
              {idx + 1} / {cards.length}
            </span>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.94)', lineHeight: 1.50, margin: 0 }}>{card?.front}</p>
            {!flipped && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)' }}>tap to reveal</span>}
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.28)', borderRadius: 24, padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            {timedOut && <span style={{ fontSize: 11, fontWeight: 700, color: '#F87171', letterSpacing: '0.10em', textTransform: 'uppercase' }}>⏱ Time's up</span>}
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.90)', lineHeight: 1.65, margin: 0 }}>{card?.back}</p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto', width: '100%' }}>
            <button onClick={() => handleResult('missed')} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <XCircle size={15} /> Missed
            </button>
            <button onClick={() => handleResult('got')} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#86EFAC', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <CheckCircle2 size={15} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ MOCK TEST ══════════════════════════════════════ */
function MockTestDrill({ data, topic, onExit, widgetMode = false }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  // Resolve each question's correct index robustly.
  // New API: AI returns "correctAnswer" as exact option text → find its index.
  // Legacy fallback: numeric "correct" field, with 1-based shift when needed.
  const _raw = (data.questions || []).map(q => {
    if (q.correctAnswer !== undefined) {
      const txt = String(q.correctAnswer).trim()
      let idx = q.options.findIndex(o => String(o).trim() === txt)
      if (idx === -1) idx = q.options.findIndex(o => String(o).trim().toLowerCase() === txt.toLowerCase())
      return { ...q, correct: idx !== -1 ? idx : 0 }
    }
    const n = parseInt(q.correct, 10)
    return { ...q, correct: isNaN(n) ? 0 : n }
  })
  const _allLegacy1Based = _raw.every(q => q.correctAnswer === undefined) &&
    _raw.length > 0 && _raw.every(q => q.correct >= 1 && q.correct <= 4)
  const questions = _allLegacy1Based ? _raw.map(q => ({ ...q, correct: q.correct - 1 })) : _raw

  // answers[i] = chosen option index or null
  const [answers, setAnswers]     = useState(() => Array(questions.length).fill(null))
  const [flagged, setFlagged]     = useState(() => Array(questions.length).fill(false))
  const [idx, setIdx]             = useState(0)
  const [submitted, setSubmitted] = useState(false) // true = review mode
  const [reviewIdx, setReviewIdx] = useState(0)

  // Timer: 45s per question, capped at 8 min total
  const totalSecs = Math.min(questions.length * 45, 480)
  const [secsLeft, setSecsLeft]   = useState(totalSecs)
  const [timerActive, setTimerActive] = useState(true)

  useEffect(() => {
    if (!timerActive || submitted) return
    if (secsLeft <= 0) { handleSubmit(); return }
    const t = setTimeout(() => setSecsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secsLeft, timerActive, submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0')
  const ss = String(secsLeft % 60).padStart(2, '0')
  const timerPct = secsLeft / totalSecs
  const timerColor = timerPct > 0.4 ? '#10B981' : timerPct > 0.2 ? '#F59E0B' : '#EF4444'

  const choose = (optIdx) => {
    if (submitted) return
    setAnswers(prev => { const a = [...prev]; a[idx] = optIdx; return a })
  }

  const toggleFlag = () => {
    setFlagged(prev => { const f = [...prev]; f[idx] = !f[idx]; return f })
  }

  const handleSubmit = () => {
    setTimerActive(false)
    setSubmitted(true)
    setReviewIdx(0)
    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    const wrongItems = questions
      .filter((q, i) => answers[i] !== q.correct)
      .map(q => ({ q: q.q, correct: q.options[q.correct] }))
    setDrillScore({ correct, total: questions.length })
    recordDrillResult({ topic: currentTopic, drillType: 'mocktest', correct, total: questions.length })
  }

  const answered = answers.filter(a => a !== null).length
  const flagCount = flagged.filter(Boolean).length

  // ── Review mode (after submit) ──
  if (submitted) {
    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    const pct = Math.round((correct / questions.length) * 100)
    const wrongItems = questions
      .filter((q, i) => answers[i] !== q.correct)
      .map(q => ({ q: q.q, correct: q.options[q.correct] }))

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>
        {/* Score header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ flexShrink: 0, padding: '4px 0 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Score ring */}
          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
              <motion.circle cx="40" cy="40" r="34" fill="none"
                stroke={pct >= 80 ? '#4ADE80' : pct >= 60 ? '#FBBF24' : '#F87171'}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - pct / 100) }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.03em', lineHeight: 1 }}>{pct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {pct >= 90 ? '🏆 Mastery!' : pct >= 70 ? '✅ Solid result' : pct >= 50 ? '📈 Getting there' : '🔁 Keep practising'}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', marginTop: 4 }}>
              {correct}/{questions.length} correct · {Math.round((totalSecs - secsLeft) / 60)}m {(totalSecs - secsLeft) % 60}s
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 6, padding: '2px 8px' }}>✓ {correct} correct</span>
              {wrongItems.length > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '2px 8px' }}>✗ {wrongItems.length} wrong</span>}
            </div>
          </div>
        </motion.div>

        {/* Q navigator pills */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          {questions.map((q, i) => {
            const isRight = answers[i] === q.correct
            return (
              <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                onClick={() => setReviewIdx(i)}
                style={{ width: 32, height: 32, borderRadius: 8, border: reviewIdx === i ? '2px solid #818CF8' : '1px solid transparent', background: isRight ? 'rgba(74,222,128,0.20)' : 'rgba(239,68,68,0.20)', color: isRight ? '#4ADE80' : '#F87171', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {i + 1}
              </motion.button>
            )
          })}
        </div>

        {/* Per-question review */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <AnimatePresence mode="wait">
            {(() => {
              const q = questions[reviewIdx]
              const userAns = answers[reviewIdx]
              const isRight = userAns === q.correct
              return (
                <motion.div key={reviewIdx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Q{reviewIdx + 1}</div>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,255,255,0.90)', lineHeight: 1.55, margin: 0 }}>{q.q}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {q.options.map((opt, i) => {
                      const isCorrect = i === q.correct
                      const isUser = i === userAns
                      const bg = isCorrect ? 'rgba(74,222,128,0.12)' : (isUser && !isCorrect) ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)'
                      const border = isCorrect ? '1.5px solid rgba(74,222,128,0.40)' : (isUser && !isCorrect) ? '1.5px solid rgba(239,68,68,0.40)' : '1px solid rgba(255,255,255,0.08)'
                      const color = isCorrect ? '#86EFAC' : (isUser && !isCorrect) ? '#FCA5A5' : 'rgba(255,255,255,0.55)'
                      return (
                        <div key={i} style={{ padding: '11px 14px', borderRadius: 11, background: bg, border, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: isCorrect ? '#4ADE80' : (isUser && !isCorrect) ? '#F87171' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{['A','B','C','D'][i]}</span>
                          <span style={{ fontSize: 13.5, color, lineHeight: 1.4 }}>{opt}</span>
                          {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4ADE80', fontWeight: 700, flexShrink: 0 }}>✓ correct</span>}
                          {isUser && !isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#F87171', fontWeight: 700, flexShrink: 0 }}>✗ your answer</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: isRight ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${isRight ? 'rgba(74,222,128,0.20)' : 'rgba(239,68,68,0.20)'}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isRight ? '#4ADE80' : '#F87171', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Explanation</div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, margin: 0 }}>{q.explanation}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setReviewIdx(i => Math.max(0, i - 1))} disabled={reviewIdx === 0}
                      style={{ flex: 1, padding: '10px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, cursor: reviewIdx === 0 ? 'not-allowed' : 'pointer', opacity: reviewIdx === 0 ? 0.4 : 1 }}>← Prev</button>
                    <button onClick={() => setReviewIdx(i => Math.min(questions.length - 1, i + 1))} disabled={reviewIdx === questions.length - 1}
                      style={{ flex: 1, padding: '10px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, cursor: reviewIdx === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: reviewIdx === questions.length - 1 ? 0.4 : 1 }}>Next →</button>
                  </div>
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 8, paddingTop: 14 }}>
          <button onClick={() => { setAnswers(Array(questions.length).fill(null)); setFlagged(Array(questions.length).fill(false)); setIdx(0); setSubmitted(false); setSecsLeft(totalSecs); setTimerActive(true) }}
            style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RotateCcw size={13} /> Retry
          </button>
          <button onClick={onExit}
            style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(6,182,212,0.20))', border: '1px solid rgba(59,130,246,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Back to Lab
          </button>
        </div>
      </div>
    )
  }

  // ── Active test ──
  const q = questions[idx]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top bar: timer + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 10, background: secsLeft < totalSecs * 0.2 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${secsLeft < totalSecs * 0.2 ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.10)'}`, flexShrink: 0 }}>
          <motion.div
            animate={secsLeft < 30 ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.6, repeat: secsLeft < 30 ? Infinity : 0 }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: timerColor, flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: timerColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{mm}:{ss}</span>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Q {idx + 1} of {questions.length}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>{answered} answered{flagCount > 0 ? ` · ${flagCount} flagged` : ''}</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${((idx) / questions.length) * 100}%` }} transition={{ duration: 0.3 }}
              style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #06B6D4, #3B82F6)' }} />
          </div>
        </div>
      </div>

      {/* Question navigator dots */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {questions.map((_, i) => (
          <motion.button key={i} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
            onClick={() => setIdx(i)}
            style={{ width: 24, height: 24, borderRadius: 6, border: i === idx ? '2px solid #06B6D4' : '1px solid rgba(255,255,255,0.12)', background: flagged[i] ? 'rgba(245,158,11,0.25)' : answers[i] !== null ? 'rgba(6,182,212,0.22)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 9, fontWeight: 800, color: flagged[i] ? '#FCD34D' : answers[i] !== null ? '#67E8F9' : 'rgba(255,255,255,0.30)', fontFamily: 'inherit' }}>
            {flagged[i] ? '⚑' : i + 1}
          </motion.button>
        ))}
      </div>

      {/* Question */}
      <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.22)', borderRadius: 16, padding: '18px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', lineHeight: 1.58, margin: 0, flex: 1 }}>{q?.q}</p>
          {/* Flag button */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={toggleFlag}
            style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 8, background: flagged[idx] ? 'rgba(245,158,11,0.20)' : 'rgba(255,255,255,0.06)', border: flagged[idx] ? '1px solid rgba(245,158,11,0.40)' : '1px solid rgba(255,255,255,0.10)', color: flagged[idx] ? '#FCD34D' : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {flagged[idx] ? '⚑ Flagged' : '⚐ Flag'}
          </motion.button>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {q?.options.map((opt, i) => {
          const isSelected = answers[idx] === i
          return (
            <motion.button key={i}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => choose(i)}
              style={{ padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 500, lineHeight: 1.45, fontFamily: "'Inter', system-ui, sans-serif", background: isSelected ? 'rgba(6,182,212,0.14)' : 'rgba(255,255,255,0.04)', border: isSelected ? '2px solid rgba(6,182,212,0.55)' : '1px solid rgba(255,255,255,0.09)', color: isSelected ? '#67E8F9' : 'rgba(255,255,255,0.80)', transition: 'all 0.13s', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: isSelected ? 'rgba(6,182,212,0.28)' : 'rgba(255,255,255,0.07)', border: isSelected ? '1.5px solid rgba(6,182,212,0.50)' : '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: isSelected ? '#06B6D4' : 'rgba(255,255,255,0.30)', flexShrink: 0, marginTop: 1 }}>
                {['A', 'B', 'C', 'D'][i]}
              </span>
              <span>{opt}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Nav + Submit */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>←</button>
        {idx < questions.length - 1 ? (
          <button onClick={() => setIdx(i => i + 1)}
            style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', color: '#67E8F9', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Next →
          </button>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(6,182,212,0.30), rgba(59,130,246,0.25))', border: '1.5px solid rgba(6,182,212,0.55)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            Submit Test · {answered}/{questions.length} answered
          </motion.button>
        )}
      </div>
    </div>
  )
}

/* ═══ FEYNMAN TEST ═══════════════════════════════════ */
function FeynmanDrill({ data, topic, onExit, widgetMode = false }) {
  const { recordDrillResult, currentTopic } = useLabStore()
  const [explanation, setExplanation] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState(null)
  const [focusedMissing, setFocusedMissing] = useState(null)
  const textareaRef = useRef(null)
  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length

  const handleSubmit = async () => {
    if (wordCount < 20) return
    setGrading(true)
    try {
      const grade = await gradeFeynmanExplanation(topic, explanation, data.keyPoints, data.commonMistakes)
      setResult(grade)
      const correct = Math.round(grade.score / 100 * 5)
      recordDrillResult({ topic: currentTopic, drillType: 'feynman', correct, total: 5 })
    } catch {
      setResult({ score: 0, covered: [], missing: data.keyPoints || [], feedback: 'Could not grade. Please try again.', grade: 'Needs Work' })
    } finally {
      setGrading(false)
    }
  }

  if (result) {
    const gradeColors = { Mastery: '#4ADE80', Solid: '#60A5FA', Developing: '#FBBF24', 'Needs Work': '#F87171' }
    const gc = gradeColors[result.grade] || '#60A5FA'
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Score */}
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: gc, letterSpacing: '-0.04em', lineHeight: 1 }}>{result.score}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{result.grade}</div>
        </div>
        {/* Feedback */}
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', fontSize: 13.5, color: 'rgba(255,255,255,0.80)', lineHeight: 1.60 }}>
          {result.feedback}
        </div>
        {/* Key-point chips lit up: green = covered, red = missing */}
        {(result.covered?.length > 0 || result.missing?.length > 0) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(139,92,246,0.60)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>Key Points</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(result.covered || []).map((p, i) => (
                <motion.div key={`c${i}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.06 }}
                  style={{ padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.40)', color: '#86EFAC', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={12} /> {p}
                </motion.div>
              ))}
              {(result.missing || []).map((p, i) => (
                <motion.div key={`m${i}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: (result.covered?.length || 0) * 0.06 + i * 0.06 }}
                  style={{ padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <XCircle size={12} /> {p}
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {result.missing?.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setFocusedMissing(result.missing); setResult(null); setExplanation('') }}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.38)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}>
            <RotateCcw size={13} /> Retry on missed points ({result.missing.length})
          </motion.button>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setResult(null); setExplanation(''); setFocusedMissing(null) }} style={{ flex: 1, padding: '12px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RotateCcw size={13} /> Try again
          </button>
          <button onClick={onExit} style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'linear-gradient(135deg, rgba(139,92,246,0.28), rgba(59,130,246,0.20))', border: '1px solid rgba(139,92,246,0.40)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Done <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {focusedMissing ? (
        <div style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.30)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(248,113,113,0.80)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>Retry — focus on your gaps</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.60)' }}>Cover only the points you missed below. Clear and simple.</div>
        </div>
      ) : (
        <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(139,92,246,0.80)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>Feynman Challenge</div>
          <p style={{ fontSize: 15.5, fontWeight: 600, color: 'rgba(255,255,255,0.94)', lineHeight: 1.55, margin: 0 }}>{data.prompt}</p>
        </div>
      )}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
        Write as if teaching someone with zero background. Simple language, real examples, no jargon. Aeva will find the gaps.
      </div>

      {/* Key-point reference chips — show only missed when in focus mode */}
      {(focusedMissing ?? data.keyPoints)?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: focusedMissing ? 'rgba(239,68,68,0.60)' : 'rgba(139,92,246,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>
            {focusedMissing ? 'Points to cover this time →' : 'Cover these points →'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(focusedMissing ?? data.keyPoints).map((pt, i) => (
              <div key={i} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: focusedMissing ? 'rgba(239,68,68,0.10)' : 'rgba(139,92,246,0.10)', border: `1px solid ${focusedMissing ? 'rgba(239,68,68,0.28)' : 'rgba(139,92,246,0.22)'}`, color: focusedMissing ? '#FCA5A5' : 'rgba(167,139,250,0.70)' }}>
                {pt}
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        placeholder="Start explaining..."
        autoFocus
        style={{
          flex: 1, minHeight: 200, padding: '16px 18px', borderRadius: 16,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)',
          color: 'rgba(255,255,255,0.88)', fontSize: 14.5, lineHeight: 1.70,
          fontFamily: "'Inter', system-ui, sans-serif", resize: 'none', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: wordCount < 20 ? 'rgba(255,255,255,0.28)' : 'rgba(139,92,246,0.70)', fontWeight: 500 }}>
          {wordCount} words {wordCount < 20 ? `(${20 - wordCount} more to unlock)` : '— ready to grade'}
        </span>
        <motion.button
          whileHover={wordCount >= 20 ? { scale: 1.04 } : {}}
          whileTap={wordCount >= 20 ? { scale: 0.96 } : {}}
          onClick={handleSubmit}
          disabled={wordCount < 20 || grading}
          style={{
            padding: '11px 22px', borderRadius: 13,
            background: wordCount >= 20 ? 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25))' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${wordCount >= 20 ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.08)'}`,
            color: wordCount >= 20 ? '#C4B5FD' : 'rgba(255,255,255,0.25)',
            fontSize: 13, fontWeight: 700, cursor: wordCount >= 20 ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          {grading ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#A78BFA' }} /> Grading…</>
          ) : (<>Grade it <Zap size={13} /></>)}
        </motion.button>
      </div>
    </div>
  )
}

/* ═══ CLOZE (FILL THE GAPS) ══════════════════════════ */
function ClozeDrill({ data, topic, onExit, onGoHarder, widgetMode = false }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const passage = data.passage || ''
  const answers = data.blanks || []
  const hints = data.hints || []
  const parts = passage.split('BLANK')
  const [inputs, setInputs] = useState(Array(answers.length).fill(''))
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState([])
  const [shownHints, setShownHints] = useState({})

  const handleSubmit = () => {
    const res = answers.map((ans, i) => ({
      correct: inputs[i].trim().toLowerCase() === ans.toLowerCase(),
      userAnswer: inputs[i].trim(),
      correctAnswer: ans,
    }))
    setResults(res)
    setSubmitted(true)
    const correct = res.filter(r => r.correct).length
    setDrillScore({ correct, total: answers.length })
    recordDrillResult({ topic: currentTopic, drillType: 'cloze', correct, total: answers.length })
  }

  if (submitted) {
    const correct = results.filter(r => r.correct).length
    return (
      <DrillComplete
        score={{ correct, total: answers.length }}
        wrongItems={results.filter(r => !r.correct).map(r => ({ q: `You wrote: "${r.userAnswer}"`, correct: r.correctAnswer }))}
        topic={topic} drillType="cloze"
        onExit={onExit}
        onRetry={() => { setInputs(Array(answers.length).fill('')); setSubmitted(false); setResults([]) }}
        onGoHarder={onGoHarder}
              widgetMode={widgetMode}
      />
    )
  }

  let blankIdx = 0
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,185,129,0.70)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Fill the Gaps — {topic}</div>
      <div style={{ padding: '20px 22px', borderRadius: 18, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)', lineHeight: 2.2, fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>
        {parts.map((part, pi) => {
          const idx = blankIdx
          if (pi < parts.length - 1) blankIdx++
          const res = submitted ? results[idx] : null
          const inputColor = res?.correct ? 'rgba(74,222,128,0.22)' : res ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.12)'
          const borderColor = res?.correct ? 'rgba(74,222,128,0.55)' : res ? 'rgba(239,68,68,0.50)' : 'rgba(16,185,129,0.35)'
          const textColor = res?.correct ? '#86EFAC' : res ? '#FCA5A5' : 'rgba(255,255,255,0.90)'
          return (
            <span key={pi}>
              {part}
              {pi < parts.length - 1 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: '0 4px', verticalAlign: 'middle' }}>
                  <input
                    value={submitted ? (results[idx]?.correct ? inputs[idx] : `${inputs[idx]} (${answers[idx]})`) : (inputs[idx] || '')}
                    onChange={e => !submitted && setInputs(prev => { const n = [...prev]; n[idx] = e.target.value; return n })}
                    readOnly={submitted}
                    placeholder="…"
                    style={{
                      width: Math.max(100, (answers[idx]?.length || 8) * 10),
                      padding: '3px 10px', borderRadius: 8,
                      background: inputColor, border: `1.5px solid ${borderColor}`,
                      color: textColor, fontSize: 13.5, fontFamily: 'monospace',
                      outline: 'none', textAlign: 'center', transition: 'all 0.2s',
                    }}
                  />
                  {/* Hint button — only before submit */}
                  {!submitted && hints[idx] && (
                    <button
                      onClick={() => setShownHints(h => ({ ...h, [idx]: !h[idx] }))}
                      title="Show hint"
                      style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.10)', color: 'rgba(16,185,129,0.70)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
                      ?
                    </button>
                  )}
                  {!submitted && shownHints[idx] && (
                    <span style={{ fontSize: 11, color: 'rgba(16,185,129,0.60)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{hints[idx]}</span>
                  )}
                </span>
              )}
            </span>
          )
        })}
      </div>
      {!submitted && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>
          {inputs.filter(v => v.trim()).length} / {answers.length} filled
        </div>
      )}
      {submitted && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
          {results.filter(r => r.correct).length}/{answers.length} correct — blanks shown in <span style={{ color: '#86EFAC' }}>green</span> or <span style={{ color: '#FCA5A5' }}>red with correction</span>
        </div>
      )}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={inputs.some(v => !v.trim()) || submitted}
        style={{ padding: '14px', borderRadius: 16, background: inputs.every(v => v.trim()) && !submitted ? 'rgba(16,185,129,0.20)' : 'rgba(255,255,255,0.05)', border: `1px solid ${inputs.every(v => v.trim()) && !submitted ? 'rgba(16,185,129,0.40)' : 'rgba(255,255,255,0.09)'}`, color: inputs.every(v => v.trim()) && !submitted ? '#6EE7B7' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 700, cursor: inputs.every(v => v.trim()) && !submitted ? 'pointer' : 'not-allowed', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Check My Answers
      </motion.button>
    </div>
  )
}

/* ═══ SHORT ANSWER ════════════════════════════════════ */
async function gradeShortAnswer(topic, question, modelAnswer, keyPoints, userAnswer) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gKey()}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'Grade a student short-answer response. Return ONLY JSON.' },
        { role: 'user', content: `Topic: "${topic}"\nQuestion: "${question}"\nModel Answer: "${modelAnswer}"\nKey Points Required: ${JSON.stringify(keyPoints)}\n\nStudent's Answer: "${userAnswer}"\n\nReturn ONLY: {"score":0-100,"covered":["points covered"],"missing":["points missed"],"feedback":"1 sentence: what was good and what to improve","grade":"Excellent"|"Good"|"Partial"|"Weak"}` },
      ],
      temperature: 0.2, max_tokens: 300, response_format: { type: 'json_object' },
    }),
  })
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

function ShortAnswerDrill({ data, topic, onExit, onGoHarder, widgetMode = false }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const questions = data.questions || []
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState(Array(questions.length).fill(''))
  const [grades, setGrades] = useState([])
  const [grading, setGrading] = useState(false)
  const [currentGrade, setCurrentGrade] = useState(null) // inline feedback for current Q
  const [done, setDone] = useState(false)

  const GRADE_COL = { Excellent: '#4ADE80', Good: '#60A5FA', Partial: '#FBBF24', Weak: '#F87171' }

  const handleGrade = async () => {
    const q = questions[idx]
    setGrading(true)
    try {
      const result = await gradeShortAnswer(currentTopic, q.q, q.modelAnswer, q.keyPoints, answers[idx])
      setCurrentGrade(result)
      const newGrades = [...grades, result]
      setGrades(newGrades)
      if (idx + 1 >= questions.length) {
        const correct = newGrades.filter(g => g.score >= 70).length
        setDrillScore({ correct, total: questions.length })
        recordDrillResult({ topic: currentTopic, drillType: 'shortanswer', correct, total: questions.length })
      }
    } catch {
      const fallback = { score: 0, covered: [], missing: q.keyPoints, feedback: 'Could not grade.', grade: 'Weak' }
      setCurrentGrade(fallback)
      setGrades(g => [...g, fallback])
    }
    setGrading(false)
  }

  const handleNext = () => {
    setCurrentGrade(null)
    if (idx + 1 >= questions.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
    }
  }

  if (done) {
    const correct = grades.filter(g => g.score >= 70).length
    return (
      <DrillComplete
        score={{ correct, total: questions.length }}
        wrongItems={grades.filter(g => g.score < 70).map((g, i) => ({ q: questions[i]?.q || '', correct: g.feedback }))}
        topic={topic} drillType="shortanswer"
        onExit={onExit}
        onRetry={() => { setIdx(0); setAnswers(Array(questions.length).fill('')); setGrades([]); setCurrentGrade(null); setDone(false) }}
        onGoHarder={onGoHarder}
              widgetMode={widgetMode}
      />
    )
  }

  const q = questions[idx]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.70)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Short Answer — {idx + 1}/{questions.length}</span>
        {grades.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA' }}>Avg: {Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)}%</span>}
      </div>

      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Question</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.90)', lineHeight: 1.6, fontWeight: 500 }}>{q?.q}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {q?.keyPoints?.map((pt, i) => (
          <div key={i} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', color: 'rgba(252,211,77,0.60)' }}>{pt}</div>
        ))}
      </div>

      <textarea
        value={answers[idx] || ''}
        onChange={e => !currentGrade && setAnswers(prev => { const n = [...prev]; n[idx] = e.target.value; return n })}
        readOnly={!!currentGrade}
        placeholder="Write your answer here — aim for 2-4 clear sentences…"
        rows={5}
        style={{ resize: currentGrade ? 'none' : 'vertical', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.65, outline: 'none' }}
        onFocus={e => !currentGrade && (e.target.style.borderColor = 'rgba(245,158,11,0.40)')}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
      />

      {/* Inline grade feedback */}
      <AnimatePresence>
        {currentGrade && (
          <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderRadius: 16, background: `${GRADE_COL[currentGrade.grade] || '#60A5FA'}12`, border: `1px solid ${GRADE_COL[currentGrade.grade] || '#60A5FA'}35`, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: GRADE_COL[currentGrade.grade] || '#60A5FA' }}>{currentGrade.grade}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: GRADE_COL[currentGrade.grade] || '#60A5FA' }}>{currentGrade.score}%</span>
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: 10 }}>{currentGrade.feedback}</div>
              {/* Covered/missing chips */}
              {(currentGrade.covered?.length > 0 || currentGrade.missing?.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {(currentGrade.covered || []).map((pt, i) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.30)', color: '#86EFAC', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> {pt}
                    </span>
                  ))}
                  {(currentGrade.missing || []).map((pt, i) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: '#FCA5A5', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={11} /> {pt}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.38)', color: '#FCD34D', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {idx + 1 < questions.length ? 'Next Question →' : 'See Results'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentGrade && (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleGrade}
          disabled={!answers[idx]?.trim() || grading}
          style={{ padding: '14px', borderRadius: 14, background: answers[idx]?.trim() ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${answers[idx]?.trim() ? 'rgba(245,158,11,0.38)' : 'rgba(255,255,255,0.09)'}`, color: answers[idx]?.trim() ? '#FCD34D' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 700, cursor: answers[idx]?.trim() && !grading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {grading ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(252,211,77,0.2)', borderTopColor: '#FCD34D' }} /> Grading…</>
          ) : 'Submit Answer'}
        </motion.button>
      )}
    </div>
  )
}

/* ═══ EXAM PRACTICE (Past Paper) ═════════════════════ */
function ExamPracticeDrill({ data, topic, onExit }) {
  const { recordDrillResult } = useLabStore()
  const questions = data?.questions || []
  const [idx, setIdx]           = useState(0)
  const [answer, setAnswer]     = useState('')
  const [marking, setMarking]   = useState(false)
  const [result, setResult]     = useState(null)  // { awarded, awardedPoints, missedPoints, feedback, examinerTip }
  const [results, setResults]   = useState([])    // per-question: { awarded, total }
  const [done, setDone]         = useState(false)

  const q = questions[idx]
  const totalMarks    = questions.reduce((s, q) => s + (q.marks || 0), 0)
  const earnedMarks   = results.reduce((s, r) => s + r.awarded, 0)
  const progressPct   = Math.round((idx / questions.length) * 100)

  const markAnswer = async () => {
    if (!answer.trim() || marking) return
    setMarking(true)
    try {
      const r = await markExamAnswer(q.q, q.marks, q.markScheme || [], answer)
      setResult(r)
    } catch {
      setResult({ awarded: 0, awardedPoints: [], missedPoints: q.markScheme || [], feedback: 'Marking failed — check connection.', examinerTip: '' })
    }
    setMarking(false)
  }

  const nextQuestion = () => {
    const newResults = [...results, { awarded: result.awarded, total: q.marks }]
    setResults(newResults)
    if (idx + 1 >= questions.length) {
      const totalAwarded = newResults.reduce((s, r) => s + r.awarded, 0)
      const pct = Math.round((totalAwarded / totalMarks) * 100)
      recordDrillResult(topic, 'examPractice', totalAwarded, totalMarks, 'intermediate')
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setAnswer('')
      setResult(null)
    }
  }

  const gradeFromPct = (pct) => {
    if (pct >= 90) return { grade: 'A*', color: '#A78BFA' }
    if (pct >= 78) return { grade: 'A',  color: '#818CF8' }
    if (pct >= 62) return { grade: 'B',  color: '#34D399' }
    if (pct >= 47) return { grade: 'C',  color: '#60A5FA' }
    if (pct >= 33) return { grade: 'D',  color: '#FBBF24' }
    return { grade: 'E',  color: '#FB923C' }
  }

  /* ── Done screen ── */
  if (done) {
    const finalPct = Math.round((earnedMarks + (results[results.length-1]?.awarded || 0)) / totalMarks * 100)
    const finalEarned = results.reduce((s,r) => s + r.awarded, 0)
    const g = gradeFromPct(finalPct)
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: g.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{g.grade}</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
            {finalEarned} / {totalMarks} marks  ·  {finalPct}%
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>
            This is real evidence — not an estimate
          </div>
        </div>

        {/* Per-question breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((r, i) => {
            const pct = Math.round((r.awarded / r.total) * 100)
            const col = pct >= 75 ? '#4ADE80' : pct >= 50 ? '#FBBF24' : '#F87171'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, minWidth: 22 }}>Q{i+1}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: col, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: col, minWidth: 36, textAlign: 'right' }}>{r.awarded}/{r.total}</span>
              </div>
            )
          })}
        </div>

        <button onClick={onExit} style={{ padding: '14px', borderRadius: 14, background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.38)', color: '#C4B5FD', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Done
        </button>
      </motion.div>
    )
  }

  /* ── Question screen ── */
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>
            Q{idx + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA' }}>
            {earnedMarks} / {results.reduce((s,r) => s+r.total, 0)} marks so far
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progressPct}%` }} style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #A78BFA, #C4B5FD)' }} />
        </div>
      </div>

      {/* Question card */}
      <div style={{ padding: '20px', borderRadius: 18, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(167,139,250,0.70)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {q?.command || 'Question'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#A78BFA', background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.35)', padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
            [{q?.marks} mark{q?.marks !== 1 ? 's' : ''}]
          </span>
        </div>
        <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.65, margin: 0, fontWeight: 500 }}>{q?.q}</p>
      </div>

      {/* Answer area or marking result */}
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={`Write your answer here… (${q?.marks} mark${q?.marks !== 1 ? 's' : ''} available)`}
              style={{
                width: '100%', minHeight: 140, padding: '14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.90)', fontSize: 14, lineHeight: 1.65,
                fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={markAnswer}
              disabled={!answer.trim() || marking}
              style={{
                padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                cursor: answer.trim() && !marking ? 'pointer' : 'not-allowed',
                background: answer.trim() && !marking ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.05)',
                border: answer.trim() && !marking ? '1px solid rgba(167,139,250,0.45)' : '1px solid rgba(255,255,255,0.08)',
                color: answer.trim() && !marking ? '#C4B5FD' : 'rgba(255,255,255,0.25)',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {marking ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Marking…</> : '✓ Submit for marking'}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Score */}
            <div style={{
              padding: '16px', borderRadius: 14, textAlign: 'center',
              background: result.awarded >= q.marks * 0.75 ? 'rgba(74,222,128,0.10)' : result.awarded >= q.marks * 0.5 ? 'rgba(251,191,36,0.10)' : 'rgba(248,113,113,0.10)',
              border: `1px solid ${result.awarded >= q.marks * 0.75 ? 'rgba(74,222,128,0.35)' : result.awarded >= q.marks * 0.5 ? 'rgba(251,191,36,0.30)' : 'rgba(248,113,113,0.30)'}`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: result.awarded >= q.marks * 0.75 ? '#4ADE80' : result.awarded >= q.marks * 0.5 ? '#FBBF24' : '#F87171', letterSpacing: '-0.03em' }}>
                {result.awarded} / {q.marks}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>marks awarded</div>
            </div>

            {/* Awarded points */}
            {result.awardedPoints?.length > 0 && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.20)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#4ADE80', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>✓ Awarded</div>
                {result.awardedPoints.map((p, i) => <div key={i} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: 4 }}>· {p}</div>)}
              </div>
            )}

            {/* Missed points */}
            {result.missedPoints?.length > 0 && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.20)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#F87171', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>✗ Missed</div>
                {result.missedPoints.map((p, i) => <div key={i} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: 4 }}>· {p}</div>)}
              </div>
            )}

            {/* Examiner feedback */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.22)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#A78BFA', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Examiner Comment</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.60 }}>{result.feedback}</div>
              {result.examinerTip && <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(167,139,250,0.80)', fontStyle: 'italic' }}>💡 {result.examinerTip}</div>}
            </div>

            <button onClick={nextQuestion} style={{ padding: '13px', borderRadius: 14, background: 'rgba(167,139,250,0.22)', border: '1px solid rgba(167,139,250,0.45)', color: '#C4B5FD', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {idx + 1 < questions.length ? `Next Question →` : 'See Results'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ MATCH GRID ═════════════════════════════════════ */
function MatchGridDrill({ data, topic, onExit, onGoHarder }) {
  const { setDrillScore, recordDrillResult, currentTopic } = useLabStore()
  const pairs = data.pairs || []
  const [terms] = useState(pairs.map(p => p.term))
  const [defs] = useState(() => [...pairs.map(p => p.definition)].sort(() => Math.random() - 0.5))
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [selectedDef, setSelectedDef] = useState(null)
  const [matched, setMatched] = useState([])
  const [wrong, setWrong] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (selectedTerm !== null && selectedDef !== null) {
      const termObj = pairs.find(p => p.term === terms[selectedTerm])
      if (termObj && termObj.definition === defs[selectedDef]) {
        const newMatched = [...matched, terms[selectedTerm]]
        setMatched(newMatched)
        setSelectedTerm(null)
        setSelectedDef(null)
        if (newMatched.length === pairs.length) {
          setDrillScore({ correct: pairs.length, total: pairs.length })
          recordDrillResult({ topic: currentTopic, drillType: 'match', correct: pairs.length, total: pairs.length })
          setTimeout(() => setDone(true), 600)
        }
      } else {
        setWrong({ term: selectedTerm, def: selectedDef })
        setTimeout(() => { setWrong(null); setSelectedTerm(null); setSelectedDef(null) }, 700)
      }
    }
  }, [selectedTerm, selectedDef]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return (
    <DrillComplete
      score={{ correct: pairs.length, total: pairs.length }}
      wrongItems={[]}
      topic={topic}
      drillType="match"
      onExit={onExit}
      onRetry={() => { setMatched([]); setSelectedTerm(null); setSelectedDef(null); setDone(false) }}
      onGoHarder={onGoHarder}
            widgetMode={widgetMode}
      />
  )

  const progress = (matched.length / pairs.length) * 100

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em' }}>
            {matched.length} / {pairs.length} matched
          </span>
          <span style={{ fontSize: 11, color: '#EC4899', fontWeight: 700 }}>click a term, then its definition</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #EC4899, #F472B6)' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Terms column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {terms.map((term, i) => {
            const isMatched = matched.includes(term)
            const isSel = selectedTerm === i
            const isWrong_ = wrong?.term === i
            return (
              <motion.button
                key={term}
                whileHover={!isMatched ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                animate={isWrong_ ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={isWrong_ ? { duration: 0.45, ease: 'easeInOut' } : {}}
                onClick={() => !isMatched && setSelectedTerm(i === selectedTerm ? null : i)}
                style={{
                  padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                  fontSize: 13.5, fontWeight: 700, lineHeight: 1.35,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.45 : 1,
                  background: isMatched ? 'rgba(74,222,128,0.12)' : isWrong_ ? 'rgba(239,68,68,0.18)' : isSel ? 'rgba(236,72,153,0.22)' : 'rgba(255,255,255,0.06)',
                  border: isMatched ? '1.5px solid rgba(74,222,128,0.35)' : isWrong_ ? '1.5px solid rgba(239,68,68,0.50)' : isSel ? '1.5px solid rgba(236,72,153,0.60)' : '1px solid rgba(255,255,255,0.10)',
                  color: isMatched ? '#86EFAC' : isSel ? '#F9A8D4' : 'rgba(255,255,255,0.85)',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  minHeight: 56,
                }}
              >
                {term}
              </motion.button>
            )
          })}
        </div>

        {/* Definitions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {defs.map((def, i) => {
            const matchedTerm = pairs.find(p => p.definition === def)?.term
            const isMatched = matched.includes(matchedTerm)
            const isSel = selectedDef === i
            const isWrong_ = wrong?.def === i
            return (
              <motion.button
                key={def}
                whileHover={!isMatched ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                animate={isWrong_ ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={isWrong_ ? { duration: 0.45, ease: 'easeInOut' } : {}}
                onClick={() => !isMatched && setSelectedDef(i === selectedDef ? null : i)}
                style={{
                  padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                  fontSize: 12.5, fontWeight: 500, lineHeight: 1.50,
                  fontFamily: "'Georgia', serif",
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.45 : 1,
                  background: isMatched ? 'rgba(74,222,128,0.08)' : isWrong_ ? 'rgba(239,68,68,0.14)' : isSel ? 'rgba(236,72,153,0.16)' : 'rgba(255,255,255,0.04)',
                  border: isMatched ? '1.5px solid rgba(74,222,128,0.28)' : isWrong_ ? '1.5px solid rgba(239,68,68,0.45)' : isSel ? '1.5px solid rgba(236,72,153,0.50)' : '1px solid rgba(255,255,255,0.08)',
                  color: isMatched ? '#86EFAC' : isSel ? '#F9A8D4' : 'rgba(255,255,255,0.68)',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  minHeight: 56,
                }}
              >
                {def}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══ LOADING SPINNER ════════════════════════════════ */
const LOADING_MSGS = [
  'Reading your topic…',
  'Crafting questions…',
  'Tuning difficulty…',
  'Almost ready…',
]

function LabLoading({ topic }) {
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 1400)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px' }}>
      {/* Animated rings */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.12)', borderTopColor: '#3B82F6' }} />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid rgba(6,182,212,0.10)', borderTopColor: '#06B6D4' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          🧪
        </div>
      </div>
      {/* Topic */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>{topic}</div>
        <AnimatePresence mode="wait">
          <motion.div key={msgIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>
            {LOADING_MSGS[msgIdx]}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 5 }}>
        {LOADING_MSGS.map((_, i) => (
          <motion.div key={i} animate={{ background: i === msgIdx ? '#3B82F6' : 'rgba(255,255,255,0.12)' }}
            style={{ width: 6, height: 6, borderRadius: '50%' }} />
        ))}
      </div>
    </div>
  )
}

/* ═══ DRILL CARD (grid) ══════════════════════════════ */
const DRILL_HOT = ['flashcard', 'examPractice', 'mocktest']

function DrillCard({ drill, onStart, index, personalBest }) {
  const isHot = DRILL_HOT.includes(drill.id)
  const pbColor = personalBest >= 90 ? '#4ADE80' : personalBest >= 70 ? '#60A5FA' : personalBest >= 50 ? '#FBBF24' : '#F87171'

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.24 }}
      whileHover={{ scale: 1.03, y: -2, boxShadow: `0 12px 32px ${drill.glow}` }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onStart(drill.id)}
      style={{
        padding: '16px 16px 14px', borderRadius: 18,
        background: drill.colorDim, border: `1px solid ${drill.border}`,
        cursor: 'pointer', textAlign: 'left',
        boxShadow: `0 4px 20px ${drill.glow}`,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Glow orb */}
      <div aria-hidden style={{ position: 'absolute', top: -16, right: -16, width: 72, height: 72, borderRadius: '50%', background: `radial-gradient(circle, ${drill.color}35 0%, transparent 70%)`, filter: 'blur(14px)', pointerEvents: 'none' }} />

      {/* Hot badge */}
      {isHot && (
        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 800, color: drill.color, background: `${drill.color}18`, border: `1px solid ${drill.color}40`, borderRadius: 99, padding: '2px 7px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          ★ Top
        </div>
      )}

      {/* Top: emoji + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{drill.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {drill.title}
          </div>
          <div style={{ fontSize: 10.5, color: drill.color, fontWeight: 600, marginTop: 2, opacity: 0.85 }}>{drill.duration}</div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.45, position: 'relative', zIndex: 1 }}>
        {drill.tagline}
      </div>

      {/* PB bar */}
      {personalBest !== null ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Best</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: pbColor }}>{personalBest}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${personalBest}%` }} transition={{ duration: 0.7, delay: index * 0.04 + 0.2, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 99, background: pbColor }} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', position: 'relative', zIndex: 1 }}>No attempts yet</div>
      )}
    </motion.button>
  )
}

/* ═══ DRILL TAB ═══════════════════════════════════════ */
function DrillTab() {
  const {
    difficulty, setDifficulty, questionCount, setQuestionCount, focusMode, setFocusMode,
    labSuggestion, clearSuggestion, startDrill, exitDrill, setDrillData, getPersonalBest,
    pendingAutoStart, clearPendingAutoStart, drillHistory,
  } = useLabStore()
  const { struggleZones, dominantTopics } = useNeuralStore()
  const { getDueCards, getDueCount, getUpcomingCount, getTotalCards, getStreak } = useSRStore()

  const [topicInput, setTopicInput]     = useState('')
  const [error, setError]               = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const inputRef = useRef(null)

  const dueCount      = getDueCount()
  const upcomingCount = getUpcomingCount(7)
  const totalSRCards  = getTotalCards()
  const streak        = getStreak()

  // Recent topics from drill history (last 5 unique)
  const recentTopics = [...new Set(drillHistory.slice().reverse().map(h => h.topic))].slice(0, 6)

  // Weakest topic
  const topicAvgMap = {}
  drillHistory.forEach(h => {
    if (!topicAvgMap[h.topic]) topicAvgMap[h.topic] = { total: 0, count: 0 }
    topicAvgMap[h.topic].total += h.pct
    topicAvgMap[h.topic].count++
  })
  const weakestTopic = Object.entries(topicAvgMap)
    .map(([topic, { total, count }]) => ({ topic, avg: Math.round(total / count), count }))
    .filter(e => e.avg < 75)
    .sort((a, b) => a.avg - b.avg)[0] || null

  // Session stats
  const DAY = 86400000
  const thisWeek = drillHistory.filter(h => Date.now() - h.date < 7 * DAY)
  const avgScore  = drillHistory.length ? Math.round(drillHistory.reduce((s, h) => s + h.pct, 0) / drillHistory.length) : null

  useEffect(() => {
    if (labSuggestion?.topic) setTopicInput(labSuggestion.topic)
  }, [labSuggestion])

  const handleStart = async (drillId, topicOverride) => {
    const topic = (topicOverride ?? topicInput).trim()
    if (!topic) { setError('Enter a topic first.'); inputRef.current?.focus(); return }
    setError('')
    if (topicOverride) setTopicInput(topicOverride)
    startDrill(drillId, topic)
    try {
      const { difficulty: d, questionCount: qc, focusMode: fm } = useLabStore.getState()
      const data = await generateDrillContent(drillId, topic, d, qc, fm)
      setDrillData(data)
    } catch {
      setError('Failed to generate content. Try again.')
      exitDrill()
    }
  }

  useEffect(() => {
    if (!pendingAutoStart?.topic) return
    const { drillType, topic } = pendingAutoStart
    clearPendingAutoStart()
    handleStart(drillType, topic)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoStart])

  const handleReview = () => {
    const due = getDueCards()
    if (due.length === 0) return
    startDrill('review', 'Spaced Review')
    setDrillData({ cards: due })
  }

  const chips = [
    ...[...struggleZones].reverse().slice(0, 4).map(z => ({ label: z, type: 'struggle' })),
    ...(dominantTopics || []).filter(t => !struggleZones.includes(t)).slice(0, 3).map(t => ({ label: t, type: 'interest' })),
  ].slice(0, 7)

  const btnBase = { padding: '5px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }
  const active  = (color) => ({ ...btnBase, background: `${color}22`, borderColor: color, color })
  const inactive = { ...btnBase, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.42)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Stats strip ── */}
      {drillHistory.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            streak > 0 && { emoji: '🔥', value: `${streak}d`, label: 'Streak', color: '#FB923C' },
            { emoji: '📊', value: thisWeek.length, label: 'This week', color: '#60A5FA' },
            avgScore !== null && { emoji: '🎯', value: `${avgScore}%`, label: 'Avg score', color: avgScore >= 70 ? '#4ADE80' : avgScore >= 50 ? '#FBBF24' : '#F87171' },
            totalSRCards > 0 && { emoji: '🧠', value: totalSRCards, label: 'Memory', color: '#A78BFA' },
          ].filter(Boolean).map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{s.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Priority card ── */}
      {(dueCount > 0 || weakestTopic) && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '14px 16px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(59,130,246,0.07))', border: '1px solid rgba(139,92,246,0.26)' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(167,139,250,0.80)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>🎯 Do this first</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dueCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>
                    Spaced Review · {dueCount} due
                    {upcomingCount > 0 && <span style={{ fontSize: 10.5, color: 'rgba(74,222,128,0.55)', marginLeft: 6 }}>{upcomingCount} more this week</span>}
                  </div>
                </div>
                <button onClick={handleReview} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.38)', color: '#86EFAC', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  Review →
                </button>
              </div>
            )}
            {weakestTopic && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, ...(dueCount > 0 ? { paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' } : {}) }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.90)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weakestTopic.topic}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(248,113,113,0.70)', marginTop: 1 }}>Avg {weakestTopic.avg}% · needs work</div>
                </div>
                <button onClick={() => handleStart('flashcard', weakestTopic.topic)} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.32)', color: '#FCA5A5', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  Drill →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Aeva suggestion banner ── */}
      <AnimatePresence>
        {labSuggestion && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ padding: '11px 14px', borderRadius: 14, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)' }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>✦ Aeva recommends</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>{labSuggestion.reason}</div>
            <button onClick={clearSuggestion} style={{ marginTop: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Topic input ── */}
      <div>
        <input
          ref={inputRef}
          value={topicInput}
          onChange={e => { setTopicInput(e.target.value); setError('') }}
          placeholder="Topic to drill — e.g. photosynthesis, quadratic formula…"
          style={{
            width: '100%', padding: '13px 16px', borderRadius: 14, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: error ? '1.5px solid rgba(239,68,68,0.55)' : '1.5px solid rgba(59,130,246,0.30)',
            color: 'rgba(255,255,255,0.90)', fontSize: 14.5, fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.65)'}
          onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.55)' : 'rgba(59,130,246,0.30)'}
          onKeyDown={e => e.key === 'Enter' && handleStart('flashcard')}
        />
        {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 5 }}>{error}</div>}

        {/* Quick-start from recent — horizontal scroll */}
        {recentTopics.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {recentTopics.map((t, i) => (
              <motion.button key={i}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => handleStart('flashcard', t)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)', color: 'rgba(147,197,253,0.80)', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 10 }}>⚡</span> {t}
              </motion.button>
            ))}
          </div>
        )}

        {!recentTopics.length && chips.length === 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
              Try a topic
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { icon: '🧬', label: 'Photosynthesis', sub: 'Biology · Light & dark reactions' },
                { icon: '📐', label: 'Quadratic Equations', sub: 'Maths · Factorising & quadratic formula' },
                { icon: '⚔️', label: 'World War 2', sub: 'History · Causes, key events & outcomes' },
              ].map((t) => (
                <motion.button key={t.label}
                  whileHover={{ scale: 1.02, x: 3 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handleStart('flashcard', t.label)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 13, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'left' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{t.sub}</div>
                  </div>
                  <ChevronRight size={14} color="rgba(59,130,246,0.55)" style={{ flexShrink: 0 }} />
                </motion.button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, textAlign: 'center' }}>
              or type any topic above ↑
            </div>
          </div>
        )}
      </div>

      {/* ── Suggestions (struggle/interest chips) ── */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map((chip, i) => {
            const isStruggle = chip.type === 'struggle'
            return (
              <motion.button key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setTopicInput(chip.label)}
                style={{ padding: '4px 11px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", background: isStruggle ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.05)', border: isStruggle ? '1px solid rgba(248,113,113,0.28)' : '1px solid rgba(255,255,255,0.10)', color: isStruggle ? '#FCA5A5' : 'rgba(255,255,255,0.55)' }}>
                {isStruggle ? '⚠ ' : ''}{chip.label}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* ── Collapsible settings ── */}
      <div>
        <button onClick={() => setSettingsOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
          <Settings size={12} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            {DIFFICULTIES[difficulty]?.label} · {questionCount} questions · {focusMode.charAt(0).toUpperCase() + focusMode.slice(1)}
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>{settingsOpen ? '▲' : '▼'}</span>
        </button>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
              <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 2 }}>Difficulty</span>
                  {Object.entries(DIFFICULTIES).map(([key, val]) => (
                    <button key={key} onClick={() => setDifficulty(key)} style={difficulty === key ? active(val.color) : inactive}>{val.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 2 }}>Questions</span>
                  {[5, 8, 12, 20].map(n => (
                    <button key={n} onClick={() => setQuestionCount(n)} style={questionCount === n ? active('#60A5FA') : inactive}>{n}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 2 }}>Focus</span>
                  {[{ key: 'theory', label: 'Theory' }, { key: 'mixed', label: 'Mixed' }, { key: 'application', label: 'Application' }].map(({ key, label }) => (
                    <button key={key} onClick={() => setFocusMode(key)} style={focusMode === key ? active('#A78BFA') : inactive}>{label}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 2-column drill grid ── */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
          Choose a drill mode
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {Object.values(DRILLS).map((drill, i) => {
            const best = topicInput.trim() ? getPersonalBest(topicInput.trim(), drill.id) : null
            return <DrillCard key={drill.id} drill={drill} index={i} onStart={handleStart} personalBest={best} />
          })}
        </div>
      </div>

    </div>
  )
}

/* ═══ ORDERS TAB ══════════════════════════════════════ */
const DRILL_EMOJI = { flashcard: '⚡', speedround: '⏱', mocktest: '🎯', feynman: '🧪', match: '🔗', cloze: '✍️', shortanswer: '🧩' }
const URGENCY_COLOR = { high: '#F87171', medium: '#FBBF24', low: '#60A5FA' }

function OrdersTab({ onLaunchOrder }) {
  const { orders, dismissOrder } = useLabStore()
  const pending   = orders.filter(o => !o.completedAt)
  const completed = [...orders.filter(o => o.completedAt)].reverse().slice(0, 12)

  if (pending.length === 0 && completed.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 48, textAlign: 'center' }}>
        <motion.div animate={{ scale: [1, 1.06, 1], opacity: [0.45, 0.65, 0.45] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: 40 }}>🔮</motion.div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 240 }}>
          Aeva is watching. Keep chatting and she'll find your gaps.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Pending · {pending.length}
          </div>
          {pending.map((order) => {
            const urgColor = URGENCY_COLOR[order.urgency] || '#FBBF24'
            const emoji    = DRILL_EMOJI[order.drillType] || '📋'
            const drillDef = DRILLS[order.drillType]
            const isHigh   = order.urgency === 'high'
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }} animate={isHigh ? { opacity: 1, x: 0, boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 16px rgba(239,68,68,0.22)', '0 0 0px rgba(239,68,68,0)'] } : { opacity: 1, x: 0 }}
                transition={isHigh ? { opacity: { duration: 0.3 }, x: { duration: 0.3 }, boxShadow: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } } : {}}
                style={{ padding: '16px 18px', borderRadius: 18, background: isHigh ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.07)', border: isHigh ? '1.5px solid rgba(239,68,68,0.32)' : '1px solid rgba(59,130,246,0.22)', position: 'relative' }}
              >
                {/* Urgency badge */}
                <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: urgColor, boxShadow: `0 0 6px ${urgColor}` }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: urgColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{order.urgency}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, paddingRight: 64 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: isHigh ? 'rgba(239,68,68,0.16)' : 'rgba(59,130,246,0.18)', border: `1px solid ${isHigh ? 'rgba(239,68,68,0.32)' : 'rgba(59,130,246,0.32)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 2 }}>{order.topic}</div>
                    <div style={{ fontSize: 11.5, color: isHigh ? 'rgba(239,68,68,0.65)' : 'rgba(59,130,246,0.70)', fontWeight: 600 }}>{drillDef?.title || order.drillType}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 14, fontStyle: 'italic' }}>
                  "{order.reason}"
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => onLaunchOrder(order)}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 11, background: isHigh ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.22)', border: `1px solid ${isHigh ? 'rgba(239,68,68,0.42)' : 'rgba(59,130,246,0.48)'}`, color: isHigh ? '#FCA5A5' : '#93C5FD', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Do it now <ArrowRight size={12} />
                  </motion.button>
                  <button onClick={() => dismissOrder(order.id)}
                    style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.28)', fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )
          })}
        </>
      )}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: pending.length > 0 ? 8 : 0 }}>
            Completed · {completed.length}
          </div>
          {completed.map(order => (
            <div key={order.id} style={{ padding: '11px 14px', borderRadius: 13, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.16)', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.65 }}>
              <span style={{ fontSize: 14, color: '#4ADE80' }}>✓</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.topic}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{DRILLS[order.drillType]?.title || order.drillType}</div>
              </div>
              {order.score !== null && (
                <span style={{ fontSize: 14, fontWeight: 800, color: order.score >= 70 ? '#4ADE80' : '#FBBF24', flexShrink: 0 }}>{order.score}%</span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ═══ STATS TAB ═══════════════════════════════════════ */
function ActivityHeatmap({ history }) {
  const today    = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const countMap = {}
  history.forEach(e => {
    const d = new Date(e.date)
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    countMap[k] = (countMap[k] || 0) + 1
  })

  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 16 * 7 + 1)

  const weeks = []
  for (let w = 0; w < 16; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + w * 7 + d)
      const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      days.push({ count: countMap[k] || 0, isToday: k === todayKey, date })
    }
    weeks.push(days)
  }

  const cellColor = (n) => {
    if (n === 0) return 'rgba(59,130,246,0.07)'
    if (n === 1) return 'rgba(59,130,246,0.32)'
    if (n <= 3)  return 'rgba(59,130,246,0.58)'
    return 'rgba(59,130,246,0.88)'
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Activity — 16 Weeks</div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => (
              <div key={di}
                title={`${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${day.count} drill${day.count !== 1 ? 's' : ''}`}
                style={{ width: 11, height: 11, borderRadius: 2, background: cellColor(day.count), border: day.isToday ? '1px solid rgba(96,165,250,0.85)' : 'none', flexShrink: 0 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>Less</span>
        {[0, 1, 2, 4].map(n => <div key={n} style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(n) }} />)}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>More</span>
      </div>
    </div>
  )
}

function StatsTab() {
  const { drillHistory } = useLabStore()

  // Aggregate stats
  const totalDrills   = drillHistory.length
  const uniqueTopics  = new Set(drillHistory.map(e => e.topic.toLowerCase())).size
  const avgScore      = totalDrills > 0 ? Math.round(drillHistory.reduce((s, e) => s + e.pct, 0) / totalDrills) : 0

  // Personal bests per topic (best pct across all drill types)
  const topicBestMap = {}
  drillHistory.forEach(e => {
    const t = e.topic.toLowerCase()
    if (!topicBestMap[t] || e.pct > topicBestMap[t]) topicBestMap[t] = e.pct
  })
  const topicBests = Object.entries(topicBestMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Weakest topics (avg score < 70%)
  const topicAvgAccum = {}
  drillHistory.forEach(e => {
    const t = e.topic.toLowerCase()
    if (!topicAvgAccum[t]) topicAvgAccum[t] = { total: 0, count: 0 }
    topicAvgAccum[t].total += e.pct
    topicAvgAccum[t].count++
  })
  const weakTopics = Object.entries(topicAvgAccum)
    .map(([topic, { total, count }]) => ({ topic, avg: Math.round(total / count), count }))
    .filter(e => e.avg < 70)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 6)

  // Recent sessions
  const recent = [...drillHistory].reverse().slice(0, 8)

  const DRILL_COLOR = { flashcard: '#3B82F6', speedround: '#F97316', mocktest: '#06B6D4', feynman: '#8B5CF6', match: '#EC4899', cloze: '#10B981', shortanswer: '#F59E0B' }

  if (totalDrills === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 56, paddingBottom: 24, textAlign: 'center', padding: '56px 24px 24px' }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.03em' }}>No stats yet</div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.7, maxWidth: 260 }}>
          Complete your first drill in the Drill tab to start tracking accuracy, streaks, and weak spots.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300, marginTop: 8 }}>
          {[['⚡', 'Flashcard Sprint', 'Fastest way to start'], ['🧪', 'Feynman Test', 'Explain it to find gaps'], ['🎯', 'Mock Test', 'Full timed practice']].map(([icon, title, sub]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>{title}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Drills', value: totalDrills, color: '#60A5FA' },
          { label: 'Topics',       value: uniqueTopics, color: '#A78BFA' },
          { label: 'Avg Score',    value: `${avgScore}%`, color: avgScore >= 70 ? '#4ADE80' : avgScore >= 50 ? '#FBBF24' : '#F87171' },
        ].map(card => (
          <div key={card.label} style={{ padding: '14px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <ActivityHeatmap history={drillHistory} />

      {/* Personal bests */}
      {topicBests.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Personal Bests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topicBests.map(([topic, pct], i) => {
              const barColor = pct >= 90 ? '#4ADE80' : pct >= 70 ? '#60A5FA' : pct >= 50 ? '#FBBF24' : '#F87171'
              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', width: 16, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: barColor, flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: barColor, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weakest topics */}
      {weakTopics.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Needs Work</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weakTopics.map(({ topic, avg, count }) => (
              <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#F87171', flexShrink: 0, marginLeft: 8 }}>{avg}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${avg}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #EF4444, #F87171)' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{count} session{count !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {recent.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Recent Sessions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {recent.map((entry, i) => {
              const color      = DRILL_COLOR[entry.drillType] || '#60A5FA'
              const gradeColor = entry.pct >= 90 ? '#4ADE80' : entry.pct >= 70 ? '#60A5FA' : entry.pct >= 50 ? '#FBBF24' : '#F87171'
              const dateStr    = new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ padding: '10px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.topic}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{entry.drillType} · {dateStr}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: gradeColor, letterSpacing: '-0.02em', flexShrink: 0 }}>{entry.pct}%</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ LAB HUB MAIN COMPONENT ══════════════════════════ */
export default function LabHub() {
  const {
    labOpen, closeLab, labTab, setLabTab,
    activeDrill, exitDrill,
    currentTopic, drillData, drillLoading,
    orders, setActiveOrderId, startDrill, setDrillData,
  } = useLabStore()
  const { activeNodeSession, endNodeSession, completeNode, openRoadmapHub } = useRoadmapStore()
  const { addXP: addXPLab } = useXPStore()

  const handleLabNodeDone = () => {
    if (activeNodeSession) {
      completeNode(activeNodeSession.roadmapId, activeNodeSession.nodeId)
      addXPLab('DRILL_COMPLETE')
      endNodeSession()
    }
    exitDrill()
    closeLab()
    openRoadmapHub()
  }

  const inputRef = useRef(null)
  const [widgetMode, setWidgetMode] = useState(() => localStorage.getItem('aeva_lab_widget') === '1')
  const toggleWidget = () => setWidgetMode(m => { const n = !m; localStorage.setItem('aeva_lab_widget', n ? '1' : '0'); return n })

  const pendingCount = orders.filter(o => !o.completedAt).length

  // Launch an order: pre-fill topic + drill type, mark it as the active order
  const handleLaunchOrder = async (order) => {
    setActiveOrderId(order.id)
    startDrill(order.drillType, order.topic)
    try {
      const { difficulty, questionCount, focusMode } = useLabStore.getState()
      const data = await generateDrillContent(order.drillType, order.topic, difficulty, questionCount, focusMode)
      setDrillData(data)
    } catch {
      exitDrill()
    }
  }

  // Go Harder — re-runs the current drill with the difficulty already bumped by DrillComplete
  const handleRestartDrill = async () => {
    const { activeDrill: drillId, currentTopic: topic, difficulty, questionCount, focusMode } = useLabStore.getState()
    if (!drillId || !topic) return
    startDrill(drillId, topic)
    try {
      const data = await generateDrillContent(drillId, topic, difficulty, questionCount, focusMode)
      setDrillData(data)
    } catch {
      exitDrill()
    }
  }

  const tabs = [
    { id: 'drill',  label: 'Drill',           icon: <FlaskConical size={12} /> },
    { id: 'orders', label: "Aeva's Orders",    icon: <span style={{ fontSize: 12 }}>🔮</span>, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'stats',  label: 'Stats',            icon: <span style={{ fontSize: 12 }}>📊</span> },
  ]

  return (
    <AnimatePresence>
      {labOpen && (
        <>
          {/* Full-screen Lab */}
          <motion.div
            key="lab-panel"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.20, ease: 'easeOut' }}
            style={{
              position: 'fixed', inset: 0, zIndex: 201,
              background: 'rgb(5,7,22)',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif",
              overflow: 'hidden',
            }}
          >
            {/* Glow accents */}
            <div aria-hidden style={{ position: 'absolute', top: -80, left: '10%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', bottom: -80, right: '8%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ borderBottom: '1px solid rgba(59,130,246,0.10)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 32px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #1D4ED8, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FlaskConical size={17} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.03em' }}>Training Lab</div>
                    <div style={{ fontSize: 11, color: 'rgba(59,130,246,0.70)', marginTop: 1, fontWeight: 600 }}>
                      {activeDrill ? `${DRILLS[activeDrill]?.title} — ${currentTopic}` : 'Drill & Mastery Hub'}
                    </div>
                  </div>
                </div>
                {/* Right side: roadmap pill + scan pill + close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {activeNodeSession && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={handleLabNodeDone}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 99, border: 'none',
                        background: 'linear-gradient(135deg, #16a34a, #22C55E)',
                        boxShadow: '0 3px 10px rgba(34,197,94,0.35)',
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}>
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      Done · Next Node
                    </motion.button>
                  )}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 6px #3B82F6' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Scan Mode</span>
                  </div>
                  <WidgetToggle active={widgetMode} onToggle={toggleWidget} />
                  <motion.button whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.92 }}
                    onClick={() => { exitDrill(); closeLab() }}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.50)' }}>
                    <X size={15} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            {!activeDrill && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', display: 'flex', gap: 2 }}>
                  {tabs.map(tab => {
                    const isActive = labTab === tab.id
                    return (
                      <button key={tab.id} onClick={() => setLabTab(tab.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: '10px 10px 0 0',
                          background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                          border: 'none', borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                          color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.38)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s', position: 'relative',
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                        {tab.icon}
                        {tab.label}
                        {tab.badge && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}
                            style={{ minWidth: 18, height: 18, borderRadius: 99, background: '#4ADE80', color: '#0a160a', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: 2 }}>
                            {tab.badge}
                          </motion.div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Feature spotlight */}
            {!activeDrill && (
              <FeatureSpotlight
                id="lab"
                icon="🧪"
                title="8 drill types, any topic"
                body="Type any subject above — Aeva generates flashcards, speed rounds, mock tests, Feynman challenges, cloze tests and more on the fly. Widget mode shows your score as Ai OS gradient cards."
                accentColor="#60A5FA"
              />
            )}

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: activeDrill ? 760 : 1100, margin: '0 auto', padding: '24px 32px 48px' }}>

              {/* Active drill */}
              {activeDrill && (
                <>
                  <button onClick={exitDrill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', padding: 0, alignSelf: 'flex-start', marginBottom: 16 }}>
                    ← back to drills
                  </button>
                  {activeDrill === 'review'
                    ? (drillData
                        ? <ReviewDrill data={drillData} onExit={exitDrill}
                            onNewDrill={() => { exitDrill(); setLabTab('drill') }} widgetMode={widgetMode} />
                        : <LabLoading topic="Spaced Review" />
                      )
                    : drillLoading
                      ? <LabLoading topic={currentTopic} />
                      : drillData
                        ? activeDrill === 'flashcard'    ? <FlashcardDrill    data={drillData} topic={currentTopic} onExit={exitDrill} onGoHarder={handleRestartDrill} widgetMode={widgetMode} />
                          : activeDrill === 'speedround'  ? <SpeedRoundDrill   data={drillData} topic={currentTopic} onExit={exitDrill} onGoHarder={handleRestartDrill} widgetMode={widgetMode} />
                          : activeDrill === 'mocktest'    ? <MockTestDrill     data={drillData} topic={currentTopic} onExit={exitDrill} widgetMode={widgetMode} />
                          : activeDrill === 'feynman'     ? <FeynmanDrill      data={drillData} topic={currentTopic} onExit={exitDrill} widgetMode={widgetMode} />
                          : activeDrill === 'cloze'       ? <ClozeDrill        data={drillData} topic={currentTopic} onExit={exitDrill} onGoHarder={handleRestartDrill} widgetMode={widgetMode} />
                          : activeDrill === 'shortanswer'   ? <ShortAnswerDrill   data={drillData} topic={currentTopic} onExit={exitDrill} onGoHarder={handleRestartDrill} widgetMode={widgetMode} />
                          : activeDrill === 'examPractice'  ? <ExamPracticeDrill  data={drillData} topic={currentTopic} onExit={exitDrill} widgetMode={widgetMode} />
                                                           : <MatchGridDrill      data={drillData} topic={currentTopic} onExit={exitDrill} onGoHarder={handleRestartDrill} widgetMode={widgetMode} />
                        : <LabLoading topic={currentTopic} />
                  }
                </>
              )}

              {!activeDrill && labTab === 'drill'  && <DrillTab />}
              {!activeDrill && labTab === 'orders' && <OrdersTab onLaunchOrder={handleLaunchOrder} />}
              {!activeDrill && labTab === 'stats'  && <StatsTab />}

              </div>{/* /maxWidth wrapper */}
            </div>{/* /body scroll */}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
