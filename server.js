// ==========================================
// TON CITY - API REWARDS (ADSGRAM & SUPABASE)
// ==========================================
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors()); // Importante para que el mini-app pueda llamar a la API
app.use(express.json());

const PORT = process.env.PORT || 8000; // Koyeb prefiere el 8000 por defecto

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://xkkifqxxglcuyruwkbih.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY; // Usa variable de entorno para la KEY secreta
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// ENDPOINT DE RECOMPENSA (ADSGRAM)
// ==========================================
app.get('/reward', async (req, res) => {
    try {
        // Adsgram puede enviar 'userId' o 'user_id' según la config, normalizamos:
        const userId = req.query.userId || req.query.userid || req.query.user_id;
        // Monto por defecto de 500 si no se especifica
        const amountToAdd = parseInt(req.query.amount) || 500;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userId parameter' 
            });
        }

        console.log(`🎁 Procesando recompensa para: ${userId} (+${amountToAdd} 💎)`);

        // 1. Intentar obtener el usuario actual
        let { data: user, error: selectError } = await supabase
            .from('game_data')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        // 2. Si el usuario no existe (Error PGRST116), lo creamos
        if (selectError && selectError.code === 'PGRST116') {
            console.log(`🆕 Creando nuevo ciudadano en la base de datos: ${userId}`);
            
            const { data: newUser, error: insertError } = await supabase
                .from('game_data')
                .insert([{
                    telegram_id: userId,
                    diamonds: amountToAdd,
                    lvl_tienda: 0,
                    lvl_casino: 0,
                    lvl_piscina: 0,
                    lvl_parque: 0,
                    lvl_diversion: 0,
                    last_seen: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return res.json({ 
                success: true, 
                status: 'created',
                message: `¡Bienvenido! +${amountToAdd} 💎 añadidos`,
                total_diamonds: newUser.diamonds
            });
        }

        // 3. Si hay otro tipo de error de Supabase
        if (selectError) throw selectError;

        // 4. Si el usuario existe, actualizamos sus diamantes
        const nuevosDiamantes = (user.diamonds || 0) + amountToAdd;
        
        const { error: updateError } = await supabase
            .from('game_data')
            .update({ 
                diamonds: nuevosDiamantes,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId);

        if (updateError) throw updateError;

        // Respuesta exitosa para el ciudadano
        res.json({ 
            success: true, 
            status: 'updated',
            message: `Recompensa entregada: +${amountToAdd} 💎`,
            total_diamonds: nuevosDiamantes
        });

    } catch (err) {
        console.error('❌ Error en /reward:', err.message);
        res.status(500).json({ 
            success: false, 
            error: 'Internal Server Error',
            details: err.message 
        });
    }
});

// Ruta de salud para Koyeb
app.get('/', (req, res) => res.send('TON City API is Running 🚀'));

app.listen(PORT, () => {
    console.log(`✅ Servidor de TON City escuchando en el puerto ${PORT}`);
});
