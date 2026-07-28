import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Genera una combinada leyendo directo de model_predictions + odds_snapshots + matches,
// para trabajar sobre el inventario completo del dia (no solo el top 30 curado de daily_rankings).
export async function POST(req: NextRequest) {
  const body = await req.json()
  const markets: string[] = body.markets?.length ? body.markets : ['home', 'away', 'draw', 'over25', 'btts']
  const minOdds = Number(body.minOdds ?? 1.2)
  const maxOdds = Number(body.maxOdds ?? 3.0)
  const minProb = Number(body.minProb ?? 0.5)
  const count = Math.min(8, Math.max(1, Number(body.count ?? 3)))
  const leagueIds: number[] | null = body.leagueIds?.length ? body.leagueIds : null

  const supabase = createServiceClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, league_name, league_id, kickoff_at, status')
    .eq('status', 'scheduled')
    .gte('kickoff_at', new Date().toISOString())

  if (!matches || matches.length === 0) {
    return NextResponse.json({ picks: [], combined_odds: 1, combined_prob: 0, enough_matches: false })
  }

  const matchIds = matches.map((m) => m.id)

  const { data: preds } = await supabase
    .from('model_predictions')
    .select('match_id, prob_home_win, prob_draw, prob_away_win, prob_over25, prob_btts')
    .in('match_id', matchIds)

  const { data: odds } = await supabase
    .from('odds_snapshots')
    .select('match_id, odds_home, odds_draw, odds_away, odds_over25')
    .in('match_id', matchIds)

  const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]))
  const predMap = Object.fromEntries((preds ?? []).map((p) => [p.match_id, p]))
  const oddsMap = Object.fromEntries((odds ?? []).map((o) => [o.match_id, o]))

  const MARKET_LABELS: Record<string, string> = { home: '1', draw: 'X', away: '2', over25: 'Over 2.5', btts: 'BTTS' }
  const PROB_FIELD: Record<string, string> = { home: 'prob_home_win', draw: 'prob_draw', away: 'prob_away_win', over25: 'prob_over25', btts: 'prob_btts' }
  const ODDS_FIELD: Record<string, string> = { home: 'odds_home', draw: 'odds_draw', away: 'odds_away', over25: 'odds_over25' }

  type Candidate = { match_id: string; market: string; odds: number; model_prob: number; score: number }
  const candidates: Candidate[] = []

  for (const matchId of matchIds) {
    const pred = predMap[matchId] as any
    const odd = oddsMap[matchId] as any
    if (!pred) continue

    for (const market of markets) {
      const prob = pred[PROB_FIELD[market]]
      if (!prob || prob < minProb) continue

      // BTTS no tiene columna de odds propia en odds_snapshots; si no hay cuota, usamos 1/prob como aproximacion
      let marketOdds: number | null = market === 'btts' ? null : (odd?.[ODDS_FIELD[market]] ?? null)
      if (!marketOdds) marketOdds = prob > 0 ? Number((1 / prob).toFixed(2)) : null
      if (!marketOdds || marketOdds < minOdds || marketOdds > maxOdds) continue

      candidates.push({ match_id: matchId, market, odds: marketOdds, model_prob: prob, score: prob * marketOdds })
    }
  }

  candidates.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const picks: any[] = []
  for (const c of candidates) {
    if (seen.has(c.match_id)) continue
    const m = matchMap[c.match_id] as any
    if (leagueIds && !leagueIds.includes(m.league_id)) continue
    seen.add(c.match_id)
    picks.push({
      match_id: c.match_id,
      home_team_name: m.home_team_name,
      away_team_name: m.away_team_name,
      league_name: m.league_name,
      kickoff_at: m.kickoff_at,
      market: c.market,
      market_label: MARKET_LABELS[c.market],
      odds: c.odds,
      model_prob: c.model_prob,
    })
    if (picks.length >= count) break
  }

  const combinedOdds = picks.reduce((acc, p) => acc * p.odds, 1)
  const combinedProb = picks.reduce((acc, p) => acc * p.model_prob, 1)

  return NextResponse.json({
    picks,
    combined_odds: Number(combinedOdds.toFixed(2)),
    combined_prob: Number((combinedProb * 100).toFixed(1)),
    enough_matches: picks.length === count,
  })
}
