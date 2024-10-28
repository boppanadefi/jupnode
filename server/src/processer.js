//const {checkConfig} = require('../../config/config');
const util = require('./utils');
const buyOrder = require('./buyOrder.js');
const sellOrder = require('./sellOrder.js');
const solanaWeb3 = require('@solana/web3.js');
const swap = require('./swap.js');
const modal = require('./modal.js');

const config = util.config;

async function processPayload(data, id) {

    try {

        
        const pool = await util.getPool(id, data.pair_id);

        if (!pool) {
            util.printMsg(id, 'Error: Pool is undefined');
            return;
        }
    
        //console.log(`pool: ${JSON.stringify(pool,null,2)}`)
        const keypair = await util.getWallet(id,config);
        const wallet = keypair.publicKey.toString()
    
        
        let order;
        if (data.trade_mode === util.buy) {

           
            order = await buyOrder.processBuyOrder(id, pool, data,  wallet, config);
            if (!order || !order.isSuccessful) {
                return "Invalid Buy Order";
            }

            
            let swapData = modal.getSwapData(id, order, wallet, config.solMint, data.is_test);

            if (!swapData) {
                return "Invalid Buy Swap";
            }
            //console.log(JSON.stringify(swapData, null, 2));
            
            util.printMsg(id, `Proceeding for Buy Swap for ${swapData.outputMint}`);
            
           const buySwapResult = await swap.executeSwap(swapData, config);
            return order.isSuccessful;
                       
        }


        else if (data.trade_mode === util.sell) {
            
            const tokenBalance = await util.getWalletTokenBalance(id, wallet, pool.tokenMint);

            util.printMsg(id, `Processing SELL Order ....`);
            order = await sellOrder.processSellOrder(id, pool, data, tokenBalance, wallet, config);
            if (!order || !order.isSuccessful) {
                return "Invalid Sell Order";
            }
            let swapData = modal.getSwapData(id, order, wallet, config.solMint, data.is_test);

            if (!swapData) {
                return "Invalid  Sell Swap";
            }
            //console.log(JSON.stringify(swapData, null, 2));
            
            util.printMsg(id, `Proceeding for Sell Swap for ${swapData.inputMint}`);
          
            const sellSwapResult = await swap.executeSwap(swapData, config);
           
            
            return order.isSuccessful;
        

        } else { 
            util.printMsg(id, `Invalid Trade Mode`);
            return "Invalid Trade Mode";
        }

       

    } catch (e) {
        util.printMsg("ERROR", `Error processing payload: ${e.message}`);
        console.error(e.stack); // Log the stack trace for debugging
        return "error";
    }
}

module.exports = {
    processPayload
}