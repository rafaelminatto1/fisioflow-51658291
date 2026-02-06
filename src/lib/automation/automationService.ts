/**
 * Automation Service - Firebase Firestore Integration
 * Serviço para gerenciamento de automações
 */

  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/integrations/firebase/app';

import type {
  Automation,
  AutomationTrigger,
  AutomationAction,
  AutomationCondition,
  AutomationExecutionLog,
} from '@/types/automation';

const COLLECTION_NAME = 'automations';
const LOGS_COLLECTION = 'automation_logs';

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Criar nova automação
 */
export async function createAutomation(
  organizationId: string,
  automation: Omit<Automation, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_executed_at'>
): Promise<Automation> {
  const autoRef = doc(collection(db, 'organizations', organizationId, COLLECTION_NAME));
  const now = Timestamp.now();

  const newAutomation: Automation = {
    ...automation,
    id: autoRef.id,
    execution_count: 0,
    created_at: now,
    updated_at: now,
  };

  await setDoc(autoRef, newAutomation);

  return newAutomation;
}

/**
 * Obter automação por ID
 */
export async function getAutomation(
  organizationId: string,
  automationId: string
): Promise<Automation | null> {
  const autoRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, automationId);
  const autoSnap = await getDoc(autoRef);

  if (!autoSnap.exists()) {
    return null;
  }

  return { id: autoSnap.id, ...autoSnap.data() } as Automation;
}

/**
 * Atualizar automação
 */
export async function updateAutomation(
  organizationId: string,
  automationId: string,
  updates: Partial<Omit<Automation, 'id' | 'created_at' | 'created_by' | 'execution_count'>>
): Promise<void> {
  const autoRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, automationId);

  await updateDoc(autoRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * Ativar/desativar automação
 */
export async function toggleAutomation(
  organizationId: string,
  automationId: string,
  isActive: boolean
): Promise<void> {
  await updateAutomation(organizationId, automationId, { is_active: isActive });
}

/**
 * Deletar automação
 */
export async function deleteAutomation(
  organizationId: string,
  automationId: string
): Promise<void> {
  const autoRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, automationId);
  await deleteDoc(autoRef);
}

/**
 * Buscar automações da organização
 */
