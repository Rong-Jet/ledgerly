require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const app = express();
app.use(express.json());
app.use(cors());

// Plaid client configuration
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

// We'll store the access token in memory for MVP.
// For production, you'd store it in a database.
let ACCESS_TOKEN = null;

/**
 * 1) Create Link Token
 */
app.post("/api/create_link_token", async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: {
        // Typically you'd use a stable user ID here.
        // For demonstration, we use a dummy value:
        client_user_id: "user-id-123",
      },
      client_name: "Plaid Quickstart",
      products: process.env.PLAID_PRODUCTS.split(","),
      country_codes: process.env.PLAID_COUNTRY_CODES.split(","),
      language: "en",
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).send("Something went wrong creating link token");
  }
});

/**
 * 2) Exchange Public Token for Access Token
 */
app.post("/api/exchange_public_token", async (req, res) => {
  const { public_token } = req.body;
  try {
    const tokenResponse = await client.itemPublicTokenExchange({
      public_token,
    });
    ACCESS_TOKEN = tokenResponse.data.access_token;

    // Return success or fetch transactions here
    res.json({ success: true });
  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).send("Could not exchange public token");
  }
});

/**
 * 3) Retrieve Transactions
 */
app.get("/api/transactions", async (req, res) => {
    if (!ACCESS_TOKEN) {
      return res.status(400).json({ error: "No access token. Link an account first." });
    }
  
    try {
      const response = await client.transactionsSync({
        access_token: ACCESS_TOKEN,
        cursor: null, // For initial sync, use null. Store cursor for incremental updates.
      });
  
      const transactions = response.data.added;
      res.json(transactions);
    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).send("Error retrieving transactions");
    }
  });  

// Serve static files from the "public" directory
app.use(express.static("public"));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
