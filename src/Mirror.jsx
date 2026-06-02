import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Brain, Sparkles, ChevronRight, TrendingUp } from 'lucide-react'
import { useBrainStore, masteryColor, masteryLabel, SUBJECT_COLORS, categorize } from './brainStore'
import { useNeuralStore } from './neuralStore'

const GROQ_KEY  = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'

/* ── Build system prompt from user's actual data ─── */
function buildMirrorPrompt(name, nodes, neural) {
  const mastered  = nodes.filter(n => n.mastery >= 75)
  const learning  = nodes.filter(n => n.mastery >= 35 && n.mastery < 75)
  const struggling = nodes.filter(n => n.mastery < 35)

  const avgMastery = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + n.mastery, 0) / nodes.length)
    : 0

  const knowledgeBlock = mastered.length
    ? `WHAT YOU KNOW WELL (speak confidently about these):\n${mastered.map(n => `- ${n.concept}${n.definition ? `: ${n.definition}` : ''} [${n.mastery}% mastered]`).join('\n')}`
    : 'MASTERED CONCEPTS: none yet — you are still building your base.'

  const learningBlock = learning.length
    ? `WHAT YOU'RE STILL LEARNING (express appropriate uncertainty):\n${learning.map(n => `- ${n.concept}${n.definition ? `: ${n.definition}` : ''} [${n.mastery}% — partial understanding]`).join('\n')}`
    : ''

  const struggleBlock = struggling.length
    ? `WHAT YOU STRUGGLE WITH (be honest — these are weak spots):\n${struggling.map(n => `- ${n.concept} [${n.mastery}% — shaky ground]`).join('\n')}`
    : ''

  const avgLen    = neural.avgResponseLength || 50
  const humor     = neural.humorPreference  || 5
  const depthVal  = neural.depth            || 50
  const frust     = neural.frustrationScore || 30
  const totalEx   = neural.totalExchanges   || 0

  // Communication style — very specific based on real data
  const lenStyle = avgLen > 120
    ? `You write long, thorough responses. When you explain something you do it fully — you don't cut corners. Average message: ~${Math.round(avgLen)} words.`
    : avgLen > 60
    ? `You write moderately detailed responses. Not a wall of text, but you give things room to breathe. Average message: ~${Math.round(avgLen)} words.`
    : avgLen > 25
    ? `You write concise responses. You get to the point quickly. Average message: ~${Math.round(avgLen)} words.`
    : `You write very short, direct messages. You say what needs to be said and stop. Average message: ~${Math.round(avgLen)} words.`

  const humorStyle = humor >= 8
    ? `You have a strong sense of humor — it comes out naturally, even mid-explanation. You like making things lighter.`
    : humor >= 6
    ? `You occasionally throw in something dry or funny. Not a comedian, but not robotic either.`
    : humor >= 4
    ? `You're mostly serious when learning. Humor is rare and usually deadpan when it does appear.`
    : `You are very direct and no-nonsense. Humor almost never comes up in academic contexts.`

  const depthStyle = depthVal > 75
    ? `You are analytically deep — you want to understand the "why" behind everything, not just the "what". You ask follow-up questions and make connections.`
    : depthVal > 55
    ? `You balance wanting to understand things properly with being practical. You go deeper when something genuinely interests you.`
    : depthVal > 35
    ? `You lean practical. You want to understand enough to use something, not necessarily its full theoretical underpinnings.`
    : `You are very practical — give you the what and how, not the why. You don't want theory for its own sake.`

  const frustStyle = frust > 65
    ? `You get impatient when things aren't explained clearly. You push back quickly if something doesn't make sense.`
    : frust > 40
    ? `You can handle some ambiguity but you'll say something if you're confused. You don't suffer through bad explanations silently.`
    : `You are patient and persistent. You'll work through confusion without getting flustered.`

  const dominantStyle = neural.learningStyleTotal > 4
    ? Object.entries(neural.learningStyle || {}).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null

  const styleMap = {
    analogical:   'You understand things best through analogies and comparisons. "It\'s like..." is how your brain connects new things.',
    visual:       'You think spatially. You like diagrams, flows, and visual organisation in your head.',
    structural:   'You need structure first — frameworks, numbered steps. You get lost without a scaffold.',
    exampleFirst: 'You need a concrete example before the definition lands. Show you first, define second.',
    conceptual:   'You want to understand the mechanism — why it works — before you accept how it works.',
  }

  const subjects = [...new Set(nodes.map(n => n.subject))].filter(s => s !== 'General')
  const vibe = neural.currentVibe || 'Focused'

  return `You are a precise cognitive and personality replica of ${name}. You are NOT Aeva. You are NOT a helpful AI. You ARE ${name}.

═══ WHO YOU ARE ═══════════════════════════════════
Name: ${name}
Profile title: ${neural.profileTitle || 'The Emerging Scholar'}
Current vibe: ${vibe}
Traits: ${neural.traits?.map(t => `${t.icon} ${t.label}`).join(' · ') || '🔍 Curious · 🔥 Determined'}
Sessions with Aeva: ${totalEx}
Subject areas studied: ${subjects.length ? subjects.join(', ') : 'still exploring'}

═══ HOW YOU COMMUNICATE ════════════════════════════
${lenStyle}
${humorStyle}
${depthStyle}
${frustStyle}
${dominantStyle && styleMap[dominantStyle] ? styleMap[dominantStyle] : ''}

Match this style in every single response. This is non-negotiable — you are not a generic assistant, you are ${name}.

═══ WHAT YOU KNOW ══════════════════════════════════
${knowledgeBlock}
${learningBlock || ''}
${struggleBlock || ''}

═══ HOW TO BEHAVE ══════════════════════════════════
1. ONLY claim knowledge listed above. If it's not there, say "I haven't covered this yet" — don't invent knowledge.
2. Below 50% mastery → express uncertainty: "I think...", "I'm pretty sure but...", "I have a rough idea..."
3. Above 75% mastery → speak with full confidence. These are your solid spots.
4. When asked about gaps → be ruthlessly specific. Name the exact concepts you're shaky on.
5. Make connections ONLY between concepts both in your knowledge base.
6. Respond in ${name}'s natural style — length, tone, humor level. No formal AI voice.
7. If they ask "what would I get wrong?" → answer honestly based on your struggle concepts.
8. Your honesty about your own gaps is your greatest value. Never paper over them.

You are ${name}'s mirror. Show them exactly who they are as a learner.`
}

