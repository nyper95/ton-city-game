// ======================================================
// TON CITY GAME - SERVER.JS (VERSIÓN ESTABLE v14.4.0)
// ======================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { TonClient, WalletContractV4, internal } = require("@ton/ton");
const { mnemonicToPrivateKey } = require("@ton/crypto");
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ==========================================
// CONFIGURACIÓN DE LA WALLET DE LA POOL
// ==========================================
let poolContract = null;
let poolAddress = null;
let tonClient = null;
let poolKeyPair = null;

async function initPoolWallet() {
    try {
        console.log("🔐 Inicializando wallet de la Pool...");
        
        const mnemonic = process.env.POOL_MNEMONIC;
        if (!mnemonic) {
            console.log("❌ POOL_MNEMONIC no está definida");
            return false;
        }
        
        const mnemonicArray = mnemonic.split(" ");
        console.log(`📝 Frase cargada: ${mnemonicArray.length} palabras`);
        
        if (mnemonicArray.length !== 24) {
            console.log(`❌ Deben ser 24 palabras (tiene ${mnemonicArray.length})`);
            return false;
        }
        
        // Convertir frase a clave privada
        poolKeyPair = await mnemonicToPrivateKey(mnemonicArray);
        console.log("✅ Clave privada generada");
        
        // Crear cliente TON
        tonClient = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC',
            apiKey: process.env.TON_API_KEY
        });
        console.log("✅ Cliente TON creado");
        
        // Crear wallet (contrato v4R2)
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: poolKeyPair.publicKey
        });
        
        // Abrir el contrato con el cliente
        poolContract = tonClient.open(wallet);
        poolAddress = wallet.address.toString();
        
        console.log(`✅ Dirección de wallet: ${poolAddress}`);
        
        // Obtener balance (en v14.4.0 se usa getBalance())
        const balance = await poolContract.getBalance();
        console.log(`💰 Balance: ${(Number(balance) / 1e9).toFixed(4)} TON`);
        
        // Obtener seqno (en v14.4.0 se usa getSeqno())
        const seqno = await poolContract.getSeqno();
        console.log(`🔢 Seqno actual: ${seqno}`);
        
        return true;
        
    } catch (error) {
        console.error("❌ Error inicializando wallet:", error);
        return false;
    }
}

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());

