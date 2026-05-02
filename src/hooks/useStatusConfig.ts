import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  APPOINTMENT_STATUS_CONFIG,
  getStatusColor,
  lightenColor,
  normalizeStatus,
  type AppointmentStatusConfig,
} from "@/components/schedule/shared/appointment-status";
import { schedulingApi, type ScheduleStatusSetting } from "@/api/v2";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getTextColorClass } from "@/utils/colorContrast";

export interface CustomStatusConfig extends Partial<AppointmentStatusConfig> {
  id: string;
  key?: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  allowedActions: string[];
  isCustom?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  countsTowardCapacity?: boolean;
}

type StatusColors = { color: string; bgColor: string; borderColor: string };

const statusQueryKey = (organizationId?: string | null) => [
  "appointment-status-settings",
  organizationId ?? "no-org",
];

const defaultStatusRows = (): ScheduleStatusSetting[] =>
  Object.entries(APPOINTMENT_STATUS_CONFIG).map(([key, config], index) => {
    const color = getStatusColor(key);
    return {
      id: key,
      key,
      label: config.label,
      color,
      bg_color: lightenColor(color, 0.86),
      border_color: color,
      is_default: true,
      is_active: true,
      sort_order: (index + 1) * 10,
      allowed_actions: config.allowedActions,
      counts_toward_capacity: ![
        "cancelado",
        "faltou",
        "faltou_com_aviso",
        "faltou_sem_aviso",
        "nao_atendido",
        "nao_atendido_sem_cobranca",
        "remarcar",
      ].includes(key),
    };
  });

function rowToCustomStatus(row: ScheduleStatusSetting): CustomStatusConfig {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    color: row.color,
    bgColor: row.bg_color,
    borderColor: row.border_color,
    allowedActions: row.allowed_actions ?? [],
    isCustom: !row.is_default,
    isDefault: row.is_default,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    countsTowardCapacity: row.counts_toward_capacity,
  };
}

function buildConfig(row: ScheduleStatusSetting): AppointmentStatusConfig & {
  id: string;
  key: string;
  color: string;
  bgColor: string;
  borderColor: string;
  calendarCardColors: { accent: string; background: string; text: string };
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  countsTowardCapacity: boolean;
} {
  const base =
    APPOINTMENT_STATUS_CONFIG[row.key] ??
    APPOINTMENT_STATUS_CONFIG[normalizeStatus(row.key)] ??
    APPOINTMENT_STATUS_CONFIG.agendado;
  const textColorClass = getTextColorClass(row.bg_color);
  return {
    ...base,
    id: row.id,
    key: row.key,
    label: row.label,
    color: row.color,
    bgColor: row.bg_color,
    bg: row.bg_color,
    borderColor: row.border_color,
    text: textColorClass,
    allowedActions: row.allowed_actions ?? base.allowedActions,
    calendarCardColors: {
      accent: row.border_color || row.color,
      background: row.bg_color || lightenColor(row.color, 0.88),
      text: row.color,
    },
    isDefault: row.is_default,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    countsTowardCapacity: row.counts_toward_capacity,
  };
}

