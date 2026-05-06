import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Calendar, User, AlertCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { request } from "@/api/v2";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const BLOCK_REASONS: Record<string, string> = {
  folga: "Folga",
  ferias: "Férias",
  feriado: "Feriado",
  outro: "Outro",
};

interface Member { therapist_id: string; full_name: string; role: string }
interface ScheduleSlot { id: string; therapist_id: string; weekday: number; start_time: string; end_time: string }
interface Block { id: string; therapist_id: string; therapist_name: string; block_date: string; start_time?: string; end_time?: string; reason: string; notes?: string }

function useStaffSchedules() {
  return useQuery<{ members: Member[]; schedules: ScheduleSlot[]; blocks: Block[] }>({
    queryKey: ["staff-schedules"],
    queryFn: async () => {
      const res = await request<{ data: { members: Member[]; schedules: ScheduleSlot[]; blocks: Block[] } }>("/api/staff-schedules");
      return (res as any).data;
    },
  });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Weekly Schedule Editor ────────────────────────────────────────────────────

function WeeklyScheduleEditor({
  member,
  slots,
  onSave,
}: {
  member: Member;
  slots: ScheduleSlot[];
  onSave: (therapistId: string, schedules: { weekday: number; start_time: string; end_time: string }[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ weekday: number; start_time: string; end_time: string }[]>(
    slots.map((s) => ({ weekday: s.weekday, start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5) })),
  );

  const addSlot = () => setDraft((d) => [...d, { weekday: 1, start_time: "08:00", end_time: "17:00" }]);
  const removeSlot = (i: number) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, val: string | number) =>
    setDraft((d) => d.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  if (!editing) {
    return (
      <div
        className="flex flex-wrap gap-1.5 cursor-pointer"
        onClick={() => setEditing(true)}
        title="Clique para editar"
      >
        {slots.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">Sem horário definido — clique para configurar</span>
        ) : (
          slots.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">
              {WEEKDAYS[s.weekday]} {s.start_time.substring(0, 5)}–{s.end_time.substring(0, 5)}
            </Badge>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 border border-primary/30 rounded-xl p-3 bg-primary/5">
      {draft.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select value={String(s.weekday)} onValueChange={(v) => update(i, "weekday", Number(v))}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS_FULL.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="time" value={s.start_time} onChange={(e) => update(i, "start_time", e.target.value)} className="h-8 text-xs w-24" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="time" value={s.end_time} onChange={(e) => update(i, "end_time", e.target.value)} className="h-8 text-xs w-24" />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeSlot(i)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={addSlot}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar horário
        </Button>
        <div className="ml-auto flex gap-1.5">
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(false)}>Cancelar</Button>
          <Button size="sm" className="h-7" onClick={() => { onSave(member.therapist_id, draft); setEditing(false); }}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Block Modal ──────────────────────────────────────────────────────────

function AddBlockModal({
  members,
  onClose,
  onAdd,
}: {
  members: Member[];
  onClose: () => void;
  onAdd: (block: { therapist_id: string; block_date: string; reason: string; notes?: string; start_time?: string; end_time?: string }) => void;
}) {
  const [therapistId, setTherapistId] = useState(members[0]?.therapist_id ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("folga");
  const [notes, setNotes] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const handleSubmit = () => {
    if (!therapistId || !date) { toast({ title: "Preencha todos os campos", variant: "destructive" }); return; }
    onAdd({ therapist_id: therapistId, block_date: date, reason, notes: notes || undefined, start_time: allDay ? undefined : startTime, end_time: allDay ? undefined : endTime });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Bloqueio de Agenda</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs font-bold uppercase">Profissional</Label>
            <Select value={therapistId} onValueChange={setTherapistId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.therapist_id} value={m.therapist_id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold uppercase">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase">Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BLOCK_REASONS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            <Label htmlFor="allDay" className="text-sm cursor-pointer">Dia inteiro</Label>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold uppercase">Início</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Fim</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs font-bold uppercase">Observação</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffSchedulesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useStaffSchedules();
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  const saveWeekly = useMutation({
    mutationFn: ({ therapistId, schedules }: { therapistId: string; schedules: { weekday: number; start_time: string; end_time: string }[] }) =>
      request(`/api/staff-schedules/${therapistId}/weekly`, { method: "PUT", body: JSON.stringify({ schedules }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast({ title: "Escala salva" });
    },
  });

  const addBlock = useMutation({
    mutationFn: (block: any) => request("/api/staff-schedules/blocks", { method: "POST", body: JSON.stringify(block) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      setBlockModalOpen(false);
      toast({ title: "Bloqueio adicionado" });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: (id: string) => request(`/api/staff-schedules/blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-schedules"] }),
  });

  const members = data?.members ?? [];
  const schedules = data?.schedules ?? [];
  const blocks = data?.blocks ?? [];

  const slotsByTherapist = (therapistId: string) =>
    schedules.filter((s) => s.therapist_id === therapistId);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black font-display">Escalas de Trabalho</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Horários semanais e bloqueios de agenda da equipe
            </p>
          </div>
          <Button onClick={() => setBlockModalOpen(true)} variant="outline" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Adicionar Bloqueio
          </Button>
        </div>

        {/* Weekly Schedules */}
        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Horários Semanais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum profissional encontrado</p>
            ) : (
              members.map((m) => (
                <div key={m.therapist_id} className="flex items-start gap-4">
                  <div className="flex items-center gap-2.5 w-44 shrink-0 pt-0.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {initials(m.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.full_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <WeeklyScheduleEditor
                      member={m}
                      slots={slotsByTherapist(m.therapist_id)}
                      onSave={(therapistId, scheds) => saveWeekly.mutate({ therapistId, schedules: scheds })}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Blocks */}
        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Bloqueios Programados (próximos 60 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum bloqueio programado</p>
            ) : (
              <div className="space-y-2">
                {blocks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/50 bg-card">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-32">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold truncate">{b.therapist_name}</span>
                      </div>
                      <span className="text-sm font-bold">
                        {new Date(b.block_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      </span>
                      {b.start_time ? (
                        <span className="text-xs text-muted-foreground">
                          {b.start_time.substring(0, 5)}–{b.end_time?.substring(0, 5)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Dia inteiro</span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {BLOCK_REASONS[b.reason] ?? b.reason}
                      </Badge>
                      {b.notes && <span className="text-xs text-muted-foreground italic">{b.notes}</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteBlock.mutate(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {blockModalOpen && (
        <AddBlockModal
          members={members}
          onClose={() => setBlockModalOpen(false)}
          onAdd={(block) => addBlock.mutate(block)}
        />
      )}
    </MainLayout>
  );
}
