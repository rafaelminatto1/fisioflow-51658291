import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import ytSearch from "yt-search";
import { exercises } from "../src/server/db/schema/exercises";
import { isNull, or, eq } from "drizzle-orm";

dotenv.config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log("Fetching exercises missing media...");

  // Get exercises missing videoUrl OR imageUrl
  const missingMedia = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      imageUrl: exercises.imageUrl,
      videoUrl: exercises.videoUrl,
    })
    .from(exercises)
    .where(or(isNull(exercises.videoUrl), isNull(exercises.imageUrl)));

  console.log(`Found ${missingMedia.length} exercises to update.`);

  let updatedCount = 0;

  for (const ex of missingMedia) {
    console.log(`\nSearching YT for: ${ex.name}`);
    try {
      // Search YouTube for the exercise name + physiotherapy
      const r = await ytSearch(`${ex.name} physical therapy exercise`);
      const videos = r.videos.slice(0, 1);

      if (videos.length > 0) {
        const video = videos[0];
        console.log(`✅ Found: ${video.title} (${video.url})`);

        const newVideoUrl = ex.videoUrl || video.url;
        const newImageUrl = ex.imageUrl || video.image || video.thumbnail;

        await db
          .update(exercises)
          .set({
            videoUrl: newVideoUrl,
            imageUrl: newImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(exercises.id, ex.id));

        console.log(`Updated ID ${ex.id} -> video: ${newVideoUrl}, img: ${newImageUrl}`);
        updatedCount++;
      } else {
        console.log(`❌ No videos found for ${ex.name}`);
      }
    } catch (e) {
      console.error(`Error searching for ${ex.name}:`, e);
    }

    // Wait a tiny bit so we don't get rate limited
    await new Promise((res) => setTimeout(res, 500));
  }

  console.log(`\n🎉 Finished updating ${updatedCount} exercises!`);
}

main().catch(console.error);
