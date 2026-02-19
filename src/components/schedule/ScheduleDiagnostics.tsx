/**
 * Schedule Diagnostics Component
 * 
 * Temporary component to help debug appointment loading issues.
 * Shows real-time data about the query state and appointments.
 * 
 * Usage: Add <ScheduleDiagnostics /> to the Schedule page
 * Remove after debugging is complete.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useAppointmentsByPeriod } from '@/hooks/useAppointmentsByPeriod';
import { ViewType } from '@/utils/periodCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ScheduleDiagnosticsProps {
  currentDate: Date;
  viewType: 'day' | 'week' | 'month';
}

export function ScheduleDiagnostics({ currentDate, viewType }: ScheduleDiagnosticsProps) {
  const { user, organizationId: authOrganizationId } = useAuth();
  const organizationId = authOrganizationId || '';

  const periodQuery = {
    viewType: viewType as ViewType,
    date: currentDate,
    organizationId,
  };

  const {
    data: appointments = [],
    isLoading,
    error,
    isFetching,
    isSuccess,
  } = useAppointmentsByPeriod(periodQuery);

  const getStatusIcon = () => {
    if (isLoading || isFetching) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (isSuccess && appointments.length > 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Carregando...';
    if (isFetching) return 'Atualizando...';
    if (error) return 'Erro ao carregar';
    if (isSuccess && appointments.length > 0) return 'Dados carregados';
    if (isSuccess && appointments.length === 0) return 'Nenhum agendamento';
    return 'Aguardando';
  };

  const getStatusColor = () => {
    if (isLoading || isFetching) return 'bg-blue-100 text-blue-800';
    if (error) return 'bg-red-100 text-red-800';
    if (isSuccess && appointments.length > 0) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <Card className="mb-4 border-2 border-dashed border-orange-300 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Diagnóstico de Agendamentos
          <Badge variant="outline" className="ml-auto">DEBUG MODE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Status:</span>
          <Badge className={getStatusColor()}>{getStatusText()}</Badge>
        </div>

        {/* User Info */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Usuário:</span>
            <span className={user ? 'text-green-600' : 'text-red-600'}>
              {user ? '✓ Autenticado' : '✗ Não autenticado'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Organization ID:</span>
            <span className={organizationId ? 'text-green-600 font-mono' : 'text-red-600'}>
              {organizationId || '✗ Não definido'}
            </span>
          </div>
        </div>

        {/* Query Info */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Tipo de Visualização:</span>
            <Badge variant="secondary">{viewType}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Data Atual:</span>
            <span className="font-mono">{currentDate.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Agendamentos Carregados:</span>
            <Badge variant={appointments.length > 0 ? 'default' : 'secondary'}>
              {appointments.length}
            </Badge>
          </div>
          {appointments.length > 0 && (
            <div className="mt-2 p-2 bg-white rounded border">
              <div className="font-medium mb-1">Amostra (primeiro agendamento):</div>
              <div className="space-y-0.5 text-[10px] font-mono">
                <div>ID: {appointments[0].id.slice(0, 8)}...</div>
                <div>Paciente: {appointments[0].patientName}</div>
                <div>Data: {appointments[0].date instanceof Date ? appointments[0].date.toLocaleDateString('pt-BR') : String(appointments[0].date)}</div>
                <div>Hora: {appointments[0].time}</div>
                <div>Status: {appointments[0].status}</div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="border-t pt-2">
            <div className="font-medium text-red-600 mb-1">Erro:</div>
            <div className="p-2 bg-red-50 rounded border border-red-200 text-red-700">
              {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
        )}

        {/* Warning if no organization ID */}
        {!organizationId && (
          <div className="border-t pt-2">
            <div className="p-2 bg-yellow-50 rounded border border-yellow-200 text-yellow-800">
              <div className="font-medium mb-1">⚠️ Atenção:</div>
              <div>
                O usuário não possui um Organization ID definido. 
                Verifique o perfil no Firestore e certifique-se de que o campo 
                <code className="mx-1 px-1 bg-yellow-100 rounded">organization_id</code> 
                está preenchido.
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="border-t pt-2 text-[10px] text-gray-500">
          <div className="font-medium mb-1">Instruções:</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Verifique se o Organization ID está presente</li>
            <li>Abra o Console do navegador (F12) para ver logs detalhados</li>
            <li>Procure por mensagens de erro de validação</li>
            <li>Remova este componente após resolver o problema</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
