import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createServiceClient()

  // ¿Ya pagó/generó este usuario el análisis de este partido?
  const { data: existing } = await supabaseAdmin
    .from('ai_analyses')
    .select('status, content')
    .eq('match_id', matchId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (existing?.status === 'generated' && existing.content) {
    return NextResponse.json({ alreadyPaid: true })
  }

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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/match/${matchId}?ai_paid=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/match/${matchId}`,
    customer_email: session.user.email,
    metadata: { userId: session.user.id, matchId, type: 'ai_analysis' },
  })

  // Registrar como pending para trackear el intento
  await supabaseAdmin.from('ai_analyses').upsert({
    match_id: matchId,
    user_id: session.user.id,
    status: 'pending',
    stripe_session_id: checkoutSession.id,
  }, { onConflict: 'match_id,user_id' })

  return NextResponse.json({ url: checkoutSession.url })
}
