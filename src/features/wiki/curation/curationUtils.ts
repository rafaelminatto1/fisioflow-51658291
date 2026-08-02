import {
  EDITORIAL_CAPABILITIES,
  type CurationAction,
  type CurationQueueFilters,
  type EditorialStatus,
} from "@/features/wiki/types/curation";

export const CURATION_TABS = [
  { value: "inbox", label: "Caixa de entrada" },
  { value: "triage", label: "Em triagem" },
  { value: "clinical_review", label: "Revisão clínica" },
  { value: "approved", label: "Aguardando publicação" },
  { value: "review_due", label: "Revisão vencendo" },
  { value: "technical_failures", label: "Falhas técnicas" },
  { value: "archived", label: "Arquivados" },
] as const;

export const ACTION_LABELS: Record<CurationAction, string> = {
  submit: "Enviar para triagem",
  start_review: "Iniciar revisão",
  request_changes: "Solicitar mudanças",
  reject: "Rejeitar",
  approve: "Aprovar versão",
  publish: "Publicar",
  unpublish: "Despublicar",
  reopen: "Reabrir para triagem",
  archive: "Arquivar",
};

const PRIMARY_ACTION_ORDER: CurationAction[] = [
  "approve",
  "publish",
  "start_review",
  "submit",
  "request_changes",
  "reopen",
  "unpublish",
  "archive",
  "reject",
];

export function hasEditorialCapability(
  capabilities: readonly string[],
): boolean {
  return EDITORIAL_CAPABILITIES.some((capability) =>
    capabilities.includes(capability),
  );
}

export function getPrimaryAction(
  actions: readonly CurationAction[],
): CurationAction | undefined {
  return PRIMARY_ACTION_ORDER.find((action) => actions.includes(action));
}

export function editorialStatusLabel(status: EditorialStatus | string): string {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    triage: "Em triagem",
    clinical_review: "Revisão clínica",
    changes_requested: "Mudanças solicitadas",
    rejected: "Rejeitado",
    approved: "Aprovado",
    published: "Publicado",
    review_due: "Revisão vencendo",
    superseded: "Substituído",
    archived: "Arquivado",
  };
  return labels[status] ?? status;
}

export function technicalStatusLabel(status?: string): string {
  if (!status || status === "not_started") return "Não iniciada";
  const labels: Record<string, string> = {
    pending: "Pendente",
    queued: "Na fila",
    fetching: "Importando",
    processing: "Processando",
    imported: "Importado",
    indexed: "Indexado",
    suggested: "Sugestão pronta",
    failed: "Falha técnica",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}

export function filtersFromSearchParams(
  params: URLSearchParams,
): CurationQueueFilters {
  const read = (key: string) => params.get(key) || undefined;
  return {
    status: read("curationStatus") ?? "inbox",
    assignee: read("curationAssignee"),
    priority: read("curationPriority"),
    validity: read("curationValidity"),
    kind: read("curationKind"),
    technicalStatus: read("curationTechnicalStatus"),
    q: read("curationQuery"),
  };
}

export function writeCurationFilters(
  params: URLSearchParams,
  filters: CurationQueueFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const fields: Array<[keyof CurationQueueFilters, string]> = [
    ["status", "curationStatus"],
    ["assignee", "curationAssignee"],
    ["priority", "curationPriority"],
    ["validity", "curationValidity"],
    ["kind", "curationKind"],
    ["technicalStatus", "curationTechnicalStatus"],
    ["q", "curationQuery"],
  ];
  fields.forEach(([field, key]) => {
    const value = filters[field]?.trim();
    if (value && !(field === "status" && value === "inbox"))
      next.set(key, value);
    else next.delete(key);
  });
  return next;
}
