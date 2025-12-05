import { LayoutGrid } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { KanbanBoard } from '@/components/tarefas/KanbanBoard';

export default function Tarefas() {
  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tarefas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie tarefas da equipe em um quadro Kanban
              </p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0">
          <KanbanBoard />
        </div>
      </div>
    </MainLayout>
  );
}
