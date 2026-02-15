// ======================================================
// TON CITY GAME - ARCHIVO DE LÓGICA INTEGRADA (CLIENTE)
// ======================================================
console.log("✅ Ton City Game - Cargando lógica completa...");

const tg = window.Telegram.WebApp;

// CONFIGURACIÓN DE BILLETERAS Y NEGOCIO
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; // Tu 20%
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";      // 80% Usuarios
const PRECIO_COMPRA = 0.008; // TON por Diamante

// CONFIGURACIÓN TÉCNICA
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io';
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

// Inicializar Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ESTADO GLOBAL
let tonConnectUI = null;
let currentWallet = null;
let userData = {
    id: null,
    username: "Usuario",
    diamonds: 0,
    lvl_tienda: 0, lvl_casino: 0, lvl_piscina: 0, lvl_parque: 0, lvl_diversion: 0,
    referral_code: null
};

let globalPoolData = { pool_ton: 0, total_diamonds: 0 };
const PROD_VAL = { tienda: 10, casino: 25, piscina: 60, parque: 15, diversion: 120 };

// =======================
// INICIALIZACIÓN
// =======================
async function initApp() {
    try {
        tg.expand();
        const user = tg.initDataUnsafe.user;
        
        if (user) {
            userData.id = user.id.toString();
            userData.username = user.username || user.first_name;
            await loadUser(user);
        }

        await initTONConnect();
        await loadRealGlobalPool();
        startProduction(); // Inicia el contador visual
        
    } catch (error) {
        console.error("❌ Error en initApp:", error);
    }
}

// =======================
// TON CONNECT & COMPRAS
// =======================
async function initTONConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button',
        uiPreferences: { theme: 'DARK' }
    });

    tonConnectUI.onStatusChange((wallet) => {
        currentWallet = wallet;
        const walletInfo = document.getElementById('wallet-info');
        if (wallet && walletInfo) walletInfo.classList.remove('hidden');
    });
}

async function comprarTON(tonAmount) {
    if (!currentWallet) return alert("❌ Conecta tu wallet primero");

    const diamantes = Math.floor(tonAmount / PRECIO_COMPRA);
    
    const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            { address: BILLETERA_POOL, amount: Math.floor(tonAmount * 0.8 * 1e9).toString() },
            { address: BILLETERA_PROPIETARIO, amount: Math.floor(tonAmount * 0.2 * 1e9).toString() }
        ]
    };

    try {
        await tonConnectUI.sendTransaction(tx);
        userData.diamonds += diamantes;
        await saveUserData();
        actualizarUI();
        alert(`✅ Compra exitosa. +${diamantes} 💎 añadidos.`);
    } catch (e) {
        alert("❌ Transacción cancelada");
    }
}

// =======================
// LÓGICA DE PRODUCCIÓN
// =======================
function startProduction() {
    setInterval(() => {
        const totalPerHr = 
            (userData.lvl_tienda * PROD_VAL.tienda) +
            (userData.lvl_casino * PROD_VAL.casino) +
            (userData.lvl_piscina * PROD_VAL.piscina) +
            (userData.lvl_parque * PROD_VAL.parque) +
            (userData.lvl_diversion * PROD_VAL.diversion);

        const gananciaSeg = totalPerHr / 3600;
        userData.diamonds += gananciaSeg;
        
        actualizarUI();
        if (document.getElementById("centralModal")?.style.display === "block") {
            updateCentralStats();
        }
    }, 1000);
}

// =======================
// EDIFICIO CENTRAL & TIENDA
// =======================
function openCentral() {
    updateCentralStats();
    showModal("centralModal");
}

