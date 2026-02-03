import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BookOpen, Copy, Edit, Trash2 } from 'lucide-react';
import { useConductLibrary, useDeleteConduct, type ConductTemplate } from '@/hooks/useConductLibrary';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddConductModal } from './AddConductModal';

interface ConductLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConduct?: (conduct: string) => void;
}

export function ConductLibraryModal({
  open,
  onOpenChange,
  onSelectConduct,
}: ConductLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conductToDelete, setConductToDelete] = useState<string | null>(null);
  const [conductToEdit, setConductToEdit] = useState<ConductTemplate | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: conducts = [] } = useConductLibrary();
  const deleteMutation = useDeleteConduct();

  const categories = [
    'Mobilização Articular',
    'Fortalecimento',
    'Alongamento',
    'Liberação Miofascial',
    'Técnicas Manuais',
    'Eletroterapia',
    'Terapia Postural',
    'Treino Funcional',
    'Exercícios Respiratórios',
    'Outros',
  ];

  const filteredConducts = useMemo(() => {
    return conducts.filter((conduct) => {
      const matchesSearch =
        conduct.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conduct.conduct_text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || conduct.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [conducts, searchQuery, selectedCategory]);

  const handleCopyConduct = (conduct: ConductTemplate) => {
    if (onSelectConduct) {
      onSelectConduct(conduct.conduct_text);
      onOpenChange(false);
    }
  };

  const handleDeleteConduct = () => {
    if (conductToDelete) {
      deleteMutation.mutate(conductToDelete);
      setConductToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Biblioteca de Condutas
              </DialogTitle>
              <Button onClick={() => setShowAddModal(true)} size="sm">
                Nova Conduta
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar condutas..."
                aria-label="Buscar condutas na biblioteca"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categorias */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">Todas</TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {filteredConducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                      <p>Nenhuma conduta encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredConducts.map((conduct) => (
                        <div
                          key={conduct.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="space-y-1 flex-1">
                              <h3 className="font-semibold">{conduct.title}</h3>
                              {conduct.description && (
                                <p className="text-sm text-muted-foreground">
                                  {conduct.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{conduct.category}</Badge>
                          </div>

                          <div className="bg-muted/50 rounded-md p-3 mb-3">
                            <p className="text-sm whitespace-pre-wrap">
                              {conduct.conduct_text}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyConduct(conduct)}
                              className="flex-1"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Usar Conduta
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setConductToEdit(conduct);
                                setShowAddModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConductToDelete(conduct.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar/Editar */}
      <AddConductModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setConductToEdit(null);
        }}
        conduct={conductToEdit}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!conductToDelete} onOpenChange={() => setConductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conduta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conduta será removida permanentemente da
              biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConduct}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
