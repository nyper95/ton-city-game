// ======================================================
// TON CITY GAME - VERSIÓN CON MINIJUEGOS POR EDIFICIO
// ======================================================
// ✅ Piscina: Clavadistas (juego de precisión)
// ✅ Fábrica: Cinta transportadora (juego de reflejos)
// ✅ Escuela: Memoria académica (juego de memoria)
// ✅ Hospital: Diagnóstico rápido (juego de preguntas)
// ✅ Anuncios para multiplicar o revivir
// ✅ Eventos como multiplicador de ganancias
// ✅ Premium: multiplicador base x2 y anuncios gratis
// ======================================================

console.log("✅ Ton City Game - Versión con Minijuegos");

const tg = window.Telegram.WebApp;

// ==========================================
// CONFIGURACIÓN
// ==========================================
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
// CONSTANTES
// ==========================================
const K = 0.9;
const R = 0.95;

// ==========================================
// ESTADO DEL JUEGO
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let adsReady = false;
let AdController = null;

let userData = {
    id: null,
    username: "Cargando...",
    firstName: "",
    lastName: "",
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
    weekly_earnings: 0,
    rank: "Ciudadano",
    projectedReward: 0,
    event_progress: {},
    accumulated_ton: 0,
    
    // Estadísticas de minijuegos
    gameStats: {
        piscina: { streak: 0, total: 0, wins: 0, lastPlay: null, limit: 0 },
        fabrica: { score: 0, total: 0, wins: 0, lastPlay: null, limit: 0 },
        escuela: { matches: 0, attempts: 0, total: 0, wins: 0, lastPlay: null, limit: 0 },
        hospital: { streak: 0, level: 1, total: 0, wins: 0, lastPlay: null, limit: 0 }
    },
    
    // Estado actual de juegos
    gameState: {
        piscina: { active: false, bet: 10, result: null, multiplier: 1 },
        fabrica: { active: false, bet: 10, result: null, multiplier: 1, boxes: [], target: null },
        escuela: { active: false, bet: 10, result: null, multiplier: 1, cards: [], flipped: [], matched: [] },
        hospital: { active: false, bet: 10, result: null, multiplier: 1, currentQuestion: null }
    },
    
    jugadasHoy: {
        piscina: 0,
        fabrica: 0,
        escuela: 0,
        hospital: 0,
        highlow: 0,
        ruleta: 0,
        tragaperras: 0,
        dados: 0,
        loteria: 0,
        fecha: new Date().toDateString()
    }
};

let globalPoolData = { 
    pool_ton: 0, 
    total_diamonds: 0,
    last_updated: null,
    user_rankings: []
};

// 🏗️ VALORES DE PRODUCCIÓN
const PROD_VAL = { 
    piscina: 60,
    fabrica: 120,
    escuela: 40,
    hospital: 80
};

// 💎 PLANES PREMIUM
const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20, description: "⭐ 24 horas de beneficios" },
    { name: "7 días", days: 7, price: 1.00, description: "⭐ Una semana sin anuncios + x2" },
    { name: "14 días", days: 14, price: 1.50, description: "⭐⭐ 2 semanas de ventajas" },
    { name: "21 días", days: 21, price: 2.50, description: "⭐⭐⭐ 3 semanas premium" },
    { name: "1 mes", days: 30, price: 3.00, description: "👑 30 días de beneficios completos" }
];

// 🎯 EVENTOS SEMANALES
const EVENTOS_SEMANALES = [
    {
        nombre: "Hospital",
        edificio: "hospital",
        icono: "fa-hospital",
        color: "#f87171",
        descripcion: "Campaña de Vacunación Digital",
        tarea: "Ver anuncios para ayudar a vacunar a la ciudad",
        recompensa: 100,
        premium: 200,
        tipo: 'ads',
        requeridos: 3,
        requeridos_premium: 1,
        gameMultiplier: 2 // Multiplicador para minijuegos del edificio
    },
    {
        nombre: "Fábrica",
        edificio: "fabrica",
        icono: "fa-industry",
        color: "#a78bfa",
        descripcion: "Contratos de Exportación",
        tarea: "Ver anuncios para recibir ofertas exclusivas",
        recompensa: 150,
        premium: 300,
        tipo: 'ads',
        requeridos: 3,
        requeridos_premium: 1,
        gameMultiplier: 2
    },
    {
        nombre: "Piscina",
        edificio: "piscina",
        icono: "fa-water-ladder",
        color: "#38bdf8",
        descripcion: "Publicidad del Resort",
        tarea: "Ver anuncios para promocionar el resort",
        recompensa: 80,
        premium: 160,
        tipo: 'ads',
        requeridos: 3,
        requeridos_premium: 1,
        gameMultiplier: 2
    },
    {
        nombre: "Escuela",
        edificio: "escuela",
        icono: "fa-school",
        color: "#a16207",
        descripcion: "Becas de Estudio",
        tarea: "Ver anuncios para financiar becas",
        recompensa: 200,
        premium: 400,
        tipo: 'ads',
        requeridos: 3,
        requeridos_premium: 1,
        gameMultiplier: 2
    }
];

// 📚 PREGUNTAS PARA EL HOSPITAL
const HOSPITAL_QUESTIONS = [
    { question: "¿Cuál es el órgano más grande del cuerpo humano?", options: ["Corazón", "Piel", "Hígado", "Pulmones"], correct: 1 },
    { question: "¿Cuántos huesos tiene un adulto?", options: ["206", "208", "210", "212"], correct: 0 },
    { question: "¿Qué vitamina produce el sol?", options: ["Vitamina A", "Vitamina B", "Vitamina C", "Vitamina D"], correct: 3 },
    { question: "¿Cuál es el hueso más largo del cuerpo?", options: ["Fémur", "Tibia", "Húmero", "Radio"], correct: 0 },
    { question: "¿Qué órgano bombea sangre?", options: ["Pulmones", "Corazón", "Hígado", "Riñones"], correct: 1 },
    { question: "¿Cuántos litros de sangre tiene un adulto?", options: ["2-3", "4-5", "5-6", "7-8"], correct: 2 },
    { question: "¿Qué parte del cuerpo nunca descansa?", options: ["Corazón", "Pulmones", "Cerebro", "Todos"], correct: 0 },
    { question: "¿Cuál es la función de los glóbulos rojos?", options: ["Defensa", "Transporte O2", "Coagulación", "Ninguna"], correct: 1 }
];

// ==========================================
// FUNCIONES PREMIUM
// ==========================================
function esPremium() {
    if (!userData.premium_expires) return false;
    const ahora = new Date();
    const expiracion = new Date(userData.premium_expires);
    return ahora < expiracion;
}

function getPremiumTimeLeft() {
    if (!userData.premium_expires) return 0;
    const ahora = new Date();
    const expiracion = new Date(userData.premium_expires);
    if (ahora >= expiracion) return 0;
    const diffMs = expiracion - ahora;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias > 0) return `${diffDias} día${diffDias > 1 ? 's' : ''}`;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
}

function actualizarPremiumUI() {
    const userElem = document.getElementById("user-display");
    const premiumTimer = document.getElementById("premium-timer");
    const premiumTimeElem = document.getElementById("premium-time-left");
    
    if (esPremium()) {
        if (userElem) userElem.classList.add("premium-user");
        if (premiumTimer && premiumTimeElem) {
            premiumTimer.style.display = "block";
            premiumTimeElem.textContent = getPremiumTimeLeft();
        }
    } else {
        if (userElem) userElem.classList.remove("premium-user");
        if (premiumTimer) premiumTimer.style.display = "none";
    }
}

// ==========================================
// FUNCIÓN PARA OBTENER EVENTO ACTUAL
// ==========================================
function getEventoActual() {
    const semana = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % EVENTOS_SEMANALES.length;
    return EVENTOS_SEMANALES[semana];
}

function actualizarBannerEvento() {
    const evento = getEventoActual();
    const banner = document.getElementById("event-banner");
    const textElem = document.getElementById("event-text");
    
    if (banner && textElem) {
        banner.style.display = "block";
        banner.style.background = `linear-gradient(135deg, ${evento.color}, ${evento.color}dd)`;
        textElem.innerHTML = `🎉 Evento: ${evento.nombre} - ${evento.descripcion} (x${evento.gameMultiplier} en juegos)`;
        
        // Quitar clase event-card de todos los edificios
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('event-card');
        });
        
        // Destacar edificio de la semana
        const edificioCard = document.querySelector(`.card[onclick*="${evento.edificio}"]`);
        if (edificioCard) {
            edificioCard.classList.add('event-card');
        }
        
        // Actualizar multiplicadores en los juegos
        actualizarMultiplicadoresEvento();
    }
}

function actualizarMultiplicadoresEvento() {
    const evento = getEventoActual();
    const edificios = ['piscina', 'fabrica', 'escuela', 'hospital'];
    
    edificios.forEach(ed => {
        const multiplier = (ed === evento.edificio) ? evento.gameMultiplier : 1;
        userData.gameState[ed].multiplier = multiplier;
        
        const elem = document.getElementById(`${ed}-multiplier`);
        if (elem) {
            if (multiplier > 1) {
                elem.textContent = `x${multiplier} 🎉`;
                elem.style.background = '#f97316';
            } else {
                elem.textContent = 'x1';
                elem.style.background = '';
            }
        }
    });
}

