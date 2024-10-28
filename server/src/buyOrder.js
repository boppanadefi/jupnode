//const {loadConfig} = require('../../config/config');
const util = require('./utils');
const modal = require('./modal');
const solanaWeb3 = require('@solana/web3.js');




async function processBuyOrder(id, pool, data,  wallet,config) {

     
    let defaultOrder = modal.defaultOrder();
  
       
    try { 


        util.printMsg(id,'Processing Buy Order');
        // enough  wallet balance 
        let walletBalance = await util.getWalletBalance(id, wallet);
        let requireBalance = walletBalance - config.minWalletBalance;
        util.printMsg(id, `Wallet Balance Excluding Min.Balance:${requireBalance} SOL `);

        if (data.amount > requireBalance) {
            util.printMsg(id, `Insufficient Wallet balance (exclude Min.Balance${config.minWalletBalance}) ${walletBalance} SOL  for BUY ORDER`);
            return defaultOrder;
        }

        // Pool got enough SOL 

        let poolBalance = await util.getPoolSolBalance(id, pool.solVault) 

        if (poolBalance < config.minSolInPool) {
            util.printMsg(id, `Pool Balance (${poolBalance} SOL) is Less than Min.SOL(${config.minSolInPool} SOL)  Hence NOT Buying...`);
            return defaultOrder;
        }

        // let isTokenValid = await util.isTokenValid(id, pool.tokenMint, mintSymbol);
        // if (!isTokenValid) {
        //     util.printMsg(id, `Token Mint (${pool.tokenMint}) is not Valid`);
        //     return defaultOrder;
        // }

        let order = modal.defaultOrder();
        order.mode = util.buy;
        order.mint = pool.tokenMint;
        order.orderAmount = data.amount ;
        order.orderSlippage = data.slippage_bps;
        order.decimals = pool.tokenDecimals;
        order.isSuccessful = true;

        util.printMsg(id, `Placing Buy Order for ${order.mint} for ${data.amount} SOL .....`);

        return order;
        
    }
    catch (error) {
        console.error(`Error processing buy order: ${error}`);
        return defaultOrder;
    }
    
}

module.exports = {
    processBuyOrder
};
    
  