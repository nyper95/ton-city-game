// ======================================================
// DIAMOND CITY - v3.3 FINAL
// Economía centralizada y rentable · Navbar persistente
// Ciudad = pantalla principal · Valeria personalizada con
// hipervínculos · Retiros USDT TON (min 10) · RichAds
// ======================================================
console.log('🚀 DIAMOND CITY v3.3');

const tg = window.Telegram.WebApp;
tg.expand(); tg.ready();

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
    BILLETERA_PROPIETARIO: "UQB9UHu9CB6usvZOKTZzCYx5DPcSlxKSxKaqo9UMF59t3BVw",
    PRECIO_COMPRA: 0.001,          // 1 GRAM = 1,000 💎 (corrige el bug de acreditación)
    TON_A_STARS: 200,
    MARGEN_STARS: 1.15,
    RICHADS_PUB_ID: '1022600',
    RICHADS_APP_ID: '8877',        // corregido según tu resumen (antes 8877)
    RICHADS_DEBUG: false,
    SUPABASE_URL: 'https://xkkifqxxglcuyruwkbih.supabase.co',
    SUPABASE_KEY: 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE',
    API_BASE: ''                   // pon aquí la URL de tu Cloudflare Worker cuando lo despliegues
};

// ==========================================
// SISTEMA ECONÓMICO CENTRALIZADO
// ==========================================
// DISEÑO DE RENTABILIDAD:
// · ENTRADAS (💎 que entran al juego): producción de edificios
//   (tope 12h offline), anuncios (+20/h), recompensa diaria
//   (promedio ~78/día), rescate (1/día), referidos (10%),
//   premios del ranking (20,000/semana).
// · SALIDAS (💎 que el juego quema): mejoras ×1.12, crafting ×1.6,
//   expediciones con riesgo 15-45%, comisión de subasta 5%,
//   entradas de los juegos (pérdida al fallar).
// · REGLA DE ORO: el pool semanal de 20,000 💎 debe financiarse
//   con las compras GRAM/Stars y los ingresos por anuncios.
//   Si el pool supera ~40% de los ingresos semanales brutos,
//   sube PRECIO_BASE o baja POOL_RANKING_SEMANAL.
// Todo se ajusta desde aquí, sin tocar la lógica del juego.
// ==========================================
const ECONOMIA = {
    // Producción por nivel (💎/h)
    PRODUCCION: { piscina: 10, fabrica: 25, escuela: 15, hospital: 18 },
    PREMIUM_MULTIPLICADOR: 2,
    MAX_OFFLINE_HORAS: 12,
    // Entradas gratuitas
    ANUNCIO_RECOMPENSA: 20,
    RESCATE_SIN_DIAMANTES: 50,
    DIARIA_BASE: 5,
    DIARIO_INCREMENTO: 3,
    DIARIA_MAX: 150,
    DIARIA_RACHA_MAX: 30,
    REFERIDO_PCT: 0.10,
    POOL_RANKING_SEMANAL: 20000,
    // Sumideros / costos
    PRECIO_BASE: { piscina: 800, fabrica: 1500, escuela: 500, hospital: 1200 },
    CRECIMIENTO_MEJORA: 1.12,
    CRECIMIENTO_CRAFT: 1.6,
    COMISION_SUBASTA: 0.05,
    LIMITES_JUEGOS: { timing: 20, matchmental: 15, bolsa: 30, subasta: 20, expedicion: 10, crafting: 30 }
};

const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ==========================================
// ESTADO GLOBAL
// ==========================================
let tonConnectUI = null;
let currentWallet = null;
let richAdsReady = false;
let metodoPagoBanco = 'gram';
let metodoPagoPremium = 'gram';
let countdownInterval = null;
let globalPoolData = { user_rankings: [] };

let userData = {
    id: null, first_name: 'Usuario', username: 'Usuario',
    diamonds: 0, lvl_piscina: 0, lvl_fabrica: 0, lvl_escuela: 0, lvl_hospital: 0,
    referral_code: null, city_name: null, newsFeed: [],
    genero: 'M', idioma: 'es', theme: 'dark',
    referral_earnings: 0, referred_users: [],
    last_online: null, last_production_update: null,
    last_ad_watch: null, last_casino_rescue: null,
    daily_streak: 0, last_daily_claim: null,
    haInvertido: false, premium_expires: null,
    weekly_rank: null, rank: "Ciudadano", projectedReward: 0,
    bolsa_portfolio: {}, expediciones_activas: {}, craft_niveles: {},
    gameStats: {},
    jugadasHoy: { timing: 0, matchmental: 0, bolsa: 0, subasta: 0, expedicion: 0, crafting: 0, fecha: new Date().toDateString() }
};

let apuestaActual = { timing: 10, matchmental: 10 };

// ==========================================
// TARIFAS
// ==========================================
const PACKS_DIAMANTES = [
    { diamantes: 100,   ton: 0.10,  stars: Math.round(160  * 1.15) },
    { diamantes: 500,   ton: 0.50,  stars: Math.round(800  * 1.15) },
    { diamantes: 1000,  ton: 1.00,  stars: Math.round(1600 * 1.15) },
    { diamantes: 2000,  ton: 2.00,  stars: Math.round(3200 * 1.15) },
    { diamantes: 5000,  ton: 5.00,  stars: Math.round(8000 * 1.15) },
    { diamantes: 10000, ton: 10.00, stars: Math.round(16000 * 1.15) }
];

const PREMIUM_PLANS = [
    { name: "1 día",   days: 1,  ton: 0.20, stars: Math.round(320  * 1.15) },
    { name: "7 días",  days: 7,  ton: 1.00, stars: Math.round(1600 * 1.15) },
    { name: "30 días", days: 30, ton: 3.00, stars: Math.round(4800 * 1.15) }
];

const ZONAS_EXPEDICION = [
    { id: 'z1', nombre: 'Cantera Sur',     icono: '🪨', costo: 100, duracion: 60,  recompensaBase: 180,  riesgo: 0.15 },
    { id: 'z2', nombre: 'Mina Abandonada', icono: '⛏️', costo: 300, duracion: 180, recompensaBase: 600,  riesgo: 0.30 },
    { id: 'z3', nombre: 'Cráter Profundo', icono: '🌋', costo: 800, duracion: 300, recompensaBase: 1800, riesgo: 0.45 }
];

const RECETAS_CRAFT = [
    { id: 'c1', nombre: 'Pico de diamante',   icono: '⛏️', costoBase: 200 },
    { id: 'c2', nombre: 'Refinería',          icono: '🏭', costoBase: 500 },
    { id: 'c3', nombre: 'Banco de inversión', icono: '🏦', costoBase: 1200 }
];

const ACCIONES_BOLSA = [
    { id: 'mina',    nombre: 'Minas del Norte', icono: '⛏️', precio: 100, tendencia: 0 },
    { id: 'banco',   nombre: 'Banco Central',   icono: '🏦', precio: 250, tendencia: 0 },
    { id: 'fabrica', nombre: 'Industria Pesada',icono: '🏭', precio: 180, tendencia: 0 },
    { id: 'energia', nombre: 'Energía Solar',   icono: '☀️', precio: 320, tendencia: 0 }
];

const SIMBOLOS_MATCH = ['💎','⚡','🏭','🏦','🏫','🏥','⛏️','☀️','💠'];

