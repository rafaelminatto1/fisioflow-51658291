import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Dumbbell,
  DollarSign,
  Plus
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
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-background-dark/95 border-t border-border px-6 py-2 pb-5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-inset-bottom">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 w-12 transition-colors",
                isActive ? "text-primary" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              <Icon className={cn(
                "w-6 h-6",
                isActive && "fill-primary"
              )} />
              <span className="text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Central Add Button */}
        <button
          onClick={() => navigate('/schedule')}
          className="flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full shadow-lg shadow-primary/30 -mt-8 border-4 border-white dark:border-background-dark hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-6 h-6" />
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
                "flex flex-col items-center gap-1 w-12 transition-colors",
                isActive ? "text-primary" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              <Icon className={cn(
                "w-6 h-6",
                isActive && "fill-primary"
              )} />
              <span className="text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
