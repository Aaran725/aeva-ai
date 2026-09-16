// Shared Groq key rotation — single counter across all files
// NOTE: All 3 keys must be from SEPARATE Groq accounts for true 3x limits.
// Keys from the same account share the same quota pool.

export const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
].filter(Boolean)

export const GROQ_URL = '/api/groq'

// Canonical model names — use these everywhere, never inline strings
export const MODEL_FAST   = 'llama-3.1-8b-instant'       // quick tasks: acks, commentary, short analysis
export const MODEL_SMART  = 'llama-3.3-70b-versatile'     // complex reasoning: grading, question gen, analysis
export const MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct' // image/vision tasks

let _idx = 0
export function nextGroqKey() {
  const key = GROQ_KEYS[_idx % GROQ_KEYS.length]
  _idx++
  return key
}
