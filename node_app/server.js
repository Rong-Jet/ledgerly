require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const { Pool } = require('pg');

// PostgreSQL connection pool configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ledgerly',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database');
    release();
  }
});

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
    const accessToken = tokenResponse.data.access_token;

    // Store the access token in Postgres, associated with a user
    // (Here we assume userId = 1 for MVP.)
    const userId = 1;
    const institutionName = "Plaid Sandbox Bank"; // optional
    const dbRes = await pool.query(
      `INSERT INTO items (user_id, access_token, institution_name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, accessToken, institutionName]
    );

    // We can store the new itemId in session or return it to the frontend
    const itemId = dbRes.rows[0].id;
    res.json({ success: true, itemId });
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).send("Could not exchange public token");
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
    // 1) Identify the user/item. For MVP, let's assume userId = 1
    const userId = 1;

    // 2) Fetch the item row from DB to get the access_token
    //    (In a more robust system, you'd handle multiple items or user authentication.)
    const { rows: itemRows } = await pool.query(
      "SELECT id, access_token FROM items WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    if (itemRows.length === 0) {
      return res.status(400).json({ error: "No item found for user." });
    }
    const { id: itemId, access_token } = itemRows[0];
  
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

    for (const tx of transactions) {
      // tx has fields like "transaction_id", "name", "amount", "date", "category" (array).
      // We'll just store a single string for "category".
      const categoryStr = (tx.category || []).join(", ");

      await pool.query(
        `INSERT INTO transactions
           (item_id, transaction_id, name, amount, date, category)
         VALUES
           ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (transaction_id) DO NOTHING`, 
        [
          itemId,
          tx.transaction_id,
          tx.name,
          tx.amount,
          tx.date,
          categoryStr
        ]
      );
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
