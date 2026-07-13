import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()

  const in12h = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  const { data: rankings } = await supabase
    .from('daily_rankings')
    .select(`
      market, edge, odds, ev, confidence_score,
      matches:match_id (
        id, home_team_name, away_team_name, home_team_logo, away_team_logo,
        league_name, league_id, kickoff_at
      )
    `)
    .eq('date', new Date().toISOString().split('T')[0])
    .gt('edge', 0.07)
    .order('edge', { ascending: false })

  if (!rankings?.length) return NextResponse.json({ bets: [] })

  // Filter matches kicking off in more than 12 hours
  const bets = rankings.filter((r: any) => {
    const kickoff = r.matches?.kickoff_at
    if (!kickoff) return false
    return new Date(kickoff) > new Date(in12h)
  }).map((r: any) => ({
    match_id: r.matches?.id,
    home_team: r.matches?.home_team_name,
    away_team: r.matches?.away_team_name,
    home_logo: r.matches?.home_team_logo,
    away_logo: r.matches?.away_team_logo,
    league_name: r.matches?.league_name,
    league_id: r.matches?.league_id,
    kickoff_at: r.matches?.kickoff_at,
    market: r.market,
    odds: r.odds,
    edge: r.edge,
    ev: r.ev,
    confidence: r.confidence_score,
    hours_until: Math.round((new Date(r.matches?.kickoff_at).getTime() - Date.now()) / 3600000),
  }))

  return NextResponse.json({ bets })
}
