import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Award } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Achievement = {
    id: string;
    code: string;
    title: string;
    description: string;
    xp_reward: number | null;
    icon: string | null;
    category: string | null;
};

export default function AchievementsManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

    const { data: achievements, isLoading } = useQuery({
        queryKey: ['admin-achievements'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .order('xp_reward', { ascending: true });

            if (error) throw error;
            return data as Achievement[];
        }
    });

    const upsertAchievement = useMutation({
        mutationFn: async (values: Partial<Achievement>) => {
            const { data, error } = await supabase
                .from('achievements')
                .upsert({
                    id: editingAchievement?.id,
                    code: values.code!,
                    title: values.title!,
                    description: values.description!,
                    xp_reward: values.xp_reward,
                    icon: values.icon,
                    category: values.category || 'general',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
            setIsDialogOpen(false);
            setEditingAchievement(null);
            toast({
                title: "Sucesso",
                description: "Conquista salva com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: "Falha ao salvar conquista: " + error.message,
                variant: "destructive"
            });
        }
    });

    const deleteAchievement = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('achievements')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
            toast({ title: "Removido", description: "Conquista removida com sucesso" });
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        upsertAchievement.mutate({
            code: formData.get('code') as string,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            xp_reward: parseInt(formData.get('xp_reward') as string),
            icon: formData.get('icon') as string,
            category: formData.get('category') as string,
        });
    };

    const openEdit = (achievement: Achievement) => {
        setEditingAchievement(achievement);
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Conquistas & Medalhas</CardTitle>
                    <CardDescription>Gerencie as medalhas desbloqueáveis pelos pacientes</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingAchievement(null);
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Conquista
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAchievement ? 'Editar Conquista' : 'Nova Conquista'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Código (Único)</Label>
                                    <Input id="code" name="code" required defaultValue={editingAchievement?.code} placeholder="ex: first_login" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Categoria</Label>
                                    <Input id="category" name="category" defaultValue={editingAchievement?.category || 'general'} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Título</Label>
                                <Input id="title" name="title" required defaultValue={editingAchievement?.title} placeholder="Ex: Primeiros Passos" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" name="description" required defaultValue={editingAchievement?.description} placeholder="Ex: Complete seu primeiro login..." />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="xp_reward">XP Recompensa</Label>
                                <Input id="xp_reward" name="xp_reward" type="number" required defaultValue={editingAchievement?.xp_reward || 100} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="icon">Ícone (Lucide ou Emoji)</Label>
                                <Input id="icon" name="icon" defaultValue={editingAchievement?.icon || 'Award'} />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={upsertAchievement.isPending}>
                                    {upsertAchievement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {achievements?.map(achievement => (
                            <div key={achievement.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors relative group">
                                <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-600">
                                    <Award className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold">{achievement.title}</h4>
                                        <Badge variant="outline">{achievement.category}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                                    <div className="mt-2 text-xs font-mono text-muted-foreground flex items-center gap-2">
                                        <span className="bg-muted px-1.5 py-0.5 rounded">{achievement.code}</span>
                                        <span className="text-primary font-bold">+{achievement.xp_reward} XP</span>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 p-1 rounded-lg backdrop-blur-sm border">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(achievement)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                        if (confirm('Excluir conquista?')) deleteAchievement.mutate(achievement.id);
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
