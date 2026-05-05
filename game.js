// ======================================================
// TON CITY - VERSIÓN FINAL CORREGIDA
// ======================================================
console.log('🚀 TON CITY - Iniciando...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const RED_TON_FEE = 0.002;
const RESERVA_POOL = 0.95;
const BILLETERA_PROPIETARIO = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";
const BILLETERA_POOL = "UQBuoEgT5DmcoEQ_nl6YwR0Q86fZWY4baACuX80EegWG49h2";
const PRECIO_COMPRA = 0.008;
const ADSGRAM_BLOCK_ID = '23186';
const TON_API_KEY = 'AG2XICNRZEOJNEQAAAAO737JGJAKU56K43DE4OSQLMHPWHMHONPW2U4LG24XY4DFYUJMLCQ';
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// ESTADO DEL JUEGO
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let adsReady = false;
let AdController = null;
let pendingMultiplier = null;
let bancoTabActual = 'compra';
let ventaCantidad = 100;
window._tasaVentaActual = 10000;

let userData = {
    id: null, username: "Cargando...", diamonds: 0,
    lvl_piscina: 0, lvl_fabrica: 0, lvl_escuela: 0, lvl_hospital: 0,
    referral_code: null, referral_earnings: 0, referred_users: [],
    last_online: null, last_production_update: null, last_withdraw_week: null,
    last_ad_watch: null, last_casino_rescue: null,
    daily_streak: 0, last_daily_claim: null,
    haInvertido: false, premium_expires: null,
    weekly_rank: null, rank: "Ciudadano", projectedReward: 0,
    event_progress: {}, accumulated_ton: 0, retiradoHoy: 0,
    gameStats: {
        escuela: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
        fabrica: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
        piscina: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 },
        hospital: { bestLevel: 0, totalWins: 0, currentLevel: 1, lives: 3 }
    },
    jugadasHoy: { highlow: 0, ruleta: 0, tragaperras: 0, dados: 0, ruletarusa: 0, loteria: 0, fecha: new Date().toDateString() }
};

let globalPoolData = { pool_ton: 100, total_diamonds: 0, user_rankings: [] };

const EVENTOS_SEMANALES = [
    { nombre: "Escuela", edificio: "escuela", icono: "fa-school", emoji: "🏫", color: "#fbbf24", descripcion: "Semana del Saber - Gana x2 en Escuela (x4 Premium)", recompensa: 200, premium: 400, gameMultiplier: 2 },
    { nombre: "Fábrica", edificio: "fabrica", icono: "fa-industry", emoji: "🏭", color: "#a78bfa", descripcion: "Semana de Producción - Gana x2 en Fábrica (x4 Premium)", recompensa: 150, premium: 300, gameMultiplier: 2 },
    { nombre: "Piscina", edificio: "piscina", icono: "fa-water-ladder", emoji: "🏊", color: "#38bdf8", descripcion: "Semana Olímpica - Gana x2 en Piscina (x4 Premium)", recompensa: 80, premium: 160, gameMultiplier: 2 },
    { nombre: "Hospital", edificio: "hospital", icono: "fa-hospital", emoji: "🏥", color: "#f87171", descripcion: "Semana de la Salud - Gana x2 en Hospital (x4 Premium)", recompensa: 100, premium: 200, gameMultiplier: 2 }
];

const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

let apuestaActual = { highlow: 10, ruleta: 10, tragaperras: 5, dados: 10, ruletarusa: 10, loteria: 1 };
let boletosComprados = [];

let gameLives = { escuela: 3, fabrica: 3, piscina: 3, hospital: 3 };
let gameActiveStates = { escuela: true, fabrica: true, piscina: true, hospital: true };

let escuelaSequence = [], escuelaUserInput = [], escuelaLevel = 1, escuelaBest = 0;
let fabricaLevel = 1, fabricaBest = 0, fabricaCompleted = 0, fabricaRequired = 5;
let fabricaPosition = -30, fabricaIsDefect = false, fabricaAnimInterval = null;
let piscinaLevel = 1, piscinaBest = 0, piscinaPerfect = 0, piscinaRequired = 3;
let piscinaPower = 0, piscinaHoldStart = 0, piscinaChargeInterval = null;
let hospitalLevel = 1, hospitalBest = 0, hospitalExtracted = 0, hospitalTotal = 3;
let hospitalTimeLeft = 25, hospitalTimer = null;

// ==========================================
// FUNCIONES BÁSICAS
// ==========================================
function esPremium() { return userData.premium_expires && new Date() < new Date(userData.premium_expires); }
function actualizarPremiumUI() { const b = document.getElementById('premium-badge'); if(b) b.style.display = esPremium() ? 'flex' : 'none'; }
function getEventoActual() { return EVENTOS_SEMANALES[Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % EVENTOS_SEMANALES.length]; }
function enVentanaRetiro() { return new Date().getDay() === 0; }

function actualizarEventosUI() {
    const evento = getEventoActual();
    const banner = document.getElementById('event-banner');
    if(banner) { banner.style.display = 'flex'; document.getElementById('event-banner-title').textContent = evento.nombre; document.getElementById('event-banner-subtitle').textContent = `¡x${esPremium()?4:2} en ${evento.nombre}!`; }
}

function getTotalProduction() {
    let base = (userData.lvl_escuela * 15) + (userData.lvl_fabrica * 25) + (userData.lvl_piscina * 10) + (userData.lvl_hospital * 18);
    return esPremium() ? base * 2 : base;
}

function calcularRecompensa(baseReward, building) {
    const nivel = userData[`lvl_${building}`] || 0;
    const multNivel = 1 + (nivel * 0.005);
    const multPremium = esPremium() ? 2 : 1;
    const evento = getEventoActual();
    const multEvento = (evento.edificio === building) ? (esPremium() ? 4 : 2) : 1;
    let multiplier = multNivel * multPremium * multEvento;
    if(pendingMultiplier) { multiplier *= pendingMultiplier; pendingMultiplier = null; }
    return Math.floor(baseReward * multiplier);
}

function actualizarUI() {
    document.getElementById('diamonds').textContent = Math.floor(userData.diamonds || 0);
    document.getElementById('rate').textContent = Math.floor(getTotalProduction());
    document.getElementById('lvl_piscina').textContent = userData.lvl_piscina;
    document.getElementById('lvl_fabrica').textContent = userData.lvl_fabrica;
    document.getElementById('lvl_escuela').textContent = userData.lvl_escuela;
    document.getElementById('lvl_hospital').textContent = userData.lvl_hospital;
    document.getElementById('user-display').textContent = userData.username || 'Usuario';
}

function showModal(id) { document.getElementById('overlay').style.display = 'block'; document.getElementById(id).style.display = 'block'; }

function closeAll() {
    document.getElementById('overlay').style.display = 'none';
    ['modalPerfil','modalFriends','modalRanking','modalBank','modalStore','modalCasino','modalHighLow','modalRuleta','modalTragaperras','modalDados','modalRuletaRusa','modalEscuela','modalFabrica','modalPiscina','modalHospital','modalEvent','modalDailyReward','modalAds'].forEach(id => { const m = document.getElementById(id); if(m) m.style.display = 'none'; });
    if(fabricaAnimInterval) clearInterval(fabricaAnimInterval);
    if(piscinaChargeInterval) clearInterval(piscinaChargeInterval);
    if(hospitalTimer) clearInterval(hospitalTimer);
    setActiveNav('perfil');
}

