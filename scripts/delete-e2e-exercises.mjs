import fs from 'node:fs';
import { Client } from 'pg';

const APPLY = process.argv.includes('--apply');
const ENV_PATH = process.env.E2E_DELETE_ENV_PATH || '.env.production';

function loadEnvFile(path) {
  const envText = fs.readFileSync(path, 'utf8');

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function buildSummary(sampleRows, count, updatedCount = 0) {
  return {
    mode: APPLY ? 'apply' : 'dry-run',
    count,
    updatedCount,
    sample: sampleRows.map((row) => ({
      id: row.id,
      name: row.name,
    })),
  };
}

loadEnvFile(ENV_PATH);

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL not found in ${ENV_PATH}`);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});

const WHERE_CLAUSE = `
  is_active = true
  and (
    name ilike 'E2E %'
    or description ilike '%E2E%'
  )
`;

try {
  await client.connect();

  const sampleResult = await client.query(`
    select id, name
    from exercises
    where ${WHERE_CLAUSE}
    order by updated_at desc nulls last, created_at desc nulls last
    limit 15
  `);

  const countResult = await client.query(`
    select count(*)::int as count
    from exercises
    where ${WHERE_CLAUSE}
  `);

  const count = Number(countResult.rows[0]?.count ?? 0);

  if (!APPLY) {
    console.log(JSON.stringify(buildSummary(sampleResult.rows, count), null, 2));
    process.exit(0);
  }

  const updateResult = await client.query(`
    update exercises
    set
      is_active = false,
      updated_at = now()
    where ${WHERE_CLAUSE}
    returning id
  `);

  console.log(
    JSON.stringify(
      buildSummary(sampleResult.rows, count, updateResult.rowCount ?? 0),
      null,
      2,
    ),
  );
} finally {
  await client.end().catch(() => {});
}
