// ======================================================
// TON CITY - VERSIÓN COMPLETA CON PERFIL, AMIGOS Y RANKING
// ======================================================

console.log('🚀 TON CITY - Iniciando...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const BackButton = tg.BackButton;
BackButton.hide();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const RED_TON_FEE = 0.002;
const RESERVA_POOL = 0.95;
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQBuoEgT5DmcoEQ_nl6YwR0Q86fZWY4baACuX80EegWG49h2";
const PRECIO_COMPRA = 0.008;
const ADSGRAM_BLOCK_ID = '23186';

const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io';
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// ESTADO DEL JUEGO
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let adsReady = false;
let AdController = null;
let pendingMultiplier = null;
let bancoTabActual = 'compra';
let ventaCantidad = 100;
window._tasaVentaActual = 10000;

let userData = {
    id: null,
    username: "Cargando...",
    diamonds: 0,
    lvl_piscina: 0,
    lvl_fabrica: 0,
    lvl_escuela: 0,
    lvl_hospital: 0,
    referral_code: null,
    referral_earnings: 0,
    referred_users: [],
    last_online: null,
    last_production_update: null,
    last_withdraw_week: null,
    last_ad_watch: null,
    last_casino_rescue: null,
    daily_streak: 0,
    last_daily_claim: null,
    haInvertido: false,
    premium_expires: null,
    weekly_rank: null,
    rank: "Ciudadano",
    projectedReward: 0,
    event_progress: {},
    accumulated_ton: 0,
    retiradoHoy: 0,
    gameStats: {
        escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
        fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
        piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
        hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
    },
    jugadasHoy: {
        highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0,
        fecha: new Date().toDateString()
    }
};

let globalPoolData = { pool_ton: 100, total_diamonds: 0, user_rankings: [] };

// ==========================================
// CONSTANTES DE JUEGOS
// ==========================================
const EVENTOS_SEMANALES = [
    { nombre: "Escuela", edificio: "escuela", icono: "fa-school", color: "#fbbf24", descripcion: "Semana del Saber", recompensa: 200, premium: 400, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Fábrica", edificio: "fabrica", icono: "fa-industry", color: "#a78bfa", descripcion: "Semana de Producción", recompensa: 150, premium: 300, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Piscina", edificio: "piscina", icono: "fa-water-ladder", color: "#38bdf8", descripcion: "Semana Olímpica", recompensa: 80, premium: 160, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Hospital", edificio: "hospital", icono: "fa-hospital", color: "#f87171", descripcion: "Semana de la Salud", recompensa: 100, premium: 200, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 }
];

const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

let apuestaActual = { highlow: 10, ruleta: 10, tragaperras: 5, dados: 10, loteria: 1 };
let boletosComprados = [];

let gameLives = { escuela: 3, fabrica: 3, piscina: 3, hospital: 3 };
let gameActiveStates = { escuela: true, fabrica: true, piscina: true, hospital: true };

let escuelaSequence = [];
let escuelaUserInput = [];
let escuelaLevel = 1;
let escuelaBest = 0;

let fabricaLevel = 1;
let fabricaBest = 0;
let fabricaCompleted = 0;
let fabricaRequired = 5;
let fabricaPosition = -50;
let fabricaIsDefect = false;
let fabricaAnimInterval = null;
let fabricaDefectInterval = null;

let piscinaLevel = 1;
let piscinaBest = 0;
let piscinaPerfect = 0;
let piscinaRequired = 3;
let piscinaPower = 0;
let piscinaIsDragging = false;
let piscinaStartX = 0, piscinaStartY = 0;

let hospitalLevel = 1;
let hospitalBest = 0;
let hospitalExtracted = 0;
let hospitalTotal = 3;
let hospitalTimeLeft = 30;
let hospitalTimer = null;

// ==========================================
// FUNCIONES BÁSICAS
// ==========================================
function esPremium() {
    if (!userData.premium_expires) return false;
    return new Date() < new Date(userData.premium_expires);
}

function actualizarPremiumUI() {
    const badge = document.getElementById('premium-badge');
    if (badge) badge.style.display = esPremium() ? 'flex' : 'none';
}

function getEventoActual() {
    const semana = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % EVENTOS_SEMANALES.length;
    return EVENTOS_SEMANALES[semana];
}

function actualizarEventosUI() {
    const evento = getEventoActual();
    document.querySelectorAll('.building-card').forEach(card => card.classList.remove('event-active'));
    const banner = document.getElementById('event-banner');
    if (banner) {
        banner.style.display = 'flex';
        document.getElementById('event-banner-title').textContent = evento.nombre;
        document.getElementById('event-banner-subtitle').textContent = `¡Recompensas x${evento.gameMultiplier}!`;
    }
}

function enVentanaRetiro() {
    return new Date().getDay() === 0;
}

function getNumeroSemana() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), 0, 1);
    const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil(dias / 7);
}

function getTotalProduction() {
    let base = (userData.lvl_escuela * 40) + (userData.lvl_fabrica * 120) + 
               (userData.lvl_piscina * 60) + (userData.lvl_hospital * 80);
    return esPremium() ? base * 2 : base;
}

function calcularRecompensa(baseReward, building) {
    const nivelEdificio = userData[`lvl_${building}`] || 0;
    const multiplierNivel = 1 + (nivelEdificio * 0.01);
    const premiumMultiplier = esPremium() ? 2 : 1;
    const evento = getEventoActual();
    const eventMultiplier = (evento.edificio === building) ? (esPremium() ? 4 : 2) : 1;
    let multiplier = multiplierNivel * premiumMultiplier * eventMultiplier;
    if (pendingMultiplier) {
        multiplier *= pendingMultiplier;
        pendingMultiplier = null;
    }
    return Math.floor(baseReward * multiplier);
}

// ==========================================
// NAVEGACIÓN Y MODALES
// ==========================================
function showModal(id) {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById(id).style.display = 'block';
    BackButton.show();
    BackButton.onClick(() => { closeAll(); BackButton.hide(); });
}

function closeAll() {
    document.getElementById('overlay').style.display = 'none';
    const modals = [
        'modalPerfil', 'modalFriends', 'modalRanking', 'modalBank', 'modalStore',
        'modalCasino', 'modalHighLow', 'modalRuleta', 'modalTragaperras', 'modalDados',
        'modalLoteria', 'modalEscuela', 'modalFabrica', 'modalPiscina', 'modalHospital',
        'modalEvent', 'modalDailyReward', 'modalAds', 'modalWithdraw'
    ];
    modals.forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });
    BackButton.hide();
    BackButton.offClick();
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    if (fabricaDefectInterval) clearInterval(fabricaDefectInterval);
    if (hospitalTimer) clearInterval(hospitalTimer);
    setActiveNav('perfil');
}

function setActiveNav(tab) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => item.classList.remove('active'));
    if (tab === 'perfil' && items[0]) items[0].classList.add('active');
    if (tab === 'amigos' && items[1]) items[1].classList.add('active');
    if (tab === 'ranking' && items[2]) items[2].classList.add('active');
}

// ==========================================
// PERFIL
// ==========================================
function openPerfil() {
    closeAll();
    actualizarPerfil();
    document.getElementById('modalPerfil').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    setActiveNav('perfil');
}

