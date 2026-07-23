import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get user plan
  const { data: { user } } = await supabase.auth.getUser()
  const isPro = user ? await (async () => {
    const { data } = await supabase.from('users').select('plan').eq('id', user.id).single()
    return data?.plan === 'pro' || data?.plan === 'elite'
  })() : false

  const { data: rankings, error } = await supabase
    .from('daily_rankings')
    .select(`
      *,
      matches (
        id, home_team_name, away_team_name, home_team_logo, away_team_logo,
        league_name, league_id, kickoff_at, status,
        model_predictions ( expected_goals_home, expected_goals_away, prob_over25, prob_btts, prob_home_win, prob_draw, prob_away_win )
      )
    `)
    .eq('date', today)
    .order('rank', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // No mostrar en las tarjetas de picks (Value Bets, BTTS) partidos ya finalizados —
  // el resultado se sigue mostrando en la lista de partidos, pero no tiene sentido
  // ofrecer una "apuesta de valor" sobre algo que ya terminó.
  const notFinished = (rankings ?? []).filter((r: any) => r.matches?.status !== 'FT')

  const visible = isPro ? notFinished : notFinished.filter((r: { is_pro_only: boolean }) => !r.is_pro_only)

  return NextResponse.json({
    date:        today,
    rankings:    visible ?? [],
    total:       notFinished.length,
    visible:     visible?.length ?? 0,
    isPro,
    lockedCount: notFinished.length - (visible?.length ?? 0),
  })
}
