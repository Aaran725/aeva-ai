import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { useXPStore } from './xpStore'

// ─── Scenario deck ────────────────────────────────────────────────────────────
// Each card: a real business dilemma with 3 choices + real tradeoffs.
// Effects are deltas to { cash, morale, product, trust } — range 0–100.

const DECK = [
  {
    id: 'burn_rate',
    character: { name: 'Maya Patel', role: 'CFO', avatar: '👩‍💼' },
    situation: "We have 4 months of runway left. Burn rate is $180k/month. Revenue is $38k MRR. At this pace we won't be profitable for 14 months.",
    choices: [
      { text: 'Cut 8 engineers — extend runway to 9 months', tag: 'Reduce headcount', effects: { cash: +20, morale: -25, product: -14, trust: -5 }, note: 'Runway extended. Morale is shattered. Velocity drops 40%. The remaining engineers are updating their CVs.' },
      { text: 'Emergency bridge round — any valuation', tag: 'Raise capital', effects: { cash: +28, morale: +5, product: 0, trust: -18 }, note: "Closed at a 35% discount to your last round. You're diluted but alive. Existing investors are not pleased." },
      { text: 'All-in on sales — $80k MRR in 60 days or shut down', tag: 'Revenue sprint', effects: { cash: -10, morale: +15, product: 0, trust: +12 }, note: 'The team rallies around the challenge. 60 days. This either saves the company or kills it faster. No middle ground.' },
    ],
  },
  {
    id: 'star_hire',
    character: { name: 'Priya Nair', role: 'Head of Engineering', avatar: '👩‍💻' },
    situation: "We found the perfect senior engineer. Ex-Google, built similar systems at scale. She wants $240k — 45% above our band. She has two other offers.",
    choices: [
      { text: 'Match her ask — break the pay band', tag: 'Hire at full ask', effects: { cash: -14, morale: -8, product: +22, trust: +8 }, note: 'She joins. Three existing engineers immediately ask for raises. The pay band is effectively dead.' },
      { text: 'Counter at $185k + equity — see if she walks', tag: 'Negotiate hard', effects: { cash: -5, morale: +4, product: +8, trust: +3 }, note: "She declines. You hire someone good but not exceptional. Product roadmap slips by one quarter." },
      { text: 'Skip her — promote internally instead', tag: 'Internal promotion', effects: { cash: 0, morale: +18, product: -8, trust: +10 }, note: 'Team is energised by the promotion signal. Technical ceiling stays lower than needed for the next stage.' },
    ],
  },
  {
    id: 'enterprise_feature',
    character: { name: 'David Marsh', role: 'VP Sales', avatar: '🤝' },
    situation: "$180k ARR deal on the table. One condition: we build a custom SSO integration they need. 6-week build. It benefits only them.",
    choices: [
      { text: 'Build it — $180k ARR is $180k ARR', tag: 'Ship the custom feature', effects: { cash: +22, morale: -12, product: -18, trust: +10 }, note: 'Deal closes. Engineering is furious. Three roadmap features slip. Two other enterprise prospects now expect the same.' },
      { text: 'Decline — protect the product roadmap', tag: 'Protect roadmap', effects: { cash: -5, morale: +10, product: +14, trust: -8 }, note: 'The deal dies. Product moves faster. Sales team questions whether leadership understands what it takes to close.' },
      { text: 'Say yes, then charge them a $40k integration fee', tag: 'Yes, but price it', effects: { cash: +28, morale: +5, product: -8, trust: +4 }, note: "They accept. Sets a precedent that custom work has a price. Engineering is still annoyed but less so." },
    ],
  },
  {
    id: 'press_leak',
    character: { name: 'Jamie Soto', role: 'Head of Comms', avatar: '📱' },
    situation: "A journalist from TechCrunch has your internal growth numbers — 60% decline last quarter. Story publishes in 4 hours unless you respond.",
    choices: [
      { text: 'Get ahead of it — publish your own post first', tag: 'Own the narrative', effects: { cash: 0, morale: +12, product: 0, trust: +20 }, note: "Radical transparency wins. Your honest post gets more engagement than the TechCrunch piece. Team rallies. Trust in leadership spikes." },
      { text: "Stonewall — don't confirm or deny anything", tag: 'No comment', effects: { cash: 0, morale: -10, product: 0, trust: -22 }, note: 'Story publishes with "company refused to comment." Three enterprise customers email asking for a call. Not a good email.' },
      { text: 'Offer the journalist an exclusive interview for a delay', tag: 'Negotiate with press', effects: { cash: 0, morale: +5, product: 0, trust: +5 }, note: 'Buys 48 hours. You prepare a strong narrative. Story still runs but your framing dominates the first paragraph.' },
    ],
  },
  {
    id: 'cofounder_conflict',
    character: { name: 'Alex Winters', role: 'CTO & Co-founder', avatar: '⚔️' },
    situation: "Your CTO wants to spend 4 months rewriting the core product from scratch — 'the current architecture won't scale.' Sales pipeline has $2M in it. Timing is terrible.",
    choices: [
      { text: 'Back the rewrite — trust the technical judgment', tag: 'Full rewrite', effects: { cash: -15, morale: +10, product: -20, trust: -10 }, note: "Rewrite takes 6 months, not 4. Two enterprise deals walk. The new architecture is genuinely better. You're 6 months behind where you needed to be." },
      { text: "Veto it — ship features, fix architecture incrementally", tag: 'Incremental fixes', effects: { cash: +8, morale: -18, product: +5, trust: +5 }, note: "CTO is visibly frustrated but complies. Ships features. Technical debt compounds. The argument resurfaces every quarter." },
      { text: 'Compromise — 6-week targeted refactor of the worst parts', tag: 'Targeted refactor', effects: { cash: -5, morale: +8, product: +5, trust: +8 }, note: 'Both sides feel heard. Partial fix reduces immediate risk. The real architectural reckoning is deferred 12 months.' },
    ],
  },
  {
    id: 'competitor_launch',
    character: { name: 'Lauren Hsu', role: 'VP Product', avatar: '🔭' },
    situation: "Salesforce just launched a free version of your core product. Your pricing starts at $99/month. Three prospects have already paused their evaluations.",
    choices: [
      { text: 'Match them — launch a free tier immediately', tag: 'Go freemium', effects: { cash: -20, morale: +8, product: -5, trust: +15 }, note: 'Sign-ups spike 400%. Conversion to paid is 3%. You now need 10x the infrastructure for 1.3x the revenue. Ticking clock.' },
      { text: 'Double down on the premium segment — raise prices', tag: 'Move upmarket', effects: { cash: +12, morale: -5, product: +10, trust: -8 }, note: 'You lose the low end. The accounts that stay are significantly better. This only works if your enterprise product is actually better.' },
      { text: 'Accelerate one differentiating feature they cannot match', tag: 'Sprint on differentiation', effects: { cash: -8, morale: +18, product: +20, trust: +5 }, note: 'Team finds the threat galvanising. You ship the feature in 3 weeks. Two prospects come back. One cites it as the reason.' },
    ],
  },
  {
    id: 'key_churn',
    character: { name: 'Tom Okafor', role: 'Head of CS', avatar: '😰' },
    situation: "Your largest customer — $52k MRR, 18 months in — just emailed asking to cancel at renewal in 30 days. Reason: 'not seeing ROI.' No prior warning.",
    choices: [
      { text: 'Jump on a call today — CEO to CEO', tag: 'Escalate to exec level', effects: { cash: +8, morale: +12, product: 0, trust: +15 }, note: 'The call reveals a misconfiguration their team caused. You fix it together. They renew. Post-mortem uncovers a CS process gap.' },
      { text: 'Offer 50% discount to retain them', tag: 'Retention discount', effects: { cash: -15, morale: -5, product: 0, trust: -5 }, note: 'They accept. You kept the logo but halved the revenue. This discount will leak to your other accounts within 6 weeks.' },
      { text: 'Let them churn — investigate why for future prevention', tag: 'Accept and learn', effects: { cash: -15, morale: -8, product: +10, trust: +5 }, note: 'Exit interview reveals a product gap your roadmap was already addressing. You accelerate it. Prevents three future churns.' },
    ],
  },
  {
    id: 'tech_debt',
    character: { name: 'Priya Nair', role: 'Head of Engineering', avatar: '⚠️' },
    situation: "Production is falling over at 2,000 concurrent users. Your new campaign will push 8,000 next week. The fix requires 3 weeks of engineering focus — nothing else ships.",
    choices: [
      { text: 'Pause the campaign — fix the infrastructure first', tag: 'Engineering focus', effects: { cash: -10, morale: +15, product: +20, trust: +8 }, note: 'Campaign delayed by 3 weeks. System is solid. When the campaign finally runs it handles 12,000 users without a sweat.' },
      { text: 'Run the campaign — patch things as they break', tag: 'Ship and patch', effects: { cash: +15, morale: -15, product: -20, trust: -18 }, note: 'System crashes at 3,200 users. 4-hour outage on launch day. Campaign ROI is destroyed. Engineering trust in leadership craters.' },
      { text: 'Hire two contract engineers to fix it while the team ships', tag: 'Bring in contractors', effects: { cash: -15, morale: +5, product: +10, trust: +5 }, note: 'Expensive. Takes 10 days to onboard them. Mostly works. Campaign launches one week late with minor issues.' },
    ],
  },
  {
    id: 'pricing_model',
    character: { name: 'Sam Rivera', role: 'VP Growth', avatar: '📊' },
    situation: "Data shows 73% of free users never convert. Paid plans start at $29/month. Option A: raise to $79. Option B: kill free, force trials. Option C: keep everything the same.",
    choices: [
      { text: 'Raise prices to $79 — focus on serious buyers', tag: 'Premium positioning', effects: { cash: +18, morale: +5, product: 0, trust: -12 }, note: 'Lost 35% of paid users immediately. Revenue went up 28%. Support tickets went down 60%. Better users, fewer of them.' },
      { text: 'Kill free tier — 14-day trial only', tag: 'Eliminate freemium', effects: { cash: +12, morale: -8, product: 0, trust: -20 }, note: 'Product Hunt community angry. Churn spikes for 6 weeks then stabilises. New ARR per month up 40%. Community trust damaged.' },
      { text: 'Keep the model — optimize conversion instead', tag: 'Fix the funnel', effects: { cash: -5, morale: +8, product: +5, trust: +10 }, note: 'Hire a growth PM. Run 12 conversion experiments over 8 weeks. Conversion rate moves from 5% to 9%. Slower but cleaner.' },
    ],
  },
  {
    id: 'legal_threat',
    character: { name: 'Rebecca Lim', role: 'Legal Counsel', avatar: '⚖️' },
    situation: "A patent troll is demanding $1.8M to license a patent on 'AI-assisted user onboarding.' Their patent is likely invalid but fighting it costs $600k in legal fees.",
    choices: [
      { text: 'Fight — this is predatory and the patent is weak', tag: 'Litigate', effects: { cash: -18, morale: +15, product: 0, trust: +12 }, note: "18-month legal battle. You win. Patent declared invalid. Legal fees hit $720k. You're now a case study other founders cite." },
      { text: 'Settle — pay $400k to make it go away', tag: 'Settle quickly', effects: { cash: -12, morale: -10, product: 0, trust: -8 }, note: 'Done in 6 weeks. Two other trolls send letters 3 months later, having noticed you pay rather than fight.' },
      { text: 'Modify the product to work around the patent', tag: 'Engineer around it', effects: { cash: -8, morale: -5, product: -10, trust: +5 }, note: '8-week engineering sprint. Feature is slightly worse but legally clean. The troll goes quiet when they see the approach.' },
    ],
  },
  {
    id: 'partnership_offer',
    character: { name: 'Chris Nguyen', role: 'Head of Biz Dev', avatar: '🤝' },
    situation: "Microsoft wants to integrate your product into Azure. $4.2M revenue share deal. Catch: they get your customer data, your roadmap visibility, and a right-of-first-refusal on acquisition.",
    choices: [
      { text: "Sign it — $4.2M and Microsoft's distribution is transformative", tag: 'Accept the deal', effects: { cash: +28, morale: +10, product: -5, trust: -15 }, note: 'Revenue explodes. Three competitors immediately reach out to Microsoft about similar deals. Your roadmap is no longer truly yours.' },
      { text: 'Walk — the data and ROFR clauses are too dangerous', tag: 'Decline', effects: { cash: -5, morale: +8, product: +8, trust: +18 }, note: 'Team respects the integrity call. Microsoft comes back in 6 months with softer terms. Independence maintained.' },
      { text: 'Counter — revenue share yes, data and ROFR gone', tag: 'Negotiate hard', effects: { cash: +15, morale: +12, product: 0, trust: +8 }, note: 'Microsoft walks initially. Returns 3 weeks later having dropped the ROFR. Data clause remains. You accept the compromise.' },
    ],
  },
  {
    id: 'expansion',
    character: { name: 'Sarah Chen', role: 'CFO', avatar: '🌍' },
    situation: "Inbound interest from 40+ companies in Europe. Opening a London office costs $1.2M/year fully loaded. Alternatively: hire 2 remote EU reps for $280k total.",
    choices: [
      { text: 'Open the London office — go big or go home', tag: 'Full office expansion', effects: { cash: -22, morale: +15, product: 0, trust: +10 }, note: 'Takes 8 months to hire. 14 months to break even. On month 15 it becomes your second largest revenue region. High risk, high reward.' },
      { text: 'Two remote EU reps — test before committing', tag: 'Remote-first test', effects: { cash: -8, morale: +5, product: 0, trust: +8 }, note: 'One rep is exceptional. One misses quota for 3 quarters. You learn what "EU success" actually looks like before overcommitting.' },
      { text: 'Find a reseller partner in EMEA — no headcount', tag: 'Channel partnership', effects: { cash: +5, morale: -5, product: 0, trust: -5 }, note: 'Revenue comes in but margin is 40% lower. Partner sells your product inaccurately to 30% of their customers. Hard to control quality.' },
    ],
  },
]

