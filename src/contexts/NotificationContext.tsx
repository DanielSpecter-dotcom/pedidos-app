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

interface NotificationContextValue {
  avisos: AvisoMesero[]
  enviarAvisoMesero: (data: { pedidoId: number; labelUbicacion: string; clienteNombre: string }) => void
  descartarAviso: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoMesero[]>([])
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
  }

  function descartarAviso(id: string) {
    setAvisos((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ avisos, enviarAvisoMesero, descartarAviso }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  return ctx
}
