// ======================================================
// DIAMOND CITY - VERSIÓN FINAL COMPLETA 2026
// Centro Financiero · Sin juegos de azar
// ======================================================
console.log('🚀 DIAMOND CITY - Iniciando sistema profesional...');

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
    RED_TON_FEE: 0.002,
    RESERVA_POOL: 0.95,
    BILLETERA_PROPIETARIO: "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw",
    BILLETERA_POOL: "UQBuoEgT5DmcoEQ_nl6YwR0Q86fZWY4baACuX80EegWG49h2",
    PRECIO_COMPRA: 0.008,
    ADSGRAM_BLOCK_ID: '46476',
    SUPABASE_URL: 'https://xkkifqxxglcuyruwkbih.supabase.co',
    SUPABASE_KEY: 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE'
};

const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let adsReady = false;
let AdController = null;

let userData = {
    id: null,
    username: "Cargando...",
    diamonds: 0,
    lvl_piscina: 0,
    lvl_fabrica: 0,
    lvl_escuela: 0,
    lvl_hospital: 0,
    referral_code: null,
    city_name: null,
    newsFeed: [],
    genero: 'M',
    idioma: 'es',
    referral_earnings: 0,
    referred_users: [],
    last_online: null,
    last_production_update: null,
    last_withdraw_week: null,
    last_ad_watch: null,
    last_casino_rescue: null,
    daily_streak: 0,
    last_daily_claim: null,
    haInvertido: false,
    premium_expires: null,
    weekly_rank: null,
    rank: "Ciudadano",
    projectedReward: 0,
    event_progress: {},
    accumulated_ton: 0,
    retiradoHoy: 0,
    bolsa_portfolio: {},
    expediciones_activas: [],
    subasta_pujas: {},
    craft_niveles: {},
    gameStats: {
        escuela: { bestLevel: 0, totalWins: 0 },
        fabrica: { bestLevel: 0, totalWins: 0 },
        piscina: { bestLevel: 0, totalWins: 0 },
        hospital: { bestLevel: 0, totalWins: 0 }
    },
    jugadasHoy: {
        timing: 0,
        matchmental: 0,
        bolsa: 0,
        subasta: 0,
        expedicion: 0,
        crafting: 0,
        fecha: new Date().toDateString()
    }
};

let globalPoolData = {
    pool_ton: 100,
    total_diamonds: 0,
    user_rankings: []
};

// ==========================================
// CONSTANTES
// ==========================================
const PREMIUM_PLANS = [
    { name: "1 día", days: 1, price: 0.20 },
    { name: "7 días", days: 7, price: 1.00 },
    { name: "30 días", days: 30, price: 3.00 }
];

let apuestaActual = {
    timing: 10,
    matchmental: 10
};

