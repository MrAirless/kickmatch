import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:info@kickmatch.net',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userEmail, title, body, url } = req.body

  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_email', userEmail)
    .single()

  if (!data) return res.status(200).json({ ok: true })

  try {
    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({ title, body, url: url || '/spiele?tab=meine' })
    )
    res.status(200).json({ ok: true })
  } catch (err) {
    if (err.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('user_email', userEmail)
    }
    res.status(200).json({ ok: true })
  }
}
