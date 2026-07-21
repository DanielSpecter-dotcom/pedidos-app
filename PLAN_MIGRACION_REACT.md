# Migración de PedidosV2 a React + Vite + TypeScript + Tailwind

> **Estado actual**: Fases 1-3 completadas (scaffold en `web-new/`, `AuthContext` +
> `LoginPage`, `AppDataContext`). En espera de credenciales de prueba para verificar
> visualmente el login exitoso y la carga de datos antes de seguir con la Fase 4.

## Contexto

`PedidosV2` es hoy una SPA vanilla JS de una sola página (`index.html` + `app.js`,
~1257 líneas) más una página de login separada (`login.html` + `auth.js`), sin build
step: Tailwind se carga por CDN y todo el renderizado es manual (`innerHTML` +
`getElementById` + `onclick` embebidos como strings). Esto ya generó un problema real
detectado en `MEJORAS_PENDIENTES.md`: falta de escape consistente de texto libre en el
DOM (XSS), además de que el código es difícil de extender (estado global disperso,
un mismo modal reutilizado para dos flujos distintos vía una bandera booleana
`window._guardarParaEditor`).

El usuario pidió migrar toda esta lógica a **React + Vite + TypeScript + Tailwind**
(vía build, no CDN), gestionado con **Yarn**, pensado para desplegarse en **Vercel**,
y con **prioridad en el responsive mobile** (pantallas chicas tipo iPhone SE, 375px de
ancho) — la app la usan meseros desde el celular en el salón, así que mobile no es un
"pulido al final" sino el viewport principal a validar en cada fase.

Se acordó explícitamente:
- **TypeScript**, para tener tipos en el dominio (Pedido, DetallePedido, Extra, etc.)
  mientras se mueve tanta lógica de golpe.
- **Migración 1:1 primero**: reproducir el comportamiento actual tal cual. El fix de
  XSS queda resuelto gratis (JSX escapa por defecto). Las demás mejoras del documento
  (RPCs atómicos, login con PIN, alcance del botón "Cobrar") se abordan **después**,
  como tareas independientes sobre la base ya migrada — no se mezclan en esta migración.
- **Context API + hooks** para estado global, sin librerías nuevas de state management.

No hay tests ni tooling previo (no hay `package.json`); es un setup greenfield.

---

## Decisiones de arquitectura

### Gestor de paquetes: Yarn
Todo el tooling usa `yarn` (no `npm`): `yarn create vite`, `yarn add`, `yarn dev`,
`yarn build`. Se versiona `yarn.lock` (no `package-lock.json`).

### Estructura de carpetas
Vite necesita su propio `index.html` en la raíz del proyecto que sirve, lo cual choca
con el `index.html`/`login.html` actuales. Por eso el scaffold se hace en una carpeta
temporal y se mueve a la raíz recién al final, cuando la migración esté verificada:

1. Scaffold en `PedidosV2/web-new/` (`yarn create vite web-new --template react-ts`).
2. Construir todo ahí, corriendo `yarn dev` desde esa carpeta para probar — **siempre
   primero en viewport 375×667 (iPhone SE)**, luego desktop.
3. Al final (paso de cutover): mover el contenido de `web-new/` a la raíz del repo,
   eliminar `app.js`, `auth.js`, el `index.html`/`login.html` viejos, y borrar
   `web-new/`. Esto se hace en un paso separado y explícito, no automáticamente.

### Contexts (estado global)
- **`AuthContext`** — sesión Supabase (`session`, `login()`, `logout()`, `loading`).
  Envuelve toda la app; si no hay sesión, renderiza `LoginPage` en vez de la app
  (reemplaza el `checkSession()` + redirect manual de hoy).
- **`AppDataContext`** — datos de referencia compartidos por ambas vistas: `productos`,
  `mesas`, `meseros`, `extras`. Incluye la suscripción realtime a `Mesas` (con cleanup
  en `useEffect`, algo que hoy no existe). Reemplaza `cargarDatosIniciales()`,
  `fetchMesas()`, `cargarExtras()`, `cargarMeseros()`, `suscribirCambiosMesas()`.
- **`CartContext`** — todo lo que hoy vive en variables sueltas del carrito: `carrito`,
  `tipoServicioActual`, datos de cliente/mesero seleccionados. Solo lo usa la vista
  Pedidos.

