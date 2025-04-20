-- 1) The "users" table (if you have user logins, etc.)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) The "items" table stores the Plaid access token & related info
-- An "item" in Plaid corresponds to a single financial institution connection
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  access_token TEXT NOT NULL,
  institution_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3) The "transactions" table stores transaction data from Plaid
-- This is a simplified model (real data from Plaid can have more fields)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id),
  transaction_id TEXT,        -- from Plaid (unique identifier)
  name TEXT,                  -- e.g., "Starbucks"
  amount NUMERIC(12,2),       -- transaction amount
  date DATE,                  -- transaction date
  category TEXT,              -- simplified single category string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
