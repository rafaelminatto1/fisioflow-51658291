import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavPreload } from '@/hooks/useIntelligentPreload';
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
  ShoppingCart
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Calendar, label: 'Agenda', href: '/schedule' },
  { icon: Activity, label: 'Exercícios', href: '/exercises' },
  { icon: FileText, label: 'Prontuário', href: '/medical-record' },
  { icon: Brain, label: 'Planos IA', href: '/smart-ai' },
  { icon: MessageSquare, label: 'Comunicação', href: '/communications' },
  { icon: ShoppingCart, label: 'Treinos', href: '/vouchers' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  useNavPreload();

  return (
    <div className={cn(
      "bg-gradient-to-b from-card to-card/80 border-r border-border/50 transition-all duration-300 flex flex-col h-screen sticky top-0 backdrop-blur-sm shadow-card",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-card/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">FisioFlow</h1>
                <p className="text-xs text-muted-foreground font-medium">Sistema de Gestão</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical mx-auto">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("hover:bg-accent/80 transition-colors", !collapsed && "ml-auto")}
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
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-300 group relative",
                  collapsed ? "px-2 py-3" : "px-4 py-3 h-auto",
                  isActive 
                    ? "bg-gradient-primary text-primary-foreground shadow-medical hover:bg-gradient-primary/90" 
                    : "hover:bg-accent/80 hover:text-foreground",
                  !collapsed && "rounded-xl"
                )}
                size={collapsed ? "icon" : "default"}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors", 
                  !collapsed && "mr-3",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )} />
                {!collapsed && (
                  <span className={cn(
                    "font-medium transition-colors",
                    isActive ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 to-transparent rounded-xl" />
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        {!collapsed && (
          <div className="bg-gradient-card p-4 rounded-xl border border-border/50 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-secondary-foreground font-bold">JS</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Dr. João Silva</p>
                <p className="text-xs text-muted-foreground font-medium">Fisioterapeuta</p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center shadow-sm mx-auto">
            <span className="text-secondary-foreground font-bold text-sm">JS</span>
          </div>
        )}
      </div>
    </div>
  );
}