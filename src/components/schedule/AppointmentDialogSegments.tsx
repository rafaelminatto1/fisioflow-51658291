import type { Patient } from "@/types";
import type { RecurringConfig } from "@/types/appointment";
import type { AppointmentReminderData } from "./AppointmentReminder";
import { AppointmentDateTimeSection } from "./AppointmentDateTimeSection";
import { AppointmentOptionsPanel } from "./AppointmentOptionsPanel";
import { AppointmentPaymentTab } from "./AppointmentPaymentTab";
import { AppointmentPatientSelectionSection } from "./AppointmentPatientSelectionSection";
import { AppointmentTypeStatusSection } from "./AppointmentTypeStatusSection";
import type { SelectedEquipment } from "./EquipmentSelector";

export const PatientSelectionSection = ({
	patients,
	isLoading,
	disabled,
	onCreateNew,
	fallbackPatientName,
	fallbackDescription,
}: {
	patients: Patient[];
	isLoading: boolean;
	disabled: boolean;
	onCreateNew: (name: string) => void;
	/** Nome do paciente recém-criado (cadastro rápido) para exibir até a lista atualizar */
	fallbackPatientName?: string;
	/** Descrição opcional para o fallback (ex.: "Recém-cadastrado") */
	fallbackDescription?: string;
}) => <AppointmentPatientSelectionSection
	patients={patients}
	isLoading={isLoading}
	disabled={disabled}
	onCreateNew={onCreateNew}
	fallbackPatientName={fallbackPatientName}
	fallbackDescription={fallbackDescription}
/>;

export const DateTimeSection = ({
	disabled,
	timeSlots,
	isCalendarOpen,
	setIsCalendarOpen,
	getMinCapacityForInterval,
	conflictCount,
	onAutoSchedule,
	watchedDateStr,
	watchedTime,
	watchedDuration,
}: {
	disabled: boolean;
	timeSlots: string[];
	isCalendarOpen: boolean;
	setIsCalendarOpen: (open: boolean) => void;
	getMinCapacityForInterval: (
		day: number,
		time: string,
		duration: number,
	) => number;
	conflictCount: number;
	onAutoSchedule?: () => void;
	watchedDateStr?: string;
	watchedTime?: string;
	watchedDuration?: number;
}) => <AppointmentDateTimeSection
	disabled={disabled}
	timeSlots={timeSlots}
	isCalendarOpen={isCalendarOpen}
	setIsCalendarOpen={setIsCalendarOpen}
	getMinCapacityForInterval={getMinCapacityForInterval}
	conflictCount={conflictCount}
	onAutoSchedule={onAutoSchedule}
	watchedDateStr={watchedDateStr}
	watchedTime={watchedTime}
	watchedDuration={watchedDuration}
/>;

export const TypeAndStatusSection = ({ disabled }: { disabled: boolean }) => (
	<AppointmentTypeStatusSection disabled={disabled} />
);

export const PaymentTab = (props: {
	disabled: boolean;
	watchPaymentStatus: string;
	watchPaymentMethod: string;
	watchPaymentAmount: number;
	patientId?: string;
	patientName?: string;
}) => <AppointmentPaymentTab {...props} />;
export const OptionsTab = ({
	disabled,
	currentMode,
	selectedEquipments,
	setSelectedEquipments,
	recurringConfig,
	setRecurringConfig,
	reminders,
	setReminders,
	onDuplicate,
}: {
	disabled: boolean;
	currentMode: string;
	selectedEquipments: SelectedEquipment[];
	setSelectedEquipments: (equipments: SelectedEquipment[]) => void;
	recurringConfig: RecurringConfig;
	setRecurringConfig: (config: RecurringConfig) => void;
	reminders: AppointmentReminderData[];
	setReminders: (reminders: AppointmentReminderData[]) => void;
	onDuplicate?: () => void;
}) => <AppointmentOptionsPanel
	disabled={disabled}
	currentMode={currentMode}
	selectedEquipments={selectedEquipments}
	setSelectedEquipments={setSelectedEquipments}
	recurringConfig={recurringConfig}
	setRecurringConfig={setRecurringConfig}
	reminders={reminders}
	setReminders={setReminders}
	onDuplicate={onDuplicate}
/>;
