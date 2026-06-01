import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft } from 'lucide-react'
import { useNeuralStore } from './neuralStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ── Personality bar ─────────────────────────────── */
function MetricBar({ label, value, max = 100, color, note }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 4 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color} 0%, ${color}88 100%)` }}
        />
      </div>
      {note && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>{note}</div>}
    </div>
  )
}

/* ── Pentagon radar (standalone) ─────────────────── */
function StyleRadar({ learningStyle, dominant, confidence }) {
  const DIMS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const LABELS = { analogical: 'Analogy', visual: 'Visual', structural: 'Structure', exampleFirst: 'Examples', conceptual: 'Concepts' }
  const cx = 80, cy = 80, radius = 58
  const raw = DIMS.map(d => learningStyle[d] || 0)
  const maxVal = Math.max(...raw, 1)

  function pt(idx, r) {
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / 5
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const ringPath = (f) => DIMS.map((_, i) => {
    const p = pt(i, radius * f)
    return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ') + ' Z'

  const filledPath = raw.map((v, i) => {
    const p = pt(i, (v / maxVal) * radius)
    return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ') + ' Z'

  const COLORS = { analogical: '#A78BFA', visual: '#60A5FA', structural: '#34D399', exampleFirst: '#FBBF24', conceptual: '#F87171' }
  const col = COLORS[dominant] || '#8B8FFF'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 160 160" width={160} height={160}>
        {[0.33, 0.66, 1].map((f, i) => (
          <path key={i} d={ringPath(f)} fill="none"
            stroke={f === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
            strokeWidth={f === 1 ? 0.8 : 0.4}
          />
        ))}
        {DIMS.map((_, i) => {
          const p = pt(i, radius)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        })}
        <motion.path
          d={filledPath}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          fill={`${col}18`}
          stroke={`${col}70`}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        {/* Labels */}
        {DIMS.map((d, i) => {
          const p = pt(i, radius + 14)
          const isDom = d === dominant
          return (
            <text key={d}
              x={p.x} y={p.y}
              textAnchor="middle" dominantBaseline="middle"
              fill={isDom ? col : 'rgba(255,255,255,0.30)'}
              fontSize={isDom ? 8.5 : 7.5}
              fontWeight={isDom ? 700 : 400}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {LABELS[d]}
            </text>
          )
        })}
      </svg>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
        {confidence >= 100 ? 'Calibrated' : `${confidence}% calibrated`}
      </div>
    </div>
  )
}

/* ── Stat chip ───────────────────────────────────── */
function StatChip({ label, value, color = 'rgba(255,255,255,0.55)' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '12px 16px', borderRadius: 14,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </div>
    </div>
  )
}

/* ── Section wrapper ──────────────────────────────── */
function Section({ title, accent = 'rgba(255,255,255,0.22)', children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        padding: '20px 22px', borderRadius: 20,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      <div style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: accent, marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </motion.div>
  )
}

/* ── AI Assessment generator ─────────────────────── */
async function generateAssessment(name, store) {
  const {
    profileTitle, rank, orbPersonality, humorPreference,
    frustrationScore, competitiveness, depth, avgResponseLength,
    masteredTopics, struggleZones, totalExchanges, traits,
    learningStyle, learningStyleLocked, dominantTopics,
    fastResponses, longPauses, recentModes,
  } = store

  const DIMS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const dominant = DIMS.reduce((b, d) => (learningStyle[d] > (learningStyle[b] || 0) ? d : b), DIMS[0])
  const STYLE_NAME = { analogical: 'analogy-first', visual: 'visual-spatial', structural: 'structure-first', exampleFirst: 'example-first', conceptual: 'concept-driven' }
  const modeCount = recentModes.reduce((acc, m) => ({ ...acc, [m]: (acc[m] || 0) + 1 }), {})
  const vibeTrend = Object.entries(modeCount).sort((a, b) => b[1] - a[1]).map(([m]) => m).join(', ')
  const speedRatio = fastResponses + longPauses > 0 ? `${fastResponses} fast / ${longPauses} slow` : 'not enough data'

  const prompt = `You are Aeva — a brutally honest AI mentor who has been studying ${name} across ${totalExchanges} learning sessions.

