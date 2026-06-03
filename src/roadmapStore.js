import { create } from 'zustand'

const KEY = 'aeva_roadmaps_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify({ roadmaps: s.roadmaps, activeRoadmapId: s.activeRoadmapId })) } catch {} }
const uid  = () => Math.random().toString(36).slice(2, 10)

const DEFAULT = { roadmaps: [], activeRoadmapId: null, roadmapOpen: false, activeNodeSession: null }

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

    completeNode: (roadmapId, nodeId) => {
      set(s => {
        const roadmaps = s.roadmaps.map(r => {
          if (r.id !== roadmapId) return r
          const nodes = r.nodes.map(n => n.id === nodeId ? { ...n, status: 'complete' } : n)
          const idx = nodes.findIndex(n => n.id === nodeId)
          if (idx >= 0 && idx < nodes.length - 1 && nodes[idx + 1].status === 'locked')
            nodes[idx + 1] = { ...nodes[idx + 1], status: 'available' }
          const readiness = Math.round(nodes.filter(n => n.status === 'complete').length / nodes.length * 100)
          return { ...r, nodes, readiness }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },

    setActive: (id) => { set(s => { const u = { ...s, activeRoadmapId: id }; save(u); return u }) },

    startNodeSession: (roadmapId, node) => set({
      activeNodeSession: { roadmapId, nodeId: node.id, topic: node.topic, type: node.type, xp: node.xp || 50 }
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
              mastered:      mastered    ? [...new Set([...lp.mastered, mastered])]           : lp.mastered,
              weak:          weak        ? [...new Set([...lp.weak, weak])]                   : lp.weak,
              misconceptions: misconception ? [...new Set([...lp.misconceptions, misconception])] : lp.misconceptions,
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
  }
})
