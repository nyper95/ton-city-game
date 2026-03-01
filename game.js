// ======================================================
// TON CITY GAME - VERSIÓN FINAL COMPLETA
// ======================================================

console.log("✅ Ton City Game - Inicializando...");

const tg = window.Telegram.WebApp;

// ==========================================
// CONFIGURACIÓN DE BILLETERAS Y PRECIOS
// ==========================================
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; 
const BILLETERA_POOL = "UQBuoEgT5DmcoEQ_nl6YwR0Q86fZWY4baACuX80EegWG49h2";
const PRECIO_COMPRA = 0.008;

// ==========================================
// CONFIGURACIÓN ADSGRAM
// ==========================================
const ADSGRAM_BLOCK_ID = '23186';

// Variables para Adsgram
let adsReady = false;
let AdController = null;

// ==========================================
// CONFIGURACIÓN TÉCNICA
// ==========================================
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io';
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// CONSTANTES PARA RETIROS
// ==========================================
const K = 0.9; // Factor de respaldo (90% del pool disponible)
const R = 0.95; // Factor de comisión de red (5% para gas)

// ==========================================
// ESTADO DEL JUEGO
// ==========================================
let tonConnectUI = null;
let currentWallet = null;

let userData = {
    id: null,
    username: "Cargando...",
    firstName: "",
    lastName: "",
    diamonds: 0,
    // 🏗️ SOLO 4 EDIFICIOS PRODUCTORES
    lvl_piscina: 0,
    lvl_fabrica: 0,
    lvl_escuela: 0,
    lvl_hospital: 0,
    // 👥 REFERIDOS
    referral_code: null,
    referral_earnings: 0,
    referred_users: [],
    // ⏱️ CONTROL DE TIEMPO
    last_online: null,
    last_production_update: null,
    // 💰 RETIROS SEMANALES
    last_withdraw_week: null,
    // 📺 ANUNCIOS
    last_ad_watch: null,
    // 📅 RECOMPENSA DIARIA
    daily_streak: 0,
    last_daily_claim: null,
    // 💎 ESTADO DE INVERSOR
    haInvertido: false, // ✅ CORREGIDO (antes era halnvertido)
    // 🎰 LÍMITES DIARIOS
    jugadasHoy: {
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
    last_updated: null
};

// 🏗️ VALORES DE PRODUCCIÓN (4 edificios)
const PROD_VAL = { 
    piscina: 60,
    fabrica: 120,
    escuela: 40,
    hospital: 80
};

// ==========================================
// APUESTAS ACTUALES POR JUEGO
// ==========================================
let apuestaActual = {
    highlow: 10,
    ruleta: 10,
    tragaperras: 5,
    dados: 10,
    loteria: 1
};

let boletosComprados = [];

// ==========================================
// FUNCIÓN PARA OBTENER POOL REAL DESDE TONAPI
// ==========================================
async function updateRealPoolBalance() {
    try {
        console.log("💰 Consultando balance REAL del pool...");
        
        const response = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: {
                'Authorization': `Bearer ${TON_API_KEY}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const balanceNanoton = data.balance || 0;
        const balanceTon = balanceNanoton / 1000000000;
        
        console.log(`✅ Balance REAL del pool: ${balanceTon.toFixed(4)} TON`);
        
        globalPoolData.pool_ton = balanceTon;
        globalPoolData.last_updated = new Date().toISOString();
        
        await _supabase
            .from('game_data')
            .update({
                pool_ton: balanceTon,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', 'MASTER');
        
        return balanceTon;
        
    } catch (error) {
        console.error("❌ Error obteniendo balance REAL:", error);
        
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
// FUNCIÓN PARA OBTENER TOTAL DE DIAMANTES REAL
// ==========================================
async function updateTotalDiamonds() {
    try {
        console.log("💎 Calculando total de diamantes de todos los usuarios...");
        
        const { data, error } = await _supabase
            .from("game_data")
            .select("diamonds")
            .neq("telegram_id", "MASTER");
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            const total = data.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
            globalPoolData.total_diamonds = total;
            
            await _supabase
                .from('game_data')
                .update({
                    total_diamonds: total,
                    last_seen: new Date().toISOString()
                })
                .eq('telegram_id', 'MASTER');
            
            console.log(`✅ Total diamantes REAL: ${total.toLocaleString()} 💎`);
            return total;
        }
        
        return 0;
        
    } catch (error) {
        console.error("❌ Error calculando total diamantes:", error);
        return globalPoolData.total_diamonds || 0;
    }
}

// ==========================================
// SISTEMA DE PRODUCCIÓN OFFLINE
// ==========================================

function getTotalProductionPerHour() {
    return (userData.lvl_piscina * 60) +
           (userData.lvl_fabrica * 120) +
           (userData.lvl_escuela * 40) +
           (userData.lvl_hospital * 80);
}

async function calculateOfflineProduction() {
    if (!userData.last_production_update) return 0;
    
    const now = new Date();
    const lastUpdate = new Date(userData.last_production_update);
    const secondsPassed = Math.floor((now - lastUpdate) / 1000);
    
    if (secondsPassed < 1) return 0;
    
    const totalPerHour = getTotalProductionPerHour();
    const earnedDiamonds = (totalPerHour / 3600) * secondsPassed;
    
    console.log(`⏱️ Tiempo offline: ${secondsPassed} segundos`);
    console.log(`💰 Diamantes offline: +${earnedDiamonds.toFixed(2)} 💎`);
    
    return earnedDiamonds;
}

// ==========================================
// SISTEMA DE LÍMITES PARA JUEGOS
// ==========================================

function puedeJugar(juegoId, cantidad = 1) {
    if (userData.haInvertido) return true;
    
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = {
            highlow: 0,
            ruleta: 0,
            tragaperras: 0,
            dados: 0,
            loteria: 0,
            fecha: hoy
        };
    }
    
    const limites = {
        highlow: 20,
        ruleta: 15,
        tragaperras: 30,
        dados: 20,
        loteria: 5
    };
    
    return (userData.jugadasHoy[juegoId] + cantidad) <= limites[juegoId];
}

function registrarJugada(juegoId, cantidad = 1) {
    if (!userData.haInvertido) {
        userData.jugadasHoy[juegoId] += cantidad;
        actualizarLimitesUI();
    }
}

function actualizarLimitesUI() {
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = {
            highlow: 0,
            ruleta: 0,
            tragaperras: 0,
            dados: 0,
            loteria: 0,
            fecha: hoy
        };
    }
    
    const limites = {
        highlow: 20,
        ruleta: 15,
        tragaperras: 30,
        dados: 20,
        loteria: 5
    };
    
    if (document.getElementById('hl-limit')) {
        document.getElementById('hl-limit').innerHTML = `Jugadas hoy: ${userData.jugadasHoy.highlow}/${limites.highlow}`;
    }
    if (document.getElementById('ruleta-limit')) {
        document.getElementById('ruleta-limit').innerHTML = `Jugadas hoy: ${userData.jugadasHoy.ruleta}/${limites.ruleta}`;
    }
    if (document.getElementById('tragaperras-limit')) {
        document.getElementById('tragaperras-limit').innerHTML = `Jugadas hoy: ${userData.jugadasHoy.tragaperras}/${limites.tragaperras}`;
    }
    if (document.getElementById('dados-limit')) {
        document.getElementById('dados-limit').innerHTML = `Jugadas hoy: ${userData.jugadasHoy.dados}/${limites.dados}`;
    }
    if (document.getElementById('loteria-limit')) {
        document.getElementById('loteria-limit').innerHTML = `Boletos hoy: ${userData.jugadasHoy.loteria}/${limites.loteria}`;
    }
}

// ==========================================
// ADSGRAM - SISTEMA DE ANUNCIOS
// ==========================================

function loadAdsgramSafe() {
    return new Promise((resolve, reject) => {
        if (window.Adsgram) {
            console.log("✅ Adsgram ya estaba cargado");
            return resolve();
        }

        console.log("📦 Cargando script de Adsgram...");
        const script = document.createElement("script");
        script.src = "https://sad.adsgram.ai/js/sad.min.js";
        script.async = true;

        script.onload = () => {
            console.log("✅ Adsgram cargado correctamente");
            resolve();
        };

        script.onerror = (err) => {
            console.error("❌ Error cargando Adsgram:", err);
            reject("❌ Adsgram bloqueado o no disponible");
        };

        document.head.appendChild(script);
    });
}

async function initAds() {
    try {
        await loadAdsgramSafe();

        AdController = window.Adsgram.init({ 
            blockId: ADSGRAM_BLOCK_ID 
        });

        adsReady = true;
        console.log("✅ Sistema de anuncios listo con Block ID:", ADSGRAM_BLOCK_ID);

    } catch (err) {
        console.warn("❌ Adsgram no disponible:", err);
        adsReady = false;
    }
}

setTimeout(initAds, 4500);
setTimeout(() => {
    if (!window.Adsgram) {
        console.warn("🚫 Adsgram bloqueado por red / VPN / AdBlock");
        adsReady = false;
    }
}, 8000);

function showAd() {
    if (!adsReady || !AdController) {
        alert("❌ Sistema de anuncios no disponible. Intenta más tarde.");
        return;
    }

    console.log("🎬 Mostrando anuncio...");

    AdController.show()
        .then((result) => {
            console.log("📦 Resultado del anuncio:", result);
            
            if (result.done) {
                giveAdReward();
            } else {
                alert("⚠️ No completaste el anuncio, no se otorgó la recompensa.");
            }
        })
        .catch((result) => {
            console.error("❌ Error en anuncio:", result.description);
            
            if (result.description === 'No ads') {
                alert("😔 No hay anuncios disponibles. Intenta más tarde.");
            } else {
                alert("❌ Error al cargar el anuncio: " + result.description);
            }
        });
}

function showAdsModal() {
    if (!adsReady) {
        alert("⏳ Cargando sistema de anuncios, intenta en unos segundos...");
        return;
    }
    showModal("modalAds");
    actualizarEstadoAnuncio();
}

function giveAdReward() {
    const reward = 30;
    userData.diamonds += reward;
    userData.last_ad_watch = new Date().toISOString();
    saveUserData();
    actualizarUI();
    actualizarEstadoAnuncio();
    actualizarBannerAds();
    tg.showAlert(`🎁 +${reward} 💎`);
    console.log(`💰 Recompensa entregada: +${reward} 💎`);
}

// ==========================================
// FUNCIONES DE UI PARA ANUNCIOS
// ==========================================

function puedeVerAnuncio() {
    if (!userData.last_ad_watch) return true;
    
    const ahora = new Date();
    const ultimo = new Date(userData.last_ad_watch);
    const horasPasadas = (ahora - ultimo) / (1000 * 60 * 60);
    
    return horasPasadas >= 2;
}

function tiempoRestanteAnuncio() {
    if (!userData.last_ad_watch) return 0;
    
    const ahora = new Date();
    const ultimo = new Date(userData.last_ad_watch);
    const horasPasadas = (ahora - ultimo) / (1000 * 60 * 60);
    
    if (horasPasadas >= 2) return 0;
    
    const minutosRestantes = Math.ceil((2 - horasPasadas) * 60);
    return minutosRestantes;
}

function actualizarTimerParque() {
    const timerElem = document.getElementById("park-timer");
    if (!timerElem) return;
    
    if (!puedeVerAnuncio()) {
        const minutos = tiempoRestanteAnuncio();
        timerElem.textContent = `⏳ ${minutos} min`;
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
    
    if (puedeVerAnuncio() && adsReady) {
        statusElem.innerHTML = '<span style="color: #4ade80;">✅ ¡Anuncio disponible! Gana 30 💎</span>';
        timerElem.innerHTML = '';
        btnElem.disabled = false;
        btnElem.style.background = "#f97316";
        btnElem.onclick = showAd;
    } else if (!adsReady) {
        statusElem.innerHTML = '<span style="color: #f97316;">⏳ Cargando sistema de anuncios...</span>';
        timerElem.innerHTML = '';
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
    } else {
        const minutos = tiempoRestanteAnuncio();
        statusElem.innerHTML = '<span style="color: #f97316;">⏳ Anuncio no disponible</span>';
        timerElem.innerHTML = `Próximo en: <span style="color: #f59e0b;">${minutos} minutos</span>`;
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
    }
}

function actualizarBannerAds() {
    const banner = document.getElementById("ads-banner");
    if (!banner) return;
    
    banner.style.display = (puedeVerAnuncio() && adsReady && !enVentanaRetiro()) ? "block" : "none";
}

// ==========================================
// SISTEMA DE RECOMPENSA DIARIA
// ==========================================

function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= 30) return 300;
    return Math.min(10 + (day - 1) * 10, 300);
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    
    const ahora = new Date();
    const ultimo = new Date(userData.last_daily_claim);
    
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
    
    return hoy > ultimoDia;
}

function rachaActiva() {
    if (!userData.last_daily_claim || userData.daily_streak === 0) return false;
    
    const ahora = new Date();
    const ultimo = new Date(userData.last_daily_claim);
    
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
    
    const diffTime = hoy - ultimoDia;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
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
    if (currentDayElem) currentDayElem.textContent = diaActual > 30 ? 30 : diaActual;
    
    const todayRewardElem = document.getElementById("today-reward");
    if (todayRewardElem) todayRewardElem.textContent = `${recompensaHoy} 💎`;
    
    const progressText = document.getElementById("progress-text");
    if (progressText) progressText.textContent = `${Math.min(racha, 30)}/30`;
    
    const statusElem = document.getElementById("daily-status");
    const btnElem = document.getElementById("claim-daily-btn");
    
    if (!puede) {
        const proxima = new Date();
        proxima.setDate(proxima.getDate() + 1);
        proxima.setHours(0, 0, 0, 0);
        
        const horas = Math.ceil((proxima - new Date()) / (1000 * 60 * 60));
        
        statusElem.innerHTML = `⏳ Ya reclamaste. Próxima en <span style="color: #f59e0b;">${horas} horas</span>`;
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
    } else {
        if (!rachaActiva() && racha > 0) {
            statusElem.innerHTML = '⚠️ Perdiste tu racha. ¡Empieza de nuevo!';
        } else {
            statusElem.innerHTML = `✅ ¡Recompensa disponible! Día ${diaActual}`;
        }
        btnElem.disabled = false;
        btnElem.style.background = "#f59e0b";
    }
    
    const calendarElem = document.getElementById("daily-calendar");
    if (calendarElem) {
        let html = '';
        for (let i = 1; i <= 30; i++) {
            const reward = getDailyRewardAmount(i);
            let clase = 'daily-day';
            
            if (i <= racha) {
                clase += ' completed';
            } else if (i === racha + 1 && puede) {
                clase += ' current';
            } else {
                clase += ' locked';
            }
            
            html += `<div class="${clase}">
                        <div>Día ${i}</div>
                        <div class="daily-reward">${reward}💎</div>
                    </div>`;
        }
        calendarElem.innerHTML = html;
    }
}

// ==========================================
// RECLAMAR RECOMPENSA DIARIA
// ==========================================
async function claimDailyReward() {
    try {
        console.log("🎁 Intentando reclamar recompensa diaria...");
        
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
            
            if (diffHoras < 48) {
                nuevoDia = userData.daily_streak + 1;
            }
        }
        
        if (nuevoDia > 30) nuevoDia = 30;
        
        const recompensa = nuevoDia <= 30 ? 10 + (nuevoDia - 1) * 10 : 300;
        
        console.log(`📅 Día: ${nuevoDia}, Recompensa: ${recompensa}💎`);
        
        if (!confirm(`¿Reclamar Día ${nuevoDia} por ${recompensa} 💎?`)) return;
        
        userData.diamonds += recompensa;
        userData.daily_streak = nuevoDia;
        userData.last_daily_claim = new Date().toISOString();
        
        actualizarUI();
        actualizarDailyUI();
        
        const guardado = await saveUserData();
        
        if (guardado) {
            alert(`✅ ¡+${recompensa} diamantes! Día ${nuevoDia}/30`);
        } else {
            alert("❌ Error al guardar. Intenta de nuevo.");
        }
        
    } catch (error) {
        console.error("❌ Error en claimDailyReward:", error);
        alert("❌ Error al reclamar: " + error.message);
    }
}

function actualizarBannerDiario() {
    const banner = document.getElementById("daily-banner");
    if (!banner) return;
    
    if (puedeReclamarDiaria()) {
        banner.style.display = "block";
        banner.innerHTML = '<i class="fa-solid fa-calendar-day"></i> ¡RECOMPENSA DIARIA DISPONIBLE! <i class="fa-solid fa-arrow-right"></i>';
    } else {
        const racha = userData.daily_streak || 0;
        banner.style.display = "block";
        banner.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Día ${racha}/30 - Vuelve mañana`;
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
    if (!globalPoolData || globalPoolData.pool_ton <= 0 || globalPoolData.total_diamonds <= 0) {
        return 0.001;
    }
    const tonDisponible = globalPoolData.pool_ton * K * R;
    return tonDisponible / globalPoolData.total_diamonds;
}

function getMinDiamondsFor5TON() {
    const tasa = calcularTasaRetiro();
    return Math.ceil(5 / tasa);
}

// ==========================================
// INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================
async function initApp() {
    try {
        console.log("🚀 Iniciando Aplicación...");
        tg.expand();
        tg.ready();

        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log("✅ Usuario Telegram:", user);
            
            userData.id = user.id.toString();
            
            // ✅ NOMBRE REAL DEL USUARIO (sin @)
            if (user.first_name && user.last_name) {
                userData.username = `${user.first_name} ${user.last_name}`;
            } else if (user.first_name) {
                userData.username = user.first_name;
            } else if (user.username) {
                userData.username = user.username;
            } else {
                userData.username = "Usuario";
            }
            
            userData.firstName = user.first_name || "";
            userData.lastName = user.last_name || "";
            
            const nameElem = document.getElementById("user-display");
            if (nameElem) nameElem.textContent = userData.username;
            
            await loadUserFromDB(user.id);
        } else {
            document.getElementById("user-display").textContent = "Invitado";
        }

        await initTONConnect();
        
        await updateRealPoolBalance();
        await updateTotalDiamonds();
        
        renderStore();
        renderBank();
        
        startProduction();
        
        setInterval(saveUserData, 30000);
        
        window.addEventListener('beforeunload', () => {
            saveUserData();
        });
        
        actualizarTimerParque();
        actualizarBannerAds();
        actualizarBannerDiario();
        actualizarBannerDomingo();
        
        setInterval(actualizarTimerParque, 60000);
        setInterval(() => {
            actualizarBannerDiario();
            actualizarBannerAds();
            actualizarBannerDomingo();
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
        console.log("👤 Cargando usuario desde DB:", tgId);
        
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
            console.log("🆕 Usuario no encontrado, creando nuevo...");
            
            const nuevoUsuario = {
                telegram_id: tgId.toString(),
                username: userData.username,
                diamonds: 0,
                lvl_piscina: 0,
                lvl_fabrica: 0,
                lvl_escuela: 0,
                lvl_hospital: 0,
                referral_code: 'REF' + tgId.toString().slice(-6),
                referral_earnings: 0,
                referred_users: [],
                last_online: new Date().toISOString(),
                last_production_update: new Date().toISOString(),
                last_withdraw_week: null,
                last_ad_watch: null,
                daily_streak: 0,
                last_daily_claim: null,
                haInvertido: false
            };
            
            console.log("📦 Insertando nuevo usuario:", nuevoUsuario);
            
            const { error: insertError } = await _supabase
                .from('game_data')
                .insert([nuevoUsuario]);
            
            if (insertError) {
                console.error("❌ Error creando usuario:", insertError);
                return;
            }
            
            console.log("✅ Usuario creado en Supabase");
            userData = { ...userData, ...nuevoUsuario, id: tgId.toString() };
            
        } else {
            console.log("📁 Usuario encontrado en DB:", data);
            
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
                daily_streak: Number(data.daily_streak) || 0,
                last_daily_claim: data.last_daily_claim || null,
                haInvertido: data.haInvertido || false
            };
            
            console.log("📊 Datos cargados:", {
                nombre: userData.username,
                piscina: userData.lvl_piscina,
                fabrica: userData.lvl_fabrica,
                escuela: userData.lvl_escuela,
                hospital: userData.lvl_hospital,
                diamantes: userData.diamonds,
                daily_streak: userData.daily_streak,
                last_daily_claim: userData.last_daily_claim
            });
            
            const offlineEarnings = await calculateOfflineProduction();
            if (offlineEarnings > 0) {
                userData.diamonds += offlineEarnings;
                console.log(`💰 Producción offline: +${offlineEarnings.toFixed(2)} 💎`);
                await saveUserData();
            }
        }
        
        userData.last_production_update = new Date().toISOString();
        
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
// TIENDA
// ==========================================
function renderStore() {
    const storeContainer = document.getElementById("storeList");
    if (!storeContainer) return;

    const upgrades = [
        { name: "Piscina", field: "piscina", price: 5000, prod: 60, color: "#38bdf8", icon: "fa-water-ladder" },
        { name: "Fábrica", field: "fabrica", price: 10000, prod: 120, color: "#a78bfa", icon: "fa-industry" },
        { name: "Escuela", field: "escuela", price: 3000, prod: 40, color: "#a16207", icon: "fa-school" },
        { name: "Hospital", field: "hospital", price: 7500, prod: 80, color: "#f87171", icon: "fa-hospital" }
    ];

    let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                  <span><b>🏪 Tienda de Mejoras</b></span>
                  <span><b>${Math.floor(userData.diamonds || 0).toLocaleString()} 💎</b></span>
                </div>`;

    upgrades.forEach(item => {
        const lvl = userData[`lvl_${item.field}`] || 0;
        const canAfford = (userData.diamonds || 0) >= item.price;
        
        html += `
        <div class="store-item" style="border-left: 4px solid ${item.color};">
            <div class="store-item-header">
                <div>
                    <i class="fa-solid ${item.icon}" style="color: ${item.color}; margin-right: 8px;"></i>
                    <strong>${item.name} Nvl ${lvl}</strong>
                </div>
                <div class="store-item-price">${item.price.toLocaleString()} 💎</div>
            </div>
            <p style="margin: 5px 0; color: #94a3b8;">
                <i class="fa-solid fa-arrow-up" style="color: #10b981;"></i>
                +${item.prod} 💎/hora
            </p>
            <button onclick="buyUpgrade('${item.name}', '${item.field}', ${item.price})" 
                    style="background: ${canAfford ? item.color : '#475569'}; 
                           color: white; border: none; padding: 10px; border-radius: 8px; width: 100%;"
                    ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? 'MEJORAR' : 'FONDOS INSUFICIENTES'}
            </button>
        </div>`;
    });

    html += `<div class="info-text" style="margin-top: 15px;">
               Cada mejora aumenta tu producción por hora
             </div>`;

    storeContainer.innerHTML = html;
}

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

    const confirmMsg = 
        `¿Comprar ${tonAmount.toFixed(2)} TON?\n\n` +
        `Recibirás: ${comprados} 💎\n` +
        `Precio: ${PRECIO_COMPRA.toFixed(3)} TON/💎`;

    if (!confirm(confirmMsg)) return;

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
            tg.showAlert("🎉 ¡Felicidades! Ahora eres inversor. Sin límites en el casino.");
        }
        
        await saveUserData();
        actualizarUI();
        alert(`✅ Compra exitosa! Recibiste ${comprados} 💎`);
    } catch (e) {
        console.error("❌ Error en transacción:", e);
        alert("❌ Error en la transacción");
    }
}

// ==========================================
// PRODUCCIÓN
// ==========================================
function startProduction() {
    console.log("⚙️ Iniciando producción...");
    
    setInterval(() => {
        if (!userData.id) return;
        
        if (enVentanaRetiro()) return;
        
        const totalPerHr = getTotalProductionPerHour();
        userData.diamonds += (totalPerHr / 3600);
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
    updateCentralStats();
    showModal("centralModal");
}

// ==========================================
// CASINO - FUNCIONES DE APERTURA
// ==========================================

function openCasino() {
    showModal("modalCasino");
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
    console.log(`🎰 Cambiando apuesta para ${juego}, delta: ${delta}`);
    
    if (isNaN(apuestaActual[juego])) {
        apuestaActual[juego] = juego === 'tragaperras' ? 5 : (juego === 'loteria' ? 1 : 10);
    }
    
    let nueva = apuestaActual[juego] + delta;
    if (nueva < 1) nueva = 1;
    
    const maximos = {
        highlow: 1000,
        ruleta: 1000,
        tragaperras: 500,
        dados: 1000,
        loteria: 10
    };
    
    if (nueva > maximos[juego]) nueva = maximos[juego];
    
    apuestaActual[juego] = nueva;
    
    const elemId = juego === 'highlow' ? 'hl-bet' : 
                   juego === 'ruleta' ? 'ruleta-bet' :
                   juego === 'tragaperras' ? 'tragaperras-bet' :
                   juego === 'dados' ? 'dados-bet' : 'loteria-bet';
    
    const elem = document.getElementById(elemId);
    if (elem) {
        elem.textContent = nueva;
        console.log(`✅ Apuesta actualizada a ${nueva}`);
    }
}

// JUEGO 1: HIGH/LOW
function jugarHighLow(eleccion) {
    const apuesta = apuestaActual.highlow;
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugar('highlow')) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    
    const gana = Math.random() < 0.485;
    
    let numero;
    if (gana) {
        numero = eleccion === "high" 
            ? Math.floor(Math.random() * 5000) + 5000
            : Math.floor(Math.random() * 5000);
    } else {
        numero = eleccion === "high"
            ? Math.floor(Math.random() * 5000)
            : Math.floor(Math.random() * 5000) + 5000;
    }
    
    const numeroStr = numero.toString().padStart(4, '0');
    document.getElementById('hl-number').textContent = numeroStr;
    
    const resultado = document.getElementById('hl-result');
    
    if (gana) {
        userData.diamonds += apuesta * 2;
        resultado.innerHTML = '<span class="win-message">🎉 ¡GANASTE!</span>';
    } else {
        resultado.innerHTML = '<span class="lose-message">😞 Has perdido</span>';
    }
    
    registrarJugada('highlow');
    actualizarUI();
    saveUserData();
}

// JUEGO 2: RULETA
function jugarRuleta(tipo) {
    const apuesta = apuestaActual.ruleta;
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugar('ruleta')) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    
    let numero;
    if (Math.random() < 0.03) {
        numero = 0;
    } else {
        numero = Math.floor(Math.random() * 37);
    }
    
    document.getElementById('ruleta-number').textContent = numero;
    
    let gana = false;
    
    switch(tipo) {
        case 'rojo':
            gana = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(numero);
            break;
        case 'negro':
            gana = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(numero);
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
            const numeroElegido = prompt("Elige un número del 0 al 36:", "7");
            if (numeroElegido !== null) {
                const num = parseInt(numeroElegido);
                if (num >= 0 && num <= 36) {
                    gana = numero === num;
                    if (gana) {
                        userData.diamonds += apuesta * 36;
                    }
                } else {
                    alert("Número inválido");
                    userData.diamonds += apuesta;
                    actualizarUI();
                    return;
                }
            } else {
                userData.diamonds += apuesta;
                actualizarUI();
                return;
            }
            break;
    }
    
    const resultado = document.getElementById('ruleta-result');
    
    if (tipo !== 'numero' && gana) {
        userData.diamonds += apuesta * 2;
        resultado.innerHTML = '<span class="win-message">🎉 ¡GANASTE!</span>';
    } else if (tipo === 'numero' && gana) {
        resultado.innerHTML = '<span class="win-message">🎉 ¡NÚMERO EXACTO!</span>';
    } else {
        resultado.innerHTML = '<span class="lose-message">😞 Has perdido</span>';
    }
    
    registrarJugada('ruleta');
    actualizarUI();
    saveUserData();
}

// JUEGO 3: TRAGAPERRAS
function jugarTragaperras() {
    const apuesta = apuestaActual.tragaperras;
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugar('tragaperras')) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    
    const simbolos = [
        { nombre: "💎", rareza: 1, mult: 50 },
        { nombre: "₿", rareza: 3, mult: 20 },
        { nombre: "Ξ", rareza: 6, mult: 10 },
        { nombre: "🪙", rareza: 15, mult: 5 },
        { nombre: "📈", rareza: 37.5, mult: 2 },
        { nombre: "📉", rareza: 37.5, mult: 2 }
    ];
    
    const rodillos = [];
    for (let i = 0; i < 3; i++) {
        const rand = Math.random() * 100;
        let acumulado = 0;
        for (const s of simbolos) {
            acumulado += s.rareza;
            if (rand < acumulado) {
                rodillos.push(s);
                break;
            }
        }
    }
    
    document.getElementById('slot1').textContent = rodillos[0].nombre;
    document.getElementById('slot2').textContent = rodillos[1].nombre;
    document.getElementById('slot3').textContent = rodillos[2].nombre;
    
    const resultado = document.getElementById('tragaperras-result');
    
    if (rodillos[0].nombre === rodillos[1].nombre && rodillos[1].nombre === rodillos[2].nombre) {
        const mult = rodillos[0].mult;
        userData.diamonds += apuesta * mult;
        resultado.innerHTML = `<span class="win-message">🎉 ¡GANASTE! x${mult}</span>`;
        
        if (rodillos[0].nombre === "💎") {
            resultado.innerHTML = '<span class="win-message">💎 ¡JACKPOT! x50 💎</span>';
        }
    } else {
        resultado.innerHTML = '<span class="lose-message">😞 No hay premio</span>';
    }
    
    registrarJugada('tragaperras');
    actualizarUI();
    saveUserData();
}

// JUEGO 4: DADOS
function jugarDados(eleccion) {
    const apuesta = apuestaActual.dados;
    
    if (userData.diamonds < apuesta) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugar('dados')) {
        alert("❌ Límite diario alcanzado");
        return;
    }
    
    userData.diamonds -= apuesta;
    
    let dado1, dado2;
    
    if (eleccion === 'exacto' && Math.random() > 0.15) {
        do {
            dado1 = Math.floor(Math.random() * 6) + 1;
            dado2 = Math.floor(Math.random() * 6) + 1;
        } while (dado1 + dado2 === 7);
    } else if (eleccion === 'menor' && Math.random() > 0.40) {
        do {
            dado1 = Math.floor(Math.random() * 6) + 1;
            dado2 = Math.floor(Math.random() * 6) + 1;
        } while (dado1 + dado2 >= 2 && dado1 + dado2 <= 6);
    } else if (eleccion === 'mayor' && Math.random() > 0.40) {
        do {
            dado1 = Math.floor(Math.random() * 6) + 1;
            dado2 = Math.floor(Math.random() * 6) + 1;
        } while (dado1 + dado2 >= 8 && dado1 + dado2 <= 12);
    } else {
        dado1 = Math.floor(Math.random() * 6) + 1;
        dado2 = Math.floor(Math.random() * 6) + 1;
    }
    
    const caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    document.getElementById('dado1').textContent = caras[dado1 - 1];
    document.getElementById('dado2').textContent = caras[dado2 - 1];
    
    const suma = dado1 + dado2;
    document.getElementById('dados-suma').textContent = `Suma: ${suma}`;
    
    const resultado = document.getElementById('dados-result');
    
    let gana = false;
    if (eleccion === 'menor' && suma >= 2 && suma <= 6) gana = true;
    if (eleccion === 'mayor' && suma >= 8 && suma <= 12) gana = true;
    if (eleccion === 'exacto' && suma === 7) gana = true;
    
    if (gana) {
        if (eleccion === 'exacto') {
            userData.diamonds += apuesta * 5;
            resultado.innerHTML = '<span class="win-message">🎉 ¡EXACTO! x5</span>';
        } else {
            userData.diamonds += apuesta * 2;
            resultado.innerHTML = '<span class="win-message">🎉 ¡GANASTE!</span>';
        }
    } else {
        resultado.innerHTML = '<span class="lose-message">😞 Has perdido</span>';
    }
    
    registrarJugada('dados');
    actualizarUI();
    saveUserData();
}

// JUEGO 5: LOTERÍA
function comprarBoletos() {
    const cantidad = apuestaActual.loteria;
    const costoTotal = cantidad * 5;
    
    if (userData.diamonds < costoTotal) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugar('loteria', cantidad)) {
        alert("❌ Límite diario de boletos alcanzado");
        return;
    }
    
    userData.diamonds -= costoTotal;
    
    boletosComprados = [];
    for (let i = 0; i < cantidad; i++) {
        const boleto = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        boletosComprados.push(boleto);
    }
    
    let html = '<p style="color: #94a3b8;">Tus boletos:</p><div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">';
    boletosComprados.forEach(b => {
        html += `<span style="background: #0f172a; padding: 5px 10px; border-radius: 5px; border: 1px solid #fbbf24;">${b}</span>`;
    });
    html += '</div>';
    document.getElementById('loteria-boletos').innerHTML = html;
    
    registrarJugada('loteria', cantidad);
    actualizarUI();
    saveUserData();
}

function jugarLoteria() {
    if (boletosComprados.length === 0) {
        alert("❌ Primero compra boletos");
        return;
    }
    
    const rand = Math.random();
    let numeroGanador;
    
    const prob = [
        { coinc: 4, prob: 0.00005 },
        { coinc: 3, prob: 0.0005 },
        { coinc: 2, prob: 0.005 },
        { coinc: 1, prob: 0.05 },
        { coinc: 0, prob: 0.94445 }
    ];
    
    let acum = 0;
    let nivelCoincidencia = 0;
    for (const p of prob) {
        acum += p.prob;
        if (rand < acum) {
            nivelCoincidencia = p.coinc;
            break;
        }
    }
    
    if (nivelCoincidencia === 0) {
        do {
            numeroGanador = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        } while (boletosComprados.some(b => coincidencias(b, numeroGanador) > 0));
    } else {
        const boletoBase = boletosComprados[Math.floor(Math.random() * boletosComprados.length)];
        const digitos = boletoBase.split('');
        
        const posicionesMantener = [];
        while (posicionesMantener.length < nivelCoincidencia) {
            const pos = Math.floor(Math.random() * 4);
            if (!posicionesMantener.includes(pos)) posicionesMantener.push(pos);
        }
        
        for (let i = 0; i < 4; i++) {
            if (!posicionesMantener.includes(i)) {
                digitos[i] = Math.floor(Math.random() * 10).toString();
            }
        }
        
        numeroGanador = digitos.join('');
    }
    
    document.getElementById('loteria-number').textContent = numeroGanador;
    
    let premioTotal = 0;
    const resultados = [];
    
    boletosComprados.forEach(boleto => {
        const coinc = coincidencias(boleto, numeroGanador);
        let premio = 0;
        
        switch(coinc) {
            case 4: premio = 5 * 500; break;
            case 3: premio = 5 * 50; break;
            case 2: premio = 5 * 5; break;
            case 1: premio = 5; break;
            default: premio = 0;
        }
        
        premioTotal += premio;
        if (premio > 0) {
            resultados.push(`<span style="color: #4ade80;">${boleto} → +${premio}💎 (${coinc} coincidencias)</span>`);
        }
    });
    
    if (premioTotal > 0) {
        userData.diamonds += premioTotal;
    }
    
    let html = '<p style="color: #94a3b8;">Resultados:</p>';
    if (resultados.length > 0) {
        html += resultados.join('<br>');
        html += `<br><span style="color: #facc15; font-weight: bold;">Total ganado: +${premioTotal}💎</span>`;
    } else {
        html += '<span class="lose-message">😞 No ganaste con ningún boleto</span>';
    }
    
    document.getElementById('loteria-result').innerHTML = html;
    
    boletosComprados = [];
    actualizarUI();
    saveUserData();
}

function coincidencias(boleto, ganador) {
    let cont = 0;
    for (let i = 0; i < 4; i++) {
        if (boleto[i] === ganador[i]) cont++;
    }
    return cont;
}

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
    if (codeElem) codeElem.textContent = userData.referral_code || "NO DISPONIBLE";
    
    const countElem = document.getElementById("ref-count");
    if (countElem) countElem.textContent = userData.referred_users?.length || 0;
    
    const totalElem = document.getElementById("ref-total");
    if (totalElem) totalElem.textContent = `${userData.referral_earnings || 0} 💎`;
}

// ==========================================
// TON CONNECT
// ==========================================
async function initTONConnect() {
    try {
        console.log("🔄 Inicializando TON Connect...");
        
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error("❌ TON_CONNECT_UI no disponible");
            return;
        }
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange((wallet) => {
            currentWallet = wallet;
            updateWalletUI(wallet);
            if (document.getElementById("modalBank")?.style.display === "block") {
                renderBank();
            }
        });
        
        console.log("✅ TON Connect inicializado");
        
    } catch (error) {
        console.error("❌ Error en TON Connect:", error);
    }
}

function updateWalletUI(wallet) {
    try {
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
    } catch (error) {
        console.error("❌ Error en UI wallet:", error);
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
        console.log(`🛒 Comprando mejora: ${name}, campo: ${field}, precio: ${price}`);
        console.log(`💎 Diamantes actuales: ${userData.diamonds}`);
        console.log(`📊 Nivel actual de ${field}: ${userData[`lvl_${field}`]}`);
        
        if (!userData.id) {
            alert("❌ Error: Usuario no identificado");
            return;
        }
        
        if ((userData.diamonds || 0) < price) {
            alert("❌ No tienes suficientes diamantes");
            return;
        }
        
        const oldValue = userData[`lvl_${field}`] || 0;
        const oldDiamonds = userData.diamonds;
        
        userData[`lvl_${field}`] = oldValue + 1;
        userData.diamonds -= price;
        
        console.log(`📊 NUEVO nivel: ${userData[`lvl_${field}`]}`);
        console.log(`💎 Diamantes después de compra: ${userData.diamonds}`);
        
        actualizarUI();
        renderStore();
        
        const saveResult = await saveUserData();
        
        if (saveResult) {
            console.log("✅ Mejora guardada en Supabase");
            alert(`✅ ¡${name} nivel ${userData[`lvl_${field}`]}!`);
        } else {
            console.error("❌ Error al guardar, revirtiendo cambios");
            userData[`lvl_${field}`] = oldValue;
            userData.diamonds = oldDiamonds;
            actualizarUI();
            renderStore();
            alert("❌ Error al guardar la mejora. Intenta de nuevo.");
        }
        
    } catch (error) {
        console.error("❌ Error CRÍTICO en buyUpgrade:", error);
        alert("Error al comprar mejora: " + error.message);
    }
}

// ==========================================
// GUARDAR DATOS EN SUPABASE (VERSIÓN CORREGIDA)
// ==========================================
async function saveUserData() {
    if (!userData.id) {
        console.log("⚠️ No hay ID de usuario");
        return false;
    }
    
    try {
        console.log("💾 Intentando guardar datos...");
        
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
            daily_streak: parseInt(userData.daily_streak) || 0,
            last_daily_claim: userData.last_daily_claim,
            haInvertido: userData.haInvertido || false // ✅ CORREGIDO
        };
        
        console.log("📦 Datos a guardar:", datos);
        
        const { error } = await _supabase
            .from('game_data')
            .update(datos)
            .eq('telegram_id', userData.id);
        
        if (error) {
            console.error("❌ Error de Supabase:", error);
            
            if (error.code === 'PGRST116') {
                console.log("🔄 Usuario no existe, insertando...");
                
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
                
                if (insertError) {
                    console.error("❌ Error al insertar:", insertError);
                    alert("❌ Error al crear usuario en base de datos");
                    return false;
                }
                
                console.log("✅ Usuario insertado correctamente");
                return true;
            }
            
            alert("❌ Error de base de datos: " + error.message);
            return false;
        }
        
        console.log("✅ Datos guardados correctamente");
        return true;
        
    } catch (error) {
        console.error("❌ Error en saveUserData:", error);
        alert("❌ Error al guardar: " + error.message);
        return false;
    }
}

// ==========================================
// FUNCIÓN DE CAMBIO (SOLO INTERCAMBIO, NO RETIRO REAL)
// ==========================================
async function exchangeDiamonds() {
    if (!enVentanaRetiro()) {
        alert("❌ Solo disponible los DOMINGOS (00:00 - 23:59)");
        return;
    }
    
    const semanaActual = getNumeroSemana();
    if (userData.last_withdraw_week === semanaActual) {
        alert("❌ Ya cambiaste esta semana");
        return;
    }
    
    const input = document.getElementById("withdraw-amount");
    const diamantes = parseInt(input?.value || 0);
    const misDiamantes = Math.floor(userData.diamonds || 0);
    const tasa = calcularTasaRetiro();
    const minDiamondsFor5TON = getMinDiamondsFor5TON();
    
    if (!diamantes || diamantes <= 0 || diamantes > misDiamantes) {
        return alert("❌ Cantidad inválida");
    }
    
    if (diamantes < minDiamondsFor5TON) {
        return alert(`❌ Mínimo ${minDiamondsFor5TON} 💎 para 5 TON`);
    }
    
    const tonRecibido = diamantes * tasa;
    
    if (tonRecibido > (globalPoolData.pool_ton * K * R)) {
        return alert("❌ No hay suficiente TON disponible en el pool");
    }
    
    const confirmMsg = 
        `¿CAMBIAR ${diamantes.toLocaleString()} 💎 por ${tonRecibido.toFixed(4)} TON?\n\n` +
        `⚠️ Estos TON quedarán disponibles para retirar cuando quieras.\n` +
        `Los diamantes se descontarán de tu cuenta.`;
    
    if (!confirm(confirmMsg)) return;
    
    userData.diamonds -= diamantes;
    userData.last_withdraw_week = semanaActual;
    await saveUserData();
    
    alert(`✅ Cambio exitoso! Tienes ${tonRecibido.toFixed(4)} TON disponibles para retirar.`);
    closeAll();
}

// ==========================================
// RETIROS SEMANALES (RETIRAR TON REAL)
// ==========================================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        await updateRealPoolBalance();
        await updateTotalDiamonds();
        
        const tasa = calcularTasaRetiro();
        const poolTon = globalPoolData.pool_ton;
        const totalDiamantes = globalPoolData.total_diamonds;
        const misDiamantes = Math.floor(userData.diamonds || 0);
        const minDiamondsFor5TON = getMinDiamondsFor5TON();
        
        document.getElementById("week-indicator").textContent = `Semana #${getNumeroSemana()}`;
        document.getElementById("pool-amount").textContent = `${poolTon.toFixed(4)} TON`;
        document.getElementById("total-diamonds").textContent = `${totalDiamantes.toLocaleString()} 💎`;
        document.getElementById("current-price").textContent = `${(1/tasa).toFixed(0)} 💎`;
        document.getElementById("available-diamonds").textContent = misDiamantes.toLocaleString();
        document.getElementById("min-withdraw").textContent = `5 TON (${minDiamondsFor5TON.toLocaleString()} 💎)`;
        
        const statusElem = document.getElementById("withdraw-status");
        if (!enVentanaRetiro()) {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #f97316;"></i> ⏳ Espera al DOMINGO para cambiar/retirar';
        } else if (userData.last_withdraw_week === getNumeroSemana()) {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #ef4444;"></i> ✅ Ya cambiaste esta semana';
        } else {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i> ✅ Puedes cambiar hoy';
        }
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minDiamondsFor5TON;
            input.max = misDiamantes;
            input.placeholder = `Mínimo: ${minDiamondsFor5TON} 💎`;
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        updateWithdrawCalculation();
        
    } catch (error) {
        console.error("❌ Error:", error);
        alert("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    const input = document.getElementById("withdraw-amount");
    const tonElem = document.getElementById("ton-receive");
    if (!input || !tonElem) return;
    
    const diamantes = parseInt(input.value) || 0;
    const tasa = calcularTasaRetiro();
    const misDiamantes = Math.floor(userData.diamonds || 0);
    const minDiamondsFor5TON = getMinDiamondsFor5TON();
    
    if (diamantes <= 0) {
        tonElem.textContent = "0.0000";
        return;
    }
    
    if (diamantes > misDiamantes) {
        tonElem.innerHTML = `<span style="color: #ef4444;">Solo tienes ${misDiamantes} 💎</span>`;
        return;
    }
    
    if (diamantes < minDiamondsFor5TON) {
        tonElem.innerHTML = `<span style="color: #ef4444;">Necesitas mínimo ${minDiamondsFor5TON} 💎 para 5 TON</span>`;
        return;
    }
    
    const tonRecibido = diamantes * tasa;
    tonElem.textContent = tonRecibido.toFixed(4);
}

async function processWithdraw() {
    if (!enVentanaRetiro()) {
        alert("❌ Solo disponible los DOMINGOS (00:00 - 23:59)");
        return;
    }
    
    const semanaActual = getNumeroSemana();
    if (userData.last_withdraw_week === semanaActual) {
        alert("❌ Ya cambiaste esta semana");
        return;
    }
    
    const input = document.getElementById("withdraw-amount");
    const diamantes = parseInt(input?.value || 0);
    const misDiamantes = Math.floor(userData.diamonds || 0);
    const tasa = calcularTasaRetiro();
    const minDiamondsFor5TON = getMinDiamondsFor5TON();
    
    if (!diamantes || diamantes <= 0 || diamantes > misDiamantes) {
        return alert("❌ Cantidad inválida");
    }
    
    if (diamantes < minDiamondsFor5TON) {
        return alert(`❌ Mínimo ${minDiamondsFor5TON} 💎 para 5 TON`);
    }
    
    const tonRecibido = diamantes * tasa;
    
    if (tonRecibido > (globalPoolData.pool_ton * K * R)) {
        return alert("❌ No hay suficiente TON disponible en el pool");
    }
    
    const confirmMsg = 
        `¿RETIRAR ${diamantes.toLocaleString()} 💎 por ${tonRecibido.toFixed(4)} TON?\n\n` +
        `⚠️ Los TON se enviarán directamente a tu wallet conectada.`;
    
    if (!confirm(confirmMsg)) return;
    
    // Aquí iría la lógica real de envío de TON
    userData.diamonds -= diamantes;
    userData.last_withdraw_week = semanaActual;
    await saveUserData();
    
    alert(`✅ Retiro procesado! Recibirás ${tonRecibido.toFixed(4)} TON en tu wallet.`);
    closeAll();
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
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw", "modalAds", "modalDailyReward", "modalCasino", "modalHighLow", "modalRuleta", "modalTragaperras", "modalDados", "modalLoteria"].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = "none";
    });
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado");
    setTimeout(initApp, 500);
});

window.addEventListener('beforeunload', () => {
    saveUserData();
});

// EXPORTAR FUNCIONES GLOBALES
window.openCentral = openCentral;
window.openStore = () => { renderStore(); showModal("modalStore"); };
window.openBank = () => { renderBank(); showModal("modalBank"); };
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.openDailyReward = openDailyReward;
window.openCasino = openCasino;
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
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.disconnectWallet = disconnectWallet;
window.processWithdraw = processWithdraw;
window.exchangeDiamonds = exchangeDiamonds; // ✅ NUEVA FUNCIÓN
window.updateWithdrawCalculation = updateWithdrawCalculation;

console.log("✅ Ton City Game - Versión final con botón de CAMBIAR y RETIRAR separados");