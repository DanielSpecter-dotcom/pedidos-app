import type { Extra, TipoSeleccionExtra } from '../types'

// CategoriaID null en el extra = aplica a cualquier categoría de producto.
export function extrasPorCategoria(extras: Extra[], categoriaId: number | null, tipo: TipoSeleccionExtra): Extra[] {
  return extras.filter((ex) => ex.TipoSeleccion === tipo && (ex.CategoriaID === null || ex.CategoriaID === categoriaId))
}
