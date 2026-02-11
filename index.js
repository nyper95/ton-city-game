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
    diamonds: 0, // SOLO los diamantes actuales del usuario
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
    total_diamonds: 0, // TOTAL de diamantes de TODOS los usuarios
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
            if (connectButton) connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');
            walletInfo.classList.add('visible');
        } else {
            console.log("👛 Wallet desconectada");
            if (connectButton) connectButton.style.display = 'block';
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
        
        if (!response.ok) throw new Error(`TON API Error: ${response.status}`);
        
        const data = await response.json();
        const balanceNanoton = data.balance || 0;
        const balanceTon = balanceNanoton / 1000000000;
        
        console.log(`✅ Balance REAL del pool: ${balanceTon.toFixed(4)} TON`);
        return balanceTon;
    } catch (error) {
        console.error("❌ Error obteniendo balance REAL:", error);
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

// =======================
// CARGAR POOL REAL CON TOTAL_DIAMONDS DE TODOS LOS USUARIOS
// =======================
async function loadRealGlobalPool() {
    try {
        console.log("📊 Cargando pool global REAL para retiros...");
        
        // 1. Obtener balance REAL de la wallet del pool
        const realBalance = await getRealWalletBalance(BILLETERA_POOL);
        
        // 2. Obtener TOTAL de diamantes de TODOS los usuarios
        let totalDiamondsAllUsers = 0;
        
        try {
            const { data, error } = await _supabase
                .from("game_data")
                .select("diamonds")
                .neq("telegram_id", "MASTER"); // Excluir MASTER
                
            if (!error && data) {
                totalDiamondsAllUsers = data.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
                console.log(`💎 Total diamantes TODOS los usuarios: ${totalDiamondsAllUsers.toLocaleString()}`);
            }
        } catch (dbError) {
            console.error("❌ Error calculando total_diamonds:", dbError);
        }
        
        // 3. Guardar en registro MASTER para referencia
        try {
            await _supabase
                .from("game_data")
                .update({
                    total_diamonds: totalDiamondsAllUsers,
                    pool_ton: realBalance,
                    last_seen: new Date().toISOString()
                })
                .eq("telegram_id", "MASTER");
        } catch (updateError) {
            console.error("❌ Error actualizando MASTER:", updateError);
        }
        
        // 4. Actualizar variable global
        globalPoolData = {
            pool_ton: realBalance,
            total_diamonds: totalDiamondsAllUsers,
            last_updated: new Date().toISOString()
        };
        
        console.log("✅ Pool global REAL cargado:", {
            pool_ton: `${realBalance.toFixed(4)} TON`,
            total_diamonds: totalDiamondsAllUsers.toLocaleString()
        });
        
        return globalPoolData;
    } catch (error) {
        console.error("❌ Error crítico cargando pool REAL:", error);
        globalPoolData = { pool_ton: 100, total_diamonds: 100000, last_updated: new Date().toISOString() };
        return globalPoolData;
    }
}

// =======================
// PRECIO FIJO PARA COMPRAS
// =======================
function getBuyPrice() {
    return 0.008; // PRECIO FIJO: 0.008 TON por diamante
}

// =======================
// FÓRMULA DE RETIRO CORREGIDA: 1 TON = total_diamonds / pool_ton
// =======================
function getWithdrawRate() {
    if (!globalPoolData || globalPoolData.pool_ton <= 0 || globalPoolData.total_diamonds <= 0) {
        return 1000; // Valor por defecto
    }
    return globalPoolData.total_diamonds / globalPoolData.pool_ton;
}

function calculateTonFromDiamonds(diamonds) {
    const rate = getWithdrawRate();
    return diamonds / rate;
}

// =======================
// CARGAR USUARIO - SOLO SUS DIAMANTES ACTUALES
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
            // USUARIO NUEVO - 0 DIAMANTES
            console.log("➕ Creando nuevo usuario con 0 diamantes");
            
            const newUser = {
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0, // EMPIEZA CON 0
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
            
            userData.diamonds = 0; // 0 DIAMANTES
            userData.referral_code = referralCode;
            userData.last_online = now.toISOString();
            
        } else if (data) {
            // USUARIO EXISTENTE - CARGAR SOLO SUS DIAMANTES ACTUALES
            console.log("📁 Usuario encontrado en Supabase");
            
            userData.diamonds = Number(data.diamonds) || 0; // SOLO DIAMANTES ACTUALES
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
                        console.log(`💰 Producción offline: +${diamondsEarned} 💎`);
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
        
        console.log(`✅ Usuario cargado: ${userData.diamonds.toLocaleString()} 💎 actuales`);
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

// =======================
// BANCO - BOTONES CORREGIDOS
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        updateWalletUI(currentWallet);
        
        const price = getBuyPrice(); // 0.008 TON/💎
        const isConnected = !!currentWallet;
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio de compra</b></span>
                      <span><b>${price.toFixed(3)} TON/💎</b></span>
                    </div>`;
        
        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        
        tonOptions.forEach(ton => {
            // Cálculo CORRECTO: diamantes = TON / 0.008
            const diamonds = Math.floor(ton / price);
            
            const buttonText = isConnected ? 'COMPRAR' : 'CONECTAR';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;' :
                'background: #475569; color: #94a3b8; border: none; padding: 10px 16px; border-radius: 8px; cursor: not-allowed;';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'}; padding: 12px;">
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 1.1rem;">${ton.toFixed(2)} TON</strong>
                    <span style="color: #94a3b8; font-size: 0.9rem;">Recibes ${diamonds} 💎</span>
                </div>
                <button onclick="comprarTON(${ton})"
                        style="${buttonStyle} min-width: 100px;"
                        ${!isConnected ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            </div>`;
        });
        
        if (!isConnected) {
            html += `<div class="info-text" style="margin-top: 15px; padding: 15px; background: #1e293b; border-radius: 12px;">
                       <i class="fa-solid fa-wallet" style="color: #facc15;"></i> Conecta tu billetera para comprar
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
        
        const price = getBuyPrice();
        const diamonds = Math.floor(tonAmount / price);
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON?\n\n` +
            `Recibirás: ${diamonds} 💎\n` +
            `Precio: ${price.toFixed(3)} TON/💎`;
        
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
            console.log("✅ Transacción exitosa:", result);
            
            // ACTUALIZAR SOLO LOS DIAMANTES DEL USUARIO
            userData.diamonds += diamonds;
            await saveUserData();
            
            // ACTUALIZAR TOTAL_DIAMONDS EN SUPABASE (TODOS LOS USUARIOS)
            try {
                const { data: allUsers } = await _supabase
                    .from("game_data")
                    .select("diamonds")
                    .neq("telegram_id", "MASTER");
                
                const newTotalDiamonds = allUsers.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
                
                await _supabase
                    .from("game_data")
                    .update({
                        total_diamonds: newTotalDiamonds,
                        last_seen: new Date().toISOString()
                    })
                    .eq("telegram_id", "MASTER");
                
                // Actualizar pool local
                globalPoolData.total_diamonds = newTotalDiamonds;
                
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
// RETIRO - CÁLCULO EN TIEMPO REAL CORREGIDO
// =======================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        // ACTUALIZAR POOL REAL
        await loadRealGlobalPool();
        
        const rate = getWithdrawRate();
        const poolTon = globalPoolData.pool_ton;
        const totalDiamonds = globalPoolData.total_diamonds;
        const userCurrentDiamonds = Math.floor(userData.diamonds); // SOLO DIAMANTES ACTUALES
        
        // Mostrar información
        document.getElementById("current-price").textContent = `1 TON = ${Math.floor(rate).toLocaleString()} 💎`;
        document.getElementById("available-diamonds").textContent = `${userCurrentDiamonds} 💎`;
        
        const minDiamonds = Math.ceil(rate);
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minDiamonds;
            input.max = userCurrentDiamonds;
            input.placeholder = `Mínimo: ${minDiamonds} 💎`;
            input.removeEventListener('input', updateWithdrawCalculation);
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        const infoElement = document.getElementById("withdraw-info");
        if (infoElement) {
            infoElement.innerHTML = 
                `<div style="background: #1e293b; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="color: #94a3b8;">Tasa actual:</span>
                        <span style="color: #facc15; font-weight: bold; font-size: 1.2rem;">1 TON = ${Math.floor(rate).toLocaleString()} 💎</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #94a3b8;">Pool disponible:</span>
                        <span style="color: #10b981; font-weight: bold;">${poolTon.toFixed(4)} TON</span>
                    </div>
                </div>
                <div style="background: #0f172a; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #94a3b8;">Recibirás:</span>
                        <span id="ton-receive" style="color: #10b981; font-size: 1.5rem; font-weight: bold;">0.0000</span>
                        <span style="color: #94a3b8;">TON</span>
                    </div>
                </div>
                <div style="background: #0f172a; padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #94a3b8;">
                    <strong>📊 Fórmula:</strong><br>
                    1 TON = ${totalDiamonds.toLocaleString()} 💎 ÷ ${poolTon.toFixed(4)} TON<br>
                    = ${Math.floor(rate).toLocaleString()} 💎
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
        
        const rate = getWithdrawRate();
        const minDiamonds = Math.ceil(rate);
        const userCurrentDiamonds = Math.floor(userData.diamonds);
        
        if (diamonds <= 0) {
            tonReceiveElem.textContent = "0.0000";
            tonReceiveElem.style.color = "#10b981";
            return;
        }
        
        // VALIDACIONES EN TIEMPO REAL
        if (diamonds < minDiamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444; font-size: 1rem;">Mínimo: ${minDiamonds} 💎</span>`;
            return;
        }
        
        if (diamonds > userCurrentDiamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444; font-size: 1rem;">Máximo: ${userCurrentDiamonds} 💎</span>`;
            return;
        }
        
        // CÁLCULO CORRECTO: TON = diamantes / tasa
        const tonAmount = diamonds / rate;
        
        // Verificar liquidez
        if (tonAmount > globalPoolData.pool_ton) {
            const maxDiamonds = Math.floor(globalPoolData.pool_ton * rate);
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444; font-size: 1rem;">
                    ❌ Liquidez insuficiente<br>Máximo: ${maxDiamonds.toLocaleString()} 💎
                </span>`;
            return;
        }
        
        // MOSTRAR RESULTADO
        tonReceiveElem.textContent = tonAmount.toFixed(4);
        tonReceiveElem.style.color = "#10b981";
        
        console.log(`💰 Retiro: ${diamonds} 💎 = ${tonAmount.toFixed(4)} TON (tasa: ${rate.toFixed(2)})`);
        
    } catch (error) {
        console.error("❌ Error en cálculo:", error);
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
        const userCurrentDiamonds = Math.floor(userData.diamonds);
        
        if (!diamonds || diamonds <= 0) {
            showError("❌ Ingresa una cantidad válida");
            return;
        }
        
        if (diamonds > userCurrentDiamonds) {
            showError(`❌ Solo tienes ${userCurrentDiamonds} 💎`);
            return;
        }
        
        const rate = getWithdrawRate();
        const minDiamonds = Math.ceil(rate);
        
        if (diamonds < minDiamonds) {
            showError(`❌ Mínimo: ${minDiamonds} 💎 (1 TON)`);
            return;
        }
        
        const tonAmount = diamonds / rate;
        
        if (tonAmount > globalPoolData.pool_ton) {
            showError(`❌ No hay suficiente TON en el pool`);
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `Tasa: 1 TON = ${Math.floor(rate).toLocaleString()} 💎\n` +
            `Pool: ${globalPoolData.pool_ton.toFixed(4)} TON disponible`;
        
        if (!confirm(confirmMsg)) return;
        
        // RESTAR DIAMANTES DEL USUARIO
        userData.diamonds -= diamonds;
        await saveUserData();
        
        // ACTUALIZAR TOTAL_DIAMONDS (TODOS LOS USUARIOS)
        try {
            const { data: allUsers } = await _supabase
                .from("game_data")
                .select("diamonds")
                .neq("telegram_id", "MASTER");
            
            const newTotalDiamonds = allUsers.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
            
            await _supabase
                .from("game_data")
                .update({
                    total_diamonds: newTotalDiamonds,
                    last_seen: new Date().toISOString()
                })
                .eq("telegram_id", "MASTER");
            
            // Actualizar pool local
            globalPoolData.total_diamonds = newTotalDiamonds;
            globalPoolData.pool_ton -= tonAmount;
            
        } catch (updateError) {
            console.error("❌ Error actualizando total_diamonds:", updateError);
        }
        
        actualizarUI();
        closeAll();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `Retiraste: ${diamonds.toLocaleString()} 💎\n` +
            `Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `Tasa: 1 TON = ${Math.floor(rate).toLocaleString()} 💎`
        );
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        showError("Error al procesar retiro");
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
            <div class="store-item" style="border-left: 4px solid ${item.color}; padding: 15px; margin-bottom: 15px; background: #0f172a; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid ${item.icon}" style="color: ${item.color}; font-size: 1.2rem;"></i>
                        <strong style="font-size: 1.1rem;">${item.name} Nvl ${item.lvl}</strong>
                    </div>
                    <span style="color: #facc15; font-weight: bold; font-size: 1.1rem;">${item.price.toLocaleString()} 💎</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: #94a3b8;">Producción:</span>
                    <span style="color: #10b981;">+${item.prod} 💎/hora</span>
                </div>
                <button onclick="buyUpgrade('${item.name}', ${item.price})" 
                        style="background: ${canAfford ? item.color : '#475569'}; 
                               color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; font-weight: bold; cursor: ${canAfford ? 'pointer' : 'not-allowed'};"
                        ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? 'MEJORAR' : 'FONDOS INSUFICIENTES'}
                </button>
            </div>`;
        });
        
        html += `<div class="info-text" style="margin-top: 15px; text-align: center; color: #94a3b8;">
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
            showError("❌ Diamantes insuficientes");
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
        if (!fieldToUpdate) return;
        
        userData[fieldToUpdate]++;
        userData.diamonds -= price;
        
        await saveUserData();
        
        actualizarUI();
        openStore();
        showMessage(`✅ ${name} mejorada a nivel ${userData[fieldToUpdate]}`);
        
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
        const link = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        
        navigator.clipboard.writeText(link).then(() => {
            showMessage("✅ Enlace copiado!");
        }).catch(() => {
            showMessage(`📋 ${link}`);
        });
        
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// =======================
// PRODUCCIÓN
// =======================
function startProduction() {
    console.log("⚙️ Iniciando producción...");
    
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
            
        } catch (error) {
            console.error("❌ Error producción:", error);
        }
    }, 1000);
}

// =======================
// FUNCIONES AUXILIARES
// =======================
async function saveUserData() {
    try {
        if (!userData.id) return;
        
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
            
    } catch (error) {
        console.error("❌ Error guardando:", error);
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
        console.error("❌ Error UI:", error);
    }
}

function updateReferralUI() {
    try {
        const codeElem = document.getElementById("referral-code");
        if (codeElem) {
            codeElem.textContent = userData.referral_code || "REF" + (userData.id ? userData.id.slice(-6) : "000000");
        }
    } catch (error) {
        console.error("❌ Error referidos UI:", error);
    }
}

function openCentral() {
    showModal("centralModal");
}

function showModal(id) {
    try {
        document.getElementById("overlay").style.display = "block";
        document.getElementById(id).style.display = "block";
    } catch (error) {
        console.error("❌ Error modal:", error);
    }
}

function closeAll() {
    try {
        document.getElementById("overlay").style.display = "none";
        ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = "none";
        });
    } catch (error) {
        console.error("❌ Error cerrando:", error);
    }
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

console.log("✅ Ton City Game - TODAS LAS CORRECCIONES APLICADAS");
