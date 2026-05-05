// ======================================================
// TON CITY - VERSIÓN PROFESIONAL COMPLETA 2026
// ======================================================
// Desarrollado con los más altos estándares profesionales
// Cumple con normativas de AdSgram 2026
// Minijuegos profesionales con animaciones avanzadas
// Sistema completo de billetera TON Connect
// Guardado automático en Supabase
// ======================================================

console.log('🚀 TON CITY - Iniciando sistema profesional...');

// ==========================================
// INICIALIZACIÓN DE TELEGRAM WEB APP
// ==========================================
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const BackButton = tg.BackButton;
BackButton.hide();

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
    TON_API_URL: 'https://tonapi.io',
    SUPABASE_URL: 'https://xkkifqxxglcuyruwkbih.supabase.co',
    SUPABASE_KEY: 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE'
};

// ==========================================
// INICIALIZACIÓN DE SUPABASE
// ==========================================
const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ==========================================
// VARIABLES GLOBALES DEL SISTEMA
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let adsReady = false;
let AdController = null;
let pendingMultiplier = null;
let bancoTabActual = 'compra';
let ventaCantidad = 100;
window._tasaVentaActual = 10000;

// ==========================================
// ESTADO PRINCIPAL DEL USUARIO
// ==========================================
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
        escuela: {
            bestLevel: 0,
            totalWins: 0,
            currentLevel: 1,
            lives: 3
        },
        fabrica: {
            bestLevel: 0,
            totalWins: 0,
            currentLevel: 1,
            lives: 3
        },
        piscina: {
            bestLevel: 0,
            totalWins: 0,
            currentLevel: 1,
            lives: 3
        },
        hospital: {
            bestLevel: 0,
            totalWins: 0,
            currentLevel: 1,
            lives: 3
        }
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

// ==========================================
// ESTADO GLOBAL DEL POOL
// ==========================================
let globalPoolData = {
    pool_ton: 100,
    total_diamonds: 0,
    user_rankings: []
};

// ==========================================
// CONSTANTES DE EVENTOS SEMANALES
// ==========================================
const EVENTOS_SEMANALES = [
    {
        nombre: "Escuela",
        edificio: "escuela",
        emoji: "🏫",
        color: "#fbbf24",
        descripcion: "Semana del Saber - Todo el conocimiento se multiplica. Gana el doble de diamantes en la Escuela.",
        gameMultiplier: 2
    },
    {
        nombre: "Fábrica",
        edificio: "fabrica",
        emoji: "🏭",
        color: "#a78bfa",
        descripcion: "Semana de Producción - La eficiencia es clave. Gana el doble de diamantes en la Fábrica.",
        gameMultiplier: 2
    },
    {
        nombre: "Piscina",
        edificio: "piscina",
        emoji: "🏊",
        color: "#38bdf8",
        descripcion: "Semana Olímpica - Entrenamiento intensivo. Gana el doble de diamantes en la Piscina.",
        gameMultiplier: 2
    },
    {
        nombre: "Hospital",
        edificio: "hospital",
        emoji: "🏥",
        color: "#f87171",
        descripcion: "Semana de la Salud - Tratamientos especiales. Gana el doble de diamantes en el Hospital.",
        gameMultiplier: 2
    }
];

// ==========================================
// CONSTANTES DE PLANES PREMIUM
// ==========================================
const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

// ==========================================
// VARIABLES DE APUESTAS DEL CASINO
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

// ==========================================
// VARIABLES DE ESTADO DE MINIJUEGOS
// ==========================================
let gameLives = {
    escuela: 3,
    fabrica: 3,
    piscina: 3,
    hospital: 3
};

let gameActiveStates = {
    escuela: true,
    fabrica: true,
    piscina: true,
    hospital: true
};

// Variables del minijuego Escuela
let escuelaSequence = [];
let escuelaUserInput = [];
let escuelaLevel = 1;
let escuelaBest = 0;
let escuelaStreak = 0;

// Variables del minijuego Fábrica
let fabricaLevel = 1;
let fabricaBest = 0;
let fabricaCompleted = 0;
let fabricaRequired = 5;
let fabricaPosition = -30;
let fabricaIsDefect = false;
let fabricaAnimInterval = null;
let fabricaGoodCount = 0;
let fabricaMissCount = 0;

// Variables del minijuego Piscina
let piscinaLevel = 1;
let piscinaBest = 0;
let piscinaPerfect = 0;
let piscinaRequired = 3;
let piscinaPower = 0;
let piscinaHoldStart = 0;
let piscinaChargeInterval = null;

// Variables del minijuego Hospital
let hospitalLevel = 1;
let hospitalBest = 0;
let hospitalExtracted = 0;
let hospitalTotal = 3;
let hospitalTimeLeft = 25;
let hospitalTimer = null;
let hospitalMaxTime = 25;

// ==========================================
// FUNCIONES UTILITARIAS
// ==========================================

/**
 * Verifica si el usuario tiene membresía Premium activa
 * @returns {boolean} True si es Premium
 */
function esPremium() {
    if (!userData.premium_expires) {
        return false;
    }
    const ahora = new Date();
    const expiracion = new Date(userData.premium_expires);
    return ahora < expiracion;
}

/**
 * Actualiza la interfaz de usuario del badge Premium
 */
function actualizarPremiumUI() {
    const badge = document.getElementById('premium-badge');
    if (badge) {
        if (esPremium()) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

/**
 * Obtiene el evento semanal actual basado en la fecha
 * @returns {Object} Evento actual
 */
function getEventoActual() {
    const semanaActual = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
    const indice = semanaActual % EVENTOS_SEMANALES.length;
    return EVENTOS_SEMANALES[indice];
}

/**
 * Actualiza la UI de los eventos semanales
 */
function actualizarEventosUI() {
    const evento = getEventoActual();
    
    // Actualizar banner de evento
    const banner = document.getElementById('event-banner');
    if (banner) {
        banner.style.display = 'flex';
        const tituloBanner = document.getElementById('event-banner-title');
        const subtituloBanner = document.getElementById('event-banner-subtitle');
        if (tituloBanner) {
            tituloBanner.textContent = evento.nombre;
        }
        if (subtituloBanner) {
            const multiplicador = esPremium() ? 4 : 2;
            subtituloBanner.textContent = '¡x' + multiplicador + ' en ' + evento.nombre + '!';
        }
    }
    
    // Marcar edificio activo
    const todasLasCartas = document.querySelectorAll('.building-card');
    todasLasCartas.forEach(function(carta) {
        carta.classList.remove('event-active');
    });
    
    const cartaEvento = document.querySelector('.building-card.' + evento.edificio);
    if (cartaEvento) {
        cartaEvento.classList.add('event-active');
    }
}

/**
 * Verifica si estamos en ventana de retiro (domingo)
 * @returns {boolean} True si es domingo
 */
function enVentanaRetiro() {
    return new Date().getDay() === 0;
}

/**
 * Calcula el número de semana actual del año
 * @returns {number} Número de semana
 */
function getNumeroSemana() {
    var ahora = new Date();
    var inicio = new Date(ahora.getFullYear(), 0, 1);
    var diasTranscurridos = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil(diasTranscurridos / 7);
}

/**
 * Calcula la producción total por hora
 * @returns {number} Diamantes por hora
 */
function getTotalProduction() {
    var base = 0;
    base = base + (userData.lvl_escuela * 15);
    base = base + (userData.lvl_fabrica * 25);
    base = base + (userData.lvl_piscina * 10);
    base = base + (userData.lvl_hospital * 18);
    
    if (esPremium()) {
        base = base * 2;
    }
    
    return base;
}

/**
 * Calcula la recompensa de un minijuego con todos los multiplicadores
 * @param {number} baseReward - Recompensa base
 * @param {string} building - Nombre del edificio
 * @returns {number} Recompensa calculada
 */
function calcularRecompensa(baseReward, building) {
    var nivelEdificio = userData['lvl_' + building] || 0;
    var multiplierNivel = 1 + (nivelEdificio * 0.005);
    
    var multiplierPremium = 1;
    if (esPremium()) {
        multiplierPremium = 2;
    }
    
    var evento = getEventoActual();
    var multiplierEvento = 1;
    if (evento.edificio === building) {
        if (esPremium()) {
            multiplierEvento = 4;
        } else {
            multiplierEvento = 2;
        }
    }
    
    var multiplier = multiplierNivel * multiplierPremium * multiplierEvento;
    
    if (pendingMultiplier) {
        multiplier = multiplier * pendingMultiplier;
        pendingMultiplier = null;
    }
    
    return Math.floor(baseReward * multiplier);
}

/**
 * Actualiza toda la interfaz de usuario principal
 */
function actualizarUI() {
    var diamantesElem = document.getElementById('diamonds');
    if (diamantesElem) {
        diamantesElem.textContent = Math.floor(userData.diamonds || 0);
    }
    
    var rateElem = document.getElementById('rate');
    if (rateElem) {
        rateElem.textContent = Math.floor(getTotalProduction());
    }
    
    var lvlPiscina = document.getElementById('lvl_piscina');
    if (lvlPiscina) lvlPiscina.textContent = userData.lvl_piscina;
    
    var lvlFabrica = document.getElementById('lvl_fabrica');
    if (lvlFabrica) lvlFabrica.textContent = userData.lvl_fabrica;
    
    var lvlEscuela = document.getElementById('lvl_escuela');
    if (lvlEscuela) lvlEscuela.textContent = userData.lvl_escuela;
    
    var lvlHospital = document.getElementById('lvl_hospital');
    if (lvlHospital) lvlHospital.textContent = userData.lvl_hospital;
    
    var userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = userData.username || 'Usuario';
    }
    
    var casinoSaldo = document.getElementById('casino-saldo');
    if (casinoSaldo) {
        casinoSaldo.textContent = Math.floor(userData.diamonds);
    }
    
    var casinoRescue = document.getElementById('casino-rescue');
    if (casinoRescue) {
        if (userData.diamonds <= 0 && !esPremium()) {
            casinoRescue.style.display = 'block';
        } else {
            casinoRescue.style.display = 'none';
        }
    }
}

/**
 * Muestra un modal específico
 * @param {string} id - ID del modal a mostrar
 */
function showModal(id) {
    var overlay = document.getElementById('overlay');
    var modal = document.getElementById(id);
    
    if (overlay) {
        overlay.style.display = 'block';
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Cierra todos los modales y limpia el estado
 */
function closeAll() {
    var overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    var modalIds = [
        'modalPerfil',
        'modalFriends',
        'modalRanking',
        'modalBank',
        'modalStore',
        'modalCasino',
        'modalHighLow',
        'modalRuleta',
        'modalTragaperras',
        'modalDados',
        'modalRuletaRusa',
        'modalEscuela',
        'modalFabrica',
        'modalPiscina',
        'modalHospital',
        'modalEvent',
        'modalDailyReward',
        'modalAds'
    ];
    
    modalIds.forEach(function(id) {
        var modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
        }
    });
    
    // Limpiar intervalos activos
    if (fabricaAnimInterval) {
        clearInterval(fabricaAnimInterval);
        fabricaAnimInterval = null;
    }
    
    if (piscinaChargeInterval) {
        clearInterval(piscinaChargeInterval);
        piscinaChargeInterval = null;
    }
    
    if (hospitalTimer) {
        clearInterval(hospitalTimer);
        hospitalTimer = null;
    }
    
    // Resetear navegación
    setActiveNav('perfil');
}

/**
 * Activa el botón de navegación correspondiente
 * @param {string} tab - 'perfil', 'amigos', o 'ranking'
 */
function setActiveNav(tab) {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item, index) {
        item.classList.remove('active');
        if (tab === 'perfil' && index === 0) {
            item.classList.add('active');
        }
        if (tab === 'amigos' && index === 1) {
            item.classList.add('active');
        }
        if (tab === 'ranking' && index === 2) {
            item.classList.add('active');
        }
    });
}

