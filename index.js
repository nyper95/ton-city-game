// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// Direcciones de billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; // Tu 20%
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb"; // Pool 80%

// Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let tonConnectUI = null;
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
const PROD_VAL = { tienda:10, casino:25, piscina:60, parque:15, diversion:120, banco:0 };

// =======================
// INICIALIZACIÓN PRINCIPAL
// =======================
async function initApp() {
    console.log("🚀 Iniciando aplicación...");
    
    try {
        tg.expand();
        
        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log("✅ Usuario:", user.username);
            await loadUser(user);
            document.getElementById("user-display").textContent = user.username || "Usuario";
        } else {
            document.getElementById("user-display").textContent = "Invitado";
        }
        
        await initTONConnect();
        startProduction();
        getGlobalPool();
        
        console.log("✅ Aplicación lista");
        
    } catch (error) {
        console.error("❌ Error initApp:", error);
    }
}

async function initTONConnect() {
    try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange((wallet) => {
            console.log("🔄 Wallet:", wallet ? "Conectado" : "Desconectado");
            updateWalletUI(wallet);
        });
        
        updateWalletUI(await tonConnectUI.connectionRestored);
        
    } catch (error) {
        console.error("❌ Error TON Connect:", error);
    }
}

function updateWalletUI(wallet) {
    try {
        const btn = document.getElementById('ton-connect-button');
        const info = document.getElementById('wallet-info');
        const addr = document.getElementById('wallet-address');
        
        if (!btn || !info) return;
        
        if (wallet) {
            btn.style.display = 'none';
            info.classList.remove('hidden');
            addr.textContent = wallet.address.substring(0,6) + '...' + wallet.address.substring(wallet.address.length-4);
        } else {
            btn.style.display = 'block';
            info.classList.add('hidden');
        }
    } catch (error) {
        console.error("❌ Error wallet UI:", error);
    }
}

// =======================
// POOL GLOBAL
// =======================
async function getGlobalPool(){
    try {
        let { data } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        return data || { pool_ton: 100, total_diamonds: 100000 };
    } catch (error) {
        console.error("❌ Error pool:", error);
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

function calcPrice(pool) {
    if (!pool || pool.total_diamonds <= 0) return 0.001;
    const price = (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
    return Math.max(price, 0.000001);
}

// =======================
// USUARIO Y REFERIDOS
// =======================
async function loadUser(user) {
    try {
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        // Detectar referencia
        let refCode = null;
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        
        if (tg.initData) {
            const initData = new URLSearchParams(tg.initData);
            const startParam = initData.get('start');
            if (startParam) refCode = startParam;
        }
        
        console.log("🔍 Referencia:", refCode);
        
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Nuevo usuario
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                referral_code: referralCode,
                referred_by: refCode || null,
                created_at: new Date().toISOString()
            }]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.referred_by = refCode;
            
            if (refCode) await processReferral(refCode, userData.id);
            
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
        
        actualizarUI();
        await updateReferralStats();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
    }
}

async function processReferral(referralCode, newUserId) {
    try {
        if (!referralCode) return;
        
        const { data: referrer } = await _supabase
            .from('game_data')
            .select('telegram_id, referred_users')
            .eq('referral_code', referralCode)
            .single();
        
        if (!referrer) return;
        
        const current = referrer.referred_users || [];
        const updated = [...current, newUserId];
        
        await _supabase.from('game_data')
            .update({ referred_users: updated })
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
            userData.referral_earnings = data.referral_earnings || 0;
            userData.referral_code = data.referral_code || userData.referral_code;
            
            const refCount = data.referred_users?.length || 0;
            const earnings = data.referral_earnings || 0;
            
            document.getElementById("ref-count").textContent = refCount;
            document.getElementById("ref-earnings").textContent = `${earnings} 💎`;
            document.getElementById("ref-total").textContent = `${earnings} 💎`;
            document.getElementById("referral-code").textContent = userData.referral_code || "NO DISPONIBLE";
        }
    } catch (error) {
        console.error("❌ Error stats:", error);
    }
}

