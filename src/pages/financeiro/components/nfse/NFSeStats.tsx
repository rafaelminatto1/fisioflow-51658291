import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, FileText, Activity, Zap } from "lucide-react";
import { useMemo } from "react";
import { type NFSe } from "./types";

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  color: string;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <Card className="rounded-[2rem] border-none shadow-sm p-6 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-colors group-hover:bg-slate-900 group-hover:text-white",
            color,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <h4 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          {value}
        </h4>
      </div>
    </Card>
  );
}

export function NFSeStats({ nfses }: { nfses: NFSe[] }) {
  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const thisMonth = nfses.filter((n) => new Date(n.data_emissao).getMonth() === month);
    const authorized = thisMonth.filter((n) => n.status === "autorizado");
    const totalValue = authorized.reduce((acc, n) => acc + n.valor, 0);
    const pending = nfses.filter(
      (n) => n.status === "aguardando_prefeitura" || n.status === "aguardando_internet",
    ).length;

    return {
      monthlyValue: totalValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      monthlyCount: authorized.length,
      pendingCount: pending,
      successRate: (() => {
        const sent = nfses.filter((n) => n.status !== "rascunho").length;
        if (sent === 0) return 100;
        return Math.round((nfses.filter((n) => n.status === "autorizado").length / sent) * 100);
      })(),
    };
  }, [nfses]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Faturamento (Mês)"
        value={`R$ ${stats.monthlyValue}`}
        icon={TrendingUp}
        color="text-emerald-600"
        trend="+12%"
      />
      <StatCard
        title="Notas Emitidas"
        value={String(stats.monthlyCount)}
        icon={FileText}
        color="text-blue-600"
      />
      <StatCard
        title="Em Processamento"
        value={String(stats.pendingCount)}
        icon={Activity}
        color="text-amber-600"
      />
      <StatCard
        title="Taxa de Sucesso"
        value={`${stats.successRate}%`}
        icon={Zap}
        color="text-indigo-600"
      />
    </div>
  );
}
