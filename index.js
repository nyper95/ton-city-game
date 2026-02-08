// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ index.js cargado correctamente");

// Inicializar Telegram Web App
const tg = window.Telegram.WebApp;

// Configuración de TON Connect
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button',
    uiPreferences: { theme: 'DARK' }
});

// Configuración de Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tu billetera TON
const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";

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

// Configuración económica
const USER_SHARE = 0.8;    // 80% para usuarios
const OWNER_SHARE = 0.2;   // 20% para el dueño

// Producción por hora - SIN BANCO
const PROD_VAL = {
    tienda: 10,
    casino: 25, 
    piscina: 60,
    parque: 15,
    diversion: 120,
    banco: 0  // Cambiado de 5 a 0
};

// =======================
// FUNCIONES DE INICIALIZACIÓN
// =======================
function initApp() {
    console.log("🚀 Inicializando aplicación...");
    
    tg.expand();
    
    const user = tg.initDataUnsafe.user;
    if (user) {
        console.log("✅ Usuario de Telegram detectado:", user.username);
        loadUser(user);
    } else {
        console.log("⚠️ No hay usuario de Telegram");
        document.getElementById("user-display").textContent = "Invitado";
        showError("Abre el juego desde Telegram para jugar");
    }
    
    setupTONConnect();
    setupEventListeners();
    startProduction();
    getGlobalPool();
    
    console.log("✅ Aplicación inicializada correctamente");
}

function setupTONConnect() {
    tonConnectUI.onStatusChange((wallet) => {
        console.log("🔄 Estado de TON Connect:", wallet ? "Conectado" : "Desconectado");
        updateWalletUI(wallet);
        
        if (wallet && document.getElementById('modalBank').style.display === 'block') {
            openBank();
        }
    });
    
    updateWalletUI(tonConnectUI.wallet);
}

function setupEventListeners() {
    const withdrawInput = document.getElementById("withdraw-amount");
    if (withdrawInput) {
        withdrawInput.addEventListener("input", updateWithdrawCalculation);
    }
    
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAll();
    });
    
    console.log("✅ Event listeners configurados");
}

// =======================
// POOL GLOBAL - TABLA ÚNICA
// =======================
async function getGlobalPool(){
    try {
        let { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) throw error;
        console.log("📊 Pool global cargado:", data);
        return data;
    } catch (error) {
        console.error("❌ Error cargando pool global:", error);
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
        
        console.log("✅ Pool actualizado:", { newTon, newDiamonds });
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
// FUNCIONES DE USUARIO
// =======================
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            console.log("➕ Creando NUEVO usuario");
            
            const initData = new URLSearchParams(tg.initData || '');
            const startParam = initData.get('start');
            const refCode = startParam || new URLSearchParams(window.location.search).get('ref');
            
            // INSERTAR CON 0 DIAMANTES INICIALES
            const { error: insertError } = await _supabase
                .from('game_data')
                .insert([{
                    telegram_id: userData.id,
                    username: userData.username,
                    diamonds: 0,  // CAMBIADO: 0 en lugar de 100
                    referral_code: referralCode,
                    referred_by: refCode || null,
                    pool_ton: 100,
                    total_diamonds: 100000,
                    created_at: new Date().toISOString()
                }]);
            
            if (insertError) throw insertError;
            
            userData.diamonds = 0;  // CAMBIADO: 0 en lugar de 100
            userData.referral_code = referralCode;
            userData.referred_by = refCode;
            
            if (refCode) {
                await processReferral(refCode, userData.id);
            }
            
        } else if (data) {
            console.log("📂 Usuario encontrado:", data.username);
            
            userData.diamonds = data.diamonds || 0;
            userData.lvl_tienda = data.lvl_tienda || 0;
            userData.lvl_casino = data.lvl_casino || 0;
            userData.lvl_piscina = data.lvl_piscina || 0;
            userData.lvl_parque = data.lvl_parque || 0;
            userData.lvl_diversion = data.lvl_diversion || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referred_by = data.referred_by || null;
            userData.referral_earnings = data.referral_earnings || 0;
            
            await _supabase
                .from('game_data')
                .update({ last_seen: new Date().toISOString() })
                .eq('telegram_id', userData.id);
        }
        
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        updateReferralStats();
        
        console.log("✅ Usuario cargado correctamente");
        
    } catch (error) {
        console.error("❌ Error CRÍTICO en loadUser:", error);
        showError("Error al cargar el perfil");
    }
}