function copyReferralCode() {
    try {
        if (!userData.referral_code) {
            alert("Código no disponible");
            return;
        }
        
        const BOT_USERNAME = 'ton_city_bot';
        const link = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        const message = `🎮 Ton City Game\n\nRegístrate aquí:\n${link}`;
        
        navigator.clipboard.writeText(message).then(() => {
            alert("✅ Enlace copiado");
            document.getElementById("referral-code").innerHTML = 
                `<div style="text-align: center;">
                    <code>${link}</code>
                </div>`;
        }).catch(() => {
            alert(`🔗 Copia manual:\n\n${link}`);
        });
        
    } catch (error) {
        console.error("❌ Error copiar:", error);
        alert("Error al copiar");
    }
}

// =======================
// BANCO Y COMPRAS (80/20)
// =======================
async function openBank() {
    try {
        console.log("🏦 Abriendo banco");
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalBank").style.display = "block";
        
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
            
            html += `
            <div class="stat">
                <span>${ton.toFixed(2)} TON</span>
                <span>${finalDiamonds.toLocaleString()} 💎</span>
                <button onclick="comprarTON(${ton})" ${!isConnected ? 'disabled' : ''}>
                    ${isConnected ? 'COMPRAR' : 'CONECTA'}
                </button>
            </div>`;
        });
        
        if (!wallet) {
            html += `<div style="text-align:center;color:#facc15;margin-top:10px;">
                       <i class="fa-solid fa-wallet"></i> Conecta tu billetera
                     </div>`;
        }
        
        document.getElementById("bankList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error banco:", error);
        alert("Error al abrir banco");
    }
}

async function comprarTON(tonAmount) {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            alert("Conecta tu billetera primero");
            return;
        }
        
        if (tonAmount < 0.1) {
            alert("Mínimo: 0.10 TON");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        let diamonds = Math.floor((tonAmount * USER_SHARE) / price);
        if (diamonds < 100) diamonds = 100;
        
        // 80/20
        const comisionPropietario = tonAmount * 0.2;
        const fondoPool = tonAmount * 0.8;
        
        if (!confirm(`Comprar ${tonAmount} TON por ${diamonds} 💎?\n\n80% → Pool\n20% → Propietario`)) return;
        
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
        setTimeout(() => openBank(), 500);
        
        alert(`✅ Compra exitosa!\n${diamonds} 💎 recibidos`);
        
    } catch (error) {
        console.error("❌ Error compra:", error);
        alert("Error en la compra");
    }
}

