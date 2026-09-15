import { create } from 'zustand'
import { scheduleSave } from './syncService'

const KEY = 'aeva_coins_v1'
function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
  scheduleSave('coin_state', s)
}

export function calcTopicPrice(topic) {
  const daysSince = (Date.now() - new Date(topic.lastPracticed).getTime()) / 86400000
  const recency = Math.max(0.3, 1 - daysSince * 0.03)
  const accMult = topic.accuracy / 50
  return Math.round(100 * accMult * recency)
}

export function calcTopicDividend(topic) {
  const daysSince = (Date.now() - new Date(topic.lastPracticed).getTime()) / 86400000
  if (daysSince > 7) return 0
  return Math.round(calcTopicPrice(topic) * 0.03)
}

export function calcBondReturn(duration) {
  if (duration >= 30) return 1.6
  if (duration >= 14) return 1.35
  return 1.15
}

export const ETF_DEFS = [
  { id: 'sciences',  name: 'Sciences Bundle',  emoji: '🔬', colour: '#1D9E75', topics: ['Biology', 'Chemistry', 'Physics', 'Organic Chemistry', 'Genetics', 'Biochemistry', 'Ecology'] },
  { id: 'maths',     name: 'Maths Bundle',      emoji: '📐', colour: '#185FA5', topics: ['Calculus', 'Algebra', 'Trigonometry', 'Statistics', 'Geometry', 'Mechanics', 'Further Maths'] },
  { id: 'history',   name: 'History Bundle',    emoji: '📜', colour: '#BA7517', topics: ['World War 2', 'Ancient History', 'Modern History', 'Geography', 'Politics', 'Cold War'] },
  { id: 'languages', name: 'Languages Bundle',  emoji: '💬', colour: '#7F77DD', topics: ['English Literature', 'Grammar', 'Linguistics', 'Rhetoric', 'Poetry', 'Prose'] },
  { id: 'arts',      name: 'Arts Bundle',       emoji: '🎨', colour: '#D4537E', topics: ['Art History', 'Music Theory', 'Philosophy', 'Psychology', 'Sociology', 'Ethics'] },
]

