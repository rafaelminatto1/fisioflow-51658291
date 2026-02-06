import { getPool } from '../init';

const MIGRATION_API_KEY = process.env.MIGRATION_API_KEY || 'fisioflow-migration-2026';

function extractApiKey(req: any): string {
  const queryKey = req?.query?.key;
  if (Array.isArray(queryKey)) return String(queryKey[0] || '');
  if (typeof queryKey === 'string') return queryKey;

  const headerKey = req?.headers?.['x-migration-key'];
  if (Array.isArray(headerKey)) return String(headerKey[0] || '');
  if (typeof headerKey === 'string') return headerKey;

  return '';
}

export const runPatientRagSchemaHandler = async (req: any, res: any) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed - use POST' });
    return;
  }

  const apiKey = extractApiKey(req);
  if (apiKey !== MIGRATION_API_KEY) {
    res.status(403).json({ error: 'Forbidden - invalid migration key' });
    return;
  }

  const pool = getPool();
  const client = await pool.connect();
  const steps: Array<{ step: string; success: boolean; message?: string; error?: string }> = [];

  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    steps.push({ step: 'enable_pgvector', success: true });

    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_rag_chunks (
        id BIGSERIAL PRIMARY KEY,
        patient_id TEXT NOT NULL,
        organization_id TEXT,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_date TIMESTAMPTZ,
        document_key TEXT NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        chunk_text TEXT NOT NULL,
        chunk_hash TEXT NOT NULL,
        embedding vector(768),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    steps.push({ step: 'create_table_patient_rag_chunks', success: true });

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_rag_chunks_unique
      ON patient_rag_chunks (patient_id, document_key, chunk_index, chunk_hash)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_patient_org_date
      ON patient_rag_chunks (patient_id, organization_id, source_date DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_source
      ON patient_rag_chunks (source_type, source_date DESC)
    `);
    steps.push({ step: 'create_btree_indexes', success: true });

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_embedding_hnsw
        ON patient_rag_chunks USING hnsw (embedding vector_cosine_ops)
      `);
      steps.push({ step: 'create_vector_index_hnsw', success: true, message: 'hnsw' });
    } catch (hnswError) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_embedding_ivfflat
        ON patient_rag_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
      steps.push({
        step: 'create_vector_index_ivfflat',
        success: true,
        message: `fallback_ivfflat (${(hnswError as Error).message})`,
      });
    }

    await client.query('ANALYZE patient_rag_chunks');
    steps.push({ step: 'analyze_table', success: true });

    await client.query('COMMIT');

    const verify = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'patient_rag_chunks'
      ORDER BY indexname
    `);

    res.json({
      success: true,
      message: 'Patient RAG schema migration completed',
      steps,
      indexes: verify.rows.map((row: Record<string, unknown>) => row.indexname),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      steps,
    });
  } finally {
    client.release();
  }
};
