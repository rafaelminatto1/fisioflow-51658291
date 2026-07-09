-- Tarefas: integrações + paridade Jira/Asana/Monday (specs/tarefas-integracoes)
-- 1) telefone do membro (WhatsApp p/ tarefas URGENTES)
-- 2) comentários com @menção
-- 3) templates de tarefa
-- 4) recorrência
-- 5) log de notificação (dedup WhatsApp de vencimento)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS recurrence JSONB;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID;
CREATE INDEX IF NOT EXISTS idx_tarefas_recurrence_parent
  ON tarefas (recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tarefa_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name VARCHAR(255),
  content TEXT NOT NULL,
  mentions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tarefa_comments_tarefa
  ON tarefa_comments (tarefa_id, created_at);

CREATE TABLE IF NOT EXISTS tarefa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(30) NOT NULL DEFAULT 'TAREFA',
  prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
  tags TEXT[] NOT NULL DEFAULT '{}',
  checklists JSONB NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tarefa_templates_org
  ON tarefa_templates (organization_id, created_at DESC);

-- Dedup de notificações automáticas por tarefa (ex.: WhatsApp de vencimento 1x/dia)
CREATE TABLE IF NOT EXISTS tarefa_notification_log (
  tarefa_id UUID NOT NULL,
  kind TEXT NOT NULL,
  sent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tarefa_id, kind, sent_on)
);

ALTER TABLE tarefa_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_comments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_tarefa_comments ON tarefa_comments;
CREATE POLICY org_isolation_tarefa_comments ON tarefa_comments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

ALTER TABLE tarefa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_tarefa_templates ON tarefa_templates;
CREATE POLICY org_isolation_tarefa_templates ON tarefa_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
