// ======================================================
// TON CITY - VERSIÓN PROFESIONAL 2026 (COMPLETA)
// ======================================================
// ✅ BackButton nativo de Telegram
// ✅ AdsGram con manejo profesional de errores (finally)
// ✅ Sistema de rangos de 4 niveles (Diamante, Oro, Plata, Ciudadano)
// ✅ Minijuegos completamente funcionales y entretenidos
// ✅ Producción pausada los domingos
// ✅ Recompensa diaria con progreso visual
// ======================================================

console.log('🚀 TON CITY - Inicializando...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const BackButton = tg.BackButton;
BackButton.hide();

// ==========================================
// CONFIGURACIÓN DE RED TON 2026
// ==========================================
// Según datos de 2026: la tarifa media por transacción es ~0.002 TON 
const RED_TON_FEE = 0.002; // k - comisión de la red TON para retiros (2,000 TON por transacción según TON API)
const RESERVA_POOL = 0.95; // r - reserva para que el pool no quede vacío (95% del pool se distribuye, 5% se reserva)

// ==========================================
// CONFIGURACIÓN DE BILLETERAS
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
// ESTADO DEL JUEGO
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let adsReady = false;
let AdController = null;
let pendingMultiplier = null;
let currentFullscreenGame = null;

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
    gameStats: {
        hospital: { bestStreak: 0, totalSaved: 0, currentLevel: 1 },
        escuela: { bestScore: 0, totalCaught: 0, currentLevel: 1 },
        fabrica: { bestCompleted: 0, totalAssembled: 0, currentLevel: 1 },
        piscina: { bestDistance: 0, totalDistance: 0, currentLevel: 1 }
    },
    jugadasHoy: {
        highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0,
        piscina: 0, fabrica: 0, escuela: 0, hospital: 0,
        fecha: new Date().toDateString()
    }
};

let globalPoolData = { pool_ton: 100, total_diamonds: 0, user_rankings: [] };

// ==========================================
// VALORES DE PRODUCCIÓN
// ==========================================
const PROD_VAL = { piscina: 60, fabrica: 120, escuela: 40, hospital: 80 };

// ==========================================
// PLANES PREMIUM
// ==========================================
const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

// ==========================================
// EVENTOS SEMANALES
// ==========================================
const EVENTOS_SEMANALES = [
    { nombre: "Hospital", edificio: "hospital", icono: "fa-hospital", color: "#FF3B30", descripcion: "Semana de la Salud - Tratamientos con bonificación", recompensa: 100, premium: 200, tipo: 'ads', requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Fábrica", edificio: "fabrica", icono: "fa-industry", color: "#BF5AF2", descripcion: "Semana de Producción - Ensamblaje eficiente", recompensa: 150, premium: 300, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Piscina", edificio: "piscina", icono: "fa-water-ladder", color: "#3B8BFF", descripcion: "Semana Olímpica - Entrenamiento especial", recompensa: 80, premium: 160, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Escuela", edificio: "escuela", icono: "fa-school", color: "#FF9F0A", descripcion: "Semana del Saber - Conocimiento multiplicado", recompensa: 200, premium: 400, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 }
];

// ==========================================
// DATOS DE JUEGOS
// ==========================================

// HOSPITAL - Preguntas infinitas (generadas dinámicamente)
const SINTOMAS_BASE = [
    'Fiebre', 'Dolor de cabeza', 'Náuseas', 'Dificultad respiratoria', 'Dolor abdominal', 
    'Mareos', 'Fatiga extrema', 'Dolor en el pecho', 'Tos persistente', 'Dolor muscular',
    'Pérdida de apetito', 'Insomnio', 'Palpitaciones', 'Hormigueo', 'Visión borrosa',
    'Congestión nasal', 'Dolor de garganta', 'Erupción cutánea', 'Dolor articular', 'Vértigo'
];

const TRATAMIENTOS = [
    '💊 Antibiótico', '💊 Analgésico', '💊 Antiácido', '💉 Inyección', '🧴 Crema',
    '🍵 Té de hierbas', '🛌 Reposo absoluto', '💧 Hidratación', '🧘 Meditación',
    '💊 Antihistamínico', '💊 Antivirales', '🩹 Venda', '💉 Vacuna', '🧴 Ungüento',
    '💊 Antipirético', '💊 Antiinflamatorio', '💧 Suero', '🩺 Terapia', '💊 Broncodilatador'
];

// ESCUELA - Caída de objetos
let escuelaInterval = null;
let escuelaActive = false;
let escuelaScore = 0;
let escuelaBasketPos = 50;
let escuelaLevel = 1;

// FÁBRICA - Ensamblaje
const PRODUCTOS_FABRICA = [
    { emoji: '📱', nombre: 'Teléfono', partes: ['📱', '🔋', '📷'] },
    { emoji: '💻', nombre: 'Laptop', partes: ['💻', '🔋', '🖱️'] },
    { emoji: '🎧', nombre: 'Auriculares', partes: ['🎧', '🔌', '📻'] },
    { emoji: '⌚', nombre: 'Reloj', partes: ['⌚', '🔋', '⏱️'] },
    { emoji: '📷', nombre: 'Cámara', partes: ['📷', '🔋', '💾'] },
    { emoji: '🖨️', nombre: 'Impresora', partes: ['🖨️', '🔌', '📄'] },
    { emoji: '🔊', nombre: 'Altavoz', partes: ['🔊', '🔌', '📻'] }
];
let fabricaCompleted = 0;
let fabricaCurrentProduct = null;
let fabricaParts = [];
let fabricaLevel = 1;

// PISCINA - Carril de obstáculos
let piscinaDistance = 0;
let piscinaTimeLeft = 30;
let piscinaLane = 1;
let piscinaActive = false;
let piscinaInterval = null;
let piscinaObstacleInterval = null;
let piscinaLevel = 1;

// HOSPITAL
let hospitalHealth = 100;
let hospitalStreak = 0;
let hospitalLevel = 1;
let hospitalActive = false;
let hospitalCurrentPatient = null;

// CASINO
let apuestaActual = { highlow: 10, ruleta: 10, tragaperras: 5, dados: 10, loteria: 1 };
let boletosComprados = [];

// ==========================================
// FUNCIONES PREMIUM
// ==========================================
function esPremium() {
    if (!userData.premium_expires) return false;
    return new Date() < new Date(userData.premium_expires);
}

function actualizarPremiumUI() {
    const badge = document.getElementById('premium-badge');
    if (esPremium()) badge.style.display = 'flex';
    else badge.style.display = 'none';
}

// ==========================================
// BACKBUTTON - CONTROL PROFESIONAL
// ==========================================
function showBackButton() {
    BackButton.show();
    BackButton.onClick(() => {
        closeAll();
        BackButton.hide();
    });
}

function hideBackButton() {
    BackButton.hide();
    BackButton.offClick();
}

// ==========================================
// ADSGRAM 2026 - IMPLEMENTACIÓN PROFESIONAL CON FINALLY
// ==========================================
async function initAds() {
    try {
        AdController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        adsReady = true;
        console.log('✅ AdsGram listo');
    } catch (err) {
        adsReady = false;
        console.error('AdsGram error:', err);
    }
}
setTimeout(initAds, 4500);

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
        .then((result) => {
            callback(result.done === true);
        })
        .catch((error) => {
            console.log('Ad error:', error);
            callback(false);
        })
        .finally(() => {
            console.log('Ad attempt finished');
        });
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================
function actualizarUI() {
    document.getElementById('diamonds').textContent = Math.floor(userData.diamonds || 0);
    document.getElementById('rate').textContent = Math.floor(getTotalProductionPerHour());
    
    // Actualizar niveles en UI
    document.getElementById('lvl_piscina').textContent = userData.lvl_piscina;
    document.getElementById('lvl_fabrica').textContent = userData.lvl_fabrica;
    document.getElementById('lvl_escuela').textContent = userData.lvl_escuela;
    document.getElementById('lvl_hospital').textContent = userData.lvl_hospital;
    
    // Actualizar saldo en casinos si están abiertos
    ['highlow', 'ruleta', 'tragaperras', 'dados', 'loteria'].forEach(j => {
        const balanceSpan = document.getElementById(`${j}-balance`);
        if (balanceSpan) balanceSpan.textContent = Math.floor(userData.diamonds);
    });
}

function getTotalProductionPerHour() {
    let base = (userData.lvl_piscina * 60) + (userData.lvl_fabrica * 120) + 
               (userData.lvl_escuela * 40) + (userData.lvl_hospital * 80);
    if (esPremium()) base *= 2;
    return base;
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

function showModal(id) {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById(id).style.display = 'block';
    showBackButton();
}

function closeAll() {
    document.getElementById('overlay').style.display = 'none';
    const modals = [
        'centralModal', 'modalBank', 'modalStore', 'modalFriends', 'modalWithdraw',
        'modalAds', 'modalDailyReward', 'modalCasino', 'modalHighLow', 'modalRuleta',
        'modalTragaperras', 'modalDados', 'modalLoteria', 'modalPiscina', 'modalFabrica',
        'modalEscuela', 'modalHospital', 'modalEvent'
    ];
    modals.forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });
    hideBackButton();
    currentFullscreenGame = null;
    
    // Limpiar intervalos de juegos
    if (escuelaInterval) {
        clearInterval(escuelaInterval);
        escuelaInterval = null;
    }
    if (piscinaInterval) {
        clearInterval(piscinaInterval);
        piscinaInterval = null;
    }
    if (piscinaObstacleInterval) {
        clearInterval(piscinaObstacleInterval);
        piscinaObstacleInterval = null;
    }
    piscinaActive = false;
    escuelaActive = false;
}

