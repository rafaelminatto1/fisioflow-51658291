
import { useState, useMemo, memo, useEffect } from 'react';
import { useExerciseProtocols, type ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Edit, Trash2, Search, ChevronRight, Calendar,
  AlertTriangle, CheckCircle2, Clock, Target, Milestone
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { NewProtocolModal } from '@/components/modals/NewProtocolModal';

export const ProtocolsManager = memo(function ProtocolsManager() {
  const [activeTab, setActiveTab] = useState<'patologia' | 'pos_operatorio'>('pos_operatorio');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [viewProtocol, setViewProtocol] = useState<ExerciseProtocol | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ExerciseProtocol | null>(null);

  const { protocols, loading, createProtocol, updateProtocol, deleteProtocol, isCreating, isUpdating, isDeleting } = useExerciseProtocols();

  const filteredProtocols = useMemo(() => protocols.filter(p =>
    (p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.condition_name?.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
    p.protocol_type === activeTab
  ), [protocols, debouncedSearch, activeTab]);

  // Agrupar por condição
  const groupedProtocols = useMemo(() => filteredProtocols.reduce((acc, protocol) => {
    const key = protocol.condition_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(protocol);
    return acc;
  }, {} as Record<string, ExerciseProtocol[]>), [filteredProtocols]);

  const handleDelete = () => {
    if (deleteId) {
      deleteProtocol(deleteId);
      setDeleteId(null);
    }
  };

  const handleNewProtocol = () => {
    setEditingProtocol(null);
    setShowModal(true);
  };

  const handleEditProtocol = (protocol: ExerciseProtocol) => {
    setEditingProtocol(protocol);
    setViewProtocol(null);
    setShowModal(true);
  };

  const handleSubmit = (data: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingProtocol) {
      updateProtocol({ id: editingProtocol.id, ...data });
    } else {
      createProtocol(data);
    }
    setShowModal(false);
    setEditingProtocol(null);
  };

  const getMilestones = (protocol: ExerciseProtocol) => {
    if (!protocol.milestones) return [];
    if (Array.isArray(protocol.milestones)) return protocol.milestones;
    return [];
  };

  const getRestrictions = (protocol: ExerciseProtocol) => {
    if (!protocol.restrictions) return [];
    if (Array.isArray(protocol.restrictions)) return protocol.restrictions;
    return [];
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Protocolos de Progressão</h2>
            <p className="text-muted-foreground">
              Gerencie protocolos com marcos e restrições temporais
            </p>
          </div>
          <Button onClick={handleNewProtocol}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Protocolo
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'patologia' | 'pos_operatorio')}>
          <TabsList className="mb-4">
            <TabsTrigger value="pos_operatorio">
              <Calendar className="h-4 w-4 mr-2" />
              Pós-Operatórios
            </TabsTrigger>
            <TabsTrigger value="patologia">
              <Target className="h-4 w-4 mr-2" />
              Patologias
            </TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar protocolos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Skeleton className="h-32" />
                      <Skeleton className="h-32" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : Object.keys(groupedProtocols).length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum protocolo encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {search ? 'Tente outra busca' : 'Crie seu primeiro protocolo de progressão'}
                </p>
                <Button onClick={handleNewProtocol}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Protocolo
                </Button>
              </div>
            ) : (
              Object.entries(groupedProtocols).map(([condition, protocols]) => (
                <Card key={condition} className="p-4 bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {condition}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {protocols.map((protocol) => (
                      <Card
                        key={protocol.id}
                        className="p-4 hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group"
                        onClick={() => setViewProtocol(protocol)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium group-hover:text-primary transition-colors">
                              {protocol?.name ?? 'Sem nome'}
                            </h4>
                            {protocol.weeks_total && (
                              <Badge variant="secondary" className="mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {protocol.weeks_total} semanas
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                          {getMilestones(protocol).length > 0 && (
                            <div className="flex items-center gap-2">
                              <Milestone className="h-4 w-4 text-green-500" />
                              <span>{getMilestones(protocol).length} marcos</span>
                            </div>
                          )}
                          {getRestrictions(protocol).length > 0 && (
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span>{getRestrictions(protocol).length} restrições</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewProtocol(protocol);
                            }}
                          >
                            Ver detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(protocol.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Protocol Details Modal */}
      <Dialog open={!!viewProtocol} onOpenChange={(open) => !open && setViewProtocol(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewProtocol?.name}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{viewProtocol?.condition_name}</Badge>
              {viewProtocol?.weeks_total && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {viewProtocol.weeks_total} semanas
                </Badge>
              )}
            </div>
          </DialogHeader>

          {viewProtocol && (
            <div className="space-y-6 mt-4">
              {/* Timeline Visual */}
              {viewProtocol.weeks_total && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Linha do Tempo
                  </h4>
                  <div className="relative">
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-green-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>Semana 1</span>
                      <span>Semana {Math.round(viewProtocol.weeks_total / 2)}</span>
                      <span>Semana {viewProtocol.weeks_total}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones */}
              <Accordion type="single" collapsible defaultValue="milestones">
                <AccordionItem value="milestones">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span>Marcos de Progressão ({getMilestones(viewProtocol).length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {getMilestones(viewProtocol).length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nenhum marco definido</p>
                      ) : (
                        getMilestones(viewProtocol).map((milestone: { week: number; description: string }, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                              {milestone.week}
                            </div>
                            <div>
                              <p className="font-medium text-sm">Semana {milestone.week}</p>
                              <p className="text-muted-foreground text-sm">{milestone.description}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="restrictions">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span>Restrições ({getRestrictions(viewProtocol).length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {getRestrictions(viewProtocol).length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nenhuma restrição definida</p>
                      ) : (
                        getRestrictions(viewProtocol).map((restriction: { week_start: number; week_end?: number; description: string }, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">
                                Semana {restriction.week_start}
                                {restriction.week_end ? (' - ' + restriction.week_end + ' ') : null}
                              </p>
                              <p className="text-muted-foreground text-sm">{restriction.description}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => handleEditProtocol(viewProtocol)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Protocolo
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setDeleteId(viewProtocol.id);
                    setViewProtocol(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Protocol Create/Edit Modal */}
      <NewProtocolModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingProtocol(null);
        }}
        onSubmit={handleSubmit}
        protocol={editingProtocol || undefined}
        isLoading={isCreating || isUpdating}
      />
    </>
  );
});
