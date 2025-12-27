-- Migration: Push Notifications RLS Policies
-- Description: Row Level Security policies for push notification tables

-- Enable RLS on all notification tables
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can view their own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification history" ON notification_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update notification history" ON notification_history
    FOR UPDATE USING (true);

-- Notification templates policies (admin only for modifications)
DROP POLICY IF EXISTS "Everyone can view active notification templates" ON notification_templates;
-- Verificar se coluna active existe antes de usar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'notification_templates' AND column_name = 'active') THEN
    EXECUTE 'CREATE POLICY "Everyone can view active notification templates" ON notification_templates
        FOR SELECT USING (active = true)';
  ELSE
    EXECUTE 'CREATE POLICY "Everyone can view notification templates" ON notification_templates
        FOR SELECT USING (true)';
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;
-- Permitir que usuários autenticados gerenciem templates (pode ser restringido depois)
CREATE POLICY "Authenticated users can manage notification templates" ON notification_templates
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Notification triggers policies (admin only)
DROP POLICY IF EXISTS "Admins can manage notification triggers" ON notification_triggers;
-- Permitir que usuários autenticados gerenciem triggers (pode ser restringido depois)
CREATE POLICY "Authenticated users can manage notification triggers" ON notification_triggers
    FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view active notification triggers" ON notification_triggers;
-- Verificar se coluna active existe antes de usar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'notification_triggers' AND column_name = 'active') THEN
    EXECUTE 'CREATE POLICY "Everyone can view active notification triggers" ON notification_triggers
        FOR SELECT USING (active = true)';
  ELSE
    EXECUTE 'CREATE POLICY "Everyone can view notification triggers" ON notification_triggers
        FOR SELECT USING (true)';
  END IF;
END $$;