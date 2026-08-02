import { create } from 'zustand'
import { useCoinStore } from './coinStore'

// ── Company definitions ───────────────────────────────────────────
const COMPANIES_DEF = [
  { id: 'nova-ai',     name: 'NovaAI',    ticker: 'NOVA',  sector: 'tech',        emoji: '🤖', desc: 'AI assistants for enterprise and education',         basePrice: 120, _revGrowth: 0.40, _profitMargin: 0.25,  _debtRatio: 0.10, _founderScore: 0.88, _rdSpend: 0.80 },
  { id: 'sky-ship',    name: 'SkyShip',   ticker: 'SKY',   sector: 'logistics',   emoji: '🚁', desc: 'Autonomous drone delivery network',                  basePrice: 85,  _revGrowth: 0.28, _profitMargin: 0.08,  _debtRatio: 0.45, _founderScore: 0.72, _rdSpend: 0.60 },
  { id: 'fusion-grid', name: 'FusionGrid',ticker: 'FGRD',  sector: 'energy',      emoji: '⚡', desc: 'Next-generation clean energy infrastructure',        basePrice: 95,  _revGrowth: 0.18, _profitMargin: 0.15,  _debtRatio: 0.55, _founderScore: 0.65, _rdSpend: 0.70 },
  { id: 'neuro-link',  name: 'NeuroLink', ticker: 'NLK',   sector: 'biotech',     emoji: '🧠', desc: 'Brain-computer interface technology',                basePrice: 200, _revGrowth: 0.55, _profitMargin: -0.10, _debtRatio: 0.20, _founderScore: 0.95, _rdSpend: 0.95 },
  { id: 'aqua-gen',    name: 'AquaGen',   ticker: 'AQG',   sector: 'environment', emoji: '💧', desc: 'Water purification and distribution technology',     basePrice: 75,  _revGrowth: 0.12, _profitMargin: 0.22,  _debtRatio: 0.15, _founderScore: 0.78, _rdSpend: 0.40 },
  { id: 'titan-bot',   name: 'TitanBot',  ticker: 'TITAN', sector: 'robotics',    emoji: '🦾', desc: 'Industrial automation and robotics systems',         basePrice: 110, _revGrowth: 0.22, _profitMargin: 0.18,  _debtRatio: 0.30, _founderScore: 0.70, _rdSpend: 0.55 },
  { id: 'med-vault',   name: 'MedVault',  ticker: 'MEDV',  sector: 'biotech',     emoji: '💊', desc: 'AI-driven drug discovery platform',                  basePrice: 145, _revGrowth: 0.35, _profitMargin: -0.05, _debtRatio: 0.25, _founderScore: 0.82, _rdSpend: 0.90 },
  { id: 'orbital-x',  name: 'OrbitalX',  ticker: 'ORB',   sector: 'space',       emoji: '🛸', desc: 'Low-orbit satellite internet constellation',         basePrice: 180, _revGrowth: 0.60, _profitMargin: -0.20, _debtRatio: 0.65, _founderScore: 0.90, _rdSpend: 0.85 },
  { id: 'verde-pact',  name: 'VerdePact', ticker: 'VPCT',  sector: 'environment', emoji: '🌱', desc: 'Sustainable agriculture and crop technology',        basePrice: 68,  _revGrowth: 0.15, _profitMargin: 0.12,  _debtRatio: 0.20, _founderScore: 0.75, _rdSpend: 0.45 },
]

const STARTUPS_DEF = [
  { id: 'quantum-q',  name: 'QuantumQ',  ticker: 'QQ',   sector: 'tech',      emoji: '⚛️', desc: 'Quantum computing — pre-revenue moonshot', basePrice: 20, _revGrowth: 0.0,  _profitMargin: -0.80, _debtRatio: 0.30, _founderScore: 0.92, _rdSpend: 1.0,  isStartup: true, _volatility: 0.25 },
  { id: 'nano-forge', name: 'NanoForge', ticker: 'NANO', sector: 'materials', emoji: '🔬', desc: 'Nanomaterial manufacturing — tiny but growing', basePrice: 15, _revGrowth: 0.80, _profitMargin: -0.30, _debtRatio: 0.40, _founderScore: 0.70, _rdSpend: 0.75, isStartup: true, _volatility: 0.20 },
  { id: 'psi-labs',   name: 'PsiLabs',   ticker: 'PSI',  sector: 'biotech',   emoji: '🧬', desc: 'Gene therapy pioneer — FDA trial pending',     basePrice: 25, _revGrowth: 0.0,  _profitMargin: -0.60, _debtRatio: 0.50, _founderScore: 0.85, _rdSpend: 0.95, isStartup: true, _volatility: 0.30 },
]

// ── News templates ────────────────────────────────────────────────
const NEWS_TEMPLATES = [
  { type: 'revenue',  cond: c => c._revGrowth > 0.30,      impact: [ 0.06,  0.15], positive: true,  text: n => `${n} beats revenue forecasts — growth accelerating` },
  { type: 'revenue',  cond: c => c._revGrowth < 0.10,      impact: [-0.08, -0.03], positive: false, text: n => `${n} misses revenue targets for second straight quarter` },
  { type: 'founder',  cond: c => c._founderScore > 0.85,   impact: [ 0.04,  0.10], positive: true,  text: n => `${n} CEO increases personal stake — strong confidence signal` },
  { type: 'founder',  cond: c => c._founderScore < 0.65,   impact: [-0.07, -0.03], positive: false, text: n => `${n} CFO resigns amid strategic disagreements` },
  { type: 'rd',       cond: c => c._rdSpend > 0.75,        impact: [ 0.05,  0.13], positive: true,  text: n => `${n} patents breakthrough — R&D investment paying off` },
  { type: 'profit',   cond: c => c._profitMargin > 0.20,   impact: [ 0.04,  0.09], positive: true,  text: n => `${n} reports record profit margin in quarterly results` },
  { type: 'profit',   cond: c => c._profitMargin < 0,      impact: [-0.06, -0.02], positive: false, text: n => `${n} posts wider-than-expected loss — cash burn concern` },
  { type: 'debt',     cond: c => c._debtRatio < 0.20,      impact: [ 0.02,  0.06], positive: true,  text: n => `${n} receives credit rating upgrade to AA` },
  { type: 'debt',     cond: c => c._debtRatio > 0.50,      impact: [-0.10, -0.04], positive: false, text: n => `${n} credit downgrade — high debt raises refinancing fears` },
  { type: 'growth',   cond: c => c._revGrowth > 0.45,      impact: [ 0.08,  0.18], positive: true,  text: n => `${n} signs landmark enterprise contract` },
  { type: 'founder',  cond: c => c._founderScore > 0.80,   impact: [ 0.05,  0.12], positive: true,  text: n => `${n} announces strategic expansion into new market` },
  { type: 'debt',     cond: c => c._debtRatio > 0.40,      impact: [-0.05, -0.02], positive: false, text: n => `${n} takes on additional debt — balance sheet weakens` },
  // Random wild events
  { type: 'ma',       cond: () => Math.random() < 0.12,    impact: [ 0.10,  0.22], positive: true,  text: n => `${n} rumoured acquisition target — buyout premium expected` },
  { type: 'scandal',  cond: () => Math.random() < 0.08,    impact: [-0.18, -0.09], positive: false, text: n => `${n} faces regulatory investigation — shares under pressure` },
  { type: 'buyback',  cond: () => Math.random() < 0.10,    impact: [ 0.06,  0.12], positive: true,  text: n => `${n} announces ₳500M share buyback programme` },
  { type: 'accident', cond: () => Math.random() < 0.07,    impact: [-0.15, -0.07], positive: false, text: n => `${n} factory incident disrupts operations — costs surge` },
  { type: 'contract', cond: () => Math.random() < 0.09,    impact: [ 0.09,  0.20], positive: true,  text: n => `${n} lands government contract worth ₳2.4B` },
  { type: 'crash',    cond: () => Math.random() < 0.04,    impact: [-0.22, -0.12], positive: false, text: n => `MARKET SHOCK: Macro fears hit ${n} — sector-wide sell-off` },
]

