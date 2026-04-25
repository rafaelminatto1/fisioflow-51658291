import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStatusConfig, CustomStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import {
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLOR_PALETTE = [
  "#00C875",
  "#0CA678",
  "#0073EA",
  "#579BFC",
  "#66CCFF",
  "#A25DDC",
  "#FF158A",
  "#DF2F4A",
  "#FF7575",
  "#FDAB3D",
  "#FFCB00",
  "#9CD326",
  "#CAB641",
  "#7F5347",
  "#808080",
  "#22543d",
  "#1e3a5f",
  "#4a1d6a",
  "#5c1a1a",
  "#5c4801",
];

const STATUS_CATEGORIES = {
  Sucesso: {
    description: "Estados positivos de conclusão",
    statuses: ["atendido", "presenca_confirmada"],
    dot: "bg-emerald-500",
  },
  Agendamento: {
    description: "Agendamento e confirmação",
    statuses: ["agendado", "avaliacao", "remarcar"],
    dot: "bg-blue-500",
  },
  "Faltas e Não Atendimento": {
    description: "Falta ou impossibilidade de atendimento",
    statuses: [
      "faltou",
      "faltou_com_aviso",
      "faltou_sem_aviso",
      "nao_atendido",
      "nao_atendido_sem_cobranca",
    ],
    dot: "bg-amber-500",
  },
  Cancelamento: {
    description: "Estados de cancelamento",
    statuses: ["cancelado"],
    dot: "bg-rose-500",
  },
} as const;

const ACTION_OPTIONS = [
  { value: "view", label: "Visualizar" },
  { value: "edit", label: "Editar" },
  { value: "cancel", label: "Cancelar" },
  { value: "reschedule", label: "Reagendar" },
  { value: "confirm", label: "Confirmar" },
  { value: "complete", label: "Concluir" },
  { value: "miss", label: "Registrar Falta" },
  { value: "payment", label: "Pagamento" },
  { value: "evolution", label: "Evolução" },
  { value: "start", label: "Iniciar" },
];

/* ---- StatusColorEditor ---- */
interface StatusColorEditorProps {
  statusId: string;
  label: string;
  currentColor: string;
  currentBgColor?: string;
  currentBorderColor?: string;
  isCustom: boolean;
  hasCustomColor: boolean;
  onColorChange: (color: string, bgColor: string, borderColor: string) => void;
  onReset: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  allowedActions?: string[];
  onActionsChange?: (actions: string[]) => void;
  isActive?: boolean;
  onToggleActive?: (active: boolean) => void;
}

function StatusColorEditor({
  statusId,
  label,
  currentColor,
  currentBgColor,
  currentBorderColor,
  isCustom,
  hasCustomColor,
  onColorChange,
  onReset,
  onDelete,
  onEdit,
  allowedActions = [],
  onActionsChange,
  isActive = true,
  onToggleActive,
}: StatusColorEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localColor, setLocalColor] = useState(currentBgColor || currentColor);
  const [localBorderColor, setLocalBorderColor] = useState(currentBorderColor || currentColor);

  const handleColorSelect = (color: string) => {
    setLocalColor(color);
    setLocalBorderColor(color);
    onColorChange(color, color, color);
  };

  return (
    <div
      className={cn(
        "border rounded-xl transition-all duration-200",
        isActive ? "bg-background" : "bg-muted/30 opacity-60",
        hasCustomColor && "ring-1 ring-primary/20",
      )}
    >
      <div className="p-3">
        {/* Row header */}
        <div className="flex items-center gap-2.5">
          {onToggleActive && (
            <Switch checked={isActive} onCheckedChange={onToggleActive} className="shrink-0" />
          )}

          {/* Color swatch */}
          <button
            className="w-8 h-8 rounded-lg border-2 shrink-0 transition-transform hover:scale-105"
            style={{ backgroundColor: localColor, borderColor: localBorderColor }}
            onClick={() => setIsExpanded(!isExpanded)}
          />

          {/* Labels */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium">{label}</p>
              {isCustom && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Custom
                </Badge>
              )}
              {hasCustomColor && !isCustom && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-primary/30 text-primary"
                >
                  Alterado
                </Badge>
              )}
              {!isActive && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Inativo
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{statusId}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {hasCustomColor && !isCustom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            {isCustom && onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {isCustom && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Status</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o status "{label}"? Esta ação não pode ser
                      desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7"
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Palette */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Paleta de cores</p>
              <div className="grid grid-cols-10 gap-1">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all hover:scale-110",
                      localColor === color
                        ? "border-foreground ring-2 ring-offset-1 ring-muted-foreground/40"
                        : "border-transparent hover:border-muted-foreground/30",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Custom hex */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cor de fundo</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localColor}
                    onChange={(e) => {
                      setLocalColor(e.target.value);
                      onColorChange(e.target.value, e.target.value, localBorderColor);
                    }}
                    className="w-9 h-8 p-0 border-0 cursor-pointer rounded-md"
                  />
                  <Input
                    type="text"
                    value={localColor}
                    onChange={(e) => {
                      setLocalColor(e.target.value);
                      onColorChange(e.target.value, e.target.value, localBorderColor);
                    }}
                    className="flex-1 h-8 text-xs font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cor da borda</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localBorderColor}
                    onChange={(e) => {
                      setLocalBorderColor(e.target.value);
                      onColorChange(localColor, localColor, e.target.value);
                    }}
                    className="w-9 h-8 p-0 border-0 cursor-pointer rounded-md"
                  />
                  <Input
                    type="text"
                    value={localBorderColor}
                    onChange={(e) => {
                      setLocalBorderColor(e.target.value);
                      onColorChange(localColor, localColor, e.target.value);
                    }}
                    className="flex-1 h-8 text-xs font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                style={{ backgroundColor: localColor, borderLeft: `3px solid ${localBorderColor}` }}
              >
                {label}
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: localColor }}
              >
                {label.charAt(0)}
              </div>
            </div>

            {/* Actions for custom */}
            {isCustom && onActionsChange && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Ações permitidas</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ACTION_OPTIONS.map((action) => (
                    <label
                      key={action.value}
                      className="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={allowedActions.includes(action.value)}
                        onChange={(e) => {
                          onActionsChange(
                            e.target.checked
                              ? [...allowedActions, action.value]
                              : allowedActions.filter((a) => a !== action.value),
                          );
                        }}
                        className="rounded"
                      />
                      {action.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- New Status Dialog ---- */
function NewStatusDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: Omit<CustomStatusConfig, "isCustom">) => void;
}) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#0073EA");
  const [selectedActions, setSelectedActions] = useState<string[]>(["view", "edit"]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !label.trim()) {
      toast({ title: "Erro", description: "ID e Nome são obrigatórios", variant: "destructive" });
      return;
    }
    const statusId = id
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    onSubmit({
      id: statusId,
      label: label.trim(),
      color,
      bgColor: color,
      borderColor: color,
      allowedActions: selectedActions,
    });
    setId("");
    setLabel("");
    setColor("#0073EA");
    setSelectedActions(["view", "edit"]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Status
          </DialogTitle>
          <DialogDescription>Crie um status personalizado para sua clínica.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-status-id" className="text-xs">
                ID único
              </Label>
              <Input
                id="new-status-id"
                value={id}
                onChange={(e) =>
                  setId(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "_")
                      .replace(/[^a-z0-9_]/g, ""),
                  )
                }
                placeholder="novo_status"
                className="font-mono text-sm h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-status-label" className="text-xs">
                Nome
              </Label>
              <Input
                id="new-status-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Novo Status"
                className="text-sm h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer rounded-md"
              />
              <div className="grid grid-cols-10 gap-1 flex-1">
                {COLOR_PALETTE.slice(0, 10).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all hover:scale-110",
                      color === c
                        ? "ring-2 ring-offset-1 ring-muted-foreground/40 border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {label && (
            <div className="p-2.5 rounded-lg bg-muted/30 flex items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                style={{ backgroundColor: color }}
              >
                {label}
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {id || "id_status"}
              </Badge>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Edit Status Dialog ---- */
function EditStatusDialog({
  open,
  onOpenChange,
  status,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: CustomStatusConfig | null;
  onUpdate: (
    statusId: string,
    updates: Partial<Omit<CustomStatusConfig, "id" | "isCustom">>,
  ) => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  React.useEffect(() => {
    if (status) {
      setLabel(status.label);
      setColor(status.color);
      setSelectedActions(status.allowedActions);
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !status) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    onUpdate(status.id, {
      label: label.trim(),
      color,
      bgColor: color,
      borderColor: color,
      allowedActions: selectedActions,
    });
    onOpenChange(false);
  };

  if (!status) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editar Status
          </DialogTitle>
          <DialogDescription>Edite o status personalizado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              ID <span className="text-muted-foreground">(não pode ser alterado)</span>
            </Label>
            <Input value={status.id} disabled className="font-mono text-sm h-8 bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-status-label" className="text-xs">
              Nome
            </Label>
            <Input
              id="edit-status-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="text-sm h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer rounded-md"
              />
              <div className="grid grid-cols-10 gap-1 flex-1">
                {COLOR_PALETTE.slice(0, 10).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all hover:scale-110",
                      color === c
                        ? "ring-2 ring-offset-1 ring-muted-foreground/40 border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Main export ---- */
export function StatusColorManager() {
  const {
    statusConfig,
    updateStatusColor,
    createStatus,
    updateStatus,
    deleteStatus,
    resetToDefaults,
    resetStatusColor,
    hasCustomColors,
    getStatusColors,
    customStatuses,
  } = useStatusConfig();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CustomStatusConfig | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleColorChange = (
    statusId: string,
    color: string,
    bgColor: string,
    borderColor: string,
  ) => {
    updateStatusColor(statusId, { color, bgColor, borderColor });
    toast({ title: "Cor atualizada" });
  };
  const handleCreateStatus = (status: Omit<CustomStatusConfig, "isCustom">) => {
    createStatus(status);
    toast({ title: "Status criado", description: `"${status.label}" criado.` });
  };
  const handleUpdateStatus = (
    statusId: string,
    updates: Partial<Omit<CustomStatusConfig, "id" | "isCustom">>,
  ) => {
    updateStatus(statusId, updates);
    toast({ title: "Status atualizado" });
  };
  const handleDeleteStatus = (statusId: string) => {
    deleteStatus(statusId);
    toast({ title: "Status excluído" });
  };
  const handleResetAll = () => {
    resetToDefaults();
    toast({ title: "Cores resetadas", description: "Restaurado para o padrão." });
  };

  const customColorCount = useMemo(
    () => Object.keys(statusConfig).filter((id) => hasCustomColors(id)).length,
    [statusConfig, hasCustomColors],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {customColorCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {customColorCount} alteradas
            </Badge>
          )}
          {customStatuses.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {customStatuses.length} customizados
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {customColorCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="h-7 text-xs text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Resetar cores
            </Button>
          )}
          <Button size="sm" onClick={() => setShowNewDialog(true)} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo status
          </Button>
        </div>
      </div>

      {/* Status personalizados */}
      {customStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
            Personalizados
          </p>
          <div className="space-y-1.5">
            {customStatuses.map((status) => (
              <StatusColorEditor
                key={status.id}
                statusId={status.id}
                label={status.label}
                currentColor={status.color}
                currentBgColor={status.bgColor}
                currentBorderColor={status.borderColor}
                isCustom={true}
                hasCustomColor={true}
                onColorChange={(c, bg, b) =>
                  handleUpdateStatus(status.id, { color: c, bgColor: bg, borderColor: b })
                }
                onReset={() => {}}
                onDelete={() => handleDeleteStatus(status.id)}
                onEdit={() => setEditingStatus(status)}
                allowedActions={status.allowedActions}
                onActionsChange={(actions) =>
                  handleUpdateStatus(status.id, { allowedActions: actions })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Status padrão por categoria */}
      {Object.entries(STATUS_CATEGORIES).map(([categoryName, categoryConfig]) => {
        const available = categoryConfig.statuses.filter((id) => statusConfig[id]);
        if (available.length === 0) return null;

        const isExpanded = expandedCategories[categoryName] ?? false;

        return (
          <div key={categoryName} className="space-y-1.5">
            <button
              className="w-full flex items-center justify-between py-1 px-0.5 group"
              onClick={() =>
                setExpandedCategories((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }))
              }
            >
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full shrink-0", categoryConfig.dot)} />
                <p className="text-xs font-semibold">{categoryName}</p>
                <span className="text-[10px] text-muted-foreground">
                  {categoryConfig.description}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {available.length}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-1.5 pl-4 animate-in slide-in-from-top-1 duration-150">
                {available.map((statusId) => {
                  const config = statusConfig[statusId];
                  if (!config) return null;
                  const colors = getStatusColors(statusId);
                  return (
                    <StatusColorEditor
                      key={statusId}
                      statusId={statusId}
                      label={config.label}
                      currentColor={colors.color}
                      currentBgColor={colors.bgColor}
                      currentBorderColor={colors.borderColor}
                      isCustom={false}
                      hasCustomColor={hasCustomColors(statusId)}
                      onColorChange={(c, bg, b) => handleColorChange(statusId, c, bg, b)}
                      onReset={() => resetStatusColor(statusId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state se não há nada */}
      {customStatuses.length === 0 &&
        Object.values(STATUS_CATEGORIES).every((c) =>
          c.statuses.every((id) => !statusConfig[id]),
        ) && (
          <div className="text-center py-8 border border-dashed rounded-xl">
            <Palette className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum status disponível</p>
          </div>
        )}

      <NewStatusDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSubmit={handleCreateStatus}
      />
      <EditStatusDialog
        open={!!editingStatus}
        onOpenChange={(open) => !open && setEditingStatus(null)}
        status={editingStatus}
        onUpdate={handleUpdateStatus}
      />
    </div>
  );
}
