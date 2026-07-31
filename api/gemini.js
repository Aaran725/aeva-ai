export const config = { runtime: 'edge' }

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: 'No Gemini key configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { model = 'gemini-2.0-flash', ...body } = await req.json()

  const upstream = await fetch(
    `${GEMINI_BASE}/${model}:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
