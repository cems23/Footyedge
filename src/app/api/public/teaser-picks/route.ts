import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Endpoint público (sin auth) para mostrar picks reales en formato "teaser" en la
// landing — solo liga, hora, rating y edge. NUNCA expone equipos, mercado ni cuotas,
// para no regalar el valor real a quien no tiene cuenta.
export async function GET() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: rankings } = await supabase
    .from('daily_rankings')
    .select('ev, confidence_score, matches(league_name, league_id, kickoff_at, status)')
    .eq('date', today)
    .order('rank', { ascending: true })
    .limit(4)

  const teasers = (rankings ?? [])
    .filter((r: any) => r.matches?.status !== 'FT')
    .map((r: any) => ({
      league_name: r.matches?.league_name ?? null,
      league_id: r.matches?.league_id ?? null,
      kickoff_at: r.matches?.kickoff_at ?? null,
      rating: Math.max(1, Math.min(10, Math.round((r.confidence_score ?? 50) / 10))),
      ev: r.ev,
    }))

  return NextResponse.json({ teasers })
}
