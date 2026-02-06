import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, orderBy, addDoc, db, getFirebaseAuth } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

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
      const q = firestoreQuery(
        collection(db, "standardized_test_results"),
        where("patient_id", "==", patientId),
        orderBy("created_at", "desc")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      interface TestItem {
        test_type?: 'oswestry' | 'lysholm' | 'dash';
        answers?: Record<string, number>;
      }

      return data.map(item => ({
        ...item,
        test_type: (item as TestItem).test_type as 'oswestry' | 'lysholm' | 'dash',
        answers: (item as TestItem).answers as Record<string, number>,
      })) as StandardizedTestResult[];
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
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const newTest = {
        ...testData,
        created_by: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "standardized_test_results"), newTest);
      return { id: docRef.id, ...newTest };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["standardized-tests", variables.patient_id]
      });
      toast.success("Teste salvo com sucesso!");
    },
    onError: (error) => {
      logger.error("Erro ao salvar teste", error, 'useStandardizedTests');
      toast.error("Não foi possível salvar o teste");
    },
  });
};
