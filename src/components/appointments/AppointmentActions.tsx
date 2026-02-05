import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Play, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { AppointmentBase } from '@/types/appointment';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { prefetchRoute, RouteKeys } from '@/lib/routing/routePrefetch';
import { useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/integrations/firebase/functions';

interface AppointmentActionsProps {
  appointment: AppointmentBase;
  onEdit?: () => void;
  onDelete?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const AppointmentActions: React.FC<AppointmentActionsProps> = ({
  appointment,
  onEdit,
  onDelete,
  onConfirm,
  onCancel
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStartAttendance = () => {
    // Prefetch do chunk da página de evolução (alto impacto)
    prefetchRoute(
      () => import('../pages/PatientEvolution').then(m => ({ default: m.PatientEvolution })),
      RouteKeys.PATIENT_EVOLUTION
    );

    // Prefetch dos dados críticos (appointment e paciente)
    queryClient.prefetchQuery({
      queryKey: ['appointment', appointment.id],
      queryFn: () => appointmentsApi.get(appointment.id),
      staleTime: 1000 * 60 * 2, // 2 minutos
    });

    // Navega para a página de evolução
    navigate(`/patient-evolution/${appointment.id}`);
    toast({
      title: 'Iniciando atendimento',
      description: `Atendimento de ${appointment.patientName}`
    });
  };

  const canStartAttendance = appointment.status === 'confirmado' || appointment.status === 'agendado';
  const canConfirm = appointment.status === 'agendado';
  const canCancel = appointment.status !== 'cancelado' && appointment.status !== 'concluido';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Ações do agendamento</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canStartAttendance && (
          <DropdownMenuItem onClick={handleStartAttendance} className="cursor-pointer">
            <Play className="mr-2 h-4 w-4 text-green-600" />
            <span className="font-medium">Iniciar Atendimento</span>
          </DropdownMenuItem>
        )}

        {canConfirm && onConfirm && (
          <DropdownMenuItem onClick={onConfirm} className="cursor-pointer">
            <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
            <span>Confirmar Agendamento</span>
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {canCancel && onCancel && (
          <DropdownMenuItem onClick={onCancel} className="cursor-pointer text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            <span>Cancelar</span>
          </DropdownMenuItem>
        )}

        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Excluir</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
