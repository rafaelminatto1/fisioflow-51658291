/**
 * Setup Monitoring - Cloud Function para configurar alertas
 * Executa uma vez para configurar Cloud Monitoring
 */

import { onCall } from 'firebase-functions/v2/https';

interface AlertPolicy {
  displayName: string;
  documentation: string;
  filter: string;
  thresholdValue: number;
  duration: string;
  severity: string;
}

export const setupMonitoring = onCall(
  async (request) => {
    // Verificar se é admin
    if (!request.auth?.token?.admin) {
      throw new Error('Unauthorized: Admin only');
    }

    const results: { name: string; status: string; url?: string }[] = [];

    try {
      // Como o Firebase Functions não tem acesso direto à API do Cloud Monitoring,
      // vamos fornecer as URLs e instruções

      const projectId = 'fisioflow-migration';

      const alerts: AlertPolicy[] = [
        {
          displayName: 'Alta Taxa de Erro - Cloud Functions',
          documentation: 'A taxa de erro das Cloud Functions está acima de 5%. Verifique os logs.',
          filter: 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_count" metric.labels."execution_status"="execution_status"',
          thresholdValue: 0.05,
          duration: '300s',
          severity: 'WARNING',
        },
        {
          displayName: 'Alta Latência - Cloud Functions',
          documentation: 'O tempo de execução das Cloud Functions está acima de 10 segundos (p99).',
          filter: 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_times"',
          thresholdValue: 10000,
          duration: '300s',
          severity: 'WARNING',
        },
        {
          displayName: 'Quota Excedida - Cloud Functions',
          documentation: 'A quota de Cloud Functions foi excedida. Considere aumentar a quota.',
          filter: 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_count" metric.labels."response_code"="429"',
          thresholdValue: 0,
          duration: '60s',
          severity: 'CRITICAL',
        },
      ];

      for (const alert of alerts) {
        // URL direta para criar o alerta no console
        const consoleUrl = `https://console.cloud.google.com/monitoring/alerting?project=${projectId}`;

        results.push({
          name: alert.displayName,
          status: 'Manual configuration required',
          url: consoleUrl,
        });
      }

      return {
        success: true,
        message: 'Consulte as instruções abaixo para configurar os alertas manualmente',
        alerts,
        urls: {
          monitoring: `https://console.cloud.google.com/monitoring?project=${projectId}`,
          alerts: `https://console.cloud.google.com/monitoring/alerting?project=${projectId}`,
          logs: `https://console.cloud.google.com/logs?project=${projectId}`,
          dashboard: `https://console.cloud.google.com/monitoring/dashboards?project=${projectId}`,
        },
      };
    } catch (error: any) {
      console.error('[setupMonitoring] Error:', error);
      throw new Error(`Failed to setup monitoring: ${error.message}`);
    }
  }
);
