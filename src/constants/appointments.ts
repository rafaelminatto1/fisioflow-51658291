import { AppointmentType } from "@/types/appointment";

export const APPOINTMENT_TYPES: AppointmentType[] = [
  "Consulta Inicial",
  "Fisioterapia",
  "Reavaliação",
  "Consulta de Retorno",
  "Avaliação Funcional",
  "Terapia Manual",
  "Pilates Clínico",
  "RPG",
  "Dry Needling",
  "Liberação Miofascial",
];

export const APPOINTMENT_STATUSES = [
  "agendado",
  "atendido",
  "avaliacao",
  "cancelado",
  "faltou",
  "faltou_com_aviso",
  "faltou_sem_aviso",
  "nao_atendido",
  "nao_atendido_sem_cobranca",
  "presenca_confirmada",
  "remarcar",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  atendido: "Atendido",
  avaliacao: "Avaliação",
  cancelado: "Cancelado",
  faltou: "Faltou",
  faltou_com_aviso: "Faltou (com aviso prévio)",
  faltou_sem_aviso: "Faltou (sem aviso prévio)",
  nao_atendido: "Não atendido",
  nao_atendido_sem_cobranca: "Não atendido (Sem cobrança)",
  presenca_confirmada: "Presença confirmada",
  remarcar: "Remarcar",
};

export const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-500",
  atendido: "bg-emerald-500",
  avaliacao: "bg-violet-500",
  cancelado: "bg-slate-950",
  faltou: "bg-red-500",
  faltou_com_aviso: "bg-teal-400",
  faltou_sem_aviso: "bg-orange-500",
  nao_atendido: "bg-gray-600",
  nao_atendido_sem_cobranca: "bg-slate-950",
  presenca_confirmada: "bg-blue-900",
  remarcar: "bg-slate-400",
};

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: "📱" },
  { value: "dinheiro", label: "Dinheiro", icon: "💵" },
  { value: "debito", label: "Débito", icon: "💳" },
  { value: "credito", label: "Crédito", icon: "💳" },
] as const;
