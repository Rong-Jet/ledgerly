require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const app = express();
app.use(express.json());
app.use(cors());

// Plaid configuration
const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const client = new PlaidApi(config);

// In-memory access token for simplicity
let ACCESS_TOKEN = null;

/**
 * 1. Create Link Token
 */
app.post("/api/create_link_token", async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: {
        client_user_id: "user-id-123",
      },
      client_name: "Plaid Quickstart",
      products: process.env.PLAID_PRODUCTS.split(","),
      country_codes: process.env.PLAID_COUNTRY_CODES.split(","),
      language: "en",
    });
    res.json(response.data); // { link_token: "...", ... }
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).send("Something went wrong creating link token.");
  }
});

/**
 * 2. Exchange Public Token for Access Token
 */
app.post("/api/exchange_public_token", async (req, res) => {
  const { public_token } = req.body;
  try {
    const tokenResponse = await client.itemPublicTokenExchange({ public_token });
    ACCESS_TOKEN = tokenResponse.data.access_token;
    res.json({ success: true });
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).send("Could not exchange public token.");
  }
});

/**
 * 3. Retrieve and Process Transactions
 */
app.get("/api/transactions", async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.status(400).send("No access token. Link an account first.");
  }

  // Step 3a: Retrieve transactions from Plaid
  try {
    const response = await client.transactionsSync({
      access_token: ACCESS_TOKEN,
      cursor: null, // For initial sync, use null. Store cursor for incremental updates.
    });

    // Log the entire response for debugging
    // console.log("Response from Plaid:", response);

    const transactions = response.data.added; // raw transactions
    // console.log("Transactions from Plaid:", transactions); // log for debugging

    if (!transactions || transactions.length === 0) {
      return res.status(500).send("No transactions received");
    }

    // Step 3b: Send transactions to Python service for processing
    // Replace with your Python server URL/port
    const pythonServerUrl = "http://localhost:5000/process_transactions";

    const pythonResponse = await axios.post(pythonServerUrl, {
      transactions: transactions,
    });
    // The Python service should return some processed result
    const processedData = pythonResponse.data;

    // Step 3c: Return processed data to frontend
    res.json(processedData);
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).send("Error retrieving or processing transactions.");
  }
});

// Serve static HTML from public/
app.use(express.static("../public"));

// Start the Node server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Node server listening on http://localhost:${PORT}`);
});
