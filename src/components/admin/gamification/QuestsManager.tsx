import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

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

export default function QuestsManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingQuest, setEditingQuest] = useState<QuestDefinition | null>(null);

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
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('quest_definitions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
            toast({ title: "Removido", description: "Missão removida com sucesso" });
        }
    });

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
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Missões Diárias</CardTitle>
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
                                <Label htmlFor="title">Título</Label>
                                <Input id="title" name="title" required defaultValue={editingQuest?.title} placeholder="Ex: Beber 2L de Água" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" name="description" defaultValue={editingQuest?.description || ''} placeholder="Ex: Manter-se hidratado durante o dia..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="xp_reward">XP Recompensa</Label>
                                    <Input id="xp_reward" name="xp_reward" type="number" required defaultValue={editingQuest?.xp_reward || 50} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Categoria</Label>
                                    <Input id="category" name="category" defaultValue={editingQuest?.category || 'daily'} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="icon">Ícone (Lucide React Name)</Label>
                                <Input id="icon" name="icon" defaultValue={editingQuest?.icon || 'Star'} placeholder="Activity, Droplets, etc..." />
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
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <div className="space-y-4">
                        {quests?.map(quest => (
                            <div key={quest.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${quest.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {/* In a real app we'd map the icon string to a component, for now just a placeholder or dynamic icon import */}
                                        <div className="font-mono text-xs font-bold w-6 h-6 flex items-center justify-center">
                                            {quest.icon?.slice(0, 2).toUpperCase() || 'XP'}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold ${!quest.is_active && 'text-muted-foreground line-through'}`}>{quest.title}</h4>
                                        <p className="text-sm text-muted-foreground">{quest.description} • <Badge variant="secondary" className="text-xs">{quest.xp_reward} XP</Badge></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center mr-4 gap-2">
                                        <Label htmlFor={`active-${quest.id}`} className="text-xs text-muted-foreground">Ativo</Label>
                                        <Switch
                                            id={`active-${quest.id}`}
                                            checked={quest.is_active}
                                            onCheckedChange={() => toggleActive.mutate({ id: quest.id, currentState: !!quest.is_active })}
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(quest)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => {
                                        if (confirm('Tem certeza que deseja excluir?')) deleteQuest.mutate(quest.id);
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
