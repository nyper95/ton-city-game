// Configuración de Supabase (Asegúrate de poner tus credenciales reales)
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estructura de datos inicializada en 0
let cityData = {
    user: {
        username: "",
        balance_total: 0.0000,
        energy: 1000
    },
    negocios: {
        banco: { produccion: 0.00, nivel: 0 },
        tienda: { produccion: 0.00, nivel: 0 },
        casino: { produccion: 0.00, nivel: 0 },
        piscinas: { produccion: 0.00, nivel: 0 },
        parque: { produccion: 0.00, nivel: 0 }, // Opción gratuita
        parque_diversiones: { produccion: 0.00, nivel: 0 } // Opción gratuita
    }
};

// Función para cargar datos desde Supabase
async function cargarCiudad() {
    const { data, error } = await supabase
        .from('ton_city_users')
        .select('*')
        .eq('username', cityData.user.username)
        .single();

    if (data) {
        // Mapear datos de la nube al objeto local
        actualizarInterfaz();
    }
}

// Lógica del Edificio Central: Mostrar detalles de cada negocio
function abrirDetallesEdificioCentral() {
    console.log("Mostrando balance de todos los negocios...");
    // Aquí podrías abrir un modal que diga:
    // Banco: +0.002 TON/h
    // Casino: +0.005 TON/h
    // etc.
}

// Actualizar la UI
function actualizarInterfaz() {
    document.getElementById('balance').innerText = cityData.user.balance_total.toFixed(4);
    document.getElementById('energy-val').innerText = `${cityData.user.energy} / 1000`;
    
    const energyPercent = (cityData.user.energy / 1000) * 100;
    document.getElementById('energy-fill').style.width = `${energyPercent}%`;
}

// Event Listeners
document.querySelector('.card-central').addEventListener('click', abrirDetallesEdificioCentral);

// Inicialización
window.onload = () => {
    // El nombre se carga desde el script de Telegram en el HTML
    const tgName = document.getElementById('user-display').innerText.replace('@', '');
    cityData.user.username = tgName;
    
    actualizarInterfaz();
    // cargarCiudad(); // Descomentar cuando la tabla esté lista en Supabase
};
    // Configuración de beneficios
const REPARTO = {
    USUARIO: 0.80,
    DUENO: 0.20
};

// Ampliando la lógica del Edificio Central
function abrirDetallesEdificioCentral() {
    const modalContent = document.getElementById('detalles-negocios');
    let htmlBusinesList = "";
    let produccionTotalHora = 0;

    for (const [nombre, info] of Object.entries(cityData.negocios)) {
        // Cálculo de la producción neta para el usuario (80%)
        const produccionUsuario = info.produccion * REPARTO.USUARIO;
        produccionTotalHora += produccionUsuario;

        htmlBusinesList += `
            <div class="business-item">
                <span class="name">${nombre.toUpperCase()}</span>
                <span class="level">Nivel: ${info.nivel}</span>
                <span class="profit">Ganancia: +${produccionUsuario.toFixed(4)} TON/h</span>
            </div>
        `;
    }

    // Inyectar en el DOM (Asegúrate de tener este contenedor en tu HTML)
    document.getElementById('lista-negocios-central').innerHTML = htmlBusinesList;
    document.getElementById('total-produccion').innerText = `Total: ${produccionTotalHora.toFixed(4)} TON/h`;
}

