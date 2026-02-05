import type { StatusConfig, RolePermissions, UserRole, SessionStatus, CardSize, CardSizeConfig } from "@/types/agenda";

// Status configuration for visual representation and allowed actions
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

// Status configuration for visual representation and allowed actions
// Default status config (for reset functionality)
export const DEFAULT_STATUS_COLORS: Record<string, { color: string; bgColor: string; borderColor: string }> = {};

export const STATUS_CONFIG: Record<SessionStatus, StatusConfig> = {
  // Positive/Completed States - Soft Gray/Neutral (mais profissional)
  realizado: {
    label: "Realizado",
    color: "hsl(220 13% 85%)",
    bgColor: "hsl(220 13% 85%)",
    borderColor: "hsl(220 13% 75%)",
    twBg: "bg-slate-300",
    twBorder: "border-slate-400",
    twText: "text-slate-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  completed: { // Legacy/Duplicate mapping
    label: "Concluído",
    color: "hsl(220 13% 85%)",
    bgColor: "hsl(220 13% 85%)",
    borderColor: "hsl(220 13% 75%)",
    twBg: "bg-slate-300",
    twBorder: "border-slate-400",
    twText: "text-slate-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  concluido: {
    label: "Concluído",
    color: "hsl(220 13% 85%)",
    bgColor: "hsl(220 13% 85%)",
    borderColor: "hsl(220 13% 75%)",
    twBg: "bg-slate-300",
    twBorder: "border-slate-400",
    twText: "text-slate-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },
  atendido: {
    label: "Atendido",
    color: "hsl(220 13% 85%)",
    bgColor: "hsl(220 13% 85%)",
    borderColor: "hsl(220 13% 75%)",
    twBg: "bg-slate-300",
    twBorder: "border-slate-400",
    twText: "text-slate-800",
    icon: CheckCircle,
    allowedActions: ["view", "payment", "evolution"]
  },

  // Confirmed States - Soft Emerald Green
  confirmado: {
    label: "Confirmado",
    color: "hsl(158 58% 46%)",
    bgColor: "hsl(158 58% 46%)",
    borderColor: "hsl(158 58% 40%)",
    twBg: "bg-emerald-600",
    twBorder: "border-emerald-700",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },
  confirmed: { // Legacy
    label: "Confirmado",
    color: "hsl(158 58% 46%)",
    bgColor: "hsl(158 58% 46%)",
    borderColor: "hsl(158 58% 40%)",
    twBg: "bg-emerald-600",
    twBorder: "border-emerald-700",
    twText: "text-white",
    icon: CheckCircle,
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"]
  },

  // Scheduled States - Soft Professional Blue
  agendado: {
    label: "Agendado",
    color: "hsl(217 85% 55%)",
    bgColor: "hsl(217 85% 55%)",
    borderColor: "hsl(217 85% 48%)",
    twBg: "bg-blue-600",
    twBorder: "border-blue-700",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },
  scheduled: { // Legacy
    label: "Agendado",
    color: "hsl(217 85% 55%)",
    bgColor: "hsl(217 85% 55%)",
    borderColor: "hsl(217 85% 48%)",
    twBg: "bg-blue-600",
    twBorder: "border-blue-700",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },

  // Evaluation - Soft Purple
  avaliacao: {
    label: "Avaliação",
    color: "hsl(275 60% 55%)",
    bgColor: "hsl(275 60% 55%)",
    borderColor: "hsl(275 60% 48%)",
    twBg: "bg-purple-600",
    twBorder: "border-purple-700",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },

  // Pending/Waiting States - Soft Amber/Orange
  aguardando_confirmacao: {
    label: "Aguardando",
    color: "hsl(38 92% 50%)",
    bgColor: "hsl(38 92% 50%)",
    borderColor: "hsl(38 92% 45%)",
    twBg: "bg-amber-500",
    twBorder: "border-amber-600",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["confirm", "cancel", "reschedule", "edit"]
  },
  em_espera: {
    label: "Em Espera",
    color: "hsl(217 85% 60%)",
    bgColor: "hsl(217 85% 60%)",
    borderColor: "hsl(217 85% 53%)",
    twBg: "bg-blue-500",
    twBorder: "border-blue-600",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["start", "cancel", "reschedule"]
  },

  // Negative States - Soft Red
  cancelado: {
    label: "Cancelado",
    color: "hsl(0 72% 51%)",
    bgColor: "hsl(0 72% 51%)",
    borderColor: "hsl(0 72% 45%)",
    twBg: "bg-red-600",
    twBorder: "border-red-700",
    twText: "text-white",
    icon: XCircle,
    allowedActions: ["view", "reschedule"]
  },
  falta: {
    label: "Falta",
    color: "hsl(0 72% 51%)",
    bgColor: "hsl(0 72% 51%)",
    borderColor: "hsl(0 72% 45%)",
    twBg: "bg-red-600",
    twBorder: "border-red-700",
    twText: "text-white",
    icon: AlertCircle,
    allowedActions: ["view", "reschedule", "payment"]
  },
  faltou: {
    label: "Faltou",
    color: "hsl(0 72% 51%)",
    bgColor: "hsl(0 72% 51%)",
    borderColor: "hsl(0 72% 45%)",
    twBg: "bg-red-600",
    twBorder: "border-red-700",
    twText: "text-white",
    icon: AlertCircle,
    allowedActions: ["view", "reschedule", "payment"]
  },

  // Rescheduled/Delayed - Soft Cyan/Teal/Lime
  remarcado: {
    label: "Remarcado",
    color: "hsl(192 85% 55%)",
    bgColor: "hsl(192 85% 55%)",
    borderColor: "hsl(192 85% 48%)",
    twBg: "bg-cyan-600",
    twBorder: "border-cyan-700",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["view"]
  },
  reagendado: {
    label: "Reagendado",
    color: "hsl(142 62% 45%)",
    bgColor: "hsl(142 62% 45%)",
    borderColor: "hsl(142 62% 40%)",
    twBg: "bg-lime-600",
    twBorder: "border-lime-700",
    twText: "text-white",
    icon: Clock,
    allowedActions: ["view"]
  },
  atrasado: {
    label: "Atrasado",
    color: "hsl(25 95% 53%)",
    bgColor: "hsl(25 95% 53%)",
    borderColor: "hsl(25 95% 48%)",
    twBg: "bg-orange-600",
    twBorder: "border-orange-700",
    twText: "text-white",
    icon: AlertCircle,
    allowedActions: ["start", "cancel", "reschedule"]
  },

  // Handling 'em_andamento' - Soft Yellow/Orange
  em_andamento: {
    label: "Em Andamento",
    color: "hsl(43 96% 56%)",
    bgColor: "hsl(43 96% 56%)",
    borderColor: "hsl(43 96% 50%)",
    twBg: "bg-amber-400",
    twBorder: "border-amber-500",
    twText: "text-amber-950",
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

// Card size configurations for calendar display
export const CARD_SIZE_CONFIGS: Record<CardSize, CardSizeConfig> = {
  extra_small: {
    value: 'extra_small',
    label: 'Extra Pequeno',
    description: 'Cards compactos - apenas hora e nome',
    icon: 'XS',
    timeFontSize: 8,
    nameFontSize: 10,
    typeFontSize: 0,
    padding: '0.35rem',
    avatarSize: 0,
    showAvatar: false,
    showType: false,
    showStatusIcon: false,
    heightMultiplier: 1.0,
  },
  small: {
    value: 'small',
    label: 'Pequeno',
    description: 'Cards pequenos - essencial',
    icon: 'S',
    timeFontSize: 9,
    nameFontSize: 12,
    typeFontSize: 0,
    padding: '0.5rem',
    avatarSize: 0,
    showAvatar: false,
    showType: false,
    showStatusIcon: false,
    heightMultiplier: 1.0,
  },
  medium: {
    value: 'medium',
    label: 'Médio',
    description: 'Cards médios - equilibrado',
    icon: 'M',
    timeFontSize: 10,
    nameFontSize: 14,
    typeFontSize: 9,
    padding: '0.75rem',
    avatarSize: 16,
    showAvatar: true,
    showType: true,
    showStatusIcon: true,
    heightMultiplier: 1.0,
  },
  large: {
    value: 'large',
    label: 'Grande',
    description: 'Cards grandes - todos os detalhes',
    icon: 'L',
    timeFontSize: 11,
    nameFontSize: 16,
    typeFontSize: 10,
    padding: '1rem',
    avatarSize: 20,
    showAvatar: true,
    showType: true,
    showStatusIcon: true,
    heightMultiplier: 1.0,
  },
};

export const DEFAULT_CARD_SIZE: CardSize = 'medium';