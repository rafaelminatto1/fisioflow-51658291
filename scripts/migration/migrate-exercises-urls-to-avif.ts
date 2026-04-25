import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@fisioflow/db";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

interface R2Status {
  exercises_with_avif: number;
  exercises_with_png: number;
  exercises_with_both: number;
  exercises_missing_all: number;
  details: Record<
    string,
    {
      avif: boolean;
      png: boolean;
      webp: boolean;
      checked: boolean;
    }
  >;
}

interface MigrationRecord {
  uuid: string;
  name: string;
  old_image_url: string | null;
  new_image_url: string | null;
  old_thumbnail_url: string | null;
  new_thumbnail_url: string | null;
  changed: boolean;
  reason: string;
}

async function main() {
  console.log("🚀 Iniciando migração de URLs de exercícios para AVIF...");
  console.log("");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL não encontrada nas variáveis de ambiente");
    process.exit(1);
  }

  const R2_STATUS_FILE = path.join(__dirname, "migration/r2-status.json");
  if (!fs.existsSync(R2_STATUS_FILE)) {
    console.error(
      "❌ Arquivo r2-status.json não encontrado. Execute primeiro: npm run tsx scripts/verify-r2-avif-files.ts",
    );
    process.exit(1);
  }

  const r2Status: R2Status = JSON.parse(fs.readFileSync(R2_STATUS_FILE, "utf-8"));
  console.log(`📊 Status R2 carregado:`);
  console.log(`   - Exercícios com AVIF: ${r2Status.exercises_with_avif}`);
  console.log(`   - Exercícios com PNG: ${r2Status.exercises_with_png}`);
  console.log(`   - Candidatos para migração: ${r2Status.exercises_with_both}`);
  console.log("");

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
  let unchanged = 0;

  for (const exercise of exercises) {
    const exerciseId = exercise.id;
    const r2Info = r2Status.details[exerciseId];

    const record: MigrationRecord = {
      uuid: exerciseId,
      name: exercise.name || "Sem nome",
      old_image_url: exercise.imageUrl,
      new_image_url: exercise.imageUrl,
      old_thumbnail_url: exercise.thumbnailUrl,
      new_thumbnail_url: exercise.thumbnailUrl,
      changed: false,
      reason: "",
    };

    if (!r2Info) {
      record.reason = "Exercício não encontrado no R2";
      skipped++;
      migrations.push(record);
      continue;
    }

    if (!r2Info.avif) {
      record.reason = "AVIF não disponível no R2";
      skipped++;
      migrations.push(record);
      continue;
    }

    let needsUpdate = false;

    if (exercise.imageUrl && exercise.imageUrl.includes(".png")) {
      const newUrl = exercise.imageUrl.replace(/\.png$/, ".avif");
      record.new_image_url = newUrl;
      needsUpdate = true;

      await db
        .update(schema.exercises)
        .set({ imageUrl: newUrl })
        .where(eq(schema.exercises.id, exerciseId));
    }

    if (exercise.thumbnailUrl && exercise.thumbnailUrl.includes(".png")) {
      const newUrl = exercise.thumbnailUrl.replace(/\.png$/, ".avif");
      record.new_thumbnail_url = newUrl;
      needsUpdate = true;

      await db
        .update(schema.exercises)
        .set({ thumbnailUrl: newUrl })
        .where(eq(schema.exercises.id, exerciseId));
    }

    if (needsUpdate) {
      record.changed = true;
      record.reason = "PNG → AVIF (migrado)";
      migrated++;
      console.log(
        `   ✅ ${exercise.name?.substring(0, 40)}${exercise.name?.length > 40 ? "..." : ""}`,
      );
    } else {
      record.reason = "Já em AVIF ou sem URL PNG";
      unchanged++;
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
			await db.update(schema.exercises)
				.set({ imageUrl: record.old_image_url })
				.where(eq(schema.exercises.id, record.uuid));
		}

		if (record.old_thumbnail_url !== record.new_thumbnail_url) {
			await db.update(schema.exercises)
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
  console.log(`   ⏭️  Pulados (sem AVIF): ${skipped}`);
  console.log(`   📌 Não modificados: ${unchanged}`);
  console.log(`   📝 Total processados: ${migrations.length}`);

  const detailsFile = path.join(__dirname, "migration/migration-details.txt");
  let detailsText =
    `=== MIGRAÇÃO DE EXERCÍCIOS: PNG → AVIF ===\n` +
    `Data/Hora: ${new Date().toLocaleString("pt-BR")}\n` +
    `Backup: ${BACKUP_FILE}\n` +
    `Rollback: ${ROLLBACK_FILE}\n\n` +
    `RESUMO:\n` +
    `- Migrados: ${migrated}\n` +
    `- Pulados: ${skipped}\n` +
    `- Não modificados: ${unchanged}\n\n` +
    `EXERCÍCIOS MIGRADOS:\n\n`;

  migrations
    .filter((m) => m.changed)
    .forEach((m) => {
      detailsText += `${m.name} (${m.uuid})\n`;
      detailsText += `  image_url: ${m.old_image_url} → ${m.new_image_url}\n`;
      detailsText += `  thumbnail_url: ${m.old_thumbnail_url} → ${m.new_thumbnail_url}\n\n`;
    });

  detailsText += `\nEXERCÍCIOS PULADOS (sem AVIF no R2):\n\n`;

  migrations
    .filter((m) => !m.changed && m.reason === "AVIF não disponível no R2")
    .forEach((m) => {
      detailsText += `${m.name} (${m.uuid})\n`;
      detailsText += `  Razão: ${m.reason}\n`;
      if (m.old_image_url) detailsText += `  image_url: ${m.old_image_url}\n`;
      if (m.old_thumbnail_url) detailsText += `  thumbnail_url: ${m.old_thumbnail_url}\n`;
      detailsText += `\n`;
    });

  fs.writeFileSync(detailsFile, detailsText);
  console.log(`📄 Detalhes salvos em: ${detailsFile}`);

  console.log("\n✅ Migração concluída com sucesso!");
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("   1. Atualizar código (src/lib/imageUtils.ts)");
  console.log("   2. Validar mudanças (npm run tsx scripts/validate-migration.ts)");
  console.log("   3. Fazer commit e deploy");
  console.log("   4. Monitorar por 24h");
  console.log("\n🔄 SE PRECISAR REVERTER:");
  console.log(`   npm run tsx ${ROLLBACK_FILE}`);
}

main().catch(console.error);