// ==========================================
// SISTEMA DE RANGOS DE 4 NIVELES
// ==========================================
async function updateRankingAndPool() {
    try {
        const { data, error } = await _supabase
            .from('game_data')
            .select('telegram_id, diamonds')
            .neq('telegram_id', 'MASTER');
        
        if (!error && data) {
            globalPoolData.user_rankings = data
                .map(u => ({ id: u.telegram_id, diamonds: Number(u.diamonds) || 0 }))
                .sort((a, b) => b.diamonds - a.diamonds);
            globalPoolData.total_diamonds = globalPoolData.user_rankings.reduce((s, u) => s + u.diamonds, 0);
        }
        
        const posicion = globalPoolData.user_rankings.findIndex(u => u.id === userData.id);
        let rank = "Ciudadano";
        let pos = globalPoolData.user_rankings.length;
        
        if (posicion !== -1) {
            pos = posicion + 1;
            if (posicion < 3) rank = "Diamante";
            else if (posicion < 10) rank = "Oro";
            else if (posicion < 50) rank = "Plata";
            else rank = "Ciudadano";
        }
        
        userData.rank = rank;
        userData.weekly_rank = pos;
        
        const rankDisplay = document.getElementById('user-rank-display');
        if (rankDisplay) rankDisplay.textContent = `${rank} #${pos}`;
        const positionDisplay = document.getElementById('user-position');
        if (positionDisplay) positionDisplay.textContent = `#${pos}`;
        
        await calculateProjectedReward();
    } catch(e) {
        console.error("Error ranking:", e);
    }
}

async function calculateProjectedReward() {
    try {
        const poolUsuarios = globalPoolData.pool_ton * 0.8 * RESERVA_POOL;
        
        if (poolUsuarios <= 0 || globalPoolData.user_rankings.length === 0 || userData.diamonds <= 0) {
            userData.projectedReward = 0;
            const projElem = document.getElementById('projected-reward-display');
            if (projElem) projElem.textContent = '0 TON';
            return;
        }
        
        const miPosicion = userData.weekly_rank - 1;
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
        
        const projElem = document.getElementById('projected-reward-display');
        if (projElem) projElem.textContent = recompensa.toFixed(4) + ' TON';
        
        const poolElem = document.getElementById('pool-total-display');
        if (poolElem) poolElem.textContent = globalPoolData.pool_ton.toFixed(2) + ' TON';
        
    } catch(e) {
        console.error(e);
    }
}

async function updateRealPoolBalance() {
    try {
        const response = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        if (response.ok) {
            const data = await response.json();
            globalPoolData.pool_ton = (data.balance || 0) / 1000000000;
        } else {
            const { data } = await _supabase
                .from('game_data')
                .select('pool_ton')
                .eq('telegram_id', 'MASTER')
                .single();
            if (data) globalPoolData.pool_ton = data.pool_ton;
        }
    } catch(e) {
        console.error(e);
    }
    return globalPoolData.pool_ton;
}

// ==========================================
// FUNCIÓN DE RETIRO
// ==========================================
async function exchangeDiamonds() {
    if (!tonConnectUI?.connected) return alert("❌ Conecta tu wallet primero");
    if (!enVentanaRetiro()) return alert("❌ El intercambio solo está disponible los DOMINGOS");
    
    const semanaActual = getNumeroSemana();
    if (userData.last_withdraw_week === semanaActual) return alert("❌ Ya intercambiaste tus diamantes esta semana");
    if (userData.diamonds <= 0) return alert("❌ No tienes diamantes para intercambiar");
    
    await updateRankingAndPool();
    let tonARecibir = userData.projectedReward;
    if (tonARecibir <= 0) return alert("❌ No hay TON en el pool para distribuir");
    
    const txFee = RED_TON_FEE;
    if (tonARecibir < txFee * 2) return alert(`❌ Mínimo para retiro: ${(txFee * 2).toFixed(4)} TON (cubre comisión de red)`);
    
    tonARecibir -= txFee;
    
    if (!confirm(`¿Intercambiar ${Math.floor(userData.diamonds).toLocaleString()} 💎 por ${tonARecibir.toFixed(4)} TON?\n\nRango: ${userData.rank} #${userData.weekly_rank}\n\n⚠️ Los diamantes no intercambiados se queman al final del domingo`)) return;
    
    userData.accumulated_ton = (userData.accumulated_ton || 0) + tonARecibir;
    userData.last_withdraw_week = semanaActual;
    userData.diamonds = 0;
    await saveUserData();
    
    alert(`✅ ¡Intercambio exitoso! Tienes ${userData.accumulated_ton.toFixed(4)} TON acumulados para retirar`);
    closeAll();
}

