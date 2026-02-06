
// Lazy load dos componentes pesados para melhorar o desempenho inicial

import { lazy, Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

export const LazyKanbanColumnV2 = lazy(() => import('./KanbanColumnV2'));
// KanbanCardV2 removido do lazy load pois é necessário imediatamente em KanbanColumnV2
export const LazyTaskDetailModal = lazy(() => import('./TaskDetailModal'));
export const LazyTaskQuickCreateModal = lazy(() => import('./TaskQuickCreateModal'));

// Componente de fallback para lazy loading
export function LazyComponentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSkeleton type="card" className="w-full h-64" />}>
      {children}
    </Suspense>
  );
}

// Wrapper específico para colunas do Kanban
export function LazyKanbanColumnWrapper({ children, ...props }: unknown) {
  return (
    <Suspense fallback={<LoadingSkeleton type="card" className="w-[320px] h-[500px]" />}>
      <children.type {...children.props} {...props} />
    </Suspense>
  );
}

