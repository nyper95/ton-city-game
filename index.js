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
// CORRECCIÓN CRÍTICA: CARGAR USUARIO CON PRODUCCIÓN OFFLINE
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
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
                last_seen: now.toISOString(),
                last_online: now.toISOString(),
                created_at: now.toISOString()
            };
            
            await _supabase.from('game_data').insert([newUser]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.last_online = now.toISOString();
            
        } else if (data) {
            // USUARIO EXISTENTE - CORRECCIÓN CRÍTICA
            console.log("📁 Usuario encontrado en Supabase:", data);
            
            // 1. Cargar datos básicos
            userData.diamonds = data.diamonds || 0;
            userData.lvl_tienda = data.lvl_tienda || 0;
            userData.lvl_casino = data.lvl_casino || 0;
            userData.lvl_piscina = data.lvl_piscina || 0;
            userData.lvl_parque = data.lvl_parque || 0;
            userData.lvl_diversion = data.lvl_diversion || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referral_earnings = data.referral_earnings || 0;
            userData.last_online = data.last_online || now.toISOString();
            
            console.log("📊 Datos cargados:", {
                diamonds: userData.diamonds,
                niveles: {
                    tienda: userData.lvl_tienda,
                    casino: userData.lvl_casino,
                    piscina: userData.lvl_piscina,
                    parque: userData.lvl_parque,
                    diversion: userData.lvl_diversion
                },
                last_online: userData.last_online
            });
            
            // 2. CALCULAR PRODUCCIÓN OFFLINE (CORRECCIÓN PRINCIPAL)
            if (data.last_online) {
                const lastOnline = new Date(data.last_online);
                const hoursOffline = (now - lastOnline) / (1000 * 60 * 60); // Horas desde última vez online
                
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
                        console.log(`💰 Producción offline calculada: ${diamondsEarned} 💎 (${hoursOffline.toFixed(2)} horas)`);
                        
                        // Guardar en Supabase inmediatamente
                        await _supabase.from('game_data')
                            .update({ 
                                diamonds: userData.diamonds,
                                last_online: now.toISOString(),
                                last_seen: now.toISOString()
                            })
                            .eq('telegram_id', userData.id);
                    }
                }
            }
            
            // 3. Actualizar last_online y last_seen
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
        
        console.log("✅ Usuario cargado correctamente con producción offline");
        
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
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
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
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${diamonds.toLocaleString()} 💎\n` +
            `• Precio: ${price.toFixed(6)} TON/💎`;
        
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
            
            // CORRECCIÓN: Guardar en Supabase inmediatamente
            await _supabase.from("game_data")
                .update({ 
                    diamonds: userData.diamonds,
                    last_seen: new Date().toISOString()
                })
                .eq("telegram_id", userData.id);
            
            // Actualizar pool global
            await updateGlobalPoolAfterPurchase(tonAmount, diamonds);
            
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

async function updateGlobalPoolAfterPurchase(tonAmount, diamonds) {
    try {
        const pool = await getGlobalPool();
        
        const newPoolTon = pool.pool_ton + (tonAmount * 0.8);
        const newTotalDiamonds = pool.total_diamonds + diamonds;
        
        await _supabase
            .from("game_data")
            .update({
                pool_ton: newPoolTon,
                total_diamonds: newTotalDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq("telegram_id", "MASTER");
        
        console.log(`📊 Pool actualizado: ${newPoolTon} TON, ${newTotalDiamonds} 💎`);
        
    } catch (error) {
        console.error("❌ Error actualizando pool:", error);
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
        
        // CORRECCIÓN: Guardar en Supabase inmediatamente
        const updateData = {
            diamonds: userData.diamonds,
            [fieldToUpdate]: userData[fieldToUpdate],
            last_seen: new Date().toISOString()
        };
        
        await _supabase
            .from('game_data')
            .update(updateData)
            .eq('telegram_id', userData.id);
        
        actualizarUI();
        
        setTimeout(() => openStore(), 100);
        
        showMessage(`✅ ${name} mejorada a nivel ${userData[fieldToUpdate]}!`);
        
    } catch (error) {
        console.error("❌ Error mejorando:", error);
        showError("Error al comprar mejora");
    }
}

// =======================
// PRODUCCIÓN EN TIEMPO REAL + GUARDADO EN SUPABASE
// =======================
function startProduction() {
    console.log("⚙️ Iniciando producción en tiempo real...");
    
    let lastSaveTime = Date.now();
    
    setInterval(async () => {
        try {
            if (!userData.id) return;
            
            // Calcular producción por segundo
            const prodPerSecond = {
                tienda: userData.lvl_tienda * PROD_VAL.tienda / 3600,
                casino: userData.lvl_casino * PROD_VAL.casino / 3600,
                piscina: userData.lvl_piscina * PROD_VAL.piscina / 3600,
                parque: userData.lvl_parque * PROD_VAL.parque / 3600,
                diversion: userData.lvl_diversion * PROD_VAL.diversion / 3600
            };
            
            const totalPerSecond = 
                prodPerSecond.tienda + prodPerSecond.casino + 
                prodPerSecond.piscina + prodPerSecond.parque + 
                prodPerSecond.diversion;
            
            // Añadir diamantes
            userData.diamonds += totalPerSecond;
            
            // Actualizar UI
            actualizarUI();
            
            // Actualizar estadísticas si el modal está abierto
            if (document.getElementById("centralModal")?.style.display === "block") {
                updateCentralStats();
            }
            
            // CORRECCIÓN: Guardar en Supabase cada 30 segundos
            const currentTime = Date.now();
            if (currentTime - lastSaveTime >= 30000) { // 30 segundos
                await saveUserData();
                lastSaveTime = currentTime;
                console.log("💾 Diamantes guardados en Supabase");
            }
            
        } catch (error) {
            console.error("❌ Error producción:", error);
        }
    }, 1000); // Ejecutar cada segundo
}

// FUNCIÓN PARA GUARDAR DATOS EN SUPABASE
async function saveUserData() {
    try {
        if (!userData.id) return;
        
        await _supabase.from('game_data')
            .update({ 
                diamonds: userData.diamonds,
                last_seen: new Date().toISOString(),
                last_online: new Date().toISOString() // IMPORTANTE: Marcar como online
            })
            .eq('telegram_id', userData.id);
            
    } catch (error) {
        console.error("❌ Error guardando datos:", error);
    }
}

// =======================
// RETIROS
// =======================
async function openWithdraw() {
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = minDiamondsFor1TON;
            input.placeholder = `Mínimo: ${minDiamondsFor1TON} 💎`;
        }
        
        const infoElement = document.getElementById("withdraw-info");
        if (infoElement) {
            infoElement.innerHTML = 
                `Mínimo: <span class="highlight">${minDiamondsFor1TON} 💎</span> (1 TON)<br>` +
                `Recibirás: <span id="ton-receive" class="highlight">0</span> TON`;
        }
        
        showModal("modalWithdraw");
        
    } catch (error) {
        console.error("❌ Error retiro:", error);
        showError("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value) || 0;
        
        if (!input || diamonds <= 0) {
            document.getElementById("ton-receive").textContent = "0";
            return;
        }
        
        const pool = { pool_ton: 100, total_diamonds: 100000 };
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        const tonReceiveElem = document.getElementById("ton-receive");
        
        if (diamonds < minDiamondsFor1TON) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Mínimo ${minDiamondsFor1TON} 💎</span>`;
            return;
        }
        
        if (diamonds > userData.diamonds) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Máximo ${Math.floor(userData.diamonds)} 💎</span>`;
            return;
        }
        
        tonReceiveElem.textContent = tonAmount.toFixed(4);
        tonReceiveElem.style.color = "#10b981";
        
    } catch (error) {
        console.error("❌ Error cálculo retiro:", error);
    }
}

async function processWithdraw() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value);
        
        if (!diamonds || diamonds <= 0) {
            showError("❌ Ingresa una cantidad válida");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            showError(`❌ Máximo ${Math.floor(userData.diamonds)} 💎`);
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        if (diamonds < minDiamondsFor1TON) {
            showError(`❌ Mínimo: ${minDiamondsFor1TON} 💎 (1 TON)`);
            return;
        }
        
        const tonAmount = diamonds * price;
        
        if (tonAmount > pool.pool_ton) {
            showError(`❌ Liquidez insuficiente. Máximo: ${Math.floor(pool.pool_ton / price)} 💎`);
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `Precio: ${price.toFixed(6)} TON/💎`;
        
        if (!confirm(confirmMsg)) return;
        
        // Procesar retiro
        userData.diamonds -= diamonds;
        
        // Actualizar pool
        const newPoolTon = pool.pool_ton - tonAmount;
        const newTotalDiamonds = pool.total_diamonds - diamonds;
        
        // CORRECCIÓN: Guardar en Supabase inmediatamente
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await _supabase
            .from("game_data")
            .update({
                pool_ton: newPoolTon,
                total_diamonds: newTotalDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq("telegram_id", "MASTER");
        
        actualizarUI();
        closeAll();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
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
async function getGlobalPool() {
    try {
        let { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) {
            const initialPool = {
                telegram_id: "MASTER",
                pool_ton: 100,
                total_diamonds: 100000,
                last_seen: new Date().toISOString()
            };
            
            await _supabase.from("game_data").insert([initialPool]);
            return initialPool;
        }
        
        return data;
    } catch (error) {
        console.error("❌ Error cargando pool:", error);
        return { pool_ton: 100, total_diamonds: 100000 };
    }
}

function calcPrice(pool = null) {
    if (!pool) pool = { pool_ton: 100, total_diamonds: 100000 };
    if (!pool || pool.total_diamonds <= 0) return 0.001;
    const price = (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
    return Math.max(price, 0.000001);
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

// =======================
// FUNCIONES DE UI
// =======================
function openCentral() {
    updateCentralStats();
    showModal("centralModal");
}

function openFriends() {
    showModal("modalFriends");
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

console.log("🌐 Ton City Game - SISTEMA DE PRODUCCIÓN 24/7 ACTIVADO");
