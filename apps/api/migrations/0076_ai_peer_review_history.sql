-- Migration: AI Peer Review History
-- Description: Creates table to store AI quality scores and clinical insights for SOAP notes.

CREATE TABLE IF NOT EXISTS ai_peer_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  therapist_id    UUID NOT NULL REFERENCES profiles(id),
  quality_score   INTEGER NOT NULL, -- 0-100
  insights        JSONB DEFAULT '[]',
  missing_tests   JSONB DEFAULT '[]',
  suggestions     JSONB DEFAULT '[]',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_org_therapist ON ai_peer_reviews(organization_id, therapist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_session ON ai_peer_reviews(session_id);
