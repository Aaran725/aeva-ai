import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Clock } from 'lucide-react'
import { useXPStore } from './xpStore'

// ─── Game data — 5 rounds, 2 crises each ──────────────────────────────────────
// The narrative arc: server outage → stakeholder fallout → aftermath
// Each crisis has 3 choices: good / risky / wrong

const ROUNDS = [
  {
    id: 1,
    time: '2:47 AM',
    context: 'Your phone has been going off for 8 minutes. You just saw it.',
    crises: [
      {
        id: 'server_down',
        character: { name: 'Priya — Engineering', avatar: '🔴', role: 'Head of Eng' },
        urgency: 'CRITICAL',
        subject: 'Production is down',
        preview: 'Error rate 100%. 4,200 sessions affected. Need your call now.',
        full: "Production is completely down. Error rate hit 100% at 2:24am — we're 23 minutes in. 4,200 active sessions affected right now.\n\nI can do an emergency rollback to the last stable build. Back up in 8 minutes but we lose 72 hours of user-generated data. Or I try a patch in-place — 2-3 hours, uncertain, no data loss.\n\nWaiting on your call.",
        choices: [
          { text: 'Do the rollback. Accept the data loss.', tag: 'Rollback', health: +18, note: 'Back up in 9 minutes. 72 hours of data gone for 340 users. You\'ll need to notify them. Painful but clean.' },
          { text: 'Try the in-place patch. No data loss.', tag: 'Patch', health: -5, note: 'Priya works for 2.5 hours. Unstable the whole time. Two enterprise clients email during the outage. She fixes it.' },
          { text: 'Hold on — let me think. Brief the team first.', tag: 'Delay', health: -18, note: 'By the time you decide, the outage is 47 minutes old. Twitter has noticed. One investor has also seen it.' },
        ],
      },
      {
        id: 'journalist',
        character: { name: 'Sarah Okafor', avatar: '📱', role: 'TechCrunch' },
        urgency: 'URGENT',
        subject: 'Comment request — 4am deadline',
        preview: "Writing about startup infrastructure failures. I have your uptime data.",
        full: "Hi — I'm covering startup reliability issues for a piece publishing tomorrow. I have your StatusPage history showing this is your third significant outage this quarter.\n\nOffering you the chance to comment before we publish. My deadline is 4am.\n\nIf I don't hear from you, I'll note that the company declined to comment.",
        choices: [
          { text: 'Respond now. Full transparency.', tag: 'Transparent', health: +20, note: '"Refreshingly honest" — your response gets quoted more than the article itself. The piece still publishes but the tone shifts.' },
          { text: 'Ask for 2 more hours to prepare a statement.', tag: 'Negotiate', health: +6, note: 'She agrees. You write something measured. The story comes out softer. Still mentions the outages.' },
          { text: 'Don\'t engage. It\'s 2am and this isn\'t worth it.', tag: 'Ignore', health: -22, note: '"Company declined to comment" appears five times. The piece publishes at 4:03am. By 9am: 2,100 shares.' },
        ],
      },
    ],
  },
  {
    id: 2,
    time: '3:18 AM',
    context: 'The server is coming back. Your inbox is not getting quieter.',
    crises: [
      {
        id: 'investor',
        character: { name: 'Marcus Chen', avatar: '💼', role: 'Lead Investor' },
        urgency: 'URGENT',
        subject: 'Call me.',
        preview: "Saw the downtime. Need to understand what happened. Now.",
        full: "Saw the StatusPage alert an hour ago. Been watching the error rate.\n\nI need to understand: is this a one-off engineering failure or a sign of something structural? We're 6 weeks from your next tranche and this is not the timing I needed.\n\nCall me. I don't care what time it is.",
        choices: [
          { text: 'Call him immediately. Walk through everything.', tag: 'Call now', health: +15, note: 'Tense 40-minute call. He asks hard questions. Your honesty lands. "Keep me updated" — he doesn\'t pull the tranche.' },
          { text: 'Send a detailed written update — more considered than a 3am call.', tag: 'Written update', health: +8, note: 'He reads it. Responds: "Adequate. Let\'s talk in the morning." The tranche is not mentioned. For now.' },
          { text: 'Reply: "We\'re on it. I\'ll have a full post-mortem by morning."', tag: 'Defer', health: -12, note: 'He reads it and doesn\'t reply. At 6am his EA sends a calendar invite. Labelled "Urgent — YourCo review."' },
        ],
      },
      {
        id: 'cofounder',
        character: { name: 'Alex Winters', avatar: '💬', role: 'CTO / Co-founder' },
        urgency: 'HIGH',
        subject: 'Read receipts — no reply',
        preview: "You\'ve sent 4 messages. All read. Nothing back. For 90 minutes.",
        full: "You've sent:\n→ 'Server down, what do you know?'\n→ 'Alex are you up?'\n→ 'This is bad, I need you'\n→ 'Please respond'\n\nAll read. 90 minutes of silence.\n\nPriya told you 20 minutes ago that Alex reviewed the deploy that caused the outage — and approved it.",
        choices: [
          { text: 'Call him right now — force the conversation.', tag: 'Call', health: +10, note: 'He answers. Sounds exhausted and defensive. The conversation is hard. But you end it with a plan. Trust is strained but intact.' },
          { text: 'Send one final message: "I need to know you\'re with me."', tag: 'Message', health: 0, note: 'He replies two hours later. Doesn\'t explain the silence. Says "I\'m on it." You don\'t know what that means.' },
          { text: 'Leave it. You\'ll deal with Alex in the morning.', tag: 'Wait', health: -10, note: 'The team notices the co-founders aren\'t coordinating. Priya asks: "Is everything okay between you two?" Not great.' },
        ],
      },
    ],
  },
  {
    id: 3,
    time: '4:05 AM',
    context: 'The TechCrunch piece just dropped. Three Slack channels are active.',
    crises: [
      {
        id: 'big_customer',
        character: { name: 'Rachel Drummond', avatar: '🏢', role: 'COO — Meridian Corp' },
        urgency: 'CRITICAL',
        subject: 'RE: Service disruption — data question',
        preview: "$340k ARR. 'Was our data affected? Do we need to speak to legal?'",
        full: "We became aware of your outage tonight via third-party monitoring. We've been a customer for 22 months.\n\nI need to know two things before our 8am board meeting:\n1. Was Meridian's data affected or at risk?\n2. Is there any possibility this was a security event?\n\nDepending on your answer, we may need to speak with our legal team about our SLA obligations.",
        choices: [
          { text: 'Respond fully and factually. No data was affected. Explain exactly why.', tag: 'Full answer', health: +22, note: 'She replies at 4:47am: "Understood. Thank you for the detail. We\'ll be in touch after our board meeting." The contract survives.' },
          { text: 'Send a brief reassurance and schedule a call for 7am.', tag: 'Brief + call', health: +8, note: 'She accepts the call. You explain everything. She asks if you can put it in writing for the board. You do.' },
          { text: 'Forward to your Head of Customer Success and CC Rachel.', tag: 'Delegate', health: -20, note: 'Rachel sees the forward at 4:22am. Replies: "I see this warranted delegation. We\'ll have our legal team reach out." That\'s not good.' },
        ],
      },
      {
        id: 'senior_eng',
        character: { name: 'Jamie Lee', avatar: '😤', role: 'Senior Engineer' },
        urgency: 'HIGH',
        subject: 'I need to say something',
        preview: "I've been here 2 years. Tonight was the last straw for a lot of people.",
        full: "I've been at this company for two years. I joined because I believed in the mission and the team.\n\nTonight I watched Priya alone firefight a production crisis for three hours while leadership was unreachable and the co-founders weren't talking. I watched the team message each other trying to figure out what was happening.\n\nI'm not the only one who feels this. I have an offer from Stripe. $290k total comp. I've been sitting on it.\n\nI wanted to tell you directly before I made a decision.",
        choices: [
          { text: 'Ask to talk right now. Listen fully before saying anything.', tag: 'Listen first', health: +15, note: 'You talk for an hour. He says what the team actually thinks. You hear things you didn\'t know. He doesn\'t accept the Stripe offer.' },
          { text: 'Be honest about tonight\'s failures and ask for one month.', tag: 'One month', health: +5, note: 'He agrees to the month. You have 30 days to show something\'s changed. The conversation is saved in his Notes app.' },
          { text: 'Send him the comp bands and say you\'ll match Stripe\'s offer.', tag: 'Match offer', health: -12, note: 'He reads it. Replies: "This isn\'t about money." He submits his resignation three days later. Four others follow in six weeks.' },
        ],
      },
    ],
  },
  {
    id: 4,
    time: '5:30 AM',
    context: "The sun isn't up yet. You've been at your desk for 3 hours.",
    crises: [
      {
        id: 'board',
        character: { name: 'Diana Yates', avatar: '📋', role: 'Board Chair' },
        urgency: 'HIGH',
        subject: 'Emergency board call — 7am today',
        preview: "Mandatory. All board members. I\'ve already sent the invite.",
        full: "Good morning.\n\nI've been following tonight's events. I've called an emergency board session for 7am this morning. All members have accepted.\n\nTopics:\n1. Post-incident review\n2. Leadership coordination\n3. Series B timeline\n\nI'd like you to prepare a 10-minute incident summary. We'll give you the floor first.\n\nThis is not optional.",
        choices: [
          { text: 'Reply: "I\'ll be ready. Preparing the summary now."', tag: 'Accept + prepare', health: +18, note: 'You spend 90 minutes on a clear, honest summary. The board is tough but the preparation shows. They don\'t move to replace you.' },
          { text: 'Reply: "Understood. Can we push to 9am — I need more time?"', tag: 'Request delay', health: +3, note: 'She agrees to 8am. Barely. The compressed prep time shows in the first 5 minutes. You recover by the end.' },
          { text: 'Call Marcus first to align before the board call.', tag: 'Align investor', health: +10, note: 'Marcus respects the call. You arrive at the board meeting knowing where he stands. Three board members notice you\'re calm.' },
        ],
      },
      {
        id: 'competitor',
        character: { name: 'Twitter / X', avatar: '🔥', role: 'Trending' },
        urgency: 'MEDIUM',
        subject: 'Rival posting about your outage',
        preview: "Vercel just tweeted: 'Reliability isn't a feature. It\'s the product.' — 8k likes.",
        full: "Vercel's account just posted:\n\n\"Reliability isn't a feature. It's the product. Our uptime over the last 90 days: 99.998%. Deployments don't have to be scary.\"\n\nThey've pinned it. Currently 8,200 likes. Two of your enterprise clients have liked it. The tweet doesn't name you but everyone in the thread is tagging you.\n\nYour team's Slack has a link to it with the 👀 emoji.",
        choices: [
          { text: 'Don\'t engage publicly. Send your team a message about it.', tag: 'Internal only', health: +8, note: 'Good call. The thread dies by morning. Your team message: "I saw it. We\'ll be the company that responds by being better." Screenshot gets shared internally.' },
          { text: 'Post your own uptime stats with context for tonight\'s outage.', tag: 'Counter-post', health: -5, note: 'Looks defensive. The replies are not kind. Someone digs up your StatusPage history and posts it. The thread grows.' },
          { text: 'DM Vercel\'s founder privately about the tweet.', tag: 'DM founder', health: -15, note: 'He screenshots it and posts it with the caption "lol." You become the main character for about 6 hours.' },
        ],
      },
    ],
  },
  {
    id: 5,
    time: '7:03 AM',
    context: 'Board call just ended. Coffee is cold. One more thing.',
    crises: [
      {
        id: 'team_allhands',
        character: { name: 'The Team', avatar: '👥', role: 'Company-wide Slack' },
        urgency: 'HIGH',
        subject: '#general — something needs to be said',
        preview: "28 people online. Thread of 14 messages. Nobody from leadership has spoken.",
        full: "#general — started 40 minutes ago:\n\n→ 'Is anyone going to address what happened last night?'\n→ 'Priya single-handedly saved us. Where was everyone else?'\n→ 'I heard the co-founders weren't even coordinating'\n→ 'Serious question: should we be worried about the company?'\n→ 'I have a 1:1 with my manager today and I genuinely don't know what to tell my manager'\n\n14 messages. 28 people online. The thread is three hours old. You haven't said anything.",
        choices: [
          { text: 'Post a full message. Own everything. Credit Priya specifically.', tag: 'Full accountability', health: +25, note: 'The thread goes quiet for 2 minutes. Then: 🙏🙏🙏🙏🙏 from almost everyone. The DMs you receive in the next hour say more.' },
          { text: 'Post a brief message and announce a company-wide debrief at noon.', tag: 'Acknowledge + debrief', health: +12, note: 'The debrief is uncomfortable and honest. Morale doesn\'t fully recover today. But it starts to.' },
          { text: 'Ask your EA to draft something and post it in 20 minutes.', tag: 'Delegate', health: -20, note: 'Someone in the thread posts: "Finally leadership speaks — 20 mins after this started." The EA\'s statement is clearly written by someone who wasn\'t there.' },
        ],
      },
      {
        id: 'next_tranche',
        character: { name: 'Marcus Chen', avatar: '💰', role: 'Lead Investor' },
        urgency: 'CRITICAL',
        subject: 'Series B tranche — decision needed',
        preview: "Based on last night and this morning: I need your answer on one question.",
        full: "Based on last night's incident and what I heard on this morning's board call, I need to make a decision about the next tranche.\n\nHere's my honest read: the technical failure was recoverable. What concerned me was the 90-minute communication gap between co-founders and the fact that Priya was alone for three hours.\n\nBefore I release the $3.2M: I need to hear from you, in your own words — not a deck, not a memo — what has to change and why it will.",
        choices: [
          { text: 'Call him right now. Talk. No notes, no deck.', tag: 'Raw conversation', health: +30, note: 'Twenty-two minutes. You say things you\'ve been avoiding. He says things you needed to hear. The tranche releases on Friday. Something real just happened between you two.' },
          { text: 'Send a detailed structured plan: new oncall process, co-founder sync, comms protocol.', tag: 'Structured plan', health: +10, note: '"Thorough. Professional." He releases the tranche with a note: "Hold yourself to this." The plan goes in a drawer. For now.' },
          { text: 'Ask for a week to put together a proper response.', tag: 'Ask for time', health: -25, note: '"A week." Long pause on his end. "Okay." The tranche is put on hold. Word reaches the other board members. The week feels like a year.' },
        ],
      },
    ],
  },
]

