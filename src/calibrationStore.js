/**
 * calibrationStore.js
 * Persists per-subject calibration results + full history (Phase 5).
 */
import { create } from 'zustand'
import { CALIBRATION_MAP, SUBJECT_LABELS } from './calibrationMap'

const KEY = 'aeva_calibration_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }

export const useCalibrationStore = create((set, get) => ({
  // Latest result per subject
  results: load()?.results || {},

  // Full history per subject — array of timestamped results (max 20 per subject, Phase 5)
  history: load()?.history || {},

  saveResult: (subject, result) => {
    set(s => {
      const stamped  = { ...result, calibratedAt: Date.now() }
      const nextRes  = { ...s.results, [subject]: stamped }

      // Append to history, keep last 20 entries per subject
      const prevHist = s.history[subject] || []
      const nextHist = { ...s.history, [subject]: [...prevHist, stamped].slice(-20) }

      save({ results: nextRes, history: nextHist })
      return { results: nextRes, history: nextHist }
    })
  },

  getResult:  (subject) => get().results[subject] || null,
  getHistory: (subject) => get().history[subject] || [],

  clearResult: (subject) => {
    set(s => {
      const next = { ...s.results }
      delete next[subject]
      save({ results: next, history: s.history })
      return { results: next }
    })
  },

  hasAnyCalibration: () => Object.keys(get().results).length > 0,

  /**
   * Build a calibration profile block to inject into Aeva's system prompt.
   * activeSubject — if provided, only injects that subject's result.
   * Returns empty string if no calibration results exist.
   */
  buildCalibBlock: (activeSubject = null) => {
    const results = get().results
    if (!Object.keys(results).length) return ''

    const subjectsToShow = activeSubject && results[activeSubject]
      ? [activeSubject]
      : Object.keys(results)

    const summaryLines = []
    const directives   = []

    for (const subject of subjectsToShow) {
      const result = results[subject]
      if (!result) continue
      const subjectMap = CALIBRATION_MAP[subject] || {}
      const label      = SUBJECT_LABELS[subject]  || subject

      const solid   = Object.entries(result.skillMap || {}).filter(([, u]) => u === 'solid'   || u === 'mastery').map(([id]) => subjectMap[id]?.label || id)
      const partial = Object.entries(result.skillMap || {}).filter(([, u]) => u === 'partial').map(([id]) => subjectMap[id]?.label || id)
      const gaps    = Object.entries(result.skillMap || {}).filter(([, u]) => u === 'none').map(([id]) => subjectMap[id]?.label || id)
      const nextTopicLabel = result.nextTopic ? (subjectMap[result.nextTopic]?.label || result.nextTopic) : null

      let block = `  [${label} — ${result.band || 'Unknown level'}, ${result.questionsAsked || '?'} questions]`
      if (solid.length)   block += `\n    ✓ Solid: ${solid.join(', ')}`
      if (partial.length) block += `\n    ≈ Partial: ${partial.join(', ')}`
      if (gaps.length)    block += `\n    ✗ Gaps: ${gaps.join(', ')}`
      if (nextTopicLabel) block += `\n    → Recommended next: ${nextTopicLabel}`
      summaryLines.push(block)

      if (result.band)    directives.push(`▸ Pitch ${label} at ${result.band} level — assume this baseline, don't over-explain basics they've already demonstrated.`)
      if (solid.length)   directives.push(`▸ ${label} solid skills: ${solid.join(', ')} — treat as established knowledge. Skip definitions. Jump straight to application or depth.`)
      if (gaps.length)    directives.push(`▸ ${label} known gaps: ${gaps.join(', ')} — watch for misconceptions here. If any come up, slow down, try a fresh angle, probe gently.`)
      if (nextTopicLabel) directives.push(`▸ If asked what to study next in ${label}, recommend: ${nextTopicLabel}.`)
    }

    if (!summaryLines.length) return ''

    return `
┌── CALIBRATION PROFILE — diagnostic results ────────────────────────────────┐
${summaryLines.join('\n')}
└─────────────────────────────────────────────────────────────────────────────┘
CALIBRATION DIRECTIVES — act on these every session:
${directives.join('\n')}

`
  },
}))
