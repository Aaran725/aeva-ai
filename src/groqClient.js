// Shared Groq key rotation — single counter across all files
// NOTE: All 3 keys must be from SEPARATE Groq accounts for true 3x limits.
// Keys from the same account share the same quota pool.

export const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
].filter(Boolean)

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

let _idx = 0
export function nextGroqKey() {
  const key = GROQ_KEYS[_idx % GROQ_KEYS.length]
  _idx++
  return key
}
