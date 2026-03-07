import { useState, useMemo, memo } from 'react';
import { useExerciseProtocols, type ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Search, ChevronRight, Calendar,
  AlertTriangle, Clock, Target, Milestone,
  Activity, ArrowRight, Trash2, Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { motion, AnimatePresence } from 'framer-motion';
import { NewProtocolModal } from '@/components/modals/NewProtocolModal';
import ProtocolDetailView from './ProtocolDetailView';
import { cn } from "@/lib/utils";

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
    const key = protocol.condition_name || 'Geral';
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

  const handleSubmit = (data: any) => {
    if (editingProtocol) {
      updateProtocol({ id: editingProtocol.id, ...data });
    } else {
      createProtocol(data);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-2">
      {/* Header Deck */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#13ecc8]/10 via-[#0f172a] to-[#0f172a] p-8 sm:p-10 border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              <Layers className="h-10 w-10 text-[#13ecc8]" />
              PROTOCOLOS
            </h2>
            <p className="text-white/50 text-lg max-w-lg leading-relaxed">
              Diretrizes inteligentes de reabilitação e progressão funcional baseadas em evidência.
            </p>
          </div>
          <Button 
            onClick={handleNewProtocol} 
            className="bg-[#13ecc8] hover:bg-[#11d8b7] text-black font-black h-14 px-8 rounded-2xl shadow-[0_0_30px_rgba(19,236,200,0.2)] hover:shadow-[0_0_40px_rgba(19,236,200,0.4)] transition-all group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
            NOVO PROTOCOLO
          </Button>
        </div>
        
        {/* Decorative backdrop elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#13ecc8]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl border-white/10">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros e Busca
            </h3>
            
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <Input
                  placeholder="Buscar protocolo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white/5 border-white/10 text-white pl-10 h-12 rounded-xl focus-visible:ring-[#13ecc8]"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white/50 text-xs font-bold uppercase ml-1">Categoria de Atuação</Label>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-2 bg-white/5 p-1 h-12 rounded-xl border border-white/5">
                    <TabsTrigger 
                      value="pos_operatorio" 
                      className="rounded-lg data-[state=active]:bg-[#13ecc8] data-[state=active]:text-black font-bold transition-all"
                    >
                      Pós-Op
                    </TabsTrigger>
                    <TabsTrigger 
                      value="patologia" 
                      className="rounded-lg data-[state=active]:bg-[#13ecc8] data-[state=active]:text-black font-bold transition-all"
                    >
                      Patologia
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs text-white/40 mb-4 px-1">
                  <span>Total de Protocolos</span>
                  <span className="text-[#13ecc8] font-bold">{protocols.length}</span>
                </div>
                <div className="p-4 rounded-xl bg-[#13ecc8]/5 border border-[#13ecc8]/10 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#13ecc8]" />
                  <p className="text-[10px] text-white/50 leading-tight">
                    Novos marcos podem ser adicionados em tempo real durante a sessão.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-3 space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card p-6 rounded-2xl border-white/10 h-48">
                  <Skeleton className="h-6 w-3/4 mb-4 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                  <div className="mt-8 flex gap-2">
                    <Skeleton className="h-10 grow bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedProtocols).length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 glass-card rounded-3xl border-white/5 border-dashed border-2"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Target className="h-10 w-10 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nenhum protocolo encontrado</h3>
              <p className="text-white/40 mb-8 max-w-sm text-center">
                Refine sua busca ou crie um novo protocolo clínico para começar.
              </p>
              <Button onClick={handleNewProtocol} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                <Plus className="w-4 h-4 mr-2" /> Criar Protocolo
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-12">
              <AnimatePresence mode="popLayout">
                {Object.entries(groupedProtocols).map(([condition, protocols], groupIdx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: groupIdx * 0.1 }}
                    key={condition} 
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-px grow bg-gradient-to-r from-transparent via-white/10 to-white/10" />
                      <h3 className="text-xl font-black text-white/80 tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#13ecc8]" />
                        {condition.toUpperCase()}
                      </h3>
                      <div className="h-px grow bg-gradient-to-l from-transparent via-white/10 to-white/10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {protocols.map((protocol) => (
                        <motion.div
                          key={protocol.id}
                          whileHover={{ y: -5 }}
                          className="group relative"
                        >
                          <div 
                            className="glass-card p-6 rounded-2xl border-white/10 hover:border-[#13ecc8]/40 transition-all cursor-pointer h-full flex flex-col justify-between overflow-hidden"
                            onClick={() => setViewProtocol(protocol)}
                          >
                            <div className="space-y-3 mb-6 relative z-10">
                              <div className="flex items-start justify-between">
                                <h4 className="text-xl font-bold text-white group-hover:text-[#13ecc8] transition-colors leading-tight">
                                  {protocol.name}
                                </h4>
                                <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-[#13ecc8] group-hover:translate-x-1 transition-all" />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] text-white/50 px-2 py-0">
                                  <Clock className="w-3 h-3 mr-1" /> {protocol.weeks_total} semanas
                                </Badge>
                                {Array.isArray(protocol.milestones) && protocol.milestones.length > 0 && (
                                  <Badge variant="outline" className="bg-[#13ecc8]/5 border-[#13ecc8]/20 text-[10px] text-[#13ecc8]/70 px-2 py-0">
                                    <Milestone className="w-3 h-3 mr-1" /> {protocol.milestones.length} marcos
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto relative z-10 pt-4 border-t border-white/5">
                              <p className="text-[10px] font-bold text-white/20 tracking-widest uppercase">
                                FISIOFLOW PROTOCOL
                              </p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditProtocol(protocol);
                                  }}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all"
                                >
                                  <Activity className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(protocol.id);
                                  }}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Hover accent decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#13ecc8]/5 rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 group-hover:bg-[#13ecc8]/10 transition-all pointer-events-none" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Protocol Details Full View */}
      <AnimatePresence>
        {viewProtocol && (
          <ProtocolDetailView 
            protocol={viewProtocol} 
            onClose={() => setViewProtocol(null)}
            onEdit={handleEditProtocol}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-white/10 rounded-3xl bg-[#0f172a] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-white">CONFIRMAR EXCLUSÃO</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 text-base">
              Você está prestes a remover permanentemente o protocolo de reabilitação. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl h-12 px-6">
              CANCELAR
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl h-12 px-8 flex items-center gap-2"
            >
              {isDeleting ? 'EXCLUINDO...' : 'CONFIRMAR EXCLUSÃO'}
              <Trash2 className="w-4 h-4" />
            </AlertDialogAction>
          </AlertDialogFooter>
          {/* Decorative glow */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500 opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        </AlertDialogContent>
      </AlertDialog>

      {/* Protocol Create/Edit Modal */}
      <NewProtocolModal
        open={showModal}
        onOpenChange={(open: boolean) => {
          setShowModal(open);
          if (!open) setEditingProtocol(null);
        }}
        onSubmit={handleSubmit}
        protocol={editingProtocol || undefined}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
});

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <label className={cn("block text-sm font-medium", className)}>{children}</label>
);
