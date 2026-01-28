// CONFIGURACIÓN DE SEGURIDAD
const MI_BILLETERA_DUEÑO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://tu-sitio-web.com/tonconnect-manifest.json', // Cambia por tu URL real
    buttonRootId: 'ton-connect-button'
});

let stats = {
    balance: 0.00000000,
    tasa: 0.00000000,
    invBanco: 0.00,
    negocios: { banco: 0.0, tienda: 0.0, casino: 0.0, piscina: 0.0 },
    comisionReferidos: 0.00
};

// 1. FUNCIÓN DE INVERSIÓN CON ENVÍO AUTOMÁTICO
async function invertirEnBanco() {
    if (!tonConnectUI.connected) {
        alert("Primero conecta tu billetera con el botón de arriba.");
        return;
    }

    const montoStr = prompt("¿Cuánto TON deseas poner en Staking?");
    if (montoStr && !isNaN(montoStr)) {
        const cantidad = parseFloat(montoStr);
        const montoNano = Math.floor(cantidad * 1000000000); // TON a NanoTON
        
        // El 20% que va directo a ti
        const montoTuComision = Math.floor(montoNano * 0.20);
        // El 80% que se queda en el sistema/contrato para el usuario
        const montoStaking = montoNano - montoTuComision;

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: MI_BILLETERA_DUEÑO, 
                    amount: montoTuComision.toString(), // Tu 20% automático
                },
                {
                    address: "DIRECCION_DE_TU_BOVEDA_O_CONTRATO", // El 80% restante
                    amount: montoStaking.toString(),
                }
            ]
        };

        try {
            const result = await tonConnectUI.sendTransaction(transaction);
            // Si la blockchain confirma, activamos la producción
            activarProduccionReal(cantidad);
        } catch (e) {
            alert("La transacción fue cancelada o falló.");
        }
    }
}

function activarProduccionReal(montoInvertido) {
    stats.invBanco += montoInvertido;
    
    // El usuario gana sobre el 80% de su inversión real
    // Ejemplo: 12% anual.
    const gananciaUsuarioSeg = (montoInvertido * 0.12 * 0.80) / 31536000;
    
    stats.tasa += gananciaUsuarioSeg;
    
    // Actualizamos el 10% de referidos en el Edificio Central
    stats.comisionReferidos += (montoInvertido * 0.12 * 0.10) / 31536000;
    
    actualizarPantalla();
    tg.HapticFeedback.notificationOccurred('success');
    alert("✅ ¡Transacción exitosa! El 20% ha sido enviado al dueño y tu Staking ha comenzado.");
}

// 2. MOTOR DEL SISTEMA
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
    const invLabel = document.getElementById('inv-banco');
    if(invLabel) invLabel.innerText = `Staking: ${stats.invBanco.toFixed(2)} TON`;
}

// 3. EDIFICIO CENTRAL
window.actualizarModal = function() {
    document.getElementById('data-banco').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-total').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8);
};

window.onload = () => {
    iniciarMotor();
    const user = tg.initDataUnsafe.user;
    document.getElementById('user-display').innerText = user ? `@${user.username}` : "@Usuario_Cuba";
};
