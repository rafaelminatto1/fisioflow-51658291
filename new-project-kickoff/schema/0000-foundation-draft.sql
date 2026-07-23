-- FISIOFLOW NEXT — FOUNDATION DRAFT
-- STATUS: DISCUSSION ONLY. DO NOT EXECUTE IN ANY DATABASE.
-- Minimal F1 schema: identity context, memberships, patients, idempotency,
-- outbox/receipts and protected audit. It intentionally excludes agenda/episode.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Capability/definer roles only. They never authenticate a connection.
-- app_owner is the intended object owner; the reviewed migration runner must
-- execute object DDL as that role after the infrastructure bootstrap.
-- LOGIN roles, passwords and role grants belong to Neon/infra bootstrap, e.g.:
--   fisioflow_staff_login   LOGIN NOBYPASSRLS IN ROLE app_staff_runtime
--   fisioflow_patient_login LOGIN NOBYPASSRLS IN ROLE app_patient_runtime
--   fisioflow_auth_login    LOGIN NOBYPASSRLS IN ROLE app_auth_runtime
--   fisioflow_jobs_login    LOGIN NOBYPASSRLS IN ROLE app_jobs_runtime
-- Secrets are never created in a schema migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_owner') THEN
    CREATE ROLE app_owner NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migrator') THEN
    CREATE ROLE app_migrator NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_auth_definer') THEN
    CREATE ROLE app_auth_definer NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_auth_runtime') THEN
    CREATE ROLE app_auth_runtime NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_audit_definer') THEN
    CREATE ROLE app_audit_definer NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_staff_runtime') THEN
    CREATE ROLE app_staff_runtime NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_patient_runtime') THEN
    CREATE ROLE app_patient_runtime NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_jobs_runtime') THEN
    CREATE ROLE app_jobs_runtime NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION app_owner;
-- The executable migration must also SET LOCAL ROLE app_owner (or prove the
-- equivalent owner graph) before creating application objects. This draft is
-- deliberately rolled back and only makes the intended owner visible.

CREATE TYPE app.membership_status AS ENUM ('pending', 'active', 'suspended', 'revoked');
CREATE TYPE app.staff_role AS ENUM ('clinic_admin', 'clinical_lead', 'reception', 'physiotherapist', 'intern');
CREATE TYPE app.patient_status AS ENUM ('active', 'inactive', 'deceased');
CREATE TYPE app.idempotency_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE app.outbox_status AS ENUM ('pending', 'published', 'failed');

CREATE OR REPLACE FUNCTION app.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app.current_identity_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$ SELECT NULLIF(current_setting('app.identity_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app.current_membership_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$ SELECT NULLIF(current_setting('app.membership_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app.current_authorization_version()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$ SELECT NULLIF(current_setting('app.authorization_version', true), '')::integer $$;

CREATE OR REPLACE FUNCTION app.current_patient_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$ SELECT NULLIF(current_setting('app.patient_id', true), '')::uuid $$;

CREATE TABLE app.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE app.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL,
  subject text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('staff', 'patient', 'both')),
  email_normalized text,
  phone_e164 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer, subject)
);

CREATE TABLE app.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  identity_id uuid NOT NULL REFERENCES app.identities(id),
  status app.membership_status NOT NULL DEFAULT 'pending',
  authorization_version integer NOT NULL DEFAULT 1 CHECK (authorization_version > 0),
  approved_by_membership_id uuid,
  approved_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, identity_id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, id, identity_id),
  CHECK (status <> 'active' OR approved_at IS NOT NULL),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  FOREIGN KEY (organization_id, approved_by_membership_id)
    REFERENCES app.organization_memberships (organization_id, id)
);

CREATE TABLE app.membership_roles (
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  role app.staff_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, membership_id, role),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES app.organization_memberships (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE app.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 160),
  preferred_name text,
  birth_date date,
  phone_e164 text,
  email_normalized text,
  status app.patient_status NOT NULL DEFAULT 'active',
  created_by_membership_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, created_by_membership_id)
    REFERENCES app.organization_memberships (organization_id, id)
);

