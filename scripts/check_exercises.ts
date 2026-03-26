import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';
import { exercises } from '../src/server/db/schema/exercises';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
    const all = await db.select().from(exercises);
    const missingVideo = all.filter(ex => !ex.videoUrl);
    const missingImage = all.filter(ex => !ex.imageUrl);
    const missingBoth = all.filter(ex => !ex.videoUrl && !ex.imageUrl);

    console.log(`Total exercises: ${all.length}`);
    console.log(`Missing video: ${missingVideo.length}`);
    console.log(`Missing image: ${missingImage.length}`);
    console.log(`Missing both: ${missingBoth.length}`);
    
    if (missingBoth.length > 0) {
        console.log("\nSome exercises missing BOTH:");
        missingBoth.slice(0, 10).forEach(ex => console.log(`- ${ex.name} (ID: ${ex.id})`));
    }
}

main().catch(console.error);
