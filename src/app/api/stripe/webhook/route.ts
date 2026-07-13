import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId  = session.metadata?.userId
    const plan    = session.metadata?.plan
    if (userId && plan) {
      await supabase.from('users').upsert({
        id: userId, plan,
        subscription_status: 'active',
        stripe_customer_id:  session.customer as string,
      }, { onConflict: 'id' })
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const sub    = event.data.object as any
    const userId = sub.metadata?.userId
    const status = sub.status // active, past_due, canceled, unpaid
    if (userId) {
      if (status === 'active' || status === 'trialing') {
        const plan = sub.metadata?.plan
        if (plan) {
          await supabase.from('users').update({
            plan, subscription_status: status,
          }).eq('id', userId)
        }
      } else {
        // past_due, canceled, unpaid, incomplete_expired
        await supabase.from('users').update({
          plan: 'free', subscription_status: status,
        }).eq('id', userId)
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any
    const customerId = invoice.customer
    if (customerId) {
      await supabase.from('users').update({
        plan: 'free', subscription_status: 'past_due',
      }).eq('stripe_customer_id', customerId)
    }
  }

  return NextResponse.json({ received: true })
}
