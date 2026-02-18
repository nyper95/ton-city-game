// ======================================================
// TON CITY GAME - SERVER.JS (ACTUALIZADO 2026)
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
        
        // Convertir frase a clave privada (igual que antes)
        poolKeyPair = await mnemonicToPrivateKey(mnemonicArray);
        console.log("✅ Clave privada generada");
        
        // Crear cliente TON
        tonClient = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC',
            apiKey: process.env.TON_API_KEY
        });
        console.log("✅ Cliente TON creado");
        
        // Crear wallet (contrato)
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: poolKeyPair.publicKey
        });
        
        // ⚠️ PARTE CRÍTICA: Abrir el contrato con el cliente
        poolContract = tonClient.open(wallet);
        poolAddress = wallet.address.toString();
        
        console.log(`✅ Dirección de wallet: ${poolAddress}`);
        
        // Obtener balance USANDO EL CONTRATO ABIERTO
        const balance = await poolContract.getBalance();
        console.log(`💰 Balance: ${(Number(balance) / 1e9).toFixed(4)} TON`);
        
        // Obtener seqno USANDO EL CONTRATO ABIERTO
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
        version: '4.0.0',
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
// FUNCIÓN PARA PROCESAR RETIROS (usando @ton/ton v16)
// ==========================================
async function sendTon(toAddress, amountInTon) {
    try {
        if (!poolContract) {
            throw new Error("Wallet no inicializada");
        }
        
        // Obtener seqno actual
        const seqno = await poolContract.getSeqno();
        console.log(`📤 Enviando ${amountInTon} TON a ${toAddress} (seqno: ${seqno})`);
        
        // Crear transferencia con la nueva sintaxis
        const transfer = await poolContract.createTransfer({
            seqno,
            secretKey: poolKeyPair.secretKey,
            messages: [internal({
                value: amountInTon.toString(),
                to: toAddress,
                body: 'Retiro Ton City Game',
                bounce: true
            })]
        });
        
        // Enviar a la red
        await poolContract.send(transfer);
        
        console.log(`✅ Transferencia enviada. Nuevo seqno será ${seqno + 1}`);
        return { success: true };
        
    } catch (error) {
        console.error("❌ Error en sendTon:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// ENDPOINT PARA PROCESAR RETIRO (DESDE EL JUEGO)
// ==========================================
app.post('/process-withdraw', express.json(), async (req, res) => {
    try {
        const { userId, address, amount } = req.body;
        
        if (!userId || !address || !amount) {
            return res.status(400).json({ 
                error: 'userId, address y amount requeridos' 
            });
        }
        
        // 1. Verificar que sea domingo
        if (new Date().getDay() !== 0) {
            return res.status(400).json({ error: 'Solo disponible domingos' });
        }
        
        // 2. Obtener datos del usuario
        const { data: usuario } = await supabase
            .from('game_data')
            .select('diamonds, last_withdraw_week')
            .eq('telegram_id', userId)
            .single();
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // 3. Verificar que no haya retirado esta semana
        const semanaActual = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        if (usuario.last_withdraw_week === semanaActual) {
            return res.status(400).json({ error: 'Ya retiraste esta semana' });
        }
        
        // 4. ENVIAR LOS TON (usando la función de arriba)
        const result = await sendTon(address, amount);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // 5. Actualizar base de datos
        await supabase
            .from('game_data')
            .update({
                diamonds: usuario.diamonds - (amount * 1000), // ajusta según tu fórmula
                last_withdraw_week: semanaActual
            })
            .eq('telegram_id', userId);
        
        res.json({ 
            success: true, 
            message: `Retiro de ${amount} TON procesado` 
        });
        
    } catch (error) {
        console.error("Error en retiro:", error);
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
        console.log(`✅ Wallet lista. Prueba /pool-info`);
    } else {
        console.log(`❌ Wallet no inicializada. Revisa /debug`);
    }
});
