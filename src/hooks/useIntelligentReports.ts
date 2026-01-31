/**
 * useIntelligentReports - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - generated_reports -> generated_reports collection
 * - Firebase Functions for report generation
 * - Auth through useAuth() from AuthContext
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, orderBy, limit,  } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { getFirebaseApp } from '@/integrations/firebase/app';
import { useAuth } from '@/contexts/AuthContext';


const functions = getFunctions(getFirebaseApp());
const db = getFirebaseApp().firestore() || null;

// Helper to convert doc
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => ({ id: doc.id, ...doc.data() } as T);

export function useIntelligentReports(patientId?: string) {
  const { user } = useAuth();

  const generateReport = useMutation({
    mutationFn: async ({
      patientId,
      reportType,
      dateRange
    }: {
      patientId: string;
      reportType: string;
      dateRange: { start: string; end: string }
    }) => {
      if (!user) throw new Error('User not authenticated');

      const generateReportFn = httpsCallable(functions, 'intelligent-reports');
      const result = await generateReportFn({
        patientId,
        reportType,
        dateRange,
        userId: user.uid
      });

      if (result.data.error) throw new Error(result.data.error);
      return result.data;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar relatório',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const { data: recentReports, isLoading } = useQuery({
    queryKey: ['recent-reports', patientId],
    queryFn: async () => {
      if (!patientId || !db) return [];

      const q = firestoreQuery(
        collection(db, 'generated_reports'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc);
    },
    enabled: !!patientId && !!db,
  });

  return {
    generateReport,
    recentReports,
    isLoading,
  };
}