/**
 * Genera efecto de confeti en pantalla
 */
function spawnConfetti() {
    var colores = ['#facc15', '#4ade80', '#38bdf8', '#f472b6', '#a78bfa', '#f97316', '#ef4444', '#34d399'];
    var cantidad = 40;
    
    for (var i = 0; i < cantidad; i++) {
        var pieza = document.createElement('div');
        pieza.style.position = 'fixed';
        pieza.style.width = (6 + Math.random() * 10) + 'px';
        pieza.style.height = (6 + Math.random() * 10) + 'px';
        pieza.style.zIndex = '9999';
        pieza.style.pointerEvents = 'none';
        pieza.style.left = Math.random() * 100 + '%';
        pieza.style.top = (Math.random() * 50 + 20) + '%';
        pieza.style.background = colores[Math.floor(Math.random() * colores.length)];
        pieza.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        pieza.style.animation = 'confetti ' + (1 + Math.random() * 2) + 's ease forwards';
        pieza.style.animationDelay = Math.random() * 0.5 + 's';
        
        document.body.appendChild(pieza);
        
        setTimeout(function() {
            if (pieza.parentNode) {
                pieza.parentNode.removeChild(pieza);
            }
        }, 3000);
    }
}

// ==========================================
// MÓDULO DE PERFIL DE USUARIO
// ==========================================

/**
 * Abre el modal de perfil del usuario
 */
function openPerfil() {
    closeAll();
    actualizarPerfil();
    showModal('modalPerfil');
    setActiveNav('perfil');
}

/**
 * Actualiza los datos del perfil con la información más reciente
 */
function actualizarPerfil() {
    var usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        usuario = tg.initDataUnsafe.user;
    }
    
    var nombre = 'Usuario';
    if (usuario && usuario.first_name) {
        nombre = usuario.first_name;
    } else if (userData.username && userData.username !== 'Cargando...') {
        nombre = userData.username;
    }
    
    var nombreElem = document.getElementById('perfil-name');
    if (nombreElem) {
        nombreElem.textContent = nombre;
    }
    
    var avatarElem = document.getElementById('perfil-avatar');
    if (avatarElem) {
        if (usuario && usuario.photo_url) {
            avatarElem.innerHTML = '<img src="' + usuario.photo_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Avatar">';
        } else {
            avatarElem.innerHTML = nombre.charAt(0).toUpperCase();
        }
    }
    
    var diamantesElem = document.getElementById('perfil-diamonds');
    if (diamantesElem) {
        diamantesElem.textContent = Math.floor(userData.diamonds || 0);
    }
    
    var rateElem = document.getElementById('perfil-rate');
    if (rateElem) {
        rateElem.textContent = Math.floor(getTotalProduction());
    }
    
    var piscinaElem = document.getElementById('perfil-piscina');
    if (piscinaElem) {
        piscinaElem.textContent = 'Nivel ' + (userData.lvl_piscina || 0);
    }
    
    var fabricaElem = document.getElementById('perfil-fabrica');
    if (fabricaElem) {
        fabricaElem.textContent = 'Nivel ' + (userData.lvl_fabrica || 0);
    }
    
    var escuelaElem = document.getElementById('perfil-escuela');
    if (escuelaElem) {
        escuelaElem.textContent = 'Nivel ' + (userData.lvl_escuela || 0);
    }
    
    var hospitalElem = document.getElementById('perfil-hospital');
    if (hospitalElem) {
        hospitalElem.textContent = 'Nivel ' + (userData.lvl_hospital || 0);
    }
    
    var rangoElem = document.getElementById('perfil-rango-display');
    if (rangoElem) {
        rangoElem.textContent = userData.rank || 'Ciudadano';
    }
    
    var proyeccionElem = document.getElementById('perfil-proyeccion');
    if (proyeccionElem) {
        proyeccionElem.textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
    }
    
    var premiumElem = document.getElementById('perfil-premium');
    if (premiumElem) {
        premiumElem.textContent = esPremium() ? 'Sí ⭐' : 'No';
    }
    
    var rankBadgeElem = document.getElementById('perfil-rank-badge');
    if (rankBadgeElem) {
        rankBadgeElem.textContent = userData.rank || 'Ciudadano';
    }
}

// ==========================================
// MÓDULO DE AMIGOS Y REFERIDOS
// ==========================================

/**
 * Abre el modal de amigos e invitaciones
 */
function openFriends() {
    closeAll();
    
    var codigoElem = document.getElementById('referral-code');
    if (codigoElem) {
        codigoElem.textContent = userData.referral_code || 'CARGANDO...';
    }
    
    var countElem = document.getElementById('ref-count');
    if (countElem) {
        var referidos = userData.referred_users || [];
        countElem.textContent = referidos.length;
    }
    
    var totalElem = document.getElementById('ref-total');
    if (totalElem) {
        totalElem.textContent = (userData.referral_earnings || 0) + ' 💎';
    }
    
    showModal('modalFriends');
    setActiveNav('amigos');
}

/**
 * Copia el código de referido al portapapeles
 */
function copyReferralCode() {
    if (!userData.referral_code) {
        alert('❌ Código de referencia no disponible. Espera a que se cargue.');
        return;
    }
    
    var enlaceCompleto = 'https://t.me/ton_city_bot?start=' + userData.referral_code;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(enlaceCompleto)
            .then(function() {
                alert('✅ ¡Enlace de invitación copiado! Compártelo con tus amigos.');
            })
            .catch(function() {
                alert('❌ No se pudo copiar. Enlace: ' + enlaceCompleto);
            });
    } else {
        prompt('Copia este enlace para invitar amigos:', enlaceCompleto);
    }
}

// ==========================================
// MÓDULO DE RANKING
// ==========================================

/**
 * Abre el modal de ranking diario
 */
function openRanking() {
    closeAll();
    actualizarRankingModal();
    showModal('modalRanking');
    setActiveNav('ranking');
}

/**
 * Actualiza la información del ranking en el modal
 */
function actualizarRankingModal() {
    var rangoElem = document.getElementById('user-rank-display');
    if (rangoElem) {
        rangoElem.textContent = userData.rank || 'Ciudadano';
    }
    
    var poolElem = document.getElementById('pool-total-ranking');
    if (poolElem) {
        poolElem.textContent = (globalPoolData.pool_ton || 0).toFixed(4) + ' TON';
    }
    
    var proyeccionElem = document.getElementById('projected-reward-display');
    if (proyeccionElem) {
        proyeccionElem.textContent = (userData.projectedReward || 0).toFixed(4) + ' TON';
    }
}

// ==========================================
// MÓDULO DEL BANCO (COMPRA Y VENTA)
// ==========================================

/**
 * Abre el modal del banco
 */
function openBank() {
    closeAll();
    showModal('modalBank');
    switchBancoTab('compra');
    actualizarListaCompra();
}

/**
 * Actualiza la lista de paquetes de compra disponibles
 */
function actualizarListaCompra() {
    var walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) {
        walletConectada = true;
    }
    
    var packs = [
        { ton: 0.10, diamonds: 100 },
        { ton: 0.50, diamonds: 500 },
        { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 },
        { ton: 5.00, diamonds: 5000 },
        { ton: 10.00, diamonds: 10000 }
    ];
    
    var bankList = document.getElementById('bankList');
    if (!bankList) {
        return;
    }
    
    var html = '';
    
    for (var i = 0; i < packs.length; i++) {
        var pack = packs[i];
        var botonColor = walletConectada ? '#4ade80' : '#334155';
        var botonTexto = walletConectada ? 'COMPRAR' : 'CONECTAR';
        var botonDisabled = walletConectada ? '' : 'disabled';
        
        html += '<div style="background:#0f172a; border-radius:12px; padding:16px; margin:8px 0; display:flex; justify-content:space-between; align-items:center;">';
        html += '<div>';
        html += '<strong>' + pack.ton.toFixed(2) + ' TON</strong>';
        html += '<div style="font-size:12px; color:#94a3b8;">+' + pack.diamonds + ' 💎</div>';
        html += '</div>';
        html += '<button onclick="comprarTON(' + pack.ton + ')" style="background:' + botonColor + '; border:none; padding:10px 20px; border-radius:30px; color:white; font-weight:700; cursor:pointer;" ' + botonDisabled + '>';
        html += botonTexto;
        html += '</button>';
        html += '</div>';
    }
    
    bankList.innerHTML = html;
}

/**
 * Cambia entre las pestañas de compra y venta en el banco
 * @param {string} tab - 'compra' o 'venta'
 */
