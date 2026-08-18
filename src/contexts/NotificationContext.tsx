import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { habilitarSonido, reproducirSonidoAviso } from '../lib/sound'

const CANAL_AVISOS = 'avisos-mesero'
const EVENTO_PEDIDO_LISTO = 'pedido-listo'

export interface AvisoMesero {
  id: string
  pedidoId: number
  labelUbicacion: string
  clienteNombre: string
}

export type TipoMensaje = 'success' | 'error'

export interface Mensaje {
  id: string
  texto: string
  tipo: TipoMensaje
}

const DURACION_MENSAJE_MS = 5000

interface NotificationContextValue {
  avisos: AvisoMesero[]
  enviarAvisoMesero: (data: { pedidoId: number; labelUbicacion: string; clienteNombre: string }) => void
  descartarAviso: (id: string) => void
  mensajes: Mensaje[]
  notificar: (texto: string, tipo?: TipoMensaje) => void
  descartarMensaje: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoMesero[]>([])
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(CANAL_AVISOS)
      .on('broadcast', { event: EVENTO_PEDIDO_LISTO }, ({ payload }) => {
        reproducirSonidoAviso()
        setAvisos((prev) => [
          ...prev,
          {
            id: `${payload.pedidoId}-${Date.now()}`,
            pedidoId: payload.pedidoId,
            labelUbicacion: payload.labelUbicacion,
            clienteNombre: payload.clienteNombre,
          },
        ])
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [])

  // Desbloquea el AudioContext en la primera interacción real del usuario,
  // para que el navegador no bloquee el sonido cuando llegue un aviso. Se
  // escuchan varios tipos de gesto (touch, mouse, teclado) porque en iOS
  // Safari el desbloqueo debe ocurrir sincrónicamente dentro del gesto.
  useEffect(() => {
    const eventos = ['pointerdown', 'touchend', 'keydown'] as const
    function onPrimeraInteraccion() {
      habilitarSonido()
      eventos.forEach((ev) => document.removeEventListener(ev, onPrimeraInteraccion))
    }
    eventos.forEach((ev) => document.addEventListener(ev, onPrimeraInteraccion))
    return () => eventos.forEach((ev) => document.removeEventListener(ev, onPrimeraInteraccion))
  }, [])

  function enviarAvisoMesero(data: { pedidoId: number; labelUbicacion: string; clienteNombre: string }) {
    channelRef.current?.send({ type: 'broadcast', event: EVENTO_PEDIDO_LISTO, payload: data })

    // Push real (llega con la app cerrada/pantalla bloqueada), además del
    // broadcast de arriba que solo avisa si la app está abierta. Si falla
    // (sin suscriptos, función caída, etc.) no debe romper el flujo de
    // cocina — el broadcast in-app ya se mandó.
    supabase.functions
      .invoke('send-push', {
        body: { title: 'Pedido listo', body: `${data.labelUbicacion} — ${data.clienteNombre}`, pedidoId: data.pedidoId },
      })
      .catch((err) => console.error('Error enviando push:', err))
  }

  function descartarAviso(id: string) {
    setAvisos((prev) => prev.filter((a) => a.id !== id))
  }

  // Reemplaza a los alert()/confirm() bloqueantes del navegador: mismo
  // sistema visual que ya usan los avisos de cocina (Toast), sin congelar
  // la UI del mesero mientras atiende una mesa.
  function notificar(texto: string, tipo: TipoMensaje = 'success') {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setMensajes((prev) => [...prev, { id, texto, tipo }])
    setTimeout(() => descartarMensaje(id), DURACION_MENSAJE_MS)
  }

  function descartarMensaje(id: string) {
    setMensajes((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ avisos, enviarAvisoMesero, descartarAviso, mensajes, notificar, descartarMensaje }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  return ctx
}
