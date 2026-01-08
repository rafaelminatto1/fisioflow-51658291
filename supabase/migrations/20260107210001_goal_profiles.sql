-- Create ENUMs
CREATE TYPE test_type AS ENUM ('GAIT', 'SQUAT_OVERHEAD', 'ROMBERG', 'CUSTOM', 'AUTO');
CREATE TYPE target_mode AS ENUM ('CUT_OFF', 'IMPROVEMENT_ABS', 'IMPROVEMENT_PCT', 'RANGE', 'CUSTOM');
CREATE TYPE goal_profile_source AS ENUM ('DB', 'CODE');

-- 1. Goal Profiles
CREATE TABLE goal_profiles (
    id TEXT PRIMARY KEY, -- e.g. "acl_rts_readiness"
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    applicable_tests test_type[] NOT NULL,
    
    quality_gate JSONB,
    evidence JSONB,
    tags TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Goal Targets (Metrics within a profile)
CREATE TABLE goal_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL REFERENCES goal_profiles(id) ON DELETE CASCADE,
    
    key TEXT NOT NULL, -- e.g. "prom.acl_rsi_0_100"
    mode target_mode NOT NULL,
    
    min FLOAT,
    max FLOAT,
    min_delta_abs FLOAT,
    min_delta_pct FLOAT,
    
    is_optional BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    
    sort_order INTEGER DEFAULT 0,
    label_override TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(profile_id, key)
);

CREATE INDEX idx_goal_targets_profile_order ON goal_targets(profile_id, sort_order);

-- 3. Patient Assignments
CREATE TABLE patient_goal_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    clinic_id UUID, -- Optional link to clinic
    patient_id TEXT NOT NULL, -- Text to allow mock IDs, but ideally references auth.users(id)
    
    profile_id TEXT NOT NULL, -- "acl_rts_readiness"
    profile_source goal_profile_source DEFAULT 'CODE',
    
    goal_profile_db_id TEXT REFERENCES goal_profiles(id), -- Optional link if source=DB
    
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_patient_active ON patient_goal_assignments(patient_id, is_active);

-- 4. Patient Overrides (Specific customization per assignment)
CREATE TABLE patient_goal_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES patient_goal_assignments(id) ON DELETE CASCADE,
    
    key TEXT NOT NULL,
    
    mode target_mode,
    min FLOAT,
    max FLOAT,
    min_delta_abs FLOAT,
    min_delta_pct FLOAT,
    
    is_optional BOOLEAN,
    is_enabled BOOLEAN,
    label_override TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(assignment_id, key)
);

-- RLS
ALTER TABLE goal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goal_overrides ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for dev/demo)
CREATE POLICY "Public read profiles" ON goal_profiles FOR SELECT USING (true);
CREATE POLICY "Public read targets" ON goal_targets FOR SELECT USING (true);

-- Assignment Policies
CREATE POLICY "Users view own assignments" ON patient_goal_assignments 
    FOR SELECT USING (auth.uid()::text = patient_id OR EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'clinician')
    ));

CREATE POLICY "Clinicians manage assignments" ON patient_goal_assignments
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'clinician')
    ));

-- Override Policies
CREATE POLICY "Users view own overrides" ON patient_goal_overrides
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM patient_goal_assignments a 
        WHERE a.id = patient_goal_overrides.assignment_id 
        AND (a.patient_id = auth.uid()::text OR EXISTS (
            SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'clinician')
        ))
    ));

CREATE POLICY "Clinicians manage overrides" ON patient_goal_overrides
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'clinician')
    ));
