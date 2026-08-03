import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()

  const { data: rankings } = await supabase
    .from('daily_rankings')
    .select(`
      market, edge, odds, ev,
      matches:match_id (
        league_id, league_name, status
      )
    `)
    .eq('date', new Date().toISOString().split('T')[0])
    .order('edge', { ascending: false })

  if (!rankings?.length) return NextResponse.json({ leagues: [] })

  // Excluir partidos ya finalizados/aplazados/cancelados/suspendidos — mismo
  // criterio que el dashboard principal (today/route.ts, all-today/route.ts).
  // Sin esto, una value bet de un partido ya jugado seguia apareciendo aca aunque
  // ya no estuviera visible en ningun otro lado del dashboard.
  const INACTIVE_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO', 'PST', 'CANC', 'SUSP', 'ABD', 'INT']

  // Group by league
  const leagueMap: Record<number, any> = {}
  for (const r of rankings) {
    const m = r.matches as any
    if (!m?.league_id) continue
    if (INACTIVE_STATUSES.includes(m.status ?? '')) continue
    if (!leagueMap[m.league_id]) {
      leagueMap[m.league_id] = {
        league_id: m.league_id,
        league_name: m.league_name,
        edges: [],
        odds: [],
        value_bets_count: 0,
      }
    }
    leagueMap[m.league_id].edges.push(r.edge)
    leagueMap[m.league_id].odds.push(r.odds)
    leagueMap[m.league_id].value_bets_count++
  }

  const leagues = Object.values(leagueMap).map((l: any) => ({
    league_id: l.league_id,
    league_name: l.league_name,
    avg_edge: l.edges.reduce((a: number, b: number) => a + b, 0) / l.edges.length,
    avg_odds: l.odds.reduce((a: number, b: number) => a + b, 0) / l.odds.length,
    value_bets_count: l.value_bets_count,
  })).sort((a, b) => b.avg_edge - a.avg_edge)

  return NextResponse.json({ leagues })
}
