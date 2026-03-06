/**
 * Migração de Mídia: Firebase Storage → Cloudflare R2
 * 
 * Escopo:
 *   - Localiza referências ao Firebase Storage em várias tabelas (Neon)
 *   - Baixa os arquivos e faz upload para o Cloudflare R2
 *   - Atualiza as URLs no banco Neon para apontar ao R2
 * 
 * Tabelas Suportadas:
 *   - exercises (image_url, thumbnail_url, video_url)
 *   - patients (photo_url)
 *   - session_attachments (file_url, thumbnail_url)
 *   - sessions (pdf_url)
 *
 * Uso:
 *   node scripts/migrate-images-to-r2.mjs
 *   node scripts/migrate-images-to-r2.mjs --dry-run
 *   node scripts/migrate-images-to-r2.mjs --table=patients
 *   node scripts/migrate-images-to-r2.mjs --limit=10
 */

import { neon } from '@neondatabase/serverless';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG =====
const DRY_RUN = process.argv.includes('--dry-run');
const TABLE_FILTER = process.argv.find(a => a.startsWith('--table='))?.split('=')[1];
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const CONCURRENCY = 5;

// ===== ENV =====
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf8');
function getEnv(key, fallback = '') {
    return envContent.match(new RegExp(`^${key}="?([^"\\n]+)"?`, 'm'))?.[1] || process.env[key] || fallback;
}

const DATABASE_URL = getEnv('DATABASE_URL');
if (!DATABASE_URL) throw new Error('DATABASE_URL não encontrada no .env');