const AEVA_LESSONS = {
  revenue:  { pos: "Revenue growth shows customers love the product. The market rewards this with higher prices.",
               neg: "Revenue misses signal customers aren't buying. Growth companies live and die on this number." },
  founder:  { pos: "Founders buying their own stock is one of Buffett's favourite signals — skin in the game.",
               neg: "Leadership instability destroys value fast. The best companies have consistent, trusted leadership." },
  rd:       { pos: "R&D today becomes advantage tomorrow. Amazon had no profit for years — now it's worth trillions.",
               neg: "Under-investing in R&D is borrowing from the future. Competitors will catch up." },
  profit:   { pos: "Profit margin shows how efficiently a company converts sales into earnings. Higher = better moat.",
               neg: "Losses aren't always bad (see Tesla, Amazon) — but they need a credible path to profitability." },
  debt:     { pos: "Low debt = financial fortress. It means the company can survive a downturn without going bankrupt.",
               neg: "High debt is the #1 killer of otherwise good businesses. Warren Buffett avoids it obsessively." },
  growth:   { pos: "New contracts expand the revenue base — watch if the company can keep winning deals like this.",
               neg: null },
  ma:       { pos: "Buyout rumours push prices up. But be careful — many acquisitions fall through.",
               neg: null },
  scandal:  { pos: null, neg: "Regulatory risk is real. Even great companies can be crippled by government action." },
  buyback:  { pos: "Buybacks reduce shares outstanding, making each share worth more. Usually a bullish signal.",
               neg: null },
  accident: { pos: null, neg: "Operational failures hit earnings and reputation. Watch if management responds well." },
  contract: { pos: "Government contracts provide stable, long-term revenue — the market loves predictable cash flows.",
               neg: null },
  crash:    { pos: null, neg: "Market crashes can be buying opportunities for quality companies. Fear is often overblown." },
}

// ── Macro regimes ─────────────────────────────────────────────────
const MACRO_REGIMES = [
  { id: 'bull',            label: 'Bull Market',      emoji: '🐂',
    aevaNote: "In a bull market, optimism lifts all boats. Even average companies outperform — but quality compounds fastest. Focus on strong fundamentals so you ride the wave without overpaying." },
  { id: 'bear',            label: 'Bear Market',      emoji: '🐻',
    aevaNote: "Bear markets punish speculation and reward quality. Cash-rich, low-debt companies survive while leveraged ones suffer. Buffett loads up in downturns: 'Be greedy when others are fearful.'" },
  { id: 'rate_hike',       label: 'Rate Hike Cycle',  emoji: '📈',
    aevaNote: "Rising rates raise the cost of debt. Highly leveraged companies face squeezed interest coverage while capital-light businesses feel little impact. Rotate toward low-debt, high-margin names." },
  { id: 'innovation_boom', label: 'Innovation Boom',  emoji: '⚡',
    aevaNote: "Tech breakthroughs re-rate entire sectors. The market pays a premium for growth — even at the cost of profitability. Biotech, tech, and space attract speculative capital. Soros mode shines here." },
]

// ── Fundamental event types ────────────────────────────────────────
const FUNDAMENTAL_EVENTS = [
  { id: 'margin_compression', label: 'Margin Compression',   positive: false,
    apply: c => ({ _profitMargin: Math.max(-0.45, c._profitMargin - 0.12) }),
    text:  n => `${n}: Margin compression — rising input costs squeeze earnings`,
    aevaNote: "Margin compression creeps in before headlines catch it. When costs rise faster than revenue, profitability erodes. Watch gross margins as an early warning." },
  { id: 'rev_acceleration',   label: 'Revenue Acceleration', positive: true,
    apply: c => ({ _revGrowth: Math.min(0.90, c._revGrowth + 0.15) }),
    text:  n => `${n}: Revenue acceleration — new market expansion breaks out`,
    aevaNote: "A step-change in revenue growth is one of the most powerful signals. When a company cracks a new market the re-rating can be dramatic. Lynch called these 'fast growers.'" },
  { id: 'debt_spiral',        label: 'Debt Spiral',          positive: false,
    apply: c => ({ _debtRatio: Math.min(0.85, c._debtRatio + 0.22) }),
    text:  n => `${n}: Debt spiral — emergency refinancing sharply raises leverage`,
    aevaNote: "Debt spirals compound quickly. More debt means more interest, which means less cash for growth, which means more borrowing. Buffett avoids heavily indebted companies for exactly this reason." },
  { id: 'founder_exit',       label: 'Founder Exit',         positive: false,
    apply: c => ({ _founderScore: Math.max(0.35, c._founderScore - 0.28) }),
    text:  n => `${n}: Founder steps down — leadership transition creates uncertainty`,
    aevaNote: "Founders carry vision that hired managers rarely replicate. Their exit is a yellow flag. Study who replaces them and what changes in strategy before deciding to hold." },
  { id: 'profit_recovery',    label: 'Path to Profitability',positive: true,
    apply: c => ({ _profitMargin: Math.min(0.40, c._profitMargin + 0.12) }),
    text:  n => `${n}: Turns profitable — disciplined cost cuts deliver margin inflection`,
    aevaNote: "Crossing into profitability is when valuation re-ratings begin. Amazon was loss-making for years before becoming one of the most valuable companies on Earth." },
  { id: 'rev_slowdown',       label: 'Revenue Slowdown',     positive: false,
    apply: c => ({ _revGrowth: Math.max(0.02, c._revGrowth - 0.14) }),
    text:  n => `${n}: Growth decelerates — market saturation limits expansion`,
    aevaNote: "Deceleration is often more damaging than an absolute miss. Markets price expectations — a company priced for 50% growth delivering 25% gets punished even if the absolute number looks fine." },
]

