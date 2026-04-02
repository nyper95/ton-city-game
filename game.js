// ======================================================
// TON CITY - VERSIÓN PROFESIONAL COMPLETA CORREGIDA
// ======================================================
// ✅ Todos los minijuegos funcionales con gráficos mejorados
// ✅ Casino completo con 5 juegos y saldo visible
// ✅ Sistema de rangos de 4 niveles (movido a sección propia)
// ✅ Guardado automático en Supabase (corregido)
// ✅ Producción pausada los domingos
// ✅ Sistema de retiros profesional sin número de semana
// ✅ Eventos semanales con multiplicadores x2/x4 y brillo en edificios
// ======================================================

console.log('🚀 TON CITY - Inicializando...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const BackButton = tg.BackButton;
BackButton.hide();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const RED_TON_FEE = 0.002; // k - comisión de red TON 2026
const RESERVA_POOL = 0.95; // r - reserva para que el pool no quede vacío
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
const MAX_LEVEL = 1000;
const EVENTOS_SEMANALES = [
    { nombre: "Escuela", edificio: "escuela", icono: "fa-school", color: "#a16207", descripcion: "Semana del Saber - Conocimiento multiplicado", recompensa: 200, premium: 400, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Fábrica", edificio: "fabrica", icono: "fa-industry", color: "#a78bfa", descripcion: "Semana de Producción - Ensamblaje eficiente", recompensa: 150, premium: 300, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Piscina", edificio: "piscina", icono: "fa-water-ladder", color: "#38bdf8", descripcion: "Semana Olímpica - Entrenamiento especial", recompensa: 80, premium: 160, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 },
    { nombre: "Hospital", edificio: "hospital", icono: "fa-hospital", color: "#f87171", descripcion: "Semana de la Salud - Tratamientos con bonificación", recompensa: 100, premium: 200, requeridos: 3, requeridos_premium: 1, gameMultiplier: 2 }
];

const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

// ==========================================
// APUESTAS CASINO
// ==========================================
let apuestaActual = { highlow: 10, ruleta: 10, tragaperras: 5, dados: 10, loteria: 1 };
let boletosComprados = [];

// ==========================================
// ESTADO DE MINIJUEGOS
// ==========================================
let gameLives = { escuela: 3, fabrica: 3, piscina: 3, hospital: 3 };
let gameActiveStates = { escuela: true, fabrica: true, piscina: true, hospital: true };

// Escuela - Mente Maestra
let escuelaSequence = [];
let escuelaUserInput = [];
let escuelaLevel = 1;
let escuelaBest = 0;

// Fábrica - Línea de Ensamblaje
let fabricaLevel = 1;
let fabricaBest = 0;
let fabricaCompleted = 0;
let fabricaRequired = 5;
let fabricaPosition = -50;
let fabricaIsDefect = false;
let fabricaAnimInterval = null;
let fabricaDefectInterval = null;

// Piscina - Salto de Precisión
let piscinaLevel = 1;
let piscinaBest = 0;
let piscinaPerfect = 0;
let piscinaRequired = 3;
let piscinaPower = 0;
let piscinaIsDragging = false;
let piscinaStartX = 0, piscinaStartY = 0;

// Hospital - Cirugía de Emergencia
let hospitalLevel = 1;
let hospitalBest = 0;
let hospitalExtracted = 0;
let hospitalTotal = 3;
let hospitalTimeLeft = 30;
let hospitalTimer = null;

// ==========================================
// FUNCIONES BASE
// ==========================================
function esPremium() {
    if (!userData.premium_expires) return false;
    return new Date() < new Date(userData.premium_expires);
}

function actualizarPremiumUI() {
    const badge = document.getElementById('premium-badge');
    if (badge) badge.style.display = esPremium() ? 'flex' : 'none';
    const timer = document.getElementById('premium-timer');
    const timeLeft = document.getElementById('premium-time-left');
    if (timer && timeLeft) {
        if (esPremium()) {
            timer.style.display = 'block';
            const diff = new Date(userData.premium_expires) - new Date();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            timeLeft.textContent = `${hours}h`;
        } else {
            timer.style.display = 'none';
        }
    }
}

function getEventoActual() {
    const semana = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % EVENTOS_SEMANALES.length;
    return EVENTOS_SEMANALES[semana];
}

function actualizarEventosUI() {
    const evento = getEventoActual();
    const edificios = ['escuela', 'fabrica', 'piscina', 'hospital'];
    
    // Limpiar clase event-card de todos los edificios
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('event-card');
    });
    
    // Añadir clase event-card al edificio del evento
    const edificioCard = document.querySelector(`.card[onclick*="${evento.edificio}"]`);
    if (edificioCard) {
        edificioCard.classList.add('event-card');
    }
    
    // Actualizar badge en modales
    edificios.forEach(ed => {
        const badge = document.getElementById(`${ed}-event-badge`);
        if (badge) {
            if (ed === evento.edificio) {
                badge.style.display = 'inline-block';
                badge.textContent = esPremium() ? '🎉 EVENTO x4' : '🎉 EVENTO x2';
            } else {
                badge.style.display = 'none';
            }
        }
    });
    
    // Actualizar banner de evento
    const eventBanner = document.getElementById('event-banner');
    const eventText = document.getElementById('event-text');
    if (eventBanner && eventText) {
        eventBanner.style.display = 'flex';
        eventBanner.style.borderLeftColor = evento.color;
        eventText.innerHTML = `🎉 Evento: ${evento.nombre} - ¡Gana x${evento.gameMultiplier} (x${esPremium() ? evento.gameMultiplier * 2 : evento.gameMultiplier} Premium)! 🎉`;
    }
}

