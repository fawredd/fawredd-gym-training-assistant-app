const { createPool } = require('@vercel/postgres');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
} else if (fs.existsSync('.env')) {
    require('dotenv').config({ path: '.env' });
}

async function run() {
    console.log("Configuring connection for schema creation...");
    const pool = createPool({ connectionString: process.env.POSTGRES_URL });
    console.log("Connection successful. Creating fawredd_gym schema...");
    await pool.query('CREATE SCHEMA IF NOT EXISTS fawredd_gym;');
    console.log("Schema fawredd_gym created successfully.");
    await pool.end();
}

run().catch(err => {
    console.error("Error creating schema:", err);
    process.exit(1);
});
