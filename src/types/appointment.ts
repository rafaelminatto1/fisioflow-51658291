// Enhanced appointment types for comprehensive scheduling system

export interface AppointmentBase {
  id: string;
  patientId: string;
  patientName: string;
  phone?: string;
  date: Date;
  time: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  therapistId?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_method?: string;
  installments?: number;
  room?: string;
  session_package_id?: string;
  is_recurring?: boolean;
  recurring_until?: Date;
  isOverbooked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentType =
  | 'Consulta Inicial'
  | 'Fisioterapia'
  | 'Reavaliação'
  | 'Consulta de Retorno'
  | 'Avaliação Funcional'
  | 'Terapia Manual'
  | 'Pilates Clínico'
  | 'RPG'
  | 'Dry Needling'
  | 'Liberação Miofascial';

// Status conforme constraint do banco (em português)
export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
  | 'falta'
  | 'faltou'
  | 'avaliacao'
  | 'aguardando_confirmacao'
  | 'em_espera'
  | 'atrasado'
  | 'remarcado'
  | 'reagendado'
  | 'atendido';

export interface EnhancedAppointment extends AppointmentBase {
  // Therapist assignment
  therapistId?: string;
  therapistName?: string;

  // Room/Resource booking
  roomId?: string;
  roomName?: string;
  equipment?: string[];

  // Recurring appointment support
  recurrenceId?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;

  // Notification settings
  reminderSent?: boolean;
  confirmationSent?: boolean;
  lastReminderSent?: Date;

  // Priority and special requirements
  priority: AppointmentPriority;
  specialRequirements?: string;

  // Follow-up and continuity
  previousAppointmentId?: string;
  nextAppointmentId?: string;
  treatmentPhase?: string;
  sessionNumber?: number;

  // Patient preference tracking
  preferredTime?: string;
  preferredDays?: DayOfWeek[];

  // Cancellation/rescheduling
  cancellationReason?: string;
  rescheduledFromId?: string;
  rescheduledToId?: string;
  cancellationTimestamp?: Date;

  // Color coding
  color?: string;

  // Integration fields
  externalCalendarId?: string;
  syncedWithGoogle?: boolean;
  syncedWithOutlook?: boolean;
}

export type AppointmentPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface RecurrencePattern {
  type: RecurrenceType;
  frequency: number; // Every X weeks/months etc
  daysOfWeek?: DayOfWeek[]; // For weekly recurring
  dayOfMonth?: number; // For monthly recurring
  endDate?: Date;
  maxOccurrences?: number;
  excludedDates?: Date[];
}

export type RecurrenceType = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export interface AppointmentTemplate {
  id: string;
  name: string;
  type: AppointmentType;
  duration: number;
  description?: string;
  defaultNotes?: string;
  estimatedCost?: number;
  requiredEquipment?: string[];
  preparationInstructions?: string;
  followUpRequired?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialties: string[];
  workingHours: WorkingHours;
  availabilityCalendar?: AvailabilitySlot[];
  isActive: boolean;
  color: string; // For calendar color coding
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  lunchBreak?: {
    startTime: string;
    endTime: string;
  };
  isWorkingDay: boolean;
}

export interface AvailabilitySlot {
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reason?: string; // vacation, sick leave, meeting etc
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  isActive: boolean;
  color: string;
  bookingRules?: BookingRules;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRules {
  minBookingTime: number; // minutes
  maxBookingTime: number; // minutes
  bufferTime: number; // minutes between appointments
  allowedAppointmentTypes?: AppointmentType[];
  requiresApproval: boolean;
}

export interface AppointmentConflict {
  type: ConflictType;
  description: string;
  reason: string;
  conflictingAppointment?: EnhancedAppointment;
  severity: ConflictSeverity;
  suggestedAlternatives?: AlternativeSlot[];
  canOverride: boolean;
  overrideReason?: string;
}

export type ConflictType =
  | 'Double Booking'
  | 'Therapist Unavailable'
  | 'Room Unavailable'
  | 'Patient Conflict'
  | 'Outside Working Hours'
  | 'Equipment Unavailable'
  | 'Insufficient Buffer Time';

export type ConflictSeverity = 'Info' | 'Warning' | 'Error';

export interface AlternativeSlot {
  date: Date;
  startTime: string;
  therapistId?: string;
  therapistName?: string;
  roomId?: string;
  roomName?: string;
  score: number; // How good this alternative is (0-100)
  reason: string;
}

export interface WaitingListEntry {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  email?: string;
  appointmentType: AppointmentType;
  preferredDates: Date[];
  preferredTimes: string[];
  preferredTherapist?: string;
  urgency: AppointmentPriority;
  notes?: string;
  notificationPreferences: NotificationMethod[];
  createdAt: Date;
  lastContactedAt?: Date;
  position: number; // Position in waiting list
}

export type NotificationMethod = 'Email' | 'SMS' | 'WhatsApp' | 'Phone Call';

export interface AppointmentNotification {
  id: string;
  appointmentId: string;
  type: NotificationType;
  method: NotificationMethod;
  status: NotificationStatus;
  scheduledFor: Date;
  sentAt?: Date;
  message: string;
  recipientInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
}

export type NotificationType =
  | 'Confirmation'
  | 'Reminder'
  | 'Cancellation'
  | 'Reschedule'
  | 'Follow Up'
  | 'Wait List Available';

export type NotificationStatus = 'Pending' | 'Sent' | 'Delivered' | 'Failed' | 'Cancelled';

// Calendar view types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    appointment: EnhancedAppointment;
    therapist?: Therapist;
    room?: Room;
  };
  color?: string;
  textColor?: string;
  borderColor?: string;
  className?: string;
}

export interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBlocked?: boolean;
  blockReason?: string;
  appointments: EnhancedAppointment[];
  therapistId?: string;
  roomId?: string;
}

export interface CalendarSettings {
  workingHours: {
    start: string;
    end: string;
  };
  timeSlotDuration: number; // minutes
  bufferTime: number; // minutes between appointments
  maxAdvanceBooking: number; // days
  allowWeekendBooking: boolean;
  defaultAppointmentDuration: number;
  autoConfirmAppointments: boolean;
  requireDepositForBooking: boolean;
  cancellationDeadline: number; // hours before appointment
  rescheduleDeadline: number; // hours before appointment
}

// Form data types
export type AppointmentFormData = {
  patient_id: string;
  appointment_date?: string;  // Legacy - for backward compatibility
  appointment_time?: string; // Legacy - for backward compatibility
  date?: string;           // New standardized column
  start_time?: string;      // New standardized column
  end_time?: string;        // New standardized column
  endTime?: string;         // Alias for consistency
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string | null;
  therapist_id?: string | null;
  room?: string | null;
  payment_status?: string | null;
  payment_amount?: number | null;
  payment_method?: string | null;
  installments?: number | null;
  session_package_id?: string | null;
  is_recurring?: boolean | null;
  recurring_until?: string | null;
};
export type AppointmentTemplateFormData = Omit<AppointmentTemplate, 'id' | 'createdAt' | 'updatedAt'>;
export type TherapistFormData = Omit<Therapist, 'id' | 'createdAt' | 'updatedAt'>;
export type RoomFormData = Omit<Room, 'id' | 'createdAt' | 'updatedAt'>;
export type WaitingListFormData = Omit<WaitingListEntry, 'id' | 'createdAt' | 'lastContactedAt' | 'position'>;

// Search and filter types
export interface AppointmentFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: AppointmentStatus[];
  type?: AppointmentType[];
  therapistId?: string[];
  patientId?: string[];
  priority?: AppointmentPriority[];
  roomId?: string[];
}

export interface AppointmentSearchResult {
  appointment: EnhancedAppointment;
  relevanceScore: number;
  matchedFields: string[];
}

// Statistics and analytics
export interface AppointmentStatistics {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completedAppointments: number;
  averageDuration: number;
  utilizationRate: number; // percentage
  mostCommonTypes: Array<{
    type: AppointmentType;
    count: number;
    percentage: number;
  }>;
  therapistStats: Array<{
    therapistId: string;
    therapistName: string;
    appointmentCount: number;
    utilizationRate: number;
  }>;
  timeSlotStats: Array<{
    timeSlot: string;
    bookingRate: number;
  }>;
}

// Export the main Appointment interface for backward compatibility
export type Appointment = AppointmentBase;
