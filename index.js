const tg = window.Telegram.WebApp;

const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";

const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

let userData = {
    id: null,
    diamonds: 0,
    lvl_tienda: 0,
    lvl_casino: 0,
    lvl_piscina: 0,
    lvl_parque: 0,
    lvl_diversion: 0
};

// Config economía
const USER_SHARE = 0.8;
const OWNER_SHARE = 0.2;

// Producción por edificio por nivel
const PROD_VAL = { tienda:10, casino:25, piscina:60, parque:15, diversion:120, banco:5 };

// =======================
// POOL GLOBAL
// =======================

async function getGlobalPool(){
    let { data } = await _supabase.from("global").select("*").single();
    return data;
}

async function updateGlobalPool(newTon, newDiamonds){
    await _supabase.from("global").update({
        pool_ton: newTon,
        total_diamonds: newDiamonds
    }).eq("id",1);
}

// =======================
// PRECIO DINÁMICO
// =======================

function calcPrice(pool){
    if(pool.total_diamonds <= 0) return 0.001;
    return (pool.pool_ton * USER_SHARE) / pool.total_diamonds;
}

// =======================
// TON CONNECT SEND
// =======================

async function sendTon(amount, to){
    const tx = {
        validUntil: Math.floor(Date.now()/1000)+600,
        messages: [{
            address: to,
            amount: (amount * 1e9).toString()
        }]
    };
    return await tonConnectUI.sendTransaction(tx);
}

// =======================
// COMPRAR DIAMANTES
// =======================

async function comprarTON(ton){
    const pool = await getGlobalPool();
    const price = calcPrice(pool);
    const userTon = ton * USER_SHARE;
    const ownerTon = ton * OWNER_SHARE;

    const diamonds = Math.floor(userTon / price);

    // Envía TON a tu billetera (20%) + pool (80%)
    await sendTon(ton, MI_BILLETERA);

    userData.diamonds += diamonds;

    // Actualiza Supabase
    await _supabase.from("usuarios").update({ diamonds: userData.diamonds })
        .eq("telegram_id", userData.id);

    await updateGlobalPool(pool.pool_ton + userTon, pool.total_diamonds + diamonds);

    actualizarUI();
    openBank(); // Refresca lista con diamantes calculados
}

// =======================
// RETIRO
// =======================

async function retirarTON(diamonds){
    const pool = await getGlobalPool();
    const price = calcPrice(pool);
    const tonAmount = diamonds * price;

    if(tonAmount > pool.pool_ton){
        alert("Liquidez insuficiente");
        return;
    }

    userData.diamonds -= diamonds;

    await sendTon(tonAmount, tonConnectUI.account.address);

    await _supabase.from("usuarios").update({ diamonds: userData.diamonds })
        .eq("telegram_id", userData.id);

    await updateGlobalPool(pool.pool_ton - tonAmount, pool.total_diamonds - diamonds);

    actualizarUI();
}

// =======================
// CARGA USUARIO
// =======================

async function loadUser(user){
    userData.id = user.id.toString();

    let { data } = await _supabase.from('usuarios')
        .select('*').eq('telegram_id', userData.id).single();

    if(!data){
        await _supabase.from('usuarios').insert([{
            telegram_id: userData.id,
            username: user.username,
            diamonds: 0
        }]);
        userData.diamonds = 0;
    } else {
        userData.diamonds = data.diamonds;
    }

    actualizarUI();
}

// =======================
// UI
// =======================

function actualizarUI(){
    document.getElementById("diamonds").innerText =
        Math.floor(userData.diamonds).toLocaleString();
}

// =======================
// BANCO EN TIEMPO REAL
// =======================

