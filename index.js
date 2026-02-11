// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// Direcciones de billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";

// TON API - ¡TU API KEY AHORA FUNCIONANDO!
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io/v2';

// TON Connect
let tonConnectUI = null;
let currentWallet = null;

// Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =======================
// ESTADO GLOBAL
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
    referral_code: null,
    referred_by: null,
    referral_earnings: 0,
    last_online: null
};

let globalPoolData = {
    pool_ton: 100,
    total_diamonds: 100000,
    last_updated: null
};

// Configuración
const USER_SHARE = 0.8;
const PROD_VAL = { tienda:10, casino:25, piscina:60, parque:15, diversion:120 };

// =======================
// FUNCIÓN CRÍTICA: OBTENER BALANCE REAL DE LA WALLET
// =======================
async function getRealPoolBalance() {
    try {
        console.log("💰 Consultando balance REAL de la wallet pool...");
        console.log("📍 Wallet:", BILLETERA_POOL);
        
        // Usar Tonapi.io con tu API key
        const response = await fetch(`${TON_API_URL}/accounts/${BILLETERA_POOL}`, {
            headers: {
                'Authorization': `Bearer ${TON_API_KEY}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // El balance viene en nanoton (1 TON = 1,000,000,000 nanoton)
        const balanceNanoton = data.balance || 0;
        const balanceTon = balanceNanoton / 1000000000;
        
        console.log(`✅ Balance REAL del pool: ${balanceTon.toFixed(4)} TON`);
        console.log(`📊 Datos completos:`, data);
        
        return balanceTon;
        
    } catch (error) {
        console.error("❌ Error obteniendo balance real:", error);
        
        // Fallback: intentar con API pública de toncenter
        try {
            console.log("🔄 Intentando fallback con toncenter.com...");
            const fallbackResponse = await fetch(
                `https://toncenter.com/api/v2/getAddressInformation?address=${BILLETERA_POOL}`
            );
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.ok && fallbackData.result) {
                const balanceTon = fallbackData.result.balance / 1000000000;
                console.log(`✅ Balance via fallback: ${balanceTon.toFixed(4)} TON`);
                return balanceTon;
            }
        } catch (fallbackError) {
            console.error("❌ Error en fallback:", fallbackError);
        }
        
        // Si todo falla, usar el último valor conocido de Supabase
        console.warn("⚠️ Usando último valor conocido de Supabase");
        return globalPoolData.pool_ton || 100;
    }
}

// =======================
// FUNCIÓN MEJORADA: OBTENER POOL GLOBAL CON BALANCE REAL
// =======================
async function loadGlobalPool() {
    try {
        console.log("📊 Cargando pool global con balance REAL...");
        
        // 1. Obtener balance REAL de la wallet
        const realBalance = await getRealPoolBalance();
        
        // 2. Obtener datos de Supabase
        let totalDiamonds = 100000;
        let supabasePoolTon = 100;
        
        const { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) {
            console.log("⚠️ No existe registro MASTER, creándolo...");
            
            const initialPool = {
                telegram_id: "MASTER",
                username: "MASTER",
                diamonds: 0,
                pool_ton: realBalance,
                total_diamonds: 100000,
                last_seen: new Date().toISOString()
            };
            
            await _supabase.from("game_data").insert([initialPool]);
            totalDiamonds = 100000;
            
        } else {
            totalDiamonds = data.total_diamonds || 100000;
            supabasePoolTon = data.pool_ton || 100;
        }
        
        // 3. ACTUALIZACIÓN CRÍTICA: Usar el balance REAL de la wallet
        globalPoolData = {
            pool_ton: realBalance,
            total_diamonds: totalDiamonds,
            last_updated: new Date().toISOString()
        };
        
        // 4. Sincronizar Supabase con el balance real si es diferente
        if (Math.abs(supabasePoolTon - realBalance) > 0.01) {
            console.log(`🔄 Sincronizando Supabase: ${supabasePoolTon.toFixed(4)} → ${realBalance.toFixed(4)} TON`);
            
            await _supabase
                .from("game_data")
                .update({
                    pool_ton: realBalance,
                    last_seen: new Date().toISOString()
                })
                .eq("telegram_id", "MASTER");
        }
        
        console.log("✅ Pool global actualizado con balance REAL:", {
            pool_ton: globalPoolData.pool_ton.toFixed(4),
            total_diamonds: globalPoolData.total_diamonds.toLocaleString(),
            last_updated: globalPoolData.last_updated
        });
        
        return globalPoolData;
        
    } catch (error) {
        console.error("❌ Error cargando pool global:", error);
        return { pool_ton: 100, total_diamonds: 100000 };
    }
}

