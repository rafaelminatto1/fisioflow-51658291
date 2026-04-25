import React from "react";
import { type RecurringConfig } from "@/types/appointment";
import { AppointmentOptionsPanel } from "../AppointmentOptionsPanel";
import { type SelectedEquipment } from "../EquipmentSelector";
import { type AppointmentReminderData } from "../AppointmentReminder";

interface AppointmentOptionsTabProps {
  currentMode: "create" | "edit" | "view";
  disabled: boolean;
  selectedEquipments: SelectedEquipment[];
  setSelectedEquipments: (equipments: SelectedEquipment[]) => void;
  recurringConfig: RecurringConfig;
  setRecurringConfig: (config: RecurringConfig) => void;
  reminders: AppointmentReminderData[];
  setReminders: (reminders: AppointmentReminderData[]) => void;
  onDuplicate: () => void;
}

export const AppointmentOptionsTab: React.FC<AppointmentOptionsTabProps> = ({
  currentMode,
  disabled,
  selectedEquipments,
  setSelectedEquipments,
  recurringConfig,
  setRecurringConfig,
  reminders,
  setReminders,
  onDuplicate,
}) => {
  return (
    <div className="mt-0 space-y-3 sm:space-y-4">
      <AppointmentOptionsPanel
        disabled={disabled}
        currentMode={currentMode}
        selectedEquipments={selectedEquipments}
        setSelectedEquipments={setSelectedEquipments}
        recurringConfig={recurringConfig}
        setRecurringConfig={setRecurringConfig}
        reminders={reminders}
        setReminders={setReminders}
        onDuplicate={onDuplicate}
      />
    </div>
  );
};
