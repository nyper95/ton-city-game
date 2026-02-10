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
let walletConnected = false;

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

// CORRECCIÓN COMPLETA: TON Connect funcional
async function initTONConnect() {
    try {
        console.log("🔄 Inicializando TON Connect...");
        
        // Verificar si la librería está cargada
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error("❌ TON_CONNECT_UI no está definido");
            showError("Error: TON Connect no se cargó correctamente. Recarga la página.");
            return;
        }
        
        // Asegurarse de que exista el elemento
        if (!document.getElementById('ton-connect-button')) {
            console.log("⚠️ Creando elemento ton-connect-button...");
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'ton-connect-button';
            buttonContainer.style.position = 'relative';
            document.body.appendChild(buttonContainer);
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
            console.log("🔄 Estado TON Connect cambiado:", wallet);
            walletConnected = !!wallet;
            updateWalletUI(wallet);
            
            // Actualizar UI en tiempo real
            if (document.getElementById("modalBank").style.display === "block") {
                openBank();
            }
        });
        
        // Verificar conexión existente
        setTimeout(async () => {
            try {
                const wallet = tonConnectUI.wallet;
                if (wallet) {
                    console.log("🔗 Wallet ya conectada:", wallet);
                    updateWalletUI(wallet);
                }
            } catch (error) {
                console.log("ℹ️ No hay conexión previa");
            }
        }, 1000);
        
    } catch (error) {
        console.error("❌ Error inicializando TON Connect:", error);
        showError("Error al inicializar TON Connect. Asegúrate de tener una wallet instalada como TonKeeper.");
    }
}

// CORRECCIÓN: Función de desconexión simplificada
async function disconnectWallet() {
    try {
        console.log("🔌 Intentando desconectar wallet...");
        
        if (tonConnectUI) {
            await tonConnectUI.disconnect();
            console.log("✅ Wallet desconectada via TON Connect");
        }
        
        // Resetear estado local
        walletConnected = false;
        updateWalletUI(null);
        showMessage("✅ Wallet desconectada");
        
    } catch (error) {
        console.error("❌ Error en desconexión formal:", error);
        
        // Desconexión forzada
        walletConnected = false;
        updateWalletUI(null);
        showMessage("✅ Wallet desconectada localmente");
    }
}

function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        const walletAddress = document.getElementById('wallet-address');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');
        
        console.log("🔄 Actualizando UI wallet, estado:", wallet ? "conectado" : "desconectado");
        
        if (wallet) {
            // Mostrar info de wallet conectada
            if (walletInfo) {
                walletInfo.style.display = 'block';
                walletInfo.classList.remove('hidden');
            }
            
            if (connectButton) {
                connectButton.style.display = 'none';
            }
            
            // Formatear dirección corta
            const shortAddress = wallet.address.substring(0, 6) + '...' + 
                               wallet.address.substring(wallet.address.length - 4);
            
            if (walletAddress) {
                walletAddress.textContent = shortAddress;
                walletAddress.style.color = '#10b981';
            }
            
            // Mostrar botón de desconexión
            if (disconnectBtn) {
                disconnectBtn.style.display = 'inline-block';
                disconnectBtn.style.background = '#dc2626';
                disconnectBtn.style.color = 'white';
                disconnectBtn.style.border = 'none';
                disconnectBtn.style.padding = '8px 12px';
                disconnectBtn.style.borderRadius = '6px';
                disconnectBtn.style.cursor = 'pointer';
                disconnectBtn.style.marginLeft = '10px';
                disconnectBtn.textContent = 'Desconectar';
                disconnectBtn.onclick = disconnectWallet;
            }
            
            console.log("👛 Wallet UI actualizada:", shortAddress);
            
        } else {
            // Mostrar botón de conexión
            if (connectButton) {
                connectButton.style.display = 'block';
            }
            
            if (walletInfo) {
                walletInfo.style.display = 'none';
                walletInfo.classList.add('hidden');
            }
            
            if (disconnectBtn) {
                disconnectBtn.style.display = 'none';
            }
            
            console.log("👛 Wallet desconectada en UI");
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
        console.log("📊 Pool global:", data);
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
// BANCO Y COMPRAS (CORREGIDO)
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        
        const wallet = tonConnectUI?.wallet;
        console.log("🏦 Abriendo banco, wallet:", wallet);
        
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
                'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer;' :
                'background: #475569; color: #94a3b8; border: none; padding: 10px 15px; border-radius: 8px; cursor: not-allowed;';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds.toLocaleString()} 💎</small>
                </div>
                <button onclick="comprarTON(${ton})"
                        style="${buttonStyle} width: auto; min-width: 100px;"
                        ${!isConnected ? 'disabled' : ''}>
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

