// =======================
// CONFIGURACIÓN INICIAL
// =======================
console.log("🚀 Ton City Game - Iniciando...");

// Telegram
const tg = window.Telegram.WebApp;

// Billeteras (80/20)
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";

// Supabase
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// TON Connect
let tonConnectUI = null;

// Estado del usuario
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
// FUNCIONES BÁSICAS - PRIMERO ESTAS
// =======================

function showMessage(text) {
    alert(text);
}

function showError(text) {
    alert("❌ " + text);
}

function showModal(id) {
    try {
        document.getElementById("overlay").style.display = "block";
        document.getElementById(id).style.display = "block";
    } catch (e) {
        console.error("Error mostrando modal:", e);
    }
}

function closeAll() {
    try {
        document.getElementById("overlay").style.display = "none";
        ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
    } catch (e) {
        console.error("Error cerrando modales:", e);
    }
}

// =======================
// FUNCIONES DE UI
// =======================

function actualizarUI() {
    try {
        // Diamantes
        const diamondsElem = document.getElementById("diamonds");
        if (diamondsElem) {
            diamondsElem.textContent = Math.floor(userData.diamonds).toLocaleString();
        }
        
        // Producción por hora
        const totalPerHr = userData.lvl_tienda * PROD_VAL.tienda +
                          userData.lvl_casino * PROD_VAL.casino +
                          userData.lvl_piscina * PROD_VAL.piscina +
                          userData.lvl_parque * PROD_VAL.parque +
                          userData.lvl_diversion * PROD_VAL.diversion;
        
        const rateElem = document.getElementById("rate");
        if (rateElem) rateElem.textContent = totalPerHr;
        
        // Niveles
        document.getElementById("lvl_casino").textContent = userData.lvl_casino;
        document.getElementById("lvl_piscina").textContent = userData.lvl_piscina;
        document.getElementById("lvl_parque").textContent = userData.lvl_parque;
        document.getElementById("lvl_diversion").textContent = userData.lvl_diversion;
        
    } catch (error) {
        console.error("Error actualizando UI:", error);
    }
}

function startProduction() {
    console.log("⚙️ Iniciando producción...");
    
    setInterval(() => {
        try {
            const prodPorSegundo = (
                userData.lvl_tienda * PROD_VAL.tienda +
                userData.lvl_casino * PROD_VAL.casino +
                userData.lvl_piscina * PROD_VAL.piscina +
                userData.lvl_parque * PROD_VAL.parque +
                userData.lvl_diversion * PROD_VAL.diversion
            ) / 3600;
            
            userData.diamonds += prodPorSegundo;
            actualizarUI();
            
            // Actualizar modal central si está abierto
            if (document.getElementById("centralModal").style.display === "block") {
                document.getElementById("s_tienda").textContent = Math.floor(userData.lvl_tienda * PROD_VAL.tienda);
                document.getElementById("s_casino").textContent = Math.floor(userData.lvl_casino * PROD_VAL.casino);
                document.getElementById("s_piscina").textContent = Math.floor(userData.lvl_piscina * PROD_VAL.piscina);
                document.getElementById("s_parque").textContent = Math.floor(userData.lvl_parque * PROD_VAL.parque);
                document.getElementById("s_diversion").textContent = Math.floor(userData.lvl_diversion * PROD_VAL.diversion);
                document.getElementById("s_total").textContent = Math.floor(prodPorSegundo * 3600);
            }
            
            // Guardar cada 30 segundos
            if (Math.floor(Date.now() / 1000) % 30 === 0 && userData.id) {
                guardarDiamantes();
            }
            
        } catch (error) {
            console.error("Error en producción:", error);
        }
    }, 1000);
}

async function guardarDiamantes() {
    if (!userData.id) return;
    try {
        await _supabase.from('game_data')
            .update({ diamonds: userData.diamonds })
            .eq('telegram_id', userData.id);
    } catch (error) {
        console.error("Error guardando diamantes:", error);
    }
}

// =======================
// SUPABASE - POOL GLOBAL
// =======================

async function getGlobalPool() {
    try {
        const { data, error } = await _supabase
            .from("game_data")
            .select("pool_ton, total_diamonds")
            .eq("telegram_id", "MASTER")
            .single();
        
        if (error) throw error;
        return data || { pool_ton: 100, total_diamonds: 100000 };
    } catch (error) {
        console.error("Error cargando pool:", error);
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
        console.error("Error actualizando pool:", error);
    }
}

