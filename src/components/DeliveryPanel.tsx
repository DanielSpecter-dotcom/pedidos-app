import { useCart } from '../contexts/CartContext'

export function DeliveryPanel() {
  const { delivery, setDelivery } = useCart()

  return (
    <div
      id="panelDelivery"
      className="bg-white lg:rounded-[24px] shadow-glass border-y lg:border border-slate-200/60 flex flex-col lg:h-full lg:flex-1 w-full"
    >
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4 bg-white lg:rounded-t-[24px]">
        <div className="w-12 h-12 bg-gradient-to-br from-guinda to-guinda-light rounded-[16px] flex items-center justify-center text-2xl shrink-0 shadow-soft shadow-guinda/20 text-white">
          🛵
        </div>
        <div>
          <h2 className="font-extrabold text-slate-800 text-lg leading-tight">Datos de Envío</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Llega directo a su puerta</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto thin-scrollbar bg-slate-50/30">
        <div className="space-y-5 max-w-lg mx-auto">
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Destinatario <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-guinda focus-within:ring-4 focus-within:ring-guinda/10 transition-all shadow-sm">
              <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-xl border-r border-slate-100 shrink-0 text-slate-400">
                👤
              </div>
              <input
                type="text"
                placeholder="Nombre completo"
                value={delivery.nombre}
                onChange={(e) => setDelivery({ nombre: e.target.value })}
                className="flex-1 h-12 px-4 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Dirección <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-guinda focus-within:ring-4 focus-within:ring-guinda/10 transition-all shadow-sm">
              <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-xl border-r border-slate-100 shrink-0 text-slate-400">
                📍
              </div>
              <input
                type="text"
                placeholder="Jr. Independencia 123"
                value={delivery.direccion}
                onChange={(e) => setDelivery({ direccion: e.target.value })}
                className="flex-1 h-12 px-4 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Teléfono <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-guinda focus-within:ring-4 focus-within:ring-guinda/10 transition-all shadow-sm">
              <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-xl border-r border-slate-100 shrink-0 text-slate-400">
                📞
              </div>
              <input
                type="tel"
                placeholder="999 999 999"
                maxLength={15}
                value={delivery.telefono}
                onChange={(e) => setDelivery({ telefono: e.target.value })}
                className="flex-1 h-12 px-4 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
