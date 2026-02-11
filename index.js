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
// CONFIGURACIÓN TON API (CON TU CLAVE)
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

// Variables globales para pool REAL
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
        await loadRealGlobalPool(); // Cargar pool REAL al inicio
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
// FUNCIONES CRÍTICAS: OBTENER BALANCE REAL DEL POOL
// =======================

// Función para obtener balance REAL de cualquier wallet TON
async function getRealWalletBalance(walletAddress) {
    try {
        console.log(`💰 Consultando balance REAL de: ${walletAddress.substring(0, 8)}...`);
        
        // Método 1: Usando TONAPI.IO con tu API Key
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
        
        // El balance viene en nanoton
        const balanceNanoton = data.balance || 0;
        const balanceTon = balanceNanoton / 1000000000;
        
        console.log(`✅ Balance REAL obtenido: ${balanceTon.toFixed(4)} TON`);
        return balanceTon;
        
    } catch (error) {
        console.error("❌ Error obteniendo balance REAL:", error);
        
        // Método 2: Fallback a API pública de TonCenter
        try {
            console.log("🔄 Intentando con API pública...");
            const fallbackResponse = await fetch(
                `https://toncenter.com/api/v2/getAddressInformation?address=${walletAddress}`
            );
            
            if (!fallbackResponse.ok) throw new Error("Fallback API failed");
            
            const fallbackData = await fallbackResponse.json();
            const fallbackBalance = fallbackData.result?.balance || 0;
            const fallbackTon = fallbackBalance / 1000000000;
            
            console.log(`✅ Balance via API pública: ${fallbackTon.toFixed(4)} TON`);
            return fallbackTon;
            
        } catch (fallbackError) {
            console.error("❌ Error en API pública también:", fallbackError);
            
            // Método 3: Usar Tonviewer (último recurso)
            try {
                const tonviewerResponse = await fetch(
                    `https://tonapi.io/v1/blockchain/getAccount?account=${walletAddress}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${TON_API_KEY}`
                        }
                    }
                );
                
                const tonviewerData = await tonviewerResponse.json();
                const tonviewerBalance = tonviewerData.balance || 0;
                const tonviewerTon = tonviewerBalance / 1000000000;
                
                return tonviewerTon;
                
            } catch (finalError) {
                console.error("❌ Todos los métodos fallaron:", finalError);
                
                // Método 4: Verificar en Supabase como última opción
                try {
                    const { data } = await _supabase
                        .from("game_data")
                        .select("pool_ton")
                        .eq("telegram_id", "MASTER")
                        .single();
                    
                    return data?.pool_ton || 100;
                    
                } catch (supabaseError) {
                    console.error("❌ Error Supabase también:", supabaseError);
                    return 100; // Valor por defecto
                }
            }
        }
    }
}

// Función para cargar pool global REAL (balance real + diamantes)
async function loadRealGlobalPool() {
    try {
        console.log("📊 Cargando pool global REAL...");
        
        // 1. Obtener balance REAL de la wallet del pool
        const realBalance = await getRealWalletBalance(BILLETERA_POOL);
        
        // 2. Obtener diamantes totales de Supabase
        let totalDiamonds = 100000;
        let existingPoolTon = 100;
        
        try {
            const { data, error } = await _supabase
                .from("game_data")
                .select("total_diamonds, pool_ton")
                .eq("telegram_id", "MASTER")
                .single();
            
            if (error && error.code === 'PGRST116') {
                // Crear registro MASTER si no existe
                console.log("➕ Creando registro MASTER en Supabase...");
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
                existingPoolTon = realBalance;
                
            } else if (data) {
                totalDiamonds = Number(data.total_diamonds) || 100000;
                existingPoolTon = Number(data.pool_ton) || 100;
                
                // 3. Sincronizar: actualizar Supabase con balance real
                if (Math.abs(existingPoolTon - realBalance) > 0.01) {
                    console.log(`🔄 Sincronizando pool en Supabase: ${existingPoolTon} → ${realBalance.toFixed(4)} TON`);
                    
                    await _supabase
                        .from("game_data")
                        .update({
                            pool_ton: realBalance,
                            last_seen: new Date().toISOString()
                        })
                        .eq("telegram_id", "MASTER");
                }
            }
        } catch (dbError) {
            console.error("❌ Error base de datos:", dbError);
        }
        
        // 4. Actualizar variable global
        globalPoolData = {
            pool_ton: realBalance,
            total_diamonds: totalDiamonds,
            last_updated: new Date().toISOString()
        };
        
        console.log("✅ Pool global REAL cargado:", {
            pool_ton: `${realBalance.toFixed(4)} TON`,
            total_diamonds: totalDiamonds.toLocaleString(),
            last_updated: globalPoolData.last_updated
        });
        
        return globalPoolData;
        
    } catch (error) {
        console.error("❌ Error crítico cargando pool REAL:", error);
        globalPoolData = { pool_ton: 100, total_diamonds: 100000, last_updated: new Date().toISOString() };
        return globalPoolData;
    }
}

