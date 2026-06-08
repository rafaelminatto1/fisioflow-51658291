import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTelemedicineRooms, useCreateTelemedicineRoom } from "@/hooks/useTelemedicine";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video, Plus, Clock, Users, Play, Copy, Loader2, Calendar, PhoneCall } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PatientHelpers } from "@/types";
import { patientsApi } from "@/api/v2";

interface PatientListItem {
  id: string;
  full_name: string;
  status: string;
}

const Telemedicine = () => {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");

  const { data: rooms, isLoading: roomsLoading } = useTelemedicineRooms();
  const createRoom = useCreateTelemedicineRoom();

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ["patients-for-telemedicine"],
    queryFn: async () => {
      const res = await patientsApi.list({ status: "ativo", limit: 200, minimal: true });
      return (res?.data ?? []) as PatientListItem[];
    },
  });

  const handleCreateRoom = async () => {
    if (!selectedPatient) {
      toast.error("Selecione um paciente");
      return;
    }

    try {
      const result = await createRoom.mutateAsync({
        patient_id: selectedPatient,
      });
      setIsCreateOpen(false);
      setSelectedPatient("");
      navigate(`/telemedicine-room/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  const copyRoomLink = (roomId: string) => {
    const url = `${window.location.origin}/telemedicine-room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      aguardando: { variant: "secondary", label: "Aguardando" },
      ativo: { variant: "default", label: "Ao Vivo" },
      encerrado: { variant: "outline", label: "Encerrado" },
    };
    const { variant, label } = config[status] || config.aguardando;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const activeRooms = rooms?.filter((r) => r.status === "ativo") || [];
  const waitingRooms = rooms?.filter((r) => r.status === "aguardando") || [];
  const completedRooms = rooms?.filter((r) => r.status === "encerrado") || [];

  return (
    <PageLayout>
      <PageHeader
        title="Telemedicina"
        description="Realize consultas online com seus pacientes de forma segura e profissional."
        icon={Video}
        breadcrumb={[{ label: "Telemedicina", href: "/telemedicine" }]}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-10 rounded-2xl px-5 font-bold shadow-sm bg-brand-blue hover:bg-brand-blue/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[32px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-black tracking-tight">
                  Nova Teleconsulta
                </DialogTitle>
                <DialogDescription>
                  Crie uma sala de teleconsulta para um paciente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger className="h-12 rounded-2xl border-brand-blue/10 bg-brand-blue/5">
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {patients?.map((patient) => {
                        const patientName = PatientHelpers.getName(patient);
                        return (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patientName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl font-bold border-brand-blue/20"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={createRoom.isPending}
                  className="rounded-2xl font-bold bg-brand-blue hover:bg-brand-blue/90"
                >
                  {createRoom.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Criar Sala"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <PageContainer>
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-[28px] border-none bg-emerald-500/5 shadow-none dark:bg-emerald-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl">
                    <PhoneCall className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70 dark:text-emerald-400/70">
                      Ao Vivo
                    </p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {activeRooms.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-none bg-amber-500/5 shadow-none dark:bg-amber-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-2xl">
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70 dark:text-amber-400/70">
                      Aguardando
                    </p>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                      {waitingRooms.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-none bg-slate-500/5 shadow-none dark:bg-slate-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-500/10 rounded-2xl">
                    <Calendar className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600/70 dark:text-slate-400/70">
                      Concluídas
                    </p>
                    <p className="text-3xl font-black text-slate-600 dark:text-slate-400">
                      {completedRooms.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-none bg-brand-blue/5 shadow-none dark:bg-brand-blue/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-blue/10 rounded-2xl">
                    <Users className="h-6 w-6 text-brand-blue" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue/70 dark:text-brand-blue/70">
                      Total
                    </p>
                    <p className="text-3xl font-black text-brand-blue">{rooms?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rooms List */}
          <Card className="rounded-[32px] border-brand-blue/10 bg-card shadow-premium dark:bg-slate-950/50">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black tracking-tight">
                Salas de Teleconsulta
              </CardTitle>
              <CardDescription>
                Gerencie suas consultas online e envie os links para seus pacientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              {roomsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : rooms?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-xs sm:text-sm">Nenhuma teleconsulta criada ainda</p>
                  <Button variant="link" className="mt-2" onClick={() => setIsCreateOpen(true)}>
                    Criar primeira consulta
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-4">
                  {rooms?.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-brand-blue/5 bg-brand-blue/5 hover:bg-brand-blue/10 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm dark:bg-slate-900 group-hover:scale-110 transition-transform duration-300">
                          <Video className="h-6 w-6 text-brand-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {(room.patients as { name: string } | null)?.name || "Paciente"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                            <span className="font-mono text-brand-blue">{room.room_code}</span>
                            {room.created_at && (
                              <>
                                <span>•</span>
                                <span>
                                  {format(new Date(room.created_at), "dd/MM 'às' HH:mm", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(room.status)}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl hover:bg-brand-blue/10 text-brand-blue"
                          aria-label="Copiar link da sala"
                          onClick={() => copyRoomLink(room.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {room.status !== "encerrado" && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/telemedicine-room/${room.id}`)}
                            className="rounded-xl font-bold bg-brand-blue hover:bg-brand-blue/90 shadow-sm"
                          >
                            <Play className="h-4 w-4 mr-2" />
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
      </PageContainer>
    </PageLayout>
  );
};

export default Telemedicine;
