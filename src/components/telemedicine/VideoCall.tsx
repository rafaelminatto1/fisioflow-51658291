import React, { useState, useEffect, useRef, useCallback } from 'react';
import {

  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorUp,
  MessageSquare,
  Settings,
  Users,
  Clock,
  Signal,
  FullScreen,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface VideoCallProps {
  roomId?: string;
  patientName?: string;
  therapistName?: string;
  onJoin?: () => void;
  onLeave?: () => void;
  className?: string;
}

interface CallStats {
  duration: number;
  bitRate: number;
  packetLoss: number;
  jitter: number;
}

/**
 * VideoCall Component - WebRTC-based video consultation
 *
 * This is a placeholder component that simulates a video call interface.
 * In production, this would integrate with:
 * - Twilio Video
 * - Daily.co
 * - Agora.io
 * - Custom WebRTC implementation
 */
export function VideoCall({
  roomId,
  patientName = 'Paciente',
  therapistName = 'Dr(a).',
  onJoin,
  onLeave,
  className,
}: VideoCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle joining the call
  const handleJoin = useCallback(() => {
    // Initialize WebRTC connection here
    setIsConnected(true);
    setCallDuration(0);
    onJoin?.();
  }, [onJoin]);

  // Handle leaving the call
  const handleLeave = useCallback(() => {
    setIsConnected(false);
    setCallDuration(0);
    onLeave?.();
  }, [onLeave]);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  // Simulate connection quality changes
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const qualities = ['excellent', 'good', 'fair', 'poor'];
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)] as typeof qualities[0];
      // Bias towards good quality
      setConnectionQuality(Math.random() > 0.3 ? 'good' : randomQuality);
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const signalColor = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    fair: 'text-yellow-500',
    poor: 'text-red-500',
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-900 dark:bg-gray-950', className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn('gap-1', signalColor[connectionQuality], 'border-current')}
          >
            <Signal className="h-3 w-3" />
            {connectionQuality === 'excellent' && 'Excelente'}
            {connectionQuality === 'good' && 'Boa'}
            {connectionQuality === 'fair' && 'Regular'}
            {connectionQuality === 'poor' && 'Ruim'}
          </Badge>
          <div className="flex items-center gap-1 text-gray-300">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatDuration(callDuration)}</span>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Gravando
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {!isConnected ? (
          // Waiting room / Join screen
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md p-8 text-center">
              <CardContent className="space-y-6">
                <Video className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold">Consulta por Telemedicina</h2>
                <p className="text-muted-foreground">
                  Você está prestes a entrar na consulta com {patientName}.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{patientName}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="lg"
                      onClick={handleJoin}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Video className="mr-2 h-5 w-5" />
                      Entrar na Consulta
                    </Button>
                    <Button size="lg" variant="outline" onClick={onLeave}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Active call interface
          <div className="absolute inset-0">
            {/* Remote video (patient) */}
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              {isVideoOff ? (
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl font-bold text-gray-500">
                      {patientName.charAt(0)}
                    </span>
                  </div>
                  <p className="text-gray-500">{patientName}</p>
                </div>
              ) : (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  // Placeholder - would be connected to WebRTC stream
                />
              )}
            </div>

            {/* Local video (self) - Picture in Picture */}
            <div className="absolute bottom-24 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                // Placeholder - would be connected to WebRTC stream
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* Screen share preview */}
            {isScreenSharing && (
              <div className="absolute bottom-24 left-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
                <video
                  ref={screenShareRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Chat sidebar */}
            {showChat && (
              <div className="absolute right-0 top-0 bottom-24 w-80 bg-gray-800/95 backdrop-blur-sm border-l border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Chat</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-300"
                    onClick={() => setShowChat(false)}
                  >
                    ×
                  </Button>
                </div>
                <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-48">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-sm text-gray-300">Mensagem do paciente...</p>
                    <span className="text-xs text-gray-500">10:30</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" className="bg-primary">
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Controls */}
        {isConnected && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
            <div className="flex items-center justify-center gap-2">
              <Button
                size="lg"
                variant={isMuted ? 'destructive' : 'ghost'}
                className={cn(
                  'rounded-full w-14 h-14',
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                )}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              <Button
                size="lg"
                variant={isVideoOff ? 'destructive' : 'ghost'}
                className={cn(
                  'rounded-full w-14 h-14',
                  isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                )}
                onClick={() => setIsVideoOff(!isVideoOff)}
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className={cn(
                  'rounded-full w-14 h-14 bg-gray-700 hover:bg-gray-600',
                  isScreenSharing && 'bg-primary'
                )}
                onClick={() => setIsScreenSharing(!isScreenSharing)}
              >
                {isScreenSharing ? (
                  <MonitorUp className="h-6 w-6" />
                ) : (
                  <Monitor className="h-6 w-6" />
                )}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className={cn(
                  'rounded-full w-14 h-14 bg-gray-700 hover:bg-gray-600',
                  isRecording && 'bg-red-500'
                )}
                onClick={() => setIsRecording(!isRecording)}
              >
                <div className={cn('w-3 h-3 rounded-full bg-red-500', !isRecording && 'opacity-50')} />
              </Button>

              <div className="w-px h-12 bg-gray-700 mx-2" />

              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-16 h-16"
                onClick={handleLeave}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact waiting room component
 */
export function WaitingRoom({
  appointmentTime,
  patientName,
  onEnter,
  onCancel,
}: {
  appointmentTime: Date;
  patientName: string;
  onEnter: () => void;
  onCancel: () => void;
}) {
  const [timeUntil, setTimeUntil] = useState(0);

  useEffect(() => {
    const calculateTimeUntil = () => {
      const now = new Date();
      const diff = appointmentTime.getTime() - now.getTime();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeUntil(calculateTimeUntil());
    const interval = setInterval(calculateTimeUntil, 1000);
    return () => clearInterval(interval);
  }, [appointmentTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">Sala de Espera</h2>
            <p className="text-muted-foreground">
              Sua consulta com {patientName} começará em breve
            </p>
          </div>

          {timeUntil > 0 ? (
            <div className="py-6">
              <p className="text-sm text-muted-foreground mb-2">A consulta começará em</p>
              <p className="text-4xl font-bold text-primary">{formatTime(timeUntil)}</p>
              <Progress value={(1 - timeUntil / 300) * 100} className="mt-4" />
            </div>
          ) : (
            <div className="py-6">
              <p className="text-green-600 font-medium">É hora de começar!</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={onEnter} className="bg-primary">
              <Video className="mr-2 h-5 w-5" />
              Entrar na Consulta
            </Button>
            <Button size="lg" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>💡 Dica: Use fones de ouvido com microfone para melhor qualidade</p>
            <p className="mt-1">📡 Verifique sua conexão de internet antes de entrar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VideoCall;
