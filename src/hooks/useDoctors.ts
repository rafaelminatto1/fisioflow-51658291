import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { DoctorService } from "@/lib/services/doctorService";
import type { Doctor, DoctorFormData } from "@/types/doctor";
import { toast } from "sonner";

/**
 * Hook to fetch all doctors
 */
export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => DoctorService.getAllDoctors(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to search doctors (for autocomplete)
 */
export function useSearchDoctors(searchTerm: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["doctors", "search", searchTerm],
    queryFn: () => DoctorService.searchDoctors(searchTerm),
    enabled: enabled && searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get a single doctor by ID
 */
export function useDoctor(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["doctors", doctorId],
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
    onMutate: async (newDoctor) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["doctors"] });

      // Snapshot the previous value
      const previousDoctors = queryClient.getQueryData<Doctor[]>(["doctors"]);

      // Create a temporary optimistic doctor object
      const optimisticDoctor: Doctor = {
        ...newDoctor,
        id: `temp-${Date.now()}`,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Doctor;

      // Optimistically update to the new value
      if (previousDoctors) {
        queryClient.setQueryData<Doctor[]>(["doctors"], [...previousDoctors, optimisticDoctor]);
      }

      return { previousDoctors };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newDoctor, context) => {
      if (context?.previousDoctors) {
        queryClient.setQueryData(["doctors"], context.previousDoctors);
      }
      console.error("Error creating doctor:", err);
      toast.error("Erro ao cadastrar médico");
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      // Specifically ensure search queries are refreshed
      queryClient.refetchQueries({ queryKey: ["doctors", "search"] });
    },
    onSuccess: () => {
      toast.success("Médico cadastrado com sucesso!");
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
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["doctors"] });
      await queryClient.cancelQueries({ queryKey: ["doctors", id] });

      // Snapshot the previous values
      const previousDoctors = queryClient.getQueryData<Doctor[]>(["doctors"]);
      const previousDoctor = queryClient.getQueryData<Doctor>(["doctors", id]);

      // Optimistically update to the new value in the list
      if (previousDoctors) {
        queryClient.setQueryData<Doctor[]>(
          ["doctors"],
          previousDoctors.map((d) => (d.id === id ? { ...d, ...data } : d)),
        );
      }

      // Optimistically update the individual doctor cache
      if (previousDoctor) {
        queryClient.setQueryData<Doctor>(["doctors", id], {
          ...previousDoctor,
          ...data,
        });
      }

      return { previousDoctors, previousDoctor };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousDoctors) {
        queryClient.setQueryData(["doctors"], context.previousDoctors);
      }
      if (context?.previousDoctor) {
        queryClient.setQueryData(["doctors", variables.id], context.previousDoctor);
      }
      console.error("Error updating doctor:", err);
      toast.error("Erro ao atualizar médico");
    },
    // Always refetch after error or success:
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctors", variables.id] });
    },
    onSuccess: () => {
      toast.success("Médico atualizado com sucesso!");
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
    // Optimistic Update
    onMutate: async (doctorId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["doctors"] });

      // Snapshot the previous value
      const previousDoctors = queryClient.getQueryData<Doctor[]>(["doctors"]);

      // Optimistically update to the new value
      if (previousDoctors) {
        queryClient.setQueryData<Doctor[]>(
          ["doctors"],
          previousDoctors.filter((d) => d.id !== doctorId),
        );
      }

      // Return a context object with the snapshotted value
      return { previousDoctors };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, doctorId, context) => {
      if (context?.previousDoctors) {
        queryClient.setQueryData(["doctors"], context.previousDoctors);
      }
      console.error("Error deleting doctor:", err);
      toast.error("Erro ao remover médico");
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onSuccess: () => {
      toast.success("Médico removido com sucesso!");
    },
  });
}
