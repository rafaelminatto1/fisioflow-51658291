/**
 * Migra exercícios e exercise_protocols do Supabase para Firestore.
 * Cenário B: baixa imagens/vídeos do Supabase, faz upload para Firebase Storage e atualiza URLs.
 *
 * Uso:
 *   node scripts/migration/migrate-exercises-protocols-from-supabase.mjs
 *   node scripts/migration/migrate-exercises-protocols-from-supabase.mjs --dry-run
 *   node scripts/migration/migrate-exercises-protocols-from-supabase.mjs --only-protocols   # só protocolos
 *
 * .env necessário: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIREBASE_SERVICE_ACCOUNT_KEY_PATH
 */

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isDryRun = process.argv.includes('--dry-run');
const retrySupabaseUrls = process.argv.includes('--retry-supabase-urls');
const clearFailedUrls = process.argv.includes('--clear-failed-urls');
const onlyProtocols = process.argv.includes('--only-protocols');
const BUCKET_MEDIA_PREFIX = 'exercise-media';
const BATCH_SIZE = 100;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) no .env');
  process.exit(1);
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
if (!serviceAccountPath) {
  console.error('❌ Defina FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env');
  process.exit(1);
}

const resolvedKeyPath = serviceAccountPath.startsWith('./') || serviceAccountPath.startsWith('../')
  ? path.join(__dirname, '../..', serviceAccountPath)
  : path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(__dirname, '../..', serviceAccountPath);

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));
} catch (e) {
  console.error('❌ Erro ao ler service account:', e.message);
  process.exit(1);
}

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucket,
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket(storageBucket);
const supabase = createClient(supabaseUrl, supabaseKey);

const log = (msg, type = 'info') => {
  const t = new Date().toISOString().slice(11, 19);
  const icon = type === 'success' ? '✅' : type === 'warn' ? '⚠️' : type === 'err' ? '❌' : 'ℹ️';
  console.log(`${t} ${icon} ${msg}`);
};

function isSupabaseMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('supabase.co') || url.includes('supabase');
}

/**
 * Extrai bucket e path de uma URL do Supabase Storage.
 * Ex: https://xxx.supabase.co/storage/v1/object/public/exercise-thumbnails/generated/foo.avif
 *     -> { bucket: 'exercise-thumbnails', path: 'generated/foo.avif' }
 */
function parseSupabaseStorageUrl(url) {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (match) {
      const pathDecoded = decodeURIComponent(match[2]);
      return { bucket: match[1], path: pathDecoded };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Baixa arquivo do Supabase Storage via API (evita HTTP 400 de GET direto).
 */
async function downloadFromSupabaseStorage(url) {
  const parsed = parseSupabaseStorageUrl(url);
  if (!parsed) throw new Error('URL não é do Supabase Storage');
  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path);
  if (error) {
    const errStr = typeof error === 'object' ? (error.message || error.error || JSON.stringify(error)) : String(error);
    throw new Error(errStr);
  }
  if (!data) throw new Error('Empty response');
  return Buffer.from(await data.arrayBuffer());
}

async function downloadUrl(url) {
  if (typeof globalThis.fetch === 'function') {
    const res = await globalThis.fetch(url, {
      headers: {
        'User-Agent': 'FisioFlow-Migration/1.0 (Node)',
        Accept: '*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const opts = {
      timeout: 30000,
      headers: { 'User-Agent': 'FisioFlow-Migration/1.0 (Node)', Accept: '*/*' },
    };
    const req = client.get(url, opts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).slice(1) || 'bin';
    return ext.replace(/[^a-z0-9]/gi, '') || 'bin';
  } catch {
    return 'bin';
  }
}

async function uploadToFirebaseStorage(buffer, storagePath, contentType = 'application/octet-stream') {
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType } });
  try {
    await file.makePublic();
  } catch (_) {
    // Bucket policy may already allow public read
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

async function migrateUrlToFirebase(exerciseId, url, kind) {
  if (!isSupabaseMediaUrl(url)) return url;
  try {
    let buf;
    if (parseSupabaseStorageUrl(url)) {
      try {
        buf = await downloadFromSupabaseStorage(url);
      } catch (apiErr) {
        const errMsg = apiErr?.message ?? (typeof apiErr === 'object' ? JSON.stringify(apiErr) : String(apiErr));
        log(`  API Supabase falhou (${kind}), tentando HTTP: ${errMsg}`, 'warn');
        buf = await downloadUrl(url);
      }
    } else {
      buf = await downloadUrl(url);
    }
    const ext = getExtensionFromUrl(url);
    const storagePath = `${BUCKET_MEDIA_PREFIX}/${exerciseId}/${kind}.${ext}`;
    const contentType = ext.match(/^(jpg|jpeg|png|gif|webp|avif)$/i) ? `image/${ext}` :
      ext.match(/^(mp4|webm|mov)$/i) ? `video/${ext}` : 'application/octet-stream';
    const newUrl = await uploadToFirebaseStorage(buf, storagePath, contentType);
    log(`  Migrado ${kind}: ${url.slice(0, 50)}... → Firebase`, 'success');
    return newUrl;
  } catch (e) {
    log(`  Falha ao migrar ${kind} (mantida URL original): ${e.message}`, 'warn');
    if (clearFailedUrls) {
      log(`  --clear-failed-urls: removendo URL do Supabase para evitar link quebrado.`, 'info');
      return null;
    }
    return url;
  }
}

function toFirestoreValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && typeof v.toISOString === 'function') return v.toISOString();
  if (Array.isArray(v)) return v.map(toFirestoreValue);
  if (typeof v === 'object' && v !== null && !Buffer.isBuffer(v)) {
    const out = {};
    for (const key of Object.keys(v)) out[key] = toFirestoreValue(v[key]);
    return out;
  }
  return v;
}

