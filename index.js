// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// Direcciones de billeteras
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";

// TON Connect
let tonConnectUI = null;
let currentWallet = null;

// Supabase - CORREGIDO CON MANEJO DE ERRORES
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

// IMPORTANTE: Crear cliente con opciones específicas
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Estado global
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

const USER_SHARE = 0.8;
const PROD_VAL = { tienda:10, casino:25, piscina:60, parque:15, diversion:120 };

// =======================
// FUNCIONES DE SUPABASE MEJORADAS
// =======================

// Función para verificar conexión a Supabase
async function checkSupabaseConnection() {
    try {
        console.log("🔍 Verificando conexión a Supabase...");
        const { data, error } = await _supabase
            .from('game_data')
            .select('telegram_id')
            .limit(1);
        
        if (error) {
            console.error("❌ Error conexión Supabase:", error);
            return false;
        }
        
        console.log("✅ Conexión Supabase OK");
        return true;
    } catch (error) {
        console.error("❌ Error verificando Supabase:", error);
        return false;
    }
}

// Función mejorada para cargar usuario
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        const referralCode = 'REF' + user.id.toString().slice(-6);
        const now = new Date();
        
        // 1. Verificar si usuario existe
        let { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // USUARIO NUEVO
            console.log("➕ Creando nuevo usuario en Supabase");
            
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
                referred_users: [],
                last_seen: now.toISOString(),
                last_online: now.toISOString(),
                created_at: now.toISOString()
            };
            
            const { data: newData, error: insertError } = await _supabase
                .from('game_data')
                .insert([newUser])
                .select()
                .single();
            
            if (insertError) {
                console.error("❌ Error creando usuario:", insertError);
                throw insertError;
            }
            
            console.log("✅ Usuario creado en Supabase:", newData);
            userData = { ...userData, ...newData };
            
        } else if (error) {
            console.error("❌ Error cargando usuario:", error);
            throw error;
            
        } else if (data) {
            // USUARIO EXISTENTE
            console.log("📁 Usuario encontrado en Supabase:", data);
            
            // Actualizar estado local
            userData.diamonds = Number(data.diamonds) || 0;
            userData.lvl_tienda = Number(data.lvl_tienda) || 0;
            userData.lvl_casino = Number(data.lvl_casino) || 0;
            userData.lvl_piscina = Number(data.lvl_piscina) || 0;
            userData.lvl_parque = Number(data.lvl_parque) || 0;
            userData.lvl_diversion = Number(data.lvl_diversion) || 0;
            userData.referral_code = data.referral_code || referralCode;
            userData.referral_earnings = Number(data.referral_earnings) || 0;
            userData.last_online = data.last_online || now.toISOString();
            
            // CALCULAR PRODUCCIÓN OFFLINE
            if (data.last_online) {
                const lastOnline = new Date(data.last_online);
                const secondsOffline = (now - lastOnline) / 1000;
                
                if (secondsOffline > 1) {
                    const totalPerHr = 
                        userData.lvl_tienda * PROD_VAL.tienda +
                        userData.lvl_casino * PROD_VAL.casino +
                        userData.lvl_piscina * PROD_VAL.piscina +
                        userData.lvl_parque * PROD_VAL.parque +
                        userData.lvl_diversion * PROD_VAL.diversion;
                    
                    const hoursOffline = secondsOffline / 3600;
                    const diamondsEarned = Math.floor(totalPerHr * hoursOffline);
                    
                    if (diamondsEarned > 0) {
                        userData.diamonds += diamondsEarned;
                        console.log(`💰 Producción offline: ${diamondsEarned} 💎 (${hoursOffline.toFixed(2)} horas)`);
                        
                        // Guardar inmediatamente
                        await saveUserDataToSupabase();
                    }
                }
            }
            
            // Actualizar last_online y last_seen
            userData.last_online = now.toISOString();
            await _supabase
                .from('game_data')
                .update({ 
                    last_seen: now.toISOString(),
                    last_online: now.toISOString()
                })
                .eq('telegram_id', userData.id);
        }
        
        // Actualizar UI
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        
        console.log("✅ Usuario cargado exitosamente:", {
            id: userData.id,
            diamonds: userData.diamonds,
            niveles: {
                tienda: userData.lvl_tienda,
                casino: userData.lvl_casino,
                piscina: userData.lvl_piscina,
                parque: userData.lvl_parque,
                diversion: userData.lvl_diversion
            }
        });
        
    } catch (error) {
        console.error("❌ Error CRÍTICO en loadUser:", error);
        showError("Error al cargar datos. Recarga la página.");
    }
}

// Función optimizada para guardar en Supabase
async function saveUserDataToSupabase() {
    try {
        if (!userData.id) {
            console.warn("⚠️ No hay userData.id para guardar");
            return false;
        }
        
        const updateData = {
            diamonds: userData.diamonds,
            lvl_tienda: userData.lvl_tienda,
            lvl_casino: userData.lvl_casino,
            lvl_piscina: userData.lvl_piscina,
            lvl_parque: userData.lvl_parque,
            lvl_diversion: userData.lvl_diversion,
            last_seen: new Date().toISOString(),
            last_online: userData.last_online || new Date().toISOString()
        };
        
        console.log("💾 Guardando en Supabase:", updateData);
        
        const { data, error } = await _supabase
            .from('game_data')
            .update(updateData)
            .eq('telegram_id', userData.id)
            .select();
        
        if (error) {
            console.error("❌ Error guardando en Supabase:", error);
            return false;
        }
        
        console.log("✅ Datos guardados en Supabase:", data);
        return true;
        
    } catch (error) {
        console.error("❌ Error en saveUserDataToSupabase:", error);
        return false;
    }
}

