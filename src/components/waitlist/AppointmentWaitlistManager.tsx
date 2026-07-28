import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Clock,
  AlertCircle,
  Calendar,
  X,
  Edit,
  MoreVertical,
  Phone,
  Mail,
  Bell,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useDebounce } from "@/hooks/performance/useDebounce";
import {
  useAppointmentWaitlist,
  useRemoveFromAppointmentWaitlist,
  useNotifyAppointmentWaitlist,
  useFulfillAppointmentWaitlist,
  useDeclineAppointmentWaitlist,
  type AppointmentWaitlistEntry,
  getWaitlistStatusLabel,
  getWaitlistStatusColor,
  formatWaitlistTime,
} from "@/hooks/useAppointmentWaitlist";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/patients/usePatients";
import { useNavigate } from "react-router-dom";

export function AppointmentWaitlistManager() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("waiting");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: waitlist = [], isLoading: loading } = useAppointmentWaitlist({
    date: selectedDate,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: patients = [] } = usePatients();

  const { mutate: removeFromWaitlist, isPending: isRemoving } = useRemoveFromAppointmentWaitlist();
  const { mutate: notifyWaitlist, isPending: isNotifying } = useNotifyAppointmentWaitlist();
  const { mutate: fulfillWaitlist, isPending: isFulfilling } = useFulfillAppointmentWaitlist();
  const { mutate: declineWaitlist, isPending: isDeclining } = useDeclineAppointmentWaitlist();

  const filteredWaitlist = useMemo(() => {
    return waitlist.filter((entry) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        entry.patient_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        entry.patient_phone?.includes(debouncedSearchQuery) ||
        (entry.patient_id && patients.find((p) => p.id === entry.patient_id)?.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [waitlist, debouncedSearchQuery, patients]);

  const stats = useMemo(
    () => ({
      total: waitlist.length,
      waiting: waitlist.filter((w) => w.status === "waiting").length,
      notified: waitlist.filter((w) => w.status === "notified").length,
      fulfilled: waitlist.filter((w) => w.status === "fulfilled").length,
    }),
    [waitlist],
  );

  const handleChangeDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleNotify = useCallback((entry: AppointmentWaitlistEntry) => {
    notifyWaitlist(entry.id);
  }, [notifyWaitlist]);

  const handleFulfill = useCallback((entry: AppointmentWaitlistEntry) => {
    fulfillWaitlist(entry.id);
  }, [fulfillWaitlist]);

  const handleDecline = useCallback((entry: AppointmentWaitlistEntry) => {
    declineWaitlist(entry.id);
  }, [declineWaitlist]);

  const handleDelete = useCallback(() => {
    if (deleteId) {
      removeFromWaitlist(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, removeFromWaitlist]);

  const handleScheduleNow = useCallback((entry: AppointmentWaitlistEntry) => {
    const params = new URLSearchParams({
      date: entry.target_date,
      time: formatWaitlistTime(entry.target_time),
    });
    if (entry.patient_id) {
      params.set("patient", entry.patient_id);
    }
    navigate(`/schedule?${params.toString()}`);
  }, [navigate]);

  const getPatient = (patientId: string | null) => {
    if (!patientId) return null;
    return patients.find((p) => p.id === patientId) || null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Fila de Espera por Horário</h2>
          <p className="text-sm text-muted-foreground">Gerencie pacientes aguardando vagas específicas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleChangeDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-[160px]">
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="waiting">Aguardando</SelectItem>
              <SelectItem value="notified">Notificado</SelectItem>
              <SelectItem value="fulfilled">Agendado</SelectItem>
              <SelectItem value="declined">Recusou</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Aguardando</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.waiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Notificados</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.notified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Agendados</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.fulfilled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Espera - {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR })}</CardTitle>
              <CardDescription>{filteredWaitlist.length} paciente(s) na fila</CardDescription>
            </div>
            <div className="relative flex-1 sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                aria-label="Buscar paciente na lista de espera"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando lista de espera...</div>
              ) : filteredWaitlist.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente na fila para este dia"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWaitlist.map((entry, index) => {
                    const patient = getPatient(entry.patient_id);
                    const statusLabel = getWaitlistStatusLabel(entry.status);
                    const statusColor = getWaitlistStatusColor(entry.status);

                    return (
                      <Card key={entry.id} className="hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="font-semibold truncate">
                                    {entry.patient_name || patient?.fullName || "Paciente não identificado"}
                                  </h4>
                                  <Badge variant="outline" className={cn(statusColor)}>
                                    {statusLabel}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatWaitlistTime(entry.target_time)}
                                  </span>

                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {entry.patient_phone || patient?.phone || "—"}
                                  </span>

                                  {patient?.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {patient.email}
                                    </span>
                                  )}

                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {entry.type === "evaluation" ? "Avaliação" : entry.type === "group" ? "Grupo" : "Sessão"}
                                  </span>
                                </div>

                                {entry.notified_at && (
                                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                    Notificado em {formatDistanceToNow(new Date(entry.notified_at), { addSuffix: true, locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                              {entry.status === "waiting" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleNotify(entry)}
                                    disabled={isNotifying}
                                    className="hidden sm:flex"
                                  >
                                    <Bell className="h-4 w-4 mr-2" />
                                    Notificar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleFulfill(entry)}
                                    disabled={isFulfilling}
                                    className="hidden sm:flex"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Agendar
                                  </Button>
                                </>
                              )}
                              {entry.status === "notified" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleScheduleNow(entry)}
                                    disabled={isFulfilling}
                                    className="hidden sm:flex"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Agendar Agora
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDecline(entry)}
                                    disabled={isDeclining}
                                    className="hidden sm:flex"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Recusou
                                  </Button>
                                </>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="sm:hidden" onClick={() => handleNotify(entry)} disabled={entry.status !== "waiting" || isNotifying}>
                                    <Bell className="h-4 w-4 mr-2" />
                                    Notificar Paciente
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="sm:hidden" onClick={() => handleFulfill(entry)} disabled={entry.status !== "waiting" || isFulfilling}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Marcar como Agendado
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="sm:hidden" onClick={() => handleDecline(entry)} disabled={entry.status !== "notified" || isDeclining}>
                                    <X className="h-4 w-4 mr-2" />
                                    Marcar como Recusou
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteId(entry.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remover da Fila
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Fila</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este paciente da lista de espera?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {isRemoving ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AppointmentWaitlistManager;