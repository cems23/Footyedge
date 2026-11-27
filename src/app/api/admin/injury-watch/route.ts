import { NextRequest, NextResponse } from 'next/server'
import { clearInjuryWatchHistory, getLatestInjuryWatch, normalizeWatchLeagueIds, runInjuryWatch, saveInjuryWatchSettings } from '@/lib/injuryWatch'
import { isAdminEmail } from '@/lib/permissions'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: account } = await service.from('users').select('email').eq('id', user.id).single()
  return isAdminEmail(account?.email ?? user.email) ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    return NextResponse.json(await getLatestInjuryWatch())
  } catch (error) {
    console.error('injury-watch read failed', error)
    return NextResponse.json({ error: 'No se pudo cargar el barrido de lesiones.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const leagueIds = normalizeWatchLeagueIds(body.leagueIds)
  if (!leagueIds.length) return NextResponse.json({ error: 'Selecciona al menos una competición válida.' }, { status: 400 })
  try {
    const settings = await saveInjuryWatchSettings({ leagueIds, enabled: body.enabled === true, updatedBy: user.id })
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('injury-watch settings failed', error)
    return NextResponse.json({ error: 'No se pudo guardar la selección.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const leagueIds = normalizeWatchLeagueIds(body.leagueIds)
  if (!leagueIds.length) return NextResponse.json({ error: 'Selecciona al menos una competición válida.' }, { status: 400 })
  try {
    const result = await runInjuryWatch({ leagueIds, trigger: 'manual' })
    return NextResponse.json(result)
  } catch (error) {
    console.error('manual injury-watch failed', error)
    return NextResponse.json({ error: 'El barrido no pudo completarse. Conservamos el último resultado válido.' }, { status: 502 })
  }
}

export async function DELETE() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    await clearInjuryWatchHistory()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('injury-watch clear failed', error)
    return NextResponse.json({ error: 'No se pudieron borrar los resultados de lesiones.' }, { status: 500 })
  }
}