function actualizarPerfil() {
    const user = tg.initDataUnsafe?.user;
    const name = user?.first_name || userData.username || 'Usuario';
    document.getElementById('perfil-name').textContent = name;
    document.getElementById('perfil-avatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('perfil-diamonds').textContent = Math.floor(userData.diamonds || 0);
    document.getElementById('perfil-rate').textContent = Math.floor(getTotalProduction());
    document.getElementById('perfil-piscina').textContent = 'Nivel ' + (userData.lvl_piscina || 0);
    document.getElementById('perfil-fabrica').textContent = 'Nivel ' + (userData.lvl_fabrica || 0);
    document.getElementById('perfil-escuela').textContent = 'Nivel ' + (userData.lvl_escuela || 0);
    document.getElementById('perfil-hospital').textContent = 'Nivel ' + (userData.lvl_hospital || 0);
    document.getElementById('perfil-amigos').textContent = (userData.referred_users?.length || 0);
    document.getElementById('perfil-rango-display').textContent = userData.rank || 'Ciudadano';
    document.getElementById('perfil-proyeccion').textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
    document.getElementById('perfil-premium').textContent = esPremium() ? 'Sí ⭐' : 'No';
    document.getElementById('perfil-rank').textContent = userData.rank || 'Ciudadano';
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    closeAll();
    document.getElementById('modalFriends').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('referral-code').textContent = userData.referral_code || 'CARGANDO...';
    document.getElementById('ref-count').textContent = userData.referred_users?.length || 0;
    document.getElementById('ref-total').textContent = (userData.referral_earnings || 0) + ' 💎';
    document.getElementById('ref-weekly').textContent = Math.floor((userData.referral_earnings || 0) * 0.1) + ' 💎';
    setActiveNav('amigos');
}

function copyReferralCode() {
    if (!userData.referral_code) return alert('❌ Código no disponible');
    navigator.clipboard.writeText(`https://t.me/ton_city_bot?start=${userData.referral_code}`).then(() => alert('✅ Enlace copiado!'));
}

// ==========================================
// RANKING
// ==========================================
function openRanking() {
    closeAll();
    actualizarRankingModal();
    document.getElementById('modalRanking').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    setActiveNav('ranking');
}

function actualizarRankingModal() {
    document.getElementById('user-rank-display').textContent = userData.rank || 'Ciudadano';
    document.getElementById('pool-total-ranking').textContent = (globalPoolData.pool_ton || 0).toFixed(4) + ' TON';
    document.getElementById('projected-reward-display').textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
    document.getElementById('ranking-diamonds').textContent = Math.floor(userData.diamonds || 0);
}

// ==========================================
// BANCO
// ==========================================
function openBank() {
    closeAll();
    document.getElementById('modalBank').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    switchBancoTab('compra');
    actualizarListaCompra();
}

function actualizarListaCompra() {
    const isConnected = tonConnectUI?.connected;
    const packs = [
        { ton: 0.10, diamonds: 100 }, { ton: 0.50, diamonds: 500 }, { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 }, { ton: 5.00, diamonds: 5000 }, { ton: 10.00, diamonds: 10000 }
    ];
    const bankList = document.getElementById('bankList');
    if (!bankList) return;
    bankList.innerHTML = packs.map(p => `
        <div style="background:#0f172a; border-radius:12px; padding:16px; margin:8px 0; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${p.ton.toFixed(2)} TON</strong><div style="font-size:12px; color:#94a3b8;">+${p.diamonds} 💎</div></div>
            <button onclick="comprarTON(${p.ton})" style="background:${isConnected ? '#4ade80' : '#334155'}; border:none; padding:10px 20px; border-radius:30px; color:white; font-weight:700;" ${!isConnected ? 'disabled' : ''}>${isConnected ? 'COMPRAR' : 'CONECTAR'}</button>
        </div>
    `).join('');
}

function switchBancoTab(tab) {
    bancoTabActual = tab;
    const tabs = document.querySelectorAll('.banco-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'compra') {
        tabs[0].classList.add('active');
        document.getElementById('banco-compra-panel').classList.remove('hidden');
        document.getElementById('banco-venta-panel').classList.add('hidden');
        actualizarListaCompra();
    } else {
        tabs[1].classList.add('active');
        document.getElementById('banco-compra-panel').classList.add('hidden');
        document.getElementById('banco-venta-panel').classList.remove('hidden');
        actualizarPanelVenta();
    }
}

function actualizarPanelVenta() {
    document.getElementById('venta-diamonds').textContent = Math.floor(userData.diamonds || 0);
    const poolTotal = globalPoolData.pool_ton || 0;
    document.getElementById('venta-pool').textContent = poolTotal.toFixed(4) + ' TON';
    
    const tasaBase = 10000;
    const poolFactor = Math.max(0.5, Math.min(2, poolTotal / 10));
    const tasaActual = Math.floor(tasaBase / poolFactor);
    document.getElementById('venta-tasa').textContent = tasaActual + ' 💎 = 1 TON';
    window._tasaVentaActual = tasaActual;
    
    const tonRecibir = ventaCantidad / tasaActual;
    document.getElementById('venta-ton-recibir').textContent = tonRecibir.toFixed(4) + ' TON';
    
    const retiradoHoy = userData.retiradoHoy || 0;
    document.getElementById('venta-retirado-hoy').textContent = retiradoHoy.toFixed(4) + ' TON';
    document.getElementById('venta-cantidad').textContent = ventaCantidad;
    
    const btnVender = document.getElementById('vender-btn');
    const errorEl = document.getElementById('venta-error');
    const walletConnected = tonConnectUI?.connected || false;
    
    if (!walletConnected) {
        btnVender.disabled = true;
        errorEl.style.display = 'block';
        errorEl.textContent = '⚠️ Conecta tu wallet primero (pestaña COMPRAR)';
    } else if (ventaCantidad > (userData.diamonds || 0)) {
        btnVender.disabled = true;
        errorEl.style.display = 'block';
        errorEl.textContent = '⚠️ No tienes suficientes diamantes';
    } else if (tonRecibir < 1) {
        btnVender.disabled = true;
        errorEl.style.display = 'block';
        errorEl.textContent = '⚠️ El mínimo de retiro es 1 TON';
    } else if ((retiradoHoy + tonRecibir) > 5) {
        btnVender.disabled = true;
        errorEl.style.display = 'block';
        errorEl.textContent = '⚠️ Límite diario de 5 TON alcanzado';
    } else if (tonRecibir > poolTotal) {
        btnVender.disabled = true;
        errorEl.style.display = 'block';
        errorEl.textContent = '⚠️ No hay suficientes TON en el pool';
    } else {
        btnVender.disabled = false;
        errorEl.style.display = 'none';
    }
}

function cambiarVentaDiamonds(delta) {
    ventaCantidad = Math.max(100, Math.min(userData.diamonds || 0, ventaCantidad + delta));
    actualizarPanelVenta();
}

function setVentaCantidad(cantidad) {
    ventaCantidad = Math.min(userData.diamonds || 0, cantidad);
    actualizarPanelVenta();
}

function setVentaCantidadMax() {
    ventaCantidad = userData.diamonds || 0;
    actualizarPanelVenta();
}

async function venderDiamantes() {
    const tasa = window._tasaVentaActual || 10000;
    const tonRecibir = ventaCantidad / tasa;
    
    if (!tonConnectUI?.connected) return alert('Conecta tu wallet primero');
    if (tonRecibir < 1) return alert('El mínimo de retiro es 1 TON');
    if ((userData.retiradoHoy || 0) + tonRecibir > 5) return alert('Límite diario de 5 TON alcanzado');
    if (tonRecibir > (globalPoolData.pool_ton || 0)) return alert('No hay suficientes TON en el pool');
    
    if (!confirm(`¿Cambiar ${ventaCantidad} 💎 por ${tonRecibir.toFixed(4)} TON?`)) return;
    
    try {
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: currentWallet.account.address,
                amount: Math.floor((tonRecibir - RED_TON_FEE) * 1e9).toString(),
                payload: "Venta Ton City"
            }]
        };
        await tonConnectUI.sendTransaction(tx);
        userData.diamonds -= ventaCantidad;
        userData.retiradoHoy = (userData.retiradoHoy || 0) + tonRecibir;
        globalPoolData.pool_ton -= tonRecibir;
        await saveUserData();
        ventaCantidad = 100;
        actualizarPanelVenta();
        actualizarUI();
        alert(`✅ Cambiaste ${ventaCantidad} 💎 por ${tonRecibir.toFixed(4)} TON`);
    } catch(e) {
        console.error(e);
        alert('❌ Error en la transacción');
    }
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI?.connected) return alert('❌ Conecta wallet primero');
    try {
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: BILLETERA_PROPIETARIO,
                amount: Math.floor(tonAmount * 1e9).toString(),
                payload: "Compra TON City"
            }]
        };
        await tonConnectUI.sendTransaction(tx);
        let comprados = Math.floor(tonAmount / PRECIO_COMPRA);
        if (comprados < 100) comprados = 100;
        userData.diamonds += comprados;
        if (!userData.haInvertido && comprados >= 100) userData.haInvertido = true;
        await saveUserData();
        actualizarUI();
        alert(`✅ +${comprados} 💎`);
        closeAll();
    } catch(e) {
        console.error(e);
        alert('❌ Transacción cancelada');
    }
}

