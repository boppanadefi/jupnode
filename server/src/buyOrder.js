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

        let walletTokenBalance = await util.getWalletTokenBalance(id, wallet,pool.tokenMint);
        util.printMsg(id, `Number of Tokens in the Wallet ${walletTokenBalance}`) 
        util.printMsg(id, `Token Price ${data.price} USD`) 
        util.printMsg(id, `Max.Risk ${config.maxRiskPerToken} USD`) 
        
        

        tokenValue = walletTokenBalance * data.price

        util.printMsg(id, `Value of Available Tokens :  ${tokenValue} USD`);

        if (tokenValue > config.maxRiskPerToken) {
            util.printMsg(id, `Risk Per Token (${tokenValue.toFixed(2)} USD) is more than Max.Risk Per Token(${config.maxRiskPerToken} USD)  Hence NOT Buying...`);

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
    
  