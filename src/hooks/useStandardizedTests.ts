import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StandardizedTestResult {
  id: string;
  patient_id: string;
  test_type: 'oswestry' | 'lysholm' | 'dash';
  test_name: string;
  score: number;
  max_score: number;
  interpretation: string | null;
  answers: Record<string, number>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useStandardizedTests = (patientId: string) => {
  return useQuery({
    queryKey: ["standardized-tests", patientId],
    queryFn: async (): Promise<StandardizedTestResult[]> => {
      const { data, error } = await supabase
        .from("standardized_test_results")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar testes padronizados:", error);
        toast.error("Erro ao carregar histórico de testes");
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        test_type: item.test_type as 'oswestry' | 'lysholm' | 'dash',
        answers: item.answers as Record<string, number>,
      }));
    },
    enabled: !!patientId,
  });
};

export const useSaveStandardizedTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testData: {
      patient_id: string;
      test_type: 'oswestry' | 'lysholm' | 'dash';
      test_name: string;
      score: number;
      max_score: number;
      interpretation: string;
      answers: Record<string, number>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("standardized_test_results")
        .insert({
          ...testData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao salvar teste:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["standardized-tests", variables.patient_id] 
      });
      toast.success("Teste salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar teste:", error);
      toast.error("Não foi possível salvar o teste");
    },
  });
};