// ==========================================
// TON CONNECT
// ==========================================
async function initTONConnect() {
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        tonConnectUI.onStatusChange((wallet) => {
            currentWallet = wallet;
            if (wallet) {
                const btnDiv = document.getElementById('ton-connect-button');
                const walletInfo = document.getElementById('wallet-info');
                if (btnDiv) btnDiv.style.display = 'none';
                if (walletInfo) walletInfo.classList.remove('hidden');
            } else {
                const btnDiv = document.getElementById('ton-connect-button');
                const walletInfo = document.getElementById('wallet-info');
                if (btnDiv) btnDiv.style.display = 'block';
                if (walletInfo) walletInfo.classList.add('hidden');
            }
            if (document.getElementById('modalBank')?.style.display === 'block') {
                if (bancoTabActual === 'compra') actualizarListaCompra();
                else actualizarPanelVenta();
            }
        });
    } catch(e) {
        console.error('TON Connect error:', e);
    }
}

async function disconnectWallet() {
    if (tonConnectUI) await tonConnectUI.disconnect();
    currentWallet = null;
    const btnDiv = document.getElementById('ton-connect-button');
    const walletInfo = document.getElementById('wallet-info');
    if (btnDiv) btnDiv.style.display = 'block';
    if (walletInfo) walletInfo.classList.add('hidden');
    actualizarListaCompra();
}

// ==========================================
// TIENDA PREMIUM
// ==========================================
function openStore() {
    closeAll();
    document.getElementById('modalStore').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    const isConnected = tonConnectUI?.connected;
    document.getElementById('premium-plans').innerHTML = PREMIUM_PLANS.map(p => `
        <div style="background:#0f172a; border-radius:16px; padding:16px; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>${p.name}</strong>
                <span style="color:#facc15;">${p.price} TON</span>
            </div>
            <button onclick="comprarPremium('${p.name}', ${p.days})" style="background:${isConnected ? '#8b5cf6' : '#334155'}; border:none; border-radius:30px; padding:12px; width:100%; color:white; font-weight:700;" ${!isConnected ? 'disabled' : ''}>${isConnected ? 'COMPRAR' : 'CONECTAR'}</button>
        </div>
    `).join('');
}

async function comprarPremium(name, days) {
    if (!tonConnectUI?.connected) return alert('❌ Conecta wallet');
    const plan = PREMIUM_PLANS.find(p => p.days === days);
    if (!plan) return;
    try {
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: BILLETERA_PROPIETARIO,
                amount: Math.floor(plan.price * 1e9).toString(),
                payload: "Premium Ton City"
            }]
        };
        await tonConnectUI.sendTransaction(tx);
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        userData.premium_expires = exp.toISOString();
        await saveUserData();
        actualizarPremiumUI();
        actualizarUI();
        alert(`✅ Plan ${name} activado!`);
        closeAll();
    } catch(e) {
        console.error(e);
        alert('❌ Transacción cancelada');
    }
}

// ==========================================
// ACTUALIZAR UI
// ==========================================
function actualizarUI() {
    const diamElem = document.getElementById('diamonds');
    if (diamElem) diamElem.textContent = Math.floor(userData.diamonds || 0);
    const rateElem = document.getElementById('rate');
    if (rateElem) rateElem.textContent = Math.floor(getTotalProduction());
    
    const lvls = {
        lvl_piscina: userData.lvl_piscina,
        lvl_fabrica: userData.lvl_fabrica,
        lvl_escuela: userData.lvl_escuela,
        lvl_hospital: userData.lvl_hospital
    };
    Object.keys(lvls).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = lvls[id];
    });
    
    document.getElementById('user-display').textContent = userData.username || 'Usuario';
}

// ==========================================
// ADSGRAM
// ==========================================
async function initAds() {
    try {
        AdController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        adsReady = true;
        console.log('✅ AdsGram listo');
    } catch(e) {
        console.error('AdsGram error:', e);
    }
}

function showRewardedAd(callback) {
    if (esPremium()) { callback(true); return; }
    if (!adsReady || !AdController) { alert("📺 Anuncios no disponibles"); callback(false); return; }
    AdController.show()
        .then((result) => { callback(result.done === true); })
        .catch(() => { callback(false); });
}

// ==========================================
// ANUNCIOS (PARQUE)
// ==========================================
function showAdsModal() {
    closeAll();
    document.getElementById('modalAds').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    actualizarEstadoAnuncio();
}

function actualizarEstadoAnuncio() {
    const puede = (!userData.last_ad_watch || (new Date() - new Date(userData.last_ad_watch)) > 3600000);
    const btn = document.getElementById('watch-ad-btn');
    const statusDiv = document.getElementById('ads-status');
    if (!btn) return;
    if (esPremium()) {
        btn.disabled = true;
        btn.textContent = '⭐ PREMIUM - SIN ANUNCIOS';
        if (statusDiv) statusDiv.innerHTML = '⭐ Premium: sin anuncios';
        return;
    }
    if (puede && adsReady) {
        btn.disabled = false;
        btn.textContent = 'VER ANUNCIO +30 💎';
        if (statusDiv) statusDiv.innerHTML = '✅ Anuncio disponible';
    } else {
        btn.disabled = true;
        const restante = userData.last_ad_watch ? Math.ceil((3600000 - (new Date() - new Date(userData.last_ad_watch))) / 60000) : 60;
        btn.textContent = `⏳ ${restante} min`;
        if (statusDiv) statusDiv.innerHTML = `⏳ Próximo en ${restante} min`;
    }
}

