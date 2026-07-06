import React, { useState } from "react";
import { Search, BookA, Languages, Plus, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useDictionary, DictionaryTerm } from "@/hooks/useDictionary";
import { DictionaryTermModal } from "./DictionaryTermModal";
import { ProtocolDetailView } from "./ProtocolDetailView";
import { protocolDictionary, ProtocolEntry } from "@/data/protocolDictionary";

import { ExerciseViewModal } from "@/components/exercises/ExerciseViewModal";
import { useExercises } from "@/hooks/useExercises";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "muscle", label: "Músculos" },
  { id: "joint", label: "Articulações" },
  { id: "ligament", label: "Ligamentos" },
  { id: "condition", label: "Patologias" },
  { id: "exercise", label: "Exercícios" },
  { id: "test", label: "Testes Clínicos" },
  { id: "movement", label: "Movimentos" },
  { id: "questionnaire", label: "Questionários" },
  { id: "procedure", label: "Protocolos" },
  { id: "medicament", label: "Medicamentos" },
];

export function PhysioDictionaryView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTerm, setEditTerm] = useState<DictionaryTerm | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolEntry | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { exercises } = useExercises();
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  const { terms, isLoading, createTerm, updateTerm, deleteTerm, isCreating, isUpdating } =
    useDictionary(searchQuery, activeCategory);

  const handleAdd = () => {
    setEditTerm(undefined);
    setShowModal(true);
  };

  const handleEdit = (term: DictionaryTerm) => {
    setEditTerm(term);
    setShowModal(true);
  };

  const handleSubmit = (data: any) => {
    if (editTerm) {
      updateTerm({ id: editTerm.id, ...data });
    } else {
      createTerm(data);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTerm(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted dark:bg-slate-900/50">
      <div className="border-b bg-background px-6 py-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-3 text-slate-900">
              <div className="p-2.5 bg-orange-100 rounded-2xl shadow-sm">
                <Languages className="h-7 w-7 text-orange-600" />
              </div>
              Dicionário Bilíngue
            </h1>
            <p className="text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
              Consulte termos técnicos em português ou inglês e encontre traduções, 
              sinônimos e referências cruzadas aplicadas em toda a plataforma FisioFlow.
            </p>
          </div>
          <Button 
            onClick={handleAdd} 
            premium
            glow
            className="gap-2 h-11 px-6 rounded-2xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/10"
          >
            <Plus className="h-5 w-5" />
            Novo Termo
          </Button>
        </div>

        <div className="relative max-w-3xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Buscar termo em PT ou EN (ex: LCA, Squat, Isquiotibiais)..."
            className="pl-12 h-14 text-base rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                activeCategory === cat.id 
                  ? "bg-orange-600 text-white border-transparent shadow-md shadow-orange-500/20" 
                  : "bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300"
              )}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-50 dark:border-slate-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
            {terms.map((term) => (
              <Card
                key={term.id}
                className="group relative border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 overflow-hidden cursor-pointer"
                onClick={() => {
                  if (term.category === "procedure" || term.subcategory === "Protocolo") {
                    const proto = protocolDictionary.find((p) => p.id === term.id);
                    if (proto) setSelectedProtocol(proto);
                  } else if (term.category === "exercise") {
                    setSelectedExerciseId(term.id);
                  }
                }}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500/10 group-hover:bg-orange-500 transition-colors" />
                <CardHeader className="p-5 pb-2 relative">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold font-display text-slate-900 pr-12 group-hover:text-orange-700 transition-colors">
                      {term.pt}
                    </CardTitle>
                    <div className="flex items-center gap-1 transition-opacity duration-200 group-hover:opacity-0">
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-white text-slate-400 border-slate-100 rounded-md"
                      >
                        {CATEGORIES.find((c) => c.id === term.category)?.label || term.category}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5" />
                    {term.en}
                  </CardDescription>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 bg-white p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg z-10 translate-y-1 group-hover:translate-y-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(term);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(term.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-sm">
                  {term.aliasesPt && term.aliasesPt.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                        Sinônimos (PT)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {term.aliasesPt.map((alias, idx) => (
                          <span
                            key={idx}
                            className="bg-white border border-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md text-[9px] uppercase tracking-tight shadow-sm"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {term.aliasesEn && term.aliasesEn.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                        Synonyms (EN)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {term.aliasesEn.map((alias, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50/50 border border-blue-100/50 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[9px] uppercase tracking-tight shadow-sm"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {term.subcategory && (
                    <div className="pt-3 border-t border-slate-100 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <BookA className="h-3.5 w-3.5" />
                        {term.subcategory}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!isLoading && terms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
            <div className="h-24 w-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-slate-200/50 dark:bg-slate-800/50 animate-ping" />
              <BookA className="h-10 w-10 text-slate-400 dark:text-slate-600 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              Dicionário Vazio
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-3 font-medium">
              Não encontramos termos para sua busca. Deseja cadastrar uma nova terminologia clínica?
            </p>
            <Button
              variant="default"
              className="mt-8 rounded-xl font-bold shadow-lg shadow-blue-500/20 px-8"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar Termo
            </Button>
          </div>
        )}
      </ScrollArea>

      <DictionaryTermModal
        open={showModal}
        onOpenChange={setShowModal}
        onSubmit={handleSubmit}
        term={editTerm}
        isLoading={isCreating || isUpdating}
      />

      {/* Modal de Detalhes do Exercício */}
      {selectedExercise && (
        <ExerciseViewModal
          exercise={selectedExercise}
          isOpen={!!selectedExerciseId}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}

      {/* Modal de Detalhes do Protocolo */}
      <Dialog open={!!selectedProtocol} onOpenChange={(open) => !open && setSelectedProtocol(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProtocol && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{selectedProtocol.pt}</DialogTitle>
              </DialogHeader>
              <ProtocolDetailView
                protocol={selectedProtocol}
                onSelectExercise={(id) => {
                  setSelectedProtocol(null);
                  setSelectedExerciseId(id);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este termo do dicionário? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
