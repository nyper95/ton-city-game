// 1. CONFIGURACIÓN DE IDENTIDAD Y SEGURIDAD
const MI_API_KEY = "AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ"; //
const MI_BILLETERA_DUEÑO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; //
const CONTRATO_BOVEDA = "DIRECCION_DE_TU_CONTRATO_AQUI"; // El destino del 80%

const tg = window.Telegram.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json', //
    buttonRootId: 'ton-connect-button'
});

// 2. ESTADO DEL SISTEMA (Se sincronizará con Supabase)
let stats = {
    balance: 0.00000000,
    tasa: 0.00000000,      // Producción por segundo
    invBanco: 0.00,        // Total en Staking
    comisionReferidos: 0.00000000, // Tu 10% del Edificio Central
    negocios: { banco: 0.0, tienda: 0.0, casino: 0.0, piscina: 0.0 } //
};

// 3. LÓGICA DE INVERSIÓN (REPARTO AUTOMÁTICO 20/80)
async function invertirEnBanco() {
    if (!tonConnectUI.connected) {
        alert("Primero conecta tu Tonkeeper con el botón superior.");
        return;
    }

    const montoStr = prompt("¿Cuánto TON deseas poner en Staking?");
    if (montoStr && !isNaN(montoStr) && parseFloat(montoStr) > 0) {
        const cantidad = parseFloat(montoStr);
        const montoNano = Math.floor(cantidad * 1000000000);
        
        // Cálculo de división automática
        const miParte = Math.floor(montoNano * 0.20); // Tu 20%
        const parteBoveda = montoNano - miParte;      // 80% para el fondo

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                { address: MI_BILLETERA_DUEÑO, amount: miParte.toString() }, // Envío a tu wallet
                { address: CONTRATO_BOVEDA, amount: parteBoveda.toString() }  // Envío al fondo
            ]
        };

        try {
            const result = await tonConnectUI.sendTransaction(transaction);
            // Si la transacción se firma, activamos el contador visual
            confirmarInversion(cantidad);
        } catch (e) {
            alert("Transacción cancelada o fallida.");
        }
    }
}

// 4. MOTOR DE PRODUCCIÓN (Cálculo de ganancias reales)
function confirmarInversion(monto) {
    stats.invBanco += monto;
    
    // Tasa: 12% anual sobre el 80% que quedó en el sistema
    const gananciaUsuarioSeg = (monto * 0.12 * 0.80) / 31536000;
    stats.tasa += gananciaUsuarioSeg;
    
    // Tu 10% adicional por referidos que verás en el Edificio Central
    stats.comisionReferidos += (monto * 0.12 * 0.10) / 31536000;

    tg.HapticFeedback.notificationOccurred('success');
    actualizarPantalla();
}

function iniciarMotor() {
    setInterval(() => {
        if (stats.tasa > 0) {
            stats.balance += stats.tasa;
            stats.negocios.banco += stats.tasa;
            actualizarPantalla();
        }
    }, 1000);
}

// 5. INTERFAZ Y EDIFICIO CENTRAL
function actualizarPantalla() {
    document.getElementById('balance').innerText = stats.balance.toFixed(8);
    document.getElementById('income-rate').innerText = `+${stats.tasa.toFixed(8)} TON/sec`;
    
    if(document.getElementById('inv-banco')) {
        document.getElementById('inv-banco').innerText = `Staking: ${stats.invBanco.toFixed(2)} TON`;
    }
}

window.actualizarModalCentral = function() {
    // Datos para el Edificio Central
    document.getElementById('data-banco').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-total').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8); // Tu 10%
};

// INICIO
window.onload = () => {
    iniciarMotor();
    const user = tg.initDataUnsafe.user;
    if(document.getElementById('user-display')) {
        document.getElementById('user-display').innerText = user ? `@${user.username}` : "@Usuario_Cuba";
    }
};
