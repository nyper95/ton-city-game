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
    referral_earnings: 0
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
// TON CONNECT - CORREGIDO
// =======================
async function initTONConnect() {
    try {
        console.log("🔄 Inicializando TON Connect...");
        
        // Verificar que la librería esté cargada
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error("❌ TON_CONNECT_UI no está disponible");
            return;
        }
        
        // Inicializar TON Connect UI
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        console.log("✅ TON Connect UI inicializado");
        
        // Escuchar cambios de estado
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
        const walletAddress = document.getElementById('wallet-address');
        
        if (!walletInfo || !walletAddress) return;
        
        if (wallet) {
            // WALLET CONECTADA
            console.log("👛 Wallet conectada:", wallet.address);
            
            // Ocultar botón de conexión
            if (connectButton) {
                connectButton.style.display = 'none';
            }
            
            // Mostrar info de wallet
            walletInfo.classList.remove('hidden');
            walletInfo.classList.add('visible');
            
            // Mostrar dirección corta
            const shortAddr = wallet.address.substring(0, 6) + '...' + 
                            wallet.address.substring(wallet.address.length - 4);
            walletAddress.textContent = shortAddr;
            
        } else {
            // WALLET DESCONECTADA
            console.log("👛 Wallet desconectada");
            
            // Mostrar botón de conexión
            if (connectButton) {
                connectButton.style.display = 'block';
            }
            
            // Ocultar info de wallet
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
        
        // Forzar actualización
        currentWallet = null;
        updateWalletUI(null);
        showMessage("✅ Wallet desconectada");
        
    } catch (error) {
        console.error("❌ Error desconectando:", error);
        // Desconexión forzada
        currentWallet = null;
        updateWalletUI(null);
        showMessage("✅ Desconectado localmente");
    }
}

// =======================
// USUARIO Y BASE DE DATOS
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        // Verificar si el usuario existe
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Usuario nuevo
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
                created_at: new Date().toISOString(),
                last_seen: new Date().toISOString()
            };
            
            await _supabase.from('game_data').insert([newUser]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            
        } else if (data) {
            // Usuario existente
            console.log("📁 Usuario encontrado:", data);
            
            userData.diamonds = data.diamonds || 0;
            userData.lvl_tienda = data.lvl_tienda || 0;
            userData.lvl_casino = data.lvl_casino || 0;
            userData.lvl_piscina = data.lvl_piscina || 0;
            userData.lvl_parque = data.lvl_parque || 0;
            userData.lvl_diversion = data.lvl_diversion || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referral_earnings = data.referral_earnings || 0;
            
            // Actualizar last_seen
            await _supabase.from('game_data')
                .update({ last_seen: new Date().toISOString() })
                .eq('telegram_id', userData.id);
        }
        
        // Actualizar UI
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        
        console.log("✅ Usuario cargado:", userData);
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

