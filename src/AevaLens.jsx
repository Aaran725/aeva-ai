/**
 * Aeva Lens — Vision-to-Logic
 * Drag-to-select region → Groq Llama 4 Scout analyses it.
 * Features: modular step cards, Show Me expand, predictive variables,
 *           syntax pattern card, hotspot↔variable linking, glassmorphism.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Crop, Scan, CheckCircle, ChevronRight } from 'lucide-react'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const ANALYSIS_PROMPT = `You are an expert math tutor analyzing an image of a student's work.

Do NOT solve it. Your role:
1. Identify the concept.
2. Write a direct Expert Tip (NOT "The student is..." — use "Goal:", "Key insight:", or imperative voice).
3. Build a syntaxCard with the general pattern.
4. Give 3-4 modular steps.
5. Extract ACTUAL numerical values from the image for variables.

STRICT JSON RULES (violation causes crash):
- Output ONLY a raw JSON object. No markdown, no fences, no text outside braces.
- NO backslashes. Write sqrt(x), x^2, a/b — never use backslashes.
- All strings ONE LINE. ASCII only.

HOTSPOT ANCHORING (critical): x and y are percentage coordinates FROM THE TOP-LEFT of the image.
Visually locate each key mathematical term in the image and place the hotspot directly on it.
Example: if the number "21" appears roughly 65% from the left edge and 38% from the top, use x:65, y:38.
DO NOT guess random positions — anchor each hotspot to a specific visible symbol or number.

Output EXACTLY this structure:
{
  "topic": "short topic",
  "coreInsight": "one crisp sentence",
  "expertTip": "Goal: [direct instruction]. e.g. Goal: Find two numbers that multiply to 21 and add to 10.",
  "syntaxCard": {
    "pattern": "sqrt(a + b - 2*sqrt(a*b)) = sqrt(a) - sqrt(b)",
    "conditions": ["a + b = 10", "a * b = 21"]
  },
  "variables": [
    { "symbol": "a", "value": "7", "meaning": "larger factor" },
    { "symbol": "b", "value": "3", "meaning": "smaller factor" }
  ],
  "steps": [
    { "verb": "MATCH", "title": "Match the Pattern", "body": "one short sentence", "formula": "sqrt(a) - sqrt(b) = sqrt(a + b - 2*sqrt(a*b))", "proTip": "10 words max on WHY" },
    { "verb": "SOLVE", "title": "Solve for a and b", "body": "one short sentence", "formula": "a + b = 10, a * b = 21", "proTip": "10 words max" }
  ],
  "hotspots": [
    { "id": "h1", "x": 55, "y": 35, "label": "The Sum", "detail": "This is a + b. Identify which number this equals.", "linkedVar": "a" },
    { "id": "h2", "x": 70, "y": 35, "label": "The Product", "detail": "This is a * b. Find its factor pairs.", "linkedVar": "b" }
  ]
}

variables.value: ACTUAL number from the image. steps: 3-4 max. hotspots: pin to VISIBLE terms in the image.`

/* ─── Unicode math prettifier ─── */
function mathify(text) {
  if (!text) return text
  let t = text

  // 1. Strip LaTeX dollar wrappers
  t = t.replace(/\$+/g, '')

  // 2. Convert LaTeX commands → ASCII (innermost braces first, repeat for nesting)
  let prev
  do { prev = t; t = t.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)') } while (t !== prev)
  t = t
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\pm/g, '±')
    .replace(/\\left|\\right/g, '')
    .replace(/[\\{}]/g, '')  // strip remaining backslashes and braces

  // 3. ASCII math → Unicode  (simple prefix swap handles all nesting naturally)
  t = t.replace(/sqrt\(/g, '√(')

  // Superscripts
  t = t.replace(/\^10\b/g, '¹⁰')
  t = t.replace(/\^([0-9])/g, (_, n) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[n] ?? `^${n}`)

  // Operators & symbols
  t = t.replace(/\*/g, '×')
  t = t.replace(/\bpi\b/gi, 'π').replace(/\btheta\b/gi, 'θ')
  t = t.replace(/\balpha\b/gi, 'α').replace(/\bbeta\b/gi, 'β')
  t = t.replace(/\bdelta\b/gi, 'Δ').replace(/\binfinity\b/gi, '∞')
  t = t.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠')
  t = t.replace(/ - /g, ' − ')

  return t
}

