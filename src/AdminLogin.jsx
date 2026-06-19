import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react'


export default function AdminLogin({ onSuccess, onCancel }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (data.ok) {
        sessionStorage.setItem('aeva_admin_session', '1')
        sessionStorage.setItem('aeva_admin_token', password)
        onSuccess()
      } else {
        setError(data.error ?? 'Invalid credentials.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    padding: '13px 16px', borderRadius: 12,
    background: 'rgba(255,80,20,0.07)', border: '1px solid rgba(255,80,20,0.22)',
    color: 'rgba(255,220,200,0.92)', fontSize: 15,
    fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: '#0a0502',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* bg glow */}
      <div aria-hidden style={{ position: 'fixed', top: '20%', left: '30%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,80,20,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 400, padding: '0 24px', position: 'relative', zIndex: 1 }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #FF5014, #FF8C40)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(255,80,20,0.35)' }}>
            <Shield size={26} color="white" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,220,200,0.96)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Admin Access
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,180,140,0.45)' }}>
            Restricted to authorised accounts only.
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,80,20,0.06)', border: '1px solid rgba(255,80,20,0.20)',
          borderRadius: 24, padding: '26px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
          backdropFilter: 'blur(24px)',
        }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,180,140,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin email"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#FF5014'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,80,20,0.22)'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,180,140,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = '#FF5014'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,80,20,0.22)'}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,180,140,0.45)', padding: 0 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 13, color: '#F87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 9, padding: '9px 13px' }}>
              {error}
            </motion.div>
          )}

          <motion.button
            onClick={handleSubmit} disabled={loading || !email || !password}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '13px', borderRadius: 13,
              background: 'linear-gradient(135deg, rgba(255,80,20,0.45), rgba(255,120,40,0.35))',
              border: '1px solid rgba(255,80,20,0.55)',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading || !email || !password ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? 'Verifying…' : <><span>Enter</span><ArrowRight size={15} /></>}
          </motion.button>

          <button onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'rgba(255,180,140,0.35)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
            ← Back to app
          </button>
        </div>
      </motion.div>
    </div>
  )
}
