import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  AppointmentConflict,
  AlternativeSlot,
  EnhancedAppointment
} from '@/types/appointment';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  User,
  MapPin,
  CalendarX,
  ArrowRight
} from 'lucide-react';

interface ConflictDetectionProps {
  conflicts: AppointmentConflict[];
  onResolveConflict?: (conflict: AppointmentConflict, resolution: ConflictResolution) => void;
  onSelectAlternative?: (alternative: AlternativeSlot) => void;
  showAlternatives?: boolean;
  className?: string;
}

type ConflictResolution = 
  | { type: 'override'; reason: string }
  | { type: 'reschedule'; newDate: Date; newTime: string }
  | { type: 'cancel'; reason: string };

const getConflictIcon = (type: AppointmentConflict['type']) => {
  switch (type) {
    case 'Double Booking':
      return <CalendarX className="w-4 h-4 text-red-500" />;
    case 'Therapist Unavailable':
      return <User className="w-4 h-4 text-orange-500" />;
    case 'Room Unavailable':
      return <MapPin className="w-4 h-4 text-orange-500" />;
    case 'Patient Conflict':
      return <User className="w-4 h-4 text-yellow-500" />;
    case 'Outside Working Hours':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'Equipment Unavailable':
      return <AlertTriangle className="w-4 h-4 text-purple-500" />;
    case 'Insufficient Buffer Time':
      return <Clock className="w-4 h-4 text-gray-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-500" />;
  }
};

