-- ============================================================================
-- Database Webhooks and Automation Migration
-- ============================================================================
--
-- This migration enables database webhooks using pg_net extension.
-- Webhooks allow real-time notifications to external services when database
-- events occur.
--
-- Features:
-- - Appointment reminder triggers
-- - Payment notification hooks
-- - Patient onboarding automation
-- - Custom webhook management
--
-- @see https://supabase.com/docs/guides/database/webhooks
-- @see https://supabase.com/docs/guides/database/extensions/pgnet
-- ============================================================================

-- ============================================================================
-- 1. ENABLE PG_NET EXTENSION
-- ============================================================================

-- Check if pg_net is available, if not enable it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    -- Note: pg_net must be enabled via Supabase Dashboard first
    -- Go to Database > Extensions > pg_net > Enable
    RAISE NOTICE 'Please enable pg_net extension via Supabase Dashboard first';
  END IF;
END $$;

-- ============================================================================
-- 2. WEBHOOK MANAGEMENT TABLES
-- ============================================================================

-- Store webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  endpoint_url TEXT NOT NULL,
  http_method TEXT DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),
  headers JSONB DEFAULT '{}'::jsonb,
  secret_key TEXT, -- For HMAC signature verification
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 5000,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX (is_active),
  INDEX (created_at DESC)
);

-- Webhook subscriptions (which events trigger which webhooks)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE', '*')),
  filter_condition TEXT, -- Optional WHERE clause
  transform_function TEXT, -- Optional function to transform payload
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (webhook_id, table_name, event_type),
  INDEX (table_name, event_type)
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id),
  subscription_id UUID REFERENCES webhook_subscriptions(id),
  event_type TEXT,
  table_name TEXT,
  record_id TEXT,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  INDEX (webhook_id, success),
  INDEX (attempted_at DESC)
);

-- RLS for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Only admins can manage webhooks
CREATE POLICY "Admins can manage webhooks"
  ON webhooks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can manage subscriptions"
  ON webhook_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can view deliveries"
  ON webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 3. WEBHOOK HELPER FUNCTIONS
-- ============================================================================

-- Send webhook using pg_net
CREATE OR REPLACE FUNCTION send_webhook(
  p_webhook_id UUID,
  p_payload JSONB,
  p_subscription_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_table_name TEXT DEFAULT NULL,
  p_record_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_webhook RECORD;
  v_response TEXT;
  v_status INTEGER;
  v_headers TEXT;
  v_secret TEXT;
  v_signature TEXT;
  v_delivery_id UUID;
BEGIN
  -- Get webhook configuration
  SELECT * INTO v_webhook
  FROM webhooks
  WHERE id = p_webhook_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webhook not found or inactive');
  END IF;

  -- Generate HMAC signature if secret key exists
  IF v_webhook.secret_key IS NOT NULL THEN
    v_signature := encode(
      hmac(
        p_payload::text::bytea,
        v_webhook.secret_key::bytea,
        sha256
      ),
      'hex'
    );
  END IF;

  -- Build headers
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'User-Agent', 'FisioFlow-Webhooks/1.0',
    'X-Webhook-ID', gen_random_uuid()::text,
    'X-Webhook-Timestamp', extract(epoch from now())::text,
    'X-Webhook-Signature', v_signature
  ) || v_webhook.headers;

  -- Create delivery log entry
  INSERT INTO webhook_deliveries (
    webhook_id, subscription_id, event_type, table_name, record_id, payload
  ) VALUES (
    p_webhook_id, p_subscription_id, p_event_type, p_table_name, p_record_id, p_payload
  ) RETURNING id INTO v_delivery_id;

  -- Send webhook using pg_net
  BEGIN
    -- pg_net extension call
    SELECT content INTO v_response
    FROM net.http_post(
      url := v_webhook.endpoint_url,
      headers := v_headers,
      body := p_payload::text,
      timeout_milliseconds := v_webhook.timeout_ms
    );

    -- Parse response
    v_status := COALESCE(
      (v_response::jsonb->>'status')::integer,
      200
    );

    -- Update delivery log
    UPDATE webhook_deliveries
    SET
      response_status = v_status,
      response_body = substring(v_response, 1, 10000), -- Limit size
      response_headers = v_headers,
      delivered_at = NOW(),
      success = (v_status BETWEEN 200 AND 299)
    WHERE id = v_delivery_id;

    RETURN jsonb_build_object(
      'success', (v_status BETWEEN 200 AND 299),
      'status', v_status,
      'delivery_id', v_delivery_id
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE webhook_deliveries
    SET
      success = false,
      error_message = SQLERRM
    WHERE id = v_delivery_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'delivery_id', v_delivery_id
    );
  END;
END;
$$;

-- Grant execute on webhook function
GRANT EXECUTE ON FUNCTION send_webhook TO authenticated;

-- ============================================================================
-- 4. TRIGGER FUNCTIONS FOR COMMON EVENTS
-- ============================================================================

-- Generic trigger function to send webhooks
CREATE OR REPLACE FUNCTION trigger_webhooks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
  v_payload JSONB;
  v_transformed JSONB;
  v_result JSONB;
