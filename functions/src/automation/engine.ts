/**
 * Automation Engine - Cloud Functions
 * Motor de execução de automações no backend
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

import {
  Automation,
  AutomationAction,
  AutomationExecutionLog,
} from '../types/automation-types';

// ============================================================================
// Engine Core
// ============================================================================

/**
 * Executa uma automação
 */
export async function executeAutomationEngine(
  db: Firestore,
  automation: Automation,
  eventData?: Record<string, unknown>
): Promise<AutomationExecutionLog> {
  const startTime = Date.now();
  const results: Array<{ action: AutomationAction; result: unknown; error?: string }> = [];

  try {
    // Verificar se a automação está ativa
    if (!automation.is_active) {
      throw new Error('Automação não está ativa');
    }

    // Avaliar condições (se houver)
    if (automation.logic) {
      const conditionMet = await evaluateCondition(db, automation.logic, eventData);
      if (!conditionMet) {
        return {
          id: `log-${Date.now()}`,
          automation_id: automation.id,
          automation_name: automation.name,
          status: 'skipped',
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
        };
      }
    }

    // Executar ações em ordem
    for (const action of automation.actions.sort((a: AutomationAction, b: AutomationAction) => a.order - b.order)) {
      // Aguardar delay se especificado
      if (action.delay_seconds && action.delay_seconds > 0) {
        await sleep(action.delay_seconds * 1000);
      }

      try {
        const result = await executeAction(db, action, automation, eventData);
        results.push({ action, result });
      } catch (error) {
        logger.error(`Erro ao executar ação ${action.type}:`, error);
        results.push({
          action,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });

        // Continuar ou parar baseado em configuração
        // Por ora, continuamos mesmo com erro
      }
    }

    // Atualizar contador de execuções
    await db
      .collection('organizations')
      .doc(automation.organization_id)
      .collection('automations')
      .doc(automation.id)
      .update({
        execution_count: (automation.execution_count || 0) + 1,
        last_executed_at: new Date(),
      });

    return {
      id: `log-${Date.now()}`,
      automation_id: automation.id,
      automation_name: automation.name,
      status: 'success',
      started_at: new Date(startTime),
      completed_at: new Date(),
      duration_ms: Date.now() - startTime,
      results,
    };
  } catch (error) {
    return {
      id: `log-${Date.now()}`,
      automation_id: automation.id,
      automation_name: automation.name,
      status: 'failed',
      started_at: new Date(startTime),
      completed_at: new Date(),
      duration_ms: Date.now() - startTime,
      results,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Avalia condição lógica
 */
async function evaluateCondition(
  db: Firestore,
  condition: any,
  eventData?: Record<string, unknown>
): Promise<boolean> {
  // Implementação simplificada - pode ser expandida
  if (condition.type === 'and') {
    for (const child of condition.children || []) {
      if (!(await evaluateCondition(db, child, eventData))) {
        return false;
      }
    }
    return true;
  }

  if (condition.type === 'or') {
    for (const child of condition.children || []) {
      if (await evaluateCondition(db, child, eventData)) {
        return true;
      }
    }
    return false;
  }

  if (condition.type === 'field_comparison') {
    const { field, operator, value } = condition;
    const fieldValue = getNestedValue(eventData, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue).includes(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return false;
    }
  }

  return true;
}

/**
 * Executa uma ação individual
 */
async function executeAction(
  db: Firestore,
  action: AutomationAction,
  automation: Automation,
  eventData?: Record<string, unknown>
): Promise<unknown> {
  // Substituir variáveis no config
  const config = substituteVariables(action.config, {
    automation,
    event: eventData,
  });

  switch (action.type) {
    case 'send_notification':
      return await sendNotification(db, config);

    case 'send_email':
      return await sendEmail(db, config);

    case 'send_whatsapp':
      return await sendWhatsApp(db, config);

    case 'create_document':
      return await createDocument(db, automation.organization_id, config);

    case 'update_document':
      return await updateDocument(db, automation.organization_id, config);

    case 'call_webhook':
      return await callWebhook(config);

    case 'delay':
      // Delay já é tratado antes da execução
      return { delayed: true };

    default:
      throw new Error(`Tipo de ação não suportado: ${action.type}`);
  }
}

// ============================================================================
// Action Implementations
// ============================================================================

async function sendNotification(db: Firestore, config: any) {
  // TODO: Implementar envio de notificação push
  logger.info('Enviando notificação:', config);
  return { sent: true, type: 'notification', config };
}

async function sendEmail(db: Firestore, config: any) {
  // TODO: Implementar envio de email (usar SendGrid, Mailgun, etc.)
  logger.info('Enviando email:', config);
  return { sent: true, type: 'email', config };
}

async function sendWhatsApp(db: Firestore, config: any) {
  // TODO: Implementar envio de WhatsApp
  logger.info('Enviando WhatsApp:', config);
  return { sent: true, type: 'whatsapp', config };
}

async function createDocument(db: Firestore, organizationId: string, config: any) {
  const { collection, data } = config;

  const docRef = await db
    .collection('organizations')
    .doc(organizationId)
    .collection(collection)
    .add({
      ...data,
      created_at: new Date(),
      created_by_automation: true,
    });

  return { created: true, collection, id: docRef.id };
}

async function updateDocument(db: Firestore, organizationId: string, config: any) {
  const { collection, documentId, data } = config;

  await db
    .collection('organizations')
    .doc(organizationId)
    .collection(collection)
    .doc(documentId)
    .update({
      ...data,
      updated_at: new Date(),
      updated_by_automation: true,
    });

  return { updated: true, collection, documentId };
}

async function callWebhook(config: any) {
  const { url, method = 'POST', headers, body } = config;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function substituteVariables(
  template: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      // Substituir {{variable.path}} com valores do contexto
      result[key] = value.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
        return String(getNestedValue(context, path) || '');
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = substituteVariables(value as Record<string, unknown>, context);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function getNestedValue(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj) return undefined;

  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}

// ============================================================================
// Cloud Functions
// ============================================================================

/**
 * HTTP Callable: Executar automação manualmente
 */
export const executeAutomationCall = onCall(async (request) => {
  const { organizationId, automationId, testData } = request.data;

  if (!organizationId || !automationId) {
    throw new HttpsError('invalid-argument', 'organizationId e automationId são obrigatórios');
  }

  const db = request.data._db || getFirestore();

  // Buscar automação
  const automationSnap = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('automations')
    .doc(automationId)
    .get();

  if (!automationSnap.exists) {
    throw new HttpsError('not-found', 'Automação não encontrada');
  }

  const automation = { id: automationSnap.id, ...automationSnap.data() } as Automation;

  // Executar
  const log = await executeAutomationEngine(db, automation, testData);

  // Salvar log
  await db
    .collection('organizations')
    .doc(organizationId)
    .collection('automation_logs')
    .add(log);

  return { success: log.status === 'success', log };
});

/**
 * HTTP Callable: Testar automação (dry run)
 */
export const testAutomationCall = onCall(async (request) => {
  const { automation, testData } = request.data;

  if (!automation) {
    throw new HttpsError('invalid-argument', 'automation é obrigatório');
  }

  const results: Array<{ action: AutomationAction; result: unknown; error?: string }> = [];

  for (const action of (automation.actions || [])) {
    try {
      const result = await executeAction(
        request.data._db || getFirestore(),
        action,
        automation as Automation,
        testData
      );
      results.push({ action, result });
    } catch (error) {
      results.push({
        action,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: results.every((r) => !r.error),
    results,
  };
});

/**
 * HTTP: Trigger de evento (webhook público)
 */
export const triggerAutomationEvent = onRequest(async (request, response) => {
  const { organizationId, eventType, eventData } = request.body;

  if (!organizationId || !eventType) {
    response.status(400).json({ error: 'organizationId e eventType são obrigatórios' });
    return;
  }

  const db = getFirestore();

  // Buscar automações ativas com este trigger
  const automationsSnap = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('automations')
    .where('is_active', '==', true)
    .where('trigger.type', '==', 'event')
    .where('trigger.event_type', '==', eventType)
    .get();

  const executions: Promise<AutomationExecutionLog>[] = [];

  automationsSnap.forEach((doc) => {
    const automation = { id: doc.id, ...doc.data() } as Automation;
    executions.push(executeAutomationEngine(db, automation, eventData));
  });

  const results = await Promise.allSettled(executions);

  response.json({
    triggered: results.length,
    completed: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  });
});

/**
 * Scheduled: Executar automações agendadas
 * Roda a cada hora
 */
export const scheduledAutomations = onSchedule('0 * * * *', async (event) => {
  const db = getFirestore();
  const now = new Date();

  // Buscar automações agendadas ativas
  const automationsSnap = await db
    .collectionGroup('automations')
    .where('is_active', '==', true)
    .where('trigger.type', '==', 'schedule')
    .get();

  const executions: Promise<AutomationExecutionLog>[] = [];

  for (const doc of automationsSnap.docs) {
    const automation = { id: doc.id, ...doc.data() } as Automation;

    // Verificar se deve executar agora (lógica cron simplificada)
    if (shouldExecuteSchedule(automation.trigger.schedule || '', now)) {
      executions.push(executeAutomationEngine(db, automation));
    }
  }

  const results = await Promise.allSettled(executions);

  logger.info(
    `Scheduled automations executed: ${results.length} total, ` +
    `${results.filter((r) => r.status === 'fulfilled').length} completed`
  );
});

/**
 * Verifica se uma automação com schedule deve executar agora
 */
function shouldExecuteSchedule(schedule: string, now: Date): boolean {
  // Implementação simplificada de verificação cron
  // Para produção, usar biblioteca como node-cron

  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay();

  // Exemplos simples:
  // "0 9 * * *" = 9:00 todos os dias
  // "0 9 * * 1" = 9:00 apenas segundas
  // "*/30 * * * *" = a cada 30 minutos

  if (schedule === '0 * * * *') {
    return minute === 0; // No início de cada hora
  }

  if (schedule === '0 9 * * *') {
    return hour === 9 && minute === 0;
  }

  if (schedule === '0 9 * * 1') {
    return hour === 9 && minute === 0 && dayOfWeek === 1;
  }

  return false;
}

// ============================================================================
// Firestore Trigger
// ============================================================================

/**
 * Trigger automático quando um documento é criado/atualizado
 */
export const onTimeEntryCreated = onDocumentWritten(
  'organizations/{organizationId}/time_entries/{entryId}',
  async (event) => {
    const db = getFirestore();

    // Se event.data for indefinido, ignora
    if (!event.data) return;

    // Apenas criação: documento não existia antes
    const wasCreated = !event.data.before.exists && event.data.after.exists;

    if (!wasCreated) {
      return; 
    }

    const entry = event.data.after.data();

    // Buscar automações que trigger em 'time_entry.created'
    const automationsSnap = await db
      .collection('organizations')
      .doc(event.params.organizationId)
      .collection('automations')
      .where('is_active', '==', true)
      .where('trigger.type', '==', 'event')
      .where('trigger.event_type', '==', 'time_entry.created')
      .get();

    const executions: Promise<AutomationExecutionLog>[] = [];

    automationsSnap.forEach((doc) => {
      const automation = { id: doc.id, ...doc.data() } as Automation;
      executions.push(executeAutomationEngine(db, automation, { entry }));
    });

    await Promise.allSettled(executions);
  }
);

// ============================================================================
// Admin Helper
// ============================================================================

function getFirestore(): Firestore {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}
