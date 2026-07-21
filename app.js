const clienteSupabase = window.clienteSupabase;

// ── Estado global ─────────────────────────────────────────────────────────────
let productosDB       = [];
let mesas             = [];
let carrito           = [];
let itemEditandoIndex = -1;
let precioBaseModal   = 0;

window.tipoServicioActual = 'MESA';

// Estado del modal editar pedido
let pedidoEditando = null;
let platosEditar   = [];
let platosEliminar = [];
let vistaActual     = 'pedidos';
let colaCocina      = [];

// ── Extras (agregados/complementos) ───────────────────────────────────────────
// Antes esto era una lista fija acá mismo (con precios que quedaban
// desactualizados apenas cambiaban en la app de escritorio). Ahora se carga
// de la tabla Extras en Supabase — la misma que usa la app de escritorio —
// así que un cambio de precio o un agregado nuevo se ve acá sin tocar código.
// TipoSeleccion: 'CANTIDAD' (selector +/-, ej. Palito Anticucho) o
// 'CHECKBOX' (casilla simple, ej. Helado).
let extrasDB = [];

// Extras tipo CANTIDAD del plato que está abierto en el modal de personalizar
// (filtrados por su categoría) — contadoresExtras usa el ExtraID como clave.
let extrasModalActuales = [];
const contadoresExtras = {};

// Extras tipo CHECKBOX elegidos en cada flujo de "agregar producto" — se
// resetean después de cada agregado.
const extrasCheckboxElegidos = { productos: new Set(), editar: new Set() };

// ── Init ──────────────────────────────────────────────────────────────────────
window.onload = async () => {
    const hasSession = await checkSession();
    if (!hasSession) {
        window.location.href = 'login.html';
        return;
    }

    const fechaEl = document.getElementById('fechaActual');
    if (fechaEl) fechaEl.innerText = 'Conectando...';
    try {
        await cargarDatosIniciales();
        if (fechaEl) fechaEl.innerText = 'En línea';
        suscribirCambiosMesas();
        suscribirCambiosCocina();
        await cargarVistaCocina();
    } catch (error) {
        console.error('Error al iniciar:', error);
        if (fechaEl) fechaEl.innerText = 'Error de conexión';
        alert('Error de conexión. Revisa consola (F12).');
    }
};

async function cargarDatosIniciales() {
    const { data: prodData, error: errProd } = await clienteSupabase
        .from('Productos').select('*').eq('Activo', true);
    if (errProd) throw errProd;
    if (prodData) {
        productosDB = prodData;
        llenarCombo();
        llenarComboEditar();
    }
    await fetchMesas();
    await cargarMeseros();
    await cargarExtras();
    renderCarrito();
}

// Try/catch propio: Extras es una tabla nueva — si por lo que sea la
// consulta falla, que no tumbe el resto del arranque (mesas, productos,
// meseros ya cargaron bien en ese punto).
async function cargarExtras() {
    try {
        const { data, error } = await clienteSupabase
            .from('Extras').select('*').eq('Activo', true).order('Orden', { ascending: true });
        if (error) throw error;
        extrasDB = data || [];
    } catch (error) {
        console.error('Error cargando Extras:', error);
        extrasDB = [];
    }
}

function extrasPorCategoria(categoriaId, tipoSeleccion) {
    const catId = categoriaId ? parseInt(categoriaId) : null;
    return extrasDB.filter(ex => {
        if (ex.TipoSeleccion !== tipoSeleccion) return false;
        // CategoriaID null en el extra = aplica a cualquier categoría.
        return ex.CategoriaID === null || ex.CategoriaID === catId;
    });
}

async function cargarMeseros() {
    const { data: meseros, error } = await clienteSupabase
        .from('Meseros').select('*').order('MeseroID', { ascending: true });
    if (error) { console.error('Error cargando meseros:', error); return; }
    const cbo = document.getElementById('cboMeseros');
    if (!cbo || !meseros) return;
    cbo.innerHTML = '';
    meseros.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.MeseroID;
        opt.textContent = m.Nombres;
        cbo.appendChild(opt);
    });
}

async function fetchMesas() {
    const { data: mesasData, error } = await clienteSupabase
        .from('Mesas').select('*').order('MesaID', { ascending: true });
    if (error) throw error;
    if (mesasData) {
        mesas = mesasData;
        const countEl = document.getElementById('countMesas');
        if (countEl) countEl.innerText = mesas.length;
        renderMesas();
    }
}

function renderMesas() {
    const container = document.getElementById('mesasContainer');
    container.innerHTML = '';
    mesas.forEach(m => {
        const isOcupada = m.Estado === 'OCUPADA';
        const baseClass = 'aspect-[4/3] rounded-[20px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95 relative border-2 shadow-soft';
        const colorClass = isOcupada
            ? 'mesa-ocupada'
            : 'border-slate-200 text-slate-400 hover:border-guinda/30 hover:text-slate-600 group bg-white';
        const clickFn = isOcupada
            ? `onclick="abrirModalEditarPedido(${m.MesaID}, '${m.NumeroMesa}')"`
            : `onclick="toggleMesa(this, ${m.MesaID})"`;

        container.innerHTML += `
            <div class="${baseClass} ${colorClass}" ${clickFn} id="mesa-${m.MesaID}">
                <span class="text-[9px] font-black opacity-60 uppercase tracking-widest mt-1">Mesa</span>
                <span class="text-2xl font-black leading-none">${m.NumeroMesa}</span>
                ${isOcupada ? '<span class="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></span>' : ''}
            </div>`;
    });
}

function toggleMesa(el, id) {
    if (el.classList.contains('mesa-seleccionada')) {
        el.classList.remove('mesa-seleccionada', 'bg-guinda', 'text-white', 'border-guinda');
        el.classList.add('bg-white', 'text-slate-400', 'border-slate-200');
    } else {
        el.classList.remove('bg-white', 'text-slate-400', 'border-slate-200');
        el.classList.add('mesa-seleccionada', 'bg-guinda', 'text-white', 'border-guinda');
    }
}

