import type { StatusConfig, RolePermissions, UserRole, SessionStatus } from "@/types/agenda";

// Status configuration for visual representation and allowed actions
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

// Status configuration for visual representation and allowed actions
// Default status config (for reset functionality)
export const DEFAULT_STATUS_COLORS: Record<string, { color: string; bgColor: string; borderColor: string }> = {};

export const STATUS_CONFIG: Record<SessionStatus, StatusConfig> = {
  // Positive/Completed States - Vivid Green
  realizado: {
    label: "Realizado",
    color: "#00C875",
    bgColor: "#00C875",
    borderColor: "#00C875",
    twBg: "bg-[#00C875]",
    twBorder: "border-[#00C875]",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  completed: { // Legacy/Duplicate mapping
    label: "Concluído",
    color: "#00C875",
    bgColor: "#00C875",
    borderColor: "#00C875",
    twBg: "bg-[#00C875]",
    twBorder: "border-[#00C875]",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  concluido: {
    label: "Concluído",
    color: "#00C875",
    bgColor: "#00C875",
    borderColor: "#00C875",
    twBg: "bg-[#00C875]",
    twBorder: "border-[#00C875]",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  atendido: {
    label: "Atendido",
    color: "#00C875",
    bgColor: "#00C875",
    borderColor: "#00C875",
    twBg: "bg-[#00C875]",
    twBorder: "border-[#00C875]",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },

  // Confirmed States - Vivid Teal
  confirmado: {
    label: "Confirmado",
    color: "#0CA678",
    bgColor: "#0CA678",
    borderColor: "#0CA678",
    twBg: "bg-[#0CA678]",
    twBorder: "border-[#0CA678]",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },
  confirmed: { // Legacy
    label: "Confirmado",
    color: "#0CA678",
    bgColor: "#0CA678",
    borderColor: "#0CA678",
    twBg: "bg-[#0CA678]",
    twBorder: "border-[#0CA678]",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },

  // Scheduled States - Vivid Blue
  agendado: {
    label: "Agendado",
    color: "#0073EA",
    bgColor: "#0073EA",
    borderColor: "#0073EA",
    twBg: "bg-[#0073EA]",
    twBorder: "border-[#0073EA]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },
  scheduled: { // Legacy
    label: "Agendado",
    color: "#0073EA",
    bgColor: "#0073EA",
    borderColor: "#0073EA",
    twBg: "bg-[#0073EA]",
    twBorder: "border-[#0073EA]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },

  // Evaluation - Vivid Purple
  avaliacao: {
    label: "Avaliação",
    color: "#A25DDC",
    bgColor: "#A25DDC",
    borderColor: "#A25DDC",
    twBg: "bg-[#A25DDC]",
    twBorder: "border-[#A25DDC]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },

  // Pending/Waiting States - Vivid Yellow/Gold
  aguardando_confirmacao: {
    label: "Aguardando",
    color: "#FDAB3D",
    bgColor: "#FDAB3D",
    borderColor: "#FDAB3D",
    twBg: "bg-[#FDAB3D]",
    twBorder: "border-[#FDAB3D]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },
  em_espera: {
    label: "Em Espera",
    color: "#579BFC",
    bgColor: "#579BFC",
    borderColor: "#579BFC",
    twBg: "bg-[#579BFC]",
    twBorder: "border-[#579BFC]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["start", "cancel", "reschedule"]
  },

  // Negative States - Vivid Red/Pink
  cancelado: {
    label: "Cancelado",
    color: "#DF2F4A",
    bgColor: "#DF2F4A",
    borderColor: "#DF2F4A",
    twBg: "bg-[#DF2F4A]",
    twBorder: "border-[#DF2F4A]",
    twText: "text-white",
    icon: XCircle,
    allowedActions: ["view", "reschedule"]
  },
  falta: {
    label: "Falta",
    color: "#FF158A",
    bgColor: "#FF158A",
    borderColor: "#FF158A",
    twBg: "bg-[#FF158A]",
    twBorder: "border-[#FF158A]",
    twText: "text-white",
    icon: AlertCircle,
    allowedActions: ["view", "reschedule", "payment"]
  },
  faltou: {
    label: "Faltou",
    color: "#FF158A",
    bgColor: "#FF158A",
    borderColor: "#FF158A",
    twBg: "bg-[#FF158A]",
    twBorder: "border-[#FF158A]",
    twText: "text-white",
    icon: AlertCircle,
    allowedActions: ["view", "reschedule", "payment"]
  },

  // Rescheduled/Delayed - Vivid Cyan/Teal/Orange
  remarcado: {
    label: "Remarcado",
    color: "#66CCFF",
    bgColor: "#66CCFF",
    borderColor: "#66CCFF",
    twBg: "bg-[#66CCFF]",
    twBorder: "border-[#66CCFF]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["view"]
  },
  reagendado: {
    label: "Reagendado",
    color: "#9CD326",
    bgColor: "#9CD326",
    borderColor: "#9CD326",
    twBg: "bg-[#9CD326]",
    twBorder: "border-[#9CD326]",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["view"]
  },
  atrasado: {
    label: "Atrasado",
    color: "#FF7575",
    bgColor: "#FF7575",
    borderColor: "#FF7575",
    twBg: "bg-[#FF7575]",
    twBorder: "border-[#FF7575]",
    twText: "text-white",
    icon: AlertCircle,
    allowedActions: ["start", "cancel", "reschedule"]
  },

  // Handling 'em_andamento' - Vivid Yellow/Gold
  em_andamento: {
    label: "Em Andamento",
    color: "#FFCB00",
    bgColor: "#FFCB00",
    borderColor: "#FFCB00",
    twBg: "bg-[#FFCB00]",
    twBorder: "border-[#FFCB00]",
    twText: "text-slate-900",
    allowedActions: ["complete", "cancel"]
  }
};

// Initialize DEFAULT_STATUS_COLORS for reset functionality
Object.entries(STATUS_CONFIG).forEach(([key, value]) => {
  DEFAULT_STATUS_COLORS[key] = {
    color: value.color,
    bgColor: value.bgColor,
    borderColor: value.borderColor
  };
});

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
// Segunda a Sexta: 07h-21h | Sábado: 07h-13h
export const BUSINESS_HOURS = {
  weekdays: {
    start: "07:00",
    end: "21:00",
  },
  saturday: {
    start: "07:00",
    end: "13:00",
  },
  slotDuration: 30, // minutes
  daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday (6 = Saturday)
};

// Generate time slots for the agenda
export const generateTimeSlots = (date?: Date): string[] => {
  const slots: string[] = [];
  const isSaturday = date && date.getDay() === 6;

  const startHour = 7;
  const endHour = isSaturday ? 13 : 21; // Sábado até 13h, outros dias até 21h
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

export const isWithinBusinessHours = (startTime: string, endTime: string, date?: Date): boolean => {
  const [startHour] = startTime.split(':').map(Number);
  const [endHour] = endTime.split(':').map(Number);
  const isSaturday = date && date.getDay() === 6;

  const maxHour = isSaturday ? 13 : 21;
  return startHour >= 7 && endHour <= maxHour;
};

export const calculateSessionDuration = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
};