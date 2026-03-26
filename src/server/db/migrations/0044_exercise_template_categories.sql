-- Migration: 0044_exercise_template_categories
-- Creates lookup table for exercise template patient profile categories

CREATE TABLE IF NOT EXISTS exercise_template_categories (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  icon        TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

INSERT INTO exercise_template_categories (id, label, icon, order_index) VALUES
  ('ortopedico',     'Ortopédico',     'bone',            1),
  ('esportivo',      'Esportivo',      'activity',        2),
  ('pos_operatorio', 'Pós-operatório', 'scissors',        3),
  ('prevencao',      'Prevenção',      'shield',          4),
  ('idosos',         'Idosos',         'heart-handshake', 5)
ON CONFLICT DO NOTHING;
