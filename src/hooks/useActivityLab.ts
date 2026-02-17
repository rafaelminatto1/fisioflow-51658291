import { useQuery } from '@tanstack/react-query';
import { activityLabService } from '@/services/activityLabService';

export const useActivityLabPatients = (searchTerm?: string) => {
  const normalizedTerm = searchTerm?.trim() || '';

  return useQuery({
    queryKey: ['activity-lab', 'patients', normalizedTerm],
    queryFn: () => activityLabService.getPatients(normalizedTerm),
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

export const useActivityLabSessions = (patientId?: string) => {
  return useQuery({
    queryKey: ['activity-lab', 'sessions', patientId],
    queryFn: () => patientId ? activityLabService.getSessionsByPatient(patientId) : Promise.resolve([]),
    enabled: !!patientId,
  });
};

export const useActivityLabClinic = () => {
  return useQuery({
    queryKey: ['activity-lab', 'clinic'],
    queryFn: () => activityLabService.getClinicProfile(),
  });
};