// ── Tipo de Servicio ──────────────────────────────────────────────────────────
function selectService(btn) {
    document.querySelectorAll('.radio-btn').forEach(b => {
        b.classList.remove('servicio-activo');
        b.classList.add('bg-white', 'text-gray-600');
    });
    btn.classList.remove('bg-white', 'text-gray-600');
    btn.classList.add('servicio-activo');

    window.tipoServicioActual = btn.dataset.servicio || 'MESA';
    window.scrollTo({ top: 0, behavior: 'instant' });

    const panelMapa     = document.getElementById('panelMapa');
    const panelDelivery = document.getElementById('panelDelivery');

    if (window.tipoServicioActual === 'DELIVERY') {
        panelMapa.classList.add('hidden');
        panelDelivery.classList.remove('hidden');
        panelDelivery.classList.add('flex', 'flex-col');
        document.querySelectorAll('.mesa-seleccionada').forEach(m => {
            m.classList.remove('mesa-seleccionada', 'bg-guinda', 'text-white', 'border-guinda');
            m.classList.add('bg-white', 'text-slate-400', 'border-slate-200');
        });
    } else if (window.tipoServicioActual === 'MESA') {
        panelDelivery.classList.add('hidden');
        panelDelivery.classList.remove('flex', 'flex-col');
        panelMapa.classList.remove('hidden');
        limpiarDelivery();
    } else {
        panelDelivery.classList.add('hidden');
        panelDelivery.classList.remove('flex', 'flex-col');
        panelMapa.classList.add('hidden');
        limpiarDelivery();
        document.querySelectorAll('.mesa-seleccionada').forEach(m => {
            m.classList.remove('mesa-seleccionada', 'bg-guinda', 'text-white', 'border-guinda');
            m.classList.add('bg-white', 'text-slate-400', 'border-slate-200');
        });
    }
}

function limpiarDelivery() {
    ['txtNombreDelivery', 'txtDireccionDelivery', 'txtTelefonoDelivery'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ── Buscar cliente por DNI ────────────────────────────────────────────────────
async function buscarClientePorDni(dni) {
    if (dni.length < 8) return;
    const { data: cliente } = await clienteSupabase
        .from('Clientes').select('NombreCompleto, Telefono')
        .eq('NumeroDocumento', dni).single();
    if (cliente) {
        const txtNombre = document.getElementById('txtNombreCliente');
        if (txtNombre) txtNombre.value = cliente.NombreCompleto || '';
        if (window.tipoServicioActual === 'DELIVERY' && cliente.Telefono) {
            const txtTel = document.getElementById('txtTelefonoDelivery');
            if (txtTel) txtTel.value = cliente.Telefono;
        }
    }
}

// ── Combos de productos ───────────────────────────────────────────────────────
function llenarCombo() {
    const cbo = document.getElementById('cboProductos');
    cbo.innerHTML = '<option value="" disabled selected>🔍 Buscar producto...</option>';
    productosDB.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.ProductoID;
        opt.text = `${p.Nombre} - S/ ${parseFloat(p.Precio).toFixed(2)}`;
        opt.dataset.precio = p.Precio;
        opt.dataset.nombre = p.Nombre;
        opt.dataset.categoriaId = p.CategoriaID ?? '';
        cbo.appendChild(opt);
    });
}

function llenarComboEditar() {
    const cbo = document.getElementById('cboProductosEditar');
    if (!cbo) return;
    cbo.innerHTML = '<option value="" disabled selected>Selecciona un producto...</option>';
    productosDB.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.ProductoID;
        opt.text = `${p.Nombre} - S/ ${parseFloat(p.Precio).toFixed(2)}`;
        opt.dataset.precio = p.Precio;
        opt.dataset.nombre = p.Nombre;
        opt.dataset.categoriaId = p.CategoriaID ?? '';
        cbo.appendChild(opt);
    });
}

// ── Extras con picker +/- (modal Personalizar) ────────────────────────────────
// Se llama al abrir el modal con la categoría del plato puntual — antes la
// lista era siempre la misma (complementos de anticucho) sin importar qué
// plato se estuviera editando.
function renderExtrasModal(categoriaId) {
    const container = document.getElementById('listaExtras');
    const sinExtrasMsg = document.getElementById('sinExtrasMsg');
    if (!container) return;

    extrasModalActuales = extrasPorCategoria(categoriaId, 'CANTIDAD');
    Object.keys(contadoresExtras).forEach(k => delete contadoresExtras[k]);
    extrasModalActuales.forEach(ex => { contadoresExtras[ex.ExtraID] = 0; });

    container.innerHTML = '';
    if (sinExtrasMsg) sinExtrasMsg.classList.toggle('hidden', extrasModalActuales.length > 0);

    extrasModalActuales.forEach(ex => {
        const esAlterno = ex.EsAlterno;
        container.innerHTML += `
            <div class="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <div class="pl-1">
                    <div class="text-sm font-bold text-gray-800">${escapeHtml(ex.Nombre)}</div>
                    <div class="text-[10px] ${esAlterno ? 'text-green-600' : 'text-orange-600'} font-bold">+ S/ ${parseFloat(ex.PrecioUnitario).toFixed(2)} c/u</div>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="cambiarExtra(${ex.ExtraID}, -1)" class="w-9 h-9 rounded-xl bg-gray-100 font-bold text-gray-500 active:scale-90 transition-transform">-</button>
                    <span id="cnt_${ex.ExtraID}" class="font-bold w-7 text-center text-sm">0</span>
                    <button onclick="cambiarExtra(${ex.ExtraID}, 1)" class="w-9 h-9 rounded-xl ${esAlterno ? 'bg-green-100 text-green-700' : 'bg-amarillo text-gray-800'} font-bold active:scale-90 transition-transform">+</button>
                </div>
            </div>`;
    });
}

// ── Extras tipo casilla (Helado, etc.) — flujo de "agregar producto" ──────────
// contexto: 'productos' (carrito principal) o 'editar' (modal editar pedido).
function renderExtrasCheckbox(categoriaId, containerId, contexto) {
    const container = document.getElementById(containerId);
    if (!container) return;

    extrasCheckboxElegidos[contexto].clear();
    const disponibles = extrasPorCategoria(categoriaId, 'CHECKBOX');

    container.innerHTML = disponibles.map(ex => `
        <label class="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors select-none">
            <input type="checkbox" class="accent-amarillo w-4 h-4 rounded shadow-sm"
                   onchange="toggleExtraCheckbox(${ex.ExtraID}, '${contexto}', this.checked)">
            <span>${escapeHtml(ex.Nombre)} (+S/ ${parseFloat(ex.PrecioUnitario).toFixed(2)})</span>
        </label>`).join('');
}

function toggleExtraCheckbox(extraId, contexto, marcado) {
    if (marcado) extrasCheckboxElegidos[contexto].add(extraId);
    else extrasCheckboxElegidos[contexto].delete(extraId);
}

