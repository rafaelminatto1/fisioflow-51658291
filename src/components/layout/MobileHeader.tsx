/**
 * Mobile Header - Migrated to Firebase
 */

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getFirebaseAuth } from '@/integrations/firebase/app';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import fisioflowLogo from '@/assets/logo.avif';
import {

  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  DollarSign,
  BarChart3,
  Settings,
  Brain,
  MessageSquare,
  ShoppingCart,
  LogOut,
  LayoutGrid,
  Sparkles,
  Mail,
  BookOpen,
  FlaskConical,
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Calendar, label: 'Agenda', href: '/' },
  { icon: Activity, label: 'Exercícios', href: '/exercises' },
  { icon: Brain, label: 'Planos IA', href: '/smart-ai' },
  { icon: MessageSquare, label: 'Comunicação', href: '/communications' },
  { icon: LayoutGrid, label: 'Tarefas', href: '/tarefas' },
  { icon: Sparkles, label: 'Tarefas V2', href: '/tarefas-v2' },
  { icon: Calendar, label: 'Eventos', href: '/eventos' },
  { icon: ShoppingCart, label: 'Treinos', href: '/vouchers' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
  { icon: Mail, label: 'CRM', href: '/crm' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
  { icon: BookOpen, label: 'Wiki', href: '/wiki' },
  { icon: FlaskConical, label: 'Testes Clínicos', href: '/clinical-tests' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      toast({
        title: 'Logout realizado',
        description: 'Até breve!',
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Erro ao sair',
        description: error?.message || 'Ocorreu um erro',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl shadow-sm safe-area-inset-top transition-all duration-300">
      <div className="flex items-center justify-between h-full px-4">
        {/* Menu Hambúrguer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800 touch-target h-10 w-10 rounded-xl transition-all active:scale-95" aria-label="Abrir menu" data-testid="mobile-menu">
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Header do Menu */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30">
                <Link to="/" className="flex items-center gap-3 active:scale-95 transition-transform">
                  <img src={fisioflowLogo} alt="FisioFlow" className="h-9 w-auto" />
                </Link>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <SheetTrigger key={item.href} asChild>
                      <Link to={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start transition-all duration-300 h-12 rounded-xl touch-target",
                            isActive
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 font-bold"
                              : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <Icon className={cn(
                            "w-5 h-5 mr-3 transition-transform duration-300",
                            isActive ? "scale-110" : ""
                          )} />
                          <span className="text-sm">{item.label}</span>
                        </Button>
                      </Link>
                    </SheetTrigger>
                  );
                })}
              </nav>

              {/* Footer com Perfil e Logout */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 space-y-3 bg-slate-50/30 dark:bg-slate-900/20">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner-border">
                    <span className="text-primary font-black text-sm">JS</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">Dr. João Silva</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fisioterapeuta</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  aria-label="Sair da conta (logout)"
                  className="w-full justify-start hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 h-12 rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  <span className="font-bold text-sm">Encerrar Sessão</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
          <img src={fisioflowLogo} alt="FisioFlow" className="h-7 w-auto" />
        </Link>

        {/* Notificações */}
        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
