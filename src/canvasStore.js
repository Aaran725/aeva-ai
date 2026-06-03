import { create } from 'zustand'

let _hintTimer = null

export const useCanvasStore = create((set, get) => ({
  canvasOpen:    false,
  currentCanvas: null,   // { topic, blocks, ctx }

  // ── Learning state ──────────────────────────────────────────────────────
  mastery:      0,        // 0–100, earned this session
  interactions: 0,        // total student actions this session
  aevaHint:     null,     // { text, type: 'guide'|'praise'|'nudge' } or null

  // ── Actions ─────────────────────────────────────────────────────────────
  openCanvas:  () => set({ canvasOpen: true }),
  closeCanvas: () => set({ canvasOpen: false }),

  setCanvas: (canvas) => set({
    currentCanvas: { ...canvas, ctx: canvas.ctx || {} },
    canvasOpen:    true,
    mastery:       0,
    interactions:  0,
    aevaHint:      null,
  }),

  // Merge a param patch into the shared ctx — every block re-reads this
  updateCtx: (patch) => set(s => ({
    currentCanvas: s.currentCanvas
      ? { ...s.currentCanvas, ctx: { ...s.currentCanvas.ctx, ...patch } }
      : null,
    interactions: s.interactions + 1,
  })),

  // Mastery delta (+/-) clamped to 0-100
  updateMastery: (delta) => set(s => ({
    mastery: Math.max(0, Math.min(100, s.mastery + delta)),
  })),

  // Show a hint strip — auto-dismisses after 7 s
  setAevaHint: (hint) => {
    if (_hintTimer) clearTimeout(_hintTimer)
    set({ aevaHint: hint })
    _hintTimer = setTimeout(() => {
      // Only clear if the hint hasn't been replaced
      if (get().aevaHint === hint) set({ aevaHint: null })
    }, 7000)
  },

  dismissHint: () => {
    if (_hintTimer) clearTimeout(_hintTimer)
    set({ aevaHint: null })
  },

  clearCanvas: () => {
    if (_hintTimer) clearTimeout(_hintTimer)
    set({ currentCanvas: null, canvasOpen: false, mastery: 0, interactions: 0, aevaHint: null })
  },
}))
