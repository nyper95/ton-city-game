 // ======================================================
// DIAMOND CITY - VERSIÓN FINAL COMPLETA 2026
// ======================================================
console.log('🚀 DIAMOND CITY - Iniciando sistema profesional...');

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
    city_name: null,
    newsFeed: [],
    genero: 'M',
    idioma: 'es',
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
let piscinaCombo = 0;
let piscinaDireccion = 1;
let piscinaZonaInicio = 30;
let piscinaZonaFin = 70;

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

const TRADUCCIONES = {
    es: {
        nav_perfil: 'PERFIL', nav_amigos: 'AMIGOS', nav_ranking: 'RANKING',
        greeting_hola: 'HOLA,',
        section_edificios: 'Edificios', section_feed: 'Feed de Noticias',
        building_banco: 'Banco', building_banco_sub: 'Comprar/Vender GRAM',
        building_premium: 'Premium', building_premium_sub: 'Planes VIP',
        building_casino: 'Casino', building_casino_sub: '5 juegos',
        building_parque: 'Parque', building_parque_sub: 'Anuncios',
        btn_cerrar: 'CERRAR', btn_mejorar: 'MEJORAR', btn_confirmar: 'CONFIRMAR', btn_reclamar: 'RECLAMAR',
        onboarding_titulo: '¡Buenos días!',
        onboarding_texto: 'Soy Valeria, su asistente ejecutiva. Antes de comenzar, necesito dos datos para los registros municipales.',
        onboarding_placeholder: 'Nombre de tu ciudad',
        onboarding_fundar: '🏙️ FUNDAR MI CIUDAD',
        feed_titulo: 'Bienvenido a su ciudad', feed_sub: 'Los eventos recientes aparecerán aquí',
        ranking_titulo: 'Ranking Municipal', ranking_tu_rango: 'Tu rango', ranking_tu_posicion: 'Tu posición', ranking_bono: 'Bono semanal estimado',
        amigos_titulo: 'Amigos',
        idioma_titulo: 'Idioma'
    },
    en: {
        nav_perfil: 'PROFILE', nav_amigos: 'FRIENDS', nav_ranking: 'RANKING',
        greeting_hola: 'HI,',
        section_edificios: 'Buildings', section_feed: 'News Feed',
        building_banco: 'Bank', building_banco_sub: 'Buy/Sell GRAM',
        building_premium: 'Premium', building_premium_sub: 'VIP Plans',
        building_casino: 'Casino', building_casino_sub: '5 games',
        building_parque: 'Park', building_parque_sub: 'Watch ads',
        btn_cerrar: 'CLOSE', btn_mejorar: 'UPGRADE', btn_confirmar: 'CONFIRM', btn_reclamar: 'CLAIM',
        onboarding_titulo: 'Good morning!',
        onboarding_texto: "I'm Valeria, your executive assistant. Before we begin, I need two details for the municipal records.",
        onboarding_placeholder: 'Name your city',
        onboarding_fundar: '🏙️ FOUND MY CITY',
        feed_titulo: 'Welcome to your city', feed_sub: 'Recent events will appear here',
        ranking_titulo: 'Municipal Ranking', ranking_tu_rango: 'Your rank', ranking_tu_posicion: 'Your position', ranking_bono: 'Estimated weekly bonus',
        amigos_titulo: 'Friends',
        idioma_titulo: 'Language'
    },
    pt: {
        nav_perfil: 'PERFIL', nav_amigos: 'AMIGOS', nav_ranking: 'RANKING',
        greeting_hola: 'OLÁ,',
        section_edificios: 'Edifícios', section_feed: 'Feed de Notícias',
        building_banco: 'Banco', building_banco_sub: 'Comprar/Vender GRAM',
        building_premium: 'Premium', building_premium_sub: 'Planos VIP',
        building_casino: 'Cassino', building_casino_sub: '5 jogos',
        building_parque: 'Parque', building_parque_sub: 'Ver anúncios',
        btn_cerrar: 'FECHAR', btn_mejorar: 'MELHORAR', btn_confirmar: 'CONFIRMAR', btn_reclamar: 'RESGATAR',
        onboarding_titulo: 'Bom dia!',
        onboarding_texto: 'Sou Valeria, sua assistente executiva. Antes de começar, preciso de dois dados para os registros municipais.',
        onboarding_placeholder: 'Nome da sua cidade',
        onboarding_fundar: '🏙️ FUNDAR MINHA CIDADE',
        feed_titulo: 'Bem-vindo à sua cidade', feed_sub: 'Os eventos recentes aparecerão aqui',
        ranking_titulo: 'Ranking Municipal', ranking_tu_rango: 'Seu rank', ranking_tu_posicion: 'Sua posição', ranking_bono: 'Bônus semanal estimado',
        amigos_titulo: 'Amigos',
        idioma_titulo: 'Idioma'
    },
    ru: {
        nav_perfil: 'ПРОФИЛЬ', nav_amigos: 'ДРУЗЬЯ', nav_ranking: 'РЕЙТИНГ',
        greeting_hola: 'ПРИВЕТ,',
        section_edificios: 'Здания', section_feed: 'Лента новостей',
        building_banco: 'Банк', building_banco_sub: 'Купить/продать GRAM',
        building_premium: 'Премиум', building_premium_sub: 'VIP-планы',
        building_casino: 'Казино', building_casino_sub: '5 игр',
        building_parque: 'Парк', building_parque_sub: 'Смотреть рекламу',
        btn_cerrar: 'ЗАКРЫТЬ', btn_mejorar: 'УЛУЧШИТЬ', btn_confirmar: 'ПОДТВЕРДИТЬ', btn_reclamar: 'ПОЛУЧИТЬ',
        onboarding_titulo: 'Доброе утро!',
        onboarding_texto: 'Я Валерия, ваш исполнительный ассистент. Прежде чем начать, мне нужны два реквизита для муниципальных записей.',
        onboarding_placeholder: 'Название вашего города',
        onboarding_fundar: '🏙️ ОСНОВАТЬ ГОРОД',
        feed_titulo: 'Добро пожаловать в ваш город', feed_sub: 'Здесь будут появляться последние события',
        ranking_titulo: 'Городской рейтинг', ranking_tu_rango: 'Ваш ранг', ranking_tu_posicion: 'Ваша позиция', ranking_bono: 'Ожидаемый недельный бонус',
        amigos_titulo: 'Друзья',
        idioma_titulo: 'Язык'
    }
};

