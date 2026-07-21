import { useEffect } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { useCart } from '../contexts/CartContext'

export function ClienteMeseroPanel() {
  const { meseros } = useAppData()
  const { meseroId, setMeseroId, dni, setDni, nombreCliente, setNombreCliente, buscarClientePorDni } = useCart()

  // Mismo comportamiento que el <select> nativo de hoy: si no se elige nada,
  // queda seleccionado el primero de la lista una vez que carga.
  useEffect(() => {
    if (meseroId === null && meseros.length > 0) {
      setMeseroId(meseros[0].MeseroID)
    }
  }, [meseroId, meseros, setMeseroId])

  return (
    <div className="bg-white rounded-[24px] shadow-glass p-4 sm:p-5 border border-slate-200/60 shrink-0 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-guinda/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <div className="space-y-3.5 relative z-10">
        <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-white text-guinda flex items-center justify-center text-xl shrink-0 shadow-sm font-bold">
            🤵
          </div>
          <select
            value={meseroId ?? ''}
            onChange={(e) => setMeseroId(parseInt(e.target.value))}
            className="w-full bg-transparent font-bold text-slate-700 text-sm focus:outline-none pr-8"
          >
            {meseros.length === 0 && (
              <option value="" disabled>
                Seleccionando cajero...
              </option>
            )}
            {meseros.map((m) => (
              <option key={m.MeseroID} value={m.MeseroID}>
                {m.Nombres}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="DNI"
            value={dni}
            onChange={(e) => {
              setDni(e.target.value)
              buscarClientePorDni(e.target.value)
            }}
            className="w-[30%] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-amarillo focus:ring-4 focus:ring-amarillo/20 outline-none text-center transition-all placeholder-slate-400 shadow-inner"
          />
          <input
            type="text"
            placeholder="Nombre completo del cliente"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-amarillo focus:ring-4 focus:ring-amarillo/20 outline-none transition-all placeholder-slate-400 shadow-inner"
          />
        </div>
      </div>
    </div>
  )
}
