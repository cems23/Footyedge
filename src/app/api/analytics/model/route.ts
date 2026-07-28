import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 25/07/2026: fix del bug de doble conteo de ventaja local en Home. Los datos
  // de antes mezclan errores ya corregidos con el modelo actual — no es
  // comparable, así que el widget de cara al usuario solo cuenta desde acá.
  // El histórico completo sigue disponible en /admin para análisis interno.
  const MODEL_CUTOFF = '2026-07-25'

  const { data: allRecords } = await supabase
    .from('model_performance')
    .select('*')
    .order('match_date', { ascending: false })

  const records = (allRecords ?? []).filter(r => r.match_date >= MODEL_CUTOFF)

  // BTTS "señal del día" (probability_picks) — no pasan por el filtro de edge/EV,
  // asi que no tienen cuota guardada. Se miden aparte por winRate, sin ROI.
  const { data: probRecords } = await supabase
    .from('probability_picks')
    .select('result')
    .eq('market', 'btts')
    .gte('date', MODEL_CUTOFF)
    .not('result', 'is', null)

  const probTotal = probRecords?.length ?? 0
  const probWins = probRecords?.filter(r => r.result === 'win').length ?? 0
  const probabilityPicks = probTotal > 0
    ? { market: 'btts_signal', total: probTotal, wins: probWins, winRate: +((probWins / probTotal) * 100).toFixed(1) }
    : null

  if (!records?.length) {
    return NextResponse.json({ hasData: !!probabilityPicks, metrics: probabilityPicks ? { total: 0, wins: 0, losses: 0, winRate: 0, roi: 0, profit: 0, avgOdds: 0, avgEv: 0, byMarket: [], byLeague: [], equityCurve: [], last10: [], probabilityPicks } : null })
  }

  const total = records.length
  const wins = records.filter(r => r.result === 'win').length
  const losses = records.filter(r => r.result === 'loss').length
  const last10 = records.slice(0, 10).map(r => (r.result === 'win' ? 'win' : 'loss'))
  const profit = records.reduce((s, r) => s + (r.profit ?? 0), 0)
  const roi = total > 0 ? (profit / total) * 100 : 0
  const winRate = total > 0 ? (wins / total) * 100 : 0
  const avgOdds = records.reduce((s, r) => s + (r.odds ?? 0), 0) / total
  const avgEv = records.reduce((s, r) => s + (r.ev ?? 0), 0) / total

  // Por mercado
  const markets = ['btts', 'over25', 'over15', 'home', 'away', 'draw']
  const byMarket = markets.map(market => {
    const m = records.filter(r => r.market === market)
    if (!m.length) return null
    const mWins = m.filter(r => r.result === 'win').length
    const mProfit = m.reduce((s, r) => s + (r.profit ?? 0), 0)
    return {
      market,
      total: m.length,
      wins: mWins,
      winRate: (mWins / m.length) * 100,
      roi: (mProfit / m.length) * 100,
      profit: mProfit,
    }
  }).filter(Boolean)

  // Por liga
  const leagueMap: Record<string, any> = {}
  for (const r of records) {
    if (!r.league) continue
    if (!leagueMap[r.league]) leagueMap[r.league] = { league: r.league, total: 0, wins: 0, profit: 0 }
    leagueMap[r.league].total++
    if (r.result === 'win') leagueMap[r.league].wins++
    leagueMap[r.league].profit += r.profit ?? 0
  }
  const byLeague = Object.values(leagueMap)
    .map((l: any) => ({ ...l, winRate: (l.wins / l.total) * 100, roi: (l.profit / l.total) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Equity curve (profit acumulado por dia)
  const byDate: Record<string, number> = {}
  for (const r of [...records].reverse()) {
    const d = r.match_date
    if (!byDate[d]) byDate[d] = 0
    byDate[d] += r.profit ?? 0
  }
  let cumulative = 0
  const equityCurve = Object.entries(byDate).map(([date, p]) => {
    cumulative += p
    return { date, profit: +cumulative.toFixed(2) }
  })

  return NextResponse.json({
    hasData: true,
    metrics: {
      total,
      wins,
      losses,
      winRate: +winRate.toFixed(1),
      roi: +roi.toFixed(1),
      profit: +profit.toFixed(2),
      avgOdds: +avgOdds.toFixed(2),
      avgEv: +avgEv.toFixed(3),
      byMarket,
      byLeague,
      equityCurve,
      last10,
      probabilityPicks,
    }
  })
}
