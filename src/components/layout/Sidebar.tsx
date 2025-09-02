import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  { icon: Brain, label: 'Planos IA', href: '/smart-plans' },
  { icon: MessageSquare, label: 'Comunicação', href: '/communications' },
  { icon: ShoppingCart, label: 'Treinos', href: '/vouchers' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={cn(
      "bg-gradient-card border-r border-border transition-all duration-300 flex flex-col h-screen sticky top-0",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">FisioFlow</h1>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? "medical" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-200",
                  collapsed ? "px-2" : "px-3",
                  isActive && "shadow-medical"
                )}
                size={collapsed ? "icon" : "default"}
              >
                <Icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div className="bg-accent/50 p-3 rounded-lg">
            <p className="text-sm font-medium text-foreground">Dr. João Silva</p>
            <p className="text-xs text-muted-foreground">Fisioterapeuta</p>
          </div>
        )}
      </div>
    </div>
  );
}