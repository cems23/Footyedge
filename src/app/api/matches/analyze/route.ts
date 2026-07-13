import { NextRequest, NextResponse } from 'next/server'
import { analyzeMatch } from '@/lib/math/poisson'
import { calcKelly, calcRankScore, getTop5 } from '@/lib/math/metrics'
import {
  getUpcomingFixtures, getTeamStats, getLeagueStats,
  getOddsForLeagueById, extractOdds,
  ACTIVE_LEAGUES, LEAGUE_WEIGHTS,
} from '@/lib/api/football'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const allValueBets: any[] = []
  const log: string[] = []
  const today = new Date().toISOString().split('T')[0]

  // Procesar solo 2 ligas por vez para no exceder rate limit
  for (const league of ACTIVE_LEAGUES) {
    try {
      log.push(`\n📋 ${league.name}`)

      // Pausa entre ligas
      await sleep(3000)

      const [fixtures, oddsEvents] = await Promise.all([
        getUpcomingFixtures(league.id, league.season, 5),
        getOddsForLeagueById(league.id, league.season),
      ])

      log.push(`  ✓ ${fixtures.length} fixtures, ${oddsEvents.length} odds events`)

      // Obtener stats de liga una sola vez
      const leagueStats = await getLeagueStats(league.id, league.season)
      await sleep(1500)

      for (const fixture of fixtures) {
        try {
          // Pausa entre cada partido
          await sleep(2000)

          const homeStats = await getTeamStats(
            fixture.teams.home.id, league.id, league.season, true
          )
          await sleep(1500)

          const awayStats = await getTeamStats(
            fixture.teams.away.id, league.id, league.season, false
          )
          await sleep(1500)

          // Encontrar odds del partido
          // Match by fixture_id — 100% preciso
          const oddsEvent = oddsEvents.find(e => e.fixture_id === fixture.fixture.id)
          const odds = (league.hasOdds && oddsEvent)
            ? extractOdds(oddsEvent, fixture.teams.home.name, fixture.teams.away.name)
            : {}

          const matchInput = {
            home: homeStats,
            away: awayStats,
            league: leagueStats,
            ...odds,
          }

          // Validar que los datos sean reales antes de analizar
          if (homeStats.matchesPlayed < 6 || awayStats.matchesPlayed < 6) {
            log.push(`  ⚠ ${fixture.teams.home.name} vs ${fixture.teams.away.name}: datos insuficientes`)
            continue
          }
          const analysis = analyzeMatch(matchInput)
          // Descartar si los lambdas son irreales
          if (analysis.poisson.expectedGoalsHome < 0.3 || analysis.poisson.expectedGoalsAway < 0.3) {
            log.push(`  ⚠ ${fixture.teams.home.name} vs ${fixture.teams.away.name}: lambda irreal`)
            continue
          }

          // Upsert match en Supabase
          const { data: savedMatch } = await supabase
            .from('matches')
            .upsert({
              external_id:    String(fixture.fixture.id),
              league_id:      fixture.league.id,
              league_name:    (() => {
                const nameMap: Record<number, string> = {
                  39: 'Premier League', 140: 'La Liga', 78: 'Bundesliga', 135: 'Serie A',
                  61: 'Ligue 1', 88: 'Eredivisie', 94: 'Primeira Liga', 40: 'Championship',
                  203: 'Süper Lig', 144: 'Jupiler Pro League', 128: 'Liga Argentina', 71: 'Brasileirao',
                  253: 'MLS', 262: 'Liga MX', 307: 'Saudi Pro', 235: 'RPL',
                  119: 'Superliga DK', 113: 'Allsvenskan', 103: 'Eliteserien', 106: 'Ekstraklasa',
                  218: 'Austria BL', 197: 'Super League 1', 207: 'Swiss SL', 169: 'Scottish PL',
                  41: 'League One', 79: '2. Bundesliga', 136: 'Serie B', 62: 'Ligue 2',
                  141: 'Segunda División', 283: 'Liga BetPlay', 239: 'Primera Chile',
                  242: 'Primera Uruguay', 332: 'Super Liga IR', 188: 'A-League', 292: 'K League 1',
                  2: 'Champions League',
                }
                return nameMap[fixture.league.id] || fixture.league.name
              })(),
              season:         fixture.league.season,
              home_team_id:   fixture.teams.home.id,
              home_team_name: fixture.teams.home.name,
              home_team_logo: fixture.teams.home.logo,
              away_team_id:   fixture.teams.away.id,
              away_team_name: fixture.teams.away.name,
              away_team_logo: fixture.teams.away.logo,
              kickoff_at:     fixture.fixture.date,
              status:         'scheduled',
            }, { onConflict: 'external_id' })
            .select('id')
            .single()

          if (!savedMatch) continue

          await supabase.from('model_predictions').upsert({
            match_id:              savedMatch.id,
            expected_goals_home:   analysis.poisson.expectedGoalsHome,
            expected_goals_away:   analysis.poisson.expectedGoalsAway,
            form_factor_home:      analysis.poisson.formFactorHome,
            form_factor_away:      analysis.poisson.formFactorAway,
            prob_home_win:         analysis.poisson.probHomeWin,
            prob_draw:             analysis.poisson.probDraw,
            prob_away_win:         analysis.poisson.probAwayWin,
            prob_over25:           analysis.poisson.probOver25,
            prob_btts:             analysis.poisson.probBtts,
            league_avg_home_goals: leagueStats.avgHomeGoals,
            league_avg_away_goals: leagueStats.avgAwayGoals,
          }, { onConflict: 'match_id,model_version' })

          if ((matchInput as any).oddsHome || (matchInput as any).oddsOver25) {
            await supabase.from('odds_snapshots').upsert({
              match_id:    savedMatch.id,
              odds_home:   (matchInput as any).oddsHome,
              odds_draw:   (matchInput as any).oddsDraw,
              odds_away:   (matchInput as any).oddsAway,
              odds_over25: (matchInput as any).oddsOver25,
            }, { onConflict: 'match_id' })
          }

          const lw = LEAGUE_WEIGHTS[league.id] ?? 0.85
          for (const bet of analysis.valueBets) {
            allValueBets.push({
              matchId:    savedMatch.id,
              matchLabel: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              leagueName: fixture.league.name,
              kickoffAt:  fixture.fixture.date,
              market:     bet.market,
              marketLabel: bet.label,
              odds:        bet.odds,
              ev:          bet.ev,
              edge:        bet.edge,
              confidence:  bet.confidence,
              kellyStake:  calcKelly(bet.modelProb, bet.odds, 0.25),
              rankScore:   calcRankScore(bet.ev, bet.edge, bet.confidence, lw),
              expectedGoalsHome: analysis.poisson.expectedGoalsHome,
              expectedGoalsAway: analysis.poisson.expectedGoalsAway,
            })
          }

          if (analysis.valueBets.length > 0) {
            log.push(`  ⚡ ${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${analysis.valueBets.length} value bets`)
          }

        } catch (err) {
          log.push(`  ✗ ${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${String(err).split(':')[1]?.trim() ?? String(err)}`)
        }
      }

    } catch (err) {
      log.push(`✗ Liga ${league.name}: ${String(err)}`)
    }
  }

  // Guardar Top 5
  const top5 = getTop5(allValueBets)
  await supabase.from('daily_rankings').delete().eq('date', today)

  for (let i = 0; i < top5.length; i++) {
    const b = top5[i]
    await supabase.from('daily_rankings').insert({
      date:             today,
      rank:             i + 1,
      match_id:         b.matchId,
      market:           b.market,
      market_label:     b.marketLabel,
      odds:             b.odds,
      ev:               b.ev,
      edge:             b.edge,
      confidence_score: b.confidence,
      rank_score:       b.rankScore,
      is_pro_only:      i >= 3,
    })
  }

  log.push(`\n🏆 Top 5 guardado: ${top5.length} value bets`)

  return NextResponse.json({
    success:   true,
    date:      today,
    valueBets: allValueBets.length,
    top5:      top5.length,
    log:       log.join('\n'),
  })
}
