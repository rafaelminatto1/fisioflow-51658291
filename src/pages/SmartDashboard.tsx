import {
  ArrowUpRight,
  Stethoscope,
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSmartDashboardData } from "@/hooks/useSmartDashboard";
import { BentoDashboard } from "@/components/dashboard/BentoDashboard";
import { ClinicHealthKPIs } from "@/components/dashboard/ClinicHealthKPIs";
import { AtRiskPatientsAlert } from "@/components/dashboard/AtRiskPatientsAlert";
import { OverduePaymentsAlert } from "@/components/dashboard/OverduePaymentsAlert";
import { PackagesExpiringAlert } from "@/components/dashboard/PackagesExpiringAlert";
import { RevenueForecastCard } from "@/components/dashboard/RevenueForecastCard";
import { TeamPerformanceKPIs } from "@/components/dashboard/TeamPerformanceKPIs";
import { ChurnReportCard } from "@/components/dashboard/ChurnReportCard";
import { BusinessIntelligenceKPIs } from "@/components/dashboard/BusinessIntelligenceKPIs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";

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

  const dashboardActions = (
    <div className="flex items-center bg-secondary/30 p-1 rounded-2xl border border-border/50 shadow-inner">
      {(["today", "week"] as ViewMode[]).map((mode) => (
        <Button
          key={mode}
          variant={viewMode === mode ? "default" : "ghost"}
          size="sm"
          onClick={() => handleViewModeChange(mode)}
          className={cn(
            "rounded-xl px-5 text-[10px] font-black uppercase tracking-widest h-8 transition-all duration-300 font-display",
            viewMode === mode && "bg-primary text-primary-foreground shadow-lg scale-105",
          )}
        >
          {mode === "today" ? "Hoje" : "Semana"}
        </Button>
      ))}
    </div>
  );

  return (
    <PageLayout showFooter={false} fullWidth compactHeader>
      <PageContainer maxWidth="full">
        <PageHeader
          title="Fisio Intelligence"
          subtitle="Acompanhe a saúde da sua clínica em tempo real"
          icon={LayoutDashboard}
          actions={dashboardActions}
        />

        <div className="space-y-8 animate-fade-in">
          {/* Medical Returns Alert - Refactored as a Premium Banner */}
          {medicalReturnsUpcoming.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="premium-glass rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group cursor-pointer hover:bg-primary/5 transition-all duration-500 border border-primary/20"
              onClick={() => navigate("/relatorios/medico")}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner-border">
                <Stethoscope className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-3 font-display uppercase tracking-tighter">
                  Preparar Relatórios Médicos
                  <Badge className="bg-primary text-white text-xs px-2 py-0.5 border-0 font-black rounded-full">
                    {medicalReturnsUpcoming.length}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {medicalReturnsUpcoming.length} pacientes possuem retornos médicos nos próximos 14
                  dias.
                  <span className="text-primary ml-1 font-black underline decoration-2 underline-offset-4">
                    Gerar documentação agora
                  </span>
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500 md:ml-auto" />
            </motion.div>
          )}

          {/* KPI Sections with Bento Grouping */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Performance Financeira & BI
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <BusinessIntelligenceKPIs />
              </motion.div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Gestão Clínica & Equipe
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ClinicHealthKPIs />
              <TeamPerformanceKPIs />
              <ChurnReportCard />
            </div>
          </section>

          {/* High Priority Alerts Area */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Alertas & Retenção
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AtRiskPatientsAlert />
              <OverduePaymentsAlert />
              <PackagesExpiringAlert />
              <RevenueForecastCard />
            </div>
          </section>

          <section className="pt-8 border-t border-border/40">
            <BentoDashboard viewMode={viewMode} />
          </section>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
