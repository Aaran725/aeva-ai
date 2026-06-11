/**
 * examStore — Exam Simulation Mode state
 *
 * Phases:
 *   idle    → nothing open
 *   setup   → setup modal open (pick roadmap, timer, question count)
 *   active  → exam hall running (timer ticking, Aeva hidden)
 *   scoring → submitted, waiting for Groq to score answers
 *   results → scored, showing grade prediction + mark breakdown
 *
 * Timer ticks are driven by ExamSimulator.jsx (always-mounted interval).
 * Call tick() every second while phase === 'active'.
 */
import { create } from 'zustand'
import { useRoadmapStore, calcGrade, GRADE_THRESHOLDS } from './roadmapStore'

/* ── Persist helpers ──────────────────────────────────────────────────────── */
const KEY = 'aeva_exam_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
const save = (s) => {
  try {
    // Only persist results history, not active exam state (don't resume mid-exam after refresh)
    localStorage.setItem(KEY, JSON.stringify({ examHistory: s.examHistory }))
  } catch {}
}

/* ── Grade prediction ─────────────────────────────────────────────────────── */
/**
 * Given a roadmap, compute a predicted grade band.
 * - Uses readiness (node completion) as baseline
 * - Blends with recent exam scores (last 3) when available
 * - Confidence interval widens with more days left until exam
 *
 * Returns { central, low, high, grade, gradeLow, gradeHigh, spread }
 */
export function predictGrade(roadmap) {
  if (!roadmap) return null

  const readiness   = roadmap.readiness || 0
  const recentExams = (roadmap.examHistory || []).slice(-3)
  const examAvg     = recentExams.length
    ? Math.round(recentExams.reduce((s, e) => s + (e.pct || 0), 0) / recentExams.length)
    : null

  // Blend: 50/50 readiness vs exam perf when we have exam data; 100% readiness otherwise
  const central = examAvg !== null
    ? Math.round(readiness * 0.5 + examAvg * 0.5)
    : readiness

  // Confidence interval: ±3–12 points, shrinking as exam date approaches
  const daysLeft = roadmap.examDate
    ? Math.max(0, Math.ceil((new Date(roadmap.examDate) - Date.now()) / 86400000))
    : 30
  const spread = Math.min(12, Math.max(3, Math.round(daysLeft / 8)))

  const low  = Math.max(0,   central - spread)
  const high = Math.min(100, central + spread)

  return {
    central,
    low,
    high,
    spread,
    grade:      calcGrade(central).grade,
    gradeLow:   calcGrade(low).grade,
    gradeHigh:  calcGrade(high).grade,
    color:      calcGrade(central).color,
    daysLeft,
    examAvg,
    readiness,
  }
}

/* ── "Costing you marks" ──────────────────────────────────────────────────── */
/**
 * Given per-topic scores (0–100) and total marks in the paper,
 * return the top 2 topics that are costing the most marks.
 *
 * topicScores: { [topic: string]: number }   e.g. { 'Integration': 42, 'Vectors': 78 }
 * totalMarks:  number                        e.g. 60
 */
export function calcMarkLoss(topicScores, totalMarks = 60) {
  const topics = Object.entries(topicScores)
  if (!topics.length) return []

  const marksPerTopic = totalMarks / topics.length

  return topics
    .filter(([, score]) => score < 65)          // below 65% is a weak topic
    .map(([topic, score]) => ({
      topic,
      score,
      markLoss: Math.round(((65 - score) / 100) * marksPerTopic),
    }))
    .sort((a, b) => b.markLoss - a.markLoss)
    .slice(0, 2)
}

/* ── Store ────────────────────────────────────────────────────────────────── */
const stored = load()

