-- Migration 0048: Board Labels, Checklist Templates e Automações
-- Fase 1 MVP: etiquetas coloridas gerenciadas por board
-- Fase 3 schema: motor de automações opt-in

-- ============================================================
-- BOARD LABELS (etiquetas coloridas por board)
-- ============================================================
CREATE TABLE IF NOT EXISTS board_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#94A3B8',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_labels_board ON board_labels(board_id);
CREATE INDEX IF NOT EXISTS idx_board_labels_org ON board_labels(organization_id);

-- ============================================================
-- BOARD CHECKLIST TEMPLATES (reutilizáveis por board ou org)
-- ============================================================
CREATE TABLE IF NOT EXISTS board_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE, -- NULL = global da org
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  -- cada item: { text: string, assignee_role?: string, due_offset_days?: number }
  category TEXT, -- 'tratamento' | 'avaliacao' | 'administrativo' | 'outro'
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_board ON board_checklist_templates(board_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON board_checklist_templates(organization_id);

-- ============================================================
-- BOARD AUTOMATIONS (motor de regras opt-in)
-- ============================================================
CREATE TABLE IF NOT EXISTS board_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger JSONB NOT NULL,
  -- ex: { type: "status_changed", from: "EM_PROGRESSO", to: "CONCLUIDO" }
  -- ex: { type: "checklist_completed" }
  -- ex: { type: "label_added", label_id: "uuid" }
  -- ex: { type: "task_created" }
  -- ex: { type: "due_date_approaching", days_before: 1 }
  conditions JSONB NOT NULL DEFAULT '[]',
  -- cada condição: { field: string, operator: string, value: unknown }
  actions JSONB NOT NULL DEFAULT '[]',
  -- cada ação:
  --   { type: "change_status", column_id?: string, status?: string }
  --   { type: "assign_label", label_id: string }
  --   { type: "remove_label", label_id: string }
  --   { type: "assign_user", user_id: string }
  --   { type: "send_notification", message: string, channel: "inapp" | "whatsapp" }
  --   { type: "create_task", titulo: string, column_id?: string }
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_automations_board_active ON board_automations(board_id, is_active);
CREATE INDEX IF NOT EXISTS idx_board_automations_org ON board_automations(organization_id);

-- ============================================================
-- TAREFAS: adicionar label_ids (referências a board_labels)
-- ============================================================
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS label_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tarefas_label_ids ON tarefas USING GIN(label_ids);
