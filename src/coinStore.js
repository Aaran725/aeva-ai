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

const DEFAULT = {
  coins: 500,
  transactions: [],
  portfolio: [],
  bonds: [],
  etfHoldings: [],
  lastDailyBonus: null,
  lastDividendClaim: null,
  stats: { totalEarned: 500, totalSpent: 0, bondsCompleted: 0, bondsFailed: 0 },
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
