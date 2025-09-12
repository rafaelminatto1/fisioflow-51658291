import type { StatusConfig, RolePermissions, UserRole, SessionStatus } from "@/types/agenda";

// Status configuration for visual representation and allowed actions
export const STATUS_CONFIG: Record<SessionStatus, StatusConfig> = {
  scheduled: {
    label: "Agendado",
    color: "#3B82F6", // Blue
    bgColor: "#EFF6FF", // Blue-50
    borderColor: "#DBEAFE", // Blue-200
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },
  completed: {
    label: "Concluído",
    color: "#10B981", // Green
    bgColor: "#ECFDF5", // Green-50
    borderColor: "#D1FAE5", // Green-200
    allowedActions: ["view", "payment", "evolution"]
  },
  missed: {
    label: "Faltou",
    color: "#EF4444", // Red
    bgColor: "#FEF2F2", // Red-50
    borderColor: "#FECACA", // Red-200
    allowedActions: ["reschedule", "view", "payment"]
  },
  cancelled: {
    label: "Cancelado",
    color: "#6B7280", // Gray
    bgColor: "#F9FAFB", // Gray-50
    borderColor: "#E5E7EB", // Gray-200
    allowedActions: ["view", "reschedule"]
  },
  rescheduled: {
    label: "Reagendado",
    color: "#F59E0B", // Orange
    bgColor: "#FFFBEB", // Orange-50
    borderColor: "#FED7AA", // Orange-200
    allowedActions: ["view"]
  }
};

// Role-based permissions configuration
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: true,
    canViewAllAppointments: true,
    canManagePayments: true,
    canAccessFinancialData: true,
    canMarkSessionStatus: true,
    canAccessEvolutions: true
  },
  therapist: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: true,
    canViewAllAppointments: true,
    canManagePayments: true,
    canAccessFinancialData: true,
    canMarkSessionStatus: true,
    canAccessEvolutions: true
  },
  intern: {
    canCreateAppointment: false,
    canEditAppointment: false,
    canDeleteAppointment: false,
    canViewAllAppointments: true,
    canManagePayments: false,
    canAccessFinancialData: false,
    canMarkSessionStatus: true, // Can mark session status with supervision
    canAccessEvolutions: true
  },
  patient: {
    canCreateAppointment: false,
    canEditAppointment: false,
    canDeleteAppointment: false,
    canViewAllAppointments: false, // Only own appointments
    canManagePayments: false,
    canAccessFinancialData: false,
    canMarkSessionStatus: false,
    canAccessEvolutions: false // Only own evolution data
  }
};

// Business hours configuration
export const BUSINESS_HOURS = {
  start: "07:00",
  end: "19:00",
  slotDuration: 30, // minutes
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0] // Monday to Sunday (0 = Sunday)
};

// Generate time slots for the agenda
export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const startHour = 7;
  const endHour = 19;
  const slotDuration = 30;
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  
  return slots;
};

// Default time slots (7:00 to 18:30 in 30-minute intervals)
export const TIME_SLOTS = generateTimeSlots();

// Payment method labels
export const PAYMENT_METHOD_LABELS = {
  cash: "Dinheiro",
  card: "Cartão",
  pix: "PIX",
  transfer: "Transferência"
};

// Payment type labels
export const PAYMENT_TYPE_LABELS = {
  session: "Sessão Avulsa",
  package: "Pacote de Sessões"
};

// Session type labels
export const SESSION_TYPE_LABELS = {
  individual: "Individual",
  group: "Grupo"
};

// Utility functions for permissions
export const hasPermission = (userRole: UserRole, permission: keyof RolePermissions): boolean => {
  return ROLE_PERMISSIONS[userRole][permission];
};

export const getStatusConfig = (status: SessionStatus): StatusConfig => {
  return STATUS_CONFIG[status];
};

export const getAllowedActions = (status: SessionStatus, userRole: UserRole): string[] => {
  const statusConfig = STATUS_CONFIG[status];
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Filter actions based on both status and role permissions
  return statusConfig.allowedActions.filter(action => {
    switch (action) {
      case "edit":
        return permissions.canEditAppointment;
      case "payment":
        return permissions.canManagePayments;
      case "complete":
      case "miss":
      case "cancel":
      case "reschedule":
        return permissions.canMarkSessionStatus;
      case "evolution":
        return permissions.canAccessEvolutions;
      case "view":
        return true; // Everyone can view (with appropriate data filtering)
      default:
        return false;
    }
  });
};

// Validation helpers
export const isValidTimeSlot = (time: string): boolean => {
  return TIME_SLOTS.includes(time);
};

export const isWithinBusinessHours = (startTime: string, endTime: string): boolean => {
  const [startHour] = startTime.split(':').map(Number);
  const [endHour] = endTime.split(':').map(Number);
  
  return startHour >= 7 && endHour <= 19;
};

export const calculateSessionDuration = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
};