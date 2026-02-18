// ==========================================
// CONFIGURACIÓN PARA KOYEB (PUERTO 8000)
// ==========================================
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8000;

// Servir archivos estáticos
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));

// ==========================================
// CONFIGURACIÓN ADSGRAM
// ==========================================
const ADSGRAM_BLOCK_ID = '23186';
const ADSGRAM_REWARD = 30; // Recompensa de 30 diamantes por anuncio

// Solo ejecutamos el resto si estamos en un navegador
if (typeof window !== 'undefined') {

// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

const tg = window.Telegram.WebApp;

// Direcciones de billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQBuoEgT5DmcoEQ_nl6YwR0Q86fZWY4baACuX80EegWG49h2";
// TON Connect
let tonConnectUI = null;
let currentWallet = null;

// Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// TON API
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io';

// =======================
// ESTADO GLOBAL (CON EDIFICIOS NUEVOS)
// =======================
let userData = {
    id: null,
    username: "Usuario",
    diamonds: 0,
    lvl_tienda: 0,
    lvl_casino: 0,
    lvl_piscina: 0,
    lvl_parque: 0,
    lvl_diversion: 0,
    lvl_escuela: 0,    // NUEVO
    lvl_hospital: 0,   // NUEVO
    referral_code: null,
    last_online: null,
    last_production_update: null,
    last_ad_watch: null,
    daily_streak: 0,
    last_daily_claim: null
};

// Pool global REAL (solo para retiros)
let globalPoolData = {
    pool_ton: 0,
    total_diamonds: 0,
    last_updated: null
};

// Configuración de producción (CON EDIFICIOS NUEVOS)
const PROD_VAL = { 
    tienda: 10, 
    casino: 25, 
    piscina: 60, 
    parque: 15, 
    diversion: 120,
    escuela: 40,      // NUEVO
    hospital: 80       // NUEVO
};

// =======================
// FUNCIONES DE PRODUCCIÓN OFFLINE
// =======================
function getTotalProductionPerHour() {
    return (userData.lvl_tienda * PROD_VAL.tienda) +
           (userData.lvl_casino * PROD_VAL.casino) +
           (userData.lvl_piscina * PROD_VAL.piscina) +
           (userData.lvl_parque * PROD_VAL.parque) +
           (userData.lvl_diversion * PROD_VAL.diversion) +
           (userData.lvl_escuela * PROD_VAL.escuela) +     // NUEVO
           (userData.lvl_hospital * PROD_VAL.hospital);    // NUEVO
}

async function calculateOfflineProduction() {
    if (!userData.last_production_update) return 0;
    
    const now = new Date();
    const lastUpdate = new Date(userData.last_production_update);
    const secondsPassed = Math.floor((now - lastUpdate) / 1000);
    
    if (secondsPassed < 1) return 0;
    
    const totalPerHour = getTotalProductionPerHour();
    return (totalPerHour / 3600) * secondsPassed;
}

// =======================
// FUNCIONES DE ADSGRAM (RECOMPENSA 30 DIAMANTES)
// =======================
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
    
    return Math.ceil((2 - horasPasadas) * 60);
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

function showAdsModal() {
    showModal("modalAds");
    actualizarEstadoAnuncio();
}

function actualizarEstadoAnuncio() {
    const statusElem = document.getElementById("ads-status");
    const timerElem = document.getElementById("ads-timer-display");
    const btnElem = document.getElementById("watch-ad-btn");
    
    if (!statusElem || !timerElem || !btnElem) return;
    
    if (puedeVerAnuncio()) {
        statusElem.innerHTML = `<span style="color: #4ade80;">✅ ¡Anuncio disponible! Gana ${ADSGRAM_REWARD} 💎</span>`;
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

async function watchAd() {
    try {
        if (!puedeVerAnuncio()) {
            alert(`❌ Debes esperar ${tiempoRestanteAnuncio()} minutos`);
            return;
        }

        if (typeof Adsgram === 'undefined') {
            alert("❌ Adsgram no está cargado");
            return;
        }

        const adsgram = new Adsgram({ blockId: ADSGRAM_BLOCK_ID });
        const result = await adsgram.show();
        
        if (result && result.done) {
            userData.diamonds += ADSGRAM_REWARD; // 30 diamantes
            userData.last_ad_watch = new Date().toISOString();
            
            await saveUserData();
            
            actualizarUI();
            actualizarTimerParque();
            actualizarEstadoAnuncio();
            
            alert(`✅ ¡Ganaste ${ADSGRAM_REWARD} diamantes!`);
        } else {
            alert("⚠️ No completaste el anuncio");
        }

    } catch (error) {
        console.error("❌ Error en anuncio:", error);
        if (error.message?.includes('No ads')) {
            alert("😔 No hay anuncios disponibles");
        } else {
            alert("❌ Error al cargar el anuncio");
        }
    }
}

// =======================
// FUNCIONES PRINCIPALES
// =======================
async function initApp() {
    console.log("🚀 Iniciando aplicación...");
    
    try {
        tg.expand();
        
        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log("✅ Usuario detectado:", user.username);
            await loadUser(user);
        } else {
            document.getElementById("user-display").textContent = "Invitado";
            showError("Abre desde Telegram");
        }
        
        await initTONConnect();
        await loadRealGlobalPool();
        
        // Calcular producción offline
        const offlineEarnings = await calculateOfflineProduction();
        if (offlineEarnings > 0) {
            userData.diamonds += offlineEarnings;
            console.log(`💰 Producción offline: +${offlineEarnings.toFixed(2)} 💎`);
        }
        
        userData.last_production_update = new Date().toISOString();
        
        startProduction();
        actualizarTimerParque();
        
    } catch (error) {
        console.error("❌ Error en initApp:", error);
    }
}

// =======================
// TON CONNECT
// =======================
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
        });
        
    } catch (error) {
        console.error("❌ Error en TON Connect:", error);
    }
}

