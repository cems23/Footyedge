import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MONTHLY_QUOTA: Record<string, number> = { pro: 3, elite: 10 }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ plan: null, quota: 0, used: 0, remaining: 0 })

  const supabaseAdmin = createServiceClient()
  const { data: userData } = await supabaseAdmin.from('users').select('plan').eq('id', user.id).single()
  const plan = userData?.plan
  const quota = plan ? MONTHLY_QUOTA[plan] : undefined

  if (!quota) {
    return NextResponse.json({ plan: plan ?? 'free', quota: 0, used: 0, remaining: 0 })
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('payment_type', 'plan_quota')
    .gte('created_at', startOfMonth.toISOString())

  const used = count ?? 0
  return NextResponse.json({ plan, quota, used, remaining: Math.max(0, quota - used) })
}
