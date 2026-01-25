const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Credenciales (Usa las variables de Koyeb)
const token = '7997479192:AAHbKx61FzMBawpYtptQO7WlRLkJJWa9K1k';
const url = 'https://drab-janean-juegaygana-31185170.koyeb.app';
const port = process.env.PORT || 8000;

// Conexión a Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Para imágenes de la ciudad

const bot = new TelegramBot(token);

// 2. Rutas del Servidor
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para obtener o crear el perfil del usuario (Carga de puntos)
app.get('/get-user/:id', async (req, res) => {
    const userId = req.params.id;
    let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code === 'PGRST116') {
        // Si no existe, lo creamos
        const { data: newUser } = await supabase
            .from('users')
            .insert([{ id: userId, balance: 0, energy: 1000 }])
            .select()
            .single();
        return res.json(newUser);
    }
    res.json(user);
});

// Ruta para guardar progreso (Casinos, minas, etc)
app.post('/save-progress', async (req, res) => {
    const { userId, balance, energy } = req.body;
    const { data, error } = await supabase
        .from('users')
        .upsert({ id: userId, balance: balance, energy: energy });
    
    res.json({ success: !error });
});

// 3. Lógica del Bot de Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🏙️ ¡Bienvenido a Ton City!\n\nTu ciudad inteligente donde minas, inviertes en piscinas y juegas en el casino para ganar TON.", {
        reply_markup: {
            inline_keyboard: [[
                { text: "🚀 Entrar a la Ciudad", web_app: { url: url } }
            ]]
        }
    });
});

app.listen(port, () => {
    console.log(`Ciudad operativa en puerto ${port}`);
    bot.setWebHook(`${url}/bot${token}`);
});
         