// ── Narrative arcs — 3-act company storylines ─────────────────────
const NARRATIVE_ARCS = {
  'neuro-link': {
    name: 'FDA Odyssey',
    acts: [
      { text: n => `🧪 ${n}: FDA breakthrough designation granted — Phase 2 trial shows 94% efficacy`,
        positive: true, apply: c => ({ _founderScore: Math.min(1.0, c._founderScore + 0.06) }),
        aevaNote: 'FDA breakthrough status fast-tracks the approval timeline. The market loves binary catalyst events like this — all eyes are now on the trial outcome.' },
      { text: n => `⚠️ ${n}: Trial paused — unexpected adverse events trigger protocol amendment and 18-month delay`,
        positive: false, apply: c => ({ _founderScore: Math.max(0.3, c._founderScore - 0.20), _debtRatio: Math.min(0.8, c._debtRatio + 0.18) }),
        aevaNote: 'Clinical setbacks are normal in biotech. The key question: is this a fatal flaw or just a delay? Management credibility during crises determines whether investors stay or flee.' },
      { random: true, threshold: 0.4,
        beat: { text: n => `🎉 ${n}: FDA APPROVED — first commercial BCI device cleared for sale`,
          positive: true, apply: c => ({ _revGrowth: Math.min(0.9, c._revGrowth + 0.40), _profitMargin: Math.min(0.5, c._profitMargin + 0.22) }),
          aevaNote: 'FDA approval converts years of speculation into real revenue. This binary event is why biotech investors accept massive volatility — the upside can be transformational.' },
        miss: { text: n => `💔 ${n}: FDA rejection — Complete Response Letter demands 2 more years of safety data`,
          positive: false, apply: c => ({ _profitMargin: Math.max(-0.8, c._profitMargin - 0.28), _founderScore: Math.max(0.2, c._founderScore - 0.22) }),
          aevaNote: 'A CRL means years more of burn with no revenue path. This is precisely why position sizing in high-risk biotech is critical — uncapped downside is real.' },
      },
    ],
  },
  'fusion-grid': {
    name: 'The Government Gamble',
    acts: [
      { text: n => `🏛️ ${n}: Wins ₳8B national grid modernisation contract — decade of predictable revenue secured`,
        positive: true, apply: c => ({ _revGrowth: Math.min(0.9, c._revGrowth + 0.26) }),
        aevaNote: 'Government contracts provide stable, long-term revenue. The market pays a premium for cash-flow predictability — but execution risk is always hiding in the fine print.' },
      { text: n => `📋 ${n}: Cost overruns hit grid project — contractor disputes delay delivery by 18 months`,
        positive: false, apply: c => ({ _debtRatio: Math.min(0.85, c._debtRatio + 0.22), _profitMargin: Math.max(-0.5, c._profitMargin - 0.15) }),
        aevaNote: 'Infrastructure projects routinely overrun. Debt funding those overruns compounds the risk — more debt means less cash for growth, which often means even more debt.' },
      { text: n => `🤝 ${n}: Contract renegotiated — reduced scope but higher margins and penalty-free completion`,
        positive: true, apply: c => ({ _revGrowth: Math.max(0.02, c._revGrowth - 0.10), _profitMargin: Math.min(0.45, c._profitMargin + 0.20) }),
        aevaNote: 'Lower revenue but better margins is often a quality upgrade. Buffett prefers companies that earn 20 cents on the dollar over those that earn 2 cents on ten times the volume.' },
    ],
  },
  'nova-ai': {
    name: 'The AI Gold Rush',
    acts: [
      { text: n => `🏛️ ${n}: Exclusive government AI contract — ₳4.2B data licensing deal signed across 12 agencies`,
        positive: true, apply: c => ({ _revGrowth: Math.min(0.9, c._revGrowth + 0.18), _profitMargin: Math.min(0.5, c._profitMargin + 0.08) }),
        aevaNote: 'Enterprise AI contracts lock in revenue for years and validate the product. First-mover advantage in government AI is a durable moat — switching costs are enormous.' },
      { text: n => `📉 ${n}: Open-source rivals undercut pricing — three major enterprise clients churn in one quarter`,
        positive: false, apply: c => ({ _profitMargin: Math.max(-0.4, c._profitMargin - 0.19) }),
        aevaNote: 'Commoditisation risk is the existential threat to AI software. When open-source catches up, pricing power evaporates overnight. Moats built on data — not algorithms — are more durable.' },
      { text: n => `⚡ ${n}: Launches proprietary AI chip division — hardware integration re-rates the entire valuation`,
        positive: true, apply: c => ({ _revGrowth: Math.min(0.9, c._revGrowth + 0.16), _profitMargin: Math.min(0.5, c._profitMargin + 0.16), _rdSpend: Math.min(1.0, c._rdSpend + 0.08) }),
        aevaNote: "Vertical integration — owning chip AND software — is Nvidia's playbook. When you own the full stack, margins expand dramatically. This is how software companies become trillion-dollar hardware companies." },
    ],
  },
  'orbital-x': {
    name: 'Race to Orbit',
    acts: [
      { text: n => `🛸 ${n}: 400-satellite constellation fully deployed — global broadband coverage goes live`,
        positive: true, apply: c => ({ _founderScore: Math.min(1.0, c._founderScore + 0.05), _revGrowth: Math.min(0.9, c._revGrowth + 0.16) }),
        aevaNote: 'Network effects compound in satellite internet — every new subscriber adds marginal revenue at near-zero marginal cost. Scale is the entire game here.' },
      { text: n => `⚔️ ${n}: Rival constellation launches at 60% lower price — subscriber growth collapses`,
        positive: false, apply: c => ({ _profitMargin: Math.max(-0.5, c._profitMargin - 0.18), _revGrowth: Math.max(0.0, c._revGrowth - 0.16) }),
        aevaNote: 'Pricing wars in low-orbit internet mirror early airlines — margin destruction before consolidation. The survivor wins big; the losers are liquidated. Timing matters enormously.' },
      { text: n => `🎯 ${n}: Classified military satellite contract awarded — ₳12B over 10 years, immune to commercial competition`,
        positive: true, apply: c => ({ _revGrowth: Math.min(0.9, c._revGrowth + 0.26), _profitMargin: Math.min(0.5, c._profitMargin + 0.22) }),
        aevaNote: 'Defence contracts provide non-cyclical, high-margin revenue that commercial rivals cannot touch. A single contract like this can transform a losing business into a profitable one.' },
    ],
  },
}

function calcFairValue(def) {
  const growthMult  = 1 + Math.max(0, def._revGrowth) * 2.0
  const profitMult  = 1 + def._profitMargin * 2.0
  const qualityMult = 0.7 + def._founderScore * 0.6
  const debtDisc    = 1 - Math.max(0, def._debtRatio - 0.2) * 0.3
  return Math.max(10, Math.round(def.basePrice * growthMult * Math.max(0.4, profitMult) * qualityMult * debtDisc))
}

function pickImpact([min, max]) {
  return min + Math.random() * (max - min)
}

function generateEventsForCompany(company) {
  const eligible = NEWS_TEMPLATES.filter(t => t.cond(company))
  if (!eligible.length) return []
  const shuffled = [...eligible].sort(() => Math.random() - 0.5)
  const count = Math.random() < 0.35 ? 2 : 1
  return shuffled.slice(0, count).map(t => {
    const impact = Math.round(pickImpact(t.impact) * 1000) / 1000
    const absImpact = Math.abs(impact)
    const severity = absImpact >= 0.12 ? 'CRITICAL' : absImpact >= 0.06 ? 'MAJOR' : 'MINOR'
    return { type: t.type, text: t.text(company.name), impact, positive: t.positive, severity }
  })
}

function initCompany(def) {
  const variation = 1 + (Math.random() - 0.5) * 0.08
  const price = Math.round(def.basePrice * variation)
  const fairValue = calcFairValue(def)
  return { ...def, price, priceHistory: [price], daysHeldByMe: 0, reportUnlocked: false, fairValue, _arcAct: 0 }
}

// ── Sector PE benchmarks (for Buffett mode) ───────────────────────
const SECTOR_PE = { tech: 28, logistics: 18, energy: 14, biotech: 35, environment: 20, robotics: 22, space: 45, materials: 16 }

export function calcPE(company) {
  if (company._profitMargin <= 0) return null
  const eps = company._profitMargin * 0.8
  return Math.round(company.price / (eps * 10))
}

export function calcModeOverlay(company, mode, macroRegime) {
  if (mode === 'buffett') {
    const pe = calcPE(company)
    const benchmark = SECTOR_PE[company.sector] || 20
    return {
      label: 'P/E',
      value: pe ? `${pe}x` : 'N/A',
      note: pe ? (pe < benchmark ? '✓ Undervalued' : pe > benchmark * 1.5 ? '⚠ Pricey' : 'Fair') : 'Unprofitable',
      highlight: pe && pe < benchmark,
    }
  }
  if (mode === 'lynch') {
    const growth = Math.round(company._revGrowth * 100)
    return {
      label: 'Rev Growth',
      value: `${growth}%`,
      note: growth > 30 ? '🚀 High growth' : growth > 15 ? 'Steady' : '⚠ Slow',
      highlight: growth > 30,
    }
  }
  if (mode === 'soros') {
    const BASE = { tech: 60, logistics: 44, energy: 38, biotech: 56, environment: 48, robotics: 50, space: 68, materials: 32 }
    const ADJ  = {
      bull:            { tech:+10, logistics:+5,  energy:+5,  biotech:+8,  environment:+4, robotics:+8,  space:+10, materials:+5  },
      bear:            { tech:-15, logistics:-4,  energy:-5,  biotech:-10, environment:-2, robotics:-8,  space:-15, materials:-4  },
      rate_hike:       { tech:-12, logistics:-5,  energy:+8,  biotech:-8,  environment:+4, robotics:-6,  space:-15, materials:+8  },
      innovation_boom: { tech:+22, logistics:-5,  energy:-8,  biotech:+20, environment:+3, robotics:+14, space:+22, materials:-5  },
    }
    const adj  = macroRegime ? (ADJ[macroRegime]?.[company.sector] || 0) : 0
    const heat = Math.min(99, Math.max(8, (BASE[company.sector] || 50) + adj))
    const regLabel = macroRegime
      ? { bull: 'Bull', bear: 'Bear', rate_hike: 'Rates', innovation_boom: 'Boom' }[macroRegime]
      : null
    return {
      label: regLabel ? `${regLabel} Heat` : 'Sector Heat',
      value: `${heat}%`,
      note: heat > 70 ? '🔥 Hot' : heat > 50 ? 'Warm' : '❄ Cold',
      highlight: heat > 65,
    }
  }
  return null
}

// ── Persistence ───────────────────────────────────────────────────
const KEY = 'aeva_callstreet_v2'
function persist(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }
function loadSaved() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }

const allDefs = [...COMPANIES_DEF, ...STARTUPS_DEF]