// ==========================================
// TRADUCCIONES
// ==========================================
const TRADUCCIONES = {
    es: {
        nav_perfil:'PERFIL',nav_amigos:'AMIGOS',nav_ciudad:'CIUDAD',nav_ranking:'RANKING',nav_retiros:'RETIROS',
        greeting_hola:'HOLA,',genero_m:'Alcalde',genero_f:'Alcaldesa',
        section_edificios:'Edificios',section_feed:'Feed de Noticias',
        building_banco:'Banco',building_banco_sub:'Comprar GRAM/Stars',
        building_premium:'Premium',building_premium_sub:'Planes VIP',
        building_centro:'Centro Financiero',building_centro_sub:'6 secciones',
        building_parque:'Parque',building_parque_sub:'Anuncios',
        building_retiros:'Retiros',building_retiros_sub:'USDT · GRAM',
        building_piscina:'Piscina',building_fabrica:'Fábrica',
        building_escuela:'Escuela',building_hospital:'Hospital',
        gauge_tesoreria:'Tesorería',gauge_produccion:'Diamantes/h',gauge_nivel:'Nivel municipal',
        lvl_label:'Nivel',prod_label:'Prod',mejora_label:'Mejora',
        btn_cerrar:'CERRAR',btn_mejorar:'MEJORAR',
        perfil_titulo:'Mi Perfil',perfil_amigos:'Amigos',perfil_rango:'Rango',perfil_bono:'Bono semanal',
        perfil_titulo_tratamiento:'Título de tratamiento',idioma_titulo:'Idioma',idioma_titulo_btn:'🌐 Idioma',
        amigos_titulo:'Invitar Amigos',amigos_gana:'¡Gana el 10% de tus referidos!',
        amigos_tu_codigo:'Tu código:',amigos_copiar:'📋 COPIAR ENLACE',amigos_ganancias:'Ganancias',
        ranking_titulo:'Ranking Municipal',ranking_tu_rango:'Tu rango',
        ranking_tu_posicion:'Tu posición',ranking_bono:'Bono semanal',
        ranking_historial:'🏆 Historial público',
        ranking_countdown:'⏳ Tiempo restante para el próximo reparto',
        cd_dias:'Días',cd_horas:'Horas',cd_min:'Min',cd_seg:'Seg',
        historial_titulo:'🏆 Historial de Premios',
        historial_info:'Registro público de premios semanales.',
        banco_titulo:'Banco',
        banco_info:'Compra diamantes con GRAM o paga con Estrellas de Telegram.',
        banco_conectada:'Wallet conectada',banco_desconectar:'Desconectar',
        banco_metodo:'Método de pago:',
        premium_titulo:'Tienda Premium',premium_beneficios:'🎁 Beneficios:',
        premium_beneficios_txt:'x2 producción · Sin anuncios · Insignia exclusiva',
        centro_titulo:'🏛️ Centro Financiero',
        centro_info:'El Centro Financiero es el motor económico de tu ciudad: aquí puedes invertir, gestionar recursos, competir por ítems exclusivos y progresar mediante tu habilidad y estrategia.',
        centro_sin_diamantes:'Sin diamantes',
        juego_timing:'Timing Tap',juego_timing_sub:'Habilidad',
        juego_match:'Match Mental',juego_match_sub:'Memoria',
        juego_bolsa:'Bolsa',juego_bolsa_sub:'Inversión',
        juego_subasta:'Subasta',juego_subasta_sub:'P2P',
        juego_expedicion:'Expedición',juego_expedicion_sub:'Gestión',
        juego_crafting:'Crafting',juego_crafting_sub:'Fusión',
        timing_info_title:'Cómo jugar:',timing_info:'Una aguja se moverá de un lado a otro sobre una barra. Pulsa "DETENER" cuando esté dentro de la zona verde. Cuanto más cerca del centro, mayor será el multiplicador (2x a 5x). Si queda fuera, pierdes tu entrada.',
        timing_iniciar:'INICIAR',timing_detener:'¡DETENER!',
        match_info_title:'Cómo jugar:',match_info:'Aparecerá una secuencia de símbolos que se iluminan uno a uno. Memorízalos y reprodúcelos tocando los mismos símbolos en orden. Cada ronda añade 2 símbolos más. Llega hasta 8 rondas para multiplicar tu premio.',
        match_comenzar:'COMENZAR',
        bolsa_info_title:'Cómo funciona:',bolsa_info:'Es la bolsa de valores de tu ciudad. Compra acciones de minas, bancos, industrias y energéticas cuando estén bajas, y véndelas cuando suban. Los precios se actualizan cada 30 segundos según el mercado interno.',
        bolsa_portfolio:'💼 Tu portafolio',bolsa_sin:'Sin inversiones todavía',
        subasta_info_title:'Cómo funciona:',subasta_info:'Los alcaldes compiten por ítems raros que aparecen periódicamente: licencias de producción, aceleradores y avatares exclusivos. Puja antes de que termine el temporizador. La casa se queda con un 5% de comisión.',
        exp_info_title:'Cómo funciona:',exp_info:'Envía a tus mineros a zonas de riesgo pagando un costo inicial. Cuando regresen (tras el tiempo indicado) siempre obtendrás recurso, pero el desgaste operativo puede reducir la ganancia neta entre un 20% y 50%. Hay bonus ocasionales.',
        exp_activas:'🚛 Activas',exp_ninguna:'Ninguna',
        craft_info_title:'Cómo funciona:',craft_info:'Combina diamantes para subir de nivel tus herramientas e instalaciones. No hay aleatoriedad: cada inversión te garantiza la mejora. El costo crece progresivamente con cada nivel.',
        apuesta_label:'Apuesta:',
        daily_titulo:'Recompensa diaria',daily_subtitulo:'¡Reclama tus diamantes gratis!',
        daily_dia:'Día',daily_recompensa:'Recompensa',daily_reclamar:'RECLAMAR',
        ads_ver:'VER ANUNCIO +20 💎',
        ads_reintentar:'🔄 Reintentar conexión',
        ads_no_disponible:'Anuncios no disponibles.',
        ads_cargando:'Cargando red de anuncios...',
        asistente_rol:'Asistente Ejecutiva',
        onboarding_placeholder:'Nombre de tu ciudad',onboarding_fundar:'🏙️ FUNDAR MI CIUDAD',
        feed_titulo:'Bienvenido a su ciudad',feed_sub:'Los eventos aparecerán aquí',
        retiros_titulo:'💸 Retiros',
        retiros_info:'Convierte tus diamantes en USDT (red TON) y retíralos a tu wallet. Disponible próximamente.',
        retiros_usdt_info:'USDT en la red TON (el mismo que se cambia por GRAM). Mínimo de retiro: 10 USDT.',
        retiros_balance:'Tu tesorería',retiros_dia:'Día de retiro',retiros_domingo:'Domingos',
        retiros_minimo:'Mínimo requerido',
        ciudad_titulo:'🏙️ Mi Ciudad',ciudad_edificios:'Edificios de la ciudad',
        ciudad_estadisticas:'Estadísticas',ciudad_posicion:'Posición',ciudad_nivel_label:'Nivel municipal:',
        ciudad_info:'Aquí puedes ver el estado completo de tu ciudad.'
    },
    en: {
        nav_perfil:'PROFILE',nav_amigos:'FRIENDS',nav_ciudad:'CITY',nav_ranking:'RANKING',nav_retiros:'WITHDRAWALS',
        greeting_hola:'HI,',genero_m:'Mayor',genero_f:'Mayor',
        section_edificios:'Buildings',section_feed:'News Feed',
        building_banco:'Bank',building_banco_sub:'Buy GRAM/Stars',
        building_premium:'Premium',building_premium_sub:'VIP Plans',
        building_centro:'Financial Center',building_centro_sub:'6 sections',
        building_parque:'Park',building_parque_sub:'Ads',
        building_retiros:'Withdrawals',building_retiros_sub:'USDT · GRAM',
        building_piscina:'Pool',building_fabrica:'Factory',
        building_escuela:'School',building_hospital:'Hospital',
        gauge_tesoreria:'Treasury',gauge_produccion:'Diamonds/h',gauge_nivel:'Municipal level',
        lvl_label:'Level',prod_label:'Prod',mejora_label:'Upgrade',
        btn_cerrar:'CLOSE',btn_mejorar:'UPGRADE',
        perfil_titulo:'My Profile',perfil_amigos:'Friends',perfil_rango:'Rank',perfil_bono:'Weekly bonus',
        perfil_titulo_tratamiento:'Title',idioma_titulo:'Language',idioma_titulo_btn:'🌐 Language',
        amigos_titulo:'Invite Friends',amigos_gana:'Earn 10% of your referrals!',
        amigos_tu_codigo:'Your code:',amigos_copiar:'📋 COPY',amigos_ganancias:'Earnings',
        ranking_titulo:'Municipal Ranking',ranking_tu_rango:'Your rank',
        ranking_tu_posicion:'Your position',ranking_bono:'Weekly bonus',
        ranking_historial:'🏆 Public history',
        ranking_countdown:'⏳ Time until next reward distribution',
        cd_dias:'Days',cd_horas:'Hours',cd_min:'Min',cd_seg:'Sec',
        historial_titulo:'🏆 Prize History',historial_info:'Public weekly prize record.',
        banco_titulo:'Bank',banco_info:'Buy with GRAM or Telegram Stars.',
        banco_conectada:'Wallet connected',banco_desconectar:'Disconnect',
        banco_metodo:'Payment method:',
        premium_titulo:'Premium Store',premium_beneficios:'🎁 Benefits:',
        premium_beneficios_txt:'x2 production · No ads · Exclusive badge',
        centro_titulo:'🏛️ Financial Center',
        centro_info:'The Financial Center is the economic engine of your city: invest, manage resources, compete for exclusive items and progress through skill and strategy.',
        centro_sin_diamantes:'No diamonds',
        juego_timing:'Timing Tap',juego_timing_sub:'Skill',juego_match:'Match Mental',juego_match_sub:'Memory',
        juego_bolsa:'Market',juego_bolsa_sub:'Investment',juego_subasta:'Auction',juego_subasta_sub:'P2P',
        juego_expedicion:'Expedition',juego_expedicion_sub:'Management',juego_crafting:'Crafting',juego_crafting_sub:'Fusion',
        timing_info_title:'How to play:',timing_info:'A needle will move back and forth across a bar. Press "STOP" when it is inside the green zone. The closer to the center, the higher the multiplier (2x to 5x). If it falls outside, you lose your entry.',
        timing_iniciar:'START',timing_detener:'STOP!',
        match_info_title:'How to play:',match_info:'A sequence of symbols will flash one by one. Memorize them and reproduce them by tapping the same symbols in order. Each round adds 2 more symbols. Reach up to 8 rounds to multiply your prize.',
        match_comenzar:'START',
        bolsa_info_title:'How it works:',bolsa_info:'It is your city\'s stock market. Buy shares in mines, banks, industries and energy companies when low, sell when high. Prices update every 30 seconds.',
        bolsa_portfolio:'💼 Portfolio',bolsa_sin:'No investments yet',
        subasta_info_title:'How it works:',subasta_info:'Mayors compete for rare items that appear periodically: production licenses, accelerators and exclusive avatars. Bid before the timer ends. The house keeps 5%.',
        exp_info_title:'How it works:',exp_info:'Send your miners to risky areas paying an initial cost. When they return (after the indicated time) you always get resources, but operational wear can reduce net profit by 20% to 50%. Occasional bonuses apply.',
        exp_activas:'🚛 Active',exp_ninguna:'None',
        craft_info_title:'How it works:',craft_info:'Combine diamonds to level up your tools and facilities. No randomness: every investment guarantees the upgrade. Cost grows progressively with each level.',
        apuesta_label:'Bet:',
        daily_titulo:'Daily Reward',daily_subtitulo:'Claim free diamonds!',
        daily_dia:'Day',daily_recompensa:'Reward',daily_reclamar:'CLAIM',
        ads_ver:'WATCH AD +20 💎',
        ads_reintentar:'🔄 Retry connection',
        ads_no_disponible:'Ads unavailable.',
        ads_cargando:'Loading ad network...',
        asistente_rol:'Executive Assistant',
        onboarding_placeholder:'City name',onboarding_fundar:'🏙️ FOUND MY CITY',
        feed_titulo:'Welcome to your city',feed_sub:'Recent events here',
        retiros_titulo:'💸 Withdrawals',
        retiros_info:'Convert diamonds to USDT (TON network) and withdraw to your wallet. Coming soon.',
        retiros_usdt_info:'USDT on TON network (the same you swap for GRAM). Minimum withdrawal: 10 USDT.',
        retiros_balance:'Your treasury',retiros_dia:'Withdraw day',retiros_domingo:'Sundays',
        retiros_minimo:'Minimum required',
        ciudad_titulo:'🏙️ My City',ciudad_edificios:'City buildings',
        ciudad_estadisticas:'Statistics',ciudad_posicion:'Position',ciudad_nivel_label:'Municipal level:',
        ciudad_info:'See your full city status.'
    },
    pt: {
        nav_perfil:'PERFIL',nav_amigos:'AMIGOS',nav_ciudad:'CIDADE',nav_ranking:'RANKING',nav_retiros:'SAQUES',
        greeting_hola:'OLÁ,',genero_m:'Prefeito',genero_f:'Prefeita',
        section_edificios:'Edifícios',section_feed:'Feed',
        building_banco:'Banco',building_banco_sub:'Comprar GRAM/Stars',
        building_premium:'Premium',building_premium_sub:'Planos VIP',
        building_centro:'Centro Financeiro',building_centro_sub:'6 seções',
        building_parque:'Parque',building_parque_sub:'Anúncios',
        building_retiros:'Saques',building_retiros_sub:'USDT · GRAM',
        building_piscina:'Piscina',building_fabrica:'Fábrica',building_escuela:'Escola',building_hospital:'Hospital',
        gauge_tesoreria:'Tesouraria',gauge_produccion:'Diamantes/h',gauge_nivel:'Nível municipal',
        lvl_label:'Nível',prod_label:'Prod',mejora_label:'Melhoria',
        btn_cerrar:'FECHAR',btn_mejorar:'MELHORAR',
        perfil_titulo:'Meu Perfil',perfil_amigos:'Amigos',perfil_rango:'Rank',perfil_bono:'Bônus',
        perfil_titulo_tratamiento:'Título',idioma_titulo:'Idioma',idioma_titulo_btn:'🌐 Idioma',
        amigos_titulo:'Convidar',amigos_gana:'Ganhe 10%!',amigos_tu_codigo:'Código:',
        amigos_copiar:'📋 COPIAR',amigos_ganancias:'Ganhos',
        ranking_titulo:'Ranking',ranking_tu_rango:'Seu rank',ranking_tu_posicion:'Posição',
        ranking_bono:'Bônus semanal',ranking_historial:'🏆 Histórico',
        ranking_countdown:'⏳ Tempo até próxima premiação',
        cd_dias:'Dias',cd_horas:'Horas',cd_min:'Min',cd_seg:'Seg',
        historial_titulo:'🏆 Histórico',historial_info:'Registro público semanal.',
        banco_titulo:'Banco',banco_info:'Compre com GRAM ou Stars.',
        banco_conectada:'Carteira conectada',banco_desconectar:'Desconectar',banco_metodo:'Método:',
        premium_titulo:'Premium',premium_beneficios:'🎁 Benefícios:',
        premium_beneficios_txt:'x2 produção · Sem anúncios · Insígnia',
        centro_titulo:'🏛️ Centro Financeiro',
        centro_info:'O Centro Financeiro é o motor econômico da sua cidade: invista, gerencie recursos, dispute itens exclusivos e progrida com habilidade e estratégia.',
        centro_sin_diamantes:'Sem diamantes',
        juego_timing:'Timing',juego_timing_sub:'Habilidade',juego_match:'Match',juego_match_sub:'Memória',
        juego_bolsa:'Bolsa',juego_bolsa_sub:'Investimento',juego_subasta:'Leilão',juego_subasta_sub:'P2P',
        juego_expedicion:'Expedição',juego_expedicion_sub:'Gestão',juego_crafting:'Craft',juego_crafting_sub:'Fusão',
        timing_info_title:'Como jogar:',timing_info:'Uma agulha se moverá de um lado para o outro. Aperte "PARAR" quando estiver na zona verde. Mais perto do centro, maior o multiplicador (2x a 5x). Se ficar fora, perde sua entrada.',
        timing_iniciar:'INICIAR',timing_detener:'PARAR!',
        match_info_title:'Como jogar:',match_info:'Uma sequência de símbolos vai piscar um a um. Memorize e reproduza tocando os mesmos símbolos na ordem. Cada rodada adiciona 2 símbolos. Chegue a 8 rodadas para multiplicar seu prêmio.',
        match_comenzar:'COMEÇAR',
        bolsa_info_title:'Como funciona:',bolsa_info:'É a bolsa da sua cidade. Compre ações de minas, bancos, indústrias e energéticas quando estiverem baixas, venda quando subirem. Preços atualizam a cada 30s.',
        bolsa_portfolio:'💼 Portfólio',bolsa_sin:'Sem investimentos',
        subasta_info_title:'Como funciona:',subasta_info:'Prefeitos competem por itens raros: licenças, aceleradores e avatares exclusivos. Dê seu lance antes do tempo acabar. A casa fica com 5%.',
        exp_info_title:'Como funciona:',exp_info:'Envie mineradores para zonas de risco pagando um custo. Ao retornar, você sempre ganha recurso, mas o desgaste pode reduzir o lucro entre 20% e 50%.',
        exp_activas:'🚛 Ativas',exp_ninguna:'Nenhuma',
        craft_info_title:'Como funciona:',craft_info:'Combine diamantes para subir de nível suas ferramentas e instalações. Sem aleatoriedade: cada investimento garante a melhoria.',
        apuesta_label:'Aposta:',
        daily_titulo:'Recompensa diária',daily_subtitulo:'Resgate grátis!',
        daily_dia:'Dia',daily_recompensa:'Prêmio',daily_reclamar:'RESGATAR',
        ads_ver:'VER ANÚNCIO +20 💎',
        ads_reintentar:'🔄 Tentar novamente',
        ads_no_disponible:'Anúncios indisponíveis.',
        ads_cargando:'Carregando rede...',
        asistente_rol:'Assistente Executiva',
        onboarding_placeholder:'Nome da cidade',onboarding_fundar:'🏙️ FUNDAR',
        feed_titulo:'Bem-vindo',feed_sub:'Eventos recentes',
        retiros_titulo:'💸 Saques',
        retiros_info:'Converta em USDT (rede TON) e saque para sua carteira. Em breve.',
        retiros_usdt_info:'USDT na rede TON (o mesmo que troca por GRAM). Mínimo de saque: 10 USDT.',
        retiros_balance:'Tesouraria',retiros_dia:'Dia',retiros_domingo:'Domingos',
        retiros_minimo:'Mínimo requerido',
        ciudad_titulo:'🏙️ Minha Cidade',ciudad_edificios:'Edifícios da cidade',
        ciudad_estadisticas:'Estatísticas',ciudad_posicion:'Posição',ciudad_nivel_label:'Nível municipal:',
        ciudad_info:'Veja o estado completo da sua cidade.'
    },
    ru: {
        nav_perfil:'ПРОФИЛЬ',nav_amigos:'ДРУЗЬЯ',nav_ciudad:'ГОРОД',nav_ranking:'РЕЙТИНГ',nav_retiros:'ВЫВОДЫ',
        greeting_hola:'ПРИВЕТ,',genero_m:'Мэр',genero_f:'Мэр',
        section_edificios:'Здания',section_feed:'Лента',
        building_banco:'Банк',building_banco_sub:'Купить GRAM/Stars',
        building_premium:'Премиум',building_premium_sub:'VIP-планы',
        building_centro:'Финансовый центр',building_centro_sub:'6 разделов',
        building_parque:'Парк',building_parque_sub:'Реклама',
        building_retiros:'Выводы',building_retiros_sub:'USDT · GRAM',
        building_piscina:'Бассейн',building_fabrica:'Фабрика',building_escuela:'Школа',building_hospital:'Больница',
        gauge_tesoreria:'Казна',gauge_produccion:'Алмазов/ч',gauge_nivel:'Уровень',
        lvl_label:'Уровень',prod_label:'Произв',mejora_label:'Улучшение',
        btn_cerrar:'ЗАКРЫТЬ',btn_mejorar:'УЛУЧШИТЬ',
        perfil_titulo:'Профиль',perfil_amigos:'Друзья',perfil_rango:'Ранг',perfil_bono:'Бонус',
        perfil_titulo_tratamiento:'Обращение',idioma_titulo:'Язык',idioma_titulo_btn:'🌐 Язык',
        amigos_titulo:'Пригласить',amigos_gana:'Получайте 10%!',amigos_tu_codigo:'Код:',
        amigos_copiar:'📋 КОПИРОВАТЬ',amigos_ganancias:'Доход',
        ranking_titulo:'Рейтинг',ranking_tu_rango:'Ваш ранг',ranking_tu_posicion:'Позиция',
        ranking_bono:'Недельный бонус',ranking_historial:'🏆 История',
        ranking_countdown:'⏳ Время до следующей выплаты',
        cd_dias:'Дней',cd_horas:'Часов',cd_min:'Мин',cd_seg:'Сек',
        historial_titulo:'🏆 История',historial_info:'Публичный недельный реестр.',
        banco_titulo:'Банк',banco_info:'Купить за GRAM или Stars.',
        banco_conectada:'Кошелёк подключён',banco_desconectar:'Отключить',banco_metodo:'Способ:',
        premium_titulo:'Премиум',premium_beneficios:'🎁 Преимущества:',
        premium_beneficios_txt:'x2 производство · Без рекламы · Значок',
        centro_titulo:'🏛️ Финансовый центр',
        centro_info:'Финансовый центр — экономический двигатель вашего города: инвестируйте, управляйте ресурсами, соревнуйтесь за редкие предметы и развивайтесь за счёт навыка.',
        centro_sin_diamantes:'Нет алмазов',
        juego_timing:'Timing',juego_timing_sub:'Навык',juego_match:'Match',juego_match_sub:'Память',
        juego_bolsa:'Биржа',juego_bolsa_sub:'Инвестиции',juego_subasta:'Аукцион',juego_subasta_sub:'P2P',
        juego_expedicion:'Экспедиция',juego_expedicion_sub:'Управление',juego_crafting:'Крафт',juego_crafting_sub:'Слияние',
        timing_info_title:'Как играть:',timing_info:'Стрелка движется по шкале. Нажмите "СТОП" в зелёной зоне. Чем ближе к центру — тем больше множитель (2x–5x). Промах — потеря входа.',
        timing_iniciar:'СТАРТ',timing_detener:'СТОП!',
        match_info_title:'Как играть:',match_info:'Символы будут вспыхивать по одному. Запомните и воспроизведите порядок. Каждый раунд добавляет 2 символа. До 8 раундов.',
        match_comenzar:'НАЧАТЬ',
        bolsa_info_title:'Как работает:',bolsa_info:'Биржа вашего города. Покупайте акции дёшево, продавайте дорого. Цены обновляются каждые 30 секунд.',
        bolsa_portfolio:'💼 Портфель',bolsa_sin:'Пока нет',
        subasta_info_title:'Как работает:',subasta_info:'Мэры соревнуются за редкие предметы. Успейте поставить ставку. Комиссия дома — 5%.',
        exp_info_title:'Как работает:',exp_info:'Отправьте шахтёров в опасные зоны. Ресурсы всегда будут, но износ снижает прибыль на 20%–50%.',
        exp_activas:'🚛 Активные',exp_ninguna:'Нет',
        craft_info_title:'Как работает:',craft_info:'Соединяйте алмазы, чтобы улучшать инструменты. Без случайности: каждая инвестиция гарантирует улучшение.',
        apuesta_label:'Ставка:',
        daily_titulo:'Награда',daily_subtitulo:'Заберите!',
        daily_dia:'День',daily_recompensa:'Награда',daily_reclamar:'ЗАБРАТЬ',
        ads_ver:'СМОТРЕТЬ +20 💎',
        ads_reintentar:'🔄 Повторить',
        ads_no_disponible:'Реклама недоступна.',
        ads_cargando:'Загрузка сети...',
        asistente_rol:'Ассистент',
        onboarding_placeholder:'Название',onboarding_fundar:'🏙️ ОСНОВАТЬ',
        feed_titulo:'Добро пожаловать',feed_sub:'События здесь',
        retiros_titulo:'💸 Выводы',
        retiros_info:'Вывод USDT (TON) на ваш кошелёк. Скоро.',
        retiros_usdt_info:'USDT в сети TON. Минимум вывода: 10 USDT.',
        retiros_balance:'Казна',retiros_dia:'День',retiros_domingo:'Воскресенье',
        retiros_minimo:'Минимум',
        ciudad_titulo:'🏙️ Мой Город',ciudad_edificios:'Здания города',
        ciudad_estadisticas:'Статистика',ciudad_posicion:'Позиция',ciudad_nivel_label:'Уровень города:',
        ciudad_info:'Полный статус вашего города.'
    }
};

