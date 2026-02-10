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
// TON CONNECT - VERSIÓN SIMPLIFICADA Y FUNCIONAL
// =======================

async function initTONConnect() {
    try {
        console.log("🔄 Inicializando TON Connect...");
        
        // 1. Esperar a que la librería esté disponible
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error("❌ TON_CONNECT_UI no está disponible");
            showError("Error: TON Connect no cargó. Recarga la página.");
            return;
        }
        
        // 2. Crear contenedor si no existe
        let buttonContainer = document.getElementById('ton-connect-button');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.id = 'ton-connect-button';
            buttonContainer.style.position = 'relative';
            buttonContainer.style.zIndex = '1000';
            document.body.appendChild(buttonContainer);
            console.log("✅ Contenedor creado");
        }
        
        // 3. Inicializar TON Connect
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        console.log("✅ TON Connect UI inicializado");
        
        // 4. Escuchar cambios de estado
        tonConnectUI.onStatusChange((wallet) => {
            console.log("🔄 Estado cambiado:", wallet ? "Conectado" : "Desconectado");
            handleWalletStatusChange(wallet);
        });
        
        // 5. Verificar si ya está conectado
        setTimeout(() => {
            if (tonConnectUI && tonConnectUI.wallet) {
                console.log("🔗 Wallet ya conectada:", tonConnectUI.wallet);
                handleWalletStatusChange(tonConnectUI.wallet);
            }
        }, 1000);
        
    } catch (error) {
        console.error("❌ Error en initTONConnect:", error);
    }
}

function handleWalletStatusChange(wallet) {
    try {
        const connectBtnContainer = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        const walletAddress = document.getElementById('wallet-address');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');
        
        if (wallet) {
            // WALLET CONECTADA
            console.log("👛 Wallet conectada:", wallet.address);
            
            // Ocultar botón de conexión
            if (connectBtnContainer) {
                connectBtnContainer.style.display = 'none';
            }
            
            // Mostrar info de wallet
            if (walletInfo) {
                walletInfo.style.display = 'flex';
                walletInfo.style.alignItems = 'center';
                walletInfo.style.gap = '10px';
            }
            
            // Mostrar dirección corta
            if (walletAddress) {
                const shortAddr = wallet.address.substring(0, 6) + '...' + wallet.address.substring(wallet.address.length - 4);
                walletAddress.textContent = shortAddr;
                walletAddress.style.color = '#10b981';
                walletAddress.style.fontWeight = 'bold';
            }
            
            // Mostrar botón de desconexión
            if (disconnectBtn) {
                disconnectBtn.style.display = 'block';
                disconnectBtn.style.padding = '8px 12px';
                disconnectBtn.style.background = '#dc2626';
                disconnectBtn.style.color = 'white';
                disconnectBtn.style.border = 'none';
                disconnectBtn.style.borderRadius = '6px';
                disconnectBtn.style.cursor = 'pointer';
                disconnectBtn.onclick = () => disconnectWallet();
            }
            
        } else {
            // WALLET DESCONECTADA
            console.log("👛 Wallet desconectada");
            
            // Mostrar botón de conexión
            if (connectBtnContainer) {
                connectBtnContainer.style.display = 'block';
            }
            
            // Ocultar info de wallet
            if (walletInfo) {
                walletInfo.style.display = 'none';
            }
            
            // Ocultar botón de desconexión
            if (disconnectBtn) {
                disconnectBtn.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error("❌ Error en handleWalletStatusChange:", error);
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
        handleWalletStatusChange(null);
        showMessage("✅ Wallet desconectada");
        
    } catch (error) {
        console.error("❌ Error desconectando:", error);
        // Desconexión forzada
        handleWalletStatusChange(null);
        showMessage("✅ Desconectado");
    }
}

// =======================
// RESTANTE DEL CÓDIGO (igual que antes pero simplificado)
// =======================

async function loadUser(user) {
    try {
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                referral_code: referralCode,
                created_at: new Date().toISOString()
            }]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            
        } else if (data) {
            userData.diamonds = data.diamonds || 0;
            userData.lvl_tienda = data.lvl_tienda || 0;
            userData.lvl_casino = data.lvl_casino || 0;
            userData.lvl_piscina = data.lvl_piscina || 0;
            userData.lvl_parque = data.lvl_parque || 0;
            userData.lvl_diversion = data.lvl_diversion || 0;
            userData.referral_code = data.referral_code || referralCode;
        }
        
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
    }
}

async function getGlobalPool(){
    try {
        let { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) throw error;
        return data || { pool_ton: 100, total_diamonds: 100000 };
    } catch (error) {
        return { pool_ton: 100, total_diamonds: 100000 };
    }
}

function calcPrice(pool = null) {
    if (!pool) pool = { pool_ton: 100, total_diamonds: 100000 };
    if (pool.total_diamonds <= 0) return 0.001;
    const price = (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
    return Math.max(price, 0.000001);
}

async function comprarTON(tonAmount) {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            showError("Conecta tu billetera primero");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        if (diamonds < 100) diamonds = 100;
        
        const confirmMsg = `¿Comprar ${tonAmount.toFixed(2)} TON por ${diamonds.toLocaleString()} 💎?`;
        
        if (!confirm(confirmMsg)) return;
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                {
                    address: BILLETERA_POOL,
                    amount: (tonAmount * 0.8 * 1e9).toString()
                },
                {
                    address: BILLETERA_PROPIETARIO,
                    amount: (tonAmount * 0.2 * 1e9).toString()
                }
            ]
        };
        
        await tonConnectUI.sendTransaction(tx);
        
        userData.diamonds += diamonds;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        actualizarUI();
        showMessage(`✅ ¡COMPRA EXITOSA! ${diamonds.toLocaleString()} 💎 recibidos`);
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("Error en la compra");
    }
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
        
    } catch (error) {
        console.error("❌ Error actualizando UI:", error);
    }
}

function startProduction() {
    setInterval(() => {
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
                _supabase.from('game_data')
                    .update({ diamonds: userData.diamonds })
                    .eq('telegram_id', userData.id);
            }
            
        } catch (error) {
            console.error("❌ Error producción:", error);
        }
    }, 1000);
}

// Funciones de UI básicas
function openBank() {
    showModal("modalBank");
    // Actualizar UI de wallet
    if (tonConnectUI && tonConnectUI.wallet) {
        handleWalletStatusChange(tonConnectUI.wallet);
    }
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["modalBank", "modalStore", "modalWithdraw"].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = "none";
    });
}

function showMessage(text) { alert(text); }
function showError(text) { alert("❌ " + text); }

// =======================
// INICIALIZACIÓN
// =======================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado - iniciando app...");
    setTimeout(initApp, 500);
});

// Funciones globales
window.openBank = openBank;
window.comprarTON = comprarTON;
window.closeAll = closeAll;
window.disconnectWallet = disconnectWallet;

console.log("🌐 Ton City Game - Listo");