const ROUND_TIME = 90 // seconds per round

// ─── Health bar ───────────────────────────────────────────────────────────────
function HealthBar({ health }) {
  const col = health > 60 ? '#4ADE80' : health > 35 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Company</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div animate={{ width: `${Math.max(0, health)}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: col, borderRadius: 3, boxShadow: health < 30 ? `0 0 8px ${col}` : 'none' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color: col, minWidth: 28, textAlign: 'right' }}>{Math.max(0, health)}</span>
    </div>
  )
}

// ─── Urgency badge ────────────────────────────────────────────────────────────
const URGENCY_STYLE = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.30)' },
  URGENT:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' },
  HIGH:     { color: '#8B8FFF', bg: 'rgba(139,143,255,0.12)', border: 'rgba(139,143,255,0.30)' },
  MEDIUM:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.25)' },
}

// ─── Crisis card (collapsed — inbox view) ────────────────────────────────────
function CrisisCard({ crisis, onOpen, waiting, escalated, resolved }) {
  const us = URGENCY_STYLE[crisis.urgency] || URGENCY_STYLE.MEDIUM

  return (
    <motion.button
      whileHover={resolved || waiting ? {} : { scale: 1.01 }}
      whileTap={resolved || waiting ? {} : { scale: 0.99 }}
      onClick={() => !resolved && !waiting && onOpen()}
      animate={escalated && !resolved ? {
        boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 16px rgba(239,68,68,0.35)', '0 0 0px rgba(239,68,68,0)'],
      } : {}}
      transition={{ duration: 1.2, repeat: escalated && !resolved ? Infinity : 0 }}
      style={{
        width: '100%', textAlign: 'left',
        padding: '14px 16px',
        borderRadius: 14,
        background: resolved
          ? 'rgba(74,222,128,0.05)'
          : waiting
          ? 'rgba(255,255,255,0.02)'
          : escalated
          ? 'rgba(239,68,68,0.07)'
          : 'rgba(255,255,255,0.05)',
        border: resolved
          ? '1px solid rgba(74,222,128,0.18)'
          : escalated && !waiting
          ? '1px solid rgba(239,68,68,0.35)'
          : '1px solid rgba(255,255,255,0.08)',
        cursor: resolved || waiting ? 'default' : 'pointer',
        opacity: waiting ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{crisis.character.avatar}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: resolved ? 'rgba(74,222,128,0.70)' : 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {crisis.character.name}
            </span>
            {!resolved && (
              <span style={{ fontSize: 9, fontWeight: 800, color: us.color, background: us.bg, border: `1px solid ${us.border}`, borderRadius: 99, padding: '2px 7px', letterSpacing: '0.08em', flexShrink: 0 }}>
                {escalated ? '⚠ ESCALATING' : crisis.urgency}
              </span>
            )}
            {resolved && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#4ADE80', background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.20)', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.08em', flexShrink: 0 }}>
                HANDLED
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {crisis.subject}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {crisis.preview}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ═══ MAIN GAME ════════════════════════════════════════════════════════════════
export default function MeltdownGame({ onClose }) {
  const addXP = useXPStore(s => s.addXP)

  const [roundIdx, setRoundIdx] = useState(0)
  const [health, setHealth] = useState(75)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME)
  const [phase, setPhase] = useState('inbox')     // inbox | reading | consequence | roundEnd | dead | won
  const [activeIdx, setActiveIdx] = useState(null) // which crisis is open
  const [resolved, setResolved] = useState([])     // indices resolved this round
  const [choiceMade, setChoiceMade] = useState(null)
  const [timerRunning, setTimerRunning] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)

  const round = ROUNDS[roundIdx]

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning || phase === 'roundEnd' || phase === 'dead' || phase === 'won' || phase === 'consequence') return
    if (timeLeft <= 0) {
      handleTimeout()
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft, timerRunning, phase])

  // ─── Reset timer on new round ────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(ROUND_TIME)
    setResolved([])
    setActiveIdx(null)
    setPhase('inbox')
    setTimerRunning(true)
    setTimedOut(false)
  }, [roundIdx])

  // ─── Handle timeout ──────────────────────────────────────────────────────
  const handleTimeout = () => {
    setTimerRunning(false)
    setTimedOut(true)
    // Auto-fail unresolved crises: -15 each
    const unresolved = round.crises.filter((_, i) => !resolved.includes(i))
    const penalty = unresolved.length * 15
    const newHealth = Math.max(0, health - penalty)
    setHealth(newHealth)
    if (newHealth <= 0) {
      setPhase('dead')
    } else {
      setPhase('roundEnd')
    }
  }

  // ─── Open a crisis ───────────────────────────────────────────────────────
  const openCrisis = (idx) => {
    setActiveIdx(idx)
    setPhase('reading')
    setTimerRunning(false)
  }

  // ─── Make a choice ───────────────────────────────────────────────────────
  const makeChoice = (choice) => {
    const newHealth = Math.max(0, Math.min(100, health + choice.health))
    setHealth(newHealth)
    setChoiceMade(choice)
    setResolved(r => [...r, activeIdx])
    setPhase('consequence')
    // Resume timer
    setTimeout(() => {
      setTimerRunning(true)
      setPhase('inbox')
      setActiveIdx(null)
      setChoiceMade(null)
      // Check if all resolved
      if (resolved.length + 1 >= round.crises.length) {
        setTimerRunning(false)
        setTimeout(() => {
          if (newHealth <= 0) setPhase('dead')
          else setPhase('roundEnd')
        }, 400)
      }
    }, 2200)
  }

  // ─── Next round ──────────────────────────────────────────────────────────
  const nextRound = () => {
    if (roundIdx >= ROUNDS.length - 1) {
      addXP('SOCRATIC_5')
      setPhase('won')
    } else {
      setRoundIdx(r => r + 1)
    }
  }

  // ─── Timer colour ────────────────────────────────────────────────────────
  const timerPct = timeLeft / ROUND_TIME
  const timerCol = timerPct > 0.4 ? '#8B8FFF' : timerPct > 0.2 ? '#F59E0B' : '#EF4444'

  // ─── Escalation: any unresolved crisis after 50% time is escalated ───────
  const isEscalated = (idx) => timeLeft < ROUND_TIME * 0.5 && !resolved.includes(idx) && activeIdx !== idx

  const finalScore = health

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: '#04060F',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 65%)',
      }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        {/* Clock + title */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {round?.time || '—'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            The Meltdown
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Health bar */}
        <HealthBar health={health} />

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Round pips */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {ROUNDS.map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i < roundIdx ? '#6366F1' : i === roundIdx ? timerCol : 'rgba(255,255,255,0.12)',
              boxShadow: i === roundIdx ? `0 0 6px ${timerCol}` : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={onClose}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* ── Timer bar ──────────────────────────────────────────────────────── */}
      {(phase === 'inbox' || phase === 'reading') && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', flexShrink: 0, position: 'relative' }}>
          <motion.div
            animate={{ width: `${(timeLeft / ROUND_TIME) * 100}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
            style={{ height: '100%', background: timerCol, boxShadow: timeLeft < 20 ? `0 0 8px ${timerCol}` : 'none', transition: 'background 0.5s' }}
          />
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 640, width: '100%', margin: '0 auto', padding: '20px 20px 32px', gap: 12, position: 'relative', zIndex: 2 }}>

        <AnimatePresence mode="wait">

          {/* INBOX / READING ─────────────────────────────────────────────── */}
          {(phase === 'inbox' || phase === 'reading' || phase === 'consequence') && round && (
            <motion.div key={`round-${roundIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Context */}
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic', lineHeight: 1.5, padding: '0 2px' }}>
                {round.context}
              </div>

              {/* Timer label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={11} color={timerCol} />
                <span style={{ fontSize: 11, fontWeight: 700, color: timerCol, letterSpacing: '0.04em' }}>
                  {timeLeft}s remaining — handle both before time runs out
                </span>
              </div>

              {/* Crisis cards (inbox) */}
              {phase !== 'reading' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {round.crises.map((crisis, idx) => (
                    <CrisisCard
                      key={crisis.id}
                      crisis={crisis}
                      onOpen={() => openCrisis(idx)}
                      waiting={activeIdx !== null && activeIdx !== idx}
                      escalated={isEscalated(idx)}
                      resolved={resolved.includes(idx)}
                    />
                  ))}
                </div>
              )}

              {/* Open crisis — reading panel */}
              {phase === 'reading' && activeIdx !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {/* Other crisis — condensed, escalating */}
                  {round.crises.filter((_, i) => i !== activeIdx).map((other, i) => (
                    <CrisisCard key={other.id} crisis={other} onOpen={() => {}} waiting escalated={isEscalated(round.crises.indexOf(other))} resolved={resolved.includes(round.crises.indexOf(other))} />
                  ))}

                  {/* Active crisis message */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '20px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 22 }}>{round.crises[activeIdx].character.avatar}</span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{round.crises[activeIdx].character.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{round.crises[activeIdx].character.role}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, margin: '0 0 18px', whiteSpace: 'pre-line' }}>
                      {round.crises[activeIdx].full}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
                        Respond as
                      </div>
                      {round.crises[activeIdx].choices.map((c, ci) => (
                        <motion.button
                          key={ci}
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                          onClick={() => makeChoice(c)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                            color: 'rgba(255,255,255,0.84)', fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: 13.5, fontWeight: 500, cursor: 'pointer', lineHeight: 1.45,
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                          }}
                        >
                          <span>{c.text}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{c.tag}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Consequence flash */}
              {phase === 'consequence' && choiceMade && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: choiceMade.health >= 0 ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${choiceMade.health >= 0 ? 'rgba(74,222,128,0.20)' : 'rgba(239,68,68,0.20)'}`,
                    borderRadius: 14, padding: '16px 18px',
                  }}
                >
                  <div style={{ display: 'flex', align: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: choiceMade.health >= 0 ? '#4ADE80' : '#EF4444' }}>
                      {choiceMade.health >= 0 ? `+${choiceMade.health}` : choiceMade.health} health
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: 600 }}>· {choiceMade.tag}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                    "{choiceMade.note}"
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ROUND END ───────────────────────────────────────────────────── */}
          {phase === 'roundEnd' && (
            <motion.div key="roundEnd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {timedOut && (
                <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>⏱ Time ran out — unhandled messages auto-escalated.</span>
                </div>
              )}
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                Round {roundIdx + 1} of {ROUNDS.length} complete.{' '}
                {roundIdx < ROUNDS.length - 1 ? 'More messages incoming.' : 'That\'s everything.'}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Company health</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: health > 50 ? '#4ADE80' : health > 30 ? '#F59E0B' : '#EF4444', letterSpacing: '-0.04em' }}>{health}<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>/100</span></div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={nextRound}
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                {roundIdx < ROUNDS.length - 1 ? `→ ${ROUNDS[roundIdx + 1]?.time} — next wave` : '→ See how it ends'}
              </motion.button>
            </motion.div>
          )}

          {/* DEAD ────────────────────────────────────────────────────────── */}
          {phase === 'dead' && (
            <motion.div key="dead" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 20, textAlign: 'center' }}
            >
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontSize: 56 }}>📉</motion.div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#EF4444', letterSpacing: '-0.03em', marginBottom: 8 }}>The company didn't make it.</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 380 }}>
                  By 9am, the board voted to pause operations. The post-mortem cited communication failure, not the technical outage.
                </div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 14, padding: '16px 24px', width: '100%', maxWidth: 340 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Survived</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#EF4444' }}>Round {roundIdx + 1} of {ROUNDS.length}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setRoundIdx(0); setHealth(75); setPhase('inbox') }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Try again
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.60)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Exit
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* WON ─────────────────────────────────────────────────────────── */}
          {phase === 'won' && (
            <motion.div key="won" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 20, textAlign: 'center' }}
            >
              <motion.div animate={{ rotate: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.7, delay: 0.2 }} style={{ fontSize: 56 }}>🌅</motion.div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.03em', marginBottom: 8 }}>
                  {finalScore >= 65 ? 'You held it together.' : finalScore >= 40 ? 'You survived. Barely.' : 'You got through it. Just.'}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 380 }}>
                  {finalScore >= 65
                    ? "The board kept its confidence. Marcus released the tranche. The team saw a leader who didn't panic. That matters more than people say."
                    : finalScore >= 40
                    ? "The company survived the night. The damage is real — trust will take months to rebuild. But it's still standing."
                    : "You made it to morning but only just. Three key decisions tonight will define the next six months. The work starts now."}
                </div>
              </div>
              <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 14, padding: '20px 24px', width: '100%', maxWidth: 340 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Final health score</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: finalScore >= 60 ? '#4ADE80' : finalScore >= 35 ? '#F59E0B' : '#EF4444', letterSpacing: '-0.04em' }}>
                  {finalScore}<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>/100</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {finalScore >= 70 ? 'Exceptional crisis management' : finalScore >= 50 ? 'Solid under pressure' : finalScore >= 35 ? 'Lived to fight another day' : 'Needs work'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setRoundIdx(0); setHealth(75); setPhase('inbox') }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Play again
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.60)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Exit
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
