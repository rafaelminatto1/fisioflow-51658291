import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNFSeList, generateNFSe, cancelNFSe, type ApiNFSeRecord } from "@/lib/api";

export type { ApiNFSeRecord };

export function useNFSeList(params?: { patientId?: string; month?: string; status?: string }) {
  return useQuery({
    queryKey: ["nfse", params],
    queryFn: () => getNFSeList(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateNFSe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof generateNFSe>[0]) => generateNFSe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse"] });
    },
  });
}

export function useCancelNFSe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelNFSe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse"] });
    },
  });
}

export const NFSE_STATUS_LABELS: Record<ApiNFSeRecord["status"], string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  autorizado: "Autorizado",
  cancelado: "Cancelado",
  erro: "Erro",
};

export const NFSE_STATUS_COLORS: Record<ApiNFSeRecord["status"], string> = {
  rascunho: "#9CA3AF",
  enviado: "#3B82F6",
  autorizado: "#10B981",
  cancelado: "#EF4444",
  erro: "#F59E0B",
};
