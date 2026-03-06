-- Enable Row Level Security
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_templates ENABLE ROW LEVEL SECURITY;

-- Policy for Exercises
CREATE POLICY exercises_org_isolation ON exercises
  FOR ALL
  USING (
    organization_id IS NULL 
    OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
  );

-- Policy for Protocols
CREATE POLICY protocols_org_isolation ON exercise_protocols
  FOR ALL
  USING (
    organization_id IS NULL 
    OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
  );

-- Policy for Templates
CREATE POLICY templates_org_isolation ON exercise_templates
  FOR ALL
  USING (
    organization_id IS NULL 
    OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
  );