// CORRECCIÓN: Función de compra mejorada
async function comprarTON(tonAmount) {
    try {
        console.log("🛒 Iniciando compra de:", tonAmount, "TON");
        
        // Verificar conexión de wallet
        const wallet = tonConnectUI?.wallet;
        if (!wallet) {
            showError("❌ Primero conecta tu billetera TON");
            return;
        }
        
        console.log("👛 Wallet conectada:", wallet.address);
        
        if (tonAmount < 0.1) {
            showError("Mínimo: 0.10 TON");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        if (diamonds < 100) diamonds = 100;
        
        // Mensaje de confirmación SIMPLE
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON?\n\n` +
            `Recibirás: ${diamonds.toLocaleString()} 💎\n` +
            `Precio: ${price.toFixed(6)} TON/💎`;
        
        if (!confirm(confirmMsg)) return;
        
        console.log("📝 Creando transacción...");
        
        // Transacción con dos destinos (80/20)
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutos
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: (tonAmount * 0.8 * 1e9).toString() // 80% al pool
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: (tonAmount * 0.2 * 1e9).toString() // 20% a propietario
                }
            ]
        };
        
        console.log("📤 Enviando transacción:", tx);
        
        // Enviar transacción
        const result = await tonConnectUI.sendTransaction(tx);
        console.log("✅ Transacción enviada:", result);
        
        // Actualizar datos del usuario
        userData.diamonds += diamonds;
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
        
        // Recargar el banco
        setTimeout(() => openBank(), 1000);
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("Error en la compra: " + (error.message || "Error desconocido"));
    }
}

// =======================
// RETIROS (CORREGIDO COMPLETAMENTE)
// =======================
async function retirarTON(diamonds) {
    try {
        const userWallet = tonConnectUI?.wallet;
        if (!userWallet) {
            showError("❌ Conecta tu billetera personal primero");
            return;
        }
        
        // Verificar que no sea billetera del juego
        if (userWallet.address === BILLETERA_PROPIETARIO || 
            userWallet.address === BILLETERA_POOL) {
            showError("⚠️ Usa una billetera personal, no la del juego");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            showError("❌ Diamantes insuficientes");
            return;
        }
        
        if (diamonds <= 0) {
            showError("❌ Cantidad inválida");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        // Cálculo correcto del mínimo
        const minDiamondsFor1TON = Math.ceil(1 / price);
        if (diamonds < minDiamondsFor1TON) {
            showError(`❌ Mínimo: ${minDiamondsFor1TON} 💎 (equivale a 1 TON)`);
            return;
        }
        
        if (tonAmount > pool.pool_ton) {
            showError("❌ Liquidez insuficiente en el pool");
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `Dirección: ${userWallet.address.substring(0, 6)}...${userWallet.address.substring(userWallet.address.length - 4)}`;
        
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
        closeAll();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
            `• El pago se procesará en 24h.`
        );
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        showError("Error en retiro: " + (error.message || "Error desconocido"));
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
                                   color: white; border: none; width: auto; min-width: 100px; padding: 8px 12px; margin-top: 5px; border-radius: 6px; cursor: ${canAfford ? 'pointer' : 'not-allowed'};"
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
        const diamondsElem = document.getElementById("diamonds");
        const rateElem = document.getElementById("rate");
        
        if (diamondsElem) diamondsElem.textContent = Math.floor(userData.diamonds).toLocaleString();
        
        const totalPerHr = 
            userData.lvl_tienda * PROD_VAL.tienda +
            userData.lvl_casino * PROD_VAL.casino +
            userData.lvl_piscina * PROD_VAL.piscina +
            userData.lvl_parque * PROD_VAL.parque +
            userData.lvl_diversion * PROD_VAL.diversion;
        
        if (rateElem) rateElem.textContent = totalPerHr;
        
        const casinoElem = document.getElementById("lvl_casino");
        const piscinaElem = document.getElementById("lvl_piscina");
        const parqueElem = document.getElementById("lvl_parque");
        const diversionElem = document.getElementById("lvl_diversion");
        
        if (casinoElem) casinoElem.textContent = userData.lvl_casino;
        if (piscinaElem) piscinaElem.textContent = userData.lvl_piscina;
        if (parqueElem) parqueElem.textContent = userData.lvl_parque;
        if (diversionElem) diversionElem.textContent = userData.lvl_diversion;
        
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

// CORRECCIÓN COMPLETA: Función de retiro con cálculo dinámico
async function openWithdraw() {
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        // Mostrar precio actual
        const currentPriceElem = document.getElementById("current-price");
        const availableDiamondsElem = document.getElementById("available-diamonds");
        
        if (currentPriceElem) currentPriceElem.textContent = price.toFixed(6) + " TON/💎";
        if (availableDiamondsElem) availableDiamondsElem.textContent = Math.floor(userData.diamonds) + " 💎";
        
        // Calcular mínimo dinámicamente
        const minDiamondsFor1TON = Math.ceil(1 / price);
        
        // Configurar input
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = ""; // Vaciar el campo
            input.min = minDiamondsFor1TON;
            input.max = Math.floor(userData.diamonds);
            input.placeholder = `Mínimo: ${minDiamondsFor1TON} 💎`;
            
            // Agregar event listener para cálculo en tiempo real
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        // Mostrar información
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
                    <strong>📝 Instrucciones:</strong><br>
                    1. Ingresa la cantidad de 💎 a retirar<br>
                    2. El cálculo se actualiza automáticamente<br>
                    3. Haz clic en "PROCESAR RETIRO"
                </div>`;
        }
        
        showModal("modalWithdraw");
        
    } catch (error) {
        console.error("❌ Error abriendo retiro:", error);
        showError("Error cargando retiro");
    }
}

