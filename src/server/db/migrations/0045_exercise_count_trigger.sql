CREATE OR REPLACE FUNCTION update_template_exercise_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exercise_templates
  SET exercise_count = (
    SELECT COUNT(*) FROM exercise_template_items
    WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
  )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_template_exercise_count ON exercise_template_items;

CREATE TRIGGER trg_template_exercise_count
AFTER INSERT OR DELETE ON exercise_template_items
FOR EACH ROW EXECUTE FUNCTION update_template_exercise_count();
