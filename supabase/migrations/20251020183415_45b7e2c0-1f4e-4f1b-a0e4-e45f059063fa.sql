-- Corrigir função encrypt_cpf para incluir search_path seguro
CREATE OR REPLACE FUNCTION public.encrypt_cpf(cpf_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF cpf_plain IS NULL OR cpf_plain = '' THEN
    RETURN NULL;
  END IF;
  -- Retorna hash do CPF para busca, não o valor criptografado completo
  -- Em produção, usar chave secreta do Supabase Vault
  RETURN encode(digest(cpf_plain, 'sha256'), 'hex');
END;
$function$;

COMMENT ON FUNCTION public.encrypt_cpf IS 'Função segura para hash de CPF com search_path protegido';