import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAILS = ['admin@footyedge.com', 'carlosmartens8@gmail.com']
const LEAGUES = [2,13,3,848,39,40,41,42,140,141,135,136,78,79,61,62,88,94,203,144,128,71,253,262,113,103,169,307,164]

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('email').eq('id', user.id).single()
  if (!ADMIN_EMAILS.includes(userData?.email || '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const secret = process.env.CRON_SECRET
  const origin = req.nextUrl.origin
  const headers = { Authorization: `Bearer ${secret}` }

  // Run in background
  ;(async () => {
    for (let i = 0; i < LEAGUES.length; i += 3) {
      const batch = LEAGUES.slice(i, i + 3)
      await Promise.all(
        batch.map(id =>
          fetch(`${origin}/api/matches/analyze-league?leagueId=${id}`, { headers, signal: AbortSignal.timeout(55000) }).catch(() => null)
        )
      )
      await new Promise(r => setTimeout(r, 3000))
    }
    // Consolidate twice to ensure all data is captured
    await fetch(`${origin}/api/matches/consolidate`, { headers, signal: AbortSignal.timeout(30000) }).catch(() => null)
    await new Promise(r => setTimeout(r, 5000))
    await fetch(`${origin}/api/matches/consolidate`, { headers, signal: AbortSignal.timeout(30000) }).catch(() => null)
  })()

  return NextResponse.json({ ok: true, message: 'Refresh started' })
}
