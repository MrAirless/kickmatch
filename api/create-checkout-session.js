import Stripe from 'stripe'

const ALLOWED_PRICE_IDS = [
  process.env.VITE_STRIPE_PRICE_EINZELLIZENZ,
  process.env.VITE_STRIPE_PRICE_VEREINSLIZENZ,
].filter(Boolean)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set')
    return res.status(500).json({ error: 'Payment not configured' })
  }

  const { priceId, email, userId } = req.body

  if (!priceId || (ALLOWED_PRICE_IDS.length > 0 && !ALLOWED_PRICE_IDS.includes(priceId))) {
    return res.status(400).json({ error: 'Invalid priceId' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' })
  }
  if (!userId || typeof userId !== 'string' || userId.length < 10) {
    return res.status(400).json({ error: 'Invalid userId' })
  }

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '').split('/').slice(0, 3).join('/')
  const successUrl = origin ? `${origin}/abo/success` : `${process.env.APP_URL}/abo/success`
  const cancelUrl = origin ? `${origin}/preise` : `${process.env.APP_URL}/preise`

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { userId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
