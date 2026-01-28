// Credenciales Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://tu-sitio-web.com/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

let stats = {
    balance: 0.00000000,
    tasa: 0.00000000,
    invBanco: 0.00,
    negocios: { banco: 0.0, tienda: 0.0, casino: 0.0, piscina: 0.0 },
    comisionReferidos: 0.00
};

// 1. CARGAR USUARIO TELEGRAM
function cargarUsuario() {
    const user = tg.initDataUnsafe.user;
    document.getElementById('user-display').innerText = user ? `@${user.username || user.first_name}` : "@Invitado";
}

// 2. LÓGICA DEL BANCO (CONTRATO DIRECTO)
async function menuBanco() {
    if (!tonConnectUI.connected) {
        alert("Por favor, conecta tu billetera primero.");
        return;
    }

    const monto = prompt("¿Cuánto TON deseas invertir?");
    if (monto && !isNaN(monto)) {
        const cantidad = parseFloat(monto);
        
        // TRANSACCIÓN REAL EN LA BLOCKCHAIN
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: "TU_BILLETERA_AQUI", // Reemplaza con tu dirección de TON
                amount: (cantidad * 1000000000).toString(), // En NanoTON
            }]
        };

        try {
            await tonConnectUI.sendTransaction(transaction);
            procesarInversionExitosa(cantidad);
        } catch (e) {
            alert("Pago cancelado o fallido.");
        }
    }
}

function procesarInversionExitosa(cantidad) {
    stats.invBanco += cantidad;
    
    // REPARTO 80/20: Solo el 80% genera para el usuario
    // Tasa anual del 15% ejemplo:
    const tasaAnual = 0.15;
    const gananciaUsuarioSeg = (cantidad * tasaAnual) / 31536000 * 0.80;
    
    stats.tasa += gananciaUsuarioSeg;
    document.getElementById('inv-banco').innerText = `Invertido: ${stats.invBanco.toFixed(2)}`;
    actualizarPantalla();
    alert("🏦 Inversión confirmada. ¡Tu ciudad está produciendo!");
}

// 3. ACTUALIZACIONES
function iniciarContador() {
    setInterval(() => {
        if (stats.tasa > 0) {
            stats.balance += stats.tasa;
            stats.negocios.banco += stats.tasa; 
            actualizarPantalla();
        }
    }, 1000);
}

function actualizarPantalla() {
    document.getElementById('balance').innerText = stats.balance.toFixed(8);
    document.getElementById('income-rate').innerText = `+${stats.tasa.toFixed(8)} TON/sec`;
}

window.actualizarModal = function() {
    document.getElementById('data-banco').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-total').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8);
}

window.onload = () => {
    cargarUsuario();
    iniciarContador();
};
