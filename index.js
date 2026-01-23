const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-base-js');
const express = require('express');

// --- CONFIGURACIÓN ---
const token = process.env.TELEGRAM_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const url = 'https://drab-janean-juegaygana-31185170.koyeb.app';
const port = process.env.PORT || 8000;

// Inicializar Supabase y Bot
const supabase = createClient(supabaseUrl, supabaseKey);
const bot = new TelegramBot(token);
const app = express();

app.use(express.json());

// --- WEBHOOK CONFIG ---
// Esta ruta es la que recibirá los mensajes de Telegram
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Ruta raíz para que Koyeb vea que el servidor está vivo (Health Check)
app.get('/', (req, res) => {
  res.status(200).send('Servidor del Bot funcionando correctamente 🚀');
});

// --- LÓGICA DEL BOT ---
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || "Usuario";

  // Registro básico en Supabase (Ajusta los nombres de tus columnas)
  const { data, error } = await supabase
    .from('usuarios')
    .upsert({ 
      id: chatId, 
      username: username,
      comision_admin: 0.20, // Tu 20%
      ganancia_usuario: 0.80 // Su 80%
    });

  bot.sendMessage(chatId, `¡Bienvenido ${username}! 💎\n\nEste bot te permite ganar dinero jugando. \n\nRecuerda: Tus ganancias son el 80% y los pagos son automáticos al llegar al mínimo.`, {
    reply_markup: {
      inline_keyboard: [[
        { text: "🎮 ¡Jugar y Ganar!", web_app: { url: url } }
      ]]
    }
  });
});

// --- ENCENDER SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
  // Avisar a Telegram dónde enviar los mensajes
  bot.setWebHook(`${url}/bot${token}`)
    .then(() => console.log('Webhook configurado con éxito'));
});
