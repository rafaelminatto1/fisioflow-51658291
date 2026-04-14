import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getTelemedicineRooms,
	createTelemedicineRoom,
	startTelemedicineRoom,
	type ApiTelemedicineRoom,
} from "../lib/api";

export function useTelemedicine() {
	const queryClient = useQueryClient();

	const {
		data: rooms = [],
		isLoading,
		isFetching,
		refetch,
		error,
	} = useQuery({
		queryKey: ["telemedicine", "rooms"],
		queryFn: () => getTelemedicineRooms(),
		staleTime: 1000 * 60,
	});

	const createMutation = useMutation({
		mutationFn: (patientId: string) => createTelemedicineRoom(patientId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["telemedicine", "rooms"] });
		},
	});

	const startMutation = useMutation({
		mutationFn: (id: string) => startTelemedicineRoom(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["telemedicine", "rooms"] });
			const previousRooms = queryClient.getQueryData<ApiTelemedicineRoom[]>([
				"telemedicine",
				"rooms",
			]);
			queryClient.setQueryData<ApiTelemedicineRoom[]>(
				["telemedicine", "rooms"],
				(old) =>
					old?.map((room) =>
						room.id === id ? { ...room, status: "active" as const } : room,
					),
			);
			return { previousRooms };
		},
		onError: (_err, _id, context) => {
			if (context?.previousRooms) {
				queryClient.setQueryData(
					["telemedicine", "rooms"],
					context.previousRooms,
				);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["telemedicine", "rooms"] });
		},
	});

	return {
		rooms,
		loading: isLoading,
		refreshing: isFetching,
		error,
		refresh: refetch,
		createRoom: createMutation.mutateAsync,
		startRoom: startMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isStarting: startMutation.isPending,
	};
}
