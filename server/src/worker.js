// worker.js
const { workerData, parentPort } = require('worker_threads');
const { processPayload } = require('./processer');
const util = require('./utils');

// Helper function to process webhook data
async function processWebhookData(whdata) {
  try {
    // Check if workerData has the necessary properties
    if (!whdata || !whdata.id || !whdata.data) {
      throw new Error('workerData is incomplete or malformed.');
    }

    const { id, data: webhookData } = whdata;
    util.printMsg(id, `START \n`);

    // Log and process each payload field
    let amount = webhookData.trade_mode === "buy" 
      ? webhookData.amount.toString() 
      : `${webhookData.amount}%`;

    util.printMsg(id, `Payload: Mode: ${webhookData.trade_mode}`);
    util.printMsg(id, `Payload: Amount: ${amount}`);
    util.printMsg(id, `Payload: Slippage: ${webhookData.slippage_bps}`);
    util.printMsg(id, `Payload: Pair: ${webhookData.pair_id}`);
    util.printMsg(id, `Payload: Dex: ${webhookData.dex}`);
    util.printMsg(id, `Payload: Test: ${webhookData.is_test}`);

    // Call async task
    await performAsyncTask(webhookData, id);

    // Send a success message back to the main thread
    parentPort.postMessage(` DONE `);
    
  } catch (error) {
    // Send error message back to main thread
    console.error(util.printMsg(whdata.id, `Error processing webhook data: ${error.message}`));
    parentPort.postMessage(`Error: ${error.message}`);
  }
}

// Async function to perform some task with webhook data
async function performAsyncTask(data, id) {
  try {
    return new Promise(async (resolve, reject) => {
      if (!data.trade_mode || !data.amount || !data.slippage_bps || !data.pair_id || !data.dex) {
        util.printMsg(id, 'Invalid Request: Missing required fields.');
        return reject(new Error("Missing or incorrect input fields."));
      }

      if (util.isConfigValid) {
        util.printMsg(id, 'Missing required environment variables.');
        return reject(new Error('Missing required environment variables.'));
      }

      let process_result = await processPayload(data, id);

      if (!process_result) {
        throw new Error("Failed to process webhook data.");
      }

      

      let task = data.is_test ? "TEST" : "REAL TIME";
      let success = process_result.result ? "SUCCESSFUL" : "FAILED";
     // util.printMsg(id, `Async ${task} Task - ${process_result.mode.toUpperCase()} ${process_result.symbol} ${success}`);
      
      resolve(process_result);
    });
  } catch (err) {
    console.error(util.printMsg(id, `Error in performAsyncTask: ${err.message}`));
    throw err;
  }
}

// Start processing data if workerData is provided
if (workerData) {
  processWebhookData(workerData);
} else {
  console.error('No workerData received.');
}
