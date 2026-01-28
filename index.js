// CREDENCIALES DE SUPABASE
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let stats = {
    balance: 0.00000000,
    tasa: 0.00000005,
    comisionReferidos: 0.00000000,
    negocios: {
        banco: 0.00000000,
        tienda: 0.00000000,
        casino: 0.00000000,
        piscina: 0.00000000
    }
};

// Iniciar el contador de ganancias
function iniciarProduccion() {
    setInterval(() => {
        // Aumenta el capital disponible
        stats.balance += stats.tasa;
        
        // Los negocios generan acumulado para el Edificio Central
        stats.negocios.banco += 0.00000001;
        stats.negocios.tienda += 0.000000005;
        stats.negocios.casino += 0.00000002;
        stats.negocios.piscina += 0.00000001;
        
        actualizarPantalla();
    }, 1000);
}

function actualizarPantalla() {
    const balanceEl = document.getElementById('balance');
    if(balanceEl) balanceEl.innerText = stats.balance.toFixed(8);
}

// Esta función llena los datos del Edificio Central cuando lo tocas
window.actualizarModal = function() {
    document.getElementById('data-banco').innerText = stats.negocios.banco.toFixed(8);
    document.getElementById('data-tienda').innerText = stats.negocios.tienda.toFixed(8);
    document.getElementById('data-casino').innerText = stats.negocios.casino.toFixed(8);
    document.getElementById('data-piscina').innerText = stats.negocios.piscina.toFixed(8);
    
    const totalNegocios = stats.negocios.banco + stats.negocios.tienda + stats.negocios.casino + stats.negocios.piscina;
    document.getElementById('data-total').innerText = totalNegocios.toFixed(8);
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8);
}

function recolectarParque() {
    stats.balance += 0.0001;
    actualizarPantalla();
    alert("¡Has recolectado TON del Parque! 🌳");
}

window.onload = () => {
    iniciarProduccion();
};
