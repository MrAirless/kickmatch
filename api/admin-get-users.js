import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'erles@gyhe.de'

function emailFromJwt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    return payload.email || null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const jwt = req.headers.authorization?.replace('Bearer ', '')
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' })
  const email = emailFromJwt(jwt)
  if (email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [
    { data: authData, error: usersError },
    { data: profiles },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('profiles').select('*'),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
  ])

  if (usersError) return res.status(500).json({ error: usersError.message })

  const users = (authData?.users || []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    rolle: u.user_metadata?.rolle || 'trainer',
    profile: profiles?.find(p => p.id === u.id) || null,
    subscription: subscriptions?.find(s => s.user_id === u.id) || null,
  }))

  return res.status(200).json({ users })
}
