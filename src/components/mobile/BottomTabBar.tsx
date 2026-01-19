import { Home, Users, Calendar, Dumbbell, User, LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';

export interface TabItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

const tabs: TabItem[] = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/patients', icon: Users, label: 'Pacientes' },
  { path: '/agenda', icon: Calendar, label: 'Agenda' },
  { path: '/exercises', icon: Dumbbell, label: 'Exercícios' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

/**
 * Bottom Tab Bar para navegação mobile (iOS)
 * Navegação principal fixa na parte inferior da tela
 */
export function BottomTabBar() {
  const location = useLocation();

  // Só mostra em plataformas nativas (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  // Não mostra em rotas que não deveriam ter tab bar
  const hideTabBarRoutes = ['/login', '/register', '/onboarding'];
  if (hideTabBarRoutes.some(route => location.pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 pb-safe">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path ||
            (tab.path !== '/dashboard' && location.pathname.startsWith(tab.path));

          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive: isNavActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200',
                  isNavActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
                )
              }
              end={tab.path === '/dashboard'}
            >
              <div className={cn(
                'relative transition-transform duration-200',
                isActive ? 'transform scale-110' : ''
              )}>
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all duration-200',
                    isActive && 'fill-current stroke-2 stroke-blue-500'
                  )}
                  strokeWidth={isActive ? 0 : 2}
                />

                {/* Indicator para tab ativa */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                )}
              </div>

              <span className={cn(
                'text-xs mt-1 font-medium transition-all duration-200',
                isActive ? 'text-blue-500' : 'text-gray-400'
              )}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Header para mobile que leva em conta o safe area superior
 */
export function MobileHeader({
  title,
  showBackButton = false,
  onBack,
  rightAction,
}: {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 safe-area-inset-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center flex-1">
          {showBackButton ? (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Voltar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            // Espaçador para manter título centralizado
            <div className="w-8" />
          )}
        </div>

        <h1 className="flex-1 text-center font-semibold text-gray-900 truncate px-4">
          {title}
        </h1>

        <div className="flex items-center justify-end flex-1">
          {rightAction || <div className="w-8" />}
        </div>
      </div>
    </header>
  );
}