// ==========================================
// FUNCIÓN DE EDIFICIOS (CON MINIJUEGOS)
// ==========================================
function openBuilding(building) {
    const evento = getEventoActual();
    const precios = {
        piscina: 5000,
        fabrica: 10000,
        escuela: 3000,
        hospital: 7500
    };
    
    const producciones = {
        piscina: 60,
        fabrica: 120,
        escuela: 40,
        hospital: 80
    };
    
    const nivel = userData[`lvl_${building}`] || 0;
    const precio = precios[building];
    const prod = producciones[building];
    
    // Actualizar información de mejoras
    const levelElem = document.getElementById(`${building}-level`);
    const prodElem = document.getElementById(`${building}-prod`);
    const nextElem = document.getElementById(`${building}-next`);
    const priceElem = document.getElementById(`${building}-price`);
    const btnElem = document.getElementById(`${building}-btn`);
    
    if (levelElem) levelElem.textContent = nivel;
    if (prodElem) prodElem.textContent = nivel * prod;
    if (nextElem) nextElem.textContent = nivel + 1;
    if (priceElem) priceElem.textContent = `${precio.toLocaleString()} 💎`;
    
    if (btnElem) {
        btnElem.disabled = userData.diamonds < precio;
        btnElem.style.background = userData.diamonds < precio ? '#475569' : '#2563eb';
    }
    
    // Inicializar el juego del edificio
    inicializarJuego(building);
    
    // Mostrar modal
    showModal(`modal${building.charAt(0).toUpperCase() + building.slice(1)}`);
}

function inicializarJuego(building) {
    // Actualizar límites diarios
    actualizarLimiteJuego(building);
    
    // Actualizar apuesta actual
    const betElem = document.getElementById(`${building}-bet`);
    if (betElem) {
        betElem.textContent = userData.gameState[building].bet;
    }
    
    // Inicializar juegos específicos
    switch(building) {
        case 'fabrica':
            iniciarFabricaJuego();
            break;
        case 'escuela':
            iniciarEscuelaJuego();
            break;
        case 'hospital':
            cargarPreguntaHospital();
            break;
    }
}

// ==========================================
// SISTEMA DE LÍMITES PARA MINIJUEGOS
// ==========================================
function puedeJugarMinijuego(building, cantidad = 1) {
    if (userData.haInvertido) return true;
    
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        resetearLimitesDiarios();
    }
    
    const limites = { piscina: 20, fabrica: 20, escuela: 20, hospital: 20 };
    const jugadas = userData.jugadasHoy[building] || 0;
    
    return (jugadas + cantidad) <= limites[building];
}

function resetearLimitesDiarios() {
    const hoy = new Date().toDateString();
    userData.jugadasHoy = {
        piscina: 0,
        fabrica: 0,
        escuela: 0,
        hospital: 0,
        highlow: 0,
        ruleta: 0,
        tragaperras: 0,
        dados: 0,
        loteria: 0,
        fecha: hoy
    };
}

function registrarJugadaMinijuego(building, cantidad = 1) {
    if (!userData.haInvertido) {
        userData.jugadasHoy[building] += cantidad;
        actualizarLimiteJuego(building);
    }
}

function actualizarLimiteJuego(building) {
    const limiteElem = document.getElementById(`${building}-limit`);
    if (!limiteElem) return;
    
    if (userData.haInvertido) {
        limiteElem.innerHTML = '✅ Inversor - Sin límites';
        limiteElem.style.color = '#4ade80';
    } else {
        const jugadas = userData.jugadasHoy[building] || 0;
        limiteElem.innerHTML = `Jugadas hoy: ${jugadas}/20`;
        limiteElem.style.color = '#f59e0b';
    }
}

// ==========================================
// AJUSTAR APUESTA
// ==========================================
function adjustBet(building, delta) {
    let nueva = userData.gameState[building].bet + delta;
    if (nueva < 5) nueva = 5;
    if (nueva > 500) nueva = 500;
    
    userData.gameState[building].bet = nueva;
    
    const betElem = document.getElementById(`${building}-bet`);
    if (betElem) betElem.textContent = nueva;
}

// ==========================================
// MINIJUEGO 1: PISCINA - CLAVADISTAS
// ==========================================
function playPiscinaGame(diverNumber) {
    const building = 'piscina';
    const apuesta = userData.gameState[building].bet;
    
    // Verificar fondos
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    // Verificar límite diario
    if (!puedeJugarMinijuego(building)) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    // Restar apuesta
    userData.diamonds -= apuesta;
    registrarJugadaMinijuego(building);
    
    // Determinar resultado (aleatorio con sesgo)
    const random = Math.random();
    let ganador;
    
    // El clavadista 3 tiene más probabilidad (trampa para hacer el juego más divertido)
    if (diverNumber === 3) {
        ganador = random < 0.4; // 40% de ganar
    } else {
        ganador = random < 0.2; // 20% de ganar para otros
    }
    
    // Calcular ganancia
    const multiplicadorBase = userData.gameState[building].multiplier;
    const multiplicadorPremium = esPremium() ? 2 : 1;
    const multiplicadorTotal = multiplicadorBase * multiplicadorPremium;
    
    let ganancia = 0;
    let mensaje = '';
    
    if (ganador) {
        ganancia = apuesta * 2 * multiplicadorTotal;
        userData.diamonds += ganancia;
        mensaje = `🎉 ¡GANASTE! +${ganancia} 💎 (x${multiplicadorTotal})`;
        
        // Actualizar estadísticas
        if (!userData.gameStats[building]) userData.gameStats[building] = { streak: 0, wins: 0, total: 0 };
        userData.gameStats[building].streak = (userData.gameStats[building].streak || 0) + 1;
        userData.gameStats[building].wins = (userData.gameStats[building].wins || 0) + 1;
    } else {
        mensaje = `😞 Perdiste -${apuesta} 💎`;
        userData.gameStats[building].streak = 0;
    }
    
    userData.gameStats[building].total = (userData.gameStats[building].total || 0) + 1;
    
    // Actualizar UI
    document.getElementById('piscina-result').innerHTML = 
        ganador ? `<span class="win-message">${mensaje}</span>` : `<span class="lose-message">${mensaje}</span>`;
    
    document.getElementById('piscina-streak').textContent = userData.gameStats[building].streak || 0;
    
    const precision = userData.gameStats[building].total > 0 
        ? Math.round((userData.gameStats[building].wins / userData.gameStats[building].total) * 100)
        : 0;
    document.getElementById('piscina-accuracy').textContent = precision + '%';
    
    actualizarUI();
    saveUserData();
}

// ==========================================
// MINIJUEGO 2: FÁBRICA - CINTA TRANSPORTADORA
// ==========================================
function iniciarFabricaJuego() {
    const building = 'fabrica';
    
    // Crear cajas
    const boxes = [];
    for (let i = 0; i < 8; i++) {
        boxes.push({
            id: i,
            value: Math.floor(Math.random() * 10) + 1,
            selected: false
        });
    }
    
    // Elegir caja objetivo (la que da premio)
    const targetIndex = Math.floor(Math.random() * boxes.length);
    const targetValue = boxes[targetIndex].value;
    
    userData.gameState[building].boxes = boxes;
    userData.gameState[building].target = targetIndex;
    userData.gameState[building].active = true;
    
    // Renderizar cinta
    renderizarCinta(building);
}

function renderizarCinta(building) {
    const conveyor = document.getElementById('conveyor-belt');
    if (!conveyor) return;
    
    const boxes = userData.gameState[building].boxes;
    let html = '';
    
    boxes.forEach((box, index) => {
        const isTarget = index === userData.gameState[building].target;
        html += `<div class="box" onclick="selectFabricaBox(${index})" 
                       style="background: ${isTarget ? '#facc15' : '#f97316'};">
                    ${box.value}
                </div>`;
    });
    
    conveyor.innerHTML = html;
}