async function migrateExercises() {
  log('Buscando exercícios no Supabase (is_active = true)...');
  const { data: rows, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true);

  if (error) {
    log(`Erro Supabase exercises: ${error.message}`, 'err');
    return { migrated: 0, errors: 1 };
  }
  if (!rows?.length) {
    log('Nenhum exercício encontrado.');
    return { migrated: 0, errors: 0 };
  }

  log(`Encontrados ${rows.length} exercícios. Migrando para Firestore (Cenário B: mídia → Firebase Storage)...`);
  let migrated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const id = String(row.id);
      let image_url = row.image_url;
      let thumbnail_url = row.thumbnail_url;
      let video_url = row.video_url;

      if (!isDryRun) {
        if (isSupabaseMediaUrl(image_url)) image_url = await migrateUrlToFirebase(id, image_url, 'image');
        if (isSupabaseMediaUrl(thumbnail_url)) thumbnail_url = await migrateUrlToFirebase(id, thumbnail_url, 'thumbnail');
        if (isSupabaseMediaUrl(video_url)) video_url = await migrateUrlToFirebase(id, video_url, 'video');
      }

      const docData = {
        name: row.name ?? '',
        category: row.category ?? null,
        difficulty: row.difficulty ?? null,
        description: row.description ?? null,
        instructions: row.instructions ?? null,
        video_url: video_url ?? null,
        image_url: image_url ?? null,
        thumbnail_url: thumbnail_url ?? null,
        sets: row.sets ?? null,
        repetitions: row.repetitions ?? null,
        duration: row.duration ?? null,
        equipment: row.equipment ?? null,
        body_parts: row.body_parts ?? row.muscle_groups ?? null,
        indicated_pathologies: row.indicated_pathologies ?? null,
        contraindicated_pathologies: row.contraindicated_pathologies ?? null,
        targetMuscles: row.targetMuscles ?? row.muscle_groups ?? null,
        created_at: row.created_at ? (row.created_at.toISOString?.() ?? row.created_at) : null,
        updated_at: row.updated_at ? (row.updated_at.toISOString?.() ?? row.updated_at) : null,
        _migratedAt: new Date().toISOString(),
        _migratedFrom: 'supabase',
      };
      const cleaned = toFirestoreValue(docData);

      if (!isDryRun) {
        try {
          await db.collection('exercises').doc(id).set(cleaned);
          migrated++;
        } catch (e) {
          log(`Erro ao escrever exercício ${id}: ${e.message}`, 'err');
          errors++;
        }
      } else {
        migrated++;
      }
    }
  }

  log(`Exercícios: ${migrated} migrados${errors ? `, ${errors} erros` : ''}.`, 'success');
  return { migrated, errors };
}

