// ======================================================
// TON CITY - VERSIÓN FINAL COMPLETA 2026
// ======================================================
console.log('🚀 TON CITY - Iniciando sistema profesional...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
    RED_TON_FEE: 0.002,
    RESERVA_POOL: 0.95,
    BILLETERA_PROPIETARIO: "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw",
    BILLETERA_POOL: "UQBuoEgT5DmcoEQ_nl6YwR0Q86fZWY4baACuX80EegWG49h2",
    PRECIO_COMPRA: 0.008,
    ADSGRAM_BLOCK_ID: '23186',
    TON_API_KEY: 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ',
    SUPABASE_URL: 'https://xkkifqxxglcuyruwkbih.supabase.co',
    SUPABASE_KEY: 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE'
};

const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ==========================================
// VARIABLES GLOBALES
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
        highlow: 0,
        ruleta: 0,
        tragaperras: 0,
        dados: 0,
        ruletarusa: 0,
        loteria: 0,
        fecha: new Date().toDateString()
    }
};

let globalPoolData = {
    pool_ton: 100,
    total_diamonds: 0,
    user_rankings: []
};

// ==========================================
// CONSTANTES
// ==========================================
const EVENTOS_SEMANALES = [
    { nombre: "Escuela", edificio: "escuela", emoji: "🏫", color: "#fbbf24", descripcion: "Semana del Saber - x2 en Escuela (x4 Premium)", gameMultiplier: 2 },
    { nombre: "Fábrica", edificio: "fabrica", emoji: "🏭", color: "#a78bfa", descripcion: "Semana de Producción - x2 en Fábrica (x4 Premium)", gameMultiplier: 2 },
    { nombre: "Piscina", edificio: "piscina", emoji: "🏊", color: "#38bdf8", descripcion: "Semana Olímpica - x2 en Piscina (x4 Premium)", gameMultiplier: 2 },
    { nombre: "Hospital", edificio: "hospital", emoji: "🏥", color: "#f87171", descripcion: "Semana de la Salud - x2 en Hospital (x4 Premium)", gameMultiplier: 2 }
];

const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

// ==========================================
// VARIABLES DE JUEGO
// ==========================================
let apuestaActual = {
    highlow: 10,
    ruleta: 10,
    tragaperras: 5,
    dados: 10,
    ruletarusa: 10,
    loteria: 1
};

let boletosComprados = [];

let gameLives = {
    escuela: 3,
    fabrica: 3,
    piscina: 3,
    hospital: 3
};

let gameActiveStates = {
    escuela: false,
    fabrica: false,
    piscina: false,
    hospital: false
};

// Variables Escuela
let escuelaSequence = [];
let escuelaUserInput = [];
let escuelaLevel = 1;
let escuelaBest = 0;
let escuelaStreak = 0;

// Variables Fábrica
let fabricaLevel = 1;
let fabricaBest = 0;
let fabricaCompleted = 0;
let fabricaRequired = 5;
let fabricaPieces = [];
let fabricaAnimInterval = null;

// Variables Piscina
let piscinaLevel = 1;
let piscinaBest = 0;
let piscinaPerfect = 0;
let piscinaRequired = 3;
let piscinaPower = 0;
let piscinaHoldStart = 0;
let piscinaChargeInterval = null;
let piscinaGameStarted = false;

// Variables Hospital
let hospitalLevel = 1;
let hospitalBest = 0;
let hospitalExtracted = 0;
let hospitalTotal = 3;
let hospitalTimeLeft = 25;
let hospitalTimer = null;
let hospitalMaxTime = 25;

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
    const semana = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
    const indice = semana % EVENTOS_SEMANALES.length;
    return EVENTOS_SEMANALES[indice];
}

function actualizarEventosUI() {
    const evento = getEventoActual();
    const banner = document.getElementById('event-banner');
    if (banner) {
        banner.style.display = 'flex';
        const tituloBanner = document.getElementById('event-banner-title');
        const subtituloBanner = document.getElementById('event-banner-subtitle');
        if (tituloBanner) tituloBanner.textContent = evento.nombre;
        if (subtituloBanner) subtituloBanner.textContent = '¡x' + (esPremium() ? 4 : 2) + ' en ' + evento.nombre + '!';
    }
    document.querySelectorAll('.building-card').forEach(function(card) {
        card.classList.remove('event-active');
    });
    const card = document.querySelector('.building-card.' + evento.edificio);
    if (card) card.classList.add('event-active');
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
    let base = (userData.lvl_escuela * 15) + (userData.lvl_fabrica * 25) + (userData.lvl_piscina * 10) + (userData.lvl_hospital * 18);
    if (esPremium()) base = base * 2;
    return base;
}

function calcularRecompensa(baseReward, building) {
    const nivelEdificio = userData['lvl_' + building] || 0;
    const multiplierNivel = 1 + (nivelEdificio * 0.005);
    const multiplierPremium = esPremium() ? 2 : 1;
    const evento = getEventoActual();
    const multiplierEvento = (evento.edificio === building) ? (esPremium() ? 4 : 2) : 1;
    let multiplier = multiplierNivel * multiplierPremium * multiplierEvento;
    if (pendingMultiplier) {
        multiplier = multiplier * pendingMultiplier;
        pendingMultiplier = null;
    }
    return Math.floor(baseReward * multiplier);
}

function actualizarUI() {
    const diamElem = document.getElementById('diamonds');
    if (diamElem) diamElem.textContent = Math.floor(userData.diamonds || 0);
    const rateElem = document.getElementById('rate');
    if (rateElem) rateElem.textContent = Math.floor(getTotalProduction());
    const lvlPiscina = document.getElementById('lvl_piscina');
    if (lvlPiscina) lvlPiscina.textContent = userData.lvl_piscina;
    const lvlFabrica = document.getElementById('lvl_fabrica');
    if (lvlFabrica) lvlFabrica.textContent = userData.lvl_fabrica;
    const lvlEscuela = document.getElementById('lvl_escuela');
    if (lvlEscuela) lvlEscuela.textContent = userData.lvl_escuela;
    const lvlHospital = document.getElementById('lvl_hospital');
    if (lvlHospital) lvlHospital.textContent = userData.lvl_hospital;
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = userData.username || 'Usuario';
    const casinoSaldo = document.getElementById('casino-saldo');
    if (casinoSaldo) casinoSaldo.textContent = Math.floor(userData.diamonds);
    const casinoRescue = document.getElementById('casino-rescue');
    if (casinoRescue) casinoRescue.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
}

function showModal(id) {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById(id);
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'block';
}

function closeAll() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    const modals = [
        'modalPerfil', 'modalFriends', 'modalRanking', 'modalBank', 'modalStore',
        'modalCasino', 'modalHighLow', 'modalRuleta', 'modalTragaperras', 'modalDados',
        'modalRuletaRusa', 'modalEscuela', 'modalFabrica', 'modalPiscina', 'modalHospital',
        'modalEvent', 'modalDailyReward', 'modalAds'
    ];
    modals.forEach(function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    });
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    if (hospitalTimer) clearInterval(hospitalTimer);
    gameActiveStates.escuela = false;
    gameActiveStates.fabrica = false;
    gameActiveStates.piscina = false;
    gameActiveStates.hospital = false;
    setActiveNav('perfil');
}

function setActiveNav(tab) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item, index) {
        item.classList.remove('active');
        if (tab === 'perfil' && index === 0) item.classList.add('active');
        if (tab === 'amigos' && index === 1) item.classList.add('active');
        if (tab === 'ranking' && index === 2) item.classList.add('active');
    });
}

function spawnConfetti() {
    const colores = ['#facc15', '#4ade80', '#38bdf8', '#f472b6', '#a78bfa', '#f97316', '#ef4444', '#34d399'];
    for (let i = 0; i < 40; i++) {
        const pieza = document.createElement('div');
        pieza.style.cssText = 'position:fixed;width:' + (6 + Math.random() * 10) + 'px;height:' + (6 + Math.random() * 10) + 'px;z-index:9999;pointer-events:none;left:' + Math.random() * 100 + '%;top:' + (Math.random() * 50 + 20) + '%;background:' + colores[Math.floor(Math.random() * colores.length)] + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';animation:confetti ' + (1 + Math.random() * 2) + 's ease forwards;animation-delay:' + Math.random() * 0.5 + 's;';
        document.body.appendChild(pieza);
        setTimeout(function() { if (pieza.parentNode) pieza.parentNode.removeChild(pieza); }, 3000);
    }
}

// ==========================================
// PERFIL
// ==========================================
function openPerfil() {
    closeAll();
    actualizarPerfil();
    showModal('modalPerfil');
    setActiveNav('perfil');
}

