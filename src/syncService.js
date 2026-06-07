import { supabase } from './supabase'

let _userId = null
const _timers = {}

export function setCurrentUser(userId) {
  _userId = userId
  // Cancel any pending saves for the previous user
  if (!userId) Object.keys(_timers).forEach(k => clearTimeout(_timers[k]))
}

// Debounced upsert — batches rapid successive writes into one Supabase call
export function scheduleSave(column, value, delay = 1800) {
  if (!_userId) return
  clearTimeout(_timers[column])
  _timers[column] = setTimeout(async () => {
    try {
      await supabase.from('user_data').upsert(
        { user_id: _userId, [column]: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    } catch {}
  }, delay)
}

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

// Called on login. Fetches cloud data and writes it into localStorage so stores re-hydrate.
// If no cloud data exists (new account), migrates existing localStorage up to Supabase.
// Returns the cloud row, or null if this was a migration.
export async function loadAndHydrateUser(userId) {
  setCurrentUser(userId)

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return null

    if (data) {
      // Cloud wins — push into localStorage
      if (Array.isArray(data.sr_cards) && data.sr_cards.length)
        localStorage.setItem('aeva_sr_v1', JSON.stringify(data.sr_cards))
      if (Array.isArray(data.roadmaps) && data.roadmaps.length)
        localStorage.setItem('aeva_roadmaps_v1', JSON.stringify({ roadmaps: data.roadmaps, activeRoadmapId: data.active_roadmap_id || null }))
      if (Array.isArray(data.drill_history) && data.drill_history.length)
        localStorage.setItem('aeva_drill_history_v1', JSON.stringify(data.drill_history))
      if (Array.isArray(data.lab_orders) && data.lab_orders.length)
        localStorage.setItem('aeva_lab_orders_v1', JSON.stringify(data.lab_orders))
      if (data.xp_state && typeof data.xp_state === 'object' && Object.keys(data.xp_state).length)
        localStorage.setItem('aeva_xp_v1', JSON.stringify(data.xp_state))
      return data
    }

    // No cloud data — first login with this account, migrate up from localStorage
    const srCards    = safeGet('aeva_sr_v1', [])
    const rmRaw      = safeGet('aeva_roadmaps_v1', {})
    const history    = safeGet('aeva_drill_history_v1', [])
    const orders     = safeGet('aeva_lab_orders_v1', [])
    const xpState    = safeGet('aeva_xp_v1', {})

    await supabase.from('user_data').upsert({
      user_id: userId,
      sr_cards: srCards,
      roadmaps: rmRaw?.roadmaps || [],
      active_roadmap_id: rmRaw?.activeRoadmapId || null,
      drill_history: history,
      lab_orders: orders,
      xp_state: xpState,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return null
  } catch {
    return null
  }
}
