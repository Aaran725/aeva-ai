import { create } from 'zustand'
import { supabase } from './supabase'

/*
  Requires two Supabase tables. Run this SQL in your Supabase dashboard:

  CREATE TABLE IF NOT EXISTS coin_syndicates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    leader_id TEXT NOT NULL,
    member_ids TEXT[] DEFAULT '{}',
    pool_balance INTEGER DEFAULT 0,
    season_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS syndicate_check_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    syndicate_id UUID REFERENCES coin_syndicates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    check_in_date DATE DEFAULT CURRENT_DATE,
    arena_accuracy INTEGER DEFAULT 0,
    coins_contributed INTEGER DEFAULT 0,
    UNIQUE(syndicate_id, user_id, check_in_date)
  );

  ALTER TABLE coin_syndicates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE syndicate_check_ins ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "read_all" ON coin_syndicates FOR SELECT USING (true);
  CREATE POLICY "insert_own" ON coin_syndicates FOR INSERT WITH CHECK (true);
  CREATE POLICY "update_members" ON coin_syndicates FOR UPDATE USING (true);
  CREATE POLICY "read_checkins" ON syndicate_check_ins FOR SELECT USING (true);
  CREATE POLICY "insert_checkin" ON syndicate_check_ins FOR INSERT WITH CHECK (true);
*/

function randCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const DEFAULT = {
  syndicate: null,       // { id, code, name, role, memberIds, poolBalance, seasonStart }
  memberCheckIns: [],    // [{ userId, displayName, checkInDate, arenaAccuracy, coinsContributed }]
  loading: false,
  error: null,
  dbAvailable: null,     // null=unknown, true=ok, false=table missing
}

export const useSyndicateStore = create((set, get) => ({
  ...DEFAULT,

  _checkDB: async () => {
    if (get().dbAvailable !== null) return get().dbAvailable
    try {
      const { error } = await supabase.from('coin_syndicates').select('id').limit(1)
      const ok = !error || error.code !== '42P01'
      set({ dbAvailable: ok })
      return ok
    } catch {
      set({ dbAvailable: false })
      return false
    }
  },

  load: async (userId) => {
    if (!userId) return
    const ok = await get()._checkDB()
    if (!ok) return
    set({ loading: true })
    try {
      const { data } = await supabase
        .from('coin_syndicates')
        .select('*')
        .contains('member_ids', [userId])
        .maybeSingle()

      if (data) {
        set({
          syndicate: {
            id: data.id,
            code: data.code,
            name: data.name,
            role: data.leader_id === userId ? 'leader' : 'member',
            memberIds: data.member_ids || [],
            poolBalance: data.pool_balance || 0,
            seasonStart: data.season_start,
          },
          loading: false,
        })
        await get().loadCheckIns(data.id)
      } else {
        set({ syndicate: null, loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  loadCheckIns: async (syndicateId) => {
    try {
      const { data } = await supabase
        .from('syndicate_check_ins')
        .select('*')
        .eq('syndicate_id', syndicateId)
        .order('check_in_date', { ascending: false })
      set({ memberCheckIns: data || [] })
    } catch {}
  },

  create: async (userId, displayName, name) => {
    const ok = await get()._checkDB()
    if (!ok) return { error: 'setup_required' }
    const code = randCode()
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('coin_syndicates')
        .insert({ code, name, leader_id: userId, member_ids: [userId] })
        .select()
        .single()
      if (error) throw error
      set({
        syndicate: {
          id: data.id, code: data.code, name: data.name,
          role: 'leader', memberIds: [userId], poolBalance: 0,
          seasonStart: data.season_start,
        },
        loading: false,
      })
      return { code }
    } catch (e) {
      set({ loading: false, error: e.message })
      return { error: e.message }
    }
  },

  join: async (userId, displayName, code) => {
    const ok = await get()._checkDB()
    if (!ok) return { error: 'setup_required' }
    set({ loading: true, error: null })
    try {
      const { data: syn } = await supabase
        .from('coin_syndicates')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .maybeSingle()
      if (!syn) { set({ loading: false, error: 'Code not found' }); return { error: 'Code not found' } }
      if (syn.member_ids?.includes(userId)) {
        set({
          syndicate: { id: syn.id, code: syn.code, name: syn.name, role: syn.leader_id === userId ? 'leader' : 'member', memberIds: syn.member_ids, poolBalance: syn.pool_balance || 0, seasonStart: syn.season_start },
          loading: false,
        })
        return { ok: true }
      }
      if ((syn.member_ids?.length || 0) >= 5) { set({ loading: false, error: 'Syndicate is full (max 5)' }); return { error: 'Full' } }
      const newMembers = [...(syn.member_ids || []), userId]
      await supabase.from('coin_syndicates').update({ member_ids: newMembers }).eq('id', syn.id)
      set({
        syndicate: { id: syn.id, code: syn.code, name: syn.name, role: 'member', memberIds: newMembers, poolBalance: syn.pool_balance || 0, seasonStart: syn.season_start },
        loading: false,
      })
      await get().loadCheckIns(syn.id)
      return { ok: true }
    } catch (e) {
      set({ loading: false, error: e.message })
      return { error: e.message }
    }
  },

  leave: async (userId) => {
    const { syndicate } = get()
    if (!syndicate) return
    try {
      const newMembers = syndicate.memberIds.filter(id => id !== userId)
      if (newMembers.length === 0) {
        await supabase.from('coin_syndicates').delete().eq('id', syndicate.id)
      } else {
        const newLeader = syndicate.role === 'leader' ? newMembers[0] : syndicate.memberIds.find(id => id !== userId && id !== syndicate.leaderId) || newMembers[0]
        await supabase.from('coin_syndicates').update({
          member_ids: newMembers,
          leader_id: syndicate.role === 'leader' ? newLeader : undefined,
        }).eq('id', syndicate.id)
      }
      set({ syndicate: null, memberCheckIns: [] })
    } catch {}
  },

  checkIn: async (userId, displayName, arenaAccuracy, coinsContributed) => {
    const { syndicate } = get()
    if (!syndicate) return false
    try {
      const { error } = await supabase.from('syndicate_check_ins').upsert({
        syndicate_id: syndicate.id,
        user_id: userId,
        display_name: displayName,
        check_in_date: new Date().toISOString().split('T')[0],
        arena_accuracy: Math.round(arenaAccuracy),
        coins_contributed: Math.round(coinsContributed),
      }, { onConflict: 'syndicate_id,user_id,check_in_date' })
      if (!error) await get().loadCheckIns(syndicate.id)
      return !error
    } catch { return false }
  },

  weeklyPayout: () => {
    const { memberCheckIns, syndicate } = get()
    if (!syndicate) return { payout: 0, avgAccuracy: 0 }
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const thisWeek = memberCheckIns.filter(c => new Date(c.check_in_date) >= weekAgo)
    const totalCoins = thisWeek.reduce((s, c) => s + (c.coins_contributed || 0), 0)
    const avgAccuracy = thisWeek.length > 0
      ? Math.round(thisWeek.reduce((s, c) => s + (c.arena_accuracy || 0), 0) / thisWeek.length)
      : 0
    const multiplier = Math.max(0, avgAccuracy / 60)
    return { payout: Math.round(totalCoins * multiplier), avgAccuracy, totalCoins, multiplier }
  },
}))
