const { Pool } = require('pg');
require('dotenv').config({ override: false });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
