/**
 * useTelemedicine - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { telemedicineApi, type TelemedicineRoomRecord } from "@/api/v2";

export type TelemedicineRoom = TelemedicineRoomRecord;

export function useTelemedicineRooms() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ["telemedicine-rooms", organizationId],
    queryFn: async () => {
      const res = await telemedicineApi.rooms.list();
      return (res?.data ?? []) as TelemedicineRoom[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateTelemedicineRoom() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      patient_id: string;
      scheduled_at?: string;
      appointment_id?: string;
    }) => {
      const roomCode = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const res = await telemedicineApi.rooms.create({
        ...data,
        therapist_id: profile?.id,
        room_code: roomCode,
        status: "aguardando",
      });
      return (res?.data ?? res) as TelemedicineRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telemedicine-rooms"] });
      toast.success("Sala de telemedicina criada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar sala: " + error.message);
    },
  });
}

export function useUpdateTelemedicineRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TelemedicineRoom> & { id: string }) => {
      const res = await telemedicineApi.rooms.update(id, data);
      return (res?.data ?? res) as TelemedicineRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telemedicine-rooms"] });
      toast.success("Sala atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}
