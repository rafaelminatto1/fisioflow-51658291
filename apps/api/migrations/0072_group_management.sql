-- Migration: Group Classes and Pilates Management
-- Description: Creates tables for group classes, enrollments, and check-ins.

CREATE TYPE group_status AS ENUM ('active', 'inactive', 'full');
CREATE TYPE enrollment_status AS ENUM ('confirmed', 'waitlist', 'cancelled');
CREATE TYPE checkin_status AS ENUM ('present', 'absent', 'late');

CREATE TABLE IF NOT EXISTS group_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  therapist_id UUID REFERENCES profiles(id),
  capacity INTEGER NOT NULL DEFAULT 5,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status group_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_group_classes_org ON group_classes(organization_id);

CREATE TABLE IF NOT EXISTS group_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  class_id UUID NOT NULL REFERENCES group_classes(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  status enrollment_status NOT NULL DEFAULT 'confirmed',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_enrollments_class ON group_enrollments(class_id);
CREATE INDEX idx_enrollments_patient ON group_enrollments(patient_id);

CREATE TABLE IF NOT EXISTS group_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  enrollment_id UUID NOT NULL REFERENCES group_enrollments(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status checkin_status NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_checkins_date ON group_checkins(session_date);
CREATE INDEX idx_checkins_enrollment ON group_checkins(enrollment_id);

-- Enable RLS for new tables
ALTER TABLE group_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_checkins ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (per organization)
CREATE POLICY org_access_classes ON group_classes FOR ALL USING (organization_id = (current_setting('app.current_organization_id')::uuid));
CREATE POLICY org_access_enrollments ON group_enrollments FOR ALL USING (organization_id = (current_setting('app.current_organization_id')::uuid));
CREATE POLICY org_access_checkins ON group_checkins FOR ALL USING (organization_id = (current_setting('app.current_organization_id')::uuid));
