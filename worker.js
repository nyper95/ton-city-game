// ============================================================
// DIAMOND CITY · WORKER DE VALIDACIÓN DE initData
// Único punto de escritura sobre saldo vía service_role
// ============================================================

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cors = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: cors });
        }

        try {
            // --- Health check ---
            if (url.pathname === '/api/health') {
                return json({ status: 'ok', service: 'diamond-city-worker' }, 200, cors);
            }

            // --- Endpoint de escritura de saldo ---
            if (url.pathname === '/api/saldo/update' && request.method === 'POST') {
                return handleSaldoUpdate(request, env, cors);
            }

            // --- Crear invoice de Stars ---
            if (url.pathname === '/api/create-stars-invoice' && request.method === 'POST') {
                return handleCreateStarsInvoice(request, env, cors);
            }

            // --- Webhook de pago de Telegram ---
            if (url.pathname === '/api/telegram-payment-webhook' && request.method === 'POST') {
                return handleTelegramWebhook(request, env, cors);
            }

            // --- Endpoint de retiro ---
            if (url.pathname === '/api/withdraw' && request.method === 'POST') {
                return handleWithdraw(request, env, cors);
            }

            return json({ error: 'not_found' }, 404, cors);

        } catch (error) {
            console.error('Worker error:', error);
            return json({ error: error.message }, 500, cors);
        }
    }
};

// ============================================================
// UTILIDAD: respuesta JSON con CORS
// ============================================================
function json(data, status = 200, cors = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors }
    });
}

// ============================================================
// VALIDACIÓN DE initData CON WEB CRYPTO API
// ============================================================
// Algoritmo:
//   1. secretKey = HMAC-SHA256("WebAppData", bot_token)
//   2. checkString = parámetros (sin hash) ordenados alfabéticamente, uno por línea
//   3. signature = HMAC-SHA256(secretKey, checkString)
//   4. Comparar signature con el hash recibido
// ============================================================

