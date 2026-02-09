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

// Configuración económica
const USER_SHARE = 0.8;
const OWNER_SHARE = 0.2;
const PROD_VAL = { 
    tienda: 10, 
    casino: 25, 
    piscina: 60, 
    parque: 15, 
    diversion: 120, 
    banco: 0 
};

// =======================
// FUNCIONES DE INICIALIZACIÓN
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
            console.log("⚠️ Usuario no detectado");
        }

        await initTONConnect();
        startProduction();
        await getGlobalPool();

        console.log("✅ Aplicación inicializada");

    } catch (error) {
        console.error("❌ Error en initApp:", error);
    }
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

// ✅ CORRECCIÓN 1: Función mejorada para conexión/desconexión
function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        const walletAddress = document.getElementById('wallet-address');

        if (!connectButton || !walletInfo) return;

        // Verificación robusta de wallet y dirección
        if (wallet && wallet.address) {
            connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');

            const shortAddress = wallet.address.substring(0, 6) + '...' + 
                               wallet.address.substring(wallet.address.length - 4);
            if(walletAddress) walletAddress.textContent = shortAddress;

        } else {
            // Esto se ejecuta al desconectar o si no hay billetera
            connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
        }
    } catch (error) {
        console.error("❌ Error UI billetera:", error);
    }
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

        // Detección de referidos
        let refCode = null;
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');

        if (tg.initData) {
            const initData = new URLSearchParams(tg.initData);
            const startParam = initData.get('start');
            if (startParam) refCode = startParam;
        }

        console.log("🔍 Referencia detectada:", refCode);

        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // Usuario nuevo
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
        }

        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        await updateReferralStats();

    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
    }
}

async function processReferral(referralCode, newUserId) {
    try {
        if (!referralCode) return;

        const { data: referrer, error } = await _supabase
            .from('game_data')
            .select('telegram_id, referred_users')
            .eq('referral_code', referralCode)
            .single();

        if (!referrer || error) return;

        const currentReferredUsers = referrer.referred_users || [];
        const updatedReferredUsers = [...currentReferredUsers, newUserId];

        await _supabase.from('game_data')
            .update({
                referred_users: updatedReferredUsers,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', referrer.telegram_id);

    } catch (error) {
        console.error("❌ Error referencia:", error);
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

            document.getElementById("ref-count").textContent = refCount;
            document.getElementById("ref-earnings").textContent = `${earnings} 💎`;
            document.getElementById("ref-total").textContent = `${earnings} 💎`;
            document.getElementById("referral-code").textContent = data.referral_code || "Generando...";
        }

    } catch (error) {
        console.error("❌ Error stats:", error);
    }
}

// =======================
// SISTEMA ECONÓMICO
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
        return { pool_ton: 100, total_diamonds: 100000 };
    }
}

async function updateGlobalPool(newTon, newDiamonds){
    try {
        await _supabase
            .from("game_data")
            .update({
                pool_ton: newTon,
                total_diamonds: newDiamonds
            })
            .eq("telegram_id", "MASTER");
    } catch (error) {
        console.error("❌ Error pool:", error);
    }
}

function calcPrice(pool = null) {
    if (!pool) pool = { pool_ton: 100, total_diamonds: 100000 };
    if (pool.total_diamonds <= 0) return 0.001;
    const price = (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
    return Math.max(price, 0.000001);
}

// ✅ CORRECCIÓN 2: Función para calcular mínimo de retiro
async function calcMinWithdraw() {
    try {
        const pool = await getGlobalPool();
        const totalDiamonds = pool.total_diamonds;
        const tonInPool = pool.pool_ton;
        
        if (tonInPool <= 0 || totalDiamonds <= 0) {
            return 1; // Mínimo por defecto
        }
        
        // Fórmula: (Diamantes totales de usuarios) / (TON en el pool)
        const calculatedMin = totalDiamonds / tonInPool;
        
        // Corrección crucial: Asegura que nunca sea menor a 1 TON
        const finalMin = Math.max(1, calculatedMin);
        
        return Math.round(finalMin * 100) / 100; // Redondea a 2 decimales
    } catch (error) {
        console.error("❌ Error calculando mínimo:", error);
        return 1;
    }
}

// =======================
// FUNCIONES DE INTERFAZ (CRÍTICAS)
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
        console.error("❌ Error UI:", error);
    }
}

function startProduction() {
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

        } catch (error) {
            console.error("❌ Error producción:", error);
        }
    }, 1000);
}

