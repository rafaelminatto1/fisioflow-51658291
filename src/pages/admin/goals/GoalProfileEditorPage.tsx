import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus,
    Save,
    ArrowLeft,
    Trash2,
    ArrowUp,
    ArrowDown,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsAdminService, ProfileDetail } from '@/services/goals/goalsAdminService';
import { metricRegistry } from '@/lib/metrics/metricRegistry';
import { GoalTarget, TargetMode } from '@/lib/goals/goalProfiles.seed';

// Pre-compute metric options based on registry
// Filter out those without keys or labels just in case
const METRIC_OPTIONS = Object.values(metricRegistry)
    .filter(m => m.key && m.label)
    .map(m => ({
        value: m.key,
        label: m.label,
        group: m.group || 'OUTROS'
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

const TARGET_MODES: { value: TargetMode; label: string }[] = [
    { value: 'CUT_OFF', label: 'Ponto de Corte (Valor Fixo)' },
    { value: 'IMPROVEMENT_ABS', label: 'Melhora Absoluta (Delta)' },
    { value: 'IMPROVEMENT_PCT', label: 'Melhora Percentual (%)' },
    { value: 'RANGE', label: 'Faixa de Valores' },
    { value: 'CUSTOM', label: 'Personalizado' },
];

export default function GoalProfileEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("targets");

    // Local state for the form
    const [formData, setFormData] = useState<Partial<ProfileDetail>>({
        name: '',
        description: '',
        targets: []
    });

    const isNew = id === 'new';

    const { data: profile, isLoading, isError, error } = useQuery({
        queryKey: ['goalProfile', id],
        queryFn: () => goalsAdminService.getProfile(id!),
        enabled: !!id && !isNew,
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name,
                description: profile.description,
                targets: profile.targets || []
            });
        }
    }, [profile]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: Partial<ProfileDetail>) => goalsAdminService.updateProfile(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goalProfiles'] });
            queryClient.invalidateQueries({ queryKey: ['goalProfile', id] });
            toast({ title: "Salvo com sucesso", description: "As alterações foram salvas." });
        },
        onError: (error: unknown) => {
            console.error("Failed to save profile:", error);
            toast({ title: "Erro ao salvar", description: error.message || "Erro desconhecido", variant: "destructive" });
        }
    });

    const handleSave = () => {
        if (!formData.name) {
            toast({ title: "Nome obrigatório", description: "Por favor, insira um nome para o perfil.", variant: "destructive" });
            return;
        }
        updateProfileMutation.mutate(formData);
    };

    const addTarget = () => {
        const newTarget: GoalTarget = {
            key: METRIC_OPTIONS[0]?.value || '',
            mode: 'IMPROVEMENT_PCT',
            minDeltaPct: 10,
            notes: ''
        };
        setFormData(prev => ({
            ...prev,
            targets: [...(prev.targets || []), newTarget]
        }));
    };

    const removeTarget = (index: number) => {
        setFormData(prev => ({
            ...prev,
            targets: prev.targets?.filter((_, i) => i !== index)
        }));
    };

    const moveTarget = (index: number, direction: 'up' | 'down') => {
        setFormData(prev => {
            const newTargets = [...(prev.targets || [])];
            if (direction === 'up' && index > 0) {
                [newTargets[index], newTargets[index - 1]] = [newTargets[index - 1], newTargets[index]];
            } else if (direction === 'down' && index < newTargets.length - 1) {
                [newTargets[index], newTargets[index + 1]] = [newTargets[index + 1], newTargets[index]];
            }
            return { ...prev, targets: newTargets };
        });
    };

    const updateTarget = (index: number, field: keyof GoalTarget, value: string | number | boolean) => {
        setFormData(prev => {
            const newTargets = [...(prev.targets || [])];
            newTargets[index] = { ...newTargets[index], [field]: value };
            return { ...prev, targets: newTargets };
        });
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Carregando perfil...</p>
                </div>
            </MainLayout>
        );
    }

    if (isError) {
        return (
            <MainLayout>
                <div className="container p-6 flex justify-center">
                    <Card className="max-w-md w-full border-destructive/20">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-6 w-6" />
                                <CardTitle>Erro ao carregar</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm">Não foi possível carregar o perfil. Verifique sua conexão ou se o perfil existe.</p>
                            <div className="text-xs font-mono bg-muted p-2 rounded text-muted-foreground overflow-auto">
                                {error instanceof Error ? error.message : "Erro desconhecido"}
                            </div>
                            <Button onClick={() => navigate('/admin/goals')} variant="outline" className="w-full">Voltar para Lista</Button>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="container mx-auto p-6 space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/goals')} title="Voltar">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold">{formData.name || 'Novo Perfil'}</h1>
                                {profile?.status && (
                                    <Badge variant={profile.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                                        {profile.status}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">{id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="targets">Metas e Alvos</TabsTrigger>
                        <TabsTrigger value="metadata">Metadados</TabsTrigger>
                        <TabsTrigger value="json">JSON (Avançado)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="targets" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle>Configuração de Alvos</CardTitle>
                                    <CardDescription>Defina as métricas e critérios de sucesso para este perfil.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={addTarget}>
                                    <Plus className="mr-2 h-4 w-4" /> Adicionar Alvo
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {formData.targets?.length === 0 && (
                                    <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/10">
                                        <p className="text-muted-foreground mb-4">Nenhum alvo configurado.</p>
                                        <Button variant="outline" onClick={addTarget}>Adicionar o primeiro alvo</Button>
                                    </div>
                                )}
                                {formData.targets?.map((target, index) => (
                                    <div key={index} className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors relative group">

                                        {/* Order Controls */}
                                        <div className="flex flex-col gap-1 mt-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={index === 0}
                                                onClick={() => moveTarget(index, 'up')}
                                                title="Mover para cima"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={index === (formData.targets?.length || 0) - 1}
                                                onClick={() => moveTarget(index, 'down')}
                                                title="Mover para baixo"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="flex-1 grid gap-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-muted-foreground">Métrica</Label>
                                                    <Select
                                                        value={target.key}
                                                        onValueChange={(val) => updateTarget(index, 'key', val)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione uma métrica" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {METRIC_OPTIONS.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    <span className="font-medium">{opt.label}</span>
                                                                    <span className="text-xs text-muted-foreground ml-2">({opt.value})</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-muted-foreground">Modo de Avaliação</Label>
                                                    <Select
                                                        value={target.mode}
                                                        onValueChange={(val) => updateTarget(index, 'mode', val as TargetMode)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {TARGET_MODES.map(m => (
                                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Dynamic Fields based on Mode */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-md">
                                                {(target.mode === 'CUT_OFF' || target.mode === 'RANGE') && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Mínimo Absoluto</Label>
                                                        <Input
                                                            type="number"
                                                            value={target.min ?? ''}
                                                            onChange={(e) => updateTarget(index, 'min', e.target.value ? Number(e.target.value) : undefined)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                )}
                                                {(target.mode === 'RANGE') && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Máximo Absoluto</Label>
                                                        <Input
                                                            type="number"
                                                            value={target.max ?? ''}
                                                            onChange={(e) => updateTarget(index, 'max', e.target.value ? Number(e.target.value) : undefined)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                )}
                                                {(target.mode === 'IMPROVEMENT_ABS') && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Delta Mínimo (Abs)</Label>
                                                        <Input
                                                            type="number"
                                                            value={target.minDeltaAbs ?? ''}
                                                            onChange={(e) => updateTarget(index, 'minDeltaAbs', e.target.value ? Number(e.target.value) : undefined)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                )}
                                                {(target.mode === 'IMPROVEMENT_PCT') && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Melhora Mínima (%)</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                className="pr-6 h-8"
                                                                value={target.minDeltaPct ?? ''}
                                                                onChange={(e) => updateTarget(index, 'minDeltaPct', e.target.value ? Number(e.target.value) : undefined)}
                                                            />
                                                            <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="col-span-2 space-y-1">
                                                    <Label className="text-xs">Notas / Explicação</Label>
                                                    <Input
                                                        value={target.notes || ''}
                                                        onChange={(e) => updateTarget(index, 'notes', e.target.value)}
                                                        placeholder="Ex: Reduzir valgo dinâmico..."
                                                        className="h-8"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive self-start"
                                            onClick={() => removeTarget(index)}
                                            title="Remover alvo"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="metadata" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações Básicas</CardTitle>
                                <CardDescription>Edite os detalhes descritivos deste perfil.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome do Perfil</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Reabilitação LCA - Fase 2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        placeholder="Descreva o propósito e os critérios de uso deste perfil..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="json">
                        <Card>
                            <CardHeader>
                                <CardTitle>Editor JSON Avançado</CardTitle>
                                <CardDescription>Visualize ou edite a estrutura bruta dos dados. Use com cuidado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    className="font-mono text-xs bg-slate-50 dark:bg-slate-950"
                                    rows={20}
                                    value={JSON.stringify(formData, null, 2)}
                                    readOnly
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}
