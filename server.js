// ======================================================
// TON CITY GAME - SERVER.JS PARA KOYEB (ADSGRAM REWARD)
// ======================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8000;

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
            .select('telegram_id, diamonds')
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

        res.json({
            success: true,
            data: {
                total_users: totalUsers,
                total_diamonds: totalDiamonds,
                pool_ton: master?.pool_ton || 100,
                registered_pool_ton: master?.total_diamonds || 100000,
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
// ENDPOINT PRINCIPAL PARA ADSGRAM
// ==========================================
app.get('/reward', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // ======================================
        // 1. OBTENER PARÁMETROS
        // ======================================
        let userId = req.query.userId || req.query.userid || req.query.uid;
        let amount = parseInt(req.query.amount) || 100; // Por defecto 100 diamantes
        
        console.log(`🎁 [REWARD] Solicitado - User: ${userId}, Amount: ${amount}`);

        // ======================================
        // 2. VALIDACIONES
        // ======================================
        if (!userId) {
            console.warn('⚠️ [REWARD] Error: userId no proporcionado');
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }

        if (isNaN(amount) || amount <= 0) {
            amount = 100; // Valor por defecto seguro
        }

        // ======================================
        // 3. BUSCAR USUARIO EN SUPABASE
        // ======================================
        console.log(`🔍 [REWARD] Buscando usuario: ${userId}`);
        
        const { data: usuario, error: selectError } = await supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userId.toString())
            .single();

        // ======================================
        // 4. SI EL USUARIO NO EXISTE, CREARLO
        // ======================================
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
                created_at: new Date().toISOString()
            };

            const { data: newUser, error: insertError } = await supabase
                .from('game_data')
                .insert([nuevoUsuario])
                .select()
                .single();

            if (insertError) {
                console.error('❌ [REWARD] Error creando usuario:', insertError);
                throw insertError;
            }

            console.log(`✅ [REWARD] Usuario creado con ${amount} diamantes`);

            // Actualizar total_diamonds en MASTER
            await updateMasterTotalDiamonds();

            const elapsed = Date.now() - startTime;
            console.log(`⏱️ [REWARD] Tiempo total: ${elapsed}ms`);

            return res.json({
                success: true,
                message: `Usuario creado con +${amount} diamantes`,
                diamonds: amount,
                user_id: userId,
                new_user: true,
                timestamp: new Date().toISOString()
            });
        }

        // ======================================
        // 5. USUARIO EXISTE - SUMAR DIAMANTES
        // ======================================
        const diamantesActuales = Number(usuario.diamonds) || 0;
        const nuevosDiamantes = diamantesActuales + amount;

        console.log(`💰 [REWARD] Usuario: ${usuario.username || userId}`);
        console.log(`   Antes: ${diamantesActuales} 💎`);
        console.log(`   +${amount} 💎`);
        console.log(`   Después: ${nuevosDiamantes} 💎`);

        // Actualizar diamantes y last_ad_watch (control de anuncios)
        const { error: updateError } = await supabase
            .from('game_data')
            .update({ 
                diamonds: nuevosDiamantes,
                last_ad_watch: new Date().toISOString(),
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        if (updateError) {
            console.error('❌ [REWARD] Error actualizando:', updateError);
            throw updateError;
        }

        // Actualizar total_diamonds en MASTER
        await updateMasterTotalDiamonds();

        // ======================================
        // 6. RESPUESTA EXITOSA
        // ======================================
        const elapsed = Date.now() - startTime;
        console.log(`✅ [REWARD] Completado en ${elapsed}ms`);

        res.json({
            success: true,
            message: `+${amount} diamantes añadidos`,
            diamonds: nuevosDiamantes,
            added: amount,
            user_id: userId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [REWARD] Error crítico:', error);
        
        const elapsed = Date.now() - startTime;
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            elapsed_ms: elapsed
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
                tiempoRestante = Math.ceil((2 - horasPasadas) * 60); // minutos restantes
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
        // Calcular total de diamantes de TODOS los usuarios
        const { data: users, error: selectError } = await supabase
            .from('game_data')
            .select('diamonds')
            .neq('telegram_id', 'MASTER');

        if (selectError) throw selectError;

        const totalDiamonds = users.reduce((sum, user) => sum + (Number(user.diamonds) || 0), 0);

        // Actualizar MASTER
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
// ENDPOINT PARA PROCESAR RETIRO (DESDE EL JUEGO)
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

        // Verificar que no haya retirado esta semana
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

        // Actualizar usuario
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

        // Actualizar pool en MASTER
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

        // Actualizar total_diamonds
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
    console.log('   ✅ GET  /reward?userId=XXX&amount=YYY - Recompensa Adsgram');
    console.log('   ✅ GET  /can-watch-ad?userId=XXX     - Verificar anuncio');
    console.log('   ✅ GET  /withdraw-status?userId=XXX  - Estado de retiro');
    console.log('   ✅ POST /process-withdraw            - Procesar retiro');
    console.log('   ✅ POST /update-pool                 - Actualizar pool');
    console.log('='.repeat(50) + '\n');
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