Neural data you have on ${name}:
- Profile: "${profileTitle}" (${rank})
- Personality type: ${orbPersonality}
- Frustration index: ${frustrationScore}/100 — ${frustrationScore > 65 ? 'impatient, easily triggered' : frustrationScore < 30 ? 'unusually patient' : 'moderate tolerance'}
- Competitiveness: ${competitiveness}/100 — ${competitiveness > 70 ? 'highly driven to win' : competitiveness < 35 ? 'process-oriented' : 'balanced'}
- Depth preference: ${depth}/100 — ${depth > 70 ? 'craves nuance and mechanism' : depth < 35 ? 'prefers surface summaries' : 'moderate depth'}
- Humor: ${humorPreference}/10
- Learning style: ${STYLE_NAME[dominant] || 'not yet calibrated'} (${learningStyleLocked ? 'confirmed' : 'emerging'})
- Response speed: ${speedRatio}
- Avg answer length: ${avgResponseLength} chars — ${avgResponseLength > 110 ? 'elaborate thinker' : avgResponseLength < 38 ? 'sharp and concise' : 'balanced'}
- Mastered: ${masteredTopics.slice(-5).join(', ') || 'none yet'}
- Struggle zones: ${struggleZones.join(', ') || 'none identified'}
- Dominant interests: ${dominantTopics.slice(0, 4).join(', ') || 'mixed'}
- Recent mode trend: ${vibeTrend || 'insufficient data'}
- Detected traits: ${traits.map(t => t.label).join(', ')}