CREATE INDEX patients_org_status_name_idx
  ON app.patients (organization_id, status, full_name, id)
  WHERE deleted_at IS NULL;

-- Phone is not a unique identity: family members/caregivers may share a number.
CREATE INDEX patients_org_phone_active_idx
  ON app.patients (organization_id, phone_e164)
  WHERE phone_e164 IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE app.patient_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  patient_id uuid NOT NULL,
  identity_id uuid NOT NULL REFERENCES app.identities(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  authorization_version integer NOT NULL DEFAULT 1 CHECK (authorization_version > 0),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, patient_id, identity_id),
  UNIQUE (organization_id, identity_id),
  UNIQUE (organization_id, id),
  CHECK (status <> 'active' OR verified_at IS NOT NULL),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  FOREIGN KEY (organization_id, patient_id)
    REFERENCES app.patients (organization_id, id)
);

CREATE TABLE app.idempotency_keys (
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  actor_identity_id uuid NOT NULL REFERENCES app.identities(id),
  route_key text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  status app.idempotency_status NOT NULL DEFAULT 'processing',
  response_status integer,
  response_body jsonb,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (organization_id, actor_identity_id, route_key, idempotency_key),
  CHECK (expires_at > claimed_at),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CHECK ((status = 'completed') = (response_status IS NOT NULL)),
  CHECK (status = 'completed' OR response_body IS NULL),
  CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599)
);

CREATE INDEX idempotency_expiration_idx ON app.idempotency_keys (expires_at);

CREATE TABLE app.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1 CHECK (event_version > 0),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_sequence bigint NOT NULL CHECK (aggregate_sequence > 0),
  subject_type text,
  subject_id uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('staff', 'patient', 'service')),
  actor_identity_id uuid NOT NULL REFERENCES app.identities(id),
  actor_membership_id uuid,
  correlation_id uuid NOT NULL,
  causation_id uuid,
  payload jsonb NOT NULL,
  status app.outbox_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  last_error_code text,
  CHECK ((subject_type IS NULL) = (subject_id IS NULL)),
  CHECK ((actor_kind = 'staff') = (actor_membership_id IS NOT NULL)),
  CHECK ((locked_at IS NULL) = (locked_by IS NULL)),
  CHECK ((status = 'published') = (published_at IS NOT NULL)),
  UNIQUE (organization_id, aggregate_type, aggregate_id, aggregate_sequence),
  FOREIGN KEY (organization_id, actor_membership_id, actor_identity_id)
    REFERENCES app.organization_memberships (organization_id, id, identity_id)
);

CREATE INDEX outbox_dispatch_idx
  ON app.outbox_events (available_at, occurred_at, id)
  WHERE status IN ('pending', 'failed');

CREATE TABLE app.consumer_receipts (
  consumer_name text NOT NULL,
  event_id uuid NOT NULL REFERENCES app.outbox_events(id),
  processed_at timestamptz NOT NULL DEFAULT now(),
  result_hash text,
  PRIMARY KEY (consumer_name, event_id)
);

CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  actor_identity_id uuid NOT NULL REFERENCES app.identities(id),
  actor_membership_id uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('staff', 'patient', 'service', 'support')),
  action text NOT NULL CHECK (char_length(action) BETWEEN 3 AND 120),
  resource_type text NOT NULL CHECK (char_length(resource_type) BETWEEN 2 AND 80),
  resource_id uuid,
  patient_id uuid,
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 8 AND 200),
  outcome text NOT NULL CHECK (outcome IN ('allowed', 'denied', 'error')),
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((actor_kind = 'staff') = (actor_membership_id IS NOT NULL)),
  FOREIGN KEY (organization_id, actor_membership_id, actor_identity_id)
    REFERENCES app.organization_memberships (organization_id, id, identity_id),
  FOREIGN KEY (organization_id, patient_id)
    REFERENCES app.patients (organization_id, id)
);

