-- 0084_contacts_backfill.sql
--
-- Backfill `contacts` a partir de `patients` (lifecycle=customer) e `leads`
-- (lifecycle derivado do estágio). Deduplica por (organization_id,
-- COALESCE(cpf, telefone normalizado, email lowercase)). Patients têm
-- prioridade — leads que casam com paciente existente apenas apontam para o
-- mesmo contact_id, sem criar duplicata.
--
-- Não-destrutivo: usa ON CONFLICT DO NOTHING nos índices únicos parciais.
-- Em caso de erro, ROLLBACK preserva estado.

BEGIN;

-- =========================================================================
-- 1. Helpers
-- =========================================================================
CREATE OR REPLACE FUNCTION normalize_phone(p TEXT) RETURNS TEXT AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p,''), '[^0-9]', '', 'g'), '')
$$ LANGUAGE sql IMMUTABLE;

-- =========================================================================
-- 2. Patients → contacts (lifecycle_stage = 'customer')
-- =========================================================================
WITH new_contacts AS (
  INSERT INTO contacts (
    organization_id, nome, telefone, email, cpf,
    lifecycle_stage, owner_id, origem_first_touch, origem_last_touch,
    primary_patient_id, created_at, updated_at
  )
  SELECT
    p.organization_id,
    p.full_name,
    normalize_phone(p.phone),
    NULLIF(lower(p.email), ''),
    NULLIF(p.cpf, ''),
    CASE
      WHEN p.is_active = false OR p.archived = true THEN 'churned'::contact_lifecycle_stage
      ELSE 'customer'::contact_lifecycle_stage
    END,
    p.user_id,
    p.origin,
    p.origin,
    p.id,
    p.created_at,
    p.updated_at
  FROM patients p
  WHERE p.organization_id IS NOT NULL
    AND p.contact_id IS NULL
    AND p.deleted_at IS NULL
  ON CONFLICT DO NOTHING
  RETURNING id, primary_patient_id
)
UPDATE patients SET contact_id = nc.id
FROM new_contacts nc
WHERE patients.id = nc.primary_patient_id;

-- Para patients que colidiram com contact existente (mesmo CPF/tel/email já
-- inserido em uma iteração anterior), ligar por match:
UPDATE patients p
SET contact_id = c.id
FROM contacts c
WHERE p.contact_id IS NULL
  AND p.organization_id = c.organization_id
  AND p.deleted_at IS NULL
  AND (
       (p.cpf IS NOT NULL AND c.cpf = p.cpf)
    OR (p.email IS NOT NULL AND c.email = lower(p.email))
    OR (p.phone IS NOT NULL AND c.telefone = normalize_phone(p.phone))
  );

-- =========================================================================
-- 3. Leads → contacts (dedup contra patients já inseridos)
-- =========================================================================
-- 3a. Liga leads a contacts existentes (paciente que já foi lead)
UPDATE leads l
SET contact_id = c.id
FROM contacts c
WHERE l.contact_id IS NULL
  AND l.organization_id = c.organization_id
  AND (
       (l.email IS NOT NULL AND c.email = lower(l.email))
    OR (l.telefone IS NOT NULL AND c.telefone = normalize_phone(l.telefone))
  );

-- 3b. Cria contacts para leads sem match
WITH new_contacts AS (
  INSERT INTO contacts (
    organization_id, nome, telefone, email,
    lifecycle_stage, owner_id, origem_first_touch, origem_last_touch,
    primary_lead_id, created_at, updated_at
  )
  SELECT
    l.organization_id,
    l.nome,
    normalize_phone(l.telefone),
    NULLIF(lower(l.email), ''),
    CASE l.estagio
      WHEN 'aguardando'           THEN 'lead'::contact_lifecycle_stage
      WHEN 'em_contato'           THEN 'mql'::contact_lifecycle_stage
      WHEN 'avaliacao_agendada'   THEN 'sql'::contact_lifecycle_stage
      WHEN 'avaliacao_realizada'  THEN 'opportunity'::contact_lifecycle_stage
      WHEN 'efetivado'            THEN 'customer'::contact_lifecycle_stage
      WHEN 'nao_efetivado'        THEN 'churned'::contact_lifecycle_stage
      ELSE 'lead'::contact_lifecycle_stage
    END,
    l.responsavel_id,
    l.origem,
    l.origem,
    l.id,
    l.created_at,
    l.updated_at
  FROM leads l
  WHERE l.organization_id IS NOT NULL
    AND l.contact_id IS NULL
  ON CONFLICT DO NOTHING
  RETURNING id, primary_lead_id
)
UPDATE leads SET contact_id = nc.id
FROM new_contacts nc
WHERE leads.id = nc.primary_lead_id;

-- 3c. Última varredura para casos remanescentes
UPDATE leads l
SET contact_id = c.id
FROM contacts c
WHERE l.contact_id IS NULL
  AND l.organization_id = c.organization_id
  AND (
       (l.email IS NOT NULL AND c.email = lower(l.email))
    OR (l.telefone IS NOT NULL AND c.telefone = normalize_phone(l.telefone))
  );

-- =========================================================================
-- 4. Propaga contact_id em appointments e sessions (via patient_id)
-- =========================================================================
UPDATE appointments a
SET contact_id = p.contact_id
FROM patients p
WHERE a.patient_id = p.id
  AND a.contact_id IS NULL
  AND p.contact_id IS NOT NULL;

UPDATE sessions s
SET contact_id = p.contact_id
FROM patients p
WHERE s.patient_id = p.id
  AND s.contact_id IS NULL
  AND p.contact_id IS NOT NULL;

-- =========================================================================
-- 5. Seed timeline: criação do contato + conversão (se já é customer)
-- =========================================================================
INSERT INTO contact_activities (organization_id, contact_id, tipo, titulo, payload, created_at)
SELECT c.organization_id, c.id,
       CASE WHEN c.primary_lead_id IS NOT NULL THEN 'lead_created' ELSE 'patient_created' END,
       'Contato importado do backfill',
       jsonb_build_object('backfill', true,
                          'lead_id', c.primary_lead_id,
                          'patient_id', c.primary_patient_id),
       c.created_at
FROM contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM contact_activities ca
  WHERE ca.contact_id = c.id AND ca.tipo IN ('lead_created','patient_created')
);

-- =========================================================================
-- 6. Validação das FKs criadas como NOT VALID em 0083
-- =========================================================================
ALTER TABLE leads        VALIDATE CONSTRAINT fk_leads_contact_id;
ALTER TABLE patients     VALIDATE CONSTRAINT fk_patients_contact_id;
ALTER TABLE appointments VALIDATE CONSTRAINT fk_appointments_contact_id;
ALTER TABLE sessions     VALIDATE CONSTRAINT fk_sessions_contact_id;

-- =========================================================================
-- 7. Sanity checks (não falham — apenas relatam)
-- =========================================================================
DO $$
DECLARE
  patients_sem_contact INT;
  leads_sem_contact    INT;
BEGIN
  SELECT count(*) INTO patients_sem_contact
  FROM patients
  WHERE deleted_at IS NULL AND organization_id IS NOT NULL AND contact_id IS NULL;

  SELECT count(*) INTO leads_sem_contact
  FROM leads
  WHERE organization_id IS NOT NULL AND contact_id IS NULL;

  RAISE NOTICE 'Backfill complete. patients sem contact: %, leads sem contact: %',
               patients_sem_contact, leads_sem_contact;
END$$;

COMMIT;
