import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppData } from '../contexts/AppDataContext'
import { extrasPorCategoria } from '../lib/extras'
import { ExtrasCheckboxList } from './ExtrasCheckboxList'
import { PersonalizeModal } from './PersonalizeModal'
import { ProductoSearchSelect } from './ProductoSearchSelect'
import type { EstadoPedido, PlatoEditar } from '../types'

interface EditarPedidoModalProps {
  // Apertura desde el mapa de mesas (MESA): resuelve el pedido buscando en
  // AsignacionMesas. Apertura directa (Llevar/Recoger/Delivery, ver
  // PedidosActivosModal): pasa pedidoId y se salta esa búsqueda.
  pedidoId?: number
  mesaId?: number
  numeroMesa?: string
  onClose: () => void
  onGuardado: () => void
}

interface PedidoEditando {
  pedidoID: number
  estadoPedido: EstadoPedido
  labelUbicacion: string
}

export function EditarPedidoModal({ pedidoId, mesaId, numeroMesa, onClose, onGuardado }: EditarPedidoModalProps) {
  const { productos, extras } = useAppData()

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pedido, setPedido] = useState<PedidoEditando | null>(null)
  const [platos, setPlatos] = useState<PlatoEditar[]>([])
  const [platosEliminar, setPlatosEliminar] = useState<number[]>([])
  const [guardando, setGuardando] = useState(false)
  const [personalizeIndex, setPersonalizeIndex] = useState<number | null>(null)

  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [esLlevar, setEsLlevar] = useState(false)
  const [extrasSeleccionados, setExtrasSeleccionados] = useState<Set<number>>(new Set())

  const productoSeleccionado = productos.find((p) => p.ProductoID === parseInt(productoId))
  const extrasCheckbox = useMemo(
    () => extrasPorCategoria(extras, productoSeleccionado?.CategoriaID ?? null, 'CHECKBOX'),
    [extras, productoSeleccionado],
  )

  const total = platos.filter((p) => p.estadoPlato !== 'SERVIDO').reduce((sum, p) => sum + p.cantidad * p.precioUnit, 0)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        let pedidoIdActual: number

        if (pedidoId !== undefined) {
          pedidoIdActual = pedidoId
        } else if (mesaId !== undefined) {
          const { data: asigs } = await supabase.from('AsignacionMesas').select('PedidoID').eq('MesaID', mesaId)
          if (!asigs || asigs.length === 0) {
            if (!cancelado) setError('No se encontró pedido activo para esta mesa.')
            return
          }

          const pedidoIDs = asigs.map((a) => a.PedidoID)

          const { data: pedidosMesa } = await supabase
            .from('Pedidos')
            .select('PedidoID')
            .in('PedidoID', pedidoIDs)
            .neq('EstadoPedido', 'ANULADO')
            .neq('EstadoPedido', 'PAGADO')
            .order('FechaCreacion', { ascending: false })

          if (!pedidosMesa || pedidosMesa.length === 0) {
            if (!cancelado) setError('No hay pedidos activos para esta mesa.')
            return
          }

          pedidoIdActual = pedidosMesa[0].PedidoID
        } else {
          if (!cancelado) setError('No se especificó qué pedido editar.')
          return
        }

        const { data: pedidoActual } = await supabase.from('Pedidos').select('*').eq('PedidoID', pedidoIdActual).single()

        if (!pedidoActual) {
          if (!cancelado) setError('No se encontró el pedido.')
          return
        }

        let labelUbicacion: string
        if (pedidoActual.TipoServicio === 'MESA') {
          const { data: todasAsigs } = await supabase
            .from('AsignacionMesas')
            .select('MesaID')
            .eq('PedidoID', pedidoActual.PedidoID)

          labelUbicacion = numeroMesa ? `Mesa ${numeroMesa}` : 'Mesa'
          if (todasAsigs && todasAsigs.length > 0) {
            const mesaIdsDelPedido = todasAsigs.map((a) => a.MesaID)
            const { data: mesasData } = await supabase
              .from('Mesas')
              .select('NumeroMesa')
              .in('MesaID', mesaIdsDelPedido)
              .order('NumeroMesa', { ascending: true })
            if (mesasData && mesasData.length > 0) {
              labelUbicacion = 'Mesa ' + mesasData.map((m) => m.NumeroMesa).join(' + ')
            }
          }
        } else {
          // Llevar/Recoger/Delivery: sin mesa, se identifica por tipo +
          // el nombre suelto guardado sin crear un Cliente (ver
          // CartContext.confirmarPedido).
          const tipoLabel =
            pedidoActual.TipoServicio === 'LLEVAR'
              ? '🥡 Para Llevar'
              : pedidoActual.TipoServicio === 'RECOGER'
                ? '🎒 Para Recoger'
                : pedidoActual.TipoServicio === 'DELIVERY'
                  ? '🛵 Delivery'
                  : pedidoActual.TipoServicio
          labelUbicacion = pedidoActual.NombreDestinatario ? `${tipoLabel} — ${pedidoActual.NombreDestinatario}` : tipoLabel
        }

        const { data: detalles } = await supabase
          .from('DetallePedido')
          .select('*')
          .eq('PedidoID', pedidoActual.PedidoID)
          .order('FechaAgregado', { ascending: true })

        const dictNombres: Record<number, string> = {}
        const dictCategorias: Record<number, number | null> = {}
        productos.forEach((p) => {
          dictNombres[p.ProductoID] = p.Nombre
          dictCategorias[p.ProductoID] = p.CategoriaID
        })

        const platosOrdenados: PlatoEditar[] = [
          ...(detalles || []).filter((d) => d.EstadoPlato === 'SERVIDO'),
          ...(detalles || []).filter((d) => d.EstadoPlato === 'EN_COLA'),
        ].map((d) => ({
          detalleID: d.DetalleID,
          productoID: d.ProductoID,
          categoriaId: dictCategorias[d.ProductoID] ?? null,
          nombre: dictNombres[d.ProductoID] || 'Producto',
          cantidad: d.Cantidad,
          precioUnit: d.PrecioUnitario,
          precioBase: d.PrecioUnitario,
          notas: d.Notas || '',
          esLlevar: d.EsParaLlevar,
          estadoPlato: d.EstadoPlato,
          esNuevo: false,
        }))

        if (!cancelado) {
          setPedido({ pedidoID: pedidoActual.PedidoID, estadoPedido: pedidoActual.EstadoPedido, labelUbicacion })
          setPlatos(platosOrdenados)
        }
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [pedidoId, mesaId, numeroMesa, productos])

  function toggleExtra(extraId: number, marcado: boolean) {
    setExtrasSeleccionados((prev) => {
      const next = new Set(prev)
      if (marcado) next.add(extraId)
      else next.delete(extraId)
      return next
    })
  }

  function agregarPlatoEditar() {
    if (!productoSeleccionado) {
      alert('Selecciona un producto')
      return
    }
    const extrasElegidos = extras.filter((ex) => extrasSeleccionados.has(ex.ExtraID))
    const precioConExtras = productoSeleccionado.Precio + extrasElegidos.reduce((s, ex) => s + ex.PrecioUnitario, 0)
    const notas = extrasElegidos.map((ex) => `+${ex.Nombre}`).join(', ')

    setPlatos((prev) => [
      ...prev,
      {
        detalleID: null,
        productoID: productoSeleccionado.ProductoID,
        categoriaId: productoSeleccionado.CategoriaID,
        nombre: productoSeleccionado.Nombre,
        cantidad,
        precioUnit: precioConExtras,
        precioBase: productoSeleccionado.Precio,
        notas,
        esLlevar,
        estadoPlato: 'NUEVO',
        esNuevo: true,
      },
    ])

    setProductoId('')
    setCantidad(1)
    setEsLlevar(false)
    setExtrasSeleccionados(new Set())
  }

  function eliminarPlatoEditar(index: number) {
    const plato = platos[index]
    if (plato.detalleID) setPlatosEliminar((prev) => [...prev, plato.detalleID as number])
    setPlatos((prev) => prev.filter((_, i) => i !== index))
  }

  function updatePlato(index: number, patch: Partial<PlatoEditar>) {
    setPlatos((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  async function guardarCambiosEditar() {
    if (!pedido) return
    setGuardando(true)
    try {
      for (const id of platosEliminar) {
        const { error } = await supabase.from('DetallePedido').delete().eq('DetalleID', id)
        if (error) throw error
      }

      const platosExistentes = platos.filter((p) => p.detalleID && !p.esNuevo && p.estadoPlato === 'EN_COLA')
      for (const p of platosExistentes) {
        const { error } = await supabase
          .from('DetallePedido')
          .update({ Cantidad: p.cantidad, PrecioUnitario: p.precioUnit, Notas: p.notas })
          .eq('DetalleID', p.detalleID as number)
        if (error) throw error
      }

      const platosNuevos = platos.filter((p) => p.esNuevo)
      if (platosNuevos.length > 0) {
        const ahora = new Date().toISOString()
        const nuevos = platosNuevos.map((p) => ({
          PedidoID: pedido.pedidoID,
          ProductoID: p.productoID,
          Cantidad: p.cantidad,
          PrecioUnitario: p.precioUnit,
          Notas: p.notas || '',
          EsParaLlevar: p.esLlevar || false,
          EstadoPlato: 'EN_COLA',
          FechaAgregado: ahora,
        }))

        const { error: errInsert } = await supabase.from('DetallePedido').insert(nuevos)
        if (errInsert) throw errInsert

        const { data: pedidoActual } = await supabase
          .from('Pedidos')
          .select('EstadoPedido')
          .eq('PedidoID', pedido.pedidoID)
          .single()

        const estadoActual = pedidoActual?.EstadoPedido || pedido.estadoPedido

        if (estadoActual === 'SERVIDO' || estadoActual === 'PAGADO') {
          const { error: errUpdate } = await supabase
            .from('Pedidos')
            .update({ EstadoPedido: 'PENDIENTE' })
            .eq('PedidoID', pedido.pedidoID)
          if (errUpdate) throw errUpdate
        }
      }

      const nuevoTotal = platos
        .filter((p) => p.estadoPlato !== 'SERVIDO')
        .reduce((sum, p) => sum + p.cantidad * p.precioUnit, 0)

      const { error: errTotal } = await supabase.from('Pedidos').update({ Total: nuevoTotal }).eq('PedidoID', pedido.pedidoID)
      if (errTotal) throw errTotal

      alert('✅ Pedido actualizado. Los platos nuevos están al final de la cola en cocina.')
      onGuardado()
      onClose()
    } catch (err) {
      console.error('Error al guardar:', err)
      alert('❌ Error al guardar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGuardando(false)
    }
  }

  const platoPersonalizando = personalizeIndex !== null ? platos[personalizeIndex] : null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-opacity fade-animate" onClick={onClose}></div>
      <div className="relative w-full md:w-[580px] bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden modal-animate flex flex-col h-auto max-h-[calc(100dvh-1.5rem)] border border-slate-100 z-10 max-w-[calc(100vw-1.5rem)] sm:max-w-[95vw]">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4 sm:px-6 sm:py-5 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-[16px] flex items-center justify-center text-white text-xl font-black border border-white/10 backdrop-blur-sm shadow-inner">
              🍽️
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-extrabold text-lg leading-tight tracking-wide">
                {pedido ? `Pedido #${pedido.pedidoID}` : numeroMesa ? `Mesa ${numeroMesa}` : 'Cargando...'}
              </h3>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">
                {cargando ? 'Cargando pedido...' : pedido ? pedido.labelUbicacion : '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pedido && (
              <span
                className={`hidden xs:inline-block text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                  pedido.estadoPedido === 'SERVIDO'
                    ? 'bg-green-500/30 text-white border border-green-300/30'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                {pedido.estadoPedido}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center font-bold hover:bg-white/20 active:scale-90 transition-all backdrop-blur-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-3 bg-white border-b border-slate-100 shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Sumar al pedido</p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <ProductoSearchSelect
                productos={productos}
                value={productoId}
                onChange={(id) => {
                  setProductoId(id)
                  setExtrasSeleccionados(new Set())
                }}
                placeholder="Elige producto..."
                className="flex-1"
              />
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-[60px] shrink-0 text-center font-bold border border-slate-200 rounded-2xl h-12 text-sm focus:border-guinda focus:bg-white focus:outline-none focus:ring-4 focus:ring-guinda/10 shadow-inner bg-slate-50"
              />
            </div>
            <ExtrasCheckboxList extras={extrasCheckbox} seleccionados={extrasSeleccionados} onToggle={toggleExtra} />
            <button
              onClick={agregarPlatoEditar}
              className="w-full h-12 bg-gradient-to-r from-amarillo to-amber-400 text-slate-900 font-extrabold rounded-2xl text-xs active:scale-95 transition-all shadow-md shadow-amarillo/20 border border-amber-300 tracking-wider uppercase"
            >
              + Añadir al Pedido
            </button>
          </div>
          <label className="flex items-center w-fit gap-2 mt-3 text-[11px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors">
            <input
              type="checkbox"
              checked={esLlevar}
              onChange={(e) => setEsLlevar(e.target.checked)}
              className="accent-amarillo w-4 h-4 rounded shadow-sm"
            />{' '}
            <span>Llevar extra</span>
          </label>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 thin-scrollbar bg-slate-50/50 relative">
          {cargando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50/80 backdrop-blur-sm z-10">
              <div className="w-10 h-10 border-[4px] border-slate-200 border-t-guinda rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
            </div>
          )}

          {!cargando && error && (
            <div className="p-8 flex flex-col items-center justify-center text-red-400 gap-2">
              <span className="text-3xl">⚠️</span>
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {!cargando && !error && platos.length === 0 && (
            <div className="p-8 flex flex-col items-center justify-center text-gray-300 gap-2">
              <span className="text-3xl">🍽️</span>
              <span className="text-xs font-bold uppercase tracking-wider">Sin platos</span>
            </div>
          )}

          {!cargando && !error && platos.length > 0 && (
            <div className="divide-y divide-slate-100/50">
              {platos.map((plato, index) => {
                const esServido = plato.estadoPlato === 'SERVIDO'
                const subtotal = plato.cantidad * plato.precioUnit
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-4 py-3 ${esServido ? 'opacity-50 bg-gray-50/50' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <span className="bg-gray-100 text-gray-600 font-bold text-xs px-2 py-1 rounded-md shrink-0 border border-gray-200">
                      {plato.cantidad}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-0.5">
                        <span className="font-bold text-gray-800 text-xs">{plato.nombre}</span>
                        {esServido && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase ml-1.5">
                            SERVIDO
                          </span>
                        )}
                        {!esServido && plato.esNuevo && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 uppercase ml-1.5">
                            NUEVO
                          </span>
                        )}
                      </div>
                      {plato.notas && <div className="text-[10px] text-guinda font-medium mt-0.5 italic">📝 {plato.notas}</div>}
                    </div>
                    <span className="font-bold text-xs text-gray-600 whitespace-nowrap">S/ {subtotal.toFixed(2)}</span>
                    {!esServido && (
                      <button
                        onClick={() => setPersonalizeIndex(index)}
                        title="Personalizar"
                        className="w-7 h-7 rounded-full hover:bg-guinda/10 text-slate-300 hover:text-guinda flex items-center justify-center text-sm transition-colors shrink-0"
                      >
                        ✏️
                      </button>
                    )}
                    {!esServido ? (
                      <button
                        onClick={() => eliminarPlatoEditar(index)}
                        className="w-7 h-7 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center text-sm transition-colors shrink-0"
                      >
                        ✕
                      </button>
                    ) : (
                      <div className="w-7 shrink-0"></div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0 safe-bottom">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5">Total de la Cuenta</span>
              <span className="text-3xl font-black text-slate-800 tracking-tight">S/ {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="w-1/3 min-w-0 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all"
            >
              CERRAR
            </button>
            <button
              onClick={guardarCambiosEditar}
              disabled={guardando || cargando || !!error}
              className="flex-1 min-w-0 bg-gradient-to-r from-guinda to-guinda-light text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg shadow-guinda/30 border border-guinda-light/50 tracking-wide whitespace-nowrap disabled:opacity-70"
            >
              {guardando ? 'Guardando...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </div>
      </div>

      {platoPersonalizando && personalizeIndex !== null && (
        <PersonalizeModal
          titulo={platoPersonalizando.nombre}
          categoriaId={platoPersonalizando.categoriaId}
          precioBase={platoPersonalizando.precioBase}
          onSave={({ precioUnit, notas }) => updatePlato(personalizeIndex, { precioUnit, notas })}
          onClose={() => setPersonalizeIndex(null)}
        />
      )}
    </div>
  )
}
