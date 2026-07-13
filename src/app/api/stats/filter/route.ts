import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLeagueRankings, type RawMatch, type TeamRanking } from '@/lib/math/teamStats'

export const dynamic = 'force-dynamic'

type Market = 'over05' | 'over15' | 'over25' | 'over35' | 'btts'
const MARKET_KEY: Record<Market, keyof TeamRanking['total']> = {
  over05: 'over05Pct',
  over15: 'over15Pct',
  over25: 'over25Pct',
  over35: 'over35Pct',
  btts: 'bttsPct',
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)

  const market = (searchParams.get('market') ?? 'over25') as Market
  const minPct = Math.min(Math.max(parseFloat(searchParams.get('minPct') ?? '70'), 0), 100)
  const appliesTo = (searchParams.get('appliesTo') ?? 'both') as 'both' | 'either'
  const leagueIdsParam = searchParams.get('leagueIds')

  if (!MARKET_KEY[market]) {
    return NextResponse.json({ error: 'market inválido' }, { status: 400 })
  }

  const defaultLeagues = [39, 40, 140, 141, 135, 136, 78, 79, 61, 62, 88]
  const leagueIds = leagueIdsParam
    ? leagueIdsParam.split(',').map(s => parseInt(s.trim())).filter(Boolean)
    : defaultLeagues

  // 1. Próximos partidos (no jugados) en esas ligas
  const now = new Date().toISOString()
  const { data: upcoming, error: upcomingErr } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, league_id, league_name, kickoff_at, home_team_logo, away_team_logo')
    .in('league_id', leagueIds)
    .gte('kickoff_at', now)
    .order('kickoff_at', { ascending: true })
    .limit(200)

  if (upcomingErr) return NextResponse.json({ error: upcomingErr.message }, { status: 500 })
  if (!upcoming || upcoming.length === 0) {
    return NextResponse.json({ market, minPct, appliesTo, count: 0, matches: [] })
  }

  // 2. Histórico por liga para construir rankings de equipos
  const rankingsByLeague = new Map<number, Map<string, TeamRanking>>()
  for (const leagueId of leagueIds) {
    const { data: historical } = await supabase
      .from('matches')
      .select('home_team_name, away_team_name, home_goals, away_goals, result, over25_result, btts_result, kickoff_at')
      .eq('league_id', leagueId)
      .eq('status', 'FT')
      .not('home_goals', 'is', null)
      .order('kickoff_at', { ascending: false })
      .limit(1000)

    const rankings = buildLeagueRankings((historical ?? []) as RawMatch[], 10)
    const byTeam = new Map<string, TeamRanking>()
    for (const r of rankings) byTeam.set(r.team, r)
    rankingsByLeague.set(leagueId, byTeam)
  }

  // 3. Filtrar próximos partidos según criterio
  const key = MARKET_KEY[market]
  const matched = upcoming.filter(m => {
    const byTeam = rankingsByLeague.get(m.league_id)
    if (!byTeam) return false
    const home = byTeam.get(m.home_team_name)
    const away = byTeam.get(m.away_team_name)
    if (!home || !away) return false

    const homeVal = home.total[key] as number
    const awayVal = away.total[key] as number

    if (appliesTo === 'both') return homeVal >= minPct && awayVal >= minPct
    return homeVal >= minPct || awayVal >= minPct
  }).map(m => {
    const byTeam = rankingsByLeague.get(m.league_id)!
    const home = byTeam.get(m.home_team_name)!
    const away = byTeam.get(m.away_team_name)!
    return {
      ...m,
      homeStat: home.total[key],
      awayStat: away.total[key],
    }
  })

  return NextResponse.json({
    market,
    minPct,
    appliesTo,
    count: matched.length,
    matches: matched,
  })
}
