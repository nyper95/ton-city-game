// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// Direcciones de billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; // Tu 20%
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb"; // Pool 80%

// TON Connect (se inicializa después)
let tonConnectUI = null;

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
    getGlobalPool();
}

// CORRECCIÓN 1: TON Connect mejorado
async function initTONConnect() {
    try {
        console.log("🔄 Inicializando TON Connect...");
        
        // Esperar a que el DOM cargue completamente
        if (!document.getElementById('ton-connect-button')) {
            // Crear el contenedor si no existe
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'ton-connect-button';
            document.body.appendChild(buttonContainer);
        }
        
        // Inicializar TON Connect UI
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        // Escuchar cambios de estado
        tonConnectUI.onStatusChange((wallet) => {
            console.log("🔄 Estado TON Connect cambiado:", wallet ? "Conectado" : "Desconectado");
            updateWalletUI(wallet);
        });
        
        // Restaurar conexión si existe
        const isConnected = await tonConnectUI.connectionRestored;
        console.log("🔗 Conexión restaurada:", isConnected);
        
        // Forzar actualización de UI
        updateWalletUI(isConnected);
        
    } catch (error) {
        console.error("❌ Error inicializando TON Connect:", error);
        // Mostrar error amigable
        showError("Error al conectar con TON. Recarga la página.");
    }
}

// CORRECCIÓN: Función de desconexión mejorada
async function disconnectWallet() {
    try {
        if (tonConnectUI) {
            console.log("🔌 Desconectando wallet...");
            await tonConnectUI.disconnect();
            updateWalletUI(null);
            showMessage("✅ Wallet desconectada");
        }
    } catch (error) {
        console.error("❌ Error desconectando wallet:", error);
        // Forzar desconexión local
        if (tonConnectUI && tonConnectUI.wallet) {
            tonConnectUI.wallet = null;
        }
        updateWalletUI(null);
        showMessage("✅ Desconectado localmente");
    }
}

function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        const walletAddress = document.getElementById('wallet-address');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');
        
        if (!connectButton || !walletInfo) {
            console.warn("⚠️ Elementos UI no encontrados");
            return;
        }
        
        if (wallet) {
            // Ocultar botón de conexión y mostrar info
            if (connectButton.style) connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');
            
            // Formatear dirección corta
            const shortAddress = wallet.address.substring(0, 6) + '...' + 
                               wallet.address.substring(wallet.address.length - 4);
            if (walletAddress) walletAddress.textContent = shortAddress;
            
            // Mostrar botón de desconexión
            if (disconnectBtn) {
                disconnectBtn.style.display = 'block';
                disconnectBtn.onclick = disconnectWallet;
            }
            
            console.log("👛 Wallet conectada:", shortAddress);
            
        } else {
            // Mostrar botón de conexión y ocultar info
            if (connectButton.style) connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
            
            // Ocultar botón de desconexión
            if (disconnectBtn) disconnectBtn.style.display = 'none';
            
            console.log("👛 Wallet desconectada");
        }
    } catch (error) {
        console.error("❌ Error actualizando UI wallet:", error);
    }
}

// =======================
// POOL GLOBAL
// =======================
async function getGlobalPool(){
    try {
        let { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("❌ Error cargando pool:", error);
        return { pool_ton: 100, total_diamonds: 100000 };
    }
}

async function updateGlobalPool(newTon, newDiamonds){
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

// =======================
// USUARIO Y REFERIDOS
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        // Detección de referidos
        let refCode = null;
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        
        if (tg.initData) {
            const initData = new URLSearchParams(tg.initData);
            const startParam = initData.get('start');
            if (startParam) refCode = startParam;
        }
        
        console.log("🔍 Código referencia detectado:", refCode);
        
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Usuario nuevo (0 diamantes)
            console.log("➕ Creando nuevo usuario (0 diamantes)");
            
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                referral_code: referralCode,
                referred_by: refCode || null,
                pool_ton: 100,
                total_diamonds: 100000,
                created_at: new Date().toISOString()
            }]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.referred_by = refCode;
            
            if (refCode) {
                console.log("🎁 Registrando referido:", refCode);
                await processReferral(refCode, userData.id);
            }
            
        } else if (data) {
            // Usuario existente
            userData.diamonds = data.diamonds || 0;
            userData.lvl_tienda = data.lvl_tienda || 0;
            userData.lvl_casino = data.lvl_casino || 0;
            userData.lvl_piscina = data.lvl_piscina || 0;
            userData.lvl_parque = data.lvl_parque || 0;
            userData.lvl_diversion = data.lvl_diversion || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referred_by = data.referred_by || null;
            userData.referral_earnings = data.referral_earnings || 0;
            
            await _supabase.from('game_data')
                .update({ last_seen: new Date().toISOString() })
                .eq('telegram_id', userData.id);
        }
        
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        await updateReferralStats();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