function t(key) {
    const l = userData.idioma || 'es';
    return (TRADUCCIONES[l] && TRADUCCIONES[l][key]) || TRADUCCIONES.es[key] || key;
}

function aplicarIdioma() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        const v = t(k);
        if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const k = el.getAttribute('data-i18n-placeholder');
        const v = t(k);
        if (v) el.placeholder = v;
    });
}

const NOMBRES_IDIOMA = { es:'Español', en:'English', pt:'Português', ru:'Русский' };

function seleccionarIdioma(c) {
    userData.idioma = c; aplicarIdioma();
    const l = document.getElementById('idioma-actual-label');
    if (l) l.textContent = NOMBRES_IDIOMA[c] || 'Español';
    closeAll(); saveUserData();
}

function abrirSelectorIdioma() { closeAll(); showModal('modalIdioma'); }

// ==========================================
// TEMA
// ==========================================
function aplicarTema() {
    const th = userData.theme || 'dark';
    document.body.setAttribute('data-theme', th);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = th === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
}

function toggleTheme() {
    userData.theme = userData.theme === 'dark' ? 'light' : 'dark';
    aplicarTema(); saveUserData();
}

// ==========================================
// UTILIDADES
// ==========================================
function esPremium() {
    if (!userData.premium_expires) return false;
    return new Date() < new Date(userData.premium_expires);
}

function actualizarPremiumUI() {
    const b = document.getElementById('premium-badge');
    if (b) b.style.display = esPremium() ? 'flex' : 'none';
}

function getTotalProduction() {
    let base = (userData.lvl_escuela * ECONOMIA.PRODUCCION.escuela) +
               (userData.lvl_fabrica * ECONOMIA.PRODUCCION.fabrica) +
               (userData.lvl_piscina * ECONOMIA.PRODUCCION.piscina) +
               (userData.lvl_hospital * ECONOMIA.PRODUCCION.hospital);
    if (esPremium()) base *= ECONOMIA.PREMIUM_MULTIPLICADOR;
    return base;
}

function getTituloAlcalde() { return userData.genero === 'F' ? 'Alcaldesa' : 'Alcalde'; }

function seleccionarGenero(g) {
    userData.genero = g;
    const m = document.getElementById('genero-M');
    const f = document.getElementById('genero-F');
    if (m) m.classList.toggle('active', g === 'M');
    if (f) f.classList.toggle('active', g === 'F');
}

function cambiarGeneroPerfil(g) {
    userData.genero = g;
    const m = document.getElementById('perfil-genero-M');
    const f = document.getElementById('perfil-genero-F');
    if (m) m.classList.toggle('active', g === 'M');
    if (f) f.classList.toggle('active', g === 'F');
    actualizarUI(); saveUserData();
}

function tiempoRelativo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'Justo ahora';
    if (s < 3600) return 'Hace ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'Hace ' + Math.floor(s / 3600) + ' h';
    return 'Hace ' + Math.floor(s / 86400) + ' días';
}

function registrarEvento(icono, titulo, subtitulo) {
    if (!userData.newsFeed) userData.newsFeed = [];
    userData.newsFeed.unshift({ icono, titulo, subtitulo, fecha: new Date().toISOString() });
    userData.newsFeed = userData.newsFeed.slice(0, 15);
    renderizarFeedNoticias();
}

function renderizarFeedNoticias() {
    const c = document.getElementById('feed-noticias'); if (!c) return;
    const evs = userData.newsFeed || [];
    if (evs.length === 0) {
        c.innerHTML = '<div class="feed-item"><div class="feed-icono">👋</div><div class="feed-texto"><div class="feed-titulo">' + t('feed_titulo') + '</div><div class="feed-subtitulo">' + t('feed_sub') + '</div></div></div>';
        return;
    }
    let h = '';
    for (const e of evs) h += '<div class="feed-item"><div class="feed-icono">' + e.icono + '</div><div class="feed-texto"><div class="feed-titulo">' + e.titulo + '</div><div class="feed-subtitulo">' + e.subtitulo + '</div><div class="feed-tiempo">' + tiempoRelativo(e.fecha) + '</div></div></div>';
    c.innerHTML = h;
}

function mostrarOnboardingSiHaceFalta() {
    if (!userData.city_name) {
        const p = document.getElementById('onboarding-screen');
        if (p) p.classList.remove('hidden');
    }
}

async function confirmarNombreCiudad() {
    const i = document.getElementById('onboarding-city-input');
    const n = i ? i.value.trim() : '';
    if (!n || n.length < 2) return alert('❌ Mínimo 2 letras');
    if (n.length > 20) return alert('❌ Máximo 20 caracteres');
    userData.city_name = n;
    const p = document.getElementById('onboarding-screen');
    if (p) p.classList.add('hidden');
    actualizarUI(); await saveUserData();
}

function destelloResultado(id, gano) {
    const m = document.getElementById(id); if (!m) return;
    m.classList.remove('ganaste', 'perdiste');
    void m.offsetWidth;
    m.classList.add(gano ? 'ganaste' : 'perdiste');
    setTimeout(() => m.classList.remove('ganaste', 'perdiste'), 900);
}

function spawnConfetti() {
    const cols = ['#facc15','#4ade80','#38bdf8','#f472b6','#a78bfa','#f97316','#ef4444','#34d399'];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.style.cssText = 'position:fixed;width:' + (6 + Math.random() * 10) + 'px;height:' + (6 + Math.random() * 10) + 'px;z-index:9999;pointer-events:none;left:' + Math.random() * 100 + '%;top:' + (Math.random() * 50 + 20) + '%;background:' + cols[Math.floor(Math.random() * cols.length)] + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';animation:confetti ' + (1 + Math.random() * 2) + 's ease forwards;';
        document.body.appendChild(p);
        setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 3000);
    }
}

// ==========================================
// ASISTENTE VALERIA (personalizada + hipervínculos)
// ==========================================
function getSaludoValeria() {
    const h = new Date().getHours();
    const nombre = userData.first_name || '';
    if (h < 12) return '🏛️ Buenos días, ' + getTituloAlcalde() + ' ' + nombre + '.';
    if (h < 19) return '🏛️ Buenas tardes, ' + getTituloAlcalde() + ' ' + nombre + '.';
    return '🏛️ Buenas noches, ' + getTituloAlcalde() + ' ' + nombre + '.';
}

// Mejora más barata disponible (para consejo personalizado)
function getConsejoMejoraBarata() {
    let mejor = null;
    for (const b of ['piscina','fabrica','escuela','hospital']) {
        const n = userData['lvl_' + b] || 0;
        const costo = Math.floor(ECONOMIA.PRECIO_BASE[b] * Math.pow(ECONOMIA.CRECIMIENTO_MEJORA, n));
        if (!mejor || costo < mejor.costo) mejor = { b: b, n: n, costo: costo };
    }
    return mejor;
}

// Jugadas gratuitas restantes hoy en el Centro Financiero
function getJugadasRestantes() {
    if (userData.haInvertido) return null; // ilimitadas tras invertir
    const hoy = new Date().toDateString();
    let usadas = 0;
    if (userData.jugadasHoy && userData.jugadasHoy.fecha === hoy) {
        for (const k in ECONOMIA.LIMITES_JUEGOS) usadas += (userData.jugadasHoy[k] || 0);
    }
    const total = Object.values(ECONOMIA.LIMITES_JUEGOS).reduce((a, c) => a + c, 0);
    return Math.max(0, total - usadas);
}