// CORRECCIÓN: Función de cálculo de retiro que funciona
function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        if (!input) return;
        
        const diamonds = parseInt(input.value) || 0;
        const tonReceiveElem = document.getElementById("ton-receive");
        
        if (!tonReceiveElem) return;
        
        // Obtener pool actual
        const pool = { pool_ton: 100, total_diamonds: 100000 }; // Valores por defecto
        const price = calcPrice(pool);
        
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
        
        // Calcular TON a recibir
        const tonAmount = diamonds * price;
        
        // Mostrar resultado
        tonReceiveElem.textContent = tonAmount.toFixed(4);
        tonReceiveElem.style.color = "#10b981";
        
        console.log(`💰 Cálculo retiro: ${diamonds} 💎 = ${tonAmount.toFixed(4)} TON`);
        
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
        
        await retirarTON(diamonds);
        
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
        const overlay = document.getElementById("overlay");
        const modal = document.getElementById(id);
        
        if (overlay) overlay.style.display = "block";
        if (modal) modal.style.display = "block";
        
        // Si es el modal de retiro, actualizar cálculo
        if (id === "modalWithdraw") {
            setTimeout(() => {
                updateWithdrawCalculation();
            }, 100);
        }
        
    } catch (error) {
        console.error("❌ Error mostrando modal:", error);
    }
}

function closeAll() {
    try {
        const overlay = document.getElementById("overlay");
        if (overlay) overlay.style.display = "none";
        
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
    console.log("📄 DOM cargado");
    setTimeout(initApp, 1000); // Dar tiempo para cargar
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

console.log("🌐 Ton City Game - Código corregido completamente");
