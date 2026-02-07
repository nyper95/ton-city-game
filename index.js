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

// Configuración de Supabase (¡MOVER A VARIABLES DE ENTORNO!)
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tu billetera TON (¡MOVER A VARIABLES DE ENTORNO!)
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

let globalPool = {
    pool_ton: 100,
    total_diamonds: 100000
};

// Configuración económica
const USER_SHARE = 0.8;    // 80% para usuarios
const OWNER_SHARE = 0.2;   // 20% para el dueño

// Producción por hora
const PROD_VAL = {
    tienda: 10,
    casino: 25,
    piscina: 60,
    parque: 15,
    diversion: 120,
    banco: 5
};

// =======================
// FUNCIONES DE INICIALIZACIÓN
// =======================

// Inicializar la aplicación
function initApp() {
    console.log("🚀 Inicializando aplicación...");
    
    tg.expand();
    
    // Verificar usuario de Telegram
    const user = tg.initDataUnsafe.user;
    if (user) {
        console.log("✅ Usuario de Telegram detectado:", user.username);
        loadUser(user);
    } else {
        console.log("⚠️ No hay usuario de Telegram");
        document.getElementById("user-display").textContent = "Invitado";
        showError("Abre el juego desde Telegram para jugar");
    }
    
    // Configurar TON Connect
    setupTONConnect();
    
    // Configurar eventos
    setupEventListeners();
    
    // Iniciar producción
    startProduction();
    
    // Cargar pool global
    getGlobalPool();
    
    console.log("✅ Aplicación inicializada correctamente");
}

// Configurar TON Connect
function setupTONConnect() {
    tonConnectUI.onStatusChange((wallet) => {
        console.log("🔄 Estado de TON Connect:", wallet ? "Conectado" : "Desconectado");
        updateWalletUI(wallet);
        
        // Si el banco está abierto y se conecta, actualizar
        if (wallet && document.getElementById('modalBank').style.display === 'block') {
            openBank();
        }
    });
    
    // Estado inicial
    updateWalletUI(tonConnectUI.wallet);
}

// Configurar event listeners
function setupEventListeners() {
    // Calcular retiro en tiempo real
    const withdrawInput = document.getElementById("withdraw-amount");
    if (withdrawInput) {
        withdrawInput.addEventListener("input", updateWithdrawCalculation);
    }
    
    // Cerrar modales con Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeAll();
        }
    });
    
    console.log("✅ Event listeners configurados");
}

// =======================
// FUNCIONES DE USUARIO
// =======================

// Cargar usuario desde Supabase
async function loadUser(user) {
    try {
        console.log("👤 Cargando usuario:", user.id);
        
        userData.id = user.id.toString();
        userData.username = user.username || "Usuario";
        
        // Actualizar UI inmediatamente
        document.getElementById("user-display").textContent = userData.username;
        
        // Generar código de referencia
        userData.referral_code = 'REF' + user.id.toString().slice(-6);
        
        // Buscar usuario en la base de datos
        let { data, error } = await _supabase
            .from('usuarios')
            .select('*')
            .eq('telegram_id', userData.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Usuario no existe - crear nuevo
            console.log("➕ Creando nuevo usuario");
            
            // Verificar si hay referencia en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');
            
            await _supabase.from('usuarios').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 100,  // Bonificación inicial
                referral_code: userData.referral_code,
                referred_by: refCode || null,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                referral_earnings: 0
            }]);
            
            userData.diamonds = 100;
            
            // Dar bonificación al referidor si existe
            if (refCode) {
                await addReferralBonus(refCode, 50);
            }
            
        } else if (data) {
            // Usuario existe - cargar datos
            console.log("📂 Usuario encontrado en DB");
            
            userData.diamonds = data.diamonds || 0;
            userData.lvl_tienda = data.lvl_tienda || 0;
            userData.lvl_casino = data.lvl_casino || 0;
            userData.lvl_piscina = data.lvl_piscina || 0;
            userData.lvl_parque = data.lvl_parque || 0;
            userData.lvl_diversion = data.lvl_diversion || 0;
            userData.referral_code = data.referral_code || userData.referral_code;
            userData.referred_by = data.referred_by || null;
            userData.referral_earnings = data.referral_earnings || 0;
        }
        
        // Actualizar UI
        actualizarUI();
        updateReferralStats();
        
        console.log("✅ Usuario cargado correctamente");
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
        showError("Error al cargar usuario");
    }
}

