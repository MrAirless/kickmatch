import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function subscribeUserToPush(userEmail) {
  if (!('PushManager' in window) || !('serviceWorker' in navigator)) return
  if (localStorage.getItem('push_subscribed') === userEmail) return

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) await existing.unsubscribe()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    })

    await supabase.from('push_subscriptions').upsert(
      { user_email: userEmail, subscription: subscription.toJSON() },
      { onConflict: 'user_email' }
    )

    localStorage.setItem('push_subscribed', userEmail)
  } catch (err) {
    console.error('Push subscription failed:', err)
  }
}
