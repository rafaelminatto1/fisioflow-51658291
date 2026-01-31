/**
 * useDataExport - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('patients') → Firestore collection 'patients'
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - supabase.from('medical_records') → Firestore collection 'medical_records'
 * - supabase.from('prescribed_exercises') → Firestore collection 'prescribed_exercises'
 */

import { useState } from 'react';
import { doc, getDoc, getDocs, query, where } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';

import { fisioLogger as logger } from '@/lib/errors/logger';

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportPatientData = async (patientId: string) => {
    setIsExporting(true);
    try {
      // 1. Fetch patient profile
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (!patientDoc.exists()) {
        throw new Error('Paciente não encontrado');
      }

      const patient = { id: patientDoc.id, ...patientDoc.data() };

      // 2. Fetch related data (appointments, records, etc) in parallel
      const [appointmentsSnap, recordsSnap, exercisesSnap] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), where('patient_id', '==', patientId))),
        getDocs(query(collection(db, 'medical_records'), where('patient_id', '==', patientId))),
        getDocs(query(collection(db, 'prescribed_exercises'), where('patient_id', '==', patientId)))
      ]);

      const appointments = appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const records = recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const exercises = exercisesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const fullData = {
        exportedAt: new Date().toISOString(),
        patient,
        appointments,
        medicalRecords: records,
        prescribedExercises: exercises,
      };

      // 3. Trigger download
      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient_export_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: "O download do arquivo JSON iniciou.",
      });

    } catch (error) {
      logger.error('Export erro', error, 'useDataExport');
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o arquivo de dados.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPatientData, isExporting };
}
