import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'erles@gyhe.de'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const jwt = req.headers.authorization?.replace('Bearer ', '')
    if (!jwt) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error: authError } = await supabase.auth.getUser(jwt)
    const user = data?.user
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden', detail: authError?.message })
    }

    const [{ data: subs, error: subsError }, { data: links }] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('plan', 'vereinslizenz').eq('status', 'active'),
      supabase.from('invite_links').select('*').order('created_at', { ascending: false }),
    ])

    if (subsError) return res.status(500).json({ error: subsError.message })

    const userIds = subs?.map((s) => s.user_id) || []
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, club_name, phone').in('id', userIds)
      : { data: [] }

    const vereine = (subs || []).map((s) => ({
      ...s,
      profile: profiles?.find((p) => p.id === s.user_id) || null,
    }))

    return res.status(200).json({ vereine, links: links || [] })
  } catch (err) {
    console.error('admin-get-data error:', err)
    return res.status(500).json({ error: err.message })
  }
}
