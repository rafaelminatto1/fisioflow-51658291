import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
const source = JSON.parse(await readFile('/tmp/zenfisio_dirty_clean_texts.json', 'utf8'));
const baseDir = '/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast';
const jsonFiles = {
  'Magali Auxiliadora Costa Gomes': path.join(baseDir, 'paciente_5324627_magali-auxiliadora-costa-gomes.json'),
  'Wilmer Pairo Alanoca': path.join(baseDir, 'paciente_5323484_wilmer-pairo-alanoca.json'),
};
const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  for (const item of source) {
    if (!item.conteudo_texto || item.conteudo_texto.length < 100) throw new Error(`Texto limpo inválido para ${item.name}`);
    const result = await client.query(`
      UPDATE sessions s
      SET observacao = $1,
          updated_at = NOW()
      FROM patients p
      WHERE p.id = s.patient_id
        AND p.full_name = $2
        AND s.organization_id = '00000000-0000-0000-0000-000000000001'
        AND s.date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
        AND s.observacao ILIKE 'Navegação principal%'
      RETURNING s.id, p.full_name, s.date::text, length(s.observacao) AS len
    `, [item.conteudo_texto, item.name]);
    console.log(`Atualizado banco ${item.name}:`, JSON.stringify(result.rows));
    const file = jsonFiles[item.name];
    if (file) {
      const json = JSON.parse(await readFile(file, 'utf8'));
      for (const ev of json.historico || []) {
        if (String(ev.appointment_id) === String(item.appointmentId)) ev.conteudo_texto = item.conteudo_texto;
      }
      await writeFile(file, JSON.stringify(json, null, 2));
      console.log(`Atualizado JSON ${file}`);
    }
  }
} finally {
  await client.end();
}
