import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { useProjects, useDeleteProject, Project } from '@/hooks/useProjects';
import { FolderKanban, Plus, Search, Calendar, Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
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
    const deleteProject = useDeleteProject();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    const filteredProjects = projects?.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setProjectToDelete(project);
    };

    const handleDeleteConfirm = async () => {
        if (projectToDelete) {
            await deleteProject.mutateAsync(projectToDelete.id);
            setProjectToDelete(null);
        }
    };

    const handleCreate = () => {
        setSelectedProject(null);
        setIsModalOpen(true);
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
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Projeto
                    </Button>
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
                        <Button variant="outline" onClick={handleCreate}>
                            Criar Projeto
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects?.map(project => (
                            <Link key={project.id} to={`/projects/${project.id}`}>
                                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group relative">
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => handleEdit(e, project)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => handleDeleteClick(e, project)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className={`p-2 rounded-lg ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS] || 'bg-slate-500'} bg-opacity-20`}>
                                                <FolderKanban className={`h-5 w-5 ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS]?.replace('bg-', 'text-') || 'text-slate-500'}`} />
                                            </div>
                                            <Badge variant="secondary" className="capitalize">
                                                {STATUS_LABELS[project.status as keyof typeof STATUS_LABELS]}
                                            </Badge>
                                        </div>
                                        <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors pr-6">
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
                                                <OptimizedImage src={project.manager.avatar_url} alt={project.manager.full_name || ''} className="w-6 h-6 rounded-full" aspectRatio="1:1" />
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

                <ProjectModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    project={selectedProject}
                />

                <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Projeto?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir o projeto "{projectToDelete?.title}"?
                                Todas as tarefas associadas serão mantidas, mas perderão a associação com o projeto.
                                Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                                Excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
}
