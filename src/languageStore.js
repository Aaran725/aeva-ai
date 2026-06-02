import { create } from 'zustand'

const KEY = 'aeva_language'

export const useLanguageStore = create((set) => ({
  language: (() => { try { return localStorage.getItem(KEY) || 'en' } catch { return 'en' } })(),
  setLanguage: (lang) => {
    try { localStorage.setItem(KEY, lang) } catch {}
    set({ language: lang })
  },
}))