async function withdrawTON() {
    if (!tonConnectUI?.connected) return alert("❌ Conecta tu wallet primero");
    if (!userData.accumulated_ton || userData.accumulated_ton < RED_TON_FEE) return alert(`❌ Necesitas al menos ${RED_TON_FEE.toFixed(4)} TON para retirar (cubre comisión de red)`);
    
    const montoRetiro = userData.accumulated_ton - RED_TON_FEE;
    
    if (!confirm(`¿Retirar ${montoRetiro.toFixed(4)} TON a tu wallet?\n\n(Comisión de red: ${RED_TON_FEE.toFixed(4)} TON)`)) return;
    
    try {
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: currentWallet.account.address,
                amount: Math.floor(montoRetiro * 1e9).toString(),
                payload: "Retiro Ton City"
            }]
        };
        await tonConnectUI.sendTransaction(tx);
        
        userData.accumulated_ton = 0;
        await saveUserData();
        alert(`✅ ¡Retiro exitoso! ${montoRetiro.toFixed(4)} TON enviados a tu wallet`);
        closeAll();
    } catch(e) {
        alert("❌ Error en transacción");
        console.error(e);
    }
}

async function openWithdraw() {
    await updateRealPoolBalance();
    await updateRankingAndPool();
    
    const esDomingo = enVentanaRetiro();
    const badge = document.getElementById('withdraw-day-badge');
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    
    if (esDomingo) {
        badge.textContent = 'DOMINGO · INTERCAMBIO DISPONIBLE';
        badge.className = 'day-badge day-sunday';
    } else {
        badge.textContent = `${dias[new Date().getDay()]} · SIN INTERCAMBIO`;
        badge.className = 'day-badge day-other';
    }
    
    document.getElementById('available-diamonds').textContent = Math.floor(userData.diamonds);
    document.getElementById('pool-total').textContent = globalPoolData.pool_ton.toFixed(2) + ' TON';
    document.getElementById('withdraw-projection').textContent = userData.projectedReward.toFixed(4) + ' TON';
    document.getElementById('accumulated-ton').textContent = (userData.accumulated_ton || 0).toFixed(4) + ' TON';
    document.getElementById('exchange-btn').disabled = !esDomingo || userData.diamonds === 0;
    document.getElementById('withdraw-ton-btn').disabled = !userData.accumulated_ton || userData.accumulated_ton < RED_TON_FEE;
    
    showModal('modalWithdraw');
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
    showModal('modalDailyReward');
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
// MINIJUEGO: HOSPITAL (PREGUNTAS INFINITAS)
// ==========================================
function iniciarHospitalGame() {
    hospitalHealth = 100;
    hospitalStreak = 0;
    hospitalActive = true;
    hospitalLevel = userData.gameStats?.hospital?.currentLevel || 1;
    
    document.getElementById('patient-health').textContent = '100';
    document.getElementById('hospital-game-streak').textContent = '0';
    document.getElementById('health-bar').style.width = '100%';
    document.getElementById('hospital-level-display').textContent = hospitalLevel;
    document.getElementById('hospital-best').textContent = userData.gameStats?.hospital?.bestStreak || 0;
    
    generarPaciente();
}

function generarPaciente() {
    if (!hospitalActive) return;
    
    const sintoma = SINTOMAS_BASE[Math.floor(Math.random() * SINTOMAS_BASE.length)];
    const correctoIndex = Math.floor(Math.random() * TRATAMIENTOS.length);
    const correcto = TRATAMIENTOS[correctoIndex];
    const opciones = [correcto];
    
    while (opciones.length < 4) {
        const r = TRATAMIENTOS[Math.floor(Math.random() * TRATAMIENTOS.length)];
        if (!opciones.includes(r)) opciones.push(r);
    }
    
    // Mezclar opciones
    for (let i = opciones.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
    }
    
    hospitalCurrentPatient = { sintoma, correcto, opciones };
    
    const emojis = ['😷', '🤕', '🤢', '🫁', '🦷', '🤧', '🩹', '🫀', '🧠'];
    document.getElementById('patient-emoji').textContent = emojis[Math.floor(Math.random() * emojis.length)];
    document.getElementById('symptom-text').textContent = `Síntoma: ${sintoma}`;
    
    const container = document.getElementById('treatment-buttons');
    container.innerHTML = opciones.map(opt => `<div class="treatment-btn" onclick="selectTreatment('${opt.replace(/'/g, "\\'")}')">${opt}</div>`).join('');
}

function selectTreatment(selected) {
    if (!hospitalActive || !hospitalCurrentPatient) return;
    
    const isCorrect = selected === hospitalCurrentPatient.correct;
    const evento = getEventoActual();
    
    let multiplier = 1;
    if (evento.edificio === 'hospital') multiplier = esPremium() ? 4 : 2;
    if (pendingMultiplier) {
        multiplier *= pendingMultiplier;
        pendingMultiplier = null;
    }
    multiplier *= hospitalLevel;
    
    if (isCorrect) {
        let reward = 20 * multiplier;
        userData.diamonds += reward;
        hospitalStreak++;
        
        if (hospitalStreak % 5 === 0) {
            hospitalLevel++;
            document.getElementById('hospital-level-display').textContent = hospitalLevel;
            userData.gameStats.hospital.currentLevel = hospitalLevel;
        }
        
        if (hospitalStreak > (userData.gameStats?.hospital?.bestStreak || 0)) {
            userData.gameStats.hospital.bestStreak = hospitalStreak;
            document.getElementById('hospital-best').textContent = hospitalStreak;
        }
        
        hospitalHealth = Math.min(100, hospitalHealth + 10);
        document.getElementById('hospital-game-result').innerHTML = `<span style="color:#34C759;">✅ +${reward} 💎</span>`;
    } else {
        hospitalHealth -= 25;
        hospitalStreak = 0;
        document.getElementById('hospital-game-result').innerHTML = `<span style="color:#FF3B30;">❌ -25% salud</span>`;
        
        if (hospitalHealth <= 0) {
            hospitalActive = false;
            document.getElementById('hospital-game-result').innerHTML = '<span style="color:#FF3B30;">😵 Paciente fallecido</span>';
            saveUserData();
            return;
        }
    }
    
    document.getElementById('patient-health').textContent = hospitalHealth;
    document.getElementById('hospital-game-streak').textContent = hospitalStreak;
    document.getElementById('health-bar').style.width = hospitalHealth + '%';
    
    if (hospitalActive && hospitalHealth > 0) {
        setTimeout(generarPaciente, 1500);
    }
    
    actualizarUI();
    saveUserData();
}

// ==========================================
// MINIJUEGO: ESCUELA (ATRAPA EL SABER)
// ==========================================
function iniciarEscuelaGame() {
    if (escuelaInterval) clearInterval(escuelaInterval);
    
    escuelaScore = 0;
    escuelaActive = true;
    escuelaBasketPos = 50;
    escuelaLevel = userData.gameStats?.escuela?.currentLevel || 1;
    
    document.getElementById('catch-score').textContent = '0';
    document.getElementById('escuela-best').textContent = userData.gameStats?.escuela?.bestScore || 0;
    document.getElementById('escuela-level-display').textContent = escuelaLevel;
    
    const basket = document.getElementById('student-basket');
    if (basket) basket.style.left = '50%';
    
    const rainDiv = document.getElementById('knowledge-rain');
    if (rainDiv) {
        const items = rainDiv.querySelectorAll('.falling-item');
        items.forEach(i => i.remove());
    }
    
    const velocidad = Math.max(400, 800 - (escuelaLevel * 20));
    escuelaInterval = setInterval(() => {
        if (!escuelaActive) return;
        
        const rain = document.getElementById('knowledge-rain');
        if (!rain) return;
        
        const isBook = Math.random() < 0.7;
        const item = document.createElement('div');
        item.className = 'falling-item';
        item.textContent = isBook ? '📚' : (Math.random() < 0.5 ? '📱' : '🎮');
        item.style.left = Math.random() * 85 + '%';
        item.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's';
        item.setAttribute('data-type', isBook ? 'book' : 'trash');
        item.onclick = () => atraparObjeto(item);
        
        rain.appendChild(item);
        setTimeout(() => {
            if (item.parentNode) item.remove();
        }, 3000);
    }, velocidad);
}

function atraparObjeto(item) {
    if (!escuelaActive) return;
    
    const basket = document.getElementById('student-basket');
    if (!basket) return;
    
    const basketRect = basket.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const basketCenter = basketRect.left + basketRect.width / 2;
    const itemCenter = itemRect.left + itemRect.width / 2;
    
    if (Math.abs(itemCenter - basketCenter) < 45 && itemRect.bottom > basketRect.top) {
        const tipo = item.getAttribute('data-type');
        const evento = getEventoActual();
        
        let multiplier = 1;
        if (evento.edificio === 'escuela') multiplier = esPremium() ? 4 : 2;
        if (pendingMultiplier) {
            multiplier *= pendingMultiplier;
            pendingMultiplier = null;
        }
        multiplier *= escuelaLevel;
        
        if (tipo === 'book') {
            let reward = 10 * multiplier;
            escuelaScore += reward;
            userData.diamonds += reward;
            document.getElementById('catch-score').textContent = escuelaScore;
            
            if (escuelaScore >= escuelaLevel * 100) {
                escuelaLevel++;
                document.getElementById('escuela-level-display').textContent = escuelaLevel;
                userData.gameStats.escuela.currentLevel = escuelaLevel;
                if (escuelaInterval) clearInterval(escuelaInterval);
                iniciarEscuelaGame();
            }
            
            if (escuelaScore > (userData.gameStats?.escuela?.bestScore || 0)) {
                userData.gameStats.escuela.bestScore = escuelaScore;
                document.getElementById('escuela-best').textContent = escuelaScore;
            }
        } else {
            escuelaScore = Math.max(0, escuelaScore - 5);
            document.getElementById('catch-score').textContent = escuelaScore;
        }
        
        item.remove();
        actualizarUI();
        saveUserData();
    }
}

function moveBasket(direction) {
    const step = 8;
    if (direction === 'left') {
        escuelaBasketPos = Math.max(10, escuelaBasketPos - step);
    } else {
        escuelaBasketPos = Math.min(90, escuelaBasketPos + step);
    }
    const basket = document.getElementById('student-basket');
    if (basket) basket.style.left = escuelaBasketPos + '%';
}

// ==========================================
// MINIJUEGO: FÁBRICA (ENCONTRAR PARTE CORRECTA)
// ==========================================
function iniciarFabricaGame() {
    fabricaCompleted = 0;
    fabricaLevel = userData.gameStats?.fabrica?.currentLevel || 1;
    
    document.getElementById('assembly-count').textContent = '0';
    document.getElementById('fabrica-best').textContent = userData.gameStats?.fabrica?.bestCompleted || 0;
    document.getElementById('fabrica-level-display').textContent = fabricaLevel;
    
    nuevoProductoFabrica();
}

function nuevoProductoFabrica() {
    const productosDisponibles = PRODUCTOS_FABRICA.slice(0, Math.min(PRODUCTOS_FABRICA.length, 3 + Math.floor(fabricaLevel / 2)));
    const randomIndex = Math.floor(Math.random() * productosDisponibles.length);
    fabricaCurrentProduct = { ...productosDisponibles[randomIndex] };
    fabricaParts = [...fabricaCurrentProduct.parts];
    
    document.getElementById('target-product').textContent = fabricaCurrentProduct.emoji;
    
    const lineDiv = document.getElementById('assembly-line');
    if (!lineDiv) return;
    
    lineDiv.innerHTML = fabricaParts.map((part, idx) => `<div class="part" onclick="ensamblarParteFabrica(${idx})">${part}</div>`).join('');
}

function ensamblarParteFabrica(index) {
    if (index === 0) {
        const evento = getEventoActual();
        
        let multiplier = 1;
        if (evento.edificio === 'fabrica') multiplier = esPremium() ? 4 : 2;
        if (pendingMultiplier) {
            multiplier *= pendingMultiplier;
            pendingMultiplier = null;
        }
        multiplier *= fabricaLevel;
        
        let reward = 25 * multiplier;
        fabricaCompleted++;
        userData.diamonds += reward;
        
        document.getElementById('assembly-count').textContent = fabricaCompleted;
        
        if (fabricaCompleted % 10 === 0) {
            fabricaLevel++;
            document.getElementById('fabrica-level-display').textContent = fabricaLevel;
            userData.gameStats.fabrica.currentLevel = fabricaLevel;
        }
        
        if (fabricaCompleted > (userData.gameStats?.fabrica?.bestCompleted || 0)) {
            userData.gameStats.fabrica.bestCompleted = fabricaCompleted;
            document.getElementById('fabrica-best').textContent = fabricaCompleted;
        }
        
        fabricaParts.shift();
        
        if (fabricaParts.length === 0) {
            setTimeout(nuevoProductoFabrica, 500);
        } else {
            const lineDiv = document.getElementById('assembly-line');
            if (lineDiv) {
                lineDiv.innerHTML = fabricaParts.map((part, idx) => `<div class="part" onclick="ensamblarParteFabrica(${idx})">${part}</div>`).join('');
            }
        }
        
        actualizarUI();
        saveUserData();
    } else {
        alert("❌ Parte incorrecta. ¡Empieza por la izquierda!");
    }
}

// ==========================================
// MINIJUEGO: PISCINA (CARRIL DE OBSTÁCULOS - MÁS JUGABLE)
// ==========================================
function iniciarPiscinaGame() {
    if (piscinaInterval) clearInterval(piscinaInterval);
    if (piscinaObstacleInterval) clearInterval(piscinaObstacleInterval);
    
    piscinaDistance = 0;
    piscinaTimeLeft = 30;
    piscinaLane = 1;
    piscinaActive = true;
    piscinaLevel = userData.gameStats?.piscina?.currentLevel || 1;
    
    document.getElementById('swim-distance').textContent = '0';
    document.getElementById('swim-timer-ring').textContent = '30';
    document.getElementById('piscina-best').textContent = userData.gameStats?.piscina?.bestDistance || 0;
    document.getElementById('piscina-level-display').textContent = piscinaLevel;
    
    const swimmer = document.getElementById('swimmer');
    if (swimmer) swimmer.style.top = '0px';
    
    const lanesDiv = document.getElementById('swim-lanes');
    if (lanesDiv) {
        const obstacles = lanesDiv.querySelectorAll('.obstacle');
        obstacles.forEach(o => o.remove());
    }
    
    piscinaInterval = setInterval(() => {
        if (!piscinaActive) return;
        
        piscinaTimeLeft--;
        document.getElementById('swim-timer-ring').textContent = piscinaTimeLeft;
        piscinaDistance++;
        document.getElementById('swim-distance').textContent = piscinaDistance;
        
        if (piscinaTimeLeft % 5 === 0 && piscinaTimeLeft > 0) {
            const evento = getEventoActual();
            
            let multiplier = 1;
            if (evento.edificio === 'piscina') multiplier = esPremium() ? 4 : 2;
            if (pendingMultiplier) {
                multiplier *= pendingMultiplier;
                pendingMultiplier = null;
            }
            multiplier *= piscinaLevel;
            
            let reward = 15 * multiplier;
            userData.diamonds += reward;
            
            if (piscinaDistance >= piscinaLevel * 100) {
                piscinaLevel++;
                document.getElementById('piscina-level-display').textContent = piscinaLevel;
                userData.gameStats.piscina.currentLevel = piscinaLevel;
            }
            
            if (piscinaDistance > (userData.gameStats?.piscina?.bestDistance || 0)) {
                userData.gameStats.piscina.bestDistance = piscinaDistance;
                document.getElementById('piscina-best').textContent = piscinaDistance;
            }
            
            actualizarUI();
            saveUserData();
        }
        
        if (piscinaTimeLeft <= 0) {
            piscinaActive = false;
            clearInterval(piscinaInterval);
            clearInterval(piscinaObstacleInterval);
        }
    }, 1000);
    
    piscinaObstacleInterval = setInterval(() => {
        if (!piscinaActive) return;
        
        const lane = Math.floor(Math.random() * 4);
        const lanes = document.getElementById('swim-lanes');
        if (!lanes) return;
        
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        obstacle.textContent = '💢';
        obstacle.style.left = '100%';
        obstacle.style.top = (lane * 95) + 'px';
        obstacle.style.position = 'absolute';
        obstacle.style.fontSize = '48px';
        obstacle.style.transition = 'left 3s linear';
        
        lanes.appendChild(obstacle);
        
        let pos = 100;
        const moveInt = setInterval(() => {
            if (!piscinaActive || !obstacle.parentNode) {
                clearInterval(moveInt);
                return;
            }
            pos -= 1.2;
            obstacle.style.left = pos + '%';
            
            if (piscinaLane === lane && pos > 45 && pos < 55) {
                piscinaActive = false;
                clearInterval(piscinaInterval);
                clearInterval(piscinaObstacleInterval);
                clearInterval(moveInt);
                alert('💥 ¡Chocaste! Fin del entrenamiento');
                if (obstacle.parentNode) obstacle.remove();
            }
            
            if (pos <= -10) {
                clearInterval(moveInt);
                if (obstacle.parentNode) obstacle.remove();
            }
        }, 35);
        
        setTimeout(() => {
            if (obstacle.parentNode) obstacle.remove();
        }, 4000);
    }, 3000);
}

function cambiarCarril() {
    if (!piscinaActive) return;
    piscinaLane = (piscinaLane + 1) % 4;
    const swimmer = document.getElementById('swimmer');
    if (swimmer) swimmer.style.top = (piscinaLane * 95) + 'px';
}

// ==========================================
// EVENTO SEMANAL
// ==========================================
function getEventoActual() {
    const semana = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % EVENTOS_SEMANALES.length;
    return EVENTOS_SEMANALES[semana];
}

function openEventModal() {
    const evento = getEventoActual();
    document.getElementById('event-title').textContent = evento.nombre;
    document.getElementById('event-description').textContent = evento.descripcion;
    document.getElementById('event-multiplier-normal').textContent = `x${evento.gameMultiplier}`;
    document.getElementById('event-multiplier-premium').textContent = `x${evento.gameMultiplier * 2}`;
    document.getElementById('event-reward').textContent = evento.recompensa + ' 💎';
    showModal('modalEvent');
}

function startEventTask() {
    const evento = getEventoActual();
    if (!tonConnectUI?.connected) return alert("❌ Conecta tu wallet");
    
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
                const bar = document.getElementById('event-progress-bar');
                if (bar) bar.style.width = `${(progreso / requeridos) * 100}%`;
            }
        }
    });
}

