const tg = window.Telegram.WebApp;
const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_RESERVA_80 = "DIRECCION_DE_TU_RESERVA_AQUI"; // Aquí va el 80%

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

// ESTADO GLOBAL DEL JUEGO
let gameState = {
    userDiamonds: 0,
    totalDiamonds: 1000, // Diamantes iniciales en circulación
    reservaTon: 1.0,      // Reserva inicial para dar valor
    miGananciaAcumulada: 0
};

// CÁLCULO DEL PRECIO (80% Reserva / Total Diamantes)
function getDiamondPrice() {
    return gameState.reservaTon / gameState.totalDiamonds;
}

async function comprarDiamantes() {
    if (!tonConnectUI.connected) {
        alert("¡Conecta tu Tonkeeper primero!");
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
            
            // Lógica de conversión tras pago exitoso
            const precioActual = getDiamondPrice();
            const diamantesObtenidos = Math.floor(parseFloat(montoTON) / precioActual);
            
            gameState.userDiamonds += diamantesObtenidos;
            gameState.totalDiamonds += diamantesObtenidos;
            gameState.reservaTon += parseFloat(montoTON) * 0.80;
            gameState.miGananciaAcumulada += parseFloat(montoTON) * 0.20;
            
            actualizarUI();
            alert(`¡Éxito! Has recibido ${diamantesObtenidos} 💎`);
        } catch (e) {
            alert("Transacción cancelada o error de red.");
        }
    }
}

function actualizarUI() {
    const precio = getDiamondPrice();
    document.getElementById('user-diamonds').innerText = gameState.userDiamonds.toLocaleString();
    document.getElementById('diamond-price').innerText = precio.toFixed(6);
    
    // Datos del modal central
    document.getElementById('total-circulacion').innerText = gameState.totalDiamonds.toLocaleString();
    document.getElementById('reserva-ton').innerText = gameState.reservaTon.toFixed(2);
    document.getElementById('precio-calc').innerText = precio.toFixed(6);
    document.getElementById('mi-ganancia').innerText = gameState.miGananciaAcumulada.toFixed(4);
}

function abrirCentral() {
    actualizarUI();
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal-central').style.display = 'block';
}

function cerrarTodo() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('modal-central').style.display = 'none';
}

window.onload = () => {
    tg.expand();
    const user = tg.initDataUnsafe.user;
    if(user) {
        document.getElementById('user-display').innerText = `@${user.username || user.first_name}`;
    }
    actualizarUI();
};
