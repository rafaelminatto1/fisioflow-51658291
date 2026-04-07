import {
	S3Client,
	ListObjectsV2Command,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const client = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
	},
});

const BUCKET = "fisioflow-media";
const PREFIX = "illustrations/";

async function listPngObjects() {
	const command = new ListObjectsV2Command({
		Bucket: BUCKET,
		Prefix: PREFIX,
	});

	const response = await client.send(command);
	const pngObjects =
		response.Contents?.filter((obj) => obj.Key?.endsWith(".png")) || [];

	console.log(`Found ${pngObjects.length} PNG files in ${PREFIX}`);
	return pngObjects.map((obj) => obj.Key!);
}

async function downloadObject(key: string): Promise<Buffer> {
	const command = new GetObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});

	const response = await client.send(command);
	const chunks: Buffer[] = [];

	for await (const chunk of response.Body as any) {
		chunks.push(Buffer.from(chunk));
	}

	return Buffer.concat(chunks);
}

async function convertToWebP(buffer: Buffer): Promise<Buffer> {
	return sharp(buffer).webp({ quality: 80, effort: 6 }).toBuffer();
}

async function uploadWebP(key: string, buffer: Buffer) {
	const webpKey = key.replace(".png", ".webp");

	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: webpKey,
		Body: buffer,
		ContentType: "image/webp",
	});

	await client.send(command);
	console.log(`Uploaded: ${webpKey}`);
}

async function deletePng(key: string) {
	const command = new DeleteObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});

	await client.send(command);
	console.log(`Deleted: ${key}`);
}

async function main() {
	console.log("Starting PNG to WebP conversion...");

	const pngKeys = await listPngObjects();

	if (pngKeys.length === 0) {
		console.log("No PNG files found to convert.");
		return;
	}

	const outputDir = path.join(process.cwd(), "temp-webp-conversion");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	for (const key of pngKeys) {
		try {
			console.log(`Processing: ${key}`);

			// Download
			const pngBuffer = await downloadObject(key);
			console.log(`Downloaded: ${key} (${pngBuffer.length} bytes)`);

			// Save original for backup
			const fileName = path.basename(key);
			fs.writeFileSync(path.join(outputDir, fileName), pngBuffer);

			// Convert
			const webpBuffer = await convertToWebP(pngBuffer);
			console.log(
				`Converted: ${key} -> ${webpBuffer.length} bytes (${((webpBuffer.length / pngBuffer.length) * 100).toFixed(1)}% of original)`,
			);

			// Upload WebP
			await uploadWebP(key, webpBuffer);

			// Delete original PNG
			await deletePng(key);
		} catch (error) {
			console.error(`Error processing ${key}:`, error);
		}
	}

	console.log("\nConversion complete!");
	console.log(`Backups saved to: ${outputDir}`);
}

main().catch(console.error);
