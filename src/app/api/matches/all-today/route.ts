import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFootyStatsToday, findFootyStatsMatch } from '@/lib/api/footystats'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const { data: matches } = await supabase
    .from('matches')
    .select('*, model_predictions(*)')
    .gte('kickoff_at', today + 'T00:00:00')
    .lt('kickoff_at', today + 'T23:59:59')
    .order('kickoff_at', { ascending: true })

  if (!matches?.length) return NextResponse.json({ matches: [], btts: [], over15: [], over25: [], total: 0 })

  // Fetch odds separately
  const matchIds = matches.map((m: any) => m.id)
  const { data: oddsData } = await supabase
    .from('odds_snapshots')
    .select('match_id, odds_over25, odds_home, odds_away')
    .in('match_id', matchIds)
  const oddsMap: Record<string, any> = {}
  for (const o of oddsData ?? []) oddsMap[o.match_id] = o

  // Cargar FootyStats una sola vez para todos los partidos
  const fsMatches = await getFootyStatsToday()

  const enriched = matches.map((m: any) => {
    const pred = m.model_predictions?.[0]
    if (!pred) return null
    const lH = pred.expected_goals_home ?? 0
    const lA = pred.expected_goals_away ?? 0
    const lT = lH + lA
    const prob_over15 = 1 - Math.exp(-lT) * (1 + lT)
    return {
      id: m.id,
      home_team_name: m.home_team_name,
      away_team_name: m.away_team_name,
      home_team_logo: m.home_team_logo,
      away_team_logo: m.away_team_logo,
      league_name: m.league_name,
      kickoff_at: m.kickoff_at,
      prob_btts: pred.prob_btts,
      prob_over15: +prob_over15.toFixed(4),
      prob_over25: pred.prob_over25,
      prob_home_win: pred.prob_home_win,
      prob_draw: pred.prob_draw,
      prob_away_win: pred.prob_away_win,
      expected_goals_home: lH,
      expected_goals_away: lA,
      home_goals: m.home_goals,
      away_goals: m.away_goals,
      status: m.status,
      league_id: m.league_id,
      odds_over25: oddsMap[m.id]?.odds_over25 ?? null,
      odds_home: oddsMap[m.id]?.odds_home ?? null,
      odds_away: oddsMap[m.id]?.odds_away ?? null,
      // FootyStats enrichment
      ...(() => {
        const fs = findFootyStatsMatch(fsMatches, m.home_team_name, m.away_team_name)
        if (!fs) return {}
        return {
          corners_potential: fs.corners_potential ?? null,
          corners_o85_potential: fs.corners_o85_potential ?? null,
          corners_o95_potential: fs.corners_o95_potential ?? null,
          corners_o105_potential: fs.corners_o105_potential ?? null,
          odds_corners_over_85: fs.odds_corners_over_85 ?? null,
          odds_corners_over_95: fs.odds_corners_over_95 ?? null,
          odds_corners_over_105: fs.odds_corners_over_105 ?? null,
          o15HT_potential: fs.o15HT_potential ?? null,
          o05HT_potential: fs.o05HT_potential ?? null,
          odds_1st_half_over05: fs.odds_1st_half_over05 ?? null,
          odds_1st_half_over15: fs.odds_1st_half_over15 ?? null,
          odds_1st_half_over25: fs.odds_1st_half_over25 ?? null,
          odds_doublechance_1x: fs.odds_doublechance_1x ?? null,
          odds_doublechance_x2: fs.odds_doublechance_x2 ?? null,
          odds_doublechance_12: fs.odds_doublechance_12 ?? null,
        }
      })(),
    }
  }).filter(Boolean)

  const liveStatuses = ['1H','2H','HT','ET','P','BT']
  const doneStatuses = ['FT','AET','PEN','AWD','WO','PST','CANC','SUSP','ABD','INT']

  const sortByStatus = (arr: any[]) => {
    const live = arr.filter(m => liveStatuses.includes(m.status ?? ''))
    const scheduled = arr.filter(m => !liveStatuses.includes(m.status ?? '') && !doneStatuses.includes(m.status ?? ''))
    const done = arr.filter(m => doneStatuses.includes(m.status ?? ''))
    return [...live, ...scheduled, ...done]
  }

  const sorted = sortByStatus(enriched.filter(Boolean))

  const active = [...enriched].filter(Boolean).filter((m: any) => !doneStatuses.includes(m.status ?? ''))

  return NextResponse.json({
    total: sorted.length,
    matches: sorted,
    btts:    [...active].filter((m: any) => m.prob_btts != null).sort((a: any, b: any) => b.prob_btts - a.prob_btts).slice(0, 15),
    over15:  [...active].filter((m: any) => m.prob_over15 != null).sort((a: any, b: any) => b.prob_over15 - a.prob_over15).slice(0, 15),
    over25:  [...active].filter((m: any) => m.prob_over25 != null).sort((a: any, b: any) => b.prob_over25 - a.prob_over25).slice(0, 15),
    corners: [...active].filter((m: any) => m.corners_potential != null).sort((a: any, b: any) => (b.corners_potential ?? 0) - (a.corners_potential ?? 0)).slice(0, 10),
    firsthalf: [...active].filter((m: any) => m.o15HT_potential != null).sort((a: any, b: any) => (b.o15HT_potential ?? 0) - (a.o15HT_potential ?? 0)).slice(0, 10),
    doublechance: [...active].filter((m: any) => m.odds_doublechance_1x != null).sort((a: any, b: any) => (a.odds_doublechance_1x ?? 99) - (b.odds_doublechance_1x ?? 99)).slice(0, 10),
  })
}