// ==========================================
// TRADUCCIONES COMPLETAS (ES / EN / PT / RU)
// ==========================================
const TRADUCCIONES = {
    es: {
        nav_perfil: 'PERFIL', nav_amigos: 'AMIGOS', nav_ranking: 'RANKING',
        greeting_hola: 'HOLA,',
        genero_m: 'Alcalde', genero_f: 'Alcaldesa',
        section_edificios: 'Edificios', section_feed: 'Feed de Noticias',
        building_banco: 'Banco', building_banco_sub: 'Comprar/Vender GRAM',
        building_premium: 'Premium', building_premium_sub: 'Planes VIP',
        building_centro: 'Centro Financiero', building_centro_sub: '6 secciones',
        building_parque: 'Parque', building_parque_sub: 'Anuncios',
        building_piscina: 'Piscina', building_fabrica: 'Fábrica',
        building_escuela: 'Escuela', building_hospital: 'Hospital',
        gauge_tesoreria: 'Tesorería', gauge_produccion: 'Diamantes/h', gauge_nivel: 'Nivel municipal',
        lvl_label: 'Nivel', prod_label: 'Prod', mejora_label: 'Mejora',
        btn_cerrar: 'CERRAR', btn_mejorar: 'MEJORAR',
        perfil_titulo: 'Mi Perfil', perfil_amigos: 'Amigos',
        perfil_rango: 'Rango', perfil_bono: 'Bono semanal',
        perfil_titulo_tratamiento: 'Título de tratamiento',
        idioma_titulo: 'Idioma',
        amigos_titulo: 'Invitar Amigos', amigos_gana: '¡Gana el 10% de tus referidos!',
        amigos_tu_codigo: 'Tu código:', amigos_copiar: '📋 COPIAR ENLACE',
        amigos_ganancias: 'Ganancias',
        ranking_titulo: 'Ranking Municipal', ranking_tu_rango: 'Tu rango',
        ranking_tu_posicion: 'Tu posición', ranking_bono: 'Bono semanal estimado',
        ranking_historial: '🏆 Ver historial público de premios',
        historial_titulo: '🏆 Historial de Premios',
        historial_info: 'Registro público de los diamantes entregados cada semana según el ranking de producción.',
        banco_titulo: 'Banco GRAM',
        banco_info: 'Conecta tu wallet y compra diamantes con GRAM.',
        banco_conectada: 'Wallet conectada', banco_desconectar: 'Desconectar',
        premium_titulo: 'Tienda Premium',
        premium_beneficios: '🎁 Beneficios:',
        premium_beneficios_txt: 'x2 producción · Sin anuncios · Eventos x4 · Insignia exclusiva',
        centro_titulo: '🏛️ Centro Financiero',
        centro_info: 'Todos los módulos se basan en habilidad, estrategia o gestión. No hay apuestas ni juegos de azar.',
        centro_sin_diamantes: 'Sin diamantes',
        juego_timing: 'Timing Tap', juego_timing_sub: 'Habilidad',
        juego_match: 'Match Mental', juego_match_sub: 'Memoria',
        juego_bolsa: 'Bolsa', juego_bolsa_sub: 'Inversión',
        juego_subasta: 'Subasta', juego_subasta_sub: 'P2P',
        juego_expedicion: 'Expedición', juego_expedicion_sub: 'Gestión',
        juego_crafting: 'Crafting', juego_crafting_sub: 'Fusión',
        timing_info: 'Detén la aguja dentro de la zona verde. Entre más cerca del centro, mayor el multiplicador (2x a 5x).',
        timing_iniciar: '▶ INICIAR', timing_detener: '¡DETENER!',
        match_info: 'Memoriza la secuencia de símbolos y reprodúcela. Cada ronda correcta multiplica tu premio.',
        match_comenzar: '▶ COMENZAR',
        bolsa_info: 'Compra acciones cuando estén bajas y véndelas cuando suban. Los precios se actualizan cada 30 segundos.',
        bolsa_portfolio: '💼 Tu portafolio', bolsa_sin: 'Sin inversiones todavía',
        subasta_info: 'Ítems raros subastados entre alcaldes. Comisión de la casa: 5% (se quema).',
        exp_info: 'Envía mineros a zonas de riesgo. Siempre obtienes recurso, pero el desgaste puede reducir la ganancia neta.',
        exp_activas: '🚛 Expediciones activas', exp_ninguna: 'Ninguna en curso',
        craft_info: 'Combina dos ítems iguales + diamantes para obtener uno de nivel superior. Sin aleatoriedad.',
        apuesta_label: 'Apuesta:',
        daily_titulo: 'Recompensa diaria', daily_subtitulo: '¡Reclama tus diamantes gratis!',
        daily_dia: 'Día', daily_recompensa: 'Recompensa', daily_reclamar: 'RECLAMAR',
        ads_ver: 'VER ANUNCIO',
        asistente_rol: 'Asistente Ejecutiva de la Alcaldía',
        onboarding_placeholder: 'Nombre de tu ciudad',
        onboarding_fundar: '🏙️ FUNDAR MI CIUDAD',
        feed_titulo: 'Bienvenido a su ciudad', feed_sub: 'Los eventos recientes aparecerán aquí'
    },
    en: {
        nav_perfil: 'PROFILE', nav_amigos: 'FRIENDS', nav_ranking: 'RANKING',
        greeting_hola: 'HI,',
        genero_m: 'Mayor', genero_f: 'Mayor',
        section_edificios: 'Buildings', section_feed: 'News Feed',
        building_banco: 'Bank', building_banco_sub: 'Buy/Sell GRAM',
        building_premium: 'Premium', building_premium_sub: 'VIP Plans',
        building_centro: 'Financial Center', building_centro_sub: '6 sections',
        building_parque: 'Park', building_parque_sub: 'Watch ads',
        building_piscina: 'Pool', building_fabrica: 'Factory',
        building_escuela: 'School', building_hospital: 'Hospital',
        gauge_tesoreria: 'Treasury', gauge_produccion: 'Diamonds/h', gauge_nivel: 'Municipal level',
        lvl_label: 'Level', prod_label: 'Prod', mejora_label: 'Upgrade',
        btn_cerrar: 'CLOSE', btn_mejorar: 'UPGRADE',
        perfil_titulo: 'My Profile', perfil_amigos: 'Friends',
        perfil_rango: 'Rank', perfil_bono: 'Weekly bonus',
        perfil_titulo_tratamiento: 'Title',
        idioma_titulo: 'Language',
        amigos_titulo: 'Invite Friends', amigos_gana: 'Earn 10% of your referrals!',
        amigos_tu_codigo: 'Your code:', amigos_copiar: '📋 COPY LINK',
        amigos_ganancias: 'Earnings',
        ranking_titulo: 'Municipal Ranking', ranking_tu_rango: 'Your rank',
        ranking_tu_posicion: 'Your position', ranking_bono: 'Estimated weekly bonus',
        ranking_historial: '🏆 View public prize history',
        historial_titulo: '🏆 Prize History',
        historial_info: 'Public record of diamonds paid each week according to production ranking.',
        banco_titulo: 'GRAM Bank',
        banco_info: 'Connect your wallet and buy diamonds with GRAM.',
        banco_conectada: 'Wallet connected', banco_desconectar: 'Disconnect',
        premium_titulo: 'Premium Store',
        premium_beneficios: '🎁 Benefits:',
        premium_beneficios_txt: 'x2 production · No ads · x4 events · Exclusive badge',
        centro_titulo: '🏛️ Financial Center',
        centro_info: 'All modules are based on skill, strategy or management. No betting or gambling.',
        centro_sin_diamantes: 'No diamonds',
        juego_timing: 'Timing Tap', juego_timing_sub: 'Skill',
        juego_match: 'Match Mental', juego_match_sub: 'Memory',
        juego_bolsa: 'Stock Market', juego_bolsa_sub: 'Investment',
        juego_subasta: 'Auction', juego_subasta_sub: 'P2P',
        juego_expedicion: 'Expedition', juego_expedicion_sub: 'Management',
        juego_crafting: 'Crafting', juego_crafting_sub: 'Fusion',
        timing_info: 'Stop the needle inside the green zone. The closer to the center, the higher the multiplier (2x to 5x).',
        timing_iniciar: '▶ START', timing_detener: 'STOP!',
        match_info: 'Memorize the sequence and reproduce it. Each correct round multiplies your prize.',
        match_comenzar: '▶ START',
        bolsa_info: 'Buy stocks when low and sell when high. Prices update every 30 seconds.',
        bolsa_portfolio: '💼 Your portfolio', bolsa_sin: 'No investments yet',
        subasta_info: 'Rare items auctioned between mayors. House fee: 5% (burned).',
        exp_info: 'Send miners to risky areas. You always get resources, but wear can reduce net profit.',
        exp_activas: '🚛 Active expeditions', exp_ninguna: 'None in progress',
        craft_info: 'Combine two equal items + diamonds to get a higher-tier one. No randomness.',
        apuesta_label: 'Bet:',
        daily_titulo: 'Daily Reward', daily_subtitulo: 'Claim your free diamonds!',
        daily_dia: 'Day', daily_recompensa: 'Reward', daily_reclamar: 'CLAIM',
        ads_ver: 'WATCH AD',
        asistente_rol: 'Executive Assistant of the Mayor',
        onboarding_placeholder: 'Name your city',
        onboarding_fundar: '🏙️ FOUND MY CITY',
        feed_titulo: 'Welcome to your city', feed_sub: 'Recent events will appear here'
    },
    pt: {
        nav_perfil: 'PERFIL', nav_amigos: 'AMIGOS', nav_ranking: 'RANKING',
        greeting_hola: 'OLÁ,',
        genero_m: 'Prefeito', genero_f: 'Prefeita',
        section_edificios: 'Edifícios', section_feed: 'Feed de Notícias',
        building_banco: 'Banco', building_banco_sub: 'Comprar/Vender GRAM',
        building_premium: 'Premium', building_premium_sub: 'Planos VIP',
        building_centro: 'Centro Financeiro', building_centro_sub: '6 seções',
        building_parque: 'Parque', building_parque_sub: 'Ver anúncios',
        building_piscina: 'Piscina', building_fabrica: 'Fábrica',
        building_escuela: 'Escola', building_hospital: 'Hospital',
        gauge_tesoreria: 'Tesouraria', gauge_produccion: 'Diamantes/h', gauge_nivel: 'Nível municipal',
        lvl_label: 'Nível', prod_label: 'Prod', mejora_label: 'Melhoria',
        btn_cerrar: 'FECHAR', btn_mejorar: 'MELHORAR',
        perfil_titulo: 'Meu Perfil', perfil_amigos: 'Amigos',
        perfil_rango: 'Rank', perfil_bono: 'Bônus semanal',
        perfil_titulo_tratamiento: 'Título',
        idioma_titulo: 'Idioma',
        amigos_titulo: 'Convidar Amigos', amigos_gana: 'Ganhe 10% dos seus referidos!',
        amigos_tu_codigo: 'Seu código:', amigos_copiar: '📋 COPIAR LINK',
        amigos_ganancias: 'Ganhos',
        ranking_titulo: 'Ranking Municipal', ranking_tu_rango: 'Seu rank',
        ranking_tu_posicion: 'Sua posição', ranking_bono: 'Bônus semanal estimado',
        ranking_historial: '🏆 Ver histórico público de prêmios',
        historial_titulo: '🏆 Histórico de Prêmios',
        historial_info: 'Registro público dos diamantes pagos semanalmente conforme o ranking.',
        banco_titulo: 'Banco GRAM',
        banco_info: 'Conecte sua carteira e compre diamantes com GRAM.',
        banco_conectada: 'Carteira conectada', banco_desconectar: 'Desconectar',
        premium_titulo: 'Loja Premium',
        premium_beneficios: '🎁 Benefícios:',
        premium_beneficios_txt: 'x2 produção · Sem anúncios · Eventos x4 · Insígnia exclusiva',
        centro_titulo: '🏛️ Centro Financeiro',
        centro_info: 'Todos os módulos se baseiam em habilidade, estratégia ou gestão. Sem apostas.',
        centro_sin_diamantes: 'Sem diamantes',
        juego_timing: 'Timing Tap', juego_timing_sub: 'Habilidade',
        juego_match: 'Match Mental', juego_match_sub: 'Memória',
        juego_bolsa: 'Bolsa', juego_bolsa_sub: 'Investimento',
        juego_subasta: 'Leilão', juego_subasta_sub: 'P2P',
        juego_expedicion: 'Expedição', juego_expedicion_sub: 'Gestão',
        juego_crafting: 'Crafting', juego_crafting_sub: 'Fusão',
        timing_info: 'Pare a agulha na zona verde. Quanto mais perto do centro, maior o multiplicador (2x a 5x).',
        timing_iniciar: '▶ INICIAR', timing_detener: 'PARAR!',
        match_info: 'Memorize a sequência e reproduza. Cada rodada correta multiplica o prêmio.',
        match_comenzar: '▶ COMEÇAR',
        bolsa_info: 'Compre ações quando estiverem baixas e venda quando subirem. Preços atualizam a cada 30s.',
        bolsa_portfolio: '💼 Seu portfólio', bolsa_sin: 'Sem investimentos ainda',
        subasta_info: 'Itens raros leiloados entre prefeitos. Comissão da casa: 5% (queimada).',
        exp_info: 'Envie mineradores para áreas de risco. Você sempre ganha recursos, mas o desgaste reduz o lucro.',
        exp_activas: '🚛 Expedições ativas', exp_ninguna: 'Nenhuma em andamento',
        craft_info: 'Combine dois itens iguais + diamantes para obter um de nível superior. Sem aleatoriedade.',
        apuesta_label: 'Aposta:',
        daily_titulo: 'Recompensa diária', daily_subtitulo: 'Resgate seus diamantes grátis!',
        daily_dia: 'Dia', daily_recompensa: 'Recompensa', daily_reclamar: 'RESGATAR',
        ads_ver: 'VER ANÚNCIO',
        asistente_rol: 'Assistente Executiva da Prefeitura',
        onboarding_placeholder: 'Nome da sua cidade',
        onboarding_fundar: '🏙️ FUNDAR MINHA CIDADE',
        feed_titulo: 'Bem-vindo à sua cidade', feed_sub: 'Eventos recentes aparecerão aqui'
    },
    ru: {
        nav_perfil: 'ПРОФИЛЬ', nav_amigos: 'ДРУЗЬЯ', nav_ranking: 'РЕЙТИНГ',
        greeting_hola: 'ПРИВЕТ,',
        genero_m: 'Мэр', genero_f: 'Мэр',
        section_edificios: 'Здания', section_feed: 'Лента новостей',
        building_banco: 'Банк', building_banco_sub: 'Купить/продать GRAM',
        building_premium: 'Премиум', building_premium_sub: 'VIP-планы',
        building_centro: 'Финансовый центр', building_centro_sub: '6 разделов',
        building_parque: 'Парк', building_parque_sub: 'Смотреть рекламу',
        building_piscina: 'Бассейн', building_fabrica: 'Фабрика',
        building_escuela: 'Школа', building_hospital: 'Больница',
        gauge_tesoreria: 'Казна', gauge_produccion: 'Алмазов/ч', gauge_nivel: 'Уровень города',
        lvl_label: 'Уровень', prod_label: 'Произв', mejora_label: 'Улучшение',
        btn_cerrar: 'ЗАКРЫТЬ', btn_mejorar: 'УЛУЧШИТЬ',
        perfil_titulo: 'Мой профиль', perfil_amigos: 'Друзья',
        perfil_rango: 'Ранг', perfil_bono: 'Недельный бонус',
        perfil_titulo_tratamiento: 'Обращение',
        idioma_titulo: 'Язык',
        amigos_titulo: 'Пригласить друзей', amigos_gana: 'Получайте 10% от рефералов!',
        amigos_tu_codigo: 'Ваш код:', amigos_copiar: '📋 КОПИРОВАТЬ',
        amigos_ganancias: 'Доход',
        ranking_titulo: 'Городской рейтинг', ranking_tu_rango: 'Ваш ранг',
        ranking_tu_posicion: 'Ваша позиция', ranking_bono: 'Ожидаемый недельный бонус',
        ranking_historial: '🏆 Публичная история наград',
        historial_titulo: '🏆 История наград',
        historial_info: 'Публичный реестр алмазов, выплаченных согласно рейтингу.',
        banco_titulo: 'Банк GRAM',
        banco_info: 'Подключите кошелёк и купите алмазы за GRAM.',
        banco_conectada: 'Кошелёк подключён', banco_desconectar: 'Отключить',
        premium_titulo: 'Премиум-магазин',
        premium_beneficios: '🎁 Преимущества:',
        premium_beneficios_txt: 'x2 производство · Без рекламы · x4 события · Эксклюзивный значок',
        centro_titulo: '🏛️ Финансовый центр',
        centro_info: 'Все модули основаны на навыке, стратегии или управлении. Никаких азартных игр.',
        centro_sin_diamantes: 'Нет алмазов',
        juego_timing: 'Timing Tap', juego_timing_sub: 'Навык',
        juego_match: 'Match Mental', juego_match_sub: 'Память',
        juego_bolsa: 'Биржа', juego_bolsa_sub: 'Инвестиции',
        juego_subasta: 'Аукцион', juego_subasta_sub: 'P2P',
        juego_expedicion: 'Экспедиция', juego_expedicion_sub: 'Управление',
        juego_crafting: 'Крафт', juego_crafting_sub: 'Слияние',
        timing_info: 'Остановите стрелку в зелёной зоне. Чем ближе к центру, тем выше множитель (2x–5x).',
        timing_iniciar: '▶ СТАРТ', timing_detener: 'СТОП!',
        match_info: 'Запомните последовательность и воспроизведите её. Каждый раунд увеличивает приз.',
        match_comenzar: '▶ НАЧАТЬ',
        bolsa_info: 'Покупайте акции дешевле и продавайте дороже. Цены обновляются каждые 30 секунд.',
        bolsa_portfolio: '💼 Ваш портфель', bolsa_sin: 'Пока нет инвестиций',
        subasta_info: 'Редкие предметы на аукционе между мэрами. Комиссия дома: 5% (сжигается).',
        exp_info: 'Отправляйте шахтёров в опасные зоны. Ресурсы всегда будут, но износ снижает прибыль.',
        exp_activas: '🚛 Активные экспедиции', exp_ninguna: 'Нет активных',
        craft_info: 'Соедините два одинаковых предмета + алмазы, чтобы получить уровень выше. Без случайности.',
        apuesta_label: 'Ставка:',
        daily_titulo: 'Ежедневная награда', daily_subtitulo: 'Заберите бесплатные алмазы!',
        daily_dia: 'День', daily_recompensa: 'Награда', daily_reclamar: 'ЗАБРАТЬ',
        ads_ver: 'СМОТРЕТЬ',
        asistente_rol: 'Исполнительный ассистент мэрии',
        onboarding_placeholder: 'Название вашего города',
        onboarding_fundar: '🏙️ ОСНОВАТЬ ГОРОД',
        feed_titulo: 'Добро пожаловать в ваш город', feed_sub: 'Здесь будут появляться события'
    }
};

function t(key) {
    const idioma = userData.idioma || 'es';
    return (TRADUCCIONES[idioma] && TRADUCCIONES[idioma][key]) || TRADUCCIONES.es[key] || key;
}

function aplicarIdioma() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        const key = el.getAttribute('data-i18n');
        const traduccion = t(key);
        if (traduccion) el.textContent = traduccion;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        const key = el.getAttribute('data-i18n-placeholder');
        const traduccion = t(key);
        if (traduccion) el.placeholder = traduccion;
    });
}

const NOMBRES_IDIOMA = { es: 'Español', en: 'English', pt: 'Português', ru: 'Русский' };

function seleccionarIdioma(codigo) {
    userData.idioma = codigo;
    aplicarIdioma();
    const label = document.getElementById('idioma-actual-label');
    if (label) label.textContent = NOMBRES_IDIOMA[codigo] || 'Español';
    closeAll();
    saveUserData();
}

function abrirSelectorIdioma() {
    closeAll();
    showModal('modalIdioma');
}

// ==========================================
// UTILIDADES BÁSICAS
// ==========================================
function esPremium() {
    if (!userData.premium_expires) return false;
    return new Date() < new Date(userData.premium_expires);
}

function actualizarPremiumUI() {
    const badge = document.getElementById('premium-badge');
    if (badge) badge.style.display = esPremium() ? 'flex' : 'none';
}

function getTotalProduction() {
    let base = (userData.lvl_escuela * 15) + (userData.lvl_fabrica * 25) + (userData.lvl_piscina * 10) + (userData.lvl_hospital * 18);
    if (esPremium()) base = base * 2;
    return base;
}

function getTituloAlcalde() {
    return userData.genero === 'F' ? 'Alcaldesa' : 'Alcalde';
}

function seleccionarGenero(g) {
    userData.genero = g;
    const btnM = document.getElementById('genero-M');
    const btnF = document.getElementById('genero-F');
    if (btnM) btnM.classList.toggle('active', g === 'M');
    if (btnF) btnF.classList.toggle('active', g === 'F');
}

