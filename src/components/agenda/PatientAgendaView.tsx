import React, { useState, useMemo } from 'react';
import { Calendar, Clock, User, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePatientAppointments } from '@/hooks/useAppointments';
import { useCurrentUser } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/agenda';

interface PatientAgendaViewProps {
  className?: string;
}

export function PatientAgendaView({ className }: PatientAgendaViewProps) {
  const [periodFilter, setPeriodFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);

  const { data: currentUser } = useCurrentUser();
  const { data: appointments = [], isLoading } = usePatientAppointments(
    currentUser?.id,
    {
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }
  );

  // Filter appointments by period
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      
      switch (periodFilter) {
        case 'upcoming':
          return appointmentDate >= today;
        case 'past':
          return appointmentDate < today;
        case 'all':
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort upcoming appointments by date ascending, past appointments by date descending
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      return periodFilter === 'past' ? dateB - dateA : dateA - dateB;
    });
  }, [appointments, periodFilter]);

  const handleToggleExpand = (appointmentId: string) => {
    setExpandedAppointment(expandedAppointment === appointmentId ? null : appointmentId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando seus agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Meus Agendamentos</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Visualize seus agendamentos e histórico de sessões
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Próximos Agendamentos</SelectItem>
                  <SelectItem value="past">Histórico</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="scheduled">Agendados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                  <SelectItem value="no_show">Faltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <PatientStats appointments={appointments} />

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {periodFilter === 'upcoming' ? 'Próximos Agendamentos' : 
               periodFilter === 'past' ? 'Histórico de Sessões' : 'Todos os Agendamentos'}
            </span>
            <Badge variant="secondary">
              {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <EmptyState periodFilter={periodFilter} />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredAppointments.map((appointment) => (
                  <PatientAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isExpanded={expandedAppointment === appointment.id}
                    onToggleExpand={() => handleToggleExpand(appointment.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Patient statistics component
interface PatientStatsProps {
  appointments: Appointment[];
}

function PatientStats({ appointments }: PatientStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const upcoming = appointments.filter(apt => new Date(apt.date) >= today).length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const missed = appointments.filter(apt => apt.status === 'no_show').length;
    const total = appointments.length;
    
    const attendanceRate = total > 0 ? ((completed / (completed + missed)) * 100).toFixed(1) : '0';
    
    return { upcoming, completed, missed, total, attendanceRate };
  }, [appointments]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
          <p className="text-sm text-muted-foreground">Próximos</p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-muted-foreground">Concluídos</p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{stats.missed}</p>
          <p className="text-sm text-muted-foreground">Faltas</p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</p>
          <p className="text-sm text-muted-foreground">Presença</p>
        </div>
      </Card>
    </div>
  );
}

// Individual appointment card for patients
interface PatientAppointmentCardProps {
  appointment: Appointment;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function PatientAppointmentCard({ appointment, isExpanded, onToggleExpand }: PatientAppointmentCardProps) {
  const appointmentDate = new Date(appointment.date);
  const isUpcoming = appointmentDate >= new Date();
  const isPast = appointmentDate < new Date();

  return (
    <Card className={cn(
      "transition-all duration-200",
      isUpcoming && "ring-1 ring-blue-200",
      isExpanded && "ring-2 ring-primary/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{appointmentDate.getDate()}</p>
              <p className="text-xs text-muted-foreground uppercase">
                {appointmentDate.toLocaleDateString('pt-BR', { month: 'short' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {appointmentDate.getFullYear()}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {appointment.start_time} - {appointment.end_time}
                </span>
                <Badge variant={getStatusVariant(appointment.status)} className="text-xs">
                  {getStatusLabel(appointment.status)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {appointment.therapist?.name || 'Fisioterapeuta'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                </Badge>
                
                <Badge variant="outline" className="text-xs">
                  {appointment.session_type === 'individual' ? 'Individual' : 'Grupo'}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mais
              </>
            )}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data Completa</p>
                <p className="font-medium">
                  {appointmentDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Duração</p>
                <p className="font-medium">
                  {calculateDuration(appointment.start_time, appointment.end_time)} minutos
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Agendado em</p>
                <p className="font-medium">
                  {new Date(appointment.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground">ID do Agendamento</p>
                <p className="font-mono text-xs">{appointment.id}</p>
              </div>
            </div>
            
            {appointment.notes && (
              <div>
                <p className="text-muted-foreground text-sm mb-2">Observações</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              </div>
            )}

            {/* Patient-specific information */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Informações Importantes</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {isUpcoming && (
                  <li>• Chegue 10 minutos antes do horário agendado</li>
                )}
                {appointment.status === 'scheduled' && (
                  <li>• Traga roupas confortáveis para a sessão</li>
                )}
                {appointment.payment_status === 'pending' && (
                  <li>• Pagamento pendente - regularize na recepção</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state component
interface EmptyStateProps {
  periodFilter: string;
}

function EmptyState({ periodFilter }: EmptyStateProps) {
  const getMessage = () => {
    switch (periodFilter) {
      case 'upcoming':
        return {
          title: 'Nenhum agendamento próximo',
          description: 'Você não possui agendamentos futuros no momento.'
        };
      case 'past':
        return {
          title: 'Nenhum histórico encontrado',
          description: 'Você ainda não possui histórico de sessões.'
        };
      default:
        return {
          title: 'Nenhum agendamento encontrado',
          description: 'Você não possui agendamentos registrados.'
        };
    }
  };

  const { title, description } = getMessage();
  
  return (
    <div className="text-center py-12">
      <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {periodFilter === 'upcoming' && (
        <p className="text-sm text-muted-foreground">
          Entre em contato com a clínica para agendar sua próxima sessão.
        </p>
      )}
    </div>
  );
}

// Utility functions
function getStatusLabel(status: string): string {
  const labels = {
    scheduled: 'Agendado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Faltou'
  };
  return labels[status as keyof typeof labels] || status;
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants = {
    scheduled: 'default' as const,
    completed: 'secondary' as const,
    cancelled: 'destructive' as const,
    no_show: 'outline' as const
  };
  return variants[status as keyof typeof variants] || 'outline';
}

function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}