import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLeagueRankings, type RawMatch } from '@/lib/math/teamStats'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)

  const leagueId = searchParams.get('leagueId')
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId es requerido' }, { status: 400 })
  }
  const matchLimit = Math.min(parseInt(searchParams.get('matchLimit') ?? '10'), 20)

  const { data: { user } } = await supabase.auth.getUser()
  const isPro = user ? await (async () => {
    const { data } = await supabase.from('users').select('plan').eq('id', user.id).single()
    return data?.plan === 'pro' || data?.plan === 'elite'
  })() : false

  // Usar solo la temporada MÁS RECIENTE de esta liga (no mezclar con temporadas
  // anteriores ya terminadas — ej. no mostrar la 2025-26 como si fuera "forma actual"
  // cuando la 2026-27 todavía no empieza). Se detecta dinámicamente por liga.
  const { data: seasonRow } = await supabase
    .from('matches')
    .select('season')
    .eq('league_id', parseInt(leagueId))
    .eq('status', 'FT')
    .not('season', 'is', null)
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestSeason = seasonRow?.season

  let query = supabase
    .from('matches')
    .select('home_team_name, away_team_name, home_goals, away_goals, result, over25_result, btts_result, kickoff_at')
    .eq('league_id', parseInt(leagueId))
    .eq('status', 'FT')
    .not('home_goals', 'is', null)
    .order('kickoff_at', { ascending: false })
    .limit(2000)

  if (latestSeason != null) {
    query = query.eq('season', latestSeason)
  }

  if (!isPro) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    query = query.gte('kickoff_at', cutoff.toISOString())
  }

  const { data: matches, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rankings = buildLeagueRankings((matches ?? []) as RawMatch[], matchLimit)

  return NextResponse.json({
    leagueId: parseInt(leagueId),
    season: latestSeason,
    matchLimit,
    isPro,
    teamCount: rankings.length,
    rankings,
  })
}
