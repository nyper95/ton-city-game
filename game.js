// CONFIGURACIÓN DE CLIENTE (NAVEGADOR)
const supabaseUrl = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const supabaseKey = 'TU_KEY_PUBLICA_AQUÍ'; // Usa la Anon Key de Supabase
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let userData = null;
let productionInterval = null;

// 1. Cargar datos del usuario al abrir
async function initGame() {
    const tg = window.Telegram.WebApp;
    tg.expand();
    
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        document.getElementById('user-display').innerText = "Invitado";
        return;
    }

    document.getElementById('user-display').innerText = user.username || user.first_name;

    // Obtener datos de Supabase
    let { data, error } = await _supabase
        .from('game_data')
        .select('*')
        .eq('telegram_id', user.id)
        .single();

    if (data) {
        userData = data;
        updateUI();
        startProduction(); // <--- AQUÍ ARRANCA LA PRODUCCIÓN
    }
}

// 2. Lógica de producción (Calcula diamantes por hora)
function startProduction() {
    if (productionInterval) clearInterval(productionInterval);

    productionInterval = setInterval(() => {
        // Cálculo basado en niveles de edificios
        const ratePerSecond = (
            (userData.lvl_tienda * 10) + 
            (userData.lvl_casino * 50) + 
            (userData.lvl_piscina * 100)
        ) / 3600;

        userData.diamonds += ratePerSecond;
        document.getElementById('diamonds').innerText = Math.floor(userData.diamonds);
    }, 1000);
}

function updateUI() {
    document.getElementById('diamonds').innerText = Math.floor(userData.diamonds);
    document.getElementById('lvl_casino').innerText = userData.lvl_casino;
    document.getElementById('lvl_piscina').innerText = userData.lvl_piscina;
    // ... actualizar el resto de edificios
}

// Funciones de los botones para que no den error al hacer click
function openCentral() { document.getElementById('centralModal').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
function openBank() { document.getElementById('modalBank').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
function openStore() { document.getElementById('modalStore').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
function closeAll() { 
    const modals = document.querySelectorAll('.modal, .overlay');
    modals.forEach(m => m.style.display = 'none');
}

// Arrancar todo
window.onload = initGame;
