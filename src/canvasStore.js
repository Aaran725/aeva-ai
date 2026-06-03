import { create } from 'zustand'

export const useCanvasStore = create((set) => ({
  canvasOpen:    false,
  currentCanvas: null,  // { topic, blocks: [...], ctx: {} }

  openCanvas:  () => set({ canvasOpen: true }),
  closeCanvas: () => set({ canvasOpen: false }),

  // setCanvas also opens the panel immediately
  setCanvas: (canvas) => set({
    currentCanvas: { ...canvas, ctx: canvas.ctx || {} },
    canvasOpen: true,
  }),

  // Merge a patch into the shared context — triggers re-render across all blocks
  updateCtx: (patch) => set(s => ({
    currentCanvas: s.currentCanvas
      ? { ...s.currentCanvas, ctx: { ...s.currentCanvas.ctx, ...patch } }
      : null,
  })),

  clearCanvas: () => set({ currentCanvas: null, canvasOpen: false }),
}))
