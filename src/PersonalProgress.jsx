import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNeuralStore } from './neuralStore'
import { useLabStore } from './labStore'
import { useRoadmapStore, calcGrade, GRADE_THRESHOLDS } from './roadmapStore'
import { useExamStore } from './examStore'

/* ── helpers ──────────────────────────────────────────────────────────────── */
function gradeColor(grade) {
  return GRADE_THRESHOLDS.find(t => t.grade === grade)?.color || '#818CF8'
}

function fmt(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/* mini sparkline — just the score dots connected with an SVG path */
function ScoreLine({ values, color = '#A78BFA', height = 36 }) {
  if (values.length < 2) return null
  const w = 110
  const pad = 6
  const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (w - pad * 2))
  const ys = values.map(v => height - pad - ((v / 100) * (height - pad * 2)))
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={height} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 3.5 : 2.2}
          fill={i === xs.length - 1 ? color : 'rgba(255,255,255,0.25)'} />
      ))}
    </svg>
  )
}

/* thin horizontal bar */
function Bar({ pct, color, height = 4 }) {
  return (
    <div style={{ height, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flex: 1 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 99, background: color }}
      />
    </div>
  )
}

/* ── main component ───────────────────────────────────────────────────────── */
export default function PersonalProgress() {
  const { masteredTopics, struggleZones, totalExchanges, dominantTopics, topicInterest } = useNeuralStore()
  const { drillHistory } = useLabStore()
  const roadmaps  = useRoadmapStore(s => s.roadmaps)
  const examHistory = useExamStore(s => s.examHistory)   // cross-roadmap flat list

  /* ── drill stats ── */
  const totalDrills = (drillHistory || []).length
  const avgDrillScore = totalDrills > 0
    ? Math.round(drillHistory.reduce((s, h) => s + h.pct, 0) / totalDrills)
    : null
  const improvedTopics = useMemo(() => Object.values(
    (drillHistory || []).reduce((acc, h) => {
      if (!acc[h.topic]) acc[h.topic] = []
      acc[h.topic].push(h.pct); return acc
    }, {})
  ).filter(arr => arr.length >= 2 && arr[arr.length - 1] > arr[0]).length, [drillHistory])

  /* ── exam stats per roadmap ── */
  const roadmapExamData = useMemo(() => roadmaps
    .map(r => ({
      id:      r.id,
      title:   r.title,
      history: (r.examHistory || []).slice(-8),   // last 8 attempts
      best:    Math.max(0, ...(r.examHistory || []).map(e => e.pct || 0)),
      latest:  (r.examHistory || []).slice(-1)[0] || null,
      readiness: r.readiness || 0,
    }))
    .filter(r => r.history.length > 0),
  [roadmaps])

  /* ── aggregate weak topics across all exams ── */
  const weakTopics = useMemo(() => {
    const counts = {}
    ;(examHistory || []).forEach(e => {
      Object.entries(e.topicScores || {}).forEach(([topic, score]) => {
        if (score < 60) counts[topic] = (counts[topic] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }))
  }, [examHistory])

  const totalExams = (examHistory || []).length
  const avgExamScore = totalExams > 0
    ? Math.round(examHistory.reduce((s, e) => s + (e.pct || 0), 0) / totalExams)
    : null

  const empty = totalExchanges === 0 && totalDrills === 0 && totalExams === 0

  if (empty) {
    return (
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 1.55, fontFamily: "'Inter', system-ui, sans-serif" }}>
        Start chatting with Aeva, drilling in The Lab, or running an Exam Simulation — your real progress will appear here.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TOP STATS ROW ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Mastered',  value: masteredTopics.length,                    color: '#4ADE80' },
          { label: 'Exams',     value: totalExams,                               color: '#A78BFA' },
          { label: 'Avg Exam',  value: avgExamScore !== null ? `${avgExamScore}%` : '—', color: '#FBBF24' },
          { label: 'Drills',    value: totalDrills,                              color: '#60A5FA' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '8px 6px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── EXAM HISTORY PER ROADMAP ── */}
      {roadmapExamData.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>Exam History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roadmapExamData.map(rm => {
              const scores  = rm.history.map(e => e.pct || 0)
              const latest  = rm.latest
              const grade   = latest ? (latest.grade || calcGrade(latest.pct || 0).grade) : null
              const gc      = grade ? gradeColor(grade) : '#818CF8'
              const trend   = scores.length >= 2
                ? scores[scores.length - 1] - scores[scores.length - 2]
                : 0

              return (
                <div key={rm.id} style={{ padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                  {/* header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rm.title}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                        {rm.history.length} attempt{rm.history.length !== 1 ? 's' : ''} · best {rm.best}%
                        {trend !== 0 && (
                          <span style={{ marginLeft: 6, color: trend > 0 ? '#4ADE80' : '#F87171', fontWeight: 700 }}>
                            {trend > 0 ? `↑+${trend}%` : `↓${trend}%`} last
                          </span>
                        )}
                      </div>
                    </div>

                    {/* grade badge */}
                    {grade && (
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${gc}18`, border: `1.5px solid ${gc}40`,
                        fontSize: 15, fontWeight: 900, color: gc, marginLeft: 10 }}>
                        {grade}
                      </div>
                    )}
                  </div>

                  {/* sparkline + scores row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <ScoreLine values={scores} color={gc} />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {rm.history.slice(-5).map((e, i) => {
                        const ec = gradeColor(e.grade || calcGrade(e.pct || 0).grade)
                        return (
                          <div key={e.id || i} title={fmt(e.date)}
                            style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                              background: `${ec}18`, border: `1px solid ${ec}35`, color: ec }}>
                            {e.pct}%
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── WEAK TOPICS FROM EXAMS ── */}
      {weakTopics.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>Recurring Weak Topics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weakTopics.map(({ topic, count }) => (
              <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic}
                </div>
                <Bar pct={(count / Math.max(...weakTopics.map(w => w.count))) * 100} color="#F87171" height={3} />
                <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.60)', fontWeight: 700, flexShrink: 0, width: 40, textAlign: 'right' }}>
                  ×{count} exam{count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MASTERED ── */}
      {masteredTopics.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Mastered in Chat</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {masteredTopics.slice(-8).map(t => (
              <div key={t} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(74,222,128,0.10)',
                border: '1px solid rgba(74,222,128,0.25)', fontSize: 11, color: '#86EFAC', fontWeight: 500 }}>{t}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── STRUGGLE ZONES ── */}
      {struggleZones.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Needs Work (Chat)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {struggleZones.slice(-4).map(t => (
              <div key={t} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.22)', fontSize: 11, color: '#FCA5A5', fontWeight: 500 }}>{t}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── DRILL PERFORMANCE ── */}
      {totalDrills > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Drill Performance</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10,
              background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#60A5FA' }}>{totalDrills}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Sessions</div>
            </div>
            {avgDrillScore !== null && (
              <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10,
                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#60A5FA' }}>{avgDrillScore}%</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Avg Score</div>
              </div>
            )}
            {improvedTopics > 0 && (
              <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10,
                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#4ADE80' }}>{improvedTopics}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Improving</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CORE INTERESTS ── */}
      {(dominantTopics || []).length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Core Interests</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {(dominantTopics || []).map(t => (
              <div key={t} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.24)', fontSize: 11, color: '#A5B4FC', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4 }}>
                {t}
                <span style={{ fontSize: 9, color: 'rgba(165,180,252,0.55)', fontWeight: 600 }}>×{topicInterest?.[t] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