// ── Daily challenge definitions ────────────────────────────────────
export const DAILY_CHALLENGES = [
  { id: 'hold_low_debt',  reward: 25, regime: null,
    text: 'Ring the bell holding at least one Low-debt stock',
    check: (portfolio, companies) => portfolio.some(h => { const co = companies.find(c => c.id === h.companyId); return co && co._debtRatio < 0.2 }) },
  { id: 'diversify',      reward: 30, regime: null,
    text: 'Ring the bell holding 3 or more different stocks',
    check: (portfolio) => portfolio.length >= 3 },
  { id: 'avoid_high_debt', reward: 30, regime: 'rate_hike',
    text: 'Ring the bell with no high-debt stocks in your portfolio',
    check: (portfolio, companies) => portfolio.length > 0 && !portfolio.some(h => { const co = companies.find(c => c.id === h.companyId); return co && co._debtRatio > 0.4 }) },
  { id: 'hold_growth',    reward: 25, regime: 'innovation_boom',
    text: 'Hold a tech, biotech, or space stock when you ring the bell',
    check: (portfolio, companies) => portfolio.some(h => { const co = companies.find(c => c.id === h.companyId); return co && ['tech','biotech','space','robotics'].includes(co.sector) }) },
  { id: 'stay_defensive', reward: 25, regime: 'bear',
    text: 'Ring the bell with 2 or fewer positions (stay defensive)',
    check: (portfolio) => portfolio.length >= 1 && portfolio.length <= 2 },
  { id: 'first_buy',      reward: 20, regime: null,
    text: 'Buy your first stock and ring the bell',
    check: (portfolio) => portfolio.length >= 1 },
  { id: 'hold_profit',    reward: 25, regime: null,
    text: 'Ring the bell with at least one position in profit',
    check: (portfolio, companies) => portfolio.some(h => { const co = companies.find(c => c.id === h.companyId); return co && co.price > h.avgCost }) },
]

function freshState() {
  return {
    companies: allDefs.map(initCompany),
    portfolio: [],
    news: [],
    mode: 'buffett',
    seasonDay: 0,
    season: 1,
    indexHistory: [100],
    pendingGrade: null,
    seasonStartValue: 0,
    researchBought: [],  // [companyId] — expires next ring
    ipoActive: null,
    totalBells: 0,
    lastBellChanges: [],
    streak: 0,
    watchlist: [],
    hotSector: null,
    hotSectorBellCount: 0,
    insiderTip: null,
    crashEvent: null,
    macroRegime: null,
    macroAnnouncement: null,
    prediction: null,
    predictionResult: null,
    shorts: [],
    marketBeats: 0,
    belowFiveCount: {},
    haltBanner: null,
    lastDelistingSeason: -99,
    earningsWindow: false,
    earningsPredictions: {},
    earningsReveal: null,
    seasonsPlayed: 0,
    beatMarketStreak: 0,
    knowledgeViewed: {},
    stopLosses: {},
    priceTargets: {},
    dailyChallenge: null,
    challengeStreak: 0,
    lastChallengeResult: null,
    tradeHistory: [],
    playerXP: 0,
  }
}

