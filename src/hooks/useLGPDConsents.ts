import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConsentType = 
  | 'dados_pessoais' 
  | 'dados_sensiveis' 
  | 'comunicacao_marketing' 
  | 'compartilhamento_terceiros';

export interface LGPDConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}

export function useLGPDConsents() {
  const queryClient = useQueryClient();

  const { data: consents, isLoading } = useQuery({
    queryKey: ["lgpd-consents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lgpd_consents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LGPDConsent[];
    },
  });

  const manageConsent = useMutation({
    mutationFn: async ({
      consentType,
      granted,
    }: {
      consentType: ConsentType;
      granted: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("manage_consent", {
        _user_id: user.id,
        _consent_type: consentType,
        _granted: granted,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lgpd-consents"] });
      toast.success(
        variables.granted
          ? "Consentimento concedido com sucesso"
          : "Consentimento revogado com sucesso"
      );
    },
    onError: (error) => {
      console.error("Erro ao gerenciar consentimento:", error);
      toast.error("Erro ao atualizar consentimento");
    },
  });

  const hasConsent = (consentType: ConsentType): boolean => {
    if (!consents) return false;
    const consent = consents.find((c) => c.consent_type === consentType);
    return consent?.granted ?? false;
  };

  return {
    consents,
    isLoading,
    manageConsent: manageConsent.mutate,
    isManaging: manageConsent.isPending,
    hasConsent,
  };
}
