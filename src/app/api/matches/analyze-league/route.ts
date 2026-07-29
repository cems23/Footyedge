import { NextRequest, NextResponse } from 'next/server'
import { analyzeMatch } from '@/lib/math/poisson'
import { calcKelly, calcRankScore } from '@/lib/math/metrics'
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

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  const leagueIndex = parseInt(searchParams.get('league') ?? '0')
  const league = leagueId
    ? ACTIVE_LEAGUES.find(l => l.id === parseInt(leagueId))
    : ACTIVE_LEAGUES[leagueIndex]
  if (!league) return NextResponse.json({ error: 'Invalid league' }, { status: 400 })

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const log: string[] = []
  const valueBets: any[] = []
  const processedMatchIds: string[] = []  // TODOS los partidos analizados esta corrida, tengan o no value bets — necesario para poder borrar de staging_rankings un pick viejo que ya no califica (ej. filtro de lambda-al-techo bloqueandolo ahora)

  try {
    const [fixtures, oddsEvents] = await Promise.all([
      getUpcomingFixtures(league.id, league.season, 5),
      getOddsForLeagueById(league.id, league.season),
    ])
    log.push(`${league.name}: ${fixtures.length} fixtures`)

    const leagueStats = await getLeagueStats(league.id, league.season)
    await sleep(1000)

    for (const fixture of fixtures) {
      try {
        await sleep(1500)
        const homeStats = await getTeamStats(fixture.teams.home.id, league.id, league.season, true)
        await sleep(1500)
        const awayStats = await getTeamStats(fixture.teams.away.id, league.id, league.season, false)
        if (homeStats.matchesPlayed < 1 || awayStats.matchesPlayed < 1) continue

        // Match by fixture_id — 100% preciso
        const oddsEvent = oddsEvents.find(e => String(e.fixture_id) === String(fixture.fixture.id))
        const odds = (league.hasOdds && oddsEvent) ? extractOdds(oddsEvent, fixture.teams.home.name, fixture.teams.away.name) : {}
        const matchInput = { home: homeStats, away: awayStats, league: leagueStats, leagueId: league.id, ...odds }
        const analysis = analyzeMatch(matchInput)

        const { data: savedMatch } = await supabase
          .from('matches').upsert({
            external_id: String(fixture.fixture.id),
            league_id: fixture.league.id,
            league_name: (() => { const m: Record<number,string> = {
              39:'Premier League',140:'La Liga',78:'Bundesliga',135:'Serie A',
              61:'Ligue 1',88:'Eredivisie',94:'Primeira Liga',40:'Championship',
              203:'Süper Lig',144:'Jupiler Pro League',128:'Liga Argentina',71:'Brasileirao',
              253:'MLS',262:'Liga MX',307:'Saudi Pro',235:'RPL',
              119:'Superliga DK',113:'Allsvenskan',103:'Eliteserien',106:'Ekstraklasa',
              218:'Austria BL',197:'Super League 1',207:'Swiss SL',169:'Scottish PL',
              41:'League One',79:'2. Bundesliga',136:'Serie B',62:'Ligue 2',
              141:'Segunda División',239:'Liga BetPlay',265:'Primera Chile',
              268:'Primera Uruguay',332:'Super Liga IR',98:'J1 League',292:'K League 1',2:'Champions League'
            }; return m[fixture.league.id] || fixture.league.name })(),
            season: fixture.league.season,
            home_team_id: fixture.teams.home.id, home_team_name: fixture.teams.home.name, home_team_logo: fixture.teams.home.logo,
            away_team_id: fixture.teams.away.id, away_team_name: fixture.teams.away.name, away_team_logo: fixture.teams.away.logo,
            kickoff_at: fixture.fixture.date,
            // NO se incluye 'status' aquí a propósito — este upsert corre varias veces al día
            // (cron 4x/día) y si forzáramos 'scheduled' siempre, revertiría el status 'FT' que
            // settle-results ya haya puesto en un partido que ya terminó. Solo partidos NUEVOS
            // usan el valor por defecto de la columna ('scheduled'), los existentes conservan el suyo.
          }, { onConflict: 'external_id' }).select('id').single()

        if (!savedMatch) continue
        processedMatchIds.push(savedMatch.id)

        await supabase.from('model_predictions').upsert({
          match_id: savedMatch.id,
          expected_goals_home: analysis.poisson.expectedGoalsHome,
          expected_goals_away: analysis.poisson.expectedGoalsAway,
          form_factor_home: analysis.poisson.formFactorHome,
          form_factor_away: analysis.poisson.formFactorAway,
          prob_home_win: analysis.poisson.probHomeWin,
          prob_draw: analysis.poisson.probDraw,
          prob_away_win: analysis.poisson.probAwayWin,
          prob_over25: analysis.poisson.probOver25,
          prob_btts: analysis.poisson.probBtts,
          league_avg_home_goals: leagueStats.avgHomeGoals,
          league_avg_away_goals: leagueStats.avgAwayGoals,
        }, { onConflict: 'match_id,model_version' })

        // Guardar odds en snapshots
        if ((matchInput as any).oddsHome || (matchInput as any).oddsOver25) {
          await supabase.from('odds_snapshots').upsert({
            match_id:    savedMatch.id,
            odds_home:   (matchInput as any).oddsHome,
            odds_draw:   (matchInput as any).oddsDraw,
            odds_away:   (matchInput as any).oddsAway,
            odds_over25: (matchInput as any).oddsOver25,
          }, { onConflict: 'match_id' })
        }

        // Historial de odds para el radar de dropping odds — aditivo, nunca debe tumbar el analisis
        if ((matchInput as any).oddsHome || (matchInput as any).oddsOver25) {
          try {
            await supabase.from('odds_history').insert({
              match_id:    savedMatch.id,
              odds_home:   (matchInput as any).oddsHome,
              odds_draw:   (matchInput as any).oddsDraw,
              odds_away:   (matchInput as any).oddsAway,
              odds_over25: (matchInput as any).oddsOver25,
            })
          } catch (e) {
            console.error('odds_history insert failed (non-fatal):', e)
          }
        }

        // Historial de odds para el radar de dropping odds — aditivo, nunca debe tumbar el analisis
        if ((matchInput as any).oddsHome || (matchInput as any).oddsOver25) {
          try {
            await supabase.from('odds_history').insert({
              match_id:    savedMatch.id,
              odds_home:   (matchInput as any).oddsHome,
              odds_draw:   (matchInput as any).oddsDraw,
              odds_away:   (matchInput as any).oddsAway,
              odds_over25: (matchInput as any).oddsOver25,
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
          if (analysis.valueBets.length > 0)
            log.push(`  ⚡ ${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${analysis.valueBets.length} bets`)
        }
      } catch (err) {
        log.push(`  ✗ ${fixture.teams.home.name}: ${String(err).slice(0, 60)}`)
      }
    }

    // Limpiar staging de días anteriores
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]
    await supabase.from('staging_rankings').delete().lt('date', today)

    // Guardar en staging (sin rank constraint) — se borra por TODOS los partidos
    // procesados esta corrida (no solo los que generaron value bets), para que un
    // pick viejo que ya no califica (ej. bloqueado por el filtro de lambda-al-techo)
    // se elimine en vez de quedar huérfano en staging_rankings para siempre.
    if (processedMatchIds.length) {
      await supabase.from('staging_rankings').delete()
        .eq('date', today)
        .in('match_id', processedMatchIds)
    }

    for (const b of valueBets) {
      await supabase.from('staging_rankings').insert({
        date: today,
        match_id: b.matchId, market: b.market, market_label: b.marketLabel,
        odds: b.odds, ev: b.ev, edge: b.edge,
        confidence_score: b.confidence, rank_score: b.rankScore,
      })
    }

  } catch (err) {
    log.push(`Error: ${String(err)}`)
  }

  return NextResponse.json({ success: true, league: league.name, valueBets: valueBets.length, log })
}
