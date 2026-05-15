/**
 * Aeva Lens — Vision-to-Logic
 * Drag-to-select region → Groq Llama 4 Scout analyses it.
 * Features: modular step cards, Show Me expand, predictive variables,
 *           syntax pattern card, hotspot↔variable linking, glassmorphism.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Crop, Scan, CheckCircle, ChevronRight } from 'lucide-react'
import { useLibraryStore } from './libraryStore'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const ANALYSIS_PROMPT = `You are an expert tutor analyzing a student's work image. Be thorough and genuinely helpful across any subject — math, science, economics, history, language, code, diagrams.

Do NOT just solve it — teach the method so the student can reproduce it.

STRICT JSON RULES:
- Output ONLY a raw JSON object. No markdown, no fences, no text outside braces.
- NO backslashes anywhere. Write sqrt(x), x^2, a/b — never LaTeX.
- All strings ONE LINE. ASCII only. No newlines inside strings.

HOTSPOT ANCHORING: x and y are percentage coordinates from the top-left of the image. Pin to actual visible elements.

Output EXACTLY this structure:
{
  "topic": "2-4 word topic name",
  "subjectTags": ["subject area", "subtopic", "technique name"],
  "confidence": 85,
  "coreInsight": "One sentence capturing the key idea — the WHY, not just what to do.",
  "expertTip": "Goal: [specific actionable instruction for this exact problem]. Name the technique and why it works here.",
  "alternativeApproach": "One sentence describing a completely different valid method to solve or analyse this. Name the technique.",
  "syntaxCard": {
    "pattern": "the general pattern or rule in plain notation — no backslashes",
    "conditions": ["condition 1", "condition 2"]
  },
  "variables": [
    { "symbol": "a", "value": "7", "meaning": "what this symbol represents in context" }
  ],
  "steps": [
    {
      "verb": "IDENTIFY",
      "title": "Identify the Structure",
      "body": "2-3 sentences. Explain what the student needs to recognise and why. Connect to the general pattern.",
      "formula": "key formula or expression for this step, plain notation",
      "worked": "the actual calculation using values from this image",
      "proTip": "The single most common mistake at this step and how to avoid it."
    }
  ],
  "followUp": ["Try: [first practice problem closely related to this one]", "Challenge: [harder variant that extends the same skill]"],
  "hotspots": [
    { "id": "h1", "x": 55, "y": 35, "label": "Short label", "detail": "2-3 sentences: what this term is, its role, what the student should do with it.", "linkedVar": "a" }
  ]
}

Rules:
- steps: 4-5 steps, each body 2-3 sentences with real reasoning.
- worked: use the actual numbers/values visible in the image, not abstract variables.
- confidence: 0-100. How certain you are this analysis is correct given image clarity and your subject coverage.
- subjectTags: 2-4 tags from broad to specific, e.g. ["Mathematics", "Algebra", "Radical Simplification"].
- followUp: exactly 2 items — one practice, one challenge. Make them specific and solvable.
- hotspots: 2-3, pinned to specific visible elements.`

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
export default function AevaLens({ file, onClose, onInsightReady, preloadedSession = null }) {
  const { saveSession } = useLibraryStore()
  const [phase, setPhase] = useState(preloadedSession ? 'result' : 'select')
  const [analysis, setAnalysis] = useState(preloadedSession?.analysis || null)
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
          temperature: 0.3, max_tokens: 2400,
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
      // Auto-save to library
      if (parsed) {
        saveSession({
          type: 'lens',
          topic: parsed.topic || 'Aeva Lens',
          coreInsight: parsed.coreInsight || '',
          pattern: parsed.syntaxCard?.pattern || null,
          variables: parsed.variables || [],
          steps: parsed.steps || [],
          imageData: croppedSrc || null,
          rawText: null,
          analysis: parsed,
        })
      }
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
              {/* Topic badge + subject tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(0,200,255,0.10)', border: '1px solid rgba(0,200,255,0.25)', fontSize: 11, fontWeight: 700, color: '#67E8F9', letterSpacing: '0.05em' }}>{analysis.topic}</div>
                {analysis.subjectTags?.slice(1).map((tag, i) => (
                  <div key={i} style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>{tag}</div>
                ))}
              </div>

              {/* Confidence bar */}
              {analysis.confidence != null && (() => {
                const c = analysis.confidence
                const col = c >= 80 ? '#4ADE80' : c >= 60 ? '#FBBF24' : '#F87171'
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Analysis Confidence</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: col }}>{c}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${c}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${col}88, ${col})` }} />
                    </div>
                  </div>
                )
              })()}

              {/* Core insight */}
              <InfoCard color="rgba(99,102,241,0.22)" border="rgba(99,102,241,0.28)" label="Core Insight" labelColor="rgba(165,180,252,0.65)">
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{mathify(analysis.coreInsight)}</span>
              </InfoCard>

              {/* Expert Tip */}
              <InfoCard color="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.22)" label="Expert Tip" labelColor="rgba(252,165,165,0.65)">
                <span style={{ fontSize: 13, color: 'rgba(255,200,200,0.90)', lineHeight: 1.55 }}>{mathify(analysis.expertTip || analysis.strugglePoint)}</span>
              </InfoCard>

              {/* Alternative approach */}
              {analysis.alternativeApproach && (
                <InfoCard color="rgba(245,158,11,0.07)" border="rgba(245,158,11,0.20)" label="Alternative Approach" labelColor="rgba(253,230,138,0.60)">
                  <span style={{ fontSize: 12.5, color: 'rgba(254,243,199,0.82)', lineHeight: 1.60 }}>{mathify(analysis.alternativeApproach)}</span>
                </InfoCard>
              )}

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

              {/* Follow-up practice */}
              {analysis.followUp?.length > 0 && (
                <div>
                  <SectionLabel>Practice Next</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {analysis.followUp.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 12px', borderRadius: 10, background: i === 0 ? 'rgba(74,222,128,0.06)' : 'rgba(99,102,241,0.08)', border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.18)' : 'rgba(99,102,241,0.20)'}` }}>
                        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{i === 0 ? '📝' : '🔥'}</span>
                        <span style={{ fontSize: 12.5, color: i === 0 ? 'rgba(187,247,208,0.85)' : 'rgba(196,181,253,0.85)', lineHeight: 1.55, fontFamily: 'monospace' }}>
                          {mathify(item)}
                        </span>
                      </div>
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
  const verb    = isString ? `STEP ${index + 1}` : (step.verb?.toUpperCase() || `STEP ${index + 1}`)
  const title   = isString ? step : step.title
  const body    = isString ? '' : step.body
  const formula = isString ? '' : step.formula
  const worked  = isString ? '' : step.worked
  const proTip  = isString ? '' : step.proTip

  // Verb colour cycles through accent palette
  const VERB_COLORS = [
    { bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.40)', text: '#A5B4FC' },
    { bg: 'rgba(0,200,255,0.12)',  border: 'rgba(0,200,255,0.32)',  text: '#67E8F9' },
    { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.32)', text: '#FCD34D' },
    { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.28)', text: '#86EFAC' },
    { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.28)',  text: '#FCA5A5' },
  ]
  const vc = VERB_COLORS[index % VERB_COLORS.length]

  return (
    <motion.div
      layout
      animate={{
        background: revealed ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
        borderColor: revealed ? 'rgba(99,102,241,0.30)' : 'rgba(255,255,255,0.08)',
      }}
      transition={{ layout: { type: 'spring', stiffness: 400, damping: 32 }, duration: 0.25 }}
      style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
    >
      {/* Header row — always visible */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Large verb pill */}
        <div style={{
          flexShrink: 0, padding: '4px 11px', borderRadius: 99,
          background: vc.bg, border: `1px solid ${vc.border}`,
          fontSize: 10, fontWeight: 900, letterSpacing: '0.12em',
          color: vc.text, textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          {verb}
        </div>

        {/* Title */}
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35 }}>
          {mathify(title)}
        </div>

        {/* Expand toggle */}
        {!revealed && (
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={onReveal}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 99,
              background: vc.bg, border: `1px solid ${vc.border}`,
              color: vc.text, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            Show Me <ChevronRight size={10} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Expanded content — springs open */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Body explanation */}
              {body && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>
                  {mathify(body)}
                </div>
              )}

              {/* Formula */}
              {formula && (
                <div style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)', textAlign: 'center', fontSize: 15, color: '#C4B5FD', letterSpacing: '0.03em' }}>
                  <MathText style={{ fontFamily: 'monospace' }}>{mathify(formula)}</MathText>
                </div>
              )}

              {/* Worked example with actual numbers */}
              {worked && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  style={{ padding: '8px 12px', borderRadius: 10, background: `${vc.bg}`, border: `1px solid ${vc.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: vc.text, opacity: 0.7, marginBottom: 4 }}>Worked</div>
                  <div style={{ fontSize: 13, color: vc.text, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    <MathText>{mathify(worked)}</MathText>
                  </div>
                </motion.div>
              )}

              {/* Pro tip */}
              {proTip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                  style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, display: 'flex', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{proTip}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
