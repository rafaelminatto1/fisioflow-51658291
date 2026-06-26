/**
 * Eventos de gatilho disponíveis para automações.
 * Mantido em sincronia com o builder (AutomationBuilderPage.tsx).
 */
export const TRIGGER_EVENTS: Array<{ value: string; label: string; description: string }> = [
  {
    value: "patient.created",
    label: "Paciente cadastrado",
    description: "Dispara quando um novo paciente é criado.",
  },
  {
    value: "appointment.scheduled",
    label: "Agendamento criado",
    description: "Dispara quando um novo agendamento é realizado.",
  },
  {
    value: "evolution.updated",
    label: "Evolução atualizada",
    description: "Dispara quando uma evolução clínica é salva.",
  },
  {
    value: "payment.overdue",
    label: "Pagamento vencido",
    description: "Dispara quando um pagamento passa do vencimento.",
  },
];

export function triggerLabel(value?: string | null): string {
  if (!value) return "Sem gatilho";
  return TRIGGER_EVENTS.find((t) => t.value === value)?.label ?? value;
}