function t(key) {
    const idioma = userData.idioma || 'es';
    return (TRADUCCIONES[idioma] && TRADUCCIONES[idioma][key]) || TRADUCCIONES.es[key] || key;
}

function aplicarIdioma() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
}

const NOMBRES_IDIOMA = { es: 'Español', en: 'English', pt: 'Português', ru: 'Русский' };

function seleccionarIdioma(codigo) {
    userData.idioma = codigo;
    aplicarIdioma();
    const label = document.getElementById('idioma-actual-label');
    if (label) label.textContent = NOMBRES_IDIOMA[codigo] || 'Español';
    closeAll();
    saveUserData();
}

function abrirSelectorIdioma() {
    closeAll();
    showModal('modalIdioma');
}

function getTituloAlcalde() {
    return userData.genero === 'F' ? 'Alcaldesa' : 'Alcalde';
}

function seleccionarGenero(g) {
    userData.genero = g;
    const btnM = document.getElementById('genero-M');
    const btnF = document.getElementById('genero-F');
    if (btnM) btnM.classList.toggle('active', g === 'M');
    if (btnF) btnF.classList.toggle('active', g === 'F');
}

function cambiarGeneroPerfil(g) {
    userData.genero = g;
    const btnM = document.getElementById('perfil-genero-M');
    const btnF = document.getElementById('perfil-genero-F');
    if (btnM) btnM.classList.toggle('active', g === 'M');
    if (btnF) btnF.classList.toggle('active', g === 'F');
    actualizarUI();
    saveUserData();
}

function tiempoRelativo(iso) {
    const segundos = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (segundos < 60) return 'Justo ahora';
    if (segundos < 3600) return 'Hace ' + Math.floor(segundos / 60) + ' min';
    if (segundos < 86400) return 'Hace ' + Math.floor(segundos / 3600) + ' h';
    return 'Hace ' + Math.floor(segundos / 86400) + ' días';
}

function registrarEvento(icono, titulo, subtitulo) {
    if (!userData.newsFeed) userData.newsFeed = [];
    userData.newsFeed.unshift({ icono: icono, titulo: titulo, subtitulo: subtitulo, fecha: new Date().toISOString() });
    userData.newsFeed = userData.newsFeed.slice(0, 15);
    renderizarFeedNoticias();
}

function renderizarFeedNoticias() {
    const cont = document.getElementById('feed-noticias');
    if (!cont) return;
    const eventos = userData.newsFeed || [];
    if (eventos.length === 0) {
        cont.innerHTML = '<div class="feed-item"><div class="feed-icono">👋</div><div class="feed-texto"><div class="feed-titulo">Bienvenido a su ciudad</div><div class="feed-subtitulo">Los eventos recientes aparecerán aquí</div></div></div>';
        return;
    }
    let html = '';
    for (let i = 0; i < eventos.length; i++) {
        const e = eventos[i];
        html += '<div class="feed-item"><div class="feed-icono">' + e.icono + '</div><div class="feed-texto"><div class="feed-titulo">' + e.titulo + '</div><div class="feed-subtitulo">' + e.subtitulo + '</div><div class="feed-tiempo">' + tiempoRelativo(e.fecha) + '</div></div></div>';
    }
    cont.innerHTML = html;
}

function mostrarOnboardingSiHaceFalta() {
    if (!userData.city_name) {
        const pantalla = document.getElementById('onboarding-screen');
        if (pantalla) pantalla.classList.remove('hidden');
    }
}

async function confirmarNombreCiudad() {
    const input = document.getElementById('onboarding-city-input');
    const nombre = input ? input.value.trim() : '';
    if (!nombre || nombre.length < 2) return alert('❌ Escribe un nombre para tu ciudad (mínimo 2 letras)');
    if (nombre.length > 20) return alert('❌ Máximo 20 caracteres');
    userData.city_name = nombre;
    const pantalla = document.getElementById('onboarding-screen');
    if (pantalla) pantalla.classList.add('hidden');
    actualizarUI();
    await saveUserData();
}

function getSaludoValeria() {
    const hora = new Date().getHours();
    if (hora < 12) return '🏛️ Buenos días, ' + getTituloAlcalde() + '.';
    if (hora < 19) return '🏛️ Buenas tardes, ' + getTituloAlcalde() + '.';
    return '🏛️ Buenas noches, ' + getTituloAlcalde() + '.';
}

