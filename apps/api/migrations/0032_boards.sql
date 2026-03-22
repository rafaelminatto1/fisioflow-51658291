-- Migration 0032: Boards system (Trello/Notion-style)
-- Creates boards and board_columns tables
-- Adds board_id and column_id columns to tarefas

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID,
  background_color VARCHAR(7) DEFAULT '#0079BF',
  background_image TEXT,
  icon TEXT DEFAULT '📋',
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color VARCHAR(7) DEFAULT '#E2E8F0',
  wip_limit INT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE SET NULL;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES board_columns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON board_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_board_id ON tarefas(board_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_column_id ON tarefas(column_id);
