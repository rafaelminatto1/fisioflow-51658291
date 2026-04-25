import { CheckCircle, Users, Clock } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  unit: string;
}

function StatCard({ icon, iconBg, label, value, unit }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border/60 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
}

interface CapacityStatsRowProps {
  totalPatients: number;
  maxPerHour: number;
  activeDays: number;
}

export function CapacityStatsRow({ totalPatients, maxPerHour, activeDays }: CapacityStatsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        icon={<CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        label="Média Diária"
        value={totalPatients}
        unit="pacientes"
      />
      <StatCard
        icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        iconBg="bg-blue-50 dark:bg-blue-950/40"
        label="Capacidade Máx"
        value={maxPerHour}
        unit="por horário"
      />
      <StatCard
        icon={<Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-50 dark:bg-amber-950/40"
        label="Dias Ativos"
        value={activeDays}
        unit="dias/semana"
      />
    </div>
  );
}
