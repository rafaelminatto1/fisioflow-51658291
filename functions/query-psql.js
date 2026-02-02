const { Client } = require('pg');

const client = new Client({
  host: '34.151.232.43',
  port: 5432,
  database: 'fisioflow',
  user: 'fisioflow',
  password: 'F1s10Fl0w2024',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    const result = await client.query('SELECT * FROM profiles WHERE user_id = $1', ['sj9b11xOjPT8Q34pPHBMUIPzvQQ2']);
    if (result.rows.length > 0) {
      console.log('User found in PostgreSQL:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('User NOT found in PostgreSQL');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
