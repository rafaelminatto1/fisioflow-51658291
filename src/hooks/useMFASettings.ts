import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MFAMethod = 'totp' | 'sms' | 'email';

export interface MFASettings {
  id: string;
  user_id: string;
  mfa_enabled: boolean;
  mfa_method: MFAMethod | null;
  backup_codes: string[] | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMFASettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["mfa-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mfa_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as MFASettings | null;
    },
  });

  const enableMFA = useMutation({
    mutationFn: async (method: MFAMethod) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gerar códigos de backup
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      const { data, error } = await supabase
        .from("mfa_settings")
        .upsert({
          user_id: user.id,
          mfa_enabled: true,
          mfa_method: method,
          backup_codes: backupCodes,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar evento de segurança
      await supabase.rpc("log_security_event", {
        _user_id: user.id,
        _event_type: "mfa_enabled",
        _severity: "info",
        _metadata: { method },
      });

      return { settings: data, backupCodes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast.success("MFA ativado com sucesso! Guarde seus códigos de backup.");
    },
    onError: (error) => {
      console.error("Erro ao ativar MFA:", error);
      toast.error("Erro ao ativar autenticação de dois fatores");
    },
  });

  const disableMFA = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("mfa_settings")
        .update({
          mfa_enabled: false,
          mfa_method: null,
          backup_codes: null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Registrar evento de segurança
      await supabase.rpc("log_security_event", {
        _user_id: user.id,
        _event_type: "mfa_disabled",
        _severity: "warning",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast.success("MFA desativado");
    },
    onError: (error) => {
      console.error("Erro ao desativar MFA:", error);
      toast.error("Erro ao desativar autenticação de dois fatores");
    },
  });

  return {
    settings,
    isLoading,
    isMFAEnabled: settings?.mfa_enabled ?? false,
    enableMFA: enableMFA.mutateAsync,
    disableMFA: disableMFA.mutate,
    isEnabling: enableMFA.isPending,
    isDisabling: disableMFA.isPending,
  };
}
