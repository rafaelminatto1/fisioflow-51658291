-- Reaplica versão anterior (com activity em INSERT também). Ver 0085.
BEGIN;

CREATE OR REPLACE FUNCTION lead_stage_to_contact_lifecycle() RETURNS TRIGGER AS $$
DECLARE
  v_new_stage contact_lifecycle_stage;
BEGIN
  IF NEW.contact_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.estagio = OLD.estagio THEN RETURN NEW; END IF;

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
    UPDATE contacts SET lifecycle_stage = v_new_stage, updated_at = NOW()
     WHERE id = NEW.contact_id AND lifecycle_stage IS DISTINCT FROM v_new_stage;
  END IF;

  INSERT INTO contact_activities (organization_id, contact_id, tipo, titulo,
                                  ref_lead_id, payload, created_by)
  VALUES (NEW.organization_id, NEW.contact_id, 'stage_change',
          'Estágio: ' || NEW.estagio, NEW.id,
          jsonb_build_object('from', CASE WHEN TG_OP='UPDATE' THEN OLD.estagio ELSE NULL END,
                             'to',   NEW.estagio),
          NEW.responsavel_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMIT;
