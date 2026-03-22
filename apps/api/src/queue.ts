import type { Env } from './types/env';

/**
 * Handler para o Cloudflare Queues.
 * Processa tarefas em segundo plano como envio de e-mails, WhatsApp,
 * processamento de imagens pesado ou sincronização de dados.
 */
export async function handleQueue(batch: MessageBatch<any>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const task = message.body;
    console.log(`[Queue] Processing task type: ${task.type}`, task.payload);

    try {
      switch (task.type) {
        case 'SEND_WHATSAPP':
          // Lógica de envio de WhatsApp em massa
          break;
        case 'PROCESS_BACKUP':
          // Lógica de backup de dados
          break;
        case 'CLEANUP_LOGS':
          // Lógica de limpeza
          break;
        default:
          console.warn(`[Queue] Unknown task type: ${task.type}`);
      }
      
      // Marca como processada com sucesso
      message.ack();
    } catch (error) {
      console.error(`[Queue] Error processing task ${task.type}:`, error);
      // O Cloudflare tentará novamente baseado na política de retry da fila
      message.retry();
    }
  }
}
