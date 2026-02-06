import { LayoutGrid, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { KanbanBoardV2 } from '@/components/tarefas/v2';
import { Button } from '@/components/ui/button';

export default function Tarefas() {
  return (
    <MainLayout>
      <div className="flex flex-col h-full pb-20 md:pb-0">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Tarefas</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Gerencie tarefas da equipe no estilo Kanban
                </p>
              </div>
            </div>
            <Link to="/tarefas-v2">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Tarefas V2
              </Button>
            </Link>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0 -mx-4 sm:mx-0 overflow-x-auto">
          <KanbanBoardV2 />
        </div>
      </div>
    </MainLayout>
  );
}
