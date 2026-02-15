// ======================================================
// TON CITY GAME - CÓDIGO INTEGRAL UNIFICADO (CORREGIDO)
// ======================================================

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
console.log("✅ Ton City Game - Inicializando...");

// Telegram Web App
const tg = window.Telegram.WebApp;

// ==========================================
// CONFIGURACIÓN DE BILLETERAS Y PRECIOS
// ==========================================
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw"; 
const BILLETERA_POOL = "UQDY-D_6F1oyftwpq_AZNBOd3Fh4xKDj2C8sjz6Cx1A_Lvxb";      
const PRECIO_COMPRA = 0.008; // 1 Diamante = 0.008 TON

// ==========================================
// CONFIGURACIÓN TÉCNICA
// ==========================================
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const TON_API_URL = 'https://tonapi.io';
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

// Inicializar Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// ESTADO DEL JUEGO
// ==========================================
let tonConnectUI = null;
let currentWallet = null;

let userData = {
    id: null,
    username: "Cargando...",
    diamonds: 0,
    lvl_tienda: 0, 
    lvl_casino: 0, 
    lvl_piscina: 0, 
    lvl_parque: 0, 
    lvl_diversion: 0,
    referral_code: null,
    last_online: null,
    last_withdraw_week: null // Para controlar retiros semanales
};

let globalPoolData = { 
    pool_ton: 0, 
    total_diamonds: 0 
};

const PROD_VAL = { 
    tienda: 10, 
    casino: 25, 
    piscina: 60, 
    parque: 15, 
    diversion: 120 
};

// ==========================================
// SISTEMA DE CONTROL DE PRODUCCIÓN Y RETIROS
// ==========================================

// Verificar si es domingo (0 = domingo en JavaScript)
function esDomingo() {
    const hoy = new Date();
    return hoy.getDay() === 0; // 0 = domingo
}

// Verificar si estamos en ventana de retiro (domingo 00:00 - lunes 00:00)
function enVentanaRetiro() {
    const ahora = new Date();
    const dia = ahora.getDay();
    
    // Domingo todo el día (00:00 a 23:59)
    if (dia === 0) return true;
    
    return false;
}

// Verificar si la producción debe estar activa
function produccionActiva() {
    // La producción se PAUSA durante la ventana de retiros (domingos)
    return !enVentanaRetiro();
}

// Obtener número de semana (para control)
function getNumeroSemana() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), 0, 1);
    const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil(dias / 7);
}

// FÓRMULA CORRECTA: 1 TON = pool_ton / total_diamonds
function calcularTasaRetiro() {
    if (!globalPoolData || globalPoolData.pool_ton <= 0 || globalPoolData.total_diamonds <= 0) {
        return 0.001; // Valor por defecto: 0.001 TON por diamante
    }
    // 1 diamante = pool_ton / total_diamonds TON
    const tasa = globalPoolData.pool_ton / globalPoolData.total_diamonds;
    return Math.max(tasa, 0.0001); // Mínimo 0.0001 TON por diamante
}

function calcularTONPorDiamantes(diamantes) {
    const tasa = calcularTasaRetiro();
    return diamantes * tasa;
}

function calcularDiamantesPorTON(ton) {
    const tasa = calcularTasaRetiro();
    return Math.ceil(ton / tasa);
}

// ==========================================
// SISTEMA DE RETIROS SEMANALES
// ==========================================

