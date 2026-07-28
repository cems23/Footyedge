import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ presets: [] })

  const admin = createServiceClient()
  const { data } = await admin
    .from('rankings_presets')
    .select('id, name, league_id, scope, sort_by, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ presets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, leagueId, scope, sortBy } = await req.json()
  if (!name || !leagueId || !scope || !sortBy) {
    return NextResponse.json({ error: 'name, leagueId, scope y sortBy son requeridos' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('rankings_presets')
    .insert({ user_id: user.id, name, league_id: leagueId, scope, sort_by: sortBy })
    .select('id, name, league_id, scope, sort_by, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin.from('rankings_presets').delete().eq('user_id', user.id).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
