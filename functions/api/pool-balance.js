// ======================================================
// DIAMOND CITY - /api/pool-balance (DESACTIVADO)
// Ya no existe un "pool" de retiro real: los diamantes ya no se
// convierten en GRAM/TON. Este archivo se deja solo para que la
// ruta responda con claridad en vez de fallar en silencio.
// ======================================================

export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({ error: "El pool de retiro ya no existe en Diamond City." }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
}
