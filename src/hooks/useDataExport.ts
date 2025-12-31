import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/errors/logger";

export type DataExportRequestType = 'export' | 'deletion';
export type DataExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DataExportRequest {
  id: string;
  user_id: string;
  status: DataExportStatus;
  request_type: DataExportRequestType;
  data_package_url: string | null;
  expires_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useDataExport() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["data-export-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_export_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DataExportRequest[];
    },
  });

  const requestExport = useMutation({
    mutationFn: async (requestType: DataExportRequestType) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("request_data_export", {
        _user_id: user.id,
        _request_type: requestType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, requestType) => {
      queryClient.invalidateQueries({ queryKey: ["data-export-requests"] });
      toast.success(
        requestType === "export"
          ? "Solicitação de exportação criada. Você receberá um email quando estiver pronta."
          : "Solicitação de exclusão criada. Seus dados serão removidos em breve."
      );
    },
    onError: (error) => {
      logger.error("Erro ao solicitar exportação", error, 'useDataExport');
      toast.error("Erro ao criar solicitação");
    },
  });

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const completedRequests = requests?.filter((r) => r.status === "completed") || [];
  const hasPendingExport = pendingRequests.some((r) => r.request_type === "export");
  const hasPendingDeletion = pendingRequests.some((r) => r.request_type === "deletion");

  return {
    requests,
    isLoading,
    requestExport: requestExport.mutate,
    isRequesting: requestExport.isPending,
    pendingRequests,
    completedRequests,
    hasPendingExport,
    hasPendingDeletion,
  };
}
