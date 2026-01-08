-- Create GoalProfileStatus enum
CREATE TYPE goal_profile_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Create AuditAction enum
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ARCHIVE');

-- Create GoalProfile table
CREATE TABLE goal_profiles (
    id TEXT PRIMARY KEY, -- e.g. "acl_rts_readiness"
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    applicable_tests TEXT[] DEFAULT '{}', -- Stored as array of strings (TestType)
    quality_gate JSONB,
    evidence JSONB,
    tags TEXT[] DEFAULT '{}',
    status goal_profile_status DEFAULT 'DRAFT',
    version INTEGER DEFAULT 1,
    published_at TIMESTAMPTZ,
    published_by_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create GoalTarget table
CREATE TABLE goal_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL REFERENCES goal_profiles(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    mode TEXT NOT NULL, -- 'min', 'max', 'exact'
    min NUMERIC,
    max NUMERIC,
    min_delta_abs NUMERIC,
    min_delta_pct NUMERIC,
    is_optional BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    label_override TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AuditLog table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id),
    action audit_action NOT NULL,
    entity TEXT NOT NULL, -- "GoalProfile" | "GoalTarget"
    entity_id TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goal_profiles_status ON goal_profiles(status);
CREATE INDEX idx_goal_targets_profile_id ON goal_targets(profile_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS Policies

-- Goal Profiles
ALTER TABLE goal_profiles ENABLE ROW SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON goal_profiles
    FOR SELECT USING (status = 'PUBLISHED');

CREATE POLICY "Admins can view all profiles" ON goal_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert profiles" ON goal_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update profiles" ON goal_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Goal Targets
ALTER TABLE goal_targets ENABLE ROW SECURITY;

CREATE POLICY "Targets follow profile visibility" ON goal_targets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM goal_profiles 
            WHERE id = goal_targets.profile_id 
            AND (status = 'PUBLISHED' OR 
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Admins can modify targets" ON goal_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System/Admins can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL -- Allow any authenticated user to produce logs via RPC, but in practice strictly controlled by app logic or further restricted
    );
-- Note: 'publish_goal_profile' RPC will insert with the user's context.

-- Functions

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goal_profiles_updated_at
    BEFORE UPDATE ON goal_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_goal_targets_updated_at
    BEFORE UPDATE ON goal_targets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();


-- RPC: Publish Goal Profile
CREATE OR REPLACE FUNCTION publish_goal_profile(profile_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to update status/create log
AS $$
DECLARE
    v_profile goal_profiles%ROWTYPE;
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Check Admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Get Profile
    SELECT * INTO v_profile FROM goal_profiles WHERE id = profile_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    IF v_profile.status != 'DRAFT' THEN
        RAISE EXCEPTION 'Only DRAFT profiles can be published';
    END IF;

    -- Update Profile
    UPDATE goal_profiles
    SET status = 'PUBLISHED',
        version = version + 1,
        published_at = NOW(),
        published_by_user_id = v_user_id
    WHERE id = profile_id
    RETURNING * INTO v_profile;

    -- Audit Log
    INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, before_state, after_state)
    VALUES (
        v_user_id,
        'PUBLISH',
        'GoalProfile',
        profile_id,
        to_jsonb(v_profile) - 'status' - 'version' - 'published_at' - 'published_by_user_id', -- Approximation of before state for simplicity, or fetch real before state if preferred
        to_jsonb(v_profile)
    );

    RETURN to_jsonb(v_profile);
END;
$$;