// =======================
// FUNCIÓN PARA ACTUALIZAR POOL EN TIEMPO REAL
// =======================
async function refreshPoolBalance() {
    console.log("🔄 Actualizando balance del pool en tiempo real...");
    
    const realBalance = await getRealPoolBalance();
    
    // Actualizar variable global
    globalPoolData.pool_ton = realBalance;
    globalPoolData.last_updated = new Date().toISOString();
    
    // Actualizar Supabase en segundo plano
    _supabase
        .from("game_data")
        .update({
            pool_ton: realBalance,
            last_seen: new Date().toISOString()
        })
        .eq("telegram_id", "MASTER")
        .then(() => console.log("✅ Supabase sincronizado con balance real"))
        .catch(err => console.error("❌ Error sincronizando Supabase:", err));
    
    return realBalance;
}

// =======================
// FUNCIÓN DE PRECIO CON BALANCE REAL
// =======================
function calcPrice() {
    // FÓRMULA CORRECTA: (TON en pool × 80%) / total diamantes
    if (!globalPoolData || globalPoolData.total_diamonds <= 0) return 0.001;
    
    const poolTon = globalPoolData.pool_ton || 100;
    const totalDiamonds = globalPoolData.total_diamonds || 100000;
    
    const price = (poolTon * USER_SHARE) / totalDiamonds;
    return Math.max(price, 0.000001);
}

// =======================
// FUNCIÓN GET GLOBAL POOL (VERSIÓN CACHE)
// =======================
async function getGlobalPool() {
    // Si los datos tienen menos de 30 segundos, usar cache
    if (globalPoolData.last_updated) {
        const secondsSinceUpdate = (new Date() - new Date(globalPoolData.last_updated)) / 1000;
        if (secondsSinceUpdate < 30) {
            return globalPoolData;
        }
    }
    
    // Si no, actualizar
    return await loadGlobalPool();
}

