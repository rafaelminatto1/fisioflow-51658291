import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Calendar,
  Clock,
  User,
  Phone,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock3,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Appointment } from '@/types';

interface AppointmentListViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onStatusChange?: (appointmentId: string, status: string) => void;
}

export const AppointmentListView = ({
  appointments,
  onAppointmentClick,
  onStatusChange
}: AppointmentListViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           appointment.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const matchesType = typeFilter === 'all' || appointment.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [appointments, searchTerm, statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-200';
      case 'Pendente':
        return 'bg-amber-500/20 text-amber-700 border-amber-200';
      case 'Reagendado':
        return 'bg-orange-500/20 text-orange-700 border-orange-200';
      case 'Cancelado':
        return 'bg-red-500/20 text-red-700 border-red-200';
      case 'Realizado':
        return 'bg-blue-500/20 text-blue-700 border-blue-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return <CheckCircle className="w-4 h-4" />;
      case 'Pendente':
        return <Clock3 className="w-4 h-4" />;
      case 'Reagendado':
        return <RotateCcw className="w-4 h-4" />;
      case 'Cancelado':
        return <XCircle className="w-4 h-4" />;
      case 'Realizado':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Consulta Inicial':
        return 'bg-emerald-500/10 text-emerald-700';
      case 'Fisioterapia':
        return 'bg-blue-500/10 text-blue-700';
      case 'Reavaliação':
        return 'bg-purple-500/10 text-purple-700';
      case 'Consulta de Retorno':
        return 'bg-amber-500/10 text-amber-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const appointmentTypes = [...new Set(appointments.map(apt => apt.type))];
  const appointmentStatuses = [...new Set(appointments.map(apt => apt.status))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {appointmentStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {appointmentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredAppointments.length} de {appointments.length} agendamentos
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros ou criar um novo agendamento.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card 
              key={appointment.id} 
              className="bg-card border-border hover:shadow-card transition-all duration-200 cursor-pointer"
              onClick={() => onAppointmentClick(appointment)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Date and Time */}
                    <div className="text-center min-w-[80px]">
                      <div className="text-sm font-medium text-foreground">
                        {format(new Date(appointment.date), 'dd/MM', { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appointment.time}
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {appointment.patientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{appointment.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{appointment.duration}min</span>
                        </div>
                      </div>
                    </div>

                    {/* Type and Status */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getTypeColor(appointment.type)}>
                        {appointment.type}
                      </Badge>
                      <Badge className={`${getStatusColor(appointment.status)} flex items-center gap-1`}>
                        {getStatusIcon(appointment.status)}
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appointment);
                      }}>
                        Editar
                      </DropdownMenuItem>
                      {onStatusChange && appointment.status === 'Pendente' && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(appointment.id, 'Confirmado');
                        }}>
                          Confirmar
                        </DropdownMenuItem>
                      )}
                      {onStatusChange && appointment.status !== 'Cancelado' && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(appointment.id, 'Cancelado');
                        }}>
                          Cancelar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {appointment.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};