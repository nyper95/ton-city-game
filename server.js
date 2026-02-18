// ======================================================
// TON CITY GAME - SERVER.JS COMPLETO (CON WALLET Y POOL)
// ======================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { TonClient, WalletContractV4 } = require("ton");
const { mnemonicToPrivateKey } = require("ton-crypto");
const { getHttpEndpoint } = require("@orbs-network/ton-access");
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN SUPABASE
// ==========================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ==========================================
// CONFIGURACIÓN DE LA WALLET DE LA POOL
// ==========================================
let poolWallet = null;
let poolKey = null;
let poolAddress = null;
let tonClient = null;

async function initPoolWallet() {
    try {
        console.log("🔐 Inicializando wallet de la Pool...");
        
        const mnemonic = process.env.POOL_MNEMONIC;
        if (!mnemonic) {
            throw new Error("❌ POOL_MNEMONIC no está definida en variables de entorno");
        }
        
        const mnemonicArray = mnemonic.split(" ");
        if (mnemonicArray.length !== 24) {
            throw new Error("❌ La frase debe tener 24 palabras");
        }
        
        console.log("✅ Frase semilla cargada correctamente");
        
        poolKey = await mnemonicToPrivateKey(mnemonicArray);
        
        poolWallet = WalletContractV4.create({
            publicKey: poolKey.publicKey,
            workchain: 0
        });
        
        poolAddress = poolWallet.address.toString();
        
        const endpoint = await getHttpEndpoint({ network: "mainnet" });
        tonClient = new TonClient({ endpoint });
        
        const balance = await tonClient.getBalance(poolWallet.address);
        console.log(`✅ Wallet de Pool inicializada:`);
        console.log(`   Dirección: ${poolAddress}`);
        console.log(`   Balance: ${(balance / 1e9).toFixed(4)} TON`);
        
        return true;
        
    } catch (error) {
        console.error("❌ Error inicializando wallet:", error);
        return false;
    }
}

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// ==========================================
// ENDPOINT PRINCIPAL (RAÍZ)
// ==========================================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Ton City Game API',
        version: '3.0.2',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            pool_info: '/pool-info',
            daily_status: '/daily-status?userId=ID',
            claim_daily: '/claim-daily (POST)',
            reward: '/reward?userId=ID&amount=30',
            can_watch_ad: '/can-watch-ad?userId=ID',
            withdraw_status: '/withdraw-status?userId=ID',
            process_withdraw: '/process-withdraw (POST)',
            update_pool: '/update-pool (POST)'
        }
    });
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// ENDPOINT PARA INFO DE LA POOL
// ==========================================
app.get('/pool-info', async (req, res) => {
    try {
        if (!tonClient || !poolWallet) {
            return res.status(503).json({ 
                success: false,
                error: 'Wallet de Pool no inicializada',
                details: 'Revisa que POOL_MNEMONIC esté en variables de entorno'
            });
        }
        
        const balance = await tonClient.getBalance(poolWallet.address);
        const seqno = await poolWallet.getSeqno();
        
        res.json({
            success: true,
            address: poolAddress,
            balance: (balance / 1e9).toFixed(4),
            balance_nano: balance.toString(),
            seqno: seqno,
            network: 'mainnet',
            wallet_initialized: true
        });
        
    } catch (error) {
        console.error("❌ Error en /pool-info:", error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack 
        });
    }
});