function cambiarGeneroPerfil(g) {
    userData.genero = g;
    const btnM = document.getElementById('perfil-genero-M');
    const btnF = document.getElementById('perfil-genero-F');
    if (btnM) btnM.classList.toggle('active', g === 'M');
    if (btnF) btnF.classList.toggle('active', g === 'F');
    actualizarUI();
    saveUserData();
}

function tiempoRelativo(iso) {
    const segundos = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (segundos < 60) return 'Justo ahora';
    if (segundos < 3600) return 'Hace ' + Math.floor(segundos / 60) + ' min';
    if (segundos < 86400) return 'Hace ' + Math.floor(segundos / 3600) + ' h';
    return 'Hace ' + Math.floor(segundos / 86400) + ' días';
}

function registrarEvento(icono, titulo, subtitulo) {
    if (!userData.newsFeed) userData.newsFeed = [];
    userData.newsFeed.unshift({ icono: icono, titulo: titulo, subtitulo: subtitulo, fecha: new Date().toISOString() });
    userData.newsFeed = userData.newsFeed.slice(0, 15);
    renderizarFeedNoticias();
}

function renderizarFeedNoticias() {
    const cont = document.getElementById('feed-noticias');
    if (!cont) return;
    const eventos = userData.newsFeed || [];
    if (eventos.length === 0) {
        cont.innerHTML = '<div class="feed-item"><div class="feed-icono">👋</div><div class="feed-texto"><div class="feed-titulo">' + t('feed_titulo') + '</div><div class="feed-subtitulo">' + t('feed_sub') + '</div></div></div>';
        return;
    }
    let html = '';
    for (let i = 0; i < eventos.length; i++) {
        const e = eventos[i];
        html += '<div class="feed-item"><div class="feed-icono">' + e.icono + '</div><div class="feed-texto"><div class="feed-titulo">' + e.titulo + '</div><div class="feed-subtitulo">' + e.subtitulo + '</div><div class="feed-tiempo">' + tiempoRelativo(e.fecha) + '</div></div></div>';
    }
    cont.innerHTML = html;
}

function mostrarOnboardingSiHaceFalta() {
    if (!userData.city_name) {
        const pantalla = document.getElementById('onboarding-screen');
        if (pantalla) pantalla.classList.remove('hidden');
    }
}

async function confirmarNombreCiudad() {
    const input = document.getElementById('onboarding-city-input');
    const nombre = input ? input.value.trim() : '';
    if (!nombre || nombre.length < 2) return alert('❌ Escribe un nombre para tu ciudad (mínimo 2 letras)');
    if (nombre.length > 20) return alert('❌ Máximo 20 caracteres');
    userData.city_name = nombre;
    const pantalla = document.getElementById('onboarding-screen');
    if (pantalla) pantalla.classList.add('hidden');
    actualizarUI();
    await saveUserData();
}

function destelloResultado(modalId, gano) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('ganaste', 'perdiste');
    void modal.offsetWidth;
    modal.classList.add(gano ? 'ganaste' : 'perdiste');
    setTimeout(function() { modal.classList.remove('ganaste', 'perdiste'); }, 900);
}

function spawnConfetti() {
    const colores = ['#facc15', '#4ade80', '#38bdf8', '#f472b6', '#a78bfa', '#f97316', '#ef4444', '#34d399'];
    for (let i = 0; i < 40; i++) {
        const pieza = document.createElement('div');
        pieza.style.cssText = 'position:fixed;width:' + (6 + Math.random() * 10) + 'px;height:' + (6 + Math.random() * 10) + 'px;z-index:9999;pointer-events:none;left:' + Math.random() * 100 + '%;top:' + (Math.random() * 50 + 20) + '%;background:' + colores[Math.floor(Math.random() * colores.length)] + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';animation:confetti ' + (1 + Math.random() * 2) + 's ease forwards;animation-delay:' + Math.random() * 0.5 + 's;';
        document.body.appendChild(pieza);
        setTimeout(function() { if (pieza.parentNode) pieza.parentNode.removeChild(pieza); }, 3000);
    }
}

// ==========================================
// ASISTENTE VIRTUAL (VALERIA)
// ==========================================
function getSaludoValeria() {
    const hora = new Date().getHours();
    if (hora < 12) return '🏛️ Buenos días, ' + getTituloAlcalde() + '.';
    if (hora < 19) return '🏛️ Buenas tardes, ' + getTituloAlcalde() + '.';
    return '🏛️ Buenas noches, ' + getTituloAlcalde() + '.';
}

function getConsejosAsistente() {
    const hoy = new Date().toDateString();
    const ultimoReclamo = userData.last_daily_claim ? new Date(userData.last_daily_claim).toDateString() : null;
    const ciudad = userData.city_name || 'esta ciudad';
    const consejos = [];

    if (ultimoReclamo !== hoy) {
        consejos.push('🔔 Informe pendiente: la recaudación diaria de ' + ciudad + ' todavía no ha sido reclamada.');
    }
    if ((userData.diamonds || 0) < 200) {
        consejos.push('💎 Las arcas municipales están por debajo de lo recomendable. Sugiero ver un anuncio en el Parque (+20 💎 sin costo).');
    }
    const nivelesBajos = ['lvl_piscina', 'lvl_fabrica', 'lvl_escuela', 'lvl_hospital'].filter(function(k) { return (userData[k] || 0) < 5; });
    if (nivelesBajos.length > 0) {
        consejos.push('📊 Varios edificios aún operan muy por debajo de su capacidad. Cada mejora incrementa la producción por hora.');
    }
    if (!esPremium()) {
        consejos.push('⚡ El estatus Premium duplica la producción de toda la ciudad y elimina los anuncios.');
    }
    if ((userData.referred_users || []).length === 0) {
        consejos.push('👥 ' + ciudad + ' todavía no tiene ciudadanos referidos. Cada invitación genera diamantes adicionales.');
    }
    if (consejos.length === 0) {
        consejos.push('✅ Todo está en orden en ' + ciudad + '. Excelente gestión hasta el momento.');
    }
    return consejos.slice(0, 3);
}

function hayAlgoUrgenteParaValeria() {
    const hoy = new Date().toDateString();
    const ultimoReclamo = userData.last_daily_claim ? new Date(userData.last_daily_claim).toDateString() : null;
    if (ultimoReclamo !== hoy) return true;
    if ((userData.diamonds || 0) < 200) return true;
    const nivelesBajos = ['lvl_piscina', 'lvl_fabrica', 'lvl_escuela', 'lvl_hospital'].filter(function(k) { return (userData[k] || 0) < 3; });
    if (nivelesBajos.length >= 3) return true;
    return false;
}

function actualizarBadgeValeria() {
    const boton = document.getElementById('asistente-boton');
    if (!boton) return;
    if (hayAlgoUrgenteParaValeria()) boton.classList.add('urgente');
    else boton.classList.remove('urgente');
}

function abrirAsistente() {
    closeAll();
    showModal('modalAsistente');
    const mensajeElem = document.getElementById('asistente-mensaje');
    if (mensajeElem) {
        const consejos = getConsejosAsistente();
        let html = '<div style="margin-bottom:10px;">' + getSaludoValeria() + '</div>';
        for (let i = 0; i < consejos.length; i++) {
            html += '<div class="valeria-consejo">' + consejos[i] + '</div>';
        }
        mensajeElem.innerHTML = html;
    }
    actualizarBadgeValeria();
}

// ==========================================
// UI GENERAL
// ==========================================
function actualizarUI() {
    const diamElem = document.getElementById('diamonds');
    if (diamElem) {
        const valor = Math.floor(userData.diamonds || 0);
        diamElem.textContent = valor;
        const digitos = valor.toString().length;
        let tamano = 22;
        if (digitos >= 5) tamano = 17;
        if (digitos >= 7) tamano = 13;
        if (digitos >= 9) tamano = 11;
        diamElem.style.fontSize = tamano + 'px';
    }
    const rateElem = document.getElementById('rate');
    if (rateElem) rateElem.textContent = Math.floor(getTotalProduction());
    const promedioNiveles = ((userData.lvl_piscina || 0) + (userData.lvl_fabrica || 0) + (userData.lvl_escuela || 0) + (userData.lvl_hospital || 0)) / 4;
    const pctNivel = Math.min(100, Math.round((promedioNiveles / 50) * 100));
    const pctElem = document.getElementById('nivel-municipal-pct');
    if (pctElem) pctElem.textContent = pctNivel + '%';
    const gaugeNivel = document.getElementById('gauge-nivel');
    if (gaugeNivel) gaugeNivel.style.background = 'conic-gradient(#a78bfa ' + (pctNivel * 3.6) + 'deg, rgba(255,255,255,0.08) ' + (pctNivel * 3.6) + 'deg)';
    actualizarBadgeValeria();
    const ids = ['piscina', 'fabrica', 'escuela', 'hospital'];
    for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById('lvl_' + ids[i]);
        if (el) el.textContent = userData['lvl_' + ids[i]];
    }
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = userData.username || 'Usuario';
    const tituloElem = document.getElementById('titulo-tratamiento');
    if (tituloElem) tituloElem.textContent = getTituloAlcalde().toUpperCase();
    const cityNameElem = document.getElementById('city-name-display');
    if (cityNameElem) cityNameElem.textContent = userData.city_name ? '🏙️ ' + userData.city_name : '';
    const casinoSaldo = document.getElementById('casino-saldo');
    if (casinoSaldo) casinoSaldo.textContent = Math.floor(userData.diamonds);
    const casinoRescue = document.getElementById('casino-rescue');
    if (casinoRescue) casinoRescue.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
}

function showModal(id) {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById(id);
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'block';
}

function closeAll() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    const modals = [
        'modalPerfil', 'modalFriends', 'modalRanking', 'modalBank', 'modalStore',
        'modalCasino', 'modalTiming', 'modalMatch', 'modalBolsa', 'modalSubasta',
        'modalExpedicion', 'modalCrafting', 'modalEscuela', 'modalFabrica',
        'modalPiscina', 'modalHospital', 'modalDailyReward', 'modalAds',
        'modalAsistente', 'modalIdioma', 'modalHistorialPremios'
    ];
    modals.forEach(function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    });
    if (timingInterval) clearInterval(timingInterval);
    setActiveNav('perfil');
}

function setActiveNav(tab) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item, index) {
        item.classList.remove('active');
        if (tab === 'perfil' && index === 0) item.classList.add('active');
        if (tab === 'amigos' && index === 1) item.classList.add('active');
        if (tab === 'ranking' && index === 2) item.classList.add('active');
    });
}

// ==========================================
// PERFIL
// ==========================================
function openPerfil() {
    closeAll();
    actualizarPerfil();
    showModal('modalPerfil');
    setActiveNav('perfil');
}

function actualizarPerfil() {
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    let nombre = 'Usuario';
    if (usuario && usuario.first_name) nombre = usuario.first_name;
    else if (userData.username && userData.username !== 'Cargando...') nombre = userData.username;
    const nombreElem = document.getElementById('perfil-name');
    if (nombreElem) nombreElem.textContent = nombre;
    const avatarElem = document.getElementById('perfil-avatar');
    if (avatarElem) {
        if (usuario && usuario.photo_url) avatarElem.innerHTML = '<img src="' + usuario.photo_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        else avatarElem.innerHTML = nombre.charAt(0).toUpperCase();
    }
    const stats = {
        'perfil-diamonds': Math.floor(userData.diamonds || 0),
        'perfil-rate': Math.floor(getTotalProduction()),
        'perfil-piscina': 'Nivel ' + (userData.lvl_piscina || 0),
        'perfil-fabrica': 'Nivel ' + (userData.lvl_fabrica || 0),
        'perfil-escuela': 'Nivel ' + (userData.lvl_escuela || 0),
        'perfil-hospital': 'Nivel ' + (userData.lvl_hospital || 0),
        'perfil-amigos': (userData.referred_users || []).length,
        'perfil-rango-display': userData.rank || 'Ciudadano',
        'perfil-proyeccion': Math.floor(userData.projectedReward || 0) + ' 💎',
        'perfil-premium': esPremium() ? 'Sí ⭐' : 'No',
        'perfil-rank-badge': userData.rank || 'Ciudadano'
    };
    for (const id in stats) {
        const el = document.getElementById(id);
        if (el) el.textContent = stats[id];
    }
    const btnGeneroM = document.getElementById('perfil-genero-M');
    const btnGeneroF = document.getElementById('perfil-genero-F');
    if (btnGeneroM) btnGeneroM.classList.toggle('active', (userData.genero || 'M') === 'M');
    if (btnGeneroF) btnGeneroF.classList.toggle('active', userData.genero === 'F');
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    closeAll();
    const codigoElem = document.getElementById('referral-code');
    if (codigoElem) codigoElem.textContent = userData.referral_code || 'CARGANDO...';
    const countElem = document.getElementById('ref-count');
    if (countElem) countElem.textContent = (userData.referred_users || []).length;
    const totalElem = document.getElementById('ref-total');
    if (totalElem) totalElem.textContent = (userData.referral_earnings || 0) + ' 💎';
    showModal('modalFriends');
    setActiveNav('amigos');
}

