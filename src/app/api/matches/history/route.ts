import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  
  const { data: { user } } = await supabase.auth.getUser()
  const isPro = user ? await (async () => {
    const { data } = await supabase.from('users').select('plan').eq('id', user.id).single()
    return data?.plan === 'pro' || data?.plan === 'elite'
  })() : false

  // Fecha solicitada o hoy
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  
  // Validar que no sea más de 7 días atrás
  const minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  if (date < minDate) return NextResponse.json({ error: 'Date too old' }, { status: 400 })

  const { data: rankings, error } = await supabase
    .from('daily_rankings')
    .select(`
      *,
      matches (
        id, home_team_name, away_team_name, home_team_logo, away_team_logo,
        league_name, league_id, kickoff_at, status, home_goals, away_goals, result,
        model_predictions ( expected_goals_home, expected_goals_away, prob_over25, prob_btts, prob_home_win, prob_draw, prob_away_win )
      )
    `)
    .eq('date', date)
    .order('rank', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const visible = isPro ? rankings : rankings?.filter((r: any) => !r.is_pro_only)

  // Para fechas pasadas, añadir resultado a cada ranking
  const withResults = visible?.map((r: any) => {
    const match = r.matches
    if (!match || match.home_goals === null) return r
    let won: boolean | null = null
    if (r.market === 'home')   won = match.result === 'home'
    if (r.market === 'away')   won = match.result === 'away'
    if (r.market === 'draw')   won = match.result === 'draw'
    if (r.market === 'over25') won = (match.home_goals + match.away_goals) > 2
    if (r.market === 'over15') won = (match.home_goals + match.away_goals) > 1
    if (r.market === 'btts')   won = match.home_goals > 0 && match.away_goals > 0
    return { ...r, settled: true, won, score: `${match.home_goals}-${match.away_goals}` }
  })

  // Fechas disponibles (últimos 7 días con datos)
  const { data: availableDates } = await supabase
    .from('daily_rankings')
    .select('date')
    .gte('date', minDate)
    .order('date', { ascending: false })
  
  const uniqueDates = Array.from(new Set(availableDates?.map((d: any) => d.date) ?? []))

  return NextResponse.json({
    date,
    rankings: withResults ?? [],
    total: rankings?.length ?? 0,
    isPro,
    availableDates: uniqueDates,
  })
}
