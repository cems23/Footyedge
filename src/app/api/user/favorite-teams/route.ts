import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ favorites: [] })

  const admin = createServiceClient()
  const { data } = await admin.from('user_favorite_teams').select('team_id, team_name').eq('user_id', user.id)
  return NextResponse.json({ favorites: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId, teamName } = await req.json()
  if (!teamId || !teamName) return NextResponse.json({ error: 'teamId y teamName son requeridos' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin.from('user_favorite_teams').upsert({
    user_id: user.id, team_id: teamId, team_name: teamName,
  }, { onConflict: 'user_id,team_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId')
  if (!teamId) return NextResponse.json({ error: 'teamId es requerido' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin.from('user_favorite_teams').delete().eq('user_id', user.id).eq('team_id', parseInt(teamId))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