function showAd() {
    if (esPremium()) {
        userData.diamonds += 30;
        saveUserData();
        actualizarUI();
        alert('⭐ Premium: +30 💎');
        closeAll();
        return;
    }
    showRewardedAd((success) => {
        if (success) {
            userData.diamonds += 30;
            userData.last_ad_watch = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 +30 💎');
            closeAll();
        }
    });
}

function rescueWithAd() {
    if (esPremium()) {
        userData.diamonds += 100;
        actualizarUI();
        return;
    }
    if (userData.diamonds > 0) return alert("Solo cuando tienes 0 diamantes");
    const hoy = new Date();
    if (userData.last_casino_rescue && hoy.toDateString() === new Date(userData.last_casino_rescue).toDateString()) {
        return alert("Ya usaste rescate hoy");
    }
    showRewardedAd((success) => {
        if (success) {
            userData.diamonds += 100;
            userData.last_casino_rescue = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 +100 💎');
        }
    });
}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= 30) return esPremium() ? 600 : 300;
    let base = 10 + (day - 1) * 10;
    if (base > 300) base = 300;
    return esPremium() ? base * 2 : base;
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    const ultimo = new Date(userData.last_daily_claim);
    const hoy = new Date();
    ultimo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    return hoy > ultimo;
}

function openDailyReward() {
    closeAll();
    const racha = userData.daily_streak || 0;
    const diaActual = Math.min(racha + 1, 30);
    document.getElementById('current-day').textContent = diaActual;
    document.getElementById('today-reward').textContent = getDailyRewardAmount(diaActual) + ' 💎';
    
    const puede = puedeReclamarDiaria();
    document.getElementById('daily-status').innerHTML = puede ? '✅ ¡Recompensa disponible!' : '⏳ Vuelve mañana';
    
    let calendarHtml = '';
    for (let i = 1; i <= 30; i++) {
        let clase = 'daily-day';
        if (i <= racha) clase += ' completed';
        else if (i === racha + 1 && puede) clase += ' current';
        calendarHtml += `<div class="${clase}"><div>Día ${i}</div><div>${getDailyRewardAmount(i)}💎</div></div>`;
    }
    document.getElementById('daily-calendar').innerHTML = calendarHtml;
    document.getElementById('modalDailyReward').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

async function claimDailyReward() {
    if (!userData.id) return alert("❌ Error");
    if (!puedeReclamarDiaria()) return alert("❌ Ya reclamaste hoy");
    
    let nuevoDia = 1;
    if (userData.last_daily_claim && userData.daily_streak > 0) {
        const diffHoras = (new Date() - new Date(userData.last_daily_claim)) / (1000 * 3600);
        if (diffHoras < 48) nuevoDia = userData.daily_streak + 1;
    }
    if (nuevoDia > 30) nuevoDia = 30;
    
    const recompensa = getDailyRewardAmount(nuevoDia);
    userData.diamonds += recompensa;
    userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    
    await saveUserData();
    actualizarUI();
    alert(`✅ +${recompensa} diamantes! Día ${nuevoDia}/30`);
    closeAll();
}

// ==========================================
// EVENTO SEMANAL
// ==========================================
function openEventModal() {
    closeAll();
    const evento = getEventoActual();
    document.getElementById('modalEvent').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function startEventTask() {
    const evento = getEventoActual();
    const requeridos = esPremium() ? evento.requeridos_premium : evento.requeridos;
    const recompensa = esPremium() ? evento.premium : evento.recompensa;
    
    if (!userData.event_progress) userData.event_progress = {};
    if (!userData.event_progress[evento.nombre]) userData.event_progress[evento.nombre] = 0;
    let progreso = userData.event_progress[evento.nombre];
    if (progreso >= requeridos) return alert("✅ Ya completaste este evento");
    
    showRewardedAd(async (success) => {
        if (success) {
            progreso++;
            userData.event_progress[evento.nombre] = progreso;
            if (progreso >= requeridos) {
                userData.diamonds += recompensa;
                userData.event_progress[evento.nombre] = 0;
                await saveUserData();
                actualizarUI();
                alert(`✅ Evento completado! +${recompensa} 💎`);
                closeAll();
            } else {
                await saveUserData();
                alert(`✅ Progreso: ${progreso}/${requeridos} anuncios`);
            }
        }
    });
}

// ==========================================
// CASINO
// ==========================================
function openCasino() {
    closeAll();
    document.getElementById('modalCasino').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    const rescueDiv = document.getElementById('casino-rescue');
    if (rescueDiv) rescueDiv.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
}

function abrirJuego(juego) {
    closeAll();
    let modalId = '';
    switch(juego) {
        case 'highlow': modalId = 'modalHighLow'; break;
        case 'ruleta': modalId = 'modalRuleta'; break;
        case 'tragaperras': modalId = 'modalTragaperras'; break;
        case 'dados': modalId = 'modalDados'; break;
        case 'loteria': modalId = 'modalLoteria'; break;
    }
    if (modalId) {
        if (juego === 'highlow') {
            document.getElementById('hl-number').textContent = '0000';
            document.getElementById('hl-result').innerHTML = '';
            document.getElementById('hl-bet-display').textContent = apuestaActual.highlow;
            document.getElementById('hl-bet').textContent = apuestaActual.highlow;
        } else if (juego === 'ruleta') {
            document.getElementById('ruleta-number').textContent = '0';
            document.getElementById('ruleta-result').innerHTML = '';
            document.getElementById('ruleta-bet-display').textContent = apuestaActual.ruleta;
            document.getElementById('ruleta-bet').textContent = apuestaActual.ruleta;
        } else if (juego === 'tragaperras') {
            document.getElementById('slot1').textContent = '💎';
            document.getElementById('slot2').textContent = '💎';
            document.getElementById('slot3').textContent = '💎';
            document.getElementById('tragaperras-result').innerHTML = '';
            document.getElementById('tragaperras-bet-display').textContent = apuestaActual.tragaperras;
            document.getElementById('tragaperras-bet').textContent = apuestaActual.tragaperras;
        } else if (juego === 'dados') {
            document.getElementById('dado1').textContent = '⚀';
            document.getElementById('dado2').textContent = '⚀';
            document.getElementById('dados-suma').textContent = 'Suma: 2';
            document.getElementById('dados-result').innerHTML = '';
            document.getElementById('dados-bet-display').textContent = apuestaActual.dados;
            document.getElementById('dados-bet').textContent = apuestaActual.dados;
        } else if (juego === 'loteria') {
            document.getElementById('loteria-number').textContent = '0000';
            document.getElementById('loteria-boletos').innerHTML = '';
            document.getElementById('loteria-result').innerHTML = '';
            document.getElementById('loteria-bet-display').textContent = apuestaActual.loteria;
            document.getElementById('loteria-bet').textContent = apuestaActual.loteria;
            boletosComprados = [];
        }
        document.getElementById(modalId).style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
        actualizarUI();
    }
}

function cerrarJuego() {
    closeAll();
    openCasino();
}

function cambiarApuesta(juego, delta) {
    const key = juego === 'hl' ? 'highlow' : juego;
    apuestaActual[key] = Math.max(1, Math.min(1000, apuestaActual[key] + delta));
    const displayId = `${juego === 'hl' ? 'hl' : key}-bet-display`;
    const betId = `${juego === 'hl' ? 'hl' : key}-bet`;
    document.getElementById(displayId).textContent = apuestaActual[key];
    document.getElementById(betId).textContent = apuestaActual[key];
}

function puedeJugar(juego, cantidad = 1) {
    if (userData.haInvertido) return true;
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = { highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0, fecha: hoy };
    }
    const limites = { highlow: 20, ruleta: 15, tragaperras: 30, dados: 20, loteria: 5 };
    return (userData.jugadasHoy[juego] + cantidad) <= limites[juego];
}

function registrarJugada(juego, cantidad = 1) {
    if (!userData.haInvertido) userData.jugadasHoy[juego] += cantidad;
}

function jugarHighLow(eleccion) {
    const apuesta = apuestaActual.highlow;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('highlow')) return alert('❌ Límite diario');
    userData.diamonds -= apuesta;
    registrarJugada('highlow');
    const numero = Math.floor(Math.random() * 10000);
    const gana = (eleccion === 'low' && numero < 5000) || (eleccion === 'high' && numero >= 5000);
    document.getElementById('hl-number').textContent = numero.toString().padStart(4, '0');
    if (gana) {
        userData.diamonds += apuesta * 2;
        document.getElementById('hl-result').innerHTML = '<span style="color:#4ade80;">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('hl-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
    }
    actualizarUI();
    saveUserData();
}

