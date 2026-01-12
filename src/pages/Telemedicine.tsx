import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTelemedicineRooms, useCreateTelemedicineRoom } from '@/hooks/useTelemedicine';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Video, Plus, Clock, Users, Play, Copy, Loader2, Calendar, PhoneCall } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientHelpers } from '@/types';

const Telemedicine = () => {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  
  const { data: rooms, isLoading: roomsLoading } = useTelemedicineRooms();
  const createRoom = useCreateTelemedicineRoom();
  
  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ['patients-for-telemedicine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone')
        .eq('status', 'ativo')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const handleCreateRoom = async () => {
    if (!selectedPatient) {
      toast.error('Selecione um paciente');
      return;
    }
    
    try {
      const result = await createRoom.mutateAsync({ patient_id: selectedPatient });
      setIsCreateOpen(false);
      setSelectedPatient('');
      navigate(`/telemedicine-room/${result.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const copyRoomLink = (roomId: string) => {
    const url = `${window.location.origin}/telemedicine-room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      aguardando: { variant: 'secondary', label: 'Aguardando' },
      ativo: { variant: 'default', label: 'Ao Vivo' },
      encerrado: { variant: 'outline', label: 'Encerrado' }
    };
    const { variant, label } = config[status] || config.aguardando;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const activeRooms = rooms?.filter(r => r.status === 'ativo') || [];
  const waitingRooms = rooms?.filter(r => r.status === 'aguardando') || [];
  const completedRooms = rooms?.filter(r => r.status === 'encerrado') || [];

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Telemedicina</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Realize consultas online com seus pacientes
              </p>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="touch-target">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Nova Consulta</span>
                <span className="xs:hidden">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Nova Teleconsulta</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Crie uma sala de teleconsulta para um paciente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 sm:space-y-4 py-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Paciente</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => {
                        const patientName = PatientHelpers.getName(patient);
                        return (
                        <SelectItem key={patient.id} value={patient.id} className="text-sm">
                          {patientName}
                        </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} size="sm" className="flex-1 sm:flex-auto">
                  Cancelar
                </Button>
                <Button onClick={handleCreateRoom} disabled={createRoom.isPending} size="sm" className="flex-1 sm:flex-auto">
                  {createRoom.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar Sala'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg">
                  <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Ao Vivo</p>
                  <p className="text-lg sm:text-2xl font-bold">{activeRooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Aguardando</p>
                  <p className="text-lg sm:text-2xl font-bold">{waitingRooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-border">
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Concluídas</p>
                  <p className="text-lg sm:text-2xl font-bold">{completedRooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
                  <p className="text-lg sm:text-2xl font-bold">{rooms?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rooms List */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Salas de Teleconsulta</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Gerencie suas consultas online</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {roomsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : rooms?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                <p className="text-xs sm:text-sm">Nenhuma teleconsulta criada ainda</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setIsCreateOpen(true)}
                >
                  Criar primeira consulta
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                {rooms?.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-2 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{(room.patients as any)?.name || 'Paciente'}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          Código: {room.room_code}
                          {room.created_at && (
                            <> • {format(new Date(room.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                      {getStatusBadge(room.status)}

                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 touch-target"
                        onClick={() => copyRoomLink(room.id)}
                      >
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>

                      {room.status !== 'encerrado' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/telemedicine-room/${room.id}`)}
                          className="text-xs sm:text-sm touch-target"
                        >
                          <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                          <span className="hidden xs:inline">Entrar</span>
                          <span className="xs:hidden">Entrar</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Telemedicine;
