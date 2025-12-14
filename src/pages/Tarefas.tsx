import { LayoutGrid } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { KanbanBoard } from '@/components/tarefas/KanbanBoard';

export default function Tarefas() {
  return (
    <MainLayout>
      <div className="flex flex-col h-full pb-20 md:pb-0">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Tarefas</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gerencie tarefas da equipe
              </p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0 -mx-4 sm:mx-0 overflow-x-auto">
          <KanbanBoard />
        </div>
      </div>
    </MainLayout>
  );
}
