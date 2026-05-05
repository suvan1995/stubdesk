// Supabase Edge Function — handles Stripe webhook events
// Deploy: supabase functions deploy stripe-webhook
// Add webhook in Stripe dashboard pointing to:
//   https://<project>.supabase.co/functions/v1/stripe-webhook
// Events to listen for:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  async function updateProfile(customerId: string, updates: Record<string, unknown>) {
    await supabase.from('profiles').update(updates).eq('stripe_customer_id', customerId)
  }

  function planFromPriceId(priceId: string): 'starter' | 'pro' {
    if (priceId === Deno.env.get('STRIPE_PRO_PRICE_ID'))     return 'pro'
    if (priceId === Deno.env.get('STRIPE_STARTER_PRICE_ID')) return 'starter'
    return 'starter'
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id ?? ''
      await updateProfile(sub.customer as string, {
        stripe_subscription_id: sub.id,
        subscription_status:    sub.status,
        plan:                   planFromPriceId(priceId),
        trial_ends_at:          sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
      })
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateProfile(sub.customer as string, {
        subscription_status:    'canceled',
        plan:                   'free',
        stripe_subscription_id: null,
      })
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await updateProfile(invoice.customer as string, { subscription_status: 'past_due' })
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
