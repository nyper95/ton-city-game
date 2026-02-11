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

// Variables globales para pool
let globalPoolData = {
    pool_ton: 100,
    total_diamonds: 100000
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
        await loadGlobalPool(); // Cargar pool al inicio
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
// CORRECCIÓN 1: CÓDIGO DE REFERIDO FUNCIONAL
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        // CORRECCIÓN 1: Generar código de referido SIEMPRE
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
            
            const { data: newData, error: insertError } = await _supabase
                .from('game_data')
                .insert([newUser])
                .select()
                .single();
            
            if (insertError) {
                console.error("❌ Error creando usuario:", insertError);
                // Usar datos locales si falla Supabase
                userData.diamonds = 0;
                userData.referral_code = referralCode;
                userData.last_online = now.toISOString();
            } else {
                console.log("✅ Usuario creado en Supabase");
                userData = { ...userData, ...newData };
            }
            
        } else if (data) {
            // USUARIO EXISTENTE
            console.log("📁 Usuario encontrado en Supabase:", data);
            
            // 1. Cargar datos básicos
            userData.diamonds = Number(data.diamonds) || 0;
            userData.lvl_tienda = Number(data.lvl_tienda) || 0;
            userData.lvl_casino = Number(data.lvl_casino) || 0;
            userData.lvl_piscina = Number(data.lvl_piscina) || 0;
            userData.lvl_parque = Number(data.lvl_parque) || 0;
            userData.lvl_diversion = Number(data.lvl_diversion) || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referral_earnings = Number(data.referral_earnings) || 0;
            userData.last_online = data.last_online || now.toISOString();
            
            // 2. CALCULAR PRODUCCIÓN OFFLINE
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
                        
                        // Guardar en Supabase inmediatamente
                        await saveUserData();
                    }
                }
            }
            
            // 3. Actualizar last_online y last_seen
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
        
        // ACTUALIZAR CÓDIGO DE REFERIDO INMEDIATAMENTE
        updateReferralUI();
        
        console.log("✅ Usuario cargado correctamente");
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

// Función para actualizar UI de referidos
function updateReferralUI() {
    try {
        const referralCodeElem = document.getElementById("referral-code");
        const refCountElem = document.getElementById("ref-count");
        const refEarningsElem = document.getElementById("ref-earnings");
        const refTotalElem = document.getElementById("ref-total");
        
        if (referralCodeElem) {
            referralCodeElem.textContent = userData.referral_code || "NO DISPONIBLE";
        }
        
        if (refCountElem) refCountElem.textContent = "0"; // Temporal, se actualizará después
        if (refEarningsElem) refEarningsElem.textContent = `${userData.referral_earnings} 💎`;
        if (refTotalElem) refTotalElem.textContent = `${userData.referral_earnings} 💎`;
        
    } catch (error) {
        console.error("❌ Error actualizando UI referidos:", error);
    }
}

// =======================
// CORRECCIÓN 2: CARGAR POOL GLOBAL
// =======================
async function loadGlobalPool() {
    try {
        console.log("📊 Cargando pool global...");
        
        let { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) {
            console.log("⚠️ Creando registro MASTER...");
            const initialPool = {
                telegram_id: "MASTER",
                username: "MASTER",
                diamonds: 0,
                pool_ton: 100,
                total_diamonds: 100000,
                last_seen: new Date().toISOString()
            };
            
            await _supabase.from("game_data").insert([initialPool]);
            globalPoolData = initialPool;
        } else {
            globalPoolData = {
                pool_ton: Number(data.pool_ton) || 100,
                total_diamonds: Number(data.total_diamonds) || 100000
            };
        }
        
        console.log("✅ Pool global cargado:", globalPoolData);
        
    } catch (error) {
        console.error("❌ Error cargando pool global:", error);
        globalPoolData = { pool_ton: 100, total_diamonds: 100000 };
    }
}

// Función para obtener pool global (usar variable en memoria)
async function getGlobalPool() {
    return globalPoolData;
}