function copyReferralCode() {
    if (!userData.referral_code) return alert('❌ Código de referencia no disponible');
    const enlaceCompleto = 'https://t.me/DiamondCityBot?start=' + userData.referral_code;
    const mensaje = '🏙️💎 ¡Únete a Diamond City!\n\n' +
        '🏢 Construye tu propia metrópolis\n' +
        '💎 Genera diamantes con tus edificios\n' +
        '📈 Invierte, subasta y craftea\n' +
        '🏆 Compite por ser el mejor alcalde\n\n' +
        '¡Entra con mi enlace y arrancamos juntos! 👇\n' + enlaceCompleto;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mensaje).then(function() {
            alert('✅ ¡Mensaje de invitación copiado!');
        }).catch(function() {
            prompt('Copia este mensaje:', mensaje);
        });
    } else {
        prompt('Copia este mensaje:', mensaje);
    }
}

// ==========================================
// RANKING
// ==========================================
function openRanking() {
    closeAll();
    actualizarRankingModal();
    showModal('modalRanking');
    setActiveNav('ranking');
}

function actualizarRankingModal() {
    const rangoElem = document.getElementById('user-rank-display');
    if (rangoElem) rangoElem.textContent = userData.rank || 'Ciudadano';
    const posicionElem = document.getElementById('user-position-display');
    if (posicionElem) posicionElem.textContent = userData.weekly_rank ? '#' + userData.weekly_rank : 'Sin calcular';
    const proyeccionElem = document.getElementById('projected-reward-display');
    if (proyeccionElem) proyeccionElem.textContent = Math.floor(userData.projectedReward || 0) + ' 💎';

    const lista = document.getElementById('ranking-lista');
    if (!lista) return;
    const top = globalPoolData.user_rankings.slice(0, 30);
    if (top.length === 0) {
        lista.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Todavía no hay suficientes alcaldes registrados.</div>';
        return;
    }
    let html = '';
    for (let i = 0; i < top.length; i++) {
        const j = top[i];
        const esYo = j.id === userData.id;
        const medalla = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1)));
        html += '<div class="ranking-fila' + (esYo ? ' yo' : '') + '">';
        html += '<div class="ranking-pos">' + medalla + '</div>';
        const tituloJugador = j.genero === 'F' ? 'Alcaldesa' : 'Alcalde';
        html += '<div class="ranking-info"><div class="ranking-ciudad">🏙️ ' + j.city_name + '</div><div class="ranking-alcalde">' + (esYo ? 'Tú · ' : '') + tituloJugador + ' ' + j.username + '</div></div>';
        html += '<div class="ranking-produccion">⚡' + Math.floor(j.produccion) + '/h</div>';
        html += '</div>';
    }
    lista.innerHTML = html;
}

async function abrirHistorialPremios() {
    closeAll();
    showModal('modalHistorialPremios');
    const cont = document.getElementById('historial-premios-lista');
    if (!cont) return;
    cont.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Cargando...</div>';
    try {
        const resultado = await _supabase.from('payout_history').select('*').order('fecha', { ascending: false }).limit(30);
        const filas = (resultado && resultado.data) || [];
        if (filas.length === 0) {
            cont.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Todavía no se ha procesado ningún pago semanal.</div>';
            return;
        }
        let html = '';
        for (let i = 0; i < filas.length; i++) {
            const f = filas[i];
            const fecha = new Date(f.fecha).toLocaleDateString();
            html += '<div class="feed-item"><div class="feed-icono">💎</div><div class="feed-texto"><div class="feed-titulo">#' + f.posicion + ' · 🏙️ ' + (f.city_name || 'Ciudad') + ' (' + (f.username || 'Alcalde') + ')</div><div class="feed-subtitulo">+' + f.premio + ' 💎 pagados</div><div class="feed-tiempo">' + fecha + '</div></div></div>';
        }
        cont.innerHTML = html;
    } catch (error) {
        cont.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">No se pudo cargar el historial.</div>';
    }
}

// ==========================================
// BANCO
// ==========================================
function openBank() {
    closeAll();
    showModal('modalBank');
    actualizarListaCompra();
}

function actualizarListaCompra() {
    let walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) walletConectada = true;
    const packs = [
        { ton: 0.10, diamonds: 100 },
        { ton: 0.50, diamonds: 500 },
        { ton: 1.00, diamonds: 1000 },
        { ton: 2.00, diamonds: 2000 },
        { ton: 5.00, diamonds: 5000 },
        { ton: 10.00, diamonds: 10000 }
    ];
    const bankList = document.getElementById('bankList');
    if (!bankList) return;
    let html = '';
    for (let i = 0; i < packs.length; i++) {
        const pack = packs[i];
        const botonColor = walletConectada ? '#4ade80' : '#334155';
        const botonTexto = walletConectada ? 'COMPRAR' : 'CONECTAR';
        const botonDisabled = walletConectada ? '' : 'disabled';
        html += '<div style="background:#0f172a;border-radius:12px;padding:16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;">';
        html += '<div><strong>' + pack.ton.toFixed(2) + ' GRAM</strong><div style="font-size:12px;color:#94a3b8;">+' + pack.diamonds + ' 💎</div></div>';
        html += '<button onclick="comprarTON(' + pack.ton + ')" style="background:' + botonColor + ';border:none;padding:10px 20px;border-radius:30px;color:white;font-weight:700;cursor:pointer;" ' + botonDisabled + '>' + botonTexto + '</button>';
        html += '</div>';
    }
    bankList.innerHTML = html;
}

async function comprarTON(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet primero');
    const diamantesAComprar = Math.max(100, Math.floor(tonAmount / CONFIG.PRECIO_COMPRA));
    if (!confirm('¿Confirmas la compra?\n\nPagarás: ' + tonAmount.toFixed(2) + ' GRAM\nRecibirás: ' + diamantesAComprar + ' 💎')) return;
    try {
        const transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: CONFIG.BILLETERA_PROPIETARIO,
                amount: Math.floor(tonAmount * 1000000000).toString()
            }]
        };
        await tonConnectUI.sendTransaction(transaccion);
        userData.diamonds += diamantesAComprar;
        userData.haInvertido = true;
        registrarEvento('💎', 'Compra de diamantes confirmada', '+' + diamantesAComprar + ' 💎 acreditados');
        await saveUserData();
        actualizarUI();
        spawnConfetti();
        alert('✅ ¡Compra exitosa!\n\nRecibiste ' + diamantesAComprar + ' 💎');
        closeAll();
    } catch (error) {
        console.error('Error en compra:', error);
        alert('❌ Error: ' + (error.message || 'La transacción fue cancelada o rechazada'));
    }
}

// ==========================================
// TON CONNECT
// ==========================================
async function initTONConnect() {
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://nyper95.github.io/ton-city-game/tonconnect-manifest.json',
            buttonRootId: 'ton-connect-button',
            uiPreferences: { theme: 'DARK' }
        });
        tonConnectUI.onStatusChange(function(wallet) {
            currentWallet = wallet;
            const botonConnect = document.getElementById('ton-connect-button');
            const walletInfo = document.getElementById('wallet-info');
            if (wallet) {
                if (botonConnect) botonConnect.style.display = 'none';
                if (walletInfo) walletInfo.classList.remove('hidden');
            } else {
                if (botonConnect) botonConnect.style.display = 'flex';
                if (walletInfo) walletInfo.classList.add('hidden');
            }
            const modalBank = document.getElementById('modalBank');
            if (modalBank && modalBank.style.display === 'block') {
                actualizarListaCompra();
            }
        });
        console.log('✅ TON Connect inicializado');
    } catch (error) {
        console.error('Error TON Connect:', error);
    }
}

async function disconnectWallet() {
    if (tonConnectUI) await tonConnectUI.disconnect();
    currentWallet = null;
    const botonConnect = document.getElementById('ton-connect-button');
    const walletInfo = document.getElementById('wallet-info');
    if (botonConnect) botonConnect.style.display = 'flex';
    if (walletInfo) walletInfo.classList.add('hidden');
    actualizarListaCompra();
}

// ==========================================
// TIENDA PREMIUM
// ==========================================
function openStore() {
    closeAll();
    showModal('modalStore');
    let walletConectada = false;
    if (tonConnectUI && tonConnectUI.connected) walletConectada = true;
    const planesContainer = document.getElementById('premium-plans');
    if (!planesContainer) return;
    let html = '';
    for (let i = 0; i < PREMIUM_PLANS.length; i++) {
        const plan = PREMIUM_PLANS[i];
        const botonColor = walletConectada ? '#8b5cf6' : '#334155';
        const botonTexto = walletConectada ? 'COMPRAR' : 'CONECTAR WALLET';
        const botonDisabled = walletConectada ? '' : 'disabled';
        html += '<div style="background:#0f172a;border-radius:16px;padding:20px;margin:12px 0;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
        html += '<strong style="font-size:18px;">' + plan.name + '</strong>';
        html += '<span style="color:#facc15;font-weight:700;font-size:18px;">' + plan.price + ' GRAM</span>';
        html += '</div>';
        html += '<button onclick="comprarPremium(' + plan.days + ')" style="background:' + botonColor + ';border:none;border-radius:30px;padding:14px;width:100%;color:white;font-weight:700;font-size:16px;cursor:pointer;" ' + botonDisabled + '>' + botonTexto + '</button>';
        html += '</div>';
    }
    planesContainer.innerHTML = html;
}

async function comprarPremium(days) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet primero');
    let planSeleccionado = null;
    for (let i = 0; i < PREMIUM_PLANS.length; i++) {
        if (PREMIUM_PLANS[i].days === days) { planSeleccionado = PREMIUM_PLANS[i]; break; }
    }
    if (!planSeleccionado) return alert('❌ Plan no encontrado');
    if (!confirm('¿Activar Premium ' + planSeleccionado.name + ' por ' + planSeleccionado.price + ' GRAM?')) return;
    try {
        const transaccion = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{
                address: CONFIG.BILLETERA_PROPIETARIO,
                amount: Math.floor(planSeleccionado.price * 1000000000).toString()
            }]
        };
        await tonConnectUI.sendTransaction(transaccion);
        const fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + days);
        userData.premium_expires = fechaExpiracion.toISOString();
        userData.haInvertido = true;
        registrarEvento('⭐', 'Estatus Premium activado', planSeleccionado.name + ' · Producción x2 habilitada');
        await saveUserData();
        actualizarPremiumUI();
        actualizarUI();
        spawnConfetti();
        alert('✅ ¡Premium ' + planSeleccionado.name + ' activado!');
        closeAll();
    } catch (error) {
        console.error('Error al comprar Premium:', error);
        alert('❌ La transacción fue cancelada o rechazada');
    }
}

// ==========================================
// ADSGRAM Y ANUNCIOS
// ==========================================
async function initAds() {
    try {
        AdController = window.Adsgram.init({ blockId: CONFIG.ADSGRAM_BLOCK_ID });
        adsReady = true;
        console.log('✅ AdSgram inicializado');
    } catch (error) {
        adsReady = false;
        console.error('❌ Error AdSgram:', error);
    }
}