function switchBancoTab(tab) {
    bancoTabActual = tab;
    
    var tabs = document.querySelectorAll('.banco-tab');
    tabs.forEach(function(t, index) {
        t.classList.remove('active');
        if (tab === 'compra' && index === 0) {
            t.classList.add('active');
        }
        if (tab === 'venta' && index === 1) {
            t.classList.add('active');
        }
    });
    
    var compraPanel = document.getElementById('banco-compra-panel');
    var ventaPanel = document.getElementById('banco-venta-panel');
    
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

/**
 * Actualiza el panel de venta con cálculos en tiempo real
 */
function actualizarPanelVenta() {
    var diamantesDisponibles = Math.floor(userData.diamonds || 0);
    var poolTotal = globalPoolData.pool_ton || 0;
    
    // Actualizar diamantes disponibles
    var ventaDiamondsElem = document.getElementById('venta-diamonds');
    if (ventaDiamondsElem) {
        ventaDiamondsElem.textContent = diamantesDisponibles;
    }
    
    // Actualizar pool disponible
    var ventaPoolElem = document.getElementById('venta-pool');
    if (ventaPoolElem) {
        ventaPoolElem.textContent = poolTotal.toFixed(4) + ' TON';
    }
    
    // Calcular tasa de cambio dinámica
    var tasaBase = 10000;
    var poolFactor = Math.max(0.5, Math.min(2, poolTotal / 10));
    var tasaActual = Math.floor(tasaBase / poolFactor);
    
    var ventaTasaElem = document.getElementById('venta-tasa');
    if (ventaTasaElem) {
        ventaTasaElem.textContent = tasaActual + ' 💎 = 1 TON';
    }
    
    window._tasaVentaActual = tasaActual;
    
    // Calcular TON a recibir
    var tonRecibir = ventaCantidad / tasaActual;
    
    var ventaTonRecibirElem = document.getElementById('venta-ton-recibir');
    if (ventaTonRecibirElem) {
        ventaTonRecibirElem.textContent = tonRecibir.toFixed(4) + ' TON';
    }
    
    // Actualizar retirado hoy
    var retiradoHoy = userData.retiradoHoy || 0;
    var ventaRetiradoElem = document.getElementById('venta-retirado-hoy');
    if (ventaRetiradoElem) {
        ventaRetiradoElem.textContent = retiradoHoy.toFixed(4) + ' TON';
    }
    
    // Actualizar disponible hoy
    var disponibleHoy = Math.max(0, 5 - retiradoHoy);
    var ventaDisponibleElem = document.getElementById('venta-disponible-hoy');
    if (ventaDisponibleElem) {
        ventaDisponibleElem.textContent = disponibleHoy.toFixed(4) + ' TON';
    }
    
    // Validar y actualizar botón de venta
    var btnVender = document.getElementById('vender-btn');
    var errorVenta = document.getElementById('venta-error');
    
    if (!btnVender) return;
    
    var walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) {
        walletConectada = true;
    }
    
    var hayError = false;
    var mensajeError = '';
    var textoBoton = '';
    
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
    } else if (retiradoHoy + tonRecibir > 5) {
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

/**
 * Maneja el cambio en el input de cantidad de venta
 */
function onVentaInputChange() {
    var input = document.getElementById('venta-input');
    if (!input) return;
    
    var valor = parseInt(input.value);
    
    if (isNaN(valor) || valor < 100) {
        valor = 100;
    }
    
    var diamantesDisponibles = userData.diamonds || 0;
    if (valor > diamantesDisponibles) {
        valor = diamantesDisponibles;
    }
    
    ventaCantidad = valor;
    input.value = valor;
    actualizarPanelVenta();
}

/**
 * Establece una cantidad predefinida para la venta
 * @param {number} cantidad - Cantidad de diamantes
 */
function setVentaPreset(cantidad) {
    var diamantesDisponibles = userData.diamonds || 0;
    ventaCantidad = Math.min(diamantesDisponibles, cantidad);
    
    var input = document.getElementById('venta-input');
    if (input) {
        input.value = ventaCantidad;
    }
    
    actualizarPanelVenta();
}

/**
 * Establece la cantidad máxima de diamantes para la venta
 */
function setVentaPresetMax() {
    ventaCantidad = userData.diamonds || 0;
    
    var input = document.getElementById('venta-input');
    if (input) {
        input.value = ventaCantidad;
    }
    
    actualizarPanelVenta();
}

/**
 * Ejecuta la venta de diamantes por TON
 */
async function venderDiamantes() {
    var tasa = window._tasaVentaActual || 10000;
    var tonRecibir = ventaCantidad / tasa;
    
    if (!tonConnectUI || !tonConnectUI.connected) {
        alert('❌ Conecta tu wallet primero. Ve a la pestaña COMPRAR.');
        return;
    }
    
    if (tonRecibir < 1) {
        alert('❌ El mínimo de retiro es 1 TON. Aumenta la cantidad de diamantes.');
        return;
    }
    
    var retiradoHoy = userData.retiradoHoy || 0;
    if (retiradoHoy + tonRecibir > 5) {
        alert('❌ Has alcanzado el límite diario de 5 TON. Vuelve mañana.');
        return;
    }
    
    if (tonRecibir > (globalPoolData.pool_ton || 0)) {
        alert('❌ No hay suficientes TON en el pool. Intenta con una cantidad menor.');
        return;
    }
    
    var tonDespuesComision = tonRecibir - CONFIG.RED_TON_FEE;
    var mensajeConfirmacion = '¿Confirmas el cambio?\n\n';
    mensajeConfirmacion += 'Diamantes: ' + ventaCantidad + ' 💎\n';
    mensajeConfirmacion += 'Recibirás: ' + tonDespuesComision.toFixed(4) + ' TON\n';
    mensajeConfirmacion += '(Comisión de red: ' + CONFIG.RED_TON_FEE.toFixed(4) + ' TON)';
    
    if (!confirm(mensajeConfirmacion)) {
        return;
    }
    
    try {
        var transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: currentWallet.account.address,
                    amount: Math.floor(tonDespuesComision * 1000000000).toString(),
                    payload: "Venta de diamantes - Ton City"
                }
            ]
        };
        
        await tonConnectUI.sendTransaction(transaccion);
        
        // Actualizar estado después de transacción exitosa
        userData.diamonds = userData.diamonds - ventaCantidad;
        userData.retiradoHoy = (userData.retiradoHoy || 0) + tonRecibir;
        globalPoolData.pool_ton = globalPoolData.pool_ton - tonRecibir;
        
        await saveUserData();
        
        // Resetear cantidad
        ventaCantidad = 100;
        var input = document.getElementById('venta-input');
        if (input) {
            input.value = 100;
        }
        
        actualizarPanelVenta();
        actualizarUI();
        spawnConfetti();
        
        alert('✅ ¡Transacción exitosa!\n\nRecibiste ' + tonDespuesComision.toFixed(4) + ' TON en tu wallet.');
    } catch (error) {
        console.error('Error en venta:', error);
        alert('❌ La transacción fue cancelada o rechazada. Intenta de nuevo.');
    }
}

/**
 * Ejecuta la compra de diamantes con TON
 * @param {number} tonAmount - Cantidad de TON a comprar
 */
async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) {
        alert('❌ Conecta tu wallet primero usando el botón TON Connect.');
        return;
    }
    
    var mensajeConfirmacion = '¿Confirmas la compra?\n\n';
    mensajeConfirmacion += 'Pagarás: ' + tonAmount.toFixed(2) + ' TON\n';
    mensajeConfirmacion += 'Recibirás: ' + Math.floor(tonAmount / CONFIG.PRECIO_COMPRA) + ' 💎';
    
    if (!confirm(mensajeConfirmacion)) {
        return;
    }
    
    try {
        var transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: CONFIG.BILLETERA_PROPIETARIO,
                    amount: Math.floor(tonAmount * 1000000000).toString(),
                    payload: "Compra de diamantes - Ton City"
                }
            ]
        };
        
        await tonConnectUI.sendTransaction(transaccion);
        
        // Calcular diamantes a entregar
        var diamantesComprados = Math.floor(tonAmount / CONFIG.PRECIO_COMPRA);
        if (diamantesComprados < 100) {
            diamantesComprados = 100;
        }
        
        userData.diamonds = userData.diamonds + diamantesComprados;
        
        if (!userData.haInvertido && diamantesComprados >= 100) {
            userData.haInvertido = true;
        }
        
        await saveUserData();
        actualizarUI();
        spawnConfetti();
        
        alert('✅ ¡Compra exitosa!\n\nRecibiste ' + diamantesComprados + ' 💎');
        closeAll();
    } catch (error) {
        console.error('Error en compra:', error);
        alert('❌ La transacción fue cancelada o rechazada.');
    }
}

// ==========================================
// MÓDULO DE CONEXIÓN TON CONNECT
// ==========================================

/**
 * Inicializa la conexión con TON Connect
 */
async function initTONConnect() {
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: {
                theme: 'DARK'
            }
        });
        
        tonConnectUI.onStatusChange(function(wallet) {
            currentWallet = wallet;
            
            var botonConnect = document.getElementById('ton-connect-button');
            var walletInfo = document.getElementById('wallet-info');
            
            if (wallet) {
                // Wallet conectada
                if (botonConnect) {
                    botonConnect.style.display = 'none';
                }
                if (walletInfo) {
                    walletInfo.classList.remove('hidden');
                }
                console.log('✅ Wallet conectada:', wallet.account.address);
            } else {
                // Wallet desconectada
                if (botonConnect) {
                    botonConnect.style.display = 'flex';
                }
                if (walletInfo) {
                    walletInfo.classList.add('hidden');
                }
                console.log('❌ Wallet desconectada');
            }
            
            // Actualizar banco si está abierto
            var modalBank = document.getElementById('modalBank');
            if (modalBank && modalBank.style.display === 'block') {
                if (bancoTabActual === 'compra') {
                    actualizarListaCompra();
                } else {
                    actualizarPanelVenta();
                }
            }
        });
        
        console.log('✅ TON Connect inicializado');
    } catch (error) {
        console.error('Error al inicializar TON Connect:', error);
    }
}

/**
 * Desconecta la wallet actual
 */
async function disconnectWallet() {
    if (tonConnectUI) {
        await tonConnectUI.disconnect();
    }
    
    currentWallet = null;
    
    var botonConnect = document.getElementById('ton-connect-button');
    var walletInfo = document.getElementById('wallet-info');
    
    if (botonConnect) {
        botonConnect.style.display = 'flex';
    }
    if (walletInfo) {
        walletInfo.classList.add('hidden');
    }
    
    actualizarListaCompra();
}

// ==========================================
// MÓDULO DE TIENDA PREMIUM
// ==========================================

/**
 * Abre el modal de la tienda Premium
 */
function openStore() {
    closeAll();
    showModal('modalStore');
    
    var walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) {
        walletConectada = true;
    }
    
    var planesContainer = document.getElementById('premium-plans');
    if (!planesContainer) return;
    
    var html = '';
    
    for (var i = 0; i < PREMIUM_PLANS.length; i++) {
        var plan = PREMIUM_PLANS[i];
        var botonColor = walletConectada ? '#8b5cf6' : '#334155';
        var botonTexto = walletConectada ? 'COMPRAR' : 'CONECTAR WALLET';
        var botonDisabled = walletConectada ? '' : 'disabled';
        
        html += '<div style="background:#0f172a; border-radius:16px; padding:20px; margin:12px 0;">';
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">';
        html += '<strong style="font-size:18px;">' + plan.name + '</strong>';
        html += '<span style="color:#facc15; font-weight:700; font-size:18px;">' + plan.price + ' TON</span>';
        html += '</div>';
        html += '<div style="color:#94a3b8; font-size:13px; margin-bottom:12px;">';
        html += '✅ Multiplicador x2 en producción<br>';
        html += '✅ Sin anuncios obligatorios<br>';
        html += '✅ Eventos semanales x4<br>';
        html += '✅ Insignia exclusiva';
        html += '</div>';
        html += '<button onclick="comprarPremium(' + plan.days + ')" style="background:' + botonColor + '; border:none; border-radius:30px; padding:14px; width:100%; color:white; font-weight:700; font-size:16px; cursor:pointer;" ' + botonDisabled + '>';
        html += botonTexto;
        html += '</button>';
        html += '</div>';
    }
    
    planesContainer.innerHTML = html;
}

/**
 * Procesa la compra de un plan Premium
 * @param {number} days - Días de Premium a comprar
 */