export const useCallStreetStore = create((set, get) => {
  const saved = loadSaved()
  const initial = saved ? { ...freshState(), ...saved } : freshState()

  return {
    ...initial,

    ringTheBell: () => {
      const state = get()
      const allNews = []
      const prevPrices = {}
      state.companies.forEach(c => { prevPrices[c.id] = c.price })
      const ringId = (state.totalBells || 0) + 1
      const newDay = state.seasonDay + 1
      const seasonEnds = newDay >= 10

      // 3–5 companies get news events; rest get mild drift
      const numWithNews = 3 + Math.floor(Math.random() * 3)
      const withNews = new Set(
        [...state.companies].sort(() => Math.random() - 0.5).slice(0, numWithNews).map(c => c.id)
      )

      const updatedCompanies = state.companies.map(company => {
        const held = state.portfolio.find(p => p.companyId === company.id)
        const newDaysHeld = held ? (company.daysHeldByMe || 0) + 1 : 0
        const reportUnlocked = newDaysHeld >= 5

        if (withNews.has(company.id)) {
          const events = generateEventsForCompany(company)

          // Fundamental drift — news events permanently nudge company stats
          const fundDrift = {}
          events.forEach(e => {
            if (e.type === 'debt'    && !e.positive) fundDrift._debtRatio    = Math.min(0.85, (fundDrift._debtRatio    ?? company._debtRatio)    + 0.04)
            if (e.type === 'revenue' && e.positive)  fundDrift._revGrowth    = Math.min(0.90, (fundDrift._revGrowth    ?? company._revGrowth)    + 0.025)
            if (e.type === 'profit'  && !e.positive) fundDrift._profitMargin = Math.max(-0.45,(fundDrift._profitMargin ?? company._profitMargin) - 0.025)
            if (e.type === 'rd'      && e.positive)  fundDrift._rdSpend      = Math.min(1.00, (fundDrift._rdSpend      ?? company._rdSpend)      + 0.020)
            if (e.type === 'founder' && !e.positive) fundDrift._founderScore = Math.max(0.35, (fundDrift._founderScore ?? company._founderScore)  - 0.04)
          })
          const drifted = Object.keys(fundDrift).length
            ? { ...company, ...fundDrift, fairValue: calcFairValue({ ...company, ...fundDrift }) }
            : company

          let totalImpact = events.reduce((s, e) => s + e.impact, 0)
          // Innovation Boom: amplify positive news for tech/biotech/space
          if (state.macroRegime === 'innovation_boom' && ['tech','biotech','space'].includes(drifted.sector) && totalImpact > 0)
            totalImpact *= 1.5
          // Rate Hike: dampen positive news for high-debt stocks
          if (state.macroRegime === 'rate_hike' && drifted._debtRatio > 0.40 && totalImpact > 0)
            totalImpact *= 0.4
          const startupNoise = drifted.isStartup ? (Math.random() - 0.45) * (drifted._volatility || 0.1) : 0
          const fv = drifted.fairValue || calcFairValue(drifted)
          // Dampen news impact when overvalued; amplify when undervalued
          const overRatio = drifted.price / fv
          const dampen = Math.max(0.15, Math.min(1.5, 1 / Math.pow(overRatio, 1.2)))
          const meanRev = (fv - drifted.price) / drifted.price * 0.08
          const newPrice = Math.max(1, Math.round(drifted.price * (1 + (totalImpact + startupNoise) * dampen + meanRev)))

          events.forEach(e => {
            const lesson = AEVA_LESSONS[e.type]
            const aevaNote = lesson ? (e.positive ? lesson.pos : lesson.neg) : null
            const absImpact = Math.abs(e.impact)
            const severity = e.severity || (absImpact >= 0.12 ? 'CRITICAL' : absImpact >= 0.06 ? 'MAJOR' : 'MINOR')
            allNews.push({
              id: `${Date.now()}-${drifted.id}-${Math.random()}`,
              companyId: drifted.id,
              ticker: drifted.ticker,
              emoji: drifted.emoji,
              text: e.text,
              impact: e.impact,
              positive: e.positive,
              type: e.type,
              aevaNote,
              severity,
              day: state.seasonDay + 1,
              ringId,
            })
          })

          return { ...drifted, price: newPrice, priceHistory: [...drifted.priceHistory.slice(-9), newPrice], daysHeldByMe: newDaysHeld, reportUnlocked }
        } else {
          // Mean reversion toward fair value + small noise; no persistent upward drift
          const fv = company.fairValue || calcFairValue(company)
          const meanRev = (fv - company.price) / company.price * 0.10
          const noise = (Math.random() - 0.5) * 0.025
          const newPrice = Math.max(1, Math.round(company.price * (1 + meanRev + noise)))
          return { ...company, price: newPrice, priceHistory: [...company.priceHistory.slice(-9), newPrice], daysHeldByMe: newDaysHeld, reportUnlocked }
        }
      })

      // Market crash — 4% chance, wipes 15–30% off all prices
      const crashPct = Math.random() < 0.04 ? 0.15 + Math.random() * 0.15 : 0
      const crashEvent = crashPct > 0 ? { pct: Math.round(crashPct * 100) } : null
      let finalCompanies = crashPct > 0
        ? updatedCompanies.map(c => {
            const cp = Math.max(1, Math.round(c.price * (1 - crashPct)))
            return { ...c, price: cp, priceHistory: [...c.priceHistory.slice(-9), cp] }
          })
        : updatedCompanies

      // Macro regime drift (Bull +2%, Bear −2%, Rate Hike penalises high-debt)
      if (state.macroRegime === 'bull' || state.macroRegime === 'bear' || state.macroRegime === 'rate_hike') {
        finalCompanies = finalCompanies.map(c => {
          let adj = 0
          if (state.macroRegime === 'bull')  adj = +0.02
          if (state.macroRegime === 'bear')  adj = -0.02
          if (state.macroRegime === 'rate_hike' && c._debtRatio > 0.40) adj = -0.04
          if (adj === 0) return c
          const np = Math.max(1, Math.round(c.price * (1 + adj)))
          return { ...c, price: np, priceHistory: [...c.priceHistory.slice(-9), np] }
        })
      }

      // Prediction result
      let predictionResult = null
      if (state.prediction) {
        const { companyId, direction } = state.prediction
        const prevP = prevPrices[companyId]
        const co = finalCompanies.find(c => c.id === companyId)
        if (prevP && co) {
          const correct = direction === 'up' ? co.price > prevP : co.price < prevP
          if (correct) useCoinStore.getState().earnCoins(100, `Prediction correct: ${co.ticker} ${direction}`)
          predictionResult = { correct, bonus: correct ? 100 : 0, ticker: co.ticker, emoji: co.emoji, direction }
        }
      }

      // ── Bankruptcy detection (≥3 bells below ₳5, max 1 per 3 seasons) ──
      const newBelowFiveCount = { ...(state.belowFiveCount || {}) }
      finalCompanies.forEach(c => {
        if (!c.delisted) newBelowFiveCount[c.id] = c.price < 5 ? (newBelowFiveCount[c.id] || 0) + 1 : 0
      })

      let haltBanner = state.haltBanner
      let lastDelistingSeason = state.lastDelistingSeason ?? -99
      let updatedShorts = [...(state.shorts || [])]
      let bankruptId = null

      const seasonsSinceDelist = (state.season || 1) - lastDelistingSeason
      if (seasonsSinceDelist >= 3) {
        const entry = Object.entries(newBelowFiveCount).find(([id, count]) => {
          const co = finalCompanies.find(c => c.id === id)
          return count >= 3 && co && !co.delisted
        })
        if (entry) {
          bankruptId = entry[0]
          const bankCo = finalCompanies.find(c => c.id === bankruptId)
          haltBanner = { companyId: bankruptId, name: bankCo.name, ticker: bankCo.ticker, emoji: bankCo.emoji }
          lastDelistingSeason = state.season
          newBelowFiveCount[bankruptId] = 0
          finalCompanies = finalCompanies.map(c =>
            c.id === bankruptId ? { ...c, delisted: true, price: 0, priceHistory: [...c.priceHistory.slice(-9), 0] } : c
          )
          // Shorts on bankrupt company auto-close profitably (buy at ₳0)
          updatedShorts = updatedShorts.filter(s => s.companyId !== bankruptId)
          allNews.unshift({
            id: `bankrupt-${bankruptId}-${Date.now()}`,
            companyId: bankruptId, ticker: bankCo.ticker, emoji: bankCo.emoji,
            text: `🚨 HALT — ${bankCo.name} files for bankruptcy. All shares suspended.`,
            impact: -1, positive: false, type: 'bankruptcy',
            aevaNote: "When a company's price collapses for 3 bells, creditors seize assets and shareholders receive nothing. This is why debt and cash burn matter — leverage kills in a downturn.",
            day: state.seasonDay + 1, ringId,
          })
        }
      }

      // ── Earnings Season (Day 5 simultaneous reveal for ALL stocks) ──
      let earningsReveal = null
      if (state.earningsWindow && newDay === 5) {
        const heldIds = new Set(state.portfolio.map(h => h.companyId))
        const allEarningsResults = []
        finalCompanies.filter(co => !co.delisted).forEach(co => {
          const beatScore = co._revGrowth * 0.40 + co._profitMargin * 0.30 + co._founderScore * 0.30
          const beatProb = Math.min(0.80, Math.max(0.20, 0.50 + beatScore * 1.5))
          const beat = Math.random() < beatProb
          const rawPct = beat ? 0.08 + Math.random() * 0.15 : -(0.08 + Math.random() * 0.15)
          const pct = Math.round(rawPct * 100)
          const outcome = Math.abs(pct) <= 4 ? 'inline' : (beat ? 'beat' : 'miss')
          const isHeld = heldIds.has(co.id)
          let bonus = 0, prediction = null, correct = null
          if (isHeld) {
            prediction = (state.earningsPredictions || {})[co.id] || null
            correct = prediction ? prediction === (beat ? 'beat' : 'miss') : null
            bonus = correct === true ? 20 : correct === false ? -10 : 0
            if (bonus > 0) useCoinStore.getState().earnCoins(bonus, `Earnings correct: ${co.ticker}`)
            if (bonus < 0) useCoinStore.getState().spendCoins(Math.abs(bonus), `Earnings wrong: ${co.ticker}`)
          }
          allEarningsResults.push({ companyId: co.id, ticker: co.ticker, emoji: co.emoji, name: co.name, beat, outcome, pct, isHeld, prediction: isHeld ? prediction : null, correct: isHeld ? correct : null, bonus })
          if (isHeld) {
            allNews.unshift({
              id: `earnings-${co.id}-${Date.now()}-${Math.random()}`,
              companyId: co.id, ticker: co.ticker, emoji: co.emoji,
              text: beat ? `📈 ${co.name} BEATS earnings — revenue and margins exceed expectations` : `📉 ${co.name} MISSES earnings — guidance cut sends shares lower`,
              impact: pct / 100, positive: beat, type: 'earnings',
              aevaNote: beat
                ? "Earnings beats drive short-term price jumps. Ask: is this a one-off or a sign of durable improvement? Consistent beats over multiple quarters are what build lasting wealth."
                : "Earnings misses hurt — but ask whether the business model is broken or facing temporary headwinds. Great companies miss sometimes; how management responds tells you more than the miss itself.",
              day: newDay, ringId, isEarnings: true,
            })
          }
        })
        // Apply price impact from earnings to ALL stocks
        finalCompanies = finalCompanies.map(co => {
          const r = allEarningsResults.find(r => r.companyId === co.id)
          if (!r || co.delisted) return co
          const np = Math.max(1, Math.round(co.price * (1 + r.pct / 100)))
          return { ...co, price: np, priceHistory: [...co.priceHistory.slice(-9), np] }
        })
        const heldResults = allEarningsResults.filter(r => r.isHeld)
        earningsReveal = { results: heldResults, allResults: allEarningsResults, totalBonus: heldResults.reduce((s, r) => s + (r.bonus || 0), 0) }
      }

      // Sector rotation — hot sector changes every 3 bells
      const hotSectorBellCount = ((state.hotSectorBellCount || 0) + 1) % 3
      const hotSector = hotSectorBellCount === 0
        ? ['tech','biotech','energy','logistics','robotics','environment','space','materials'][Math.floor(Math.random() * 8)]
        : (state.hotSector || null)

      const lastBellChanges = finalCompanies
        .filter(c => !c.isStartup)
        .map(c => ({
          id: c.id, ticker: c.ticker, name: c.name, emoji: c.emoji,
          pctChange: prevPrices[c.id]
            ? Math.round(((c.price - prevPrices[c.id]) / prevPrices[c.id]) * 100)
            : 0,
        }))
        .sort((a, b) => b.pctChange - a.pctChange)

      // Update index (non-startups only)
      const mainCos = finalCompanies.filter(c => !c.isStartup)
      const avgPriceNow = mainCos.reduce((s, c) => s + c.price, 0) / mainCos.length
      const avgPriceBase = mainCos.reduce((s, c) => s + (c.priceHistory[0] || c.price), 0) / mainCos.length
      const indexNow = Math.round((avgPriceNow / avgPriceBase) * 100 * 10) / 10
      const newIndexHistory = [...state.indexHistory, indexNow].slice(-20)

      // Expire research reports + reset daily knowledge tracking
      const researchBought = []
      const knowledgeViewed = {}

      let pendingGrade = state.pendingGrade
      let season = state.season
      let seasonDay = newDay
      let seasonStartValue = state.seasonStartValue
      let macroRegime = state.macroRegime
      let macroAnnouncement = state.macroAnnouncement

      if (seasonEnds) {
        pendingGrade = calcGrade(state.portfolio, finalCompanies, state.seasonStartValue, newIndexHistory, (state.streak || 0) + 1, state.macroRegime)
        season = state.season + 1
        seasonDay = 0
        seasonStartValue = state.portfolio.reduce((s, h) => {
          const co = finalCompanies.find(c => c.id === h.companyId)
          return s + (co ? co.price * h.shares : 0)
        }, 0)

        // Dynamic fundamentals — 2–3 companies evolve permanently
        const numShifts = Math.random() < 0.4 ? 3 : 2
        const toShift = [...finalCompanies].sort(() => Math.random() - 0.5).slice(0, numShifts)
        toShift.forEach(co => {
          const evt = FUNDAMENTAL_EVENTS[Math.floor(Math.random() * FUNDAMENTAL_EVENTS.length)]
          const changes = evt.apply(co)
          finalCompanies = finalCompanies.map(c => {
            if (c.id !== co.id) return c
            const nu = { ...c, ...changes, _lastFundamentalEvent: { label: evt.label, positive: evt.positive, season: state.season + 1 } }
            return { ...nu, fairValue: calcFairValue(nu) }
          })
          allNews.unshift({
            id: `fund-${co.id}-${Date.now()}-${Math.random()}`,
            companyId: co.id, ticker: co.ticker, emoji: co.emoji,
            text: evt.text(co.name),
            impact: 0, positive: evt.positive, type: 'fundamental',
            aevaNote: evt.aevaNote,
            severity: 'MAJOR',
            day: newDay, ringId,
            isFundamental: true, eventLabel: evt.label,
          })
        })

        // Narrative arc advancement — each arc company plays its next act
        const arcCompanies = [...finalCompanies]
        Object.entries(NARRATIVE_ARCS).forEach(([coId, arc]) => {
          const idx = arcCompanies.findIndex(c => c.id === coId)
          if (idx === -1) return
          const co = arcCompanies[idx]
          const actIdx = co._arcAct || 0
          if (actIdx >= arc.acts.length) return
          const act = arc.acts[actIdx]
          let changes, text, positive, aevaNote
          if (act.random) {
            const win = Math.random() > act.threshold
            const v = win ? act.beat : act.miss
            changes = v.apply(co); text = v.text(co.name); positive = v.positive; aevaNote = v.aevaNote
          } else {
            changes = act.apply(co); text = act.text(co.name); positive = act.positive; aevaNote = act.aevaNote
          }
          const nu = { ...co, ...changes, _arcAct: actIdx + 1 }
          arcCompanies[idx] = { ...nu, fairValue: calcFairValue(nu) }
          allNews.unshift({
            id: `arc-${coId}-s${state.season}-${Date.now()}-${Math.random()}`,
            companyId: coId, ticker: co.ticker, emoji: co.emoji,
            text, impact: 0, positive, type: 'arc',
            aevaNote, day: newDay, ringId,
            severity: 'CRITICAL',
            isNarrative: true, arcName: arc.name,
          })
        })
        finalCompanies = arcCompanies

        // New macro regime for next season
        const nextRegimeDef = MACRO_REGIMES[Math.floor(Math.random() * MACRO_REGIMES.length)]
        macroRegime = nextRegimeDef.id
        macroAnnouncement = { id: nextRegimeDef.id, label: nextRegimeDef.label, emoji: nextRegimeDef.emoji, aevaNote: nextRegimeDef.aevaNote }

        // Auto-close all open short positions at season end
        updatedShorts.forEach(s => {
          const co = finalCompanies.find(c => c.id === s.companyId)
          if (!co || co.delisted) return
          const cost = s.shares * co.price
          if (cost > 0) useCoinStore.getState().spendCoins(cost, `Season end: close short ${s.ticker}`)
        })
        updatedShorts = []
      }

      // IPO trigger: 30% chance on day 3 of a new season
      let ipoActive = state.ipoActive
      if (seasonDay === 3 && !ipoActive && Math.random() < 0.3) {
        const ipoCompany = finalCompanies[Math.floor(Math.random() * finalCompanies.length)]
        ipoActive = { companyId: ipoCompany.id, offerPrice: Math.round(ipoCompany.price * 0.85), expiresDay: 5 }
      }
      if (ipoActive && seasonDay > (ipoActive.expiresDay || 5)) ipoActive = null

      // Daily challenge evaluation + generation
      let challengeStreak = state.challengeStreak || 0
      let lastChallengeResult = null
      const prevChallenge = state.dailyChallenge
      if (prevChallenge && !prevChallenge.collected) {
        const def = DAILY_CHALLENGES.find(c => c.id === prevChallenge.id)
        const satisfied = def ? def.check(state.portfolio, state.companies) : false
        if (satisfied) {
          challengeStreak = Math.min(challengeStreak + 1, 99)
          const mult = challengeStreak >= 3 ? 2 : 1
          const reward = Math.round(prevChallenge.reward * mult)
          useCoinStore.getState().earnCoins(reward, `Daily challenge: ${prevChallenge.id}`)
          lastChallengeResult = { completed: true, reward, streakBonus: mult > 1, streak: challengeStreak, text: prevChallenge.text }
        } else {
          challengeStreak = 0
          lastChallengeResult = { completed: false, text: prevChallenge.text }
        }
      }
      const availChallenges = DAILY_CHALLENGES.filter(c => !c.regime || c.regime === macroRegime)
      const nextChallengeType = availChallenges[newDay % availChallenges.length]
      const nextChallenge = nextChallengeType ? { id: nextChallengeType.id, text: nextChallengeType.text, reward: nextChallengeType.reward, day: newDay, collected: false } : null

      // Stop-loss auto-sells
      const stopLosses = state.stopLosses || {}
      let finalPortfolio = bankruptId
        ? state.portfolio.filter(p => p.companyId !== bankruptId)
        : [...state.portfolio]
      const newTradeEntries = []
      finalPortfolio = finalPortfolio.filter(h => {
        const co = finalCompanies.find(c => c.id === h.companyId)
        const sl = stopLosses[h.companyId]
        if (!co || !sl) return true
        const dropPct = ((co.price - h.avgCost) / h.avgCost) * 100
        if (dropPct <= -sl) {
          const proceeds = h.shares * co.price
          const realized = Math.round((co.price - h.avgCost) * h.shares)
          useCoinStore.getState().earnCoins(proceeds, `Stop-loss: ${co.ticker} auto-sold`)
          allNews.unshift({
            id: `sl-${h.companyId}-${Date.now()}`,
            companyId: co.id, ticker: co.ticker, emoji: co.emoji,
            text: `🛑 Stop-loss triggered: ${co.name} auto-sold at ₳${Math.round(co.price).toLocaleString()} (−${Math.abs(Math.round(dropPct))}% from avg)`,
            impact: 0, positive: false, type: 'system',
            severity: 'MAJOR', day: newDay, ringId,
          })
          newTradeEntries.push({ id: `sl-${h.companyId}-${Date.now()}`, type: 'stop_loss', companyId: co.id, ticker: co.ticker, emoji: co.emoji, name: co.name, shares: h.shares, price: co.price, avgCost: h.avgCost, realized, gainPct: Math.round(dropPct), day: newDay, season: state.season })
          return false
        }
        return true
      })

      const updated = {
        ...state,
        companies: finalCompanies,
        news: [...allNews, ...state.news].slice(0, 60),
        seasonDay,
        season,
        indexHistory: newIndexHistory,
        pendingGrade,
        researchBought,
        ipoActive,
        seasonStartValue,
        totalBells: (state.totalBells || 0) + 1,
        lastBellChanges,
        streak: (state.streak || 0) + 1,
        crashEvent,
        hotSector,
        hotSectorBellCount,
        insiderTip: null,
        macroRegime,
        macroAnnouncement,
        prediction: null,
        predictionResult,
        shorts: updatedShorts,
        marketBeats: seasonEnds && pendingGrade?.beatMarket
          ? (state.marketBeats || 0) + 1
          : (state.marketBeats || 0),
        belowFiveCount: newBelowFiveCount,
        haltBanner,
        lastDelistingSeason,
        portfolio: finalPortfolio,
        stopLosses: state.stopLosses || {},
        priceTargets: state.priceTargets || {},
        dailyChallenge: nextChallenge,
        challengeStreak,
        lastChallengeResult,
        earningsWindow: seasonEnds ? false : (newDay === 4 ? true : newDay === 5 ? false : (state.earningsWindow || false)),
        earningsPredictions: (newDay === 4 || seasonEnds) ? {} : (state.earningsPredictions || {}),
        earningsReveal,
        seasonsPlayed: seasonEnds ? (state.seasonsPlayed || 0) + 1 : (state.seasonsPlayed || 0),
        tradeHistory: [...(state.tradeHistory || []), ...newTradeEntries],
        playerXP: (state.playerXP || 0) + 5 + (seasonEnds && pendingGrade ? (pendingGrade.xpAward || 0) : 0),
        beatMarketStreak: seasonEnds
          ? (pendingGrade?.beatMarket ? (state.beatMarketStreak || 0) + 1 : 0)
          : (state.beatMarketStreak || 0),
        knowledgeViewed,
      }
      persist(updated)
      set(updated)
    },

    earnKnowledge: (companyId, type) => {
      const state = get()
      const viewed = state.knowledgeViewed || {}
      const already = viewed[companyId] || {}
      if (already[type]) return
      const reward = type === 'report' ? 15 : 10
      const updated = {
        ...state,
        knowledgeViewed: { ...viewed, [companyId]: { ...already, [type]: true } },
      }
      persist(updated)
      set(updated)
      useCoinStore.getState().earnCoins(reward, `Knowledge: ${type} for ${companyId}`)
    },

    setStopLoss: (companyId, pct) => {
      const state = get()
      const stopLosses = { ...(state.stopLosses || {}) }
      if (pct == null) { delete stopLosses[companyId] } else { stopLosses[companyId] = pct }
      const updated = { ...state, stopLosses }
      persist(updated); set(updated)
    },

    setPriceTarget: (companyId, price) => {
      const state = get()
      const priceTargets = { ...(state.priceTargets || {}) }
      if (!price || price <= 0) { delete priceTargets[companyId] } else { priceTargets[companyId] = price }
      const updated = { ...state, priceTargets }
      persist(updated); set(updated)
    },

    clearLastChallengeResult: () => {
      const state = get()
      const updated = { ...state, lastChallengeResult: null }
      persist(updated); set(updated)
    },

    buy: (companyId, shares) => {
      const state = get()
      const company = state.companies.find(c => c.id === companyId)
      if (!company) return { error: 'Company not found' }
      const cost = shares * company.price
      const coinStore = useCoinStore.getState()
      if (coinStore.coins - cost < 100) return { error: "Can't go below ₳100 safety floor" }
      if (!coinStore.spendCoins(cost, `Call Street: Buy ${shares}× ${company.ticker}`)) return { error: 'Insufficient coins' }

      const existing = state.portfolio.find(p => p.companyId === companyId)
      let portfolio
      if (existing) {
        const newAvg = Math.round((existing.avgCost * existing.shares + cost) / (existing.shares + shares))
        portfolio = state.portfolio.map(p => p.companyId === companyId ? { ...p, shares: p.shares + shares, avgCost: newAvg } : p)
      } else {
        portfolio = [...state.portfolio, { companyId, shares, avgCost: company.price, boughtDay: state.seasonDay }]
      }
      const relatedNews = (state.news || []).find(n => n.companyId === companyId)?.text || null
      const tradeEntry = { id: `buy-${companyId}-${Date.now()}`, type: 'buy', companyId, ticker: company.ticker, emoji: company.emoji, name: company.name, shares, price: company.price, totalCost: cost, day: state.seasonDay, season: state.season, relatedNews }
      const updated = { ...state, portfolio, tradeHistory: [...(state.tradeHistory || []), tradeEntry] }
      persist(updated)
      set(updated)
      return { ok: true, cost }
    },

    sell: (companyId, shares) => {
      const state = get()
      const company = state.companies.find(c => c.id === companyId)
      const holding = state.portfolio.find(p => p.companyId === companyId)
      if (!company || !holding || holding.shares < shares) return { error: 'Invalid position' }
      const proceeds = shares * company.price
      const realized = Math.round((company.price - holding.avgCost) * shares)
      const gainPct = Math.round(((company.price - holding.avgCost) / holding.avgCost) * 100)
      useCoinStore.getState().earnCoins(proceeds, `Call Street: Sell ${shares}× ${company.ticker}`)
      const portfolio = holding.shares === shares
        ? state.portfolio.filter(p => p.companyId !== companyId)
        : state.portfolio.map(p => p.companyId === companyId ? { ...p, shares: p.shares - shares } : p)
      const relatedNews = (state.news || []).find(n => n.companyId === companyId)?.text || null
      const tradeEntry = { id: `sell-${companyId}-${Date.now()}`, type: 'sell', companyId, ticker: company.ticker, emoji: company.emoji, name: company.name, shares, price: company.price, avgCost: holding.avgCost, realized, gainPct, day: state.seasonDay, season: state.season, relatedNews }
      const updated = { ...state, portfolio, tradeHistory: [...(state.tradeHistory || []), tradeEntry] }
      persist(updated)
      set(updated)
      return { ok: true, proceeds }
    },

    buyResearch: (companyId) => {
      const state = get()
      const company = state.companies.find(c => c.id === companyId)
      if (!company) return false
      if (!useCoinStore.getState().spendCoins(25, `Research report: ${company.name}`)) return false
      const companies = state.companies.map(c => c.id === companyId ? { ...c, reportUnlocked: true } : c)
      const updated = { ...state, companies }
      persist(updated)
      set(updated)
      return true
    },

    setMode: (mode) => {
      const updated = { ...get(), mode }
      persist(updated)
      set(updated)
    },

    clearGrade: () => {
      const updated = { ...get(), pendingGrade: null }
      persist(updated)
      set(updated)
    },

    toggleWatchlist: (id) => {
      const state = get()
      const watchlist = (state.watchlist || []).includes(id)
        ? state.watchlist.filter(w => w !== id)
        : [...(state.watchlist || []), id]
      const updated = { ...state, watchlist }
      persist(updated)
      set(updated)
    },

    buyInsiderTip: (companyId) => {
      const state = get()
      const company = state.companies.find(c => c.id === companyId)
      if (!company) return { error: 'Company not found' }
      if (!useCoinStore.getState().spendCoins(50, `Insider tip: ${company.ticker}`)) return { error: 'Need ₳50' }
      const score = company._revGrowth * 0.4 + company._profitMargin * 0.3 + company._founderScore * 0.3
      const bullish = score > 0.18 ? Math.random() > 0.25 : Math.random() > 0.65
      const bullishHints = [
        `${company.ticker}: A contact at a hedge fund is quietly building a position.`,
        `${company.ticker}: Word is the upcoming ring will surprise to the upside.`,
        `${company.ticker}: Insiders are accumulating — something positive is brewing.`,
      ]
      const bearishHints = [
        `${company.ticker}: Institutional money is rotating out. Expect selling pressure.`,
        `${company.ticker}: A source warns of margin headwinds — guidance may disappoint.`,
        `${company.ticker}: Short interest rising. Traders are betting on a pullback.`,
      ]
      const pool = bullish ? bullishHints : bearishHints
      const hint = pool[Math.floor(Math.random() * pool.length)]
      const insiderTip = { companyId, hint, bullish }
      const updated = { ...state, insiderTip }
      persist(updated)
      set(updated)
      return { ok: true }
    },

    clearCrash: () => {
      const updated = { ...get(), crashEvent: null }
      persist(updated)
      set(updated)
    },

    freshStart: (keepIds = []) => {
      const state = get()
      const toSell = state.portfolio.filter(p => !keepIds.includes(p.companyId))
      let proceeds = 0
      toSell.forEach(h => {
        const co = state.companies.find(c => c.id === h.companyId)
        if (co) proceeds += h.shares * co.price
      })
      if (proceeds > 0) useCoinStore.getState().earnCoins(proceeds, 'Fresh start — sold remaining holdings')
      const portfolio = state.portfolio.filter(p => keepIds.includes(p.companyId))
      const updated = { ...state, portfolio }
      persist(updated)
      set(updated)
    },

    reset: () => {
      const fresh = freshState()
      persist(fresh)
      set(fresh)
    },

    setPrediction: (companyId, direction) => {
      const updated = { ...get(), prediction: { companyId, direction } }
      persist(updated); set(updated)
    },

    clearPrediction: () => {
      const updated = { ...get(), prediction: null }
      persist(updated); set(updated)
    },

    clearPredictionResult: () => {
      const updated = { ...get(), predictionResult: null }
      persist(updated); set(updated)
    },

    clearMacroAnnouncement: () => {
      const updated = { ...get(), macroAnnouncement: null }
      persist(updated); set(updated)
    },

    clearHaltBanner: () => {
      const updated = { ...get(), haltBanner: null }
      persist(updated); set(updated)
    },

    shortSell: (companyId, shares) => {
      const state = get()
      if ((state.marketBeats || 0) < 2) return { error: 'Beat the market twice to unlock short selling' }
      const company = state.companies.find(c => c.id === companyId)
      if (!company || company.delisted) return { error: 'Company not available' }
      if (shares < 1 || shares > 10) return { error: 'Short 1–10 shares only' }
      const existing = (state.shorts || []).find(s => s.companyId === companyId)
      if (existing && existing.shares + shares > 10) return { error: `Already short ${existing.shares} — max 10 total` }
      const proceeds = shares * company.price
      useCoinStore.getState().earnCoins(proceeds, `Short sell: ${shares}× ${company.ticker}`)
      let shorts
      if (existing) {
        const total = existing.shares + shares
        const avgOpen = Math.round((existing.openPrice * existing.shares + company.price * shares) / total)
        shorts = state.shorts.map(s => s.companyId === companyId ? { ...s, shares: total, openPrice: avgOpen } : s)
      } else {
        shorts = [...(state.shorts || []), { companyId, shares, openPrice: company.price, ticker: company.ticker, emoji: company.emoji }]
      }
      const updated = { ...state, shorts }
      persist(updated); set(updated)
      return { ok: true, proceeds }
    },

    closeShort: (companyId, sharesToClose) => {
      const state = get()
      const company = state.companies.find(c => c.id === companyId)
      const short = (state.shorts || []).find(s => s.companyId === companyId)
      if (!company || !short) return { error: 'No short position found' }
      if (sharesToClose > short.shares) return { error: 'Cannot close more than position size' }
      const closeCost = sharesToClose * company.price
      if (!useCoinStore.getState().spendCoins(closeCost, `Close short: ${sharesToClose}× ${company.ticker}`))
        return { error: `Need ₳${closeCost} to buy back shares` }
      const shorts = sharesToClose === short.shares
        ? state.shorts.filter(s => s.companyId !== companyId)
        : state.shorts.map(s => s.companyId === companyId ? { ...s, shares: s.shares - sharesToClose } : s)
      const updated = { ...state, shorts }
      persist(updated); set(updated)
      return { ok: true, closeCost }
    },

    makeEarningsPrediction: (companyId, call) => {
      const state = get()
      const updated = { ...state, earningsPredictions: { ...(state.earningsPredictions || {}), [companyId]: call } }
      persist(updated); set(updated)
    },

    clearEarningsReveal: () => {
      const updated = { ...get(), earningsReveal: null }
      persist(updated); set(updated)
    },

    resetPrices: () => {
      const state = get()
      const companies = state.companies.map(c => {
        const def = allDefs.find(d => d.id === c.id)
        if (!def) return c
        const price = Math.round(def.basePrice * (1 + (Math.random() - 0.5) * 0.08))
        const fairValue = calcFairValue(def)
        return { ...c, price, priceHistory: [price], fairValue }
      })
      const updated = { ...state, companies, indexHistory: [100], lastBellChanges: [] }
      persist(updated)
      set(updated)
    },
  }
})

