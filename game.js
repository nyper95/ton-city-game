// ======================================================
// TON CITY GAME - VERSIÓN COMPLETA CON ADSGRAM
// ======================================================

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
console.log("✅ Ton City Game - Inicializando...");

const tg = window.Telegram.WebApp;

// ==========================================
// CONFIGURACIÓN DE BILLETERAS Y PRECIOS
// ==========================================
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; 
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";      
const PRECIO_COMPRA = 0.008; // 1 Diamante = 0.008 TON

// ==========================================
// CONFIGURACIÓN ADSGRAM
// ==========================================
const ADSGRAM_BLOCK_ID = 'INT-XXXXX'; // ← CAMBIA ESTO POR TU BLOCK ID REAL

// ==========================================
// CONFIGURACIÓN TÉCNICA
// ==========================================
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

let userData = {
    id: null,
    username: "Cargando...",
    diamonds: 0,
    lvl_tienda: 0, 
    lvl_casino: 0, 
    lvl_piscina: 0, 
    lvl_parque: 0, 
    lvl_diversion: 0,
    lvl_escuela: 0,
    lvl_hospital: 0,
    referral_code: null,
    last_online: null,
    last_withdraw_week: null,
    last_ad_watch: null // Para control de anuncios cada 2 horas
};

let globalPoolData = { 
    pool_ton: 0, 
    total_diamonds: 0 
};

const PROD_VAL = { 
    tienda: 10, 
    casino: 25, 
    piscina: 60, 
    parque: 15, 
    diversion: 120,
    escuela: 40,
    hospital: 80
};

// ==========================================
// SISTEMA DE ANUNCIOS (PARQUE)
// ==========================================

// Verificar si puede ver anuncio (cada 2 horas)
function puedeVerAnuncio() {
    if (!userData.last_ad_watch) return true;
    
    const ahora = new Date();
    const ultimo = new Date(userData.last_ad_watch);
    const horasPasadas = (ahora - ultimo) / (1000 * 60 * 60);
    
    return horasPasadas >= 2;
}

// Obtener tiempo restante para próximo anuncio
function tiempoRestanteAnuncio() {
    if (!userData.last_ad_watch) return 0;
    
    const ahora = new Date();
    const ultimo = new Date(userData.last_ad_watch);
    const horasPasadas = (ahora - ultimo) / (1000 * 60 * 60);
    
    if (horasPasadas >= 2) return 0;
    
    const minutosRestantes = Math.ceil((2 - horasPasadas) * 60);
    return minutosRestantes;
}

// Actualizar UI del temporizador del parque
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

// Mostrar modal de anuncios
function showAdsModal() {
    showModal("modalAds");
    actualizarEstadoAnuncio();
}

// Actualizar estado del anuncio en el modal
function actualizarEstadoAnuncio() {
    const statusElem = document.getElementById("ads-status");
    const timerElem = document.getElementById("ads-timer-display");
    const btnElem = document.getElementById("watch-ad-btn");
    
    if (!statusElem || !timerElem || !btnElem) return;
    
    if (puedeVerAnuncio()) {
        statusElem.innerHTML = '<span style="color: #4ade80;">✅ ¡Anuncio disponible! Gana 100 💎</span>';
        timerElem.innerHTML = '';
        btnElem.disabled = false;
        btnElem.style.background = "#f59e0b";
    } else {
        const minutos = tiempoRestanteAnuncio();
        statusElem.innerHTML = '<span style="color: #f97316;">⏳ Anuncio no disponible</span>';
        timerElem.innerHTML = `Próximo anuncio en: <span style="color: #f59e0b; font-weight: bold;">${minutos} minutos</span>`;
        btnElem.disabled = true;
        btnElem.style.background = "#475569";
    }
}

// Ver anuncio con Adsgram
async function watchAd() {
    try {
        if (!puedeVerAnuncio()) {
            alert(`❌ Debes esperar ${tiempoRestanteAnuncio()} minutos para el próximo anuncio`);
            return;
        }
        
        if (typeof Adsgram === 'undefined') {
            alert("❌ Adsgram no está cargado");
            return;
        }
        
        const adsgram = new Adsgram({ blockId: ADSGRAM_BLOCK_ID });
        
        await adsgram.show();
        
        // Sumar 100 diamantes
        userData.diamonds += 100;
        userData.last_ad_watch = new Date().toISOString();
        
        await saveUserData();
        
        actualizarUI();
        actualizarTimerParque();
        actualizarEstadoAnuncio();
        
        alert("✅ ¡Ganaste 100 diamantes!");
        
    } catch (error) {
        console.error("❌ Error en anuncio:", error);
        alert("❌ Error al ver el anuncio");
    }
}