// Cada consejo es un hipervínculo: {icono, texto, accion, cta}
function construirConsejosValeria() {
    const consejos = [];
    const nombre = userData.first_name || '';
    const titulo = getTituloAlcalde();
    const ciudad = userData.city_name || 'su ciudad';
    const hoy = new Date().toDateString();
    const uR = userData.last_daily_claim ? new Date(userData.last_daily_claim).toDateString() : null;
    const premium = esPremium();
    const dia = Math.min((userData.daily_streak || 0) + 1, ECONOMIA.DIARIA_RACHA_MAX);
    const tesoreria = Math.floor(userData.diamonds || 0);
    const prod = Math.floor(getTotalProduction());

    // 1) Recompensa diaria pendiente
    if (uR !== hoy) {
        consejos.push({
            icono: '🎁',
            texto: nombre + ', la recaudación diaria de ' + ciudad + ' está lista: día ' + dia + ' le corresponden ' + getDailyRewardAmount(dia) + ' 💎.',
            accion: 'daily', cta: 'Reclamar ahora'
        });
    }

    // 2) Arcas bajas → anuncio o Banco
    if (tesoreria < 200) {
        if (!premium) {
            consejos.push({
                icono: '📺',
                texto: 'Las arcas de ' + ciudad + ' están bajas (' + tesoreria + ' 💎). Un anuncio en el Parque le daría ' + ECONOMIA.ANUNCIO_RECOMPENSA + ' 💎 gratis.',
                accion: 'ads', cta: 'Ver anuncio'
            });
        } else {
            consejos.push({
                icono: '🏦',
                texto: titulo + ' ' + nombre + ', sus arcas están en ' + tesoreria + ' 💎. El Banco tiene packs desde 0.10 GRAM.',
                accion: 'banco', cta: 'Ir al Banco'
            });
        }
    }

    // 3) Mejora de edificio personalizada (cálculo real de costo y producción)
    const mj = getConsejoMejoraBarata();
    if (mj) {
        const nombres = { piscina: 'la Piscina', fabrica: 'la Fábrica', escuela: 'la Escuela', hospital: 'el Hospital' };
        const prodNueva = (mj.n + 1) * ECONOMIA.PRODUCCION[mj.b];
        if (tesoreria >= mj.costo) {
            consejos.push({
                icono: '🏗️',
                texto: 'Puede mejorar ' + nombres[mj.b] + ' al nivel ' + (mj.n + 1) + ' por ' + mj.costo.toLocaleString() + ' 💎: pasará a producir ' + prodNueva + ' 💎/h.',
                accion: 'upgrade:' + mj.b, cta: 'Mejorar ' + nombres[mj.b]
            });
        } else {
            consejos.push({
                icono: '📈',
                texto: 'Le faltan ' + (mj.costo - tesoreria).toLocaleString() + ' 💎 para subir ' + nombres[mj.b] + ' al nivel ' + (mj.n + 1) + '. Su producción total pasaría de ' + prod + ' a ' + (prod + ECONOMIA.PRODUCCION[mj.b]) + ' 💎/h.',
                accion: 'ads', cta: 'Ganar 💎'
            });
        }
    }

    // 4) Centro Financiero (jugadas gratuitas + sugerencia según tesorería)
    const restantes = getJugadasRestantes();
    if (restantes !== null && restantes > 0 && tesoreria >= 10) {
        let sugerencia = 'Timing Tap paga hasta x5.';
        if (tesoreria >= 300) sugerencia = 'Con ' + tesoreria + ' 💎 podría lanzar una Expedición a la Mina Abandonada (retorno 600 💎).';
        consejos.push({
            icono: '🏛️',
            texto: 'Aún tiene ' + restantes + ' jugadas gratuitas hoy en el Centro Financiero. ' + sugerencia,
            accion: 'centro', cta: 'Ir al Centro Financiero'
        });
    }

    // 5) Premium
    if (!premium) {
        consejos.push({
            icono: '👑',
            texto: 'Con Premium duplicaría su producción (de ' + prod + ' a ' + (prod * ECONOMIA.PREMIUM_MULTIPLICADOR) + ' 💎/h) y sin anuncios. Desde 0.20 GRAM.',
            accion: 'premium', cta: 'Ver planes'
        });
    }

    // 6) Referidos
    if ((userData.referred_users || []).length === 0) {
        consejos.push({
            icono: '👥',
            texto: 'Sin referidos aún: cada amigo que invite le pagará el ' + Math.round(ECONOMIA.REFERIDO_PCT * 100) + '% de sus ganancias de por vida.',
            accion: 'friends', cta: 'Invitar amigos'
        });
    }

    // 7) Ranking
    if (userData.weekly_rank && userData.weekly_rank <= 10) {
        consejos.push({
            icono: '🏆',
            texto: '¡Excelente! Va #' + userData.weekly_rank + ' en el Ranking Municipal con bono estimado de ' + Math.floor(userData.projectedReward || 0) + ' 💎 semanales. A defender la posición.',
            accion: 'ranking', cta: 'Ver ranking'
        });
    }

    if (consejos.length === 0) {
        consejos.push({
            icono: '✅',
            texto: 'Todo en orden, ' + titulo + ' ' + nombre + '. ' + ciudad + ' produce ' + prod + ' 💎/h. Vuelva mañana por su recompensa diaria.',
            accion: 'centro', cta: 'Ir al Centro Financiero'
        });
    }
    return consejos.slice(0, 4);
}

// Hipervínculos de Valeria: llevan al jugador directo al destino
function valeriaAccion(accion) {
    if (!accion) return;
    closeAll();
    if (accion.indexOf('upgrade:') === 0) { openBuilding(accion.split(':')[1]); return; }
    switch (accion) {
        case 'daily':   openDailyReward(); break;
        case 'ads':     showAdsModal(); break;
        case 'banco':   openBank(); break;
        case 'centro':  openCasino(); break;
        case 'premium': openStore(); break;
        case 'friends': openFriends(); break;
        case 'ranking': openRanking(); break;
    }
}

function hayAlgoUrgenteParaValeria() {
    const hoy = new Date().toDateString();
    const uR = userData.last_daily_claim ? new Date(userData.last_daily_claim).toDateString() : null;
    if (uR !== hoy) return true;
    if ((userData.diamonds || 0) < 200) return true;
    const nB = ['lvl_piscina','lvl_fabrica','lvl_escuela','lvl_hospital'].filter(k => (userData[k] || 0) < 3);
    if (nB.length >= 3) return true;
    return false;
}

function actualizarBadgeValeria() {
    const b = document.getElementById('asistente-boton');
    if (!b) return;
    b.classList.toggle('urgente', hayAlgoUrgenteParaValeria());
}

function abrirAsistente() {
    closeAll(); showModal('modalAsistente');
    const m = document.getElementById('asistente-mensaje');
    if (m) {
        const cs = construirConsejosValeria();
        let h = '<div style="margin-bottom:10px;">' + getSaludoValeria() + '</div>';
        for (const c of cs) {
            h += '<div class="valeria-consejo" onclick="valeriaAccion(\'' + c.accion + '\')">';
            h += '<div>' + c.icono + ' ' + c.texto + '</div>';
            h += '<div class="valeria-cta">' + c.cta + ' →</div>';
            h += '</div>';
        }
        m.innerHTML = h;
    }
    actualizarBadgeValeria();
}

// ==========================================
// UI GENERAL
// ==========================================
function actualizarUI() {
    const d = document.getElementById('diamonds');
    if (d) {
        const v = Math.floor(userData.diamonds || 0);
        d.textContent = v;
        const n = v.toString().length;
        d.style.fontSize = (n >= 9 ? 11 : n >= 7 ? 13 : n >= 5 ? 17 : 22) + 'px';
    }
    const r = document.getElementById('rate');
    if (r) r.textContent = Math.floor(getTotalProduction());
    const p = ((userData.lvl_piscina || 0) + (userData.lvl_fabrica || 0) + (userData.lvl_escuela || 0) + (userData.lvl_hospital || 0)) / 4;
    const pct = Math.min(100, Math.round((p / 50) * 100));
    const pe = document.getElementById('nivel-municipal-pct');
    if (pe) pe.textContent = pct + '%';
    const gn = document.getElementById('gauge-nivel');
    if (gn) gn.style.background = 'conic-gradient(#a78bfa ' + (pct * 3.6) + 'deg, rgba(128,128,128,0.15) ' + (pct * 3.6) + 'deg)';
    actualizarBadgeValeria();
    ['piscina','fabrica','escuela','hospital'].forEach(id => {
        const el = document.getElementById('lvl_' + id);
        if (el) el.textContent = userData['lvl_' + id];
    });
    const ud = document.getElementById('user-display');
    if (ud) ud.textContent = userData.first_name || 'Usuario';
    const tt = document.getElementById('titulo-tratamiento');
    if (tt) tt.textContent = getTituloAlcalde().toUpperCase();
    const cn = document.getElementById('city-name-display');
    if (cn) cn.textContent = userData.city_name ? '🏙️ ' + userData.city_name : '';
    const cs = document.getElementById('casino-saldo');
    if (cs) cs.textContent = Math.floor(userData.diamonds);
    const cr = document.getElementById('casino-rescue');
    if (cr) cr.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
    const rb = document.getElementById('retiros-balance');
    if (rb) rb.textContent = Math.floor(userData.diamonds);
}

function showModal(id) {
    const o = document.getElementById('overlay');
    const m = document.getElementById(id);
    if (o) o.style.display = 'block';
    if (m) m.style.display = 'block';
}

function closeAll() {
    const o = document.getElementById('overlay');
    if (o) o.style.display = 'none';
    ['modalPerfil','modalFriends','modalCiudad','modalRanking','modalBank','modalStore',
     'modalRetiros','modalCasino','modalTiming','modalMatch','modalBolsa',
     'modalSubasta','modalExpedicion','modalCrafting','modalEscuela',
     'modalFabrica','modalPiscina','modalHospital','modalDailyReward',
     'modalAds','modalAsistente','modalIdioma','modalHistorialPremios'
    ].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
    if (timingInterval) clearInterval(timingInterval);
    // NO reseteamos el navbar aquí: el ícono activo se queda amarillo
    // mientras su ventana esté abierta (cada openXXX lo setea explícitamente)
}

function setActiveNav(tab) {
    document.querySelectorAll('.nav-item').forEach(item => {
        const nav = item.getAttribute('data-nav');
        if (nav === tab) item.classList.add('active');
        else item.classList.remove('active');
    });
}

// ==========================================
// PERFIL
// ==========================================
function openPerfil() {
    closeAll(); actualizarPerfil(); showModal('modalPerfil'); setActiveNav('perfil');
}

function actualizarPerfil() {
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    let nombre = userData.first_name || userData.username || 'Usuario';
    const ne = document.getElementById('perfil-name'); if (ne) ne.textContent = nombre;
    const ae = document.getElementById('perfil-avatar');
    if (ae) {
        if (usuario && usuario.photo_url) ae.innerHTML = '<img src="' + usuario.photo_url + '">';
        else ae.textContent = nombre.charAt(0).toUpperCase();
    }
    const stats = {
        'perfil-diamonds': Math.floor(userData.diamonds || 0),
        'perfil-rate': Math.floor(getTotalProduction()),
        'perfil-amigos': (userData.referred_users || []).length,
        'perfil-rango-display': userData.rank || 'Ciudadano',
        'perfil-proyeccion': Math.floor(userData.projectedReward || 0) + ' 💎',
        'perfil-premium': esPremium() ? 'Sí ⭐' : 'No',
        'perfil-rank-badge': userData.rank || 'Ciudadano'
    };
    for (const id in stats) { const el = document.getElementById(id); if (el) el.textContent = stats[id]; }
    const m = document.getElementById('perfil-genero-M');
    const f = document.getElementById('perfil-genero-F');
    if (m) m.classList.toggle('active', (userData.genero || 'M') === 'M');
    if (f) f.classList.toggle('active', userData.genero === 'F');
}

// ==========================================
// AMIGOS
// ==========================================
function openFriends() {
    closeAll();
    const c = document.getElementById('referral-code'); if (c) c.textContent = userData.referral_code || 'CARGANDO...';
    const cn = document.getElementById('ref-count'); if (cn) cn.textContent = (userData.referred_users || []).length;
    const tt = document.getElementById('ref-total'); if (tt) tt.textContent = (userData.referral_earnings || 0) + ' 💎';
    showModal('modalFriends'); setActiveNav('amigos');
}

function copyReferralCode() {
    if (!userData.referral_code) return alert('❌ Sin código');
    const enlace = 'https://t.me/DiamondCityBot?start=' + userData.referral_code;
    const msg = '🏙️💎 ¡Únete a Diamond City!\n\n' + enlace;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(() => alert('✅ Copiado!')).catch(() => prompt('Copia:', msg));
    } else prompt('Copia:', msg);
}

