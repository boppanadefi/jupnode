const solanaWeb3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const modal = require('./modal');
const { loadConfig,checkConfig}  = require('../../config/config');
const bs58 = require('bs58').default;

const {
  BlockhashWithExpiryBlockHeight,
  Connection,
  TransactionExpiredBlockheightExceededError,
  VersionedTransactionResponse,
} = require("@solana/web3.js");
const promiseRetry = require("promise-retry");
//const { wait } = require("./wait");


//const WebSocket = require('ws');
//const { util } = require('config');


// Create a connection to the Solana cluster

const buy = 'buy';
const sell = 'sell';
const config = loadConfig;
const isConfigValid = checkConfig();
const wait = (time) => 
  new Promise((resolve) => setTimeout(resolve, time));

const connection = new solanaWeb3.Connection(config.rpcUrl);


const printMsg = (id = "999", msg = "None") => {
  console.log(`${id} - ${msg}`);
};

const printJson = (id, str) => {
  console.log(`${id} - ${JSON.stringify(str, null, 2)}`);
};

const bigInt = (number) => { 
  return BigInt(Math.floor(Number(number)));
} 

function decodeU128(buffer, offset = 0) {
  const lower = buffer.readBigUInt64LE(offset);
  const upper = buffer.readBigUInt64LE(offset + 8);
  return (upper << 64n) | lower;
}

// Function to decode LiquidityStateV4
function decodeLiquidityStateV4(data) {


  // Define the structure based on LiquidityStateV4
  const layout = modal.getRaydiumLayout();

  // Decode the data using the defined layout
  const decodedData = layout.decode(data);
 

  // Decode u128 values from the blob fields
  decodedData.swap_base_in_amount = decodeU128(decodedData.swap_base_in_amount);
  decodedData.swap_quote_out_amount = decodeU128(decodedData.swap_quote_out_amount);
  decodedData.swap_quote_in_amount = decodeU128(decodedData.swap_quote_in_amount);
  decodedData.swap_base_out_amount = decodeU128(decodedData.swap_base_out_amount);

  // Convert Pubkey fields from Buffer to PublicKey string
  decodedData.base_vault = new solanaWeb3.PublicKey(decodedData.base_vault).toBase58();
  decodedData.quote_vault = new solanaWeb3.PublicKey(decodedData.quote_vault).toBase58();
  decodedData.base_mint = new solanaWeb3.PublicKey(decodedData.base_mint).toBase58();
  decodedData.quote_mint = new solanaWeb3.PublicKey(decodedData.quote_mint).toBase58();

  return decodedData;
}

async function getPool(id,pairId) {
  try {

    printMsg(id, "Getting Pool Info...");

    // Define the account ID (public key) you want to fetch details for
    const accountPublicKey = new solanaWeb3.PublicKey(pairId);

    // Fetch account info from Solana
    const accountInfo = await connection.getAccountInfo(accountPublicKey);


    if (accountInfo === null) {
      printMsg(id, 'Pool not found.');
      return null;
    } 
      // Decode the data using LiquidityStateV4 structure
      const dataBuffer = Buffer.from(accountInfo.data);
      const decodedData = decodeLiquidityStateV4(dataBuffer);

     
      let tokenMint, tokenVault, solVault,tokenDecimal
      
      if (decodedData.base_mint === config.solMint) {

        tokenMint = decodedData.quote_mint;
        tokenVault = decodedData.quote_vault;
        solVault = decodedData.base_vault;
        tokenDecimal = decodedData.quote_decimal;

      } else if (decodedData.quote_mint === config.solMint) { 
        tokenMint = decodedData.base_mint;
        tokenVault = decodedData.base_vault;
        solVault = decodedData.quote_vault;
        tokenDecimal = decodedData.base_decimal;
      }


      const poolInfo = {
        tokenMint,
        tokenVault,
        solVault,
        tokenDecimal,
        //liquidity: decodedData.swap_base_in_amount.toString(),
        //baseAmount: decodedData.swap_base_out_amount.toString(),
      }
      //printMsg(id, `POOL: ${JSON.stringify(poolInfo, null,2)}`);
    printMsg(id, `Pool: Token Mint:${poolInfo.tokenMint}` );
    printMsg(id, `Pool: Token Vault:${ poolInfo.tokenVault}`);
    printMsg(id, `Pool: Sol Vault:${ poolInfo.solVault}`,);
    printMsg(id, `Pool: Token Decimals:${ poolInfo.tokenDecimal}`,);
    

    return poolInfo;

    }
   catch (error) {
    console.error('Error fetching account details:', error);
  }
}

