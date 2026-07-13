import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFootyStatsToday, findFootyStatsMatch } from '@/lib/api/footystats'

const APF = 'https://v3.football.api-sports.io'
const KEY = process.env.API_FOOTBALL_KEY!
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function apf<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(APF + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), { headers: { 'x-apisports-key': KEY } })
  const data = await res.json()
  return data.response as T
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check plan
  const { data: userData } = await supabase.from('users').select('plan').eq('id', user.id).single()
  const isPro = userData?.plan === 'pro' || userData?.plan === 'elite'
  const isElite = userData?.plan === 'elite'
  // Free users can access match page but with limited data
  const plan = userData?.plan ?? 'free'

  const { data: match } = await supabase
    .from('matches')
    .select('*, model_predictions(*)')
    .eq('id', params.id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const { home_team_id, away_team_id, league_id, season, external_id } = match

  // Check cache first (6 hour TTL)
  const cacheKey = external_id
  const SIX_HOURS = 6 * 60 * 60 * 1000
  let cachedData: any = null

  if (cacheKey) {
    const { data: cache } = await supabase
      .from('match_cache')
      .select('data, cached_at')
      .eq('fixture_id', cacheKey)
      .single()
    
    if (cache && (Date.now() - new Date(cache.cached_at).getTime()) < SIX_HOURS) {
      cachedData = cache.data
    }
  }

  let h2h, standings, injuries, form_home, form_away, lineups, fixtureStats, homeSeasonStats, awaySeasonStats

  if (cachedData) {
    ;({ h2h, standings, injuries, form_home, form_away, lineups, fixtureStats, homeSeasonStats, awaySeasonStats } = cachedData)
  } else {
    await sleep(300)
    ;[h2h, standings, injuries, form_home, form_away, lineups, fixtureStats, homeSeasonStats, awaySeasonStats] = await Promise.all([
      apf<any[]>('/fixtures/headtohead', { h2h: `${home_team_id}-${away_team_id}`, last: 10 }),
      apf<any[]>('/standings', { league: league_id, season }),
      apf<any[]>('/injuries', { fixture: external_id }),
      apf<any[]>('/fixtures', { team: home_team_id, league: league_id, season, last: 10 }),
      apf<any[]>('/fixtures', { team: away_team_id, league: league_id, season, last: 10 }),
      apf<any[]>('/fixtures/lineups', { fixture: external_id }),
      apf<any[]>('/fixtures/statistics', { fixture: external_id }),
      apf<any>('/teams/statistics', { team: home_team_id, league: league_id, season }),
      apf<any>('/teams/statistics', { team: away_team_id, league: league_id, season }),
    ])

    // Save to cache
    if (cacheKey) {
      await supabase.from('match_cache').upsert({
        fixture_id: cacheKey,
        data: { h2h, standings, injuries, form_home, form_away, lineups, fixtureStats, homeSeasonStats, awaySeasonStats },
        cached_at: new Date().toISOString(),
      }, { onConflict: 'fixture_id' })
    }
  }

  // Process fixture stats (shots, corners, cards, xG)
  const processTeamStats = (stats: any[], teamId: number) => {
    const teamStats = (stats || []).find((s: any) => s.team?.id === teamId)
    if (!teamStats) return null
    const get = (type: string) => teamStats.statistics?.find((s: any) => s.type === type)?.value ?? null
    return {
      shotsOn: get('Shots on Goal'),
      shotsTotal: get('Total Shots'),
      corners: get('Corner Kicks'),
      fouls: get('Fouls'),
      yellowCards: get('Yellow Cards'),
      redCards: get('Red Cards'),
      possession: get('Ball Possession'),
      passes: get('Total passes'),
      passAccuracy: get('Passes accurate'),
      xg: get('expected_goals'),
    }
  }

  console.log('DEBUG external_id:', external_id)
  console.log('DEBUG fixtureStats length:', (fixtureStats as any[])?.length)
  console.log('DEBUG fixtureStats teams:', (fixtureStats as any[])?.map((s:any) => s.team?.id))
  console.log('DEBUG home_team_id:', home_team_id, 'away_team_id:', away_team_id)

  const matchStats = {
    home: processTeamStats(fixtureStats as any[], home_team_id),
    away: processTeamStats(fixtureStats as any[], away_team_id),
    available: !!(fixtureStats && (fixtureStats as any[]).length > 0),
  }

  // Process season stats
  const processSeasonStats = (stats: any) => {
    if (!stats) return null
    return {
      avgGoalsScored: stats.goals?.for?.average?.total,
      avgGoalsConceded: stats.goals?.against?.average?.total,
      cleanSheets: stats.clean_sheet?.total,
      failedToScore: stats.failed_to_score?.total,
      avgShotsPerGame: stats.shots?.on?.average,
      form: stats.form,
      biggestWin: stats.biggest?.wins?.home || stats.biggest?.wins?.away,
      biggestLoss: stats.biggest?.loses?.home || stats.biggest?.loses?.away,
      xgAvg: stats.goals?.for?.average?.total,
    }
  }

  const seasonStats = {
    home: processSeasonStats(homeSeasonStats),
    away: processSeasonStats(awaySeasonStats),
  }

  const h2hProcessed = (h2h || []).slice(0, 8).map((f: any) => ({
    date: f.fixture?.date,
    home: f.teams?.home?.name,
    away: f.teams?.away?.name,
    homeGoals: f.goals?.home,
    awayGoals: f.goals?.away,
    winner: f.teams?.home?.winner ? 'home' : f.teams?.away?.winner ? 'away' : 'draw',
  }))

  const table = (standings as any)?.[0]?.league?.standings?.[0]?.map((s: any) => ({
    rank: s.rank, team: s.team?.name, logo: s.team?.logo,
    played: s.all?.played, won: s.all?.win, drawn: s.all?.draw, lost: s.all?.lose,
    gf: s.all?.goals?.for, ga: s.all?.goals?.against, points: s.points, form: s.form,
    isHome: s.team?.id === home_team_id, isAway: s.team?.id === away_team_id,
  })) || []

  const injuriesProcessed = (injuries || []).map((i: any) => ({
    player: i.player?.name, photo: i.player?.photo,
    type: i.player?.type, reason: i.player?.reason,
    team: i.team?.name, teamId: i.team?.id,
  }))

  const processForm = (fixtures: any[], teamId: number) => {
    const results = (fixtures || []).slice(0, 10).map((f: any) => {
      const isHome = f.teams?.home?.id === teamId
      const scored = isHome ? f.goals?.home : f.goals?.away
      const conceded = isHome ? f.goals?.away : f.goals?.home
      const won = isHome ? f.teams?.home?.winner : f.teams?.away?.winner
      const draw = !f.teams?.home?.winner && !f.teams?.away?.winner
      return { date: f.fixture?.date, opponent: isHome ? f.teams?.away?.name : f.teams?.home?.name, scored, conceded, result: won ? 'W' : draw ? 'D' : 'L', isHome }
    })
    let unbeaten = 0
    for (const r of results) { if (r.result !== 'L') unbeaten++; else break }
    let scoring = 0
    for (const r of results) { if ((r.scored ?? 0) > 0) scoring++; else break }
    return { results, unbeaten, scoring }
  }

  const homeForm = processForm(form_home || [], home_team_id)
  const awayForm = processForm(form_away || [], away_team_id)

  const scorePredictions: { home: number; away: number; prob: number }[] = []
  const pred = match.model_predictions?.[0]
  if (pred) {
    const lH = pred.expected_goals_home
    const lA = pred.expected_goals_away
    const poissonPMF = (l: number, k: number): number => {
      if (k < 0 || l <= 0) return k === 0 ? 1 : 0
      let logFact = 0
      for (let i = 2; i <= k; i++) logFact += Math.log(i)
      return Math.exp(-l + k * Math.log(l) - logFact)
    }
    for (let h = 0; h <= 5; h++)
      for (let a = 0; a <= 5; a++)
        scorePredictions.push({ home: h, away: a, prob: poissonPMF(lH, h) * poissonPMF(lA, a) })
    scorePredictions.sort((a, b) => b.prob - a.prob)
  }

  // FootyStats enrichment
  let fsData: any = null
  try {
    const fsMatches = await getFootyStatsToday()
    const fs = findFootyStatsMatch(fsMatches, match.home_team_name, match.away_team_name)
    if (fs) fsData = {
      corners_potential: fs.corners_potential ?? null,
      o15HT_potential: fs.o15HT_potential ?? null,
      o05HT_potential: fs.o05HT_potential ?? null,
      odds_corners_over_85: fs.odds_corners_over_85 ?? null,
      odds_corners_over_95: fs.odds_corners_over_95 ?? null,
      odds_corners_over_105: fs.odds_corners_over_105 ?? null,
      odds_1st_half_over05: fs.odds_1st_half_over05 ?? null,
      odds_1st_half_over15: fs.odds_1st_half_over15 ?? null,
      odds_1st_half_over25: fs.odds_1st_half_over25 ?? null,
      odds_doublechance_1x: fs.odds_doublechance_1x ?? null,
      odds_doublechance_x2: fs.odds_doublechance_x2 ?? null,
      odds_doublechance_12: fs.odds_doublechance_12 ?? null,
      btts_potential: fs.btts_potential ?? null,
      o25_potential: fs.o25_potential ?? null,
      o15_potential: fs.o15_potential ?? null,
    }
  } catch {}

  // Process lineups
  const homeLineup = (lineups || []).find((l: any) => l.team?.id === home_team_id)
  const awayLineup = (lineups || []).find((l: any) => l.team?.id === away_team_id)

  const processLineup = (lineup: any) => {
    if (!lineup) return null
    return {
      formation: lineup.formation,
      startXI: (lineup.startXI || []).map((p: any) => ({
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
        grid: p.player?.grid,
      })),
      substitutes: (lineup.substitutes || []).map((p: any) => ({
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
      })),
      coach: lineup.coach?.name,
    }
  }

  // Filter data by plan
  // Free: analysis + standings + lineups only
  // Pro: + h2h + form + injuries + stats + comparator
  // Elite: everything
  return NextResponse.json({
    match,
    plan,
    standings: table,
    lineups: {
      home: processLineup(homeLineup),
      away: processLineup(awayLineup),
      available: !!(homeLineup || awayLineup),
    },
    scorePredictions: scorePredictions.slice(0, 6),
    fsData,
    // Pro+ only
    h2h:        isPro ? h2hProcessed : null,
    injuries:   isPro ? injuriesProcessed : null,
    homeForm:   isPro ? homeForm : null,
    awayForm:   isPro ? awayForm : null,
    matchStats: isPro ? matchStats : null,
    seasonStats:isPro ? seasonStats : null,
  })
}
