// ======================================================
// DIAMOND CITY - /api/weekly-payout (Cloudflare Pages Function)
// Reparte diamantes reales cada semana según el ranking de
// producción. Protegido con un secreto para que solo el servicio
// de cron externo (cron-job.org) pueda ejecutarlo.
// ======================================================

const PREMIO_SEMANAL_DIAMANTES = 20000;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const secreto = url.searchParams.get("secret");
    if (!secreto || secreto !== env.WEEKLY_PAYOUT_SECRET) {
      return json({ error: "No autorizado" }, 401);
    }

    const supaHeaders = {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. Traer a todos los jugadores (menos la fila MASTER)
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=neq.MASTER&select=telegram_id,username,city_name,diamonds,lvl_piscina,lvl_fabrica,lvl_escuela,lvl_hospital,premium_expires`,
      { headers: supaHeaders }
    );
    const jugadores = await res.json();

    // 2. Calcular producción por hora de cada uno (misma fórmula que el cliente)
    const ahora = new Date();
    const conProduccion = jugadores.map((j) => {
      let produccion =
        (j.lvl_escuela || 0) * 15 +
        (j.lvl_fabrica || 0) * 25 +
        (j.lvl_piscina || 0) * 10 +
        (j.lvl_hospital || 0) * 18;
      const esPremium = j.premium_expires && new Date(j.premium_expires) > ahora;
      if (esPremium) produccion = produccion * 2;
      return { ...j, produccion };
    });

    // 3. Ordenar de mayor a menor producción
    conProduccion.sort((a, b) => b.produccion - a.produccion);

    // 4. Repartir el premio semanal por rango
    const resultados = [];
    for (let i = 0; i < conProduccion.length; i++) {
      const j = conProduccion[i];
      let premio = 0;
      if (i < 3) {
        premio = Math.floor((PREMIO_SEMANAL_DIAMANTES * 0.4) / 3);
      } else if (i < 10) {
        premio = Math.floor((PREMIO_SEMANAL_DIAMANTES * 0.25) / 7);
      } else if (i < 50) {
        premio = Math.floor((PREMIO_SEMANAL_DIAMANTES * 0.2) / 40);
      }
      if (premio > 0) {
        const nuevosDiamantes = Number(j.diamonds || 0) + premio;
        await fetch(
          `${env.SUPABASE_URL}/rest/v1/game_data?telegram_id=eq.${encodeURIComponent(j.telegram_id)}`,
          {
            method: "PATCH",
            headers: supaHeaders,
            body: JSON.stringify({ diamonds: nuevosDiamantes }),
          }
        );
        resultados.push({
          posicion: i + 1,
          telegram_id: j.telegram_id,
          city_name: j.city_name,
          premio,
        });
      }
    }

    return json({ success: true, total_premiados: resultados.length, resultados });
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