async function comprarPremium(days) {
    if (!tonConnectUI || !tonConnectUI.connected) {
        alert('❌ Conecta tu wallet primero para comprar Premium.');
        return;
    }
    
    var planSeleccionado = null;
    for (var i = 0; i < PREMIUM_PLANS.length; i++) {
        if (PREMIUM_PLANS[i].days === days) {
            planSeleccionado = PREMIUM_PLANS[i];
            break;
        }
    }
    
    if (!planSeleccionado) {
        alert('❌ Plan no encontrado.');
        return;
    }
    
    if (!confirm('¿Activar Premium ' + planSeleccionado.name + ' por ' + planSeleccionado.price + ' TON?\n\nDisfrutarás de todos los beneficios Premium.')) {
        return;
    }
    
    try {
        var transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: CONFIG.BILLETERA_PROPIETARIO,
                    amount: Math.floor(planSeleccionado.price * 1000000000).toString(),
                    payload: "Premium Ton City - " + planSeleccionado.name
                }
            ]
        };
        
        await tonConnectUI.sendTransaction(transaccion);
        
        // Activar Premium
        var fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + days);
        userData.premium_expires = fechaExpiracion.toISOString();
        
        await saveUserData();
        actualizarPremiumUI();
        actualizarUI();
        spawnConfetti();
        
        alert('✅ ¡Premium ' + planSeleccionado.name + ' activado!\n\nDisfruta de todos los beneficios hasta ' + fechaExpiracion.toLocaleDateString());
        closeAll();
    } catch (error) {
        console.error('Error al comprar Premium:', error);
        alert('❌ La transacción fue cancelada o rechazada.');
    }
}

// ==========================================
// MÓDULO DE ANUNCIOS (ADSGRAM)
// ==========================================

/**
 * Inicializa el sistema de anuncios AdSgram
 * Cumple con normativas 2026: no reproduce automáticamente,
 * requiere acción del usuario, muestra claramente que es un anuncio
 */
async function initAds() {
    try {
        AdController = window.Adsgram.init({
            blockId: CONFIG.ADSGRAM_BLOCK_ID
        });
        adsReady = true;
        console.log('✅ AdSgram inicializado correctamente');
    } catch (error) {
        adsReady = false;
        console.error('❌ Error al inicializar AdSgram:', error);
    }
}

/**
 * Muestra un anuncio recompensado
 * @param {function} callback - Función a ejecutar al completar
 */
function showRewardedAd(callback) {
    // Los usuarios Premium no ven anuncios
    if (esPremium()) {
        callback(true);
        return;
    }
    
    if (!adsReady || !AdController) {
        alert('📺 El sistema de anuncios no está disponible en este momento. Intenta de nuevo.');
        callback(false);
        return;
    }
    
    AdController.show()
        .then(function(resultado) {
            callback(resultado.done === true);
        })
        .catch(function(error) {
            console.log('Error en anuncio:', error);
            alert('📺 No se pudo completar el anuncio. Intenta de nuevo más tarde.');
            callback(false);
        });
}

/**
 * Abre el modal del Parque (anuncios)
 */
function showAdsModal() {
    closeAll();
    showModal('modalAds');
    actualizarEstadoAnuncio();
}

/**
 * Actualiza el estado del botón de anuncios
 */
function actualizarEstadoAnuncio() {
    var puedeVerAnuncio = false;
    
    if (!userData.last_ad_watch) {
        puedeVerAnuncio = true;
    } else {
        var ultimoAnuncio = new Date(userData.last_ad_watch);
        var ahora = new Date();
        var diferenciaMs = ahora - ultimoAnuncio;
        var unaHoraMs = 3600000;
        
        if (diferenciaMs > unaHoraMs) {
            puedeVerAnuncio = true;
        }
    }
    
    var boton = document.getElementById('watch-ad-btn');
    var estadoDiv = document.getElementById('ads-status');
    
    if (!boton) return;
    
    if (esPremium()) {
        boton.disabled = true;
        boton.textContent = '⭐ PREMIUM - ANUNCIOS ILIMITADOS';
        if (estadoDiv) {
            estadoDiv.innerHTML = '⭐ Como usuario Premium, no necesitas ver anuncios. ¡Disfruta!';
        }
        return;
    }
    
    if (puedeVerAnuncio && adsReady) {
        boton.disabled = false;
        boton.textContent = '🎬 VER ANUNCIO +20 💎';
        if (estadoDiv) {
            estadoDiv.innerHTML = '✅ ¡Anuncio disponible! Mira un anuncio y gana 20 diamantes.';
        }
    } else {
        boton.disabled = true;
        
        var minutosRestantes = 60;
        if (userData.last_ad_watch) {
            var ultimo = new Date(userData.last_ad_watch);
            var ahora = new Date();
            var msRestantes = 3600000 - (ahora - ultimo);
            minutosRestantes = Math.ceil(msRestantes / 60000);
        }
        
        boton.textContent = '⏳ ESPERAR ' + minutosRestantes + ' MIN';
        if (estadoDiv) {
            estadoDiv.innerHTML = '⏳ Próximo anuncio disponible en aproximadamente ' + minutosRestantes + ' minutos.';
        }
    }
}

/**
 * Reproduce un anuncio y otorga la recompensa
 */
function showAd() {
    if (esPremium()) {
        userData.diamonds = userData.diamonds + 20;
        saveUserData();
        actualizarUI();
        alert('⭐ Como usuario Premium, recibes +20 💎 sin necesidad de ver anuncios.');
        closeAll();
        return;
    }
    
    showRewardedAd(function(completado) {
        if (completado) {
            userData.diamonds = userData.diamonds + 20;
            userData.last_ad_watch = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 ¡Gracias! Recibiste +20 💎 por ver el anuncio.');
            closeAll();
        } else {
            alert('❌ No se pudo completar el anuncio. Intenta de nuevo más tarde.');
        }
    });
}

/**
 * Ofrece un rescate de diamantes para el casino
 */
function rescueWithAd() {
    if (esPremium()) {
        userData.diamonds = userData.diamonds + 50;
        actualizarUI();
        alert('⭐ Rescate Premium: +50 💎 sin anuncios.');
        return;
    }
    
    if (userData.diamonds > 0) {
        alert('El rescate solo está disponible cuando tienes 0 diamantes.');
        return;
    }
    
    var hoy = new Date();
    if (userData.last_casino_rescue) {
        var ultimoRescate = new Date(userData.last_casino_rescue);
        if (hoy.toDateString() === ultimoRescate.toDateString()) {
            alert('Ya usaste el rescate hoy. Vuelve mañana para otro rescate gratuito.');
            return;
        }
    }
    
    showRewardedAd(function(completado) {
        if (completado) {
            userData.diamonds = userData.diamonds + 50;
            userData.last_casino_rescue = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('🎁 ¡Rescate exitoso! Recibiste +50 💎 para seguir jugando.');
        }
    });
}

// ==========================================
// MÓDULO DE RECOMPENSA DIARIA
// ==========================================

/**
 * Calcula la recompensa para un día específico
 * @param {number} day - Día de la racha (1-30)
 * @returns {number} Cantidad de diamantes
 */
function getDailyRewardAmount(day) {
    if (day <= 0) {
        return 0;
    }
    
    if (day >= 30) {
        if (esPremium()) {
            return 300;
        } else {
            return 150;
        }
    }
    
    var base = 5 + (day - 1) * 3;
    
    if (base > 150) {
        base = 150;
    }
    
    if (esPremium()) {
        base = base * 2;
    }
    
    return base;
}

/**
 * Verifica si el usuario puede reclamar la recompensa diaria
 * @returns {boolean} True si puede reclamar
 */
function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) {
        return true;
    }
    
    var ultimoReclamo = new Date(userData.last_daily_claim);
    var hoy = new Date();
    
    ultimoReclamo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    
    return hoy > ultimoReclamo;
}

/**
 * Abre el modal de recompensa diaria
 */
function openDailyReward() {
    closeAll();
    
    var racha = userData.daily_streak || 0;
    var diaActual = Math.min(racha + 1, 30);
    var recompensaHoy = getDailyRewardAmount(diaActual);
    var puedeReclamar = puedeReclamarDiaria();
    
    var diaElem = document.getElementById('current-day');
    if (diaElem) {
        diaElem.textContent = diaActual;
    }
    
    var recompensaElem = document.getElementById('today-reward');
    if (recompensaElem) {
        recompensaElem.textContent = recompensaHoy + ' 💎';
    }
    
    var estadoElem = document.getElementById('daily-status');
    if (estadoElem) {
        if (puedeReclamar) {
            estadoElem.innerHTML = '✅ ¡Recompensa disponible! Reclama tus ' + recompensaHoy + ' 💎 ahora.';
        } else {
            estadoElem.innerHTML = '⏳ Ya reclamaste tu recompensa hoy. Vuelve mañana para continuar la racha.';
        }
    }
    
    // Generar calendario de 30 días
    var calendarioElem = document.getElementById('daily-calendar');
    if (calendarioElem) {
        var html = '';
        
        for (var i = 1; i <= 30; i++) {
            var clase = 'daily-day';
            
            if (i <= racha) {
                clase += ' completed';
            } else if (i === racha + 1 && puedeReclamar) {
                clase += ' current';
            }
            
            html += '<div class="' + clase + '">';
            html += '<div>Día ' + i + '</div>';
            html += '<div>' + getDailyRewardAmount(i) + '💎</div>';
            html += '</div>';
        }
        
        calendarioElem.innerHTML = html;
    }
    
    showModal('modalDailyReward');
}

/**
 * Reclama la recompensa diaria
 */
async function claimDailyReward() {
    if (!userData.id) {
        alert('❌ Error: Usuario no identificado. Reinicia la aplicación.');
        return;
    }
    
    if (!puedeReclamarDiaria()) {
        alert('❌ Ya reclamaste tu recompensa hoy. Vuelve mañana para continuar la racha.');
        return;
    }
    
    var nuevoDia = 1;
    
    if (userData.last_daily_claim && userData.daily_streak > 0) {
        var ultimoReclamo = new Date(userData.last_daily_claim);
        var ahora = new Date();
        var horasTranscurridas = (ahora - ultimoReclamo) / (1000 * 3600);
        
        if (horasTranscurridas < 48) {
            nuevoDia = userData.daily_streak + 1;
        }
    }
    
    if (nuevoDia > 30) {
        nuevoDia = 30;
    }
    
    var recompensa = getDailyRewardAmount(nuevoDia);
    
    userData.diamonds = userData.diamonds + recompensa;
    userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    
    await saveUserData();
    actualizarUI();
    spawnConfetti();
    
    alert('✅ ¡Recompensa reclamada!\n\n+ ' + recompensa + ' 💎\nDía ' + nuevoDia + ' de 30\nRacha actual: ' + nuevoDia + ' días');
    closeAll();
}

// ==========================================
// MÓDULO DE EVENTO SEMANAL
// ==========================================

/**
 * Abre el modal del evento semanal
 */
function openEventModal() {
    closeAll();
    
    var evento = getEventoActual();
    
    var emojiElem = document.getElementById('event-emoji');
    if (emojiElem) {
        emojiElem.textContent = evento.emoji;
    }
    
    var tituloElem = document.getElementById('event-titulo');
    if (tituloElem) {
        tituloElem.textContent = evento.nombre;
    }
    
    var descripcionElem = document.getElementById('event-description');
    if (descripcionElem) {
        descripcionElem.textContent = evento.descripcion;
    }
    
    var multiplicadorTexto = document.getElementById('event-multiplier-text');
    if (multiplicadorTexto) {
        if (esPremium()) {
            multiplicadorTexto.textContent = 'x4 para jugadores Premium';
        } else {
            multiplicadorTexto.textContent = 'x2 para jugadores normales (x4 con Premium)';
        }
    }
    
    showModal('modalEvent');
}