Lo que **no** se sube a Context (queda como estado local de componente, porque solo lo
usa una pantalla/modal):
- Cola de cocina (`colaCocina`) + su realtime → estado local de `CocinaView`.
- Pedido en edición (`pedidoEditando`, `platosEditar`, `platosEliminar`) → estado local
  de `EditarPedidoModal`.
- Contadores de extras / checkboxes elegidos (`contadoresExtras`,
  `extrasCheckboxElegidos`) → estado local de cada instancia de `PersonalizeModal`
  (esto además elimina el bug-prone patrón actual de variables compartidas entre
  aperturas distintas del modal).

### El modal "Personalizar" (pieza de diseño clave)
Hoy `#modalPersonalizar` sirve a dos flujos (carrito nuevo vs. pedido en edición)
distinguidos por la bandera global `window._guardarParaEditor`. En React esto se
resuelve de forma limpia con un componente genérico:

```tsx
<PersonalizeModal
  item={itemAEditar}                 // { nombre, categoriaId, precioBase, notas, extras }
  onSave={(itemActualizado) => ...}  // el caller decide si escribe en carrito o platosEditar
  onClose={() => ...}
/>
```
`EditarPedidoModal` y la vista de Pedidos abren esta misma modal pasándole callbacks
distintos — sin flags globales.

### Ruteo / navegación
No se agrega `react-router`: hoy no hay URLs distintas por vista (todo es
`cambiarVista()` con `hidden`/`classList`), así que se mantiene como estado de UI
(`const [vista, setVista] = useState<'pedidos'|'cocina'>('pedidos')`) dentro de un
`AppShell`. Evita una dependencia innecesaria para el alcance actual, y simplifica el
deploy en Vercel (sin necesidad de configurar rewrites de SPA para rutas anidadas).

### Mobile-first, iPhone SE como piso
El diseño actual ya es responsive (breakpoints `xs`/`lg`, barras fijas mobile,
`safe-area`), pero se arma con Tailwind desktop-first en varios lugares. En la
migración cada componente se construye y prueba primero a 375px de ancho (iPhone SE:
el viewport angosto real más común entre los que aún circulan) y recién después se
agregan los estilos `lg:`/`sm:` para pantallas más grandes. Puntos concretos a cuidar:
- Botones/checkboxes de extras y filas del carrito con área táctil ≥ 44px.
- `MobileOrderBar` y `MobileKitchenBar` (barras fijas inferiores) no deben tapar
  contenido scrolleable ni quedar cortadas por `safe-area-inset-bottom` en iPhone SE.
- Modales (`PersonalizeModal`, `EditarPedidoModal`) deben ser scrolleables internamente
  y no exceder el alto de viewport en 375×667 (ambos tienen listas potencialmente
  largas: extras y platos del pedido).
- Grid de mesas (`MesaGrid`) y grid de cola de cocina (`KitchenQueueGrid`) deben
  colapsar a columnas que quepan cómodamente en 375px sin texto cortado.

### Tailwind
Tailwind v4 vía `@tailwindcss/vite` (plugin oficial, sin `tailwind.config.js`
clásico). Los dos bloques `tailwind.config` actuales (con **valores de `guinda`
levemente distintos** entre `index.html` y `login.html` — hay que reconciliarlos en
uno solo, usando los valores de `index.html` como canónicos ya que son los de la app
principal) se portan a un bloque `@theme` en `src/index.css`:
- Colores `guinda`/`amarillo`, `screens.xs`, `boxShadow.glass/soft/premium`.
- Las clases custom del `<style>` de `index.html` (scrollbars, `.mesa-ocupada`,
  `.servicio-activo`, `.view-tab-active`, animaciones `slideUpFade`/`fadeIn`/
  `softPulse`, safe-area, `.glass-header`, `.kitchen-card`, `.mobile-nav-menu`) pasan
  a `src/index.css` como CSS plano / `@layer components`. Las que hoy se activan por
  `classList.toggle` (mesa seleccionada, tab activo, menú móvil abierto) se vuelven
  className condicional derivado de estado React en vez de manipulación directa del DOM.

### Cliente Supabase y variables de entorno
`src/lib/supabaseClient.ts` crea el cliente una sola vez leyendo
`import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` desde `.env` (con
`.env.example` versionado y `.env` en `.gitignore`). Mismos valores que hoy están
hardcodeados en `auth.js:1-2` (es la clave pública/`anon`, no un secreto — solo se
mueve por buena práctica, no porque haya una filtración real). Estas mismas variables
se configuran luego como **Environment Variables** del proyecto en Vercel (no se
versionan ahí tampoco).

