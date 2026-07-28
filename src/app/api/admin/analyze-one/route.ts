import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { analyzeMatch } from '@/lib/math/poisson'
import { calcKelly, calcRankScore } from '@/lib/math/metrics'
import { getUpcomingFixtures, getTeamStats, getLeagueStats, getOddsForLeagueById, extractOdds, ACTIVE_LEAGUES, LEAGUE_WEIGHTS } from '@/lib/api/football'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['admin@footyedge.com', 'carlosmartens8@gmail.com']
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('email').eq('id', user.id).single()
  if (!ADMIN_EMAILS.includes(userData?.email || '')) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const leagueId = parseInt(searchParams.get('leagueId') ?? '0')
  const league = ACTIVE_LEAGUES.find(l => l.id === leagueId)
  if (!league) return NextResponse.json({ error: 'Invalid league' }, { status: 400 })

  const supabaseService = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    const fixtures = await getUpcomingFixtures(league.id, league.season)
    if (!fixtures.length) return NextResponse.json({ success: true, league: league.name, valueBets: 0 })

    const oddsMap: Record<number, any> = league.hasOdds ? await getOddsForLeagueById(league.id, league.season) : {}
    const leagueStats = await getLeagueStats(league.id, league.season)
    const valueBets: any[] = []

    for (const fixture of fixtures) {
      try {
        const [homeStats, awayStats] = await Promise.all([
          getTeamStats(fixture.teams.home.id, league.id, league.season, true),
          getTeamStats(fixture.teams.away.id, league.id, league.season, false),
        ])
        const oddsEvent = oddsMap[fixture.fixture.id]
        const odds = (league.hasOdds && oddsEvent) ? extractOdds(oddsEvent, fixture.teams.home.name, fixture.teams.away.name) : {}
        const matchInput = { home: homeStats, away: awayStats, league: leagueStats, leagueId: league.id, ...odds }
        const analysis = analyzeMatch(matchInput)

        const { data: savedMatch } = await supabaseService.from('matches').upsert({
          external_id: String(fixture.fixture.id),
          league_id: fixture.league.id,
          league_name: league.name,
          season: fixture.league.season,
          home_team_id: fixture.teams.home.id, home_team_name: fixture.teams.home.name, home_team_logo: fixture.teams.home.logo,
          away_team_id: fixture.teams.away.id, away_team_name: fixture.teams.away.name, away_team_logo: fixture.teams.away.logo,
          kickoff_at: fixture.fixture.date,
          status: fixture.fixture.status.short,
        }, { onConflict: 'external_id' }).select('id').single()

        if (!savedMatch) continue

        await supabaseService.from('model_predictions').upsert({
          match_id: savedMatch.id,
          prob_home_win: analysis.poisson.probHomeWin,
          prob_draw: analysis.poisson.probDraw,
          prob_away_win: analysis.poisson.probAwayWin,
          prob_over25: analysis.poisson.probOver25,
          prob_btts: analysis.poisson.probBtts,
          expected_goals_home: analysis.poisson.expectedGoalsHome,
          expected_goals_away: analysis.poisson.expectedGoalsAway,
        }, { onConflict: 'match_id' })

        if (league.hasOdds && ((odds as any).oddsHome || (odds as any).oddsOver25)) {
          await supabaseService.from('odds_snapshots').upsert({
            match_id: savedMatch.id,
            odds_home: (odds as any).oddsHome,
            odds_draw: (odds as any).oddsDraw,
            odds_away: (odds as any).oddsAway,
            odds_over25: (odds as any).oddsOver25,
          }, { onConflict: 'match_id' })
        }

        if (league.hasOdds && ((odds as any).oddsHome || (odds as any).oddsOver25)) {
          try {
            await supabaseService.from('odds_history').insert({
              match_id: savedMatch.id,
              odds_home: (odds as any).oddsHome,
              odds_draw: (odds as any).oddsDraw,
              odds_away: (odds as any).oddsAway,
              odds_over25: (odds as any).oddsOver25,
            })
          } catch (e) {
            console.error('odds_history insert failed (non-fatal):', e)
          }
        }

        if (league.hasOdds && ((odds as any).oddsHome || (odds as any).oddsOver25)) {
          try {
            await supabaseService.from('odds_history').insert({
              match_id: savedMatch.id,
              odds_home: (odds as any).oddsHome,
              odds_draw: (odds as any).oddsDraw,
              odds_away: (odds as any).oddsAway,
              odds_over25: (odds as any).oddsOver25,
            })
          } catch (e) {
            console.error('odds_history insert failed (non-fatal):', e)
          }
        }

        const lw = LEAGUE_WEIGHTS[league.id] ?? 0.85
        for (const bet of analysis.valueBets) {
          valueBets.push({
            matchId: savedMatch.id, market: bet.market, marketLabel: bet.label,
            odds: bet.odds, ev: bet.ev, edge: bet.edge, confidence: bet.confidence,
            rankScore: calcRankScore(bet.ev, bet.edge, bet.confidence, lw),
          })
        }
        await sleep(300)
      } catch {}
    }

    await supabaseService.from('staging_rankings').delete().lt('date', today)
    await supabaseService.from('staging_rankings').delete().eq('date', today).in('match_id', valueBets.map(b => b.matchId))
    for (const b of valueBets) {
      await supabaseService.from('staging_rankings').insert({
        date: today, match_id: b.matchId, market: b.market, market_label: b.marketLabel,
        odds: b.odds, ev: b.ev, edge: b.edge, confidence_score: b.confidence, rank_score: b.rankScore,
      })
    }

    return NextResponse.json({ success: true, league: league.name, valueBets: valueBets.length })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