Write a 3-paragraph psychological learning profile of ${name} in second person ("You"). Rules:
- Paragraph 1: Core learning identity — how they think, what drives them, their hidden strength
- Paragraph 2: The gap — what's holding them back, a specific blind spot or pattern you've detected
- Paragraph 3: The diagnosis — what they need to focus on next, framed as an honest challenge
- Be specific. Reference actual data points. Be direct, even uncomfortable.
- Never use corporate language. Write like a sharp mentor who has earned the right to be blunt.
- No headers. No bullet points. Just 3 paragraphs, maximum 220 words total.`

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.78,
        max_tokens: 320,
      }),
    })
    if (!res.ok) throw new Error('Assessment failed')
    const json = await res.json()
    return json.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

/* ══ Main UserProfile component ══════════════════════ */
export default function UserProfile({ name, onClose }) {
  const store = useNeuralStore()
  const {
    profileTitle, rank, traits, currentVibe, orbPersonality,
    masteredTopics, struggleZones, totalExchanges, avgResponseLength,
    fastResponses, longPauses, humorPreference, frustrationScore,
    competitiveness, depth, recentModes, learningStyle,
    learningStyleTotal, learningStyleLocked, dominantTopics,
    conceptMap, strugglePredictions, topicInterest,
  } = store

  const [assessment, setAssessment] = useState(null)
  const [assessLoading, setAssessLoading] = useState(true)

  useEffect(() => {
    if (totalExchanges >= 3) {
      generateAssessment(name, store).then(text => {
        setAssessment(text)
        setAssessLoading(false)
      })
    } else {
      setAssessLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const VIBE_COLORS = {
    Proud: '#4ADE80', Skeptical: '#F87171', Engaged: '#60A5FA',
    Impressed: '#FBBF24', Concerned: '#F97316', Focused: '#A78BFA',
  }
  const ORB_COLORS = { aggressive: '#EF4444', academic: '#3B82F6', curious: '#F59E0B', balanced: '#8B8FFF' }
  const vibeColor = VIBE_COLORS[currentVibe] || '#A78BFA'
  const orbColor = ORB_COLORS[orbPersonality] || '#8B8FFF'

  const DIMS = ['analogical', 'visual', 'structural', 'exampleFirst', 'conceptual']
  const STYLE_TITLES = {
    analogical: 'Analogy Thinker', visual: 'Spatial Reasoner', structural: 'Systems Builder',
    exampleFirst: 'Concrete Learner', conceptual: 'Principle Seeker',
  }
  const STYLE_COLORS = { analogical: '#A78BFA', visual: '#60A5FA', structural: '#34D399', exampleFirst: '#FBBF24', conceptual: '#F87171' }
  const dominant = DIMS.reduce((b, d) => (learningStyle[d] > (learningStyle[b] || 0) ? d : b), DIMS[0])
  const confidence = Math.min(100, Math.round((learningStyleTotal / 15) * 100))
  const dominantColor = STYLE_COLORS[dominant] || '#8B8FFF'

  const speedStyle = avgResponseLength > 110 ? 'Elaborate' : avgResponseLength < 38 ? 'Concise' : 'Balanced'
  const modeCount = recentModes.reduce((acc, m) => ({ ...acc, [m]: (acc[m] || 0) + 1 }), {})

  // Concept map stats
  const highMastery = conceptMap.filter(c => c.mastery >= 75).length
  const mostVisited = [...conceptMap].sort((a, b) => b.visits - a.visits)[0]
  const newest = [...conceptMap].sort((a, b) => b.firstSeen - a.firstSeen)[0]

  // Top interests
  const topInterests = Object.entries(topicInterest || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(3,4,14,0.98)',
        backdropFilter: 'blur(24px)',
        overflowY: 'auto',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', top: -150, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${orbColor}14 0%, transparent 70%)`,
        filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '14px 24px',
        backdropFilter: 'blur(32px)',
        background: 'rgba(3,4,14,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 99,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600,
          }}
        >
          <ChevronLeft size={13} strokeWidth={2.5} />
          Back
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #2D308E, #E9A364)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>★</div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.80)', letterSpacing: '-0.02em' }}>aeva</span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>/ profile</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.08, rotate: 90 }} whileTap={{ scale: 0.94 }}
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={13} />
        </motion.button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px 64px', position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          {/* Avatar ring */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, position: 'relative' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: -6,
                borderRadius: '50%',
                border: `1.5px dashed ${orbColor}40`,
              }}
            />
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `linear-gradient(135deg, ${orbColor}40, rgba(233,163,100,0.30))`,
              border: `2px solid ${orbColor}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: 'white',
              boxShadow: `0 0 32px ${orbColor}30`,
            }}>
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(26px, 5vw, 38px)',
            fontWeight: 400, color: 'rgba(255,255,255,0.96)',
            lineHeight: 1.15, margin: '0 0 6px',
          }}>
            {name}
          </h1>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(14px, 3vw, 18px)',
            fontStyle: 'italic',
            color: orbColor, opacity: 0.90,
            marginBottom: 16,
          }}>
            "{profileTitle}"
          </div>

          {/* Badge row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ padding: '5px 14px', borderRadius: 99, background: `${orbColor}18`, border: `1px solid ${orbColor}40`, fontSize: 11, fontWeight: 700, color: orbColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {rank}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 99, background: `${vibeColor}14`, border: `1px solid ${vibeColor}35`, fontSize: 11, fontWeight: 700, color: vibeColor, letterSpacing: '0.06em' }}>
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: vibeColor }} />
              {currentVibe}
            </div>
            <div style={{ padding: '5px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
              {totalExchanges} sessions
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: 10, marginBottom: 20 }}
        >
          <StatChip label="Total Sessions" value={totalExchanges} color="#8B8FFF" />
          <StatChip label="Mastered Topics" value={masteredTopics.length} color="#4ADE80" />
          <StatChip label="Struggle Zones" value={struggleZones.length} color="#F87171" />
          <StatChip label="Concepts Mapped" value={conceptMap.length} color="#60A5FA" />
        </motion.div>

        {/* ── Aeva's Assessment ── */}
        <Section title="Aeva's Psychological Assessment" accent="#8B8FFF" delay={0.15}>
          {totalExchanges < 3 ? (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, fontStyle: 'italic' }}>
              Chat with Aeva for at least 3 sessions — she needs enough data to build an honest assessment.
            </div>
          ) : assessLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(139,143,255,0.15)', borderTopColor: '#8B8FFF', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>Aeva is reading your profile…</span>
            </div>
          ) : assessment ? (
            <div style={{ position: 'relative' }}>
              {/* Classified stamp effect */}
              <div style={{
                position: 'absolute', top: -8, right: -4,
                fontSize: 9, fontWeight: 800, color: 'rgba(139,143,255,0.18)',
                letterSpacing: '0.18em', textTransform: 'uppercase',
                border: '1.5px solid rgba(139,143,255,0.12)',
                padding: '2px 7px', borderRadius: 3, transform: 'rotate(2deg)',
              }}>
                Confidential
              </div>
              {assessment.split('\n\n').filter(p => p.trim()).map((para, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  style={{
                    fontSize: 14, color: 'rgba(255,255,255,0.72)',
                    lineHeight: 1.72, margin: i > 0 ? '14px 0 0' : 0,
                  }}
                >
                  {para.trim()}
                </motion.p>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic' }}>
              Assessment unavailable right now.
            </div>
          )}
        </Section>

        {/* ── Two-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>

          {/* Personality Metrics */}
          <Section title="Neural Metrics" accent="#E9A364" delay={0.22}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <MetricBar
                label="Frustration Index"
                value={frustrationScore}
                color={frustrationScore > 65 ? '#F87171' : frustrationScore < 30 ? '#4ADE80' : '#FBBF24'}
                note={frustrationScore > 65 ? 'Impatient under friction' : frustrationScore < 30 ? 'Unusually patient' : 'Moderate tolerance'}
              />
              <MetricBar
                label="Competitiveness"
                value={competitiveness}
                color="#E9A364"
                note={competitiveness > 70 ? 'Driven to outperform' : competitiveness < 35 ? 'Process over outcome' : 'Balanced drive'}
              />
              <MetricBar
                label="Depth Preference"
                value={depth}
                color="#8B8FFF"
                note={depth > 70 ? 'Craves the full mechanism' : depth < 35 ? 'Prefers surface clarity' : 'Moderate depth'}
              />
              <MetricBar
                label="Humor Preference"
                value={humorPreference * 10}
                color="#60A5FA"
                note={humorPreference >= 7 ? 'Responds well to wit' : humorPreference <= 3 ? 'Prefers pure logic' : 'Occasional levity'}
              />
            </div>
          </Section>

          {/* Learning Style */}
          <Section title="Learning DNA" accent={dominantColor} delay={0.26}>
            {learningStyleTotal === 0 ? (
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.65 }}>
                Chat with Aeva to calibrate your learning style fingerprint.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <StyleRadar learningStyle={learningStyle} dominant={dominant} confidence={confidence} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: dominantColor, marginBottom: 2 }}>
                    {STYLE_TITLES[dominant]}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
                    {learningStyleLocked ? 'Style confirmed and locked in' : `${confidence}% calibrated`}
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Traits ── */}
        <div style={{ marginTop: 14 }}>
          <Section title="Detected Traits" accent="rgba(255,255,255,0.30)" delay={0.30}>
            <div style={{ display: 'flex', gap: 12 }}>
              {traits.map((t, i) => (
                <motion.div
                  key={t.label}
                  initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 280 }}
                  style={{
                    flex: 1, padding: '16px 14px', borderRadius: 16, textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3 }}>
                    {t.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Knowledge ── */}
        <div style={{ marginTop: 14 }}>
          <Section title="Knowledge State" accent="#4ADE80" delay={0.34}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Mastered */}
              {masteredTopics.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#86EFAC', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Mastered
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {masteredTopics.map(t => (
                      <div key={t} style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.26)', fontSize: 12, fontWeight: 600, color: '#86EFAC' }}>
                        ✓ {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Struggles */}
              {struggleZones.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#FCA5A5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Struggle Zones
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {struggleZones.map(t => (
                      <div key={t} style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(248,113,113,0.09)', border: '1px solid rgba(248,113,113,0.24)', fontSize: 12, fontWeight: 600, color: '#FCA5A5' }}>
                        ⚠ {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions */}
              {strugglePredictions.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Predicted Next
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {strugglePredictions.map(p => (
                      <div key={p.id} style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.28)', fontSize: 12, fontWeight: 600, color: '#C4B5FD' }}>
                        🔮 {p.concept} <span style={{ opacity: 0.55, fontSize: 10 }}>{p.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {masteredTopics.length === 0 && struggleZones.length === 0 && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                  Start chatting to build your knowledge map.
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Response Patterns ── */}
        <div style={{ marginTop: 14 }}>
          <Section title="Response Patterns" accent="#60A5FA" delay={0.38}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Answer Style
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#60A5FA', marginBottom: 3 }}>{speedStyle}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                  avg {avgResponseLength} chars per reply
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Response Speed
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: fastResponses > longPauses ? '#4ADE80' : '#FBBF24', marginBottom: 3 }}>
                  {fastResponses > longPauses ? 'Instinct-Driven' : longPauses > fastResponses ? 'Deliberate' : 'Mixed'}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                  {fastResponses} fast · {longPauses} slow
                </div>
              </div>

              {/* Aeva mood distribution */}
              {Object.keys(modeCount).length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Aeva's Mood Toward You
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { key: 'hype', label: 'Momentum', color: '#E9A364' },
                      { key: 'coach', label: 'Coaching', color: '#8B8FFF' },
                      { key: 'challenge', label: 'Challenge', color: '#FF8C6B' },
                      { key: 'redirect', label: 'Redirect', color: '#7EC8E3' },
                    ].filter(m => modeCount[m.key]).map(m => {
                      const pct = Math.round(((modeCount[m.key] || 0) / recentModes.length) * 100)
                      return (
                        <div key={m.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 60 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{pct}%</div>
                          <div style={{ height: 4, width: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              style={{ height: '100%', borderRadius: 99, background: m.color }}
                            />
                          </div>
                          <div style={{ fontSize: 10, color: m.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Topic Interests ── */}
        {topInterests.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Section title="Topic Interests" accent="#FBBF24" delay={0.42}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {topInterests.map(([topic, count], i) => {
                  const maxCount = topInterests[0][1]
                  const intensity = 0.15 + (count / maxCount) * 0.55
                  return (
                    <motion.div
                      key={topic}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.42 + i * 0.04 }}
                      style={{
                        padding: '6px 14px', borderRadius: 99,
                        background: `rgba(251,191,36,${intensity * 0.2})`,
                        border: `1px solid rgba(251,191,36,${intensity * 0.5})`,
                        fontSize: 12 + Math.round((count / maxCount) * 2),
                        fontWeight: 600,
                        color: `rgba(253,230,138,${0.55 + intensity * 0.45})`,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {topic}
                      <span style={{ fontSize: 9.5, opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>×{count}</span>
                    </motion.div>
                  )
                })}
              </div>
            </Section>
          </div>
        )}

        {/* ── Concept Map Stats ── */}
        {conceptMap.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Section title="Concept Map" accent="#7EC8E3" delay={0.46}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#7EC8E3', marginBottom: 2 }}>{conceptMap.length}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>total concepts</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#4ADE80', marginBottom: 2 }}>{highMastery}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>high mastery (≥75%)</div>
                </div>
                {mostVisited && (
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Most Revisited</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.82)', textTransform: 'capitalize' }}>
                      {mostVisited.label}
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: 400, marginLeft: 8 }}>{mostVisited.visits} visits</span>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          style={{ textAlign: 'center', marginTop: 40, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}
        >
          This profile is built entirely from your behaviour across {totalExchanges} session{totalExchanges !== 1 ? 's' : ''}.<br />
          Aeva never shares or stores your data externally.
        </motion.div>
      </div>
    </motion.div>
  )
}
