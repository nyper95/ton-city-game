// CREDENCIALES DE SUPABASE
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Obtener datos de Telegram
const tg = window.Telegram.WebApp;
tg.expand(); // Abre el bot en pantalla completa

let stats = {
    balance: 0.00000000,
    tasa: 0.00000000, // Empieza en 0 ahora
    comisionReferidos: 0.00000000,
    negocios: {
        banco: 0.00000000,
        tienda: 0.00000000,
        casino: 0.00000000,
        piscina: 0.00000000
    }
};

// Función para poner el nombre real del usuario
function configurarUsuario() {
    const userDisplay = document.getElementById('user-display');
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userDisplay.innerText = `@${tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name}`;
    } else {
        userDisplay.innerText = "@Invitado";
    }
}

// Iniciar el contador de ganancias SOLO si hay producción
function iniciarProduccion() {
    setInterval(() => {
        if (stats.tasa > 0) {
            stats.balance += stats.tasa;
            
            // Los negocios solo generan si el usuario ha comprado algo (Lógica futura)
            // Por ahora, solo sumamos al balance principal si la tasa es mayor a 0
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
    document.getElementById('data-tienda').innerText = stats.negocios.tienda.toFixed(8);
    document.getElementById('data-casino').innerText = stats.negocios.casino.toFixed(8);
    document.getElementById('data-piscina').innerText = stats.negocios.piscina.toFixed(8);
    
    const totalNegocios = stats.negocios.banco + stats.negocios.tienda + stats.negocios.casino + stats.negocios.piscina;
    document.getElementById('data-total').innerText = totalNegocios.toFixed(8);
    document.getElementById('data-amigos').innerText = stats.comisionReferidos.toFixed(8);
}

// Ejemplo: Al recolectar el parque, activamos una pequeña producción por 10 segundos
function recolectarParque() {
    stats.balance += 0.0001;
    // Activamos producción real por un momento como prueba
    stats.tasa = 0.00000010; 
    actualizarPantalla();
    
    tg.MainButton.setText("¡RECOLECTADO!").show();
    setTimeout(() => tg.MainButton.hide(), 2000);
}

window.onload = () => {
    configurarUsuario();
    iniciarProduccion();
};
