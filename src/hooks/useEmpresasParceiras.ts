/**
 * useEmpresasParceiras - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financialApi, type EmpresaParceira } from "@/api/v2";

export type { EmpresaParceira };

export function useEmpresasParceiras() {
  return useQuery({
    queryKey: ["empresas-parceiras"],
    queryFn: async () => {
      const res = await financialApi.empresasParceiras.list();
      return (res?.data ?? []) as EmpresaParceira[];
    },
  });
}

export function useCreateEmpresaParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (empresa: Omit<EmpresaParceira, "id" | "created_at" | "updated_at">) => {
      const res = await financialApi.empresasParceiras.create(empresa);
      return (res?.data ?? res) as EmpresaParceira;
    },
    onMutate: async (newEmpresa) => {
      await queryClient.cancelQueries({ queryKey: ["empresas-parceiras"] });
      const previousEmpresas = queryClient.getQueryData<EmpresaParceira[]>(["empresas-parceiras"]);

      if (previousEmpresas) {
        queryClient.setQueryData<EmpresaParceira[]>(["empresas-parceiras"], [
          { ...newEmpresa, id: `temp-${Date.now()}` } as unknown as EmpresaParceira,
          ...previousEmpresas,
        ]);
      }

      return { previousEmpresas };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousEmpresas) {
        queryClient.setQueryData(["empresas-parceiras"], context.previousEmpresas);
      }
      toast.error("Erro ao criar empresa: " + error.message);
    },
    onSuccess: () => {
      toast.success("Empresa parceira criada!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas-parceiras"] });
    },
  });
}

export function useUpdateEmpresaParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmpresaParceira> }) => {
      const res = await financialApi.empresasParceiras.update(id, data);
      return (res?.data ?? res) as EmpresaParceira;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["empresas-parceiras"] });
      const previousEmpresas = queryClient.getQueryData<EmpresaParceira[]>(["empresas-parceiras"]);

      if (previousEmpresas) {
        queryClient.setQueryData<EmpresaParceira[]>(
          ["empresas-parceiras"],
          previousEmpresas.map((e) => (e.id === id ? ({ ...e, ...data } as EmpresaParceira) : e)),
        );
      }

      return { previousEmpresas };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousEmpresas) {
        queryClient.setQueryData(["empresas-parceiras"], context.previousEmpresas);
      }
      toast.error("Erro ao atualizar empresa: " + error.message);
    },
    onSuccess: () => {
      toast.success("Empresa atualizada!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas-parceiras"] });
    },
  });
}

export function useDeleteEmpresaParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await financialApi.empresasParceiras.delete(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["empresas-parceiras"] });
      const previousEmpresas = queryClient.getQueryData<EmpresaParceira[]>(["empresas-parceiras"]);

      if (previousEmpresas) {
        queryClient.setQueryData<EmpresaParceira[]>(
          ["empresas-parceiras"],
          previousEmpresas.filter((e) => e.id !== id),
        );
      }

      return { previousEmpresas };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousEmpresas) {
        queryClient.setQueryData(["empresas-parceiras"], context.previousEmpresas);
      }
      toast.error("Erro ao remover empresa: " + error.message);
    },
    onSuccess: () => {
      toast.success("Empresa removida!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas-parceiras"] });
    },
  });
}
