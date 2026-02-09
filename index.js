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
        tg.ready();

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
        await updateProductionDisplay();

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
            uiPreferences: { theme: 'DARK' },
            language: 'es'
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

        if (wallet && wallet.address) {
            connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');

            const shortAddress = wallet.address.substring(0, 6) + '...' + 
                               wallet.address.substring(wallet.address.length - 4);
            if(walletAddress) walletAddress.textContent = shortAddress;

        } else {
            connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
        }
    } catch (error) {
        console.error("❌ Error UI billetera:", error);
    }
}

function disconnectWallet() {
    if (tonConnectUI) {
        tonConnectUI.disconnect();
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
            await _supabase.from('game_data').insert([{
                telegram_id: userData.id,
                username: userData.username,
                diamonds: 0,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                referral_code: referralCode,
                referred_by: refCode || null,
                referral_earnings: 0,
                created_at: new Date().toISOString()
            }]);

            userData.diamonds = 0;
            userData.referral_code = referralCode;
            userData.referred_by = refCode;

            if (refCode) {
                await processReferral(refCode, userData.id);
            }

        } else if (data) {
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
        await updateProductionDisplay();

    } catch (error) {
        console.error("❌ Error cargando usuario:", error);
    }
}

async function processReferral(referralCode, newUserId) {
    try {
        if (!referralCode) return;

        const { data: referrer, error } = await _supabase
            .from('game_data')
            .select('telegram_id, referred_users, referral_earnings')
            .eq('referral_code', referralCode)
            .single();

        if (!referrer || error) return;

        const currentReferredUsers = referrer.referred_users || [];
        const updatedReferredUsers = [...currentReferredUsers, newUserId];
        const newEarnings = (referrer.referral_earnings || 0) + 100;

        await _supabase.from('game_data')
            .update({
                referred_users: updatedReferredUsers,
                referral_earnings: newEarnings,
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
            document.getElementById("referral-code").textContent = data.referral_code || "---";
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

// ✅ CORRECCIÓN: Cálculo correcto del mínimo de retiro
async function calcMinWithdraw() {
    try {
        const pool = await getGlobalPool();
        const totalDiamonds = pool.total_diamonds;
        const tonInPool = pool.pool_ton;
        
        if (tonInPool <= 0 || totalDiamonds <= 0) {
            return 1;
        }
        
        const calculatedMin = totalDiamonds / tonInPool;
        const finalMin = Math.max(1, calculatedMin);
        
        return Math.round(finalMin * 100) / 100;
    } catch (error) {
        console.error("❌ Error calculando mínimo:", error);
        return 1;
    }
}

// =======================
// FUNCIONES DE INTERFAZ
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

    } catch (error) {
        console.error("❌ Error UI:", error);
    }
}

// ✅ NUEVA: Mostrar producción por edificio
async function updateProductionDisplay() {
    try {
        const productionGrid = document.getElementById("productionGrid");
        if (!productionGrid) return;

        const buildings = [
            { name: "🏪 Tienda", level: userData.lvl_tienda, value: PROD_VAL.tienda },
            { name: "🎰 Casino", level: userData.lvl_casino, value: PROD_VAL.casino },
            { name: "🏊 Piscina", level: userData.lvl_piscina, value: PROD_VAL.piscina },
            { name: "🌳 Parque", level: userData.lvl_parque, value: PROD_VAL.parque },
            { name: "🎡 Diversión", level: userData.lvl_diversion, value: PROD_VAL.diversion },
            { name: "💰 Total", level: "", value: 0 }
        ];

        let html = '';
        
        buildings.forEach((building, index) => {
            let production = 0;
            if (index === 0) production = userData.lvl_tienda * PROD_VAL.tienda;
            else if (index === 1) production = userData.lvl_casino * PROD_VAL.casino;
            else if (index === 2) production = userData.lvl_piscina * PROD_VAL.piscina;
            else if (index === 3) production = userData.lvl_parque * PROD_VAL.parque;
            else if (index === 4) production = userData.lvl_diversion * PROD_VAL.diversion;
            else if (index === 5) {
                production = (userData.lvl_tienda * PROD_VAL.tienda) +
                            (userData.lvl_casino * PROD_VAL.casino) +
                            (userData.lvl_piscina * PROD_VAL.piscina) +
                            (userData.lvl_parque * PROD_VAL.parque) +
                            (userData.lvl_diversion * PROD_VAL.diversion);
            }

            html += `
            <div class="production-item">
                <div class="production-name">${building.name}</div>
                <div class="production-value">${production}/h</div>
                ${building.level !== "" ? `<div style="font-size: 11px; color: #64748b;">Nvl ${building.level}</div>` : ''}
            </div>`;
        });

        productionGrid.innerHTML = html;

    } catch (error) {
        console.error("❌ Error producción display:", error);
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
// MODALES
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

// ✅ CORREGIDO: Modal Banco con botones que funcionan
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
        const isConnected = !!(wallet && wallet.address);

        tonOptions.forEach(ton => {
            const diamonds = Math.floor((ton * USER_SHARE) / price);
            const finalDiamonds = Math.max(diamonds, 100);

            const buttonText = isConnected ? 'COMPRAR' : 'CONECTAR';
            const buttonStyle = isConnected ?
                'background: linear-gradient(135deg, #10b981, #059669);' :
                'background: #475569;';
            const buttonDisabled = !isConnected ? 'disabled' : '';
            const buttonAction = isConnected ? `comprarTON(${ton})` : 'initTONConnect()';

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

        document.getElementById("bankList").innerHTML = html;

    } catch (error) {
        console.error("❌ Error banco:", error);
    }
}

// ✅ CORREGIDO: Función de compra funcional
async function comprarTON(tonAmount) {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            alert("❌ Conecta tu billetera primero");
            return;
        }

        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const userTon = tonAmount * USER_SHARE;
        let diamonds = Math.floor(userTon / price);
        if (diamonds < 100) diamonds = 100;

        const comisionPropietario = tonAmount * 0.2;
        
        await updateGlobalPool(
            pool.pool_ton + tonAmount,
            pool.total_diamonds - diamonds
        );

        userData.diamonds += diamonds;
        await _supabase.from('game_data')
            .update({ diamonds: userData.diamonds })
            .eq('telegram_id', userData.id);

        actualizarUI();
        hideModal("modalBank");
        
        alert(`✅ Compra exitosa!\nRecibiste: ${diamonds.toLocaleString()} 💎`);

    } catch (error) {
        console.error("❌ Error compra:", error);
        alert("❌ Error en la compra");
    }
}

// ✅ CORREGIDO: Modal Amigos funcional
async function openFriends() {
    try {
        showModal("modalFriends");
        await updateReferralStats();
        
        let html = `<div style="margin-top: 20px; padding: 15px; background: #1e293b; border-radius: 12px;">
                      <h3 style="color: #facc15; margin-bottom: 10px;">📋 TU CÓDIGO DE REFERIDO</h3>
                      <div style="background: #0f172a; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 15px;">
                        <div style="font-size: 24px; font-weight: bold; color: #10b981;" id="referral-display">${userData.referral_code || "---"}</div>
                        <button onclick="copyReferralCode()" style="margin-top: 10px; padding: 8px 15px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                          📋 Copiar código
                        </button>
                      </div>
                      <p style="color: #94a3b8; font-size: 14px;">
                        Comparte este código con amigos y gana 100 💎 por cada referido
                      </p>
                    </div>`;
        
        document.getElementById("friendsList").innerHTML = html;

    } catch (error) {
        console.error("❌ Error amigos:", error);
    }
}

function copyReferralCode() {
    const code = userData.referral_code;
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
        alert("✅ Código copiado al portapapeles!");
    });
}

