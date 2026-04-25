/**
 * Hook useQuickFilters - Gerenciamento de filtros rápidos
 *
 * Gerencia filtros pré-definidos para agendamentos:
 * - Hoje
 * - Amanhã
 * - Esta semana
 * - Faltas
 * - Pagamentos pendentes
 */

import { useState, useCallback, useMemo } from "react";
import { format, isSameDay, startOfDay, endOfWeek, startOfWeek } from "date-fns";
import type { QuickFilterType } from "@/components/schedule/QuickFilters";
import type { Appointment } from "@/types/appointment";

interface UseQuickFiltersProps {
  appointments: Appointment[];
  onFilterChange?: (filteredAppointments: Appointment[]) => void;
}

export function useQuickFilters({ appointments, onFilterChange }: UseQuickFiltersProps = {}) {
  const [selectedFilter, setSelectedFilter] = useState<QuickFilterType>("all");

  // Filtrar agendamentos baseado no filtro selecionado
  const filteredAppointments = useMemo(() => {
    if (selectedFilter === "all") {
      return appointments;
    }

    const now = new Date();

    const tomorrow = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    switch (selectedFilter) {
      case "today":
        return appointments.filter((apt) => {
          const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
          return isSameDay(aptDate, now);
        });

      case "tomorrow":
        return appointments.filter((apt) => {
          const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
          const aptDay = startOfDay(aptDate);
          return isSameDay(aptDay, tomorrow);
        });

      case "thisWeek":
        return appointments.filter((apt) => {
          const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
          const aptDay = startOfDay(aptDate);
          return aptDay >= weekStart && aptDay <= weekEnd;
        });

      case "noShows":
        return appointments.filter((apt) => {
          const s = (apt.status || "").toLowerCase();
          return [
            "faltou",
            "faltou_com_aviso",
            "faltou_sem_aviso",
            "nao_atendido",
            "nao_atendido_sem_cobranca",
            "falta",
            "no_show",
          ].includes(s);
        });

      case "pendingPayment":
        return appointments.filter((apt) => {
          const paymentStatus = apt.paymentStatus || "";
          const s = (apt.status || "").toLowerCase();
          return (
            (paymentStatus === "pending" ||
              paymentStatus === "partial" ||
              (!paymentStatus && s !== "cancelado")) &&
            s !== "cancelado"
          );
        });

      default:
        return appointments;
    }
  }, [appointments, selectedFilter]);

  // Atualizar filtered appointments quando mudar
  const handleFilterChange = useCallback(
    (filter: QuickFilterType) => {
      setSelectedFilter(filter);

      // Disparar feedback háptico
      if ("vibrate" in navigator && navigator.vibrate) {
        navigator.vibrate(10);
      }

      onFilterChange?.(filteredAppointments);
    },
    [onFilterChange, filteredAppointments],
  );

  // Calcular estatísticas do filtro atual
  const stats = useMemo(() => {
    return {
      count: filteredAppointments.length,
      completed: filteredAppointments.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return ["atendido", "concluido", "realizado", "presenca_confirmada", "confirmado"].includes(
          s,
        );
      }).length,
      pending: filteredAppointments.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return ["agendado", "avaliacao", "aguardando_confirmacao", "awaiting"].includes(s);
      }).length,
      cancelled: filteredAppointments.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return ["cancelado", "cancelled", "remarcar", "reagendado"].includes(s);
      }).length,
      noShows: filteredAppointments.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return [
          "faltou",
          "faltou_com_aviso",
          "faltou_sem_aviso",
          "nao_atendido",
          "nao_atendido_sem_cobranca",
          "falta",
          "no_show",
        ].includes(s);
      }).length,
      pendingPayment: filteredAppointments.filter((a) => {
        const paymentStatus = a.paymentStatus || "";
        return paymentStatus === "pending" || paymentStatus === "partial";
      }).length,
      totalRevenue: filteredAppointments.reduce((sum, a) => {
        const amount = a.amount || 0;
        const s = (a.status || "").toLowerCase();
        // Não cobra em caso de cancelamento ou qualquer tipo de falta (ZenFisio)
        const isNotCharged = [
          "cancelado",
          "cancelled",
          "remarcar",
          "faltou",
          "faltou_com_aviso",
          "faltou_sem_aviso",
          "nao_atendido",
          "nao_atendido_sem_cobranca",
          "falta",
        ].includes(s);
        return !isNotCharged ? sum + amount : sum;
      }, 0),
      totalDuration: filteredAppointments.reduce((sum, a) => sum + (a.duration || 60), 0),
      avgDuration:
        filteredAppointments.length > 0
          ? filteredAppointments.reduce((sum, a) => sum + (a.duration || 60), 0) /
            filteredAppointments.length
          : 0,
      avgDurationDisplay:
        filteredAppointments.length > 0
          ? format(
              Math.round(
                filteredAppointments.reduce((sum, a) => sum + (a.duration || 60), 0) /
                  filteredAppointments.length,
              ),
              {
                hour: "numeric",
                minute: "numeric",
              },
            ).replace(":", "h") + "min"
          : "0min",
    };
  }, [filteredAppointments]);

  return {
    selectedFilter,
    setSelectedFilter: handleFilterChange,
    filteredAppointments,
    stats,
  };
}