// Extras CHECKBOX actualmente elegidos para un contexto, como objetos {nombre, precio}.
function obtenerExtrasCheckboxElegidos(contexto) {
    return [...extrasCheckboxElegidos[contexto]]
        .map(id => extrasDB.find(ex => ex.ExtraID === id))
        .filter(Boolean);
}

function onProductoSeleccionadoCambio() {
    const cbo = document.getElementById('cboProductos');
    const sel = cbo.options[cbo.selectedIndex];
    const categoriaId = sel && !sel.disabled ? sel.dataset.categoriaId : null;
    renderExtrasCheckbox(categoriaId, 'extrasCheckboxProductos', 'productos');
}

function onProductoSeleccionadoCambioEditar() {
    const cbo = document.getElementById('cboProductosEditar');
    const sel = cbo.options[cbo.selectedIndex];
    const categoriaId = sel && !sel.disabled ? sel.dataset.categoriaId : null;
    renderExtrasCheckbox(categoriaId, 'extrasCheckboxEditar', 'editar');
}

function cambiarExtra(extraId, delta) {
    const current = contadoresExtras[extraId] ?? 0;
    contadoresExtras[extraId] = Math.max(0, current + delta);
    const lbl = document.getElementById(`cnt_${extraId}`);
    if (lbl) lbl.innerText = contadoresExtras[extraId];
    recalcularModal();
}

function recalcularModal() {
    let total = precioBaseModal;
    extrasModalActuales.forEach(ex => {
        total += (contadoresExtras[ex.ExtraID] || 0) * parseFloat(ex.PrecioUnitario);
    });
    const lbl = document.getElementById('lblModalPrecio');
    if (lbl) lbl.innerText = total.toFixed(2);
}

// ── Carrito ───────────────────────────────────────────────────────────────────
function agregarProducto() {
    const cbo = document.getElementById('cboProductos');
    const sel = cbo.options[cbo.selectedIndex];
    if (!sel || sel.disabled) return alert('Seleccione un producto');

    const cant       = parseInt(document.getElementById('txtCantidad').value) || 1;
    const esLlevar   = document.getElementById('chkLlevar').checked;
    const precioBase = parseFloat(sel.dataset.precio);

    // Agregados tipo casilla elegidos (ej. Helado) — suman al precio y quedan
    // como nota, igual que en la app de escritorio.
    const extrasElegidos = obtenerExtrasCheckboxElegidos('productos');
    const precioConExtras = precioBase + extrasElegidos.reduce((s, ex) => s + parseFloat(ex.PrecioUnitario), 0);
    const notas = extrasElegidos.map(ex => `+${ex.Nombre}`).join(', ');

    let existente = carrito.find(x => x.idProd == sel.value && x.esLlevar == esLlevar && x.notas === notas);

    if (existente) {
        existente.cantidad += cant;
    } else {
        carrito.push({
            idProd:      sel.value,
            nombre:      sel.dataset.nombre,
            categoriaId: sel.dataset.categoriaId || null,
            precioUnit:  precioConExtras,
            cantidad:    cant,
            esLlevar,
            notas,
            precioBase:  precioBase
        });
    }
    renderCarrito();
    document.getElementById('chkLlevar').checked = false;
    document.getElementById('txtCantidad').value = 1;
    cbo.value = '';
    renderExtrasCheckbox(null, 'extrasCheckboxProductos', 'productos');
}

function renderCarrito() {
    const tbody      = document.getElementById('listaDetalle');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML  = '';
    let total = 0;

    if (carrito.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        carrito.forEach((item, index) => {
            const subtotal = item.cantidad * item.precioUnit;
            total += subtotal;
            const tagLlevar = item.esLlevar ? '<span class="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded ml-1 border border-amber-200">LLEVAR</span>' : '';
            const notasHtml = item.notas ? `<div class="text-[10px] text-guinda font-medium mt-0.5 truncate italic">📝 ${item.notas}</div>` : '';

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-50 hover:bg-gray-50 cursor-pointer group transition-colors';
            row.onclick   = () => abrirModalEditar(index);
            row.innerHTML = `
                <td class="py-3 text-center align-middle">
                    <span class="font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md text-xs">${item.cantidad}</span>
                </td>
                <td class="py-3 px-2 align-middle">
                    <div class="font-bold text-gray-800 text-xs leading-tight">${item.nombre} ${tagLlevar}</div>
                    ${notasHtml}
                </td>
                <td class="py-3 px-2 text-right align-middle font-bold text-gray-700 text-xs whitespace-nowrap">
                    S/ ${subtotal.toFixed(2)}
                </td>
                <td class="py-3 text-center align-middle pr-2">
                    <button class="w-6 h-6 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center text-sm transition-colors"
                            onclick="event.stopPropagation(); eliminarFila(${index})">✕</button>
                </td>`;
            tbody.appendChild(row);
        });
    }
    const totalStr = total.toFixed(2);
    document.getElementById('lblTotal').innerText = totalStr;
    const mobileTotal = document.getElementById('lblTotalMobile');
    if (mobileTotal) mobileTotal.innerText = totalStr;
}

function eliminarFila(index) {
    if (confirm('¿Eliminar producto?')) { carrito.splice(index, 1); renderCarrito(); }
}

// ── Modal Personalizar ────────────────────────────────────────────────────────
function abrirModalEditar(index) {
    itemEditandoIndex         = index;
    window._guardarParaEditor = false;
    const item = carrito[index];
    document.getElementById('modalPersonalizar').classList.remove('hidden');
    document.getElementById('modalTitulo').innerText = item.nombre;
    document.getElementById('txtModalNotas').value   = '';
    precioBaseModal = item.precioBase;

    renderExtrasModal(item.categoriaId);
    recalcularModal();
}

function cerrarModal() {
    document.getElementById('modalPersonalizar').classList.add('hidden');
    itemEditandoIndex         = -1;
    window._guardarParaEditor = false;
    editarPersonalizarIndex   = -1;
}

// Limpia todos los extras y notas, restaura precio base
function limpiarPersonalizacion() {
    // Resetear UI del modal
    document.getElementById('txtModalNotas').value = '';
    extrasModalActuales.forEach(ex => {
        contadoresExtras[ex.ExtraID] = 0;
        const el = document.getElementById(`cnt_${ex.ExtraID}`);
        if (el) el.innerText = '0';
    });

    // Aplicar precio base (sin extras) y notas vacías
    if (window._guardarParaEditor && editarPersonalizarIndex >= 0) {
        const base = platosEditar[editarPersonalizarIndex].precioBase
                  || platosEditar[editarPersonalizarIndex].precioUnit;
        platosEditar[editarPersonalizarIndex].precioUnit = base;
        platosEditar[editarPersonalizarIndex].notas      = '';
        renderPlatosEditar();
    } else if (itemEditandoIndex >= 0) {
        const base = carrito[itemEditandoIndex].precioBase
                  || carrito[itemEditandoIndex].precioUnit;
        carrito[itemEditandoIndex].precioUnit = base;
        carrito[itemEditandoIndex].notas      = '';
        renderCarrito();
    }

    cerrarModal();
}

