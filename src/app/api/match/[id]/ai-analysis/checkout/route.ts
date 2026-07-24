import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

const MONTHLY_QUOTA: Record<string, number> = { pro: 3, elite: 10 }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'es'

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createServiceClient()

  // ¿Ya pagó o ya se generó el análisis de este partido para este usuario?
  // (paid = ya desbloqueado aunque falte generar; generated = ya tiene el contenido)
  const { data: existing } = await supabaseAdmin
    .from('ai_analyses')
    .select('status, content')
    .eq('match_id', matchId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (existing?.status === 'generated' || existing?.status === 'paid' || existing?.status === 'generating') {
    return NextResponse.json({ alreadyPaid: true })
  }

  // ¿El usuario tiene plan Pro/Elite con cuota de análisis gratis este mes?
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('plan')
    .eq('id', session.user.id)
    .single()

  const plan = userData?.plan
  const quota = plan ? MONTHLY_QUOTA[plan] : undefined

  if (quota) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabaseAdmin
      .from('ai_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('payment_type', 'plan_quota')
      .gte('created_at', startOfMonth.toISOString())

    if ((count ?? 0) < quota) {
      // Dentro de la cuota del plan — desbloquear directo, sin pasar por Stripe
      await supabaseAdmin.from('ai_analyses').upsert({
        match_id: matchId,
        user_id: session.user.id,
        status: 'paid',
        payment_type: 'plan_quota',
        paid_at: new Date().toISOString(),
      }, { onConflict: 'match_id,user_id' })

      return NextResponse.json({ alreadyPaid: true, quotaUsed: true })
    }
  }

  // Fuera de cuota (o plan Free) — cobrar $1.39 normal vía Stripe
  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('home_team_name, away_team_name, league_name')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: 139, // $1.39
        product_data: {
          name: `Análisis IA: ${match.home_team_name} vs ${match.away_team_name}`,
          description: `${match.league_name} — análisis profundo con contexto e IA`,
        },
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${lang}/match/${matchId}?ai_paid=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${lang}/match/${matchId}`,
    customer_email: session.user.email,
    metadata: { userId: session.user.id, matchId, type: 'ai_analysis' },
  })

  await supabaseAdmin.from('ai_analyses').upsert({
    match_id: matchId,
    user_id: session.user.id,
    status: 'pending',
    payment_type: 'stripe',
    stripe_session_id: checkoutSession.id,
  }, { onConflict: 'match_id,user_id' })

  return NextResponse.json({ url: checkoutSession.url })
}
