/**
 * MainLayout - Migrated to Firebase
 */

import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SkipLinks } from '@/components/accessibility/SkipLinks';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GlobalSearch } from '@/components/eventos/GlobalSearch';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from '@/components/ui/skeleton';
import {

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import fisioflowLogo from '@/assets/logo.avif';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/integrations/firebase/app';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
  customBreadcrumbLabels?: Record<string, string>;
  /** Remove max-width constraint for full-width layouts like Agenda */
  fullWidth?: boolean;
  /** Control max-width granularity: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full' */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  /** Remove all main content padding for flush full-width layouts */
  noPadding?: boolean;
  /** Use reduced padding (16px on desktop) for pages that need more horizontal space */
  compactPadding?: boolean;
  /** Custom header component to replace default header */
  customHeader?: React.ReactNode;
  /** Hide default header */
  hideDefaultHeader?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showBreadcrumbs = true,
  customBreadcrumbLabels,
  fullWidth = false,
  maxWidth,
  noPadding = false,
  compactPadding = false,
  customHeader,
  hideDefaultHeader = false,
}) => {
  const { profile, loading, getDisplayName, getInitials } = useUserProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(getFirebaseAuth());
      toast({
        title: 'Sessão encerrada',
        description: 'Você foi desconectado com sucesso.',
      });
      navigate('/auth');
    } catch {
      toast({
        title: 'Erro ao sair',
        description: 'Não foi possível encerrar a sessão.',
        variant: 'destructive',
      });
    }
  };

  const displayName = getDisplayName();
  const initials = getInitials();

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background" data-testid="main-layout">
      {/* Skip Links for Accessibility */}
      <SkipLinks />

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Header Mobile */}
      <MobileHeader />

      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden transition-all duration-300 ease-in-out pl-0 md:pl-0 lg:pl-0"> {/* Adjusted for sidebar if needed, but sidebar is likely fixed or unrelated to this flex container's padding if handled by Sidebar component internally */}
        {/* Header Desktop */}
        {customHeader ? (
          customHeader
        ) : !hideDefaultHeader && (
          <header className="hidden md:flex h-11 bg-white/80 dark:bg-background-dark/80 border-b border-gray-200/50 dark:border-gray-800/50 items-center justify-between px-3.5 shadow-sm backdrop-blur-xl sticky top-0 z-40 transition-all duration-300" data-testid="main-header">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <img src={fisioflowLogo} alt="FisioFlow" className="h-5 w-auto" />
                </Link>
              </div>

              {/* Breadcrumbs can go here or be below */}
            </div>

            <div className="flex items-center gap-2.5">
              <GlobalSearch />

              <div className="h-3.5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />

              {/* Indicador de usuários online */}
              <OnlineUsersIndicator />

              <div className="flex items-center gap-2.5 mr-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                    Conectado - dados em tempo real
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-7.5 px-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all rounded-full border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    data-testid="user-menu"
                  >
                    {loading ? (
                      <>
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <div className="flex flex-col items-start gap-1">
                          <Skeleton className="hidden lg:block h-3 w-20" />
                          <Skeleton className="hidden lg:block h-2 w-12" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <Avatar className="w-6 h-6 ring-2 ring-white dark:ring-gray-800 shadow-sm">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-gray-900 rounded-full"></span>
                        </div>
                        <div className="hidden lg:flex flex-col items-start text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-200 leading-none">{displayName}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-500 font-medium">{profile?.role || 'Fisioterapeuta'}</span>
                        </div>
                      </>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 shadow-xl rounded-2xl animate-scale-in">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-gray-100 dark:bg-gray-800" />
                  <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors focus:bg-primary/5 focus:text-primary">
                    <Link to="/profile" data-testid="user-menu-profile">
                      <User className="w-4 h-4 mr-3" />
                      <span className="font-medium">Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors focus:bg-primary/5 focus:text-primary">
                    <Link to="/settings" data-testid="user-menu-settings">
                      <Settings className="w-4 h-4 mr-3" />
                      <span className="font-medium">Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-gray-100 dark:bg-gray-800" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl px-3 py-2.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 cursor-pointer transition-colors focus:bg-red-50 focus:text-red-600"
                    data-testid="user-menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span className="font-medium">Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {/* Main Content - Com padding para mobile header e bottom navigation - Otimizado para iPhone/iPad */}
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          aria-label="Conteúdo principal"
          data-testid="main-content"
          className={cn(
            "flex-1 bg-gray-50/50 dark:bg-background/50",
            noPadding
              ? "pt-[60px] md:pt-0 pb-24 md:pb-0"
              : compactPadding
                ? "p-2 xs:p-3 sm:p-3 md:p-4 pt-[60px] md:pt-4 pb-24 md:pb-4"
                : "p-2 xs:p-3 sm:p-4 md:p-6 pt-[60px] md:pt-6 pb-24 md:pb-6"
          )}
        >
          <div className={cn(
            "mx-auto transition-all duration-300 w-full",
            fullWidth && "px-0",
            maxWidth === 'sm' && "max-w-sm",
            maxWidth === 'md' && "max-w-md",
            maxWidth === 'lg' && "max-w-lg",
            maxWidth === 'xl' && "max-w-xl",
            maxWidth === '2xl' && "max-w-2xl",
            maxWidth === '7xl' && "max-w-7xl",
            maxWidth === 'full' && "max-w-full",
            !fullWidth && !maxWidth && "max-w-full"
          )}>
            {showBreadcrumbs && (
              <div className="mb-6 animate-fade-in">
                <PageBreadcrumbs customLabels={customBreadcrumbLabels} />
              </div>
            )}
            <div className="animate-slide-up-fade">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile only */}
      <BottomNavigation />
    </div>
  );
};

export default MainLayout;