// ==========================================
// SISTEMA DE CONTROL DE PRODUCCIÓN Y RETIROS
// ==========================================

function esDomingo() {
    const hoy = new Date();
    return hoy.getDay() === 0;
}

function enVentanaRetiro() {
    const dia = new Date().getDay();
    return dia === 0;
}

function produccionActiva() {
    return !enVentanaRetiro();
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
    const tasa = globalPoolData.pool_ton / globalPoolData.total_diamonds;
    return Math.max(tasa, 0.0001);
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
            console.log("✅ Usuario Telegram:", user.username || user.first_name);
            userData.id = user.id.toString();
            userData.username = user.username || user.first_name || "Usuario";
            
            const nameElem = document.getElementById("user-display");
            if (nameElem) nameElem.textContent = userData.username;
            
            await loadUserFromDB(user.id);
        } else {
            document.getElementById("user-display").textContent = "Invitado";
        }

        await initTONConnect();
        await updateGlobalPoolStats();
        await loadTotalDiamondsFromDB();
        
        renderStore();
        renderBank();
        
        startProduction(); 
        setInterval(saveUserData, 30000);
        
        actualizarBannerDomingo();
        actualizarTimerParque();
        
        // Iniciar intervalo para actualizar timer del parque
        setInterval(actualizarTimerParque, 60000); // Cada minuto
        
    } catch (error) {
        console.error("❌ Error en initApp:", error);
    }
}

function actualizarBannerDomingo() {
    const sundayBanner = document.getElementById("sunday-banner");
    const centralIndicator = document.getElementById("central-sunday-indicator");
    const adsBanner = document.getElementById("ads-banner");
    
    if (enVentanaRetiro()) {
        if (sundayBanner) sundayBanner.style.display = "block";
        if (centralIndicator) centralIndicator.style.display = "block";
        if (adsBanner) adsBanner.style.display = "none"; // Ocultar anuncios en domingo
    } else {
        if (sundayBanner) sundayBanner.style.display = "none";
        if (centralIndicator) centralIndicator.style.display = "none";
        // Mostrar banner de anuncios si hay disponibilidad
        if (adsBanner && puedeVerAnuncio()) {
            adsBanner.style.display = "block";
        } else if (adsBanner) {
            adsBanner.style.display = "none";
        }
    }
}

async function loadTotalDiamondsFromDB() {
    try {
        const { data, error } = await _supabase
            .from("game_data")
            .select("diamonds")
            .neq("telegram_id", "MASTER");
            
        if (!error && data) {
            globalPoolData.total_diamonds = data.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
            console.log(`💎 Total diamantes: ${globalPoolData.total_diamonds.toLocaleString()}`);
        }
    } catch (error) {
        console.error("❌ Error cargando total_diamonds:", error);
    }
}