function showRewardedAd(callback) {
    if (esPremium()) { callback(true); return; }
    if (!adsReady || !AdController) {
        alert('📺 El sistema de anuncios no está disponible');
        callback(false);
        return;
    }
    AdController.show()
        .then(function(resultado) { callback(resultado.done === true); })
        .catch(function(error) { console.log('Error anuncio:', error); callback(false); });
}

function showAdsModal() {
    closeAll();
    showModal('modalAds');
    actualizarEstadoAnuncio();
}

function actualizarEstadoAnuncio() {
    let puedeVerAnuncio = false;
    if (!userData.last_ad_watch) puedeVerAnuncio = true;
    else {
        const ultimoAnuncio = new Date(userData.last_ad_watch);
        const diferenciaMs = new Date() - ultimoAnuncio;
        if (diferenciaMs > 3600000) puedeVerAnuncio = true;
    }
    const boton = document.getElementById('watch-ad-btn');
    const estadoDiv = document.getElementById('ads-status');
    if (!boton) return;
    if (esPremium()) {
        boton.disabled = true;
        boton.textContent = '⭐ PREMIUM - ANUNCIOS ILIMITADOS';
        if (estadoDiv) estadoDiv.innerHTML = '⭐ Como usuario Premium, no necesitas ver anuncios';
        return;
    }
    if (puedeVerAnuncio && adsReady) {
        boton.disabled = false;
        boton.textContent = '🎬 VER ANUNCIO +20 💎';
        if (estadoDiv) estadoDiv.innerHTML = '✅ ¡Anuncio disponible!';
    } else {
        boton.disabled = true;
        let minutosRestantes = 60;
        if (userData.last_ad_watch) {
            const ultimo = new Date(userData.last_ad_watch);
            const msRestantes = 3600000 - (new Date() - ultimo);
            minutosRestantes = Math.ceil(msRestantes / 60000);
        }
        boton.textContent = '⏳ ESPERAR ' + minutosRestantes + ' MIN';
        if (estadoDiv) estadoDiv.innerHTML = '⏳ Próximo anuncio en ' + minutosRestantes + ' minutos';
    }
}

async function refrescarDiamantesDesdeServidor() {
    if (!userData.id) return;
    try {
        const resultado = await _supabase.from('game_data').select('diamonds, news_feed').eq('telegram_id', userData.id).maybeSingle();
        if (resultado.data) {
            userData.diamonds = Number(resultado.data.diamonds) || userData.diamonds;
            if (resultado.data.news_feed) userData.newsFeed = resultado.data.news_feed;
            actualizarUI();
            renderizarFeedNoticias();
        }
    } catch (error) { console.error('Error refrescando diamantes:', error); }
}

function showAd() {
    if (esPremium()) {
        userData.diamonds += 20;
        saveUserData();
        actualizarUI();
        alert('⭐ Como usuario Premium, recibes +20 💎');
        closeAll();
        return;
    }
    showRewardedAd(function(completado) {
        if (completado) {
            userData.last_ad_watch = new Date().toISOString();
            userData.diamonds += 20;
            saveUserData();
            actualizarUI();
            alert('🎁 ¡Gracias por ver el anuncio! +20 💎');
            closeAll();
        } else {
            alert('❌ No se pudo completar el anuncio');
        }
    });
}

function rescueWithAd() {
    if (esPremium()) {
        userData.diamonds += 50;
        actualizarUI();
        alert('⭐ Rescate Premium: +50 💎');
        return;
    }
    if (userData.diamonds > 0) return alert('El rescate solo está disponible cuando tienes 0 diamantes');
    const hoy = new Date();
    if (userData.last_casino_rescue) {
        const ultimoRescate = new Date(userData.last_casino_rescue);
        if (hoy.toDateString() === ultimoRescate.toDateString()) return alert('Ya usaste el rescate hoy');
    }
    showRewardedAd(function(completado) {
        if (completado) {
            userData.last_casino_rescue = new Date().toISOString();
            userData.diamonds += 50;
            saveUserData();
            actualizarUI();
            alert('🎁 +50 💎 de rescate');
            closeAll();
        }
    });
}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= 30) return esPremium() ? 300 : 150;
    let base = 5 + (day - 1) * 3;
    if (base > 150) base = 150;
    return esPremium() ? base * 2 : base;
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    const ultimoReclamo = new Date(userData.last_daily_claim);
    const hoy = new Date();
    ultimoReclamo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    return hoy > ultimoReclamo;
}

function openDailyReward() {
    closeAll();
    const racha = userData.daily_streak || 0;
    const diaActual = Math.min(racha + 1, 30);
    const recompensaHoy = getDailyRewardAmount(diaActual);
    const puedeReclamar = puedeReclamarDiaria();
    const diaElem = document.getElementById('current-day');
    if (diaElem) diaElem.textContent = diaActual;
    const recompensaElem = document.getElementById('today-reward');
    if (recompensaElem) recompensaElem.textContent = recompensaHoy + ' 💎';
    const estadoElem = document.getElementById('daily-status');
    if (estadoElem) estadoElem.innerHTML = puedeReclamar ? '✅ ¡Recompensa disponible!' : '⏳ Vuelve mañana';
    const calendarioElem = document.getElementById('daily-calendar');
    if (calendarioElem) {
        let html = '';
        for (let i = 1; i <= 30; i++) {
            let clase = 'daily-day';
            if (i <= racha) clase += ' completed';
            else if (i === racha + 1 && puedeReclamar) clase += ' current';
            html += '<div class="' + clase + '"><div>Día ' + i + '</div><div>' + getDailyRewardAmount(i) + '💎</div></div>';
        }
        calendarioElem.innerHTML = html;
    }
    showModal('modalDailyReward');
}

async function claimDailyReward() {
    if (!userData.id) return alert('❌ Error: Usuario no identificado');
    if (!puedeReclamarDiaria()) return alert('❌ Ya reclamaste tu recompensa hoy');
    let nuevoDia = 1;
    if (userData.last_daily_claim && userData.daily_streak > 0) {
        const ultimoReclamo = new Date(userData.last_daily_claim);
        const horasTranscurridas = (new Date() - ultimoReclamo) / (1000 * 3600);
        if (horasTranscurridas < 48) nuevoDia = userData.daily_streak + 1;
    }
    if (nuevoDia > 30) nuevoDia = 30;
    const recompensa = getDailyRewardAmount(nuevoDia);
    userData.diamonds += recompensa;
    userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    registrarEvento('🎁', 'Recompensa diaria reclamada', 'Día ' + nuevoDia + ' de 30 · +' + recompensa + ' 💎');
    await saveUserData();
    actualizarUI();
    spawnConfetti();
    alert('✅ ¡Recompensa reclamada!\n\n+ ' + recompensa + ' 💎\nDía ' + nuevoDia + ' de 30');
    closeAll();
}

// ==========================================
// CENTRO FINANCIERO (sustituye al Casino)
// ==========================================
function openCasino() {
    closeAll();
    const saldoElem = document.getElementById('casino-saldo');
    if (saldoElem) saldoElem.textContent = Math.floor(userData.diamonds);
    const rescueDiv = document.getElementById('casino-rescue');
    if (rescueDiv) rescueDiv.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
    showModal('modalCasino');
}

function abrirJuego(juego) {
    closeAll();
    const map = {
        timing: 'modalTiming',
        matchmental: 'modalMatch',
        bolsa: 'modalBolsa',
        subasta: 'modalSubasta',
        expedicion: 'modalExpedicion',
        crafting: 'modalCrafting'
    };
    const modalId = map[juego];
    if (!modalId) return;
    showModal(modalId);
    const prefijo = juego === 'matchmental' ? 'match' : juego;
    const bal = document.getElementById(prefijo + '-balance');
    if (bal) bal.textContent = Math.floor(userData.diamonds);
    if (juego === 'timing') prepararTimingUI();
    if (juego === 'matchmental') prepararMatchUI();
    if (juego === 'bolsa') renderBolsa();
    if (juego === 'subasta') renderSubasta();
    if (juego === 'expedicion') renderExpedicion();
    if (juego === 'crafting') renderCrafting();
}

function cerrarJuego() {
    closeAll();
    openCasino();
}

function cambiarApuesta(juego, delta) {
    const prefijos = { timing: 'timing', matchmental: 'match' };
    const prefijo = prefijos[juego] || juego;
    let actual = apuestaActual[juego] || 10;
    actual += delta;
    if (actual < 1) actual = 1;
    if (actual > 1000) actual = 1000;
    apuestaActual[juego] = actual;
    const displayElem = document.getElementById(prefijo + '-bet-display');
    if (displayElem) displayElem.textContent = actual;
    const betElem = document.getElementById(prefijo + '-bet');
    if (betElem) betElem.textContent = actual + ' 💎';
}

function puedeJugar(juego, cantidad) {
    if (!cantidad) cantidad = 1;
    if (userData.haInvertido) return true;
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) {
        userData.jugadasHoy = { timing: 0, matchmental: 0, bolsa: 0, subasta: 0, expedicion: 0, crafting: 0, fecha: hoy };
    }
    const limites = { timing: 20, matchmental: 15, bolsa: 30, subasta: 20, expedicion: 10, crafting: 30 };
    const jugadasActuales = userData.jugadasHoy[juego] || 0;
    return (jugadasActuales + cantidad) <= (limites[juego] || 10);
}

function registrarJugada(juego, cantidad) {
    if (!cantidad) cantidad = 1;
    if (!userData.haInvertido) {
        if (!userData.jugadasHoy[juego]) userData.jugadasHoy[juego] = 0;
        userData.jugadasHoy[juego] += cantidad;
    }
}

// ==========================================
// TIMING TAP
// ==========================================
let timingInterval = null;
let timingPos = 0;
let timingDir = 1;
let timingVelocidad = 1.5;
let timingZonaInicio = 40;
let timingZonaAncho = 20;
let timingEnJuego = false;

function prepararTimingUI() {
    timingZonaInicio = 30 + Math.random() * 30;
    timingZonaAncho = 8 + Math.random() * 12;
    const zone = document.getElementById('timing-zone');
    if (zone) {
        zone.style.left = timingZonaInicio + '%';
        zone.style.width = timingZonaAncho + '%';
    }
    const needle = document.getElementById('timing-needle');
    if (needle) needle.style.left = '0%';
    timingPos = 0;
    timingDir = 1;
    timingVelocidad = 1.5 + Math.random();
    timingEnJuego = false;
    const startBtn = document.getElementById('timing-start-btn');
    const tapBtn = document.getElementById('timing-tap-btn');
    if (startBtn) startBtn.classList.remove('hidden');
    if (tapBtn) tapBtn.classList.add('hidden');
    const res = document.getElementById('timing-result');
    if (res) res.innerHTML = '';
    const betDisp = document.getElementById('timing-bet-display');
    if (betDisp) betDisp.textContent = apuestaActual.timing || 10;
    const betElem = document.getElementById('timing-bet');
    if (betElem) betElem.textContent = (apuestaActual.timing || 10) + ' 💎';
}

function iniciarTiming() {
    const apuesta = apuestaActual.timing || 10;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('timing')) return alert('❌ Límite diario alcanzado');
    userData.diamonds -= apuesta;
    registrarJugada('timing');
    actualizarUI();
    const balance = document.getElementById('timing-balance');
    if (balance) balance.textContent = Math.floor(userData.diamonds);
    const startBtn = document.getElementById('timing-start-btn');
    const tapBtn = document.getElementById('timing-tap-btn');
    if (startBtn) startBtn.classList.add('hidden');
    if (tapBtn) tapBtn.classList.remove('hidden');
    timingPos = 0;
    timingDir = 1;
    timingEnJuego = true;
    if (timingInterval) clearInterval(timingInterval);
    timingInterval = setInterval(function() {
        timingPos += timingVelocidad * timingDir;
        if (timingPos >= 100) { timingPos = 100; timingDir = -1; }
        if (timingPos <= 0) { timingPos = 0; timingDir = 1; }
        const needle = document.getElementById('timing-needle');
        if (needle) needle.style.left = timingPos + '%';
    }, 16);
}

