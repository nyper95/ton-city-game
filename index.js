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

async function initTONConnect() {
    try {
        if (!document.getElementById('ton-connect-button')) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange((wallet) => {
            console.log("🔄 TON Connect:", wallet ? "Conectado" : "Desconectado");
            updateWalletUI(wallet);
        });
        
        const wallet = await tonConnectUI.connectionRestored;
        updateWalletUI(wallet);
        
    } catch (error) {
        console.error("❌ Error TON Connect:", error);
    }
}

function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        const walletAddress = document.getElementById('wallet-address');
        
        if (!connectButton || !walletInfo) return;
        
        if (wallet) {
            connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');
            
            const shortAddress = wallet.address.substring(0, 6) + '...' + 
                               wallet.address.substring(wallet.address.length - 4);
            walletAddress.textContent = shortAddress;
            
            // ADVERTENCIA: No usar billetera del juego
            const isGameWallet = wallet.address === BILLETERA_PROPIETARIO || 
                               wallet.address === BILLETERA_POOL;
            if (isGameWallet) {
                walletInfo.innerHTML += 
                    `<p style="color: #facc15; margin-top: 10px; font-size: 0.8rem;">
                     ⚠️ Esta es una billetera del juego. Para jugar, usa una billetera personal.
                    </p>`;
            }
            
        } else {
            connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
        }
    } catch (error) {
        console.error("❌ Error UI billetera:", error);
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
// USUARIO Y REFERIDOS (CORREGIDO)
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        // DETECCIÓN MEJORADA DE REFERIDOS
        let refCode = null;
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        
        // También verificar parámetros de Telegram
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
            // USUARIO NUEVO (0 DIAMANTES)
            console.log("➕ Creando nuevo usuario (0 diamantes)");
            
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,  // EMPIEZA CON 0
                referral_code: referralCode,
                referred_by: refCode || null,
                pool_ton: 100,
                total_diamonds: 100000,
                created_at: new Date().toISOString()
            }]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.referred_by = refCode;
            
            // PROCESAR REFERIDO (SIN BONO)
            if (refCode) {
                console.log("🎁 Registrando referido:", refCode);
                await processReferral(refCode, userData.id);
            }
            
        } else if (data) {
            // USUARIO EXISTENTE
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
        
        // ACTUALIZACIÓN: SIN BONO, solo registro
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
        
        // MENSAJE ACTUALIZADO: SIN MENCIONAR BONO
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
// BANCO Y COMPRAS (80/20)
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
            const buttonAction = isConnected ? `comprarTON(${ton})` : 'alert("Conecta billetera primero")';
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
        
        // CALCULAR 80/20
        const comisionPropietario = tonAmount * 0.2;
        const fondoPool = tonAmount * 0.8;
        
        const confirmMsg = 
            `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Precio: ${price.toFixed(6)} TON/💎\n` +
            `• Recibirás: ${diamonds.toLocaleString()} 💎\n` +
            `• Distribución:\n   - 80% (${fondoPool.toFixed(2)} TON) → Pool\n` +
            `   - 20% (${comisionPropietario.toFixed(2)} TON) → Propietario`;
        
        if (!confirm(confirmMsg)) return;
        
        // TRANSACCIÓN CON DOS DESTINOS
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: (fondoPool * 1e9).toString() // 80% al pool
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: (comisionPropietario * 1e9).toString() // 20% a ti
                }
            ]
        };
        
        await tonConnectUI.sendTransaction(tx);
        
        userData.diamonds += diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(
            pool.pool_ton + fondoPool,
            pool.total_diamonds + diamonds
        );
        
        actualizarUI();
        setTimeout(() => openBank(), 500);
        
        showMessage(`✅ ¡COMPRA EXITOSA!\n\n${diamonds.toLocaleString()} 💎 recibidos`);
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("Error en la compra");
    }
}

// =======================
// RETIROS (SISTEMA ACTUAL)
// =======================
async function retirarTON(diamonds) {
    try {
        const userWallet = tonConnectUI?.wallet;
        if (!userWallet) {
            showError("Conecta tu billetera personal");
            return;
        }
        
        // VERIFICAR QUE NO SEA BILLETERA DEL JUEGO
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
        
        const minDiamondsFor1TON = Math.ceil(1 / price);
        if (diamonds < minDiamondsFor1TON) {
            showError(`Mínimo: ${minDiamondsFor1TON} 💎 (1 TON)`);
            return;
        }
        
        if (tonAmount > pool.pool_ton) {
            showError("Liquidez insuficiente");
            return;
        }
        
        const confirmMsg = 
            `¿Retirar ${diamonds.toLocaleString()} 💎?\n\n` +
            `• Recibirás: ${tonAmount.toFixed(4)} TON\n` +
            `• A: ${userWallet.address.substring(0, 6)}...`;
        
        if (!confirm(confirmMsg)) return;
        
        // NOTA: Los retiros son manuales por ahora
        // Cuando implementes automatización, aquí iría la transacción
        
        userData.diamonds -= diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(
            pool.pool_ton - tonAmount,
            pool.total_diamonds - diamonds
        );
        
        actualizarUI();
        
        showMessage(
            `✅ RETIRO PROCESADO!\n\n` +
            `• Retirados: ${diamonds.toLocaleString()} 💎\n` +
            `• A recibir: ${tonAmount.toFixed(4)} TON\n` +
            `• El pago se procesará manualmente en 24h.\n` +
            `(Sistema beta - próximamente automático)`
        );
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        showError("Error en retiro");
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
            {name: "Diversión", lvl: userData.lvl_diversion, price: 10000, pr