// =======================
// MODAL DE RETIRO CON BALANCE REAL
// =======================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        // ACTUALIZACIÓN CRÍTICA: Obtener balance REAL antes de mostrar
        await refreshPoolBalance();
        
        const price = calcPrice();
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        // Mostrar balance REAL del pool
        const poolInfo = document.getElementById("pool-info");
        if (poolInfo) {
            poolInfo.innerHTML = `
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>💰 Balance REAL del pool:</strong><br>
                    <span style="color: #10b981; font-size: 1.2em;">${globalPoolData.pool_ton.toFixed(2)} TON</span>
                    <small style="color: #94a3b8; margin-left: 8px;">(actualizado en tiempo real)</small>
                </div>
            `;
        }
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minDiamondsFor1TON;
            input.max = Math.floor(userData.diamonds);
            input.placeholder = `Mínimo: ${minDiamondsFor1TON} 💎`;
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        const infoElement = document.getElementById("withdraw-info");
        if (infoElement) {
            infoElement.innerHTML = 
                `<div style="background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>💎 Mínimo de retiro:</strong><br>
                    <span style="color: #facc15; font-size: 1.2em;">${minDiamondsFor1TON} 💎</span> 
                    <small style="color: #94a3b8;">(equivale a 1 TON)</small>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>💰 Recibirás:</strong><br>
                    <span id="ton-receive" style="color: #10b981; font-size: 1.5em;">0.0000</span> TON
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.9em; color: #94a3b8;">
                    <strong>📊 Pool actual:</strong><br>
                    TON en pool: ${globalPoolData.pool_ton.toFixed(2)} TON<br>
                    Diamantes totales: ${globalPoolData.total_diamonds.toLocaleString()} 💎<br>
                    Precio: ${price.toFixed(6)} TON/💎
                </div>`;
        }
        
        updateWithdrawCalculation();
        
    } catch (error) {
        console.error("❌ Error abriendo retiro:", error);
        showError("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        if (!input) return;
        
        const diamonds = parseInt(input.value) || 0;
        const tonReceiveElem = document.getElementById("ton-receive");
        
        if (!tonReceiveElem) return;
        
        const price = calcPrice();
        
        if (diamonds <= 0) {
            tonReceiveElem.textContent = "0.0000";
            return;
        }
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        if (diamonds < minDiamondsFor1TON) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Mínimo ${minDiamondsFor1TON} 💎</span>`;
            return;
        }
        
        if (diamonds > userData.diamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Máximo ${Math.floor(userData.diamonds)} 💎</span>`;
            return;
        }
        
        const tonAmount = diamonds * price;
        
        // Verificar liquidez REAL
        if (tonAmount > globalPoolData.pool_ton) {
            const maxDiamonds = Math.floor(globalPoolData.pool_ton / price);
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444;">
                    Liquidez insuficiente<br>
                    Máximo: ${maxDiamonds.toLocaleString()} 💎
                </span>`;
            return;
        }
        
        tonReceiveElem.textContent = tonAmount.toFixed(4);
        
    } catch (error) {
        console.error("❌ Error en cálculo:", error);
    }
}

// =======================
// MODAL DE BANCO CON BALANCE REAL
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        updateWalletUI(currentWallet);
        
        // Actualizar balance REAL
        await refreshPoolBalance();
        const price = calcPrice();
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>
                    <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                        <span><b>🏦 Pool REAL:</b> ${globalPoolData.pool_ton.toFixed(2)} TON</span><br>
                        <span><b>💎 Diamantes totales:</b> ${globalPoolData.total_diamonds.toLocaleString()}</span>
                    </div>`;
        
        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        const isConnected = !!currentWallet;
        
        tonOptions.forEach(ton => {
            const diamonds = Math.floor((ton * USER_SHARE) / price);
            const finalDiamonds = Math.max(diamonds, 100);
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds.toLocaleString()} 💎</small>
                </div>
                <button onclick="comprarTON(${ton})"
                        style="${isConnected ? 'background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;' : 'background: #475569; color: #94a3b8; border: none; padding: 8px 12px; border-radius: 8px; cursor: not-allowed;'}"
                        ${!isConnected ? 'disabled' : ''}>
                    ${isConnected ? 'COMPRAR' : 'CONECTAR'}
                </button>
            </div>`;
        });
        
        document.getElementById("bankList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error abriendo banco:", error);
        showError("Error al cargar banco");
    }
}

// =======================
// COMPRA CON ACTUALIZACIÓN REAL
// =======================
async function comprarTON(tonAmount) {
    try {
        if (!currentWallet) {
            showError("❌ Primero conecta tu billetera TON");
            return;
        }
        
        if (tonAmount < 0.10) {
            showError("Mínimo: 0.10 TON");
            return;
        }
        
        // Actualizar balance REAL antes de comprar
        await refreshPoolBalance();
        const price = calcPrice();
        
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Precio: ${price.toFixed(6)} TON/💎\n` +
            `• Pool actual: ${globalPoolData.pool_ton.toFixed(2)} TON`;
        
        if (!confirm(confirmMsg)) return;
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: Math.floor(tonAmount * 0.8 * 1000000000).toString()
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: Math.floor(tonAmount * 0.2 * 1000000000).toString()
                }
            ]
        };
        
        try {
            const result = await tonConnectUI.sendTransaction(tx);
            console.log("✅ Transacción exitosa:", result);
            
            userData.diamonds += diamonds;
            await saveUserData();
            
            // Actualizar pool después de la compra
            await updateGlobalPoolAfterPurchase(tonAmount, diamonds);
            
            actualizarUI();
            showMessage(`✅ ¡COMPRA EXITOSA!\n\nHas recibido ${diamonds.toLocaleString()} 💎`);
            
            setTimeout(() => openBank(), 1000);
            
        } catch (txError) {
            console.error("❌ Error en transacción:", txError);
            showError("❌ Transacción cancelada o fallida");
        }
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("❌ Error en la compra");
    }
}