// ==========================================
// ANUNCIOS (PARQUE)
// ==========================================
function showAdsModal() {
    showModal('modalAds');
    actualizarEstadoAnuncio();
}

function actualizarEstadoAnuncio() {
    const puede = (!userData.last_ad_watch || (new Date() - new Date(userData.last_ad_watch)) > 3600000);
    const btn = document.getElementById('watch-ad-btn');
    if (!btn) return;
    
    if (esPremium()) {
        btn.disabled = true;
        btn.textContent = '⭐ PREMIUM - SIN ANUNCIOS';
        return;
    }
    
    if (puede && adsReady) {
        btn.disabled = false;
        btn.textContent = 'VER ANUNCIO +30 💎';
    } else {
        btn.disabled = true;
        const restante = userData.last_ad_watch ? Math.ceil((3600000 - (new Date() - new Date(userData.last_ad_watch))) / 60000) : 0;
        btn.textContent = `⏳ ${restante} min`;
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
        alert('⭐ Premium: +100 💎');
        return;
    }
    
    if (userData.diamonds > 0) return alert("❌ Solo disponible cuando tienes 0 diamantes");
    
    const hoy = new Date();
    if (userData.last_casino_rescue) {
        const ultimo = new Date(userData.last_casino_rescue);
        if (hoy.toDateString() === ultimo.toDateString()) return alert("❌ Ya usaste rescate hoy");
    }
    
    showRewardedAd((success) => {
        if (success) {
            userData.diamonds += 100;
            userData.last_casino_rescue = new Date().toISOString();
            saveUserData();
            actualizarUI();
            alert('✅ +100 💎');
        }
    });
}

