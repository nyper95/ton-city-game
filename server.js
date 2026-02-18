// ======================================================
// TON CITY GAME - SERVER.JS PARA KOYEB
// ======================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN SUPABASE
// ==========================================
const SUPABASE_URL = 'https://xkkifqxxglcuyruwkbih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Ton City Game API',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            reward: '/reward?userId=[USER_ID]&amount=[AMOUNT]',
            daily: '/daily-status?userId=[USER_ID]',
            claim: '/claim-daily',
            health: '/health',
            stats: '/stats'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// ESTADÍSTICAS GLOBALES
// ==========================================
app.get('/stats', async (req, res) => {
    try {
        const { data: users, error: usersError } = await supabase
            .from('game_data')
            .select('telegram_id, diamonds, daily_streak')
            .neq('telegram_id', 'MASTER');

        if (usersError) throw usersError;

        const { data: master, error: masterError } = await supabase
            .from('game_data')
            .select('pool_ton, total_diamonds')
            .eq('telegram_id', 'MASTER')
            .single();

        if (masterError) throw masterError;

        const totalUsers = users?.length || 0;
        const totalDiamonds = users?.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0) || 0;
        const avgStreak = users?.reduce((sum, user) => sum + (Number(user.daily_streak) || 0), 0) / totalUsers || 0;

        res.json({
            success: true,
            data: {
                total_users: totalUsers,
                total_diamonds: totalDiamonds,
                pool_ton: master?.pool_ton || 100,
                registered_pool_ton: master?.total_diamonds || 100000,
                average_daily_streak: Math.round(avgStreak * 10) / 10,
                last_update: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en /stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
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

        if (error) throw error;

        let puedeReclamar = true;
        let proximaRecompensa = null;
        
        if (usuario?.last_daily_claim) {
            const ultimo = new Date(usuario.last_daily_claim);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
            
            puedeReclamar = hoy > ultimoDia;
            
            if (!puedeReclamar) {
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1);
                proximaRecompensa = manana.toISOString();
            }
        }

        let rachaActiva = true;
        if (usuario?.last_daily_claim && usuario?.daily_streak > 0) {
            const ultimo = new Date(usuario.last_daily_claim);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
            
            const diffTime = hoy - ultimoDia;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            rachaActiva = diffDays <= 1;
        }

        const streak = usuario?.daily_streak || 0;
        const diaActual = streak + 1;
        let recompensaHoy = 0;
        
        if (diaActual <= 30) {
            recompensaHoy = Math.min(10 + (diaActual - 1) * 10, 300);
        } else {
            recompensaHoy = 300;
        }

        res.json({
            success: true,
            user_id: userId,
            current_streak: streak,
            can_claim: puedeReclamar,
            streak_active: rachaActiva,
            next_day: diaActual > 30 ? 30 : diaActual,
            reward_today: recompensaHoy,
            next_reward_time: proximaRecompensa
        });

    } catch (error) {
        console.error('❌ Error en /daily-status:', error);
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
            .select('*')
            .eq('telegram_id', userId.toString())
            .single();

        if (selectError) throw selectError;

        let puedeReclamar = true;
        let rachaActiva = true;
        
        if (usuario?.last_daily_claim) {
            const ultimo = new Date(usuario.last_daily_claim);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const ultimoDia = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
            
            puedeReclamar = hoy > ultimoDia;
            
            const diffTime = hoy - ultimoDia;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            rachaActiva = diffDays <= 1;
        }

        if (!puedeReclamar) {
            return res.status(400).json({
                success: false,
                error: 'Ya reclamaste hoy'
            });
        }

        let nuevoStreak = 1;
        if (rachaActiva && usuario?.daily_streak) {
            nuevoStreak = usuario.daily_streak + 1;
            if (nuevoStreak > 30) nuevoStreak = 30;
        }

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

        await updateMasterTotalDiamonds();

        res.json({
            success: true,
            message: `+${recompensa} diamantes`,
            new_streak: nuevoStreak,
            reward: recompensa,
            new_diamonds: nuevosDiamantes
        });

    } catch (error) {
        console.error('❌ Error en /claim-daily:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ENDPOINT PRINCIPAL PARA ADSGRAM
// ==========================================
app.get('/reward', async (req, res) => {
    const startTime = Date.now();
    
    try {
        let userId = req.query.userId || req.query.userid || req.query.uid;
        let amount = parseInt(req.query.amount) || 30;
        
        console.log(`🎁 [REWARD] Solicitado - User: ${userId}, Amount: ${amount}`);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }

        if (isNaN(amount) || amount <= 0) {
            amount = 30;
        }

        const { data: usuario, error: selectError } = await supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userId.toString())
            .single();

        if (!usuario) {
            console.log(`🆕 [REWARD] Usuario no existe, creando nuevo: ${userId}`);
            
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
                last_seen: new Date().toISOString(),
                last_online: new Date().toISOString(),
                created_at: new Date().toISOString(),
                daily_streak: 0,
                last_daily_claim: null
            };

            const { error: insertError } = await supabase
                .from('game_data')
                .insert([nuevoUsuario]);

            if (insertError) throw insertError;

            await updateMasterTotalDiamonds();

            return res.json({
                success: true,
                message: `Usuario creado con +${amount} diamantes`,
                diamonds: amount,
                user_id: userId,
                new_user: true
            });
        }

        const diamantesActuales = Number(usuario.diamonds) || 0;
        const nuevosDiamantes = diamantesActuales + amount;

        const { error: updateError } = await supabase
            .from('game_data')
            .update({ 
                diamonds: nuevosDiamantes,
                last_ad_watch: new Date().toISOString(),
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        if (updateError) throw updateError;

        await updateMasterTotalDiamonds();

        const elapsed = Date.now() - startTime;
        console.log(`✅ [REWARD] Completado en ${elapsed}ms`);

        res.json({
            success: true,
            message: `+${amount} diamantes añadidos`,
            diamonds: nuevosDiamantes,
            added: amount,
            user_id: userId
        });

    } catch (error) {
        console.error('❌ [REWARD] Error crítico:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ENDPOINT PARA VERIFICAR DISPONIBILIDAD DE ANUNCIOS
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

        if (error) throw error;

        let puedeVer = true;
        let tiempoRestante = 0;

        if (usuario?.last_ad_watch) {
            const ultimo = new Date(usuario.last_ad_watch);
            const ahora = new Date();
            const horasPasadas = (ahora - ultimo) / (1000 * 60 * 60);
            
            puedeVer = horasPasadas >= 2;
            
            if (!puedeVer) {
                tiempoRestante = Math.ceil((2 - horasPasadas) * 60);
            }
        }

        res.json({
            success: true,
            can_watch: puedeVer,
            minutes_remaining: tiempoRestante,
            user_id: userId
        });

    } catch (error) {
        console.error('❌ Error en /can-watch-ad:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// FUNCIÓN AUXILIAR: ACTUALIZAR TOTAL_DIAMONDS EN MASTER
// ==========================================
async function updateMasterTotalDiamonds() {
    try {
        const { data: users, error: selectError } = await supabase
            .from('game_data')
            .select('diamonds')
            .neq('telegram_id', 'MASTER');

        if (selectError) throw selectError;

        const totalDiamonds = users.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);

        const { error: updateError } = await supabase
            .from('game_data')
            .update({
                total_diamonds: totalDiamonds,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', 'MASTER');

        if (updateError) throw updateError;

        console.log(`📊 Total diamantes actualizado: ${totalDiamonds}`);
        
    } catch (error) {
        console.error('❌ Error actualizando total_diamonds:', error);
    }
}

// ==========================================
// ENDPOINT PARA RETIROS (VERIFICACIÓN)
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

        if (error) throw error;

        const ahora = new Date();
        const inicio = new Date(ahora.getFullYear(), 0, 1);
        const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
        const semanaActual = Math.ceil(dias / 7);

        const yaRetiro = usuario?.last_withdraw_week === semanaActual;

        res.json({
            success: true,
            user_id: userId,
            current_week: semanaActual,
            last_withdraw_week: usuario?.last_withdraw_week,
            has_withdrawn_this_week: yaRetiro,
            current_diamonds: usuario?.diamonds || 0
        });

    } catch (error) {
        console.error('❌ Error en /withdraw-status:', error);
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

        await updateMasterTotalDiamonds();

        res.json({
            success: true,
            message: 'Retiro procesado correctamente',
            new_diamonds: nuevosDiamantes,
            week: semanaActual
        });

    } catch (error) {
        console.error('❌ Error en /process-withdraw:', error);
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
        console.error('❌ Error en /update-pool:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 TON CITY GAME API - SERVIDOR INICIADO');
    console.log('='.repeat(50));
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`⏰ Inicio: ${new Date().toISOString()}`);
    console.log('\n📌 ENDPOINTS DISPONIBLES:');
    console.log('   ✅ GET  /                           - Info del servidor');
    console.log('   ✅ GET  /health                      - Health check');
    console.log('   ✅ GET  /stats                       - Estadísticas globales');
    console.log('   ✅ GET  /daily-status?userId=XXX     - Estado recompensa diaria');
    console.log('   ✅ POST /claim-daily                 - Reclamar recompensa diaria');
    console.log('   ✅ GET  /reward?userId=XXX&amount=YY - Recompensa Adsgram');
    console.log('   ✅ GET  /can-watch-ad?userId=XXX     - Verificar anuncio');
    console.log('   ✅ GET  /withdraw-status?userId=XXX  - Estado de retiro');
    console.log('   ✅ POST /process-withdraw            - Procesar retiro');
    console.log('   ✅ POST /update-pool                 - Actualizar pool');
    console.log('='.repeat(50) + '\n');
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
