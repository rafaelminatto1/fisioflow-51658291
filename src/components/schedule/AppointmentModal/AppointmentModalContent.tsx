import React from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Patient } from "@/types";
import { type AppointmentFormData, type RecurringConfig } from "@/types/appointment";
import { type TherapistOption } from "@/hooks/useTherapists";
import { AppointmentInfoTab } from "./AppointmentInfoTab";
import { AppointmentOptionsTab } from "./AppointmentOptionsTab";
import { type AppointmentModalProps } from "./index";

interface AppointmentModalContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  methods: UseFormReturn<AppointmentFormData>;
  currentMode: "create" | "edit" | "view";
  patients: Patient[];
  patientsLoading: boolean;
  defaultPatientId?: AppointmentModalProps["defaultPatientId"];
  onQuickPatientCreate: (searchTerm: string) => void;
  lastCreatedPatient: { id: string; name: string } | null;
  normalizedAppointmentPatientName: string;
  selectedPatientName: string;
  timeSlots: string[];
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  getMinCapacityForInterval: (day: number, time: string, duration: number) => number;
  conflictCount: number;
  onAutoSchedule: () => void;
  therapists: TherapistOption[];
  therapistsLoading: boolean;
  isNotesExpanded: boolean;
  setIsNotesExpanded: (expanded: boolean) => void;
  selectedEquipments: any[];
  setSelectedEquipments: (equipments: any[]) => void;
  recurringConfig: RecurringConfig;
  setRecurringConfig: (config: RecurringConfig) => void;
  reminders: any[];
  setReminders: (reminders: any[]) => void;
  onDuplicate: () => void;
  onSubmitAppointment: (data: AppointmentFormData, recurring: RecurringConfig) => void;
}

export const AppointmentModalContent: React.FC<AppointmentModalContentProps> = ({
  activeTab,
  setActiveTab,
  methods,
  currentMode,
  patients,
  patientsLoading,
  defaultPatientId,
  onQuickPatientCreate,
  lastCreatedPatient,
  normalizedAppointmentPatientName,
  selectedPatientName,
  timeSlots,
  isCalendarOpen,
  setIsCalendarOpen,
  getMinCapacityForInterval,
  conflictCount,
  onAutoSchedule,
  therapists,
  therapistsLoading,
  isNotesExpanded,
  setIsNotesExpanded,
  selectedEquipments,
  setSelectedEquipments,
  recurringConfig,
  setRecurringConfig,
  reminders,
  setReminders,
  onDuplicate,
  onSubmitAppointment,
}) => {
  const { handleSubmit } = methods;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
      <div className="px-5 sm:px-6 border-b border-slate-100 shrink-0">
        <TabsList className="flex w-full gap-0 bg-transparent h-10 border-none p-0">
          <TabsTrigger
            value="info"
            className="flex items-center gap-1.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 hover:text-slate-700 rounded-none px-3 h-full transition-colors"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Informações</span>
          </TabsTrigger>
          <TabsTrigger
            value="options"
            className="flex items-center gap-1.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 hover:text-slate-700 rounded-none px-3 h-full transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Configurações</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <form
          id="appointment-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(
              (data) => onSubmitAppointment(data, recurringConfig),
              (errors) => {
                console.error("Form validation errors", errors);
                toast({
                  variant: "destructive",
                  title: "Erro no formulário",
                  description: "Verifique os campos obrigatórios do formulário",
                });
              },
            )(e);
          }}
          className="px-5 sm:px-6 py-5"
        >
          <TabsContent value="info">
            <AppointmentInfoTab
              methods={methods}
              currentMode={currentMode}
              patients={patients}
              patientsLoading={patientsLoading}
              defaultPatientId={defaultPatientId}
              onQuickPatientCreate={onQuickPatientCreate}
              lastCreatedPatient={lastCreatedPatient}
              normalizedAppointmentPatientName={normalizedAppointmentPatientName}
              selectedPatientName={selectedPatientName}
              timeSlots={timeSlots}
              isCalendarOpen={isCalendarOpen}
              setIsCalendarOpen={setIsCalendarOpen}
              getMinCapacityForInterval={getMinCapacityForInterval}
              conflictCount={conflictCount}
              onAutoSchedule={onAutoSchedule}
              therapists={therapists}
              therapistsLoading={therapistsLoading}
              isNotesExpanded={isNotesExpanded}
              setIsNotesExpanded={setIsNotesExpanded}
            />
          </TabsContent>

          <TabsContent value="options">
            <AppointmentOptionsTab
              currentMode={currentMode}
              disabled={currentMode === "view"}
              selectedEquipments={selectedEquipments}
              setSelectedEquipments={setSelectedEquipments}
              recurringConfig={recurringConfig}
              setRecurringConfig={setRecurringConfig}
              reminders={reminders}
              setReminders={setReminders}
              onDuplicate={onDuplicate}
            />
          </TabsContent>
        </form>
      </div>
    </Tabs>
  );
};
