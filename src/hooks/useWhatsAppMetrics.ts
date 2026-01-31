import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, orderBy, limit, addDoc, updateDoc, doc } from '@/integrations/firebase/app';
import { WhatsAppService } from '@/lib/services/WhatsAppService';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';



export interface WhatsAppMetric {
  id: string;
  phone_number: string;
  patient_id: string | null;
  appointment_id: string | null;
  template_key: string | null;
  message_type: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  reply_content: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  template_key: string;
  content: string;
  variables: string[];
  category: string;
  status: string;
}

export interface MetricsSummary {
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
  responseRate: number;
  avgResponseTime: number;
  deliveryRate: number;
  readRate: number;
}

// Hook for connection status
export function useWhatsAppConnection() {
  return useQuery({
    queryKey: ['whatsapp', 'connection'],
    queryFn: async () => {
      // Assuming WhatsAppService internally handles connection logic or uses Firebase Functions
      return await WhatsAppService.testConnection();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Hook for metrics summary
export function useWhatsAppMetricsSummary(days: number = 30) {
  return useQuery({
    queryKey: ['whatsapp', 'metrics-summary', days],
    queryFn: async (): Promise<MetricsSummary> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = firestoreQuery(
        collection(db, 'whatsapp_metrics'),
        where('created_at', '>=', startDate.toISOString()),
        where('message_type', '==', 'outbound')
      );

      const snapshot = await getDocs(q);
      const metrics = snapshot.docs.map(doc => doc.data() as WhatsAppMetric);

      const totalSent = metrics.length;
      const delivered = metrics.filter(m => m.delivered_at).length;
      const read = metrics.filter(m => m.read_at).length;
      const failed = metrics.filter(m => m.status === 'falhou').length;
      const replied = metrics.filter(m => m.replied_at).length;

      // Calculate avg response time
      const responseTimes = metrics
        .filter(m => m.sent_at && m.replied_at)
        .map(m => {
          const sent = new Date(m.sent_at!).getTime();
          const repliedAt = new Date(m.replied_at!).getTime();
          return (repliedAt - sent) / (1000 * 60);
        });

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      return {
        totalSent,
        delivered,
        read,
        failed,
        responseRate: totalSent > 0 ? Math.round((replied / totalSent) * 100) : 0,
        avgResponseTime: Math.round(avgResponseTime),
        deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for recent messages
export function useWhatsAppMessages(limitCount: number = 50) {
  return useQuery({
    queryKey: ['whatsapp', 'messages', limitCount],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'whatsapp_metrics'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      // Note: We need to join with patients manually in NoSQL usually, or store patient name in metrics.
      // Assuming for now metrics have basic info or we fetch patients separately if needed.
      // To mimic the join, we'll fetch basic data. If 'patients' detail is needed, we might need a second query.
      // For simplicity in migration, returning metrics. If the UI needs patient names, 
      // ideally 'patient_name' should be stored in 'whatsapp_metrics' or fetched.
      // Let's assume we return data and if UI breaks we'll add 'patient_name' fetch.

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook for templates
export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ['whatsapp', 'templates'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'whatsapp_templates'), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WhatsAppTemplate[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for webhook logs
export function useWhatsAppWebhookLogs(limitCount: number = 100) {
  return useQuery({
    queryKey: ['whatsapp', 'webhook-logs', limitCount],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'whatsapp_webhook_logs'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutation for sending test message
export function useSendTestMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const result = await WhatsAppService.sendMessage({ to: phone, message });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
      toast.success('Mensagem de teste enviada!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar: ' + error.message);
    },
  });
}

// Mutation for updating template
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const docRef = doc(db, 'whatsapp_templates', id);
      await updateDoc(docRef, {
        content,
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] });
      toast.success('Template atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

// Hook for daily stats chart data
export function useWhatsAppDailyStats(days: number = 7) {
  return useQuery({
    queryKey: ['whatsapp', 'daily-stats', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = firestoreQuery(
        collection(db, 'whatsapp_metrics'),
        where('created_at', '>=', startDate.toISOString()),
        where('message_type', '==', 'outbound')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data());

      // Group by date
      const grouped = new Map<string, { sent: number; delivered: number; read: number; failed: number }>();

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        grouped.set(key, { sent: 0, delivered: 0, read: 0, failed: 0 });
      }

      data.forEach(m => {
        const key = m.created_at.split('T')[0];
        const entry = grouped.get(key);
        if (entry) {
          entry.sent++;
          if (m.delivered_at) entry.delivered++;
          if (m.read_at) entry.read++;
          if (m.status === 'falhou') entry.failed++;
        }
      });

      return Array.from(grouped.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .reverse();
    },
    staleTime: 5 * 60 * 1000,
  });
}
