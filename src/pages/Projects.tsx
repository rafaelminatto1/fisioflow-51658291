import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { FolderKanban, Plus, Search, Calendar, Folder, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    archived: 'bg-slate-500',
    on_hold: 'bg-amber-500'
};

const STATUS_LABELS = {
    active: 'Ativo',
    completed: 'Concluído',
    archived: 'Arquivado',
    on_hold: 'Em Espera'
};

export default function ProjectsPage() {
    const { data: projects, isLoading } = useProjects();
    const createProject = useCreateProject();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        status: 'active',
        start_date: '',
        end_date: ''
    });

    const filteredProjects = projects?.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await createProject.mutateAsync({
            ...newProject,
            start_date: newProject.start_date || undefined,
            end_date: newProject.end_date || undefined
        } as any);
        setIsDialogOpen(false);
        setNewProject({
            title: '',
            description: '',
            status: 'active',
            start_date: '',
            end_date: ''
        });
    };

    return (
        <MainLayout>
            <div className="flex flex-col h-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FolderKanban className="h-8 w-8 text-primary" />
                            Projetos
                        </h1>
                        <p className="text-muted-foreground">Gerencie seus projetos e acompanhe o progresso da equipe</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Projeto
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Criar Novo Projeto</DialogTitle>
                                <DialogDescription>
                                    Adicione um novo projeto para organizar tarefas e metas.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Título do Projeto</Label>
                                    <Input
                                        required
                                        value={newProject.title}
                                        onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                                        placeholder="Ex: Expansão da Clínica"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Textarea
                                        value={newProject.description}
                                        onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                        placeholder="Detalhes sobre o objetivo do projeto..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Início</Label>
                                        <Input
                                            type="date"
                                            value={newProject.start_date}
                                            onChange={e => setNewProject({ ...newProject, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Previsão de Término</Label>
                                        <Input
                                            type="date"
                                            value={newProject.end_date}
                                            onChange={e => setNewProject({ ...newProject, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={createProject.isPending}>
                                        {createProject.isPending ? 'Criando...' : 'Criar Projeto'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Search & Filters */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar projetos..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Projects Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="animate-pulse h-48 bg-muted" />
                        ))}
                    </div>
                ) : filteredProjects?.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                        <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
                        <p className="text-muted-foreground mb-4">Crie seu primeiro projeto para começar.</p>
                        <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                            Criar Projeto
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects?.map(project => (
                            <Link key={project.id} to={`/projects/${project.id}`}>
                                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className={`p-2 rounded-lg ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS] || 'bg-slate-500'} bg-opacity-20`}>
                                                <FolderKanban className={`h-5 w-5 ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS]?.replace('bg-', 'text-') || 'text-slate-500'}`} />
                                            </div>
                                            <Badge variant="secondary" className="capitalize">
                                                {STATUS_LABELS[project.status as keyof typeof STATUS_LABELS]}
                                            </Badge>
                                        </div>
                                        <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">
                                            {project.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                                            {project.description || 'Sem descrição'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <div className="flex items-center text-sm text-muted-foreground gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : 'Sem data'}
                                                {' - '}
                                                {project.end_date ? format(new Date(project.end_date), 'dd/MM/yyyy') : 'Em aberto'}
                                            </span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-3 border-t flex justify-between items-center text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            {project.manager?.avatar_url ? (
                                                <img src={project.manager.avatar_url} alt={project.manager.full_name} className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                                    {project.manager?.full_name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            <span>{project.manager?.full_name || 'Sem gestor'}</span>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
