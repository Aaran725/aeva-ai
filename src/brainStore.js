import { create } from 'zustand'

const KEY = 'aeva_brain_v2'
function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
function save(nodes) { try { localStorage.setItem(KEY, JSON.stringify(nodes)) } catch {} }

export const SUBJECT_COLORS = {
  Mathematics: { color: '#60A5FA', bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.30)' },
  Physics:     { color: '#A78BFA', bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.30)' },
  Chemistry:   { color: '#34D399', bg: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.30)' },
  Biology:     { color: '#4ADE80', bg: 'rgba(74,222,128,0.14)', border: 'rgba(74,222,128,0.30)' },
  History:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.30)' },
  Computing:   { color: '#38BDF8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.30)' },
  Economics:   { color: '#FB923C', bg: 'rgba(251,146,60,0.14)', border: 'rgba(251,146,60,0.30)' },
  Philosophy:  { color: '#E879F9', bg: 'rgba(232,121,249,0.14)', border: 'rgba(232,121,249,0.30)' },
  Languages:   { color: '#F472B6', bg: 'rgba(244,114,182,0.14)', border: 'rgba(244,114,182,0.30)' },
  General:     { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.30)' },
}

export function categorize(concept) {
  const c = concept.toLowerCase()
  if (/calculus|integral|derivative|algebra|geometry|matrix|vector|equation|polynomial|trigonometry|theorem|proof|prime|fraction|quadratic|logarithm|sequence|series/.test(c)) return 'Mathematics'
  if (/physics|force|energy|momentum|quantum|gravity|wave|particle|kinematics|thermodynamics|electromagnetism|optics|nuclear|velocity|acceleration/.test(c)) return 'Physics'
  if (/chemistry|molecule|atom|reaction|element|compound|bond|acid|base|oxidation|periodic|enzyme|catalyst|electron/.test(c)) return 'Chemistry'
  if (/biology|cell|gene|protein|evolution|dna|rna|organism|ecology|photosynthesis|mitosis|chromosome|species|ecosystem/.test(c)) return 'Biology'
  if (/history|war|revolution|empire|civilization|century|treaty|dynasty|colony|independence|ancient|medieval|renaissance|industrial/.test(c)) return 'History'
  if (/algorithm|function|class|variable|loop|array|programming|recursion|database|network|binary|sorting|complexity|javascript|python|react|api|server/.test(c)) return 'Computing'
  if (/economics|market|supply|demand|inflation|gdp|trade|currency|monopoly|fiscal|monetary|microeconomics|macroeconomics/.test(c)) return 'Economics'
  if (/philosophy|ethics|logic|consciousness|epistemology|metaphysics|existentialism|utilitarianism|dialectic|phenomenology/.test(c)) return 'Philosophy'
  if (/grammar|syntax|semantics|literature|writing|poetry|narrative|rhetoric|linguistics|phonetics|morphology/.test(c)) return 'Languages'
  return 'General'
}

export function masteryColor(mastery) {
  if (mastery >= 90) return '#4ADE80'
  if (mastery >= 75) return '#60A5FA'
  if (mastery >= 50) return '#F59E0B'
  if (mastery >= 25) return '#F97316'
  return '#F87171'
}

export function masteryLabel(mastery) {
  if (mastery >= 90) return 'Mastered'
  if (mastery >= 75) return 'Solid'
  if (mastery >= 50) return 'Learning'
  if (mastery >= 25) return 'Partial'
  return 'New'
}

// Cluster positions (% of container width/height)
export const CLUSTER_POSITIONS = {
  Mathematics: { x: 16, y: 20 },
  Physics:     { x: 70, y: 16 },
  Computing:   { x: 44, y: 46 },
  History:     { x: 12, y: 64 },
  Biology:     { x: 74, y: 60 },
  Chemistry:   { x: 82, y: 34 },
  Economics:   { x: 54, y: 74 },
  Philosophy:  { x: 28, y: 42 },
  Languages:   { x: 62, y: 28 },
  General:     { x: 38, y: 28 },
}

export const useBrainStore = create((set, get) => {
  const stored = load()
  return {
    nodes: stored?.nodes || [],

    addConcept: ({ concept, definition = '', mastery = 10, source = 'topic' }) => {
      if (!concept || concept.length < 2) return
      const GREETING_WORDS = new Set(['hello','hi','hey','hiya','sup','yo','greetings','thanks','thank','bye','ok','okay','sure','yes','no','cool','nice','great','wow','lol'])
      const norm = concept.toLowerCase().trim()
      if (GREETING_WORDS.has(norm)) return
      if (norm.split(' ').every(w => GREETING_WORDS.has(w))) return

      set(state => {
        const existing = state.nodes.find(n => n.concept === norm)
        let nodes
        if (existing) {
          nodes = state.nodes.map(n => n.concept === norm
            ? { ...n, mastery: Math.max(n.mastery, mastery), lastSeen: Date.now(), visits: n.visits + 1, definition: definition || n.definition }
            : n
          )
        } else {
          nodes = [...state.nodes, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            concept: norm,
            definition,
            subject: categorize(norm),
            mastery,
            connections: [],
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            visits: 1,
            source,
          }]
        }
        save({ nodes })
        return { nodes }
      })
    },

    updateMastery: (concept, mastery) => {
      const norm = concept.toLowerCase().trim()
      set(state => {
        const nodes = state.nodes.map(n => n.concept === norm ? { ...n, mastery, lastSeen: Date.now() } : n)
        save({ nodes })
        return { nodes }
      })
    },

    linkConcepts: (a, b) => {
      const na = a.toLowerCase().trim()
      const nb = b.toLowerCase().trim()
      if (na === nb) return
      set(state => {
        const nodes = state.nodes.map(n => {
          if (n.concept === na && !n.connections.includes(nb)) return { ...n, connections: [...n.connections, nb].slice(-8) }
          if (n.concept === nb && !n.connections.includes(na)) return { ...n, connections: [...n.connections, na].slice(-8) }
          return n
        })
        save({ nodes })
        return { nodes }
      })
    },

    getStats: () => {
      const { nodes } = get()
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000
      return {
        total: nodes.length,
        mastered: nodes.filter(n => n.mastery >= 75).length,
        subjects: new Set(nodes.map(n => n.subject)).size,
        thisWeek: nodes.filter(n => n.lastSeen > week).length,
      }
    },
  }
})
