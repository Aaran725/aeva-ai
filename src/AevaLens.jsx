/**
 * Aeva Lens — Vision-to-Logic
 * Drag to select a region → Groq Llama 4 Scout analyses it.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Crop, Scan } from 'lucide-react'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const ANALYSIS_PROMPT = `You are an expert tutor analyzing an image of a student's work.

Your job is NOT to solve it. Instead:
1. Identify the concept or skill being tested.
2. Pinpoint the EXACT struggle point — where did they go wrong or get stuck?
3. Explain the underlying rule that resolves the confusion.
4. Identify 2-3 specific hotspot regions worth explaining.

STRICT JSON RULES — breaking these will cause errors:
- Output ONLY a valid JSON object. No markdown fences, no extra text before or after.
- NO LaTeX or backslashes. Write sqrt(x), x^2, x/y, a*b — never \\sqrt, \\frac.
- All string values must be single-line. No literal newline characters inside strings.
- Use only plain ASCII characters inside strings.

Output this exact structure (fill in the values):
{
  "topic": "topic name",
  "coreInsight": "one sentence on the central concept",
  "strugglePoint": "one sentence on where the confusion is",
  "explanation": "2-3 sentences on the underlying rule in plain language",
  "variables": [
    { "symbol": "a", "meaning": "what it represents" }
  ],
  "steps": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "hotspots": [
    { "id": "h1", "x": 25, "y": 35, "label": "Struggle Point", "detail": "plain text explanation" },
    { "id": "h2", "x": 65, "y": 55, "label": "Key Rule", "detail": "plain text explanation" }
  ]
}

Variables: empty array [] if non-mathematical. Steps: 3-5 max. Hotspots x,y: percentage from top-left corner of the image.`

/* ─── Unicode math prettifier ─── */
function mathify(text) {
  if (!text) return text
  return text
    .replace(/sqrt\(([^)]*)\)/g, '√($1)')    // sqrt(x) → √(x)
    .replace(/\^10\b/g, '¹⁰')
    .replace(/\^([0-9])/g, (_, n) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[n] ?? `^${n}`)
    .replace(/\*/g, '×')
    .replace(/\bpi\b/gi, 'π')
    .replace(/\btheta\b/gi, 'θ')
    .replace(/\balpha\b/gi, 'α')
    .replace(/\bbeta\b/gi, 'β')
    .replace(/\bdelta\b/gi, 'Δ')
    .replace(/\binfinity\b/gi, '∞')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/ - /g, ' − ')
}

