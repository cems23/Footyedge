import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { apf } from '@/lib/api/football'
import { runSignalCheck } from '@/lib/ai/signalCheck'
import { isAdminEmail } from '@/lib/permissions'
import { isRadarCompetition } from '@/lib/football/radarCompetitions'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

function form(fixtures: any[], teamId: number) {
  return (fixtures ?? []).slice(0, 5).map((fixture: any) => {
    const isHome = fixture.teams?.home?.id === teamId
    const winner = isHome ? fixture.teams?.home?.winner : fixture.teams?.away?.winner
    return winner === true ? 'V' : winner === false ? 'D' : 'E'
  }).join('')
}

function absences(injuries: any[], teamId: number) {
  const seen = new Set<string>()
  return (injuries ?? []).flatMap((injury: any) => {
    if (injury.team?.id !== teamId || !injury.player?.name) return []
    const key = String(injury.player?.id ?? injury.player.name)
    if (seen.has(key)) return []
    seen.add(key)
    return [{ name: injury.player.name, reason: injury.player?.reason ?? injury.player?.type ?? 'baja reportada' }]
  })
}

function lineup(lineups: any[], teamId: number) {
  const entry = (lineups ?? []).find((item: any) => item.team?.id === teamId)
  return entry?.startXI?.length
    ? { published: true, formation: entry.formation ?? null, players: entry.startXI.slice(0, 11).map((item: any) => item.player?.name).filter(Boolean) }
    : { published: false, formation: null, players: [] as string[] }
}

async function provider<T>(request: Promise<T>) {
  try { return { value: await request, available: true } }
  catch { return { value: [] as unknown as T, available: false } }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const matchIds = Array.isArray(body.matchIds)
    ? Array.from(new Set<string>(body.matchIds.filter((id: unknown): id is string => typeof id === 'string')))
    : []
  if (!matchIds.length || matchIds.length > 5) {
    return NextResponse.json({ error: 'Selecciona entre 1 y 5 partidos.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: account } = await service.from('users').select('plan,email').eq('id', user.id).single()
  const allowed = account?.plan === 'pro' || account?.plan === 'elite' || isAdminEmail(account?.email ?? user.email)
  if (!allowed) return NextResponse.json({ error: 'RADAR_PRO_REQUIRED' }, { status: 403 })

  const now = new Date().toISOString()
  const { data: matches, error } = await service
    .from('matches')
    .select('id,external_id,league_id,league_name,season,kickoff_at,home_team_id,away_team_id,home_team_name,away_team_name,model_predictions(prob_home_win,prob_away_win,prob_over25)')
    .in('id', matchIds)
    .gt('kickoff_at', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const approved = (matches ?? []).filter((match: any) => isRadarCompetition(match.league_id) && match.external_id)
  if (!approved.length) return NextResponse.json({ error: 'Los partidos deben ser próximos y pertenecer a las ligas del radar.' }, { status: 422 })

  const { data: snapshots } = await service
    .from('odds_snapshots')
    .select('match_id,odds_home,odds_away,odds_over25,captured_at')
    .in('match_id', approved.map((match: any) => match.id))
    .order('captured_at', { ascending: false })
  const oddsByMatch = new Map<string, any>()
  for (const snapshot of snapshots ?? []) if (!oddsByMatch.has(snapshot.match_id)) oddsByMatch.set(snapshot.match_id, snapshot)

  const analyze = async (match: any) => {
    const prediction = Array.isArray(match.model_predictions) ? match.model_predictions[0] : match.model_predictions
    const odds = oddsByMatch.get(match.id)
    const markets = [
      { key: 'home', label: `Victoria ${match.home_team_name}`, probability: prediction?.prob_home_win, odds: odds?.odds_home },
      { key: 'away', label: `Victoria ${match.away_team_name}`, probability: prediction?.prob_away_win, odds: odds?.odds_away },
      { key: 'over25', label: 'Más de 2.5 goles', probability: prediction?.prob_over25, odds: odds?.odds_over25 },
    ].filter((market: any) => Number(market.probability) > 0 && Number(market.odds) > 1)
      .map((market: any) => ({ ...market, ev: market.probability * market.odds - 1 }))
      .sort((a: any, b: any) => b.ev - a.ev)
    const market = markets[0]
    if (!market) return { matchId: match.id, status: 'unavailable', reason: 'No hay cuota verificable para evaluar valor.' }

    const [injuriesResult, lineupsResult, homeFormResult, awayFormResult] = await Promise.all([
      provider(apf<any[]>('/injuries', { fixture: match.external_id })),
      provider(apf<any[]>('/fixtures/lineups', { fixture: match.external_id })),
      provider(apf<any[]>('/fixtures', { team: match.home_team_id, league: match.league_id, season: match.season, last: 5 })),
      provider(apf<any[]>('/fixtures', { team: match.away_team_id, league: match.league_id, season: match.season, last: 5 })),
    ])
    const providerData = {
      retrieved_at: new Date().toISOString(),
      api_football: { injuries_available: injuriesResult.available, lineups_available: lineupsResult.available, home_form_available: homeFormResult.available, away_form_available: awayFormResult.available },
      home: { team: match.home_team_name, absences: absences(injuriesResult.value, match.home_team_id), lineup: lineup(lineupsResult.value, match.home_team_id), form_last_5: form(homeFormResult.value, match.home_team_id) },
      away: { team: match.away_team_name, absences: absences(injuriesResult.value, match.away_team_id), lineup: lineup(lineupsResult.value, match.away_team_id), form_last_5: form(awayFormResult.value, match.away_team_id) },
    }
    const intelligence = await runSignalCheck({
      matchId: match.id, market: market.key, modelProb: market.probability,
      homeTeam: match.home_team_name, awayTeam: match.away_team_name,
      formHome: providerData.home.form_last_5, formAway: providerData.away.form_last_5,
      goalsForHome: null, goalsAgainstHome: null, goalsForAway: null, goalsAgainstAway: null,
      injuriesHome: providerData.home.absences.map((item) => `${item.name} (${item.reason})`).join(', '),
      injuriesAway: providerData.away.absences.map((item) => `${item.name} (${item.reason})`).join(', '),
      h2hSummary: '', providerData,
      providerFingerprint: JSON.stringify({ ...providerData, retrieved_at: undefined, market: market.key, probability: market.probability, odds: market.odds }),
    })
    return {
      matchId: match.id, status: intelligence.rejected ? 'rejected' : 'reviewed',
      match: { home: match.home_team_name, away: match.away_team_name, league: match.league_name, kickoffAt: match.kickoff_at },
      pick: { market: market.label, probability: market.probability, odds: market.odds, ev: market.ev, adjustedConfidence: Math.max(0, Math.round(100 - intelligence.confidencePenalty + intelligence.adjustment)) },
      context: intelligence.context, reason: intelligence.reason, sources: [], cached: intelligence.cached,
    }
  }

  const results: any[] = []
  for (let index = 0; index < approved.length; index += 2) results.push(...await Promise.all(approved.slice(index, index + 2).map(analyze)))
  return NextResponse.json({ results })
}
