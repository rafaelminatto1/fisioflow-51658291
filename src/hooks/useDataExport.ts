import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportPatientData = async (patientId: string) => {
    setIsExporting(true);
    try {
      // 1. Fetch patient profile
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;

      // 2. Fetch related data (appointments, records, etc)
      // Usando Promise.all para paralelo
      const [
        { data: appointments },
        { data: records },
        { data: exercises }
      ] = await Promise.all([
        supabase.from('appointments').select('*').eq('patient_id', patientId),
        supabase.from('medical_records').select('*').eq('patient_id', patientId),
        supabase.from('prescribed_exercises').select('*').eq('patient_id', patientId)
      ]);

      const fullData = {
        exportedAt: new Date().toISOString(),
        patient,
        appointments: appointments || [],
        medicalRecords: records || [],
        prescribedExercises: exercises || [],
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
      console.error('Export erro:', error);
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
