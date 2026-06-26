
/**
 * Automation Builder — Tipos e catálogo de nós.
 */

export type NodeKind = "trigger" | "condition" | "wait" | "action";
export type NodeStatus = "idle" | "running" | "success" | "error";
export type Category = "Controle" | "Comunicação" | "FisioFlow" | "Avançado";

export interface AutomationNodeData {
  kind: NodeKind;
  label: string;
  desc?: string;
  // condition
  field?: string;
  op?: string;
  value?: string;
  // action
  action?: string;
  paramsJson?: string; // JSON string for action parameters
  // wait
  seconds?: number;
  // ui state
  status?: NodeStatus;
}

export interface CatalogEntry {
  type: string; // Unique key, e.g., "send_whatsapp"
  kind: NodeKind;
  category: Category;
  label: string;
  description: string;
  Icon: any; // Assume LucideIcon or similar component reference
  color: string; // Hex color for accent
  build: () => Partial<AutomationNodeData>; // Factory for default node data
}
