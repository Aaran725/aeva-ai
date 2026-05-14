import { motion } from 'framer-motion'
import { useNeuralStore } from './neuralStore'
import { useLabStore } from './labStore'

export default function PersonalProgress() {
  const { masteredTopics, struggleZones, totalExchanges, depth, conceptMap, dominantTopics, topicInterest } = useNeuralStore()
  const { drillHistory } = useLabStore()

  // Personal bests from drill history
  const bestByTopic = {}
  ;(drillHistory || []).forEach(h => {
    const key = `${h.topic}:${h.drillType}`
    if (!bestByTopic[key] || h.pct > bestByTopic[key].pct) bestByTopic[key] = h
  })
  const totalDrills = (drillHistory || []).length
  const avgScore = totalDrills > 0
    ? Math.round((drillHistory || []).reduce((s, h) => s + h.pct, 0) / totalDrills)
    : null

  // Progress: topics drilled multiple times — show improvement
  const improvedTopics = Object.values(
    (drillHistory || []).reduce((acc, h) => {
      if (!acc[h.topic]) acc[h.topic] = []
      acc[h.topic].push(h.pct)
      return acc
    }, {})
  ).filter(arr => arr.length >= 2 && arr[arr.length - 1] > arr[0])

  const empty = totalExchanges === 0 && totalDrills === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.80)', letterSpacing: '-0.01em' }}>
          Your Progress
        </span>
      </div>

      {empty ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 1.55 }}>
          Start chatting with Aeva and drilling in The Lab — your real progress will appear here.
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Mastered', value: masteredTopics.length, color: '#4ADE80' },
              { label: 'Drilling', value: totalDrills, color: '#60A5FA' },
              { label: 'Avg Score', value: avgScore !== null ? `${avgScore}%` : '—', color: '#FBBF24' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '8px 10px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mastered topics */}
          {masteredTopics.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Mastered</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {masteredTopics.slice(-6).map(t => (
                  <div key={t} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', fontSize: 11, color: '#86EFAC', fontWeight: 500 }}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* Struggle zones */}
          {struggleZones.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Needs Work</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {struggleZones.slice(-4).map(t => (
                  <div key={t} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', fontSize: 11, color: '#FCA5A5', fontWeight: 500 }}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement streak */}
          {improvedTopics.length > 0 && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)' }}>
              <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 600 }}>
                📈 Improving on {improvedTopics.length} topic{improvedTopics.length > 1 ? 's' : ''} through repeated drilling
              </div>
            </div>
          )}

          {/* Core interests */}
          {(dominantTopics || []).length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>
                Core Interests
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(dominantTopics || []).map(t => {
                  const count = topicInterest?.[t] || 0
                  return (
                    <div key={t} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.24)', fontSize: 11, color: '#A5B4FC', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t}
                      <span style={{ fontSize: 9, color: 'rgba(165,180,252,0.55)', fontWeight: 600 }}>×{count}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.20)', marginTop: 5 }}>
                Aeva uses these as example domains
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