const R2_ACCOUNT_ID = getEnv('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = getEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = getEnv('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = getEnv('R2_BUCKET_NAME', 'fisioflow-media');
const R2_PUBLIC_URL = getEnv('R2_PUBLIC_URL', `https://${R2_BUCKET_NAME}.r2.dev`);

if (!DRY_RUN && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
    throw new Error(
        'Variáveis R2 não configuradas. Defina no .env:\n' +
        '  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    );
}

// ===== CLIENTS =====
const sql = neon(DATABASE_URL);

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// ===== MIGRATION TARGETS =====
const TARGETS = [
    {
        name: 'exercises',
        columns: ['image_url', 'thumbnail_url', 'video_url'],
        idColumn: 'id',
        folder: 'exercises'
    },
    {
        name: 'patients',
        columns: ['photo_url'],
        idColumn: 'id',
        folder: 'avatars'
    },
    {
        name: 'session_attachments',
        columns: ['file_url', 'thumbnail_url'],
        idColumn: 'id',
        folder: 'attachments'
    },
    {
        name: 'sessions',
        columns: ['pdf_url'],
        idColumn: 'id',
        folder: 'reports'
    }
];

// ===== UTILS =====
const stats = { downloaded: 0, uploaded: 0, skipped: 0, errors: 0, updated: 0 };

function getContentTypeFromUrl(url) {
    try {
        const ext = extname(new URL(url).pathname).toLowerCase();
        const types = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
            '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        return types[ext] || 'application/octet-stream';
    } catch {
        return 'application/octet-stream';
    }
}

function generateR2Key(id, type, url, folder) {
    try {
        const urlObj = new URL(url);
        const ext = extname(urlObj.pathname).toLowerCase() || '.jpg';
        return `${folder}/${id}/${type}${ext}`;
    } catch {
        return `${folder}/${id}/${type}.jpg`;
    }
}

async function objectExists(key) {
    try {
        await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
        return true;
    } catch {
        return false;
    }
}

async function downloadFile(url) {
    let fetchUrl = url;
    if (fetchUrl.includes('firebasestorage.googleapis.com') && !fetchUrl.includes('alt=media')) {
        fetchUrl += fetchUrl.includes('?') ? '&alt=media' : '?alt=media';
    }

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${fetchUrl}`);
    return Buffer.from(await res.arrayBuffer());
}

async function uploadToR2(key, data, contentType) {
    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
    }));
}

async function migrateUrl(id, column, url, folder) {
    if (!url) return null;

    if (url.includes(R2_PUBLIC_URL) || url.includes('.r2.dev') || !url.includes('firebasestorage.googleapis.com')) {
        stats.skipped++;
        return null;
    }

    const type = column.replace('_url', '');
    const r2Key = generateR2Key(id, type, url, folder);
    const newUrl = `${R2_PUBLIC_URL}/${r2Key}`;

    if (DRY_RUN) {
        console.log(`  🔍 [dry-run] ${folder}/${id} ${column}: → ${r2Key}`);
        stats.uploaded++;
        return newUrl;
    }

    if (await objectExists(r2Key)) {
        stats.skipped++;
        return newUrl;
    }

    try {
        const data = await downloadFile(url);
        stats.downloaded++;
        const contentType = getContentTypeFromUrl(url);
        await uploadToR2(r2Key, data, contentType);
        stats.uploaded++;
        return newUrl;
    } catch (err) {
        console.warn(`  ⚠️  Erro ${folder}/${id} ${column}: ${err.message}`);
        stats.errors++;
        return null;
    }
}

// ===== MAIN =====
async function main() {
    console.log(`\n📦 Migração de Mídia: Firebase Storage → Cloudflare R2${DRY_RUN ? ' [DRY-RUN]' : ''}`);
    console.log('='.repeat(60));
    console.log(`  Bucket: ${R2_BUCKET_NAME}`);
    console.log(`  Public URL: ${R2_PUBLIC_URL}`);
    console.log();

    for (const target of TARGETS) {
        if (TABLE_FILTER && target.name !== TABLE_FILTER) continue;

        console.log(`\n📂 Tabela: ${target.name}`);

        const urlFilter = '%firebasestorage.googleapis.com%';
        const whereClause = target.columns.map(col => `${col} LIKE '${urlFilter}'`).join(' OR ');

        let query = `SELECT ${target.idColumn}, ${target.columns.join(', ')} FROM ${target.name} WHERE ${whereClause}`;
        if (LIMIT > 0) query += ` LIMIT ${LIMIT}`;

        const result = await sql.query(query);
        const rows = result.rows || result;

        if (rows.length === 0) {
            console.log(`  ✅ Nada para migrar em ${target.name}.`);
            continue;
        }

        console.log(`  🚀 Processando ${rows.length} registros...`);

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
            const batch = rows.slice(i, i + CONCURRENCY);

            await Promise.all(batch.map(async (row) => {
                const id = row[target.idColumn];
                const updates = {};

                for (const col of target.columns) {
                    if (row[col]) {
                        const newUrl = await migrateUrl(id, col, row[col], target.folder);
                        if (newUrl) updates[col] = newUrl;
                    }
                }

                if (Object.keys(updates).length > 0 && !DRY_RUN) {
                    const setClauses = Object.entries(updates)
                        .map(([col], idx) => `${col} = $${idx + 2}`)
                        .join(', ');
                    const values = [id, ...Object.values(updates)];
                    await sql.query(`UPDATE ${target.name} SET ${setClauses}, updated_at = NOW() WHERE ${target.idColumn} = $1`, values);
                    stats.updated++;
                }
            }));
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migração concluída!');
    console.log(`\n📊 Resumo${DRY_RUN ? ' (dry-run)' : ''}:`);
    console.log(`  📥 Downloads: ${stats.downloaded}`);
    console.log(`  📤 Uploads R2: ${stats.uploaded}`);
    console.log(`  ⏩ Pulados: ${stats.skipped}`);
    console.log(`  🔄 DB atualizado: ${stats.updated}`);
    console.log(`  ⚠️  Erros: ${stats.errors}`);

    if (stats.errors > 0) {
        console.log('\n⚠️  Houve erros em alguns arquivos. Re-execute para tentar novamente.');
    }

    process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('\n❌ Erro na migração:', err);
    process.exit(1);
});
