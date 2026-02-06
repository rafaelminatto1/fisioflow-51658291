import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {

  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor, MonitorOff,
  Settings, Maximize2, Users, MessageSquare, Share2, ScreenShare
} from 'lucide-react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

export type VideoProvider = 'builtin' | 'whereby' | 'twilio' | 'agora' | 'daily';

interface VideoIntegrationConfig {
  provider: VideoProvider;
  apiKey?: string;
  roomUrl?: string;
  enableRecording?: boolean;
  enableChat?: boolean;
  enableScreenShare?: boolean;
}

interface VideoCallProps {
  roomId: string;
  patientName: string;
  config?: VideoIntegrationConfig;
  onJoin?: () => void;
  onLeave?: () => void;
  onError?: (error: Error) => void;
}

export function useVideoIntegration(config?: VideoIntegrationConfig) {
  const [provider, setProvider] = useState<VideoProvider>(config?.provider || 'builtin');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se a API do provedor está disponível
    if (provider === 'whereby') {
      const wherebyEmbed = (window as Window & { WherebyEmbed?: { new: (element: HTMLElement, config: Record<string, unknown>) => { on: (event: string, callback: () => void) => void } } }).WherebyEmbed;
      if (!wherebyEmbed && !config?.roomUrl) {
        setError('Whereby não está configurado');
        return;
      }
      setIsReady(true);
    } else if (provider === 'twilio') {
      const Twilio = (window as Window & { Twilio?: unknown }).Twilio;
      if (!Twilio && !config?.apiKey) {
        setError('Twilio não está configurado');
        return;
      }
      setIsReady(true);
    } else {
      setIsReady(true);
    }
  }, [provider, config]);

  return {
    provider,
    setProvider,
    isReady,
    error,
    canRecord: provider !== 'builtin',
    supportsChat: provider !== 'builtin',
    supportsScreenShare: provider !== 'builtin',
  };
}

