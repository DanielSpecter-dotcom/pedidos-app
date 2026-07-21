# Mejoras — Pedidos V2 (app web de meseros)

Este documento resume el trabajo hecho y lo pendiente sobre esta app web,
en el contexto de un proyecto más grande: un sistema de punto de venta para
la Anticuchería Melchorita, con una app de escritorio WPF (.NET 8) en
`C:\Users\danie\source\C#\Restaurante\Restaurante\Restaurante` que comparte
**el mismo backend de Supabase** que esta web. Todo lo que se agregue acá
(tablas, RPCs) también está disponible para la app de escritorio, y
viceversa — es un solo backend con dos clientes.

- Supabase URL / key: ya configurados en `auth.js` (no hace falta tocarlos).
- Scripts SQL de referencia (esquema, RPCs, etc.): viven en
  `C:\Users\danie\source\C#\Restaurante\Restaurante\Restaurante\db\melchorita\`,
  numerados en el orden en que se fueron aplicando. Son la fuente de verdad
  del esquema actual de la base.

---

## ✅ Ya hecho: agregados (Extras) generalizados

**Problema que había**: el modal de "Personalizar" y el flujo de "Agregar
producto" tenían una lista de complementos **hardcodeada en `app.js`**
(`Extra Rachi`, `Extra Choncholí`, etc. a S/5.00, más un caso especial
"Palito Adicional" separado en el HTML). Esto tenía dos problemas:
1. El precio (S/5.00) había quedado desactualizado — en la app de
   escritorio ya se subió a S/6.00.
2. La lista aparecía siempre igual sin importar qué producto se estuviera
   editando (un Caldo de Gallina mostraba la opción de agregar "Rachi").
3. No existía ninguna opción de "Helado" para bebidas.

**Qué se hizo**: se creó una tabla `Extras` en Supabase (compartida con la
app de escritorio — ver `db/melchorita/16_extras.sql` y
`db/melchorita/18_rls_extras.sql` en el proyecto de escritorio) con esta
forma:

| Columna | Tipo | Nota |
|---|---|---|
| ExtraID | serial PK | |
| Nombre | text | |
| PrecioUnitario | numeric(10,2) | |
| CategoriaID | int, nullable | A qué categoría de producto aplica (`Categorias.CategoriaID`). `null` = aplica a cualquier categoría |
| TipoSeleccion | text | `'CANTIDAD'` (selector +/-, ej. Palito Anticucho) o `'CHECKBOX'` (casilla simple, ej. Helado) |
| EsAlterno | boolean | Solo cosmético — color distinto en el modal (ej. Rodaja Choclo) |
| Activo | boolean | |
| Orden | int | |

`app.js` ahora:
- Carga `Extras` completo al iniciar (`cargarExtras()`), en un try/catch
  propio para que si esa tabla fallara no tumbe el resto del arranque.
- `renderExtrasModal(categoriaId)` — arma la lista de complementos tipo
  `CANTIDAD` del modal de Personalizar, filtrada por la categoría del
  plato puntual que se está editando (antes era una lista fija).
- `renderExtrasCheckbox(categoriaId, containerId, contexto)` +
  `toggleExtraCheckbox()` — mecanismo nuevo para los agregados tipo
  `CHECKBOX` (ej. Helado). Se renderiza dinámicamente junto al selector de
  producto, tanto en "Agregar Producto" (carrito principal) como en
  "Agregar plato" (modal Editar Pedido) — solo aparece si la categoría del
  producto elegido tiene algún extra tipo CHECKBOX asociado.
- Los productos ahora cargan `CategoriaID` en el `<option>` del combobox
  (`opt.dataset.categoriaId`) y en cada línea del carrito/pedido
  (`item.categoriaId` / `plato.categoriaId`), para poder hacer ese filtro.

**Cómo administrar los agregados**: desde la app de escritorio,
Configuración → pestaña "🧂 Agregados" (CRUD completo: nombre, precio,
categoría, tipo de selección, alterno). Cualquier cambio ahí se refleja acá
sin tocar código, porque ambas apps leen la misma tabla.

**Pendiente de tu parte**: no se pudo probar en vivo (la herramienta de
preview solo renderiza una foto estática de este proyecto, sin ejecutar
JS, porque está fuera de la carpeta raíz que tenía abierta). Antes de dar
esto por bueno, probar a mano:
1. Agregar una bebida (categoría "Bebidas") y marcar "Helado" — debe sumar
   S/0.50 y quedar la nota "+Helado" en el carrito.
2. Personalizar un anticucho (doble clic / tap en el carrito) — debe
   mostrar los complementos reales (S/6.00 c/u, Rodaja Choclo a S/2.00) en
   vez de la lista vieja.
3. Personalizar un plato que NO sea anticucho (ej. un Caldo de Gallina, si
   existe) — el modal debería mostrar "Este plato no tiene complementos
   disponibles" en vez de la lista de anticuchos.
4. Editar un pedido existente (mesa ocupada) y agregar un plato nuevo con
   Helado — mismo comportamiento que en el carrito principal.

---

## 🔧 Pendiente — con instrucciones concretas

### 1. Usar los RPC atómicos que ya existen (evita pedidos huérfanos)

**El problema**: `confirmarPedido()` y `guardarCambiosEditar()` en
`app.js` hacen varios `insert`/`update` sueltos contra Supabase (crear
Pedido → crear DetallePedido → crear AsignacionMesas → actualizar Mesas).
Si falla a mitad de camino (ej. se corta la conexión), queda un Pedido sin
sus detalles, o una mesa que no se marca OCUPADA. Esto es exactamente el
problema que la app de escritorio ya resolvió con funciones RPC en
Postgres — **esas funciones ya existen en este mismo Supabase**, no hay
que crearlas, solo llamarlas desde `app.js` con
`clienteSupabase.rpc('nombre_funcion', { ...params })`.

Definiciones completas en
`db/melchorita/02_funciones.sql`, `07_rpc_editar_pedido.sql` y
`08_pago_anticipado.sql` (proyecto de escritorio). Firmas:

**`crear_pedido`** — reemplaza el bloque de `confirmarPedido()` que inserta
Pedido + DetallePedido + AsignacionMesas + actualiza Mesas:
```js
const { data: pedidoId, error } = await clienteSupabase.rpc('crear_pedido', {
  p_mesero_id: parseInt(document.getElementById('cboMeseros').value),
  p_cliente_id: idClienteFinal,
  p_tipo_servicio: tipoServicio,               // 'MESA' | 'LLEVAR' | 'RECOGER' | 'DELIVERY'
  p_mesas: mesasIds,                            // int[], solo relevante si tipoServicio === 'MESA'
  p_detalles: carrito.map(item => ({
    ProductoID: parseInt(item.idProd),
    Cantidad: item.cantidad,
    PrecioUnitario: item.precioUnit,
    Notas: item.notas,
    EsParaLlevar: item.esLlevar
  })),
  p_nombre_destinatario: tipoServicio === 'DELIVERY' ? nombreDelivery : null,
  p_direccion_entrega:   tipoServicio === 'DELIVERY' ? direccion : null,
  p_telefono_contacto:   tipoServicio === 'DELIVERY' ? telefono : null,
  p_usuario_id: null   // ver punto 3 (auth) — hoy no hay forma de saber qué usuario está logueado
});
if (error) throw error;
// pedidoId ya es el PedidoID creado — reemplaza todo el bloque manual de
// insert Pedido + insert DetallePedido + insert AsignacionMesas + update Mesas.
```
Ojo: `crear_pedido` ya marca las mesas como `OCUPADA` internamente — no
hace falta el `await clienteSupabase.from('Mesas').update(...)` manual que
hay ahora.

**`despachar_pedido`** — reemplaza el `marcarPlatoServido()` actual, que
hace 3 llamadas sueltas (update DetallePedido → count → update Pedidos) sin
atomicidad, con riesgo de condición de carrera si dos meseros marcan
"servido" casi al mismo tiempo:
```js
const { error } = await clienteSupabase.rpc('despachar_pedido', { p_pedido_id: pedidoID });
```
Nota: `despachar_pedido` marca **todos** los platos `EN_COLA` de ese
pedido como `SERVIDO` de una — si en la cocina web se quiere marcar plato
por plato (no todo el pedido junto), hay que decidir si conviene mantener
el update directo a `DetallePedido` para un plato individual, o cambiar el
flujo a "despachar pedido completo". Ver también el punto de diseño más
abajo.

**`editar_pedido`** — reemplaza el bloque manual de `guardarCambiosEditar()`
(loop de deletes + loop de updates + insert + recálculo de total, todo
suelto):
```js
const { error } = await clienteSupabase.rpc('editar_pedido', {
  p_pedido_id: pedidoEditando.pedidoID,
  p_detalles_eliminar: platosEliminar,                    // int[] de DetalleID
  p_detalles_actualizar: platosEditar
    .filter(p => p.detalleID && !p.esNuevo && p.estadoPlato === 'EN_COLA')
    .map(p => ({ DetalleID: p.detalleID, Cantidad: p.cantidad, PrecioUnitario: p.precioUnit, Notas: p.notas })),
  p_detalles_nuevos: platosEditar
    .filter(p => p.esNuevo)
    .map(p => ({ ProductoID: p.productoID, Cantidad: p.cantidad, PrecioUnitario: p.precioUnit, Notas: p.notas, EsParaLlevar: p.esLlevar })),
  p_reactivar_pedido: pedidoEditando.estadoPedido === 'SERVIDO' && platosEditar.some(p => p.esNuevo)
});
if (error) throw error;
```
El RPC ya se encarga de recalcular el total y de reactivar el pedido a
PENDIENTE si corresponde — se puede borrar todo ese código manual.

**`cobrar_pedido`** y **`anular_pedido`** — solo hacen falta si se decide
agregar cobro/anulación a esta web (ver punto 4).

### 2. XSS: escapar texto libre antes de insertarlo en el DOM

**El problema**: varias funciones insertan strings directo en `innerHTML`
sin escapar, y algunos de esos strings son texto libre que escribe el
mesero (notas) o vienen de la base (nombre de producto/mesa). Si alguna de
esas cadenas contiene HTML/`<script>`, se ejecuta en la página. Ya existe
el patrón correcto en `renderVistaCocina()` (usa `escapeHtml()`) — falta
aplicarlo en:

- `renderCarrito()` (`app.js`): `item.nombre` y `item.notas` dentro de
  `notasHtml` — envolver ambos en `escapeHtml(...)`.
- `renderPlatosEditar()` (`app.js`): `plato.nombre` y `plato.notas` —
  mismo fix.
- `renderMesas()` (`app.js`): `m.NumeroMesa` — riesgo bajo (dato
  administrado desde Configuración en el escritorio, no texto libre de
  clientes/meseros), pero conviene igual por consistencia.

`escapeHtml()` ya existe al final de `app.js`, solo hay que usarlo en esos
puntos.

### 3. Decisión de diseño: login separado del sistema de roles del escritorio

Hoy esta web usa **Supabase Auth** (usuario/contraseña reales, vía
`auth.signInWithPassword`, correo sintético `usuario@melchorita.rest`) —
completamente aparte de la tabla `Usuarios` + PIN + RPC `verificar_login`
que arma el sistema de roles de la app de escritorio (ADMIN/CAJERO/MESERO/
COCINA). Consecuencias concretas:
- El mesero se elige de un `<select>` manual (`cboMeseros`) sin relación
  con quién inició sesión en la web — no hay trazabilidad real de "qué
  usuario tomó este pedido" (`p_usuario_id` siempre queda `null`).
- No hay filtrado de vistas por rol — cualquiera que tenga cuenta ve
  Pedidos y Cocina por igual.

No es un bug puntual sino una decisión de arquitectura: si vale la pena
unificarlo, la opción más simple es reemplazar el login de esta web por el
mismo mecanismo del escritorio: pantalla de selección de usuario + PIN,
llamando al RPC `verificar_login(p_usuario_id, p_pin)` (ver
`db/melchorita/13_roles_login.sql`) en vez de `auth.signInWithPassword`.
Eso resolvería también lo del mesero-sin-trazabilidad, porque el usuario
autenticado ya trae su `MeseroID` vinculado (columna `Usuarios.MeseroID`).

### 4. El botón "Cobrar" no cobra nada

`confirmarPedido()` solo crea el pedido en estado `PENDIENTE` — no hay
ningún flujo de selección de método de pago ni de marcar `PAGADO` en toda
la web. Puede ser intencional (esta herramienta es para que el mesero
*tome* pedidos, no para cobrar — el cobro seguiría siendo en la app de
escritorio, pantalla Caja). Si es así, valdría la pena renombrar el botón
("Confirmar Pedido" o "Enviar a Cocina" en vez de "Cobrar") para no
confundir. Si en cambio se quiere que el mesero también pueda cobrar desde
acá, hay que agregar un flujo de método de pago y llamar al RPC
`cobrar_pedido` (mismo patrón que `crear_pedido` del punto 1).

### 5. Menor: las suscripciones Realtime nunca se cancelan

`suscribirCambiosMesas()` y `suscribirCambiosCocina()` crean canales una
sola vez al cargar la página y nunca llaman `.unsubscribe()`. Con esta
arquitectura de página única no genera un problema visible hoy (se limpia
solo al recargar/cerrar la pestaña), pero si en algún momento se agrega
navegación tipo SPA entre pantallas sin recargar, conviene desuscribir al
salir de cada vista para no acumular canales.

---

## Orden sugerido si se retoma esto

1. Punto 2 (XSS) — rápido, bajo riesgo, alto valor.
2. Punto 1 (RPCs atómicos) — el de más impacto real en confiabilidad.
3. Punto 4 (aclarar alcance del botón Cobrar) — depende de una decisión de
   producto, no de código.
4. Punto 3 (unificar auth/roles) — el más grande, conviene decidirlo con
   calma antes de tocar nada, ya que cambia cómo se loguea todo el mundo.
