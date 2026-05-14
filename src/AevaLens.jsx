/**
 * Aeva Lens — Vision-to-Logic
 * Analyzes images using Groq vision (Llama 4 Scout) — same key already in Vercel.
 * Shows a scanning animation, then overlays hotspots + a glass-morphism analysis panel.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, Plus, CheckCircle, Loader } from 'lucide-react'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const ANALYSIS_PROMPT = `You are an expert tutor analyzing an image of a student's work or problem.

Your job is NOT to solve it for them. Instead:
1. Identify what concept, topic, or skill is being tested.
2. Pinpoint the EXACT struggle point — where did they go wrong or get confused?
3. Explain the underlying rule or principle that resolves the confusion.
4. Identify 2-4 specific regions of the image that are worth explaining (for hotspots).

CRITICAL JSON RULES — you MUST follow these or the output will break:
- Respond with ONLY a valid JSON object. No markdown, no code fences, no extra text.
- Do NOT use LaTeX or backslashes anywhere. No \\sqrt, \\frac, \\times, etc.
- Write all math using plain ASCII: sqrt(x), x/y, x^2, a*b, (a+b)^2.
- Every string value must be on one line. No literal newlines inside strings.
- Use only straight double quotes. No special characters that break JSON.

Output this exact structure:
{
  "topic": "short topic name e.g. Nested Surds",
  "coreInsight": "One sentence on the central concept in plain text.",
  "strugglePoint": "One sentence on where the confusion likely is.",
  "explanation": "2-3 sentences on the underlying rule. Plain language, no LaTeX.",
  "variables": [
    { "symbol": "a", "meaning": "what it represents" }
  ],
  "steps": [
    "Step 1: describe in plain text",
    "Step 2: describe in plain text"
  ],
  "hotspots": [
    { "id": "h1", "x": 30, "y": 45, "label": "Struggle Point", "detail": "Plain text explanation." },
    { "id": "h2", "x": 60, "y": 20, "label": "Key Rule", "detail": "Plain text explanation." }
  ]
}

Keep variables [] if non-mathematical. Steps: 3-5 max. Hotspots: x,y as % from top-left of image.`

/* ─── Main Component ─── */
export default function AevaLens({ file, onClose, onInsightReady }) {
  const [phase, setPhase] = useState('scanning') // scanning | result | error
  const [analysis, setAnalysis] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeHotspot, setActiveHotspot] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 })
  const imgRef = useRef(null)
  const objectUrl = useRef(null)

  // Create stable object URL
  const [imgSrc, setImgSrc] = useState(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    objectUrl.current = url
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Kick off Gemini analysis once we have the src
  useEffect(() => {
    if (!imgSrc) return
    analyzeImage()
  }, [imgSrc])

  const analyzeImage = useCallback(async () => {
    try {
      if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY is not set')

      const base64 = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: ANALYSIS_PROMPT },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          }],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        const msg = json.error?.message || `HTTP ${res.status}`
        throw new Error(msg)
      }

      const raw = json.choices?.[0]?.message?.content || ''

      // Extract JSON — model sometimes wraps in markdown code fences
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')

      const parsed = safeParseJSON(jsonMatch[0])
      setAnalysis(parsed)
      setPhase('result')
    } catch (err) {
      console.error('Aeva Lens error:', err)
      setErrorMsg(err.message || 'Unknown error')
      setPhase('error')
    }
  }, [file])

  const handleAddToGuide = () => {
    if (!analysis) return
    onInsightReady({
      topic: analysis.topic,
      coreInsight: analysis.coreInsight,
      strugglePoint: analysis.strugglePoint,
      explanation: analysis.explanation,
      steps: analysis.steps || [],
      variables: analysis.variables || [],
      imageFile: file,
      timestamp: Date.now(),
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(2,4,18,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.88, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          width: '100%',
          maxWidth: phase === 'result' ? 880 : 560,
          maxHeight: '90vh',
          borderRadius: 24,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #07091c 0%, #0d0f26 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex',
          flexDirection: phase === 'result' ? 'row' : 'column',
          transition: 'max-width 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Left: image + hotspots */}
        <div style={{
          position: 'relative',
          flex: phase === 'result' ? '0 0 50%' : '1',
          minHeight: phase === 'scanning' ? 320 : 'auto',
          overflow: 'hidden',
          background: '#000',
        }}>
          {imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Uploaded"
              onLoad={e => setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '90vh' }}
            />
          )}

          {/* Scanning beam animation */}
          {phase === 'scanning' && (
            <>
              <ScanBeam />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,200,255,0.04) 0%, rgba(0,100,255,0.02) 100%)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 16px',
                background: 'linear-gradient(0deg, rgba(7,9,28,0.95) 0%, transparent 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,200,255,0.2)', borderTopColor: '#00C8FF' }}
                />
                <span style={{ fontSize: 12.5, color: 'rgba(0,200,255,0.80)', fontWeight: 600, letterSpacing: '0.06em' }}>
                  ANALYSING IMAGE…
                </span>
              </div>
            </>
          )}

          {/* Hotspot dots */}
          {phase === 'result' && analysis?.hotspots?.map(hs => (
            <HotspotDot
              key={hs.id}
              hotspot={hs}
              active={activeHotspot?.id === hs.id}
              onClick={() => setActiveHotspot(prev => prev?.id === hs.id ? null : hs)}
            />
          ))}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.60)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Right: analysis panel */}
        <AnimatePresence>
          {phase === 'result' && analysis && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.4 }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderLeft: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Topic badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)',
                  fontSize: 11, fontWeight: 700, color: '#67E8F9', letterSpacing: '0.05em',
                }}>
                  {analysis.topic}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Aeva Lens
                </span>
              </div>

              {/* Core insight */}
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(165,180,252,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Core Insight</div>
                <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{analysis.coreInsight}</div>
              </div>

              {/* Struggle point */}
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(252,165,165,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Struggle Point</div>
                <div style={{ fontSize: 13, color: 'rgba(255,200,200,0.85)', lineHeight: 1.55 }}>{analysis.strugglePoint}</div>
              </div>

              {/* Explanation */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>The Rule</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>{analysis.explanation}</div>
              </div>

              {/* Steps */}
              {analysis.steps?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>How to Approach It</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {analysis.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{
                          flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9.5, fontWeight: 800, color: '#A5B4FC',
                        }}>{i + 1}</div>
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables table */}
              {analysis.variables?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Variables</div>
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {analysis.variables.map((v, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, padding: '7px 12px',
                        background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderBottom: i < analysis.variables.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <code style={{ flexShrink: 0, fontSize: 13, fontFamily: 'monospace', color: '#FBBF24', fontWeight: 700, minWidth: 28 }}>{v.symbol}</code>
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.58)' }}>{v.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotspot tooltip */}
              <AnimatePresence>
                {activeHotspot && (
                  <motion.div
                    key={activeHotspot.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 2 }}
                    style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.22)',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(103,232,249,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                      📍 {activeHotspot.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(207,250,254,0.80)', lineHeight: 1.55 }}>{activeHotspot.detail}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add to Study Guide button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAddToGuide}
                style={{
                  marginTop: 'auto',
                  padding: '12px 18px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.20) 100%)',
                  border: '1px solid rgba(139,143,255,0.35)',
                  color: '#C4B5FD',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  boxShadow: '0 4px 20px rgba(99,102,241,0.15)',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add to Study Guide
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {phase === 'error' && (
          <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Couldn't analyse this image</div>
            {errorMsg && (
              <div style={{ fontSize: 11.5, color: 'rgba(239,68,68,0.75)', fontFamily: 'monospace', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '6px 12px', maxWidth: 320, wordBreak: 'break-word' }}>
                {errorMsg}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', lineHeight: 1.5 }}>
              {errorMsg?.includes('API_KEY') || errorMsg?.includes('key')
                ? 'Check that VITE_GROQ_API_KEY is set in your Vercel environment variables.'
                : 'Make sure the image is clear and try again.'}
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 8, padding: '9px 20px', borderRadius: 99,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ─── Scanning beam ─── */
function ScanBeam() {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent 0%, #00C8FF 40%, #0080FF 60%, transparent 100%)',
        boxShadow: '0 0 16px 4px rgba(0,180,255,0.45)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

/* ─── Hotspot dot ─── */
function HotspotDot({ hotspot, active, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.90 }}
      style={{
        position: 'absolute',
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 22, height: 22,
        borderRadius: '50%',
        background: active ? 'rgba(0,200,255,0.30)' : 'rgba(0,200,255,0.15)',
        border: `2px solid ${active ? '#00C8FF' : 'rgba(0,200,255,0.60)'}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20,
        backdropFilter: 'blur(4px)',
      }}
      animate={!active ? {
        boxShadow: ['0 0 0 0 rgba(0,200,255,0.5)', '0 0 0 8px rgba(0,200,255,0)', '0 0 0 0 rgba(0,200,255,0)'],
      } : {}}
      transition={{ duration: 1.8, repeat: Infinity }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#00C8FF' : 'rgba(0,200,255,0.80)' }} />
    </motion.button>
  )
}

/* ─── Helpers ─── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// LLMs often emit bare backslashes in math/LaTeX inside JSON strings,
// which makes JSON.parse throw. Fix by escaping lone backslashes, then parse.
function safeParseJSON(str) {
  try {
    return JSON.parse(str)
  } catch {
    // Replace lone backslashes (not already doubled) with \\
    const fixed = str.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    try {
      return JSON.parse(fixed)
    } catch {
      // Last resort: strip everything outside the outermost braces and retry
      const inner = fixed.replace(/[ -]/g, ' ')
      return JSON.parse(inner)
    }
  }
}
