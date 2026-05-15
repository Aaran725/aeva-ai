import { create } from 'zustand'

const HISTORY_KEY = 'aeva_drill_history_v1'
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-50))) } catch {} // keep last 50
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
}

export const DIFFICULTIES = {
  beginner:     { label: 'Beginner',     color: '#4ADE80', instruction: 'Focus on core definitions and basic understanding. No jargon. Short, clear answers.' },
  intermediate: { label: 'Intermediate', color: '#60A5FA', instruction: 'Mix foundational and applied questions. Assume basic familiarity with the topic.' },
  advanced:     { label: 'Advanced',     color: '#FBBF24', instruction: 'Focus on nuance, edge cases, and connections between concepts. Challenging distractors.' },
  expert:       { label: 'Expert',       color: '#F87171', instruction: 'Challenge assumptions. Include counter-examples, advanced implications, and synthesis questions.' },
}

export const useLabStore = create((set, get) => ({
  labOpen: false,
  activeDrill: null,
  currentTopic: '',
  drillData: null,
  drillLoading: false,
  drillScore: null,
  labSuggestion: null,

  // Customization
  difficulty: 'intermediate',
  questionCount: 8,
  focusMode: 'mixed',     // 'theory' | 'application' | 'mixed'

  // History (persisted)
  drillHistory: loadHistory(),  // [{ topic, drillType, difficulty, pct, date, correct, total }]

  openLab:  () => set({ labOpen: true }),
  closeLab: () => set({ labOpen: false }),

  startDrill: (drillId, topic) => set({ activeDrill: drillId, currentTopic: topic, drillData: null, drillScore: null, drillLoading: true }),
  exitDrill:  () => set({ activeDrill: null, drillData: null, drillScore: null, drillLoading: false }),

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
    const updated = [...get().drillHistory, entry]
    saveHistory(updated)
    set({ drillHistory: updated })
  },

  setLabSuggestion: (s) => set({ labSuggestion: s }),
  clearSuggestion:  ()  => set({ labSuggestion: null }),

  getPersonalBest: (topic, drillType) => {
    const relevant = get().drillHistory.filter(h => h.topic.toLowerCase() === topic.toLowerCase() && h.drillType === drillType)
    return relevant.length > 0 ? Math.max(...relevant.map(h => h.pct)) : null
  },
}))
