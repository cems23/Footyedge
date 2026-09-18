import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createPublicRateLimit } from '@/lib/security/publicRateLimit'

export const dynamic = 'force-dynamic'

const ratelimit = createPublicRateLimit({ prefix: 'teaser-picks', requests: 5 })

// Endpoint público (sin auth) para mostrar picks reales en formato "teaser" en la
// landing — solo liga, hora, rating y edge. NUNCA expone equipos, mercado ni cuotas,
// para no regalar el valor real a quien no tiene cuenta.
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  let rateLimit
  try {
    rateLimit = ratelimit ? await ratelimit.limit(ip) : null
  } catch {
    // Do not expose Redis details or turn a dependency outage into an unhandled 500.
    console.warn('[teaser-picks] Public rate limiter temporarily unavailable')
    rateLimit = null
  }

  if (!rateLimit) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503, headers: { 'Retry-After': '60' } },
    )
  }

  const { success, limit, remaining, reset } = rateLimit

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
    )
  }

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
