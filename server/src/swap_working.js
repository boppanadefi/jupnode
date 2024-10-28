// const {createJupiterApiClient} = require('@jup-ag/api');
// const { Wallet } = require('@project-serum/anchor');
// const { LAMPORTS_PER_SOL,Keypair,VersionedTransaction } = require('@solana/web3.js');
// const bs58 = require('bs58');
// //const { util } = require('config');
// const util = require('./utils');


// async function executeSwap(data,config) {
//     try {
//         const id = data.id;

//         util.printMsg(id,"Executing Swap....");
//         const jupiterQuoteApi = createJupiterApiClient(config.rpc_url);
//         const connection = util.connection;

//         let decoded;
//         try {
//             decoded = bs58.decode ? bs58.decode(config.privateKey) : bs58.default.decode(config.privateKey);
//         } catch (error) {
//             util.printMsg(id, `Failed to decode private key: ${error.message}`);
//             throw new SwapError("Private key decoding failed", id);
//         }

//         const wallet = new Wallet(Keypair.fromSecretKey(decoded));
//         //console.log("Wallet:", wallet.publicKey.toBase58());

//         let amount = 0;

//         if (data.mode === util.buy) {
//             amount = data.amount * LAMPORTS_PER_SOL; // 0.1 SOL
//         } else if (data.mode === util.sell) {
//             const toPow = Math.pow(10, data.decimals);
//             amount = Math.round(data.amount * toPow); // Smallest Amount
//         }


//         const quoteParms = {
//             inputMint: data.inputMint,
//             outputMint: data.outputMint, // $WIF
//             amount: Math.round(data.amount * LAMPORTS_PER_SOL),//100000000, // 0.1 SOL
//             autoSlippage: true,
//             autoSlippageCollisionUsdValue: 1_000,
//             maxAutoSlippageBps: 1000, // 10%
//             minimizeSlippage: true,
//             onlyDirectRoutes: false,
//             asLegacyTransaction: false,
//         };
  
//         const quote = await jupiterQuoteApi.quoteGet(quoteParms);
//         if (!quote) {
//             throw new Error("unable to quote");
//         }
//         //console.log(quote);

//         const swapObj = await jupiterQuoteApi.swapPost({
//             swapRequest: {
//                 quoteResponse: quote,
//                 userPublicKey: wallet.publicKey.toBase58(),
//                 dynamicComputeUnitLimit: true,
//                 prioritizationFeeLamports: "auto",
//             }
//         });

//         if (!swapObj) {
//             throw new Error("unable to swap");
//         }

//         //console.log(swapObj);

//         // Serialize the transaction
//         const swapTransactionBuf = Buffer.from(swapObj.swapTransaction, "base64");
//         let transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
//         // Sign the transaction
//         transaction.sign([wallet.payer]);
//         const signature = util.getSignature(transaction);

//         //console.log(signature);

//         // We first simulate whether the transaction would be successful
//         const simulatedTransactionResponse =
//             await connection.simulateTransaction(transaction, {
//                 replaceRecentBlockhash: true,
//                 commitment: "processed",
//             });
    
//         //console.log(simulatedTransactionResponse.value);
//         if (!simulatedTransactionResponse) {
//             throw new Error("Unable to simulate transaction");
//         }
//         if (simulatedTransactionResponse.value.err) {
//             throw new Error("Error in SimulationResponse");
//         }


      
    
//         if (config.debug || data.isTest) { 
//             util.printMsg(id,`Simulation ${data.mode.toUpperCase() } Successful, TEST/DEBUG mode Hence NO Transaction Sent` );
//             return signature;
//         }

       



//         const serializedTransaction = Buffer.from(transaction.serialize());
//         const blockhash = connection.getLatestBlockhash();
        
//         const transactionResponse = await util.transactionSenderAndConfirmationWaiter({
//             connection,
//             serializedTransaction,
//             blockhashWithExpiryBlockHeight: {
//                 blockhash,
//                 lastValidBlockHeight: swapObj.lastValidBlockHeight,
//             },
//         });

//         // If we are not getting a response back, the transaction has not confirmed.
//         if (!transactionResponse) {
//             console.error("Transaction not confirmed");
//             return "Transaction not confirmed";
//         }

//         if (transactionResponse.meta?.err) {
//             console.error(transactionResponse.meta?.err);
//         }

//         util.printMsg(id,`Signature: https://solscan.io/tx/${signature}`);
    
    
//         return signature;


        
//     } catch (error) { 
//         console.error('Error executing swap:', error);
//         return;

//     }
// }

// module.exports = { executeSwap };
