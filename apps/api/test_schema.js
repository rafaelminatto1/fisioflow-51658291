import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
    throw new Error('Define DATABASE_URL or NEON_DATABASE_URL before running this script.');
}

const sql = neon(databaseUrl);

async function check() {
    try {
        const res = await sql`
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_name = 'session' OR table_name = 'user';
        `;
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
