// ======================================================
// DIAMOND CITY - /api/sell (DESACTIVADO)
// Este endpoint quedó deshabilitado a propósito: el juego ya
// no permite convertir diamantes en GRAM/TON real. Se deja este
// archivo solo para que la ruta responda con un error claro en
// vez de eliminarla (por si algo viejo todavía le apunta).
// NO contiene ninguna lógica de envío de fondos reales.
// ======================================================

export async function onRequestPost(context) {
  return new Response(
    JSON.stringify({ error: "La venta de diamantes por GRAM ya no está disponible en Diamond City." }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
}
