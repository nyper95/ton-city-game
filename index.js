const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Variables de entorno
const token = process.env.TELEGRAM_TOKEN;
const url = 'https://drab-janean-juegaygana-31185170.koyeb.app';
const port = process.env.PORT || 8000;

// Inicializar Express y Bot
const app = express();
app.use(express.json());
const bot = new TelegramBot(token);

// Ruta para que Koyeb sepa que el servidor está vivo
app.get('/', (req, res) => res.send('Bot Online 🚀'));

// Ruta para recibir mensajes de Telegram
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Mensaje de bienvenida y botón de juego
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "¡Bienvenido! 💎\nTus ganancias: 80% | Admin: 20%", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🎮 Jugar ahora", web_app: { url: url } }
      ]]
    }
  });
});

// Encender servidor
app.listen(port, () => {
  console.log(`Servidor en puerto ${port}`);
  bot.setWebHook(`${url}/bot${token}`);
});
