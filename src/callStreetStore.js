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

function pickImpact([min, max]) {
  return min + Math.random() * (max - min)
}

function generateEventsForCompany(company) {
  const eligible = NEWS_TEMPLATES.filter(t => t.cond(company))
  if (!eligible.length) return []
  const shuffled = [...eligible].sort(() => Math.random() - 0.5)
  const count = Math.random() < 0.35 ? 2 : 1
  return shuffled.slice(0, count).map(t => ({
    type: t.type,
    text: t.text(company.name),
    impact: Math.round(pickImpact(t.impact) * 1000) / 1000,
    positive: t.positive,
  }))
}

function initCompany(def) {
  const variation = 1 + (Math.random() - 0.5) * 0.08
  const price = Math.round(def.basePrice * variation)
  return { ...def, price, priceHistory: [price], daysHeldByMe: 0, reportUnlocked: false }
}

// ── Sector PE benchmarks (for Buffett mode) ───────────────────────
const SECTOR_PE = { tech: 28, logistics: 18, energy: 14, biotech: 35, environment: 20, robotics: 22, space: 45, materials: 16 }

export function calcPE(company) {
  if (company._profitMargin <= 0) return null
  const eps = company._profitMargin * 0.8
  return Math.round(company.price / (eps * 10))
}

export function calcModeOverlay(company, mode) {
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
    const sectors = { tech: 72, logistics: 45, energy: 38, biotech: 61, environment: 55, robotics: 48, space: 80, materials: 30 }
    const momentum = sectors[company.sector] || 50
    return {
      label: 'Sector Heat',
      value: `${momentum}%`,
      note: momentum > 65 ? '🔥 Hot sector' : momentum > 45 ? 'Warm' : '❄ Cold',
      highlight: momentum > 65,
    }
  }
  return null
}

// ── Persistence ───────────────────────────────────────────────────
const KEY = 'aeva_callstreet_v2'
function persist(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }
function loadSaved() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }

const allDefs = [...COMPANIES_DEF, ...STARTUPS_DEF]

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
          const totalImpact = events.reduce((s, e) => s + e.impact, 0)
          const startupNoise = company.isStartup ? (Math.random() - 0.45) * (company._volatility || 0.1) : 0
          const newPrice = Math.max(1, Math.round(company.price * (1 + totalImpact + startupNoise)))

          events.forEach(e => {
            const lesson = AEVA_LESSONS[e.type]
            const aevaNote = lesson ? (e.positive ? lesson.pos : lesson.neg) : null
            allNews.push({
              id: `${Date.now()}-${company.id}-${Math.random()}`,
              companyId: company.id,
              ticker: company.ticker,
              emoji: company.emoji,
              text: e.text,
              impact: e.impact,
              positive: e.positive,
              type: e.type,
              aevaNote,
              day: state.seasonDay + 1,
              ringId,
            })
          })

          return { ...company, price: newPrice, priceHistory: [...company.priceHistory.slice(-9), newPrice], daysHeldByMe: newDaysHeld, reportUnlocked }
        } else {
          // Mild fundamental drift + tiny random walk
          const drift = (company._revGrowth - 0.15) * 0.003
          const noise = (Math.random() - 0.5) * 0.015
          const newPrice = Math.max(1, Math.round(company.price * (1 + drift + noise)))
          return { ...company, price: newPrice, priceHistory: [...company.priceHistory.slice(-9), newPrice], daysHeldByMe: newDaysHeld, reportUnlocked }
        }
      })

      // Market crash — 4% chance, wipes 15–30% off all prices
      const crashPct = Math.random() < 0.04 ? 0.15 + Math.random() * 0.15 : 0
      const crashEvent = crashPct > 0 ? { pct: Math.round(crashPct * 100) } : null
      const finalCompanies = crashPct > 0
        ? updatedCompanies.map(c => {
            const cp = Math.max(1, Math.round(c.price * (1 - crashPct)))
            return { ...c, price: cp, priceHistory: [...c.priceHistory.slice(-9), cp] }
          })
        : updatedCompanies

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

      // Expire research reports
      const researchBought = []

      const newDay = state.seasonDay + 1
      const seasonEnds = newDay >= 10

      let pendingGrade = state.pendingGrade
      let season = state.season
      let seasonDay = newDay
      let seasonStartValue = state.seasonStartValue

      if (seasonEnds) {
        pendingGrade = calcGrade(state.portfolio, finalCompanies, state.seasonStartValue, newIndexHistory, (state.streak || 0) + 1)
        season = state.season + 1
        seasonDay = 0
        seasonStartValue = state.portfolio.reduce((s, h) => {
          const co = finalCompanies.find(c => c.id === h.companyId)
          return s + (co ? co.price * h.shares : 0)
        }, 0)
      }

      // IPO trigger: 30% chance on day 3 of a new season
      let ipoActive = state.ipoActive
      if (seasonDay === 3 && !ipoActive && Math.random() < 0.3) {
        const ipoCompany = finalCompanies[Math.floor(Math.random() * finalCompanies.length)]
        ipoActive = { companyId: ipoCompany.id, offerPrice: Math.round(ipoCompany.price * 0.85), expiresDay: 5 }
      }
      if (ipoActive && seasonDay > (ipoActive.expiresDay || 5)) ipoActive = null

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
      }
      persist(updated)
      set(updated)
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
      const updated = { ...state, portfolio }
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
      useCoinStore.getState().earnCoins(proceeds, `Call Street: Sell ${shares}× ${company.ticker}`)
      const portfolio = holding.shares === shares
        ? state.portfolio.filter(p => p.companyId !== companyId)
        : state.portfolio.map(p => p.companyId === companyId ? { ...p, shares: p.shares - shares } : p)
      const updated = { ...state, portfolio }
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

    reset: () => {
      const fresh = freshState()
      persist(fresh)
      set(fresh)
    },
  }
})

function calcGrade(portfolio, companies, seasonStartValue, indexHistory, streak = 0) {
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
  return { grade, returnPct, indexReturn, beatMarket, note, coins, currentValue, multiplier }
}