-- Auth bootstrap is a separate, tightly scoped capability. The API validates
-- issuer/audience/signature first, then calls one resolver. A selected
-- membership/link is revalidated before setting transaction-local GUCs.
CREATE OR REPLACE FUNCTION app.resolve_staff_context(p_issuer text, p_subject text)
RETURNS TABLE (
  identity_id uuid,
  membership_id uuid,
  organization_id uuid,
  organization_display_name text,
  organization_timezone text,
  organization_status text,
  membership_status app.membership_status,
  authorization_version integer,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
  SELECT
    identity.id,
    membership.id,
    membership.organization_id,
    organization.display_name,
    organization.timezone,
    organization.status,
    membership.status,
    membership.authorization_version,
    COALESCE(
      array_agg(membership_role.role::text ORDER BY membership_role.role)
        FILTER (WHERE membership_role.role IS NOT NULL),
      ARRAY[]::text[]
    )
  FROM app.identities identity
  JOIN app.organization_memberships membership
    ON membership.identity_id = identity.id
  JOIN app.organizations organization
    ON organization.id = membership.organization_id
  LEFT JOIN app.membership_roles membership_role
    ON membership_role.organization_id = membership.organization_id
   AND membership_role.membership_id = membership.id
  WHERE identity.issuer = p_issuer
    AND identity.subject = p_subject
  GROUP BY identity.id, membership.id, organization.id
$$;

CREATE OR REPLACE FUNCTION app.resolve_patient_context(p_issuer text, p_subject text)
RETURNS TABLE (
  identity_id uuid,
  patient_access_link_id uuid,
  patient_id uuid,
  organization_id uuid,
  link_status text,
  authorization_version integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
  SELECT
    identity.id,
    link.id,
    link.patient_id,
    link.organization_id,
    link.status,
    link.authorization_version
  FROM app.identities identity
  JOIN app.patient_access_links link ON link.identity_id = identity.id
  WHERE identity.issuer = p_issuer
    AND identity.subject = p_subject
$$;

CREATE OR REPLACE FUNCTION app.current_staff_context_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.organization_memberships membership
    JOIN app.organizations organization
      ON organization.id = membership.organization_id
    JOIN app.identities identity
      ON identity.id = membership.identity_id
    WHERE membership.id = app.current_membership_id()
      AND membership.identity_id = app.current_identity_id()
      AND membership.organization_id = app.current_org_id()
      AND membership.authorization_version = app.current_authorization_version()
      AND membership.status = 'active'
      AND organization.status = 'active'
      AND identity.kind IN ('staff', 'both')
      AND EXISTS (
        SELECT 1
        FROM app.membership_roles membership_role
        WHERE membership_role.organization_id = membership.organization_id
          AND membership_role.membership_id = membership.id
      )
  )
$$;

CREATE OR REPLACE FUNCTION app.current_patient_context_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.patient_access_links link
    JOIN app.organizations organization
      ON organization.id = link.organization_id
    JOIN app.identities identity
      ON identity.id = link.identity_id
    JOIN app.patients patient
      ON patient.organization_id = link.organization_id
     AND patient.id = link.patient_id
    WHERE link.identity_id = app.current_identity_id()
      AND link.patient_id = app.current_patient_id()
      AND link.organization_id = app.current_org_id()
      AND link.authorization_version = app.current_authorization_version()
      AND link.status = 'active'
      AND organization.status = 'active'
      AND identity.kind IN ('patient', 'both')
      AND patient.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION app.record_staff_audit(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_patient_id uuid DEFAULT NULL,
  p_outcome text DEFAULT 'allowed',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT app.current_staff_context_is_active() THEN
    RAISE EXCEPTION 'inactive_staff_context' USING ERRCODE = '42501';
  END IF;

  INSERT INTO app.audit_events (
    organization_id, actor_identity_id, actor_membership_id, actor_kind,
    action, resource_type, resource_id, patient_id, request_id, outcome, metadata
  ) VALUES (
    app.current_org_id(), app.current_identity_id(), app.current_membership_id(), 'staff',
    p_action, p_resource_type, p_resource_id, p_patient_id,
    NULLIF(current_setting('app.request_id', true), ''), p_outcome, p_metadata
  ) RETURNING id INTO new_id;

  RETURN new_id;
END
$$;

CREATE OR REPLACE FUNCTION app.record_patient_audit(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_outcome text DEFAULT 'allowed',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT app.current_patient_context_is_active() THEN
    RAISE EXCEPTION 'inactive_patient_context' USING ERRCODE = '42501';
  END IF;

  INSERT INTO app.audit_events (
    organization_id, actor_identity_id, actor_kind, action, resource_type,
    resource_id, patient_id, request_id, outcome, metadata
  ) VALUES (
    app.current_org_id(), app.current_identity_id(), 'patient', p_action, p_resource_type,
    p_resource_id, app.current_patient_id(),
    NULLIF(current_setting('app.request_id', true), ''), p_outcome, p_metadata
  ) RETURNING id INTO new_id;

  RETURN new_id;
END
$$;

ALTER FUNCTION app.resolve_staff_context(text, text) OWNER TO app_auth_definer;
ALTER FUNCTION app.resolve_patient_context(text, text) OWNER TO app_auth_definer;
ALTER FUNCTION app.current_staff_context_is_active() OWNER TO app_auth_definer;
ALTER FUNCTION app.current_patient_context_is_active() OWNER TO app_auth_definer;
ALTER FUNCTION app.record_staff_audit(text, text, uuid, uuid, text, jsonb) OWNER TO app_audit_definer;
ALTER FUNCTION app.record_patient_audit(text, text, uuid, text, jsonb) OWNER TO app_audit_definer;

-- RLS is enabled and forced from the first migration.
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE app.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.identities FORCE ROW LEVEL SECURITY;
ALTER TABLE app.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE app.membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.membership_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE app.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patients FORCE ROW LEVEL SECURITY;
ALTER TABLE app.patient_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.patient_access_links FORCE ROW LEVEL SECURITY;
ALTER TABLE app.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.idempotency_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE app.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.outbox_events FORCE ROW LEVEL SECURITY;
ALTER TABLE app.consumer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.consumer_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;

-- Definer roles can only be reached through narrow functions.
CREATE POLICY organizations_auth_definer_read ON app.organizations FOR SELECT TO app_auth_definer USING (true);
CREATE POLICY identities_auth_definer_read ON app.identities FOR SELECT TO app_auth_definer USING (true);
CREATE POLICY memberships_auth_definer_read ON app.organization_memberships FOR SELECT TO app_auth_definer USING (true);
CREATE POLICY membership_roles_auth_definer_read ON app.membership_roles FOR SELECT TO app_auth_definer USING (true);
CREATE POLICY patients_auth_definer_read ON app.patients FOR SELECT TO app_auth_definer USING (true);
CREATE POLICY patient_links_auth_definer_read ON app.patient_access_links FOR SELECT TO app_auth_definer USING (true);
CREATE POLICY audit_definer_append ON app.audit_events FOR INSERT TO app_audit_definer WITH CHECK (true);

-- First-slice runtime is read-only for organizations/memberships/patients.
CREATE POLICY organizations_staff_read ON app.organizations FOR SELECT TO app_staff_runtime
  USING (id = app.current_org_id() AND app.current_staff_context_is_active());
CREATE POLICY organizations_patient_read ON app.organizations FOR SELECT TO app_patient_runtime
  USING (id = app.current_org_id() AND app.current_patient_context_is_active());

CREATE POLICY identities_staff_own_read ON app.identities FOR SELECT TO app_staff_runtime
  USING (id = app.current_identity_id() AND app.current_staff_context_is_active());
CREATE POLICY identities_patient_own_read ON app.identities FOR SELECT TO app_patient_runtime
  USING (id = app.current_identity_id() AND app.current_patient_context_is_active());

CREATE POLICY memberships_staff_self_read ON app.organization_memberships FOR SELECT TO app_staff_runtime
  USING (
    id = app.current_membership_id()
    AND organization_id = app.current_org_id()
    AND identity_id = app.current_identity_id()
    AND app.current_staff_context_is_active()
  );
CREATE POLICY membership_roles_staff_self_read ON app.membership_roles FOR SELECT TO app_staff_runtime
  USING (
    membership_id = app.current_membership_id()
    AND organization_id = app.current_org_id()
    AND app.current_staff_context_is_active()
  );

CREATE POLICY patients_staff_tenant_read ON app.patients FOR SELECT TO app_staff_runtime
  USING (organization_id = app.current_org_id() AND deleted_at IS NULL AND app.current_staff_context_is_active());
CREATE POLICY patients_patient_self_read ON app.patients FOR SELECT TO app_patient_runtime
  USING (
    organization_id = app.current_org_id()
    AND id = app.current_patient_id()
    AND deleted_at IS NULL
    AND app.current_patient_context_is_active()
  );
CREATE POLICY patient_links_patient_self_read ON app.patient_access_links FOR SELECT TO app_patient_runtime
  USING (
    organization_id = app.current_org_id()
    AND patient_id = app.current_patient_id()
    AND identity_id = app.current_identity_id()
    AND app.current_patient_context_is_active()
  );

-- Idempotency claim is atomic via INSERT on the primary key. response_body must
-- be minimal, short-lived and treated as sensitive if it contains PHI.
CREATE POLICY idempotency_staff_read ON app.idempotency_keys FOR SELECT TO app_staff_runtime
  USING (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_staff_context_is_active());
CREATE POLICY idempotency_staff_insert ON app.idempotency_keys FOR INSERT TO app_staff_runtime
  WITH CHECK (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_staff_context_is_active());
CREATE POLICY idempotency_staff_update ON app.idempotency_keys FOR UPDATE TO app_staff_runtime
  USING (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_staff_context_is_active())
  WITH CHECK (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_staff_context_is_active());
CREATE POLICY idempotency_patient_read ON app.idempotency_keys FOR SELECT TO app_patient_runtime
  USING (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_patient_context_is_active());
CREATE POLICY idempotency_patient_insert ON app.idempotency_keys FOR INSERT TO app_patient_runtime
  WITH CHECK (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_patient_context_is_active());
CREATE POLICY idempotency_patient_update ON app.idempotency_keys FOR UPDATE TO app_patient_runtime
  USING (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_patient_context_is_active())
  WITH CHECK (organization_id = app.current_org_id() AND actor_identity_id = app.current_identity_id() AND app.current_patient_context_is_active());

-- Request runtimes append only; a dedicated jobs role dispatches/marks events.
CREATE POLICY outbox_staff_append ON app.outbox_events FOR INSERT TO app_staff_runtime
  WITH CHECK (
    organization_id = app.current_org_id()
    AND actor_kind = 'staff'
    AND actor_identity_id = app.current_identity_id()
    AND actor_membership_id = app.current_membership_id()
    AND app.current_staff_context_is_active()
  );
CREATE POLICY outbox_patient_append ON app.outbox_events FOR INSERT TO app_patient_runtime
  WITH CHECK (
    organization_id = app.current_org_id()
    AND actor_kind = 'patient'
    AND actor_identity_id = app.current_identity_id()
    AND actor_membership_id IS NULL
    AND subject_type = 'patient'
    AND subject_id = app.current_patient_id()
    AND app.current_patient_context_is_active()
  );
CREATE POLICY outbox_jobs_read ON app.outbox_events FOR SELECT TO app_jobs_runtime USING (true);
CREATE POLICY outbox_jobs_update ON app.outbox_events FOR UPDATE TO app_jobs_runtime USING (true) WITH CHECK (true);
CREATE POLICY receipts_jobs_read ON app.consumer_receipts FOR SELECT TO app_jobs_runtime USING (true);
CREATE POLICY receipts_jobs_insert ON app.consumer_receipts FOR INSERT TO app_jobs_runtime WITH CHECK (true);

REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

GRANT USAGE ON SCHEMA app TO app_auth_definer, app_auth_runtime, app_audit_definer, app_staff_runtime, app_patient_runtime, app_jobs_runtime;

GRANT SELECT ON app.organizations, app.identities, app.organization_memberships, app.membership_roles, app.patients, app.patient_access_links TO app_auth_definer;
GRANT EXECUTE ON FUNCTION app.resolve_staff_context(text, text), app.resolve_patient_context(text, text) TO app_auth_runtime;

-- Context readers are intentionally explicit after revoking PUBLIC execute.
-- Policies call them as the runtime role; SECURITY DEFINER helpers call them as
-- their owner. Nothing here resolves an arbitrary organization from the client.
GRANT EXECUTE ON FUNCTION
  app.current_org_id(),
  app.current_identity_id(),
  app.current_membership_id(),
  app.current_authorization_version(),
  app.current_patient_id()
TO app_auth_definer, app_audit_definer;
GRANT EXECUTE ON FUNCTION
  app.current_org_id(),
  app.current_identity_id(),
  app.current_membership_id(),
  app.current_authorization_version()
TO app_staff_runtime;
GRANT EXECUTE ON FUNCTION
  app.current_org_id(),
  app.current_identity_id(),
  app.current_authorization_version(),
  app.current_patient_id()
TO app_patient_runtime;
GRANT EXECUTE ON FUNCTION app.current_staff_context_is_active() TO app_staff_runtime, app_audit_definer;
GRANT EXECUTE ON FUNCTION app.current_patient_context_is_active() TO app_patient_runtime, app_audit_definer;

GRANT SELECT ON app.organizations, app.identities, app.organization_memberships, app.membership_roles, app.patients TO app_staff_runtime;
GRANT SELECT ON app.organizations, app.identities, app.patients, app.patient_access_links TO app_patient_runtime;
GRANT SELECT ON app.idempotency_keys TO app_staff_runtime, app_patient_runtime;
GRANT INSERT (
  organization_id, actor_identity_id, route_key, idempotency_key,
  request_hash, expires_at
) ON app.idempotency_keys TO app_staff_runtime, app_patient_runtime;
GRANT UPDATE (
  status, response_status, response_body, completed_at
) ON app.idempotency_keys TO app_staff_runtime, app_patient_runtime;
GRANT INSERT (
  organization_id, event_type, event_version, aggregate_type, aggregate_id,
  aggregate_sequence, subject_type, subject_id, actor_kind,
  actor_identity_id, actor_membership_id, correlation_id, causation_id, payload
) ON app.outbox_events TO app_staff_runtime, app_patient_runtime;

GRANT INSERT ON app.audit_events TO app_audit_definer;
GRANT EXECUTE ON FUNCTION app.record_staff_audit(text, text, uuid, uuid, text, jsonb) TO app_staff_runtime;
GRANT EXECUTE ON FUNCTION app.record_patient_audit(text, text, uuid, text, jsonb) TO app_patient_runtime;

GRANT SELECT ON app.outbox_events TO app_jobs_runtime;
GRANT UPDATE (
  status, attempts, available_at, locked_at, locked_by, published_at,
  last_error_code
) ON app.outbox_events TO app_jobs_runtime;
GRANT SELECT, INSERT ON app.consumer_receipts TO app_jobs_runtime;

-- Deliberately no direct DELETE grants and no raw audit SELECT for runtime.
-- Admin audit reads must use a separately reviewed view/case of use.

-- Intentionally no COMMIT. A reviewed real migration must explicitly commit and
-- execute object DDL as app_owner after bootstrap, then run role/grant and RLS
-- tests against actual LOGIN credentials.
ROLLBACK;
