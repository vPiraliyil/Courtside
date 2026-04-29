const { Pool } = require('pg');
require('dotenv').config({ override: false });

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — pg pool cannot be created');
}

const parsed = new URL(DATABASE_URL);
console.log(`[db] connecting to ${parsed.host}${parsed.pathname}`);

const pool = new Pool({ connectionString: DATABASE_URL });

module.exports = pool;
