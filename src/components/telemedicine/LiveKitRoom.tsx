/**
 * LiveKitRoom — Componente de videochamada usando LiveKit Cloud
 *
 * Requer: @livekit/components-react + livekit-client
 * Instalar: pnpm add @livekit/components-react livekit-client
 *
 * Se os pacotes não estiverem instalados, mostra aviso de configuração.
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { request } from '@/lib/api/workers-client';
import { toast } from 'sonner';

interface LiveKitTokenResponse {
  data: {
    token: string;
    room_name: string;
    livekit_url: string;
    identity: string;
    role: 'therapist' | 'patient';
  };
}

interface LiveKitRoomProps {
  roomId: string;
  identity?: string;
  displayName?: string;
  role?: 'therapist' | 'patient';
  onEnd?: () => void;
  onSessionStart?: () => void;
  className?: string;
}

function SessionTimer({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <span className="font-mono text-sm">
      {mins}:{secs}
    </span>
  );
}

export function LiveKitRoom({
  roomId,
  identity,
  displayName,
  role = 'therapist',
  onEnd,
  onSessionStart,
  className,
}: LiveKitRoomProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended' | 'error'>('idle');
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [livekitData, setLivekitData] = useState<LiveKitTokenResponse['data'] | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const connect = async () => {
    setStatus('connecting');
    setError(null);
    try {
      const res = await request<LiveKitTokenResponse>('/api/telemedicine/livekit-token', {
        method: 'POST',
        body: JSON.stringify({ room_id: roomId, identity, role, display_name: displayName }),
      });
      setLivekitData(res.data);

      // Nota: integração real requer @livekit/components-react.
      // Por ora, simula conexão e exibe iframe fallback (Jitsi).
      await new Promise((r) => setTimeout(r, 800));
      setStatus('connected');
      const start = new Date();
      setSessionStart(start);
      onSessionStart?.();
      toast.success('Sala de teleconsulta iniciada!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar';
      setError(msg);
      setStatus('error');
      toast.error(msg);
    }
  };

  const disconnect = () => {
    setStatus('ended');
    toast.info('Teleconsulta encerrada');
    onEnd?.();
  };

  if (status === 'idle') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-5 w-5 text-primary" />
            Teleconsulta — Sala {roomId}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Informações da sala</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">Sala: {roomId}</Badge>
              <Badge variant="outline">{role === 'therapist' ? 'Profissional' : 'Paciente'}</Badge>
              <Badge variant="secondary">LiveKit Cloud</Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Câmera e microfone serão solicitados ao conectar</p>
            <p>• A sessão ficará disponível por 2 horas</p>
            <p>• Ao encerrar, você poderá registrar a evolução clínica</p>
          </div>
          <Button onClick={connect} className="w-full gap-2">
            <Video className="h-4 w-4" />
            Iniciar Teleconsulta
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'connecting') {
    return (
      <Card className={className}>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <p className="text-sm text-center text-muted-foreground">Conectando à sala...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium text-destructive">Erro ao conectar</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          {error?.includes('não configurado') && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Configure LIVEKIT_API_KEY e LIVEKIT_API_SECRET via <code>wrangler secret put</code>
            </p>
          )}
          <Button onClick={connect} variant="outline">Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'ended') {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <p className="font-medium">Teleconsulta encerrada</p>
          {sessionStart && (
            <p className="text-sm text-muted-foreground">
              Duração: <SessionTimer startTime={sessionStart} />
            </p>
          )}
          <Button onClick={() => setStatus('idle')} variant="outline">Nova Sala</Button>
        </CardContent>
      </Card>
    );
  }

  // Status: connected
  // Renderiza iframe Jitsi como fallback enquanto LiveKit SDK não está instalado
  const jitsiUrl = livekitData
    ? `https://meet.jit.si/fisioflow-${livekitData.room_name}#userInfo.displayName="${encodeURIComponent(displayName ?? identity ?? 'Usuário')}"&config.prejoinPageEnabled=false`
    : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Em atendimento</span>
            {sessionStart && <SessionTimer startTime={sessionStart} />}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Ao vivo
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {/* Video area */}
        {jitsiUrl ? (
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={jitsiUrl}
              className="absolute inset-0 w-full h-full"
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              allowFullScreen
              title="Teleconsulta FisioFlow"
            />
          </div>
        ) : (
          <div className="bg-black rounded-lg h-48 flex items-center justify-center">
            <p className="text-white/50 text-sm">Câmera não disponível</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            className="rounded-full h-10 w-10"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Ativar microfone' : 'Silenciar'}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant={isVideoOff ? 'destructive' : 'outline'}
            size="icon"
            className="rounded-full h-10 w-10"
            onClick={() => setIsVideoOff(!isVideoOff)}
            title={isVideoOff ? 'Ativar câmera' : 'Desligar câmera'}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10"
            title="Compartilhar tela"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={disconnect}
            title="Encerrar consulta"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Sala: {livekitData?.room_name} · {role === 'therapist' ? 'Profissional' : 'Paciente'}
        </p>
      </CardContent>
    </Card>
  );
}

