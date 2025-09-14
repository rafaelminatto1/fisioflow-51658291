import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  Calendar, 
  DollarSign, 
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useUpdateAppointmentStatus,
  useUpdatePaymentStatus,
  useRescheduleAppointment,
  useDeleteAppointment
} from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/agenda';

interface AppointmentActionsProps {
  appointment: Appointment;
  onEdit?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function AppointmentActions({ 
  appointment, 
  onEdit, 
  onViewDetails,
  className 
}: AppointmentActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatusMutation = useUpdateAppointmentStatus();
  const updatePaymentMutation = useUpdatePaymentStatus();
  const deleteMutation = useDeleteAppointment();

  const handleStatusUpdate = async (status: string) => {
    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        appointmentId: appointment.id,
        status: status as any
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentUpdate = async (paymentStatus: Appointment['payment_status']) => {
    setIsUpdating(true);
    try {
      await updatePaymentMutation.mutateAsync({
        appointmentId: appointment.id,
        paymentStatus
      });
    } catch (error) {
      console.error('Failed to update payment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await deleteMutation.mutateAsync(appointment.id);
      } catch (error) {
        console.error('Failed to delete appointment:', error);
      }
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'missed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: Appointment['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canMarkCompleted = appointment.status === 'scheduled';
  const canMarkMissed = appointment.status === 'scheduled';
  const canCancel = ['scheduled', 'rescheduled'].includes(appointment.status);
  const canMarkPaid = appointment.payment_status !== 'paid';

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Ações do Agendamento
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={onViewDetails}>
                  Ver Detalhes
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status da Sessão:</span>
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status === 'scheduled' && 'Agendado'}
              {appointment.status === 'completed' && 'Concluído'}
              {appointment.status === 'missed' && 'Faltou'}
              {appointment.status === 'cancelled' && 'Cancelado'}
              {appointment.status === 'rescheduled' && 'Reagendado'}
            </Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            {canMarkCompleted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('completed')}
                disabled={isUpdating}
                className="flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Concluir
              </Button>
            )}

            {canMarkMissed && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('missed')}
                disabled={isUpdating}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Marcar Falta
              </Button>
            )}

            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={isUpdating}
                className="flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status do Pagamento:</span>
            <Badge className={getPaymentStatusColor(appointment.payment_status)}>
              {appointment.payment_status === 'paid' && 'Pago'}
              {appointment.payment_status === 'partial' && 'Parcial'}
              {appointment.payment_status === 'pending' && 'Pendente'}
            </Badge>
          </div>

          {canMarkPaid && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePaymentUpdate('paid')}
                disabled={isUpdating}
                className="flex items-center gap-1"
              >
                <DollarSign className="h-3 w-3" />
                Marcar como Pago
              </Button>

              {appointment.payment_status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePaymentUpdate('partial')}
                  disabled={isUpdating}
                  className="flex items-center gap-1"
                >
                  <DollarSign className="h-3 w-3" />
                  Pagamento Parcial
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Horário:</span>
            <span>{appointment.start_time} - {appointment.end_time}</span>
          </div>
          <div className="flex justify-between">
            <span>Tipo:</span>
            <span>{appointment.session_type === 'individual' ? 'Individual' : 'Grupo'}</span>
          </div>
          {appointment.notes && (
            <div className="flex justify-between">
              <span>Observações:</span>
              <span className="text-right max-w-32 truncate">{appointment.notes}</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {(isUpdating || updateStatusMutation.isPending || updatePaymentMutation.isPending) && (
          <div className="text-center py-2">
            <div className="text-xs text-muted-foreground">
              Atualizando...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for bulk operations
interface BulkAppointmentActionsProps {
  selectedAppointments: Appointment[];
  onClearSelection: () => void;
  className?: string;
}

export function BulkAppointmentActions({ 
  selectedAppointments, 
  onClearSelection,
  className 
}: BulkAppointmentActionsProps) {
  const updateStatusMutation = useUpdateAppointmentStatus();

  const handleBulkStatusUpdate = async (status: Appointment['status']) => {
    try {
      // This would need to be implemented in the hook
      console.log('Bulk update status:', status, selectedAppointments.map(apt => apt.id));
      onClearSelection();
    } catch (error) {
      console.error('Failed to bulk update:', error);
    }
  };

  if (selectedAppointments.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-primary", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedAppointments.length} selecionados
            </Badge>
            <span className="text-sm text-muted-foreground">
              Ações em lote:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusUpdate('completed')}
              disabled={updateStatusMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Concluir Todos
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusUpdate('cancelled')}
              disabled={updateStatusMutation.isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar Todos
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
            >
              Limpar Seleção
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}