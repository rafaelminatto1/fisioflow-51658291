import { useState } from "react";
import { Activity, Calendar, Clock, DollarSign, List, Settings2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { useAnalyticsSummary } from "@/hooks/useAnalyticsSummary";
import { cn } from "@/lib/utils";

const widgetIcons = {
  "appointments-today": Calendar,
  "revenue-month": DollarSign,
  "patients-active": Users,
  "ocupancy-rate": Activity,
  "pending-payments": DollarSign,
  "waitlist-count": Clock,
  "upcoming-appointments": Calendar,
  "recent-patients": List,
};

const widgetLabels = {
  small: "Compacto",
  medium: "Largo",
  large: "Destaque",
};

export function CustomizableDashboard() {
  const { widgets, toggleWidget, updateWidgetSize, resetToDefault } = useDashboardWidgets();
  const { summary, isLoading } = useAnalyticsSummary();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const visibleWidgets = widgets
    .filter((widget) => widget.visible && typeof widget.position === "number")
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const getWidgetData = (type: string) => {
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
      case "appointments-today":
        return {
          value: isLoading ? "..." : safeSummary.totalAppointments,
          description: isLoading
            ? "Carregando..."
            : `${safeSummary.appointmentGrowth}% vs. mes anterior`,
        };
      case "revenue-month":
        return {
          value: isLoading
            ? "..."
            : `R$ ${safeSummary.monthlyRevenue.toFixed(2).replace(".", ",")}`,
          description: isLoading
            ? "Carregando..."
            : `${safeSummary.revenueGrowth}% vs. mes anterior`,
        };
      case "patients-active":
        return {
          value: isLoading ? "..." : safeSummary.activePatients,
          description: isLoading
            ? "Carregando..."
            : `${safeSummary.patientGrowth}% vs. mes anterior`,
        };
      case "ocupancy-rate":
        return {
          value: isLoading ? "..." : `${safeSummary.occupancyRate}%`,
          description: isLoading ? "Carregando..." : "Capacidade utilizada",
        };
      default:
        return { value: "N/A", description: "Sem dados" };
    }
  };

  return (
    <Card className="overflow-hidden rounded-[2rem] border-border/60 bg-background/75 shadow-sm backdrop-blur-xl">
      <CardHeader className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.72))] px-5 py-5 dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.7))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">
              Painel sintetico
            </p>
            <CardTitle className="mt-1 text-xl font-semibold tracking-tight">
              Dashboard personalizado
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              KPIs essenciais antes do bloco analitico principal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
              {visibleWidgets.length} widgets ativos
            </Badge>
            <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 gap-2 rounded-2xl border-border/60 bg-background/80 font-semibold hover:border-primary/35 hover:text-primary"
                >
                  <Settings2 className="h-4 w-4" />
                  Personalizar
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto md:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Personalizar Dashboard</DialogTitle>
                  <DialogDescription>
                    Escolha os widgets visiveis e defina o peso visual de cada um.
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto">
                  {widgets.map((widget) => {
                    const Icon = widgetIcons[widget.type] || Activity;

                    return (
                      <div
                        key={widget.id}
                        className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor={`widget-${widget.id}`} className="font-semibold">
                              {widget.title}
                            </Label>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Visualizacao {widgetLabels[widget.size]}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Select
                            value={widget.size}
                            onValueChange={(value: "small" | "medium" | "large") =>
                              updateWidgetSize(widget.id, value)
                            }
                            disabled={!widget.visible}
                          >
                            <SelectTrigger className="w-28 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Compacto</SelectItem>
                              <SelectItem value="medium">Largo</SelectItem>
                              <SelectItem value="large">Destaque</SelectItem>
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

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" onClick={resetToDefault}>
                    Restaurar padrao
                  </Button>
                  <Button onClick={() => setCustomizeOpen(false)}>Concluir</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {visibleWidgets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="stats-cards">
            {visibleWidgets.map((widget) => {
              const Icon = widgetIcons[widget.type] || Activity;
              const data = getWidgetData(widget.type);

              return (
                <Card
                  key={widget.id}
                  className={cn(
                    "rounded-[1.75rem] border-border/60 bg-background/85 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md",
                    widget.size === "medium" && "sm:col-span-2",
                    widget.size === "large" && "sm:col-span-2 xl:col-span-4",
                  )}
                >
                  <CardHeader className="space-y-3 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge
                        variant="outline"
                        className="border-border/60 bg-background/80 text-muted-foreground"
                      >
                        {widgetLabels[widget.size]}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold leading-5 text-foreground">
                      {widget.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {data.value}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {data.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-[1.75rem] border-dashed border-border/70 bg-background/60 p-10 shadow-none">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Settings2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum widget ativo</h3>
              <p className="text-sm text-muted-foreground">
                Abra a personalizacao para adicionar os widgets mais relevantes ao seu dashboard.
              </p>
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
