/**
 * Mobile Navigation - Bottom Tab Bar
 *
 * Navegação inferior otimizada para mobile com touch-friendly targets
 *
 * @module components/mobile/BottomNav
 */

import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  Users,
  FileText,
  Settings,
  Activity,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: <Home className="w-5 h-5" />,
    path: '/',
  },
  {
    id: 'calendar',
    label: 'Agenda',
    icon: <Calendar className="w-5 h-5" />,
    path: '/',
  },
  {
    id: 'patients',
    label: 'Pacientes',
    icon: <Users className="w-5 h-5" />,
    path: '/patients',
  },
  {
    id: 'exercises',
    label: 'Exercícios',
    icon: <Dumbbell className="w-5 h-5" />,
    path: '/exercises',
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: <FileText className="w-5 h-5" />,
    path: '/reports',
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: <Settings className="w-5 h-5" />,
    path: '/settings',
  },
];

interface BottomNavProps {
  className?: string;
  onItemClick?: (item: NavItem) => void;
}

/**
 * Componente Bottom Navigation para Mobile
 */
export function BottomNav({ className, onItemClick }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  // Determinar tab ativa baseado na URL
  React.useEffect(() => {
    const activeItem = NAV_ITEMS.find(item => location.pathname === item.path);
    if (activeItem) {
      setActiveTab(activeItem.id);
    }
  }, [location.pathname]);

  const handleTabPress = useCallback((item: NavItem) => () => {
    setActiveTab(item.id);
    navigate(item.path);
    onItemClick?.(item);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [navigate, onItemClick]);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-background border-t border-border',
        'safe-area-inset-bottom z-50',
        'md:hidden', // Apenas mobile
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          const showBadge = item.badge && item.badge > 0;

          return (
            <button
              key={item.id}
              onClick={handleTabPress(item)}
              disabled={item.disabled}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[64px] max-w-[80px]',
                'py-2 px-1 rounded-lg transition-all duration-200',
                'touch-target',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted active:scale-95',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                    <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                      {item.badge}
                    </span>
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium truncate mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Botão flutuante para ação rápida (ex: adicionar) */}
      <QuickActionButton />
    </nav>
  );
}

/**
 * Botão de ação rápida flutuante
 */
function QuickActionButton() {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = useCallback(() => {
    setIsPressed(true);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }

    // Abrir modal ou ação rápida
    navigate('/patients/new');

    setTimeout(() => setIsPressed(false), 200);
  }, [navigate]);

  return (
    <button
      onClick={handlePress}
      className={cn(
        'absolute -top-6 right-4',
        'w-14 h-14 rounded-full',
        'bg-gradient-primary text-primary-foreground',
        'shadow-lg shadow-primary/50',
        'flex items-center justify-center',
        'touch-target',
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'border-4 border-background',
        isPressed && 'scale-95'
      )}
      aria-label="Novo agendamento"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M12 4v16m8 0H4m8 0l8 0m0-16v16m0 0h8"
        />
      </svg>
    </button>
  );
}

/**
 * Header compacto para mobile com back button
 */
interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  action,
}: MobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [navigate, onBack]);

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="touch-target p-2 -ml-2 rounded-lg hover:bg-muted active:scale-95 transition-all"
            aria-label="Voltar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7 7"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 12h8"
              />
            </svg>
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {action && (
          <div className="flex items-center">{action}</div>
        )}
      </div>
    </header>
  );
}

/**
 * Bottom Sheet para ações contextuais (mobile)
 */
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Fechar ao pressionar Escape
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevenir scroll no body quando aberto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0',
          'bg-background rounded-t-2xl shadow-2xl',
          'z-50',
          'animate-in slide-in-from-bottom',
          'max-h-[80vh] overflow-auto',
          'safe-area-inset-bottom-16'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle para arrastar (indicador visual) */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {title && (
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          </div>
        )}

        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Botão touch-friendly com feedback visual e tátil
 */
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  haptic?: boolean;
}

export function TouchButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  haptic = true,
  children,
  className,
  disabled,
  ...props
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    setIsPressed(true);
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [haptic]);

  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const baseStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: 'bg-gradient-primary text-primary-foreground hover:shadow-medical active:scale-95',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95',
    ghost: 'hover:bg-muted active:bg-muted active:scale-95',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center',
        'gap-2',
        'font-medium rounded-xl',
        'transition-all duration-150',
        'touch-target',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        baseStyles[size],
        variantStyles[variant],
        isPressed && 'scale-95',
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8 8 0 000 8 0 0 0008 0 0 0004 4"
            />
          </svg>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Swipe Action Item para listas (mobile)
 */
interface SwipeActionItemProps {
  children: React.ReactNode;
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    color: string;
    action: () => void;
  }>;
}

export function SwipeActionItem({ children, actions }: SwipeActionItemProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const touchStartX = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const actionWidth = 80; // pixels
  const totalSwipeWidth = actions.length * actionWidth;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    const containerWidth = containerRef.current.offsetWidth;

    // Calcular progress (0 a 1)
    const progress = Math.max(0, Math.min(1, -diff / (containerWidth * 0.7)));
    setSwipeProgress(progress);

    // Determinar qual ação está ativa
    if (progress > 0) {
      const index = Math.min(Math.floor(progress / (1 / actions.length)), actions.length - 1);
      setActiveActionIndex(index);
    } else {
      setActiveActionIndex(null);
    }
  }, [actions.length]);

  const handleTouchEnd = useCallback(() => {
    if (activeActionIndex !== null && swipeProgress > 0.3) {
      // Executar ação
      actions[activeActionIndex].action();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    }

    setSwipeProgress(0);
    setActiveActionIndex(null);
  }, [activeActionIndex, swipeProgress, actions]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Indicadores de ação */}
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action, index) => (
          <div
            key={index}
            className="h-full flex items-center justify-center transition-all"
            style={{
              backgroundColor: action.color,
              width: activeActionIndex === index ? `${swipeProgress * 100}%` : '0px',
              opacity: activeActionIndex === index ? 1 : 0,
              transform: `translateX(${activeActionIndex === index ? (swipeProgress > 0.3 ? 0 : '100%') : 0}%)`,
            }}
          >
            {action.icon}
            <span className="text-xs font-medium ml-2">{action.label}</span>
          </div>
        ))}
      </div>

      {/* Conteúdo */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateX(${swipeProgress * totalSwipeWidth * -1}px)`,
        }}
      >
        {children}
      </div>
    </div  );
}
