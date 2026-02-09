// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// Direcciones de billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; // Tu 20%
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb"; // Pool 80%

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
const USER_SHARE = 0.8;    // 80% para pool
const OWNER_SHARE = 0.2;   // 20% para propietario
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
            
        } else {
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
        const fondoPool = tonAmount * 0.8;
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                { address: BILLETERA_POOL, amount: (fondoPool * 1e9).toString() },
                { address: BILLETERA_PROPIETARIO, amount: (comisionPropietario * 1e9).toString() }
            ]
        };
        
        await tonConnectUI.sendTransaction(tx);
        
        userData.diamonds += diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(pool.pool_ton + fondoPool, pool.total_diamonds + diamonds);
        actualizarUI();
        
        alert(`✅ Compra exitosa! ${diamonds.toLocaleString()} 💎`);
        
    } catch (error) {
        console.error("❌ Error compra:", error);
        alert("Error en compra");
    }
}

function openStore() {
    try {
        showModal("modalStore");
        
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
            const canAfford = userData.diamonds >= item.price;
            
            html += `<div class="stat">
                <div>
                    <strong>${item.name} Nvl ${item.lvl}</strong><br>
                    <small>+${item.prod} 💎/hora</small>
                </div>
                <div>
                    <span>${item.price} 💎</span>
                    <button onclick="buyUpgrade('${item.name}',${item.price})" 
                            ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'MEJORAR' : 'INSUFICIENTE'}
                    </button>
                </div>
            </div>`;
        });
        
        document.getElementById("storeList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error tienda:", error);
        alert("Error tienda");
    }
}

async function buyUpgrade(name, price) {
    try {
        if (userData.diamonds < price) {
            alert("Diamantes insuficientes");
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
        
        await _supabase
            .from('game_data')
            .update({
                diamonds: userData.diamonds,
                [fieldToUpdate]: userData[fieldToUpdate]
            })
            .eq("telegram_id", userData.id);
        
        actualizarUI();
        openStore();
        
        alert(`✅ ${name} mejorada!`);
        
    } catch (error) {
        console.error("❌ Error mejora:", error);
    }
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
    }
}

function openFriends() {
    try {
        showModal("modalFriends");
    } catch (error) {
        console.error("❌ Error amigos:", error);
    }
}

function openWithdraw() {
    try {
        showModal("modalWithdraw");
    } catch (error) {
        console.error("❌ Error retiro:", error);
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

function copyReferralCode() {
    try {
        if (!userData.referral_code) {
            alert("Código no disponible");
            return;
        }
        
        const BOT_USERNAME = 'ton_city_bot';
        const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        
        navigator.clipboard.writeText(telegramDeepLink).then(() => {
            alert("✅ Enlace copiado!");
        });
        
    } catch (error) {
        console.error("❌ Error copiando:", error);
    }
}

// =======================
// FUNCIONES GLOBALES (IMPORTANTE)
// =======================
window.openBank = openBank;
window.openStore = openStore;
window.openCentral = openCentral;
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.closeAll = closeAll;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.copyReferralCode = copyReferralCode;

// =======================
// INICIALIZACIÓN FINAL
// =======================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado - Iniciando juego");
    setTimeout(initApp, 100);
});

console.log("✅ Ton City Game - Código listo");