function actualizarPerfil() {
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    let nombre = 'Usuario';
    if (usuario && usuario.first_name) nombre = usuario.first_name;
    else if (userData.username && userData.username !== 'Cargando...') nombre = userData.username;
    const nombreElem = document.getElementById('perfil-name');
    if (nombreElem) nombreElem.textContent = nombre;
    const avatarElem = document.getElementById('perfil-avatar');
    if (avatarElem) {
        if (usuario && usuario.photo_url) avatarElem.innerHTML = '<img src="' + usuario.photo_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        else avatarElem.innerHTML = nombre.charAt(0).toUpperCase();
    }
    const diamantesElem = document.getElementById('perfil-diamonds');
    if (diamantesElem) diamantesElem.textContent = Math.floor(userData.diamonds || 0);
    const rateElem = document.getElementById('perfil-rate');
    if (rateElem) rateElem.textContent = Math.floor(getTotalProduction());
    const piscinaElem = document.getElementById('perfil-piscina');
    if (piscinaElem) piscinaElem.textContent = 'Nivel ' + (userData.lvl_piscina || 0);
    const fabricaElem = document.getElementById('perfil-fabrica');
    if (fabricaElem) fabricaElem.textContent = 'Nivel ' + (userData.lvl_fabrica || 0);
    const escuelaElem = document.getElementById('perfil-escuela');
    if (escuelaElem) escuelaElem.textContent = 'Nivel ' + (userData.lvl_escuela || 0);
    const hospitalElem = document.getElementById('perfil-hospital');
    if (hospitalElem) hospitalElem.textContent = 'Nivel ' + (userData.lvl_hospital || 0);
    const amigosElem = document.getElementById('perfil-amigos');
    if (amigosElem) amigosElem.textContent = (userData.referred_users || []).length;
    const rangoElem = document.getElementById('perfil-rango-display');
    if (rangoElem) rangoElem.textContent = userData.rank || 'Ciudadano';
    const proyeccionElem = document.getElementById('perfil-proyeccion');
    if (proyeccionElem) proyeccionElem.textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
    const premiumElem = document.getElementById('perfil-premium');
    if (premiumElem) premiumElem.textContent = esPremium() ? 'Sí ⭐' : 'No';
    const rankBadgeElem = document.getElementById('perfil-rank-badge');
    if (rankBadgeElem) rankBadgeElem.textContent = userData.rank || 'Ciudadano';
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    closeAll();
    const codigoElem = document.getElementById('referral-code');
    if (codigoElem) codigoElem.textContent = userData.referral_code || 'CARGANDO...';
    const countElem = document.getElementById('ref-count');
    if (countElem) countElem.textContent = (userData.referred_users || []).length;
    const totalElem = document.getElementById('ref-total');
    if (totalElem) totalElem.textContent = (userData.referral_earnings || 0) + ' 💎';
    showModal('modalFriends');
    setActiveNav('amigos');
}

function copyReferralCode() {
    if (!userData.referral_code) return alert('❌ Código de referencia no disponible');
    const enlaceCompleto = 'https://t.me/ton_city_bot?start=' + userData.referral_code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(enlaceCompleto).then(function() {
            alert('✅ ¡Enlace copiado!');
        }).catch(function() {
            prompt('Copia este enlace:', enlaceCompleto);
        });
    } else {
        prompt('Copia este enlace:', enlaceCompleto);
    }
}

// ==========================================
// RANKING
// ==========================================
function openRanking() {
    closeAll();
    actualizarRankingModal();
    showModal('modalRanking');
    setActiveNav('ranking');
}

function actualizarRankingModal() {
    const rangoElem = document.getElementById('user-rank-display');
    if (rangoElem) rangoElem.textContent = userData.rank || 'Ciudadano';
    const poolElem = document.getElementById('pool-total-ranking');
    if (poolElem) poolElem.textContent = (globalPoolData.pool_ton || 0).toFixed(4) + ' TON';
    const proyeccionElem = document.getElementById('projected-reward-display');
    if (proyeccionElem) proyeccionElem.textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
}

// ==========================================
// BANCO
// ==========================================
function openBank() {
    closeAll();
    showModal('modalBank');
    switchBancoTab('compra');
    actualizarListaCompra();
}

function actualizarListaCompra() {
    let walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) walletConectada = true;
    const packs = [
        { ton: 0.10, diamonds: 100 },
        { ton: 0.50, diamonds: 500 },
        { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 },
        { ton: 5.00, diamonds: 5000 },
        { ton: 10.00, diamonds: 10000 }
    ];
    const bankList = document.getElementById('bankList');
    if (!bankList) return;
    let html = '';
    for (let i = 0; i < packs.length; i++) {
        const pack = packs[i];
        const botonColor = walletConectada ? '#4ade80' : '#334155';
        const botonTexto = walletConectada ? 'COMPRAR' : 'CONECTAR';
        const botonDisabled = walletConectada ? '' : 'disabled';
        html += '<div style="background:#0f172a;border-radius:12px;padding:16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;">';
        html += '<div><strong>' + pack.ton.toFixed(2) + ' TON</strong><div style="font-size:12px;color:#94a3b8;">+' + pack.diamonds + ' 💎</div></div>';
        html += '<button onclick="comprarTON(' + pack.ton + ')" style="background:' + botonColor + ';border:none;padding:10px 20px;border-radius:30px;color:white;font-weight:700;cursor:pointer;" ' + botonDisabled + '>' + botonTexto + '</button>';
        html += '</div>';
    }
    bankList.innerHTML = html;
}

function switchBancoTab(tab) {
    bancoTabActual = tab;
    const tabs = document.querySelectorAll('.banco-tab');
    tabs.forEach(function(t, index) {
        t.classList.remove('active');
        if (tab === 'compra' && index === 0) t.classList.add('active');
        if (tab === 'venta' && index === 1) t.classList.add('active');
    });
    const compraPanel = document.getElementById('banco-compra-panel');
    const ventaPanel = document.getElementById('banco-venta-panel');
    if (tab === 'compra') {
        if (compraPanel) compraPanel.classList.remove('hidden');
        if (ventaPanel) ventaPanel.classList.add('hidden');
        actualizarListaCompra();
    } else {
        if (compraPanel) compraPanel.classList.add('hidden');
        if (ventaPanel) ventaPanel.classList.remove('hidden');
        actualizarPanelVenta();
    }
}

function actualizarPanelVenta() {
    const diamantesDisponibles = Math.floor(userData.diamonds || 0);
    const poolTotal = globalPoolData.pool_ton || 0;
    const ventaDiamondsElem = document.getElementById('venta-diamonds');
    if (ventaDiamondsElem) ventaDiamondsElem.textContent = diamantesDisponibles;
    const ventaPoolElem = document.getElementById('venta-pool');
    if (ventaPoolElem) ventaPoolElem.textContent = poolTotal.toFixed(4) + ' TON';
    const tasaBase = 10000;
    const poolFactor = Math.max(0.5, Math.min(2, poolTotal / 10));
    const tasaActual = Math.floor(tasaBase / poolFactor);
    window._tasaVentaActual = tasaActual;
    const tonRecibir = ventaCantidad / tasaActual;
    const ventaTonRecibirElem = document.getElementById('venta-ton-recibir');
    if (ventaTonRecibirElem) ventaTonRecibirElem.textContent = tonRecibir.toFixed(4) + ' TON';
    const btnVender = document.getElementById('vender-btn');
    const errorVenta = document.getElementById('venta-error');
    if (!btnVender) return;
    let walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) walletConectada = true;
    let hayError = false;
    let mensajeError = '';
    let textoBoton = '';
    if (!walletConectada) {
        hayError = true;
        mensajeError = '⚠️ Conecta tu wallet en la pestaña COMPRAR primero';
        textoBoton = '🔒 CONECTA WALLET PARA VENDER';
    } else if (ventaCantidad > diamantesDisponibles) {
        hayError = true;
        mensajeError = '⚠️ No tienes suficientes diamantes';
        textoBoton = '💎 DIAMANTES INSUFICIENTES';
    } else if (tonRecibir < 1) {
        hayError = true;
        mensajeError = '⚠️ El mínimo de retiro es 1 TON';
        textoBoton = '📉 MÍNIMO 1 TON';
    } else if ((userData.retiradoHoy || 0) + tonRecibir > 5) {
        hayError = true;
        mensajeError = '⚠️ Límite diario de 5 TON alcanzado';
        textoBoton = '🚫 LÍMITE DIARIO 5 TON';
    } else if (tonRecibir > poolTotal) {
        hayError = true;
        mensajeError = '⚠️ No hay suficientes TON en el pool';
        textoBoton = '🏊 POOL INSUFICIENTE';
    } else {
        textoBoton = '💱 CAMBIAR ' + ventaCantidad + ' 💎 POR ' + tonRecibir.toFixed(4) + ' TON';
    }
    btnVender.disabled = hayError;
    btnVender.textContent = textoBoton;
    if (errorVenta) {
        if (hayError) {
            errorVenta.style.display = 'block';
            errorVenta.textContent = mensajeError;
        } else {
            errorVenta.style.display = 'none';
        }
    }
}

function onVentaInputChange() {
    const input = document.getElementById('venta-input');
    if (!input) return;
    let valor = parseInt(input.value);
    if (isNaN(valor) || valor < 100) valor = 100;
    const diamantesDisponibles = userData.diamonds || 0;
    if (valor > diamantesDisponibles) valor = diamantesDisponibles;
    ventaCantidad = valor;
    input.value = valor;
    actualizarPanelVenta();
}

