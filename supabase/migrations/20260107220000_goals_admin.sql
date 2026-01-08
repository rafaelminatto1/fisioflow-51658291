-- Enums
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ARCHIVE');
CREATE TYPE profile_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- 1. Extend Goal Profiles
ALTER TABLE goal_profiles 
ADD COLUMN status profile_status DEFAULT 'DRAFT',
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN published_at TIMESTAMPTZ,
ADD COLUMN published_by_user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_goal_profiles_status ON goal_profiles(status);

-- 2. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    actor_id UUID REFERENCES auth.users(id),
    actor_email TEXT, -- Snapshot for convenience
    
    action audit_action NOT NULL,
    entity TEXT NOT NULL, -- "GoalProfile", "GoalTarget"
    entity_id TEXT NOT NULL,
    
    before JSONB,
    after JSONB,
    
    metadata JSONB, -- Extra info if needed
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS for Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins/Clinicians can read logs
CREATE POLICY "Admins/Clinicians view audit logs" ON audit_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'clinician')
    ));

-- Only System/Edge Functions usually write logs, but if Client writes:
CREATE POLICY "Admins/Clinicians create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'clinician')
    ));