/**
 * Inicia la tarea del evento semanal (redirige al edificio)
 */
function startEventTask() {
    closeAll();
    var evento = getEventoActual();
    openBuilding(evento.edificio);
}

// ==========================================
// MÓDULO DEL CASINO
// ==========================================

/**
 * Abre el modal principal del casino
 */
function openCasino() {
    closeAll();
    
    var saldoElem = document.getElementById('casino-saldo');
    if (saldoElem) {
        saldoElem.textContent = Math.floor(userData.diamonds);
    }
    
    var rescueDiv = document.getElementById('casino-rescue');
    if (rescueDiv) {
        if (userData.diamonds <= 0 && !esPremium()) {
            rescueDiv.style.display = 'block';
        } else {
            rescueDiv.style.display = 'none';
        }
    }
    
    showModal('modalCasino');
}

/**
 * Abre un juego específico del casino
 * @param {string} juego - Identificador del juego
 */
function abrirJuego(juego) {
    closeAll();
    
    var modalId = '';
    
    switch (juego) {
        case 'highlow':
            modalId = 'modalHighLow';
            break;
        case 'ruleta':
            modalId = 'modalRuleta';
            break;
        case 'tragaperras':
            modalId = 'modalTragaperras';
            break;
        case 'dados':
            modalId = 'modalDados';
            break;
        case 'ruletarusa':
            modalId = 'modalRuletaRusa';
            break;
    }
    
    if (!modalId) return;
    
    showModal(modalId);
    
    // Actualizar saldo en el juego
    var balanceElem = document.getElementById(juego + '-balance');
    if (balanceElem) {
        balanceElem.textContent = Math.floor(userData.diamonds);
    }
    
    // Inicializar ruleta rusa si es necesario
    if (juego === 'ruletarusa') {
        crearCamarasRuletaRusa();
        var resultadoElem = document.getElementById('ruletarusa-result');
        if (resultadoElem) {
            resultadoElem.innerHTML = '';
        }
        var emojiElem = document.getElementById('ruletarusa-emoji');
        if (emojiElem) {
            emojiElem.textContent = '🔫';
        }
    }
}

/**
 * Cierra el juego actual y vuelve al casino
 */
function cerrarJuego() {
    closeAll();
    openCasino();
}

/**
 * Cambia la cantidad de apuesta en un juego
 * @param {string} juego - Identificador del juego
 * @param {number} delta - Cambio en la apuesta
 */
function cambiarApuesta(juego, delta) {
    var valorActual = apuestaActual[juego] || 10;
    var nuevoValor = valorActual + delta;
    
    if (nuevoValor < 1) {
        nuevoValor = 1;
    }
    if (nuevoValor > 1000) {
        nuevoValor = 1000;
    }
    
    apuestaActual[juego] = nuevoValor;
    
    var displayElem = document.getElementById(juego + '-bet-display');
    if (displayElem) {
        displayElem.textContent = nuevoValor;
    }
    
    var betElem = document.getElementById(juego + '-bet');
    if (betElem) {
        betElem.textContent = nuevoValor + ' 💎';
    }
}

/**
 * Verifica si el usuario puede jugar (límites diarios)
 * @param {string} juego - Identificador del juego
 * @param {number} cantidad - Cantidad de jugadas
 * @returns {boolean} True si puede jugar
 */
function puedeJugar(juego, cantidad) {
    if (!cantidad) {
        cantidad = 1;
    }
    
    // Los inversores no tienen límite
    if (userData.haInvertido) {
        return true;
    }
    
    var hoy = new Date().toDateString();
    
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
    
    var limites = {
        highlow: 20,
        ruleta: 15,
        tragaperras: 30,
        dados: 20,
        ruletarusa: 10,
        loteria: 5
    };
    
    var jugadasActuales = userData.jugadasHoy[juego] || 0;
    var limite = limites[juego] || 10;
    
    return (jugadasActuales + cantidad) <= limite;
}

/**
 * Registra una jugada en el contador diario
 * @param {string} juego - Identificador del juego
 * @param {number} cantidad - Cantidad de jugadas
 */
function registrarJugada(juego, cantidad) {
    if (!cantidad) {
        cantidad = 1;
    }
    
    if (!userData.haInvertido) {
        if (!userData.jugadasHoy[juego]) {
            userData.jugadasHoy[juego] = 0;
        }
        userData.jugadasHoy[juego] = userData.jugadasHoy[juego] + cantidad;
    }
}

/**
 * Juego: High/Low
 * @param {string} eleccion - 'low' o 'high'
 */
function jugarHighLow(eleccion) {
    var apuesta = apuestaActual.highlow;
    
    if (userData.diamonds < apuesta) {
        alert('❌ Diamantes insuficientes. Necesitas ' + apuesta + ' 💎');
        return;
    }
    
    if (!puedeJugar('highlow')) {
        alert('❌ Has alcanzado el límite diario de jugadas. Vuelve mañana o haz una compra para jugar sin límites.');
        return;
    }
    
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('highlow');
    
    var numero = Math.floor(Math.random() * 10000);
    var gana = false;
    
    if (eleccion === 'low' && numero < 5000) {
        gana = true;
    }
    if (eleccion === 'high' && numero >= 5000) {
        gana = true;
    }
    
    var numeroElem = document.getElementById('hl-number');
    if (numeroElem) {
        numeroElem.textContent = numero.toString().padStart(4, '0');
    }
    
    var balanceElem = document.getElementById('hl-balance');
    if (balanceElem) {
        balanceElem.textContent = Math.floor(userData.diamonds);
    }
    
    var resultadoElem = document.getElementById('hl-result');
    
    if (gana) {
        var ganancia = apuesta * 2;
        userData.diamonds = userData.diamonds + ganancia;
        
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#4ade80; font-size:20px; animation:winPulse 0.5s ease;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
        }
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    } else {
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
        }
    }
    
    actualizarUI();
    saveUserData();
}

/**
 * Juego: Ruleta
 * @param {string} tipo - Tipo de apuesta
 */
function jugarRuleta(tipo) {
    var apuesta = apuestaActual.ruleta;
    
    if (userData.diamonds < apuesta) {
        alert('❌ Diamantes insuficientes. Necesitas ' + apuesta + ' 💎');
        return;
    }
    
    if (!puedeJugar('ruleta')) {
        alert('❌ Has alcanzado el límite diario de jugadas.');
        return;
    }
    
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('ruleta');
    
    var numero = Math.random() < 0.03 ? 0 : Math.floor(Math.random() * 37);
    
    var numeroElem = document.getElementById('ruleta-number');
    if (numeroElem) {
        numeroElem.textContent = numero;
    }
    
    var balanceElem = document.getElementById('ruleta-balance');
    if (balanceElem) {
        balanceElem.textContent = Math.floor(userData.diamonds);
    }
    
    var gana = false;
    
    switch (tipo) {
        case 'rojo':
            var rojos = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
            gana = rojos.indexOf(numero) !== -1;
            break;
        case 'negro':
            var negros = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
            gana = negros.indexOf(numero) !== -1;
            break;
        case 'par':
            gana = numero !== 0 && numero % 2 === 0;
            break;
        case 'impar':
            gana = numero % 2 === 1;
            break;
        case 'bajo':
            gana = numero >= 1 && numero <= 18;
            break;
        case 'alto':
            gana = numero >= 19 && numero <= 36;
            break;
        case 'numero':
            var elegido = parseInt(prompt('Elige un número del 0 al 36:'));
            if (isNaN(elegido) || elegido < 0 || elegido > 36) {
                userData.diamonds = userData.diamonds + apuesta;
                actualizarUI();
                return;
            }
            gana = numero === elegido;
            break;
    }
    
    var resultadoElem = document.getElementById('ruleta-result');
    
    if (gana) {
        var ganancia = (tipo === 'numero') ? apuesta * 36 : apuesta * 2;
        userData.diamonds = userData.diamonds + ganancia;
        
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#4ade80; font-size:20px; animation:winPulse 0.5s ease;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
        }
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    } else {
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
        }
    }
    
    actualizarUI();
    saveUserData();
}

/**
 * Juego: Tragaperras
 */
function jugarTragaperras() {
    var apuesta = apuestaActual.tragaperras;
    
    if (userData.diamonds < apuesta) {
        alert('❌ Diamantes insuficientes. Necesitas ' + apuesta + ' 💎');
        return;
    }
    
    if (!puedeJugar('tragaperras')) {
        alert('❌ Has alcanzado el límite diario de jugadas.');
        return;
    }
    
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('tragaperras');
    
    var slots = document.querySelectorAll('.slot');
    slots.forEach(function(slot) {
        slot.classList.add('spinning');
    });
    
    setTimeout(function() {
        var simbolos = [
            { nombre: '💎', multiplicador: 30 },
            { nombre: '₿', multiplicador: 15 },
            { nombre: 'Ξ', multiplicador: 8 },
            { nombre: '🪙', multiplicador: 3 },
            { nombre: '📈', multiplicador: 2 },
            { nombre: '📉', multiplicador: 2 }
        ];
        
        var resultados = [];
        
        for (var i = 0; i < 3; i++) {
            var aleatorio = Math.random() * 100;
            var acumulado = 0;
            
            for (var j = 0; j < simbolos.length; j++) {
                acumulado = acumulado + 18;
                if (aleatorio < acumulado) {
                    resultados.push(simbolos[j]);
                    break;
                }
            }
        }
        
        document.getElementById('slot1').textContent = resultados[0].nombre;
        document.getElementById('slot2').textContent = resultados[1].nombre;
        document.getElementById('slot3').textContent = resultados[2].nombre;
        
        slots.forEach(function(slot) {
            slot.classList.remove('spinning');
        });
        
        var balanceElem = document.getElementById('tragaperras-balance');
        if (balanceElem) {
            balanceElem.textContent = Math.floor(userData.diamonds);
        }
        
        var resultadoElem = document.getElementById('tragaperras-result');
        
        if (resultados[0].nombre === resultados[1].nombre && resultados[1].nombre === resultados[2].nombre) {
            var multiplicador = resultados[0].multiplicador;
            
            if (esPremium()) {
                multiplicador = multiplicador * 2;
            }
            
            var premio = apuesta * multiplicador;
            userData.diamonds = userData.diamonds + premio;
            
            if (resultadoElem) {
                resultadoElem.innerHTML = '<span style="color:#4ade80; font-size:20px; animation:winPulse 0.5s ease;">🎉 ¡JACKPOT! x' + multiplicador + ' (+' + premio + ' 💎)</span>';
            }
            
            spawnConfetti();
            
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }
        } else {
            if (resultadoElem) {
                resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
            }
        }
        
        actualizarUI();
        saveUserData();
    }, 500);
}

/**
 * Juego: Dados
 * @param {string} eleccion - 'menor', 'mayor' o 'exacto'
 */