async function loadUserFromDB(tgId) {
    try {
        const { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', tgId.toString())
            .single();

        if (data) {
            console.log("📁 Usuario encontrado en DB");
            userData = { 
                ...userData, 
                ...data, 
                id: tgId.toString(),
                diamonds: Number(data.diamonds) || 0,
                lvl_tienda: Number(data.lvl_tienda) || 0,
                lvl_casino: Number(data.lvl_casino) || 0,
                lvl_piscina: Number(data.lvl_piscina) || 0,
                lvl_parque: Number(data.lvl_parque) || 0,
                lvl_diversion: Number(data.lvl_diversion) || 0,
                lvl_escuela: Number(data.lvl_escuela) || 0,
                lvl_hospital: Number(data.lvl_hospital) || 0,
                last_withdraw_week: data.last_withdraw_week || null,
                last_ad_watch: data.last_ad_watch || null
            };
            
            if (!userData.referral_code) {
                userData.referral_code = 'REF' + userData.id.slice(-6);
            }
        } else {
            console.log("🆕 Creando nuevo usuario...");
            userData.referral_code = 'REF' + tgId.toString().slice(-6);
            
            await _supabase.from('game_data').insert([{
                telegram_id: tgId.toString(),
                username: userData.username,
                diamonds: 0,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                lvl_escuela: 0,
                lvl_hospital: 0,
                referral_code: userData.referral_code,
                last_online: new Date().toISOString(),
                last_withdraw_week: null,
                last_ad_watch: null
            }]);
        }
        actualizarUI();
        updateReferralUI();
        actualizarTimerParque();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
    }
}

// ==========================================
// LÓGICA DE TIENDA (CON NUEVOS EDIFICIOS)
// ==========================================
function renderStore() {
    const storeContainer = document.getElementById("storeList");
    if (!storeContainer) return;

    const upgrades = [
        { name: "Tienda", field: "tienda", price: 1000, prod: PROD_VAL.tienda, color: "#3b82f6", icon: "fa-store" },
        { name: "Casino", field: "casino", price: 2500, prod: PROD_VAL.casino, color: "#ef4444", icon: "fa-dice" },
        { name: "Piscina", field: "piscina", price: 5000, prod: PROD_VAL.piscina, color: "#38bdf8", icon: "fa-water-ladder" },
        { name: "Parque", field: "parque", price: 1500, prod: PROD_VAL.parque, color: "#10b981", icon: "fa-tree" },
        { name: "Diversión", field: "diversion", price: 10000, prod: PROD_VAL.diversion, color: "#f472b6", icon: "fa-gamepad" },
        { name: "Escuela", field: "escuela", price: 3000, prod: PROD_VAL.escuela, color: "#a78bfa", icon: "fa-school" },
        { name: "Hospital", field: "hospital", price: 7500, prod: PROD_VAL.hospital, color: "#f87171", icon: "fa-hospital" }
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
// SISTEMA DE PRODUCCIÓN
// ==========================================
function startProduction() {
    console.log("⚙️ Iniciando producción...");
    
    setInterval(() => {
        if (!userData.id) return;
        
        if (!produccionActiva()) {
            return;
        }
        
        const totalPerHr = 
            (userData.lvl_tienda * PROD_VAL.tienda) +
            (userData.lvl_casino * PROD_VAL.casino) +
            (userData.lvl_piscina * PROD_VAL.piscina) +
            (userData.lvl_parque * PROD_VAL.parque) +
            (userData.lvl_diversion * PROD_VAL.diversion) +
            (userData.lvl_escuela * PROD_VAL.escuela) +
            (userData.lvl_hospital * PROD_VAL.hospital);

        userData.diamonds += (totalPerHr / 3600);
        actualizarUI();
        
        if (document.getElementById("centralModal")?.style.display === "block") {
            updateCentralStats();
        }
    }, 1000);
}

// ==========================================
// EDIFICIO CENTRAL
// ==========================================
function openCentral() {
    updateCentralStats();
    showModal("centralModal");
}

function updateCentralStats() {
    const prod = {
        tienda: (userData.lvl_tienda || 0) * PROD_VAL.tienda,
        casino: (userData.lvl_casino || 0) * PROD_VAL.casino,
        piscina: (userData.lvl_piscina || 0) * PROD_VAL.piscina,
        parque: (userData.lvl_parque || 0) * PROD_VAL.parque,
        diversion: (userData.lvl_diversion || 0) * PROD_VAL.diversion,
        escuela: (userData.lvl_escuela || 0) * PROD_VAL.escuela,
        hospital: (userData.lvl_hospital || 0) * PROD_VAL.hospital
    };
    const total = Object.values(prod).reduce((a, b) => a + b, 0);

    const ids = {
        "s_tienda": prod.tienda,
        "s_casino": prod.casino,
        "s_piscina": prod.piscina,
        "s_parque": prod.parque,
        "s_diversion": prod.diversion,
        "s_escuela": prod.escuela,
        "s_hospital": prod.hospital,
        "s_total": total
    };

    Object.entries(ids).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = Math.floor(value).toLocaleString();
    });
}

// ==========================================
// AMIGOS Y REFERIDOS
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

// ==========================================
// TON CONNECT Y TRANSACCIONES
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

async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) {
        return alert("❌ Conecta tu wallet primero");
    }

    const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            { address: BILLETERA_POOL, amount: Math.floor(tonAmount * 0.8 * 1e9).toString() },
            { address: BILLETERA_PROPIETARIO, amount: Math.floor(tonAmount * 0.2 * 1e9).toString() }
        ]
    };

    try {
        await tonConnectUI.sendTransaction(tx);
        const comprados = Math.floor(tonAmount / PRECIO_COMPRA);
        userData.diamonds += comprados;
        await saveUserData();
        actualizarUI();
        alert(`✅ Compra exitosa! Recibiste ${comprados} 💎`);
    } catch (e) {
        console.error("❌ Error en transacción:", e);
        alert("❌ Error en la transacción");
    }
}