export async function getAutomations(
  organizationId: string,
  options?: {
    is_active?: boolean;
    created_by?: string;
  }
): Promise<Automation[]> {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  let q = query(collectionRef, orderBy('created_at', 'desc'));

  if (options?.is_active !== undefined) {
    q = query(q, where('is_active', '==', options.is_active));
  }

  if (options?.created_by) {
    q = query(q, where('created_by', '==', options.created_by));
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Automation[];
}

// ============================================================================
// Real-time Listeners
// ============================================================================

/**
 * Listener em tempo real para automações
 */
export function listenToAutomations(
  organizationId: string,
  callback: (automations: Automation[]) => void
): () => void {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  const q = query(collectionRef, orderBy('updated_at', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const automations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Automation[];
    callback(automations);
  });

  return unsubscribe;
}

// ============================================================================
// Execution
// ============================================================================

/**
 * Executar automação manualmente
 */
export async function executeAutomation(
  organizationId: string,
  automationId: string,
  testData?: Record<string, unknown>
): Promise<AutomationExecutionLog> {
  const automation = await getAutomation(organizationId, automationId);

  if (!automation) {
    throw new Error('Automação não encontrada');
  }

  if (!automation.is_active) {
    throw new Error('Automação não está ativa');
  }

  // Chamar Cloud Function para executar
  const executeFn = httpsCallable(functions, 'executeAutomation');
  const result = await executeFn({
    organizationId,
    automationId,
    testData,
  });

  return result.data as AutomationExecutionLog;
}

/**
 * Testar automação (dry run)
 */
export async function testAutomation(
  organizationId: string,
  automation: Automation,
  testData?: Record<string, unknown>
): Promise<{
  success: boolean;
  results: Array<{ action: AutomationAction; result: unknown; error?: string }>;
}> {
  const testFn = httpsCallable(functions, 'testAutomation');
  const result = await testFn({
    organizationId,
    automation,
    testData,
  });

  return result.data as {
    success: boolean;
    results: Array<{ action: AutomationAction; result: unknown; error?: string }>;
  };
}

// ============================================================================
// Execution Logs
// ============================================================================

/**
 * Buscar logs de execução de uma automação
 */
export async function getAutomationLogs(
  organizationId: string,
  automationId: string,
  limit = 50
): Promise<AutomationExecutionLog[]> {
  const collectionRef = collection(db, 'organizations', organizationId, LOGS_COLLECTION);
  const q = query(
    collectionRef,
    where('automation_id', '==', automationId),
    orderBy('executed_at', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .slice(0, limit) as AutomationExecutionLog[];
}

/**
 * Listener em tempo real para logs
 */
export function listenToAutomationLogs(
  organizationId: string,
  automationId: string,
  callback: (logs: AutomationExecutionLog[]) => void
): () => void {
  const collectionRef = collection(db, 'organizations', organizationId, LOGS_COLLECTION);
  const q = query(
    collectionRef,
    where('automation_id', '==', automationId),
    orderBy('executed_at', 'desc'),
    where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Últimas 24h
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AutomationExecutionLog[];
    callback(logs);
  });

  return unsubscribe;
}

// ============================================================================
// Recipe Library (Templates)
// ============================================================================

export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: 'communication' | 'scheduling' | 'financial' | 'clinical' | 'administrative';
  icon: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  variables?: Array<{ key: string; label: string; type: string; default?: unknown }>;
}

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: 'welcome-patient',
    name: 'Boas-vindas ao Paciente',
    description: 'Envia mensagem de boas-vindas quando um novo paciente é cadastrado',
    category: 'communication',
    icon: '👋',
    trigger: {
      type: 'event',
      event_type: 'patient.created',
      config: {},
    },
    actions: [
      {
        id: 'send-welcome-email',
        type: 'send_email',
        order: 1,
        config: {
          template_id: 'welcome-email',
          to: '{{patient.email}}',
          subject: 'Bem-vindo à nossa clínica!',
        },
      },
      {
        id: 'send-welcome-whatsapp',
        type: 'send_whatsapp',
        order: 2,
        config: {
          template_id: 'welcome-whatsapp',
          to: '{{patient.phone}}',
        },
      },
    ],
    variables: [
      { key: 'email_template', label: 'Template de Email', type: 'template', default: 'welcome-email' },
      { key: 'whatsapp_template', label: 'Template de WhatsApp', type: 'template', default: 'welcome-whatsapp' },
    ],
  },
  {
    id: 'appointment-reminder',
    name: 'Lembrete de Consulta',
    description: 'Envia lembrete 24h antes da consulta',
    category: 'scheduling',
    icon: '📅',
    trigger: {
      type: 'schedule',
      schedule: '0 9 * * *', // 9h todos os dias
      config: { hours_before: 24 },
    },
    actions: [
      {
        id: 'send-reminder',
        type: 'send_whatsapp',
        order: 1,
        config: {
          template_id: 'appointment-reminder',
          to: '{{appointment.patient.phone}}',
        },
      },
    ],
  },
  {
    id: 'payment-reminder',
    name: 'Lembrete de Pagamento',
    description: 'Alerta sobre pagamentos atrasados',
    category: 'financial',
    icon: '💰',
    trigger: {
      type: 'schedule',
      schedule: '0 10 * * *', // 10h todos os dias
      config: {},
    },
    actions: [
      {
        id: 'check-overdue',
        type: 'query_data',
        order: 1,
        config: {
          collection: 'payments',
          filter: { status: 'pending', due_date: '{{today}}' },
        },
      },
      {
        id: 'send-reminder',
        type: 'send_whatsapp',
        order: 2,
        config: {
          template_id: 'payment-reminder',
          to: '{{payment.patient.phone}}',
        },
      },
    ],
  },
  {
    id: 'reactivate-inactive',
    name: 'Reativação de Inativos',
    description: 'Contata pacientes sem sessões há 30 dias',
    category: 'communication',
    icon: '🔄',
    trigger: {
      type: 'schedule',
      schedule: '0 9 * * 1', // 9h toda segunda
      config: { days_inactive: 30 },
    },
    actions: [
      {
        id: 'send-reactivation',
        type: 'send_whatsapp',
        order: 1,
        config: {
          template_id: 'reactivation',
          to: '{{patient.phone}}',
        },
      },
    ],
  },
  {
    id: 'nps-survey',
    name: 'Pesquisa de Satisfação',
    description: 'Envia NPS após 10 sessões',
    category: 'clinical',
    icon: '⭐',
    trigger: {
      type: 'event',
      event_type: 'session.completed',
      config: { session_count: 10 },
    },
    actions: [
      {
        id: 'send-nps',
        type: 'send_email',
        order: 1,
        config: {
          template_id: 'nps-survey',
          to: '{{patient.email}}',
          subject: 'Conte-nos sobre sua experiência',
        },
      },
    ],
  },
];

/**
 * Criar automação a partir de recipe
 */
export function createAutomationFromRecipe(
  recipe: AutomationRecipe,
  values: Record<string, unknown>
): Omit<Automation, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_executed_at'> {
  return {
    name: recipe.name,
    description: recipe.description,
    organization_id: '', // Será preenchido depois
    created_by: '', // Será preenchido depois
    is_active: false,
    trigger: recipe.trigger,
    actions: recipe.actions,
  };
}

// ============================================================================
// Triggers
// ============================================================================

/**
 * Registrar evento que pode disparar automações
 * Esta função deve ser chamada quando eventos ocorrem
 */
export async function triggerEvent(
  organizationId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const triggerFn = httpsCallable(functions, 'triggerAutomationEvent');

  await triggerFn({
    organizationId,
    eventType,
    eventData,
  });
}

/**
 * Trigger para criação de paciente
 */
export async function triggerPatientCreated(
  organizationId: string,
  patientData: { id: string; name: string; email?: string; phone?: string }
): Promise<void> {
  await triggerEvent(organizationId, 'patient.created', patientData);
}

/**
 * Trigger para conclusão de sessão
 */
export async function triggerSessionCompleted(
  organizationId: string,
  sessionData: { id: string; patient_id: string; session_number: number }
): Promise<void> {
  await triggerEvent(organizationId, 'session.completed', sessionData);
}

/**
 * Trigger para agendamento criado
 */
export async function triggerAppointmentCreated(
  organizationId: string,
  appointmentData: {
    id: string;
    patient_id: string;
    date: string;
    time: string;
  }
): Promise<void> {
  await triggerEvent(organizationId, 'appointment.created', appointmentData);
}
