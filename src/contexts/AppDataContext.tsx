import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Producto, Mesa, Mesero, Extra, Categoria, EstadoPedido } from '../types'

interface AppDataContextValue {
  productos: Producto[]
  mesas: Mesa[]
  meseros: Mesero[]
  extras: Extra[]
  categorias: Categoria[]
  estadoPedidoPorMesa: Record<number, EstadoPedido>
  loading: boolean
  error: string | null
  refetchMesas: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [meseros, setMeseros] = useState<Mesero[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [estadoPedidoPorMesa, setEstadoPedidoPorMesa] = useState<Record<number, EstadoPedido>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetchMesas = useCallback(async () => {
    const { data, error } = await supabase
      .from('Mesas')
      .select('*')
      .order('MesaID', { ascending: true })
    if (error) throw error
    setMesas(data ?? [])
  }, [])

  // Para mostrar en la tarjeta de mesa si el pedido activo todavía está en
  // cocina (PENDIENTE) o ya se sirvió todo (SERVIDO) — no depende de la tabla
  // Mesas, así que necesita su propia suscripción realtime a Pedidos.
  const refetchEstadoPedidos = useCallback(async () => {
    const { data: pedidos, error: errPedidos } = await supabase
      .from('Pedidos')
      .select('PedidoID, EstadoPedido')
      .neq('EstadoPedido', 'ANULADO')
      .neq('EstadoPedido', 'PAGADO')
    if (errPedidos) throw errPedidos

    const pedidoIds = (pedidos ?? []).map((p) => p.PedidoID)
    if (pedidoIds.length === 0) {
      setEstadoPedidoPorMesa({})
      return
    }

    const { data: asignaciones, error: errAsig } = await supabase
      .from('AsignacionMesas')
      .select('PedidoID, MesaID')
      .in('PedidoID', pedidoIds)
    if (errAsig) throw errAsig

    const estadoPorPedido: Record<number, EstadoPedido> = {}
    ;(pedidos ?? []).forEach((p) => {
      estadoPorPedido[p.PedidoID] = p.EstadoPedido
    })

    const mapa: Record<number, EstadoPedido> = {}
    ;(asignaciones ?? []).forEach((a) => {
      const estado = estadoPorPedido[a.PedidoID]
      if (estado) mapa[a.MesaID] = estado
    })
    setEstadoPedidoPorMesa(mapa)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function cargarDatosIniciales() {
      setLoading(true)
      setError(null)
      try {
        const { data: prodData, error: errProd } = await supabase
          .from('Productos')
          .select('*')
          .eq('Activo', true)
        if (errProd) throw errProd

        const { data: mesasData, error: errMesas } = await supabase
          .from('Mesas')
          .select('*')
          .order('MesaID', { ascending: true })
        if (errMesas) throw errMesas

        const { data: meserosData, error: errMeseros } = await supabase
          .from('Meseros')
          .select('*')
          .order('MeseroID', { ascending: true })
        if (errMeseros) throw errMeseros

        const { data: categoriasData, error: errCategorias } = await supabase
          .from('Categorias')
          .select('*')
          .order('Orden', { ascending: true })
        if (errCategorias) throw errCategorias

        // Extras: tabla nueva, un try/catch propio para que si fallara no
        // tumbe el resto del arranque (mismo criterio que app.js).
        let extrasData: Extra[] = []
        try {
          const { data, error } = await supabase
            .from('Extras')
            .select('*')
            .eq('Activo', true)
            .order('Orden', { ascending: true })
          if (error) throw error
          extrasData = data ?? []
        } catch (extrasErr) {
          console.error('Error cargando Extras:', extrasErr)
        }

        if (!cancelled) {
          setProductos(prodData ?? [])
          setMesas(mesasData ?? [])
          setMeseros(meserosData ?? [])
          setCategorias(categoriasData ?? [])
          setExtras(extrasData)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error al iniciar:', err)
          setError('Error de conexión. Revisa consola (F12).')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargarDatosIniciales()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let channel: RealtimeChannel | null = supabase
      .channel('tabla-mesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Mesas' }, () => {
        refetchMesas()
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
      channel = null
    }
  }, [refetchMesas])

  useEffect(() => {
    refetchEstadoPedidos().catch((err) => console.error('Error cargando estado de pedidos por mesa:', err))

    let channel: RealtimeChannel | null = supabase
      .channel('estado-pedidos-mesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Pedidos' }, () => {
        refetchEstadoPedidos().catch((err) => console.error('Error cargando estado de pedidos por mesa:', err))
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
      channel = null
    }
  }, [refetchEstadoPedidos])

  return (
    <AppDataContext.Provider
      value={{ productos, mesas, meseros, extras, categorias, estadoPedidoPorMesa, loading, error, refetchMesas }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData debe usarse dentro de AppDataProvider')
  return ctx
}
