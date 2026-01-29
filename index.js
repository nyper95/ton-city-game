// CONFIGURACIÓN MAESTRA
const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_RESERVA_80 = "DIRECCION_DE_TU_RESERVA_AQUI"; 
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE'; // Tu llave pública
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

// ESTADO LOCAL
let gameState = {
    userId: null,
    userDiamonds: 0,
    totalDiamondsCirculando: 5000, // Valor global simulado
    reservaTonGlobal: 10.0,         // Valor global simulado
    miGananciaAcumulada: 0
};

// 1. CARGAR DATOS DESDE SUPABASE
async function loadUserData(user) {
    gameState.userId = user.id.toString();
    const { data, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('telegram_id', gameState.userId)
        .single();

    if (data) {
        gameState.userDiamonds = data.diamonds;
        actualizarUI();
    } else {
        // Si el usuario es nuevo, crearlo
        await _supabase.from('usuarios').insert([
            { telegram_id: gameState.userId, username: user.username, diamonds: 0 }
        ]);
    }
}

// 2. GUARDAR DATOS EN SUPABASE
async function saveUserData() {
    if (!gameState.userId) return;
    await _supabase
        .from('usuarios')
        .update({ diamonds: gameState.userDiamonds })
        .eq('telegram_id', gameState.userId);
}

// 3. LÓGICA DE COMPRA Y CÁLCULO
function getDiamondPrice() {
    return gameState.reservaTonGlobal / gameState.totalDiamondsCirculando;
}

async function comprarDiamantes() {
    if (!tonConnectUI.connected) {
        alert("¡Conecta tu Tonkeeper!");
        return;
    }

    const montoTON = prompt("¿Cuánto TON deseas cambiar por Diamantes?");
    if (montoTON && !isNaN(montoTON) && montoTON > 0) {
        const nanoMonto = Math.floor(parseFloat(montoTON) * 1000000000);
        const mi20 = Math.floor(nanoMonto * 0.20);
        const reserva80 = nanoMonto - mi20;

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                { address: MI_BILLETERA, amount: mi20.toString() },
                { address: BILLETERA_RESERVA_80, amount: reserva80.toString() }
            ]
        };

        try {
            await tonConnectUI.sendTransaction(transaction);
            
            const precioActual = getDiamondPrice();
            const obtenidos = Math.floor(parseFloat(montoTON) / precioActual);
            
            gameState.userDiamonds += obtenidos;
            gameState.miGananciaAcumulada += parseFloat(montoTON) * 0.20;
            
            await saveUserData(); // Guardar en Supabase inmediatamente
            actualizarUI();
            alert(`💎 ¡Recibiste ${obtenidos} Diamantes!`);
        } catch (e) {
            alert("Error o transacción cancelada.");
        }
    }
}

function actualizarUI() {
    const precio = getDiamondPrice();
    document.getElementById('user-diamonds').innerText = gameState.userDiamonds.toLocaleString();
    document.getElementById('diamond-price').innerText = precio.toFixed(6);
    
    // Modal Central
    if(document.getElementById('total-circulacion')){
        document.getElementById('total-circulacion').innerText = gameState.totalDiamondsCirculando.toLocaleString();
        document.getElementById('reserva-ton').innerText = gameState.reservaTonGlobal.toFixed(2);
        document.getElementById('precio-calc').innerText = precio.toFixed(6);
        document.getElementById('mi-ganancia').innerText = gameState.miGananciaAcumulada.toFixed(4);
    }
}

window.onload = () => {
    tg.expand();
    const user = tg.initDataUnsafe.user;
    if(user) {
        document.getElementById('user-display').innerText = `@${user.username || "Usuario"}`;
        loadUserData(user); // Cargar datos al entrar
    }
};

// Funciones de Modal (Iguales a las anteriores)
function abrirCentral() { actualizarUI(); document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-central').style.display = 'block'; }
function cerrarTodo() { document.getElementById('overlay').style.display = 'none'; document.getElementById('modal-central').style.display = 'none'; }
