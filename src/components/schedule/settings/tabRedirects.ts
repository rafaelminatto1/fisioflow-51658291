export type TabValue =
  | "funcionamento"
  | "atendimentos"
  | "disponibilidade"
  | "politicas"
  | "aparencia";

export const VALID_TABS: TabValue[] = [
  "funcionamento",
  "atendimentos",
  "disponibilidade",
  "politicas",
  "aparencia",
];

const LEGACY: Record<string, TabValue> = {
  overview: "funcionamento",
  horarios: "funcionamento",
  capacidade: "funcionamento",
  "capacidade-horarios": "funcionamento",
  capacity: "funcionamento",
  hours: "funcionamento",
  "agenda-horarios": "funcionamento",
  status: "atendimentos",
  tipos: "atendimentos",
  "appointment-types": "atendimentos",
  bloqueios: "disponibilidade",
  blocked: "disponibilidade",
  policies: "politicas",
  visual: "aparencia",
};

export function resolveTab(raw: string | null): TabValue {
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as TabValue;
  if (raw && LEGACY[raw]) return LEGACY[raw];
  return VALID_TABS[0];
}
