import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/picks — picks del usuario + performance
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const status = searchParams.get('status') // pending | settled | all

  let query = supabase
    .from('picks')
    .select(`*, matches(home_team_name, away_team_name, league_name, kickoff_at, home_team_logo, away_team_logo)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status === 'pending') query = query.eq('result', 'pending')
  if (status === 'settled') query = query.in('result', ['win', 'loss', 'void'])

  const [{ data: picks }, { data: perf }, { data: userData }] = await Promise.all([
    query,
    supabase.from('user_performance').select('*').eq('user_id', user.id).single(),
    supabase.from('users').select('plan, picks_today, picks_today_date, bankroll').eq('id', user.id).single(),
  ])

  return NextResponse.json({
    picks: picks ?? [],
    performance: perf,
    user: {
      plan: userData?.plan ?? 'free',
      picks_today: userData?.picks_today ?? 0,
      email: user.email,
    },
  })
}

// POST /api/picks — crear pick
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verificar límite de picks
  const { data: canPick } = await supabase.rpc('check_pick_limit', { p_user_id: user.id })
  if (!canPick) {
    const { data: u } = await supabase.from('users').select('plan, picks_today').eq('id', user.id).single()
    return NextResponse.json({
      error:      'PICK_LIMIT_REACHED',
      message:    'Límite de 3 picks diarios alcanzado. Actualiza a Pro para picks ilimitados.',
      picksToday: u?.picks_today,
      plan:       u?.plan,
      upgradeUrl: '/pricing',
    }, { status: 403 })
  }

  const body = await req.json()
  const { matchId, market, odds, stake, modelProb, impliedProb, edge, ev, confidence, kellyStake } = body

  if (!matchId || !market || !odds || !modelProb)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  if (edge <= 0.06 || ev <= 0.05)
    return NextResponse.json({
      error:   'INSUFFICIENT_VALUE',
      message: 'Esta apuesta no cumple los criterios mínimos (edge > 6%, EV > 5%)',
    }, { status: 422 })

  // Último odds snapshot del partido
  const { data: snap } = await supabase
    .from('odds_snapshots')
    .select('id')
    .eq('match_id', matchId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .single()

  const { data: pick, error } = await supabase
    .from('picks')
    .insert({
      user_id:          user.id,
      match_id:         matchId,
      odds_snapshot_id: snap?.id,
      market,
      odds,
      stake:            stake ?? 1.0,
      model_prob:       modelProb,
      implied_prob:     impliedProb,
      edge,
      ev,
      confidence_score: confidence,
      kelly_stake:      kellyStake,
      result:           'pending',
    })
    .select(`*, matches(home_team_name, away_team_name, league_name, kickoff_at)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pick }, { status: 201 })
}