function selectFabricaBox(index) {
    const building = 'fabrica';
    const apuesta = userData.gameState[building].bet;
    
    if (!userData.gameState[building].active) {
        alert("❌ Inicia un nuevo juego primero");
        return;
    }
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugarMinijuego(building)) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    registrarJugadaMinijuego(building);
    
    const isTarget = index === userData.gameState[building].target;
    const multiplicadorBase = userData.gameState[building].multiplier;
    const multiplicadorPremium = esPremium() ? 2 : 1;
    const multiplicadorTotal = multiplicadorBase * multiplicadorPremium;
    
    let ganancia = 0;
    let mensaje = '';
    
    if (isTarget) {
        const boxValue = userData.gameState[building].boxes[index].value;
        ganancia = apuesta * boxValue * multiplicadorTotal;
        userData.diamonds += ganancia;
        mensaje = `🎉 ¡CAJA CORRECTA! +${ganancia} 💎 (x${multiplicadorTotal})`;
        
        // Actualizar estadísticas
        if (!userData.gameStats[building]) userData.gameStats[building] = { score: 0, wins: 0, total: 0 };
        userData.gameStats[building].score = (userData.gameStats[building].score || 0) + boxValue;
        userData.gameStats[building].wins = (userData.gameStats[building].wins || 0) + 1;
    } else {
        mensaje = `😞 Caja incorrecta -${apuesta} 💎`;
    }
    
    userData.gameStats[building].total = (userData.gameStats[building].total || 0) + 1;
    
    document.getElementById('fabrica-result').innerHTML = 
        isTarget ? `<span class="win-message">${mensaje}</span>` : `<span class="lose-message">${mensaje}</span>';
    
    document.getElementById('fabrica-score').textContent = userData.gameStats[building].score || 0;
    
    userData.gameState[building].active = false;
    actualizarUI();
    saveUserData();
}

function startFabricaGame() {
    iniciarFabricaJuego();
    document.getElementById('fabrica-result').innerHTML = '¡Elige una caja!';
}

// ==========================================
// MINIJUEGO 3: ESCUELA - MEMORIA ACADÉMICA
// ==========================================
function iniciarEscuelaJuego() {
    const building = 'escuela';
    
    // Crear pares de cartas
    const symbols = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'];
    let cards = [];
    
    // Duplicar para hacer pares
    symbols.forEach((symbol, index) => {
        cards.push({ id: index * 2, symbol, matched: false, flipped: false });
        cards.push({ id: index * 2 + 1, symbol, matched: false, flipped: false });
    });
    
    // Mezclar
    cards = cards.sort(() => Math.random() - 0.5);
    
    userData.gameState[building].cards = cards;
    userData.gameState[building].flipped = [];
    userData.gameState[building].matched = [];
    userData.gameState[building].active = true;
    
    if (!userData.gameStats[building]) {
        userData.gameStats[building] = { matches: 0, attempts: 0, wins: 0, total: 0 };
    }
    
    renderizarMemoria(building);
}

function renderizarMemoria(building) {
    const grid = document.getElementById('memory-game');
    if (!grid) return;
    
    const cards = userData.gameState[building].cards;
    let html = '';
    
    cards.forEach((card, index) => {
        let content = '?';
        let bgColor = '#f97316';
        
        if (card.matched) {
            content = card.symbol;
            bgColor = '#4ade80';
        } else if (userData.gameState[building].flipped.includes(index)) {
            content = card.symbol;
            bgColor = '#facc15';
        }
        
        html += `<div class="memory-card ${card.matched ? 'matched' : ''}" 
                       onclick="flipCard(${index})"
                       style="background: ${bgColor}">
                    ${content}
                </div>`;
    });
    
    grid.innerHTML = html;
}

function flipCard(index) {
    const building = 'escuela';
    const gameState = userData.gameState[building];
    
    if (!gameState.active) {
        alert("❌ Inicia un nuevo juego primero");
        return;
    }
    
    const card = gameState.cards[index];
    
    // Verificar si ya está volteada o emparejada
    if (card.matched || gameState.flipped.includes(index)) return;
    
    // Limitar a 2 cartas volteadas
    if (gameState.flipped.length >= 2) return;
    
    // Voltear carta
    gameState.flipped.push(index);
    renderizarMemoria(building);
    
    // Verificar par
    if (gameState.flipped.length === 2) {
        setTimeout(() => checkMatch(building), 500);
    }
}

function checkMatch(building) {
    const gameState = userData.gameState[building];
    const [idx1, idx2] = gameState.flipped;
    const card1 = gameState.cards[idx1];
    const card2 = gameState.cards[idx2];
    
    userData.gameStats[building].attempts = (userData.gameStats[building].attempts || 0) + 1;
    
    if (card1.symbol === card2.symbol) {
        // Coincidencia
        card1.matched = true;
        card2.matched = true;
        userData.gameStats[building].matches = (userData.gameStats[building].matches || 0) + 1;
        
        // Verificar si completó el juego
        const allMatched = gameState.cards.every(c => c.matched);
        if (allMatched) {
            completeMemoryGame(building, true);
        }
    }
    
    gameState.flipped = [];
    renderizarMemoria(building);
    
    document.getElementById('escuela-matches').textContent = userData.gameStats[building].matches || 0;
    document.getElementById('escuela-attempts').textContent = userData.gameStats[building].attempts || 0;
}

function completeMemoryGame(building, won) {
    const apuesta = userData.gameState[building].bet;
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugarMinijuego(building)) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    registrarJugadaMinijuego(building);
    
    const multiplicadorBase = userData.gameState[building].multiplier;
    const multiplicadorPremium = esPremium() ? 2 : 1;
    const multiplicadorTotal = multiplicadorBase * multiplicadorPremium;
    
    let ganancia = 0;
    let mensaje = '';
    
    if (won) {
        // Puntuación basada en intentos (menos intentos = más ganancia)
        const intentos = userData.gameStats[building].attempts || 12;
        const bonus = Math.max(1, 12 - intentos) * 10;
        ganancia = apuesta * 2 + bonus * multiplicadorTotal;
        userData.diamonds += ganancia;
        mensaje = `🎉 ¡MEMORIA COMPLETA! +${ganancia} 💎 (x${multiplicadorTotal})`;
        
        userData.gameStats[building].wins = (userData.gameStats[building].wins || 0) + 1;
    } else {
        mensaje = `😞 Juego abandonado -${apuesta} 💎`;
    }
    
    userData.gameStats[building].total = (userData.gameStats[building].total || 0) + 1;
    
    document.getElementById('escuela-result').innerHTML = 
        won ? `<span class="win-message">${mensaje}</span>` : `<span class="lose-message">${mensaje}</span>`;
    
    userData.gameState[building].active = false;
    actualizarUI();
    saveUserData();
}

function startEscuelaGame() {
    iniciarEscuelaJuego();
    document.getElementById('escuela-result').innerHTML = 'Encuentra los pares';
}

// ==========================================
// MINIJUEGO 4: HOSPITAL - DIAGNÓSTICO RÁPIDO
// ==========================================
function cargarPreguntaHospital() {
    const building = 'hospital';
    const stats = userData.gameStats[building] || { level: 1 };
    const level = stats.level || 1;
    
    // Seleccionar pregunta según nivel (más difícil en niveles altos)
    const questionIndex = (level - 1) % HOSPITAL_QUESTIONS.length;
    const question = HOSPITAL_QUESTIONS[questionIndex];
    
    userData.gameState[building].currentQuestion = question;
    
    document.getElementById('diagnosis-question').textContent = question.question;
    
    const optionsDiv = document.getElementById('diagnosis-options');
    let html = '';
    
    question.options.forEach((option, idx) => {
        html += `<button class="option-btn" onclick="answerHospitalQuestion(${idx})">${option}</button>`;
    });
    
    optionsDiv.innerHTML = html;
}

function answerHospitalQuestion(selectedIdx) {
    const building = 'hospital';
    const apuesta = userData.gameState[building].bet;
    const question = userData.gameState[building].currentQuestion;
    
    if (!question) {
        cargarPreguntaHospital();
        return;
    }
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugarMinijuego(building)) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    registrarJugadaMinijuego(building);
    
    const isCorrect = selectedIdx === question.correct;
    const multiplicadorBase = userData.gameState[building].multiplier;
    const multiplicadorPremium = esPremium() ? 2 : 1;
    const multiplicadorTotal = multiplicadorBase * multiplicadorPremium;
    
    let ganancia = 0;
    let mensaje = '';
    
    if (isCorrect) {
        const level = userData.gameStats[building]?.level || 1;
        ganancia = apuesta * 2 * level * multiplicadorTotal;
        userData.diamonds += ganancia;
        mensaje = `🎉 ¡CORRECTO! +${ganancia} 💎 (x${multiplicadorTotal})`;
        
        // Subir de nivel
        if (!userData.gameStats[building]) userData.gameStats[building] = { streak: 0, level: 1, wins: 0, total: 0 };
        userData.gameStats[building].streak = (userData.gameStats[building].streak || 0) + 1;
        userData.gameStats[building].wins = (userData.gameStats[building].wins || 0) + 1;
        
        // Cada 3 aciertos sube de nivel
        if (userData.gameStats[building].streak % 3 === 0) {
            userData.gameStats[building].level = (userData.gameStats[building].level || 1) + 1;
            document.getElementById('hospital-level-game').textContent = userData.gameStats[building].level;
        }
    } else {
        mensaje = `😞 Incorrecto -${apuesta} 💎`;
        userData.gameStats[building].streak = 0;
    }
    
    userData.gameStats[building].total = (userData.gameStats[building].total || 0) + 1;
    
    document.getElementById('hospital-result').innerHTML = 
        isCorrect ? `<span class="win-message">${mensaje}</span>` : `<span class="lose-message">${mensaje}</span>`;
    
    document.getElementById('hospital-streak').textContent = userData.gameStats[building].streak || 0;
    
    actualizarUI();
    saveUserData();
}

function nextHospitalQuestion() {
    cargarPreguntaHospital();
    document.getElementById('hospital-result').innerHTML = 'Selecciona una respuesta';
}

// ==========================================
// SISTEMA DE ANUNCIOS PARA MINIJUEGOS
// ==========================================
async function multiplyWin(building, multiplier) {
    try {
        if (esPremium()) {
            // Premium: anuncios gratis
            aplicarMultiplicador(building, multiplier);
            return;
        }
        
        if (!adsReady || !AdController) {
            alert("❌ Sistema de anuncios no disponible");
            return;
        }
        
        const result = await AdController.show();
        if (result.done) {
            aplicarMultiplicador(building, multiplier);
        }
    } catch (error) {
        console.error("❌ Error en anuncio:", error);
    }
}

function aplicarMultiplicador(building, multiplier) {
    // Este método debería ser llamado después de una victoria
    // Por ahora, solo guardamos la intención
    alert(`✅ Anuncio visto. Tu próxima victoria en ${building} será multiplicada x${multiplier}`);
    // Aquí se puede implementar la lógica para guardar el multiplicador pendiente
}

async function reviveGame(building) {
    try {
        if (esPremium()) {
            // Premium: revive gratis
            reactivarJuego(building);
            return;
        }
        
        if (!adsReady || !AdController) {
            alert("❌ Sistema de anuncios no disponible");
            return;
        }
        
        const result = await AdController.show();
        if (result.done) {
            reactivarJuego(building);
        }
    } catch (error) {
        console.error("❌ Error en anuncio:", error);
    }
}

function reactivarJuego(building) {
    userData.gameState[building].active = true;
    alert(`✅ Reviviste en ${building}. ¡Sigue jugando!`);
}

function resetGame(building) {
    if (building === 'piscina') {
        userData.gameStats[building] = { streak: 0, total: 0, wins: 0 };
        document.getElementById('piscina-streak').textContent = '0';
        document.getElementById('piscina-accuracy').textContent = '0%';
        document.getElementById('piscina-result').innerHTML = 'Estadísticas reiniciadas';
    }
}

// ==========================================
// FUNCIÓN DE RESCATE EN CASINO
// ==========================================
async function rescueWithAd() {
    try {
        if (esPremium()) {
            alert("⭐ Los usuarios premium no necesitan rescate");
            return;
        }
        
        if (userData.diamonds > 0) {
            alert("❌ Solo disponible cuando tienes 0 diamantes");
            return;
        }
        
        if (userData.last_casino_rescue) {
            const ultimo = new Date(userData.last_casino_rescue);
            const hoy = new Date();
            ultimo.setHours(0, 0, 0, 0);
            hoy.setHours(0, 0, 0, 0);
            
            if (hoy <= ultimo) {
                alert("❌ Ya usaste tu rescate hoy. Vuelve mañana.");
                return;
            }
        }
        
        if (!adsReady || !AdController) {
            alert("❌ Sistema de anuncios no disponible");
            return;
        }
        
        const result = await AdController.show();
        
        if (result.done) {
            userData.diamonds += 100;
            userData.last_casino_rescue = new Date().toISOString();
            await saveUserData();
            
            actualizarUI();
            document.getElementById("casino-rescue").style.display = "none";
            alert("✅ ¡Ganaste 100 diamantes de rescate!");
        }
        
    } catch (error) {
        console.error("❌ Error en rescate:", error);
    }
}

// ==========================================
// FUNCIÓN PARA OBTENER POOL REAL
// ==========================================
async function updateRealPoolBalance() {
    try {
        const response = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        const balanceTon = (data.balance || 0) / 1000000000;
        
        globalPoolData.pool_ton = balanceTon;
        globalPoolData.last_updated = new Date().toISOString();
        
        await _supabase
            .from('game_data')
            .update({ pool_ton: balanceTon })
            .eq('telegram_id', 'MASTER');
        
        return balanceTon;
        
    } catch (error) {
        console.error("❌ Error:", error);
        const { data } = await _supabase
            .from('game_data')
            .select('pool_ton')
            .eq('telegram_id', 'MASTER')
            .single();
        
        globalPoolData.pool_ton = data?.pool_ton || 100;
        return globalPoolData.pool_ton;
    }
}

// ==========================================
// FUNCIÓN PARA OBTENER TOTAL DE DIAMANTES
// ==========================================
async function updateTotalDiamonds() {
    try {
        const { data, error } = await _supabase
            .from("game_data")
            .select("telegram_id, diamonds")
            .neq("telegram_id", "MASTER");
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            const total = data.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
            globalPoolData.total_diamonds = total;
            
            globalPoolData.user_rankings = data
                .map(user => ({ id: user.telegram_id, diamonds: Number(user.diamonds) || 0 }))
                .sort((a, b) => b.diamonds - a.diamonds);
            
            await _supabase
                .from('game_data')
                .update({ total_diamonds: total })
                .eq('telegram_id', 'MASTER');
            
            return total;
        }
        return 0;
        
    } catch (error) {
        console.error("❌ Error:", error);
        return globalPoolData.total_diamonds || 0;
    }
}

// ==========================================
// FUNCIÓN PARA ACTUALIZAR RANGO
// ==========================================
async function updateUserRank() {
    try {
        if (!userData.id) return;
        
        if (globalPoolData.user_rankings.length === 0) {
            await updateTotalDiamonds();
        }
        
        const posicion = globalPoolData.user_rankings.findIndex(u => u.id === userData.id);
        
        if (posicion === -1) {
            userData.rank = "Ciudadano";
            userData.weekly_rank = globalPoolData.user_rankings.length + 1;
        } else {
            userData.weekly_rank = posicion + 1;
            
            if (posicion < 3) userData.rank = "Diamante";
            else if (posicion < 10) userData.rank = "Oro";
            else if (posicion < 50) userData.rank = "Plata";
            else userData.rank = "Ciudadano";
        }
        
        await calculateProjectedReward();
        
        const rankElem = document.getElementById("user-rank");
        const rankDescElem = document.getElementById("rank-description");
        const projElem = document.getElementById("projected-reward");
        
        if (rankElem) {
            rankElem.innerHTML = `<span class="${userData.rank.toLowerCase()}-text">${userData.rank}</span> (#${userData.weekly_rank})`;
        }
        
        if (rankDescElem) {
            let desc = "";
            switch(userData.rank) {
                case "Diamante": desc = "💎 Top 1-3: 40% del pool"; break;
                case "Oro": desc = "🥇 Top 4-10: 25% del pool"; break;
                case "Plata": desc = "🥈 Top 11-50: 20% del pool"; break;
                default: desc = "👥 Resto: 15% del pool (proporcional)";
            }
            rankDescElem.textContent = desc;
        }
        
        if (projElem) projElem.textContent = userData.projectedReward.toFixed(4);
        
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// ==========================================
// CALCULAR PROYECCIÓN DE RECOMPENSA
// ==========================================
async function calculateProjectedReward() {
    try {
        const poolUsuarios = globalPoolData.pool_ton * 0.8;
        
        if (poolUsuarios <= 0 || globalPoolData.user_rankings.length === 0) {
            userData.projectedReward = 0;
            return;
        }
        
        const miPosicion = userData.weekly_rank - 1;
        
        if (miPosicion < 0) {
            userData.projectedReward = 0;
            return;
        }
        
        let recompensa = 0;
        
        if (miPosicion < 3) {
            recompensa = (poolUsuarios * 0.4) / 3;
        } else if (miPosicion < 10) {
            recompensa = (poolUsuarios * 0.25) / 7;
        } else if (miPosicion < 50) {
            recompensa = (poolUsuarios * 0.20) / 40;
        } else {
            const ciudadanos = globalPoolData.user_rankings.slice(50);
            const totalDiamantesCiudadanos = ciudadanos.reduce((sum, u) => sum + u.diamonds, 0);
            
            if (totalDiamantesCiudadanos > 0) {
                recompensa = (poolUsuarios * 0.15) * (userData.diamonds / totalDiamantesCiudadanos);
            }
        }
        
        userData.projectedReward = recompensa;
        
    } catch (error) {
        console.error("❌ Error:", error);
        userData.projectedReward = 0;
    }
}