function setVentaPreset(cantidad) {
    const diamantesDisponibles = userData.diamonds || 0;
    ventaCantidad = Math.min(diamantesDisponibles, cantidad);
    const input = document.getElementById('venta-input');
    if (input) input.value = ventaCantidad;
    actualizarPanelVenta();
}

function setVentaPresetMax() {
    ventaCantidad = userData.diamonds || 0;
    const input = document.getElementById('venta-input');
    if (input) input.value = ventaCantidad;
    actualizarPanelVenta();
}

async function venderDiamantes() {
    const tasa = window._tasaVentaActual || 10000;
    const tonRecibir = ventaCantidad / tasa;
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet primero');
    if (tonRecibir < 1) return alert('❌ El mínimo de retiro es 1 TON');
    if (!confirm('¿Confirmas el cambio?\n\nDiamantes: ' + ventaCantidad + ' 💎\nRecibirás aproximadamente: ' + (tonRecibir - CONFIG.RED_TON_FEE).toFixed(4) + ' TON')) return;

    try {
        const resp = await fetch('/api/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userData.id,
                diamondsAmount: ventaCantidad,
                tonAddress: currentWallet.account.address
            })
        });
        const data = await resp.json();

        if (!data.success) {
            alert('❌ ' + (data.error || 'No se pudo procesar la venta'));
            return;
        }

        userData.diamonds = data.diamonds;
        ventaCantidad = 100;
        const input = document.getElementById('venta-input');
        if (input) input.value = 100;
        actualizarPanelVenta();
        actualizarUI();
        spawnConfetti();
        alert('✅ ¡Transacción exitosa!\n\nRecibiste ' + data.tonEnviado.toFixed(4) + ' TON en tu wallet.');
    } catch (error) {
        console.error('Error en venta:', error);
        alert('❌ Ocurrió un error procesando la venta, intenta de nuevo');
    }
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet primero');
    const diamantesAComprar = Math.max(100, Math.floor(tonAmount / CONFIG.PRECIO_COMPRA));
    if (!confirm('¿Confirmas la compra?\n\nPagarás: ' + tonAmount.toFixed(2) + ' TON\nRecibirás: ' + diamantesAComprar + ' 💎')) return;

    const montoPool = Math.floor(tonAmount * 0.8 * 1000000000);
    const montoDueño = Math.floor(tonAmount * 0.2 * 1000000000);

    try {
        const transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: CONFIG.BILLETERA_POOL,
                    amount: montoPool.toString(),
                    payload: "Compra diamantes - Ton City"
                },
                {
                    address: CONFIG.BILLETERA_PROPIETARIO,
                    amount: montoDueño.toString(),
                    payload: "Comisión - Ton City"
                }
            ]
        };
        await tonConnectUI.sendTransaction(transaccion);

        const resp = await fetch('/api/confirm-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id, tonAmount: tonAmount })
        });
        const data = await resp.json();

        if (!data.success) {
            alert('⚠️ Pagaste, pero aún no lo confirmamos: ' + (data.error || 'intenta abrir el banco de nuevo en unos segundos'));
            return;
        }

        userData.diamonds = data.diamonds;
        actualizarUI();
        spawnConfetti();
        alert('✅ ¡Compra exitosa!\n\nRecibiste ' + diamantesAComprar + ' 💎');
        closeAll();
    } catch (error) {
        console.error('Error en compra:', error);
        alert('❌ La transacción fue cancelada o rechazada');
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
            const botonConnect = document.getElementById('ton-connect-button');
            const walletInfo = document.getElementById('wallet-info');
            if (wallet) {
                if (botonConnect) botonConnect.style.display = 'none';
                if (walletInfo) walletInfo.classList.remove('hidden');
            } else {
                if (botonConnect) botonConnect.style.display = 'flex';
                if (walletInfo) walletInfo.classList.add('hidden');
            }
            const modalBank = document.getElementById('modalBank');
            if (modalBank && modalBank.style.display === 'block') {
                if (bancoTabActual === 'compra') actualizarListaCompra();
                else actualizarPanelVenta();
            }
        });
        console.log('✅ TON Connect inicializado');
    } catch (error) {
        console.error('Error TON Connect:', error);
    }
}

async function disconnectWallet() {
    if (tonConnectUI) await tonConnectUI.disconnect();
    currentWallet = null;
    const botonConnect = document.getElementById('ton-connect-button');
    const walletInfo = document.getElementById('wallet-info');
    if (botonConnect) botonConnect.style.display = 'flex';
    if (walletInfo) walletInfo.classList.add('hidden');
    actualizarListaCompra();
}

// ==========================================
// TIENDA PREMIUM
// ==========================================
function openStore() {
    closeAll();
    showModal('modalStore');
    let walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) walletConectada = true;
    const planesContainer = document.getElementById('premium-plans');
    if (!planesContainer) return;
    let html = '';
    for (let i = 0; i < PREMIUM_PLANS.length; i++) {
        const plan = PREMIUM_PLANS[i];
        const botonColor = walletConectada ? '#8b5cf6' : '#334155';
        const botonTexto = walletConectada ? 'COMPRAR' : 'CONECTAR WALLET';
        const botonDisabled = walletConectada ? '' : 'disabled';
        html += '<div style="background:#0f172a;border-radius:16px;padding:20px;margin:12px 0;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
        html += '<strong style="font-size:18px;">' + plan.name + '</strong>';
        html += '<span style="color:#facc15;font-weight:700;font-size:18px;">' + plan.price + ' TON</span>';
        html += '</div>';
        html += '<button onclick="comprarPremium(' + plan.days + ')" style="background:' + botonColor + ';border:none;border-radius:30px;padding:14px;width:100%;color:white;font-weight:700;font-size:16px;cursor:pointer;" ' + botonDisabled + '>' + botonTexto + '</button>';
        html += '</div>';
    }
    planesContainer.innerHTML = html;
}

async function comprarPremium(days) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet primero');
    let planSeleccionado = null;
    for (let i = 0; i < PREMIUM_PLANS.length; i++) {
        if (PREMIUM_PLANS[i].days === days) {
            planSeleccionado = PREMIUM_PLANS[i];
            break;
        }
    }
    if (!planSeleccionado) return alert('❌ Plan no encontrado');
    if (!confirm('¿Activar Premium ' + planSeleccionado.name + ' por ' + planSeleccionado.price + ' TON?\n\nDisfrutarás de todos los beneficios Premium.')) return;
    try {
        const transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: CONFIG.BILLETERA_PROPIETARIO,
                amount: Math.floor(planSeleccionado.price * 1000000000).toString(),
                payload: "Premium Ton City - " + planSeleccionado.name
            }]
        };
        await tonConnectUI.sendTransaction(transaccion);
        const fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + days);
        userData.premium_expires = fechaExpiracion.toISOString();
        await saveUserData();
        actualizarPremiumUI();
        actualizarUI();
        spawnConfetti();
        alert('✅ ¡Premium ' + planSeleccionado.name + ' activado!');
        closeAll();
    } catch (error) {
        console.error('Error al comprar Premium:', error);
        alert('❌ La transacción fue cancelada o rechazada');
    }
}

// ==========================================
// ADSGRAM Y ANUNCIOS
// ==========================================
async function initAds() {
    try {
        AdController = window.Adsgram.init({ blockId: CONFIG.ADSGRAM_BLOCK_ID });
        adsReady = true;
        console.log('✅ AdSgram inicializado');
    } catch (error) {
        adsReady = false;
        console.error('❌ Error AdSgram:', error);
    }
}

function showRewardedAd(callback) {
    if (esPremium()) {
        callback(true);
        return;
    }
    if (!adsReady || !AdController) {
        alert('📺 El sistema de anuncios no está disponible');
        callback(false);
        return;
    }
    AdController.show()
        .then(function(resultado) { callback(resultado.done === true); })
        .catch(function(error) { console.log('Error anuncio:', error); callback(false); });
}

function showAdsModal() {
    closeAll();
    showModal('modalAds');
    actualizarEstadoAnuncio();
}

function actualizarEstadoAnuncio() {
    let puedeVerAnuncio = false;
    if (!userData.last_ad_watch) {
        puedeVerAnuncio = true;
    } else {
        const ultimoAnuncio = new Date(userData.last_ad_watch);
        const ahora = new Date();
        const diferenciaMs = ahora - ultimoAnuncio;
        if (diferenciaMs > 3600000) puedeVerAnuncio = true;
    }
    const boton = document.getElementById('watch-ad-btn');
    const estadoDiv = document.getElementById('ads-status');
    if (!boton) return;
    if (esPremium()) {
        boton.disabled = true;
        boton.textContent = '⭐ PREMIUM - ANUNCIOS ILIMITADOS';
        if (estadoDiv) estadoDiv.innerHTML = '⭐ Como usuario Premium, no necesitas ver anuncios';
        return;
    }
    if (puedeVerAnuncio && adsReady) {
        boton.disabled = false;
        boton.textContent = '🎬 VER ANUNCIO +20 💎';
        if (estadoDiv) estadoDiv.innerHTML = '✅ ¡Anuncio disponible!';
    } else {
        boton.disabled = true;
        let minutosRestantes = 60;
        if (userData.last_ad_watch) {
            const ultimo = new Date(userData.last_ad_watch);
            const ahora = new Date();
            const msRestantes = 3600000 - (ahora - ultimo);
            minutosRestantes = Math.ceil(msRestantes / 60000);
        }
        boton.textContent = '⏳ ESPERAR ' + minutosRestantes + ' MIN';
        if (estadoDiv) estadoDiv.innerHTML = '⏳ Próximo anuncio en ' + minutosRestantes + ' minutos';
    }
}

