import { useState, useEffect } from 'react';

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms' | 'email';
  subject?: string;
  content: string;
  variables: string[];
  category: 'appointment' | 'reminder' | 'marketing' | 'follow-up' | 'emergency';
  is_active: boolean;
  created_at: string;
  usage_count: number;
}

export interface CommunicationHistory {
  id: string;
  patient_id: string;
  patient_name: string;
  type: 'whatsapp' | 'sms' | 'email';
  template_id: string;
  template_name: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
}

export interface CommunicationStats {
  total_sent: number;
  whatsapp_sent: number;
  sms_sent: number;
  email_sent: number;
  delivery_rate: number;
  read_rate: number;
  response_rate: number;
  failed_count: number;
}

export interface BulkCommunication {
  id: string;
  name: string;
  template_id: string;
  template_name: string;
  type: 'whatsapp' | 'sms' | 'email';
  target_audience: 'all' | 'active' | 'inactive' | 'custom';
  patient_ids: string[];
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
}

const MOCK_TEMPLATES: CommunicationTemplate[] = [
  {
    id: '1',
    name: 'Lembrete de Consulta',
    type: 'whatsapp',
    content: 'Olá {{patient_name}}! Lembramos que você tem uma consulta marcada para {{appointment_date}} às {{appointment_time}} com {{therapist_name}}. Confirme sua presença respondendo este WhatsApp.',
    variables: ['patient_name', 'appointment_date', 'appointment_time', 'therapist_name'],
    category: 'reminder',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    usage_count: 245
  },
  {
    id: '2',
    name: 'Confirmação de Agendamento',
    type: 'email',
    subject: 'Consulta Agendada - FisioFlow',
    content: 'Prezado(a) {{patient_name}},\n\nSua consulta foi agendada com sucesso!\n\nDetalhes:\n- Data: {{appointment_date}}\n- Horário: {{appointment_time}}\n- Fisioterapeuta: {{therapist_name}}\n- Local: {{clinic_address}}\n\nEm caso de dúvidas, entre em contato conosco.\n\nAtenciosamente,\nEquipe FisioFlow',
    variables: ['patient_name', 'appointment_date', 'appointment_time', 'therapist_name', 'clinic_address'],
    category: 'appointment',
    is_active: true,
    created_at: '2024-01-10T14:30:00Z',
    usage_count: 189
  },
  {
    id: '3',
    name: 'SMS Lembrete Urgente',
    type: 'sms',
    content: 'URGENTE: {{patient_name}}, sua consulta é HOJE às {{appointment_time}}. Confirme: SIM ou NÃO. FisioFlow',
    variables: ['patient_name', 'appointment_time'],
    category: 'emergency',
    is_active: true,
    created_at: '2024-01-20T09:15:00Z',
    usage_count: 67
  },
  {
    id: '4',
    name: 'Follow-up Pós Consulta',
    type: 'whatsapp',
    content: 'Oi {{patient_name}}! Como você está se sentindo após a sessão de hoje? Lembre-se de fazer os exercícios recomendados. Qualquer dúvida, estamos aqui! 💪',
    variables: ['patient_name'],
    category: 'follow-up',
    is_active: true,
    created_at: '2024-01-12T16:45:00Z',
    usage_count: 156
  },
  {
    id: '5',
    name: 'Promoção Mensal',
    type: 'email',
    subject: 'Oferta Especial - {{discount}}% de Desconto!',
    content: 'Olá {{patient_name}},\n\nTemos uma oferta especial para você!\n\n🎉 {{discount}}% de desconto em pacotes de fisioterapia\n⏰ Válido até {{expiry_date}}\n\nAproveite esta oportunidade para cuidar da sua saúde!\n\nAgende já: {{phone_number}}',
    variables: ['patient_name', 'discount', 'expiry_date', 'phone_number'],
    category: 'marketing',
    is_active: true,
    created_at: '2024-01-08T11:20:00Z',
    usage_count: 89
  }
];

const MOCK_HISTORY: CommunicationHistory[] = [
  {
    id: '1',
    patient_id: '1',
    patient_name: 'Maria Silva',
    type: 'whatsapp',
    template_id: '1',
    template_name: 'Lembrete de Consulta',
    content: 'Olá Maria Silva! Lembramos que você tem uma consulta marcada para 25/01/2024 às 14:00 com Dr. João Santos.',
    status: 'read',
    sent_at: '2024-01-24T10:00:00Z',
    delivered_at: '2024-01-24T10:01:00Z',
    read_at: '2024-01-24T10:15:00Z'
  },
  {
    id: '2',
    patient_id: '2',
    patient_name: 'Carlos Oliveira',
    type: 'email',
    template_id: '2',
    template_name: 'Confirmação de Agendamento',
    content: 'Prezado Carlos Oliveira, sua consulta foi agendada com sucesso para 26/01/2024 às 09:30.',
    status: 'delivered',
    sent_at: '2024-01-24T15:30:00Z',
    delivered_at: '2024-01-24T15:31:00Z'
  },
  {
    id: '3',
    patient_id: '3',
    patient_name: 'Ana Costa',
    type: 'sms',
    template_id: '3',
    template_name: 'SMS Lembrete Urgente',
    content: 'URGENTE: Ana Costa, sua consulta é HOJE às 16:00. Confirme: SIM ou NÃO.',
    status: 'failed',
    sent_at: '2024-01-24T14:00:00Z',
    error_message: 'Número de telefone inválido'
  }
];

