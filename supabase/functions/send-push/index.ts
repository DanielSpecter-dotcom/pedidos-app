import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
webpush.setVapidDetails('mailto:soporte@melchorita.rest', vapidPublicKey, vapidPrivateKey)

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// El navegador manda un preflight OPTIONS antes del POST real porque la
// llamada es cross-origin (la app en Vercel llamando a Supabase) y lleva
// headers custom (Authorization). Sin esto, el navegador bloquea la
// respuesta antes de que el código de la app la vea — curl no lo sufre
// porque el preflight es un mecanismo exclusivo de navegadores.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const { title, body, pedidoId } = await req.json()

  const { data: subs, error } = await supabaseAdmin.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  if (error) return new Response(error.message, { status: 500, headers: corsHeaders })

  const resultados = await Promise.allSettled(
    (subs ?? []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, pedidoId }),
      ),
    ),
  )

  const idsVencidos = resultados
    .map((r, i) => ({ r, id: subs![i].id }))
    .filter(({ r }) => r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0))
    .map(({ id }) => id)

  if (idsVencidos.length > 0) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', idsVencidos)
  }

  return new Response(JSON.stringify({ enviados: resultados.filter((r) => r.status === 'fulfilled').length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