function getConsejosAsistente() {
    const hoy = new Date().toDateString();
    const ultimoReclamo = userData.last_daily_claim ? new Date(userData.last_daily_claim).toDateString() : null;
    const ciudad = userData.city_name || 'esta ciudad';
    const consejos = [];

    if (ultimoReclamo !== hoy) {
        consejos.push('🔔 Informe pendiente: la recaudación diaria de ' + ciudad + ' todavía no ha sido reclamada. Le recomiendo autorizarla desde el aviso amarillo.');
    }
    if ((userData.diamonds || 0) < 200) {
        consejos.push('💎 Las arcas municipales están por debajo de lo recomendable. Sugiero ver un anuncio en el Parque (+20 💎 sin costo) o autorizar una compra en el Banco.');
    }
    const nivelesBajos = ['lvl_piscina', 'lvl_fabrica', 'lvl_escuela', 'lvl_hospital'].filter(function(k) { return (userData[k] || 0) < 5; });
    if (nivelesBajos.length > 0) {
        consejos.push('📊 Varios edificios aún operan muy por debajo de su capacidad. Cada mejora incrementa la producción por hora de forma permanente.');
    }
    if (!esPremium()) {
        consejos.push('⚡ El estatus Premium duplica la producción de toda la ciudad y elimina los anuncios obligatorios. Puede revisarlo en el edificio Premium.');
    }
    if ((userData.referred_users || []).length === 0) {
        consejos.push('👥 ' + ciudad + ' todavía no tiene ciudadanos referidos. Cada persona que invite le genera diamantes adicionales. Encontrará su código en la pestaña Amigos.');
    }
    const evento = getEventoActual();
    consejos.push('🏆 Hay bonificación especial activa esta semana en ' + evento.nombre + '. Aprovéchela mientras dure.');

    if (consejos.length === 0) {
        consejos.push('✅ Todo está en orden en ' + ciudad + '. Excelente gestión hasta el momento.');
    }
    return consejos.slice(0, 3);
}

function destelloResultado(modalId, gano) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('ganaste', 'perdiste');
    void modal.offsetWidth;
    modal.classList.add(gano ? 'ganaste' : 'perdiste');
    setTimeout(function() { modal.classList.remove('ganaste', 'perdiste'); }, 900);
}

function hayAlgoUrgenteParaValeria() {
    const hoy = new Date().toDateString();
    const ultimoReclamo = userData.last_daily_claim ? new Date(userData.last_daily_claim).toDateString() : null;
    if (ultimoReclamo !== hoy) return true;
    if ((userData.diamonds || 0) < 200) return true;
    const nivelesBajos = ['lvl_piscina', 'lvl_fabrica', 'lvl_escuela', 'lvl_hospital'].filter(function(k) { return (userData[k] || 0) < 3; });
    if (nivelesBajos.length >= 3) return true;
    if (!esPremium() && (userData.diamonds || 0) > 3000) return true;
    return false;
}

function actualizarBadgeValeria() {
    const boton = document.getElementById('asistente-boton');
    if (!boton) return;
    if (hayAlgoUrgenteParaValeria()) boton.classList.add('urgente');
    else boton.classList.remove('urgente');
}

function abrirAsistente() {
    closeAll();
    showModal('modalAsistente');
    const mensajeElem = document.getElementById('asistente-mensaje');
    if (mensajeElem) {
        const consejos = getConsejosAsistente();
        let html = '<div style="margin-bottom:10px;">' + getSaludoValeria() + '</div>';
        for (let i = 0; i < consejos.length; i++) {
            html += '<div class="valeria-consejo">' + consejos[i] + '</div>';
        }
        mensajeElem.innerHTML = html;
    }
    actualizarBadgeValeria();
}

