import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { fileURLToPath } from "url";
import * as schema from "../src/server/db/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.production" });

interface MigrationRecord {
  uuid: string;
  name: string;
  old_image_url: string | null;
  new_image_url: string | null;
  old_thumbnail_url: string | null;
  new_thumbnail_url: string | null;
  changed: boolean;
}

async function main() {
  console.log("🚀 Iniciando migração de URLs de exercícios para AVIF...");
  console.log("");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL não encontrada");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const exercises = await db.query.exercises.findMany({
    columns: {
      id: true,
      name: true,
      imageUrl: true,
      thumbnailUrl: true,
    },
  });

  console.log(`📚 ${exercises.length} exercícios encontrados no banco de dados`);
  console.log("");

  const BACKUP_DIR = path.join(__dirname, "migration/backups");
  const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
  const BACKUP_FILE = path.join(BACKUP_DIR, `exercises-urls-backup-${TIMESTAMP}.json`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const migrations: MigrationRecord[] = [];
  let migrated = 0;
  let skipped = 0;

  for (const exercise of exercises) {
    const record: MigrationRecord = {
      uuid: exercise.id,
      name: exercise.name || "Sem nome",
      old_image_url: exercise.imageUrl,
      new_image_url: exercise.imageUrl,
      old_thumbnail_url: exercise.thumbnailUrl,
      new_thumbnail_url: exercise.thumbnailUrl,
      changed: false,
    };

    let needsUpdate = false;

    if (exercise.imageUrl && exercise.imageUrl.includes(".png")) {
      const newUrl = exercise.imageUrl.replace(/\.png$/, ".avif");
      record.new_image_url = newUrl;
      needsUpdate = true;

      await db
        .update(schema.exercises)
        .set({ imageUrl: newUrl })
        .where(eq(schema.exercises.id, exercise.id));
    }

    if (exercise.thumbnailUrl && exercise.thumbnailUrl.includes(".png")) {
      const newUrl = exercise.thumbnailUrl.replace(/\.png$/, ".avif");
      record.new_thumbnail_url = newUrl;
      needsUpdate = true;

      await db
        .update(schema.exercises)
        .set({ thumbnailUrl: newUrl })
        .where(eq(schema.exercises.id, exercise.id));
    }

    if (needsUpdate) {
      record.changed = true;
      migrated++;
      console.log(
        `   ✅ ${exercise.name?.substring(0, 40)}${exercise.name?.length > 40 ? "..." : ""}`,
      );
    } else {
      skipped++;
    }

    migrations.push(record);
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(migrations, null, 2));
  console.log(`\n💾 Backup salvo em: ${BACKUP_FILE}`);

  const ROLLBACK_FILE = path.join(__dirname, "migration/rollback-exercises-urls.ts");
  const rollbackScript = `import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@fisioflow/db';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

const migrations = ${JSON.stringify(migrations, null, 2)};

async function rollback() {
	console.log("🔄 Iniciando rollback de URLs de exercícios...");

	const DATABASE_URL = process.env.DATABASE_URL;
	if (!DATABASE_URL) {
		console.error("❌ DATABASE_URL não encontrada");
		process.exit(1);
	}

	const sql = neon(DATABASE_URL);
	const db = drizzle(sql, { schema });

	let reverted = 0;

	for (const record of migrations) {
		if (!record.changed) continue;

		if (record.old_image_url !== record.new_image_url) {
			await db
				.update(schema.exercises)
				.set({ imageUrl: record.old_image_url })
				.where(eq(schema.exercises.id, record.uuid));
		}

		if (record.old_thumbnail_url !== record.new_thumbnail_url) {
			await db
				.update(schema.exercises)
				.set({ thumbnailUrl: record.old_thumbnail_url })
				.where(eq(schema.exercises.id, record.uuid));
		}

		reverted++;
		console.log(\`   ↩️  \${record.name?.substring(0, 40)}\`);
	}

	console.log(\`\\n✅ Rollback concluído! \${reverted} exercícios revertidos.\`);
	console.log("\\n⚠️  Lembre-se de reverter as mudanças no código também (src/lib/imageUtils.ts)");
}

rollback().catch(console.error);
`;

  fs.writeFileSync(ROLLBACK_FILE, rollbackScript);
  console.log(`📜 Script de rollback criado: ${ROLLBACK_FILE}`);

  console.log(`\n📊 RESUMO DA MIGRAÇÃO:`);
  console.log(`   ✅ Migrados (PNG → AVIF): ${migrated}`);
  console.log(`   ⏭️  Pulados (sem PNG): ${skipped}`);
  console.log(`   📝 Total processados: ${migrations.length}`);

  const detailsFile = path.join(__dirname, "migration/migration-details.txt");
  let detailsText = `=== MIGRAÇÃO DE EXERCÍCIOS: PNG → AVIF ===\n`;
  detailsText += `Data/Hora: ${new Date().toLocaleString("pt-BR")}\n`;
  detailsText += `Backup: ${BACKUP_FILE}\n`;
  detailsText += `Rollback: ${ROLLBACK_FILE}\n\n`;
  detailsText += `RESUMO:\n`;
  detailsText += `- Migrados: ${migrated}\n`;
  detailsText += `- Pulados: ${skipped}\n\n`;
  detailsText += `EXERCÍCIOS MIGRADOS:\n\n`;

  migrations
    .filter((m) => m.changed)
    .forEach((m) => {
      detailsText += `${m.name} (${m.uuid})\n`;
      detailsText += `  image_url: ${m.old_image_url} → ${m.new_image_url}\n`;
      detailsText += `  thumbnail_url: ${m.old_thumbnail_url} → ${m.new_thumbnail_url}\n\n`;
    });

  fs.writeFileSync(detailsFile, detailsText);
  console.log(`📄 Detalhes salvos em: ${detailsFile}`);

  console.log("\n✅ Migração concluída com sucesso!");
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("   1. Validar mudanças (npm run tsx scripts/validate-migration.ts)");
  console.log("   2. Fazer commit e deploy");
  console.log("   3. Monitorar por 24h");
  console.log("\n🔄 SE PRECISAR REVERTER:");
  console.log(`   npm run tsx ${ROLLBACK_FILE}`);
}

main().catch(console.error);
