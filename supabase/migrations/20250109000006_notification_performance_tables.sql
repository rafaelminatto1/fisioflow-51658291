-- Create notification performance metrics table
CREATE TABLE IF NOT EXISTS notification_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL,
    total_notifications INTEGER NOT NULL DEFAULT 0,
    successful_deliveries INTEGER NOT NULL DEFAULT 0,
    delivery_time_ms INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    delivery_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    batch_efficiency DECIMAL(10,4) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification batch logs table
CREATE TABLE IF NOT EXISTS notification_batch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL,
    notification_count INTEGER NOT NULL DEFAULT 0,
    successful_deliveries INTEGER NOT NULL DEFAULT 0,
    delivery_time_ms INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'normal',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification system health table
CREATE TABLE IF NOT EXISTS notification_system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
    delivery_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    average_delivery_time INTEGER NOT NULL DEFAULT 0,
    click_through_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    batch_efficiency DECIMAL(10,4) NOT NULL DEFAULT 0,
    queue_size INTEGER NOT NULL DEFAULT 0,
    processing_batches INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification optimization settings table
CREATE TABLE IF NOT EXISTS notification_optimization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_batch_size INTEGER NOT NULL DEFAULT 100,
    batch_window_ms INTEGER NOT NULL DEFAULT 30000,
    priority_weights JSONB NOT NULL DEFAULT '{"urgent": 1, "high": 0.8, "normal": 0.5, "low": 0.2}',
    quiet_hours_respect BOOLEAN NOT NULL DEFAULT true,
    user_timezone_aware BOOLEAN NOT NULL DEFAULT true,
    auto_optimization_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_performance_metrics_recorded_at 
    ON notification_performance_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_performance_metrics_batch_id 
    ON notification_performance_metrics(batch_id);

CREATE INDEX IF NOT EXISTS idx_notification_batch_logs_completed_at 
    ON notification_batch_logs(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_batch_logs_priority 
    ON notification_batch_logs(priority);

CREATE INDEX IF NOT EXISTS idx_notification_system_health_recorded_at 
    ON notification_system_health(recorded_at DESC);

-- Insert default optimization settings
INSERT INTO notification_optimization_settings (
    max_batch_size,
    batch_window_ms,
    priority_weights,
    quiet_hours_respect,
    user_timezone_aware,
    auto_optimization_enabled
) VALUES (
    100,
    30000,
    '{"urgent": 1, "high": 0.8, "normal": 0.5, "low": 0.2}',
    true,
    true,
    true
) ON CONFLICT DO NOTHING;

-- Create function to automatically update system health
CREATE OR REPLACE FUNCTION update_notification_system_health()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate aggregated metrics from recent performance data
    INSERT INTO notification_system_health (
        status,
        delivery_rate,
        average_delivery_time,
        error_rate,
        batch_efficiency,
        queue_size,
        processing_batches
    )
    SELECT 
        CASE 
            WHEN AVG(error_rate) > 0.25 OR AVG(delivery_rate) < 0.5 THEN 'critical'
            WHEN AVG(error_rate) > 0.1 OR AVG(delivery_rate) < 0.8 THEN 'degraded'
            ELSE 'healthy'
        END as status,
        AVG(delivery_rate) as delivery_rate,
        AVG(delivery_time_ms) as average_delivery_time,
        AVG(error_rate) as error_rate,
        AVG(batch_efficiency) as batch_efficiency,
        0 as queue_size, -- Will be updated by application
        0 as processing_batches -- Will be updated by application
    FROM notification_performance_metrics
    WHERE recorded_at >= NOW() - INTERVAL '1 hour';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update system health on new performance metrics
CREATE TRIGGER trigger_update_system_health
    AFTER INSERT ON notification_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_system_health();

-- Create function to clean old performance data
CREATE OR REPLACE FUNCTION cleanup_old_notification_data()
RETURNS void AS $$
BEGIN
    -- Keep only last 30 days of performance metrics
    DELETE FROM notification_performance_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    -- Keep only last 30 days of batch logs
    DELETE FROM notification_batch_logs 
    WHERE completed_at < NOW() - INTERVAL '30 days';
    
    -- Keep only last 7 days of system health records
    DELETE FROM notification_system_health 
    WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-notification-data', '0 2 * * *', 'SELECT cleanup_old_notification_data();');

-- Add RLS policies
ALTER TABLE notification_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_optimization_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read performance data (pode ser restringido depois)
CREATE POLICY "Authenticated users can read performance metrics" ON notification_performance_metrics
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read batch logs" ON notification_batch_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read system health" ON notification_system_health
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage optimization settings" ON notification_optimization_settings
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Allow service role to insert performance data
CREATE POLICY "Service role can insert performance metrics" ON notification_performance_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert batch logs" ON notification_batch_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert system health" ON notification_system_health
    FOR INSERT WITH CHECK (true);