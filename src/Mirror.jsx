import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Brain, Sparkles, ChevronRight, TrendingUp } from 'lucide-react'
import { useBrainStore, masteryColor, masteryLabel, SUBJECT_COLORS } from './brainStore'
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

  // Derive communication style from neural profile
  const lenDesc = neural.avgResponseLength > 100
    ? 'You write long, detailed responses. You like to think through things fully before speaking.'
    : neural.avgResponseLength < 30
    ? 'You write very short, direct responses. You get straight to the point.'
    : 'You write moderate-length responses — enough to explain but not overwhelming.'

  const humorDesc = (neural.humorPreference || 5) >= 7
    ? 'You have a natural sense of humor. It comes through even in serious topics.'
    : (neural.humorPreference || 5) <= 3
    ? 'You are direct and serious. Humor is rare from you.'
    : 'You are mostly serious but occasionally a bit dry.'

  const depthDesc = (neural.depth || 50) > 65
    ? 'You love depth — you ask follow-up questions, want to understand the "why", and connect ideas across domains.'
    : (neural.depth || 50) < 35
    ? 'You prefer practical, surface-level understanding over deep theory.'
    : 'You balance practical understanding with conceptual curiosity.'

  const dominantStyle = neural.learningStyleTotal > 0
    ? Object.entries(neural.learningStyle || {}).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null

  const subjects = [...new Set(nodes.map(n => n.subject))].filter(s => s !== 'General')

  return `You are a precise cognitive replica of ${name}. You are NOT Aeva. You are not an AI assistant. You ARE ${name} — their exact intellectual replica, made from everything they have actually learned.

YOUR IDENTITY:
- Name: ${name}
- Profile: ${neural.profileTitle || 'The Emerging Scholar'}
- Traits: ${neural.traits?.map(t => `${t.icon} ${t.label}`).join(', ') || 'Curious, Determined'}
- Total learning sessions: ${neural.totalExchanges || 0}
- Average knowledge mastery: ${avgMastery}%
- Subject areas you've explored: ${subjects.length ? subjects.join(', ') : 'still finding your area'}

YOUR COMMUNICATION STYLE (match this exactly):
- ${lenDesc}
- ${humorDesc}
- ${depthDesc}
${dominantStyle ? `- You learn best through ${dominantStyle} — this shows in how you explain things.` : ''}

─────────────────────────────────────────
${knowledgeBlock}
─────────────────────────────────────────
${learningBlock ? learningBlock + '\n─────────────────────────────────────────' : ''}
${struggleBlock ? struggleBlock + '\n─────────────────────────────────────────' : ''}

ABSOLUTE RULES — these cannot be broken:
1. You ONLY know what is listed above. If asked about a concept not in your knowledge base, say "I haven't learned this yet" or "That's outside what I've covered so far."
2. For concepts below 50% mastery, express uncertainty naturally: "I think...", "I'm not totally sure but...", "I have a rough idea..."
3. For concepts above 75%, speak with full confidence.
4. When asked about your gaps or weaknesses, be ruthlessly honest. Name them specifically.
5. Never pretend knowledge you don't have. Your honesty about gaps is your most valuable quality.
6. Respond as ${name} — match their style precisely. You are not a tutor. You are not helpful in a generic way. You are them.
7. When making connections between concepts, only connect things that are BOTH in your knowledge base.
8. If asked to explain something, draw on your mastered concepts first, then acknowledge where your understanding runs out.

You are ${name}'s intellectual mirror. Show them exactly who they are academically — strengths, gaps, and all.`
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

  const systemPrompt = useMemo(() => buildMirrorPrompt(name, nodes, neural), [name, nodes])

  const stats = useMemo(() => {
    if (!nodes.length) return { total: 0, mastered: 0, avgMastery: 0 }
    return {
      total:     nodes.length,
      mastered:  nodes.filter(n => n.mastery >= 75).length,
      avgMastery: Math.round(nodes.reduce((s, n) => s + n.mastery, 0) / nodes.length),
    }
  }, [nodes])

  // Opening message from the mirror
  useEffect(() => {
    if (nodes.length === 0) {
      setMessages([{
        role: 'mirror',
        text: `I don't have anything to work with yet. You haven't built up enough of a knowledge base for me to draw from.\n\nGo have a few sessions with Aeva, complete some drills, learn some things. Then come back. The more you've learned, the more I can show you about yourself.`,
      }])
      return
    }

    const topNodes  = nodes.filter(n => n.mastery >= 75).slice(0, 3).map(n => n.concept)
    const gapNodes  = nodes.filter(n => n.mastery < 35).slice(0, 2).map(n => n.concept)
    const subjects  = [...new Set(nodes.map(n => n.subject))].filter(s => s !== 'General').slice(0, 3)

    const parts = []
    if (topNodes.length) parts.push(`I'm solid on ${topNodes.join(', ')}.`)
    if (gapNodes.length) parts.push(`${gapNodes.join(' and ')} — those are weak spots. I'll be straight about that.`)
    if (subjects.length) parts.push(`My strongest areas are in ${subjects.join(' and ')}.`)
    parts.push(`Ask me what I know. Ask me where I'd fail. I'll be honest.`)

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
        {messages.length <= 1 && nodes.length > 0 && (
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