// =======================
// SISTEMA DE REFERIDOS
// =======================
async function processReferral(referralCode, newUserId) {
    try {
        console.log("🤝 Procesando referencia:", referralCode, "para", newUserId);
        
        const { data: referrer, error } = await _supabase
            .from('game_data')
            .select('telegram_id, diamonds, referral_earnings, referred_users')
            .eq('referral_code', referralCode)
            .single();
        
        if (!referrer || error) {
            console.log("⚠️ Código de referencia inválido:", referralCode);
            return;
        }
        
        const bonus = 10; // 10 diamantes por referido
        const updatedReferredUsers = [...(referrer.referred_users || []), newUserId];
        
        await _supabase
            .from('game_data')
            .update({
                diamonds: (referrer.diamonds || 0) + bonus,
                referral_earnings: (referrer.referral_earnings || 0) + bonus,
                referred_users: updatedReferredUsers
            })
            .eq('telegram_id', referrer.telegram_id);
        
        console.log(`✅ Referencia procesada: +${bonus}💎 para ${referrer.telegram_id}`);
        
    } catch (error) {
        console.error("❌ Error procesando referencia:", error);
    }
}

async function updateReferralStats() {
    try {
        if (!userData.id) return;
        
        const { data, error } = await _supabase
            .from('game_data')
            .select('referral_earnings, referred_users')
            .eq('telegram_id', userData.id)
            .single();
        
        if (data) {
            const refCount = data.referred_users?.length || 0;
            const earnings = data.referral_earnings || 0;
            
            document.getElementById("ref-count").textContent = refCount;
            document.getElementById("ref-earnings").textContent = `${earnings} 💎`;
            document.getElementById("ref-total").textContent = `${earnings} 💎`;
            userData.referral_earnings = earnings;
        }
        
    } catch (error) {
        console.error("❌ Error actualizando stats:", error);
    }
}

function copyReferralCode() {
    try {
        if (!userData.referral_code) {
            showError("El código de referencia aún no está disponible");
            return;
        }
        
        const BOT_USERNAME = 'ton_city_bot';
        const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        
        const message = `🎮 ¡Únete a Ton City Game! 🎮\n\nUsa este enlace para registrarte y obtenemos ambos 10 💎 de bonificación:\n${telegramDeepLink}\n\n📱 Solo funciona en la app de Telegram`;
        
        navigator.clipboard.writeText(message).then(() => {
            showMessage("✅ Enlace copiado al portapapeles!\n\nComparte este enlace con tus amigos.\nDeben hacer clic desde la app de Telegram.");
            
            document.getElementById("referral-code").innerHTML = 
                `<div style="text-align: center; padding: 10px; background: #0f172a; border-radius: 10px;">
                    <code style="font-size: 0.9rem; word-break: break-all;">${telegramDeepLink}</code>
                    <br>
                    <small style="color: #94a3b8;">Haz clic derecho para copiar manualmente</small>
                </div>`;
                
        }).catch(err => {
            console.error("❌ Error copiando:", err);
            const manualCopyText = `🔗 Copia manualmente este enlace:\n\n${telegramDeepLink}`;
            showMessage(manualCopyText);
        });
        
        console.log("📋 Código de referencia copiado:", telegramDeepLink);
        
    } catch (error) {
        console.error("❌ Error en copyReferralCode:", error);
        showError("Error al generar el enlace de referencia");
    }
}

// =======================
// TON CONNECT Y TRANSACCIONES
// =======================
function updateWalletUI(wallet) {
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
    } else {
        connectButton.style.display = 'block';
        walletInfo.classList.add('hidden');
    }
}

async function sendTon(amount, to) {
    try {
        console.log("💸 Enviando", amount, "TON a", to);
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{
                address: to,
                amount: (amount * 1e9).toString()
            }]
        };
        
        return await tonConnectUI.sendTransaction(tx);
        
    } catch (error) {
        console.error("❌ Error enviando TON:", error);
        throw error;
    }
}

