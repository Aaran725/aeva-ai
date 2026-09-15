import { Component } from 'react'

// Global error log — persists to localStorage so devs can read it after a crash
function logError(error, info = {}) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 800) || '',
      component: info?.componentStack?.slice(0, 400) || '',
      url: window.location.href,
    }
    const existing = JSON.parse(localStorage.getItem('aeva_error_log') || '[]')
    const updated = [entry, ...existing].slice(0, 20) // keep last 20
    localStorage.setItem('aeva_error_log', JSON.stringify(updated))
    console.error('[Aeva ErrorBoundary]', entry)
  } catch {}
}

// Wire up global unhandled errors too
if (typeof window !== 'undefined') {
  window.addEventListener('error', e => logError(e.error || e, {}))
  window.addEventListener('unhandledrejection', e => logError(e.reason, {}))
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { crashed: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { crashed: true, error }
  }

  componentDidCatch(error, info) {
    logError(error, info)
  }

  reset() {
    this.setState({ crashed: false, error: null })
  }

  render() {
    if (!this.state.crashed) return this.props.children

    const { fallback, label = 'This section' } = this.props
    if (fallback) return fallback

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: 32, minHeight: 160,
        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
        borderRadius: 16, margin: 12,
      }}>
        <div style={{ fontSize: 22 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#FCA5A5' }}>{label} crashed</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', maxWidth: 280, textAlign: 'center' }}>
          {this.state.error?.message || 'Something went wrong.'}
        </div>
        <button
          onClick={() => this.reset()}
          style={{
            marginTop: 4, padding: '7px 18px', borderRadius: 99, border: 'none',
            background: 'rgba(239,68,68,0.18)', color: '#FCA5A5',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