function showAd() {
    if (esPremium()) {
        userData.diamonds = userData.diamonds + 20;
        saveUserData();
        actualizarUI();
        alert('⭐ Como usuario Premium, recibes +20 💎');
        closeAll();
        return;
    }
    showRewardedAd(function(completado) {
        if (completado) {
            userData.diamonds = userData.diamonds + 20;
            userData.last_ad_watch = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 ¡Gracias! Recibiste +20 💎');
            closeAll();
        } else {
            alert('❌ No se pudo completar el anuncio');
        }
    });
}

function rescueWithAd() {
    if (esPremium()) {
        userData.diamonds = userData.diamonds + 50;
        actualizarUI();
        alert('⭐ Rescate Premium: +50 💎');
        return;
    }
    if (userData.diamonds > 0) return alert('El rescate solo está disponible cuando tienes 0 diamantes');
    const hoy = new Date();
    if (userData.last_casino_rescue) {
        const ultimoRescate = new Date(userData.last_casino_rescue);
        if (hoy.toDateString() === ultimoRescate.toDateString()) return alert('Ya usaste el rescate hoy');
    }
    showRewardedAd(function(completado) {
        if (completado) {
            userData.diamonds = userData.diamonds + 50;
            userData.last_casino_rescue = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 ¡Rescate exitoso! +50 💎');
        }
    });
}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= 30) return esPremium() ? 300 : 150;
    let base = 5 + (day - 1) * 3;
    if (base > 150) base = 150;
    return esPremium() ? base * 2 : base;
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    const ultimoReclamo = new Date(userData.last_daily_claim);
    const hoy = new Date();
    ultimoReclamo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    return hoy > ultimoReclamo;
}

function openDailyReward() {
    closeAll();
    const racha = userData.daily_streak || 0;
    const diaActual = Math.min(racha + 1, 30);
    const recompensaHoy = getDailyRewardAmount(diaActual);
    const puedeReclamar = puedeReclamarDiaria();
    const diaElem = document.getElementById('current-day');
    if (diaElem) diaElem.textContent = diaActual;
    const recompensaElem = document.getElementById('today-reward');
    if (recompensaElem) recompensaElem.textContent = recompensaHoy + ' 💎';
    const estadoElem = document.getElementById('daily-status');
    if (estadoElem) estadoElem.innerHTML = puedeReclamar ? '✅ ¡Recompensa disponible!' : '⏳ Vuelve mañana';
    const calendarioElem = document.getElementById('daily-calendar');
    if (calendarioElem) {
        let html = '';
        for (let i = 1; i <= 30; i++) {
            let clase = 'daily-day';
            if (i <= racha) clase += ' completed';
            else if (i === racha + 1 && puedeReclamar) clase += ' current';
            html += '<div class="' + clase + '"><div>Día ' + i + '</div><div>' + getDailyRewardAmount(i) + '💎</div></div>';
        }
        calendarioElem.innerHTML = html;
    }
    showModal('modalDailyReward');
}

async function claimDailyReward() {
    if (!userData.id) return alert('❌ Error: Usuario no identificado');
    if (!puedeReclamarDiaria()) return alert('❌ Ya reclamaste tu recompensa hoy');
    let nuevoDia = 1;
    if (userData.last_daily_claim && userData.daily_streak > 0) {
        const ultimoReclamo = new Date(userData.last_daily_claim);
        const ahora = new Date();
        const horasTranscurridas = (ahora - ultimoReclamo) / (1000 * 3600);
        if (horasTranscurridas < 48) nuevoDia = userData.daily_streak + 1;
    }
    if (nuevoDia > 30) nuevoDia = 30;
    const recompensa = getDailyRewardAmount(nuevoDia);
    userData.diamonds = userData.diamonds + recompensa;
    userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    await saveUserData();
    actualizarUI();
    spawnConfetti();
    alert('✅ ¡Recompensa reclamada!\n\n+ ' + recompensa + ' 💎\nDía ' + nuevoDia + ' de 30');
    closeAll();
}

// ==========================================
// EVENTO SEMANAL
// ==========================================
function openEventModal() {
    closeAll();
    const evento = getEventoActual();
    const emojiElem = document.getElementById('event-emoji');
    if (emojiElem) emojiElem.textContent = evento.emoji;
    const tituloElem = document.getElementById('event-titulo');
    if (tituloElem) tituloElem.textContent = evento.nombre;
    const descripcionElem = document.getElementById('event-description');
    if (descripcionElem) descripcionElem.textContent = evento.descripcion;
    showModal('modalEvent');
}

function startEventTask() {
    closeAll();
    const evento = getEventoActual();
    openBuilding(evento.edificio);
}

// ==========================================
// CASINO
// ==========================================
function openCasino() {
    closeAll();
    const saldoElem = document.getElementById('casino-saldo');
    if (saldoElem) saldoElem.textContent = Math.floor(userData.diamonds);
    const rescueDiv = document.getElementById('casino-rescue');
    if (rescueDiv) rescueDiv.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
    showModal('modalCasino');
}

function abrirJuego(juego) {
    closeAll();
    let modalId = '';
    switch (juego) {
        case 'highlow': modalId = 'modalHighLow'; break;
        case 'ruleta': modalId = 'modalRuleta'; break;
        case 'tragaperras': modalId = 'modalTragaperras'; break;
        case 'dados': modalId = 'modalDados'; break;
        case 'ruletarusa': modalId = 'modalRuletaRusa'; break;
    }
    if (!modalId) return;
    showModal(modalId);
    const balanceElem = document.getElementById(juego + '-balance');
    if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
    if (juego === 'highlow') {
        document.getElementById('hl-number').textContent = '0000';
        document.getElementById('hl-result').innerHTML = '';
        document.getElementById('hl-bet-display').textContent = apuestaActual.highlow;
        document.getElementById('hl-bet').textContent = apuestaActual.highlow + ' 💎';
    } else if (juego === 'ruleta') {
        document.getElementById('ruleta-number').textContent = '0';
        document.getElementById('ruleta-result').innerHTML = '';
        document.getElementById('ruleta-bet-display').textContent = apuestaActual.ruleta;
        document.getElementById('ruleta-bet').textContent = apuestaActual.ruleta + ' 💎';
    } else if (juego === 'tragaperras') {
        document.getElementById('slot1').textContent = '💎';
        document.getElementById('slot2').textContent = '💰';
        document.getElementById('slot3').textContent = '🌟';
        document.getElementById('tragaperras-result').innerHTML = '';
        document.getElementById('tragaperras-bet-display').textContent = apuestaActual.tragaperras;
        document.getElementById('tragaperras-bet').textContent = apuestaActual.tragaperras + ' 💎';
    } else if (juego === 'dados') {
        document.getElementById('dado1').textContent = '⚀';
        document.getElementById('dado2').textContent = '⚀';
        document.getElementById('dados-suma').textContent = 'Suma: 2';
        document.getElementById('dados-result').innerHTML = '';
        document.getElementById('dados-bet-display').textContent = apuestaActual.dados;
        document.getElementById('dados-bet').textContent = apuestaActual.dados + ' 💎';
    } else if (juego === 'ruletarusa') {
        crearCamarasRuletaRusa();
        document.getElementById('ruletarusa-result').innerHTML = '';
        document.getElementById('ruletarusa-emoji').textContent = '🔫';
        document.getElementById('ruletarusa-bet-display').textContent = apuestaActual.ruletarusa;
        document.getElementById('ruletarusa-bet').textContent = apuestaActual.ruletarusa + ' 💎';
    }
}

function cerrarJuego() {
    closeAll();
    openCasino();
}

function cambiarApuesta(juego, delta) {
    const valorActual = apuestaActual[juego] || 10;
    let nuevoValor = valorActual + delta;
    if (nuevoValor < 1) nuevoValor = 1;
    if (nuevoValor > 1000) nuevoValor = 1000;
    apuestaActual[juego] = nuevoValor;
    const displayElem = document.getElementById(juego + '-bet-display');
    if (displayElem) displayElem.textContent = nuevoValor;
    const betElem = document.getElementById(juego + '-bet');
    if (betElem) betElem.textContent = nuevoValor + ' 💎';
}

function puedeJugar(juego, cantidad) {
    if (!cantidad) cantidad = 1;
    if (userData.haInvertido) return true;
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = {
            highlow: 0,
            ruleta: 0,
            tragaperras: 0,
            dados: 0,
            ruletarusa: 0,
            loteria: 0,
            fecha: hoy
        };
    }
    const limites = { highlow: 20, ruleta: 15, tragaperras: 30, dados: 20, ruletarusa: 10, loteria: 5 };
    const jugadasActuales = userData.jugadasHoy[juego] || 0;
    const limite = limites[juego] || 10;
    return (jugadasActuales + cantidad) <= limite;
}

