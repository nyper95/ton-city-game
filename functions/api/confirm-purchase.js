// ======================================================
// TON CITY - /api/confirm-purchase (Cloudflare Pages Function)
// v2: la compra ahora es UNA sola transacción con 2 mensajes
// (80% al pool, 20% al dueño). Verificamos que el pago al POOL
// realmente llegó antes de acreditar diamantes.
// ======================================================

const PACKS = [
  { ton: 0.10, diamonds: 100 },
  { ton: 0.50, diamonds: 500 },
  { ton: 1.00, diamonds: 1000 },
  { ton: 2.00, diamonds: 2000 },
  { ton: 5.00, diamonds: 5000 },
  { ton: 10.00, diamonds: 10000 },
];

const PORCENTAJE_POOL = 0.8;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { userId, tonAmount } = await request.json();
    if (!userId || !tonAmount) {
      return json({ error: "userId y tonAmount son requeridos" }, 400);
    }

    const pack = PACKS.find((p) => Math.abs(p.ton - Number(tonAmount)) < 0.0001);
    if (!pack) return json({ error: "Monto de compra no válido" }, 400);

    const montoEsperadoEnPool = pack.ton * PORCENTAJE_POOL;

    const supaHeaders = {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    const tcRes = await fetch(
      `https://toncenter.com/api/v2/getTransactions?address=${env.POOL_ADDRESS}&limit=20&api_key=${env.TON_API_KEY}`
    );
    const tcData = await tcRes.json();
    const transacciones = tcData.result || [];

    const ahoraSegundos = Math.floor(Date.now() / 1000);
    let txEncontrada = null;

    for (const tx of transacciones) {
      const nanoRecibido = Number(tx.in_msg?.value || 0);
      const tonRecibido = nanoRecibido / 1e9;
      const txHash = tx.transaction_id?.hash;
      const txTime = Number(tx.utime || 0);

      if (!txHash) continue;
      if (ahoraSegundos - txTime > 300) continue;
      if (Math.abs(tonRecibido - montoEsperadoEnPool) > 0.001) continue;

      const seenRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/processed_transactions?tx_hash=eq.${encodeURIComponent(txHash)}&select=tx_hash`,
        { headers: supaHeaders }
      );
      const seenRows = await seenRes.json();
      if (seenRows.length) continue;

      txEncontrada = { hash: txHash };
      break;
    }

    if (!txEncontrada) {
      return json(
        { error: "No encontramos tu pago todavía en la blockchain. Espera unos segundos e intenta de nuevo." },
        404
      );
    }

    await fetch(`${env.SUPABASE_URL}/rest/v1/processed_transactions`, {
      method: "POST",
      headers: supaHeaders,
      body: JSON.stringify({ tx_hash: txEncontrada.hash, telegram_id: userId, ton_amount: pack.ton }),
    });

    const userRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}&select=diamonds`,
      { headers: supaHeaders }
    );
    const userRows = await userRes.json();
    const diamondsActuales = Number(userRows[0]?.diamonds || 0);
    const nuevosDiamantes = diamondsActuales + pack.diamonds;

    await fetch(`${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: supaHeaders,
      body: JSON.stringify({ diamonds: nuevosDiamantes, haInvertido: true }),
    });

    const poolRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.MASTER&select=pool_ton,total_diamonds`,
      { headers: supaHeaders }
    );
    const poolRows = await poolRes.json();
    const nuevoPool = Number(poolRows[0]?.pool_ton || 100) + montoEsperadoEnPool;
    const nuevoTotal = Number(poolRows[0]?.total_diamonds || 100000) + pack.diamonds;

    await fetch(`${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.MASTER`, {
      method: "PATCH",
      headers: supaHeaders,
      body: JSON.stringify({ pool_ton: nuevoPool, total_diamonds: nuevoTotal }),
    });

    return json({ success: true, diamonds: nuevosDiamantes });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
