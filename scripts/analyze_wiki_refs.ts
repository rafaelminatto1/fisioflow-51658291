import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/server/db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Fetching Wiki content for real articles...");
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql, { schema });

    const allWikiPages = await db.query.wikiPages.findMany({
        columns: {
            title: true,
            content: true,
            slug: true
        }
    });

    const realPages = allWikiPages.filter(p => p.content && !p.content.toLowerCase().includes('.pdf') && !p.title.includes('Wiki Teste'));
    
    for (const page of realPages) {
        console.log(`\n================= ${page.title} =================`);
        console.log("Length:", page.content!.length);
        console.log("Content snippet:", page.content!.substring(0, 500));
        
        // Let's also try to find references mentioned in the content
        const lines = page.content!.split('\n');
        const refs = lines.filter(l => l.toLowerCase().includes('doi') || l.toLowerCase().includes('et al') || l.toLowerCase().includes('journal'));
        if (refs.length > 0) {
            console.log("\nFound possible references:");
            refs.forEach(r => console.log(r));
        } else {
            console.log("No obvious references found in text.");
        }
    }
}

main().catch(console.error);