// ==========================================
// ENDPOINT PARA RECOMPENSA DIARIA
// ==========================================
app.get('/daily-status', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId requerido' 
            });
        }

        const { data: usuario, error } = await supabase
            .from('game_data')
            .select('daily_streak, last_daily_claim')
            .eq('telegram_id', userId.toString())
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        let puedeReclamar = true;
        if (usuario?.last_daily_claim) {
            const ultimo = new Date(usuario.last_daily_claim);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
            puedeReclamar = hoy > ultimoDia;
        }

        res.json({
            success: true,
            user_id: userId,
            current_streak: usuario?.daily_streak || 0,
            can_claim: puedeReclamar,
            last_claim: usuario?.last_daily_claim || null
        });

    } catch (error) {
        console.error("❌ Error en /daily-status:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/claim-daily', express.json(), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId requerido' 
            });
        }

        const { data: usuario, error: selectError } = await supabase
            .from('game_data')
            .select('diamonds, daily_streak, last_daily_claim')
            .eq('telegram_id', userId.toString())
            .single();

        if (selectError && selectError.code !== 'PGRST116') throw selectError;

        // Verificar si ya reclamó hoy
        if (usuario?.last_daily_claim) {
            const ultimo = new Date(usuario.last_daily_claim);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
            
            if (hoy <= ultimoDia) {
                return res.status(400).json({
                    success: false,
                    error: 'Ya reclamaste hoy'
                });
            }
        }

        // Calcular recompensa (día 1 = 10, día 30 = 300)
        const streak = usuario?.daily_streak || 0;
        const nuevoStreak = streak >= 30 ? 30 : streak + 1;
        const recompensa = Math.min(10 + (nuevoStreak - 1) * 10, 300);

        const nuevosDiamantes = (usuario?.diamonds || 0) + recompensa;

        const { error: updateError } = await supabase
            .from('game_data')
            .update({
                diamonds: nuevosDiamantes,
                daily_streak: nuevoStreak,
                last_daily_claim: new Date().toISOString(),
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: `+${recompensa} diamantes`,
            reward: recompensa,
            new_streak: nuevoStreak,
            new_diamonds: nuevosDiamantes
        });

    } catch (error) {
        console.error("❌ Error en /claim-daily:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT PARA ADSGRAM (RECOMPENSA DE ANUNCIOS)
// ==========================================
app.get('/reward', async (req, res) => {
    try {
        const userId = req.query.userId || req.query.userid;
        const amount = parseInt(req.query.amount) || 30;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId requerido' 
            });
        }

        const { data: usuario, error: selectError } = await supabase
            .from('game_data')
            .select('diamonds')
            .eq('telegram_id', userId.toString())
            .single();

        if (selectError && selectError.code === 'PGRST116') {
            // Usuario no existe, crearlo
            const nuevoUsuario = {
                telegram_id: userId.toString(),
                username: `user_${userId.toString().slice(-6)}`,
                diamonds: amount,
                lvl_tienda: 0,
                lvl_casino: 0,
                lvl_piscina: 0,
                lvl_parque: 0,
                lvl_diversion: 0,
                lvl_escuela: 0,
                lvl_hospital: 0,
                referral_code: `REF${userId.toString().slice(-6)}`,
                last_ad_watch: new Date().toISOString(),
                last_seen: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('game_data')
                .insert([nuevoUsuario]);

            if (insertError) throw insertError;

            return res.json({
                success: true,
                message: `Usuario creado con +${amount} diamantes`,
                diamonds: amount,
                user_id: userId,
                new_user: true
            });
        }

        if (selectError) throw selectError;

        const nuevosDiamantes = (usuario?.diamonds || 0) + amount;

        const { error: updateError } = await supabase
            .from('game_data')
            .update({
                diamonds: nuevosDiamantes,
                last_ad_watch: new Date().toISOString(),
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: `+${amount} diamantes añadidos`,
            diamonds: nuevosDiamantes,
            added: amount,
            user_id: userId
        });

    } catch (error) {
        console.error("❌ Error en /reward:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT PARA VERIFICAR ANUNCIOS
// ==========================================
app.get('/can-watch-ad', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId requerido' 
            });
        }

        const { data: usuario, error } = await supabase
            .from('game_data')
            .select('last_ad_watch')
            .eq('telegram_id', userId.toString())
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        let puedeVer = true;
        let minutosRestantes = 0;

        if (usuario?.last_ad_watch) {
            const ultimo = new Date(usuario.last_ad_watch);
            const ahora = new Date();
            const horasPasadas = (ahora - ultimo) / (1000 * 60 * 60);
            
            puedeVer = horasPasadas >= 2;
            
            if (!puedeVer) {
                minutosRestantes = Math.ceil((2 - horasPasadas) * 60);
            }
        }

        res.json({
            success: true,
            can_watch: puedeVer,
            minutes_remaining: minutosRestantes,
            user_id: userId
        });

    } catch (error) {
        console.error("❌ Error en /can-watch-ad:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT PARA ESTADO DE RETIRO
// ==========================================
app.get('/withdraw-status', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId requerido' 
            });
        }

        const { data: usuario, error } = await supabase
            .from('game_data')
            .select('last_withdraw_week, diamonds')
            .eq('telegram_id', userId.toString())
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        // Calcular semana actual
        const ahora = new Date();
        const inicio = new Date(ahora.getFullYear(), 0, 1);
        const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
        const semanaActual = Math.ceil(dias / 7);

        const yaRetiro = usuario?.last_withdraw_week === semanaActual;

        res.json({
            success: true,
            user_id: userId,
            current_week: semanaActual,
            last_withdraw_week: usuario?.last_withdraw_week || null,
            has_withdrawn_this_week: yaRetiro,
            current_diamonds: usuario?.diamonds || 0
        });

    } catch (error) {
        console.error("❌ Error en /withdraw-status:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT PARA PROCESAR RETIRO
// ==========================================
app.post('/process-withdraw', express.json(), async (req, res) => {
    try {
        const { userId, diamonds, tonAmount } = req.body;
        
        if (!userId || !diamonds || !tonAmount) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId, diamonds y tonAmount requeridos' 
            });
        }

        // Verificar que sea domingo
        const dia = new Date().getDay();
        if (dia !== 0) {
            return res.status(400).json({
                success: false,
                error: 'Solo disponible los domingos'
            });
        }

        const { data: usuario, error: selectError } = await supabase
            .from('game_data')
            .select('last_withdraw_week, diamonds')
            .eq('telegram_id', userId.toString())
            .single();

        if (selectError) throw selectError;

        const ahora = new Date();
        const inicio = new Date(ahora.getFullYear(), 0, 1);
        const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
        const semanaActual = Math.ceil(dias / 7);

        if (usuario?.last_withdraw_week === semanaActual) {
            return res.status(400).json({ 
                success: false, 
                error: 'Ya retiraste esta semana' 
            });
        }

        const nuevosDiamantes = (usuario?.diamonds || 0) - diamonds;
        
        const { error: updateError } = await supabase
            .from('game_data')
            .update({
                diamonds: nuevosDiamantes,
                last_withdraw_week: semanaActual,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        if (updateError) throw updateError;

        // Actualizar pool en MASTER (simulado por ahora)
        try {
            const { data: master, error: masterError } = await supabase
                .from('game_data')
                .select('pool_ton')
                .eq('telegram_id', 'MASTER')
                .single();

            if (!masterError && master) {
                const nuevoPool = (master.pool_ton || 100) - tonAmount;
                
                await supabase
                    .from('game_data')
                    .update({
                        pool_ton: nuevoPool,
                        last_seen: new Date().toISOString()
                    })
                    .eq('telegram_id', 'MASTER');
            }
        } catch (poolError) {
            console.error("Error actualizando pool:", poolError);
        }

        res.json({
            success: true,
            message: 'Retiro procesado correctamente',
            new_diamonds: nuevosDiamantes,
            week: semanaActual
        });

    } catch (error) {
        console.error("❌ Error en /process-withdraw:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT PARA ACTUALIZAR POOL (COMPRAS)
// ==========================================
app.post('/update-pool', express.json(), async (req, res) => {
    try {
        const { tonAmount, diamonds } = req.body;
        
        const { data: master, error: selectError } = await supabase
            .from('game_data')
            .select('pool_ton, total_diamonds')
            .eq('telegram_id', 'MASTER')
            .single();

        if (selectError) throw selectError;

        const nuevoPool = (master?.pool_ton || 100) + (tonAmount * 0.8);
        const nuevosDiamantesTotales = (master?.total_diamonds || 100000) + diamonds;

        const { error: updateError } = await supabase
            .from('game_data')
            .update({
                pool_ton: nuevoPool,
                total_diamonds: nuevosDiamantesTotales,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', 'MASTER');

        if (updateError) throw updateError;

        res.json({
            success: true,
            new_pool: nuevoPool,
            new_total_diamonds: nuevosDiamantesTotales
        });

    } catch (error) {
        console.error("❌ Error en /update-pool:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 TON CITY GAME API - SERVIDOR INICIADO');
    console.log('='.repeat(60));
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 URL: https://drab-janean-juegaygana-31185170.koyeb.app`);
    console.log('='.repeat(60));
    
    const walletOk = await initPoolWallet();
    if (!walletOk) {
        console.warn('\n⚠️  ADVERTENCIA: Wallet de Pool no disponible');
        console.warn('   Los retiros automáticos NO funcionarán');
        console.warn('   Revisa que POOL_MNEMONIC esté en variables de entorno\n');
    } else {
        console.log('\n✅ Sistema listo para procesar retiros\n');
    }
    
    console.log('📌 ENDPOINTS DISPONIBLES:');
    console.log('   ✅ GET  /');
    console.log('   ✅ GET  /health');
    console.log('   ✅ GET  /pool-info');
    console.log('   ✅ GET  /daily-status?userId=ID');
    console.log('   ✅ POST /claim-daily');
    console.log('   ✅ GET  /reward?userId=ID&amount=30');
    console.log('   ✅ GET  /can-watch-ad?userId=ID');
    console.log('   ✅ GET  /withdraw-status?userId=ID');
    console.log('   ✅ POST /process-withdraw');
    console.log('   ✅ POST /update-pool');
    console.log('='.repeat(60) + '\n');
});

// ==========================================
// MANEJO DE ERRORES NO CAPTURADOS
// ==========================================
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