// ─── Special events (fixed to specific days) ─────────────────────────────────
const SPECIAL_EVENTS = {
  4: {
    id: 'engineer_poached',
    character: { name: 'Your Lead Engineer', role: 'Incoming message 3 min ago', avatar: '🚨' },
    situation: "Just got an offer from Google. $320k total comp. I love it here — but I have to give them an answer by 5pm today. Wanted to tell you first.",
    choices: [
      { text: 'Counter at $280k + 0.5% equity acceleration', tag: 'Compete for them', effects: { cash: -18, morale: +20, product: +15, trust: +10 }, note: 'They stay. Rest of engineering team is energised — leadership clearly values people. Two other top performers notice.' },
      { text: "Let them go — you can't win a comp war with Google", tag: 'Accept the loss', effects: { cash: +5, morale: -20, product: -18, trust: -5 }, note: 'They leave. Three junior engineers start interviewing within 2 weeks. The tribal knowledge loss takes 6 months to recover.' },
      { text: 'Promote them to Engineering Director + $40k raise', tag: 'Create a new role', effects: { cash: -10, morale: +15, product: -5, trust: +8 }, note: "They accept the title and impact. Two other senior engineers expect the same treatment. You've created a new compensation tier." },
    ],
  },
  7: {
    id: 'viral_crisis',
    character: { name: 'Twitter / X — Trending', role: 'Crisis — now', avatar: '🔥' },
    situation: "A tech influencer with 820k followers posted a thread: 'How [YourCo] lost my data and lied about it for 3 months.' It's wrong — but it's at 14k RTs and climbing.",
    choices: [
      { text: 'CEO posts a public thread with full technical facts — immediately', tag: 'Respond publicly now', effects: { cash: 0, morale: +18, product: 0, trust: +25 }, note: 'Your thread is measured, factual, respectful. Community sides with you. The influencer deletes the post 6 hours later. Trust peaks.' },
      { text: 'DM the influencer privately — correct the record off-platform', tag: 'Private correction', effects: { cash: 0, morale: +5, product: 0, trust: -8 }, note: "They ignore you. Thread continues spreading. By the time it dies down, it's been seen 2.1 million times. Damage is done." },
      { text: 'Legal sends a cease and desist', tag: 'Lawyerup', effects: { cash: -8, morale: -5, product: 0, trust: -30 }, note: 'The C&D gets screenshotted and posted. "Startup silences critics" trend begins. This is now ten times worse than the original post.' },
    ],
  },
  10: {
    id: 'acquisition',
    character: { name: 'Incoming call: Stripe', role: 'Corp Dev — CONFIDENTIAL', avatar: '💎' },
    situation: "Stripe is offering $47M to acquire the company. Your last round valued you at $28M. Your cap table gets 2.1x. You've been building for 4 years. The team would get retention packages.",
    choices: [
      { text: 'Accept — $47M, your team is taken care of, this is a win', tag: 'Take the offer', effects: { cash: +30, morale: +20, product: 0, trust: +15 }, note: 'Deal closes in 90 days. You ring the bell. Three team members cry. Two investors tell you it was too early to sell. You sleep well.' },
      { text: 'Counter at $75M — test whether they really want this', tag: 'Counter aggressively', effects: { cash: +5, morale: +10, product: 0, trust: +5 }, note: "They come back at $58M. You've left some money on the table but validated the strategic value. Negotiation continues." },
      { text: "Decline — you're building something bigger and you know it", tag: 'Stay independent', effects: { cash: -10, morale: +25, product: +10, trust: +20 }, note: "Team is fired up. You raise a Series B at $90M valuation 8 months later. Either the best decision you ever made or the worst." },
    ],
  },
}