async function processReferral(referralCode, newUserId) {
    try {
        console.log("🤝 Procesando referencia:", referralCode);
        
        if (!referralCode) return;
        
        const { data: referrer, error } = await _supabase
            .from('game_data')
            .select('telegram_id, referred_users')
            .eq('referral_code', referralCode)
            .single();
        
        if (!referrer || error) {
            console.log("⚠️ Código inválido:", referralCode);
            return;
        }
        
        const currentReferredUsers = referrer.referred_users || [];
        const updatedReferredUsers = [...currentReferredUsers, newUserId];
        
        await _supabase.from('game_data')
            .update({
                referred_users: updatedReferredUsers,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', referrer.telegram_id);
        
        console.log(`✅ Referencia registrada para ${referrer.telegram_id}`);
        
    } catch (error) {
        console.error("❌ Error procesando referencia:", error);
    }
}

async function updateReferralStats() {
    try {
        if (!userData.id) return;
        
        const { data } = await _supabase
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
// BANCO Y COMPRAS (MEJORADO)
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        const wallet = tonConnectUI?.wallet;
        updateWalletUI(wallet);
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>`;
        
        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        const isConnected = !!wallet;
        
        tonOptions.forEach(ton => {
            const diamonds = Math.floor((ton * USER_SHARE) / price);
            const finalDiamonds = Math.max(diamonds, 100);
            
            const buttonText = isConnected ? 'COMPRAR' : 'CONECTA BILLETERA';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669);' :
                'background: #475569; cursor: not-allowed;';
            const buttonAction = isConnected ? `comprarTON(${ton})` : 'showError("Conecta tu billetera primero")';
            const buttonDisabled = !isConnected ? 'disabled' : '';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds.toLocaleString()} 💎</small>
                </div>
                <button onclick="${buttonAction}"
                        style="${buttonStyle} width: auto; min-width: 100px;"
                        ${buttonDisabled}>
                    ${buttonText}
                </button>
            </div>`;
        });
        
        if (!wallet) {
            html += `<div class="stat" style="background: #1e293b; text-align: center; padding: 15px;">
                       <p style="margin: 0; color: #facc15;">
                         <i class="fa-solid fa-wallet"></i> Conecta tu billetera para comprar
                       </p>
                     </div>`;
        }
        
        document.getElementById("bankList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error abriendo banco:", error);
        showError("Error al cargar banco");
    }
}

