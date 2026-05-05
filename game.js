// ======================================================
// TON CITY - VERSIÓN FINAL COMPLETA
// ======================================================
console.log('🚀 TON CITY - Iniciando...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

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
        highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, ruletarusa: 0, loteria: 0,
        fecha: new Date().toDateString()
    }
};

let globalPoolData = { pool_ton: 100, total_diamonds: 0, user_rankings: [] };

// ==========================================
// CONSTANTES DE JUEGOS
// ==========================================
const EVENTOS_SEMANALES = [
    { nombre: "Escuela", edificio: "escuela", icono: "fa-school", emoji: "🏫", color: "#fbbf24", descripcion: "Semana del Saber - Gana x2 en Escuela (x4 Premium)", recompensa: 200, premium: 400, gameMultiplier: 2 },
    { nombre: "Fábrica", edificio: "fabrica", icono: "fa-industry", emoji: "🏭", color: "#a78bfa", descripcion: "Semana de Producción - Gana x2 en Fábrica (x4 Premium)", recompensa: 150, premium: 300, gameMultiplier: 2 },
    { nombre: "Piscina", edificio: "piscina", icono: "fa-water-ladder", emoji: "🏊", color: "#38bdf8", descripcion: "Semana Olímpica - Gana x2 en Piscina (x4 Premium)", recompensa: 80, premium: 160, gameMultiplier: 2 },
    { nombre: "Hospital", edificio: "hospital", icono: "fa-hospital", emoji: "🏥", color: "#f87171", descripcion: "Semana de la Salud - Gana x2 en Hospital (x4 Premium)", recompensa: 100, premium: 200, gameMultiplier: 2 }
];

const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

// ==========================================
// APUESTAS CASINO
// ==========================================
let apuestaActual = { highlow: 10, ruleta: 10, tragaperras: 5, dados: 10, ruletarusa: 10, loteria: 1 };
let boletosComprados = [];

// ==========================================
// ESTADO DE MINIJUEGOS
// ==========================================
let gameLives = { escuela: 3, fabrica: 3, piscina: 3, hospital: 3 };
let gameActiveStates = { escuela: true, fabrica: true, piscina: true, hospital: true };

// Escuela
let escuelaSequence = [];
let escuelaUserInput = [];
let escuelaLevel = 1;
let escuelaBest = 0;

// Fábrica
let fabricaLevel = 1;
let fabricaBest = 0;
let fabricaCompleted = 0;
let fabricaRequired = 5;
let fabricaPosition = -30;
let fabricaIsDefect = false;
let fabricaAnimInterval = null;

// Piscina
let piscinaLevel = 1;
let piscinaBest = 0;
let piscinaPerfect = 0;
let piscinaRequired = 3;
let piscinaPower = 0;
let piscinaHoldStart = 0;
let piscinaChargeInterval = null;

// Hospital
let hospitalLevel = 1;
let hospitalBest = 0;
let hospitalExtracted = 0;
let hospitalTotal = 3;
let hospitalTimeLeft = 25;
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
    const banner = document.getElementById('event-banner');
    if (banner) {
        banner.style.display = 'flex';
        document.getElementById('event-banner-title').textContent = evento.nombre;
        document.getElementById('event-banner-subtitle').textContent = '¡x' + (esPremium() ? 4 : 2) + ' en ' + evento.nombre + '!';
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
    let base = (userData.lvl_escuela * 15) + (userData.lvl_fabrica * 25) + 
               (userData.lvl_piscina * 10) + (userData.lvl_hospital * 18);
    return esPremium() ? base * 2 : base;
}

