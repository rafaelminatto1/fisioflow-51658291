import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, collection, doc, getDocs, query as firestoreQuery, orderBy, addDoc, updateDoc, deleteDoc, writeBatch, QueryDocumentSnapshot } from '@/integrations/firebase/app';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Award, Search, CheckSquare, Square, Trash } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { normalizeFirestoreData } from '@/utils/firestoreData';

type Achievement = {
    id: string;
    code: string;
    title: string;
    description: string;
    xp_reward: number | null;
    icon: string | null;
    category: string | null;
};

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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const { data: achievements, isLoading } = useQuery({
        queryKey: ['admin-achievements'],
        queryFn: async () => {
            const achievementsRef = collection(db, 'achievements');
            const q = firestoreQuery(achievementsRef, orderBy('xp_reward', 'asc'));
            const querySnapshot = await getDocs(q);

            const achievements: Achievement[] = [];
            querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
                achievements.push({
                    id: doc.id,
                    ...normalizeFirestoreData(doc.data())
                } as Achievement);
            });

            return achievements;
        }
    });

    // Filtro e busca
    const filteredAchievements = useMemo(() => {
        if (!achievements) return [];

        return achievements.filter(achievement => {
            const matchesSearch = achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                achievement.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                achievement.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || achievement.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [achievements, searchTerm, categoryFilter]);

    // Estatísticas
    const stats = useMemo(() => {
        if (!achievements) return { total: 0, totalXP: 0 };
        return {
            total: achievements.length,
            totalXP: achievements.reduce((sum, a) => sum + (a.xp_reward || 0), 0),
        };
    }, [achievements]);

    const upsertAchievement = useMutation({
        mutationFn: async (values: Partial<Achievement>) => {
            const achievementData: Omit<Achievement, 'id'> & { created_at?: string } = {
                code: values.code!,
                title: values.title!,
                description: values.description!,
                xp_reward: values.xp_reward || 0,
                icon: values.icon || null,
                category: values.category || 'general',
                updated_at: new Date().toISOString()
            };

            if (editingAchievement?.id) {
                // Update existing achievement
                const achievementRef = doc(db, 'achievements', editingAchievement.id);
                await updateDoc(achievementRef, achievementData);
                return { id: editingAchievement.id, ...achievementData };
            } else {
                // Create new achievement
                achievementData.created_at = new Date().toISOString();
                const docRef = await addDoc(collection(db, 'achievements'), achievementData);
                return { id: docRef.id, ...achievementData };
            }
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
        mutationFn: async (id: string | string[]) => {
            const ids = Array.isArray(id) ? id : [id];
            const batch = writeBatch(db);

            ids.forEach(id => {
                const achievementRef = doc(db, 'achievements', id);
                batch.delete(achievementRef);
            });

            await batch.commit();
        },
        onSuccess: (_, ids) => {
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
            const count = Array.isArray(ids) ? ids.length : 1;
            toast({
                title: "Removido",
                description: `${count} conquista(s) removida(s) com sucesso`
            });
            setSelectedIds(new Set());
        }
    });

    // Ações em lote
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAchievements.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAchievements.map(a => a.id)));
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
        deleteAchievement.mutate(Array.from(selectedIds));
        setDeleteDialogOpen(false);
    };

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
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Conquistas & Medalhas
                            <Badge variant="secondary">{stats.total}</Badge>
                            <Badge variant="outline" className="text-yellow-600">
                                {stats.totalXP} XP total
                            </Badge>
                        </CardTitle>
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
                                        <Label htmlFor="code">Código (Único) *</Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            required
                                            defaultValue={editingAchievement?.code}
                                            placeholder="ex: first_login"
                                            pattern="[a-z0-9_]+"
                                            title="Use apenas letras minúsculas, números e underline"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Categoria *</Label>
                                        <Select name="category" defaultValue={editingAchievement?.category || 'general'}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ACHIEVEMENT_CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Título *</Label>
                                    <Input id="title" name="title" required defaultValue={editingAchievement?.title} placeholder="Ex: Primeiros Passos" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição *</Label>
                                    <Textarea id="description" name="description" required defaultValue={editingAchievement?.description} placeholder="Ex: Complete seu primeiro login..." rows={3} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="xp_reward">XP Recompensa *</Label>
                                        <Input id="xp_reward" name="xp_reward" type="number" required min="0" defaultValue={editingAchievement?.xp_reward || 100} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="icon">Ícone</Label>
                                        <Select name="icon" defaultValue={editingAchievement?.icon || 'Award'}>
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
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filtros e Busca */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por título, descrição ou código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas Categorias</SelectItem>
                            {ACHIEVEMENT_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Ações em lote */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <span className="text-sm font-medium">
                            {selectedIds.size} conquista(s) selecionada(s)
                        </span>
                        <div className="flex items-center gap-2">
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

                {/* Lista de Conquistas */}
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredAchievements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border rounded-xl border-dashed text-center">
                        <Award className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchTerm || categoryFilter !== 'all'
                                ? 'Nenhuma conquista encontrada'
                                : 'Nenhuma conquista cadastrada'}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {searchTerm || categoryFilter !== 'all'
                                ? 'Tente ajustar os filtros de busca'
                                : 'Clique em "Nova Conquista" para começar'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Header com checkbox */}
                        <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={toggleSelectAll}
                            >
                                {selectedIds.size === filteredAchievements.length ? (
                                    <CheckSquare className="h-4 w-4" />
                                ) : (
                                    <Square className="h-4 w-4" />
                                )}
                            </Button>
                            <span>Selecionar todos ({filteredAchievements.length})</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAchievements.map(achievement => (
                                <div
                                    key={achievement.id}
                                    className={`relative p-4 border rounded-lg transition-all group ${
                                        selectedIds.has(achievement.id) ? 'ring-2 ring-primary ring-offset-2' : ''
                                    }`}
                                >
                                    {/* Checkbox de seleção */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 left-2 h-6 w-6 p-0 z-10"
                                        onClick={() => toggleSelect(achievement.id)}
                                    >
                                        {selectedIds.has(achievement.id) ? (
                                            <CheckSquare className="h-3 w-3 text-primary" />
                                        ) : (
                                            <Square className="h-3 w-3" />
                                        )}
                                    </Button>

                                    <div className="flex items-start gap-3 pl-8">
                                        <div className="p-3 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 text-yellow-600 shrink-0">
                                            <Award className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-semibold text-sm">{achievement.title}</h4>
                                                <Badge variant="outline" className="text-xs shrink-0">
                                                    {ACHIEVEMENT_CATEGORIES.find(c => c.value === achievement.category)?.label || achievement.category}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{achievement.description}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                    {achievement.code}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    +{achievement.xp_reward} XP
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações (hover) */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 p-1 rounded-lg backdrop-blur-sm border">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => openEdit(achievement)}
                                            disabled={selectedIds.size > 0}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => {
                                                if (confirm('Excluir conquista?')) deleteAchievement.mutate(achievement.id);
                                            }}
                                            disabled={selectedIds.size > 0}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dialog de confirmação de exclusão em lote */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir {selectedIds.size} conquista(s)? Esta ação não pode ser desfeita.
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
