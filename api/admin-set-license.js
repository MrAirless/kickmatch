import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'erles@gyhe.de'

function emailFromJwt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    return payload.email || null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const jwt = req.headers.authorization?.replace('Bearer ', '')
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' })
  const email = emailFromJwt(jwt)
  if (email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { userId, plan } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  await supabase.from('subscriptions').delete().eq('user_id', userId)

  if (plan && plan !== 'kein') {
    const { error } = await supabase.from('subscriptions').insert([{
      user_id: userId,
      plan,
      status: 'active',
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }])
    if (error) return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
