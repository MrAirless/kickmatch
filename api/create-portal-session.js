import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customerId } = req.body
  if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
    return res.status(400).json({ error: 'Invalid customerId' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL}/profil`,
    })
    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Portal session error:', err)
    res.status(500).json({ error: err.message })
  }
}