async function getPoolSolBalance(id, mint) { 
  try {
    // Define the account ID (public key) you want to fetch details for
    const accountPublicKey = new solanaWeb3.PublicKey(mint);
    let balance = 0;

    // Fetch account info from Solana
    // const accountBalance = await connection.getTokenAccountBalance(accountPublicKey);

    // if (accountBalance === null) {
    //   balance = 0;
    //   console.log("Account balance is null");
    // } else {
    //   balance = accountBalance.value.uiAmount;
    //   printMsg(id, `Pool Balance ${balance.toFixed(2)} SOL`);

    // }
    // Fetch account info from Solana
    const accountInfo = await connection.getAccountInfo(accountPublicKey);
    
    if (accountInfo === null || accountInfo.lamports <= 0) {
      balance = 0;
    } else {
      balance = accountInfo.lamports / solanaWeb3.LAMPORTS_PER_SOL;
      printMsg(id, `Balance in the Pool ${balance.toFixed(2)} SOL`);

    }

    return balance;
    
  } catch (e) {
    printMsg(id, `Error fetching token details: ${e}`);
  }
}




async function isTokenValid(id,mint,token) {
  try {

    // Define the mint address (public key) of the token
    const mintAddress = new solanaWeb3.PublicKey(mint);

    // Fetch token mint info
    const mintInfo = await splToken.getMint(connection, mintAddress);

  // Convert any BigInt values to strings before serializing
    const mintInfoWithStringifiedBigInts = {
      ...mintInfo,
      supply: mintInfo.supply.toString(),  // Convert BigInt to string
    };

    //printMsg(id, JSON.stringify(mintInfoWithStringifiedBigInts, null, 2));
    let validity = mintInfo.mintAuthority === null && mintInfo.freezeAuthority === null &&
      mintInfo.isInitialized &&
      mintInfo.supply > 0;
    
    printMsg(id, `Token ** ${token.toUpperCase()} ** is  VALID`);
    
    return validity;

  } catch (error) {
    console.error('Error fetching token info:', error);
  }
}

// Define an async function to fetch the SOL balance of a wallet
async function getWalletBalance(id,walletAddress) {
  
  try {
    printMsg(id, "Getting Wallet Balance...");
    // Convert the wallet address to a PublicKey object
    const publicKey = new solanaWeb3.PublicKey(walletAddress);

    // Fetch the balance in lamports (1 SOL = 1 billion lamports)
    const balanceInLamports = await connection.getBalance(publicKey);

    // Convert lamports to SOL
    const balanceInSol = balanceInLamports / solanaWeb3.LAMPORTS_PER_SOL;

    printMsg(id,`Available SOL in Your Wallet : ${balanceInSol} SOL`);
    return balanceInSol;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    throw error;
  }
}

async function getWalletTokenBalance(id,walletAddress, tokenMintAddress) {
  
  try {
    // Convert the wallet address and token mint address to PublicKey objects
    const publicKey = new solanaWeb3.PublicKey(walletAddress);
    const mintAddress = new solanaWeb3.PublicKey(tokenMintAddress);

    // Get the associated token account for the given token mint and wallet address
    const associatedTokenAccount = await splToken.getAssociatedTokenAddress(mintAddress, publicKey);

    let tokenBalance = 0;

    if (associatedTokenAccount) {
      // Fetch the token balance from the associated token account
      const tokenAccountInfo = await connection.getTokenAccountBalance(associatedTokenAccount);
      tokenBalance = tokenAccountInfo.value.uiAmount;
    }

    if (!tokenBalance || tokenBalance <= 0) { 
      printMsg(id,`ZERO  Tokens Available In your Wallet`);
      return 0;
    }

    printMsg(id, `${tokenBalance} of ${tokenMintAddress} Tokens Available In your Wallet`);
    return tokenBalance;

  } catch (error) {
    // console.error('Error fetching token balance:', error);
    // throw error;
    printMsg(id,`ZERO  Tokens Available In your Wallet`);
    return 0;
  }
}

