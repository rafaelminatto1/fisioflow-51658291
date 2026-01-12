import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  MessageSquare, Users, Clock, Settings, Maximize,
  Share2, Copy, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TelemedicineRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [notes, setNotes] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch room data
  const { data: room, isLoading } = useQuery({
    queryKey: ['telemedicine-room', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telemedicine_rooms')
        .select(`
          *,
          patients:patient_id (name, email, phone),
          profiles:therapist_id (full_name)
        `)
        .eq('id', roomId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId
  });

  // Start session mutation
  const startSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('telemedicine_rooms')
        .update({
          status: 'ativo',
          started_at: new Date().toISOString()
        })
        .eq('id', roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-room', roomId] });
      setIsConnected(true);
      toast.success('Sessão iniciada!');
    }
  });

  // End session mutation
  const endSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('telemedicine_rooms')
        .update({
          status: 'encerrado',
          ended_at: new Date().toISOString(),
          duration_minutes: Math.floor(elapsedTime / 60),
          notas: notes
        })
        .eq('id', roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      stopMedia();
      toast.success('Sessão encerrada!');
      navigate('/telemedicine');
    }
  });

  // Initialize media stream
  useEffect(() => {
    const initMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(mediaStream);
        if (videoRef.current) {
          // Main video would typically be remote stream, but for local testing:
          // videoRef.current.srcObject = mediaStream; 
        }
        if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing media:', err);
        toast.error('Erro ao acessar câmera/microfone');
      }
    };

    initMedia();

    return () => {
      stopMedia();
    };
  }, []);

  // Timer for session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && room?.status === 'ativo') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, room?.status]);

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/telemedicine-room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Sala não encontrada</h2>
            <p className="text-muted-foreground mb-4">
              O link da sala pode estar incorreto ou expirado.
            </p>
            <Button onClick={() => navigate('/telemedicine')}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          {/* Main Video */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Video overlay controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={room.status === 'ativo' ? 'default' : 'secondary'}>
                  {room.status === 'ativo' ? 'Ao Vivo' : 'Aguardando'}
                </Badge>
                {isConnected && (
                  <Badge variant="outline" className="text-white border-white">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(elapsedTime)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant={isAudioOn ? 'secondary' : 'destructive'}
                  onClick={toggleAudio}
                >
                  {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>

                <Button
                  size="icon"
                  variant={isVideoOn ? 'secondary' : 'destructive'}
                  onClick={toggleVideo}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyRoomLink}
                >
                  <Share2 className="h-5 w-5" />
                </Button>

                {room.status === 'aguardando' ? (
                  <Button onClick={() => startSession.mutate()} className="bg-success hover:bg-success/90">
                    <Phone className="h-5 w-5 mr-2" />
                    Iniciar
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => endSession.mutate()}
                  >
                    <PhoneOff className="h-5 w-5 mr-2" />
                    Encerrar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Self video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-muted rounded-lg overflow-hidden shadow-lg border-2 border-primary/20">
            <video
              ref={selfVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Teleconsulta</h2>
            <p className="text-sm text-muted-foreground">
              Sala: {room.room_code || roomId}
            </p>
          </div>

          {/* Patient Info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{(room.patients as any)?.name || 'Paciente'}</p>
                <p className="text-sm text-muted-foreground">
                  {(room.patients as any)?.phone || 'Sem telefone'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex-1 p-4 flex flex-col">
            <label className="text-sm font-medium mb-2">
              Anotações da Sessão
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anote observações importantes durante a sessão..."
              className="flex-1 resize-none"
            />
          </div>

          {/* Session Info */}
          <div className="p-4 border-t bg-muted/30">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{room.status}</span>
              </div>
              {room.started_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início:</span>
                  <span>{format(new Date(room.started_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terapeuta:</span>
                <span>{(room.profiles as any)?.full_name || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemedicineRoom;
