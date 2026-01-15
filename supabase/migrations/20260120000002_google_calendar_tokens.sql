-- =====================================================================
-- Google Calendar OAuth Tokens Migration
-- =====================================================================

-- Table to store Google OAuth tokens for calendar sync
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE,
  email TEXT,
  scope TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one token per user
  CONSTRAINT unique_user_token UNIQUE (user_id)
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);

-- Enable RLS
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read/write their own tokens
CREATE POLICY "Users can view their own Google tokens"
  ON user_google_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google tokens"
  ON user_google_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google tokens"
  ON user_google_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google tokens"
  ON user_google_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_google_tokens_updated_at
  BEFORE UPDATE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_google_tokens_updated_at();

-- =====================================================================
-- Google Calendar Event Mapping
-- =====================================================================

-- Table to map local appointments to Google Calendar events
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one mapping per appointment
  CONSTRAINT unique_appointment_google_event UNIQUE (appointment_id),
  -- Ensure Google event ID is unique per calendar
  CONSTRAINT unique_google_event UNIQUE (google_event_id, google_calendar_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_appointment_id ON google_calendar_events(appointment_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_event_id ON google_calendar_events(google_event_id);

-- Enable RLS
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies based on appointment ownership
CREATE POLICY "Users can view Google events for their appointments"
  ON google_calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = google_calendar_events.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Google events for their appointments"
  ON google_calendar_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = google_calendar_events.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Google events for their appointments"
  ON google_calendar_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = google_calendar_events.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Google events for their appointments"
  ON google_calendar_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = google_calendar_events.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

-- =====================================================================
-- Sync Logs (Optional - for debugging and monitoring)
-- =====================================================================

-- Table to log sync operations for monitoring and debugging
CREATE TABLE IF NOT EXISTS google_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'sync_to_google', 'sync_from_google', 'watch', 'error'
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  google_event_id TEXT,
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for querying logs
CREATE INDEX IF NOT EXISTS idx_google_sync_logs_user_id ON google_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_logs_created_at ON google_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_sync_logs_status ON google_sync_logs(status);

-- Enable RLS
ALTER TABLE google_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync logs"
  ON google_sync_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
  ON google_sync_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- Helper Functions
-- =====================================================================

-- Function to check if user has connected Google Calendar
CREATE OR REPLACE FUNCTION has_google_calendar_connected(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_google_tokens
    WHERE user_id = user_id_param
    AND access_token IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get Google Calendar sync status for an appointment
CREATE OR REPLACE FUNCTION get_appointment_google_sync(appointment_id_param UUID)
RETURNS TABLE(
  google_event_id TEXT,
  google_calendar_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gce.google_event_id,
    gce.google_calendar_id,
    gce.last_synced_at
  FROM google_calendar_events gce
  WHERE gce.appointment_id = appointment_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