function detenerTiming() {
    if (!timingEnJuego) return;
    timingEnJuego = false;
    if (timingInterval) clearInterval(timingInterval);
    timingInterval = null;
    const tapBtn = document.getElementById('timing-tap-btn');
    if (tapBtn) tapBtn.classList.add('hidden');
    const apuesta = apuestaActual.timing || 10;
    const dentro = timingPos >= timingZonaInicio && timingPos <= (timingZonaInicio + timingZonaAncho);
    const centroZona = timingZonaInicio + timingZonaAncho / 2;
    const distanciaCentro = Math.abs(timingPos - centroZona);
    let multiplicador = 0;
    if (dentro) {
        const precision = 1 - (distanciaCentro / (timingZonaAncho / 2));
        multiplicador = 2 + precision * 3;
    } else if (distanciaCentro < timingZonaAncho) {
        multiplicador = 1;
    }
    const res = document.getElementById('timing-result');
    if (multiplicador > 0) {
        const premio = Math.floor(apuesta * multiplicador);
        userData.diamonds += premio;
        if (res) res.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎯 ¡x' + multiplicador.toFixed(1) + '! +' + premio + ' 💎</span>';
        spawnConfetti();
        if (navigator.vibrate) navigator.vibrate(50);
        destelloResultado('modalTiming', true);
    } else {
        if (res) res.innerHTML = '<span style="color:#ef4444;">❌ Fallaste, perdiste ' + apuesta + ' 💎</span>';
        destelloResultado('modalTiming', false);
    }
    actualizarUI();
    saveUserData();
    const balance = document.getElementById('timing-balance');
    if (balance) balance.textContent = Math.floor(userData.diamonds);
    setTimeout(prepararTimingUI, 1500);
}

// ==========================================
// MATCH MENTAL
// ==========================================
const SIMBOLOS_MATCH = ['💎', '⚡', '🏭', '🏦', '🏫', '🏥'];
let matchSecuencia = [];
let matchInput = [];
let matchRonda = 0;
const matchMaxRondas = 5;
let matchMostrando = false;

function prepararMatchUI() {
    matchSecuencia = [];
    matchInput = [];
    matchRonda = 0;
    matchMostrando = false;
    renderMatchGrid(false);
    const res = document.getElementById('match-result');
    if (res) res.innerHTML = '';
    const betDisp = document.getElementById('match-bet-display');
    if (betDisp) betDisp.textContent = apuestaActual.matchmental || 10;
    const betElem = document.getElementById('match-bet');
    if (betElem) betElem.textContent = (apuestaActual.matchmental || 10) + ' 💎';
}

function renderMatchGrid(activo) {
    const cont = document.getElementById('match-display');
    if (!cont) return;
    let html = '';
    for (let i = 0; i < 6; i++) {
        html += '<div class="sequence-card" data-idx="' + i + '" onclick="clickMatch(' + i + ')" style="cursor:' + (activo ? 'pointer' : 'default') + ';">' + SIMBOLOS_MATCH[i] + '</div>';
    }
    cont.innerHTML = html;
}

async function iniciarMatch() {
    const apuesta = apuestaActual.matchmental || 10;
    if (userData.diamonds < apuesta) return alert('❌ Diamantes insuficientes');
    if (!puedeJugar('matchmental')) return alert('❌ Límite diario alcanzado');
    userData.diamonds -= apuesta;
    registrarJugada('matchmental');
    actualizarUI();
    const balance = document.getElementById('match-balance');
    if (balance) balance.textContent = Math.floor(userData.diamonds);
    matchRonda = 1;
    matchSecuencia = [];
    await siguienteRondaMatch();
}

async function siguienteRondaMatch() {
    matchInput = [];
    matchMostrando = true;
    const res = document.getElementById('match-result');
    if (res) res.innerHTML = '<span style="color:#a78bfa;">👀 Memoriza...</span>';
    matchSecuencia.push(Math.floor(Math.random() * 6));
    renderMatchGrid(false);
    for (let i = 0; i < matchSecuencia.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        const card = document.querySelector('#match-display [data-idx="' + matchSecuencia[i] + '"]');
        if (card) card.classList.add('highlight');
        await new Promise(r => setTimeout(r, 450));
        if (card) card.classList.remove('highlight');
        await new Promise(r => setTimeout(r, 150));
    }
    matchMostrando = false;
    if (res) res.innerHTML = '<span style="color:#facc15;">✋ Tu turno (ronda ' + matchRonda + '/' + matchMaxRondas + ')</span>';
    renderMatchGrid(true);
}

function clickMatch(idx) {
    if (matchMostrando) return;
    if (matchInput.length >= matchSecuencia.length) return;
    matchInput.push(idx);
    const card = document.querySelector('#match-display [data-idx="' + idx + '"]');
    if (card) {
        card.classList.add('highlight');
        setTimeout(function() { card.classList.remove('highlight'); }, 200);
    }
    const pos = matchInput.length - 1;
    if (matchInput[pos] !== matchSecuencia[pos]) {
        matchMostrando = true;
        const res = document.getElementById('match-result');
        if (res) res.innerHTML = '<span style="color:#ef4444;">❌ Secuencia incorrecta. Llegaste a la ronda ' + matchRonda + '</span>';
        destelloResultado('modalMatch', false);
        actualizarUI();
        saveUserData();
        setTimeout(prepararMatchUI, 2500);
        return;
    }
    if (matchInput.length === matchSecuencia.length) {
        matchRonda++;
        if (matchRonda > matchMaxRondas) {
            finalizarMatch();
        } else {
            matchMostrando = true;
            setTimeout(siguienteRondaMatch, 800);
        }
    }
}

function finalizarMatch() {
    const apuesta = apuestaActual.matchmental || 10;
    const multiplicador = 1.5 + (matchRonda - 2) * 0.5;
    const premio = Math.floor(apuesta * Math.max(1.5, multiplicador));
    userData.diamonds += premio;
    const res = document.getElementById('match-result');
    if (res) res.innerHTML = '<span style="color:#4ade80;font-size:20px;">🧠 ¡Completaste ' + (matchRonda - 1) + ' rondas! +' + premio + ' 💎</span>';
    spawnConfetti();
    if (navigator.vibrate) navigator.vibrate(100);
    destelloResultado('modalMatch', true);
    actualizarUI();
    saveUserData();
    const balance = document.getElementById('match-balance');
    if (balance) balance.textContent = Math.floor(userData.diamonds);
    setTimeout(prepararMatchUI, 2000);
}

// ==========================================
// BOLSA
// ==========================================
const ACCIONES_BOLSA = [
    { id: 'mina', nombre: 'Minas del Norte', icono: '⛏️', precio: 100, tendencia: 0 },
    { id: 'banco', nombre: 'Banco Central', icono: '🏦', precio: 250, tendencia: 0 },
    { id: 'fabrica', nombre: 'Industria Pesada', icono: '🏭', precio: 180, tendencia: 0 },
    { id: 'energia', nombre: 'Energía Solar', icono: '☀️', precio: 320, tendencia: 0 }
];

function renderBolsa() {
    const cont = document.getElementById('bolsa-acciones');
    if (!cont) return;
    let html = '';
    for (let i = 0; i < ACCIONES_BOLSA.length; i++) {
        const a = ACCIONES_BOLSA[i];
        const variacion = a.tendencia;
        const color = variacion >= 0 ? '#4ade80' : '#ef4444';
        const flecha = variacion >= 0 ? '▲' : '▼';
        html += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">';
        html += '<div><div style="font-weight:700;">' + a.icono + ' ' + a.nombre + '</div>';
        html += '<div style="font-size:12px;color:' + color + ';">' + flecha + ' ' + Math.abs(variacion).toFixed(1) + '% · ' + a.precio + ' 💎</div></div>';
        html += '<div style="display:flex;gap:6px;">';
        html += '<button onclick="comprarAccion(\'' + a.id + '\')" style="background:#4ade80;border:none;color:#000;padding:8px 14px;border-radius:12px;font-weight:700;">Comprar</button>';
        html += '<button onclick="venderAccion(\'' + a.id + '\')" style="background:#ef4444;border:none;color:white;padding:8px 14px;border-radius:12px;font-weight:700;">Vender</button>';
        html += '</div></div>';
    }
    cont.innerHTML = html;
    renderPortfolio();
    const bal = document.getElementById('bolsa-balance');
    if (bal) bal.textContent = Math.floor(userData.diamonds);
}

function renderPortfolio() {
    const cont = document.getElementById('bolsa-portfolio-lista');
    if (!cont) return;
    const portfolio = userData.bolsa_portfolio || {};
    const claves = Object.keys(portfolio).filter(k => portfolio[k] > 0);
    if (claves.length === 0) {
        cont.textContent = 'Sin inversiones todavía';
        return;
    }
    let html = '';
    let total = 0;
    for (let i = 0; i < claves.length; i++) {
        const a = ACCIONES_BOLSA.find(x => x.id === claves[i]);
        if (!a) continue;
        const cantidad = portfolio[a.id];
        const valor = cantidad * a.precio;
        total += valor;
        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + a.icono + ' ' + cantidad + ' × ' + a.nombre + '</span><span>' + valor + ' 💎</span></div>';
    }
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-weight:700;color:var(--primary);">Total: ' + total + ' 💎</div>';
    cont.innerHTML = html;
}

function comprarAccion(id) {
    const a = ACCIONES_BOLSA.find(x => x.id === id);
    if (!a) return;
    if (userData.diamonds < a.precio) return alert('❌ Diamantes insuficientes');
    userData.diamonds -= a.precio;
    if (!userData.bolsa_portfolio) userData.bolsa_portfolio = {};
    userData.bolsa_portfolio[id] = (userData.bolsa_portfolio[id] || 0) + 1;
    registrarJugada('bolsa');
    actualizarUI();
    saveUserData();
    renderBolsa();
}

function venderAccion(id) {
    const a = ACCIONES_BOLSA.find(x => x.id === id);
    if (!a) return;
    if (!userData.bolsa_portfolio || !userData.bolsa_portfolio[id] || userData.bolsa_portfolio[id] <= 0) return alert('❌ No tienes acciones de ' + a.nombre);
    userData.bolsa_portfolio[id]--;
    userData.diamonds += a.precio;
    registrarJugada('bolsa');
    actualizarUI();
    saveUserData();
    renderBolsa();
}

function tickBolsa() {
    for (let i = 0; i < ACCIONES_BOLSA.length; i++) {
        const a = ACCIONES_BOLSA[i];
        const cambioPct = (Math.random() - 0.48) * 8;
        a.precio = Math.max(10, Math.floor(a.precio * (1 + cambioPct / 100)));
        a.tendencia = cambioPct;
    }
    const modal = document.getElementById('modalBolsa');
    if (modal && modal.style.display === 'block') renderBolsa();
}

// ==========================================
// SUBASTA
// ==========================================
let subastaItems = [
    { id: 's1', nombre: 'Licencia de producción x2 (1h)', icono: '📜', precioActual: 500, puja: null, termina: Date.now() + 300000 },
    { id: 's2', nombre: 'Acelerador de minado (30min)', icono: '⚡', precioActual: 300, puja: null, termina: Date.now() + 600000 },
    { id: 's3', nombre: 'Avatar exclusivo "Diamante"', icono: '💠', precioActual: 800, puja: null, termina: Date.now() + 900000 }
];