function generateLesson(portfolio, companies, macroRegime) {
  const holdings = portfolio.map(h => {
    const co = companies.find(c => c.id === h.companyId)
    if (!co) return null
    const gainPct = co.price > 0 ? Math.round(((co.price - h.avgCost) / h.avgCost) * 100) : -100
    return { h, co, gainPct }
  }).filter(Boolean).sort((a, b) => a.gainPct - b.gainPct)

  if (holdings.length === 0) return { text: "You didn't hold any positions when the season ended. Conviction is key — time in the market beats timing the market every decade.", icon: '💡' }

  const worst = holdings[0]
  const best  = holdings[holdings.length - 1]

  if (macroRegime === 'rate_hike' && worst.co._debtRatio > 0.4 && worst.gainPct < 0)
    return { icon: '📈', text: `You held ${worst.co.name} (high-debt) during a Rate Hike Cycle — down ${Math.abs(worst.gainPct)}%. Rising rates raise the cost of debt: margins compress, investors flee. Buffett's rule: avoid companies that can't survive a bad year without borrowing more.` }

  if (macroRegime === 'bear' && worst.co._profitMargin < 0 && worst.gainPct < 0)
    return { icon: '🐻', text: `${worst.co.name} was burning cash heading into a Bear Market — down ${Math.abs(worst.gainPct)}%. Loss-making companies get sold first in downturns. Quality and cash flows win when fear spikes.` }

  if (macroRegime === 'bear' && portfolio.length > 3 && holdings.filter(h => h.gainPct < 0).length > Math.floor(portfolio.length / 2))
    return { icon: '🐻', text: `You held ${portfolio.length} positions through a Bear Market. In downturns, concentration beats diversification — 1–2 high-quality, low-debt companies outperform a spread portfolio when everything sells off.` }

  if (worst.co._debtRatio > 0.55 && worst.gainPct < -10)
    return { icon: '⚠️', text: `${worst.co.name}'s high debt became a liability — down ${Math.abs(worst.gainPct)}%. The #1 killer of otherwise good businesses is leverage. High-debt companies can't survive a bad year without borrowing even more.` }

  if (worst.co._profitMargin < -0.15 && worst.gainPct < -10)
    return { icon: '💸', text: `${worst.co.name} was deep in the red with no clear path to profit — down ${Math.abs(worst.gainPct)}%. Losses are only acceptable with a credible monetisation roadmap. Amazon lost money for a decade — but it had a plan.` }

  if (macroRegime === 'innovation_boom' && best.gainPct > 20)
    return { icon: '⚡', text: `You caught the Innovation Boom — ${best.co.name} up ${best.gainPct}%. Tech re-ratings happen fast: speculative fundamentals one quarter become "priced in" the next. Soros mode is built for exactly this regime.` }

  if (holdings.every(h => h.gainPct >= 0))
    return { icon: '🏆', text: `Every position finished in the green. Quality compounds quietly: strong fundamentals don't just drive prices up — they recover faster after dips, which is where long-term wealth is actually built.` }

  return { icon: '📊', text: `Study the analyst report before your next buy — revenue growth, profit margin, and debt ratio predict long-term prices better than any short-term headline. The numbers don't lie; they just take time.` }
}

