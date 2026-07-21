interface MobileKitchenBarProps {
  platosCount: number
  onVolver: () => void
}

export function MobileKitchenBar({ platosCount, onVolver }: MobileKitchenBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] z-40 safe-bottom">
      <div className="px-5 pt-4 pb-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">En cola</span>
          <span className="text-2xl font-black text-white leading-none tracking-tight">{platosCount} platos</span>
        </div>
        <button
          onClick={onVolver}
          className="w-1/2 xs:flex-1 bg-white text-slate-900 font-extrabold py-3.5 px-4 xs:px-6 rounded-[18px] active:scale-[0.96] transition-all flex items-center justify-center gap-2"
        >
          <span className="tracking-wide text-xs xs:text-sm uppercase">Volver</span>
        </button>
      </div>
    </div>
  )
}
