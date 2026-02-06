import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, collection, doc, getDocs, query as firestoreQuery, orderBy, addDoc, updateDoc, deleteDoc, QueryDocumentSnapshot } from '@/integrations/firebase/app';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Gift, Package } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeFirestoreData } from '@/utils/firestoreData';

type Reward = {
    id: string;
    title: string;
    description: string | null;
    point_cost: number;
    icon: string | null;
    category: string | null;
    stock: number | null;
    is_active: boolean;
    image_url: string | null;
    created_at: string;
};

const CATEGORIES = [
    { value: 'physical', label: 'Físico' },
    { value: 'digital', label: 'Digital' },
    { value: 'discount', label: 'Desconto' },
    { value: 'experience', label: 'Experiência' },
    { value: 'general', label: 'Geral' },
];

const ICONS = ['Gift', 'Calendar', 'Percent', 'Coffee', 'Flower', 'Dumbbell', 'Scan', 'Star', 'Trophy'];

export default function RewardsManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);

    const { data: rewards, isLoading } = useQuery({
        queryKey: ['admin-rewards'],
        queryFn: async () => {
            const rewardsRef = collection(db, 'rewards');
            const q = firestoreQuery(rewardsRef, orderBy('created_at', 'desc'));
            const querySnapshot = await getDocs(q);

            const rewards: Reward[] = [];
            querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
                rewards.push({
                    id: doc.id,
                    ...normalizeFirestoreData(doc.data())
                } as Reward);
            });

            return rewards;
        }
    });

    const upsertReward = useMutation({
        mutationFn: async (values: Partial<Reward>) => {
            const rewardData: Omit<Reward, 'id'> & { created_at?: string } = {
                title: values.title!,
                description: values.description || null,
                point_cost: values.point_cost!,
                icon: values.icon || 'Gift',
                category: values.category || 'general',
                stock: values.stock || null,
                is_active: values.is_active ?? true,
                image_url: values.image_url || null,
                updated_at: new Date().toISOString()
            };

            if (editingReward?.id) {
                // Update existing reward
                const rewardRef = doc(db, 'rewards', editingReward.id);
                await updateDoc(rewardRef, rewardData);
                return { id: editingReward.id, ...rewardData };
            } else {
                // Create new reward
                rewardData.created_at = new Date().toISOString();
                const docRef = await addDoc(collection(db, 'rewards'), rewardData);
                return { id: docRef.id, ...rewardData };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
            setIsDialogOpen(false);
            setEditingReward(null);
            toast({
                title: "Sucesso",
                description: "Recompensa salva com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: "Falha ao salvar recompensa: " + error.message,
                variant: "destructive"
            });
        }
    });

    const toggleActive = useMutation({
        mutationFn: async ({ id, currentState }: { id: string, currentState: boolean }) => {
            const rewardRef = doc(db, 'rewards', id);
            await updateDoc(rewardRef, {
                is_active: !currentState,
                updated_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
        }
    });

    const deleteReward = useMutation({
        mutationFn: async (id: string) => {
            const rewardRef = doc(db, 'rewards', id);
            await deleteDoc(rewardRef);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
            toast({ title: "Removido", description: "Recompensa removida com sucesso" });
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const stockValue = formData.get('stock') as string;

        upsertReward.mutate({
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            point_cost: parseInt(formData.get('point_cost') as string),
            icon: formData.get('icon') as string,
            category: formData.get('category') as string,
            stock: stockValue ? parseInt(stockValue) : null,
            image_url: formData.get('image_url') as string,
            is_active: true
        });
    };

    const openEdit = (reward: Reward) => {
        setEditingReward(reward);
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        Loja de Recompensas
                    </CardTitle>
                    <CardDescription>Gerencie as recompensas que os pacientes podem resgatar</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingReward(null);
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Recompensa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título</Label>
                                <Input id="title" name="title" required defaultValue={editingReward?.title} placeholder="Ex: Sessão Bônus" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" name="description" defaultValue={editingReward?.description || ''} placeholder="Descreva a recompensa..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="point_cost">Custo (Pontos)</Label>
                                    <Input id="point_cost" name="point_cost" type="number" required defaultValue={editingReward?.point_cost || 100} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stock">Estoque (vazio = ilimitado)</Label>
                                    <Input id="stock" name="stock" type="number" defaultValue={editingReward?.stock || ''} placeholder="∞" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Categoria</Label>
                                    <Select name="category" defaultValue={editingReward?.category || 'general'}>
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
                                <div className="space-y-2">
                                    <Label htmlFor="icon">Ícone</Label>
                                    <Select name="icon" defaultValue={editingReward?.icon || 'Gift'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ICONS.map(icon => (
                                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url">URL da Imagem (opcional)</Label>
                                <Input id="image_url" name="image_url" defaultValue={editingReward?.image_url || ''} placeholder="https://..." />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={upsertReward.isPending}>
                                    {upsertReward.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rewards?.map(reward => (
                            <div key={reward.id} className={`relative p-4 border rounded-xl transition-all group ${reward.is_active ? 'bg-card hover:shadow-md' : 'bg-muted/50 opacity-60'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`p-3 rounded-xl ${reward.is_active ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground'}`}>
                                        <Gift className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold truncate">{reward.title}</h4>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{reward.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {reward.point_cost} pts
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {CATEGORIES.find(c => c.value === reward.category)?.label || 'Geral'}
                                            </Badge>
                                            {reward.stock !== null && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Package className="h-3 w-3" /> {reward.stock}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 p-1 rounded-lg backdrop-blur-sm border">
                                    <div className="flex items-center gap-1 mr-2">
                                        <Label htmlFor={`active-${reward.id}`} className="text-[10px] text-muted-foreground">Ativo</Label>
                                        <Switch
                                            id={`active-${reward.id}`}
                                            checked={reward.is_active}
                                            onCheckedChange={() => toggleActive.mutate({ id: reward.id, currentState: !!reward.is_active })}
                                            className="scale-75"
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(reward)} aria-label={`Editar ${reward.name}`}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                        if (confirm('Excluir recompensa?')) deleteReward.mutate(reward.id);
                                    }} aria-label={`Excluir ${reward.name}`}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {(!rewards || rewards.length === 0) && (
                            <div className="col-span-full text-center p-8 border rounded-xl border-dashed text-muted-foreground">
                                Nenhuma recompensa cadastrada. Clique em "Nova Recompensa" para começar.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}