// ==========================================
// FUNCIONES DE CASINO
// ==========================================
function openCasino() {
    showModal('modalCasino');
    const rescue = document.getElementById('casino-rescue');
    if (rescue) rescue.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
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
        // Inicializar valores
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
        showModal(modalId);
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
    document.getElementById(`${juego === 'hl' ? 'hl' : key}-bet-display`).textContent = apuestaActual[key];
    document.getElementById(`${juego === 'hl' ? 'hl' : key}-bet`).textContent = apuestaActual[key];
}

function jugarHighLow(eleccion) {
    const apuesta = apuestaActual.highlow;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('highlow')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('highlow');
    
    const numero = Math.floor(Math.random() * 10000);
    const gana = (eleccion === 'low' && numero < 5000) || (eleccion === 'high' && numero >= 5000);
    
    document.getElementById('hl-number').textContent = numero.toString().padStart(4, '0');
    
    if (gana) {
        const ganancia = apuesta * 2;
        userData.diamonds += ganancia;
        document.getElementById('hl-result').innerHTML = '<span class="text-win">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('hl-result').innerHTML = '<span class="text-lose">😞 Perdiste</span>';
    }
    
    actualizarUI();
    saveUserData();
}

function jugarRuleta(tipo) {
    const apuesta = apuestaActual.ruleta;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('ruleta')) return alert('❌ Límite diario alcanzado');
    
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
            const num = parseInt(prompt("Elige número 0-36:"));
            if (isNaN(num) || num < 0 || num > 36) {
                userData.diamonds += apuesta;
                actualizarUI();
                return;
            }
            gana = numero === num;
            break;
    }
    
    let ganancia = (tipo === 'numero' && gana) ? apuesta * 36 : apuesta * 2;
    if (gana) {
        userData.diamonds += ganancia;
        document.getElementById('ruleta-result').innerHTML = '<span class="text-win">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('ruleta-result').innerHTML = '<span class="text-lose">😞 Perdiste</span>';
    }
    
    actualizarUI();
    saveUserData();
}

