import { useCart } from '../contexts/CartContext'

interface CartTableProps {
  onRowClick: (index: number) => void
}

export function CartTable({ onRowClick }: CartTableProps) {
  const { carrito, removeFromCart } = useCart()

  return (
    <div className="bg-white rounded-[24px] shadow-glass border border-slate-200/60 flex flex-col min-h-[250px] lg:min-h-0 lg:flex-1 lg:overflow-hidden relative mb-12 lg:mb-0">
      <div className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest grid grid-cols-[40px_1fr_75px_40px] items-center border-b border-slate-200 shrink-0 h-9 rounded-t-[24px] px-2">
        <div className="text-center">#</div>
        <div className="pl-2">Descripción</div>
        <div className="text-right pr-2">Total</div>
        <div></div>
      </div>

      <div className="lg:overflow-y-auto flex-1 thin-scrollbar p-0 bg-white rounded-b-[24px]">
        <table className="w-full text-left border-collapse table-fixed">
          <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
            {carrito.map((item, index) => {
              const subtotal = item.cantidad * item.precioUnit
              return (
                <tr
                  key={index}
                  onClick={() => onRowClick(index)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer group transition-colors"
                >
                  <td className="py-3 text-center align-middle">
                    <span className="font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md text-xs">{item.cantidad}</span>
                  </td>
                  <td className="py-3 px-2 align-middle">
                    <div className="font-bold text-gray-800 text-xs leading-tight">
                      {item.nombre}{' '}
                      {item.esLlevar && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded ml-1 border border-amber-200">
                          LLEVAR
                        </span>
                      )}
                    </div>
                    {item.notas && (
                      <div className="text-[10px] text-guinda font-medium mt-0.5 truncate italic">📝 {item.notas}</div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right align-middle font-bold text-gray-700 text-xs whitespace-nowrap">
                    S/ {subtotal.toFixed(2)}
                  </td>
                  <td className="py-3 text-center align-middle pr-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromCart(index)
                      }}
                      className="w-6 h-6 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {carrito.length === 0 && (
          <div className="h-40 lg:h-full flex flex-col items-center justify-center text-slate-300 select-none opacity-80">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 stroke-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Comienza a agregar</span>
          </div>
        )}
      </div>
    </div>
  )
}
