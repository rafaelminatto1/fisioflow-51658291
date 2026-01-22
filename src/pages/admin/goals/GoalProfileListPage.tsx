import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/web/ui/table';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/shared/ui/select';
import { Plus, Edit, Send, Loader2, Search, Filter } from 'lucide-react';
import { goalsAdminService } from '@/services/goals/goalsAdminService';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function GoalProfileListPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newProfile, setNewProfile] = useState({ id: '', name: '', description: '' });

    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Query for listing profiles
    const { data: profiles = [], isLoading, error } = useQuery({
        queryKey: ['goalProfiles'],
        queryFn: goalsAdminService.listProfiles,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Mutation for creating profile
    const createProfileMutation = useMutation({
        mutationFn: (data: { id: string; name: string; description: string }) =>
            goalsAdminService.createProfile(data.id, data.name, data.description),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['goalProfiles'] });
            toast({
                title: "Perfil criado",
                description: "O perfil de meta foi criado como rascunho.",
            });
            setIsCreateDialogOpen(false);
            setNewProfile({ id: '', name: '', description: '' });
            navigate(`/admin/goals/${data.id}`);
        },
        onError: (error: unknown) => {
            toast({
                title: "Erro ao criar perfil",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Mutation for publishing profile
    const publishProfileMutation = useMutation({
        mutationFn: (id: string) => goalsAdminService.publishProfile(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goalProfiles'] });
            toast({
                title: "Perfil publicado",
                description: "O perfil agora está disponível para uso clínico.",
            });
        },
        onError: (error: unknown) => {
            toast({
                title: "Erro ao publicar",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    if (error) {
        toast({
            title: "Erro ao carregar perfis",
            description: (error as Error).message,
            variant: "destructive",
        });
    }

    const handleCreateProfile = () => {
        if (!newProfile.id || !newProfile.name) {
            toast({
                title: "Campos obrigatórios",
                description: "ID e Nome são obrigatórios.",
                variant: "destructive",
            });
            return;
        }
        createProfileMutation.mutate(newProfile);
    };

    const handlePublish = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        publishProfileMutation.mutate(id);
    };

    const filteredProfiles = profiles.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PUBLISHED':
                return <Badge className="bg-green-100 text-green-800 border-green-200">Publicado</Badge>;
            case 'DRAFT':
                return <Badge variant="secondary">Rascunho</Badge>;
            case 'ARCHIVED':
                return <Badge variant="outline" className="text-muted-foreground">Arquivado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <MainLayout>
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Gestão de Metas</h1>
                        <p className="text-muted-foreground">
                            Gerencie templates de metas baseados em evidência para análise clínica.
                        </p>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Novo Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Criar Novo Template de Metas</DialogTitle>
                                <DialogDescription>
                                    Crie um novo template que poderá ser customizado com metas específicas.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="id">ID Único (ex: acl_rts)</Label>
                                    <Input
                                        id="id"
                                        value={newProfile.id}
                                        onChange={(e) => setNewProfile({ ...newProfile, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                        placeholder="identificador_unico"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nome do Template</Label>
                                    <Input
                                        id="name"
                                        value={newProfile.name}
                                        onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                                        placeholder="Ex: LCA / ACL — Prontidão"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descrição Curta</Label>
                                    <Input
                                        id="description"
                                        value={newProfile.description}
                                        onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                                        placeholder="Para que serve este template..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateProfile} disabled={createProfileMutation.isPending}>
                                    {createProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Criar Rascunho
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Templates Disponíveis</CardTitle>
                                <CardDescription>
                                    Lista de perfis de metas cadastrados no sistema.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <Filter className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="PUBLISHED">Publicados</SelectItem>
                                        <SelectItem value="DRAFT">Rascunhos</SelectItem>
                                        <SelectItem value="ARCHIVED">Arquivados</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nome ou ID..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Carregando templates...</p>
                            </div>
                        ) : filteredProfiles.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">Nenhum template encontrado.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Template</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Versão</TableHead>
                                            <TableHead>Última Atualização</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProfiles.map((p) => (
                                            <TableRow
                                                key={p.id}
                                                className="cursor-pointer"
                                                onClick={() => navigate(`/admin/goals/${p.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-blue-600 hover:underline">{p.name}</span>
                                                        <span className="text-xs text-muted-foreground uppercase">{p.id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">v{p.version}</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {format(new Date(p.updated_at), 'dd/MM/yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/admin/goals/${p.id}`);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {p.status === 'DRAFT' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-primary"
                                                                title="Publicar"
                                                                onClick={(e) => handlePublish(p.id, e)}
                                                                disabled={publishProfileMutation.isPending}
                                                            >
                                                                {publishProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