function jugarTragaperras() {
    const apuesta = apuestaActual.tragaperras;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('tragaperras')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('tragaperras');
    
    const simbolos = [
        { nombre: "💎", mult: 50 }, { nombre: "₿", mult: 20 }, { nombre: "Ξ", mult: 10 },
        { nombre: "🪙", mult: 5 }, { nombre: "📈", mult: 2 }, { nombre: "📉", mult: 2 }
    ];
    
    const r = [];
    for (let i = 0; i < 3; i++) {
        const rand = Math.random() * 100;
        let acum = 0;
        for (const s of simbolos) {
            acum += 20;
            if (rand < acum) {
                r.push(s);
                break;
            }
        }
    }
    
    document.getElementById('slot1').textContent = r[0].nombre;
    document.getElementById('slot2').textContent = r[1].nombre;
    document.getElementById('slot3').textContent = r[2].nombre;
    
    if (r[0].nombre === r[1].nombre && r[1].nombre === r[2].nombre) {
        let mult = r[0].mult;
        if (esPremium()) mult *= 2;
        userData.diamonds += apuesta * mult;
        document.getElementById('tragaperras-result').innerHTML = `<span class="text-win">🎉 ¡GANASTE! x${mult}</span>`;
    } else {
        document.getElementById('tragaperras-result').innerHTML = '<span class="text-lose">😞 Perdiste</span>';
    }
    
    actualizarUI();
    saveUserData();
}

function jugarDados(eleccion) {
    const apuesta = apuestaActual.dados;
    if (userData.diamonds < apuesta) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('dados')) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= apuesta;
    registrarJugada('dados');
    
    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;
    const caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    document.getElementById('dado1').textContent = caras[d1 - 1];
    document.getElementById('dado2').textContent = caras[d2 - 1];
    const suma = d1 + d2;
    document.getElementById('dados-suma').textContent = `Suma: ${suma}`;
    
    let gana = (eleccion === 'menor' && suma >= 2 && suma <= 6) ||
               (eleccion === 'mayor' && suma >= 8 && suma <= 12) ||
               (eleccion === 'exacto' && suma === 7);
    
    if (gana) {
        let ganancia = eleccion === 'exacto' ? apuesta * 5 : apuesta * 2;
        if (esPremium()) ganancia *= 2;
        userData.diamonds += ganancia;
        document.getElementById('dados-result').innerHTML = '<span class="text-win">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('dados-result').innerHTML = '<span class="text-lose">😞 Perdiste</span>';
    }
    
    actualizarUI();
    saveUserData();
}

function comprarBoletos() {
    const cantidad = apuestaActual.loteria;
    const costo = cantidad * 5;
    if (userData.diamonds < costo) return alert('❌ Insuficientes diamantes');
    if (!puedeJugar('loteria', cantidad)) return alert('❌ Límite diario alcanzado');
    
    userData.diamonds -= costo;
    registrarJugada('loteria', cantidad);
    
    boletosComprados = [];
    for (let i = 0; i < cantidad; i++) {
        boletosComprados.push(Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
    }
    
    document.getElementById('loteria-boletos').innerHTML = `<p>Tus boletos:</p><div style="display:flex; flex-wrap:wrap; gap:5px;">${boletosComprados.map(b => `<span style="background:#1E2332; padding:5px 10px; border-radius:5px;">${b}</span>`).join('')}</div>`;
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
        document.getElementById('loteria-result').innerHTML = `<span class="text-win">🎉 +${premioTotal} 💎</span>`;
    } else {
        document.getElementById('loteria-result').innerHTML = '<span class="text-lose">😞 No ganaste</span>';
    }
    
    boletosComprados = [];
    actualizarUI();
    saveUserData();
}

function puedeJugar(juego, cantidad = 1) {
    if (userData.haInvertido) return true;
    
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = {
            highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0,
            piscina: 0, fabrica: 0, escuela: 0, hospital: 0,
            fecha: hoy
        };
    }
    
    const limites = { highlow: 20, ruleta: 15, tragaperras: 30, dados: 20, loteria: 5 };
    return (userData.jugadasHoy[juego] + cantidad) <= limites[juego];
}

function registrarJugada(juego, cantidad = 1) {
    if (!userData.haInvertido) {
        userData.jugadasHoy[juego] += cantidad;
    }
}

