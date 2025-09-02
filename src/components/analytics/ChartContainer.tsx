import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  Maximize2, 
  MoreVertical, 
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  showPeriodFilter?: boolean;
  period?: string;
  onPeriodChange?: (period: string) => void;
  showExport?: boolean;
  onExport?: (format: 'pdf' | 'png' | 'excel') => void;
  onRefresh?: () => void;
  className?: string;
  insight?: string;
}

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: 'all', label: 'Todo período' }
];

export function ChartContainer({
  title,
  description,
  children,
  loading = false,
  error,
  showPeriodFilter = true,
  period = '30d',
  onPeriodChange,
  showExport = true,
  onExport,
  onRefresh,
  className,
  insight
}: ChartContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="h-6 bg-muted rounded w-32 mb-2"></div>
              <div className="h-4 bg-muted rounded w-48"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-destructive text-sm font-medium mb-2">
              Erro ao carregar dados
            </div>
            <p className="text-muted-foreground text-xs mb-4">{error}</p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      isFullscreen && "fixed inset-4 z-50 shadow-2xl",
      className
    )}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {title}
            {insight && (
              <Badge variant="secondary" className="text-xs gap-1">
                <TrendingUp className="w-3 h-3" />
                Insight
              </Badge>
            )}
          </CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {insight && (
            <p className="text-xs text-primary font-medium mt-1">{insight}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showPeriodFilter && (
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRefresh && (
                <DropdownMenuItem onClick={onRefresh} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                {isFullscreen ? 'Minimizar' : 'Tela cheia'}
              </DropdownMenuItem>
              {showExport && onExport && (
                <>
                  <DropdownMenuItem 
                    onClick={() => onExport('png')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onExport('pdf')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onExport('excel')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Excel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "transition-all duration-200",
          isFullscreen ? "h-[calc(100vh-12rem)]" : "h-80"
        )}>
          {children}
        </div>
      </CardContent>
      
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </Card>
  );
}