function updateCentralStats() {
    const p = {
        t: userData.lvl_tienda * PROD_VAL.tienda,
        c: userData.lvl_casino * PROD_VAL.casino,
        pi: userData.lvl_piscina * PROD_VAL.piscina,
        pa: userData.lvl_parque * PROD_VAL.parque,
        d: userData.lvl_diversion * PROD_VAL.diversion
    };
    const total = p.t + p.c + p.pi + p.pa + p.d;

    if(document.getElementById("s_tienda")) document.getElementById("s_tienda").textContent = p.t;
    if(document.getElementById("s_casino")) document.getElementById("s_casino").textContent = p.c;
    if(document.getElementById("s_piscina")) document.getElementById("s_piscina").textContent = p.pi;
    if(document.getElementById("s_parque")) document.getElementById("s_parque").textContent = p.pa;
    if(document.getElementById("s_diversion")) document.getElementById("s_diversion").textContent = p.d;
    if(document.getElementById("s_total")) document.getElementById("s_total").textContent = total;
    if(document.getElementById("s_referrals")) document.getElementById("s_referrals").textContent = (total * 0.1).toFixed(1);
}

async function buyUpgrade(name, price) {
    if (userData.diamonds < price) return alert("❌ Diamantes insuficientes");

    const map = { "Tienda": "lvl_tienda", "Casino": "lvl_casino", "Piscina": "lvl_piscina", "Parque": "lvl_parque", "Diversión": "lvl_diversion" };
    const field = map[name];
    
    userData[field]++;
    userData.diamonds -= price;
    
    await saveUserData();
    actualizarUI();
    alert(`✅ ${name} mejorada al nivel ${userData[field]}`);
}

// =======================
// POOL Y RETIROS
// =======================
async function loadRealGlobalPool() {
    try {
        const res = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        const data = await res.json();
        globalPoolData.pool_ton = (data.balance || 0) / 1e9;
        
        const { data: users } = await _supabase.from("game_data").select("diamonds");
        globalPoolData.total_diamonds = users.reduce((sum, u) => sum + (Number(u.diamonds) || 0), 0);
    } catch (e) { console.error("Error Pool:", e); }
}

function getValorDiamanteEnTON() {
    const valor = globalPoolData.pool_ton / (globalPoolData.total_diamonds || 1);
    return Math.max(valor, 0.0001);
}

// =======================
// PERSISTENCIA (SUPABASE)
// =======================
async function loadUser(tgUser) {
    let { data } = await _supabase.from('game_data').select('*').eq('telegram_id', tgUser.id.toString()).single();
    if (data) {
        userData = { ...userData, ...data, id: tgUser.id.toString() };
        actualizarUI();
    }
}

async function saveUserData() {
    if (!userData.id) return;
    await _supabase.from('game_data').update({
        diamonds: Math.floor(userData.diamonds),
        lvl_tienda: userData.lvl_tienda,
        lvl_casino: userData.lvl_casino,
        lvl_piscina: userData.lvl_piscina,
        lvl_parque: userData.lvl_parque,
        lvl_diversion: userData.lvl_diversion,
        last_online: new Date().toISOString()
    }).eq('telegram_id', userData.id);
}

// =======================
// UI & MODALES
// =======================
function actualizarUI() {
    const d = document.getElementById("diamonds");
    if (d) d.textContent = Math.floor(userData.diamonds).toLocaleString();
    
    const r = document.getElementById("rate");
    if (r) {
        const total = (userData.lvl_tienda * PROD_VAL.tienda) + (userData.lvl_casino * PROD_VAL.casino) + 
                      (userData.lvl_piscina * PROD_VAL.piscina) + (userData.lvl_parque * PROD_VAL.parque) + 
                      (userData.lvl_diversion * PROD_VAL.diversion);
        r.textContent = total;
    }
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).style.display = "none";
    });
}

// Vincular al objeto window para que el HTML los vea
window.onload = initApp;
window.openCentral = openCentral;
window.openStore = () => showModal("modalStore");
window.openBank = () => showModal("modalBank");
window.openFriends = () => showModal("modalFriends");
window.openWithdraw = () => showModal("modalWithdraw");
window.closeAll = closeAll;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
