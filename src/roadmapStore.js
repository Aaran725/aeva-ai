import { create } from 'zustand'
import { scheduleSave } from './syncService'
import { useScheduleStore, dateKey } from './scheduleStore'

const KEY = 'aeva_roadmaps_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
const save = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify({ roadmaps: s.roadmaps, activeRoadmapId: s.activeRoadmapId })) } catch {}
  scheduleSave('roadmaps', s.roadmaps)
  scheduleSave('active_roadmap_id', s.activeRoadmapId)
}
const uid  = () => Math.random().toString(36).slice(2, 10)

const DEFAULT = { roadmaps: [], activeRoadmapId: null, roadmapOpen: false, activeNodeSession: null }

// Re-compute unlock chain after any node mutation
function recalc(nodes) {
  const out = [...nodes]
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].status === 'complete' && out[i + 1].status === 'locked') {
      out[i + 1] = { ...out[i + 1], status: 'available' }
    }
  }
  return out
}

// Readiness: solid nodes = 100%, shaky nodes = 60%
function calcReadiness(nodes) {
  const total = nodes.length
  if (!total) return 0
  const solid = nodes.filter(n => n.status === 'complete' && n.confidence !== 'shaky').length
  const shaky = nodes.filter(n => n.status === 'complete' && n.confidence === 'shaky').length
  return Math.round((solid * 1.0 + shaky * 0.6) / total * 100)
}

// Map readiness % + optional drill avg → letter grade
// drillAvg: 0-100 from recent drill sessions (optional, defaults to readiness)
export const GRADE_THRESHOLDS = [
  { grade: 'A*', min: 90, color: '#A78BFA', glow: 'rgba(167,139,250,0.35)' },
  { grade: 'A',  min: 78, color: '#818CF8', glow: 'rgba(129,140,248,0.30)' },
  { grade: 'B',  min: 62, color: '#34D399', glow: 'rgba(52,211,153,0.30)' },
  { grade: 'C',  min: 47, color: '#60A5FA', glow: 'rgba(96,165,250,0.28)' },
  { grade: 'D',  min: 33, color: '#FBBF24', glow: 'rgba(251,191,36,0.28)' },
  { grade: 'E',  min: 20, color: '#FB923C', glow: 'rgba(251,146,60,0.28)' },
  { grade: 'U',  min: 0,  color: '#F87171', glow: 'rgba(248,113,113,0.25)' },
]

export function calcGrade(readiness, drillAvg = null) {
  // Blend readiness (70%) with drill performance (30%) when drill data exists
  const score = drillAvg !== null
    ? Math.round(readiness * 0.7 + drillAvg * 0.3)
    : readiness
  return GRADE_THRESHOLDS.find(t => score >= t.min) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
}

// What does the student need to reach the next grade?
export function gradeGapMessage(currentGrade, targetGrade, readiness, weakTopics = []) {
  const grades = GRADE_THRESHOLDS.map(t => t.grade)
  const currentIdx = grades.indexOf(currentGrade)
  const targetIdx  = grades.indexOf(targetGrade)
  if (currentIdx <= targetIdx) return null // already at or above target

  const next = GRADE_THRESHOLDS[currentIdx - 1] // one grade up
  const needed = next.min - readiness
  if (needed <= 0) return `You're on the boundary of ${next.grade} — nail your weak topics to push through.`
  const weakMsg = weakTopics.length ? ` Focus on: ${weakTopics.slice(0, 3).join(', ')}.` : ''
  return `You need ~${needed}% more readiness to reach grade ${next.grade}.${weakMsg}`
}

// Record a grade snapshot (called when readiness updates)
export function snapshotGrade(gradeHistory = [], grade) {
  const today = new Date().toDateString()
  const last  = gradeHistory[gradeHistory.length - 1]
  if (last?.date === today && last?.grade === grade) return gradeHistory // no change today
  return [...gradeHistory.slice(-29), { date: today, grade }] // keep 30 days
}