function calcularRecompensa(baseReward, building) {
    const nivelEdificio = userData[`lvl_${building}`] || 0;
    const multiplierNivel = 1 + (nivelEdificio * 0.005);
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

function actualizarUI() {
    document.getElementById('diamonds').textContent = Math.floor(userData.diamonds || 0);
    document.getElementById('rate').textContent = Math.floor(getTotalProduction());
    document.getElementById('lvl_piscina').textContent = userData.lvl_piscina;
    document.getElementById('lvl_fabrica').textContent = userData.lvl_fabrica;
    document.getElementById('lvl_escuela').textContent = userData.lvl_escuela;
    document.getElementById('lvl_hospital').textContent = userData.lvl_hospital;
    document.getElementById('user-display').textContent = userData.username || 'Usuario';
    
    // Actualizar saldo casino si está abierto
    const casinoSaldo = document.getElementById('casino-saldo');
    if (casinoSaldo) casinoSaldo.textContent = Math.floor(userData.diamonds);
}

// ==========================================
// NAVEGACIÓN Y MODALES
// ==========================================
function showModal(id) {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById(id).style.display = 'block';
}

function closeAll() {
    document.getElementById('overlay').style.display = 'none';
    const modals = [
        'modalPerfil', 'modalFriends', 'modalRanking', 'modalBank', 'modalStore',
        'modalCasino', 'modalHighLow', 'modalRuleta', 'modalTragaperras', 'modalDados',
        'modalRuletaRusa', 'modalEscuela', 'modalFabrica', 'modalPiscina', 'modalHospital',
        'modalEvent', 'modalDailyReward', 'modalAds'
    ];
    modals.forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    if (hospitalTimer) clearInterval(hospitalTimer);
    setActiveNav('perfil');
}

function setActiveNav(tab) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach((item, i) => {
        item.classList.remove('active');
        if ((tab === 'perfil' && i === 0) || (tab === 'amigos' && i === 1) || (tab === 'ranking' && i === 2)) {
            item.classList.add('active');
        }
    });
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
    
    const avatar = document.getElementById('perfil-avatar');
    if (user?.photo_url) {
        avatar.innerHTML = '<img src="' + user.photo_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else {
        avatar.innerHTML = name.charAt(0).toUpperCase();
    }
    
    document.getElementById('perfil-diamonds').textContent = Math.floor(userData.diamonds || 0);
    document.getElementById('perfil-rate').textContent = Math.floor(getTotalProduction());
    document.getElementById('perfil-piscina').textContent = 'Nivel ' + (userData.lvl_piscina || 0);
    document.getElementById('perfil-fabrica').textContent = 'Nivel ' + (userData.lvl_fabrica || 0);
    document.getElementById('perfil-escuela').textContent = 'Nivel ' + (userData.lvl_escuela || 0);
    document.getElementById('perfil-hospital').textContent = 'Nivel ' + (userData.lvl_hospital || 0);
    document.getElementById('perfil-rango-display').textContent = userData.rank || 'Ciudadano';
    document.getElementById('perfil-proyeccion').textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
    document.getElementById('perfil-premium').textContent = esPremium() ? 'Sí ⭐' : 'No';
    document.getElementById('perfil-rank-badge').textContent = userData.rank || 'Ciudadano';
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    closeAll();
    document.getElementById('modalFriends').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('referral-code').textContent = userData.referral_code || 'CARGANDO...';
    document.getElementById('ref-count').textContent = (userData.referred_users || []).length;
    document.getElementById('ref-total').textContent = (userData.referral_earnings || 0) + ' 💎';
    setActiveNav('amigos');
}

function copyReferralCode() {
    if (!userData.referral_code) return alert('❌ Código no disponible');
    navigator.clipboard.writeText('https://t.me/ton_city_bot?start=' + userData.referral_code)
        .then(function() { alert('✅ Enlace copiado!'); })
        .catch(function() { alert('❌ Error al copiar'); });
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
    var isConnected = tonConnectUI && tonConnectUI.connected;
    var packs = [
        { ton: 0.10, diamonds: 100 },
        { ton: 0.50, diamonds: 500 },
        { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 },
        { ton: 5.00, diamonds: 5000 },
        { ton: 10.00, diamonds: 10000 }
    ];
    var bankList = document.getElementById('bankList');
    if (!bankList) return;
    var html = '';
    for (var i = 0; i < packs.length; i++) {
        var p = packs[i];
        html += '<div style="background:#0f172a;border-radius:12px;padding:16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;">';
        html += '<div><strong>' + p.ton.toFixed(2) + ' TON</strong><div style="font-size:12px;color:#94a3b8;">+' + p.diamonds + ' 💎</div></div>';
        html += '<button onclick="comprarTON(' + p.ton + ')" style="background:' + (isConnected ? '#4ade80' : '#334155') + ';border:none;padding:10px 20px;border-radius:30px;color:white;font-weight:700;" ' + (!isConnected ? 'disabled' : '') + '>' + (isConnected ? 'COMPRAR' : 'CONECTAR') + '</button>';
        html += '</div>';
    }
    bankList.innerHTML = html;
}

function switchBancoTab(tab) {
    bancoTabActual = tab;
    var tabs = document.querySelectorAll('.banco-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
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
    var poolTotal = globalPoolData.pool_ton || 0;
    document.getElementById('venta-pool').textContent = poolTotal.toFixed(4) + ' TON';
    
    var tasaBase = 10000;
    var poolFactor = Math.max(0.5, Math.min(2, poolTotal / 10));
    var tasaActual = Math.floor(tasaBase / poolFactor);
    document.getElementById('venta-tasa').textContent = tasaActual + ' 💎 = 1 TON';
    window._tasaVentaActual = tasaActual;
    
    var tonRecibir = ventaCantidad / tasaActual;
    document.getElementById('venta-ton-recibir').textContent = tonRecibir.toFixed(4) + ' TON';
    document.getElementById('venta-cantidad').textContent = ventaCantidad;
    
    var btnVender = document.getElementById('vender-btn');
    var errorEl = document.getElementById('venta-error');
    var walletConnected = tonConnectUI && tonConnectUI.connected;
    
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
    } else if ((userData.retiradoHoy || 0) + tonRecibir > 5) {
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

async function venderDiamantes() {
    var tasa = window._tasaVentaActual || 10000;
    var tonRecibir = ventaCantidad / tasa;
    
    if (!tonConnectUI || !tonConnectUI.connected) return alert('Conecta tu wallet primero');
    if (tonRecibir < 1) return alert('El mínimo de retiro es 1 TON');
    if ((userData.retiradoHoy || 0) + tonRecibir > 5) return alert('Límite diario de 5 TON alcanzado');
    if (tonRecibir > (globalPoolData.pool_ton || 0)) return alert('No hay suficientes TON en el pool');
    
    if (!confirm('¿Cambiar ' + ventaCantidad + ' 💎 por ' + tonRecibir.toFixed(4) + ' TON?')) return;
    
    try {
        var tx = {
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
        alert('✅ Cambiaste ' + ventaCantidad + ' 💎 por ' + tonRecibir.toFixed(4) + ' TON');
    } catch(e) {
        console.error(e);
        alert('❌ Error en la transacción');
    }
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta wallet primero');
    try {
        var tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: BILLETERA_PROPIETARIO,
                amount: Math.floor(tonAmount * 1e9).toString(),
                payload: "Compra TON City"
            }]
        };
        await tonConnectUI.sendTransaction(tx);
        var comprados = Math.floor(tonAmount / PRECIO_COMPRA);
        if (comprados < 100) comprados = 100;
        userData.diamonds += comprados;
        if (!userData.haInvertido && comprados >= 100) userData.haInvertido = true;
        await saveUserData();
        actualizarUI();
        alert('✅ +' + comprados + ' 💎');
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
        tonConnectUI.onStatusChange(function(wallet) {
            currentWallet = wallet;
            var btnDiv = document.getElementById('ton-connect-button');
            var walletInfo = document.getElementById('wallet-info');
            if (wallet) {
                if (btnDiv) btnDiv.style.display = 'none';
                if (walletInfo) walletInfo.classList.remove('hidden');
            } else {
                if (btnDiv) btnDiv.style.display = 'block';
                if (walletInfo) walletInfo.classList.add('hidden');
            }
            if (document.getElementById('modalBank') && document.getElementById('modalBank').style.display === 'block') {
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
    document.getElementById('ton-connect-button').style.display = 'block';
    document.getElementById('wallet-info').classList.add('hidden');
    actualizarListaCompra();
}

// ==========================================
// TIENDA PREMIUM
// ==========================================
function openStore() {
    closeAll();
    document.getElementById('modalStore').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    var isConnected = tonConnectUI && tonConnectUI.connected;
    var html = '';
    for (var i = 0; i < PREMIUM_PLANS.length; i++) {
        var p = PREMIUM_PLANS[i];
        html += '<div style="background:#0f172a;border-radius:16px;padding:16px;margin:10px 0;">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:10px;"><strong>' + p.name + '</strong><span style="color:#facc15;">' + p.price + ' TON</span></div>';
        html += '<button onclick="comprarPremium(' + p.days + ')" style="background:' + (isConnected ? '#8b5cf6' : '#334155') + ';border:none;border-radius:30px;padding:12px;width:100%;color:white;font-weight:700;" ' + (!isConnected ? 'disabled' : '') + '>' + (isConnected ? 'COMPRAR' : 'CONECTAR') + '</button>';
        html += '</div>';
    }
    document.getElementById('premium-plans').innerHTML = html;
}

async function comprarPremium(days) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta wallet');
    var plan = null;
    for (var i = 0; i < PREMIUM_PLANS.length; i++) {
        if (PREMIUM_PLANS[i].days === days) { plan = PREMIUM_PLANS[i]; break; }
    }
    if (!plan) return;
    try {
        var tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: BILLETERA_PROPIETARIO,
                amount: Math.floor(plan.price * 1e9).toString(),
                payload: "Premium Ton City"
            }]
        };
        await tonConnectUI.sendTransaction(tx);
        var exp = new Date();
        exp.setDate(exp.getDate() + days);
        userData.premium_expires = exp.toISOString();
        await saveUserData();
        actualizarPremiumUI();
        actualizarUI();
        alert('✅ Plan ' + plan.name + ' activado!');
        closeAll();
    } catch(e) {
        console.error(e);
        alert('❌ Transacción cancelada');
    }
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
        adsReady = false;
    }
}