BEGIN
  -- Build base payload
  v_payload := jsonb_build_object(
    'event', TG_TABLE_NAME,
    'type', TG_OP,
    'timestamp', NOW(),
    'data', CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    'old', CASE
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
      ELSE NULL
    END
  );

  -- Find matching subscriptions
  FOR v_subscription IN
    SELECT ws.*, w.*
    FROM webhook_subscriptions ws
    JOIN webhooks w ON w.id = ws.webhook_id
    WHERE ws.table_name = TG_TABLE_NAME
    AND (ws.event_type = TG_OP OR ws.event_type = '*')
    AND w.is_active = true
  LOOP
    -- Apply transformation if specified
    IF v_subscription.transform_function IS NOT NULL THEN
      BEGIN
        -- Execute transform function
        EXECUTE format(
          'SELECT * FROM %L($1)',
          v_subscription.transform_function
        ) INTO v_transformed
        USING v_payload;

        v_payload := COALESCE(v_transformed, v_payload);
      EXCEPTION WHEN OTHERS THEN
        -- Fall back to original payload if transform fails
        v_payload := v_payload;
      END;
    END IF;

    -- Send webhook (async using background worker if available)
    v_result := send_webhook(
      v_subscription.webhook_id,
      v_payload,
      v_subscription.id,
      TG_OP,
      TG_TABLE_NAME,
      CASE
        WHEN TG_OP = 'DELETE' THEN OLD.id::text
        ELSE NEW.id::text
      END
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================================
-- 5. APPOINTMENT WEBHOOK TRIGGERS
-- ============================================================================

-- Attach webhook trigger to appointments table
DROP TRIGGER IF EXISTS appointment_webhooks_trigger ON appointments;
CREATE TRIGGER appointment_webhooks_trigger
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_webhooks();

-- ============================================================================
-- 6. PRE-CONFIGURED WEBHOOKS (Examples)
-- ============================================================================

-- Example: Create webhook for appointment notifications
-- This would typically be done via UI, but here's an example
DO $$
DECLARE
  v_webhook_id UUID;
BEGIN
  -- Check if webhook already exists
  IF NOT EXISTS (SELECT 1 FROM webhooks WHERE name = 'Appointment Notifications') THEN
    -- Insert webhook (update URL with your actual endpoint)
    INSERT INTO webhooks (name, description, endpoint_url, http_method, headers)
    VALUES (
      'Appointment Notifications',
      'Sends notifications when appointments are created, updated, or cancelled',
      'https://fisioflow.vercel.app/api/webhooks/appointments',
      'POST',
      jsonb_build_object('Authorization', 'Bearer YOUR_WEBHOOK_SECRET')
    )
    RETURNING id INTO v_webhook_id;

    -- Subscribe to appointment events
    INSERT INTO webhook_subscriptions (webhook_id, table_name, event_type)
    VALUES
      (v_webhook_id, 'appointments', 'INSERT'),
      (v_webhook_id, 'appointments', 'UPDATE');

    RAISE NOTICE 'Created appointment notifications webhook with ID: %', v_webhook_id;
  END IF;
END $$;

-- ============================================================================
-- 7. PAYMENT WEBHOOK TRIGGERS
-- ============================================================================

-- Attach webhook trigger to payments table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    DROP TRIGGER IF EXISTS payment_webhooks_trigger ON payments;
    CREATE TRIGGER payment_webhooks_trigger
      AFTER INSERT OR UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION trigger_webhooks();
  END IF;
END $$;

-- ============================================================================
-- 8. HELPER VIEWS
-- ============================================================================

-- View for webhook monitoring
CREATE OR REPLACE VIEW webhook_monitor AS
SELECT
  w.name as webhook_name,
  w.endpoint_url,
  ws.table_name,
  ws.event_type,
  COUNT(wd.id) as total_deliveries,
  COUNT(wd.id) FILTER (WHERE wd.success = true) as successful_deliveries,
  COUNT(wd.id) FILTER (WHERE wd.success = false) as failed_deliveries,
  MAX(wd.attempted_at) as last_attempt,
  ROUND(
    100.0 * COUNT(wd.id) FILTER (WHERE wd.success = true) / NULLIF(COUNT(wd.id), 0),
    2
  ) as success_rate
FROM webhooks w
LEFT JOIN webhook_subscriptions ws ON ws.webhook_id = w.id
LEFT JOIN webhook_deliveries wd ON wd.webhook_id = w.id
GROUP BY w.id, w.name, w.endpoint_url, ws.table_name, ws.event_type
ORDER BY last_attempt DESC NULLS LAST;

-- View for recent webhook activity
CREATE OR REPLACE VIEW recent_webhook_activity AS
SELECT
  w.name as webhook_name,
  wd.event_type,
  wd.table_name,
  wd.record_id,
  wd.success,
  wd.response_status,
  wd.attempted_at,
  wd.error_message
FROM webhook_deliveries wd
JOIN webhooks w ON w.id = wd.webhook_id
ORDER BY wd.attempted_at DESC
LIMIT 100;

-- Grant select on views
GRANT SELECT ON webhook_monitor TO authenticated;
GRANT SELECT ON recent_webhook_activity TO authenticated;

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================

COMMENT ON TABLE webhooks IS 'Webhook configurations for external integrations';
COMMENT ON TABLE webhook_subscriptions IS 'Event subscriptions for webhooks';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts';
COMMENT ON FUNCTION send_webhook IS 'Sends a webhook using pg_net extension';
COMMENT ON FUNCTION trigger_webhooks IS 'Generic trigger to send webhooks on table events';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Create a custom webhook
-- INSERT INTO webhooks (name, description, endpoint_url, headers)
-- VALUES (
--   'Slack Notifications',
--   'Send appointment updates to Slack',
--   'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
--   'POST',
--   '{"Content-Type": "application/json"}'::jsonb
-- );
--
-- Example 2: Subscribe to patient events
-- INSERT INTO webhook_subscriptions (webhook_id, table_name, event_type)
-- VALUES ('<webhook_uuid>', 'patients', 'INSERT');

-- ============================================================================
-- NOTIFICATION: Enable pg_net in Supabase Dashboard
-- ============================================================================

-- To use webhooks, enable pg_net extension:
-- 1. Go to Database > Extensions
-- 2. Find pg_net
-- 3. Click Enable
-- 4. Run this migration again