// ─── Meter config ─────────────────────────────────────────────────────────────
const METERS = [
  { key: 'cash',    label: 'Cash',    emoji: '💰', color: '#10B981', low: '#EF4444' },
  { key: 'morale',  label: 'Morale',  emoji: '👥', color: '#8B8FFF', low: '#EF4444' },
  { key: 'product', label: 'Product', emoji: '⚡', color: '#38BDF8', low: '#EF4444' },
  { key: 'trust',   label: 'Trust',   emoji: '🤝', color: '#F59E0B', low: '#EF4444' },
]

const TOTAL_DAYS = 10
const STARTING_METERS = { cash: 65, morale: 70, product: 60, trust: 65 }

// ─── Helper: clamp ────────────────────────────────────────────────────────────
function clamp(v) { return Math.max(0, Math.min(100, v)) }

// ─── Meter bar ────────────────────────────────────────────────────────────────
function MeterBar({ meter, value, delta }) {
  const isLow = value < 25
  const isCritical = value < 12
  const col = isLow ? meter.low : meter.color

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: isLow ? '#EF4444' : 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {meter.emoji} {meter.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {delta !== undefined && delta !== 0 && (
            <motion.span
              initial={{ opacity: 0, y: delta > 0 ? 6 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 10, fontWeight: 800, color: delta > 0 ? '#4ADE80' : '#EF4444' }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </motion.span>
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: isLow ? '#EF4444' : 'rgba(255,255,255,0.80)' }}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: isCritical
              ? `linear-gradient(90deg, #EF4444, #F87171)`
              : `linear-gradient(90deg, ${col}CC, ${col})`,
            borderRadius: 3,
            boxShadow: isCritical ? '0 0 8px rgba(239,68,68,0.60)' : 'none',
          }}
        />
      </div>
      {isCritical && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          style={{ fontSize: 9.5, color: '#EF4444', fontWeight: 700, marginTop: 2, letterSpacing: '0.06em' }}
        >
          CRITICAL
        </motion.div>
      )}
    </div>
  )
}

