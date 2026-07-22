// Tipos que reflejan las columnas de las tablas de Supabase tal cual están en
// la base (PascalCase), para leerse igual que los scripts SQL de referencia en
// el proyecto de escritorio (db/melchorita/*.sql).

export type TipoServicio = 'MESA' | 'LLEVAR' | 'RECOGER' | 'DELIVERY'
export type EstadoPedido = 'PENDIENTE' | 'SERVIDO' | 'PAGADO' | 'ANULADO'
export type EstadoPlato = 'EN_COLA' | 'SERVIDO'
export type TipoSeleccionExtra = 'CANTIDAD' | 'CHECKBOX'
export type EstadoMesa = 'LIBRE' | 'OCUPADA'

export interface Producto {
  ProductoID: number
  Nombre: string
  Precio: number
  CategoriaID: number | null
  Activo: boolean
}

export interface Mesa {
  MesaID: number
  NumeroMesa: string
  Estado: EstadoMesa
}

export interface Mesero {
  MeseroID: number
  Nombres: string
}

export interface Categoria {
  CategoriaID: number
  Nombre: string
  Orden: number
  RequierePreparacion: boolean
}

export interface Extra {
  ExtraID: number
  Nombre: string
  PrecioUnitario: number
  CategoriaID: number | null
  TipoSeleccion: TipoSeleccionExtra
  EsAlterno: boolean
  Activo: boolean
  Orden: number
}

export interface Cliente {
  ClienteID: number
  NombreCompleto: string
  NumeroDocumento: string | null
  Telefono: string | null
}

export interface Pedido {
  PedidoID: number
  MeseroID: number
  ClienteID: number
  Total: number
  TipoServicio: TipoServicio
  EstadoPedido: EstadoPedido
  FechaCreacion: string
  // Nombre suelto para identificar el pedido sin crear un Cliente real en la
  // base (ver CartContext.confirmarPedido) — mismo campo que usa la app de
  // escritorio (db/melchorita/01_esquema.sql). null cuando no aplica.
  NombreDestinatario: string | null
}

export interface DetallePedido {
  DetalleID: number
  PedidoID: number
  ProductoID: number
  Cantidad: number
  PrecioUnitario: number
  Notas: string | null
  EsParaLlevar: boolean
  EstadoPlato: EstadoPlato
  FechaAgregado: string
}

export interface AsignacionMesa {
  PedidoID: number
  MesaID: number
}

// Ítem del carrito en construcción (todavía no existe como fila en Supabase).
export interface CartItem {
  idProd: number
  nombre: string
  categoriaId: number | null
  precioUnit: number
  precioBase: number
  cantidad: number
  esLlevar: boolean
  notas: string
}

export interface DeliveryInfo {
  nombre: string
  direccion: string
  telefono: string
}

// Plato dentro del pedido que se está editando (mesa ocupada). estadoPlato
// incluye 'NUEVO' además de los valores reales de EstadoPlato porque un plato
// recién agregado en el modal todavía no existe como fila en DetallePedido.
// Fila de la cola de cocina: un DetallePedido EN_COLA enriquecido con datos
// de su Pedido y las mesas asociadas (join hecho en el cliente, como en app.js).
export interface ColaCocinaItem {
  DetalleID: number
  PedidoID: number
  ProductoID: number
  Cantidad: number
  PrecioUnitario: number
  Notas: string | null
  EsParaLlevar: boolean
  EstadoPlato: EstadoPlato
  FechaAgregado: string
  productoNombre: string
  mesas: string[]
}

// Un pedido completo agrupado en la cola de cocina (varios platos de un mismo
// PedidoID), tal como se ve en el Monitor de Cocina de la app de escritorio:
// una tarjeta por pedido, no una por plato.
export interface PedidoCola {
  pedidoId: number
  posicion: number
  tipoServicio: TipoServicio
  labelUbicacion: string
  clienteNombre: string
  meseroNombre: string
  horaPedido: string
  minutosEspera: number
  items: ColaCocinaItem[]
}

export interface PlatoEditar {
  detalleID: number | null
  productoID: number
  categoriaId: number | null
  nombre: string
  cantidad: number
  precioUnit: number
  precioBase: number
  notas: string
  esLlevar: boolean
  estadoPlato: EstadoPlato | 'NUEVO'
  esNuevo: boolean
}
