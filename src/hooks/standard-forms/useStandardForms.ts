import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { evaluationFormsApi } from "@/api/v2";
import { toast } from "sonner";
import { STANDARD_FORMS } from "./constants";

export function useCreateStandardForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formType: keyof typeof STANDARD_FORMS) => {
      const formConfig = STANDARD_FORMS[formType];

      const form = await evaluationFormsApi.create({
        nome: formConfig.nome,
        tipo: formConfig.tipo,
        descricao: formConfig.descricao,
        ativo: true,
      });

      for (const field of formConfig.campos) {
        await evaluationFormsApi.addField(form.data.id, {
          tipo_campo: field.tipo_campo,
          label: field.rotulo,
          placeholder: field.pergunta,
          grupo: field.secao,
          ordem: field.ordem,
          obrigatorio: field.obrigatorio,
          descricao: field.descricao ?? null,
          minimo: field.minimo ?? null,
          maximo: field.maximo ?? null,
          opcoes: field.opcoes ?? [],
        });
      }

      return {
        id: form.data.id,
        nome: form.data.nome,
        tipo: form.data.tipo,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("Ficha padrão criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar ficha padrão.");
    },
  });
}

export function useStandardFormExists(formType: keyof typeof STANDARD_FORMS) {
  return useQuery({
    queryKey: ["standard-form-exists", formType],
    queryFn: async () => {
      const formConfig = STANDARD_FORMS[formType];

      const response = await evaluationFormsApi.list({
        tipo: formConfig.tipo,
        ativo: true,
      });
      const forms = (response?.data ?? []) as Array<{ nome: string }>;
      return forms.some((form) => form.nome === formConfig.nome);
    },
  });
}
