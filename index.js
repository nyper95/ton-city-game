const tg = window.Telegram.WebApp;
const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

let userData = {
    id: null, diamonds: 0, 
    lvl_tienda: 0, lvl_casino: 0, lvl_piscina: 0, lvl_parque: 0, lvl_diversiones: 0,
    prod_amigos: 0 
};

// Producción por nivel (Configurable)
const PROD_VAL = { tienda: 10, casino: 25, piscina: 60, parque: 15, diversiones: 120, banco: 5 };

async function loadData(user) {
    userData.id = user.id.toString();
    let { data } = await _supabase.from('usuarios').select('*').eq('telegram_id', userData.id).single();
    if (data) {
        userData = { ...userData, ...data, diamonds: data.diamonds || 0 };
    } else {
        await _supabase.from('usuarios').insert([{ telegram_id: userData.id, username: user.username }]);
    }
    actualizarUI();
}

function actualizarUI() {
    // Calculamos producción por hora
    const p = {
        tienda: userData.lvl_tienda * PROD_VAL.tienda,
        casino: userData.lvl_casino * PROD_VAL.casino,
        piscina: userData.lvl_piscina * PROD_VAL.piscina,
        diversiones: userData.lvl_diversiones * PROD_VAL.diversiones,
        banco: PROD_VAL.banco // Supongamos base por tener cuenta
    };
    const totalHr = p.tienda + p.casino + p.piscina + p.diversiones + p.banco;

    document.getElementById('user-diamonds').innerText = Math.floor(userData.diamonds).toLocaleString();
    document.getElementById('global-rate').innerText = totalHr;
    
    // Niveles en Mapa
    document.getElementById('lvl-tienda').innerText = userData.lvl_tienda;
    document.getElementById('lvl-casino').innerText = userData.lvl_casino;
    document.getElementById('lvl-piscina').innerText = userData.lvl_piscina;
    document.getElementById('lvl-diversiones').innerText = userData.lvl_diversiones;

    // Guardar temporalmente para el modal
    window.currentProd = { ...p, total: totalHr };
}

function abrirCentral() {
    const cp = window.currentProd;
    document.getElementById('modal-prod-total').innerText = cp.total;
    document.getElementById('stat-banco').innerText = cp.banco;
    document.getElementById('stat-tienda').innerText = cp.tienda;
    document.getElementById('stat-casino').innerText = cp.casino;
    document.getElementById('stat-piscina').innerText = cp.piscina;
    document.getElementById('stat-diversiones').innerText = cp.diversiones;
    document.getElementById('stat-amigos').innerText = (userData.prod_amigos || 0).toFixed(2);
    
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
                            
