import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/server/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.production" });

const wrongDomain = "media.fisioflow.com.br";
const correctDomain = "media.moocafisio.com.br";

async function main() {
	console.log("🔧 Corrigindo URLs de domínio errado...");
	console.log("");

	const DATABASE_URL = process.env.DATABASE_URL;
	if (!DATABASE_URL) {
		console.error("❌ DATABASE_URL não encontrada");
		process.exit(1);
	}

	const sql = neon(DATABASE_URL);
	const db = drizzle(sql, { schema });

	const validationResultsFile = fs
		.readdirSync(path.join(__dirname, "migration"))
		.find((f) => f.startsWith("validation-results-") && f.endsWith(".json"));

	if (!validationResultsFile) {
		console.error("❌ Arquivo de validação não encontrado");
		process.exit(1);
	}

	const validationResults = JSON.parse(
		fs.readFileSync(
			path.join(__dirname, "migration", validationResultsFile),
			"utf-8",
		),
	);

	const brokenExercises = validationResults.filter(
		(r: any) =>
			r.imageUrl?.includes(wrongDomain) ||
			r.thumbnailUrl?.includes(wrongDomain),
	);

	console.log(
		`🔍 ${brokenExercises.length} exercícios com domínio errado encontrado.`,
	);

	let fixed = 0;

	for (const exercise of brokenExercises) {
		let needsUpdate = false;

		if (exercise.imageUrl && exercise.imageUrl.includes(wrongDomain)) {
			const newUrl = exercise.imageUrl.replace(wrongDomain, correctDomain);
			await db
				.update(schema.exercises)
				.set({ imageUrl: newUrl })
				.where(eq(schema.exercises.id, exercise.uuid));
			needsUpdate = true;
			console.log(`   ✅ ${exercise.name?.substring(0, 40)}... (image)`);
		}

		if (exercise.thumbnailUrl && exercise.thumbnailUrl.includes(wrongDomain)) {
			const newUrl = exercise.thumbnailUrl.replace(wrongDomain, correctDomain);
			await db
				.update(schema.exercises)
				.set({ thumbnailUrl: newUrl })
				.where(eq(schema.exercises.id, exercise.uuid));
			needsUpdate = true;
			if (!needsUpdate) {
				console.log(`   ✅ ${exercise.name?.substring(0, 40)}... (thumbnail)`);
			}
		}

		if (needsUpdate) fixed++;
	}

	console.log(`\n✅ ${fixed} exercícios corrigidos!`);
}

main().catch(console.error);
