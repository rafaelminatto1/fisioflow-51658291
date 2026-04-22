-- FisioFlow AI Configuration System
-- Per-organization model preferences and model catalog

-- ============================================================
-- Tabela: ai_models (catálogo de modelos disponíveis)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('zai', 'workers-ai', 'openai', 'anthropic', 'gemini')),
  display_name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] DEFAULT '{}',
  input_cost_per_1m DECIMAL DEFAULT 0,
  output_cost_per_1m DECIMAL DEFAULT 0,
  cached_cost_per_1m DECIMAL DEFAULT 0,
  context_length INT,
  is_free BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tabela: ai_config (configuração por organização)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  default_chat_model TEXT DEFAULT 'glm-4.7-flash' REFERENCES ai_models(id),
  default_analysis_model TEXT DEFAULT 'glm-4.7-flash' REFERENCES ai_models(id),
  default_vision_model TEXT DEFAULT 'glm-5v-turbo' REFERENCES ai_models(id),
  default_transcription_model TEXT DEFAULT 'glm-asr-2512' REFERENCES ai_models(id),
  default_embedding_model TEXT DEFAULT '@cf/baai/bge-base-en-v1.5',
  thinking_enabled BOOLEAN DEFAULT false,
  thinking_budget TEXT DEFAULT 'MEDIUM' CHECK (thinking_budget IN ('MINIMAL', 'LOW', 'MEDIUM', 'HIGH')),
  monthly_budget_usd DECIMAL DEFAULT 50.00,
  current_spend_usd DECIMAL DEFAULT 0.00,
  spend_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);

-- ============================================================
-- Tabela: ai_usage_logs (auditoria de uso de IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  model_id TEXT NOT NULL REFERENCES ai_models(id),
  task_type TEXT NOT NULL,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cached_tokens INT DEFAULT 0,
  cost_usd DECIMAL DEFAULT 0,
  latency_ms INT,
  was_cache_hit BOOLEAN DEFAULT false,
  was_fallback BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Seed: modelos disponíveis
-- ============================================================
INSERT INTO ai_models (id, provider, display_name, description, capabilities, input_cost_per_1m, output_cost_per_1m, cached_cost_per_1m, context_length, is_free, is_default, sort_order) VALUES
-- Z.AI (GLM) - Primary provider
('glm-4.7-flash', 'zai', 'GLM-4.7 Flash', 'Rápido e gratuito. Ideal para uso diário. 200K contexto.', '{chat,thinking}', 0, 0, 0, 200000, true, true, 1),
('glm-5.1', 'zai', 'GLM-5.1', 'Flagship. 200K contexto, thinking avançado, function calling.', '{chat,thinking,function-calling}', 1.40, 4.40, 0.26, 200000, false, false, 2),
('glm-5v-turbo', 'zai', 'GLM-5V Turbo', 'Multimodal com visão. Analisa imagens e vídeos.', '{chat,vision,thinking}', 1.20, 4.00, 0.24, 200000, false, false, 10),
('glm-asr-2512', 'zai', 'GLM-ASR', 'Transcrição de áudio. Português nativo.', '{audio,transcription}', 0.03, 0, 0, NULL, false, false, 20),
-- Workers AI (Cloudflare Edge) - Free
('workers-llama-3.3-70b', 'workers-ai', 'Llama 3.3 70B (Edge)', 'Edge inference grátis. Boa qualidade geral.', '{chat}', 0, 0, 0, NULL, true, false, 5),
('workers-llama-3.1-8b', 'workers-ai', 'Llama 3.1 8B (Edge)', 'Ultra-rápido edge. Para tarefas simples.', '{chat}', 0, 0, 0, NULL, true, false, 6),
('workers-whisper', 'workers-ai', 'Whisper V3 Turbo (Edge)', 'Transcrição de áudio na edge.', '{audio,transcription}', 0, 0, 0, NULL, true, false, 21),
('workers-nova-3', 'workers-ai', 'Deepgram Nova-3 (Edge)', 'Transcrição pt-BR nativo na edge.', '{audio,transcription}', 0, 0, 0, NULL, true, false, 22),
('workers-embeddings', 'workers-ai', 'BGE Embeddings (Edge)', 'Embeddings para busca semântica.', '{embeddings}', 0, 0, 0, NULL, true, false, 30),
-- OpenAI (via AI Gateway)
('gpt-4o', 'openai', 'GPT-4o', 'OpenAI flagship. Bom em português e visão.', '{chat,vision}', 2.50, 10.00, 1.25, 128000, false, false, 3),
('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'Rápido e barato da OpenAI.', '{chat}', 0.15, 0.60, 0.075, 128000, false, false, 4),
-- Anthropic (via AI Gateway)
('claude-sonnet-4', 'anthropic', 'Claude Sonnet 4', 'Excelente em análise clínica e raciocínio.', '{chat,thinking}', 3.00, 15.00, 1.50, 200000, false, false, 7),
-- Gemini (Legacy - manter compatibilidade)
('gemini-3-flash', 'gemini', 'Gemini 3 Flash (Legacy)', 'Google Gemini 3 Flash. Já configurado.', '{chat,thinking}', 0, 0, 0, 1000000, true, false, 8)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  input_cost_per_1m = EXCLUDED.input_cost_per_1m,
  output_cost_per_1m = EXCLUDED.output_cost_per_1m,
  cached_cost_per_1m = EXCLUDED.cached_cost_per_1m,
  context_length = EXCLUDED.context_length,
  is_free = EXCLUDED.is_free,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_config_org ON ai_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org ON ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_available ON ai_models(is_available) WHERE is_available = true;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- ai_models: leitura pública (todos podem ver modelos disponíveis)
CREATE POLICY "ai_models_read" ON ai_models FOR SELECT USING (true);

-- ai_config: apenas membros da organização
CREATE POLICY "ai_config_read" ON ai_config FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = (auth.jwt() -> 'sub')::uuid AND active = true)
);
CREATE POLICY "ai_config_write" ON ai_config FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = (auth.jwt() -> 'sub')::uuid AND active = true AND role IN ('owner', 'admin'))
);

-- ai_usage_logs: apenas leitura pela organização
CREATE POLICY "ai_usage_logs_read" ON ai_usage_logs FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = (auth.jwt() -> 'sub')::uuid AND active = true)
);
CREATE POLICY "ai_usage_logs_insert" ON ai_usage_logs FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = (auth.jwt() -> 'sub')::uuid AND active = true)
);

-- ============================================================
-- Função: reset mensal de spend
-- ============================================================
CREATE OR REPLACE FUNCTION reset_ai_spend()
RETURNS void AS $$
BEGIN
  UPDATE ai_config
  SET current_spend_usd = 0, spend_reset_at = now(), updated_at = now()
  WHERE spend_reset_at < now() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
