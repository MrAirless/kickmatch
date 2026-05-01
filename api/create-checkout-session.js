import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const ALLOWED_ORIGINS = (process.env.APP_URL || '').split(',').map(s => s.trim()).filter(Boolean)
const ALLOWED_PRICE_IDS = [
  process.env.VITE_STRIPE_PRICE_EINZELLIZENZ,
  process.env.VITE_STRIPE_PRICE_VEREINSLIZENZ,
].filter(Boolean)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const origin = req.headers.origin
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' })
  }

  const { priceId, email, userId } = req.body

  if (!priceId || !ALLOWED_PRICE_IDS.includes(priceId)) {
    return res.status(400).json({ error: 'Invalid priceId' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' })
  }
  if (!userId || typeof userId !== 'string' || userId.length < 10) {
    return res.status(400).json({ error: 'Invalid userId' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { userId },
      success_url: `${origin}/abo/success`,
      cancel_url: `${origin}/preise`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
}
