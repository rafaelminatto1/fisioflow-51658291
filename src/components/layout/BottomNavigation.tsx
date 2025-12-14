import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Dumbbell,
  DollarSign
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Início', href: '/' },
  { icon: Calendar, label: 'Agenda', href: '/schedule' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Dumbbell, label: 'Exercícios', href: '/exercises' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 border-t border-border backdrop-blur-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 touch-target",
                "active:scale-95",
                isActive && "text-primary"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-lg transition-all duration-200",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors leading-tight",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