// Abrir modal de retiro
async function openWithdraw() {
    try {
        // Verificar si estamos en ventana de retiro
        if (!enVentanaRetiro()) {
            const mensaje = "❌ Los retiros solo están disponibles los DOMINGOS (00:00 - 23:59)";
            alert(mensaje);
            return;
        }
        
        // Verificar si ya retiró esta semana
        const semanaActual = getNumeroSemana();
        if (userData.last_withdraw_week === semanaActual) {
            alert("❌ Ya has retirado esta semana. Vuelve el próximo domingo.");
            return;
        }
        
        showModal("modalWithdraw");
        
        // Actualizar pool antes de calcular
        await updateGlobalPoolStats();
        await loadTotalDiamondsFromDB();
        
        const tasa = calcularTasaRetiro(); // TON por diamante
        const poolTon = globalPoolData.pool_ton;
        const totalDiamantes = globalPoolData.total_diamonds;
        const misDiamantes = Math.floor(userData.diamonds || 0);
        
        // Calcular cuántos diamantes necesitas para 1 TON
        const diamantesPor1TON = Math.ceil(1 / tasa);
        
        // Actualizar UI
        document.getElementById("current-price").textContent = `1 💎 = ${tasa.toFixed(6)} TON`;
        document.getElementById("available-diamonds").textContent = `${misDiamantes} 💎`;
        
        const input = document.getElementById("withdraw-amount");
        if (input) {
            input.value = "";
            input.min = 1;
            input.max = misDiamantes;
            input.placeholder = `Cantidad de 💎`;
            input.removeEventListener('input', updateWithdrawCalculation);
            input.addEventListener('input', updateWithdrawCalculation);
        }
        
        const infoElement = document.getElementById("withdraw-info");
        if (infoElement) {
            infoElement.innerHTML = 
                `<div style="background: #1e293b; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="color: #94a3b8;">Valor actual:</span>
                        <span style="color: #facc15; font-weight: bold; font-size: 1.2rem;">1 💎 = ${tasa.toFixed(6)} TON</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #94a3b8;">1 TON =</span>
                        <span style="color: #10b981; font-weight: bold;">${diamantesPor1TON.toLocaleString()} 💎</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span style="color: #94a3b8;">Pool disponible:</span>
                        <span style="color: #10b981; font-weight: bold;">${poolTon.toFixed(4)} TON</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span style="color: #94a3b8;">Semana actual:</span>
                        <span style="color: #facc15; font-weight: bold;">#${semanaActual}</span>
                    </div>
                    <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: center; color: #94a3b8;">
                        ⏸️ PRODUCCIÓN PAUSADA (Domingo - Evento de Retiro)
                    </div>
                </div>
                <div style="background: #0f172a; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #94a3b8;">Recibirás:</span>
                        <span id="ton-receive" style="color: #10b981; font-size: 1.5rem; font-weight: bold;">0.0000</span>
                        <span style="color: #94a3b8;">TON</span>
                    </div>
                </div>
                <div style="background: #0f172a; padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #94a3b8;">
                    <strong>📊 Fórmula de retiro semanal:</strong><br>
                    • Pool: ${poolTon.toFixed(4)} TON<br>
                    • Diamantes totales (todos los usuarios): ${totalDiamantes.toLocaleString()} 💎<br>
                    • 1 💎 = ${poolTon.toFixed(4)} TON ÷ ${totalDiamantes.toLocaleString()} 💎<br>
                    • <strong style="color: #facc15;">1 💎 = ${tasa.toFixed(6)} TON</strong><br>
                    • <strong style="color: #10b981;">1 TON = ${diamantesPor1TON.toLocaleString()} 💎</strong>
                </div>`;
        }
        
        updateWithdrawCalculation();
        
    } catch (error) {
        console.error("❌ Error abriendo retiro:", error);
        alert("Error cargando retiro");
    }
}

function updateWithdrawCalculation() {
    try {
        const input = document.getElementById("withdraw-amount");
        if (!input) return;
        
        const diamantes = parseInt(input.value) || 0;
        const tonReceiveElem = document.getElementById("ton-receive");
        if (!tonReceiveElem) return;
        
        const tasa = calcularTasaRetiro();
        const misDiamantes = Math.floor(userData.diamonds || 0);
        const poolDisponible = globalPoolData.pool_ton;
        
        if (diamantes <= 0) {
            tonReceiveElem.textContent = "0.0000";
            tonReceiveElem.style.color = "#10b981";
            return;
        }
        
        if (diamantes > misDiamantes) {
            tonReceiveElem.innerHTML = `<span style="color: #ef4444;">Máximo: ${misDiamantes} 💎</span>`;
            return;
        }
        
        // CÁLCULO CORRECTO: TON = diamantes × tasa
        const tonRecibido = diamantes * tasa;
        
        if (tonRecibido > poolDisponible) {
            const maxDiamantes = Math.floor(poolDisponible / tasa);
            tonReceiveElem.innerHTML = 
                `<span style="color: #ef4444;">Pool insuficiente - Máx: ${maxDiamantes.toLocaleString()} 💎</span>`;
            return;
        }
        
        tonReceiveElem.textContent = tonRecibido.toFixed(4);
        tonReceiveElem.style.color = "#10b981";
        
        console.log(`💰 Retiro semanal: ${diamantes} 💎 × ${tasa.toFixed(6)} = ${tonRecibido.toFixed(4)} TON`);
        
    } catch (error) {
        console.error("❌ Error en cálculo:", error);
    }
}