function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        
        if (!walletInfo) return;
        
        if (wallet) {
            if (connectButton) connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');
            walletInfo.classList.add('visible');
        } else {
            if (connectButton) connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
            walletInfo.classList.remove('visible');
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
            showMessage("✅ Wallet desconectada");
        }
    } catch (error) {
        console.error("❌ Error desconectando:", error);
        currentWallet = null;
        updateWalletUI(null);
        showMessage("✅ Desconectado localmente");
    }
}

// =======================
// FUNCIONES DEL POOL REAL
// =======================
async function getRealWalletBalance(walletAddress) {
    try {
        const response = await fetch(`${TON_API_URL}/v2/accounts/${walletAddress}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        
        const data = await response.json();
        return (data.balance || 0) / 1000000000;
    } catch (error) {
        console.error("❌ Error obteniendo balance:", error);
        return 100;
    }
}

async function loadRealGlobalPool() {
    try {
        const realBalance = await getRealWalletBalance(BILLETERA_POOL);
        
        let totalDiamondsAllUsers = 0;
        
        const { data } = await _supabase
            .from("game_data")
            .select("diamonds")
            .neq("telegram_id", "MASTER");
            
        if (data) {
            totalDiamondsAllUsers = data.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
        }
        
        globalPoolData = {
            pool_ton: realBalance,
            total_diamonds: totalDiamondsAllUsers || 100000,
            last_updated: new Date().toISOString()
        };
        
        return globalPoolData;
    } catch (error) {
        console.error("❌ Error cargando pool:", error);
        globalPoolData = { pool_ton: 100, total_diamonds: 100000, last_updated: new Date().toISOString() };
        return globalPoolData;
    }
}

// =======================
// PRECIO Y RETIROS
// =======================
const PRECIO_COMPRA = 0.008;

function getValorDiamanteEnTON() {
    if (!globalPoolData || globalPoolData.pool_ton <= 0 || globalPoolData.total_diamonds <= 0) {
        return 0.001;
    }
    return globalPoolData.pool_ton / globalPoolData.total_diamonds;
}

function getDiamantesPor1TON() {
    const valor = getValorDiamanteEnTON();
    return Math.ceil(1 / valor);
}

// =======================
// CARGAR USUARIO (CON EDIFICIOS NUEVOS)
// =======================
async function loadUser(user) {
    try {
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        userData.referral_code = referralCode;
        
        const now = new Date();
        
        let { data } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();

        if (data) {
            userData = { 
                ...userData, 
                ...data,
                diamonds: Number(data.diamonds) || 0,
                lvl_tienda: Number(data.lvl_tienda) || 0,
                lvl_casino: Number(data.lvl_casino) || 0,
                lvl_piscina: Number(data.lvl_piscina) || 0,
                lvl_parque: Number(data.lvl_parque) || 0,
                lvl_diversion: Number(data.lvl_diversion) || 0,
                lvl_escuela: Number(data.lvl_escuela) || 0,        // NUEVO
                lvl_hospital: Number(data.lvl_hospital) || 0,      // NUEVO
                last_production_update: data.last_production_update || now.toISOString(),
                last_ad_watch: data.last_ad_watch || null
            };
        } else {
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                lvl_escuela: 0,        // NUEVO
                lvl_hospital: 0,        // NUEVO
                referral_code: referralCode,
                last_production_update: now.toISOString(),
                last_online: now.toISOString()
            }]);
        }
        
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        updateReferralUI();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

// =======================
// BANCO
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        updateWalletUI(currentWallet);
        
        const isConnected = !!currentWallet;
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio de compra</b></span>
                      <span><b>${PRECIO_COMPRA.toFixed(3)} TON/💎</b></span>
                    </div>`;
        
        const opciones = [
            { ton: 0.10, diamantes: 100 },
            { ton: 0.50, diamantes: 500 },
            { ton: 1.00, diamantes: 1000 },
            { ton: 2.00, diamantes: 2000 },
            { ton: 5.00, diamantes: 5000 },
            { ton: 10.00, diamantes: 10000 }
        ];
        
        opciones.forEach(opcion => {
            const buttonText = isConnected ? 'COMPRAR' : 'CONECTAR';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;' :
                'background: #475569; color: #94a3b8; border: none; padding: 10px 16px; border-radius: 8px; cursor: not-allowed;';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'}; padding: 12px;">
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 1.1rem;">${opcion.ton.toFixed(2)} TON</strong>
                    <span style="color: #94a3b8; font-size: 0.9rem;">Recibes ${opcion.diamantes} 💎</span>
                </div>
                <button onclick="comprarTON(${opcion.ton})"
                        style="${buttonStyle} min-width: 100px;"
                        ${!isConnected ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            </div>`;
        });
        
        document.getElementById("bankList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error abriendo banco:", error);
        showError("Error al cargar banco");
    }
}

async function comprarTON(tonAmount) {
    if (!currentWallet) {
        return showError("❌ Conecta tu billetera primero");
    }
    
    const diamantes = Math.floor(tonAmount / PRECIO_COMPRA);
    
    const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            { address: BILLETERA_POOL, amount: Math.floor(tonAmount * 0.8 * 1e9).toString() },
            { address: BILLETERA_PROPIETARIO, amount: Math.floor(tonAmount * 0.2 * 1e9).toString() }
        ]
    };
    
    try {
        await tonConnectUI.sendTransaction(tx);
        userData.diamonds += diamantes;
        await saveUserData();
        actualizarUI();
        showMessage(`✅ Compra exitosa! +${diamantes} 💎`);
    } catch (e) {
        showError("❌ Error en transacción");
    }
}

// =======================
// RETIRO
// =======================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        await loadRealGlobalPool();
        
        const valor = getValorDiamanteEnTON();
        const minimo = getDiamantesPor1TON();
        const misDiamantes = Math.floor(userData.diamonds || 0);
        
        document.getElementById("current-price").textContent = `1 💎 = ${valor.toFixed(6)} TON`;
        document.getElementById("available-diamonds").textContent = `${misDiamantes} 💎`;
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minimo;
            input.max = misDiamantes;
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        updateWithdrawCalculation();
        
    } catch (error) {
        console.error("❌ Error abriendo retiro:", error);
        showError("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    const input = document.getElementById("withdraw-amount");
    if (!input) return;
    
    const diamantes = parseInt(input.value) || 0;
    const tonElem = document.getElementById("ton-receive");
    if (!tonElem) return;
    
    const valor = getValorDiamanteEnTON();
    const minimo = getDiamantesPor1TON();
    const misDiamantes = Math.floor(userData.diamonds || 0);
    
    if (diamantes < minimo) {
        tonElem.innerHTML = `<span style="color: #ef4444;">Mínimo: ${minimo} 💎</span>`;
        return;
    }
    
    if (diamantes > misDiamantes) {
        tonElem.innerHTML = `<span style="color: #ef4444;">Máx: ${misDiamantes} 💎</span>`;
        return;
    }
    
    const tonRecibido = diamantes * valor;
    tonElem.textContent = tonRecibido.toFixed(4);
}

async function processWithdraw() {
    const input = document.getElementById("withdraw-amount");
    const diamantes = parseInt(input?.value || 0);
    
    if (!diamantes || diamantes <= 0) {
        return showError("❌ Cantidad inválida");
    }
    
    const valor = getValorDiamanteEnTON();
    const minimo = getDiamantesPor1TON();
    
    if (diamantes < minimo) {
        return showError(`❌ Mínimo: ${minimo} 💎`);
    }
    
    const tonRecibido = diamantes * valor;
    
    if (!confirm(`¿Retirar ${diamantes} 💎 por ${tonRecibido.toFixed(4)} TON?`)) return;
    
    userData.diamonds -= diamantes;
    await saveUserData();
    
    closeAll();
    showMessage(`✅ Retiro procesado! Recibirás ${tonRecibido.toFixed(4)} TON`);
}

// =======================
// TIENDA (CON EDIFICIOS NUEVOS)
// =======================
async function openStore() {
    try {
        showModal("modalStore");
        
        const items = [
            {name: "Tienda", field: "tienda", price: 1000, prod: PROD_VAL.tienda, color: "#3b82f6", icon: "fa-store"},
            {name: "Casino", field: "casino", price: 2500, prod: PROD_VAL.casino, color: "#ef4444", icon: "fa-dice"},
            {name: "Piscina", field: "piscina", price: 5000, prod: PROD_VAL.piscina, color: "#38bdf8", icon: "fa-water-ladder"},
            {name: "Parque", field: "parque", price: 1500, prod: PROD_VAL.parque, color: "#10b981", icon: "fa-tree"},
            {name: "Diversión", field: "diversion", price: 10000, prod: PROD_VAL.diversion, color: "#f472b6", icon: "fa-gamepad"},
            {name: "Escuela", field: "escuela", price: 3000, prod: PROD_VAL.escuela, color: "#a78bfa", icon: "fa-school"},        // NUEVO
            {name: "Hospital", field: "hospital", price: 7500, prod: PROD_VAL.hospital, color: "#f87171", icon: "fa-hospital"}    // NUEVO
        ];
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>🏪 Tienda</b></span>
                      <span><b>${Math.floor(userData.diamonds || 0).toLocaleString()} 💎</b></span>
                    </div>`;
        
        items.forEach(item => {
            const lvl = userData[`lvl_${item.field}`] || 0;
            const canAfford = (userData.diamonds || 0) >= item.price;
            
            html += `
            <div class="store-item" style="border-left: 4px solid ${item.color};">
                <div class="store-item-header">
                    <div>
                        <i class="fa-solid ${item.icon}" style="color: ${item.color};"></i>
                        <strong>${item.name} Nvl ${lvl}</strong>
                    </div>
                    <span class="store-item-price">${item.price.toLocaleString()} 💎</span>
                </div>
                <p>+${item.prod} 💎/hora</p>
                <button onclick="buyUpgrade('${item.name}', '${item.field}', ${item.price})" 
                        style="background: ${canAfford ? item.color : '#475569'};"
                        ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? 'MEJORAR' : 'FONDOS INSUFICIENTES'}
                </button>
            </div>`;
        });
        
        document.getElementById("storeList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error abriendo tienda:", error);
        showError("Error cargando tienda");
    }
}

async function buyUpgrade(name, field, price) {
    if ((userData.diamonds || 0) < price) {
        return showError("❌ Diamantes insuficientes");
    }
    
    userData[`lvl_${field}`] = (userData[`lvl_${field}`] || 0) + 1;
    userData.diamonds -= price;
    
    await saveUserData();
    actualizarUI();
    openStore();
    showMessage(`✅ ${name} nivel ${userData[`lvl_${field}`]}`);
}

// =======================
// PRODUCCIÓN
// =======================
function startProduction() {
    setInterval(async () => {
        if (!userData.id) return;
        
        const totalPerHr = getTotalProductionPerHour();
        userData.diamonds += (totalPerHr / 3600);
        
        actualizarUI();
        
        if (document.getElementById("centralModal")?.style.display === "block") {
            updateCentralStats();
        }
    }, 1000);
}

// =======================
// EDIFICIO CENTRAL (CON EDIFICIOS NUEVOS)
// =======================
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
        escuela: (userData.lvl_escuela || 0) * PROD_VAL.escuela,        // NUEVO
        hospital: (userData.lvl_hospital || 0) * PROD_VAL.hospital      // NUEVO
    };
    const total = Object.values(prod).reduce((a, b) => a + b, 0);
    
    document.getElementById("s_tienda").textContent = prod.tienda;
    document.getElementById("s_casino").textContent = prod.casino;
    document.getElementById("s_piscina").textContent = prod.piscina;
    document.getElementById("s_parque").textContent = prod.parque;
    document.getElementById("s_diversion").textContent = prod.diversion;
    document.getElementById("s_escuela").textContent = prod.escuela;        // NUEVO
    document.getElementById("s_hospital").textContent = prod.hospital;      // NUEVO
    document.getElementById("s_total").textContent = total;
}

// =======================
// AMIGOS
// =======================
function openFriends() {
    showModal("modalFriends");
    updateReferralUI();
}

function copyReferralCode() {
    if (!userData.referral_code) return showError("Código no disponible");
    const link = `https://t.me/ton_city_bot?start=${userData.referral_code}`;
    navigator.clipboard.writeText(link).then(() => showMessage("✅ Enlace copiado!"));
}

// =======================
// FUNCIONES AUXILIARES
// =======================
async function saveUserData() {
    if (!userData.id) return;
    
    userData.last_production_update = new Date().toISOString();
    
    await _supabase.from('game_data').update({
        diamonds: Math.floor(userData.diamonds || 0),
        lvl_tienda: userData.lvl_tienda || 0,
        lvl_casino: userData.lvl_casino || 0,
        lvl_piscina: userData.lvl_piscina || 0,
        lvl_parque: userData.lvl_parque || 0,
        lvl_diversion: userData.lvl_diversion || 0,
        lvl_escuela: userData.lvl_escuela || 0,        // NUEVO
        lvl_hospital: userData.lvl_hospital || 0,      // NUEVO
        last_production_update: userData.last_production_update,
        last_online: new Date().toISOString()
    }).eq('telegram_id', userData.id);
}

function actualizarUI() {
    document.getElementById("diamonds").textContent = Math.floor(userData.diamonds || 0).toLocaleString();
    
    const totalPerHr = getTotalProductionPerHour();
    document.getElementById("rate").textContent = totalPerHr.toLocaleString();
    
    document.getElementById("lvl_casino").textContent = userData.lvl_casino || 0;
    document.getElementById("lvl_piscina").textContent = userData.lvl_piscina || 0;
    document.getElementById("lvl_parque").textContent = userData.lvl_parque || 0;
    document.getElementById("lvl_diversion").textContent = userData.lvl_diversion || 0;
    document.getElementById("lvl_escuela").textContent = userData.lvl_escuela || 0;        // NUEVO
    document.getElementById("lvl_hospital").textContent = userData.lvl_hospital || 0;      // NUEVO
}

function updateReferralUI() {
    const codeElem = document.getElementById("referral-code");
    if (codeElem) {
        codeElem.textContent = userData.referral_code || "REF" + (userData.id ? userData.id.slice(-6) : "000000");
    }
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw", "modalAds"].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = "none";
    });
}

function showMessage(text) { alert(text); }
function showError(text) { alert("❌ " + text); }

// =======================
// INICIALIZACIÓN
// =======================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado");
    setTimeout(initApp, 1000);
});

window.addEventListener('beforeunload', () => {
    saveUserData();
});

// Funciones globales
window.openBank = openBank;
window.openStore = openStore;
window.openCentral = openCentral;
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.showAdsModal = showAdsModal;
window.watchAd = watchAd;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.processWithdraw = processWithdraw;
window.updateWithdrawCalculation = updateWithdrawCalculation;
window.disconnectWallet = disconnectWallet;

console.log("✅ Ton City Game - Preparado para Adsgram con 30 diamantes por anuncio");

} // Cierre del if(window)
