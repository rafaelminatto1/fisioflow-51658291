import { KanbanBoard } from "@/components/tarefas/KanbanBoard";

interface ProjectKanbanProps {
    projectId: string;
}

export function ProjectKanban({ projectId }: ProjectKanbanProps) {
    // Pass filtered props to generic KanbanBoard if it supports it, 
    // or refactor KanbanBoard to accept projectId.
    // Ideally, KanbanBoard should handle the filtering props itself.

    return (
        <div className="h-full overflow-x-auto">
            <KanbanBoard projectId={projectId} />
        </div>
    );
}
