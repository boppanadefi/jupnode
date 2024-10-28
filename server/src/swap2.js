// const { 
//     Connection, Keypair, PublicKey, TransactionInstruction, 
//     TransactionMessage, VersionedTransaction, AddressLookupTableAccount,
//     ComputeBudgetProgram, LAMPORTS_PER_SOL 
// } = require('@solana/web3.js');
// const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
// const bs58 = require('bs58');
// const { fetch } = require('cross-fetch');
// const { Wallet } = require('@project-serum/anchor');
// const config = require('../../config/config');
// const util = require('./utils');

// class SwapError extends Error {
//     constructor(message, id) {
//         super(message);
//         this.name = "SwapError";
//         this.id = id;
//     }
// }

// async function executeSwap(data, config) {
//     try {

//          let id = data.id;
//         //util.printJson(id, data);
       
//         util.printMsg(id, `Start Executing Swap`);
//         const connection = new Connection(config.rpcUrl);

//         let decoded;
//         try {
//             decoded = bs58.decode ? bs58.decode(config.privateKey) : bs58.default.decode(config.privateKey);            
//         } catch (error) {
//             util.printMsg(id, `Failed to decode private key: ${error.message}`);
//             throw new SwapError("Private key decoding failed", id);
//         }

//         const wallet = new Wallet(Keypair.fromSecretKey(decoded));

//         util.printMsg(id, `Fetching Quote for Trade Amount ${data.amount}`);
//         let amount = data.mode === util.buy ? data.amount * LAMPORTS_PER_SOL : util.bigInt(data.amount * Math.pow(10, data.decimals));
        
//         const quoteResponse = await fetch(`${config.quoteApiUrl}/quote?inputMint=${data.inputMint}&outputMint=${data.outputMint}&amount=${amount}&slippageBps=${data.slippage}`).then(res => res.json());

//         let instructions = await fetchSwapInstructions(id, quoteResponse, wallet, config);
//         validateInstructionsNotEmpty(instructions, id);

//         const { tokenLedgerInstruction, computeBudgetInstructions, setupInstructions, swapInstruction: swapInstructionPayload, cleanupInstruction, addressLookupTableAddresses } = instructions;
        
//         const addressLookupTableAccounts = await getAddressLookupTableAccounts(id, addressLookupTableAddresses, connection);
//         const transactionInstructions = [];

//         if (addressLookupTableAccounts.length > 0) {
//             addSingleInstruction(transactionInstructions, swapInstructionPayload, 'Swap');
//             addInstructions(transactionInstructions, computeBudgetInstructions, 'Compute Budget');

//         } else {
//             // Add unique instructions
//             addInstructions(transactionInstructions, setupInstructions, 'Setup');
//             addSingleInstruction(transactionInstructions, swapInstructionPayload, 'Swap');
//             addSingleInstruction(transactionInstructions, cleanupInstruction, 'Cleanup');
//             addSingleInstruction(transactionInstructions, tokenLedgerInstruction, 'Token Ledger');
//             addInstructions(transactionInstructions, computeBudgetInstructions, 'Compute Budget');
//         }

//         if (config.priorityFeeFlag === data.mode || config.priorityFeeFlag === 'both') {
//             let fee = await getRecentPrioritizationFees(connection, data.inputMint);
//             let priorityFeeLamports = util.bigInt(fee * config.maxPriorityFeeFactor / 100);

//             if (priorityFeeLamports <= 0) priorityFeeLamports = 1000;

//             util.printMsg(id, `Priority Fee Applied :${priorityFeeLamports}`);
         
//             transactionInstructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeLamports }));
//         }

//         util.printMsg(id, `Fetching Hash, Decoding Transactions`);
//         const blockhash = (await connection.getLatestBlockhash()).blockhash;

//         const messageV0 = new TransactionMessage({
//             payerKey: wallet.publicKey,
//             recentBlockhash: blockhash,
//             instructions: transactionInstructions,
//         }).compileToV0Message(addressLookupTableAccounts);

        

//         const transaction = new VersionedTransaction(messageV0);
//         transaction.sign([wallet.payer]);

      
//         //console.log(JSON.stringify(transaction,null,2));

//         util.printMsg(id,`Proceeding ${data.mode} swap transaction`);
//         const result = await executeSwapWithRetries(id, data, connection, transaction, blockhash, config);
//         return result;

