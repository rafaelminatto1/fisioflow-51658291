import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/server/db/schema";
import * as dotenv from "dotenv";
import { eq, or } from "drizzle-orm";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.production" });

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

	const wrongDomain = "media.fisioflow.com.br";
	const correctDomain = "media.moocafisio.com.br";

	const exercises = await db.query.exercises.findMany({
		where: or(
			eq(schema.exercises.imageUrl, `%${wrongDomain}%`),
			eq(schema.exercises.thumbnailUrl, `%${wrongDomain}%`),
		),
	});

	if (exercises.length === 0) {
		console.log("✅ Nenhum exercício com domínio errado encontrado.");
		return;
	}

	console.log(
		`🔍 ${exercises.length} exercícios com domínio errado encontrado.`,
	);

	let fixed = 0;

	for (const exercise of exercises) {
		let needsUpdate = false;

		if (exercise.imageUrl && exercise.imageUrl.includes(wrongDomain)) {
			const newUrl = exercise.imageUrl.replace(wrongDomain, correctDomain);
			await db
				.update(schema.exercises)
				.set({ imageUrl: newUrl })
				.where(eq(schema.exercises.id, exercise.id));
			needsUpdate = true;
			console.log(`   ✅ ${exercise.name?.substring(0, 40)}... (image)`);
		}

		if (exercise.thumbnailUrl && exercise.thumbnailUrl.includes(wrongDomain)) {
			const newUrl = exercise.thumbnailUrl.replace(wrongDomain, correctDomain);
			await db
				.update(schema.exercises)
				.set({ thumbnailUrl: newUrl })
				.where(eq(schema.exercises.id, exercise.id));
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