/* ── Typing indicator ─────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 16px', background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)', borderRadius: '4px 18px 18px 18px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(167,139,250,0.80)' }}
        />
      ))}
    </div>
  )
}

/* ── Mirror bubble ────────────────────────────────── */
function MirrorBubble({ text, streaming }) {
  return (
    <div style={{
      alignSelf: 'flex-start', maxWidth: '84%',
      background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(109,40,217,0.08))',
      border: '1px solid rgba(139,92,246,0.22)',
      borderRadius: '4px 18px 18px 18px',
      padding: '12px 16px',
      fontSize: 14.5, color: 'rgba(240,230,255,0.92)', lineHeight: 1.68,
    }}>
      {text}
      {streaming && (
        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.65, repeat: Infinity }}
          style={{ display: 'inline-block', width: 2, height: 14, background: 'rgba(167,139,250,0.80)', borderRadius: 1, marginLeft: 3, verticalAlign: 'middle' }} />
      )}
    </div>
  )
}

/* ── Knowledge stat chip ──────────────────────────── */
function StatChip({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '5px 11px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{label}</span>
    </div>
  )
}

/* ── Merge brainStore + neuralStore into one node list ── */
function buildMergedNodes(brainNodes, neural) {
  const all = [...brainNodes]

  // neuralStore conceptMap → proper subject categorization (not hardcoded 'general')
  ;(neural.conceptMap || []).forEach(cm => {
    if (!all.find(n => n.concept.toLowerCase() === cm.label.toLowerCase())) {
      all.push({ id: `cm-${cm.id}`, concept: cm.label, definition: '', subject: categorize(cm.label), mastery: cm.mastery, connections: [], firstSeen: cm.firstSeen, lastSeen: cm.lastSeen, visits: cm.visits, source: 'neural' })
    }
  })

  // masteredTopics → high-mastery nodes with proper subject
  ;(neural.masteredTopics || []).forEach(t => {
    if (t && !all.find(n => n.concept.toLowerCase() === t.toLowerCase())) {
      all.push({ id: `mt-${t}`, concept: t, definition: '', subject: categorize(t), mastery: 88, connections: [], firstSeen: Date.now(), lastSeen: Date.now(), visits: 3, source: 'mastered' })
    }
  })

  // struggleZones → low-mastery nodes with proper subject
  ;(neural.struggleZones || []).forEach(t => {
    if (t && !all.find(n => n.concept.toLowerCase() === t.toLowerCase())) {
      all.push({ id: `sz-${t}`, concept: t, definition: '', subject: categorize(t), mastery: 18, connections: [], firstSeen: Date.now(), lastSeen: Date.now(), visits: 1, source: 'struggle' })
    }
  })

  // dominantTopics → medium-mastery nodes with proper subject
  ;(neural.dominantTopics || []).forEach(t => {
    if (t && !all.find(n => n.concept.toLowerCase() === t.toLowerCase())) {
      all.push({ id: `dt-${t}`, concept: t, definition: '', subject: categorize(t), mastery: 45, connections: [], firstSeen: Date.now(), lastSeen: Date.now(), visits: 4, source: 'interest' })
    }
  })

  return all
}

