import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

  Clock,
  Video,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Phone,
  X,
  Mic,
  Camera,
  Wifi,
  Volume2,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WaitingRoomProps {
  appointmentId: string;
  patientName?: string;
  scheduledTime: string;
  therapistName?: string;
  onJoin?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface DeviceCheck {
  camera: boolean;
  microphone: boolean;
  speakers: boolean;
}

/**
 * WaitingRoom component - Pre-call preparation and waiting area
 */
export function WaitingRoom({
  appointmentId,
  patientName = 'Paciente',
  scheduledTime,
  therapistName,
  onJoin,
  onCancel,
  className,
}: WaitingRoomProps) {
  const [devices, setDevices] = useState<DeviceCheck>({
    camera: false,
    microphone: false,
    speakers: false,
  });
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [canJoin, setCanJoin] = useState(false);

  const appointmentTime = new Date(scheduledTime);
  const now = new Date();
  const minutesUntil = differenceInMinutes(appointmentTime, now);

  useEffect(() => {
    checkDevices();
    // Recheck devices every 30 seconds
    const interval = setInterval(checkDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Enable join 5 minutes before appointment
    const canJoinTime = new Date(appointmentTime);
    canJoinTime.setMinutes(canJoinTime.getMinutes() - 5);
    setCanJoin(now >= canJoinTime);
  }, [appointmentTime, now]);

  const checkDevices = async () => {
    setIsCheckingDevices(true);
    try {
      // Check for camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setDevices({
        camera: true,
        microphone: true,
        speakers: true,
      });

      // Stop the test stream immediately
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Device check failed:', error);
      // Try checking devices without getting stream
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = deviceInfos.some((d) => d.kind === 'videoinput');
        const hasMic = deviceInfos.some((d) => d.kind === 'audioinput');
        const hasSpeaker = deviceInfos.some((d) => d.kind === 'audiooutput');

        setDevices({
          camera: hasCamera,
          microphone: hasMic,
          speakers: hasSpeaker,
        });
      } catch {
        // Devices check failed entirely
        setDevices({
          camera: false,
          microphone: false,
          speakers: false,
        });
      }
    } finally {
      setIsCheckingDevices(false);
    }
  };

  const allDevicesOk = devices.camera && devices.microphone && devices.speakers;
  const isTimeToJoin = minutesUntil <= 5 && minutesUntil >= -15; // Can join 5 min before, up to 15 min after

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Sala de Espera - Telemedicina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(appointmentTime, "EEEE', dia 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Consulta com {therapistName}</span>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="text-center py-4">
            {minutesUntil > 5 ? (
              <div className="space-y-2">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Aguardando horário da consulta
                </Badge>
                <p className="text-sm text-muted-foreground">
                  A sala abrirá automaticamente 5 minutos antes do horário
                </p>
              </div>
            ) : isTimeToJoin ? (
              <div className="space-y-2">
                <Badge variant="default" className="bg-green-500 text-white border-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Pronto para entrar
                </Badge>
                <p className="text-sm text-muted-foreground">
                  A consulta já pode começar!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Consulta atrasada
                </Badge>
                <p className="text-sm text-muted-foreground">
                  O horário da consulta já passou. Entre em contato se ainda deseja realizar a consulta.
                </p>
              </div>
            )}
          </div>

          {/* Device Check */}
          <div className="border rounded-xl p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Video className="h-5 w-5" />
              Verificação de Dispositivos
            </h3>

            {isCheckingDevices ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className={cn('text-center p-3 rounded-lg border', devices.camera ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800')}>
                  <Camera className={cn('h-6 w-6 mx-auto mb-2', devices.camera ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
                  <p className="text-sm font-medium">Câmera</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {devices.camera ? 'Detectada' : 'Não encontrada'}
                  </p>
                </div>

                <div className={cn('text-center p-3 rounded-lg border', devices.microphone ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800')}>
                  <Mic className={cn('h-6 w-6 mx-auto mb-2', devices.microphone ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
                  <p className="text-sm font-medium">Microfone</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {devices.microphone ? 'Detectado' : 'Não encontrado'}
                  </p>
                </div>

                <div className={cn('text-center p-3 rounded-lg border', devices.speakers ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800')}>
                  <Volume2 className={cn('h-6 w-6 mx-auto mb-2', devices.speakers ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
                  <p className="text-sm font-medium">Áudio</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {devices.speakers ? 'Detectado' : 'Não encontrado'}
                  </p>
                </div>
              </div>
            )}

            {!allDevicesOk && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Permissões necessárias</p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                      Para participar da videochamada, permita o acesso à câmera e microfone do seu navegador.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={checkDevices}
              disabled={isCheckingDevices}
              className="w-full"
            >
              Verificar dispositivos novamente
            </Button>
          </div>

          {/* Connection Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Dicas para uma boa conexão
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use uma conexão estável (Wi-Fi ou 4G/5G)</li>
              <li>• Feche outros aplicativos que usem muita banda</li>
              <li>• Use fones de ouvido para melhor áudio</li>
              <li>• Escolha um local iluminado para a consulta</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isTimeToJoin && allDevicesOk ? (
              <Button onClick={onJoin} className="flex-1 bg-primary" size="lg">
                <Video className="mr-2 h-5 w-5" />
                Entrar na Consulta
              </Button>
            ) : (
              <Button disabled className="flex-1" size="lg">
                <Video className="mr-2 h-5 w-5" />
                {isTimeToJoin ? 'Verifique seus dispositivos' : 'Aguardando horário...'}
              </Button>
            )}
            <Button onClick={onCancel} variant="outline" size="lg">
              <X className="mr-2 h-5 w-5" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WaitingRoom;