// ─── Choice button ─────────────────────────────────────────────────────────────
function ChoiceBtn({ choice, onPick, disabled }) {
  const positives = Object.entries(choice.effects).filter(([, v]) => v > 0)
  const negatives = Object.entries(choice.effects).filter(([, v]) => v < 0)
  const ICONS = { cash: '💰', morale: '👥', product: '⚡', trust: '🤝' }

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.015, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.985 }}
      onClick={() => !disabled && onPick(choice)}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.88)',
        fontFamily: "'Inter', system-ui, sans-serif",
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{choice.text}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
          {choice.tag}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {positives.map(([k, v]) => (
          <span key={k} style={{ fontSize: 10.5, color: '#4ADE80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingUp size={10} />{ICONS[k]} +{v}
          </span>
        ))}
        {negatives.map(([k, v]) => (
          <span key={k} style={{ fontSize: 10.5, color: '#F87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingDown size={10} />{ICONS[k]} {v}
          </span>
        ))}
      </div>
    </motion.button>
  )
}

// ─── Outcome card ─────────────────────────────────────────────────────────────
function OutcomeCard({ note, onNext, isLast }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '20px 22px',
      }}
    >
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, margin: '0 0 18px', fontStyle: 'italic' }}>
        "{note}"
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={onNext}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: isLast ? 'linear-gradient(135deg, #6366F1, #8B8FFF)' : 'rgba(99,102,241,0.18)',
          border: '1px solid rgba(99,102,241,0.40)',
          color: '#fff', fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {isLast ? '→ See your outcome' : '→ Next day'}
      </motion.button>
    </motion.div>
  )
}

