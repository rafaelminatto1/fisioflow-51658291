CREATE OR REPLACE FUNCTION private.audit_trigger_func()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM private.log_audit_event(
            TG_TABLE_NAME || '_created',
            CASE
                WHEN TG_TABLE_NAME IN ('patients', 'sessions', 'medical_records', 'exercises', 'exercise_videos') THEN 'clinical'
                WHEN TG_TABLE_NAME IN ('users', 'roles', 'user_roles') THEN 'security'
                WHEN TG_TABLE_NAME IN ('payments', 'packages') THEN 'admin'
                ELSE 'api'
            END,
            TG_TABLE_NAME::text,
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW),
            true,
            NULL,
            jsonb_build_object('trigger_name', TG_NAME)
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM private.log_audit_event(
            TG_TABLE_NAME || '_updated',
            CASE
                WHEN TG_TABLE_NAME IN ('patients', 'sessions', 'medical_records') THEN 'clinical'
                WHEN TG_TABLE_NAME IN ('users', 'roles') THEN 'security'
                WHEN TG_TABLE_NAME IN ('payments', 'packages') THEN 'admin'
                ELSE 'api'
            END,
            TG_TABLE_NAME::text,
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            true,
            NULL,
            jsonb_build_object(
                'trigger_name', TG_NAME,
                'changed_fields', (
                    SELECT jsonb_object_agg(coalesce(o.key, n.key), jsonb_build_object('old', o.value, 'new', n.value))
                    FROM jsonb_each_text(to_jsonb(OLD)) o(key, value)
                    FULL OUTER JOIN jsonb_each_text(to_jsonb(NEW)) n(key, value) USING (key)
                    WHERE o.value IS DISTINCT FROM n.value
                )
            )
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        PERFORM private.log_audit_event(
            TG_TABLE_NAME || '_deleted',
            CASE
                WHEN TG_TABLE_NAME IN ('patients', 'sessions', 'medical_records') THEN 'clinical'
                WHEN TG_TABLE_NAME IN ('users', 'roles') THEN 'security'
                WHEN TG_TABLE_NAME IN ('payments', 'packages') THEN 'admin'
                ELSE 'api'
            END,
            TG_TABLE_NAME::text,
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            true,
            NULL,
            jsonb_build_object('trigger_name', TG_NAME)
        );
        RETURN OLD;
    END IF;
END;
$$;
