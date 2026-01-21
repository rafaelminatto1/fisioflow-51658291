/**
 * MobileTabBar - Barra de navegação inferior para apps móveis
 * Substitui a sidebar da versão web por uma tabBar mais adequada para mobile
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Users,
  FileText,
  Settings,
  Activity
} from 'lucide-react';
import { SafeAreaWrapper } from './SafeAreaWrapper';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: number;
}

/**
 * Tabs disponíveis para profissionais
 */
const PRO_TABS: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Início',
    icon: Home,
    path: '/dashboard'
  },
  {
    id: 'calendar',
    label: 'Agenda',
    icon: Calendar,
    path: '/schedule'
  },
  {
    id: 'patients',
    label: 'Pacientes',
    icon: Users,
    path: '/patients'
  },
  {
    id: 'sessions',
    label: 'Sessões',
    icon: FileText,
    path: '/sessions'
  },
  {
    id: 'settings',
    label: 'Mais',
    icon: Settings,
    path: '/settings'
  }
];

/**
 * Tabs disponíveis para pacientes
 */
const PATIENT_TABS: TabItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: Home,
    path: '/mobile/patient'
  },
  {
    id: 'exercises',
    label: 'Exercícios',
    icon: Activity,
    path: '/mobile/patient/exercises'
  },
  {
    id: 'appointments',
    label: 'Consultas',
    icon: Calendar,
    path: '/mobile/patient/appointments'
  },
  {
    id: 'progress',
    label: 'Progresso',
    icon: FileText,
    path: '/mobile/patient/progress'
  },
  {
    id: 'settings',
    label: 'Mais',
    icon: Settings,
    path: '/mobile/patient/settings'
  }
];

interface MobileTabBarProps {
  userRole: 'professional' | 'patient';
}

/**
 * Barra de navegação inferior estilo iOS
 */
export function MobileTabBar({ userRole }: MobileTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Determinar tab ativo baseado na rota atual
    const tabs = userRole === 'professional' ? PRO_TABS : PATIENT_TABS;
    const active = tabs.find(tab => location.pathname.startsWith(tab.path));
    return active?.id || tabs[0].id;
  });

  const tabs = userRole === 'professional' ? PRO_TABS : PATIENT_TABS;

  const handleTabPress = (tab: TabItem) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  return (
    <SafeAreaWrapper
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50"
      edges={['bottom']}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className="flex flex-col items-center justify-center flex-1 py-2 relative"
              style={{ minWidth: 60 }}
            >
              {/* Badge de notificações */}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-1 right-4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}

              {/* Ícone */}
              <div
                className={`transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon size={24} />
              </div>

              {/* Label */}
              <span
                className={`text-xs mt-1 transition-colors ${
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>

              {/* Indicador de tab ativa */}
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </SafeAreaWrapper>
  );
}

/**
 * Hook para usar a MobileTabBar
 */
export function useMobileTabBar(userRole: 'professional' | 'patient') {
  const tabs = userRole === 'professional' ? PRO_TABS : PATIENT_TABS;

  return {
    tabs,
    setActiveTab: (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        // Navegação deve ser feita pelo componente
        return tab.path;
      }
    }
  };
}

/**
 * Componente de layout para telas móveis com TabBar
 */
export function MobileLayout({
  userRole,
  children,
  showTabBar = true
}: {
  userRole: 'professional' | 'patient';
  children: React.ReactNode;
  showTabBar?: boolean;
}) {
  return (
    <div className="min-h-screen pb-16">
      {/* Conteúdo da tela */}
      <div className="h-full">
        {children}
      </div>

      {/* TabBar */}
      {showTabBar && <MobileTabBar userRole={userRole} />}
    </div>
  );
}