// =======================
// SISTEMA DE REFERIDOS
// =======================

// Añadir bonificación al referidor
async function addReferralBonus(referralCode, bonus) {
    try {
        console.log("🎁 Añadiendo bonificación a referidor:", referralCode);
        
        // Buscar referidor
        let { data: referrer, error } = await _supabase
            .from('usuarios')
            .select('telegram_id, diamonds, referral_earnings')
            .eq('referral_code', referralCode)
            .single();
        
        if (referrer && !error) {
            // Calcular ganancia (10% del bonus)
            const earnings = Math.floor(bonus * 0.1);
            
            // Actualizar referidor
            await _supabase.from('usuarios')
                .update({
                    diamonds: (referrer.diamonds || 0) + earnings,
                    referral_earnings: (referrer.referral_earnings || 0) + earnings
                })
                .eq('telegram_id', referrer.telegram_id);
            
            console.log("✅ Bonificación añadida:", earnings, "diamantes");
        }
    } catch (error) {
        console.error("❌ Error añadiendo bonificación:", error);
    }
}

// Actualizar estadísticas de referidos
async function updateReferralStats() {
    if (!userData.id) return;
    
    try {
        // Contar referidos directos
        let { count, error } = await _supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', userData.referral_code);
        
        if (error) {
            console.error("Error contando referidos:", error);
            count = 0;
        }
        
        // Actualizar UI
        document.getElementById("ref-count").textContent = count || 0;
        document.getElementById("ref-earnings").textContent = `${userData.referral_earnings} 💎`;
        document.getElementById("ref-total").textContent = `${userData.referral_earnings} 💎`;
        
        if (document.getElementById("referral-code")) {
            document.getElementById("referral-code").textContent = userData.referral_code;
        }
        
    } catch (error) {
        console.error("❌ Error actualizando stats de referidos:", error);
    }
}

// Copiar código de referencia
function copyReferralCode() {
    if (!userData.referral_code) {
        showError("Código no disponible");
        return;
    }
    
    const code = userData.referral_code;
    const url = window.location.origin + window.location.pathname + '?ref=' + code;
    
    navigator.clipboard.writeText(url).then(() => {
        showMessage("✅ Enlace copiado: " + url);
    }).catch(err => {
        console.error("Error copiando:", err);
        showError("Error al copiar");
    });
}

// =======================
// ECONOMÍA Y POOL
// =======================

// Obtener pool global
async function getGlobalPool() {
    try {
        let { data, error } = await _supabase
            .from("global")
            .select("*")
            .eq("id", 1)
            .single();
        
        if (data) {
            globalPool = data;
            console.log("📊 Pool global cargado:", globalPool);
            return data;
        } else if (error) {
            console.warn("⚠️ No hay pool global, usando valores por defecto");
        }
    } catch (error) {
        console.error("❌ Error cargando pool:", error);
    }
    
    return globalPool;
}

// Actualizar pool global
async function updateGlobalPool(newTon, newDiamonds) {
    try {
        await _supabase.from("global").upsert({
            id: 1,
            pool_ton: newTon,
            total_diamonds: newDiamonds
        });
        
        globalPool.pool_ton = newTon;
        globalPool.total_diamonds = newDiamonds;
        
        console.log("🔄 Pool actualizado:", globalPool);
    } catch (error) {
        console.error("❌ Error actualizando pool:", error);
    }
}