const MOCK_BULK_COMMUNICATIONS: BulkCommunication[] = [
  {
    id: '1',
    name: 'Lembrete Semanal - Todos os Pacientes',
    template_id: '1',
    template_name: 'Lembrete de Consulta',
    type: 'whatsapp',
    target_audience: 'active',
    patient_ids: ['1', '2', '3', '4', '5'],
    status: 'completed',
    total_recipients: 5,
    sent_count: 5,
    delivered_count: 4,
    failed_count: 1,
    created_at: '2024-01-22T08:00:00Z'
  },
  {
    id: '2',
    name: 'Campanha Promocional Janeiro',
    template_id: '5',
    template_name: 'Promoção Mensal',
    type: 'email',
    target_audience: 'all',
    patient_ids: ['1', '2', '3', '4', '5', '6', '7', '8'],
    scheduled_at: '2024-01-25T09:00:00Z',
    status: 'scheduled',
    total_recipients: 8,
    sent_count: 0,
    delivered_count: 0,
    failed_count: 0,
    created_at: '2024-01-24T12:00:00Z'
  }
];

export const useCommunication = () => {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [history, setHistory] = useState<CommunicationHistory[]>([]);
  const [bulkCommunications, setBulkCommunications] = useState<BulkCommunication[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simular carregamento de dados
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setTemplates(MOCK_TEMPLATES);
        setHistory(MOCK_HISTORY);
        setBulkCommunications(MOCK_BULK_COMMUNICATIONS);
        
        // Calcular estatísticas
        const totalSent = MOCK_HISTORY.length;
        const whatsappSent = MOCK_HISTORY.filter(h => h.type === 'whatsapp').length;
        const smsSent = MOCK_HISTORY.filter(h => h.type === 'sms').length;
        const emailSent = MOCK_HISTORY.filter(h => h.type === 'email').length;
        const delivered = MOCK_HISTORY.filter(h => h.status === 'delivered' || h.status === 'read').length;
        const read = MOCK_HISTORY.filter(h => h.status === 'read').length;
        const failed = MOCK_HISTORY.filter(h => h.status === 'failed').length;
        
        setStats({
          total_sent: totalSent,
          whatsapp_sent: whatsappSent,
          sms_sent: smsSent,
          email_sent: emailSent,
          delivery_rate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
          read_rate: totalSent > 0 ? (read / totalSent) * 100 : 0,
          response_rate: 15.5, // Mock
          failed_count: failed
        });
        
        setError(null);
      } catch {
        setError('Erro ao carregar dados de comunicação');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const sendCommunication = async (templateId: string, patientIds: string[], _variables: Record<string, string>) => {
    try {
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template não encontrado');
      
      // Simular criação de histórico
      const newHistory: CommunicationHistory[] = patientIds.map((patientId, index) => ({
        id: `new_${Date.now()}_${index}`,
        patient_id: patientId,
        patient_name: `Paciente ${patientId}`,
        type: template.type,
        template_id: templateId,
        template_name: template.name,
        content: template.content,
        status: Math.random() > 0.1 ? 'sent' : 'failed',
        sent_at: new Date().toISOString()
      }));
      
      setHistory(prev => [...newHistory, ...prev]);
      
      return {
        success: true,
        sent_count: newHistory.filter(h => h.status === 'sent').length,
        failed_count: newHistory.filter(h => h.status === 'failed').length
      };
    } catch {
      throw new Error('Erro ao enviar comunicação');
    }
  };

  const createTemplate = async (template: Omit<CommunicationTemplate, 'id' | 'created_at' | 'usage_count'>) => {
    try {
      const newTemplate: CommunicationTemplate = {
        ...template,
        id: `template_${Date.now()}`,
        created_at: new Date().toISOString(),
        usage_count: 0
      };
      
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch {
      throw new Error('Erro ao criar template');
    }
  };

  const updateTemplate = async (templateId: string, updates: Partial<CommunicationTemplate>) => {
    try {
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, ...updates } : t
      ));
    } catch {
      throw new Error('Erro ao atualizar template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch {
      throw new Error('Erro ao excluir template');
    }
  };

  const createBulkCommunication = async (bulk: Omit<BulkCommunication, 'id' | 'created_at' | 'sent_count' | 'delivered_count' | 'failed_count'>) => {
    try {
      const newBulk: BulkCommunication = {
        ...bulk,
        id: `bulk_${Date.now()}`,
        created_at: new Date().toISOString(),
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0
      };
      
      setBulkCommunications(prev => [newBulk, ...prev]);
      return newBulk;
    } catch {
      throw new Error('Erro ao criar comunicação em massa');
    }
  };

  const getTemplatesByType = (type: 'whatsapp' | 'sms' | 'email') => {
    return templates.filter(t => t.type === type && t.is_active);
  };

  const getTemplatesByCategory = (category: CommunicationTemplate['category']) => {
    return templates.filter(t => t.category === category && t.is_active);
  };

  const getHistoryByPatient = (patientId: string) => {
    return history.filter(h => h.patient_id === patientId);
  };

  const getHistoryByType = (type: 'whatsapp' | 'sms' | 'email') => {
    return history.filter(h => h.type === type);
  };

  const getRecentHistory = (limit: number = 10) => {
    return history.slice(0, limit);
  };

  return {
    // Data
    templates,
    history,
    bulkCommunications,
    stats,
    loading,
    error,
    
    // Actions
    sendCommunication,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createBulkCommunication,
    
    // Filters
    getTemplatesByType,
    getTemplatesByCategory,
    getHistoryByPatient,
    getHistoryByType,
    getRecentHistory
  };
};