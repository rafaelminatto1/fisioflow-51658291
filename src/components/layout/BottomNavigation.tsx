import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  DollarSign,
  Plus
} from 'lucide-react';
import { memo } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Início', href: '/' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Dumbbell, label: 'Exercícios', href: '/exercises' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
];

export const BottomNavigation = memo(function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-border/50 px-2 sm:px-4 py-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-inset-bottom">
      <div className="flex items-center justify-between max-w-md mx-auto px-2">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-[60px] sm:w-16 touch-target transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 active:scale-95"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center transition-all duration-200",
                isActive && "bg-primary/10 rounded-xl p-1.5"
              )}>
                <Icon className={cn(
                  "w-6 h-6 transition-all",
                  isActive && "scale-110"
                )} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Central Add Button - Otimizado para touch */}
        <button
          onClick={() => navigate('/schedule')}
          className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-14 bg-gradient-to-br from-primary to-primary-hover text-white rounded-2xl shadow-lg shadow-primary/30 -mt-6 border-4 border-white dark:border-background-dark hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-200 touch-target"
          aria-label="Novo agendamento"
        >
          <Plus className="w-7 h-7 sm:w-6 sm:h-6" />
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-[60px] sm:w-16 touch-target transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 active:scale-95"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center transition-all duration-200",
                isActive && "bg-primary/10 rounded-xl p-1.5"
              )}>
                <Icon className={cn(
                  "w-6 h-6 transition-all",
                  isActive && "scale-110"
                )} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
