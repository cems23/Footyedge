import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Guarda una foto diaria de los picks basados en probabilidad (no en cuotas de
// mercado) que se muestran en secciones como "Mejores BTTS del día" — para poder
// medir después qué tan bien acertaron, algo que antes no se trackeaba en absoluto.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, league_name, kickoff_at, status, model_predictions(prob_btts)')
    .gte('kickoff_at', today + 'T00:00:00')
    .lt('kickoff_at', today + 'T23:59:59')

  if (!matches?.length) return NextResponse.json({ success: true, saved: 0 })

  const doneStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO']
  const active = matches.filter(m => !doneStatuses.includes(m.status ?? ''))

  const bttsPicks = active
    .map((m: any) => {
      const pred = Array.isArray(m.model_predictions) ? m.model_predictions[0] : m.model_predictions
      return { m, prob: pred?.prob_btts }
    })
    .filter(x => (x.prob ?? 0) >= 0.60)
    .sort((a, b) => (b.prob ?? 0) - (a.prob ?? 0))
    .slice(0, 15)

  let saved = 0
  for (const { m, prob } of bttsPicks) {
    const { error } = await supabase.from('probability_picks').upsert({
      match_id: m.id,
      market: 'btts',
      predicted_prob: prob,
      date: today,
      home_team: m.home_team_name,
      away_team: m.away_team_name,
      league_name: m.league_name,
    }, { onConflict: 'match_id,market' })
    if (!error) saved++
  }

  return NextResponse.json({ success: true, saved })
}
