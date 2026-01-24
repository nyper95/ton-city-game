const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');

// Reemplaza con tu Token real
const token = '7997479192:AAHbKx61FzMBawpYtptQO7WlRLkJJWa9K1k'; 
const url = 'https://drab-janean-juegaygana-31185170.koyeb.app';
const port = process.env.PORT || 8000;

const app = express();
app.use(express.json());

// Esta línea le dice al servidor que muestre tu juego (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const bot = new TelegramBot(token);

// Ruta para recibir mensajes de Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Comando de bienvenida
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "¡Bienvenido a Ton City! 💎\nPresiona el botón de abajo para empezar a minar.", {
        reply_markup: {
            inline_keyboard: [[
                { text: "🎮 Jugar Ahora", web_app: { url: url } }
            ]]
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor en puerto ${port}`);
    bot.setWebHook(`${url}/bot${token}`);
});