function jugarRuleta(tipo) {
    const apuesta = apuestaActual.ruleta;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('ruleta')) return alert('❌ Límite diario');
    userData.diamonds -= apuesta;
    registrarJugada('ruleta');
    let numero = Math.random() < 0.03 ? 0 : Math.floor(Math.random() * 37);
    document.getElementById('ruleta-number').textContent = numero;
    let gana = false;
    switch(tipo) {
        case 'rojo': gana = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(numero); break;
        case 'negro': gana = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(numero); break;
        case 'par': gana = numero !== 0 && numero % 2 === 0; break;
        case 'impar': gana = numero % 2 === 1; break;
        case 'bajo': gana = numero >= 1 && numero <= 18; break;
        case 'alto': gana = numero >= 19 && numero <= 36; break;
        case 'numero':
            const num = parseInt(prompt("Número del 0 al 36:"));
            if (isNaN(num) || num < 0 || num > 36) { userData.diamonds += apuesta; actualizarUI(); return; }
            gana = numero === num;
            break;
    }
    let ganancia = (tipo === 'numero' && gana) ? apuesta * 36 : apuesta * 2;
    if (gana) {
        userData.diamonds += ganancia;
        document.getElementById('ruleta-result').innerHTML = '<span style="color:#4ade80;">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('ruleta-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
    }
    actualizarUI();
    saveUserData();
}

function jugarTragaperras() {
    const apuesta = apuestaActual.tragaperras;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('tragaperras')) return alert('❌ Límite diario');
    userData.diamonds -= apuesta;
    registrarJugada('tragaperras');
    const slots = document.querySelectorAll('.slot');
    slots.forEach(s => s.classList.add('spinning'));
    setTimeout(() => {
        const simbolos = [
            { nombre: "💎", mult: 50 }, { nombre: "₿", mult: 20 }, { nombre: "Ξ", mult: 10 },
            { nombre: "🪙", mult: 5 }, { nombre: "📈", mult: 2 }, { nombre: "📉", mult: 2 }
        ];
        const r = [];
        for (let i = 0; i < 3; i++) {
            const rand = Math.random() * 100;
            let acum = 0;
            for (const s of simbolos) { acum += 20; if (rand < acum) { r.push(s); break; } }
        }
        document.getElementById('slot1').textContent = r[0].nombre;
        document.getElementById('slot2').textContent = r[1].nombre;
        document.getElementById('slot3').textContent = r[2].nombre;
        slots.forEach(s => s.classList.remove('spinning'));
        if (r[0].nombre === r[1].nombre && r[1].nombre === r[2].nombre) {
            let mult = r[0].mult;
            if (esPremium()) mult *= 2;
            userData.diamonds += apuesta * mult;
            document.getElementById('tragaperras-result').innerHTML = `<span style="color:#4ade80;">🎉 ¡JACKPOT! x${mult}</span>`;
        } else {
            document.getElementById('tragaperras-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
        }
        actualizarUI();
        saveUserData();
    }, 300);
}

function jugarDados(eleccion) {
    const apuesta = apuestaActual.dados;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('dados')) return alert('❌ Límite diario');
    userData.diamonds -= apuesta;
    registrarJugada('dados');
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const dado1 = document.getElementById('dado1');
    const dado2 = document.getElementById('dado2');
    dado1.classList.add('rolling');
    dado2.classList.add('rolling');
    setTimeout(() => {
        dado1.textContent = caras[d1 - 1];
        dado2.textContent = caras[d2 - 1];
        dado1.classList.remove('rolling');
        dado2.classList.remove('rolling');
        const suma = d1 + d2;
        document.getElementById('dados-suma').textContent = `Suma: ${suma}`;
        let gana = (eleccion === 'menor' && suma >= 2 && suma <= 6) ||
                   (eleccion === 'mayor' && suma >= 8 && suma <= 12) ||
                   (eleccion === 'exacto' && suma === 7);
        if (gana) {
            let ganancia = eleccion === 'exacto' ? apuesta * 5 : apuesta * 2;
            if (esPremium()) ganancia *= 2;
            userData.diamonds += ganancia;
            document.getElementById('dados-result').innerHTML = '<span style="color:#4ade80;">🎉 ¡GANASTE!</span>';
        } else {
            document.getElementById('dados-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
        }
        actualizarUI();
        saveUserData();
    }, 300);
}

function comprarBoletos() {
    const cantidad = apuestaActual.loteria;
    const costo = cantidad * 5;
    if (userData.diamonds < costo) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('loteria', cantidad)) return alert('❌ Límite diario');
    userData.diamonds -= costo;
    registrarJugada('loteria', cantidad);
    boletosComprados = [];
    for (let i = 0; i < cantidad; i++) {
        boletosComprados.push(Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
    }
    let html = '<p style="color:#94a3b8;">Tus boletos:</p><div style="display:flex; flex-wrap:wrap; gap:5px;">';
    boletosComprados.forEach(b => {
        html += `<span style="background:#1e293b; padding:5px 10px; border-radius:5px; border:1px solid #facc15;">${b}</span>`;
    });
    html += '</div>';
    document.getElementById('loteria-boletos').innerHTML = html;
    actualizarUI();
    saveUserData();
}

function jugarLoteria() {
    if (boletosComprados.length === 0) return alert("❌ Compra boletos primero");
    const ganador = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    document.getElementById('loteria-number').textContent = ganador;
    let premioTotal = 0;
    boletosComprados.forEach(b => {
        let coinc = 0;
        for (let i = 0; i < 4; i++) if (b[i] === ganador[i]) coinc++;
        if (coinc === 4) premioTotal += 2500;
        else if (coinc === 3) premioTotal += 250;
        else if (coinc === 2) premioTotal += 25;
        else if (coinc === 1) premioTotal += 5;
    });
    if (premioTotal > 0) {
        userData.diamonds += premioTotal;
        document.getElementById('loteria-result').innerHTML = `<span style="color:#4ade80;">🎉 +${premioTotal} 💎</span>`;
    } else {
        document.getElementById('loteria-result').innerHTML = '<span style="color:#ef4444;">😞 No ganaste</span>';
    }
    boletosComprados = [];
    actualizarUI();
    saveUserData();
}

