import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { useProject } from '@/hooks/useProjects';
import { Button } from '@/components/shared/ui/button';
import { KanbanSquare, ListTodo, CalendarRange, Settings } from 'lucide-react';
import { ProjectKanban } from '@/components/projects/ProjectKanban';
import { ProjectTimeline } from '@/components/projects/ProjectTimeline';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { Badge } from '@/components/shared/ui/badge';

export default function ProjectDetailsPage() {
    const { id } = useParams<{ id: string }>();
    // @ts-expect-error - Supabase types issue workaround
    const { data: project, isLoading } = useProject(id!);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </MainLayout>
        );
    }

    if (!project) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-muted-foreground">Projeto não encontrado.</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex flex-col h-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold">{project.title}</h1>
                            <Badge variant="outline" className="capitalize">{project.status}</Badge>
                        </div>
                        <p className="text-muted-foreground">{project.description}</p>
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0">
                        <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configurações
                        </Button>
                    </div>
                </div>

                {/* Project Views */}
                <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                        <TabsTrigger
                            value="kanban"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
                        >
                            <KanbanSquare className="h-4 w-4 mr-2" />
                            Quadro
                        </TabsTrigger>
                        <TabsTrigger
                            value="timeline"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
                        >
                            <CalendarRange className="h-4 w-4 mr-2" />
                            Cronograma (Gantt)
                        </TabsTrigger>
                        <TabsTrigger
                            value="list"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
                        >
                            <ListTodo className="h-4 w-4 mr-2" />
                            Lista
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-6 min-h-0 overflow-hidden">
                        <TabsContent value="kanban" className="h-full m-0">
                            <ProjectKanban projectId={id!} />
                        </TabsContent>
                        <TabsContent value="timeline" className="h-full m-0 overflow-auto">
                            <ProjectTimeline projectId={id!} />
                        </TabsContent>
                        <TabsContent value="list" className="h-full m-0">
                            <ProjectTableView projectId={id!} />
                        </TabsContent>
                    </div>
                </Tabs>

                <ProjectModal
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    project={project}
                />
            </div>
        </MainLayout>
    );
}
