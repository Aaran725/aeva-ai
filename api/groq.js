export const config = { runtime: 'edge' }

const GROQ_UPSTREAM = 'https://api.groq.com/openai/v1/chat/completions'

const KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean)

const sleep = ms => new Promise(r => setTimeout(r, ms))

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

  const body = await req.text()

  // Try each key; on 429 wait briefly before trying the next
  let lastRes
  for (let i = 0; i < KEYS.length; i++) {
    const upstream = await fetch(GROQ_UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEYS[i]}`,
      },
      body,
    })

    if (upstream.status !== 429) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    lastRes = upstream
    // Wait 1s before trying the next key (avoids hammering Groq)
    if (i < KEYS.length - 1) await sleep(1000)
  }

  // All keys exhausted — pass through the 429
  return new Response(lastRes.body, {
    status: 429,
    headers: {
      'Content-Type': lastRes.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
