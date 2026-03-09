import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { gamificationApi, type AchievementRow } from '@/lib/api/workers-client';

type Achievement = AchievementRow & { icon: string | null; category: string | null; xp_reward: number | null };

const ACHIEVEMENT_CATEGORIES = [
  { value: 'general', label: 'Geral' },
  { value: 'milestone', label: 'Marco' },
  { value: 'streak', label: 'Sequência' },
  { value: 'social', label: 'Social' },
  { value: 'special', label: 'Especial' },
];

const ICON_OPTIONS = ['Award', 'Trophy', 'Medal', 'Star', 'Flame', 'Zap', 'Target', 'Crown', 'Gem', 'Sparkles'];

export default function AchievementsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['admin-achievements'],
    queryFn: async () => {
      const res = await gamificationApi.achievementDefinitions.list();
      return (res.data ?? []) as Achievement[];
    },
  });

  const filteredAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      const matchesSearch = achievement.title.toLowerCase().includes(searchTerm.toLowerCase())
        || achievement.description.toLowerCase().includes(searchTerm.toLowerCase())
        || achievement.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || achievement.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [achievements, searchTerm, categoryFilter]);

  const stats = useMemo(() => ({
    total: achievements.length,
    totalXP: achievements.reduce((sum, a) => sum + (a.xp_reward || 0), 0),
  }), [achievements]);

  const upsertAchievement = useMutation({
    mutationFn: async (values: Partial<Achievement>) => {
      const payload = {
        code: values.code,
        title: values.title,
        description: values.description,
        xp_reward: values.xp_reward || 0,
        icon: values.icon || null,
        category: values.category || 'general',
        requirements: values.requirements || {},
      };
      if (editingAchievement?.id) {
        const res = await gamificationApi.achievementDefinitions.update(editingAchievement.id, payload);
        return res.data;
      }
      const res = await gamificationApi.achievementDefinitions.create(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      setIsDialogOpen(false);
      setEditingAchievement(null);
      toast({ title: 'Sucesso', description: 'Conquista salva com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: `Falha ao salvar conquista: ${error.message}`, variant: 'destructive' });
    },
  });

  const deleteAchievement = useMutation({
    mutationFn: async (id: string) => gamificationApi.achievementDefinitions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      toast({ title: 'Removido', description: 'Conquista removida com sucesso' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    upsertAchievement.mutate({
      code: formData.get('code') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      xp_reward: Number(formData.get('xp_reward') as string),
      icon: formData.get('icon') as string,
      category: formData.get('category') as string,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Conquistas & Medalhas
              <Badge variant="secondary">{stats.total}</Badge>
              <Badge variant="outline" className="text-yellow-600">{stats.totalXP} XP total</Badge>
            </CardTitle>
            <CardDescription>Gerencie as medalhas desbloqueáveis pelos pacientes</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingAchievement(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Nova Conquista</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingAchievement ? 'Editar Conquista' : 'Nova Conquista'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input id="code" name="code" required defaultValue={editingAchievement?.code} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xp_reward">XP</Label>
                    <Input id="xp_reward" name="xp_reward" type="number" required defaultValue={editingAchievement?.xp_reward || 0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" name="title" required defaultValue={editingAchievement?.title} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" required defaultValue={editingAchievement?.description} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select name="category" defaultValue={editingAchievement?.category || 'general'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ACHIEVEMENT_CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <Select name="icon" defaultValue={editingAchievement?.icon || 'Award'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ICON_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={upsertAchievement.isPending}>{upsertAchievement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-3 pt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar conquistas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {ACHIEVEMENT_CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAchievements.map((achievement) => (
              <div key={achievement.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{achievement.code}</p>
                    </div>
                  </div>
                  <Badge variant="outline">+{achievement.xp_reward || 0} XP</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{achievement.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{achievement.category || 'general'}</Badge>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingAchievement(achievement); setIsDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAchievement.mutate(achievement.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