// =======================
// INICIALIZACIÓN MEJORADA
// =======================
async function initApp() {
    console.log("🚀 Iniciando aplicación...");
    
    try {
        tg.expand();
        
        // Verificar Supabase primero
        const supabaseOk = await checkSupabaseConnection();
        if (!supabaseOk) {
            showError("Error de conexión. Recarga la página.");
            return;
        }
        
        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log("✅ Usuario Telegram:", user.username);
            await loadUser(user);
        } else {
            document.getElementById("user-display").textContent = "Invitado";
            showError("Abre desde Telegram");
        }
        
        await initTONConnect();
        startProduction();
        
    } catch (error) {
        console.error("❌ Error en initApp:", error);
        showError("Error inicializando la app");
    }
}

// =======================
// PRODUCCIÓN CON GUARDADO AUTOMÁTICO
// =======================
function startProduction() {
    console.log("⚙️ Iniciando producción con guardado automático...");
    
    let lastSaveTime = Date.now();
    let diamondsSinceLastSave = 0;
    
    setInterval(async () => {
        try {
            if (!userData.id) return;
            
            // Calcular producción por segundo
            const totalPerHr = 
                userData.lvl_tienda * PROD_VAL.tienda +
                userData.lvl_casino * PROD_VAL.casino +
                userData.lvl_piscina * PROD_VAL.piscina +
                userData.lvl_parque * PROD_VAL.parque +
                userData.lvl_diversion * PROD_VAL.diversion;
            
            const diamondsPerSecond = totalPerHr / 3600;
            
            // Añadir diamantes
            userData.diamonds += diamondsPerSecond;
            diamondsSinceLastSave += diamondsPerSecond;
            
            // Actualizar UI
            actualizarUI();
            
            // Guardar en Supabase cada 30 segundos O si se acumularon más de 10 diamantes
            const currentTime = Date.now();
            if (currentTime - lastSaveTime >= 30000 || diamondsSinceLastSave >= 10) {
                const saved = await saveUserDataToSupabase();
                if (saved) {
                    console.log(`💾 Guardado automático: ${Math.floor(diamondsSinceLastSave)} 💎 acumulados`);
                    lastSaveTime = currentTime;
                    diamondsSinceLastSave = 0;
                }
            }
            
        } catch (error) {
            console.error("❌ Error en producción:", error);
        }
    }, 1000); // Cada segundo
}

// =======================
// COMPRAS CON GUARDADO INMEDIATO
// =======================
async function comprarTON(tonAmount) {
    try {
        if (!currentWallet) {
            showError("❌ Conecta tu billetera primero");
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
            
            // Actualizar diamantes
            userData.diamonds += diamonds;
            
            // GUARDAR INMEDIATAMENTE EN SUPABASE
            const saved = await saveUserDataToSupabase();
            if (!saved) {
                showError("⚠️ Compra exitosa pero error guardando datos");
            }
            
            // Actualizar pool global
            await updateGlobalPoolAfterPurchase(tonAmount, diamonds);
            
            actualizarUI();
            
            showMessage(`✅ ¡COMPRA EXITOSA!\n\n${diamonds.toLocaleString()} 💎 recibidos`);
            
            setTimeout(() => openBank(), 1000);
            
        } catch (txError) {
            console.error("❌ Error en transacción:", txError);
            showError("❌ Transacción cancelada o fallida");
        }
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("❌ Error en la compra");
    }
}

// =======================
// MEJORAS CON GUARDADO INMEDIATO
// =======================
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
        
        // GUARDAR INMEDIATAMENTE EN SUPABASE
        const saved = await saveUserDataToSupabase();
        if (!saved) {
            showError("⚠️ Mejora aplicada pero error guardando datos");
        }
        
        actualizarUI();
        
        setTimeout(() => openStore(), 100);
        
        showMessage(`✅ ${name} mejorada a nivel ${userData[fieldToUpdate]}!`);
        
    } catch (error) {
        console.error("❌ Error mejorando:", error);
        showError("Error al comprar mejora");
    }
}

// =======================
// FUNCIONES RESTANTES (igual que antes pero optimizadas)
// =======================
async function getGlobalPool() {
    try {
        let { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) {
            console.log("⚠️ Creando registro MASTER...");
            const initialPool = {
                telegram_id: "MASTER",
                username: "MASTER",
                diamonds: 0,
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

// =======================
// FUNCIONES DE TON CONNECT (igual que antes)
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
// FUNCIONES RESTANTES (las mismas)
// =======================
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

console.log("🌐 Ton City Game - SISTEMA CON SUPABASE OPTIMIZADO");
