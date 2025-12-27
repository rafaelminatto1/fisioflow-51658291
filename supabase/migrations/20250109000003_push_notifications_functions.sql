-- Migration: Push Notifications Database Functions
-- Description: Helper functions for push notification system

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when user is created
CREATE TRIGGER on_auth_user_created_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Function to check if user should receive notifications based on preferences and quiet hours
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type VARCHAR(50),
    p_current_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    prefs notification_preferences%ROWTYPE;
    current_time_only TIME;
    current_day_of_week INTEGER;
BEGIN
    -- Get user preferences
    SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
    
    -- If no preferences found, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if notification type is enabled
    CASE p_notification_type
        WHEN 'appointment_reminder' THEN
            IF NOT prefs.appointment_reminders THEN RETURN FALSE; END IF;
        WHEN 'exercise_reminder' THEN
            IF NOT prefs.exercise_reminders THEN RETURN FALSE; END IF;
        WHEN 'progress_update' THEN
            IF NOT prefs.progress_updates THEN RETURN FALSE; END IF;
        WHEN 'system_alert' THEN
            IF NOT prefs.system_alerts THEN RETURN FALSE; END IF;
        WHEN 'therapist_message' THEN
            IF NOT prefs.therapist_messages THEN RETURN FALSE; END IF;
        WHEN 'payment_reminder' THEN
            IF NOT prefs.payment_reminders THEN RETURN FALSE; END IF;
        ELSE
            RETURN FALSE;
    END CASE;
    
    -- Check weekend notifications
    current_day_of_week := EXTRACT(DOW FROM p_current_time);
    IF (current_day_of_week = 0 OR current_day_of_week = 6) AND NOT prefs.weekend_notifications THEN
        RETURN FALSE;
    END IF;
    
    -- Check quiet hours
    current_time_only := p_current_time::TIME;
    IF prefs.quiet_hours_start IS NOT NULL AND prefs.quiet_hours_end IS NOT NULL THEN
        -- Handle quiet hours that span midnight
        IF prefs.quiet_hours_start > prefs.quiet_hours_end THEN
            IF current_time_only >= prefs.quiet_hours_start OR current_time_only <= prefs.quiet_hours_end THEN
                RETURN FALSE;
            END IF;
        ELSE
            IF current_time_only >= prefs.quiet_hours_start AND current_time_only <= prefs.quiet_hours_end THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log notification delivery
CREATE OR REPLACE FUNCTION log_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}',
    p_status VARCHAR(20) DEFAULT 'sent'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notification_history (user_id, type, title, body, data, status)
    VALUES (p_user_id, p_type, p_title, p_body, p_data, p_status)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification status
DROP FUNCTION IF EXISTS update_notification_status(UUID, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION update_notification_status(
    p_notification_id UUID,
    p_status VARCHAR(20),
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notification_history 
    SET 
        status = p_status,
        error_message = p_error_message,
        delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
        clicked_at = CASE WHEN p_status = 'clicked' THEN NOW() ELSE clicked_at END,
        retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification analytics
CREATE OR REPLACE FUNCTION get_notification_analytics(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    notification_type VARCHAR(50),
    total_sent BIGINT,
    total_delivered BIGINT,
    total_clicked BIGINT,
    total_failed BIGINT,
    delivery_rate NUMERIC,
    click_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nh.type as notification_type,
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE nh.status = 'delivered' OR nh.status = 'clicked') as total_delivered,
        COUNT(*) FILTER (WHERE nh.status = 'clicked') as total_clicked,
        COUNT(*) FILTER (WHERE nh.status = 'failed') as total_failed,
        ROUND(
            (COUNT(*) FILTER (WHERE nh.status = 'delivered' OR nh.status = 'clicked')::NUMERIC / 
             NULLIF(COUNT(*), 0)) * 100, 2
        ) as delivery_rate,
        ROUND(
            (COUNT(*) FILTER (WHERE nh.status = 'clicked')::NUMERIC / 
             NULLIF(COUNT(*) FILTER (WHERE nh.status = 'delivered' OR nh.status = 'clicked'), 0)) * 100, 2
        ) as click_rate
    FROM notification_history nh
    WHERE 
        nh.sent_at >= p_start_date 
        AND nh.sent_at <= p_end_date
        AND (p_user_id IS NULL OR nh.user_id = p_user_id)
    GROUP BY nh.type
    ORDER BY total_sent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;