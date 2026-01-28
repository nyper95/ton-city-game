// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'TU_URL_DE_SUPABASE';
const SUPABASE_KEY = 'TU_KEY_DE_SUPABASE';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// VARIABLES DE JUEGO
let balancePrincipal = 0.0;
let gananciaNegocios = 0.0;
let comisionAmigos = 0.0; // Tu 10% de invitados

// Función para mostrar los datos detallados
function abrirEdificioCentral() {
    alert(`🏢 PANEL DE CONTROL\n\n` +
          `💰 Ganancia acumulada negocios: ${gananciaNegocios.toFixed(8)} TON\n` +
          `👥 Tu 10% por invitados: ${comisionAmigos.toFixed(8)} TON\n\n` +
          `Haz clic en 'Recolectar' para pasar esto a tu Capital Disponible.`);
}

// Función para el botón del Parque
function recolectarParque() {
    const bono = 0.00005;
    balancePrincipal += bono;
    actualizarPantalla();
    alert("¡Has recolectado 0.00005 TON del Parque! 🌳");
}

function actualizarPantalla() {
    document.getElementById('balance').innerText = `💎 ${balancePrincipal.toFixed(8)}`;
}

// Guardar progreso en Supabase automáticamente
async function guardarProgreso(userId) {
    const { data, error } = await supabase
        .from('usuarios')
        .upsert({ 
            id: userId, 
            balance: balancePrincipal, 
            negocios: gananciaNegocios 
        });
}
