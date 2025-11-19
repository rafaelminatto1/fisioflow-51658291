-- Correção de segurança: adicionar search_path às funções

ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION calculate_survey_response_time() SET search_path = public;