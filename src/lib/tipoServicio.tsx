import type { TipoServicio } from '../types'
import { IconBag, IconBox, IconTruck, IconUtensils } from '../components/icons'

export const TIPO_SERVICIO_ICON = {
  MESA: IconUtensils,
  LLEVAR: IconBag,
  RECOGER: IconBox,
  DELIVERY: IconTruck,
} as const satisfies Record<TipoServicio, typeof IconUtensils>

export const TIPO_SERVICIO_LABEL: Record<TipoServicio, string> = {
  MESA: 'Mesa',
  LLEVAR: 'Para Llevar',
  RECOGER: 'Para Recoger',
  DELIVERY: 'Delivery',
}