// ==========================================
// CIUDAD → ahora lleva a la PANTALLA PRINCIPAL
// (donde están el nombre de la ciudad, el usuario y los edificios)
// ==========================================
function openCity() {
    closeAll();
    setActiveNav('ciudad');
    actualizarUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Panel completo de ciudad (se conserva para uso futuro)
function actualizarCiudad() {
    const nombre = document.getElementById('ciudad-nombre');
    if (nombre) nombre.textContent = userData.city_name || 'Sin nombre';
    const alcalde = document.getElementById('ciudad-alcalde');
    if (alcalde) alcalde.textContent = getTituloAlcalde() + ' ' + (userData.first_name || userData.username || 'Usuario');

    const prom = ((userData.lvl_piscina || 0) + (userData.lvl_fabrica || 0) + (userData.lvl_escuela || 0) + (userData.lvl_hospital || 0)) / 4;
    const pct = Math.min(100, Math.round((prom / 50) * 100));
    const np = document.getElementById('ciudad-nivel-pct');
    if (np) np.textContent = pct + '%';

    const edifs = [
        { id: 'piscina', ico: '🏊', nombre: t('building_piscina'), color: '#38bdf8' },
        { id: 'fabrica', ico: '🏭', nombre: t('building_fabrica'), color: '#a78bfa' },
        { id: 'escuela', ico: '🏫', nombre: t('building_escuela'), color: '#fbbf24' },
        { id: 'hospital',ico: '🏥', nombre: t('building_hospital'), color: '#f87171' }
    ];
    const cont = document.getElementById('ciudad-edificios');
    if (cont) {
        let h = '';
        for (const e of edifs) {
            const lvl = userData['lvl_' + e.id] || 0;
            h += '<div class="city-edificio" style="border-color:' + e.color + '40;" onclick="closeAll();openBuilding(\'' + e.id + '\')">';
            h += '<div class="city-edificio-ico">' + e.ico + '</div>';
            h += '<div class="city-edificio-nombre">' + e.nombre + '</div>';
            h += '<div class="city-edificio-nivel" style="color:' + e.color + ';">' + t('lvl_label') + ' ' + lvl + '</div>';
            h += '</div>';
        }
        cont.innerHTML = h;
    }

    const tes = document.getElementById('ciudad-tesoreria');
    if (tes) tes.textContent = Math.floor(userData.diamonds || 0);
    const prod = document.getElementById('ciudad-produccion');
    if (prod) prod.textContent = Math.floor(getTotalProduction());
    const rango = document.getElementById('ciudad-rango');
    if (rango) rango.textContent = userData.rank || 'Ciudadano';
    const pos = document.getElementById('ciudad-posicion');
    if (pos) pos.textContent = userData.weekly_rank ? '#' + userData.weekly_rank : 'Sin calcular';
    const ami = document.getElementById('ciudad-amigos');
    if (ami) ami.textContent = (userData.referred_users || []).length;
}

// ==========================================
// RANKING
// ==========================================
function openRanking() {
    closeAll(); actualizarRankingModal(); iniciarCountdown(); showModal('modalRanking'); setActiveNav('ranking');
}

function actualizarRankingModal() {
    const r = document.getElementById('user-rank-display'); if (r) r.textContent = userData.rank || 'Ciudadano';
    const p = document.getElementById('user-position-display'); if (p) p.textContent = userData.weekly_rank ? '#' + userData.weekly_rank : 'Sin calcular';
    const pr = document.getElementById('projected-reward-display'); if (pr) pr.textContent = Math.floor(userData.projectedReward || 0) + ' 💎';
    const l = document.getElementById('ranking-lista'); if (!l) return;
    const top = globalPoolData.user_rankings.slice(0, 30);
    if (top.length === 0) { l.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Sin datos aún.</div>'; return; }
    let h = '';
    top.forEach((j, i) => {
        const esYo = j.id === userData.id;
        const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        const titulo = j.genero === 'F' ? 'Alcaldesa' : 'Alcalde';
        const nombre = j.first_name || j.username || 'Alcalde';
        h += '<div class="ranking-fila' + (esYo ? ' yo' : '') + '">';
        h += '<div class="ranking-pos">' + medalla + '</div>';
        h += '<div class="ranking-info">';
        h += '<div class="ranking-ciudad">🏙️ ' + j.city_name + '</div>';
        h += '<div class="ranking-alcalde">' + (esYo ? 'Tú · ' : '') + titulo + ' ' + nombre + '</div>';
        h += '</div>';
        h += '<div class="ranking-produccion">⚡' + Math.floor(j.produccion) + '/h</div>';
        h += '</div>';
    });
    l.innerHTML = h;
}

function iniciarCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    function tick() {
        const ahora = new Date();
        const proximoDomingo = new Date(ahora);
        proximoDomingo.setUTCHours(0, 0, 0, 0);
        const dia = proximoDomingo.getUTCDay();
        const diasHastaDomingo = (7 - dia) % 7 || 7;
        proximoDomingo.setUTCDate(proximoDomingo.getUTCDate() + diasHastaDomingo);
        const diff = proximoDomingo - ahora;
        const d = Math.floor(diff / 86400000);
        const hs = Math.floor((diff % 86400000) / 3600000);
        const mn = Math.floor((diff % 3600000) / 60000);
        const sg = Math.floor((diff % 60000) / 1000);
        const ed = document.getElementById('cd-dias'); if (ed) ed.textContent = d;
        const eh = document.getElementById('cd-horas'); if (eh) eh.textContent = hs;
        const em = document.getElementById('cd-min'); if (em) em.textContent = mn;
        const es = document.getElementById('cd-seg'); if (es) es.textContent = sg;
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
}

async function abrirHistorialPremios() {
    closeAll(); showModal('modalHistorialPremios');
    const c = document.getElementById('historial-premios-lista'); if (!c) return;
    c.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Cargando...</div>';
    try {
        const r = await _supabase.from('payout_history').select('*').order('fecha', { ascending: false }).limit(30);
        const f = (r && r.data) || [];
        if (f.length === 0) { c.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Sin historial todavía.</div>'; return; }
        let h = '';
        f.forEach(x => {
            h += '<div class="feed-item"><div class="feed-icono">💎</div><div class="feed-texto"><div class="feed-titulo">#' + x.posicion + ' · 🏙️ ' + (x.city_name || 'Ciudad') + ' (' + (x.first_name || x.username || 'Alcalde') + ')</div><div class="feed-subtitulo">+' + x.premio + ' 💎</div><div class="feed-tiempo">' + new Date(x.fecha).toLocaleDateString() + '</div></div></div>';
        });
        c.innerHTML = h;
    } catch (e) { c.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Error cargando historial.</div>'; }
}

// ==========================================
// RETIROS (solo USDT TON, min 10)
// ==========================================
function openWithdraw() {
    closeAll();
    showModal('modalRetiros');
    const b = document.getElementById('retiros-balance');
    if (b) b.textContent = Math.floor(userData.diamonds);
    setActiveNav('retiros');
}

// ==========================================
// BANCO
// ==========================================
function openBank() {
    closeAll(); showModal('modalBank'); cambiarMetodoPago('gram');
}

function actualizarAvisoBanco() {
    const aviso = document.getElementById('banco-aviso');
    if (!aviso) return;
    const conectada = !!(tonConnectUI && tonConnectUI.connected);
    aviso.style.display = conectada ? 'none' : 'block';
}

function cambiarMetodoPago(m) {
    metodoPagoBanco = m;
    const g = document.getElementById('tab-gram');
    const s = document.getElementById('tab-stars');
    if (g) { g.style.background = m === 'gram' ? 'var(--color-banco)' : 'var(--bg-elevated)'; g.style.color = m === 'gram' ? '#000' : 'var(--text-secondary)'; }
    if (s) { s.style.background = m === 'stars' ? '#facc15' : 'var(--bg-elevated)'; s.style.color = m === 'stars' ? '#000' : 'var(--text-secondary)'; }
    actualizarListaCompra();
}

function actualizarListaCompra() {
    const conectada = !!(tonConnectUI && tonConnectUI.connected);
    actualizarAvisoBanco();
    const l = document.getElementById('bankList'); if (!l) return;
    let h = '';
    for (const p of PACKS_DIAMANTES) {
        if (metodoPagoBanco === 'gram') {
            const col = conectada ? '#4ade80' : '#334155';
            const txt = conectada ? 'COMPRAR' : 'CONECTAR WALLET';
            const dis = conectada ? '' : 'disabled';
            h += '<div style="background:var(--bg-elevated);border-radius:12px;padding:16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--glass-border);">';
            h += '<div><strong>' + p.diamantes + ' 💎</strong><div style="font-size:12px;color:var(--text-secondary);">' + p.ton.toFixed(2) + ' GRAM</div></div>';
            h += '<button onclick="comprarConGram(' + p.ton + ')" style="background:' + col + ';border:none;padding:10px 20px;border-radius:30px;color:white;font-weight:700;" ' + dis + '>' + txt + '</button>';
            h += '</div>';
        } else {
            h += '<div style="background:var(--bg-elevated);border-radius:12px;padding:16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--glass-border);">';
            h += '<div><strong>' + p.diamantes + ' 💎</strong><div style="font-size:12px;color:var(--text-secondary);">' + p.stars + ' ⭐</div></div>';
            h += '<button onclick="comprarConStars(' + p.diamantes + ')" class="btn-stars"><i class="fa-solid fa-star"></i> COMPRAR</button>';
            h += '</div>';
        }
    }
    l.innerHTML = h;
}

async function comprarConGram(tonAmount) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet');
    // CORREGIDO: 1 GRAM = 1,000 💎 → cuadra exacto con los packs del Banco
    const d = Math.max(100, Math.floor(tonAmount / CONFIG.PRECIO_COMPRA));
    if (!confirm('¿Pagar ' + tonAmount.toFixed(2) + ' GRAM por ' + d + ' 💎?')) return;
    try {
        await tonConnectUI.sendTransaction({
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{ address: CONFIG.BILLETERA_PROPIETARIO, amount: Math.floor(tonAmount * 1e9).toString() }]
        });
        userData.diamonds += d; userData.haInvertido = true;
        registrarEvento('💎', 'Compra confirmada', '+' + d + ' 💎');
        await saveUserData(); actualizarUI(); spawnConfetti();
        alert('✅ +' + d + ' 💎');
        closeAll();
    } catch (e) { alert('❌ ' + (e.message || 'Cancelado')); }
}

async function comprarConStars(diamantes) {
    const p = PACKS_DIAMANTES.find(x => x.diamantes === diamantes);
    if (!p) return alert('❌ Pack no encontrado');
    try {
        const resp = await fetch((CONFIG.API_BASE || '') + '/api/create-stars-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id, type: 'diamonds', amount: p.diamantes, stars: p.stars })
        });
        const data = await resp.json();
        if (!data.success || !data.invoiceLink) { alert('⚠️ No se pudo generar el pago.'); return; }
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openInvoice) {
            window.Telegram.WebApp.openInvoice(data.invoiceLink, function(status) {
                if (status === 'paid') {
                    userData.diamonds += p.diamantes;
                    userData.haInvertido = true;
                    registrarEvento('⭐', 'Compra con Stars', '+' + p.diamantes + ' 💎');
                    saveUserData(); actualizarUI(); spawnConfetti();
                    alert('✅ +' + p.diamantes + ' 💎');
                    closeAll();
                } else if (status === 'cancelled') { alert('❌ Pago cancelado'); }
                else if (status === 'failed') { alert('❌ Pago fallido'); }
            });
        } else {
            alert('❌ Abre la app desde Telegram para pagar.');
        }
    } catch (e) {
        console.error(e);
        alert('⚠️ El backend de Stars aún no está configurado.');
    }
}

// ==========================================
// PREMIUM
// ==========================================
function openStore() {
    closeAll(); showModal('modalStore'); cambiarMetodoPagoPremium('gram');
}

function cambiarMetodoPagoPremium(m) {
    metodoPagoPremium = m;
    const g = document.getElementById('premium-tab-gram');
    const s = document.getElementById('premium-tab-stars');
    if (g) { g.style.background = m === 'gram' ? 'var(--color-premium)' : 'var(--bg-elevated)'; g.style.color = m === 'gram' ? '#000' : 'var(--text-secondary)'; }
    if (s) { s.style.background = m === 'stars' ? '#facc15' : 'var(--bg-elevated)'; s.style.color = m === 'stars' ? '#000' : 'var(--text-secondary)'; }
    renderPlanesPremium();
}

function renderPlanesPremium() {
    const conectada = !!(tonConnectUI && tonConnectUI.connected);
    const c = document.getElementById('premium-plans'); if (!c) return;
    let h = '';
    for (const p of PREMIUM_PLANS) {
        if (metodoPagoPremium === 'gram') {
            const col = conectada ? '#8b5cf6' : '#334155';
            const txt = conectada ? 'COMPRAR' : 'CONECTAR WALLET';
            const dis = conectada ? '' : 'disabled';
            h += '<div style="background:var(--bg-elevated);border-radius:16px;padding:20px;margin:12px 0;border:1px solid var(--glass-border);">';
            h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><strong style="font-size:18px;">' + p.name + '</strong><span style="color:#facc15;font-weight:700;">' + p.ton + ' GRAM</span></div>';
            h += '<button onclick="comprarPremiumGram(' + p.days + ')" style="background:' + col + ';border:none;border-radius:30px;padding:14px;width:100%;color:white;font-weight:700;" ' + dis + '>' + txt + '</button>';
            h += '</div>';
        } else {
            h += '<div style="background:var(--bg-elevated);border-radius:16px;padding:20px;margin:12px 0;border:1px solid var(--glass-border);">';
            h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><strong style="font-size:18px;">' + p.name + '</strong><span style="color:#facc15;font-weight:700;">' + p.stars + ' ⭐</span></div>';
            h += '<button onclick="comprarPremiumStars(' + p.days + ')" class="btn-stars" style="width:100%;"><i class="fa-solid fa-star"></i> COMPRAR</button>';
            h += '</div>';
        }
    }
    c.innerHTML = h;
}

async function comprarPremiumGram(days) {
    if (!tonConnectUI || !tonConnectUI.connected) return alert('❌ Conecta tu wallet');
    const p = PREMIUM_PLANS.find(x => x.days === days);
    if (!p) return;
    if (!confirm('¿Activar Premium ' + p.name + ' por ' + p.ton + ' GRAM?')) return;
    try {
        await tonConnectUI.sendTransaction({
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [{ address: CONFIG.BILLETERA_PROPIETARIO, amount: Math.floor(p.ton * 1e9).toString() }]
        });
        const f = new Date(); f.setDate(f.getDate() + days);
        userData.premium_expires = f.toISOString();
        userData.haInvertido = true;
        registrarEvento('⭐', 'Premium activado', p.name);
        await saveUserData(); actualizarPremiumUI(); actualizarUI(); spawnConfetti();
        alert('✅ Premium ' + p.name + ' activado!');
        closeAll();
    } catch (e) { alert('❌ ' + (e.message || 'Cancelado')); }
}

async function comprarPremiumStars(days) {
    const p = PREMIUM_PLANS.find(x => x.days === days);
    if (!p) return;
    try {
        const resp = await fetch((CONFIG.API_BASE || '') + '/api/create-stars-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id, type: 'premium', days: days, stars: p.stars })
        });
        const data = await resp.json();
        if (!data.success || !data.invoiceLink) return alert('⚠️ No se pudo generar el pago.');
        if (window.Telegram.WebApp.openInvoice) {
            window.Telegram.WebApp.openInvoice(data.invoiceLink, function(status) {
                if (status === 'paid') {
                    const f = new Date(); f.setDate(f.getDate() + days);
                    userData.premium_expires = f.toISOString();
                    userData.haInvertido = true;
                    registrarEvento('⭐', 'Premium activado', p.name);
                    saveUserData(); actualizarPremiumUI(); actualizarUI(); spawnConfetti();
                    alert('✅ Premium ' + p.name + ' activado!');
                    closeAll();
                } else if (status === 'cancelled') { alert('❌ Pago cancelado'); }
                else if (status === 'failed') { alert('❌ Pago fallido'); }
            });
        }
    } catch (e) { alert('⚠️ Backend de Stars no configurado.'); }
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
        tonConnectUI.onStatusChange(w => {
            currentWallet = w;
            const b = document.getElementById('ton-connect-button');
            const wi = document.getElementById('wallet-info');
            if (w) { if (b) b.style.display = 'none'; if (wi) wi.classList.remove('hidden'); }
            else { if (b) b.style.display = 'flex'; if (wi) wi.classList.add('hidden'); }
            actualizarAvisoBanco();
            if (document.getElementById('modalBank') && document.getElementById('modalBank').style.display === 'block') actualizarListaCompra();
        });
    } catch (e) { console.error(e); }
}

async function disconnectWallet() {
    if (tonConnectUI) await tonConnectUI.disconnect();
    currentWallet = null;
    const b = document.getElementById('ton-connect-button');
    const wi = document.getElementById('wallet-info');
    if (b) b.style.display = 'flex';
    if (wi) wi.classList.add('hidden');
    actualizarAvisoBanco();
    actualizarListaCompra();
}

// ==========================================
// RICHADS
// ==========================================
async function initAds() {
    try {
        console.log('🎬 Iniciando RichAds...');
        let intentos = 0;
        while (typeof TelegramAdsController === 'undefined' && intentos < 12) {
            await new Promise(r => setTimeout(r, 500));
            intentos++;
        }
        if (typeof TelegramAdsController !== 'undefined') {
            window.TelegramAdsController = new TelegramAdsController();
            window.TelegramAdsController.initialize({
                pubId: CONFIG.RICHADS_PUB_ID,
                appId: CONFIG.RICHADS_APP_ID,
                debug: CONFIG.RICHADS_DEBUG
            });
            richAdsReady = true;
            console.log('✅ RichAds inicializado correctamente (intento ' + intentos + ')');
        } else {
            richAdsReady = false;
            console.warn('⚠️ TelegramAdsController no cargó. Verifica: 1) que el script tg-ob.js esté en el <head>, 2) que el dominio esté autorizado en RichAds, 3) que tu pubId/appId estén activos.');
        }
    } catch (e) {
        richAdsReady = false;
        console.error('❌ Error inicializando RichAds:', e);
    }
}