function showRewardedAd(callback) {
    if (esPremium()) {
        callback(true);
        return;
    }
    if (!adsReady || !AdController) {
        alert("📺 Anuncios no disponibles");
        callback(false);
        return;
    }
    AdController.show()
        .then(function(result) { callback(result.done === true); })
        .catch(function() { callback(false); });
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
    var puede = (!userData.last_ad_watch || (new Date() - new Date(userData.last_ad_watch)) > 3600000);
    var btn = document.getElementById('watch-ad-btn');
    var statusDiv = document.getElementById('ads-status');
    if (!btn) return;
    if (esPremium()) {
        btn.disabled = true;
        btn.textContent = '⭐ PREMIUM - SIN ANUNCIOS';
        if (statusDiv) statusDiv.innerHTML = '⭐ Premium: sin anuncios';
        return;
    }
    if (puede && adsReady) {
        btn.disabled = false;
        btn.textContent = 'VER ANUNCIO +20 💎';
        if (statusDiv) statusDiv.innerHTML = '✅ Anuncio disponible';
    } else {
        btn.disabled = true;
        var restante = userData.last_ad_watch ? Math.ceil((3600000 - (new Date() - new Date(userData.last_ad_watch))) / 60000) : 60;
        btn.textContent = '⏳ ' + restante + ' min';
        if (statusDiv) statusDiv.innerHTML = '⏳ Próximo en ' + restante + ' min';
    }
}

function showAd() {
    if (esPremium()) {
        userData.diamonds += 20;
        saveUserData();
        actualizarUI();
        alert('⭐ Premium: +20 💎');
        closeAll();
        return;
    }
    showRewardedAd(function(success) {
        if (success) {
            userData.diamonds += 20;
            userData.last_ad_watch = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 +20 💎');
            closeAll();
        }
    });
}

function rescueWithAd() {
    if (esPremium()) {
        userData.diamonds += 50;
        actualizarUI();
        return;
    }
    if (userData.diamonds > 0) return alert("Solo cuando tienes 0 diamantes");
    var hoy = new Date();
    if (userData.last_casino_rescue && hoy.toDateString() === new Date(userData.last_casino_rescue).toDateString()) {
        return alert("Ya usaste rescate hoy");
    }
    showRewardedAd(function(success) {
        if (success) {
            userData.diamonds += 50;
            userData.last_casino_rescue = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 +50 💎');
        }
    });
}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= 30) return esPremium() ? 300 : 150;
    var base = 5 + (day - 1) * 3;
    if (base > 150) base = 150;
    return esPremium() ? base * 2 : base;
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    var ultimo = new Date(userData.last_daily_claim);
    var hoy = new Date();
    ultimo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    return hoy > ultimo;
}

