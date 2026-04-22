import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	schedulingApi,
	type ScheduleAppointmentType,
} from "@/api/v2/scheduling";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
	DEFAULT_APPOINTMENT_TYPES,
	COLOR_OPTIONS,
	type AppointmentType,
	type AppointmentTypeFormData,
} from "@/types/appointment-types";
import { useState, useCallback } from "react";

function apiToClient(row: ScheduleAppointmentType): AppointmentType {
	return {
		id: row.id,
		name: row.name,
		durationMinutes: row.duration_minutes,
		bufferBeforeMinutes: row.buffer_before_minutes,
		bufferAfterMinutes: row.buffer_after_minutes,
		color: row.color,
		maxPerDay: row.max_per_day,
		isActive: row.is_active,
		isDefault: row.is_default,
	};
}

function clientToApi(
	t: Partial<AppointmentType>,
): Record<string, unknown> {
	return {
		name: t.name,
		duration_minutes: t.durationMinutes,
		buffer_before_minutes: t.bufferBeforeMinutes,
		buffer_after_minutes: t.bufferAfterMinutes,
		color: t.color,
		max_per_day: t.maxPerDay ?? null,
		is_active: t.isActive ?? true,
		is_default: t.isDefault ?? false,
		sort_order: t.sortOrder ?? 0,
	};
}

const QUERY_KEY = "schedule-appointment-types";

export function useAppointmentTypes() {
	const { toast } = useToast();
	const { user, profile } = useAuth();
	const queryClient = useQueryClient();
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const organizationId = profile?.organization_id;

	const { data: types = [], isLoading } = useQuery({
		queryKey: [QUERY_KEY, organizationId],
		queryFn: async () => {
			try {
				const res = await schedulingApi.appointmentTypes.list();
				const data = (res?.data ?? []) as ScheduleAppointmentType[];
				if (data.length === 0) return DEFAULT_APPOINTMENT_TYPES;
				return data.map(apiToClient);
			} catch {
				return DEFAULT_APPOINTMENT_TYPES;
			}
		},
		enabled: !!organizationId,
		staleTime: 2 * 60 * 1000,
		retry: 2,
	});

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
	}, [queryClient, organizationId]);

	const addType = useMutation({
		mutationFn: async () => {
			const colorIdx = types.length % COLOR_OPTIONS.length;
			const payload = {
				name: "Novo Tipo",
				duration_minutes: 30,
				buffer_before_minutes: 0,
				buffer_after_minutes: 5,
				color: COLOR_OPTIONS[colorIdx],
				max_per_day: null,
				is_active: true,
				is_default: false,
				sort_order: types.length,
			};
			const res = await schedulingApi.appointmentTypes.create(payload);
			return (res?.data ?? res) as ScheduleAppointmentType;
		},
		onSuccess: (data) => {
			invalidate();
			if (data?.id) setExpandedId(data.id);
		},
		onError: () => {
			toast({ title: "Erro ao criar tipo de atendimento", variant: "destructive" });
		},
	});

	const updateType = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<AppointmentTypeFormData> }) => {
			const payload = clientToApi(data as Partial<AppointmentType>);
			const res = await schedulingApi.appointmentTypes.update(id, payload);
			return (res?.data ?? res) as ScheduleAppointmentType;
		},
		onSuccess: () => invalidate(),
		onError: () => {
			toast({ title: "Erro ao atualizar tipo de atendimento", variant: "destructive" });
		},
	});

	const removeType = useMutation({
		mutationFn: async (id: string) => {
			if (id.startsWith("custom-") || id.startsWith("eval") || id.startsWith("return") || id.startsWith("rehab") || id.startsWith("electro") || id.startsWith("myofascial")) {
				return null;
			}
			await schedulingApi.appointmentTypes.delete(id);
		},
		onSuccess: () => {
			invalidate();
			setExpandedId(null);
		},
		onError: () => {
			toast({ title: "Erro ao remover tipo de atendimento", variant: "destructive" });
		},
	});

	const toggleActive = useMutation({
		mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
			if (id.startsWith("custom-") || id.startsWith("eval") || id.startsWith("return") || id.startsWith("rehab") || id.startsWith("electro") || id.startsWith("myofascial")) {
				return null;
			}
			const res = await schedulingApi.appointmentTypes.update(id, { is_active: isActive });
			return res;
		},
		onSuccess: () => invalidate(),
		onError: () => {
			toast({ title: "Erro ao alterar status", variant: "destructive" });
		},
	});

	const duplicateType = useMutation({
		mutationFn: async (id: string) => {
			const source = types.find((t) => t.id === id);
			if (!source) return null;
			const payload = {
				...clientToApi(source),
				name: `${source.name} (cópia)`,
				is_default: false,
				sort_order: types.length,
			};
			const res = await schedulingApi.appointmentTypes.create(payload);
			return (res?.data ?? res) as ScheduleAppointmentType;
		},
		onSuccess: (data) => {
			invalidate();
			if (data?.id) setExpandedId(data.id);
		},
		onError: () => {
			toast({ title: "Erro ao duplicar tipo de atendimento", variant: "destructive" });
		},
	});

	const toggleExpand = useCallback((id: string) => {
		setExpandedId((prev) => (prev === id ? null : id));
	}, []);

	return {
		types,
		expandedId,
		isLoading,
		addType: addType.mutate,
		updateType: updateType.mutate,
		removeType: removeType.mutate,
		toggleActive: (id: string) => {
			const current = types.find((t) => t.id === id);
			if (current) toggleActive.mutate({ id, isActive: !current.isActive });
		},
		duplicateType: duplicateType.mutate,
		toggleExpand,
	};
}
