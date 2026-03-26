import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/server/db/schema';
import { or, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Starting analysis...");
    
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not found in environment");
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql, { schema });

    console.log("\n--- EXERCISES MISSING MEDIA ---");
    const missingMediaExercises = await db.query.exercises.findMany({
        where: or(isNull(schema.exercises.imageUrl), isNull(schema.exercises.videoUrl)),
        columns: {
            id: true,
            name: true,
            imageUrl: true,
            videoUrl: true
        }
    });

    console.log(`Found ${missingMediaExercises.length} exercises missing image or video.`);
    missingMediaExercises.slice(0, 10).forEach(ex => {
        console.log(`- ${ex.name} (ID: ${ex.id}) [Img: ${ex.imageUrl ? 'OK' : 'MISSING'}, Vid: ${ex.videoUrl ? 'OK' : 'MISSING'}]`);
    });
    if (missingMediaExercises.length > 10) console.log("... and more");

    console.log("\n--- WIKI PAGES MISSING PDF ---");
    const allWikiPages = await db.query.wikiPages.findMany({
        columns: {
            id: true,
            title: true,
            content: true,
            slug: true
        }
    });

    const pagesMissingPdf = allWikiPages.filter(p => p.content && !p.content.toLowerCase().includes('.pdf'));
    console.log(`Found ${pagesMissingPdf.length} wiki pages potentially missing PDFs (no .pdf in content).`);
    pagesMissingPdf.slice(0, 10).forEach(p => {
        console.log(`- ${p.title} (Slug: ${p.slug})`);
    });
    if (pagesMissingPdf.length > 10) console.log("... and more");

    console.log("\nDone.");
}

main().catch(console.error);
