/**
 * usePatientEvolutionReport - Migrated to Firebase
 */

import { useQuery } from '@tanstack/react-query';
import {
  clinicalApi,
  profileApi,
  sessionsApi,
  type PainMap,
  type SessionRecord,
} from '@/lib/api/workers-client';

const fetchEvolutionMeasurements = async (_patientId: string) => {
  // TODO: Replace this placeholder with a dedicated Workers endpoint that exposes
  // evolution measurements once the backend route is ready.
  return [] as Array<{
    measurement_type: string;
    measurement_name: string;
    value: number | string;
    unit?: string;
    measured_at: string;
    custom_data?: Record<string, unknown>;
  }>;
};

const fetchPrescribedSessions = async (_patientId: string) => {
  // TODO: Replace this placeholder with a Workers call (e.g., financial summary)
  // that returns the current package balance for the patient.
  return 0;
};

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
  prescribedSessions?: number;
  averageImprovement: number;
  measurementEvolution: {
    name: string;
    type: string;
    initial: { value: number | string; unit: string; date: string };
    current: { value: number | string; unit: string; date: string };
    improvement: number | string;
    isVitalSign?: boolean;
    vitalSigns?: Record<string, unknown>;
  }[];
}

const fetchSessions = async (patientId: string, limit = 1000): Promise<SessionRecord[]> => {
  const sessions: SessionRecord[] = [];
  let offset = 0;

  while (true) {
    const res = await sessionsApi.list({
      patientId,
      status: 'finalized',
      limit,
      offset,
    });
    const chunk = (res?.data ?? []) as SessionRecord[];
    sessions.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }

  return sessions.sort((a, b) => {
    const dateA = new Date(a.record_date).getTime();
    const dateB = new Date(b.record_date).getTime();
    return dateA - dateB;
  });
};

export const usePatientEvolutionReport = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-evolution-report", patientId],
    queryFn: async (): Promise<PatientEvolutionData> => {
      // Buscar registros SOAP do paciente via sessions API
      const sessionRecords = await fetchSessions(patientId);
      const soapRecords = sessionRecords.map((record) => ({
        id: record.id,
        patient_id: record.patient_id,
        created_at: record.created_at,
        status: record.status,
        subjective: record.subjective,
        objective: record.objective,
        assessment: record.assessment,
        plan: record.plan,
        pain_level: record.pain_level,
        pain_location: record.pain_location,
        pain_character: record.pain_character,
        record_date: record.record_date,
      }));

      // Buscar medições de evolução
      const measurements = await fetchEvolutionMeasurements(patientId);

      // Buscar sessões prescritas (pacotes)
      const prescribedSessions = await fetchPrescribedSessions(patientId);

      if (soapRecords.length === 0 && measurements.length === 0) {
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
      const evolutionMap = new Map<string, Array<{ value: number | string; unit?: string; measured_at: string; measurement_type?: string; measurement_name?: string; custom_data?: Record<string, unknown> }>>();
      measurements?.forEach(m => {
        const key = `${m.measurement_type}-${m.measurement_name}`;
        if (!evolutionMap.has(key)) evolutionMap.set(key, []);
        evolutionMap.get(key)?.push(m);
      });

      const measurementEvolution = Array.from(evolutionMap.entries()).map(([_key, history]) => {
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
          vitalSigns: last.measurement_type === 'Sinais Vitais' ? (last.custom_data as Record<string, unknown>) : undefined,
        };
      });

      // Buscar mapas de dor associados
      const painMapsResponse = await clinicalApi.painMaps.list({ patientId });
      const allPainMaps = (painMapsResponse?.data ?? []) as PainMap[];
      const painMaps = allPainMaps
        .filter((map) => !!map.session_id)
        .map((map) => ({
          session_id: map.session_id ?? '',
          global_pain_level: map.pain_level,
        }));

      const painMapsBySession = new Map(
        painMaps.map(pm => [pm.session_id, pm.global_pain_level])
      );

      // Buscar informações dos terapeutas
      const therapistMap = new Map<string, string>();
      const therapistsRes = await profileApi.therapists();
      (therapistsRes?.data ?? []).forEach((therapist) => {
        therapistMap.set(therapist.id, therapist.name);
      });

      // Processar sessões
      interface SoapRecord {
        id: string;
        record_date?: string;
        created_at?: string;
        plan?: string;
        created_by: string;
      }

      const sessions = soapRecords.map((record: SoapRecord) => {
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
