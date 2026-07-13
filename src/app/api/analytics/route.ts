import { NextRequest, NextResponse } from 'next/server'
import { calcPerformance } from '@/lib/math/metrics'
import type { Pick } from '@/lib/math/metrics'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '30'), 365)
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - days)

  const [{ data: picksRaw }, { data: userData }] = await Promise.all([
    supabase.from('picks').select('*').eq('user_id', user.id).gte('created_at', dateFrom.toISOString()).order('created_at'),
    supabase.from('users').select('plan, bankroll, initial_bankroll').eq('id', user.id).single(),
  ])

  const isPro = userData?.plan === 'pro' || userData?.plan === 'elite'
  const picks  = (picksRaw ?? []) as Pick[]
  const metrics = calcPerformance(picks, userData?.initial_bankroll ?? 100)

  // Free users: solo última semana de equity curve
  if (!isPro) metrics.equityCurve = metrics.equityCurve.slice(-7)

  return NextResponse.json({ metrics, plan: userData?.plan, isPro, days })
}
