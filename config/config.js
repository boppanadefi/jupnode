const dotenv = require('dotenv');
const path = require('path');// Load environment variables from .env file
const config = require('config');

// Load environment variables from the .env file located in the parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

//console.log('Loaded configuration:', path);

// Merge the JSON config with environment variables
const loadConfig = {

    //simulationRetries: config.get('simulation_retries'),
    //simulationDelay: config.get('simulation_delay'),
    //transactionRetries: config.get('transaction_retries')||3,
    //simulationDelay: config.get('transaction_delay') || 2000,
    quoteApiUrl: config.get('quote_api_url'), //|| "https://quote-api.jup.ag/v6",
    priceApiUrl: config.get('price_api_url') || "https://price.jup.ag/v6",
    priceMint: config.get('price_mint') ||"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    solMint: config.get('sol_mint') || "So11111111111111111111111111111111111111112",
    //activateCommission : config.get('activate_commission')|| false,
    debug: config.get('debug')|| false,
    
    testVal: process.env.test_val,
    maxRiskPerToken:process.env.MAX_RISK_PER_TOKEN || config.get('max_risk_per_token')|| 100,// USD
    minOrderPrice: process.env.MIN_ORDER_PRICE || config.get('min_order_price')||5,//USD
    minWalletBalance:process.env.MIN_WALLET_BALANCE || config.get('min_wallet_balance')||0.01,//SOL
    minSolInPool: process.env.MIN_SOL_IN_POOL || config.get('min_sol_in_pool') || 5000,//SOL
    maxPriorityFeeFactor: process.env.MAX_PRIORITY_FEE_FACTOR || 5,
    priorityFeeFlag:process.env.PRIORITY_FEE_FLAG || 'sell',
    port: process.env.PORT || 3000, // Default to 3000 if not specified in .env
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet.solana.com',
    wsUrl: process.env.WS_URL ,
    privateKey: process.env.PRIVATE_KEY,
    masterWallet: process.env.MASTER_WALLET,
    comm:process.env.COMM || 1, // by default is 1% of number of sold tokens
  
    
};

function checkConfig() {
    try {
        if (
            loadConfig.testVal === undefined ||
            loadConfig.rpcUrl === undefined ||
            loadConfig.privateKey === undefined ||
            loadConfig.masterWallet === undefined

        ) {
            return false;
        }
    } catch (e) {
        console.error(e.message);
        return false;
    }
}
module.exports = {
    loadConfig,
    checkConfig
};
