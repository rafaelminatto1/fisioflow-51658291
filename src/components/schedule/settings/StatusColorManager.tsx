import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { Badge } from '@/components/shared/ui/badge';
import { useStatusConfig, CustomStatusConfig } from '@/hooks/useStatusConfig';
import { STATUS_CONFIG, DEFAULT_STATUS_COLORS } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Palette, Plus, RotateCcw, Trash2, Check, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/web/ui/collapsible';
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
} from '@/components/web/ui/alert-dialog';

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
];

interface StatusColorEditorProps {
    statusId: string;
    label: string;
    currentColor: string;
    isCustom: boolean;
    hasCustomColor: boolean;
    onColorChange: (color: string) => void;
    onReset: () => void;
    onDelete?: () => void;
}

function StatusColorEditor({
    statusId,
    label,
    currentColor,
    isCustom,
    hasCustomColor,
    onColorChange,
    onReset,
    onDelete,
}: StatusColorEditorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border rounded-lg p-3 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-md shadow-sm border border-black/10"
                        style={{ backgroundColor: currentColor }}
                    />
                    <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{statusId}</p>
                    </div>
                    {isCustom && (
                        <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                    )}
                    {hasCustomColor && !isCustom && (
                        <Badge variant="outline" className="text-xs">Cor alterada</Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasCustomColor && !isCustom && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onReset}
                            className="h-7 px-2 text-xs"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                        </Button>
                    )}
                    {isCustom && onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-7 px-2"
                    >
                        <Palette className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Selecione uma cor:</p>
                    <div className="grid grid-cols-8 gap-2">
                        {COLOR_PALETTE.map((color) => (
                            <button
                                key={color}
                                className={cn(
                                    "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                                    currentColor === color
                                        ? "border-slate-900 dark:border-white ring-2 ring-offset-2 ring-slate-400"
                                        : "border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    onColorChange(color);
                                    setIsExpanded(false);
                                }}
                            />
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <Label htmlFor={`custom-color-${statusId}`} className="text-xs">
                            Cor personalizada:
                        </Label>
                        <Input
                            id={`custom-color-${statusId}`}
                            type="color"
                            value={currentColor}
                            onChange={(e) => onColorChange(e.target.value)}
                            className="w-12 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input
                            type="text"
                            value={currentColor}
                            onChange={(e) => onColorChange(e.target.value)}
                            className="w-24 h-8 text-xs font-mono"
                            placeholder="#000000"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function NewStatusForm({ onSubmit, onCancel }: { onSubmit: (status: Omit<CustomStatusConfig, 'isCustom'>) => void; onCancel: () => void }) {
    const [id, setId] = useState('');
    const [label, setLabel] = useState('');
    const [color, setColor] = useState('#0073EA');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id.trim() || !label.trim()) {
            toast({ title: 'Erro', description: 'ID e Nome são obrigatórios', variant: 'destructive' });
            return;
        }
        const statusId = id.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        onSubmit({
            id: statusId,
            label: label.trim(),
            color,
            bgColor: color,
            borderColor: color,
            allowedActions: ['view', 'edit', 'cancel', 'reschedule'],
        });
        setId('');
        setLabel('');
        setColor('#0073EA');
    };

    return (
        <Card className="bg-slate-50 dark:bg-slate-800">
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="new-status-id" className="text-xs">ID (snake_case)</Label>
                            <Input
                                id="new-status-id"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                placeholder="novo_status"
                                className="h-9"
                            />
                        </div>
                        <div>
                            <Label htmlFor="new-status-label" className="text-xs">Nome</Label>
                            <Input
                                id="new-status-label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Novo Status"
                                className="h-9"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Label className="text-xs">Cor:</Label>
                        <Input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-12 h-8 p-0 border-0 cursor-pointer"
                        />
                        <div className="grid grid-cols-8 gap-1 flex-1">
                            {COLOR_PALETTE.slice(0, 8).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={cn(
                                        "w-6 h-6 rounded border transition-all",
                                        color === c ? "ring-2 ring-offset-1 ring-slate-400" : ""
                                    )}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button type="submit" size="sm">
                            <Check className="w-4 h-4 mr-1" />
                            Criar Status
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

// Custom Status Card with Edit/Delete functionality
interface CustomStatusCardProps {
    status: CustomStatusConfig;
    onUpdate: (statusId: string, updates: Partial<Omit<CustomStatusConfig, 'id' | 'isCustom'>>) => void;
    onDelete: (statusId: string) => void;
}

function CustomStatusCard({ status, onUpdate, onDelete }: CustomStatusCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(status.label);
    const [editColor, setEditColor] = useState(status.color);

    const handleSave = () => {
        if (!editLabel.trim()) {
            toast({ title: 'Erro', description: 'O nome do status é obrigatório', variant: 'destructive' });
            return;
        }
        onUpdate(status.id, {
            label: editLabel.trim(),
            color: editColor,
            bgColor: editColor,
            borderColor: editColor,
        });
        setIsEditing(false);
        toast({ title: 'Status atualizado', description: `Status "${editLabel}" foi atualizado com sucesso.` });
    };

    const handleCancel = () => {
        setEditLabel(status.label);
        setEditColor(status.color);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                <div className="space-y-3">
                    <div>
                        <Label htmlFor={`edit-label-${status.id}`} className="text-xs">Nome do Status</Label>
                        <Input
                            id={`edit-label-${status.id}`}
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-9 mt-1"
                            placeholder="Nome do status"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Label className="text-xs">Cor:</Label>
                        <Input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-12 h-8 p-0 border-0 cursor-pointer"
                        />
                        <div className="grid grid-cols-8 gap-1 flex-1">
                            {COLOR_PALETTE.slice(0, 8).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={cn(
                                        "w-6 h-6 rounded border transition-all",
                                        editColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""
                                    )}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setEditColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                            <Check className="w-4 h-4 mr-1" />
                            Salvar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-3 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-md shadow-sm border border-black/10"
                        style={{ backgroundColor: status.color }}
                    />
                    <div>
                        <p className="font-medium text-sm">{status.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{status.id}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-7 px-2 text-xs"
                    >
                        <Pencil className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Status</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tem certeza que deseja excluir o status "{status.label}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onDelete(status.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}

// Status groups for organization
const STATUS_GROUPS = {
    'Positivos (Verde)': ['realizado', 'completed', 'concluido', 'atendido', 'confirmado', 'confirmed'],
    'Agendados (Azul)': ['agendado', 'scheduled', 'avaliacao'],
    'Pendentes (Amarelo/Laranja)': ['aguardando_confirmacao', 'em_espera', 'em_andamento'],
    'Negativos (Vermelho/Rosa)': ['cancelado', 'falta', 'faltou'],
    'Outros': ['remarcado', 'reagendado', 'atrasado'],
};

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
    } = useStatusConfig();

    const [showNewForm, setShowNewForm] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'Positivos (Verde)': true,
        'Agendados (Azul)': true,
    });

    const handleColorChange = (statusId: string, color: string) => {
        updateStatusColor(statusId, { color, bgColor: color, borderColor: color });
        toast({ title: 'Cor atualizada', description: `Cor do status "${statusId}" foi alterada.` });
    };

    const handleCreateStatus = (status: Omit<CustomStatusConfig, 'isCustom'>) => {
        createStatus(status);
        setShowNewForm(false);
        toast({ title: 'Status criado', description: `Status "${status.label}" foi criado com sucesso.` });
    };

    const handleDeleteStatus = (statusId: string) => {
        deleteStatus(statusId);
        toast({ title: 'Status excluído', description: `Status "${statusId}" foi removido.` });
    };

    const handleResetAll = () => {
        resetToDefaults();
        toast({ title: 'Cores resetadas', description: 'Todas as cores foram restauradas para o padrão.' });
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Palette className="h-6 w-6 text-primary" />
                            <div>
                                <CardTitle>Cores dos Status</CardTitle>
                                <CardDescription>
                                    Personalize as cores de cada status da agenda
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleResetAll}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Resetar Tudo
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Custom Statuses Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Status Personalizados</CardTitle>
                            <CardDescription>
                                Crie novos status para sua clínica
                            </CardDescription>
                        </div>
                        {!showNewForm && (
                            <Button onClick={() => setShowNewForm(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Status
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {showNewForm && (
                        <div className="mb-4">
                            <NewStatusForm
                                onSubmit={handleCreateStatus}
                                onCancel={() => setShowNewForm(false)}
                            />
                        </div>
                    )}

                    {customStatuses.length === 0 && !showNewForm ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum status personalizado criado.</p>
                            <p className="text-xs mt-1">Clique em "Novo Status" para criar.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {customStatuses.map((status) => (
                                <CustomStatusCard
                                    key={status.id}
                                    status={status}
                                    onUpdate={updateStatus}
                                    onDelete={handleDeleteStatus}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Default Statuses by Group */}
            {Object.entries(STATUS_GROUPS).map(([groupName, statusIds]) => (
                <Collapsible
                    key={groupName}
                    open={expandedGroups[groupName]}
                    onOpenChange={() => toggleGroup(groupName)}
                >
                    <Card>
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{groupName}</CardTitle>
                                    {expandedGroups[groupName] ? (
                                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    {statusIds.map((statusId) => {
                                        const config = statusConfig[statusId];
                                        if (!config) return null;
                                        return (
                                            <StatusColorEditor
                                                key={statusId}
                                                statusId={statusId}
                                                label={config.label}
                                                currentColor={config.color}
                                                isCustom={false}
                                                hasCustomColor={hasCustomColors(statusId)}
                                                onColorChange={(color) => handleColorChange(statusId, color)}
                                                onReset={() => resetStatusColor(statusId)}
                                            />
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            ))}
        </div>
    );
}
