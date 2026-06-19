import { createClient } from '@supabase/supabase-js'

function auth(req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
  return token === process.env.ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) {
    return res.status(200).json({
      users: [],
      totalUsers: 0,
      newThisWeek: 0,
      missingKey: true,
    })
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch all auth users
  const { data: { users: authUsers = [] } = {}, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (authErr) return res.status(500).json({ error: authErr.message })

  // Fetch all user_data rows for activity stats
  const { data: userData = [] } = await supabase
    .from('user_data')
    .select('user_id, xp_state, chat_history, updated_at')

  const userDataMap = Object.fromEntries((userData || []).map(r => [r.user_id, r]))

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const users = authUsers.map(u => {
    const ud = userDataMap[u.id] || {}
    const xp = ud.xp_state?.xp ?? 0
    const level = Math.floor(Math.sqrt(xp / 100)) + 1
    const chatCount = Array.isArray(ud.chat_history) ? ud.chat_history.length : 0
    const totalMessages = Array.isArray(ud.chat_history)
      ? ud.chat_history.reduce((sum, s) => sum + (s.messages?.length ?? 0), 0)
      : 0

    return {
      id: u.id,
      email: u.email,
      provider: u.app_metadata?.provider ?? 'email',
      createdAt: u.created_at,
      lastActive: ud.updated_at ?? u.last_sign_in_at ?? null,
      xp,
      level,
      chatSessions: chatCount,
      totalMessages,
    }
  }).sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0))

  const newThisWeek = authUsers.filter(u => new Date(u.created_at).getTime() > weekAgo).length

  res.status(200).json({
    users,
    totalUsers: users.length,
    newThisWeek,
    totalMessages: users.reduce((s, u) => s + u.totalMessages, 0),
    missingKey: false,
    ts: Date.now(),
  })
}
