// =======================
// API ENDPOINT PARA ADSGRAM REWARD
// =======================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://xkkifqxxglcuyruwkbih.supabase.co',
    process.env.SUPABASE_KEY || 'sb_publishable_4vyBOxq_vIumZ4EcXyNlsw_XPbJ2iKE'
);

// =======================
// ENDPOINT DE RECOMPENSA
// =======================
app.get('/reward', async (req, res) => {
    try {
        const userId = req.query.userId || req.query.userid;
        const amount = parseInt(req.query.amount) || 500;
        
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        console.log(`🎁 Reward: ${userId} +${amount} 💎`);

        // Buscar usuario
        let { data: user, error: selectError } = await supabase
            .from('game_data')
            .select('diamonds')
            .eq('telegram_id', userId)
            .single();

        // Si no existe, crearlo
        if (selectError && selectError.code === 'PGRST116') {
            await supabase
                .from('game_data')
                .insert([{
                    telegram_id: userId,
                    diamonds: amount,
                    lvl_tienda: 0,
                    lvl_casino: 0,
                    lvl_piscina: 0,
                    lvl_parque: 0,
                    lvl_diversion: 0,
                    last_seen: new Date().toISOString()
                }]);
            
            return res.json({ 
                success: true, 
                message: `+${amount} 💎 para nuevo usuario`,
                diamonds: amount
            });
        }

        // Sumar diamantes
        const nuevos = (user?.diamonds || 0) + amount;
        
        await supabase
            .from('game_data')
            .update({ 
                diamonds: nuevos,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', userId);

        res.json({ 
            success: true, 
            message: `+${amount} 💎`,
            diamonds: nuevos
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('Ton City Reward API 🚀');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
