// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// Direcciones de billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";

// TON Connect
let tonConnectUI = null;
let currentWallet = null;

// Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =======================
// CONFIGURACIÓN TON API
// =======================
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io';

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

// Variables globales para pool REAL (SOLO PARA RETIROS)
let globalPoolData = {
    pool_ton: 0,
    total_diamonds: 0,
    last_updated: null
};

// Configuración
const USER_SHARE = 0.8;
const OWNER_SHARE = 0.2;
const PROD_VAL = { tienda:10, casino:25, piscina:60, parque:15, diversion:120, banco:0 };

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
        await loadRealGlobalPool(); // Solo para retiros
        startProduction();
        
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
            console.error("❌ TON_CONNECT_UI no está disponible");
            return;
        }
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        console.log("✅ TON Connect UI inicializado");
        
        tonConnectUI.onStatusChange((wallet) => {
            console.log("🔄 Estado cambiado:", wallet ? "Conectado" : "Desconectado");
            currentWallet = wallet;
            updateWalletUI(wallet);
        });
        
    } catch (error) {
        console.error("❌ Error en initTONConnect:", error);
    }
}

function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        
        if (!walletInfo) return;
        
        if (wallet) {
            console.log("👛 Wallet conectada");
            
            if (connectButton) {
                connectButton.style.display = 'none';
            }
            
            walletInfo.classList.remove('hidden');
            walletInfo.classList.add('visible');
            
        } else {
            console.log("👛 Wallet desconectada");
            
            if (connectButton) {
                connectButton.style.display = 'block';
            }
            
            walletInfo.classList.add('hidden');
            walletInfo.classList.remove('visible');
        }
        
    } catch (error) {
        console.error("❌ Error en updateWalletUI:", error);
    }
}

async function disconnectWallet() {
    try {
        console.log("🔌 Desconectando wallet...");
        
        if (tonConnectUI) {
            await tonConnectUI.disconnect();
            console.log("✅ Wallet desconectada exitosamente");
        }
        
        currentWallet = null;
        updateWalletUI(null);
        showMessage("✅ Wallet desconectada");
        
    } catch (error) {
        console.error("❌ Error desconectando:", error);
        currentWallet = null;
        updateWalletUI(null);
        showMessage("✅ Desconectado localmente");
    }
}

