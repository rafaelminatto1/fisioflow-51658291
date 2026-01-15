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
  initialPainLevel: number;
  totalSessions: number;
  prescribedSessions?: number;
  averageImprovement: number;
  measurementEvolution: {
    name: string;
    type: string;
    initial: { value: number | string; unit: string; date: string };
    current: { value: number | string; unit: string; date: string };
    improvement: number | string;
    isVitalSign?: boolean;
    vitalSigns?: Record<string, any>;
  }[];
}

export const usePatientEvolutionReport = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-evolution-report", patientId],
    queryFn: async (): Promise<PatientEvolutionData> => {
      // Buscar registros SOAP do paciente
      const { data: soapRecords, error: soapError } = await supabase
        .from("soap_records")
        .select(`
          id,
          record_date,
          created_at,
          objective,
          plan,
          created_by
        `)
        .eq("patient_id", patientId)
        .order("record_date", { ascending: true });

      if (soapError) throw soapError;

      // Buscar medições de evolução
      const { data: measurements, error: measError } = await supabase
        .from("evolution_measurements")
        .select("*")
        .eq("patient_id", patientId)
        .order("measured_at", { ascending: true });

      if (measError) throw measError;

      // Buscar sessões prescritas (pacotes)
      const { data: packageData } = await supabase
        .from("session_packages")
        .select("total_sessions")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prescribedSessions = packageData?.total_sessions || 0;

      if ((!soapRecords || soapRecords.length === 0) && (!measurements || measurements.length === 0)) {
        return {
          sessions: [],
          currentPainLevel: 0,
          initialPainLevel: 0,
          totalSessions: 0,
          prescribedSessions,
          averageImprovement: 0,
          measurementEvolution: [],
        };
      }

      // Processar medições para pegar inicial vs atual
      const evolutionMap = new Map<string, any[]>();
      measurements?.forEach(m => {
        const key = `${m.measurement_type}-${m.measurement_name}`;
        if (!evolutionMap.has(key)) evolutionMap.set(key, []);
        evolutionMap.get(key)?.push(m);
      });

      const measurementEvolution = Array.from(evolutionMap.entries()).map(([key, history]) => {
        const first = history[0];
        const last = history[history.length - 1];

        let improvement: number | string = 0;
        if (typeof first.value === 'number' && typeof last.value === 'number') {
          improvement = first.value !== 0
            ? ((last.value - first.value) / Math.abs(first.value)) * 100
            : last.value - first.value;
        } else {
          improvement = "N/A";
        }

        return {
          name: last.measurement_name,
          type: last.measurement_type,
          initial: { value: first.value, unit: first.unit, date: first.measured_at },
          current: { value: last.value, unit: last.unit, date: last.measured_at },
          improvement: typeof improvement === 'number' ? improvement.toFixed(1) : improvement,
          isVitalSign: last.measurement_type === 'Sinais Vitais',
          vitalSigns: last.measurement_type === 'Sinais Vitais' ? last.custom_data : undefined,
        };
      });

      // Buscar mapas de dor associados às sessões
      const soapIds = soapRecords?.map(r => r.id) || [];

      let painMaps: Array<{ id: string; pain_points?: unknown }> | null = [];
      if (soapIds.length > 0) {
        const { data } = await supabase
          .from("pain_maps")
          .select("session_id, global_pain_level")
          .in("session_id", soapIds);
        painMaps = data;
      }

      const painMapsBySession = new Map(
        painMaps?.map(pm => [pm.session_id, pm.global_pain_level]) || []
      );

      // Buscar informações dos terapeutas
      const therapistIds = [...new Set(soapRecords.map(r => r.created_by))];

      let profiles: Array<{ full_name?: string }> | null = [];
      if (therapistIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", therapistIds);
        profiles = data;
      }

      const therapistMap = new Map(
        profiles?.map(p => [p.id, p.full_name]) || []
      );

      // Processar sessões
      const sessions = soapRecords.map((record) => {
        const painLevel = painMapsBySession.get(record.id) || 0;

        // Estimativa de mobilidade baseada no nível de dor (inverso)
        const mobilityScore = Math.max(0, 100 - (painLevel * 10));

        return {
          id: record.id,
          date: record.record_date || record.created_at || "",
          painLevel,
          mobilityScore,
          observations: record.plan || "",
          therapist: therapistMap.get(record.created_by) || "Não informado",
          duration: 60,
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
        prescribedSessions,
        averageImprovement,
        measurementEvolution,
      };
    },
    enabled: !!patientId,
  });
};
