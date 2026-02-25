/**
 * MainLayout - Migrated to Firebase
 */

import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
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
  Bell,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
  fullWidth?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  noPadding?: boolean;
  compactPadding?: boolean;
  customHeader?: React.ReactNode;
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
    <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-950" data-testid="main-layout">
      {/* Skip Links for Accessibility */}
      <SkipLinks />

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Header Mobile */}
      <MobileHeader />

      {/* Sidebar - Hidden on mobile */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden relative">
        {/* Decorative background for the whole content area */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-accent/5 to-background pointer-events-none" />

        {/* Header Desktop */}
        {customHeader ? (
          customHeader
        ) : !hideDefaultHeader && (
          <header className="hidden md:flex h-16 bg-white/40 dark:bg-slate-900/40 border-b border-border/40 items-center justify-between px-6 backdrop-blur-xl sticky top-0 z-40 transition-all duration-500" data-testid="main-header">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-border/50">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">
                    Real-time Active
                  </span>
               </div>
               
               <div className="h-4 w-px bg-border/40" />
               
               {showBreadcrumbs && (
                  <div className="animate-fade-in">
                    <PageBreadcrumbs customLabels={customBreadcrumbLabels} />
                  </div>
               )}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group">
                <GlobalSearch />
              </div>

              <div className="h-6 w-px bg-border/40 mx-2" />

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-slate-500 hover:text-primary transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
                </Button>
                
                <OnlineUsersIndicator />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 h-11 pl-1 pr-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all rounded-full border border-border/40 group"
                    data-testid="user-menu"
                  >
                    {loading ? (
                      <Skeleton className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="relative">
                        <Avatar className="w-8 h-8 ring-2 ring-white dark:ring-slate-800 shadow-premium-sm group-hover:scale-105 transition-transform duration-300">
                          <AvatarImage src={profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-slate-900 to-slate-800 text-white font-black text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></span>
                      </div>
                    )}
                    <div className="hidden lg:flex flex-col items-start text-left">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                        {loading ? '...' : displayName}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        {profile?.role || 'User'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-border/40 shadow-premium-lg rounded-3xl animate-scale-in mt-2">
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Sessão Ativa</DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem asChild className="rounded-2xl px-4 py-3 hover:bg-primary/5 hover:text-primary cursor-pointer transition-all duration-300 focus:bg-primary/5 focus:text-primary group">
                    <Link to="/profile" className="flex items-center w-full">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl mr-3 group-hover:bg-primary/10 transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-2xl px-4 py-3 hover:bg-primary/5 hover:text-primary cursor-pointer transition-all duration-300 focus:bg-primary/5 focus:text-primary group">
                    <Link to="/settings" className="flex items-center w-full">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl mr-3 group-hover:bg-primary/10 transition-colors">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-2xl px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-all duration-300 focus:bg-red-50 focus:text-red-500 group"
                  >
                    <div className="p-2 bg-red-50 dark:bg-red-950/10 rounded-xl mr-3 group-hover:bg-red-100 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm">Encerrar Sessão</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          aria-label="Conteúdo principal"
          className={cn(
            "flex-1 relative z-10",
            noPadding
              ? "pt-[60px] md:pt-0 pb-24 md:pb-0"
              : compactPadding
                ? "p-2 xs:p-3 sm:p-3 md:p-4 pt-[60px] md:pt-4 pb-24 md:pb-4"
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
            !fullWidth && !maxWidth && "max-w-full"
          )}>
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
