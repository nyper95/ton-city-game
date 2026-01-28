// Credenciales Supabase (Ya integradas)
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;

// Objeto de estado del usuario
let stats = {
    balance: 0.00000000,
    tasa: 0.00000000,
    invBanco: 0.00,
    negocios: { banco: 0.0, tienda: 0.0, casino: 0.0, piscina: 0.0 },
    comisionReferidos: 0.00
};

// SIMULACIÓN DE STAKING AUTOMÁTICO
function invertirEnBanco() {
    const monto = prompt("¿Cuánto TON vas a poner en Staking?");
    if (monto && !isNaN(monto)) {
        const cantidad = parseFloat(monto);
        
        // Aquí es donde el usuario enviaría el dinero al contrato
        // Por ahora, lo registramos en el sistema para que empiece a generar
        
        stats.invBanco += cantidad;
        
        // CÁLCULO DE GANANCIA AUTOMÁTICA (Staking)
        // Ejemplo: 15% de beneficio anual. El 80% es para el usuario.
        const gananciaAnualTotal = cantidad * 0.15;
        const gananciaUsuarioSeg = (gananciaAnualTotal * 0.80) / 31536000;
        
        // La tasa se actualiza y los números empiezan a correr solos
        stats.tasa += gananciaUsuarioSeg;
        
        actualizarPantalla();
        alert("✅ Staking iniciado. Tus ganancias se generan automáticamente cada segundo.");
    }
}

function iniciarContador() {
    setInterval(() => {
        if (stats.tasa > 0) {
            stats.balance += stats.tasa;
            // Lo que genera el banco específicamente
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

window.onload = () => {
    iniciarContador();
    // Configurar nombre de usuario
    const user = tg.initDataUnsafe.user;
    document.getElementById('user-display').innerText = user ? `@${user.username}` : "@Usuario_Cuba";
};
