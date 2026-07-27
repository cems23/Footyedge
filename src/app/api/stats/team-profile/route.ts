import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId')
  const teamName = searchParams.get('teamName')
  if (!teamId || !teamName) return NextResponse.json({ error: 'teamId y teamName son requeridos' }, { status: 400 })

  // Últimos partidos reales del equipo (local o visita), liquidados
  const { data: matches } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id, home_goals, away_goals, btts_result, over25_result, result')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FT')
    .not('home_goals', 'is', null)
    .order('kickoff_at', { ascending: false })
    .limit(10)

  const { data: eloRow } = await supabase
    .from('team_elo')
    .select('elo_rating')
    .eq('team_id', parseInt(teamId))
    .maybeSingle()

  const { data: allElo } = await supabase.from('team_elo').select('elo_rating')

  if (!matches?.length) {
    return NextResponse.json({ hasData: false })
  }

  let goalsFor = 0, goalsAgainst = 0, btts = 0, over25 = 0, wins = 0
  for (const m of matches) {
    const isHome = m.home_team_id === parseInt(teamId)
    goalsFor += isHome ? m.home_goals : m.away_goals
    goalsAgainst += isHome ? m.away_goals : m.home_goals
    if (m.btts_result) btts++
    if (m.over25_result) over25++
    if ((isHome && m.result === 'home') || (!isHome && m.result === 'away')) wins++
  }
  const n = matches.length
  const avgFor = goalsFor / n
  const avgAgainst = goalsAgainst / n

  // Percentil de Elo respecto a todos los equipos trackeados
  const eloRating = eloRow?.elo_rating ?? 1500
  const allRatings = (allElo ?? []).map(e => e.elo_rating)
  const below = allRatings.filter(r => r < eloRating).length
  const eloPercentile = allRatings.length > 1 ? Math.round((below / allRatings.length) * 100) : 50

  return NextResponse.json({
    hasData: true,
    matchesUsed: n,
    profile: {
      elo: eloPercentile,
      attack: Math.min(100, Math.round((avgFor / 3) * 100)),
      defense: Math.min(100, Math.round(100 - (avgAgainst / 3) * 100)),
      btts: Math.round((btts / n) * 100),
      over25: Math.round((over25 / n) * 100),
      form: Math.round((wins / n) * 100),
    },
  })
}
