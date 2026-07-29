import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOddsApiConsensus, findConsensusMatch } from '@/lib/api/oddsApiConsensus'

export const dynamic = 'force-dynamic'

const SPORT_KEY_BY_LEAGUE: Record<number, string> = {
  2: 'soccer_uefa_champs_league',
  39: 'soccer_epl',
  140: 'soccer_spain_la_liga',
  135: 'soccer_italy_serie_a',
  78: 'soccer_germany_bundesliga',
  61: 'soccer_france_ligue_one',
}

function freshHourBucket(): string {
  const now = new Date()
  const minutes = now.getUTCMinutes()
  const rounded = minutes < 30 ? '00' : '30'
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const dateStr = now.toISOString().split('T')[0]
  return `${dateStr}T${hh}:${rounded}`
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString()

  const { data: pending } = await supabase
    .from('clv_tracking')
    .select('id, match_id, market, league_id, kickoff_at, opening_odds')
    .is('closing_odds', null)
    .gte('kickoff_at', windowStart)
    .lte('kickoff_at', windowEnd)

  if (!pending?.length) {
    return NextResponse.json({ success: true, captured: 0, checked: 0, message: 'No pending matches in window' })
  }

  const matchIds = Array.from(new Set(pending.map(p => p.match_id)))
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name')
    .in('id', matchIds)
  const matchById = Object.fromEntries((matches ?? []).map(m => [m.id, m]))

  const bucket = freshHourBucket()
  const consensusCache: Record<string, Awaited<ReturnType<typeof getOddsApiConsensus>>> = {}
  let captured = 0

  for (const row of pending) {
    const sportKey = SPORT_KEY_BY_LEAGUE[row.league_id]
    const match = matchById[row.match_id]
    if (!sportKey || !match) continue

    if (!(sportKey in consensusCache)) {
      consensusCache[sportKey] = await getOddsApiConsensus(sportKey, bucket)
    }
    const consensus = consensusCache[sportKey]
    if (!consensus) continue

    const found = findConsensusMatch(consensus, match.home_team_name, match.away_team_name)
    if (!found) continue

    const closingOddsByMarket: Record<string, number | undefined> = {
      home: found.oddsHome, away: found.oddsAway, draw: found.oddsDraw, over25: found.oddsOver25,
    }
    const closingOdds = closingOddsByMarket[row.market]
    if (!closingOdds) continue

    const clvPct = (row.opening_odds / closingOdds - 1) * 100

    await supabase.from('clv_tracking').update({
      closing_odds: closingOdds,
      closing_captured_at: new Date().toISOString(),
      clv_pct: +clvPct.toFixed(2),
    }).eq('id', row.id)
    captured++
  }

  return NextResponse.json({ success: true, captured, checked: pending.length })
}