// CORRECCIÓN 2: Mensaje de compra simplificado
async function comprarTON(tonAmount) {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            showError("Conecta tu billetera TON primero");
            return;
        }
        
        if (tonAmount < 0.1) {
            showError("Mínimo: 0.10 TON");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        if (diamonds < 100) diamonds = 100;
        
        // Mensaje SIMPLIFICADO - sin detalles internos
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Precio: ${price.toFixed(6)} TON/💎\n` +
            `• Recibirás: ${diamonds.toLocaleString()} 💎`;
        
        if (!confirm(confirmMsg)) return;
        
        // Transacción con dos destinos
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: ((tonAmount * 0.8) * 1e9).toString() // 80% al pool
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: ((tonAmount * 0.2) * 1e9).toString() // 20% a propietario
                }
            ]
        };
        
        console.log("📤 Enviando transacción...");
        const result = await tonConnectUI.sendTransaction(tx);
        console.log("✅ Transacción enviada:", result);
        
        userData.diamonds += diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(
            pool.pool_ton + (tonAmount * 0.8),
            pool.total_diamonds + diamonds
        );
        
        actualizarUI();
        setTimeout(() => openBank(), 500);
        
        showMessage(`✅ ¡COMPRA EXITOSA!\n\n${diamonds.toLocaleString()} 💎 recibidos`);
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("Error en la compra: " + error.message);
    }
}

// =======================
// RETIROS (SISTEMA MEJORADO)
// =======================
async function retirarTON(diamonds) {
    try {
        const userWallet = tonConnectUI?.wallet;
        if (!userWallet) {
            showError("Conecta tu billetera personal");
            return;
        }
        
        // Verificar que no sea billetera del juego
        if (userWallet.address === BILLETERA_PROPIETARIO || 
            userWallet.address === BILLETERA_POOL) {
            showError("⚠️ Usa una billetera personal, no la del juego");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            showError("Diamantes insuficientes");
            return;
        }
        
        if (diamonds <= 0) {
            showError("Cantidad inválida");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        // CORRECCIÓN 3: Cálculo correcto del mínimo
        const minDiamondsFor1TON = Math.ceil(1 / price);
        if (diamonds < minDiamondsFor1TON) {
            showError(`Mínimo: ${minDiamondsFor1TON} 💎 (equivale a 1 TON)`);
            return;
        }
        
        if (tonAmount > pool.pool_ton) {
            showError("Liquidez insuficiente en el pool");
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `• Dirección: ${userWallet.address.substring(0, 6)}...${userWallet.address.substring(userWallet.address.length - 4)}`;
        
        if (!confirm(confirmMsg)) return;
        
        // Procesar retiro
        userData.diamonds -= diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        // Actualizar pool
        await updateGlobalPool(
            pool.pool_ton - tonAmount,
            pool.total_diamonds - diamonds
        );
        
        actualizarUI();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
            `• El pago se procesará manualmente en 24h.`
        );
        
        // Cerrar modal
        closeAll();
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        showError("Error en retiro: " + error.message);
    }
}

// =======================
// TIENDA Y PRODUCCIÓN
// =======================
function openStore() {
    try {
        const items = [
            {name: "Tienda", lvl: userData.lvl_tienda, price: 1000, prod: 10},
            {name: "Casino", lvl: userData.lvl_casino, price: 2500, prod: 25},
            {name: "Piscina", lvl: userData.lvl_piscina, price: 5000, prod: 60},
            {name: "Parque", lvl: userData.lvl_parque, price: 1500, prod: 15},
            {name: "Diversión", lvl: userData.lvl_diversion, price: 10000, prod: 120}
        ];
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>🏪 Tienda de Mejoras</b></span>
                      <span><b>${Math.floor(userData.diamonds).toLocaleString()} 💎</b></span>
                    </div>`;
        
        items.forEach(item => {
            const nextProduction = item.prod;
            const canAfford = userData.diamonds >= item.price;
            
            html += `<div class="stat" style="${canAfford ? 'border-left: 4px solid #10b981;' : 'border-left: 4px solid #dc2626;'}">
                <div>
                    <strong>${item.name} Nvl ${item.lvl}</strong><br>
                    <small style="color: #94a3b8;">+${nextProduction} 💎/hora</small>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; color: ${canAfford ? '#facc15' : '#94a3b8'}">
                        ${item.price.toLocaleString()} 💎
                    </div>
                    <button onclick="buyUpgrade('${item.name}',${item.price})" 
                            style="background: ${canAfford ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#475569'}; 
                                   width: auto; min-width: 100px; padding: 8px 12px; margin-top: 5px;"
                            ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'MEJORAR' : 'FONDOS INSUFICIENTES'}
                    </button>
                </div>
            </div>`;
        });
        
        html += `<div class="info-text" style="margin-top: 15px; text-align: center;">
                   Cada mejora aumenta tu producción por hora
                 </div>`;
        
        document.getElementById("storeList").innerHTML = html;
        showModal("modalStore");
        
    } catch (error) {
        console.error("❌ Error tienda:", error);
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
        if (!fieldToUpdate) return;
        
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
        openStore();
        
        showMessage(`✅ ${name} mejorada a nivel ${userData[fieldToUpdate]}`);
        
    } catch (error) {
        console.error("❌ Error mejorando:", error);
    }
}

