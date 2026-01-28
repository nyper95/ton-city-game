// Credenciales Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
tg.expand();

let stats = {
    balance: 0.00010000, // Saldo inicial de prueba
    tasa: 0.00000000,    // Producción real por segundo
    invBanco: 0.00,
    comisionReferidos: 0.00000000,
    negocios: { banco: 0.0, tienda: 0.0, casino: 0.0, piscina: 0.0 }
};

// Configurar nombre real de Telegram
function cargarUsuario() {
    const user = tg.initDataUnsafe.user;
    document.getElementById('user-display').innerText = user ? `@${user.username || user.first_name}` : "@Invitado";
}

// Lógica del Banco: Inversión libre
function abrirMenuBanco() {
    const monto = prompt("¿Cuánto TON deseas depositar en el Banco?\n(Mientras más inviertas, más ganas)");
    if (monto && !isNaN(monto) && parseFloat(monto) <= stats.balance) {
        const cantidad = parseFloat(monto);
        stats.balance -= cantidad;
        stats.invBanco += cantidad;
        
        // El 80% genera para el usuario, el 20% es tu ganancia
        // Tasa ejemplo: 10% mensual -> 0.80 para usuario
        const tasaMensual = 0.10;
        stats.tasa += (cantidad * tasaMensual) / 2592000 * 0.80; 
        
        document.getElementById('inv-banco').innerText = `Inv: ${stats.invBanco.toFixed(2)}`;
        actualizarPantalla();
        alert("🏦 Depósito realizado. ¡Producción activada!");
    } else {
        alert("Monto inválido o saldo insuficiente.");
    }
}

// Contador de producción real
function iniciarContador() {
    setInterval(() => {
        if (stats.tasa > 0) {
            stats.balance += stats.tasa;
            // Registramos lo que genera el banco específicamente para el Edificio Central
            stats.negocios.banco += stats.tasa; 
            actualizarPantalla();
        }
    }, 1000);
}

function actualizarPantalla() {
    document.getElementById('balance').innerText = stats.balance.toFixed(8);
    document.getElementById('income-rate').innerText = `+${stats.tasa.toFixed(8)} TON/sec`;
}

// Datos detallados para el Edificio Central
window.actualizarModal = function() {
    document.getElementById('data-banco').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-tienda').innerText = stats.negocios.tienda.toFixed(8);
    document.getElementById('data-casino').innerText = stats.negocios.casino.toFixed(8);
    document.getElementById('data-piscina').innerText = stats.negocios.piscina.toFixed(8);
    
    const total = Object.values(stats.negocios).reduce((a, b) => a + b, 0);
    document.getElementById('data-total').innerText = total.toFixed(8);
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8);
}

function recolectarParque() {
    stats.balance += 0.00005;
    actualizarPantalla();
    tg.HapticFeedback.notificationOccurred('success');
}

window.onload = () => {
    cargarUsuario();
    iniciarContador();
};
        
