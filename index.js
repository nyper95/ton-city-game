// 1. CONFIGURACIÓN DE CREDENCIALES
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
tg.expand();

// 2. ESTADO INICIAL DEL NEGOCIO
let stats = {
    balance: 0.00000000,
    tasa: 0.00000000,    // Producción real por segundo (80% para el usuario)
    invBanco: 0.00,      // Total depositado en Staking
    comisionReferidos: 0.00000000, // Tu 10% por amigos invitados
    negocios: {
        banco: 0.0,
        tienda: 0.0,
        casino: 0.0,
        piscina: 0.0
    }
};

// 3. IDENTIFICACIÓN DE USUARIO
function cargarPerfil() {
    const user = tg.initDataUnsafe.user;
    const userDisplay = document.getElementById('user-display');
    if (user) {
        userDisplay.innerText = `@${user.username || user.first_name}`;
    } else {
        userDisplay.innerText = "@Usuario_Cuba";
    }
}

// 4. LÓGICA DE STAKING AUTOMÁTICO (BANCO)
window.invertirEnBanco = function() {
    const monto = prompt("¿Cuánto TON deseas poner en Staking?\nGeneración automática 24/7.");
    
    if (monto && !isNaN(monto) && parseFloat(monto) > 0) {
        const cantidad = parseFloat(monto);
        
        // Simulación de depósito exitoso
        stats.invBanco += cantidad;
        
        // CÁLCULO DE PRODUCCIÓN (Modelo 80/20)
        // Ejemplo: 12% interés anual -> Usuario recibe el 80% de eso.
        const interesAnual = 0.12; 
        const gananciaUsuarioSeg = (cantidad * interesAnual * 0.80) / 31536000;
        
        // Sumamos a la tasa actual para que los números corran
        stats.tasa += gananciaUsuarioSeg;
        
        // Simulamos también un pequeño ingreso por referidos (10% de lo que genera el sistema)
        stats.comisionReferidos += (cantidad * interesAnual * 0.10) / 31536000;

        actualizarPantalla();
        tg.HapticFeedback.impactOccurred('medium');
        alert("🏦 ¡Staking Activado! Tus ganancias están creciendo.");
    }
};

// 5. MOTOR DE PRODUCCIÓN (EL CONTADOR)
function iniciarMotor() {
    setInterval(() => {
        if (stats.tasa > 0) {
            // El balance principal sube
            stats.balance += stats.tasa;
            
            // Registramos el crecimiento específico del Banco para el Edificio Central
            stats.negocios.banco += stats.tasa;
            
            actualizarPantalla();
        }
    }, 1000);
}

// 6. ACTUALIZACIÓN DE INTERFAZ
function actualizarPantalla() {
    document.getElementById('balance').innerText = stats.balance.toFixed(8);
    document.getElementById('income-rate').innerText = `+${stats.tasa.toFixed(8)} TON/sec`;
    
    const invLabel = document.getElementById('inv-banco');
    if (invLabel) invLabel.innerText = `Staking: ${stats.invBanco.toFixed(2)} TON`;
}

// 7. DATOS DEL EDIFICIO CENTRAL (MODAL)
window.actualizarModal = function() {
    document.getElementById('data-banco').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-tienda').innerText = stats.negocios.tienda.toFixed(8);
    document.getElementById('data-casino').innerText = stats.negocios.casino.toFixed(8);
    document.getElementById('data-piscina').innerText = stats.negocios.piscina.toFixed(8);
    
    // Suma total de todos los negocios
    const totalNegocios = Object.values(stats.negocios).reduce((a, b) => a + b, 0);
    document.getElementById('data-total').innerText = totalNegocios.toFixed(8);
    
    // Mostramos tu 10% de comisión por amigos
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8);
};

// 8. PARQUE (BONO GRATIS)
window.recolectarParque = function() {
    const bono = 0.00002;
    stats.balance += bono;
    actualizarPantalla();
    tg.HapticFeedback.notificationOccurred('success');
    alert("🌳 Has recolectado un bono del Parque.");
};

// INICIO AL CARGAR
window.onload = () => {
    cargarPerfil();
    iniciarMotor();
};
                            