function guardarCambiosModal() {
    const nuevoPrecio = parseFloat(document.getElementById('lblModalPrecio').innerText);
    let notasArr = [];
    const notaManual = document.getElementById('txtModalNotas').value.trim();
    if (notaManual) notasArr.push(notaManual.toUpperCase());
    extrasModalActuales.forEach(ex => {
        if ((contadoresExtras[ex.ExtraID] || 0) > 0)
            notasArr.push(`+${contadoresExtras[ex.ExtraID]} ${ex.Nombre.toUpperCase()}`);
    });

    if (window._guardarParaEditor && editarPersonalizarIndex >= 0) {
        platosEditar[editarPersonalizarIndex].precioUnit = nuevoPrecio;
        platosEditar[editarPersonalizarIndex].notas      = notasArr.join(', ');
        renderPlatosEditar();
    } else if (itemEditandoIndex >= 0) {
        carrito[itemEditandoIndex].precioUnit = nuevoPrecio;
        carrito[itemEditandoIndex].notas      = notasArr.join(', ');
        renderCarrito();
    }
    cerrarModal();
}

// ── Obtener / crear cliente ───────────────────────────────────────────────────
async function obtenerIdCliente(dni, nombre) {
    if (!nombre || nombre.trim() === '' || nombre.trim() === 'CLIENTE GENÉRICO') {
        return await obtenerIdClienteGenerico();
    }
    nombre = nombre.toUpperCase().trim();
    dni    = dni ? dni.trim() : null;

    if (dni && dni.length >= 8) {
        const { data: existente } = await clienteSupabase
            .from('Clientes').select('ClienteID').eq('NumeroDocumento', dni).single();
        if (existente) return existente.ClienteID;
    }

    const { data: nuevo, error } = await clienteSupabase
        .from('Clientes').insert([{ NombreCompleto: nombre, NumeroDocumento: dni || null }])
        .select('ClienteID').single();
    if (error) throw new Error('No se pudo registrar el cliente.');
    return nuevo.ClienteID;
}

async function obtenerIdClienteGenerico() {
    const { data } = await clienteSupabase
        .from('Clientes').select('ClienteID').eq('NumeroDocumento', '00000000').single();
    if (data) return data.ClienteID;
    alert('No se encontró el cliente genérico (DNI: 00000000). Créalo en Supabase.');
    throw new Error('Cliente genérico no encontrado');
}

// ── Confirmar Pedido ──────────────────────────────────────────────────────────
async function confirmarPedido() {
    if (carrito.length === 0) return alert('⚠️ El pedido está vacío');

    const tipoServicio = window.tipoServicioActual || 'MESA';

    if (tipoServicio === 'DELIVERY') {
        const nombre    = document.getElementById('txtNombreDelivery')?.value.trim();
        const direccion = document.getElementById('txtDireccionDelivery')?.value.trim();
        const telefono  = document.getElementById('txtTelefonoDelivery')?.value.trim();
        if (!nombre)    return alert('⚠️ Ingresa el nombre del destinatario');
        if (!direccion) return alert('⚠️ Ingresa la dirección de entrega');
        if (!telefono)  return alert('⚠️ Ingresa el teléfono de contacto');
    }

    const mesasSeleccionadasEls = document.querySelectorAll('.mesa-seleccionada');
    const mesasIds = Array.from(mesasSeleccionadasEls).map(el => parseInt(el.id.split('-')[1]));
    if (tipoServicio === 'MESA' && mesasIds.length === 0)
        return alert('⚠️ Por favor selecciona al menos una mesa.');

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin inline-block">↻</span> GUARDANDO...`;
    btn.disabled  = true;

    try {
        const totalPedido = parseFloat(document.getElementById('lblTotal').innerText);
        const dniVal      = document.getElementById('txtDni')?.value.trim() || '';

        let idClienteFinal;
        if (tipoServicio === 'DELIVERY') {
            const nombreDelivery = document.getElementById('txtNombreDelivery').value.trim();
            if (dniVal.length >= 8) {
                idClienteFinal = await obtenerIdCliente(dniVal, nombreDelivery);
            } else if (nombreDelivery) {
                const { data: nuevo, error } = await clienteSupabase
                    .from('Clientes')
                    .insert([{ NombreCompleto: nombreDelivery.toUpperCase() }])
                    .select('ClienteID').single();
                if (error) throw new Error('No se pudo registrar el cliente.');
                idClienteFinal = nuevo.ClienteID;
            } else {
                idClienteFinal = await obtenerIdClienteGenerico();
            }
        } else {
            const nombreVal = document.getElementById('txtNombreCliente')?.value.trim() || '';
            idClienteFinal  = await obtenerIdCliente(dniVal, nombreVal);
        }

        const { data: pedidoData, error: pedidoError } = await clienteSupabase
            .from('Pedidos').insert([{
                MeseroID:      parseInt(document.getElementById('cboMeseros').value) || 1,
                ClienteID:     idClienteFinal,
                Total:         totalPedido,
                TipoServicio:  tipoServicio,
                EstadoPedido:  'PENDIENTE',
                FechaCreacion: new Date().toISOString()
            }]).select().single();
        if (pedidoError) throw pedidoError;

        const nuevoPedidoId = pedidoData.PedidoID;

        const notasDelivery = tipoServicio === 'DELIVERY'
            ? `🚀 ${document.getElementById('txtNombreDelivery').value.trim()} | 📍 ${document.getElementById('txtDireccionDelivery').value.trim()} | 📞 ${document.getElementById('txtTelefonoDelivery').value.trim()}`
            : '';

        const ahora    = new Date().toISOString();
        const detalles = carrito.map((item, i) => ({
            PedidoID:       nuevoPedidoId,
            ProductoID:     parseInt(item.idProd),
            Cantidad:       item.cantidad,
            PrecioUnitario: item.precioUnit,
            Notas:          i === 0 && notasDelivery
                                ? (item.notas ? `${item.notas} | ${notasDelivery}` : notasDelivery)
                                : item.notas,
            EsParaLlevar:   item.esLlevar,
            EstadoPlato:    'EN_COLA',
            FechaAgregado:  ahora
        }));

        const { error: detalleError } = await clienteSupabase
            .from('DetallePedido').insert(detalles);
        if (detalleError) throw detalleError;

        if (mesasIds.length > 0) {
            await clienteSupabase.from('AsignacionMesas')
                .insert(mesasIds.map(mId => ({ PedidoID: nuevoPedidoId, MesaID: mId })));
            await clienteSupabase.from('Mesas').update({ Estado: 'OCUPADA' }).in('MesaID', mesasIds);
            await fetchMesas();
        }

        alert(`✅ ¡Pedido #${nuevoPedidoId} guardado correctamente!`);
        carrito = [];
        renderCarrito();
        limpiarDelivery();
        document.getElementById('txtDni').value           = '';
        document.getElementById('txtNombreCliente').value = '';
        document.querySelectorAll('.mesa-seleccionada').forEach(m => {
            m.classList.remove('mesa-seleccionada', 'bg-guinda', 'text-white', 'border-guinda');
            m.classList.add('bg-white', 'text-slate-400', 'border-slate-200');
        });

    } catch (err) {
        console.error('Error al guardar:', err);
        alert('❌ Error al guardar: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled  = false;
    }
}

// ── Suscripción realtime ──────────────────────────────────────────────────────
function suscribirCambiosMesas() {
    clienteSupabase.channel('tabla-mesas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Mesas' }, () => fetchMesas())
        .subscribe();
}