// ==========================================
// COMPRAR MEJORAS
// ==========================================
async function buyUpgrade(name, field, price) {
    if ((userData.diamonds || 0) < price) {
        return alert("❌ No tienes suficientes diamantes");
    }
    
    userData[`lvl_${field}`] = (userData[`lvl_${field}`] || 0) + 1;
    userData.diamonds -= price;
    
    await saveUserData();
    actualizarUI();
    renderStore();
    alert(`✅ ¡${name} nivel ${userData[`lvl_${field}`]}!`);
}

// ==========================================
// RETIROS SEMANALES
// ==========================================
async function openWithdraw() {
    try {
        if (!enVentanaRetiro()) {
            alert("❌ Los retiros solo están disponibles los DOMINGOS");
            return;
        }
        
        const semanaActual = getNumeroSemana();
        if (userData.last_withdraw_week === semanaActual) {
            alert("❌ Ya has retirado esta semana. Vuelve el próximo domingo.");
            return;
        }
        
        showModal("modalWithdraw");
        
        await updateGlobalPoolStats();
        await loadTotalDiamondsFromDB();
        
        const tasa = calcularTasaRetiro();
        const poolTon = globalPoolData.pool_ton;
        const totalDiamantes = globalPoolData.total_diamonds;
        const misDiamantes = Math.floor(userData.diamonds || 0);
        
        document.getElementById("week-indicator").textContent = `Semana #${semanaActual}`;
        document.getElementById("pool-amount").textContent = `${poolTon.toFixed(4)} TON`;
        document.getElementById("total-diamonds").textContent = `${totalDiamantes.toLocaleString()} 💎`;
        document.getElementById("current-price").textContent = `${tasa.toFixed(6)} TON/💎`;
        document.getElementById("available-diamonds").textContent = `${misDiamantes} 💎`;
        
        const statusElem = document.getElementById("withdraw-status");
        if (userData.last_withdraw_week === semanaActual) {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #ef4444;"></i> Ya retiraste esta semana';
        } else {
            statusElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i> Puedes retirar hoy';
        }
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.max = misDiamantes;
            input.removeEventListener('input', updateWithdrawCalculation);
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        updateWithdrawCalculation();
        
    } catch (error) {
        console.error("❌ Error abriendo retiro:", error);
        alert("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        if (!input) return;
        
        const diamantes = parseInt(input.value) || 0;
        const tonElem = document.getElementById("ton-receive");
        if (!tonElem) return;
        
        const tasa = calcularTasaRetiro();
        const misDiamantes = Math.floor(userData.diamonds || 0);
        const poolDisponible = globalPoolData.pool_ton;
        
        if (diamantes <= 0) {
            tonElem.textContent = "0.0000";
            return;
        }
        
        if (diamantes > misDiamantes) {
            tonElem.innerHTML = `<span style="color: #ef4444;">Máx: ${misDiamantes} 💎</span>`;
            return;
        }
        
        const tonRecibido = diamantes * tasa;
        
        if (tonRecibido > poolDisponible) {
            const maxDiamantes = Math.floor(poolDisponible / tasa);
            tonElem.innerHTML = `<span style="color: #ef4444;">Pool insuficiente (máx ${maxDiamantes} 💎)</span>`;
            return;
        }
        
        tonElem.textContent = tonRecibido.toFixed(4);
        
    } catch (error) {
        console.error("❌ Error en cálculo:", error);
    }
}

async function processWithdraw() {
    try {
        if (!enVentanaRetiro()) {
            alert("❌ Los retiros solo están disponibles los DOMINGOS");
            return;
        }
        
        const semanaActual = getNumeroSemana();
        if (userData.last_withdraw_week === semanaActual) {
            alert("❌ Ya has retirado esta semana");
            return;
        }
        
        const input = document.getElementById("withdraw-amount");
        const diamantes = parseInt(input?.value || 0);
        const misDiamantes = Math.floor(userData.diamonds || 0);
        
        if (!diamantes || diamantes <= 0 || diamantes > misDiamantes) {
            alert("❌ Cantidad inválida");
            return;
        }
        
        const tasa = calcularTasaRetiro();
        const tonRecibido = diamantes * tasa;
        
        if (tonRecibido > globalPoolData.pool_ton) {
            alert("❌ No hay suficiente TON en el pool");
            return;
        }
        
        if (!confirm(`¿Retirar ${diamantes.toLocaleString()} 💎 por ${tonRecibido.toFixed(4)} TON?`)) return;
        
        userData.diamonds -= diamantes;
        userData.last_withdraw_week = semanaActual;
        
        await saveUserData();
        
        const newPoolTon = globalPoolData.pool_ton - tonRecibido;
        await _supabase
            .from("game_data")
            .update({ pool_ton: newPoolTon })
            .eq("telegram_id", "MASTER");
        
        globalPoolData.pool_ton = newPoolTon;
        
        actualizarUI();
        closeAll();
        
        alert(`✅ Retiro exitoso! Recibirás ${tonRecibido.toFixed(4)} TON`);
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        alert("Error al procesar retiro");
    }
}

// ==========================================
// UTILIDADES DE UI
// ==========================================
function actualizarUI() {
    const dElem = document.getElementById("diamonds");
    if (dElem) dElem.textContent = Math.floor(userData.diamonds || 0).toLocaleString();
    
    const rElem = document.getElementById("rate");
    if (rElem) {
        const totalPerHr = 
            (userData.lvl_tienda * PROD_VAL.tienda) + 
            (userData.lvl_casino * PROD_VAL.casino) + 
            (userData.lvl_piscina * PROD_VAL.piscina) + 
            (userData.lvl_parque * PROD_VAL.parque) + 
            (userData.lvl_diversion * PROD_VAL.diversion) +
            (userData.lvl_escuela * PROD_VAL.escuela) +
            (userData.lvl_hospital * PROD_VAL.hospital);
        rElem.textContent = Math.floor(totalPerHr).toLocaleString();
    }
    
    const niveles = {
        "lvl_casino": userData.lvl_casino,
        "lvl_piscina": userData.lvl_piscina,
        "lvl_parque": userData.lvl_parque,
        "lvl_diversion": userData.lvl_diversion,
        "lvl_escuela": userData.lvl_escuela,
        "lvl_hospital": userData.lvl_hospital
    };
    
    Object.entries(niveles).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 0;
    });
}