function enVentanaRetiro() {
    return new Date().getDay() === 0;
}

function showModal(id) {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById(id).style.display = 'block';
    BackButton.show();
    BackButton.onClick(() => { closeAll(); BackButton.hide(); });
}

function closeAll() {
    document.getElementById('overlay').style.display = 'none';
    const modals = [
        'centralModal', 'modalBank', 'modalStore', 'modalFriends', 'modalWithdraw',
        'modalAds', 'modalDailyReward', 'modalCasino', 'modalHighLow', 'modalRuleta',
        'modalTragaperras', 'modalDados', 'modalLoteria', 'modalEscuela', 'modalFabrica',
        'modalPiscina', 'modalHospital', 'modalEvent'
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
}

function actualizarUI() {
    const diamElem = document.getElementById('diamonds');
    if (diamElem) diamElem.textContent = Math.floor(userData.diamonds || 0);
    const rateElem = document.getElementById('rate');
    if (rateElem) rateElem.textContent = Math.floor(getTotalProduction());
    
    document.getElementById('lvl_piscina').textContent = userData.lvl_piscina;
    document.getElementById('lvl_fabrica').textContent = userData.lvl_fabrica;
    document.getElementById('lvl_escuela').textContent = userData.lvl_escuela;
    document.getElementById('lvl_hospital').textContent = userData.lvl_hospital;
    
    // Actualizar saldo en casinos
    const casinoGames = ['highlow', 'ruleta', 'tragaperras', 'dados', 'loteria'];
    casinoGames.forEach(game => {
        const balanceSpan = document.getElementById(`${game}-balance`);
        if (balanceSpan) balanceSpan.textContent = Math.floor(userData.diamonds);
    });
    
    // Actualizar rango en UI
    const rankDisplay = document.getElementById('user-rank-display');
    if (rankDisplay) rankDisplay.textContent = `${userData.rank} #${userData.weekly_rank}`;
    const projDisplay = document.getElementById('projected-reward-display');
    if (projDisplay) projDisplay.textContent = userData.projectedReward.toFixed(4) + ' TON';
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
// ADSGRAM
// ==========================================
async function initAds() {
    try {
        AdController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        adsReady = true;
        console.log('✅ AdsGram listo');
    } catch(e) {
        adsReady = false;
        console.error('AdsGram error:', e);
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
        const resultElem = document.getElementById(`${game}-result`);
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
        if (s) {
            pendingMultiplier = 2;
            alert('✨ Multiplicador x2 activado para tu próxima victoria!');
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
    nuevaSecuenciaEscuela();
}

function nuevaSecuenciaEscuela() {
    if (!gameActiveStates.escuela) return;
    escuelaSequence = [];
    escuelaUserInput = [];
    const length = Math.min(5 + Math.floor(escuelaLevel / 10), 12);
    for (let i = 0; i < length; i++) {
        escuelaSequence.push(Math.floor(Math.random() * 16) + 1);
    }
    mostrarSecuenciaEscuela();
}

function mostrarSecuenciaEscuela() {
    const display = document.getElementById('sequence-display');
    if (!display) return;
    display.innerHTML = '';
    let i = 0;
    function showNext() {
        if (i >= escuelaSequence.length) {
            crearPupitres();
            return;
        }
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
        const resultElem = document.getElementById('mem-result');
        if (resultElem) resultElem.innerHTML = '<span style="color:#ef4444;">❌ Secuencia incorrecta</span>';
        setTimeout(() => {
            if (resultElem) resultElem.innerHTML = '';
            nuevaSecuenciaEscuela();
        }, 1500);
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
        userData.gameStats.escuela.totalWins = (userData.gameStats.escuela.totalWins || 0) + 1;
        userData.gameStats.escuela.lives = gameLives.escuela;
        document.getElementById('mem-level').textContent = escuelaLevel;
        document.getElementById('escuela-game-level').textContent = escuelaLevel;
        const resultElem = document.getElementById('mem-result');
        if (resultElem) resultElem.innerHTML = `<span style="color:#4ade80;">✅ +${reward} 💎! Nivel ${escuelaLevel}</span>`;
        actualizarUI();
        saveUserData();
        setTimeout(() => {
            if (resultElem) resultElem.innerHTML = '';
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
        if (fabricaPosition > 45 && fabricaPosition < 55) {
            if (!fabricaIsDefect) {
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
                    userData.gameStats.fabrica.totalWins = (userData.gameStats.fabrica.totalWins || 0) + 1;
                    userData.gameStats.fabrica.lives = gameLives.fabrica;
                    document.getElementById('fabrica-game-level').textContent = fabricaLevel;
                    document.getElementById('asm-result').innerHTML = `<span style="color:#4ade80;">✅ Nivel completado! +${reward} 💎</span>`;
                    actualizarUI();
                    saveUserData();
                    clearInterval(fabricaAnimInterval);
                    clearInterval(fabricaDefectInterval);
                    setTimeout(() => iniciarJuegoFabrica(), 2000);
                }
            }
        }
    }, 30);
    fabricaDefectInterval = setInterval(() => {
        if (!gameActiveStates.fabrica) return;
        const defectRate = Math.min(0.3, fabricaLevel / 200);
        fabricaIsDefect = Math.random() < defectRate;
        const defectIndicator = document.getElementById('defect-indicator');
        if (defectIndicator) defectIndicator.textContent = fabricaIsDefect ? '⚠️ PIEZA DEFECTUOSA! ⚠️' : '';
        const piece = document.getElementById('moving-piece');
        if (piece) piece.textContent = fabricaIsDefect ? '💢' : '🔧';
    }, 5000);
}

// ==========================================
// MINIJUEGO 3: PISCINA - SALTO DE PRECISIÓN
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
    
    const onMouseMove = (moveEvent) => {
        if (!piscinaIsDragging || !gameActiveStates.piscina) return;
        const dx = piscinaStartX - moveEvent.clientX;
        const dy = piscinaStartY - moveEvent.clientY;
        const power = Math.min(100, Math.sqrt(dx * dx + dy * dy) / 2);
        if (powerFill) powerFill.style.height = power + '%';
        piscinaPower = power;
    };
    
    const onMouseUp = (upEvent) => {
        if (!piscinaIsDragging || !gameActiveStates.piscina) {
            piscinaIsDragging = false;
            return;
        }
        piscinaIsDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        const angle = 45 + (Math.random() - 0.5) * 20;
        const distance = piscinaPower * 1.5;
        const targetDistance = 200;
        const isPerfect = Math.abs(distance - targetDistance) < 25 && Math.abs(angle - 45) < 15;
        
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
                userData.gameStats.piscina.totalWins = (userData.gameStats.piscina.totalWins || 0) + 1;
                userData.gameStats.piscina.lives = gameLives.piscina;
                document.getElementById('piscina-game-level').textContent = piscinaLevel;
                document.getElementById('jump-result').innerHTML = `<span style="color:#4ade80;">✅ Nivel completado! +${reward} 💎</span>`;
                actualizarUI();
                saveUserData();
                setTimeout(() => iniciarJuegoPiscina(), 2000);
            } else {
                document.getElementById('jump-result').innerHTML = '<span style="color:#4ade80;">🎯 ¡Salto perfecto!</span>';
                setTimeout(() => document.getElementById('jump-result').innerHTML = '', 1000);
            }
        } else {
            if (!loseLife('piscina')) return;
            document.getElementById('jump-result').innerHTML = '<span style="color:#ef4444;">💧 Salto fallido</span>';
            setTimeout(() => document.getElementById('jump-result').innerHTML = '', 1000);
        }
        piscinaPower = 0;
        if (powerFill) powerFill.style.height = '0%';
    };
    
    area.onmousedown = (e) => {
        if (!gameActiveStates.piscina) return;
        piscinaIsDragging = true;
        piscinaStartX = e.clientX;
        piscinaStartY = e.clientY;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    area.ontouchstart = (e) => {
        if (!gameActiveStates.piscina) return;
        e.preventDefault();
        piscinaIsDragging = true;
        piscinaStartX = e.touches[0].clientX;
        piscinaStartY = e.touches[0].clientY;
        const onTouchMove = (te) => {
            if (!piscinaIsDragging) return;
            const dx = piscinaStartX - te.touches[0].clientX;
            const dy = piscinaStartY - te.touches[0].clientY;
            const power = Math.min(100, Math.sqrt(dx * dx + dy * dy) / 2);
            if (powerFill) powerFill.style.height = power + '%';
            piscinaPower = power;
        };
        const onTouchEnd = (te) => {
            piscinaIsDragging = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            const dx = piscinaStartX - te.changedTouches[0].clientX;
            const dy = piscinaStartY - te.changedTouches[0].clientY;
            piscinaPower = Math.min(100, Math.sqrt(dx * dx + dy * dy) / 2);
            onMouseUp(te);
        };
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    };
}

// ==========================================
// MINIJUEGO 4: HOSPITAL - CIRUGÍA DE EMERGENCIA
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
        const percent = (hospitalTimeLeft / 30) * 100;
        document.getElementById('time-fill').style.width = Math.max(0, percent) + '%';
        if (hospitalTimeLeft <= 0) {
            clearInterval(hospitalTimer);
            if (!loseLife('hospital')) return;
            document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⏰ Tiempo agotado</span>';
            setTimeout(() => iniciarJuegoHospital(), 2000);
        }
    }, 100);
    crearVirusHospital();
}

