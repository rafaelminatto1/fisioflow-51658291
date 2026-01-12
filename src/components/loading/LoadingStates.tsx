import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

/**
 * Spinner de carregamento com diferentes tamanhos
 */
export function LoadingSpinner({
  size = 'md',
  className,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

interface LoadingScreenProps {
  text?: string;
  subtext?: string;
  progress?: number;
}

/**
 * Tela de carregamento em tela cheia
 */
export function LoadingScreen({ text, subtext, progress }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8">
        <LoadingSpinner size="xl" />
        <div className="text-center space-y-1">
          {text && <p className="text-lg font-medium">{text}</p>}
          {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
          {progress !== undefined && (
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  rows?: number;
  className?: string;
}

/**
 * Skeleton para cards
 */
export function LoadingCard({ rows = 3, className }: LoadingCardProps) {
  return (
    <div className={cn('p-6 space-y-4', className)}>
      <div className="space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Skeleton para tabelas
 */
export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-8 bg-muted animate-pulse rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  loadingText?: string;
}

/**
 * Botão com estado de loading integrado
 */
export function LoadingButton({
  children,
  loading = false,
  disabled = false,
  className,
  loadingText = 'Carregando...',
  ...props
}: LoadingButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled || loading}
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}

import { ReactNode } from 'react';

interface LoadingProps {
  children: ReactNode;
  fallback?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

/**
 * Wrapper que mostra loading enquanto conteúdo carrega
 */
export function WithLoading({
  children,
  fallback,
  size = 'md',
  text,
}: LoadingProps) {
  return (
    <>
      {fallback || (
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner size={size} text={text} />
        </div>
      )}
      {children}
    </>
  );
}

/**
 * Skeleton para avatar
 */
export function LoadingAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('rounded-full bg-muted animate-pulse', sizeClasses[size])} />
  );
}

/**
 * Skeleton para lista de itens
 */
export function LoadingList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <LoadingAvatar size="md" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para gráficos
 */
export function LoadingChart({ height = 200 }: { height?: number }) {
  return (
    <div
      className="w-full bg-muted animate-pulse rounded-lg"
      style={{ height: `${height}px` }}
    />
  );
}

/**
 * Skeleton para estatísticas
 */
export function LoadingStats({ items = 4 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Componente de loading para sobreposições (overlay)
 */
export function LoadingOverlay({
  show,
  text,
}: {
  show: boolean;
  text?: string;
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}

/**
 * Loading pulsante para conteúdo
 */
export function PulseLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
      </div>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

/**
 * Barra de progresso de loading
 */
export function LoadingBar({ progress, text }: { progress: number; text?: string }) {
  return (
    <div className="w-full space-y-2">
      {text && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{text}</span>
          <span className="font-medium">{progress}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton para formulários
 */
export function LoadingForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      ))}
      <div className="h-10 bg-muted animate-pulse rounded w-1/3" />
    </div>
  );
}
