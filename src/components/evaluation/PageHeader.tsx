import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  stats?: {
    total?: number;
    favorites?: number;
    recentlyUsed?: number;
  };
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  stats,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {stats.total !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <span className="text-lg font-bold text-primary">📊</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold">{stats.total}</p>
              </div>
            </div>
          )}

          {stats.favorites !== undefined && stats.favorites > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500/10">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Favoritos</p>
                <p className="text-sm font-semibold">{stats.favorites}</p>
              </div>
            </div>
          )}

          {stats.recentlyUsed !== undefined && stats.recentlyUsed > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
                <span className="text-lg">📈</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Usados este mês</p>
                <p className="text-sm font-semibold">{stats.recentlyUsed}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