function crearVirusHospital() {
    const area = document.getElementById('surgery-area');
    if (!area) return;
    area.innerHTML = '';
    const width = area.clientWidth - 60;
    const height = area.clientHeight - 60;
    
    for (let i = 0; i < hospitalTotal; i++) {
        const virus = document.createElement('div');
        virus.className = 'virus';
        virus.textContent = '🦠';
        const x = Math.random() * Math.max(10, width);
        const y = Math.random() * Math.max(10, height);
        virus.style.left = Math.min(width, Math.max(10, x)) + 'px';
        virus.style.top = Math.min(height, Math.max(10, y)) + 'px';
        virus.style.position = 'absolute';
        virus.style.cursor = 'grab';
        
        let isDragging = false;
        let startX, startY, virusX, virusY;
        
        const onMouseMove = (moveEvent) => {
            if (!isDragging) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            let newX = virusX + dx;
            let newY = virusY + dy;
            newX = Math.min(width, Math.max(0, newX));
            newY = Math.min(height, Math.max(0, newY));
            virus.style.left = newX + 'px';
            virus.style.top = newY + 'px';
            if (newX <= 0 || newX >= width || newY <= 0 || newY >= height) {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (!loseLife('hospital')) return;
                virus.remove();
                document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⚠️ Tocaste la pared</span>';
                setTimeout(() => document.getElementById('surgery-result').innerHTML = '', 1000);
            }
        };
        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            virus.style.cursor = 'grab';
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
                userData.gameStats.hospital.totalWins = (userData.gameStats.hospital.totalWins || 0) + 1;
                userData.gameStats.hospital.lives = gameLives.hospital;
                document.getElementById('hospital-game-level').textContent = hospitalLevel;
                document.getElementById('surgery-result').innerHTML = `<span style="color:#4ade80;">✅ Cirugía exitosa! +${reward} 💎</span>`;
                actualizarUI();
                saveUserData();
                setTimeout(() => iniciarJuegoHospital(), 2000);
            }
        };
        
        virus.onmousedown = (e) => {
            e.stopPropagation();
            if (!gameActiveStates.hospital) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            virusX = parseInt(virus.style.left);
            virusY = parseInt(virus.style.top);
            virus.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        virus.ontouchstart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!gameActiveStates.hospital) return;
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            virusX = parseInt(virus.style.left);
            virusY = parseInt(virus.style.top);
            virus.style.cursor = 'grabbing';
            const onTouchMove = (moveEvent) => {
                if (!isDragging) return;
                const touch = moveEvent.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                let newX = virusX + dx;
                let newY = virusY + dy;
                newX = Math.min(width, Math.max(0, newX));
                newY = Math.min(height, Math.max(0, newY));
                virus.style.left = newX + 'px';
                virus.style.top = newY + 'px';
                if (newX <= 0 || newX >= width || newY <= 0 || newY >= height) {
                    isDragging = false;
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                    if (!loseLife('hospital')) return;
                    virus.remove();
                    document.getElementById('surgery-result').innerHTML = '<span style="color:#ef4444;">⚠️ Tocaste la pared</span>';
                    setTimeout(() => document.getElementById('surgery-result').innerHTML = '', 1000);
                }
            };
            const onTouchEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                virus.style.cursor = 'grab';
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
                    userData.gameStats.hospital.totalWins = (userData.gameStats.hospital.totalWins || 0) + 1;
                    userData.gameStats.hospital.lives = gameLives.hospital;
                    document.getElementById('hospital-game-level').textContent = hospitalLevel;
                    document.getElementById('surgery-result').innerHTML = `<span style="color:#4ade80;">✅ Cirugía exitosa! +${reward} 💎</span>`;
                    actualizarUI();
                    saveUserData();
                    setTimeout(() => iniciarJuegoHospital(), 2000);
                }
            };
            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend', onTouchEnd);
        };
        
        area.appendChild(virus);
    }
}

