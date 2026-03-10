/**
 * WhatsApp Integration Hook - Migrated to Neon/Cloudflare
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrganizations } from '@/hooks/useOrganizations';
import { whatsappApi } from '@/lib/api/workers-client';

export function useWhatsAppIntegration() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  const sendMessage = useMutation({
    mutationFn: async (data: { recipient: string; message: string; templateId?: string }) => {
      if (!organizationId) {
        throw new Error('Organização não identificada');
      }

      const configResponse = await whatsappApi.getConfig();
      const config = configResponse?.data ?? { enabled: false };

      if (!config.enabled) {
        throw new Error('WhatsApp não está habilitado');
      }

      await whatsappApi.createMessage({
        patient_id: null,
        appointment_id: null,
        message_type: 'confirmation',
        message_content: data.message,
        metadata: {
          recipient: data.recipient,
          template_id: data.templateId,
        },
        status: 'sent',
      });

      return data;
    },
    onSuccess: () => {
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });

  return { sendMessage };
}
