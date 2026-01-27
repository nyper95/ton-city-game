// --- CONFIGURACIÓN INICIAL ---
const tg = window.Telegram.WebApp;
tg.expand();

// Estado del usuario (Esto luego lo conectarás a una base de datos)
let userData = {
    balance: 0.00000000,
    prodPerSec: 0.00000000, // Empieza en 0
    lastUpdate: Date.now(),
    lastParkClaim: 0 // Timestamp del último reclamo en el parque
};

// --- ELEMENTOS DEL DOM ---
const balanceEl = document.getElementById('balance-val');
const rateEl = document.getElementById('mining-rate');
const userDisplay = document.getElementById('user-display');

// Mostrar nombre de Telegram
if (tg.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    userDisplay.innerText = user.username ? `@${user.username}` : user.first_name.toUpperCase();
}

// --- LÓGICA DE PRODUCCIÓN ---

function updateMining() {
    const now = Date.now();
    const deltaTime = (now - userData.lastUpdate) / 1000; // Segundos transcurridos
    
    if (userData.prodPerSec > 0) {
        userData.balance += userData.prodPerSec * deltaTime;
        renderBalance();
    }
    
    userData.lastUpdate = now;
    requestAnimationFrame(updateMining); // Bucle suave
}

function renderBalance() {
    // Mostramos 8 decimales para que se vea el movimiento tipo "faucet"
    balanceEl.innerText = userData.balance.toFixed(8);
    rateEl.innerText = `+${userData.prodPerSec.toFixed(8)} TON/sec`;
}

// --- ACCIONES DE LOS NEGOCIOS ---

// Función para el Parque (Gratis cada 2 horas)
function recolectarParque() {
    const now = Date.now();
    const cooldown = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

    if (now - userData.lastParkClaim >= cooldown) {
        const premio = 0.0005; // Cantidad de TON gratis
        userData.balance += premio;
        userData.lastParkClaim = now;
        
        tg.showAlert(`¡Has recolectado ${premio} TON en el Parque!`);
        renderBalance();
    } else {
        const restante = Math.ceil((cooldown - (now - userData.lastParkClaim)) / 60000);
        tg.showAlert(`El parque está vacío. Vuelve en ${restante} minutos.`);
    }
}

// Función para simular compra de mejoras en la Tienda
function comprarMejora(costo, aumentoProd) {
    if (userData.balance >= costo) {
        userData.balance -= costo;
        userData.prodPerSec += aumentoProd;
        tg.HapticFeedback.notificationOccurred('success');
        renderBalance();
    } else {
        tg.showAlert("No tienes suficiente TON para esta mejora.");
    }
}

// Iniciar el loop
requestAnimationFrame(updateMining);
