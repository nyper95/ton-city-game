// ======================================================
// TON CITY GAME - VERSIÓN COMPLETA CORREGIDA
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
const K = 0.9;
const R = 0.95;

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
    event_progress: {}, // Para llevar progreso de eventos
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
        tarea: "Ver 3 anuncios de video seguidos para ayudar a vacunar a la ciudad",
        recompensa: 100,
        premium: 200,
        tipo: 'ads',
        requeridos: 3
    },
    {
        nombre: "Fábrica",
        edificio: "fabrica",
        icono: "fa-industry",
        color: "#a78bfa",
        descripcion: "Contratos de Exportación",
        tarea: "Suscribirse al canal oficial de Ton City para recibir ofertas exclusivas",
        recompensa: 150,
        premium: 300,
        tipo: 'subscribe',
        requeridos: 1
    },
    {
        nombre: "Piscina",
        edificio: "piscina",
        icono: "fa-water-ladder",
        color: "#38bdf8",
        descripcion: "Publicidad del Resort",
        tarea: "Compartir el enlace de la ciudad en 3 grupos de Telegram",
        recompensa: 80,
        premium: 160,
        tipo: 'share',
        requeridos: 3
    },
    {
        nombre: "Escuela",
        edificio: "escuela",
        icono: "fa-school",
        color: "#a16207",
        descripcion: "Becas de Estudio",
        tarea: "Responder una encuesta rápida sobre la ciudad",
        recompensa: 200,
        premium: 400,
        tipo: 'survey',
        requeridos: 1
    }
];

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
    const semana = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % 4;
    return EVENTOS_SEMANALES[semana];
}

function actualizarBannerEvento() {
    const evento = getEventoActual();
    const banner = document.getElementById("event-banner");
    const textElem = document.getElementById("event-text");
    
    if (banner && textElem) {
        banner.style.display = "block";
        banner.style.background = `linear-gradient(135deg, ${evento.color}, ${evento.color}dd)`;
        textElem.innerHTML = `🎉 Evento: ${evento.nombre} - ${evento.descripcion}`;
        
        // Quitar clase event-card de todos los edificios
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('event-card');
        });
        
        // Destacar edificio de la semana
        const edificioCard = document.querySelector(`.card[onclick="openBuilding('${evento.edificio}')"]`);
        if (edificioCard) {
            edificioCard.classList.add('event-card');
        }
    }
}

// ==========================================
// FUNCIÓN DE EDIFICIOS (CON EVENTO)
// ==========================================
function openBuilding(building) {
    const evento = getEventoActual();
    
    // Si este edificio es el protagonista de la semana
    if (building === evento.edificio) {
        // Abrir modal de evento
        abrirModalEvento(evento);
        return;
    }
    
    // Si no es el edificio de la semana, abrir modal de mejoras normal
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
    
    showModal(`modal${building.charAt(0).toUpperCase() + building.slice(1)}`);
}

// ==========================================
// ABRIR MODAL DE EVENTO
// ==========================================
function abrirModalEvento(evento) {
    // Actualizar contenido del modal
    const titleElem = document.getElementById("event-title");
    const iconElem = document.getElementById("event-icon");
    const descElem = document.getElementById("event-description");
    const rewardElem = document.getElementById("event-reward");
    const premiumRewardElem = document.getElementById("event-reward-premium");
    const btnElem = document.getElementById("event-btn");
    const progressContainer = document.getElementById("event-progress");
    const progressBar = document.getElementById("event-progress-bar");
    const progressText = document.getElementById("event-progress-text");
    
    if (iconElem) {
        iconElem.innerHTML = `<i class="fa-solid ${evento.icono}" style="color: ${evento.color}; font-size: 64px;"></i>`;
    }
    
    if (titleElem) {
        titleElem.innerHTML = `${evento.nombre}`;
        titleElem.style.color = evento.color;
    }
    
    if (descElem) {
        descElem.innerHTML = `<strong>${evento.descripcion}</strong><br><br>📋 <span style="color: #94a3b8;">${evento.tarea}</span>`;
    }
    
    if (rewardElem) rewardElem.textContent = `${evento.recompensa} 💎`;
    if (premiumRewardElem) premiumRewardElem.textContent = `${evento.premium} 💎`;
    
    if (btnElem) {
        btnElem.style.background = evento.color;
        btnElem.setAttribute('data-edificio', evento.edificio);
        btnElem.setAttribute('data-tipo', evento.tipo);
        btnElem.setAttribute('data-recompensa', evento.recompensa);
        btnElem.setAttribute('data-premium', evento.premium);
        btnElem.setAttribute('data-requeridos', evento.requeridos);
    }
    
    // Mostrar progreso si existe
    const progreso = userData.event_progress?.[evento.nombre] || 0;
    if (evento.requeridos > 1 && progressContainer && progressBar && progressText) {
        progressContainer.style.display = "block";
        const porcentaje = (progreso / evento.requeridos) * 100;
        progressBar.style.width = `${porcentaje}%`;
        progressText.textContent = `${progreso}/${evento.requeridos} completado`;
    } else if (progressContainer) {
        progressContainer.style.display = "none";
    }
    
    showModal("modalEvent");
}