### Deploy en Vercel
Vite + React es un preset nativo de Vercel (cero config): detecta `yarn.lock` y usa
Yarn automáticamente, build command `yarn build`, output `dist/`. Como no hay
`react-router` ni rutas anidadas (ver arriba), no hace falta `vercel.json` con
rewrites para SPA. Pasos al final del proyecto:
1. Conectar el repo de GitHub al proyecto en Vercel.
2. Cargar `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en Project Settings →
   Environment Variables (Production + Preview).
3. Verificar un deploy de Preview antes de promover a Production.

### Tipos de dominio
`src/types.ts` con interfaces que reflejan las columnas de Supabase tal cual están en
la base (PascalCase: `PedidoID`, `EstadoPedido`, etc.) para que se lean igual que los
scripts SQL de referencia — sin remapear a camelCase, para minimizar fricción al
comparar con el backend compartido con la app de escritorio.

---

## Mapa de componentes (reemplaza cada función/sección actual)

| Componente nuevo | Reemplaza (app.js / index.html) |
|---|---|
| `AuthContext` + `LoginPage` | `auth.js`, `login.html`, `checkSession()` en `app.js:38-58` |
| `AppShell` (header, tabs, menú móvil) | Header de `index.html`, `cambiarVista()` (993-1012), `toggleMobileMenu`/`seleccionarMenuMovil` |
| `AppDataContext` | `cargarDatosIniciales`, `fetchMesas`, `cargarExtras`, `cargarMeseros`, `suscribirCambiosMesas` |
| `PedidosView` | `#orderView` completo |
| `ServiceTypeTabs` | botones `.radio-btn` + `selectService()` (159-196) |
| `MesaGrid` | `renderMesas()` (126-146) |
| `DeliveryPanel` | `#panelDelivery` (formulario nombre/dirección/teléfono) |
| `ClienteMeseroPanel` | select `#cboMeseros`, `buscarClientePorDni()` (208-...), `obtenerIdCliente()`/`obtenerIdClienteGenerico()` |
| `ProductPicker` | `#cboProductos`, `llenarCombo()` (222-234), `onProductoSeleccionadoCambio()`, `agregarProducto()` |
| `ExtrasCantidad` / `ExtrasCheckbox` | `renderExtrasModal()` (255-282), `renderExtrasCheckbox()` (286-299) — como sub-componentes reusables dentro de `ProductPicker`, `PersonalizeModal` y `EditarPedidoModal` |
| `CartTable` + `MobileOrderBar` | `renderCarrito()` (383-424), `#mobileOrderBar` |
| `PersonalizeModal` | `#modalPersonalizar` completo (genérico, ver arriba) |
| `EditarPedidoModal` | `#modalEditarPedido`, `abrirModalEditarPedido()` (652-757), `renderPlatosEditar()` (770-829), `guardarCambiosEditar()` (893-984) |
| `CocinaView` (`KitchenKPIs`, `KitchenQueueGrid`, `KitchenSummary`, `MobileKitchenBar`) | `#kitchenView`, `cargarVistaCocina()`/`renderVistaCocina()` (1052-1209), `suscribirCambiosCocina()`, `marcarPlatoServido()` |

`confirmarPedido()` (531-...) se reparte entre `CartContext` (arma el payload desde
`carrito`+`tipoServicioActual`) y una función de datos que hace los mismos
inserts/updates sueltos que hoy (Pedidos → DetallePedido → AsignacionMesas → update
Mesas) — **sin** cambiar a los RPC atómicos todavía, por la decisión de alcance 1:1.

---

## Fases de implementación

**Fase 1 — Scaffold y tooling** ✅
`yarn create vite web-new --template react-ts`; `yarn add @supabase/supabase-js`;
`yarn add -D tailwindcss @tailwindcss/vite`; configurar `.env` + `.env.example`; crear
`src/lib/supabaseClient.ts`, `src/types.ts`, `src/index.css` con el `@theme` portado.
Verificar con `yarn dev` que levanta una página en blanco con Tailwind funcionando, en
viewport 375px primero.

**Fase 2 — Auth** ✅
`AuthContext`, `LoginPage` (mismo patrón de email sintético
`usuario@melchorita.rest`), gate de sesión en `App.tsx`. Probar login/logout real
contra Supabase, en mobile viewport.