function showAdsModal() {
    closeAll();
    showModal('modalAds');
    actualizarEstadoAnuncio();
    if (!richAdsReady) setTimeout(() => { if (!richAdsReady) reintentarRichAds(); }, 1500);
}

function actualizarEstadoAnuncio() {
    const b = document.getElementById('richads-btn');
    const e = document.getElementById('ads-status');
    const retryBtn = document.getElementById('richads-retry-btn');
    if (!b) return;
    if (esPremium()) {
        b.disabled = true;
        if (e) e.innerHTML = '⭐ Premium: sin anuncios';
        if (retryBtn) retryBtn.style.display = 'none';
        return;
    }
    if (!richAdsReady || typeof TelegramAdsController === 'undefined') {
        b.disabled = true;
        if (e) e.innerHTML = '⚠️ ' + t('ads_no_disponible');
        if (retryBtn) retryBtn.style.display = 'block';
        return;
    }
    if (retryBtn) retryBtn.style.display = 'none';
    let puede = false;
    if (!userData.last_ad_watch) puede = true;
    else if (new Date() - new Date(userData.last_ad_watch) > 3600000) puede = true;
    if (puede) {
        b.disabled = false;
        if (e) e.innerHTML = '✅ ¡Anuncio disponible! Gana ' + ECONOMIA.ANUNCIO_RECOMPENSA + ' 💎';
    } else {
        b.disabled = true;
        let m = 60;
        if (userData.last_ad_watch) m = Math.ceil((3600000 - (new Date() - new Date(userData.last_ad_watch))) / 60000);
        if (e) e.innerHTML = '⏳ Próximo en ' + m + ' min';
    }
}

async function reintentarRichAds() {
    const e = document.getElementById('ads-status');
    if (e) e.innerHTML = '🔄 ' + t('ads_cargando');
    try {
        if (typeof TelegramAdsController !== 'undefined') {
            window.TelegramAdsController = new TelegramAdsController();
            window.TelegramAdsController.initialize({
                pubId: CONFIG.RICHADS_PUB_ID,
                appId: CONFIG.RICHADS_APP_ID,
                debug: CONFIG.RICHADS_DEBUG
            });
            richAdsReady = true;
            console.log('✅ RichAds reinicializado');
        } else {
            richAdsReady = false;
        }
    } catch (err) {
        richAdsReady = false;
        console.error('❌ Reinit RichAds:', err);
    }
    setTimeout(actualizarEstadoAnuncio, 800);
}

function showRichAds() {
    // FIX anti-exploit: Premium ya no recibe +20 infinitos por tocar el botón
    if (esPremium()) {
        alert('⭐ Eres Premium: sin anuncios. Su producción ya está duplicada.');
        return;
    }
    if (!richAdsReady || !window.TelegramAdsController) {
        reintentarRichAds();
        alert('📺 La red de anuncios se está recargando. Intenta en unos segundos.');
        return;
    }
    try {
        window.TelegramAdsController.triggerNativeNotification(true)
            .then(() => {
                userData.diamonds += ECONOMIA.ANUNCIO_RECOMPENSA;
                userData.last_ad_watch = new Date().toISOString();
                registrarEvento('📺', 'Anuncio visto', '+' + ECONOMIA.ANUNCIO_RECOMPENSA + ' 💎');
                saveUserData(); actualizarUI(); spawnConfetti();
                alert('🎁 +' + ECONOMIA.ANUNCIO_RECOMPENSA + ' 💎'); closeAll();
            })
            .catch((err) => {
                console.warn('⚠️ RichAds error:', err);
                alert('❌ No se pudo mostrar el anuncio.');
                actualizarEstadoAnuncio();
            });
    } catch (e) {
        console.error('❌ Error RichAds:', e);
        alert('❌ Error al mostrar el anuncio.');
    }
}

function rescueWithAd() {
    // FIX anti-exploit: el rescate es 1 por día para TODOS (Premium salta el anuncio, no el límite)
    if (userData.diamonds > 0) return alert('Solo con 0 diamantes');
    const hoy = new Date();
    if (userData.last_casino_rescue && hoy.toDateString() === new Date(userData.last_casino_rescue).toDateString()) return alert('Ya usado hoy');
    const darRescate = async () => {
        userData.last_casino_rescue = new Date().toISOString();
        userData.diamonds += ECONOMIA.RESCATE_SIN_DIAMANTES;
        registrarEvento('🚑', 'Rescate municipal', '+' + ECONOMIA.RESCATE_SIN_DIAMANTES + ' 💎');
        await saveUserData(); actualizarUI();
        alert('🎁 +' + ECONOMIA.RESCATE_SIN_DIAMANTES + ' 💎'); closeAll();
    };
    if (esPremium()) { darRescate(); return; }
    if (!richAdsReady || !window.TelegramAdsController) {
        reintentarRichAds();
        return alert('📺 Red recargando. Intenta de nuevo.');
    }
    window.TelegramAdsController.triggerNativeNotification(true)
        .then(darRescate)
        .catch(() => alert('❌ No se pudo mostrar'));
}

// ==========================================
// RECOMPENSA DIARIA
// ==========================================
function getDailyRewardAmount(day) {
    if (day <= 0) return 0;
    if (day >= ECONOMIA.DIARIA_RACHA_MAX) return esPremium() ? ECONOMIA.DIARIA_MAX * 2 : ECONOMIA.DIARIA_MAX;
    let b = ECONOMIA.DIARIA_BASE + (day - 1) * ECONOMIA.DIARIO_INCREMENTO;
    if (b > ECONOMIA.DIARIA_MAX) b = ECONOMIA.DIARIA_MAX;
    return esPremium() ? b * 2 : b;
}

function puedeReclamarDiaria() {
    if (!userData.last_daily_claim) return true;
    const u = new Date(userData.last_daily_claim); u.setHours(0,0,0,0);
    const h = new Date(); h.setHours(0,0,0,0);
    return h > u;
}

function openDailyReward() {
    closeAll();
    const racha = userData.daily_streak || 0;
    const dia = Math.min(racha + 1, ECONOMIA.DIARIA_RACHA_MAX);
    const puede = puedeReclamarDiaria();
    const de = document.getElementById('current-day'); if (de) de.textContent = dia;
    const re = document.getElementById('today-reward'); if (re) re.textContent = getDailyRewardAmount(dia) + ' 💎';
    const es = document.getElementById('daily-status'); if (es) es.innerHTML = puede ? '✅ ¡Disponible!' : '⏳ Vuelve mañana';
    const cal = document.getElementById('daily-calendar');
    if (cal) {
        let h = '';
        for (let i = 1; i <= ECONOMIA.DIARIA_RACHA_MAX; i++) {
            let c = 'daily-day';
            if (i <= racha) c += ' completed';
            else if (i === racha + 1 && puede) c += ' current';
            h += '<div class="' + c + '"><div>D' + i + '</div><div>' + getDailyRewardAmount(i) + '💎</div></div>';
        }
        cal.innerHTML = h;
    }
    showModal('modalDailyReward');
}

async function claimDailyReward() {
    if (!userData.id) return alert('❌ Sin usuario');
    if (!puedeReclamarDiaria()) return alert('❌ Ya reclamaste hoy');
    let nuevoDia = 1;
    if (userData.last_daily_claim && userData.daily_streak > 0) {
        const hs = (new Date() - new Date(userData.last_daily_claim)) / 3600000;
        if (hs < 48) nuevoDia = userData.daily_streak + 1;
    }
    if (nuevoDia > ECONOMIA.DIARIA_RACHA_MAX) nuevoDia = ECONOMIA.DIARIA_RACHA_MAX;
    const p = getDailyRewardAmount(nuevoDia);
    userData.diamonds += p; userData.daily_streak = nuevoDia;
    userData.last_daily_claim = new Date().toISOString();
    registrarEvento('🎁', 'Recompensa diaria', 'Día ' + nuevoDia + ' · +' + p + ' 💎');
    await saveUserData(); actualizarUI(); spawnConfetti();
    alert('✅ +' + p + ' 💎\nDía ' + nuevoDia + '/' + ECONOMIA.DIARIA_RACHA_MAX);
    closeAll();
}

// ==========================================
// CENTRO FINANCIERO
// ==========================================
function openCasino() {
    closeAll();
    const s = document.getElementById('casino-saldo'); if (s) s.textContent = Math.floor(userData.diamonds);
    const r = document.getElementById('casino-rescue'); if (r) r.style.display = (userData.diamonds <= 0 && !esPremium()) ? 'block' : 'none';
    showModal('modalCasino');
}