// Calcular precio dinámico
function calcPrice(pool = globalPool) {
    if (!pool || pool.total_diamonds <= 0) return 0.001;
    const price = (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
    return Math.max(price, 0.000001); // Precio mínimo
}

// =======================
// TON CONNECT Y TRANSACCIONES
// =======================

// Actualizar UI de TON Connect
function updateWalletUI(wallet) {
    const connectButton = document.getElementById('ton-connect-button');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');
    const purchaseSection = document.getElementById('purchase-section');
    
    if (!connectButton || !walletInfo) return;
    
    if (wallet) {
        // Billetera conectada
        connectButton.style.display = 'none';
        walletInfo.classList.remove('hidden');
        
        // Formatear dirección
        const shortAddress = wallet.address.substring(0, 6) + '...' + 
                           wallet.address.substring(wallet.address.length - 4);
        walletAddress.textContent = shortAddress;
        
        // Mostrar sección de compra
        if (purchaseSection) {
            purchaseSection.classList.remove('hidden');
        }
        
    } else {
        // Billetera desconectada
        connectButton.style.display = 'block';
        walletInfo.classList.add('hidden');
        
        // Ocultar sección de compra
        if (purchaseSection) {
            purchaseSection.classList.add('hidden');
        }
    }
}

// Enviar transacción TON
async function sendTon(amount, to) {
    try {
        console.log("💸 Enviando", amount, "TON a", to);
        
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutos
            messages: [{
                address: to,
                amount: (amount * 1e9).toString() // Convertir a nanoTON
            }]
        };
        
        return await tonConnectUI.sendTransaction(tx);
        
    } catch (error) {
        console.error("❌ Error enviando TON:", error);
        throw error;
    }
}

// Comprar TON (obtener diamantes)
async function comprarTON(tonAmount) {
    try {
        console.log("🛒 Comprando", tonAmount, "TON");
        
        // Verificar billetera conectada
        const wallet = tonConnectUI.wallet;
        if (!wallet) {
            showError("Conecta tu billetera TON primero");
            return;
        }
        
        // Obtener pool y calcular
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        const diamonds = Math.floor(userTon / price);
        
        if (diamonds <= 0) {
            showError("Cantidad muy pequeña");
            return;
        }
        
        // Enviar TON
        await sendTon(tonAmount, MI_BILLETERA);
        
        // Actualizar usuario
        userData.diamonds += diamonds;
        await _supabase.from("usuarios")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        // Actualizar pool
        await updateGlobalPool(
            pool.pool_ton + userTon,
            pool.total_diamonds + diamonds
        );
        
        // Actualizar UI
        actualizarUI();
        openBank(); // Refrescar precios
        
        showMessage(`✅ Compra exitosa: ${diamonds} 💎`);
        
    } catch (error) {
        console.error("❌ Error en compra:", error);
        showError("Error en la compra");
    }
}

// Retirar TON
async function retirarTON(diamonds) {
    try {
        console.log("💎 Retirando", diamonds, "diamantes");
        
        // Verificar billetera
        const wallet = tonConnectUI.wallet;
        if (!wallet) {
            showError("Conecta tu billetera TON primero");
            return;
        }
        
        // Validar cantidad
        if (diamonds > userData.diamonds) {
            showError("No tienes suficientes diamantes");
            return;
        }
        
        if (diamonds <= 0) {
            showError("Cantidad inválida");
            return;
        }
        
        // Calcular TON a recibir
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const tonAmount = diamonds * price;
        
        // Verificar liquidez
        if (tonAmount > pool.pool_ton) {
            showError("Liquidez insuficiente en el pool");
            return;
        }
        
        // Confirmar
        if (!confirm(`¿Retirar ${diamonds} 💎 por ${tonAmount.toFixed(4)} TON?`)) {
            return;
        }
        
        // Enviar TON al usuario
        await sendTon(tonAmount, wallet.address);
        
        // Actualizar usuario
        userData.diamonds -= diamonds;
        await _supabase.from("usuarios")
            .update({ diamonds: userData.diamonds })
            .eq("telegram_id", userData.id);
        
        // Actualizar pool
        await updateGlobalPool(
            pool.pool_ton - tonAmount,
            pool.total_diamonds - diamonds
        );
        
        // Actualizar UI
        actualizarUI();
        
        showMessage(`✅ Retiro exitoso: ${tonAmount.toFixed(4)} TON enviados`);
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        showError("Error en el retiro");
    }
}

// =======================
// PRODUCCIÓN Y ACTUALIZACIÓN
// =======================