async function comprarTON(tonAmount) {
    try {
        console.log("🛒 Comprando", tonAmount, "TON");
        
        const wallet = tonConnectUI.wallet;
        if (!wallet) {
            showError("Conecta tu billetera TON primero");
            return;
        }
        
        if (tonAmount < 0.1) {
            showError("⚠️ Cantidad mínima: 0.10 TON");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?\n\n` +
                          `• Precio: ${price.toFixed(6)} TON/💎\n` +
                          `• Recibirás: ${diamonds.toLocaleString()} 💎`;
        
        if (!confirm(confirmMsg)) return;
        
        await sendTon(tonAmount, MI_BILLETERA);
        
        userData.diamonds += diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(pool.pool_ton + userTon, pool.total_diamonds + diamonds);
        
        actualizarUI();
        setTimeout(() => openBank(), 500);
        
        showMessage(`✅ ¡COMPRA EXITOSA!\n\nHas recibido: ${diamonds.toLocaleString()} 💎\nPor: ${tonAmount.toFixed(2)} TON`);
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("❌ Error en la compra");
    }
}

async function retirarTON(diamonds) {
    try {
        const wallet = tonConnectUI.wallet;
        if (!wallet) {
            showError("Conecta tu billetera TON primero");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            showError("No tienes suficientes diamantes");
            return;
        }
        
        if (diamonds <= 0) {
            showError("Cantidad inválida");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        if (tonAmount > pool.pool_ton) {
            showError("Liquidez insuficiente en el pool");
            return;
        }
        
        if (!confirm(`¿Retirar ${diamonds} 💎 por ${tonAmount.toFixed(4)} TON?`)) return;
        
        await sendTon(tonAmount, wallet.address);
        
        userData.diamonds -= diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(pool.pool_ton - tonAmount, pool.total_diamonds - diamonds);
        
        actualizarUI();
        showMessage(`✅ Retiro exitoso: ${tonAmount.toFixed(4)} TON enviados`);
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        showError("Error en el retiro");
    }
}

// =======================
// PRODUCCIÓN Y UI - CORREGIDO
// =======================
function actualizarUI() {
    try {
        const diamondsElem = document.getElementById("diamonds");
        if (diamondsElem) {
            diamondsElem.textContent = Math.floor(userData.diamonds).toLocaleString();
        }
        
        // SOLO producción de edificios (SIN banco)
        const totalPerHr = 
            userData.lvl_tienda * PROD_VAL.tienda +
            userData.lvl_casino * PROD_VAL.casino +
            userData.lvl_piscina * PROD_VAL.piscina +
            userData.lvl_parque * PROD_VAL.parque +
            userData.lvl_diversion * PROD_VAL.diversion;
            // NOTA: Eliminado + PROD_VAL.banco
        
        const rateElem = document.getElementById("rate");
        if (rateElem) rateElem.textContent = totalPerHr;
        
        const updateLevel = (id, level) => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = level;
        };
        
        updateLevel("lvl_casino", userData.lvl_casino);
        updateLevel("lvl_piscina", userData.lvl_piscina);
        updateLevel("lvl_parque", userData.lvl_parque);
        updateLevel("lvl_diversion", userData.lvl_diversion);
        
    } catch (error) {
        console.error("❌ Error actualizando UI:", error);
    }
}

function startProduction() {
    console.log("⚙️ Iniciando producción automática");
    
    setInterval(async () => {
        try {
            // Producción por segundo SIN banco
            const prodPerSecond = {
                tienda: userData.lvl_tienda * PROD_VAL.tienda / 3600,
                casino: userData.lvl_casino * PROD_VAL.casino / 3600,
                piscina: userData.lvl_piscina * PROD_VAL.piscina / 3600,
                parque: userData.lvl_parque * PROD_VAL.parque / 3600,
                diversion: userData.lvl_diversion * PROD_VAL.diversion / 3600
                // banco: PROD_VAL.banco / 3600  // Eliminado
            };
            
            const totalPerSecond = 
                prodPerSecond.tienda + prodPerSecond.casino + 
                prodPerSecond.piscina + prodPerSecond.parque + 
                prodPerSecond.diversion; // Sin + prodPerSecond.banco
            
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
            console.error("❌ Error en producción:", error);
        }
    }, 1000);
}

// =======================
// MODALES Y NAVEGACIÓN
// =======================
async function openBank() {
    try {
        showModal("modalBank");
        updateWalletUI(tonConnectUI.wallet);
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>`;
        
        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        const wallet = tonConnectUI.wallet;
        
        tonOptions.forEach(ton => {
            const diamonds = Math.floor((ton * USER_SHARE) / price);
            const finalDiamonds = Math.max(diamonds, 100);
            const isConnected = !!wallet;
            const buttonText = isConnected ? 'COMPRAR' : 'CONECTA BILLETERA';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669);' :
                'background: #475569;';
            const buttonAction = isConnected ? `comprarTON(${ton})` : 'openBank()';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds.toLocaleString()} 💎</small>
                </div>
                <button onclick="${buttonAction}"
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
        showError("Error al cargar el banco");
    }
}

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
        console.error("❌ Error abriendo tienda:", error);
        showError("Error al cargar la tienda");
    }
}

