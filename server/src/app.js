// app.js
const express = require('express');
const { Worker } = require('worker_threads');
const crypto = require('crypto');
const path = require('path');
const util = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON payloads

// Endpoint to receive webhook events
app.post('/webhook', (req, res) => {
  // Generate a unique ID using crypto, with a fallback if necessary
  const workerId = crypto.randomUUID() || crypto.randomBytes(16).toString('hex');
  console.log('Received webhook request with body:', req.body); // Log the entire request body
  

  // Validate that workerId was generated correctly
  if (!workerId) {
    console.error('Failed to generate a valid workerId.');
    return res.status(500).send('Internal Server Error');
  }

  console.log('Current __dirname:', __dirname); // Log the directory where app.js is located

  console.log(`Generated workerId: ${workerId}`);

  const workerPath = path.join(__dirname, 'worker.js');

  //console.log(workerPath);
  
  try {
    // Create a new worker thread, passing the request body and workerId
    const worker = new Worker(workerPath, {
      workerData: { data: req.body, id: workerId }
    });

    // Listen for messages from the worker
    worker.on('message', (message) => {
      console.log(`${workerId} : Worker Completed with message: ${message}`);
    });

    // Handle worker errors
    worker.on('error', (error) => {
      console.error(`Worker ${workerId} encountered an error: ${error.message}`);
    });

    // Listen for worker exit event
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker ${workerId} stopped with exit code ${code}`);
      } else {
        util.printMsg(workerId, 'EXITED\n');
      }
    });

    // Respond immediately to the webhook request
    res.status(200).send(`Worker ${workerId} - Webhook received and is being processed.`);
    
  } catch (error) {
    // Catch any errors during worker creation and respond with 500
    console.error(`Failed to create worker for workerId ${workerId}: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
