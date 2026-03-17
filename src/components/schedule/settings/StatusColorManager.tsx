import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useStatusConfig, CustomStatusConfig } from '@/hooks/useStatusConfig';
import { cn } from '@/lib/utils';
import { Palette, Plus, RotateCcw, Trash2, Check, X, ChevronDown, ChevronUp, Pencil, Info, GripVertical, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Predefined vivid color palette (Monday.com inspired)
const COLOR_PALETTE = [
    '#00C875', // Green
    '#0CA678', // Teal
    '#0073EA', // Blue
    '#579BFC', // Light Blue
    '#66CCFF', // Sky Blue
    '#A25DDC', // Purple
    '#FF158A', // Pink
    '#DF2F4A', // Red
    '#FF7575', // Light Red
    '#FDAB3D', // Orange
    '#FFCB00', // Yellow
    '#9CD326', // Lime
    '#CAB641', // Gold
    '#7F5347', // Brown
    '#808080', // Gray
    '#22543d', // Dark Green
    '#1e3a5f', // Dark Blue
    '#4a1d6a', // Dark Purple
    '#5c1a1a', // Dark Red
    '#5c4801', // Dark Gold
];

// All status categories with their default statuses
const STATUS_CATEGORIES = {
    'Sucesso': {
        description: 'Estados positivos de conclusão',
        statuses: ['concluido', 'confirmado', 'reagendado', 'atendido', 'completed', 'realizado'],
        color: 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30',
        iconColor: 'text-emerald-600'
    },
    'Agendamento': {
        description: 'Estados de agendamento e confirmação',
        statuses: ['agendado', 'avaliacao', 'scheduled'],
        color: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
        iconColor: 'text-blue-600'
    },
    'Pendente': {
        description: 'Estados de espera e progresso',
        statuses: ['aguardando_confirmacao', 'em_espera', 'em_andamento'],
        color: 'from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30',
        iconColor: 'text-amber-600'
    },
    'Problemas': {
        description: 'Estados de cancelamento e falta',
        statuses: ['cancelado', 'falta', 'atrasado', 'faltou'],
        color: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
        iconColor: 'text-red-600'
    },
} as const;

// Action options for custom statuses
const ACTION_OPTIONS = [
    { value: 'view', label: 'Visualizar', description: 'Ver detalhes do agendamento' },
    { value: 'edit', label: 'Editar', description: 'Editar informações do agendamento' },
    { value: 'cancel', label: 'Cancelar', description: 'Cancelar o agendamento' },
    { value: 'reschedule', label: 'Reagendar', description: 'Alterar data/hora' },
    { value: 'confirm', label: 'Confirmar', description: 'Confirmar presença' },
    { value: 'complete', label: 'Concluir', description: 'Marcar como concluído' },
    { value: 'miss', label: 'Registrar Falta', description: 'Marcar como falta' },
    { value: 'payment', label: 'Pagamento', description: 'Registrar pagamento' },
    { value: 'evolution', label: 'Evolução', description: 'Registrar evolução' },
    { value: 'start', label: 'Iniciar', description: 'Iniciar atendimento' },
];

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

    const handleBorderColorChange = (color: string) => {
        setLocalBorderColor(color);
        onColorChange(localColor, localColor, color);
    };

    return (
        <div className={cn(
            "border rounded-xl transition-all duration-200",
            isActive ? "bg-white dark:bg-slate-900" : "bg-slate-100 dark:bg-slate-800 opacity-60",
            hasCustomColor ? "ring-2 ring-pink-200 dark:ring-pink-800" : ""
        )}>
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {onToggleActive && (
                            <Switch
                                checked={isActive}
                                onCheckedChange={onToggleActive}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        )}
                        <div
                            className="w-10 h-10 rounded-lg shadow-md border-2 transition-all cursor-pointer hover:scale-105"
                            style={{ 
                                backgroundColor: localColor,
                                borderColor: localBorderColor
                            }}
                            onClick={() => setIsExpanded(!isExpanded)}
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{label}</p>
                                {isCustom && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        Personalizado
                                    </Badge>
                                )}
                                {hasCustomColor && !isCustom && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-pink-300 text-pink-600">
                                        Cor alterada
                                    </Badge>
                                )}
                                {!isActive && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-300 text-slate-500">
                                        Inativo
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{statusId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {hasCustomColor && !isCustom && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReset}
                                className="h-8 px-2 text-xs hover:bg-pink-50 hover:text-pink-600"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                            </Button>
                        )}
                        {isCustom && onEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onEdit}
                                className="h-8 px-2 text-xs"
                            >
                                <Pencil className="w-3 h-3" />
                            </Button>
                        )}
                        {isCustom && onDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-red-50"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Status</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja excluir o status "{label}"? 
                                            Esta ação não pode ser desfeita e agendamentos com este status não serão mais exibidos corretamente.
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
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-8 px-2"
                        >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Color Palette */}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Paleta de Cores</p>
                            <div className="grid grid-cols-10 gap-1.5">
                                {COLOR_PALETTE.map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                                            localColor === color
                                                ? "border-slate-900 dark:border-white ring-2 ring-offset-2 ring-slate-400"
                                                : "border-transparent hover:border-slate-300"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => handleColorSelect(color)}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Custom Color Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`bg-color-${statusId}`} className="text-xs font-medium">
                                    Cor de Fundo
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id={`bg-color-${statusId}`}
                                        type="color"
                                        value={localColor}
                                        onChange={(e) => {
                                            setLocalColor(e.target.value);
                                            onColorChange(e.target.value, e.target.value, localBorderColor);
                                        }}
                                        className="w-10 h-9 p-0 border-0 cursor-pointer rounded-md"
                                    />
                                    <Input
                                        type="text"
                                        value={localColor}
                                        onChange={(e) => {
                                            setLocalColor(e.target.value);
                                            onColorChange(e.target.value, e.target.value, localBorderColor);
                                        }}
                                        className="flex-1 h-9 text-xs font-mono"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`border-color-${statusId}`} className="text-xs font-medium">
                                    Cor da Borda
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id={`border-color-${statusId}`}
                                        type="color"
                                        value={localBorderColor}
                                        onChange={(e) => handleBorderColorChange(e.target.value)}
                                        className="w-10 h-9 p-0 border-0 cursor-pointer rounded-md"
                                    />
                                    <Input
                                        type="text"
                                        value={localBorderColor}
                                        onChange={(e) => handleBorderColorChange(e.target.value)}
                                        className="flex-1 h-9 text-xs font-mono"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização</p>
                            <div className="flex items-center gap-3">
                                <div
                                    className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md"
                                    style={{ 
                                        backgroundColor: localColor,
                                        borderLeft: `4px solid ${localBorderColor}`
                                    }}
                                >
                                    {label}
                                </div>
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                                    style={{ backgroundColor: localColor }}
                                >
                                    {label.charAt(0)}
                                </div>
                            </div>
                        </div>

                        {/* Actions (for custom statuses) */}
                        {isCustom && onActionsChange && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Ações Permitidas</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {ACTION_OPTIONS.map((action) => (
                                        <label
                                            key={action.value}
                                            className="flex items-center gap-2 p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={allowedActions.includes(action.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        onActionsChange([...allowedActions, action.value]);
                                                    } else {
                                                        onActionsChange(allowedActions.filter(a => a !== action.value));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <div>
                                                <p className="text-xs font-medium">{action.label}</p>
                                                <p className="text-[10px] text-muted-foreground">{action.description}</p>
                                            </div>
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

interface NewStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (status: Omit<CustomStatusConfig, 'isCustom'>) => void;
}

function NewStatusDialog({ open, onOpenChange, onSubmit }: NewStatusDialogProps) {
    const [id, setId] = useState('');
    const [label, setLabel] = useState('');
    const [color, setColor] = useState('#0073EA');
    const [selectedActions, setSelectedActions] = useState<string[]>(['view', 'edit']);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id.trim() || !label.trim()) {
            toast({ title: 'Erro', description: 'ID e Nome são obrigatórios', variant: 'destructive' });
            return;
        }
        const statusId = id.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        // Validate ID doesn't already exist
        onSubmit({
            id: statusId,
            label: label.trim(),
            color,
            bgColor: color,
            borderColor: color,
            allowedActions: selectedActions,
        });
        
        // Reset form
        setId('');
        setLabel('');
        setColor('#0073EA');
        setSelectedActions(['view', 'edit']);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Novo Status Personalizado
                    </DialogTitle>
                    <DialogDescription>
                        Crie um novo status para sua clínica. Ele estará disponível na agenda.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-status-id">ID (identificador único)</Label>
                            <Input
                                id="new-status-id"
                                value={id}
                                onChange={(e) => setId(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                                placeholder="novo_status"
                                className="font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground">Use letras minúsculas e underscore</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-status-label">Nome do Status</Label>
                            <Input
                                id="new-status-label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Novo Status"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Cor do Status</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-14 h-10 p-0 border-0 cursor-pointer rounded-md"
                            />
                            <div className="grid grid-cols-10 gap-1 flex-1">
                                {COLOR_PALETTE.slice(0, 10).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={cn(
                                            "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                                            color === c ? "ring-2 ring-offset-1 ring-slate-400 border-slate-900" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Ações Permitidas</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {ACTION_OPTIONS.map((action) => (
                                <label
                                    key={action.value}
                                    className="flex items-center gap-2 p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedActions.includes(action.value)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedActions([...selectedActions, action.value]);
                                            } else {
                                                setSelectedActions(selectedActions.filter(a => a !== action.value));
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-xs">{action.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                        <Label>Pré-visualização</Label>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div
                                className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md"
                                style={{ backgroundColor: color }}
                            >
                                {label || 'Nome do Status'}
                            </div>
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                                style={{ backgroundColor: color }}
                            >
                                {(label || 'N').charAt(0).toUpperCase()}
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {id || 'id_status'}
                            </Badge>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            <Check className="w-4 h-4 mr-2" />
                            Criar Status
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface EditStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    status: CustomStatusConfig | null;
    onUpdate: (statusId: string, updates: Partial<Omit<CustomStatusConfig, 'id' | 'isCustom'>>) => void;
}

function EditStatusDialog({ open, onOpenChange, status, onUpdate }: EditStatusDialogProps) {
    const [label, setLabel] = useState('');
    const [color, setColor] = useState('');
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
            toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
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
                        <Pencil className="w-5 h-5" />
                        Editar Status
                    </DialogTitle>
                    <DialogDescription>
                        Edite as informações do status personalizado.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>ID do Status</Label>
                        <Input
                            value={status.id}
                            disabled
                            className="font-mono bg-slate-50 dark:bg-slate-800"
                        />
                        <p className="text-[10px] text-muted-foreground">O ID não pode ser alterado</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-status-label">Nome do Status</Label>
                        <Input
                            id="edit-status-label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Nome do status"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Cor do Status</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-14 h-10 p-0 border-0 cursor-pointer rounded-md"
                            />
                            <div className="grid grid-cols-10 gap-1 flex-1">
                                {COLOR_PALETTE.slice(0, 10).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={cn(
                                            "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                                            color === c ? "ring-2 ring-offset-1 ring-slate-400 border-slate-900" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Ações Permitidas</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {ACTION_OPTIONS.map((action) => (
                                <label
                                    key={action.value}
                                    className="flex items-center gap-2 p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedActions.includes(action.value)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedActions([...selectedActions, action.value]);
                                            } else {
                                                setSelectedActions(selectedActions.filter(a => a !== action.value));
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-xs">{action.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function StatusColorManager() {
    const {
        statusConfig,
        updateStatusColor,
        createStatus,
        updateStatus,
        deleteStatus,
        resetToDefaults,
        resetStatusColor,
        isCustomStatus,
        hasCustomColors,
        customStatuses,
        allStatuses,
    } = useStatusConfig();

    const [showNewDialog, setShowNewDialog] = useState(false);
    const [editingStatus, setEditingStatus] = useState<CustomStatusConfig | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'Sucesso': true,
        'Agendamento': true,
        'Pendente': false,
        'Problemas': false,
    });

    const handleColorChange = (statusId: string, color: string, bgColor: string, borderColor: string) => {
        updateStatusColor(statusId, { color, bgColor, borderColor });
        toast({ title: 'Cor atualizada', description: `Cor do status "${statusId}" foi alterada.` });
    };

    const handleCreateStatus = (status: Omit<CustomStatusConfig, 'isCustom'>) => {
        createStatus(status);
        toast({ title: 'Status criado', description: `Status "${status.label}" foi criado com sucesso.` });
    };

    const handleUpdateStatus = (statusId: string, updates: Partial<Omit<CustomStatusConfig, 'id' | 'isCustom'>>) => {
        updateStatus(statusId, updates);
        toast({ title: 'Status atualizado', description: `Status "${statusId}" foi atualizado.` });
    };

    const handleDeleteStatus = (statusId: string) => {
        deleteStatus(statusId);
        toast({ title: 'Status excluído', description: `Status "${statusId}" foi removido.` });
    };

    const handleResetAll = () => {
        resetToDefaults();
        toast({ title: 'Cores resetadas', description: 'Todas as cores foram restauradas para o padrão.' });
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    // Count statuses with custom colors
    const customColorCount = useMemo(() => {
        return Object.keys(statusConfig).filter(id => hasCustomColors(id)).length;
    }, [statusConfig, hasCustomColors]);

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Palette className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Cores dos Status</CardTitle>
                                <CardDescription className="text-white/80">
                                    Personalize as cores de cada status da agenda
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {customColorCount > 0 && (
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    {customColorCount} cores alteradas
                                </Badge>
                            )}
                            {customStatuses.length > 0 && (
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    {customStatuses.length} personalizados
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Info Alert */}
            <Alert className="border-pink-200 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-950/20 dark:to-fuchsia-950/20">
                <Info className="h-4 w-4 text-pink-600" />
                <AlertDescription className="text-pink-700 dark:text-pink-300 text-sm">
                    <strong>Dica:</strong> As cores dos status ajudam a identificar visualmente o estado de cada agendamento. 
                    Clique em uma cor para expandir e ver mais opções.
                </AlertDescription>
            </Alert>

            {/* Custom Statuses Section */}
            <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-purple-600" />
                                Status Personalizados
                            </CardTitle>
                            <CardDescription>
                                Crie novos status para sua clínica
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {customColorCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetAll}
                                    className="text-pink-600 border-pink-200 hover:bg-pink-50"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Resetar Todas
                                </Button>
                            )}
                            <Button onClick={() => setShowNewDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Status
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {customStatuses.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-violet-50/50 dark:from-purple-950/10 dark:to-violet-950/10">
                            <div className="inline-flex p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                                <Palette className="h-10 w-10 text-purple-400" />
                            </div>
                            <p className="text-base font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Nenhum status personalizado criado
                            </p>
                            <p className="text-sm text-purple-600/70 dark:text-purple-400/70 max-w-xs mx-auto mb-4">
                                Clique em "Novo Status" para criar novos tipos de status para sua clínica
                            </p>
                            <Button onClick={() => setShowNewDialog(true)} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                                <Plus className="w-4 h-4 mr-2" />
                                Criar Primeiro Status
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
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
                                    onColorChange={(color, bgColor, borderColor) => 
                                        handleUpdateStatus(status.id, { color, bgColor, borderColor })
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
                    )}
                </CardContent>
            </Card>

            {/* Default Statuses by Category */}
            {Object.entries(STATUS_CATEGORIES).map(([categoryName, categoryConfig]) => {
                const availableStatuses = categoryConfig.statuses.filter(
                    statusId => statusConfig[statusId]
                );
                
                if (availableStatuses.length === 0) return null;

                return (
                    <Collapsible
                        key={categoryName}
                        open={expandedCategories[categoryName]}
                        onOpenChange={() => toggleCategory(categoryName)}
                    >
                        <Card className="border-2">
                            <CollapsibleTrigger asChild>
                                <CardHeader className={cn(
                                    "cursor-pointer hover:opacity-90 transition-opacity",
                                    categoryConfig.color
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg bg-white/50 dark:bg-black/20",
                                                categoryConfig.iconColor
                                            )}>
                                                {categoryName === 'Sucesso' && <Check className="w-5 h-5" />}
                                                {categoryName === 'Agendamento' && <Palette className="w-5 h-5" />}
                                                {categoryName === 'Pendente' && <Info className="w-5 h-5" />}
                                                {categoryName === 'Problemas' && <Trash2 className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{categoryName}</CardTitle>
                                                <CardDescription>{categoryConfig.description}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-white/50 dark:bg-black/20">
                                                {availableStatuses.length} status
                                            </Badge>
                                            {expandedCategories[categoryName] ? (
                                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="pt-4">
                                    <div className="space-y-3">
                                        {availableStatuses.map((statusId) => {
                                            const config = statusConfig[statusId];
                                            if (!config) return null;
                                            return (
                                                <StatusColorEditor
                                                    key={statusId}
                                                    statusId={statusId}
                                                    label={config.label}
                                                    currentColor={config.color}
                                                    currentBgColor={config.bgColor}
                                                    currentBorderColor={config.borderColor}
                                                    isCustom={false}
                                                    hasCustomColor={hasCustomColors(statusId)}
                                                    onColorChange={(color, bgColor, borderColor) => 
                                                        handleColorChange(statusId, color, bgColor, borderColor)
                                                    }
                                                    onReset={() => resetStatusColor(statusId)}
                                                />
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                );
            })}

            {/* New Status Dialog */}
            <NewStatusDialog
                open={showNewDialog}
                onOpenChange={setShowNewDialog}
                onSubmit={handleCreateStatus}
            />

            {/* Edit Status Dialog */}
            <EditStatusDialog
                open={!!editingStatus}
                onOpenChange={(open) => !open && setEditingStatus(null)}
                status={editingStatus}
                onUpdate={handleUpdateStatus}
            />
        </div>
    );
}