async function fetchPrice(id,priceOfMint, priceInMint,config) {
    
    //if (priceOfMint.trim().length === 0)
        
    const url =`${config.priceApiUrl}/price?ids=${priceOfMint}&vsToken=${priceInMint}`
  //`https://price.jup.ag/v6/price?ids=${priceOfMint}&vsToken=${priceInMint}`;

  console.log(url);
   
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

      const priceData = await response.json();
      
      printMsg(id,JSON.stringify(priceData));

      if (!priceData|| priceData===undefined||!priceData.data) { 
        printMsg(id,`No price data found for ${priceOfMint}`);
            return 0.0;  // Return null if no price data found in the response. This might be a valid case where the price is not available.  For example, if the token is not listed on the price API.  In such cases, you might want to handle it differently.  For example, you might want to return a default price, or a message indicating that the price is not available.  Or you might want to log the error and continue with the rest of the program.  In this example, I'm returning null.  You can adjust this based on your specific requirements.  For example, you might want to throw an error instead of returning null.  You might want to return a default price instead of null.  You might want to log the error and continue with the rest of the program.  In this example, I'm returning null.  You can adjust this based on
      }
        // Assuming the response structure is as you provided
        const priceInfo = priceData.data[priceOfMint];
        const priceSymbol = priceInfo["vsTokenSymbol"];
        const mintSymbol = priceInfo["mintSymbol"];
        
        if (priceInfo) {
            printMsg(id,`Price of ${mintSymbol.toUpperCase()} is :${priceInfo.price} ${priceSymbol}`);
            return priceInfo;
        } else {
          printMsg(id, 'Price information not found in response.');
          return 0.0;
            //return null;
        }
    } catch (error) {
        printMsg(id,`Error in fetching the price :${error.message}`);
        return 0.0;
    }
}

async function getWallet(id,config) { 

  let decoded;
  try {
    // decoded = bs58.decode ? bs58.decode(config.privateKey) : bs58.default.decode(config.privateKey);
    
    //printJson(id, config);
            
    // Decode the private key to bytes
    const privateKeyBytes = bs58.decode(config.privateKey);

    // Generate a Keypair from the private key
    const keypair = solanaWeb3.Keypair.fromSecretKey(privateKeyBytes);

    // Get the public key
    const publicKey = keypair.publicKey.toString();

    printMsg(id, `Wallet: ${publicKey}`);
    return keypair;
  } catch (e) {

    printMsg(id, `Error processing Getting Wallet: ${e.message}`);
    if (config.debug) {
      console.error(e.stack); // Log the stack trace for debugging
    }
  }

}


function getSignature(transaction) {
  const signature =
    "signature" in transaction
      ? transaction.signature
      : transaction.signatures[0];

  if (!signature) {
    throw new Error(
      "Missing transaction signature, the transaction was not signed by the fee payer"
    );
  }
  return bs58.encode(signature);
}


const SEND_OPTIONS = {
  skipPreflight: true,
};

async function transactionSenderAndConfirmationWaiter({
  connection,
  serializedTransaction,
  blockhashWithExpiryBlockHeight,
}) {
  const txid = await connection.sendRawTransaction(
    serializedTransaction,
    SEND_OPTIONS
  );

  const controller = new AbortController();
  const abortSignal = controller.signal;

  const abortableResender = async () => {
    while (true) {
      await wait(2000);
      if (abortSignal.aborted) return;
      try {
        await connection.sendRawTransaction(
          serializedTransaction,
          SEND_OPTIONS
        );
      } catch (e) {
        console.warn(`Failed to resend transaction: ${e}`);
      }
    }
  };

  try {
    abortableResender();
    const lastValidBlockHeight =
      blockhashWithExpiryBlockHeight.lastValidBlockHeight - 150;

    // This might throw TransactionExpiredBlockheightExceededError
    await Promise.race([
      connection.confirmTransaction(
        {
          ...blockhashWithExpiryBlockHeight,
          lastValidBlockHeight,
          signature: txid,
          abortSignal,
        },
        "confirmed"
      ),
      new Promise(async (resolve) => {
        // In case websocket connection dies
        while (!abortSignal.aborted) {
          await wait(2000);
          const tx = await connection.getSignatureStatus(txid, {
            searchTransactionHistory: false,
          });
          if (tx?.value?.confirmationStatus === "confirmed") {
            resolve(tx);
          }
        }
      }),
    ]);
  } catch (e) {
    if (e instanceof TransactionExpiredBlockheightExceededError) {
      // If expired, getTransaction will return null
      return null;
    } else {
      throw e; // Unexpected error from web3.js
    }
  } finally {
    controller.abort();
  }

  // Retry fetching transaction if RPC isn't synced
  const response = await promiseRetry(
    async (retry) => {
      const response = await connection.getTransaction(txid, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!response) {
        retry(response);
      }
      return response;
    },
    {
      retries: 5,
      minTimeout: 1000,
    }
  );

  return response;
}




module.exports = {
  buy,
  sell,
  config,
  isConfigValid,
  connection,
  printMsg,
  printJson,
  bigInt,
  getPool,
  getPoolSolBalance,
  isTokenValid,
  getWalletBalance,
  getWalletTokenBalance,
  getWallet,
  getSignature,
  transactionSenderAndConfirmationWaiter
}