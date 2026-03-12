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

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- Knowledge Base Table - Para artigos e PDFs
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(255), -- URL, arquivo, etc.
  category VARCHAR(100), -- 'exercise', 'condition', 'treatment', etc.
  tags TEXT[],
  embedding VECTOR(768), -- Para busca semântica (opcional)
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category searches
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING GIN(tags);

-- Gemini File Store - Arquivos indexados pelo Gemini
CREATE TABLE IF NOT EXISTS gemini_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_uri VARCHAR(500), -- URI do arquivo no Gemini
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, expired
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;