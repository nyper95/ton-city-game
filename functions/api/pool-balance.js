// ======================================================
// TON CITY - /api/pool-balance (Cloudflare Pages Function)
// Devuelve el balance REAL de la wallet del pool consultando
// toncenter.com (sin API key: suficiente para bajo volumen,
// límite de 1 solicitud/segundo). Se puede añadir una key de
// TONCENTER más adelante si hace falta más límite.
// ======================================================

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const res = await fetch(
      `https://toncenter.com/api/v2/getAddressBalance?address=${env.POOL_ADDRESS}`
    );
    const data = await res.json();

    if (!data.ok) {
      return json({ error: "No se pudo consultar el balance" }, 500);
    }

    const balanceTon = Number(data.result || 0) / 1e9;
    return json({ success: true, pool_ton: balanceTon });
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
