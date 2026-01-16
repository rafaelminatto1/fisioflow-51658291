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
import { Loader2, Plus, Pencil, Trash2, Target, Calendar } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type WeeklyChallenge = {
    id: string;
    title: string;
    description: string | null;
    xp_reward: number;
    point_reward: number;
    start_date: string;
    end_date: string;
    target: { type: string; count?: number };
    icon: string | null;
    is_active: boolean;
    created_at: string;
};

const TARGET_TYPES = [
    { value: 'sessions', label: 'Sessões Completadas' },
    { value: 'quests', label: 'Missões Diárias' },
    { value: 'streak', label: 'Dias de Sequência' },
    { value: 'exercises', label: 'Exercícios Realizados' },
];

export default function ChallengesManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState<WeeklyChallenge | null>(null);

    const { data: challenges, isLoading } = useQuery({
        queryKey: ['admin-challenges'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('weekly_challenges')
                .select('*')
                .order('start_date', { ascending: false });

            if (error) throw error;
            return data as WeeklyChallenge[];
        }
    });

    const upsertChallenge = useMutation({
        mutationFn: async (values: Partial<WeeklyChallenge>) => {
            const { data, error } = await supabase
                .from('weekly_challenges')
                .upsert({
                    id: editingChallenge?.id,
                    title: values.title!,
                    description: values.description,
                    xp_reward: values.xp_reward || 200,
                    point_reward: values.point_reward || 50,
                    start_date: values.start_date!,
                    end_date: values.end_date!,
                    target: values.target!,
                    icon: values.icon || 'Target',
                    is_active: values.is_active ?? true
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
            setIsDialogOpen(false);
            setEditingChallenge(null);
            toast({
                title: "Sucesso",
                description: "Desafio salvo com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: "Falha ao salvar desafio: " + error.message,
                variant: "destructive"
            });
        }
    });

    const toggleActive = useMutation({
        mutationFn: async ({ id, currentState }: { id: string, currentState: boolean }) => {
            const { error } = await supabase
                .from('weekly_challenges')
                .update({ is_active: !currentState })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
        }
    });

    const deleteChallenge = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('weekly_challenges')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
            toast({ title: "Removido", description: "Desafio removido com sucesso" });
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        upsertChallenge.mutate({
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            xp_reward: parseInt(formData.get('xp_reward') as string),
            point_reward: parseInt(formData.get('point_reward') as string),
            start_date: formData.get('start_date') as string,
            end_date: formData.get('end_date') as string,
            target: {
                type: formData.get('target_type') as string,
                count: parseInt(formData.get('target_count') as string)
            },
            icon: formData.get('icon') as string,
            is_active: true
        });
    };

    const openEdit = (challenge: WeeklyChallenge) => {
        setEditingChallenge(challenge);
        setIsDialogOpen(true);
    };

    const getChallengeStatus = (challenge: WeeklyChallenge) => {
        const today = new Date();
        const start = parseISO(challenge.start_date);
        const end = parseISO(challenge.end_date);

        if (today < start) return { label: 'Agendado', color: 'bg-blue-100 text-blue-700' };
        if (today > end) return { label: 'Encerrado', color: 'bg-gray-100 text-gray-700' };
        return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-500" />
                        Desafios Semanais
                    </CardTitle>
                    <CardDescription>Crie desafios com tempo limitado para motivar os pacientes</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingChallenge(null);
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Desafio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título</Label>
                                <Input id="title" name="title" required defaultValue={editingChallenge?.title} placeholder="Ex: Maratona da Semana" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" name="description" defaultValue={editingChallenge?.description || ''} placeholder="Complete 5 sessões esta semana..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">Data Início</Label>
                                    <Input id="start_date" name="start_date" type="date" required defaultValue={editingChallenge?.start_date} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">Data Fim</Label>
                                    <Input id="end_date" name="end_date" type="date" required defaultValue={editingChallenge?.end_date} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="target_type">Tipo de Meta</Label>
                                    <select name="target_type" id="target_type" className="w-full h-10 px-3 border rounded-md" defaultValue={editingChallenge?.target?.type || 'sessions'}>
                                        {TARGET_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="target_count">Quantidade</Label>
                                    <Input id="target_count" name="target_count" type="number" required defaultValue={editingChallenge?.target?.count || 5} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="xp_reward">XP Recompensa</Label>
                                    <Input id="xp_reward" name="xp_reward" type="number" required defaultValue={editingChallenge?.xp_reward || 200} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="point_reward">Pontos Recompensa</Label>
                                    <Input id="point_reward" name="point_reward" type="number" required defaultValue={editingChallenge?.point_reward || 50} />
                                </div>
                            </div>

                            <input type="hidden" name="icon" value="Target" />

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={upsertChallenge.isPending}>
                                    {upsertChallenge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                        {challenges?.map(challenge => {
                            const status = getChallengeStatus(challenge);
                            const daysRemaining = differenceInDays(parseISO(challenge.end_date), new Date());

                            return (
                                <div key={challenge.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${challenge.is_active ? 'bg-card hover:bg-accent/50' : 'bg-muted/50 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${challenge.is_active ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                                            <Target className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{challenge.title}</h4>
                                                <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{challenge.description}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(parseISO(challenge.start_date), 'dd/MM', { locale: ptBR })} - {format(parseISO(challenge.end_date), 'dd/MM', { locale: ptBR })}
                                                </span>
                                                <span>Meta: {challenge.target.count} {TARGET_TYPES.find(t => t.value === challenge.target.type)?.label || challenge.target.type}</span>
                                                {daysRemaining > 0 && status.label === 'Ativo' && (
                                                    <Badge variant="outline" className="text-[10px]">{daysRemaining} dias restantes</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-4">
                                            <div className="text-sm font-bold text-primary">+{challenge.xp_reward} XP</div>
                                            <div className="text-xs text-muted-foreground">+{challenge.point_reward} pts</div>
                                        </div>
                                        <div className="flex items-center gap-1 mr-2">
                                            <Label htmlFor={`active-${challenge.id}`} className="text-xs text-muted-foreground">Ativo</Label>
                                            <Switch
                                                id={`active-${challenge.id}`}
                                                checked={challenge.is_active}
                                                onCheckedChange={() => toggleActive.mutate({ id: challenge.id, currentState: !!challenge.is_active })}
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(challenge)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                                            if (confirm('Excluir desafio?')) deleteChallenge.mutate(challenge.id);
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {(!challenges || challenges.length === 0) && (
                            <div className="text-center p-8 border rounded-xl border-dashed text-muted-foreground">
                                Nenhum desafio cadastrado. Clique em "Novo Desafio" para começar.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