function actualizarUI() {
    const diamElem = document.getElementById('diamonds');
    if (diamElem) {
        const valor = Math.floor(userData.diamonds || 0);
        diamElem.textContent = valor;
        const digitos = valor.toString().length;
        let tamano = 22;
        if (digitos >= 5) tamano = 17;
        if (digitos >= 7) tamano = 13;
        if (digitos >= 9) tamano = 11;
        diamElem.style.fontSize = tamano + 'px';
    }
    const rateElem = document.getElementById('rate');
    if (rateElem) rateElem.textContent = Math.floor(getTotalProduction());
    const promedioNiveles = ((userData.lvl_piscina || 0) + (userData.lvl_fabrica || 0) + (userData.lvl_escuela || 0) + (userData.lvl_hospital || 0)) / 4;
    const pctNivel = Math.min(100, Math.round((promedioNiveles / 50) * 100));
    const pctElem = document.getElementById('nivel-municipal-pct');
    if (pctElem) pctElem.textContent = pctNivel + '%';
    const gaugeNivel = document.getElementById('gauge-nivel');
    if (gaugeNivel) gaugeNivel.style.background = 'conic-gradient(#a78bfa ' + (pctNivel * 3.6) + 'deg, rgba(255,255,255,0.08) ' + (pctNivel * 3.6) + 'deg)';
    actualizarBadgeValeria();
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
    const tituloElem = document.getElementById('titulo-tratamiento');
    if (tituloElem) tituloElem.textContent = getTituloAlcalde().toUpperCase();
    const cityNameElem = document.getElementById('city-name-display');
    if (cityNameElem) cityNameElem.textContent = userData.city_name ? '🏙️ ' + userData.city_name : '';
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
        'modalEvent', 'modalDailyReward', 'modalAds', 'modalAsistente', 'modalIdioma'
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
    if (proyeccionElem) proyeccionElem.textContent = Math.floor(userData.projectedReward || 0) + ' 💎';
    const premiumElem = document.getElementById('perfil-premium');
    if (premiumElem) premiumElem.textContent = esPremium() ? 'Sí ⭐' : 'No';
    const rankBadgeElem = document.getElementById('perfil-rank-badge');
    if (rankBadgeElem) rankBadgeElem.textContent = userData.rank || 'Ciudadano';
    const btnGeneroM = document.getElementById('perfil-genero-M');
    const btnGeneroF = document.getElementById('perfil-genero-F');
    if (btnGeneroM) btnGeneroM.classList.toggle('active', (userData.genero || 'M') === 'M');
    if (btnGeneroF) btnGeneroF.classList.toggle('active', userData.genero === 'F');
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
    const enlaceCompleto = 'https://t.me/City_Diamond_Bot?start=' + userData.referral_code;
    const mensaje = '🏙️💎 ¡Únete a Diamond City!\n\n' +
        '🏢 Construye tu propia metrópolis\n' +
        '💎 Genera diamantes con tus edificios\n' +
        '🎰 Juega en el casino y gana premios\n' +
        '🏆 Compite por ser el mejor alcalde\n\n' +
        '¡Entra con mi enlace y arrancamos juntos! 👇\n' + enlaceCompleto;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mensaje).then(function() {
            alert('✅ ¡Mensaje de invitación copiado! Pégalo donde quieras compartirlo.');
        }).catch(function() {
            prompt('Copia este mensaje:', mensaje);
        });
    } else {
        prompt('Copia este mensaje:', mensaje);
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
    const posicionElem = document.getElementById('user-position-display');
    if (posicionElem) posicionElem.textContent = userData.weekly_rank ? '#' + userData.weekly_rank : 'Sin calcular todavía';
    const proyeccionElem = document.getElementById('projected-reward-display');
    if (proyeccionElem) proyeccionElem.textContent = Math.floor(userData.projectedReward || 0) + ' 💎';

    const lista = document.getElementById('ranking-lista');
    if (!lista) return;
    const top = globalPoolData.user_rankings.slice(0, 30);
    if (top.length === 0) {
        lista.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Todavía no hay suficientes alcaldes registrados.</div>';
        return;
    }
    let html = '';
    for (let i = 0; i < top.length; i++) {
        const j = top[i];
        const esYo = j.id === userData.id;
        const medalla = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1)));
        html += '<div class="ranking-fila' + (esYo ? ' yo' : '') + '">';
        html += '<div class="ranking-pos">' + medalla + '</div>';
        const tituloJugador = j.genero === 'F' ? 'Alcaldesa' : 'Alcalde';
        html += '<div class="ranking-info"><div class="ranking-ciudad">🏙️ ' + j.city_name + '</div><div class="ranking-alcalde">' + (esYo ? 'Tú · ' : '') + tituloJugador + ' ' + j.username + '</div></div>';
        html += '<div class="ranking-produccion">⚡' + Math.floor(j.produccion) + '/h</div>';
        html += '</div>';
    }
    lista.innerHTML = html;
}

