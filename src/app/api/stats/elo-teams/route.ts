import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  let query = supabase
    .from('team_elo')
    .select('team_id, team_name, elo_rating, matches_played, league_id, league_name, logo_url')
    .order('elo_rating', { ascending: false })
    .limit(50)

  if (search.trim().length >= 2) {
    query = query.ilike('team_name', `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ teams: data ?? [] })
}
