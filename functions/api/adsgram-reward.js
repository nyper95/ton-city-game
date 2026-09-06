// ======================================================
// DIAMOND CITY - /api/adsgram-reward (Cloudflare Pages Function)
// AdsGram llama esta URL desde SUS servidores (no desde el
// navegador del jugador) solo cuando confirma que el anuncio se
// vio completo de verdad. Por eso es más seguro que el navegador
// decida solo: nadie puede fingir haber visto un anuncio.
// ======================================================

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userid");
    const amount = parseInt(url.searchParams.get("amount") || "20", 10);
    const tipo = url.searchParams.get("tipo") || "anuncio";

    if (!userId) {
      return json({ error: "userid es requerido" }, 400);
    }

    const supaHeaders = {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    const userRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}&select=diamonds,news_feed`,
      { headers: supaHeaders }
    );
    const userRows = await userRes.json();
    if (!userRows.length) return json({ error: "Usuario no encontrado" }, 404);

    const nuevosDiamantes = Number(userRows[0].diamonds || 0) + amount;
    const feedActual = userRows[0].news_feed || [];
    const nuevoFeed = [
      { icono: "📺", titulo: "Anuncio confirmado por el servidor", subtitulo: "+" + amount + " 💎 acreditados", fecha: new Date().toISOString() },
      ...feedActual,
    ].slice(0, 15);

    await fetch(`${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: supaHeaders,
      body: JSON.stringify({ diamonds: nuevosDiamantes, news_feed: nuevoFeed }),
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