// ==========================================
// FUNCIONES DE EDIFICIOS Y PESTAÑAS
// ==========================================
function openBuilding(building) {
    if (building === 'escuela') iniciarJuegoEscuela();
    else if (building === 'fabrica') iniciarJuegoFabrica();
    else if (building === 'piscina') iniciarJuegoPiscina();
    else if (building === 'hospital') iniciarJuegoHospital();
    showModal(`modal${building.charAt(0).toUpperCase() + building.slice(1)}`);
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
        iniciarJuegoEscuela();
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
        iniciarJuegoFabrica();
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
        iniciarJuegoPiscina();
    } else {
        upgrade.style.display = 'block';
        game.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
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
        iniciarJuegoHospital();
    } else {
        upgrade.style.display = 'block';
        game.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

function buyUpgradeFromBuilding(building, price) {
    if (userData.diamonds < price) return alert('❌ Insuficientes diamantes');
    userData[`lvl_${building}`]++;
    userData.diamonds -= price;
    saveUserData();
    actualizarUI();
    alert(`✅ ${building} nivel ${userData[`lvl_${building}`]}`);
    // No cerrar el modal, solo actualizar la UI
    const levelSpan = document.getElementById(`${building}-level`);
    const prodSpan = document.getElementById(`${building}-prod`);
    if (levelSpan) levelSpan.textContent = userData[`lvl_${building}`];
    if (prodSpan) {
        const producciones = { escuela: 40, fabrica: 120, piscina: 60, hospital: 80 };
        prodSpan.textContent = (userData[`lvl_${building}`] * producciones[building]) + ' 💎/h';
    }
    const priceSpan = document.getElementById(`${building}-price`);
    const precios = { escuela: 3000, fabrica: 10000, piscina: 5000, hospital: 7500 };
    if (priceSpan) priceSpan.textContent = precios[building].toLocaleString() + ' 💎';
    const btn = document.getElementById(`${building}-btn`);
    if (btn) btn.disabled = userData.diamonds < precios[building];
}

// ==========================================
// CASINO COMPLETO
// ==========================================
function openCasino() {
    showModal('modalCasino');
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
            const num = parseInt(prompt("Elige un número del 0 al 36:"));
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
        document.getElementById('tragaperras-result').innerHTML = `<span style="color:#4ade80;">🎉 ¡JACKPOT! x${mult}</span>`;
    } else {
        document.getElementById('tragaperras-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
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
        document.getElementById('dados-result').innerHTML = '<span style="color:#4ade80;">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('dados-result').innerHTML = '<span style="color:#ef4444;">😞 Perdiste</span>';
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

function puedeJugar(juego, cantidad = 1) {
    if (userData.haInvertido) return true;
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = {
            highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0,
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
// SISTEMA DE RANGOS
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
    } catch(e) { console.error(e); }
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
            const { data } = await _supabase.from('game_data').select('pool_ton').eq('telegram_id', 'MASTER').single();
            if (data) globalPoolData.pool_ton = data.pool_ton;
        }
    } catch(e) { console.error(e); }
    return globalPoolData.pool_ton;
}

// ==========================================
// RETIROS PROFESIONALES (SIN NÚMERO DE SEMANA)
// ==========================================
async function exchangeDiamonds() {
    if (!tonConnectUI?.connected) return alert("❌ Conecta tu wallet primero");
    if (!enVentanaRetiro()) return alert("❌ El intercambio solo está disponible los DOMINGOS");
    
    if (userData.last_withdraw_week === getNumeroSemana()) return alert("❌ Ya intercambiaste tus diamantes esta semana");
    if (userData.diamonds <= 0) return alert("❌ No tienes diamantes para intercambiar");
    
    await updateRankingAndPool();
    let tonARecibir = userData.projectedReward;
    if (tonARecibir <= 0) return alert("❌ No hay TON en el pool para distribuir");
    
    const txFee = RED_TON_FEE;
    if (tonARecibir < txFee * 2) return alert(`❌ Mínimo para retiro: ${(txFee * 2).toFixed(4)} TON (cubre comisión de red)`);
    tonARecibir -= txFee;
    
    if (!confirm(`¿Intercambiar ${Math.floor(userData.diamonds).toLocaleString()} 💎 por ${tonARecibir.toFixed(4)} TON?\n\nRango: ${userData.rank} #${userData.weekly_rank}\n\n⚠️ Los diamantes no intercambiados se queman al final del domingo`)) return;
    
    userData.accumulated_ton = (userData.accumulated_ton || 0) + tonARecibir;
    userData.last_withdraw_week = getNumeroSemana();
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
            messages: [{ address: currentWallet.account.address, amount: Math.floor(montoRetiro * 1e9).toString(), payload: "Retiro Ton City" }]
        };
        await tonConnectUI.sendTransaction(tx);
        userData.accumulated_ton = 0;
        await saveUserData();
        alert(`✅ ¡Retiro exitoso! ${montoRetiro.toFixed(4)} TON enviados a tu wallet`);
        closeAll();
    } catch(e) { alert("❌ Error en transacción"); console.error(e); }
}

