const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean)

function auth(req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
  return token === process.env.ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const results = await Promise.all(
    KEYS.map(async (key, i) => {
      const label = `Key ${i + 1}`
      try {
        const r = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
          }),
        })

        const h = Object.fromEntries(r.headers.entries())

        if (r.status === 401 || r.status === 403) {
          return { label, status: 'invalid', error: 'Invalid API key' }
        }
        if (r.status === 429) {
          return {
            label, status: 'limited',
            reqRemaining: Number(h['x-ratelimit-remaining-requests'] ?? 0),
            reqLimit: Number(h['x-ratelimit-limit-requests'] ?? 0),
            tokRemaining: Number(h['x-ratelimit-remaining-tokens'] ?? 0),
            tokLimit: Number(h['x-ratelimit-limit-tokens'] ?? 0),
            resetReq: h['x-ratelimit-reset-requests'] ?? null,
            resetTok: h['x-ratelimit-reset-tokens'] ?? null,
          }
        }

        return {
          label, status: 'ok',
          reqRemaining: Number(h['x-ratelimit-remaining-requests'] ?? '?'),
          reqLimit: Number(h['x-ratelimit-limit-requests'] ?? '?'),
          tokRemaining: Number(h['x-ratelimit-remaining-tokens'] ?? '?'),
          tokLimit: Number(h['x-ratelimit-limit-tokens'] ?? '?'),
          resetReq: h['x-ratelimit-reset-requests'] ?? null,
          resetTok: h['x-ratelimit-reset-tokens'] ?? null,
          model: 'llama-3.1-8b-instant',
        }
      } catch (e) {
        return { label, status: 'error', error: e.message }
      }
    })
  )

  res.status(200).json({ keys: results, ts: Date.now() })
}
