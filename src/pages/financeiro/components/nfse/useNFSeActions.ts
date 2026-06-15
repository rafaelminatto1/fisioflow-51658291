import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/api/v2";
import { toast } from "sonner";
import { normalizeNFSe } from "./types";
import { useState, useEffect } from "react";

export function useNFSeActions(organizationId?: string) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const { data: nfses = [], isLoading } = useQuery({
    queryKey: ["nfse-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await request<any>("/api/nfse");
      return (response.data ?? [])
        .map((row) => normalizeNFSe(row))
        .sort((a, b) => b.data_emissao.localeCompare(a.data_emissao));
    },
    enabled: !!organizationId,
  });

  const createNFSe = useMutation({
    mutationFn: async (data: {
      valor: string;
      destinatario_nome: string;
      destinatario_cpf_cnpj: string;
      servico_descricao: string;
    }) => {
      const val = parseFloat(data.valor.replace(",", "."));
      if (isNaN(val)) throw new Error("Valor inválido");

      const response = await request<any>("/api/nfse/generate", {
        method: "POST",
        body: JSON.stringify({
          valor_servico: val,
          discriminacao: data.servico_descricao,
          tomador_nome: data.destinatario_nome,
          tomador_cpf_cnpj: data.destinatario_cpf_cnpj,
        }),
      });

      const nfseId = response.data.id;

      if (!isOnline) {
        toast.info("Você está offline. A nota foi salva como rascunho.");
        return normalizeNFSe(response.data);
      }

      await request<any>(`/api/nfse/send/${nfseId}`, { method: "POST" });
      return normalizeNFSe(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["nfse-list", organizationId],
      });
      toast.success("NFS-e gerada!");
    },
    onError: (err: any) => {
      toast.error("Falha ao gerar rascunho", { description: err.message });
    },
  });

  const cancelNFSe = useMutation({
    mutationFn: async (id: string) => {
      const response = await request<any>(`/api/nfse/cancel/${id}`, {
        method: "POST",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["nfse-list", organizationId],
      });
      toast.success("Cancelamento solicitado!");
    },
    onError: (err: any) => {
      toast.error("Falha no cancelamento", { description: err.message });
    },
  });

  return {
    nfses,
    isLoading,
    isOnline,
    createNFSe,
    cancelNFSe,
  };
}