export const useExamStore = create((set, get) => ({
  /* ── Phase ── */
  phase: 'idle',   // 'idle' | 'setup' | 'active' | 'scoring' | 'results'

  /* ── Setup options (chosen in setup modal) ── */
  selectedRoadmapId: null,
  timeLimit:    45 * 60,   // seconds (default 45 min)
  questionCount: 10,        // how many questions to generate

  /* ── Active exam ── */
  questions:  [],    // [{ id, topic, nodeId, question, type, options?, markScheme, marks }]
  answers:    {},    // { [questionId]: string }
  timeLeft:   45 * 60,
  startedAt:  null,
  submittedAt: null,

  /* ── Post-exam results ── */
  scores:       {},   // { [questionId]: number 0–100 }
  topicScores:  {},   // { [topic]: avgScore }
  totalMarks:   0,
  earnedMarks:  0,
  pct:          0,    // 0–100
  prediction:   null, // predictGrade() output
  markLoss:     [],   // calcMarkLoss() output

  /* ── Loading flags ── */
  isGenerating: false,   // Groq generating questions
  isScoring:    false,   // Groq scoring answers

  /* ── Persisted history (across sessions) ── */
  examHistory: stored?.examHistory || [],  // [{ id, roadmapId, date, pct, grade, topicScores, timeLimit }]

  /* ════════════════════════════════════════════════
     SETUP / LIFECYCLE ACTIONS
  ════════════════════════════════════════════════ */

  /** Open the setup modal, pre-selecting a roadmap */
  openSetup: (roadmapId = null) => set({
    phase: 'setup',
    selectedRoadmapId: roadmapId,
  }),

  /** Close without starting */
  closeSetup: () => set({ phase: 'idle' }),

  /** Update setup options */
  setSetupOptions: (opts) => set(s => ({
    selectedRoadmapId: opts.roadmapId    ?? s.selectedRoadmapId,
    timeLimit:         opts.timeLimit    ?? s.timeLimit,
    questionCount:     opts.questionCount ?? s.questionCount,
  })),

  /* ════════════════════════════════════════════════
     QUESTION GENERATION
  ════════════════════════════════════════════════ */

  setGenerating: (v) => set({ isGenerating: v }),

  /** Called by ExamSimulator once Groq returns questions */
  setQuestions: (questions) => {
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 5), 0)
    set({
      questions,
      answers:      Object.fromEntries(questions.map(q => [q.id, ''])),
      totalMarks,
      isGenerating: false,
    })
  },

  /* ════════════════════════════════════════════════
     ACTIVE EXAM
  ════════════════════════════════════════════════ */

  /** Transition from setup → active (call after setQuestions) */
  startExam: () => set(s => ({
    phase:     'active',
    timeLeft:  s.timeLimit,
    startedAt: Date.now(),
    submittedAt: null,
    scores:      {},
    topicScores: {},
    earnedMarks: 0,
    pct:         0,
    prediction:  null,
    markLoss:    [],
  })),

  /** Update a single answer */
  setAnswer: (questionId, text) => set(s => ({
    answers: { ...s.answers, [questionId]: text },
  })),

  /**
   * Called every second by the interval in ExamSimulator.
   * Returns true when time runs out (so caller can auto-submit).
   */
  tick: () => {
    const { phase, timeLeft } = get()
    if (phase !== 'active') return false
    if (timeLeft > 1) {
      set({ timeLeft: timeLeft - 1 })
      return false
    }
    // Time's up — auto-submit
    set({ timeLeft: 0 })
    return true
  },

  /** Student hits Submit (or auto-submit on timeout) */
  submitExam: () => set({
    phase:       'scoring',
    submittedAt: Date.now(),
    isScoring:   true,
  }),

  /* ════════════════════════════════════════════════
     SCORING
  ════════════════════════════════════════════════ */

  /**
   * Called by ExamSimulator after Groq scores every answer.
   * scores: { [questionId]: number 0–100 }
   */
  setScores: (scores) => {
    const { questions, totalMarks, selectedRoadmapId } = get()
    if (!questions.length) return

    // Per-question earned marks
    let earned = 0
    questions.forEach(q => {
      const pct100 = scores[q.id] ?? 0
      earned += (pct100 / 100) * (q.marks || 5)
    })
    earned = Math.round(earned)

    const pct = totalMarks > 0 ? Math.round((earned / totalMarks) * 100) : 0

    // Per-topic average scores
    const topicBuckets = {}
    questions.forEach(q => {
      if (!topicBuckets[q.topic]) topicBuckets[q.topic] = []
      topicBuckets[q.topic].push(scores[q.id] ?? 0)
    })
    const topicScores = Object.fromEntries(
      Object.entries(topicBuckets).map(([t, arr]) => [
        t,
        Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
      ])
    )

    // Mark-loss breakdown
    const markLoss = calcMarkLoss(topicScores, totalMarks)

    // Grade prediction — read roadmap from roadmapStore
    const roadmap = useRoadmapStore.getState().roadmaps.find(r => r.id === selectedRoadmapId)
    const prediction = roadmap ? predictGrade({ ...roadmap, examHistory: [...(roadmap.examHistory || []), { pct }] }) : null

    set({
      phase: 'results',
      isScoring: false,
      scores,
      topicScores,
      earnedMarks: earned,
      pct,
      prediction,
      markLoss,
    })
  },

  /* ════════════════════════════════════════════════
     SAVE RESULT TO ROADMAP + LOCAL HISTORY
  ════════════════════════════════════════════════ */

  /**
   * Persists the exam result into:
   *  1. roadmapStore (roadmap.examHistory[])
   *  2. local examHistory[] in this store (for cross-roadmap history)
   */
  saveResult: () => {
    const s = get()
    if (s.phase !== 'results') return

    const entry = {
      id:          `ex_${Date.now()}`,
      roadmapId:   s.selectedRoadmapId,
      date:        new Date().toISOString(),
      pct:         s.pct,
      earnedMarks: s.earnedMarks,
      totalMarks:  s.totalMarks,
      grade:       s.prediction?.grade || calcGrade(s.pct).grade,
      topicScores: s.topicScores,
      timeLimit:   s.timeLimit,
      questionCount: s.questions.length,
    }

    // 1. Push to roadmapStore so readiness/grade blending picks it up
    useRoadmapStore.getState().saveExamResult(s.selectedRoadmapId, entry)

    // 2. Keep in local history
    set(prev => {
      const examHistory = [...prev.examHistory.slice(-49), entry]  // keep last 50
      const next = { ...prev, examHistory }
      save(next)
      return next
    })
  },

  /* ════════════════════════════════════════════════
     RESET
  ════════════════════════════════════════════════ */

  /** Return to idle, preserving history */
  reset: () => set({
    phase:        'idle',
    questions:    [],
    answers:      {},
    scores:       {},
    topicScores:  {},
    earnedMarks:  0,
    pct:          0,
    prediction:   null,
    markLoss:     [],
    startedAt:    null,
    submittedAt:  null,
    isGenerating: false,
    isScoring:    false,
  }),
}))