// ==========================================
// PARTICIPAR EN EVENTO
// ==========================================
async function startEventTask() {
    const evento = getEventoActual();
    const btn = document.getElementById("event-btn");
    const tipo = btn.getAttribute('data-tipo') || evento.tipo;
    const requeridos = parseInt(btn.getAttribute('data-requeridos') || evento.requeridos || 1);
    
    if (!tonConnectUI || !tonConnectUI.connected) {
        alert("❌ Conecta tu wallet primero para participar");
        return;
    }
    
    // Inicializar progreso si no existe
    if (!userData.event_progress) userData.event_progress = {};
    if (!userData.event_progress[evento.nombre]) userData.event_progress[evento.nombre] = 0;
    
    let progresoActual = userData.event_progress[evento.nombre];
    
    // Según el tipo de evento
    if (tipo === 'ads') {
        // Anuncios de Adsgram
        if (!adsReady || !AdController) {
            alert("❌ Sistema de anuncios no disponible");
            return;
        }
        
        try {
            const result = await AdController.show();
            if (result.done) {
                progresoActual++;
                userData.event_progress[evento.nombre] = progresoActual;
                
                if (progresoActual >= requeridos) {
                    const recompensa = esPremium() ? evento.premium : evento.recompensa;
                    userData.diamonds += recompensa;
                    userData.event_progress[evento.nombre] = 0; // Resetear progreso
                    await saveUserData();
                    actualizarUI();
                    alert(`✅ ¡Evento completado! Ganaste +${recompensa} 💎`);
                    closeAll();
                } else {
                    await saveUserData();
                    actualizarUI();
                    alert(`✅ Progreso: ${progresoActual}/${requeridos} anuncios vistos`);
                    // Actualizar barra de progreso
                    const porcentaje = (progresoActual / requeridos) * 100;
                    const bar = document.getElementById("event-progress-bar");
                    const text = document.getElementById("event-progress-text");
                    if (bar) bar.style.width = `${porcentaje}%`;
                    if (text) text.textContent = `${progresoActual}/${requeridos} completado`;
                }
            }
        } catch (error) {
            console.error("❌ Error en anuncio:", error);
        }
        
    } else if (tipo === 'subscribe') {
        // Suscripción a canal
        const canalLink = "https://t.me/toncity_oficial";
        window.open(canalLink, '_blank');
        
        setTimeout(() => {
            if (confirm("¿Ya te suscribiste al canal?")) {
                const recompensa = esPremium() ? evento.premium : evento.recompensa;
                userData.diamonds += recompensa;
                saveUserData();
                actualizarUI();
                alert(`✅ ¡+${recompensa} diamantes por suscribirte!`);
                closeAll();
            }
        }, 5000);
        
    } else if (tipo === 'share') {
        // Compartir enlace
        const enlace = `https://t.me/ton_city_bot?start=evento_${evento.nombre}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Ton City Game',
                text: `🎮 ¡Únete al evento de ${evento.nombre} en Ton City!`,
                url: enlace
            }).then(() => {
                progresoActual++;
                userData.event_progress[evento.nombre] = progresoActual;
                
                if (progresoActual >= requeridos) {
                    const recompensa = esPremium() ? evento.premium : evento.recompensa;
                    userData.diamonds += recompensa;
                    userData.event_progress[evento.nombre] = 0;
                    saveUserData();
                    actualizarUI();
                    alert(`✅ ¡Evento completado! +${recompensa} 💎`);
                    closeAll();
                } else {
                    saveUserData();
                    actualizarUI();
                    alert(`✅ Progreso: ${progresoActual}/${requeridos} compartidos`);
                    // Actualizar barra de progreso
                    const porcentaje = (progresoActual / requeridos) * 100;
                    const bar = document.getElementById("event-progress-bar");
                    const text = document.getElementById("event-progress-text");
                    if (bar) bar.style.width = `${porcentaje}%`;
                    if (text) text.textContent = `${progresoActual}/${requeridos} completado`;
                }
            });
        } else {
            navigator.clipboard.writeText(enlace);
            alert("📋 Enlace copiado al portapapeles");
            
            setTimeout(() => {
                if (confirm("¿Ya compartiste el enlace?")) {
                    progresoActual++;
                    userData.event_progress[evento.nombre] = progresoActual;
                    
                    if (progresoActual >= requeridos) {
                        const recompensa = esPremium() ? evento.premium : evento.recompensa;
                        userData.diamonds += recompensa;
                        userData.event_progress[evento.nombre] = 0;
                        saveUserData();
                        actualizarUI();
                        alert(`✅ ¡Evento completado! +${recompensa} 💎`);
                        closeAll();
                    } else {
                        saveUserData();
                        actualizarUI();
                        alert(`✅ Progreso: ${progresoActual}/${requeridos} compartidos`);
                    }
                }
            }, 3000);
        }
        
    } else if (tipo === 'survey') {
        // Encuesta
        alert("📝 Abriendo encuesta...");
        window.open("https://forms.gle/tu_encuesta_aqui", '_blank');
        
        setTimeout(() => {
            if (confirm("¿Completaste la encuesta?")) {
                const recompensa = esPremium() ? evento.premium : evento.recompensa;
                userData.diamonds += recompensa;
                saveUserData();
                actualizarUI();
                alert(`✅ ¡+${recompensa} diamantes por tu opinión!`);
                closeAll();
            }
        }, 10000);
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
// SISTEMA DE LÍMITES
// ==========================================
function puedeJugar(juegoId, cantidad = 1) {
    if (userData.haInvertido) return true;
    
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = {
            highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0,
            fecha: hoy
        };
    }
    
    const limites = { highlow: 20, ruleta: 15, tragaperras: 30, dados: 20, loteria: 5 };
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
            highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, loteria: 0,
            fecha: hoy
        };
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

function getMinDiamondsFor5TON() {
    return Math.ceil(5 / calcularTasaRetiro());
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
        
        const statusElem = document.getElementById("withdraw-status");
        if (!enVentanaRetiro()) {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #f97316;"></i> ⏳ Espera al DOMINGO';
        } else {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i> ✅ Reparto disponible';
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
        document.getElementById("withdraw-status").innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i> Error al cargar';
    }
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
            if (esPremium()) actualizarPremiumUI();
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
                event_progress: {}
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
                event_progress: data.event_progress || {}
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
// CASINO - JUEGOS
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
    
    document.getElementById('hl-number').textContent = numero.toString().padStart(4, '0');
    
    let ganancia = apuesta * 2;
    if (esPremium()) ganancia *= 2;
    
    if (gana) {
        userData.diamonds += ganancia;
        document.getElementById('hl-result').innerHTML = '<span class="win-message">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('hl-result').innerHTML = '<span class="lose-message">😞 Has perdido</span>';
    }
    
    registrarJugada('highlow');
    actualizarUI();
    saveUserData();
}

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
    
    let numero = Math.random() < 0.03 ? 0 : Math.floor(Math.random() * 37);
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
            const num = parseInt(prompt("Elige un número del 0 al 36:", "7"));
            if (num >= 0 && num <= 36) gana = numero === num;
            else {
                userData.diamonds += apuesta;
                actualizarUI();
                return;
            }
            break;
    }
    
    let ganancia = tipo === 'numero' && gana ? apuesta * 36 : apuesta * 2;
    if (esPremium()) ganancia *= 2;
    
    if (gana) {
        userData.diamonds += ganancia;
        document.getElementById('ruleta-result').innerHTML = '<span class="win-message">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('ruleta-result').innerHTML = '<span class="lose-message">😞 Has perdido</span>';
    }
    
    registrarJugada('ruleta');
    actualizarUI();
    saveUserData();
}

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
        let acum = 0;
        for (const s of simbolos) {
            acum += s.rareza;
            if (rand < acum) {
                rodillos.push(s);
                break;
            }
        }
    }
    
    document.getElementById('slot1').textContent = rodillos[0].nombre;
    document.getElementById('slot2').textContent = rodillos[1].nombre;
    document.getElementById('slot3').textContent = rodillos[2].nombre;
    
    if (rodillos[0].nombre === rodillos[1].nombre && rodillos[1].nombre === rodillos[2].nombre) {
        let mult = rodillos[0].mult;
        if (esPremium()) mult *= 2;
        
        userData.diamonds += apuesta * mult;
        document.getElementById('tragaperras-result').innerHTML = `<span class="win-message">🎉 ¡GANASTE! x${mult}</span>`;
    } else {
        document.getElementById('tragaperras-result').innerHTML = '<span class="lose-message">😞 No hay premio</span>';
    }
    
    registrarJugada('tragaperras');
    actualizarUI();
    saveUserData();
}

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
    
    let dado1 = Math.floor(Math.random() * 6) + 1;
    let dado2 = Math.floor(Math.random() * 6) + 1;
    
    const caras = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    document.getElementById('dado1').textContent = caras[dado1 - 1];
    document.getElementById('dado2').textContent = caras[dado2 - 1];
    
    const suma = dado1 + dado2;
    document.getElementById('dados-suma').textContent = `Suma: ${suma}`;
    
    let gana = false;
    if (eleccion === 'menor' && suma >= 2 && suma <= 6) gana = true;
    if (eleccion === 'mayor' && suma >= 8 && suma <= 12) gana = true;
    if (eleccion === 'exacto' && suma === 7) gana = true;
    
    if (gana) {
        let ganancia = eleccion === 'exacto' ? apuesta * 5 : apuesta * 2;
        if (esPremium()) ganancia *= 2;
        
        userData.diamonds += ganancia;
        document.getElementById('dados-result').innerHTML = '<span class="win-message">🎉 ¡GANASTE!</span>';
    } else {
        document.getElementById('dados-result').innerHTML = '<span class="lose-message">😞 Has perdido</span>';
    }
    
    registrarJugada('dados');
    actualizarUI();
    saveUserData();
}

function comprarBoletos() {
    const cantidad = apuestaActual.loteria;
    const costoTotal = cantidad * 5;
    
    if (userData.diamonds < costoTotal) {
        alert("❌ No tienes suficientes diamantes");
        return;
    }
    
    if (!puedeJugar('loteria', cantidad)) {
        alert("❌ Límite diario alcanzado");
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
    
    const numeroGanador = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    document.getElementById('loteria-number').textContent = numeroGanador;
    
    let premioTotal = 0;
    const resultados = [];
    
    boletosComprados.forEach(boleto => {
        let coinc = 0;
        for (let i = 0; i < 4; i++) if (boleto[i] === numeroGanador[i]) coinc++;
        
        let premio = 0;
        switch(coinc) {
            case 4: premio = 5 * 500; break;
            case 3: premio = 5 * 50; break;
            case 2: premio = 5 * 5; break;
            case 1: premio = 5; break;
        }
        
        if (esPremium()) premio *= 2;
        
        premioTotal += premio;
        if (premio > 0) {
            resultados.push(`<span style="color: #4ade80;">${boleto} → +${premio}💎 (${coinc} coincidencias)</span>`);
        }
    });
    
    if (premioTotal > 0) userData.diamonds += premioTotal;
    
    let html = '<p style="color: #94a3b8;">Resultados:</p>';
    if (resultados.length > 0) {
        html += resultados.join('<br>');
        html += `<br><span style="color: #facc15; font-weight: bold;">Total: +${premioTotal}💎</span>`;
    } else {
        html += '<span class="lose-message">😞 No ganaste</span>';
    }
    
    document.getElementById('loteria-result').innerHTML = html;
    
    boletosComprados = [];
    actualizarUI();
    saveUserData();
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
            event_progress: userData.event_progress || {}
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

// EXPORTAR FUNCIONES GLOBALES
window.openCentral = openCentral;
window.openStore = () => { renderPremiumPlans(); showModal("modalStore"); };
window.openBank = () => { renderBank(); showModal("modalBank"); };
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.openDailyReward = openDailyReward;
window.openCasino = openCasino;
window.openBuilding = openBuilding;
window.abrirModalEvento = abrirModalEvento;
window.startEventTask = startEventTask;
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

console.log("✅ Ton City Game - Versión completa con eventos funcionales");