// ═══════════════════════════════════════════════════════════════════════════════
//   MODAL EDITAR PEDIDO (Mesa Ocupada)
// ═══════════════════════════════════════════════════════════════════════════════

async function abrirModalEditarPedido(mesaId, numeroMesa) {
    pedidoEditando = null;
    platosEditar   = [];
    platosEliminar = [];

    const modal = document.getElementById('modalEditarPedido');
    modal.classList.remove('hidden');

    document.getElementById('editarPedidoTitulo').innerText    = `Mesa ${numeroMesa}`;
    document.getElementById('editarPedidoSubtitulo').innerText = 'Cargando pedido...';
    document.getElementById('editarListaCargando').classList.remove('hidden');
    document.getElementById('editarListaPlatos').classList.add('hidden');
    document.getElementById('editarTotal').innerText = '0.00';

    try {
        const { data: asigs } = await clienteSupabase
            .from('AsignacionMesas').select('PedidoID').eq('MesaID', mesaId);
        if (!asigs || asigs.length === 0) {
            mostrarErrorEditar('No se encontró pedido activo para esta mesa.');
            return;
        }

        const pedidoIDs = asigs.map(a => a.PedidoID);

        const { data: pedidos } = await clienteSupabase
            .from('Pedidos').select('*')
            .in('PedidoID', pedidoIDs)
            .neq('EstadoPedido', 'ANULADO')
            .neq('EstadoPedido', 'PAGADO')
            .order('FechaCreacion', { ascending: false });

        if (!pedidos || pedidos.length === 0) {
            mostrarErrorEditar('No hay pedidos activos para esta mesa.');
            return;
        }

        const pedido = pedidos[0];

        // ── Buscar TODAS las mesas vinculadas a este pedido ────────────────────
        const { data: todasAsigs } = await clienteSupabase
            .from('AsignacionMesas').select('MesaID').eq('PedidoID', pedido.PedidoID);

        let labelMesas = `Mesa ${numeroMesa}`; // fallback
        if (todasAsigs && todasAsigs.length > 0) {
            const mesaIdsDelPedido = todasAsigs.map(a => a.MesaID);
            const { data: mesasData } = await clienteSupabase
                .from('Mesas').select('NumeroMesa').in('MesaID', mesaIdsDelPedido)
                .order('NumeroMesa', { ascending: true });
            if (mesasData && mesasData.length > 0) {
                labelMesas = 'Mesa ' + mesasData.map(m => m.NumeroMesa).join(' + ');
            }
        }

        pedidoEditando = {
            pedidoID:     pedido.PedidoID,
            mesaID:       mesaId,
            numeroMesa,
            estadoPedido: pedido.EstadoPedido
        };

        document.getElementById('editarPedidoTitulo').innerText    = `Pedido #${pedido.PedidoID}`;
        document.getElementById('editarPedidoSubtitulo').innerText = labelMesas;

        const badge = document.getElementById('editarPedidoBadge');
        badge.innerText = pedido.EstadoPedido;
        badge.className = pedido.EstadoPedido === 'SERVIDO'
            ? 'text-[10px] font-black px-3 py-1 rounded-full bg-green-500/30 text-white border border-green-300/30 uppercase tracking-wider'
            : 'text-[10px] font-black px-3 py-1 rounded-full bg-white/20 text-white border border-white/20 uppercase tracking-wider';

        const { data: detalles } = await clienteSupabase
            .from('DetallePedido').select('*')
            .eq('PedidoID', pedido.PedidoID)
            .order('FechaAgregado', { ascending: true });

        const dictNombres = {};
        const dictCategorias = {};
        productosDB.forEach(p => {
            dictNombres[p.ProductoID] = p.Nombre;
            dictCategorias[p.ProductoID] = p.CategoriaID;
        });

        // SERVIDOS primero (informativo, no editables), luego EN_COLA
        platosEditar = [
            ...(detalles || []).filter(d => d.EstadoPlato === 'SERVIDO'),
            ...(detalles || []).filter(d => d.EstadoPlato === 'EN_COLA'),
        ].map(d => ({
            detalleID:   d.DetalleID,
            productoID:  d.ProductoID,
            categoriaId: dictCategorias[d.ProductoID] ?? null,
            nombre:      dictNombres[d.ProductoID] || 'Producto',
            cantidad:    d.Cantidad,
            precioUnit:  d.PrecioUnitario,
            precioBase:  d.PrecioUnitario,
            notas:       d.Notas || '',
            esLlevar:    d.EsParaLlevar,
            estadoPlato: d.EstadoPlato,
            esNuevo:     false
        }));

        renderPlatosEditar();

    } catch (err) {
        console.error(err);
        mostrarErrorEditar(err.message);
    }
}

