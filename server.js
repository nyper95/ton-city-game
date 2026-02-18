// ======================================================
// TON CITY GAME - SERVER.JS PARA KOYEB (CON WALLET)
// ======================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { TonClient, WalletContractV4 } = require("ton");
const { mnemonicToPrivateKey } = require("ton-crypto");
const { getHttpEndpoint } = require("@orbs-network/ton-access");
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// ==========================================
// CONFIGURACIÓN SUPABASE
// ==========================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ==========================================
// CONFIGURACIÓN DE LA WALLET DE LA POOL
// ==========================================
let poolWallet = null;
let poolKey = null;
let poolAddress = null;
let tonClient = null;

async function initPoolWallet() {
    try {
        console.log("🔐 Inicializando wallet de la Pool...");
        
        const mnemonic = process.env.POOL_MNEMONIC;
        if (!mnemonic) {
            throw new Error("POOL_MNEMONIC no está definida");
        }
        
        const mnemonicArray = mnemonic.split(" ");
        if (mnemonicArray.length !== 24) {
            throw new Error("La frase debe tener 24 palabras");
        }
        
        poolKey = await mnemonicToPrivateKey(mnemonicArray);
        
        poolWallet = WalletContractV4.create({
            publicKey: poolKey.publicKey,
            workchain: 0
        });
        
        poolAddress = poolWallet.address.toString();
        
        const endpoint = await getHttpEndpoint({ network: "mainnet" });
        tonClient = new TonClient({ endpoint });
        
        const balance = await tonClient.getBalance(poolWallet.address);
        console.log(`✅ Wallet de Pool inicializada:`);
        console.log(`   Dirección: ${poolAddress}`);
        console.log(`   Balance: ${(balance / 1e9).toFixed(4)} TON`);
        
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
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Ton City Game API',
        version: '3.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// ==========================================
// ENDPOINT PARA INFO DE LA POOL
// ==========================================
app.get('/pool-info', async (req, res) => {
    try {
        if (!tonClient || !poolWallet) {
            return res.status(503).json({ error: 'Wallet no inicializada' });
        }
        
        const balance = await tonClient.getBalance(poolWallet.address);
        const seqno = await poolWallet.getSeqno();
        
        res.json({
            success: true,
            address: poolAddress,
            balance: (balance / 1e9).toFixed(4),
            seqno: seqno
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINT PARA RECOMPENSA DIARIA
// ==========================================
app.get('/daily-status', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'userId requerido' });

        const { data: usuario } = await supabase
            .from('game_data')
            .select('daily_streak, last_daily_claim')
            .eq('telegram_id', userId.toString())
            .single();

        res.json({
            success: true,
            current_streak: usuario?.daily_streak || 0,
            can_claim: true
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/claim-daily', express.json(), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId requerido' });

        const { data: usuario } = await supabase
            .from('game_data')
            .select('diamonds, daily_streak')
            .eq('telegram_id', userId.toString())
            .single();

        const recompensa = 100;
        const nuevosDiamantes = (usuario?.diamonds || 0) + recompensa;
        const nuevoStreak = (usuario?.daily_streak || 0) + 1;

        await supabase
            .from('game_data')
            .update({
                diamonds: nuevosDiamantes,
                daily_streak: nuevoStreak,
                last_daily_claim: new Date().toISOString()
            })
            .eq('telegram_id', userId.toString());

        res.json({ success: true, reward: recompensa });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINT PARA ADSGRAM (ejemplo)
// ==========================================
app.get('/reward', async (req, res) => {
    try {
        const userId = req.query.userId;
        const amount = parseInt(req.query.amount) || 30;

        if (!userId) return res.status(400).json({ error: 'userId requerido' });

        const { data: usuario } = await supabase
            .from('game_data')
            .select('diamonds')
            .eq('telegram_id', userId.toString())
            .single();

        const nuevosDiamantes = (usuario?.diamonds || 0) + amount;

        await supabase
            .from('game_data')
            .update({
                diamonds: nuevosDiamantes,
                last_ad_watch: new Date().toISOString()
            })
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
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Servidor iniciado en puerto', PORT);
    console.log('='.repeat(50));
    
    const walletOk = await initPoolWallet();
    if (!walletOk) {
        console.warn('⚠️  Wallet de Pool no disponible');
    }
});
