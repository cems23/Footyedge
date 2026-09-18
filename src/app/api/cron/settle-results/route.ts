import { NextRequest, NextResponse } from 'next/server'
import { updateElo, DEFAULT_ELO_RATING } from '@/lib/math/elo'
import { apf } from '@/lib/api/football'
import { findFootyStatsMatch, getFootyStatsToday } from '@/lib/api/footystats'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function parseResult(homeGoals: number, awayGoals: number) {
  return {
    homeGoals,
    awayGoals,
    result: homeGoals > awayGoals ? 'home' : awayGoals > homeGoals ? 'away' : 'draw',
    over25: (homeGoals + awayGoals) > 2,
    btts: homeGoals > 0 && awayGoals > 0,
  }
}

async function getFixtureResultFootyStats(homeName: string, awayName: string) {
  const match = findFootyStatsMatch(await getFootyStatsToday(), homeName, awayName)
  if (!match || match.status !== 'complete') return null
  const homeGoals = match.homeGoalCount ?? 0
  const awayGoals = match.awayGoalCount ?? 0
  return parseResult(homeGoals, awayGoals)
}

// Partidos que NO se van a jugar como estaba programado — no tienen marcador
// real y jamás van a llegar a FT esperando indefinidamente. Hay que marcarlos
// para que dejen de reintentarse cada hora y de aparecer como predicción activa.
const INACTIVE_STATUSES = ['PST', 'CANC', 'SUSP', 'ABD', 'INT']

