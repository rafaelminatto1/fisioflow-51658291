import { createContext, useContext } from 'react';

export const tourSteps = [
  {
    id: 'welcome',
    selector: ':root',
    title: 'Bem-vindo ao FisioFlow! 👋',
    content: 'Vamos fazer um tour rápido pelos principais recursos do sistema para você começar com o pé direito.',
    position: 'center' as const,
  },
  {
    id: 'navigation',
    selector: '[data-tour="sidebar"]',
    title: 'Navegação Principal',
    content: 'Aqui você encontra acesso rápido a todas as áreas do sistema: Agenda, Pacientes, Financeiro e mais.',
    position: 'right' as const,
  },
  {
    id: 'agenda',
    selector: '[data-tour="agenda-link"]',
    title: 'Agenda Inteligente',
    content: 'Gerencie seus agendamentos com visualização diária, semanal ou mensal. Arraste e solte para reagendar rapidamente!',
    position: 'right' as const,
  },
  {
    id: 'pacientes',
    selector: '[data-tour="patients-link"]',
    title: 'Gestão de Pacientes',
    content: 'Cadastre e gerencie seus pacientes, visualize evoluções, histórico de sessões e prontuários.',
    position: 'right' as const,
  },
  {
    id: 'financeiro',
    selector: '[data-tour="financial-link"]',
    title: 'Controle Financeiro',
    content: 'Acompanhe receitas, despesas e pacotes de sessões. Gere relatórios e exporte dados para Excel.',
    position: 'right' as const,
  },
  {
    id: 'quick-actions',
    selector: '[data-tour="quick-actions"]',
    title: 'Ações Rápidas',
    content: 'Botões de atalho para as tarefas mais comuns: cadastrar paciente, agendar, e mais.',
    position: 'bottom' as const,
  },
  {
    id: 'dashboard',
    selector: '[data-tour="dashboard"]',
    title: 'Dashboard Personalizado',
    content: 'Visualize métricas importantes, próximos agendamentos e alertas do sistema em um só lugar.',
    position: 'top' as const,
  },
  {
    id: 'search',
    selector: '[data-tour="search"]',
    title: 'Busca Global',
    content: 'Encontre pacientes, agendamentos ou qualquer informação rapidamente.',
    position: 'bottom' as const,
  },
  {
    id: 'notifications',
    selector: '[data-tour="notifications"]',
    title: 'Notificações',
    content: 'Fique por dentro de lembretes, confirmações e atualizações importantes.',
    position: 'bottom' as const,
  },
  {
    id: 'complete',
    selector: ':root',
    title: 'Tour Completo! 🎉',
    content: 'Você já está pronto para usar o FisioFlow. Acesse o menu de configurações para rever este tour a qualquer momento.',
    position: 'center' as const,
  },
];

export interface TourContextType {
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  startTour: () => void;
  closeTour: () => void;
  hasSeenTour: boolean;
  setHasSeenTour: (seen: boolean) => void;
}

export const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within TourProviderWrapper');
  }
  return context;
}
