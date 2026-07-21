const SUPABASE_URL = 'https://lnwzsthdknozprrecrul.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rmODgJ53NafOE3M9CsVv9w_UqVdoQGQ';

// Inicializar cliente globalmente para que todas las pantallas puedan usarlo
if (!window.clienteSupabase && window.supabase) {
    window.clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ── Lógica de Autenticación ───────────────────────────────────────────────────

/**
 * Inicia sesión con el correo y contraseña provistos en Supabase.
 */
async function iniciarSesion(email, password) {
    const { data, error } = await window.clienteSupabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            throw new Error('Usuario o contraseña incorrectos.');
        }
        throw error;
    }
    
    return data;
}

/**
 * Verifica si hay una sesión activa en cache. Retorna la sesión o null.
 */
async function checkSession() {
    const { data, error } = await window.clienteSupabase.auth.getSession();
    if (error) {
        console.error('Error al verificar sesión:', error.message);
        return false;
    }
    return data.session !== null;
}

/**
 * Cierra la sesión activa en Supabase y redirige al login
 */
async function cerrarSesion() {
    try {
        await window.clienteSupabase.auth.signOut();
        window.location.href = 'login.html';
    } catch (e) {
        console.error('Error al cerrar sesión', e);
        alert('Hubo un error al cerrar sesión.');
    }
}