// ==========================================
// ENDPOINTS DE DIAGNÓSTICO
// ==========================================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Ton City Game API',
        version: '4.0.2',
        endpoints: {
            health: '/health',
            debug: '/debug',
            pool_info: '/pool-info'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.get('/debug', async (req, res) => {
    const status = {
        wallet_initialized: !!poolContract,
        address: poolAddress || 'no inicializada',
        env_mnemonic_set: !!process.env.POOL_MNEMONIC,
        env_mnemonic_length: process.env.POOL_MNEMONIC ? 
            process.env.POOL_MNEMONIC.split(' ').length : 0
    };
    
    if (poolContract) {
        try {
            const balance = await poolContract.getBalance();
            const seqno = await poolContract.getSeqno();
            status.balance = (Number(balance) / 1e9).toFixed(4);
            status.seqno = seqno;
        } catch (e) {
            status.error = e.message;
        }
    }
    
    res.json(status);
});

app.get('/pool-info', async (req, res) => {
    try {
        if (!poolContract) {
            return res.status(503).json({ 
                error: 'Wallet no inicializada',
                debug: '/debug'
            });
        }
        
        const balance = await poolContract.getBalance();
        const seqno = await poolContract.getSeqno();
        
        res.json({
            success: true,
            address: poolAddress,
            balance: (Number(balance) / 1e9).toFixed(4),
            seqno: seqno
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// FUNCIÓN PARA ENVIAR TON (RETIROS)
// ==========================================
async function sendTon(toAddress, amountInTon) {
    try {
        if (!poolContract) {
            throw new Error("Wallet no inicializada");
        }
        
        // Obtener seqno actual
        const seqno = await poolContract.getSeqno();
        console.log(`📤 Enviando ${amountInTon} TON a ${toAddress} (seqno: ${seqno})`);
        
        // Crear transferencia (sintaxis v14.4.0)
        const transfer = await poolContract.createTransfer({
            seqno,
            secretKey: poolKeyPair.secretKey,
            messages: [internal({
                to: toAddress,
                value: (amountInTon * 1e9).toString(), // convertir a nanoton
                body: 'Retiro Ton City Game',
                bounce: true
            })]
        });
        
        // Enviar a la red
        await poolContract.send(transfer);
        
        console.log(`✅ Transferencia enviada. Nuevo seqno será ${seqno + 1}`);
        return { success: true, seqno: seqno + 1 };
        
    } catch (error) {
        console.error("❌ Error en sendTon:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// ENDPOINT PARA PROCESAR RETIRO
// ==========================================
app.post('/process-withdraw', express.json(), async (req, res) => {
    try {
        const { userId, address, amount } = req.body;
        
        if (!userId || !address || !amount) {
            return res.status(400).json({ 
                error: 'userId, address y amount requeridos' 
            });
        }
        
        // Verificar que sea domingo
        if (new Date().getDay() !== 0) {
            return res.status(400).json({ error: 'Solo disponible domingos' });
        }
        
        // Obtener datos del usuario
        const { data: usuario } = await supabase
            .from('game_data')
            .select('diamonds, last_withdraw_week')
            .eq('telegram_id', userId)
            .single();
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Calcular semana actual
        const ahora = new Date();
        const inicio = new Date(ahora.getFullYear(), 0, 1);
        const dias = Math.floor((ahora - inicio) / (24 * 60 * 60 * 1000));
        const semanaActual = Math.ceil(dias / 7);
        
        // Verificar que no haya retirado esta semana
        if (usuario.last_withdraw_week === semanaActual) {
            return res.status(400).json({ error: 'Ya retiraste esta semana' });
        }
        
        // Enviar los TON
        const result = await sendTon(address, amount);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Actualizar base de datos
        await supabase
            .from('game_data')
            .update({
                last_withdraw_week: semanaActual
            })
            .eq('telegram_id', userId);
        
        res.json({ 
            success: true, 
            message: `Retiro de ${amount} TON procesado`,
            tx_seqno: result.seqno
        });
        
    } catch (error) {
        console.error("Error en retiro:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINT PARA ACTUALIZAR POOL (COMPRAS)
// ==========================================
app.post('/update-pool', express.json(), async (req, res) => {
    try {
        const { tonAmount, diamonds } = req.body;
        
        const { data: master, error: selectError } = await supabase
            .from('game_data')
            .select('pool_ton, total_diamonds')
            .eq('telegram_id', 'MASTER')
            .single();

        if (selectError) throw selectError;

        const nuevoPool = (master?.pool_ton || 100) + (tonAmount * 0.8);
        const nuevosDiamantesTotales = (master?.total_diamonds || 100000) + diamonds;

        await supabase
            .from('game_data')
            .update({
                pool_ton: nuevoPool,
                total_diamonds: nuevosDiamantesTotales,
                last_seen: new Date().toISOString()
            })
            .eq('telegram_id', 'MASTER');

        res.json({
            success: true,
            new_pool: nuevoPool,
            new_total_diamonds: nuevosDiamantesTotales
        });

    } catch (error) {
        console.error("❌ Error en /update-pool:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINT PARA RECOMPENSA DIARIA
// ==========================================
app.get('/daily-status', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }

        const { data: usuario } = await supabase
            .from('game_data')
            .select('daily_streak, last_daily_claim')
            .eq('telegram_id', userId.toString())
            .single();

        res.json({
            success: true,
            current_streak: usuario?.daily_streak || 0,
            last_claim: usuario?.last_daily_claim || null
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/claim-daily', express.json(), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }

        const { data: usuario } = await supabase
            .from('game_data')
            .select('diamonds, daily_streak')
            .eq('telegram_id', userId.toString())
            .single();

        const streak = usuario?.daily_streak || 0;
        const nuevoStreak = streak >= 30 ? 30 : streak + 1;
        const recompensa = Math.min(10 + (nuevoStreak - 1) * 10, 300);

        const nuevosDiamantes = (usuario?.diamonds || 0) + recompensa;

        await supabase
            .from('game_data')
            .update({
                diamonds: nuevosDiamantes,
                daily_streak: nuevoStreak,
                last_daily_claim: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        res.json({
            success: true,
            reward: recompensa,
            new_streak: nuevoStreak
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINT PARA ADSGRAM
// ==========================================
app.get('/reward', async (req, res) => {
    try {
        const userId = req.query.userId || req.query.userid;
        const amount = parseInt(req.query.amount) || 30;

        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }

        const { data: usuario } = await supabase
            .from('game_data')
            .select('diamonds')
            .eq('telegram_id', userId.toString())
            .single();

        if (!usuario) {
            await supabase
                .from('game_data')
                .insert([{
                    telegram_id: userId.toString(),
                    diamonds: amount,
                    username: `user_${userId.toString().slice(-6)}`,
                    referral_code: `REF${userId.toString().slice(-6)}`
                }]);
            
            return res.json({ success: true, diamonds: amount });
        }

        const nuevosDiamantes = (usuario.diamonds || 0) + amount;

        await supabase
            .from('game_data')
            .update({ diamonds: nuevosDiamantes })
            .eq('telegram_id', userId.toString());

        res.json({ success: true, diamonds: nuevosDiamantes });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, async () => {
    console.log(`\n🚀 Servidor iniciado en puerto ${PORT}`);
    const ok = await initPoolWallet();
    if (ok) {
        console.log(`\n✅ Wallet lista. Prueba estos endpoints:`);
        console.log(`   👉 /debug`);
        console.log(`   👉 /pool-info\n`);
    } else {
        console.log(`\n❌ Wallet no inicializada. Revisa:`);
        console.log(`   1. Variable POOL_MNEMONIC en Koyeb`);
        console.log(`   2. El endpoint /debug\n`);
    }
});