async function processWithdraw() {
    try {
        // Verificar nuevamente ventana de retiro
        if (!enVentanaRetiro()) {
            alert("❌ Los retiros solo están disponibles los DOMINGOS");
            return;
        }
        
        // Verificar si ya retiró esta semana
        const semanaActual = getNumeroSemana();
        if (userData.last_withdraw_week === semanaActual) {
            alert("❌ Ya has retirado esta semana. Vuelve el próximo domingo.");
            return;
        }
        
        const input = document.getElementById("withdraw-amount");
        if (!input) {
            alert("Campo no encontrado");
            return;
        }
        
        const diamantes = parseInt(input.value);
        const misDiamantes = Math.floor(userData.diamonds || 0);
        
        if (!diamantes || diamantes <= 0) {
            alert("❌ Ingresa una cantidad válida");
            return;
        }
        
        if (diamantes > misDiamantes) {
            alert(`❌ Solo tienes ${misDiamantes} 💎`);
            return;
        }
        
        const tasa = calcularTasaRetiro();
        const tonRecibido = diamantes * tasa;
        
        if (tonRecibido > globalPoolData.pool_ton) {
            alert(`❌ No hay suficiente TON en el pool`);
            return;
        }
        
        const diamantesPor1TON = Math.ceil(1 / tasa);
        
        const confirmMsg = 
            `¿RETIRAR SEMANAL?\n\n` +
            `Retirarás: ${diamantes.toLocaleString()} 💎\n` +
            `Recibirás: ${tonRecibido.toFixed(4)} TON\n` +
            `Tasa: 1 💎 = ${tasa.toFixed(6)} TON\n` +
            `1 TON = ${diamantesPor1TON.toLocaleString()} 💎\n\n` +
            `Esta operación solo se puede hacer UNA VEZ por semana.\n` +
            `La producción se reanudará mañana (lunes).`;
        
        if (!confirm(confirmMsg)) return;
        
        // PROCESAR RETIRO
        userData.diamonds -= diamantes;
        userData.last_withdraw_week = semanaActual;
        
        await saveUserData();
        
        // Actualizar pool (restar TON)
        try {
            const newPoolTon = globalPoolData.pool_ton - tonRecibido;
            
            await _supabase
                .from("game_data")
                .update({
                    pool_ton: newPoolTon,
                    last_seen: new Date().toISOString()
                })
                .eq("telegram_id", "MASTER");
            
            globalPoolData.pool_ton = newPoolTon;
            
        } catch (updateError) {
            console.error("❌ Error actualizando pool:", updateError);
        }
        
        actualizarUI();
        closeAll();
        
        alert(
            `✅ RETIRO SEMANAL EXITOSO!\n\n` +
            `Retiraste: ${diamantes.toLocaleString()} 💎\n` +
            `Recibirás: ${tonRecibido.toFixed(4)} TON\n` +
            `Próximo retiro: Domingo ${semanaActual + 1}`
        );
        
    } catch (error) {
        console.error("❌ Error en retiro:", error);
        alert("Error al procesar retiro");
    }
}

