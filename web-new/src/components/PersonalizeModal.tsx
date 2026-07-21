import { useMemo, useState } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { extrasPorCategoria } from '../lib/extras'

interface PersonalizeModalProps {
  titulo: string
  categoriaId: number | null
  precioBase: number
  onSave: (result: { precioUnit: number; notas: string }) => void
  onClose: () => void
}

export function PersonalizeModal({ titulo, categoriaId, precioBase, onSave, onClose }: PersonalizeModalProps) {
  const { extras } = useAppData()

  const extrasModal = useMemo(() => extrasPorCategoria(extras, categoriaId, 'CANTIDAD'), [extras, categoriaId])
  const [contadores, setContadores] = useState<Record<number, number>>(() =>
    Object.fromEntries(extrasModal.map((ex) => [ex.ExtraID, 0])),
  )
  const [notaManual, setNotaManual] = useState('')

  const precioTotal = precioBase + extrasModal.reduce((sum, ex) => sum + (contadores[ex.ExtraID] || 0) * ex.PrecioUnitario, 0)

  function cambiarExtra(extraId: number, delta: number) {
    setContadores((prev) => ({ ...prev, [extraId]: Math.max(0, (prev[extraId] || 0) + delta) }))
  }

  function limpiarPersonalizacion() {
    onSave({ precioUnit: precioBase, notas: '' })
    onClose()
  }

  function guardarCambiosModal() {
    const notasArr: string[] = []
    const nota = notaManual.trim()
    if (nota) notasArr.push(nota.toUpperCase())
    extrasModal.forEach((ex) => {
      const cantidad = contadores[ex.ExtraID] || 0
      if (cantidad > 0) notasArr.push(`+${cantidad} ${ex.Nombre.toUpperCase()}`)
    })
    onSave({ precioUnit: precioTotal, notas: notasArr.join(', ') })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity fade-animate" onClick={onClose}></div>
      <div className="relative w-full md:w-[480px] bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden modal-animate flex flex-col h-auto max-h-[calc(100dvh-1.5rem)] border border-slate-100 z-10 max-w-[calc(100vw-1.5rem)] sm:max-w-[95vw]">
        <div className="w-full flex justify-center pt-3 pb-2 md:hidden bg-white cursor-pointer" onClick={onClose}>
          <div className="w-10 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="bg-white px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <h3 className="text-xl font-extrabold text-slate-800">{titulo}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-200 hover:text-slate-700 transition-colors active:scale-90"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain bg-slate-50/50 thin-scrollbar">
          <div className="bg-white p-5 rounded-[20px] border border-slate-200 shadow-sm mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Instrucciones</label>
            <textarea
              rows={2}
              value={notaManual}
              onChange={(e) => setNotaManual(e.target.value)}
              placeholder="Ej: Sin ají, bien cocido..."
              className="w-full border border-slate-200 rounded-xl focus:border-guinda focus:ring-4 focus:ring-guinda/10 resize-none bg-slate-50 p-3 text-sm font-medium outline-none placeholder-slate-400 transition-all"
            />
          </div>

          <div className="mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Complementos</span>
          </div>

          <div className="space-y-3">
            {extrasModal.map((ex) => (
              <div key={ex.ExtraID} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <div className="pl-1">
                  <div className="text-sm font-bold text-gray-800">{ex.Nombre}</div>
                  <div className={`text-[10px] ${ex.EsAlterno ? 'text-green-600' : 'text-orange-600'} font-bold`}>
                    + S/ {ex.PrecioUnitario.toFixed(2)} c/u
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => cambiarExtra(ex.ExtraID, -1)}
                    className="w-9 h-9 rounded-xl bg-gray-100 font-bold text-gray-500 active:scale-90 transition-transform"
                  >
                    -
                  </button>
                  <span className="font-bold w-7 text-center text-sm">{contadores[ex.ExtraID] || 0}</span>
                  <button
                    onClick={() => cambiarExtra(ex.ExtraID, 1)}
                    className={`w-9 h-9 rounded-xl ${ex.EsAlterno ? 'bg-green-100 text-green-700' : 'bg-amarillo text-gray-800'} font-bold active:scale-90 transition-transform`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          {extrasModal.length === 0 && (
            <p className="text-xs font-semibold text-slate-400 text-center py-4">Este plato no tiene complementos disponibles.</p>
          )}
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-white border-t border-slate-100 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 safe-bottom shrink-0">
          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest mb-0.5">Subtotal Plato</span>
            <span className="text-2xl sm:text-3xl font-black text-guinda leading-none whitespace-nowrap">S/ {precioTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={limpiarPersonalizacion}
            className="h-11 px-3 sm:px-4 rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 font-bold text-[10px] sm:text-xs uppercase tracking-wide active:scale-95 transition-all border border-slate-200 hover:border-red-200 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            🗑️ Limpiar
          </button>
          <button
            onClick={guardarCambiosModal}
            className="col-span-2 w-full min-h-11 bg-gradient-to-r from-guinda to-guinda-light text-white font-extrabold py-3 px-4 sm:py-3.5 sm:px-5 rounded-2xl shadow-lg shadow-guinda/20 active:scale-95 transition-all text-xs sm:text-sm tracking-wide whitespace-nowrap"
          >
            ACTUALIZAR
          </button>
        </div>
      </div>
    </div>
  )
}
