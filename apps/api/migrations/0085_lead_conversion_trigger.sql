-- 0085_lead_conversion_trigger.sql
--
-- Trigger PG que materializa a conversão lead → paciente quando o estágio do
-- lead vira `efetivado`. Comportamento:
--   1. Se o contact ainda não tem paciente, cria patients (mínimo viável) e
--      seta primary_patient_id no contact.
--   2. Atualiza contacts.lifecycle_stage = 'customer'.
--   3. Insere contact_activities tipo 'conversion'.
--
-- Idempotente: re-rodar UPDATE com estagio='efetivado' não duplica paciente.
-- A flag por org `auto_convert_on_efetivado` (em organizations.metadata) pode
-- desligar o auto-create — neste caso só atualiza o lifecycle.

BEGIN;

CREATE OR REPLACE FUNCTION lead_efetivado_to_patient() RETURNS TRIGGER AS $$
DECLARE
  v_contact RECORD;
  v_patient_id UUID;
  v_auto_convert BOOLEAN := true;
BEGIN
  -- Só age na transição PARA 'efetivado'
  IF NEW.estagio IS DISTINCT FROM 'efetivado' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estagio = 'efetivado' THEN
    RETURN NEW;  -- já era efetivado, nada a fazer
  END IF;

  IF NEW.contact_id IS NULL THEN
    RAISE WARNING 'Lead % efetivado sem contact_id — pulando conversão automática', NEW.id;
    RETURN NEW;
  END IF;

  SELECT * INTO v_contact FROM contacts WHERE id = NEW.contact_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Flag opcional por organização
  SELECT COALESCE((metadata->>'auto_convert_on_efetivado')::boolean, true)
    INTO v_auto_convert
    FROM organizations
    WHERE id = NEW.organization_id;

  -- Cria patient se ainda não existe vínculo
  IF v_contact.primary_patient_id IS NULL AND v_auto_convert THEN
    INSERT INTO patients (
      organization_id, full_name, phone, email, origin, referred_by,
      contact_id, is_active, created_at, updated_at
    )
    VALUES (
      NEW.organization_id,
      NEW.nome,
      NEW.telefone,
      NEW.email,
      COALESCE(NEW.origem, v_contact.origem_first_touch),
      NEW.responsavel_id,
      v_contact.id,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_patient_id;

    UPDATE contacts
       SET primary_patient_id = v_patient_id,
           lifecycle_stage    = 'customer',
           updated_at         = NOW()
     WHERE id = v_contact.id;
  ELSE
    UPDATE contacts
       SET lifecycle_stage = 'customer',
           updated_at      = NOW()
     WHERE id = v_contact.id
       AND lifecycle_stage IS DISTINCT FROM 'customer';
  END IF;

  INSERT INTO contact_activities (
    organization_id, contact_id, tipo, titulo, descricao,
    ref_lead_id, ref_patient_id, payload, created_by
  )
  VALUES (
    NEW.organization_id,
    v_contact.id,
    'conversion',
    'Lead efetivado',
    'Lead movido para estágio efetivado — paciente criado automaticamente.',
    NEW.id,
    COALESCE(v_patient_id, v_contact.primary_patient_id),
    jsonb_build_object(
      'auto_convert', v_auto_convert,
      'previous_stage', CASE WHEN TG_OP='UPDATE' THEN OLD.estagio ELSE NULL END
    ),
    NEW.responsavel_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_efetivado_to_patient ON leads;
CREATE TRIGGER trg_lead_efetivado_to_patient
  AFTER INSERT OR UPDATE OF estagio ON leads
  FOR EACH ROW
  EXECUTE FUNCTION lead_efetivado_to_patient();

-- =========================================================================
-- Trigger auxiliar: sync de stage no contact quando lead muda de estágio
-- =========================================================================
CREATE OR REPLACE FUNCTION lead_stage_to_contact_lifecycle() RETURNS TRIGGER AS $$
DECLARE
  v_new_stage contact_lifecycle_stage;
BEGIN
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.estagio = OLD.estagio THEN
    RETURN NEW;
  END IF;

  v_new_stage := CASE NEW.estagio
    WHEN 'aguardando'           THEN 'lead'::contact_lifecycle_stage
    WHEN 'em_contato'           THEN 'mql'::contact_lifecycle_stage
    WHEN 'avaliacao_agendada'   THEN 'sql'::contact_lifecycle_stage
    WHEN 'avaliacao_realizada'  THEN 'opportunity'::contact_lifecycle_stage
    WHEN 'efetivado'            THEN 'customer'::contact_lifecycle_stage
    WHEN 'nao_efetivado'        THEN 'churned'::contact_lifecycle_stage
    ELSE NULL
  END;

  IF v_new_stage IS NOT NULL THEN
    UPDATE contacts
       SET lifecycle_stage = v_new_stage,
           updated_at      = NOW()
     WHERE id = NEW.contact_id
       AND lifecycle_stage IS DISTINCT FROM v_new_stage;
  END IF;

  -- Activity de mudança de estágio
  INSERT INTO contact_activities (organization_id, contact_id, tipo, titulo,
                                  ref_lead_id, payload, created_by)
  VALUES (
    NEW.organization_id, NEW.contact_id, 'stage_change',
    'Estágio: ' || NEW.estagio,
    NEW.id,
    jsonb_build_object(
      'from', CASE WHEN TG_OP='UPDATE' THEN OLD.estagio ELSE NULL END,
      'to',   NEW.estagio
    ),
    NEW.responsavel_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_stage_to_contact_lifecycle ON leads;
CREATE TRIGGER trg_lead_stage_to_contact_lifecycle
  AFTER INSERT OR UPDATE OF estagio ON leads
  FOR EACH ROW
  EXECUTE FUNCTION lead_stage_to_contact_lifecycle();

COMMIT;
