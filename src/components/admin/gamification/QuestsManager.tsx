import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Search, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { gamificationApi, type QuestDefinitionRow } from '@/lib/api/workers-client';

type QuestDefinition = QuestDefinitionRow;

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

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['admin-quests'],
    queryFn: async () => (await gamificationApi.questDefinitions.list()).data ?? [],
  });

  const filteredQuests = useMemo(() => quests.filter((quest) => {
    const matchesSearch = quest.title.toLowerCase().includes(searchTerm.toLowerCase()) || (quest.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || quest.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && quest.is_active) || (statusFilter === 'inactive' && !quest.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [quests, searchTerm, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({ total: quests.length, active: quests.filter((q) => q.is_active).length, inactive: quests.filter((q) => !q.is_active).length }), [quests]);

  const upsertQuest = useMutation({
    mutationFn: async (values: Partial<QuestDefinition>) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        xp_reward: values.xp_reward || 0,
        points_reward: values.points_reward || 0,
        icon: values.icon || null,
        category: values.category || 'daily',
        difficulty: values.difficulty || 'easy',
        is_active: values.is_active ?? true,
        repeat_interval: values.repeat_interval || 'daily',
        requirements: values.requirements || {},
        code: values.code || null,
      };
      if (editingQuest?.id) return (await gamificationApi.questDefinitions.update(editingQuest.id, payload)).data;
      return (await gamificationApi.questDefinitions.create(payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
      setIsDialogOpen(false);
      setEditingQuest(null);
      toast({ title: 'Sucesso', description: 'Missão salva com sucesso!' });
    },
    onError: (error: Error) => toast({ title: 'Erro', description: `Falha ao salvar missão: ${error.message}`, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, currentState }: { id: string; currentState: boolean }) => gamificationApi.questDefinitions.setActive(id, !currentState),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quests'] }),
  });

  const deleteQuest = useMutation({
    mutationFn: async (id: string) => gamificationApi.questDefinitions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quests'] });
      toast({ title: 'Removido', description: 'Missão removida com sucesso' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    upsertQuest.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      xp_reward: Number(formData.get('xp_reward') as string),
      points_reward: Number(formData.get('points_reward') as string),
      icon: formData.get('icon') as string,
      category: formData.get('category') as string,
      difficulty: formData.get('difficulty') as string,
      repeat_interval: formData.get('repeat_interval') as string,
      is_active: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">Missões <Badge variant="secondary">{stats.total}</Badge></CardTitle>
            <CardDescription>Gerencie as missões disponíveis na gamificação</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingQuest(null); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nova Missão</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingQuest ? 'Editar Missão' : 'Nova Missão'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required defaultValue={editingQuest?.title} /></div>
                <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={editingQuest?.description || ''} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="xp_reward">XP</Label><Input id="xp_reward" name="xp_reward" type="number" required defaultValue={editingQuest?.xp_reward || 0} /></div>
                  <div className="space-y-2"><Label htmlFor="points_reward">Pontos</Label><Input id="points_reward" name="points_reward" type="number" required defaultValue={editingQuest?.points_reward || 0} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Categoria</Label><Select name="category" defaultValue={editingQuest?.category || 'daily'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Ícone</Label><Select name="icon" defaultValue={editingQuest?.icon || 'Target'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ICON_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Dificuldade</Label><Select name="difficulty" defaultValue={editingQuest?.difficulty || 'easy'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Fácil</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="hard">Difícil</SelectItem><SelectItem value="expert">Expert</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Repetição</Label><Select name="repeat_interval" defaultValue={editingQuest?.repeat_interval || 'daily'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="once">Uma vez</SelectItem><SelectItem value="daily">Diária</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent></Select></div>
                </div>
                <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={upsertQuest.isPending}>{upsertQuest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-wrap gap-3 pt-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar missões..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas categorias</SelectItem>{CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos status</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="inactive">Inativas</SelectItem></SelectContent></Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
          <div className="space-y-3">
            {filteredQuests.map((quest) => (
              <div key={quest.id} className="border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><p className="font-semibold truncate">{quest.title}</p></div>
                  <p className="text-sm text-muted-foreground">{quest.description}</p>
                  <div className="flex gap-2 flex-wrap"><Badge variant="outline">{quest.category}</Badge><Badge variant="outline">{quest.difficulty}</Badge><Badge variant="secondary">+{quest.xp_reward} XP</Badge>{quest.points_reward ? <Badge variant="secondary">+{quest.points_reward} pts</Badge> : null}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch checked={quest.is_active} onCheckedChange={() => toggleActive.mutate({ id: quest.id, currentState: quest.is_active })} />
                  <Button size="icon" variant="ghost" onClick={() => { setEditingQuest(quest); setIsDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteQuest.mutate(quest.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
