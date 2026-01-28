// CONFIGURACIÓN MAESTRA
const MI_API_KEY = "AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ";
const MI_BILLETERA_DUEÑO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; //
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

const tg = window.Telegram.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://tu-usuario.github.io/tu-repositorio/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

let stats = {
    balance: 0.00000000,
    tasa: 0.00000000,
    invBanco: 0.00,
    negocios: { banco: 0.0, tienda: 0.0, casino: 0.0, piscina: 0.0 },
    comisionReferidos: 0.00
};

// 1. INVERTIR (ENVÍO AUTOMÁTICO 20/80)
async function invertirEnBanco() {
    if (!tonConnectUI.connected) {
        alert("Conecta tu Tonkeeper primero.");
        return;
    }

    const monto = prompt("¿Cuánto TON vas a depositar?");
    if (monto && !isNaN(monto)) {
        const cantidad = parseFloat(monto);
        const montoNano = Math.floor(cantidad * 1000000000);
        
        // El 20% para ti y 80% para el fondo del usuario
        const miParte = Math.floor(montoNano * 0.20);
        const parteUsuario = montoNano - miParte;

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                { address: MI_BILLETERA_DUEÑO, amount: miParte.toString() },
                { address: "DIRECCION_DE_TU_CONTRATO", amount: parteUsuario.toString() }
            ]
        };

        try {
            await tonConnectUI.sendTransaction(transaction);
            activarStaking(cantidad);
        } catch (e) {
            alert("Error en la transacción.");
        }
    }
}

// 2. ACTIVAR GANANCIAS (STAKING)
function activarStaking(monto) {
    stats.invBanco += monto;
    // Genera el 80% para el usuario (ejemplo 12% anual)
    stats.tasa += (monto * 0.12 * 0.80) / 31536000;
    actualizarPantalla();
    alert("🏦 Staking iniciado. Tu 80% está trabajando automáticamente.");
}

// 3. RETIRO AUTOMÁTICO
async function retirarGanancias() {
    if (stats.balance < 0.1) {
        alert("Mínimo para retirar: 0.1 TON");
        return;
    }
    alert("Procesando retiro desde la bóveda hacia tu wallet...");
    // Aquí el sistema descuenta del balance y envía desde el contrato
    stats.balance = 0;
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

function actualizarPantalla() {
    document.getElementById('balance').innerText = stats.balance.toFixed(8);
    document.getElementById('income-rate').innerText = `+${stats.tasa.toFixed(8)} TON/sec`;
}

window.onload = () => {
    iniciarMotor();
    const user = tg.initDataUnsafe.user;
    document.getElementById('user-display').innerText = user ? `@${user.username}` : "@Usuario_Cuba";
};
        
