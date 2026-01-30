const tg = window.Telegram.WebApp;
const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

// ESTADO INICIAL (Se cargará de Supabase)
let userData = {
    id: null,
    diamonds: 0,
    lvl_tienda: 0,
    lvl_casino: 0,
    lvl_piscina: 0,
    lvl_parque: 0,
    lvl_diversiones: 0,
    ganancia_dueño: 0
};

// Cargar Datos
async function loadData(user) {
    userData.id = user.id.toString();
    let { data, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('telegram_id', userData.id)
        .single();

    if (data) {
        userData = {
            id: data.telegram_id,
            diamonds: data.diamonds || 0,
            lvl_tienda: data.lvl_tienda || 0,
            lvl_casino: data.lvl_casino || 0,
            lvl_piscina: data.lvl_piscina || 0,
            lvl_parque: data.lvl_parque || 0,
            lvl_diversiones: data.lvl_diversiones || 0,
            ganancia_dueño: data.ganancia_dueño || 0
        };
    } else {
        // Nuevo Usuario
        await _supabase.from('usuarios').insert([{ telegram_id: userData.id, username: user.username }]);
    }
    actualizarUI();
}

// Guardar Datos
async function saveData() {
    await _supabase.from('usuarios').update({
        diamonds: userData.diamonds,
        lvl_tienda: userData.lvl_tienda,
        lvl_casino: userData.lvl_casino,
        lvl_piscina: userData.lvl_piscina,
        lvl_parque: userData.lvl_parque,
        lvl_diversiones: userData.lvl_diversiones,
        ganancia_dueño: userData.ganancia_dueño
    }).eq('telegram_id', userData.id);
}

function actualizarUI() {
    document.getElementById('user-diamonds').innerText = userData.diamonds.toLocaleString();
    document.getElementById('lvl-tienda').innerText = userData.lvl_tienda;
    document.getElementById('lvl-casino').innerText = userData.lvl_casino;
    document.getElementById('lvl-piscina').innerText = userData.lvl_piscina;
    document.getElementById('lvl-parque').innerText = userData.lvl_parque;
    document.getElementById('lvl-diversiones').innerText = userData.lvl_diversiones;
    
    // Precio simulado basado en el 80% (Para el ejemplo)
    document.getElementById('diamond-price').innerText = "0.0001"; 
}

function abrirCentral() {
    document.getElementById('stat-lvl-tienda').innerText = userData.lvl_tienda;
    document.getElementById('stat-lvl-casino').innerText = userData.lvl_casino;
    document.getElementById('stat-lvl-piscina').innerText = userData.lvl_piscina;
    document.getElementById('stat-lvl-diversiones').innerText = userData.lvl_diversiones;
    document.getElementById('mi-ganancia').innerText = userData.ganancia_dueño.toFixed(4);
    
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
        document.getElementById('user-display').innerText = `@${user.username || "User"}`;
        loadData(user);
    }
};