// ==========================================
// EDIFICIOS
// ==========================================
function openBuilding(building) {
    closeAll();
    const modalId = `modal${building.charAt(0).toUpperCase() + building.slice(1)}`;
    document.getElementById(modalId).style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    if (building === 'escuela') iniciarJuegoEscuela();
    else if (building === 'fabrica') iniciarJuegoFabrica();
    else if (building === 'piscina') iniciarJuegoPiscina();
    else if (building === 'hospital') iniciarJuegoHospital();
}

function buyUpgradeFromBuilding(building, price) {
    if (userData.diamonds < price) return alert('❌ Insuficientes diamantes');
    userData[`lvl_${building}`]++;
    userData.diamonds -= price;
    saveUserData();
    actualizarUI();
    alert(`✅ ${building} nivel ${userData[`lvl_${building}`]}`);
    const levelSpan = document.getElementById(`${building}-level`);
    if (levelSpan) levelSpan.textContent = userData[`lvl_${building}`];
    const prodSpan = document.getElementById(`${building}-prod`);
    if (prodSpan) {
        const producciones = { escuela: 40, fabrica: 120, piscina: 60, hospital: 80 };
        prodSpan.textContent = (userData[`lvl_${building}`] * producciones[building]) + ' 💎/h';
    }
}

// ==========================================
// SISTEMA DE VIDAS
// ==========================================
function updateLivesUI(game) {
    const container = document.getElementById(`${game}-lives`);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const lifeDiv = document.createElement('div');
        lifeDiv.className = `life ${i < gameLives[game] ? 'active' : ''}`;
        lifeDiv.innerHTML = i < gameLives[game] ? '❤️' : '🖤';
        container.appendChild(lifeDiv);
    }
    const reviveBtn = document.getElementById(`${game}-revive`);
    if (reviveBtn) reviveBtn.style.display = gameLives[game] === 0 ? 'block' : 'none';
}

function loseLife(game) {
    gameLives[game]--;
    updateLivesUI(game);
    if (gameLives[game] === 0) {
        gameActiveStates[game] = false;
        const resultElem = document.getElementById(`${game === 'escuela' ? 'mem' : game === 'fabrica' ? 'asm' : game === 'piscina' ? 'jump' : 'surgery'}-result`);
        if (resultElem) resultElem.innerHTML = '<span style="color:#ef4444;">💀 GAME OVER</span>';
        return false;
    }
    return true;
}

function reviveGame(game) {
    if (gameLives[game] > 0) return;
    showRewardedAd((success) => {
        if (success) {
            gameLives[game] = 3;
            gameActiveStates[game] = true;
            updateLivesUI(game);
            if (game === 'escuela') iniciarJuegoEscuela();
            else if (game === 'fabrica') iniciarJuegoFabrica();
            else if (game === 'piscina') iniciarJuegoPiscina();
            else if (game === 'hospital') iniciarJuegoHospital();
            alert('❤️ Revivido!');
            saveUserData();
        }
    });
}

function useAdMultiplier(game) {
    showRewardedAd((s) => {
        if (s) { pendingMultiplier = 2; alert('✨ Multiplicador x2 activado!'); }
    });
}

// ==========================================
// MINIJUEGO 1: ESCUELA
// ==========================================
function iniciarJuegoEscuela() {
    gameActiveStates.escuela = true;
    escuelaLevel = userData.gameStats.escuela.currentLevel || 1;
    escuelaBest = userData.gameStats.escuela.bestLevel || 0;
    gameLives.escuela = userData.gameStats.escuela.lives || 3;
    updateLivesUI('escuela');
    document.getElementById('mem-level').textContent = escuelaLevel;
    document.getElementById('mem-best').textContent = escuelaBest;
    document.getElementById('escuela-game-level').textContent = escuelaLevel;
    nuevaSecuenciaEscuela();
}

function nuevaSecuenciaEscuela() {
    if (!gameActiveStates.escuela) return;
    escuelaSequence = [];
    escuelaUserInput = [];
    const length = Math.min(5 + Math.floor(escuelaLevel / 10), 12);
    for (let i = 0; i < length; i++) escuelaSequence.push(Math.floor(Math.random() * 16) + 1);
    mostrarSecuenciaEscuela();
}

function mostrarSecuenciaEscuela() {
    const display = document.getElementById('sequence-display');
    if (!display) return;
    display.innerHTML = '';
    let i = 0;
    function showNext() {
        if (i >= escuelaSequence.length) { crearPupitres(); return; }
        const card = document.createElement('div');
        card.className = 'sequence-card';
        card.textContent = escuelaSequence[i];
        display.appendChild(card);
        setTimeout(() => card.classList.add('highlight'), 100);
        setTimeout(() => card.remove(), 800);
        i++;
        setTimeout(showNext, 800);
    }
    showNext();
}

function crearPupitres() {
    const grid = document.getElementById('pupitres-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 16; i++) {
        const btn = document.createElement('div');
        btn.className = 'pupitre';
        btn.textContent = i;
        btn.onclick = () => seleccionarPupitre(i);
        grid.appendChild(btn);
    }
}

function seleccionarPupitre(num) {
    if (!gameActiveStates.escuela) return;
    escuelaUserInput.push(num);
    const idx = escuelaUserInput.length - 1;
    if (escuelaUserInput[idx] !== escuelaSequence[idx]) {
        if (!loseLife('escuela')) return;
        escuelaUserInput = [];
        setTimeout(() => nuevaSecuenciaEscuela(), 1500);
        return;
    }
    if (escuelaUserInput.length === escuelaSequence.length) {
        const reward = calcularRecompensa(50, 'escuela');
        userData.diamonds += reward;
        escuelaLevel++;
        if (escuelaLevel > escuelaBest) {
            escuelaBest = escuelaLevel;
            userData.gameStats.escuela.bestLevel = escuelaBest;
            document.getElementById('mem-best').textContent = escuelaBest;
        }
        userData.gameStats.escuela.currentLevel = escuelaLevel;
        userData.gameStats.escuela.lives = gameLives.escuela;
        document.getElementById('mem-level').textContent = escuelaLevel;
        document.getElementById('escuela-game-level').textContent = escuelaLevel;
        const resultElem = document.getElementById('mem-result');
        if (resultElem) resultElem.innerHTML = `<span style="color:#4ade80;">✅ +${reward} 💎!</span>`;
        actualizarUI();
        saveUserData();
        setTimeout(() => {
            if (resultElem) resultElem.innerHTML = '';
            nuevaSecuenciaEscuela();
        }, 2000);
    }
}

// ==========================================
// MINIJUEGO 2: FÁBRICA
// ==========================================
function iniciarJuegoFabrica() {
    gameActiveStates.fabrica = true;
    fabricaLevel = userData.gameStats.fabrica.currentLevel || 1;
    fabricaBest = userData.gameStats.fabrica.bestLevel || 0;
    fabricaCompleted = 0;
    fabricaRequired = Math.min(5 + Math.floor(fabricaLevel / 20), 20);
    gameLives.fabrica = userData.gameStats.fabrica.lives || 3;
    updateLivesUI('fabrica');
    document.getElementById('asm-completed').textContent = fabricaCompleted;
    document.getElementById('asm-required').textContent = fabricaRequired;
    document.getElementById('asm-best').textContent = fabricaBest;
    document.getElementById('fabrica-game-level').textContent = fabricaLevel;
    iniciarCinta();
}