const getSeverityColor = (severity: AppointmentConflict['severity']) => {
  switch (severity) {
    case 'Error':
      return 'border-red-200 bg-red-50';
    case 'Warning':
      return 'border-yellow-200 bg-yellow-50';
    case 'Info':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

const getSeverityIcon = (severity: AppointmentConflict['severity']) => {
  switch (severity) {
    case 'Error':
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    case 'Warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    case 'Info':
      return <Info className="w-4 h-4 text-blue-600" />;
    default:
      return <Info className="w-4 h-4 text-gray-600" />;
  }
};

const ConflictCard: React.FC<{
  conflict: AppointmentConflict;
  onResolveConflict?: (resolution: ConflictResolution) => void;
  onSelectAlternative?: (alternative: AlternativeSlot) => void;
  showAlternatives?: boolean;
}> = ({ conflict, onResolveConflict, onSelectAlternative, showAlternatives = true }) => {
  const handleOverride = () => {
    if (onResolveConflict && conflict.canOverride) {
      onResolveConflict({
        type: 'override',
        reason: `Override conflict: ${conflict.description}`
      });
    }
  };

  const handleSelectAlternative = (alternative: AlternativeSlot) => {
    onSelectAlternative?.(alternative);
  };

  return (
    <Card className={cn('border-l-4', getSeverityColor(conflict.severity))}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConflictIcon(conflict.type)}
            <CardTitle className="text-sm font-medium">
              {conflict.type}
            </CardTitle>
            <Badge 
              variant={conflict.severity === 'Error' ? 'destructive' : 
                     conflict.severity === 'Warning' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {conflict.severity}
            </Badge>
          </div>
          {getSeverityIcon(conflict.severity)}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Conflict Description */}
        <p className="text-sm text-muted-foreground">
          {conflict.description}
        </p>

        {/* Conflicting Appointment Details */}
        {conflict.conflictingAppointment && (
          <div className="p-2 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Agendamento em conflito:
              </span>
              <Badge variant="outline" className="text-xs">
                {conflict.conflictingAppointment.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3" />
                <span>{conflict.conflictingAppointment.patientName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3" />
                <span>
                  {format(conflict.conflictingAppointment.date, 'dd/MM/yyyy', { locale: ptBR })} às {conflict.conflictingAppointment.time}
                </span>
              </div>
              {conflict.conflictingAppointment.therapistName && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3 h-3" />
                  <span>{conflict.conflictingAppointment.therapistName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alternative Suggestions */}
        {showAlternatives && conflict.suggestedAlternatives && conflict.suggestedAlternatives.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Alternativas sugeridas:
              </span>
            </div>
            <div className="grid gap-2">
              {conflict.suggestedAlternatives.slice(0, 3).map((alternative, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-between h-auto p-2"
                  onClick={() => handleSelectAlternative(alternative)}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-xs">
                      <div className="font-medium">
                        {format(alternative.date, 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                      <div className="text-muted-foreground">
                        {alternative.startTime}
                      </div>
                    </div>
                    {alternative.therapistName && (
                      <Badge variant="secondary" className="text-xs">
                        {alternative.therapistName}
                      </Badge>
                    )}
                    {alternative.roomName && (
                      <Badge variant="outline" className="text-xs">
                        {alternative.roomName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {alternative.score}%
                    </span>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Resolution Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {conflict.canOverride && onResolveConflict && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOverride}
              className="text-xs"
            >
              Ignorar Conflito
            </Button>
          )}
          {conflict.severity !== 'Error' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
            >
              {conflict.reason || 'Mais informações'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function ConflictDetection({
  conflicts,
  onResolveConflict,
  onSelectAlternative,
  showAlternatives = true,
  className
}: ConflictDetectionProps) {
  if (conflicts.length === 0) {
    return (
      <Alert className={cn('border-green-200 bg-green-50', className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Nenhum conflito detectado. O horário está disponível.
        </AlertDescription>
      </Alert>
    );
  }

  const errorConflicts = conflicts.filter(c => c.severity === 'Error');
  const warningConflicts = conflicts.filter(c => c.severity === 'Warning');
  const infoConflicts = conflicts.filter(c => c.severity === 'Info');

  const hasBlockingConflicts = errorConflicts.some(c => !c.canOverride);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="font-medium text-sm">
            {conflicts.length} conflito{conflicts.length > 1 ? 's' : ''} detectado{conflicts.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          {errorConflicts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorConflicts.length} Erro{errorConflicts.length > 1 ? 's' : ''}
            </Badge>
          )}
          {warningConflicts.length > 0 && (
            <Badge variant="default" className="text-xs">
              {warningConflicts.length} Aviso{warningConflicts.length > 1 ? 's' : ''}
            </Badge>
          )}
          {infoConflicts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {infoConflicts.length} Info{infoConflicts.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Blocking Conflicts Alert */}
      {hasBlockingConflicts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Não é possível prosseguir:</strong> Existem conflitos que impedem a criação deste agendamento.
            Por favor, resolva os conflitos ou escolha um horário alternativo.
          </AlertDescription>
        </Alert>
      )}

      {/* Conflict List */}
      <div className="space-y-3">
        {/* Error Conflicts First */}
        {errorConflicts.map((conflict, index) => (
          <ConflictCard
            key={`error-${index}`}
            conflict={conflict}
            onResolveConflict={onResolveConflict ? (resolution) => onResolveConflict(conflict, resolution) : undefined}
            onSelectAlternative={onSelectAlternative}
            showAlternatives={showAlternatives}
          />
        ))}

        {/* Warning Conflicts */}
        {warningConflicts.map((conflict, index) => (
          <ConflictCard
            key={`warning-${index}`}
            conflict={conflict}
            onResolveConflict={onResolveConflict ? (resolution) => onResolveConflict(conflict, resolution) : undefined}
            onSelectAlternative={onSelectAlternative}
            showAlternatives={showAlternatives}
          />
        ))}

        {/* Info Conflicts */}
        {infoConflicts.map((conflict, index) => (
          <ConflictCard
            key={`info-${index}`}
            conflict={conflict}
            onResolveConflict={onResolveConflict ? (resolution) => onResolveConflict(conflict, resolution) : undefined}
            onSelectAlternative={onSelectAlternative}
            showAlternatives={showAlternatives}
          />
        ))}
      </div>

      {/* Global Actions */}
      {conflicts.length > 1 && (
        <div className="flex justify-between items-center p-3 border-t">
          <span className="text-sm text-muted-foreground">
            {hasBlockingConflicts ? 'Resolva todos os conflitos bloqueantes para continuar' : 'Você pode prosseguir mesmo com avisos'}
          </span>
          <div className="flex gap-2">
            {!hasBlockingConflicts && onResolveConflict && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Resolve all non-blocking conflicts
                  conflicts
                    .filter(c => c.canOverride)
                    .forEach(conflict => {
                      onResolveConflict(conflict, {
                        type: 'override',
                        reason: 'Bulk override of all resolvable conflicts'
                      });
                    });
                }}
              >
                Ignorar Todos
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}