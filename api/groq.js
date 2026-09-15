export const config = { runtime: 'edge' }

const GROQ_UPSTREAM = 'https://api.groq.com/openai/v1/chat/completions'

const KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean)

// Fallback model chain — if primary model fails (4xx other than 429), try these
const FALLBACK_MODELS = ['groq/compound-beta', 'groq/compound-mini']

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function tryUpstream(key, bodyObj) {
  return fetch(GROQ_UPSTREAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(bodyObj),
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (KEYS.length === 0) {
    return new Response(JSON.stringify({ error: 'No Groq keys configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let bodyObj
  try {
    const rawBody = await req.text()
    bodyObj = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const primaryModel = bodyObj.model
  const isStreaming = bodyObj.stream === true

  // Helper: try all keys for a given bodyObj, rotating on 429
  async function tryAllKeys(reqBody) {
    let lastRes = null
    for (let i = 0; i < KEYS.length; i++) {
      const res = await tryUpstream(KEYS[i], reqBody)
      if (res.status !== 429) return res
      lastRes = res
      if (i < KEYS.length - 1) await sleep(1000)
    }
    return lastRes // all keys rate-limited
  }

  // 1. Try primary model across all keys
  let res = await tryAllKeys(bodyObj)

  // 2. If primary model fails with a non-429 error AND it's not streaming, try fallback models
  if (!isStreaming && res && !res.ok && res.status !== 429) {
    for (const fallbackModel of FALLBACK_MODELS) {
      if (fallbackModel === primaryModel) continue
      const fallbackBody = { ...bodyObj, model: fallbackModel }
      // Remove response_format if fallback model doesn't support it (compound-mini does, but safety)
      const fallbackRes = await tryAllKeys(fallbackBody)
      if (fallbackRes?.ok) {
        res = fallbackRes
        break
      }
    }
  }

  if (!res) {
    return new Response(JSON.stringify({ error: 'All upstream attempts failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
      'X-Aeva-Model': primaryModel || 'unknown',
    },
  })
}
