import { useState } from 'react';
import { Plus, RefreshCw, Star, Layout, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { BoardCard } from '@/components/boards/BoardCard';
import { BoardsEmptyState } from '@/components/boards/BoardsEmptyState';
import { CreateBoardModal } from '@/components/boards/CreateBoardModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBoards, useCreateBoard, useUpdateBoard, useDeleteBoard } from '@/hooks/useBoards';

export default function BoardsHome() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { data: boards, isLoading, refetch } = useBoards();
  const createBoard = useCreateBoard();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();

  const allBoards = boards ?? [];
  const filtered = search
    ? allBoards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : allBoards;
  const starredBoards = filtered.filter(b => b.is_starred);

  const handleStar = (id: string, starred: boolean) => {
    updateBoard.mutate({ id, is_starred: starred });
  };

  const handleDelete = (id: string) => setDeletingId(id);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteBoard.mutate(deletingId, { onSuccess: () => setDeletingId(null) });
    }
  };

  const handleCreate = (data: { name: string; description?: string; background_color: string; icon: string }) => {
    createBoard.mutate(data, {
      onSuccess: () => setCreateOpen(false),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <LoadingSkeleton type="card" className="h-8 w-48" />
          <LoadingSkeleton type="card" className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} type="card" className="h-[100px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <Layout className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Boards</h1>
            <p className="text-sm text-muted-foreground">{allBoards.length} board{allBoards.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar boards..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-48 text-sm"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Board
          </Button>
        </div>
      </div>

      {allBoards.length === 0 ? (
        <BoardsEmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          {/* Starred boards */}
          {starredBoards.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                Favoritos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {starredBoards.map(board => (
                  <BoardCard key={board.id} board={board} onStar={handleStar} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {/* All boards */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {search ? `Resultados (${filtered.length})` : 'Todos os Boards'}
            </h2>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum board encontrado para "{search}".</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map(board => (
                  <BoardCard key={board.id} board={board} onStar={handleStar} onDelete={handleDelete} />
                ))}
                {!search && (
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="h-[100px] rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-xs font-medium">Novo Board</span>
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <CreateBoardModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isLoading={createBoard.isPending}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar board?</AlertDialogTitle>
            <AlertDialogDescription>
              O board será arquivado. As tarefas serão preservadas e podem ser recuperadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteBoard.isPending}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