function iniciarCinta() {
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    if (fabricaDefectInterval) clearInterval(fabricaDefectInterval);
    fabricaPosition = -50;
    const speed = Math.max(2, 10 - Math.floor(fabricaLevel / 50));
    fabricaAnimInterval = setInterval(() => {
        if (!gameActiveStates.fabrica) return;
        fabricaPosition += speed;
        if (fabricaPosition > 150) fabricaPosition = -50;
        const piece = document.getElementById('moving-piece');
        if (piece) piece.style.left = fabricaPosition + '%';
        if (fabricaPosition > 45 && fabricaPosition < 55 && !fabricaIsDefect) {
            fabricaCompleted++;
            document.getElementById('asm-completed').textContent = fabricaCompleted;
            if (fabricaCompleted >= fabricaRequired) {
                const reward = calcularRecompensa(75, 'fabrica');
                userData.diamonds += reward;
                fabricaLevel++;
                if (fabricaLevel > fabricaBest) {
                    fabricaBest = fabricaLevel;
                    userData.gameStats.fabrica.bestLevel = fabricaBest;
                    document.getElementById('asm-best').textContent = fabricaBest;
                }
                userData.gameStats.fabrica.currentLevel = fabricaLevel;
                userData.gameStats.fabrica.lives = gameLives.fabrica;
                document.getElementById('fabrica-game-level').textContent = fabricaLevel;
                actualizarUI();
                saveUserData();
                clearInterval(fabricaAnimInterval);
                clearInterval(fabricaDefectInterval);
                setTimeout(() => iniciarJuegoFabrica(), 2000);
            }
        }
    }, 30);
    fabricaDefectInterval = setInterval(() => {
        if (!gameActiveStates.fabrica) return;
        fabricaIsDefect = Math.random() < Math.min(0.3, fabricaLevel / 200);
        const piece = document.getElementById('moving-piece');
        if (piece) piece.textContent = fabricaIsDefect ? '💢' : '🔧';
    }, 5000);
}

// ==========================================
// MINIJUEGO 3: PISCINA
// ==========================================
function iniciarJuegoPiscina() {
    gameActiveStates.piscina = true;
    piscinaLevel = userData.gameStats.piscina.currentLevel || 1;
    piscinaBest = userData.gameStats.piscina.bestLevel || 0;
    piscinaPerfect = 0;
    piscinaRequired = Math.min(3 + Math.floor(piscinaLevel / 50), 10);
    gameLives.piscina = userData.gameStats.piscina.lives || 3;
    updateLivesUI('piscina');
    document.getElementById('jump-perfect').textContent = piscinaPerfect;
    document.getElementById('jump-required').textContent = piscinaRequired;
    document.getElementById('jump-best').textContent = piscinaBest;
    document.getElementById('piscina-game-level').textContent = piscinaLevel;
    initSlingshot();
}

function initSlingshot() {
    const area = document.getElementById('slingshot-area');
    if (!area) return;
    const powerFill = document.getElementById('power-fill');
    
    area.onmousedown = (e) => {
        if (!gameActiveStates.piscina) return;
        piscinaIsDragging = true;
        piscinaStartX = e.clientX;
        piscinaStartY = e.clientY;
    };
    
    area.onmousemove = (e) => {
        if (!piscinaIsDragging || !gameActiveStates.piscina) return;
        const dx = piscinaStartX - e.clientX;
        const dy = piscinaStartY - e.clientY;
        piscinaPower = Math.min(100, Math.sqrt(dx * dx + dy * dy) / 2);
        if (powerFill) powerFill.style.height = piscinaPower + '%';
    };
    
    area.onmouseup = () => {
        if (!piscinaIsDragging) return;
        piscinaIsDragging = false;
        const isPerfect = piscinaPower > 40 && piscinaPower < 60;
        if (isPerfect) {
            piscinaPerfect++;
            document.getElementById('jump-perfect').textContent = piscinaPerfect;
            if (piscinaPerfect >= piscinaRequired) {
                const reward = calcularRecompensa(60, 'piscina');
                userData.diamonds += reward;
                piscinaLevel++;
                if (piscinaLevel > piscinaBest) {
                    piscinaBest = piscinaLevel;
                    userData.gameStats.piscina.bestLevel = piscinaBest;
                    document.getElementById('jump-best').textContent = piscinaBest;
                }
                userData.gameStats.piscina.currentLevel = piscinaLevel;
                userData.gameStats.piscina.lives = gameLives.piscina;
                document.getElementById('piscina-game-level').textContent = piscinaLevel;
                actualizarUI();
                saveUserData();
                setTimeout(() => iniciarJuegoPiscina(), 2000);
            }
        } else {
            loseLife('piscina');
        }
        piscinaPower = 0;
        if (powerFill) powerFill.style.height = '0%';
    };
}

// ==========================================
// MINIJUEGO 4: HOSPITAL
// ==========================================
function iniciarJuegoHospital() {
    gameActiveStates.hospital = true;
    hospitalLevel = userData.gameStats.hospital.currentLevel || 1;
    hospitalBest = userData.gameStats.hospital.bestLevel || 0;
    hospitalExtracted = 0;
    hospitalTotal = Math.min(3 + Math.floor(hospitalLevel / 50), 8);
    gameLives.hospital = userData.gameStats.hospital.lives || 3;
    updateLivesUI('hospital');
    document.getElementById('virus-extracted').textContent = hospitalExtracted;
    document.getElementById('virus-total').textContent = hospitalTotal;
    document.getElementById('surgery-best').textContent = hospitalBest;
    document.getElementById('hospital-game-level').textContent = hospitalLevel;
    
    hospitalTimeLeft = 30;
    document.getElementById('time-fill').style.width = '100%';
    if (hospitalTimer) clearInterval(hospitalTimer);
    hospitalTimer = setInterval(() => {
        if (!gameActiveStates.hospital) return;
        hospitalTimeLeft -= 0.1;
        document.getElementById('time-fill').style.width = Math.max(0, (hospitalTimeLeft / 30) * 100) + '%';
        if (hospitalTimeLeft <= 0) {
            clearInterval(hospitalTimer);
            loseLife('hospital');
            setTimeout(() => iniciarJuegoHospital(), 2000);
        }
    }, 100);
    
    const area = document.getElementById('surgery-area');
    if (!area) return;
    area.innerHTML = '';
    for (let i = 0; i < hospitalTotal; i++) {
        const virus = document.createElement('div');
        virus.className = 'virus';
        virus.textContent = '🦠';
        virus.style.left = (20 + Math.random() * 60) + '%';
        virus.style.top = (20 + Math.random() * 60) + '%';
        virus.style.cursor = 'pointer';
        virus.onclick = () => {
            hospitalExtracted++;
            document.getElementById('virus-extracted').textContent = hospitalExtracted;
            virus.remove();
            if (hospitalExtracted >= hospitalTotal) {
                clearInterval(hospitalTimer);
                const reward = calcularRecompensa(80, 'hospital');
                userData.diamonds += reward;
                hospitalLevel++;
                if (hospitalLevel > hospitalBest) {
                    hospitalBest = hospitalLevel;
                    userData.gameStats.hospital.bestLevel = hospitalBest;
                    document.getElementById('surgery-best').textContent = hospitalBest;
                }
                userData.gameStats.hospital.currentLevel = hospitalLevel;
                userData.gameStats.hospital.lives = gameLives.hospital;
                document.getElementById('hospital-game-level').textContent = hospitalLevel;
                actualizarUI();
                saveUserData();
                setTimeout(() => iniciarJuegoHospital(), 2000);
            }
        };
        area.appendChild(virus);
    }
}