function calcPrice(pool) {
    if (!pool || pool.total_diamonds <= 0) return 0.001;
    return (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
}

// =======================
// USUARIO Y REFERIDOS
// =======================

async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        // Código de referencia
        const referralCode = 'REF' + user.id.toString().slice(-6);
        
        // Buscar usuario
        const { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        // Detectar referencia
        let refCode = null;
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        
        if (tg.initData) {
            const initData = new URLSearchParams(tg.initData);
            const startParam = initData.get('start');
            if (startParam) refCode = startParam;
        }
        
        if (error && error.code === 'PGRST116') {
            // USUARIO NUEVO
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                referral_code: referralCode,
                referred_by: refCode
            }]);
            
            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.referred_by = refCode;
            
            // Registrar referencia
            if (refCode) {
                await registrarReferencia(refCode, userData.id);
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
        }
        
        // Actualizar UI
        document.getElementById("user-display").textContent = userData.username;
        actualizarUI();
        await actualizarEstadisticasReferidos();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar perfil");
    }
}

async function registrarReferencia(referralCode, newUserId) {
    try {
        const { data: referrer } = await _supabase
            .from('game_data')
            .select('telegram_id, referred_users')
            .eq('referral_code', referralCode)
            .single();
        
        if (!referrer) return;
        
        const currentRefs = referrer.referred_users || [];
        const updatedRefs = [...currentRefs, newUserId];
        
        await _supabase.from('game_data')
            .update({ referred_users: updatedRefs })
            .eq('telegram_id', referrer.telegram_id);
        
    } catch (error) {
        console.error("Error registrando referencia:", error);
    }
}

async function actualizarEstadisticasReferidos() {
    if (!userData.id) return;
    
    try {
        const { data } = await _supabase
            .from('game_data')
            .select('referral_earnings, referred_users, referral_code')
            .eq('telegram_id', userData.id)
            .single();
        
        if (data) {
            const refCount = data.referred_users?.length || 0;
            const earnings = data.referral_earnings || 0;
            userData.referral_code = data.referral_code || userData.referral_code;
            
            document.getElementById("ref-count").textContent = refCount;
            document.getElementById("ref-earnings").textContent = `${earnings} 💎`;
            document.getElementById("ref-total").textContent = `${earnings} 💎`;
            document.getElementById("referral-code").textContent = userData.referral_code || "CARGANDO...";
        }
    } catch (error) {
        console.error("Error stats referidos:", error);
    }
}

// =======================
// TON CONNECT
// =======================

function initTONConnect() {
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange((wallet) => {
            console.log("TON Connect:", wallet ? "Conectado" : "Desconectado");
            actualizarUIWallet(wallet);
        });
        
    } catch (error) {
        console.error("Error iniciando TON Connect:", error);
    }
}

