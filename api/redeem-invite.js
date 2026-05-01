import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { token, userId, fullName } = req.body
    if (!token || !userId) return res.status(400).json({ error: 'Missing token or userId' })

    const { data: invite, error: fetchError } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (fetchError || !invite) {
      return res.status(400).json({ error: 'Invalid or already used invite link' })
    }

    await supabase
      .from('invite_links')
      .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName || null,
      club_id: invite.club_id || null,
    }, { onConflict: 'id' })

    return res.status(200).json({ success: true, clubId: invite.club_id })
  } catch (err) {
    console.error('redeem-invite error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
