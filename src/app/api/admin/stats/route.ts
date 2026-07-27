import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['admin@footyedge.com', 'carlosmartens8@gmail.com']

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('email').eq('id', user.id).single()
  if (!ADMIN_EMAILS.includes(me?.email ?? '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const admin = createServiceClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const today = now.toISOString().split('T')[0]

  // ── USUARIOS ──
  const { data: allUsers } = await admin.from('users').select('email, plan, subscription_status, created_at')
  const byPlan: Record<string, number> = { free: 0, pro: 0, elite: 0 }
  for (const u of allUsers ?? []) {
    const p = u.plan ?? 'free'
    byPlan[p] = (byPlan[p] ?? 0) + 1
  }
  const recentSignups = (allUsers ?? [])
    .filter(u => u.created_at >= sevenDaysAgo)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(u => ({ email: u.email, plan: u.plan, created_at: u.created_at }))
  const signupsLast30d = (allUsers ?? []).filter(u => u.created_at >= thirtyDaysAgo).length

  // ── RENDIMIENTO DEL MODELO ──
  const { data: perf } = await admin.from('model_performance').select('market, result, profit, league, match_date')
  const globalPerf = { wins: 0, total: 0, profit: 0 }
  const byMarket: Record<string, { wins: number; total: number; profit: number }> = {}
  const byLeague: Record<string, { wins: number; total: number; profit: number }> = {}
  for (const p of perf ?? []) {
    globalPerf.total++
    globalPerf.profit += p.profit
    if (p.result === 'win') globalPerf.wins++

    byMarket[p.market] ??= { wins: 0, total: 0, profit: 0 }
    byMarket[p.market].total++
    byMarket[p.market].profit += p.profit
    if (p.result === 'win') byMarket[p.market].wins++

    const lg = p.league ?? 'Unknown'
    byLeague[lg] ??= { wins: 0, total: 0, profit: 0 }
    byLeague[lg].total++
    byLeague[lg].profit += p.profit
    if (p.result === 'win') byLeague[lg].wins++
  }
  const byLeagueSorted = Object.entries(byLeague)
    .map(([league, s]) => ({ league, ...s, hr: s.total ? s.wins / s.total : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)

  // ── SALUD DEL PIPELINE ──
  const { data: lastMatchUpdate } = await admin
    .from('matches').select('updated_at').order('updated_at', { ascending: false }).limit(1).single()
  const { count: matchesToday } = await admin
    .from('matches').select('id', { count: 'exact', head: true })
    .gte('kickoff_at', today + 'T00:00:00').lt('kickoff_at', today + 'T23:59:59')
  const { count: rankingsToday } = await admin
    .from('daily_rankings').select('id', { count: 'exact', head: true }).eq('date', today)
  const { count: unsettled } = await admin
    .from('matches').select('id', { count: 'exact', head: true })
    .is('home_goals', null)
    .lte('kickoff_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
    .gte('kickoff_at', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
  const { data: leaguesTodayRaw } = await admin
    .from('matches').select('league_name')
    .gte('kickoff_at', today + 'T00:00:00').lt('kickoff_at', today + 'T23:59:59')
  const leaguesWithDataToday = new Set((leaguesTodayRaw ?? []).map(m => m.league_name)).size

  // ── ANÁLISIS IA ──
  const { data: aiAll } = await admin.from('ai_analyses').select('status, payment_type, created_at, paid_at')
  const aiGenerated = (aiAll ?? []).filter(a => a.status === 'generated').length
  const aiPaidStripe = (aiAll ?? []).filter(a => a.payment_type === 'stripe' && a.paid_at).length
  const aiQuotaUsed = (aiAll ?? []).filter(a => a.payment_type === 'plan_quota' && a.paid_at).length
  const aiRevenueEstimate = aiPaidStripe * 1.39
  const aiThisMonth = (aiAll ?? []).filter(a => a.created_at >= startOfMonth).length

  // ── PROBABILITY PICKS (ej. "Mejores BTTS del día", no son value bets con cuotas) ──
  const { data: probPicks } = await admin.from('probability_picks').select('market, result')
  const probByMarket: Record<string, { wins: number; total: number }> = {}
  for (const p of probPicks ?? []) {
    if (p.result === null) continue // aún sin liquidar
    probByMarket[p.market] ??= { wins: 0, total: 0 }
    probByMarket[p.market].total++
    if (p.result === 'win') probByMarket[p.market].wins++
  }
  const probabilityPicksPerformance = Object.entries(probByMarket).map(([market, s]) => ({
    market, ...s, hr: s.total ? s.wins / s.total : 0,
  }))

  return NextResponse.json({
    probabilityPicksPerformance,
    users: {
      total: allUsers?.length ?? 0,
      byPlan,
      signupsLast7d: recentSignups.length,
      signupsLast30d,
      recentSignups: recentSignups.slice(0, 20),
    },
    modelPerformance: {
      global: { ...globalPerf, hr: globalPerf.total ? globalPerf.wins / globalPerf.total : 0 },
      byMarket: Object.entries(byMarket).map(([market, s]) => ({ market, ...s, hr: s.total ? s.wins / s.total : 0 })),
      byLeague: byLeagueSorted,
    },
    pipeline: {
      lastMatchUpdatedAt: lastMatchUpdate?.updated_at ?? null,
      matchesToday: matchesToday ?? 0,
      leaguesWithDataToday,
      rankingsToday: rankingsToday ?? 0,
      unsettledOverdue: unsettled ?? 0,
    },
    aiAnalysis: {
      totalGenerated: aiGenerated,
      paidViaStripe: aiPaidStripe,
      paidViaQuota: aiQuotaUsed,
      revenueEstimateUsd: aiRevenueEstimate,
      generatedThisMonth: aiThisMonth,
    },
  })
}