// Componente de videochamada embutido
export function VideoCall({
  roomId,
  patientName,
  config,
  onJoin,
  onLeave,
  onError
}: VideoCallProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const { provider, isReady, error, canRecord, supportsChat, supportsScreenShare } = useVideoIntegration(config);

  // Inicializar mídia local
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        logger.error('Erro ao acessar mídia', err, 'VideoIntegrationProvider');
        toast.error('Não foi possível acessar câmera e microfone');
        onError?.(err as Error);
      }
    };

    if (provider === 'builtin') {
      initMedia();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [provider]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (screenRef.current) {
        screenRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        if (screenRef.current) {
          screenRef.current.srcObject = null;
        }
      };
    } catch (err) {
      toast.error('Não foi possível compartilhar tela');
    }
  };

  const stopScreenShare = () => {
    if (screenRef.current?.srcObject) {
      const stream = screenRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      screenRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
  };

  const joinCall = () => {
    setIsConnected(true);
    onJoin?.();
    toast.success('Conectado à chamada');
  };

  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenRef.current?.srcObject) {
      const stream = screenRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsConnected(false);
    onLeave?.();
    toast.success('Chamada encerrada');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao inicializar vídeo: {error}
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Integração com Whereby
  if (provider === 'whereby' && config?.roomUrl) {
    return (
      <div className="space-y-4">
        <WherebyEmbed roomUrl={config.roomUrl} onJoin={onJoin} onLeave={onLeave} />
      </div>
    );
  }

  // Video nativo
  return (
    <div className="space-y-4">
      {/* Área de vídeo principal */}
      <Card className="relative overflow-hidden bg-black aspect-video">
        {!isConnected ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <p className="text-lg font-medium">{patientName}</p>
            <p className="text-sm text-white/60">Aguardando conexão...</p>
            <Button
              onClick={joinCall}
              className="mt-6 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Entrar na Chamada
            </Button>
          </div>
        ) : (
          <>
            {/* Vídeo do paciente */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              className={cn(
                "w-full h-full object-cover",
                !isVideoOn && "hidden"
              )}
            />

            {/* Vídeo da tela compartilhada */}
            {isScreenSharing && screenRef.current?.srcObject && (
              <video
                ref={screenRef}
                autoPlay
                playsInline
                className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] bg-black rounded-lg border-2 border-primary"
              />
            )}

            {/* Self view (PIP) */}
            {localStream && (
              <div className="absolute top-4 right-4 w-40 h-32 bg-muted rounded-lg overflow-hidden shadow-lg border-2 border-primary/20">
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => {
                    if (el && localStream) {
                      el.srcObject = localStream;
                    }
                  }}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              </div>
            )}

            {/* Status e Timer */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">
                Ao Vivo
              </Badge>
              {isConnected && (
                <Badge variant="outline" className="text-white border-white">
                  {formatTime(elapsedTime)}
                </Badge>
              )}
            </div>

            {/* Controles */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant={isAudioOn ? 'secondary' : 'destructive'}
                  onClick={toggleAudio}
                  className="rounded-full h-12 w-12"
                >
                  {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>

                <Button
                  size="icon"
                  variant={isVideoOn ? 'secondary' : 'destructive'}
                  onClick={toggleVideo}
                  className="rounded-full h-12 w-12"
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>

                {supportsScreenShare && (
                  <Button
                    size="icon"
                    variant={isScreenSharing ? 'default' : 'secondary'}
                    onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                    className="rounded-full h-12 w-12"
                  >
                    {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full h-12 w-12"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>

                <Button
                  size="icon"
                  variant="destructive"
                  onClick={leaveCall}
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Indicador de gravação */}
      {canRecord && config?.enableRecording && isConnected && (
        <Alert>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm">Esta chamada está sendo gravada</span>
          </div>
        </Alert>
      )}
    </div>
  );
}

// Componente de embed do Whereby
function WherebyEmbed({
  roomUrl,
  onJoin,
  onLeave
}: {
  roomUrl: string;
  onJoin?: () => void;
  onLeave?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Carregar script do Whereby
    const script = document.createElement('script');
    script.src = 'https://whereby.com/embed/v1.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (isLoaded && containerRef.current && (window as Window & { WherebyEmbed?: { new: (element: HTMLElement, config: Record<string, unknown>) => { on: (event: string, callback: () => void) => void } } }).WherebyEmbed) {
      const embed = new (window as Window & { WherebyEmbed?: { new: (element: HTMLElement, config: Record<string, unknown>) => { on: (event: string, callback: () => void) => void } } }).WherebyEmbed(containerRef.current, {
        roomUrl,
        title: 'Consulta Online',
        participantCount: 'none',
        chat: { enabled: false },
        leaveButton: { enabled: true, position: 'controlBar' },
        locale: 'pt-BR',
      });

      embed.on('ready', () => {
        onJoin?.();
      });

      embed.on('leave', () => {
        onLeave?.();
      });
    }
  }, [isLoaded, roomUrl, onJoin, onLeave]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full h-[500px] rounded-lg overflow-hidden" />
    </div>
  );
}

// Configuração de integração
export function VideoIntegrationSettings({
  config,
  onSave
}: {
  config?: VideoIntegrationConfig;
  onSave?: (config: VideoIntegrationConfig) => void;
}) {
  const [provider, setProvider] = useState<VideoProvider>(config?.provider || 'builtin');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [enableRecording, setEnableRecording] = useState(config?.enableRecording || false);

  const providers: { value: VideoProvider; label: string; description: string }[] = [
    { value: 'builtin', label: 'Nativo', description: 'Usar WebRTC nativo do navegador' },
    { value: 'whereby', label: 'Whereby', description: 'Integração com Whereby Embed' },
    { value: 'twilio', label: 'Twilio Video', description: 'Integração com Twilio Programmable Video' },
    { value: 'agora', label: 'Agora.io', description: 'Integração com Agora Video SDK' },
    { value: 'daily', label: 'Daily.co', description: 'Integração com Daily video APIs' },
  ];

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Configuração de Videochamada</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provedor de Vídeo</label>
            <div className="grid grid-cols-1 gap-2">
              {providers.map(p => (
                <button
                  key={p.value}
                  onClick={() => setProvider(p.value)}
                  className={cn(
                    "p-4 text-left border rounded-lg transition-colors",
                    provider === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-sm text-muted-foreground">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {provider !== 'builtin' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira sua API Key"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Gravar chamadas</p>
              <p className="text-xs text-muted-foreground">
                Salvar automaticamente as teleconsultas
              </p>
            </div>
            <input
              type="checkbox"
              checked={enableRecording}
              onChange={(e) => setEnableRecording(e.target.checked)}
              className="rounded"
            />
          </div>

          <Button
            onClick={() => onSave?.({ provider, apiKey, enableRecording })}
            className="w-full"
          >
            Salvar Configurações
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default VideoCall;
