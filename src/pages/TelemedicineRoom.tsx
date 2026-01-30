/**
 * Telemedicine Room Page - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('telemedicine_rooms') → Firestore collection 'telemedicine_rooms'
 * - Joins with patients and profiles replaced with separate queries
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  Users, Clock, Loader2, Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '@/integrations/firebase/app';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/errors/logger';

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
      if (!roomId) throw new Error('Room ID is required');

      const roomDoc = await getDoc(doc(db, 'telemedicine_rooms', roomId));
      if (!roomDoc.exists()) {
        throw new Error('Sala não encontrada');
      }

      const roomData = { id: roomDoc.id, ...roomDoc.data() };

      // Fetch patient and therapist data separately (manual join)
      const [patientDoc, therapistDoc] = await Promise.all([
        getDoc(doc(db, 'patients', roomData.patient_id)),
        roomData.therapist_id ? getDoc(doc(db, 'profiles', roomData.therapist_id)) : Promise.resolve({ exists: false })
      ]);

      return {
        ...roomData,
        patients: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } : null,
        profiles: therapistDoc.exists() ? { id: therapistDoc.id, ...therapistDoc.data() } : null
      };
    },
    enabled: !!roomId
  });

  // Start session mutation
  const startSession = useMutation({
    mutationFn: async () => {
      if (!roomId) throw new Error('Room ID is required');

      await updateDoc(doc(db, 'telemedicine_rooms', roomId), {
        status: 'ativo',
        started_at: new Date().toISOString()
      });
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
      if (!roomId) throw new Error('Room ID is required');

      await updateDoc(doc(db, 'telemedicine_rooms', roomId), {
        status: 'encerrado',
        ended_at: new Date().toISOString(),
        duration_minutes: Math.floor(elapsedTime / 60),
        notas: notes
      });
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
      } catch (error) {
        logger.error('Error accessing media devices', error, 'TelemedicineRoom');
        toast.error('Não foi possível acessar câmera/microfone');
      }
    };

    initMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

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

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsConnected(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Sala não encontrada</p>
          <Button onClick={() => navigate('/telemedicine')} className="mt-4">
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Telemedicina</h1>
          <Badge variant={room.status === 'ativo' ? 'default' : 'secondary'}>
            {room.status}
          </Badge>
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedTime)}
            </div>
          )}
        </div>
        <Button
          variant="destructive"
          onClick={() => endSession.mutate()}
          disabled={endSession.isPending}
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          Encerrar Sessão
        </Button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="aspect-video bg-black flex items-center justify-center">
              <CardContent className="p-0 flex-1 flex items-center justify-center">
                {!isConnected ? (
                  <div className="text-center text-white">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Aguardando início da sessão...</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
              </CardContent>
            </Card>

            {/* Self Video */}
            {isConnected && (
              <Card className="w-48 h-36 bg-black">
                <CardContent className="p-0 h-full">
                  <video
                    ref={selfVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleVideo}
                    disabled={!isConnected}
                  >
                    {isVideoOn ? <Video /> : <VideoOff />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleAudio}
                    disabled={!isConnected}
                  >
                    {isAudioOn ? <Mic /> : <MicOff />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!isConnected}
                  >
                    <Share2 />
                  </Button>
                  {!isConnected ? (
                    <Button
                      onClick={() => startSession.mutate()}
                      disabled={startSession.isPending}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Iniciar Sessão
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => endSession.mutate()}
                      disabled={endSession.isPending}
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      Encerrar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                {room.patients ? (
                  <div className="space-y-2">
                    <p className="font-medium">{room.patients.name}</p>
                    <p className="text-sm text-muted-foreground">{room.patients.email}</p>
                    <p className="text-sm text-muted-foreground">{room.patients.phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas da Sessão</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione notas sobre a sessão..."
                  rows={6}
                  disabled={!isConnected}
                />
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agendado para:</span>
                  <span>{room.scheduled_at ? format(new Date(room.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span>{isConnected ? formatTime(elapsedTime) : '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemedicineRoom;
