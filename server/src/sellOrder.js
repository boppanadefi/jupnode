//const { loadConfig } = require('../../config/config');
const util = require('./utils');
const modal = require('./modal');
async function processSellOrder(id, pool, data, tokenBalance, wallet, config) {
    let defaultOrder = modal.defaultOrder();
    try {

       
        if (tokenBalance <= 0) { 
            util.printMsg(id, `Insufficient Token balance.`);
            return defaultOrder;
        }

        let tokenForSale = tokenBalance * data.amount / 100;
       
        
        
        let order = modal.defaultOrder();
        order.mode = util.sell;
        order.mint = pool.tokenMint;
        order.orderAmount = tokenForSale;
        order.orderSlippage = data.slippage_bps;
        order.decimals = pool.tokenDecimal;
        order.isSuccessful = true;


        //console.log("Sell Order = " + JSON.stringify(order,null,2));
        util.printMsg(id, `Placing Sell Order for ${order.mint} for ${tokenForSale} Tokens  .....`);
        return order;



    } catch (error) { 

        console.error(`Error processing sell order: ${error}`);
        return defaultOrder;

    }
}

// async function processSellOrder(id, token, amount, slippage,tokenBalance,priceInfo, decimals) {
//     try {
//         const config = util.config;
//         const tokenPow = Math.pow(10, decimals);
//         let smallestAmount = tokenBalance * tokenPow ;

//         let orderAmount = Math.floor((smallestAmount * amount / 100) *(1 - slippage/10000));
//         //let orderAmount = Math.floor((tokenBalance * amount / 100) *(1 - slippage/10000));

//         let price,priceSymbol,mintSymbol,orderAmountPrice
//         if (priceInfo && priceInfo.price > 0) {
//             price = priceInfo.price;
//             priceSymbol = priceInfo["vsTokenSymbol"];
//             mintSymbol = priceInfo["mintSymbol"];
//             orderPrice = price * tokenBalance * amount / 100;

//             if (orderPrice < config.minOrderPrice) {
//                 util.printMsg(id, `Total Sell Order : ${orderPrice} ${priceSymbol} , Required Min.Order ${config.minOrderPrice} ${priceSymbol} Hence NOT Selling ...`);
//                 return { mode: util.sell, mint: token, orderAmount: 0.0, orderSlippage:0 };
        
//             }
    
//             util.printMsg(id, `Number of [${token}} Tokens to be Sold [${amount}%]: ${Math.floor(orderAmount / tokenPow)}`);
//             return { mode: util.sell, mint: token, orderAmount: orderAmount, orderSlippage: slippage };
//         }

//     } catch (e) {

//         util.printMsg(id, `Error processing Sell order: ${e.message}`);
//         if (config.debug) {
//             console.error(e.stack);
//         }// Log the stack trace for debugging
//         return { mode: util.sell, mint: token, orderAmount: 0.0, orderSlippage: 0.0 };

//     }
// }

module.exports = {
    processSellOrder
}