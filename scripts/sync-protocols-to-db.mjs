import pkg from 'pg';
const { Client } = pkg;
import { protocolDictionary } from '../src/data/protocolDictionary.ts';

const client = new Client({
  connectionString: "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

async function syncProtocols() {
  await client.connect();
  console.log('Connected to Neon DB');

  try {
    for (const entry of protocolDictionary) {
      console.log(`Syncing protocol: ${entry.pt} (${entry.id})...`);
      
      // Flexible match using ILIKE
      const res = await client.query(
        'UPDATE exercise_protocols SET aliases_pt = $1, aliases_en = $2, dictionary_id = $3 WHERE name ILIKE $4',
        [entry.aliases_pt, entry.aliases_en, entry.id, `%${entry.pt}%`]
      );

      if (res.rowCount > 0) {
        console.log(`✅ Updated ${res.rowCount} record(s) for "${entry.pt}"`);
      } else {
        console.log(`⚠️ Protocol "${entry.pt}" not found in DB.`);
      }
    }

    console.log('Sync complete.');
  } catch (err) {
    console.error('Error syncing protocols:', err);
  } finally {
    await client.end();
  }
}

syncProtocols();
