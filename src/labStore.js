import { create } from 'zustand'

export const DRILLS = {
  flashcard: {
    id: 'flashcard',
    emoji: '⚡',
    title: 'Flashcard Sprint',
    tagline: 'Speed-run your core concepts.',
    duration: '5 min',
    color: '#3B82F6',
    colorDim: 'rgba(59,130,246,0.14)',
    border: 'rgba(59,130,246,0.32)',
    glow: 'rgba(59,130,246,0.22)',
  },
  mocktest: {
    id: 'mocktest',
    emoji: '🎯',
    title: 'Mock Test',
    tagline: 'The final boss before the simulation.',
    duration: '10 min',
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.14)',
    border: 'rgba(6,182,212,0.32)',
    glow: 'rgba(6,182,212,0.22)',
  },
  match: {
    id: 'match',
    emoji: '🔗',
    title: 'Match Grid',
    tagline: 'Connect the dots.',
    duration: '3 min',
    color: '#8B5CF6',
    colorDim: 'rgba(139,92,246,0.14)',
    border: 'rgba(139,92,246,0.32)',
    glow: 'rgba(139,92,246,0.22)',
  },
}

export const useLabStore = create((set) => ({
  labOpen: false,
  activeDrill: null,       // null | 'flashcard' | 'mocktest' | 'match'
  currentTopic: '',
  drillData: null,         // generated content
  drillLoading: false,
  drillScore: null,        // { correct, total }
  labSuggestion: null,     // { topic, drillType, reason } — set by Arcade

  openLab: ()           => set({ labOpen: true }),
  closeLab: ()          => set({ labOpen: false }),

  startDrill: (drillId, topic) => set({
    activeDrill: drillId,
    currentTopic: topic,
    drillData: null,
    drillScore: null,
    drillLoading: true,
  }),

  exitDrill: () => set({ activeDrill: null, drillData: null, drillScore: null, drillLoading: false }),

  setDrillData:    (data)  => set({ drillData: data, drillLoading: false }),
  setDrillLoading: (v)     => set({ drillLoading: v }),
  setDrillScore:   (score) => set({ drillScore: score }),

  setLabSuggestion: (s) => set({ labSuggestion: s }),
  clearSuggestion:  ()  => set({ labSuggestion: null }),
}))
