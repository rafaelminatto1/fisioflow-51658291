/**
 * useScheduleCapacity - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	schedulingApi,
	type ScheduleCapacityConfig,
} from "@/lib/api/workers-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const capacitySchema = z.object({
	day_of_week: z.number().min(0).max(6),
	start_time: z.string(),
	end_time: z.string(),
	max_patients: z.number().min(1).max(20),
});

export type CapacityFormData = z.infer<typeof capacitySchema>;

export interface ScheduleCapacity {
	id: string;
	organization_id?: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	max_patients: number;
	created_at: string;
	updated_at: string;
}

/** Grupo de capacidades com mesmo horário e vagas (para exibição agrupada) */
export interface CapacityGroup {
	start_time: string;
	end_time: string;
	max_patients: number;
	ids: string[];
	days: number[];
}

export function useScheduleCapacity() {
	const { toast } = useToast();
	const { user, profile } = useAuth();
	const queryClient = useQueryClient();

	const isValidUserId = !!user?.uid;
	const organizationId = profile?.organization_id;

	const STALE_TIME_MS = 2 * 60 * 1000;

	const { data: capacities, isLoading } = useQuery({
		queryKey: ["schedule-capacity", organizationId],
		queryFn: async () => {
			const res = await schedulingApi.capacity.list();
			const data = (res?.data ?? []) as ScheduleCapacityConfig[];
			return data
				.map((row) => ({
					id: String(row.id),
					day_of_week: Number(row.day_of_week ?? 0),
					start_time: String(row.start_time ?? "07:00"),
					end_time: String(row.end_time ?? "19:00"),
					max_patients: Number(row.max_patients ?? 1),
					created_at: String(row.created_at ?? ""),
					updated_at: String(row.updated_at ?? ""),
				}))
				.sort((a, b) => {
					if (a.day_of_week !== b.day_of_week)
						return a.day_of_week - b.day_of_week;
					return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
				});
		},
		enabled: !!organizationId,
		staleTime: STALE_TIME_MS,
		retry: 2,
	});

	const createCapacity = useMutation({
		mutationFn: async (formData: CapacityFormData) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada. Tente novamente.");
			}
			const validated = capacitySchema.parse(formData);
			const res = await schedulingApi.capacity.create(validated);
			const created = (res?.data ?? []) as ScheduleCapacity[];
			return created[0];
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-capacity", organizationId],
			});
			toast({
				title: "Configuração salva",
				description: "A capacidade de horário foi configurada com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao salvar configuração",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const createMultipleCapacities = useMutation({
		mutationFn: async (formDataArray: CapacityFormData[]) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada. Tente novamente.");
			}

			const payload = formDataArray.map((formData) =>
				capacitySchema.parse(formData),
			);
			const res = await schedulingApi.capacity.create(payload);
			return (res?.data ?? []) as ScheduleCapacity[];
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["schedule-capacity", organizationId],
			});
			const count = data?.length || 0;
			toast({
				title: "Configurações salvas",
				description: `${count} configuração(ões) de capacidade foram salvas com sucesso.`,
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao salvar configurações",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateCapacity = useMutation({
		mutationFn: async ({
			id,
			...data
		}: Partial<CapacityFormData> & { id: string }) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada. Tente novamente.");
			}
			const res = await schedulingApi.capacity.update(id, data);
			return (res?.data ?? res) as ScheduleCapacity;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedule-capacity"] });
			toast({
				title: "Configuração atualizada",
				description: "As alterações foram salvas com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao atualizar configuração",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const deleteCapacity = useMutation({
		mutationFn: async (id: string) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada. Tente novamente.");
			}
			await schedulingApi.capacity.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedule-capacity"] });
			toast({
				title: "Configuração removida",
				description: "A configuração foi removida com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao remover configuração",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateCapacityGroup = useMutation({
		mutationFn: async ({
			ids,
			max_patients,
		}: {
			ids: string[];
			max_patients: number;
		}) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada. Tente novamente.");
			}
			await Promise.all(
				ids.map((id) => schedulingApi.capacity.update(id, { max_patients })),
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedule-capacity"] });
			toast({
				title: "Configuração atualizada",
				description: "As alterações foram salvas com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao atualizar configuração",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const replaceCapacityGroup = useMutation({
		mutationFn: async ({
			ids,
			formDataArray,
		}: {
			ids: string[];
			formDataArray: CapacityFormData[];
		}) => {
			if (!organizationId) throw new Error("Organização não encontrada.");
			await Promise.all(ids.map((id) => schedulingApi.capacity.delete(id)));
			const payload = formDataArray.map((d) => capacitySchema.parse(d));
			const res = await schedulingApi.capacity.create(payload);
			return (res?.data ?? []) as ScheduleCapacity[];
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedule-capacity"] });
			toast({
				title: "Configuração atualizada",
				description: "As alterações foram salvas com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao atualizar",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const deleteCapacityGroup = useMutation({
		mutationFn: async (ids: string[]) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada. Tente novamente.");
			}
			await Promise.all(ids.map((id) => schedulingApi.capacity.delete(id)));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedule-capacity"] });
			toast({
				title: "Configuração removida",
				description: "A configuração foi removida com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao remover configuração",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	// Helper para converter horário em minutos
	const timeToMinutes = (time: string): number => {
		const [hours, minutes] = time.split(":").map(Number);
		return hours * 60 + minutes;
	};

	// Verifica se dois intervalos de tempo se sobrepõem
	const checkTimeOverlap = (
		start1: string,
		end1: string,
		start2: string,
		end2: string,
	): boolean => {
		const start1Min = timeToMinutes(start1);
		const end1Min = timeToMinutes(end1);
		const start2Min = timeToMinutes(start2);
		const end2Min = timeToMinutes(end2);

		return (
			(start2Min >= start1Min && start2Min < end1Min) ||
			(end2Min > start1Min && end2Min <= end1Min) ||
			(start2Min <= start1Min && end2Min >= end1Min)
		);
	};

	// Verifica conflitos com configurações existentes
	const checkConflicts = (
		selectedDays: number[],
		startTime: string,
		endTime: string,
		excludeIds?: string[],
	): {
		hasConflict: boolean;
		conflicts: Array<{
			day: number;
			dayLabel: string;
			start: string;
			end: string;
		}>;
	} => {
		const list = (capacities || []).filter((c) => !excludeIds?.includes(c.id));
		if (list.length === 0) return { hasConflict: false, conflicts: [] };

		const conflicts: Array<{
			day: number;
			dayLabel: string;
			start: string;
			end: string;
		}> = [];
		const dayLabels: Record<number, string> = {
			0: "Domingo",
			1: "Segunda-feira",
			2: "Terça-feira",
			3: "Quarta-feira",
			4: "Quinta-feira",
			5: "Sexta-feira",
			6: "Sábado",
		};

		for (const day of selectedDays) {
			for (const config of list.filter((c) => c.day_of_week === day)) {
				if (
					checkTimeOverlap(
						config.start_time,
						config.end_time,
						startTime,
						endTime,
					)
				) {
					conflicts.push({
						day,
						dayLabel: dayLabels[day],
						start: config.start_time,
						end: config.end_time,
					});
				}
			}
		}

		return { hasConflict: conflicts.length > 0, conflicts };
	};

	// Helper para obter capacidade de um horário específico
	const getCapacityForTime = (dayOfWeek: number, time: string): number => {
		if (!capacities) return 1;

		const timeMinutes = timeToMinutes(time);

		const matchingConfig = capacities.find((config) => {
			if (config.day_of_week !== dayOfWeek) return false;

			const startTime = timeToMinutes(config.start_time);
			const endTime = timeToMinutes(config.end_time);

			return timeMinutes >= startTime && timeMinutes < endTime;
		});

		return matchingConfig?.max_patients || 1;
	};

	/**
	 * Obtém a menor capacidade configurada em um intervalo de tempo.
	 * Se houver qualquer minuto sem configuração, assume capacidade padrão (1).
	 */
	const getMinCapacityForInterval = (
		dayOfWeek: number,
		startTimeStr: string,
		duration: number,
	): number => {
		if (!capacities || capacities.length === 0) return 1;

		const startMinutes = timeToMinutes(startTimeStr);
		const endMinutes = startMinutes + duration;

		const overlappingConfigs = capacities.filter((config) => {
			if (config.day_of_week !== dayOfWeek) return false;

			const configStart = timeToMinutes(config.start_time);
			const configEnd = timeToMinutes(config.end_time);

			return (
				(startMinutes >= configStart && startMinutes < configEnd) ||
				(endMinutes > configStart && endMinutes <= configEnd) ||
				(startMinutes <= configStart && endMinutes >= configEnd)
			);
		});

		if (overlappingConfigs.length === 0) return 1;

		overlappingConfigs.sort(
			(a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
		);

		let currentPointer = startMinutes;

		for (const config of overlappingConfigs) {
			const configStart = timeToMinutes(config.start_time);
			const configEnd = timeToMinutes(config.end_time);

			if (configStart > currentPointer) {
				return 1;
			}

			if (configEnd > currentPointer) {
				currentPointer = configEnd;
			}
		}

		if (currentPointer < endMinutes) {
			return 1;
		}

		return Math.min(...overlappingConfigs.map((c) => c.max_patients));
	};

	const daysOfWeek = [
		{ value: 0, label: "Domingo" },
		{ value: 1, label: "Segunda-feira" },
		{ value: 2, label: "Terça-feira" },
		{ value: 3, label: "Quarta-feira" },
		{ value: 4, label: "Quinta-feira" },
		{ value: 5, label: "Sexta-feira" },
		{ value: 6, label: "Sábado" },
	];

	const capacityGroups: CapacityGroup[] = (() => {
		const list = capacities || [];
		if (list.length === 0) return [];

		const key = (c: ScheduleCapacity) =>
			`${c.start_time}|${c.end_time}|${c.max_patients}`;
		const map = new Map<string, ScheduleCapacity[]>();

		for (const c of list) {
			const k = key(c);
			if (!map.has(k)) map.set(k, []);
			map.get(k)!.push(c);
		}

		const groups: CapacityGroup[] = Array.from(map.entries()).map(
			([, items]) => ({
				start_time: items[0].start_time,
				end_time: items[0].end_time,
				max_patients: items[0].max_patients,
				ids: items.map((i) => i.id),
				days: [...new Set(items.map((i) => i.day_of_week))].sort(
					(a, b) => a - b,
				),
			}),
		);

		groups.sort((a, b) => {
			const tA = timeToMinutes(a.start_time);
			const tB = timeToMinutes(b.start_time);
			if (tA !== tB) return tA - tB;
			const dA = a.days[0] ?? 0;
			const dB = b.days[0] ?? 0;
			return dA - dB;
		});

		return groups;
	})();

	const authError = !isValidUserId
		? "Sessão de usuário inválida"
		: user && !organizationId
			? "Perfil ainda não carregou a organização. Verifique permissões de acesso ao perfil."
			: null;

	return {
		capacities: capacities || [],
		capacityGroups,
		isLoading: !!organizationId && isLoading,
		daysOfWeek,
		organizationId,
		createCapacity: createCapacity.mutate,
		createMultipleCapacities,
		updateCapacity: updateCapacity.mutate,
		deleteCapacity: deleteCapacity.mutate,
		updateCapacityGroup: updateCapacityGroup.mutate,
		replaceCapacityGroup,
		deleteCapacityGroup: deleteCapacityGroup.mutate,
		getCapacityForTime,
		getMinCapacityForInterval,
		checkConflicts,
		isCreating: createCapacity.isPending || createMultipleCapacities.isPending,
		isUpdating: updateCapacity.isPending || updateCapacityGroup.isPending,
		isReplacing: replaceCapacityGroup.isPending,
		isDeleting: deleteCapacity.isPending || deleteCapacityGroup.isPending,
		authError,
	};
}