function renderSubasta() {
    const cont = document.getElementById('subasta-lista');
    if (!cont) return;
    let html = '';
    const ahora = Date.now();
    for (let i = 0; i < subastaItems.length; i++) {
        const it = subastaItems[i];
        const restante = Math.max(0, Math.floor((it.termina - ahora) / 1000));
        const min = Math.floor(restante / 60);
        const seg = restante % 60;
        const activa = restante > 0;
        html += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<div><div style="font-weight:700;">' + it.icono + ' ' + it.nombre + '</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary);">Puja actual: ' + it.precioActual + ' 💎 · ⏱ ' + min + ':' + String(seg).padStart(2, '0') + '</div>';
        if (it.puja) html += '<div style="font-size:11px;color:#4ade80;">Líder: ' + it.puja + '</div>';
        html += '</div>';
        if (activa) html += '<button onclick="pujarSubasta(\'' + it.id + '\')" style="background:#facc15;color:#000;border:none;padding:10px 16px;border-radius:12px;font-weight:700;">PUJAR</button>';
        else html += '<span style="color:#ef4444;font-weight:700;">CERRADA</span>';
        html += '</div></div>';
    }
    cont.innerHTML = html;
    const bal = document.getElementById('subasta-balance');
    if (bal) bal.textContent = Math.floor(userData.diamonds);
}

function pujarSubasta(id) {
    const it = subastaItems.find(x => x.id === id);
    if (!it) return;
    if (Date.now() > it.termina) return alert('❌ Subasta cerrada');
    const incremento = Math.max(10, Math.floor(it.precioActual * 0.1));
    const nuevaPuja = it.precioActual + incremento;
    if (userData.diamonds < nuevaPuja) return alert('❌ Necesitas ' + nuevaPuja + ' 💎');
    if (!confirm('¿Pujar ' + nuevaPuja + ' 💎 por "' + it.nombre + '"?')) return;
    userData.diamonds -= nuevaPuja;
    it.precioActual = nuevaPuja;
    it.puja = userData.username;
    registrarJugada('subasta');
    actualizarUI();
    saveUserData();
    renderSubasta();
    alert('✅ Puja registrada. ¡Eres el líder!');
}

// ==========================================
// EXPEDICIONES
// ==========================================
const ZONAS_EXPEDICION = [
    { id: 'z1', nombre: 'Cantera Sur', icono: '🪨', costo: 100, duracion: 60, recompensaBase: 180, riesgo: 0.15 },
    { id: 'z2', nombre: 'Mina Abandonada', icono: '⛏️', costo: 300, duracion: 180, recompensaBase: 600, riesgo: 0.30 },
    { id: 'z3', nombre: 'Cráter Profundo', icono: '🌋', costo: 800, duracion: 300, recompensaBase: 1800, riesgo: 0.45 }
];

function renderExpedicion() {
    const cont = document.getElementById('exp-zonas');
    if (!cont) return;
    let html = '';
    for (let i = 0; i < ZONAS_EXPEDICION.length; i++) {
        const z = ZONAS_EXPEDICION[i];
        html += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;">';
        html += '<div style="font-weight:700;margin-bottom:6px;">' + z.icono + ' ' + z.nombre + '</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">Costo: ' + z.costo + ' 💎 · Duración: ' + z.duracion + 's · Riesgo: ' + Math.floor(z.riesgo * 100) + '% · Retorno: ' + z.recompensaBase + ' 💎</div>';
        html += '<button onclick="lanzarExpedicion(\'' + z.id + '\')" style="background:#f97316;border:none;color:white;padding:10px 20px;border-radius:12px;font-weight:700;width:100%;">LANZAR</button>';
        html += '</div>';
    }
    cont.innerHTML = html;
    renderExpedicionesActivas();
    const bal = document.getElementById('exp-balance');
    if (bal) bal.textContent = Math.floor(userData.diamonds);
}

function renderExpedicionesActivas() {
    const cont = document.getElementById('exp-activas-lista');
    if (!cont) return;
    const activas = userData.expediciones_activas || [];
    if (activas.length === 0) {
        cont.textContent = 'Ninguna en curso';
        return;
    }
    const ahora = Date.now();
    let html = '';
    for (let i = 0; i < activas.length; i++) {
        const e = activas[i];
        const transcurrido = (ahora - e.inicio) / 1000;
        const pct = Math.min(100, Math.floor((transcurrido / e.duracion) * 100));
        const listo = transcurrido >= e.duracion;
        html += '<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">';
        html += '<div style="display:flex;justify-content:space-between;"><span>' + (e.icono || '⛏️') + ' ' + e.nombre + '</span><span>' + (listo ? '✅' : pct + '%') + '</span></div>';
        if (!listo) {
            html += '<div class="time-bar" style="margin-top:6px;"><div class="time-fill" style="width:' + pct + '%;"></div></div>';
        } else {
            html += '<button onclick="reclamarExpedicion(' + i + ')" style="background:#4ade80;color:#000;border:none;padding:8px 14px;border-radius:10px;font-weight:700;margin-top:6px;">RECLAMAR</button>';
        }
        html += '</div>';
    }
    cont.innerHTML = html;
}

function lanzarExpedicion(id) {
    const z = ZONAS_EXPEDICION.find(x => x.id === id);
    if (!z) return;
    if (userData.diamonds < z.costo) return alert('❌ Necesitas ' + z.costo + ' 💎');
    if (!puedeJugar('expedicion')) return alert('❌ Límite diario alcanzado');
    userData.diamonds -= z.costo;
    registrarJugada('expedicion');
    if (!userData.expediciones_activas) userData.expediciones_activas = [];
    userData.expediciones_activas.push({
        id: z.id,
        nombre: z.nombre,
        icono: z.icono,
        inicio: Date.now(),
        duracion: z.duracion,
        recompensa: z.recompensaBase,
        riesgo: z.riesgo
    });
    actualizarUI();
    saveUserData();
    renderExpedicion();
}

function reclamarExpedicion(idx) {
    const e = userData.expediciones_activas[idx];
    if (!e) return;
    let recompensa = e.recompensa;
    let nota = '';
    const roll = Math.random();
    if (roll < e.riesgo) {
        const perdida = Math.floor(recompensa * (0.2 + Math.random() * 0.3));
        recompensa -= perdida;
        nota = ' (desgaste: -' + perdida + ' 💎)';
    } else if (roll > 0.9) {
        const bonus = Math.floor(recompensa * 0.2);
        recompensa += bonus;
        nota = ' (bonus: +' + bonus + ' 💎)';
    }
    userData.diamonds += recompensa;
    userData.expediciones_activas.splice(idx, 1);
    actualizarUI();
    saveUserData();
    renderExpedicion();
    alert('⛏️ Expedición completada: +' + recompensa + ' 💎' + nota);
}

// ==========================================
// CRAFTING
// ==========================================
const RECETAS_CRAFT = [
    { id: 'c1', nombre: 'Pico de diamante', icono: '⛏️', costoBase: 200 },
    { id: 'c2', nombre: 'Refinería', icono: '🏭', costoBase: 500 },
    { id: 'c3', nombre: 'Banco de inversión', icono: '🏦', costoBase: 1200 }
];

function renderCrafting() {
    const cont = document.getElementById('craft-lista');
    if (!cont) return;
    if (!userData.craft_niveles) userData.craft_niveles = {};
    let html = '';
    for (let i = 0; i < RECETAS_CRAFT.length; i++) {
        const r = RECETAS_CRAFT[i];
        const nivel = userData.craft_niveles[r.id] || 0;
        const costo = Math.floor(r.costoBase * Math.pow(1.6, nivel));
        const puede = userData.diamonds >= costo;
        html += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;">';
        html += '<div style="font-weight:700;">' + r.icono + ' ' + r.nombre + ' (Nvl ' + nivel + ')</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary);margin:6px 0;">Próximo nivel: ' + (nivel + 1) + ' · Costo: ' + costo + ' 💎</div>';
        html += '<button onclick="craftear(\'' + r.id + '\')" style="background:' + (puede ? '#f472b6' : '#334155') + ';color:' + (puede ? '#000' : '#fff') + ';border:none;padding:10px 20px;border-radius:12px;font-weight:700;width:100%;" ' + (puede ? '' : 'disabled') + '>CRAFTEAR</button>';
        html += '</div>';
    }
    cont.innerHTML = html;
    const bal = document.getElementById('craft-balance');
    if (bal) bal.textContent = Math.floor(userData.diamonds);
}

function craftear(id) {
    const r = RECETAS_CRAFT.find(x => x.id === id);
    if (!r) return;
    if (!userData.craft_niveles) userData.craft_niveles = {};
    const nivel = userData.craft_niveles[r.id] || 0;
    const costo = Math.floor(r.costoBase * Math.pow(1.6, nivel));
    if (userData.diamonds < costo) return alert('❌ Diamantes insuficientes');
    userData.diamonds -= costo;
    userData.craft_niveles[r.id] = nivel + 1;
    registrarJugada('crafting');
    actualizarUI();
    saveUserData();
    renderCrafting();
    alert('✨ ¡Crafteaste ' + r.nombre + ' a nivel ' + (nivel + 1) + '!');
}

// Tick general: bolsa, expediciones, subasta
setInterval(function() {
    tickBolsa();
    const modalExp = document.getElementById('modalExpedicion');
    if (modalExp && modalExp.style.display === 'block') renderExpedicionesActivas();
    const modalSub = document.getElementById('modalSubasta');
    if (modalSub && modalSub.style.display === 'block') renderSubasta();
}, 30000);

setInterval(function() {
    const modalExp = document.getElementById('modalExpedicion');
    if (modalExp && modalExp.style.display === 'block') renderExpedicionesActivas();
}, 1000);

// ==========================================
// EDIFICIOS Y MEJORAS
// ==========================================
function openBuilding(building) {
    closeAll();
    const nombreCapitalizado = building.charAt(0).toUpperCase() + building.slice(1);
    const modalId = 'modal' + nombreCapitalizado;
    showModal(modalId);
    actualizarPanelMejora(building);
    const headerLevelElem = document.getElementById(building + '-game-level');
    if (headerLevelElem) headerLevelElem.textContent = userData['lvl_' + building] || 0;
}

function actualizarPanelMejora(building) {
    const nivel = userData['lvl_' + building] || 0;
    const producciones = { escuela: 15, fabrica: 25, piscina: 10, hospital: 18 };
    const preciosBase = { escuela: 500, fabrica: 1500, piscina: 800, hospital: 1200 };
    const produccion = nivel * producciones[building];
    const precio = Math.floor(preciosBase[building] * Math.pow(1.12, nivel));
    const nivelElem = document.getElementById(building + '-level');
    if (nivelElem) nivelElem.textContent = nivel;
    const prodElem = document.getElementById(building + '-prod');
    if (prodElem) prodElem.textContent = produccion + ' 💎/h';
    const precioElem = document.getElementById(building + '-price');
    if (precioElem) precioElem.textContent = precio.toLocaleString() + ' 💎';
    const boton = document.getElementById(building + '-btn');
    if (boton) {
        if (userData.diamonds < precio) {
            boton.disabled = true;
            boton.textContent = '💎 INSUFICIENTE';
        } else {
            boton.disabled = false;
            boton.textContent = 'MEJORAR (' + precio.toLocaleString() + ' 💎)';
        }
    }
}

function buyUpgrade(building) {
    const preciosBase = { escuela: 500, fabrica: 1500, piscina: 800, hospital: 1200 };
    const nivel = userData['lvl_' + building] || 0;
    const precio = Math.floor(preciosBase[building] * Math.pow(1.12, nivel));
    if (userData.diamonds < precio) return alert('❌ Diamantes insuficientes');
    userData['lvl_' + building] = (userData['lvl_' + building] || 0) + 1;
    userData.diamonds -= precio;
    saveUserData();
    actualizarUI();
    actualizarPanelMejora(building);
    const nombres = { escuela: 'Escuela', fabrica: 'Fábrica', piscina: 'Piscina', hospital: 'Hospital' };
    const iconos = { escuela: '🏫', fabrica: '🏭', piscina: '🏊', hospital: '🏥' };
    const producciones = { escuela: 15, fabrica: 25, piscina: 10, hospital: 18 };
    const produccionEdificio = userData['lvl_' + building] * producciones[building];
    registrarEvento(iconos[building], nombres[building] + ' mejorada a nivel ' + userData['lvl_' + building], 'Ahora produce ' + produccionEdificio + ' 💎/h');
    alert('✅ ¡' + nombres[building] + ' mejorada a nivel ' + userData['lvl_' + building] + '!');
}

