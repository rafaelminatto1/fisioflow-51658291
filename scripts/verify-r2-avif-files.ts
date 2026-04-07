import {
	S3Client,
	ListObjectsV2Command,
	HeadObjectCommand,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const r2Client = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "fisioflow-media";
const OUTPUT_FILE = path.join(__dirname, "migration/r2-status.json");
const PROGRESS_FILE = path.join(__dirname, "migration/r2-status-progress.json");

interface ExerciseStatus {
	avif: boolean;
	png: boolean;
	webp: boolean;
	checked: boolean;
}

interface R2Status {
	exercises_with_avif: number;
	exercises_with_png: number;
	exercises_with_both: number;
	exercises_missing_all: number;
	details: Record<string, ExerciseStatus>;
}

async function main() {
	console.log("🔍 Verificando arquivos de exercícios no R2...");
	console.log(`📦 Bucket: ${BUCKET_NAME}`);
	console.log(`📂 Prefix: exercises/`);
	console.log("");

	const status: R2Status = {
		exercises_with_avif: 0,
		exercises_with_png: 0,
		exercises_with_both: 0,
		exercises_missing_all: 0,
		details: {},
	};

	try {
		let continuationToken: string | undefined = undefined;
		let totalChecked = 0;

		do {
			const response = await r2Client.send(
				new ListObjectsV2Command({
					Bucket: BUCKET_NAME,
					Prefix: "exercises/",
					ContinuationToken: continuationToken,
				}),
			);

			if (response.Contents) {
				for (const obj of response.Contents) {
					const key = obj.Key;
					if (!key) continue;

					const match = key.match(
						/exercises\/([a-f0-9-]+)\/(image|thumbnail)\.(avif|png|webp)/,
					);
					if (!match) continue;

					const [, uuid, type, format] = match;

					if (!status.details[uuid]) {
						status.details[uuid] = {
							avif: false,
							png: false,
							webp: false,
							checked: false,
						};
					}

					status.details[uuid][format as keyof ExerciseStatus] = true;
					totalChecked++;

					if (totalChecked % 20 === 0) {
						console.log(`   Processados ${totalChecked} arquivos...`);
					}
				}
			}

			continuationToken = response.NextContinuationToken;
		} while (continuationToken);

		console.log(
			`\n✅ Verificação concluída! ${totalChecked} arquivos encontrados.`,
		);
		console.log(
			`\n📊 Analisando ${Object.keys(status.details).length} exercícios únicos...`,
		);

		for (const [uuid, detail] of Object.entries(status.details)) {
			const hasAvif = detail.avif;
			const hasPng = detail.png;
			const hasWebp = detail.webp;

			if (hasAvif) status.exercises_with_avif++;
			if (hasPng) status.exercises_with_png++;
			if (hasAvif && hasPng) status.exercises_with_both++;
			if (!hasAvif && !hasPng && !hasWebp) status.exercises_missing_all++;

			detail.checked = true;
		}

		console.log(`\n📊 RESUMO:`);
		console.log(`   ✅ Com AVIF: ${status.exercises_with_avif}`);
		console.log(`   ✅ Com PNG: ${status.exercises_with_png}`);
		console.log(`   ✅ Com ambos (AVIF + PNG): ${status.exercises_with_both}`);
		console.log(
			`   ⚠️  Sem imagens (AVIF/PNG/WebP): ${status.exercises_missing_all}`,
		);

		const withAvifOnly =
			status.exercises_with_avif - status.exercises_with_both;
		const withPngOnly = status.exercises_with_png - status.exercises_with_both;

		console.log(`\n📈 DETALHES:`);
		console.log(`   🟢 AVIF apenas: ${withAvifOnly}`);
		console.log(`   🟡 PNG apenas: ${withPngOnly}`);
		console.log(`   🔵 Ambos: ${status.exercises_with_both}`);
		console.log(`   🔴 Nenhum: ${status.exercises_missing_all}`);

		const migrationCandidates = Object.entries(status.details).filter(
			([, detail]) => detail.avif && detail.png,
		);

		console.log(`\n🎯 CANDIDATOS PARA MIGRAÇÃO:`);
		console.log(
			`   Exercícios com AVIF + PNG (serão migrados): ${migrationCandidates.length}`,
		);

		const missingImages = Object.entries(status.details).filter(
			([, detail]) => !detail.avif && !detail.png && !detail.webp,
		);

		console.log(
			`   Exercícios sem imagens (precisam de atenção): ${missingImages.length}`,
		);

		if (missingImages.length > 0) {
			console.log(`\n   IDs de exercícios sem imagens:`);
			missingImages.slice(0, 10).forEach(([uuid]) => {
				console.log(`      - ${uuid}`);
			});
			if (missingImages.length > 10) {
				console.log(`      ... e mais ${missingImages.length - 10}`);
			}
		}

		const outputDir = path.dirname(OUTPUT_FILE);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(status, null, 2));
		console.log(`\n💾 Status salvo em: ${OUTPUT_FILE}`);

		console.log("\n✅ Script concluído com sucesso!");
	} catch (error) {
		console.error("\n❌ Erro durante verificação:", error);
		process.exit(1);
	}
}

main().catch(console.error);
