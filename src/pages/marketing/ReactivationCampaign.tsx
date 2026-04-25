/**
 * Campanha de Reativação de Pacientes via WhatsApp
 * Lista pacientes inativos e permite envio em massa de mensagens de recall
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCheck,
  Send,
  Loader2,
  Phone,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { marketingApi } from "@/api/v2";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtRiskPatient {
  id: string;
  full_name: string;
  phone: string;
  last_appointment: string | null;
  missed_count: number;
  recent_exercises: number;
}

const DEFAULT_TEMPLATE = `Olá, {{nome}}! 😊

Sentimos sua falta na clínica! Já faz um tempo desde a sua última consulta.

Que tal agendarmos uma sessão para continuarmos cuidando da sua saúde?

Entre em contato ou acesse nosso link de agendamento para marcar seu horário.

Abraços,
Equipe FisioFlow 💙`;

export default function ReactivationCampaign() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const {
    data: patients = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["at-risk-patients"],
    queryFn: async () => {
      const res = await marketingApi.atRiskPatients();
      return res.data as AtRiskPatient[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["recall-campaigns"],
    queryFn: async () => {
      const res = await marketingApi.recallCampaigns.list();
      return res.data ?? [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient) throw new Error("Paciente não encontrado");
      const message = template.replace("{{nome}}", patient.full_name.split(" ")[0]);
      return marketingApi.sendWhatsAppTemplate({
        patient_id: patientId,
        template_key: "recall",
        variables: { nome: patient.full_name.split(" ")[0], mensagem: message },
      });
    },
    onSuccess: (_, patientId) => {
      setSentIds((prev) => new Set(prev).add(patientId));
    },
  });

  const handleSelectAll = () => {
    if (selected.size === patients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(patients.map((p) => p.id)));
    }
  };

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendSelected = async () => {
    const toSend = [...selected].filter((id) => !sentIds.has(id));
    if (toSend.length === 0) {
      toast({ title: "Nenhum paciente novo selecionado" });
      return;
    }
    let success = 0;
    let failed = 0;
    for (const id of toSend) {
      try {
        await sendMutation.mutateAsync(id);
        success++;
      } catch {
        failed++;
      }
    }
    toast({
      title: `${success} mensagens enviadas${failed > 0 ? `, ${failed} com erro` : ""}`,
      variant: failed > 0 && success === 0 ? "destructive" : "default",
    });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["at-risk-patients"] });
  };

  const unsentSelected = [...selected].filter((id) => !sentIds.has(id));

  return (
    <MainLayout compactPadding>
      <div className="p-4 space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <MessageSquare className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Reativação de Pacientes</h1>
              <p className="text-xs text-muted-foreground">
                Envie WhatsApp para pacientes inativos e recupere atendimentos
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{patients.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Em risco
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{selected.size}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Selecionados
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{sentIds.size}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Enviados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Patient list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Pacientes Inativos</h2>
              {patients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={handleSelectAll}
                >
                  {selected.size === patients.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : patients.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <CheckCheck className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium text-sm">Nenhum paciente em risco</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos os pacientes estão com acompanhamento em dia!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {patients.map((patient) => {
                  const isSent = sentIds.has(patient.id);
                  const isChecked = selected.has(patient.id);
                  return (
                    <Card
                      key={patient.id}
                      className={`border shadow-sm cursor-pointer transition-colors ${isChecked ? "border-primary bg-primary/5" : ""} ${isSent ? "opacity-60" : ""}`}
                      onClick={() => !isSent && handleToggle(patient.id)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          disabled={isSent}
                          onCheckedChange={() => !isSent && handleToggle(patient.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{patient.full_name}</p>
                            {isSent && (
                              <Badge className="rounded-lg text-[10px] bg-emerald-100 text-emerald-700 shrink-0">
                                Enviado
                              </Badge>
                            )}
                            {patient.missed_count >= 2 && !isSent && (
                              <Badge
                                variant="outline"
                                className="rounded-lg text-[10px] border-red-200 text-red-600 shrink-0"
                              >
                                {patient.missed_count} faltas
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {patient.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </span>
                            )}
                            {patient.last_appointment && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDistanceToNow(parseISO(patient.last_appointment), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        {sendMutation.isPending && selected.has(patient.id) && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Template editor + send */}
          <div className="space-y-3">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Mensagem de Recall</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto da mensagem</Label>
                  <Textarea
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    rows={10}
                    className="text-xs resize-none"
                    placeholder="Use {{nome}} para o nome do paciente"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Use <code className="bg-muted px-1 rounded">{"{{nome}}"}</code> para inserir o
                    nome do paciente
                  </p>
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={unsentSelected.length === 0 || sendMutation.isPending}
                  onClick={handleSendSelected}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar para {unsentSelected.length || 0} paciente
                  {unsentSelected.length !== 1 ? "s" : ""}
                </Button>
              </CardContent>
            </Card>

            {/* Saved campaigns */}
            {campaigns.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Campanhas Salvas</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {campaigns.slice(0, 5).map((c: Record<string, unknown>) => (
                    <button
                      key={c.id as string}
                      className="w-full text-left p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                      onClick={() => setTemplate((c.message_template as string) ?? template)}
                    >
                      <p className="text-xs font-medium truncate">{c.name as string}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.message_template as string}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
