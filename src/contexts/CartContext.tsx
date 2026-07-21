import { createContext, useContext, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppData } from './AppDataContext'
import type { CartItem, DeliveryInfo, Extra, Producto, TipoServicio } from '../types'

interface CartContextValue {
  carrito: CartItem[]
  total: number
  tipoServicio: TipoServicio
  mesasSeleccionadas: Set<number>
  meseroId: number | null
  dni: string
  nombreCliente: string
  delivery: DeliveryInfo
  guardando: boolean

  setTipoServicio: (tipo: TipoServicio) => void
  toggleMesa: (mesaId: number) => void
  setMeseroId: (id: number) => void
  setDni: (dni: string) => void
  setNombreCliente: (nombre: string) => void
  setDelivery: (patch: Partial<DeliveryInfo>) => void
  buscarClientePorDni: (dni: string) => Promise<void>

  addToCart: (producto: Producto, cantidad: number, esLlevar: boolean, extras: Extra[]) => void
  updateCartItem: (index: number, patch: Partial<CartItem>) => void
  removeFromCart: (index: number) => void
  confirmarPedido: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

const DELIVERY_VACIO: DeliveryInfo = { nombre: '', direccion: '', telefono: '' }

export function CartProvider({ children }: { children: ReactNode }) {
  const { refetchMesas } = useAppData()

  const [carrito, setCarrito] = useState<CartItem[]>([])
  const [tipoServicio, setTipoServicioState] = useState<TipoServicio>('MESA')
  const [mesasSeleccionadas, setMesasSeleccionadas] = useState<Set<number>>(new Set())
  const [meseroId, setMeseroId] = useState<number | null>(null)
  const [dni, setDni] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [delivery, setDeliveryState] = useState<DeliveryInfo>(DELIVERY_VACIO)
  const [guardando, setGuardando] = useState(false)

  const total = carrito.reduce((sum, item) => sum + item.cantidad * item.precioUnit, 0)

  function setTipoServicio(tipo: TipoServicio) {
    setTipoServicioState(tipo)
    if (tipo !== 'MESA') setMesasSeleccionadas(new Set())
    if (tipo !== 'DELIVERY') setDeliveryState(DELIVERY_VACIO)
  }

  function toggleMesa(mesaId: number) {
    setMesasSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(mesaId)) next.delete(mesaId)
      else next.add(mesaId)
      return next
    })
  }

  function setDelivery(patch: Partial<DeliveryInfo>) {
    setDeliveryState((prev) => ({ ...prev, ...patch }))
  }

  async function buscarClientePorDni(dniValue: string) {
    if (dniValue.length < 8) return
    const { data: cliente } = await supabase
      .from('Clientes')
      .select('NombreCompleto, Telefono')
      .eq('NumeroDocumento', dniValue)
      .single()
    if (cliente) {
      setNombreCliente(cliente.NombreCompleto || '')
      if (tipoServicio === 'DELIVERY' && cliente.Telefono) {
        setDelivery({ telefono: cliente.Telefono })
      }
    }
  }

  function addToCart(producto: Producto, cantidad: number, esLlevar: boolean, extras: Extra[]) {
    const precioBase = producto.Precio
    const precioConExtras = precioBase + extras.reduce((s, ex) => s + ex.PrecioUnitario, 0)
    const notas = extras.map((ex) => `+${ex.Nombre}`).join(', ')

    setCarrito((prev) => {
      const idx = prev.findIndex(
        (item) => item.idProd === producto.ProductoID && item.esLlevar === esLlevar && item.notas === notas,
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad }
        return next
      }
      return [
        ...prev,
        {
          idProd: producto.ProductoID,
          nombre: producto.Nombre,
          categoriaId: producto.CategoriaID,
          precioUnit: precioConExtras,
          precioBase,
          cantidad,
          esLlevar,
          notas,
        },
      ]
    })
  }

  function updateCartItem(index: number, patch: Partial<CartItem>) {
    setCarrito((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeFromCart(index: number) {
    if (!confirm('¿Eliminar producto?')) return
    setCarrito((prev) => prev.filter((_, i) => i !== index))
  }

  async function obtenerIdClienteGenerico(): Promise<number> {
    const { data } = await supabase.from('Clientes').select('ClienteID').eq('NumeroDocumento', '00000000').single()
    if (data) return data.ClienteID
    alert('No se encontró el cliente genérico (DNI: 00000000). Créalo en Supabase.')
    throw new Error('Cliente genérico no encontrado')
  }

  async function obtenerIdCliente(dniValue: string, nombre: string): Promise<number> {
    if (!nombre || nombre.trim() === '' || nombre.trim() === 'CLIENTE GENÉRICO') {
      return obtenerIdClienteGenerico()
    }
    const nombreNormalizado = nombre.toUpperCase().trim()
    const dniNormalizado = dniValue ? dniValue.trim() : null

    if (dniNormalizado && dniNormalizado.length >= 8) {
      const { data: existente } = await supabase
        .from('Clientes')
        .select('ClienteID')
        .eq('NumeroDocumento', dniNormalizado)
        .single()
      if (existente) return existente.ClienteID
    }

    const { data: nuevo, error } = await supabase
      .from('Clientes')
      .insert([{ NombreCompleto: nombreNormalizado, NumeroDocumento: dniNormalizado || null }])
      .select('ClienteID')
      .single()
    if (error) throw new Error('No se pudo registrar el cliente.')
    return nuevo.ClienteID
  }

  async function confirmarPedido() {
    if (carrito.length === 0) {
      alert('⚠️ El pedido está vacío')
      return
    }

    if (tipoServicio === 'DELIVERY') {
      if (!delivery.nombre.trim()) return alert('⚠️ Ingresa el nombre del destinatario')
      if (!delivery.direccion.trim()) return alert('⚠️ Ingresa la dirección de entrega')
      if (!delivery.telefono.trim()) return alert('⚠️ Ingresa el teléfono de contacto')
    }

    const mesasIds = Array.from(mesasSeleccionadas)
    if (tipoServicio === 'MESA' && mesasIds.length === 0) {
      alert('⚠️ Por favor selecciona al menos una mesa.')
      return
    }

    setGuardando(true)
    try {
      let idClienteFinal: number
      if (tipoServicio === 'DELIVERY') {
        const nombreDelivery = delivery.nombre.trim()
        if (dni.trim().length >= 8) {
          idClienteFinal = await obtenerIdCliente(dni, nombreDelivery)
        } else if (nombreDelivery) {
          const { data: nuevo, error } = await supabase
            .from('Clientes')
            .insert([{ NombreCompleto: nombreDelivery.toUpperCase() }])
            .select('ClienteID')
            .single()
          if (error) throw new Error('No se pudo registrar el cliente.')
          idClienteFinal = nuevo.ClienteID
        } else {
          idClienteFinal = await obtenerIdClienteGenerico()
        }
      } else {
        idClienteFinal = await obtenerIdCliente(dni, nombreCliente)
      }

      const { data: pedidoData, error: pedidoError } = await supabase
        .from('Pedidos')
        .insert([
          {
            MeseroID: meseroId || 1,
            ClienteID: idClienteFinal,
            Total: total,
            TipoServicio: tipoServicio,
            EstadoPedido: 'PENDIENTE',
            FechaCreacion: new Date().toISOString(),
          },
        ])
        .select()
        .single()
      if (pedidoError) throw pedidoError

      const nuevoPedidoId = pedidoData.PedidoID

      const notasDelivery =
        tipoServicio === 'DELIVERY'
          ? `🚀 ${delivery.nombre.trim()} | 📍 ${delivery.direccion.trim()} | 📞 ${delivery.telefono.trim()}`
          : ''

      const ahora = new Date().toISOString()
      const detalles = carrito.map((item, i) => ({
        PedidoID: nuevoPedidoId,
        ProductoID: item.idProd,
        Cantidad: item.cantidad,
        PrecioUnitario: item.precioUnit,
        Notas: i === 0 && notasDelivery ? (item.notas ? `${item.notas} | ${notasDelivery}` : notasDelivery) : item.notas,
        EsParaLlevar: item.esLlevar,
        EstadoPlato: 'EN_COLA',
        FechaAgregado: ahora,
      }))

      const { error: detalleError } = await supabase.from('DetallePedido').insert(detalles)
      if (detalleError) throw detalleError

      if (mesasIds.length > 0) {
        await supabase.from('AsignacionMesas').insert(mesasIds.map((mId) => ({ PedidoID: nuevoPedidoId, MesaID: mId })))
        await supabase.from('Mesas').update({ Estado: 'OCUPADA' }).in('MesaID', mesasIds)
        await refetchMesas()
      }

      alert(`✅ ¡Pedido #${nuevoPedidoId} guardado correctamente!`)
      setCarrito([])
      setDeliveryState(DELIVERY_VACIO)
      setDni('')
      setNombreCliente('')
      setMesasSeleccionadas(new Set())
    } catch (err) {
      console.error('Error al guardar:', err)
      alert('❌ Error al guardar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <CartContext.Provider
      value={{
        carrito,
        total,
        tipoServicio,
        mesasSeleccionadas,
        meseroId,
        dni,
        nombreCliente,
        delivery,
        guardando,
        setTipoServicio,
        toggleMesa,
        setMeseroId,
        setDni,
        setNombreCliente,
        setDelivery,
        buscarClientePorDni,
        addToCart,
        updateCartItem,
        removeFromCart,
        confirmarPedido,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