export const KNOWLEDGE_COMPANIES = [
  { ticker: 'QTM', name: 'Quantum Dynamics Corp', sector: 'sciences', emoji: '⚛️', color: '#60A5FA',
    ceo: { name: 'Dr. Richard P. Feynman', rating: 'A+', background: 'Nobel laureate in Physics. Legendary lecturer. Made quantum mechanics legible to a generation.', quote: "If you can't explain it simply, you don't understand it well enough." },
    fundamentals: { pe: 18.4, revenueGrowth: 24, analystRating: 'STRONG BUY', targetPrice: 420, marketCap: '14.2B', beta: 1.2 },
    basePrice: 340, description: 'Advanced physics from mechanics to quantum field theory.', insiderTopic: 'Physics' },
  { ticker: 'ORG', name: 'Organica Sciences Ltd', sector: 'sciences', emoji: '🧪', color: '#34D399',
    ceo: { name: 'Prof. Marie Curie', rating: 'A+', background: 'Double Nobel laureate. Discovered two elements. Broke every scientific barrier while Europe tried to keep her out.', quote: 'Nothing in life is to be feared, only to be understood.' },
    fundamentals: { pe: 21.1, revenueGrowth: 18, analystRating: 'BUY', targetPrice: 340, marketCap: '9.8B', beta: 0.9 },
    basePrice: 280, description: 'Organic chemistry, reaction mechanisms, and molecular synthesis.', insiderTopic: 'Chemistry' },
  { ticker: 'BIO', name: 'BioSynth Capital', sector: 'sciences', emoji: '🧬', color: '#4ADE80',
    ceo: { name: 'Dr. Francis Crick', rating: 'A', background: 'Co-discoverer of the double helix. Ruthless scientific clarity — structure reveals function, always.', quote: 'If you want to understand function, study structure.' },
    fundamentals: { pe: 16.8, revenueGrowth: 21, analystRating: 'BUY', targetPrice: 240, marketCap: '8.1B', beta: 1.1 },
    basePrice: 190, description: 'Cell biology, genetics, and molecular biology systems.', insiderTopic: 'Biology' },
  { ticker: 'CALC', name: 'Calculus Ventures', sector: 'maths', emoji: '∫', color: '#818CF8',
    ceo: { name: 'Leonhard Euler', rating: 'A+', background: 'Most prolific mathematician in history — 800+ papers, blind in one eye. Still outpaced everyone.', quote: 'Nothing takes place in the world whose meaning is not that of some maximum or minimum.' },
    fundamentals: { pe: 24.5, revenueGrowth: 31, analystRating: 'STRONG BUY', targetPrice: 520, marketCap: '22.4B', beta: 0.7 },
    basePrice: 420, description: 'Calculus, differential equations, and mathematical analysis.', insiderTopic: 'Calculus' },
  { ticker: 'STAT', name: 'Sigma Analytics Group', sector: 'maths', emoji: 'σ', color: '#A78BFA',
    ceo: { name: 'Sir R.A. Fisher', rating: 'A-', background: 'Father of modern statistics. Invented ANOVA and maximum likelihood estimation. The framework every scientist uses.', quote: 'To consult the statistician after an experiment is often merely to ask him to conduct a post mortem.' },
    fundamentals: { pe: 14.2, revenueGrowth: 15, analystRating: 'BUY', targetPrice: 205, marketCap: '6.4B', beta: 0.85 },
    basePrice: 165, description: 'Statistics, probability, data analysis, and inference.', insiderTopic: 'Statistics' },
  { ticker: 'HIS', name: 'Historica Trust PLC', sector: 'history', emoji: '📜', color: '#FBBF24',
    ceo: { name: 'David McCullough', rating: 'B+', background: 'Two-time Pulitzer winner. Made history readable for 50 million people. Narrative was his engine of understanding.', quote: 'History is who we are and why we are the way we are.' },
    fundamentals: { pe: 11.2, revenueGrowth: 8, analystRating: 'HOLD', targetPrice: 170, marketCap: '4.1B', beta: 0.75 },
    basePrice: 145, description: 'World history from ancient civilisations to modern conflict.', insiderTopic: 'History' },
  { ticker: 'LIT', name: 'Renaissance Literary Co', sector: 'languages', emoji: '📚', color: '#F9A8D4',
    ceo: { name: 'Virginia Woolf', rating: 'B+', background: 'Modernist pioneer. Stream of consciousness changed the novel forever. Wrote with a precision that cut through the century.', quote: 'You cannot find peace by avoiding life.' },
    fundamentals: { pe: 10.8, revenueGrowth: 6, analystRating: 'HOLD', targetPrice: 155, marketCap: '3.2B', beta: 0.6 },
    basePrice: 130, description: 'English literature, literary analysis, and critical writing.', insiderTopic: 'English Literature' },
  { ticker: 'ECO', name: 'Ecosystem Capital Ltd', sector: 'sciences', emoji: '🌱', color: '#6EE7B7',
    ceo: { name: 'Prof. E.O. Wilson', rating: 'A-', background: 'Father of sociobiology. Coined biophilia. Spent 60 years arguing the natural world mattered more than we thought.', quote: "Destroying a species is like burning a library before you've read the books." },
    fundamentals: { pe: 13.5, revenueGrowth: 17, analystRating: 'BUY', targetPrice: 195, marketCap: '5.9B', beta: 1.0 },
    basePrice: 155, description: 'Ecology, environmental science, and conservation biology.', insiderTopic: 'Ecology' },
  { ticker: 'PSY', name: 'Behavioral Dynamics Inc', sector: 'arts', emoji: '🧠', color: '#F472B6',
    ceo: { name: 'Dr. William James', rating: 'B+', background: 'Father of American psychology. Wrote the 1400-page Principles of Psychology. Stream of consciousness was his obsession.', quote: 'The greatest discovery of any generation is that a human can alter their life by altering their attitude.' },
    fundamentals: { pe: 15.6, revenueGrowth: 22, analystRating: 'BUY', targetPrice: 255, marketCap: '7.3B', beta: 1.15 },
    basePrice: 205, description: 'Cognitive psychology, behavioural science, and research methods.', insiderTopic: 'Psychology' },
  { ticker: 'ECON', name: 'Macro Institute Ltd', sector: 'history', emoji: '📈', color: '#FCD34D',
    ceo: { name: 'J.M. Keynes', rating: 'A', background: 'Invented macroeconomics. Traded currencies while writing monetary theory. Reshaped how governments handle money.', quote: 'In the long run, we are all dead.' },
    fundamentals: { pe: 19.7, revenueGrowth: 28, analystRating: 'STRONG BUY', targetPrice: 390, marketCap: '12.1B', beta: 1.3 },
    basePrice: 310, description: 'Macroeconomics, microeconomics, and market theory.', insiderTopic: 'Economics' },
  { ticker: 'PHI', name: 'Stoic Group PLC', sector: 'arts', emoji: '⚖️', color: '#C4B5FD',
    ceo: { name: 'Bertrand Russell', rating: 'B', background: 'Nobel Prize-winning philosopher-mathematician. Wrote Principia Mathematica. Got arrested for anti-war protests at 89.', quote: 'The good life is one inspired by love and guided by knowledge.' },
    fundamentals: { pe: 9.4, revenueGrowth: 5, analystRating: 'HOLD', targetPrice: 195, marketCap: '3.8B', beta: 0.55 },
    basePrice: 175, description: 'Philosophy, ethics, logic, and critical reasoning.', insiderTopic: 'Philosophy' },
  { ticker: 'CS', name: 'Applied Tech Corp', sector: 'maths', emoji: '💻', color: '#38BDF8',
    ceo: { name: 'Alan Turing', rating: 'A+', background: 'Father of computer science. Cracked Enigma. Wrote the paper that defined the limits of computation itself.', quote: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.' },
    fundamentals: { pe: 32.1, revenueGrowth: 45, analystRating: 'STRONG BUY', targetPrice: 580, marketCap: '28.4B', beta: 1.5 },
    basePrice: 460, description: 'Computer science, algorithms, and programming fundamentals.', insiderTopic: 'Computer Science' },
]

const NEWS_POOL = [
  { ticker: 'QTM', headline: 'QTM CEO publishes landmark paper on quantum entanglement. Analysts upgrade to STRONG BUY.', impact: 12 },
  { ticker: 'QTM', headline: 'Physics curriculum overhaul adds 3 mandatory units. QTM enrollment projections revised upward.', impact: 8 },
  { ticker: 'ORG', headline: 'Organica Sciences reports 94% student pass rate — highest in sector history.', impact: 10 },
  { ticker: 'ORG', headline: 'Insider filing: Curie Foundation purchases 200k ORG shares ahead of syllabus announcement.', impact: 15 },
  { ticker: 'BIO', headline: 'New Biology specification drives BIO enrolments up 31% YoY. Revenue guidance raised.', impact: 11 },
  { ticker: 'BIO', headline: 'BioSynth Capital expands into pharmacology. Market cap target revised to ₳10B.', impact: 9 },
  { ticker: 'CALC', headline: 'Further Maths uptake at all-time high. CALC logs best quarter since IPO.', impact: 14 },
  { ticker: 'CALC', headline: 'Calculus competency now required at 87% of STEM programmes per university survey.', impact: 18 },
  { ticker: 'STAT', headline: 'SIGMA downgraded as data science bootcamps erode traditional statistics market share.', impact: -11 },
  { ticker: 'STAT', headline: 'Sigma Analytics secures exam board partnership. New probability modules announced for Q1.', impact: 8 },
  { ticker: 'HIS', headline: 'History GCSE uptake falls 6% as students prioritise STEM subjects. HIS guides lower.', impact: -13 },
  { ticker: 'HIS', headline: 'Breakthrough documentary drives renewed interest in 20th century history. Subscriptions spike.', impact: 7 },
  { ticker: 'LIT', headline: 'English Literature A-Level entries drop for 4th consecutive year. Structural headwinds persist.', impact: -9 },
  { ticker: 'LIT', headline: "Booker Prize winner floods market with new readers. LIT analysis modules see 22% spike.", impact: 8 },
  { ticker: 'ECO', headline: 'Climate curriculum mandates boost ECO enrollment across secondary schools nationwide.', impact: 16 },
  { ticker: 'ECO', headline: 'Ecosystem Capital partners with government on biodiversity education initiative. Target raised.', impact: 12 },
  { ticker: 'PSY', headline: 'Mental health awareness surge drives psychology A-Level entries to record high.', impact: 13 },
  { ticker: 'PSY', headline: 'Behavioral Dynamics CEO announces exclusive university partnership. Insiders accumulate.', impact: 17 },
  { ticker: 'ECON', headline: 'Global inflation crisis drives record economics uptake. ECON target revised to ₳410.', impact: 15 },
  { ticker: 'ECON', headline: 'Recession fears dampen premium education spending. Macro Institute guides Q4 flat.', impact: -10 },
  { ticker: 'PHI', headline: 'Philosophy EPQ project uptake up 40%. Stoic Group surprises with upgraded guidance.', impact: 9 },
  { ticker: 'CS', headline: 'CS demand at all-time high. Applied Tech Corp forecasts 50% revenue growth next year.', impact: 22 },
  { ticker: 'CS', headline: 'Applied Tech secures deals with top 20 UK universities. Turing Foundation endorses curriculum.', impact: 18 },
  { ticker: 'CS', headline: 'AI tools disrupt traditional CS teaching market. Applied Tech revising product roadmap.', impact: -14 },
  { sector: 'sciences', headline: 'Sciences sector outperforms as STEM incentives expand. Broad-based rally across all names.', impact: 8 },
  { sector: 'maths', headline: 'Government announces maths premium for teachers. Maths sector stocks surge on the news.', impact: 10 },
  { sector: 'sciences', headline: 'Lab funding cuts weigh on science education sector. Analysts downgrade science names.', impact: -7 },
  { sector: 'history', headline: 'Humanities funding decline hits History and Literature stocks. Sector-wide rotation out.', impact: -8 },
  { sector: 'arts', headline: 'Wellbeing curriculum push creates tailwind for Arts and Psychology stocks.', impact: 7 },
  { headline: 'Knowledge economy enters bull phase. Broad-based buying across all sectors.', impact: 5 },
]

function _seedRand(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function _genHistory(basePrice, seed) {
  const rand = _seedRand(seed)
  const history = []
  let p = basePrice * (0.82 + rand() * 0.36)
  for (let i = 0; i < 7; i++) {
    p = Math.max(30, Math.min(1200, p * (1 + (rand() - 0.48) * 0.1)))
    history.push(Math.round(p))
  }
  return history
}

function _initStockState(companies) {
  const out = {}
  companies.forEach(c => {
    const seed = c.ticker.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1) * 17, 0)
    const history = _genHistory(c.basePrice, seed)
    const price = history[history.length - 1]
    const prev = history[history.length - 2] || c.basePrice
    out[c.ticker] = { price, change24h: Math.round(((price - prev) / prev) * 1000) / 10, history }
  })
  return out
}

