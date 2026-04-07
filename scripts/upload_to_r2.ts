import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const r2Client = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
});

const BRAIN_DIR =
	"/home/rafael/.gemini/antigravity/brain/34621a1e-c49b-48fb-8620-7e9f4cfdd455";
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const filesToUpload = [
	"lachman_test_illustration_1774112770318.webp",
	"anterior_drawer_test_knee_1774112787661.webp",
	"phalen_test_illustration_1774112800050.webp",
	"neer_test_shoulder_illustration_1774112816226.webp",
	"lasegue_test_spine_illustration_1774112831923.webp",
	"jobe_test_shoulder_illustration_1774112848282.webp",
	"myofascial_release_illustration_1774112869621.webp",
	"joint_mobilization_illustration_1774112884335.webp",
	"tens_therapy_illustration_1774112901330.webp",
	"ultrasound_therapy_illustration_1774112917805.webp",
	"dry_needling_illustration_1774112933153.webp",
	"cryotherapy_illustration_1774112946888.webp",
];

async function uploadFile(fileName: string) {
	const filePath = path.join(BRAIN_DIR, fileName);
	const fileContent = fs.readFileSync(filePath);

	// Create a clean name for the bucket
	const cleanName = fileName.replace(/_\d+\.webp$/, ".webp");
	const key = `illustrations/${cleanName}`;

	console.log(`Uploading ${fileName} as ${key}...`);

	await r2Client.send(
		new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: fileContent,
			ContentType: "image/webp",
		}),
	);

	return `${PUBLIC_DOMAIN}/${key}`;
}

async function main() {
	const results: Record<string, string> = {};
	for (const file of filesToUpload) {
		try {
			const url = await uploadFile(file);
			results[file] = url;
		} catch (error) {
			console.error(`Failed to upload ${file}:`, error);
		}
	}
	console.log("\n--- UPLOAD RESULTS ---");
	console.log(JSON.stringify(results, null, 2));
}

main();
