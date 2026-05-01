import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        if (!userId) {
          console.error('checkout.session.completed: missing userId in metadata', session.id)
          break
        }

        const customerId = session.customer
        const subscriptionId = session.subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id

        const plan = priceId === process.env.VITE_STRIPE_PRICE_VEREINSLIZENZ
          ? 'vereinslizenz'
          : 'einzellizenz'

        const { error } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status: 'active',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        if (error) {
          console.error('checkout.session.completed: supabase upsert failed', error)
          return res.status(500).json({ error: 'Database error' })
        }

        if (plan === 'vereinslizenz') {
          const tokens = Array.from({ length: 10 }, () => ({
            token: randomUUID(),
            club_id: userId,
            created_by: 'system',
          }))
          const { error: linkError } = await supabase.from('invite_links').insert(tokens)
          if (linkError) console.error('invite_links insert failed', linkError)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('customer.subscription.updated: supabase update failed', error)
          return res.status(500).json({ error: 'Database error' })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('customer.subscription.deleted: supabase update failed', error)
          return res.status(500).json({ error: 'Database error' })
        }
        break
      }
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