// ==========================================
// INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================
async function initApp() {
    try {
        console.log("🚀 Iniciando Aplicación...");
        tg.expand();
        tg.ready();

        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log("✅ Usuario Telegram:", user.username || user.first_name);
            userData.id = user.id.toString();
            userData.username = user.username || user.first_name || "Usuario";
            
            // Actualizar nombre en UI inmediatamente
            const nameElem = document.getElementById("user-display");
            if (nameElem) nameElem.textContent = userData.username;
            
            await loadUserFromDB(user.id);
        } else {
            document.getElementById("user-display").textContent = "Invitado";
        }

        await initTONConnect();
        await updateGlobalPoolStats();
        await loadTotalDiamondsFromDB();
        
        // Renderizar partes dinámicas
        renderStore();
        renderBank();
        
        // Iniciar bucles
        startProduction(); 
        setInterval(saveUserData, 30000); // Auto-guardado cada 30s
        
        // Mostrar estado de producción al inicio
        mostrarEstadoProduccion();
        
    } catch (error) {
        console.error("❌ Error en initApp:", error);
    }
}

function mostrarEstadoProduccion() {
    if (!produccionActiva()) {
        console.log("⏸️ PRODUCCIÓN PAUSADA - Es domingo (evento de retiro)");
        // Opcional: mostrar un mensaje en UI
        const statusElem = document.createElement("div");
        statusElem.id = "production-status";
        statusElem.style = "background: #f59e0b; color: black; text-align: center; padding: 5px; font-weight: bold;";
        statusElem.textContent = "⏸️ PRODUCCIÓN PAUSADA - Evento de Retiro (Domingo)";
        document.body.prepend(statusElem);
    }
}

async function loadTotalDiamondsFromDB() {
    try {
        const { data, error } = await _supabase
            .from("game_data")
            .select("diamonds")
            .neq("telegram_id", "MASTER");
            
        if (!error && data) {
            globalPoolData.total_diamonds = data.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);
            console.log(`💎 Total diamantes TODOS los usuarios: ${globalPoolData.total_diamonds.toLocaleString()}`);
        }
    } catch (error) {
        console.error("❌ Error cargando total_diamonds:", error);
    }
}

async function loadUserFromDB(tgId) {
    try {
        const { data, error } = await _supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', tgId.toString())
            .single();

        if (data) {
            console.log("📁 Usuario encontrado en DB");
            userData = { 
                ...userData, 
                ...data, 
                id: tgId.toString(),
                diamonds: Number(data.diamonds) || 0,
                lvl_tienda: Number(data.lvl_tienda) || 0,
                lvl_casino: Number(data.lvl_casino) || 0,
                lvl_piscina: Number(data.lvl_piscina) || 0,
                lvl_parque: Number(data.lvl_parque) || 0,
                lvl_diversion: Number(data.lvl_diversion) || 0,
                last_withdraw_week: data.last_withdraw_week || null
            };
            
            if (!userData.referral_code) {
                userData.referral_code = 'REF' + userData.id.slice(-6);
            }
        } else {
            console.log("🆕 Creando nuevo usuario...");
            userData.referral_code = 'REF' + tgId.toString().slice(-6);
            
            // Crear en Supabase
            await _supabase.from('game_data').insert([{
                telegram_id: tgId.toString(),
                username: userData.username,
                diamonds: 0,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                referral_code: userData.referral_code,
                last_online: new Date().toISOString(),
                last_withdraw_week: null
            }]);
        }
        actualizarUI();
        updateReferralUI();
        
    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
    }
}

function updateReferralUI() {
    const codeElem = document.getElementById("referral-code");
    if (codeElem) {
        codeElem.textContent = userData.referral_code || "NO DISPONIBLE";
    }
}

