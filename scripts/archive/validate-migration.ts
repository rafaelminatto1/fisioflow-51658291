import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";
import * as schema from "../src/server/db/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.production" });

interface ValidationResult {
  uuid: string;
  name: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  imageStatus: number | null;
  thumbnailStatus: number | null;
  imageFormat: string | null;
  thumbnailFormat: string | null;
}

function checkUrl(url: string | null): Promise<{ status: number; format: string | null }> {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ status: 0, format: null });
      return;
    }

    try {
      const urlObj = new URL(url);
      const options = {
        method: "HEAD",
        host: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        const format = url.match(/\.(avif|webp|png|jpe?g)$/i)?.[1] || null;
        req.destroy();
        resolve({ status: res.statusCode || 0, format });
      });

      req.on("error", () => {
        req.destroy();
        resolve({ status: -1, format: null });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ status: -2, format: null });
      });

      req.end();
    } catch {
      resolve({ status: -3, format: null });
    }
  });
}

async function main() {
  console.log("🔍 Validando migração de imagens de exercícios...");
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

  console.log(`📚 Validando ${exercises.length} exercícios...`);
  console.log("");

  const results: ValidationResult[] = [];
  let success = 0;
  let failed = 0;
  let missing = 0;
  let avifCount = 0;
  let pngCount = 0;
  let webpCount = 0;

  for (const exercise of exercises) {
    const [imageCheck, thumbnailCheck] = await Promise.all([
      checkUrl(exercise.imageUrl),
      checkUrl(exercise.thumbnailUrl),
    ]);

    const result: ValidationResult = {
      uuid: exercise.id,
      name: exercise.name || "Sem nome",
      imageUrl: exercise.imageUrl,
      thumbnailUrl: exercise.thumbnailUrl,
      imageStatus: imageCheck.status,
      thumbnailStatus: thumbnailCheck.status,
      imageFormat: imageCheck.format,
      thumbnailFormat: thumbnailCheck.format,
    };

    results.push(result);

    if (exercise.imageUrl?.includes(".avif")) avifCount++;
    if (exercise.imageUrl?.includes(".png")) pngCount++;
    if (exercise.imageUrl?.includes(".webp")) webpCount++;

    const isWorking =
      (imageCheck.status >= 200 && imageCheck.status < 300) ||
      (thumbnailCheck.status >= 200 && thumbnailCheck.status < 300);

    if (exercise.imageUrl || exercise.thumbnailUrl) {
      if (isWorking) {
        success++;
      } else {
        failed++;
        console.log(`   ❌ ${exercise.name?.substring(0, 40)}...`);
        console.log(`      Imagem: ${imageCheck.status} (${imageCheck.format || "N/A"})`);
        console.log(
          `      Thumbnail: ${thumbnailCheck.status} (${thumbnailCheck.format || "N/A"})`,
        );
      }
    } else {
      missing++;
    }
  }

  console.log(`\n📊 RESULTADOS:`);
  console.log(`   ✅ Com imagens funcionando: ${success}`);
  console.log(`   ❌ Com imagens quebradas: ${failed}`);
  console.log(`   ⚠️  Sem imagens: ${missing}`);
  console.log(`\n📈 FORMATOS:`);
  console.log(`   🟢 AVIF: ${avifCount}`);
  console.log(`   🟡 PNG: ${pngCount}`);
  console.log(`   🔵 WebP: ${webpCount}`);

  const brokenImages = results.filter(
    (r) =>
      (r.imageUrl || r.thumbnailUrl) &&
      (r.imageStatus < 200 || r.imageStatus >= 300) &&
      (r.thumbnailStatus < 200 || r.thumbnailStatus >= 300),
  );

  if (brokenImages.length > 0) {
    console.log(`\n⚠️  ${brokenImages.length} EXERCÍCIOS COM IMAGENS QUEBRADAS:`);
    brokenImages.slice(0, 10).forEach((r) => {
      console.log(`   - ${r.name} (${r.uuid})`);
      if (r.imageUrl) console.log(`     Imagem: ${r.imageUrl} (${r.imageStatus})`);
      if (r.thumbnailUrl) console.log(`     Thumbnail: ${r.thumbnailUrl} (${r.thumbnailStatus})`);
    });
    if (brokenImages.length > 10) {
      console.log(`   ... e mais ${brokenImages.length - 10}`);
    }
  }

  const OUTPUT_DIR = path.join(__dirname, "migration");
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const OUTPUT_FILE = path.join(OUTPUT_DIR, `validation-results-${Date.now()}.json`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n💾 Resultados salvos em: ${OUTPUT_FILE}`);

  const REPORT_FILE = path.join(OUTPUT_DIR, `validation-report-${Date.now()}.txt`);
  let report = `=== RELATÓRIO DE VALIDAÇÃO DE IMAGENS DE EXERCÍCIOS ===\n`;
  report += `Data/Hora: ${new Date().toLocaleString("pt-BR")}\n\n`;
  report += `RESUMO:\n`;
  report += `- Total de exercícios: ${exercises.length}\n`;
  report += `- Com imagens funcionando: ${success}\n`;
  report += `- Com imagens quebradas: ${failed}\n`;
  report += `- Sem imagens: ${missing}\n\n`;
  report += `FORMATOS:\n`;
  report += `- AVIF: ${avifCount}\n`;
  report += `- PNG: ${pngCount}\n`;
  report += `- WebP: ${webpCount}\n`;

  if (brokenImages.length > 0) {
    report += `\nIMAGENS QUEBRADAS:\n\n`;
    brokenImages.forEach((r) => {
      report += `${r.name} (${r.uuid})\n`;
      if (r.imageUrl) report += `  Imagem: ${r.imageUrl} - Status: ${r.imageStatus}\n`;
      if (r.thumbnailUrl)
        report += `  Thumbnail: ${r.thumbnailUrl} - Status: ${r.thumbnailStatus}\n`;
      report += "\n";
    });
  }

  fs.writeFileSync(REPORT_FILE, report);
  console.log(`📄 Relatório salvo em: ${REPORT_FILE}`);

  if (failed === 0) {
    console.log("\n✅ Validação concluída! Todas as imagens estão funcionando.");
    process.exit(0);
  } else {
    console.log(`\n⚠️  Validação concluída com ${failed} imagens quebradas.`);
    console.log("   Verifique o relatório para mais detalhes.");
    process.exit(1);
  }
}

main().catch(console.error);
