import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, User, Calendar } from 'lucide-react';
import type { Appointment } from '@/types/agenda';

interface AppointmentModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onConfirm?: (appointment: Appointment) => void;
}

export function AppointmentModal({
  appointment,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onConfirm
}: AppointmentModalProps) {
  if (!appointment) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'default';
      case 'concluido': return 'secondary';
      case 'cancelado': return 'destructive';
      case 'falta': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Status and Date */}
            <div className="flex items-center justify-between">
              <Badge variant={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(appointment.date)}
              </span>
            </div>

            {/* Patient Info */}
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{appointment.patient?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.patient?.phone}
                </p>
              </div>
            </div>

            {/* Time and Duration */}
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {appointment.start_time} - {appointment.end_time}
                </p>
                <p className="text-sm text-muted-foreground">
                  Sessão {appointment.session_type}
                </p>
              </div>
            </div>


            {/* Notes */}
            {appointment.notes && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Observações</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {appointment.notes}
                </p>
              </div>
            )}

            {/* Payment Status */}
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm font-medium">Status do Pagamento:</span>
              <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}>
                {appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {onConfirm && appointment.status === 'agendado' && (
            <Button
              onClick={() => onConfirm(appointment)}
              className="flex-1"
            >
              Confirmar
            </Button>
          )}

          {onEdit && (
            <Button
              variant="outline"
              onClick={() => onEdit(appointment)}
              className="flex-1"
            >
              Editar
            </Button>
          )}

          {onCancel && appointment.status !== 'cancelado' && (
            <Button
              variant="destructive"
              onClick={() => onCancel(appointment)}
              className="flex-1"
            >
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}