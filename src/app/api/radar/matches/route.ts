import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/permissions'
import { isRadarCompetition } from '@/lib/football/radarCompetitions'

export const dynamic = 'force-dynamic'

function parseLeagueIds(raw: string | null) {
  if (!raw) return []
  return Array.from(new Set(raw.split(',').map(Number).filter((id) => Number.isInteger(id) && isRadarCompetition(id))))
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueIds = parseLeagueIds(new URL(req.url).searchParams.get('leagueIds'))
  if (!leagueIds.length || leagueIds.length > 50) {
    return NextResponse.json({ error: 'Selecciona al menos una competición válida.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: account } = await service.from('users').select('plan,email').eq('id', user.id).single()
  const allowed = account?.plan === 'pro' || account?.plan === 'elite' || isAdminEmail(account?.email ?? user.email)
  if (!allowed) return NextResponse.json({ error: 'RADAR_PRO_REQUIRED' }, { status: 403 })

  const now = new Date()
  const until = new Date(now)
  until.setDate(until.getDate() + 7)
  const { data: matches, error } = await service
    .from('matches')
    .select('id,external_id,league_id,league_name,home_team_name,away_team_name,home_team_logo,away_team_logo,kickoff_at,status,model_predictions(prob_home_win,prob_away_win,prob_over25)')
    .in('league_id', leagueIds)
    .gt('kickoff_at', now.toISOString())
    .lte('kickoff_at', until.toISOString())
    .order('kickoff_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const upcoming = (matches ?? []).filter((match: any) => match.external_id && (Array.isArray(match.model_predictions)
    ? match.model_predictions.length > 0
    : Boolean(match.model_predictions)))

  return NextResponse.json({ matches: upcoming, windowEndsAt: until.toISOString() })
}
