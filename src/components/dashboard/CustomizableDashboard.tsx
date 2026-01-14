import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { Settings2, Calendar, DollarSign, Users, Activity, Clock, List } from 'lucide-react';
import { cn } from '@/lib/utils';

const widgetIcons = {
  'appointments-today': Calendar,
  'revenue-month': DollarSign,
  'patients-active': Users,
  'ocupancy-rate': Activity,
  'pending-payments': DollarSign,
  'waitlist-count': Clock,
  'upcoming-appointments': Calendar,
  'recent-patients': List,
};

export function CustomizableDashboard() {
  const { widgets, toggleWidget, updateWidgetSize, resetToDefault } = useDashboardWidgets();
  const { summary, isLoading } = useAnalyticsSummary();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const visibleWidgets = widgets
    .filter(w => w.visible && typeof w.position === 'number')
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const getWidgetData = (type: string) => {
    // Sempre retornar valores válidos, mesmo durante carregamento
    const safeSummary = summary || {
      totalAppointments: 0,
      appointmentGrowth: 0,
      activePatients: 0,
      patientGrowth: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      occupancyRate: 0,
    };

    switch (type) {
      case 'appointments-today':
        return {
          value: isLoading ? '...' : safeSummary.totalAppointments,
          description: isLoading
            ? 'Carregando...'
            : `${safeSummary.appointmentGrowth}% vs. mês anterior`,
        };
      case 'revenue-month':
        return {
          value: isLoading
            ? '...'
            : `R$ ${safeSummary.monthlyRevenue.toFixed(2).replace('.', ',')}`,
          description: isLoading
            ? 'Carregando...'
            : `${safeSummary.revenueGrowth}% vs. mês anterior`,
        };
      case 'patients-active':
        return {
          value: isLoading ? '...' : safeSummary.activePatients,
          description: isLoading
            ? 'Carregando...'
            : `${safeSummary.patientGrowth}% vs. mês anterior`,
        };
      case 'ocupancy-rate':
        return {
          value: isLoading ? '...' : `${safeSummary.occupancyRate}%`,
          description: isLoading ? 'Carregando...' : 'Capacidade utilizada',
        };
      default:
        return { value: 'N/A', description: 'Sem dados' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Personalizado</h2>
          <p className="text-muted-foreground">Configure seus widgets favoritos</p>
        </div>
        <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Personalizar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalizar Dashboard</DialogTitle>
              <DialogDescription>
                Configure quais widgets você deseja visualizar e seu tamanho
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {widgets.map(widget => {
                const Icon = widgetIcons[widget.type] || Activity;
                return (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <Label htmlFor={`widget-${widget.id}`} className="font-medium">
                          {widget.title}
                        </Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={widget.size}
                        onValueChange={(value: "small" | "medium" | "large") => updateWidgetSize(widget.id, value)}
                        disabled={!widget.visible}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                      <Switch
                        id={`widget-${widget.id}`}
                        checked={widget.visible}
                        onCheckedChange={() => toggleWidget(widget.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetToDefault}>
                Restaurar Padrão
              </Button>
              <Button onClick={() => setCustomizeOpen(false)}>Concluir</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visibleWidgets.map(widget => {
          const Icon = widgetIcons[widget.type] || Activity;
          const data = getWidgetData(widget.type);

          return (
            <Card
              key={widget.id}
              className={cn(
                'transition-all hover:shadow-md',
                widget.size === 'medium' && 'md:col-span-2',
                widget.size === 'large' && 'md:col-span-2 lg:col-span-4'
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {widget.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visibleWidgets.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <Settings2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Nenhum widget ativo</h3>
            <p className="text-sm text-muted-foreground">
              Clique em "Personalizar" para adicionar widgets ao seu dashboard
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
