/**
 * usePatientEvolutionReport - Migrated to Firebase
 */

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query as firestoreQuery, where, orderBy, doc, getDoc,  } from '@/integrations/firebase/app';
import { toast } from "sonner";
import { db } from '@/integrations/firebase/app';


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

export const usePatientEvolutionReport = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-evolution-report", patientId],
    queryFn: async (): Promise<PatientEvolutionData> => {
      // Buscar registros SOAP do paciente
      const soapQ = firestoreQuery(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        orderBy('record_date', 'asc')
      );
      const soapSnap = await getDocs(soapQ);
      const soapRecords = soapSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Buscar medições de evolução
      const measurementsQ = firestoreQuery(
        collection(db, 'evolution_measurements'),
        where('patient_id', '==', patientId),
        orderBy('measured_at', 'asc')
      );
      const measurementsSnap = await getDocs(measurementsQ);
      const measurements = measurementsSnap.docs.map(doc => doc.data());

      // Buscar sessões prescritas (pacotes)
      const packagesQ = firestoreQuery(
        collection(db, 'session_packages'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );
      const packagesSnap = await getDocs(packagesQ);
      const packageData = packagesSnap.docs.length > 0 ? packagesSnap.docs[0].data() : null;
      const prescribedSessions = packageData?.total_sessions || 0;

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
          vitalSigns: last.measurement_type === 'Sinais Vitais' ? (last.custom_data as Record<string, unknown>) : undefined,
        };
      });

      // Buscar mapas de dor associados às sessões
      const soapIds = soapRecords.map(r => r.id);

      let painMaps: Array<{ session_id: string; global_pain_level?: number }> = [];
      if (soapIds.length > 0) {
        // Firestore has a limit of 10 items per 'in' query
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < soapIds.length; i += chunkSize) {
          chunks.push(soapIds.slice(i, i + chunkSize));
        }

        const painMapsResults = await Promise.all(
          chunks.map(chunk =>
            getDocs(
              firestoreQuery(collection(db, 'pain_maps'), where('session_id', 'in', chunk))
            )
          )
        );
        painMaps = painMapsResults.flatMap(snapshot =>
          snapshot.docs.map(doc => ({ session_id: doc.data().session_id, global_pain_level: doc.data().global_pain_level }))
        );
      }

      const painMapsBySession = new Map(
        painMaps.map(pm => [pm.session_id, pm.global_pain_level])
      );

      // Buscar informações dos terapeutas
      const therapistIds = [...new Set(soapRecords.map(r => r.created_by))];

      const therapistMap = new Map<string, string>();
      if (therapistIds.length > 0) {
        const profilesQ = firestoreQuery(collection(db, 'profiles'), where('user_id', 'in', therapistIds));
        const profilesSnap = await getDocs(profilesQ);
        profilesSnap.forEach(doc => {
          therapistMap.set(doc.data().user_id, doc.data().full_name);
        });
      }

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