// ==========================================
// BANCO
// ==========================================
function openBank() {
    closeAll();
    showModal('modalBank');
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
        html += '<div><strong>' + pack.ton.toFixed(2) + ' GRAM</strong><div style="font-size:12px;color:#94a3b8;">+' + pack.diamonds + ' 💎</div></div>';
        html += '<button onclick="comprarTON(' + pack.ton + ')" style="background:' + botonColor + ';border:none;padding:10px 20px;border-radius:30px;color:white;font-weight:700;cursor:pointer;" ' + botonDisabled + '>' + botonTexto + '</button>';
        html += '</div>';
    }
    bankList.innerHTML = html;
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet primero');
    const diamantesAComprar = Math.max(100, Math.floor(tonAmount / CONFIG.PRECIO_COMPRA));
    if (!confirm('¿Confirmas la compra?\n\nPagarás: ' + tonAmount.toFixed(2) + ' GRAM\nRecibirás: ' + diamantesAComprar + ' 💎')) return;

    try {
        const transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: CONFIG.BILLETERA_PROPIETARIO,
                    amount: Math.floor(tonAmount * 1000000000).toString()
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
        registrarEvento('💎', 'Compra de diamantes confirmada', '+' + diamantesAComprar + ' 💎 acreditados');
        actualizarUI();
        spawnConfetti();
        alert('✅ ¡Compra exitosa!\n\nRecibiste ' + diamantesAComprar + ' 💎');
        closeAll();
    } catch (error) {
        console.error('Error en compra:', error);
        alert('❌ Error: ' + (error.message || 'La transacción fue cancelada o rechazada'));
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
                actualizarListaCompra();
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
        html += '<span style="color:#facc15;font-weight:700;font-size:18px;">' + plan.price + ' GRAM</span>';
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
    if (!confirm('¿Activar Premium ' + planSeleccionado.name + ' por ' + planSeleccionado.price + ' GRAM?\n\nDisfrutarás de todos los beneficios Premium.')) return;
    try {
        const transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: CONFIG.BILLETERA_PROPIETARIO,
                amount: Math.floor(planSeleccionado.price * 1000000000).toString()
            }]
        };
        await tonConnectUI.sendTransaction(transaccion);
        const fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + days);
        userData.premium_expires = fechaExpiracion.toISOString();
        registrarEvento('⭐', 'Estatus Premium activado', planSeleccionado.name + ' · Producción x2 habilitada');
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
        userData.diamonds = (userData.diamonds || 0) + 20;
        saveUserData();
        actualizarUI();
        alert('⭐ Como usuario Premium, recibes +20 💎');
        closeAll();
        return;
    }
    showRewardedAd(function(completado) {
        if (completado) {
            userData.diamonds = (userData.diamonds || 0) + 20;
            userData.last_ad_watch = new Date().toISOString();
            registrarEvento('📺', 'Anuncio patrocinador completado', '+20 💎 acreditados a la tesorería');
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
        userData.diamonds = (userData.diamonds || 0) + 50;
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
            userData.diamonds = (userData.diamonds || 0) + 50;
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
    userData.diamonds = (userData.diamonds || 0) + recompensa;
    userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    registrarEvento('🎁', 'Recompensa diaria reclamada', 'Día ' + nuevoDia + ' de 30 · +' + recompensa + ' 💎');
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
    const idBalance = juego === 'highlow' ? 'hl-balance' : (juego + '-balance');
    const balanceElem = document.getElementById(idBalance);
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
    const prefijos = { highlow: 'hl' };
    const prefijo = prefijos[juego] || juego;
    const valorActual = apuestaActual[juego] || 10;
    let nuevoValor = valorActual + delta;
    if (nuevoValor < 1) nuevoValor = 1;
    if (nuevoValor > 1000) nuevoValor = 1000;
    apuestaActual[juego] = nuevoValor;
    const displayElem = document.getElementById(prefijo + '-bet-display');
    if (displayElem) displayElem.textContent = nuevoValor;
    const betElem = document.getElementById(prefijo + '-bet');
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
    if (numeroElem) numeroElem.classList.add('spinning');
    let vueltas = 0;
    const spinInterval = setInterval(function() {
        if (numeroElem) numeroElem.textContent = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        vueltas++;
        if (vueltas >= 10) {
            clearInterval(spinInterval);
            if (numeroElem) {
                numeroElem.classList.remove('spinning');
                numeroElem.textContent = numero.toString().padStart(4, '0');
            }
            const balanceElem = document.getElementById('hl-balance');
            if (balanceElem) balanceElem.textContent = Math.floor(userData.diamonds);
            const resultadoElem = document.getElementById('hl-result');
            if (gana) {
                const ganancia = apuesta * 2;
                userData.diamonds = userData.diamonds + ganancia;
                if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
                if (navigator.vibrate) navigator.vibrate(50);
                spawnConfetti();
                destelloResultado('modalHighLow', true);
            } else {
                if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
                destelloResultado('modalHighLow', false);
            }
            actualizarUI();
            saveUserData();
        }
    }, 70);
}

let numeroElegidoRuleta = null;

function mostrarPanelNumero() {
    const panel = document.getElementById('ruleta-numero-panel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function confirmarNumeroRuleta() {
    const input = document.getElementById('ruleta-numero-input');
    const elegido = parseInt(input.value);
    if (isNaN(elegido) || elegido < 0 || elegido > 36) return alert('❌ Elige un número entre 0 y 36');
    numeroElegidoRuleta = elegido;
    jugarRuleta('numero');
    document.getElementById('ruleta-numero-panel').style.display = 'none';
}

function jugarRuleta(tipo) {
    const apuesta = apuestaActual.ruleta;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('ruleta')) return alert('❌ Límite diario');
    if (tipo === 'numero' && numeroElegidoRuleta === null) return;
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('ruleta');
    let numero = Math.random() < 0.03 ? 0 : Math.floor(Math.random() * 37);
    const numeroElem = document.getElementById('ruleta-number');
    const ruedaElem = document.getElementById('ruleta-wheel');
    if (ruedaElem) {
        ruedaElem.classList.remove('spinning');
        void ruedaElem.offsetWidth;
        ruedaElem.classList.add('spinning');
    }
    setTimeout(function() {
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
                gana = numero === numeroElegidoRuleta;
                numeroElegidoRuleta = null;
                break;
        }
        const resultadoElem = document.getElementById('ruleta-result');
        if (gana) {
            const ganancia = (tipo === 'numero') ? apuesta * 36 : apuesta * 2;
            userData.diamonds = userData.diamonds + ganancia;
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎉 ¡GANASTE! +' + ganancia + ' 💎</span>';
            if (navigator.vibrate) navigator.vibrate(50);
            spawnConfetti();
            destelloResultado('modalRuleta', true);
        } else {
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
            destelloResultado('modalRuleta', false);
        }
        actualizarUI();
        saveUserData();
    }, 1200);
}

function jugarTragaperras() {
    const apuesta = apuestaActual.tragaperras;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('tragaperras')) return alert('❌ Límite diario');
    userData.diamonds = userData.diamonds - apuesta;
    registrarJugada('tragaperras');
    const slots = document.querySelectorAll('.slot');
    slots.forEach(function(slot) { slot.classList.add('spinning'); });
    const simbolosSpin = ['💎', '₿', 'Ξ', '🪙', '📈', '📉'];
    const spinCycle = setInterval(function() {
        slots.forEach(function(slot) { slot.textContent = simbolosSpin[Math.floor(Math.random() * simbolosSpin.length)]; });
    }, 80);
    setTimeout(function() {
        clearInterval(spinCycle);
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
            destelloResultado('modalTragaperras', true);
        } else {
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
            destelloResultado('modalTragaperras', false);
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
    const dadosSpinCycle = setInterval(function() {
        if (dado1Elem) dado1Elem.textContent = caras[Math.floor(Math.random() * 6)];
        if (dado2Elem) dado2Elem.textContent = caras[Math.floor(Math.random() * 6)];
    }, 70);
    setTimeout(function() {
        clearInterval(dadosSpinCycle);
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
            spawnConfetti();
            destelloResultado('modalDados', true);
        } else {
            if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;">😞 Perdiste ' + apuesta + ' 💎</span>';
            destelloResultado('modalDados', false);
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
    if (emojiElem) emojiElem.textContent = '🔫';
    const botones = document.querySelectorAll('#ruletarusa-camaras button');
    botones.forEach(function(b) { b.disabled = true; });
    let vueltas = 0;
    const suspenso = setInterval(function() {
        botones.forEach(function(b) { b.classList.remove('camara-activa'); });
        const activa = botones[vueltas % botones.length];
        if (activa) activa.classList.add('camara-activa');
        vueltas++;
        if (vueltas >= 12) {
            clearInterval(suspenso);
            botones.forEach(function(b) { b.classList.remove('camara-activa'); });
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
                destelloResultado('modalRuletaRusa', true);
            } else {
                if (resultadoElem) resultadoElem.innerHTML = '<span style="color:#ef4444;font-size:20px;">💥 ¡La bala estaba en la cámara ' + bala + '! Perdiste ' + apuesta + ' 💎</span>';
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                destelloResultado('modalRuletaRusa', false);
            }
            actualizarUI();
            saveUserData();
            crearCamarasRuletaRusa();
        }
    }, 120);
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
    const headerLevelElem = document.getElementById(building + '-game-level');
    if (headerLevelElem) headerLevelElem.textContent = userData['lvl_' + building] || 0;
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
    const iconos = { escuela: '🏫', fabrica: '🏭', piscina: '🏊', hospital: '🏥' };
    const producciones = { escuela: 15, fabrica: 25, piscina: 10, hospital: 18 };
    const produccionEdificio = userData['lvl_' + building] * producciones[building];
    registrarEvento(iconos[building], nombres[building] + ' mejorada a nivel ' + userData['lvl_' + building], 'Ahora produce ' + produccionEdificio + ' 💎/h');
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
        if (indice >= escuelaSequence.length) { display.innerHTML = ''; crearPupitres(); return; }
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
        userData.diamonds = (userData.diamonds || 0) + recompensa;
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

function crearUnaPiezaFabrica() {
    const belt = document.getElementById('conveyor');
    if (!belt || !gameActiveStates.fabrica) return;
    const piece = document.createElement('div');
    piece.className = 'moving-piece';
    const isGood = Math.random() > Math.min(0.25, fabricaLevel / 200);
    piece.classList.add(isGood ? 'piece-good' : 'piece-bad');
    piece.textContent = isGood ? '🔧' : '💢';
    piece.style.top = (20 + Math.random() * 60) + 'px';
    piece.style.animationDuration = (3 + Math.random() * 4) + 's';
    piece.style.animationDelay = '0s';
    piece.onclick = function(e) { e.stopPropagation(); checkFabricaHitPiece(this); };
    belt.appendChild(piece);
    fabricaPieces.push({ el: piece, isGood: isGood, clicked: false });
}

function crearPiezasFabrica() {
    const belt = document.getElementById('conveyor');
    if (!belt) return;
    belt.querySelectorAll('.moving-piece').forEach(function(p) { p.remove(); });
    if (fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    fabricaPieces = [];
    const numPieces = Math.min(2 + Math.floor(fabricaLevel / 20), 8);
    for (let i = 0; i < numPieces; i++) {
        crearUnaPiezaFabrica();
    }
    fabricaAnimInterval = setInterval(function() {
        if (!gameActiveStates.fabrica) { clearInterval(fabricaAnimInterval); return; }
        const piezasVivas = fabricaPieces.filter(function(p) { return !p.clicked; }).length;
        if (piezasVivas < numPieces) crearUnaPiezaFabrica();
    }, 1500);
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
            userData.diamonds = (userData.diamonds || 0) + recompensa;
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
        setTimeout(function() { piece.remove(); }, 300);
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
    piscinaCombo = 0;
    piscinaRequired = Math.min(3 + Math.floor(piscinaLevel / 30), 8);
    gameLives.piscina = userData.gameStats.piscina.lives || 3;
    updateLivesUI('piscina');
    document.getElementById('jump-perfect').textContent = piscinaPerfect;
    document.getElementById('jump-required').textContent = piscinaRequired;
    document.getElementById('jump-best').textContent = piscinaBest;
    document.getElementById('piscina-combo').textContent = piscinaCombo;
    document.getElementById('piscina-game-level').textContent = piscinaLevel;
    document.getElementById('jump-result').innerHTML = '';
    piscinaGameStarted = true;
    const startBtn = document.getElementById('piscina-start-btn');
    if (startBtn) startBtn.style.display = 'none';
    iniciarRondaPiscina();
}

function iniciarRondaPiscina() {
    const anchoZona = Math.max(14, 40 - piscinaLevel * 0.8);
    const centro = 35 + Math.random() * 30;
    piscinaZonaInicio = Math.max(2, centro - anchoZona / 2);
    piscinaZonaFin = Math.min(98, centro + anchoZona / 2);
    const zonaElem = document.getElementById('power-zone');
    if (zonaElem) {
        zonaElem.style.left = piscinaZonaInicio + '%';
        zonaElem.style.width = (piscinaZonaFin - piscinaZonaInicio) + '%';
    }
    piscinaPower = 0;
    piscinaDireccion = 1;
    const duracionCiclo = Math.max(700, 1600 - piscinaLevel * 15);
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    const pasoPorTick = (100 / (duracionCiclo / 30)) * 2;
    piscinaChargeInterval = setInterval(function() {
        piscinaPower += pasoPorTick * piscinaDireccion;
        if (piscinaPower >= 100) { piscinaPower = 100; piscinaDireccion = -1; }
        if (piscinaPower <= 0) { piscinaPower = 0; piscinaDireccion = 1; }
        const needle = document.getElementById('power-needle');
        if (needle) needle.style.left = piscinaPower + '%';
        const display = document.getElementById('jump-power-display');
        if (display) display.textContent = Math.floor(piscinaPower) + '%';
    }, 30);
}

function startSlingshot() {
    if (!gameActiveStates.piscina || !piscinaGameStarted) return;
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    const needle = document.getElementById('power-needle');
    if (needle) needle.style.animation = 'pulse 0.3s ease 3';
    setTimeout(function() {
        if (needle) needle.style.animation = '';
    }, 1000);
}

function releaseSlingshot() {
    saltarPiscina();
}

function crearSplash(exito) {
    const area = document.getElementById('slingshot-area');
    if (!area) return;
    const emojis = exito ? ['💧', '✨', '🌊'] : ['💦'];
    for (let i = 0; i < 6; i++) {
        const drop = document.createElement('div');
        drop.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        drop.style.cssText = 'position:absolute;left:' + (40 + Math.random() * 20) + '%;bottom:20px;font-size:' + (16 + Math.random() * 10) + 'px;animation:splashDrop 0.7s ease forwards;pointer-events:none;z-index:20;';
        area.appendChild(drop);
        setTimeout(function() { if (drop.parentNode) drop.remove(); }, 700);
    }
}

function saltarPiscina() {
    if (!gameActiveStates.piscina || !piscinaGameStarted) return;
    if (piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    const potenciaFinal = piscinaPower;
    const esPerfecto = potenciaFinal >= piscinaZonaInicio && potenciaFinal <= piscinaZonaFin;
    if (esPerfecto) {
        piscinaCombo++;
        piscinaPerfect++;
        document.getElementById('jump-perfect').textContent = piscinaPerfect;
        document.getElementById('piscina-combo').textContent = piscinaCombo;
        crearSplash(true);
        const bonusCombo = 1 + Math.min(piscinaCombo * 0.1, 1);
        document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;">🎯 ¡Clavado perfecto! x' + bonusCombo.toFixed(1) + '</span>';
        if (navigator.vibrate) navigator.vibrate(40);
        if (piscinaPerfect >= piscinaRequired) {
            const recompensa = Math.floor(calcularRecompensa(6, 'piscina') * bonusCombo);
            userData.diamonds = (userData.diamonds || 0) + recompensa;
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
            setTimeout(function() { iniciarJuegoPiscina(); }, 1800);
            return;
        }
    } else {
        piscinaCombo = 0;
        document.getElementById('piscina-combo').textContent = piscinaCombo;
        crearSplash(false);
        const sigueVivo = loseLife('piscina');
        if (sigueVivo) {
            document.getElementById('jump-result').innerHTML = '<span style="color:#ef4444;">💦 ¡Fallaste! (' + Math.floor(potenciaFinal) + '%, zona ' + Math.floor(piscinaZonaInicio) + '-' + Math.floor(piscinaZonaFin) + '%)</span>';
        } else {
            return;
        }
    }
    setTimeout(function() {
        if (gameActiveStates.piscina && gameLives.piscina > 0) {
            document.getElementById('jump-result').innerHTML = '';
            iniciarRondaPiscina();
        }
    }, 1200);
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
                    userData.diamonds = (userData.diamonds || 0) + recompensa;
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
        const resultado = await _supabase.from('game_data').select('telegram_id, username, city_name, diamonds, lvl_piscina, lvl_fabrica, lvl_escuela, lvl_hospital, premium_expires, genero').neq('telegram_id', 'MASTER');
        if (!resultado.error && resultado.data) {
            const ahora = new Date();
            globalPoolData.user_rankings = resultado.data.map(function(u) {
                let produccion = (u.lvl_escuela || 0) * 15 + (u.lvl_fabrica || 0) * 25 + (u.lvl_piscina || 0) * 10 + (u.lvl_hospital || 0) * 18;
                const esPremiumU = u.premium_expires && new Date(u.premium_expires) > ahora;
                if (esPremiumU) produccion = produccion * 2;
                return {
                    id: u.telegram_id,
                    username: u.username || 'Alcalde',
                    genero: u.genero || 'M',
                    city_name: u.city_name || 'Ciudad sin nombre',
                    diamonds: Number(u.diamonds) || 0,
                    produccion: produccion
                };
            }).sort(function(a, b) { return b.produccion - a.produccion; });
        }
        const posicion = globalPoolData.user_rankings.findIndex(function(u) { return u.id === userData.id; });
        if (posicion !== -1) {
            if (posicion < 3) userData.rank = "Diamante";
            else if (posicion < 10) userData.rank = "Oro";
            else if (posicion < 50) userData.rank = "Plata";
            else userData.rank = "Ciudadano";
            userData.weekly_rank = posicion + 1;
        }
        const PREMIO_SEMANAL_DIAMANTES = 20000;
        if (posicion < 3) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.4) / 3;
        else if (posicion < 10) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.25) / 7;
        else if (posicion < 50) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.20) / 40;
        else {
            const ciudadanos = globalPoolData.user_rankings.slice(50);
            let totalProduccionCiudadanos = 0;
            for (let i = 0; i < ciudadanos.length; i++) totalProduccionCiudadanos = totalProduccionCiudadanos + ciudadanos[i].produccion;
            if (totalProduccionCiudadanos > 0 && getTotalProduction() > 0) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.15) * (getTotalProduction() / totalProduccionCiudadanos);
            else userData.projectedReward = 0;
        }
    } catch (error) { console.error('Error ranking:', error); }
}

// ==========================================
// GUARDADO SUPABASE
// ==========================================
async function saveUserData() {
    if (!userData.id) return;
    try {
        const datos = {
            diamonds: Math.floor(userData.diamonds || 0),
            lvl_piscina: userData.lvl_piscina || 0,
            lvl_fabrica: userData.lvl_fabrica || 0,
            lvl_escuela: userData.lvl_escuela || 0,
            lvl_hospital: userData.lvl_hospital || 0,
            last_online: new Date().toISOString(),
            premium_expires: userData.premium_expires,
            daily_streak: userData.daily_streak || 0,
            last_daily_claim: userData.last_daily_claim,
            event_progress: userData.event_progress || {},
            gamestats: userData.gameStats,
            referral_earnings: userData.referral_earnings || 0,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue,
            last_production_update: userData.last_production_update || new Date().toISOString(),
            city_name: userData.city_name || null,
            news_feed: userData.newsFeed || [],
            genero: userData.genero || 'M',
            idioma: userData.idioma || 'es'
        };
        const resultado = await _supabase.from('game_data').update(datos).eq('telegram_id', userData.id);
        if (resultado.error) {
            console.error('Error al guardar:', resultado.error);
        } else {
            console.log('💾 Datos guardados correctamente');
        }
    } catch (error) {
        console.error('Error guardando:', error);
    }
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
                last_production_update: new Date().toISOString(),
                gamestats: {
                    escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
                }
            };
            await _supabase.from('game_data').insert([nuevoUsuario]);
            userData = Object.assign({}, userData, nuevoUsuario, { id: tgId.toString() });
            const codigoInvitacion = tg.initDataUnsafe && tg.initDataUnsafe.start_param;
            if (codigoInvitacion) {
                try {
                    await fetch('/api/register-referral', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newUserId: tgId.toString(), referralCode: codigoInvitacion })
                    });
                } catch (e) { console.error('Error registrando referido:', e); }
            }
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
                last_production_update: datos.last_production_update || null,
                city_name: datos.city_name || null,
                newsFeed: datos.news_feed || [],
                genero: datos.genero || 'M',
                idioma: datos.idioma || 'es',
                gameStats: datos.gamestats || {
                    escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                    hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
                }
            });
            aplicarProduccionOffline();
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
        userData.diamonds = (userData.diamonds || 0) + produccionPorSegundo;
        userData.last_production_update = new Date().toISOString();
        const diamantesElem = document.getElementById('diamonds');
        if (diamantesElem) diamantesElem.textContent = Math.floor(userData.diamonds);
    }, 1000);
}