async function migrateProtocols() {
  log('Buscando exercise_protocols no Supabase...');
  const { data: rows, error } = await supabase
    .from('exercise_protocols')
    .select('*');

  if (error) {
    log(`Erro Supabase exercise_protocols: ${error.message}`, 'err');
    return { migrated: 0, errors: 1 };
  }
  if (!rows?.length) {
    log('Nenhum protocolo encontrado.');
    return { migrated: 0, errors: 0 };
  }

  log(`Encontrados ${rows.length} protocolos. Escrevendo em Firestore...`);
  let migrated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const id = String(row.id);
      const docData = {
        name: row.name,
        condition_name: row.condition_name,
        protocol_type: row.protocol_type,
        weeks_total: row.weeks_total ?? null,
        milestones: row.milestones ?? [],
        restrictions: row.restrictions ?? [],
        progression_criteria: row.progression_criteria ?? [],
        references: row.references ?? null,
        organization_id: row.organization_id ?? null,
        created_by: row.created_by ?? null,
        created_at: row.created_at ? (row.created_at.toISOString?.() ?? row.created_at) : null,
        updated_at: row.updated_at ? (row.updated_at.toISOString?.() ?? row.updated_at) : null,
        _migratedAt: new Date().toISOString(),
        _migratedFrom: 'supabase',
      };
      const cleaned = toFirestoreValue(docData);

      if (!isDryRun) {
        try {
          await db.collection('exercise_protocols').doc(id).set(cleaned);
          migrated++;
        } catch (e) {
          log(`Erro ao escrever protocolo ${id}: ${e.message}`, 'err');
          errors++;
        }
      } else {
        migrated++;
      }
    }
  }

  log(`Protocolos: ${migrated} migrados${errors ? `, ${errors} erros` : ''}.`, 'success');
  return { migrated, errors };
}

/**
 * Reprocessa apenas exercícios no Firestore que ainda tenham image_url/thumbnail_url/video_url do Supabase.
 * Usa API do Supabase Storage para download (evita HTTP 400). Útil após exclusão do Supabase.
 */
async function retryExercisesWithSupabaseUrls() {
  log('Buscando no Firestore exercícios que ainda têm URLs do Supabase...');
  const snapshot = await db.collection('exercises').get();
  const docsWithSupabase = [];
  snapshot.docs.forEach((doc) => {
    const d = doc.data();
    const id = doc.id;
    if (isSupabaseMediaUrl(d.image_url) || isSupabaseMediaUrl(d.thumbnail_url) || isSupabaseMediaUrl(d.video_url)) {
      docsWithSupabase.push({ id, ...d });
    }
  });
  if (!docsWithSupabase.length) {
    log('Nenhum exercício no Firestore com URL do Supabase.');
    return { migrated: 0, errors: 0 };
  }
  log(`Encontrados ${docsWithSupabase.length} exercícios com URLs do Supabase. Migrando mídia (API Supabase)...`);
  let migrated = 0;
  let errors = 0;
  for (const doc of docsWithSupabase) {
    const id = doc.id;
    let image_url = doc.image_url;
    let thumbnail_url = doc.thumbnail_url;
    let video_url = doc.video_url;
    if (!isDryRun) {
      if (isSupabaseMediaUrl(image_url)) image_url = await migrateUrlToFirebase(id, image_url, 'image');
      if (isSupabaseMediaUrl(thumbnail_url)) thumbnail_url = await migrateUrlToFirebase(id, thumbnail_url, 'thumbnail');
      if (isSupabaseMediaUrl(video_url)) video_url = await migrateUrlToFirebase(id, video_url, 'video');
    }
    if (!isDryRun) {
      try {
        await db.collection('exercises').doc(id).update({
          image_url: image_url ?? null,
          thumbnail_url: thumbnail_url ?? null,
          video_url: video_url ?? null,
          _migratedAt: new Date().toISOString(),
        });
        migrated++;
      } catch (e) {
        log(`Erro ao atualizar exercício ${id}: ${e.message}`, 'err');
        errors++;
      }
    } else {
      migrated++;
    }
  }
  log(`Exercícios atualizados: ${migrated}${errors ? `, ${errors} erros` : ''}.`, 'success');
  return { migrated, errors };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO EXERCÍCIOS + PROTOCOLOS (Supabase → Firestore)   ║');
  console.log('║  Cenário B: mídia → Firebase Storage                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  if (isDryRun) console.log('⚠️  DRY-RUN: nenhuma alteração será feita.\n');
  if (retrySupabaseUrls) console.log('🔄 Modo: --retry-supabase-urls (apenas exercícios com URL Supabase no Firestore)\n');
  if (onlyProtocols) console.log('📋 Modo: --only-protocols (apenas exercise_protocols)\n');

  let r1 = { migrated: 0, errors: 0 };
  let r2 = { migrated: 0, errors: 0 };

  if (retrySupabaseUrls) {
    r1 = await retryExercisesWithSupabaseUrls();
  } else if (onlyProtocols) {
    r2 = await migrateProtocols();
  } else {
    r1 = await migrateExercises();
    console.log('');
    r2 = await migrateProtocols();
  }

  console.log('\n' + '='.repeat(60));
  log(`Total: ${r1.migrated + r2.migrated} registros (exercises: ${r1.migrated}, protocols: ${r2.migrated})`, 'success');
  if (r1.errors + r2.errors > 0) log(`Erros: ${r1.errors + r2.errors}`, 'err');
  if (isDryRun) log('Execute sem --dry-run para aplicar.', 'warn');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