function jugarDados(eleccion) {
    var apuesta = apuestaActual.dados;
    
    if (userData.diamonds < apuesta) {
        alert('❌ Diamantes insuficientes. Necesitas ' + apuesta + ' 💎');
        return;
    }
    
    if (!puedeJugar('dados')) {
        alert('❌ Has alcanzado el límite diario de jugadas.');
        return;
    }
    
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('dados');
    
    var dado1 = Math.floor(Math.random() * 6) + 1;
    var dado2 = Math.floor(Math.random() * 6) + 1;
    var caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    var dado1Elem = document.getElementById('dado1');
    var dado2Elem = document.getElementById('dado2');
    
    if (dado1Elem) dado1Elem.classList.add('rolling');
    if (dado2Elem) dado2Elem.classList.add('rolling');
    
    setTimeout(function() {
        if (dado1Elem) {
            dado1Elem.textContent = caras[dado1 - 1];
            dado1Elem.classList.remove('rolling');
        }
        
        if (dado2Elem) {
            dado2Elem.textContent = caras[dado2 - 1];
            dado2Elem.classList.remove('rolling');
        }
        
        var suma = dado1 + dado2;
        
        var sumaElem = document.getElementById('dados-suma');
        if (sumaElem) {
            sumaElem.textContent = 'Suma: ' + suma;
        }
        
        var balanceElem = document.getElementById('dados-balance');
        if (balanceElem) {
            balanceElem.textContent = Math.floor(userData.diamonds);
        }
        
        var gana = false;
        
        if (eleccion === 'menor' && suma >= 2 && suma <= 6) {
            gana = true;
        }
        if (eleccion === 'mayor' && suma >= 8 && suma <= 12) {
            gana = true;
        }
        if (eleccion === 'exacto' && suma === 7) {
            gana = true;
        }
        
        var resultadoElem = document.getElementById('dados-result');
        
        if (gana) {
            var ganancia = (eleccion === 'exacto') ? apuesta * 5 : apuesta * 2;
            
            if (esPremium()) {
                ganancia = ganancia * 2;
            }
            
            userData.diamonds = userData.diamonds + ganancia;
            
            if (resultadoElem) {
                resultadoElem.innerHTML = '<span style="color:#4ade80; font-size:20px; animation:winPulse 0.5s ease;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
            }
            
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        } else {
            if (resultadoElem) {
                resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
            }
        }
        
        actualizarUI();
        saveUserData();
    }, 500);
}

/**
 * Crea los botones de cámaras para la ruleta rusa
 */
function crearCamarasRuletaRusa() {
    var grid = document.getElementById('ruletarusa-camaras');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (var i = 1; i <= 6; i++) {
        var boton = document.createElement('button');
        boton.textContent = i;
        boton.style.cssText = 'background:var(--bg-elevated); border:2px solid #ef4444; border-radius:16px; padding:18px; color:white; font-weight:700; font-size:22px; cursor:pointer; transition:all 0.2s;';
        
        boton.onmouseenter = function() {
            this.style.background = '#ef4444';
            this.style.transform = 'scale(1.05)';
        };
        
        boton.onmouseleave = function() {
            this.style.background = 'var(--bg-elevated)';
            this.style.transform = 'scale(1)';
        };
        
        (function(numero) {
            boton.onclick = function() {
                jugarRuletaRusa(numero);
            };
        })(i);
        
        grid.appendChild(boton);
    }
}

/**
 * Juego: Ruleta Rusa
 * @param {number} camara - Cámara elegida (1-6)
 */
function jugarRuletaRusa(camara) {
    var apuesta = apuestaActual.ruletarusa;
    
    if (userData.diamonds < apuesta) {
        alert('❌ Diamantes insuficientes. Necesitas ' + apuesta + ' 💎');
        return;
    }
    
    if (!puedeJugar('ruletarusa')) {
        alert('❌ Has alcanzado el límite diario de jugadas.');
        return;
    }
    
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('ruletarusa');
    
    var bala = Math.floor(Math.random() * 6) + 1;
    var gana = camara !== bala;
    
    var emojiElem = document.getElementById('ruletarusa-emoji');
    if (emojiElem) {
        emojiElem.textContent = gana ? '🎉' : '💥';
    }
    
    var balanceElem = document.getElementById('ruletarusa-balance');
    if (balanceElem) {
        balanceElem.textContent = Math.floor(userData.diamonds);
    }
    
    var resultadoElem = document.getElementById('ruletarusa-result');
    
    if (gana) {
        var ganancia = apuesta * 3;
        userData.diamonds = userData.diamonds + ganancia;
        
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#4ade80; font-size:20px; animation:winPulse 0.5s ease;">🎉 ¡SOBREVIVISTE! +' + ganancia + ' 💎</span>';
        }
        
        spawnConfetti();
        
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    } else {
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#ef4444; font-size:20px;">💥 ¡La bala estaba en la cámara ' + bala + '! Perdiste ' + apuesta + ' 💎</span>';
        }
        
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
    }
    
    actualizarUI();
    saveUserData();
    crearCamarasRuletaRusa();
}

// ==========================================
// MÓDULO DE EDIFICIOS Y MEJORAS
// ==========================================

/**
 * Abre un edificio específico
 * @param {string} building - Nombre del edificio
 */
function openBuilding(building) {
    closeAll();
    
    var nombreCapitalizado = building.charAt(0).toUpperCase() + building.slice(1);
    var modalId = 'modal' + nombreCapitalizado;
    
    showModal(modalId);
    actualizarPanelMejora(building);
    
    // Iniciar el minijuego correspondiente
    if (building === 'escuela') {
        iniciarJuegoEscuela();
    } else if (building === 'fabrica') {
        iniciarJuegoFabrica();
    } else if (building === 'piscina') {
        iniciarJuegoPiscina();
    } else if (building === 'hospital') {
        iniciarJuegoHospital();
    }
}

/**
 * Actualiza el panel de mejoras de un edificio
 * @param {string} building - Nombre del edificio
 */
