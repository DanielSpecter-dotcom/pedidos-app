import { useState } from 'react'
import { ServiceTypeTabs } from '../components/ServiceTypeTabs'
import { MesaGrid } from '../components/MesaGrid'
import { DeliveryPanel } from '../components/DeliveryPanel'
import { ClienteMeseroPanel } from '../components/ClienteMeseroPanel'
import { ProductPicker } from '../components/ProductPicker'
import { CartTable } from '../components/CartTable'
import { MobileOrderBar } from '../components/MobileOrderBar'
import { PersonalizeModal } from '../components/PersonalizeModal'
import { EditarPedidoModal } from '../components/EditarPedidoModal'
import { useCart } from '../contexts/CartContext'
import { useAppData } from '../contexts/AppDataContext'

export function PedidosView() {
  const { carrito, tipoServicio, total, guardando, confirmarPedido, updateCartItem } = useCart()
  const { refetchMesas } = useAppData()
  const [personalizeIndex, setPersonalizeIndex] = useState<number | null>(null)
  const itemPersonalizando = personalizeIndex !== null ? carrito[personalizeIndex] : null
  const [mesaEditando, setMesaEditando] = useState<{ mesaId: number; numeroMesa: string } | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 h-auto lg:h-full lg:p-6 w-full mobile-flow">
        {/* LEFT PANEL: Selections & Tables */}
        <div className="flex flex-col lg:col-span-7 xl:col-span-8 h-auto lg:h-full w-full max-w-full overflow-hidden">
          <ServiceTypeTabs />

          {tipoServicio === 'MESA' && (
            <MesaGrid onMesaOcupadaClick={(mesaId, numeroMesa) => setMesaEditando({ mesaId, numeroMesa })} />
          )}
          {tipoServicio === 'DELIVERY' && <DeliveryPanel />}
        </div>

        {/* RIGHT PANEL: Order Form & Cart */}
        <div className="flex flex-col lg:col-span-5 xl:col-span-4 h-auto lg:h-full lg:overflow-hidden p-5 lg:p-0 gap-4 lg:gap-5 max-w-full">
          <ClienteMeseroPanel />
          <ProductPicker />
          <CartTable onRowClick={setPersonalizeIndex} />

          <div className="hidden lg:flex flex-col bg-slate-800 rounded-[24px] shadow-xl overflow-hidden shrink-0">
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest mb-1">Total del pedido</p>
                <div className="text-3xl font-black text-white leading-none">S/ {total.toFixed(2)}</div>
              </div>
              <button
                onClick={() => confirmarPedido()}
                disabled={guardando}
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-extrabold py-4 px-8 rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-3 hover:shadow-xl hover:scale-[1.02] border border-emerald-400/50 disabled:opacity-70"
              >
                <span className="tracking-wide uppercase text-sm">{guardando ? 'Enviando...' : 'Enviar a Cocina'}</span>
                {!guardando && <span className="text-xl leading-none">➜</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <MobileOrderBar />

      {itemPersonalizando && personalizeIndex !== null && (
        <PersonalizeModal
          titulo={itemPersonalizando.nombre}
          categoriaId={itemPersonalizando.categoriaId}
          precioBase={itemPersonalizando.precioBase}
          onSave={({ precioUnit, notas }) => updateCartItem(personalizeIndex, { precioUnit, notas })}
          onClose={() => setPersonalizeIndex(null)}
        />
      )}

      {mesaEditando && (
        <EditarPedidoModal
          mesaId={mesaEditando.mesaId}
          numeroMesa={mesaEditando.numeroMesa}
          onClose={() => setMesaEditando(null)}
          onGuardado={() => refetchMesas()}
        />
      )}
    </>
  )
}