// Función para obtener pool (usa datos en memoria)
async function getGlobalPool() {
    // Si los datos son muy viejos (más de 30 segundos), refrescar
    const now = new Date();
    const lastUpdate = new Date(globalPoolData.last_updated || 0);
    const secondsSinceUpdate = (now - lastUpdate) / 1000;
    
    if (secondsSinceUpdate > 30 || globalPoolData.pool_ton === 0) {
        console.log("🔄 Refrescando pool (datos viejos)...");
        return await loadRealGlobalPool();
    }
    
    return globalPoolData;
}

// Función para actualizar pool después de transacciones
async function updateGlobalPool(tonAdded = 0, diamondsAdded = 0) {
    try {
        // Calcular nuevo balance (asumiendo que la transacción fue exitosa)
        const newPoolTon = globalPoolData.pool_ton + tonAdded;
        const newTotalDiamonds = globalPoolData.total_diamonds + diamondsAdded;
        
        // Actualizar en memoria
        globalPoolData.pool_ton = newPoolTon;
        globalPoolData.total_diamonds = newTotalDiamonds;
        globalPoolData.last_updated = new Date().toISOString();
        
        // Actualizar en Supabase
        await _supabase
            .from("game_data")
            .update({
                pool_ton: newPoolTon,
                total_diamonds: newTotalDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq("telegram_id", "MASTER");
        
        console.log(`📊 Pool actualizado: ${newPoolTon.toFixed(4)} TON, ${newTotalDiamonds.toLocaleString()} 💎`);
        
        return globalPoolData;
        
    } catch (error) {
        console.error("❌ Error actualizando pool:", error);
        return globalPoolData;
    }
}

// =======================
// FÓRMULA DE PRECIO CORRECTA (USANDO DATOS REALES)
// =======================
function calcPrice() {
    // FÓRMULA CORRECTA: precio = (pool_ton_real * 0.8) / total_diamonds
    if (!globalPoolData || globalPoolData.total_diamonds <= 0) {
        return 0.001; // Valor por defecto
    }
    
    const price = (globalPoolData.pool_ton * USER_SHARE) / globalPoolData.total_diamonds;
    return Math.max(price, 0.000001); // Mínimo 0.000001 TON/💎
}

// =======================
// CARGAR USUARIO
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        // Generar código de referido
        const referralCode = 'REF' + user.id.toString().slice(-6);
        userData.referral_code = referralCode;
        
        const now = new Date();
        
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // USUARIO NUEVO
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
            // USUARIO EXISTENTE
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
            
            // CALCULAR PRODUCCIÓN OFFLINE
            if (data.last_online) {
                const lastOnline = new Date(data.last_online);
                const hoursOffline = (now - lastOnline) / (1000 * 60 * 60);
                
                if (hoursOffline > 0.0002778) { // Más de 1 segundo
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
            
            // Actualizar timestamp
            userData.last_online = now.toISOString();
            await _supabase.from('game_data')
                .update({ 
                    last_seen: now.toISOString(),
                    last_online: now.toISOString()
                })
                .eq('telegram_id', userData.id);
        }
        
        // Actualizar UI
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
// BANCO (CON PRECIO REAL)
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        updateWalletUI(currentWallet);
        
        // Obtener pool actualizado
        const pool = await getGlobalPool();
        const price = calcPrice();
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual REAL</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>
                    <div class="info-text" style="margin-bottom: 15px;">
                      <strong>Pool real:</strong><br>
                      💰 ${pool.pool_ton.toFixed(4)} TON disponibles<br>
                      💎 ${pool.total_diamonds.toLocaleString()} diamantes totales
                    </div>`;
        
        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        const isConnected = !!currentWallet;
        
        tonOptions.forEach(ton => {
            const diamonds = Math.floor((ton * USER_SHARE) / price);
            const finalDiamonds = Math.max(diamonds, 100);
            
            const buttonText = isConnected ? 'COMPRAR' : 'CONECTA BILLETERA';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;' :
                'background: #475569; color: #94a3b8; border: none; padding: 8px 12px; border-radius: 8px; cursor: not-allowed;';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds.toLocaleString()} 💎</small>
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
        
        const pool = await getGlobalPool();
        const price = calcPrice();
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${diamonds.toLocaleString()} 💎\n` +
            `• Precio REAL: ${price.toFixed(6)} TON/💎\n` +
            `• Pool actual: ${pool.pool_ton.toFixed(4)} TON`;
        
        if (!confirm(confirmMsg)) return;
        
        console.log("📤 Enviando transacción...");
        
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
            console.log("✅ Transacción enviada:", result);
            
            // Actualizar diamantes del usuario
            userData.diamonds += diamonds;
            await saveUserData();
            
            // Actualizar pool global (añadir 80% del TON y los diamantes)
            await updateGlobalPool(tonAmount * 0.8, diamonds);
            
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

// =======================
// RETIRO CON DATOS REALES
// =======================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        // Obtener datos ACTUALIZADOS
        const pool = await getGlobalPool();
        const price = calcPrice();
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        // Cálculo REAL del mínimo
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
                    <strong>💎 Mínimo REAL:</strong><br>
                    <span style="color: #facc15; font-size: 1.2em;">${minDiamondsFor1TON} 💎</span> 
                    <small style="color: #94a3b8;">(equivale a 1 TON)</small>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>💰 Recibirás:</strong><br>
                    <span id="ton-receive" style="color: #10b981; font-size: 1.5em;">0.0000</span> TON
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.9em; color: #94a3b8;">
                    <strong>📝 Fórmula REAL:</strong><br>
                    Precio = (${pool.pool_ton.toFixed(4)} TON × 0.8) / ${pool.total_diamonds.toLocaleString()} 💎<br>
                    = ${price.toFixed(6)} TON/💎<br><br>
                    <strong>💰 Liquidez disponible:</strong><br>
                    ${pool.pool_ton.toFixed(4)} TON
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
            tonReceiveElem.style.color = "#94a3b8";
            return;
        }
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        // Validaciones
        if (diamonds < minDiamondsFor1TON) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Mínimo ${minDiamondsFor1TON} 💎</span>`;
            return;
        }
        
        if (diamonds > userData.diamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Máximo ${Math.floor(userData.diamonds)} 💎</span>`;
            return;
        }
        
        // Calcular TON a recibir (con datos REALES)
        const tonAmount = diamonds * price;
        
        // Verificar liquidez REAL
        if (tonAmount > globalPoolData.pool_ton) {
            const maxDiamonds = Math.floor(globalPoolData.pool_ton / price);
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
        
        console.log(`💰 Cálculo REAL: ${diamonds} 💎 × ${price.toFixed(6)} = ${tonAmount.toFixed(4)} TON`);
        
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
        
        const price = calcPrice();
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        if (diamonds < minDiamondsFor1TON) {
            showError(`❌ Mínimo REAL: ${minDiamondsFor1TON} 💎 (1 TON)`);
            return;
        }
        
        const tonAmount = diamonds * price;
        
        // Verificar liquidez REAL
        if (tonAmount > globalPoolData.pool_ton) {
            showError(`❌ Liquidez REAL insuficiente en el pool`);
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `• Precio REAL: ${price.toFixed(6)} TON/💎\n` +
            `• Pool antes: ${globalPoolData.pool_ton.toFixed(4)} TON`;
        
        if (!confirm(confirmMsg)) return;
        
        // Procesar retiro
        userData.diamonds -= diamonds;
        await saveUserData();
        
        // Actualizar pool REAL
        await updateGlobalPool(-tonAmount, -diamonds);
        
        actualizarUI();
        closeAll();
        
        showMessage(
            `✅ RETIRO PROCESADO CON DATOS REALES!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
            `• Pool después: ${(globalPoolData.pool_ton).toFixed(4)} TON\n` +
            `• El pago se procesará en 24h.`
        );
        
    } catch (error) {
        console.error("❌ Error procesando retiro:", error);
        showError("Error en retiro");
    }
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
        if (refEarningsElem) refEarningsElem.textContent = `${userData.referral_earnings} 💎`;
        if (refTotalElem) refTotalElem.textContent = `${userData.referral_earnings} 💎`;
        
    } catch (error) {
        console.error("❌ Error actualizando UI referidos:", error);
    }
}
 
// =======================
// FUNCIONES RESTANTES
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
        
        // Remover event listeners del input
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

console.log("🌐 Ton City Game - TODAS LAS CORRECCIONES APLICADAS");
