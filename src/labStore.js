import { create } from 'zustand'
import { scheduleSave } from './syncService'

const HISTORY_KEY = 'aeva_drill_history_v1'
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(h) {
  const trimmed = h.slice(-50)
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)) } catch {}
  scheduleSave('drill_history', trimmed)
}

const ORDERS_KEY = 'aeva_lab_orders_v1'
function loadOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]') } catch { return [] }
}
function saveOrders(orders) {
  const trimmed = orders.slice(0, 30)
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(trimmed)) } catch {}
  scheduleSave('lab_orders', trimmed)
}

export const DRILLS = {
  flashcard: {
    id: 'flashcard', emoji: '⚡', title: 'Flashcard Sprint',
    tagline: 'Speed-run your core concepts.',
    duration: '5 min', color: '#3B82F6',
    colorDim: 'rgba(59,130,246,0.14)', border: 'rgba(59,130,246,0.32)', glow: 'rgba(59,130,246,0.22)',
  },
  speedround: {
    id: 'speedround', emoji: '⏱', title: 'Speed Round',
    tagline: '15 seconds per card. No mercy.',
    duration: '3 min', color: '#F97316',
    colorDim: 'rgba(249,115,22,0.14)', border: 'rgba(249,115,22,0.32)', glow: 'rgba(249,115,22,0.22)',
  },
  mocktest: {
    id: 'mocktest', emoji: '🎯', title: 'Mock Test',
    tagline: 'The final boss before the simulation.',
    duration: '10 min', color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.14)', border: 'rgba(6,182,212,0.32)', glow: 'rgba(6,182,212,0.22)',
  },
  feynman: {
    id: 'feynman', emoji: '🧪', title: 'Feynman Test',
    tagline: 'Explain it simply. Aeva finds the gaps.',
    duration: '7 min', color: '#8B5CF6',
    colorDim: 'rgba(139,92,246,0.14)', border: 'rgba(139,92,246,0.32)', glow: 'rgba(139,92,246,0.22)',
  },
  match: {
    id: 'match', emoji: '🔗', title: 'Match Grid',
    tagline: 'Connect the dots.',
    duration: '3 min', color: '#EC4899',
    colorDim: 'rgba(236,72,153,0.14)', border: 'rgba(236,72,153,0.32)', glow: 'rgba(236,72,153,0.22)',
  },
  cloze: {
    id: 'cloze', emoji: '✍️', title: 'Fill the Gaps',
    tagline: 'Complete the passage from memory.',
    duration: '5 min', color: '#10B981',
    colorDim: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.32)', glow: 'rgba(16,185,129,0.22)',
  },
  shortanswer: {
    id: 'shortanswer', emoji: '🧩', title: 'Short Answer',
    tagline: 'Type it out. AI grades your depth.',
    duration: '8 min', color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.32)', glow: 'rgba(245,158,11,0.22)',
  },
  examPractice: {
    id: 'examPractice', emoji: '📝', title: 'Past Paper Practice',
    tagline: 'Real exam questions. AI-marked against mark scheme.',
    duration: '15–25 min', color: '#A78BFA',
    colorDim: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.32)', glow: 'rgba(167,139,250,0.22)',
  },
}

export const DIFFICULTIES = {
  beginner:     { label: 'Beginner',     color: '#4ADE80', instruction: 'Focus on core definitions and basic understanding. No jargon. Short, clear answers.' },
  intermediate: { label: 'Intermediate', color: '#60A5FA', instruction: 'Mix foundational and applied questions. Assume basic familiarity with the topic.' },
  advanced:     { label: 'Advanced',     color: '#FBBF24', instruction: 'Focus on nuance, edge cases, and connections between concepts. Challenging distractors.' },
  expert:       { label: 'Expert',       color: '#F87171', instruction: 'Challenge assumptions. Include counter-examples, advanced implications, and synthesis questions.' },
}