function mostrarErrorEditar(msg) {
    document.getElementById('editarListaCargando').classList.add('hidden');
    const container = document.getElementById('editarListaPlatos');
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="p-8 flex flex-col items-center justify-center text-red-400 gap-2">
            <span class="text-3xl">⚠️</span>
            <span class="text-xs font-bold">${msg}</span>
        </div>`;
}

function renderPlatosEditar() {
    document.getElementById('editarListaCargando').classList.add('hidden');
    const container = document.getElementById('editarListaPlatos');
    container.classList.remove('hidden');
    container.innerHTML = '';

    let total = 0;

    if (platosEditar.length === 0) {
        container.innerHTML = `
            <div class="p-8 flex flex-col items-center justify-center text-gray-300 gap-2">
                <span class="text-3xl">🍽️</span>
                <span class="text-xs font-bold uppercase tracking-wider">Sin platos</span>
            </div>`;
        document.getElementById('editarTotal').innerText = '0.00';
        return;
    }

    platosEditar.forEach((plato, index) => {
        const subtotal  = plato.cantidad * plato.precioUnit;
        total += subtotal;

        const esServido = plato.estadoPlato === 'SERVIDO';
        const esNuevo   = plato.esNuevo;

        const badge = esServido
            ? '<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase ml-1.5">SERVIDO</span>'
            : esNuevo
                ? '<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 uppercase ml-1.5">NUEVO</span>'
                : '';

        const notasHtml = plato.notas
            ? `<div class="text-[10px] text-guinda font-medium mt-0.5 italic">📝 ${plato.notas}</div>` : '';

        const btnEliminar = !esServido
            ? `<button onclick="eliminarPlatoEditar(${index})" class="w-7 h-7 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center text-sm transition-colors shrink-0">✕</button>`
            : '<div class="w-7 shrink-0"></div>';

        const btnPersonalizar = !esServido
            ? `<button onclick="abrirPersonalizarEditar(${index})" title="Personalizar" class="w-7 h-7 rounded-full hover:bg-guinda/10 text-slate-300 hover:text-guinda flex items-center justify-center text-sm transition-colors shrink-0">✏️</button>`
            : '';

        container.innerHTML += `
            <div class="flex items-center gap-2 px-4 py-3 ${esServido ? 'opacity-50 bg-gray-50/50' : 'hover:bg-gray-50'} transition-colors">
                <span class="bg-gray-100 text-gray-600 font-bold text-xs px-2 py-1 rounded-md shrink-0 border border-gray-200">${plato.cantidad}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center flex-wrap gap-0.5">
                        <span class="font-bold text-gray-800 text-xs">${plato.nombre}</span>
                        ${badge}
                    </div>
                    ${notasHtml}
                </div>
                <span class="font-bold text-xs text-gray-600 whitespace-nowrap">S/ ${subtotal.toFixed(2)}</span>
                ${btnPersonalizar}
                ${btnEliminar}
            </div>`;
    });

    document.getElementById('editarTotal').innerText = total.toFixed(2);
}

function agregarPlatoEditar() {
    const cbo = document.getElementById('cboProductosEditar');
    const sel = cbo.options[cbo.selectedIndex];
    if (!sel || sel.disabled) return alert('Selecciona un producto');

    const cant       = parseInt(document.getElementById('cantEditar').value) || 1;
    const esLlevar   = document.getElementById('chkLlevarEditar').checked;
    const precioBase = parseFloat(sel.dataset.precio);

    const extrasElegidos  = obtenerExtrasCheckboxElegidos('editar');
    const precioConExtras = precioBase + extrasElegidos.reduce((s, ex) => s + parseFloat(ex.PrecioUnitario), 0);
    const notas = extrasElegidos.map(ex => `+${ex.Nombre}`).join(', ');

    platosEditar.push({
        detalleID:   null,
        productoID:  parseInt(sel.value),
        categoriaId: sel.dataset.categoriaId || null,
        nombre:      sel.dataset.nombre || sel.text.split(' - ')[0],
        cantidad:    cant,
        precioUnit:  precioConExtras,
        precioBase:  precioBase,
        notas,
        esLlevar,
        estadoPlato: 'NUEVO',
        esNuevo:     true
    });

    renderPlatosEditar();

    // Resetear campos
    cbo.value = '';
    document.getElementById('cantEditar').value        = 1;
    document.getElementById('chkLlevarEditar').checked = false;
    renderExtrasCheckbox(null, 'extrasCheckboxEditar', 'editar');
    // El mesero puede personalizar el plato haciendo tap en ✏️ en la lista
}

function eliminarPlatoEditar(index) {
    const plato = platosEditar[index];
    if (plato.detalleID) platosEliminar.push(plato.detalleID);
    platosEditar.splice(index, 1);
    renderPlatosEditar();
}

// Personalizar plato desde el editor (doble clic)
let editarPersonalizarIndex = -1;

function abrirPersonalizarEditar(index) {
    const plato = platosEditar[index];
    editarPersonalizarIndex   = index;
    itemEditandoIndex         = -1;
    window._guardarParaEditor = true;

    document.getElementById('modalPersonalizar').classList.remove('hidden');
    document.getElementById('modalTitulo').innerText = plato.nombre;
    document.getElementById('txtModalNotas').value   = plato.notas || '';
    precioBaseModal = plato.precioBase || plato.precioUnit;

    renderExtrasModal(plato.categoriaId);
    recalcularModal();
}

async function guardarCambiosEditar() {
    if (!pedidoEditando) return;

    const btn = document.getElementById('btnGuardarEditar');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="animate-spin inline-block">↻</span> Guardando...';
    btn.disabled  = true;

    try {
        // 1. Eliminar platos marcados
        for (const id of platosEliminar) {
            const { error } = await clienteSupabase
                .from('DetallePedido').delete().eq('DetalleID', id);
            if (error) throw error;
        }

        // 2. Actualizar platos EN_COLA existentes (no nuevos)
        const platosExistentes = platosEditar.filter(p => p.detalleID && !p.esNuevo && p.estadoPlato === 'EN_COLA');
        for (const p of platosExistentes) {
            const { error } = await clienteSupabase.from('DetallePedido')
                .update({ Cantidad: p.cantidad, PrecioUnitario: p.precioUnit, Notas: p.notas })
                .eq('DetalleID', p.detalleID);
            if (error) throw error;
        }

        // 3. ✅ FIX PRINCIPAL: Insertar platos NUEVOS con FechaAgregado = ahora
        //    Al ser timestamp actual, siempre quedan AL FINAL de la cola FIFO
        //    independientemente del estado del pedido padre.
        const platosNuevos = platosEditar.filter(p => p.esNuevo);
        if (platosNuevos.length > 0) {
            const ahora  = new Date().toISOString();
            const nuevos = platosNuevos.map(p => ({
                PedidoID:       pedidoEditando.pedidoID,
                ProductoID:     parseInt(p.productoID), // ✅ asegurar entero
                Cantidad:       p.cantidad,
                PrecioUnitario: p.precioUnit,
                Notas:          p.notas || '',
                EsParaLlevar:   p.esLlevar || false,
                EstadoPlato:    'EN_COLA',
                FechaAgregado:  ahora
            }));

            const { error: errInsert } = await clienteSupabase
                .from('DetallePedido').insert(nuevos);
            if (errInsert) throw errInsert;

            // ✅ FIX: Siempre verificar el estado actual del pedido en BD
            //    (no confiar en el valor guardado al abrir el modal,
            //     que puede ser stale si cocina lo marcó como SERVIDO mientras
            //     el cajero tenía el modal abierto)
            const { data: pedidoActual } = await clienteSupabase
                .from('Pedidos').select('EstadoPedido')
                .eq('PedidoID', pedidoEditando.pedidoID)
                .single();

            const estadoActual = pedidoActual?.EstadoPedido || pedidoEditando.estadoPedido;

            // Si está SERVIDO o PAGADO, volver a PENDIENTE para que cocina lo vea
            if (estadoActual === 'SERVIDO' || estadoActual === 'PAGADO') {
                const { error: errUpdate } = await clienteSupabase
                    .from('Pedidos')
                    .update({ EstadoPedido: 'PENDIENTE' })
                    .eq('PedidoID', pedidoEditando.pedidoID);
                if (errUpdate) throw errUpdate;
            }
        }

        // 4. Recalcular total — solo suma platos NO servidos (los activos)
        // ✅ FIX: excluir SERVIDOS del nuevo total ya que esos ya se cobraron
        //    en la lógica de negocio el total solo refleja lo que está EN_COLA + NUEVO
        const nuevoTotal = platosEditar
            .filter(p => p.estadoPlato !== 'SERVIDO')
            .reduce((sum, p) => sum + p.cantidad * p.precioUnit, 0);

        const { error: errTotal } = await clienteSupabase
            .from('Pedidos')
            .update({ Total: nuevoTotal })
            .eq('PedidoID', pedidoEditando.pedidoID);
        if (errTotal) throw errTotal;

        alert('✅ Pedido actualizado. Los platos nuevos están al final de la cola en cocina.');
        cerrarModalEditar();
        await fetchMesas();

    } catch (err) {
        console.error('Error al guardar:', err);
        alert('❌ Error al guardar: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled  = false;
    }
}

function cerrarModalEditar() {
    document.getElementById('modalEditarPedido').classList.add('hidden');
    pedidoEditando = null;
    platosEditar   = [];
    platosEliminar = [];
}

function cambiarVista(vista) {
    vistaActual = vista === 'cocina' ? 'cocina' : 'pedidos';

    const orderView        = document.getElementById('orderView');
    const kitchenView      = document.getElementById('kitchenView');
    const btnPedidos       = document.getElementById('btnVistaPedidos');
    const btnCocina        = document.getElementById('btnVistaCocina');
    const mobileOrderBar   = document.getElementById('mobileOrderBar');
    const mobileKitchenBar = document.getElementById('mobileKitchenBar');

    if (orderView) orderView.classList.toggle('hidden', vistaActual !== 'pedidos');
    if (kitchenView) kitchenView.classList.toggle('hidden', vistaActual !== 'cocina');
    if (mobileOrderBar) mobileOrderBar.classList.toggle('hidden', vistaActual !== 'pedidos');
    if (mobileKitchenBar) mobileKitchenBar.classList.toggle('hidden', vistaActual !== 'cocina');
    if (btnPedidos) btnPedidos.classList.toggle('view-tab-active', vistaActual === 'pedidos');
    if (btnCocina) btnCocina.classList.toggle('view-tab-active', vistaActual === 'cocina');

    if (vistaActual === 'cocina') cargarVistaCocina();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileNavMenu');
    const button = document.getElementById('mobileMenuButton');
    if (!menu || !button) return;

    const isOpen = menu.classList.contains('menu-visible');
    menu.classList.toggle('menu-visible', !isOpen);
    menu.classList.toggle('menu-hidden', isOpen);
    button.setAttribute('aria-expanded', String(!isOpen));
}

function cerrarMenuMovil() {
    const menu = document.getElementById('mobileNavMenu');
    const button = document.getElementById('mobileMenuButton');
    if (!menu || !button) return;

    menu.classList.remove('menu-visible');
    menu.classList.add('menu-hidden');
    button.setAttribute('aria-expanded', 'false');
}

function seleccionarMenuMovil(vista) {
    cambiarVista(vista);
    cerrarMenuMovil();
}

function cerrarSesionDesdeMenu() {
    cerrarMenuMovil();
    cerrarSesion();
}

function suscribirCambiosCocina() {
    clienteSupabase.channel('cola-cocina')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'DetallePedido' }, () => cargarVistaCocina())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Pedidos' }, () => cargarVistaCocina())
        .subscribe();
}

async function cargarVistaCocina() {
    const queueEl = document.getElementById('kitchenQueue');
    if (!queueEl) return;

    queueEl.innerHTML = `
        <div class="col-span-full min-h-[260px] flex flex-col items-center justify-center gap-3 text-slate-400">
            <div class="w-10 h-10 border-[4px] border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            <span class="text-xs font-black uppercase tracking-widest">Cargando cola...</span>
        </div>`;

    try {
        const { data: detalles, error } = await clienteSupabase
            .from('DetallePedido')
            .select('DetalleID, PedidoID, ProductoID, Cantidad, PrecioUnitario, Notas, EsParaLlevar, EstadoPlato, FechaAgregado')
            .eq('EstadoPlato', 'EN_COLA')
            .order('FechaAgregado', { ascending: true });
        if (error) throw error;

        const cola = detalles || [];
        const pedidoIds = [...new Set(cola.map(d => d.PedidoID).filter(Boolean))];

        let pedidosMap = {};
        let mesasPorPedido = {};

        if (pedidoIds.length > 0) {
            const { data: pedidos } = await clienteSupabase
                .from('Pedidos')
                .select('PedidoID, TipoServicio, EstadoPedido, FechaCreacion')
                .in('PedidoID', pedidoIds)
                .neq('EstadoPedido', 'ANULADO')
                .neq('EstadoPedido', 'PAGADO');

            (pedidos || []).forEach(p => { pedidosMap[p.PedidoID] = p; });

            const { data: asignaciones } = await clienteSupabase
                .from('AsignacionMesas')
                .select('PedidoID, MesaID')
                .in('PedidoID', pedidoIds);

            const mesaIds = [...new Set((asignaciones || []).map(a => a.MesaID).filter(Boolean))];
            let mesasMap = {};
            if (mesaIds.length > 0) {
                const { data: mesasData } = await clienteSupabase
                    .from('Mesas')
                    .select('MesaID, NumeroMesa')
                    .in('MesaID', mesaIds);
                (mesasData || []).forEach(m => { mesasMap[m.MesaID] = m.NumeroMesa; });
            }

            (asignaciones || []).forEach(a => {
                if (!mesasPorPedido[a.PedidoID]) mesasPorPedido[a.PedidoID] = [];
                const numero = mesasMap[a.MesaID];
                if (numero) mesasPorPedido[a.PedidoID].push(numero);
            });
        }

        const productosMap = {};
        productosDB.forEach(p => { productosMap[p.ProductoID] = p.Nombre; });

        colaCocina = cola
            .filter(d => pedidosMap[d.PedidoID])
            .map((d, index) => ({
                ...d,
                posicion: index + 1,
                productoNombre: productosMap[d.ProductoID] || `Producto #${d.ProductoID}`,
                pedido: pedidosMap[d.PedidoID],
                mesas: mesasPorPedido[d.PedidoID] || []
            }));

        renderVistaCocina();
    } catch (err) {
        console.error('Error cargando cocina:', err);
        queueEl.innerHTML = `
            <div class="col-span-full min-h-[260px] flex flex-col items-center justify-center text-red-400 gap-2">
                <span class="text-3xl">!</span>
                <span class="text-xs font-bold">No se pudo cargar la cola de cocina.</span>
            </div>`;
    }
}