// ==========================================
// FUNCIÓN PARA COMPRAR PLAN PREMIUM
// ==========================================
async function comprarPremium(plan) {
    try {
        if (!tonConnectUI || !tonConnectUI.connected) {
            alert("❌ Conecta tu wallet primero");
            return;
        }
        
        const confirmMsg = `¿Comprar plan ${plan.name} por ${plan.price} TON?`;
        
        if (!confirm(confirmMsg)) return;
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                { address: BILLETERA_PROPIETARIO, amount: Math.floor(plan.price * 1e9).toString() }
            ]
        };
        
        await tonConnectUI.sendTransaction(tx);
        
        const ahora = new Date();
        const expiracion = new Date(ahora);
        expiracion.setDate(expiracion.getDate() + plan.days);
        
        userData.premium_expires = expiracion.toISOString();
        await saveUserData();
        
        actualizarPremiumUI();
        renderPremiumPlans();
        
        alert(`✅ ¡Plan ${plan.name} activado!`);
        
    } catch (e) {
        console.error("❌ Error:", e);
        alert("❌ Error en la transacción");
    }
}

// ==========================================
// SISTEMA DE PRODUCCIÓN
// ==========================================
function getTotalProductionPerHour() {
    let base = (userData.lvl_piscina * 60) +
               (userData.lvl_fabrica * 120) +
               (userData.lvl_escuela * 40) +
               (userData.lvl_hospital * 80);
    
    if (esPremium()) base *= 2;
    return base;
}

async function calculateOfflineProduction() {
    if (!userData.last_production_update) return 0;
    
    const now = new Date();
    const lastUpdate = new Date(userData.last_production_update);
    const secondsPassed = Math.floor((now - lastUpdate) / 1000);
    
    if (secondsPassed < 1) return 0;
    
    const earnedDiamonds = (getTotalProductionPerHour() / 3600) * secondsPassed;
    return earnedDiamonds;
}

