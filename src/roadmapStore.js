import { create } from 'zustand'
import { scheduleSave } from './syncService'

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
          let nodes = r.nodes.map(n => n.id === nodeId ? { ...n, status: 'complete' } : n)
          nodes = recalc(nodes)
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
          const readiness = Math.round(nodes.filter(n => n.status === 'complete').length / Math.max(nodes.length, 1) * 100)
          return { ...r, nodes, readiness }
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
          const readiness = Math.round(nodes.filter(n => n.status === 'complete').length / Math.max(nodes.length, 1) * 100)
          return { ...r, nodes: recalc(nodes), crunchMode: true, readiness }
        })
        const u = { ...s, roadmaps }; save(u); return u
      })
    },
  }
})
