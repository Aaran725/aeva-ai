import { create } from 'zustand'
import { supabase } from './supabase'
import { useCoinStore } from './coinStore'

/*
  Run this SQL in Supabase → SQL Editor to enable Phase 3:

  CREATE TABLE IF NOT EXISTS stock_holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    shares INTEGER NOT NULL CHECK (shares > 0),
    avg_cost INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS short_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shorter_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    shares INTEGER NOT NULL,
    borrow_price INTEGER NOT NULL,
    collateral_locked INTEGER NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    pnl INTEGER,
    status TEXT NOT NULL DEFAULT 'open'
  );

  CREATE TABLE IF NOT EXISTS limit_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    order_type TEXT NOT NULL,
    shares INTEGER NOT NULL,
    target_price INTEGER NOT NULL,
    coins_reserved INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
  );

  ALTER TABLE stock_holdings  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE short_positions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE limit_orders    ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "r" ON stock_holdings  FOR SELECT USING (true);
  CREATE POLICY "i" ON stock_holdings  FOR INSERT WITH CHECK (true);
  CREATE POLICY "u" ON stock_holdings  FOR UPDATE USING (true);
  CREATE POLICY "d" ON stock_holdings  FOR DELETE USING (true);
  CREATE POLICY "rs" ON short_positions FOR SELECT USING (true);
  CREATE POLICY "is" ON short_positions FOR INSERT WITH CHECK (true);
  CREATE POLICY "us" ON short_positions FOR UPDATE USING (true);
  CREATE POLICY "rl" ON limit_orders   FOR SELECT USING (true);
  CREATE POLICY "il" ON limit_orders   FOR INSERT WITH CHECK (true);
  CREATE POLICY "ul" ON limit_orders   FOR UPDATE USING (true);
  CREATE POLICY "dl" ON limit_orders   FOR DELETE USING (true);
*/

/* ── Price calculation from arena_profiles ──────────────────── */
export function calcPlayerPrice(profile) {
  if (!profile) return 100
  const elo     = profile.elo || 1000
  const winRate = (profile.wins || 0) / Math.max(1, (profile.wins || 0) + (profile.losses || 0))
  const acc     = (profile.accuracy_pct || 0.5) * 100
  const games   = Math.min(profile.total_games || 0, 50)
  // More games = more confidence in the price
  const confidence = 0.5 + games / 100
  const raw = 50 + (elo - 1000) / 10 + winRate * 100 + acc * confidence
  return Math.max(50, Math.round(raw))
}

export function calcShortInterest(holdings, subjectId) {
  return holdings.filter(h => h.subject_id === subjectId && h._isShort).reduce((s, h) => s + h.shares, 0)
}

const DEFAULT = {
  players: [],          // arena_profiles with calculated price + holdings
  myHoldings: [],       // stock_holdings where owner_id = me
  myShorts: [],         // short_positions where shorter_id = me
  myLimitOrders: [],    // limit_orders where user_id = me
  allShorts: [],        // all open shorts (for squeeze detection)
  dbAvailable: null,
  loading: false,
  lastLoaded: null,
}

const FEE_RATE   = 0.01   // 1% trading fee (burned)
const COLLATERAL = 1.5    // 150% collateral for shorts
const MAX_SHARES = 100    // max shares per holder per player
const TOTAL_SHARES = 1000

