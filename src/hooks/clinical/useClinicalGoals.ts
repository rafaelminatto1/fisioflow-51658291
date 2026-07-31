import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Objetivos terapêuticos com classe CIF (`/api/clinical/goals`).
 *
 * A classe do objetivo é fator prognóstico (FYSIOPRIM, N=2.591): atividade /
 * participação teve OR 1,80 frente a sintoma. Por isso a classificação existe
 * como aviso — nunca como bloqueio de salvamento.
 */

export type IcfClass =
  | "sintoma"
  | "funcao_estrutura"
  | "atividade_participacao"
  | "nao_classificavel";

export interface IcfClassOption {
  value: IcfClass;
  label: string;
  hint: string;
}

export interface GoalClassification {
  suggested: IcfClass;
  /** Verdadeiro quando o objetivo só descreve sintoma — prognóstico pior. */
  symptomOnly: boolean;
  /** Mensagem pronta para a UI. Ausente quando não há nada a alertar. */
  advice?: string;
}

export interface ClinicalGoal {
  id: string;
  description: string;
  icfClass: IcfClass;
  status: string;
  priority: string;
  targetDate: string | null;
  achievedAt?: string | null;
  createdAt?: string | null;
}

export interface CreateGoalInput {
  patientId: string;
  description: string;
  /** Omitido = usa a sugestão da heurística; o profissional pode sobrescrever. */
  icfClass?: IcfClass | null;
  targetDate?: string | null;
  priority?: "baixa" | "media" | "alta" | null;
}

export const clinicalGoalsKeys = {
  all: () => ["clinical", "goals"] as const,
  icfClasses: () => ["clinical", "goals", "icf-classes"] as const,
  list: (patientId: string) => ["clinical", "goals", "list", patientId] as const,
  classify: (description: string) => ["clinical", "goals", "classify", description] as const,
};

/** Catálogo de classes CIF com rótulo e exemplo — a UI não deve inventar os seus. */
export function useIcfClasses() {
  return useQuery({
    queryKey: clinicalGoalsKeys.icfClasses(),
    queryFn: async () => {
      const res = await request<{ data: IcfClassOption[]; meta: { fundamento: string } }>(
        "/api/clinical/goals/icf-classes",
      );
      return res;
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useClinicalGoals(patientId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: clinicalGoalsKeys.list(patientId ?? ""),
    queryFn: async () => {
      const res = await request<{ data: ClinicalGoal[] }>(
        `/api/clinical/goals?patientId=${encodeURIComponent(patientId!)}`,
      );
      return res.data;
    },
    enabled: Boolean(patientId) && enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/**
 * Classifica sem salvar, para avisar enquanto o profissional digita.
 *
 * É um POST usado como leitura: o servidor não guarda nada. Fica como `useQuery`
 * para aproveitar cache por texto — o mesmo objetivo digitado duas vezes não
 * gera dois round-trips. Passe a descrição JÁ debounced.
 */
export function useGoalClassification(description: string, options: { enabled?: boolean } = {}) {
  const text = description.trim();
  const { enabled = true } = options;

  return useQuery({
    queryKey: clinicalGoalsKeys.classify(text),
    queryFn: async () => {
      const res = await request<{ data: GoalClassification }>("/api/clinical/goals/classify", {
        method: "POST",
        body: JSON.stringify({ description: text }),
      });
      // Offline, `request()` devolve um envelope sintético sem `data`; sem este
      // guarda o componente renderizaria "undefined" como aviso.
      return res?.data ?? null;
    },
    enabled: enabled && text.length > 0,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });
}

/** Classificação sob demanda (ex.: no blur), quando a versão em query não serve. */
export function useClassifyGoal() {
  return useMutation({
    mutationFn: async (description: string) => {
      const res = await request<{ data: GoalClassification }>("/api/clinical/goals/classify", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      return res?.data ?? null;
    },
  });
}

export function useCreateClinicalGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      // A resposta traz `classification` mesmo quando o objetivo é salvo: o aviso
      // é para a próxima conversa com o paciente, não um bloqueio.
      return request<{ data: ClinicalGoal | null; classification: GoalClassification }>(
        "/api/clinical/goals",
        { method: "POST", body: JSON.stringify(input) },
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: clinicalGoalsKeys.list(variables.patientId) });
    },
  });
}