function throwIfSupabaseError(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

async function getFixtureResultAPF(fixtureId: string) {
  const [f] = await apf<any[]>('/fixtures', { id: fixtureId })
  if (!f) return null
  const status = f.fixture?.status?.short
  if (INACTIVE_STATUSES.includes(status)) return { inactive: true as const, statusCode: status as string }
  if (status !== 'FT' && status !== 'AET' && status !== 'PEN') return null
  const homeGoals = f.goals?.home ?? 0
  const awayGoals = f.goals?.away ?? 0
  return parseResult(homeGoals, awayGoals)
}

async function getFixtureResult(fixtureId: string, homeName: string, awayName: string, kickoffAt: string) {
  // Solo usar FootyStats para partidos de hoy
  const today = new Date().toISOString().split('T')[0]
  const matchDate = kickoffAt.split('T')[0]
  if (matchDate === today) {
    const fsResult = await getFixtureResultFootyStats(homeName, awayName)
    if (fsResult) return fsResult
  }
  // Para partidos de otros días usar API-Football directamente
  return getFixtureResultAPF(fixtureId)
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  // Solo partidos que terminaron hace al menos 2 horas
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: unsettledMatches, error: unsettledMatchesError } = await supabase
    .from('matches')
    .select('id, external_id, home_team_id, away_team_id, home_team_name, away_team_name, home_team_logo, away_team_logo, league_id, kickoff_at, league_name')
    .is('home_goals', null)
    .gte('kickoff_at', threeDaysAgo)
    .lte('kickoff_at', twoHoursAgo)
    .not('status', 'in', '(PST,CANC,SUSP,ABD,INT)')

  if (unsettledMatchesError) {
    console.error(`[settle-results] Could not load unsettled matches: ${unsettledMatchesError.message}`)
    return NextResponse.json({ success: false, error: 'Could not load unsettled matches' }, { status: 502 })
  }

  if (!unsettledMatches?.length) {
    return NextResponse.json({ success: true, message: 'No unsettled matches', settled: 0 })
  }

  // Procesar máximo 15 partidos por ejecución para evitar timeout
  const batch = unsettledMatches.slice(0, 15)

  const log: string[] = []
  let settled = 0
  let errors = 0

  for (const match of batch) {
    try {
      const result = await getFixtureResult(match.external_id, match.home_team_name, match.away_team_name, match.kickoff_at)
      if (!result) {
        log.push(`⏳ ${match.home_team_name} vs ${match.away_team_name} — not finished yet`)
        continue
      }

      if ('inactive' in result) {
        const { error: inactiveUpdateError } = await supabase.from('matches').update({
          status: result.statusCode,
          updated_at: new Date().toISOString(),
        }).eq('id', match.id)
        throwIfSupabaseError('inactive match update failed', inactiveUpdateError)
        log.push(`⏸ ${match.home_team_name} vs ${match.away_team_name} — marcado como ${result.statusCode} (no se juega, no cuenta para Elo/rankings)`)
        settled++
        continue
      }

      const { error: matchUpdateError } = await supabase.from('matches').update({
        status: 'FT',
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        result: result.result,
        over25_result: result.over25,
        btts_result: result.btts,
        updated_at: new Date().toISOString(),
      }).eq('id', match.id)
      throwIfSupabaseError('match settlement update failed', matchUpdateError)

      // Liquidar también los "probability picks" (ej. Mejores BTTS del día) de este partido
      const { error: probabilityPickError } = await supabase.from('probability_picks').update({
        result: result.btts ? 'win' : 'loss',
        settled_at: new Date().toISOString(),
      }).eq('match_id', match.id).eq('market', 'btts').is('result', null)
      throwIfSupabaseError('probability pick settlement failed', probabilityPickError)

      // Actualizar ratings Elo de ambos equipos con el resultado real
      if (match.home_team_id && match.away_team_id) {
        try {
          const [{ data: homeElo }, { data: awayElo }] = await Promise.all([
            supabase.from('team_elo').select('*').eq('team_id', match.home_team_id).maybeSingle(),
            supabase.from('team_elo').select('*').eq('team_id', match.away_team_id).maybeSingle(),
          ])

          const eloHome = homeElo?.elo_rating ?? DEFAULT_ELO_RATING
          const eloAway = awayElo?.elo_rating ?? DEFAULT_ELO_RATING
          const playedHome = homeElo?.matches_played ?? 0
          const playedAway = awayElo?.matches_played ?? 0

          const { newEloHome, newEloAway } = updateElo(
            eloHome, eloAway, result.homeGoals, result.awayGoals, playedHome, playedAway
          )

          const matchDateForElo = match.kickoff_at.split('T')[0]

          await Promise.all([
            supabase.from('team_elo').upsert({
              team_id: match.home_team_id, team_name: match.home_team_name,
              elo_rating: newEloHome, matches_played: playedHome + 1,
              league_id: match.league_id, league_name: match.league_name, logo_url: match.home_team_logo,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'team_id' }),
            supabase.from('team_elo').upsert({
              team_id: match.away_team_id, team_name: match.away_team_name,
              elo_rating: newEloAway, matches_played: playedAway + 1,
              league_id: match.league_id, league_name: match.league_name, logo_url: match.away_team_logo,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'team_id' }),
            // Guardar también el historial de Elo (para el gráfico de evolución)
            supabase.from('elo_history').insert({
              team_id: match.home_team_id, team_name: match.home_team_name,
              elo_rating: newEloHome, match_date: matchDateForElo,
            }),
            supabase.from('elo_history').insert({
              team_id: match.away_team_id, team_name: match.away_team_name,
              elo_rating: newEloAway, match_date: matchDateForElo,
            }),
          ])
        } catch {
          // Si falla la actualización de Elo, no bloquea la liquidación del partido
        }
      }

      const matchDate = match.kickoff_at.split('T')[0]
      const { data: rankings, error: rankingsError } = await supabase
        .from('daily_rankings')
        .select('*')
        .eq('match_id', match.id)
      throwIfSupabaseError('daily rankings lookup failed', rankingsError)

      if (rankings?.length) {
        for (const ranking of rankings) {
          let won = false
          if (ranking.market === 'btts')   won = result.btts
          if (ranking.market === 'over25') won = result.over25
          if (ranking.market === 'over15') won = (result.homeGoals + result.awayGoals) > 1
          if (ranking.market === 'home')   won = result.result === 'home'
          if (ranking.market === 'away')   won = result.result === 'away'
          if (ranking.market === 'draw')   won = result.result === 'draw'

          const { error: performanceError } = await supabase.from('model_performance').insert({
            fixture_id: parseInt(match.external_id),
            match_date: matchDate,
            home_team: match.home_team_name,
            away_team: match.away_team_name,
            league: match.league_name,
            market: ranking.market,
            predicted_prob: null,
            odds: ranking.odds,
            ev: ranking.ev,
            result: won ? 'win' : 'loss',
            profit: won ? (ranking.odds - 1) : -1,
          })
          throwIfSupabaseError('model performance insert failed', performanceError)
        }
        log.push(`✅ ${match.home_team_name} vs ${match.away_team_name} — ${result.homeGoals}-${result.awayGoals} — ${rankings.length} markets settled`)
      } else {
        log.push(`✅ ${match.home_team_name} vs ${match.away_team_name} — ${result.homeGoals}-${result.awayGoals} — no rankings`)
      }

      settled++
      await new Promise(r => setTimeout(r, 500))
    } catch (err: any) {
      errors++
      log.push(`❌ ${match.home_team_name}: ${String(err).slice(0, 80)}`)
    }
  }

  return NextResponse.json(
    { success: errors === 0, settled, errors, total: unsettledMatches.length, log },
    { status: errors === 0 ? 200 : 207 },
  )
}