const DEFAULT = {
  coins: 500,
  transactions: [],
  portfolio: [],
  bonds: [],
  etfHoldings: [],
  lastDailyBonus: null,
  lastDividendClaim: null,
  monthlySnapshots: [],  // [{ month: 'YYYY-MM', netWorth, coins, portfolioValue }]
  stats: { totalEarned: 500, totalSpent: 0, bondsCompleted: 0, bondsFailed: 0 },
  stockPositions: {},
  marketNews: [],
  stockPriceState: {},
  lastMarketRefresh: null,
}

function addTx(state, amount, label, type) {
  const tx = { id: Date.now(), amount, label, type, date: new Date().toISOString() }
  return [tx, ...state.transactions].slice(0, 100)
}

export const useCoinStore = create((set, get) => {
  const stored = load()
  return {
    ...DEFAULT,
    ...(stored || {}),

    earnCoins: (amount, label = 'Earned') => {
      set(state => {
        const updated = {
          ...state,
          coins: state.coins + amount,
          transactions: addTx(state, amount, label, 'earn'),
          stats: { ...state.stats, totalEarned: state.stats.totalEarned + amount },
        }
        save(updated)
        return updated
      })
    },

    spendCoins: (amount, label = 'Spent') => {
      const { coins } = get()
      if (coins < amount) return false
      set(state => {
        const updated = {
          ...state,
          coins: state.coins - amount,
          transactions: addTx(state, -amount, label, 'spend'),
          stats: { ...state.stats, totalSpent: state.stats.totalSpent + amount },
        }
        save(updated)
        return updated
      })
      return true
    },

    checkDailyBonus: () => {
      const today = new Date().toDateString()
      const state = get()
      if (state.lastDailyBonus === today) return
      set(s => {
        const updated = { ...s, lastDailyBonus: today }
        save(updated)
        return updated
      })
      get().earnCoins(15, 'Daily Login Bonus')
      get().takeMonthlySnapshot()
    },

    takeMonthlySnapshot: () => {
      const state = get()
      const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
      if (state.monthlySnapshots.some(s => s.month === month)) return
      const portfolioValue = state.portfolio.reduce((s, t) => s + calcTopicPrice(t), 0)
      const etfValue = state.etfHoldings.reduce((s, h) => s + h.units * 100, 0)
      const snapshot = { month, netWorth: state.coins + portfolioValue + etfValue, coins: state.coins, portfolioValue }
      set(s => {
        const updated = { ...s, monthlySnapshots: [...s.monthlySnapshots, snapshot].slice(-12) }
        save(updated)
        return updated
      })
    },

    addToPortfolio: (topic, accuracy, questionCount, category = '') => {
      set(state => {
        const existing = state.portfolio.find(t => t.topic.toLowerCase() === topic.toLowerCase())
        const entry = {
          id: existing?.id || Date.now().toString(),
          topic,
          category: category || detectCategory(topic),
          accuracy: Math.min(100, Math.max(0, accuracy)),
          questionCount: Math.max(1, questionCount),
          masteredAt: existing?.masteredAt || new Date().toISOString(),
          lastPracticed: new Date().toISOString(),
        }
        const portfolio = existing
          ? state.portfolio.map(t => t.id === existing.id ? entry : t)
          : [...state.portfolio, entry]
        const bonus = existing ? 0 : 100
        const transactions = bonus > 0 ? addTx(state, bonus, `Mastered: ${topic}`, 'earn') : state.transactions
        const updated = {
          ...state,
          portfolio,
          coins: state.coins + bonus,
          transactions,
          stats: bonus > 0 ? { ...state.stats, totalEarned: state.stats.totalEarned + bonus } : state.stats,
        }
        save(updated)
        return updated
      })
    },

    removeFromPortfolio: (id) => {
      set(state => {
        const updated = { ...state, portfolio: state.portfolio.filter(t => t.id !== id) }
        save(updated)
        return updated
      })
    },

    refreshPractice: (topicId) => {
      set(state => {
        const portfolio = state.portfolio.map(t =>
          t.id === topicId ? { ...t, lastPracticed: new Date().toISOString() } : t
        )
        const updated = { ...state, portfolio }
        save(updated)
        return updated
      })
    },

    createBond: (topic, stake, duration) => {
      if (!get().spendCoins(stake, `Bond Stake: ${topic}`)) return false
      set(state => {
        const bond = {
          id: Date.now().toString(),
          topic,
          stake,
          duration,
          returnMultiplier: calcBondReturn(duration),
          startDate: new Date().toISOString(),
          daysCheckedIn: [],
          active: true,
          completedAt: null,
          failedAt: null,
        }
        const updated = { ...state, bonds: [...state.bonds, bond] }
        save(updated)
        return updated
      })
      return true
    },

    checkInBond: (bondId) => {
      const today = new Date().toDateString()
      set(state => {
        const bonds = state.bonds.map(b => {
          if (b.id !== bondId || !b.active) return b
          if (b.daysCheckedIn.includes(today)) return b
          const updated = { ...b, daysCheckedIn: [...b.daysCheckedIn, today] }
          // Check if complete
          if (updated.daysCheckedIn.length >= updated.duration) {
            return { ...updated, active: false, completedAt: new Date().toISOString() }
          }
          // Check if failed (missed 2+ days)
          const daysSinceStart = (Date.now() - new Date(b.startDate).getTime()) / 86400000
          const expectedDays = Math.floor(daysSinceStart) + 1
          const missed = expectedDays - updated.daysCheckedIn.length
          if (missed > 2) {
            return { ...updated, active: false, failedAt: new Date().toISOString() }
          }
          return updated
        })
        // Pay out completed bonds
        const newlyCompleted = bonds.filter(b =>
          !b.active && b.completedAt &&
          !state.bonds.find(ob => ob.id === b.id && !ob.active)
        )
        let coins = state.coins
        let transactions = state.transactions
        let statsInc = 0
        for (const b of newlyCompleted) {
          const payout = Math.round(b.stake * b.returnMultiplier)
          coins += payout
          transactions = addTx({ transactions }, payout, `Bond Complete: ${b.topic}`, 'earn')
          statsInc++
        }
        const updated = {
          ...state,
          bonds,
          coins,
          transactions,
          stats: { ...state.stats, bondsCompleted: state.stats.bondsCompleted + statsInc, totalEarned: state.stats.totalEarned + newlyCompleted.reduce((s, b) => s + Math.round(b.stake * b.returnMultiplier), 0) },
        }
        save(updated)
        return updated
      })
    },

    claimDividends: () => {
      const state = get()
      const lastClaim = state.lastDividendClaim ? new Date(state.lastDividendClaim) : null
      const now = new Date()
      const daysSinceClaim = lastClaim ? (now - lastClaim) / 86400000 : 8
      if (daysSinceClaim < 7) return 0
      const total = state.portfolio.reduce((sum, t) => sum + calcTopicDividend(t), 0)
      if (total <= 0) return 0
      set(s => {
        const updated = {
          ...s,
          coins: s.coins + total,
          lastDividendClaim: now.toISOString(),
          transactions: addTx(s, total, 'Weekly Dividends', 'earn'),
          stats: { ...s.stats, totalEarned: s.stats.totalEarned + total },
        }
        save(updated)
        return updated
      })
      return total
    },

    refreshMarket: (portfolio = []) => {
      const now = Date.now()
      const state = get()
      if (state.lastMarketRefresh && now - new Date(state.lastMarketRefresh).getTime() < 8 * 60 * 1000) return

      const pool = [...NEWS_POOL]
      const count = 2 + (Math.random() > 0.55 ? 1 : 0)
      const selected = []
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        selected.push(pool.splice(idx, 1)[0])
      }

      const currentPriceState = Object.keys(state.stockPriceState).length > 0
        ? state.stockPriceState
        : _initStockState(KNOWLEDGE_COMPANIES)

      const newPriceState = {}
      const nowStr = new Date().toISOString()
      const newNews = selected.map((n, i) => ({ id: Date.now() + i, ...n, time: nowStr }))

      KNOWLEDGE_COMPANIES.forEach(c => {
        const current = currentPriceState[c.ticker] || { price: c.basePrice, change24h: 0, history: _genHistory(c.basePrice, 42) }
        let price = current.price

        selected.forEach(n => {
          const affects = (n.ticker === c.ticker) || (n.sector === c.sector) || (!n.ticker && !n.sector)
          if (affects) price = price * (1 + (n.impact / 100))
        })

        price = price * (1 + (Math.random() - 0.5) * 0.05)

        const hasInsider = portfolio.some(t =>
          t.topic?.toLowerCase().includes(c.insiderTopic.toLowerCase()) ||
          c.insiderTopic.toLowerCase().includes(t.topic?.toLowerCase() || '')
        )
        if (hasInsider) price = price * 1.025

        price = Math.max(30, Math.min(1200, Math.round(price)))
        const prev = current.history[current.history.length - 1] || current.price
        const change24h = Math.round(((price - prev) / prev) * 1000) / 10
        const history = [...current.history.slice(-6), price]
        newPriceState[c.ticker] = { price, change24h, history }
      })

      set(s => {
        const updated = {
          ...s,
          stockPriceState: newPriceState,
          marketNews: [...newNews, ...s.marketNews].slice(0, 30),
          lastMarketRefresh: nowStr,
        }
        save(updated)
        return updated
      })
    },

    buyStock: (ticker, qty) => {
      const state = get()
      const co = KNOWLEDGE_COMPANIES.find(c => c.ticker === ticker)
      if (!co) return false
      const price = (Object.keys(state.stockPriceState).length > 0 ? state.stockPriceState[ticker]?.price : null) || co.basePrice
      const cost = Math.round(price * qty * 1.01)
      if (state.coins < cost) return false
      set(s => {
        const existing = s.stockPositions[ticker]
        const newShares = (existing?.shares || 0) + qty
        const newAvgCost = existing
          ? Math.round((existing.avgCost * existing.shares + price * qty) / newShares)
          : price
        const updated = {
          ...s,
          coins: s.coins - cost,
          stockPositions: { ...s.stockPositions, [ticker]: { shares: newShares, avgCost: newAvgCost, boughtAt: existing?.boughtAt || new Date().toISOString() } },
          transactions: addTx(s, -cost, `Buy ${qty}× ${ticker} @ ₳${price}`, 'spend'),
          stats: { ...s.stats, totalSpent: s.stats.totalSpent + cost },
        }
        save(updated)
        return updated
      })
      return true
    },

    sellStock: (ticker, qty) => {
      const state = get()
      const co = KNOWLEDGE_COMPANIES.find(c => c.ticker === ticker)
      if (!co) return false
      const price = (Object.keys(state.stockPriceState).length > 0 ? state.stockPriceState[ticker]?.price : null) || co.basePrice
      const position = state.stockPositions[ticker]
      if (!position || position.shares < qty) return false
      const proceeds = Math.round(price * qty * 0.99)
      const pnl = Math.round((price - position.avgCost) * qty)
      set(s => {
        const remaining = s.stockPositions[ticker].shares - qty
        const newPositions = remaining > 0
          ? { ...s.stockPositions, [ticker]: { ...s.stockPositions[ticker], shares: remaining } }
          : Object.fromEntries(Object.entries(s.stockPositions).filter(([k]) => k !== ticker))
        const updated = {
          ...s,
          coins: s.coins + proceeds,
          stockPositions: newPositions,
          transactions: addTx(s, proceeds, `Sell ${qty}× ${ticker} (P&L: ${pnl >= 0 ? '+' : ''}₳${pnl})`, 'earn'),
          stats: { ...s.stats, totalEarned: s.stats.totalEarned + proceeds },
        }
        save(updated)
        return updated
      })
      return true
    },

    resetToDefault: () => {
      const fresh = { ...DEFAULT, transactions: [], stats: { totalEarned: 500, totalSpent: 0, bondsCompleted: 0, bondsFailed: 0 } }
      save(fresh)
      set(fresh)
    },

    addCoins: (amount) => {
      set(state => {
        const updated = { ...state, coins: state.coins + amount, transactions: addTx(state, amount, 'Manual top-up', 'earn'), stats: { ...state.stats, totalEarned: state.stats.totalEarned + amount } }
        save(updated)
        return updated
      })
    },

    buyETF: (etfId, units) => {
      const cost = units * 100
      if (!get().spendCoins(cost, `ETF: ${ETF_DEFS.find(e => e.id === etfId)?.name}`)) return false
      set(state => {
        const existing = state.etfHoldings.find(h => h.etfId === etfId)
        const etfHoldings = existing
          ? state.etfHoldings.map(h => h.etfId === etfId ? { ...h, units: h.units + units } : h)
          : [...state.etfHoldings, { id: Date.now().toString(), etfId, units, purchasedAt: new Date().toISOString(), lastYield: null }]
        const updated = { ...state, etfHoldings }
        save(updated)
        return updated
      })
      return true
    },

    sellETF: (etfId, units) => {
      const etf = ETF_DEFS.find(e => e.id === etfId)
      set(state => {
        const holding = state.etfHoldings.find(h => h.etfId === etfId)
        if (!holding || holding.units < units) return state
        const newUnits = holding.units - units
        const etfHoldings = newUnits === 0
          ? state.etfHoldings.filter(h => h.etfId !== etfId)
          : state.etfHoldings.map(h => h.etfId === etfId ? { ...h, units: newUnits } : h)
        const refund = units * 100
        const updated = {
          ...state,
          etfHoldings,
          coins: state.coins + refund,
          transactions: addTx(state, refund, `Sold ETF: ${etf?.name}`, 'earn'),
          stats: { ...state.stats, totalEarned: state.stats.totalEarned + refund },
        }
        save(updated)
        return updated
      })
    },
  }
})

function detectCategory(topic) {
  const t = topic.toLowerCase()
  if (/math|calc|algebra|trig|stat|geom|mechanic/.test(t)) return 'maths'
  if (/bio|chem|physics|genetic|eco|organic/.test(t)) return 'sciences'
  if (/history|war|ancient|modern|geog|polit|cold/.test(t)) return 'history'
  if (/english|grammar|lingu|rhetoric|poetry|prose|lit/.test(t)) return 'languages'
  if (/art|music|philos|psycho|socio|ethic/.test(t)) return 'arts'
  return ''
}
