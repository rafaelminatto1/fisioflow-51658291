import type { StatusConfig, RolePermissions, UserRole, SessionStatus } from "@/types/agenda";

// Status configuration for visual representation and allowed actions
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

// Status configuration for visual representation and allowed actions
export const STATUS_CONFIG: Record<SessionStatus, StatusConfig> = {
  // Positive/Completed States
  realizado: {
    label: "Realizado",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    borderColor: "#16A34A",
    twBg: "bg-green-100",
    twBorder: "border-green-600",
    twText: "text-green-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  completed: { // Legacy/Duplicate mapping
    label: "Concluído",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    borderColor: "#16A34A",
    twBg: "bg-green-100",
    twBorder: "border-green-600",
    twText: "text-green-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  concluido: {
    label: "Concluído",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    borderColor: "#16A34A",
    twBg: "bg-green-100",
    twBorder: "border-green-600",
    twText: "text-green-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  atendido: {
    label: "Atendido",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    borderColor: "#16A34A",
    twBg: "bg-green-100",
    twBorder: "border-green-600",
    twText: "text-green-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },

  // Confirmed States
  confirmado: {
    label: "Confirmado",
    color: "#059669",
    bgColor: "#D1FAE5",
    borderColor: "#059669",
    twBg: "bg-emerald-100",
    twBorder: "border-emerald-600",
    twText: "text-emerald-800",
    icon: CheckCircle,
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },
  confirmed: { // Legacy
    label: "Confirmado",
    color: "#059669",
    bgColor: "#D1FAE5",
    borderColor: "#059669",
    twBg: "bg-emerald-100",
    twBorder: "border-emerald-600",
    twText: "text-emerald-800",
    icon: CheckCircle,
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },

  // Scheduled States
  agendado: {
    label: "Agendado",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    borderColor: "#2563EB",
    twBg: "bg-blue-100",
    twBorder: "border-blue-600",
    twText: "text-blue-800",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },
  scheduled: { // Legacy
    label: "Agendado",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    borderColor: "#2563EB",
    twBg: "bg-blue-100",
    twBorder: "border-blue-600",
    twText: "text-blue-800",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },

  // Evaluation - The Specific Fix request
  avaliacao: {
    label: "Avaliação",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
    borderColor: "#7C3AED",
    twBg: "bg-violet-100",
    twBorder: "border-violet-600",
    twText: "text-violet-800",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },

  // Pending/Waiting States
  aguardando_confirmacao: {
    label: "Aguardando",
    color: "#D97706",
    bgColor: "#FEF3C7",
    borderColor: "#D97706",
    twBg: "bg-amber-100",
    twBorder: "border-amber-600",
    twText: "text-amber-800",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },
  em_espera: {
    label: "Em Espera",
    color: "#4F46E5",
    bgColor: "#E0E7FF",
    borderColor: "#4F46E5",
    twBg: "bg-indigo-100",
    twBorder: "border-indigo-600",
    twText: "text-indigo-800",
    icon: Clock,
    allowedActions: ["start", "cancel", "reschedule"]
  },

  // Negative States
  cancelado: {
    label: "Cancelado",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    borderColor: "#DC2626",
    twBg: "bg-red-100",
    twBorder: "border-red-600",
    twText: "text-red-800",
    icon: XCircle,
    allowedActions: ["view", "reschedule"]
  },
  falta: {
    label: "Falta",
    color: "#E11D48",
    bgColor: "#FFE4E6",
    borderColor: "#E11D48",
    twBg: "bg-rose-100",
    twBorder: "border-rose-600",
    twText: "text-rose-800",
    icon: AlertCircle,
    allowedActions: ["view", "reschedule", "payment"]
  },
  faltou: {
    label: "Faltou",
    color: "#E11D48",
    bgColor: "#FFE4E6",
    borderColor: "#E11D48",
    twBg: "bg-rose-100",
    twBorder: "border-rose-600",
    twText: "text-rose-800",
    icon: AlertCircle,
    allowedActions: ["view", "reschedule", "payment"]
  },

  // Rescheduled/Delayed
  remarcado: {
    label: "Remarcado",
    color: "#0891B2",
    bgColor: "#CFFAFE",
    borderColor: "#0891B2",
    twBg: "bg-cyan-100",
    twBorder: "border-cyan-600",
    twText: "text-cyan-800",
    allowedActions: ["view"]
  },
  reagendado: {
    label: "Reagendado",
    color: "#0D9488",
    bgColor: "#CCFBF1",
    borderColor: "#0D9488",
    twBg: "bg-teal-100",
    twBorder: "border-teal-600",
    twText: "text-teal-800",
    allowedActions: ["view"]
  },
  atrasado: {
    label: "Atrasado",
    color: "#EA580C",
    bgColor: "#FFEDD5",
    borderColor: "#EA580C",
    twBg: "bg-orange-100",
    twBorder: "border-orange-600",
    twText: "text-orange-800",
    allowedActions: ["start", "cancel", "reschedule"]
  },

  // Handling 'em_andamento'
  em_andamento: {
    label: "Em Andamento",
    color: "#CA8A04",
    bgColor: "#FEF9C3",
    borderColor: "#CA8A04",
    twBg: "bg-yellow-100",
    twBorder: "border-yellow-600",
    twText: "text-yellow-800",
    allowedActions: ["complete", "cancel"]
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