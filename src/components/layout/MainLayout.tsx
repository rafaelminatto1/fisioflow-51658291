import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { NotificationBell } from '@/components/notifications/NotificationBell';
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
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface MainLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
  customBreadcrumbLabels?: Record<string, string>;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children,
  showBreadcrumbs = true,
  customBreadcrumbLabels,
}) => {
  const { profile, loading, getDisplayName, getInitials } = useUserProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Sessão encerrada',
        description: 'Você foi desconectado com sucesso.',
      });
      navigate('/login');
    } catch (error) {
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
      {/* Onboarding Tour */}
      <OnboardingTour />
      
      {/* Header Mobile */}
      <MobileHeader />
      
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* Header Desktop */}
        <header className="hidden md:flex h-16 bg-gradient-card border-b border-border/50 items-center justify-between px-6 shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                FisioFlow
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <GlobalSearch />
            
            {/* Indicador de usuários online */}
            <OnlineUsersIndicator />
            
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 hover:bg-accent/80 transition-colors">
                  {loading ? (
                    <>
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="hidden lg:block h-4 w-24" />
                    </>
                  ) : (
                    <>
                      <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:block font-medium">{displayName}</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-sm border-border/50">
                <DropdownMenuLabel className="text-foreground">Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="hover:bg-accent/80 cursor-pointer">
                  <Link to="/perfil">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-accent/80 cursor-pointer">
                  <Link to="/configuracoes">
                    <Settings className="w-4 h-4 mr-2 text-primary" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="hover:bg-destructive/10 text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content - Com padding para mobile header e bottom navigation */}
        <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 pb-20 md:pb-6 overflow-visible bg-gradient-to-b from-transparent to-accent/5">
          <div className="max-w-7xl mx-auto">
            {showBreadcrumbs && <PageBreadcrumbs customLabels={customBreadcrumbLabels} />}
            {children}
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation - Mobile only */}
      <BottomNavigation />
    </div>
  );
};

export default MainLayout;