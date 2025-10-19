import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Bell, Stethoscope } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Activity, 
  DollarSign, 
  BarChart3, 
  Settings,
  FileText,
  Brain,
  MessageSquare,
  ShoppingCart,
  LogOut
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Calendar, label: 'Agenda', href: '/schedule' },
  { icon: Activity, label: 'Exercícios', href: '/exercises' },
  { icon: FileText, label: 'Prontuário', href: '/medical-record' },
  { icon: Brain, label: 'Planos IA', href: '/smart-ai' },
  { icon: MessageSquare, label: 'Comunicação', href: '/communications' },
  { icon: Calendar, label: 'Eventos', href: '/eventos' },
  { icon: ShoppingCart, label: 'Treinos', href: '/vouchers' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logout realizado',
        description: 'Até breve!',
      });
      navigate('/auth');
    }
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gradient-card border-b border-border/50 backdrop-blur-lg shadow-card">
      <div className="flex items-center justify-between h-full px-4">
        {/* Menu Hambúrguer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent/80">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-gradient-to-b from-card to-card/80">
            {/* Header do Menu */}
            <div className="p-4 border-b border-border/50 bg-gradient-card/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical">
                  <Stethoscope className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-base bg-gradient-primary bg-clip-text text-transparent">FisioFlow</h2>
                  <p className="text-xs text-muted-foreground font-medium">Sistema de Gestão</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <SheetTrigger key={item.href} asChild>
                    <Link to={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start transition-all duration-300",
                          isActive 
                            ? "bg-gradient-primary text-primary-foreground shadow-medical" 
                            : "hover:bg-accent/80"
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5 mr-3",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                        <span className="font-medium">{item.label}</span>
                      </Button>
                    </Link>
                  </SheetTrigger>
                );
              })}
            </nav>

            {/* Footer com Perfil e Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-gradient-card/80 backdrop-blur-sm space-y-2">
              <div className="bg-gradient-card p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-secondary-foreground font-bold">JS</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Dr. João Silva</p>
                    <p className="text-xs text-muted-foreground">Fisioterapeuta</p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Sair</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-medical">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-bold bg-gradient-primary bg-clip-text text-transparent">
            FisioFlow
          </h1>
        </div>

        {/* Notificações */}
        <Button variant="ghost" size="icon" className="hover:bg-accent/80">
          <Bell className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
