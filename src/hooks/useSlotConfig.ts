import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulingApi, type ScheduleSlotConfig } from "@/api/v2/scheduling";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface SlotConfigData {
	slotInterval: 15 | 30 | 60;
	alignmentType: string;
}

const QUERY_KEY = "schedule-slot-config";

export function useSlotConfig() {
	const { toast } = useToast();
	const { profile } = useAuth();
	const queryClient = useQueryClient();
	const organizationId = profile?.organization_id;

	const { data, isLoading } = useQuery({
		queryKey: [QUERY_KEY, organizationId],
		queryFn: async (): Promise<SlotConfigData> => {
			try {
				const res = await schedulingApi.slotConfig.get();
				const row = (res?.data ?? null) as ScheduleSlotConfig | null;
				if (!row) return { slotInterval: 30, alignmentType: "fixed" };
				return {
					slotInterval: row.slot_interval_minutes as 15 | 30 | 60,
					alignmentType: row.alignment_type,
				};
			} catch {
				return { slotInterval: 30, alignmentType: "fixed" };
			}
		},
		enabled: !!organizationId,
		staleTime: 2 * 60 * 1000,
		retry: 2,
	});

	const save = useMutation({
		mutationFn: async (d: SlotConfigData) => {
			await schedulingApi.slotConfig.upsert({
				slot_interval_minutes: d.slotInterval,
				alignment_type: d.alignmentType,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
		},
		onError: () => {
			toast({ title: "Erro ao salvar configuração de slots", variant: "destructive" });
		},
	});

	return {
		data: data ?? { slotInterval: 30, alignmentType: "fixed" },
		isLoading,
		save: save.mutate,
		isSaving: save.isPending,
	};
}
