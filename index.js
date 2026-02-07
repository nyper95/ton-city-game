const tg = window.Telegram.WebApp;

const MI_BILLETERA = "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw";

const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-button'
});

let userData = { id:null, diamonds:0 };

// =======================
// CONFIG ECONÓMICA
// =======================

const USER_SHARE = 0.80;
const OWNER_SHARE = 0.20;

// =======================
// DATA GLOBAL
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

    await sendTon(ton, MI_BILLETERA);

    userData.diamonds += diamonds;

    await _supabase.from("usuarios").update({
        diamonds: userData.diamonds
    }).eq("telegram_id", userData.id);

    await updateGlobalPool(
        pool.pool_ton + userTon,
        pool.total_diamonds + diamonds
    );

    actualizarUI();
}

// =======================
// RETIRO TON
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

    await _supabase.from("usuarios").update({
        diamonds: userData.diamonds
    }).eq("telegram_id", userData.id);

    await updateGlobalPool(
        pool.pool_ton - tonAmount,
        pool.total_diamonds - diamonds
    );

    actualizarUI();
}

// =======================
// CARGA USUARIO
// =======================

async function loadUser(user){
    userData.id = user.id.toString();

    let { data } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('telegram_id', userData.id)
        .single();

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
    document.getElementById("user-diamonds").innerText =
        Math.floor(userData.diamonds).toLocaleString();
}

// =======================
// BOTONES BANCO
// =======================

function openBank(){
    let html = "";
    [0.1,0.5,1,2,5,10].forEach(v=>{
        html += `
        <div class="stat">
            <span>${v} TON</span>
            <button onclick="comprarTON(${v})">Comprar</button>
        </div>`;
    });
    document.getElementById("bankList").innerHTML = html;
    show("modalBank");
}

// =======================
// RETIRO
// =======================

function retirar(){
    let amount = prompt("Cuántos 💎 quieres retirar:");
    amount = parseInt(amount);
    if(!amount || amount <= 0) return;
    retirarTON(amount);
}

// =======================
// INIT
// =======================

window.onload = ()=>{
    tg.expand();
    const user = tg.initDataUnsafe.user;
    if(user){
        document.getElementById("user-display").innerText =
            `@${user.username || "user"}`;
        loadUser(user);
    }
};
