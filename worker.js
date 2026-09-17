// ======================================================
// DIAMOND CITY API — Cloudflare Worker v2.0
// Pagos con Telegram Stars (XTR)
//
// SEGURIDAD IMPLEMENTADA:
// 1. Precios calculados SOLO en el servidor (el cliente no
//    manda el precio — si lo hiciera, podrían pagar 1 ⭐ por
//    10,000 💎).
// 2. Idempotencia: cada cargo (charge_id) se registra una sola
//    vez en la tabla `payments`. Telegram reintenta el webhook
//    y sin esto los diamantes se duplicarían.
// 3. El pago se acredita al PAGADOR real (from.id de Telegram),
//    no al userId que venga en el payload. Si no coinciden,
//    se rechaza (anti-tampering).
// 4. Premium se EXTIENDE desde la fecha actual si aún está
//    activo (antes sobrescribía y podías "perder" días).
// 5. Webhook protegido con secret token (X-Telegram-Bot-Api-Secret-Token).
// ======================================================

// ---- Tarifas OFICIALES del juego (fuente única de verdad) ----
const PACKS_DIAMANTES = { 100: 160, 500: 800, 1000: 1600, 2000: 3200, 5000: 8000, 10000: 16000 };
const PREMIUM_PLANS   = { 1: 320, 7: 1600, 30: 4800 };
const MARGEN_STARS    = 1.15;
const starsPara = (base) => Math.round(base * MARGEN_STARS);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Manejo CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    try {
      // ==================================================
      // POST /api/create-stars-invoice
      // ==================================================
      if (path === '/api/create-stars-invoice' && request.method === 'POST') {
        const body = await request.json();
        const { userId, type, amount, days } = body;

        // Solo IDs reales de Telegram (números). Los "test_..." del
        // navegador no pueden pagar con Stars de todas formas.
        if (!userId || !/^\d+$/.test(String(userId))) {
          return json({ success: false, error: 'userId de Telegram requerido' }, 400);
        }

        let titulo = '', descripcion = '', payload = '', stars = 0;

        if (type === 'diamonds') {
          // PRECIO SERVER-SIDE: no confiamos en lo que mande el cliente
          if (!PACKS_DIAMANTES[amount]) {
            return json({ success: false, error: 'Pack inválido' }, 400);
          }
          stars = starsPara(PACKS_DIAMANTES[amount]);
          titulo = `💎 ${amount} Diamantes`;
          descripcion = `${amount} diamantes para tu ciudad en Diamond City`;
          payload = `dc_diamonds_${amount}_${userId}_${Date.now()}`;
        } else if (type === 'premium') {
          const d = parseInt(days, 10);
          if (!PREMIUM_PLANS[d]) {
            return json({ success: false, error: 'Plan inválido' }, 400);
          }
          stars = starsPara(PREMIUM_PLANS[d]);
          titulo = `⭐ Premium ${d} días`;
          descripcion = `Suscripción Premium ${d} días en Diamond City (x2 producción, sin anuncios)`;
          payload = `dc_premium_${d}_${userId}_${Date.now()}`;
        } else {
          return json({ success: false, error: 'type inválido' }, 400);
        }

        const params = new URLSearchParams();
        params.append('title', titulo);
        params.append('description', descripcion);
        params.append('payload', payload);
        params.append('currency', 'XTR'); // Telegram Stars
        params.append('prices', JSON.stringify([{ label: titulo, amount: stars }]));

        const resp = await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          }
        );

        const data = await resp.json();
        if (!data.ok) {
          return json({ success: false, error: data.description || 'Error creando invoice' }, 500);
        }

        return json({ success: true, invoiceLink: data.result });
      }

      // ==================================================
      // POST /api/telegram-payment-webhook
      // ==================================================
      if (path === '/api/telegram-payment-webhook' && request.method === 'POST') {
        // Verificación del secret token (si lo configuraste en setWebhook)
        if (env.WEBHOOK_SECRET) {
          const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
          if (secretHeader !== env.WEBHOOK_SECRET) {
            return json({ error: 'Unauthorized' }, 401);
          }
        }

        const update = await request.json();

        // ---- Pre-checkout: validar ANTES de autorizar el pago ----
        if (update.pre_checkout_query) {
          const pq = update.pre_checkout_query;
          const parts = (pq.invoice_payload || '').split('_');
          // Formato: dc_tipo_valor_userId_timestamp
          let ok = parts.length === 5 && parts[0] === 'dc';
          let starsEsperados = 0;

          if (ok && parts[1] === 'diamonds' && PACKS_DIAMANTES[parseInt(parts[2], 10)]) {
            starsEsperados = starsPara(PACKS_DIAMANTES[parseInt(parts[2], 10)]);
          } else if (ok && parts[1] === 'premium' && PREMIUM_PLANS[parseInt(parts[2], 10)]) {
            starsEsperados = starsPara(PREMIUM_PLANS[parseInt(parts[2], 10)]);
          } else {
            ok = false;
          }

          // Verificar que el monto cobrado sea el oficial
          const total = pq.total_amount || 0;
          if (ok && starsEsperados > 0 && total !== starsEsperados) ok = false;

          await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pre_checkout_query_id: pq.id,
                ok,
                error_message: ok ? undefined : 'Datos de pago inválidos. Intenta de nuevo.'
              })
            }
          );
          return json({ ok: true });
        }

        // ---- Pago exitoso ----
        if (update.message && update.message.successful_payment) {
          const sp = update.message.successful_payment;
          const payerId = update.message.from.id.toString();
          const chargeId = sp.telegram_payment_charge_id;
          const parts = (sp.invoice_payload || '').split('_');

          if (parts.length !== 5 || parts[0] !== 'dc') {
            return json({ ok: true }); // payload extraño: ignorar con calma
          }

          const tipo = parts[1];            // 'diamonds' | 'premium'
          const valor = parseInt(parts[2], 10);
          const payloadUserId = parts[3];

          // ANTI-TAMPERING: el pago se acredita al PAGADOR, no al userId del payload
          if (payloadUserId !== payerId) {
            console.error(`⚠️ Payload no coincide con pagador: ${payloadUserId} vs ${payerId}`);
            return json({ ok: true });
          }

          if (tipo === 'diamonds' && !PACKS_DIAMANTES[valor]) return json({ ok: true });
          if (tipo === 'premium' && !PREMIUM_PLANS[valor]) return json({ ok: true });

          const sb = `${env.SUPABASE_URL}/rest/v1`;
          const headers = {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          };

          // ---- IDEMPOTENCIA: registrar el cargo (único por charge_id) ----
          const reg = await fetch(`${sb}/payments`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              charge_id: chargeId,
              telegram_id: payerId,
              tipo,
              detalle: tipo === 'diamonds' ? `${valor} diamantes` : `Premium ${valor} dias`,
              stars: sp.total_amount || 0,
              payload: sp.invoice_payload
            })
          });

          if (reg.status === 409) {
            // Ya fue procesado (Telegram reintentó el webhook) → no duplicar
            return json({ ok: true, duplicated: true });
          }

          // ---- Acreditar según tipo ----
          if (tipo === 'diamonds') {
            const getResp = await fetch(`${sb}/game_data?telegram_id=eq.${payerId}&select=diamonds`, { headers });
            const users = await getResp.json();
            const actuales = (Array.isArray(users) && users[0] && Number(users[0].diamonds)) || 0;

            await fetch(`${sb}/game_data?telegram_id=eq.${payerId}`, {
              method: 'PATCH',
              headers: { ...headers, 'Prefer': 'return=minimal' },
              body: JSON.stringify({ diamonds: actuales + valor, haInvertido: true })
            });
          } else if (tipo === 'premium') {
            const getResp = await fetch(`${sb}/game_data?telegram_id=eq.${payerId}&select=premium_expires`, { headers });
            const users = await getResp.json();

            // EXTENDER desde la fecha actual si aún está activo
            const base = (users[0] && users[0].premium_expires && new Date(users[0].premium_expires) > new Date())
              ? new Date(users[0].premium_expires)
              : new Date();
            base.setDate(base.getDate() + valor);

            await fetch(`${sb}/game_data?telegram_id=eq.${payerId}`, {
              method: 'PATCH',
              headers: { ...headers, 'Prefer': 'return=minimal' },
              body: JSON.stringify({ premium_expires: base.toISOString(), haInvertido: true })
            });
          }

          // ---- Notificar al jugador por el bot ----
          try {
            const msg = tipo === 'diamonds'
              ? `✅ ¡Pago confirmado!\n\n+${valor} 💎 diamantes ya están en tu ciudad.\n\n¡Gracias por apoyar Diamond City!`
              : `⭐ ¡Premium activado!\n\nSuscripción de ${valor} días activa: x2 producción y sin anuncios.\n\n¡Gracias por apoyar Diamond City!`;
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: payerId, text: msg })
            });
          } catch (e) { /* el mensaje es opcional */ }
        }

        return json({ ok: true });
      }

      // Endpoint de salud
      if (path === '/' || path === '/health') {
        return json({ status: 'healthy', service: 'Diamond City API v2.0' });
      }

      return json({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return json({ error: error.message }, 500);
    }
  }
};

// Función auxiliar
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
