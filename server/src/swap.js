const { createJupiterApiClient } = require('@jup-ag/api');
const { Wallet } = require('@project-serum/anchor');
const { LAMPORTS_PER_SOL, Keypair, VersionedTransaction } = require('@solana/web3.js');
const bs58 = require('bs58');
const util = require('./utils');

async function retryOperation(operation, retries = 3, delay = 1000, onRetry) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt < retries) {
                console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                if (onRetry) onRetry(error, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw new Error(`Operation failed after ${retries} attempts: ${error.message}`);
            }
        }
    }
}

function decodePrivateKey(privateKey) {
    try {
        return( bs58.decode ? bs58.decode(privateKey) : bs58.default.decode(privateKey));
    } catch (error) {
        throw new Error("Private key decoding failed");
    }
}

async function executeSwap(data, config) {
    const id = data.id;
    util.printMsg(id, "Executing Swap....");

    try {
        const jupiterQuoteApi = createJupiterApiClient(config.rpc_url);
        const connection = util.connection;
        const decodedKey = decodePrivateKey(config.privateKey);
        const wallet = new Wallet(Keypair.fromSecretKey(decodedKey));

        const amount = data.mode === util.buy
            ? data.amount * LAMPORTS_PER_SOL
            : Math.round(data.amount * Math.pow(10, data.decimals));

        const quoteParms = {
            inputMint: data.inputMint,
            outputMint: data.outputMint,
            amount,
            autoSlippage: true,
            autoSlippageCollisionUsdValue: 1000,
            maxAutoSlippageBps: 1000,
            minimizeSlippage: true,
            onlyDirectRoutes: false,
            asLegacyTransaction: false,
        };

        const quote = await jupiterQuoteApi.quoteGet(quoteParms);
        if (!quote) throw new Error("Unable to quote");

        const swapObj = await jupiterQuoteApi.swapPost({
            swapRequest: {
                quoteResponse: quote,
                userPublicKey: wallet.publicKey.toBase58(),
                dynamicComputeUnitLimit: true,
                asLegacyTransaction:false,
                prioritizationFeeLamports: "auto" ,
            }
        });
        if (!swapObj) throw new Error("Unable to swap");

        const swapTransactionBuf = Buffer.from(swapObj.swapTransaction, "base64");
        let transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        transaction.sign([wallet.payer]);
        const signature = util.getSignature(transaction);

        await retryOperation(
            async () => {
                const simulatedTransactionResponse = await connection.simulateTransaction(transaction, {
                    replaceRecentBlockhash: true,
                    commitment: "processed",
                });
                if (!simulatedTransactionResponse || simulatedTransactionResponse.value.err) {
                    throw new Error("Error in SimulationResponse");
                }
            },
            3, // retries
            1000, // delay
            (error, attempt) => util.printMsg(id, `Simulation attempt ${attempt} failed: ${error.message}`)
        );

        if (config.debug || data.isTest) {
            util.printMsg(id, `Simulation ${data.mode.toUpperCase()} Successful, TEST/DEBUG mode. No Transaction Sent`);
            return signature;
        }

        const serializedTransaction = Buffer.from(transaction.serialize());
        //const blockhash = await connection.getLatestBlockhash();

        await retryOperation(
            async () => {
                const transactionResponse = await util.transactionSenderAndConfirmationWaiter({
                    connection,
                    serializedTransaction,
                    blockhashWithExpiryBlockHeight: {
                        blockhash : await connection.getLatestBlockhash(),
                        lastValidBlockHeight: swapObj.lastValidBlockHeight,
                    },
                });
                if (!transactionResponse || transactionResponse.meta?.err) {
                    throw new Error("Transaction failed or not confirmed");
                }
            },
            3,
            1000,
            (error, attempt) => util.printMsg(id, `Transaction attempt ${attempt} failed: ${error.message}`)
        );

        util.printMsg(id, `Signature: https://solscan.io/tx/${signature}`);
        return signature;

    } catch (error) {
        console.error('Error executing swap:', error);
    }
}

module.exports = { executeSwap };