function setActiveNav(tab) {
    document.querySelectorAll('.nav-item').forEach((item, i) => item.classList.toggle('active', (tab==='perfil'&&i===0)||(tab==='amigos'&&i===1)||(tab==='ranking'&&i===2)));
}

// ==========================================
// PERFIL
// ==========================================
function openPerfil() { closeAll(); actualizarPerfil(); document.getElementById('modalPerfil').style.display='block'; document.getElementById('overlay').style.display='block'; setActiveNav('perfil'); }
function actualizarPerfil() {
    const user = tg.initDataUnsafe?.user;
    const name = user?.first_name || userData.username || 'Usuario';
    document.getElementById('perfil-name').textContent = name;
    const avatar = document.getElementById('perfil-avatar');
    if(user?.photo_url) avatar.innerHTML = `<img src="${user.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    else avatar.innerHTML = name.charAt(0).toUpperCase();
    document.getElementById('perfil-diamonds').textContent = Math.floor(userData.diamonds||0);
    document.getElementById('perfil-rate').textContent = Math.floor(getTotalProduction());
    document.getElementById('perfil-piscina').textContent = 'Nivel '+(userData.lvl_piscina||0);
    document.getElementById('perfil-fabrica').textContent = 'Nivel '+(userData.lvl_fabrica||0);
    document.getElementById('perfil-escuela').textContent = 'Nivel '+(userData.lvl_escuela||0);
    document.getElementById('perfil-hospital').textContent = 'Nivel '+(userData.lvl_hospital||0);
    document.getElementById('perfil-rango-display').textContent = userData.rank||'Ciudadano';
    document.getElementById('perfil-proyeccion').textContent = (userData.projectedReward||0).toFixed(4)+' TON';
    document.getElementById('perfil-premium').textContent = esPremium()?'Sí ⭐':'No';
    document.getElementById('perfil-rank-badge').textContent = userData.rank||'Ciudadano';
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() { closeAll(); document.getElementById('modalFriends').style.display='block'; document.getElementById('overlay').style.display='block'; document.getElementById('referral-code').textContent = userData.referral_code||'CARGANDO...'; document.getElementById('ref-count').textContent = (userData.referred_users||[]).length; document.getElementById('ref-total').textContent = (userData.referral_earnings||0)+' 💎'; setActiveNav('amigos'); }
function copyReferralCode() { if(!userData.referral_code) return alert('❌ Código no disponible'); navigator.clipboard.writeText(`https://t.me/ton_city_bot?start=${userData.referral_code}`).then(()=>alert('✅ Enlace copiado!')).catch(()=>alert('❌ Error')); }

// ==========================================
// RANKING
// ==========================================
function openRanking() { closeAll(); actualizarRankingModal(); document.getElementById('modalRanking').style.display='block'; document.getElementById('overlay').style.display='block'; setActiveNav('ranking'); }
function actualizarRankingModal() { document.getElementById('user-rank-display').textContent=userData.rank||'Ciudadano'; document.getElementById('pool-total-ranking').textContent=(globalPoolData.pool_ton||0).toFixed(4)+' TON'; document.getElementById('projected-reward-display').textContent=(userData.projectedReward||0).toFixed(4)+' TON'; }

// ==========================================
// BANCO
// ==========================================
function openBank() { closeAll(); document.getElementById('modalBank').style.display='block'; document.getElementById('overlay').style.display='block'; switchBancoTab('compra'); actualizarListaCompra(); }
function actualizarListaCompra() {
    const isConnected = tonConnectUI?.connected;
    const packs = [{ton:0.10,diamonds:100},{ton:0.50,diamonds:500},{ton:1.00,diamonds:1000},{ton:2.00,diamonds:2000},{ton:5.00,diamonds:5000},{ton:10.00,diamonds:10000}];
    document.getElementById('bankList').innerHTML = packs.map(p=>`<div style="background:#0f172a;border-radius:12px;padding:16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;"><div><strong>${p.ton.toFixed(2)} TON</strong><div style="font-size:12px;color:#94a3b8;">+${p.diamonds} 💎</div></div><button onclick="comprarTON(${p.ton})" style="background:${isConnected?'#4ade80':'#334155'};border:none;padding:10px 20px;border-radius:30px;color:white;font-weight:700;" ${!isConnected?'disabled':''}>${isConnected?'COMPRAR':'CONECTAR'}</button></div>`).join('');
}
function switchBancoTab(tab) {
    bancoTabActual=tab;
    document.querySelectorAll('.banco-tab').forEach((t,i)=>{t.classList.toggle('active',(tab==='compra'&&i===0)||(tab==='venta'&&i===1));});
    document.getElementById('banco-compra-panel').classList.toggle('hidden', tab!=='compra');
    document.getElementById('banco-venta-panel').classList.toggle('hidden', tab!=='venta');
    if(tab==='compra') actualizarListaCompra(); else actualizarPanelVenta();
}
function actualizarPanelVenta() {
    document.getElementById('venta-diamonds').textContent=Math.floor(userData.diamonds||0);
    const poolTotal=globalPoolData.pool_ton||0;
    document.getElementById('venta-pool').textContent=poolTotal.toFixed(4)+' TON';
    const tasaBase=10000; const poolFactor=Math.max(0.5,Math.min(2,poolTotal/10)); const tasaActual=Math.floor(tasaBase/poolFactor);
    window._tasaVentaActual=tasaActual;
    const tonRecibir=ventaCantidad/tasaActual;
    document.getElementById('venta-ton-recibir').textContent=tonRecibir.toFixed(4)+' TON';
    document.getElementById('venta-cantidad').textContent=ventaCantidad;
    const btn=document.getElementById('vender-btn'); const err=document.getElementById('venta-error');
    const wc=tonConnectUI?.connected||false;
    if(!wc){btn.disabled=true;err.style.display='block';err.textContent='⚠️ Conecta tu wallet (pestaña COMPRAR)';}
    else if(ventaCantidad>(userData.diamonds||0)){btn.disabled=true;err.style.display='block';err.textContent='⚠️ Sin diamantes suficientes';}
    else if(tonRecibir<1){btn.disabled=true;err.style.display='block';err.textContent='⚠️ Mínimo 1 TON';}
    else if((userData.retiradoHoy||0)+tonRecibir>5){btn.disabled=true;err.style.display='block';err.textContent='⚠️ Límite diario 5 TON';}
    else if(tonRecibir>poolTotal){btn.disabled=true;err.style.display='block';err.textContent='⚠️ Pool insuficiente';}
    else{btn.disabled=false;err.style.display='none';}
}
function cambiarVentaDiamonds(d){ventaCantidad=Math.max(100,Math.min(userData.diamonds||0,ventaCantidad+d));actualizarPanelVenta();}
async function venderDiamantes() {
    const tasa=window._tasaVentaActual||10000; const tonRecibir=ventaCantidad/tasa;
    if(!tonConnectUI?.connected) return alert('Conecta wallet'); if(tonRecibir<1) return alert('Mínimo 1 TON');
    if((userData.retiradoHoy||0)+tonRecibir>5) return alert('Límite 5 TON/día'); if(tonRecibir>(globalPoolData.pool_ton||0)) return alert('Pool insuficiente');
    if(!confirm(`¿Cambiar ${ventaCantidad} 💎 por ${tonRecibir.toFixed(4)} TON?`)) return;
    try{const tx={validUntil:Math.floor(Date.now()/1000)+300,messages:[{address:currentWallet.account.address,amount:Math.floor((tonRecibir-RED_TON_FEE)*1e9).toString()}]};await tonConnectUI.sendTransaction(tx);userData.diamonds-=ventaCantidad;userData.retiradoHoy=(userData.retiradoHoy||0)+tonRecibir;globalPoolData.pool_ton-=tonRecibir;await saveUserData();ventaCantidad=100;actualizarPanelVenta();actualizarUI();alert(`✅ ${tonRecibir.toFixed(4)} TON enviados`);}catch(e){alert('❌ Error');}
}
async function comprarTON(tonAmount){
    if(!tonConnectUI?.connected) return alert('❌ Conecta wallet');
    try{const tx={validUntil:Math.floor(Date.now()/1000)+300,messages:[{address:BILLETERA_PROPIETARIO,amount:Math.floor(tonAmount*1e9).toString()}]};await tonConnectUI.sendTransaction(tx);let c=Math.floor(tonAmount/PRECIO_COMPRA);if(c<100)c=100;userData.diamonds+=c;if(!userData.haInvertido)userData.haInvertido=true;await saveUserData();actualizarUI();alert(`✅ +${c} 💎`);closeAll();}catch(e){alert('❌ Cancelado');}
}

// ==========================================
// TON CONNECT
// ==========================================
async function initTONConnect(){
    try{tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',buttonRootId:'ton-connect-button',uiPreferences:{theme:'DARK'}});tonConnectUI.onStatusChange((w)=>{currentWallet=w;const bd=document.getElementById('ton-connect-button');const wi=document.getElementById('wallet-info');if(w){if(bd)bd.style.display='none';if(wi)wi.classList.remove('hidden');}else{if(bd)bd.style.display='block';if(wi)wi.classList.add('hidden');}if(document.getElementById('modalBank')?.style.display==='block'){if(bancoTabActual==='compra')actualizarListaCompra();else actualizarPanelVenta();}});}catch(e){}
}
async function disconnectWallet(){if(tonConnectUI)await tonConnectUI.disconnect();currentWallet=null;document.getElementById('ton-connect-button').style.display='block';document.getElementById('wallet-info').classList.add('hidden');actualizarListaCompra();}

// ==========================================
// TIENDA PREMIUM
// ==========================================
function openStore(){closeAll();document.getElementById('modalStore').style.display='block';document.getElementById('overlay').style.display='block';const ic=tonConnectUI?.connected;document.getElementById('premium-plans').innerHTML=PREMIUM_PLANS.map(p=>`<div style="background:#0f172a;border-radius:16px;padding:16px;margin:10px 0;"><div style="display:flex;justify-content:space-between;margin-bottom:10px;"><strong>${p.name}</strong><span style="color:#facc15;">${p.price} TON</span></div><button onclick="comprarPremium(${p.days})" style="background:${ic?'#8b5cf6':'#334155'};border:none;border-radius:30px;padding:12px;width:100%;color:white;font-weight:700;" ${!ic?'disabled':''}>${ic?'COMPRAR':'CONECTAR'}</button></div>`).join('');}
async function comprarPremium(days){
    if(!tonConnectUI?.connected) return alert('❌ Conecta wallet');
    const plan=PREMIUM_PLANS.find(p=>p.days===days); if(!plan) return;
    try{const tx={validUntil:Math.floor(Date.now()/1000)+300,messages:[{address:BILLETERA_PROPIETARIO,amount:Math.floor(plan.price*1e9).toString()}]};await tonConnectUI.sendTransaction(tx);const exp=new Date();exp.setDate(exp.getDate()+days);userData.premium_expires=exp.toISOString();await saveUserData();actualizarPremiumUI();actualizarUI();alert(`✅ Premium ${plan.name}!`);closeAll();}catch(e){alert('❌ Cancelado');}
}

// ==========================================
// ADSGRAM Y ANUNCIOS
// ==========================================
async function initAds(){try{AdController=window.Adsgram.init({blockId:ADSGRAM_BLOCK_ID});adsReady=true;}catch(e){}}
function showRewardedAd(cb){if(esPremium()){cb(true);return;}if(!adsReady||!AdController){alert("📺 No disponible");cb(false);return;}AdController.show().then(r=>cb(r.done===true)).catch(()=>cb(false));}
function showAdsModal(){closeAll();document.getElementById('modalAds').style.display='block';document.getElementById('overlay').style.display='block';actualizarEstadoAnuncio();}
function actualizarEstadoAnuncio(){
    const puede=(!userData.last_ad_watch||(new Date()-new Date(userData.last_ad_watch))>3600000);
    const btn=document.getElementById('watch-ad-btn'); const sd=document.getElementById('ads-status');
    if(!btn)return;
    if(esPremium()){btn.disabled=true;btn.textContent='⭐ PREMIUM';if(sd)sd.innerHTML='⭐ Sin anuncios';return;}
    if(puede&&adsReady){btn.disabled=false;btn.textContent='VER ANUNCIO +20 💎';if(sd)sd.innerHTML='✅ Disponible';}
    else{btn.disabled=true;const r=userData.last_ad_watch?Math.ceil((3600000-(new Date()-new Date(userData.last_ad_watch)))/60000):60;btn.textContent=`⏳ ${r} min`;if(sd)sd.innerHTML=`⏳ ${r} min`;}
}
function showAd(){if(esPremium()){userData.diamonds+=20;saveUserData();actualizarUI();alert('⭐ +20 💎');closeAll();return;}showRewardedAd(s=>{if(s){userData.diamonds+=20;userData.last_ad_watch=new Date().toISOString();saveUserData();actualizarUI();alert('🎁 +20 💎');closeAll();}});}
function rescueWithAd(){if(esPremium()){userData.diamonds+=50;actualizarUI();return;}if(userData.diamonds>0)return alert("Solo con 0 💎");const hoy=new Date();if(userData.last_casino_rescue&&hoy.toDateString()===new Date(userData.last_casino_rescue).toDateString())return alert("Ya usaste rescate hoy");showRewardedAd(s=>{if(s){userData.diamonds+=50;userData.last_casino_rescue=new Date().toISOString();saveUserData();actualizarUI();alert('🎁 +50 💎');}});}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day){if(day<=0)return 0;if(day>=30)return esPremium()?300:150;let b=5+(day-1)*3;if(b>150)b=150;return esPremium()?b*2:b;}
function puedeReclamarDiaria(){if(!userData.last_daily_claim)return true;const u=new Date(userData.last_daily_claim);const h=new Date();u.setHours(0,0,0,0);h.setHours(0,0,0,0);return h>u;}
function openDailyReward(){
    closeAll();const racha=userData.daily_streak||0;const dia=Math.min(racha+1,30);document.getElementById('current-day').textContent=dia;document.getElementById('today-reward').textContent=getDailyRewardAmount(dia)+' 💎';
    const puede=puedeReclamarDiaria();document.getElementById('daily-status').innerHTML=puede?'✅ ¡Disponible!':'⏳ Vuelve mañana';
    let h='';for(let i=1;i<=30;i++){let c='daily-day';if(i<=racha)c+=' completed';else if(i===racha+1&&puede)c+=' current';h+=`<div class="${c}"><div>D${i}</div><div>${getDailyRewardAmount(i)}</div></div>`;}
    document.getElementById('daily-calendar').innerHTML=h;document.getElementById('modalDailyReward').style.display='block';document.getElementById('overlay').style.display='block';
}
async function claimDailyReward(){
    if(!userData.id)return alert("❌ Error");if(!puedeReclamarDiaria())return alert("❌ Ya reclamaste");
    let nd=1;if(userData.last_daily_claim&&userData.daily_streak>0){const dh=(new Date()-new Date(userData.last_daily_claim))/(3600000);if(dh<48)nd=userData.daily_streak+1;}if(nd>30)nd=30;
    const r=getDailyRewardAmount(nd);userData.diamonds+=r;userData.daily_streak=nd;userData.last_daily_claim=new Date().toISOString();
    await saveUserData();actualizarUI();alert(`✅ +${r} 💎 Día ${nd}/30`);closeAll();
}

// ==========================================
// EVENTO SEMANAL
// ==========================================
function openEventModal(){
    closeAll();const e=getEventoActual();document.getElementById('event-emoji').textContent=e.emoji;document.getElementById('event-titulo').textContent=e.nombre;document.getElementById('event-description').textContent=e.descripcion;
    document.getElementById('modalEvent').style.display='block';document.getElementById('overlay').style.display='block';
}
function startEventTask(){closeAll();const e=getEventoActual();openBuilding(e.edificio);}

// ==========================================
// CASINO
// ==========================================
function openCasino(){closeAll();document.getElementById('modalCasino').style.display='block';document.getElementById('overlay').style.display='block';document.getElementById('casino-saldo').textContent=Math.floor(userData.diamonds);document.getElementById('casino-rescue').style.display=(userData.diamonds<=0&&!esPremium())?'block':'none';}
function abrirJuego(j){
    closeAll();let m='';
    switch(j){case'highlow':m='modalHighLow';break;case'ruleta':m='modalRuleta';break;case'tragaperras':m='modalTragaperras';break;case'dados':m='modalDados';break;case'ruletarusa':m='modalRuletaRusa';break;}
    if(m){document.getElementById(m).style.display='block';document.getElementById('overlay').style.display='block';
        const balId=j+'-balance';const balEl=document.getElementById(balId);if(balEl)balEl.textContent=Math.floor(userData.diamonds);
        if(j==='ruletarusa'){crearCamarasRuletaRusa();document.getElementById('ruletarusa-result').innerHTML='';document.getElementById('ruletarusa-emoji').textContent='🔫';}
    }
}
function cerrarJuego(){closeAll();openCasino();}
function cambiarApuesta(juego,delta){apuestaActual[juego]=Math.max(1,Math.min(1000,apuestaActual[juego]+delta));document.getElementById(juego+'-bet-display').textContent=apuestaActual[juego];document.getElementById(juego+'-bet').textContent=apuestaActual[juego]+' 💎';}
function puedeJugar(juego,c=1){if(userData.haInvertido)return true;const hoy=new Date().toDateString();if(userData.jugadasHoy.fecha!==hoy){userData.jugadasHoy={highlow:0,ruleta:0,tragaperras:0,dados:0,ruletarusa:0,loteria:0,fecha:hoy};}const lim={highlow:20,ruleta:15,tragaperras:30,dados:20,ruletarusa:10,loteria:5};return(userData.jugadasHoy[juego]+c)<=lim[juego];}
function registrarJugada(juego,c=1){if(!userData.haInvertido)userData.jugadasHoy[juego]+=c;}

function jugarHighLow(el){const a=apuestaActual.highlow;if(userData.diamonds<a)return alert('❌ Sin 💎');if(!puedeJugar('highlow'))return alert('❌ Límite');userData.diamonds-=a;registrarJugada('highlow');const n=Math.floor(Math.random()*10000);const g=(el==='low'&&n<5000)||(el==='high'&&n>=5000);document.getElementById('hl-number').textContent=n.toString().padStart(4,'0');if(g){userData.diamonds+=a*2;document.getElementById('hl-result').innerHTML='<span style="color:#4ade80;font-size:20px;">🎉 +'+(a*2)+' 💎</span>';}else{document.getElementById('hl-result').innerHTML='<span style="color:#ef4444;">😞 Perdiste</span>';}actualizarUI();saveUserData();}
function jugarRuleta(tipo){const a=apuestaActual.ruleta;if(userData.diamonds<a)return alert('❌ Sin 💎');if(!puedeJugar('ruleta'))return alert('❌ Límite');userData.diamonds-=a;registrarJugada('ruleta');let n=Math.random()<0.03?0:Math.floor(Math.random()*37);document.getElementById('ruleta-number').textContent=n;let g=false;switch(tipo){case'rojo':g=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n);break;case'negro':g=[2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(n);break;case'par':g=n!==0&&n%2===0;break;case'impar':g=n%2===1;break;case'bajo':g=n>=1&&n<=18;break;case'alto':g=n>=19&&n<=36;break;case'numero':const nu=parseInt(prompt("0-36:"));if(isNaN(nu)||nu<0||nu>36){userData.diamonds+=a;actualizarUI();return;}g=n===nu;break;}let gan=(tipo==='numero'&&g)?a*36:a*2;if(g){userData.diamonds+=gan;document.getElementById('ruleta-result').innerHTML='<span style="color:#4ade80;font-size:20px;">🎉 +'+gan+' 💎</span>';}else{document.getElementById('ruleta-result').innerHTML='<span style="color:#ef4444;">😞 Perdiste</span>';}actualizarUI();saveUserData();}
function jugarTragaperras(){const a=apuestaActual.tragaperras;if(userData.diamonds<a)return alert('❌ Sin 💎');if(!puedeJugar('tragaperras'))return alert('❌ Límite');userData.diamonds-=a;registrarJugada('tragaperras');document.querySelectorAll('.slot').forEach(s=>s.classList.add('spinning'));setTimeout(()=>{const sim=[{n:"💎",m:30},{n:"₿",m:15},{n:"Ξ",m:8},{n:"🪙",m:3},{n:"📈",m:2},{n:"📉",m:2}];const r=[];for(let i=0;i<3;i++){const ra=Math.random()*100;let ac=0;for(const s of sim){ac+=18;if(ra<ac){r.push(s);break;}}}document.getElementById('slot1').textContent=r[0].n;document.getElementById('slot2').textContent=r[1].n;document.getElementById('slot3').textContent=r[2].n;document.querySelectorAll('.slot').forEach(s=>s.classList.remove('spinning'));if(r[0].n===r[1].n&&r[1].n===r[2].n){let m=r[0].m;if(esPremium())m*=2;userData.diamonds+=a*m;document.getElementById('tragaperras-result').innerHTML='<span style="color:#4ade80;font-size:20px;">🎉 JACKPOT x'+m+'! +'+(a*m)+' 💎</span>';}else{document.getElementById('tragaperras-result').innerHTML='<span style="color:#ef4444;">😞 Perdiste</span>';}actualizarUI();saveUserData();},400);}
function jugarDados(el){const a=apuestaActual.dados;if(userData.diamonds<a)return alert('❌ Sin 💎');if(!puedeJugar('dados'))return alert('❌ Límite');userData.diamonds-=a;registrarJugada('dados');const d1=Math.floor(Math.random()*6)+1;const d2=Math.floor(Math.random()*6)+1;const ca=['⚀','⚁','⚂','⚃','⚄','⚅'];document.getElementById('dado1').classList.add('rolling');document.getElementById('dado2').classList.add('rolling');setTimeout(()=>{document.getElementById('dado1').textContent=ca[d1-1];document.getElementById('dado2').textContent=ca[d2-1];document.getElementById('dado1').classList.remove('rolling');document.getElementById('dado2').classList.remove('rolling');const s=d1+d2;document.getElementById('dados-suma').textContent=`Suma: ${s}`;let g=(el==='menor'&&s>=2&&s<=6)||(el==='mayor'&&s>=8&&s<=12)||(el==='exacto'&&s===7);if(g){let gan=el==='exacto'?a*5:a*2;if(esPremium())gan*=2;userData.diamonds+=gan;document.getElementById('dados-result').innerHTML='<span style="color:#4ade80;font-size:20px;">🎉 +'+gan+' 💎</span>';}else{document.getElementById('dados-result').innerHTML='<span style="color:#ef4444;">😞 Perdiste</span>';}actualizarUI();saveUserData();},400);}

// Ruleta Rusa
function crearCamarasRuletaRusa(){const g=document.getElementById('ruletarusa-camaras');if(!g)return;g.innerHTML='';for(let i=1;i<=6;i++){const b=document.createElement('button');b.textContent=i;b.style.cssText='background:var(--bg-elevated);border:2px solid #ef4444;border-radius:16px;padding:16px;color:white;font-weight:700;font-size:20px;cursor:pointer;';b.onclick=()=>jugarRuletaRusa(i);g.appendChild(b);}}
function jugarRuletaRusa(camara){const a=apuestaActual.ruletarusa;if(userData.diamonds<a)return alert('❌ Sin 💎');if(!puedeJugar('ruletarusa'))return alert('❌ Límite');userData.diamonds-=a;registrarJugada('ruletarusa');const bala=Math.floor(Math.random()*6)+1;const g=camara!==bala;document.getElementById('ruletarusa-emoji').textContent=g?'🎉':'💥';if(g){const gan=a*3;userData.diamonds+=gan;document.getElementById('ruletarusa-result').innerHTML='<span style="color:#4ade80;font-size:20px;">🎉 ¡SOBREVIVISTE! +'+gan+' 💎</span>';}else{document.getElementById('ruletarusa-result').innerHTML='<span style="color:#ef4444;font-size:20px;">💥 La bala estaba en '+bala+'</span>';}actualizarUI();saveUserData();crearCamarasRuletaRusa();}

// ==========================================
// EDIFICIOS Y MEJORAS
// ==========================================
function openBuilding(b){closeAll();const mid='modal'+b.charAt(0).toUpperCase()+b.slice(1);document.getElementById(mid).style.display='block';document.getElementById('overlay').style.display='block';actualizarPanelMejora(b);if(b==='escuela')iniciarJuegoEscuela();else if(b==='fabrica')iniciarJuegoFabrica();else if(b==='piscina')iniciarJuegoPiscina();else if(b==='hospital')iniciarJuegoHospital();}
function actualizarPanelMejora(b){const l=userData[`lvl_${b}`]||0;const prod={escuela:15,fabrica:25,piscina:10,hospital:18};const prec={escuela:500,fabrica:1500,piscina:800,hospital:1200};const p=Math.floor(prec[b]*Math.pow(1.12,l));document.getElementById(b+'-level').textContent=l;document.getElementById(b+'-prod').textContent=(l*prod[b])+' 💎/h';document.getElementById(b+'-price').textContent=p.toLocaleString()+' 💎';const btn=document.getElementById(b+'-btn');if(btn){btn.disabled=userData.diamonds<p;btn.textContent=userData.diamonds<p?'💎 INSUFICIENTE':'MEJORAR ('+p.toLocaleString()+' 💎)';}}
function buyUpgrade(b){const prec={escuela:500,fabrica:1500,piscina:800,hospital:1200};const l=userData[`lvl_${b}`]||0;const p=Math.floor(prec[b]*Math.pow(1.12,l));if(userData.diamonds<p)return alert('❌ Sin 💎');userData[`lvl_${b}`]++;userData.diamonds-=p;saveUserData();actualizarUI();actualizarPanelMejora(b);alert(`✅ ${b} nivel ${userData[`lvl_${b}`]}!`);}
function switchTab(b,t){const up=document.getElementById(b+'-upgrade-panel');const gp=document.getElementById(b+'-game-panel');const tabs=document.querySelectorAll('#modal'+b.charAt(0).toUpperCase()+b.slice(1)+' .tab');if(t==='game'){up.classList.add('hidden');gp.classList.remove('hidden');tabs[0].classList.remove('active');tabs[1].classList.add('active');}else{up.classList.remove('hidden');gp.classList.add('hidden');tabs[0].classList.add('active');tabs[1].classList.remove('active');}}

// ==========================================
// SISTEMA DE VIDAS
// ==========================================
function updateLivesUI(g){const c=document.getElementById(g+'-lives');if(!c)return;c.innerHTML='';for(let i=0;i<3;i++){const d=document.createElement('div');d.className='life'+(i<gameLives[g]?' active':'');d.innerHTML=i<gameLives[g]?'❤️':'🖤';c.appendChild(d);}const rb=document.getElementById(g+'-revive');if(rb)rb.style.display=gameLives[g]===0?'block':'none';}
function loseLife(g){gameLives[g]--;updateLivesUI(g);if(gameLives[g]===0){gameActiveStates[g]=false;const ri=(g==='escuela'?'mem':g==='fabrica'?'asm':g==='piscina'?'jump':'surgery');const re=document.getElementById(ri+'-result');if(re)re.innerHTML='<span style="color:#ef4444;font-size:20px;">💀 GAME OVER</span>';return false;}return true;}
function reviveGame(g){if(gameLives[g]>0)return;showRewardedAd(s=>{if(s){gameLives[g]=3;gameActiveStates[g]=true;updateLivesUI(g);if(g==='escuela')iniciarJuegoEscuela();else if(g==='fabrica')iniciarJuegoFabrica();else if(g==='piscina')iniciarJuegoPiscina();else if(g==='hospital')iniciarJuegoHospital();alert('❤️ Revivido!');saveUserData();}});}

// ==========================================
// MINIJUEGO 1: ESCUELA
// ==========================================
function iniciarJuegoEscuela(){gameActiveStates.escuela=true;escuelaLevel=userData.gameStats.escuela.currentLevel||1;escuelaBest=userData.gameStats.escuela.bestLevel||0;gameLives.escuela=userData.gameStats.escuela.lives||3;updateLivesUI('escuela');document.getElementById('mem-level').textContent=escuelaLevel;document.getElementById('mem-best').textContent=escuelaBest;document.getElementById('escuela-game-level').textContent=escuelaLevel;document.getElementById('mem-result').innerHTML='';nuevaSecuenciaEscuela();}
function nuevaSecuenciaEscuela(){if(!gameActiveStates.escuela)return;escuelaSequence=[];escuelaUserInput=[];const len=Math.min(3+Math.floor(escuelaLevel/20),10);for(let i=0;i<len;i++)escuelaSequence.push(Math.floor(Math.random()*16)+1);mostrarSecuenciaEscuela();}
function mostrarSecuenciaEscuela(){const d=document.getElementById('sequence-display');if(!d)return;d.innerHTML='';document.getElementById('pupitres-grid').innerHTML='';let i=0;function sn(){if(i>=escuelaSequence.length){crearPupitres();return;}d.innerHTML='';const c=document.createElement('div');c.className='sequence-card highlight';c.textContent=escuelaSequence[i];d.appendChild(c);i++;setTimeout(sn,500);}sn();}
function crearPupitres(){const g=document.getElementById('pupitres-grid');if(!g)return;g.innerHTML='';for(let i=1;i<=16;i++){const b=document.createElement('div');b.className='pupitre';b.textContent=i;b.onclick=()=>seleccionarPupitre(i);g.appendChild(b);}}
function seleccionarPupitre(n){if(!gameActiveStates.escuela)return;escuelaUserInput.push(n);const idx=escuelaUserInput.length-1;const pups=document.querySelectorAll('.pupitre');if(pups[n-1]){pups[n-1].style.background='linear-gradient(145deg,var(--color-escuela),#d97706)';setTimeout(()=>{if(pups[n-1])pups[n-1].style.background='';},200);}if(escuelaUserInput[idx]!==escuelaSequence[idx]){if(!loseLife('escuela'))return;escuelaUserInput=[];document.getElementById('mem-result').innerHTML='<span style="color:#ef4444;">❌ Incorrecto</span>';setTimeout(()=>nuevaSecuenciaEscuela(),1500);return;}if(escuelaUserInput.length===escuelaSequence.length){const r=calcularRecompensa(5,'escuela');userData.diamonds+=r;escuelaLevel++;if(escuelaLevel>escuelaBest){escuelaBest=escuelaLevel;userData.gameStats.escuela.bestLevel=escuelaBest;document.getElementById('mem-best').textContent=escuelaBest;}userData.gameStats.escuela.currentLevel=escuelaLevel;userData.gameStats.escuela.lives=gameLives.escuela;document.getElementById('mem-level').textContent=escuelaLevel;document.getElementById('escuela-game-level').textContent=escuelaLevel;document.getElementById('mem-result').innerHTML='<span style="color:#4ade80;font-size:18px;">✅ +'+r+' 💎</span>';actualizarUI();actualizarPanelMejora('escuela');saveUserData();setTimeout(()=>{document.getElementById('mem-result').innerHTML='';nuevaSecuenciaEscuela();},2000);}}

// ==========================================
// MINIJUEGO 2: FÁBRICA
// ==========================================
function iniciarJuegoFabrica(){gameActiveStates.fabrica=true;fabricaLevel=userData.gameStats.fabrica.currentLevel||1;fabricaBest=userData.gameStats.fabrica.bestLevel||0;fabricaCompleted=0;fabricaRequired=Math.min(3+Math.floor(fabricaLevel/25),15);gameLives.fabrica=userData.gameStats.fabrica.lives||3;updateLivesUI('fabrica');document.getElementById('asm-completed').textContent=fabricaCompleted;document.getElementById('asm-required').textContent=fabricaRequired;document.getElementById('asm-best').textContent=fabricaBest;document.getElementById('fabrica-game-level').textContent=fabricaLevel;document.getElementById('asm-result').innerHTML='';iniciarCinta();}
function iniciarCinta(){if(fabricaAnimInterval)clearInterval(fabricaAnimInterval);fabricaPosition=-30;fabricaIsDefect=Math.random()<Math.min(0.25,fabricaLevel/200);const p=document.getElementById('moving-piece');if(p){p.textContent=fabricaIsDefect?'💢':'🔧';p.style.left=fabricaPosition+'%';}const sp=Math.max(1.2,6-Math.floor(fabricaLevel/80));fabricaAnimInterval=setInterval(()=>{if(!gameActiveStates.fabrica)return;fabricaPosition+=sp;if(fabricaPosition>130){if(!fabricaIsDefect){if(!loseLife('fabrica')){clearInterval(fabricaAnimInterval);return;}}fabricaPosition=-30;fabricaIsDefect=Math.random()<Math.min(0.25,fabricaLevel/200);const pi=document.getElementById('moving-piece');if(pi){pi.textContent=fabricaIsDefect?'💢':'🔧';pi.style.left=fabricaPosition+'%';}}const pi=document.getElementById('moving-piece');if(pi)pi.style.left=fabricaPosition+'%';},30);}
function checkFabricaHit(){if(!gameActiveStates.fabrica)return;if(fabricaPosition>25&&fabricaPosition<75){if(fabricaIsDefect){if(!loseLife('fabrica'))return;document.getElementById('asm-result').innerHTML='<span style="color:#ef4444;">⚠️ Defectuosa!</span>';}else{fabricaCompleted++;document.getElementById('asm-completed').textContent=fabricaCompleted;document.getElementById('asm-result').innerHTML='<span style="color:#4ade80;">✅ +1</span>';if(fabricaCompleted>=fabricaRequired){const r=calcularRecompensa(8,'fabrica');userData.diamonds+=r;fabricaLevel++;if(fabricaLevel>fabricaBest){fabricaBest=fabricaLevel;userData.gameStats.fabrica.bestLevel=fabricaBest;document.getElementById('asm-best').textContent=fabricaBest;}userData.gameStats.fabrica.currentLevel=fabricaLevel;userData.gameStats.fabrica.lives=gameLives.fabrica;document.getElementById('fabrica-game-level').textContent=fabricaLevel;document.getElementById('asm-result').innerHTML='<span style="color:#4ade80;font-size:18px;">✅ +'+r+' 💎</span>';actualizarUI();actualizarPanelMejora('fabrica');saveUserData();clearInterval(fabricaAnimInterval);setTimeout(()=>iniciarJuegoFabrica(),2000);return;}}}else{if(!loseLife('fabrica'))return;document.getElementById('asm-result').innerHTML='<span style="color:#ef4444;">❌ Fallaste!</span>';}setTimeout(()=>{document.getElementById('asm-result').innerHTML='';fabricaPosition=-30;fabricaIsDefect=Math.random()<Math.min(0.25,fabricaLevel/200);const pi=document.getElementById('moving-piece');if(pi){pi.textContent=fabricaIsDefect?'💢':'🔧';pi.style.left=fabricaPosition+'%';}},800);}

// ==========================================
// MINIJUEGO 3: PISCINA
// ==========================================
function iniciarJuegoPiscina(){gameActiveStates.piscina=true;piscinaLevel=userData.gameStats.piscina.currentLevel||1;piscinaBest=userData.gameStats.piscina.bestLevel||0;piscinaPerfect=0;piscinaRequired=Math.min(3+Math.floor(piscinaLevel/40),8);gameLives.piscina=userData.gameStats.piscina.lives||3;updateLivesUI('piscina');document.getElementById('jump-perfect').textContent=piscinaPerfect;document.getElementById('jump-required').textContent=piscinaRequired;document.getElementById('jump-best').textContent=piscinaBest;document.getElementById('piscina-game-level').textContent=piscinaLevel;document.getElementById('jump-result').innerHTML='';piscinaPower=0;piscinaHoldStart=0;document.getElementById('power-fill').style.width='0%';}
function startSlingshot(e){if(!gameActiveStates.piscina)return;e.preventDefault();piscinaHoldStart=Date.now();if(piscinaChargeInterval)clearInterval(piscinaChargeInterval);piscinaChargeInterval=setInterval(()=>{const elapsed=Date.now()-piscinaHoldStart;piscinaPower=Math.min(100,elapsed/15);document.getElementById('power-fill').style.width=piscinaPower+'%';},30);}
function releaseSlingshot(){if(!gameActiveStates.piscina||piscinaHoldStart===0)return;if(piscinaChargeInterval)clearInterval(piscinaChargeInterval);const hold=Date.now()-piscinaHoldStart;piscinaPower=Math.min(100,hold/15);piscinaHoldStart=0;document.getElementById('power-fill').style.width='0%';const isPerfect=piscinaPower>38&&piscinaPower<62;if(isPerfect){piscinaPerfect++;document.getElementById('jump-perfect').textContent=piscinaPerfect;document.getElementById('jump-result').innerHTML='<span style="color:#4ade80;">🎯 Perfecto!</span>';if(piscinaPerfect>=piscinaRequired){const r=calcularRecompensa(6,'piscina');userData.diamonds+=r;piscinaLevel++;if(piscinaLevel>piscinaBest){piscinaBest=piscinaLevel;userData.gameStats.piscina.bestLevel=piscinaBest;document.getElementById('jump-best').textContent=piscinaBest;}userData.gameStats.piscina.currentLevel=piscinaLevel;userData.gameStats.piscina.lives=gameLives.piscina;document.getElementById('piscina-game-level').textContent=piscinaLevel;document.getElementById('jump-result').innerHTML='<span style="color:#4ade80;font-size:18px;">✅ +'+r+' 💎</span>';piscinaPerfect=0;document.getElementById('jump-perfect').textContent='0';actualizarUI();actualizarPanelMejora('piscina');saveUserData();setTimeout(()=>iniciarJuegoPiscina(),2000);}}else{loseLife('piscina');document.getElementById('jump-result').innerHTML='<span style="color:#ef4444;">💧 '+Math.floor(piscinaPower)+'%</span>';}piscinaPower=0;setTimeout(()=>{document.getElementById('jump-result').innerHTML='';},1500);}

// ==========================================
// MINIJUEGO 4: HOSPITAL
// ==========================================
function iniciarJuegoHospital(){gameActiveStates.hospital=true;hospitalLevel=userData.gameStats.hospital.currentLevel||1;hospitalBest=userData.gameStats.hospital.bestLevel||0;hospitalExtracted=0;hospitalTotal=Math.min(3+Math.floor(hospitalLevel/40),8);gameLives.hospital=userData.gameStats.hospital.lives||3;updateLivesUI('hospital');document.getElementById('virus-extracted').textContent=hospitalExtracted;document.getElementById('virus-total').textContent=hospitalTotal;document.getElementById('surgery-best').textContent=hospitalBest;document.getElementById('hospital-game-level').textContent=hospitalLevel;document.getElementById('surgery-result').innerHTML='';hospitalTimeLeft=20+Math.floor(hospitalLevel/15);document.getElementById('time-fill').style.width='100%';if(hospitalTimer)clearInterval(hospitalTimer);hospitalTimer=setInterval(()=>{if(!gameActiveStates.hospital)return;hospitalTimeLeft-=0.1;document.getElementById('time-fill').style.width=Math.max(0,(hospitalTimeLeft/(20+Math.floor(hospitalLevel/15)))*100)+'%';if(hospitalTimeLeft<=0){clearInterval(hospitalTimer);loseLife('hospital');document.getElementById('surgery-result').innerHTML='<span style="color:#ef4444;">⏰ Tiempo!</span>';setTimeout(()=>iniciarJuegoHospital(),2000);}},100);crearVirusHospital();}
function crearVirusHospital(){const a=document.getElementById('surgery-area');if(!a)return;a.innerHTML='';const cols=['🦠','🦠','🦠','🦠','🦠'];for(let i=0;i<hospitalTotal;i++){const v=document.createElement('div');v.className='virus-sprite';v.textContent=cols[i%cols.length];v.style.left=(8+Math.random()*78)+'%';v.style.top=(8+Math.random()*78)+'%';v.style.animationDelay=(Math.random()*2)+'s';v.onclick=function(e){e.stopPropagation();if(!gameActiveStates.hospital)return;hospitalExtracted++;document.getElementById('virus-extracted').textContent=hospitalExtracted;v.style.transform='scale(0)';v.style.opacity='0';setTimeout(()=>v.remove(),200);if(hospitalExtracted>=hospitalTotal){clearInterval(hospitalTimer);const r=calcularRecompensa(7,'hospital');userData.diamonds+=r;hospitalLevel++;if(hospitalLevel>hospitalBest){hospitalBest=hospitalLevel;userData.gameStats.hospital.bestLevel=hospitalBest;document.getElementById('surgery-best').textContent=hospitalBest;}userData.gameStats.hospital.currentLevel=hospitalLevel;userData.gameStats.hospital.lives=gameLives.hospital;document.getElementById('hospital-game-level').textContent=hospitalLevel;document.getElementById('surgery-result').innerHTML='<span style="color:#4ade80;font-size:18px;">✅ +'+r+' 💎</span>';actualizarUI();actualizarPanelMejora('hospital');saveUserData();setTimeout(()=>iniciarJuegoHospital(),2000);}};a.appendChild(v);}}

// ==========================================
// RANKING Y POOL
// ==========================================
async function updateRankingAndPool(){
    try{const{data,error}=await _supabase.from('game_data').select('telegram_id,diamonds').neq('telegram_id','MASTER');if(!error&&data){globalPoolData.user_rankings=data.map(u=>({id:u.telegram_id,diamonds:Number(u.diamonds)||0})).sort((a,b)=>b.diamonds-a.diamonds);}
    const pos=globalPoolData.user_rankings.findIndex(u=>u.id===userData.id);if(pos!==-1){if(pos<3)userData.rank="Diamante";else if(pos<10)userData.rank="Oro";else if(pos<50)userData.rank="Plata";else userData.rank="Ciudadano";userData.weekly_rank=pos+1;}
    const pu=globalPoolData.pool_ton*0.8*RESERVA_POOL;if(pos<3)userData.projectedReward=(pu*0.4)/3;else if(pos<10)userData.projectedReward=(pu*0.25)/7;else if(pos<50)userData.projectedReward=(pu*0.20)/40;else{const ci=globalPoolData.user_rankings.slice(50);const td=ci.reduce((s,u)=>s+u.diamonds,0);if(td>0&&userData.diamonds>0)userData.projectedReward=(pu*0.15)*(userData.diamonds/td);}}catch(e){}
}
async function updateRealPoolBalance(){try{const r=await fetch(`https://tonapi.io/v2/accounts/${BILLETERA_POOL}`,{headers:{'Authorization':`Bearer ${TON_API_KEY}`}});if(r.ok){const d=await r.json();globalPoolData.pool_ton=(d.balance||0)/1e9;}}catch(e){}}

// ==========================================
// GUARDADO SUPABASE
// ==========================================
async function saveUserData(){
    if(!userData.id)return;
    try{await _supabase.from('game_data').update({diamonds:Math.floor(userData.diamonds),lvl_piscina:userData.lvl_piscina,lvl_fabrica:userData.lvl_fabrica,lvl_escuela:userData.lvl_escuela,lvl_hospital:userData.lvl_hospital,last_online:new Date().toISOString(),premium_expires:userData.premium_expires,daily_streak:userData.daily_streak,last_daily_claim:userData.last_daily_claim,haInvertido:userData.haInvertido,event_progress:userData.event_progress||{},accumulated_ton:userData.accumulated_ton||0,retiradoHoy:userData.retiradoHoy||0,gameStats:userData.gameStats,referral_earnings:userData.referral_earnings||0,last_ad_watch:userData.last_ad_watch,last_casino_rescue:userData.last_casino_rescue}).eq('telegram_id',userData.id);console.log('💾 Guardado');}catch(e){console.error(e);}
}
async function loadUserFromDB(tgId){
    const{data,error}=await _supabase.from('game_data').select('*').eq('telegram_id',tgId.toString()).maybeSingle();
    if(error){console.error(error);return;}
    if(!data){
        const n={telegram_id:tgId.toString(),username:userData.username,diamonds:0,lvl_piscina:0,lvl_fabrica:0,lvl_escuela:0,lvl_hospital:0,referral_code:'REF'+tgId.toString().slice(-6),last_online:new Date().toISOString(),haInvertido:false,event_progress:{},accumulated_ton:0,retiradoHoy:0,gameStats:{escuela:{bestLevel:0,totalWins:0,currentLevel:1,lives:3},fabrica:{bestLevel:0,totalWins:0,currentLevel:1,lives:3},piscina:{bestLevel:0,totalWins:0,currentLevel:1,lives:3},hospital:{bestLevel:0,totalWins:0,currentLevel:1,lives:3}}};
        await _supabase.from('game_data').insert([n]);userData={...userData,...n,id:tgId.toString()};
    }else{
        userData={...userData,...data,id:tgId.toString(),diamonds:Number(data.diamonds)||0,lvl_piscina:Number(data.lvl_piscina)||0,lvl_fabrica:Number(data.lvl_fabrica)||0,lvl_escuela:Number(data.lvl_escuela)||0,lvl_hospital:Number(data.lvl_hospital)||0,referral_earnings:Number(data.referral_earnings)||0,referred_users:data.referred_users||[],premium_expires:data.premium_expires||null,daily_streak:Number(data.daily_streak)||0,last_daily_claim:data.last_daily_claim||null,haInvertido:data.haInvertido||false,event_progress:data.event_progress||{},accumulated_ton:Number(data.accumulated_ton)||0,retiradoHoy:Number(data.retiradoHoy)||0,referral_code:data.referral_code||'REF'+tgId.toString().slice(-6),last_ad_watch:data.last_ad_watch||null,last_casino_rescue:data.last_casino_rescue||null,gameStats:data.gameStats||{escuela:{bestLevel:0,totalWins:0,currentLevel:1,lives:3},fabrica:{bestLevel:0,totalWins:0,currentLevel:1,lives:3},piscina:{bestLevel:0,totalWins:0,currentLevel:1,lives:3},hospital:{bestLevel:0,totalWins:0,currentLevel:1,lives:3}}};
    }
    document.getElementById('user-display').textContent=userData.username;actualizarUI();actualizarPremiumUI();
}

// ==========================================
// PRODUCCIÓN E INICIALIZACIÓN
// ==========================================
function startProduction(){setInterval(()=>{if(!userData.id)return;userData.diamonds+=getTotalProduction()/3600;actualizarUI();},1000);}
async function initApp(){
    tg.expand();tg.ready();
    const user=tg.initDataUnsafe?.user;
    if(user){userData.id=user.id.toString();userData.username=user.first_name||'Usuario';await loadUserFromDB(user.id);}
    else{userData.id='test_'+Date.now();userData.username='Usuario Test';userData.referral_code='REF'+userData.id.slice(-6);}
    document.getElementById('user-display').textContent=userData.username;
    await initTONConnect();setTimeout(initAds,3000);await updateRealPoolBalance();await updateRankingAndPool();
    startProduction();actualizarEventosUI();
    setInterval(saveUserData,15000);
    setInterval(async()=>{await updateRankingAndPool();actualizarEventosUI();},60000);
    window.addEventListener('beforeunload',()=>saveUserData());
}
window.addEventListener('DOMContentLoaded',initApp);

// ==========================================
// EXPORTACIONES
// ==========================================
window.openPerfil=openPerfil;window.openFriends=openFriends;window.openRanking=openRanking;
window.openBank=openBank;window.openStore=openStore;window.openCasino=openCasino;window.openBuilding=openBuilding;
window.openDailyReward=openDailyReward;window.openEventModal=openEventModal;window.showAdsModal=showAdsModal;
window.abrirJuego=abrirJuego;window.cerrarJuego=cerrarJuego;window.cambiarApuesta=cambiarApuesta;
window.jugarHighLow=jugarHighLow;window.jugarRuleta=jugarRuleta;window.jugarTragaperras=jugarTragaperras;
window.jugarDados=jugarDados;window.claimDailyReward=claimDailyReward;window.showAd=showAd;
window.rescueWithAd=rescueWithAd;window.comprarPremium=comprarPremium;window.comprarTON=comprarTON;
window.buyUpgrade=buyUpgrade;window.closeAll=closeAll;window.copyReferralCode=copyReferralCode;
window.disconnectWallet=disconnectWallet;window.switchBancoTab=switchBancoTab;
window.cambiarVentaDiamonds=cambiarVentaDiamonds;window.venderDiamantes=venderDiamantes;
window.startEventTask=startEventTask;window.reviveGame=reviveGame;window.switchTab=switchTab;
window.checkFabricaHit=checkFabricaHit;window.startSlingshot=startSlingshot;window.releaseSlingshot=releaseSlingshot;

console.log('✅ TON CITY - Listo');