function registrarJugada(juego, cantidad) {
    if (!cantidad) cantidad = 1;
    if (!userData.haInvertido) {
        if (!userData.jugadasHoy[juego]) userData.jugadasHoy[juego] = 0;
        userData.jugadasHoy[juego] = userData.jugadasHoy[juego] + cantidad;
    }
}

function jugarHighLow(eleccion) {
    const apuesta = apuestaActual.highlow;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('highlow')) return alert('❌ Límite diario alcanzado');
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('highlow');
    const numero = Math.floor(Math.random() * 10000);
    let gana = false;
    if (eleccion === 'low' && numero < 5000) gana = true;
    if (eleccion === 'high' && numero >= 5000) gana = true;
    const numeroElem = document.getElementById('hl-number');
    if (numeroElem) numeroElem.textContent = numero.toString().padStart(4, '0');
    const balanceElem = document.getElementById('hl-balance');
    if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
    const resultadoElem = document.getElementById('hl-result');
    if (gana) {
        const ganancia = apuesta * 2;
        userData.diamonds = userData.diamonds + ganancia;
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
        if (navigator.vibrate) navigator.vibrate(50);
    } else {
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
    }
    actualizarUI();
    saveUserData();
}

function jugarRuleta(tipo) {
    const apuesta = apuestaActual.ruleta;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('ruleta')) return alert('❌ Límite diario');
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('ruleta');
    let numero = Math.random() < 0.03 ? 0 : Math.floor(Math.random() * 37);
    const numeroElem = document.getElementById('ruleta-number');
    if (numeroElem) numeroElem.textContent = numero;
    const balanceElem = document.getElementById('ruleta-balance');
    if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
    let gana = false;
    switch (tipo) {
        case 'rojo':
            const rojos = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
            gana = rojos.indexOf(numero) !== -1;
            break;
        case 'negro':
            const negros = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
            gana = negros.indexOf(numero) !== -1;
            break;
        case 'par': gana = numero !== 0 && numero % 2 === 0; break;
        case 'impar': gana = numero % 2 === 1; break;
        case 'bajo': gana = numero >= 1 && numero <= 18; break;
        case 'alto': gana = numero >= 19 && numero <= 36; break;
        case 'numero':
            const elegido = parseInt(prompt('Elige un número del 0 al 36:'));
            if (isNaN(elegido) || elegido < 0 || elegido > 36) {
                userData.diamonds = userData.diamonds + apuesta;
                actualizarUI();
                return;
            }
            gana = numero === elegido;
            break;
    }
    const resultadoElem = document.getElementById('ruleta-result');
    if (gana) {
        const ganancia = (tipo === 'numero') ? apuesta * 36 : apuesta * 2;
        userData.diamonds = userData.diamonds + ganancia;
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
        if (navigator.vibrate) navigator.vibrate(50);
    } else {
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
    }
    actualizarUI();
    saveUserData();
}

function jugarTragaperras() {
    const apuesta = apuestaActual.tragaperras;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('tragaperras')) return alert('❌ Límite diario');
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('tragaperras');
    const slots = document.querySelectorAll('.slot');
    slots.forEach(function(slot) { slot.classList.add('spinning'); });
    setTimeout(function() {
        const simbolos = [
            { nombre: '💎', multiplicador: 30 },
            { nombre: '₿', multiplicador: 15 },
            { nombre: 'Ξ', multiplicador: 8 },
            { nombre: '🪙', multiplicador: 3 },
            { nombre: '📈', multiplicador: 2 },
            { nombre: '📉', multiplicador: 2 }
        ];
        const resultados = [];
        for (let i = 0; i < 3; i++) {
            const aleatorio = Math.random() * 100;
            let acumulado = 0;
            for (let j = 0; j < simbolos.length; j++) {
                acumulado = acumulado + 18;
                if (aleatorio < acumulado) { resultados.push(simbolos[j]); break; }
            }
        }
        document.getElementById('slot1').textContent = resultados[0].nombre;
        document.getElementById('slot2').textContent = resultados[1].nombre;
        document.getElementById('slot3').textContent = resultados[2].nombre;
        slots.forEach(function(slot) { slot.classList.remove('spinning'); });
        const balanceElem = document.getElementById('tragaperras-balance');
        if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
        const resultadoElem = document.getElementById('tragaperras-result');
        if (resultados[0].nombre === resultados[1].nombre && resultados[1].nombre === resultados[2].nombre) {
            let multiplicador = resultados[0].multiplicador;
            if (esPremium()) multiplicador = multiplicador * 2;
            const premio = apuesta * multiplicador;
            userData.diamonds = userData.diamonds + premio;
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡JACKPOT! x' + multiplicador + ' (+' + premio + ' 💎)</span>';
            spawnConfetti();
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        } else {
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
        }
        actualizarUI();
        saveUserData();
    }, 500);
}

function jugarDados(eleccion) {
    const apuesta = apuestaActual.dados;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('dados')) return alert('❌ Límite diario');
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('dados');
    const dado1 = Math.floor(Math.random() * 6) + 1;
    const dado2 = Math.floor(Math.random() * 6) + 1;
    const caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const dado1Elem = document.getElementById('dado1');
    const dado2Elem = document.getElementById('dado2');
    if (dado1Elem) dado1Elem.classList.add('rolling');
    if (dado2Elem) dado2Elem.classList.add('rolling');
    setTimeout(function() {
        if (dado1Elem) { dado1Elem.textContent = caras[dado1 - 1]; dado1Elem.classList.remove('rolling'); }
        if (dado2Elem) { dado2Elem.textContent = caras[dado2 - 1]; dado2Elem.classList.remove('rolling'); }
        const suma = dado1 + dado2;
        const sumaElem = document.getElementById('dados-suma');
        if (sumaElem) sumaElem.textContent = 'Suma: ' + suma;
        const balanceElem = document.getElementById('dados-balance');
        if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
        let gana = false;
        if (eleccion === 'menor' && suma >= 2 && suma <= 6) gana = true;
        if (eleccion === 'mayor' && suma >= 8 && suma <= 12) gana = true;
        if (eleccion === 'exacto' && suma === 7) gana = true;
        const resultadoElem = document.getElementById('dados-result');
        if (gana) {
            let ganancia = (eleccion === 'exacto') ? apuesta * 5 : apuesta * 2;
            if (esPremium()) ganancia = ganancia * 2;
            userData.diamonds = userData.diamonds + ganancia;
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
            if (navigator.vibrate) navigator.vibrate(50);
        } else {
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
        }
        actualizarUI();
        saveUserData();
    }, 500);
}

function crearCamarasRuletaRusa() {
    const grid = document.getElementById('ruletarusa-camaras');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const boton = document.createElement('button');
        boton.textContent = i;
        boton.style.cssText = 'background:var(--bg-elevated);border:2px solid #ef4444;border-radius:16px;padding:18px;color:white;font-weight:700;font-size:22px;cursor:pointer;transition:all 0.2s;';
        boton.onmouseenter = function() { this.style.background = '#ef4444'; this.style.transform = 'scale(1.05)'; };
        boton.onmouseleave = function() { this.style.background = 'var(--bg-elevated)'; this.style.transform = 'scale(1)'; };
        (function(numero) { boton.onclick = function() { jugarRuletaRusa(numero); }; })(i);
        grid.appendChild(boton);
    }
}

function jugarRuletaRusa(camara) {
    const apuesta = apuestaActual.ruletarusa;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('ruletarusa')) return alert('❌ Límite diario');
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('ruletarusa');
    const bala = Math.floor(Math.random() * 6) + 1;
    const gana = camara !== bala;
    const emojiElem = document.getElementById('ruletarusa-emoji');
    if (emojiElem) emojiElem.textContent = gana ? '🎉' : '💥';
    const balanceElem = document.getElementById('ruletarusa-balance');
    if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
    const resultadoElem = document.getElementById('ruletarusa-result');
    if (gana) {
        const ganancia = apuesta * 3;
        userData.diamonds = userData.diamonds + ganancia;
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡SOBREVIVISTE! +' + ganancia + ' 💎</span>';
        spawnConfetti();
        if (navigator.vibrate) navigator.vibrate(100);
    } else {
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;font-size:20px;">💥 ¡La bala estaba en la cámara ' + bala + '! Perdiste ' + apuesta + ' 💎</span>';
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
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
    const nombreCapitalizado = building.charAt(0).toUpperCase() + building.slice(1);
    const modalId = 'modal' + nombreCapitalizado;
    showModal(modalId);
    actualizarPanelMejora(building);
}

function actualizarPanelMejora(building) {
    const nivel = userData['lvl_' + building] || 0;
    const producciones = { escuela: 15, fabrica: 25, piscina: 10, hospital: 18 };
    const preciosBase = { escuela: 500, fabrica: 1500, piscina: 800, hospital: 1200 };
    const produccion = nivel * producciones[building];
    const precio = Math.floor(preciosBase[building] * Math.pow(1.12, nivel));
    const nivelElem = document.getElementById(building + '-level');
    if (nivelElem) nivelElem.textContent = nivel;
    const prodElem = document.getElementById(building + '-prod');
    if (prodElem) prodElem.textContent = produccion + ' 💎/h';
    const precioElem = document.getElementById(building + '-price');
    if (precioElem) precioElem.textContent = precio.toLocaleString() + ' 💎';
    const boton = document.getElementById(building + '-btn');
    if (boton) {
        if (userData.diamonds < precio) {
            boton.disabled = true;
            boton.textContent = '💎 INSUFICIENTE';
        } else {
            boton.disabled = false;
            boton.textContent = 'MEJORAR (' + precio.toLocaleString() + ' 💎)';
        }
    }
}

