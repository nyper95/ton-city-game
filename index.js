// Configuración de Supabase
const SUPABASE_URL = "https://xkkifqxxglcuyruwkbih.supabase.co";
const SUPABASE_KEY = "sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE";
// Importamos el cliente de Supabase (asegúrate de incluir el script en el HTML)
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales del usuario
let userId = null; 
let userStats = {
    balance: 0.0,
    acumulado: 0.0,
    comision_amigos: 0.0,
    prod_seg: 0.00000037 // Nivel 1 base
};

// 1. Inicializar datos al cargar la App
async function initUser() {
    const tg = window.Telegram.WebApp;
    tg.expand();
    userId = tg.initDataUnsafe.user?.id || "test_user"; // ID de Telegram

    // Intentar obtener datos de la tabla 'users'
    let { data: user, error } = await _supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code === 'PGRST116') {
        // Si el usuario no existe, lo creamos (Nuevo Ciudadano)
        const { data } = await _supabase.from('users').insert([
            { id: userId, balance: 0, acumulado: 0, comision_amigos: 0 }
        ]);
        console.log("Nuevo ciudadano registrado en Ton City");
    } else {
        userStats = user;
    }
    actualizarInterfaz();
}

// 2. Lógica de producción (Cada segundo)
setInterval(async () => {
    if (!userId) return;

    // Calculamos el 80% para el usuario
    userStats.acumulado += userStats.prod_seg * 0.8;
    
    // Actualizamos visualmente
    actualizarInterfaz();
    
    // Guardamos en Supabase cada 30 segundos para no saturar la API
    // (En producción puedes ajustar este tiempo)
    if (Math.floor(Date.now() / 1000) % 30 === 0) {
        saveToSupabase();
    }
}, 1000);

// 3. Función para guardar progreso
async function saveToSupabase() {
    await _supabase
        .from('users')
        .update({ 
            balance: userStats.balance, 
            acumulado: userStats.acumulado,
            comision_amigos: userStats.comision_amigos 
        })
        .eq('id', userId);
}

// 4. Recolección en el Edificio Central
async function recolectarGanancias() {
    userStats.balance += (userStats.acumulado + userStats.comision_amigos);
    userStats.acumulado = 0;
    userStats.comision_amigos = 0;
    
    await saveToSupabase();
    actualizarInterfaz();
    alert("¡TON recolectado y guardado en la nube!");
}

function actualizarInterfaz() {
    document.getElementById('main-balance').innerText = userStats.balance.toFixed(8);
    document.getElementById('accumulated-profit').innerText = userStats.acumulado.toFixed(8);
    document.getElementById('ref-profit').innerText = userStats.comision_amigos.toFixed(8);

    const btnWithdraw = document.getElementById('btn-withdraw');
    if (userStats.balance >= 1.0) {
        btnWithdraw.disabled = false;
        btnWithdraw.classList.add('active');
    }
}

initUser();
        