function calcGrade(portfolio, companies, seasonStartValue, indexHistory, streak = 0, macroRegime = null) {
  const currentValue = portfolio.reduce((s, h) => {
    const co = companies.find(c => c.id === h.companyId)
    return s + (co ? co.price * h.shares : 0)
  }, 0)

  const returnPct = seasonStartValue > 0
    ? Math.round(((currentValue - seasonStartValue) / seasonStartValue) * 100)
    : 0

  const indexStart = indexHistory[Math.max(0, indexHistory.length - 11)] || 100
  const indexEnd   = indexHistory[indexHistory.length - 1] || 100
  const indexReturn = Math.round((indexEnd / indexStart - 1) * 100)
  const beatMarket = returnPct > indexReturn

  let grade, note, coins
  if (returnPct >= 20 && beatMarket)      { grade = 'A+'; note = "Outstanding. You identified the best companies early and held with conviction."; coins = 250 }
  else if (returnPct >= 10 && beatMarket) { grade = 'A';  note = "Excellent. You beat the market index — strong stock picking."; coins = 180 }
  else if (returnPct >= 5)                { grade = 'B';  note = "Solid work. Positive returns. Try concentrating on fewer, higher-conviction positions."; coins = 120 }
  else if (returnPct >= 0)                { grade = 'C';  note = "Break-even. You didn't lose, but the market probably did better. Study the fundamentals."; coins = 60 }
  else                                    { grade = 'D';  note = "Rough season. Check the hidden fundamentals before buying — business quality drives prices."; coins = 15 }

  const multiplier = streak >= 10 ? 3 : streak >= 6 ? 2 : streak >= 3 ? 1.5 : 1
  coins = Math.round(coins * multiplier)
  const xpAward = { 'A+': 500, 'A': 350, 'B': 200, 'C': 100, 'D': 50 }[grade] || 50
  const lesson = generateLesson(portfolio, companies, macroRegime)
  return { grade, returnPct, indexReturn, beatMarket, note, coins, currentValue, multiplier, xpAward, lesson }
}
