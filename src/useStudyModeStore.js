/**
 * useStudyModeStore — global Pomodoro + Study With Me state.
 * Timer ticks are driven by StudyWithMe.jsx (always-mounted at root).
 */
import { create } from 'zustand'

export const useStudyModeStore = create((set, get) => ({
  isOpen:      false,   // panel / widget visible
  isRunning:   false,   // timer counting
  phase:       'idle',  // 'idle' | 'work' | 'break'
  timeLeft:    25 * 60,
  pomodoroCount: 0,

  // Settings
  workDuration:  25 * 60,
  breakDuration:  5 * 60,
  isMusicOn:   false,
  volume:      70,
  subjectLabel: null,   // free-text label for the session

  // Break question
  breakQuestion:      null,
  breakAnswerFeedback: null,
  isGeneratingQ:      false,
  isCheckingAnswer:   false,

  /* ── Actions ─────────────────────────────────────────────── */
  open:  () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  startSession: (opts = {}) => set(s => ({
    isRunning:    true,
    phase:        'work',
    timeLeft:     opts.workDuration  ?? s.workDuration,
    workDuration: opts.workDuration  ?? s.workDuration,
    breakDuration:opts.breakDuration ?? s.breakDuration,
    subjectLabel: opts.subjectLabel  ?? s.subjectLabel,
    pomodoroCount: 0,
    breakQuestion: null,
    breakAnswerFeedback: null,
    isOpen: true,
  })),

  stopSession: () => set({
    isRunning: false, phase: 'idle',
    breakQuestion: null, breakAnswerFeedback: null,
  }),

  togglePause: () => set(s => ({ isRunning: !s.isRunning })),

  /** Called every second by the interval in StudyWithMe */
  tick: () => {
    const s = get()
    if (!s.isRunning || s.phase === 'idle') return null

    if (s.timeLeft > 1) {
      set({ timeLeft: s.timeLeft - 1 })
      return null
    }
    // Phase just ended
    return s.phase  // return 'work' or 'break' so caller can react
  },

  enterBreak: () => set(s => ({
    phase: 'break',
    timeLeft: s.breakDuration,
    isRunning: true,
    pomodoroCount: s.pomodoroCount + 1,
  })),

  enterWork: () => set(s => ({
    phase: 'work',
    timeLeft: s.workDuration,
    isRunning: true,
    breakQuestion: null,
    breakAnswerFeedback: null,
  })),

  setMusicOn:  (v) => set({ isMusicOn: v }),
  setVolume:   (v) => set({ volume: v }),

  setBreakQuestion:      (q) => set({ breakQuestion: q, isGeneratingQ: false }),
  setGeneratingQ:        (v) => set({ isGeneratingQ: v }),
  setBreakAnswerFeedback:(f) => set({ breakAnswerFeedback: f, isCheckingAnswer: false }),
  setCheckingAnswer:     (v) => set({ isCheckingAnswer: v }),
  clearBreakAnswer:      ()  => set({ breakAnswerFeedback: null }),
}))