**Fase 3 — Datos compartidos** ✅
`AppDataContext` con productos/mesas/meseros/extras + realtime de mesas con cleanup.

**Fase 4 — Vista Pedidos (parte 1: selección y carrito)**
`AppShell`, `ServiceTypeTabs`, `MesaGrid`, `DeliveryPanel`, `ClienteMeseroPanel`,
`ProductPicker` (con extras cantidad/checkbox), `CartTable`, `MobileOrderBar`,
`confirmarPedido`. Validar en 375px que el flujo completo de armar un pedido es
usable con el pulgar (targets táctiles, barra inferior fija).

**Fase 5 — PersonalizeModal genérico**
Construir el modal compartido y enchufarlo primero al flujo de carrito (equivalente a
`abrirModalEditar`/`guardarCambiosModal` de hoy). Probar que el modal scrollea bien y
no se corta en 375×667 con muchos extras.

**Fase 6 — EditarPedidoModal**
Abrir desde mesa ocupada, listar/editar/eliminar platos, reusar `PersonalizeModal` para
personalizar un plato del pedido en edición, `guardarCambiosEditar` con la misma lógica
de deletes/updates/inserts + recálculo de total que hoy. Mismo chequeo de scroll/altura
en mobile que la Fase 5.

**Fase 7 — Vista Cocina**
`CocinaView` con KPIs, grid de cola, resumen por tipo de servicio, realtime con
cleanup, `marcarPlatoServido`. Grid de cola probado en 375px (columnas, texto no
cortado, `MobileKitchenBar`).

**Fase 8 — Pasada final de responsive**
Comparación lado a lado (viejo vs nuevo) en 375×667 (iPhone SE), un tamaño mobile
grande (ej. 390×844) y desktop — no es "el pulido", es la verificación de que el
trabajo mobile-first de cada fase anterior efectivamente se sostiene junto, mobile nav
menu, barras fijas, safe-area, glass header incluidos.

**Fase 9 — Cutover**
Mover `web-new/*` a la raíz del repo, actualizar `.gitignore` (`node_modules`, `.env`,
`dist`), eliminar `app.js`, `auth.js`, `index.html`/`login.html` viejos **solo después
de la verificación manual de la Fase 10**.

**Fase 10 — QA manual (checklist end-to-end)**
Sin test suite automatizada (no existía antes), verificar a mano con `yarn dev`,
**siempre arrancando en viewport 375×667**:
1. Login/logout con usuario real.
2. Tomar un pedido de mesa completo: elegir mesa, mesero, producto con extras
   cantidad y checkbox, "P/ Llevar", confirmar → verificar fila en Supabase
   (`Pedidos`, `DetallePedido`, `AsignacionMesas`, `Mesas.Estado`).
3. Tomar un pedido Delivery (nombre/dirección/teléfono nuevos y con cliente
   existente por DNI).
4. Abrir una mesa ocupada, agregar plato nuevo, eliminar un plato, personalizar un
   plato existente, guardar — verificar recálculo de total y reactivación a
   PENDIENTE si estaba SERVIDO.
5. Vista Cocina: que la cola se vea, marcar un plato servido, verificar que
   desaparece y que el pedido pasa a SERVIDO cuando ya no quedan platos EN_COLA.
6. Realtime: abrir dos pestañas, confirmar que cambios en una (mesa ocupada, plato
   servido) se reflejan en la otra sin recargar.
7. Probar una nota de pedido con `<script>` o `<b>` para confirmar que JSX la
   muestra como texto plano (el fix de XSS "gratis").
8. Repetir los puntos 2-6 completos en viewport 375×667 (iPhone SE) sin usar zoom
   ni scroll horizontal involuntario.

**Fase 11 — Deploy a Vercel**
Conectar repo, configurar variables de entorno, deploy de Preview, verificar checklist
de la Fase 10 contra la URL de preview, promover a Production.

---

## Notas para después de esta migración
No se tocan en este trabajo (quedan para tareas separadas, ya con la base en React):
RPCs atómicos (`crear_pedido`/`editar_pedido`/`despachar_pedido`), unificación de
login con PIN, decisión sobre el alcance del botón "Cobrar". El cleanup de
suscripciones Realtime, en cambio, sí queda resuelto como parte de esta migración
(uso de `useEffect` con cleanup en `AppDataContext` y `CocinaView`).
