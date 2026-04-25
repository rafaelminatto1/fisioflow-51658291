import { ArrowUpRight, Stethoscope } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSmartDashboardData } from "@/hooks/useSmartDashboard";
import { BentoDashboard } from "@/components/dashboard/BentoDashboard";
import { cn } from "@/lib/utils";

type ViewMode = "today" | "week";

export function SmartDashboardContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get("view") || "today") as ViewMode;
  const { data } = useSmartDashboardData(viewMode);
  const { medicalReturnsUpcoming = [] } = data;
  const navigate = useNavigate();

  const handleViewModeChange = (mode: ViewMode) => {
    setSearchParams({ view: mode }, { replace: true });
  };

  return (
    <div className="space-y-5 pb-20 w-full" data-testid="smart-dashboard-page">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center bg-secondary/30 p-1 rounded-2xl border border-border/50 shadow-inner">
          {(["today", "week"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange(mode)}
              className={cn(
                "rounded-xl px-5 text-[10px] font-black uppercase tracking-widest h-8 transition-all duration-300 font-display",
                viewMode === mode && "shadow-lg scale-105",
              )}
            >
              {mode === "today" ? "Hoje" : "Semana"}
            </Button>
          ))}
        </div>
      </div>

      {/* Medical Returns Alert */}
      {medicalReturnsUpcoming.length > 0 && (
        <div
          className="bg-gradient-to-r from-blue-600/10 via-primary/5 to-transparent border-l-4 border-l-primary rounded-r-2xl p-4 flex items-center gap-5 group cursor-pointer hover:bg-primary/10 transition-all duration-300"
          onClick={() => navigate("/relatorios/medico")}
        >
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-sm text-foreground flex items-center gap-2 font-display">
              Preparar Relatórios Médicos
              <Badge className="bg-primary text-white text-[10px] px-1.5 py-0 border-0 font-display">
                {medicalReturnsUpcoming.length}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground font-medium truncate">
              {medicalReturnsUpcoming.length} pacientes possuem retornos médicos nos próximos 14
              dias.
              <span className="text-primary ml-1 font-bold">Gerar documentação agora</span>
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors mr-2" />
        </div>
      )}

      <BentoDashboard viewMode={viewMode} />
    </div>
  );
}
