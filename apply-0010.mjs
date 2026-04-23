import pg from 'pg';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';

dotenv.config();
if (!process.env.DATABASE_URL && existsSync('.env.production')) {
    dotenv.config({ path: '.env.production' });
}

async function run() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Conectado ao Neon...');
        
        const sql = readFileSync('drizzle/0010_cheerful_captain_america.sql', 'utf8');
        const commands = sql.split('--> statement-breakpoint');
        
        for (let cmd of commands) {
            const trimmed = cmd.trim();
            if (!trimmed) continue;
            console.log('Executando:', trimmed.substring(0, 50) + '...');
            try {
                await client.query(trimmed);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.warn('⚠️  Ignorado (já existe):', err.message);
                } else {
                    throw err;
                }
            }
        }
        
        console.log('✅ Migração 0010 aplicada com sucesso!');
    } catch (err) {
        console.error('❌ Erro na migração:', err.message);
    } finally {
        await client.end();
    }
}

run();
