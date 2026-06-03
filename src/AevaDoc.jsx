/**
 * Aeva Doc — Document Study Room
 * Upload any homework, task sheet, or document image.
 * Aeva scans it and tutors you through it via a side chat.
 *
 * Different from Lens:
 *   Lens = single maths problem → solve step-by-step or analyse structure
 *   AevaDoc = whole document/homework → free tutoring conversation alongside it
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, FileText, MessageSquare, Send, Loader,
  Star, AlertCircle, BookOpen, RotateCcw, ChevronDown,
} from 'lucide-react'

const GROQ_KEY  = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'
const VISION    = 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT      = 'llama-3.3-70b-versatile'

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SCAN_PROMPT = `You are scanning a student's document or homework.
Analyse the image carefully and return ONLY a JSON object with these fields:
{
  "type": "worksheet|exam|problem_set|essay|notes|textbook|revision|other",
  "subject": "exact subject name e.g. Mathematics, Physics, English Literature",
  "level": "Primary|GCSE|A-Level|University|Unknown",
  "summary": "2-3 sentences describing what this document contains and what the student needs to do",
  "allText": "complete verbatim transcription of every piece of text in the document",
  "questions": ["full text of question 1", "full text of question 2"],
  "keyTerms": ["important term 1", "important term 2"],
  "hasDiagrams": true or false,
  "diagramNotes": "brief description of any diagrams, graphs, or tables if present"
}
Return only the JSON. No explanation before or after.`

function buildSystemPrompt(scanCtx, name) {
  const first = name?.split(' ')[0] || 'the student'
  if (!scanCtx) {
    return `You are Aeva, an expert AI tutor helping ${first} work through a document. Guide them, explain concepts, and help them understand without just giving all the answers. Keep responses concise — 2-5 sentences unless more detail is needed. Use markdown for structure.`
  }
  const q = scanCtx.questions?.length > 0
    ? `\nQuestions/tasks in the document:\n${scanCtx.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''
  const terms = scanCtx.keyTerms?.length > 0
    ? `\nKey terms: ${scanCtx.keyTerms.join(', ')}`
    : ''
  const text = scanCtx.allText ? `\nFull document text:\n${scanCtx.allText}` : ''

  return `You are Aeva, an expert AI tutor helping ${first} work through their document.

Document: ${scanCtx.type} — ${scanCtx.subject} (${scanCtx.level})
Summary: ${scanCtx.summary}${q}${terms}${text}
${scanCtx.hasDiagrams ? `\nDiagrams/visuals: ${scanCtx.diagramNotes}` : ''}

Your role:
- Guide ${first} through the content without just giving all the answers upfront
- Explain concepts that appear in the document using clear language
- Reference specific parts of the document ("In question 2…", "The diagram shows…")
- Adjust depth to the level: ${scanCtx.level}
- Keep responses focused — 2-5 sentences unless more detail is genuinely needed
- Use markdown (bold, bullets) for clarity
- If asked to check an answer, do so honestly and explain why`
}

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function* streamGroqDoc(apiMessages, model) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model, messages: apiMessages, max_tokens: 700, temperature: 0.62, stream: true }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const data = line.replace(/^data: /, '').trim()
      if (!data || data === '[DONE]') continue
      try {
        const token = JSON.parse(data).choices?.[0]?.delta?.content || ''
        if (token) yield token
      } catch {}
    }
  }
}

// ─── Suggestion chips per doc type ───────────────────────────────────────────

function getChips(scanCtx) {
  if (!scanCtx) return [
    "What do I need to do in this document?",
    "Walk me through this step by step",
    "What are the key concepts I need to know?",
    "Quiz me on this content",
  ]
  const type = scanCtx.type || ''
  if (type === 'problem_set' || type === 'worksheet' || type === 'exam') return [
    "Walk me through the first question",
    "What method should I use here?",
    "Check my understanding before I start",
    "Which questions look hardest?",
  ]
  if (type === 'essay') return [
    "What's the key argument in this essay prompt?",
    "How should I structure my response?",
    "What evidence would strengthen this?",
    "Help me plan my introduction",
  ]
  if (type === 'notes' || type === 'textbook' || type === 'revision') return [
    "Summarise the key points",
    "What's most important to remember?",
    "Quiz me on this",
    "Explain the hardest concept here",
  ]
  return [
    "What do I need to do in this document?",
    "Walk me through this step by step",
    "What are the key concepts I need to know?",
    "Quiz me on this content",
  ]
}

// ─── Simple markdown renderer ─────────────────────────────────────────────────

function DocMarkdown({ text }) {
  const lines = text.split('\n')
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.90)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <div key={i} style={{ fontWeight: 800, fontSize: 14, marginTop: 10, marginBottom: 2, color: '#fff' }}>{line.slice(4)}</div>
        if (line.startsWith('## '))  return <div key={i} style={{ fontWeight: 800, fontSize: 15, marginTop: 10, marginBottom: 2, color: '#fff' }}>{line.slice(3)}</div>
        if (line.startsWith('# '))   return <div key={i} style={{ fontWeight: 900, fontSize: 16, marginTop: 10, marginBottom: 4, color: '#fff' }}>{line.slice(2)}</div>
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 3 }}>
              <span style={{ color: '#8B8FFF', flexShrink: 0, marginTop: 1 }}>•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          )
        }
        if (/^\d+\. /.test(line)) {
          const match = line.match(/^(\d+)\. (.*)/)
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 3 }}>
              <span style={{ color: '#8B8FFF', flexShrink: 0, minWidth: 16 }}>{match[1]}.</span>
              <span>{renderInline(match[2])}</span>
            </div>
          )
        }
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        return <div key={i} style={{ marginTop: 1 }}>{renderInline(line)}</div>
      })}
    </div>
  )
}

function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+?)\*\*|`(.+?)`)/g
  let last = 0, m, k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>)
    if (m[2]) parts.push(<strong key={k++} style={{ fontWeight: 700, color: '#fff' }}>{m[2]}</strong>)
    else if (m[3]) parts.push(<code key={k++} style={{ fontFamily: 'monospace', fontSize: '0.87em', background: 'rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 5px' }}>{m[3]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>)
  return parts.length > 0 ? parts : text
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ onFile, dragOver, setDragOver, fileInputRef }) {
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <motion.div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      animate={{ borderColor: dragOver ? 'rgba(99,102,241,0.80)' : 'rgba(255,255,255,0.12)', background: dragOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)' }}
      transition={{ duration: 0.2 }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 20,
        cursor: 'pointer', userSelect: 'none', gap: 16, padding: 40,
      }}
    >
      <motion.div
        animate={{ y: dragOver ? -6 : 0 }} transition={{ type: 'spring', stiffness: 300 }}
        style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(99,102,241,0.14)', border: '1.5px solid rgba(99,102,241,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Upload size={26} color="#8B8FFF" />
      </motion.div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Drop your document here
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', lineHeight: 1.6 }}>
          Photos of homework, task sheets, revision notes<br />
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>JPG · PNG · WebP · PDF</span>
        </div>
      </div>

      <motion.div
        whileHover={{ scale: 1.04, background: 'rgba(99,102,241,0.30)' }}
        whileTap={{ scale: 0.97 }}
        style={{ padding: '10px 22px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.40)', color: '#A5B4FC', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
      >
        Browse files
      </motion.div>

      {/* Distinction note */}
      <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'center', lineHeight: 1.6 }}>
          <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 600 }}>Lens</span> solves a single maths problem •{' '}
          <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 600 }}>Docs</span> tutors you through a whole document
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AevaDoc({ onClose, name = 'Student' }) {
  const [file, setFile]           = useState(null)
  const [fileUrl, setFileUrl]     = useState(null)
  const [isPdf, setIsPdf]         = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [scanCtx, setScanCtx]     = useState(null)
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [thinking, setThinking]   = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [chipsUsed, setChipsUsed] = useState(false)
  const [docCollapsed, setDocCollapsed] = useState(false)

  const fileInputRef = useRef(null)
  const inputRef     = useRef(null)
  const bottomRef    = useRef(null)
  const base64Ref    = useRef(null) // store image base64 for context
  const mimeRef      = useRef(null)

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ── Handle file ──────────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setFile(f)
    setFileUrl(url)
    setScanCtx(null)
    setMessages([])
    setChipsUsed(false)
    base64Ref.current = null
    mimeRef.current = null

    const pdf = f.type === 'application/pdf'
    setIsPdf(pdf)

    if (pdf) {
      // PDF: display in iframe, Aeva works from description
      setScanCtx({ type: 'pdf', subject: 'Document', level: 'Unknown', summary: `PDF: ${f.name}` })
      setMessages([{
        role: 'assistant',
        content: `I can see **${f.name}** on the left. I can't read PDFs directly, but I can see it displayed there — tell me which section or question you need help with, or type out what it says and I'll explain.`,
      }])
    } else {
      // Image: scan via vision model
      scanImage(f)
    }
  }

  // ── Scan image ───────────────────────────────────────────────────────────────
  const scanImage = (f) => {
    setScanning(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const raw = e.target.result // data:image/...;base64,...
      const b64 = raw.split(',')[1]
      base64Ref.current = b64
      mimeRef.current   = f.type

      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({
            model: VISION,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: raw } },
                { type: 'text', text: SCAN_PROMPT },
              ],
            }],
            max_tokens: 1400,
            temperature: 0.2,
          }),
        })
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''

        let ctx
        try {
          const match = text.match(/\{[\s\S]*\}/)
          ctx = match ? JSON.parse(match[0]) : null
        } catch {
          ctx = null
        }

        if (ctx) {
          setScanCtx(ctx)
          const subj = ctx.subject || 'this document'
          const lvl  = ctx.level && ctx.level !== 'Unknown' ? ` (${ctx.level})` : ''
          const qCount = ctx.questions?.length > 0 ? ` I can see ${ctx.questions.length} question${ctx.questions.length > 1 ? 's' : ''}.` : ''
          setMessages([{
            role: 'assistant',
            content: `I've scanned your **${subj}${lvl}** — ${ctx.summary}${qCount} What would you like to work through first?`,
          }])
        } else {
          setScanCtx({ type: 'other', subject: 'Document', level: 'Unknown', summary: 'Could not fully parse — I can see the image.', allText: text })
          setMessages([{
            role: 'assistant',
            content: "I've got your document. What would you like help with?",
          }])
        }
      } catch (err) {
        console.error(err)
        setScanCtx({ type: 'other', subject: 'Document', level: 'Unknown', summary: 'Scan failed.' })
        setMessages([{
          role: 'assistant',
          content: "I've got your document. What would you like help with?",
        }])
      }
      setScanning(false)
    }
    reader.readAsDataURL(f)
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  const send = async (msg) => {
    const text = (msg || input).trim()
    if (!text || thinking || scanning) return
    setInput('')
    setChipsUsed(true)

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setThinking(true)

    // Build API messages
    const systemContent = buildSystemPrompt(scanCtx, name)
    const apiMessages = [{ role: 'system', content: systemContent }]

    // For image docs: include image in first user message for context on first call
    // On follow-ups use only text (scan context in system prompt is sufficient)
    const isFirstQuestion = updated.filter(m => m.role === 'user').length === 1
    if (!isPdf && base64Ref.current && isFirstQuestion) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeRef.current};base64,${base64Ref.current}` } },
          { type: 'text', text },
        ],
      })
    } else {
      // All subsequent messages: text only (scan context in system prompt has the full text)
      for (const m of updated) {
        apiMessages.push({ role: m.role, content: typeof m.content === 'string' ? m.content : text })
      }
    }

    const model = (!isPdf && isFirstQuestion && base64Ref.current) ? VISION : TEXT

    try {
      let reply = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const stream = streamGroqDoc(apiMessages, model)
      for await (const token of stream) {
        reply += token
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: reply }
          return next
        })
      }
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: "Something went wrong. Try again?" }
        return next
      })
    }

    setThinking(false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const chips = getChips(scanCtx)
  const showChips = !chipsUsed && messages.length === 1 && !thinking

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(6,7,20,0.97)',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,11,28,0.90)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #E9A364 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(45,48,142,0.45)' }}>
            <Star size={12} color="white" fill="white" />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>Aeva </span>
            <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.03em' }}>Docs</span>
          </div>
          {scanCtx && !scanning && (
            <div style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>
                {scanCtx.subject}{scanCtx.level && scanCtx.level !== 'Unknown' ? ` · ${scanCtx.level}` : ''}
              </span>
            </div>
          )}
          {scanning && (
            <div style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.25)', borderTopColor: '#6366F1' }}
              />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>Scanning…</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {file && (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setFile(null); setFileUrl(null); setScanCtx(null); setMessages([]) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <RotateCcw size={11} /> New document
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} />
          </motion.button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: Document panel ──────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {!docCollapsed && (
            <motion.div
              key="doc-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: file ? '55%' : '50%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              style={{
                flexShrink: 0, overflow: 'hidden',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />

              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
                {!file ? (
                  /* Upload zone */
                  <UploadZone onFile={handleFile} dragOver={dragOver} setDragOver={setDragOver} fileInputRef={fileInputRef} />
                ) : isPdf ? (
                  /* PDF viewer */
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
                      <AlertCircle size={13} color="#F59E0B" />
                      <span style={{ fontSize: 11.5, color: '#FCD34D', fontWeight: 600 }}>Aeva can't read PDFs directly — describe what you need help with in the chat</span>
                    </div>
                    <embed
                      src={fileUrl}
                      type="application/pdf"
                      style={{ flex: 1, border: 'none', borderRadius: 12, minHeight: 400, background: 'white' }}
                    />
                  </div>
                ) : (
                  /* Image viewer */
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto' }}>
                    {scanning ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0.7, minHeight: 300 }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                          style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.20)', borderTopColor: '#6366F1' }}
                        />
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Reading document…</span>
                      </div>
                    ) : (
                      <img
                        src={fileUrl}
                        alt="Uploaded document"
                        style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.50)', display: 'block' }}
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle (only when file loaded) */}
        {file && (
          <motion.button
            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
            onClick={() => setDocCollapsed(p => !p)}
            style={{
              flexShrink: 0, width: 18, alignSelf: 'stretch', background: 'rgba(255,255,255,0.03)',
              border: 'none', borderRight: '1px solid rgba(255,255,255,0.07)', cursor: 'col-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={docCollapsed ? 'Show document' : 'Hide document'}
          >
            <ChevronDown size={12} color="rgba(255,255,255,0.25)" style={{ transform: docCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
          </motion.button>
        )}

        {/* ── Right: Chat panel ────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

            {!file && (
              /* Empty state hint */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.5 }}>
                <FileText size={36} color="rgba(255,255,255,0.25)" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.50)', marginBottom: 4 }}>Upload a document to start</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>Aeva will read it and help you work through it</div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #2D308E 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Star size={11} color="white" fill="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%', padding: '11px 15px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.50))'
                    : 'rgba(255,255,255,0.07)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(99,102,241,0.40)'
                    : '1px solid rgba(255,255,255,0.09)',
                }}>
                  {msg.role === 'user'
                    ? <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, fontWeight: 500 }}>{msg.content}</span>
                    : <DocMarkdown text={msg.content || '…'} />
                  }
                </div>
              </div>
            ))}

            {/* Thinking dots (streaming handled inline, this is fallback) */}
            {thinking && messages[messages.length - 1]?.content === '' && (
              <div style={{ display: 'flex', gap: 5, padding: '4px 14px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }}
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.16 }} />
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Chips */}
          <AnimatePresence>
            {showChips && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                style={{ padding: '0 20px 10px', display: 'flex', flexWrap: 'wrap', gap: 8 }}
              >
                {chips.map(chip => (
                  <motion.button
                    key={chip}
                    whileHover={{ scale: 1.03, background: 'rgba(99,102,241,0.22)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => send(chip)}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#A5B4FC',
                      background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.28)',
                      borderRadius: 99, padding: '7px 14px', cursor: 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {chip}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div style={{ flexShrink: 0, padding: '10px 20px 24px' }}>
            <div style={{
              display: 'flex', gap: 10, alignItems: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.10)',
              borderRadius: 999, padding: '10px 10px 10px 18px',
              transition: 'border-color 0.2s',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={!file ? 'Upload a document first…' : scanning ? 'Scanning document…' : 'Ask about your document…'}
                disabled={!file || scanning || thinking}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: 400,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  opacity: !file || scanning ? 0.4 : 1,
                }}
              />
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => send()}
                disabled={!input.trim() || thinking || scanning || !file}
                style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  cursor: input.trim() && !thinking && !scanning && file ? 'pointer' : 'default',
                  background: input.trim() && !thinking && file
                    ? 'linear-gradient(145deg, #5c5fec 0%, #7c7fff 100%)'
                    : 'rgba(255,255,255,0.08)',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: input.trim() && !thinking && file ? '0 4px 14px rgba(92,95,236,0.35)' : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                {thinking
                  ? <Loader size={15} color="rgba(255,255,255,0.50)" />
                  : <Send size={14} color={input.trim() && file ? '#fff' : 'rgba(255,255,255,0.28)'} />
                }
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
