/**
 * NFSeContent — Gestão de Notas Fiscais de Serviços Eletrônicas
 * Padrão ABRASF — usado pela Prefeitura de São Paulo e maioria dos municípios
 */
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Send,
  X,
  Settings,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  useNFSeRecords,
  useNFSeConfig,
  useSaveNFSeConfig,
  useGenerateNFSe,
  useSendNFSe,
  useCancelNFSe,
  type NFSeRecord,
  type NFSeConfig,
} from "@/hooks/useNFSe";

function statusBadge(status: NFSeRecord["status"]) {
  const map: Record<
    NFSeRecord["status"],
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    rascunho: { label: "Rascunho", variant: "outline" },
    enviado: { label: "Enviado", variant: "secondary" },
    autorizado: { label: "Autorizada", variant: "default" },
    cancelado: { label: "Cancelada", variant: "destructive" },
    erro: { label: "Erro", variant: "destructive" },
  };
  const { label, variant } = map[status] ?? {
    label: status,
    variant: "outline",
  };
  return <Badge variant={variant}>{label}</Badge>;
}

function statusIcon(status: NFSeRecord["status"]) {
  switch (status) {
    case "autorizado":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "enviado":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "cancelado":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "erro":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

// ===== EMISSÃO MODAL =====

interface EmitModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId?: string;
  appointmentId?: string;
}

function EmitModal({ open, onOpenChange, patientId, appointmentId }: EmitModalProps) {
  const generate = useGenerateNFSe();
  const [form, setForm] = useState({
    valor_servico: "",
    discriminacao: "Serviços de Fisioterapia",
    tomador_nome: "",
    tomador_cpf_cnpj: "",
    tomador_email: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.valor_servico || !form.tomador_nome || !form.discriminacao) return;
    generate.mutate(
      {
        patient_id: patientId,
        appointment_id: appointmentId,
        valor_servico: Number(form.valor_servico),
        discriminacao: form.discriminacao,
        tomador_nome: form.tomador_nome,
        tomador_cpf_cnpj: form.tomador_cpf_cnpj || undefined,
        tomador_email: form.tomador_email || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Emitir NFS-e
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Tomador (Nome do Paciente/Responsável) *</Label>
            <Input
              value={form.tomador_nome}
              onChange={(e) => update("tomador_nome", e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>CPF/CNPJ</Label>
              <Input
                value={form.tomador_cpf_cnpj}
                onChange={(e) => update("tomador_cpf_cnpj", e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input
                value={form.tomador_email}
                onChange={(e) => update("tomador_email", e.target.value)}
                type="email"
                placeholder="email@..."
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor do Serviço (R$) *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.valor_servico}
              onChange={(e) => update("valor_servico", e.target.value)}
              placeholder="150.00"
            />
          </div>
          <div className="space-y-1">
            <Label>Discriminação do Serviço *</Label>
            <Textarea
              value={form.discriminacao}
              onChange={(e) => update("discriminacao", e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={generate.isPending || !form.valor_servico || !form.tomador_nome}
          >
            {generate.isPending ? "Gerando..." : "Gerar RPS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== CONFIG MODAL =====

function ConfigModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: cfgData, isLoading } = useNFSeConfig();
  const saveConfig = useSaveNFSeConfig();
  const [form, setForm] = useState<Partial<NFSeConfig>>({});
  const [initialized, setInitialized] = useState(false);

  if (!initialized && cfgData?.data) {
    setForm(cfgData.data);
    setInitialized(true);
  }

  const cfg = cfgData?.data;
  const merged = { ...cfg, ...form };

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações NFS-e</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Razão Social *</Label>
                <Input
                  value={(merged.razao_social as string) ?? ""}
                  onChange={(e) => update("razao_social", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>CNPJ *</Label>
                <Input
                  value={(merged.cnpj as string) ?? ""}
                  onChange={(e) => update("cnpj", e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Inscrição Municipal *</Label>
                <Input
                  value={(merged.inscricao_municipal as string) ?? ""}
                  onChange={(e) => update("inscricao_municipal", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Código IBGE do Município</Label>
                <Input
                  value={(merged.codigo_municipio as string) ?? "3550308"}
                  onChange={(e) => update("codigo_municipio", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Código de Serviço</Label>
                <Input
                  value={(merged.codigo_servico_padrao as string) ?? "14.01"}
                  onChange={(e) => update("codigo_servico_padrao", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Alíquota ISS (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.01}
                  value={((merged.aliquota_padrao as number) ?? 0.02) * 100}
                  onChange={(e) => update("aliquota_padrao", Number(e.target.value) / 100)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Discriminação Padrão</Label>
              <Input
                value={(merged.discriminacao_padrao as string) ?? ""}
                onChange={(e) => update("discriminacao_padrao", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={(merged.optante_simples as boolean) ?? true}
                onCheckedChange={(v) => update("optante_simples", v)}
              />
              <Label>Optante pelo Simples Nacional</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={(merged.ambiente as string) === "producao"}
                onCheckedChange={(v) => update("ambiente", v ? "producao" : "homologacao")}
              />
              <Label>
                Ambiente de{" "}
                {(merged.ambiente as string) === "producao" ? "Produção" : "Homologação"}
                {(merged.ambiente as string) !== "producao" && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    Testes
                  </Badge>
                )}
              </Label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveConfig.mutate(form, { onSuccess: () => onOpenChange(false) })}
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== MAIN COMPONENT =====

interface NFSeContentProps {
  patientId?: string;
  appointmentId?: string;
  autoOpenCreate?: boolean;
  onAutoOpenHandled?: () => void;
}

export function NFSeContent({
  patientId,
  appointmentId,
  autoOpenCreate = false,
  onAutoOpenHandled,
}: NFSeContentProps = {}) {
  const [emitOpen, setEmitOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: recordsData, isLoading } = useNFSeRecords({
    patientId,
    month: selectedMonth,
  });

  const send = useSendNFSe();
  const cancel = useCancelNFSe();

  const records = recordsData?.data ?? [];

  useEffect(() => {
    if (!autoOpenCreate) return;

    setEmitOpen(true);
    onAutoOpenHandled?.();
  }, [autoOpenCreate, onAutoOpenHandled]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notas Fiscais (NFS-e)</h2>
          <Badge variant="outline" className="text-xs">
            ABRASF
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="gap-1">
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
          <Button size="sm" onClick={() => setEmitOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Emitir NFS-e
          </Button>
        </div>
      </div>

      {/* Filtro de mês */}
      {!patientId && (
        <div className="flex items-center gap-2">
          <Label className="text-sm">Mês:</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma NFS-e encontrada para este período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº RPS / NFS-e</TableHead>
                  <TableHead>Tomador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {statusIcon(rec.status)}
                        <div>
                          <p className="text-sm font-mono">
                            RPS {rec.numero_rps}/{rec.serie_rps}
                          </p>
                          {rec.numero_nfse && (
                            <p className="text-xs text-muted-foreground">NFS-e {rec.numero_nfse}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{rec.tomador_nome ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(rec.valor_servico))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(rec.data_emissao).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{statusBadge(rec.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {rec.link_nfse && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={rec.link_nfse} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        {rec.status === "rascunho" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-7"
                            onClick={() => send.mutate(rec.id)}
                            disabled={send.isPending}
                          >
                            <Send className="h-3 w-3" />
                            Enviar
                          </Button>
                        )}
                        {(rec.status === "rascunho" || rec.status === "autorizado") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm("Cancelar esta NFS-e?")) cancel.mutate(rec.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmitModal
        open={emitOpen}
        onOpenChange={setEmitOpen}
        patientId={patientId}
        appointmentId={appointmentId}
      />
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