export function useStatusConfig() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = profile?.organization_id;

  const { data, isLoading, error } = useQuery({
    queryKey: statusQueryKey(organizationId),
    queryFn: async () => {
      const res = await schedulingApi.settings.statuses.list();
      return (res?.data ?? []) as ScheduleStatusSetting[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const rows = useMemo(() => {
    const source = data && data.length > 0 ? data : defaultStatusRows();
    return [...source].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.label.localeCompare(b.label);
    });
  }, [data]);

  const statusConfig = useMemo(() => {
    const merged: Record<string, ReturnType<typeof buildConfig>> = {};
    for (const row of rows) {
      merged[row.key] = buildConfig(row);
    }
    return merged;
  }, [rows]);

  const findRow = useCallback(
    (statusId: string) => rows.find((row) => row.id === statusId || row.key === statusId),
    [rows],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: statusQueryKey(organizationId) });
  }, [organizationId, queryClient]);

  const createMutation = useMutation({
    mutationFn: (status: Omit<CustomStatusConfig, "isCustom">) =>
      schedulingApi.settings.statuses.create({
        key: status.key ?? status.id,
        label: status.label,
        color: status.color,
        bg_color: status.bgColor,
        border_color: status.borderColor,
        allowed_actions: status.allowedActions,
        is_active: status.isActive ?? true,
        sort_order: status.sortOrder ?? rows.length * 10 + 10,
        counts_toward_capacity: status.countsTowardCapacity ?? true,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Status criado", description: "O status já pode ser usado na agenda." });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao criar status", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      statusId,
      updates,
    }: {
      statusId: string;
      updates: Partial<Omit<CustomStatusConfig, "id" | "isCustom">>;
    }) => {
      const row = findRow(statusId);
      if (!row) throw new Error("Status não encontrado.");
      return schedulingApi.settings.statuses.update(row.id, {
        key: updates.key ?? row.key,
        label: updates.label ?? row.label,
        color: updates.color ?? row.color,
        bg_color: updates.bgColor ?? row.bg_color,
        border_color: updates.borderColor ?? row.border_color,
        allowed_actions: updates.allowedActions ?? row.allowed_actions,
        is_active: updates.isActive ?? row.is_active,
        sort_order: updates.sortOrder ?? row.sort_order,
        counts_toward_capacity: updates.countsTowardCapacity ?? row.counts_toward_capacity,
      });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Status atualizado", description: "As alterações foram aplicadas." });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao atualizar status",
        description: err.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (statusId: string) => {
      const row = findRow(statusId);
      if (!row) throw new Error("Status não encontrado.");
      return schedulingApi.settings.statuses.delete(row.id);
    },
    onSuccess: (res) => {
      invalidate();
      toast({
        title: res?.deactivated ? "Status desativado" : "Status removido",
        description: res?.deactivated
          ? "O status estava em uso e foi mantido no histórico."
          : "O status foi removido.",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao remover status", description: err.message, variant: "destructive" }),
  });

  const getStatusConfig = useCallback(
    (status: string): AppointmentStatusConfig => {
      return statusConfig[status] || statusConfig[normalizeStatus(status)] || statusConfig.agendado;
    },
    [statusConfig],
  );

  const updateStatusColor = useCallback(
    (statusId: string, colors: StatusColors) => {
      updateMutation.mutate({
        statusId,
        updates: {
          color: colors.color,
          bgColor: colors.bgColor,
          borderColor: colors.borderColor,
        },
      });
    },
    [updateMutation],
  );

  const resetStatusColor = useCallback(
    (statusId: string) => {
      const normalized = normalizeStatus(statusId);
      const color = getStatusColor(normalized);
      updateStatusColor(statusId, {
        color,
        bgColor: lightenColor(color, 0.86),
        borderColor: color,
      });
    },
    [updateStatusColor],
  );

  const hasCustomColors = useCallback(
    (statusId: string) => {
      const row = findRow(statusId);
      if (!row) return false;
      const color = getStatusColor(row.key);
      return row.color !== color || row.border_color !== color;
    },
    [findRow],
  );

  const getStatusColors = useCallback(
    (statusId: string): StatusColors => {
      const row = findRow(statusId) ?? findRow(normalizeStatus(statusId));
      if (row) {
        return {
          color: row.color,
          bgColor: row.bg_color,
          borderColor: row.border_color,
        };
      }
      const color = getStatusColor(statusId);
      return { color, bgColor: lightenColor(color, 0.86), borderColor: color };
    },
    [findRow],
  );

  const resetToDefaults = useCallback(() => {
    for (const row of rows) {
      if (!row.is_default) {
        deleteMutation.mutate(row.id);
      } else {
        resetStatusColor(row.id);
      }
    }
  }, [deleteMutation, resetStatusColor, rows]);

  const activeRows = rows.filter((row) => row.is_active);

  return {
    statusConfig,
    getStatusConfig,
    updateStatusColor,
    resetStatusColor,
    hasCustomColors,
    _isCustomStatus: (statusId: string) => {
      const row = findRow(statusId);
      return !!row && !row.is_default;
    },
    getStatusColors,
    createStatus: createMutation.mutate,
    updateStatus: (statusId: string, updates: Partial<Omit<CustomStatusConfig, "id" | "isCustom">>) =>
      updateMutation.mutate({ statusId, updates }),
    deleteStatus: deleteMutation.mutate,
    resetToDefaults,
    allStatuses: activeRows.map((row) => row.key),
    allStatusRows: rows,
    customStatuses: rows.filter((row) => !row.is_default).map(rowToCustomStatus),
    isLoading,
    error,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
