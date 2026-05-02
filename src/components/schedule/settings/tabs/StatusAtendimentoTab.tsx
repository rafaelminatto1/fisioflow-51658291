import { useMemo, useState } from "react";
import { AlertCircle, Edit3, Eye, Loader2, Palette, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStatusConfig, type CustomStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";

interface StatusFormState {
  id?: string;
  key: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isActive: boolean;
  countsTowardCapacity: boolean;
  isDefault?: boolean;
  sortOrder: number;
}

const EMPTY_FORM: StatusFormState = {
  key: "",
  label: "",
  color: "#2563eb",
  bgColor: "#dbeafe",
  borderColor: "#2563eb",
  isActive: true,
  countsTowardCapacity: true,
  sortOrder: 999,
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const STATUS_KEY_RE = /^[a-z0-9_]{2,80}$/;

function slugifyStatus(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function toForm(status: any): StatusFormState {
  return {
    id: status.id,
    key: status.key,
    label: status.label,
    color: status.color,
    bgColor: status.bg_color,
    borderColor: status.border_color,
    isActive: status.is_active,
    countsTowardCapacity: status.counts_toward_capacity,
    isDefault: status.is_default,
    sortOrder: status.sort_order,
  };
}

function CalendarPreview({ status }: { status: StatusFormState }) {
  return (
    <div
      className="min-h-[84px] rounded-lg border p-3 shadow-sm"
      style={{
        backgroundColor: status.bgColor,
        borderColor: status.borderColor,
        borderLeftWidth: 4,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold" style={{ color: status.color }}>
          Consulta
        </span>
        <span className="font-mono text-[11px]" style={{ color: status.color }}>
          09:00
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
        <span className="truncate text-xs font-medium" style={{ color: status.color }}>
          {status.label || "Novo status"}
        </span>
      </div>
      <p className="mt-2 truncate text-[11px]" style={{ color: status.color }}>
        João da Silva · Fisioterapia
      </p>
    </div>
  );
}

function getFormErrors(form: StatusFormState) {
  const errors: string[] = [];
  if (!form.label.trim()) errors.push("Informe o nome do status.");
  if (!STATUS_KEY_RE.test(form.key)) {
    errors.push("A chave deve ter 2 a 80 caracteres e usar apenas letras minúsculas, números e _.");
  }
  if (![form.color, form.bgColor, form.borderColor].every((color) => HEX_COLOR_RE.test(color))) {
    errors.push("Use cores hexadecimais válidas, por exemplo #2563eb.");
  }
  return errors;
}

export function StatusAtendimentoTab() {
  const {
    allStatusRows,
    createStatus,
    updateStatus,
    deleteStatus,
    isLoading,
    isSaving,
    error,
  } = useStatusConfig();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<StatusFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const stats = useMemo(() => {
    const rows = allStatusRows ?? [];
    return {
      total: rows.length,
      active: rows.filter((row: any) => row.is_active).length,
      custom: rows.filter((row: any) => !row.is_default).length,
      capacity: rows.filter((row: any) => row.counts_toward_capacity).length,
    };
  }, [allStatusRows]);

  const formErrors = useMemo(() => getFormErrors(form), [form]);
  const canSave = formErrors.length === 0 && !isSaving;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sortOrder: (allStatusRows?.length ?? 0) * 10 + 10 });
    setDialogOpen(true);
  };

  const openEdit = (status: any) => {
    setForm(toForm(status));
    setDialogOpen(true);
  };

  const handleLabelChange = (label: string) => {
    setForm((prev) => ({
      ...prev,
      label,
      key: prev.isDefault || prev.id ? prev.key : slugifyStatus(label),
    }));
  };

  const saveStatus = () => {
    const payload: Omit<CustomStatusConfig, "isCustom"> = {
      id: form.key,
      key: form.key,
      label: form.label,
      color: form.color,
      bgColor: form.bgColor,
      borderColor: form.borderColor,
      allowedActions: ["view", "edit", "reschedule"],
      isActive: form.isActive,
      isDefault: form.isDefault,
      sortOrder: form.sortOrder,
      countsTowardCapacity: form.countsTowardCapacity,
    };

    if (!canSave) return;

    if (form.id) {
      updateStatus(form.id, payload);
    } else {
      createStatus(payload);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Status cadastrados", stats.total],
          ["Ativos", stats.active],
          ["Personalizados", stats.custom],
          ["Contam capacidade", stats.capacity],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar status</AlertTitle>
          <AlertDescription>{String((error as Error).message ?? error)}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Status de atendimento</h2>
            <p className="text-sm text-muted-foreground">
              Controle nomes, cores, ativação e capacidade dos status usados na agenda.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo status
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-[112px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                    Carregando status...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (allStatusRows ?? []).map((status: any) => (
                <TableRow key={status.id} className={cn(!status.is_active && "opacity-60")}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-md border"
                        style={{
                          backgroundColor: status.bg_color,
                          borderColor: status.border_color,
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{status.label}</span>
                          {status.is_default && <Badge variant="outline">Padrão</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{status.color}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{status.key}</TableCell>
                  <TableCell>
                    <div
                      className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium"
                      style={{
                        color: status.color,
                        backgroundColor: status.bg_color,
                        borderColor: status.border_color,
                      }}
                    >
                      <Eye className="h-3 w-3" />
                      Card da agenda
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.counts_toward_capacity ? "default" : "secondary"}>
                      {status.counts_toward_capacity ? "Conta" : "Ignora"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={status.is_active}
                      onCheckedChange={(checked) => updateStatus(status.id, { isActive: checked })}
                      aria-label={`Ativar ${status.label}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(status)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={status.is_default}
                        onClick={() => setDeleteTarget(status)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (allStatusRows?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    Nenhum status configurado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar status" : "Novo status"}</DialogTitle>
            <DialogDescription>
              As cores aparecem nos cards da agenda, filtros e seletores de status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="status-label">Nome</Label>
                <Input
                  id="status-label"
                  value={form.label}
                  onChange={(event) => handleLabelChange(event.target.value)}
                  placeholder="Ex: Em atendimento"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status-key">Chave</Label>
                <Input
                  id="status-key"
                  value={form.key}
                  disabled={form.isDefault || !!form.id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, key: slugifyStatus(event.target.value) }))
                  }
                  placeholder="em_atendimento"
                  aria-invalid={!STATUS_KEY_RE.test(form.key)}
                />
                <p className="text-xs text-muted-foreground">
                  A chave é usada pela API. Depois de salvar, ela não muda para proteger o histórico.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Cor do texto", "color"],
                  ["Fundo", "bgColor"],
                  ["Borda", "borderColor"],
                ].map(([label, field]) => (
                  <div key={field} className="grid gap-2">
                    <Label>{label}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="h-10 w-12 p-1"
                        value={(form as any)[field]}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, [field]: event.target.value }))
                        }
                      />
                      <Input
                        value={(form as any)[field]}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, [field]: event.target.value }))
                        }
                        aria-invalid={!HEX_COLOR_RE.test((form as any)[field])}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-lg border p-3">
                  <span>
                    <span className="block text-sm font-medium">Status ativo</span>
                    <span className="text-xs text-muted-foreground">Aparece nos seletores.</span>
                  </span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border p-3">
                  <span>
                    <span className="block text-sm font-medium">Conta capacidade</span>
                    <span className="text-xs text-muted-foreground">Ocupa vaga no horário.</span>
                  </span>
                  <Switch
                    checked={form.countsTowardCapacity}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, countsTowardCapacity: checked }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Palette className="h-4 w-4" />
                Preview
              </div>
              <CalendarPreview status={form} />
            </div>
          </div>

          {formErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Revise os campos</AlertTitle>
              <AlertDescription>{formErrors[0]}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveStatus} disabled={!canSave}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Salvar alterações" : "Criar status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover status?</AlertDialogTitle>
            <AlertDialogDescription>
              Se o status já estiver em uso, ele será desativado para preservar o histórico dos
              agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteStatus(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
