import type { QueryClient } from '@tanstack/react-query';
import {
  collection,
  db,
  getDocs,
  limit,
  orderBy,
  query as firestoreQuery,
  where,
} from '@/integrations/firebase/app';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { soapKeys } from '@/hooks/useSoapRecords';

export async function prefetchPatientGoals(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number
) {
  return queryClient.prefetchQuery({
    queryKey: ['patient-goals', patientId],
    staleTime,
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_goals'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
    },
  });
}

export async function prefetchPatientPathologies(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number
) {
  return queryClient.prefetchQuery({
    queryKey: ['patient-pathologies', patientId],
    staleTime,
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_pathologies'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
    },
  });
}

export async function prefetchEvolutionMeasurements(
  queryClient: QueryClient,
  patientId: string,
  resultLimit: number,
  staleTime: number
) {
  return queryClient.prefetchQuery({
    queryKey: ['evolution-measurements', patientId, resultLimit],
    staleTime,
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'evolution_measurements'),
        where('patient_id', '==', patientId),
        orderBy('measured_at', 'desc'),
        limit(resultLimit)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
    },
  });
}

export async function prefetchRequiredMeasurements(
  queryClient: QueryClient,
  pathologyNames: string[],
  staleTime: number
) {
  const uniquePathologies = Array.from(new Set(pathologyNames.filter(Boolean)));
  if (uniquePathologies.length === 0) return;

  return queryClient.prefetchQuery({
    queryKey: ['required-measurements', uniquePathologies],
    staleTime,
    queryFn: async () => {
      const snapshots = await Promise.all(
        uniquePathologies.map((name) => {
          const q = firestoreQuery(
            collection(db, 'pathology_required_measurements'),
            where('pathology_name', '==', name)
          );
          return getDocs(q);
        })
      );

      const allResults = snapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }))
      );

      const deduped: Array<Record<string, unknown>> = [];
      const seen = new Set<string>();
      for (const measurement of allResults) {
        const pathologyName = String(measurement.pathology_name || '');
        const measurementName = String(measurement.measurement_name || '');
        const key = `${pathologyName}|${measurementName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(measurement as Record<string, unknown>);
      }

      return deduped;
    },
  });
}

export async function prefetchPatientSurgeries(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number
) {
  return queryClient.prefetchQuery({
    queryKey: ['patient-surgeries', patientId],
    staleTime,
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_surgeries'),
        where('patient_id', '==', patientId),
        orderBy('surgery_date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
    },
  });
}

export async function prefetchPatientMedicalReturns(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number
) {
  return queryClient.prefetchQuery({
    queryKey: ['patient-medical-returns', patientId],
    staleTime,
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_medical_returns'),
        where('patient_id', '==', patientId),
        orderBy('return_date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
    },
  });
}

export async function prefetchSoapRecords(
  queryClient: QueryClient,
  patientId: string,
  resultLimit: number,
  staleTime: number
) {
  return queryClient.prefetchQuery({
    queryKey: soapKeys.list(patientId, { limit: resultLimit }),
    staleTime,
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        orderBy('record_date', 'desc'),
        limit(resultLimit)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          ...data,
          record_date: (data.record_date as string) || new Date().toISOString().split('T')[0],
        };
      });
    },
  });
}
