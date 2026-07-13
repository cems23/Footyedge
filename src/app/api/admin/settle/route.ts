import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['admin@footyedge.com', 'carlosmartens8@gmail.com']

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

  ;(async () => {
    await fetch(`${origin}/api/cron/settle-results`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(55000)
    }).catch(() => null)
  })()

  return NextResponse.json({ ok: true, message: 'Settle started in background' })
}
