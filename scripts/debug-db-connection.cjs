const { Pool } = require('pg');

const config = {
    user: process.env.DB_USER || 'fisioflow',
    password: process.env.DB_PASS || 'fisioflow2024',
    database: process.env.DB_NAME || 'fisioflow',
    port: parseInt(process.env.DB_PORT || '5432'),
    host: process.env.DB_HOST || '127.0.0.1',
    ssl: false // Disable SSL for local proxy connection usually, or keep it if required?
};

console.log('Debug Config:', config);

async function testConnection() {
    const pool = new Pool(config);
    try {
        console.log('Attempting connection...');
        await pool.query('SELECT 1');
        console.log('✅ Connection successful!');
    } catch (err) {
        console.error('❌ Connection failed:', err);
    } finally {
        await pool.end();
    }
}

testConnection();