// ═══ MAIN GAME ════════════════════════════════════════════════════════════════
export default function BoardroomGame({ onClose }) {
  const addXP = useXPStore(s => s.addXP)

  // ─── Game state ────────────────────────────────────────────────────────────
  const [meters, setMeters] = useState({ ...STARTING_METERS })
  const [deltas, setDeltas] = useState({})
  const [day, setDay] = useState(1)
  const [phase, setPhase] = useState('card')  // card | outcome | dead | won
  const [card, setCard] = useState(null)
  const [outcomeNote, setOutcomeNote] = useState('')
  const [deathMeter, setDeathMeter] = useState(null)
  const [deckQueue, setDeckQueue] = useState(() => shuffle([...DECK]))
  const [history, setHistory] = useState([])

  // ─── Shuffle helper ────────────────────────────────────────────────────────
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // ─── Load card for current day ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'card') return
    const special = SPECIAL_EVENTS[day]
    if (special) {
      setCard(special)
    } else {
      const [next, ...rest] = deckQueue
      setCard(next || DECK[0])
      setDeckQueue(rest.length ? rest : shuffle([...DECK]))
    }
    setDeltas({})
  }, [day, phase])

  // ─── Handle choice ─────────────────────────────────────────────────────────
  const pick = (choice) => {
    const newMeters = {}
    const newDeltas = {}
    let dead = null

    Object.keys(meters).forEach(k => {
      const raw = clamp(meters[k] + (choice.effects[k] || 0))
      newMeters[k] = raw
      newDeltas[k] = choice.effects[k] || 0
      if (raw <= 0) dead = k
    })

    setMeters(newMeters)
    setDeltas(newDeltas)
    setHistory(h => [...h, { day, card: card.id, choice: choice.tag }])
    setOutcomeNote(choice.note)

    if (dead) {
      setTimeout(() => {
        setDeathMeter(dead)
        setPhase('dead')
      }, 900)
      setPhase('outcome')
    } else if (day >= TOTAL_DAYS) {
      setPhase('outcome')
    } else {
      setPhase('outcome')
    }
  }

  // ─── Advance to next day ───────────────────────────────────────────────────
  const nextDay = () => {
    if (day >= TOTAL_DAYS) {
      setPhase('won')
      addXP('DRILL_COMPLETE')
      return
    }
    if (deathMeter) {
      setPhase('dead')
      return
    }
    setDay(d => d + 1)
    setPhase('card')
  }

  // ─── Meter label for death screen ─────────────────────────────────────────
  const DEATH_LINES = {
    cash:    { title: 'Company ran out of cash.', sub: 'The board voted you out this morning. The office is cleared by Thursday.' },
    morale:  { title: 'The team collapsed.', sub: 'An all-hands walkout. 65% of staff resigned in one week. There\'s nobody left to build.' },
    product: { title: 'Product quality hit zero.', sub: 'Three enterprise clients terminated simultaneously. The press picked it up by noon.' },
    trust:   { title: 'Investors lost confidence.', sub: 'Your Series B was pulled. Two board members resigned. The story was in TechCrunch by morning.' },
  }

  const lowest = Object.entries(meters).sort((a, b) => a[1] - b[1])[0]?.[0]
  const deadInfo = DEATH_LINES[deathMeter || lowest] || DEATH_LINES.cash

  // ─── Survival score ────────────────────────────────────────────────────────
  const score = Math.round(Object.values(meters).reduce((a, b) => a + b, 0) / 4)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: '#060914',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Background texture */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.08) 0%, transparent 60%)',
      }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏢</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>The Boardroom</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>Survive 10 days. Keep all four metrics alive.</div>
          </div>
        </div>

        {phase === 'card' || phase === 'outcome' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.04em' }}>Day {day}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>of {TOTAL_DAYS}</div>
            </div>
            {/* Day pip track */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: TOTAL_DAYS }).map((_, i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i < day ? '#6366F1' : i === day - 1 ? '#8B8FFF' : 'rgba(255,255,255,0.12)',
                  boxShadow: i === day - 1 ? '0 0 6px rgba(139,143,255,0.60)' : 'none',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} />
          </motion.button>
        )}
      </div>

      {/* ── Meters ─────────────────────────────────────────────────────────── */}
      {(phase === 'card' || phase === 'outcome') && (
        <div style={{
          padding: '16px 24px',
          display: 'flex', gap: 20,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0, position: 'relative', zIndex: 2,
        }}>
          {METERS.map(m => (
            <MeterBar key={m.key} meter={m} value={meters[m.key]} delta={deltas[m.key]} />
          ))}
        </div>
      )}

      {/* ── Game content ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '24px', maxWidth: 680, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 2 }}>

        <AnimatePresence mode="wait">

          {/* CARD PHASE */}
          {phase === 'card' && card && (
            <motion.div
              key={`card-${day}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Situation card */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, padding: '24px 24px', position: 'relative', overflow: 'hidden' }}>
                <div aria-hidden style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 28, width: 50, height: 50, borderRadius: 15, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.character.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{card.character.name}</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>{card.character.role}</div>
                  </div>
                </div>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0, letterSpacing: '-0.01em' }}>
                  {card.situation}
                </p>
              </div>

              {/* Choices */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Your decision
                </div>
                {card.choices.map((c, i) => (
                  <ChoiceBtn key={i} choice={c} onPick={pick} disabled={false} />
                ))}
              </div>
            </motion.div>
          )}

          {/* OUTCOME PHASE */}
          {phase === 'outcome' && (
            <motion.div
              key="outcome"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                Consequence
              </div>
              <OutcomeCard note={outcomeNote} onNext={nextDay} isLast={day >= TOTAL_DAYS || !!deathMeter} />
            </motion.div>
          )}

          {/* DEAD PHASE */}
          {phase === 'dead' && (
            <motion.div
              key="dead"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 20, textAlign: 'center' }}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ fontSize: 64 }}
              >
                📉
              </motion.div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#EF4444', letterSpacing: '-0.03em', marginBottom: 8 }}>
                  {deadInfo.title}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 400 }}>
                  {deadInfo.sub}
                </div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 14, padding: '16px 24px', width: '100%', maxWidth: 360 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>You lasted</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444' }}>Day {day} of {TOTAL_DAYS}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setMeters({ ...STARTING_METERS }); setDay(1); setPhase('card'); setHistory([]); setDeckQueue(shuffle([...DECK])); setDeathMeter(null) }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Try again
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Exit
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* WON PHASE */}
          {phase === 'won' && (
            <motion.div
              key="won"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 20, textAlign: 'center' }}
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{ fontSize: 64 }}
              >
                🏆
              </motion.div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.03em', marginBottom: 8 }}>
                  You survived.
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 400 }}>
                  10 days. Every decision had a cost. You kept the company alive through all of them.
                </div>
              </div>

              {/* Final meters */}
              <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 16, padding: '20px 24px', width: '100%', maxWidth: 420 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Final company health</div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  {METERS.map(m => (
                    <div key={m.key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11 }}>{m.emoji}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: meters[m.key] > 50 ? '#4ADE80' : meters[m.key] > 25 ? '#F59E0B' : '#EF4444', letterSpacing: '-0.03em' }}>{Math.round(meters[m.key])}</div>
                      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 13, fontWeight: 700, color: '#4ADE80' }}>
                  Overall Score: {score}/100
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setMeters({ ...STARTING_METERS }); setDay(1); setPhase('card'); setHistory([]); setDeckQueue(shuffle([...DECK])); setDeathMeter(null) }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Play again
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
