import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PatientEvolutionData {
  sessions: {
    id: string;
    date: string;
    painLevel: number;
    mobilityScore: number;
    observations: string;
    therapist: string;
    duration: number;
  }[];
  currentPainLevel: number;
  initialPainLevel: number;
  totalSessions: number;
  averageImprovement: number;
}

export const usePatientEvolutionReport = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-evolution-report", patientId],
    queryFn: async (): Promise<PatientEvolutionData> => {
      // Buscar registros SOAP do paciente
      const { data: soapRecords, error } = await supabase
        .from("soap_records")
        .select(`
          id,
          record_date,
          pain_level,
          created_at,
          objective_data,
          plan,
          created_by
        `)
        .eq("patient_id", patientId)
        .order("record_date", { ascending: true });

      if (error) {
        console.error("Erro ao buscar evolução:", error);
        toast.error("Erro ao carregar dados de evolução");
        throw error;
      }

      if (!soapRecords || soapRecords.length === 0) {
        return {
          sessions: [],
          currentPainLevel: 0,
          initialPainLevel: 0,
          totalSessions: 0,
          averageImprovement: 0,
        };
      }

      // Buscar informações dos terapeutas
      const therapistIds = [...new Set(soapRecords.map(r => r.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", therapistIds);

      const therapistMap = new Map(
        profiles?.map(p => [p.id, p.full_name]) || []
      );

      // Processar sessões
      const sessions = soapRecords.map((record) => {
        // Extrair score de mobilidade do objective_data se disponível
        let mobilityScore = 50; // valor padrão
        try {
          const objData = record.objective_data as any;
          if (objData?.mobility_score) {
            mobilityScore = objData.mobility_score;
          } else if (objData?.range_of_motion) {
            // Calcular baseado em range of motion
            mobilityScore = Math.min(100, objData.range_of_motion);
          }
        } catch (e) {
          // Usar valor padrão
        }

        return {
          id: record.id,
          date: record.record_date || record.created_at || "",
          painLevel: record.pain_level || 0,
          mobilityScore,
          observations: record.plan || "",
          therapist: therapistMap.get(record.created_by) || "Não informado",
          duration: 60, // Valor padrão
        };
      });

      // Calcular métricas
      const initialPainLevel = sessions[0]?.painLevel || 0;
      const currentPainLevel = sessions[sessions.length - 1]?.painLevel || 0;
      const totalSessions = sessions.length;

      // Calcular melhora média por sessão
      let totalImprovement = 0;
      for (let i = 1; i < sessions.length; i++) {
        const improvement = sessions[i - 1].painLevel - sessions[i].painLevel;
        const percentImprovement = sessions[i - 1].painLevel > 0
          ? (improvement / sessions[i - 1].painLevel) * 100
          : 0;
        totalImprovement += percentImprovement;
      }
      const averageImprovement = sessions.length > 1 
        ? totalImprovement / (sessions.length - 1) 
        : 0;

      return {
        sessions,
        currentPainLevel,
        initialPainLevel,
        totalSessions,
        averageImprovement,
      };
    },
    enabled: !!patientId,
  });
};
