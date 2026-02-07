const tg = window.Telegram.WebApp;

const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';
const supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
  buttonRootId: 'ton-connect-button'
});

let user = {};
let data = {
  diamonds: 0,
  last_claim: Date.now(),
  lvl_tienda: 1,
  lvl_casino: 1
};

const BUILDINGS = {
  tienda: { base: 5, mult: 1.15 },
  casino: { base: 12, mult: 1.18 }
};

function calcProd(type, lvl) {
  return Math.floor(BUILDINGS[type].base * Math.pow(BUILDINGS[type].mult, lvl - 1));
}

function totalProduction() {
  return calcProd('tienda', data.lvl_tienda) + calcProd('casino', data.lvl_casino);
}

async function saveData() {
  await supa.from('usuarios').update({
    diamonds: data.diamonds,
    lvl_tienda: data.lvl_tienda,
    lvl_casino: data.lvl_casino,
    last_claim: data.last_claim
  }).eq('telegram_id', user.id.toString());
}

async function loadData(u) {
  user = u;

  let { data: db } = await supa.from('usuarios').select('*').eq('telegram_id', user.id.toString()).single();

  if (!db) {
    await supa.from('usuarios').insert([{
      telegram_id: user.id.toString(),
      username: user.username,
      diamonds: 0,
      lvl_tienda: 1,
      lvl_casino: 1,
      last_claim: Date.now()
    }]);
    return loadData(u);
  }

  data = db;
  claimOffline();
  updateUI();
}

function claimOffline() {
  const now = Date.now();
  const elapsed = now - data.last_claim;
  const hours = elapsed / (1000 * 60 * 60);
  const reward = hours * totalProduction();

  data.diamonds += reward;
  data.last_claim = now;
  saveData();
}

function updateUI() {
  document.getElementById('user-diamonds').innerText = Math.floor(data.diamonds).toLocaleString();
  document.getElementById('lvl-tienda').innerText = data.lvl_tienda;
  document.getElementById('lvl-casino').innerText = data.lvl_casino;

  const pt = calcProd('tienda', data.lvl_tienda);
  const pc = calcProd('casino', data.lvl_casino);
  const total = pt + pc;

  document.getElementById('prod-tienda').innerText = pt;
  document.getElementById('prod-casino').innerText = pc;
  document.getElementById('prod-total-mapa').innerText = total;

  document.getElementById('stat-prod-total').innerText = total;
  document.getElementById('stat-tienda').innerText = pt;
  document.getElementById('stat-casino').innerText = pc;
}

function abrirCentral() {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('modal-central').style.display = 'block';
}

function cerrarTodo() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('modal-central').style.display = 'none';
}

async function comprarDiamantes() {
  tg.showPopup({
    title: "Banco TON",
    message: "Próximamente podrás invertir TON y recibir diamantes.",
    buttons: [{ type: "ok" }]
  });
}

setInterval(() => {
  data.diamonds += totalProduction() / 3600;
  updateUI();
}, 1000);

window.onload = () => {
  tg.expand();
  const u = tg.initDataUnsafe.user;
  if (u) {
    document.getElementById('user-display').innerText = `@${u.username || "User"}`;
    loadData(u);
  }
};
