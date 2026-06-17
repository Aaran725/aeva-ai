import { create } from 'zustand'

const KEY = 'aeva_control_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify({ lockedFeatures: s.lockedFeatures, mandate: s.mandate, xpMultiplier: s.xpMultiplier })) } catch {} }

const DEFAULT = {
  lockedFeatures: {},       // { arcade: { reason, lockedAt } }
  mandate: null,            // { topic, goal, setAt }
  xpMultiplier: 1,
  activeIntervention: null, // { title, message, task, topic, triggeredAt }
  commandToast: null,       // { label, type, id } — shown briefly when Aeva fires a command
  pendingChatPrompt:   null,  // string — auto-sent to Aeva chat when set, cleared after send
  pendingChatOpen:     false, // true → App navigates to ChatView (for Lab launches from roadmap)
  pendingCalibSubject:  null,  // subject key → App navigates to chat, ChatView starts calibration
  pendingCalibLanguage: 'en',  // language chosen in CalibrationHub picker, read by ChatView effect
}

export const useAevaControlStore = create((set, get) => ({
  ...DEFAULT,
  ...(load() || {}),

  lockFeature: (feature, reason = '') => {
    set(s => {
      const updated = { ...s, lockedFeatures: { ...s.lockedFeatures, [feature]: { reason, lockedAt: Date.now() } } }
      save(updated)
      return updated
    })
  },

  unlockFeature: (feature) => {
    set(s => {
      const lf = { ...s.lockedFeatures }
      delete lf[feature]
      const updated = { ...s, lockedFeatures: lf }
      save(updated)
      return updated
    })
  },

  setMandate: (topic, goal) => {
    set(s => {
      const updated = { ...s, mandate: { topic, goal, setAt: Date.now() } }
      save(updated)
      return updated
    })
  },

  clearMandate: () => {
    set(s => {
      const updated = { ...s, mandate: null }
      save(updated)
      return updated
    })
  },

  setPendingChatPrompt: (text) => set({ pendingChatPrompt: text }),
  clearPendingChatPrompt: () => set({ pendingChatPrompt: null }),
  requestChatView: () => set({ pendingChatOpen: true }),
  clearChatView:   () => set({ pendingChatOpen: false }),

  // Calibration hub → ChatView bridge
  setPendingCalibSubject:   (subject) => set({ pendingCalibSubject: subject }),
  clearPendingCalibSubject: ()        => set({ pendingCalibSubject: null }),
  setPendingCalibLanguage:  (lang)    => set({ pendingCalibLanguage: lang }),

  showCommandToast: (label, type = 'action') => {
    set({ commandToast: { label, type, id: Date.now() } })
  },
  clearCommandToast: () => set({ commandToast: null }),

  isLocked: (feature) => !!get().lockedFeatures[feature],
  getLockReason: (feature) => get().lockedFeatures[feature]?.reason || '',

  triggerIntervention: (title, message, task = 'acknowledge', topic = '') => {
    set(s => {
      const updated = { ...s, activeIntervention: { title, message, task, topic, triggeredAt: Date.now() } }
      save(updated)
      return updated
    })
  },

  dismissIntervention: () => {
    set(s => {
      const updated = { ...s, activeIntervention: null }
      save(updated)
      return updated
    })
  },
}))
