import { useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { NewExerciseModal } from '@/components/modals/NewExerciseModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Exercise } from '@/hooks/useExercises';

export function ExercisesManager() {
  const { exercises, loading, deleteExercise } = useExercises();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredExercises = exercises.filter(e => 
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteExercise(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Exercício
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'Nenhum exercício encontrado' : 'Nenhum exercício cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Séries</TableHead>
                  <TableHead>Repetições</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>{exercise.category || '-'}</TableCell>
                    <TableCell>
                      {exercise.difficulty && (
                        <Badge variant="outline">{exercise.difficulty}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{exercise.sets || '-'}</TableCell>
                    <TableCell>{exercise.repetitions || '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditExercise(exercise)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(exercise.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <NewExerciseModal
        open={showNewModal || !!editExercise}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewModal(false);
            setEditExercise(null);
          }
        }}
        onSubmit={(data) => {
          if (editExercise) {
            // Update logic would go here
            console.log('Update exercise', data);
          } else {
            // Create logic would go here
            console.log('Create exercise', data);
          }
        }}
        exercise={editExercise || undefined}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
