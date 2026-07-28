import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Radar de "dropping odds": compara la cuota mas antigua vs la mas reciente
// dentro de la ultima hora, por partido, y devuelve los que cambiaron >= 5%.
export async function GET() {
  const supabase = createServiceClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: rows } = await supabase
    .from('odds_history')
    .select('match_id, odds_home, odds_draw, odds_away, odds_over25, recorded_at, matches(home_team_name, away_team_name, league_name, kickoff_at, status)')
    .gte('recorded_at', oneHourAgo)
    .order('recorded_at', { ascending: true })

  if (!rows || rows.length === 0) return NextResponse.json({ movers: [] })

  const byMatch = new Map<string, any[]>()
  for (const r of rows as any[]) {
    if (!byMatch.has(r.match_id)) byMatch.set(r.match_id, [])
    byMatch.get(r.match_id)!.push(r)
  }

  const markets: { key: 'odds_home' | 'odds_draw' | 'odds_away' | 'odds_over25'; label: string }[] = [
    { key: 'odds_home', label: '1' },
    { key: 'odds_draw', label: 'X' },
    { key: 'odds_away', label: '2' },
    { key: 'odds_over25', label: 'O2.5' },
  ]

  const movers: any[] = []

  for (const [matchId, history] of Array.from(byMatch.entries())) {
    if (history.length < 2) continue
    const first = history[0]
    const last = history[history.length - 1]
    const match = last.matches
    if (!match || ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(match.status ?? '')) continue

    for (const m of markets) {
      const from = first[m.key]
      const to = last[m.key]
      if (!from || !to) continue
      const pctChange = ((to - from) / from) * 100
      if (Math.abs(pctChange) >= 5) {
        movers.push({
          match_id: matchId,
          home_team_name: match.home_team_name,
          away_team_name: match.away_team_name,
          league_name: match.league_name,
          kickoff_at: match.kickoff_at,
          market: m.label,
          from: Number(from),
          to: Number(to),
          pct_change: Number(pctChange.toFixed(1)),
        })
      }
    }
  }

  movers.sort((a, b) => Math.abs(b.pct_change) - Math.abs(a.pct_change))

  return NextResponse.json({ movers: movers.slice(0, 30) })
}
