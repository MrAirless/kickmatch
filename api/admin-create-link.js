import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'erles@gyhe.de'

function emailFromJwt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    return payload.email || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const jwt = req.headers.authorization?.replace('Bearer ', '')
    if (!jwt) return res.status(401).json({ error: 'Unauthorized' })

    const email = emailFromJwt(jwt)
    if (email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

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
    console.error('admin-create-link error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