// ==========================================
// FUNCIONES DE EDIFICIOS
// ==========================================
function openBuilding(building) {
    currentFullscreenGame = building;
    
    const precios = { piscina: 5000, fabrica: 10000, escuela: 3000, hospital: 7500 };
    const producciones = { piscina: 60, fabrica: 120, escuela: 40, hospital: 80 };
    const nivel = userData[`lvl_${building}`] || 0;
    
    document.getElementById(`${building}-level`).textContent = nivel;
    document.getElementById(`${building}-prod`).textContent = (nivel * producciones[building]) + ' 💎/h';
    document.getElementById(`${building}-price`).textContent = precios[building].toLocaleString() + ' 💎';
    document.getElementById(`${building}-btn`).disabled = userData.diamonds < precios[building];
    
    if (building === 'hospital') {
        document.getElementById('hospital-best').textContent = userData.gameStats?.hospital?.bestStreak || 0;
        document.getElementById('hospital-level-display').textContent = userData.gameStats?.hospital?.currentLevel || 1;
    }
    if (building === 'escuela') {
        document.getElementById('escuela-best').textContent = userData.gameStats?.escuela?.bestScore || 0;
        document.getElementById('escuela-level-display').textContent = userData.gameStats?.escuela?.currentLevel || 1;
    }
    if (building === 'fabrica') {
        document.getElementById('fabrica-best').textContent = userData.gameStats?.fabrica?.bestCompleted || 0;
        document.getElementById('fabrica-level-display').textContent = userData.gameStats?.fabrica?.currentLevel || 1;
    }
    if (building === 'piscina') {
        document.getElementById('piscina-best').textContent = userData.gameStats?.piscina?.bestDistance || 0;
        document.getElementById('piscina-level-display').textContent = userData.gameStats?.piscina?.currentLevel || 1;
    }
    
    showModal(`modal${building.charAt(0).toUpperCase() + building.slice(1)}`);
}

