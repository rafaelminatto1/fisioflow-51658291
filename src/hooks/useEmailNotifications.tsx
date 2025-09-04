import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { createEmailService, defaultEmailConfig } from '@/services/email/EmailService';
import type { EmailService } from '@/services/email/EmailService';
import type { EmailConfig } from '@/services/email/types';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: string[];
  type: 'appointment_reminder' | 'appointment_confirmation' | 'exercise_reminder' | 'progress_report' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface EmailNotification {
  id: string;
  recipient_email: string;
  recipient_name: string;
  template_id: string;
  subject: string;
  content: string;
  variables: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  scheduled_for?: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid';
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
}

export function useEmailNotifications() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailService, setEmailService] = useState<EmailService | null>(null);

  // Fetch email templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar templates';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch email notifications
  const fetchNotifications = useCallback(async (patientId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('email_notifications')
        .select(`
          *,
          email_templates(name, type)
        `)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar notificações';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch email configuration
  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('email_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar configuração';
      setError(message);
    }
  }, []);

  // Create email template
  const createTemplate = useCallback(async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [data, ...prev]);
      toast.success('Template criado com sucesso!');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar template';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update email template
  const updateTemplate = useCallback(async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => t.id === id ? data : t));
      toast.success('Template atualizado com sucesso!');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar template';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send email notification
  const sendNotification = useCallback(async (
    recipientEmail: string,
    recipientName: string,
    templateId: string,
    variables: Record<string, any> = {},
    scheduledFor?: string
  ) => {
    try {
      setLoading(true);
      
      // Get template
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template não encontrado');

      // Replace variables in content
      let subject = template.subject;
      let content = template.html_content;
      
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        content = content.replace(new RegExp(placeholder, 'g'), String(value));
      });

      const notification = {
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        template_id: templateId,
        subject,
        content,
        variables,
        status: scheduledFor ? 'scheduled' as const : 'pending' as const,
        scheduled_for: scheduledFor
      };

      const { data, error } = await supabase
        .from('email_notifications')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;
      
      // If immediate sending and email service is available
      if (!scheduledFor && emailService) {
        try {
          const result = await emailService.sendEmail({
            to: { email: recipientEmail },
            from: {
              email: config?.from_email || 'noreply@fisioflow.com',
              name: config?.from_name || 'FisioFlow'
            },
            subject,
            html: content
          });

          // Update notification status
          await supabase
            .from('email_notifications')
            .update({
              status: result.success ? 'sent' : 'failed',
              sent_at: result.success ? new Date().toISOString() : undefined,
              error_message: result.error || null
            })
            .eq('id', data.id);

          if (result.success) {
            toast.success('Email enviado com sucesso!');
          } else {
            toast.error(`Erro ao enviar email: ${result.error}`);
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          toast.error('Erro ao enviar email');
        }
      } else {
        if (scheduledFor) {
          toast.success('Email agendado com sucesso!');
        } else {
          toast.success('Email adicionado à fila!');
        }
      }
      
      setNotifications(prev => [data, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar email';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [templates, emailService, config]);

  // Update email configuration
  const updateConfig = useCallback(async (newConfig: EmailConfig) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_config')
        .upsert([newConfig])
        .select()
        .single();

      if (error) throw error;
      
      setConfig(data);
      
      // Initialize email service with new config
      if (data.provider && data.api_key) {
        try {
          const service = createEmailService({
            provider: {
              provider: data.provider as 'resend' | 'sendgrid',
              apiKey: data.api_key,
              fromEmail: data.from_email || 'noreply@fisioflow.com',
              fromName: data.from_name || 'FisioFlow'
            },
            ...defaultEmailConfig
          });
          
          const isValid = await service.validateProvider();
          if (isValid) {
            setEmailService(service);
            toast.success('Configuração atualizada e validada com sucesso!');
          } else {
            toast.error('Configuração salva, mas validação falhou. Verifique as credenciais.');
          }
        } catch (serviceError) {
          console.error('Error initializing email service:', serviceError);
          toast.error('Erro ao inicializar serviço de email');
        }
      } else {
        toast.success('Configuração atualizada com sucesso!');
      }
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar configuração';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel scheduled notification
  const cancelNotification = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('email_notifications')
        .delete()
        .eq('id', id)
        .eq('status', 'scheduled');

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação cancelada com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar notificação';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get notification statistics
  const getStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_email_stats');

      if (error) throw error;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
      setError(message);
      return null;
    }
  }, []);

  // Process email queue
  const processEmailQueue = useCallback(async () => {
    if (emailService) {
      try {
        await emailService.processEmailQueue();
        // Refresh notifications to show updated statuses
        await fetchNotifications();
      } catch (error) {
        console.error('Error processing email queue:', error);
        toast.error('Erro ao processar fila de emails');
      }
    }
  }, [emailService, fetchNotifications]);

  return {
    templates,
    notifications,
    config,
    loading,
    error,
    emailService,
    fetchTemplates,
    fetchNotifications,
    fetchConfig,
    createTemplate,
    updateTemplate,
    sendNotification,
    updateConfig,
    cancelNotification,
    getStats,
    processEmailQueue
  };
}