// ✅ CORREGIDO: Modal Retirar con mínimo correcto
async function openWithdraw() {
    try {
        showModal("modalWithdraw");

        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const minWithdraw = await calcMinWithdraw();
        const userDiamonds = Math.floor(userData.diamonds);
        const maxTon = (userDiamonds * price) / USER_SHARE;

        let html = `<div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💎 Diamantes disponibles</b></span>
                      <span><b>${userDiamonds.toLocaleString()} 💎</b></span>
                    </div>
                    
                    <div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>💰 Tasa actual</b></span>
                      <span><b>${price.toFixed(6)} TON/💎</b></span>
                    </div>
                    
                    <div class="stat" style="background:#0f172a; margin-bottom: 15px;">
                      <span><b>⚠️ Mínimo para retirar</b></span>
                      <span><b>${minWithdraw.toFixed(2)} TON</b></span>
                    </div>
                    
                    <div class="stat" style="background:#1e293b; margin-bottom: 20px; border: 2px solid #f59e0b;">
                      <span><b>💸 Puedes retirar hasta</b></span>
                      <span><b>${maxTon.toFixed(2)} TON</b></span>
                    </div>`;
        
        if (userDiamonds > 0 && maxTon >= minWithdraw) {
            html += `
            <div style="text-align: center; margin-top: 20px;">
              <button onclick="withdrawTON()" 
                      style="padding: 15px 30px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer; width: 100%;">
                💸 RETIRAR ${maxTon.toFixed(2)} TON
              </button>
              <p style="color: #94a3b8; font-size: 14px; margin-top: 10px;">
                Por: ${userDiamonds.toLocaleString()} 💎
              </p>
            </div>`;
        } else {
            html += `
            <div style="text-align: center; padding: 20px; background: #1e293b; border-radius: 12px; margin-top: 20px;">
              <div style="color: #f87171; font-size: 16px; margin-bottom: 10px;">
                ⚠️ No puedes retirar aún
              </div>
              <p style="color: #94a3b8; font-size: 14px;">
                ${userDiamonds === 0 ? 'No tienes diamantes' : `Necesitas al menos ${minWithdraw.toFixed(2)} TON (${Math.ceil(minWithdraw / price)} 💎)`}
              </p>
            </div>`;
        }

        document.getElementById("withdrawInfo").innerHTML = html;

    } catch (error) {
        console.error("❌ Error retiro:", error);
    }
}