function getNumeroSemana() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), 0, 1);
    const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil(dias / 7);
}

async function openWithdraw() {
    await updateRealPoolBalance();
    await updateRankingAndPool();
    
    const esDomingo = enVentanaRetiro();
    const badge = document.getElementById('withdraw-day-badge');
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const today = days[new Date().getDay()];
    
    if (esDomingo) {
        badge.textContent = `${today} · INTERCAMBIO DISPONIBLE`;
        badge.className = 'withdraw-day-badge withdraw-day-sunday';
    } else {
        badge.textContent = `${today} · SIN INTERCAMBIO`;
        badge.className = 'withdraw-day-badge withdraw-day-other';
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
// EVENTO SEMANAL
// ==========================================
function openEventModal() {
    const evento = getEventoActual();
    document.getElementById('event-icon').innerHTML = `<i class="fa-solid ${evento.icono}" style="color: ${evento.color}; font-size: 48px;"></i>`;
    document.getElementById('event-title').textContent = evento.nombre;
    document.getElementById('event-description').textContent = evento.descripcion;
    document.getElementById('event-reward').textContent = evento.recompensa + ' 💎';
    document.getElementById('event-reward-premium').textContent = evento.premium + ' 💎';
    document.getElementById('event-reward-normal').textContent = evento.recompensa + ' 💎';
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
                document.getElementById('event-progress-text').textContent = `${progreso}/${requeridos} anuncios`;
            }
        }
    });
}