// =======================
// RETIROS
// =======================
async function retirarTON(diamonds) {
    try {
        const wallet = tonConnectUI?.wallet;
        if (!wallet) {
            alert("Conecta tu billetera");
            return;
        }
        
        if (diamonds > userData.diamonds) {
            alert("Diamantes insuficientes");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        if (tonAmount > pool.pool_ton) {
            alert("Liquidez insuficiente");
            return;
        }
        
        if (!confirm(`Retirar ${diamonds} 💎 por ${tonAmount.toFixed(4)} TON?`)) return;
        
        // Para automatización futura
        console.log(`📤 Retiro aprobado: ${tonAmount} TON para ${wallet.address}`);
        
        userData.diamonds -= diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        await updateGlobalPool(pool.pool_ton - tonAmount, pool.total_diamonds - diamonds);
        
        actualizarUI();
        alert(`✅ Retiro procesado\nSe enviarán ${tonAmount.toFixed(4)} TON manualmente`);
        
    } catch (error) {
        console.error("❌ Error retiro:", error);
        alert("Error en retiro");
    }
}

// =======================
// TIENDA Y PRODUCCIÓN
// =======================
function openStore() {
    try {
        console.log("🛒 Abriendo tienda");
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalStore").style.display = "block";
        
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
                    <div style="color: ${canAfford ? '#facc15' : '#94a3b8'}">
                        ${item.price} 💎
                    </div>
                    <button onclick="buyUpgrade('${item.name}',${item.price})" ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'MEJORAR' : 'INSUFICIENTES'}
                    </button>
                </div>
            </div>`;
        });
        
        document.getElementById("storeList").innerHTML = html;
        
    } catch (error) {
        console.error("❌ Error tienda:", error);
        alert("Error al abrir tienda");
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
        
        const field = fieldMap[name];
        if (!field) return;
        
        userData[field]++;
        userData.diamonds -= price;
        
        await _supabase.from('game_data')
            .update({ 
                diamonds: userData.diamonds,
                [field]: userData[field]
            })
            .eq('telegram_id', userData.id);
        
        actualizarUI();
        openStore();
        
        alert(`✅ ${name} mejorada a nivel ${userData[field]}`);
        
    } catch (error) {
        console.error("❌ Error mejora:", error);
    }
}

function openCentral() {
    try {
        console.log("🏛 Abriendo central");
        document.getElementById("overlay").style.display = "block";
        document.getElementById("centralModal").style.display = "block";
        
        const prod = {
            tienda: userData.lvl_tienda * PROD_VAL.tienda,
            casino: userData.lvl_casino * PROD_VAL.casino,
            piscina: userData.lvl_piscina * PROD_VAL.piscina,
            parque: userData.lvl_parque * PROD_VAL.parque,
            diversion: userData.lvl_diversion * PROD_VAL.diversion
        };
        
        const total = prod.tienda + prod.casino + prod.piscina + prod.parque + prod.diversion;
        
        document.getElementById("s_tienda").textContent = prod.tienda;
        document.getElementById("s_casino").textContent = prod.casino;
        document.getElementById("s_piscina").textContent = prod.piscina;
        document.getElementById("s_parque").textContent = prod.parque;
        document.getElementById("s_diversion").textContent = prod.diversion;
        document.getElementById("s_total").textContent = total;
        
    } catch (error) {
        console.error("❌ Error central:", error);
        alert("Error estadísticas");
    }
}

async function openWithdraw() {
    try {
        console.log("💰 Abriendo retiro");
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalWithdraw").style.display = "block";
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        const minDiamonds = Math.ceil(1 / price);
        document.getElementById("withdraw-info").innerHTML = 
            `Mínimo: <span class="highlight">${minDiamonds} 💎 (1 TON)</span><br>Recibirás: <span id="ton-receive">0</span> TON`;
        
    } catch (error) {
        console.error("❌ Error retiro:", error);
        alert("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value);
        
        if (!diamonds || diamonds <= 0) {
            document.getElementById("ton-receive").textContent = "0";
            return;
        }
        
        const pool = { pool_ton: 100, total_diamonds: 100000 };
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        document.getElementById("ton-receive").textContent = tonAmount.toFixed(4);
        
    } catch (error) {
        console.error("❌ Error cálculo:", error);
    }
}

async function processWithdraw() {
    try {
        const input = document.getElementById("withdraw-amount");
        const diamonds = parseInt(input.value);
        
        if (!diamonds || diamonds <= 0) {
            alert("Cantidad inválida");
            return;
        }
        
        await retirarTON(diamonds);
        closeAll();
        
    } catch (error) {
        console.error("❌ Error procesando:", error);
        alert("Error en retiro");
    }
}

function openFriends() {
    try {
        console.log("👥 Abriendo amigos");
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalFriends").style.display = "block";
        updateReferralStats();
    } catch (error) {
        console.error("❌ Error amigos:", error);
        alert("Error amigos");
    }
}

function closeAll() {
    try {
        document.getElementById("overlay").style.display = "none";
        ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"]
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = "none";
            });
    } catch (error) {
        console.error("❌ Error cerrando:", error);
    }
}

// =======================
// UI Y PRODUCCIÓN
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

// =======================
// INICIALIZACIÓN FINAL
// =======================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado");
    setTimeout(initApp, 300);
});

// =======================
// FUNCIONES GLOBALES (CRÍTICO)
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
window.processWithdraw = processWithdraw;
window.updateWithdrawCalculation = updateWithdrawCalculation;
window.retirarTON = retirarTON;
window.tonConnectUI = { 
    get wallet() { return tonConnectUI ? tonConnectUI.wallet : null; },
    disconnect: () => { if (tonConnectUI) tonConnectUI.disconnect(); }
};

console.log("✅ Ton City Game - Código completo cargado");
```
