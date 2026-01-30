import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

interface VideoConsultationProps {
  patientName?: string;
  onEndCall?: () => void;
}

export const VideoConsultation: React.FC<VideoConsultationProps> = ({ 
  patientName = "Paciente",
  onEndCall 
}) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
      
      setIsCallActive(true);
      toast({
        title: "Chamada iniciada",
        description: "Conectando com o paciente...",
      });
    } catch (error) {
      logger.error('Erro ao acessar mídia', error, 'VideoConsultation');
      toast({
        title: "Erro",
        description: "Não foi possível acessar câmera/microfone",
        variant: "destructive",
      });
    }
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCallActive(false);
    onEndCall?.();
    toast({
      title: "Chamada encerrada",
      description: "A consulta foi finalizada",
    });
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Teleconsulta - {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vídeo Local */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-background/80 px-3 py-1 rounded-full text-sm">
              Você
            </div>
          </div>

          {/* Vídeo Remoto */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-background/80 px-3 py-1 rounded-full text-sm">
              {patientName}
            </div>
            {!isCallActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-4">
          {!isCallActive ? (
            <Button onClick={startCall} className="bg-primary">
              <Video className="w-4 h-4 mr-2" />
              Iniciar Chamada
            </Button>
          ) : (
            <>
              <Button
                variant={isVideoOn ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleVideo}
              >
                {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>

              <Button
                variant={isAudioOn ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleAudio}
              >
                {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>

              <Button variant="outline" size="icon">
                <MessageSquare className="w-4 h-4" />
              </Button>

              <Button variant="destructive" onClick={endCall}>
                <PhoneOff className="w-4 h-4 mr-2" />
                Encerrar
              </Button>
            </>
          )}
        </div>

        {isCallActive && (
          <div className="text-center text-sm text-muted-foreground">
            Duração: 00:00:00
          </div>
        )}
      </CardContent>
    </Card>
  );
};
