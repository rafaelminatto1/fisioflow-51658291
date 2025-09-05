import { useState, useCallback } from 'react';
import { toast } from 'sonner';

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
  variables: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  scheduled_for?: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export function useEmailNotifications() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placeholder functions for now
  const fetchTemplates = useCallback(async () => {
    toast.info('Email functionality not yet implemented');
  }, []);

  const fetchNotifications = useCallback(async (patientId?: string) => {
    toast.info('Email functionality not yet implemented');
  }, []);

  const fetchConfig = useCallback(async () => {
    toast.info('Email functionality not yet implemented');
  }, []);

  const createTemplate = useCallback(async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    toast.info('Email functionality not yet implemented');
    throw new Error('Not implemented');
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<EmailTemplate>) => {
    toast.info('Email functionality not yet implemented');
    throw new Error('Not implemented');
  }, []);

  const sendNotification = useCallback(async (
    recipientEmail: string,
    recipientName: string,
    templateId: string,
    variables: Record<string, unknown> = {},
    scheduledFor?: string
  ) => {
    toast.info('Email functionality not yet implemented');
    throw new Error('Not implemented');
  }, []);

  const updateConfig = useCallback(async (newConfig: EmailConfig) => {
    toast.info('Email functionality not yet implemented');
    throw new Error('Not implemented');
  }, []);

  const cancelNotification = useCallback(async (id: string) => {
    toast.info('Email functionality not yet implemented');
    throw new Error('Not implemented');
  }, []);

  const getStats = useCallback(async () => {
    toast.info('Email functionality not yet implemented');
    return null;
  }, []);

  const processEmailQueue = useCallback(async () => {
    toast.info('Email functionality not yet implemented');
  }, []);

  return {
    templates,
    notifications,
    config,
    loading,
    error,
    emailService: null,
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