// ==========================================
// LÓGICA DE TIENDA Y BANCO (DINÁMICO)
// ==========================================
function renderStore() {
    const storeContainer = document.getElementById("storeList");
    if (!storeContainer) return;

    const upgrades = [
        { name: "Tienda", field: "tienda", price: 1000, prod: PROD_VAL.tienda, color: "#3b82f6", icon: "fa-store" },
        { name: "Casino", field: "casino", price: 2500, prod: PROD_VAL.casino, color: "#ef4444", icon: "fa-dice" },
        { name: "Piscina", field: "piscina", price: 5000, prod: PROD_VAL.piscina, color: "#38bdf8", icon: "fa-water-ladder" },
        { name: "Parque", field: "parque", price: 1500, prod: PROD_VAL.parque, color: "#10b981", icon: "fa-tree" },
        { name: "Diversión", field: "diversion", price: 10000, prod: PROD_VAL.diversion, color: "#f472b6", icon: "fa-gamepad" }
    ];

    let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                  <span><b>🏪 Tienda de Mejoras</b></span>
                  <span><b>${Math.floor(userData.diamonds || 0).toLocaleString()} 💎</b></span>
                </div>`;

    upgrades.forEach(item => {
        const lvl = userData[`lvl_${item.field}`] || 0;
        const canAfford = (userData.diamonds || 0) >= item.price;
        
        html += `
        <div class="store-item" style="border-left: 4px solid ${item.color}; padding: 15px; margin-bottom: 15px; background: #0f172a; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid ${item.icon}" style="color: ${item.color}; font-size: 1.2rem;"></i>
                    <strong style="font-size: 1.1rem;">${item.name} Nvl ${lvl}</strong>
                </div>
                <span style="color: #facc15; font-weight: bold; font-size: 1.1rem;">${item.price.toLocaleString()} 💎</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: #94a3b8;">Producción:</span>
                <span style="color: #10b981;">+${item.prod} 💎/hora</span>
            </div>
            <button onclick="buyUpgrade('${item.name}', '${item.field}', ${item.price})" 
                    style="background: ${canAfford ? item.color : '#475569'}; 
                           color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; font-weight: bold; cursor: ${canAfford ? 'pointer' : 'not-allowed'};"
                    ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? 'MEJORAR' : 'FONDOS INSUFICIENTES'}
            </button>
        </div>`;
    });

    html += `<div class="info-text" style="margin-top: 15px; text-align: center; color: #94a3b8;">
               Cada mejora aumenta tu producción por hora
             </div>`;

    storeContainer.innerHTML = html;
}

function renderBank() {
    const bankContainer = document.getElementById("bankList");
    if (!bankContainer) return;

    const isConnected = !!currentWallet;
    const packs = [
        { ton: 0.10, diamonds: 100 },
        { ton: 0.50, diamonds: 500 },
        { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 },
        { ton: 5.00, diamonds: 5000 },
        { ton: 10.00, diamonds: 10000 }
    ];

    let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                  <span><b>💰 Precio de compra</b></span>
                  <span><b>${PRECIO_COMPRA.toFixed(3)} TON/💎</b></span>
                </div>`;

    packs.forEach(p => {
        const buttonText = isConnected ? 'COMPRAR' : 'CONECTAR';
        const buttonStyle = isConnected ?
            'background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;' :
            'background: #475569; color: #94a3b8; border: none; padding: 10px 16px; border-radius: 8px; cursor: not-allowed;';
        
        html += `
        <div class="stat" style="border-left: 4px solid ${isConnected ? '#facc15' : '#94a3b8'}; padding: 12px;">
            <div style="display: flex; flex-direction: column;">
                <strong style="font-size: 1.1rem;">${p.ton.toFixed(2)} TON</strong>
                <span style="color: #94a3b8; font-size: 0.9rem;">Recibes ${p.diamonds} 💎</span>
            </div>
            <button onclick="comprarTON(${p.ton})"
                    style="${buttonStyle} min-width: 100px;"
                    ${!isConnected ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>`;
    });

    if (!isConnected) {
        html += `<div class="info-text" style="margin-top: 15px; padding: 15px; background: #1e293b; border-radius: 12px;">
                   <i class="fa-solid fa-wallet" style="color: #facc15;"></i> Conecta tu billetera para comprar
                 </div>`;
    }

    bankContainer.innerHTML = html;
}

// ==========================================
// SISTEMA DE PRODUCCIÓN (CON PAUSA EN DOMINGOS)
// ==========================================
function startProduction() {
    console.log("⚙️ Iniciando producción...");
    
    setInterval(() => {
        if (!userData.id) return;
        
        // ⚠️ VERIFICAR SI LA PRODUCCIÓN DEBE ESTAR ACTIVA
        if (!produccionActiva()) {
            // Producción pausada por ser domingo
            return;
        }
        
        const totalPerHr = 
            (userData.lvl_tienda * PROD_VAL.tienda) +
            (userData.lvl_casino * PROD_VAL.casino) +
            (userData.lvl_piscina * PROD_VAL.piscina) +
            (userData.lvl_parque * PROD_VAL.parque) +
            (userData.lvl_diversion * PROD_VAL.diversion);

        userData.diamonds += (totalPerHr / 3600);
        actualizarUI();
        
        if (document.getElementById("centralModal")?.style.display === "block") {
            updateCentralStats();
        }
    }, 1000);
}

