/**
 * Automation Types
 * Sistema de automações visuais (estilo monday.com/Make)
 */

import { Timestamp } from '@/integrations/firebase/app';

/**
 * Automação completa
 */
export interface Automation {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  created_by: string;
  is_active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  logic?: AutomationCondition;             // Para conditional logic
  execution_count: number;
  last_executed_at?: Timestamp;
  last_status?: 'success' | 'error' | 'running';
  last_error?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

/**
 * Trigger de automação
 */
export interface AutomationTrigger {
  id: string;
  type: AutomationTriggerType;
  config: Record<string, unknown>;
}

/**
 * Tipos de trigger disponíveis
 */
export type AutomationTriggerType =
  // Event-based
  | 'task.created'              // Nova tarefa criada
  | 'task.completed'            // Tarefa marcada como concluída
  | 'task.status_changed'       // Status da tarefa alterado
  | 'patient.created'           // Novo paciente cadastrado
  | 'appointment.created'       // Novo agendamento
  | 'appointment.completed'     // Sessão concluída
  | 'payment.received'          // Pagamento recebido
  | 'payment.overdue'           // Pagamento em atraso
  | 'patient.inactive'          // Paciente inativo por X dias
  // Schedule-based
  | 'schedule.daily'            // Diariamente em horário específico
  | 'schedule.weekly'           // Semanalmente
  | 'schedule.monthly'          // Mensalmente
  | 'schedule.cron'             // Expressão cron customizada
  // Webhook
  | 'webhook.received';         // Webhook recebido

/**
 * Action de automação
 */
export interface AutomationAction {
  id: string;
  type: AutomationActionType;
  order: number;
  config: Record<string, unknown>;
  delay_seconds?: number;                  // Aguardar antes de executar
  continue_on_error?: boolean;             // Continuar mesmo se falhar
}

/**
 * Tipos de ações disponíveis
 */
export type AutomationActionType =
  // Notificações
  | 'notification.email'         // Enviar email
  | 'notification.whatsapp'      // Enviar WhatsApp
  | 'notification.push'          // Enviar push notification
  | 'notification.sms'           // Enviar SMS
  // Dados
  | 'data.create_task'           // Criar nova tarefa
  | 'data.update_task'           // Atualizar tarefa existente
  | 'data.create_patient'        // Criar paciente
  | 'data.update_patient'        // Atualizar paciente
  | 'data.create_appointment'    // Criar agendamento
  | 'data.delete_record'         // Deletar registro
  // Workflow
  | 'workflow.delay'             // Esperar X tempo
  | 'workflow.condition'         // Branch condicional
  | 'workflow.loop'              // Loop sobre lista
  | 'workflow.call_automation'   // Chamar outra automação
  // Integrações
  | 'integration.webhook'        // Chamar webhook HTTP
  | 'integration.zoom_meeting'   // Criar meeting Zoom
  | 'integration.stripe_charge'  // Cobrar no Stripe
  // AI
  | 'ai.generate_summary'        // Gerar resumo com IA
  | 'ai.analyze_sentiment';      // Analisar sentimento

/**
 * Condição lógica (se/senão)
 */
export interface AutomationCondition {
  id: string;
  operator: 'AND' | 'OR';
  conditions: ConditionRule[];
  else_actions?: AutomationAction[];       // Ações se condição falsa
}

/**
 * Regra de condição individual
 */
export interface ConditionRule {
  id: string;
  field: string;                   // Campo a verificar (ex: "task.status")
  operator: ConditionOperator;
  value: unknown;
}

/**
 * Operadores de condição
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false';

/**
 * Log de execução de automação
 */
export interface AutomationExecutionLog {
  id: string;
  automation_id: string;
  automation_name: string;
  trigger_type: AutomationTriggerType;
  trigger_data: Record<string, unknown>;
  status: 'running' | 'success' | 'error' | 'partial_success';
  started_at: Timestamp;
  completed_at?: Timestamp;
  duration_seconds?: number;
  results: ExecutionStepResult[];
  error?: string;
}

/**
 * Resultado de um step de execução
 */
export interface ExecutionStepResult {
  action_id: string;
  action_type: AutomationActionType;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  started_at?: Timestamp;
  completed_at?: Timestamp;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Template de automação (Recipe Library)
 */
export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  icon?: string;
  tags: string[];
  is_popular?: boolean;
  trigger_template: AutomationTrigger;
  action_templates: Omit<AutomationAction, 'id'>[];
  variables: RecipeVariable[];
  created_by: string;
  created_at: Timestamp;
}

/**
 * Categorias de recipes
 */
export type RecipeCategory =
  | 'onboarding'               // Bem-vindo ao paciente
  | 'reminders'                // Lembretes diversos
  | 'follow_up'                // Follow-up pós-tratamento
  | 'reactivation'             // Reativação de inativos
  | 'collections'              // Cobrança
  | 'productivity'             // Produtividade da equipe
  | 'reporting'                // Relatórios automáticos
  | 'custom';                  // Custom

/**
 * Variável de recipe
 */
export interface RecipeVariable {
  name: string;                // {{patient_name}}
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiline';
  options?: string[];
  default?: string;
  required: boolean;
  description?: string;
}

/**
 * Contexto de execução (variáveis disponíveis durante execução)
 */
export interface AutomationContext {
  trigger: {
    type: AutomationTriggerType;
    data: Record<string, unknown>;
    timestamp: Date;
  };
  automation: {
    id: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  variables: Record<string, unknown>;  // Variáveis custom
}

/**
 * Schema de trigger para validação
 */
export interface TriggerSchema {
  type: AutomationTriggerType;
  label: string;
  description: string;
  category: 'event' | 'schedule' | 'webhook';
  config_fields: ConfigField[];
  example_data: Record<string, unknown>;
}

/**
 * Schema de action para validação
 */
export interface ActionSchema {
  type: AutomationActionType;
  label: string;
  description: string;
  category: 'notification' | 'data' | 'workflow' | 'integration' | 'ai';
  config_fields: ConfigField[];
  delayable: boolean;          // Suporta delay_seconds
}

/**
 * Campo de configuração
 */
export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'toggle' | 'date' | 'time' | 'datetime';
  required: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  description?: string;
}