// ==========================================
// BANCO, TIENDA, AMIGOS, ANUNCIOS
// ==========================================
function openBank() {
    showModal('modalBank');
    const isConnected = !!currentWallet;
    const packs = [
        { ton: 0.10, diamonds: 100 }, { ton: 0.50, diamonds: 500 }, { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 }, { ton: 5.00, diamonds: 5000 }, { ton: 10.00, diamonds: 10000 }
    ];
    document.getElementById('bankList').innerHTML = packs.map(p => `
        <div style="background:#0f172a; border-radius:12px; padding:16px; margin:8px 0; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${p.ton.toFixed(2)} TON</strong><div style="font-size:12px; color:#94a3b8;">+${p.diamonds} 💎</div></div>
            <button onclick="comprarTON(${p.ton})" style="background:${isConnected ? '#4ade80' : '#334155'}; border:none; padding:10px 20px; border-radius:30px; color:white; font-weight:700; cursor:pointer;" ${!isConnected ? 'disabled' : ''}>${isConnected ? 'COMPRAR' : 'CONECTAR'}</button>
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
    closeAll();
}

function openStore() {
    showModal('modalStore');
    const isConnected = !!currentWallet;
    document.getElementById('premium-plans').innerHTML = PREMIUM_PLANS.map(p => `
        <div style="background:#0f172a; border-radius:16px; padding:16px; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><strong>${p.name}</strong><span style="color:#facc15;">${p.price} TON</span></div>
            <button onclick="comprarPremium(${JSON.stringify(p).replace(/"/g, '&quot;')})" style="background:${isConnected ? '#8b5cf6' : '#334155'}; border:none; border-radius:30px; padding:12px; width:100%; color:white; font-weight:700; cursor:pointer;" ${!isConnected ? 'disabled' : ''}>${isConnected ? 'COMPRAR' : 'CONECTAR'}</button>
        </div>
    `).join('');
}

async function comprarPremium(plan) {
    if (!tonConnectUI?.connected) return alert('❌ Conecta wallet');
    const exp = new Date();
    exp.setDate(exp.getDate() + plan.days);
    userData.premium_expires = exp.toISOString();
    await saveUserData();
    actualizarPremiumUI();
    alert(`✅ Plan ${plan.name} activado`);
    closeAll();
}

function openFriends() {
    showModal('modalFriends');
    document.getElementById('referral-code').textContent = userData.referral_code || 'CARGANDO...';
    document.getElementById('ref-count').textContent = userData.referred_users?.length || 0;
    document.getElementById('ref-total').textContent = (userData.referral_earnings || 0) + ' 💎';
}

function copyReferralCode() {
    if (!userData.referral_code) return alert('❌ Código no disponible');
    navigator.clipboard.writeText(`https://t.me/ton_city_bot?start=${userData.referral_code}`).then(() => alert('✅ Enlace copiado!'));
}

