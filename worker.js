// worker.js - Adaptación de Cloudflare Workers
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
      // ===== Crear factura de Stars =====
      if (path === '/api/create-stars-invoice' && request.method === 'POST') {
        const body = await request.json();
        const { userId, type, amount, days, stars } = body;

        if (!userId) {
          return json({ error: 'userId requerido' }, 400);
        }

        let titulo = '', descripcion = '', payload = '';

        if (type === 'diamonds') {
          titulo = `💎 ${amount} Diamantes`;
          descripcion = `Compra de ${amount} diamantes en Diamond City`;
          payload = `diamonds_${amount}_${userId}_${Date.now()}`;
        } else if (type === 'premium') {
          titulo = `⭐ Premium ${days} días`;
          descripcion = `Suscripción Premium ${days} días en Diamond City`;
          payload = `premium_${days}_${userId}_${Date.now()}`;
        } else {
          return json({ error: 'type inválido' }, 400);
        }

        // Llamar a Telegram Bot API
        const params = new URLSearchParams();
        params.append('title', titulo);
        params.append('description', descripcion);
        params.append('payload', payload);
        params.append('currency', 'XTR');  // Telegram Stars
        params.append('prices', JSON.stringify([{ label: titulo, amount: parseInt(stars) }]));

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
          return json({ error: data.description || 'Error creando invoice' }, 500);
        }

        return json({ success: true, invoiceLink: data.result });
      }

      // ===== Webhook de pagos de Telegram =====
      if (path === '/api/telegram-payment-webhook' && request.method === 'POST') {
        const update = await request.json();

        // Confirmar pago previo
        if (update.pre_checkout_query) {
          await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pre_checkout_query_id: update.pre_checkout_query.id,
                ok: true
              })
            }
          );
          return json({ ok: true });
        }

        // Manejar pago exitoso
        if (update.message?.successful_payment) {
          const sp = update.message.successful_payment;
          const userId = update.message.from.id.toString();
          const partes = sp.invoice_payload.split('_');
          const tipo = partes[0];

          // Actualizar Supabase
          const supabaseUrl = env.SUPABASE_URL;
          const supabaseKey = env.SUPABASE_KEY;

          if (tipo === 'diamonds') {
            const diamantes = parseInt(partes[1]);
            // Obtener usuario actual
            const getResp = await fetch(
              `${supabaseUrl}/rest/v1/game_data?telegram_id=eq.${userId}&select=diamonds`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`
                }
              }
            );
            const users = await getResp.json();
            const nuevosDiamantes = (users[0]?.diamonds || 0) + diamantes;

            await fetch(`${supabaseUrl}/rest/v1/game_data?telegram_id=eq.${userId}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                diamonds: nuevosDiamantes,
                haInvertido: true
              })
            });
          } else if (tipo === 'premium') {
            const dias = parseInt(partes[1]);
            const expira = new Date();
            expira.setDate(expira.getDate() + dias);

            await fetch(`${supabaseUrl}/rest/v1/game_data?telegram_id=eq.${userId}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                premium_expires: expira.toISOString(),
                haInvertido: true
              })
            });
          }
        }

        return json({ ok: true });
      }

      // Endpoint de salud
      if (path === '/' || path === '/health') {
        return json({ status: 'healthy', service: 'Diamond City API' });
      }

      return json({ error: 'Not found' }, 404);

    } catch (error) {
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