export const useRoadmapStore = create((set, get) => {
  const stored = load()
  return {
    ...DEFAULT,
    ...(stored || {}),
    roadmapOpen: false,

    openRoadmapHub:  () => set({ roadmapOpen: true }),
    closeRoadmapHub: () => set({ roadmapOpen: false }),

    createRoadmap: (data) => {
      const id = `rm_${uid()}`
      const roadmap = { id, ...data, createdAt: Date.now(), readiness: 0 }
      set(s => { const u = { ...s, roadmaps: [...s.roadmaps, roadmap], activeRoadmapId: id }; save(u); return u })
      return id
    },

    updateRoadmap: (id, patch) => {
      set(s => { const u = { ...s, roadmaps: s.roadmaps.map(r => r.id === id ? { ...r, ...patch } : r) }; save(u); return u })
    },

    /**
     * Save an exam simulation result into roadmap.examHistory[].
     * Also updates the blended readiness score so grade prediction improves
     * with real performance data.
     * entry: { id, date, pct, earnedMarks, totalMarks, grade, topicScores, ... }
     */
    saveExamResult: (roadmapId, entry) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const examHistory = [...(r.examHistory || []).slice(-19), entry]  // keep last 20

          // Blend readiness with recent exam average (last 3 exams, 30% weight)
          const recent    = examHistory.slice(-3)
          const examAvg   = Math.round(recent.reduce((sum, e) => sum + (e.pct || 0), 0) / recent.length)
          const blended   = Math.round((r.readiness || 0) * 0.7 + examAvg * 0.3)
          const gradeObj  = calcGrade(blended)
          const gradeHistory = snapshotGrade(r.gradeHistory || [], gradeObj.grade)

          return { ...r, examHistory, readiness: blended, gradeHistory }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    // Record the student's actual exam result + compare to predicted grade
    setActualGrade: (roadmapId, actualGrade) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const predicted = calcGrade(r.readiness || 0).grade
          const record = { date: new Date().toISOString(), predicted, actual: actualGrade }
          const gradeAccuracy = [...(r.gradeAccuracy || []), record]
          return { ...r, actualGrade, gradeAccuracy }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    completeNode: (roadmapId, nodeId) => {
      get().completeNodeWithConfidence(roadmapId, nodeId, 'solid')
    },

    completeNodeWithConfidence: (roadmapId, nodeId, confidence = 'solid') => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          let nodes = r.nodes.map(n => n.id === nodeId ? { ...n, status: 'complete', confidence } : n)
          nodes = recalc(nodes)
          const readiness = calcReadiness(nodes)
          const gradeObj  = calcGrade(readiness)
          const gradeHistory = snapshotGrade(r.gradeHistory || [], gradeObj.grade)
          // If shaky, auto-add to weak areas
          const weakUpdate = confidence === 'shaky'
            ? { learningProfile: { ...(r.learningProfile || {}), weak: [...new Set([...(r.learningProfile?.weak || []), r.nodes.find(n => n.id === nodeId)?.topic || ''].filter(Boolean))] } }
            : {}
          return { ...r, nodes, readiness, gradeHistory, ...weakUpdate }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
      // Auto-mark the matching schedule item done for today
      useScheduleStore.getState().markDone(dateKey(new Date()), nodeId)
      // Notify study room if a session is active
      try {
        const { useStudyRoomStore } = require('./studyRoomStore')
        const { phase, onNodeCompleted } = useStudyRoomStore.getState()
        if (phase === 'session' || phase === 'battle') {
          const node = get().roadmaps.flatMap(r => r.nodes).find(n => n.id === nodeId)
          if (node) onNodeCompleted(node.topic || node.title || nodeId)
        }
      } catch (_) {}
    },

    setActive: (id) => { set(s => { const u = { ...s, activeRoadmapId: id }; save(u); return u }) },

    startNodeSession: (roadmapId, node) => set({
      activeNodeSession: {
        roadmapId,
        nodeId:           node.id,
        topic:            node.topic,
        type:             node.type,
        xp:               node.xp || 50,
        subtopics:        node.subtopics        || [],
        phase:            node.phase            || 'Core Topics',
        difficulty:       node.difficulty       || 2,
        estimatedMinutes: node.estimatedMinutes || 20,
        description:      node.description      || '',
      }
    }),
    endNodeSession: () => set({ activeNodeSession: null }),

    deleteRoadmap: (id) => {
      set(s => {
        const roadmaps = s.roadmaps.filter(r => r.id !== id)
        const activeRoadmapId = s.activeRoadmapId === id ? (roadmaps[0]?.id || null) : s.activeRoadmapId
        const u = { ...s, roadmaps, activeRoadmapId }; save(u); return u
      })
    },

    updateLearningProfile: (roadmapId, { weak, mastered, misconception }) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const lp = r.learningProfile || { mastered: [], weak: [], misconceptions: [] }
          return {
            ...r,
            learningProfile: {
              mastered:       mastered       ? [...new Set([...lp.mastered, mastered])]               : lp.mastered,
              weak:           weak           ? [...new Set([...lp.weak, weak])]                       : lp.weak,
              misconceptions: misconception  ? [...new Set([...lp.misconceptions, misconception])]    : lp.misconceptions,
            },
          }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    setDailyMission: (roadmapId, mission) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r =>
          r.id === roadmapId ? { ...r, dailyMission: { ...mission, date: new Date().toDateString() } } : r
        )
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    getActive: () => {
      const s = get()
      return s.roadmaps.find(r => r.id === s.activeRoadmapId) || s.roadmaps[0] || null
    },

    // ── Aeva Change Log ──────────────────────────────────────────────────────
    logAevaAction: (roadmapId, entry) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const log = r.aevaLog || []
          return { ...r, aevaLog: [...log, { ...entry, timestamp: Date.now(), seen: false }].slice(-20) }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    markLogSeen: (roadmapId) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          return { ...r, aevaLog: (r.aevaLog || []).map(e => ({ ...e, seen: true })) }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    // ── Aeva Control Actions ─────────────────────────────────────────────────

    // Insert a new node right after a given node (or at front of locked queue if afterNodeId is null)
    injectNode: (roadmapId, nodeData, afterNodeId) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const newNode = {
            id: `n_inj_${uid()}`,
            status: 'locked',
            injectedByAeva: true,
            ...nodeData,
          }
          let nodes = [...r.nodes]
          const idx = afterNodeId ? nodes.findIndex(n => n.id === afterNodeId) : -1
          const insertAt = idx >= 0 ? idx + 1 : nodes.findIndex(n => n.status === 'locked')
          if (insertAt < 0) nodes.push(newNode)
          else nodes.splice(insertAt, 0, newNode)
          nodes = recalc(nodes)
          return { ...r, nodes }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    // Remove a node entirely — Aeva decided student doesn't need it
    skipNode: (roadmapId, nodeId, reason = '') => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          let nodes = r.nodes.filter(n => n.id !== nodeId)
          nodes = recalc(nodes)
          return { ...r, nodes, readiness: calcReadiness(nodes) }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    // Flag a node as urgent (shows badge, Aeva can move it up)
    flagNode: (roadmapId, nodeId, urgent = true) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const nodes = r.nodes.map(n => n.id === nodeId ? { ...n, urgent } : n)
          return { ...r, nodes }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    // Move nodes matching topic keywords to immediately after the current available node
    reprioritiseNodes: (roadmapId, topicKeywords) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const keywords = topicKeywords.map(k => k.toLowerCase())
          const availIdx = r.nodes.findIndex(n => n.status === 'available')
          if (availIdx < 0) return r

          const priority = []
          const rest = []
          r.nodes.forEach((n, i) => {
            if (i <= availIdx) return // don't touch done/available
            const matches = keywords.some(k => n.topic.toLowerCase().includes(k))
            if (matches && n.status === 'locked') priority.push(n)
            else rest.push(n)
          })

          const nodes = recalc([
            ...r.nodes.slice(0, availIdx + 1),
            ...priority,
            ...rest,
          ])
          return { ...r, nodes }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    // Crunch mode — delete non-essentials, keep only what matters
    crunchMode: (roadmapId) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          // Keep: complete, available, mock nodes, urgent nodes, one check per topic
          // Delete: all drills, duplicate learns, duplicate checks
          const seenTopicLearn = new Set()
          const seenTopicCheck = new Set()
          const nodes = r.nodes.filter(n => {
            if (n.status === 'complete' || n.status === 'available') return true
            if (n.urgent) return true
            if (n.type === 'mock') return true
            if (n.type === 'drill') return false  // delete all drills
            if (n.type === 'check') {
              if (seenTopicCheck.has(n.topic)) return false
              seenTopicCheck.add(n.topic); return true
            }
            if (n.type === 'learn') {
              if (seenTopicLearn.has(n.topic)) return false
              seenTopicLearn.add(n.topic); return true
            }
            return true
          })
          const recalced = recalc(nodes)
          return { ...r, nodes: recalced, crunchMode: true, readiness: calcReadiness(recalced) }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },
  }
})