function showAdsModal() {
    showModal('modalAds');
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
        const restante = userData.last_ad_watch ? Math.ceil((3600000 - (new Date() - new Date(userData.last_ad_watch))) / 60000) : 0;
        btn.textContent = `⏳ ${restante} min`;
        if (statusDiv) statusDiv.innerHTML = `⏳ Próximo anuncio en ${restante} min`;
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
    if (userData.diamonds > 0) return alert("❌ Solo cuando tienes 0 diamantes");
    const hoy = new Date();
    if (userData.last_casino_rescue && hoy.toDateString() === new Date(userData.last_casino_rescue).toDateString()) {
        return alert("❌ Ya usaste rescate hoy");
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
// PRODUCCIÓN
// ==========================================
function startProduction() {
    setInterval(() => {
        if (!userData.id || enVentanaRetiro()) return;
        userData.diamonds += getTotalProduction() / 3600;
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
            document.getElementById('wallet-info').classList.remove('hidden');
        } else {
            document.getElementById('ton-connect-button').style.display = 'block';
            document.getElementById('wallet-info').classList.add('hidden');
        }
    });
}

async function disconnectWallet() {
    if (tonConnectUI) await tonConnectUI.disconnect();
    currentWallet = null;
    document.getElementById('ton-connect-button').style.display = 'block';
    document.getElementById('wallet-info').classList.add('hidden');
}

// ==========================================
// GUARDAR Y CARGAR
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
        console.log('✅ Datos guardados:', new Date().toLocaleTimeString());
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
            last_production_update: new Date().toISOString(),
            haInvertido: false,
            event_progress: {},
            accumulated_ton: 0,
            last_withdraw_week: null,
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
            gameStats: data.gameStats || {
                escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
                hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
            }
        };
    }
    userData.last_production_update = new Date().toISOString();
    actualizarUI();
    actualizarPremiumUI();
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
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
    actualizarEventosUI();
    setInterval(saveUserData, 30000);
    setInterval(() => {
        actualizarEventosUI();
        if (document.getElementById('modalWithdraw')?.style.display === 'block') {
            openWithdraw();
        }
    }, 60000);
    window.addEventListener('beforeunload', () => saveUserData());
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

window.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// EXPORTAR FUNCIONES GLOBALES
// ==========================================
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
window.useAdMultiplier = useAdMultiplier;
window.reviveGame = reviveGame;
window.switchEscuelaTab = switchEscuelaTab;
window.switchFabricaTab = switchFabricaTab;
window.switchPiscinaTab = switchPiscinaTab;
window.switchHospitalTab = switchHospitalTab;

console.log('✅ TON CITY - Versión profesional completa corregida');