// ==========================================
// ADSGRAM - SISTEMA DE ANUNCIOS
// ==========================================
function loadAdsgramSafe() {
    return new Promise((resolve, reject) => {
        if (window.Adsgram) return resolve();
        
        const script = document.createElement("script");
        script.src = "https://sad.adsgram.ai/js/sad.min.js";
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initAds() {
    try {
        await loadAdsgramSafe();
        AdController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        adsReady = true;
        console.log("✅ Adsgram listo");
    } catch (err) {
        adsReady = false;
    }
}

setTimeout(initAds, 4500);
setTimeout(() => {
    if (!window.Adsgram) adsReady = false;
}, 8000);

function showAd() {
    if (!adsReady || !AdController) {
        alert("❌ Sistema de anuncios no disponible");
        return;
    }
    
    AdController.show()
        .then((result) => {
            if (result.done) giveAdReward();
            else alert("⚠️ No completaste el anuncio");
        })
        .catch((result) => {
            if (result.description === 'No ads') alert("😔 No hay anuncios disponibles");
            else alert("❌ Error al cargar el anuncio");
        });
}

function showAdsModal() {
    if (!adsReady) {
        alert("⏳ Cargando...");
        return;
    }
    showModal("modalAds");
    actualizarEstadoAnuncio();
}

function giveAdReward() {
    const reward = esPremium() ? 60 : 30;
    userData.diamonds += reward;
    userData.last_ad_watch = new Date().toISOString();
    saveUserData();
    actualizarUI();
    actualizarEstadoAnuncio();
    actualizarBannerAds();
    tg.showAlert(`🎁 +${reward} 💎`);
}

// ==========================================
// FUNCIONES DE UI PARA ANUNCIOS
// ==========================================
function puedeVerAnuncio() {
    if (esPremium()) return false;
    if (!userData.last_ad_watch) return true;
    
    const horasPasadas = (new Date() - new Date(userData.last_ad_watch)) / (1000 * 60 * 60);
    return horasPasadas >= 1;
}

function tiempoRestanteAnuncio() {
    if (!userData.last_ad_watch) return 0;
    const horasPasadas = (new Date() - new Date(userData.last_ad_watch)) / (1000 * 60 * 60);
    if (horasPasadas >= 1) return 0;
    return Math.ceil((1 - horasPasadas) * 60);
}

function actualizarTimerParque() {
    const timerElem = document.getElementById("park-timer");
    if (!timerElem) return;
    
    if (esPremium()) {
        timerElem.textContent = "⭐ PREMIUM";
        timerElem.style.color = "#8b5cf6";
        return;
    }
    
    if (!puedeVerAnuncio()) {
        timerElem.textContent = `⏳ ${tiempoRestanteAnuncio()} min`;
        timerElem.style.color = "#f59e0b";
    } else {
        timerElem.textContent = "✅ DISPONIBLE";
        timerElem.style.color = "#4ade80";
    }
}

function actualizarEstadoAnuncio() {
    const statusElem = document.getElementById("ads-status");
    const timerElem = document.getElementById("ads-timer-display");
    const btnElem = document.getElementById("watch-ad-btn");
    
    if (!statusElem || !timerElem || !btnElem) return;
    
    if (esPremium()) {
        statusElem.innerHTML = '<span style="color: #8b5cf6;">⭐ Usuario premium - Sin anuncios</span>';
        timerElem.innerHTML = '';
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
        return;
    }
    
    if (puedeVerAnuncio() && adsReady) {
        statusElem.innerHTML = '<span style="color: #4ade80;">✅ ¡Anuncio disponible! Gana 30 💎</span>';
        timerElem.innerHTML = '';
        btnElem.disabled = false;
        btnElem.style.background = "#f97316";
        btnElem.onclick = showAd;
    } else if (!adsReady) {
        statusElem.innerHTML = '<span style="color: #f97316;">⏳ Cargando...</span>';
        timerElem.innerHTML = '';
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
    } else {
        statusElem.innerHTML = '<span style="color: #f97316;">⏳ Anuncio no disponible</span>';
        timerElem.innerHTML = `Próximo en: <span style="color: #f59e0b;">${tiempoRestanteAnuncio()} min</span>`;
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
    }
}

function actualizarBannerAds() {
    const banner = document.getElementById("ads-banner");
    if (!banner) return;
    if (esPremium()) {
        banner.style.display = "none";
        return;
    }
    banner.style.display = (puedeVerAnuncio() && adsReady && !enVentanaRetiro()) ? "block" : "none";
}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= 30) return 300;
    let base = Math.min(10 + (day - 1) * 10, 300);
    if (esPremium()) base *= 2;
    return base;
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    const ultimo = new Date(userData.last_daily_claim);
    const hoy = new Date();
    ultimo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    return hoy > ultimo;
}

function rachaActiva() {
    if (!userData.last_daily_claim || userData.daily_streak === 0) return false;
    const ultimo = new Date(userData.last_daily_claim);
    const hoy = new Date();
    ultimo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    const diffDays = (hoy - ultimo) / (1000 * 60 * 60 * 24);
    return diffDays <= 1;
}

function openDailyReward() {
    actualizarDailyUI();
    showModal("modalDailyReward");
}

function actualizarDailyUI() {
    const puede = puedeReclamarDiaria();
    const racha = userData.daily_streak || 0;
    const diaActual = racha + 1;
    const recompensaHoy = getDailyRewardAmount(diaActual);
    
    const currentDayElem = document.getElementById("current-day");
    const todayRewardElem = document.getElementById("today-reward");
    const progressText = document.getElementById("progress-text");
    const statusElem = document.getElementById("daily-status");
    const btnElem = document.getElementById("claim-daily-btn");
    
    if (currentDayElem) currentDayElem.textContent = diaActual > 30 ? 30 : diaActual;
    if (todayRewardElem) todayRewardElem.textContent = `${recompensaHoy} 💎`;
    if (progressText) progressText.textContent = `${Math.min(racha, 30)}/30`;
    
    if (esPremium() && statusElem) {
        statusElem.innerHTML = '⭐ <span style="color: #8b5cf6;">Premium - Recompensa x2</span>';
    }
    
    if (!puede) {
        const proxima = new Date();
        proxima.setDate(proxima.getDate() + 1);
        proxima.setHours(0, 0, 0, 0);
        const horas = Math.ceil((proxima - new Date()) / (1000 * 60 * 60));
        
        if (statusElem) statusElem.innerHTML = `⏳ Próxima en <span style="color: #f59e0b;">${horas} horas</span>`;
        if (btnElem) {
            btnElem.disabled = true;
            btnElem.style.background = "#475569";
        }
    } else {
        if (statusElem) {
            if (!rachaActiva() && racha > 0) {
                statusElem.innerHTML = '⚠️ Perdiste tu racha. ¡Empieza de nuevo!';
            } else {
                statusElem.innerHTML = `✅ ¡Recompensa disponible! Día ${diaActual}`;
            }
        }
        if (btnElem) {
            btnElem.disabled = false;
            btnElem.style.background = "#f59e0b";
        }
    }
    
    const calendarElem = document.getElementById("daily-calendar");
    if (calendarElem) {
        let html = '';
        for (let i = 1; i <= 30; i++) {
            const reward = getDailyRewardAmount(i);
            let clase = 'daily-day';
            if (i <= racha) clase += ' completed';
            else if (i === racha + 1 && puede) clase += ' current';
            else clase += ' locked';
            
            html += `<div class="${clase}"><div>Día ${i}</div><div class="daily-reward">${reward}💎</div></div>`;
        }
        calendarElem.innerHTML = html;
    }
}

async function claimDailyReward() {
    try {
        if (!userData.id) {
            alert("❌ Error: Usuario no identificado");
            return;
        }
        
        if (!puedeReclamarDiaria()) {
            alert("❌ Ya reclamaste hoy. Vuelve mañana.");
            return;
        }
        
        let nuevoDia = 1;
        if (userData.last_daily_claim && userData.daily_streak > 0) {
            const ultimo = new Date(userData.last_daily_claim);
            const ahora = new Date();
            const diffHoras = (ahora - ultimo) / (1000 * 60 * 60);
            if (diffHoras < 48) nuevoDia = userData.daily_streak + 1;
        }
        
        if (nuevoDia > 30) nuevoDia = 30;
        
        const recompensa = getDailyRewardAmount(nuevoDia);
        
        if (!confirm(`¿Reclamar Día ${nuevoDia} por ${recompensa} 💎?`)) return;
        
        userData.diamonds += recompensa;
        userData.daily_streak = nuevoDia;
        userData.last_daily_claim = new Date().toISOString();
        
        actualizarUI();
        actualizarDailyUI();
        
        await saveUserData();
        console.log("✅ Recompensa diaria guardada:", userData.last_daily_claim);
        alert(`✅ ¡+${recompensa} diamantes! Día ${nuevoDia}/30`);
        
    } catch (error) {
        console.error("❌ Error:", error);
        alert("❌ Error al reclamar");
    }
}

function actualizarBannerDiario() {
    const banner = document.getElementById("daily-banner");
    if (!banner) return;
    
    if (esPremium()) {
        banner.style.display = "none";
        return;
    }
    
    if (puedeReclamarDiaria()) {
        banner.style.display = "block";
        banner.innerHTML = '<i class="fa-solid fa-calendar-day"></i> ¡RECOMPENSA DIARIA DISPONIBLE!';
    } else {
        banner.style.display = "block";
        banner.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Día ${userData.daily_streak || 0}/30 - Vuelve mañana`;
    }
}

// ==========================================
// SISTEMA DE CONTROL DE RETIROS
// ==========================================
function enVentanaRetiro() {
    return new Date().getDay() === 0;
}

function getNumeroSemana() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), 0, 1);
    const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil(dias / 7);
}

function calcularTasaRetiro() {
    if (!globalPoolData || globalPoolData.pool_ton <= 0 || globalPoolData.total_diamonds <= 0) return 0.001;
    return (globalPoolData.pool_ton * K * R) / globalPoolData.total_diamonds;
}

// ==========================================
// FUNCIÓN: INTERCAMBIAR DIAMANTES POR TON
// ==========================================
async function exchangeDiamonds() {
    try {
        if (!tonConnectUI || !tonConnectUI.connected) {
            alert("❌ Conecta tu wallet primero");
            return;
        }
        
        if (!enVentanaRetiro()) {
            alert("❌ El intercambio solo está disponible los DOMINGOS");
            return;
        }
        
        const semanaActual = getNumeroSemana();
        
        if (userData.last_withdraw_week === semanaActual) {
            alert("❌ Ya intercambiaste tus diamantes esta semana");
            return;
        }
        
        if (userData.diamonds <= 0) {
            alert("❌ No tienes diamantes para intercambiar");
            return;
        }
        
        await updateUserRank();
        const tonARecibir = userData.projectedReward;
        
        if (tonARecibir <= 0) {
            alert("❌ No hay TON en el pool para distribuir");
            return;
        }
        
        const confirmMsg = `¿Intercambiar ${Math.floor(userData.diamonds).toLocaleString()} 💎 por ${tonARecibir.toFixed(4)} TON?\n\n` +
                          `Rango: ${userData.rank}\n` +
                          `Posición: #${userData.weekly_rank}\n\n` +
                          `⚠️ Los diamantes no intercambiados se quemarán al final del domingo`;
        
        if (!confirm(confirmMsg)) return;
        
        userData.accumulated_ton = (userData.accumulated_ton || 0) + tonARecibir;
        userData.last_withdraw_week = semanaActual;
        userData.diamonds = 0;
        
        await saveUserData();
        
        alert(`✅ ¡Intercambio exitoso! Tienes ${userData.accumulated_ton.toFixed(4)} TON acumulados para retirar`);
        closeAll();
        
    } catch (error) {
        console.error("❌ Error en exchangeDiamonds:", error);
        alert("❌ Error al intercambiar diamantes");
    }
}

// ==========================================
// FUNCIÓN: RETIRAR TON A WALLET
// ==========================================
async function withdrawTON() {
    try {
        if (!tonConnectUI || !tonConnectUI.connected) {
            alert("❌ Conecta tu wallet primero");
            return;
        }
        
        if (!userData.accumulated_ton || userData.accumulated_ton < 1) {
            alert("❌ Necesitas al menos 1 TON para retirar");
            return;
        }
        
        const montoRetiro = userData.accumulated_ton;
        
        const confirmMsg = `¿Retirar ${montoRetiro.toFixed(4)} TON a tu wallet?\n\n` +
                          `Dirección: ${currentWallet?.account?.address?.slice(0, 6)}...${currentWallet?.account?.address?.slice(-4)}`;
        
        if (!confirm(confirmMsg)) return;
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                { 
                    address: currentWallet.account.address, 
                    amount: Math.floor(montoRetiro * 1e9).toString(),
                    payload: "Retiro Ton City" 
                }
            ]
        };
        
        await tonConnectUI.sendTransaction(tx);
        
        userData.accumulated_ton = 0;
        await saveUserData();
        
        alert(`✅ ¡Retiro exitoso! ${montoRetiro.toFixed(4)} TON enviados a tu wallet`);
        closeAll();
        
    } catch (error) {
        console.error("❌ Error en withdrawTON:", error);
        alert("❌ Error al retirar TON");
    }
}

