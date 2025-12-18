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
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Telemedicina</h1>
              <p className="text-muted-foreground">
                Realize consultas online com seus pacientes
              </p>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Consulta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Teleconsulta</DialogTitle>
                <DialogDescription>
                  Crie uma sala de teleconsulta para um paciente
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRoom} disabled={createRoom.isPending}>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <PhoneCall className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ao Vivo</p>
                  <p className="text-2xl font-bold">{activeRooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                  <p className="text-2xl font-bold">{waitingRooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold">{completedRooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{rooms?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rooms List */}
        <Card>
          <CardHeader>
            <CardTitle>Salas de Teleconsulta</CardTitle>
            <CardDescription>Gerencie suas consultas online</CardDescription>
          </CardHeader>
          <CardContent>
            {roomsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : rooms?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma teleconsulta criada ainda</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => setIsCreateOpen(true)}
                >
                  Criar primeira consulta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rooms?.map((room) => (
                  <div 
                    key={room.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{(room.patients as any)?.name || 'Paciente'}</p>
                        <p className="text-sm text-muted-foreground">
                          Código: {room.room_code}
                          {room.created_at && (
                            <> • {format(new Date(room.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(room.status)}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyRoomLink(room.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      {room.status !== 'encerrado' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/telemedicine-room/${room.id}`)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Entrar
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