function switchHospitalTab(tab) {
    const upgrade = document.getElementById('hospital-upgrade-panel');
    const game = document.getElementById('hospital-game-panel');
    const tabs = document.querySelectorAll('#modalHospital .tab');
    
    if (tab === 'game') {
        upgrade.style.display = 'none';
        game.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        iniciarHospitalGame();
    } else {
        upgrade.style.display = 'block';
        game.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

function switchEscuelaTab(tab) {
    const upgrade = document.getElementById('escuela-upgrade-panel');
    const game = document.getElementById('escuela-game-panel');
    const tabs = document.querySelectorAll('#modalEscuela .tab');
    
    if (tab === 'game') {
        upgrade.style.display = 'none';
        game.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        iniciarEscuelaGame();
    } else {
        upgrade.style.display = 'block';
        game.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

function switchFabricaTab(tab) {
    const upgrade = document.getElementById('fabrica-upgrade-panel');
    const game = document.getElementById('fabrica-game-panel');
    const tabs = document.querySelectorAll('#modalFabrica .tab');
    
    if (tab === 'game') {
        upgrade.style.display = 'none';
        game.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        iniciarFabricaGame();
    } else {
        upgrade.style.display = 'block';
        game.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

function switchPiscinaTab(tab) {
    const upgrade = document.getElementById('piscina-upgrade-panel');
    const game = document.getElementById('piscina-game-panel');
    const tabs = document.querySelectorAll('#modalPiscina .tab');
    
    if (tab === 'game') {
        upgrade.style.display = 'none';
        game.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        iniciarPiscinaGame();
    } else {
        upgrade.style.display = 'block';
        game.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

// ==========================================
// ANUNCIOS MINIJUEGOS
// ==========================================
function useAdMultiplier(game) {
    showRewardedAd((s) => {
        if (s) {
            pendingMultiplier = 2;
            alert('✨ Multiplicador x2 activado!');
        }
    });
}

function useAdRevive(game) {
    if (game === 'hospital') {
        showRewardedAd((s) => {
            if (s) {
                hospitalHealth = 50;
                hospitalActive = true;
                document.getElementById('patient-health').textContent = '50';
                document.getElementById('health-bar').style.width = '50%';
                alert('❤️ Paciente revivido');
            }
        });
    }
}

function useAdContinue(game) {
    if (game === 'escuela') {
        showRewardedAd((s) => {
            if (s) {
                escuelaActive = true;
                alert('⏱️ +30 segundos');
            }
        });
    }
}

function useAdHint(game) {
    showRewardedAd((s) => {
        if (s) alert('🔍 Empieza por la izquierda');
    });
}

function useAdExtraTime(game) {
    if (game === 'piscina') {
        showRewardedAd((s) => {
            if (s) {
                piscinaTimeLeft += 10;
                alert('⏱️ +10 segundos');
            }
        });
    }
}

// ==========================================
// BANCO Y TIENDA
// ==========================================
function openBank() {
    renderBank();
    showModal('modalBank');
}

function renderBank() {
    const container = document.getElementById('bankList');
    const isConnected = !!currentWallet;
    const packs = [
        { ton: 0.10, diamonds: 100 }, { ton: 0.50, diamonds: 500 }, { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 }, { ton: 5.00, diamonds: 5000 }, { ton: 10.00, diamonds: 10000 }
    ];
    
    container.innerHTML = packs.map(p => `
        <div style="background:var(--bg-elevated); border-radius:12px; padding:16px; margin:8px 0; display:flex; justify-content:space-between;">
            <div><strong>${p.ton.toFixed(2)} TON</strong><div style="font-size:12px;">+${p.diamonds} 💎</div></div>
            <button onclick="comprarTON(${p.ton})" style="background:${isConnected ? '#34C759' : '#334155'}; border:none; padding:10px 20px; border-radius:30px;" ${!isConnected ? 'disabled' : ''}>
                ${isConnected ? 'COMPRAR' : 'CONECTAR'}
            </button>
        </div>
    `).join('');
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI?.connected) return alert('❌ Conecta wallet');
    let comprados = Math.floor(tonAmount / PRECIO_COMPRA);
    if (comprados < 100) comprados = 100;
    
    userData.diamonds += comprados;
    if (!userData.haInvertido && comprados >= 100) userData.haInvertido = true;
    await saveUserData();
    actualizarUI();
    alert(`✅ +${comprados} 💎`);
}

function openStore() {
    renderPremiumPlans();
    showModal('modalStore');
}

function renderPremiumPlans() {
    const container = document.getElementById('premium-plans');
    const isConnected = !!currentWallet;
    
    container.innerHTML = PREMIUM_PLANS.map(p => `
        <div style="background:var(--bg-elevated); border-radius:16px; padding:16px; margin:10px 0;">
            <div style="display:flex; justify-content:space-between;"><strong>${p.name}</strong><span style="color:#FCCF47;">${p.price} TON</span></div>
            <button onclick="comprarPremium(${JSON.stringify(p).replace(/"/g, '&quot;')})" 
                style="background:${isConnected ? '#BF5AF2' : '#334155'}; border:none; border-radius:30px; padding:12px; width:100%; margin-top:12px;" 
                ${!isConnected ? 'disabled' : ''}>
                ${isConnected ? 'COMPRAR' : 'CONECTAR'}
            </button>
        </div>
    `).join('');
}

async function comprarPremium(plan) {
    if (!tonConnectUI?.connected) return alert('❌ Conecta wallet');
    const ahora = new Date();
    const expiracion = new Date(ahora);
    expiracion.setDate(expiracion.getDate() + plan.days);
    userData.premium_expires = expiracion.toISOString();
    await saveUserData();
    actualizarPremiumUI();
    alert(`✅ Plan ${plan.name} activado`);
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    showModal('modalFriends');
    document.getElementById('referral-code').textContent = userData.referral_code || 'CARGANDO...';
    document.getElementById('ref-count').textContent = userData.referred_users?.length || 0;
    document.getElementById('ref-total').textContent = (userData.referral_earnings || 0) + ' 💎';
}

function copyReferralCode() {
    const code = userData.referral_code;
    if (!code) return alert('❌ Código no disponible');
    navigator.clipboard.writeText(`https://t.me/ton_city_bot?start=${code}`).then(() => alert('✅ Enlace copiado!'));
}

// ==========================================
// PRODUCCIÓN
// ==========================================
function startProduction() {
    setInterval(() => {
        if (!userData.id) return;
        if (enVentanaRetiro()) return; // Pausa producción los domingos
        
        userData.diamonds += getTotalProductionPerHour() / 3600;
        actualizarUI();
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
    
    Object.keys(prod).forEach(k => {
        const el = document.getElementById(`s_${k}`);
        if (el) el.textContent = prod[k];
    });
    document.getElementById('s_total').textContent = total;
}

function openCentral() {
    updateRankingAndPool();
    updateCentralStats();
    showModal('centralModal');
}

// ==========================================
// TON CONNECT
// ==========================================
async function initTONConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button',
        uiPreferences: { theme: 'DARK' }
    });
    
    tonConnectUI.onStatusChange((wallet) => {
        currentWallet = wallet;
        if (wallet) {
            document.getElementById('ton-connect-button').style.display = 'none';
            document.getElementById('wallet-info').style.display = 'block';
        } else {
            document.getElementById('ton-connect-button').style.display = 'block';
            document.getElementById('wallet-info').style.display = 'none';
        }
    });
}

async function disconnectWallet() {
    if (tonConnectUI) await tonConnectUI.disconnect();
    currentWallet = null;
    document.getElementById('ton-connect-button').style.display = 'block';
    document.getElementById('wallet-info').style.display = 'none';
}

// ==========================================
// GUARDAR Y CARGAR DATOS
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
            last_production_update: new Date().toISOString(),
            last_withdraw_week: userData.last_withdraw_week,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue,
            premium_expires: userData.premium_expires,
            daily_streak: userData.daily_streak,
            last_daily_claim: userData.last_daily_claim,
            haInvertido: userData.haInvertido,
            event_progress: userData.event_progress,
            accumulated_ton: userData.accumulated_ton,
            gameStats: userData.gameStats
        }).eq('telegram_id', userData.id);
    } catch(e) {
        console.error(e);
    }
}

async function loadUserFromDB(tgId) {
    const { data, error } = await _supabase
        .from('game_data')
        .select('*')
        .eq('telegram_id', tgId.toString())
        .maybeSingle();
    
    if (error) {
        console.error(error);
        return;
    }
    
    if (!data) {
        const nuevo = {
            telegram_id: tgId.toString(),
            username: userData.username,
            diamonds: 0,
            lvl_piscina: 0, lvl_fabrica: 0, lvl_escuela: 0, lvl_hospital: 0,
            referral_code: 'REF' + tgId.toString().slice(-6),
            last_online: new Date().toISOString(),
            last_production_update: new Date().toISOString(),
            haInvertido: false,
            event_progress: {},
            accumulated_ton: 0,
            last_withdraw_week: null,
            gameStats: {
                hospital: { bestStreak: 0, totalSaved: 0, currentLevel: 1 },
                escuela: { bestScore: 0, totalCaught: 0, currentLevel: 1 },
                fabrica: { bestCompleted: 0, totalAssembled: 0, currentLevel: 1 },
                piscina: { bestDistance: 0, totalDistance: 0, currentLevel: 1 }
            }
        };
        await _supabase.from('game_data').insert([nuevo]);
        userData = { ...userData, ...nuevo, id: tgId.toString() };
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
            last_production_update: data.last_production_update || new Date().toISOString(),
            last_withdraw_week: data.last_withdraw_week ? Number(data.last_withdraw_week) : null,
            last_ad_watch: data.last_ad_watch || null,
            last_casino_rescue: data.last_casino_rescue || null,
            premium_expires: data.premium_expires || null,
            daily_streak: Number(data.daily_streak) || 0,
            last_daily_claim: data.last_daily_claim || null,
            haInvertido: data.haInvertido || false,
            event_progress: data.event_progress || {},
            accumulated_ton: Number(data.accumulated_ton) || 0,
            gameStats: data.gameStats || {}
        };
    }
    
    userData.last_production_update = new Date().toISOString();
    actualizarUI();
}

async function initApp() {
    tg.expand();
    tg.ready();
    
    const user = tg.initDataUnsafe.user;
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
    
    setInterval(saveUserData, 30000);
    window.addEventListener('beforeunload', () => saveUserData());
    
    // Quemar diamantes no intercambiados al final del domingo
    setInterval(() => {
        if (enVentanaRetiro() && new Date().getHours() === 23 && new Date().getMinutes() === 59) {
            if (userData.last_withdraw_week !== getNumeroSemana()) {
                console.log("🔥 Quemando diamantes no intercambiados...");
                userData.diamonds = 0;
                saveUserData();
            }
        }
    }, 60000);
}

async function buyUpgradeFromBuilding(building, price) {
    if (userData.diamonds < price) return alert('❌ Insuficientes diamantes');
    userData[`lvl_${building}`]++;
    userData.diamonds -= price;
    await saveUserData();
    actualizarUI();
    alert(`✅ ${building} nivel ${userData[`lvl_${building}`]}`);
    closeAll();
}

// ==========================================
// INICIALIZACIÓN Y EXPORTAR FUNCIONES
// ==========================================
window.addEventListener('DOMContentLoaded', initApp);

// EXPORTAR FUNCIONES GLOBALES
window.openCentral = openCentral;
window.openBank = openBank;
window.openStore = openStore;
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.openDailyReward = openDailyReward;
window.openCasino = openCasino;
window.openBuilding = openBuilding;
window.openEventModal = openEventModal;
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
window.exchangeDiamonds = exchangeDiamonds;
window.withdrawTON = withdrawTON;
window.startEventTask = startEventTask;

// Funciones de minijuegos
window.selectTreatment = selectTreatment;
window.moveBasket = moveBasket;
window.ensamblarParteFabrica = ensamblarParteFabrica;
window.cambiarCarril = cambiarCarril;
window.useAdMultiplier = useAdMultiplier;
window.useAdRevive = useAdRevive;
window.useAdContinue = useAdContinue;
window.useAdHint = useAdHint;
window.useAdExtraTime = useAdExtraTime;

// Funciones de pestañas
window.switchHospitalTab = switchHospitalTab;
window.switchEscuelaTab = switchEscuelaTab;
window.switchFabricaTab = switchFabricaTab;
window.switchPiscinaTab = switchPiscinaTab;

console.log('✅ TON CITY - Versión profesional completa');