// =======================
// MODALES Y NAVEGACIÓN
// =======================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function openBank() {
    try {
        showModal("modalBank");

        const wallet = tonConnectUI?.wallet;
        updateWalletUI(wallet);

        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        // ✅ Mostrar mínimo de retiro corregido
        const minWithdraw = await calcMinWithdraw();

        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>`;
        
        html += `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                   <span><b>📊 Mínimo para retirar</b></span>
                   <span><b>${minWithdraw.toFixed(2)} TON</b></span>
                 </div>`;

        const tonOptions = [0.10, 0.50, 1, 2, 5, 10];
        const isConnected = !!wallet;

        tonOptions.forEach(ton => {
            const diamonds = Math.floor((ton * USER_SHARE) / price);
            const finalDiamonds = Math.max(diamonds, 100);

            const buttonText = isConnected ? 'COMPRAR' : 'CONECTA';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669);' :
                'background: #475569;';
            const buttonDisabled = !isConnected ? 'disabled' : '';

            html += `
            <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${finalDiamonds.toLocaleString()} 💎</small>
                </div>
                <button onclick="comprarTON(${ton})"
                        style="${buttonStyle} width: auto; min-width: 100px;"
                        ${buttonDisabled}>
                    ${buttonText}
                </button>
            </div>`;
        });

        document.getElementById("bankList").innerHTML = html;

    } catch (error) {
        console.error("❌ Error banco:", error);
        alert("Error cargando banco");
    }
}

async function comprarTON(tonAmount) {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            alert("Conecta tu billetera");
            return;
        }

        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        if (diamonds < 100) diamonds = 100;

        // 80/20 split
        const comisionPropietario = tonAmount * 0.2;
        
        // Actualizar pool global
        await updateGlobalPool(
            pool.pool_ton + tonAmount,
            pool.total_diamonds - diamonds
        );

        // Actualizar usuario
        userData.diamonds += diamonds;
        await _supabase.from('game_data')
            .update({ diamonds: userData.diamonds })
            .eq('telegram_id', userData.id);

        actualizarUI();
        hideModal("modalBank");
        
        alert(`✅ Compra exitosa: ${diamonds.toLocaleString()} 💎 recibidos`);

    } catch (error) {
        console.error("❌ Error compra:", error);
        alert("Error en la compra");
    }
}

async function withdrawTON() {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            alert("Conecta tu billetera primero");
            return;
        }

        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const minWithdraw = await calcMinWithdraw();
        const userDiamonds = userData.diamonds;
        
        if (userDiamonds <= 0) {
            alert("No tienes diamantes para retirar");
            return;
        }

        // Calcular TON a recibir
        const tonToReceive = (userDiamonds * price) / USER_SHARE;
        
        if (tonToReceive < minWithdraw) {
            alert(`Monto insuficiente. Mínimo: ${minWithdraw.toFixed(2)} TON\nTienes: ${tonToReceive.toFixed(2)} TON`);
            return;
        }

        // Verificar que hay suficiente en el pool
        if (tonToReceive > pool.pool_ton) {
            alert("Fondos insuficientes en el pool. Intenta más tarde.");
            return;
        }

        const confirmation = confirm(
            `¿Retirar ${tonToReceive.toFixed(2)} TON?\n` +
            `Por: ${userDiamonds.toLocaleString()} 💎\n` +
            `Tasa: ${price.toFixed(6)} TON/💎`
        );

        if (!confirmation) return;

        // Aquí iría la lógica de transacción real con TON Connect
        // Por ahora simulamos la actualización
        await updateGlobalPool(
            pool.pool_ton - tonToReceive,
            pool.total_diamonds + userDiamonds
        );

        userData.diamonds = 0;
        await _supabase.from('game_data')
            .update({ diamonds: 0 })
            .eq('telegram_id', userData.id);

        actualizarUI();
        alert(`✅ Retiro procesado: ${tonToReceive.toFixed(2)} TON`);

    } catch (error) {
        console.error("❌ Error retiro:", error);
        alert("Error en el retiro");
    }
}

// =======================
// FUNCIONES DE MEJORA
// =======================
async function upgradeBuilding(building) {
    try {
        if (!userData.id) return;

        const cost = Math.pow(2, userData[`lvl_${building}`]) * 100;
        
        if (userData.diamonds < cost) {
            alert(`Diamantes insuficientes. Necesitas: ${cost} 💎`);
            return;
        }

        userData.diamonds -= cost;
        userData[`lvl_${building}`]++;

        await _supabase.from('game_data')
            .update({
                diamonds: userData.diamonds,
                [`lvl_${building}`]: userData[`lvl_${building}`]
            })
            .eq('telegram_id', userData.id);

        actualizarUI();
        alert(`✅ ${building.toUpperCase()} mejorado a nivel ${userData[`lvl_${building}`]}`);

    } catch (error) {
        console.error(`❌ Error mejorando ${building}:`, error);
        alert("Error en la mejora");
    }
}

// =======================
// INICIALIZACIÓN
// =======================
// Asignar funciones globalmente
window.openBank = openBank;
window.comprarTON = comprarTON;
window.withdrawTON = withdrawTON;
window.upgradeBuilding = upgradeBuilding;
window.showModal = showModal;
window.hideModal = hideModal;

// Iniciar la app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);

// Manejar clics fuera de modales
window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});
