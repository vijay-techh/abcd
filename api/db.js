const { Pool } = require("pg");

let pool;

if (!global._pgPool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  global._pgPool = pool;
} else {
  pool = global._pgPool;
}

module.exports = pool;
