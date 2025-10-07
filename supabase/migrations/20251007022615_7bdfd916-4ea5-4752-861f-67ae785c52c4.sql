-- Função para revogar convite
CREATE OR REPLACE FUNCTION public.revoke_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar convites';
  END IF;

  -- Marcar convite como expirado
  UPDATE public.user_invitations
  SET expires_at = now()
  WHERE id = _invitation_id
    AND used_at IS NULL;
  
  -- Logar auditoria
  PERFORM public.log_audit_event(
    'INVITATION_REVOKED',
    'user_invitations',
    _invitation_id,
    NULL,
    NULL
  );
END;
$$;