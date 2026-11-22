import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/permissions'
import { runScheduledInjuryWatch } from '@/lib/injuryWatch'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function isAuthorized(req: NextRequest) {
  if (req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) return true
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const service = createServiceClient()
  const { data: account } = await service.from('users').select('email').eq('id', user.id).single()
  return isAdminEmail(account?.email ?? user.email)
}

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await runScheduledInjuryWatch())
  } catch (error) {
    console.error('scheduled injury-watch failed', error)
    return NextResponse.json({ success: false, error: 'El barrido diario de lesiones no pudo completarse.' }, { status: 502 })
  }
}