// ==========================================
// RANKING Y POOL
// ==========================================
async function updateRankingAndPool() {
    try {
        const { data, error } = await _supabase.from('game_data').select('telegram_id, diamonds').neq('telegram_id', 'MASTER');
        if (!error && data) {
            globalPoolData.user_rankings = data.map(u => ({ id: u.telegram_id, diamonds: Number(u.diamonds) || 0 })).sort((a, b) => b.diamonds - a.diamonds);
        }
        const posicion = globalPoolData.user_rankings.findIndex(u => u.id === userData.id);
        if (posicion !== -1) {
            if (posicion < 3) userData.rank = "Diamante";
            else if (posicion < 10) userData.rank = "Oro";
            else if (posicion < 50) userData.rank = "Plata";
            else userData.rank = "Ciudadano";
            userData.weekly_rank = posicion + 1;
        }
        userData.projectedReward = globalPoolData.pool_ton * 0.01;
    } catch(e) { console.error("Error ranking:", e); }
}

async function updateRealPoolBalance() {
    try {
        const response = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        if (response.ok) {
            const data = await response.json();
            globalPoolData.pool_ton = (data.balance || 0) / 1000000000;
        }
    } catch(e) { console.error(e); }
}

// ==========================================
// GUARDADO SUPABASE
// ==========================================
async function saveUserData() {
    if (!userData.id) return;
    try {
        await _supabase.from('game_data').update({
            diamonds: Math.floor(userData.diamonds),
            lvl_piscina: userData.lvl_piscina,
            lvl_fabrica: userData.lvl_fabrica,
            lvl_escuela: userData.lvl_escuela,
            lvl_hospital: userData.lvl_hospital,
            last_online: new Date().toISOString(),
            premium_expires: userData.premium_expires,
            daily_streak: userData.daily_streak,
            last_daily_claim: userData.last_daily_claim,
            haInvertido: userData.haInvertido,
            event_progress: userData.event_progress,
            accumulated_ton: userData.accumulated_ton,
            retiradoHoy: userData.retiradoHoy,
            gameStats: userData.gameStats,
            referral_earnings: userData.referral_earnings,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue
        }).eq('telegram_id', userData.id);
    } catch(e) { console.error('Error guardando:', e); }
}

async function loadUserFromDB(tgId) {
    const { data, error } = await _supabase.from('game_data').select('*').eq('telegram_id', tgId.toString()).maybeSingle();
    if (error) { console.error(error); return; }
    if (!data) {
        const nuevo = {
            telegram_id: tgId.toString(),
            username: userData.username,
            diamonds: 0,
            lvl_piscina: 0, lvl_fabrica: 0, lvl_escuela: 0, lvl_hospital: 0,
            referral_code: 'REF' + tgId.toString().slice(-6),
            last_online: new Date().toISOString(),
            haInvertido: false,
            event_progress: {},
            accumulated_ton: 0,
            retiradoHoy: 0,
            gameStats: {
                escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
            }
        };
        await _supabase.from('game_data').insert([nuevo]);
        userData = { ...userData, ...nuevo, id: tgId.toString() };
    } else {
        userData = {
            ...userData, ...data, id: tgId.toString(),
            diamonds: Number(data.diamonds) || 0,
            lvl_piscina: Number(data.lvl_piscina) || 0,
            lvl_fabrica: Number(data.lvl_fabrica) || 0,
            lvl_escuela: Number(data.lvl_escuela) || 0,
            lvl_hospital: Number(data.lvl_hospital) || 0,
            referral_earnings: Number(data.referral_earnings) || 0,
            referred_users: data.referred_users || [],
            premium_expires: data.premium_expires || null,
            daily_streak: Number(data.daily_streak) || 0,
            last_daily_claim: data.last_daily_claim || null,
            haInvertido: data.haInvertido || false,
            event_progress: data.event_progress || {},
            accumulated_ton: Number(data.accumulated_ton) || 0,
            retiradoHoy: Number(data.retiradoHoy) || 0,
            last_ad_watch: data.last_ad_watch || null,
            last_casino_rescue: data.last_casino_rescue || null,
            gameStats: data.gameStats || {
                escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
            }
        };
    }
    document.getElementById('user-display').textContent = userData.username;
    actualizarUI();
    actualizarPremiumUI();
}

// ==========================================
// PRODUCCIÓN
// ==========================================
function startProduction() {
    setInterval(() => {
        if (!userData.id) return;
        userData.diamonds += getTotalProduction() / 3600;
        actualizarUI();
    }, 1000);
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function initApp() {
    tg.expand();
    tg.ready();
    
    const user = tg.initDataUnsafe?.user;
    if (user) {
        userData.id = user.id.toString();
        userData.username = user.first_name || 'Usuario';
        document.getElementById('user-display').textContent = userData.username;
        await loadUserFromDB(user.id);
    }
    
    await initTONConnect();
    await updateRealPoolBalance();
    await updateRankingAndPool();
    startProduction();
    actualizarEventosUI();
    
    setInterval(saveUserData, 30000);
    setInterval(async () => {
        await updateRankingAndPool();
        actualizarEventosUI();
    }, 60000);
    
    window.addEventListener('beforeunload', () => saveUserData());
    
    // Abrir perfil por defecto
    setTimeout(() => openPerfil(), 1000);
}

window.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// EXPORTACIONES GLOBALES
// ==========================================
window.openPerfil = openPerfil;
window.openFriends = openFriends;
window.openRanking = openRanking;
window.openBank = openBank;
window.openStore = openStore;
window.openCasino = openCasino;
window.openBuilding = openBuilding;
window.openDailyReward = openDailyReward;
window.openEventModal = openEventModal;
window.showAdsModal = showAdsModal;
window.abrirJuego = abrirJuego;
window.cerrarJuego = cerrarJuego;
window.cambiarApuesta = cambiarApuesta;
window.jugarHighLow = jugarHighLow;
window.jugarRuleta = jugarRuleta;
window.jugarTragaperras = jugarTragaperras;
window.jugarDados = jugarDados;
window.comprarBoletos = comprarBoletos;
window.jugarLoteria = jugarLoteria;
window.claimDailyReward = claimDailyReward;
window.showAd = showAd;
window.rescueWithAd = rescueWithAd;
window.comprarPremium = comprarPremium;
window.comprarTON = comprarTON;
window.buyUpgradeFromBuilding = buyUpgradeFromBuilding;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.disconnectWallet = disconnectWallet;
window.switchBancoTab = switchBancoTab;
window.actualizarPanelVenta = actualizarPanelVenta;
window.cambiarVentaDiamonds = cambiarVentaDiamonds;
window.setVentaCantidad = setVentaCantidad;
window.setVentaCantidadMax = setVentaCantidadMax;
window.venderDiamantes = venderDiamantes;
window.startEventTask = startEventTask;
window.useAdMultiplier = useAdMultiplier;
window.reviveGame = reviveGame;

console.log('✅ TON CITY - Iniciado correctamente');