import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'erles@gyhe.de'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const jwt = req.headers.authorization?.replace('Bearer ', '')
    if (!jwt) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error: authError } = await supabase.auth.getUser(jwt)
    const user = data?.user
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden', detail: authError?.message })
    }

    const { clubId } = req.body
    const inviteToken = randomUUID()

    const { data: link, error } = await supabase
      .from('invite_links')
      .insert({ token: inviteToken, club_id: clubId || null, created_by: 'admin' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ token: link.token })
  } catch (err) {
    console.error('admin-create-link error:', err)
    return res.status(500).json({ error: err.message })
  }
}
