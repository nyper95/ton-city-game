// ======================================================
// TON CITY GAME - SERVER.JS (VERSIÓN COMPATIBLE)
// ======================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { TonClient, WalletContractV4 } = require("@ton/ton");
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
        
        // Obtener balance
        const balance = await poolContract.getBalance();
        console.log(`💰 Balance: ${(Number(balance) / 1e9).toFixed(4)} TON`);
        
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
        version: '4.0.1',
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
            status.balance = (Number(balance) / 1e9).toFixed(4);
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
        
        res.json({
            success: true,
            address: poolAddress,
            balance: (Number(balance) / 1e9).toFixed(4)
        });
        
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
        console.log(`✅ Wallet lista. Prueba /pool-info`);
    } else {
        console.log(`❌ Wallet no inicializada. Revisa /debug`);
    }
});
