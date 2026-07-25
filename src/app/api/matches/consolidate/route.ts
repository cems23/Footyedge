import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow authenticated admin users too
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: userData } = await supabase.from('users').select('email').eq('id', user.id).single()
    const adminEmails = ['admin@footyedge.com', 'carlosmartens8@gmail.com']
    if (!adminEmails.includes(userData?.email || '')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Leer staging
  const { data: staging } = await supabase
    .from('staging_rankings')
    .select('*')
    .eq('date', today)
    .order('rank_score', { ascending: false })

  if (!staging?.length) {
    return NextResponse.json({ success: false, message: 'No rankings found' })
  }

  // Obtener predicciones y odds actuales para recalcular EV
  const matchIds = Array.from(new Set(staging.map((r: any) => r.match_id)))
  const [{ data: preds }, { data: snaps }, { data: todayMatches }] = await Promise.all([
    supabase.from('model_predictions').select('match_id,prob_home_win,prob_draw,prob_away_win,prob_over25,prob_btts').in('match_id', matchIds),
    supabase.from('odds_snapshots').select('match_id,odds_home,odds_draw,odds_away,odds_over25').in('match_id', matchIds),
    supabase.from('matches').select('id,kickoff_at').in('id', matchIds)
      .gte('kickoff_at', today + 'T00:00:00.000Z')
      .lt('kickoff_at', new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0] + 'T00:00:00.000Z'),
  ])
  const todayMatchIds = new Set((todayMatches ?? []).map((m: any) => m.id))

  const predMap = Object.fromEntries((preds ?? []).map(p => [p.match_id, p]))
  const snapMap = Object.fromEntries((snaps ?? []).map(s => [s.match_id, s]))

  const recalcEV = (r: any) => {
    const pred = predMap[r.match_id]
    const snap = snapMap[r.match_id]
    if (!pred) return { ev: r.ev, edge: r.edge, odds: r.odds }
    const probMap: Record<string, number> = {
      home: pred.prob_home_win, away: pred.prob_away_win,
      draw: pred.prob_draw, over25: pred.prob_over25, btts: pred.prob_btts,
    }
    const oddsMap: Record<string, number | null> = snap ? {
      home: snap.odds_home, away: snap.odds_away,
      draw: snap.odds_draw, over25: snap.odds_over25,
    } : {}
    const prob = probMap[r.market]
    const odds = oddsMap[r.market] || r.odds
    if (!prob || !odds || odds <= 1) return { ev: r.ev, edge: r.edge, odds: r.odds }
    return { ev: prob * odds - 1, edge: prob - (1 / odds), odds }
  }

  // Deduplicar, recalcular y filtrar EVs negativos y sin odds reales
  const seen = new Set<string>()
  const unique = staging
    .map(r => ({ ...r, ...recalcEV(r) }))
    .filter(r => {
      // Solo partidos de hoy
      if (!todayMatchIds.has(r.match_id)) return false
      const snap = snapMap[r.match_id]
      // Requiere odds reales del mercado para ser value bet válida
      if (!snap || (!snap.odds_home && !snap.odds_over25)) return false
      return r.ev > 0.08 && r.edge > 0.08
    })
    .filter(r => {
      const key = `${r.match_id}_${r.market}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.ev * b.confidence_score - a.ev * a.confidence_score)

  // Una sola value bet por partido (la de mejor calidad) — evita que un mismo
  // partido con valor en varios mercados infle el conteo y se sienta repetido.
  const seenMatch = new Set<string>()
  const onePerMatch = unique.filter(r => {
    if (seenMatch.has(r.match_id)) return false
    seenMatch.add(r.match_id)
    return true
  })

  const top30 = onePerMatch.slice(0, 30)

  // Limpiar daily_rankings de hoy y reescribir
  await supabase.from('daily_rankings').delete().eq('date', today)

  for (let i = 0; i < top30.length; i++) {
    const r = top30[i]
    await supabase.from('daily_rankings').insert({
      date:             today,
      rank:             i + 1,
      match_id:         r.match_id,
      market:           r.market,
      market_label:     r.market_label,
      odds:             r.odds,
      ev:               r.ev,
      edge:             r.edge,
      confidence_score: r.confidence_score,
      rank_score:       r.rank_score,
      is_pro_only:      i >= 10,
    })
  }

  return NextResponse.json({ success: true, top5: top30.length, rankings: top30.map((r, i) => ({
    rank: i + 1,
    match_id: r.match_id,
    market: r.market,
    rank_score: r.rank_score,
  }))})
}