function buyUpgrade(building) {
    const preciosBase = { escuela: 500, fabrica: 1500, piscina: 800, hospital: 1200 };
    const nivel = userData['lvl_' + building] || 0;
    const precio = Math.floor(preciosBase[building] * Math.pow(1.12, nivel));
    if (userData.diamonds < precio) return alert('❌ Diamantes insuficientes');
    userData['lvl_' + building] = (userData['lvl_' + building] || 0) + 1;
    userData.diamonds = userData.diamonds - precio;
    saveUserData();
    actualizarUI();
    actualizarPanelMejora(building);
    const nombres = { escuela: 'Escuela', fabrica: 'Fábrica', piscina: 'Piscina', hospital: 'Hospital' };
    alert('✅ ¡' + nombres[building] + ' mejorada a nivel ' + userData['lvl_' + building] + '!');
}

function switchTab(building, tab) {
    const upgradePanel = document.getElementById(building + '-upgrade-panel');
    const gamePanel = document.getElementById(building + '-game-panel');
    const nombreCapitalizado = building.charAt(0).toUpperCase() + building.slice(1);
    const tabs = document.querySelectorAll('#modal' + nombreCapitalizado + ' .tab');
    if (tab === 'game') {
        if (upgradePanel) upgradePanel.classList.add('hidden');
        if (gamePanel) gamePanel.classList.remove('hidden');
        if (tabs[0]) tabs[0].classList.remove('active');
        if (tabs[1]) tabs[1].classList.add('active');
    } else {
        if (upgradePanel) upgradePanel.classList.remove('hidden');
        if (gamePanel) gamePanel.classList.add('hidden');
        if (tabs[0]) tabs[0].classList.add('active');
        if (tabs[1]) tabs[1].classList.remove('active');
    }
}

// ==========================================
// SISTEMA DE VIDAS
// ==========================================
function updateLivesUI(game) {
    const container = document.getElementById(game + '-lives');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const lifeDiv = document.createElement('div');
        if (i < gameLives[game]) {
            lifeDiv.className = 'life active';
            lifeDiv.innerHTML = '❤️';
        } else {
            lifeDiv.className = 'life';
            lifeDiv.innerHTML = '🖤';
        }
        container.appendChild(lifeDiv);
    }
    const reviveBtn = document.getElementById(game + '-revive');
    if (reviveBtn) reviveBtn.style.display = gameLives[game] === 0 ? 'block' : 'none';
}

function loseLife(game) {
    gameLives[game] = gameLives[game] - 1;
    updateLivesUI(game);
    if (gameLives[game] <= 0) {
        gameLives[game] = 0;
        gameActiveStates[game] = false;
        let resultadoId = '';
        if (game === 'escuela') resultadoId = 'mem';
        else if (game === 'fabrica') resultadoId = 'asm';
        else if (game === 'piscina') resultadoId = 'jump';
        else if (game === 'hospital') resultadoId = 'surgery';
        const resultadoElem = document.getElementById(resultadoId + '-result');
        if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;font-size:20px;">💀 GAME OVER</span>';
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
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
            alert('❤️ ¡Revivido! Tienes 3 vidas nuevamente.');
            saveUserData();
        }
    });
}

function useAdMultiplier(game) {
    showRewardedAd(function(success) {
        if (success) {
            pendingMultiplier = 2;
            alert('✨ ¡Multiplicador x2 activado! Próxima recompensa duplicada.');
        }
    });
}

// ==========================================
// MINIJUEGO 1: ESCUELA - MENTE MAESTRA (5 NÚMEROS)
// ==========================================
function iniciarJuegoEscuela() {
    gameActiveStates.escuela = true;
    escuelaLevel = userData.gameStats.escuela.currentLevel || 1;
    escuelaBest = userData.gameStats.escuela.bestLevel || 0;
    escuelaStreak = 0;
    gameLives.escuela = userData.gameStats.escuela.lives || 3;
    updateLivesUI('escuela');
    document.getElementById('mem-level').textContent = escuelaLevel;
    document.getElementById('mem-best').textContent = escuelaBest;
    document.getElementById('escuela-game-level').textContent = escuelaLevel;
    document.getElementById('mem-result').innerHTML = '';
    const startBtn = document.getElementById('escuela-start-btn');
    if (startBtn) startBtn.style.display = 'none';
    nuevaSecuenciaEscuela();
}

function nuevaSecuenciaEscuela() {
    if (!gameActiveStates.escuela) return;
    escuelaSequence = [];
    escuelaUserInput = [];
    const longitud = 5;
    for (let i = 0; i < longitud; i++) {
        const numero = Math.floor(Math.random() * 16) + 1;
        escuelaSequence.push(numero);
    }
    mostrarSecuenciaEscuela();
}

function mostrarSecuenciaEscuela() {
    const display = document.getElementById('sequence-display');
    if (!display) return;
    display.innerHTML = '';
    document.getElementById('pupitres-grid').innerHTML = '';
    let indice = 0;
    const velocidad = Math.max(300, 800 - escuelaLevel * 10);
    function mostrarSiguiente() {
        if (indice >= escuelaSequence.length) { crearPupitres(); return; }
        display.innerHTML = '';
        const carta = document.createElement('div');
        carta.className = 'sequence-card highlight';
        carta.style.animation = 'popIn 0.3s ease';
        carta.textContent = escuelaSequence[indice];
        display.appendChild(carta);
        indice++;
        setTimeout(mostrarSiguiente, velocidad);
    }
    mostrarSiguiente();
}

function crearPupitres() {
    const grid = document.getElementById('pupitres-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 16; i++) {
        const boton = document.createElement('div');
        boton.className = 'pupitre';
        boton.textContent = i;
        (function(numero) { boton.onclick = function() { seleccionarPupitre(numero); }; })(i);
        grid.appendChild(boton);
    }
}

function seleccionarPupitre(numero) {
    if (!gameActiveStates.escuela) return;
    escuelaUserInput.push(numero);
    const indice = escuelaUserInput.length - 1;
    const pupitres = document.querySelectorAll('.pupitre');
    if (escuelaUserInput[indice] !== escuelaSequence[indice]) {
        if (pupitres[numero - 1]) {
            pupitres[numero - 1].classList.add('wrong');
            setTimeout(function() { if (pupitres[numero - 1]) pupitres[numero - 1].classList.remove('wrong'); }, 500);
        }
        if (!loseLife('escuela')) return;
        escuelaStreak = 0;
        escuelaUserInput = [];
        document.getElementById('mem-result').innerHTML = '<span style="color:#ef4444;">❌ Secuencia incorrecta</span>';
        setTimeout(function() { nuevaSecuenciaEscuela(); }, 2000);
        return;
    }
    if (pupitres[numero - 1]) {
        pupitres[numero - 1].classList.add('correct');
        setTimeout(function() { if (pupitres[numero - 1]) pupitres[numero - 1].classList.remove('correct'); }, 300);
    }
    if (escuelaUserInput.length === escuelaSequence.length) {
        const recompensa = calcularRecompensa(5, 'escuela');
        userData.diamonds = userData.diamonds + recompensa;
        escuelaLevel++;
        escuelaStreak++;
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
        document.getElementById('mem-result').innerHTML = '<span style="color:#4ade80;font-size:18px;">✅ ¡Correcto! +' + recompensa + ' 💎</span>';
        actualizarUI();
        actualizarPanelMejora('escuela');
        saveUserData();
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(function() { document.getElementById('mem-result').innerHTML = ''; nuevaSecuenciaEscuela(); }, 2000);
    }
}

// ==========================================
// MINIJUEGO 2: FÁBRICA (MÚLTIPLES PIEZAS)
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
    const startBtn = document.getElementById('fabrica-start-btn');
    if (startBtn) startBtn.style.display = 'none';
    crearPiezasFabrica();
}

function crearPiezasFabrica() {
    const belt = document.getElementById('conveyor');
    if (!belt) return;
    belt.querySelectorAll('.moving-piece').forEach(function(p) { p.remove(); });
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    fabricaPieces = [];
    const numPieces = Math.min(2 + Math.floor(fabricaLevel / 20), 8);
    for (let i = 0; i < numPieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'moving-piece';
        const isGood = Math.random() > Math.min(0.25, fabricaLevel / 200);
        piece.classList.add(isGood ? 'piece-good' : 'piece-bad');
        piece.textContent = isGood ? '🔧' : '💢';
        piece.style.top = (20 + Math.random() * 60) + 'px';
        piece.style.animationDuration = (3 + Math.random() * 4) + 's';
        piece.style.animationDelay = (Math.random() * 3) + 's';
        piece.onclick = function(e) { e.stopPropagation(); checkFabricaHitPiece(this); };
        belt.appendChild(piece);
        fabricaPieces.push({ el: piece, isGood: isGood, clicked: false });
    }
}