async function openBank(){
    const pool = await getGlobalPool();
    const price = calcPrice(pool);

    let html = "";
    [0.1,0.5,1,2,5,10].forEach(v=>{
        const diamonds = Math.floor((v * USER_SHARE)/price);
        html += `
        <div class="stat">
            <span>${v} TON</span>
            <span>${diamonds} 💎</span>
            <button onclick="comprarTON(${v})">Comprar</button>
        </div>`;
    });
    document.getElementById("bankList").innerHTML = html;
    showModal("modalBank");
}

// =======================
// TIENDA EN TIEMPO REAL
// =======================

function openStore(){
    const items = [
        {name:"Tienda",lvl:userData.lvl_tienda,price:10},
        {name:"Casino",lvl:userData.lvl_casino,price:20},
        {name:"Piscina",lvl:userData.lvl_piscina,price:30},
        {name:"Parque",lvl:userData.lvl_parque,price:15},
        {name:"Diversión",lvl:userData.lvl_diversion,price:50}
    ];
    let html = "";
    items.forEach((item,index)=>{
        html += `<div class="stat">
            <span>${item.name} Lvl ${item.lvl}</span>
            <span>${item.price} 💎</span>
            <button onclick="buyUpgrade('${item.name}',${item.price})">Comprar</button>
        </div>`;
    });
    document.getElementById("storeList").innerHTML = html;
    showModal("modalStore");
}

async function buyUpgrade(name,price){
    if(userData.diamonds < price){
        alert("No tienes suficientes 💎");
        return;
    }
    userData.diamonds -= price;
    switch(name){
        case "Tienda": userData.lvl_tienda++; break;
        case "Casino": userData.lvl_casino++; break;
        case "Piscina": userData.lvl_piscina++; break;
        case "Parque": userData.lvl_parque++; break;
        case "Diversión": userData.lvl_diversion++; break;
    }
    await _supabase.from('usuarios').update({ diamonds:userData.diamonds,
        lvl_tienda:userData.lvl_tienda,
        lvl_casino:userData.lvl_casino,
        lvl_piscina:userData.lvl_piscina,
        lvl_parque:userData.lvl_parque,
        lvl_diversion:userData.lvl_diversion
    }).eq("telegram_id", userData.id);
    actualizarUI();
    openStore();
}

// =======================
// CENTRAL
// =======================

function openCentral(){
    const prod = {
        tienda: userData.lvl_tienda*PROD_VAL.tienda,
        casino: userData.lvl_casino*PROD_VAL.casino,
        piscina: userData.lvl_piscina*PROD_VAL.piscina,
        parque: userData.lvl_parque*PROD_VAL.parque,
        diversion: userData.lvl_diversion*PROD_VAL.diversion,
        banco: PROD_VAL.banco
    };
    const total = prod.tienda+prod.casino+prod.piscina+prod.parque+prod.diversion+prod.banco;

    document.getElementById("s_tienda").innerText=prod.tienda;
    document.getElementById("s_casino").innerText=prod.casino;
    document.getElementById("s_piscina").innerText=prod.piscina;
    document.getElementById("s_parque").innerText=prod.parque;
    document.getElementById("s_diversion").innerText=prod.diversion;
    document.getElementById("s_total").innerText=total;

    showModal("centralModal");
}

// =======================
// MODALES
// =======================

function showModal(id){
    document.getElementById("overlay").style.display="block";
    document.getElementById(id).style.display="block";
}
function closeAll(){
    document.getElementById("overlay").style.display="none";
    document.getElementById("modalBank").style.display="none";
    document.getElementById("modalStore").style.display="none";
    document.getElementById("centralModal").style.display="none";
}

// =======================
// RETIRO
// =======================

function retirar(){
    let diamonds = prompt("Cuántos 💎 quieres retirar?");
    diamonds=parseInt(diamonds);
    if(!diamonds||diamonds<=0) return;
    retirarTON(diamonds);
}

// =======================
// INIT
// =======================

window.onload=()=>{
    tg.expand();
    const user=tg.initDataUnsafe.user;
    if(user){
        document.getElementById("user-display").innerText=`${user.username||"User"}`;
        loadUser(user);
    }
};