// =======================
// FUNCIONES PARA OBTENER BALANCE REAL DEL POOL (SOLO RETIROS)
// =======================
async function getRealWalletBalance(walletAddress) {
    try {
        console.log(`💰 Consultando balance REAL del pool: ${walletAddress.substring(0, 8)}...`);
        
        const response = await fetch(`${TON_API_URL}/v2/accounts/${walletAddress}`, {
            headers: {
                'Authorization': `Bearer ${TON_API_KEY}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`TON API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const balanceNanoton = data.balance || 0;
        const balanceTon = balanceNanoton / 1000000000;
        
        console.log(`✅ Balance REAL del pool: ${balanceTon.toFixed(4)} TON`);
        return balanceTon;
        
    } catch (error) {
        console.error("❌ Error obteniendo balance REAL:", error);
        
        // Fallback a Supabase
        try {
            const { data } = await _supabase
                .from("game_data")
                .select("pool_ton")
                .eq("telegram_id", "MASTER")
                .single();
            
            return data?.pool_ton || 100;
        } catch {
            return 100;
        }
    }
}

async function loadRealGlobalPool() {
    try {
        console.log("📊 Cargando pool global REAL para retiros...");
        
        const realBalance = await getRealWalletBalance(BILLETERA_POOL);
        
        let totalDiamonds = 100000;
        
        try {
            const { data } = await _supabase
                .from("game_data")
                .select("total_diamonds")
                .eq("telegram_id", "MASTER")
                .single();
            
            if (data) {
                totalDiamonds = Number(data.total_diamonds) || 100000;
            }
        } catch (dbError) {
            console.error("❌ Error base de datos:", dbError);
        }
        
        globalPoolData = {
            pool_ton: realBalance,
            total_diamonds: totalDiamonds,
            last_updated: new Date().toISOString()
        };
        
        console.log("✅ Pool global REAL para retiros cargado:", {
            pool_ton: `${realBalance.toFixed(4)} TON`,
            total_diamonds: totalDiamonds.toLocaleString()
        });
        
        return globalPoolData;
        
    } catch (error) {
        console.error("❌ Error crítico cargando pool REAL:", error);
        globalPoolData = { pool_ton: 100, total_diamonds: 100000, last_updated: new Date().toISOString() };
        return globalPoolData;
    }
}

// =======================
// PRECIO FIJO PARA COMPRAS (0.008 TON/💎)
// =======================
function getBuyPrice() {
    // PRECIO FIJO: 0.008 TON por diamante (80% para pool, 20% para propietario)
    return 0.008;
}

// =======================
// FÓRMULA DE RETIRO CORREGIDA: 1 TON = total_diamonds / pool_ton
// =======================
function getWithdrawRate() {
    // FÓRMULA CORRECTA: 1 TON = total_diamonds / pool_ton
    if (!globalPoolData || globalPoolData.pool_ton <= 0 || globalPoolData.total_diamonds <= 0) {
        return 1000; // Valor por defecto: 1000 💎 = 1 TON
    }
    
    const rate = globalPoolData.total_diamonds / globalPoolData.pool_ton;
    return Math.max(rate, 100); // Mínimo 100 diamantes por 1 TON
}

// Función para calcular cuántos TON recibes por tus diamantes
function calculateTonFromDiamonds(diamonds) {
    const rate = getWithdrawRate();
    const tonAmount = diamonds / rate;
    return tonAmount;
}

// =======================
// CARGAR USUARIO
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
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.last_online = now.toISOString();
            
        } else if (data) {
            console.log("📁 Usuario encontrado en Supabase");
            
            userData.diamonds = Number(data.diamonds) || 0;
            userData.lvl_tienda = Number(data.lvl_tienda) || 0;
            userData.lvl_casino = Number(data.lvl_casino) || 0;
            userData.lvl_piscina = Number(data.lvl_piscina) || 0;
            userData.lvl_parque = Number(data.lvl_parque) || 0;
            userData.lvl_diversion = Number(data.lvl_diversion) || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referral_earnings = Number(data.referral_earnings) || 0;
            userData.last_online = data.last_online || now.toISOString();
            
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
                        console.log(`💰 Producción offline: ${diamondsEarned} 💎 (${hoursOffline.toFixed(2)} horas)`);
                        
                        await saveUserData();
                    }
                }
            }
            
            userData.last_online = now.toISOString();
            await _supabase.from('game_data')
                .update({ 
                    last_seen: now.toISOString(),
                    last_online: now.toISOString()
                })
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