export const useLabStore = create((set, get) => ({
  labOpen: false,
  labTab: 'drill',  // 'drill' | 'orders' | 'stats'
  activeDrill: null,
  currentTopic: '',
  drillData: null,
  drillLoading: false,
  drillScore: null,
  labSuggestion: null,
  activeOrderId: null,   // set when a drill is launched from Aeva's Orders

  // Customization
  difficulty: 'intermediate',
  questionCount: 8,
  focusMode: 'mixed',     // 'theory' | 'application' | 'mixed'

  // History (persisted)
  drillHistory: loadHistory(),  // [{ topic, drillType, difficulty, pct, date, correct, total }]

  // Aeva's Orders (persisted)
  orders: loadOrders(),  // [{ id, topic, drillType, reason, urgency, assignedAt, completedAt, score }]

  openLab:  () => set({ labOpen: true }),
  closeLab: () => set({ labOpen: false }),

  pendingAutoStart: null, // { drillType, topic } — auto-fires a drill when Lab opens
  setPendingAutoStart: (drillType, topic) => set({ pendingAutoStart: { drillType, topic } }),
  clearPendingAutoStart: () => set({ pendingAutoStart: null }),

  startDrill: (drillId, topic) => set({ activeDrill: drillId, currentTopic: topic, drillData: null, drillScore: null, drillLoading: true }),
  exitDrill:  () => set({ activeDrill: null, drillData: null, drillScore: null, drillLoading: false, activeOrderId: null }),

  setDrillData:    (data)  => set({ drillData: data, drillLoading: false }),
  setDrillLoading: (v)     => set({ drillLoading: v }),
  setDrillScore:   (score) => set({ drillScore: score }),

  setDifficulty:    (d) => set({ difficulty: d }),
  setQuestionCount: (n) => set({ questionCount: n }),
  setFocusMode:     (m) => set({ focusMode: m }),

  recordDrillResult: ({ topic, drillType, correct, total }) => {
    const pct = Math.round((correct / total) * 100)
    const entry = {
      topic, drillType, correct, total, pct,
      difficulty: get().difficulty,
      date: Date.now(),
    }
    const updatedHistory = [...get().drillHistory, entry]
    saveHistory(updatedHistory)
    const stateUpdate = { drillHistory: updatedHistory }

    // Mark the sourcing order as complete if this drill was launched from Aeva's Orders
    const orderId = get().activeOrderId
    if (orderId) {
      const updatedOrders = get().orders.map(o =>
        o.id === orderId ? { ...o, completedAt: Date.now(), score: pct } : o
      )
      saveOrders(updatedOrders)
      stateUpdate.orders = updatedOrders
      stateUpdate.activeOrderId = null
    }

    set(stateUpdate)
    try { useXPStore.getState().addXP('DRILL_COMPLETE') } catch {}
  },

  setLabSuggestion: (s) => set({ labSuggestion: s }),
  clearSuggestion:  ()  => set({ labSuggestion: null }),

  // ── Aeva's Orders ────────────────────────────────────
  addOrder: ({ topic, drillType, reason, urgency = 'medium' }) => {
    if (!topic?.trim() || !drillType) return null
    const topicLower = topic.toLowerCase()
    const DAY = 24 * 60 * 60 * 1000

    // Don't create a duplicate pending order for same topic+drillType
    const existing = get().orders.find(o =>
      !o.completedAt &&
      o.topic.toLowerCase() === topicLower &&
      o.drillType === drillType
    )
    if (existing) return null

    // Don't re-assign a topic+drillType that was completed within the last 24 hours
    const recentlyDone = get().orders.find(o =>
      o.completedAt &&
      o.topic.toLowerCase() === topicLower &&
      o.drillType === drillType &&
      (Date.now() - o.completedAt) < DAY
    )
    if (recentlyDone) return null

    const order = {
      id: `order_${Date.now()}`,
      topic: topic.trim(),
      drillType,
      reason: reason || `Aeva detected you need to work on ${topic}.`,
      urgency,
      assignedAt: Date.now(),
      completedAt: null,
      score: null,
    }
    const updated = [order, ...get().orders].slice(0, 30)
    saveOrders(updated)
    set({ orders: updated })
    return order
  },

  dismissOrder: (id) => {
    const updated = get().orders.filter(o => o.id !== id)
    saveOrders(updated)
    set({ orders: updated })
  },

  markOrderComplete: (id, score) => {
    const updated = get().orders.map(o =>
      o.id === id ? { ...o, completedAt: Date.now(), score } : o
    )
    saveOrders(updated)
    set({ orders: updated })
  },

  setActiveOrderId: (id) => set({ activeOrderId: id }),

  setLabTab: (tab) => set({ labTab: tab }),

  clearOrders: () => {
    saveOrders([])
    set({ orders: [] })
  },

  getPersonalBest: (topic, drillType) => {
    const relevant = get().drillHistory.filter(h => h.topic.toLowerCase() === topic.toLowerCase() && h.drillType === drillType)
    return relevant.length > 0 ? Math.max(...relevant.map(h => h.pct)) : null
  },
}))
