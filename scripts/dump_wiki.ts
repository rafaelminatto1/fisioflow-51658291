import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/server/db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql, { schema });
    const pages = await db.query.wikiPages.findMany({
        where: (p, { eq }) => eq(p.slug, 'testes-ortopedicos-joelho')
    });
    console.log(pages[0].content);
}
main().catch(console.error);
