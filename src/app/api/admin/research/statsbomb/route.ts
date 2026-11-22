import { NextRequest, NextResponse } from 'next/server'
import { getStatsBombCatalog, getStatsBombMatches, getStatsBombMatchProfile, isSafeStatsBombId, STATSBOMB_SOURCE_URL, STATSBOMB_TERMS_URL } from '@/lib/research/statsbomb'
import { isAdminEmail } from '@/lib/permissions'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: account } = await service.from('users').select('email').eq('id', user.id).single()
  return isAdminEmail(account?.email ?? user.email) ? user : null
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const matchId = searchParams.get('matchId')
  const competitionId = searchParams.get('competitionId')
  const seasonId = searchParams.get('seasonId')

  try {
    const response = matchId
      ? isSafeStatsBombId(matchId)
        ? { mode: 'profile' as const, profile: await getStatsBombMatchProfile(Number(matchId)) }
        : null
      : competitionId || seasonId
        ? isSafeStatsBombId(competitionId) && isSafeStatsBombId(seasonId)
          ? { mode: 'matches' as const, matches: await getStatsBombMatches(Number(competitionId), Number(seasonId)) }
          : null
        : { mode: 'catalog' as const, competitions: await getStatsBombCatalog() }

    if (!response) return NextResponse.json({ error: 'Parámetros de investigación no válidos.' }, { status: 400 })
    return NextResponse.json({ ...response, sourceUrl: STATSBOMB_SOURCE_URL, termsUrl: STATSBOMB_TERMS_URL }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('statsbomb research read failed', error)
    return NextResponse.json({ error: 'No se pudo consultar StatsBomb Open Data. Conserva tu análisis actual e inténtalo de nuevo.' }, { status: 502 })
  }
}
