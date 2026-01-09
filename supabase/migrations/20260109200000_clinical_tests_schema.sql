-- Create table for Clinical Test Templates
CREATE TABLE IF NOT EXISTS clinical_test_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'Ombro', 'Joelho', etc.
  description TEXT,
  purpose TEXT, -- 'Síndrome do Impacto Subacromial', etc.
  execution TEXT, -- Detailed step-by-step
  positive_sign TEXT, -- What indicates a positive result
  reference TEXT, -- Bibliographic reference
  tags TEXT[] DEFAULT '{}', -- ['Ortopedia', 'Esportiva']
  youtube_link TEXT, -- Computed or manual link
  type VARCHAR(50) NOT NULL DEFAULT 'special_test', -- 'special_test', 'functional_test'
  media_urls JSONB DEFAULT '[]'::jsonb, -- Array of strings (urls)
  fields_definition JSONB DEFAULT '[]'::jsonb, -- definition of fields for data entry
  calculation_formula TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: organization_id is NULL for system-wide templates (like the seeded ones)

-- Create table for Clinical Test Records (Execution of a test)
CREATE TABLE IF NOT EXISTS clinical_test_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES clinical_test_templates(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  values JSONB NOT NULL DEFAULT '{}'::jsonb, -- Key-value pairs matching fields_definition
  notes TEXT,
  result VARCHAR(50), -- 'positive', 'negative', 'inconclusive' (for simple special tests)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_org ON clinical_test_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_category ON clinical_test_templates(category);
CREATE INDEX IF NOT EXISTS idx_clinical_test_records_patient ON clinical_test_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_test_records_template ON clinical_test_records(template_id);
CREATE INDEX IF NOT EXISTS idx_clinical_test_records_date ON clinical_test_records(date);

-- RLS Policies for clinical_test_templates

ALTER TABLE clinical_test_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates from their organization or system templates (null org)
CREATE POLICY "Users can view templates" ON clinical_test_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    ) OR organization_id IS NULL
  );

-- Policy: Users can create templates for their organization
CREATE POLICY "Users can create templates" ON clinical_test_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update templates from their organization
CREATE POLICY "Users can update templates" ON clinical_test_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete templates from their organization
CREATE POLICY "Users can delete templates" ON clinical_test_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );


-- RLS Policies for clinical_test_records

ALTER TABLE clinical_test_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view records for patients in their organization
CREATE POLICY "Users can view records" ON clinical_test_records
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can create records for patients in their organization
CREATE POLICY "Users can create records" ON clinical_test_records
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update records they created or for patients in their organization
CREATE POLICY "Users can update records" ON clinical_test_records
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete records for patients in their organization
CREATE POLICY "Users can delete records" ON clinical_test_records
  FOR DELETE USING (
    patient_id IN (
      SELECT id FROM patients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Seed Initial Y-Test Template (Complex Functional Test)
INSERT INTO clinical_test_templates (name, category, description, purpose, execution, positive_sign, reference, type, fields_definition)
VALUES (
  'Y Test (Y-Balance Test)',
  'Teste Funcional',
  'Teste de equilíbrio dinâmico e controle neuromuscular do membro inferior.',
  'Avaliar estabilidade dinâmica, controle neuromuscular e risco de lesão.',
  'O paciente equilibra-se em uma perna enquanto alcança a maior distância possível em três direções (Anterior, Posteromedial, Posterolateral) com a perna oposta.',
  'Diferença significativa entre membros (>4cm no alcance anterior) ou baixa pontuação composta.',
  'Plisky PJ, et al. Star Excursion Balance Test as a predictor of lower extremity injury. J Orthop Sports Phys Ther. 2006.',
  'functional_test',
  '[
    {"id": "anterior", "label": "Alcance Anterior", "unit": "cm", "type": "number", "required": true},
    {"id": "posteromedial", "label": "Alcance Posteromedial", "unit": "cm", "type": "number", "required": true},
    {"id": "posterolateral", "label": "Alcance Posterolateral", "unit": "cm", "type": "number", "required": true},
    {"id": "limb_length", "label": "Comprimento do Membro", "unit": "cm", "type": "number", "required": true, "description": "Medido da espinha ilíaca anterossuperior até o maléolo medial"}
  ]'::jsonb
);
