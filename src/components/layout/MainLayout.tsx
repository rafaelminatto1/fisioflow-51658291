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
  LogOut,
  Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
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
          <header className="hidden md:flex h-16 bg-white/80 dark:bg-background-dark/80 border-b border-gray-200/50 dark:border-gray-800/50 items-center justify-between px-6 shadow-sm backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform transition-transform hover:scale-105 active:scale-95 duration-200">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
                  FisioFlow
                </h2>
              </div>

              {/* Breadcrumbs can go here or be below */}
            </div>

            <div className="flex items-center gap-5">
              <GlobalSearch />

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

              {/* Indicador de usuários online */}
              <OnlineUsersIndicator />

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 h-10 px-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all rounded-full border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    data-testid="user-menu"
                  >
                    {loading ? (
                      <>
                        <Skeleton className="w-9 h-9 rounded-full" />
                        <div className="flex flex-col items-start gap-1">
                          <Skeleton className="hidden lg:block h-3 w-20" />
                          <Skeleton className="hidden lg:block h-2 w-12" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <Avatar className="w-9 h-9 ring-2 ring-white dark:ring-gray-800 shadow-sm">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                        </div>
                        <div className="hidden lg:flex flex-col items-start text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-200 leading-none">{displayName}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-500 font-medium">{profile?.role || 'Fisioterapeuta'}</span>
                        </div>
                      </>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 shadow-xl rounded-2xl animate-scale-in">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-gray-100 dark:bg-gray-800" />
                  <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors focus:bg-primary/5 focus:text-primary">
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-3" />
                      <span className="font-medium">Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors focus:bg-primary/5 focus:text-primary">
                    <Link to="/settings">
                      <Settings className="w-4 h-4 mr-3" />
                      <span className="font-medium">Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-gray-100 dark:bg-gray-800" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl px-3 py-2.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 cursor-pointer transition-colors focus:bg-red-50 focus:text-red-600"
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
          tabIndex={-1}
          aria-label="Conteúdo principal"
          className={cn(
            "flex-1 bg-gray-50/50 dark:bg-background/50",
            noPadding
              ? "pt-[60px] md:pt-0 pb-24 md:pb-0"
              : "p-3 xs:p-4 sm:p-6 md:p-8 pt-[60px] md:pt-8 pb-24 md:pb-8"
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
            !fullWidth && !maxWidth && "max-w-7xl"
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