// Función para actualizar pool global
async function updateGlobalPool(newTon, newDiamonds) {
    try {
        globalPoolData.pool_ton = newTon;
        globalPoolData.total_diamonds = newDiamonds;
        
        await _supabase
            .from("game_data")
            .update({
                pool_ton: newTon,
                total_diamonds: newDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq("telegram_id", "MASTER");
        
        console.log(`📊 Pool actualizado: ${newTon} TON, ${newDiamonds} 💎`);
        
    } catch (error) {
        console.error("❌ Error actualizando pool:", error);
    }
}

// =======================
// CORRECCIÓN 3: FÓRMULA DE PRECIO CORRECTA
// =======================
function calcPrice() {
    // FÓRMULA CORRECTA: precio = (pool_ton * 0.8) / total_diamonds
    // Donde pool_ton es el TON disponible en BILLETERA_POOL (80%)
    if (!globalPoolData || globalPoolData.total_diamonds <= 0) return 0.001;
    
    const price = (globalPoolData.pool_ton * USER_SHARE) / globalPoolData.total_diamonds;
    return Math.max(price, 0.000001);
}

// =======================
// BANCO
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        updateWalletUI(currentWallet);
        
        // Usar pool global actualizado
        const price = calcPrice();
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>
                    <div class="info-text" style="margin-bottom: 15px;">
                      Pool: ${globalPoolData.pool_ton.toFixed(2)} TON / ${globalPoolData.total_diamonds.toLocaleString()} 💎
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
        
        const price = calcPrice();
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${diamonds.toLocaleString()} 💎\n` +
            `• Precio: ${price.toFixed(6)} TON/💎\n` +
            `• Pool actual: ${globalPoolData.pool_ton.toFixed(2)} TON`;
        
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
            
            // Guardar en Supabase inmediatamente
            await saveUserData();
            
            // Actualizar pool global (añadir 80% del TON y los diamantes)
            const poolTonToAdd = tonAmount * 0.8;
            await updateGlobalPool(
                globalPoolData.pool_ton + poolTonToAdd,
                globalPoolData.total_diamonds + diamonds
            );
            
            actualizarUI();
            
            showMessage(`✅ ¡COMPRA EXITOSA!\n\nHas recibido ${diamonds.toLocaleString()} 💎`);
            
            setTimeout(() => openBank(), 1000);
            
        } catch (txError) {
            console.error("❌ Error en transacción:", txError);
            if (txError.message && txError.message.includes("canceled")) {
                showError("❌ Transacción cancelada por el usuario");
            } else {
                showError("❌ Error en la transacción");
            }
        }
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("❌ Error en la compra");
    }
}

// =======================
// CORRECCIÓN 4: RETIRO CON FÓRMULA CORRECTA Y ACTUALIZACIÓN EN TIEMPO REAL
// =======================
async function openWithdraw() {
    try {
        showModal("modalWithdraw");
        
        // Actualizar pool antes de calcular
        await loadGlobalPool();
        const price = calcPrice();
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        // Cálculo correcto del mínimo
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minDiamondsFor1TON;
            input.max = Math.floor(userData.diamonds);
            input.placeholder = `Mínimo: ${minDiamondsFor1TON} 💎`;
            
            // Agregar event listener para cálculo en tiempo real
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
                    <strong>📝 Fórmula:</strong><br>
                    Precio = (${globalPoolData.pool_ton.toFixed(2)} TON × 0.8) / ${globalPoolData.total_diamonds.toLocaleString()} 💎<br>
                    = ${price.toFixed(6)} TON/💎
                </div>`;
        }
        
        // Calcular valor inicial
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
        
        // Calcular mínimo
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
        
        // Calcular TON a recibir (FÓRMULA CORRECTA)
        const tonAmount = diamonds * price;
        
        // Verificar liquidez
        if (tonAmount > globalPoolData.pool_ton) {
            const maxDiamonds = Math.floor(globalPoolData.pool_ton / price);
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444;">
                    Liquidez insuficiente<br>
                    Máximo: ${maxDiamonds.toLocaleString()} 💎
                </span>`;
            return;
        }
        
        // Mostrar resultado
        tonReceiveElem.textContent = tonAmount.toFixed(4);
        tonReceiveElem.style.color = "#10b981";
        
        console.log(`💰 Cálculo retiro: ${diamonds} 💎 × ${price.toFixed(6)} = ${tonAmount.toFixed(4)} TON`);
        
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
            showError(`❌ Mínimo: ${minDiamondsFor1TON} 💎 (1 TON)`);
            return;
        }
        
        const tonAmount = diamonds * price;
        
        // Verificar liquidez
        if (tonAmount > globalPoolData.pool_ton) {
            showError(`❌ Liquidez insuficiente en el pool`);
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `• Precio: ${price.toFixed(6)} TON/💎\n` +
            `• Pool antes: ${globalPoolData.pool_ton.toFixed(2)} TON`;
        
        if (!confirm(confirmMsg)) return;
        
        // Procesar retiro
        userData.diamonds -= diamonds;
        
        // Actualizar pool: quitar TON y diamantes
        const newPoolTon = globalPoolData.pool_ton - tonAmount;
        const newTotalDiamonds = globalPoolData.total_diamonds - diamonds;
        
        // Guardar cambios
        await saveUserData();
        await updateGlobalPool(newPoolTon, newTotalDiamonds);
        
        actualizarUI();
        closeAll();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
            `• Pool después: ${newPoolTon.toFixed(2)} TON\n` +
            `• El pago se procesará en 24h.`
        );
        
    } catch (error) {
        console.error("❌ Error procesando retiro:", error);
        showError("Error en retiro");
    }
}

// =======================
// FUNCIÓN MEJORADA PARA GUARDAR DATOS
// =======================
async function saveUserData() {
    try {
        if (!userData.id) {
            console.warn("⚠️ No hay userData.id para guardar");
            return false;
        }
        
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
        
        console.log("💾 Guardando en Supabase:", updateData);
        
        const { data, error } = await _supabase
            .from('game_data')
            .update(updateData)
            .eq('telegram_id', userData.id)
            .select();
        
        if (error) {
            console.error("❌ Error guardando en Supabase:", error);
            return false;
        }
        
        console.log("✅ Datos guardados en Supabase");
        return true;
        
    } catch (error) {
        console.error("❌ Error en saveUserData:", error);
        return false;
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
        
        // Guardar en Supabase
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
        
        // Asegurar que tenemos los datos
        if (!userData.referral_code && userData.id) {
            userData.referral_code = 'REF' + userData.id.toString().slice(-6);
        }
        
        // Actualizar UI inmediatamente
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
            
            document.getElementById("referral-code").innerHTML = 
                `<div style="text-align: center; padding: 10px; background: #0f172a; border-radius: 10px;">
                    <code style="font-size: 0.9rem; word-break: break-all;">${telegramDeepLink}</code>
                </div>`;
                
        }).catch(err => {
            console.error("❌ Error copiando:", err);
            showMessage(`🔗 Copia manual:\n\n${telegramDeepLink}`);
        });
        
    } catch (error) {
        console.error("❌ Error copiar código:", error);
        showError("Error al generar enlace");
    }
}

// =======================
// PRODUCCIÓN CON GUARDADO AUTOMÁTICO
// =======================
function startProduction() {
    console.log("⚙️ Iniciando producción con guardado automático...");
    
    let lastSaveTime = Date.now();
    
    setInterval(async () => {
        try {
            if (!userData.id) return;
            
            // Calcular producción por segundo
            const totalPerHr = 
                userData.lvl_tienda * PROD_VAL.tienda +
                userData.lvl_casino * PROD_VAL.casino +
                userData.lvl_piscina * PROD_VAL.piscina +
                userData.lvl_parque * PROD_VAL.parque +
                userData.lvl_diversion * PROD_VAL.diversion;
            
            const diamondsPerSecond = totalPerHr / 3600;
            
            // Añadir diamantes
            userData.diamonds += diamondsPerSecond;
            
            // Actualizar UI
            actualizarUI();
            
            // Actualizar estadísticas si el modal está abierto
            if (document.getElementById("centralModal")?.style.display === "block") {
                updateCentralStats();
            }
            
            // Guardar en Supabase cada 30 segundos
            const currentTime = Date.now();
            if (currentTime - lastSaveTime >= 30000) {
                await saveUserData();
                lastSaveTime = currentTime;
                console.log("💾 Guardado automático de producción");
            }
            
        } catch (error) {
            console.error("❌ Error en producción:", error);
        }
    }, 1000);
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