// =======================
// UI Y UTILIDADES
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
            
            if (document.getElementById("centralModal").style.display === "block") {
                document.getElementById("s_tienda").textContent = Math.floor(prodPerSecond.tienda * 3600);
                document.getElementById("s_casino").textContent = Math.floor(prodPerSecond.casino * 3600);
                document.getElementById("s_piscina").textContent = Math.floor(prodPerSecond.piscina * 3600);
                document.getElementById("s_parque").textContent = Math.floor(prodPerSecond.parque * 3600);
                document.getElementById("s_diversion").textContent = Math.floor(prodPerSecond.diversion * 3600);
                document.getElementById("s_total").textContent = Math.floor(totalPerSecond * 3600);
            }
            
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
        
        document.getElementById("s_tienda").textContent = prod.tienda;
        document.getElementById("s_casino").textContent = prod.casino;
        document.getElementById("s_piscina").textContent = prod.piscina;
        document.getElementById("s_parque").textContent = prod.parque;
        document.getElementById("s_diversion").textContent = prod.diversion;
        document.getElementById("s_total").textContent = total;
        
        showModal("centralModal");
        
    } catch (error) {
        console.error("❌ Error central:", error);
        showError("Error estadísticas");
    }
}

async function openWithdraw() {
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        // Cálculo CORREGIDO del mínimo
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = minDiamondsFor1TON; // Establecer valor mínimo por defecto
            input.min = minDiamondsFor1TON;
            input.placeholder = `Mínimo: ${minDiamondsFor1TON} 💎`;
        }
        
        const infoElement = document.getElementById("withdraw-info");
        if (infoElement) {
            infoElement.innerHTML = 
                `<div style="background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>Mínimo de retiro:</strong><br>
                    <span style="color: #facc15; font-size: 1.2em;">${minDiamondsFor1TON} 💎</span> 
                    <small>(equivale a 1 TON)</small>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 8px;">
                    <strong>Recibirás:</strong><br>
                    <span id="ton-receive" style="color: #10b981; font-size: 1.2em;">${(minDiamondsFor1TON * price).toFixed(4)}</span> TON
                </div>`;
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
        const diamonds = parseInt(input.value);
        const pool = { pool_ton: 100, total_diamonds: 100000 };
        const price = calcPrice(pool);
        
        if (!diamonds || diamonds <= 0) {
            document.getElementById("ton-receive").textContent = "0";
            return;
        }
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        const tonAmount = diamonds * price;
        
        const tonReceiveElem = document.getElementById("ton-receive");
        
        if (diamonds < minDiamondsFor1TON) {
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444;">
                    MÍNIMO ${minDiamondsFor1TON} 💎
                </span>`;
            return;
        }
        
        if (diamonds > userData.diamonds) {
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444;">
                    EXCEDE TUS ${Math.floor(userData.diamonds)} 💎
                </span>`;
            return;
        }
        
        tonReceiveElem.innerHTML = 
            `<span style="color: #10b981; font-size: 1.2em;">
                ${tonAmount.toFixed(4)}
            </span> TON`;
        
    } catch (error) {
        console.error("❌ Error cálculo retiro:", error);
    }
}

async function processWithdraw() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value);
        
        if (!diamonds || diamonds <= 0) {
            showError("Cantidad inválida");
            return;
        }
        
        await retirarTON(diamonds);
        closeAll();
        
    } catch (error) {
        console.error("❌ Error procesando retiro:", error);
        showError("Error en retiro");
    }
}

async function openFriends() {
    try {
        await updateReferralStats();
        showModal("modalFriends");
    } catch (error) {
        console.error("❌ Error amigos:", error);
        showError("Error cargando amigos");
    }
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
        
        ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"]
            .forEach(id => {
                const modal = document.getElementById(id);
                if (modal) modal.style.display = "none";
            });
    } catch (error) {
        console.error("❌ Error cerrando:", error);
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
    console.log("📄 DOM cargado");
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
window.retirarTON = retirarTON;
window.disconnectWallet = disconnectWallet;
window.tonConnectUI = tonConnectUI;

console.log("🌐 Ton City Game - Código corregido y listo");
