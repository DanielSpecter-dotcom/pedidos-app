import { useCart } from '../contexts/CartContext'

export function MobileOrderBar() {
  const { total, guardando, confirmarPedido } = useCart()

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-40 safe-bottom">
      <div className="px-5 pt-4 pb-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total</span>
          <span className="text-2xl font-black text-slate-800 leading-none tracking-tight">S/ {total.toFixed(2)}</span>
        </div>
        <button
          onClick={() => confirmarPedido()}
          disabled={guardando}
          className="w-1/2 xs:flex-1 bg-gradient-to-r from-guinda to-guinda-light text-white font-extrabold py-3.5 px-4 xs:px-6 rounded-[18px] shadow-lg shadow-guinda/30 active:scale-[0.96] transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-70"
        >
          {guardando ? (
            <span className="tracking-wide text-xs xs:text-sm uppercase">Guardando...</span>
          ) : (
            <>
              <span className="tracking-wide text-xs xs:text-sm uppercase">Confirmar</span>
              <span className="text-lg leading-none shrink-0">➜</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