// =======================
// BANCO - PRECIO FIJO 0.008 TON/💎
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        updateWalletUI(currentWallet);
        
        const price = getBuyPrice(); // Precio FIJO: 0.008 TON/💎
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio de compra</b></span>
                      <span><b>${price.toFixed(3)} TON/💎</b></span>
                    </div>
                    <div class="info-text" style="margin-bottom: 15px;">
                      <strong>💎 Tasas fijas:</strong><br>
                      0.10 TON = 100 💎<br>
                      0.50 TON = 500 💎<br>
                      1.00 TON = 1000 💎<br>
                      2.00 TON = 2000 💎<br>
                      5.00 TON = 5000 💎<br>
                      10.00 TON = 10000 💎
                    </div>`;
        
        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        const isConnected = !!currentWallet;
        
        tonOptions.forEach(ton => {
            // Cálculo FIJO: 0.008 TON/💎, pero mínimo 100 diamantes
            const diamonds = Math.floor(ton / price);
            const finalDiamonds = Math.max(diamonds, 100);
            
            const buttonText = isConnected ? 'COMPRAR' : 'CONECTA BILLETERA';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;' :
                'background: #475569; color: #94a3b8; border: none; padding: 8px 12px; border-radius: 8px; cursor: not-allowed;';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds} 💎</small>
                </div>
                <button onclick="comprarTON(${ton})"
                        style="${buttonStyle}"
                        ${!isConnected ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            </div>`;
        });
        
        if (!isConnected) {
            html += `<div class="info-text" style="margin-top: 15px;">
                       <i class="fa-solid fa-wallet"></i> Conecta tu billetera para comprar
                     </div>`;
        }
        
        document.getElementById("bankList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error abriendo banco:", error);
        showError("Error al cargar banco");
    }
}

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
        
        const price = getBuyPrice(); // Precio FIJO: 0.008 TON/💎
        let diamonds = Math.floor(tonAmount / price);
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds} 💎?\n\n` +
            `• Recibirás: ${diamonds} 💎\n` +
            `• Precio fijo: ${price.toFixed(3)} TON/💎`;
        
        if (!confirm(confirmMsg)) return;
        
        console.log("📤 Enviando transacción...");
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: Math.floor(tonAmount * 0.8 * 1000000000).toString() // 80% al pool
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: Math.floor(tonAmount * 0.2 * 1000000000).toString() // 20% a propietario
                }
            ]
        };
        
        try {
            const result = await tonConnectUI.sendTransaction(tx);
            console.log("✅ Transacción enviada:", result);
            
            userData.diamonds += diamonds;
            await saveUserData();
            
            // Actualizar total_diamonds en Supabase (para retiros)
            try {
                const { data } = await _supabase
                    .from("game_data")
                    .select("total_diamonds, pool_ton")
                    .eq("telegram_id", "MASTER")
                    .single();
                
                if (data) {
                    const newTotalDiamonds = (data.total_diamonds || 100000) + diamonds;
                    // NO actualizamos pool_ton aquí, eso solo se lee de la wallet real
                    await _supabase
                        .from("game_data")
                        .update({
                            total_diamonds: newTotalDiamonds,
                            last_seen: new Date().toISOString()
                        })
                        .eq("telegram_id", "MASTER");
                }
            } catch (updateError) {
                console.error("❌ Error actualizando total_diamonds:", updateError);
            }
            
            actualizarUI();
            
            showMessage(`✅ ¡COMPRA EXITOSA!\n\nHas recibido ${diamonds} 💎`);
            
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

// =======================
// RETIRO - CON FÓRMULA CORREGIDA Y ACTUALIZACIÓN EN TIEMPO REAL
// =======================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        // Actualizar pool REAL antes de abrir retiro
        await loadRealGlobalPool();
        
        const rate = getWithdrawRate(); // Tasa: 💎 por 1 TON
        const poolTon = globalPoolData.pool_ton;
        const totalDiamonds = globalPoolData.total_diamonds;
        
        document.getElementById("current-price").textContent = `1 TON = ${Math.floor(rate).toLocaleString()} 💎`;
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        const minDiamonds = Math.ceil(rate); // Mínimo para recibir 1 TON
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minDiamonds;
            input.max = Math.floor(userData.diamonds);
            input.placeholder = `Mínimo: ${minDiamonds} 💎`;
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        const infoElement = document.getElementById("withdraw-info");
        if (infoElement) {
            infoElement.innerHTML = 
                `<div style="background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>💎 Tasa de cambio REAL:</strong><br>
                    <span style="color: #facc15; font-size: 1.2em;">1 TON = ${Math.floor(rate).toLocaleString()} 💎</span>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>💰 Recibirás:</strong><br>
                    <span id="ton-receive" style="color: #10b981; font-size: 1.5em;">0.0000</span> TON
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.9em; color: #94a3b8;">
                    <strong>📊 Datos del pool REAL:</strong><br>
                    • Total diamantes: ${totalDiamonds.toLocaleString()} 💎<br>
                    • TON en pool: ${poolTon.toFixed(4)} TON<br>
                    • Fórmula: 1 TON = ${totalDiamonds.toLocaleString()} 💎 / ${poolTon.toFixed(4)} TON<br>
                    • = ${Math.floor(rate).toLocaleString()} 💎
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
        
        const rate = getWithdrawRate(); // 💎 por 1 TON
        const minDiamonds = Math.ceil(rate);
        
        if (diamonds <= 0) {
            tonReceiveElem.textContent = "0.0000";
            tonReceiveElem.style.color = "#94a3b8";
            return;
        }
        
        if (diamonds < minDiamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Mínimo ${minDiamonds} 💎</span>`;
            return;
        }
        
        if (diamonds > userData.diamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Máximo ${Math.floor(userData.diamonds)} 💎</span>`;
            return;
        }
        
        // Calcular TON a recibir usando la fórmula CORRECTA
        const tonAmount = diamonds / rate;
        
        // Verificar liquidez REAL
        if (tonAmount > globalPoolData.pool_ton) {
            const maxDiamonds = Math.floor(globalPoolData.pool_ton * rate);
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444;">
                    💰 Liquidez insuficiente<br>
                    Máximo: ${maxDiamonds.toLocaleString()} 💎
                </span>`;
            return;
        }
        
        // Mostrar resultado
        tonReceiveElem.textContent = tonAmount.toFixed(4);
        tonReceiveElem.style.color = "#10b981";
        
        console.log(`💰 Cálculo REAL: ${diamonds} 💎 ÷ ${rate.toFixed(2)} = ${tonAmount.toFixed(4)} TON`);
        
    } catch (error) {
        console.error("❌ Error en cálculo de retiro:", error);
    }
}

async function processWithdraw() {
    try {
        const input = document.getElementById("withdraw-amount");
        if (!input) {
            showError("Campo no encontrado");
            return;
        }
        
        const diamonds = parseInt(input.value);
        
        if (!diamonds || diamonds <= 0) {
            showError("❌ Ingresa una cantidad válida");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            showError(`❌ Máximo ${Math.floor(userData.diamonds)} 💎`);
            return;
        }
        
        const rate = getWithdrawRate();
        const minDiamonds = Math.ceil(rate);
        
        if (diamonds < minDiamonds) {
            showError(`❌ Mínimo: ${minDiamonds} 💎 (1 TON)`);
            return;
        }
        
        const tonAmount = diamonds / rate;
        
        // Verificar liquidez REAL
        if (tonAmount > globalPoolData.pool_ton) {
            showError(`❌ Liquidez insuficiente en el pool`);
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `• Tasa actual: 1 TON = ${Math.floor(rate).toLocaleString()} 💎\n` +
            `• Pool disponible: ${globalPoolData.pool_ton.toFixed(4)} TON`;
        
        if (!confirm(confirmMsg)) return;
        
        // Procesar retiro
        userData.diamonds -= diamonds;
        await saveUserData();
        
        // Actualizar total_diamonds en Supabase (restar)
        try {
            const { data } = await _supabase
                .from("game_data")
                .select("total_diamonds")
                .eq("telegram_id", "MASTER")
                .single();
            
            if (data) {
                const newTotalDiamonds = Math.max(0, (data.total_diamonds || 100000) - diamonds);
                await _supabase
                    .from("game_data")
                    .update({
                        total_diamonds: newTotalDiamonds,
                        last_seen: new Date().toISOString()
                    })
                    .eq("telegram_id", "MASTER");
            }
        } catch (updateError) {
            console.error("❌ Error actualizando total_diamonds:", updateError);
        }
        
        // Actualizar pool local (solo para UI, no afecta el balance real)
        globalPoolData.total_diamonds -= diamonds;
        globalPoolData.pool_ton -= tonAmount;
        globalPoolData.last_updated = new Date().toISOString();
        
        actualizarUI();
        closeAll();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
            `• Tasa: 1 TON = ${Math.floor(rate).toLocaleString()} 💎\n` +
            `• El pago se procesará en 24h.`
        );
        
    } catch (error) {
        console.error("❌ Error procesando retiro:", error);
        showError("Error en retiro");
    }
}

// =======================
// TIENDA
// =======================
async function openStore() {
    try {
        showModal("modalStore");
        
        const items = [
            {name: "Tienda", lvl: userData.lvl_tienda, price: 1000, prod: 10, color: "#3b82f6", icon: "fa-store"},
            {name: "Casino", lvl: userData.lvl_casino, price: 2500, prod: 25, color: "#ef4444", icon: "fa-dice"},
            {name: "Piscina", lvl: userData.lvl_piscina, price: 5000, prod: 60, color: "#38bdf8", icon: "fa-water-ladder"},
            {name: "Parque", lvl: userData.lvl_parque, price: 1500, prod: 15, color: "#10b981", icon: "fa-tree"},
            {name: "Diversión", lvl: userData.lvl_diversion, price: 10000, prod: 120, color: "#f472b6", icon: "fa-gamepad"}
        ];
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>🏪 Tienda de Mejoras</b></span>
                      <span><b>${Math.floor(userData.diamonds).toLocaleString()} 💎</b></span>
                    </div>`;
        
        items.forEach(item => {
            const canAfford = userData.diamonds >= item.price;
            
            html += `
            <div class="store-item" style="border-left-color: ${item.color};">
                <div class="store-item-header">
                    <div>
                        <i class="fa-solid ${item.icon}" style="color: ${item.color}; margin-right: 8px;"></i>
                        <strong>${item.name} Nvl ${item.lvl}</strong>
                    </div>
                    <div class="store-item-price">${item.price.toLocaleString()} 💎</div>
                </div>
                <p style="margin: 5px 0; color: #94a3b8;">
                    <i class="fa-solid fa-arrow-up" style="color: #10b981;"></i>
                    +${item.prod} 💎/hora
                </p>
                <button onclick="buyUpgrade('${item.name}', ${item.price})" 
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
        
        document.getElementById("storeList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error abriendo tienda:", error);
        showError("Error cargando tienda");
    }
}

async function buyUpgrade(name, price) {
    try {
        if (userData.diamonds < price) {
            showError("Diamantes insuficientes");
            return;
        }
        
        const fieldMap = {
            "Tienda": "lvl_tienda",
            "Casino": "lvl_casino", 
            "Piscina": "lvl_piscina",
            "Parque": "lvl_parque",
            "Diversión": "lvl_diversion"
        };
        
        const fieldToUpdate = fieldMap[name];
        if (!fieldToUpdate) {
            showError("Error: mejora no encontrada");
            return;
        }
        
        userData[fieldToUpdate]++;
        userData.diamonds -= price;
        
        await saveUserData();
        
        actualizarUI();
        setTimeout(() => openStore(), 100);
        showMessage(`✅ ${name} mejorada a nivel ${userData[fieldToUpdate]}!`);
        
    } catch (error) {
        console.error("❌ Error mejorando:", error);
        showError("Error al comprar mejora");
    }
}

// =======================
// SISTEMA DE AMIGOS
// =======================
async function openFriends() {
    try {
        showModal("modalFriends");
        
        if (!userData.referral_code && userData.id) {
            userData.referral_code = 'REF' + userData.id.toString().slice(-6);
        }
        
        updateReferralUI();
        
    } catch (error) {
        console.error("❌ Error abriendo amigos:", error);
        showError("Error cargando amigos");
    }
}

function copyReferralCode() {
    try {
        if (!userData.referral_code) {
            showError("Código no disponible");
            return;
        }
        
        const BOT_USERNAME = 'ton_city_bot';
        const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        const message = `🎮 ¡Únete a Ton City Game! 🎮\n\nUsa mi enlace para registrarte:\n${telegramDeepLink}\n\n📱 Solo funciona en Telegram`;
        
        navigator.clipboard.writeText(message).then(() => {
            showMessage("✅ Enlace copiado!\n\nComparte con tus amigos.");
        }).catch(() => {
            showMessage(`🔗 Copia manual:\n\n${telegramDeepLink}`);
        });
        
    } catch (error) {
        console.error("❌ Error copiar código:", error);
        showError("Error al generar enlace");
    }
}

// =======================
// PRODUCCIÓN
// =======================
function startProduction() {
    console.log("⚙️ Iniciando producción con guardado automático...");
    
    let lastSaveTime = Date.now();
    
    setInterval(async () => {
        try {
            if (!userData.id) return;
            
            const totalPerHr = 
                userData.lvl_tienda * PROD_VAL.tienda +
                userData.lvl_casino * PROD_VAL.casino +
                userData.lvl_piscina * PROD_VAL.piscina +
                userData.lvl_parque * PROD_VAL.parque +
                userData.lvl_diversion * PROD_VAL.diversion;
            
            const diamondsPerSecond = totalPerHr / 3600;
            userData.diamonds += diamondsPerSecond;
            
            actualizarUI();
            
            if (document.getElementById("centralModal")?.style.display === "block") {
                updateCentralStats();
            }
            
            const currentTime = Date.now();
            if (currentTime - lastSaveTime >= 30000) {
                await saveUserData();
                lastSaveTime = currentTime;
                console.log("💾 Guardado automático");
            }
            
        } catch (error) {
            console.error("❌ Error en producción:", error);
        }
    }, 1000);
}

// =======================
// FUNCIONES AUXILIARES
// =======================
async function saveUserData() {
    try {
        if (!userData.id) return false;
        
        const updateData = {
            diamonds: Math.floor(userData.diamonds),
            lvl_tienda: userData.lvl_tienda,
            lvl_casino: userData.lvl_casino,
            lvl_piscina: userData.lvl_piscina,
            lvl_parque: userData.lvl_parque,
            lvl_diversion: userData.lvl_diversion,
            referral_code: userData.referral_code,
            referral_earnings: userData.referral_earnings,
            last_seen: new Date().toISOString(),
            last_online: userData.last_online || new Date().toISOString()
        };
        
        const { error } = await _supabase
            .from('game_data')
            .update(updateData)
            .eq('telegram_id', userData.id);
        
        if (error) throw error;
        return true;
        
    } catch (error) {
        console.error("❌ Error guardando datos:", error);
        return false;
    }
}

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

function updateCentralStats() {
    const prod = {
        tienda: userData.lvl_tienda * PROD_VAL.tienda,
        casino: userData.lvl_casino * PROD_VAL.casino,
        piscina: userData.lvl_piscina * PROD_VAL.piscina,
        parque: userData.lvl_parque * PROD_VAL.parque,
        diversion: userData.lvl_diversion * PROD_VAL.diversion
    };
    
    const total = prod.tienda + prod.casino + prod.piscina + 
                 prod.parque + prod.diversion;
    
    const s_tienda = document.getElementById("s_tienda");
    const s_casino = document.getElementById("s_casino");
    const s_piscina = document.getElementById("s_piscina");
    const s_parque = document.getElementById("s_parque");
    const s_diversion = document.getElementById("s_diversion");
    const s_total = document.getElementById("s_total");
    
    if (s_tienda) s_tienda.textContent = prod.tienda;
    if (s_casino) s_casino.textContent = prod.casino;
    if (s_piscina) s_piscina.textContent = prod.piscina;
    if (s_parque) s_parque.textContent = prod.parque;
    if (s_diversion) s_diversion.textContent = prod.diversion;
    if (s_total) s_total.textContent = total;
}

function updateReferralUI() {
    try {
        const referralCodeElem = document.getElementById("referral-code");
        const refCountElem = document.getElementById("ref-count");
        const refEarningsElem = document.getElementById("ref-earnings");
        const refTotalElem = document.getElementById("ref-total");
        
        if (referralCodeElem) {
            referralCodeElem.textContent = userData.referral_code || "REF" + (userData.id ? userData.id.slice(-6) : "000000");
        }
        
        if (refCountElem) refCountElem.textContent = "0";
        if (refEarningsElem) refEarningsElem.textContent = `${userData.referral_earnings || 0} 💎`;
        if (refTotalElem) refTotalElem.textContent = `${userData.referral_earnings || 0} 💎`;
        
    } catch (error) {
        console.error("❌ Error actualizando UI referidos:", error);
    }
}

function openCentral() {
    updateCentralStats();
    showModal("centralModal");
}

function showModal(id) {
    try {
        document.getElementById("overlay").style.display = "block";
        document.getElementById(id).style.display = "block";
    } catch (error) {
        console.error("❌ Error mostrando modal:", error);
    }
}

function closeAll() {
    try {
        document.getElementById("overlay").style.display = "none";
        
        const modals = ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = "none";
        });
        
        const withdrawInput = document.getElementById("withdraw-amount");
        if (withdrawInput) {
            withdrawInput.removeEventListener('input', updateWithdrawCalculation);
        }
        
    } catch (error) {
        console.error("❌ Error cerrando modales:", error);
    }
}

function showMessage(text) {
    alert(text);
}

function showError(text) {
    alert("❌ " + text);
}

// =======================
// INICIALIZACIÓN
// =======================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado - iniciando app...");
    setTimeout(initApp, 1000);
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

console.log("🌐 Ton City Game - CORRECCIONES APLICADAS: Precio fijo compras, Fórmula real retiros");
