/**
 * Execute AI Cache Migration on Neon DB
 * Uses Neon SQL API via HTTP
 */

// Neon connection string parsed
const NEON_HOST = 'ep-snowy-recipe-a1s4b5zy.us-east-1.aws.neon.tech';
const NEON_DATABASE = 'neondb';
const NEON_USER = 'neondb_owner';
const NEON_PASSWORD = 'npg_9Y1Y3rBf1n3D';

const migrationSQL = `
-- AI Cache Table - Economiza chamadas à API
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT,
  response JSONB NOT NULL,
  model_used VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(255),
  category VARCHAR(100),
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING GIN(tags);

-- Gemini Files Table
CREATE TABLE IF NOT EXISTS gemini_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_uri VARCHAR(500),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
`;

async function runMigration() {
  console.log('🚀 Running AI Cache migration...');
  
  // Neon SQL API endpoint
  const url = `https://${NEON_HOST}/sql`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEON_PASSWORD}`
      },
      body: JSON.stringify({
        database: NEON_DATABASE,
        sql: migrationSQL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Migration failed:', error);
      console.log('\n📝 Please run this SQL manually in Neon Console:');
      console.log(migrationSQL);
      return;
    }

    const result = await response.json();
    console.log('✅ Migration completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error running migration:', error);
    console.log('\n📝 Please run this SQL manually in Neon Console:');
    console.log(migrationSQL);
  }
}

runMigration();