// ==========================================
// FUNCIÓN DE RETIRO
// ==========================================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        await updateRealPoolBalance();
        await updateTotalDiamonds();
        await updateUserRank();
        
        const poolUsuarios = globalPoolData.pool_ton * 0.8;
        
        document.getElementById("week-indicator").textContent = `Semana #${getNumeroSemana()}`;
        document.getElementById("pool-total").textContent = `${globalPoolData.pool_ton.toFixed(4)} TON`;
        document.getElementById("pool-users").textContent = `${poolUsuarios.toFixed(4)} TON`;
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds).toLocaleString();
        document.getElementById("withdraw-rank").textContent = `${userData.rank} (#${userData.weekly_rank})`;
        document.getElementById("withdraw-projection").textContent = `${userData.projectedReward.toFixed(4)} TON`;
        document.getElementById("accumulated-ton").textContent = `${(userData.accumulated_ton || 0).toFixed(4)} TON`;
        
        const statusElem = document.getElementById("withdraw-status");
        const exchangeBtn = document.getElementById("exchange-btn");
        const withdrawBtn = document.getElementById("withdraw-ton-btn");
        
        if (!enVentanaRetiro()) {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #f97316;"></i> ⏳ Espera al DOMINGO para intercambiar';
            exchangeBtn.disabled = true;
        } else {
            const semanaActual = getNumeroSemana();
            if (userData.last_withdraw_week === semanaActual) {
                statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i> ✅ Ya intercambiaste esta semana';
                exchangeBtn.disabled = true;
            } else {
                statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i> ✅ Intercambio disponible (solo hoy)';
                exchangeBtn.disabled = false;
            }
        }
        
        withdrawBtn.disabled = !userData.accumulated_ton || userData.accumulated_ton < 1;
        
        const withdrawInfo = document.getElementById("withdraw-info");
        if (userData.accumulated_ton > 0) {
            withdrawInfo.innerHTML = `<i class="fa-solid fa-fire"></i> <strong>Tienes ${userData.accumulated_ton.toFixed(4)} TON acumulados para retirar</strong>`;
        } else {
            withdrawInfo.innerHTML = '<i class="fa-solid fa-fire"></i> <strong>Los diamantes no intercambiados se queman al final del domingo</strong>';
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
        document.getElementById("withdraw-status").innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i> Error al cargar';
    }
}

// ==========================================
// RENDERIZAR TIENDA PREMIUM
// ==========================================
function renderPremiumPlans() {
    const container = document.getElementById("premium-plans");
    if (!container) return;
    
    const isWalletConnected = tonConnectUI && tonConnectUI.connected;
    let html = '';
    
    if (esPremium()) {
        html = `<div class="premium-timer">
                    <i class="fa-solid fa-crown" style="color: #8b5cf6;"></i> 
                    Premium activo: ${getPremiumTimeLeft()}
                </div>`;
    }
    
    PREMIUM_PLANS.forEach(plan => {
        html += `
        <div class="premium-item">
            <div class="premium-item-header">
                <div>
                    <strong>${plan.name}</strong>
                    <span class="premium-badge">${plan.days} días</span>
                </div>
                <div class="premium-item-price">${plan.price} TON</div>
            </div>
            <p style="margin: 5px 0; color: #94a3b8;">${plan.description}</p>
            <button onclick="comprarPremium(${JSON.stringify(plan).replace(/"/g, '&quot;')})" 
                    style="background: ${isWalletConnected ? '#8b5cf6' : '#475569'}; 
                           color: white; border: none; padding: 10px; border-radius: 8px; width: 100%;"
                    ${!isWalletConnected ? 'disabled' : ''}>
                ${isWalletConnected ? 'COMPRAR' : 'CONECTA WALLET'}
            </button>
        </div>`;
    });
    
    container.innerHTML = html;
}

