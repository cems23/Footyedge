import { NextRequest, NextResponse } from 'next/server'
import { updateElo, DEFAULT_ELO_RATING } from '@/lib/math/elo'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const APF = 'https://v3.football.api-sports.io'
const FOOTYSTATS = 'https://api.football-data-api.com'

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
  const key = process.env.FOOTYSTATS_API_KEY
  if (!key) return null
  try {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const h = normalize(homeName)
    const a = normalize(awayName)
    const res = await fetch(`${FOOTYSTATS}/todays-matches?key=${key}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const matches = json.data ?? []
    const match = matches.find((m: any) => {
      const mh = normalize(m.home_name ?? '')
      const ma = normalize(m.away_name ?? '')
      return (mh.includes(h) || h.includes(mh)) && (ma.includes(a) || a.includes(ma))
    })
    if (!match) return null
    if (match.status !== 'complete') return null
    const homeGoals = match.homeGoalCount ?? 0
    const awayGoals = match.awayGoalCount ?? 0
    return parseResult(homeGoals, awayGoals)
  } catch { return null }
}

async function getFixtureResultAPF(fixtureId: string) {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY missing')
  const res = await fetch(`${APF}/fixtures?id=${fixtureId}`, {
    headers: { 'x-apisports-key': key },
    cache: 'no-store',
  })
  const json = await res.json()
  const f = json.response?.[0]
  if (!f) return null
  const status = f.fixture?.status?.short
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

  const { data: unsettledMatches } = await supabase
    .from('matches')
    .select('id, external_id, home_team_id, away_team_id, home_team_name, away_team_name, kickoff_at, league_name')
    .is('home_goals', null)
    .gte('kickoff_at', threeDaysAgo)
    .lte('kickoff_at', twoHoursAgo)

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

      await supabase.from('matches').update({
        status: 'FT',
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        result: result.result,
        over25_result: result.over25,
        btts_result: result.btts,
        updated_at: new Date().toISOString(),
      }).eq('id', match.id)

      // Liquidar también los "probability picks" (ej. Mejores BTTS del día) de este partido
      await supabase.from('probability_picks').update({
        result: result.btts ? 'win' : 'loss',
        settled_at: new Date().toISOString(),
      }).eq('match_id', match.id).eq('market', 'btts').is('result', null)

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
              updated_at: new Date().toISOString(),
            }, { onConflict: 'team_id' }),
            supabase.from('team_elo').upsert({
              team_id: match.away_team_id, team_name: match.away_team_name,
              elo_rating: newEloAway, matches_played: playedAway + 1,
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
      const { data: rankings } = await supabase
        .from('daily_rankings')
        .select('*')
        .eq('match_id', match.id)

      if (rankings?.length) {
        for (const ranking of rankings) {
          let won = false
          if (ranking.market === 'btts')   won = result.btts
          if (ranking.market === 'over25') won = result.over25
          if (ranking.market === 'over15') won = (result.homeGoals + result.awayGoals) > 1
          if (ranking.market === 'home')   won = result.result === 'home'
          if (ranking.market === 'away')   won = result.result === 'away'
          if (ranking.market === 'draw')   won = result.result === 'draw'

          await supabase.from('model_performance').insert({
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

  return NextResponse.json({ success: true, settled, errors, total: unsettledMatches.length, log })
}