/* ─── Main Component ─── */
export default function AevaLens({ file, onClose, onInsightReady }) {
  // phases: select → scanning → result | error
  const [phase, setPhase] = useState('select')
  const [analysis, setAnalysis] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeHotspot, setActiveHotspot] = useState(null)

  // Region selection state
  const [imgSrc, setImgSrc] = useState(null)
  const [croppedSrc, setCroppedSrc] = useState(null)  // shown in result view
  const [selection, setSelection] = useState(null)    // { x1,y1,x2,y2 } as % of container
  const [dragStart, setDragStart] = useState(null)
  const imgContainerRef = useRef(null)
  const imgRef = useRef(null)
  const croppedUrlRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => {
      URL.revokeObjectURL(url)
      if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current)
    }
  }, [file])

  /* ── Drag selection helpers ── */
  const getRelPos = (e) => {
    const rect = imgContainerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    }
  }

  const onDragStart = (e) => {
    e.preventDefault()
    const pos = getRelPos(e)
    setDragStart(pos)
    setSelection({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
  }

  const onDragMove = (e) => {
    if (!dragStart) return
    e.preventDefault()
    const pos = getRelPos(e)
    setSelection({ x1: dragStart.x, y1: dragStart.y, x2: pos.x, y2: pos.y })
  }

  const onDragEnd = () => {
    setDragStart(null)
  }

  const selRect = selection ? {
    left:   `${Math.min(selection.x1, selection.x2)}%`,
    top:    `${Math.min(selection.y1, selection.y2)}%`,
    width:  `${Math.abs(selection.x2 - selection.x1)}%`,
    height: `${Math.abs(selection.y2 - selection.y1)}%`,
  } : null

  const hasSelection = selection &&
    Math.abs(selection.x2 - selection.x1) > 3 &&
    Math.abs(selection.y2 - selection.y1) > 3

  /* ── Crop + analyse ── */
  const handleAnalyse = useCallback(async () => {
    setPhase('scanning')
    try {
      if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY is not set')

      let blob = file
      if (hasSelection && imgRef.current) {
        const cropped = await cropImageBlob(file, selection, imgRef.current)
        if (cropped) {
          blob = cropped
          // Show the cropped region in the result view
          if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current)
          const url = URL.createObjectURL(cropped)
          croppedUrlRef.current = url
          setCroppedSrc(url)
        }
      }

      const base64 = await fileToBase64(blob)
      const mimeType = blob.type || 'image/jpeg'

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
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
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)

      const raw = json.choices?.[0]?.message?.content || ''
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
  }, [file, hasSelection, selection])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(2,4,18,0.90)',
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
          maxWidth: phase === 'result' ? 900 : 580,
          maxHeight: '92vh',
          borderRadius: 24,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #07091c 0%, #0d0f26 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex',
          flexDirection: phase === 'result' ? 'row' : 'column',
          transition: 'max-width 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      >

        {/* ── Left: image + selection/hotspot overlay ── */}
        <div
          ref={imgContainerRef}
          onMouseDown={phase === 'select' ? onDragStart : undefined}
          onMouseMove={phase === 'select' ? onDragMove : undefined}
          onMouseUp={phase === 'select' ? onDragEnd : undefined}
          onTouchStart={phase === 'select' ? onDragStart : undefined}
          onTouchMove={phase === 'select' ? onDragMove : undefined}
          onTouchEnd={phase === 'select' ? onDragEnd : undefined}
          style={{
            position: 'relative',
            flex: phase === 'result' ? '0 0 50%' : '1',
            minHeight: 280,
            overflow: 'hidden',
            background: '#000',
            cursor: phase === 'select' ? 'crosshair' : 'default',
            userSelect: 'none',
          }}
        >
          {/* In result view show cropped region; otherwise full image */}
          {phase === 'result' && croppedSrc ? (
            <img
              src={croppedSrc}
              alt="Selected region"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '92vh', pointerEvents: 'none' }}
            />
          ) : imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Uploaded"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '92vh', pointerEvents: 'none' }}
            />
          )}

          {/* Select mode: instruction banner + drag box */}
          {phase === 'select' && (
            <>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                padding: '8px 12px',
                background: 'linear-gradient(180deg, rgba(7,9,28,0.85) 0%, transparent 100%)',
                display: 'flex', alignItems: 'center', gap: 7,
                pointerEvents: 'none',
              }}>
                <Crop size={12} color="rgba(0,200,255,0.75)" strokeWidth={2.5} />
                <span style={{ fontSize: 11.5, color: 'rgba(0,200,255,0.80)', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Drag to select a question
                </span>
              </div>

              {/* Selection rectangle */}
              {selRect && (
                <div style={{
                  position: 'absolute',
                  ...selRect,
                  border: '2px solid #00C8FF',
                  background: 'rgba(0,200,255,0.10)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.40)',
                  pointerEvents: 'none',
                }} />
              )}

              {/* Analyse button — appears when selection is big enough */}
              <AnimatePresence>
                {hasSelection && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    onClick={e => { e.stopPropagation(); handleAnalyse() }}
                    style={{
                      position: 'absolute',
                      bottom: 14, left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '9px 18px', borderRadius: 99,
                      background: '#00C8FF',
                      border: 'none',
                      color: '#07091c',
                      fontSize: 12.5, fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      boxShadow: '0 4px 20px rgba(0,200,255,0.45)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Scan size={13} strokeWidth={2.5} />
                    Analyse selection
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Full image fallback */}
              {!hasSelection && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={e => { e.stopPropagation(); handleAnalyse() }}
                  style={{
                    position: 'absolute',
                    bottom: 14, left: '50%', transform: 'translateX(-50%)',
                    padding: '7px 16px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 11.5, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  or analyse whole image
                </motion.button>
              )}
            </>
          )}

          {/* Scanning beam */}
          {phase === 'scanning' && (
            <>
              <ScanBeam />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,100,255,0.03)',
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
                  ANALYSING…
                </span>
              </div>
            </>
          )}

          {/* Result: hotspot dots */}
          {phase === 'result' && analysis?.hotspots?.map(hs => (
            <HotspotDot
              key={hs.id}
              hotspot={hs}
              active={activeHotspot?.id === hs.id}
              onClick={() => setActiveHotspot(prev => prev?.id === hs.id ? null : hs)}
            />
          ))}

          {/* Result: "select another" pill at bottom of image */}
          {phase === 'result' && (
            <button
              onClick={() => { setPhase('select'); setSelection(null); setCroppedSrc(null); setAnalysis(null); setActiveHotspot(null) }}
              style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 99,
                background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.16)',
                color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              }}
            >
              <Crop size={11} strokeWidth={2.5} />
              Select another question
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.60)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* ── Right: analysis panel ── */}
        <AnimatePresence>
          {phase === 'result' && analysis && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                borderLeft: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Topic */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', fontSize: 11, fontWeight: 700, color: '#67E8F9', letterSpacing: '0.05em' }}>
                  {analysis.topic}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Aeva Lens</span>
              </div>

              {/* Core insight */}
              <div style={{ padding: '11px 13px', borderRadius: 12, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(165,180,252,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Core Insight</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{mathify(analysis.coreInsight)}</div>
              </div>

              {/* Struggle point */}
              <div style={{ padding: '11px 13px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(252,165,165,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Struggle Point</div>
                <div style={{ fontSize: 13, color: 'rgba(255,200,200,0.85)', lineHeight: 1.55 }}>{mathify(analysis.strugglePoint)}</div>
              </div>

              {/* The rule */}
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>The Rule</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.65 }}>{mathify(analysis.explanation)}</div>
              </div>

              {/* Steps */}
              {analysis.steps?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>How to Approach It</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {analysis.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0, width: 17, height: 17, borderRadius: '50%', background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#A5B4FC' }}>{i + 1}</div>
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>{mathify(step)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables table */}
              {analysis.variables?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Variables</div>
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {analysis.variables.map((v, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 12px', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: i < analysis.variables.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <code style={{ flexShrink: 0, fontSize: 13, fontFamily: 'monospace', color: '#FBBF24', fontWeight: 700, minWidth: 28 }}>{mathify(v.symbol)}</code>
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>{mathify(v.meaning)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active hotspot detail */}
              <AnimatePresence>
                {activeHotspot && (
                  <motion.div
                    key={activeHotspot.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 2 }}
                    style={{ padding: '11px 13px', borderRadius: 12, background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.22)' }}
                  >
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(103,232,249,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                      📍 {activeHotspot.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(207,250,254,0.80)', lineHeight: 1.55 }}>{mathify(activeHotspot.detail)}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add to Study Guide */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onInsightReady({
                    topic: analysis.topic,
                    coreInsight: analysis.coreInsight,
                    strugglePoint: analysis.strugglePoint,
                    explanation: analysis.explanation,
                    steps: analysis.steps || [],
                    variables: analysis.variables || [],
                    timestamp: Date.now(),
                  })
                  onClose()
                }}
                style={{
                  marginTop: 'auto',
                  padding: '11px 16px', borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.18) 100%)',
                  border: '1px solid rgba(139,143,255,0.32)',
                  color: '#C4B5FD', fontSize: 13, fontWeight: 700,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  boxShadow: '0 4px 18px rgba(99,102,241,0.15)',
                }}
              >
                <Plus size={13} strokeWidth={2.5} />
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
              <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.75)', fontFamily: 'monospace', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '6px 12px', maxWidth: 320, wordBreak: 'break-word' }}>
                {errorMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPhase('select'); setErrorMsg('') }}
                style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', color: '#67E8F9', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>
                Try again
              </button>
              <button onClick={onClose}
                style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Close
              </button>
            </div>
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
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, #00C8FF 40%, #0080FF 60%, transparent 100%)',
        boxShadow: '0 0 16px 4px rgba(0,180,255,0.45)',
        pointerEvents: 'none', zIndex: 10,
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
        left: `${hotspot.x}%`, top: `${hotspot.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 22, height: 22, borderRadius: '50%',
        background: active ? 'rgba(0,200,255,0.30)' : 'rgba(0,200,255,0.15)',
        border: `2px solid ${active ? '#00C8FF' : 'rgba(0,200,255,0.60)'}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, backdropFilter: 'blur(4px)',
      }}
      animate={!active ? { boxShadow: ['0 0 0 0 rgba(0,200,255,0.5)', '0 0 0 8px rgba(0,200,255,0)', '0 0 0 0 rgba(0,200,255,0)'] } : {}}
      transition={{ duration: 1.8, repeat: Infinity }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#00C8FF' : 'rgba(0,200,255,0.80)' }} />
    </motion.button>
  )
}

/* ─── Crop image to selection ─── */
async function cropImageBlob(file, selection, imgEl) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const natW = imgEl.naturalWidth
    const natH = imgEl.naturalHeight
    const dispW = imgEl.clientWidth
    const dispH = imgEl.clientHeight

    // The img uses object-fit:contain — compute actual rendered rect
    const scale = Math.min(dispW / natW, dispH / natH)
    const rendW = natW * scale
    const rendH = natH * scale
    const offX = (dispW - rendW) / 2
    const offY = (dispH - rendH) / 2

    // Convert % of container to pixel coords in natural image space
    const x1pct = Math.min(selection.x1, selection.x2) / 100
    const y1pct = Math.min(selection.y1, selection.y2) / 100
    const x2pct = Math.max(selection.x1, selection.x2) / 100
    const y2pct = Math.max(selection.y1, selection.y2) / 100

    const sx = Math.max(0, ((x1pct * dispW) - offX) / scale)
    const sy = Math.max(0, ((y1pct * dispH) - offY) / scale)
    const sw = Math.min(natW - sx, ((x2pct - x1pct) * dispW) / scale)
    const sh = Math.min(natH - sy, ((y2pct - y1pct) * dispH) / scale)

    if (sw <= 0 || sh <= 0) { resolve(null); return }

    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95)
    }
    img.src = URL.createObjectURL(file)
  })
}

/* ─── JSON helpers ─── */
function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function safeParseJSON(str) {
  try { return JSON.parse(str) } catch {
    const fixed = str.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    try { return JSON.parse(fixed) } catch {
      throw new Error('Could not parse model response as JSON')
    }
  }
}
