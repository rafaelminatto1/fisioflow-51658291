/**
 * WhatsApp Integration Hook - Migrated to Firebase
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, collection, getDoc, doc, addDoc, updateDoc } from '@/integrations/firebase/app';
import { useOrganizations } from '@/hooks/useOrganizations';

export function useWhatsAppIntegration() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  const sendMessage = useMutation({
    mutationFn: async (data: { recipient: string; message: string; templateId?: string }) => {
      if (!organizationId) {
        throw new Error('Organização não identificada');
      }

      // Check config
      const configRef = doc(db, 'whatsapp_config', organizationId);
      const configSnapshot = await getDoc(configRef);

      if (!configSnapshot.exists()) {
        throw new Error('WhatsApp não está configurado para esta organização');
      }
      const config = configSnapshot.data();

      if (!config.enabled) {
        throw new Error('WhatsApp não está habilitado');
      }

      // Salvar mensagem no banco
      const messagesRef = await addDoc(collection(db, 'whatsapp_messages'), {
        organization_id: organizationId,
        recipient: data.recipient,
        message: data.message,
        template_id: data.templateId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      // Enviar via API (simulado)
      // Em produção, chamaria a API do WhatsApp Business
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar status
      await updateDoc(doc(db, 'whatsapp_messages', messagesRef.id), {
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      return { id: messagesRef.id, ...data };
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
