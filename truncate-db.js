/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
// truncate-db.js
const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
console.log('Database URL found:', !!dbUrl);

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function truncateTables() {
    let client;
    try {
        client = await pool.connect();
        console.log('Connected to database. Truncating tables...');
        await client.query('TRUNCATE TABLE book_rating, books CASCADE');
        console.log('Tables truncated successfully');
    } catch (err) {
        console.error('Error truncating tables:', err);
    } finally {
        if (client) client.release();
        await pool.end();
        console.log('Done!');
    }
}

// Call the function
truncateTables();