import type { SVGProps } from 'react'

// Set mínimo de iconos SVG que reemplaza los emoji usados como iconografía
// funcional en toda la app (no son fiables entre SO/fuente y no tienen
// significado accesible propio). Decorativos por defecto (aria-hidden): el
// texto/aria-label del control que los envuelve es lo que se anuncia.
function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  )
}

export function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3a4 4 0 0 0-4 4v3.5c0 .9-.36 1.76-1 2.4L6 14h12l-1-1.1a3.4 3.4 0 0 1-1-2.4V7a4 4 0 0 0-4-4Z" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </Svg>
  )
}

export function IconBellOff(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3a4 4 0 0 0-4 4v3.5c0 .9-.36 1.76-1 2.4L6 14h12l-1-1.1a3.4 3.4 0 0 1-1-2.4V7a4 4 0 0 0-4-4Z" />
      <path d="M10 17a2 2 0 0 0 4 0" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </Svg>
  )
}

export function IconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </Svg>
  )
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="6" y="10.5" width="12" height="9" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </Svg>
  )
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <line x1="15.2" y1="15.2" x2="20" y2="20" />
    </Svg>
  )
}

export function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="4" y1="12" x2="19" y2="12" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  )
}

export function IconPencil(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" />
      <line x1="14" y1="7" x2="17" y2="10" />
    </Svg>
  )
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="5" y1="7" x2="19" y2="7" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Svg>
  )
}

export function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4 4v5h5" />
      <path d="M20 20v-5h-5" />
      <path d="M5 9a8 8 0 0 1 14-3.5M19 15a8 8 0 0 1-14 3.5" />
    </Svg>
  )
}

export function IconUndo(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-2" />
    </Svg>
  )
}

export function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <path d="M17 8l4 4-4 4" />
    </Svg>
  )
}

export function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h3a1 1 0 0 0 1-1v-9" />
    </Svg>
  )
}

export function IconFlame(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 22c3.5 0 6-2.5 6-6 0-3-2-5-3-8-.5 2-2 3-2 5a2 2 0 1 1-4 0c0-1 .3-1.8.8-2.6C8.2 12 6 14.5 6 16c0 3.5 2.5 6 6 6Z" />
    </Svg>
  )
}

export function IconClipboard(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="13" y2="18" />
    </Svg>
  )
}

export function IconWarning(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="m5 13 4 4L19 7" />
    </Svg>
  )
}

export function IconCheckCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </Svg>
  )
}

export function IconBag(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  )
}

export function IconBox(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="4" y="8" width="16" height="12" rx="1" />
      <path d="M4 8l8-5 8 5" />
      <line x1="12" y1="8" x2="12" y2="20" />
    </Svg>
  )
}

export function IconTruck(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="2" y="8" width="12" height="8" rx="1" />
      <path d="M14 11h4l3 3v2h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </Svg>
  )
}

export function IconUtensils(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18" />
      <path d="M17 3c-1.5 0-2.5 1.5-2.5 4v3c0 1 .6 1.7 1.5 2v9" />
    </Svg>
  )
}

export function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 6.2 2 2 0 0 1 6 4Z" />
    </Svg>
  )
}

export function IconWaiter(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
      <path d="M10.3 12.5 12 14l1.7-1.5" />
    </Svg>
  )
}

export function IconNote(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l3 3v15H6V3Z" />
      <path d="M15 3v3h3" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </Svg>
  )
}

export function IconChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  )
}

export function IconPin(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </Svg>
  )
}