function abrirJuego(juego) {
    closeAll();
    const map = { timing:'modalTiming', matchmental:'modalMatch', bolsa:'modalBolsa', subasta:'modalSubasta', expedicion:'modalExpedicion', crafting:'modalCrafting' };
    const id = map[juego]; if (!id) return;
    showModal(id);
    const pre = juego === 'matchmental' ? 'match' : juego;
    const b = document.getElementById(pre + '-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
    if (juego === 'timing') prepararTimingUI();
    if (juego === 'matchmental') prepararMatchUI();
    if (juego === 'bolsa') renderBolsa();
    if (juego === 'subasta') renderSubasta();
    if (juego === 'expedicion') renderExpedicion();
    if (juego === 'crafting') renderCrafting();
}

function cerrarJuego() { closeAll(); openCasino(); }

function cambiarApuesta(juego, delta) {
    const pre = juego === 'matchmental' ? 'match' : juego;
    let v = apuestaActual[juego] || 10;
    v = Math.max(1, Math.min(1000, v + delta));
    apuestaActual[juego] = v;
    const d = document.getElementById(pre + '-bet-display'); if (d) d.textContent = v;
    const b = document.getElementById(pre + '-bet'); if (b) b.textContent = v + ' 💎';
}

function puedeJugar(juego, cant) {
    cant = cant || 1;
    if (userData.haInvertido) return true;
    const hoy = new Date().toDateString();
    if (userData.jugadasHoy.fecha !== hoy) userData.jugadasHoy = { timing:0, matchmental:0, bolsa:0, subasta:0, expedicion:0, crafting:0, fecha: hoy };
    return ((userData.jugadasHoy[juego] || 0) + cant) <= (ECONOMIA.LIMITES_JUEGOS[juego] || 10);
}

function registrarJugada(juego, cant) {
    cant = cant || 1;
    if (!userData.haInvertido) {
        if (!userData.jugadasHoy[juego]) userData.jugadasHoy[juego] = 0;
        userData.jugadasHoy[juego] += cant;
    }
}

// ==========================================
// TIMING TAP
// ==========================================
let timingInterval = null, timingPos = 0, timingDir = 1, timingVel = 1.5, tZI = 40, tZA = 20, tEnJuego = false;

function prepararTimingUI() {
    tZI = 30 + Math.random() * 30;
    tZA = 8 + Math.random() * 12;
    const z = document.getElementById('timing-zone'); if (z) { z.style.left = tZI + '%'; z.style.width = tZA + '%'; }
    const n = document.getElementById('timing-needle'); if (n) n.style.left = '0%';
    timingPos = 0; timingDir = 1; timingVel = 1.5 + Math.random(); tEnJuego = false;
    const sb = document.getElementById('timing-start-btn'); if (sb) sb.classList.remove('hidden');
    const tb = document.getElementById('timing-tap-btn'); if (tb) tb.classList.add('hidden');
    const r = document.getElementById('timing-result'); if (r) r.innerHTML = '';
    const bd = document.getElementById('timing-bet-display'); if (bd) bd.textContent = apuestaActual.timing || 10;
    const be = document.getElementById('timing-bet'); if (be) be.textContent = (apuestaActual.timing || 10) + ' 💎';
}

function iniciarTiming() {
    const ap = apuestaActual.timing || 10;
    if (userData.diamonds < ap) return alert('❌ Insuficiente');
    if (!puedeJugar('timing')) return alert('❌ Límite diario');
    userData.diamonds -= ap; registrarJugada('timing'); actualizarUI();
    const b = document.getElementById('timing-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
    const sb = document.getElementById('timing-start-btn'); if (sb) sb.classList.add('hidden');
    const tb = document.getElementById('timing-tap-btn'); if (tb) tb.classList.remove('hidden');
    timingPos = 0; timingDir = 1; tEnJuego = true;
    if (timingInterval) clearInterval(timingInterval);
    timingInterval = setInterval(() => {
        timingPos += timingVel * timingDir;
        if (timingPos >= 100) { timingPos = 100; timingDir = -1; }
        if (timingPos <= 0) { timingPos = 0; timingDir = 1; }
        const n = document.getElementById('timing-needle'); if (n) n.style.left = timingPos + '%';
    }, 16);
}

function detenerTiming() {
    if (!tEnJuego) return;
    tEnJuego = false;
    if (timingInterval) clearInterval(timingInterval); timingInterval = null;
    const tb = document.getElementById('timing-tap-btn'); if (tb) tb.classList.add('hidden');
    const ap = apuestaActual.timing || 10;
    const dentro = timingPos >= tZI && timingPos <= (tZI + tZA);
    const centro = tZI + tZA / 2;
    const dist = Math.abs(timingPos - centro);
    let mult = 0;
    if (dentro) { const pr = 1 - (dist / (tZA / 2)); mult = 2 + pr * 3; }
    else if (dist < tZA) mult = 1;
    const r = document.getElementById('timing-result');
    if (mult > 0) {
        const pre = Math.floor(ap * mult); userData.diamonds += pre;
        if (r) r.innerHTML = '<span style="color:#4ade80;font-size:20px;">🎯 ¡x' + mult.toFixed(1) + '! +' + pre + ' 💎</span>';
        spawnConfetti(); if (navigator.vibrate) navigator.vibrate(50);
        destelloResultado('modalTiming', true);
    } else {
        if (r) r.innerHTML = '<span style="color:#ef4444;">❌ -' + ap + ' 💎</span>';
        destelloResultado('modalTiming', false);
    }
    actualizarUI(); saveUserData();
    const b = document.getElementById('timing-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
    setTimeout(prepararTimingUI, 1500);
}

// ==========================================
// MATCH MENTAL
// ==========================================
let mSec = [], mIn = [], mRon = 0, mMos = false;
const mMax = 8;
const SIMBOLOS_POR_RONDA = 2;

function prepararMatchUI() {
    mSec = []; mIn = []; mRon = 0; mMos = false;
    renderMatchGrid(false);
    const r = document.getElementById('match-result'); if (r) r.innerHTML = '';
    const bd = document.getElementById('match-bet-display'); if (bd) bd.textContent = apuestaActual.matchmental || 10;
    const be = document.getElementById('match-bet'); if (be) be.textContent = (apuestaActual.matchmental || 10) + ' 💎';
}

function renderMatchGrid(act) {
    const c = document.getElementById('match-display'); if (!c) return;
    c.style.gridTemplateColumns = 'repeat(3, 1fr)';
    let h = '';
    for (let i = 0; i < 9; i++) {
        h += '<div class="sequence-card" data-idx="' + i + '" onclick="clickMatch(' + i + ')" style="cursor:' + (act ? 'pointer' : 'default') + ';">' + SIMBOLOS_MATCH[i] + '</div>';
    }
    c.innerHTML = h;
}

async function iniciarMatch() {
    const ap = apuestaActual.matchmental || 10;
    if (userData.diamonds < ap) return alert('❌ Insuficiente');
    if (!puedeJugar('matchmental')) return alert('❌ Límite diario');
    userData.diamonds -= ap; registrarJugada('matchmental'); actualizarUI();
    const b = document.getElementById('match-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
    mRon = 1;
    mSec = [];
    for (let i = 0; i < 3; i++) mSec.push(Math.floor(Math.random() * 9));
    await mostrarSecuencia();
}

async function siguienteRondaMatch() {
    for (let i = 0; i < SIMBOLOS_POR_RONDA; i++) {
        mSec.push(Math.floor(Math.random() * 9));
    }
    await mostrarSecuencia();
}

async function mostrarSecuencia() {
    mIn = []; mMos = true;
    const r = document.getElementById('match-result');
    if (r) r.innerHTML = '<span style="color:#a78bfa;">👀 Memoriza ' + mSec.length + ' símbolos...</span>';
    renderMatchGrid(false);
    const velBase = Math.max(180, 400 - (mRon * 25));
    for (let i = 0; i < mSec.length; i++) {
        await new Promise(res => setTimeout(res, Math.floor(velBase * 0.6)));
        const c = document.querySelector('#match-display [data-idx="' + mSec[i] + '"]');
        if (c) c.classList.add('highlight');
        await new Promise(res => setTimeout(res, velBase));
        if (c) c.classList.remove('highlight');
        await new Promise(res => setTimeout(res, Math.floor(velBase * 0.3)));
    }
    mMos = false;
    if (r) r.innerHTML = '<span style="color:#facc15;">✋ Tu turno — Ronda ' + mRon + '/' + mMax + ' (' + mSec.length + ' símbolos)</span>';
    renderMatchGrid(true);
}

function clickMatch(idx) {
    if (mMos || mIn.length >= mSec.length) return;
    mIn.push(idx);
    const c = document.querySelector('#match-display [data-idx="' + idx + '"]');
    if (c) { c.classList.add('highlight'); setTimeout(() => c.classList.remove('highlight'), 200); }
    const pos = mIn.length - 1;
    if (mIn[pos] !== mSec[pos]) {
        mMos = true;
        const r = document.getElementById('match-result');
        if (r) r.innerHTML = '<span style="color:#ef4444;">❌ Fallaste en la ronda ' + mRon + ' (símbolo ' + (pos + 1) + ' de ' + mSec.length + ')</span>';
        destelloResultado('modalMatch', false);
        actualizarUI(); saveUserData();
        setTimeout(prepararMatchUI, 3000); return;
    }
    if (mIn.length === mSec.length) {
        mRon++;
        if (mRon > mMax) finalizarMatch();
        else {
            mMos = true;
            const r = document.getElementById('match-result');
            if (r) r.innerHTML = '<span style="color:#4ade80;">✅ ¡Ronda superada! Preparando siguiente...</span>';
            setTimeout(siguienteRondaMatch, 1200);
        }
    }
}

function finalizarMatch() {
    const ap = apuestaActual.matchmental || 10;
    const mult = 1.5 + (mRon - 1) * 0.6;
    const pre = Math.floor(ap * Math.max(1.5, mult));
    userData.diamonds += pre;
    const r = document.getElementById('match-result');
    if (r) r.innerHTML = '<span style="color:#4ade80;font-size:20px;">🧠 ¡MAESTRO! ' + (mRon - 1) + ' rondas → +' + pre + ' 💎 (x' + mult.toFixed(1) + ')</span>';
    spawnConfetti(); if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    destelloResultado('modalMatch', true);
    actualizarUI(); saveUserData();
    const b = document.getElementById('match-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
    setTimeout(prepararMatchUI, 3000);
}

// ==========================================
// BOLSA
// ==========================================
function renderBolsa() {
    const c = document.getElementById('bolsa-acciones'); if (!c) return;
    let h = '';
    for (const a of ACCIONES_BOLSA) {
        const v = a.tendencia; const col = v >= 0 ? '#4ade80' : '#ef4444'; const fle = v >= 0 ? '▲' : '▼';
        h += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--glass-border);">';
        h += '<div><div style="font-weight:700;">' + a.icono + ' ' + a.nombre + '</div><div style="font-size:12px;color:' + col + ';">' + fle + ' ' + Math.abs(v).toFixed(1) + '% · ' + a.precio + ' 💎</div></div>';
        h += '<div style="display:flex;gap:6px;"><button onclick="comprarAccion(\'' + a.id + '\')" style="background:#4ade80;border:none;color:#000;padding:8px 14px;border-radius:12px;font-weight:700;">+</button>';
        h += '<button onclick="venderAccion(\'' + a.id + '\')" style="background:#ef4444;border:none;color:white;padding:8px 14px;border-radius:12px;font-weight:700;">−</button></div></div>';
    }
    c.innerHTML = h; renderPortfolio();
    const b = document.getElementById('bolsa-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
}

function renderPortfolio() {
    const c = document.getElementById('bolsa-portfolio-lista'); if (!c) return;
    const p = userData.bolsa_portfolio || {};
    const cl = Object.keys(p).filter(k => p[k] > 0);
    if (cl.length === 0) { c.textContent = 'Sin inversiones'; return; }
    let h = '', tot = 0;
    for (const k of cl) {
        const a = ACCIONES_BOLSA.find(x => x.id === k); if (!a) continue;
        const v = p[a.id] * a.precio; tot += v;
        h += '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + a.icono + ' ' + p[a.id] + ' × ' + a.nombre + '</span><span>' + v + ' 💎</span></div>';
    }
    h += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--glass-border);font-weight:700;color:var(--primary);">Total: ' + tot + ' 💎</div>';
    c.innerHTML = h;
}

function comprarAccion(id) {
    const a = ACCIONES_BOLSA.find(x => x.id === id); if (!a) return;
    if (userData.diamonds < a.precio) return alert('❌ Insuficiente');
    userData.diamonds -= a.precio;
    if (!userData.bolsa_portfolio) userData.bolsa_portfolio = {};
    userData.bolsa_portfolio[id] = (userData.bolsa_portfolio[id] || 0) + 1;
    registrarJugada('bolsa'); actualizarUI(); saveUserData(); renderBolsa();
}

function venderAccion(id) {
    const a = ACCIONES_BOLSA.find(x => x.id === id); if (!a) return;
    if (!userData.bolsa_portfolio || !userData.bolsa_portfolio[id]) return alert('❌ No tienes');
    userData.bolsa_portfolio[id]--; userData.diamonds += a.precio;
    registrarJugada('bolsa'); actualizarUI(); saveUserData(); renderBolsa();
}

function tickBolsa() {
    for (const a of ACCIONES_BOLSA) {
        const cp = (Math.random() - 0.48) * 8;
        a.precio = Math.max(10, Math.floor(a.precio * (1 + cp / 100)));
        a.tendencia = cp;
    }
    const m = document.getElementById('modalBolsa');
    if (m && m.style.display === 'block') renderBolsa();
}

// ==========================================
// SUBASTA
// ==========================================
let subastaItems = [
    { id:'s1', nombre:'Licencia x2 (1h)', icono:'📜', precioActual:500, puja:null, termina: Date.now() + 300000 },
    { id:'s2', nombre:'Acelerador (30min)', icono:'⚡', precioActual:300, puja:null, termina: Date.now() + 600000 },
    { id:'s3', nombre:'Avatar "Diamante"', icono:'💠', precioActual:800, puja:null, termina: Date.now() + 900000 }
];

function renderSubasta() {
    const c = document.getElementById('subasta-lista'); if (!c) return;
    let h = ''; const ah = Date.now();
    for (const it of subastaItems) {
        const r = Math.max(0, Math.floor((it.termina - ah) / 1000));
        const m = Math.floor(r / 60), s = r % 60;
        const act = r > 0;
        h += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;border:1px solid var(--glass-border);">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700;">' + it.icono + ' ' + it.nombre + '</div>';
        h += '<div style="font-size:12px;color:var(--text-secondary);">' + it.precioActual + ' 💎 · ' + m + ':' + String(s).padStart(2, '0') + '</div>';
        if (it.puja) h += '<div style="font-size:11px;color:#4ade80;">Líder: ' + it.puja + '</div>';
        h += '</div>';
        if (act) h += '<button onclick="pujarSubasta(\'' + it.id + '\')" style="background:#facc15;color:#000;border:none;padding:10px 16px;border-radius:12px;font-weight:700;">PUJAR</button>';
        else h += '<span style="color:#ef4444;">CERRADA</span>';
        h += '</div></div>';
    }
    c.innerHTML = h;
    const b = document.getElementById('subasta-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
}

function pujarSubasta(id) {
    const it = subastaItems.find(x => x.id === id); if (!it) return;
    if (Date.now() > it.termina) return alert('❌ Cerrada');
    const inc = Math.max(10, Math.floor(it.precioActual * 0.1));
    const np = it.precioActual + inc;
    if (userData.diamonds < np) return alert('❌ Necesitas ' + np);
    if (!confirm('¿Pujar ' + np + ' 💎?')) return;
    userData.diamonds -= np; it.precioActual = np; it.puja = userData.first_name || userData.username;
    registrarJugada('subasta'); actualizarUI(); saveUserData(); renderSubasta();
    alert('✅ Líder!');
}

// ==========================================
// EXPEDICIONES
// ==========================================
function renderExpedicion() {
    const c = document.getElementById('exp-zonas'); if (!c) return;
    let h = '';
    for (const z of ZONAS_EXPEDICION) {
        h += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;border:1px solid var(--glass-border);">';
        h += '<div style="font-weight:700;margin-bottom:6px;">' + z.icono + ' ' + z.nombre + '</div>';
        h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">' + z.costo + ' 💎 · ' + z.duracion + 's · Riesgo ' + Math.floor(z.riesgo * 100) + '% · Retorno ' + z.recompensaBase + ' 💎</div>';
        h += '<button onclick="lanzarExpedicion(\'' + z.id + '\')" style="background:#f97316;border:none;color:white;padding:10px 20px;border-radius:12px;font-weight:700;width:100%;">LANZAR</button></div>';
    }
    c.innerHTML = h; renderExpedicionesActivas();
    const b = document.getElementById('exp-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
}

function renderExpedicionesActivas() {
    const c = document.getElementById('exp-activas-lista'); if (!c) return;
    const a = userData.expediciones_activas || {};
    const keys = Object.keys(a).filter(k => a[k]);
    if (keys.length === 0) { c.textContent = 'Ninguna'; return; }
    const ah = Date.now(); let h = '';
    for (const k of keys) {
        const e = a[k];
        const t = (ah - e.inicio) / 1000;
        const p = Math.min(100, Math.floor((t / e.duracion) * 100));
        const listo = t >= e.duracion;
        h += '<div style="padding:8px 0;border-bottom:1px solid var(--glass-border);"><div style="display:flex;justify-content:space-between;"><span>' + e.icono + ' ' + e.nombre + '</span><span>' + (listo ? '✅' : p + '%') + '</span></div>';
        if (!listo) h += '<div class="time-bar" style="margin-top:6px;"><div class="time-fill" style="width:' + p + '%;"></div></div>';
        else h += '<button onclick="reclamarExpedicion(\'' + k + '\')" style="background:#4ade80;color:#000;border:none;padding:8px 14px;border-radius:10px;font-weight:700;margin-top:6px;">RECLAMAR</button>';
        h += '</div>';
    }
    c.innerHTML = h;
}

function lanzarExpedicion(id) {
    const z = ZONAS_EXPEDICION.find(x => x.id === id); if (!z) return;
    if (userData.diamonds < z.costo) return alert('❌ Necesitas ' + z.costo);
    if (!puedeJugar('expedicion')) return alert('❌ Límite diario');
    userData.diamonds -= z.costo; registrarJugada('expedicion');
    if (!userData.expediciones_activas) userData.expediciones_activas = {};
    const uid = 'e_' + Date.now() + '_' + Math.floor(Math.random() * 999);
    userData.expediciones_activas[uid] = { id: z.id, nombre: z.nombre, icono: z.icono, inicio: Date.now(), duracion: z.duracion, recompensa: z.recompensaBase, riesgo: z.riesgo };
    actualizarUI(); saveUserData(); renderExpedicion();
}

function reclamarExpedicion(uid) {
    const e = (userData.expediciones_activas || {})[uid]; if (!e) return;
    let r = e.recompensa; let nota = '';
    const roll = Math.random();
    if (roll < e.riesgo) { const p = Math.floor(r * (0.2 + Math.random() * 0.3)); r -= p; nota = ' (-' + p + ' desgaste)'; }
    else if (roll > 0.9) { const b = Math.floor(r * 0.2); r += b; nota = ' (+' + b + ' bonus)'; }
    userData.diamonds += r; delete userData.expediciones_activas[uid];
    actualizarUI(); saveUserData(); renderExpedicion();
    alert('⛏️ +' + r + ' 💎' + nota);
}

// ==========================================
// CRAFTING
// ==========================================
function renderCrafting() {
    const c = document.getElementById('craft-lista'); if (!c) return;
    if (!userData.craft_niveles) userData.craft_niveles = {};
    let h = '';
    for (const r of RECETAS_CRAFT) {
        const n = userData.craft_niveles[r.id] || 0;
        const co = Math.floor(r.costoBase * Math.pow(ECONOMIA.CRECIMIENTO_CRAFT, n));
        const pu = userData.diamonds >= co;
        h += '<div style="background:var(--bg-elevated);border-radius:16px;padding:14px;margin-bottom:10px;border:1px solid var(--glass-border);">';
        h += '<div style="font-weight:700;">' + r.icono + ' ' + r.nombre + ' (Nvl ' + n + ')</div>';
        h += '<div style="font-size:12px;color:var(--text-secondary);margin:6px 0;">Próximo: Nvl ' + (n + 1) + ' · ' + co + ' 💎</div>';
        h += '<button onclick="craftear(\'' + r.id + '\')" style="background:' + (pu ? '#f472b6' : '#334155') + ';color:' + (pu ? '#000' : '#fff') + ';border:none;padding:10px 20px;border-radius:12px;font-weight:700;width:100%;" ' + (pu ? '' : 'disabled') + '>CRAFTEAR</button></div>';
    }
    c.innerHTML = h;
    const b = document.getElementById('craft-balance'); if (b) b.textContent = Math.floor(userData.diamonds);
}

function craftear(id) {
    const r = RECETAS_CRAFT.find(x => x.id === id); if (!r) return;
    if (!userData.craft_niveles) userData.craft_niveles = {};
    const n = userData.craft_niveles[r.id] || 0;
    const co = Math.floor(r.costoBase * Math.pow(ECONOMIA.CRECIMIENTO_CRAFT, n));
    if (userData.diamonds < co) return alert('❌ Insuficiente');
    userData.diamonds -= co; userData.craft_niveles[r.id] = n + 1;
    registrarJugada('crafting'); actualizarUI(); saveUserData(); renderCrafting();
    alert('✨ ' + r.nombre + ' Nvl ' + (n + 1));
}

setInterval(() => {
    tickBolsa();
    const me = document.getElementById('modalExpedicion');
    if (me && me.style.display === 'block') renderExpedicionesActivas();
    const ms = document.getElementById('modalSubasta');
    if (ms && ms.style.display === 'block') renderSubasta();
}, 30000);

setInterval(() => {
    const me = document.getElementById('modalExpedicion');
    if (me && me.style.display === 'block') renderExpedicionesActivas();
}, 1000);

// ==========================================
// EDIFICIOS
// ==========================================
function openBuilding(b) {
    closeAll();
    const cap = b.charAt(0).toUpperCase() + b.slice(1);
    showModal('modal' + cap);
    actualizarPanelMejora(b);
}

function actualizarPanelMejora(b) {
    const n = userData['lvl_' + b] || 0;
    const p = n * ECONOMIA.PRODUCCION[b];
    const precio = Math.floor(ECONOMIA.PRECIO_BASE[b] * Math.pow(ECONOMIA.CRECIMIENTO_MEJORA, n));
    const ne = document.getElementById(b + '-level'); if (ne) ne.textContent = n;
    const pe = document.getElementById(b + '-prod'); if (pe) pe.textContent = p + ' 💎/h';
    const pre = document.getElementById(b + '-price'); if (pre) pre.textContent = precio.toLocaleString() + ' 💎';
    const btn = document.getElementById(b + '-btn');
    if (btn) {
        if (userData.diamonds < precio) { btn.disabled = true; btn.textContent = '💎 INSUFICIENTE'; }
        else { btn.disabled = false; btn.textContent = 'MEJORAR (' + precio.toLocaleString() + ' 💎)'; }
    }
}

function buyUpgrade(b) {
    const n = userData['lvl_' + b] || 0;
    const precio = Math.floor(ECONOMIA.PRECIO_BASE[b] * Math.pow(ECONOMIA.CRECIMIENTO_MEJORA, n));
    if (userData.diamonds < precio) return alert('❌ Insuficiente');
    userData['lvl_' + b] = (userData['lvl_' + b] || 0) + 1;
    userData.diamonds -= precio; saveUserData(); actualizarUI(); actualizarPanelMejora(b);
    const nom = { escuela:'Escuela', fabrica:'Fábrica', piscina:'Piscina', hospital:'Hospital' };
    const ico = { escuela:'🏫', fabrica:'🏭', piscina:'🏊', hospital:'🏥' };
    registrarEvento(ico[b], nom[b] + ' Nvl ' + userData['lvl_' + b], 'Produce ' + (userData['lvl_' + b] * ECONOMIA.PRODUCCION[b]) + ' 💎/h');
    alert('✅ ' + nom[b] + ' Nvl ' + userData['lvl_' + b]);
}

// ==========================================
// RANKING Y POOL
// ==========================================
async function updateRankingAndPool() {
    try {
        const r = await _supabase.from('game_data')
            .select('telegram_id, first_name, username, city_name, diamonds, lvl_piscina, lvl_fabrica, lvl_escuela, lvl_hospital, premium_expires, genero')
            .neq('telegram_id', 'MASTER');
        if (!r.error && r.data) {
            const ah = new Date();
            globalPoolData.user_rankings = r.data.map(u => {
                let p = (u.lvl_escuela || 0) * ECONOMIA.PRODUCCION.escuela +
                        (u.lvl_fabrica || 0) * ECONOMIA.PRODUCCION.fabrica +
                        (u.lvl_piscina || 0) * ECONOMIA.PRODUCCION.piscina +
                        (u.lvl_hospital || 0) * ECONOMIA.PRODUCCION.hospital;
                if (u.premium_expires && new Date(u.premium_expires) > ah) p *= ECONOMIA.PREMIUM_MULTIPLICADOR;
                return {
                    id: u.telegram_id,
                    first_name: u.first_name || '',
                    username: u.username || 'Alcalde',
                    genero: u.genero || 'M',
                    city_name: u.city_name || 'Ciudad sin nombre',
                    diamonds: Number(u.diamonds) || 0,
                    produccion: p
                };
            }).sort((a, b) => b.produccion - a.produccion);
        }
        const pos = globalPoolData.user_rankings.findIndex(u => u.id === userData.id);
        if (pos !== -1) {
            if (pos < 3) userData.rank = 'Diamante';
            else if (pos < 10) userData.rank = 'Oro';
            else if (pos < 50) userData.rank = 'Plata';
            else userData.rank = 'Ciudadano';
            userData.weekly_rank = pos + 1;
        }
        const PS = ECONOMIA.POOL_RANKING_SEMANAL;
        if (pos < 3) userData.projectedReward = (PS * 0.4) / 3;
        else if (pos < 10) userData.projectedReward = (PS * 0.25) / 7;
        else if (pos < 50) userData.projectedReward = (PS * 0.20) / 40;
        else {
            const ci = globalPoolData.user_rankings.slice(50);
            let t = 0; for (const c of ci) t += c.produccion;
            userData.projectedReward = (t > 0 && getTotalProduction() > 0) ? (PS * 0.15) * (getTotalProduction() / t) : 0;
        }
    } catch (e) { console.error('Error ranking:', e); }
}

// ==========================================
// GUARDADO
// ==========================================
async function saveUserData() {
    if (!userData.id) return;
    try {
        const d = {
            first_name: userData.first_name,
            username: userData.username,
            diamonds: Math.floor(userData.diamonds),
            lvl_piscina: userData.lvl_piscina, lvl_fabrica: userData.lvl_fabrica,
            lvl_escuela: userData.lvl_escuela, lvl_hospital: userData.lvl_hospital,
            last_online: new Date().toISOString(),
            premium_expires: userData.premium_expires,
            daily_streak: userData.daily_streak,
            last_daily_claim: userData.last_daily_claim,
            gamestats: userData.gameStats || {},
            referral_earnings: userData.referral_earnings || 0,
            referred_users: userData.referred_users || [],
            haInvertido: !!userData.haInvertido,
            last_ad_watch: userData.last_ad_watch,
            last_casino_rescue: userData.last_casino_rescue,
            last_production_update: userData.last_production_update || new Date().toISOString(),
            city_name: userData.city_name || null,
            news_feed: userData.newsFeed || [],
            genero: userData.genero || 'M',
            idioma: userData.idioma || 'es',
            theme: userData.theme || 'dark',
            bolsa_portfolio: userData.bolsa_portfolio || {},
            expediciones_activas: userData.expediciones_activas || {},
            craft_niveles: userData.craft_niveles || {}
        };
        const r = await _supabase.from('game_data').update(d).eq('telegram_id', userData.id);
        if (r.error) console.error('Guardado:', r.error);
    } catch (e) { console.error(e); }
}

async function loadUserFromDB(tgId) {
    try {
        const r = await _supabase.from('game_data').select('*').eq('telegram_id', tgId.toString()).maybeSingle();
        if (r.error) { console.error(r.error); return; }
        if (!r.data) {
            const nu = {
                telegram_id: tgId.toString(),
                first_name: userData.first_name,
                username: userData.username,
                diamonds: 0, lvl_piscina: 0, lvl_fabrica: 0, lvl_escuela: 0, lvl_hospital: 0,
                referral_code: 'REF' + tgId.toString().slice(-6),
                last_online: new Date().toISOString(),
                last_production_update: new Date().toISOString(),
                gamestats: {}
            };
            await _supabase.from('game_data').insert([nu]);
            userData = Object.assign({}, userData, nu, { id: tgId.toString() });
        } else {
            const d = r.data;
            userData = Object.assign({}, userData, d, {
                id: tgId.toString(),
                first_name: d.first_name || userData.first_name,
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
                referral_code: d.referral_code || 'REF' + tgId.toString().slice(-6),
                last_ad_watch: d.last_ad_watch || null,
                last_casino_rescue: d.last_casino_rescue || null,
                last_production_update: d.last_production_update || null,
                city_name: d.city_name || null,
                newsFeed: d.news_feed || [],
                genero: d.genero || 'M',
                idioma: d.idioma || 'es',
                theme: d.theme || 'dark',
                bolsa_portfolio: d.bolsa_portfolio || {},
                expediciones_activas: d.expediciones_activas || {},
                craft_niveles: d.craft_niveles || {}
            });
            aplicarProduccionOffline();
        }
    } catch (e) { console.error(e); }
}

// ==========================================
// PRODUCCIÓN
// ==========================================
function startProduction() {
    setInterval(() => {
        if (!userData.id) return;
        userData.diamonds += getTotalProduction() / 3600;
        userData.last_production_update = new Date().toISOString();
        const d = document.getElementById('diamonds');
        if (d) d.textContent = Math.floor(userData.diamonds);
    }, 1000);
}

function aplicarProduccionOffline() {
    if (!userData.last_production_update) { userData.last_production_update = new Date().toISOString(); return; }
    let s = (new Date() - new Date(userData.last_production_update)) / 1000;
    if (s <= 0) return;
    const T = ECONOMIA.MAX_OFFLINE_HORAS * 3600;
    if (s > T) s = T;
    const p = (getTotalProduction() / 3600) * s;
    if (p > 0) userData.diamonds += p;
    userData.last_production_update = new Date().toISOString();
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function initApp() {
    console.log('🔄 Iniciando DIAMOND CITY v3.3...');
    tg.expand(); tg.ready();
    let usuario = null;
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) usuario = tg.initDataUnsafe.user;
    if (usuario) {
        userData.id = usuario.id.toString();
        userData.first_name = usuario.first_name || 'Usuario';
        userData.username = usuario.username || usuario.first_name || 'Usuario';
        await loadUserFromDB(usuario.id);
        userData.first_name = usuario.first_name || 'Usuario';
        userData.username = usuario.username || usuario.first_name || 'Usuario';
    } else {
        userData.id = 'test_' + Date.now();
        userData.first_name = 'Test';
        userData.username = 'test';
        userData.referral_code = 'REF' + userData.id.slice(-6);
    }
    aplicarTema();
    await initTONConnect();
    setTimeout(initAds, 3000);
    await updateRankingAndPool();
    startProduction();
    setInterval(saveUserData, 10000);
    setInterval(updateRankingAndPool, 60000);
    window.addEventListener('beforeunload', saveUserData);
    mostrarOnboardingSiHaceFalta();
    renderizarFeedNoticias();
    aplicarIdioma();
    actualizarUI();
    actualizarPremiumUI();
    const li = document.getElementById('idioma-actual-label');
    if (li) li.textContent = NOMBRES_IDIOMA[userData.idioma] || 'Español';
    console.log('✅ DIAMOND CITY v3.3 listo');
}

window.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// EXPORTACIONES
// ==========================================
window.openPerfil = openPerfil;
window.openFriends = openFriends;
window.openCity = openCity;
window.openRanking = openRanking;
window.openWithdraw = openWithdraw;
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
window.showRichAds = showRichAds;
window.reintentarRichAds = reintentarRichAds;
window.rescueWithAd = rescueWithAd;
window.comprarPremiumGram = comprarPremiumGram;
window.comprarPremiumStars = comprarPremiumStars;
window.comprarConGram = comprarConGram;
window.comprarConStars = comprarConStars;
window.buyUpgrade = buyUpgrade;
window.closeAll = closeAll;
window.copyReferralCode = copyReferralCode;
window.disconnectWallet = disconnectWallet;
window.confirmarNombreCiudad = confirmarNombreCiudad;
window.abrirAsistente = abrirAsistente;
window.valeriaAccion = valeriaAccion;
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
window.cambiarMetodoPago = cambiarMetodoPago;
window.cambiarMetodoPagoPremium = cambiarMetodoPagoPremium;
window.toggleTheme = toggleTheme;

console.log('📦 Módulos exportados');
