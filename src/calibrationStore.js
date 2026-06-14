/**
 * calibrationStore.js
 * Persists per-subject calibration results.
 */
import { create } from 'zustand'

const KEY = 'aeva_calibration_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }

export const useCalibrationStore = create((set, get) => ({
  // { [subject]: { level, band, calibratedAt, strengths, gaps, notYet, nextTopic, skillMap } }
  results: load()?.results || {},

  saveResult: (subject, result) => {
    set(s => {
      const next = { ...s.results, [subject]: { ...result, calibratedAt: Date.now() } }
      save({ results: next })
      return { results: next }
    })
  },

  getResult: (subject) => get().results[subject] || null,

  clearResult: (subject) => {
    set(s => {
      const next = { ...s.results }
      delete next[subject]
      save({ results: next })
      return { results: next }
    })
  },

  hasAnyCalibration: () => Object.keys(get().results).length > 0,
}))