export const usePlayerStockStore = create((set, get) => ({
  ...DEFAULT,

  _checkDB: async () => {
    if (get().dbAvailable !== null) return get().dbAvailable
    try {
      const { error } = await supabase.from('stock_holdings').select('id').limit(1)
      const ok = !error || error.code !== '42P01'
      set({ dbAvailable: ok })
      return ok
    } catch { set({ dbAvailable: false }); return false }
  },

  loadMarket: async (userId) => {
    const ok = await get()._checkDB()
    if (!ok) return
    set({ loading: true })
    try {
      const [profilesRes, holdingsRes, shortsRes, limitsRes] = await Promise.all([
        supabase.from('arena_profiles').select('*').order('elo', { ascending: false }).limit(50),
        userId ? supabase.from('stock_holdings').select('*').eq('owner_id', userId) : { data: [] },
        userId ? supabase.from('short_positions').select('*').eq('status', 'open') : { data: [] },
        userId ? supabase.from('limit_orders').select('*').eq('user_id', userId).eq('status', 'pending') : { data: [] },
      ])

      const profiles = (profilesRes.data || []).map(p => ({
        ...p,
        price: calcPlayerPrice(p),
        totalShares: TOTAL_SHARES,
      }))

      set({
        players: profiles,
        myHoldings: holdingsRes.data || [],
        myShorts: (shortsRes.data || []).filter(s => s.shorter_id === userId),
        allShorts: shortsRes.data || [],
        myLimitOrders: limitsRes.data || [],
        loading: false,
        lastLoaded: Date.now(),
      })

      // Check limit orders after loading fresh prices
      if (userId) get()._checkLimitOrders(userId, profiles)
    } catch { set({ loading: false }) }
  },

  buyShares: async (userId, subjectId, shares) => {
    const player = get().players.find(p => p.user_id === subjectId)
    if (!player) return { error: 'Player not found' }

    const cost = shares * player.price
    const fee  = Math.ceil(cost * FEE_RATE)
    const total = cost + fee

    const store = useCoinStore.getState()
    if (store.coins < total) return { error: 'Insufficient coins' }

    // Check available shares (TOTAL - all non-short holdings by others)
    const { data: existingHoldings } = await supabase
      .from('stock_holdings').select('shares').eq('subject_id', subjectId)
    const heldByOthers = (existingHoldings || []).reduce((s, h) => s + h.shares, 0)
    const available = TOTAL_SHARES - 200 - heldByOthers // 200 founder shares
    if (shares > available) return { error: `Only ${Math.max(0, available)} shares available` }

    const existing = get().myHoldings.find(h => h.subject_id === subjectId)
    const currentShares = existing?.shares || 0
    if (currentShares + shares > MAX_SHARES && subjectId !== userId) {
      return { error: `Max ${MAX_SHARES} shares per player` }
    }

    try {
      if (existing) {
        const newAvg = Math.round((existing.avg_cost * existing.shares + cost) / (existing.shares + shares))
        await supabase.from('stock_holdings').update({ shares: existing.shares + shares, avg_cost: newAvg, updated_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        await supabase.from('stock_holdings').insert({ owner_id: userId, subject_id: subjectId, shares, avg_cost: player.price })
      }
      store.spendCoins(total, `Bought ${shares} shares of @${player.display_name} + fee`)
      await get().loadMarket(userId)
      return { ok: true, cost: total }
    } catch (e) { return { error: e.message } }
  },

  sellShares: async (userId, subjectId, shares) => {
    const player  = get().players.find(p => p.user_id === subjectId)
    const holding = get().myHoldings.find(h => h.subject_id === subjectId)
    if (!player || !holding) return { error: 'No holding found' }
    if (holding.shares < shares) return { error: 'Not enough shares' }

    const proceeds = shares * player.price
    const fee = Math.ceil(proceeds * FEE_RATE)
    const net = proceeds - fee

    try {
      if (holding.shares === shares) {
        await supabase.from('stock_holdings').delete().eq('id', holding.id)
      } else {
        await supabase.from('stock_holdings').update({ shares: holding.shares - shares, updated_at: new Date().toISOString() }).eq('id', holding.id)
      }
      useCoinStore.getState().earnCoins(net, `Sold ${shares} shares of @${player.display_name}`)
      await get().loadMarket(userId)
      return { ok: true, net }
    } catch (e) { return { error: e.message } }
  },

  buyback: async (userId, shares) => {
    return get().buyShares(userId, userId, shares)
  },

  shortSell: async (userId, subjectId, shares) => {
    const player = get().players.find(p => p.user_id === subjectId)
    if (!player) return { error: 'Player not found' }
    if (subjectId === userId) return { error: "Can't short yourself" }

    const borrowValue  = shares * player.price
    const collateral   = Math.ceil(borrowValue * COLLATERAL)

    if (useCoinStore.getState().coins < collateral)
      return { error: `Need ₳${collateral} collateral` }

    try {
      await supabase.from('short_positions').insert({
        shorter_id: userId, subject_id: subjectId,
        shares, borrow_price: player.price, collateral_locked: collateral,
      })
      useCoinStore.getState().spendCoins(collateral, `Short collateral: @${player.display_name}`)
      // Credit borrow proceeds
      useCoinStore.getState().earnCoins(borrowValue, `Short sale proceeds: @${player.display_name}`)
      await get().loadMarket(userId)
      return { ok: true }
    } catch (e) { return { error: e.message } }
  },

  coverShort: async (userId, positionId) => {
    const pos = get().myShorts.find(s => s.id === positionId)
    if (!pos) return { error: 'Position not found' }

    const player = get().players.find(p => p.user_id === pos.subject_id)
    const currentPrice = player?.price || pos.borrow_price
    const coverCost = pos.shares * currentPrice
    const fee = Math.ceil(coverCost * FEE_RATE)

    if (useCoinStore.getState().coins < coverCost + fee)
      return { error: 'Insufficient coins to cover' }

    const pnl = (pos.borrow_price - currentPrice) * pos.shares - fee

    try {
      await supabase.from('short_positions').update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        pnl,
      }).eq('id', positionId)

      useCoinStore.getState().spendCoins(coverCost + fee, `Cover short: @${player?.display_name}`)
      // Return collateral
      useCoinStore.getState().earnCoins(pos.collateral_locked, `Short collateral returned`)
      if (pnl > 0) useCoinStore.getState().earnCoins(pnl, `Short profit: @${player?.display_name}`)

      await get().loadMarket(userId)
      return { ok: true, pnl }
    } catch (e) { return { error: e.message } }
  },

  setLimitOrder: async (userId, subjectId, type, shares, targetPrice) => {
    const player = get().players.find(p => p.user_id === subjectId)
    if (!player) return { error: 'Player not found' }
    const coinsReserved = type === 'buy' ? shares * targetPrice : 0

    if (type === 'buy' && useCoinStore.getState().coins < coinsReserved)
      return { error: 'Insufficient coins to reserve' }

    try {
      await supabase.from('limit_orders').insert({
        user_id: userId, subject_id: subjectId,
        order_type: type, shares, target_price: targetPrice,
        coins_reserved: coinsReserved,
      })
      if (type === 'buy') useCoinStore.getState().spendCoins(coinsReserved, `Limit order reserved: @${player.display_name}`)
      await get().loadMarket(userId)
      return { ok: true }
    } catch (e) { return { error: e.message } }
  },

  cancelLimitOrder: async (userId, orderId) => {
    const order = get().myLimitOrders.find(o => o.id === orderId)
    if (!order) return
    try {
      await supabase.from('limit_orders').update({ status: 'cancelled' }).eq('id', orderId)
      if (order.coins_reserved > 0)
        useCoinStore.getState().earnCoins(order.coins_reserved, 'Limit order cancelled — refund')
      await get().loadMarket(userId)
    } catch {}
  },

  _checkLimitOrders: async (userId, players) => {
    const orders = get().myLimitOrders
    if (!orders.length) return
    for (const order of orders) {
      const player = players.find(p => p.user_id === order.subject_id)
      if (!player) continue
      const shouldFill = order.order_type === 'buy'
        ? player.price <= order.target_price
        : player.price >= order.target_price
      if (!shouldFill) continue
      // Fill it
      if (order.order_type === 'buy') {
        const holding = get().myHoldings.find(h => h.subject_id === order.subject_id)
        if (holding) {
          await supabase.from('stock_holdings').update({ shares: holding.shares + order.shares, updated_at: new Date().toISOString() }).eq('id', holding.id)
        } else {
          await supabase.from('stock_holdings').insert({ owner_id: userId, subject_id: order.subject_id, shares: order.shares, avg_cost: player.price })
        }
        // Return excess (reserved at target_price, filled at current price)
        const actualCost = order.shares * player.price + Math.ceil(order.shares * player.price * FEE_RATE)
        const refund = Math.max(0, order.coins_reserved - actualCost)
        if (refund > 0) useCoinStore.getState().earnCoins(refund, `Limit order savings: @${player.display_name}`)
      } else {
        // Sell limit
        const holding = get().myHoldings.find(h => h.subject_id === order.subject_id)
        if (holding && holding.shares >= order.shares) {
          const newShares = holding.shares - order.shares
          if (newShares === 0) {
            await supabase.from('stock_holdings').delete().eq('id', holding.id)
          } else {
            await supabase.from('stock_holdings').update({ shares: newShares, updated_at: new Date().toISOString() }).eq('id', holding.id)
          }
          const net = order.shares * player.price - Math.ceil(order.shares * player.price * FEE_RATE)
          useCoinStore.getState().earnCoins(net, `Limit sell filled: @${player.display_name}`)
        }
      }
      await supabase.from('limit_orders').update({ status: 'filled', filled_at: new Date().toISOString() }).eq('id', order.id)
    }
  },

  // Called from Arena after a match ends — refreshes your own price
  syncMyProfile: async (userId) => {
    if (!userId) return
    const { data } = await supabase.from('arena_profiles').select('*').eq('user_id', userId).maybeSingle()
    if (!data) return
    // Just re-load the whole market (prices are calculated client-side from arena_profiles)
    get().loadMarket(userId)
  },

  detectSqueeze: (subjectId) => {
    const { allShorts, players } = get()
    const openShorts = allShorts.filter(s => s.subject_id === subjectId && s.status === 'open')
    if (!openShorts.length) return null
    const player = players.find(p => p.user_id === subjectId)
    if (!player) return null
    const avgBorrowPrice = openShorts.reduce((s, p) => s + p.borrow_price, 0) / openShorts.length
    const priceIncrease = (player.price - avgBorrowPrice) / avgBorrowPrice
    if (priceIncrease > 0.4) return { subjectId, openShorts: openShorts.length, priceIncrease: Math.round(priceIncrease * 100) }
    return null
  },
}))