function actualizarUIWallet(wallet) {
    try {
        const btn = document.getElementById('ton-connect-button');
        const info = document.getElementById('wallet-info');
        const address = document.getElementById('wallet-address');
        
        if (!btn || !info) return;
        
        if (wallet) {
            btn.style.display = 'none';
            info.classList.remove('hidden');
            address.textContent = wallet.address.substring(0, 6) + '...' + 
                                  wallet.address.substring(wallet.address.length - 4);
        } else {
            btn.style.display = 'block';
            info.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error UI wallet:", error);
    }
}

// =======================
// FUNCIONES DE JUEGO
// =======================

// Banco
async function openBank() {
    showModal("modalBank");
    
    const wallet = tonConnectUI?.wallet;
    actualizarUIWallet(wallet);
    
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>`;
        
        const opciones = [0.10, 0.50, 1, 2, 5, 10];
        const conectado = !!wallet;
        
        opciones.forEach(ton => {
            const diamantes = Math.max(Math.floor((ton * USER_SHARE) / price), 100);
            const btnTexto = conectado ? 'COMPRAR' : 'CONECTAR';
            const btnAccion = conectado ? `comprarTON(${ton})` : 'openBank()';
            const deshabilitado = !conectado ? 'disabled' : '';
            
            html += `
            <div class="stat" style="border-left: 4px solid ${conectado ? '#facc15' : '#94a3b8'};">
                <div>
                    <strong>${ton.toFixed(2)} TON</strong><br>
                    <small style="color: #94a3b8;">→ ${diamantes.toLocaleString()} 💎</small>
                </div>
                <button onclick="${btnAccion}" ${deshabilitado}>
                    ${btnTexto}
                </button>
            </div>`;
        });
        
        document.getElementById("bankList").innerHTML = html;
        
    } catch (error) {
        console.error("Error abriendo banco:", error);
        showError("Error cargando banco");
    }
}

async function comprarTON(tonAmount) {
    try {
        if (!tonConnectUI?.wallet) {
            showError("Conecta tu billetera primero");
            return;
        }
        
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const diamantes = Math.max(Math.floor((tonAmount * USER_SHARE) / price), 100);
        
        // Dividir 80/20
        const comision = tonAmount * 0.2;
        const fondo = tonAmount * 0.8;
        
        if (!confirm(`¿Comprar ${tonAmount.toFixed(2)} TON por ${diamantes.toLocaleString()} 💎?`)) return;
        
        // Transacción con dos destinatarios
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                { address: BILLETERA_POOL, amount: (fondo * 1e9).toString() },
                { address: BILLETERA_PROPIETARIO, amount: (comision * 1e9).toString() }
            ]
        };
        
        await tonConnectUI.sendTransaction(tx);
        
        // Actualizar usuario
        userData.diamonds += diamantes;
        await _supabase.from("game_data")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        // Actualizar pool
        await updateGlobalPool(pool.pool_ton + fondo, pool.total_diamonds + diamantes);
        
        actualizarUI();
        showMessage(`✅ ¡Compra exitosa! ${diamantes.toLocaleString()} 💎 recibidos`);
        
    } catch (error) {
        console.error("Error comprando:", error);
        showError("Error en la compra");
    }
}

// Tienda
function openStore() {
    const items = [
        {name: "Tienda", lvl: userData.lvl_tienda, price: 1000, prod: 10},
        {name: "Casino", lvl: userData.lvl_casino, price: 2500, prod: 25},
        {name: "Piscina", lvl: userData.lvl_piscina, price: 5000, prod: 60},
        {name: "Parque", lvl: userData.lvl_parque, price: 1500, prod: 15},
        {name: "Diversión", lvl: userData.lvl_diversion, price: 10000, prod: 120}
    ];
    
    let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                  <span><b>🏪 Tienda</b></span>
                  <span><b>${Math.floor(userData.diamonds).toLocaleString()} 💎</b></span>
                </div>`;
    
    items.forEach(item => {
        const puede = userData.diamonds >= item.price;
        html += `<div class="stat" style="${puede ? 'border-left: 4px solid #10b981;' : 'border-left: 4px solid #dc2626;'}">
            <div>
                <strong>${item.name} Nvl ${item.lvl}</strong><br>
                <small>+${item.prod} 💎/hora</small>
            </div>
            <div>
                <div style="color: ${puede ? '#facc15' : '#94a3b8'}">${item.price.toLocaleString()} 💎</div>
                <button onclick="comprarMejora('${item.name}',${item.price})" ${!puede ? 'disabled' : ''}>
                    ${puede ? 'MEJORAR' : 'INSUFICIENTE'}
                </button>
            </div>
        </div>`;
    });
    
    document.getElementById("storeList").innerHTML = html;
    showModal("modalStore");
}

async function comprarMejora(nombre, precio) {
    if (userData.diamonds < precio) {
        showError("Diamantes insuficientes");
        return;
    }
    
    const mapa = {
        "Tienda": "lvl_tienda",
        "Casino": "lvl_casino", 
        "Piscina": "lvl_piscina",
        "Parque": "lvl_parque",
        "Diversión": "lvl_diversion"
    };
    
    const campo = mapa[nombre];
    if (!campo) return;
    
    userData[campo]++;
    userData.diamonds -= precio;
    
    await _supabase.from('game_data')
        .update({ 
            [campo]: userData[campo],
            diamonds: userData.diamonds
        })
        .eq("telegram_id", userData.id);
    
    actualizarUI();
    openStore();
    showMessage(`✅ ${nombre} mejorada a nivel ${userData[campo]}`);
}

// Central
function openCentral() {
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
    
    showModal("centralModal");
}

// Amigos
async function openFriends() {
    await actualizarEstadisticasReferidos();
    showModal("modalFriends");
}

function copyReferralCode() {
    if (!userData.referral_code) {
        showError("Código no disponible");
        return;
    }
    
    const enlace = `https://t.me/ton_city_bot?start=${userData.referral_code}`;
    const mensaje = `🎮 ¡Únete a Ton City Game!\n\nUsa mi enlace:\n${enlace}\n\n📱 Solo en Telegram`;
    
    navigator.clipboard.writeText(mensaje).then(() => {
        showMessage("✅ Enlace copiado!");
    }).catch(() => {
        showMessage(`🔗 Copia manual:\n\n${enlace}`);
    });
}

// Retiros
async function openWithdraw() {
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        const minimo = Math.ceil(1 / price);
        document.getElementById("withdraw-amount").placeholder = `Mínimo: ${minimo} 💎`;
        
        showModal("modalWithdraw");
        
    } catch (error) {
        console.error("Error retiro:", error);
        showError("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    const input = document.getElementById("withdraw-amount");
    const diamantes = parseInt(input.value);
    
    if (!diamantes) {
        document.getElementById("ton-receive").t
