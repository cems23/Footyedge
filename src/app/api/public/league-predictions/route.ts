import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'league-predictions',
})

// Endpoint publico (sin auth) para paginas SEO: partidos de hoy de una liga,
// con predicciones basicas del modelo. No expone cuotas ni edge/EV.
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await ratelimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const leagueId = Number(searchParams.get('leagueId'))
  if (!leagueId) return NextResponse.json({ error: 'leagueId requerido' }, { status: 400 })

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, home_team_logo, away_team_logo, kickoff_at, status, league_name')
    .eq('league_id', leagueId)
    .gte('kickoff_at', `${today}T00:00:00`)
    .lt('kickoff_at', `${tomorrow}T00:00:00`)
    .order('kickoff_at', { ascending: true })

  if (!matches || matches.length === 0) return NextResponse.json({ league_name: null, matches: [] })

  const matchIds = matches.map((m) => m.id)
  const { data: preds } = await supabase
    .from('model_predictions')
    .select('match_id, prob_home_win, prob_draw, prob_away_win, prob_over25, prob_btts')
    .in('match_id', matchIds)

  const predMap = Object.fromEntries((preds ?? []).map((p) => [p.match_id, p]))

  const result = matches.map((m) => {
    const p = predMap[m.id]
    return {
      home_team_name: m.home_team_name,
      away_team_name: m.away_team_name,
      home_team_logo: m.home_team_logo,
      away_team_logo: m.away_team_logo,
      kickoff_at: m.kickoff_at,
      status: m.status,
      prob_home_win: p?.prob_home_win ? Math.round(p.prob_home_win * 100) : null,
      prob_draw: p?.prob_draw ? Math.round(p.prob_draw * 100) : null,
      prob_away_win: p?.prob_away_win ? Math.round(p.prob_away_win * 100) : null,
      prob_over25: p?.prob_over25 ? Math.round(p.prob_over25 * 100) : null,
      prob_btts: p?.prob_btts ? Math.round(p.prob_btts * 100) : null,
    }
  })

  return NextResponse.json({ league_name: matches[0].league_name, matches: result })
}
