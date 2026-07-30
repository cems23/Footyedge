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

  // No mostrar en las tarjetas de picks (Value Bets, BTTS) partidos ya finalizados,
  // aplazados, cancelados o suspendidos — el resultado/estado se sigue mostrando en
  // la lista de partidos, pero no tiene sentido ofrecer una "apuesta de valor" sobre
  // algo que ya terminó o que no se va a jugar como estaba programado.
  const INACTIVE_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO', 'PST', 'CANC', 'SUSP', 'ABD', 'INT']
  const notFinished = (rankings ?? []).filter((r: any) => !INACTIVE_STATUSES.includes(r.matches?.status ?? ''))

  // AI Signal Check (modo observar) — se muestra como badge informativo cuando el
  // ajuste sugerido es fuerte, sin bloquear ni filtrar el pick. Umbral: penalización
  // de confianza >= 15 (ajustar si hace falta con más datos acumulados).
  const matchIds = Array.from(new Set(notFinished.map((r: any) => r.match_id)))
  const { data: signalChecks } = matchIds.length
    ? await supabase.from('ai_signal_checks').select('match_id, market, adjustment, confidence_penalty, reason').in('match_id', matchIds)
    : { data: [] }
  const signalMap: Record<string, any> = {}
  for (const s of signalChecks ?? []) signalMap[`${s.match_id}_${s.market}`] = s

  const withSignal = notFinished.map((r: any) => {
    const signal = signalMap[`${r.match_id}_${r.market}`]
    return { ...r, ai_signal: signal ? { ...signal, risky: (signal.confidence_penalty ?? 0) >= 15 } : null }
  })

  const visible = isPro ? withSignal : withSignal.filter((r: { is_pro_only: boolean }) => !r.is_pro_only)

  return NextResponse.json({
    date:        today,
    rankings:    visible ?? [],
    total:       withSignal.length,
    visible:     visible?.length ?? 0,
    isPro,
    lockedCount: withSignal.length - (visible?.length ?? 0),
  })
}
