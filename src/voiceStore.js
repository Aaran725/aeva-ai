import { create } from 'zustand'

const KEY = 'aeva_voice_enabled'

export const useVoiceStore = create((set, get) => ({
  voiceEnabled: (() => { try { return localStorage.getItem(KEY) === 'true' } catch { return false } })(),
  isSpeaking: false,
  currentAudio: null,
  // Set to true while VoiceMode overlay is open — bypasses voiceEnabled check
  voiceModeActive: false,

  toggleVoice: () => set(s => {
    const next = !s.voiceEnabled
    try { localStorage.setItem(KEY, String(next)) } catch {}
    if (!next && s.currentAudio) {
      s.currentAudio.pause()
      try { URL.revokeObjectURL(s.currentAudio.src) } catch {}
    }
    return { voiceEnabled: next, ...(!next && { isSpeaking: false, currentAudio: null }) }
  }),

  setVoiceModeActive: (v) => set({ voiceModeActive: v }),

  setIsSpeaking: (v) => set({ isSpeaking: v }),

  stopSpeaking: () => {
    const { currentAudio } = get()
    if (currentAudio) {
      currentAudio.pause()
      try { URL.revokeObjectURL(currentAudio.src) } catch {}
    }
    set({ isSpeaking: false, currentAudio: null })
  },

  setCurrentAudio: (audio) => set({ currentAudio: audio }),
}))

// Each orb gets a distinct PlayAI voice — same key used in Groq TTS API
export const ORB_VOICES = {
  balanced:   'Celeste-PlayAI',   // warm, adaptive, encouraging
  challenger: 'Fritz-PlayAI',     // direct, demanding, no hand-holding
  scholar:    'Basil-PlayAI',     // precise, thorough, formally structured
  mystic:     'Indigo-PlayAI',    // metaphor-driven, ethereal
  void:       'Chip-PlayAI',      // cold, minimal, relentless
  ember:      'Atlas-PlayAI',     // passionate, energetic
  aurora:     'Arista-PlayAI',    // creative, flowing
  phantom:    'Cillian-PlayAI',   // mysterious, hints only
}
