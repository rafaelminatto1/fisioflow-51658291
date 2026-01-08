import { usePatients } from './usePatients';
import { useAppointments } from './useAppointments';

export function useData() {
    const { data: patients, isLoading: patientsLoading } = usePatients();
    const { data: appointments, isLoading: appointmentsLoading } = useAppointments();

    return {
        patients: patients || [],
        appointments: appointments || [],
        isLoading: patientsLoading || appointmentsLoading,
    };
}