// ==========================================
// RENDERIZAR BANCO
// ==========================================
function renderBank() {
    const bankContainer = document.getElementById("bankList");
    if (!bankContainer) return;

    const isConnected = !!currentWallet;
    const packs = [
        { ton: 0.10, diamonds: 100 },
        { ton: 0.50, diamonds: 500 },
        { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 },
        { ton: 5.00, diamonds: 5000 },
        { ton: 10.00, diamonds: 10000 }
    ];

    let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                  <span><b>💰 Precio de compra</b></span>
                  <span><b>${PRECIO_COMPRA.toFixed(3)} TON/💎</b></span>
                </div>`;

    packs.forEach(p => {
        const buttonText = isConnected ? 'COMPRAR' : 'CONECTAR';
        const buttonStyle = isConnected ?
            'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;' :
            'background: #475569; color: #94a3b8; border: none; padding: 10px 16px; border-radius: 8px; cursor: not-allowed;';
        
        html += `
        <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'}; padding: 12px;">
            <div style="display: flex; flex-direction: column;">
                <strong style="font-size: 1.1rem;">${p.ton.toFixed(2)} TON</strong>
                <span style="color: #94a3b8; font-size: 0.9rem;">Recibes ${p.diamonds} 💎</span>
            </div>
            <button onclick="comprarTON(${p.ton})"
                    style="${buttonStyle} min-width: 100px;"
                    ${!isConnected ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>`;
    });

    bankContainer.innerHTML = html;
}

// ==========================================
// COMPRAR TON
// ==========================================
async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) {
        return alert("❌ Conecta tu wallet primero");
    }

    let comprados = Math.floor(tonAmount / PRECIO_COMPRA);
    if (comprados < 100) comprados = 100;

    if (!confirm(`¿Comprar ${tonAmount.toFixed(2)} TON por ${comprados} 💎?`)) return;

    const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            { address: BILLETERA_POOL, amount: Math.floor(tonAmount * 0.8 * 1e9).toString() },
            { address: BILLETERA_PROPIETARIO, amount: Math.floor(tonAmount * 0.2 * 1e9).toString() }
        ]
    };

    try {
        await tonConnectUI.sendTransaction(tx);
        userData.diamonds += comprados;
        
        if (!userData.haInvertido && comprados >= 100) {
            userData.haInvertido = true;
        }
        
        await saveUserData();
        actualizarUI();
        alert(`✅ Compra exitosa! +${comprados} 💎`);
    } catch (e) {
        alert("❌ Error en la transacción");
    }
}

// ==========================================
// PRODUCCIÓN
// ==========================================
function startProduction() {
    setInterval(() => {
        if (!userData.id) return;
        if (enVentanaRetiro()) return;
        
        userData.diamonds += getTotalProductionPerHour() / 3600;
        actualizarUI();
        
        if (document.getElementById("centralModal")?.style.display === "block") {
            updateCentralStats();
        }
    }, 1000);
}

function updateCentralStats() {
    const prod = {
        piscina: (userData.lvl_piscina || 0) * 60,
        fabrica: (userData.lvl_fabrica || 0) * 120,
        escuela: (userData.lvl_escuela || 0) * 40,
        hospital: (userData.lvl_hospital || 0) * 80
    };
    const total = prod.piscina + prod.fabrica + prod.escuela + prod.hospital;

    const ids = {
        "s_piscina": prod.piscina,
        "s_fabrica": prod.fabrica,
        "s_escuela": prod.escuela,
        "s_hospital": prod.hospital,
        "s_total": total
    };

    Object.entries(ids).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = Math.floor(value).toLocaleString();
    });
}

function openCentral() {
    updateUserRank();
    updateCentralStats();
    showModal("centralModal");
}

// ==========================================
// INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================
async function initApp() {
    try {
        tg.expand();
        tg.ready();

        const user = tg.initDataUnsafe.user;
        if (user) {
            userData.id = user.id.toString();
            
            if (user.first_name && user.last_name) {
                userData.username = `${user.first_name} ${user.last_name}`;
            } else if (user.first_name) {
                userData.username = user.first_name;
            } else if (user.username) {
                userData.username = user.username;
            } else {
                userData.username = "Usuario";
            }
            
            document.getElementById("user-display").textContent = userData.username;
            await loadUserFromDB(user.id);
        } else {
            document.getElementById("user-display").textContent = "Invitado";
        }

        await initTONConnect();
        
        await updateRealPoolBalance();
        await updateTotalDiamonds();
        await updateUserRank();
        
        renderBank();
        renderPremiumPlans();
        actualizarBannerEvento();
        actualizarMultiplicadoresEvento();
        
        startProduction();
        
        setInterval(saveUserData, 30000);
        window.addEventListener('beforeunload', () => saveUserData());
        
        actualizarTimerParque();
        actualizarBannerAds();
        actualizarBannerDiario();
        actualizarBannerDomingo();
        
        setInterval(actualizarTimerParque, 60000);
        setInterval(() => {
            actualizarBannerDiario();
            actualizarBannerAds();
            actualizarBannerDomingo();
            actualizarBannerEvento();
            actualizarMultiplicadoresEvento();
            if (esPremium()) actualizarPremiumUI();
        }, 60000);
        
        // Limpieza de diamantes no intercambiados
        setInterval(() => {
            if (enVentanaRetiro() && new Date().getHours() === 23 && new Date().getMinutes() === 59) {
                if (userData.last_withdraw_week !== getNumeroSemana()) {
                    console.log("🔥 Quemando diamantes no intercambiados...");
                    userData.diamonds = 0;
                    saveUserData();
                }
            }
        }, 60000);
        
    } catch (error) {
        console.error("❌ Error en initApp:", error);
    }
}

function actualizarBannerDomingo() {
    const sundayBanner = document.getElementById("sunday-banner");
    const centralIndicator = document.getElementById("central-sunday-indicator");
    
    if (enVentanaRetiro()) {
        if (sundayBanner) sundayBanner.style.display = "block";
        if (centralIndicator) centralIndicator.style.display = "block";
    } else {
        if (sundayBanner) sundayBanner.style.display = "none";
        if (centralIndicator) centralIndicator.style.display = "none";
    }
}

async function loadUserFromDB(tgId) {
    try {
        const { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', tgId.toString())
            .maybeSingle();

        if (error) {
            console.error("❌ Error cargando usuario:", error);
            return;
        }

        if (!data) {
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
                last_production_update: new Date().toISOString(),
                haInvertido: false,
                event_progress: {},
                accumulated_ton: 0,
                last_withdraw_week: null,
                gameStats: {
                    piscina: { streak: 0, total: 0, wins: 0 },
                    fabrica: { score: 0, total: 0, wins: 0 },
                    escuela: { matches: 0, attempts: 0, wins: 0, total: 0 },
                    hospital: { streak: 0, level: 1, wins: 0, total: 0 }
                }
            };
            
            const { error: insertError } = await _supabase
                .from('game_data')
                .insert([nuevoUsuario]);
            
            if (insertError) {
                console.error("❌ Error creando usuario:", insertError);
                return;
            }
            
            userData = { ...userData, ...nuevoUsuario, id: tgId.toString() };
            
        } else {
            userData = { 
                ...userData, 
                ...data, 
                id: tgId.toString(),
                diamonds: Number(data.diamonds) || 0,
                lvl_piscina: Number(data.lvl_piscina) || 0,
                lvl_fabrica: Number(data.lvl_fabrica) || 0,
                lvl_escuela: Number(data.lvl_escuela) || 0,
                lvl_hospital: Number(data.lvl_hospital) || 0,
                referral_earnings: Number(data.referral_earnings) || 0,
                referred_users: data.referred_users || [],
                last_production_update: data.last_production_update || data.last_online || new Date().toISOString(),
                last_withdraw_week: data.last_withdraw_week ? Number(data.last_withdraw_week) : null,
                last_ad_watch: data.last_ad_watch || null,
                last_casino_rescue: data.last_casino_rescue || null,
                premium_expires: data.premium_expires || null,
                daily_streak: Number(data.daily_streak) || 0,
                last_daily_claim: data.last_daily_claim || null,
                haInvertido: data.haInvertido || false,
                event_progress: data.event_progress || {},
                accumulated_ton: Number(data.accumulated_ton) || 0,
                gameStats: data.gameStats || {
                    piscina: { streak: 0, total: 0, wins: 0 },
                    fabrica: { score: 0, total: 0, wins: 0 },
                    escuela: { matches: 0, attempts: 0, wins: 0, total: 0 },
                    hospital: { streak: 0, level: 1, wins: 0, total: 0 }
                }
            };
            
            const offlineEarnings = await calculateOfflineProduction();
            if (offlineEarnings > 0) {
                userData.diamonds += offlineEarnings;
                await saveUserData();
            }
        }
        
        userData.last_production_update = new Date().toISOString();
        
        actualizarPremiumUI();
        actualizarUI();
        updateReferralUI();
        actualizarTimerParque();
        actualizarDailyUI();
        actualizarLimitesUI();
        
    } catch (error) {
        console.error("❌ Error CRÍTICO en loadUserFromDB:", error);
    }
}

// ==========================================
// CASINO - JUEGOS (EXISTENTES)
// ==========================================
function openCasino() {
    showModal("modalCasino");
    
    const rescueDiv = document.getElementById("casino-rescue");
    if (rescueDiv) {
        rescueDiv.style.display = (userData.diamonds <= 0 && !esPremium()) ? "block" : "none";
    }
}

function abrirJuego(juego) {
    closeAll();
    switch(juego) {
        case 'highlow':
            document.getElementById('hl-number').textContent = '0000';
            document.getElementById('hl-result').textContent = 'Selecciona una opción';
            document.getElementById('hl-bet').textContent = apuestaActual.highlow;
            showModal('modalHighLow');
            break;
        case 'ruleta':
            document.getElementById('ruleta-number').textContent = '0';
            document.getElementById('ruleta-result').textContent = 'Elige una apuesta';
            document.getElementById('ruleta-bet').textContent = apuestaActual.ruleta;
            showModal('modalRuleta');
            break;
        case 'tragaperras':
            document.getElementById('slot1').textContent = '💎';
            document.getElementById('slot2').textContent = '💎';
            document.getElementById('slot3').textContent = '💎';
            document.getElementById('tragaperras-result').textContent = '¡Gira y gana!';
            document.getElementById('tragaperras-bet').textContent = apuestaActual.tragaperras;
            showModal('modalTragaperras');
            break;
        case 'dados':
            document.getElementById('dado1').textContent = '⚀';
            document.getElementById('dado2').textContent = '⚀';
            document.getElementById('dados-suma').textContent = 'Suma: 2';
            document.getElementById('dados-result').textContent = 'Elige una opción';
            document.getElementById('dados-bet').textContent = apuestaActual.dados;
            showModal('modalDados');
            break;
        case 'loteria':
            document.getElementById('loteria-number').textContent = '0000';
            document.getElementById('loteria-boletos').innerHTML = '';
            document.getElementById('loteria-result').textContent = 'Compra boletos y juega';
            document.getElementById('loteria-bet').textContent = apuestaActual.loteria;
            boletosComprados = [];
            showModal('modalLoteria');
            break;
    }
    actualizarLimitesUI();
}

function cerrarJuego() {
    closeAll();
    openCasino();
}

function cambiarApuesta(juego, delta) {
    let key = juego;
    if (juego === 'hl') key = 'highlow';
    
    if (isNaN(apuestaActual[key])) {
        apuestaActual[key] = key === 'tragaperras' ? 5 : (key === 'loteria' ? 1 : 10);
    }
    
    let nueva = apuestaActual[key] + delta;
    if (nueva < 1) nueva = 1;
    
    const maximos = {
        highlow: 1000,
        ruleta: 1000,
        tragaperras: 500,
        dados: 1000,
        loteria: 10
    };
    
    if (nueva > maximos[key]) nueva = maximos[key];
    
    apuestaActual[key] = nueva;
    
    const elemId = key === 'highlow' ? 'hl-bet' : 
                   key === 'ruleta' ? 'ruleta-bet' :
                   key === 'tragaperras' ? 'tragaperras-bet' :
                   key === 'dados' ? 'dados-bet' : 'loteria-bet';
    
    const elem = document.getElementById(elemId);
    if (elem) elem.textContent = nueva;
}

// Funciones de casino (resumidas por espacio)
function jugarHighLow(eleccion) { /* ... */ }
function jugarRuleta(tipo) { /* ... */ }
function jugarTragaperras() { /* ... */ }
function jugarDados(eleccion) { /* ... */ }
function comprarBoletos() { /* ... */ }
function jugarLoteria() { /* ... */ }

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    const codeElem = document.getElementById("referral-code");
    if (codeElem) codeElem.textContent = userData.referral_code || "CARGANDO...";
    showModal("modalFriends");
}

function copyReferralCode() {
    if (!userData.referral_code) return alert("❌ Código no disponible");
    const link = `https://t.me/ton_city_bot?start=${userData.referral_code}`;
    navigator.clipboard.writeText(link).then(() => alert("✅ Enlace copiado!"));
}

function updateReferralUI() {
    const codeElem = document.getElementById("referral-code");
    const countElem = document.getElementById("ref-count");
    const totalElem = document.getElementById("ref-total");
    
    if (codeElem) codeElem.textContent = userData.referral_code || "NO DISPONIBLE";
    if (countElem) countElem.textContent = userData.referred_users?.length || 0;
    if (totalElem) totalElem.textContent = `${userData.referral_earnings || 0} 💎`;
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
            updateWalletUI(wallet);
            if (document.getElementById("modalBank")?.style.display === "block") renderBank();
            if (document.getElementById("modalStore")?.style.display === "block") renderPremiumPlans();
        });
        
    } catch (error) {
        console.error("❌ Error en TON Connect:", error);
    }
}