function checkFabricaHitPiece(piece) {
    if (!gameActiveStates.fabrica) return;
    const pData = fabricaPieces.find(function(p) { return p.el === piece; });
    if (!pData || pData.clicked) return;
    pData.clicked = true;
    const zone = document.getElementById('conveyor').querySelector('.calibration-zone');
    const zoneRect = zone.getBoundingClientRect();
    const pieceRect = piece.getBoundingClientRect();
    const inZone = pieceRect.left > zoneRect.left - 20 && pieceRect.right < zoneRect.right + 20;
    if (pData.isGood && inZone) {
        fabricaCompleted++;
        document.getElementById('asm-completed').textContent = fabricaCompleted;
        piece.style.background = '#4ade80';
        piece.textContent = '✅';
        setTimeout(function() { piece.remove(); }, 300);
        if (fabricaCompleted >= fabricaRequired) {
            const recompensa = calcularRecompensa(8, 'fabrica');
            userData.diamonds = userData.diamonds + recompensa;
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
            document.getElementById('asm-result').innerHTML = '<span style="color:#4ade80;font-size:18px;">✅ ¡Nivel completado! +' + recompensa + ' 💎</span>';
            actualizarUI();
            actualizarPanelMejora('fabrica');
            saveUserData();
            if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
            spawnConfetti();
            setTimeout(function() { iniciarJuegoFabrica(); }, 2000);
        }
    } else if (!pData.isGood && inZone) {
        if (!loseLife('fabrica')) return;
        piece.style.background = '#ef4444';
        piece.textContent = '❌';
        document.getElementById('asm-result').innerHTML = '<span style="color:#ef4444;">⚠️ Pieza defectuosa</span>';
        setTimeout(function() { piece.remove(); }, 300);
    } else if (!inZone) {
        if (!loseLife('fabrica')) return;
        document.getElementById('asm-result').innerHTML = '<span style="color:#ef4444;">❌ Fuera de zona</span>';
    }
    setTimeout(function() { document.getElementById('asm-result').innerHTML = ''; }, 1000);
}

// ==========================================
// MINIJUEGO 3: PISCINA (AGUJA ANIMADA)
// ==========================================
function iniciarJuegoPiscina() {
    gameActiveStates.piscina = true;
    piscinaLevel = userData.gameStats.piscina.currentLevel || 1;
    piscinaBest = userData.gameStats.piscina.bestLevel || 0;
    piscinaPerfect = 0;
    piscinaRequired = Math.min(3 + Math.floor(piscinaLevel / 30), 8);
    gameLives.piscina = userData.gameStats.piscina.lives || 3;
    updateLivesUI('piscina');
    document.getElementById('jump-perfect').textContent = piscinaPerfect;
    document.getElementById('jump-required').textContent = piscinaRequired;
    document.getElementById('jump-best').textContent = piscinaBest;
    document.getElementById('piscina-game-level').textContent = piscinaLevel;
    document.getElementById('jump-result').innerHTML = '';
    piscinaPower = 0;
    piscinaHoldStart = 0;
    piscinaGameStarted = true;
    document.getElementById('power-fill').style.width = '0%';
    document.getElementById('power-needle').style.left = '0%';
    document.getElementById('jump-power-display').textContent = '0%';
    const startBtn = document.getElementById('piscina-start-btn');
    if (startBtn) startBtn.style.display = 'none';
}

function startSlingshot(e) {
    if (!gameActiveStates.piscina || !piscinaGameStarted) return;
    e.preventDefault();
    piscinaHoldStart = Date.now();
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    piscinaChargeInterval = setInterval(function() {
        const transcurrido = Date.now() - piscinaHoldStart;
        piscinaPower = Math.min(100, transcurrido / 15);
        document.getElementById('power-fill').style.width = piscinaPower + '%';
        document.getElementById('power-needle').style.left = piscinaPower + '%';
        document.getElementById('jump-power-display').textContent = Math.floor(piscinaPower) + '%';
    }, 30);
}

function releaseSlingshot() {
    if (!gameActiveStates.piscina || !piscinaGameStarted || piscinaHoldStart === 0) return;
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    const duracion = Date.now() - piscinaHoldStart;
    piscinaPower = Math.min(100, duracion / 15);
    piscinaHoldStart = 0;
    document.getElementById('power-fill').style.width = '0%';
    document.getElementById('power-needle').style.left = '0%';
    document.getElementById('jump-power-display').textContent = '0%';
    const esPerfecto = piscinaPower > 36 && piscinaPower < 64;
    if (esPerfecto) {
        piscinaPerfect++;
        document.getElementById('jump-perfect').textContent = piscinaPerfect;
        document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;">🎯 ¡Clavado perfecto! (' + Math.floor(piscinaPower) + '%)</span>';
        if (piscinaPerfect >= piscinaRequired) {
            const recompensa = calcularRecompensa(6, 'piscina');
            userData.diamonds = userData.diamonds + recompensa;
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
            document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;font-size:18px;">✅ ¡Nivel completado! +' + recompensa + ' 💎</span>';
            piscinaPerfect = 0;
            document.getElementById('jump-perfect').textContent = '0';
            actualizarUI();
            actualizarPanelMejora('piscina');
            saveUserData();
            if (navigator.vibrate) navigator.vibrate(100);
            spawnConfetti();
            setTimeout(function() { iniciarJuegoPiscina(); }, 2000);
            return;
        }
    } else {
        loseLife('piscina');
        document.getElementById('jump-result').innerHTML = '<span style="color:#ef4444;">💧 ¡Fallaste! Potencia: ' + Math.floor(piscinaPower) + '% (Necesitas 40-60%)</span>';
    }
    piscinaPower = 0;
    setTimeout(function() { document.getElementById('jump-result').innerHTML = ''; }, 1500);
}

// ==========================================
// MINIJUEGO 4: HOSPITAL (CÉLULAS MIXTAS)
// ==========================================
function iniciarJuegoHospital() {
    gameActiveStates.hospital = true;
    hospitalLevel = userData.gameStats.hospital.currentLevel || 1;
    hospitalBest = userData.gameStats.hospital.bestLevel || 0;
    hospitalExtracted = 0;
    hospitalTotal = Math.min(3 + Math.floor(hospitalLevel / 30), 8);
    gameLives.hospital = userData.gameStats.hospital.lives || 3;
    updateLivesUI('hospital');
    document.getElementById('virus-extracted').textContent = hospitalExtracted;
    document.getElementById('virus-total').textContent = hospitalTotal;
    document.getElementById('surgery-best').textContent = hospitalBest;
    document.getElementById('hospital-game-level').textContent = hospitalLevel;
    document.getElementById('surgery-result').innerHTML = '';
    hospitalMaxTime = 20 + Math.floor(hospitalLevel / 10);
    hospitalTimeLeft = hospitalMaxTime;
    document.getElementById('time-fill').style.width = '100%';
    document.getElementById('time-fill').classList.remove('warning', 'danger');
    const startBtn = document.getElementById('hospital-start-btn');
    if (startBtn) startBtn.style.display = 'none';
    if (hospitalTimer) clearInterval(hospitalTimer);
    hospitalTimer = setInterval(function() {
        if (!gameActiveStates.hospital) return;
        hospitalTimeLeft = hospitalTimeLeft - 0.1;
        const porcentaje = (hospitalTimeLeft / hospitalMaxTime) * 100;
        document.getElementById('time-fill').style.width = Math.max(0, porcentaje) + '%';
        const timeFill = document.getElementById('time-fill');
        timeFill.classList.remove('warning', 'danger');
        if (porcentaje < 30) timeFill.classList.add('danger');
        else if (porcentaje < 50) timeFill.classList.add('warning');
        if (hospitalTimeLeft <= 0) {
            clearInterval(hospitalTimer);
            loseLife('hospital');
            document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⏰ ¡Tiempo agotado!</span>';
            setTimeout(function() { iniciarJuegoHospital(); }, 2000);
        }
    }, 100);
    crearCelulasHospital();
}

