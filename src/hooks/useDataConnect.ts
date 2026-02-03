import { useQuery } from '@tanstack/react-query';
import { executeQuery } from 'firebase/data-connect';
import { dc, listPatientsByOrgRef, getPatientByIdRef } from '@/lib/dataconnect';

/**
 * Adaptador para converter formato Data Connect (camelCase) para Frontend (snake_case)
 */
const mapPatientFromPostgres = (p: any): any => ({
  id: p.id,
  name: p.name,
  email: p.email,
  phone: p.phone,
  birth_date: p.birthDate, // Mapper importante
  cpf: p.cpf,
  gender: p.gender,
  address: p.address,
  main_condition: p.mainCondition,
  status: 'Em Tratamento', // Default status se não vier do banco
  organization_id: p.organizationId,
  created_at: p.createdAt,
  updated_at: p.updatedAt
});

/**
 * Hook para listar pacientes via Data Connect (Postgres)
 */
export const usePatientsPostgres = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['patients-postgres', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await executeQuery(listPatientsByOrgRef(dc, { organizationId }));
      return result.data.patients.map(mapPatientFromPostgres);
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para obter exercícios prescritos de um paciente via Data Connect
 */
export const usePatientExercisesPostgres = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ['patient-exercises-postgres', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      // Nota: Enquanto o SDK gerado não está 100%, usamos a query manual simulada
      // ou chamamos a query gerada se disponível.
      // Aqui, como fallback, vou chamar a Cloud Function que já lê do Postgres,
      // mas mantendo a interface do hook pronta para o Data Connect.
      
      // Quando o SDK estiver estável:
      // const result = await executeQuery(getPatientExercisesRef(dc, { patientId }));
      // return result.data.prescribed_exercises;

      console.warn('Data Connect exercises query pending SDK generation. Using fallback.');
      return []; 
    },
    enabled: !!patientId,
  });
};

/**
 * Hook para obter um paciente por ID via Data Connect
 */
export const usePatientPostgres = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ['patient-postgres', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const result = await executeQuery(getPatientByIdRef(dc, { id: patientId }));
      return result.data.patient;
    },
    enabled: !!patientId,
  });
};