async function buyUpgrade(name, price) {
    try {
        if (userData.diamonds < price) {
            showError("No tienes suficientes 💎");
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
        console.error("❌ Error en buyUpgrade:", error);
    }
}

function openCentral() {
    try {
        // SOLO producción de edificios (SIN banco)
        const prod = {
            tienda: userData.lvl_tienda * PROD_VAL.tienda,
            casino: userData.lvl_casino * PROD_VAL.casino,
            piscina: userData.lvl_piscina * PROD_VAL.piscina,
            parque: userData.lvl_parque * PROD_VAL.parque,
            diversion: userData.lvl_diversion * PROD_VAL.diversion
            // banco: PROD_VAL.banco  // Eliminado
        };
        
        const total = prod.tienda + prod.casino + prod.piscina + 
                     prod.parque + prod.diversion; // Sin + prod.banco
        
        document.getElementById("s_tienda").textContent = prod.tienda;
        document.getElementById("s_casino").textContent = prod.casino;
        document.getElementById("s_piscina").textContent = prod.piscina;
        document.getElementById("s_parque").textContent = prod.parque;
        document.getElementById("s_diversion").textContent = prod.diversion;
        document.getElementById("s_total").textContent = total;
        
        showModal("centralModal");
        
    } catch (error) {
        console.error("❌ Error abriendo central:", error);
        showError("Error al cargar estadísticas");
    }
}

async function openFriends() {
    try {
        await updateReferralStats();
        showModal("modalFriends");
    } catch (error) {
        console.error("❌ Error abriendo amigos:", error);
        showError("Error al cargar amigos");
    }
}

async function openWithdraw() {
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.max = Math.floor(userData.diamonds);
        }
        
        document.getElementById("ton-receive").textContent = "0";
        
        showModal("modalWithdraw");
        
    } catch (error) {
        console.error("❌ Error abriendo retiro:", error);
        showError("Error al cargar retiro");
    }
}

async function processWithdraw() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value);
        
        if (!diamonds || diamonds <= 0) {
            showError("Ingresa una cantidad válida");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            showError("No tienes suficientes diamantes");
            return;
        }
        
        await retirarTON(diamonds);
        closeAll();
        
    } catch (error) {
        console.error("❌ Error procesando retiro:", error);
        showError("Error en el retiro");
    }
}

function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value);
        
        if (diamonds && diamonds > 0 && diamonds <= userData.diamonds) {
            const price = calcPrice();
            const tonAmount = diamonds * price;
            document.getElementById("ton-receive").textContent = tonAmount.toFixed(4);
        } else {
            document.getElementById("ton-receive").textContent = "0";
        }
    } catch (error) {
        console.error("❌ Error calculando retiro:", error);
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
        
        const modals = [
            "centralModal", "modalBank", "modalStore", 
            "modalFriends", "modalWithdraw"
        ];
        
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
// INICIALIZACIÓN FINAL
// =======================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado, iniciando app...");
    setTimeout(initApp, 100);
});

// Hacer funciones globales
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
window.tonConnectUI = tonConnectUI;

console.log("🌐 Funciones globales asignadas");
