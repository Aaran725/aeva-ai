/**
 * Aeva Doc — Document Study Room
 * Upload any homework, task sheet, or document image.
 * Aeva scans it and tutors you through it via a side chat.
 *
 * Different from Lens:
 *   Lens = single maths problem → solve step-by-step or analyse structure
 *   AevaDoc = whole document/homework → free tutoring conversation alongside it
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import katex from 'katex'
import {
  X, Upload, FileText, Send, Loader,
  Star, AlertCircle, RotateCcw, ChevronDown, Palette,
} from 'lucide-react'
import { nextGroqKey as gKey, GROQ_URL } from './groqClient'
import { CHAT_THEMES } from './chatThemes'
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

const VISION = 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT   = 'llama-3.3-70b-versatile'

// ─── PDF text extraction ──────────────────────────────────────────────────────
async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages
  const pageLimit = Math.min(totalPages, 20)
  const pages = []
  for (let i = 1; i <= pageLimit; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ').replace(/\s{3,}/g, '  ')
    if (pageText.trim()) pages.push(`[Page ${i}]\n${pageText}`)
  }
  return { text: pages.join('\n\n'), totalPages }
}

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
- If asked to check an answer, do so honestly and explain why

Formatting — use these exact patterns (they render as rich visual cards):
- ## Section Title → purple divider heading
- > **Key Insight:** text → blue callout card
- > **Definition:** text → blue definition card
- > **Example:** text → yellow worked example card
- > **Tip:** text → green tip card
- > **Note:** text → purple note card
- > **Warning:** text → red warning card
- $$LaTeX$$ → large centred formula block (dark background)
- $LaTeX$ → inline rendered math
- 1. 2. 3. numbered list → coloured circle numbers
- - bullet list → coloured diamond bullets
- *question for student* → amber question card
- **Bold term** on its own line → section divider

Rules:
- Wrap ALL maths in LaTeX: inline with $...$ and display with $$...$$
- Use > **Label:** callout cards for key concepts, examples, tips
- Use 1. 2. 3. for steps (renders as beautiful coloured circles)
- Never write bare equations as plain text
- Keep responses focused — teach clearly, don't dump everything at once`
}

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function* streamGroqDoc(apiMessages, model) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gKey()}` },
    body: JSON.stringify({ model, messages: apiMessages, max_tokens: 1200, temperature: 0.62, stream: true }),
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

// ─── Contextual chips (persistent, refresh per turn) ─────────────────────────

function getContextualChips(scanCtx, messages) {
  if (!scanCtx) return []

  const lastAeva = [...messages].reverse().find(m => m.role === 'assistant')
  const lastText = (lastAeva?.content || '').toLowerCase()

  const chips = []

  // Context-aware first chip
  if (/step \d|next step/i.test(lastText)) {
    chips.push("What's the next step?")
  } else if (/\?/.test(lastText)) {
    chips.push("Can you give me an example?")
  } else if (/try|attempt|have a go/i.test(lastText)) {
    chips.push("Check my answer")
  } else {
    chips.push("Explain that differently")
  }

  // Doc-type second chip
  const type = scanCtx.type || ''
  if (type === 'problem_set' || type === 'worksheet' || type === 'exam') {
    chips.push("What method should I use?")
  } else if (type === 'essay') {
    chips.push("How should I structure my response?")
  } else if (type === 'notes' || type === 'revision') {
    chips.push("What's most important to remember?")
  } else {
    chips.push("Summarise the key points")
  }

  // Always-useful chips
  chips.push("Quiz me on this")
  chips.push("What do I need to know next?")

  return chips.slice(0, 4)
}

// ─── parseInline — matches MarkdownRenderer in App.jsx exactly ───────────────

const BULLET_COLORS = ['#818CF8','#34D399','#F472B6','#FBBF24','#60A5FA','#A78BFA']

function parseInline(text) {
  const parts = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    // Display math $$...$$
    const dblMatch = remaining.match(/^(.*?)\$\$([^$]+?)\$\$/)
    if (dblMatch) {
      if (dblMatch[1]) parts.push(<span key={key++}>{dblMatch[1]}</span>)
      try {
        const html = katex.renderToString(dblMatch[2].trim(), { throwOnError: false, displayMode: false })
        parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} style={{ verticalAlign: 'middle', display: 'inline-block', padding: '0 2px', fontSize: '1.15em', lineHeight: 1 }} />)
      } catch { parts.push(<span key={key++} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{dblMatch[2]}</span>) }
      remaining = remaining.slice(dblMatch[0].length); continue
    }
    // Inline math $...$
    const mathMatch = remaining.match(/^(.*?)\$([^$\n]+?)\$/)
    if (mathMatch) {
      const mc = mathMatch[2]
      const isMath = !(/^\d+[,\s]/.test(mc) || (mc.length > 25 && !/[\\^_=+\-/<>{}]/.test(mc) && (mc.match(/\s/g)||[]).length > 3))
      if (isMath) {
        if (mathMatch[1]) parts.push(<span key={key++}>{mathMatch[1]}</span>)
        try {
          const html = katex.renderToString(mc, { throwOnError: false, displayMode: false })
          parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} style={{ verticalAlign: 'middle', display: 'inline-block', padding: '0 2px', fontSize: '1.15em', lineHeight: 1 }} />)
        } catch { parts.push(<span key={key++} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{mc}</span>) }
        remaining = remaining.slice(mathMatch[0].length); continue
      } else {
        if (mathMatch[1]) parts.push(<span key={key++}>{mathMatch[1]}</span>)
        parts.push(<span key={key++}>${mc}$</span>)
        remaining = remaining.slice(mathMatch[0].length); continue
      }
    }
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>)
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: '#C4B5FD', letterSpacing: '-0.01em' }}>{parseInline(boldMatch[2])}</strong>)
      remaining = remaining.slice(boldMatch[0].length); continue
    }
    // Italic *text*
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>)
      parts.push(<em key={key++} style={{ color: 'rgba(220,215,255,0.82)', fontStyle: 'italic' }}>{parseInline(italicMatch[2])}</em>)
      remaining = remaining.slice(italicMatch[0].length); continue
    }
    // Inline code `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>)
      parts.push(<code key={key++} style={{ fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '0.88em', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 5, padding: '1px 6px', color: '#7DD3FC' }}>{codeMatch[2]}</code>)
      remaining = remaining.slice(codeMatch[0].length); continue
    }
    parts.push(<span key={key++}>{remaining}</span>); break
  }
  return parts
}

// ─── Code block ───────────────────────────────────────────────────────────────

function DocCodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <div style={{ margin: '12px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.38)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace' }}>{lang || 'code'}</span>
        <button onClick={copy} style={{ fontSize: 11, fontWeight: 700, color: copied ? '#4ADE80' : 'rgba(255,255,255,0.38)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 5, fontFamily: 'inherit' }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '13px 16px', overflowX: 'auto', fontSize: 13, lineHeight: 1.65, color: '#E2E8F0', fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function DocTable({ rows }) {
  const parsed = rows.map(r => {
    const cells = r.split('|')
    return cells.slice(r.startsWith('|') ? 1 : 0, r.endsWith('|') ? cells.length - 1 : cells.length).map(c => c.trim())
  })
  const dataRows = parsed.filter(r => !r.every(c => /^[-: ]+$/.test(c)))
  const [header, ...body] = dataRows
  if (!header) return null
  return (
    <div style={{ margin: '12px 0', overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{ padding: '9px 13px', textAlign: 'left', fontWeight: 700, color: 'rgba(255,255,255,0.90)', background: 'rgba(99,102,241,0.12)', borderBottom: '1.5px solid rgba(99,102,241,0.25)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                {parseInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 13px', color: 'rgba(255,255,255,0.72)', borderBottom: '1px solid rgba(255,255,255,0.05)', lineHeight: 1.5 }}>
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── DocMarkdown — same rendering engine as MarkdownRenderer in chat ─────────

function DocMarkdown({ text }) {
  const lines = text.split('\n')
  const elements = []
  let i = 0
  let listItems = []
  let listType = null

  const flushList = () => {
    if (!listItems.length) return
    elements.push(
      <div key={`list-${elements.length}`} style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {listItems.map((item, idx) => (
          listType === 'ol' ? (
            <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                color: BULLET_COLORS[idx % BULLET_COLORS.length], flexShrink: 0, minWidth: 24,
                fontSize: 12, fontWeight: 900, lineHeight: 1.85,
                background: `${BULLET_COLORS[idx % BULLET_COLORS.length]}22`,
                borderRadius: 6, padding: '0 5px', textAlign: 'center',
                border: `1px solid ${BULLET_COLORS[idx % BULLET_COLORS.length]}35`,
              }}>{idx + 1}</span>
              <span style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.75 }}>{parseInline(item)}</span>
            </div>
          ) : (
            <div key={idx} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{ color: BULLET_COLORS[idx % BULLET_COLORS.length], flexShrink: 0, marginTop: 7, fontSize: 8, lineHeight: 1 }}>◆</span>
              <span style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.75 }}>{parseInline(item)}</span>
            </div>
          )
        ))}
      </div>
    )
    listItems = []; listType = null
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) { flushList(); elements.push(<div key={`g-${i}`} style={{ height: 10 }} />); i++; continue }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '___') {
      flushList()
      elements.push(<div key={`hr-${i}`} style={{ margin: '12px 0', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09) 20%, rgba(255,255,255,0.09) 80%, transparent)' }} />)
      i++; continue
    }

    // Display math $$...$$ or \[...\]
    if (/^\$\$/.test(trimmed) || /^\\\[/.test(trimmed)) {
      flushList()
      const isDouble = /^\$\$/.test(trimmed)
      const closeRe  = isDouble ? /^\$\$/ : /^\\\]/
      const mathLines = []
      const startI = i
      const firstContent = isDouble
        ? trimmed.replace(/^\$\$/, '').replace(/\$\$$/, '').trim()
        : trimmed.replace(/^\\\[/, '').replace(/\\\]$/, '').trim()
      if (firstContent) { mathLines.push(firstContent); i++ }
      else {
        i++
        while (i < lines.length && !closeRe.test(lines[i].trim())) { mathLines.push(lines[i]); i++ }
        i++
      }
      const mathContent = mathLines.join('\n').trim()
      try {
        const html = katex.renderToString(mathContent, { throwOnError: false, displayMode: true })
        elements.push(
          <div key={`dm-${startI}`} style={{
            overflowX: 'auto', margin: '16px 0', padding: '26px 28px',
            textAlign: 'center', borderRadius: 16, fontSize: 19,
            background: 'rgba(14,16,48,0.80)',
            border: '1px solid rgba(99,102,241,0.30)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(165,170,255,0.07)',
          }} dangerouslySetInnerHTML={{ __html: html }} />
        )
      } catch { elements.push(<p key={`dm-${startI}`} style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.86)' }}>{mathContent}</p>) }
      continue
    }

    // Feedback tags [CORRECT/PARTIAL/INCORRECT: ...]
    const feedbackMatch = trimmed.match(/^\[(CORRECT|PARTIAL|INCORRECT)(?::\s*(.*))?\]/)
    if (feedbackMatch) {
      flushList()
      const type = feedbackMatch[1], msg = feedbackMatch[2] || ''
      const cfg = {
        CORRECT:   { bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.28)', color: '#4ADE80', icon: '✓', label: 'Correct' },
        PARTIAL:   { bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.25)', color: '#FCD34D', icon: '◑', label: 'Partially correct' },
        INCORRECT: { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', color: '#F87171', icon: '✗', label: 'Not quite' },
      }[type]
      elements.push(
        <div key={`fb-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '10px 0', padding: '13px 16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}`, borderRadius: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: cfg.color, flexShrink: 0, lineHeight: 1.3, marginTop: 1 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: cfg.color, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: msg ? 5 : 0 }}>{cfg.label}</div>
            {msg && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, fontWeight: 500 }}>{parseInline(msg)}</div>}
          </div>
        </div>
      )
      i++; continue
    }

    // Markdown table
    if (/^\|/.test(trimmed) && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      flushList()
      const tableLines = []
      while (i < lines.length && /^\|/.test(lines[i].trim())) { tableLines.push(lines[i]); i++ }
      if (tableLines.length >= 2) elements.push(<DocTable key={`tbl-${elements.length}`} rows={tableLines} />)
      continue
    }

    // H3 ###
    if (/^###\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={`h3-${i}`} style={{ fontWeight: 700, fontSize: 13.5, marginTop: 18, marginBottom: 4, color: '#A78BFA', letterSpacing: '-0.01em', lineHeight: 1.4, paddingLeft: 10, borderLeft: '3px solid #7C3AED' }}>
          {parseInline(trimmed.replace(/^###\s/, ''))}
        </div>
      )
      i++; continue
    }

    // H2 ##
    if (/^##\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={`h2-${i}`} style={{ marginTop: 26, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '2px solid rgba(139,143,255,0.20)' }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: '#818CF8', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.03em', lineHeight: 1.3 }}>{parseInline(trimmed.replace(/^##\s/, ''))}</span>
          </div>
        </div>
      )
      i++; continue
    }

    // H1 #
    if (/^#\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={`h1-${i}`} style={{ marginTop: 22, marginBottom: 10, fontWeight: 900, fontSize: 19, letterSpacing: '-0.04em', lineHeight: 1.2, background: 'linear-gradient(135deg, #fff 30%, #C4B5FD 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {parseInline(trimmed.replace(/^#\s/, ''))}
        </div>
      )
      i++; continue
    }

    // Blockquote > — callout cards OR plain strip
    if (/^>/.test(trimmed)) {
      flushList()
      const content = trimmed.replace(/^>\s*/, '')
      const labelMatch = content.match(/^\*\*(Example|Definition|Key Insight|Key|Note|Warning|Tip|Recall):\*\*\s*(.*)$/i)
      if (labelMatch) {
        const label = labelMatch[1], body = labelMatch[2]
        const cfg = {
          example:       { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)',  color: '#FBBF24', icon: '◎', pill: 'rgba(251,191,36,0.18)' },
          definition:    { bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.32)',  color: '#60A5FA', icon: '◉', pill: 'rgba(96,165,250,0.18)' },
          'key insight': { bg: 'rgba(139,143,255,0.12)', border: 'rgba(139,143,255,0.40)', color: '#A5B4FC', icon: '◈', pill: 'rgba(139,143,255,0.20)' },
          key:           { bg: 'rgba(139,143,255,0.12)', border: 'rgba(139,143,255,0.40)', color: '#A5B4FC', icon: '◈', pill: 'rgba(139,143,255,0.20)' },
          note:          { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.32)',  color: '#818CF8', icon: '◇', pill: 'rgba(99,102,241,0.18)' },
          warning:       { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.32)', color: '#F87171', icon: '⚠', pill: 'rgba(248,113,113,0.18)' },
          tip:           { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.32)',  color: '#34D399', icon: '→', pill: 'rgba(52,211,153,0.18)' },
          recall:        { bg: 'rgba(251,191,36,0.09)',  border: 'rgba(251,191,36,0.28)',  color: '#FCD34D', icon: '↩', pill: 'rgba(251,191,36,0.16)' },
        }[label.toLowerCase()] || { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.32)', color: '#818CF8', icon: '◈', pill: 'rgba(99,102,241,0.18)' }
        elements.push(
          <div key={`bq-${i}`} style={{ margin: '12px 0', padding: '13px 16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}`, borderRadius: 14, boxShadow: `0 2px 12px ${cfg.color}10` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: body ? 8 : 0 }}>
              <span style={{ fontSize: 13, color: cfg.color, fontWeight: 700, lineHeight: 1 }}>{cfg.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 900, color: cfg.color, letterSpacing: '0.12em', textTransform: 'uppercase', background: cfg.pill, borderRadius: 20, padding: '2px 8px' }}>{label}</span>
            </div>
            {body && <div style={{ fontSize: 14.5, lineHeight: 1.75, color: 'rgba(255,255,255,0.90)', fontWeight: 400 }}>{parseInline(body)}</div>}
          </div>
        )
      } else {
        elements.push(
          <div key={`bq-${i}`} style={{ margin: '10px 0', padding: '12px 16px', borderLeft: '4px solid #7C3AED', background: 'rgba(99,102,241,0.10)', borderRadius: 12, fontSize: 14.5, lineHeight: 1.75, fontStyle: 'italic', color: 'rgba(220,218,255,0.90)' }}>
            {parseInline(content)}
          </div>
        )
      }
      i++; continue
    }

    // Code block ```
    if (/^```/.test(trimmed)) {
      flushList()
      const lang = trimmed.replace(/^```/, '').trim()
      const codeLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) { codeLines.push(lines[i]); i++ }
      i++
      elements.push(<DocCodeBlock key={`code-${elements.length}`} code={codeLines.join('\n')} lang={lang} />)
      continue
    }

    // Step heading "1: Title" or "Step 1: Title"
    const stepMatch = trimmed.match(/^(?:\*\*)?(?:Step\s+)?(\d+):\s+(.+?)(?:\*\*)?$/)
    if (stepMatch && trimmed.replace(/\*\*/g, '').length < 100) {
      flushList()
      elements.push(
        <div key={`step-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 24, marginBottom: 8 }}>
          <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.40),rgba(79,70,229,0.28))', border: '1px solid rgba(139,143,255,0.50)', boxShadow: '0 2px 8px rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#C4B5FD', letterSpacing: '-0.02em' }}>
            {stepMatch[1]}
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.97)', lineHeight: 1.3, letterSpacing: '-0.015em' }}>{parseInline(stepMatch[2])}</span>
        </div>
      )
      i++; continue
    }

    // Ordered list 1. / 1)
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/)
    if (olMatch) { if (listType !== 'ol') { flushList(); listType = 'ol' }; listItems.push(olMatch[2]); i++; continue }

    // Unordered list - / * / •
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/)
    if (ulMatch) { if (listType !== 'ul') { flushList(); listType = 'ul' }; listItems.push(ulMatch[1]); i++; continue }

    // Standalone bold **Concept** → section divider
    const boldOnlyMatch = trimmed.match(/^\*\*([^*].+?)\*\*$/)
    if (boldOnlyMatch) {
      flushList()
      elements.push(
        <div key={`sh-${i}`} style={{ marginTop: 24, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 9, borderBottom: '2px solid rgba(139,143,255,0.18)', width: '100%' }}>
            <div style={{ width: 5, height: 20, borderRadius: 3, background: 'linear-gradient(180deg,#818CF8,#C084FC)', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: '#E2E0FF', letterSpacing: '-0.03em', lineHeight: 1.3 }}>{boldOnlyMatch[1]}</span>
          </div>
        </div>
      )
      i++; continue
    }

    // Standalone italic *text* → question card
    const isStandaloneItalic = trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**') && !trimmed.endsWith('**') && trimmed.length > 2
    if (isStandaloneItalic) {
      flushList()
      elements.push(
        <div key={`qi-${i}`} style={{ marginTop: 16, padding: '13px 16px', background: 'rgba(251,191,36,0.09)', border: '1px solid rgba(251,191,36,0.28)', borderLeft: '4px solid #FBBF24', borderRadius: 13, display: 'flex', alignItems: 'flex-start', gap: 10, boxShadow: '0 2px 12px rgba(251,191,36,0.08)' }}>
          <span style={{ fontSize: 16, color: '#FBBF24', flexShrink: 0, lineHeight: 1.3, marginTop: 1 }}>?</span>
          <span style={{ fontSize: 15, color: 'rgba(255,245,200,0.90)', fontStyle: 'italic', lineHeight: 1.65, fontWeight: 500, letterSpacing: '-0.01em' }}>{parseInline(trimmed.slice(1, -1))}</span>
        </div>
      )
      i++; continue
    }

    // Default paragraph
    flushList()
    elements.push(<div key={`p-${i}`} style={{ marginTop: 5, fontSize: 15, color: 'rgba(235,233,255,0.84)', lineHeight: 1.80, letterSpacing: '-0.005em' }}>{parseInline(trimmed)}</div>)
    i++
  }

  flushList()

  return (
    <div style={{ minWidth: 0, fontSize: 15, lineHeight: 1.80, color: 'rgba(255,255,255,0.86)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
      {elements}
    </div>
  )
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ onFile, dragOver, setDragOver, fileInputRef, compact = false }) {
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
        cursor: 'pointer', userSelect: 'none', gap: compact ? 10 : 16, padding: compact ? 16 : 40,
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

      {/* Distinction note — desktop only */}
      {!compact && (
        <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'center', lineHeight: 1.6 }}>
            <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 600 }}>Lens</span> solves a single maths problem •{' '}
            <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 600 }}>Docs</span> tutors you through a whole document
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mob, setMob] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mob
}

export default function AevaDoc({ onClose, name = 'Student' }) {
  const isMobile = useIsMobile()
  const [file, setFile]           = useState(null)
  const [fileUrl, setFileUrl]     = useState(null)
  const [isPdf, setIsPdf]         = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [scanCtx, setScanCtx]     = useState(null)
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [thinking, setThinking]   = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [mobileTab, setMobileTab] = useState('doc')
  const [docCollapsed, setDocCollapsed] = useState(false)
  const [docTheme, setDocTheme] = useState(() => localStorage.getItem('aeva_doc_theme') || null) // null = default dark
  const [showThemePicker, setShowThemePicker] = useState(false)
  const activeTheme = docTheme ? CHAT_THEMES[docTheme] : null
  const applyDocTheme = (id) => {
    setDocTheme(id)
    if (id) localStorage.setItem('aeva_doc_theme', id)
    else localStorage.removeItem('aeva_doc_theme')
    setShowThemePicker(false)
  }

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
  const handleFile = async (f) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setFile(f)
    setFileUrl(url)
    setScanCtx(null)
    setMessages([])
    base64Ref.current = null
    mimeRef.current = null

    const pdf = f.type === 'application/pdf'
    setIsPdf(pdf)

    if (pdf) {
      setScanning(true)
      try {
        const { text: extracted, totalPages } = await extractPDFText(f)
        const ctx = {
          type: 'pdf',
          subject: f.name.replace(/\.pdf$/i, ''),
          level: 'Unknown',
          summary: `PDF document: ${f.name}`,
          allText: extracted,
          questions: [],
          keyTerms: [],
          hasDiagrams: false,
        }
        setScanCtx(ctx)
        const preview = extracted.slice(0, 120).trim()
        setMessages([{
          role: 'assistant',
          content: `I've read **${f.name}** — ${totalPages} page${totalPages !== 1 ? 's' : ''} extracted. I can see the full text. What would you like to work through?${preview ? `\n\n*Preview: "${preview}…"*` : ''}`,
        }])
      } catch {
        setScanCtx({ type: 'pdf', subject: 'Document', level: 'Unknown', summary: `PDF: ${f.name}` })
        setMessages([{
          role: 'assistant',
          content: `I've got **${f.name}** on the left. PDF text extraction failed — tell me which section or question you need help with and I'll assist.`,
        }])
      }
      setScanning(false)
      setMobileTab('chat')
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gKey()}` },
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
      setMobileTab('chat')
    }
    reader.readAsDataURL(f)
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  const send = async (msg) => {
    const text = (msg || input).trim()
    if (!text || thinking || scanning) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setThinking(true)

    // Build API messages
    const systemContent = buildSystemPrompt(scanCtx, name)
    const apiMessages = [{ role: 'system', content: systemContent }]

    // First user question: include image for visual context.
    // Follow-ups: text-only — the system prompt carries full doc text via allText.
    const userTurnCount = updated.filter(m => m.role === 'user').length
    const isFirstQuestion = userTurnCount === 1
    if (!isPdf && base64Ref.current && isFirstQuestion) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeRef.current};base64,${base64Ref.current}` } },
          { type: 'text', text },
        ],
      })
    } else {
      // Reconstruct full conversation history (text only)
      for (const m of updated) {
        if (m.content) apiMessages.push({ role: m.role, content: m.content })
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

  const chips = getContextualChips(scanCtx, messages)
  const showChips = scanCtx && !thinking && messages.length > 0

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
          {/* Ai OS theme picker */}
          <div style={{ position: 'relative' }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setShowThemePicker(s => !s)}
              title="Background theme"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 99, background: activeTheme ? activeTheme.accentBg : 'rgba(255,255,255,0.06)', border: `1.5px solid ${activeTheme ? activeTheme.swatch : 'rgba(255,255,255,0.12)'}`, color: activeTheme ? activeTheme.accent : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: activeTheme ? `0 0 12px ${activeTheme.swatch}55` : 'none' }}
            >
              <Palette size={13} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeTheme ? activeTheme.swatch : 'rgba(255,255,255,0.25)', boxShadow: activeTheme ? `0 0 8px ${activeTheme.swatch}` : 'none' }} />
            </motion.button>
            <AnimatePresence>
              {showThemePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  style={{ position: 'absolute', top: 42, right: 0, zIndex: 50, padding: 12, borderRadius: 16, background: 'rgba(14,15,30,0.97)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.55)', width: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>Background</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {/* Default (dark) */}
                    <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => applyDocTheme(null)}
                      title="Default"
                      style={{ aspectRatio: '1', borderRadius: 12, cursor: 'pointer', background: 'rgba(6,7,20,0.97)', border: `2px solid ${!docTheme ? '#fff' : 'rgba(255,255,255,0.14)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700 }}>
                      OFF
                    </motion.button>
                    {Object.entries(CHAT_THEMES).map(([id, t]) => (
                      <motion.button key={id} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => applyDocTheme(id)}
                        title={t.label}
                        style={{ aspectRatio: '1', borderRadius: 12, cursor: 'pointer', background: t.bg, border: `2px solid ${docTheme === id ? '#fff' : 'rgba(255,255,255,0.14)'}` }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

      {/* ── Question navigator strip ─────────────────────────────────────── */}
      <AnimatePresence>
        {scanCtx?.questions?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,6,18,0.80)', overflow: 'hidden' }}>
            <div style={{ padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.10em', textTransform: 'uppercase', flexShrink: 0 }}>Questions</span>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
              {scanCtx.questions.map((q, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.06, background: 'rgba(99,102,241,0.22)' }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => send(`Help me with question ${i + 1}: ${q}`)}
                  style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.28)', color: '#A5B4FC', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Q{i + 1}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile tab bar ───────────────────────────────────────────────── */}
      {isMobile && file && (
        <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,9,24,0.95)' }}>
          {[{ id: 'doc', label: '📄 Document' }, { id: 'chat', label: '💬 Chat' }].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)}
              style={{
                flex: 1, padding: '11px 0', border: 'none',
                background: mobileTab === tab.id ? 'rgba(99,102,241,0.10)' : 'transparent',
                borderBottom: mobileTab === tab.id ? '2px solid #6366F1' : '2px solid transparent',
                color: mobileTab === tab.id ? '#A5B4FC' : 'rgba(255,255,255,0.35)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Doc panel (left on desktop, full on mobile doc tab) ───────────── */}
        <AnimatePresence initial={false}>
          {!docCollapsed && (!isMobile || mobileTab === 'doc') && (
            <motion.div
              key="doc-panel"
              initial={isMobile ? { opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isMobile
                ? { opacity: 1 }
                : { width: file ? '55%' : '50%', opacity: 1 }
              }
              exit={isMobile ? { opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              style={{
                flexShrink: 0, overflow: 'hidden',
                borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
                display: 'flex', flexDirection: 'column',
                ...(isMobile ? { flex: 1, width: '100%' } : {}),
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
                  <UploadZone onFile={handleFile} dragOver={dragOver} setDragOver={setDragOver} fileInputRef={fileInputRef} compact={isMobile} />
                ) : isPdf ? (
                  /* PDF viewer */
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
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

        {/* Collapse toggle — desktop only */}
        {file && !isMobile && (
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
        <div style={{ flex: 1, display: isMobile && file && mobileTab === 'doc' ? 'none' : 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: activeTheme ? activeTheme.bg : 'transparent', transition: 'background 0.4s ease' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 8px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>

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
              <div key={i}>
                {msg.role === 'user' ? (
                  /* User bubble — right-aligned pill */
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                    <div style={{
                      maxWidth: '78%', padding: '10px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.50))',
                      border: '1px solid rgba(99,102,241,0.38)',
                    }}>
                      <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.93)', lineHeight: 1.55, fontWeight: 500 }}>{msg.content}</span>
                    </div>
                  </div>
                ) : (
                  /* Aeva response — full-width structured card */
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #2D308E 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3, boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
                      <Star size={11} color="white" fill="white" />
                    </div>
                    {/* Content card */}
                    <div style={{
                      flex: 1, minWidth: 0,
                      padding: '14px 18px',
                      borderRadius: '4px 18px 18px 18px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderLeft: '2px solid rgba(99,102,241,0.45)',
                    }}>
                      <DocMarkdown text={msg.content || '…'} />
                    </div>
                  </div>
                )}
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
              background: activeTheme ? activeTheme.inputBg : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${activeTheme ? activeTheme.inputBorder : 'rgba(255,255,255,0.10)'}`,
              borderRadius: 999, padding: '10px 10px 10px 18px',
              boxShadow: activeTheme ? activeTheme.inputGlow : 'none',
              transition: 'border-color 0.2s, background 0.4s ease',
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