function updateReferralUI() {
    const codeElem = document.getElementById("referral-code");
    if (codeElem) codeElem.textContent = userData.referral_code || "NO DISPONIBLE";
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw", "modalAds"].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = "none";
    });
}

async function saveUserData() {
    if (!userData.id) return;
    
    try {
        await _supabase.from('game_data').update({
            diamonds: Math.floor(userData.diamonds || 0),
            lvl_tienda: userData.lvl_tienda || 0,
            lvl_casino: userData.lvl_casino || 0,
            lvl_piscina: userData.lvl_piscina || 0,
            lvl_parque: userData.lvl_parque || 0,
            lvl_diversion: userData.lvl_diversion || 0,
            lvl_escuela: userData.lvl_escuela || 0,
            lvl_hospital: userData.lvl_hospital || 0,
            last_online: new Date().toISOString(),
            last_withdraw_week: userData.last_withdraw_week,
            last_ad_watch: userData.last_ad_watch
        }).eq('telegram_id', userData.id);
    } catch (error) {
        console.error("❌ Error guardando:", error);
    }
}

async function updateGlobalPoolStats() {
    try {
        const res = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        const data = await res.json();
        globalPoolData.pool_ton = (data.balance || 0) / 1e9;
        console.log(`💰 Pool: ${globalPoolData.pool_ton.toFixed(4)} TON`);
    } catch (e) { 
        console.error("Error obteniendo pool stats:", e); 
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado");
    setTimeout(initApp, 500);
});

// EXPORTAR FUNCIONES GLOBALES
window.openCentral = openCentral;
window.openStore = () => { renderStore(); showModal("modalStore"); };
window.openBank = () => { renderBank(); showModal("modalBank"); };
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.showAdsModal = showAdsModal;
window.watchAd = watchAd;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.disconnectWallet = disconnectWallet;
window.processWithdraw = processWithdraw;
window.updateWithdrawCalculation = updateWithdrawCalculation;

console.log("✅ Ton City Game - Versión completa con Adsgram, Escuela y Hospital");
