import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getLeads,
	createLead,
	updateLead,
	deleteLead,
	ApiLead,
} from "../lib/api";

export function useLeads() {
	const queryClient = useQueryClient();

	const {
		data: leads = [],
		isLoading,
		isFetching,
		refetch,
		error,
	} = useQuery({
		queryKey: ["leads"],
		queryFn: () => getLeads(),
		staleTime: 1000 * 60 * 2,
	});

	const createMutation = useMutation({
		mutationFn: (data: Partial<ApiLead>) => createLead(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<ApiLead> }) =>
			updateLead(id, data),
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({ queryKey: ["leads"] });
			const previousLeads = queryClient.getQueryData<ApiLead[]>(["leads"]);
			queryClient.setQueryData<ApiLead[]>(["leads"], (old) =>
				old?.map((lead) => (lead.id === id ? { ...lead, ...data } : lead)),
			);
			return { previousLeads };
		},
		onError: (_err, { id }, context) => {
			if (context?.previousLeads) {
				queryClient.setQueryData(["leads"], context.previousLeads);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteLead(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
		},
	});

	return {
		leads,
		isLoading,
		isFetching,
		refreshing: isFetching,
		error,
		refresh: refetch,
		createLead: createMutation.mutateAsync,
		updateLead: updateMutation.mutateAsync,
		deleteLead: deleteMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}