function openDailyReward() {
    closeAll();
    var racha = userData.daily_streak || 0;
    var diaActual = Math.min(racha + 1, 30);
    document.getElementById('current-day').textContent = diaActual;
    document.getElementById('today-reward').textContent = getDailyRewardAmount(diaActual) + ' 💎';
    
    var puede = puedeReclamarDiaria();
    document.getElementById('daily-status').innerHTML = puede ? '✅ ¡Recompensa disponible!' : '⏳ Vuelve mañana';
    
    var calendarHtml = '';
    for (var i = 1; i <= 30; i++) {
        var clase = 'daily-day';
        if (i <= racha) clase += ' completed';
        else if (i === racha + 1 && puede) clase += ' current';
        calendarHtml += '<div class="' + clase + '"><div>Día ' + i + '</div><div>' + getDailyRewardAmount(i) + '💎</div></div>';
    }
    document.getElementById('daily-calendar').innerHTML = calendarHtml;
    document.getElementById('modalDailyReward').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

async function claimDailyReward() {
    if (!userData.id) return alert("❌ Error");
    if (!puedeReclamarDiaria()) return alert("❌ Ya reclamaste hoy");
    
    var nuevoDia = 1;
    if (userData.last_daily_claim && userData.daily_streak > 0) {
        var diffHoras = (new Date() - new Date(userData.last_daily_claim)) / (1000 * 3600);
        if (diffHoras < 48) nuevoDia = userData.daily_streak + 1;
    }
    if (nuevoDia > 30) nuevoDia = 30;
    
    var recompensa = getDailyRewardAmount(nuevoDia);
    userData.diamonds += recompensa;
    userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    
    await saveUserData();
    actualizarUI();
    alert('✅ +' + recompensa + ' diamantes! Día ' + nuevoDia + '/30');
    closeAll();
}

// ==========================================
// EVENTO SEMANAL
// ==========================================
function openEventModal() {
    closeAll();
    var evento = getEventoActual();
    document.getElementById('event-emoji').textContent = evento.emoji;
    document.getElementById('event-titulo').textContent = evento.nombre;
    document.getElementById('event-description').textContent = evento.descripcion;
    document.getElementById('modalEvent').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function startEventTask() {
    closeAll();
    var evento = getEventoActual();
    openBuilding(evento.edificio);
}

// ==========================================
// CASINO
// ==========================================
function openCasino() {
    closeAll();
    document.getElementById('modalCasino').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('casino-saldo').textContent = Math.floor(userData.diamonds);
    var rescueDiv = document.getElementById('casino-rescue');
    if (rescueDiv) rescueDiv.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
}

function abrirJuego(juego) {
    closeAll();
    var modalId = '';
    switch(juego) {
        case 'highlow': modalId = 'modalHighLow'; break;
        case 'ruleta': modalId = 'modalRuleta'; break;
        case 'tragaperras': modalId = 'modalTragaperras'; break;
        case 'dados': modalId = 'modalDados'; break;
        case 'ruletarusa': modalId = 'modalRuletaRusa'; break;
    }
    if (modalId) {
        document.getElementById(modalId).style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
        if (juego === 'highlow') {
            document.getElementById('hl-number').textContent = '0000';
            document.getElementById('hl-result').innerHTML = '';
            document.getElementById('hl-bet-display').textContent = apuestaActual.highlow;
            document.getElementById('hl-bet').textContent = apuestaActual.highlow + ' 💎';
            document.getElementById('hl-balance').textContent = Math.floor(userData.diamonds);
        } else if (juego === 'ruleta') {
            document.getElementById('ruleta-number').textContent = '0';
            document.getElementById('ruleta-result').innerHTML = '';
            document.getElementById('ruleta-bet-display').textContent = apuestaActual.ruleta;
            document.getElementById('ruleta-bet').textContent = apuestaActual.ruleta + ' 💎';
            document.getElementById('ruleta-balance').textContent = Math.floor(userData.diamonds);
        } else if (juego === 'tragaperras') {
            document.getElementById('slot1').textContent = '💎';
            document.getElementById('slot2').textContent = '💰';
            document.getElementById('slot3').textContent = '🌟';
            document.getElementById('tragaperras-result').innerHTML = '';
            document.getElementById('tragaperras-bet-display').textContent = apuestaActual.tragaperras;
            document.getElementById('tragaperras-bet').textContent = apuestaActual.tragaperras + ' 💎';
            document.getElementById('tragaperras-balance').textContent = Math.floor(userData.diamonds);
        } else if (juego === 'dados') {
            document.getElementById('dado1').textContent = '⚀';
            document.getElementById('dado2').textContent = '⚀';
            document.getElementById('dados-suma').textContent = 'Suma: 2';
            document.getElementById('dados-result').innerHTML = '';
            document.getElementById('dados-bet-display').textContent = apuestaActual.dados;
            document.getElementById('dados-bet').textContent = apuestaActual.dados + ' 💎';
            document.getElementById('dados-balance').textContent = Math.floor(userData.diamonds);
        } else if (juego === 'ruletarusa') {
            crearCamarasRuletaRusa();
            document.getElementById('ruletarusa-result').innerHTML = '';
            document.getElementById('ruletarusa-emoji').textContent = '🔫';
            document.getElementById('ruletarusa-bet-display').textContent = apuestaActual.ruletarusa;
            document.getElementById('ruletarusa-bet').textContent = apuestaActual.ruletarusa + ' 💎';
            document.getElementById('ruletarusa-balance').textContent = Math.floor(userData.diamonds);
        }
    }
}

function cerrarJuego() {
    closeAll();
    openCasino();
}

function cambiarApuesta(juego, delta) {
    apuestaActual[juego] = Math.max(1, Math.min(1000, apuestaActual[juego] + delta));
    document.getElementById(juego + '-bet-display').textContent = apuestaActual[juego];
    document.getElementById(juego + '-bet').textContent = apuestaActual[juego] + ' 💎';
}

function puedeJugar(juego, cantidad) {
    if (!cantidad) cantidad = 1;
    if (userData.haInvertido) return true;
    var hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = { highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, ruletarusa: 0, loteria: 0, fecha: hoy };
    }
    var limites = { highlow: 20, ruleta: 15, tragaperras: 30, dados: 20, ruletarusa: 10, loteria: 5 };
    return (userData.jugadasHoy[juego] + cantidad) <= limites[juego];
}

function registrarJugada(juego, cantidad) {
    if (!cantidad) cantidad = 1;
    if (!userData.haInvertido) userData.jugadasHoy[juego] += cantidad;
}

function jugarHighLow(eleccion) {
    var apuesta = apuestaActual.highlow;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('highlow')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('highlow');
    
    var numero = Math.floor(Math.random() * 10000);
    var gana = (eleccion === 'low' && numero < 5000) || (eleccion === 'high' && numero >= 5000);
    
    document.getElementById('hl-number').textContent = numero.toString().padStart(4, '0');
    document.getElementById('hl-balance').textContent = Math.floor(userData.diamonds);
    
    if (gana) {
        var ganancia = apuesta * 2;
        userData.diamonds += ganancia;
        document.getElementById('hl-result').innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
        if (navigator.vibrate) navigator.vibrate(50);
    } else {
        document.getElementById('hl-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
    }
    
    actualizarUI();
    saveUserData();
}

function jugarRuleta(tipo) {
    var apuesta = apuestaActual.ruleta;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('ruleta')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('ruleta');
    
    var numero = Math.random() < 0.03 ? 0 : Math.floor(Math.random() * 37);
    document.getElementById('ruleta-number').textContent = numero;
    document.getElementById('ruleta-balance').textContent = Math.floor(userData.diamonds);
    
    var gana = false;
    switch(tipo) {
        case 'rojo': gana = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].indexOf(numero) !== -1; break;
        case 'negro': gana = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].indexOf(numero) !== -1; break;
        case 'par': gana = numero !== 0 && numero % 2 === 0; break;
        case 'impar': gana = numero % 2 === 1; break;
        case 'bajo': gana = numero >= 1 && numero <= 18; break;
        case 'alto': gana = numero >= 19 && numero <= 36; break;
        case 'numero':
            var num = parseInt(prompt("Elige un número del 0 al 36:"));
            if (isNaN(num) || num < 0 || num > 36) {
                userData.diamonds += apuesta;
                actualizarUI();
                return;
            }
            gana = numero === num;
            break;
    }
    
    var ganancia = (tipo === 'numero' && gana) ? apuesta * 36 : apuesta * 2;
    if (gana) {
        userData.diamonds += ganancia;
        document.getElementById('ruleta-result').innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
        if (navigator.vibrate) navigator.vibrate(50);
    } else {
        document.getElementById('ruleta-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
    }
    
    actualizarUI();
    saveUserData();
}

function jugarTragaperras() {
    var apuesta = apuestaActual.tragaperras;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('tragaperras')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('tragaperras');
    
    var slots = document.querySelectorAll('.slot');
    for (var i = 0; i < slots.length; i++) {
        slots[i].classList.add('spinning');
    }
    
    setTimeout(function() {
        var simbolos = [
            { nombre: "💎", mult: 30 },
            { nombre: "₿", mult: 15 },
            { nombre: "Ξ", mult: 8 },
            { nombre: "🪙", mult: 3 },
            { nombre: "📈", mult: 2 },
            { nombre: "📉", mult: 2 }
        ];
        
        var r = [];
        for (var i = 0; i < 3; i++) {
            var rand = Math.random() * 100;
            var acum = 0;
            for (var j = 0; j < simbolos.length; j++) {
                acum += 18;
                if (rand < acum) {
                    r.push(simbolos[j]);
                    break;
                }
            }
        }
        
        document.getElementById('slot1').textContent = r[0].nombre;
        document.getElementById('slot2').textContent = r[1].nombre;
        document.getElementById('slot3').textContent = r[2].nombre;
        
        for (var k = 0; k < slots.length; k++) {
            slots[k].classList.remove('spinning');
        }
        
        document.getElementById('tragaperras-balance').textContent = Math.floor(userData.diamonds);
        
        if (r[0].nombre === r[1].nombre && r[1].nombre === r[2].nombre) {
            var mult = r[0].mult;
            if (esPremium()) mult *= 2;
            userData.diamonds += apuesta * mult;
            document.getElementById('tragaperras-result').innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡JACKPOT! x' + mult + ' (+' + (apuesta * mult) + ' 💎)</span>';
            if (navigator.vibrate) navigator.vibrate(100);
        } else {
            document.getElementById('tragaperras-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
        }
        
        actualizarUI();
        saveUserData();
    }, 400);
}

function jugarDados(eleccion) {
    var apuesta = apuestaActual.dados;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('dados')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('dados');
    
    var d1 = Math.floor(Math.random() * 6) + 1;
    var d2 = Math.floor(Math.random() * 6) + 1;
    var caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    document.getElementById('dado1').classList.add('rolling');
    document.getElementById('dado2').classList.add('rolling');
    
    setTimeout(function() {
        document.getElementById('dado1').textContent = caras[d1 - 1];
        document.getElementById('dado2').textContent = caras[d2 - 1];
        document.getElementById('dado1').classList.remove('rolling');
        document.getElementById('dado2').classList.remove('rolling');
        
        var suma = d1 + d2;
        document.getElementById('dados-suma').textContent = 'Suma: ' + suma;
        document.getElementById('dados-balance').textContent = Math.floor(userData.diamonds);
        
        var gana = (eleccion === 'menor' && suma >= 2 && suma <= 6) ||
                   (eleccion === 'mayor' && suma >= 8 && suma <= 12) ||
                   (eleccion === 'exacto' && suma === 7);
        
        if (gana) {
            var ganancia = eleccion === 'exacto' ? apuesta * 5 : apuesta * 2;
            if (esPremium()) ganancia *= 2;
            userData.diamonds += ganancia;
            document.getElementById('dados-result').innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
            if (navigator.vibrate) navigator.vibrate(50);
        } else {
            document.getElementById('dados-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
        }
        
        actualizarUI();
        saveUserData();
    }, 400);
}

function crearCamarasRuletaRusa() {
    var grid = document.getElementById('ruletarusa-camaras');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 6; i++) {
        var btn = document.createElement('button');
        btn.textContent = i;
        btn.style.cssText = 'background:var(--bg-elevated);border:2px solid #ef4444;border-radius:16px;padding:16px;color:white;font-weight:700;font-size:20px;cursor:pointer;';
        btn.onclick = (function(num) { return function() { jugarRuletaRusa(num); }; })(i);
        grid.appendChild(btn);
    }
}

function jugarRuletaRusa(camara) {
    var apuesta = apuestaActual.ruletarusa;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('ruletarusa')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('ruletarusa');
    
    var bala = Math.floor(Math.random() * 6) + 1;
    var gana = camara !== bala;
    
    document.getElementById('ruletarusa-emoji').textContent = gana ? '🎉' : '💥';
    document.getElementById('ruletarusa-balance').textContent = Math.floor(userData.diamonds);
    
    if (gana) {
        var ganancia = apuesta * 3;
        userData.diamonds += ganancia;
        document.getElementById('ruletarusa-result').innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡SOBREVIVISTE! +' + ganancia + ' 💎</span>';
        if (navigator.vibrate) navigator.vibrate(100);
    } else {
        document.getElementById('ruletarusa-result').innerHTML = '<span style="color:#ef4444;font-size:20px;">💥 La bala estaba en ' + bala + '</span>';
        if (navigator.vibrate) navigator.vibrate(200);
    }
    
    actualizarUI();
    saveUserData();
    crearCamarasRuletaRusa();
}

// ==========================================
// EDIFICIOS Y MEJORAS
// ==========================================
function openBuilding(building) {
    closeAll();
    var modalId = 'modal' + building.charAt(0).toUpperCase() + building.slice(1);
    document.getElementById(modalId).style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    actualizarPanelMejora(building);
    
    if (building === 'escuela') iniciarJuegoEscuela();
    else if (building === 'fabrica') iniciarJuegoFabrica();
    else if (building === 'piscina') iniciarJuegoPiscina();
    else if (building === 'hospital') iniciarJuegoHospital();
}

function actualizarPanelMejora(building) {
    var level = userData['lvl_' + building] || 0;
    var producciones = { escuela: 15, fabrica: 25, piscina: 10, hospital: 18 };
    var precios = { escuela: 500, fabrica: 1500, piscina: 800, hospital: 1200 };
    var produccion = level * producciones[building];
    var precio = Math.floor(precios[building] * Math.pow(1.12, level));
    
    document.getElementById(building + '-level').textContent = level;
    document.getElementById(building + '-prod').textContent = produccion + ' 💎/h';
    document.getElementById(building + '-price').textContent = precio.toLocaleString() + ' 💎';
    
    var btn = document.getElementById(building + '-btn');
    if (btn) {
        btn.disabled = userData.diamonds < precio;
        btn.textContent = userData.diamonds < precio ? '💎 INSUFICIENTE' : 'MEJORAR (' + precio.toLocaleString() + ' 💎)';
    }
}

function buyUpgrade(building) {
    var precios = { escuela: 500, fabrica: 1500, piscina: 800, hospital: 1200 };
    var level = userData['lvl_' + building] || 0;
    var precio = Math.floor(precios[building] * Math.pow(1.12, level));
    
    if (userData.diamonds < precio) return alert('❌ Insuficientes diamantes');
    userData['lvl_' + building]++;
    userData.diamonds -= precio;
    saveUserData();
    actualizarUI();
    actualizarPanelMejora(building);
    alert('✅ ' + building + ' mejorado a nivel ' + userData['lvl_' + building] + '!');
}

function switchTab(building, tab) {
    var upgradePanel = document.getElementById(building + '-upgrade-panel');
    var gamePanel = document.getElementById(building + '-game-panel');
    var tabs = document.querySelectorAll('#modal' + building.charAt(0).toUpperCase() + building.slice(1) + ' .tab');
    
    if (tab === 'game') {
        upgradePanel.classList.add('hidden');
        gamePanel.classList.remove('hidden');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    } else {
        upgradePanel.classList.remove('hidden');
        gamePanel.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

// ==========================================
// SISTEMA DE VIDAS
// ==========================================
function updateLivesUI(game) {
    var container = document.getElementById(game + '-lives');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < 3; i++) {
        var lifeDiv = document.createElement('div');
        lifeDiv.className = 'life' + (i < gameLives[game] ? ' active' : '');
        lifeDiv.innerHTML = i < gameLives[game] ? '❤️' : '🖤';
        container.appendChild(lifeDiv);
    }
    var reviveBtn = document.getElementById(game + '-revive');
    if (reviveBtn) reviveBtn.style.display = gameLives[game] === 0 ? 'block' : 'none';
}

function loseLife(game) {
    gameLives[game]--;
    updateLivesUI(game);
    if (gameLives[game] === 0) {
        gameActiveStates[game] = false;
        var resultId = game === 'escuela' ? 'mem' : game === 'fabrica' ? 'asm' : game === 'piscina' ? 'jump' : 'surgery';
        var resultElem = document.getElementById(resultId + '-result');
        if (resultElem) resultElem.innerHTML = '<span style="color:#ef4444;font-size:20px;">💀 GAME OVER</span>';
        if (navigator.vibrate) navigator.vibrate(200);
        return false;
    }
    if (navigator.vibrate) navigator.vibrate(50);
    return true;
}

function reviveGame(game) {
    if (gameLives[game] > 0) return;
    showRewardedAd(function(success) {
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
    showRewardedAd(function(s) {
        if (s) {
            pendingMultiplier = 2;
            alert('✨ Multiplicador x2 activado!');
        }
    });
}

// ==========================================
// MINIJUEGO 1: ESCUELA - MENTE MAESTRA
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
    document.getElementById('mem-result').innerHTML = '';
    nuevaSecuenciaEscuela();
}

function nuevaSecuenciaEscuela() {
    if (!gameActiveStates.escuela) return;
    escuelaSequence = [];
    escuelaUserInput = [];
    var length = Math.min(3 + Math.floor(escuelaLevel / 20), 10);
    for (var i = 0; i < length; i++) {
        escuelaSequence.push(Math.floor(Math.random() * 16) + 1);
    }
    mostrarSecuenciaEscuela();
}

function mostrarSecuenciaEscuela() {
    var display = document.getElementById('sequence-display');
    if (!display) return;
    display.innerHTML = '';
    document.getElementById('pupitres-grid').innerHTML = '';
    var i = 0;
    function showNext() {
        if (i >= escuelaSequence.length) {
            crearPupitres();
            return;
        }
        display.innerHTML = '';
        var card = document.createElement('div');
        card.className = 'sequence-card highlight';
        card.textContent = escuelaSequence[i];
        display.appendChild(card);
        i++;
        setTimeout(showNext, 500);
    }
    showNext();
}

function crearPupitres() {
    var grid = document.getElementById('pupitres-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 16; i++) {
        var btn = document.createElement('div');
        btn.className = 'pupitre';
        btn.textContent = i;
        btn.onclick = (function(num) { return function() { seleccionarPupitre(num); }; })(i);
        grid.appendChild(btn);
    }
}

function seleccionarPupitre(num) {
    if (!gameActiveStates.escuela) return;
    escuelaUserInput.push(num);
    var idx = escuelaUserInput.length - 1;
    
    var pupitres = document.querySelectorAll('.pupitre');
    if (pupitres[num - 1]) {
        pupitres[num - 1].style.background = 'linear-gradient(145deg, var(--color-escuela), #d97706)';
        setTimeout(function() {
            if (pupitres[num - 1]) pupitres[num - 1].style.background = '';
        }, 200);
    }
    
    if (escuelaUserInput[idx] !== escuelaSequence[idx]) {
        if (!loseLife('escuela')) return;
        escuelaUserInput = [];
        document.getElementById('mem-result').innerHTML = '<span style="color:#ef4444;">❌ Secuencia incorrecta</span>';
        setTimeout(function() { nuevaSecuenciaEscuela(); }, 1500);
        return;
    }
    
    if (escuelaUserInput.length === escuelaSequence.length) {
        var reward = calcularRecompensa(5, 'escuela');
        userData.diamonds += reward;
        escuelaLevel++;
        if (escuelaLevel > escuelaBest) {
            escuelaBest = escuelaLevel;
            userData.gameStats.escuela.bestLevel = escuelaBest;
            document.getElementById('mem-best').textContent = escuelaBest;
        }
        userData.gameStats.escuela.currentLevel = escuelaLevel;
        userData.gameStats.escuela.totalWins = (userData.gameStats.escuela.totalWins || 0) + 1;
        userData.gameStats.escuela.lives = gameLives.escuela;
        document.getElementById('mem-level').textContent = escuelaLevel;
        document.getElementById('escuela-game-level').textContent = escuelaLevel;
        document.getElementById('mem-result').innerHTML = '<span style="color:#4ade80;font-size:18px;animation:winPulse 0.5s ease;">✅ +' + reward + ' 💎! Nivel ' + escuelaLevel + '</span>';
        actualizarUI();
        actualizarPanelMejora('escuela');
        saveUserData();
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(function() {
            document.getElementById('mem-result').innerHTML = '';
            nuevaSecuenciaEscuela();
        }, 2000);
    }
}

// ==========================================
// MINIJUEGO 2: FÁBRICA - LÍNEA DE ENSAMBLAJE
// ==========================================
function iniciarJuegoFabrica() {
    gameActiveStates.fabrica = true;
    fabricaLevel = userData.gameStats.fabrica.currentLevel || 1;
    fabricaBest = userData.gameStats.fabrica.bestLevel || 0;
    fabricaCompleted = 0;
    fabricaRequired = Math.min(3 + Math.floor(fabricaLevel / 25), 15);
    gameLives.fabrica = userData.gameStats.fabrica.lives || 3;
    updateLivesUI('fabrica');
    document.getElementById('asm-completed').textContent = fabricaCompleted;
    document.getElementById('asm-required').textContent = fabricaRequired;
    document.getElementById('asm-best').textContent = fabricaBest;
    document.getElementById('fabrica-game-level').textContent = fabricaLevel;
    document.getElementById('asm-result').innerHTML = '';
    iniciarCinta();
}

function iniciarCinta() {
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    fabricaPosition = -30;
    fabricaIsDefect = Math.random() < Math.min(0.25, fabricaLevel / 200);
    var piece = document.getElementById('moving-piece');
    if (piece) {
        piece.textContent = fabricaIsDefect ? '💢' : '🔧';
        piece.style.left = fabricaPosition + '%';
    }
    
    var speed = Math.max(1.2, 6 - Math.floor(fabricaLevel / 80));
    fabricaAnimInterval = setInterval(function() {
        if (!gameActiveStates.fabrica) return;
        fabricaPosition += speed;
        if (fabricaPosition > 130) {
            if (!fabricaIsDefect) {
                if (!loseLife('fabrica')) {
                    clearInterval(fabricaAnimInterval);
                    return;
                }
            }
            fabricaPosition = -30;
            fabricaIsDefect = Math.random() < Math.min(0.25, fabricaLevel / 200);
            var p = document.getElementById('moving-piece');
            if (p) {
                p.textContent = fabricaIsDefect ? '💢' : '🔧';
                p.style.left = fabricaPosition + '%';
            }
        }
        var p = document.getElementById('moving-piece');
        if (p) p.style.left = fabricaPosition + '%';
    }, 30);
}

function checkFabricaHit() {
    if (!gameActiveStates.fabrica) return;
    if (fabricaPosition > 25 && fabricaPosition < 75) {
        if (fabricaIsDefect) {
            if (!loseLife('fabrica')) return;
            document.getElementById('asm-result').innerHTML = '<span style="color:#ef4444;">⚠️ Pieza defectuosa!</span>';
        } else {
            fabricaCompleted++;
            document.getElementById('asm-completed').textContent = fabricaCompleted;
            document.getElementById('asm-result').innerHTML = '<span style="color:#4ade80;">✅ +1 pieza!</span>';
            
            if (fabricaCompleted >= fabricaRequired) {
                var reward = calcularRecompensa(8, 'fabrica');
                userData.diamonds += reward;
                fabricaLevel++;
                if (fabricaLevel > fabricaBest) {
                    fabricaBest = fabricaLevel;
                    userData.gameStats.fabrica.bestLevel = fabricaBest;
                    document.getElementById('asm-best').textContent = fabricaBest;
                }
                userData.gameStats.fabrica.currentLevel = fabricaLevel;
                userData.gameStats.fabrica.totalWins = (userData.gameStats.fabrica.totalWins || 0) + 1;
                userData.gameStats.fabrica.lives = gameLives.fabrica;
                document.getElementById('fabrica-game-level').textContent = fabricaLevel;
                document.getElementById('asm-result').innerHTML = '<span style="color:#4ade80;font-size:18px;animation:winPulse 0.5s ease;">✅ Nivel completado! +' + reward + ' 💎</span>';
                actualizarUI();
                actualizarPanelMejora('fabrica');
                saveUserData();
                if (navigator.vibrate) navigator.vibrate(100);
                clearInterval(fabricaAnimInterval);
                setTimeout(function() { iniciarJuegoFabrica(); }, 2000);
                return;
            }
        }
    } else {
        if (!loseLife('fabrica')) return;
        document.getElementById('asm-result').innerHTML = '<span style="color:#ef4444;">❌ Fallaste!</span>';
    }
    
    setTimeout(function() {
        document.getElementById('asm-result').innerHTML = '';
        fabricaPosition = -30;
        fabricaIsDefect = Math.random() < Math.min(0.25, fabricaLevel / 200);
        var p = document.getElementById('moving-piece');
        if (p) {
            p.textContent = fabricaIsDefect ? '💢' : '🔧';
            p.style.left = fabricaPosition + '%';
        }
    }, 800);
}

// ==========================================
// MINIJUEGO 3: PISCINA - SALTO DE PRECISIÓN
// ==========================================
function iniciarJuegoPiscina() {
    gameActiveStates.piscina = true;
    piscinaLevel = userData.gameStats.piscina.currentLevel || 1;
    piscinaBest = userData.gameStats.piscina.bestLevel || 0;
    piscinaPerfect = 0;
    piscinaRequired = Math.min(3 + Math.floor(piscinaLevel / 40), 8);
    gameLives.piscina = userData.gameStats.piscina.lives || 3;
    updateLivesUI('piscina');
    document.getElementById('jump-perfect').textContent = piscinaPerfect;
    document.getElementById('jump-required').textContent = piscinaRequired;
    document.getElementById('jump-best').textContent = piscinaBest;
    document.getElementById('piscina-game-level').textContent = piscinaLevel;
    document.getElementById('jump-result').innerHTML = '';
    piscinaPower = 0;
    piscinaHoldStart = 0;
    document.getElementById('power-fill').style.width = '0%';
}

function startSlingshot(e) {
    if (!gameActiveStates.piscina) return;
    e.preventDefault();
    piscinaHoldStart = Date.now();
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    piscinaChargeInterval = setInterval(function() {
        var elapsed = Date.now() - piscinaHoldStart;
        piscinaPower = Math.min(100, elapsed / 15);
        document.getElementById('power-fill').style.width = piscinaPower + '%';
    }, 30);
}

function releaseSlingshot() {
    if (!gameActiveStates.piscina || piscinaHoldStart === 0) return;
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    var holdDuration = Date.now() - piscinaHoldStart;
    piscinaPower = Math.min(100, holdDuration / 15);
    piscinaHoldStart = 0;
    
    document.getElementById('power-fill').style.width = '0%';
    
    var isPerfect = piscinaPower > 38 && piscinaPower < 62;
    
    if (isPerfect) {
        piscinaPerfect++;
        document.getElementById('jump-perfect').textContent = piscinaPerfect;
        document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;">🎯 ¡Salto perfecto!</span>';
        
        if (piscinaPerfect >= piscinaRequired) {
            var reward = calcularRecompensa(6, 'piscina');
            userData.diamonds += reward;
            piscinaLevel++;
            if (piscinaLevel > piscinaBest) {
                piscinaBest = piscinaLevel;
                userData.gameStats.piscina.bestLevel = piscinaBest;
                document.getElementById('jump-best').textContent = piscinaBest;
            }
            userData.gameStats.piscina.currentLevel = piscinaLevel;
            userData.gameStats.piscina.totalWins = (userData.gameStats.piscina.totalWins || 0) + 1;
            userData.gameStats.piscina.lives = gameLives.piscina;
            document.getElementById('piscina-game-level').textContent = piscinaLevel;
            document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;font-size:18px;animation:winPulse 0.5s ease;">✅ Nivel completado! +' + reward + ' 💎</span>';
            piscinaPerfect = 0;
            document.getElementById('jump-perfect').textContent = '0';
            actualizarUI();
            actualizarPanelMejora('piscina');
            saveUserData();
            if (navigator.vibrate) navigator.vibrate(100);
            setTimeout(function() { iniciarJuegoPiscina(); }, 2000);
        } else {
            if (navigator.vibrate) navigator.vibrate(50);
        }
    } else {
        loseLife('piscina');
        document.getElementById('jump-result').innerHTML = '<span style="color:#ef4444;">💧 Fallaste (Potencia: ' + Math.floor(piscinaPower) + '%)</span>';
    }
    
    piscinaPower = 0;
    setTimeout(function() {
        document.getElementById('jump-result').innerHTML = '';
    }, 1500);
}

// ==========================================
// MINIJUEGO 4: HOSPITAL - CIRUGÍA DE EMERGENCIA
// ==========================================
function iniciarJuegoHospital() {
    gameActiveStates.hospital = true;
    hospitalLevel = userData.gameStats.hospital.currentLevel || 1;
    hospitalBest = userData.gameStats.hospital.bestLevel || 0;
    hospitalExtracted = 0;
    hospitalTotal = Math.min(3 + Math.floor(hospitalLevel / 40), 8);
    gameLives.hospital = userData.gameStats.hospital.lives || 3;
    updateLivesUI('hospital');
    document.getElementById('virus-extracted').textContent = hospitalExtracted;
    document.getElementById('virus-total').textContent = hospitalTotal;
    document.getElementById('surgery-best').textContent = hospitalBest;
    document.getElementById('hospital-game-level').textContent = hospitalLevel;
    document.getElementById('surgery-result').innerHTML = '';
    
    hospitalTimeLeft = 20 + Math.floor(hospitalLevel / 15);
    document.getElementById('time-fill').style.width = '100%';
    
    if (hospitalTimer) clearInterval(hospitalTimer);
    hospitalTimer = setInterval(function() {
        if (!gameActiveStates.hospital) return;
        hospitalTimeLeft -= 0.1;
        var percent = (hospitalTimeLeft / (20 + Math.floor(hospitalLevel / 15))) * 100;
        document.getElementById('time-fill').style.width = Math.max(0, percent) + '%';
        if (hospitalTimeLeft <= 0) {
            clearInterval(hospitalTimer);
            loseLife('hospital');
            document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⏰ Tiempo agotado</span>';
            setTimeout(function() { iniciarJuegoHospital(); }, 2000);
        }
    }, 100);
    
    crearVirusHospital();
}

function crearVirusHospital() {
    var area = document.getElementById('surgery-area');
    if (!area) return;
    area.innerHTML = '';
    
    var colores = ['🦠', '🦠', '🦠', '🦠', '🦠'];
    
    for (var i = 0; i < hospitalTotal; i++) {
        var virus = document.createElement('div');
        virus.className = 'virus-sprite';
        virus.textContent = colores[i % colores.length];
        virus.style.left = (8 + Math.random() * 78) + '%';
        virus.style.top = (8 + Math.random() * 78) + '%';
        virus.style.animationDelay = (Math.random() * 2) + 's';
        
        virus.onclick = function(e) {
            e.stopPropagation();
            if (!gameActiveStates.hospital) return;
            hospitalExtracted++;
            document.getElementById('virus-extracted').textContent = hospitalExtracted;
            this.style.transform = 'scale(0)';
            this.style.opacity = '0';
            var self = this;
            setTimeout(function() { self.remove(); }, 200);
            
            if (hospitalExtracted >= hospitalTotal) {
                clearInterval(hospitalTimer);
                var reward = calcularRecompensa(7, 'hospital');
                userData.diamonds += reward;
                hospitalLevel++;
                if (hospitalLevel > hospitalBest) {
                    hospitalBest = hospitalLevel;
                    userData.gameStats.hospital.bestLevel = hospitalBest;
                    document.getElementById('surgery-best').textContent = hospitalBest;
                }
                userData.gameStats.hospital.currentLevel = hospitalLevel;
                userData.gameStats.hospital.totalWins = (userData.gameStats.hospital.totalWins || 0) + 1;
                userData.gameStats.hospital.lives = gameLives.hospital;
                document.getElementById('hospital-game-level').textContent = hospitalLevel;
                document.getElementById('surgery-result').innerHTML = '<span style="color:#4ade80;font-size:18px;animation:winPulse 0.5s ease;">✅ Cirugía exitosa! +' + reward + ' 💎</span>';
                actualizarUI();
                actualizarPanelMejora('hospital');
                saveUserData();
                if (navigator.vibrate) navigator.vibrate(100);
                setTimeout(function() { iniciarJuegoHospital(); }, 2000);
            }
        };
        
        virus.onmouseenter = function() { this.style.transform = 'scale(1.3)'; };
        virus.onmouseleave = function() { this.style.transform = 'scale(1)'; };
        
        area.appendChild(virus);
    }
}

// ==========================================
// RANKING Y POOL
// ==========================================
async function updateRankingAndPool() {
    try {
        var result = await _supabase.from('game_data').select('telegram_id, diamonds').neq('telegram_id', 'MASTER');
        if (!result.error && result.data) {
            globalPoolData.user_rankings = result.data.map(function(u) {
                return { id: u.telegram_id, diamonds: Number(u.diamonds) || 0 };
            }).sort(function(a, b) { return b.diamonds - a.diamonds; });
        }
        
        var posicion = globalPoolData.user_rankings.findIndex(function(u) { return u.id === userData.id; });
        if (posicion !== -1) {
            if (posicion < 3) userData.rank = "Diamante";
            else if (posicion < 10) userData.rank = "Oro";
            else if (posicion < 50) userData.rank = "Plata";
            else userData.rank = "Ciudadano";
            userData.weekly_rank = posicion + 1;
        }
        
        var poolUsuarios = globalPoolData.pool_ton * 0.8 * RESERVA_POOL;
        if (posicion < 3) userData.projectedReward = (poolUsuarios * 0.4) / 3;
        else if (posicion < 10) userData.projectedReward = (poolUsuarios * 0.25) / 7;
        else if (posicion < 50) userData.projectedReward = (poolUsuarios * 0.20) / 40;
        else {
            var ciudadanos = globalPoolData.user_rankings.slice(50);
            var totalDiamantesCiudadanos = ciudadanos.reduce(function(sum, u) { return sum + u.diamonds; }, 0);
            if (totalDiamantesCiudadanos > 0 && userData.diamonds > 0) {
                userData.projectedReward = (poolUsuarios * 0.15) * (userData.diamonds / totalDiamantesCiudadanos);
            }
        }
    } catch(e) {
        console.error("Error ranking:", e);
    }
}

async function updateRealPoolBalance() {
    try {
        var response = await fetch('https://tonapi.io/v2/accounts/' + BILLETERA_POOL, {
            headers: { 'Authorization': 'Bearer ' + TON_API_KEY }
        });
        if (response.ok) {
            var data = await response.json();
            globalPoolData.pool_ton = (data.balance || 0) / 1000000000;
        }
    } catch(e) {
        console.error(e);
    }
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
            event_progress: userData.event_progress || {},
            accumulated_ton: userData.accumulated_ton || 0,
            retiradoHoy: userData.retiradoHoy || 0,
            gameStats: userData.gameStats,
            referral_earnings: userData.referral_earnings || 0,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue
        }).eq('telegram_id', userData.id);
        console.log('💾 Datos guardados');
    } catch(e) {
        console.error('Error guardando:', e);
    }
}

async function loadUserFromDB(tgId) {
    var result = await _supabase.from('game_data').select('*').eq('telegram_id', tgId.toString()).maybeSingle();
    if (result.error) {
        console.error(result.error);
        return;
    }
    
    if (!result.data) {
        var nuevo = {
            telegram_id: tgId.toString(),
            username: userData.username,
            diamonds: 0,
            lvl_piscina: 0,
            lvl_fabrica: 0,
            lvl_escuela: 0,
            lvl_hospital: 0,
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
        userData = Object.assign({}, userData, nuevo, { id: tgId.toString() });
    } else {
        var data = result.data;
        userData = Object.assign({}, userData, data, {
            id: tgId.toString(),
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
            referral_code: data.referral_code || 'REF' + tgId.toString().slice(-6),
            last_ad_watch: data.last_ad_watch || null,
            last_casino_rescue: data.last_casino_rescue || null,
            gameStats: data.gameStats || {
                escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
            }
        });
    }
    document.getElementById('user-display').textContent = userData.username;
    actualizarUI();
    actualizarPremiumUI();
}

// ==========================================
// PRODUCCIÓN
// ==========================================
function startProduction() {
    setInterval(function() {
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
    
    var user = tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    if (user) {
        userData.id = user.id.toString();
        userData.username = user.first_name || 'Usuario';
        document.getElementById('user-display').textContent = userData.username;
        await loadUserFromDB(user.id);
    } else {
        userData.id = 'test_' + Date.now();
        userData.username = 'Usuario Test';
        userData.referral_code = 'REF' + userData.id.slice(-6);
        document.getElementById('user-display').textContent = userData.username;
    }
    
    await initTONConnect();
    setTimeout(initAds, 3000);
    await updateRealPoolBalance();
    await updateRankingAndPool();
    startProduction();
    actualizarEventosUI();
    
    setInterval(saveUserData, 15000);
    setInterval(async function() {
        await updateRankingAndPool();
        actualizarEventosUI();
    }, 60000);
    
    window.addEventListener('beforeunload', function() {
        saveUserData();
    });
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
window.claimDailyReward = claimDailyReward;
window.showAd = showAd;
window.rescueWithAd = rescueWithAd;
window.comprarPremium = comprarPremium;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.disconnectWallet = disconnectWallet;
window.switchBancoTab = switchBancoTab;
window.cambiarVentaDiamonds = cambiarVentaDiamonds;
window.venderDiamantes = venderDiamantes;
window.startEventTask = startEventTask;
window.reviveGame = reviveGame;
window.useAdMultiplier = useAdMultiplier;
window.switchTab = switchTab;
window.checkFabricaHit = checkFabricaHit;
window.startSlingshot = startSlingshot;
window.releaseSlingshot = releaseSlingshot;

console.log('✅ TON CITY - Completamente iniciado');