function actualizarPanelMejora(building) {
    var nivel = userData['lvl_' + building] || 0;
    
    var producciones = {
        escuela: 15,
        fabrica: 25,
        piscina: 10,
        hospital: 18
    };
    
    var preciosBase = {
        escuela: 500,
        fabrica: 1500,
        piscina: 800,
        hospital: 1200
    };
    
    var produccion = nivel * producciones[building];
    var precio = Math.floor(preciosBase[building] * Math.pow(1.12, nivel));
    
    var nivelElem = document.getElementById(building + '-level');
    if (nivelElem) {
        nivelElem.textContent = nivel;
    }
    
    var prodElem = document.getElementById(building + '-prod');
    if (prodElem) {
        prodElem.textContent = produccion + ' 💎/h';
    }
    
    var precioElem = document.getElementById(building + '-price');
    if (precioElem) {
        precioElem.textContent = precio.toLocaleString() + ' 💎';
    }
    
    var boton = document.getElementById(building + '-btn');
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

/**
 * Compra una mejora para un edificio
 * @param {string} building - Nombre del edificio
 */
function buyUpgrade(building) {
    var preciosBase = {
        escuela: 500,
        fabrica: 1500,
        piscina: 800,
        hospital: 1200
    };
    
    var nivel = userData['lvl_' + building] || 0;
    var precio = Math.floor(preciosBase[building] * Math.pow(1.12, nivel));
    
    if (userData.diamonds < precio) {
        alert('❌ Diamantes insuficientes. Necesitas ' + precio.toLocaleString() + ' 💎 para mejorar.');
        return;
    }
    
    userData['lvl_' + building] = (userData['lvl_' + building] || 0) + 1;
    userData.diamonds = userData.diamonds - precio;
    
    saveUserData();
    actualizarUI();
    actualizarPanelMejora(building);
    
    var nombres = {
        escuela: 'Escuela',
        fabrica: 'Fábrica',
        piscina: 'Piscina',
        hospital: 'Hospital'
    };
    
    alert('✅ ¡' + nombres[building] + ' mejorada a nivel ' + userData['lvl_' + building] + '!');
}

/**
 * Cambia entre pestañas de mejoras y juego
 * @param {string} building - Nombre del edificio
 * @param {string} tab - 'upgrade' o 'game'
 */
function switchTab(building, tab) {
    var upgradePanel = document.getElementById(building + '-upgrade-panel');
    var gamePanel = document.getElementById(building + '-game-panel');
    
    var nombreCapitalizado = building.charAt(0).toUpperCase() + building.slice(1);
    var tabs = document.querySelectorAll('#modal' + nombreCapitalizado + ' .tab');
    
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

/**
 * Actualiza la visualización de vidas de un minijuego
 * @param {string} game - Identificador del juego
 */
function updateLivesUI(game) {
    var container = document.getElementById(game + '-lives');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (var i = 0; i < 3; i++) {
        var lifeDiv = document.createElement('div');
        
        if (i < gameLives[game]) {
            lifeDiv.className = 'life active';
            lifeDiv.innerHTML = '❤️';
        } else {
            lifeDiv.className = 'life';
            lifeDiv.innerHTML = '🖤';
        }
        
        container.appendChild(lifeDiv);
    }
    
    var reviveBtn = document.getElementById(game + '-revive');
    if (reviveBtn) {
        if (gameLives[game] === 0) {
            reviveBtn.style.display = 'block';
        } else {
            reviveBtn.style.display = 'none';
        }
    }
}

/**
 * Resta una vida al jugador
 * @param {string} game - Identificador del juego
 * @returns {boolean} True si aún tiene vidas
 */
function loseLife(game) {
    gameLives[game] = gameLives[game] - 1;
    updateLivesUI(game);
    
    if (gameLives[game] <= 0) {
        gameLives[game] = 0;
        gameActiveStates[game] = false;
        
        var resultadoId = '';
        if (game === 'escuela') resultadoId = 'mem';
        else if (game === 'fabrica') resultadoId = 'asm';
        else if (game === 'piscina') resultadoId = 'jump';
        else if (game === 'hospital') resultadoId = 'surgery';
        
        var resultadoElem = document.getElementById(resultadoId + '-result');
        if (resultadoElem) {
            resultadoElem.innerHTML = '<span style="color:#ef4444; font-size:20px;">💀 GAME OVER - Te quedaste sin vidas</span>';
        }
        
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
        
        return false;
    }
    
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    return true;
}

/**
 * Revive al jugador viendo un anuncio
 * @param {string} game - Identificador del juego
 */
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

/**
 * Activa un multiplicador x2 viendo un anuncio
 * @param {string} game - Identificador del juego
 */
function useAdMultiplier(game) {
    showRewardedAd(function(success) {
        if (success) {
            pendingMultiplier = 2;
            alert('✨ ¡Multiplicador x2 activado! Tu próxima recompensa será duplicada.');
        }
    });
}

// ==========================================
// MINIJUEGO 1: ESCUELA - MENTE MAESTRA
// ==========================================

/**
 * Inicia o reinicia el minijuego de la Escuela
 */
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
    document.getElementById('mem-streak').textContent = '0';
    document.getElementById('mem-result').innerHTML = '';
    
    nuevaSecuenciaEscuela();
}

/**
 * Genera una nueva secuencia de números
 */
function nuevaSecuenciaEscuela() {
    if (!gameActiveStates.escuela) return;
    
    escuelaSequence = [];
    escuelaUserInput = [];
    
    var longitud = Math.min(3 + Math.floor(escuelaLevel / 15), 10);
    
    for (var i = 0; i < longitud; i++) {
        var numero = Math.floor(Math.random() * 16) + 1;
        escuelaSequence.push(numero);
    }
    
    mostrarSecuenciaEscuela();
}

/**
 * Muestra la secuencia al jugador
 */
function mostrarSecuenciaEscuela() {
    var display = document.getElementById('sequence-display');
    if (!display) return;
    
    display.innerHTML = '';
    document.getElementById('pupitres-grid').innerHTML = '';
    
    var indice = 0;
    var velocidad = Math.max(300, 800 - escuelaLevel * 10);
    
    function mostrarSiguiente() {
        if (indice >= escuelaSequence.length) {
            crearPupitres();
            return;
        }
        
        display.innerHTML = '';
        
        var carta = document.createElement('div');
        carta.className = 'sequence-card highlight';
        carta.style.animation = 'popIn 0.3s ease';
        carta.textContent = escuelaSequence[indice];
        display.appendChild(carta);
        
        indice++;
        setTimeout(mostrarSiguiente, velocidad);
    }
    
    mostrarSiguiente();
}

/**
 * Crea la cuadrícula de pupitres para responder
 */
function crearPupitres() {
    var grid = document.getElementById('pupitres-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (var i = 1; i <= 16; i++) {
        var boton = document.createElement('div');
        boton.className = 'pupitre';
        boton.textContent = i;
        
        (function(numero) {
            boton.onclick = function() {
                seleccionarPupitre(numero);
            };
        })(i);
        
        grid.appendChild(boton);
    }
}

/**
 * Maneja la selección de un pupitre
 * @param {number} numero - Número seleccionado
 */
function seleccionarPupitre(numero) {
    if (!gameActiveStates.escuela) return;
    
    escuelaUserInput.push(numero);
    var indice = escuelaUserInput.length - 1;
    
    var pupitres = document.querySelectorAll('.pupitre');
    
    if (escuelaUserInput[indice] !== escuelaSequence[indice]) {
        // Respuesta incorrecta
        if (pupitres[numero - 1]) {
            pupitres[numero - 1].classList.add('wrong');
            setTimeout(function() {
                if (pupitres[numero - 1]) pupitres[numero - 1].classList.remove('wrong');
            }, 500);
        }
        
        if (!loseLife('escuela')) return;
        
        escuelaStreak = 0;
        document.getElementById('mem-streak').textContent = '0';
        escuelaUserInput = [];
        
        document.getElementById('mem-result').innerHTML = '<span style="color:#ef4444;">❌ Secuencia incorrecta. ¡Presta atención!</span>';
        
        setTimeout(function() {
            nuevaSecuenciaEscuela();
        }, 2000);
        
        return;
    }
    
    // Respuesta correcta
    if (pupitres[numero - 1]) {
        pupitres[numero - 1].classList.add('correct');
        setTimeout(function() {
            if (pupitres[numero - 1]) pupitres[numero - 1].classList.remove('correct');
        }, 300);
    }
    
    if (escuelaUserInput.length === escuelaSequence.length) {
        var recompensa = calcularRecompensa(5, 'escuela');
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
        document.getElementById('mem-streak').textContent = escuelaStreak;
        
        document.getElementById('mem-result').innerHTML = '<span style="color:#4ade80; font-size:18px; animation:winPulse 0.5s ease;">✅ ¡Correcto! +' + recompensa + ' 💎 | Nivel ' + escuelaLevel + ' | Racha: ' + escuelaStreak + '</span>';
        
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

/**
 * Inicia el minijuego de la Fábrica
 */
function iniciarJuegoFabrica() {
    gameActiveStates.fabrica = true;
    fabricaLevel = userData.gameStats.fabrica.currentLevel || 1;
    fabricaBest = userData.gameStats.fabrica.bestLevel || 0;
    fabricaCompleted = 0;
    fabricaRequired = Math.min(3 + Math.floor(fabricaLevel / 20), 15);
    fabricaGoodCount = 0;
    fabricaMissCount = 0;
    gameLives.fabrica = userData.gameStats.fabrica.lives || 3;
    
    updateLivesUI('fabrica');
    
    document.getElementById('asm-completed').textContent = fabricaCompleted;
    document.getElementById('asm-required').textContent = fabricaRequired;
    document.getElementById('asm-best').textContent = fabricaBest;
    document.getElementById('fabrica-game-level').textContent = fabricaLevel;
    document.getElementById('asm-speed').textContent = Math.max(1, Math.floor(fabricaLevel / 20)) + 'x';
    document.getElementById('asm-good-count').textContent = '0';
    document.getElementById('asm-miss-count').textContent = '0';
    document.getElementById('asm-result').innerHTML = '';
    
    iniciarCinta();
}

/**
 * Inicia la animación de la cinta transportadora
 */
function iniciarCinta() {
    if (fabricaAnimInterval) {
        clearInterval(fabricaAnimInterval);
    }
    
    fabricaPosition = -30;
    fabricaIsDefect = Math.random() < Math.min(0.2, fabricaLevel / 250);
    
    var piece = document.getElementById('moving-piece');
    if (piece) {
        piece.textContent = fabricaIsDefect ? '💢' : '🔧';
        piece.style.left = fabricaPosition + '%';
    }
    
    var velocidad = Math.max(1, 5 - Math.floor(fabricaLevel / 100));
    
    fabricaAnimInterval = setInterval(function() {
        if (!gameActiveStates.fabrica) return;
        
        fabricaPosition = fabricaPosition + velocidad;
        
        if (fabricaPosition > 130) {
            if (!fabricaIsDefect) {
                if (!loseLife('fabrica')) {
                    clearInterval(fabricaAnimInterval);
                    return;
                }
            }
            
            fabricaPosition = -30;
            fabricaIsDefect = Math.random() < Math.min(0.2, fabricaLevel / 250);
            
            var p = document.getElementById('moving-piece');
            if (p) {
                p.textContent = fabricaIsDefect ? '💢' : '🔧';
                p.style.left = fabricaPosition + '%';
            }
        }
        
        var p = document.getElementById('moving-piece');
        if (p) {
            p.style.left = fabricaPosition + '%';
        }
    }, 30);
}

/**
 * Verifica si el jugador acertó al ensamblar
 */
function checkFabricaHit() {
    if (!gameActiveStates.fabrica) return;
    
    if (fabricaPosition > 25 && fabricaPosition < 75) {
        if (fabricaIsDefect) {
            fabricaMissCount++;
            document.getElementById('asm-miss-count').textContent = fabricaMissCount;
            
            if (!loseLife('fabrica')) return;
            
            document.getElementById('asm-result').innerHTML = '<span style="color:#ef4444;">⚠️ ¡Era una pieza defectuosa! -1 vida</span>';
        } else {
            fabricaCompleted++;
            fabricaGoodCount++;
            
            document.getElementById('asm-completed').textContent = fabricaCompleted;
            document.getElementById('asm-good-count').textContent = fabricaGoodCount;
            document.getElementById('asm-result').innerHTML = '<span style="color:#4ade80;">✅ ¡Bien ensamblada!</span>';
            
            if (fabricaCompleted >= fabricaRequired) {
                var recompensa = calcularRecompensa(8, 'fabrica');
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
                document.getElementById('asm-speed').textContent = Math.max(1, Math.floor(fabricaLevel / 20)) + 'x';
                
                document.getElementById('asm-result').innerHTML = '<span style="color:#4ade80; font-size:18px;">✅ ¡Nivel completado! +' + recompensa + ' 💎</span>';
                
                actualizarUI();
                actualizarPanelMejora('fabrica');
                saveUserData();
                
                if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
                spawnConfetti();
                
                clearInterval(fabricaAnimInterval);
                
                setTimeout(function() {
                    iniciarJuegoFabrica();
                }, 2000);
                
                return;
            }
        }
    } else {
        fabricaMissCount++;
        document.getElementById('asm-miss-count').textContent = fabricaMissCount;
        
        if (!loseLife('fabrica')) return;
        
        document.getElementById('asm-result').innerHTML = '<span style="color:#ef4444;">❌ ¡Fuera de la zona de ensamblaje!</span>';
    }
    
    setTimeout(function() {
        document.getElementById('asm-result').innerHTML = '';
        fabricaPosition = -30;
        fabricaIsDefect = Math.random() < Math.min(0.2, fabricaLevel / 250);
        
        var p = document.getElementById('moving-piece');
        if (p) {
            p.textContent = fabricaIsDefect ? '💢' : '🔧';
            p.style.left = fabricaPosition + '%';
        }
    }, 1000);
}

// ==========================================
// MINIJUEGO 3: PISCINA - SALTO DE PRECISIÓN
// ==========================================

/**
 * Inicia el minijuego de la Piscina
 */
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
    document.getElementById('jump-power-display').textContent = '0%';
    document.getElementById('jump-result').innerHTML = '';
    
    piscinaPower = 0;
    piscinaHoldStart = 0;
    
    document.getElementById('power-fill').style.width = '0%';
}

/**
 * Inicia la carga de potencia (al presionar)
 * @param {Event} e - Evento del mouse/touch
 */
function startSlingshot(e) {
    if (!gameActiveStates.piscina) return;
    e.preventDefault();
    
    piscinaHoldStart = Date.now();
    
    if (piscinaChargeInterval) {
        clearInterval(piscinaChargeInterval);
    }
    
    piscinaChargeInterval = setInterval(function() {
        var transcurrido = Date.now() - piscinaHoldStart;
        piscinaPower = Math.min(100, transcurrido / 15);
        
        document.getElementById('power-fill').style.width = piscinaPower + '%';
        document.getElementById('jump-power-display').textContent = Math.floor(piscinaPower) + '%';
    }, 30);
}

/**
 * Libera la potencia (al soltar)
 */
function releaseSlingshot() {
    if (!gameActiveStates.piscina || piscinaHoldStart === 0) return;
    
    if (piscinaChargeInterval) {
        clearInterval(piscinaChargeInterval);
    }
    
    var duracion = Date.now() - piscinaHoldStart;
    piscinaPower = Math.min(100, duracion / 15);
    piscinaHoldStart = 0;
    
    document.getElementById('power-fill').style.width = '0%';
    document.getElementById('jump-power-display').textContent = '0%';
    
    var esPerfecto = piscinaPower > 36 && piscinaPower < 64;
    
    if (esPerfecto) {
        piscinaPerfect++;
        document.getElementById('jump-perfect').textContent = piscinaPerfect;
        
        document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;">🎯 ¡Clavado perfecto! (' + Math.floor(piscinaPower) + '%)</span>';
        
        if (piscinaPerfect >= piscinaRequired) {
            var recompensa = calcularRecompensa(6, 'piscina');
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
            
            document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80; font-size:18px;">✅ ¡Nivel completado! +' + recompensa + ' 💎</span>';
            
            piscinaPerfect = 0;
            document.getElementById('jump-perfect').textContent = '0';
            
            actualizarUI();
            actualizarPanelMejora('piscina');
            saveUserData();
            
            if (navigator.vibrate) navigator.vibrate(100);
            spawnConfetti();
            
            setTimeout(function() {
                iniciarJuegoPiscina();
            }, 2000);
            
            return;
        }
    } else {
        loseLife('piscina');
        
        document.getElementById('jump-result').innerHTML = '<span style="color:#ef4444;">💧 ¡Fallaste! Potencia: ' + Math.floor(piscinaPower) + '% (Necesitas 40-60%)</span>';
    }
    
    piscinaPower = 0;
    
    setTimeout(function() {
        document.getElementById('jump-result').innerHTML = '';
    }, 1500);
}

// ==========================================
// MINIJUEGO 4: HOSPITAL - CIRUGÍA DE EMERGENCIA
// ==========================================

/**
 * Inicia el minijuego del Hospital
 */
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
    document.getElementById('surgery-time-display').textContent = Math.floor(hospitalTimeLeft) + 's';
    
    if (hospitalTimer) {
        clearInterval(hospitalTimer);
    }
    
    hospitalTimer = setInterval(function() {
        if (!gameActiveStates.hospital) return;
        
        hospitalTimeLeft = hospitalTimeLeft - 0.1;
        
        var porcentaje = (hospitalTimeLeft / hospitalMaxTime) * 100;
        document.getElementById('time-fill').style.width = Math.max(0, porcentaje) + '%';
        document.getElementById('surgery-time-display').textContent = Math.max(0, Math.floor(hospitalTimeLeft)) + 's';
        
        var timeFill = document.getElementById('time-fill');
        timeFill.classList.remove('warning', 'danger');
        
        if (porcentaje < 30) {
            timeFill.classList.add('danger');
        } else if (porcentaje < 50) {
            timeFill.classList.add('warning');
        }
        
        if (hospitalTimeLeft <= 0) {
            clearInterval(hospitalTimer);
            loseLife('hospital');
            document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⏰ ¡Tiempo agotado!</span>';
            
            setTimeout(function() {
                iniciarJuegoHospital();
            }, 2000);
        }
    }, 100);
    
    crearVirusHospital();
}

/**
 * Crea los virus en el área de cirugía
 */
function crearVirusHospital() {
    var area = document.getElementById('surgery-area');
    if (!area) return;
    
    area.innerHTML = '';
    
    var tipos = ['🦠', '🦠', '🦠', '🦠', '🦠'];
    
    for (var i = 0; i < hospitalTotal; i++) {
        var virus = document.createElement('div');
        virus.className = 'virus-sprite';
        virus.textContent = tipos[i % tipos.length];
        virus.style.left = (5 + Math.random() * 80) + '%';
        virus.style.top = (5 + Math.random() * 80) + '%';
        virus.style.animationDelay = (Math.random() * 2) + 's';
        
        virus.onclick = function(e) {
            e.stopPropagation();
            
            if (!gameActiveStates.hospital) return;
            
            hospitalExtracted++;
            document.getElementById('virus-extracted').textContent = hospitalExtracted;
            
            this.classList.add('collected');
            var self = this;
            setTimeout(function() {
                if (self.parentNode) {
                    self.parentNode.removeChild(self);
                }
            }, 300);
            
            if (hospitalExtracted >= hospitalTotal) {
                clearInterval(hospitalTimer);
                
                var recompensa = calcularRecompensa(7, 'hospital');
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
                
                document.getElementById('surgery-result').innerHTML = '<span style="color:#4ade80; font-size:18px;">✅ ¡Cirugía exitosa! +' + recompensa + ' 💎</span>';
                
                actualizarUI();
                actualizarPanelMejora('hospital');
                saveUserData();
                
                if (navigator.vibrate) navigator.vibrate(100);
                spawnConfetti();
                
                setTimeout(function() {
                    iniciarJuegoHospital();
                }, 2000);
            }
        };
        
        virus.onmouseenter = function() {
            this.style.transform = 'scale(1.3)';
            this.style.filter = 'brightness(1.3)';
        };
        
        virus.onmouseleave = function() {
            this.style.transform = 'scale(1)';
            this.style.filter = 'brightness(1)';
        };
        
        area.appendChild(virus);
    }
}

// ==========================================
// MÓDULO DE RANKING Y POOL
// ==========================================

/**
 * Actualiza el ranking y las proyecciones de recompensa
 */
async function updateRankingAndPool() {
    try {
        var resultado = await _supabase
            .from('game_data')
            .select('telegram_id, diamonds')
            .neq('telegram_id', 'MASTER');
        
        if (!resultado.error && resultado.data) {
            globalPoolData.user_rankings = resultado.data
                .map(function(u) {
                    return {
                        id: u.telegram_id,
                        diamonds: Number(u.diamonds) || 0
                    };
                })
                .sort(function(a, b) {
                    return b.diamonds - a.diamonds;
                });
        }
        
        var posicion = globalPoolData.user_rankings.findIndex(function(u) {
            return u.id === userData.id;
        });
        
        if (posicion !== -1) {
            if (posicion < 3) {
                userData.rank = "Diamante";
            } else if (posicion < 10) {
                userData.rank = "Oro";
            } else if (posicion < 50) {
                userData.rank = "Plata";
            } else {
                userData.rank = "Ciudadano";
            }
            userData.weekly_rank = posicion + 1;
        }
        
        var poolUsuarios = globalPoolData.pool_ton * 0.8 * CONFIG.RESERVA_POOL;
        
        if (posicion < 3) {
            userData.projectedReward = (poolUsuarios * 0.4) / 3;
        } else if (posicion < 10) {
            userData.projectedReward = (poolUsuarios * 0.25) / 7;
        } else if (posicion < 50) {
            userData.projectedReward = (poolUsuarios * 0.20) / 40;
        } else {
            var ciudadanos = globalPoolData.user_rankings.slice(50);
            var totalDiamantesCiudadanos = 0;
            
            for (var i = 0; i < ciudadanos.length; i++) {
                totalDiamantesCiudadanos = totalDiamantesCiudadanos + ciudadanos[i].diamonds;
            }
            
            if (totalDiamantesCiudadanos > 0 && userData.diamonds > 0) {
                userData.projectedReward = (poolUsuarios * 0.15) * (userData.diamonds / totalDiamantesCiudadanos);
            } else {
                userData.projectedReward = 0;
            }
        }
        
        // Actualizar UI si el modal de ranking está abierto
        var modalRanking = document.getElementById('modalRanking');
        if (modalRanking && modalRanking.style.display === 'block') {
            actualizarRankingModal();
        }
    } catch (error) {
        console.error('Error al actualizar ranking:', error);
    }
}

/**
 * Actualiza el balance real del pool desde la blockchain
 */
async function updateRealPoolBalance() {
    try {
        var respuesta = await fetch(CONFIG.TON_API_URL + '/v2/accounts/' + CONFIG.BILLETERA_POOL, {
            headers: {
                'Authorization': 'Bearer ' + CONFIG.TON_API_KEY
            }
        });
        
        if (respuesta.ok) {
            var datos = await respuesta.json();
            globalPoolData.pool_ton = (datos.balance || 0) / 1000000000;
        }
    } catch (error) {
        console.error('Error al consultar pool:', error);
    }
}

// ==========================================
// MÓDULO DE PERSISTENCIA (SUPABASE)
// ==========================================

/**
 * Guarda los datos del usuario en Supabase
 */
async function saveUserData() {
    if (!userData.id) return;
    
    try {
        var datos = {
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
        };
        
        await _supabase
            .from('game_data')
            .update(datos)
            .eq('telegram_id', userData.id);
    } catch (error) {
        console.error('Error al guardar datos:', error);
    }
}

/**
 * Carga los datos del usuario desde Supabase
 * @param {string} tgId - ID de Telegram del usuario
 */
async function loadUserFromDB(tgId) {
    try {
        var resultado = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', tgId.toString())
            .maybeSingle();
        
        if (resultado.error) {
            console.error('Error al cargar usuario:', resultado.error);
            return;
        }
        
        if (!resultado.data) {
            // Usuario nuevo - crear registro
            var nuevoUsuario = {
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
            
            await _supabase.from('game_data').insert([nuevoUsuario]);
            
            userData = Object.assign({}, userData, nuevoUsuario, {
                id: tgId.toString()
            });
        } else {
            // Usuario existente - cargar datos
            var datos = resultado.data;
            
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
    } catch (error) {
        console.error('Error en loadUserFromDB:', error);
    }
}

// ==========================================
// SISTEMA DE PRODUCCIÓN CONTINUA
// ==========================================

/**
 * Inicia el sistema de producción pasiva
 */
function startProduction() {
    setInterval(function() {
        if (!userData.id) return;
        
        var produccionPorSegundo = getTotalProduction() / 3600;
        userData.diamonds = userData.diamonds + produccionPorSegundo;
        
        // Actualizar UI cada segundo
        var diamantesElem = document.getElementById('diamonds');
        if (diamantesElem) {
            diamantesElem.textContent = Math.floor(userData.diamonds);
        }
    }, 1000);
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL DE LA APLICACIÓN
// ==========================================

/**
 * Función principal de inicialización
 */
async function initApp() {
    console.log('🔄 Iniciando TON CITY...');
    
    tg.expand();
    tg.ready();
    
    // Obtener datos del usuario de Telegram
    var usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        usuario = tg.initDataUnsafe.user;
    }
    
    if (usuario) {
        userData.id = usuario.id.toString();
        userData.username = usuario.first_name || 'Usuario';
        document.getElementById('user-display').textContent = userData.username;
        await loadUserFromDB(usuario.id);
    } else {
        // Modo desarrollo/pruebas sin Telegram
        userData.id = 'test_' + Date.now();
        userData.username = 'Usuario Test';
        userData.referral_code = 'REF' + userData.id.slice(-6);
        document.getElementById('user-display').textContent = userData.username;
    }
    
    // Inicializar módulos
    await initTONConnect();
    setTimeout(initAds, 3000);
    await updateRealPoolBalance();
    await updateRankingAndPool();
    
    // Iniciar sistemas
    startProduction();
    actualizarEventosUI();
    
    // Configurar guardado automático cada 15 segundos
    setInterval(function() {
        saveUserData();
    }, 15000);
    
    // Actualizar ranking cada minuto
    setInterval(async function() {
        await updateRankingAndPool();
        actualizarEventosUI();
    }, 60000);
    
    // Guardar al cerrar
    window.addEventListener('beforeunload', function() {
        saveUserData();
    });
    
    console.log('✅ TON CITY - Sistema completamente inicializado');
    console.log('👤 Usuario:', userData.username);
    console.log('💎 Diamantes:', userData.diamonds);
    console.log('⭐ Premium:', esPremium() ? 'Sí' : 'No');
}

// Iniciar la aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// EXPORTACIONES GLOBALES DE FUNCIONES
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
window.checkFabricaHit = checkFabricaHit;
window.startSlingshot = startSlingshot;
window.releaseSlingshot = releaseSlingshot;

console.log('📦 TON CITY - Módulos exportados correctamente');