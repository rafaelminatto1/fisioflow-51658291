import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavPreload } from '@/hooks/useIntelligentPreload';
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
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  FileText,
  Brain,
  MessageSquare,
  ShoppingCart,
  Clock,
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
  { icon: Clock, label: 'Lista de Espera', href: '/waitlist' },
  { icon: Calendar, label: 'Eventos', href: '/eventos' },
  { icon: ShoppingCart, label: 'Treinos', href: '/vouchers' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  useNavPreload();

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
    <div className={cn(
      "hidden md:flex bg-card border-r border-border/50 transition-all duration-300 flex-col h-screen sticky top-0 shadow-sm",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">FisioFlow</h1>
                <p className="text-xs text-muted-foreground font-medium">Gestão Inteligente</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm mx-auto">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("hover:bg-secondary transition-colors", !collapsed && "ml-auto")}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group relative",
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                !isActive && "group-hover:scale-110"
              )} />
              {!collapsed && <span className="text-sm">{item.label}</span>}
              {collapsed && isActive && (
                <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 px-4 py-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </div>
    </div>
  );
}