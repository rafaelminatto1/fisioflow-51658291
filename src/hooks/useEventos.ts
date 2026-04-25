/**
 * useEventos - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventosApi, type Evento } from "@/api/v2";
import { toast } from "sonner";

export type { Evento };

export function useEventos(filtros?: { status?: string; categoria?: string; busca?: string }) {
  return useQuery({
    queryKey: ["eventos", filtros],
    queryFn: async () => {
      try {
        const res = await eventosApi.list({
          status: filtros?.status && filtros.status !== "todos" ? filtros.status : undefined,
          categoria:
            filtros?.categoria && filtros.categoria !== "todos" ? filtros.categoria : undefined,
        });
        let eventos = ((res?.data ?? []) as Evento[]).map((e) => ({
          ...e,
          hora_inicio: e.hora_inicio?.slice(0, 5),
          hora_fim: e.hora_fim?.slice(0, 5),
        }));

        if (filtros?.busca) {
          const busca = filtros.busca.toLowerCase();
          eventos = eventos.filter(
            (e) =>
              e.nome.toLowerCase().includes(busca) ||
              (e.local && e.local.toLowerCase().includes(busca)),
          );
        }

        return eventos;
      } catch (error) {
        console.error("[Query Error] useEventos:", error);
        // Não lançamos erro aqui para o useQuery não quebrar a página,
        // mas retornamos vazio e o logger registrará.
        return [];
      }
    },
  });
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ["evento", id],
    queryFn: async () => {
      const res = await eventosApi.get(id);
      const evento = (res?.data ?? null) as Evento | null;
      if (evento) {
        return {
          ...evento,
          hora_inicio: evento.hora_inicio?.slice(0, 5),
          hora_fim: evento.hora_fim?.slice(0, 5),
        };
      }
      return null;
    },
    enabled: !!id,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      evento: Omit<Evento, "id" | "created_at" | "updated_at" | "organization_id">,
    ) => {
      const data: Record<string, unknown> = { ...evento };
      if (data.data_inicio instanceof Date)
        data.data_inicio = (data.data_inicio as Date).toISOString().split("T")[0];
      if (data.data_fim instanceof Date)
        data.data_fim = (data.data_fim as Date).toISOString().split("T")[0];

      try {
        const res = await eventosApi.create(data as Partial<Evento>);
        return (res?.data ?? res) as Evento;
      } catch (error) {
        // Capturar erros de rede especificamente (fetch failed)
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error(
            "Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está online.",
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast.success("Evento cadastrado com sucesso.");
    },
    onError: (error: Error) => {
      console.error("[Mutation Error] useCreateEvento:", error);
      toast.error(`Erro ao criar evento: ${error.message}`);
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Evento> }) => {
      const payload: Record<string, unknown> = { ...data };
      if (payload.data_inicio instanceof Date)
        payload.data_inicio = (payload.data_inicio as Date).toISOString().split("T")[0];
      if (payload.data_fim instanceof Date)
        payload.data_fim = (payload.data_fim as Date).toISOString().split("T")[0];
      const res = await eventosApi.update(id, payload as Partial<Evento>);
      return (res?.data ?? res) as Evento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast.success("Evento atualizado com sucesso.");
    },
    onError: (error: Error) => toast.error("Erro ao atualizar evento: " + error.message),
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast.success("Evento removido com sucesso.");
    },
    onError: (error: Error) => toast.error("Erro ao excluir evento: " + error.message),
  });
}