function renderVistaCocina() {
    const queueEl   = document.getElementById('kitchenQueue');
    const summaryEl = document.getElementById('kitchenSummary');
    if (!queueEl || !summaryEl) return;

    const platosCount = colaCocina.reduce((sum, item) => sum + (parseInt(item.Cantidad) || 0), 0);
    const pedidosCount = new Set(colaCocina.map(item => item.PedidoID)).size;
    const oldestDate = colaCocina[0]?.FechaAgregado ? new Date(colaCocina[0].FechaAgregado) : null;
    const waitingMinutes = oldestDate ? Math.max(0, Math.round((Date.now() - oldestDate.getTime()) / 60000)) : 0;

    setText('kpiPlatosCola', platosCount);
    setText('kpiPedidosCola', pedidosCount);
    setText('kpiTiempoCola', `${waitingMinutes}m`);
    setText('kpiPlatosMobile', platosCount);
    setText('kitchenLastSync', `Actualizado ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`);

    if (colaCocina.length === 0) {
        queueEl.innerHTML = `
            <div class="col-span-full min-h-[300px] flex flex-col items-center justify-center text-slate-300 select-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-3 stroke-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-400">No hay pedidos en cola</span>
            </div>`;
        summaryEl.innerHTML = '<div class="text-xs font-bold text-slate-400 p-4 text-center">Todo al dia.</div>';
        return;
    }

    queueEl.innerHTML = colaCocina.map(item => {
        const servicio = item.pedido?.TipoServicio || 'MESA';
        const labelUbicacion = item.mesas.length > 0 ? `Mesa ${item.mesas.join(' + ')}` : servicio;
        const minutes = item.FechaAgregado ? Math.max(0, Math.round((Date.now() - new Date(item.FechaAgregado).getTime()) / 60000)) : 0;
        const urgent = minutes >= 15;
        const notas = item.Notas ? `<p class="mt-3 text-xs font-bold text-guinda bg-guinda/5 border border-guinda/10 rounded-xl px-3 py-2">${escapeHtml(item.Notas)}</p>` : '';
        const llevar = item.EsParaLlevar ? '<span class="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">LLEVAR</span>' : '';

        return `
            <article class="rounded-[20px] border ${urgent ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-white'} shadow-soft overflow-hidden">
                <div class="p-4 sm:p-5">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-900 text-white">#${item.posicion}</span>
                                <span class="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">Pedido ${item.PedidoID}</span>
                                ${llevar}
                            </div>
                            <h4 class="text-lg font-black text-slate-900 leading-tight mt-3">${escapeHtml(item.productoNombre)}</h4>
                            <p class="text-xs font-bold text-slate-500 mt-1">${escapeHtml(labelUbicacion)}</p>
                        </div>
                        <div class="shrink-0 text-right">
                            <div class="text-3xl font-black text-slate-900 leading-none">${item.Cantidad}</div>
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">cant.</div>
                        </div>
                    </div>
                    ${notas}
                    <div class="mt-4 flex items-center justify-between gap-3">
                        <span class="text-[11px] font-black ${urgent ? 'text-red-600' : 'text-slate-400'} uppercase tracking-widest">${minutes} min</span>
                        <button onclick="marcarPlatoServido(${item.DetalleID}, ${item.PedidoID})" class="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wide active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                            Servido
                        </button>
                    </div>
                </div>
            </article>`;
    }).join('');

    const resumen = colaCocina.reduce((acc, item) => {
        const key = item.pedido?.TipoServicio || 'MESA';
        acc[key] = (acc[key] || 0) + (parseInt(item.Cantidad) || 0);
        return acc;
    }, {});

    summaryEl.innerHTML = Object.entries(resumen).map(([servicio, cantidad]) => `
        <div class="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
            <span class="text-xs font-black text-slate-700 uppercase tracking-wide">${escapeHtml(servicio)}</span>
            <strong class="text-lg font-black text-slate-900">${cantidad}</strong>
        </div>
    `).join('');
}

async function marcarPlatoServido(detalleID, pedidoID) {
    const ok = confirm('Marcar este plato como servido?');
    if (!ok) return;

    try {
        const { error } = await clienteSupabase
            .from('DetallePedido')
            .update({ EstadoPlato: 'SERVIDO' })
            .eq('DetalleID', detalleID);
        if (error) throw error;

        const { count, error: countError } = await clienteSupabase
            .from('DetallePedido')
            .select('DetalleID', { count: 'exact', head: true })
            .eq('PedidoID', pedidoID)
            .eq('EstadoPlato', 'EN_COLA');
        if (countError) throw countError;

        if ((count || 0) === 0) {
            const { error: pedidoError } = await clienteSupabase
                .from('Pedidos')
                .update({ EstadoPedido: 'SERVIDO' })
                .eq('PedidoID', pedidoID);
            if (pedidoError) throw pedidoError;
        }

        await cargarVistaCocina();
        await fetchMesas();
    } catch (err) {
        console.error('Error marcando servido:', err);
        alert('No se pudo marcar como servido: ' + err.message);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
