import { useState } from 'react';
import { EventoCreate } from '@/lib/validations/evento';

export type EventoTemplate = {
  id: string;
  nome: string;
  descricao: string;
  categoria: 'corrida' | 'corporativo' | 'ativacao' | 'outro';
  gratuito: boolean;
  valor_padrao_prestador: number;
  checklistPadrao?: string[];
};

const TEMPLATES: EventoTemplate[] = [
  {
    id: 'corrida-5k',
    nome: 'Corrida 5K',
    descricao: 'Evento de corrida de 5 quilômetros com atendimento fisioterápico',
    categoria: 'corrida',
    gratuito: false,
    valor_padrao_prestador: 300,
    checklistPadrao: [
      'Maca portátil',
      'Kit de primeiros socorros',
      'Gelo',
      'Faixas elásticas',
      'Água mineral',
      'Tendas para atendimento'
    ]
  },
  {
    id: 'corrida-10k',
    nome: 'Corrida 10K',
    descricao: 'Evento de corrida de 10 quilômetros com suporte completo',
    categoria: 'corrida',
    gratuito: false,
    valor_padrao_prestador: 350,
    checklistPadrao: [
      'Maca portátil',
      'Kit de primeiros socorros completo',
      'Gelo em quantidade',
      'Faixas elásticas',
      'Água mineral',
      'Tendas para atendimento',
      'Cadeiras de atendimento'
    ]
  },
  {
    id: 'acao-corporativa',
    nome: 'Ação Corporativa',
    descricao: 'Atendimento fisioterápico em empresa',
    categoria: 'corporativo',
    gratuito: false,
    valor_padrao_prestador: 250,
    checklistPadrao: [
      'Maca portátil',
      'Kit de massagem',
      'Materiais educativos',
      'Banner da clínica'
    ]
  },
  {
    id: 'ativacao-shopping',
    nome: 'Ativação em Shopping',
    descricao: 'Estande de fisioterapia em shopping center',
    categoria: 'ativacao',
    gratuito: true,
    valor_padrao_prestador: 200,
    checklistPadrao: [
      'Cadeiras de massagem',
      'Banner da clínica',
      'Materiais educativos',
      'Folders',
      'Brindes'
    ]
  }
];

export function useEventoTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<EventoTemplate | null>(null);

  const getTemplates = () => TEMPLATES;

  const getTemplate = (id: string) => TEMPLATES.find(t => t.id === id);

  const applyTemplate = (template: EventoTemplate): Partial<EventoCreate> => {
    return {
      categoria: template.categoria,
      descricao: template.descricao,
      gratuito: template.gratuito,
      valor_padrao_prestador: template.valor_padrao_prestador,
    };
  };

  return {
    templates: TEMPLATES,
    selectedTemplate,
    setSelectedTemplate,
    getTemplates,
    getTemplate,
    applyTemplate,
  };
}
