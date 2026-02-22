/**
 * BulkOperations - Operações em massa
 *
 * Features:
 * - Seleção múltipla de agendamentos
 * - Alterar status em massa
 * - Reagendar múltiplos
 * - Excluir múltiplos
 * - Exportar selecionados
 * - Enviar notificação em massa
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Calendar,
  Trash2,
  Download,
  MessageSquare,
  RefreshCw,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { format, addMinutes, subMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';

export type BulkAction = 'status' | 'reschedule' | 'delete' | 'export' | 'notify';

export interface BulkOperationsProps {
  appointments: Appointment[];
  onBulkUpdate?: (ids: string[], action: BulkAction, data?: any) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  appointments,
  onBulkUpdate,
  disabled = false,
  className,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<BulkAction | null>(null);

  const selectedCount = selectedIds.size;
  const totalCount = appointments.length;

  // Toggle seleção individual
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setIsAllSelected(next.size === appointments.length - 1 && !next.has(id));
      return next;
    });
  }, [appointments.length]);

  // Toggle seleção de todos
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedIds(new Set(appointments.map((a) => a.id || '')));
      setIsAllSelected(true);
    }
  }, [isAllSelected, appointments]);

  // Limpar seleção
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsAllSelected(false);
    setShowActions(false);
  }, []);

  // Executar ação em massa
  const handleBulkAction = useCallback(async (action: BulkAction, data?: any) => {
    if (selectedCount === 0) return;

    setActionInProgress(action);

    try {
      await onBulkUpdate?.(Array.from(selectedIds), action, data);
      clearSelection();
    } finally {
      setActionInProgress(null);
    }
  }, [selectedCount, selectedIds, onBulkUpdate, clearSelection]);

  // Mudar status
  const handleStatusChange = useCallback((status: Appointment['status']) => {
    handleBulkAction('status', { status });
  }, [handleBulkAction]);

  // Reagendar
  const handleReschedule = useCallback((minutes: number) => {
    const selectedAppointments = appointments.filter((a) => selectedIds.has(a.id || ''));
    const updatedData = selectedAppointments.map((apt) => {
      const startTime = new Date(apt.startTime);
      const newStartTime = minutes > 0
        ? addMinutes(startTime, minutes)
        : subMinutes(startTime, Math.abs(minutes));

      return {
        id: apt.id,
        startTime: newStartTime.toISOString(),
        endTime: addMinutes(newStartTime, apt.duration || 60).toISOString(),
      };
    });

    handleBulkAction('reschedule', { updates: updatedData, offset: minutes });
  }, [appointments, selectedIds, handleBulkAction]);

  // Exportar
  const handleExport = useCallback(() => {
    const selectedAppointments = appointments.filter((a) => selectedIds.has(a.id || ''));

    const csvContent = [
      ['Paciente', 'Data', 'Horário', 'Serviço', 'Status', 'Observações'].join(','),
      ...selectedAppointments.map((apt) => [
        `"${apt.patientName || apt.patient?.name || ''}"`,
        `"${format(new Date(apt.startTime), 'dd/MM/yyyy', { locale: ptBR })}"`,
        `"${format(new Date(apt.startTime), 'HH:mm', { locale: ptBR })}"`,
        `"${apt.service || ''}"`,
        `"${apt.status || ''}"`,
        `"${apt.notes || ''}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agendamentos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [appointments, selectedIds]);

  // Verificar se todos os selecionados têm o mesmo status
  const selectedAppointments = useMemo(() => {
    return appointments.filter((a) => selectedIds.has(a.id || ''));
  }, [appointments, selectedIds]);

  const commonStatus = useMemo(() => {
    const statuses = new Set(selectedAppointments.map((a) => a.status).filter(Boolean));
    return statuses.size === 1 ? Array.from(statuss)[0] : null;
  }, [selectedAppointments]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Barra de ações em massa */}
      {selectedCount > 0 && (
        <div className="sticky top-0 z-40 p-4 bg-background border-b shadow-lg flex items-center gap-4 animate-in slide-in-from-top">
          <span className="font-medium">
            {selectedCount} de {totalCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>

          <div className="flex-1" />

          {/* Ações rápidas */}
          <div className="flex gap-2">
            {/* Alterar status */}
            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Alterar Status</span>
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <div className="absolute top-full right-0 mt-1 bg-background border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[180px]">
                <div className="p-1">
                  {(['confirmed', 'pending', 'completed', 'cancelled', 'no-show'] as Appointment['status'][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={actionInProgress === 'status'}
                      className="w-full px-3 py-1.5 text-left rounded hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Check className="w-3 h-3" />
                      {status === 'confirmed' && 'Confirmado'}
                      {status === 'pending' && 'Pendente'}
                      {status === 'completed' && 'Concluído'}
                      {status === 'cancelled' && 'Cancelado'}
                      {status === 'no-show' && 'Não compareceu'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reagendar */}
            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Reagendar</span>
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <div className="absolute top-full right-0 mt-1 bg-background border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[180px]">
                <div className="p-1">
                  <button
                    onClick={() => handleReschedule(15)}
                    disabled={actionInProgress === 'reschedule'}
                    className="w-full px-3 py-1.5 text-left rounded hover:bg-muted/50 transition-colors text-sm"
                  >
                    +15 minutos
                  </button>
                  <button
                    onClick={() => handleReschedule(30)}
                    disabled={actionInProgress === 'reschedule'}
                    className="w-full px-3 py-1.5 text-left rounded hover:bg-muted/50 transition-colors text-sm"
                  >
                    +30 minutos
                  </button>
                  <button
                    onClick={() => handleReschedule(60)}
                    disabled={actionInProgress === 'reschedule'}
                    className="w-full px-3 py-1.5 text-left rounded hover:bg-muted/50 transition-colors text-sm"
                  >
                    +1 hora
                  </button>
                  <button
                    onClick={() => handleReschedule(-15)}
                    disabled={actionInProgress === 'reschedule'}
                    className="w-full px-3 py-1.5 text-left rounded hover:bg-muted/50 transition-colors text-sm"
                  >
                    -15 minutos
                  </button>
                </div>
              </div>
            </div>

            {/* Notificar */}
            <button
              onClick={() => handleBulkAction('notify')}
              disabled={actionInProgress === 'notify'}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2"
              title="Enviar notificação"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Exportar */}
            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Excluir */}
            <button
              onClick={() => {
                if (window.confirm(`Excluir ${selectedCount} agendamento(s)?`)) {
                  handleBulkAction('delete');
                }
              }}
              disabled={actionInProgress === 'delete'}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg flex items-center gap-2"
              title="Excluir"
            >
              {actionInProgress === 'delete' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>

            {/* Limpar seleção */}
            <button
              onClick={clearSelection}
              className="p-1.5 hover:bg-muted rounded-lg"
              title="Limpar seleção"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Checkbox select all */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30">
        <button
          onClick={toggleSelectAll}
          disabled={disabled}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {isAllSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5" />
          )}
          <span className="text-sm">Selecionar todos</span>
        </button>

        <div className="flex-1" />

        {selectedCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE DE CHECKBOX COM ESTADO
// ============================================================================

interface SelectableRowProps {
  appointment: Appointment;
  selected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const SelectableRow: React.FC<SelectableRowProps> = ({
  appointment,
  selected,
  onToggle,
  disabled = false,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 border-b transition-colors',
        selected && 'bg-primary/5',
        !selected && 'hover:bg-muted/30'
      )}
    >
      <button
        onClick={() => !disabled && onToggle(appointment.id || '')}
        disabled={disabled}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
        aria-label={selected ? 'Deselecionar' : 'Selecionar'}
      >
        {selected ? (
          <CheckSquare className="w-5 h-5 text-primary" />
        ) : (
          <Square className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};
