const { Bot, InlineKeyboard } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Conexión a Supabase (usaremos variables de entorno)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const bot = new Bot(process.env.BOT_TOKEN);

bot.command("start", async (ctx) => {
  const { id, username, first_name, language_code } = ctx.from;
  const isEs = language_code === "es";

  // Registro/Actualización del usuario en Supabase
  await supabase.from("users").upsert({ 
    id: id, 
    username: username || first_name,
    last_claim: new Date()
  });

  const message = isEs 
    ? `🏙️ **¡Bienvenido a Ton City!**\n\nTu ciudad minera está lista. Gana diamantes cada 24h y recibe pagos automáticos en TON.`
    : `🏙️ **Welcome to Ton City!**\n\nYour mining city is ready. Earn diamonds every 24h and get automatic TON payouts.`;

  const keyboard = new InlineKeyboard()
    .webApp(isEs ? "¡Entrar a la Ciudad! 💎" : "Enter the City! 💎", "https://ton-city-webapp.vercel.app")
    .row()
    .url(isEs ? "Canal de la Comunidad" : "Community Channel", "https://t.me/TonCityChannel");

  await ctx.reply(message, { parse_mode: "Markdown", reply_markup: keyboard });
});

bot.start();
            
