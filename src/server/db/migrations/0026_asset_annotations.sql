CREATE TABLE IF NOT EXISTS asset_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id text NOT NULL,
  version integer NOT NULL,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset_version
  ON asset_annotations (asset_id, version DESC);
