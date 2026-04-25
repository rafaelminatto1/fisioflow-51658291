export interface AppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  color: string;
  maxPerDay: number | null;
  isActive: boolean;
  isDefault: boolean;
}

export interface AppointmentTypeFormData {
  name: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  color: string;
  maxPerDay: number | null;
  isActive: boolean;
}

export const DEFAULT_APPOINTMENT_TYPES: AppointmentType[] = [
  {
    id: "eval",
    name: "Avaliação Inicial",
    durationMinutes: 45,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    color: "#3b82f6",
    maxPerDay: null,
    isActive: true,
    isDefault: true,
  },
  {
    id: "return",
    name: "Retorno",
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 5,
    color: "#22c55e",
    maxPerDay: null,
    isActive: true,
    isDefault: true,
  },
  {
    id: "rehab",
    name: "Sessão de Reabilitação",
    durationMinutes: 60,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    color: "#14b8a6",
    maxPerDay: null,
    isActive: true,
    isDefault: true,
  },
  {
    id: "electro",
    name: "Eletroterapia",
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 5,
    color: "#f59e0b",
    maxPerDay: null,
    isActive: true,
    isDefault: true,
  },
  {
    id: "myofascial",
    name: "Liberação Miofascial",
    durationMinutes: 45,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    color: "#f43f5e",
    maxPerDay: null,
    isActive: true,
    isDefault: false,
  },
];

export const COLOR_OPTIONS = [
  "#3b82f6",
  "#22c55e",
  "#14b8a6",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#64748b",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export const RECOMMENDED_DURATIONS: { type: string; range: string }[] = [
  { type: "Avaliação Inicial", range: "45-60 min" },
  { type: "Retorno", range: "20-30 min" },
  { type: "Reabilitação", range: "45-60 min" },
  { type: "Procedimentos", range: "20-30 min" },
  { type: "Terapia Manual", range: "30-45 min" },
];