function aplicarProduccionOffline() {
    if (!userData.last_production_update) {
        userData.last_production_update = new Date().toISOString();
        return;
    }
    const ahora = new Date();
    const ultimaVez = new Date(userData.last_production_update);
    let segundosTranscurridos = (ahora - ultimaVez) / 1000;
    if (segundosTranscurridos <= 0) return;
    const TOPE_SEGUNDOS = 12 * 60 * 60;
    if (segundosTranscurridos > TOPE_SEGUNDOS) segundosTranscurridos = TOPE_SEGUNDOS;
    const produccionGanada = (getTotalProduction() / 3600) * segundosTranscurridos;
    if (produccionGanada > 0 && isFinite(produccionGanada)) {
        userData.diamonds = (userData.diamonds || 0) + produccionGanada;
    }
    userData.last_production_update = ahora.toISOString();
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================
async function initApp() {
    console.log('🔄 Iniciando DIAMOND CITY...');
    tg.expand();
    tg.ready();
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    if (usuario) {
        userData.id = usuario.id.toString();
        userData.username = usuario.first_name || 'Usuario';
        await loadUserFromDB(usuario.id);
        userData.username = usuario.first_name || 'Usuario';
    } else {
        userData.id = 'test_' + Date.now();
        userData.username = 'Usuario Test';
        userData.referral_code = 'REF' + userData.id.slice(-6);
    }
    document.getElementById('user-display').textContent = userData.username;
    if (usuario && usuario.photo_url) {
        const userDisplayElem = document.getElementById('user-display');
        if (userDisplayElem && !document.getElementById('user-avatar-main')) {
            const img = document.createElement('img');
            img.id = 'user-avatar-main';
            img.src = usuario.photo_url;
            img.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle;';
            userDisplayElem.parentNode.insertBefore(img, userDisplayElem);
        }
    }
    await initTONConnect();
    setTimeout(initAds, 3000);
    await updateRankingAndPool();
    startProduction();
    actualizarEventosUI();
    setInterval(saveUserData, 10000);
    setInterval(async function() { await updateRankingAndPool(); actualizarEventosUI(); }, 60000);
    window.addEventListener('beforeunload', function() { saveUserData(); });
    mostrarOnboardingSiHaceFalta();
    renderizarFeedNoticias();
    aplicarIdioma();
    const labelIdioma = document.getElementById('idioma-actual-label');
    if (labelIdioma) labelIdioma.textContent = NOMBRES_IDIOMA[userData.idioma] || 'Español';
    console.log('✅ DIAMOND CITY - Sistema completamente inicializado');
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
window.startEventTask = startEventTask;
window.reviveGame = reviveGame;
window.useAdMultiplier = useAdMultiplier;
window.switchTab = switchTab;
window.iniciarJuegoEscuela = iniciarJuegoEscuela;
window.iniciarJuegoFabrica = iniciarJuegoFabrica;
window.iniciarJuegoPiscina = iniciarJuegoPiscina;
window.saltarPiscina = saltarPiscina;
window.iniciarJuegoHospital = iniciarJuegoHospital;
window.checkFabricaHitPiece = checkFabricaHitPiece;
window.startSlingshot = startSlingshot;
window.releaseSlingshot = releaseSlingshot;
window.confirmarNombreCiudad = confirmarNombreCiudad;
window.abrirAsistente = abrirAsistente;
window.seleccionarIdioma = seleccionarIdioma;
window.abrirSelectorIdioma = abrirSelectorIdioma;
window.seleccionarGenero = seleccionarGenero;
window.cambiarGeneroPerfil = cambiarGeneroPerfil;

console.log('📦 DIAMOND CITY - Todos los módulos exportados correctamente');