// ✅ CORREGIDO: Función de retiro completa
async function withdrawTON() {
    try {
        if (!tonConnectUI || !tonConnectUI.wallet) {
            alert("❌ Conecta tu billetera primero");
            return;
        }

        const pool = await getGlobalPool();
        const price = calcPrice(pool);
        const minWithdraw = await calcMinWithdraw();
        const userDiamonds = Math.floor(userData.diamonds);
        const tonToReceive = (userDiamonds * price) / USER_SHARE;
        
        if (tonToReceive < minWithdraw) {
            alert(`❌ Monto insuficiente\nMínimo: ${minWithdraw.toFixed(2)} TON\nTienes: ${tonToReceive.toFixed(2)} TON`);
            return;
        }

        if (tonToReceive > pool.pool_ton) {
            alert("❌ Fondos insuficientes en el pool");
            return;
        }

        const confirmation = confirm(
            `¿Confirmar retiro?\n\n` +
            `💎 Diamantes: ${userDiamonds.toLocaleString()}\n` +
            `💰 Recibirás: ${tonToReceive.toFixed(2)} TON\n` +
            `📊 Tasa: ${price.toFixed(6)} TON/💎`
        );

        if (!confirmation) return;

        await updateGlobalPool(
            pool.pool_ton - tonToReceive,
            pool.total_diamonds + userDiamonds
        );

        userData.diamonds = 0;
        await _supabase.from('game_data')
            .update({ diamonds: 0 })
            .eq('telegram_id', userData.id);

        actualizarUI();
        hideModal("modalWithdraw");
        
        alert(`✅ Retiro exitoso!\nHas recibido ${tonToReceive.toFixed(2)} TON`);

    } catch (error) {
        console.error("❌ Error retiro:", error);
        alert("❌ Error en el retiro");
    }
}

// ✅ NUEVO: Modal Edificios
async function openBuildings() {
    try {
        showModal("modalBuildings");

        const buildings = [
            { id: 'tienda', name: '🏪 Tienda', level: userData.lvl_tienda, base: PROD_VAL.tienda },
            { id: 'casino', name: '🎰 Casino', level: userData.lvl_casino, base: PROD_VAL.casino },
            { id: 'piscina', name: '🏊 Piscina', level: userData.lvl_piscina, base: PROD_VAL.piscina },
            { id: 'parque', name: '🌳 Parque', level: userData.lvl_parque, base: PROD_VAL.parque },
            { id: 'diversion', name: '🎡 Diversión', level: userData.lvl_diversion, base: PROD_VAL.diversion }
        ];

        let html = '';
        
        buildings.forEach(building => {
            const production = building.level * building.base;
            const upgradeCost = Math.pow(2, building.level) * 100;
            
            html += `
            <div class="building-card">
                <div class="building-name">${building.name}</div>
                <div class="building-level">Nivel ${building.level}</div>
                <div style="color: #10b981; font-size: 14px; margin-bottom: 10px;">
                    Producción: ${production}/h
                </div>
                <div style="color: #facc15; font-size: 14px; margin-bottom: 15px;">
                    Siguiente nivel: ${upgradeCost} 💎
                </div>
                <button class="upgrade-btn" onclick="upgradeBuilding('${building.id}')">
                    MEJORAR (${upgradeCost} 💎)
                </button>
            </div>`;
        });

        document.getElementById("buildingsGrid").innerHTML = html;

    } catch (error) {
        console.error("❌ Error edificios:", error);
    }
}

async function upgradeBuilding(building) {
    try {
        if (!userData.id) return;

        const upgradeCost = Math.pow(2, userData[`lvl_${building}`]) * 100;
        
        if (userData.diamonds < upgradeCost) {
            alert(`❌ Diamantes insuficientes\nNecesitas: ${upgradeCost} 💎`);
            return;
        }

        userData.diamonds -= upgradeCost;
        userData[`lvl_${building}`]++;

        await _supabase.from('game_data')
            .update({
                diamonds: userData.diamonds,
                [`lvl_${building}`]: userData[`lvl_${building}`]
            })
            .eq('telegram_id', userData.id);

        actualizarUI();
        await updateProductionDisplay();
        hideModal("modalBuildings");
        
        alert(`✅ ¡${building.toUpperCase()} mejorado!\nAhora es nivel ${userData[`lvl_${building}`]}`);

    } catch (error) {
        console.error(`❌ Error mejorando ${building}:`, error);
    }
}

// =======================
// INICIALIZACIÓN GLOBAL
// =======================
window.openBank = openBank;
window.openFriends = openFriends;
window.openWithdraw = openWithdraw;
window.openBuildings = openBuildings;
window.comprarTON = comprarTON;
window.withdrawTON = withdrawTON;
window.upgradeBuilding = upgradeBuilding;
window.showModal = showModal;
window.hideModal = hideModal;
window.disconnectWallet = disconnectWallet;
window.copyReferralCode = copyReferralCode;
window.initTONConnect = initTONConnect;

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});