//     } catch (error) {
//         util.printMsg(data.id, `Error in executeSwap: ${error.message}`);
//         return error.message;
//     }
// }

// function addInstructions(transactionInstructions, instructions, label) {
//     instructions.forEach(instruction => {
//         const deserialized = deserializeInstruction(instruction);
//         if (deserialized) {
//             transactionInstructions.push(deserialized);
//         } else {
//             console.error(`Failed to deserialize ${label} instruction:`, instruction);
//         }
//     });
// }

// function addSingleInstruction(transactionInstructions, instruction, label) {
//     if (instruction) {
//         const deserialized = deserializeInstruction(instruction);
//         if (deserialized) {
//             transactionInstructions.push(deserialized);
//         } else {
//             console.error(`Failed to deserialize ${label} instruction`);
//         }
//     }
// }

// async function fetchSwapInstructions(id, quoteResponse, wallet, config) {
//     try {
//         const response = await fetch(`${config.quoteApiUrl}/swap-instructions`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ quoteResponse, userPublicKey: wallet.payer.publicKey.toBase58() }),
//         });
//         const instructions = await response.json();
//         if (instructions.error) throw new SwapError("Failed to get swap instructions: " + instructions.error, id);
//         return instructions;
//     } catch (error) {
//         util.printMsg(id, `Error fetching swap instructions: ${error.message}`);
//         throw new SwapError("Error in fetchSwapInstructions: " + error.message, id);
//     }
// }

// function deserializeInstruction(instruction) {
//     try {
//         return new TransactionInstruction({
//             programId: new PublicKey(instruction.programId),
//             keys: instruction.accounts.map(key => ({ pubkey: new PublicKey(key.pubkey), isSigner: key.isSigner, isWritable: key.isWritable })),
//             data: Buffer.from(instruction.data, "base64"),
//         });
//     } catch (error) {
//         console.error(`Error deserializing instruction: ${error.message}`);
//         return null;
//     }
// }

// async function getAddressLookupTableAccounts(id, keys, connection) {
//     const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(keys.map(key => new PublicKey(key)));
//     return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
//         if (accountInfo) {
//             acc.push(new AddressLookupTableAccount({
//                 key: new PublicKey(keys[index]),
//                 state: AddressLookupTableAccount.deserialize(accountInfo.data),
//             }));
//         }
//         return acc;
//     }, []);
// }

// function validateInstructionsNotEmpty(instructions, id) {
//     if (!instructions.setupInstructions?.length || !instructions.swapInstruction?.data || !instructions.cleanupInstruction?.data) {
//         throw new SwapError("One or more instructions are missing or incomplete.", id);
//     }
// }

// async function executeSwapWithRetries(id, data, connection, transaction, blockhash, config) {
//     let attempts = 0;
//     const maxAttempts = config.transactionRetries;

//     while (attempts < maxAttempts) {
//         try {
//             util.printMsg(id, `Attempt : ${attempts} swap transaction`);
            
//             if (data.isTest || config.debug) {
//                 util.printMsg(id, "TEST/DEBUG mode : No Transaction Sent");
//                 return "TEST/DEBUG";
//             }
//             const signature = await connection.sendTransaction(transaction);
//             const confirmation = await connection.confirmTransaction({ signature, blockhash }, 'confirmed');
//             if (confirmation) {
//                 return `https://solscan.io/tx/${signature}`;
//             }
//         } catch (error) {
//             attempts += 1;
//             if (attempts >= maxAttempts) throw new SwapError("Transaction failed after maximum retries", id);
//             await new Promise(resolve => setTimeout(resolve, config.transactionDelay));
//         }
//     }
// }

// async function getRecentPrioritizationFees(connection, inputMint) {
//     try {
//         const body = { jsonrpc: "2.0", id: 1, method: "getRecentPrioritizationFees", params: [[inputMint]] };
//         const response = await fetch(connection.rpcEndpoint, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
//         const jsonResponse = await response.json();
//         const fees = jsonResponse.result?.map(fee => fee.prioritizationFee).filter(fee => fee > 0).sort((a, b) => a - b);
//         return fees && fees.length ? fees[Math.floor(fees.length / 2)] : 0;
//     } catch (error) {
//         console.error(`Error fetching prioritization fees: ${error.message}`);
//         return 0;
//     }
// }

// module.exports = { executeSwap };