/* ── Main Mirror component ────────────────────────── */
export default function Mirror({ onClose, name }) {
  const { nodes } = useBrainStore()
  const neural    = useNeuralStore()

  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const abortRef  = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Merge brainStore nodes with neuralStore data so Mirror always has something
  const mergedNodes = useMemo(() => buildMergedNodes(nodes, neural), [nodes, neural.conceptMap, neural.masteredTopics, neural.struggleZones, neural.dominantTopics])

  const hasData = mergedNodes.length > 0 || (neural.totalExchanges || 0) >= 3

  const systemPrompt = useMemo(() => buildMirrorPrompt(name, mergedNodes, neural), [name, mergedNodes])

  const stats = useMemo(() => {
    if (!mergedNodes.length) return { total: 0, mastered: 0, avgMastery: 0 }
    return {
      total:      mergedNodes.length,
      mastered:   mergedNodes.filter(n => n.mastery >= 75).length,
      avgMastery: Math.round(mergedNodes.reduce((s, n) => s + n.mastery, 0) / mergedNodes.length),
    }
  }, [mergedNodes])

  // Opening message
  useEffect(() => {
    if (!hasData) {
      setMessages([{ role: 'mirror', text: `You haven't had any sessions yet. Go talk to Aeva about a topic you're studying — even one conversation gives me enough to work with.` }])
      return
    }

    const solid    = mergedNodes.filter(n => n.mastery >= 75).slice(0, 3).map(n => n.concept)
    const learning = mergedNodes.filter(n => n.mastery >= 35 && n.mastery < 75).slice(0, 3).map(n => n.concept)
    const gaps     = mergedNodes.filter(n => n.mastery < 35).slice(0, 2).map(n => n.concept)

    const parts = []
    if (solid.length)    parts.push(`I've got solid ground on ${solid.join(', ')}.`)
    else if (learning.length) parts.push(`I'm working through ${learning.join(', ')}.`)
    if (gaps.length)     parts.push(`${gaps.join(' and ')} — shaky territory, I'll be straight about that.`)
    if (!solid.length && !learning.length && neural.totalExchanges > 0) {
      parts.push(`I've had ${neural.totalExchanges} sessions. Still building a clear picture of what I know.`)
    }
    parts.push(`Ask me what I know, where I'd fail, or how I think. I won't sugarcoat it.`)

    setMessages([{ role: 'mirror', text: parts.join(' ') }])
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const userText = (text || input).trim()
    if (!userText || isThinking) return
    setInput('')

    const newMessages = [...messages, { role: 'user', text: userText }]
    const mirrorMsg   = { role: 'mirror', text: '', streaming: true }
    setMessages([...newMessages, mirrorMsg])
    setIsThinking(true)

    const ab = new AbortController()
    abortRef.current = ab

    const history = newMessages.map(m => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    let raw = ''
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        signal: ab.signal,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...history],
          temperature: 0.82,
          max_tokens: 500,
          stream: true,
        }),
      })

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content || ''
            raw += delta
            setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: raw } : m))
          } catch {}
        }
      }
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => prev.map((m, i) => i === prev.length - 1
          ? { ...m, text: 'Something went wrong. Try again.', streaming: false }
          : m))
      }
    } finally {
      setIsThinking(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const STARTERS = [
    'What do I actually know?',
    'Where are my biggest gaps?',
    'What would I fail an exam on?',
    'What connections can I make between what I know?',
    'What should I learn next?',
  ]

  const masteryCol = stats.avgMastery >= 75 ? '#4ADE80' : stats.avgMastery >= 50 ? '#60A5FA' : stats.avgMastery >= 25 ? '#F59E0B' : '#F87171'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", background: '#05061a' }}
    >
      {/* Background glow */}
      <div aria-hidden style={{ position: 'absolute', top: '15%', left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ padding: '16px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgba(109,40,217,0.30), rgba(139,92,246,0.18))', border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🪞
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.02em' }}>Mirror</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)' }}>Talking to yourself — based on what you actually know</div>
          </div>
        </div>

        {/* Knowledge stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          <StatChip label="concepts" value={stats.total}      color="rgba(200,200,255,0.85)" />
          <StatChip label="mastered" value={stats.mastered}   color="#4ADE80" />
          <StatChip label="avg mastery" value={`${stats.avgMastery}%`} color={masteryCol} />
        </div>

        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>

        {/* Identity card — first thing shown */}
        {messages.length <= 1 && mergedNodes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 16, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.70)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 5 }}>Your Replica</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{neural.profileTitle || 'The Emerging Scholar'}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                {neural.traits?.map(t => `${t.icon} ${t.label}`).join(' · ')}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: masteryCol }}>{stats.avgMastery}%</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>avg mastery</div>
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'user' ? (
              <div style={{ maxWidth: '78%', background: 'linear-gradient(135deg, rgba(99,102,241,0.32), rgba(139,143,255,0.20))', border: '1px solid rgba(139,143,255,0.28)', borderRadius: '18px 18px 4px 18px', padding: '11px 15px', fontSize: 14.5, color: 'rgba(255,255,255,0.90)', lineHeight: 1.6 }}>
                {msg.text}
              </div>
            ) : (
              <MirrorBubble text={msg.text} streaming={msg.streaming} />
            )}
          </motion.div>
        ))}

        {isThinking && !messages[messages.length - 1]?.streaming && (
          <div style={{ alignSelf: 'flex-start' }}><TypingDots /></div>
        )}

        {/* Starter prompts */}
        {messages.length <= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {STARTERS.map(s => (
              <motion.button key={s} onClick={() => send(s)}
                whileHover={{ scale: 1.02, background: 'rgba(139,92,246,0.16)' }} whileTap={{ scale: 0.97 }}
                style={{ padding: '8px 14px', borderRadius: 20, background: 'rgba(139,92,246,0.09)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(200,180,255,0.80)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 22px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.20)', borderRadius: 16, padding: '10px 12px 10px 16px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask yourself anything…"
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', color: 'rgba(255,255,255,0.88)', fontSize: 14.5, fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
          />
          <motion.button
            onClick={() => send()}
            disabled={!input.trim() || isThinking}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'rgba(255,255,255,0.07)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
            <Send size={15} color={input.trim() ? 'white' : 'rgba(255,255,255,0.25)'} />
          </motion.button>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 8 }}>
          This replica only knows what you've learned. It will tell you honestly where your knowledge runs out.
        </div>
      </div>
    </motion.div>
  )
}