function updateWalletUI(wallet) {
    const connectButton = document.getElementById('ton-connect-button');
    const walletInfo = document.getElementById('wallet-info');
    const disconnectBtn = document.getElementById('disconnect-btn');
    
    if (!walletInfo) return;
    
    if (wallet) {
        if (connectButton) connectButton.style.display = 'none';
        walletInfo.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
    } else {
        if (connectButton) connectButton.style.display = 'block';
        walletInfo.classList.add('hidden');
        if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
}

async function disconnectWallet() {
    try {
        if (tonConnectUI) {
            await tonConnectUI.disconnect();
            currentWallet = null;
            updateWalletUI(null);
            alert("✅ Wallet desconectada");
        }
    } catch (error) {
        console.error("❌ Error desconectando:", error);
    }
}

// ==========================================
// COMPRAR MEJORAS
// ==========================================
async function buyUpgrade(name, field, price) {
    try {
        if (!userData.id) {
            alert("❌ Error: Usuario no identificado");
            return;
        }
        
        if ((userData.diamonds || 0) < price) {
            alert("❌ No tienes suficientes diamantes");
            return;
        }
        
        userData[`lvl_${field}`] = (userData[`lvl_${field}`] || 0) + 1;
        userData.diamonds -= price;
        
        actualizarUI();
        await saveUserData();
        
        alert(`✅ ¡${name} nivel ${userData[`lvl_${field}`]}!`);
        
    } catch (error) {
        console.error("❌ Error en buyUpgrade:", error);
        alert("Error al comprar mejora");
    }
}

function buyUpgradeFromBuilding(building, price) {
    const nombres = {
        piscina: "Piscina",
        fabrica: "Fábrica",
        escuela: "Escuela",
        hospital: "Hospital"
    };
    buyUpgrade(nombres[building], building, price);
}

// ==========================================
// GUARDAR DATOS EN SUPABASE
// ==========================================
async function saveUserData() {
    if (!userData.id) return false;
    
    try {
        const datos = {
            diamonds: Math.floor(Number(userData.diamonds) || 0),
            lvl_piscina: parseInt(userData.lvl_piscina) || 0,
            lvl_fabrica: parseInt(userData.lvl_fabrica) || 0,
            lvl_escuela: parseInt(userData.lvl_escuela) || 0,
            lvl_hospital: parseInt(userData.lvl_hospital) || 0,
            referral_earnings: parseInt(userData.referral_earnings) || 0,
            referred_users: userData.referred_users || [],
            last_online: new Date().toISOString(),
            last_production_update: new Date().toISOString(),
            last_withdraw_week: userData.last_withdraw_week ? parseInt(userData.last_withdraw_week) : null,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue,
            premium_expires: userData.premium_expires,
            daily_streak: parseInt(userData.daily_streak) || 0,
            last_daily_claim: userData.last_daily_claim,
            haInvertido: userData.haInvertido || false,
            event_progress: userData.event_progress || {},
            accumulated_ton: Number(userData.accumulated_ton) || 0,
            gameStats: userData.gameStats || {}
        };
        
        const { error } = await _supabase
            .from('game_data')
            .update(datos)
            .eq('telegram_id', userData.id);
        
        if (error) {
            if (error.code === 'PGRST116') {
                const insertData = {
                    ...datos,
                    telegram_id: userData.id,
                    username: userData.username,
                    referral_code: userData.referral_code || ('REF' + userData.id.slice(-6)),
                    created_at: new Date().toISOString()
                };
                
                const { error: insertError } = await _supabase
                    .from('game_data')
                    .insert([insertData]);
                
                if (insertError) return false;
                return true;
            }
            return false;
        }
        
        console.log("✅ Datos guardados:", new Date().toLocaleTimeString());
        return true;
        
    } catch (error) {
        console.error("❌ Error en saveUserData:", error);
        return false;
    }
}

// ==========================================
// UTILIDADES
// ==========================================
function actualizarUI() {
    const dElem = document.getElementById("diamonds");
    if (dElem) dElem.textContent = Math.floor(userData.diamonds || 0).toLocaleString();
    
    const rElem = document.getElementById("rate");
    if (rElem) rElem.textContent = Math.floor(getTotalProductionPerHour()).toLocaleString();
    
    const niveles = {
        "lvl_piscina": userData.lvl_piscina,
        "lvl_fabrica": userData.lvl_fabrica,
        "lvl_escuela": userData.lvl_escuela,
        "lvl_hospital": userData.lvl_hospital
    };
    
    Object.entries(niveles).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 0;
    });
    
    if (document.getElementById("modalCasino")?.style.display === "block") {
        const rescueDiv = document.getElementById("casino-rescue");
        if (rescueDiv) {
            rescueDiv.style.display = (userData.diamonds <= 0 && !esPremium()) ? "block" : "none";
        }
    }
}

function actualizarLimitesUI() {
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        resetearLimitesDiarios();
    }
    
    const limites = { highlow: 20, ruleta: 15, tragaperras: 30, dados: 20, loteria: 5 };
    
    const elems = {
        'hl-limit': `Jugadas hoy: ${userData.jugadasHoy.highlow}/${limites.highlow}`,
        'ruleta-limit': `Jugadas hoy: ${userData.jugadasHoy.ruleta}/${limites.ruleta}`,
        'tragaperras-limit': `Jugadas hoy: ${userData.jugadasHoy.tragaperras}/${limites.tragaperras}`,
        'dados-limit': `Jugadas hoy: ${userData.jugadasHoy.dados}/${limites.dados}`,
        'loteria-limit': `Boletos hoy: ${userData.jugadasHoy.loteria}/${limites.loteria}`
    };
    
    Object.entries(elems).forEach(([id, texto]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = texto;
    });
    
    // Actualizar límites de minijuegos
    ['piscina', 'fabrica', 'escuela', 'hospital'].forEach(b => {
        actualizarLimiteJuego(b);
    });
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw", "modalAds", "modalDailyReward", "modalCasino", "modalHighLow", "modalRuleta", "modalTragaperras", "modalDados", "modalLoteria", "modalPiscina", "modalFabrica", "modalEscuela", "modalHospital", "modalEvent"].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = "none";
    });
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(initApp, 500);
});

window.addEventListener('beforeunload', () => {
    saveUserData();
});

// Variables para casino
let apuestaActual = {
    highlow: 10,
    ruleta: 10,
    tragaperras: 5,
    dados: 10,
    loteria: 1
};
let boletosComprados = [];

// EXPORTAR FUNCIONES GLOBALES
window.openCentral = openCentral;
window.openStore = () => { renderPremiumPlans(); showModal("modalStore"); };
window.openBank = () => { renderBank(); showModal("modalBank"); };
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.openDailyReward = openDailyReward;
window.openCasino = openCasino;
window.openBuilding = openBuilding;
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
window.showAdsModal = showAdsModal;
window.showAd = showAd;
window.rescueWithAd = rescueWithAd;
window.comprarPremium = comprarPremium;
window.buyUpgradeFromBuilding = buyUpgradeFromBuilding;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.comprarTON = comprarTON;
window.disconnectWallet = disconnectWallet;
window.getEventoActual = getEventoActual;
window.exchangeDiamonds = exchangeDiamonds;
window.withdrawTON = withdrawTON;

// Funciones de minijuegos
window.playPiscinaGame = playPiscinaGame;
window.adjustBet = adjustBet;
window.selectFabricaBox = selectFabricaBox;
window.startFabricaGame = startFabricaGame;
window.flipCard = flipCard;
window.startEscuelaGame = startEscuelaGame;
window.answerHospitalQuestion = answerHospitalQuestion;
window.nextHospitalQuestion = nextHospitalQuestion;
window.resetGame = resetGame;
window.multiplyWin = multiplyWin;
window.reviveGame = reviveGame;

console.log("✅ Ton City Game - Versión con minijuegos y anuncios");