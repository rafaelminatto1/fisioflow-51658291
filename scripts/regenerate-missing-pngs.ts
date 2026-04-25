import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises } from "../src/server/db/schema/exercises.ts";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sharp from "sharp";

dotenv.config();

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "fisioflow-media";
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || "moocafisio.com.br";

async function processExercise(exerciseId: string, localPath: string) {
  if (!fs.existsSync(localPath)) {
    console.warn(`Local file not found for ${exerciseId}: ${localPath}`);
    return;
  }

  // 1. Load exercise info
  const [exercise] = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
  if (!exercise) {
    console.error(`Exercise not found: ${exerciseId}`);
    return;
  }

  const slug = exercise.slug || exercise.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const fileName = `exercises/${slug}.webp`;

  console.log(`Processing ${exercise.name}...`);

  // 2. Convert to WebP using sharp
  const webpBuffer = await sharp(localPath).webp({ quality: 85 }).toBuffer();

  // 3. Upload to R2
  console.log(`Uploading to R2: ${fileName}`);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: webpBuffer,
      ContentType: "image/webp",
    }),
  );

  const url = `https://${PUBLIC_DOMAIN}/${fileName}`;

  // 4. Update Database
  console.log(`Updating DB for ${exercise.name} with URL: ${url}`);
  await db
    .update(exercises)
    .set({
      imageUrl: url,
      thumbnailUrl: url,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, exerciseId));

  console.log(`✅ ${exercise.name} updated successfully.`);
}

async function main() {
  const batchFile = process.argv[2];
  if (!batchFile) {
    console.error("Please provide a batch JSON file path.");
    process.exit(1);
  }

  const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
  console.log(`Starting processing for batch of ${batch.length} exercises...`);

  for (const item of batch) {
    try {
      // Expecting item: { id: string, localPath: string }
      await processExercise(item.id, item.localPath);
    } catch (error) {
      console.error(`Failed to process exercise ${item.id}:`, error);
    }
  }

  console.log("Batch processing complete.");
}

main().catch(console.error);