function crearCelulasHospital() {
    const area = document.getElementById('surgery-area');
    if (!area) return;
    area.querySelectorAll('.cell').forEach(function(c) { c.remove(); });
    const targetIndicator = document.getElementById('target-indicator');
    if (targetIndicator) targetIndicator.style.display = 'flex';
    const totalCells = hospitalTotal + Math.floor(hospitalLevel / 5) + 3;
    for (let i = 0; i < totalCells; i++) {
        const celula = document.createElement('div');
        celula.className = 'cell';
        const tipo = Math.random();
        if (i < hospitalTotal) {
            celula.classList.add('virus-target');
            celula.textContent = '🦠';
        } else if (tipo < 0.5) {
            celula.classList.add('virus-bad');
            celula.textContent = '☣️';
        } else {
            celula.classList.add('virus-neutral');
            celula.textContent = '🧫';
        }
        celula.style.left = (5 + Math.random() * 80) + '%';
        celula.style.top = (5 + Math.random() * 80) + '%';
        celula.style.animationDelay = (Math.random() * 2) + 's';
        celula.onclick = function(e) {
            e.stopPropagation();
            if (!gameActiveStates.hospital) return;
            if (this.classList.contains('virus-target')) {
                hospitalExtracted++;
                document.getElementById('virus-extracted').textContent = hospitalExtracted;
                this.classList.add('collected');
                const self = this;
                setTimeout(function() { if (self.parentNode) self.parentNode.removeChild(self); }, 300);
                if (hospitalExtracted >= hospitalTotal) {
                    clearInterval(hospitalTimer);
                    const recompensa = calcularRecompensa(7, 'hospital');
                    userData.diamonds = userData.diamonds + recompensa;
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
                    document.getElementById('surgery-result').innerHTML = '<span style="color:#4ade80;font-size:18px;">✅ ¡Cirugía exitosa! +' + recompensa + ' 💎</span>';
                    actualizarUI();
                    actualizarPanelMejora('hospital');
                    saveUserData();
                    if (navigator.vibrate) navigator.vibrate(100);
                    spawnConfetti();
                    setTimeout(function() { iniciarJuegoHospital(); }, 2000);
                }
            } else {
                this.style.transform = 'scale(1.5)';
                this.style.background = '#ef4444';
                const self = this;
                setTimeout(function() { if (self.parentNode) self.parentNode.removeChild(self); }, 300);
                if (!loseLife('hospital')) return;
                document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⚠️ ¡Célula incorrecta! -1 vida</span>';
                setTimeout(function() { document.getElementById('surgery-result').innerHTML = ''; }, 1000);
            }
        };
        area.appendChild(celula);
    }
}

// ==========================================
// RANKING Y POOL
// ==========================================
async function updateRankingAndPool() {
    try {
        const resultado = await _supabase.from('game_data').select('telegram_id, diamonds').neq('telegram_id', 'MASTER');
        if (!resultado.error && resultado.data) {
            globalPoolData.user_rankings = resultado.data.map(function(u) {
                return { id: u.telegram_id, diamonds: Number(u.diamonds) || 0 };
            }).sort(function(a, b) { return b.diamonds - a.diamonds; });
        }
        const posicion = globalPoolData.user_rankings.findIndex(function(u) { return u.id === userData.id; });
        if (posicion !== -1) {
            if (posicion < 3) userData.rank = "Diamante";
            else if (posicion < 10) userData.rank = "Oro";
            else if (posicion < 50) userData.rank = "Plata";
            else userData.rank = "Ciudadano";
            userData.weekly_rank = posicion + 1;
        }
        const poolUsuarios = globalPoolData.pool_ton * 0.8 * CONFIG.RESERVA_POOL;
        if (posicion < 3) userData.projectedReward = (poolUsuarios * 0.4) / 3;
        else if (posicion < 10) userData.projectedReward = (poolUsuarios * 0.25) / 7;
        else if (posicion < 50) userData.projectedReward = (poolUsuarios * 0.20) / 40;
        else {
            const ciudadanos = globalPoolData.user_rankings.slice(50);
            let totalDiamantesCiudadanos = 0;
            for (let i = 0; i < ciudadanos.length; i++) totalDiamantesCiudadanos = totalDiamantesCiudadanos + ciudadanos[i].diamonds;
            if (totalDiamantesCiudadanos > 0 && userData.diamonds > 0) userData.projectedReward = (poolUsuarios * 0.15) * (userData.diamonds / totalDiamantesCiudadanos);
            else userData.projectedReward = 0;
        }
    } catch (error) { console.error('Error ranking:', error); }
}

async function updateRealPoolBalance() {
    try {
        const respuesta = await fetch('https://tonapi.io/v2/accounts/' + CONFIG.BILLETERA_POOL, {
            headers: { 'Authorization': 'Bearer ' + CONFIG.TON_API_KEY }
        });
        if (respuesta.ok) {
            const datos = await respuesta.json();
            globalPoolData.pool_ton = (datos.balance || 0) / 1000000000;
        }
    } catch (error) { console.error('Error pool:', error); }
}

// ==========================================
// GUARDADO SUPABASE
// ==========================================
async function saveUserData() {
    if (!userData.id) return;
    try {
        const datos = {
            lvl_piscina: userData.lvl_piscina,
            lvl_fabrica: userData.lvl_fabrica,
            lvl_escuela: userData.lvl_escuela,
            lvl_hospital: userData.lvl_hospital,
            last_online: new Date().toISOString(),
            premium_expires: userData.premium_expires,
            daily_streak: userData.daily_streak,
            last_daily_claim: userData.last_daily_claim,
            event_progress: userData.event_progress || {},
            gameStats: userData.gameStats,
            referral_earnings: userData.referral_earnings || 0,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue
        };
        await _supabase.from('game_data').update(datos).eq('telegram_id', userData.id);
        console.log('💾 Datos guardados correctamente');
    } catch (error) { console.error('Error guardando:', error); }
}

async function loadUserFromDB(tgId) {
    try {
        const resultado = await _supabase.from('game_data').select('*').eq('telegram_id', tgId.toString()).maybeSingle();
        if (resultado.error) { console.error(resultado.error); return; }
        if (!resultado.data) {
            const nuevoUsuario = {
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
                last_withdraw_week: null,
                gameStats: {
                    escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
                }
            };
            await _supabase.from('game_data').insert([nuevoUsuario]);
            userData = Object.assign({}, userData, nuevoUsuario, { id: tgId.toString() });
        } else {
            const datos = resultado.data;
            userData = Object.assign({}, userData, datos, {
                id: tgId.toString(),
                diamonds: Number(datos.diamonds) || 0,
                lvl_piscina: Number(datos.lvl_piscina) || 0,
                lvl_fabrica: Number(datos.lvl_fabrica) || 0,
                lvl_escuela: Number(datos.lvl_escuela) || 0,
                lvl_hospital: Number(datos.lvl_hospital) || 0,
                referral_earnings: Number(datos.referral_earnings) || 0,
                referred_users: datos.referred_users || [],
                premium_expires: datos.premium_expires || null,
                daily_streak: Number(datos.daily_streak) || 0,
                last_daily_claim: datos.last_daily_claim || null,
                haInvertido: datos.haInvertido || false,
                event_progress: datos.event_progress || {},
                accumulated_ton: Number(datos.accumulated_ton) || 0,
                retiradoHoy: Number(datos.retiradoHoy) || 0,
                last_withdraw_week: datos.last_withdraw_week || null,
                referral_code: datos.referral_code || 'REF' + tgId.toString().slice(-6),
                last_ad_watch: datos.last_ad_watch || null,
                last_casino_rescue: datos.last_casino_rescue || null,
                gameStats: datos.gameStats || {
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
        actualizarEventosUI();
        console.log('✅ Datos del usuario cargados correctamente');
    } catch (error) { console.error('Error en loadUserFromDB:', error); }
}

// ==========================================
// PRODUCCIÓN CONTINUA
// ==========================================
function startProduction() {
    setInterval(function() {
        if (!userData.id) return;
        const produccionPorSegundo = getTotalProduction() / 3600;
        userData.diamonds = userData.diamonds + produccionPorSegundo;
        const diamantesElem = document.getElementById('diamonds');
        if (diamantesElem) diamantesElem.textContent = Math.floor(userData.diamonds);
    }, 1000);
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================
async function initApp() {
    console.log('🔄 Iniciando TON CITY...');
    tg.expand();
    tg.ready();
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    if (usuario) {
        userData.id = usuario.id.toString();
        userData.username = usuario.first_name || 'Usuario';
        await loadUserFromDB(usuario.id);
    } else {
        userData.id = 'test_' + Date.now();
        userData.username = 'Usuario Test';
        userData.referral_code = 'REF' + userData.id.slice(-6);
    }
    document.getElementById('user-display').textContent = userData.username;
    await initTONConnect();
    setTimeout(initAds, 3000);
    await updateRealPoolBalance();
    await updateRankingAndPool();
    startProduction();
    actualizarEventosUI();
    setInterval(saveUserData, 10000);
    setInterval(async function() { await updateRankingAndPool(); actualizarEventosUI(); }, 60000);
    window.addEventListener('beforeunload', function() { saveUserData(); });
    console.log('✅ TON CITY - Sistema completamente inicializado');
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
window.onVentaInputChange = onVentaInputChange;
window.setVentaPreset = setVentaPreset;
window.setVentaPresetMax = setVentaPresetMax;
window.venderDiamantes = venderDiamantes;
window.startEventTask = startEventTask;
window.reviveGame = reviveGame;
window.useAdMultiplier = useAdMultiplier;
window.switchTab = switchTab;
window.iniciarJuegoEscuela = iniciarJuegoEscuela;
window.iniciarJuegoFabrica = iniciarJuegoFabrica;
window.iniciarJuegoPiscina = iniciarJuegoPiscina;
window.iniciarJuegoHospital = iniciarJuegoHospital;
window.checkFabricaHitPiece = checkFabricaHitPiece;
window.startSlingshot = startSlingshot;
window.releaseSlingshot = releaseSlingshot;

console.log('📦 TON CITY - Todos los módulos exportados correctamente');
