import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Search, Filter, CheckSquare, Square, Trash, Power } from 'lucide-react';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';

type QuestDefinition = {
    id: string;
    title: string;
    description: string | null;
    xp_reward: number;
    icon: string | null;
    is_active: boolean;
    category: string | null;
    created_at: string;
};

const CATEGORIES = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'special', label: 'Especial' },
    { value: 'challenge', label: 'Desafio' },
];

const ICON_OPTIONS = ['Star', 'Target', 'Flame', 'Zap', 'Award', 'Activity', 'Droplets', 'Heart', 'Moon', 'Sun'];

export default function QuestsManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingQuest, setEditingQuest] = useState<QuestDefinition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const { data: quests, isLoading } = useQuery({
        queryKey: ['admin-quests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('quest_definitions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as QuestDefinition[];
        }
    });

    // Filtro e busca
    const filteredQuests = useMemo(() => {
        if (!quests) return [];

        return quests.filter(quest => {
            const matchesSearch = quest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (quest.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || quest.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && quest.is_active) ||
                (statusFilter === 'inactive' && !quest.is_active);

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [quests, searchTerm, categoryFilter, statusFilter]);

    // Estatísticas
    const stats = useMemo(() => {
        if (!quests) return { total: 0, active: 0, inactive: 0 };
        return {
            total: quests.length,
            active: quests.filter(q => q.is_active).length,
            inactive: quests.filter(q => !q.is_active).length,
        };
    }, [quests]);

    const upsertQuest = useMutation({
        mutationFn: async (values: Partial<QuestDefinition>) => {
            const { data, error } = await supabase
                .from('quest_definitions')
                .upsert({
                    id: editingQuest?.id,
                    title: values.title!,
                    description: values.description,
                    xp_reward: values.xp_reward,
                    icon: values.icon,
                    category: values.category || 'daily',
                    is_active: values.is_active ?? true
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
            setIsDialogOpen(false);
            setEditingQuest(null);
            toast({
                title: "Sucesso",
                description: "Missão salva com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: "Falha ao salvar missão: " + error.message,
                variant: "destructive"
            });
        }
    });

    const toggleActive = useMutation({
        mutationFn: async ({ id, currentState }: { id: string, currentState: boolean }) => {
            const { error } = await supabase
                .from('quest_definitions')
                .update({ is_active: !currentState })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
        }
    });

    const deleteQuest = useMutation({
        mutationFn: async (id: string | string[]) => {
            const ids = Array.isArray(id) ? id : [id];
            const { error } = await supabase
                .from('quest_definitions')
                .delete()
                .in('id', ids);

            if (error) throw error;
        },
        onSuccess: (_, ids) => {
            queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
            const count = Array.isArray(ids) ? ids.length : 1;
            toast({
                title: "Removido",
                description: `${count} missão(ões) removida(s) com sucesso`
            });
            setSelectedIds(new Set());
        }
    });

    // Ações em lote
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredQuests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredQuests.map(q => q.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const bulkDelete = () => {
        if (selectedIds.size === 0) return;
        deleteQuest.mutate(Array.from(selectedIds));
        setDeleteDialogOpen(false);
    };

    const bulkToggleActive = (active: boolean) => {
        if (selectedIds.size === 0) return;

        Promise.all(
            Array.from(selectedIds).map(id =>
                supabase.from('quest_definitions').update({ is_active: active }).eq('id', id)
            )
        ).then(() => {
            queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
            toast({
                title: "Sucesso",
                description: `${selectedIds.size} missão(ões) ${active ? 'ativada(s)' : 'desativada(s)'}`
            });
            setSelectedIds(new Set());
        });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        upsertQuest.mutate({
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            xp_reward: parseInt(formData.get('xp_reward') as string),
            icon: formData.get('icon') as string,
            category: formData.get('category') as string,
            is_active: true
        });
    };

    const openEdit = (quest: QuestDefinition) => {
        setEditingQuest(quest);
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Missões Diárias
                            <Badge variant="secondary">{stats.total}</Badge>
                            <Badge variant="outline" className="text-green-600">
                                {stats.active} ativas
                            </Badge>
                        </CardTitle>
                        <CardDescription>Gerencie as tarefas disponíveis para os pacientes</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setEditingQuest(null);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Nova Missão
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingQuest ? 'Editar Missão' : 'Nova Missão'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título *</Label>
                                    <Input id="title" name="title" required defaultValue={editingQuest?.title} placeholder="Ex: Beber 2L de Água" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Textarea id="description" name="description" defaultValue={editingQuest?.description || ''} placeholder="Ex: Manter-se hidratado durante o dia..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="xp_reward">XP Recompensa *</Label>
                                        <Input id="xp_reward" name="xp_reward" type="number" required min="1" defaultValue={editingQuest?.xp_reward || 50} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Categoria *</Label>
                                        <Select name="category" defaultValue={editingQuest?.category || 'daily'}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="icon">Ícone</Label>
                                    <Select name="icon" defaultValue={editingQuest?.icon || 'Star'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ICON_OPTIONS.map(icon => (
                                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={upsertQuest.isPending}>
                                        {upsertQuest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filtros e Busca */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por título ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas Categorias</SelectItem>
                            {CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="active">Ativas</SelectItem>
                            <SelectItem value="inactive">Inativas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Ações em lote */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <span className="text-sm font-medium">
                            {selectedIds.size} missão(ões) selecionada(s)
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkToggleActive(true)}
                                className="gap-1"
                            >
                                <Power className="h-4 w-4" />
                                Ativar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkToggleActive(false)}
                                className="gap-1"
                            >
                                <Power className="h-4 w-4" />
                                Desativar
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteDialogOpen(true)}
                                className="gap-1"
                            >
                                <Trash className="h-4 w-4" />
                                Excluir
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lista de Missões */}
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredQuests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border rounded-xl border-dashed text-center">
                        <Target className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                                ? 'Nenhuma missão encontrada'
                                : 'Nenhuma missão cadastrada'}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                                ? 'Tente ajustar os filtros de busca'
                                : 'Clique em "Nova Missão" para começar'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Header da tabela com checkbox */}
                        <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={toggleSelectAll}
                            >
                                {selectedIds.size === filteredQuests.length ? (
                                    <CheckSquare className="h-4 w-4" />
                                ) : (
                                    <Square className="h-4 w-4" />
                                )}
                            </Button>
                            <span>Selecionar todos ({filteredQuests.length})</span>
                        </div>

                        {filteredQuests.map(quest => (
                            <div
                                key={quest.id}
                                className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                                    quest.is_active
                                        ? 'bg-card hover:bg-accent/50 hover:shadow-sm'
                                        : 'bg-muted/50 opacity-70'
                                } ${selectedIds.has(quest.id) ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 shrink-0"
                                    onClick={() => toggleSelect(quest.id)}
                                >
                                    {selectedIds.has(quest.id) ? (
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Square className="h-4 w-4" />
                                    )}
                                </Button>

                                <div className={`p-3 rounded-full shrink-0 ${
                                    quest.is_active
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    <div className="font-mono text-xs font-bold w-7 h-7 flex items-center justify-center">
                                        {quest.icon?.slice(0, 2).toUpperCase() || 'XP'}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className={`font-semibold ${!quest.is_active && 'text-muted-foreground line-through'}`}>
                                            {quest.title}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs">
                                            {quest.xp_reward} XP
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {CATEGORIES.find(c => c.value === quest.category)?.label || quest.category}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate mt-1">
                                        {quest.description || 'Sem descrição'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Switch
                                        checked={quest.is_active}
                                        onCheckedChange={() => toggleActive.mutate({ id: quest.id, currentState: quest.is_active })}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEdit(quest)}
                                        disabled={selectedIds.size > 0}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive/90"
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja excluir?')) deleteQuest.mutate(quest.id);
                                        }}
                                        disabled={selectedIds.size > 0}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Dialog de confirmação de exclusão em lote */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir {selectedIds.size} missão(ões)? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