// ==========================================
// RANKING Y POOL
// ==========================================
async function updateRankingAndPool() {
    try {
        const resultado = await _supabase.from('game_data').select('telegram_id, username, city_name, diamonds, lvl_piscina, lvl_fabrica, lvl_escuela, lvl_hospital, premium_expires, genero').neq('telegram_id', 'MASTER');
        if (!resultado.error && resultado.data) {
            const ahora = new Date();
            globalPoolData.user_rankings = resultado.data.map(function(u) {
                let produccion = (u.lvl_escuela || 0) * 15 + (u.lvl_fabrica || 0) * 25 + (u.lvl_piscina || 0) * 10 + (u.lvl_hospital || 0) * 18;
                const esPremiumU = u.premium_expires && new Date(u.premium_expires) > ahora;
                if (esPremiumU) produccion = produccion * 2;
                return {
                    id: u.telegram_id,
                    username: u.username || 'Alcalde',
                    genero: u.genero || 'M',
                    city_name: u.city_name || 'Ciudad sin nombre',
                    diamonds: Number(u.diamonds) || 0,
                    produccion: produccion
                };
            }).sort(function(a, b) { return b.produccion - a.produccion; });
        }
        const posicion = globalPoolData.user_rankings.findIndex(function(u) { return u.id === userData.id; });
        if (posicion !== -1) {
            if (posicion < 3) userData.rank = "Diamante";
            else if (posicion < 10) userData.rank = "Oro";
            else if (posicion < 50) userData.rank = "Plata";
            else userData.rank = "Ciudadano";
            userData.weekly_rank = posicion + 1;
        }
        const PREMIO_SEMANAL_DIAMANTES = 20000;
        if (posicion < 3) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.4) / 3;
        else if (posicion < 10) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.25) / 7;
        else if (posicion < 50) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.20) / 40;
        else {
            const ciudadanos = globalPoolData.user_rankings.slice(50);
            let totalProduccionCiudadanos = 0;
            for (let i = 0; i < ciudadanos.length; i++) totalProduccionCiudadanos += ciudadanos[i].produccion;
            if (totalProduccionCiudadanos > 0 && getTotalProduction() > 0) userData.projectedReward = (PREMIO_SEMANAL_DIAMANTES * 0.15) * (getTotalProduction() / totalProduccionCiudadanos);
            else userData.projectedReward = 0;
        }
    } catch (error) { console.error('Error ranking:', error); }
}

// ==========================================
// GUARDADO EN SUPABASE
// ==========================================
async function saveUserData() {
    if (!userData.id) return;
    try {
        const datos = {
            diamonds: Math.floor(userData.diamonds),
            lvl_piscina: userData.lvl_piscina,
            lvl_fabrica: userData.lvl_fabrica,
            lvl_escuela: userData.lvl_escuela,
            lvl_hospital: userData.lvl_hospital,
            last_online: new Date().toISOString(),
            premium_expires: userData.premium_expires,
            daily_streak: userData.daily_streak,
            last_daily_claim: userData.last_daily_claim,
            event_progress: userData.event_progress || {},
            gamestats: userData.gameStats,
            referral_earnings: userData.referral_earnings || 0,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue,
            last_production_update: userData.last_production_update || new Date().toISOString(),
            city_name: userData.city_name || null,
            news_feed: userData.newsFeed || [],
            genero: userData.genero || 'M',
            idioma: userData.idioma || 'es',
            bolsa_portfolio: userData.bolsa_portfolio || {},
            expediciones_activas: userData.expediciones_activas || [],
            craft_niveles: userData.craft_niveles || {}
        };
        const resultado = await _supabase.from('game_data').update(datos).eq('telegram_id', userData.id);
        if (resultado.error) console.error('Error al guardar:', resultado.error);
        else console.log('💾 Datos guardados');
    } catch (error) { console.error('Error guardando:', error); }
}

async function loadUserFromDB(tgId) {
    try {
        const resultado = await _supabase.from('game_data').select('*').eq('telegram_id', tgId.toString()).maybeSingle();
        if (resultado.error) { console.error(resultado.error); return; }
        if (!resultado.data) {
            const nuevoUsuario = {
                telegram_id: tgId.toString(),
                username: userData.username,
                diamonds: 0,
                lvl_piscina: 0,
                lvl_fabrica: 0,
                lvl_escuela: 0,
                lvl_hospital: 0,
                referral_code: 'REF' + tgId.toString().slice(-6),
                last_online: new Date().toISOString(),
                event_progress: {},
                accumulated_ton: 0,
                retiradoHoy: 0,
                last_withdraw_week: null,
                last_production_update: new Date().toISOString(),
                gamestats: {
                    escuela: { bestLevel: 0, totalWins: 0 },
                    fabrica: { bestLevel: 0, totalWins: 0 },
                    piscina: { bestLevel: 0, totalWins: 0 },
                    hospital: { bestLevel: 0, totalWins: 0 }
                }
            };
            await _supabase.from('game_data').insert([nuevoUsuario]);
            userData = Object.assign({}, userData, nuevoUsuario, { id: tgId.toString() });
            const codigoInvitacion = tg.initDataUnsafe && tg.initDataUnsafe.start_param;
            if (codigoInvitacion) {
                try {
                    await fetch('/api/register-referral', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newUserId: tgId.toString(), referralCode: codigoInvitacion })
                    });
                } catch (e) { console.error('Error registrando referido:', e); }
            }
        } else {
            const d = resultado.data;
            userData = Object.assign({}, userData, d, {
                id: tgId.toString(),
                diamonds: Number(d.diamonds) || 0,
                lvl_piscina: Number(d.lvl_piscina) || 0,
                lvl_fabrica: Number(d.lvl_fabrica) || 0,
                lvl_escuela: Number(d.lvl_escuela) || 0,
                lvl_hospital: Number(d.lvl_hospital) || 0,
                referral_earnings: Number(d.referral_earnings) || 0,
                referred_users: d.referred_users || [],
                premium_expires: d.premium_expires || null,
                daily_streak: Number(d.daily_streak) || 0,
                last_daily_claim: d.last_daily_claim || null,
                haInvertido: d.haInvertido || false,
                event_progress: d.event_progress || {},
                accumulated_ton: Number(d.accumulated_ton) || 0,
                retiradoHoy: Number(d.retiradoHoy) || 0,
                last_withdraw_week: d.last_withdraw_week || null,
                referral_code: d.referral_code || 'REF' + tgId.toString().slice(-6),
                last_ad_watch: d.last_ad_watch || null,
                last_casino_rescue: d.last_casino_rescue || null,
                last_production_update: d.last_production_update || null,
                city_name: d.city_name || null,
                newsFeed: d.news_feed || [],
                genero: d.genero || 'M',
                idioma: d.idioma || 'es',
                bolsa_portfolio: d.bolsa_portfolio || {},
                expediciones_activas: d.expediciones_activas || [],
                craft_niveles: d.craft_niveles || {},
                gameStats: d.gamestats || {
                    escuela: { bestLevel: 0, totalWins: 0 },
                    fabrica: { bestLevel: 0, totalWins: 0 },
                    piscina: { bestLevel: 0, totalWins: 0 },
                    hospital: { bestLevel: 0, totalWins: 0 }
                }
            });
            aplicarProduccionOffline();
        }
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.textContent = userData.username;
        actualizarUI();
        actualizarPremiumUI();
        console.log('✅ Datos del usuario cargados');
    } catch (error) { console.error('Error en loadUserFromDB:', error); }
}

// ==========================================
// PRODUCCIÓN CONTINUA Y OFFLINE
// ==========================================
function startProduction() {
    setInterval(function() {
        if (!userData.id) return;
        const produccionPorSegundo = getTotalProduction() / 3600;
        userData.diamonds += produccionPorSegundo;
        userData.last_production_update = new Date().toISOString();
        const diamantesElem = document.getElementById('diamonds');
        if (diamantesElem) diamantesElem.textContent = Math.floor(userData.diamonds);
    }, 1000);
}

function aplicarProduccionOffline() {
    if (!userData.last_production_update) {
        userData.last_production_update = new Date().toISOString();
        return;
    }
    const ahora = new Date();
    const ultimaVez = new Date(userData.last_production_update);
    let segundosTranscurridos = (ahora - ultimaVez) / 1000;
    if (segundosTranscurridos <= 0) return;
    const TOPE_SEGUNDOS = 12 * 60 * 60;
    if (segundosTranscurridos > TOPE_SEGUNDOS) segundosTranscurridos = TOPE_SEGUNDOS;
    const produccionGanada = (getTotalProduction() / 3600) * segundosTranscurridos;
    if (produccionGanada > 0) userData.diamonds += produccionGanada;
    userData.last_production_update = ahora.toISOString();
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function initApp() {
    console.log('🔄 Iniciando DIAMOND CITY...');
    tg.expand();
    tg.ready();
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    if (usuario) {
        userData.id = usuario.id.toString();
        userData.username = usuario.first_name || 'Usuario';
        await loadUserFromDB(usuario.id);
        userData.username = usuario.first_name || 'Usuario';
    } else {
        userData.id = 'test_' + Date.now();
        userData.username = 'Usuario Test';
        userData.referral_code = 'REF' + userData.id.slice(-6);
    }
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = userData.username;
    if (usuario && usuario.photo_url) {
        const userDisplayElem = document.getElementById('user-display');
        if (userDisplayElem && !document.getElementById('user-avatar-main')) {
            const img = document.createElement('img');
            img.id = 'user-avatar-main';
            img.src = usuario.photo_url;
            img.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle;';
            userDisplayElem.parentNode.insertBefore(img, userDisplayElem);
        }
    }
    await initTONConnect();
    setTimeout(initAds, 3000);
    await updateRankingAndPool();
    startProduction();
    setInterval(saveUserData, 10000);
    setInterval(async function() { await updateRankingAndPool(); }, 60000);
    window.addEventListener('beforeunload', function() { saveUserData(); });
    mostrarOnboardingSiHaceFalta();
    renderizarFeedNoticias();
    aplicarIdioma();
    const labelIdioma = document.getElementById('idioma-actual-label');
    if (labelIdioma) labelIdioma.textContent = NOMBRES_IDIOMA[userData.idioma] || 'Español';
    console.log('✅ DIAMOND CITY inicializado');
}

window.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// EXPORTACIONES GLOBALES
// ==========================================
window.openPerfil = openPerfil;
window.openFriends = openFriends;
window.openRanking = openRanking;
window.openBank = openBank;
window.openStore = openStore;
window.openCasino = openCasino;
window.openBuilding = openBuilding;
window.openDailyReward = openDailyReward;
window.showAdsModal = showAdsModal;
window.abrirJuego = abrirJuego;
window.cerrarJuego = cerrarJuego;
window.cambiarApuesta = cambiarApuesta;
window.claimDailyReward = claimDailyReward;
window.showAd = showAd;
window.rescueWithAd = rescueWithAd;
window.comprarPremium = comprarPremium;
window.comprarTON = comprarTON;
window.buyUpgrade = buyUpgrade;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.disconnectWallet = disconnectWallet;
window.confirmarNombreCiudad = confirmarNombreCiudad;
window.abrirAsistente = abrirAsistente;
window.abrirHistorialPremios = abrirHistorialPremios;
window.seleccionarIdioma = seleccionarIdioma;
window.abrirSelectorIdioma = abrirSelectorIdioma;
window.seleccionarGenero = seleccionarGenero;
window.cambiarGeneroPerfil = cambiarGeneroPerfil;
window.iniciarTiming = iniciarTiming;
window.detenerTiming = detenerTiming;
window.iniciarMatch = iniciarMatch;
window.clickMatch = clickMatch;
window.comprarAccion = comprarAccion;
window.venderAccion = venderAccion;
window.pujarSubasta = pujarSubasta;
window.lanzarExpedicion = lanzarExpedicion;
window.reclamarExpedicion = reclamarExpedicion;
window.craftear = craftear;

console.log('📦 DIAMOND CITY - Todos los módulos exportados correctamente');
