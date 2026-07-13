import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { analyzeMatch } from '@/lib/math/poisson'
import { ACTIVE_LEAGUES } from '@/lib/api/football'

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

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: any[] = []
  const log: string[] = []
  const leagues = ACTIVE_LEAGUES.slice(0, 5)

  for (const league of leagues) {
    try {
      await sleep(2000)
      log.push('Processing ' + league.name)

      const fixtures = await apf<any[]>('/fixtures', {
        league: league.id, season: 2025, status: 'FT', last: 30
      })

      if (!fixtures?.length) continue

      for (const fixture of fixtures) {
        try {
          await sleep(1500)
          const homeId = fixture.teams.home.id
          const awayId = fixture.teams.away.id
          const fixtureId = fixture.fixture.id

          const { data: existing } = await supabase
            .from('model_performance')
            .select('id').eq('fixture_id', fixtureId).single()
          if (existing) continue

          const [homeStats, awayStats] = await Promise.all([
            apf<any>('/teams/statistics', { team: homeId, league: league.id, season: 2025 }),
            apf<any>('/teams/statistics', { team: awayId, league: league.id, season: 2025 }),
          ])
          await sleep(1000)
          if (!homeStats || !awayStats) continue

          const extract = (s: any, isHome: boolean) => ({
            goalsScored: parseFloat(isHome ? s.goals?.for?.average?.home : s.goals?.for?.average?.away) || 1.2,
            goalsConceded: parseFloat(isHome ? s.goals?.against?.average?.home : s.goals?.against?.average?.away) || 1.2,
            matchesPlayed: s.fixtures?.played?.total || 20,
            recentGoalsScored: [1.2, 1.2, 1.2, 1.2, 1.2],
            recentGoalsConceded: [1.2, 1.2, 1.2, 1.2, 1.2],
            isHome,
          })

          const analysis = analyzeMatch({
            home: extract(homeStats, true),
            away: extract(awayStats, false),
            league: { avgHomeGoals: 1.52, avgAwayGoals: 1.18, avgTotalGoals: 2.70 },
          })

          const actualTotal = fixture.goals.home + fixture.goals.away
          const bttsResult = fixture.goals.home > 0 && fixture.goals.away > 0

          const over25Prob = analysis.poisson.probOver25
          const bttsProb = analysis.poisson.probBtts
          const over25Odds = 1.85
          const bttsOdds = 1.75
          const over25EV = (over25Prob * over25Odds) - 1
          const bttsEV = (bttsProb * bttsOdds) - 1

          if (over25EV > 0.05) {
            results.push({
              fixture_id: fixtureId,
              match_date: fixture.fixture.date.split('T')[0],
              home_team: fixture.teams.home.name,
              away_team: fixture.teams.away.name,
              league: league.name,
              market: 'over25',
              predicted_prob: over25Prob,
              odds: over25Odds,
              ev: over25EV,
              result: actualTotal > 2.5 ? 'win' : 'loss',
              profit: actualTotal > 2.5 ? over25Odds - 1 : -1,
            })
          }

          if (bttsEV > 0.05) {
            results.push({
              fixture_id: fixtureId + 1000000,
              match_date: fixture.fixture.date.split('T')[0],
              home_team: fixture.teams.home.name,
              away_team: fixture.teams.away.name,
              league: league.name,
              market: 'btts',
              predicted_prob: bttsProb,
              odds: bttsOdds,
              ev: bttsEV,
              result: bttsResult ? 'win' : 'loss',
              profit: bttsResult ? bttsOdds - 1 : -1,
            })
          }
        } catch { continue }
      }
    } catch (e) { log.push('Error ' + league.name + ': ' + e) }
  }

  if (results.length > 0) {
    await supabase.from('model_performance').upsert(results, { onConflict: 'fixture_id' })
  }

  return NextResponse.json({ ok: true, processed: results.length, log })
}