// ==========================================
// EDIFICIO CENTRAL Y ESTADÍSTICAS
// ==========================================
function openCentral() {
    updateCentralStats();
    showModal("centralModal");
}

function updateCentralStats() {
    const prod = {
        tienda: (userData.lvl_tienda || 0) * PROD_VAL.tienda,
        casino: (userData.lvl_casino || 0) * PROD_VAL.casino,
        piscina: (userData.lvl_piscina || 0) * PROD_VAL.piscina,
        parque: (userData.lvl_parque || 0) * PROD_VAL.parque,
        diversion: (userData.lvl_diversion || 0) * PROD_VAL.diversion
    };
    const total = prod.tienda + prod.casino + prod.piscina + prod.parque + prod.diversion;

    const ids = {
        "s_tienda": prod.tienda,
        "s_casino": prod.casino,
        "s_piscina": prod.piscina,
        "s_parque": prod.parque,
        "s_diversion": prod.diversion,
        "s_total": total
    };

    Object.entries(ids).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value.toLocaleString();
    });
    
    // Mostrar estado de producción en el central
    const statusElem = document.getElementById("production-status-modal");
    if (statusElem) {
        if (!produccionActiva()) {
            statusElem.innerHTML = '<div style="background: #f59e0b; color: black; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: center; font-weight: bold;">⏸️ PRODUCCIÓN PAUSADA - Evento de Retiro (Domingo)</div>';
        } else {
            statusElem.innerHTML = '';
        }
    }
}

// ==========================================
// AMIGOS Y REFERIDOS
// ==========================================
function openFriends() {
    const codeElem = document.getElementById("referral-code");
    if (codeElem) codeElem.textContent = userData.referral_code || "CARGANDO...";
    showModal("modalFriends");
}

function copyReferralCode() {
    if (!userData.referral_code) return alert("❌ Código no disponible");
    
    const link = `https://t.me/ton_city_bot?start=${userData.referral_code}`;
    navigator.clipboard.writeText(link).then(() => alert("✅ Enlace copiado!"));
}

// ==========================================
// TON CONNECT Y TRANSACCIONES (80/20)
// ==========================================
async function initTONConnect() {
    try {
        console.log("🔄 Inicializando TON Connect...");
        
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error("❌ TON_CONNECT_UI no disponible");
            return;
        }
        
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        
        tonConnectUI.onStatusChange((wallet) => {
            currentWallet = wallet;
            updateWalletUI(wallet);
            if (document.getElementById("modalBank")?.style.display === "block") {
                renderBank();
            }
        });
        
        console.log("✅ TON Connect inicializado");
        
    } catch (error) {
        console.error("❌ Error en TON Connect:", error);
    }
}

function updateWalletUI(wallet) {
    try {
        const connectButton = document.getElementById('ton-connect-button');
        const walletInfo = document.getElementById('wallet-info');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');
        
        if (!walletInfo) return;
        
        if (wallet) {
            if (connectButton) connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');
            if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
        } else {
            if (connectButton) connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
            if (disconnectBtn) disconnectBtn.style.display = 'none';
        }
    } catch (error) {
        console.error("❌ Error en UI wallet:", error);
    }
}

async function disconnectWallet() {
    try {
        if (tonConnectUI) {
            await tonConnectUI.disconnect();
            currentWallet = null;
            updateWalletUI(null);
            alert("✅ Wallet desconectada");
        }
    } catch (error) {
        console.error("❌ Error desconectando:", error);
    }
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) {
        return alert("❌ Conecta tu wallet primero");
    }

    const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            { address: BILLETERA_POOL, amount: Math.floor(tonAmount * 0.8 * 1e9).toString() },
            { address: BILLETERA_PROPIETARIO, amount: Math.floor(tonAmount * 0.2 * 1e9).toString() }
        ]
    };

    try {
        await tonConnectUI.sendTransaction(tx);
        const comprados = Math.floor(tonAmount / PRECIO_COMPRA);
        userData.diamonds += comprados;
        await saveUserData();
        actualizarUI();
        alert(`✅ Compra exitosa! Recibiste ${comprados} 💎`);
    } catch (e) {
        console.error("❌ Error en transacción:", e);
        alert("❌ Error en la transacción");
    }
}

