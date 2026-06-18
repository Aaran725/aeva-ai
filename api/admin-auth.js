export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body ?? {}

  const validEmail = process.env.ADMIN_EMAIL
  const validPassword = process.env.ADMIN_PASSWORD

  if (!validEmail || !validPassword) {
    return res.status(500).json({ error: 'Admin credentials not configured on server' })
  }

  if (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.trim() === validEmail &&
    password === validPassword
  ) {
    return res.status(200).json({ ok: true })
  }

  return res.status(401).json({ ok: false, error: 'Invalid credentials.' })
}
