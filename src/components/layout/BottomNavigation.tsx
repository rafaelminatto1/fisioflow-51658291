import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Activity 
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Calendar, label: 'Agenda', href: '/schedule' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Activity, label: 'Exercícios', href: '/exercises' },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-card border-t border-border/50 backdrop-blur-lg shadow-medical">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
                "hover:bg-accent/50 rounded-lg",
                isActive && "text-primary"
              )}
            >
              <div className={cn(
                "relative p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-gradient-primary shadow-medical" : "bg-transparent"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
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
