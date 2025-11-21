import { useAppointments } from '@/hooks/useAppointments';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, XCircle, TrendingUp, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function QuickStats() {
  const { data: appointments = [] } = useAppointments();
  
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Agendamentos do mês
  const monthAppointments = appointments.filter((apt) =>
    isWithinInterval(apt.date, { start: monthStart, end: monthEnd })
  );

  // Estatísticas
  const todayCount = appointments.filter(
    (apt) => format(apt.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  ).length;

  const completedCount = monthAppointments.filter((apt) => apt.status === 'concluido').length;
  const cancelledCount = monthAppointments.filter((apt) => apt.status === 'cancelado').length;
  const scheduledCount = monthAppointments.filter((apt) => apt.status === 'agendado').length;

  // Taxa de comparecimento
  const totalFinished = completedCount + cancelledCount;
  const attendanceRate = totalFinished > 0 ? (completedCount / totalFinished) * 100 : 0;

  // Receita estimada (considerando agendamentos concluídos e pagos)
  const revenue = monthAppointments
    .filter((apt) => apt.status === 'concluido')
    .reduce((sum, apt) => sum + (apt.payment_amount || 0), 0);

  const stats = [
    {
      icon: Calendar,
      label: 'Hoje',
      value: todayCount,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Clock,
      label: 'Agendados',
      value: scheduledCount,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      icon: CheckCircle,
      label: 'Concluídos',
      value: completedCount,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      icon: XCircle,
      label: 'Cancelados',
      value: cancelledCount,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Taxa Presença',
      value: `${attendanceRate.toFixed(0)}%`,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      icon: DollarSign,
      label: 'Receita Mês',
      value: `R$ ${revenue.toFixed(0)}`,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
