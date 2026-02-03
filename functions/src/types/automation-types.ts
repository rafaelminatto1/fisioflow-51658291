export interface Automation {
  id: string;
  name: string;
  is_active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  organization_id: string;
  logic?: any;
  execution_count?: number; // Adicionado
  last_executed_at?: Date;
}

export interface AutomationTrigger {
  type: string;
  event_type?: string;
  schedule?: string; // Adicionado
  config?: any;
}

export interface AutomationAction {
  id: string;
  type: string;
  order: number;
  delay_seconds?: number; // Adicionado
  config?: any;
}

export interface AutomationExecutionLog {
  id: string;
  automation_id: string;
  automation_name: string;
  status: 'success' | 'failed' | 'skipped'; // Removido 'completed', usar 'success'
  started_at: Date;
  completed_at: Date;
  results?: any[];
  error?: string;
  duration_ms: number;
}