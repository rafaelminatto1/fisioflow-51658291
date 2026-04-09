import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sqlContent = fs.readFileSync('drizzle/0002_short_taskmaster.sql', 'utf8');
        const statements = sqlContent.split('--> statement-breakpoint');

        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (let stmt of statements) {
            stmt = stmt.trim();
            if (!stmt) continue;

            try {
                await client.query(stmt);
                success++;
            } catch (err) {
                const msg = err.message.toLowerCase();
                if (msg.includes("already exists") || msg.includes("already a member")) {
                    console.log(`Skipping (exists): ${stmt.substring(0, 50)}...`);
                    skipped++;
                } else {
                    console.error(`Error in: ${stmt.substring(0, 100)}...`);
                    console.error(err.message);
                    failed++;
                }
            }
        }

        console.log("\n--- Migration Summary ---");
        console.log(`Success: ${success}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Failed: ${failed}`);

    } catch (err) {
        console.error("Database connection error:", err);
    } finally {
        await client.end();
    }
}

run();
