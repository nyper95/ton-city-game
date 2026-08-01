// ======================================================
// TON CITY - /api/sell (Cloudflare Pages Function)
// Vende diamantes por TON. TODO se calcula y valida aquí,
// NUNCA se confía en números que mande el navegador del jugador.
// ======================================================

import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

const MIN_TON = 1;          // mínimo de retiro
const MAX_TON_PER_DAY = 5;  // límite diario por usuario
const RED_TON_FEE = 0.002;  // comisión de red

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { userId, diamondsAmount, tonAddress } = await request.json();

    if (!userId || !diamondsAmount || diamondsAmount <= 0 || !tonAddress) {
      return json({ error: "userId, diamondsAmount y tonAddress son requeridos" }, 400);
    }

    const supaHeaders = {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. Leer el balance REAL del usuario desde Supabase (nunca del body)
    const userRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}&select=diamonds,retiradoHoy,last_sell_date`,
      { headers: supaHeaders }
    );
    const userRows = await userRes.json();
    if (!userRows.length) return json({ error: "Usuario no encontrado" }, 404);
    const user = userRows[0];

    // 2. Reiniciar el contador diario si cambió el día
    const hoy = new Date().toDateString();
    const retiradoHoy = user.last_sell_date === hoy ? Number(user.retiradoHoy || 0) : 0;

    // 3. Verificar que realmente tenga esos diamantes
    if (diamondsAmount > Number(user.diamonds || 0)) {
      return json({ error: "No tienes suficientes diamantes" }, 400);
    }

    // 4. Leer el pool para calcular la tasa dinámica (server-side, no client-side)
    const poolRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.MASTER&select=pool_ton`,
      { headers: supaHeaders }
    );
    const poolRows = await poolRes.json();
    const poolTon = Number(poolRows[0]?.pool_ton || 100);

    const poolFactor = Math.max(0.5, Math.min(2, poolTon / 10));
    const tasa = Math.floor(10000 / poolFactor);
    const tonBruto = diamondsAmount / tasa;
    const tonNeto = tonBruto - RED_TON_FEE;

    // 5. Validaciones de montos
    if (tonNeto < MIN_TON) {
      return json({ error: `El mínimo de venta es ${MIN_TON} TON después de comisión` }, 400);
    }
    if (retiradoHoy + tonNeto > MAX_TON_PER_DAY) {
      return json({ error: `Límite diario de ${MAX_TON_PER_DAY} TON alcanzado` }, 400);
    }
    if (tonNeto > poolTon) {
      return json({ error: "El pool no tiene fondos suficientes ahora mismo, intenta más tarde" }, 400);
    }

    // 6. Reservar: descontar diamantes ANTES de enviar el TON
    //    (evita doble gasto si el usuario pulsa dos veces o repite la petición)
    const nuevosDiamantes = Number(user.diamonds) - diamondsAmount;
    await fetch(`${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: supaHeaders,
      body: JSON.stringify({
        diamonds: nuevosDiamantes,
        retiradoHoy: retiradoHoy + tonNeto,
        last_sell_date: hoy,
      }),
    });

    // 7. Enviar el TON real
    try {
      await sendTon(env, tonAddress, tonNeto);

      await fetch(`${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.MASTER`, {
        method: "PATCH",
        headers: supaHeaders,
        body: JSON.stringify({ pool_ton: poolTon - tonNeto }),
      });

      return json({ success: true, tonEnviado: tonNeto, diamonds: nuevosDiamantes });
    } catch (sendErr) {
      // 8. Si el envío falla, revertir los diamantes descontados
      await fetch(`${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: supaHeaders,
        body: JSON.stringify({
          diamonds: Number(user.diamonds),
          retiradoHoy,
          last_sell_date: user.last_sell_date || null,
        }),
      });
      return json({ error: "No se pudo enviar el TON, tus diamantes NO fueron descontados: " + sendErr.message }, 500);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function sendTon(env, toAddress, amountTon) {
  const mnemonic = env.POOL_MNEMONIC.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonic);

  const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
  });

  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  const seqno = await contract.getSeqno();

  const transfer = await contract.createTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: toAddress,
        value: BigInt(Math.round(amountTon * 1e9)).toString(),
        body: "Venta Ton City Game",
        bounce: true,
      }),
    ],
  });

  await contract.send(transfer);
  return { seqno: seqno + 1 };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