// Actualizar UI
function actualizarUI() {
    try {
        // Diamantes
        const diamondsElem = document.getElementById("diamonds");
        if (diamondsElem) {
            diamondsElem.textContent = Math.floor(userData.diamonds).toLocaleString();
        }
        
        // Producción por hora
        const totalPerHr = 
            userData.lvl_tienda * PROD_VAL.tienda +
            userData.lvl_casino * PROD_VAL.casino +
            userData.lvl_piscina * PROD_VAL.piscina +
            userData.lvl_parque * PROD_VAL.parque +
            userData.lvl_diversion * PROD_VAL.diversion +
            PROD_VAL.banco;
        
        const rateElem = document.getElementById("rate");
        if (rateElem) {
            rateElem.textContent = totalPerHr;
        }
        
        // Niveles de edificios
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

// Iniciar producción automática
function startProduction() {
    console.log("⚙️ Iniciando producción automática");
    
    setInterval(async () => {
        try {
            // Calcular producción por segundo
            const prodPerSecond = {
                tienda: userData.lvl_tienda * PROD_VAL.tienda / 3600,
                casino: userData.lvl_casino * PROD_VAL.casino / 3600,
                piscina: userData.lvl_piscina * PROD_VAL.piscina / 3600,
                parque: userData.lvl_parque * PROD_VAL.parque / 3600,
                diversion: userData.lvl_diversion * PROD_VAL.diversion / 3600,
                banco: PROD_VAL.banco / 3600
            };
            
            // Total por segundo
            const totalPerSecond = 
                prodPerSecond.tienda + prodPerSecond.casino + 
                prodPerSecond.piscina + prodPerSecond.parque + 
                prodPerSecond.diversion + prodPerSecond.banco;
            
            // Añadir diamantes
            userData.diamonds += totalPerSecond;
            
            // Actualizar UI
            actualizarUI();
            
            // Actualizar modal central si está abierto
            if (document.getElementById("centralModal").style.display === "block") {
                document.getElementById("s_tienda").textContent = Math.floor(prodPerSecond.tienda * 3600);
                document.getElementById("s_casino").textContent = Math.floor(prodPerSecond.casino * 3600);
                document.getElementById("s_piscina").textContent = Math.floor(prodPerSecond.piscina * 3600);
                document.getElementById("s_parque").textContent = Math.floor(prodPerSecond.parque * 3600);
                document.getElementById("s_diversion").textContent = Math.floor(prodPerSecond.diversion * 3600);
                document.getElementById("s_total").textContent = Math.floor(totalPerSecond * 3600);
            }
            
            // Guardar en base de datos cada 30 segundos
            if (Math.floor(Date.now() / 1000) % 30 === 0 && userData.id) {
                await _supabase.from('usuarios')
                    .update({ diamonds: userData.diamonds })
                    .eq('telegram_id', userData.id);
            }
            
        } catch (error) {
            console.error("❌ Error en producción:", error);
        }
    }, 1000); // Cada segundo
}

// =======================
// MODALES Y NAVEGACIÓN
// =======================

// Abrir banco
async function openBank() {
    try {
        showModal("modalBank");
        
        // Actualizar UI de billetera
        updateWalletUI(tonConnectUI.wallet);
        
        // Si hay billetera conectada, mostrar opciones
        if (tonConnectUI.wallet) {
            const pool = await getGlobalPool();
            const price = calcPrice(pool);
            
            let html = "";
            const tonOptions = [0.1, 0.5, 1, 2, 5, 10];
            
            // Cabecera con precio
            html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Precio actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>`;
            
            // Opciones de compra
            tonOptions.forEach(ton => {
                const diamonds = Math.floor((ton * USER_SHARE) / price);
                html += `
                <div class="stat">
                    <span>${ton.toFixed(2)} TON</span>
                    <span>≈ ${diamonds} 💎</span>
                    <button onclick="comprarTON(${ton})">Comprar</button>
                </div>`;
            });
            
            document.getElementById("bankList").innerHTML = html;
        }
        
    } catch (error) {
        console.error("❌ Error abriendo banco:", error);
        showError("Error al cargar el banco");
    }
}

// Abrir tienda
function openStore() {
    try {
        const items = [
            {name:"Tienda", lvl:userData.lvl_tienda, price:10},
            {name:"Casino", lvl:userData.lvl_casino, price:20},
            {name:"Piscina", lvl:userData.lvl_piscina, price:30},
            {name:"Parque", lvl:userData.lvl_parque, price:15},
            {name:"Diversión", lvl:userData.lvl_diversion, price:50}
        ];
        
        let html = "";
        items.forEach(item => {
            html += `<div class="stat">
                <span>${item.name} Lvl ${item.lvl}</span>
                <span>${item.price} 💎</span>
                <button onclick="buyUpgrade('${item.name}',${item.price})">Comprar</button>
            </div>`;
        });
        
        document.getElementById("storeList").innerHTML = html;
        showModal("modalStore");
        
    } catch (error) {
        console.error("❌ Error abriendo tienda:", error);
        showError("Error al cargar la tienda");
    }
}

// Comprar mejora
async function buyUpgrade(name, price) {
    try {
        if (userData.diamonds < price) {
            showError("No tienes suficientes 💎");
            return;
        }
        
        // Actualizar nivel
        switch(name) {
            case "Tienda": userData.lvl_tienda++; break;
            case "Casino": userData.lvl_casino++; break;
            case "Piscina": userData.lvl_piscina++; break;
            case "Parque": userData.lvl_parque++; break;
            case "Diversión": userData.lvl_diversion++; break;
        }
        
        // Actualizar diamantes
        userData.diamonds -= price;
        
        // Guardar en base de datos
        await _supabase.from('usuarios').update({
            diamonds: userData.diamonds,
            lvl_tienda: userData.lvl_tienda,
            lvl_casino: userData.lvl_casino,
            lvl_piscina: userData.lvl_piscina,
            lvl_parque: userData.lvl_parque,
            lvl_diversion: userData.lvl_diversion
        }).eq("telegram_id", userData.id);
        
        // Actualizar UI
        actualizarUI();
        openStore(); // Recargar tienda
        
        showMessage(`✅ ${name} mejorada a nivel ${eval(`userData.lvl_${name.toLowerCase()}`)}`);
        
    } catch (error) {
        console.error("❌ Error comprando mejora:", error);
        showError("Error en la compra");
    }
}

// Abrir edificio central
function openCentral() {
    try {
        const prod = {
            tienda: userData.lvl_tienda * PROD_VAL.tienda,
            casino: userData.lvl_casino * PROD_VAL.casino,
            piscina: userData.lvl_piscina * PROD_VAL.piscina,
            parque: userData.lvl_parque * PROD_VAL.parque,
            diversion: userData.lvl_diversion * PROD_VAL.diversion,
            banco: PROD_VAL.banco
        };
        
        const total = prod.tienda + prod.casino + prod.piscina + 
                     prod.parque + prod.diversion + prod.banco;
        
        // Actualizar valores
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

// Abrir amigos
async function openFriends() {
    try {
        await updateReferralStats();
        showModal("modalFriends");
    } catch (error) {
        console.error("❌ Error abriendo amigos:", error);
        showError("Error al cargar amigos");
    }
}

// Abrir retiro
async function openWithdraw() {
    try {
        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        
        // Actualizar información
        document.getElementById("current-price").textContent = price.toFixed(6) + " TON/💎";
        document.getElementById("available-diamonds").textContent = Math.floor(userData.diamonds) + " 💎";
        
        // Resetear input
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

// Procesar retiro
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

// Calcular retiro en tiempo real
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

// Mostrar modal
function showModal(id) {
    try {
        document.getElementById("overlay").style.display = "block";
        document.getElementById(id).style.display = "block";
    } catch (error) {
        console.error("❌ Error mostrando modal:", error);
    }
}

// Cerrar todos los modales
function closeAll() {
    try {
        document.getElementById("overlay").style.display = "none";
        
        // Lista de todos los modales
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

// =======================
// UTILIDADES
// =======================

// Mostrar mensaje
function showMessage(text) {
    alert(text);
}

// Mostrar error
function showError(text) {
    alert("❌ " + text);
}

// =======================
// INICIALIZACIÓN FINAL
// =======================

// Esperar a que cargue la página
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado, iniciando app...");
    setTimeout(initApp, 100); // Pequeño delay para asegurar carga
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
