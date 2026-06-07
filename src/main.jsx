import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ minHeight: '100vh', background: '#08091a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontFamily: 'system-ui', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 400, textAlign: 'center' }}>{this.state.error.message}</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 99, background: 'rgba(139,143,255,0.2)', border: '1px solid rgba(139,143,255,0.4)', color: 'white', cursor: 'pointer', fontSize: 14 }}>Reload</button>
      </div>
    )
    return this.props.children
  }
}

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Remove the boot splash once React has mounted
if (typeof window.__removeSplash === 'function') {
  // Small rAF delay so the first React paint lands before splash disappears
  requestAnimationFrame(() => requestAnimationFrame(window.__removeSplash))
}