// ==========================================
// COMPRAR MEJORAS
// ==========================================
async function buyUpgrade(name, field, price) {
    if ((userData.diamonds || 0) < price) {
        return alert("❌ No tienes suficientes diamantes");
    }
    
    userData[`lvl_${field}`] = (userData[`lvl_${field}`] || 0) + 1;
    userData.diamonds -= price;
    
    await saveUserData();
    actualizarUI();
    renderStore();
    alert(`✅ ¡${name} nivel ${userData[`lvl_${field}`]}!`);
}

// ==========================================
// UTILIDADES DE UI Y MODALES
// ==========================================
function actualizarUI() {
    const dElem = document.getElementById("diamonds");
    if (dElem) dElem.textContent = Math.floor(userData.diamonds || 0).toLocaleString();
    
    const rElem = document.getElementById("rate");
    if (rElem) {
        const totalPerHr = (userData.lvl_tienda * PROD_VAL.tienda) + 
                           (userData.lvl_casino * PROD_VAL.casino) + 
                           (userData.lvl_piscina * PROD_VAL.piscina) + 
                           (userData.lvl_parque * PROD_VAL.parque) + 
                           (userData.lvl_diversion * PROD_VAL.diversion);
        rElem.textContent = totalPerHr.toLocaleString();
    }
    
    // Actualizar niveles en la UI principal
    const lvlCasino = document.getElementById("lvl_casino");
    const lvlPiscina = document.getElementById("lvl_piscina");
    const lvlParque = document.getElementById("lvl_parque");
    const lvlDiversion = document.getElementById("lvl_diversion");
    
    if (lvlCasino) lvlCasino.textContent = userData.lvl_casino || 0;
    if (lvlPiscina) lvlPiscina.textContent = userData.lvl_piscina || 0;
    if (lvlParque) lvlParque.textContent = userData.lvl_parque || 0;
    if (lvlDiversion) lvlDiversion.textContent = userData.lvl_diversion || 0;
}

function showModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    ["centralModal", "modalBank", "modalStore", "modalFriends", "modalWithdraw"].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = "none";
    });
}

async function saveUserData() {
    if (!userData.id) return;
    
    try {
        await _supabase.from('game_data').update({
            diamonds: Math.floor(userData.diamonds || 0),
            lvl_tienda: userData.lvl_tienda || 0,
            lvl_casino: userData.lvl_casino || 0,
            lvl_piscina: userData.lvl_piscina || 0,
            lvl_parque: userData.lvl_parque || 0,
            lvl_diversion: userData.lvl_diversion || 0,
            last_online: new Date().toISOString(),
            last_withdraw_week: userData.last_withdraw_week
        }).eq('telegram_id', userData.id);
    } catch (error) {
        console.error("❌ Error guardando:", error);
    }
}

async function updateGlobalPoolStats() {
    try {
        const res = await fetch(`${TON_API_URL}/v2/accounts/${BILLETERA_POOL}`, {
            headers: { 'Authorization': `Bearer ${TON_API_KEY}` }
        });
        const data = await res.json();
        globalPoolData.pool_ton = (data.balance || 0) / 1e9;
        console.log(`💰 Pool: ${globalPoolData.pool_ton.toFixed(4)} TON`);
    } catch (e) { 
        console.error("Error obteniendo pool stats:", e); 
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado");
    setTimeout(initApp, 500);
});

// EXPORTAR FUNCIONES GLOBALES PARA HTML
window.openCentral = openCentral;
window.openStore = () => { renderStore(); showModal("modalStore"); };
window.openBank = () => { renderBank(); showModal("modalBank"); };
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.disconnectWallet = disconnectWallet;
window.processWithdraw = processWithdraw;

console.log("✅ Ton City Game - Código listo con RETIROS SEMANALES y PRODUCCIÓN PAUSADA EN DOMINGOS");