/* ─── Main Component ─── */
export default function AevaLens({ file, onClose, onInsightReady }) {
  const [phase, setPhase] = useState('select')
  const [analysis, setAnalysis] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Hotspot & variable linking
  const [activeHotspot, setActiveHotspot] = useState(null)
  const [highlightedVar, setHighlightedVar] = useState(null)

  // Step interactivity
  const [revealedSteps, setRevealedSteps] = useState(new Set())

  // Add-to-guide animation state
  const [addState, setAddState] = useState('idle') // idle | adding | done

  // Image & selection
  const [imgSrc, setImgSrc] = useState(null)
  const [croppedSrc, setCroppedSrc] = useState(null)
  const [selection, setSelection] = useState(null)
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

  /* ── Drag selection ── */
  const getRelPos = (e) => {
    const rect = imgContainerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(100, ((cx - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((cy - rect.top) / rect.height) * 100)),
    }
  }
  const onDragStart = (e) => { e.preventDefault(); const p = getRelPos(e); setDragStart(p); setSelection({ x1: p.x, y1: p.y, x2: p.x, y2: p.y }) }
  const onDragMove  = (e) => { if (!dragStart) return; e.preventDefault(); const p = getRelPos(e); setSelection({ x1: dragStart.x, y1: dragStart.y, x2: p.x, y2: p.y }) }
  const onDragEnd   = () => setDragStart(null)

  const selRect = selection ? {
    left: `${Math.min(selection.x1, selection.x2)}%`, top: `${Math.min(selection.y1, selection.y2)}%`,
    width: `${Math.abs(selection.x2 - selection.x1)}%`, height: `${Math.abs(selection.y2 - selection.y1)}%`,
  } : null
  const hasSelection = selection && Math.abs(selection.x2 - selection.x1) > 3 && Math.abs(selection.y2 - selection.y1) > 3

  /* ── Analyse ── */
  const handleAnalyse = useCallback(async () => {
    setPhase('scanning')
    try {
      if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY is not set')
      let blob = file
      if (hasSelection && imgRef.current) {
        const cropped = await cropImageBlob(file, selection, imgRef.current)
        if (cropped) {
          blob = cropped
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
          messages: [{ role: 'user', content: [
            { type: 'text', text: ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ]}],
          temperature: 0.3, max_tokens: 1400,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)
      const raw = json.choices?.[0]?.message?.content || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      setAnalysis(safeParseJSON(jsonMatch[0]))
      setPhase('result')
    } catch (err) {
      console.error('Aeva Lens error:', err)
      setErrorMsg(err.message || 'Unknown error')
      setPhase('error')
    }
  }, [file, hasSelection, selection])

  /* ── Hotspot click → link to variable ── */
  const handleHotspotClick = (hs) => {
    const isActive = activeHotspot?.id === hs.id
    setActiveHotspot(isActive ? null : hs)
    setHighlightedVar(isActive ? null : (hs.linkedVar || null))
  }

  /* ── Add to Study Guide ── */
  const handleAdd = () => {
    if (addState !== 'idle') return
    setAddState('adding')
    setTimeout(() => {
      onInsightReady({
        topic: analysis.topic,
        coreInsight: analysis.coreInsight,
        strugglePoint: analysis.strugglePoint,
        explanation: analysis.syntaxCard
          ? `Pattern: ${analysis.syntaxCard.pattern}. Conditions: ${analysis.syntaxCard.conditions?.join(', ')}`
          : '',
        steps: (analysis.steps || []).map(s => typeof s === 'string' ? s : `${s.verb}: ${s.title} — ${s.body}`),
        variables: analysis.variables || [],
        timestamp: Date.now(),
      })
      setAddState('done')
      setTimeout(onClose, 900)
    }, 600)
  }

  /* ── Reset to select ── */
  const resetToSelect = () => {
    setPhase('select'); setSelection(null); setCroppedSrc(null)
    setAnalysis(null); setActiveHotspot(null); setHighlightedVar(null)
    setRevealedSteps(new Set()); setAddState('idle'); setErrorMsg('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(2,4,18,0.90)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          width: '100%', maxWidth: phase === 'result' ? 940 : 580, maxHeight: '92vh',
          borderRadius: 24, overflow: 'hidden',
          background: 'linear-gradient(160deg, #07091c 0%, #0d0f26 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', flexDirection: phase === 'result' ? 'row' : 'column',
          transition: 'max-width 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* ── Left: image panel ── */}
        <div
          ref={imgContainerRef}
          onMouseDown={phase === 'select' ? onDragStart : undefined}
          onMouseMove={phase === 'select' ? onDragMove : undefined}
          onMouseUp={phase === 'select' ? onDragEnd : undefined}
          onTouchStart={phase === 'select' ? onDragStart : undefined}
          onTouchMove={phase === 'select' ? onDragMove : undefined}
          onTouchEnd={phase === 'select' ? onDragEnd : undefined}
          style={{ position: 'relative', flex: phase === 'result' ? '0 0 44%' : '1', minHeight: 280, overflow: 'hidden', background: '#000', cursor: phase === 'select' ? 'crosshair' : 'default', userSelect: 'none' }}
        >
          {/* Image: cropped in result, full otherwise */}
          {(phase === 'result' && croppedSrc)
            ? <img src={croppedSrc} alt="Selected region" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '92vh', pointerEvents: 'none' }} />
            : imgSrc && <img ref={imgRef} src={imgSrc} alt="Uploaded" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '92vh', pointerEvents: 'none' }} />
          }

          {/* SELECT mode UI */}
          {phase === 'select' && (<>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(180deg, rgba(7,9,28,0.85) 0%, transparent 100%)', display: 'flex', alignItems: 'center', gap: 7, pointerEvents: 'none' }}>
              <Crop size={12} color="rgba(0,200,255,0.75)" strokeWidth={2.5} />
              <span style={{ fontSize: 11.5, color: 'rgba(0,200,255,0.80)', fontWeight: 600, letterSpacing: '0.04em' }}>Drag to select a question</span>
            </div>
            {selRect && (
              <div style={{ position: 'absolute', ...selRect, border: '2px solid #00C8FF', background: 'rgba(0,200,255,0.10)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.40)', pointerEvents: 'none' }} />
            )}
            <AnimatePresence>
              {hasSelection && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  onClick={e => { e.stopPropagation(); handleAnalyse() }}
                  style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 99, background: '#00C8FF', border: 'none', color: '#07091c', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", boxShadow: '0 4px 20px rgba(0,200,255,0.45)', whiteSpace: 'nowrap' }}
                >
                  <Scan size={13} strokeWidth={2.5} />Analyse selection
                </motion.button>
              )}
            </AnimatePresence>
            {!hasSelection && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                onClick={e => { e.stopPropagation(); handleAnalyse() }}
                style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '7px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", whiteSpace: 'nowrap' }}
              >or analyse whole image</motion.button>
            )}
          </>)}

          {/* SCANNING beam */}
          {phase === 'scanning' && (<>
            <ScanBeam />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,100,255,0.03)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 16px', background: 'linear-gradient(0deg, rgba(7,9,28,0.95) 0%, transparent 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,200,255,0.2)', borderTopColor: '#00C8FF' }} />
              <span style={{ fontSize: 12.5, color: 'rgba(0,200,255,0.80)', fontWeight: 600, letterSpacing: '0.06em' }}>ANALYSING…</span>
            </div>
          </>)}

          {/* RESULT: hotspot dots */}
          {phase === 'result' && analysis?.hotspots?.map(hs => (
            <HotspotDot key={hs.id} hotspot={hs} active={activeHotspot?.id === hs.id} linked={highlightedVar === hs.linkedVar && !!hs.linkedVar} onClick={() => handleHotspotClick(hs)} />
          ))}

          {/* RESULT: select-another pill */}
          {phase === 'result' && (
            <button onClick={resetToSelect} style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
              <Crop size={11} strokeWidth={2.5} />Select another question
            </button>
          )}

          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </button>
        </div>

        {/* ── Right: analysis panel (glassmorphism) ── */}
        <AnimatePresence>
          {phase === 'result' && analysis && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.35 }}
              style={{
                flex: 1, overflowY: 'auto', padding: '20px 18px',
                display: 'flex', flexDirection: 'column', gap: 12,
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(7,9,28,0.60)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Topic badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', fontSize: 11, fontWeight: 700, color: '#67E8F9', letterSpacing: '0.05em' }}>{analysis.topic}</div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Aeva Lens</span>
              </div>

              {/* Core insight */}
              <InfoCard color="rgba(99,102,241,0.22)" border="rgba(99,102,241,0.28)" label="Core Insight" labelColor="rgba(165,180,252,0.65)">
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{mathify(analysis.coreInsight)}</span>
              </InfoCard>

              {/* Expert Tip */}
              <InfoCard color="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.22)" label="Expert Tip" labelColor="rgba(252,165,165,0.65)">
                <span style={{ fontSize: 13, color: 'rgba(255,200,200,0.90)', lineHeight: 1.55 }}>{mathify(analysis.expertTip || analysis.strugglePoint)}</span>
              </InfoCard>

              {/* Syntax pattern card */}
              {analysis.syntaxCard && <SyntaxCard card={analysis.syntaxCard} />}

              {/* Variables */}
              {analysis.variables?.length > 0 && (
                <div>
                  <SectionLabel>Variables</SectionLabel>
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {analysis.variables.map((v, i) => (
                      <VariableRow
                        key={v.symbol}
                        v={v} index={i}
                        total={analysis.variables.length}
                        highlighted={highlightedVar === v.symbol}
                        onClick={() => {
                          const next = highlightedVar === v.symbol ? null : v.symbol
                          setHighlightedVar(next)
                          // also light up the linked hotspot
                          const hs = analysis.hotspots?.find(h => h.linkedVar === v.symbol)
                          setActiveHotspot(hs && next ? hs : null)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Hotspot detail panel */}
              <AnimatePresence>
                {activeHotspot && (
                  <motion.div key={activeHotspot.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 2 }}
                    style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.22)' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(103,232,249,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>📍 {activeHotspot.label}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(207,250,254,0.80)', lineHeight: 1.55 }}>{mathify(activeHotspot.detail)}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interactive step cards */}
              {analysis.steps?.length > 0 && (
                <div>
                  <SectionLabel>How to Approach It</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analysis.steps.map((step, i) => (
                      <StepCard
                        key={i} step={step} index={i}
                        revealed={revealedSteps.has(i)}
                        onReveal={() => setRevealedSteps(prev => new Set([...prev, i]))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Study Guide */}
              <motion.button
                whileHover={addState === 'idle' ? { scale: 1.02, y: -1 } : {}}
                whileTap={addState === 'idle' ? { scale: 0.97 } : {}}
                onClick={handleAdd}
                style={{
                  marginTop: 4, padding: '12px 16px', borderRadius: 14, cursor: addState === 'idle' ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: addState === 'done'
                    ? 'linear-gradient(135deg, rgba(74,222,128,0.22) 0%, rgba(34,197,94,0.18) 100%)'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.18) 100%)',
                  border: addState === 'done' ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(139,143,255,0.32)',
                  color: addState === 'done' ? '#86EFAC' : '#C4B5FD',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'background 0.4s, border 0.4s, color 0.4s',
                }}
              >
                <AnimatePresence mode="wait">
                  {addState === 'idle' && (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Plus size={13} strokeWidth={2.5} />Add to Study Guide
                    </motion.span>
                  )}
                  {addState === 'adding' && (
                    <motion.span key="adding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(196,181,253,0.2)', borderTopColor: '#C4B5FD' }} />
                      Saving…
                    </motion.span>
                  )}
                  {addState === 'done' && (
                    <motion.span key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={13} strokeWidth={2.5} />Added to Study Guide
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {phase === 'error' && (
          <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Couldn't analyse this image</div>
            {errorMsg && <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.75)', fontFamily: 'monospace', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '6px 12px', maxWidth: 320, wordBreak: 'break-word' }}>{errorMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPhase('select'); setErrorMsg('') }} style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', color: '#67E8F9', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Try again</button>
              <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>Close</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ─── Sub-components ─── */

function InfoCard({ color, border, label, labelColor, children }) {
  return (
    <div style={{ padding: '11px 13px', borderRadius: 12, background: color, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: labelColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>
}

/* ─── CSS radical renderer ─── */
function splitOnRadicals(text) {
  const parts = []
  let i = 0, start = 0
  while (i < text.length) {
    if (text[i] === '√' && text[i + 1] === '(') {
      if (i > start) parts.push({ type: 'text', content: text.slice(start, i) })
      let depth = 0, j = i + 1
      while (j < text.length) {
        if (text[j] === '(') depth++
        else if (text[j] === ')') { depth--; if (depth === 0) break }
        j++
      }
      parts.push({ type: 'radical', content: text.slice(i + 2, j) })
      start = j + 1; i = j + 1
    } else { i++ }
  }
  if (start < text.length) parts.push({ type: 'text', content: text.slice(start) })
  return parts
}

function MathText({ children, style = {} }) {
  if (!children) return null
  const parts = splitOnRadicals(String(children))
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.type === 'text'
          ? <span key={i}>{p.content}</span>
          : (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
              <span style={{ fontSize: '1.05em', lineHeight: 1, marginRight: 1 }}>√</span>
              <span style={{ borderTop: '1.5px solid currentColor', paddingTop: 1, paddingLeft: 2, paddingRight: 3, lineHeight: 1.25 }}>
                <MathText>{p.content}</MathText>
              </span>
            </span>
          )
      )}
    </span>
  )
}

/* ─── Factor pairs for predictive variable HUD ─── */
function getFactorPairs(val) {
  const n = parseInt(val)
  if (!n || n < 4 || n > 9999 || n === n * 1 && (n === 2 || n === 3)) return []
  const pairs = []
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0 && i !== n / i) pairs.push([i, n / i])
  }
  return pairs
}

function SyntaxCard({ card }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.20)' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(103,232,249,0.60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Pattern</div>
      <div style={{ fontSize: 15, color: '#67E8F9', textAlign: 'center', padding: '6px 0 10px', letterSpacing: '0.02em' }}>
        <MathText style={{ fontFamily: 'monospace' }}>{mathify(card.pattern)}</MathText>
      </div>
      {card.conditions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {card.conditions.map((c, i) => (
            <div key={i} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.22)', fontSize: 11.5, fontFamily: 'monospace', color: 'rgba(103,232,249,0.85)' }}>
              <MathText>{mathify(c)}</MathText>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VariableRow({ v, index, total, highlighted, onClick }) {
  const factorPairs = getFactorPairs(v.value)
  return (
    <motion.div
      onClick={onClick}
      animate={highlighted ? { backgroundColor: 'rgba(99,102,241,0.18)' } : { backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
        borderBottom: index < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        outline: highlighted ? '1px solid rgba(99,102,241,0.40)' : '1px solid transparent',
        borderRadius: index === 0 ? '10px 10px 0 0' : index === total - 1 ? '0 0 10px 10px' : 0,
        transition: 'outline 0.2s',
        flexWrap: 'wrap',
      }}
    >
      {/* symbol = value */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 60 }}>
        <code style={{ fontSize: 13, fontFamily: 'monospace', color: '#FBBF24', fontWeight: 800 }}>{v.symbol}</code>
        {v.value && v.value !== '?' && <>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>=</span>
          <code style={{ fontSize: 13, fontFamily: 'monospace', color: highlighted ? '#A5B4FC' : '#93C5FD', fontWeight: 700 }}>{v.value}</code>
        </>}
        {(!v.value || v.value === '?') && <code style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.28)' }}>= ?</code>}
      </div>

      {/* meaning */}
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, flex: 1 }}>{v.meaning}</span>

      {/* Factor pills */}
      {factorPairs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Factors</span>
          {factorPairs.slice(0, 3).map(([a, b], i) => (
            <div key={i} style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', fontSize: 10.5, fontFamily: 'monospace', color: '#FCD34D', fontWeight: 700 }}>
              {a}×{b}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function StepCard({ step, index, revealed, onReveal }) {
  const isString = typeof step === 'string'
  const verb  = isString ? `STEP ${index + 1}` : step.verb?.toUpperCase()
  const title = isString ? step : step.title
  const body  = isString ? '' : step.body
  const formula = isString ? '' : step.formula
  const proTip  = isString ? '' : step.proTip

  return (
    <motion.div
      animate={{
        background: revealed ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.025)',
        borderColor: revealed ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)',
        opacity: revealed ? 1 : 0.72,
      }}
      transition={{ duration: 0.3 }}
      style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '10px 12px', overflow: 'hidden' }}
    >
      {/* Verb header */}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: revealed ? '#A5B4FC' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 3 }}>
        {verb}
      </div>

      {/* Step title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, marginBottom: body ? 4 : 0 }}>
        {mathify(title)}
      </div>

      {/* Body */}
      {body && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>{mathify(body)}</div>}

      {/* Formula — revealed only */}
      <AnimatePresence>
        {revealed && formula && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)', textAlign: 'center', fontSize: 14, color: '#C4B5FD', letterSpacing: '0.03em' }}>
              <MathText style={{ fontFamily: 'monospace' }}>{mathify(formula)}</MathText>
            </div>
            {proTip && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                style={{ marginTop: 6, fontSize: 10.5, color: 'rgba(165,180,252,0.65)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                💡 {proTip}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show Me button — only when not yet revealed */}
      {!revealed && (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onReveal}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <ChevronRight size={10} strokeWidth={2.5} />Show Me
        </motion.button>
      )}
    </motion.div>
  )
}

function ScanBeam() {
  return (
    <motion.div
      style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #00C8FF 40%, #0080FF 60%, transparent 100%)', boxShadow: '0 0 16px 4px rgba(0,180,255,0.45)', pointerEvents: 'none', zIndex: 10 }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function HotspotDot({ hotspot, active, linked, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.90 }}
      style={{
        position: 'absolute', left: `${hotspot.x}%`, top: `${hotspot.y}%`, transform: 'translate(-50%, -50%)',
        width: 22, height: 22, borderRadius: '50%',
        background: active ? 'rgba(99,102,241,0.30)' : 'rgba(0,200,255,0.15)',
        border: `2px solid ${active ? '#818CF8' : 'rgba(0,200,255,0.60)'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, backdropFilter: 'blur(4px)',
      }}
      animate={!active ? { boxShadow: ['0 0 0 0 rgba(0,200,255,0.5)', '0 0 0 8px rgba(0,200,255,0)', '0 0 0 0 rgba(0,200,255,0)'] } : { boxShadow: ['0 0 0 0 rgba(99,102,241,0.6)', '0 0 0 10px rgba(99,102,241,0)', '0 0 0 0 rgba(99,102,241,0)'] }}
      transition={{ duration: 1.8, repeat: Infinity }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#818CF8' : 'rgba(0,200,255,0.80)' }} />
    </motion.button>
  )
}

/* ─── Canvas crop ─── */
async function cropImageBlob(file, selection, imgEl) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const natW = imgEl.naturalWidth, natH = imgEl.naturalHeight
    const dispW = imgEl.clientWidth,  dispH = imgEl.clientHeight
    const scale = Math.min(dispW / natW, dispH / natH)
    const rendW = natW * scale, rendH = natH * scale
    const offX = (dispW - rendW) / 2, offY = (dispH - rendH) / 2
    const x1p = Math.min(selection.x1, selection.x2) / 100
    const y1p = Math.min(selection.y1, selection.y2) / 100
    const x2p = Math.max(selection.x1, selection.x2) / 100
    const y2p = Math.max(selection.y1, selection.y2) / 100
    const sx = Math.max(0, ((x1p * dispW) - offX) / scale)
    const sy = Math.max(0, ((y1p * dispH) - offY) / scale)
    const sw = Math.min(natW - sx, ((x2p - x1p) * dispW) / scale)
    const sh = Math.min(natH - sy, ((y2p - y1p) * dispH) / scale)
    if (sw <= 0 || sh <= 0) { resolve(null); return }
    canvas.width = sw; canvas.height = sh
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); canvas.toBlob(b => resolve(b), 'image/jpeg', 0.95) }
    img.src = URL.createObjectURL(file)
  })
}

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
    try { return JSON.parse(fixed) } catch { throw new Error('Could not parse model response as JSON') }
  }
}
