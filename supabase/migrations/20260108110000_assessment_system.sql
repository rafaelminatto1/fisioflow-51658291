-- Create assessment_templates table
CREATE TABLE assessment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('anamnesis', 'physical_exam', 'evolution', 'pilates')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() -- For RLS ownership
);

-- Create assessment_sections table
CREATE TABLE assessment_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES assessment_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  description TEXT 
);

-- Create assessment_questions table
CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES assessment_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'text', 'long_text', 'number', 'single_choice', 'multiple_choice', 'scale', 'date', 'body_map'
  options JSONB, -- For choice types
  required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  placeholder TEXT,
  meta_data JSONB 
);

-- Create patient_assessments table
CREATE TABLE patient_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  template_id UUID REFERENCES assessment_templates(id),
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Create assessment_responses table
CREATE TABLE assessment_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES patient_assessments(id) ON DELETE CASCADE,
  question_id UUID REFERENCES assessment_questions(id),
  value_text TEXT,
  value_number NUMERIC,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

-- Create policies (Basic: users can see/edit their own data)
-- Assuming 'auth.uid()' matches 'user_id' or 'created_by'

CREATE POLICY "Users can view their own templates" ON assessment_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON assessment_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON assessment_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON assessment_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Sections policies (inherit via template_id check or simple generic read if template is accessible)
-- keeping it simple: can read if auth.uid is present (or join with template)
-- optimizing for standard app usage where isolation is key

CREATE POLICY "Users can view sections of their templates" ON assessment_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_templates
      WHERE assessment_templates.id = assessment_sections.template_id
      AND assessment_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sections to their templates" ON assessment_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_templates
      WHERE assessment_templates.id = assessment_sections.template_id
      AND assessment_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sections of their templates" ON assessment_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assessment_templates
      WHERE assessment_templates.id = assessment_sections.template_id
      AND assessment_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sections of their templates" ON assessment_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assessment_templates
      WHERE assessment_templates.id = assessment_sections.template_id
      AND assessment_templates.user_id = auth.uid()
    )
  );
  
-- Questions policies

CREATE POLICY "Users can view questions of their templates" ON assessment_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_sections
      JOIN assessment_templates ON assessment_templates.id = assessment_sections.template_id
      WHERE assessment_sections.id = assessment_questions.section_id
      AND assessment_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions to their templates" ON assessment_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_sections
      JOIN assessment_templates ON assessment_templates.id = assessment_sections.template_id
      WHERE assessment_sections.id = assessment_questions.section_id
      AND assessment_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions of their templates" ON assessment_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assessment_sections
      JOIN assessment_templates ON assessment_templates.id = assessment_sections.template_id
      WHERE assessment_sections.id = assessment_questions.section_id
      AND assessment_templates.user_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can delete questions of their templates" ON assessment_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assessment_sections
      JOIN assessment_templates ON assessment_templates.id = assessment_sections.template_id
      WHERE assessment_sections.id = assessment_questions.section_id
      AND assessment_templates.user_id = auth.uid()
    )
  );

-- Patient Assessments Policies
CREATE POLICY "Users can view their assessments" ON patient_assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their assessments" ON patient_assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their assessments" ON patient_assessments
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their assessments" ON patient_assessments
  FOR DELETE USING (auth.uid() = user_id);

-- Assessment Responses Policies
CREATE POLICY "Users can view their assessment responses" ON assessment_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_assessments
      WHERE patient_assessments.id = assessment_responses.assessment_id
      AND patient_assessments.user_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can insert their assessment responses" ON assessment_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient_assessments
      WHERE patient_assessments.id = assessment_responses.assessment_id
      AND patient_assessments.user_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can update their assessment responses" ON assessment_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patient_assessments
      WHERE patient_assessments.id = assessment_responses.assessment_id
      AND patient_assessments.user_id = auth.uid()
    )
  );
