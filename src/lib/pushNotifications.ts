import { supabase } from './supabaseClient'

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// En iOS, Safari solo entrega push a una PWA agregada a la pantalla de
// inicio (modo standalone) — no a una pestaña normal, aunque el resto de la
// API esté disponible. Detectarlo para mostrar el mensaje correcto.
export function iosRequiereInstalar() {
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const esStandalone = window.matchMedia('(display-mode: standalone)').matches
  return esIOS && !esStandalone
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function estaSuscripto() {
  if (!pushSoportado()) return false
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  return sub !== null
}

export async function suscribirPush() {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('Permiso de notificaciones denegado')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function desuscribirPush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
