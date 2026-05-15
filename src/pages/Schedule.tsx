import { Cake, Sparkles } from "lucide-react";
import { Suspense, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PatientService } from "@/lib/services/PatientService";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { BulkActionsBar } from "@/components/schedule/BulkActionsBar";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { ScheduleModals } from "@/components/schedule/ScheduleModals";
import { CalendarSkeletonEnhanced } from "@/components/schedule/skeletons/CalendarSkeletonEnhanced";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBirthdayNotification } from "@/hooks/useBirthdayNotification";
import { useBulkActions } from "@/hooks/useBulkActions";
import { useScheduleHandlers } from "@/hooks/useScheduleHandlers";
import { useSchedulePageData, type ViewType } from "@/hooks/useSchedulePage";
import type { ViewType as CalendarViewType } from "@/hooks/useScheduleState";
import { KEYBOARD_SHORTCUTS } from "@/lib/calendar/constants";
import {
  updateScheduleViewSearchParams,
  type ScheduleViewType,
} from "@/lib/schedule/viewParams";
import {
  parseLocalDate,
  getAdjustedToday,
  getAdjustedTodayYMD,
  toLocalYMD,
} from "@/lib/date-utils";

import "@/styles/schedule.css";

export default function Schedule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const dateParamRaw = searchParams.get("date");
  const dateParam =
    dateParamRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateParamRaw) ? dateParamRaw : getAdjustedTodayYMD();

  const rawViewParam = searchParams.get("view");
  const viewParam = (rawViewParam === "day" || rawViewParam === "week" || rawViewParam === "month") 
    ? (rawViewParam as ViewType) 
    : (isMobile ? "day" : "week");
  
  const statusParam = searchParams.get("status")?.split(",").filter(Boolean) || [];
  const typesParam = searchParams.get("types")?.split(",").filter(Boolean) || [];
  const therapistsParam = searchParams.get("therapists")?.split(",").filter(Boolean) || [];
  const patientParam = searchParams.get("patient") || undefined;

  const { data, isLoading, refetch } = useSchedulePageData(dateParam, viewParam, {
    status: statusParam,
    types: typesParam,
    therapists: therapistsParam,
    patient: patientParam,
  });

  const { appointments, therapists, patients, birthdaysToday, staffBirthdaysToday, tarefas } = data;
  const currentDate = parseLocalDate(dateParam);

  const uniquePatientIds = useMemo(() => {
    return Array.from(
      new Set(appointments.map((a: any) => a.patient_id || a.patientId).filter(Boolean)),
    ) as string[];
  }, [appointments]);

  const painQueries = useQueries({
    queries: uniquePatientIds.map((id) => ({
      queryKey: ["painRecords", id],
      queryFn: () => PatientService.getPainRecords(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const enrichedAppointments = useMemo(() => {
    const highPainMap = new Map<string, boolean>();
    painQueries.forEach((q, index) => {
      if (q.data) {
        const hasHigh = q.data.some((record) => record.level > 7);
        highPainMap.set(uniquePatientIds[index], hasHigh);
      }
    });

    return appointments.map((a: any) => ({
      ...a,
      has_high_pain_alert: highPainMap.get(a.patient_id || a.patientId) || false,
    }));
  }, [appointments, painQueries, uniquePatientIds]);

  const viewType = viewParam;
  const patientFilter = patientParam || "";
  const filters = {
    status: statusParam,
    types: typesParam,
    therapists: therapistsParam,
  };

  const isNavigating = isLoading && appointments.length === 0;
  const { sendBirthdayMessage, isSending } = useBirthdayNotification();

  const {
    selectedIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleSelection,
    clearSelection,
    deleteSelected,
    updateStatusSelected,
  } = useBulkActions();

  const { modals, actions } = useScheduleHandlers(currentDate, () => refetch(), isSelectionMode);

  useEffect(() => {
    if (!isLoading) {
      actions.checkEditUrlParam(appointments);
    }
  }, [appointments, actions, isLoading]);

  const handleDateChange = (date: Date) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("date", toLocalYMD(date));
    setSearchParams(newParams, { replace: true });
  };

  const handleViewTypeChange = (view: ScheduleViewType) => {
    const newParams = updateScheduleViewSearchParams(searchParams, view);
    setSearchParams(newParams, { replace: true });
  };

  const handleFiltersChange = (newFilters: any) => {
    const newParams = new URLSearchParams(searchParams);
    if (newFilters.status?.length > 0) newParams.set("status", newFilters.status.join(","));
    else newParams.delete("status");
    if (newFilters.types?.length > 0) newParams.set("types", newFilters.types.join(","));
    else newParams.delete("types");
    if (newFilters.therapists?.length > 0)
      newParams.set("therapists", newFilters.therapists.join(","));
    else newParams.delete("therapists");
    setSearchParams(newParams, { replace: true });
  };

  const handlePatientFilterChange = (val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set("patient", val);
    else newParams.delete("patient");
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    ["status", "types", "therapists", "patient"].forEach((p) => newParams.delete(p));
    setSearchParams(newParams, { replace: true });
  };

  const handleTimeSlotClick = (dateTime: any) => {
    const dtString = typeof dateTime === "string" ? dateTime : dateTime?.toString() || "";
    if (!dtString) return;
    const match = dtString.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
    if (match) {
      const date = parseLocalDate(match[1]);
      actions.handleTimeSlotClick(date, match[2] || "");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      const isModalActive =
        modals.isModalOpen || modals.showKeyboardShortcuts || modals.quickEditAppointment;
      if (isModalActive && e.key !== "Escape") return;
      const key = e.key.toLowerCase();
      switch (key) {
        case "a":
          e.preventDefault();
          toggleSelectionMode();
          break;
        case KEYBOARD_SHORTCUTS.NEW_APPOINTMENT:
          e.preventDefault();
          actions.handleCreateAppointment();
          break;
        case KEYBOARD_SHORTCUTS.SEARCH:
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[aria-label*="paciente"]')?.focus();
          break;
        case KEYBOARD_SHORTCUTS.DAY_VIEW:
          handleViewTypeChange("day");
          break;
        case KEYBOARD_SHORTCUTS.WEEK_VIEW:
          handleViewTypeChange("week");
          break;
        case KEYBOARD_SHORTCUTS.MONTH_VIEW:
          handleViewTypeChange("month");
          break;
        case KEYBOARD_SHORTCUTS.TODAY:
          handleDateChange(getAdjustedToday());
          break;
        case KEYBOARD_SHORTCUTS.HELP:
        case KEYBOARD_SHORTCUTS.HELP_ALT:
          e.preventDefault();
          modals.setShowKeyboardShortcuts(true);
          break;
        case "escape":
          if (modals.showKeyboardShortcuts) modals.setShowKeyboardShortcuts(false);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modals, actions, toggleSelectionMode, handleDateChange, handleViewTypeChange]);

  return (
    <PageLayout showFooter={false}>
      <PageContainer
        maxWidth="full"
        noPadding
        className="h-[calc(100vh-64px)] flex flex-col px-2 md:px-3"
      >
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Action Banner: Birthdays */}
          {(birthdaysToday.length > 0 || staffBirthdaysToday.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-[45] w-full max-w-4xl px-4 pointer-events-none"
            >
              <div className="premium-glass rounded-2xl p-3 flex items-center justify-between border-primary/20 pointer-events-auto shadow-2xl">
                <div className="flex items-center gap-6">
                  {(birthdaysToday.length > 0 || staffBirthdaysToday.length > 0) && (
                    <div className="flex items-center gap-2">
                      <Cake className="h-4 w-4 text-primary" />
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="text-primary uppercase tracking-wider">Aniversários:</span>{" "}
                        {[...birthdaysToday, ...staffBirthdaysToday]
                          .map((p) => p.full_name)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {birthdaysToday.length > 0 && (
                    <Button
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase bg-primary text-primary-foreground rounded-lg"
                      onClick={() =>
                        birthdaysToday.forEach((p) => sendBirthdayMessage(p.id, p.phone || ""))
                      }
                      disabled={isSending}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2" />
                      Parabéns
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex-1 bento-card p-0 overflow-hidden bg-white dark:bg-slate-950/50">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewType}-${dateParam}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <Suspense
                  fallback={<CalendarSkeletonEnhanced viewType={viewType as CalendarViewType} />}
                >
                  {isNavigating ? (
                    <CalendarSkeletonEnhanced viewType={viewType as CalendarViewType} />
                  ) : (
                    <ScheduleCalendar
                      appointments={enrichedAppointments as any}
                      tarefas={tarefas ?? []}
                      currentDate={currentDate}
                      onDateChange={handleDateChange}
                      viewType={viewType}
                      onViewTypeChange={handleViewTypeChange}
                      onTimeSlotClick={handleTimeSlotClick}
                      onAppointmentReschedule={(id, start) => {
                        const appointment = appointments.find((a) => a.id === id);
                        if (!appointment) return;
                        const match = start.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
                        if (match)
                          actions.handleAppointmentReschedule(
                            appointment,
                            parseLocalDate(match[1]),
                            match[2] || "",
                          );
                      }}
                      onEditAppointment={(id) => {
                        const appointment = appointments.find((a) => a.id === id);
                        if (appointment) actions.handleEditAppointment(appointment);
                      }}
                      onDeleteAppointment={(id) => {
                        const appointment = appointments.find((a) => a.id === id);
                        if (appointment) actions.handleDeleteAppointment(appointment);
                      }}
                      onStatusChange={actions.handleUpdateStatus}
                      isSelectionMode={isSelectionMode}
                      selectedIds={selectedIds}
                      onToggleSelection={toggleSelection}
                      onCreateAppointment={actions.handleCreateAppointment}
                      onToggleSelectionMode={toggleSelectionMode}
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      onClearFilters={clearFilters}
                      totalAppointmentsCount={appointments.length}
                      patientFilter={patientFilter}
                      onPatientFilterChange={handlePatientFilterChange}
                      therapists={therapists}
                    />
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onDeleteSelected={deleteSelected}
          onUpdateStatusSelected={updateStatusSelected}
        />

        <ScheduleModals
          currentDate={currentDate}
          modals={modals}
          actions={actions}
          therapists={therapists}
          patients={patients}
        />
      </PageContainer>
    </PageLayout>
  );
}
