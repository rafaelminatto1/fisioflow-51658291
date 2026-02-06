import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DoctorService } from '@/lib/services/doctorService';
import type { DoctorFormData } from '@/types/doctor';
import { toast } from 'sonner';

/**
 * Hook to fetch all doctors
 */
export function useDoctors() {
    return useQuery({
        queryKey: ['doctors'],
        queryFn: () => DoctorService.getAllDoctors(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to search doctors (for autocomplete)
 */
export function useSearchDoctors(searchTerm: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['doctors', 'search', searchTerm],
        queryFn: () => DoctorService.searchDoctors(searchTerm),
        enabled: enabled && searchTerm.length >= 2,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook to get a single doctor by ID
 */
export function useDoctor(doctorId: string | undefined) {
    return useQuery({
        queryKey: ['doctors', doctorId],
        queryFn: () => DoctorService.getDoctorById(doctorId!),
        enabled: !!doctorId,
    });
}

/**
 * Hook to create a new doctor
 */
export function useCreateDoctor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: DoctorFormData) => DoctorService.createDoctor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors'] });
            toast.success('Médico cadastrado com sucesso!');
        },
        onError: (error) => {
            console.error('Error creating doctor:', error);
            toast.error('Erro ao cadastrar médico');
        },
    });
}

/**
 * Hook to update an existing doctor
 */
export function useUpdateDoctor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<DoctorFormData> }) =>
            DoctorService.updateDoctor(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['doctors'] });
            queryClient.invalidateQueries({ queryKey: ['doctors', variables.id] });
            toast.success('Médico atualizado com sucesso!');
        },
        onError: (error) => {
            console.error('Error updating doctor:', error);
            toast.error('Erro ao atualizar médico');
        },
    });
}

/**
 * Hook to delete a doctor (soft delete)
 */
export function useDeleteDoctor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (doctorId: string) => DoctorService.deleteDoctor(doctorId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors'] });
            toast.success('Médico removido com sucesso!');
        },
        onError: (error) => {
            console.error('Error deleting doctor:', error);
            toast.error('Erro ao remover médico');
        },
    });
}
