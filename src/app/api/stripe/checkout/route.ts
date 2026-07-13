import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

const PLANS: Record<string, string> = {
  pro:   process.env.STRIPE_PRICE_PRO!,
  elite: process.env.STRIPE_PRICE_ELITE!,
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  const priceId = PLANS[plan]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    customer_email: session.user.email,
    metadata: { userId: session.user.id, plan },
    subscription_data: { metadata: { userId: session.user.id, plan } },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
