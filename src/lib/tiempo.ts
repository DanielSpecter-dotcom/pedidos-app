export function minutosDesde(fechaISO: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000))
}

export function formatDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos}min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`
}