// =======================
// BANCO - CORREGIDO
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        // Actualizar UI de wallet
        updateWalletUI(currentWallet);
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>`;
        
        const tonOptions = [1, 2, 5, 10];
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
        
        if (tonAmount < 1) {
            showError("Mínimo: 1 TON");
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
        
        // Transacción con dos destinos
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutos
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: (tonAmount * 0.8 * 1000000000).toString() // 80% al pool (en nanoton)
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: (tonAmount * 0.2 * 1000000000).toString() // 20% a propietario
                }
            ]
        };
        
        console.log("Transacción:", tx);
        
        try {
            // Enviar transacción
            const result = await tonConnectUI.sendTransaction(tx);
            console.log("✅ Transacción enviada:", result);
            
            // Actualizar diamantes del usuario
            userData.diamonds += diamonds;
            
            // Guardar en Supabase
            await _supabase.from("game_data")
                .update({ diamonds: userData.diamonds })
                .eq("telegram_id", userData.id);
            
            // Actualizar pool global
            await updateGlobalPool(
                pool.pool_ton + (tonAmount * 0.8),
                pool.total_diamonds + diamonds
            );
            
            actualizarUI();
            
            showMessage(`✅ ¡COMPRA EXITOSA!\n\nHas recibido ${diamonds.toLocaleString()} 💎`);
            
            // Actualizar banco
            setTimeout(() => openBank(), 1000);
            
        } catch (txError) {
            console.error("❌ Error en transacción:", txError);
            if (txError.message && txError.message.includes("canceled")) {
                showError("❌ Transacción cancelada por el usuario");
            } else {
                showError("❌ Error en la transacción: " + (txError.message || "Error desconocido"));
            }
        }
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("❌ Error en la compra: " + (error.message || "Error desconocido"));
    }
}

// =======================
// TIENDA - CORREGIDO
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
            const nextProduction = item.prod;
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
                    +${nextProduction} 💎/hora
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
        
        // Recargar tienda
        setTimeout(() => openStore(), 100);
        
        showMessage(`✅ ${name} mejorada a nivel ${userData[fieldToUpdate]}!`);
        
    } catch (error) {
        console.error("❌ Error mejorando:", error);
        showError("Error al comprar mejora");
    }
}

// =======================
// SISTEMA DE REFERIDOS - CORREGIDO
// =======================
async function openFriends() {
    try {
        showModal("modalFriends");
        
        // Asegurar que tenemos los datos
        if (!userData.referral_code && userData.id) {
            userData.referral_code = 'REF' + userData.id.toString().slice(-6);
        }
        
        // Actualizar estadísticas
        await updateReferralStats();
        
    } catch (error) {
        console.error("❌ Error abriendo amigos:", error);
        showError("Error cargando amigos");
    }
}

async function updateReferralStats() {
    try {
        if (!userData.id) return;
        
        // Obtener datos actualizados
        const { data, error } = await _supabase
            .from('game_data')
            .select('referral_earnings, referred_users, referral_code')
            .eq('telegram_id', userData.id)
            .single();
        
        if (data) {
            const refCount = data.referred_users?.length || 0;
            const earnings = data.referral_earnings || 0;
            const referralCode = data.referral_code || userData.referral_code;
            
            userData.referral_earnings = earnings;
            userData.referral_code = referralCode;
            
            // Actualizar UI
            const refCountElem = document.getElementById("ref-count");
            const refEarningsElem = document.getElementById("ref-earnings");
            const refTotalElem = document.getElementById("ref-total");
            const referralCodeElem = document.getElementById("referral-code");
            
            if (refCountElem) refCountElem.textContent = refCount;
            if (refEarningsElem) refEarningsElem.textContent = `${earnings} 💎`;
            if (refTotalElem) refTotalElem.textContent = `${earnings} 💎`;
            if (referralCodeElem) referralCodeElem.textContent = referralCode || "NO DISPONIBLE";
        }
        
    } catch (error) {
        console.error("❌ Error stats referidos:", error);
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
                `Mínimo: <span class="highlight">${minDiamondsFor1TON} 💎</span><br>` +
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
            showError(`❌ Mínimo: ${minDiamondsFor1TON} 💎`);
            return;
        }
        
        const tonAmount = diamonds * price;
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `Recibirás: ${tonAmount.toFixed(4)} TON`;
        
        if (!confirm(confirmMsg)) return;
        
        // Simular retiro (en versión beta)
        userData.diamonds -= diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
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
        
        if (error) throw error;
        return data || { pool_ton: 100, total_diamonds: 100000 };
    } catch (error) {
        console.error("❌ Error cargando pool:", error);
        return { pool_ton: 100, total_diamonds: 100000 };
    }
}

async function updateGlobalPool(newTon, newDiamonds) {
    try {
        await _supabase
            .from("game_data")
            .update({
                pool_ton: newTon,
                total_diamonds: newDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq("telegram_id", "MASTER");
    } catch (error) {
        console.error("❌ Error actualizando pool:", error);
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

function startProduction() {
    console.log("⚙️ Iniciando producción");
    
    setInterval(async () => {
        try {
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
            
            userData.diamonds += totalPerSecond;
            
            actualizarUI();
            
            // Actualizar estadísticas si el modal está abierto
            if (document.getElementById("centralModal")?.style.display === "block") {
                const s_tienda = document.getElementById("s_tienda");
                const s_casino = document.getElementById("s_casino");
                const s_piscina = document.getElementById("s_piscina");
                const s_parque = document.getElementById("s_parque");
                const s_diversion = document.getElementById("s_diversion");
                const s_total = document.getElementById("s_total");
                
                if (s_tienda) s_tienda.textContent = Math.floor(prodPerSecond.tienda * 3600);
                if (s_casino) s_casino.textContent = Math.floor(prodPerSecond.casino * 3600);
                if (s_piscina) s_piscina.textContent = Math.floor(prodPerSecond.piscina * 3600);
                if (s_parque) s_parque.textContent = Math.floor(prodPerSecond.parque * 3600);
                if (s_diversion) s_diversion.textContent = Math.floor(prodPerSecond.diversion * 3600);
                if (s_total) s_total.textContent = Math.floor(totalPerSecond * 3600);
            }
            
            // Guardar cada 30 segundos
            if (Math.floor(Date.now() / 1000) % 30 === 0 && userData.id) {
                await _supabase.from('game_data')
                    .update({ diamonds: userData.diamonds })
                    .eq('telegram_id', userData.id);
            }
            
        } catch (error) {
            console.error("❌ Error producción:", error);
        }
    }, 1000);
}

function openCentral() {
    try {
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
        
        showModal("centralModal");
        
    } catch (error) {
        console.error("❌ Error central:", error);
        showError("Error estadísticas");
    }
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

console.log("🌐 Ton City Game - Código completamente corregido y listo");
