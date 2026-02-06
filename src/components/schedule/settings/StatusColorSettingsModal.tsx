import React, { useState } from 'react';
import {

    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStatusConfig, CustomStatusConfig } from '@/hooks/useStatusConfig';
import { cn } from '@/lib/utils';
import { Palette, Plus, RotateCcw, Trash2, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StatusColorSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

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
                        <p className="text-xs text-muted-foreground">{statusId}</p>
                    </div>
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
                    <div className="grid grid-cols-5 gap-2">
                        {COLOR_PALETTE.map((color) => (
                            <button
                                key={color}
                                className={cn(
                                    "w-8 h-8 rounded-md border-2 transition-all hover:scale-110",
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
        // Convert to snake_case
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
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="new-status-id" className="text-xs">ID (snake_case)</Label>
                    <Input
                        id="new-status-id"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        placeholder="novo_status"
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label htmlFor="new-status-label" className="text-xs">Nome</Label>
                    <Input
                        id="new-status-label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Novo Status"
                        className="h-8 text-sm"
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
                <div className="grid grid-cols-5 gap-1 flex-1">
                    {COLOR_PALETTE.slice(0, 5).map((c) => (
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
            <div className="flex justify-end gap-2">
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
    );
}

export function StatusColorSettingsModal({ open, onOpenChange }: StatusColorSettingsModalProps) {
    const {
        statusConfig,
        updateStatusColor,
        createStatus,
        deleteStatus,
        resetToDefaults,
        resetStatusColor,
        _isCustomStatus,
        hasCustomColors,
        customStatuses,
    } = useStatusConfig();

    const [showNewForm, setShowNewForm] = useState(false);

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

    // Group statuses by category
    const statusGroups = {
        'Positivos': ['realizado', 'completed', 'concluido', 'atendido', 'confirmado', 'confirmed'],
        'Agendados': ['agendado', 'scheduled', 'avaliacao'],
        'Pendentes': ['aguardando_confirmacao', 'em_espera', 'em_andamento'],
        'Negativos': ['cancelado', 'falta', 'faltou'],
        'Outros': ['remarcado', 'reagendado', 'atrasado'],
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        Configurações de Status
                    </DialogTitle>
                    <DialogDescription>
                        Personalize as cores dos status e crie novos status customizados.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="colors" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="colors">Cores</TabsTrigger>
                        <TabsTrigger value="custom">Status Customizados</TabsTrigger>
                    </TabsList>

                    <TabsContent value="colors" className="flex-1 min-h-0">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                {Object.entries(statusGroups).map(([groupName, statusIds]) => (
                                    <div key={groupName}>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">{groupName}</h3>
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
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="custom" className="flex-1 min-h-0">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {!showNewForm && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setShowNewForm(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar Novo Status
                                    </Button>
                                )}

                                {showNewForm && (
                                    <NewStatusForm
                                        onSubmit={handleCreateStatus}
                                        onCancel={() => setShowNewForm(false)}
                                    />
                                )}

                                {customStatuses.length === 0 && !showNewForm && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p className="text-sm">Nenhum status customizado criado.</p>
                                        <p className="text-xs mt-1">Clique no botão acima para criar um novo status.</p>
                                    </div>
                                )}

                                {customStatuses.map((status) => (
                                    <StatusColorEditor
                                        key={status.id}
                                        statusId={status.id}
                                        label={status.label}
                                        currentColor={status.color}
                                        isCustom={true}
                                        hasCustomColor={false}
                                        onColorChange={(color) => handleColorChange(status.id, color)}
                                        onReset={() => { }}
                                        onDelete={() => handleDeleteStatus(status.id)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={handleResetAll}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Resetar Tudo
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