async function updateGlobalPoolAfterPurchase(tonAmount, diamonds) {
    try {
        // Después de una compra, el pool DEBERÍA tener más TON
        // Pero en lugar de asumir, consultamos el balance REAL otra vez
        await refreshPoolBalance();
        
        // Actualizar diamantes totales
        const newTotalDiamonds = globalPoolData.total_diamonds + diamonds;
        
        await _supabase
            .from("game_data")
            .update({
                total_diamonds: newTotalDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq("telegram_id", "MASTER");
        
        globalPoolData.total_diamonds = newTotalDiamonds;
        
        console.log(`📊 Pool actualizado: ${globalPoolData.pool_ton.toFixed(2)} TON, ${newTotalDiamonds} 💎`);
        
    } catch (error) {
        console.error("❌ Error actualizando pool:", error);
    }
}

// =======================
// SISTEMA DE REFERIDOS
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        userData.referral_code = referralCode;
        
        const now = new Date();
        
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            console.log("➕ Creando nuevo usuario");
            
            const newUser = {
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                referral_code: referralCode,
                referral_earnings: 0,
                referred_users: [],
                last_seen: now.toISOString(),
                last_online: now.toISOString(),
                created_at: now.toISOString()
            };
            
            await _supabase.from('game_data').insert([newUser]);
            
        } else if (data) {
            userData.diamonds = Number(data.diamonds) || 0;
            userData.lvl_tienda = Number(data.lvl_tienda) || 0;
            userData.lvl_casino = Number(data.lvl_casino) || 0;
            userData.lvl_piscina = Number(data.lvl_piscina) || 0;
            userData.lvl_parque = Number(data.lvl_parque) || 0;
            userData.lvl_diversion = Number(data.lvl_diversion) || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referral_earnings = Number(data.referral_earnings) || 0;
            userData.last_online = data.last_online || now.toISOString();
            
            // Producción offline
            if (data.last_online) {
                const lastOnline = new Date(data.last_online);
                const hoursOffline = (now - lastOnline) / (1000 * 60 * 60);
                
                if (hoursOffline > 0.0002778) {
                    const totalPerHr = 
                        userData.lvl_tienda * PROD_VAL.tienda +
                        userData.lvl_casino * PROD_VAL.casino +
                        userData.lvl_piscina * PROD_VAL.piscina +
                        userData.lvl_parque * PROD_VAL.parque +
                        userData.lvl_diversion * PROD_VAL.diversion;
                    
                    const diamondsEarned = Math.floor(totalPerHr * hoursOffline);
                    
                    if (diamondsEarned > 0) {
                        userData.diamonds += diamondsEarned;
                        console.log(`💰 Producción offline: ${diamondsEarned} 💎`);
                        await saveUserData();
                    }
                }
            }
            
            await _supabase.from('game_data')
                .update({ last_seen: now.toISOString(), last_online: now.toISOString() })
                .eq('telegram_id', userData.id);
        }
        
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        updateReferralUI();
        
        console.log("✅ Usuario cargado correctamente");
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

function updateReferralUI() {
    try {
        const referralCodeElem = document.getElementById("referral-code");
        if (referralCodeElem) {
            referralCodeElem.textContent = userData.referral_code || "NO DISPONIBLE";
        }
    } catch (error) {
        console.error("❌ Error actualizando UI referidos:", error);
    }
}

// =======================
// FUNCIONES DE PRODUCCIÓN
// =======================
function startProduction() {
    console.log("⚙️ Iniciando producción en tiempo real...");
    
    setInterval(async () => {
        try {
            if (!userData.id) return;
            
            const totalPerHr = 
                userData.lvl_tienda * PROD_VAL.tienda +
                userData.lvl_casino * PROD_VAL.casino +
                userData.lvl_piscina * PROD_VAL.piscina +
                userData.lvl_parque * PROD_VAL.parque +
                userData.lvl_diversion * PROD_VAL.diversion;
            
            userData.diamonds += totalPerHr / 3600;
            actualizarUI();
            
            // Guardar cada 30 segundos
            if (Math.floor(Date.now() / 1000) % 30 === 0) {
                await saveUserData();
            }
            
        } catch (error) {
            console.error("❌ Error producción:", error);
        }
    }, 1000);
}

async function saveUserData() {
    try {
        if (!userData.id) return false;
        
        await _supabase
            .from('game_data')
            .update({
                diamonds: Math.floor(userData.diamonds),
                lvl_tienda: userData.lvl_tienda,
                lvl_casino: userData.lvl_casino,
                lvl_piscina: userData.lvl_piscina,
                lvl_parque: userData.lvl_parque,
                lvl_diversion: userData.lvl_diversion,
                last_seen: new Date().toISOString(),
                last_online: new Date().toISOString()
            })
            .eq('telegram_id', userData.id);
        
        return true;
    } catch (error) {
        console.error("❌ Error guardando datos:", error);
        return false;
    }
}

// =======================
// FUNCIONES DE UI
// =======================
function actualizarUI() {
    try {
        document.getElementById("diamonds").textContent = Math.floor(userData.diamonds).toLocaleString();
        
        const totalPerHr = 
            userData.lvl_tienda * PROD_VAL.tienda +
            userData.lvl_casino * PROD_VAL.casino +
            userData.lvl_piscina * PROD_VAL.piscina +
            userData.lvl_parque * PROD_VAL.parque +
            userData.lvl_diversion * PROD_VAL.diversion;
        
        document.getElementById("rate").textContent = totalPerHr;
        
        document.getElementById("lvl_casino").textContent = userData.lvl_casino;
        document.getElementById("lvl_piscina").textContent = userData.lvl_piscina;
        document.getElementById("lvl_parque").textContent = userData.lvl_parque;
        document.getElementById("lvl_diversion").textContent = userData.lvl_diversion;
        
    } catch (error) {
        console.error("❌ Error actualizando UI:", error);
    }
}

function openStore() { showModal("modalStore"); }
function openCentral() { showModal("centralModal"); }
function openFriends() { 
    showModal("modalFriends");
    updateReferralUI();
}
function copyReferralCode() {
    if (!userData.referral_code) {
        showError("Código no disponible");
        return;
    }
    
    const BOT_USERNAME = 'ton_city_bot';
    const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
    const message = `🎮 ¡Únete a Ton City Game! 🎮\n\nUsa mi enlace para registrarte:\n${telegramDeepLink}`;
    
    navigator.clipboard.writeText(message).then(() => {
        showMessage("✅ Enlace copiado!");
    }).catch(() => {
        showMessage(`🔗 Copia manual: ${telegramDeepLink}`);
    });
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = "none";
    });
}

function showMessage(text) { alert(text); }
function showError(text) { alert("❌ " + text); }

// =======================
// INICIALIZACIÓN
// =======================
window.addEventListener('DOMContentLoaded', async () => {
    console.log("📄 DOM cargado - iniciando app...");
    
    // Cargar pool con balance REAL primero
    await loadGlobalPool();
    
    // Iniciar app
    setTimeout(initApp, 500);
});

// Funciones globales
window.openBank = openBank;
window.openStore = openStore;
window.openCentral = openCentral;
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.closeAll = closeAll;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.copyReferralCode = copyReferralCode;
window.processWithdraw = processWithdraw;
window.updateWithdrawCalculation = updateWithdrawCalculation;
window.disconnectWallet = disconnectWallet;

console.log("🌐 Ton City Game - BALANCE REAL ACTIVADO");
