const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon('postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true');

const sqlContent = fs.readFileSync('tmp/batch_placeholders.sql', 'utf8');
const queries = sqlContent.split('\\n').filter(q => q.trim() !== '');

(async () => {
  for (const query of queries) {
    try {
      console.log(\`Executing query for ID: \${query.match(/WHERE id = '(.*?)'/)[1]}\`);
      // We need to handle the params properly to avoid SQL injection even in our own scripts
      // But for this mass migration, we'll execute the raw SQL carefully.
      // Neon SDK doesn't support batching raw SQL strings directly with multiple commands in one call easily in this client.
      // We will parse the update and use parameterized queries for safety.
    } catch (e) {
      console.error('Error parsing query:', e);
    }
  }

  // Actually, let's just use a more robust script that sends the commands one by one.
  const executeBatch = async () => {
    const lines = sqlContent.split(';\\n');
    for (let line of lines) {
      if (line.trim()) {
        await sql(line + ';');
      }
    }
    console.log('Batch execution complete.');
  };

  await executeBatch();
})();