async function validateInitData(initData, botToken) {
    try {
        const params = new URLSearchParams(initData);
        const receivedHash = params.get('hash');

        if (!receivedHash) {
            console.warn('initData sin hash');
            return null;
        }

        params.delete('hash');

        // 1. Derivar la clave secreta: HMAC("WebAppData", botToken)
        const encoder = new TextEncoder();
        const webAppDataKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode('WebAppData'),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const derivedKeyBytes = await crypto.subtle.sign(
            'HMAC',
            webAppDataKey,
            encoder.encode(botToken)
        );

        // 2. Importar la clave derivada para verificar
        const verifyKey = await crypto.subtle.importKey(
            'raw',
            derivedKeyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // 3. Construir el checkString (ordenado alfabéticamente)
        const checkString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        // 4. Convertir el hash recibido de hex a bytes
        const hashBytes = hexToBytes(receivedHash);

        // 5. Verificar la firma
        const isValid = await crypto.subtle.verify(
            'HMAC',
            verifyKey,
            hashBytes,
            encoder.encode(checkString)
        );

        if (!isValid) {
            console.warn('initData con firma inválida');
            return null;
        }

        // 6. Verificar que no haya expirado (24 horas)
        const authDate = parseInt(params.get('auth_date') || '0');
        const ahora = Math.floor(Date.now() / 1000);
        if (ahora - authDate > 86400) {
            console.warn('initData expirado');
            return null;
        }

        // 7. Extraer datos del usuario
        const userJson = params.get('user');
        if (!userJson) return null;

        const user = JSON.parse(decodeURIComponent(userJson));
        return {
            user,
            authDate,
            raw: params
        };

    } catch (error) {
        console.error('Error validando initData:', error);
        return null;
    }
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// ============================================================
// CLIENTE SUPABASE (service_role desde el Worker)
// ============================================================

async function supabaseFetch(env, path, options = {}) {
    const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

    if (!response.ok) {
        throw new Error(`Supabase ${response.status}: ${JSON.stringify(data)}`);
    }
    return data;
}

// ============================================================
// HANDLER: /api/saldo/update
// ============================================================

async function handleSaldoUpdate(request, env, cors) {
    const body = await request.json();
    const { initData, action, payload } = body;

    if (!initData) {
        return json({ error: 'initData requerido' }, 400, cors);
    }

    const auth = await validateInitData(initData, env.TELEGRAM_BOT_TOKEN);
    if (!auth) {
        return json({ error: 'initData inválido o expirado' }, 401, cors);
    }

    const userId = auth.user.id.toString();
    const accionesPermitidas = ['add_soft', 'add_hard', 'spend_soft', 'spend_hard'];

    if (!accionesPermitidas.includes(action)) {
        return json({ error: 'acción no permitida' }, 400, cors);
    }

    const amount = Number(payload?.amount);
    if (!amount || amount <= 0 || amount > 100000) {
        return json({ error: 'amount inválido' }, 400, cors);
    }

    // Leer el usuario actual
    const usuarios = await supabaseFetch(
        env,
        `game_data?telegram_id=eq.${userId}&select=diamonds_soft,diamonds_hard`
    );

    if (!usuarios || usuarios.length === 0) {
        return json({ error: 'usuario no encontrado' }, 404, cors);
    }

    const u = usuarios[0];
    let soft = Number(u.diamonds_soft) || 0;
    let hard = Number(u.diamonds_hard) || 0;
    let tier = 'soft';

    if (action === 'add_soft') { soft += amount; tier = 'soft'; }
    else if (action === 'add_hard') { hard += amount; tier = 'hard'; }
    else if (action === 'spend_soft') {
        if (soft < amount) return json({ error: 'saldo soft insuficiente' }, 400, cors);
        soft -= amount;
        tier = 'soft';
    }
    else if (action === 'spend_hard') {
        if (hard < amount) return json({ error: 'saldo hard insuficiente' }, 400, cors);
        hard -= amount;
        tier = 'hard';
    }

    // Actualizar el saldo
    await supabaseFetch(env, `game_data?telegram_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            diamonds_soft: soft,
            diamonds_hard: hard
        })
    });

    // Registrar en el ledger (append-only)
    await supabaseFetch(env, 'diamond_ledger', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            amount: action.startsWith('add_') ? amount : -amount,
            tier: tier,
            source: action
        })
    });

    return json({
        success: true,
        diamonds_soft: soft,
        diamonds_hard: hard
    }, 200, cors);
}

// ============================================================
// HANDLER: /api/create-stars-invoice
// ============================================================

async function handleCreateStarsInvoice(request, env, cors) {
    const body = await request.json();
    const { initData, type, amount, days, stars } = body;

    if (!initData) return json({ error: 'initData requerido' }, 400, cors);

    const auth = await validateInitData(initData, env.TELEGRAM_BOT_TOKEN);
    if (!auth) return json({ error: 'initData inválido' }, 401, cors);

    const userId = auth.user.id.toString();

    let titulo, descripcion, payload;
    if (type === 'diamonds') {
        titulo = `💎 ${amount} Diamantes`;
        descripcion = `Compra de ${amount} diamantes en Diamond City`;
        payload = `diamonds_${amount}_${userId}_${Date.now()}`;
    } else if (type === 'premium') {
        titulo = `⭐ Premium ${days} días`;
        descripcion = `Suscripción Premium ${days} días en Diamond City`;
        payload = `premium_${days}_${userId}_${Date.now()}`;
    } else {
        return json({ error: 'type inválido' }, 400, cors);
    }

    const params = new URLSearchParams();
    params.append('title', titulo);
    params.append('description', descripcion);
    params.append('payload', payload);
    params.append('currency', 'XTR');
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
        return json({ error: data.description || 'Error creando invoice' }, 500, cors);
    }

    return json({ success: true, invoiceLink: data.result }, 200, cors);
}

// ============================================================
// HANDLER: /api/telegram-payment-webhook
// ============================================================

async function handleTelegramWebhook(request, env, cors) {
    // Verificar el secret token que configuras al registrar el webhook
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (env.WEBHOOK_SECRET && secretToken !== env.WEBHOOK_SECRET) {
        console.warn('Webhook con secret inválido');
        return json({ error: 'invalid secret' }, 401, cors);
    }

    const update = await request.json();

    // --- pre_checkout_query ---
    if (update.pre_checkout_query) {
        const pcqId = update.pre_checkout_query.id;
        await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pre_checkout_query_id: pcqId, ok: true })
            }
        );
        return json({ ok: true }, 200, cors);
    }

    // --- successful_payment ---
    if (update.message && update.message.successful_payment) {
        const sp = update.message.successful_payment;
        const userId = update.message.from.id.toString();
        const partes = sp.invoice_payload.split('_');
        const tipo = partes[0];
        const chargeId = sp.telegram_payment_charge_id;

        // Idempotencia: verificar si ya procesamos este pago
        const existentes = await supabaseFetch(
            env,
            `diamond_ledger?source=eq.payment_${chargeId}&select=id`
        );
        if (existentes && existentes.length > 0) {
            console.log('Pago ya procesado:', chargeId);
            return json({ ok: true }, 200, cors);
        }

        if (tipo === 'diamonds') {
            const diamantes = parseInt(partes[1]);

            const usuarios = await supabaseFetch(
                env,
                `game_data?telegram_id=eq.${userId}&select=diamonds_hard`
            );
            const hardActual = Number(usuarios[0]?.diamonds_hard) || 0;
            const nuevoHard = hardActual + diamantes;

            await supabaseFetch(env, `game_data?telegram_id=eq.${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    diamonds_hard: nuevoHard,
                    haInvertido: true
                })
            });

            await supabaseFetch(env, 'diamond_ledger', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    amount: diamantes,
                    tier: 'hard',
                    source: `payment_${chargeId}`
                })
            });

            console.log(`✅ Pago Stars: +${diamantes} 💎 hard a ${userId}`);

        } else if (tipo === 'premium') {
            const dias = parseInt(partes[1]);
            const expira = new Date();
            expira.setDate(expira.getDate() + dias);

            await supabaseFetch(env, `game_data?telegram_id=eq.${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    premium_expires: expira.toISOString(),
                    haInvertido: true
                })
            });

            await supabaseFetch(env, 'diamond_ledger', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    amount: 0,
                    tier: 'hard',
                    source: `premium_${dias}d_${chargeId}`
                })
            });

            console.log(`✅ Premium Stars: ${dias} días a ${userId}`);
        }
    }

    return json({ ok: true }, 200, cors);
}

// ============================================================
// HANDLER: /api/withdraw
// ============================================================

async function handleWithdraw(request, env, cors) {
    const body = await request.json();
    const { initData, amount_usdt, address } = body;

    if (!initData) return json({ error: 'initData requerido' }, 400, cors);

    const auth = await validateInitData(initData, env.TELEGRAM_BOT_TOKEN);
    if (!auth) return json({ error: 'initData inválido' }, 401, cors);

    const userId = auth.user.id.toString();

    // Validaciones básicas
    if (!amount_usdt || amount_usdt < 10) {
        return json({ error: 'Mínimo de retiro: 10 USDT' }, 400, cors);
    }
    if (!address || address.length < 10) {
        return json({ error: 'Dirección inválida' }, 400, cors);
    }

    // Obtener datos del usuario
    const usuarios = await supabaseFetch(
        env,
        `game_data?telegram_id=eq.${userId}&select=diamonds_hard,account_created_at,first_withdrawal_reviewed`
    );

    if (!usuarios || usuarios.length === 0) {
        return json({ error: 'usuario no encontrado' }, 404, cors);
    }

    const u = usuarios[0];
    const hard = Number(u.diamonds_hard) || 0;

    // Verificar antigüedad mínima (ej: 7 días)
    const created = new Date(u.account_created_at);
    const diasAntiguedad = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (diasAntiguedad < 7) {
        return json({ error: 'Cuenta demasiado nueva. Requiere 7 días de antigüedad.' }, 400, cors);
    }

    // Tasa de conversión: ajusta según tu economía
    // Ejemplo: 1000 diamantes hard = 1 USDT
    const TASA_DIAMANTES_POR_USDT = 1000;
    const diamantesRequeridos = amount_usdt * TASA_DIAMANTES_POR_USDT;

    if (hard < diamantesRequeridos) {
        return json({
            error: `Saldo insuficiente. Necesitas ${diamantesRequeridos} 💎 hard, tienes ${hard}.`
        }, 400, cors);
    }

    // Verificar límite diario global
    const limites = await supabaseFetch(
        env,
        'global_limits?id=eq.withdraw_daily_used&select=value'
    );
    const usadoHoy = Number(limites[0]?.value) || 0;

    const limitesMax = await supabaseFetch(
        env,
        'global_limits?id=eq.withdraw_daily_max&select=value'
    );
    const maxDiario = Number(limitesMax[0]?.value) || 5000;

    const pausado = await supabaseFetch(
        env,
        'global_limits?id=eq.withdraw_paused&select=value'
    );
    if (Number(pausado[0]?.value) === 1) {
        return json({ error: 'Retiros pausados temporalmente por mantenimiento.' }, 503, cors);
    }

    if (usadoHoy + amount_usdt > maxDiario) {
        return json({ error: 'Límite diario global alcanzado. Intenta mañana.' }, 429, cors);
    }

    // Si es el primer retiro, marcar para revisión manual
    const esPrimero = !u.first_withdrawal_reviewed;
    const estado = esPrimero ? 'pending_review' : 'pending';

    // Descontar del saldo hard
    const nuevoHard = hard - diamantesRequeridos;
    await supabaseFetch(env, `game_data?telegram_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            diamonds_hard: nuevoHard,
            first_withdrawal_reviewed: true
        })
    });

    // Registrar en ledger
    await supabaseFetch(env, 'diamond_ledger', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            amount: -diamantesRequeridos,
            tier: 'hard',
            source: `withdraw_${amount_usdt}usdt`
        })
    });

    // Registrar el retiro
    await supabaseFetch(env, 'withdrawals', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            amount_usdt: amount_usdt,
            address: address,
            status: estado
        })
    });

    // Actualizar límite diario
    await supabaseFetch(env, 'global_limits?id=eq.withdraw_daily_used', {
        method: 'PATCH',
        body: JSON.stringify({ value: usadoHoy + amount_usdt })
    });

    return json({
        success: true,
        status: estado,
        message: esPrimero
            ? 'Primer retiro en revisión manual. Te notificaremos cuando se procese.'
            : 'Retiro en cola de procesamiento.',
        nuevo_saldo_hard: nuevoHard
    }, 200, cors);
}
